/**
 * The topology family of the in-browser mock adapter: the FileMap canvas's one read payload and the
 * six tiles of the ribbon above it.
 *
 * Implements the "Handlers" row of AAP 0.12.1 at the `handlers/` path AAP 0.13.1 fixes, in the shape
 * the parent folder's brief gives this entry: the S2 `Topology` payload — plants, suppliers, origins and
 * customers with coordinates, the lanes, `pinsByNode` copied from the seed's pin counts — together with
 * the six canvas ribbon tiles built from the aggregation modules, and with nothing that addresses a map
 * host and no competitor concept anywhere in it. `platform-contracts.md` §3 declares `Topology` among
 * the core types, and `src/types/topology.ts` is its declaration; this module fills that shape from the
 * session's records and computes nothing of its own.
 *
 * WHAT THE READ IS NARROWED BY (AAP 0.2.1, AAP 0.12.3). `getTopology` and `getCanvasRibbon` take the
 * shell's selection as one `ScopeFilterInput` and resolve it once through `resolveScope`, so the canvas
 * describes the same scope the queue and the overview beside it do. The plant half of that scope decides
 * which nodes and lanes the payload holds: the plant nodes are the plants in scope; a supplier-to-plant
 * lane survives when it lands on one of them; a plant-to-customer lane survives when it leaves one of
 * them; and an origin-to-supplier lane survives when it reaches a retained supplier. A supplier, origin
 * or customer node survives when a retained lane touches it or when the records place it at no plant at
 * all, and `pinsByNode` carries a count only for a node the payload still holds. An empty `scope.plants`
 * narrows the plant-anchored part of the network away entirely — it means nothing is in scope, never
 * "all plants" — which is the reading `src/domain/aggregation/scope.ts` fixes for that member.
 *
 * WHY THE PIN COUNTS TRAVEL WITH THE TOPOLOGY. AAP 0.2.1 requires "supplier-to-product reach in the
 * seed, and pin counts per node, because the graph lens and the canvas node badges in S2 need both
 * before the pin screens exist in S4", and AAP 0.12.3 makes `GET /topology` an S2 read whose response
 * "carries the per-node pin counts that S4 will later let a user open". The counts are therefore copied
 * out of the seeded tally the session holds, so the canvas badges a node without a second call and
 * without this module counting a pin record. All six `PinState` keys are copied onto every entry: a
 * badge then renders a state without an existence check, and a partial copy would not compile.
 *
 * WHAT A NODE'S PRODUCT REACH IS, AND WHERE EACH FAMILY GETS IT. `TopologyNode.productIds` is the reach
 * the graph lens dims and traces by, and every family's share of it is derived from records rather than
 * stated here:
 * - a plant reaches the products its own production orders build;
 * - a supplier reaches the products its materials go into, read from the materials it is the primary
 *   supplier of;
 * - a tier-2 origin reaches what the suppliers it feeds reach, which is the reach that follows the lane
 *   the origin's own record names;
 * - a customer reaches products only through its customer orders, so its reach is empty, which
 *   `src/types/topology.ts` documents as "no product reach to dim or trace" rather than a gap.
 *
 * THE LANES ARE DERIVED, NEVER COMPLETED BY HAND. `src/types/topology.ts` fixes `TopologyLane` as a
 * pair ordered upstream to downstream, and the three families emitted here are the three the records
 * themselves imply: an origin to each supplier its `supplierIds` names, a supplier to each plant that
 * builds a product in the supplier's reach (the material-driven lane, since a purchase order carries
 * the supplier, the material and the plant), and a plant to each customer the order book ships to. A
 * lane whose endpoint the record set does not hold is reported as a validation failure naming both
 * records instead of being dropped, because a canvas that quietly lost an edge would look complete
 * while describing a network the records do not.
 *
 * WHAT THE PAYLOAD DOES NOT CARRY (rules B-1 and P-5). There is no map address, no host, no port, no
 * projection setting and no request of any kind in the value below: the boundaries are bundled in
 * `src/assets/geo/` and `src/components/map-canvas.tsx` projects them, so the canvas draws from the
 * application's own origin and the coordinates this module copies are record content. There is likewise
 * no competitor identifier, score or series: competitor and chokepoint material belongs to the atlas
 * family and composes on top of this payload in the client, so a first-party topology can never carry a
 * market-intelligence figure blended into it.
 *
 * THE RIBBON IS AN AGGREGATION'S OUTPUT, NOT THIS MODULE'S ARITHMETIC. `getCanvasRibbon` resolves the
 * scope once through `resolveScope`, from the same shell selection the topology read is narrowed by, and
 * assembles the record bundle the aggregates read; it then returns
 * `computeRibbonTiles(computeOverview(...), computeExceptionRows(...))` unchanged — six tiles whose
 * every value is a computed aggregate's own output or a count of the rows handed in (rule P-6). The
 * empty-queue trigger empties the exception collection the ribbon is computed from, which is what keeps
 * the canvas's tiles and the queue's rows describing the same population (AAP 0.12.4, T-17). No label is
 * attached here: the tiles carry no caption and no simulation label, because specification §5.3's seven
 * exact strings belong to the components that render them (rule P-1, AAP 0.10).
 *
 * WHY THE READ'S FRESHNESS IS THE ORDER-BOOK SOURCE'S RECORD. `ExceptionRow.freshness` is the state the
 * adapter attaches to a read rather than a member of an exception, and the bundle the aggregates read
 * carries one such record. This module reports the source whose state gates approval — the same source
 * `src/services/mock/simulation.ts` marks stale for the stale trigger — because that is the source whose
 * as-of instant a reader needs beside a figure drawn from the order book and the stock (AAP 0.2.1,
 * T-13). The state itself comes from `freshnessFor(state)`, so a trigger the popover set is reflected
 * here exactly as it is in the shell's freshness strip, and this module evaluates no trigger of its own
 * beyond the two it answers.
 *
 * DETERMINISTIC, PURE IN ITS INPUTS AND READ-ONLY (AAP 0.2.1, AAP 0.18.2). Neither export modifies the
 * session: records are read, arrays are freshly allocated, and the only value a call derives is a
 * baseline solve, which is a pure function of a case record and the do-nothing levers. No clock is read
 * — the aggregate's "now" is the constant `DEMO_CLOCK` of contracts §1 — and no random source, locale
 * or module-level mutable value is touched, so two consecutive calls return the same payload.
 *
 * Rules this module is built to satisfy:
 * - P-1: it types no label. The seven fixed strings live in `src/types/primitives.ts` and are applied by
 *   the components that render a computed figure.
 * - P-2: it reads records only through `ctx.state` and the sibling `../seed-loader.ts` type surface, and
 *   imports `src/domain/aggregation`, `src/domain/policy` and `src/domain/solver` for the arithmetic it
 *   delegates to. It imports no seed module, no React, no `src/app`, no `src/features` and no API client,
 *   so the port stays the only boundary — only `mock-backend.ts` imports this file.
 * - P-3, P-8: the verdict comes from `ctx.actor`, and a permission failure names the permission and the
 *   roles that hold it, which is what a disabled canvas control or a forbidden card explains.
 * - P-4: nothing here claims a security property for the workspace; the payload is a set of records and
 *   a set of computed tiles, and this module states nothing beyond them.
 * - P-5: no competitor concept enters the payload, so a first-party topology cannot blend a market
 *   figure into itself.
 * - P-6: no currency amount, threshold, count or domain identifier is written here. Every figure is a
 *   record value, a solver result or an aggregation's output, and no fixture is imported.
 * - P-7: every name the payload carries is a seed record's own synthetic name; this file names no
 *   company, product or person of its own.
 * - B-1, B-2: it contacts no host, addresses none, holds no credential-shaped literal and reads no
 *   configuration.
 *
 * CUSTOMER NODES AND LANE COVERAGE. Every seeded customer record becomes a node, and every
 * plant-to-customer pair the loaded order book states becomes a lane. The book is the named customer
 * orders plus the records the deterministic filler derives (`src/seed/index.ts`, AAP 0.2.3), so a
 * customer whose orders the filler generates is connected like any other. No lane is invented for a
 * pair no order states, and no node is dropped, because the evidence-pin tally carries entries for
 * every customer record and dropping one would strand its counts.
 *
 * OPEN ITEM — the do-nothing levers. The two lever values below are the baseline of AAP 0.8,
 * `solveSupplyDelay(CASE-1184, { airSets: 0, transferSets: 0 })`, which is the measurement an exception's
 * affected lines are derived under. They are solver inputs rather than a business figure, and the solver
 * echoes them on the result it returns.
 */

