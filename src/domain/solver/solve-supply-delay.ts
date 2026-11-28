/**
 * `solveSupplyDelay` — the one place in the application a response option is measured.
 *
 * Implements the eleven ordered rules of `platform-contracts.md` §4 over the parts a `SolverCase`
 * carries, in the order that section states them. The steps, and what each one produces:
 *
 * 1. The position the projection opens from is the case's opening stock together with the finished
 *    goods already built.
 * 2. The sets the two levers recover — `airSets` and `transferSets` together — join that position
 *    on the window's first working day. The deferral a transfer causes is the other site's, measured
 *    by the case's own `transferLeadTimeDays`, so the recovered sets are on hand from the start of
 *    this projection rather than arriving part-way through it.
 * 3. Each working day the line builds the smaller of `ratePerDay` and the stock on hand, so stock is
 *    only ever consumed to the extent it exists: the closing-stock series therefore reaches zero and
 *    stays there, and never falls below it. The delayed purchase order adds nothing, because the
 *    case names that order without a date it arrives on — the order that does not arrive is the
 *    disruption the case measures.
 * 4. The run-out is the first day the position reaches zero (contracts §4 rule 4), reported as that
 *    working day's number within the window and as the fraction of that day the position covered
 *    before it was gone. The interface renders the pair as the day plus a half-day reading such as
 *    "midday"; that wording is presentation and belongs to `src/components`, so this module reports
 *    the fraction and no text.
 * 5. Line idle days accumulate `(rate − output) / rate` over the working days the line builds short
 *    of its rate, and the total is closed once with `halfUp2` (contracts §4 rule 5).
 * 6. The case's orders are served in due-date order, the case's own order breaking a tie, each from
 *    the units the line has finished by the order's due date.
 * 7. An order's units late are its quantity less what the projection served it, and its days late
 *    are the working days from its due date to the day its last unit shipped — or to the window's
 *    last day while it is still outstanding.
 * 8. Units late, orders on time, orders total and the maximum days late are read directly off those
 *    per-order results, so each measure has one formula and no aggregate restates a per-order figure.
 * 9. The added cost of an option is what each lever's recovered sets cost at the rate the case carries
 *    for that lever, summed and closed to two decimals with `halfUp2` (contracts §4 rule 9).
 * 10. The revenue an option delays is the units it leaves late, each order's units valued at the price
 *    that order's own record states, summed and closed to two decimals with `halfUp2` (rule 10).
 * 11. A side effect follows from the transfer lever alone, because a transfer draws sets from another
 *    site's supply while the air lever does not: the kits it moves, what they are worth and how long
 *    the site they came from waits for them, each read from the case. The write-backs are the case's
 *    own plan, and an option whose levers recover sets is the one that sets that plan in motion.
 *
 * The two euro measures are computed from the case's own money (contracts §4 rules 9 and 10, rule
 * P-6). No price, rate or amount is written here: the lever rates, the orders' prices and the
 * transferred product's price all arrive on the case, which is what keeps this module a pure function
 * of its arguments. Both totals are closed with `halfUp2`, the codebase's only rounding, so an order
 * priced with decimals leaves no floating-point artifact and no money figure leaves at a finer scale
 * than `Money` carries.
 *
 * The deferral is measured where it falls: at the site a transfer draws its sets from. The case names
 * the product that site gives up, what those kits are worth and the working days it waits for them, and
 * the side effect reports the three together. Nothing here values a deferral against this case's own
 * orders, which are the ones the option is trying to serve.
 *
 * The write-backs are the case's plan, copied rather than invented: an option whose levers recover sets
 * returns the steps the case states, as fresh objects the caller may mark up, and the do-nothing
 * baseline sets nothing in motion and returns the empty list.
 *
 * The confidence. `SolverResult.confidence` is required and `SolverCase` carries no member holding one,
 * so the result reports the lowest level with the reason that it is the lowest, and the adapter
 * composing a `Scenario` supplies the record's own confidence instead.
 *
 * Purity and determinism (AAP 0.2.1, AAP 0.18.2). This is a pure function of its two arguments: it
 * reads no clock, no random source, no global state and no module-level mutable value, so the same
 * case and the same levers always produce a deeply equal result. It mutates neither argument — every
 * array it sorts or fills is one it built itself — and it takes no identity from the case: a
 * scenario's `id`, `exceptionId`, `name` and `origin` belong to the adapter that composes one.
 *
 * A failure is a result, never a throw (AAP 0.8, AAP 0.12.3). A case that cannot be measured returns
 * a `constraintCheck` of `fail` with one plain message per breach — the sandbox and the comparison
 * matrix show that option as "Cannot compute" with its reason — and no measure is emitted as `NaN`,
 * `Infinity` or a figure that looks computed.
 *
 * Rules this module is built to satisfy:
 * - P-6: every figure derives from the case's own members. Not one price, threshold, date or
 *   identifier is typed here, and the expected results of `platform-seed-data.md` are test fixtures
 *   that this module neither holds nor reads.
 * - P-7: the constraint messages are user-visible prose, so they name a lever or a case input in
 *   plain words and name no company, site, person or product beyond the identifiers the case carries.
 * - P-4: neither the run-out, nor the series, nor the side effects claim anything beyond the
 *   arithmetic that produces them.
 * - P-2: it imports `src/types` and its two sibling modules, and nothing else — no seed record, no
 *   adapter, no service — so it cannot become a second data boundary.
 * - P-1: it emits no label and no `SimLabel`; the component that renders a figure applies the
 *   `Simulated calculation` label.
 * - B-1, B-2: no address, no request, no credential-shaped member, and nothing reads configuration.
 */

