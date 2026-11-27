/**
 * The two hundred seeded audit events the demonstration opens on, held as drafts — the records
 * before the chain gives them their identities, their hashes and their linkage.
 *
 * `platform-contracts.md` §6 fixes the mechanism and AAP 0.8 fixes where it runs: the mock adapter's
 * bootstrap appends these drafts in sequence through `appendEvent` (`src/domain/audit/chain.ts`),
 * which derives the sequence number, the `AUD-nnnnnn` identifier, the payload hash, the predecessor's
 * hash as `previousHash` — the genesis value of `GENESIS_PREVIOUS_HASH` for the first event — and the
 * event hash. That is why no `previousHash` and no `eventHash` appears below: a hash stored here
 * would be one the chain did not derive from the fields beside it, so the first `verifyChain` would
 * report a break the trail does not have. `AuditEventDraft` carries the event's content for exactly
 * that reason, and hashing is Web Crypto's work in `src/domain/audit/hash.ts`, not a record's.
 *
 * Composition. The trail is twenty-seven authored events and the rest from the deterministic
 * generator of `src/seed/filler.ts`. The authored events are the demonstration's own business
 * activity — approval requests and decisions, exception assignments, notes, a dismissal, a sandbox
 * solve, exports, assistant questions, the policy blocks on outbound calls, an extraction review and
 * role switches — each placed at the instant the record it belongs to states. The generated events
 * supply the month's integration activity: source synchronisations, freshness checks, extraction
 * reviews, exports and blocked outbound attempts.
 *
 * The trail is ordered by instant, and that ordering is the point rather than a detail. The authored
 * activity is not the older part of the trail: `src/seed/exception-history.ts` opens
 * `EXC-2026-1184` on 27 November and `src/seed/approvals.ts` records the seeded decisions on 1 and
 * 2 December, while the generator anchors its newest event a few minutes before the demonstration
 * clock. One order satisfies both — the whole trail sorted by timestamp, which is the merge
 * `src/seed/filler.ts` documents for a mixed set. Authorship order and instant order would therefore
 * disagree, and only instant order keeps the audit trail consistent with the records it describes.
 *
 * The tamper target. `AUD-000142` is the event the simulation popover edits without recomputing its
 * hash, so a verification reports a break at sequence 142 and repairs nothing (AAP 0.10, AAP 0.12.4).
 * The chain numbers a trail by position, so that identifier is a position: the event at sequence 142
 * is the 142nd draft in instant order. The authored event `TAMPER_TARGET` sits at the instant that
 * lands it there, and it is deliberately the record of a blocked external-model call — its `result`
 * edited from `blocked` to `allowed` is the most consequential single edit the trail can carry,
 * because it contradicts the declared posture the outbound ledger reports. The position is checked at
 * the end of this module rather than assumed, because the generator's instants and the authored ones
 * share one timeline and a change to either could move it.
 *
 * The identifiers handed to the generator. `buildFillerAuditEvents` takes the identifiers the caller
 * has already named, and reads them as the leading block of the chain: it generates the events after
 * them and refuses a call whose generated positions would repeat one of them. That premise holds only
 * while the authored events are the oldest, which the instants above rule out. Because the chain
 * derives every identifier from a trail position, the guarantee that no two events share one is
 * positional and holds whatever the merge order is: the generator is handed the leading block of the
 * pattern as the count of authored events, and its collision guard — which cannot see that the
 * authored events are scattered through the trail — stays the check it is for a caller whose named
 * events do lead the chain.
 *
 * Trace identifiers. The authored events carry `TRC-9nnnnn`, a block above the six-digit range the
 * generator derives from its own positions, so an authored trace never collides with a generated one.
 * The events of one request share a trace: an assistant question and the policy block that refused it
 * quote the same identifier, which is what makes a quoted trace lead to both.
 *
 * Determinism (AAP 0.2.1, AAP 0.18.2). Every instant below is a literal in the application's own
 * offset, no field is read from the system clock, and the generator is a pure function of its
 * arguments, so the same two hundred drafts — and therefore the same hashes — are produced on every
 * start, on every engine.
 *
 * Record content only (rule P-6). Nothing here counts, aggregates, rounds or verifies: the events
 * record what happened, `src/domain/aggregation/ledger.ts` counts them, and a verification is
 * `src/domain/audit/verify.ts`. The one number this module states is the size of the trail it holds,
 * which is the count the bootstrap asserts.
 *
 * Rules this module is built to satisfy:
 * - P-2: it imports `src/types` and the sibling generator in `src/seed/filler.ts`, and nothing else,
 *   so it cannot become a second data boundary; only `src/services/mock/seed-loader.ts` may import
 *   the seed folder.
 * - P-4: every event records an action and its outcome. No action, payload or comment claims that the
 *   chain resists tampering or establishes anything about the store behind it — the interface labels
 *   the mechanism "Simulated control" wherever it surfaces, and the target above is the record of an
 *   edit a verification *finds* rather than one the chain prevents.
 * - P-7: actors are the seeded personas and the seeded policies, objects are the seeded records, and
 *   the outbound endpoints are the opaque `.example` hosts the declared configuration blocks. No real
 *   company, customer, carmaker or cloud product is named, and no placeholder prose stands in for a
 *   record.
 * - B-1: the `.example` endpoints are record content on calls that were refused; nothing here
 *   contacts anything, and the module holds no reachable address of its own.
 * - B-2: no payload carries a credential of any kind, and the module reads no configuration.
 *
 * DERIVATION — the seed document is not on disk. `platform-seed-data.md` §12 holds the seeded audit
 * events, and it is not part of this repository, so the activity below is derived rather than
 * transcribed. What the inputs fix is the set, the size and the treatment: AAP 0.2.3 fixes 200 events,
 * AAP 0.8 fixes that the mock adapter hashes them at bootstrap, AAP 0.10 and AAP 0.12.4 fix
 * `AUD-000142` as the tamper target, contracts §6 fixes the sixteen actions, and contracts §5 with
 * AAP 0.12.1 fix that the outbound ledger counts the blocked attempts on the four declared endpoints.
 * Every actor, object and instant below is taken from the record that states it — the exception
 * history, the approvals, the policies, the models, the sovereignty ledger — so the trail agrees with
 * the records it describes instead of restating them. If the seed document is supplied later, its
 * events transcribe over these and supersede them with no change to any consumer, because every
 * consumer reads the trail through the service.
 */

