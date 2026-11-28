/**
 * The graph lens of the FileMap canvas: the six-lane drawing of `src/components/dependency-graph.tsx`,
 * composed into the frame that carries its table view and its simulation label, with the emphasis the
 * shared selection and the reader's own choice of direction give it.
 *
 * WHERE THIS FILE SITS, AND WHY IT BELONGS TO THE SCREEN. AAP 0.14.1 fixes stage S2 as "the graph lens
 * (six lanes, dimming, upstream and downstream path, scenario preview switch)", and AAP 0.13.1 names
 * this path inside the canvas screen's folder. The drawing itself is
 * `src/components/dependency-graph.tsx`, which owns the hand-laid layout, the node marks, the emphasis
 * controls, the scenario preview switch and the disabled "Open part" control. This module is the lens
 * the screen composes around it: the frame AAP 0.5.2 requires of every chart, map and graph
 * (`src/components/chart-frame.tsx`), the rows that frame's table view renders, and the upstream and
 * downstream emphasis derived from the payload, the selection the two lenses share and the direction
 * and dimming the reader chooses here. One owner per job: the drawing draws, the frame frames, the
 * screen composes, and this file is the composition.
 *
 * THE PATH IS A WALK OF THE PAYLOAD'S OWN EDGES (rule P-6). `Topology.lanes` states every connection as
 * a `TopologyLane` whose `fromId` is the supplying node and whose `toId` is the node it feeds, so the
 * emphasis below is a transitive walk of that one relation: upstream is everything reachable by
 * following `toId` back to `fromId`, downstream everything reachable by following `fromId` on to
 * `toId`. No edge is inferred from a lane's position, a family's order, two nodes sharing a product or
 * two coordinates being close, because a fabricated edge would state a connection the records do not
 * hold — which is worse than stating none. The walk touches identifiers and structure only and produces
 * no displayed number; every count the table view prints is the payload's own pin tally.
 *
 * A STALE SELECTION EMPHASISES NOTHING. A scope change can narrow the network while the screen still
 * holds the id read against the previous one, so a selection the payload no longer holds resolves to no
 * selected node, and the lens then traces nothing and dims nothing rather than pushing a whole network
 * back around a node it cannot place. The drawing reaches the same conclusion the same way, by drawing
 * no emphasis and no selected-node strip.
 *
 * DIMMING IS THE COMPLEMENT OF THE PATH, AND A CHOICE THE READER MAKES. With a selected node in the
 * payload, every node on the path the chosen direction reaches — the selected node included, which the
 * drawing ranks above the path when it chooses how strongly to draw one — is emphasised, and every
 * other node of the payload is dimmed while the dimming switch is on. Turning that switch off keeps
 * the path and pushes nothing back, which is what lets a reader read the network at its resting
 * emphasis after choosing a route through it. With no resolvable selection both sets are empty, so the
 * lens draws the whole network at its resting emphasis. Nothing else dims and nothing else is
 * emphasised: this lens knows no product filter and no scope of its own, because both belong to the
 * screen and to the service read that already resolved them into the payload.
 *
 * THE DIRECTION AND THE DIMMING ARE THE READER'S; THE CONTROLS ARE THE DRAWING'S. AAP 0.12.4 and AAP
 * 0.14.1 name "dimming, upstream and downstream path" among the lens's features, so neither is decided
 * for the reader: this file holds both in state — the direction defaulting to `'both'` and the dimming
 * to on, so the lens opens on the whole path with everything off it dimmed — and the four
 * controls that report a change are rendered by `src/components/dependency-graph.tsx`, because AAP
 * 0.5.2 permits a native interactive element only inside the component that owns it. One walk of the
 * payload serves the drawing's emphasis and the table view's path column alike, so a direction chosen
 * here cannot be applied to one and not the other.
 *
 * THE SCENARIO PREVIEW SWITCH IS THE SCREEN'S, OR IT EXPLAINS ITSELF. The switch selects which supplied
 * series the drawing highlights and recomputes nothing here (rule P-6); the id it would preview can
 * only come from the screen, which is what holds the scenarios. It shares the drawing's controls row
 * with the four emphasis controls above, and the lens forwards it only when the screen supplies both
 * the id and the handler — a handler with no id would arm a switch that reports to nobody, which is
 * the dead control rule P-8 forbids. With no controllable id the switch is still rendered, disabled,
 * carrying the drawing's own reason ("No scenario is available to preview on this graph yet."), so a
 * reader never finds a missing control where a control belongs.
 *
 * THE TABLE VIEW AND THE LABEL ARE THE FRAME'S (success criterion 9, rule B-3, rule P-1). Every chart,
 * map and graph of this application reaches a screen inside `src/components/chart-frame.tsx`, which
 * owns the `<figure>`, the `<figcaption>`, the "View as table" control and the simulation label, so
 * this file renders none of those and hands the frame the rows it needs instead: one row per node,
 * with its lane, its label, its family, its pin summary and its place on the traced path, and one row
 * for every lane the drawing shows with no node in it — the Lines lane always, and any lane a narrowed
 * payload empties — carrying the drawing's own empty-lane sentence. The pin summaries are the payload's
 * own computed counts, which is why the frame carries the `Simulated calculation` member of
 * `SIM_LABELS` — the label is imported from the type surface and never written here, so it cannot
 * drift from specification 5.3.
 *
 * THE "OPEN PART" CONTROL IS NOT THIS FILE'S (rule P-8, AAP 0.12.4). `src/components/dependency-graph.tsx`
 * renders it once, disabled, carrying the exact stage string `Arrives in stage S4`; a copy here would
 * put two controls and two tooltips on one lens, so no control of that kind is added below. What this
 * file owes the requirement is the guarantee that the control is composed at all, and its suite checks
 * exactly that by focusing it in the rendered lens and reading the reason back from the accessibility
 * tree.
 *
 * KEYBOARD, COLOUR AND MOTION (rule B-3). The frame's toggle, the drawing's node focus stops and the
 * disabled control's focus pass-through all come from the components composed here, and nothing in this
 * file adds a focus stop or a motion: the lens animates nothing, so a reduced-motion session needs no
 * opt-out. Emphasis never rests on colour alone — the drawing moves the boundary and label weights, and
 * the table view states each node's path membership in words — so a reader who cannot see the drawing
 * reads the same distinction as text.
 *
 * WHAT IT DOES NOT DO. It reads no data (rule P-2): the topology arrives as a prop, nothing here calls
 * the service, imports a seed record or opens a request. It carries no competitor concept (rule P-5):
 * the first-party topology is all it draws and all it tabulates. It makes no claim about where a record
 * is held or whether it could be altered (rule P-4), fetches nothing (rule B-1) and reads no
 * configuration or secret (rule B-2). Every plant, supplier, material, origin and customer name it
 * prints is the payload's own (rule P-7), and no identifier, count, amount or date is written into this
 * file (rule P-6).
 */

