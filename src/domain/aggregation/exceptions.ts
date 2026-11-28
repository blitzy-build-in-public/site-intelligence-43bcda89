/**
 * The exception aggregates of contracts §5: the affected lines an exception places at risk, the
 * revenue those lines represent, and the rows of the exception queue.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §5, which fixes the computed aggregates as pure functions over records.
 * - AAP 0.8's computation table, whose `src/domain/aggregation/exceptions.ts` row fixes this
 *   module's arithmetic: "Revenue at risk per exception (sum of `unitsAtRisk` × product price, with
 *   the baseline solve supplying the lines for the exception that has a solver case), the by-plant
 *   grouping, and the affected-lines derivation … Money to two decimals; no intermediate rounding."
 * - AAP 0.12.1's "Exception aggregates" row, which fixes the public interface —
 *   `computeExceptionRows(records, scope)`, `revenueAtRisk(exception, baseline)` and
 *   `resolveAffectedLines(exception, baseline)` — and records the module's dependency as the solver
 *   (for the baseline lines only) and the rounding helpers.
 * - AAP 0.12.2's `OperationalException` row: "Affected lines are the only input to revenue at risk;
 *   an exception with a solver case takes its lines from the baseline solve."
 * - AAP 0.12.2's `ExceptionRow` row and specification SCR-02, which fix the queue row as one member
 *   per column: identifier, type, title, products, plant, severity, revenue at risk, days to impact,
 *   status, owner, age, freshness.
 * - AAP 0.2.1, which fixes the one scope resolver every list call and every aggregate share.
 * - AAP 0.10, which places each simulation label on the component that renders a figure: this module
 *   emits values and no label.
 *
 * Three computations, in the order they build on one another. `resolveAffectedLines` answers which
 * customer order lines an exception puts at risk and for how many units. `revenueAtRisk` values those
 * lines at the product prices the records carry. `computeExceptionRows` projects every in-scope
 * exception onto the queue row, carrying that revenue and the age of the exception.
 * `revenueOfAffectedLines` is that same valuation for a caller that already holds the lines, so an
 * aggregate that has derived them once values them once instead of deriving them again (AAP 0.2.1).
 *
 * The interface this module exposes, in the form AAP 0.12.1 states it. `computeExceptionRows(records,
 * scope)` is computed over the record bundle and the resolved scope. `resolveAffectedLines(exception,
 * baseline)` and `revenueAtRisk(exception, baseline)` are the two-argument functions the AAP names: the
 * exception, then that exception's baseline. The record access a line needs — the unit price of each
 * product it is valued at, and the order book that identifies an order the baseline solve measures —
 * travels on the second argument as a `BaselineView`, which `baselineViewFor(records, exception)` builds
 * from the bundle every caller already holds. The prices therefore stay record values this module
 * neither imports for itself nor types (rule P-2, rule P-6), and a call site stays one expression.
 *
 * Where the figures come from. Every price is read from a product record and every unit count from an
 * exception record or from the baseline solve the caller supplied; nothing here types a price, a
 * quantity, an amount, a threshold or a domain identifier (rule P-6). The expected results of
 * `platform-seed-data.md` are test fixtures that this module neither holds nor reads.
 *
 * Purity, determinism and the clock (AAP 0.2.1, AAP 0.18.2). Each function is a pure function of its
 * arguments: it reads no system clock, opens no random source, holds no module-level mutable value
 * and performs no I/O, so the same arguments always produce a deeply equal result. Neither the
 * arguments nor the records inside them are modified: every array and object returned is built here.
 * The one instant the queue rows need — the "now" an exception's age is measured against — arrives as
 * `ExceptionAggregateInput.asOf`, which the caller supplies from `DEMO_CLOCK`; this module reads no
 * system clock and builds no date of its own, so a row's age is a function of the records alone.
 *
 * Rules this module is built to satisfy:
 * - P-6: every number is computed from the records handed in — units from a record or the baseline
 *   solve, prices from the product records — and `halfUp2` from `src/domain/solver/rounding.ts` is
 *   the only rounding applied.
 * - P-5: revenue at risk is a first-party figure computed from first-party records. Nothing here
 *   reads a market-intelligence value, so no queue row and no revenue figure can blend the two.
 * - P-2: it imports the shared types and one rounding helper and nothing else — no seed record, no
 *   adapter, no service module and no React — so it cannot become a second data boundary.
 * - P-1: it emits no label and no `SimLabel`; the component that renders a revenue figure applies the
 *   `Simulated calculation` label.
 * - P-3: the scope a caller hands in reflects the demonstration's browser-side role scoping. This
 *   module narrows a list by it and asserts nothing about authorisation; the adapter applies the same
 *   role scope to every call it serves.
 * - P-4: it reports counts and amounts and claims no security property; the declared and simulated
 *   wording belongs to the screens that carry it.
 * - P-7: the only identifiers it handles are the synthetic records handed in, and no company, person
 *   or vendor name is written here.
 * - B-1 and B-2: it contacts no host, addresses none and reads no configuration.
 *
 * The as-of instant. AAP 0.12.1 fixes the signature as `computeExceptionRows(records, scope)`, which
 * carries no clock, while `ExceptionRow` declares `ageHours` and `freshness`, so both are carried
 * inside the record bundle the caller passes as `records`: `asOf` is the demonstration clock and
 * `freshness` is the source state the adapter attaches to the read, exactly as
 * `src/types/screen-dto.ts` describes it. Neither is read from a global.
 *
 * The by-plant grouping. AAP 0.8's row for this module also names "the by-plant grouping", while AAP
 * 0.12.1 gives the by-plant rows to `overview.ts` as `Overview.byPlant`, and `ExceptionRow` has no
 * grouped member, so no field is added here and no second grouping is computed:
 * `src/domain/aggregation/overview.ts` groups the very rows this module returns, so the grouping has
 * one home beside the tiles that carry it.
 *
 * The members a row does not carry. `ExceptionRow` carries the plants the exception reaches, because the
 * Plant column discloses them beside the plant the row is recorded at, and it carries no `confidence`,
 * no `missingInputs`, no `whatChanged` and no evidence reference, so a consumer reads those from the
 * exception record through the service rather than from the row: adding them here would put record
 * content beyond the twelve fixed members on a projection of those members (AAP 0.12.2).
 *
 * AN UNPRICEABLE LINE IS A TYPED REFUSAL. A line whose product has no record in the bundle cannot be
 * valued, and the aggregate refuses rather than reporting a figure it could not compute. The refusal is
 * `UnpriceableLineError`, which carries the exception and the product so the caller learns which record
 * it did not pass, and the mock adapter reports it as a `'validation'` `Problem` naming that cause and
 * the call's trace identifier (AAP 0.2.2, AAP 0.12.3). It is raised rather than returned because
 * AAP 0.12.1 fixes `revenueAtRisk` to answer a `Money` and `computeExceptionRows` to answer
 * `ExceptionRow[]`, and AAP 0.12.2 fixes `ExceptionRow` with a required `revenueAtRiskEur` and no
 * failure member, so neither result has an honest place to carry an outcome. Every other input is
 * normalised instead of refused (see `resolveAffectedLines`), because a unit count is record content
 * that may legitimately read as none while a missing price is a caller that did not pass the records
 * the rule requires.
 */

