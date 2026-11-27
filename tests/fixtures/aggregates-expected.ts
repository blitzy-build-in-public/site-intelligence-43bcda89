/**
 * The seed's expected aggregates — the table AAP 0.8 holds as this fixture, and nothing else.
 *
 * Fixing inputs:
 * - AAP 0.8, "The expected results are fixtures, nothing more": the expected aggregates of
 *   `platform-seed-data.md` §13 are held as this module and as `./solver-expected-results.ts`,
 *   "never stored as records, never displayed, never imported from `src/`", and
 *   `src/domain/aggregation/aggregation.test.ts` is the suite that compares computed output against
 *   them row by row.
 * - `platform-contracts.md` §5 fixes the ten computed aggregates, and AAP 0.8's computation table
 *   fixes which module owns each and the rounding each applies: `wholePercent` for both readiness
 *   figures, no rounding at all for the median, integers for every count, and money to two decimals
 *   with no intermediate rounding.
 * - AAP 0.2.3 fixes the record set the aggregates are computed over: twelve current exceptions,
 *   four plants, three products and three part-approval packages; contracts §1 fixes the constant
 *   clock `2026-12-03T08:00:00+01:00` every "now" derives from, the EUR money convention and the
 *   Monday-to-Friday calendar.
 *
 * THE SCOPE EVERY FIGURE BELOW IS COMPUTED AT. The demonstration loads with no plant and no product
 * selected — the head of supply chain's persona sees all four plants, in the canonical order
 * `PLT-RGB`, `PLT-BRN`, `PLT-QRO`, `PLT-RAK`, and "All products" — so the resolved scope is those four
 * plants with an empty product selection, and every aggregate below is computed over it. An empty
 * product selection is "all products" rather than "no product" (`./scope` states the reading), which
 * is why the alternate-source readiness share is measured over the whole material master.
 *
 * THE DERIVATION — why every figure is stated with its arithmetic. `platform-seed-data.md` is not part
 * of this repository, so this module holds the aggregates the plan fixes, derived from the seeded
 * records by the contracts' rules. Each export states below how its figures are produced, so a reader
 * can follow one to the records without running anything, and a disagreement between this table and
 * the modules is a defect to report rather than a number to adjust: a fixture written to match what
 * the modules return would prove nothing. Two of the figures are named in the inputs — AAP 0.8's
 * 1,512,800 for `EXC-2026-1184`'s delayed revenue, which is also that exception's revenue at risk,
 * and PPAP-0219's 78 per cent readiness — and both are reproduced below.
 *
 * Rules this module is built to satisfy:
 * - P-6: an expected figure has exactly one home and this is it. Nothing under `src/` imports this
 *   module and no screen or component reads it; the aggregation suite is its only consumer.
 * - P-2: it imports primitives from `src/types` and no seed record at all, so the expectation it
 *   holds cannot become a second data boundary. The suite that composes the record bundle states that
 *   import's reason where it makes it.
 * - P-5: every figure here is a first-party one computed from first-party records. No competitor or
 *   market-intelligence value appears, and no row below mixes the two provenances.
 * - P-7: every identifier is a seeded record's own `EXC-`, `CO-`, `PPAP-` or endpoint key, and no
 *   company, person, vendor or product of the real world is named.
 * - B-1, B-2: no address that is contacted, no request, no credential-shaped member and no
 *   configuration read. The four ledger endpoints are the declared strings the sovereignty record
 *   itself carries, compared as record keys and never resolved.
 */

import type { CustomerOrderId, ExceptionId, IsoDate, PlantId } from '../../src/types';