import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { SIM_LABELS } from '../../types';
import type {
  PinCounts,
  PinState,
  SimLabel,
  Topology,
  TopologyNode,
  TopologyNodeKind,
} from '../../types';

import { ChartFrame } from '../../components/chart-frame';
import type { ChartTableSpec } from '../../components/chart-frame';
import type { TableColumn } from '../../components/data-table';
import {
  DEPENDENCY_GRAPH_LANES,
  DEPENDENCY_GRAPH_TEXT,
  DependencyGraph,
} from '../../components/dependency-graph';
import type { DependencyGraphLane } from '../../components/dependency-graph';
import type { GraphEmphasisDirection } from '../../components/dependency-graph';
import { NODE_FAMILY_WORDS, PIN_STATE_ORDER } from '../../components/graph-vocabulary';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * The phrase each emphasis direction is described with in the lens's caption.
 *
 * `'both'` keeps the exact wording the caption carried while the lens traced both directions on its
 * own, so the default reading is unchanged by the controls arriving; the two single directions name
 * the half the reader chose. The map is exhaustive over the union, so a direction added to
 * `GraphEmphasisDirection` without a phrase fails to compile here instead of printing a caption with
 * a hole in it.
 */
const EMPHASIS_PATH_WORDS = {
  both: 'upstream and downstream',
  upstream: 'upstream',
  downstream: 'downstream',
} as const satisfies Record<GraphEmphasisDirection, string>;

/**
 * Every sentence this module states, held here so the wording has one owner: the component renders
 * these strings and its suite names them through this object instead of retyping them.
 *
 * Only the last group is close to a fixed string. The pin vocabulary the table view prints for a node
 * — its count and its breakdown — is imported from `src/components/dependency-graph.tsx` rather than
 * restated here, so the drawing and its table view cannot describe one node's pins in two ways. Every
 * sentence below is this lens's own and none of them claims a security property for the workspace
 * (rule P-4). Nothing below carries a figure, an amount, a date or a record identifier (rule P-6): a
 * node's label, its family and its pin counts all arrive from the payload.
 */
