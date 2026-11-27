/**
 * The seeded activity history of the demonstration's operational exceptions: the nine records the
 * scale table fixes (AAP 0.2.3) and the only records the overview's "median hours to approved plan"
 * tile is computed from (AAP 0.8, AAP 0.12.2).
 *
 * `ExceptionHistoryRecord` is declared here because `src/types` owns no history shape. Contracts §3
 * defines the exception, the approval and the audit event; the activity an exception accumulates
 * between detection and resolution travels as this record set, so the shape lives beside the
 * records rather than in the shared type modules.
 *
 * The consuming aggregation reads three things from a record, and each is unambiguous: the exception
 * the activity belongs to (`exceptionId`), the instant it happened (`occurredAt` — for an `approved`
 * record the moment the plan was approved, for an `opened` record the moment the exception was
 * detected), and the exception's state afterwards (`status`). `src/domain/aggregation/overview.ts`
 * derives the hours between those instants and the median over them; neither is computed or stored
 * here, because every figure is computed rather than typed (rule P-6).
 *
 * Every record is synthetic demonstration data, displayed under the shell's persistent
 * `Simulated data` badge: no note presents an activity as a production record (rule P-1), and none
 * claims a property the demonstration does not implement (rule P-4). The people are the seeded
 * personas `USR-01` to `USR-08` and the exceptions are the seeded ones; no company, person or
 * figure outside them is named and no placeholder text is used (rule P-7).
 *
 * `id` takes the deterministic derived form `<exceptionId>-<sequence>`, because contracts §1 fixes
 * no identifier pattern for a history record and inventing a prefix would add a contract vocabulary
 * the inputs do not define.
 *
 * Rules this module is built to satisfy: P-2 (it imports `src/types` and nothing else, and only
 * `src/services/mock/seed-loader.ts` may import it), P-6 (no computed duration, median or count),
 * B-1 (no external URL or host anywhere in it), B-2 (no credential and no environment read).
 *
 * Timestamps are ISO 8601 with the `+01:00` offset of the application's Europe/Berlin time zone and
 * every one of them precedes the constant demonstration clock `2026-12-03T08:00:00+01:00`
 * (contracts §1).
 */

import type { ExceptionId, ExceptionStatus, Timestamp, UserId } from '../types';

/**
 * One activity on one operational exception, as the seeded history holds it.
 *
 * The record is the evidence trail of an exception rather than a projection of it: `occurredAt`
 * dates the activity itself and `status` is the exception's state at that moment, so the last
 * record of an exception and the exception's own record agree without either being derived from
 * the other.
 */
export interface ExceptionHistoryRecord {
  /** The record's own key, `<exceptionId>-<sequence>`. */
  id: string;

  /** The operational exception the activity happened on, `EXC-2026-nnnn`. */
  exceptionId: ExceptionId;

  /** When the activity happened, ISO 8601 in the application's time zone. */
  occurredAt: Timestamp;

  /** The persona who performed the activity, `USR-01` to `USR-08`. */
  actorId: UserId;

  /**
   * What was done. `approved` dates the moment the plan was approved and `opened` the moment the
   * exception was detected, which are the two instants the overview's median is measured between.
   */
  action: 'opened' | 'assigned' | 'noted' | 'dismissed' | 'approved' | 'resolved';

  /** The exception's state after the activity. */
  status: ExceptionStatus;

  /** What happened, in plain words, as the record states it. */
  note: string;
}

/**
 * The nine seeded history records, grouped by exception and ordered within each group by
 * `occurredAt`.
 *
 * The exception identifiers are the ones the inputs evidence: `EXC-2026-1184` and `EXC-2026-1190`
 * directly, and `EXC-2026-1185`, `EXC-2026-1187` and `EXC-2026-1195` through the `SCN-nnnn-x`
 * identifiers of the seeded scenarios they own. A record therefore joins the seeded exception of
 * the same number, and no exception identifier is introduced here that another seed module does not
 * already hold.
 *
 * Three exceptions carry an `approved` record paired with their `opened` one, so the overview's
 * middle value is defined; `EXC-2026-1187` also carries the `resolved` record that closes it. The
 * demonstration's flagship exception `EXC-2026-1184` carries no approval here on purpose: the
 * planner approves it in the browser during the end-to-end journey, which is what leaves its plan
 * to be chosen in the first place. Assigning, noting and dismissing are performed live by the mock
 * adapter when a user does them, so the seed holds the activities that have already happened and
 * the action vocabulary above covers the rest.
 */
