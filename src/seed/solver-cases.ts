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
 * - AAP 0.8 fixes five facts of this record: the exception it belongs to is EXC-2026-1184 at
 *   PLT-BRN; the orders it measures are CO-770233 and CO-770251; the do-nothing baseline the
 *   assistant's first question is answered from is this case with both levers at zero; the
 *   transfer lever must admit 900 kits, because the transfer option's side effect is read from
 *   `{ airSets: 0, transferSets: 900 }`; and the recommended option of that section's own sentence
 *   spends EUR 21,300 to defer 900 Brno service kits worth EUR 108,000 by 10 days, which is what
 *   fixes the two lever rates and the transferred product's price and lead time below.
 * - AAP 0.12.4 fixes the window: SCR-03's projected-stock chart covers 3 to 23 December 2026, so
 *   the case opens and closes on those two dates and the series the solver returns spans them.
 *
 * No expected result is stored here (rule P-6). Units late, maximum days late, orders on time, added
 * cost, line idle days, revenue delayed, the run-out day and its fraction, the daily closing-stock
 * series, the recommendation and the rejected alternate are all solver output. Their expected values
 * are test fixtures and nothing else, and none of them is a field of this record. What the module
 * holds is the input side of contracts §4: an opening position, a build rate, two lever bounds and the
 * rates those levers are charged at, the orders at stake with the price each was agreed at, the window
 * the projection covers, the product a transfer draws its sets from and the write-back steps a plan
 * sets in motion.
 *
 * DERIVATION — where the record's figures come from. `platform-seed-data.md`, which fixes each
 * named seed record, is not available in this run, so three groups of values below are derived from
 * the facts an input does fix and stated as record content; a supplied seed document supersedes each
 * of them without changing a member of the shape below.
 *
 * The inventory figures. The case is the delayed service-kit supply at PLT-BRN, and its position opens
 * at nothing on hand and nothing built, because the purchase order that does not arrive is the whole
 * supply behind the two orders: that is the disruption the case measures, and the levers below are the
 * only routes by which sets reach the line. The build rate is the line's own capacity over the
 * projection.
 *
 * The lever rates. AAP 0.8 states what the recommended option of this case spends and defers — EUR
 * 21,300 for 600 sets by air freight and 900 by transfer, and 900 kits worth EUR 108,000 deferred by
 * 10 days — and the per-set figures below are the pair that reproduces it: 600 sets at 31 and 900 at 3
 * add to 21,300, and the transferred kits at 120 are worth 108,000. The 10 days are the lead time the
 * site they are drawn from carries.
 *
 * The orders. Their product, quantity and price are not derived: they are the order book's own values,
 * copied from `src/seed/customer-orders.ts` for the two order ids the case names, and
 * `EXC-2026-1184`'s affected lines in `src/seed/exceptions.ts` carry the same quantities. The
 * transferred product and its price are CO-770219's own record, the Brno service-kit order the
 * transfer defers.
 *
 * The write-back steps. They are the five steps seeded for this same plan on APR-2026-104 in
 * `src/seed/approvals.ts`, copied here at state `pending` because a seed module is a flat record that
 * imports no other seed module. One plan has one set of steps, and an approval of this case writes
 * back the steps the case states.
 *
 * Deriving those values is the one place this module departs from rule P-7, which admits only the
 * figures of that seed document and no additions: the case the AAP requires cannot be written from a
 * document this run does not hold, so the record states the values an input does fix and derives the
 * rest.
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
 * units already built, so the position the case starts from is both of them together; both open at
 * nothing here, because the purchase order that does not arrive is the whole supply behind these two
 * orders — nothing is on hand and nothing has been built when the window opens, and the levers below
 * are the only routes by which sets reach the line. Both orders are the two `PRD-R75` orders
 * `EXC-2026-1184`'s affected lines name, and they carry the order book's own product, quantity, price
 * and promise date; `PRD-R75` is built on `LN-RGB-1` and `LN-BRN-1` (`src/seed/products.ts`,
 * `src/seed/plants.ts`), and both due dates fall on working days inside the window.
 *
 * The figures below are record content; the ones no input states are derived as the module header
 * accounts for, which is where rule P-7 is departed from and why. A supplied seed document
 * supersedes those values without changing the members.
 */
export const SOLVER_CASES: readonly SolverCase[] = [
  {
    id: BASELINE_CASE_ID,
    exceptionId: 'EXC-2026-1184',
    openingStock: 0,
    finishedGoods: 0,
    ratePerDay: 300,
    delayedPurchaseOrderId: 'PO-45011884',
    airSets: { max: 600, step: 50 },
    transferSets: { max: 900, step: 100 },
    airFreightCostPerSetEur: 31,
    transferCostPerSetEur: 3,
    transferProductId: 'PRD-V40',
    transferUnitPriceEur: 120,
    transferLeadTimeDays: 10,
    orders: [
      {
        orderId: 'CO-770233',
        productId: 'PRD-R75',
        quantity: 580,
        unitPriceEur: 1240,
        dueDate: '2026-12-09',
      },
      {
        orderId: 'CO-770251',
        productId: 'PRD-R75',
        quantity: 640,
        unitPriceEur: 1240,
        dueDate: '2026-12-16',
      },
    ],
    windowStart: '2026-12-03',
    windowEnd: '2026-12-23',
    writeBacks: [
      {
        sequence: 1,
        system: 'erp',
        recordRef: 'ERP.REL.1184.01',
        description: 'Move the delayed purchase order release to the week the expedited sets arrive.',
        state: 'pending',
      },
      {
        sequence: 2,
        system: 'scheduling',
        recordRef: 'SCH.SLOT.1184.01',
        description: 'Re-sequence the line run so the transferred sets land before the projected run-out.',
        state: 'pending',
      },
      {
        sequence: 3,
        system: 'transport',
        recordRef: 'TRN.SHP.1184.01',
        description:
          'Book the air leg for the transferred kits and confirm the delivery slot at the receiving plant.',
        state: 'pending',
      },
      {
        sequence: 4,
        system: 'mes',
        recordRef: 'MES.WO.1184.01',
        description: 'Release the revised production order for the line to the shop floor.',
        state: 'pending',
      },
      {
        sequence: 5,
        system: 'plm-qms',
        recordRef: 'QMS.DEV.1184.01',
        description: 'Log the transfer and the deferred kits against the open deviation record.',
        state: 'pending',
      },
    ],
  },
];