/* ---------------------------------------------------------------------------------------------
 * Imports — the shared vocabulary, the domain modules this family delegates to, and the siblings
 * ------------------------------------------------------------------------------------------- */

import { DEMO_CLOCK } from '../../../types';
import type {
  Freshness,
  Levers,
  OperationalException,
  Permission,
  PinCounts,
  PinState,
  PlantId,
  Problem,
  ProductId,
  RibbonTile,
  Scope,
  SourceId,
  SupplierId,
  Topology,
  TopologyLane,
  TopologyNode,
} from '../../../types';

import { computeExceptionRows } from '../../../domain/aggregation/exceptions';
import type { BaselineSolve } from '../../../domain/aggregation/exceptions';
import { computeOverview } from '../../../domain/aggregation/overview';
import type { OverviewInput } from '../../../domain/aggregation/overview';
import { resolveScope } from '../../../domain/aggregation/scope';
import type { ScopeFilterInput } from '../../../domain/aggregation/scope';
import { computeRibbonTiles } from '../../../domain/aggregation/urgency';
import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import { solveSupplyDelay } from '../../../domain/solver/solve-supply-delay';

import type { HandlerContext, MockState } from '../mock-state';
import type { Material, Origin, ProductionOrder, SeedRecordSet } from '../seed-loader';
import { freshnessFor, isSimulationOn } from '../simulation';

