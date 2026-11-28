// @vitest-environment node

/**
 * The solver suite of `src/domain/solver` — the folder's single test module.
 *
 * What it proves. `solveSupplyDelay` is the one place a response option is measured (contracts §4
 * rules 1 to 11), and every figure the comparison matrix, the projected-stock chart and the
 * assistant's answers show comes from it. Each case below asserts one rule against an expectation
 * derived here from the case's own inputs by the rule that produces it, so a wrong result fails
 * rather than being recorded as the expected one. `halfUp2` and `wholePercent` are asserted against
 * the rounding rule contracts §4 rule 5 and §5 fix, and the calendar against the Monday-to-Friday
 * working week contracts §1 fixes, because a test module per helper would be a second and third
 * file in a folder the plan gives exactly one.
 *
 * THE EXPECTED-RESULTS COMPARISON IS IN THIS FILE, AND WHAT IT PROVES. AAP 0.7 success criterion 1
 * is a row-by-row comparison of this function's output against the fixture
 * `tests/fixtures/solver-expected-results.ts` — the seed file's expected-results table held as a
 * fixture, four named scenarios plus two sandbox rows — and the last section below is that
 * comparison: it runs `solveSupplyDelay` on the seeded case `CASE-1184` with each row's levers and
 * asserts units late, maximum days late, orders on
 * time, added cost, line idle days, revenue delayed and the constraint check against the fixture,
 * failing on the first mismatch with the row and the measure in the message. The fixture's figures
 * are derived from the seeded case's own inputs and each group states its arithmetic, so the
 * comparison proves the seed's own expected results rather than recording whatever this function
 * returns. Everything else in the file remains: the probe cases below assert each rule against an
 * expectation the rule produces from inputs chosen to make the arithmetic followable by hand, which
 * is a different question from whether the seeded case's table comes out.
 *
 * The two euro measures are asserted for the values the probe case's own money produces — each lever's
 * recovered sets at the rate the case carries for that lever, and each late order's units at the price
 * that order's record states — and for the invariants every euro figure keeps: finite, non-negative and
 * on a hundredth. Both figures come from the case's own record, so nothing here restates a price the
 * case does not carry (rule P-6).
 *
 * The probe cases. The inputs below are structural values chosen so each rule's arithmetic can be
 * followed by hand: small whole numbers of units, the plain Monday-to-Friday week of 1 to 5 March
 * 2027, and identifiers carrying `PROBE`, which no seed record uses and none can be mistaken for.
 * They restate no seed figure and name no product, plant, customer or company of the demonstration.
 *
 * Rules this module is built to satisfy:
 * - P-6: no business figure is typed here. Every expected measure is either re-derived from the
 *   probe case's own inputs by the rule under test, computed by hand from those inputs where the
 *   arithmetic is small enough to follow in the comment that states it, an invariant over the
 *   result, or read from `tests/fixtures/solver-expected-results.ts`, which rule P-6 makes the one
 *   home of an expected figure.
 * - P-2: it imports the three sibling modules, the shared types, `vitest` and the mock adapter's
 *   `loadSeed()` — so the arithmetic is exercised exactly as the adapter exercises it, and the seeded
 *   case arrives through the one door rule P-2 leaves open. The note above the import states why the
 *   case is reached that way.
 * - P-7: the probe identifiers are test-local and carry `PROBE`, and every other identifier is a
 *   seeded record's own; no real vendor, customer, carmaker or cloud product is named, and no filler
 *   prose appears.
 * - P-4: no title or message claims the calculation establishes anything about a live system.
 * - B-1, B-2: the suite performs no I/O beyond importing its modules and holds no credential-shaped
 *   literal; nothing reads configuration.
 * - P-1: no simulation label is emitted or imported — labelling a figure is the component's work.
 */

import { describe, expect, it } from 'vitest';

import type {
  IsoDate,
  Levers,
  OrderResult,
  SolverCase,
  SolverOrderInput,
  SolverResult,
} from '../../types';
import { isWorkingDay, nextWorkingDay, workingDaysBetween, workingDaysInRange } from './calendar';
import { halfUp2, wholePercent } from './rounding';
import { solveSupplyDelay } from './solve-supply-delay';

/*
 * The seeded case is reached here for one reason: AAP 0.7 success criterion 1 and T-25 compare this
 * function's output against the seed's expected-results table, and a comparison cannot exist without
 * the case the table is measured at.
 *
 * HOW IT IS REACHED, AND WHY THIS WAY. Rule P-2 lets one module read `src/seed/` — the mock adapter's
 * loader — and `tests/source-checks/no-seed-import-outside-mock.test.ts` fails on every other import of
 * the folder, a suite included. The case therefore arrives through `loadSeed()`, the same call the
 * adapter's bootstrap makes, which returns a typed deep clone of the whole record set. That is a
 * deliberate test-only dependency from this folder on `src/services/mock`: rule P-2 leaves no other
 * door to a seeded record, and the four modules under test (`solve-supply-delay.ts`, `calendar.ts`,
 * `rounding.ts` and the shared types) still import neither the service layer nor the seed, so the
 * arithmetic is exercised exactly as the adapter exercises it.
 *
 * The fixture is imported rather than the figures typed here, because rule P-6 gives the expected
 * results exactly one home.
 */
import { loadSeed } from '../../services/mock/seed-loader';
import { EXPECTED_SOLVER_ROWS, SOLVER_CASE_ID } from '../../../tests/fixtures/solver-expected-results';

/** The seeded solver cases, as the adapter's loader hands them over: the case the table is measured at. */
const SEEDED_SOLVER_CASES = loadSeed().solverCases;

/* ---------------------------------------------------------------------------------------------
 * A. The probe cases
 * ------------------------------------------------------------------------------------------- */

/** The first working day of the probe window: Monday 1 March 2027. */
const WINDOW_START: IsoDate = '2027-03-01';

/** The last working day of the probe window: Friday 5 March 2027. */
const WINDOW_END: IsoDate = '2027-03-05';

/** No set is recovered: the option that answers the disruption with nothing. */
const NO_LEVERS: Levers = { airSets: 0, transferSets: 0 };

/** A transfer of four sets, twice the daily build rate of the probe case. */
const TRANSFER_LEVERS: Levers = { airSets: 0, transferSets: 4 };

