/**
 * The map lens of the FileMap canvas (SCR-12, stage S2): the client's network drawn over the bundled
 * world boundaries, framed so a reader can take the same nodes as a table.
 *
 * WHAT THIS MODULE IS AND IS NOT. `src/components/map-canvas.tsx` is the drawing — the projection,
 * the country shapes, the five node families, their evidence-pin badges, the S3 competitor overlay and
 * the chokepoint halos — and that drawing deliberately carries neither a table view nor a frame. This
 * lens is the composition the screen mounts: it puts `MapCanvas` inside `src/components/chart-frame.tsx`
 * and supplies the rows the frame's table view prints, which is what makes the "View as table" control
 * of AAP 0.14.1 S2 ("'View as table' on both lenses") a property of the lens rather than a habit of the
 * screen. The lens therefore renders no `<figure>`, no `<figcaption>`, no toggle and no `<table>` of its
 * own: those belong to the frame, and a second copy here would be a second control competing with the
 * first (rule P-8).
 *
 * THE SELECTION IS THE SCREEN'S, THE VIEW IS THE LENS'S. `selectedNodeId` and `onSelectNode` arrive as
 * props and leave as props, unchanged, so AAP 0.12.4's "selection carries across lenses" is structural:
 * the graph lens beside this map receives the same pair from the same screen, and neither lens holds a
 * selection of its own that could disagree with the other. What this module does hold is the map's view
 * state — the zoom level and the view preset — because they are presentation, they belong to the surface
 * being framed, and no second surface reads them. `MapCanvas` owns the controls that change them
 * (its zoom in, zoom out and five preset buttons) and this module only holds their current values and
 * hands down the change handlers, so the controls stay in one place and the state in one place.
 *
 * THE ATLAS PAYLOAD IS FORWARDED, NEVER INSPECTED (rule P-5). When the screen holds an atlas payload the
 * lens passes it to `MapCanvas` unchanged, and the drawing paints the competitors' networks, the shared
 * crossings and their legend — each of which already carries the fixed market-intelligence label from
 * `src/types`. This module spells neither that string nor any competitor name, sums no competitor value
 * with a first-party one, and adds no competitor row to the table view: a market-intelligence figure
 * beside a first-party figure in one table would invite exactly the blended reading rule P-5 forbids, so
 * the table view is the client's own nodes and the overlay's provenance is stated by the drawing's own
 * legend. An absent payload is not an error: the lens then draws the first-party network alone, and a
 * role the atlas read refuses (AAP 0.12.4 SCR-13, USR-08) sees the same lens instead of a failure this
 * component would have had to invent. What the lens cannot know is WHY a payload is absent — the scope
 * may hold no pack, or the read may have been refused — so the caller's `atlasNotice` carries that
 * reason and the lens prints it in its own caption; supplying none leaves the caption exactly as it
 * was, so a screen with nothing to explain explains nothing.
 *
 * NO FIGURE IS COMPUTED HERE (rule P-6). The table view prints the payload's own node labels, the
 * payload's own pin counts per state and the labels of the nodes its own lanes join; the only thing this
 * module derives is text from those values, with no arithmetic beyond reading a count the payload
 * carries, no currency, no identifier literal and no record value of its own. The frame's simulation
 * label is imported by position from `SIM_LABELS` (rule P-1) rather than written, because the pin totals
 * in the badges are computed from the records and a page-level badge does not label an individual figure.
 *
 * A NODE'S EVIDENCE REFERENCE IS FORWARDED, NEVER INVENTED. `MapCanvasProps.evidenceRefForNode` is
 * required by the drawing, because a mark a reader cannot inspect would leave AAP 0.2.1 F12's "any
 * figure, chart mark, node, arc or pin" half-served, and only the caller knows which record it drew.
 * The screen, not this lens, holds those records (rule P-2: no data access here), so the mapper
 * arrives as an optional prop and is forwarded when the screen supplies one. Without it the lens
 * forwards a resolver that answers `undefined` for every node, which the drawing documents as an
 * honest answer — no record stands behind this node — and which opens no dialog rather than a drawer
 * for a record it was never given. A node is named by its own identifier, so a mapper the screen
 * supplies composes no reference of its own (rule P-6).
 *
 * A node's plant is not in the payload. `TopologyNode` of `src/types/topology.ts` carries an
 * identifier, a family, a label, a latitude, a longitude and its product reach, and no plant or lane
 * member, so the table's lane column cannot read a node's plant. It reads what the payload does
 * state: the labels of the nodes the payload's own lanes join this one to, in the order the lanes are
 * stated. A node no lane touches prints that it stands alone rather than a blank cell (rule B-3:
 * every cell says something).
 *
 * Rules this module is built to satisfy:
 * - B-1: it names no address and asks no origin for anything. The map's only geographic source is the
 *   bundled boundary module `src/components/map-canvas.tsx` imports; this file imports no such file, and
 *   it holds no `fetch`, no tile template and no remote image.
 * - B-2: it reads no configuration and holds no credential-shaped literal.
 * - B-3: the table view is supplied through `ChartFrame` and cannot be omitted, the table carries the
 *   same nodes the map draws, the nodes stay keyboard operable inside the drawing, and this module adds no
 *   animation, so a reduced-motion session needs no opt-out here.
 * - P-1: the frame's label is `SIM_LABELS[1]`, imported rather than written.
 * - P-2: no service call, no seed import, no adapter import. The topology and the atlas are props.
 * - P-5: the atlas payload is forwarded unchanged; no competitor value enters the table view.
 * - P-6: every value on screen comes from the payload; nothing is typed in and nothing is computed.
 * - P-7: the lens authors no company, product or place name; every label is a payload record's own.
 * - P-8: the lens renders no control of its own, so it can render none that does nothing.
 *
 * Implements AAP 0.13.1 and 0.15.1 (`src/features/scr-12-filemap-canvas/map-lens.tsx`), AAP 0.12.4's
 * SCR-12 row for the map lens, and AAP 0.14.1's S2 scope for the shared selection and the table view.
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';

import { SIM_LABELS } from '../../types';
import type {
  Atlas,
  PinCounts,
  SimLabel,
  Topology,
  TopologyNode,
  TopologyNodeKind,
} from '../../types';

import { ChartFrame } from '../../components/chart-frame';
import type { TableColumn } from '../../components/data-table';
import { NODE_FAMILY_WORDS, PIN_STATE_ORDER } from '../../components/graph-vocabulary';
import { MAP_CANVAS_TEXT, MapCanvas } from '../../components/map-canvas';
import type { MapViewPreset, MapZoomLevel } from '../../components/map-canvas';

/* ---------------------------------------------------------------------------------------------
 * The lens's own words — the one place its authored strings are written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every caption, column header and sentence this lens states.
 *
 * None of these is a fixed specification string: the seven §5.3 simulation labels belong to the elements
 * that carry them and are imported (rule P-1), while a node's label, its family, its neighbours and its
 * pin counts all arrive in the payload (rule P-6, P-7). The pin column's header and the "no pins"
 * sentence are taken from `MapCanvas`'s own text object instead of being repeated here, so a reader meets
 * one wording for evidence pins wherever the lens shows them.
 */
