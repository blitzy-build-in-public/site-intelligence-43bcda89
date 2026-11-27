// @vitest-environment node

/**
 * The aggregation suite of `src/domain/aggregation` — the folder's single test module.
 *
 * What it proves. The five modules beside this file compute the aggregates of `platform-contracts.md`
 * §5 (AAP 0.8, AAP 0.12.1): the affected lines an exception places at risk, the revenue those lines
 * represent, the exception queue's rows, the overview's four tiles with its by-plant table, its
 * fourteen-day series, its changed-since list, its median hours to an approved plan and its
 * alternate-source readiness share, the outbound ledger's two counts, the FileMap canvas ribbon's six
 * tiles, the urgent ordering the queue and the canvas stack share, a package's readiness as a whole
 * percent, and the one scope resolver every list
 * call and every aggregate read the same selection through. The probe cases pin each rule against the
 * value the rule produces from records built here, and the seed comparison at the end of the file pins
 * the seeded records' own aggregates against the fixture; every case is named for the aggregate and
 * the member it measures, so a failure names both.
 *
 * THE §13 EXPECTED-AGGREGATES COMPARISON IS IN THIS FILE, AND WHAT IT PROVES. AAP 0.8 holds the seed
 * document's expected aggregates as `tests/fixtures/aggregates-expected.ts` and makes this module the
 * place they are compared, and the last section below is that comparison. It composes the record
 * bundle the adapter composes — the seeded exceptions, products, order book, baseline solves, plants,
 * materials, activity trail and approvals, at the constant clock contracts §1 fixes and at the
 * all-plants, all-products scope the demonstration loads with — and compares the fixture against what
 * the modules return, failing on the first surface, key and value that differ:
 * - the overview's five tiles, its four by-plant rows and its fourteen-day opened-and-resolved series;
 * - each exception's revenue at risk and each exception's affected lines;
 * - the ledger's allowed and blocked counts for every endpoint the sovereignty record declares;
 * - each part-approval package's passing elements, element count and whole-percent readiness;
 * - the queue's default ordering, which is the urgency rule applied to the labels it reads.
 *
 * Two surfaces are not in that comparison, and neither is given a placeholder. The overview's
 * changed-since list is left out because its members are record text and record instants rather than a
 * computed figure, so a fixture for it would restate seeded sentences; and the canvas ribbon is left
 * out because it adds no figure of its own — its five copied members are the tiles compared above, its
 * critical count is a count of the rows the ordering case already reads, and its plants-in-scope value
 * is the length of the by-plant table compared above.
 *
 * The probe records. Every record here is built by this suite from `PROBE` identifiers, small whole
 * numbers and probe prices that no seed record carries, so a probe value cannot be mistaken for a
 * seeded one and no seed figure is restated. Every expected value is derived from those probe inputs
 * by the rule under test — a repeat count from the length of the array that carries the events, a
 * money figure from the units and the price the records state, a duration from the two instants the
 * trail records, a readiness from `wholePercent` over the package's own element count — so a wrong
 * computation fails here instead of being recorded as the expected one (rule P-6).
 *
 * Two invariants the screens rest on are proven here rather than assumed. A role-scoped selection
 * narrows the queue and the overview to the same population, so a filtered queue and a filtered
 * overview cannot disagree (AAP 0.2.1); and no aggregate output pairs a first-party figure with a
 * market-intelligence one, because no aggregate in this folder reads a market-intelligence value at
 * all and every ribbon tile states its provenance as `computed` (rule P-5).
 *
 * Rules this module is built to satisfy:
 * - P-6: no business figure is typed here. Every expectation is derived from the probe inputs by the
 *   rule under test or read from `tests/fixtures/aggregates-expected.ts`, which rule P-6 makes the one
 *   home of an expected figure, and the only rounding used is the folder's own `halfUp2` and
 *   `wholePercent`.
 * - P-5: the provenance-separation case proves no aggregate can blend a competitor figure into a
 *   first-party one. No atlas type and no market-intelligence record is imported here: the named
 *   imports this module takes from the shared barrel are the entity, DTO and primitive types the
 *   aggregates themselves declare, so nothing a competitor figure reaches the suite through exists in
 *   its vocabulary.
 * - P-2: it imports the five sibling modules, the scope resolver, two permission and rounding
 *   helpers, the seeded record set, the audit chain that links it and `vitest` — no service module and
 *   no React — so the aggregates are exercised exactly as the adapter exercises them. The seed imports
 *   are the documented exception the note above them states.
 * - P-4: no case title or comment claims these aggregates establish sovereignty, prevent copying or
 *   resist tampering; they report counts and amounts and claim nothing beyond them.
 * - P-7: the identifiers are test-local and carry `PROBE`; no company, person, vendor or product of
 *   the real world is named and no filler prose appears.
 * - P-3: where a role's plant scope is used, it is the demonstration's browser-side scoping, which
 *   narrows a read and grants nothing.
 * - B-1, B-2: the suite contacts no host, addresses none and holds no credential-shaped literal;
 *   nothing reads configuration.
 *
 * The Node environment is declared on line 1, the only position the runner reads it from, rather than
 * inherited from the shared jsdom default: not one case below renders, queries or measures anything,
 * so a DOM would be machinery a pure arithmetic suite never touches.
 */

import { describe, expect, it } from 'vitest';

import type {
  AffectedLine,
  Approval,
  AuditEvent,
  AuditResult,
  ExceptionId,
  ExceptionRow,
  ExceptionStatus,
  Freshness,
  Money,
  OperationalException,
  OrderResult,
  PackageId,
  PinState,
  PlantId,
  PpapElement,
  PpapPackage,
  Role,
  Scope,
  Severity,
  SolverResult,
  Timestamp,
} from '../../types';
import { DEMO_CLOCK, GENESIS_PREVIOUS_HASH } from '../../types';

import { plantScopeFor } from '../policy/permissions';
import { halfUp2, wholePercent } from '../solver/rounding';
import {
  baselineViewFor,
  computeExceptionRows,
  resolveAffectedLines,
  revenueAtRisk,
  type BaselineSolve,
  type ExceptionAggregateInput,
  type OrderBookEntry,
  type PricedProduct,
} from './exceptions';
import { computeLedger } from './ledger';
import {
  computeOverview,
  type ActivityRecord,
  type NamedPlant,
  type OverviewInput,
  type SourcedMaterial,
} from './overview';
import { resolveScope, type ScopeFilterInput } from './scope';
import { computeRibbonTiles, sortUrgent } from './urgency';

/*
 * The seeded record set is reached here for one reason: AAP 0.8 holds the seed document's expected
 * aggregates as a fixture and makes this suite the place they are compared, and a comparison cannot
 * exist without the records the aggregates are computed over. The bundle below is the one the mock
 * adapter's own bundle builder composes, member for member, from the same records — including the
 * baseline solves the adapter takes with `solveSupplyDelay` at the do-nothing levers, because the
 * affected-lines rule reads a measurement rather than a stored figure.
 *
 * Rule P-2 bars components and screens from reaching records and makes the mock adapter the one road to
 * the data at runtime; this is a suite, and the boundary it keeps is asserted by
 * `tests/source-checks/no-seed-import-outside-mock.test.ts`, which has to treat an import of a seed
 * record by a test file as this documented exception rather than as a screen's shortcut — the same
 * exception `src/services/service-conformance.test.ts` records for the seed names it reads. The audit
 * chain is imported for the ledger comparison alone: `computeLedger` counts linked events, so the
 * drafts are linked here the way the adapter's bootstrap links them, with real hashes rather than
 * placeholders.
 */
import { appendEvent } from '../audit/chain';
import { solveSupplyDelay } from '../solver/solve-supply-delay';
import { APPROVALS } from '../../seed/approvals';
import { SEEDED_AUDIT_EVENTS } from '../../seed/audit-events';
import { CUSTOMER_ORDERS } from '../../seed/customer-orders';
import { EXCEPTION_HISTORY } from '../../seed/exception-history';
import { EXCEPTIONS } from '../../seed/exceptions';
import { MATERIALS as SEEDED_MATERIALS } from '../../seed/materials';
import { PPAP_PACKAGES } from '../../seed/packages';
import { PLANTS as SEEDED_PLANTS } from '../../seed/plants';
import { PRODUCTS } from '../../seed/products';
import { SOLVER_CASES } from '../../seed/solver-cases';
import { SOURCES } from '../../seed/sources';
import { SOVEREIGNTY } from '../../seed/sovereignty';
import {
  EXPECTED_AFFECTED_LINES_BY_EXCEPTION,
  EXPECTED_BY_PLANT,
  EXPECTED_LEDGER_COUNTS_BY_ENDPOINT,
  EXPECTED_OPEN_RESOLVED_SERIES,
  EXPECTED_OVERVIEW_TILES,
  EXPECTED_PACKAGE_READINESS,
  EXPECTED_REVENUE_AT_RISK_BY_EXCEPTION,
  EXPECTED_URGENT_ORDER,
} from '../../../tests/fixtures/aggregates-expected';

/* ---------------------------------------------------------------------------------------------
 * A. The demonstration clock and the probe instants
 * ------------------------------------------------------------------------------------------- */

/** Milliseconds in an hour: the unit every probe duration below is derived in. */
const MILLIS_PER_HOUR = 3_600_000;

/**
 * Probe instants, each written once and each stated by its distance from the demonstration clock.
 *
 * Contracts §1 fixes the constant clock, so every "now" the aggregates measure against is
 * `DEMO_CLOCK` and no case reads the system clock. The instants below are the two ends of the trails
 * and the detections the ages and the fourteen-day series are counted from.
 */

/** Detection 48 hours before the clock: the day before the as-of date. */
const DETECTED_48_HOURS: Timestamp = '2026-12-01T08:00:00+01:00';

/** Detection 30 hours before the clock, which falls on the as-of date's own day minus one. */
const DETECTED_30_HOURS: Timestamp = '2026-12-02T02:00:00+01:00';

/** Detection 20 hours before the clock. */
const DETECTED_20_HOURS: Timestamp = '2026-12-02T12:00:00+01:00';

/** Detection 10 hours before the clock: the same day as the two above, later. */
const DETECTED_10_HOURS: Timestamp = '2026-12-02T22:00:00+01:00';

/** Detection 100 hours before the clock: four days earlier, inside the fourteen-day series. */
const DETECTED_100_HOURS: Timestamp = '2026-11-29T04:00:00+01:00';

/** Detection 200 hours before the clock: eight days earlier, also inside the series. */
const DETECTED_200_HOURS: Timestamp = '2026-11-24T00:00:00+01:00';

/** The earliest `opened` activity of the first exception, nine hours before its approval. */
const OPENED_FIRST: Timestamp = '2026-12-01T08:00:00+01:00';

/** The approval of the first exception, nine hours after its detection. */
const APPROVED_FIRST: Timestamp = '2026-12-01T17:00:00+01:00';

/** The `opened` activity of the second exception, eighteen hours before its approval. */
const OPENED_SECOND: Timestamp = '2026-12-02T12:00:00+01:00';

/** The approval of the second exception, eighteen hours after its detection. */
const APPROVED_SECOND: Timestamp = '2026-12-03T06:00:00+01:00';

/** The `opened` activity of the third exception, thirty hours before its approval. */
const OPENED_THIRD: Timestamp = '2026-11-29T04:00:00+01:00';

/** The approval of the third exception, the longest of the three qualifying durations. */
const APPROVED_THIRD: Timestamp = '2026-11-30T10:00:00+01:00';

/** A `resolved` activity, which the fourteen-day series counts and the tiles do not. */
const RESOLVED_THIRD: Timestamp = '2026-12-02T09:00:00+01:00';

/** A detection whose exception never carried an approval, so it cannot qualify for the median. */
const OPENED_UNQUALIFIED: Timestamp = '2026-12-02T02:00:00+01:00';

