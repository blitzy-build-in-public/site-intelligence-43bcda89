/**
 * The graph lens of the FileMap canvas: the same network the map lens draws, hand-laid in six lanes.
 *
 * THE FIXING INPUTS. AAP 0.5.2 places `DependencyGraph` in this folder with "topology typed prop,
 * selection callbacks" and the graph "hand-laid in six lanes"; AAP 0.12.4 fixes the lens — "six
 * lanes, dimming, upstream and downstream path, scenario preview switch" — over the one `getTopology`
 * payload the map lens draws, so a node found in either lens is found in both.
 *
 * THE LAYOUT IS HAND-LAID AND DETERMINISTIC: a fixed column per lane, a fixed slot per node from its
 * index in its family as the service ordered it — no force simulation, no jitter, no measurement —
 * so the same topology draws the same picture in a browser test and a component test alike.
 *
 * THE SIX LANES ARE THE STAGES OF THE NETWORK, NOT THE NODE FAMILIES, and the stage the payload
 * carries no records for keeps its column, its label and its guide and says it holds no nodes rather
 * than inventing any (rule P-6). SELECTION IS THE SCREEN'S: `selectedNodeId` and `onSelectNode` are
 * the `./map-canvas.tsx` pair, and the canvas holds the value, so both lenses highlight one node.
 * Every other decision is stated at the symbol that makes it true.
 */