import type {
  AffectedLine,
  CustomerOrderId,
  ExceptionId,
  ExceptionRow,
  Freshness,
  IsoDate,
  Money,
  OperationalException,
  OrderResult,
  PlantId,
  ProductId,
  Scope,
  SolverResult,
  Timestamp,
} from '../../types';
import { halfUp2 } from '../solver/rounding';

/* ---------------------------------------------------------------------------------------------
 * A. Structural constants
 * ------------------------------------------------------------------------------------------- */

/** Milliseconds in a second, the base unit `Date.parse` reports an instant in. */
const MILLIS_PER_SECOND = 1_000;

/** Seconds in a minute. */
const SECONDS_PER_MINUTE = 60;

/** Minutes in an hour. */
const MINUTES_PER_HOUR = 60;

/**
 * Milliseconds in an hour: the divisor that turns the difference between two instants into the hours
 * an exception's age is counted in.
 */
const MILLIS_PER_HOUR = MILLIS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

/**
 * A unit count that places nothing at risk.
 *
 * It is the additive identity of the revenue sum, which is why a line that states no usable number
 * of units contributes it rather than a `NaN`: the line still names the order it concerns, and the
 * revenue total stays a number a screen can show.
 */
const NO_UNITS_AT_RISK = 0;

/* ---------------------------------------------------------------------------------------------
 * B. The record bundle the aggregates are computed from — AAP 0.12.1, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * One product's identifier and unit price: the only two members the revenue-of-risk rule reads.
 *
 * Declared here rather than in `src/types` because it is not a contracts type but the minimal shape
 * of the call: AAP 0.8 values a line at the product's price, and a seed product record carries other
 * members (`name`, `productClass`, `lineIds`, `description`) this module never reads. The precedent
 * for a module-local exported type in this layer is `ScopeFilterInput` in `./scope`. A full product
 * record is assignable to it, so the adapter passes its records through without mapping them.
 */
export interface PricedProduct {
  /** The product's identifier, `PRD-` followed by its own key. */
  readonly id: ProductId;

  /** The unit price in euro, at most two decimals: the factor the revenue rule multiplies. */
  readonly priceEur: Money;
}

/**
 * One customer order's identity: which product it covers, which plant ships it and when it is due.
 *
 * Declared here rather than in `src/types` for the reason `PricedProduct` records, and it exists for
 * one job: a baseline solve reports the units late per order identifier and nothing else about the
 * order, so an order the exception record does not name needs its product, plant and promise date
 * from the order book before it can become an `AffectedLine`. A customer order record is assignable
 * to it, so the adapter passes its own records.
 */
export interface OrderBookEntry {
  /** The order's identifier, `CO-nnnnnn`. */
  readonly id: CustomerOrderId;

  /** The product the order covers. */
  readonly productId: ProductId;

  /** The plant that has to ship it. */
  readonly plantId: PlantId;

  /** The date the customer was promised. */
  readonly dueDate: IsoDate;
}

/**
 * What the two exception aggregates read: one exception's baseline and the records its lines need.
 *
 * AAP 0.12.1 fixes the aggregates as `resolveAffectedLines(exception, baseline)` and
 * `revenueAtRisk(exception, baseline)` — two arguments, the exception then its baseline — and this
 * interface is the second one. The record access a line needs travels with the solve because it cannot
 * be reached from here: the product prices a line is valued at and the order book that identifies an
 * order the solve measures are record values, and rule P-6 keeps every price out of this module while
 * rule P-2 keeps it a projection over the types and its own siblings rather than a second entry point
 * into the records. `baselineViewFor` builds the view from the bundle the caller already holds.
 *
 * A view is read and never modified, and it holds no computed figure.
 */
