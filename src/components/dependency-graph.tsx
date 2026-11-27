/**
 * The graph lens of the FileMap canvas: the same network the map lens draws, laid out in six lanes.
 *
 * WHY THIS FILE EXISTS. AAP 0.5.2 places `DependencyGraph` in this folder with "topology typed prop,
 * selection callbacks" and the note that the graph "is hand-laid in six lanes", and AAP 0.12.4 fixes
 * the lens itself: "six lanes, dimming, upstream and downstream path, scenario preview switch". The
 * payload is the one `getTopology` returns, so the two lenses of the canvas describe one network and
 * a reader who finds a node in either finds it in both.
 *
 * THE LAYOUT IS HAND-LAID AND DETERMINISTIC. Every lane has a fixed column and every node a fixed
 * slot in that column, computed from its index within its family as the service ordered it. There is
 * no force simulation, no physics pass, no random jitter and no measurement of the rendered box, so
 * the same topology draws the same picture on every render and in every environment — which is what
 * lets a browser test and a component test assert the same layout, and what keeps the graph free of
 * force-simulation machinery the canvas does not need.
 *
 * THE SIX LANES ARE THE STAGES OF THE NETWORK, NOT THE NODE TYPES. The record shapes of
 * `src/types/topology.ts` carry four node families — plants, suppliers, tier-2 origins and customers
 * — while the lens the specification fixes draws the supply chain's stages: tier-2 origins,
 * suppliers, materials, plants, lines and customers. A lane is therefore a fixed column with a label,
 * and a node is placed in the lane its family names: origins, suppliers, plants and customers. The
 * two stages the topology payload does not carry — materials and lines, whose records belong to the
 * stages that open them — keep their column, their label and their guide, and state that they hold
 * no nodes in this view rather than being filled with anything invented (rule P-6). No fifth node
 * kind is invented to populate them.
 *
 * SELECTION IS SHARED WITH THE MAP LENS, AND NEITHER LENS OWNS IT. `selectedNodeId` and
 * `onSelectNode` are the same prop pair `./map-canvas.tsx` takes, and the canvas screen holds the
 * value: selecting a node in one lens highlights the same node in the other, because both read one
 * id the screen owns. This component never keeps the selection in its own state, never derives a
 * second one and never reports anything but the id the reader activated.
 *
 * THE TABLE VIEW BELONGS TO `ChartFrame`. This module is a pure surface: it draws the nodes, the
 * lanes and the pin summaries and carries no toggle of its own, because a chart, a map or a graph
 * may only reach a screen composed inside `./chart-frame.tsx`, which owns the "View as table" switch
 * and the rows that switch renders (success criterion 9, rule B-3). A table view here would be a
 * second one with its own ordering rules.
 *
 * THE EVIDENCE THE DRAWER OPENS, AND WHY ITS REFERENCE COMES FROM THE CALLER. Activating a node
 * reports the selection and opens {@link EvidenceDrawer} beside the drawing, mounted as a sibling of
 * the `svg` rather than inside it, because a dialog cannot live in an SVG fragment. The reference
 * the drawer resolves is a record reference, and the topology payload carries the pin *counts* of a
 * node rather than the references of its pins; the evidence read resolves record families only, so a
 * node identifier is not one of them, and spelling a pin identifier here would fabricate a domain
 * identifier (rule P-6). `evidenceRefForNode` is therefore how a caller that holds a node's evidence
 * supplies the reference; with none supplied the activation reports the selection and no dialog
 * opens, so the lens can never put a refusal in front of a reader in place of a record.
 *
 * WHAT IT DOES NOT DO. It reads no data (rule P-2): the topology arrives as a prop, the drawer does
 * its own read, and nothing here calls the service. It computes no business figure (rule P-6): the
 * pin counts are the payload's, every coordinate is the fixed layout's, and the only arithmetic is
 * summing a node's own counts for its summary. It types no simulation label of its own (rule P-1):
 * the dock and the ribbon carry the labels for the figures they show, and a node's pin summary is
 * record content rather than a computed figure. It carries no competitor concept (rule P-5), states
 * nothing about where a record is held or whether it could be altered (rule P-4), fetches nothing
 * (rule B-1) and reads no configuration (rule B-2).
 *
 * KEYBOARD AND POINTER — rule B-3. Every node is a focus stop with the role of a button, an
 * accessible name that carries its label, its family and its whole pin summary, and the two-pixel
 * focus ring of the `--color-focus-ring` role; `Enter` and `Space` activate it exactly as a click
 * does. Dimming and path emphasis never rest on colour alone: a dimmed node also draws a thinner
 * boundary and a lighter label, an emphasised node draws a heavier boundary, and the emphasised path
 * between two such nodes draws a heavier lane. The one transition in the file is a colour change
 * carried by `motion-safe:`, so a reduced-motion session gets the state change without the
 * animation, and no mark animates at all.
 */