/* ---------------------------------------------------------------------------------------------
 * The fixed values this family addresses — AAP 0.12.3, AAP 0.2.1, AAP 0.8
 * ------------------------------------------------------------------------------------------- */

/**
 * The one permission both reads require: the canvas is a second surface over the exception records, so
 * who may read the queue may read the network it describes (contracts §7.1, AAP 0.12.3).
 *
 * Named once so the permission check and the failure's `requiredPermission` cannot disagree.
 */
const CANVAS_READ_PERMISSION: Permission = 'exception.read';

/**
 * The source whose freshness record a read reports: the order book and stock system the exception
 * figures are drawn from, and the source whose state gates approval (AAP 0.2.1, T-13).
 *
 * The key is a seeded `SourceId`; a source's display name is its record's own `label` and never a string
 * held here.
 */
const ORDER_BOOK_SOURCE: SourceId = 'erp';

/**
 * The levers of an exception's baseline measurement: neither pulled.
 *
 * AAP 0.8 fixes the baseline as the do-nothing solve of the case, which is the measurement the
 * affected-lines rule reads. Both values are solver inputs, not business figures, and the solver echoes
 * them on the result it returns.
 */
const DO_NOTHING_LEVERS: Levers = { airSets: 0, transferSets: 0 };

/* ---------------------------------------------------------------------------------------------
 * Failures — platform-contracts.md §2, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The failure a role that may not read the canvas receives, and the one the forbidden trigger produces.
 *
 * The members are the `Problem` members a permission cause carries: the cause itself, a sentence in
 * plain words naming the permission and the roles that hold it, the permission, and those roles — which
 * is what a forbidden card and a disabled control's explanation print (rule P-3, rule P-8).
 *
 * The correlation identifier is the empty string because this handler does not form the call's `Meta`:
 * the adapter that dispatches to it owns the request counter the identifier is spelled from, so that
 * value belongs to the envelope the adapter serves and not to a failure built here. The adapter fills
 * the empty member with that call's identifier before the failure reaches a caller, so this module
 * states nothing it does not know and no reader is left without an identifier to quote.
 *
 * @returns A fresh permission failure, built per call so the role list is the matrix's current answer.
 */
function permissionProblem(): Problem {
  const roles = rolesWith(CANVAS_READ_PERMISSION);

  return {
    type: 'permission',
    message:
      `Reading the FileMap canvas needs the ${CANVAS_READ_PERMISSION} permission, which the acting role ` +
      `does not hold. The roles that hold it are ${roles.join(', ')}.`,
    traceId: '',
    requiredPermission: CANVAS_READ_PERMISSION,
    rolesWithPermission: roles,
  };
}

/**
 * The failure a record set that cannot describe the network produces, naming the records at fault.
 *
 * A lane needs both of its endpoints and a solve needs its case, so a reference the loaded records do not
 * resolve is a validation failure rather than a missing node: the canvas must not present a network the
 * records do not hold, and a reader is owed the record names that disagree (AAP 0.12.3's `'validation'`
 * cause, rule P-8's "a control that cannot act says why").
 *
 * @param message The plain-words reason, naming the records whose references do not resolve.
 * @returns A fresh validation failure carrying that reason.
 */
function recordGap(message: string): Problem {
  return { type: 'validation', message, traceId: '' };
}

/**
 * Refuses the read when the acting role may not read the canvas, or when the forbidden trigger is on.
 *
 * The two causes produce the same failure on purpose: a screen renders one forbidden card and disables
 * one set of controls whether the refusal came from the matrix or from the popover, so the explanation a
 * reader sees is the one the matrix would give (AAP 0.12.4, T-17).
 *
 * @param ctx The session and the persona the call acts as.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function assertCanvasReadable(ctx: HandlerContext): void {
  if (
    isSimulationOn(ctx.state, 'forbidden') ||
    !hasPermission(ctx.actor.role, CANVAS_READ_PERMISSION, null, ctx.actor)
  ) {
    throw permissionProblem();
  }
}

/* ---------------------------------------------------------------------------------------------
 * Product reach — AAP 0.2.1, AAP 0.12.2's supplier-to-product reach
 * ------------------------------------------------------------------------------------------- */

/**
 * Appends the products of `source` that `reach` does not already hold, in the order the source states
 * them.
 *
 * Reach is a set with a stable order: a node's products read in the order its own records name them, so
 * two calls present the same array and the graph lens traces the same path twice (AAP 0.18.2). A repeated
 * product is therefore skipped rather than listed twice, and the source array is never modified.
 *
 * @param reach The reach built so far. Modified in place with the products not already present.
 * @param source The products to add, read and not modified.
 */
function addProducts(reach: ProductId[], source: readonly ProductId[]): void {
  for (const productId of source) {
    if (!reach.includes(productId)) {
      reach.push(productId);
    }
  }
}

/**
 * The products a plant reaches: those its own production orders build, in record order and without
 * repetition.
 *
 * A production order carries the plant, the line and the product it builds, so the plant's reach is a
 * reading of the shop-floor records rather than a statement about the plant (AAP 0.12.2). A plant whose
 * orders the loaded set does not hold reaches nothing, and the graph lens then shows it unattached rather
 * than attached to a product no record supports.
 *
 * @param orders The loaded production orders, read and not modified.
 * @param plantId The plant whose reach is wanted.
 * @returns The distinct products that plant's orders build, in the order the orders state them.
 */