export interface BaselineView {
  /** The baseline solve of the exception's case, or `null` when it has no case or none was supplied. */
  readonly solve: SolverResult | null;

  /** The unit price of each product a line may name. */
  readonly products: readonly PricedProduct[];

  /** The order identity each customer order a line or a baseline's order may name is read from. */
  readonly customerOrders: readonly OrderBookEntry[];
}

/**
 * One exception's already-measured baseline: the solve the caller took under the do-nothing levers.
 *
 * The solve is taken by the caller, not here. `solveSupplyDelay` needs a `SolverCase` this module may
 * not import (rule P-2), and AAP 0.12.1 hands the baseline in as a `SolverResult`, which is what keeps
 * this module a projection over records rather than a second entry point into the solver.
 */
export interface BaselineSolve {
  /** The exception the solve was taken for. */
  readonly exceptionId: ExceptionId;

  /** The result of solving that exception's case with neither lever pulled. */
  readonly result: SolverResult;
}

/**
 * Every record the exception aggregates read, in one bundle.
 *
 * AAP 0.12.1's signatures name `records` as what `computeExceptionRows` is computed over, and this
 * interface is that argument: the exceptions themselves, the product prices their lines are valued
 * at, the order book that identifies a line the record does not name, the baseline solves that
 * measure an exception carrying a solver case, and the two facts a row needs that no record holds —
 * the demonstration clock's instant and the freshness state of the read.
 *
 * The bundle is read and never modified, and it holds no computed figure: every member is either a
 * record or the state of the read. Collections are `readonly` because the adapter owns the mutable
 * state these are drawn from (AAP 0.2.1).
 */
export interface ExceptionAggregateInput {
  /** The exception records to aggregate, in any order. */
  readonly exceptions: readonly OperationalException[];

  /** The unit price of each product an exception's lines may name. */
  readonly products: readonly PricedProduct[];

  /** The identity of each customer order an exception's lines, or a baseline solve, may name. */
  readonly customerOrders: readonly OrderBookEntry[];

  /** The baseline solve of every exception that carries a solver case, keyed by that exception. */
  readonly baselines: readonly BaselineSolve[];

  /**
   * The source state the read was served under, copied onto every row.
   *
   * `src/types/screen-dto.ts` fixes `ExceptionRow.freshness` as the state the adapter attaches to the
   * read rather than a field stored on the exception, so the bundle carries it and this module copies
   * it into each row instead of synthesising a state of its own.
   */
  readonly freshness: Freshness;

  /**
   * The instant the rows are measured against: the demonstration clock, supplied by the caller.
   *
   * It is a member rather than a global read because a row's age must be a function of the records
   * (AAP 0.18.2), and because the constant clock of contracts §1 is what every "now" in the
   * application derives from.
   */
  readonly asOf: Timestamp;
}

/* ---------------------------------------------------------------------------------------------
 * C. The affected-lines derivation — AAP 0.12.2's "only input to revenue at risk"
 * ------------------------------------------------------------------------------------------- */

/**
 * Reads a unit count as a number that can place revenue at risk.
 *
 * A count a record or a solve states is used as it stands. A count that is absent from the arithmetic
 * — not a finite number, or negative, which no line can meaningfully carry — reads as the additive
 * identity `NO_UNITS_AT_RISK`, so the line keeps naming the order it concerns while the revenue total
 * stays a number rather than a `NaN`. This is a reading of one line's own count and never a
 * substitute for a missing record: a missing price is refused instead (see `revenueAtRisk`).
 *
 * @param units The count the record or the baseline solve states.
 * @returns That count when it is a finite positive number, and `NO_UNITS_AT_RISK` otherwise.
 */
function usableUnits(units: number): number {
  return Number.isFinite(units) && units > NO_UNITS_AT_RISK ? units : NO_UNITS_AT_RISK;
}

/**
 * Copies one stored affected line, normalising its unit count.
 *
 * The copy is what keeps the returned lines independent of the record the caller holds: a screen may
 * read or format a line without reaching the adapter's state (AAP 0.2.1).
 *
 * @param line The stored line, a member of the exception record's own `affectedLines`.
 * @returns A fresh line carrying the same identity and a usable unit count.
 */
function copyLine(line: AffectedLine): AffectedLine {
  return {
    orderId: line.orderId,
    productId: line.productId,
    plantId: line.plantId,
    dueDate: line.dueDate,
    unitsAtRisk: usableUnits(line.unitsAtRisk),
  };
}

/**
 * Finds the baseline solve's per-order result for one order.
 *
 * The match is by order identifier, which is the only key `OrderResult` and `AffectedLine` share, and
 * the search is a scan of the result's own array rather than an index into it, so an order the solve
 * did not measure answers `null` instead of reading past the end.
 *
 * @param baseline The baseline solve the caller took.
 * @param orderId The order to find.
 * @returns That order's result, or `null` when the solve measured no order with that identifier.
 */
function orderResultOf(baseline: SolverResult, orderId: CustomerOrderId): OrderResult | null {
  for (const orderResult of baseline.orders) {
    if (orderResult.orderId === orderId) {
      return orderResult;
    }
  }

  return null;
}

/**
 * Finds one customer order's identity in the order book.
 *
 * @param customerOrders The order book the baseline view carries.
 * @param orderId The order to find.
 * @returns That order's identity, or `null` when the order book carries no order with that identifier.
 */
function orderEntryOf(
  customerOrders: readonly OrderBookEntry[],
  orderId: CustomerOrderId,
): OrderBookEntry | null {
  for (const entry of customerOrders) {
    if (entry.id === orderId) {
      return entry;
    }
  }

  return null;
}