export const MAP_LENS_TEXT = {
  /** The lens caption, which titles the frame and names the drawing inside it. */
  title: 'Network map',
  /** The one-line summary under the caption, stating what the drawing and its table both show. */
  description:
    'The client network on the bundled world boundaries, with each node’s evidence pins and the lanes joining the nodes.',
  /** The table view's accessible name: its `<caption>`, and the name no table may go without. */
  tableCaption: 'FileMap canvas nodes, with family, connected nodes and evidence pins',
  /** The column printing the node's own label, as the payload states it. */
  nodeColumn: 'Node',
  /** The column printing which of the five families the node belongs to. */
  familyColumn: 'Family',
  /** The column printing the labels of the nodes the payload's lanes join this one to. */
  connectionsColumn: 'Connected to',
  /** What a node the payload's lanes do not reach prints, instead of an empty cell. */
  noConnections: 'No lane joins this node',
} as const;

/**
 * The simulation label of a computed figure, taken by position from the fixed label list in `src/types`, so
 * the exact §5.3 string has one owner and is never spelled in this module (rule P-1).
 *
 * `Simulated calculation` is the label the pin badges require: a count is a computed figure, and the
 * page's own badge does not stand in for the label of an individual surface.
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/* ---------------------------------------------------------------------------------------------
 * The view's starting point — presentation constants, not figures
 * ------------------------------------------------------------------------------------------- */