/** When the probe approval was decided, inside the changed-since window. */
const DECIDED_APPROVAL: Timestamp = '2026-12-02T10:00:00+01:00';

/** An instant forty days before the clock: outside the ledger's thirty-day window. */
const LONG_BEFORE_WINDOW: Timestamp = '2026-10-24T09:00:00+01:00';

/* ---------------------------------------------------------------------------------------------
 * B. The probe products, order book and source state
 * ------------------------------------------------------------------------------------------- */

/**
 * Two probe products, each with the unit price the revenue rule multiplies by.
 *
 * A product record's price is record content, which is exactly what the rule reads: the suite states
 * an input here and derives every money figure from it, and it states no expected amount.
 */
const PRODUCT_A: PricedProduct = { id: 'PRD-PROBE-A', priceEur: 12.5 };

/** The second probe product, priced so a mixed set of lines values to a distinguishable total. */
const PRODUCT_B: PricedProduct = { id: 'PRD-PROBE-B', priceEur: 40 };

/** Units the first probe exception places at risk on its single stored line. */
const UNITS_FIRST = 4;

/** Units the second probe exception places at risk. */
const UNITS_SECOND = 2;

/** Units the third probe exception places at risk. */
const UNITS_THIRD = 3;

/** Units the fifth probe exception places at risk. */
const UNITS_FIFTH = 1;

/** Units on the resolved exception's line, which no open tile counts. */
const UNITS_RESOLVED = 1;

/** A unit count no line can mean, which the aggregate must read as placing nothing at risk. */
const UNITS_UNUSABLE = -3;

/** Units the baseline solve leaves late on the first order of the probe case. */
const BASELINE_UNITS_LATE_ONE = 5;

/** Units the baseline solve leaves late on the third order of the probe case. */
const BASELINE_UNITS_LATE_THREE = 3;

/** Units the baseline solve leaves late on the second order: none, so no line is derived for it. */
const BASELINE_UNITS_LATE_TWO = 0;

/** Units a stored line carries when the solve does not measure that order, so the record stands. */
const STORED_UNITS_UNMEASURED = 6;

/** Units a stored line carries when the solve measures it, which the solve's figure replaces. */
const STORED_UNITS_OVERRIDDEN = 99;

/** The order book: one entry per customer order a probe line or a probe solve names. */
const ORDER_ONE: OrderBookEntry = {
  id: 'CO-PROBE-1',
  productId: PRODUCT_A.id,
  plantId: 'PLT-RGB',
  dueDate: '2027-03-10',
};

/** The second order, of the second product at the second plant. */
const ORDER_TWO: OrderBookEntry = {
  id: 'CO-PROBE-2',
  productId: PRODUCT_B.id,
  plantId: 'PLT-BRN',
  dueDate: '2027-03-12',
};

/** The third order, of the first product at the third plant. */
const ORDER_THREE: OrderBookEntry = {
  id: 'CO-PROBE-3',
  productId: PRODUCT_A.id,
  plantId: 'PLT-RAK',
  dueDate: '2027-03-15',
};

/** The source state a read was served under, copied onto every queue row unchanged. */
const SOURCE_STATE: Freshness = { source: 'erp', asOf: DEMO_CLOCK, state: 'fresh' };

/* ---------------------------------------------------------------------------------------------
 * C. The probe exceptions
 * ------------------------------------------------------------------------------------------- */

/**
 * The members each probe exception varies; every other member is the same for all of them.
 *
 * Stating the varying members in one shape keeps each probe record to the facts that matter to the
 * rule it exercises, and the builder below fills the rest with values that carry no meaning for any
 * aggregate under test — an owner, a material, a supplier and a line that no case reads.
 */
interface ProbeExceptionSpec {
  /** The exception's identifier, which orders the queue and keys the baseline solves. */
  readonly id: ExceptionId;

  /** The plant the disruption lands on. */
  readonly plantId: PlantId;

  /** The further plants it reaches, which the queue's plant filter also matches. */
  readonly alsoAffectsPlantIds?: readonly PlantId[];

  /** How urgently it needs a response, the urgency ordering's first key. */
  readonly severity: Severity;

  /** Where it stands, which decides whether the open tiles count it. */
  readonly status: ExceptionStatus;

  /** Working days until the impact reaches a customer order, the ordering's second key. */
  readonly daysToImpact: number;

  /** When it was detected, which its age and the fourteen-day series are counted from. */
  readonly detectedAt: Timestamp;

  /** The customer order lines it places at risk. */
  readonly affectedLines: readonly AffectedLine[];

  /** The solver case it is measured against, present only on the probes that test a baseline. */
  readonly solverCaseId?: string;
}

/**
 * Builds one probe exception from the members a case varies.
 *
 * The builder returns a fresh record with fresh arrays, so a case that mutates what it is handed
 * cannot reach another case's input, and the records the immutability cases deep-clone are the ones
 * the aggregates were called with.
 *
 * @param spec The members this probe varies.
 * @returns A complete `OperationalException` whose other members are inert for every rule under test.
 */
function probeException(spec: ProbeExceptionSpec): OperationalException {
  return {
    id: spec.id,
    title: `${spec.id} probe exception`,
    type: 'probe-exception',
    severity: spec.severity,
    status: spec.status,
    plantId: spec.plantId,
    alsoAffectsPlantIds: [...(spec.alsoAffectsPlantIds ?? [])],
    materialId: 'MAT-PROBE-1',
    supplierId: 'SUP-PROBE-1',
    purchaseOrderId: 'PO-PROBE-1',
    lineId: 'LN-PROBE-1',
    ownerId: 'USR-PROBE-1',
    daysToImpact: spec.daysToImpact,
    affectedLines: spec.affectedLines.map((line) => ({ ...line })),
    ...(spec.solverCaseId === undefined ? {} : { solverCaseId: spec.solverCaseId }),
    missingInputs: [],
    confidence: { level: 'high', reason: 'The probe record states every input the rule reads.' },
    whatChanged: `${spec.id} is a probe record built by this suite.`,
    detectedAt: spec.detectedAt,
  };
}

/**
 * Builds one affected line from an order-book entry and a unit count.
 *
 * The line's product, plant and promise date come from the order it belongs to, which is the shape
 * the aggregate expects, so a case states only the count it wants the rule to read.
 *
 * @param order The order the line belongs to.
 * @param unitsAtRisk The units of that line placed at risk.
 * @returns A fresh `AffectedLine`.
 */
function probeLine(order: OrderBookEntry, unitsAtRisk: number): AffectedLine {
  return {
    orderId: order.id,
    productId: order.productId,
    plantId: order.plantId,
    dueDate: order.dueDate,
    unitsAtRisk,
  };
}

/** The first exception: open, critical, at the first plant, reaching the second. */
const EXCEPTION_FIRST = probeException({
  id: 'EXC-PROBE-1',
  plantId: 'PLT-RGB',
  alsoAffectsPlantIds: ['PLT-BRN'],
  severity: 'critical',
  status: 'open',
  daysToImpact: 2,
  detectedAt: DETECTED_48_HOURS,
  affectedLines: [probeLine(ORDER_ONE, UNITS_FIRST)],
});

/** The second exception: open, at the fourth plant, reaching nothing else. */
const EXCEPTION_SECOND = probeException({
  id: 'EXC-PROBE-2',
  plantId: 'PLT-RAK',
  severity: 'high',
  status: 'open',
  daysToImpact: 3,
  detectedAt: DETECTED_30_HOURS,
  affectedLines: [probeLine(ORDER_THREE, UNITS_SECOND)],
});

/** The third exception: open, at the second plant, the earliest impact of the open set. */
const EXCEPTION_THIRD = probeException({
  id: 'EXC-PROBE-3',
  plantId: 'PLT-BRN',
  severity: 'high',
  status: 'open',
  daysToImpact: 1,
  detectedAt: DETECTED_20_HOURS,
  affectedLines: [probeLine(ORDER_TWO, UNITS_THIRD)],
});

/** The fourth exception: resolved, so no open tile counts it, but it keeps its line and its plan. */
const EXCEPTION_RESOLVED = probeException({
  id: 'EXC-PROBE-4',
  plantId: 'PLT-RGB',
  severity: 'low',
  status: 'resolved',
  daysToImpact: 9,
  detectedAt: DETECTED_100_HOURS,
  affectedLines: [probeLine(ORDER_ONE, UNITS_RESOLVED)],
});

/** The fifth exception: open, landing at the second plant and reaching the third. */
const EXCEPTION_FIFTH = probeException({
  id: 'EXC-PROBE-5',
  plantId: 'PLT-BRN',
  alsoAffectsPlantIds: ['PLT-QRO'],
  severity: 'medium',
  status: 'open',
  daysToImpact: 6,
  detectedAt: DETECTED_10_HOURS,
  affectedLines: [probeLine(ORDER_TWO, UNITS_FIFTH)],
});

/** The sixth exception: resolved, carrying no line, the record the changed-since case reads. */
const EXCEPTION_WITH_DECISION = probeException({
  id: 'EXC-PROBE-6',
  plantId: 'PLT-RGB',
  severity: 'low',
  status: 'resolved',
  daysToImpact: 12,
  detectedAt: DETECTED_200_HOURS,
  affectedLines: [],
});

/**
 * Builds one per-order result of a probe solve.
 *
 * @param orderId The order the result is about.
 * @param unitsLate How many of its units the solve leaves late.
 * @returns A fresh `OrderResult` with a day count that follows the units it reports.
 */
function probeOrderResult(orderId: string, unitsLate: number): OrderResult {
  return { orderId, unitsLate, daysLate: unitsLate > 0 ? 1 : 0 };
}

/**
 * Builds a complete probe solve from the orders it measures.
 *
 * Every aggregate under test reads two members of a solve — the per-order results and nothing else —
 * so the remaining members are the neutral values a do-nothing baseline carries: no cost, no idle
 * days, no side effect and no write-back.
 *
 * @param orders The per-order results the solve reports.
 * @returns A fresh `SolverResult` over those orders.
 */
function probeSolve(orders: readonly OrderResult[]): SolverResult {
  return {
    unitsLate: orders.reduce((total, order) => total + order.unitsLate, 0),
    maxDaysLate: 0,
    ordersOnTime: orders.filter((order) => order.unitsLate === 0).length,
    ordersTotal: orders.length,
    addedCostEur: 0,
    lineIdleDays: 0,
    revenueDelayedEur: 0,
    runOut: { day: 0, fractionOfDay: 0 },
    dailyClosingStock: [],
    orders: orders.map((order) => ({ ...order })),
    constraintCheck: 'pass',
    constraintMessages: [],
    sideEffects: [],
    writeBacks: [],
    levers: { airSets: 0, transferSets: 0 },
    confidence: { level: 'high', reason: 'The probe solve states every order it measures.' },
  };
}

/** An exception whose record names a solver case, so its lines come from the baseline solve. */
const EXCEPTION_WITH_CASE = probeException({
  id: 'EXC-PROBE-7',
  plantId: 'PLT-RGB',
  severity: 'critical',
  status: 'open',
  daysToImpact: 4,
  detectedAt: DETECTED_30_HOURS,
  affectedLines: [probeLine(ORDER_ONE, STORED_UNITS_OVERRIDDEN)],
  solverCaseId: 'CASE-PROBE-1',
});

/** An exception whose stored line the solve does not measure, so the record's own count stands. */
const EXCEPTION_UNMEASURED_LINE = probeException({
  id: 'EXC-PROBE-8',
  plantId: 'PLT-BRN',
  severity: 'high',
  status: 'open',
  daysToImpact: 5,
  detectedAt: DETECTED_20_HOURS,
  affectedLines: [probeLine(ORDER_ONE, STORED_UNITS_UNMEASURED)],
  solverCaseId: 'CASE-PROBE-2',
});