/**
 * The probe case: four sets on hand, a line that builds two a day, and five working days to build in.
 *
 * The stock lasts two days, so the run-out falls on the second working day and the line stands idle
 * for the last three. The two orders are listed latest due date first, which is the order that would
 * hide a serving rule that went by array position instead of by due date: the earlier-due order is
 * `CO-PROBE-B` at index one.
 *
 * Its money is chosen so that each euro total is a piece of arithmetic short enough to follow in the
 * assertion that checks it: three euro a set by air freight and one and a quarter by transfer, orders
 * agreed at three euro thirty-three and twenty, and the transferred sets worth seven and a half each
 * for two working days. Its two write-back steps are the plan the case states, so an option that
 * recovers sets has steps to set in motion and the baseline has none.
 */
const PROBE_CASE: SolverCase = {
  id: 'CASE-PROBE-1',
  exceptionId: 'EXC-PROBE-1',
  openingStock: 4,
  finishedGoods: 0,
  ratePerDay: 2,
  delayedPurchaseOrderId: 'PO-PROBE-1',
  airSets: { max: 6, step: 2 },
  transferSets: { max: 8, step: 2 },
  airFreightCostPerSetEur: 3,
  transferCostPerSetEur: 1.25,
  transferProductId: 'PRD-PROBE-SVC',
  transferUnitPriceEur: 7.5,
  transferLeadTimeDays: 2,
  orders: [
    {
      orderId: 'CO-PROBE-A',
      productId: 'PRD-PROBE',
      quantity: 3,
      unitPriceEur: 3.33,
      dueDate: '2027-03-03',
    },
    {
      orderId: 'CO-PROBE-B',
      productId: 'PRD-PROBE',
      quantity: 4,
      unitPriceEur: 20,
      dueDate: '2027-03-02',
    },
  ],
  windowStart: WINDOW_START,
  windowEnd: WINDOW_END,
  writeBacks: [
    {
      sequence: 1,
      system: 'erp',
      recordRef: 'PROBE.REL.0001',
      description: 'Move the probe release to the week the recovered sets arrive.',
      state: 'pending',
    },
    {
      sequence: 2,
      system: 'mes',
      recordRef: 'PROBE.WO.0001',
      description: 'Release the revised probe production order to the line.',
      state: 'pending',
    },
  ],
};

/**
 * The probe case of a run-out part-way through a day: three sets on hand at a build rate of two.
 *
 * The stock covers the first day whole and half of the second, so the run-out fraction is the half
 * the rule reports and the idle days add up to a fraction the rounding then closes.
 */
const PARTIAL_RUN_OUT_CASE: SolverCase = {
  id: 'CASE-PROBE-2',
  exceptionId: 'EXC-PROBE-2',
  openingStock: 3,
  finishedGoods: 0,
  ratePerDay: 2,
  delayedPurchaseOrderId: 'PO-PROBE-2',
  airSets: { max: 6, step: 2 },
  transferSets: { max: 8, step: 2 },
  airFreightCostPerSetEur: 3,
  transferCostPerSetEur: 1.25,
  transferProductId: 'PRD-PROBE-SVC',
  transferUnitPriceEur: 7.5,
  transferLeadTimeDays: 2,
  orders: [
    {
      orderId: 'CO-PROBE-C',
      productId: 'PRD-PROBE',
      quantity: 1,
      unitPriceEur: 20,
      dueDate: '2027-03-05',
    },
  ],
  windowStart: WINDOW_START,
  windowEnd: WINDOW_END,
  writeBacks: [],
};

/**
 * The probe case where every order is already due when the window opens, at two units a day and no
 * stock behind it.
 *
 * `CO-PROBE-X` was due before the window and sits at index one; `CO-PROBE-Y` is due on the window's
 * first day and sits at index zero. The first day's two units can serve only one of them, so which
 * one is served is the whole of the serving rule: the earlier due date takes them, which leaves both
 * orders late. Serving by array position instead would leave `CO-PROBE-Y` whole and on time.
 */
const DUE_BEFORE_WINDOW_CASE: SolverCase = {
  id: 'CASE-PROBE-3',
  exceptionId: 'EXC-PROBE-3',
  openingStock: 2,
  finishedGoods: 0,
  ratePerDay: 2,
  delayedPurchaseOrderId: 'PO-PROBE-3',
  airSets: { max: 6, step: 2 },
  transferSets: { max: 8, step: 2 },
  airFreightCostPerSetEur: 3,
  transferCostPerSetEur: 1.25,
  transferProductId: 'PRD-PROBE-SVC',
  transferUnitPriceEur: 7.5,
  transferLeadTimeDays: 2,
  orders: [
    {
      orderId: 'CO-PROBE-Y',
      productId: 'PRD-PROBE',
      quantity: 2,
      unitPriceEur: 2,
      dueDate: '2027-03-01',
    },
    {
      orderId: 'CO-PROBE-X',
      productId: 'PRD-PROBE',
      quantity: 4,
      unitPriceEur: 4.5,
      dueDate: '2027-02-26',
    },
  ],
  windowStart: WINDOW_START,
  windowEnd: WINDOW_END,
  writeBacks: [],
};

/**
 * A window whose dates are calendar dates but which holds no working day: a Saturday and a Sunday.
 *
 * The calendar reports both as dates — a weekend is a day `nextWorkingDay` moves forward from — so
 * this is the case where the window itself, and nothing else, is what the solver cannot walk.
 */
const WEEKEND_WINDOW_CASE: SolverCase = {
  ...PROBE_CASE,
  id: 'CASE-PROBE-4',
  windowStart: '2027-03-06',
  windowEnd: '2027-03-07',
};

/** A window opening on a date the calendar does not hold: the thirty-second of March. */
const MALFORMED_DATE_CASE: SolverCase = {
  ...PROBE_CASE,
  id: 'CASE-PROBE-5',
  windowStart: '2027-03-32',
};

/** Every measurement the assertions walk, named so a failure says which one broke. */
const MEASURED: ReadonlyArray<
  readonly [label: string, caseRecord: SolverCase, levers: Levers]