function plantProductReach(orders: readonly ProductionOrder[], plantId: PlantId): ProductId[] {
  const reach: ProductId[] = [];

  for (const order of orders) {
    if (order.plantId === plantId && !reach.includes(order.productId)) {
      reach.push(order.productId);
    }
  }

  return reach;
}

/**
 * The products a supplier reaches: those its materials go into, read from the materials it supplies.
 *
 * Only the material's `primarySupplierId` is followed. `alternateSupplierId` names a second qualified
 * supplier that can cover the material, not the party the material is bought from, so treating it as a
 * reach would claim a supply relation the purchase orders do not place.
 *
 * @param materials The loaded materials, read and not modified.
 * @param supplierId The supplier whose reach is wanted.
 * @returns The distinct products the supplier's materials go into, in record order.
 */
function supplierProductReach(materials: readonly Material[], supplierId: SupplierId): ProductId[] {
  const reach: ProductId[] = [];

  for (const material of materials) {
    if (material.primarySupplierId === supplierId) {
      addProducts(reach, material.productIds);
    }
  }

  return reach;
}

/**
 * The products a tier-2 origin reaches: what the suppliers it feeds reach.
 *
 * An origin's record names the suppliers it feeds, and each of those suppliers' materials name the
 * products they go into, so the origin's reach follows the two lanes the records already state. This is
 * why an origin whose substance reaches the network through a component rather than through a material of
 * its own still has a reach: the site feeds a supplier, and that supplier's materials reach the products.
 *
 * @param origin The origin whose reach is wanted.
 * @param materials The loaded materials, read and not modified.
 * @returns The distinct products reachable through the suppliers this origin feeds, in record order.
 */
function originProductReach(origin: Origin, materials: readonly Material[]): ProductId[] {
  const reach: ProductId[] = [];

  for (const supplierId of origin.supplierIds) {
    addProducts(reach, supplierProductReach(materials, supplierId));
  }

  return reach;
}

/**
 * Whether two reaches share a product, which is what makes a supplier-to-plant lane exist.
 *
 * A lane means the plant builds something the supplier's materials go into, so the test is an
 * intersection and not an equality: a supplier with three products reaches every plant that builds any
 * one of them.
 *
 * @param left One reach, read and not modified.
 * @param right The other reach, read and not modified.
 * @returns `true` when the two share at least one product.
 */
function reachesSharedProduct(left: readonly ProductId[], right: readonly ProductId[]): boolean {
  for (const productId of left) {
    if (right.includes(productId)) {
      return true;
    }
  }

  return false;
}

/* ---------------------------------------------------------------------------------------------
 * Nodes — src/types/topology.ts, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The plant nodes: each plant's identifier, display name and coordinates, with the products its lines
 * build.
 *
 * Every member is a record value copied across. A plant record carries no product member, which is why
 * the reach is read from the production orders rather than from the plant, and why this module needs no
 * plant-to-product table of its own.
 *
 * @param records The loaded record set, read and not modified.
 * @returns One node per plant record, in the order the plant records state them.
 */
function plantNodes(records: SeedRecordSet): TopologyNode[] {
  return records.plants.map(
    (plant): TopologyNode => ({
      id: plant.id,
      kind: 'plant',
      label: plant.name,
      latitude: plant.latitude,
      longitude: plant.longitude,
      productIds: plantProductReach(records.productionOrders, plant.id),
    }),
  );
}

/**
 * The supplier nodes: each supplier's identifier, trading name, site coordinates and product reach.
 *
 * @param records The loaded record set, read and not modified.
 * @returns One node per supplier record, in record order.
 */
function supplierNodes(records: SeedRecordSet): TopologyNode[] {
  return records.suppliers.map(
    (supplier): TopologyNode => ({
      id: supplier.id,
      kind: 'supplier',
      label: supplier.name,
      latitude: supplier.latitude,
      longitude: supplier.longitude,
      productIds: supplierProductReach(records.materials, supplier.id),
    }),
  );
}

/**
 * The tier-2 origin nodes: each origin's identifier, facility name, site coordinates and the reach that
 * follows the suppliers it feeds.
 *
 * @param records The loaded record set, read and not modified.
 * @returns One node per origin record, in record order.
 */
function originNodes(records: SeedRecordSet): TopologyNode[] {
  return records.origins.map(
    (origin): TopologyNode => ({
      id: origin.id,
      kind: 'origin',
      label: origin.name,
      latitude: origin.latitude,
      longitude: origin.longitude,
      productIds: originProductReach(origin, records.materials),
    }),
  );
}