/**
 * The zoom level the lens opens at: the widest of the three the drawing offers, so a reader sees the
 * whole network before they narrow it. A control then steps to the levels `MapCanvas` offers.
 */
const DEFAULT_ZOOM_LEVEL: MapZoomLevel = 1;

/**
 * The view preset the lens opens at: the world, for the same reason the zoom opens at its widest. The
 * other four frame one region each and are chosen from the drawing's own preset controls.
 */
const DEFAULT_VIEW_PRESET: MapViewPreset = 'world';

/* ---------------------------------------------------------------------------------------------
 * The table view's rows — the payload's own nodes, read as they arrive
 * --------------------------------------------------------------------------------------------- */

/**
 * One node's row in the table view: the payload's values for that node, and nothing derived beyond the
 * text of its two summary cells.
 *
 * `nodeId` is the row's stable key and the same identifier the drawing's nodes and the screen's selection
 * use, so a re-render keeps every row where it is and a reader who compares the table with the drawing is
 * reading the same node in both.
 */
interface MapLensRow {
  /** The node's identifier, as the payload states it: the row key and the selection's key. */
  readonly nodeId: string;

  /** The node's label, as the payload states it. */
  readonly label: string;

  /** Which of the five families the node belongs to. */
  readonly kind: TopologyNodeKind;

  /** The labels of the nodes the payload's lanes join this one to, or the standalone sentence. */
  readonly connections: string;

  /** The node's evidence-pin counts per state, or the sentence for a node with none. */
  readonly pins: string;
}

/**
 * The five families in the order the table lists them: the plants the network serves, then the suppliers
 * that feed them, the materials those suppliers sell, the tier-2 origins behind those suppliers, and the
 * customers the plants ship to.
 *
 * Materials sit beside the suppliers they are bought from, so the rows read the network from the plants
 * it serves back towards the places behind them and a material is met where it is bought rather than
 * after the origins that supply it. The order is fixed here rather than taken from the record set, so
 * two topologies and two renders list the same families in the same sequence and a reader can compare
 * two tables row band by row band.
 *
 * @param topology The payload to read.
 * @returns The nodes of every family, in family order.
 */
function nodesInFamilyOrder(topology: Topology): readonly TopologyNode[] {
  return [
    ...topology.plants,
    ...topology.suppliers,
    ...topology.materials,
    ...topology.origins,
    ...topology.customers,
  ];
}

/**
 * The label of every node in the payload, keyed by identifier, so a lane's endpoints can be printed by
 * name and a lane whose endpoint the payload does not hold can be left out rather than printed as an
 * identifier the table has no row for.
 *
 * @param nodes Every node of the payload.
 * @returns One label per node identifier.
 */
function labelsByNodeId(nodes: readonly TopologyNode[]): ReadonlyMap<string, string> {
  const labels = new Map<string, string>();

  for (const node of nodes) {
    labels.set(node.id, node.label);
  }

  return labels;
}

/**
 * The identifiers of the nodes each node is joined to, by identifier, in the order the payload states its
 * lanes.
 *
 * A lane is read in both directions: a supplier feeding a plant joins the plant to that supplier as much
 * as it joins the supplier to the plant, and a table that showed only the upstream end would leave half
 * the network's neighbours unstated.
 *
 * @param topology The payload to read.
 * @returns One neighbour identifier list per node the payload's lanes touch.
 */
function neighboursByNodeId(topology: Topology): ReadonlyMap<string, readonly string[]> {
  const neighbours = new Map<string, string[]>();

  const join = (nodeId: string, neighbourId: string): void => {
    const joined = neighbours.get(nodeId);

    if (joined === undefined) {
      neighbours.set(nodeId, [neighbourId]);
      return;
    }

    if (!joined.includes(neighbourId)) {
      joined.push(neighbourId);
    }
  };

  for (const lane of topology.lanes) {
    join(lane.fromId, lane.toId);
    join(lane.toId, lane.fromId);
  }

  return neighbours;
}

/**
 * One node's evidence pins, printed per state with the counts the payload carries.
 *
 * A state a node carries no pin in is left out rather than printed as a zero, so the summary states what
 * the node has instead of what it lacks; a node the payload's pin map does not hold, and a node whose
 * counts are all zero, both read as having no evidence pins, which the drawing's own text object words
 * once for the whole canvas.
 *
 * @param counts The node's counts, or `undefined` when the payload's pin map does not hold the node.
 * @returns The summary text, or the no-pins sentence.
 */