/**
 * Resolves the baseline solve an exception's lines are measured by, where its record names a case.
 *
 * An exception whose record carries no `solverCaseId` has no case to solve, so it answers `null` and
 * its own stored lines are used. An exception that names a case the bundle carries no solve for also
 * answers `null`: the aggregate reports the record's own lines rather than inventing a measurement,
 * which is what lets a caller aggregate a queue without solving every case in it.
 *
 * @param records The record bundle the aggregate was called with.
 * @param exception The exception whose baseline is wanted.
 * @returns The baseline solve for that exception, or `null` when it has none or none was supplied.
 */
function baselineOf(
  records: ExceptionAggregateInput,
  exception: OperationalException,
): SolverResult | null {
  if (exception.solverCaseId === undefined) {
    return null;
  }

  for (const baseline of records.baselines) {
    if (baseline.exceptionId === exception.id) {
      return baseline.result;
    }
  }

  return null;
}

/**
 * Builds the second argument of both exception aggregates: one exception's baseline and the records its
 * lines are read from.
 *
 * AAP 0.12.1 fixes `resolveAffectedLines(exception, baseline)` and `revenueAtRisk(exception, baseline)`,
 * and this is the `baseline` those two arguments name: the solve the caller took for the exception
 * (through the same lookup the queue rows use, so a queue row and a single valuation cannot disagree
 * about which solve a case has), the prices its lines are valued at and the order book that identifies
 * an order the solve measures. Building it here keeps every call site a single expression and keeps the
 * whole bundle out of the two aggregates' arguments.
 *
 * @param records The record bundle the caller holds: the prices, the order book and the baseline solves.
 * @param exception The exception whose lines are valued or derived.
 * @returns A fresh view over that exception's baseline and the records the lines need.
 */
export function baselineViewFor(
  records: ExceptionAggregateInput,
  exception: OperationalException,
): BaselineView {
  return {
    solve: baselineOf(records, exception),
    products: records.products,
    customerOrders: records.customerOrders,
  };
}

/**
 * Derives the customer order lines an exception places at risk — contracts §5; AAP 0.12.1 exception
 * aggregates; AAP 0.12.2's `OperationalException` row.
 *
 * This is the only input to `revenueAtRisk`, and the two sources it reads are the two the AAP names:
 *
 * 1. An exception with no solver case has no measurement beyond its record, so its own
 *    `affectedLines` are the answer, copied and with their unit counts normalised.
 * 2. An exception whose baseline solve is supplied takes its units from that solve. The baseline is
 *    the do-nothing measurement of the case: a line it reports with no units late places no revenue
 *    at risk under that measurement, so it is not an affected line; a line it reports with units late
 *    is an affected line for exactly those units, keeping the product, plant and promise date the
 *    record states. An order the solve measures that the record does not name is still affected by
 *    the case, so it becomes a line built from the order book; an order whose identity the order book
 *    does not carry cannot become a line and is skipped, because a line needs the product it is
 *    valued at. A stored line the solve does not measure keeps its own count, since the solve says
 *    nothing about it.
 *
 * Order of the returned lines: the record's own order first, then the solve's, so two calls with the
 * same records return the same sequence. Nothing in the input is modified, and every line returned is
 * a fresh object.
 *
 * @param exception The exception whose affected lines are derived. Its record is read and never
 *   modified. This is the first of the two arguments AAP 0.12.1 names.
 * @param baseline That exception's baseline: the solve, or `null` when it has no case or no solve was
 *   supplied, and the order book a solve's order is identified from. This is the second argument the
 *   AAP names; build it with `baselineViewFor`.
 * @returns A fresh array of affected lines, each with a usable unit count, in record order then solve
 *   order.
 */
export function resolveAffectedLines(
  exception: OperationalException,
  baseline: BaselineView,
): AffectedLine[] {
  const solve = baseline.solve;

  if (solve === null) {
    return exception.affectedLines.map(copyLine);
  }

  const lines: AffectedLine[] = [];
  const namedOrderIds: CustomerOrderId[] = [];

  for (const storedLine of exception.affectedLines) {
    namedOrderIds.push(storedLine.orderId);

    const orderResult = orderResultOf(solve, storedLine.orderId);
    const unitsAtRisk =
      orderResult === null ? usableUnits(storedLine.unitsAtRisk) : usableUnits(orderResult.unitsLate);

    if (unitsAtRisk > NO_UNITS_AT_RISK) {
      lines.push({
        orderId: storedLine.orderId,
        productId: storedLine.productId,
        plantId: storedLine.plantId,
        dueDate: storedLine.dueDate,
        unitsAtRisk,
      });
    }
  }

  for (const orderResult of solve.orders) {
    if (namedOrderIds.includes(orderResult.orderId)) {
      continue;
    }

    const unitsAtRisk = usableUnits(orderResult.unitsLate);

    if (unitsAtRisk === NO_UNITS_AT_RISK) {
      continue;
    }

    const entry = orderEntryOf(baseline.customerOrders, orderResult.orderId);

    if (entry === null) {
      continue;
    }

    lines.push({
      orderId: entry.id,
      productId: entry.productId,
      plantId: entry.plantId,
      dueDate: entry.dueDate,
      unitsAtRisk,
    });
  }

  return lines;
}

/* ---------------------------------------------------------------------------------------------
 * D. Revenue at risk per exception — contracts §5; AAP 0.8
 * ------------------------------------------------------------------------------------------- */