/**
 * The customer nodes: each customer's identifier, name and site coordinates, with an empty product reach.
 *
 * `src/types/topology.ts` documents the empty reach: a customer reaches a product through the customer
 * orders the order book holds rather than through a member of its own, so the graph lens reads an empty
 * array as "no product reach to dim or trace" and never as a missing value. The reach is not filled from
 * the order book here, because that would state the customer's demand as a property of the customer and
 * give a second reading of the same orders a second home.
 *
 * Every seeded customer record becomes a node, whether or not the order book holds an order for it:
 * the evidence-pin tally carries counts for every customer record, and a node dropped here would
 * strand them.
 *
 * @param records The loaded record set, read and not modified.
 * @returns One node per customer record, in record order.
 */
function customerNodes(records: SeedRecordSet): TopologyNode[] {
  return records.customers.map(
    (customer): TopologyNode => ({
      id: customer.id,
      kind: 'customer',
      label: customer.name,
      latitude: customer.latitude,
      longitude: customer.longitude,
      productIds: [],
    }),
  );
}

/* ---------------------------------------------------------------------------------------------
 * Lanes — src/types/topology.ts, the three families the records imply
 * ------------------------------------------------------------------------------------------- */

/**
 * The lanes from each tier-2 origin to the suppliers it feeds.
 *
 * One lane per supplier an origin's `supplierIds` names, ordered upstream to downstream. The origin
 * record and the supplier records state the two halves of this relation, so the lane is read rather than
 * derived; a supplier the record set does not hold is reported instead of producing a lane to a node that
 * does not exist.
 *
 * @param records The loaded record set, read and not modified.
 * @returns One lane per origin-to-supplier reference, origin by origin in record order.
 * @throws Problem - A `'validation'` failure naming an origin and the supplier it names that the record
 *   set does not hold.
 */
function originToSupplierLanes(records: SeedRecordSet): TopologyLane[] {
  const lanes: TopologyLane[] = [];

  for (const origin of records.origins) {
    for (const supplierId of origin.supplierIds) {
      if (!records.suppliers.some((supplier) => supplier.id === supplierId)) {
        throw recordGap(
          `Tier-2 origin ${origin.id} feeds supplier ${supplierId}, which the supplier records do not ` +
            'hold, so the canvas cannot draw the lane the origin states.',
        );
      }

      lanes.push({ fromId: origin.id, toId: supplierId });
    }
  }

  return lanes;
}

/**
 * The material-driven lanes from each supplier to each plant that builds a product in its reach.
 *
 * A purchase order carries the supplier, the material and the plant, so the relation a lane states is the
 * one procurement records: this supplier's material is consumed where that product is built. The lane is
 * emitted once per supplier and plant, however many products the two share, because the topology types a
 * lane as a pair and nothing else.
 *
 * @param records The loaded record set, read and not modified.
 * @returns One lane per supplier-and-plant pair whose reaches intersect, supplier by supplier in record
 *   order and plant by plant within each supplier.
 */
function supplierToPlantLanes(records: SeedRecordSet): TopologyLane[] {
  const lanes: TopologyLane[] = [];
  const plantReaches = records.plants.map((plant) => ({
    plantId: plant.id,
    productIds: plantProductReach(records.productionOrders, plant.id),
  }));

  for (const supplier of records.suppliers) {
    const reach = supplierProductReach(records.materials, supplier.id);

    for (const plantReach of plantReaches) {
      if (reachesSharedProduct(reach, plantReach.productIds)) {
        lanes.push({ fromId: supplier.id, toId: plantReach.plantId });
      }
    }
  }

  return lanes;
}

/**
 * The lanes from each plant to each customer the order book ships to.
 *
 * One lane per plant-and-customer pair the customer orders state, de-duplicated across the several orders
 * one pair may hold, and ordered by the book's own record order so two calls return the same array. The
 * loaded book is the named customer orders plus the records the deterministic filler derives
 * (`src/seed/index.ts`, AAP 0.2.3), so a pair only a generated order states is a lane here like any
 * other, and a pair no order states is not.
 *
 * @param records The loaded record set, read and not modified.
 * @returns One lane per distinct plant-to-customer pair, in order-book order.
 * @throws Problem - A `'validation'` failure naming an order whose plant or customer the record set does
 *   not hold.
 */
function plantToCustomerLanes(records: SeedRecordSet): TopologyLane[] {
  const lanes: TopologyLane[] = [];
  const seen: string[] = [];

  for (const order of records.customerOrders) {
    if (!records.plants.some((plant) => plant.id === order.plantId)) {
      throw recordGap(
        `Customer order ${order.id} is shipped by plant ${order.plantId}, which the plant records do not ` +
          'hold, so the canvas cannot place the lane it states.',
      );
    }

    if (!records.customers.some((customer) => customer.id === order.customerId)) {
      throw recordGap(
        `Customer order ${order.id} names customer ${order.customerId}, which the customer records do ` +
          'not hold, so the canvas cannot place the lane it states.',
      );
    }

    const pair = `${order.plantId}|${order.customerId}`;

    if (seen.includes(pair)) {
      continue;
    }

    seen.push(pair);
    lanes.push({ fromId: order.plantId, toId: order.customerId });
  }

  return lanes;
}

