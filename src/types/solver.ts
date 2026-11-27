/**
 * The typed input and output of `solveSupplyDelay` — the one pure function that produces every
 * option measurement the product shows (AAP 0.12.1).
 *
 * Fixing inputs:
 * - `platform-contracts.md` §4 rules 1 to 11 fix the measurement itself and the order the rules
 *   apply in: how the opening position and the delayed purchase order produce the run-out, how the
 *   two levers recover sets, how units late, maximum days late and orders on time are counted, how
 *   the added cost and the revenue delayed are summed, and how line idle days are rounded half up
 *   to two decimals.
 * - AAP 0.12.1 fixes this module's contents: `SolverCase` as the function's first argument,
 *   `Levers` as its second, and a `SolverResult` that carries "exactly the measure fields
 *   `Scenario` defines — unitsLate, maxDaysLate, ordersOnTime, ordersTotal, addedCostEur,
 *   lineIdleDays, revenueDelayedEur, runOut, dailyClosingStock, orders, constraintCheck,
 *   constraintMessages, sideEffects, writeBacks — plus the levers and the confidence fields the
 *   case supplies".
 * - AAP 0.12.2 fixes the validation the levers are held to: a lever negative, above its maximum or
 *   off its step fails the option with one message per breach, which is what `LeverConstraint`,
 *   `constraintCheck` and `constraintMessages` carry.
 * - AAP 0.8 fixes the daily closing-stock series the projected-stock chart draws, and the typed
 *   failure a computation that cannot complete returns.
 *
 * Purity (AAP 0.2.1, AAP 0.18.2). The implementing module, `src/domain/solver/solve-supply-delay.ts`,
 * is a pure function of its typed arguments: it reads no clock, no random source and no global
 * state, so the same `SolverCase` and the same `Levers` always produce an identical `SolverResult`.
 * The slots below are the whole of what it may write, and the proof that it wrote nothing else is a
 * test that runs one case twice and compares the two results.
 *
 * Shapes only — no arithmetic, no values, no functions (AAP 0.1 conflict K2, rule P-6).
 * `src/domain/solver` owns the arithmetic and this folder owns only the shapes. Every number here is
 * a slot the solver or an aggregation fills; no business figure, threshold, date or identifier value
 * is written in this module, and the two roundings the measures use — `halfUp2` for line idle days,
 * `wholePercent` for a package's readiness — belong to `src/domain/solver/rounding.ts`, not to the
 * type of the member carrying their result.
 *
 * The folder's single cycle in the import graph, accepted rather than treated as a defect. This
 * module imports `Levers`, `OrderResult`, `SideEffect`, `WriteBack` and `Confidence` from
 * `./entities`, and `./entities` imports `SolverResult` from here, because a scenario carries its
 * own identity — the exception it belongs to, its name, how it came to exist — while the solver
 * owns its measures. `SolverResult` and `Scenario` therefore name each other's vocabulary through
 * `import type` alone. Every cross-import on both sides is `import type` under
 * `verbatimModuleSyntax`, and both modules declare types only — no value, no function, no
 * constant — so nothing exists at runtime and no cycle can form there while that holds.
 * Extracting the shared shapes into a third module is declined: it would take contracts §3
 * declarations out of `./entities`, which owns the entity vocabulary and the `Scenario` and
 * `Approval` records that carry them (AAP 0.12.1, AAP 0.12.2). `./entities` records the same
 * acceptance from its end.
 *
 * Rules this module is built to satisfy:
 * - P-6: measure slots only. No number is typed here, and no component can read a measure except
 *   through the solver's result.
 * - P-2: it imports `./primitives` and `./entities` and nothing else — no seed record, no adapter,
 *   no service module, no React — so it cannot become a second data boundary.
 * - P-1: a figure carried by `SolverResult` is a computed figure, and the component that shows it
 *   carries the `Simulated calculation` label; the euro measures, the counts and the series have
 *   this one typed home, so no component fabricates one.
 * - P-4: neither the run-out, nor the series, nor the write-backs below claim anything beyond the
 *   arithmetic that produces them.
 *
 * `SolverResult.confidence` is required by the measure list AAP 0.12.1 states, which also says the
 * case supplies it, while the `SolverCase` members that section fixes carry no confidence slot: the
 * confidence travels on the result, from the case's own record through the adapter that composes a
 * `Scenario`, and no member is invented on `SolverCase` to hold it. `SolverFailure.input` names the
 * failing input as a field path (`"airSets"`), because a closed union of member names would have to
 * enumerate every input of every case, so the solver states the path and the type cannot.
 */