/** An exception whose line states a unit count no line can mean. */
const EXCEPTION_UNUSABLE_UNITS = probeException({
  id: 'EXC-PROBE-9',
  plantId: 'PLT-RGB',
  severity: 'low',
  status: 'open',
  daysToImpact: 7,
  detectedAt: DETECTED_10_HOURS,
  affectedLines: [probeLine(ORDER_THREE, UNITS_UNUSABLE)],
});

/** The baseline of the first case-bearing exception: one order late, one on time, one late. */
const BASELINE_MEASURED: BaselineSolve = {
  exceptionId: EXCEPTION_WITH_CASE.id,
  result: probeSolve([
    probeOrderResult(ORDER_ONE.id, BASELINE_UNITS_LATE_ONE),
    probeOrderResult(ORDER_TWO.id, BASELINE_UNITS_LATE_TWO),
    probeOrderResult(ORDER_THREE.id, BASELINE_UNITS_LATE_THREE),
  ]),
};

/** The baseline that measures an order the second case-bearing exception does not name. */
const BASELINE_UNMEASURED: BaselineSolve = {
  exceptionId: EXCEPTION_UNMEASURED_LINE.id,
  result: probeSolve([probeOrderResult(ORDER_TWO.id, BASELINE_UNITS_LATE_TWO)]),
};

/* ---------------------------------------------------------------------------------------------
 * D. The record bundles the aggregates are called with
 * ------------------------------------------------------------------------------------------- */

/**
 * The bundle every queue case reads: six exceptions, two prices, three orders, no baseline solve.
 *
 * No case below changes a probe record in place, so one bundle serves every read and the
 * immutability cases can deep-clone it and compare afterwards.
 */
const RECORD_BUNDLE: ExceptionAggregateInput = {
  exceptions: [
    EXCEPTION_FIRST,
    EXCEPTION_SECOND,
    EXCEPTION_THIRD,
    EXCEPTION_RESOLVED,
    EXCEPTION_FIFTH,
    EXCEPTION_WITH_DECISION,
  ],
  products: [PRODUCT_A, PRODUCT_B],
  customerOrders: [ORDER_ONE, ORDER_TWO, ORDER_THREE],
  baselines: [],
  freshness: SOURCE_STATE,
  asOf: DEMO_CLOCK,
};

/** The bundle the baseline cases read: the two case-bearing exceptions and their solves. */
const BASELINE_BUNDLE: ExceptionAggregateInput = {
  ...RECORD_BUNDLE,
  exceptions: [EXCEPTION_WITH_CASE, EXCEPTION_UNMEASURED_LINE],
  baselines: [BASELINE_MEASURED, BASELINE_UNMEASURED],
};

/** The plant records the by-plant rows take their display names from. */
const PLANTS: readonly NamedPlant[] = [
  { id: 'PLT-RGB', name: 'Probe final assembly' },
  { id: 'PLT-BRN', name: 'Probe machining' },
  { id: 'PLT-QRO', name: 'Probe kits' },
  { id: 'PLT-RAK', name: 'Probe components' },
];

/**
 * The material master the alternate-source readiness cases read.
 *
 * Eight materials go into the first probe product, three of them carried by a second supplier as well,
 * and two go into the second product alone, one of which has an alternate. The eight over three is the
 * half-percent tie `wholePercent` rounds up, and the two the first product does not reach are the ones
 * a share that ignored the product selection would count, so one figure proves the admission, the part,
 * the whole and the rounding from these records alone (rule P-6). No percentage is written here: the
 * cases derive it from the records the same way the aggregate does.
 */
const MATERIALS: readonly SourcedMaterial[] = [
  { id: 'MAT-SOURCE-PROBE-1', productIds: [PRODUCT_A.id], alternateSupplierId: 'SUP-SOURCE-PROBE-1' },
  { id: 'MAT-SOURCE-PROBE-2', productIds: [PRODUCT_A.id], alternateSupplierId: 'SUP-SOURCE-PROBE-2' },
  {
    id: 'MAT-SOURCE-PROBE-3',
    productIds: [PRODUCT_A.id, PRODUCT_B.id],
    alternateSupplierId: 'SUP-SOURCE-PROBE-3',
  },
  { id: 'MAT-SOURCE-PROBE-4', productIds: [PRODUCT_A.id] },
  { id: 'MAT-SOURCE-PROBE-5', productIds: [PRODUCT_A.id] },
  { id: 'MAT-SOURCE-PROBE-6', productIds: [PRODUCT_A.id] },
  { id: 'MAT-SOURCE-PROBE-7', productIds: [PRODUCT_A.id] },
  { id: 'MAT-SOURCE-PROBE-8', productIds: [PRODUCT_A.id] },
  { id: 'MAT-SOURCE-PROBE-9', productIds: [PRODUCT_B.id], alternateSupplierId: 'SUP-SOURCE-PROBE-4' },
  { id: 'MAT-SOURCE-PROBE-10', productIds: [PRODUCT_B.id] },
];

/** The note the trail states when it mirrors the probe approval, which the overview lists once. */
const MIRRORED_APPROVAL_NOTE = 'Probe: the trail mirrors the approval this record states.';

/** The comment the probe approval's decision carries, which the changed-since list shows. */
const DECISION_COMMENT = 'Probe: the plan was approved by this suite.';

/**
 * The activity trail the overview reads: three qualifying plans, one resolution and one mirror.
 *
 * The three `opened`-then-`approved` pairs give the median its population — nine hours, eighteen
 * hours and thirty hours — and the second exception carries an `opened` activity with no approval,
 * so the case also proves that an unqualified exception contributes nothing to the tile.
 */
const HISTORY: readonly ActivityRecord[] = [
  {
    exceptionId: EXCEPTION_FIRST.id,
    occurredAt: OPENED_FIRST,
    action: 'opened',
    note: 'Probe: the first exception was detected.',
  },
  {
    exceptionId: EXCEPTION_FIRST.id,
    occurredAt: APPROVED_FIRST,
    action: 'approved',
    note: 'Probe: a plan was approved for the first exception.',
  },
  {
    exceptionId: EXCEPTION_SECOND.id,
    occurredAt: OPENED_UNQUALIFIED,
    action: 'opened',
    note: 'Probe: the second exception was detected and never planned.',
  },
  {
    exceptionId: EXCEPTION_THIRD.id,
    occurredAt: OPENED_SECOND,
    action: 'opened',
    note: 'Probe: the third exception was detected.',
  },
  {
    exceptionId: EXCEPTION_THIRD.id,
    occurredAt: APPROVED_SECOND,
    action: 'approved',
    note: 'Probe: a plan was approved for the third exception.',
  },
  {
    exceptionId: EXCEPTION_RESOLVED.id,
    occurredAt: OPENED_THIRD,
    action: 'opened',
    note: 'Probe: the fourth exception was detected.',
  },
  {
    exceptionId: EXCEPTION_RESOLVED.id,
    occurredAt: APPROVED_THIRD,
    action: 'approved',
    note: 'Probe: a plan was approved for the fourth exception.',
  },
  {
    exceptionId: EXCEPTION_RESOLVED.id,
    occurredAt: RESOLVED_THIRD,
    action: 'resolved',
    note: 'Probe: the fourth exception was resolved.',
  },
  {
    exceptionId: EXCEPTION_WITH_DECISION.id,
    occurredAt: DECIDED_APPROVAL,
    action: 'approved',
    note: MIRRORED_APPROVAL_NOTE,
  },
];

/** The decided approval the changed-since list reports from its own record. */
const APPROVAL_DECIDED: Approval = {
  id: 'APR-PROBE-1',
  exceptionId: EXCEPTION_WITH_DECISION.id,
  scenarioId: 'SCN-PROBE-1-a',
  requestedBy: 'USR-PROBE-1',
  eligibleApproverRoles: ['plant-manager'],
  status: 'approved',
  addedCostEur: PRODUCT_A.priceEur,
  protectedRevenueEur: PRODUCT_B.priceEur,
  decision: { action: 'approve', comment: DECISION_COMMENT },
  decidedBy: 'USR-PROBE-2',
  decidedAt: DECIDED_APPROVAL,
  writeBacks: [],
  outcomeReviewed: false,
};

/**
 * The bundle the overview is computed from: the queue's records plus the plants, the material master,
 * the trail and the approvals.
 */
const OVERVIEW_BUNDLE: OverviewInput = {
  ...RECORD_BUNDLE,
  plants: PLANTS,
  materials: MATERIALS,
  history: HISTORY,
  approvals: [APPROVAL_DECIDED],
};

/** The resolved selection covering every plant: what a cross-plant role's read carries. */
const EVERY_PLANT: Scope = { plants: plantScopeFor('head-of-supply-chain'), products: [] };

/* ---------------------------------------------------------------------------------------------
 * E. Helpers that read an aggregate's output without a non-null assertion
 * ------------------------------------------------------------------------------------------- */

/**
 * Measures the hours between two instants, so a duration expectation is derived from the records.
 *
 * @param from The earlier instant.
 * @param to The later instant.
 * @returns The elapsed hours, exact to the millisecond.
 */
function hoursBetweenInstants(from: Timestamp, to: Timestamp): number {
  return (Date.parse(to) - Date.parse(from)) / MILLIS_PER_HOUR;
}

/**
 * Takes the middle value of an odd-length population, which is the median the tile reports.
 *
 * @param values The durations the trail produced, in any order.
 * @returns The middle duration.
 * @throws Error when the population is empty, which no qualifying probe case is.
 */
function middleOf(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = sorted[Math.floor(sorted.length / 2)];

  if (middle === undefined) {
    throw new Error('The probe population must not be empty.');
  }

  return middle;
}

/**
 * Finds one queue row by identifier.
 *
 * @param rows The rows the aggregate returned.
 * @param id The identifier to find.
 * @returns That row.
 * @throws Error when the aggregate returned no row for the identifier.
 */
function rowOf(rows: readonly ExceptionRow[], id: ExceptionId): ExceptionRow {
  const row = rows.find((candidate) => candidate.id === id);

  if (row === undefined) {
    throw new Error(`The aggregate returned no row for ${id}.`);
  }

  return row;
}

/**
 * Takes the one affected line a case expects.
 *
 * @param lines The lines the aggregate returned.
 * @returns The only line.
 * @throws Error unless exactly one line was returned.
 */
function soleLine(lines: readonly AffectedLine[]): AffectedLine {
  const line = lines[0];

  if (line === undefined || lines.length !== 1) {
    throw new Error(`Expected exactly one affected line; received ${lines.length}.`);
  }

  return line;
}

/* ---------------------------------------------------------------------------------------------
 * F. The one scope resolver — AAP 0.2.1; AAP 0.12.1, "Scope resolution"
 * ------------------------------------------------------------------------------------------- */

describe('resolveScope', () => {
  it('resolves the all-plants selection to the plant scope the acting role holds', () => {
    const scope = resolveScope({}, 'plant-manager');

    expect(scope.plants).toEqual(plantScopeFor('plant-manager'));
    expect(scope.products).toEqual([]);
  });

  it('keeps a plant selection the role may see and drops the role plants it does not name', () => {
    const selection: ScopeFilterInput = { plantId: 'PLT-BRN' };

    expect(resolveScope(selection, 'material-planner').plants).toEqual([selection.plantId]);
  });

  it('resolves a plant selection outside the role scope to nothing rather than widening it', () => {
    const scope = resolveScope({ plantId: 'PLT-RAK' }, 'plant-manager');

    expect(scope.plants).toEqual([]);
  });

  it('narrows nothing for a role whose scope covers every plant', () => {
    const scope = resolveScope({}, 'head-of-supply-chain');

    expect(scope.plants).toEqual(plantScopeFor('head-of-supply-chain'));
    expect(scope.plants.length).toBe(plantScopeFor('head-of-supply-chain').length);
  });

  it('passes the product selection through, because no role narrows a product', () => {
    const scope = resolveScope({ productId: PRODUCT_A.id }, 'external-supplier-engineer');

    expect(scope.products).toEqual([PRODUCT_A.id]);
    expect(scope.plants).toEqual(plantScopeFor('external-supplier-engineer'));
  });

  it('keeps the canonical plant order however the selection was made', () => {
    const scope = resolveScope({}, 'production-planner');

    expect(scope.plants).toEqual(plantScopeFor('production-planner'));
  });

  it('returns fresh arrays and leaves the selection it was handed unchanged', () => {
    const selection: ScopeFilterInput = { plantId: 'PLT-BRN', productId: PRODUCT_B.id };
    const first = resolveScope(selection, 'material-planner');
    const second = resolveScope(selection, 'material-planner');

    first.plants.push('PLT-RAK');
    first.products.push(PRODUCT_A.id);

    expect(second.plants).toEqual(plantScopeFor('material-planner').filter((plant) => plant === 'PLT-BRN'));
    expect(selection).toEqual({ plantId: 'PLT-BRN', productId: PRODUCT_B.id });
    expect(resolveScope({}, 'material-planner').plants).toEqual(plantScopeFor('material-planner'));
  });
});