/* ---------------------------------------------------------------------------------------------
 * Pin counts — AAP 0.2.1, AAP 0.12.2, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * Reads one seeded pin count as a total a badge can render.
 *
 * The seeded tally is a record, not a computation: this module never counts a pin record, and the value
 * copied here is the tally's own number. A member that is absent, negative or fractional is a broken tally
 * rather than a zero, so it is reported instead of being defaulted — a badge that silently showed nothing
 * would hide the evidence the node carries.
 *
 * @param nodeId The node the tally belongs to, for the failure's message.
 * @param state The pin state being read, for the failure's message.
 * @param value The seeded count.
 * @returns The count, unchanged.
 * @throws Problem - A `'validation'` failure naming the node and the state whose total is unusable.
 */
function pinCountOf(nodeId: string, state: PinState, value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw recordGap(
      `The pin tally recorded for node ${nodeId} carries no usable ${state} total, so the canvas cannot ` +
        'badge the node.',
    );
  }

  return value;
}

/**
 * Copies one node's seeded tally into a `PinCounts` carrying all six states.
 *
 * `src/types/topology.ts` fixes `PinCounts` as a full `Record<PinState, number>`, so every state is a key
 * whether or not it was counted, and this copy states each one explicitly for exactly that reason: a
 * partial copy would not compile, and a state the seeded tally omitted could not be papered over with a
 * zero the records never recorded.
 *
 * @param nodeId The node the tally belongs to, for a failure's message.
 * @param seeded The seeded counts for that node.
 * @returns A fresh counts object with all six states.
 */
function pinCountsOf(nodeId: string, seeded: PinCounts): PinCounts {
  return {
    empty: pinCountOf(nodeId, 'empty', seeded.empty),
    pending: pinCountOf(nodeId, 'pending', seeded.pending),
    pass: pinCountOf(nodeId, 'pass', seeded.pass),
    fail: pinCountOf(nodeId, 'fail', seeded.fail),
    stale: pinCountOf(nodeId, 'stale', seeded.stale),
    review: pinCountOf(nodeId, 'review', seeded.review),
  };
}

/**
 * Copies the session's per-node pin counts into the payload's map, for the nodes the payload holds.
 *
 * A node the seeded tally does not list has no pins at all and is left out of the map rather than entered
 * with six zeros, which is the reading `src/types/topology.ts` fixes: "a node missing from this map has no
 * pins", so the canvas renders it with no badge instead of a badge of nothing. A node the narrowed
 * network no longer holds is left out for the same reason: a count beside nothing would badge a node the
 * payload does not carry, so the map describes exactly the nodes returned beside it.
 *
 * @param seeded The per-node tally the session holds.
 * @param retained The node identifiers the payload holds, read in any order and not modified.
 * @returns A fresh map, one entry per retained and counted node, in the order the tally states them.
 */
function copyPinCounts(
  seeded: Readonly<Record<string, PinCounts>>,
  retained: readonly string[],
): Record<string, PinCounts> {
  const counts: Record<string, PinCounts> = {};

  for (const [nodeId, seededCounts] of Object.entries(seeded)) {
    if (retained.includes(nodeId)) {
      counts[nodeId] = pinCountsOf(nodeId, seededCounts);
    }
  }

  return counts;
}

/* ---------------------------------------------------------------------------------------------
 * The scope a read is narrowed by — AAP 0.2.1, AAP 0.12.1 "Scope resolution"
 * ------------------------------------------------------------------------------------------- */

/**
 * The one scope a read of the canvas is served under.
 *
 * The shell's plant and product selection is resolved against the acting role's plant scope here, once,
 * by the one resolver, and the answer narrows the payload and the ribbon alike: the canvas then describes
 * the same scope the queue and the overview beside it do (AAP 0.2.1). Nothing in this module re-derives a
 * scope, reads a store or looks at a URL.
 *
 * @param ctx The session and the persona the call acts as, whose role caps the selection.
 * @param selection The shell's selection as the adapter carried it: one plant and one product, each
 *   absent for "all".
 * @returns The resolved scope; its `plants` member empty means nothing is in scope.
 */
function scopeOf(ctx: HandlerContext, selection: ScopeFilterInput): Scope {
  return resolveScope(selection, ctx.actor.role);
}

/**
 * Whether one of the scope's plants is the node a plant-anchored lane endpoint names.
 *
 * A lane endpoint is a node identifier rather than a `PlantId`, so the comparison is made here once and
 * the narrowing below states no plant identifier of its own (rule P-6). An empty `scope.plants` matches
 * nothing, which is the "nothing is in scope" reading `src/domain/aggregation/scope.ts` fixes.
 *
 * @param scope The resolved scope.
 * @param nodeId The node identifier a lane endpoint carries.
 * @returns `true` when the scope names that plant.
 */
function withinScope(scope: Scope, nodeId: string): boolean {
  return scope.plants.some((plantId) => plantId === nodeId);
}

