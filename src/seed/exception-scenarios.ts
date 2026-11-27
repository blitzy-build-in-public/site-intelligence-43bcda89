/**
 * Seeded response options: the option sets three exceptions ship, and the option positions of the one
 * case this run measures at call time.
 *
 * Holds one `ScenarioSet` for each of `EXC-2026-1185`, `EXC-2026-1187` and `EXC-2026-1195`, which
 * is what lets their comparison matrices render without a solver case, and `SOLVER_OPTION_SETS`, the
 * four lever positions `EXC-2026-1184`'s option set is built from. The split is the one AAP 0.10
 * draws: a seeded set's measures are shipped content and carry `origin: 'seeded'`, while that case's
 * options are measured at call time by `solveSupplyDelay`, so what these records state for them is the
 * position each option stands at and the name its column is labelled with — never a measure and never
 * the delayed revenue a position avoids, which would present a computed result as shipped content and
 * leave two answers to one question (AAP 0.8, AAP 0.10).
 *
 * These are seed records, not solver output (AAP 0.10). Every option carries `origin: 'seeded'`,
 * the provenance member `Scenario` declares for exactly this case: the comparison matrix reads it
 * to label that option's column with the simulated-data label of the fixed set, so a reader can
 * tell a figure shipped with the dataset from one computed in this session. The label text itself
 * lives in the `SimLabel` union and is attached by the interface, never restated here.
 *
 * DERIVATION - the seed document is not on disk. `platform-seed-data.md` is not part of this
 * repository, so the records below are authored from what the inputs do fix: the three exception
 * identifiers, the `SCN-nnnn-x` identifier pattern with each scenario sharing its exception's
 * number, one set per exception in which the recommendation resolves inside the set and a set-aside
 * option names the constraint that blocked it, and the arithmetic the comparison screen and the
 * recommendation rule rely on (AAP 0.8, AAP 0.10, AAP 0.12.2). Each option measures the exception's
 * own affected line - the single order its `affectedLines` names - taking that order's product,
 * plant and promise date from the order book in `src/seed/customer-orders.ts`, so the record set
 * carries no order identifier the order book does not declare. A seeded option values the units it
 * leaves late at one per-unit figure for the product it measures, so a late unit of `PRD-A200` is
 * worth EUR 2,000 in every set that measures it and one order's lateness carries one value wherever
 * it appears. Every other measure is consistent with the option's own orders, levers and stock
 * series, no figure the plan quotes as a solver expected result for `CASE-1184` appears anywhere in
 * the file, and no option is described as computed. If the seed document is supplied later, its
 * records transcribe over this set and supersede it; no consumer changes, because the mock adapter
 * reads every set from here.
 *
 * DERIVATION - the measured case's option positions. `CASE-1184`'s options are solver output, so what
 * is seeded for them is only the record side: the four lever positions and the words each column is
 * labelled with. The positions are the ones the records and the AAP fix - the do-nothing baseline AAP
 * 0.8 measures by name, the air-freight position at the air lever's maximum, the position the seeded
 * plan APR-2026-104 names and whose cost AAP 0.8 states, and one position beyond that maximum so the
 * set holds the option the constraint check rejects - and each name is plain words about the position,
 * because rule P-7 admits no company, product or person this file could name. Not one measure of that
 * case appears below: units late, maximum days late, added cost, line idle days, revenue delayed, the
 * trade-off's figures and the write-backs are all `solveSupplyDelay`'s output at call time, and the
 * only sentence stored is the trade-off template AAP 0.8 fixes, whose braces the adapter fills from
 * the measurement it just took — the delayed revenue a position avoids included, which the adapter
 * derives from the measured set (rule P-6).
 *
 * Rules served:
 * - P-6: every member is a seed record value disclosed as one through `origin: 'seeded'`. Nothing
 *   here restates a solver expected result, and no consumer may present an option as a computation
 *   performed in this session.
 * - P-1: no option is described as a production outcome. The simulation label is attached by the
 *   interface from the fixed label set, so this module holds no label text to paraphrase.
 * - P-2: `src/types` is the only import, and only `src/services/mock/seed-loader.ts` may import
 *   this folder, so a component cannot reach a record and this module cannot become a data
 *   boundary.
 * - P-4: no description makes a claim about a deployment property. The write-backs are ordinary
 *   record updates, stated step by step.
 * - P-7: every company, site, material and reference below is synthetic, drawn from the record
 *   vocabulary of the seed set, and no vendor, carrier or product name appears.
 * - B-1: no URL, no fetched asset and no runtime request.
 * - B-2: nothing here reads configuration and nothing resembles a credential.
 */