import type {
  Confidence,
  ConstraintCheck,
  DailyClosingStockPoint,
  IsoDate,
  LeverConstraint,
  Levers,
  OrderResult,
  RunOut,
  SideEffect,
  SolverCase,
  SolverOrderInput,
  SolverResult,
  WriteBack,
} from '../../types';
import { isWorkingDay, nextWorkingDay, workingDaysBetween, workingDaysInRange } from './calendar';
import { halfUp2 } from './rounding';

/* ---------------------------------------------------------------------------------------------
 * A. Structural constants
 * ------------------------------------------------------------------------------------------- */

/**
 * The `day` a `RunOut` carries when no run-out falls inside the projection window: the position
 * survives every working day of the window, so there is no day to name. A run-out inside the window
 * is numbered from one, which leaves zero to mean "never inside this window".
 */
const NO_RUN_OUT_DAY = 0;

/** A fraction of a day at which the position was already gone when the day opened. */
const DAY_OPENED_EMPTY = 0;

/** A fraction of a day at which the position covered the day to its end. */
const DAY_COVERED = 1;

/**
 * How far a lever may sit from a multiple of its step and still be taken as on it. Binary floating
 * point represents many decimal steps inexactly, so a value one rounding error short of a multiple
 * must pass; the tolerance is far below any step a case declares.
 */
const STEP_TOLERANCE = 1e-9;

/* ---------------------------------------------------------------------------------------------
 * B. Reading and checking the inputs
 * ------------------------------------------------------------------------------------------- */

/**
 * Reports whether the text names a calendar date the projection can be walked over.
 *
 * The calendar module is the only place that decides what a date is, so this check is built from its
 * two behaviours and from no date parsing of its own: a working day answers `isWorkingDay`, and a
 * weekend is a date `nextWorkingDay` moves forward from. Those two together are exactly the
 * well-formed dates; a malformed one is the single case where `nextWorkingDay` returns its argument
 * unchanged while `isWorkingDay` rejects it.
 *
 * @param date The text to test, expected as `YYYY-MM-DD`.
 * @returns `true` for a well-formed calendar date, weekend or working day; `false` otherwise.
 */
