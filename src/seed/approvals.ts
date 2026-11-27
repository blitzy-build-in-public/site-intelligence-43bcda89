/**
 * Seeded approvals: the plans already put to an approver when the demonstration opens, which is
 * what the SCR-05 inbox, the approval detail, its write-back tracker and its outcome card read
 * before anyone acts.
 *
 * `platform-contracts.md` §3 fixes the shape and AAP 0.12.2 fixes the record: an approval names one
 * exception and one option measured for it, the requester is never eligible to decide it, and the
 * decision fields are present exactly when a decision has been taken. Three approved plans and one
 * pending plan appear in the seed — `approved` three times and `pending` once — so the inbox, its
 * status filter and the detail screen each have a record to show. A rejection and a request for
 * changes are taken live through SCR-05 and are not seeded, so every seeded decision is an approval
 * recorded at the instant its exception's own history records and by the actor that history names,
 * and `pending` belongs to the plan awaiting a decision alone. That pending supply-delay plan is the
 * one the planner journey of AAP 0.2.2 approves.
 *
 * Only `src/services/mock/seed-loader.ts` may import this module (rule P-2). Screens and components
 * reach these records through the service port, and the loader deep-clones them into the mock
 * adapter's in-memory state, where every decision taken in this session is applied and where
 * `Reset demo data` restores them.
 *
 * The two euro members are the plan's own pair and never this module's arithmetic (rule P-6). The
 * contract's `Approval` declares `addedCostEur` and `protectedRevenueEur` as required members, so
 * they are written here as the figures the plan itself carries, and the adapter recomputes both
 * from the plan at read time — from the solver's measures for the supply-delay case, from the
 * seeded scenario record for a seeded option. Nothing below is derived, summed or rounded here: a
 * measure this module computed would be a second answer to a question the solver already answers.
 *
 * References this module states but does not own. The exceptions are the records of
 * `src/seed/exceptions.ts` and the requesters and deciders are the personas of specification §3; the
 * seeded scenario identifiers are owned by `src/seed/exception-scenarios.ts`. `SCN-1184-C` is the
 * option the mock adapter's solver produces for the supply-delay case, whose measures are recomputed
 * at call time, so the record below stores the plan reference and no measure of its own. Scenario
 * identifiers follow the contracts §1 pattern `SCN-nnnn-x`, where the suffix is the option's letter
 * within that exception's own set, so the first option of a seeded set is `...-A`.
 *
 * `eligibleApproverRoles` is the list of roles the contracts §7.1 matrix lets decide a plan, so the
 * rule that a requester never decides reads as the requester's own role being absent from that list,
 * and each `decidedBy` below names a persona holding a role that is on it.
 *
 * DERIVATION — the seed document is not on disk. `platform-seed-data.md` holds the seeded approvals
 * this module carries, and it is not part of this repository, so the requesters, deciders, comments
 * and instants below are authored rather than transcribed. What the inputs fix is the plan the
 * records point at: AAP 0.8 names `SCN-1184-C` as the recommended option of `CASE-1184`, whose added
 * cost and deferred revenue its trade-off sentence states, and AAP 0.2.2 fixes that the pending
 * supply-delay plan is the one the planner journey approves. If the seed document is supplied later,
 * its table transcribes over these records and supersedes them with no change to any consumer,
 * because every consumer reads an approval through the service.
 *
 * Rules this module is built to satisfy: P-1 (every write-back is simulated, and the label its
 * rendering carries is read from `SIM_LABELS` instead of being retyped on each step), P-2 (it
 * imports `src/types` and nothing else), P-4 (nothing here claims the flow establishes sovereignty,
 * withstands an edit or stops a copy; the write-backs are recorded as steps, not as assurances),
 * P-6 (no computed measure is stated as this module's own result), P-7 (only synthetic personas,
 * generic system categories and figures), B-1 (no external URL) and B-2 (no credential field and no
 * environment read).
 */