/* ---------------------------------------------------------------------------------------------
 * G. The affected lines, the revenue at risk and the queue rows — contracts §5; AAP 0.8
 * ------------------------------------------------------------------------------------------- */

describe('revenueAtRisk', () => {
  it('values a stored line at its units times the product price, closed once', () => {
    const revenue = revenueAtRisk(EXCEPTION_FIRST, baselineViewFor(RECORD_BUNDLE, EXCEPTION_FIRST));

    expect(revenue).toBe(halfUp2(UNITS_FIRST * PRODUCT_A.priceEur));
  });

  it('sums a set of lines of two products without rounding any line on its way in', () => {
    const mixed = probeException({
      id: 'EXC-PROBE-MIXED',
      plantId: 'PLT-BRN',
      severity: 'medium',
      status: 'open',
      daysToImpact: 8,
      detectedAt: DETECTED_10_HOURS,
      affectedLines: [probeLine(ORDER_ONE, UNITS_FIRST), probeLine(ORDER_TWO, UNITS_THIRD)],
    });
    const bundle: ExceptionAggregateInput = { ...RECORD_BUNDLE, exceptions: [mixed] };

    expect(revenueAtRisk(mixed, baselineViewFor(bundle, mixed))).toBe(
      halfUp2(UNITS_FIRST * PRODUCT_A.priceEur + UNITS_THIRD * PRODUCT_B.priceEur),
    );
  });

  it('reports nothing at risk for an exception whose lines place no units at risk', () => {
    const bundle: ExceptionAggregateInput = {
      ...RECORD_BUNDLE,
      exceptions: [EXCEPTION_UNUSABLE_UNITS],
    };

    expect(
      revenueAtRisk(EXCEPTION_UNUSABLE_UNITS, baselineViewFor(bundle, EXCEPTION_UNUSABLE_UNITS)),
    ).toBe(halfUp2(0));
  });

  it('refuses rather than inventing a price for a product the records do not carry', () => {
    const bundleWithoutProductA: ExceptionAggregateInput = { ...RECORD_BUNDLE, products: [PRODUCT_B] };

    expect(() =>
      revenueAtRisk(EXCEPTION_FIRST, baselineViewFor(bundleWithoutProductA, EXCEPTION_FIRST)),
    ).toThrow(PRODUCT_A.id);
  });
});

describe('resolveAffectedLines', () => {
  it('copies the lines the record stores when the exception carries no solver case', () => {
    const lines = resolveAffectedLines(EXCEPTION_FIRST, baselineViewFor(RECORD_BUNDLE, EXCEPTION_FIRST));

    expect(lines).toHaveLength(EXCEPTION_FIRST.affectedLines.length);
    expect(soleLine(lines).unitsAtRisk).toBe(UNITS_FIRST);
    expect(soleLine(lines).orderId).toBe(ORDER_ONE.id);
  });

  it('takes the units from the baseline solve for an order the solve measures', () => {
    const lines = resolveAffectedLines(
      EXCEPTION_WITH_CASE,
      baselineViewFor(BASELINE_BUNDLE, EXCEPTION_WITH_CASE),
    );

    expect(lines.map((line) => line.orderId)).toEqual([ORDER_ONE.id, ORDER_THREE.id]);
    expect(lines.map((line) => line.unitsAtRisk)).toEqual([
      BASELINE_UNITS_LATE_ONE,
      BASELINE_UNITS_LATE_THREE,
    ]);
  });

  it('derives no line for an order the solve leaves nothing late, and one for an order the record omits', () => {
    const lines = resolveAffectedLines(
      EXCEPTION_WITH_CASE,
      baselineViewFor(BASELINE_BUNDLE, EXCEPTION_WITH_CASE),
    );
    const orderIds = lines.map((line) => line.orderId);

    expect(orderIds).not.toContain(ORDER_TWO.id);
    expect(orderIds).toContain(ORDER_THREE.id);
    expect(lines.map((line) => line.unitsAtRisk)).not.toContain(STORED_UNITS_OVERRIDDEN);
  });

  it('keeps the stored count when the solve does not measure that order', () => {
    const lines = resolveAffectedLines(
      EXCEPTION_UNMEASURED_LINE,
      baselineViewFor(BASELINE_BUNDLE, EXCEPTION_UNMEASURED_LINE),
    );

    expect(soleLine(lines).unitsAtRisk).toBe(STORED_UNITS_UNMEASURED);
    expect(soleLine(lines).orderId).toBe(ORDER_ONE.id);
  });

  it('reads a unit count no line can mean as placing nothing at risk', () => {
    const lines = resolveAffectedLines(
      EXCEPTION_UNUSABLE_UNITS,
      baselineViewFor(RECORD_BUNDLE, EXCEPTION_UNUSABLE_UNITS),
    );

    expect(soleLine(lines).unitsAtRisk).toBe(0);
    expect(soleLine(lines).orderId).toBe(ORDER_THREE.id);
  });

  it('returns fresh lines, so a caller may format one without reaching the record behind it', () => {
    const lines = resolveAffectedLines(EXCEPTION_FIRST, baselineViewFor(RECORD_BUNDLE, EXCEPTION_FIRST));
    const stored = EXCEPTION_FIRST.affectedLines[0];

    expect(stored).toBeDefined();
    expect(lines[0]).not.toBe(stored);
  });
});

/* ---------------------------------------------------------------------------------------------
 * H. The queue rows — specification SCR-02; AAP 0.12.2 ExceptionRow
 * ------------------------------------------------------------------------------------------- */

describe('computeExceptionRows', () => {
  it('prices each row from its affected lines and returns the rows in identifier order', () => {
    const rows = computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT);

    expect(rows.map((row) => row.id)).toEqual(
      [...RECORD_BUNDLE.exceptions.map((exception) => exception.id)].sort((left, right) =>
        left < right ? -1 : 1,
      ),
    );
    expect(rowOf(rows, EXCEPTION_FIRST.id).revenueAtRiskEur).toBe(
      halfUp2(UNITS_FIRST * PRODUCT_A.priceEur),
    );
    expect(rowOf(rows, EXCEPTION_THIRD.id).revenueAtRiskEur).toBe(
      halfUp2(UNITS_THIRD * PRODUCT_B.priceEur),
    );
  });

  it('measures the age of each row in hours from its detection against the demonstration clock', () => {
    const rows = computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT);

    expect(rowOf(rows, EXCEPTION_FIRST.id).ageHours).toBe(
      hoursBetweenInstants(EXCEPTION_FIRST.detectedAt, DEMO_CLOCK),
    );
    expect(rowOf(rows, EXCEPTION_FIFTH.id).ageHours).toBe(
      hoursBetweenInstants(EXCEPTION_FIFTH.detectedAt, DEMO_CLOCK),
    );
  });

  it('copies the state of the read onto every row rather than storing one on the record', () => {
    const rows = computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT);

    expect(rows.every((row) => row.freshness.source === SOURCE_STATE.source)).toBe(true);
    expect(rows.every((row) => row.freshness.asOf === SOURCE_STATE.asOf)).toBe(true);
    expect(rows[0]?.freshness).not.toBe(SOURCE_STATE);
  });

  it('admits an exception that reaches a plant in scope without landing on it', () => {
    const scope: Scope = { plants: ['PLT-BRN'], products: [] };
    const rows = computeExceptionRows(RECORD_BUNDLE, scope);

    expect(rows.map((row) => row.id)).toContain(EXCEPTION_FIRST.id);
    expect(rows.map((row) => row.id)).not.toContain(EXCEPTION_SECOND.id);
  });

  it('admits nothing when the resolved scope names no plant, never reading that as all plants', () => {
    const scope: Scope = { plants: [], products: [] };

    expect(computeExceptionRows(RECORD_BUNDLE, scope)).toEqual([]);
  });

  it('filters the queue by the selected product over the products the rows name', () => {
    const scope: Scope = { plants: plantScopeFor('platform-administrator'), products: [PRODUCT_B.id] };
    const rows = computeExceptionRows(RECORD_BUNDLE, scope);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.productIds.includes(PRODUCT_B.id))).toBe(true);
    expect(rows.map((row) => row.id)).not.toContain(EXCEPTION_FIRST.id);
  });

  it('lists the distinct products of a row in the order its lines state them', () => {
    const twoProducts = probeException({
      id: 'EXC-PROBE-TWO',
      plantId: 'PLT-BRN',
      severity: 'low',
      status: 'open',
      daysToImpact: 11,
      detectedAt: DETECTED_48_HOURS,
      affectedLines: [probeLine(ORDER_TWO, UNITS_THIRD), probeLine(ORDER_ONE, UNITS_FIRST)],
    });
    const bundle: ExceptionAggregateInput = { ...RECORD_BUNDLE, exceptions: [twoProducts] };
    const row = rowOf(computeExceptionRows(bundle, EVERY_PLANT), twoProducts.id);
    const singleProductRow = rowOf(
      computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT),
      EXCEPTION_FIRST.id,
    );

    expect(row.productIds).toEqual(twoProducts.affectedLines.map((line) => line.productId));
    expect(row.revenueAtRiskEur).toBe(
      halfUp2(UNITS_THIRD * PRODUCT_B.priceEur + UNITS_FIRST * PRODUCT_A.priceEur),
    );
    expect(singleProductRow.productIds).toEqual([PRODUCT_A.id]);
  });

  it('carries a baseline-measured exception value from the solve, not from its stored line', () => {
    const scope: Scope = { plants: plantScopeFor('platform-administrator'), products: [] };
    const rows = computeExceptionRows(BASELINE_BUNDLE, scope);

    expect(rowOf(rows, EXCEPTION_WITH_CASE.id).revenueAtRiskEur).toBe(
      halfUp2(
        BASELINE_UNITS_LATE_ONE * PRODUCT_A.priceEur +
          BASELINE_UNITS_LATE_THREE * PRODUCT_A.priceEur,
      ),
    );
  });

  it('returns deeply equal rows on two calls and leaves the records it read unchanged', () => {
    const before = structuredClone(RECORD_BUNDLE);
    const first = computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT);
    const second = computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT);

    expect(second).toEqual(first);
    expect(RECORD_BUNDLE).toEqual(before);
  });
});


/* ---------------------------------------------------------------------------------------------
 * I. The overview — contracts §5; AAP 0.8; AAP 0.12.2 Overview
 * ------------------------------------------------------------------------------------------- */

/** The days the overview's open-and-resolved series covers, fixed by SCR-01. */
const SERIES_DAYS = 14;

/** Characters in a `YYYY-MM-DD` calendar date, which is how an instant's own day is read. */
const ISO_DATE_LENGTH = 10;

/** A role whose plant scope is one plant: the single-plant half of the narrowing invariant. */
const SINGLE_PLANT_ROLE: Role = 'plant-manager';