export const GRAPH_LENS_TEXT = {
  /**
   * The lens's title. It is the frame's caption and the drawing's own accessible name, so the figure
   * and the graphic it contains are announced by the same words a reader sees above them.
   */
  title: 'Dependency graph',

  /**
   * What the lens shows while no node is selected, and what selecting one does. It names the two ends
   * of the six lanes so a reader knows what the columns run between without reading six headings.
   */
  description:
    'Six lanes from tier-2 origins to customers. Choose a node to trace its upstream and downstream path.',

  /**
   * What the lens shows once a node is selected: the emphasis it applied, stated in words.
   *
   * Rule B-3 requires the emphasis to be legible without the drawing's colours, and the reader chooses
   * both the direction and the dimming, so this sentence is built from the choice applied rather than
   * written for one of them: a reader who chose upstream is told upstream, and one who turned the
   * dimming off is told that nothing else is dimmed. The default choices yield the sentence the frame
   * states when nothing has been chosen, which is why the browser checks that quote it find the
   * sentence they were written against.
   */
  descriptionTracing: (
    nodeLabel: string,
    direction: GraphEmphasisDirection,
    dimming: boolean,
  ): string =>
    `Emphasis traces the ${EMPHASIS_PATH_WORDS[direction]} path of ${nodeLabel}; ${
      dimming ? 'every other node is dimmed.' : 'no other node is dimmed.'
    }`,

  /** The accessible name of the frame's table view, where every mark of the drawing is also text. */
  tableCaption: 'Dependency graph nodes by lane',

  /** The table view's column headings, in the order the columns appear. */
  columns: {
    lane: 'Lane',
    node: 'Node',
    family: 'Family',
    pins: 'Evidence pins',
    path: 'Path',
  },

  /**
   * The words the path column uses, so a node's place on the traced path is stated rather than
   * coloured. The last member covers a table with no selection at all, where no row is on a path
   * because no path has been asked for.
   */
  path: {
    selected: 'Selected node',
    upstream: 'Upstream',
    downstream: 'Downstream',
    both: 'Upstream and downstream',
    none: 'Not on the path',
    noSelection: 'No node selected',
  },

  /**
   * The words the table view uses for a lane the drawing shows and the payload places no node in.
   *
   * The drawing keeps every lane of `DEPENDENCY_GRAPH_LANES` on screen and states
   * `DEPENDENCY_GRAPH_TEXT.emptyLane` inside a lane the payload carries no node of — the Lines lane
   * always, because the topology holds no line record at all, and any other lane a narrowed payload
   * empties. The row's node cell prints that same sentence, so one lane is described in one way whether
   * it is read off the drawing or out of the table; the family cell states that no node family stands
   * behind the lane, and the path cell that there is no node to place on a traced path, because the two
   * columns cannot be left blank (rule B-3). The pin cell takes the drawing's own no-pins wording
   * instead, because the pin vocabulary belongs to the drawing and is imported rather than restated.
   */
  emptyLane: {
    family: 'No node family in this view',
    path: 'No node to trace',
  },
} as const;

/* ---------------------------------------------------------------------------------------------
 * The words a pin count is announced with — this lens's own wording, one per pinned state
 * ------------------------------------------------------------------------------------------- */

/**
 * The word each pin state is counted with in a summary.
 *
 * The order the six states are listed in, and the word each node family is printed with in the table
 * view, are shared with every other graph surface and live in `../../components/graph-vocabulary.ts`;
 * what stays here is this lens's own wording for the six states a count is read with.
 */
const PIN_STATE_WORDS = {
  empty: 'empty',
  pending: 'pending',
  pass: 'pass',
  fail: 'fail',
  stale: 'stale',
  review: 'review',
} as const satisfies Record<PinState, string>;

/**
 * The label the frame paints for the pin summaries it tabulates: the `Simulated calculation` member of
 * `SIM_LABELS`, indexed rather than retyped so the fixed string of specification 5.3 has one owner and
 * the rule P-1 vocabulary cannot drift from the type surface. Typed `SimLabel` so the frame's
 * first-party branch accepts it and no free text can take its place.
 */
const SIMULATED_CALCULATION: SimLabel = SIM_LABELS[1];

/**
 * The handler the drawing is given when the screen supplies no preview of its own.
 *
 * It is only ever paired with a `null` preview id, which is what disables the switch inside the
 * drawing and puts its reason in the tooltip, so nothing ever reaches this function: a disabled switch
 * cannot arm. A controllable id with no handler would arm the switch and report the activation to
 * nobody, so the two are decided together below (rule P-8). The empty body is the whole of the
 * behaviour it owes — `src/components/chart-frame.tsx` carries the same pattern in `IGNORE_SORT`, which
 * is unreachable for the same reason — and it is deliberately not a placeholder for work to come.
 */
const NO_PREVIEW_HANDLER = (): void => {};

/**
 * The mapper the drawing is given when the screen names no evidence for its nodes.
 *
 * `undefined` is the drawing's honest answer for a node no record stands behind: activating the node
 * still reports the selection and opens no dialog, so a reader is never shown a refusal where a record
 * belongs. Which record a node was drawn from is the screen's to state — a plant, a supplier, an origin
 * and a customer each carry their record's own identifier, and the evidence read resolves those
 * families — so this module derives no reference of its own (rule P-6) and invents none.
 */
const NO_NODE_EVIDENCE = (): undefined => undefined;

/** The empty membership set a payload with no resolvable selection is traced from. */
const NO_MEMBERSHIP: ReadonlySet<string> = new Set<string>();