/**
 * The overview's five tiles at the scope above (contracts §5; AAP 0.8's `overview.ts` row).
 *
 * DERIVATION.
 * - `openExceptions` counts the seeded exceptions whose status is `open`: nine of the twelve are open,
 *   and `EXC-2026-1187` and `EXC-2026-1194` are resolved while `EXC-2026-1188` is dismissed.
 * - `revenueAtRiskEur` sums the revenue at risk of those nine, each exception's own lines valued at
 *   their product's price: `EXC-2026-1184` 1,512,800 + `EXC-2026-1185` 132,000 + `EXC-2026-1186`
 *   719,200 + `EXC-2026-1189` 144,000 + `EXC-2026-1190` 1,116,000 + `EXC-2026-1191` 194,400 +
 *   `EXC-2026-1192` 86,400 + `EXC-2026-1193` 144,000 + `EXC-2026-1195` 144,000, which is 4,192,800.
 *   The figures of each term are derived export by export below, and the by-plant rows are a
 *   partition of exactly this sum.
 * - `customerOrdersAtRisk` counts the distinct customer orders those nine exceptions name on their
 *   lines: `CO-770233`, `CO-770251`, `CO-770227`, `CO-770244`, `CO-770219`, `CO-770238` and
 *   `CO-770257` are seven, and an order two exceptions reach (`CO-770233` is named by three) counts
 *   once.
 * - `medianHoursToApprovedPlan` is the middle of the three exceptions whose activity trail carries
 *   both an `opened` and a later `approved` record, unrounded: `EXC-2026-1185` takes 33 hours 20
 *   minutes from 30 November 06:20 to 1 December 15:40, `EXC-2026-1187` takes 26 hours 40 minutes from
 *   1 December 08:40 to 2 December 11:20, and `EXC-2026-1195` takes 11 hours 15 minutes from 2 December
 *   07:15 to 18:30. Three values, so the middle one is the median: 26 hours 40 minutes = 26⅔ = 80/3.
 * - `alternateSourceReadinessPercent` is the share of the material master a second supplier can cover,
 *   half up to a whole percent: ten of the twenty-four seeded materials carry an
 *   `alternateSupplierId`, and 10/24 = 41.67 per cent reads as 42.
 */
export const EXPECTED_OVERVIEW_TILES: {
  readonly openExceptions: number;
  readonly revenueAtRiskEur: number;
  readonly customerOrdersAtRisk: number;
  readonly medianHoursToApprovedPlan: number;
  readonly alternateSourceReadinessPercent: number;
} = {
  openExceptions: 9,
  revenueAtRiskEur: 4192800,
  customerOrdersAtRisk: 7,
  medianHoursToApprovedPlan: 80 / 3,
  alternateSourceReadinessPercent: 42,
};

/** One by-plant row of the overview: a plant, the open exceptions grouped under it and their revenue. */
export interface ExpectedPlantRow {
  /** The plant the row reports on, one of the four in canonical order. */
  readonly plantId: PlantId;

  /** The open exceptions grouped under that plant. */
  readonly openExceptions: number;

  /** Their revenue at risk in euro, at most two decimals. */
  readonly revenueAtRiskEur: number;
}

/**
 * The overview's by-plant table at the scope above (AAP 0.12.2's `PlantRiskRow`; AAP 0.8).
 *
 * DERIVATION. Every plant is in scope, so an exception is grouped under the plant it lands on, and no
 * exception is grouped by the second plant it reaches. The counts add to the nine-exception tile and
 * the amounts to the 4,192,800 one, which is the invariant the rows and the tiles share:
 * - `PLT-RGB`, two open: `EXC-2026-1193` (480 × 120 for `CO-770257` plus 720 × 120 for `CO-770238` =
 *   57,600 + 86,400 = 144,000) and `EXC-2026-1195` (300 × 480 = 144,000) → 288,000.
 * - `PLT-BRN`, three open: `EXC-2026-1184` (580 × 1,240 + 640 × 1,240 = 719,200 + 793,600 =
 *   1,512,800, its lines the baseline solve's own late units), `EXC-2026-1190` (400 × 1,240 + 500 ×
 *   1,240 = 496,000 + 620,000 = 1,116,000) and `EXC-2026-1191` (900 × 120 + 720 × 120 = 108,000 +
 *   86,400 = 194,400) → 2,823,200.
 * - `PLT-QRO`, two open: `EXC-2026-1185` (275 × 480 = 132,000) and `EXC-2026-1189` (300 × 480 =
 *   144,000) → 276,000.
 * - `PLT-RAK`, two open: `EXC-2026-1186` (580 × 1,240 = 719,200) and `EXC-2026-1192` (720 × 120 =
 *   86,400) → 805,600.
 */