import { useId, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';

import type { PinCounts, PinState, Topology, TopologyNode, TopologyNodeKind } from '../types';

import { EvidenceDrawer } from './evidence-drawer';
import { PENDING_CLOCK_ICON, StatusIndicator, meaningOf } from './status-indicator';
import { ActionButton, CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES, Tooltip } from './tooltip';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this module states, held here so the wording has one owner: the component below
 * renders these strings and its suite names them through this object instead of retyping them.
 *
 * Only one of them is a fixed specification string: the stage tooltip `Arrives in stage S4`, which
 * AAP 0.12.4 and rule P-8 require character for character on the disabled "Open part" control, and
 * which is not re-cased or paraphrased here. The rest are this component's own labels — a lane's
 * heading, the switch's caption, the empty-lane note — and none of them claims a security property
 * for the workspace (rule P-4). Nothing below carries a figure, an amount, a date or a record
 * identifier (rule P-6): a node's label, its pin counts and its families all arrive from the payload.
 */
export const DEPENDENCY_GRAPH_TEXT = {
  /** The accessible caption of the scenario preview switch, completed by the scenario it would preview. */
  previewLabel: 'Preview scenario',

  /**
   * Why the preview switch cannot be turned on. Stated when the screen has supplied no scenario for
   * this lens, so the disabled control explains itself instead of resting inert (rule P-8).
   */
  previewUnavailable: 'No scenario is available to preview on this graph yet.',

  /** Shown inside a lane the payload carries no nodes for, so an empty column is not read as a fault. */
  emptyLane: 'No nodes in this view.',

  /** The caption of the strip that names the selected node. */
  selectedLabel: 'Selected',

  /** The label of the control that would open a part from the selected node, opened in stage S4. */
  openPartLabel: 'Open part',

  /**
   * The exact stage tooltip of AAP 0.12.4 and rule P-8, on the one control this lens disables. The
   * specification fixes this string, so it is neither re-cased nor paraphrased.
   */
  stageFourReason: 'Arrives in stage S4',

  /** The noun a node's pin summary counts, so the summary reads as a sentence fragment. */
  pinNoun: 'evidence pins',

  /** The same noun for a node that carries exactly one pin. */
  pinNounSingular: 'evidence pin',

  /** The whole of a node's pin summary when the payload states no pins for it. */
  noPins: 'no evidence pins',

  /** The word between the count of a node's pins and its breakdown. */
  pinBreakdownSeparator: ':',

  /**
   * The caption of the key that explains the state words a node's summary prints, so the drawing's
   * vocabulary is readable without leaving the lens.
   */
  pinKeyLabel: 'Pin states in this view',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The lanes — AAP 0.12.4, six fixed stages of the network
 * ------------------------------------------------------------------------------------------- */

/**
 * One lane of the graph: the column a family of nodes occupies, or a stage the payload does not
 * carry.
 *
 * `kind` is the node family the lane draws, or `null` for a stage that holds no node family in
 * `src/types/topology.ts`. A `null` lane is a real stage of the network with nothing to place in it
 * yet, which the component states rather than hides: dropping the column would let the lens drift
 * from the specification's six lanes, and filling it would mean inventing nodes the records do not
 * hold (rule P-6).
 */
export interface DependencyGraphLane {
  /** The lane's identifier, unique within the graph and used to key its marks. */
  readonly id: string;

  /** The lane's heading, printed above its column. */
  readonly label: string;

  /** The node family the lane draws, or `null` for a stage the topology payload does not carry. */
  readonly kind: TopologyNodeKind | null;
}

/**
 * The six lanes of the graph lens, in the order the network runs: upstream on the start side,
 * downstream on the end side.
 *
 * The order is the pipeline's, not the alphabet's, because the lanes are read as a chain: an origin
 * feeds a supplier, a supplier's material reaches a plant, a plant serves a customer. Materials sit
 * between suppliers and plants and lines between plants and customers, which is where those records
 * belong in the network even though this payload does not carry them as nodes. The array is the one
 * owner of the lane order, the lane headings and the lane count, so the drawing, its suite and the
 * empty-lane note cannot disagree about how many lanes there are.
 */
export const DEPENDENCY_GRAPH_LANES = [
  { id: 'origins', label: 'Tier-2 origins', kind: 'origin' },
  { id: 'suppliers', label: 'Suppliers', kind: 'supplier' },
  { id: 'materials', label: 'Materials', kind: null },
  { id: 'plants', label: 'Plants', kind: 'plant' },
  { id: 'lines', label: 'Lines', kind: null },
  { id: 'customers', label: 'Customers', kind: 'customer' },
] as const satisfies readonly DependencyGraphLane[];

/* ---------------------------------------------------------------------------------------------
 * The vocabulary the payload supplies — `src/types/topology.ts`
 * ------------------------------------------------------------------------------------------- */

/**
 * The word a node's family is announced by, in the accessible name and nowhere else.
 *
 * A family is meaning rather than decoration, so it is spoken: a reader who hears "Riedberg, plant
 * node" knows what kind of place the mark is without seeing the column it sits in. `Tier-2 origin`
 * rather than `origin` because the tier is what distinguishes it from the supplier beside it.
 */
const FAMILY_WORDS = {
  plant: 'Plant',
  supplier: 'Supplier',
  origin: 'Tier-2 origin',
  customer: 'Customer',
} as const satisfies Record<TopologyNodeKind, string>;

/**
 * The six pin states in the order a summary prints them: the states that need attention first.
 *
 * The order is presentation only. `PinCounts` is keyed by the six `PinState` members of contracts
 * 4.2, which are fixed by the type; this list decides which of them a reader sees first and never
 * which of them exist, and it is exhaustive by type so a seventh state fails to compile here rather
 * than disappearing from a summary.
 */
const PIN_STATE_ORDER = [
  'fail',
  'stale',
  'pending',
  'review',
  'pass',
  'empty',
] as const satisfies readonly PinState[];

/** The word each pin state is counted with in a summary. */
const PIN_STATE_WORDS = {
  empty: 'empty',
  pending: 'pending',
  pass: 'pass',
  fail: 'fail',
  stale: 'stale',
  review: 'review',
} as const satisfies Record<PinState, string>;

/* ---------------------------------------------------------------------------------------------
 * The fixed geometry — one hand-laid grid, in view-box units
 * ------------------------------------------------------------------------------------------- */

/** The width of one node's box, in view-box units. Wide enough for a record's own label at 13 px. */
const NODE_WIDTH = 132;

/** The height of one node's box: a label row and, when the node has pins, its summary row. */
const NODE_HEIGHT = 40;

/** The vertical gap between two nodes of one lane. */
const NODE_ROW_GAP = 12;

/** The horizontal gap between two lanes. */
const LANE_GAP = 20;

/** The band above the first row of nodes, where the lane headings sit. */
const LANE_HEADING_HEIGHT = 28;

/**
 * The baseline of the note an unoccupied lane carries, and the top of that lane's guide.
 *
 * Both sit in the band between the headings and the first row of nodes, for one reason: every
 * connector lane runs at a row's mid-height, so a note placed at a row's centre would have a lane
 * drawn through its middle. Above the first row nothing is drawn across the text, and the guide
 * starts below it, so the sentence reads clean in either theme.
 */
const EMPTY_LANE_NOTE_BASELINE = LANE_HEADING_HEIGHT + 10;

/** Where an unoccupied lane's guide starts, below its note rather than through it. */
const EMPTY_LANE_TRUNK_TOP = LANE_HEADING_HEIGHT + 22;

/** The clearance under the last row of nodes. */
const GRAPH_BOTTOM_PADDING = 12;

/** The inset of a node's text from its own boundary. */
const NODE_TEXT_INSET = 8;

/**
 * The clearance between the outermost column and the view box's edge.
 *
 * It exists for the outline: a focused node paints a two-pixel ring outside its own boundary, and a
 * column flush with the view box would have that side of its ring cut off by the viewport. The same
 * clearance keeps the border of a node in the last column from being halved by the edge.
 */
const GRAPH_PADDING = 8;

/** The corner radius of a node's box. It mirrors the `--radius-control` role the tokens fix. */
const NODE_CORNER_RADIUS = 2;

/** The half-width of the arrowhead that marks a lane's direction. */
const ARROW_HALF_HEIGHT = 4;

/** The length of that arrowhead along the lane. */
const ARROW_LENGTH = 6;

/** The shortest horizontal spread of a lane's bend, so two nodes in one column still curve. */
const EDGE_MIN_BEND = 16;

/**
 * The character budget of a node's visible pin summary, and of its visible label.
 *
 * A node's box is 132 units wide at a 12 px type size, so text longer than this would run past its
 * boundary: it is cut with an ellipsis, and the whole of it stays in the node's accessible name and
 * in the frame's table view. Nothing is cut from the accessible name, and a label is a record's own
 * text rather than a figure (rule P-6), so what is cut here is presentation only.
 */
const SUMMARY_CHARACTER_BUDGET = 20;

/** The character budget of a node's visible label, one step tighter than its summary's. */
const LABEL_CHARACTER_BUDGET = 18;

/* ---------------------------------------------------------------------------------------------
 * Geometry — pure functions of the payload and the grid above
 * ------------------------------------------------------------------------------------------- */

/** A node's place on the drawing: the column its lane fixes and the row its index fixes. */
interface NodePlacement {
  /** The node the placement belongs to. */
  readonly node: TopologyNode;

  /** The left edge of the node's box, in view-box units. */
  readonly x: number;

  /** The top edge of the node's box, in view-box units. */
  readonly y: number;
}

/**
 * The nodes of one family, in the order the payload holds them.
 *
 * The `switch` is exhaustive over `TopologyNodeKind` and carries no `default` arm, so a family added
 * to that union fails to compile here instead of rendering a column that silently lost its nodes.
 */
function nodesOfFamily(topology: Topology, kind: TopologyNodeKind): readonly TopologyNode[] {
  switch (kind) {
    case 'origin':
      return topology.origins;
    case 'supplier':
      return topology.suppliers;
    case 'plant':
      return topology.plants;
    case 'customer':
      return topology.customers;
  }
}

/** The left edge of the column at `laneIndex`. */
function laneX(laneIndex: number): number {
  return GRAPH_PADDING + laneIndex * (NODE_WIDTH + LANE_GAP);
}

/** The top edge of the node at `rowIndex` within its lane. */
function rowY(rowIndex: number): number {
  return LANE_HEADING_HEIGHT + rowIndex * (NODE_HEIGHT + NODE_ROW_GAP);
}

/**
 * The drawing's width: every lane column plus the gap between each pair of them.
 *
 * It follows the lane list rather than a written number, so a lane added to the list widens the
 * view box with no second constant to change.
 */
function graphWidth(): number {
  const laneCount = DEPENDENCY_GRAPH_LANES.length;
  const columns = laneCount * NODE_WIDTH + Math.max(0, laneCount - 1) * LANE_GAP;

  return columns + 2 * GRAPH_PADDING;
}

/**
 * The drawing's height: the heading band, the rows the longest lane needs and the clearance below.
 *
 * A payload with no nodes at all still reserves one row, so an empty network draws six labelled
 * columns of a sane height instead of collapsing to the height of its headings.
 */
function graphHeight(tallestLane: number): number {
  const rows = Math.max(1, tallestLane);

  return (
    LANE_HEADING_HEIGHT + rows * NODE_HEIGHT + (rows - 1) * NODE_ROW_GAP + GRAPH_BOTTOM_PADDING
  );
}

/**
 * Every node of the payload with the place it occupies, in lane order and then row order.
 *
 * One pass over the lanes fixes both the drawing and the lane geometry, so an edge looks its
 * endpoints up in this one list and the two cannot describe different positions. Nodes of a family
 * that a lane does not draw (there are none today, but the families and the lanes are separate
 * lists) would not appear here, which is why `edge` is built from it rather than assumed.
 */
function placeNodes(topology: Topology): readonly NodePlacement[] {
  const placements: NodePlacement[] = [];

  DEPENDENCY_GRAPH_LANES.forEach((lane, laneIndex) => {
    if (lane.kind === null) {
      return;
    }

    nodesOfFamily(topology, lane.kind).forEach((node, rowIndex) => {
      placements.push({ node, x: laneX(laneIndex), y: rowY(rowIndex) });
    });
  });

  return placements;
}

/** The number of rows the tallest lane needs, which is what the drawing's height is derived from. */
function tallestLane(topology: Topology): number {
  return DEPENDENCY_GRAPH_LANES.reduce((tallest, lane) => {
    const count = lane.kind === null ? 0 : nodesOfFamily(topology, lane.kind).length;

    return Math.max(tallest, count);
  }, 0);
}

/** A lane's path from the end of its upstream node's box to the start of its downstream node's. */
function edgePath(from: NodePlacement, to: NodePlacement): string {
  const startX = from.x + NODE_WIDTH;
  const startY = from.y + NODE_HEIGHT / 2;
  const endX = to.x;
  const endY = to.y + NODE_HEIGHT / 2;
  const bend = Math.max(EDGE_MIN_BEND, (endX - startX) / 2);

  return `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`;
}

/**
 * The arrowhead at a lane's downstream end, drawn as a closed path.
 *
 * It is a shape rather than an SVG marker reference on purpose: a marker is addressed through a
 * local reference, and this module holds no such reference — every paint comes from a role token and
 * every mark from a value computed here, which keeps the file free of document-scoped identifiers
 * that a second instance on the same screen would collide with.
 */
function arrowPath(to: NodePlacement): string {
  const tipX = to.x;
  const tipY = to.y + NODE_HEIGHT / 2;

  return `M ${tipX - ARROW_LENGTH} ${tipY - ARROW_HALF_HEIGHT} L ${tipX} ${tipY} L ${
    tipX - ARROW_LENGTH
  } ${tipY + ARROW_HALF_HEIGHT} Z`;
}

/* ---------------------------------------------------------------------------------------------
 * The pin summary — the payload's own counts, printed and spoken
 * ------------------------------------------------------------------------------------------- */

/** The number of pins a node carries, across every state. */
function totalPins(counts: PinCounts): number {
  return PIN_STATE_ORDER.reduce((total, state) => total + counts[state], 0);
}

/** The states a node carries pins in, with their counts, in the order a summary prints them. */
function pinBreakdown(counts: PinCounts): string {
  return PIN_STATE_ORDER.filter((state) => counts[state] > 0)
    .map((state) => `${counts[state]} ${PIN_STATE_WORDS[state]}`)
    .join(', ');
}

/**
 * The whole of a node's pin summary, as the accessible name states it.
 *
 * A node the payload's pin map does not hold, and a node whose counts are all zero, both read as
 * "no evidence pins": the map documents that a node absent from it has no pins, so the two cases
 * mean the same thing to a reader and are said the same way.
 */
function pinSentence(counts: PinCounts | undefined): string {
  if (counts === undefined) {
    return DEPENDENCY_GRAPH_TEXT.noPins;
  }

  const breakdown = pinBreakdown(counts);

  if (breakdown === '') {
    return DEPENDENCY_GRAPH_TEXT.noPins;
  }

  const total = totalPins(counts);
  const noun = total === 1 ? DEPENDENCY_GRAPH_TEXT.pinNounSingular : DEPENDENCY_GRAPH_TEXT.pinNoun;

  return `${total} ${noun}${DEPENDENCY_GRAPH_TEXT.pinBreakdownSeparator} ${breakdown}`;
}

/**
 * The pin summary the node's box prints: the breakdown when it fits, and the count when it does not.
 *
 * The visible line is the breakdown, so the states a reader most needs — the failures and the stale
 * pins first — are on the drawing rather than only in the accessible name. A breakdown too long for
 * the box is replaced by the node's total rather than cut with an ellipsis: a fragment ending in a
 * dangling separator reads as a lost value, while a count is a whole reading, and the full breakdown
 * stays in the accessible name and in the frame's table view. A node with no pins prints nothing, so
 * the drawing then shows its label alone.
 */
function visiblePinSummary(counts: PinCounts | undefined): string {
  if (counts === undefined) {
    return '';
  }

  const breakdown = pinBreakdown(counts);

  if (breakdown === '') {
    return '';
  }

  if (breakdown.length <= SUMMARY_CHARACTER_BUDGET) {
    return breakdown;
  }

  const total = totalPins(counts);
  const noun = total === 1 ? DEPENDENCY_GRAPH_TEXT.pinNounSingular : DEPENDENCY_GRAPH_TEXT.pinNoun;

  return `${total} ${noun}`;
}

/**
 * The accessible name of one node: what it is called, which family it belongs to, and its pins.
 *
 * The node's own label comes first so the visible text starts the name (WCAG 2.2 SC 2.5.3), the
 * family follows because the column a mark sits in is not spoken, and the pin summary is spelled out
 * in full because the box prints only as much of it as fits.
 */
function nodeAccessibleName(node: TopologyNode, counts: PinCounts | undefined): string {
  return `${node.label}, ${FAMILY_WORDS[node.kind]} node, ${pinSentence(counts)}`;
}

/* ---------------------------------------------------------------------------------------------
 * Emphasis — how strongly one node is drawn, decided in one place
 * ------------------------------------------------------------------------------------------- */

/**
 * How strongly one node is drawn.
 *
 * The four levels are ranked, and a node that qualifies for more than one takes the strongest: the
 * selection outranks the traced path, and the traced path outranks dimming, because the node a
 * reader asked for is never also the node the lens is pushing away. The two class maps below are
 * keyed by this union, so a level added without a decided appearance fails to compile instead of
 * rendering as whichever arm happened to be last.
 */
type NodeEmphasis = 'selected' | 'path' | 'dimmed' | 'default';

/**
 * One node's boundary and surface per emphasis level.
 *
 * Emphasis never rests on colour alone (rule B-3): a dimmed node draws a thinner boundary in the
 * decorative hairline role over the ground, a traced node and the selected node draw a heavier
 * boundary in the accent role, and the label weight moves with it below. Every value is a role
 * token — no raw palette value, no arbitrary value and no opacity — so a boundary that must not
 * appear on a surface cannot be selected, and the contrasts are the ones specification 4 measured.
 */
const NODE_BOX_CLASSES = {
  selected: 'fill-surface-1 stroke-accent stroke-2',
  path: 'fill-surface-2 stroke-accent stroke-2',
  dimmed: 'fill-ground stroke-hairline stroke-1',
  default: 'fill-surface-2 stroke-control-boundary stroke-1 group-hover:stroke-accent',
} as const satisfies Record<NodeEmphasis, string>;

/**
 * One node's label per emphasis level: the same size throughout, with the weight carrying the
 * emphasis and the secondary text role carrying the dimming. The label is never hidden, so a dimmed
 * node is still readable and still named in full by its accessible name.
 */
const NODE_LABEL_CLASSES = {
  selected: 'text-12 font-semibold fill-text-primary',
  path: 'text-12 font-semibold fill-text-primary',
  dimmed: 'text-12 font-normal fill-text-secondary',
  default: 'text-12 font-medium fill-text-primary',
} as const satisfies Record<NodeEmphasis, string>;

/** One node's pin summary: the caption role at the smallest step of the type scale, in every level. */
const NODE_SUMMARY_CLASSES = 'text-12 fill-text-caption';

/**
 * A node's focus stop, pointer affordance and the one transition in the file.
 *
 * `focus-visible:outline-*` is the two-pixel `--color-focus-ring` outline the themes define, drawn
 * for the keyboard rather than for a click; `motion-safe:` keeps the colour transition out of a
 * reduced-motion session (rule B-3), and nothing on the drawing moves.
 */
const NODE_GROUP_CLASSES = [
  'group cursor-pointer',
  'motion-safe:transition-colors motion-safe:duration-150',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
].join(' ');

/** A lane's heading, above its column, in the caption role so it frames without competing. */
const LANE_HEADING_CLASSES = 'text-12 fill-text-caption';

/** The guide that runs down a lane's column, beneath every mark in it. */
const LANE_GUIDE_CLASSES = 'stroke-hairline stroke-1';

/** The note a lane carries when the payload holds no nodes for its stage. */
const EMPTY_LANE_NOTE_CLASSES = 'text-12 fill-text-caption';

/** A lane between two nodes: the decorative hairline role, thin enough to sit behind the marks. */
const EDGE_CLASSES = 'fill-none stroke-hairline stroke-1';

/** A lane on the traced path: the accent role and a heavier stroke, plus a heavier arrowhead. */
const EMPHASISED_EDGE_CLASSES = 'fill-none stroke-accent stroke-2';

/** A lane's arrowhead, in the lane's own role colour. */
const ARROW_CLASSES = 'fill-hairline';

/** The arrowhead of a traced lane, in the accent role. */
const EMPHASISED_ARROW_CLASSES = 'fill-accent';

/**
 * The scenario preview switch.
 *
 * It composes the shared control structure and the secondary appearance from `./tooltip.tsx`, so the
 * target size, the focus ring and the pointer states are the ones every other control in the product
 * uses, and it adds only what makes a switch a switch: the accent boundary and the first raised
 * surface while it is on, painted from the `aria-checked` state rather than from a conditional class
 * list. Its disabled appearance follows the same pattern the disabled action uses: `aria-disabled`
 * outranks the pointer states, so a switch that cannot act answers neither a hover nor a press.
 */
const PREVIEW_SWITCH_CLASSES = [
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
  'aria-checked:border-accent aria-checked:bg-surface-1',
  'aria-disabled:cursor-not-allowed aria-disabled:text-text-secondary',
  'aria-disabled:hover:border-control-boundary aria-disabled:hover:bg-surface-2',
  'aria-disabled:hover:text-text-secondary',
].join(' ');

/** The strip under the drawing: the selected node, and the control the next stage will enable. */
const SELECTED_STRIP_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2';

/** The caption that introduces the selected node's name. */
const SELECTED_CAPTION_CLASSES = 'text-12 text-text-caption';

/** The selected node's name, in the primary text role. */
const SELECTED_NAME_CLASSES = 'min-w-0 break-words text-13 text-text-primary';

/* ---------------------------------------------------------------------------------------------
 * Small helpers
 * ------------------------------------------------------------------------------------------- */

/**
 * Cuts a record's own text to a character budget, marking the cut with an ellipsis.
 *
 * The drawing has no measuring pass — its layout is fixed — so the width a label may occupy is
 * expressed as a character count rather than as a truncation the browser performs. Nothing is cut
 * from an accessible name or from the frame's table view, which carry the record's text in full.
 */
function truncateToBudget(text: string, budget: number): string {
  return text.length <= budget ? text : `${text.slice(0, budget - 1).trimEnd()}\u2026`;
}

/**
 * The node a selection names, or `undefined` when the payload holds no such node.
 *
 * A selection can outlive the payload it was made against — a scope change narrows the network while
 * the screen still holds the old id — so this lookup answers `undefined` rather than assuming the id
 * resolves, and the strip below renders nothing in that case.
 */
function findNode(topology: Topology, nodeId: string): TopologyNode | undefined {
  const families: readonly (readonly TopologyNode[])[] = [
    topology.origins,
    topology.suppliers,
    topology.plants,
    topology.customers,
  ];

  for (const family of families) {
    const found = family.find((node) => node.id === nodeId);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

/**
 * Whether the payload carries at least one pin in `state`, which is what decides whether the key
 * below the drawing has to explain that state's word. It counts record values and shows none.
 */
function statePresent(topology: Topology, state: PinState): boolean {
  return Object.values(topology.pinsByNode).some((counts) => counts[state] > 0);
}

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * Props of {@link DependencyGraph}.
 *
 * The first four are the lens's contract with the canvas screen and are identical to the pair
 * `./map-canvas.tsx` takes, so one selection drives both lenses. The optional members are the
 * overlays the screen switches on — dimming, a traced path, a scenario preview — and none of them
 * is state this component keeps.
 */
export interface DependencyGraphProps {
  /** The network to draw, exactly as `getTopology` returned it. Required: the lens reads nothing. */
  readonly topology: Topology;

  /**
   * The drawing's name, for assistive technology.
   *
   * It titles the surface, so two surfaces on one screen are told apart by name; the frame above the
   * drawing carries the same title as its caption, and this one names the graphic itself.
   */
  readonly title: string;

  /**
   * The node the screen has selected, shared with the map lens.
   *
   * Optional, because a canvas may open with nothing selected; a value the payload does not hold
   * draws no emphasis and no strip rather than failing.
   */
  readonly selectedNodeId?: string | undefined;

  /**
   * Reports the node a reader activated — by click, by `Enter` or by `Space`.
   *
   * Required, because a lens whose nodes could be focused but not chosen would be a surface of
   * dead controls (rule P-8). The screen owns the value it receives and passes it back down.
   */
  readonly onSelectNode: (nodeId: string) => void;

  /**
   * The nodes to push back: the ones outside what the reader is currently looking at.
   *
   * A dimmed node keeps its place, its label and its accessible name and draws a thinner boundary
   * with a lighter label, so the state carries meaning without resting on colour (rule B-3).
   */
  readonly dimmedNodeIds?: readonly string[] | undefined;

  /**
   * The nodes of the upstream or downstream path to trace.
   *
   * A traced node draws the accent boundary, and a lane whose two ends are both traced draws the
   * accent stroke and arrowhead, so a path reads as a route rather than as a set of highlights.
   */
  readonly pathNodeIds?: readonly string[] | undefined;

  /**
   * The scenario this lens would preview once the switch is turned on, or `null` when the screen has
   * none to offer.
   *
   * The switch reports this id when it is turned on and `null` when it is turned off, which is the
   * only shape a controlled switch can be given: the id to preview has to come from somewhere, and
   * the screen is what holds it. `null` therefore disables the switch, with the reason stated.
   */
  readonly previewScenarioId?: string | null | undefined;

  /**
   * Receives the preview request: a scenario id to preview, or `null` to stop previewing.
   *
   * Optional. When no handler is supplied the switch is not rendered at all, because a control that
   * reports to nobody would be a control that does not perform its function (rule P-8).
   */
  readonly onPreviewScenarioChange?: ((scenarioId: string | null) => void) | undefined;

  /**
   * The evidence reference to open for a node, or `undefined` for a node whose evidence the caller
   * cannot name.
   *
   * The topology payload carries a node's pin counts rather than its pins, and the evidence read
   * resolves record references, so this component cannot derive a resolvable reference without
   * fabricating a record identifier (rule P-6). The caller that holds a node's evidence supplies it
   * here; when it supplies none, activating a node reports the selection and opens no drawer, so a
   * reader is never shown a refusal where a record belongs.
   */
  readonly evidenceRefForNode?: ((node: TopologyNode) => string | undefined) | undefined;
}

/**
 * The graph lens: the canvas's network drawn in six fixed lanes, with the pin summary of every node.
 *
 * The drawing is a single `svg` sized by its view box, so it scales with the column the screen gives
 * it and needs no measuring pass: the lane columns, the rows, the lane paths and the arrowheads are
 * all computed from the payload's own counts by the pure functions above. It carries no table and no
 * toggle, because `./chart-frame.tsx` owns the table view of every chart, map and graph.
 *
 * Activation reports the node and, when the caller supplied a reference for it, opens the evidence
 * drawer beside the drawing. The drawer is a sibling of the `svg`, never a child of it: a dialog
 * cannot live inside an SVG fragment, and the drawer itself portals into the document body.
 *
 * @param props The topology, the drawing's title, the shared selection and the optional overlays.
 * @returns The lens: a preview switch, the drawing, the pin-state key, the selected-node strip and,
 *   while it is open, the evidence drawer.
 */
export function DependencyGraph({
  topology,
  title,
  selectedNodeId,
  onSelectNode,
  dimmedNodeIds,
  pathNodeIds,
  previewScenarioId,
  onPreviewScenarioChange,
  evidenceRefForNode,
}: DependencyGraphProps): ReactElement {
  const titleId = useId();
  const [armedPreviewId, setArmedPreviewId] = useState<string | null>(null);
  const [openEvidenceRef, setOpenEvidenceRef] = useState<string | null>(null);

  const placements = placeNodes(topology);
  const placementById = new Map(
    placements.map((placement) => [placement.node.id, placement] as const),
  );
  const dimmed = new Set(dimmedNodeIds ?? []);
  const traced = new Set(pathNodeIds ?? []);
  const width = graphWidth();
  const height = graphHeight(tallestLane(topology));
  const selectedNode =
    selectedNodeId === undefined ? undefined : findNode(topology, selectedNodeId);

  const previewId = previewScenarioId ?? null;
  const canArmPreview = previewId !== null && onPreviewScenarioChange !== undefined;
  const isPreviewing = canArmPreview && armedPreviewId === previewId;
  const previewSwitchLabel =
    previewId === null
      ? DEPENDENCY_GRAPH_TEXT.previewLabel
      : `${DEPENDENCY_GRAPH_TEXT.previewLabel} ${previewId}`;

  const presentStates = PIN_STATE_ORDER.filter((state) => statePresent(topology, state));

  const emphasisOf = (nodeId: string): NodeEmphasis => {
    if (selectedNodeId !== undefined && nodeId === selectedNodeId) {
      return 'selected';
    }

    if (traced.has(nodeId)) {
      return 'path';
    }

    return dimmed.has(nodeId) ? 'dimmed' : 'default';
  };

  const activateNode = (node: TopologyNode): void => {
    onSelectNode(node.id);

    const reference = evidenceRefForNode?.(node);

    if (reference !== undefined) {
      setOpenEvidenceRef(reference);
    }
  };

  const handleNodeKeyDown = (
    event: ReactKeyboardEvent<SVGGElement>,
    node: TopologyNode,
  ): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
      return;
    }

    event.preventDefault();
    activateNode(node);
  };

  const handlePreviewToggle = (): void => {
    if (previewId === null || onPreviewScenarioChange === undefined) {
      return;
    }

    if (isPreviewing) {
      setArmedPreviewId(null);
      onPreviewScenarioChange(null);

      return;
    }

    setArmedPreviewId(previewId);
    onPreviewScenarioChange(previewId);
  };

  const previewSwitch = (
    <button
      type="button"
      role="switch"
      aria-checked={isPreviewing}
      aria-disabled={canArmPreview ? undefined : true}
      aria-label={previewSwitchLabel}
      className={PREVIEW_SWITCH_CLASSES}
      onClick={handlePreviewToggle}
    >
      <span>{previewSwitchLabel}</span>
    </button>
  );

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {onPreviewScenarioChange === undefined ? null : (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {canArmPreview ? (
            previewSwitch
          ) : (
            <Tooltip label={DEPENDENCY_GRAPH_TEXT.previewUnavailable}>{previewSwitch}</Tooltip>
          )}
        </div>
      )}

      <svg
        role="group"
        aria-labelledby={titleId}
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full"
      >
        <title id={titleId}>{title}</title>

        {DEPENDENCY_GRAPH_LANES.map((lane, laneIndex) => {
          const x = laneX(laneIndex);
          const populated =
            lane.kind === null ? false : nodesOfFamily(topology, lane.kind).length > 0;

          return (
            <g key={lane.id}>
              <line
                x1={x + NODE_WIDTH / 2}
                y1={populated ? LANE_HEADING_HEIGHT - 2 : EMPTY_LANE_TRUNK_TOP}
                x2={x + NODE_WIDTH / 2}
                y2={height}
                className={LANE_GUIDE_CLASSES}
                aria-hidden="true"
              />
              <text x={x} y={LANE_HEADING_HEIGHT - 10} className={LANE_HEADING_CLASSES}>
                {lane.label}
              </text>
            </g>
          );
        })}

        {topology.lanes.map((lane, laneIndex) => {
          const from = placementById.get(lane.fromId);
          const to = placementById.get(lane.toId);

          if (from === undefined || to === undefined) {
            return null;
          }

          const isTraced = traced.has(lane.fromId) && traced.has(lane.toId);

          return (
            <g key={`${lane.fromId} ${lane.toId} ${laneIndex}`} aria-hidden="true">
              <path
                d={edgePath(from, to)}
                className={isTraced ? EMPHASISED_EDGE_CLASSES : EDGE_CLASSES}
              />
              <path
                d={arrowPath(to)}
                className={isTraced ? EMPHASISED_ARROW_CLASSES : ARROW_CLASSES}
              />
            </g>
          );
        })}

        {/* The empty-lane notes sit above the lanes rather than under them, so no connector can
            strike through a sentence: a lane that happens to cross an unoccupied column is drawn
            first and the note reads clean over it in both themes. */}
        {DEPENDENCY_GRAPH_LANES.map((lane, laneIndex) => {
          const populated =
            lane.kind === null ? false : nodesOfFamily(topology, lane.kind).length > 0;

          return populated ? null : (
            <text
              key={`${lane.id} empty`}
              x={laneX(laneIndex)}
              y={EMPTY_LANE_NOTE_BASELINE}
              className={EMPTY_LANE_NOTE_CLASSES}
            >
              {DEPENDENCY_GRAPH_TEXT.emptyLane}
            </text>
          );
        })}

        {placements.map((placement) => {
          const { node, x, y } = placement;
          const counts = topology.pinsByNode[node.id];
          const emphasis = emphasisOf(node.id);
          const summary = visiblePinSummary(counts);

          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={nodeAccessibleName(node, counts)}
              transform={`translate(${x} ${y})`}
              className={NODE_GROUP_CLASSES}
              onClick={() => {
                activateNode(node);
              }}
              onKeyDown={(event) => {
                handleNodeKeyDown(event, node);
              }}
            >
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={NODE_CORNER_RADIUS}
                className={NODE_BOX_CLASSES[emphasis]}
              />
              <text
                x={NODE_TEXT_INSET}
                y={summary === '' ? NODE_HEIGHT / 2 + 4 : 17}
                className={NODE_LABEL_CLASSES[emphasis]}
              >
                {truncateToBudget(node.label, LABEL_CHARACTER_BUDGET)}
              </text>
              {summary === '' ? null : (
                <text x={NODE_TEXT_INSET} y={31} className={NODE_SUMMARY_CLASSES}>
                  {summary}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {presentStates.length === 0 ? null : (
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span className={SELECTED_CAPTION_CLASSES}>{DEPENDENCY_GRAPH_TEXT.pinKeyLabel}</span>
          {presentStates.map((state) => {
            const descriptor = meaningOf(state);

            return (
              <StatusIndicator
                key={state}
                meaning={descriptor.meaning}
                label={PIN_STATE_WORDS[state]}
                icon={descriptor.iconOverride === 'clock' ? PENDING_CLOCK_ICON : undefined}
              />
            );
          })}
        </div>
      )}

      {selectedNode === undefined ? null : (
        <div className={SELECTED_STRIP_CLASSES}>
          <span className={SELECTED_CAPTION_CLASSES}>{DEPENDENCY_GRAPH_TEXT.selectedLabel}</span>
          <span className={SELECTED_NAME_CLASSES}>{selectedNode.label}</span>
          {selectedNode.productIds.length === 0 ? null : (
            <ActionButton disabled disabledReason={DEPENDENCY_GRAPH_TEXT.stageFourReason}>
              {DEPENDENCY_GRAPH_TEXT.openPartLabel}
            </ActionButton>
          )}
        </div>
      )}

      {openEvidenceRef === null ? null : (
        <EvidenceDrawer
          evidenceRef={openEvidenceRef}
          onClose={() => {
            setOpenEvidenceRef(null);
          }}
        />
      )}
    </div>
  );
}