function isCalendarDate(date: IsoDate): boolean {
  if (isWorkingDay(date)) {
    return true;
  }

  return nextWorkingDay(date) !== date;
}

/**
 * Confines a fraction of a day to the closed interval a `RunOut` reports.
 *
 * A position that was gone when the day opened is the start of that day, and one that covered the
 * whole day is its end; a figure outside that interval is a defect in the arithmetic rather than a
 * reading, so it is reported as the nearest end of the interval instead of propagating.
 *
 * @param value The computed fraction of the day.
 * @returns The fraction, in `[0, 1]`.
 */
function clampToDay(value: number): number {
  if (!Number.isFinite(value) || value <= DAY_OPENED_EMPTY) {
    return DAY_OPENED_EMPTY;
  }

  return value > DAY_COVERED ? DAY_COVERED : value;
}

/**
 * Reports whether a lever sits on a multiple of its step.
 *
 * The remainder is compared both ways round, because a value a hair below a multiple leaves a
 * remainder a hair below the step; the smaller of the two distances is the one that says whether the
 * value is on the step.
 *
 * @param value The lever's value.
 * @param step The increment the case fixes for that lever.
 * @returns `true` when the value sits on a step or within `STEP_TOLERANCE` of one.
 */
function isOnStep(value: number, step: number): boolean {
  const remainder = value % step;
  const distanceToStep = Math.min(remainder, step - remainder);

  return distanceToStep <= STEP_TOLERANCE;
}

/**
 * Collects the messages for one lever's bound: the case's own bound first, then the value set against
 * it. One message per breach, each naming the lever in plain words, and none naming anything the
 * case does not carry.
 *
 * @param label How the lever is named to the reader, such as `Air freight sets`.
 * @param value The value the option sets the lever to.
 * @param constraint The bound the case declares for that lever.
 * @param messages The list the breach messages are appended to.
 */
function checkLever(label: string, value: number, constraint: LeverConstraint, messages: string[]): void {
  const { max, step } = constraint;
  const lowerCaseLabel = label.toLowerCase();

  if (!Number.isFinite(max) || max < 0) {
    messages.push(`The solver case carries no usable maximum for ${lowerCaseLabel}.`);
  }

  if (!Number.isFinite(step) || step <= 0) {
    messages.push(`The solver case carries no usable step for ${lowerCaseLabel}.`);

    return;
  }

  if (!Number.isFinite(value)) {
    messages.push(`${label} must be a number.`);

    return;
  }

  if (value < 0) {
    messages.push(`${label} must not be negative.`);
  }

  if (Number.isFinite(max) && value > max) {
    messages.push(`${label} must not exceed the case's maximum of ${max}.`);
  }

  if (!isOnStep(value, step)) {
    messages.push(`${label} must be a multiple of the case's step of ${step}.`);
  }
}

/**
 * Collects one message per input the projection cannot be walked over without.
 *
 * The case is checked for the inputs each of the eleven rules reads — the opening position, the build
 * rate, a window that holds a working day, at least one order with a quantity, a due date and a price,
 * the two lever rates and the transferred product's price and lead time — and each lever for
 * finiteness, the floor of zero, the case's own maximum and its step. Nothing is clamped and nothing
 * is corrected: a breach is reported so the option can be shown as "Cannot compute" with its reason
 * (AAP 0.8, AAP 0.12.2).
 *
 * @param caseRecord The solver case to check.
 * @param levers The lever values the option sets.
 * @returns The messages, empty when every input the rules read is present and in range.
 */