/**
 * The dimmed set the drawing is handed while the dimming switch is turned off.
 *
 * One module-level array rather than a fresh `[]` per render: the drawing is memoised on the identity
 * of the props it is given, and an empty list built inside the render would be a new identity on every
 * pass, rebuilding the whole drawing for a value that never changed.
 */
const NO_DIMMED_NODES: readonly string[] = [];

/**
 * The direction the lens opens on: both halves of the path, upstream and downstream of the node.
 *
 * It is a named constant rather than an argument to `useState` for the reason the drawing holds its
 * wording in one object: the default a reader starts from is stated once, so a suite asserting it and
 * the state it initialises cannot come to disagree.
 */
const DEFAULT_EMPHASIS_DIRECTION: GraphEmphasisDirection = 'both';

/** Dimming on by default: the lens opens with everything off the path dimmed. */
const DEFAULT_DIMMING = true;

/* ---------------------------------------------------------------------------------------------
 * The pin summary — the payload's own counts, printed as text
 * ------------------------------------------------------------------------------------------- */

/** The number of pins a node carries, across every state. */
function totalPins(counts: PinCounts): number {
  return PIN_STATE_ORDER.reduce((total, state) => total + counts[state], 0);
}

/**
 * The whole of a node's pin summary, as the table view prints it.
 *
 * A node the payload's pin map does not hold, and a node whose counts are all zero, both read as "no
 * evidence pins": the map documents that a node absent from it has no pins, so the two cases mean the
 * same thing to a reader and are said the same way. The noun, its singular and the separator come from
 * the drawing's own vocabulary, so one node is described in one way whether it is read off the drawing
 * or out of the table.
 */
function pinSummary(counts: PinCounts | undefined): string {
  if (counts === undefined) {
    return DEPENDENCY_GRAPH_TEXT.noPins;
  }

  const breakdown = PIN_STATE_ORDER.filter((state) => counts[state] > 0)
    .map((state) => `${counts[state]} ${PIN_STATE_WORDS[state]}`)
    .join(', ');

  if (breakdown === '') {
    return DEPENDENCY_GRAPH_TEXT.noPins;
  }

  const total = totalPins(counts);
  const noun = total === 1 ? DEPENDENCY_GRAPH_TEXT.pinNounSingular : DEPENDENCY_GRAPH_TEXT.pinNoun;

  return `${total} ${noun}${DEPENDENCY_GRAPH_TEXT.pinBreakdownSeparator} ${breakdown}`;
}

/* ---------------------------------------------------------------------------------------------
 * The lanes and the path — a pure walk of the payload's own structure
 * ------------------------------------------------------------------------------------------- */

/**
 * The nodes of one family, in the order the payload holds them.
 *
 * The `switch` is exhaustive over `TopologyNodeKind` and carries no `default` arm, so a family added to
 * that union fails to compile here instead of producing a lane of the table view that silently lost its
 * nodes.
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

/** One lane of the drawing, with the nodes this payload places in it. */
interface LaneGroup {
  /** The lane's heading, which is also the value the table view prints in its lane column. */
  readonly label: string;

  /** The nodes the payload places in the lane, in its own order. */
  readonly nodes: readonly TopologyNode[];
}

/**
 * Every lane of the drawing with its nodes, in the order the lanes run.
 *
 * The lanes come from `DEPENDENCY_GRAPH_LANES` rather than from a second list written here, so the
 * drawing's columns and this lens's table view cannot disagree about how many lanes there are or what
 * they are called. A lane the payload carries no node family for — the one stage whose records belong to
 * the stage that opens it — is skipped here, because this list answers what the drawing lays out and what
 * the traced path walks; the table view states such a lane from `DEPENDENCY_GRAPH_LANES` itself, in
 * {@link buildRows}, so the lane the drawing fills with its empty-lane sentence also takes a row.
 */
function laneGroups(topology: Topology): readonly LaneGroup[] {
  const groups: LaneGroup[] = [];

  for (const lane of DEPENDENCY_GRAPH_LANES) {
    if (lane.kind === null) {
      continue;
    }

    groups.push({ label: lane.label, nodes: nodesOfFamily(topology, lane.kind) });
  }

  return groups;
}

/** Every node of the payload, in lane order and then in the payload's own order within its lane. */
function nodesInLaneOrder(topology: Topology): readonly TopologyNode[] {
  return laneGroups(topology).flatMap((group) => group.nodes);
}

/**
 * The edges out of each node, built in the order the payload states its lanes.
 *
 * `TopologyLane` is ordered upstream to downstream, so the downstream map reads a lane forwards and the
 * upstream map reads the same lane backwards; both are one pass over one list, which is why the two
 * directions cannot drift from each other or from the drawing's own edges.
 */