/**
 * The refusal a valuation raises when an affected line names a product the record bundle does not
 * carry.
 *
 * A plain `Error` would leave the adapter nothing to classify, so the refusal would cross the service
 * port untyped. This class is the aggregate's own name for that refusal: it carries the two
 * identifiers a reader needs — the exception whose line named the product and the product itself — and
 * the mock adapter reports it once, at the boundary, as a `'validation'` `Problem` carrying this
 * message and the call's trace identifier (AAP 0.2.2, AAP 0.12.3). A caller can therefore narrow it
 * with `instanceof` and read which record it did not pass, and nothing reaches a screen as a bare
 * exception.
 *
 * @remarks
 * It is the module's only refusal. Every other input is normalised into a reading, as
 * `resolveAffectedLines` documents, because a record value absent from the arithmetic (`usableUnits`)
 * is not the same thing as a record the caller did not hand in.
 */
export class UnpriceableLineError extends Error {
  /** The exception whose affected line names the unpriceable product. */
  readonly exceptionId: ExceptionId;

  /** The product the record bundle carries no unit price for. */
  readonly productId: ProductId;

  /**
   * @param exceptionId The exception whose affected line names the product.
   * @param productId The product the record bundle carries no unit price for.
   */
  constructor(exceptionId: ExceptionId, productId: ProductId) {
    super(
      `No product record for ${productId}, which an affected line of ${exceptionId} names, so its revenue cannot be computed.`,
    );
    this.name = 'UnpriceableLineError';
    this.exceptionId = exceptionId;
    this.productId = productId;
  }
}

/**
 * Reads the unit price of one product from the records the aggregate was handed, or answers `null`.
 *
 * A product the view does not carry cannot be priced: AAP 0.8 values a line at the product's price, and
 * an aggregate that substituted a price of its own would report a figure rule P-6 forbids it to
 * compute. The decision this function answers is therefore "no price" — `null` — rather than an
 * exception, and `sumRevenue` turns that decision into the typed refusal naming the exception and the
 * product, so the refusal is raised at the one place that knows the total cannot be completed.
 *
 * @param products The unit prices the baseline view carries.
 * @param productId The product to price.
 * @returns That product's unit price in euro, or `null` when the prices carry no such product.
 */
function priceOf(products: readonly PricedProduct[], productId: ProductId): Money | null {
  for (const product of products) {
    if (product.id === productId) {
      return product.priceEur;
    }
  }

  return null;
}

/**
 * Sums `unitsAtRisk × product price` over a set of affected lines and closes the total once.
 *
 * No line's amount is rounded on its way into the total: AAP 0.8 fixes "no intermediate rounding", so
 * the sum is taken in full precision and only the total is rounded half up to two decimals, through
 * the one rounding helper the codebase has.
 *
 * @param products The unit prices the baseline view carries, read for the product each line names.
 * @param exceptionId The exception the lines belong to, which the refusal names.
 * @param lines The affected lines to value.
 * @returns The revenue at risk in euro, at most two decimals.
 * @throws UnpriceableLineError when a line names a product the prices do not carry, since the total
 *   cannot be completed without inventing that line's price. The refusal carries the exception and the
 *   product, and the adapter reports it as a `'validation'` `Problem`.
 */
function sumRevenue(
  products: readonly PricedProduct[],
  exceptionId: ExceptionId,
  lines: readonly AffectedLine[],
): Money {
  let total = 0;

  for (const line of lines) {
    const price = priceOf(products, line.productId);

    if (price === null) {
      throw new UnpriceableLineError(exceptionId, line.productId);
    }

    total += line.unitsAtRisk * price;
  }

  return halfUp2(total);
}

/**
 * The revenue one exception places at risk — contracts §5; AAP 0.8's exceptions row; AAP 0.12.1
 * exception aggregates.
 *
 * The sum over the exception's affected lines of `unitsAtRisk × product price`, in euro with at most
 * two decimals, with no intermediate rounding. The lines are the ones `resolveAffectedLines` derives,
 * so an exception with a solver case is valued against its baseline solve and an exception without one
 * against its own record. Both prices and units come from records: this function types neither.
 *
 * An exception with no affected lines returns `0`, the additive identity of the sum, and not a
 * business reading — it says that no line the aggregate could resolve places revenue at risk, which is
 * what an empty queue row's figure is. The total is rounded through `halfUp2` alone, and no other
 * rounding rule or text formatting appears anywhere in this module.
 *
 * It answers the two-argument form AAP 0.12.1 fixes by deriving the lines and handing them to
 * {@link revenueOfAffectedLines}, which is the valuation to call when the lines are already in hand.
 *
 * @param exception The exception to value. Its record is read and never modified. This is the first of
 *   the two arguments AAP 0.12.1 names.
 * @param baseline That exception's baseline: the solve, or `null` when it has no case or no solve was
 *   supplied, and the records the lines are read from. This is the second argument the AAP names; build
 *   it with `baselineViewFor`.
 * @returns The revenue at risk in euro, at most two decimals.
 * @throws UnpriceableLineError when an affected line names a product the prices do not carry. The
 *   refusal carries the exception and the product, and the adapter reports it as a `'validation'`
 *   `Problem` naming that cause, so nothing untyped leaves the aggregate (AAP 0.2.2).
 */
export function revenueAtRisk(
  exception: OperationalException,
  baseline: BaselineView,
): Money {
  return revenueOfAffectedLines(exception, baseline, resolveAffectedLines(exception, baseline));
}