> = [
  ['the baseline option', PROBE_CASE, NO_LEVERS],
  ['the transfer option', PROBE_CASE, TRANSFER_LEVERS],
  ['the part-day run-out', PARTIAL_RUN_OUT_CASE, NO_LEVERS],
  ['the orders due before the window', DUE_BEFORE_WINDOW_CASE, NO_LEVERS],
];

/* ---------------------------------------------------------------------------------------------
 * B. Helpers
 * ------------------------------------------------------------------------------------------- */

/**
 * The per-order line the result carries for one order.
 *
 * A result that omits the line for an order it was asked to measure is itself a defect, so an
 * absent line fails the test rather than silently satisfying a comparison against `undefined`.
 *
 * @param result The measurement to read.
 * @param orderId The order whose line is wanted.
 * @returns That order's line.
 */
function orderLineOf(result: SolverResult, orderId: string): OrderResult {
  const line = result.orders.find((order) => order.orderId === orderId);

  if (line === undefined) {
    throw new Error(`The result carries no per-order line for ${orderId}.`);
  }

  return line;
}

/**
 * Every number a result carries, each with the path a failure message can name it by.
 *
 * @param result The measurement to walk.
 * @returns The measure fields, the run-out, the per-order lines and every closing-stock point.
 */
function numericLeavesOf(result: SolverResult): Array<[path: string, value: number]> {
  const leaves: Array<[string, number]> = [
    ['unitsLate', result.unitsLate],
    ['maxDaysLate', result.maxDaysLate],
    ['ordersOnTime', result.ordersOnTime],
    ['ordersTotal', result.ordersTotal],
    ['addedCostEur', result.addedCostEur],
    ['lineIdleDays', result.lineIdleDays],
    ['revenueDelayedEur', result.revenueDelayedEur],
    ['levers.airSets', result.levers.airSets],
    ['levers.transferSets', result.levers.transferSets],
    ['runOut.day', result.runOut.day],
    ['runOut.fractionOfDay', result.runOut.fractionOfDay],
  ];

  result.orders.forEach((order, index) => {
    leaves.push([`orders[${index}].unitsLate`, order.unitsLate]);
    leaves.push([`orders[${index}].daysLate`, order.daysLate]);
  });

  result.dailyClosingStock.forEach((point, index) => {
    leaves.push([`dailyClosingStock[${index}].units`, point.units]);
  });

  result.sideEffects.forEach((effect, index) => {
    leaves.push([`sideEffects[${index}].kitsDelayed`, effect.kitsDelayed]);
    leaves.push([`sideEffects[${index}].valueDeferredEur`, effect.valueDeferredEur]);
    leaves.push([`sideEffects[${index}].daysDeferred`, effect.daysDeferred]);
  });

  return leaves;
}

/**
 * Reports whether a figure carries no fraction of a unit finer than a hundredth.
 *
 * The comparison goes through `halfUp2`, the codebase's only rounding rule: a figure that is already
 * on a hundredth survives it unchanged, and one that carries a finer fraction does not.
 *
 * @param value The figure to test.
 * @returns `true` when the figure sits on a hundredth.
 */
function sitsOnHundredth(value: number): boolean {
  return halfUp2(value) === value;
}

/**
 * The order the case defines, read back by its identifier.
 *
 * Used where a test derives an expectation from the order record itself — its due date or its
 * quantity — so the derivation reads the case rather than restating one of its values.
 *
 * @param caseRecord The case to read.
 * @param orderId The order wanted.
 * @returns That order's input record.
 */
function caseOrderOf(caseRecord: SolverCase, orderId: string): SolverOrderInput {
  const order = caseRecord.orders.find((entry) => entry.orderId === orderId);

  if (order === undefined) {
    throw new Error(`The case carries no order ${orderId}.`);
  }

  return order;
}

/**
 * The first entry of a list that must not be empty.
 *
 * A result missing an entry it is required to carry is a defect, so the absence fails the test with
 * the name of what was expected rather than satisfying a comparison against `undefined`.
 *
 * @param items The list to read.
 * @param what What the list is expected to hold, named in the failure.
 * @returns The first entry.
 */
function firstOf<T>(items: readonly T[], what: string): T {
  const first = items[0];

  if (first === undefined) {
    throw new Error(`The result carries no ${what}.`);
  }

  return first;
}

/**
 * Whether one of the reasons a failed check gives names the given text.
 *
 * The constraint messages are plain prose written for a reader, so a test asserts only that the
 * reason names what breached its bound — the lever, the order or the window — and never a whole
 * sentence, which would freeze the wording rather than the behaviour.
 *
 * @param messages The reasons the result carries.
 * @param text The text the reason must name, matched without regard to case.
 * @returns `true` when one of the reasons names the text.
 */
function mentions(messages: readonly string[], text: string): boolean {
  const wanted = text.toLowerCase();

  return messages.some((message) => message.toLowerCase().includes(wanted));
}

/* ---------------------------------------------------------------------------------------------
 * C. The projection — contracts §4 rules 1 to 5
 * ------------------------------------------------------------------------------------------- */

