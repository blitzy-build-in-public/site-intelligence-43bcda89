/**
 * The expected results of `CASE-1184` — the seed's own expected-results table, held as a fixture and
 * as nothing else.
 *
 * Fixing inputs:
 * - AAP 0.8, "The expected results are fixtures, nothing more": the expected-results table of
 *   `platform-seed-data.md` §4 is held as this module and as `./aggregates-expected.ts`, "never stored
 *   as records, never displayed, never imported from `src/`, and never used to seed a screen", and the
 *   suite that compares computed output against it row by row is
 *   `src/domain/solver/solve-supply-delay.test.ts`.
 * - AAP 0.7's success criterion 1 and T-25 fix what that comparison covers: every row of the table,
 *   "the four named scenarios and the two sandbox checks", with zero mismatched rows.
 * - `platform-contracts.md` §4 fixes the eleven ordered rules and their order, and §4 rule 5 and §5
 *   fix the two rounding rules, so every figure below is one of their outcomes.
 * - The case's own inputs are the seed record's: `src/seed/solver-cases.ts` carries the opening
 *   position, the build rate, the lever bounds and their rates, the two orders with their prices and
 *   promise dates, and the projection window.
 *
 * THE DERIVATION — why every figure below is stated with its arithmetic rather than transcribed.
 * AAP 0.8 fixes this file to hold the expected-results table of `platform-seed-data.md` §4, and
 * that document is a rank-5 input of this run (AAP 0.1). It is absent from the run: the working
 * tree and its whole history carry no such file, the plan directory mounted for the run carries
 * only the plan, the pre-staged asset set carries only the bundled fonts, boundary file and
 * manifest, and no environment-file drop supplied one. Every figure below is therefore derived
 * from the seeded case by the contracts' rules rather than transcribed from it — the route AAP
 * 0.1 allows where a value cannot be traced to that document, and the derivation is reported
 * here rather than hidden.
 *
 * THE CHAIN OF CUSTODY. The record this file is measured at, `src/seed/solver-cases.ts`, is itself a
 * derivation for the same absent document and says so in its own header, so the chain carries two
 * derived links: that seeded case, and these rows. Its inputs plus the `platform-contracts.md` rules —
 * §4 rules 1 to 11 in order, and §4 rule 5's half-up rounding for line idle days — produce every value
 * below, and each row's block states the arithmetic that produces it, so a reader can follow a figure
 * to the record's own fields and the rule without running anything; a disagreement between this table
 * and the module is then a defect to report rather than a number to adjust, because a fixture written
 * to match what the solver returns would prove nothing. What pins the record rather than the
 * implementation are the figures the AAP quotes from that same table, both reproduced below: the
 * do-nothing baseline's 580 and 640 units late for `CO-770233` and `CO-770251`, 1,220 in total, and the
 * recommended option's EUR 21,300 spend of 600 × 31 by air plus 900 × 3 by transfer. The case record
 * itself is pinned the same way, by that option's side effect — 900 kits worth EUR 108,000 deferred by
 * 10 days — which is what fixes its two lever rates, the transferred product's price and its lead time.
 *
 * THE REVERSAL. When `platform-seed-data.md` is supplied, its §4 figures are transcribed over the
 * values below and these arithmetic notes become commentary on them; the reversal changes no export,
 * type, value, import or consumer of this module.
 *
 * The case this table is measured at, as `src/seed/solver-cases.ts` states it: opening stock 0 and
 * finished goods 0 (the delayed purchase order is the whole supply behind the two orders), a build
 * rate of 300 units per working day, and a window of 3 to 23 December 2026 whose fifteen working days
 * are 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22 and 23 December — Monday to Friday with no
 * public holidays (contracts §1). The orders are `CO-770233`, 580 units promised 9 December at 1,240
 * each, and `CO-770251`, 640 units promised 16 December at 1,240 each. Air freight costs 31 per set
 * recovered and a transfer costs 3 per set (AAP 0.8's EUR 21,300 sentence is the pair that reproduces
 * the spend: 600 × 31 + 900 × 3 = 21,300).
 *
 * Rules this module is built to satisfy:
 * - P-6: an expected figure has exactly one home and this is it. Nothing under `src/` imports this
 *   module and no screen or component reads it; the suite beside the solver is its only consumer.
 * - P-2: it imports one type from `src/types` and no seed record at all, so the expectation it holds
 *   cannot become a second data boundary. The suite that pairs it with the seeded case states that
 *   import's reason where it makes it.
 * - P-7: the row keys that come from the records — `CASE-1184`, the `SCN-1184-A` to `SCN-1184-D`
 *   scenarios and the two `CO-` orders — are the records' own; the sandbox rows' `SB-1184-n`
 *   designations and the row labels are authored here, as the derivation above states, which only
 *   the absent §4 would name; and no company, person, vendor or product of the real world is named.
 * - B-1, B-2: no address, no request, no credential-shaped member and no configuration read.
 */