/**
 * The revenue a set of already-derived affected lines places at risk — contracts §5; AAP 0.8's
 * exceptions row.
 *
 * The valuation `revenueAtRisk` performs, for a caller that has already derived the lines: the sum over
 * `lines` of `unitsAtRisk × product price`, in euro with at most two decimals, closed once through
 * `halfUp2` with no intermediate rounding (AAP 0.8, contracts §4 rule 5). The prices are the ones the
 * baseline's `products` carry and the units are the ones the lines carry, so this function types
 * neither (rule P-6).
 *
 * A caller holding resolved lines uses this rather than `revenueAtRisk`, which derives them again
 * through `resolveAffectedLines`: valuing the lines where they are already in hand is what keeps one
 * aggregate from deriving a single exception's lines more than once per request (AAP 0.2.1). The lines
 * are read and never modified or copied, so a caller keeps the array it passed.
 *
 * @param exception The exception the lines belong to, which the refusal names. Its record is read and
 *   never modified.
 * @param baseline That exception's baseline, whose `products` member is the unit prices the lines are
 *   valued at; the solve is not read here. Build it with `baselineViewFor`.
 * @param lines The affected lines to value, already derived — the array `resolveAffectedLines` returned
 *   for this exception, or one a caller derived by the same rule.
 * @returns The revenue at risk in euro, at most two decimals, and `0` for an empty set of lines.
 * @throws UnpriceableLineError when a line names a product the prices do not carry, since the total
 *   cannot be completed without inventing that line's price. The refusal carries the exception and the
 *   product, and the adapter reports it as a `'validation'` `Problem` naming that cause (AAP 0.2.2).
 */
export function revenueOfAffectedLines(
  exception: OperationalException,
  baseline: BaselineView,
  lines: readonly AffectedLine[],
): Money {
  return sumRevenue(baseline.products, exception.id, lines);
}

/* ---------------------------------------------------------------------------------------------
 * E. The exception queue rows — specification SCR-02; AAP 0.12.2's `ExceptionRow`
 * ------------------------------------------------------------------------------------------- */

/**
 * Lists every plant one exception touches: the plant the disruption lands on, then the plants it
 * reaches, in the record's own order and without repeating one.
 *
 * This is the record's own answer to "which plants does this exception concern", and it is the list
 * every admission rule is applied to, so no surface can narrow an exception by a different set:
 * `admitsPlant` below reads it for a resolved scope, `src/domain/aggregation/overview.ts` reads it
 * through that function for the by-plant grouping, and the evidence family
 * (`src/services/mock/handlers/evidence.ts`) reads it to decide whether a record lies inside the
 * persona's plant scope. One list, one admission, so a figure cannot be shown where its evidence is
 * refused (AAP 0.2.1; principle PR-6).
 *
 * `alsoAffectsPlantIds` is the members the queue's plant filter matches (`ExceptionQuery.plantId`)
 * and the plants the by-plant table reports a row for, so the same set describes both.
 *
 * @param exception The exception to place.
 * @returns The plants the exception touches, the one it lands on first; a fresh array every call.
 */
export function plantsTouchedBy(exception: OperationalException): PlantId[] {
  const plants: PlantId[] = [exception.plantId];

  for (const plantId of exception.alsoAffectsPlantIds) {
    if (!plants.includes(plantId)) {
      plants.push(plantId);
    }
  }

  return plants;
}

/**
 * Says whether one exception falls inside the resolved scope's plant selection.
 *
 * AAP 0.2.1's scope is the one `./scope`'s `resolveScope` resolved, and this module never re-derives
 * it. An exception is in scope when the plant it lands on, or any plant it also affects, is one the
 * selection names — the `alsoAffectsPlantIds` member is exactly the set the queue's plant filter
 * matches, so an exception that reaches a plant in scope is not hidden from the planner watching that
 * plant.
 *
 * Exported because plant admission is one rule with one owner. `computeExceptionRows` below applies
 * it to the queue, `src/domain/aggregation/overview.ts` applies it to the population its tiles and
 * by-plant rows describe, the exception detail read applies it to a single record
 * (`src/services/mock/handlers/exceptions.ts`), and the evidence family applies the same plants
 * through `plantsTouchedBy` — so a narrowed queue, a narrowed overview and the evidence behind either
 * of them describe one population rather than three (AAP 0.2.1).
 *
 * A resolved `plants` member is never read as "all plants": `resolveScope` states that an empty array
 * means nothing is in scope, and reading it that way here is what makes a selection outside the
 * acting role's scope surface an empty queue rather than another plant's records.
 *
 * @param exception The exception to place.
 * @param scope The resolved scope, whose plants member is the selection intersected with the role's
 *   plant scope.
 * @returns `true` when the exception or a plant it also affects is in the selection.
 */
export function admitsPlant(exception: OperationalException, scope: Scope): boolean {
  return plantsTouchedBy(exception).some((plantId) => scope.plants.includes(plantId));
}

/**
 * Says whether the product selection admits the products a record's affected lines name.
 *
 * Exported because product admission is one rule with one owner. The exception queue
 * (`computeExceptionRows` below) and the overview (`./overview`) narrow by the same pair of predicates,
 * which `./overview` imports rather than restating, so a narrowed queue and a narrowed overview
 * describe the same population (AAP 0.2.1).
 *
 * An empty `products` member is the "All products" selection, which admits every record — that is the
 * reading `resolveScope` states for the product member. A named selection admits a record that names at
 * least one of the selected products, and excludes a record that names none of them, because a queue
 * filtered to a product must not show a record that does not concern it, and an overview filtered to
 * that product must not count one either.
 *
 * @param productIds The products the record names: an exception's affected lines, as `productIdsOf`
 *   lists them, or a material record's own `productIds` when the overview measures readiness.
 * @param scope The resolved scope, whose products member is the product selection.
 * @returns `true` when no product is selected, or when the record names one of the selected products.
 */
