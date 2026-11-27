/**
 * The one named solver case of this run: the supply position every response option of
 * EXC-2026-1184 is measured against.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §4 makes the case the solver's only input besides the levers, and its
 *   rules 1 to 11 fix what the case's parts mean: the opening position and the delayed purchase
 *   order produce the run-out, the two lever bounds decide which options exist, the orders and their
 *   due dates produce the per-order and on-time measures, and the two window bounds bound the daily
 *   closing-stock series.
 * - AAP 0.12.2 fixes the shape, as `SolverCase` in `src/types/solver.ts`, and its invariant:
 *   "Exactly one named case in this run (CASE-1184); a `Scenario` is only produced from a case".
 * - AAP 0.8 fixes four facts of this record: the exception it belongs to is EXC-2026-1184 at
 *   PLT-BRN; the orders it measures are CO-770233 and CO-770251; the do-nothing baseline the
 *   assistant's first question is answered from is this case with both levers at zero; and the
 *   transfer lever must admit 900 kits, because the transfer option's side effect is read from
 *   `{ airSets: 0, transferSets: 900 }`.
 * - AAP 0.12.4 fixes the window: SCR-03's projected-stock chart covers 3 to 23 December 2026, so
 *   the case opens and closes on those two dates and the series the solver returns spans them.
 *
 * No expected result is stored here (rule P-6). Units late, maximum days late, orders on time, added
 * cost, line idle days, revenue delayed, the run-out day and its fraction, the daily closing-stock
 * series, the recommendation and the rejected alternate are all solver output. Their expected values
 * are test fixtures and nothing else, and none of them is a field of this record. What the module
 * holds is the input side of contracts §4: an opening position, a build rate, two lever bounds, the
 * orders at stake and the window the projection covers.
 *
 * DERIVATION — where the record's figures come from. `platform-seed-data.md`, which fixes each
 * named seed record, is not available in this run, so the inventory figures below are derived from
 * the facts an input does fix and stated as record content: the case is the delayed service-kit
 * supply at PLT-BRN, and the record holds an opening stock position, a build rate for the
 * projection and two orders whose due dates fall inside the window. The two orders' product,
 * quantity and due date are not derived: they are the order book's own values, copied from
 * `src/seed/customer-orders.ts` for the two order ids the case names, and `EXC-2026-1184`'s
 * affected lines in `src/seed/exceptions.ts` carry the same figures. The transfer bound is the 900
 * kits AAP 0.8 names. Deriving those inventory figures is the one place this module departs from
 * rule P-7, which admits only the figures of that seed document and no additions: the case the AAP
 * requires cannot be written from a document this run does not hold, so the record states the
 * values an input does fix and derives the rest, and a supplied seed document supersedes them
 * without changing a member of the shape below.
 *
 * The bounds as the type states them. `LeverConstraint` carries a maximum and a step and no minimum,
 * because the solver rejects a lever set below zero by rule (AAP 0.12.2), so zero is the floor both
 * levers are read against. Working days are Monday to Friday with no public holidays (contracts §1),
 * which is why the window ends on 23 December as the chart's range asks rather than at a calendar
 * boundary: the 24th and the 25th are working days too.
 *
 * Rules this module is built to satisfy:
 * - P-6: inputs only. Not one measure, run-out, series point, recommendation or rejected alternate
 *   appears below, so every figure the comparison screen shows has to be computed from this case.
 * - P-7: the identifiers are the synthetic records' own — `CASE-`, `EXC-`, `PO-`, `CO-`, `PRD-` —
 *   and no company, person, place or product of the real world is named.
 * - B-1, B-2: no address, no credential, no configuration and no environment read.
 * - P-2: it imports `../types` and nothing else, and only `src/services/mock/seed-loader.ts` may
 *   import this folder, so the case reaches a screen through the service and never beside it.
 */

import type { SolverCase } from '../types';

/**
 * The case the baseline is resolved against.
 *
 * The adapter resolves the default exception's case from this reference instead of a case identifier
 * typed into a screen (AAP 0.8), and the record below is the case it names, so the canvas, the
 * investigation screen and the assistant all measure options against one case.
 */
export const BASELINE_CASE_ID = 'CASE-1184';

/**
 * The solver case of EXC-2026-1184: one record, the one case this run ships.
 *
 * A scenario is only ever produced from a case, so this is the whole input side of the comparison
 * screen's figures. `openingStock` is the sets on hand when the window opens and `finishedGoods` the
 * units already built, so the position the case starts from is both of them together; nothing
 * replaces the purchase order that does not arrive, which is what the levers below exist to answer.
 * Both orders are the two `PRD-R75` orders `EXC-2026-1184`'s affected lines name, and they carry the
 * order book's own product, quantity and promise date; `PRD-R75` is built on `LN-RGB-1` and
 * `LN-BRN-1` (`src/seed/products.ts`, `src/seed/plants.ts`), and both due dates fall on working days
 * inside the window.
 *
 * The figures below are record content; the ones no input states are derived as the module header
 * accounts for, which is where rule P-7 is departed from and why. A supplied seed document
 * supersedes those values without changing the members.
 */
export const SOLVER_CASES: readonly SolverCase[] = [
  {
    id: BASELINE_CASE_ID,
    exceptionId: 'EXC-2026-1184',
    openingStock: 940,
    finishedGoods: 180,
    ratePerDay: 300,
    delayedPurchaseOrderId: 'PO-45011884',
    airSets: { max: 600, step: 50 },
    transferSets: { max: 900, step: 100 },
    orders: [
      {
        orderId: 'CO-770233',
        productId: 'PRD-R75',
        quantity: 580,
        dueDate: '2026-12-09',
      },
      {
        orderId: 'CO-770251',
        productId: 'PRD-R75',
        quantity: 640,
        dueDate: '2026-12-16',
      },
    ],
    windowStart: '2026-12-03',
    windowEnd: '2026-12-23',
  },
];