import type { Levers } from '../../src/types';

/**
 * The case every row below is measured at.
 *
 * `CASE-1184` is the demonstration's one named solver case, the supply delay of `EXC-2026-1184` at
 * the Brno plant (AAP 0.8, AAP 0.12.2), and the suite passes the seeded record carrying this
 * identifier to `solveSupplyDelay` with each row's levers.
 */
export const SOLVER_CASE_ID = 'CASE-1184';

/**
 * One row of the expected-results table: the levers an option sets and the six measures the AAP fixes
 * for it.
 *
 * The six measures are the ones AAP 0.8 names for the row-by-row comparison — units late, maximum days
 * late, orders on time, added cost, line idle days and revenue delayed — and `constraintCheck` is
 * compared with them because the table also fixes which options can be measured at all: a row whose
 * levers breach the case's bounds is an option the comparison matrix shows as "Cannot compute", not a
 * row of numbers (AAP 0.8, AAP 0.12.2).
 */
export interface ExpectedSolverRow {
  /**
   * The row's identifier: `SCN-1184-A` to `SCN-1184-D` for the named scenarios and `SB-1184-n` for the
   * sandbox checks, a designation this file makes itself, the absent §4 being what would name them.
   */
  readonly id: string;

  /** What the row measures, in the words the comparison matrix reads. */
  readonly label: string;

  /** The sets the option recovers by air freight and by transfer: contracts §4's two levers. */
  readonly levers: Levers;

  /** Rule 8: the units the option leaves late, summed over the case's orders. */
  readonly unitsLate: number;

  /** Rule 8: the greatest working-day delay across those orders. */
  readonly maxDaysLate: number;

  /** Rule 8: the orders served in full by their promise date. */
  readonly ordersOnTime: number;

  /** Rule 9: what the recovered sets cost at the case's own lever rates, in euro to two decimals. */
  readonly addedCostEur: number;

  /** Rule 5: line idle days, summed as `(rate − output) / rate` and rounded half up to two decimals. */
  readonly lineIdleDays: number;

  /** Rule 10: the units left late valued at their own order's price, in euro to two decimals. */
  readonly revenueDelayedEur: number;

  /** Rule 2 and the lever bounds: whether the option can be measured, or breaches the case's bounds. */
  readonly constraintCheck: 'pass' | 'fail';
}

/**
 * The table, in the order the comparison matrix reads it: the four named scenarios of the seeded
 * option set, then the two sandbox checks the specification's prose names.
 *
 * The four named rows are the seeded positions of `EXC-2026-1184`'s option set; the two sandbox rows
 * are the faulted positions a lever can be set to — one below the floor of zero the solver enforces by
 * rule, and one above the transfer lever's maximum of 900 and between its steps of 100 — which is what
 * makes the sandbox's refusal a comparison row of its own rather than an untested branch.
 */