import type { AuditEventDraft, AuditEventId, Timestamp } from '../types';
import { DEMO_CLOCK } from '../types';
import { buildFillerAuditEvents } from './filler';

/* ---------------------------------------------------------------------------------------------
 * A. The size of the trail and the event the simulation edits
 * ------------------------------------------------------------------------------------------- */

/**
 * How many events the seeded chain holds when the demonstration opens (AAP 0.2.3, AAP 0.8).
 *
 * The mock adapter's bootstrap appends exactly this many drafts and can assert the count it built
 * against it, so a trail that gained or lost an event fails at start rather than presenting a chain
 * of an unexpected length.
 */
export const SEEDED_EVENT_COUNT = 200;

/**
 * The identifier of the seeded event the simulation popover edits (AAP 0.10, AAP 0.12.4).
 *
 * Held as a constant so no popover, screen or test types the identifier: the control edits the event
 * this name resolves to, and the verification then reports the position that event occupies.
 */
export const TAMPER_TARGET_ID = 'AUD-000142';

/**
 * The position `TAMPER_TARGET_ID` names: the counter in its six-digit form is its sequence number
 * (contracts §1, and `identifierFor` in `src/domain/audit/chain.ts`).
 */
const TAMPER_TARGET_SEQUENCE = 142;

/* ---------------------------------------------------------------------------------------------
 * B. The authored activity
 * ------------------------------------------------------------------------------------------- */

/*
 * One draft per event, in ascending instant order, so the array reads as the month it records. Every
 * field is a record value: an actor the seed holds, an object another seed module owns, an outcome,
 * and the values either side of the action where a record changed. Nothing here is computed, counted
 * or summarised (rule P-6).
 *
 * Payloads are the affected record's own fields — a status before and after a decision, the owner a
 * record gained, the format of an export — because contracts §6 hashes the canonical JSON of
 * `{ before, after }` and record values are what a reader of the audit drawer can compare.
 */