function collectConstraintMessages(caseRecord: SolverCase, levers: Levers): string[] {
  const messages: string[] = [];

  if (!Number.isFinite(caseRecord.openingStock) || caseRecord.openingStock < 0) {
    messages.push('The solver case must carry an opening stock that is a finite, non-negative number of units.');
  }

  if (!Number.isFinite(caseRecord.finishedGoods) || caseRecord.finishedGoods < 0) {
    messages.push('The solver case must carry finished goods that are a finite, non-negative number of units.');
  }

  if (!Number.isFinite(caseRecord.ratePerDay) || caseRecord.ratePerDay <= 0) {
    messages.push('The solver case must carry a build rate greater than zero units per working day.');
  }

  if (!Number.isFinite(caseRecord.airFreightCostPerSetEur) || caseRecord.airFreightCostPerSetEur < 0) {
    messages.push('The solver case must carry a finite, non-negative air-freight cost per set.');
  }

  if (!Number.isFinite(caseRecord.transferCostPerSetEur) || caseRecord.transferCostPerSetEur < 0) {
    messages.push('The solver case must carry a finite, non-negative transfer cost per set.');
  }

  if (!Number.isFinite(caseRecord.transferUnitPriceEur) || caseRecord.transferUnitPriceEur < 0) {
    messages.push('The solver case must carry a finite, non-negative price for the transferred sets.');
  }

  if (!Number.isFinite(caseRecord.transferLeadTimeDays) || caseRecord.transferLeadTimeDays < 0) {
    messages.push('The solver case must carry a finite, non-negative transfer lead time in working days.');
  }

  const windowOpens = isCalendarDate(caseRecord.windowStart);
  const windowCloses = isCalendarDate(caseRecord.windowEnd);

  if (!windowOpens) {
    messages.push('The solver case must open its projection window on a calendar date.');
  }

  if (!windowCloses) {
    messages.push('The solver case must close its projection window on a calendar date.');
  }

  if (windowOpens && windowCloses && workingDaysInRange(caseRecord.windowStart, caseRecord.windowEnd).length === 0) {
    messages.push('The solver case carries no projection window: the dates it names hold no working day.');
  }

  if (caseRecord.orders.length === 0) {
    messages.push('The solver case carries no customer order to measure.');
  }

  for (const order of caseRecord.orders) {
    if (!Number.isFinite(order.quantity) || order.quantity < 0) {
      messages.push(`Order ${order.orderId} must carry a finite, non-negative quantity of units.`);
    }

    if (!Number.isFinite(order.unitPriceEur) || order.unitPriceEur < 0) {
      messages.push(`Order ${order.orderId} must carry a finite, non-negative unit price.`);
    }

    if (!isCalendarDate(order.dueDate)) {
      messages.push(`Order ${order.orderId} must carry a calendar date as its due date.`);
    }
  }

  checkLever('Air freight sets', levers.airSets, caseRecord.airSets, messages);
  checkLever('Transfer sets', levers.transferSets, caseRecord.transferSets, messages);

  return messages;
}

/* ---------------------------------------------------------------------------------------------
 * C. The daily projection
 * ------------------------------------------------------------------------------------------- */

/** One order's progress through the projection, kept in the case's order. */
interface OrderProgress {
  /** The case's own order record. */
  order: SolverOrderInput;

  /** How many of the order's units the projection has served. */
  unitsServed: number;

  /** The working day its last unit shipped on, or `null` while units are still outstanding. */
  deliveryDate: IsoDate | null;
}

/** What one walk over the projection window yields for the measures around it. */
interface Projection {
  /** The stock left at each working day's close, ascending by date. */
  series: DailyClosingStockPoint[];

  /** When the position reached zero, or `NO_RUN_OUT_DAY` when it survived the window. */
  runOut: RunOut;

  /** Line idle days as the sum of the daily fractions, before rounding. */
  idleDayFraction: number;

  /** One entry per order the case carries, in the case's own order. */
  orders: OrderProgress[];
}