export const EXPECTED_SOLVER_ROWS: readonly ExpectedSolverRow[] = [
  /*
   * SCN-1184-A, the do-nothing baseline: {airSets: 0, transferSets: 0}.
   *
   * Nothing on hand and no set recovered, so the line builds nothing on any of the fifteen working days
   * and each of them is idle in full: 15 × (300 − 0) / 300 = 15 idle days. Neither order ships, so
   * 580 + 640 = 1,220 units are late and neither order is on time; the later of the two delays is
   * `CO-770233`'s 10 working days from 9 December to the window's last working day on 23 December
   * ([9..23) holds 9, 10, 11, 14, 15, 16, 17, 18, 21 and 22 December), against `CO-770251`'s 5 from 16
   * December (16, 17, 18, 21 and 22). No set is recovered, so nothing is added to cost, and the 1,220
   * late units at 1,240 each delay 1,512,800 of revenue.
   */
  {
    id: 'SCN-1184-A',
    label: 'Do nothing: neither lever pulled',
    levers: { airSets: 0, transferSets: 0 },
    unitsLate: 1220,
    maxDaysLate: 10,
    ordersOnTime: 0,
    addedCostEur: 0,
    lineIdleDays: 15,
    revenueDelayedEur: 1512800,
    constraintCheck: 'pass',
  },

  /*
   * SCN-1184-B, air freight alone: {airSets: 600, transferSets: 0}.
   *
   * 600 sets on hand when the window opens, so the line builds its full 300 on 3 December and its
   * remaining 300 on 4 December — two days at rate, and the thirteen working days from 7 December that
   * follow build nothing: 13 idle days. The 600 finished units serve `CO-770233` in full on its own
   * promise date of 9 December (580 of the 600, leaving 20), so that order is on time and `CO-770251`
   * takes the remaining 20 on 16 December against a promise of 640: 620 units late, 5 working days late
   * measured from 16 December to the window's last working day ([16..23) holds 16, 17, 18, 21 and 22
   * December). Cost is the 600 air sets at 31 = 18,600, and the 620 late units at 1,240 delay 768,800.
   */
  {
    id: 'SCN-1184-B',
    label: '600 sets by air freight alone',
    levers: { airSets: 600, transferSets: 0 },
    unitsLate: 620,
    maxDaysLate: 5,
    ordersOnTime: 1,
    addedCostEur: 18600,
    lineIdleDays: 13,
    revenueDelayedEur: 768800,
    constraintCheck: 'pass',
  },

  /*
   * SCN-1184-C, the recommended option: {airSets: 600, transferSets: 900}.
   *
   * 1,500 sets on hand, so the line builds its full 300 on each of 3, 4, 7, 8 and 9 December — five days
   * at rate, 1,500 built — and nothing on the ten working days that follow: 10 idle days. `CO-770233` is
   * served in full on 9 December out of those 1,500, leaving 920, and `CO-770251` is served in full on
   * 16 December from that residue (920 − 640 = 280 left), so neither order is late and none of the
   * delays or the delayed revenue exists. Cost is the two levers at their own rates: 600 × 31 = 18,600
   * by air plus 900 × 3 = 2,700 by transfer, 21,300 — the spend AAP 0.8's recommendation sentence
   * quotes.
   */
  {
    id: 'SCN-1184-C',
    label: '600 sets by air freight and 900 by transfer',
    levers: { airSets: 600, transferSets: 900 },
    unitsLate: 0,
    maxDaysLate: 0,
    ordersOnTime: 2,
    addedCostEur: 21300,
    lineIdleDays: 10,
    revenueDelayedEur: 0,
    constraintCheck: 'pass',
  },

  /*
   * SCN-1184-D, the seeded option set's fourth position: {airSets: 700, transferSets: 900}.
   *
   * The air lever is set to 700 against a maximum of 600, so the option cannot be measured: 700 sits on
   * the lever's 50 step, which makes the maximum the only breach the check reports. The row therefore
   * carries the neutral zeros the solver returns for an option that fails its constraint check — no
   * count, no euro figure and no idle day — because AAP 0.8 shows such an option as "Cannot compute"
   * with its reason and emits no measure for it.
   */
  {
    id: 'SCN-1184-D',
    label: 'Air freight above the case maximum of 600',
    levers: { airSets: 700, transferSets: 900 },
    unitsLate: 0,
    maxDaysLate: 0,
    ordersOnTime: 0,
    addedCostEur: 0,
    lineIdleDays: 0,
    revenueDelayedEur: 0,
    constraintCheck: 'fail',
  },

  /*
   * SB-1184-1, a sandbox position below the floor: {airSets: -50, transferSets: 0}.
   *
   * The solver enforces zero as the lower bound of both levers, so a negative air lever is refused
   * before any day is walked, and the row carries the same neutral zeros as the row above.
   */
  {
    id: 'SB-1184-1',
    label: 'Air lever below zero',
    levers: { airSets: -50, transferSets: 0 },
    unitsLate: 0,
    maxDaysLate: 0,
    ordersOnTime: 0,
    addedCostEur: 0,
    lineIdleDays: 0,
    revenueDelayedEur: 0,
    constraintCheck: 'fail',
  },

  /*
   * SB-1184-2, a sandbox position above the ceiling and between the steps: {airSets: 0,
   * transferSets: 950}.
   *
   * The transfer lever's maximum is 900 and its step is 100, and 950 breaches both — it is 50 above the
   * maximum and 50 past the ninth step — so the check reports two breaches and the option is refused
   * with the same neutral zeros.
   */
  {
    id: 'SB-1184-2',
    label: 'Transfer lever above its maximum and between its steps',
    levers: { airSets: 0, transferSets: 950 },
    unitsLate: 0,
    maxDaysLate: 0,
    ordersOnTime: 0,
    addedCostEur: 0,
    lineIdleDays: 0,
    revenueDelayedEur: 0,
    constraintCheck: 'fail',
  },
];