/**
 * The nodes of one family the narrowed network keeps.
 *
 * A node is kept when a retained lane touches it. A node no lane touches anywhere in the whole network is
 * kept as well: the records place it at no plant, so no plant can narrow it, and dropping it would strand
 * the evidence-pin counts its record carries (the first OPEN ITEM in this module's header). An anchored
 * node whose lanes were all narrowed away is dropped, because the records do place it at a plant outside
 * the scope.
 *
 * @param nodes The family as the records state it, in record order.
 * @param retainedLanes The lanes the scope keeps, read and not modified.
 * @param anchoredIds The identifiers of the family's nodes the whole network places at a plant, read from
 *   every lane of that family's own kind before narrowing.
 * @returns The retained nodes, in the family's own order.
 */
function retainedNodes(
  nodes: readonly TopologyNode[],
  retainedLanes: readonly TopologyLane[],
  anchoredIds: readonly string[],
): TopologyNode[] {
  const reached: string[] = [];

  for (const lane of retainedLanes) {
    for (const endpoint of [lane.fromId, lane.toId]) {
      if (!reached.includes(endpoint)) {
        reached.push(endpoint);
      }
    }
  }

  return nodes.filter((node) => reached.includes(node.id) || !anchoredIds.includes(node.id));
}

/* ---------------------------------------------------------------------------------------------
 * The read — AAP 0.12.3, `GET /topology` (S2 only)
 * ------------------------------------------------------------------------------------------- */

/**
 * Reads the FileMap canvas's topology: the four node families, the lanes joining them and each node's
 * evidence-pin counts, narrowed to the one resolved scope.
 *
 * The whole payload is a reading of the session's records through the permission matrix; nothing is
 * computed and no figure is stated. Both lenses of the canvas draw from this one value, so a selection and
 * a scope cannot be described differently by the map and by the graph (AAP 0.12.4, SCR-12).
 *
 * The narrowing is the scope's, and it is the rule the module header states: the plant nodes are the
 * plants in scope, a lane survives when it is anchored on an in-scope plant or reaches a retained
 * supplier, and a supplier, origin or customer node survives when a retained lane touches it or when no
 * lane places it at a plant at all. `pinsByNode` carries a count only for a node the payload still holds,
 * so a badge can never outlive its node. An empty `scope.plants` therefore narrows the plant-anchored part
 * of the network away, which is the "nothing is in scope" reading rather than "all plants".
 *
 * @param ctx The session and the persona the call acts as.
 * @param selection The shell's plant and product selection, which the one resolver intersects with the
 *   role's plant scope before the payload is narrowed.
 * @returns The topology, freshly built on every call so a caller cannot alter the session through it.
 * @throws Problem - A `'permission'` failure when the role may not read the canvas or the forbidden trigger
 *   is on, or a `'validation'` failure when a lane or a pin tally references a record the set does not
 *   hold.
 */