export const EXPECTED_BY_PLANT: readonly ExpectedPlantRow[] = [
  { plantId: 'PLT-RGB', openExceptions: 2, revenueAtRiskEur: 288000 },
  { plantId: 'PLT-BRN', openExceptions: 3, revenueAtRiskEur: 2823200 },
  { plantId: 'PLT-QRO', openExceptions: 2, revenueAtRiskEur: 276000 },
  { plantId: 'PLT-RAK', openExceptions: 2, revenueAtRiskEur: 805600 },
];

/** One day of the overview's opened-and-resolved chart: the date and the two counts of whole exceptions. */
export interface ExpectedSeriesPoint {
  /** The calendar day, ascending. */
  readonly date: IsoDate;

  /** The exceptions detected on that day. */
  readonly open: number;

  /** The exceptions whose trail records their resolution on that day. */
  readonly resolved: number;
}

/**
 * The overview's fourteen-day opened-and-resolved series at the scope above (AAP 0.12.2's
 * `DailyCountPoint`; AAP 0.8's `overview.ts` row).
 *
 * DERIVATION. The series is the fourteen calendar days ending on the demonstration clock's own day,
 * 3 December 2026, so it runs from 20 November to 3 December. `open` counts the exceptions whose own
 * `detectedAt` falls on the day — every exception carries that instant, so no exception is missing
 * from the count — and `resolved` counts the activity trail's `resolved` records, because an
 * exception record carries no resolved-at member. A day with nothing on it keeps its point with two
 * zeros, so the chart has no gap in its axis.
 * - `EXC-2026-1194` was detected on 21 November and `EXC-2026-1192` on 25 November, one each.
 * - `EXC-2026-1189` was detected on 26 November and `EXC-2026-1184` on 27 November, one each.
 * - 30 November detected `EXC-2026-1185` and `EXC-2026-1186`, two; 1 December detected
 *   `EXC-2026-1187` and `EXC-2026-1190`, two; 2 December detected `EXC-2026-1191` and
 *   `EXC-2026-1195`, two; 3 December detected `EXC-2026-1193`, one.
 * - `EXC-2026-1188` was detected on 19 November, before the window opens, so it contributes to no
 *   point.
 * - The only resolution on record is `EXC-2026-1187`'s on 2 December, which is the single non-zero
 *   `resolved` count below.
 */
export const EXPECTED_OPEN_RESOLVED_SERIES: readonly ExpectedSeriesPoint[] = [
  { date: '2026-11-20', open: 0, resolved: 0 },
  { date: '2026-11-21', open: 1, resolved: 0 },
  { date: '2026-11-22', open: 0, resolved: 0 },
  { date: '2026-11-23', open: 0, resolved: 0 },
  { date: '2026-11-24', open: 0, resolved: 0 },
  { date: '2026-11-25', open: 1, resolved: 0 },
  { date: '2026-11-26', open: 1, resolved: 0 },
  { date: '2026-11-27', open: 1, resolved: 0 },
  { date: '2026-11-28', open: 0, resolved: 0 },
  { date: '2026-11-29', open: 0, resolved: 0 },
  { date: '2026-11-30', open: 2, resolved: 0 },
  { date: '2026-12-01', open: 2, resolved: 0 },
  { date: '2026-12-02', open: 2, resolved: 1 },
  { date: '2026-12-03', open: 1, resolved: 0 },
];