/**
 * Walks the case's window one working day at a time, producing the closing-stock series, the run-out,
 * the idle-day fractions and each order's progress in that single pass.
 *
 * One walk fills all four, so the chart, the idle-day measure and the per-order measures cannot
 * disagree about what happened. The stock is drawn down only by what the line builds, so it can never
 * go below zero; the finished goods grow by that build and shrink by what ships.
 *
 * Dates come from the calendar module and are compared as text: an `IsoDate` is `YYYY-MM-DD`, whose
 * lexicographic order is its chronological order, so a due date on or before the day being walked is
 * due on that day. Nothing here reads the clock.
 *
 * @param caseRecord The case being measured; the caller has already checked its inputs.
 * @param levers The lever values the option sets; the caller has already checked their bounds.
 * @returns The series, the run-out, the idle-day fractions and the per-order progress.
 */
function project(caseRecord: SolverCase, levers: Levers): Projection {
  const days = workingDaysInRange(caseRecord.windowStart, caseRecord.windowEnd);
  const rate = caseRecord.ratePerDay;

  let stock = caseRecord.openingStock + levers.airSets + levers.transferSets;
  let finished = caseRecord.finishedGoods;

  const orders: OrderProgress[] = caseRecord.orders.map((order) => ({
    order,
    unitsServed: 0,
    deliveryDate: null,
  }));

  /*
   * The orders are served earliest due date first, the case's own order breaking a tie, so a later
   * order never takes units an earlier one was owed. The list holds indices into `orders`, which stays
   * in the case's order for the result the caller returns.
   */
  const servingOrder = orders.map((_progress, index) => index);
  servingOrder.sort((left, right) => {
    const first = orders[left];
    const second = orders[right];

    if (first === undefined || second === undefined || first.order.dueDate === second.order.dueDate) {
      return left - right;
    }

    return first.order.dueDate < second.order.dueDate ? -1 : 1;
  });

  const series: DailyClosingStockPoint[] = [];
  let idleDayFraction = 0;
  let runOut: RunOut | null = null;
  let dayNumber = 0;

  for (const date of days) {
    dayNumber += 1;

    const opening = stock;
    const output = stock > 0 ? Math.min(rate, stock) : 0;

    stock -= output;
    finished += output;

    if (output < rate) {
      idleDayFraction += (rate - output) / rate;
    }

    for (const index of servingOrder) {
      const progress = orders[index];

      if (progress === undefined || progress.order.dueDate > date) {
        continue;
      }

      const outstanding = progress.order.quantity - progress.unitsServed;

      if (outstanding <= 0) {
        continue;
      }

      const shipped = Math.min(outstanding, finished);

      if (shipped > 0) {
        progress.unitsServed += shipped;
        finished -= shipped;

        if (progress.unitsServed === progress.order.quantity) {
          progress.deliveryDate = date;
        }
      }
    }

    const closing = stock > 0 ? stock : 0;
    series.push({ date, units: closing });

    if (runOut === null && closing === 0) {
      runOut = { day: dayNumber, fractionOfDay: clampToDay(opening / rate) };
    }
  }

  return {
    series,
    runOut: runOut ?? { day: NO_RUN_OUT_DAY, fractionOfDay: DAY_OPENED_EMPTY },
    idleDayFraction,
    orders,
  };
}

/**
 * Counts the working days an order is late.
 *
 * The count runs from the order's due date to the day its last unit shipped, so an order served on
 * its due date — or on the first working day after a due date that fell on a weekend — is not late at
 * all. An order that never ships inside the window is measured to the window's last working day,
 * which is the delay observed so far rather than a claim about when it will arrive.
 *
 * @param progress The order's progress through the projection.
 * @param windowEnd The last date the projection covers.
 * @returns The working days late, zero when the order arrived by its due date.
 */
function daysLateOf(progress: OrderProgress, windowEnd: IsoDate): number {
  const delivered = progress.deliveryDate === null ? windowEnd : progress.deliveryDate;

  return workingDaysBetween(progress.order.dueDate, delivered);
}