function pinSummaryOf(counts: PinCounts | undefined): string {
  if (counts === undefined) {
    return MAP_CANVAS_TEXT.noPins;
  }

  const stated = PIN_STATE_ORDER.filter((state) => counts[state] > 0).map(
    (state) => `${counts[state]} ${state}`,
  );

  return stated.length === 0 ? MAP_CANVAS_TEXT.noPins : stated.join(', ');
}

/**
 * Every row of the table view: one per node the payload holds, in family order.
 *
 * The lanes are read once for the whole payload rather than per row, so a network of many nodes and many
 * lanes costs one walk of the lanes rather than one per node.
 *
 * @param topology The payload the drawing draws and the table prints.
 * @returns One row per node.
 */
function buildRows(topology: Topology): readonly MapLensRow[] {
  const nodes = nodesInFamilyOrder(topology);
  const labels = labelsByNodeId(nodes);
  const neighbours = neighboursByNodeId(topology);

  return nodes.map((node) => {
    const joined = (neighbours.get(node.id) ?? [])
      .map((neighbourId) => labels.get(neighbourId))
      .filter((label): label is string => label !== undefined);

    return {
      nodeId: node.id,
      label: node.label,
      kind: node.kind,
      connections: joined.length === 0 ? MAP_LENS_TEXT.noConnections : joined.join(', '),
      pins: pinSummaryOf(topology.pinsByNode[node.id]),
    };
  });
}

/**
 * The table view's columns.
 *
 * Every column prints a payload value and none is sortable: `ChartFrame` renders a sort control only for
 * a column whose frame was given a sort handler, and this table has a fixed family order that is more
 * useful to a reader than an alphabetical one, so no ordering control is offered that could not be
 * honoured (rule P-8).
 */
const MAP_LENS_COLUMNS = [
  {
    id: 'node',
    header: MAP_LENS_TEXT.nodeColumn,
    render: (row: MapLensRow) => row.label,
  },
  {
    id: 'family',
    header: MAP_LENS_TEXT.familyColumn,
    render: (row: MapLensRow) => NODE_FAMILY_WORDS[row.kind],
  },
  {
    id: 'connections',
    header: MAP_LENS_TEXT.connectionsColumn,
    render: (row: MapLensRow) => row.connections,
  },
  {
    id: 'pins',
    header: MAP_CANVAS_TEXT.pinsPrefix,
    render: (row: MapLensRow) => row.pins,
  },
] as const satisfies readonly TableColumn<MapLensRow>[];

/**
 * The resolver the lens forwards when the screen supplies no evidence mapper: no record stands behind any
 * node, so the drawing reports the selection and opens nothing.
 *
 * Named once so the default is a value rather than a fresh function per render, and documented in the
 * module header as an answer rather than a gap in the drawing.
 */
const NO_NODE_EVIDENCE: (node: TopologyNode) => string | undefined = () => undefined;

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * The network the lens draws and prints as a table, the selection it shares with the graph lens beside
 * it, and the optional atlas overlay and evidence mapper. The selection only ever passes through, so a
 * caller keeps handing the same pair to both lenses and neither holds a copy that could disagree; a
 * caller that supplies no mapper leaves the drawing opening no drawer rather than one for a record it
 * was never given (rule P-6).
 */
export interface MapLensProps {
  /**
   * The network to draw and to print as a table, exactly as `getTopology` returned it.
   *
   * Required, and read for nothing else: the lens performs no data access of its own (rule P-2), so a
   * topology it is not given is a topology it cannot draw.
   */
  readonly topology: Topology;

  /**
   * The node the screen holds as selected, shared with the graph lens beside this map.
   *
   * `null` is the screen's way of saying nothing is selected yet, which the drawing expresses as no
   * identifier at all; a value the payload does not hold draws no emphasis rather than failing.
   */
  readonly selectedNodeId: string | null;

  /**
   * Reports the node a reader activated — by click, by `Enter` or by `Space` — to the screen that owns
   * the selection.
   *
   * Required, because a lens whose marks could be focused but not chosen would be a surface of dead
   * controls (rule P-8). This component never stores what it receives.
   */
  readonly onSelectNode: (nodeId: string) => void;