/** One exception and the revenue its affected lines place at risk. */
export interface ExpectedExceptionRevenue {
  /** The exception the figure belongs to. */
  readonly exceptionId: ExceptionId;

  /** The revenue at risk in euro, at most two decimals. */
  readonly revenueAtRiskEur: number;
}

/**
 * The revenue at risk of every exception in scope, in identifier order (contracts §5; AAP 0.8's
 * `exceptions.ts` row: "sum of `unitsAtRisk` × product price, with the baseline solve supplying the
 * lines for the exception that has a solver case").
 *
 * DERIVATION. Every exception is listed, open or not, because the figure belongs to the record rather
 * than to the queue: a resolved exception still states what was at risk. The three products are
 * priced at 1,240 (`PRD-R75`), 480 (`PRD-A200`) and 120 (`PRD-V40`), and each line is valued at its
 * own product's price:
 * - `EXC-2026-1184` takes its lines from the baseline solve rather than from its stored line counts,
 *   and the do-nothing measurement leaves 580 and 640 units late: 580 × 1,240 + 640 × 1,240 =
 *   1,512,800.
 * - `EXC-2026-1185` 275 × 480 = 132,000; `EXC-2026-1186` 580 × 1,240 = 719,200; `EXC-2026-1187`
 *   275 × 480 = 132,000; `EXC-2026-1188` 300 × 120 = 36,000; `EXC-2026-1189` 300 × 480 = 144,000.
 * - `EXC-2026-1190` 400 × 1,240 + 500 × 1,240 = 1,116,000; `EXC-2026-1191` 900 × 120 + 720 × 120 =
 *   194,400; `EXC-2026-1192` 720 × 120 = 86,400; `EXC-2026-1193` 480 × 120 + 720 × 120 = 144,000.
 * - `EXC-2026-1194` carries one line at zero units, which places nothing at risk: 0.
 * - `EXC-2026-1195` 300 × 480 = 144,000.
 */
export const EXPECTED_REVENUE_AT_RISK_BY_EXCEPTION: readonly ExpectedExceptionRevenue[] = [
  { exceptionId: 'EXC-2026-1184', revenueAtRiskEur: 1512800 },
  { exceptionId: 'EXC-2026-1185', revenueAtRiskEur: 132000 },
  { exceptionId: 'EXC-2026-1186', revenueAtRiskEur: 719200 },
  { exceptionId: 'EXC-2026-1187', revenueAtRiskEur: 132000 },
  { exceptionId: 'EXC-2026-1188', revenueAtRiskEur: 36000 },
  { exceptionId: 'EXC-2026-1189', revenueAtRiskEur: 144000 },
  { exceptionId: 'EXC-2026-1190', revenueAtRiskEur: 1116000 },
  { exceptionId: 'EXC-2026-1191', revenueAtRiskEur: 194400 },
  { exceptionId: 'EXC-2026-1192', revenueAtRiskEur: 86400 },
  { exceptionId: 'EXC-2026-1193', revenueAtRiskEur: 144000 },
  { exceptionId: 'EXC-2026-1194', revenueAtRiskEur: 0 },
  { exceptionId: 'EXC-2026-1195', revenueAtRiskEur: 144000 },
];

/** One affected line: the order an exception puts at risk and how many of its units. */
export interface ExpectedAffectedLine {
  /** The customer order the line concerns. */
  readonly orderId: CustomerOrderId;

  /** The units of that order the exception places at risk. */
  readonly unitsAtRisk: number;
}

/** One exception and the affected lines its aggregate resolves. */
export interface ExpectedAffectedLines {
  /** The exception the lines belong to. */
  readonly exceptionId: ExceptionId;

  /** Its affected lines, in the order the aggregate returns them. */
  readonly lines: readonly ExpectedAffectedLine[];
}