/**
 * The event the simulation's tamper control edits (AAP 0.10, AAP 0.12.4).
 *
 * It records the policy engine refusing an external reasoning model for a question whose context
 * carries a customer-confidential document — the assistant's block card of AAP 0.12.4, recorded as
 * the two events that block produces: the question that was refused, and this policy event. Editing
 * its `result` from `blocked` to `allowed` is the tamper the demonstration offers, and the position it
 * occupies is what the verification then reports.
 *
 * Placed at 16:05 on 27 November, the instant that makes it the 142nd event of the merged trail; the
 * check at the end of this module holds that position.
 */
const TAMPER_TARGET: AuditEventDraft = {
  timestamp: '2026-11-27T16:05:00+01:00',
  actorType: 'policy',
  actorId: 'POL-007',
  action: 'policy block',
  objectRef: 'api.external-llm.example',
  result: 'blocked',
  policyId: 'POL-007',
  before: null,
  after: {
    destination: 'api.external-llm.example',
    modelId: 'EXT-REASONING-01',
    classification: 'customer-confidential',
  },
  traceId: 'TRC-900010',
};

/**
 * The authored events, oldest first.
 *
 * Each entry is activity one of the other seed modules already dates: the assistant's questions and
 * the blocks POL-007 placed on them, the exports the evidence-pack, comparison and chokepoint
 * downloads record, the four outbound attempts the declared allowed list refused, the requests and
 * decisions of the seeded approvals, and the exception work the history records.
 */