/** A role whose plant scope covers every plant: the cross-plant half of the same invariant. */
const CROSS_PLANT_ROLE: Role = 'head-of-supply-chain';

/**
 * Says whether one exception lands on, or reaches, a plant the resolved selection names.
 *
 * @param bundle The bundle the rows were computed from.
 * @param id The exception to place.
 * @param scope The resolved scope.
 * @returns `true` when the exception's own plant or a plant it also affects is in the selection.
 */
function landsInScope(bundle: ExceptionAggregateInput, id: ExceptionId, scope: Scope): boolean {
  const exception = bundle.exceptions.find((candidate) => candidate.id === id);

  if (exception === undefined) {
    return false;
  }

  return (
    scope.plants.includes(exception.plantId) ||
    exception.alsoAffectsPlantIds.some((plantId) => scope.plants.includes(plantId))
  );
}

/**
 * Sums the revenue of the open rows, which is the figure the revenue tile must state.
 *
 * @param rows The queue rows the same scope produced.
 * @returns Their open revenue, closed once the way the tile closes it.
 */
function openRevenueOf(rows: readonly ExceptionRow[]): Money {
  return halfUp2(
    rows
      .filter((row) => row.status === 'open')
      .reduce((total, row) => total + row.revenueAtRiskEur, 0),
  );
}

describe('computeOverview', () => {
  it('counts the open exceptions the scope admits and sums exactly their revenue at risk', () => {
    const scope: Scope = { plants: plantScopeFor(CROSS_PLANT_ROLE), products: [] };
    const overview = computeOverview(OVERVIEW_BUNDLE, scope);
    const rows = computeExceptionRows(RECORD_BUNDLE, scope);

    expect(overview.openExceptions).toBe(rows.filter((row) => row.status === 'open').length);
    expect(overview.revenueAtRiskEur).toBe(openRevenueOf(rows));
    expect(overview.openExceptions).not.toBe(rows.length);
  });

  it('counts the distinct customer orders the open exceptions place at risk', () => {
    const overview = computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT);
    const ordersAtRisk = new Set(
      RECORD_BUNDLE.exceptions
        .filter((exception) => exception.status === 'open')
        .flatMap((exception) => exception.affectedLines.map((line) => line.orderId)),
    );

    expect(overview.customerOrdersAtRisk).toBe(ordersAtRisk.size);
  });

  it('reports the middle detection-to-approval hours of every exception carrying a plan', () => {
    const overview = computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT);
    const durations = [
      hoursBetweenInstants(OPENED_FIRST, APPROVED_FIRST),
      hoursBetweenInstants(OPENED_SECOND, APPROVED_SECOND),
      hoursBetweenInstants(OPENED_THIRD, APPROVED_THIRD),
    ];

    expect(overview.medianHoursToApprovedPlan).toBe(middleOf(durations));
  });

  it('keeps a fractional median when an even number of plans qualifies', () => {
    const withoutTheLongestPlan: OverviewInput = {
      ...OVERVIEW_BUNDLE,
      history: HISTORY.filter((record) => record.exceptionId !== EXCEPTION_RESOLVED.id),
    };
    const overview = computeOverview(withoutTheLongestPlan, EVERY_PLANT);
    const shortest = hoursBetweenInstants(OPENED_FIRST, APPROVED_FIRST);
    const longest = hoursBetweenInstants(OPENED_SECOND, APPROVED_SECOND);

    expect(overview.medianHoursToApprovedPlan).toBe((shortest + longest) / 2);
    expect(Number.isInteger(overview.medianHoursToApprovedPlan)).toBe(false);
  });

  it('reports the alternate-source readiness of the materials the product selection reaches', () => {
    const everyProduct: Scope = { plants: plantScopeFor(CROSS_PLANT_ROLE), products: [] };
    const firstProduct: Scope = { ...everyProduct, products: [PRODUCT_A.id] };
    const narrowed = computeOverview(OVERVIEW_BUNDLE, firstProduct).alternateSourceReadinessPercent;
    const whole = computeOverview(OVERVIEW_BUNDLE, everyProduct).alternateSourceReadinessPercent;
    const reached = MATERIALS.filter((material) => material.productIds.includes(PRODUCT_A.id));
    const covered = reached.filter((material) => material.alternateSupplierId !== undefined).length;
    const coveredEverywhere = MATERIALS.filter(
      (material) => material.alternateSupplierId !== undefined,
    ).length;
    const exactPercentage = (covered / reached.length) * 100;

    expect(reached.length).toBeLessThan(MATERIALS.length);
    expect(narrowed).toBe(wholePercent(covered / reached.length));
    expect(narrowed).not.toBe(whole);
    expect(whole).toBe(wholePercent(coveredEverywhere / MATERIALS.length));
    expect(exactPercentage % 1).toBe(0.5);
    expect(narrowed).toBe(Math.floor(exactPercentage) + 1);
  });

  it('reports zero readiness when the product selection reaches no material at all', () => {
    const noProduct: Scope = { plants: plantScopeFor(CROSS_PLANT_ROLE), products: ['PRD-PROBE-NONE'] };

    expect(computeOverview(OVERVIEW_BUNDLE, noProduct).alternateSourceReadinessPercent).toBe(
      wholePercent(0),
    );
  });

  it('splits the open exceptions across the plants in scope so the rows add up to the tiles', () => {
    const scope: Scope = { plants: plantScopeFor(CROSS_PLANT_ROLE), products: [] };
    const overview = computeOverview(OVERVIEW_BUNDLE, scope);

    expect(overview.byPlant.map((row) => row.plantId)).toEqual(scope.plants);
    expect(overview.byPlant.reduce((total, row) => total + row.openExceptions, 0)).toBe(
      overview.openExceptions,
    );
    expect(halfUp2(overview.byPlant.reduce((total, row) => total + row.revenueAtRiskEur, 0))).toBe(
      overview.revenueAtRiskEur,
    );
  });

  it('keeps a zero row for a plant in scope with nothing open', () => {
    const overview = computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT);
    const silentPlant = overview.byPlant.find(
      (row) =>
        !RECORD_BUNDLE.exceptions.some(
          (exception) => exception.status === 'open' && exception.plantId === row.plantId,
        ),
    );
    const plantId = silentPlant?.plantId;

    expect(silentPlant).toBeDefined();
    expect(silentPlant?.openExceptions).toBe(0);
    expect(silentPlant?.revenueAtRiskEur).toBe(halfUp2(0));
    expect(silentPlant?.plantName).toBe(PLANTS.find((plant) => plant.id === plantId)?.name);
  });

  it('groups an exception under the plant in scope it reaches, not the one it lands on', () => {
    const scope: Scope = { plants: ['PLT-QRO'], products: [] };
    const overview = computeOverview(OVERVIEW_BUNDLE, scope);
    const reaching = RECORD_BUNDLE.exceptions.find((exception) =>
      exception.alsoAffectsPlantIds.includes('PLT-QRO'),
    );
    const unitsAtRisk = reaching?.affectedLines[0]?.unitsAtRisk;

    expect(reaching).toBeDefined();
    expect(overview.byPlant.map((row) => row.plantId)).toEqual(scope.plants);
    expect(overview.openExceptions).toBe(1);
    expect(overview.revenueAtRiskEur).toBe(halfUp2((unitsAtRisk ?? 0) * PRODUCT_B.priceEur));
  });

  it('counts the exceptions opened and resolved on each of the days ending on the clock date', () => {
    const overview = computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT);
    const series = overview.openResolvedSeries;
    const lastPoint = series[series.length - 1];
    const clockDate = DEMO_CLOCK.slice(0, ISO_DATE_LENGTH);
    const busiestDate = DETECTED_30_HOURS.slice(0, ISO_DATE_LENGTH);
    const busiestPoint = series.find((point) => point.date === busiestDate);

    expect(series).toHaveLength(SERIES_DAYS);
    expect(series.map((point) => point.date)).toEqual([...series.map((point) => point.date)].sort());
    expect(lastPoint?.date).toBe(clockDate);
    expect(lastPoint?.open).toBe(
      RECORD_BUNDLE.exceptions.filter((exception) => exception.detectedAt.startsWith(clockDate))
        .length,
    );
    expect(busiestPoint?.open).toBe(
      RECORD_BUNDLE.exceptions.filter((exception) => exception.detectedAt.startsWith(busiestDate))
        .length,
    );
    expect(busiestPoint?.resolved).toBe(
      HISTORY.filter(
        (record) => record.action === 'resolved' && record.occurredAt.startsWith(busiestDate),
      ).length,
    );
  });

  it('reports a decision from the approval record and lists the trail activity it mirrors once', () => {
    const overview = computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT);
    const refs = overview.changedSinceLastVisit.map((item) => item.ref);
    const details = overview.changedSinceLastVisit.map((item) => item.detail);

    expect(refs).toContain(APPROVAL_DECIDED.id);
    expect(details).toContain(DECISION_COMMENT);
    expect(details).not.toContain(MIRRORED_APPROVAL_NOTE);
    expect(overview.changedSinceLastVisit.every((item) => item.detail.length > 0)).toBe(true);
  });

  it('computes the same overview twice and leaves the records it read unchanged', () => {
    const before = structuredClone(OVERVIEW_BUNDLE);
    const first = computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT);
    const second = computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT);

    expect(second).toEqual(first);
    expect(OVERVIEW_BUNDLE).toEqual(before);
  });
});

/* ---------------------------------------------------------------------------------------------
 * J. One resolved scope for the queue and the overview — AAP 0.2.1
 * ------------------------------------------------------------------------------------------- */