import type { ExceptionId, Levers, ScenarioId, ScenarioSet } from '../types';

/**
 * One exception and the option set the dataset ships for it.
 *
 * Declared here because `src/types` owns the entity shapes but no pairing of an exception with its
 * set: the contract's `ScenarioSet` already carries `exceptionId`, and this record repeats it at
 * the seed level so a loader can index the sets by exception without reading into an option. The
 * two repeat the same value, and a set whose inner `exceptionId` disagrees with its key is a seed
 * defect rather than two records.
 */
export interface ExceptionScenarioSeed {
  /** The exception the set answers, `EXC-2026-nnnn`. */
  readonly exceptionId: ExceptionId;

  /** Every option shipped for that exception, with its recommendation and its set-aside option. */
  readonly scenarioSet: ScenarioSet;
}

/**
 * The three seeded sets, in exception order.
 *
 * Each set is read the way a computed one is: the recommendation is the option with the fewest
 * units late, then the lowest added cost, among those whose constraint check passes. An option
 * that breaches a lever's bound stays in `scenarios`, where its column carries the reason a number
 * is missing, and is listed again in `rejected` with the constraint that blocked it; it is never a
 * candidate for the recommendation, and it sets off no write-back because no system is told to
 * act on a plan that cannot be carried out.
 */