const NAMED_EVENTS: readonly AuditEventDraft[] = [
  {
    timestamp: '2026-11-12T10:20:00+01:00',
    actorType: 'user',
    actorId: 'USR-06',
    action: 'assistant question',
    objectRef: 'MDL-LOCAL-L v3',
    result: 'succeeded',
    before: null,
    after: { modelId: 'MDL-LOCAL-L v3', boundary: 'in-boundary' },
    traceId: 'TRC-900001',
  },
  {
    timestamp: '2026-11-12T14:35:00+01:00',
    actorType: 'user',
    actorId: 'USR-06',
    action: 'export',
    objectRef: 'PLT-BRN',
    result: 'succeeded',
    before: null,
    after: { pack: 'evidence pack', format: 'json' },
    traceId: 'TRC-900002',
  },
  {
    timestamp: '2026-11-18T09:05:00+01:00',
    actorType: 'policy',
    actorId: 'POL-001',
    action: 'policy block',
    objectRef: 'public-risk-feed.example',
    result: 'blocked',
    policyId: 'POL-001',
    before: null,
    after: { destination: 'public-risk-feed.example', allowedList: 'empty' },
    traceId: 'TRC-900003',
  },
  {
    timestamp: '2026-11-19T16:40:00+01:00',
    actorType: 'policy',
    actorId: 'POL-001',
    action: 'policy block',
    objectRef: 'telemetry.vendor.example',
    result: 'blocked',
    policyId: 'POL-001',
    before: null,
    after: { destination: 'telemetry.vendor.example', allowedList: 'empty' },
    traceId: 'TRC-900004',
  },
  {
    timestamp: '2026-11-23T08:15:00+01:00',
    actorType: 'user',
    actorId: 'USR-04',
    action: 'assistant question',
    objectRef: 'EXT-REASONING-01',
    result: 'blocked',
    policyId: 'POL-007',
    before: null,
    after: { modelId: 'EXT-REASONING-01', boundary: 'external', context: 'DOC-0031' },
    traceId: 'TRC-900005',
  },
  {
    timestamp: '2026-11-23T08:16:00+01:00',
    actorType: 'policy',
    actorId: 'POL-007',
    action: 'policy block',
    objectRef: 'api.external-llm.example',
    result: 'blocked',
    policyId: 'POL-007',
    before: null,
    after: {
      destination: 'api.external-llm.example',
      modelId: 'EXT-REASONING-01',
      classification: 'customer-confidential',
    },
    traceId: 'TRC-900005',
  },
  {
    timestamp: '2026-11-24T13:20:00+01:00',
    actorType: 'user',
    actorId: 'USR-01',
    action: 'custom solve',
    objectRef: 'EXC-2026-1184',
    result: 'succeeded',
    before: null,
    after: { exceptionId: 'EXC-2026-1184', airSets: 0, transferSets: 900 },
    traceId: 'TRC-900006',
  },
  {
    timestamp: '2026-11-25T09:40:00+01:00',
    actorType: 'user',
    actorId: 'USR-01',
    action: 'export',
    objectRef: 'EXC-2026-1184',
    result: 'succeeded',
    before: null,
    after: { pack: 'scenario comparison', format: 'csv' },
    traceId: 'TRC-900007',
  },
  {
    timestamp: '2026-11-26T07:30:00+01:00',
    actorType: 'policy',
    actorId: 'POL-001',
    action: 'policy block',
    objectRef: 'license-check.vendor.example',
    result: 'blocked',
    policyId: 'POL-001',
    before: null,
    after: { destination: 'license-check.vendor.example', allowedList: 'empty' },
    traceId: 'TRC-900008',
  },
  {
    timestamp: '2026-11-26T15:10:00+01:00',
    actorType: 'user',
    actorId: 'USR-06',
    action: 'role switch',
    objectRef: 'USR-06',
    result: 'succeeded',
    before: { activeUserId: 'USR-04' },
    after: { activeUserId: 'USR-06' },
    traceId: 'TRC-900009',
  },
  TAMPER_TARGET,
  {
    timestamp: '2026-11-28T08:30:00+01:00',
    actorType: 'user',
    actorId: 'USR-01',
    action: 'note',
    objectRef: 'EXC-2026-1184',
    result: 'succeeded',
    before: null,
    after: {
      note: 'Asked the supplier for a revised promise date. The date it holds still lands past the projected run-out on the consuming line.',
    },
    traceId: 'TRC-900011',
  },
  {
    timestamp: '2026-11-30T07:05:00+01:00',
    actorType: 'user',
    actorId: 'USR-07',
    action: 'assign',
    objectRef: 'EXC-2026-1189',
    result: 'succeeded',
    before: { ownerId: null },
    after: { ownerId: 'USR-07' },
    traceId: 'TRC-900012',
  },
  {
    timestamp: '2026-11-30T15:35:00+01:00',
    actorType: 'user',
    actorId: 'USR-05',
    action: 'approval request',
    objectRef: 'APR-2026-101',
    result: 'succeeded',
    before: null,
    after: { exceptionId: 'EXC-2026-1185', scenarioId: 'SCN-1185-A', status: 'pending' },
    traceId: 'TRC-900013',
  },
  {
    timestamp: '2026-12-01T09:15:00+01:00',
    actorType: 'user',
    actorId: 'USR-05',
    action: 'approval request',
    objectRef: 'APR-2026-102',
    result: 'succeeded',
    before: null,
    after: { exceptionId: 'EXC-2026-1187', scenarioId: 'SCN-1187-A', status: 'pending' },
    traceId: 'TRC-900014',
  },
  {
    timestamp: '2026-12-01T15:40:00+01:00',
    actorType: 'user',
    actorId: 'USR-03',
    action: 'decision',
    objectRef: 'APR-2026-101',
    result: 'succeeded',
    before: { status: 'pending' },
    after: { status: 'approved', action: 'approve' },
    traceId: 'TRC-900015',
  },
  {
    timestamp: '2026-12-01T15:52:00+01:00',
    actorType: 'user',
    actorId: 'USR-02',
    action: 'export',
    objectRef: 'PLT-BRN',
    result: 'succeeded',
    before: null,
    after: { pack: 'evidence pack', format: 'json' },
    traceId: 'TRC-900016',
  },
  {
    timestamp: '2026-12-02T07:40:00+01:00',
    actorType: 'user',
    actorId: 'USR-01',
    action: 'approval request',
    objectRef: 'APR-2026-103',
    result: 'succeeded',
    before: null,
    after: { exceptionId: 'EXC-2026-1195', scenarioId: 'SCN-1195-A', status: 'pending' },
    traceId: 'TRC-900017',
  },
  {
    timestamp: '2026-12-02T09:05:00+01:00',
    actorType: 'user',
    actorId: 'USR-03',
    action: 'note',
    objectRef: 'EXC-2026-1195',
    result: 'succeeded',
    before: null,
    after: {
      note: 'Alternate routing confirmed with the forwarder. The replacement quantity can be booked on the next sailing.',
    },
    traceId: 'TRC-900018',
  },
  {
    timestamp: '2026-12-02T11:20:00+01:00',
    actorType: 'user',
    actorId: 'USR-03',
    action: 'decision',
    objectRef: 'APR-2026-102',
    result: 'succeeded',
    before: { status: 'pending' },
    after: { status: 'approved', action: 'approve' },
    traceId: 'TRC-900019',
  },
  {
    timestamp: '2026-12-02T13:25:00+01:00',
    actorType: 'user',
    actorId: 'USR-07',
    action: 'extraction review',
    objectRef: 'PPAP-0219',
    result: 'succeeded',
    before: { state: 'review' },
    after: { state: 'pass' },
    traceId: 'TRC-900020',
  },
  {
    timestamp: '2026-12-02T16:50:00+01:00',
    actorType: 'user',
    actorId: 'USR-01',
    action: 'dismiss',
    objectRef: 'EXC-2026-1188',
    result: 'succeeded',
    before: { status: 'open' },
    after: {
      status: 'dismissed',
      reason: 'The same material is already covered by the containment plan approved for EXC-2026-1187.',
    },
    traceId: 'TRC-900021',
  },
  {
    timestamp: '2026-12-02T18:30:00+01:00',
    actorType: 'user',
    actorId: 'USR-03',
    action: 'decision',
    objectRef: 'APR-2026-103',
    result: 'succeeded',
    before: { status: 'pending' },
    after: { status: 'approved', action: 'approve' },
    traceId: 'TRC-900022',
  },
  {
    timestamp: '2026-12-02T19:10:00+01:00',
    actorType: 'user',
    actorId: 'USR-01',
    action: 'approval request',
    objectRef: 'APR-2026-104',
    result: 'succeeded',
    before: null,
    after: { exceptionId: 'EXC-2026-1184', scenarioId: 'SCN-1184-C', status: 'pending' },
    traceId: 'TRC-900023',
  },
  {
    timestamp: '2026-12-03T06:20:00+01:00',
    actorType: 'user',
    actorId: 'USR-03',
    action: 'assistant question',
    objectRef: 'MDL-LOCAL-L v3',
    result: 'succeeded',
    before: null,
    after: { modelId: 'MDL-LOCAL-L v3', boundary: 'in-boundary' },
    traceId: 'TRC-900024',
  },
  {
    timestamp: '2026-12-03T06:45:00+01:00',
    actorType: 'user',
    actorId: 'USR-03',
    action: 'export',
    objectRef: 'CHK-01',
    result: 'succeeded',
    before: null,
    after: { pack: 'chokepoint brief', format: 'json' },
    traceId: 'TRC-900025',
  },
  {
    timestamp: '2026-12-03T07:15:00+01:00',
    actorType: 'user',
    actorId: 'USR-01',
    action: 'role switch',
    objectRef: 'USR-01',
    result: 'succeeded',
    before: { activeUserId: 'USR-03' },
    after: { activeUserId: 'USR-01' },
    traceId: 'TRC-900026',
  },
];