describe('one resolved scope for the queue and the overview', () => {
  it('narrows the queue and the overview to the same population for a single-plant role', () => {
    const scope = resolveScope({}, SINGLE_PLANT_ROLE);
    const rows = computeExceptionRows(RECORD_BUNDLE, scope);
    const overview = computeOverview(OVERVIEW_BUNDLE, scope);

    expect(scope.plants).toEqual(plantScopeFor(SINGLE_PLANT_ROLE));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => landsInScope(RECORD_BUNDLE, row.id, scope))).toBe(true);
    expect(rows.some((row) => !scope.plants.includes(row.plantId))).toBe(true);
    expect(overview.openExceptions).toBe(rows.filter((row) => row.status === 'open').length);
    expect(overview.revenueAtRiskEur).toBe(openRevenueOf(rows));
    expect(overview.byPlant.map((row) => row.plantId)).toEqual(scope.plants);
    expect(overview.byPlant).toHaveLength(1);
  });

  it('narrows nothing for a cross-plant role, so the queue and the overview still agree', () => {
    const scope = resolveScope({}, CROSS_PLANT_ROLE);
    const rows = computeExceptionRows(RECORD_BUNDLE, scope);
    const overview = computeOverview(OVERVIEW_BUNDLE, scope);

    expect(scope.plants.length).toBe(plantScopeFor(CROSS_PLANT_ROLE).length);
    expect(rows).toHaveLength(RECORD_BUNDLE.exceptions.length);
    expect(overview.openExceptions).toBe(rows.filter((row) => row.status === 'open').length);
    expect(overview.revenueAtRiskEur).toBe(openRevenueOf(rows));
    expect(overview.byPlant).toHaveLength(scope.plants.length);
  });

  it('agrees on the empty selection, since neither read falls back to the records of another plant', () => {
    const scope = resolveScope({ plantId: 'PLT-RAK' }, 'external-supplier-engineer');
    const rows = computeExceptionRows(RECORD_BUNDLE, scope);
    const overview = computeOverview(OVERVIEW_BUNDLE, scope);

    expect(scope.plants).toEqual([]);
    expect(rows).toEqual([]);
    expect(overview.openExceptions).toBe(0);
    expect(overview.revenueAtRiskEur).toBe(halfUp2(0));
    expect(overview.byPlant).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * K. The outbound ledger — contracts §5; AAP 0.8; SCR-07
 * ------------------------------------------------------------------------------------------- */

/** A declared endpoint the probe trail names, whose declared state is blocked. */
const ENDPOINT_BLOCKED = 'probe-endpoint-blocked';

/** A declared endpoint the probe trail names once, from outside the window. */
const ENDPOINT_ALLOWED = 'probe-endpoint-allowed';

/** A declared endpoint no probe event names at all. */
const ENDPOINT_SILENT = 'probe-endpoint-silent';

/** An endpoint the trail names and the declared record does not carry. */
const ENDPOINT_UNDECLARED = 'probe-endpoint-undeclared';

/**
 * The declared configuration the ledger reads: three endpoints, in the record's own order.
 *
 * The ledger's input owns the counted columns, so this declaration carries exactly the three
 * declared members and no hand-written count can enter the call.
 */
const DECLARED_LEDGER: {
  readonly ledger: ReadonlyArray<{
    readonly endpoint: string;
    readonly purpose: string;
    readonly state: 'blocked' | 'allowed';
  }>;
} = {
  ledger: [
    {
      endpoint: ENDPOINT_BLOCKED,
      purpose: 'Probe endpoint the declared configuration blocks.',
      state: 'blocked',
    },
    {
      endpoint: ENDPOINT_ALLOWED,
      purpose: 'Probe endpoint the declared configuration allows.',
      state: 'allowed',
    },
    {
      endpoint: ENDPOINT_SILENT,
      purpose: 'Probe endpoint the demonstration never contacts.',
      state: 'blocked',
    },
  ],
};

/**
 * The members each probe audit event varies; the chain's own members are neutral for the ledger.
 *
 * The ledger reads an event's instant, its object, its result and its sequence, so a probe event
 * needs no real digest: nothing in this folder hashes, and the chain's own suite owns that.
 */
interface ProbeEventSpec {
  /** The event's strictly increasing position in the trail. */
  readonly sequence: number;

  /** The event's identifier, `AUD-nnnnnn`. */
  readonly id: string;

  /** When it was recorded. */
  readonly timestamp: Timestamp;

  /** The record it is about, which is the endpoint the ledger groups by. */
  readonly objectRef: string;

  /** The outcome it records. */
  readonly result: AuditResult;
}

/**
 * Builds one probe audit event from the members the ledger reads.
 *
 * @param spec The members this probe varies.
 * @returns A complete `AuditEvent` whose other members no ledger case reads.
 */
function probeEvent(spec: ProbeEventSpec): AuditEvent {
  return {
    sequence: spec.sequence,
    id: spec.id,
    timestamp: spec.timestamp,
    actorType: 'policy',
    actorId: 'POL-PROBE',
    action: 'outbound-call',
    objectRef: spec.objectRef,
    result: spec.result,
    before: null,
    after: null,
    payloadHash: `probe-payload-${spec.sequence}`,
    traceId: `probe-trace-${spec.sequence}`,
    previousHash: GENESIS_PREVIOUS_HASH,
    eventHash: `probe-event-${spec.sequence}`,
  };
}

/** The events the ledger must count as allowed for the blocked endpoint. */
const ALLOWED_IN_WINDOW: readonly AuditEvent[] = [
  probeEvent({
    sequence: 1,
    id: 'AUD-PROBE-1',
    timestamp: '2026-12-02T09:00:00+01:00',
    objectRef: ENDPOINT_BLOCKED,
    result: 'allowed',
  }),
  probeEvent({
    sequence: 2,
    id: 'AUD-PROBE-2',
    timestamp: '2026-12-01T09:00:00+01:00',
    objectRef: ENDPOINT_BLOCKED,
    result: 'allowed',
  }),
];

/** The events it must count as blocked, one of them on the window's first day. */
const BLOCKED_IN_WINDOW: readonly AuditEvent[] = [
  probeEvent({
    sequence: 3,
    id: 'AUD-PROBE-3',
    timestamp: '2026-11-04T09:00:00+01:00',
    objectRef: ENDPOINT_BLOCKED,
    result: 'blocked',
  }),
];

/** An event naming the blocked endpoint from the day before the window opens. */
const BEFORE_WINDOW: readonly AuditEvent[] = [
  probeEvent({
    sequence: 4,
    id: 'AUD-PROBE-4',
    timestamp: '2026-11-03T09:00:00+01:00',
    objectRef: ENDPOINT_BLOCKED,
    result: 'blocked',
  }),
];

/** Two events inside the window that are neither an allowance nor a block. */
const NEITHER_COLUMN: readonly AuditEvent[] = [
  probeEvent({
    sequence: 5,
    id: 'AUD-PROBE-5',
    timestamp: '2026-12-02T10:00:00+01:00',
    objectRef: ENDPOINT_BLOCKED,
    result: 'succeeded',
  }),
  probeEvent({
    sequence: 6,
    id: 'AUD-PROBE-6',
    timestamp: '2026-12-02T11:00:00+01:00',
    objectRef: ENDPOINT_BLOCKED,
    result: 'failed',
  }),
];

/** The only attempt on record for the second declared endpoint, and it is outside the window. */
const ALLOWED_ENDPOINT_ATTEMPT: readonly AuditEvent[] = [
  probeEvent({
    sequence: 7,
    id: 'AUD-PROBE-7',
    timestamp: '2026-11-03T08:00:00+01:00',
    objectRef: ENDPOINT_ALLOWED,
    result: 'allowed',
  }),
];

/** An event naming an endpoint the declared record does not carry. */
const UNDECLARED_ENDPOINT_EVENT: readonly AuditEvent[] = [
  probeEvent({
    sequence: 8,
    id: 'AUD-PROBE-8',
    timestamp: '2026-12-02T12:00:00+01:00',
    objectRef: ENDPOINT_UNDECLARED,
    result: 'allowed',
  }),
];

/** Every probe event, in sequence order. */
const LEDGER_EVENTS: readonly AuditEvent[] = [
  ...ALLOWED_IN_WINDOW,
  ...BLOCKED_IN_WINDOW,
  ...BEFORE_WINDOW,
  ...NEITHER_COLUMN,
  ...ALLOWED_ENDPOINT_ATTEMPT,
  ...UNDECLARED_ENDPOINT_EVENT,
];

/** The three members of a ledger row the cases below assert on. */
interface CountedLedgerRow {
  /** The endpoint the row reports on. */
  readonly endpoint: string;

  /** When the endpoint was last attempted, or `null` when it never was. */
  readonly lastAttempt: Timestamp | null;

  /** How many calls the trail recorded as allowed over the window. */
  readonly allowed: number;

  /** How many it recorded as blocked over the window. */
  readonly blocked: number;
}

/**
 * Finds one ledger row by endpoint.
 *
 * @param rows The rows the aggregate returned.
 * @param endpoint The endpoint to find.
 * @returns That row.
 * @throws Error when the aggregate returned no row for the endpoint.
 */
function ledgerRowOf(rows: readonly CountedLedgerRow[], endpoint: string): CountedLedgerRow {
  const row = rows.find((candidate) => candidate.endpoint === endpoint);

  if (row === undefined) {
    throw new Error(`The aggregate returned no ledger row for ${endpoint}.`);
  }

  return row;
}

describe('computeLedger', () => {
  it('declares one row per endpoint, in the order the record states them', () => {
    const rows = computeLedger(LEDGER_EVENTS, DECLARED_LEDGER, DEMO_CLOCK);

    expect(rows.map((row) => row.endpoint)).toEqual(
      DECLARED_LEDGER.ledger.map((declared) => declared.endpoint),
    );
  });

  it('counts the allowed and blocked events of the thirty days ending on the clock', () => {
    const rows = computeLedger(LEDGER_EVENTS, DECLARED_LEDGER, DEMO_CLOCK);
    const blockedEndpoint = ledgerRowOf(rows, ENDPOINT_BLOCKED);

    expect(blockedEndpoint.allowed).toBe(ALLOWED_IN_WINDOW.length);
    expect(blockedEndpoint.blocked).toBe(BLOCKED_IN_WINDOW.length);
  });

  it('counts neither a success nor a failure in a column, and nothing from before the window', () => {
    const rows = computeLedger(LEDGER_EVENTS, DECLARED_LEDGER, DEMO_CLOCK);
    const blockedEndpoint = ledgerRowOf(rows, ENDPOINT_BLOCKED);
    const eventsNamingTheEndpoint = LEDGER_EVENTS.filter(
      (event) => event.objectRef === ENDPOINT_BLOCKED,
    );

    expect(blockedEndpoint.allowed + blockedEndpoint.blocked).toBeLessThan(
      eventsNamingTheEndpoint.length,
    );
    expect(blockedEndpoint.allowed + blockedEndpoint.blocked).toBe(
      ALLOWED_IN_WINDOW.length + BLOCKED_IN_WINDOW.length,
    );
  });

  it('reports the most recent attempt on record even when it falls outside the window', () => {
    const rows = computeLedger(LEDGER_EVENTS, DECLARED_LEDGER, DEMO_CLOCK);
    const allowedEndpoint = ledgerRowOf(rows, ENDPOINT_ALLOWED);
    const attempt = ALLOWED_ENDPOINT_ATTEMPT[0];

    expect(attempt).toBeDefined();
    expect(allowedEndpoint.lastAttempt).toBe(attempt?.timestamp);
    expect(allowedEndpoint.allowed).toBe(0);
    expect(allowedEndpoint.blocked).toBe(0);
  });

  it('reports no attempt for an endpoint the trail never names', () => {
    const rows = computeLedger(LEDGER_EVENTS, DECLARED_LEDGER, DEMO_CLOCK);
    const silentEndpoint = ledgerRowOf(rows, ENDPOINT_SILENT);

    expect(silentEndpoint.lastAttempt).toBeNull();
    expect(silentEndpoint.allowed).toBe(0);
    expect(silentEndpoint.blocked).toBe(0);
  });

  it('adds no row for an event naming an endpoint the record does not declare', () => {
    const rows = computeLedger(LEDGER_EVENTS, DECLARED_LEDGER, DEMO_CLOCK);

    expect(rows).toHaveLength(DECLARED_LEDGER.ledger.length);
    expect(rows.map((row) => row.endpoint)).not.toContain(ENDPOINT_UNDECLARED);
  });

  it('derives its counts only from the events it was handed', () => {
    const rows = computeLedger(ALLOWED_IN_WINDOW, DECLARED_LEDGER, DEMO_CLOCK);
    const blockedEndpoint = ledgerRowOf(rows, ENDPOINT_BLOCKED);

    expect(blockedEndpoint.allowed).toBe(ALLOWED_IN_WINDOW.length);
    expect(blockedEndpoint.blocked).toBe(0);
  });

  it('refuses a clock that is not an ISO 8601 instant, since no window follows from it', () => {
    expect(() => computeLedger(LEDGER_EVENTS, DECLARED_LEDGER, 'not-an-instant')).toThrow(
      RangeError,
    );
  });
});

/* ---------------------------------------------------------------------------------------------
 * L. Package readiness — contracts §5; AAP 0.8; AAP 0.12.2 PpapPackage
 * ------------------------------------------------------------------------------------------- */

/**
 * Builds one probe package element in the state the readiness rule counts.
 *
 * @param number The element's position in its package, from one.
 * @param state The pin state the evidence rules produced for it.
 * @returns A fresh `PpapElement` whose rule wording and readings are probe content.
 */
function probeElement(number: number, state: PinState): PpapElement {
  return {
    number,
    name: `Probe element ${number}`,
    state,
    ruleId: 'RULE-DOC',
    ruleText: 'The probe rule states the evidence element this record carries.',
    threshold: 'Probe threshold',
    actual: 'Probe reading',
    extractionConfidence: 0.9,
    humanReviewed: false,
    documentId: 'DOC-PROBE-1',
  };
}

/**
 * Measures a package's readiness from its own elements: passing elements over the element count.
 *
 * The count is the array's own length and never a constant, which is the property the cases below
 * assert; the rounding is `wholePercent`, the folder's single whole-percent helper, so a package
 * with a different number of elements is measured correctly without a second rule.
 *
 * @param elements The package's elements, read and not modified.
 * @returns The readiness as a whole percent, rounded half up.
 * @throws Error when the package states no element, since nothing divides by zero here.
 */
function readinessOf(elements: readonly PpapElement[]): number {
  if (elements.length === 0) {
    throw new Error('A probe package must state at least one element.');
  }

  const passed = elements.filter((element) => element.state === 'pass').length;

  return wholePercent(passed / elements.length);
}

/**
 * Builds a probe package whose readiness the builder computes the way the aggregate must.
 *
 * @param id The package's identifier, `PPAP-nnnn`.
 * @param states One entry per element, in the order the package lists them.
 * @returns A fresh `PpapPackage` carrying that readiness.
 */
function probePackage(id: PackageId, states: readonly PinState[]): PpapPackage {
  const elements = states.map((state, index) => probeElement(index + 1, state));

  return {
    id,
    supplierId: 'SUP-PROBE-1',
    materialId: 'MAT-PROBE-1',
    elements,
    readinessPercent: readinessOf(elements),
  };
}

/** A three-element package with two passing elements, so the percentage is fractional. */
const TWO_OF_THREE = probePackage('PPAP-PROBE-1', ['pass', 'pass', 'fail']);

/** A five-element package holding the same two passing elements over a different total. */
const TWO_OF_FIVE = probePackage('PPAP-PROBE-2', ['pass', 'pass', 'fail', 'fail', 'fail']);

describe('package readiness', () => {
  it('reports readiness as the share of passing elements out of the package element count', () => {
    const passing = TWO_OF_THREE.elements.filter((element) => element.state === 'pass').length;

    expect(passing).toBe(TWO_OF_THREE.elements.length - 1);
    expect(TWO_OF_THREE.readinessPercent).toBe(wholePercent(passing / TWO_OF_THREE.elements.length));
    expect(readinessOf(TWO_OF_THREE.elements)).toBe(TWO_OF_THREE.readinessPercent);
  });

  it('takes the denominator from the element count each package carries, never a fixed count', () => {
    const passing = TWO_OF_FIVE.elements.filter((element) => element.state === 'pass').length;

    expect(TWO_OF_FIVE.elements.length).not.toBe(TWO_OF_THREE.elements.length);
    expect(TWO_OF_FIVE.readinessPercent).toBe(wholePercent(passing / TWO_OF_FIVE.elements.length));
    expect(TWO_OF_FIVE.readinessPercent).not.toBe(TWO_OF_THREE.readinessPercent);
  });

  it('rounds a fractional readiness half up to the next whole percent', () => {
    const passing = TWO_OF_THREE.elements.filter((element) => element.state === 'pass').length;
    const exactPercentage = (passing / TWO_OF_THREE.elements.length) * 100;

    expect(Number.isInteger(exactPercentage)).toBe(false);
    expect(exactPercentage % 1).toBeGreaterThan(0.5);
    expect(TWO_OF_THREE.readinessPercent).toBe(Math.floor(exactPercentage) + 1);
  });
});

/* ---------------------------------------------------------------------------------------------
 * M. The FileMap canvas ribbon — SCR-12; AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

describe('computeRibbonTiles', () => {
  it('emits the six tiles in the order the module states, each with an aggregate key', () => {
    const tiles = computeRibbonTiles(
      computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT),
      computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT),
    );

    expect(tiles).toHaveLength(6);
    expect(tiles.map((tile) => tile.id)).toEqual([
      'open-exceptions',
      'critical-exceptions',
      'revenue-at-risk',
      'customer-orders-at-risk',
      'median-hours-to-approved-plan',
      'plants-in-scope',
    ]);
  });

  it('copies each value from the overview and the rows rather than computing one', () => {
    const overview = computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT);
    const rows = computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT);
    const tiles = computeRibbonTiles(overview, rows);
    const critical = rows.filter((row) => row.severity === 'critical').length;

    expect(tiles.map((tile) => tile.value)).toEqual([
      overview.openExceptions,
      critical,
      overview.revenueAtRiskEur,
      overview.customerOrdersAtRisk,
      overview.medianHoursToApprovedPlan,
      overview.byPlant.length,
    ]);
  });

  it('marks every tile as computed provenance, so a market-intelligence figure cannot share it', () => {
    const tiles = computeRibbonTiles(
      computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT),
      computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT),
    );

    expect(tiles.every((tile) => tile.provenance === 'computed')).toBe(true);
    expect(tiles.map((tile) => tile.provenance)).not.toContain('market_intelligence');
  });

  it('returns fresh tiles on every call and leaves the overview and the rows unchanged', () => {
    const overview = computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT);
    const rows = computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT);
    const first = computeRibbonTiles(overview, rows);
    const second = computeRibbonTiles(overview, rows);

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second[0]).not.toBe(first[0]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * N. The urgent ordering — SCR-02 default sort; SCR-12 urgent stack; AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The members each probe queue row varies, which are the members the ordering reads.
 */
interface ProbeRowSpec {
  /** The exception's identifier, the ordering's final tiebreak. */
  readonly id: ExceptionId;

  /** How urgently it needs a response, the ordering's first key. */
  readonly severity: Severity;

  /** Working days until the impact reaches a customer order, the second key. */
  readonly daysToImpact: number;

  /** The revenue it places at risk, the third key. */
  readonly revenueAtRiskEur: Money;
}

/**
 * Builds one probe queue row.
 *
 * @param spec The members this probe varies.
 * @returns A complete `ExceptionRow` whose other members no ordering case reads.
 */
function probeRow(spec: ProbeRowSpec): ExceptionRow {
  return {
    id: spec.id,
    type: 'probe-exception',
    title: `${spec.id} probe row`,
    productIds: [PRODUCT_A.id],
    plantId: 'PLT-RGB',
    severity: spec.severity,
    revenueAtRiskEur: spec.revenueAtRiskEur,
    daysToImpact: spec.daysToImpact,
    status: 'open',
    ownerId: 'USR-PROBE-1',
    ageHours: 0,
    freshness: { ...SOURCE_STATE },
  };
}

/** A critical row whose impact is further away than the high row it is ordered against. */
const ROW_CRITICAL_DISTANT = probeRow({
  id: 'EXC-PROBE-30',
  severity: 'critical',
  daysToImpact: 9,
  revenueAtRiskEur: PRODUCT_A.priceEur,
});

/** A high row that reaches a customer order tomorrow, and still sorts after the critical one. */
const ROW_HIGH_IMMINENT = probeRow({
  id: 'EXC-PROBE-31',
  severity: 'high',
  daysToImpact: 1,
  revenueAtRiskEur: PRODUCT_B.priceEur,
});

/** A high row agreeing with the previous one on severity and days but worth less. */
const ROW_HIGH_CHEAPER = probeRow({
  id: 'EXC-PROBE-32',
  severity: 'high',
  daysToImpact: 1,
  revenueAtRiskEur: PRODUCT_A.priceEur,
});

/** One of two rows that agree on every business field, so the identifier decides. */
const ROW_TIED_LATER = probeRow({
  id: 'EXC-PROBE-41',
  severity: 'medium',
  daysToImpact: 4,
  revenueAtRiskEur: PRODUCT_A.priceEur,
});

/** The other row of that pair, whose identifier sorts first. */
const ROW_TIED_EARLIER = probeRow({
  id: 'EXC-PROBE-40',
  severity: 'medium',
  daysToImpact: 4,
  revenueAtRiskEur: PRODUCT_A.priceEur,
});

/** The unordered rows a case hands in, kept in a fixed order so immutability is observable. */
const UNSORTED_ROWS: readonly ExceptionRow[] = [
  ROW_HIGH_IMMINENT,
  ROW_TIED_LATER,
  ROW_CRITICAL_DISTANT,
  ROW_TIED_EARLIER,
  ROW_HIGH_CHEAPER,
];

describe('sortUrgent', () => {
  it('orders a critical row ahead of a high row even when the critical impact is further away', () => {
    const ordered = sortUrgent([ROW_HIGH_IMMINENT, ROW_CRITICAL_DISTANT]);

    expect(ordered.map((row) => row.id)).toEqual([ROW_CRITICAL_DISTANT.id, ROW_HIGH_IMMINENT.id]);
    expect(ROW_CRITICAL_DISTANT.daysToImpact).toBeGreaterThan(ROW_HIGH_IMMINENT.daysToImpact);
  });

  it('orders rows agreeing on severity and days by revenue at risk, highest first', () => {
    const ordered = sortUrgent([ROW_HIGH_CHEAPER, ROW_HIGH_IMMINENT]);

    expect(ordered.map((row) => row.id)).toEqual([ROW_HIGH_IMMINENT.id, ROW_HIGH_CHEAPER.id]);
    expect(ROW_HIGH_IMMINENT.revenueAtRiskEur).toBeGreaterThan(ROW_HIGH_CHEAPER.revenueAtRiskEur);
  });

  it('orders rows agreeing on every business field by identifier, so the order is total', () => {
    const ordered = sortUrgent([ROW_TIED_LATER, ROW_TIED_EARLIER]);

    expect(ordered.map((row) => row.id)).toEqual([ROW_TIED_EARLIER.id, ROW_TIED_LATER.id]);
  });

  it('returns a new array and leaves the caller order untouched', () => {
    const handedIn = [...UNSORTED_ROWS];
    const ordered = sortUrgent(handedIn);

    expect(ordered).not.toBe(handedIn);
    expect(handedIn).toEqual([...UNSORTED_ROWS]);
    expect(ordered.map((row) => row.id)).not.toEqual(handedIn.map((row) => row.id));
  });

  it('returns the same order on two calls over the same rows', () => {
    const first = sortUrgent(UNSORTED_ROWS);
    const second = sortUrgent(UNSORTED_ROWS);

    expect(second.map((row) => row.id)).toEqual(first.map((row) => row.id));
  });
});

/* ---------------------------------------------------------------------------------------------
 * O. Provenance separation — rule P-5
 * ------------------------------------------------------------------------------------------- */

describe('provenance separation', () => {
  it('keeps every aggregate first-party, since no competitor figure may share its number', () => {
    const tiles = computeRibbonTiles(
      computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT),
      computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT),
    );
    const rows = computeLedger(LEDGER_EVENTS, DECLARED_LEDGER, DEMO_CLOCK);
    const blockedEndpoint = ledgerRowOf(rows, ENDPOINT_BLOCKED);

    expect(tiles.map((tile) => tile.provenance)).toEqual(tiles.map(() => 'computed'));
    expect(blockedEndpoint.allowed).toBe(ALLOWED_IN_WINDOW.length);
    expect(rows).toHaveLength(DECLARED_LEDGER.ledger.length);
    expect(computeLedger(UNDECLARED_ENDPOINT_EVENT, DECLARED_LEDGER, DEMO_CLOCK)).toEqual(
      DECLARED_LEDGER.ledger.map((declared) => ({
        endpoint: declared.endpoint,
        purpose: declared.purpose,
        state: declared.state,
        lastAttempt: null,
        allowed: 0,
        blocked: 0,
      })),
    );
  });

  it('reports no revenue a first-party record cannot account for', () => {
    const rows = computeExceptionRows(RECORD_BUNDLE, EVERY_PLANT);
    const overview = computeOverview(OVERVIEW_BUNDLE, EVERY_PLANT);
    const firstPartyRevenue = rows
      .filter((row) => row.status === 'open')
      .reduce((total, row) => total + row.revenueAtRiskEur, 0);

    expect(overview.revenueAtRiskEur).toBe(halfUp2(firstPartyRevenue));
  });
});