/**
 * Derives the side effects of the levers.
 *
 * A transfer recovers sets by drawing them from another site's supply, so the sets it moves are
 * deferred there: that is the effect, its size is the lever's own value, its value is those sets at
 * the price the case states for the transferred product, and its length is the working days that site
 * waits. The air lever takes no sets from another site's plan, so it adds no side effect, and a lever
 * at zero adds none either.
 *
 * @param caseRecord The case being measured.
 * @param levers The lever values the option sets.
 * @returns The side effects, empty when the transfer lever is at zero.
 */
function sideEffectsOf(caseRecord: SolverCase, levers: Levers): SideEffect[] {
  if (levers.transferSets <= 0) {
    return [];
  }

  return [
    {
      productId: caseRecord.transferProductId,
      kitsDelayed: levers.transferSets,
      valueDeferredEur: halfUp2(levers.transferSets * caseRecord.transferUnitPriceEur),
      daysDeferred: caseRecord.transferLeadTimeDays,
    },
  ];
}

/**
 * The write-backs an option sets in motion.
 *
 * The steps the case's record states are what an approval of the plan would write back, so an option
 * whose levers recover sets — by air freight, by transfer, or by both — returns them in the record's
 * own order, as fresh objects on every call so a caller may mark a step up without reaching into the
 * record. The do-nothing baseline recovers nothing and sets no plan in motion, so it returns the empty
 * list. No step is derived, extended or invented here (rule P-6).
 *
 * @param caseRecord The case being measured.
 * @param levers The lever values the option sets.
 * @returns The steps the option writes back, or the empty list for an option that recovers no set.
 */
function writeBacksOf(caseRecord: SolverCase, levers: Levers): WriteBack[] {
  if (levers.airSets + levers.transferSets <= 0) {
    return [];
  }

  return caseRecord.writeBacks.map((step) => ({ ...step }));
}

/**
 * The confidence a measurement carries when the case states none.
 *
 * Nothing in the case supports a level, so the result reports the lowest one with the reason that it
 * is the lowest rather than leaving the required member empty. The adapter composing a `Scenario`
 * supplies the record's own confidence.
 *
 * @returns The lowest level with the reason it is the lowest.
 */
function caseConfidence(): Confidence {
  return {
    level: 'low',
    reason: 'The solver case carries no confidence of its own, so this measurement carries the lowest level.',
  };
}

/* ---------------------------------------------------------------------------------------------
 * D. The measurement
 * ------------------------------------------------------------------------------------------- */

/**
 * Measures one response option against a supply-delay case.
 *
 * Implements contracts §4 rules 1 to 11 in order over the parts `SolverCase` carries: the opening
 * position, the two levers and the rates they cost, the daily projection, the run-out day and the
 * fraction of it, line idle days rounded half up to two decimals, the per-order results, the counts
 * read off them, the added cost, the revenue delayed, the side effects the transfer defers and the
 * write-backs the plan sets in motion. The header of this module states each step.
 *
 * The function is pure and deterministic: it reads no clock, no random source and no global state,
 * and it mutates neither argument, so the same case and the same levers always produce a deeply equal
 * result. The result carries measures and no identity — a scenario's identifier, its exception and
 * its name are added by the adapter that composes one — and it echoes the levers it measured so a
 * column of the comparison matrix can state the option it shows.
 *
 * A failure is returned, never thrown: a case whose inputs are missing or malformed, or a lever below
 * zero, above its maximum or between two steps, produces a `constraintCheck` of `fail` with one plain
 * message per breach. The caller shows that option as "Cannot compute" with its reason and
 * recommends nothing; no measure is emitted as `NaN`, `Infinity` or a figure that looks computed.
 *
 * @param caseRecord The case to measure — the exception's supply position, its lever bounds, the
 *   orders at stake and the window the projection covers.
 * @param levers The sets the option recovers by air freight and by transfer.
 * @returns The option's measures, or a failed constraint check with the reasons it could not be taken.
 */