/* ---------------------------------------------------------------------------------------------
 * C. The trail: the authored activity and the generated activity in one instant order
 * ------------------------------------------------------------------------------------------- */

/**
 * The identifiers the generator is told the caller has already named — one for each authored event,
 * in the six-digit pattern contracts §1 fixes.
 *
 * They are the size of the authored block rather than the identifiers the authored events finally
 * carry, and nothing else is possible here: the chain derives an identifier from a trail position,
 * and an authored event's position is decided by the merge below rather than by this list. What the
 * generator takes from it is how many events it must not generate, and its collision guard refuses a
 * generated position that would repeat one of them (the module comment above records why that guard
 * cannot see the scattered case, and why the positional guarantee covers it).
 */
const NAMED_BLOCK_IDENTIFIERS: readonly AuditEventId[] = Array.from(
  { length: NAMED_EVENTS.length },
  (_unused, position) => `AUD-${String(position + 1).padStart(6, '0')}`,
);

/**
 * The generated events, from the deterministic filler of `src/seed/filler.ts`: the month's source
 * synchronisations, freshness checks, extraction reviews, exports and blocked outbound attempts.
 */
const GENERATED_EVENTS: readonly AuditEventDraft[] = buildFillerAuditEvents(
  NAMED_BLOCK_IDENTIFIERS,
  SEEDED_EVENT_COUNT,
);