import type {
  CustomerOrderId,
  ExceptionId,
  IsoDate,
  Money,
  ProductId,
  PurchaseOrderId,
} from './primitives';
import type { Confidence, Levers, OrderResult, SideEffect, WriteBack } from './entities';

/* ---------------------------------------------------------------------------------------------
 * A. Vocabularies
 * ------------------------------------------------------------------------------------------- */

/**
 * Whether an option stayed inside the constraints its levers are held to (contracts §4).
 *
 * A breach is reported through the `constraintCheck` member rather than as a service failure, so the
 * comparison matrix can show the option with its messages and set it aside; the recommendation
 * considers only options whose check passes (AAP 0.8, AAP 0.12.3).
 */
export type ConstraintCheck = 'pass' | 'fail';

/**
 * When supply runs out, expressed as contracts §4 rule 4 expresses it: the day plus a fraction of
 * that day.
 *
 * The interface renders the pair as a single reading — the day, and a half-day wording such as
 * "midday" — and that wording is presentation, so it lives in `src/components` rather than here.
 */
export interface RunOut {
  /** The day of the run-out, numbered within the projection window. */
  day: number;

  /** How far through that day the run-out falls, from the start of the day towards its end. */
  fractionOfDay: number;
}

/**
 * One point of the daily closing-stock series the projected-stock chart draws (AAP 0.8, SCR-03).
 *
 * The chart plots the baseline and the selected option over the case's window with the zero line and
 * the due-date markers, and the series never falls below zero. That assertion is made against this
 * series rather than against the rendering (T-03), so the invariant is the series' own.
 */
export interface DailyClosingStockPoint {
  /** The calendar date the stock is counted at the close of. */
  date: IsoDate;

  /** The units of stock left at that close. */
  units: number;
}

/**
 * The bound one lever is held to: the largest value it may take, and the increment it moves in
 * (AAP 0.12.2).
 *
 * A lever set below zero, above its maximum or between two steps breaches its bound, and the
 * breach is reported one message at a time rather than being silently clamped.
 */
export interface LeverConstraint {
  /** The largest value the lever may take. */
  max: number;

  /** The increment the lever moves in; a value between two steps breaches the bound. */
  step: number;
}

/* ---------------------------------------------------------------------------------------------
 * B. Inputs — AAP 0.12.2's solver-case row
 * ------------------------------------------------------------------------------------------- */

/**
 * One customer order the case measures.
 *
 * The measures that count orders — units late, maximum days late, orders on time out of orders
 * total — are taken over exactly these entries, and the per-order results the comparison screen
 * draws come back keyed by `orderId` (contracts §4).
 */
export interface SolverOrderInput {
  /** The customer order measured. */
  orderId: CustomerOrderId;

  /** The product the order is for. */
  productId: ProductId;

  /** How many units the order is for. */
  quantity: number;

  /**
   * The price the order was agreed at, in euro with at most two decimals; a record value copied from
   * the customer order.
   *
   * Contracts §4 prices the revenue an option delays from exactly this: the units an order is left
   * late, valued at the price its own record carries, so no price is typed into the solver.
   */
  unitPriceEur: Money;

  /** The date the order is due. */
  dueDate: IsoDate;
}

/**
 * The solver's whole input: one exception's supply position, the bounds the two levers are held to and
 * the rates those levers are charged at, the orders at stake with the price each was agreed at, the
 * window the projection covers and the write-back steps a plan sets in motion (AAP 0.12.2).
 *
 * One case is a record, and a scenario is only ever produced from a case, which is why the case
 * carries both its own reference and the exception it belongs to.
 */
export interface SolverCase {
  /** The case's own reference, in the traceable form the seed records give it. */
  id: string;

  /** The exception the case belongs to. */
  exceptionId: ExceptionId;

  /** The stock the projection opens with. */
  openingStock: number;

  /** The finished goods on hand when the window opens. */
  finishedGoods: number;

  /** The units the line can build per working day. */
  ratePerDay: number;

  /** The purchase order that does not arrive as planned, which is the disruption being measured. */
  delayedPurchaseOrderId: PurchaseOrderId;

  /** The bound on the air-freight lever. */
  airSets: LeverConstraint;

  /** The bound on the transfer lever. */
  transferSets: LeverConstraint;