/* ---------------------------------------------------------------------------------------------
 * P. The seed's expected aggregates — AAP 0.8; contracts §5; the §13 comparison
 *
 * The comparison AAP 0.8 requires and the fixture gives a home: the seeded record set, composed into
 * the bundle the adapter composes, measured by the modules that own each aggregate and compared row by
 * row with `tests/fixtures/aggregates-expected.ts`. The fixture holds the figures and states the
 * arithmetic each one comes from; this section holds no expected figure of its own (rule P-6) and
 * fails on the first surface, key and value that differ, so a regression names the aggregate it broke.
 *
 * What it proves that the probe cases cannot: those cases assert each rule from inputs chosen to make
 * the arithmetic followable, while this comparison asserts the seeded records' own outcome — the nine
 * open exceptions worth 4,192,800 across seven customer orders, the 26⅔-hour median, the 42 per cent
 * alternate-source share, `EXC-2026-1184`'s 1,512,800, the ledger's blocked counts per declared
 * endpoint, the three packages' readiness and the queue's default ordering.
 * ------------------------------------------------------------------------------------------- */

/** The all-plants, all-products selection the demonstration loads with, resolved for its own role. */
const SEEDED_SCOPE: Scope = resolveScope({}, 'head-of-supply-chain');

/** The do-nothing option, which is the baseline every affected line is measured by. */
const DO_NOTHING: { readonly airSets: number; readonly transferSets: number } = {
  airSets: 0,
  transferSets: 0,
};