export async function getTopology(
  ctx: HandlerContext,
  selection: ScopeFilterInput,
): Promise<Topology> {
  assertCanvasReadable(ctx);

  const { records } = ctx.state;
  const scope = scopeOf(ctx, selection);

  const supplierLanes = supplierToPlantLanes(records);
  const retainedSupplierLanes = supplierLanes.filter((lane) => withinScope(scope, lane.toId));
  const suppliers = retainedNodes(
    supplierNodes(records),
    retainedSupplierLanes,
    supplierLanes.map((lane) => lane.fromId),
  );
  const supplierIds = suppliers.map((node) => node.id);

  const originLanes = originToSupplierLanes(records);
  const retainedOriginLanes = originLanes.filter((lane) => supplierIds.includes(lane.toId));
  const origins = retainedNodes(
    originNodes(records),
    retainedOriginLanes,
    originLanes.map((lane) => lane.fromId),
  );

  const customerLanes = plantToCustomerLanes(records);
  const retainedCustomerLanes = customerLanes.filter((lane) => withinScope(scope, lane.fromId));
  const customers = retainedNodes(
    customerNodes(records),
    retainedCustomerLanes,
    customerLanes.map((lane) => lane.toId),
  );

  const plants = plantNodes(records).filter((node) => withinScope(scope, node.id));
  const nodeIds = [...plants, ...suppliers, ...origins, ...customers].map((node) => node.id);

  return {
    plants,
    suppliers,
    origins,
    customers,
    lanes: [...retainedOriginLanes, ...retainedSupplierLanes, ...retainedCustomerLanes],
    pinsByNode: copyPinCounts(records.pinsByNode, nodeIds),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The ribbon — SCR-12, AAP 0.12.1, AAP 0.12.4
 * ------------------------------------------------------------------------------------------- */

/**
 * The freshness record a read of the canvas reports.
 *
 * The order-book source's own record, so a figure drawn from the order book and the stock is qualified by
 * the instant that source last answered, and a stale or unavailable state the popover triggered reaches
 * this read exactly as it reaches the shell's freshness strip (AAP 0.2.1, T-13). The record comes from
 * `freshnessFor(state)` and is never rebuilt here, so there is one answer to "how current is this
 * source?" rather than two.
 *
 * @param state The session whose triggers and seeded source health are read. Not modified.
 * @returns The order-book source's freshness record, or the first reported source's when the catalogue
 *   does not carry that source.
 * @throws Problem - A `'validation'` failure when the source catalogue reports no health at all, because
 *   the read would then have no state to qualify itself with.
 */
function readFreshness(state: MockState): Freshness {
  const report = freshnessFor(state);
  const orderBook = report.find((entry) => entry.source === ORDER_BOOK_SOURCE);

  if (orderBook !== undefined) {
    return orderBook;
  }

  const [first] = report;

  if (first !== undefined) {
    return first;
  }

  throw recordGap(
    'The source catalogue reports no health, so a read of the canvas cannot state the state of the ' +
      'records behind it.',
  );
}

/**
 * The baseline measurement of every exception that carries a solver case.
 *
 * AAP 0.8 fixes the baseline as the do-nothing solve, and the affected-lines rule reads it to derive the
 * orders an exception places at risk, which is why the aggregate bundle carries it rather than solving
 * inside the aggregate. Exactly one seeded exception names a case, so this is one solve per call; the
 * solver is a pure function of the case record and the levers, so two calls measure the same baseline
 * (AAP 0.18.2).
 *
 * @param records The loaded record set, read and not modified.
 * @returns One baseline per exception carrying a solver case, in exception record order.
 * @throws Problem - A `'validation'` failure when an exception names a case the record set does not hold,
 *   because a line built from an invented measurement is a figure rule P-6 forbids.
 */
function baselineSolves(records: SeedRecordSet): BaselineSolve[] {
  const solves: BaselineSolve[] = [];

  for (const exception of records.exceptions) {
    const caseId = exception.solverCaseId;

    if (caseId === undefined) {
      continue;
    }

    const solverCase = records.solverCases.find((candidate) => candidate.id === caseId);

    if (solverCase === undefined) {
      throw recordGap(
        `Exception ${exception.id} names solver case ${caseId}, which the record set does not hold, so ` +
          'its affected lines cannot be measured.',
      );
    }

    solves.push({
      exceptionId: exception.id,
      result: solveSupplyDelay(solverCase, DO_NOTHING_LEVERS),
    });
  }

  return solves;
}

/**
 * The record bundle the queue's and the overview's aggregates read, built from the session's records.
 *
 * `OverviewInput` extends `ExceptionAggregateInput`, so one bundle serves both reads: the two are then
 * computed over the same exceptions, the same prices, the same order book and the same baseline solves,
 * which is what makes a filtered canvas and a filtered queue describe the same population (AAP 0.2.1,
 * AAP 0.12.1). Every member is a record the session holds or the aggregate's own declared shape, so the
 * bundle states no figure and copies nothing the record does not say.
 *
 * @param state The session whose records and triggers are read. Not modified.
 * @param exceptions The exceptions the reads are computed over: the record set's own, or an empty
 *   collection when the queue has been emptied.
 * @returns The bundle, freshly allocated on every call.
 */
function aggregateBundle(
  state: MockState,
  exceptions: readonly OperationalException[],
): OverviewInput {
  const { records } = state;

  return {
    exceptions,
    products: records.products,
    customerOrders: records.customerOrders,
    baselines: baselineSolves(records),
    freshness: readFreshness(state),
    asOf: DEMO_CLOCK,
    plants: records.plants,
    materials: records.materials,
    history: records.exceptionHistory,
    approvals: records.approvals,
  };
}

/**
 * Reads the six tiles of the FileMap canvas ribbon for one scope.
 *
 * The ribbon adds no arithmetic of its own: `computeRibbonTiles` copies the overview's aggregate values
 * and counts the rows handed to it, so every tile is a computed figure and the canvas can neither supply
 * nor alter one (rule P-6). The tiles carry no caption, evidence reference or simulation label, because
 * those belong to the component that renders them (rule P-1, AAP 0.10).
 *
 * The empty-queue trigger empties the exception collection the bundle is built from, so the overview and
 * the rows are computed over the same emptied set: the canvas's tiles and the queue's rows then agree
 * instead of the ribbon counting exceptions the queue no longer lists (AAP 0.12.4, T-17). The topology
 * itself is untouched by that trigger, which is why this behaviour lives here and not in `getTopology`.
 *
 * @param ctx The session and the persona the call acts as.
 * @param selection The shell's plant and product selection, resolved here by the same one resolver the
 *   topology read uses, so the tiles count the rows the queue shows under the same filters.
 * @returns Six tiles, in the order `src/domain/aggregation/urgency.ts` states.
 * @throws Problem - A `'permission'` failure when the role may not read the canvas or the forbidden
 *   trigger is on, or a `'validation'` failure when the records a figure is drawn from do not resolve.
 */
export async function getCanvasRibbon(
  ctx: HandlerContext,
  selection: ScopeFilterInput,
): Promise<RibbonTile[]> {
  assertCanvasReadable(ctx);

  const scope = scopeOf(ctx, selection);
  const emptied = isSimulationOn(ctx.state, 'empty-queue');
  const bundle = aggregateBundle(ctx.state, emptied ? [] : ctx.state.records.exceptions);

  return computeRibbonTiles(computeOverview(bundle, scope), computeExceptionRows(bundle, scope));
}
