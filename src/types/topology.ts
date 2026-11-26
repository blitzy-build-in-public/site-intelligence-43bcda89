/**
 * Topology vocabulary of the S2 FileMap canvas: the four node families, the lanes between them and
 * the per-node evidence-pin counts that one surface renders through two lenses.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §3 declares `Topology` among the core types and directs that the
 *   topology, atlas, plan-grid, source, model and exit-package types be defined in the types folder
 *   beside those types. AAP 0.12.2 records the contents this module types: plants, suppliers,
 *   origins, customers, lanes and pins by state.
 * - AAP 0.12.3 makes `GET /topology` an S2 read whose response "carries the per-node pin counts that
 *   S4 will later let a user open", so the counts travel with the topology while the pin records
 *   themselves stay with the stage that shows them.
 * - AAP 0.12.2 requires supplier-to-product reach in the seed and pin counts per node, "because the
 *   graph lens and the canvas node badges in S2 need both before the pin screens exist in S4".
 *   `TopologyNode.productIds` is that reach and `Topology.pinsByNode` is those counts.
 *
 * The four node families are read by both lenses of the canvas: the map lens places them over the
 * bundled world boundaries that `src/components/map-canvas.tsx` projects, and the graph lens lays
 * them out in six lanes inside `src/components/dependency-graph.tsx`. One selection is shared across
 * the two lenses, so every member that identifies a node is the key the other lens and
 * `pinsByNode` use as well.
 *
 * The boundaries are bundled in `src/assets/geo/`, so the map is drawn from the application's own
 * origin and this module declares coordinates as slots only: it carries no source address, no
 * address template and no member naming one, because an outside host named here would break rule
 * B-1. A projection helper belongs in the component that projects, never beside a shape.
 *
 * Rules this module is built to satisfy:
 * - P-2: it imports `./primitives` and `./entities` and nothing else, so the topology reaches a
 *   screen only through the typed service interface that serves it.
 * - P-6: every member is a slot a seed record or the service handler fills; no coordinate, count or
 *   identifier value is written here, and nothing in this module computes.
 * - P-5: market intelligence stays out. Competitor networks, chokepoints and radar series belong to
 *   `src/types/atlas.ts`, and no member below may carry a competitor figure.
 * - P-1: no label string lives here. The seven simulation labels are declared in `./primitives` and
 *   rendered by the components that show a computed figure, so a shape cannot drift from its label.
 *
 * OPEN ITEM: `TopologyLane` carries its two endpoints and nothing else. The inputs state that lanes
 * exist and are drawn, but fix no mode, weight, capacity or style for one, so a member for those
 * would be invented. The direction a lane reads is stated in the member documentation below.
 * OPEN ITEM: `TopologyNode.productIds` is empty for a customer record, because a customer reaches a
 * product through the customer orders the order records hold rather than through a member of its
 * own. The graph lens therefore reads an empty array as "no product reach to dim or trace", never as
 * a missing value.
 * OPEN ITEM: the pins are counted per state rather than listed, because stage S4 owns the pin
 * records and the screens that open them (AAP 0.12.2). Receiving the counts with the topology is what
 * lets the canvas badge a node without a second call.
 * OPEN ITEM: `Topology` carries the families as four arrays rather than one array discriminated by
 * `kind`, because a lens addresses a family directly — the graph lens bands one per family and the
 * map lens orders its marks by family. `kind` stays for the shared node handling and the table view.
 */
import type { PinState } from './entities';
import type { ProductId } from './primitives';

/* ---------------------------------------------------------------------------------------------
 * Nodes — platform-contracts.md §3 via AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The four families a topology node belongs to: plants, suppliers, tier-2 origins and customers.
 *
 * A family is what a node's class in the graph lens and its mark in the map lens are chosen from, so
 * this union is the whole vocabulary the two lenses share.
 */
export type TopologyNodeKind = 'plant' | 'supplier' | 'origin' | 'customer';

/**
 * One node of the canvas: a place or party a lane reaches, with the products it reaches.
 *
 * `id` is the identifier the selection and the pin counts key on, and it is the spelling
 * `EvidencePin.nodeRef` uses for the node a pin is attached to. `latitude` and `longitude` are seed
 * record values carried in degrees for the map lens to project; nothing here converts or places
 * them. `productIds` may be empty, which for a customer means it reaches products only through its
 * customer orders (see the second OPEN ITEM above).
 */
export interface TopologyNode {
  /** The node's own identifier: the key the selection, the lanes and the pin counts use. */
  id: string;

  /** Which of the four families the node belongs to. */
  kind: TopologyNodeKind;

  /** The name the two lenses and the "View as table" view print for the node. */
  label: string;

  /** The node's latitude in degrees, a seed record value the map lens projects. */
  latitude: number;

  /** The node's longitude in degrees, a seed record value the map lens projects. */
  longitude: number;

  /** The products the node reaches; empty for a customer, which reaches products through orders. */
  productIds: ProductId[];
}

/* ---------------------------------------------------------------------------------------------
 * Lanes — platform-contracts.md §3, the topology's connections
 * ------------------------------------------------------------------------------------------- */

/**
 * A connection between two nodes, rendered as an arc by the map lens and as an edge by the graph
 * lens.
 *
 * The pair is ordered upstream to downstream: `fromId` is the supplying node and `toId` the node it
 * feeds. For the lanes the canvas renders from the supplier side to the plant side, that ordering
 * is the whole of the direction a lane states (see the first OPEN ITEM above).
 */
export interface TopologyLane {
  /** The upstream node the lane leaves: for the canvas's lanes, a supplier-side node. */
  fromId: string;

  /** The downstream node the lane reaches: for the canvas's lanes, a plant-side node. */
  toId: string;
}

/* ---------------------------------------------------------------------------------------------
 * Pin counts — AAP 0.12.2 and 0.12.3, one badge's worth of evidence per node
 * ------------------------------------------------------------------------------------------- */

/**
 * How many evidence pins a node carries, counted by state.
 *
 * Every one of the six `PinState` values — `empty`, `pending`, `pass`, `fail`, `stale` and `review`
 * — is a key, zero included, so a node badge renders every state without an existence check. The
 * counts are seed record values the service handler totals; nothing here counts.
 */
export type PinCounts = Record<PinState, number>;

/* ---------------------------------------------------------------------------------------------
 * The payload — platform-contracts.md §3, the whole surface in one value
 * ------------------------------------------------------------------------------------------- */

/**
 * The topology one canvas surface renders: the four node families, the lanes joining them and the
 * pin counts of each node.
 *
 * Each array holds one node per record of its family, and `lanes` joins nodes across those arrays by
 * `id`. `pinsByNode` is keyed by the same node id the nodes carry, so a node absent from that map
 * has no pins and the canvas renders it with no badge rather than with a badge of zeros.
 */
export interface Topology {
  /** The plant nodes. */
  plants: TopologyNode[];

  /** The supplier nodes. */
  suppliers: TopologyNode[];

  /** The tier-2 origin nodes. */
  origins: TopologyNode[];

  /** The customer nodes. */
  customers: TopologyNode[];

  /** The lanes joining nodes of the families above, ordered upstream to downstream. */
  lanes: TopologyLane[];

  /** Pin counts per node id; a node missing from this map has no pins. */
  pinsByNode: Record<string, PinCounts>;
}