export const EXCEPTION_SCENARIOS: readonly ExceptionScenarioSeed[] = [
  {
    exceptionId: 'EXC-2026-1185',
    scenarioSet: {
      exceptionId: 'EXC-2026-1185',
      scenarios: [
        {
          id: 'SCN-1185-A',
          exceptionId: 'EXC-2026-1185',
          name: 'Expedite the delayed housings by air freight',
          origin: 'seeded',
          unitsLate: 120,
          maxDaysLate: 3,
          ordersOnTime: 0,
          ordersTotal: 1,
          addedCostEur: 41400,
          lineIdleDays: 0.75,
          revenueDelayedEur: 240000,
          // The uplift lands on 8 December, so the line stops on the 7th and restarts the next working day.
          runOut: { day: 4, fractionOfDay: 0.5 },
          dailyClosingStock: [
            { date: '2026-12-03', units: 424 },
            { date: '2026-12-04', units: 366 },
            { date: '2026-12-07', units: 214 },
            { date: '2026-12-08', units: 0 },
            { date: '2026-12-09', units: 1150 },
            { date: '2026-12-10', units: 1010 },
            { date: '2026-12-11', units: 884 },
            { date: '2026-12-14', units: 672 },
          ],
          orders: [{ orderId: 'CO-770227', unitsLate: 120, daysLate: 3 }],
          constraintCheck: 'pass',
          constraintMessages: [],
          sideEffects: [],
          writeBacks: [
            {
              sequence: 1,
              system: 'erp',
              recordRef: 'PO-45011946',
              description: 'Advance the release date on the expedited purchase order.',
              state: 'pending',
            },
            {
              sequence: 2,
              system: 'transport',
              recordRef: 'TRN-88142',
              description: 'Book the uplift that carries the expedited quantity.',
              state: 'pending',
            },
            {
              sequence: 3,
              system: 'scheduling',
              recordRef: 'PLT-QRO-W50-2026',
              description: 'Rebalance the PLT-QRO schedule around the arrival.',
              state: 'pending',
            },
          ],
          levers: { airSets: 1150, transferSets: 0 },
          confidence: {
            level: 'medium',
            reason:
              'The uplift is booked, but its arrival time is the forwarder estimate rather than a confirmed slot, so the day the line restarts can move by one.',
          },
        },
        {
          id: 'SCN-1185-B',
          exceptionId: 'EXC-2026-1185',
          name: 'Split the recovery between air freight and a site transfer',
          origin: 'seeded',
          unitsLate: 90,
          maxDaysLate: 2,
          ordersOnTime: 0,
          ordersTotal: 1,
          addedCostEur: 39100,
          lineIdleDays: 0.5,
          revenueDelayedEur: 180000,
          // The transferred share arrives a day before the uplift, so the line stops for half a day.
          runOut: { day: 4, fractionOfDay: 0.75 },
          dailyClosingStock: [
            { date: '2026-12-03', units: 424 },
            { date: '2026-12-04', units: 330 },
            { date: '2026-12-07', units: 176 },
            { date: '2026-12-08', units: 0 },
            { date: '2026-12-09', units: 1150 },
            { date: '2026-12-10', units: 1034 },
            { date: '2026-12-11', units: 902 },
            { date: '2026-12-14', units: 744 },
          ],
          orders: [{ orderId: 'CO-770227', unitsLate: 90, daysLate: 2 }],
          constraintCheck: 'pass',
          constraintMessages: [],
          // The transferred share is taken out of the alternate site's own build, which is what the
          // approver has to accept before approving a plan: it rescues this exception by delaying
          // another product's kits.
          sideEffects: [
            {
              productId: 'PRD-V40',
              kitsDelayed: 260,
              valueDeferredEur: 31200,
              daysDeferred: 4,
            },
          ],
          writeBacks: [
            {
              sequence: 1,
              system: 'erp',
              recordRef: 'PO-45011946',
              description:
                'Split the purchase order release between the expedited and the transferred quantity.',
              state: 'pending',
            },
            {
              sequence: 2,
              system: 'transport',
              recordRef: 'TRN-88157',
              description: 'Book the uplift for the expedited share.',
              state: 'pending',
            },
            {
              sequence: 3,
              system: 'mes',
              recordRef: 'PLT-RAK-W49-2026',
              description: 'Release the transferred share from the alternate site.',
              state: 'pending',
            },
            {
              sequence: 4,
              system: 'scheduling',
              recordRef: 'PLT-QRO-W50-2026',
              description: 'Rebalance the PLT-QRO schedule around the two arrivals.',
              state: 'pending',
            },
          ],
          levers: { airSets: 575, transferSets: 575 },
          confidence: {
            level: 'high',
            reason:
              'Both flows are confirmed: the uplift is booked and the alternate site has released the transferred quantity into transport.',
          },
        },
        {
          id: 'SCN-1185-C',
          exceptionId: 'EXC-2026-1185',
          name: 'Absorb the delay behind a later promise date',
          origin: 'seeded',
          unitsLate: 275,
          maxDaysLate: 6,
          ordersOnTime: 0,
          ordersTotal: 1,
          addedCostEur: 0,
          lineIdleDays: 4.25,
          revenueDelayedEur: 550000,
          // Nothing arrives inside the window, so the stock reaches zero on 7 December and stays
          // there: the run-out is the point every later date is measured from.
          runOut: { day: 3, fractionOfDay: 0.75 },
          dailyClosingStock: [
            { date: '2026-12-03', units: 424 },
            { date: '2026-12-04', units: 186 },
            { date: '2026-12-07', units: 0 },
            { date: '2026-12-08', units: 0 },
            { date: '2026-12-09', units: 0 },
            { date: '2026-12-10', units: 0 },
            { date: '2026-12-11', units: 0 },
            { date: '2026-12-14', units: 0 },
          ],
          orders: [{ orderId: 'CO-770227', unitsLate: 275, daysLate: 6 }],
          constraintCheck: 'pass',
          constraintMessages: [],
          sideEffects: [],
          writeBacks: [
            {
              sequence: 1,
              system: 'erp',
              recordRef: 'CO-770227',
              description: 'Move the promise dates on the affected customer order to the later release.',
              state: 'pending',
            },
            {
              sequence: 2,
              system: 'scheduling',
              recordRef: 'PLT-QRO-W51-2026',
              description: 'Rebuild the PLT-QRO schedule on the later arrival.',
              state: 'pending',
            },
          ],
          levers: { airSets: 0, transferSets: 0 },
          confidence: {
            level: 'high',
            reason:
              'The option asks nothing of a source beyond the records already read, so its measures carry no forecast uncertainty.',
          },
        },
        {
          id: 'SCN-1185-D',
          exceptionId: 'EXC-2026-1185',
          name: 'Recover the whole quantity by transfer from the alternate site',
          origin: 'seeded',
          // A breaching option reports its constraint instead of a recovery: its measures stay on the
          // unmitigated path, and it sets off no write-back because no system is told to act on a
          // plan that cannot be carried out.
          unitsLate: 275,
          maxDaysLate: 6,
          ordersOnTime: 0,
          ordersTotal: 1,
          addedCostEur: 0,
          lineIdleDays: 4.25,
          revenueDelayedEur: 550000,
          runOut: { day: 3, fractionOfDay: 0.75 },
          dailyClosingStock: [
            { date: '2026-12-03', units: 424 },
            { date: '2026-12-04', units: 186 },
            { date: '2026-12-07', units: 0 },
            { date: '2026-12-08', units: 0 },
            { date: '2026-12-09', units: 0 },
            { date: '2026-12-10', units: 0 },
            { date: '2026-12-11', units: 0 },
            { date: '2026-12-14', units: 0 },
          ],
          orders: [{ orderId: 'CO-770227', unitsLate: 275, daysLate: 6 }],
          constraintCheck: 'fail',
          constraintMessages: [
            'Transfer of 1,320 sets exceeds the 800-set limit on the transfer lever.',
          ],
          sideEffects: [],
          writeBacks: [],
          levers: { airSets: 0, transferSets: 1320 },
          confidence: {
            level: 'low',
            reason:
              'The transfer quantity is above the bound its lever is held to, so the option cannot be carried out and its measures repeat the unmitigated path.',
          },
        },
      ],
      recommendedId: 'SCN-1185-B',
      recommendationRule:
        'The option with the fewest units late, then the lowest added cost, among those whose constraint check passes.',
      tradeOff:
        'Spends EUR 39,100 on the uplift and the transfer, leaves 90 sets late by at most two days and holds EUR 180,000 of revenue the unmitigated path delays in full, at the cost of deferring 260 units of PRD-V40 by four days.',
      rejected: [
        {
          scenarioId: 'SCN-1185-D',
          blockingConstraint:
            'Transfer of 1,320 sets exceeds the 800-set limit on the transfer lever.',
        },
      ],
    },
  },
  {
    exceptionId: 'EXC-2026-1187',
    scenarioSet: {
      exceptionId: 'EXC-2026-1187',
      scenarios: [
        {
          id: 'SCN-1187-A',
          exceptionId: 'EXC-2026-1187',
          name: 'Sort the held units on site and release the inspected quantity',
          origin: 'seeded',
          unitsLate: 84,
          maxDaysLate: 2,
          ordersOnTime: 0,
          ordersTotal: 1,
          addedCostEur: 18720,
          lineIdleDays: 1,
          revenueDelayedEur: 168000,
          // The sort releases on 10 December, the working day after the stock reaches zero.
          runOut: { day: 4, fractionOfDay: 0.25 },
          dailyClosingStock: [
            { date: '2026-12-04', units: 318 },
            { date: '2026-12-07', units: 254 },
            { date: '2026-12-08', units: 168 },
            { date: '2026-12-09', units: 0 },
            { date: '2026-12-10', units: 520 },
            { date: '2026-12-11', units: 436 },
            { date: '2026-12-14', units: 302 },
            { date: '2026-12-15', units: 186 },
          ],
          orders: [{ orderId: 'CO-770227', unitsLate: 84, daysLate: 2 }],
          constraintCheck: 'pass',
          constraintMessages: [],
          sideEffects: [],
          writeBacks: [
            {
              sequence: 1,
              system: 'plm-qms',
              recordRef: 'NCR-2026-1174',
              description: 'Record the sort result against the inspection order.',
              state: 'pending',
            },
            {
              sequence: 2,
              system: 'erp',
              recordRef: 'PO-45011946',
              description: 'Release the inspected quantity to the purchase order.',
              state: 'pending',
            },
            {
              sequence: 3,
              system: 'scheduling',
              recordRef: 'PLT-QRO-W50-2026',
              description: 'Rebuild the PLT-QRO schedule on the released quantity.',
              state: 'pending',
            },
          ],
          levers: { airSets: 0, transferSets: 520 },
          confidence: {
            level: 'medium',
            reason:
              'The sort is scheduled, but the inspection result behind the release date is the quality source estimate, so the release can slip by a day.',
          },
        },
        {
          id: 'SCN-1187-B',
          exceptionId: 'EXC-2026-1187',
          name: 'Sort on site and release every held unit before the first due date',
          origin: 'seeded',
          unitsLate: 0,
          maxDaysLate: 0,
          ordersOnTime: 1,
          ordersTotal: 1,
          addedCostEur: 28080,
          lineIdleDays: 0,
          revenueDelayedEur: 0,
          // Stock reaches zero at the window's last close, after the order it measures is due, so
          // no order arrives late while the projection still reports a run-out day.
          runOut: { day: 8, fractionOfDay: 0.5 },
          dailyClosingStock: [
            { date: '2026-12-04', units: 318 },
            { date: '2026-12-07', units: 268 },
            { date: '2026-12-08', units: 196 },
            { date: '2026-12-09', units: 142 },
            { date: '2026-12-10', units: 780 },
            { date: '2026-12-11', units: 648 },
            { date: '2026-12-14', units: 402 },
            { date: '2026-12-15', units: 0 },
          ],
          orders: [{ orderId: 'CO-770227', unitsLate: 0, daysLate: 0 }],
          constraintCheck: 'pass',
          constraintMessages: [],
          sideEffects: [
            {
              productId: 'PRD-A200',
              kitsDelayed: 180,
              valueDeferredEur: 54000,
              daysDeferred: 3,
            },
          ],
          writeBacks: [
            {
              sequence: 1,
              system: 'plm-qms',
              recordRef: 'NCR-2026-1174',
              description: 'Record the completed sort against the inspection order.',
              state: 'pending',
            },
            {
              sequence: 2,
              system: 'erp',
              recordRef: 'PO-45011946',
              description: 'Release every held unit to the purchase order.',
              state: 'pending',
            },
            {
              sequence: 3,
              system: 'scheduling',
              recordRef: 'PLT-QRO-W50-2026',
              description: 'Rebuild the PLT-QRO schedule on the full release.',
              state: 'pending',
            },
          ],
          levers: { airSets: 0, transferSets: 780 },
          confidence: {
            level: 'high',
            reason:
              'The sort plan is confirmed against the current inspection queue and the released quantity covers every order in the set.',
          },
        },
        {
          id: 'SCN-1187-C',
          exceptionId: 'EXC-2026-1187',
          name: 'Replace the whole held quantity from the alternate site',
          origin: 'seeded',
          unitsLate: 275,
          maxDaysLate: 6,
          ordersOnTime: 0,
          ordersTotal: 1,
          addedCostEur: 0,
          lineIdleDays: 5.5,
          revenueDelayedEur: 550000,
          runOut: { day: 3, fractionOfDay: 0.75 },
          dailyClosingStock: [
            { date: '2026-12-04', units: 318 },
            { date: '2026-12-07', units: 254 },
            { date: '2026-12-08', units: 0 },
            { date: '2026-12-09', units: 0 },
            { date: '2026-12-10', units: 0 },
            { date: '2026-12-11', units: 0 },
            { date: '2026-12-14', units: 0 },
            { date: '2026-12-15', units: 0 },
          ],
          orders: [{ orderId: 'CO-770227', unitsLate: 275, daysLate: 6 }],
          constraintCheck: 'fail',
          constraintMessages: [
            'Transfer of 960 sets exceeds the 800-set limit on the transfer lever.',
          ],
          sideEffects: [],
          writeBacks: [],
          levers: { airSets: 0, transferSets: 960 },
          confidence: {
            level: 'low',
            reason:
              'The replacement quantity is above the bound its lever is held to, so the option cannot be carried out and its measures repeat the unmitigated path.',
          },
        },
      ],
      recommendedId: 'SCN-1187-B',
      recommendationRule:
        'The option with the fewest units late, then the lowest added cost, among those whose constraint check passes.',
      tradeOff:
        'Spends EUR 28,080 to sort the held units on site and release all of them before the first due date, leaves no order late and defers 180 units of PRD-A200 by three days.',
      rejected: [
        {
          scenarioId: 'SCN-1187-C',
          blockingConstraint:
            'Transfer of 960 sets exceeds the 800-set limit on the transfer lever.',
        },
      ],
    },
  },
  {
    exceptionId: 'EXC-2026-1195',
    scenarioSet: {
      exceptionId: 'EXC-2026-1195',
      scenarios: [
        {
          id: 'SCN-1195-A',
          exceptionId: 'EXC-2026-1195',
          name: 'Reroute the lane through the northern corridor',
          origin: 'seeded',
          unitsLate: 96,
          maxDaysLate: 2,
          ordersOnTime: 0,
          ordersTotal: 1,
          addedCostEur: 12480,
          lineIdleDays: 1,
          revenueDelayedEur: 192000,
          // The rerouted consignment lands on 14 December, the next working day after the stock reaches zero.
          runOut: { day: 5, fractionOfDay: 0.5 },
          dailyClosingStock: [
            { date: '2026-12-07', units: 372 },
            { date: '2026-12-08', units: 316 },
            { date: '2026-12-09', units: 204 },
            { date: '2026-12-10', units: 96 },
            { date: '2026-12-11', units: 0 },
            { date: '2026-12-14', units: 1040 },
            { date: '2026-12-15', units: 924 },
            { date: '2026-12-16', units: 783 },
          ],
          orders: [{ orderId: 'CO-770244', unitsLate: 96, daysLate: 2 }],
          constraintCheck: 'pass',
          constraintMessages: [],
          sideEffects: [],
          writeBacks: [
            {
              sequence: 1,
              system: 'transport',
              recordRef: 'TRN-88203',
              description: 'Book the reroute against the disrupted lane.',
              state: 'pending',
            },
            {
              sequence: 2,
              system: 'erp',
              recordRef: 'PO-45011963',
              description: 'Move the purchase order release onto the rerouted lane.',
              state: 'pending',
            },
            {
              sequence: 3,
              system: 'scheduling',
              recordRef: 'PLT-RGB-W50-2026',
              description: 'Rebuild the PLT-RGB schedule around the rerouted arrival.',
              state: 'pending',
            },
          ],
          levers: { airSets: 0, transferSets: 1040 },
          confidence: {
            level: 'medium',
            reason:
              'The reroute is priced, but its capacity booking is still reported as pending by the transport source, so the arrival can move by a day.',
          },
        },
        {
          id: 'SCN-1195-B',
          exceptionId: 'EXC-2026-1195',
          name: 'Split the recovery between air freight and the corridor reroute',
          origin: 'seeded',
          unitsLate: 0,
          maxDaysLate: 0,
          ordersOnTime: 1,
          ordersTotal: 1,
          addedCostEur: 38880,
          lineIdleDays: 0,
          revenueDelayedEur: 0,
          // Stock reaches zero at the window's last close, after the order it measures is due, so
          // no order arrives late while the projection still reports a run-out day.
          runOut: { day: 8, fractionOfDay: 0.5 },
          dailyClosingStock: [
            { date: '2026-12-07', units: 372 },
            { date: '2026-12-08', units: 330 },
            { date: '2026-12-09', units: 288 },
            { date: '2026-12-10', units: 240 },
            { date: '2026-12-11', units: 600 },
            { date: '2026-12-14', units: 486 },
            { date: '2026-12-15', units: 314 },
            { date: '2026-12-16', units: 0 },
          ],
          orders: [{ orderId: 'CO-770244', unitsLate: 0, daysLate: 0 }],
          constraintCheck: 'pass',
          constraintMessages: [],
          sideEffects: [
            {
              productId: 'PRD-R75',
              kitsDelayed: 240,
              valueDeferredEur: 84000,
              daysDeferred: 5,
            },
          ],
          writeBacks: [
            {
              sequence: 1,
              system: 'transport',
              recordRef: 'TRN-88203',
              description: 'Book the reroute and the uplift against the disrupted lane.',
              state: 'pending',
            },
            {
              sequence: 2,
              system: 'erp',
              recordRef: 'PO-45011963',
              description: 'Move the purchase order release onto the rerouted lane and the uplift.',
              state: 'pending',
            },
            {
              sequence: 3,
              system: 'scheduling',
              recordRef: 'PLT-RGB-W50-2026',
              description: 'Rebuild the PLT-RGB schedule around both arrivals.',
              state: 'pending',
            },
          ],
          levers: { airSets: 600, transferSets: 600 },
          confidence: {
            level: 'high',
            reason:
              'Both flows are confirmed: the uplift is booked and the corridor capacity for the rerouted share is allocated.',
          },
        },
        {
          id: 'SCN-1195-C',
          exceptionId: 'EXC-2026-1195',
          name: 'Air-freight the entire shortage',
          origin: 'seeded',
          unitsLate: 300,
          maxDaysLate: 7,
          ordersOnTime: 0,
          ordersTotal: 1,
          addedCostEur: 0,
          lineIdleDays: 6.75,
          revenueDelayedEur: 600000,
          runOut: { day: 2, fractionOfDay: 0.75 },
          dailyClosingStock: [
            { date: '2026-12-07', units: 372 },
            { date: '2026-12-08', units: 0 },
            { date: '2026-12-09', units: 0 },
            { date: '2026-12-10', units: 0 },
            { date: '2026-12-11', units: 0 },
            { date: '2026-12-14', units: 0 },
            { date: '2026-12-15', units: 0 },
            { date: '2026-12-16', units: 0 },
          ],
          orders: [{ orderId: 'CO-770244', unitsLate: 300, daysLate: 7 }],
          constraintCheck: 'fail',
          constraintMessages: [
            'Air freight of 1,480 sets exceeds the 1,200-set limit on the air lever.',
          ],
          sideEffects: [],
          writeBacks: [],
          levers: { airSets: 1480, transferSets: 0 },
          confidence: {
            level: 'low',
            reason:
              'The air quantity is above the bound its lever is held to, so the option cannot be carried out and its measures repeat the unmitigated path.',
          },
        },
      ],
      recommendedId: 'SCN-1195-B',
      recommendationRule:
        'The option with the fewest units late, then the lowest added cost, among those whose constraint check passes.',
      tradeOff:
        'Spends EUR 38,880 to reroute the lane and add the uplift, leaves no order late and defers 240 units of PRD-R75 by five days.',
      rejected: [
        {
          scenarioId: 'SCN-1195-C',
          blockingConstraint:
            'Air freight of 1,480 sets exceeds the 1,200-set limit on the air lever.',
        },
      ],
    },
  },
];