function edgeMap(
  topology: Topology,
  direction: 'downstream' | 'upstream',
): ReadonlyMap<string, readonly string[]> {
  const edges = new Map<string, string[]>();

  for (const lane of topology.lanes) {
    const from = direction === 'downstream' ? lane.fromId : lane.toId;
    const to = direction === 'downstream' ? lane.toId : lane.fromId;
    const existing = edges.get(from);

    if (existing === undefined) {
      edges.set(from, [to]);
      continue;
    }

    existing.push(to);
  }

  return edges;
}

/**
 * Every node reachable from `startId` by following one direction of the payload's lanes.
 *
 * The walk is a work list over the edge map, so a cycle in the records — which the seed does not hold
 * and this function does not assume away — terminates on the visited set rather than looping. The
 * result holds identifiers only and in no particular order, which keeps this function independent of
 * the lane layout: the caller decides the order they are read in.
 */
function reachable(
  startId: string,
  edges: ReadonlyMap<string, readonly string[]>,
): ReadonlySet<string> {
  const reached = new Set<string>();
  const pending: string[] = [...(edges.get(startId) ?? [])];
  let next = pending.pop();

  while (next !== undefined) {
    if (!reached.has(next)) {
      reached.add(next);
      pending.push(...(edges.get(next) ?? []));
    }

    next = pending.pop();
  }

  return reached;
}

/** What one selection emphasises on the drawing, and what it pushes back. */
export interface GraphLensTrace {
  /** The selected node, or `undefined` when the payload holds no node with that identifier. */
  readonly selectedNode: TopologyNode | undefined;

  /**
   * The nodes upstream of the selection, following the payload's lanes back to their sources.
   *
   * Empty when the reader chose the downstream direction: nothing upstream was walked, so nothing
   * upstream is emphasised, and the table view then reads every one of those nodes as off the path.
   */
  readonly upstream: ReadonlySet<string>;

  /**
   * The nodes downstream of the selection, following the payload's lanes on to their ends.
   *
   * Empty when the reader chose the upstream direction, for the same reason as {@link upstream}.
   */
  readonly downstream: ReadonlySet<string>;

  /** The selected node together with the nodes the chosen direction reached, in lane order. */
  readonly pathNodeIds: readonly string[];

  /** Every other node of the payload, in lane order: what the drawing pushes back. */
  readonly dimmedNodeIds: readonly string[];
}

/**
 * Traces the selected node's path through the payload's own lanes, in the direction it was asked for.
 *
 * The selection is resolved first, because a selection the payload no longer holds must emphasise
 * nothing at all: without that check the walk would report a path of no nodes and dim a whole network
 * around a node the reader cannot see. With the selection resolved, only the directions `direction`
 * names are walked — `'upstream'` leaves the downstream set as the module's empty-membership constant
 * rather than walking it and discarding the result, so a node downstream of the selection is no more
 * on the path than one the payload does not hold — the path is the selection plus everything reached,
 * and the dimmed set is every other node of the payload.
 *
 * Both lists are emitted in lane order, so the drawing's emphasis and the table view's path column are
 * two readings of one computation rather than two computations, and a direction the reader chose
 * cannot be applied to the drawing while the table still reports the whole path. `'both'` walks both
 * directions, which is the default the lens opens on.
 *
 * @param topology The payload the drawing shows, exactly as the service returned it.
 * @param selectedNodeId The identifier the screen holds as selected, or `null` for none.
 * @param direction Which half of the path to walk, defaulting to both, so a caller that offers no
 *   choice traces the whole path.
 * @returns The traced path, the dimmed complement, and the node the trace started from.
 */