/**
 * The read state of the source the order book comes from, taken from the seed's own catalogue.
 *
 * The adapter attaches the read's freshness to every queue row, and `ExceptionAggregateInput`
 * requires it; no aggregate this section compares reads it, so it is passed through as the record
 * states it rather than synthesised.
 *
 * @returns The `erp` source's declared state and instant.
 * @throws Error when the catalogue carries no `erp` record, because a read state cannot be invented.
 */
function seededFreshness(): Freshness {
  const entry = SOURCES.health.find((candidate) => candidate.source === 'erp');

  if (entry === undefined) {
    throw new Error('The seeded source catalogue carries no erp record, so the read state cannot be stated.');
  }

  return { source: entry.source, asOf: entry.asOf, state: entry.state };
}

/**
 * Takes the baseline solve of every seeded exception that names a solver case, as the adapter does.
 *
 * The do-nothing measurement is the solver's own output rather than a stored figure (AAP 0.12.2), so
 * the aggregation suite measures it the way the adapter's bundle builder measures it instead of
 * carrying a hand-written result. Those two figures are pinned in their own right by
 * `tests/fixtures/solver-expected-results.ts` and the solver suite.
 *
 * @returns One baseline per exception carrying a case, in the record set's order.
 * @throws Error when an exception names a case the seed does not carry, which would leave its lines
 *   unmeasured.
 */
function seededBaselines(): BaselineSolve[] {
  const solves: BaselineSolve[] = [];

  for (const exception of EXCEPTIONS) {
    if (exception.solverCaseId === undefined) {
      continue;
    }

    const solverCase = SOLVER_CASES.find((entry) => entry.id === exception.solverCaseId);

    if (solverCase === undefined) {
      throw new Error(
        `The seeded case ${exception.solverCaseId}, which ${exception.id} names, is not in src/seed/solver-cases.ts.`,
      );
    }

    solves.push({ exceptionId: exception.id, result: solveSupplyDelay(solverCase, DO_NOTHING) });
  }

  return solves;
}

/**
 * Composes the record bundle the adapter composes, from the same records and the same clock.
 *
 * `OverviewInput` extends `ExceptionAggregateInput`, so one bundle serves the queue and the overview
 * exactly as it does in `src/services/mock/handlers/exceptions.ts`: the exceptions, the product
 * prices, the order book, the baseline solves, the read's freshness and the demonstration clock, plus
 * the plants, the material master, the activity trail and the approvals the overview alone reads.
 *
 * @returns A fresh bundle over the seeded records, at the scope the demonstration loads with.
 */
function seededBundle(): OverviewInput {
  return {
    exceptions: EXCEPTIONS,
    products: PRODUCTS,
    customerOrders: CUSTOMER_ORDERS,
    baselines: seededBaselines(),
    freshness: seededFreshness(),
    asOf: DEMO_CLOCK,
    plants: SEEDED_PLANTS,
    materials: SEEDED_MATERIALS,
    history: EXCEPTION_HISTORY,
    approvals: APPROVALS,
  };
}

/**
 * Links the seeded audit drafts into the chain the ledger is counted over.
 *
 * `computeLedger` counts events, and the adapter's bootstrap gives each seeded draft its sequence,
 * identifier and three hashes through `appendEvent` before any read sees it. This composes the same
 * chain from the same drafts, so no hash, identifier or position is written here (rule P-6).
 *
 * @returns The seeded trail as a linked chain, in sequence order.
 */
async function seededChain(): Promise<AuditEvent[]> {
  const events: AuditEvent[] = [];

  for (const draft of SEEDED_AUDIT_EVENTS) {
    events.push(await appendEvent(events, draft));
  }

  return events;
}

/**
 * Finds one seeded exception by identifier.
 *
 * @param id The exception to find.
 * @returns That exception's record.
 * @throws Error when the record set carries no exception with that identifier.
 */
function seededExceptionOf(id: ExceptionId): OperationalException {
  const exception = EXCEPTIONS.find((candidate) => candidate.id === id);

  if (exception === undefined) {
    throw new Error(`The seeded record set carries no exception ${id}.`);
  }

  return exception;
}

describe("the seed's expected aggregates", () => {
  it('reproduces the overview tiles', () => {
    const overview = computeOverview(seededBundle(), SEEDED_SCOPE);

    expect(overview.openExceptions, 'the overview openExceptions tile').toBe(
      EXPECTED_OVERVIEW_TILES.openExceptions,
    );
    expect(overview.revenueAtRiskEur, 'the overview revenueAtRiskEur tile').toBe(
      EXPECTED_OVERVIEW_TILES.revenueAtRiskEur,
    );
    expect(overview.customerOrdersAtRisk, 'the overview customerOrdersAtRisk tile').toBe(
      EXPECTED_OVERVIEW_TILES.customerOrdersAtRisk,
    );
    expect(overview.medianHoursToApprovedPlan, 'the overview medianHoursToApprovedPlan tile').toBe(
      EXPECTED_OVERVIEW_TILES.medianHoursToApprovedPlan,
    );
    expect(overview.alternateSourceReadinessPercent, 'the overview alternateSourceReadinessPercent tile').toBe(
      EXPECTED_OVERVIEW_TILES.alternateSourceReadinessPercent,
    );
  });

  it('reproduces the by-plant rows', () => {
    const overview = computeOverview(seededBundle(), SEEDED_SCOPE);

    expect(overview.byPlant, 'the by-plant row count').toHaveLength(EXPECTED_BY_PLANT.length);

    EXPECTED_BY_PLANT.forEach((expected, index) => {
      const row = overview.byPlant[index];

      if (row === undefined) {
        throw new Error(`The overview returned no by-plant row at position ${index}.`);
      }

      expect(row.plantId, `by-plant row ${index}'s plant`).toBe(expected.plantId);
      expect(row.openExceptions, `${expected.plantId}'s openExceptions`).toBe(expected.openExceptions);
      expect(row.revenueAtRiskEur, `${expected.plantId}'s revenueAtRiskEur`).toBe(
        expected.revenueAtRiskEur,
      );
    });
  });

  it('reproduces the fourteen-day opened-and-resolved series', () => {
    const overview = computeOverview(seededBundle(), SEEDED_SCOPE);

    expect(overview.openResolvedSeries, 'the series point count').toHaveLength(
      EXPECTED_OPEN_RESOLVED_SERIES.length,
    );

    EXPECTED_OPEN_RESOLVED_SERIES.forEach((expected, index) => {
      const point = overview.openResolvedSeries[index];

      if (point === undefined) {
        throw new Error(`The overview returned no series point at position ${index}.`);
      }

      expect(point.date, `series point ${index}'s date`).toBe(expected.date);
      expect(point.open, `${expected.date}'s opened count`).toBe(expected.open);
      expect(point.resolved, `${expected.date}'s resolved count`).toBe(expected.resolved);
    });
  });

  it("reproduces each exception's revenue at risk", () => {
    const rows = computeExceptionRows(seededBundle(), SEEDED_SCOPE);

    expect(rows, 'the queue row count').toHaveLength(EXPECTED_REVENUE_AT_RISK_BY_EXCEPTION.length);

    for (const expected of EXPECTED_REVENUE_AT_RISK_BY_EXCEPTION) {
      expect(rowOf(rows, expected.exceptionId).revenueAtRiskEur, `${expected.exceptionId}'s revenue at risk`).toBe(
        expected.revenueAtRiskEur,
      );
    }
  });

  it("reproduces each exception's affected lines", () => {
    const bundle = seededBundle();

    for (const expected of EXPECTED_AFFECTED_LINES_BY_EXCEPTION) {
      const exception = seededExceptionOf(expected.exceptionId);
      const lines = resolveAffectedLines(exception, baselineViewFor(bundle, exception));

      expect(lines, `${expected.exceptionId}'s affected line count`).toHaveLength(expected.lines.length);

      expected.lines.forEach((expectedLine, index) => {
        const line = lines[index];

        if (line === undefined) {
          throw new Error(`The aggregate returned no affected line at position ${index} for ${expected.exceptionId}.`);
        }

        expect(line.orderId, `${expected.exceptionId}'s line ${index} order`).toBe(expectedLine.orderId);
        expect(line.unitsAtRisk, `${expected.exceptionId}'s units at risk on ${expectedLine.orderId}`).toBe(
          expectedLine.unitsAtRisk,
        );
      });
    }
  });

  it('reproduces the ledger counts of every declared endpoint', async () => {
    const rows = computeLedger(await seededChain(), SOVEREIGNTY, DEMO_CLOCK);

    expect(rows, 'the declared ledger row count').toHaveLength(EXPECTED_LEDGER_COUNTS_BY_ENDPOINT.length);

    for (const expected of EXPECTED_LEDGER_COUNTS_BY_ENDPOINT) {
      const row = ledgerRowOf(rows, expected.endpoint);

      expect(row.allowed, `${expected.endpoint}'s allowed count`).toBe(expected.allowed);
      expect(row.blocked, `${expected.endpoint}'s blocked count`).toBe(expected.blocked);
    }
  });

  it("reproduces each package's readiness", () => {
    expect(PPAP_PACKAGES, 'the seeded package count').toHaveLength(EXPECTED_PACKAGE_READINESS.length);

    for (const expected of EXPECTED_PACKAGE_READINESS) {
      const packageRecord = PPAP_PACKAGES.find((candidate) => candidate.id === expected.packageId);

      if (packageRecord === undefined) {
        throw new Error(`The seeded record set carries no part approval package ${expected.packageId}.`);
      }

      const passing = packageRecord.elements.filter((element) => element.state === 'pass').length;

      expect(packageRecord.elements.length, `${expected.packageId}'s element count`).toBe(expected.total);
      expect(passing, `${expected.packageId}'s passing elements`).toBe(expected.passed);
      expect(readinessOf(packageRecord.elements), `${expected.packageId}'s computed readiness`).toBe(
        expected.percent,
      );
      expect(packageRecord.readinessPercent, `${expected.packageId}'s recorded readiness`).toBe(
        expected.percent,
      );
    }
  });

  it("reproduces the queue's default ordering", () => {
    const ordered = sortUrgent(computeExceptionRows(seededBundle(), SEEDED_SCOPE)).map((row) => row.id);

    expect(ordered, 'the ordered row count').toHaveLength(EXPECTED_URGENT_ORDER.length);

    EXPECTED_URGENT_ORDER.forEach((expectedId, position) => {
      expect(ordered[position], `the exception at position ${position} of the default ordering`).toBe(
        expectedId,
      );
    });
  });
});