export function admitsProducts(productIds: readonly ProductId[], scope: Scope): boolean {
  if (scope.products.length === 0) {
    return true;
  }

  return productIds.some((productId) => scope.products.includes(productId));
}

/**
 * Lists the distinct products the affected lines of one record name, in the order the lines state them.
 *
 * The list is what the product selection is applied to — by the queue's `computeExceptionRows` and by
 * the overview, which imports this function and `admitsProducts` — so the identifiers a caller filters
 * on and the lines a record's revenue is computed from are the same records: a record can never be
 * admitted for one product and shown with another. One statement of the pair for both modules is what
 * keeps a narrowed queue and a narrowed overview describing the same population (AAP 0.2.1).
 * First-appearance order is what makes the list a function of the record rather than of a sorting
 * accident.
 *
 * @param lines The affected lines the record carries, as `resolveAffectedLines` derives them.
 * @returns The distinct product identifiers the lines name, in first-appearance order.
 */
export function productIdsOf(lines: readonly AffectedLine[]): ProductId[] {
  const productIds: ProductId[] = [];

  for (const line of lines) {
    if (!productIds.includes(line.productId)) {
      productIds.push(line.productId);
    }
  }

  return productIds;
}

/**
 * Counts the hours between an exception's detection and the instant the rows are measured at.
 *
 * Both instants are ISO 8601 timestamps with an offset, which `Date.parse` reads against their own
 * offset rather than against the host's time zone, so the difference is the same on every machine. The
 * function parses text and reads no clock at all: nothing in this module asks the system for the time,
 * and the as-of instant arrives in the bundle.
 *
 * The figure is the exact difference in hours, not a rounded or formatted reading: AAP 0.8 fixes the
 * rounding of money and counts, and `ExceptionRow.ageHours` is a duration the component formats. A
 * detection later than the as-of instant reads as zero hours, because a negative age is not a
 * reading; a timestamp that cannot be parsed reads as zero for the same reason, so a row shows no
 * elapsed time rather than `NaN`.
 *
 * @param detectedAt The instant the exception was detected, from its record.
 * @param asOf The instant the rows are measured against, from the bundle.
 * @returns The elapsed hours, a finite non-negative number.
 */
function ageHoursOf(detectedAt: Timestamp, asOf: Timestamp): number {
  const detectedMillis = Date.parse(detectedAt);
  const asOfMillis = Date.parse(asOf);

  if (Number.isNaN(detectedMillis) || Number.isNaN(asOfMillis)) {
    return 0;
  }

  const elapsedMillis = asOfMillis - detectedMillis;

  return elapsedMillis > 0 ? elapsedMillis / MILLIS_PER_HOUR : 0;
}

/**
 * Copies the read's freshness state onto a row.
 *
 * The state is copied member by member rather than by reference, so a screen that reads a row cannot
 * write through it to the adapter's state, and no state is synthesised: the three members are the ones
 * the bundle was handed (AAP 0.2.1, AAP 0.12.2's note that the adapter attaches the freshness).
 *
 * @param freshness The source state of the read.
 * @returns A fresh record carrying the same source, instant and state.
 */
function copyFreshness(freshness: Freshness): Freshness {
  return { source: freshness.source, asOf: freshness.asOf, state: freshness.state };
}

/**
 * Compares two exception identifiers: code-unit order, ascending.
 *
 * The rows are returned in identifier order, and the comparison must not depend on the host: a locale
 * comparison would order by the machine's collation, where a code-unit comparison answers identically
 * everywhere (AAP 0.18.2). Every exception identifier shares one shape, `EXC-2026-nnnn`, so code-unit
 * order is also the order a reader expects.
 *
 * @param left One identifier.
 * @param right The other identifier.
 * @returns A negative number when `left` sorts first, a positive one when `right` does, zero when they
 *   are equal.
 */
function compareIdentifiers(left: ExceptionId, right: ExceptionId): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

/**
 * One exception the resolved scope admits, together with everything admission already derived for it.
 *
 * Admission is one rule with one statement — the plant selection, the affected lines that selection
 * leaves and the product selection those lines decide — so the queue's rows and the canvas ribbon's
 * critical count read one population and cannot drift apart (AAP 0.2.1). Carrying the derived members
 * rather than deriving them again per consumer is what makes that one derivation: `lines` is the
 * `resolveAffectedLines` answer and `productIds` the `productIdsOf` answer, so a consumer that needs
 * only a count prices nothing, and one that needs a row values exactly these lines.
 *
 * A projection, not a record: the exception is the record the bundle holds, and the view, the lines and
 * the identifiers are values built here (AAP 0.2.1, AAP 0.18.2).
 */
export interface AdmittedException {
  /** The admitted exception, as the record bundle states it. */
  readonly exception: OperationalException;

  /** Its baseline: the solve its lines were measured by, or `null` when it has none. */
  readonly baseline: BaselineView;

  /** The affected lines `resolveAffectedLines` derived from that baseline. */
  readonly lines: AffectedLine[];

  /** The distinct products those lines name, in first-appearance order. */
  readonly productIds: ProductId[];
}