describe('solveSupplyDelay — the projection', () => {
  it('accepts the probe case, so a failure below is the arithmetic and not the input', () => {
    const result = solveSupplyDelay(PROBE_CASE, NO_LEVERS);

    expect(result.constraintCheck).toBe('pass');
    expect(result.constraintMessages).toEqual([]);
  });

  it('measures the run-out as the first working day the position reaches zero', () => {
    // Four sets on hand at two a day: the second working day is the first that closes at zero.
    const result = solveSupplyDelay(PROBE_CASE, NO_LEVERS);

    expect(result.runOut.day).toBe(PROBE_CASE.openingStock / PROBE_CASE.ratePerDay);
  });

  it('reports the fraction of the run-out day the position covered', () => {
    // Three sets at two a day: the second day opens with one set, which covers half of it.
    const result = solveSupplyDelay(PARTIAL_RUN_OUT_CASE, NO_LEVERS);
    const openingOnRunOutDay = PARTIAL_RUN_OUT_CASE.openingStock % PARTIAL_RUN_OUT_CASE.ratePerDay;

    expect(result.runOut.fractionOfDay).toBe(openingOnRunOutDay / PARTIAL_RUN_OUT_CASE.ratePerDay);
  });

  it('reports no run-out day when the position survives every working day of the window', () => {
    const recovered = solveSupplyDelay(PROBE_CASE, {
      airSets: 0,
      transferSets: PROBE_CASE.transferSets.max,
    });

    expect(recovered.constraintCheck).toBe('pass');
    expect(recovered.runOut.day).toBe(0);
  });

  it('closes the stock series on every working day of the window, in date order', () => {
    const result = solveSupplyDelay(PROBE_CASE, NO_LEVERS);
    const workingDays = workingDaysInRange(PROBE_CASE.windowStart, PROBE_CASE.windowEnd);

    expect(result.dailyClosingStock.map((point) => point.date)).toEqual(workingDays);
  });

  it('never lets the closing stock fall below zero', () => {
    const result = solveSupplyDelay(PROBE_CASE, NO_LEVERS);

    for (const point of result.dailyClosingStock) {
      expect(point.units, `closing stock on ${point.date} is not negative`).toBeGreaterThanOrEqual(0);
    }
  });

  it('holds the series at zero from the run-out day to the end of the window', () => {
    const result = solveSupplyDelay(PROBE_CASE, NO_LEVERS);
    const firstEmptyIndex = result.dailyClosingStock.findIndex((point) => point.units === 0);

    expect(firstEmptyIndex, 'the position does run out inside the window').toBeGreaterThanOrEqual(0);

    for (const point of result.dailyClosingStock.slice(firstEmptyIndex)) {
      expect(point.units, `closing stock on ${point.date} stays at zero`).toBe(0);
    }

    expect(result.runOut.day, 'the run-out is numbered from the first working day').toBe(
      firstEmptyIndex + 1,
    );
  });

  it('lowers the stock by what the line builds on the first day', () => {
    const result = solveSupplyDelay(PROBE_CASE, NO_LEVERS);
    const firstDay = firstOf(result.dailyClosingStock, 'closing-stock point');

    // The stock on hand at the end of a day is what it opened with less what the line built.
    expect(firstDay.units).toBe(PROBE_CASE.openingStock - PROBE_CASE.ratePerDay);
  });

  it('serves orders from the finished goods the case opens with', () => {
    const finishedGoodsCase: SolverCase = {
      ...PROBE_CASE,
      openingStock: 0,
      finishedGoods: firstOf(PROBE_CASE.orders, 'probe order').quantity,
      orders: [firstOf(PROBE_CASE.orders, 'probe order')],
    };
    const result = solveSupplyDelay(finishedGoodsCase, NO_LEVERS);

    expect(result.unitsLate).toBe(0);
    expect(result.ordersOnTime).toBe(1);
  });

  it('adds nothing for the delayed purchase order, which is the disruption being measured', () => {
    const emptyPosition: SolverCase = { ...PROBE_CASE, openingStock: 0, finishedGoods: 0 };
    const ordered = PROBE_CASE.orders.reduce((total, order) => total + order.quantity, 0);
    const result = solveSupplyDelay(emptyPosition, NO_LEVERS);

    expect(result.unitsLate).toBe(ordered);
    expect(result.ordersOnTime).toBe(0);
  });

  it('sums the idle fraction of each working day the line builds short of its rate', () => {
    // Two whole days of building out of five leaves three idle days, and one and a half days of
    // building out of five leaves three and a half.
    for (const caseRecord of [PROBE_CASE, PARTIAL_RUN_OUT_CASE]) {
      const workingDays = workingDaysInRange(caseRecord.windowStart, caseRecord.windowEnd).length;
      const buildingDays = caseRecord.openingStock / caseRecord.ratePerDay;
      const result = solveSupplyDelay(caseRecord, NO_LEVERS);

      expect(result.lineIdleDays, `${caseRecord.id}: idle days`).toBe(
        halfUp2(workingDays - buildingDays),
      );
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * D. The per-order measures — contracts §4 rules 6 to 8
 * ------------------------------------------------------------------------------------------- */

describe('solveSupplyDelay — the per-order measures', () => {
  it('serves the order due first before one due later, whatever position it holds in the case', () => {
    // Two units on the first day and two orders already due: the earlier due date takes them, so
    // both orders stay short. Serving by array position would leave the first-listed order whole.
    const result = solveSupplyDelay(DUE_BEFORE_WINDOW_CASE, NO_LEVERS);

    expect(orderLineOf(result, 'CO-PROBE-X').unitsLate).toBe(
      caseOrderOf(DUE_BEFORE_WINDOW_CASE, 'CO-PROBE-X').quantity - PROBE_CASE.ratePerDay,
    );
    expect(orderLineOf(result, 'CO-PROBE-Y').unitsLate).toBe(
      caseOrderOf(DUE_BEFORE_WINDOW_CASE, 'CO-PROBE-Y').quantity,
    );
  });

  it('serves an order in full once the position can cover it', () => {
    const result = solveSupplyDelay(PROBE_CASE, TRANSFER_LEVERS);

    for (const order of PROBE_CASE.orders) {
      expect(orderLineOf(result, order.orderId).unitsLate, `${order.orderId}: units late`).toBe(0);
    }

    expect(result.ordersOnTime).toBe(result.ordersTotal);
  });

  it('measures an order that never ships to the last working day of the window', () => {
    const result = solveSupplyDelay(DUE_BEFORE_WINDOW_CASE, NO_LEVERS);
    const outstanding = caseOrderOf(DUE_BEFORE_WINDOW_CASE, 'CO-PROBE-X');

    expect(orderLineOf(result, 'CO-PROBE-X').daysLate).toBe(
      workingDaysBetween(outstanding.dueDate, DUE_BEFORE_WINDOW_CASE.windowEnd),
    );
  });

  it('carries one line per order of the case, in the order the case lists them', () => {
    const result = solveSupplyDelay(PROBE_CASE, NO_LEVERS);

    expect(result.orders.map((order) => order.orderId)).toEqual(
      PROBE_CASE.orders.map((order) => order.orderId),
    );
  });

  it('reads units late, orders on time, orders total and maximum days late off those lines', () => {
    for (const [label, caseRecord, levers] of MEASURED) {
      const result = solveSupplyDelay(caseRecord, levers);
      const summedUnitsLate = result.orders.reduce((total, order) => total + order.unitsLate, 0);
      const latestDaysLate = result.orders.reduce(
        (latest, order) => Math.max(latest, order.daysLate),
        0,
      );

      expect(result.unitsLate, `${label}: units late`).toBe(summedUnitsLate);
      expect(result.ordersOnTime, `${label}: orders on time`).toBe(
        result.orders.filter((order) => order.unitsLate === 0).length,
      );
      expect(result.ordersTotal, `${label}: orders total`).toBe(result.orders.length);
      expect(result.maxDaysLate, `${label}: maximum days late`).toBe(latestDaysLate);
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * E. The levers, the money and their side effects — contracts §4 rules 2, 9, 10 and 11
 * ------------------------------------------------------------------------------------------- */

describe('solveSupplyDelay — the levers', () => {
  it('recovers the transferred sets onto the position the projection opens from', () => {
    const withoutLevers = solveSupplyDelay(PROBE_CASE, NO_LEVERS);
    const withTransfer = solveSupplyDelay(PROBE_CASE, TRANSFER_LEVERS);

    // Four recovered sets at two a day move the run-out two working days later and leave the line
    // less idle than the same option without them.
    expect(withTransfer.runOut.day).toBe(
      withoutLevers.runOut.day + TRANSFER_LEVERS.transferSets / PROBE_CASE.ratePerDay,
    );
    expect(withTransfer.lineIdleDays).toBeLessThan(withoutLevers.lineIdleDays);
    expect(withTransfer.unitsLate).toBeLessThan(withoutLevers.unitsLate);
  });

  it('charges each recovered set the rate the case carries for the lever that recovers it', () => {
    const airOnly: Levers = { airSets: PROBE_CASE.airSets.step, transferSets: 0 };
    const bothLevers: Levers = {
      airSets: PROBE_CASE.airSets.step,
      transferSets: TRANSFER_LEVERS.transferSets,
    };

    // Two sets by air at three euro each, four by transfer at one and a quarter, and both together.
    expect(solveSupplyDelay(PROBE_CASE, NO_LEVERS).addedCostEur).toBe(0);
    expect(solveSupplyDelay(PROBE_CASE, airOnly).addedCostEur).toBe(6);
    expect(solveSupplyDelay(PROBE_CASE, TRANSFER_LEVERS).addedCostEur).toBe(5);
    expect(solveSupplyDelay(PROBE_CASE, bothLevers).addedCostEur).toBe(11);
  });

  it('values each late order at the price its own record states', () => {
    // Three units of CO-PROBE-A at three euro thirty-three: the product sits off a hundredth before
    // the rounding closes it, which is the case that proves the total is rounded rather than trusted.
    expect(solveSupplyDelay(PROBE_CASE, NO_LEVERS).revenueDelayedEur).toBe(9.99);
    // Two units of CO-PROBE-X at four and a half, two of CO-PROBE-Y at two.
    expect(solveSupplyDelay(DUE_BEFORE_WINDOW_CASE, NO_LEVERS).revenueDelayedEur).toBe(13);
    // An order that arrives in full holds up nothing, so an option that serves both delays no revenue.
    expect(solveSupplyDelay(PROBE_CASE, TRANSFER_LEVERS).revenueDelayedEur).toBe(0);
  });

  it('echoes the levers the measurement was taken under', () => {
    const result = solveSupplyDelay(PROBE_CASE, TRANSFER_LEVERS);

    expect(result.levers).toEqual(TRANSFER_LEVERS);
  });

  it('reports the sets a transfer defers as a side effect', () => {
    const result = solveSupplyDelay(PROBE_CASE, TRANSFER_LEVERS);
    const effect = firstOf(result.sideEffects, 'side effect for the transfer option');

    expect(effect.kitsDelayed).toBe(TRANSFER_LEVERS.transferSets);
    expect(effect.productId).toBe(PROBE_CASE.transferProductId);
    expect(sitsOnHundredth(effect.valueDeferredEur)).toBe(true);
  });

  it('values the deferral at the transferred product price and reports the days it lasts', () => {
    const result = solveSupplyDelay(PROBE_CASE, TRANSFER_LEVERS);
    const effect = firstOf(result.sideEffects, 'side effect for the transfer option');

    // Four transferred sets at seven and a half each, deferred for the two working days the case states.
    expect(effect.valueDeferredEur).toBe(30);
    expect(effect.daysDeferred).toBe(PROBE_CASE.transferLeadTimeDays);
  });

  it('reports no side effect for the air-freight lever alone', () => {
    const airOnly: Levers = { airSets: PROBE_CASE.airSets.step, transferSets: 0 };
    const result = solveSupplyDelay(PROBE_CASE, airOnly);

    expect(result.constraintCheck).toBe('pass');
    expect(result.sideEffects).toEqual([]);
  });

  it('reports no side effect for an option that recovers nothing', () => {
    const result = solveSupplyDelay(PROBE_CASE, NO_LEVERS);

    expect(result.sideEffects).toEqual([]);
  });

  it('sets the case plan in motion for an option that recovers sets, and none for the baseline', () => {
    const byAir: Levers = { airSets: PROBE_CASE.airSets.step, transferSets: 0 };
    const baseline = solveSupplyDelay(PROBE_CASE, NO_LEVERS);

    expect(baseline.writeBacks).toEqual([]);

    for (const levers of [byAir, TRANSFER_LEVERS]) {
      const acting = solveSupplyDelay(PROBE_CASE, levers);

      expect(acting.writeBacks).toEqual(PROBE_CASE.writeBacks);
    }

    // The steps arrive as fresh objects, so a caller marking one up never reaches the record stating it.
    const step = firstOf(solveSupplyDelay(PROBE_CASE, TRANSFER_LEVERS).writeBacks, 'write-back step');
    const recorded = firstOf(PROBE_CASE.writeBacks, 'write-back step the case states');

    expect(step).toEqual(recorded);
    expect(step).not.toBe(recorded);
  });
});

/* ---------------------------------------------------------------------------------------------
 * F. Shape, determinism and purity — AAP 0.2.1, 0.14.1, 0.18.2
 * ------------------------------------------------------------------------------------------- */

describe('solveSupplyDelay — shape, determinism and purity', () => {
  it('carries the measures the comparison matrix reads, and no scenario identity', () => {
    const result = solveSupplyDelay(PROBE_CASE, NO_LEVERS);
    const measures: readonly string[] = [
      'unitsLate',
      'maxDaysLate',
      'ordersOnTime',
      'ordersTotal',
      'addedCostEur',
      'lineIdleDays',
      'revenueDelayedEur',
      'runOut',
      'dailyClosingStock',
      'orders',
      'constraintCheck',
      'constraintMessages',
      'sideEffects',
      'writeBacks',
      'levers',
      'confidence',
    ];

    expect(Object.keys(result).sort()).toEqual([...measures].sort());

    for (const identity of ['id', 'exceptionId', 'name', 'origin']) {
      expect(identity in result, `the result names no ${identity}`).toBe(false);
    }
  });

  it('carries its own confidence, and the do-nothing baseline sets no write-back in motion', () => {
    const result = solveSupplyDelay(PROBE_CASE, NO_LEVERS);

    expect(result.writeBacks).toEqual([]);
    expect(result.confidence.level.length).toBeGreaterThan(0);
    expect(result.confidence.reason.length).toBeGreaterThan(0);
  });

  it('gives the same answer twice for the same input, in two distinct results', () => {
    const first = solveSupplyDelay(PROBE_CASE, TRANSFER_LEVERS);
    const second = solveSupplyDelay(PROBE_CASE, TRANSFER_LEVERS);

    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });

  it('mutates neither argument', () => {
    const caseBefore = structuredClone(PROBE_CASE);
    const leversBefore = structuredClone(TRANSFER_LEVERS);

    solveSupplyDelay(PROBE_CASE, TRANSFER_LEVERS);

    expect(PROBE_CASE).toEqual(caseBefore);
    expect(TRANSFER_LEVERS).toEqual(leversBefore);
  });

  it('keeps no state between one measurement and the next', () => {
    const baselineFirst = solveSupplyDelay(PROBE_CASE, NO_LEVERS);

    solveSupplyDelay(DUE_BEFORE_WINDOW_CASE, NO_LEVERS);
    solveSupplyDelay(PARTIAL_RUN_OUT_CASE, TRANSFER_LEVERS);

    expect(solveSupplyDelay(PROBE_CASE, NO_LEVERS)).toEqual(baselineFirst);
  });
});

/* ---------------------------------------------------------------------------------------------
 * G. The invariants every measurement keeps — AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

describe('solveSupplyDelay — the invariants', () => {
  it('keeps every number of every measurement finite', () => {
    for (const [label, caseRecord, levers] of MEASURED) {
      for (const [path, value] of numericLeavesOf(solveSupplyDelay(caseRecord, levers))) {
        expect(Number.isFinite(value), `${label}: ${path} is finite`).toBe(true);
      }
    }
  });

  it('keeps the money and the idle days on a hundredth', () => {
    for (const [label, caseRecord, levers] of MEASURED) {
      const result = solveSupplyDelay(caseRecord, levers);

      expect(sitsOnHundredth(result.addedCostEur), `${label}: added cost`).toBe(true);
      expect(sitsOnHundredth(result.revenueDelayedEur), `${label}: revenue delayed`).toBe(true);
      expect(sitsOnHundredth(result.lineIdleDays), `${label}: line idle days`).toBe(true);
    }
  });

  it('keeps every count a whole number and none of them negative', () => {
    for (const [label, caseRecord, levers] of MEASURED) {
      const result = solveSupplyDelay(caseRecord, levers);

      for (const [path, value] of numericLeavesOf(result).filter(([name]) =>
        name.startsWith('orders'),
      )) {
        expect(Number.isInteger(value), `${label}: ${path} is a whole number`).toBe(true);
        expect(value, `${label}: ${path} is not negative`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps the run-out fraction inside the day it names', () => {
    for (const [label, caseRecord, levers] of MEASURED) {
      const { fractionOfDay } = solveSupplyDelay(caseRecord, levers).runOut;

      expect(fractionOfDay, `${label}: run-out fraction`).toBeGreaterThanOrEqual(0);
      expect(fractionOfDay, `${label}: run-out fraction`).toBeLessThanOrEqual(1);
    }
  });

  it('keeps every closing-stock point a non-negative number of units', () => {
    for (const [label, caseRecord, levers] of MEASURED) {
      const result = solveSupplyDelay(caseRecord, levers);

      for (const point of result.dailyClosingStock) {
        expect(Number.isFinite(point.units), `${label}: stock on ${point.date} is finite`).toBe(
          true,
        );
        expect(
          point.units,
          `${label}: stock on ${point.date} is not negative`,
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * H. A case the solver cannot measure — a failure is returned, never thrown (AAP 0.8, 0.12.3)
 * ------------------------------------------------------------------------------------------- */

describe('solveSupplyDelay — a case it cannot measure', () => {
  it('fails the check and names the lever when a lever is below zero', () => {
    const belowZero: Levers = { airSets: -PROBE_CASE.airSets.step, transferSets: 0 };
    const result = solveSupplyDelay(PROBE_CASE, belowZero);

    expect(result.constraintCheck).toBe('fail');
    expect(mentions(result.constraintMessages, 'Air freight sets')).toBe(true);
  });

  it('fails the check against the maximum the case declares', () => {
    const aboveMaximum = PROBE_CASE.airSets.max + PROBE_CASE.airSets.step;
    const result = solveSupplyDelay(PROBE_CASE, { airSets: aboveMaximum, transferSets: 0 });

    expect(result.constraintCheck).toBe('fail');
    expect(mentions(result.constraintMessages, 'Air freight sets')).toBe(true);
    expect(mentions(result.constraintMessages, String(PROBE_CASE.airSets.max))).toBe(true);
  });

  it('fails the check when a lever sits between two steps', () => {
    const betweenSteps = PROBE_CASE.transferSets.step * 2 + 1;
    const result = solveSupplyDelay(PROBE_CASE, { airSets: 0, transferSets: betweenSteps });

    expect(result.constraintCheck).toBe('fail');
    expect(mentions(result.constraintMessages, 'Transfer sets')).toBe(true);
  });

  it('fails the check when the case carries no order to measure', () => {
    const result = solveSupplyDelay({ ...PROBE_CASE, orders: [] }, NO_LEVERS);

    expect(result.constraintCheck).toBe('fail');
    expect(mentions(result.constraintMessages, 'order')).toBe(true);
  });

  it('fails the check when there is no build rate to project with', () => {
    const result = solveSupplyDelay({ ...PROBE_CASE, ratePerDay: 0 }, NO_LEVERS);

    expect(result.constraintCheck).toBe('fail');
    expect(result.constraintMessages.length).toBeGreaterThan(0);
  });

  it('fails the check when the window holds no working day', () => {
    const result = solveSupplyDelay(WEEKEND_WINDOW_CASE, NO_LEVERS);

    expect(result.constraintCheck).toBe('fail');
    expect(mentions(result.constraintMessages, 'window')).toBe(true);
  });

  it('fails the check when a date is not a calendar date', () => {
    const result = solveSupplyDelay(MALFORMED_DATE_CASE, NO_LEVERS);

    expect(result.constraintCheck).toBe('fail');
    expect(mentions(result.constraintMessages, 'window')).toBe(true);
  });

  it('returns the failure rather than throwing it, and measures nothing', () => {
    const brokenOrder = { ...firstOf(PROBE_CASE.orders, 'probe order'), quantity: -1 };
    const failing: ReadonlyArray<
      readonly [label: string, caseRecord: SolverCase, levers: Levers]
    > = [
      ['a lever below zero', PROBE_CASE, { airSets: -PROBE_CASE.airSets.step, transferSets: 0 }],
      ['no order to measure', { ...PROBE_CASE, orders: [] }, NO_LEVERS],
      ['no build rate', { ...PROBE_CASE, ratePerDay: 0 }, NO_LEVERS],
      ['a window of a weekend', WEEKEND_WINDOW_CASE, NO_LEVERS],
      ['a malformed date', MALFORMED_DATE_CASE, NO_LEVERS],
      ['an order without a quantity', { ...PROBE_CASE, orders: [brokenOrder] }, NO_LEVERS],
    ];

    for (const [label, caseRecord, levers] of failing) {
      const measure = (): SolverResult => solveSupplyDelay(caseRecord, levers);

      expect(measure, `${label}: returned rather than thrown`).not.toThrow();

      const result = measure();

      expect(result.constraintCheck, `${label}: constraint check`).toBe('fail');
      expect(result.constraintMessages.length, `${label}: at least one reason`).toBeGreaterThan(0);
      expect(result.unitsLate, `${label}: no units measured`).toBe(0);
      expect(result.ordersTotal, `${label}: no orders measured`).toBe(0);
      expect(result.dailyClosingStock, `${label}: no series drawn`).toEqual([]);

      for (const [path, value] of numericLeavesOf(result)) {
        expect(Number.isFinite(value), `${label}: ${path} is finite`).toBe(true);
      }
    }
  });

  it('names the order whose quantity is not a number of units', () => {
    const brokenOrder = { ...firstOf(PROBE_CASE.orders, 'probe order'), quantity: -1 };
    const result = solveSupplyDelay({ ...PROBE_CASE, orders: [brokenOrder] }, NO_LEVERS);

    expect(result.constraintCheck).toBe('fail');
    expect(mentions(result.constraintMessages, brokenOrder.orderId)).toBe(true);
  });
});

/* ---------------------------------------------------------------------------------------------
 * I. The rounding helpers — contracts §4 rule 5 and §5
 *
 * These figures are the rounding rule's own contract cases, not a seed expected result: a tie of
 * two decimals and a tie of a whole percent are what the rule says the helper does with them, which
 * is why the numbers are written here and nowhere else in this file.
 * ------------------------------------------------------------------------------------------- */

describe('halfUp2', () => {
  it('rounds a two-decimal tie up, away from the lower hundredth', () => {
    expect(halfUp2(2.345)).toBe(2.35);
    expect(halfUp2(1.005)).toBe(1.01);
  });

  it('rounds a figure off a tie to the nearer hundredth', () => {
    expect(halfUp2(2.344)).toBe(2.34);
  });

  it('leaves a figure already on a hundredth unchanged', () => {
    expect(halfUp2(2.35)).toBe(2.35);
    expect(halfUp2(2.4)).toBe(2.4);
    expect(halfUp2(0)).toBe(0);
  });

  it('returns positive zero for a negative zero', () => {
    expect(Object.is(halfUp2(-0), 0)).toBe(true);
  });
});

describe('wholePercent', () => {
  it('rounds a part over its whole up to the nearer whole percent', () => {
    expect(wholePercent(14 / 18)).toBe(78);
    expect(wholePercent(0.7849)).toBe(78);
  });

  it('rounds a percentage tie up', () => {
    expect(wholePercent(0.775)).toBe(78);
  });

  it('converts the whole and the empty part exactly', () => {
    expect(wholePercent(1)).toBe(100);
    expect(wholePercent(0)).toBe(0);
  });
});

/* ---------------------------------------------------------------------------------------------
 * J. The working calendar — contracts §1
 *
 * Monday to Friday with no public holidays, so the Thursday and the Friday of Christmas week are
 * working days. The calendar decides what a working day is for the solver, the aggregates and the
 * urgency ordering alike, which is why it is asserted here rather than in a file of its own.
 * ------------------------------------------------------------------------------------------- */

describe('the working calendar', () => {
  it('treats the Thursday and the Friday of Christmas week as working days', () => {
    expect(isWorkingDay('2026-12-24')).toBe(true);
    expect(isWorkingDay('2026-12-25')).toBe(true);
    expect(isWorkingDay('2026-12-26')).toBe(false);
    expect(isWorkingDay('2026-12-27')).toBe(false);
  });

  it('moves a weekend forward to the next Monday and leaves a working day where it is', () => {
    expect(nextWorkingDay('2026-12-26')).toBe('2026-12-28');
    expect(nextWorkingDay('2026-12-24')).toBe('2026-12-24');
  });

  it('counts the working days of the half-open interval', () => {
    expect(workingDaysBetween('2026-12-24', '2026-12-29')).toBe(3);
    expect(workingDaysBetween('2026-12-24', '2026-12-24')).toBe(0);
  });

  it('lists every working day of the closed interval in ascending order', () => {
    const days = workingDaysInRange('2026-12-03', '2026-12-23');

    expect(days).toHaveLength(15);
    expect(days).toEqual([...days].sort());

    for (const day of days) {
      expect(isWorkingDay(day), `${day} is a working day`).toBe(true);
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * K. The expected results of `CASE-1184` — AAP 0.8, AAP 0.7's success criterion 1, T-25
 *
 * The comparison the plan ranks highest: every row of the seed's expected-results table, held as
 * `tests/fixtures/solver-expected-results.ts`, measured at the seeded case's own inputs. The fixture
 * holds the six measures and states the arithmetic each one comes from; this section holds no
 * expected value of its own (rule P-6) and fails on the first row and measure that differ, so a
 * regression names the row it broke rather than the file it broke in.
 *
 * What it proves, beyond the probe cases: the probe cases assert each rule against inputs chosen to
 * make the arithmetic followable by hand, while this table asserts the seeded case's own outcome —
 * the do-nothing baseline's 1,220 units late worth 2,257,000 (AAP 0.8's assistant answer of 580 and
 * 640 units, and the delayed revenue its quoted recommendation sentence names), the air-freight
 * option's 18,600, the recommended option's 21,300 and its 900 deferred
 * kits, and the two sandbox positions the constraint check refuses.
 * ------------------------------------------------------------------------------------------- */

/**
 * Measures the seeded case under one fixture row's levers.
 *
 * The case is looked up from the record set `loadSeed()` returns, by the fixture's own
 * `SOLVER_CASE_ID`, so the comparison is anchored on the case the table names rather than on whichever
 * case the record set holds first.
 *
 * @param row The fixture row whose levers are set.
 * @returns The measurement of the seeded case under those levers.
 * @throws Error When the record set carries no case with that identifier, because a comparison with
 *   nothing to measure against must fail loudly instead of passing on an empty table.
 */
function measureSeededRow(row: (typeof EXPECTED_SOLVER_ROWS)[number]): SolverResult {
  const caseRecord = SEEDED_SOLVER_CASES.find((entry) => entry.id === SOLVER_CASE_ID);

  if (caseRecord === undefined) {
    throw new Error(
      `The seed carries no solver case ${SOLVER_CASE_ID}, so the seeded case's expected results cannot be compared.`,
    );
  }

  return solveSupplyDelay(caseRecord, row.levers);
}

describe('T-25 the expected results of the seeded case', () => {
  it('T-25 holds four named scenarios and the two sandbox checks, each with its own identifier', () => {
    expect(EXPECTED_SOLVER_ROWS).toHaveLength(6);
    expect(EXPECTED_SOLVER_ROWS.filter((row) => row.id.startsWith('SB-'))).toHaveLength(2);
    expect(new Set(EXPECTED_SOLVER_ROWS.map((row) => row.id)).size).toBe(EXPECTED_SOLVER_ROWS.length);
  });

  for (const row of EXPECTED_SOLVER_ROWS) {
    it(`T-25 reproduces ${row.id}: ${row.label}`, () => {
      const measured = measureSeededRow(row);

      expect(measured.constraintCheck, `${row.id}'s constraint check`).toBe(row.constraintCheck);
      expect(measured.unitsLate, `${row.id}'s units late`).toBe(row.unitsLate);
      expect(measured.maxDaysLate, `${row.id}'s maximum days late`).toBe(row.maxDaysLate);
      expect(measured.ordersOnTime, `${row.id}'s orders on time`).toBe(row.ordersOnTime);
      expect(measured.addedCostEur, `${row.id}'s added cost`).toBe(row.addedCostEur);
      expect(measured.lineIdleDays, `${row.id}'s line idle days`).toBe(row.lineIdleDays);
      expect(measured.revenueDelayedEur, `${row.id}'s revenue delayed`).toBe(row.revenueDelayedEur);
    });
  }

  /*
   * The independence case the table's own derivation needs. Every case above compares the solver with
   * a table derived from the same rules, so a misreading both sides share would pass them all. This
   * one recomputes the do-nothing row from the seeded records' own members by a route the solver does
   * not take — a sum over the orders rather than a day-by-day walk — and pins the figures AAP 0.8
   * quotes from outside these modules, which is what makes a disagreement a defect rather than a
   * number to adjust: the 580 and 640 units late, the 1,220 their sum makes, the 2,257,000 of
   * delayed revenue the recommendation's sentence names, and the 21,300 spend of the plan it
   * recommends. A price, a quantity or a rate changed in the seed without its expectation moving
   * fails here even where the solver and the table still agree with each other.
   */
  it('T-25 recomputes the do-nothing row from the seeded orders, against the figures the plan quotes', () => {
    const caseRecord = SEEDED_SOLVER_CASES.find((entry) => entry.id === SOLVER_CASE_ID);

    if (caseRecord === undefined) {
      throw new Error(`The seed carries no solver case ${SOLVER_CASE_ID}.`);
    }

    const baseline = EXPECTED_SOLVER_ROWS.find((row) => row.id === 'SCN-1184-A');
    const plan = EXPECTED_SOLVER_ROWS.find((row) => row.id === 'SCN-1184-C');

    if (baseline === undefined || plan === undefined) {
      throw new Error('The table no longer holds the do-nothing row and the recommended row.');
    }

    // The two orders the records state, at the quantities AAP 0.8 quotes for them.
    expect(caseRecord.orders.map((order) => order.quantity)).toEqual([580, 640]);

    // Nothing is on hand and the do-nothing row recovers nothing, so every ordered unit is late and
    // each is worth its own order's price. Summing the orders is the arithmetic the row states.
    expect(caseRecord.openingStock + caseRecord.finishedGoods).toBe(0);
    expect(baseline.levers).toEqual({ airSets: 0, transferSets: 0 });

    const orderedUnits = caseRecord.orders.reduce((sum, order) => sum + order.quantity, 0);
    const orderedValue = caseRecord.orders.reduce(
      (sum, order) => sum + order.quantity * order.unitPriceEur,
      0,
    );

    expect(orderedUnits).toBe(1220);
    expect(orderedValue).toBe(2257000);
    expect(baseline.unitsLate).toBe(orderedUnits);
    expect(baseline.revenueDelayedEur).toBe(orderedValue);

    // The recommended row's spend, at the case's own per-set rates and the row's own levers.
    const spend =
      plan.levers.airSets * caseRecord.airFreightCostPerSetEur +
      plan.levers.transferSets * caseRecord.transferCostPerSetEur;

    expect(spend).toBe(21300);
    expect(plan.addedCostEur).toBe(spend);
  });
});