/**
 * The affected lines of every exception in scope (contracts §5; AAP 0.12.2's `OperationalException`
 * row: "affected lines are the only input to revenue at risk; an exception with a solver case takes
 * its lines from the baseline solve").
 *
 * DERIVATION. An exception without a solver case answers with its own record's lines, whose unit
 * counts are the records' — every stored line is kept, a zero one included, because nothing has
 * measured that exception. `EXC-2026-1184` is the one exception carrying a case: its lines are the
 * baseline solve's two orders at the units that measurement leaves late — 580 for `CO-770233` and 640
 * for `CO-770251` — so a stored line survives only where the solve leaves units late on it, and an
 * order only the solve measures is added from the order book. That is why `EXC-2026-1194`'s one line
 * keeps zero units while `EXC-2026-1184`'s two carry the measured counts. The order is the record's
 * own lines first, then the solve's, so the sequences below are the records'.
 */
export const EXPECTED_AFFECTED_LINES_BY_EXCEPTION: readonly ExpectedAffectedLines[] = [
  {
    exceptionId: 'EXC-2026-1184',
    lines: [
      { orderId: 'CO-770233', unitsAtRisk: 580 },
      { orderId: 'CO-770251', unitsAtRisk: 640 },
    ],
  },
  { exceptionId: 'EXC-2026-1185', lines: [{ orderId: 'CO-770227', unitsAtRisk: 275 }] },
  { exceptionId: 'EXC-2026-1186', lines: [{ orderId: 'CO-770233', unitsAtRisk: 580 }] },
  { exceptionId: 'EXC-2026-1187', lines: [{ orderId: 'CO-770227', unitsAtRisk: 275 }] },
  { exceptionId: 'EXC-2026-1188', lines: [{ orderId: 'CO-770219', unitsAtRisk: 300 }] },
  { exceptionId: 'EXC-2026-1189', lines: [{ orderId: 'CO-770244', unitsAtRisk: 300 }] },
  {
    exceptionId: 'EXC-2026-1190',
    lines: [
      { orderId: 'CO-770233', unitsAtRisk: 400 },
      { orderId: 'CO-770251', unitsAtRisk: 500 },
    ],
  },
  {
    exceptionId: 'EXC-2026-1191',
    lines: [
      { orderId: 'CO-770219', unitsAtRisk: 900 },
      { orderId: 'CO-770238', unitsAtRisk: 720 },
    ],
  },
  { exceptionId: 'EXC-2026-1192', lines: [{ orderId: 'CO-770238', unitsAtRisk: 720 }] },
  {
    exceptionId: 'EXC-2026-1193',
    lines: [
      { orderId: 'CO-770257', unitsAtRisk: 480 },
      { orderId: 'CO-770238', unitsAtRisk: 720 },
    ],
  },
  { exceptionId: 'EXC-2026-1194', lines: [{ orderId: 'CO-770294', unitsAtRisk: 0 }] },
  { exceptionId: 'EXC-2026-1195', lines: [{ orderId: 'CO-770244', unitsAtRisk: 300 }] },
];

/** One declared outbound endpoint and the two counts the audit trail supports over thirty days. */
export interface ExpectedLedgerRow {
  /** The endpoint as the sovereignty record declares it. */
  readonly endpoint: string;

  /** The calls the policy allowed to it in the window. */
  readonly allowed: number;

  /** The calls the policy blocked from it in the window. */
  readonly blocked: number;
}

/**
 * The outbound ledger's counts per declared endpoint (contracts §5; AAP 0.8's `ledger.ts` row: "the
 * audit events of the last 30 days whose `objectRef` is the endpoint, split by result").
 *
 * DERIVATION. The window is the thirty calendar days ending on the clock's own day, 3 December 2026,
 * so it covers 4 November to 3 December inclusive; an event belongs to a row when its `objectRef`
 * equals that row's endpoint exactly; `allowed` counts the events whose result is `allowed`, `blocked`
 * those whose result is `blocked`, and the two write outcomes (`succeeded`, `failed`) count in
 * neither, because they record how a write turned out rather than a decision about a call. Every
 * seeded event naming these four endpoints inside the window was blocked, which is the declared
 * posture the ledger reports rather than a figure this table imposes:
 * `api.external-llm.example` 0 allowed and 9 blocked, `public-risk-feed.example` 0 and 4,
 * `telemetry.vendor.example` 0 and 3, `license-check.vendor.example` 0 and 3. The rows are in the
 * sovereignty record's own order.
 */