/**
 * Lists the exceptions the resolved scope admits, with the lines and the products admission derived.
 *
 * THE ADMISSION RULE, STATED ONCE. An exception is admitted when it is in the scope's plant selection —
 * it lands on a selected plant or reaches one, which is `admitsPlant` — and, where a product is selected,
 * when its affected lines name one of the selected products (`admitsProducts` over
 * `productIdsOf(lines)`). The lines are derived first because the product selection reads them, so an
 * exception admitted for a product is one whose lines were resolved either way.
 *
 * WHO READS IT, AND WHY HERE. `computeExceptionRows` projects this list onto the queue's twelve columns
 * and `./urgency`'s `countAtHeadOfUrgency` counts the head of it for the canvas ribbon, so the queue and
 * the ribbon describe one population rather than two independently filtered ones (AAP 0.2.1). A consumer
 * that needs no figure — the ribbon's critical count — therefore derives no revenue and builds no row.
 *
 * Order and copies: the list follows the bundle's exception order, and every member returned is built
 * here, so two calls with the same bundle return the same sequence and nothing returned reaches the
 * records (AAP 0.18.2). The one refusal stays `UnpriceableLineError`, raised by the consumer that prices
 * a line: deriving lines for a count refuses nothing.
 *
 * @param records The record bundle: the exceptions, the prices their lines are valued at, the order book
 *   and baseline solves the affected lines come from, and the read's freshness and as-of instant.
 * @param scope The resolved scope, from `./scope`'s `resolveScope`. Its `plants` member empty means
 *   nothing is in scope.
 * @returns One entry per admitted exception, in the bundle's exception order.
 */
export function admittedExceptions(
  records: ExceptionAggregateInput,
  scope: Scope,
): AdmittedException[] {
  const admitted: AdmittedException[] = [];

  for (const exception of records.exceptions) {
    if (!admitsPlant(exception, scope)) {
      continue;
    }

    const baseline = baselineViewFor(records, exception);
    const lines = resolveAffectedLines(exception, baseline);
    const productIds = productIdsOf(lines);

    if (!admitsProducts(productIds, scope)) {
      continue;
    }

    admitted.push({ exception, baseline, lines, productIds });
  }

  return admitted;
}

/**
 * Projects every exception the resolved scope admits onto one queue row — specification SCR-02;
 * AAP 0.12.1 exception aggregates; AAP 0.12.2's `ExceptionRow`.
 *
 * One row per entry `admittedExceptions` returns, carrying exactly what the queue's columns fix: the
 * identifier, type, title, the products the exception names, the plant the exception is recorded at, the
 * further plants it reaches, the severity, the revenue at risk, the days to impact, the status, the
 * owner, the age in hours and the freshness of the read. The revenue is the one the module's revenue
 * rule computes — `sumRevenue` over the affected lines admission already resolved — and nothing on the
 * row is a record's stored total, because no record stores one. The reached plants are the record's own
 * list, copied rather than shared, and they fill no column of their own: the Plant cell discloses them
 * beside the plant the row is recorded at, so the set the queue's plant filter matches and the set the
 * table shows are one set.
 *
 * The population is `admittedExceptions`'s, not a second filter of this function's: the plant selection
 * and the product selection are stated once, there, so a row cannot be admitted by one rule and counted
 * by another (AAP 0.2.1). Filters on type, severity, status, owner and supplier belong to the queue's own
 * query (`ExceptionQuery` in `src/types/service.ts`) and are applied by the service, not here.
 *
 * Ordering. Rows come back in ascending identifier order, so two calls with the same records return the
 * same sequence and a test can assert it. The queue's default order — severity, then days to impact,
 * then revenue at risk descending — is `sortUrgent` in `./urgency`, which orders exactly these rows;
 * no second ordering is stated here, and a screen applies that one.
 *
 * Every row is a fresh object and the records are read only, so the caller may sort, filter or render
 * the rows without reaching the bundle's state (AAP 0.2.1, AAP 0.18.2).
 *
 * @param records The record bundle: the exceptions, the prices their lines are valued at, the order
 *   book and baseline solves the affected lines come from, and the read's freshness and as-of instant.
 * @param scope The resolved scope, from `./scope`'s `resolveScope`. Its `plants` member empty means
 *   nothing is in scope.
 * @returns The queue rows, one per in-scope exception, in ascending identifier order.
 * @throws UnpriceableLineError when an in-scope exception names a product the bundle does not carry,
 *   since its revenue could not be computed. The refusal names the exception and the product, and the
 *   adapter reports it as a `'validation'` `Problem`, so the read is refused rather than a row carrying
 *   a figure nothing computed.
 */
export function computeExceptionRows(
  records: ExceptionAggregateInput,
  scope: Scope,
): ExceptionRow[] {
  const rows: ExceptionRow[] = admittedExceptions(records, scope).map((entry) => ({
    id: entry.exception.id,
    type: entry.exception.type,
    title: entry.exception.title,
    productIds: entry.productIds,
    plantId: entry.exception.plantId,
    alsoAffectsPlantIds: [...entry.exception.alsoAffectsPlantIds],
    severity: entry.exception.severity,
    revenueAtRiskEur: sumRevenue(entry.baseline.products, entry.exception.id, entry.lines),
    daysToImpact: entry.exception.daysToImpact,
    status: entry.exception.status,
    ownerId: entry.exception.ownerId,
    ageHours: ageHoursOf(entry.exception.detectedAt, records.asOf),
    freshness: copyFreshness(records.freshness),
  }));

  return rows.sort((left, right) => compareIdentifiers(left.id, right.id));
}