export function solveSupplyDelay(caseRecord: SolverCase, levers: Levers): SolverResult {
  /*
   * The levers are echoed as numbers: a lever that is not a finite number is echoed as zero, because
   * the result may carry no `NaN` even when the option it describes is the one that breached its
   * bound.
   */
  const echoedLevers: Levers = {
    airSets: Number.isFinite(levers.airSets) ? levers.airSets : 0,
    transferSets: Number.isFinite(levers.transferSets) ? levers.transferSets : 0,
  };

  const constraintMessages = collectConstraintMessages(caseRecord, levers);
  const constraintCheck: ConstraintCheck = constraintMessages.length === 0 ? 'pass' : 'fail';

  if (constraintCheck === 'fail') {
    /*
     * Nothing is measured, so every measure is the neutral zero the rules give an absent reading:
     * counts of zero, no euro figure, an empty series and an empty order list, and a run-out of
     * `NO_RUN_OUT_DAY`. The failed check and its messages are the result.
     */
    return {
      unitsLate: 0,
      maxDaysLate: 0,
      ordersOnTime: 0,
      ordersTotal: 0,
      addedCostEur: 0,
      lineIdleDays: 0,
      revenueDelayedEur: 0,
      runOut: { day: NO_RUN_OUT_DAY, fractionOfDay: DAY_OPENED_EMPTY },
      dailyClosingStock: [],
      orders: [],
      constraintCheck,
      constraintMessages,
      sideEffects: [],
      writeBacks: [],
      levers: echoedLevers,
      confidence: caseConfidence(),
    };
  }

  const projection = project(caseRecord, levers);

  const orderResults: OrderResult[] = [];
  let unitsLate = 0;
  let ordersOnTime = 0;
  let maxDaysLate = 0;
  let delayedRevenue = 0;

  for (const progress of projection.orders) {
    const outstanding = progress.order.quantity - progress.unitsServed;
    const unitsLateForOrder = outstanding > 0 ? outstanding : 0;
    const daysLate = unitsLateForOrder > 0 ? daysLateOf(progress, caseRecord.windowEnd) : 0;

    orderResults.push({ orderId: progress.order.orderId, unitsLate: unitsLateForOrder, daysLate });

    unitsLate += unitsLateForOrder;

    if (unitsLateForOrder === 0) {
      ordersOnTime += 1;
    } else {
      /*
       * An order that misses its date holds up its own revenue, so the units it is left late are
       * valued at the price its own record states rather than at the case's product price.
       */
      delayedRevenue += unitsLateForOrder * progress.order.unitPriceEur;
    }

    if (daysLate > maxDaysLate) {
      maxDaysLate = daysLate;
    }
  }

  /*
   * What the option costs is what its levers cost: every set it recovers by air freight at the case's
   * air-freight rate, every set it transfers at the case's transfer rate. The sum is closed once with
   * `halfUp2`, so a rate with decimals cannot leave a trailing artifact behind in a euro figure.
   */
  const addedCostEur = halfUp2(
    levers.airSets * caseRecord.airFreightCostPerSetEur +
      levers.transferSets * caseRecord.transferCostPerSetEur,
  );

  /** The delayed revenue, closed the same way once every order's units have been valued. */
  const revenueDelayedEur = halfUp2(delayedRevenue);

  return {
    unitsLate,
    maxDaysLate,
    ordersOnTime,
    ordersTotal: orderResults.length,
    addedCostEur,
    lineIdleDays: halfUp2(projection.idleDayFraction),
    revenueDelayedEur,
    runOut: projection.runOut,
    dailyClosingStock: projection.series,
    orders: orderResults,
    constraintCheck,
    constraintMessages,
    sideEffects: sideEffectsOf(caseRecord, levers),
    writeBacks: writeBacksOf(caseRecord, levers),
    levers: echoedLevers,
    confidence: caseConfidence(),
  };
}