export const EXPECTED_LEDGER_COUNTS_BY_ENDPOINT: readonly ExpectedLedgerRow[] = [
  { endpoint: 'api.external-llm.example', allowed: 0, blocked: 9 },
  { endpoint: 'public-risk-feed.example', allowed: 0, blocked: 4 },
  { endpoint: 'telemetry.vendor.example', allowed: 0, blocked: 3 },
  { endpoint: 'license-check.vendor.example', allowed: 0, blocked: 3 },
];

/** One part-approval package's readiness: the passing elements, the whole and the whole percent. */
export interface ExpectedPackageReadiness {
  /** The package's `PPAP-nnnn` identifier. */
  readonly packageId: string;

  /** The elements whose state is `pass`. */
  readonly passed: number;

  /** Every element the package carries, the divisor of the share. */
  readonly total: number;

  /** `passed / total` rounded half up to a whole percent. */
  readonly percent: number;
}

/**
 * The readiness of each seeded part-approval package (contracts §5; AAP 0.8's readiness rule, the
 * figure the assistant's third answer quotes).
 *
 * DERIVATION. A package's readiness is the elements whose state is `pass` over the package's own
 * element count, handed to the half-up whole-percent rule — the one rounding rule for readiness — so
 * each row is that count and that division:
 * - `PPAP-0219` carries 14 passing of 18 = 77.78 per cent → 78, the figure AAP 0.8 quotes.
 * - `PPAP-0204` carries 15 passing of 18 = 83.33 per cent → 83.
 * - `PPAP-0237` carries 11 passing of 18 = 61.11 per cent → 61.
 */
export const EXPECTED_PACKAGE_READINESS: readonly ExpectedPackageReadiness[] = [
  { packageId: 'PPAP-0219', passed: 14, total: 18, percent: 78 },
  { packageId: 'PPAP-0204', passed: 15, total: 18, percent: 83 },
  { packageId: 'PPAP-0237', passed: 11, total: 18, percent: 61 },
];

/**
 * The queue's default ordering at the scope above (AAP 0.12.1's urgency row; SCR-02's default sort).
 *
 * DERIVATION. The queue's default read applies no status filter, so its rows are all twelve
 * exceptions in scope, and the ordering rule decides every pair of them in four keys: severity, most
 * urgent first; days to impact ascending; revenue at risk descending; and the identifier ascending as
 * the tiebreak that makes the order total. Reading the records:
 * - `critical` first: `EXC-2026-1184` and `EXC-2026-1193` both sit 4 days from impact, and the more
 *   expensive one comes first (1,512,800 against 144,000).
 * - `high` next: `EXC-2026-1187` 0 days, `EXC-2026-1191` 1, `EXC-2026-1185` 2, `EXC-2026-1190` 4.
 * - `medium` next: `EXC-2026-1186` 4 days, `EXC-2026-1192` 5, then `EXC-2026-1189` and
 *   `EXC-2026-1195` both at 6 days and both worth 144,000, which the identifier ascending breaks.
 * - `low` last: `EXC-2026-1194` 0 days before `EXC-2026-1188` 1.
 */
export const EXPECTED_URGENT_ORDER: readonly ExceptionId[] = [
  'EXC-2026-1184',
  'EXC-2026-1193',
  'EXC-2026-1187',
  'EXC-2026-1191',
  'EXC-2026-1185',
  'EXC-2026-1190',
  'EXC-2026-1186',
  'EXC-2026-1192',
  'EXC-2026-1189',
  'EXC-2026-1195',
  'EXC-2026-1194',
  'EXC-2026-1188',
];