export const EXCEPTION_HISTORY: readonly ExceptionHistoryRecord[] = [
  {
    id: 'EXC-2026-1184-01',
    exceptionId: 'EXC-2026-1184',
    occurredAt: '2026-11-27T06:55:00+01:00',
    actorId: 'USR-01',
    action: 'opened',
    status: 'open',
    note: 'Detected from the supplier scheduling feed: the delayed purchase order slipped again while the plant holds only a few days of opening stock. Raised for investigation with the affected customer orders attached.',
  },
  {
    id: 'EXC-2026-1185-01',
    exceptionId: 'EXC-2026-1185',
    occurredAt: '2026-11-30T06:20:00+01:00',
    actorId: 'USR-05',
    action: 'opened',
    status: 'open',
    note: 'Production planning raised a capacity clash on the late shift after the short-term schedule changed, leaving the plant to choose which customer orders to resequence.',
  },
  {
    id: 'EXC-2026-1185-02',
    exceptionId: 'EXC-2026-1185',
    occurredAt: '2026-12-01T15:40:00+01:00',
    actorId: 'USR-02',
    action: 'approved',
    status: 'open',
    note: 'Plant manager approved the resequenced plan after comparing the added cost with the delayed revenue it protects.',
  },
  {
    id: 'EXC-2026-1187-01',
    exceptionId: 'EXC-2026-1187',
    occurredAt: '2026-12-01T08:40:00+01:00',
    actorId: 'USR-07',
    action: 'opened',
    status: 'open',
    note: 'Supplier quality engineer raised the deviation found on the incoming inspection record and attached the evidence for the affected lot.',
  },
  {
    id: 'EXC-2026-1187-02',
    exceptionId: 'EXC-2026-1187',
    occurredAt: '2026-12-02T11:20:00+01:00',
    actorId: 'USR-02',
    action: 'approved',
    status: 'open',
    note: 'Plant manager approved the containment plan once alternate-source readiness and the affected customer orders had been reviewed.',
  },
  {
    id: 'EXC-2026-1187-03',
    exceptionId: 'EXC-2026-1187',
    occurredAt: '2026-12-02T16:45:00+01:00',
    actorId: 'USR-07',
    action: 'resolved',
    status: 'resolved',
    note: 'Containment confirmed on the follow-up inspection. The deviation stays recorded against the lot and the exception is closed.',
  },
  {
    id: 'EXC-2026-1190-01',
    exceptionId: 'EXC-2026-1190',
    occurredAt: '2026-12-01T10:12:00+01:00',
    actorId: 'USR-07',
    action: 'opened',
    status: 'open',
    note: 'Quality hold placed on the housings of the latest inbound lot pending dimension checks, with the lines it touches recorded on the exception.',
  },
  {
    id: 'EXC-2026-1195-01',
    exceptionId: 'EXC-2026-1195',
    occurredAt: '2026-12-02T07:15:00+01:00',
    actorId: 'USR-01',
    action: 'opened',
    status: 'open',
    note: 'Detected from the transport feed: the inbound sailing slipped and the plant has no confirmed arrival for its next delivery.',
  },
  {
    id: 'EXC-2026-1195-02',
    exceptionId: 'EXC-2026-1195',
    occurredAt: '2026-12-02T18:30:00+01:00',
    actorId: 'USR-03',
    action: 'approved',
    status: 'open',
    note: 'Head of supply chain approved the alternate routing for the inbound lane, with the protected customer orders recorded against the plan.',
  },
];