import type { Approval, SimLabel } from '../types';
import { SIM_LABELS } from '../types';

/**
 * The simulation label every step of every seeded write-back carries where the approval detail, the
 * write-back tracker and the comparison screen's preview render it (specification §5.3, rule P-1).
 *
 * `WriteBack` carries the step's state and no label member, so the label belongs to whatever renders
 * the step. Reading it out of `SIM_LABELS` at the position the seven labels of §5.3 give it keeps the
 * string owned in `src/types/primitives.ts` and out of the twenty steps below, where retyping it
 * twenty times is twenty chances to paraphrase it.
 */
export const WRITE_BACK_SIM_LABEL: SimLabel = SIM_LABELS[3];

/**
 * The seeded approvals, ordered by identifier.
 *
 * Each record's `writeBacks` are the steps its plan would write, in the order the plan states them,
 * and each step's state says what has happened to it: `succeeded` for a plan that was approved and
 * whose steps have run, `pending` for a plan no part of which has been written — the state of the
 * plan still awaiting a decision, which is the only seeded plan no approval has been taken on. A
 * failure would be recorded on the step itself, beside the fixed write-back label, because a
 * simulated write-back is all-or-nothing and a failed step is never silently dropped (AAP 0.2.2).
 */
export const APPROVALS: readonly Approval[] = [
  // Approved, awaiting its outcome review: the state the SCR-05 outcome card writes its planned and
  // resulting figures against once the reviewer confirms it.
  {
    id: 'APR-2026-101',
    exceptionId: 'EXC-2026-1185',
    scenarioId: 'SCN-1185-A',
    requestedBy: 'USR-01',
    eligibleApproverRoles: ['plant-manager'],
    status: 'approved',
    addedCostEur: 41400,
    protectedRevenueEur: 240000,
    decision: {
      action: 'approve',
      comment:
        'Approved: the uplift restarts the line the working day after it stops, which holds the lateness to three days and delays a fraction of the revenue the waiting option would.',
    },
    decidedBy: 'USR-02',
    decidedAt: '2026-12-01T15:40:00+01:00',
    writeBacks: [
      {
        sequence: 1,
        system: 'erp',
        recordRef: 'ERP.REL.1185.01',
        description: 'Release the amended purchase order line for the affected material.',
        state: 'succeeded',
      },
      {
        sequence: 2,
        system: 'scheduling',
        recordRef: 'SCH.SLOT.1185.01',
        description: 'Move the line run to the amended delivery week.',
        state: 'succeeded',
      },
      {
        sequence: 3,
        system: 'transport',
        recordRef: 'TRN.SHP.1185.01',
        description: 'Confirm the transport booking for the amended quantity.',
        state: 'succeeded',
      },
      {
        sequence: 4,
        system: 'mes',
        recordRef: 'MES.WO.1185.01',
        description: 'Release the revised production order for the line to the shop floor.',
        state: 'succeeded',
      },
      {
        sequence: 5,
        system: 'plm-qms',
        recordRef: 'QMS.DEV.1185.01',
        description: 'Record the approved plan against the open deviation record.',
        state: 'succeeded',
      },
    ],
    outcomeReviewed: false,
  },

  // Approved, and the second approved plan awaiting its outcome review: this plan's rejection was
  // never taken, so the record carries the approval the exception's history already records for it.
  {
    id: 'APR-2026-102',
    exceptionId: 'EXC-2026-1187',
    scenarioId: 'SCN-1187-A',
    requestedBy: 'USR-05',
    eligibleApproverRoles: ['plant-manager'],
    status: 'approved',
    addedCostEur: 18720,
    protectedRevenueEur: 168000,
    decision: {
      action: 'approve',
      comment:
        'Approved: the on-site sort releases the inspected quantity the working day after the stock runs out, which holds the lateness to two days and delays far less revenue than the hold would.',
    },
    decidedBy: 'USR-02',
    decidedAt: '2026-12-02T11:20:00+01:00',
    writeBacks: [
      {
        sequence: 1,
        system: 'erp',
        recordRef: 'ERP.REL.1187.01',
        description: 'Release the amended purchase order line for the affected material.',
        state: 'succeeded',
      },
      {
        sequence: 2,
        system: 'scheduling',
        recordRef: 'SCH.SLOT.1187.01',
        description: 'Re-sequence the line run around the alternate source.',
        state: 'succeeded',
      },
      {
        sequence: 3,
        system: 'transport',
        recordRef: 'TRN.SHP.1187.01',
        description: 'Book the transport leg for the alternate quantity.',
        state: 'succeeded',
      },
      {
        sequence: 4,
        system: 'mes',
        recordRef: 'MES.WO.1187.01',
        description: 'Release the revised production order to the shop floor.',
        state: 'succeeded',
      },
      {
        sequence: 5,
        system: 'plm-qms',
        recordRef: 'QMS.DEV.1187.01',
        description: 'Record the approved plan against the open deviation record.',
        state: 'succeeded',
      },
    ],
    outcomeReviewed: false,
  },

  // The third approved plan: recorded at the instant the exception's own history records for it, and
  // by the actor that history names. `EXC-2026-1195-02` approved the alternate routing at 18:30 on
  // 2 December, so the record below carries that approval rather than a request for changes.
  {
    id: 'APR-2026-103',
    exceptionId: 'EXC-2026-1195',
    scenarioId: 'SCN-1195-A',
    requestedBy: 'USR-01',
    eligibleApproverRoles: ['head-of-supply-chain'],
    status: 'approved',
    addedCostEur: 12480,
    protectedRevenueEur: 192000,
    decision: {
      action: 'approve',
      comment:
        'Approved: the reroute restores the inbound lane the next working day after it stops, which holds the lateness to two days and delays far less revenue than waiting out the delay would.',
    },
    decidedBy: 'USR-03',
    decidedAt: '2026-12-02T18:30:00+01:00',
    writeBacks: [
      {
        sequence: 1,
        system: 'erp',
        recordRef: 'ERP.REL.1195.01',
        description: 'Release the amended purchase order line for the held material.',
        state: 'succeeded',
      },
      {
        sequence: 2,
        system: 'scheduling',
        recordRef: 'SCH.SLOT.1195.01',
        description: 'Re-sequence the line run to consume the released stock first.',
        state: 'succeeded',
      },
      {
        sequence: 3,
        system: 'transport',
        recordRef: 'TRN.SHP.1195.01',
        description: 'Book the transport leg for the replacement quantity.',
        state: 'succeeded',
      },
      {
        sequence: 4,
        system: 'mes',
        recordRef: 'MES.WO.1195.01',
        description: 'Release the revised production order to the shop floor.',
        state: 'succeeded',
      },
      {
        sequence: 5,
        system: 'plm-qms',
        recordRef: 'QMS.DEV.1195.01',
        description: 'Record the approved plan against the open deviation record.',
        state: 'succeeded',
      },
    ],
    outcomeReviewed: false,
  },

  // Pending: the supply-delay plan the planner journey approves end to end. Its option is the
  // recommended one, and its two euro figures are that option's own measures, recomputed by the
  // adapter from the solver at read time, so this record states the plan's reference and measures
  // nothing here. The five steps are the set an approval sets in motion, in the plan's order, and
  // every one of them awaits the decision.
  {
    id: 'APR-2026-104',
    exceptionId: 'EXC-2026-1184',
    scenarioId: 'SCN-1184-C',
    requestedBy: 'USR-01',
    eligibleApproverRoles: ['plant-manager', 'head-of-supply-chain'],
    status: 'pending',
    addedCostEur: 21300,
    protectedRevenueEur: 2257000,
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
    outcomeReviewed: false,
  },
];