  /**
   * What expediting one set by air freight adds, in euro with at most two decimals.
   *
   * Contracts §4 sums the added cost of an option from the sets each lever recovers and the rate that
   * lever is charged at, so both rates are record content the case carries rather than a figure the
   * solver may state for itself (rule P-6).
   */
  airFreightCostPerSetEur: Money;

  /** What transferring one set adds, in euro with at most two decimals. */
  transferCostPerSetEur: Money;

  /**
   * The product a transfer draws its sets from.
   *
   * A transfer recovers sets by drawing them from another site's supply, so the deferral that follows
   * falls on that product's kits rather than on the product the case's own orders are for.
   */
  transferProductId: ProductId;

  /** The price one transferred set carries, in euro with at most two decimals. */
  transferUnitPriceEur: Money;

  /**
   * The working days a transferred set is deferred at the site it is drawn from.
   *
   * The deferral is the other site's, not this projection's: the recovered sets still join the
   * position on the window's first working day, and this member reports how long the site they came
   * from waits for them.
   */
  transferLeadTimeDays: number;

  /** The customer orders the projection measures, one entry per order at stake. */
  orders: SolverOrderInput[];

  /** The first date the projection covers. */
  windowStart: IsoDate;

  /** The last date the projection covers. */
  windowEnd: IsoDate;

  /**
   * The write-back steps this case's plan sets in motion, in the plan's order.
   *
   * An option whose levers recover sets is the option that moves the plan, so the solver returns these
   * steps for it and the empty list for the do-nothing baseline, which sets nothing in motion. The
   * steps are record content: the solver copies them and invents none.
   */
  writeBacks: readonly WriteBack[];
}

/* ---------------------------------------------------------------------------------------------
 * C. Outputs
 * ------------------------------------------------------------------------------------------- */

/**
 * One measured option, as the solver returns it and as the comparison matrix shows a column of it.
 *
 * The sixteen members are the fourteen measures AAP 0.12.1 lists — in the order that section lists
 * them — followed by the levers the measurement was taken under and the confidence the case
 * supplies. `Scenario` in `./entities` extends this type with a scenario's identity, its identifier,
 * its exception, its name and its origin, which the mock adapter adds when it composes one; nothing
 * here names a scenario, so a solver result cannot be mistaken for a record.
 *
 * Two euro measures are `Money` and keep at most two decimals; `lineIdleDays` is the decimal the
 * domain rounds half up to two places before returning it; the counts are whole numbers of units,
 * orders or days. None of the rounding is the type's.
 */
export interface SolverResult {
  /** How many units the option leaves late across every order in the case. */
  unitsLate: number;

  /** The largest number of days late among the units the option leaves late. */
  maxDaysLate: number;

  /** How many of the case's orders arrive on time. */
  ordersOnTime: number;

  /** How many orders the case measures, which is the denominator of `ordersOnTime`. */
  ordersTotal: number;

  /** What the option costs, in euro. */
  addedCostEur: Money;

  /** The working days the line stands idle over the window. */
  lineIdleDays: number;

  /** The value of the revenue the option holds up, in euro. */
  revenueDelayedEur: Money;

  /** When supply runs out under the option. */
  runOut: RunOut;

  /** The stock left at each day's close across the case's window. */
  dailyClosingStock: DailyClosingStockPoint[];

  /** One entry per order in the case, in the order the case lists them. */
  orders: OrderResult[];

  /** Whether every lever stayed inside its bound. */
  constraintCheck: ConstraintCheck;

  /** One plain message per breached bound, and empty when the check passes. */
  constraintMessages: string[];

  /** What the option costs a record that is not the one being rescued. */
  sideEffects: SideEffect[];

  /** The write-back the option would set off, in the order the record states it. */
  writeBacks: WriteBack[];

  /** The lever values the measurement was taken under. */
  levers: Levers;

  /** How much confidence the measurement carries, with the reason for it. */
  confidence: Confidence;
}

/**
 * What the solver returns when it cannot compute a measurement (AAP 0.8).
 *
 * A computation that cannot complete — a missing solver case, a lever that is not a number, or an
 * option whose constraint check fails with its messages — returns this instead of a result and
 * names the failing input or the binding constraint. The interface shows that option as "Cannot
 * compute" with the reason, recommends nothing, and renders no `NaN`, no blank and no partial
 * figure: the comparison matrix puts the reason in the option's cell where a number would otherwise
 * stand, and the recommendation considers only options whose constraint check passes.
 */
export interface SolverFailure {
  /** Why the measurement could not be taken, in plain words. */
  reason: string;

  /** The input the failure names, as a field path, when the reason identifies one. */
  input?: string;
}