export function traceGraphPath(
  topology: Topology,
  selectedNodeId: string | null,
  direction: GraphEmphasisDirection = 'both',
): GraphLensTrace {
  const nodes = nodesInLaneOrder(topology);
  const selectedNode =
    selectedNodeId === null ? undefined : nodes.find((node) => node.id === selectedNodeId);

  if (selectedNode === undefined) {
    return {
      selectedNode: undefined,
      upstream: NO_MEMBERSHIP,
      downstream: NO_MEMBERSHIP,
      pathNodeIds: [],
      dimmedNodeIds: [],
    };
  }

  const downstream =
    direction === 'upstream'
      ? NO_MEMBERSHIP
      : reachable(selectedNode.id, edgeMap(topology, 'downstream'));
  const upstream =
    direction === 'downstream'
      ? NO_MEMBERSHIP
      : reachable(selectedNode.id, edgeMap(topology, 'upstream'));

  const onPath = (nodeId: string): boolean =>
    nodeId === selectedNode.id || upstream.has(nodeId) || downstream.has(nodeId);

  return {
    selectedNode,
    upstream,
    downstream,
    pathNodeIds: nodes.filter((node) => onPath(node.id)).map((node) => node.id),
    dimmedNodeIds: nodes.filter((node) => !onPath(node.id)).map((node) => node.id),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The table view's rows — every mark of the drawing, as text
 * ------------------------------------------------------------------------------------------- */

/**
 * One row of the lens's table view: everything the drawing states about one mark, as text.
 *
 * A row states either a node of the payload or a lane the drawing shows without one, which is why its key
 * is a row key rather than the node's identifier: a lane's row takes the lane's identifier, so a lane and
 * a node can never collide and a re-render never remounts a row. The row holds no computed figure of its
 * own (rule P-6): the lane, the label, the family and the pin counts are the payload's, and the path word
 * is the trace above in words. What the row adds is the one thing the drawing cannot say to a reader who
 * cannot see it — the emphasis, stated (rule B-3).
 */
export interface GraphLensRow {
  /** The stable key of the row: the node's own identifier, or the lane identifier of an empty lane. */
  readonly rowKey: string;

  /** The lane heading the row sits under, as the drawing prints it. */
  readonly lane: string;

  /** The node's name as the payload spells it (rule P-7), or the sentence an empty lane is stated with. */
  readonly label: string;

  /** The node's family, in the word the drawing's accessible name uses for it, or why a lane has none. */
  readonly family: string;

  /**
   * The node's evidence pins, counted by state from the payload's own tally, or the drawing's own no-pins
   * wording for a lane that holds no node.
   */
  readonly pins: string;

  /**
   * Where the node lies relative to the selection — on the traced path or off it — or the word a lane with
   * no node prints in the same column.
   */
  readonly path: string;
}

/**
 * The word the path column prints for one node.
 *
 * A node can be both upstream and downstream of the selection when the records hold a route through it,
 * which is why the two memberships are combined rather than ordered: reporting only the first would
 * state half of what the walk found. With no selection at all the column says so, so a column of
 * "Not on the path" is never read as a path that searched and found nothing.
 */
function pathWordFor(nodeId: string, trace: GraphLensTrace): string {
  if (trace.selectedNode === undefined) {
    return GRAPH_LENS_TEXT.path.noSelection;
  }

  if (trace.selectedNode.id === nodeId) {
    return GRAPH_LENS_TEXT.path.selected;
  }

  const isUpstream = trace.upstream.has(nodeId);
  const isDownstream = trace.downstream.has(nodeId);

  if (isUpstream && isDownstream) {
    return GRAPH_LENS_TEXT.path.both;
  }

  if (isUpstream) {
    return GRAPH_LENS_TEXT.path.upstream;
  }

  return isDownstream ? GRAPH_LENS_TEXT.path.downstream : GRAPH_LENS_TEXT.path.none;
}

/**
 * One lane the drawing shows without a node, as a row of the table view.
 *
 * The drawing keeps every lane of `DEPENDENCY_GRAPH_LANES` on screen and states
 * {@link DEPENDENCY_GRAPH_TEXT.emptyLane} inside a lane the payload carries no node of: the Lines lane
 * always, because the topology holds no line record at all, and any other lane a narrowed payload
 * empties. The table states that lane with the drawing's own sentence, so a reader who cannot see the
 * drawing learns the lane exists and holds nothing, instead of counting the lanes and finding one
 * missing (success criterion 9). Its pin cell takes the drawing's own no-pins wording, because the pin
 * vocabulary is the drawing's and is imported rather than restated here.
 *
 * @param lane The lane the drawing shows without a node.
 * @returns The row.
 */
function emptyLaneRowOf(lane: DependencyGraphLane): GraphLensRow {
  return {
    rowKey: `lane:${lane.id}`,
    lane: lane.label,
    label: DEPENDENCY_GRAPH_TEXT.emptyLane,
    family: GRAPH_LENS_TEXT.emptyLane.family,
    pins: DEPENDENCY_GRAPH_TEXT.noPins,
    path: GRAPH_LENS_TEXT.emptyLane.path,
  };
}

/**
 * Every row of the table view: one per node, in lane order and then in the payload's own order, and one
 * for every lane the drawing shows with no node in it.
 *
 * The walk is over `DEPENDENCY_GRAPH_LANES` rather than over `laneGroups`, because the table owes a row
 * to a lane the drawing shows even where that lane holds no node — `laneGroups` answers the drawing's own
 * question, which lanes carry nodes to draw, and it is left untouched so the drawing's layout and the
 * traced path stay exactly what they were. The lane order, the lane headings and the sentence an empty
 * lane prints all come from the drawing, so the two representations of the payload cannot disagree about
 * how many lanes there are, what they are called or which of them holds nothing.
 *
 * @param topology The payload the drawing draws and the table prints.
 * @param trace The path the selection traced, which each node's path cell states in words.
 * @returns One row per node, and one row per lane the drawing shows empty.
 */
function buildRows(topology: Topology, trace: GraphLensTrace): readonly GraphLensRow[] {
  const rows: GraphLensRow[] = [];

  for (const lane of DEPENDENCY_GRAPH_LANES) {
    const nodes = lane.kind === null ? [] : nodesOfFamily(topology, lane.kind);

    if (nodes.length === 0) {
      rows.push(emptyLaneRowOf(lane));
      continue;
    }

    for (const node of nodes) {
      rows.push({
        rowKey: node.id,
        lane: lane.label,
        label: node.label,
        family: NODE_FAMILY_WORDS[node.kind],
        pins: pinSummary(topology.pinsByNode[node.id]),
        path: pathWordFor(node.id, trace),
      });
    }
  }

  return rows;
}

/**
 * The table view's columns, in the order a reader follows the network: upstream on the start side.
 *
 * None of them is `sortable`. The frame offers ordering only when the caller supplies a handler, and
 * the order that matters here is the network's own lane order, which an alphabetical reordering would
 * destroy; a sort control that reported to nobody would be the dead control rule P-8 forbids, so none
 * is offered.
 */
const COLUMNS: readonly TableColumn<GraphLensRow>[] = [
  { id: 'lane', header: GRAPH_LENS_TEXT.columns.lane, render: (row) => row.lane },
  { id: 'node', header: GRAPH_LENS_TEXT.columns.node, render: (row) => row.label },
  { id: 'family', header: GRAPH_LENS_TEXT.columns.family, render: (row) => row.family },
  { id: 'pins', header: GRAPH_LENS_TEXT.columns.pins, render: (row) => row.pins },
  { id: 'path', header: GRAPH_LENS_TEXT.columns.path, render: (row) => row.path },
];

/**
 * The stable row key of the table view: a node's own identifier, or the lane identifier of a lane the
 * drawing shows empty, so a re-render never remounts a row.
 *
 * @param row The row to key.
 * @returns Its key.
 */
function rowKeyOf(row: GraphLensRow): string {
  return row.rowKey;
}

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * Props of {@link GraphLens}.
 *
 * The first three are the lens's contract with the canvas screen and are the same pair the map lens
 * takes (`src/components/map-canvas.tsx`), so one selection drives both lenses and neither lens owns
 * it. The rest are optional: the scenario preview belongs to the screen when the screen has one to
 * offer, and the evidence mapper belongs to the screen because only the screen knows which record it
 * drew for a node.
 *
 * The emphasis direction and the dimming are absent on purpose. AAP 0.12.4 and AAP 0.14.1 make both a
 * choice the reader drives, and choosing how to read this figure is a preference about the lens rather
 * than something the screen's own state has to carry: holding it here is what keeps one owner for it,
 * so no caller can hand the lens a direction and a traced path that disagree.
 */
export interface GraphLensProps {
  /**
   * The network to draw and to tabulate, exactly as the service's topology read returned it.
   *
   * Required, and the whole of this lens's data (rule P-2): nothing below reads a seed record, calls
   * the service or opens a request, so the screen decides what the lens can show by what it passes.
   */
  readonly topology: Topology;

  /**
   * The node the screen holds as selected, shared with the map lens, or `null` for none.
   *
   * Optional and nullable because a canvas may open with nothing selected, and because the screen's
   * own value may be `null` between two reads. A selection the payload no longer holds emphasises
   * nothing rather than failing, which is what lets a scope change narrow the network under it.
   */
  readonly selectedNodeId?: string | null | undefined;

  /**
   * Reports the node a reader activated — by click, by `Enter` or by `Space`.
   *
   * Required, because a lens whose nodes could be focused but not chosen would be a surface of dead
   * controls (rule P-8). This component stores nothing it receives: the screen owns the value and
   * passes it back down, so the two lenses move together.
   */
  readonly onSelectNode: (nodeId: string) => void;

  /**
   * The scenario the preview switch would highlight, when the screen has one for this exception.
   *
   * The id can only come from the screen, which is what holds the scenarios the solver produced; this
   * lens computes no measure and shows no second figure for it (rule P-6).
   */
  readonly previewScenarioId?: string | null | undefined;

  /**
   * Receives the preview request the switch reports.
   *
   * The switch is forwarded only when this handler and {@link GraphLensProps.previewScenarioId} are
   * both supplied. A handler without an id would arm a switch whose request nobody answers, which is
   * the control rule P-8 forbids; with no controllable id the switch is still rendered, disabled, and
   * carrying the drawing's own reason, so the reader is told why rather than shown nothing.
   */
  readonly onPreviewScenarioChange?: ((scenarioId: string | null) => void) | undefined;

  /**
   * Resolves the evidence reference a node opens, or `undefined` for a node no record stands behind.
   *
   * FORWARDED, NOT DERIVED (rule P-6). The topology payload carries a node's pin *counts*, so a
   * reference the service's evidence read would resolve cannot be built here without inventing an
   * identifier, and the screen is what knows which record it drew for a node. The screen of the FileMap
   * canvas answers each node's own identifier, which the evidence read resolves for the plant, supplier,
   * origin and customer families. When no mapper is supplied the drawing is given the honest answer for
   * every node — no record stands behind it — so activating a node still reports the selection and opens
   * no dialog, and a reader is never shown a refusal where a record belongs.
   */
  readonly evidenceRefForNode?: ((node: TopologyNode) => string | undefined) | undefined;
}

/**
 * The graph lens: the canvas's network in six lanes, composed into the frame that carries its table
 * view and its simulation label, with the path the reader's chosen direction traces emphasised.
 *
 * The lens is a composition, not a drawing: `src/components/dependency-graph.tsx` lays out and draws
 * the network and owns the emphasis controls, the scenario preview switch and the disabled "Open part"
 * control, and `src/components/chart-frame.tsx` owns the `<figure>`, the `<figcaption>`, the "View as
 * table" control and the simulation label. What this module decides is the emphasis — which nodes the
 * selection traces in that direction, which it dims, and what the caption states about both — and what
 * the table view says about each of them.
 *
 * Nothing here decides the data it shows: the payload is a prop, the selection is the screen's, and
 * no effect runs, no clock or random source is read, so two renders of one payload and one choice draw
 * the same picture (rule P-6). What it does hold is the reader's reading of that payload — the emphasis
 * direction and whether nodes off the path are dimmed — because those are preferences about the lens
 * rather than anything the records state, and handing them to the screen would put a second owner on a
 * choice that changes nothing outside this figure.
 *
 * The two derivations it hands the drawing — the trace and the frame's rows — are memoised on the
 * props they read, so the memoised drawing is rebuilt when the payload, the selection or the reader's
 * emphasis changes and kept as it stands otherwise.
 *
 * @param props The topology, the shared selection and the optional preview and evidence contracts. See
 *   {@link GraphLensProps}.
 * @returns The lens, ready to be composed inside the canvas screen's lens area.
 */
export function GraphLens({
  topology,
  selectedNodeId,
  onSelectNode,
  previewScenarioId,
  onPreviewScenarioChange,
  evidenceRefForNode,
}: GraphLensProps): ReactElement {
  const [emphasisDirection, setEmphasisDirection] = useState<GraphEmphasisDirection>(
    DEFAULT_EMPHASIS_DIRECTION,
  );
  const [dimming, setDimming] = useState(DEFAULT_DIMMING);

  /*
   * THE TRACE AND THE FRAME'S ROWS ARE MEMOISED ON THE PROPS THEY READ, BECAUSE THE DRAWING IS
   * MEMOISED IN TURN. `src/components/dependency-graph.tsx` compares the props it is handed, so a
   * fresh path array or a fresh row list built here on every render would hand it a new identity for a
   * value that had not changed — and it would rebuild a drawing of some six hundred elements for
   * nothing. Memoised, the drawing is rebuilt when the payload, the selection or the reader's emphasis
   * changes and kept otherwise.
   */
  const trace = useMemo(
    () => traceGraphPath(topology, selectedNodeId ?? null, emphasisDirection),
    [topology, selectedNodeId, emphasisDirection],
  );
  const previewId = previewScenarioId ?? null;
  const forwardsPreview = previewId !== null && onPreviewScenarioChange !== undefined;

  const tableRows = useMemo<ChartTableSpec<GraphLensRow>>(
    () => ({
      caption: GRAPH_LENS_TEXT.tableCaption,
      columns: COLUMNS,
      rows: buildRows(topology, trace),
      getRowKey: rowKeyOf,
    }),
    [topology, trace],
  );

  const descriptionText =
    trace.selectedNode === undefined
      ? GRAPH_LENS_TEXT.description
      : GRAPH_LENS_TEXT.descriptionTracing(trace.selectedNode.label, emphasisDirection, dimming);

  return (
    <ChartFrame<GraphLensRow>
      title={GRAPH_LENS_TEXT.title}
      description={descriptionText}
      simLabel={SIMULATED_CALCULATION}
      tableRows={tableRows}
    >
      <DependencyGraph
        topology={topology}
        title={GRAPH_LENS_TEXT.title}
        selectedNodeId={selectedNodeId ?? undefined}
        onSelectNode={onSelectNode}
        dimmedNodeIds={dimming ? trace.dimmedNodeIds : NO_DIMMED_NODES}
        pathNodeIds={trace.pathNodeIds}
        emphasisDirection={emphasisDirection}
        onEmphasisDirectionChange={setEmphasisDirection}
        dimming={dimming}
        onDimmingChange={setDimming}
        previewScenarioId={forwardsPreview ? previewId : null}
        onPreviewScenarioChange={onPreviewScenarioChange ?? NO_PREVIEW_HANDLER}
        evidenceRefForNode={evidenceRefForNode ?? NO_NODE_EVIDENCE}
      />
    </ChartFrame>
  );
}

