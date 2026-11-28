/**
 * Topology vocabulary of the S2 FileMap canvas: the five node families, the lanes between them and
 * the per-node evidence-pin counts that one surface renders through two lenses.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §3 declares `Topology` among the core types and directs that the
 *   topology, atlas, plan-grid, source, model and exit-package types be defined in the types folder
 *   beside those types. AAP 0.12.2 records the contents this module types: plants, suppliers,
 *   origins, customers, lanes and pins by state.
 * - The specification's T-19 row (AAP 0.7) asserts a selection "on the three named materials and the
 *   one supplier", and AAP 0.12.4 places the disabled "Open part" control on "SCR-12 graph lens,
 *   product and material nodes", so the payload carries materials as a family of their own. The
 *   contracts' own entity list and AAP 0.12.2's invariant agree that "supplier-to-product reach is
 *   derived from materials and drives the graph lens".
 * - AAP 0.12.3 makes `GET /topology` an S2 read whose response "carries the per-node pin counts that
 *   S4 will later let a user open", so the counts travel with the topology while the pin records
 *   themselves stay with the stage that shows them.
 * - AAP 0.12.2 requires supplier-to-product reach in the seed and pin counts per node, "because the
 *   graph lens and the canvas node badges in S2 need both before the pin screens exist in S4".
 *   `TopologyNode.productIds` is that reach and `Topology.pinsByNode` is those counts.
 *
 * The five node families are read by both lenses of the canvas: the map lens places them over the
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
 * OPEN ITEM: `Topology` carries the families as five arrays rather than one array discriminated by
 * `kind`, because a lens addresses a family directly — the graph lens bands one per family and the
 * map lens orders its marks by family. `kind` stays for the shared node handling and the table view.
 */
import type { PinState } from './entities';
import type { ProductId } from './primitives';

/* ---------------------------------------------------------------------------------------------
 * Nodes — platform-contracts.md §3 via AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The five families a topology node belongs to: plants, suppliers, materials, tier-2 origins and
 * customers.
 *
 * A family is what a node's class in the graph lens and its mark in the map lens are chosen from, so
 * this union is the whole vocabulary the two lenses share. A material is a family of its own rather
 * than a property of the supplier that sells it: several materials are bought from one supplier, and
 * the lane a material carries on to the plants that build its product is a hop of its own.
 */
export type TopologyNodeKind = 'plant' | 'supplier' | 'material' | 'origin' | 'customer';

/**
 * One node of the canvas: a place or party a lane reaches, with the products it reaches.
 *
 * `id` is the identifier the selection and the pin counts key on, and it is the spelling
 * `EvidencePin.nodeRef` uses for the node a pin is attached to. `latitude` and `longitude` are seed
 * record values carried in degrees for the map lens to project; nothing here converts or places
 * them. `productIds` may be empty, which for a customer means it reaches products only through its
 * customer orders (see the second OPEN ITEM above).
 *
 * A material record carries no site of its own, so a material node's coordinates are its primary
 * supplier's site: the purchase order ships from that site, which makes the pair a record value
 * rather than an invented one. Two materials bought from one supplier therefore share a point, and
 * a mark that offsets them does so in presentation geometry the lens owns, never here.
 */
export interface TopologyNode {
  /** The node's own identifier: the key the selection, the lanes and the pin counts use. */
  id: string;

  /** Which of the five families the node belongs to. */
  kind: TopologyNodeKind;

  /** The name the two lenses and the "View as table" view print for the node. */
  label: string;

  /**
   * The node's latitude in degrees, a seed record value the map lens projects. A material carries its
   * primary supplier's site latitude, because a material record holds no site of its own.
   */
  latitude: number;

  /**
   * The node's longitude in degrees, a seed record value the map lens projects. A material carries its
   * primary supplier's site longitude, for the same reason as its latitude.
   */
  longitude: number;

  /**
   * The products the node reaches; empty for a customer, which reaches products through orders. A
   * material reaches the products it goes into, and that reach is what a material's lanes follow on to
   * the plants that build them.
   */
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
 * feeds. The canvas's lanes follow the chain one hop at a time — an origin to a supplier, a supplier
 * to the material it sells, that material to a plant that builds one of its products, a plant to a
 * customer it ships to — so a lane never jumps a stage of the network (see the first OPEN ITEM
 * above).
 */
export interface TopologyLane {
  /** The upstream node the lane leaves: an origin, a supplier or a material. */
  fromId: string;

  /** The downstream node the lane reaches: a supplier, a material, a plant or a customer. */
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
 * The topology one canvas surface renders: the five node families, the lanes joining them and the
 * pin counts of each node.
 *
 * Each array holds one node per record of its family that the read's resolved scope retains, so a family
 * is a subset of the records the seed holds and `lanes` joins nodes across those arrays by `id`; no lane
 * names a node its own payload omits. `pinsByNode` is keyed by the same node id the nodes carry, so a
 * node absent from that map has no pins and the canvas renders it with no badge rather than with a badge
 * of zeros — which is the reading a material node always has, because the seeded tally counts the nodes
 * evidence pins are attached to and none is attached to a material.
 */
export interface Topology {
  /** The plant nodes. */
  plants: TopologyNode[];

  /** The supplier nodes. */
  suppliers: TopologyNode[];

  /** The material nodes: what the products are built from, placed at the site they ship from. */
  materials: TopologyNode[];

  /** The tier-2 origin nodes. */
  origins: TopologyNode[];

  /** The customer nodes. */
  customers: TopologyNode[];

  /** The lanes joining nodes of the families above, ordered upstream to downstream. */
  lanes: TopologyLane[];

  /** Pin counts per node id; a node missing from this map has no pins. */
  pinsByNode: Record<string, PinCounts>;
}