/* ---------------------------------------------------------------------------------------------
 * The measured case's option positions — AAP 0.7's T-04 row, AAP 0.8, rule P-6
 * ------------------------------------------------------------------------------------------- */

/**
 * One option position the records state for an exception measured from its solver case.
 *
 * This is the record side of an option and holds no measure: the identifier its column takes, the
 * position it is measured at, the words the column is labelled with and, for the one option whose
 * trade-off AAP 0.8 states, the sentence template that trade-off is written from. The measure side —
 * units late, maximum days late, orders on time, added cost, line idle days, revenue delayed, the side
 * effects and the write-backs — is `solveSupplyDelay`'s output for `levers`, computed when the
 * comparison is read (rule P-6), and the delayed revenue an option avoids is the difference the adapter
 * computes over those measurements rather than a figure a row states.
 */
export interface SeededSolverOption {
  /** The option's identifier within its set, `SCN-nnnn-x` (contracts §1). */
  readonly id: ScenarioId;

  /** The exception whose case measures the option. */
  readonly exceptionId: ExceptionId;

  /** The words the comparison matrix labels the option's column with. */
  readonly name: string;

  /** The lever position the option is measured at. */
  readonly levers: Levers;

  /**
   * The trade-off sentence the recommended option's figures are written into, where the records state
   * one.
   *
   * The template is record content in the form AAP 0.8 fixes, with a brace for each figure the adapter
   * fills from the measurement it took. Only the recommended option of a set carries one: a trade-off
   * is the recommendation's, not an option's.
   */
  readonly tradeOffTemplate?: string;
}