/**
 * Orders two drafts by their instants.
 *
 * Every instant the seed carries is written in the demonstration clock's own offset, so the text of
 * one compares with the text of another exactly as the moments do — no offset arithmetic is needed
 * and none is done here.
 */
function byInstant(left: AuditEventDraft, right: AuditEventDraft): number {
  if (left.timestamp < right.timestamp) {
    return -1;
  }
  if (left.timestamp > right.timestamp) {
    return 1;
  }
  return 0;
}

/**
 * The seeded trail the mock adapter's bootstrap appends: two hundred drafts in ascending instant
 * order, the first of which the chain numbers `AUD-000001`.
 *
 * The adapter appends these in order through `appendEvent`, so the position a draft holds here is the
 * sequence number it carries afterwards. That is what ties the ordering above to `TAMPER_TARGET_ID`:
 * the draft at index 141 is the event the chain numbers 142, which is the one the simulation edits.
 */
export const SEEDED_AUDIT_EVENTS: readonly AuditEventDraft[] = [
  ...NAMED_EVENTS,
  ...GENERATED_EVENTS,
].sort(byInstant);

/* ---------------------------------------------------------------------------------------------
 * D. The property the demonstration's own text depends on, checked at load
 * ------------------------------------------------------------------------------------------- */

/**
 * Refuses a trail that would contradict what the interface and the README state about it.
 *
 * Four properties are checked, and each has a consequence a reader would see:
 * - the trail holds `SEEDED_EVENT_COUNT` events, which is the count the bootstrap asserts;
 * - the instants ascend strictly, which is the ordering AAP 0.12.2 states for the chain and what lets
 *   a reader follow the trail by time;
 * - no event is recorded after the demonstration clock, because no business logic in this
 *   application reads a later instant than the constant one (contracts §1);
 * - the event at sequence 142 is the tamper target, because AAP 0.10 and AAP 0.12.4 say the tamper
 *   control's edit is reported at that position, and the position follows from the generator's
 *   instants as much as from the authored ones.
 *
 * The last check is the one that can fail on a change elsewhere: the generator places its events on a
 * timeline derived from the demonstration clock, so widening one of its gaps moves the drafts the
 * authored events sit among. A failure names the position, the instant found there, and the two files
 * whose instants decide it, so the correction is a single instant rather than an investigation.
 */
function assertSeededTrail(trail: readonly AuditEventDraft[]): void {
  if (trail.length !== SEEDED_EVENT_COUNT) {
    throw new Error(
      `The seeded audit trail holds ${trail.length} events; the demonstration opens on ${SEEDED_EVENT_COUNT}.`,
    );
  }

  let previous: Timestamp | null = null;
  for (const draft of trail) {
    if (previous !== null && draft.timestamp <= previous) {
      throw new Error(
        `The seeded audit trail is not in strictly ascending instant order: ${draft.timestamp} follows ${previous}.`,
      );
    }
    previous = draft.timestamp;
  }

  const newest = trail[trail.length - 1];
  if (newest !== undefined && newest.timestamp > DEMO_CLOCK) {
    throw new Error(
      `The seeded audit trail records ${newest.timestamp}, which is after the demonstration clock ${DEMO_CLOCK}.`,
    );
  }

  const atTargetPosition = trail[TAMPER_TARGET_SEQUENCE - 1];
  if (atTargetPosition !== TAMPER_TARGET) {
    throw new Error(
      `The tamper control edits ${TAMPER_TARGET_ID}, so the seeded trail must hold that event at sequence ${TAMPER_TARGET_SEQUENCE}; the draft there is the one recorded at ${atTargetPosition === undefined ? 'no position at all' : atTargetPosition.timestamp}. Move the tamper target's instant in src/seed/audit-events.ts, or the instant series of src/seed/filler.ts, so the two agree again.`,
    );
  }
}

assertSeededTrail(SEEDED_AUDIT_EVENTS);