  /**
   * The atlas payload of stage S3, when the screen holds one: the competitors' networks and the shared
   * crossings, drawn over the client's own network by the drawing itself.
   *
   * Absent for a role the atlas read refuses (rule P-5 keeps that refusal in the service), and absent
   * before S3's data is asked for; the lens then draws the first-party network alone and states no error
   * of its own, because a missing overlay is a smaller drawing rather than a failure.
   */
  readonly atlas?: Atlas | undefined;

  /**
   * Why the overlay is absent, when the atlas read is what left it out, or `undefined` when there is
   * nothing to explain.
   *
   * The lens forwards the atlas payload unchanged and cannot know whether a missing one means the scope
   * holds no pack or the read was refused, so the caller — the only module that made the read — supplies
   * the sentence and this lens prints it in the caption it already renders. That is what makes the
   * degradation legible: without it, a reader sees a map with no overlay and no statement of why.
   * Absent, the caption is entirely the lens's own line of words, so a screen that has nothing to
   * explain says nothing extra.
   */
  readonly atlasNotice?: string | undefined;

  /**
   * Resolves the evidence reference a node's figures open, or `undefined` for a node no record stands
   * behind.
   *
   * Optional here and forwarded when supplied. The drawing requires a mapper and the records it
   * resolves live with the screen, so a screen that can name each node's
   * record passes one and the drawer opens from the map; a screen that cannot leaves the default in place
   * and the drawing opens nothing rather than a drawer for a record it was never given. A node of the
   * FileMap canvas is named by its own identifier, which the service's evidence read resolves for the
   * plant, supplier, origin and customer families.
   */
  readonly evidenceRefForNode?: ((node: TopologyNode) => string | undefined) | undefined;
}

/**
 * The map lens of the FileMap canvas: the drawing, framed, with the table view of the nodes it draws.
 *
 * The lens holds the map's view state and nothing else. The zoom level and the view preset are the
 * surface's own presentation, so they live here and the drawing's controls report into them; the
 * selection is the screen's, so it arrives and leaves as props and this component keeps no copy that
 * could disagree with the graph lens beside it.
 *
 * The rows are memoised on the payload, so changing the selection or the zoom re-renders the drawing
 * without rebuilding the table's rows, and the table view opens with exactly the nodes the map is
 * drawing.
 *
 * @param props The topology, the shared selection, the optional atlas overlay and the optional evidence
 *   mapper. See {@link MapLensProps}.
 * @returns The framed lens, ready to be composed by the canvas screen.
 */
export function MapLens({
  topology,
  selectedNodeId,
  onSelectNode,
  atlas,
  atlasNotice,
  evidenceRefForNode,
}: MapLensProps): ReactElement {
  const [zoomLevel, setZoomLevel] = useState<MapZoomLevel>(DEFAULT_ZOOM_LEVEL);
  const [viewPreset, setViewPreset] = useState<MapViewPreset>(DEFAULT_VIEW_PRESET);

  const rows = useMemo(() => buildRows(topology), [topology]);

  /*
   * The caption: the lens's own line of words, then the caller's reason for a degraded overlay when it
   * supplied one. Both are sentences of the same caption, so a reader meets one statement of what this
   * figure shows and, where it applies, why it shows less (rule P-8: a surface that cannot show a thing
   * says so in words).
   */
  const description =
    atlasNotice === undefined
      ? MAP_LENS_TEXT.description
      : `${MAP_LENS_TEXT.description} ${atlasNotice}`;

  return (
    <ChartFrame<MapLensRow>
      title={MAP_LENS_TEXT.title}
      description={description}
      simLabel={CALCULATION_LABEL}
      tableRows={{
        caption: MAP_LENS_TEXT.tableCaption,
        columns: MAP_LENS_COLUMNS,
        rows,
        getRowKey: (row) => row.nodeId,
      }}
    >
      <MapCanvas
        topology={topology}
        title={MAP_LENS_TEXT.title}
        zoomLevel={zoomLevel}
        onZoomLevelChange={setZoomLevel}
        viewPreset={viewPreset}
        onViewPresetChange={setViewPreset}
        selectedNodeId={selectedNodeId ?? undefined}
        onSelectNode={onSelectNode}
        overlay={atlas}
        evidenceRefForNode={evidenceRefForNode ?? NO_NODE_EVIDENCE}
      />
    </ChartFrame>
  );
}