/**
 * The four option positions of `EXC-2026-1184`, in the order the comparison matrix shows them.
 *
 * AAP 0.7's T-04 row fixes the number — "SCN-1184's four rows are solver output" — and AAP 0.8 fixes
 * what the set holds: the do-nothing baseline every other option is measured against, the air-freight
 * position at that lever's maximum, the position the seeded plan APR-2026-104 names and whose cost
 * AAP 0.8 states, and one position beyond the air lever's maximum, which the solver's own constraint
 * check rejects, so the screen carries the set-aside alternate AAP 0.12.4 shows with its blocking
 * constraint.
 *
 * The order is the one a reader follows: what doing nothing costs, then the recovery that only pulls
 * the air lever, then the plan, then the position the records show cannot be carried out.
 */
export const SOLVER_OPTION_SETS: readonly SeededSolverOption[] = [
  {
    id: 'SCN-1184-A',
    exceptionId: 'EXC-2026-1184',
    name: 'Neither lever applied',
    levers: { airSets: 0, transferSets: 0 },
  },
  {
    id: 'SCN-1184-B',
    exceptionId: 'EXC-2026-1184',
    name: 'Air freight only',
    levers: { airSets: 600, transferSets: 0 },
  },
  {
    id: 'SCN-1184-C',
    exceptionId: 'EXC-2026-1184',
    name: 'Air freight and transfer',
    levers: { airSets: 600, transferSets: 900 },
    tradeOffTemplate:
      'Spends EUR {addedCostEur} and defers {kitsDeferred} Brno service kits (EUR {valueDeferredEur}) by {daysDeferred} days to avoid EUR {protectedRevenueEur} of delayed revenue.',
  },
  {
    id: 'SCN-1184-D',
    exceptionId: 'EXC-2026-1184',
    name: 'Air freight beyond the air lever maximum, with transfer',
    levers: { airSets: 700, transferSets: 900 },
  },
];