import { memo, useMemo, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';

import type { PinCounts, PinState, Topology, TopologyNode, TopologyNodeKind } from '../types';

import { EvidenceDrawer } from './evidence-drawer';
import { NODE_FAMILY_WORDS, PIN_STATE_ORDER } from './graph-vocabulary';
import { CONTROL_RADIUS_CLASSES } from './horizontal-bar-chart';
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
 * which is not re-cased or paraphrased here. The rest are this component's own labels, and none of
 * them claims a security property for the workspace (rule P-4). Nothing below carries a figure, an
 * amount, a date or a record identifier (rule P-6): a node's label, its pin counts and its families
 * all arrive from the payload.
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

  /**
   * The accessible name of the group holding the three direction controls.
   *
   * The group is what tells a reader that the three controls are one choice rather than three
   * unrelated actions, so it names the choice the drawing applies to the selection beneath it.
   */
  emphasisDirectionLabel: 'Emphasis direction',

  /**
   * The visible label of each direction control, one per member of {@link GraphEmphasisDirection}.
   *
   * Each names the half of the path it traces in the words the table view's path column already uses
   * for it — "Upstream", "Downstream" — so a reader who reads the drawing and then the table meets one
   * vocabulary. The default says "Both directions" rather than repeating those two names: it is the
   * reading a reader who never touches the control is given, and the caption beneath the drawing spells
   * the whole path out.
   */
  emphasisDirectionLabels: {
    both: 'Both directions',
    upstream: 'Upstream',
    downstream: 'Downstream',
  } as const satisfies Record<GraphEmphasisDirection, string>,

  /**
   * The visible label of the dimming switch: it names what the switch does while it is on.
   *
   * A label that read "Dimming" would leave a reader who turned it off unsure of what turning it back
   * on would do, so the switch states the action it is holding on rather than the state's name.
   */
  dimmingLabel: 'Dim nodes off the path',

  /**
   * Why every emphasis control is disabled, stated on the drawing when no node resolves for
   * `selectedNodeId`.
   *
   * There is nothing to trace and nothing to dim without a selection, so the four controls say so
   * together instead of resting inert under a reader's pointer (rule P-8). It is one sentence for all
   * four because the reason is one: the selection they act on is missing, not the control's own
   * ability.
   */
  emphasisUnavailable: 'Select a node to trace its path and dim the nodes off it.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The emphasis the reader drives — AAP 0.12.4, the lens's dimming and upstream/downstream path
 * ------------------------------------------------------------------------------------------- */

/**
 * The directions a selection can be traced in: the whole of that control's state space.
 *
 * AAP 0.12.4 and AAP 0.14.1 name "dimming, upstream and downstream path" among the graph lens's
 * features, so which half of the path the drawing emphasises is the reader's choice rather than a
 * conclusion the lens reaches for them. `'both'` is the path the lens drew before the control existed
 * and the two single directions are its halves, so no reading a reader had is lost by the control
 * arriving. The union is closed and {@link GRAPH_EMPHASIS_DIRECTIONS} lists exactly its members, so a
 * member added here without a control fails to compile at that list instead of rendering an arm
 * nothing can reach.
 */
export type GraphEmphasisDirection = 'both' | 'upstream' | 'downstream';

/**
 * Every direction of {@link GraphEmphasisDirection}, in the order the controls render them.
 *
 * `'both'` leads because it is the lens's default, so the first control a reader meets is the reading
 * the lens already gave them. The array is the one owner of how many direction controls exist and in
 * what order, so the drawing, the lens's caption and both suites cannot disagree about either.
 */
export const GRAPH_EMPHASIS_DIRECTIONS = ['both', 'upstream', 'downstream'] as const;

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
 * feeds a supplier, a supplier sells a material, a material reaches a plant, a plant serves a customer.
 * Materials sit between suppliers and plants and lines between plants and customers, which is where
 * those records belong in the network; the payload carries the material family and no line family, so
 * the Lines column is the one lane this drawing states as empty. The array is the one owner of the lane
 * order, the lane headings and the lane count, so the drawing, its suite and the empty-lane note cannot
 * disagree about how many lanes there are.
 */
export const DEPENDENCY_GRAPH_LANES = [
  { id: 'origins', label: 'Tier-2 origins', kind: 'origin' },
  { id: 'suppliers', label: 'Suppliers', kind: 'supplier' },
  { id: 'materials', label: 'Materials', kind: 'material' },
  { id: 'plants', label: 'Plants', kind: 'plant' },
  { id: 'lines', label: 'Lines', kind: null },
  { id: 'customers', label: 'Customers', kind: 'customer' },
] as const satisfies readonly DependencyGraphLane[];

/* ---------------------------------------------------------------------------------------------
 * The words a pin count is announced with — this lens's own wording, one per pinned state
 * ------------------------------------------------------------------------------------------- */

/**
 * The word each pin state is counted with in a summary.
 *
 * The order the states are listed in, and the word each node family is announced by, are shared with
 * every other graph surface and live in `./graph-vocabulary.ts`; these are this lens's own wording for
 * the six states a count is read aloud with, which is the one part of a pin's vocabulary that differs
 * between surfaces.
 */
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
 * These five families are the whole of what the lens draws, so no competitor concept reaches the
 * drawing (rule P-5): market intelligence is never blended with the first-party records of a network.
 */
function nodesOfFamily(topology: Topology, kind: TopologyNodeKind): readonly TopologyNode[] {
  switch (kind) {
    case 'origin':
      return topology.origins;
    case 'supplier':
      return topology.suppliers;
    case 'material':
      return topology.materials;
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
 * The width the view box is drawn at, derived once.
 *
 * Neither the lane list nor the grid above it can change while the application runs, so the width is a
 * constant of this module rather than a value recomputed in every render: what the render body derives
 * is then only the geometry that depends on the payload it was given.
 */
const GRAPH_WIDTH = graphWidth();

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
  return `${node.label}, ${NODE_FAMILY_WORDS[node.kind]} node, ${pinSentence(counts)}`;
}

/* ---------------------------------------------------------------------------------------------
 * Emphasis — how strongly one node is drawn, decided in one place
 * ------------------------------------------------------------------------------------------- */

/**
 * How strongly one node is drawn.
 *
 * The four levels are ranked, and a node that qualifies for more than one takes the strongest: the
 * selection outranks the traced path, and the traced path outranks dimming, because the node a reader
 * asked for is never also the node the lens is pushing away. The class maps below are keyed by this
 * union, so a level added without a decided appearance fails to compile.
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
 *
 * Every level answers the pointer in the same two steps, so a reader learns one rule from the whole
 * lens. `hover:` lifts the boundary to the accent role and steps the surface to its neighbour, so the
 * node under the pointer is distinguishable from the neighbours sharing its level; `active:` holds the
 * accent boundary and steps the surface to the ground, so a press reads as one step below the hover
 * that preceded it. Dimming survives both — the dimmed node keeps its ground fill and hairline weight
 * while hovered, taking only the accent boundary, and a press raises its surface by that one step.
 * No level rests its meaning on those colours: each keeps its own boundary weight and its own label
 * weight throughout, and none of the four states changes the geometry, the text or the size of a box.
 */
const NODE_BOX_CLASSES = {
  selected:
    'fill-surface-1 stroke-accent stroke-2 group-hover:fill-surface-2 group-active:fill-ground',
  path: 'fill-surface-2 stroke-accent stroke-2 group-hover:fill-surface-1 group-active:fill-ground',
  dimmed:
    'fill-ground stroke-hairline stroke-1 group-hover:stroke-accent group-active:stroke-accent group-active:fill-surface-1',
  default:
    'fill-surface-2 stroke-control-boundary stroke-1 group-hover:stroke-accent group-hover:fill-surface-1 group-active:stroke-accent group-active:fill-ground',
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
 * Every node is a focus stop with the role of a button, and `Enter` or `Space` activates it exactly as
 * a click does (rule B-3). `focus-visible:outline-*` is the two-pixel `--color-focus-ring` outline the
 * themes define, drawn for the keyboard rather than for a click; `motion-safe:` keeps the colour
 * transition out of a reduced-motion session, and nothing on the drawing moves. The `group` marker is
 * what the boundary's `hover:` and `active:` variants in {@link NODE_BOX_CLASSES} hang on, so the
 * pointer states are applied by the browser rather than held in React state.
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
 * It composes the shared control structure and secondary appearance from `./tooltip.tsx`, so its
 * target size, focus ring and pointer states are every other control's, and adds only what makes a
 * switch a switch: the accent boundary and raised surface while on, painted from `aria-checked`
 * rather than from a conditional class list. Its disabled appearance is the disabled action's:
 * `aria-disabled` outranks the pointer states, so a switch that cannot act answers no hover or press.
 */
const PREVIEW_SWITCH_CLASSES = [
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
  'aria-checked:border-accent aria-checked:bg-surface-1',
  'aria-disabled:cursor-not-allowed aria-disabled:text-text-secondary',
  'aria-disabled:hover:border-control-boundary aria-disabled:hover:bg-surface-2',
  'aria-disabled:hover:text-text-secondary',
].join(' ');

/**
 * One emphasis-direction control: an exclusive choice, pressed or not.
 *
 * It composes the shared control structure and secondary appearance for the preview switch's reason,
 * and adds the pressed treatment through `aria-pressed` — the attribute, not a conditional class list,
 * so the state a reader sees is the state assistive technology is told. The pressed control takes the
 * accent boundary, the raised surface and a heavier label, so the choice never rests on colour alone
 * (rule B-3); the `aria-disabled` overrides answer neither the pointer nor a press without a selection.
 */
const EMPHASIS_DIRECTION_CLASSES = [
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
  'aria-pressed:border-accent aria-pressed:bg-surface-1 aria-pressed:font-semibold',
  'aria-disabled:cursor-not-allowed aria-disabled:text-text-secondary',
  'aria-disabled:hover:border-control-boundary aria-disabled:hover:bg-surface-2',
  'aria-disabled:hover:text-text-secondary',
].join(' ');

/**
 * The dimming switch: the preview switch's own appearance, plus the weight its checked state carries.
 *
 * It builds on {@link PREVIEW_SWITCH_CLASSES} rather than restating it, so the two switches cannot
 * drift apart: the accent boundary and raised surface while on, the same inert appearance while it
 * cannot act, and one addition — a heavier label on `aria-checked` — so the state a reader who cannot
 * tell the two theme surfaces apart is looking at is never stated in colour alone (rule B-3).
 */
const DIMMING_SWITCH_CLASSES = [PREVIEW_SWITCH_CLASSES, 'aria-checked:font-semibold'].join(' ');

/** One group of controls inside the controls row, wrapping rather than overflowing at a narrow width. */
const CONTROL_GROUP_CLASSES = 'flex min-w-0 flex-wrap items-center gap-1';

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
    topology.materials,
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
 * `./map-canvas.tsx` takes, so one selection drives both lenses. The four that follow them are the
 * emphasis controls' own pair, in the shape that file gives the zoom level and the view preset: the
 * caller owns each value and this component reports the reader's change, so no reading is worked out
 * here that the lens's caption and its table view would then have to be told about separately. The
 * optional members are the overlays the caller switches on — what to dim, what to trace, a scenario
 * to preview — and they belong to the caller for the same reason.
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
   * Which half of the path the drawing emphasises. Controlled: the caller owns the value.
   *
   * AAP 0.12.4 names the upstream and downstream path as a feature a reader drives, so the direction
   * arrives as a prop rather than being decided in the render body: the same value feeds the
   * `pathNodeIds` the caller traces from, and the caption that states in words what the drawing did.
   * It is the controlled pair `./map-canvas.tsx` uses for the zoom level and the view preset — the
   * caller holds the value, this component reports the change — so one lens and the other cannot
   * disagree about how a choice is passed.
   */
  readonly emphasisDirection: GraphEmphasisDirection;

  /** Called with the direction the reader asked for when one of the direction controls is activated. */
  readonly onEmphasisDirectionChange: (direction: GraphEmphasisDirection) => void;

  /**
   * Whether the nodes off the traced path are pushed back. Controlled, for the direction's reason.
   *
   * With it off the drawing still emphasises the path and pushes nothing back, so a reader can read
   * the network at its resting emphasis after choosing a path through it; the caller then supplies no
   * `dimmedNodeIds`, because what to dim is its computation and whether to dim at all is this switch.
   */
  readonly dimming: boolean;

  /** Called with the state the reader asked for when the dimming switch is turned on or off. */
  readonly onDimmingChange: (dimming: boolean) => void;

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
   * Resolves the evidence reference a node opens, or `undefined` for a node no record stands behind.
   * Required: the payload states a node's pin counts and not the references of its pins, so which
   * record a node was drawn from is the caller's to state.
   *
   * REQUIRED BECAUSE A NODE MAY NOT LOSE ITS EVIDENCE SILENTLY. AAP 0.2.1 F12 opens the evidence
   * drawer from "any figure, chart mark, node, arc or pin", so a lens that could be composed without
   * stating how its nodes' evidence opens would leave the reader a mark they cannot inspect, and the
   * requirement's obligations would rest on a prop nobody was obliged to supply.
   *
   * WHAT A RETURNED REFERENCE MUST BE. One the service's `getEvidence` read resolves, which selects a
   * family by its own shape and looks the record up by its exact identifier: the composed aggregates
   * (`overview:`, `canvas:`), an atlas series (`atlas:`), the nine record families `PPAP-`, `EXC-`,
   * `SCN-`, `APR-`, `AUD-`, `PIN-`, `DOC-`, `CO-` and `PO-`, the policy family `POL-`, the seven node
   * families a canvas node can name — `PLT-`, `SUP-`, `ORG-`, `CUS-`, `MAT-`, `LN-` and `PRD-` — the
   * three market-intelligence families `CHK-`, `CMP-` and `SER-`, and a declared outbound endpoint by
   * the endpoint string its ledger row states. A node's identifier is the identifier of the record
   * behind it, so a node's own identifier resolves; a pin attached to the node — `EvidencePin.nodeRef`
   * names the node whose evidence the pin is — resolves as well. A `CHK-` reference is a shared
   * chokepoint of the simulated market-intelligence pack, a `CMP-` reference a competitor's site
   * (`CMP-nn-Sn`) or the network that owns it (`CMP-nn`), and a `SER-` reference a radar series
   * reading, optionally followed by `#<axis id>` for the one vertex a single axis draws.
   *
   * `undefined` IS AN ANSWER, AND AN HONEST ONE. It says no record stands behind this node. Activating
   * the node still reports the selection to the screen and opens no dialog, so a reader is never shown
   * a refusal where a record belongs (rule P-8).
   */
  readonly evidenceRefForNode: (node: TopologyNode) => string | undefined;
}

/**
 * The graph lens: the canvas's network drawn in six fixed lanes, with the pin summary of every node.
 *
 * It carries no table and no toggle, because `./chart-frame.tsx` owns the table view of every chart,
 * map and graph (success criterion 9, rule B-3): a second one here would need its own row order.
 *
 * IT OWNS THE LENS'S CONTROLS, AND AAP 0.5.2 IS WHY. AAP 0.12.4 and AAP 0.14.1 name the dimming and
 * the upstream and downstream path among the lens's features a reader drives, and AAP 0.5.2 permits a
 * native interactive element only inside the component that owns it, so the three direction controls
 * and the dimming switch sit here, beside the preview switch, rather than in the feature file that
 * composes the lens. They are controlled for the selection's reason: the caller's `pathNodeIds` and
 * the caption stating what the drawing did are two readings of the one choice it holds.
 *
 * Activation reports the node and, when the caller's mapper resolves a reference for it, opens the
 * evidence drawer beside the drawing, which declares that with `aria-haspopup="dialog"`. The drawer
 * is a sibling of the `svg`, never a child of it — a dialog cannot live inside an SVG fragment — and
 * portals into the document body itself.
 *
 * WHAT IT DOES NOT DO. It reads no data (rule P-2: the topology is a prop and the drawer makes its own
 * read), types no simulation label of its own (rule P-1: the dock and the ribbon label the figures
 * they show, and a pin summary is record content), carries no competitor concept (rule P-5), fetches
 * nothing (rule B-1) and reads no configuration (rule B-2).
 *
 * @param props The topology, the drawing's title, the shared selection, the controlled emphasis and
 *   the optional overlays. See {@link DependencyGraphProps}.
 * @returns The lens: the emphasis controls, the preview switch, the drawing, the pin-state key, the
 *   selected-node strip and, while it is open, the evidence drawer.
 */
function DependencyGraph({
  topology,
  title,
  selectedNodeId,
  onSelectNode,
  emphasisDirection,
  onEmphasisDirectionChange,
  dimming,
  onDimmingChange,
  dimmedNodeIds,
  pathNodeIds,
  previewScenarioId,
  onPreviewScenarioChange,
  evidenceRefForNode,
}: DependencyGraphProps): ReactElement {
  const [armedPreviewId, setArmedPreviewId] = useState<string | null>(null);
  const [openEvidenceRef, setOpenEvidenceRef] = useState<string | null>(null);

  /*
   * THE DRAWING IS DERIVED FROM ITS PROPS AND NOTHING ELSE, SO EACH DERIVATION IS MEMOISED ON THE
   * PROPS IT READS. The marks below are six lane guides, two paths and an arrowhead per lane and a
   * three-element box per node — the heaviest surface in the application — and the canvas screen
   * re-renders whenever the reader touches anything on it. Memoised, a render that changed one prop
   * rebuilds only what that prop feeds; unmemoised, every such render rebuilt all of it.
   */
  const placements = useMemo(() => placeNodes(topology), [topology]);
  const placementById = useMemo(
    () => new Map(placements.map((placement) => [placement.node.id, placement] as const)),
    [placements],
  );
  const dimmed = useMemo(() => new Set(dimmedNodeIds ?? []), [dimmedNodeIds]);
  const traced = useMemo(() => new Set(pathNodeIds ?? []), [pathNodeIds]);
  const height = useMemo(() => graphHeight(tallestLane(topology)), [topology]);
  const selectedNode = useMemo(
    () => (selectedNodeId === undefined ? undefined : findNode(topology, selectedNodeId)),
    [topology, selectedNodeId],
  );

  const previewId = previewScenarioId ?? null;
  const canArmPreview = previewId !== null && onPreviewScenarioChange !== undefined;
  const isPreviewing = canArmPreview && armedPreviewId === previewId;
  const previewSwitchLabel =
    previewId === null
      ? DEPENDENCY_GRAPH_TEXT.previewLabel
      : `${DEPENDENCY_GRAPH_TEXT.previewLabel} ${previewId}`;

  const presentStates = useMemo(
    () => PIN_STATE_ORDER.filter((state) => statePresent(topology, state)),
    [topology],
  );

  const emphasisOf = (nodeId: string): NodeEmphasis => {
    if (selectedNodeId !== undefined && nodeId === selectedNodeId) {
      return 'selected';
    }

    if (traced.has(nodeId)) {
      return 'path';
    }

    return dimmed.has(nodeId) ? 'dimmed' : 'default';
  };

  /**
   * Reports a node's selection and opens the evidence the caller resolved for it.
   *
   * A node the mapper cannot resolve closes whatever drawer was open rather than leaving another
   * node's evidence on screen beside a newly selected node, which is the reading the map lens gives
   * the same gesture.
   */
  const activateNode = (node: TopologyNode): void => {
    onSelectNode(node.id);

    const reference = evidenceRefForNode(node);

    setOpenEvidenceRef(reference ?? null);
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

  /*
   * The emphasis controls act on the resolution of `selectedNodeId`, and a selection can outlive the
   * payload — a scope change narrows the network while the screen still holds the old id — so there
   * may be nothing to trace and nothing to dim. The four controls then state that together instead of
   * resting inert: `aria-disabled` plus the sentence in the same Tooltip the disabled preview switch
   * uses (rule P-8), and a handler that reports nothing, because a direction recorded against no path
   * would leave the caption describing a trace the drawing cannot make.
   */
  const emphasisDisabled = selectedNode === undefined;

  const handleEmphasisDirectionChange = (direction: GraphEmphasisDirection): void => {
    if (emphasisDisabled) {
      return;
    }

    onEmphasisDirectionChange(direction);
  };

  const handleDimmingChange = (): void => {
    if (emphasisDisabled) {
      return;
    }

    onDimmingChange(!dimming);
  };

  const directionControls = (
    <div
      className={CONTROL_GROUP_CLASSES}
      role="group"
      aria-label={DEPENDENCY_GRAPH_TEXT.emphasisDirectionLabel}
    >
      {GRAPH_EMPHASIS_DIRECTIONS.map((direction) => {
        const control = (
          <button
            key={direction}
            type="button"
            aria-pressed={emphasisDirection === direction}
            aria-disabled={emphasisDisabled ? true : undefined}
            className={EMPHASIS_DIRECTION_CLASSES}
            onClick={() => {
              handleEmphasisDirectionChange(direction);
            }}
          >
            {DEPENDENCY_GRAPH_TEXT.emphasisDirectionLabels[direction]}
          </button>
        );

        return emphasisDisabled ? (
          <Tooltip key={direction} label={DEPENDENCY_GRAPH_TEXT.emphasisUnavailable}>
            {control}
          </Tooltip>
        ) : (
          control
        );
      })}
    </div>
  );

  const dimmingSwitch = (
    <button
      type="button"
      role="switch"
      aria-checked={dimming}
      aria-disabled={emphasisDisabled ? true : undefined}
      className={DIMMING_SWITCH_CLASSES}
      onClick={handleDimmingChange}
    >
      <span>{DEPENDENCY_GRAPH_TEXT.dimmingLabel}</span>
    </button>
  );

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {directionControls}
        {emphasisDisabled ? (
          <Tooltip label={DEPENDENCY_GRAPH_TEXT.emphasisUnavailable}>{dimmingSwitch}</Tooltip>
        ) : (
          dimmingSwitch
        )}
        {onPreviewScenarioChange === undefined ? null : canArmPreview ? (
          previewSwitch
        ) : (
          <Tooltip label={DEPENDENCY_GRAPH_TEXT.previewUnavailable}>{previewSwitch}</Tooltip>
        )}
      </div>

      {/* The drawing's accessible name is the explicit label, the way the map lens and every chart in
          this application states its own (`src/components/map-canvas.tsx`): a name built from a
          document-scoped reference would depend on an id two instances of the lens could collide over.
          The `title` element stays as the drawing's own hover tooltip and is not what names it. */}
      <svg
        role="group"
        aria-label={title}
        viewBox={`0 0 ${GRAPH_WIDTH} ${height}`}
        className="block h-auto w-full"
      >
        <title>{title}</title>

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
          const opensEvidence = evidenceRefForNode(node) !== undefined;

          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={nodeAccessibleName(node, counts)}
              {...(opensEvidence ? { 'aria-haspopup': 'dialog' as const } : {})}
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
                className={[NODE_BOX_CLASSES[emphasis], CONTROL_RADIUS_CLASSES].join(' ')}
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

/**
 * The graph lens the rest of the application composes: the drawing above, memoised on its props.
 *
 * THE MEMO IS WHAT MAKES THE DERIVATIONS ABOVE WORTH ANYTHING. The canvas screen re-renders on every
 * node click, every lens switch and every wall-mode toggle, and unmemoised each of those rebuilt this
 * drawing — six lane guides, two paths and an arrowhead per lane, and a three-element box per node,
 * some six hundred elements — for props that had not changed. React compares the props shallowly, so a
 * render that changed none of them keeps the tree it already has.
 *
 * THE NAME A READER SEES IS STILL `DependencyGraph`. React takes a memoised component's name from the
 * function inside it, so the implementation above carries this component's own name rather than a
 * suffix, and devtools and React's own warnings say `DependencyGraph` rather than `Memo`.
 */
const DependencyGraphLens = memo(DependencyGraph);

export { DependencyGraphLens as DependencyGraph };

