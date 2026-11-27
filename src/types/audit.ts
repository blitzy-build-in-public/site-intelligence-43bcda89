/**
 * Audit chain vocabulary: the append-only hash chain of `platform-contracts.md` §6, which records
 * every action the demonstration appends and every decision a policy reached.
 *
 * The mechanism, fixed by contracts §6 and AAP 0.8:
 *
 * - An event carries an `eventHash`: the lowercase-hex SHA-256 of the UTF-8 concatenation
 *   sequence|id|timestamp|actorType|actorId|action|objectRef|result|policyId|payloadHash|previousHash,
 *   with an empty string standing where `policyId` is absent.
 * - `payloadHash` is the SHA-256 of the canonical JSON of `{ before, after }`: keys sorted, no
 *   whitespace, and a missing value written as `null`.
 * - Each event links to its predecessor by carrying that event's `eventHash` as its own
 *   `previousHash`. The first event carries `GENESIS_PREVIOUS_HASH`, the 64 zeros of contracts §6.
 *
 * The chain is append-only. A verification recomputes every hash in sequence, reports the position
 * of each break and leaves the records as it found them. The interface labels the chain "Simulated
 * control" wherever it surfaces, because a browser page establishes nothing about the store behind
 * it (rule P-4).
 *
 * Fixing inputs:
 * - `platform-contracts.md` §6 for the concatenated string, the canonical-JSON rule, the genesis
 *   value and the link from an event to its predecessor.
 * - AAP 0.8 for the mechanism as restated above, and AAP 0.12.1 for the chain helpers that consume
 *   these shapes — `appendEvent(events, draft)` and `verifyChain(events)`.
 * - AAP 0.12.1 and AAP 0.12.4 for `ChainBreak`, the position pair a verification reports and the
 *   audit screen displays.
 *
 * The payload's shape is settled rather than open. contracts §6 hashes the canonical JSON of
 * `{ before, after }` and fixes no member of either side, AAP 0.12.2 records `before` and `after`
 * among an event's attributes without naming a member of either, and `canonicalJson` in
 * `src/domain/audit/hash.ts` recurses over whatever record it is given — objects, arrays and
 * scalars alike. A payload is therefore arbitrary record content, and `AuditPayload` is
 * deliberately that shape rather than a placeholder for one: no available input fixes a member that
 * it could have declared instead.
 *
 * This module declares shapes and the genesis constant only. The computation belongs to
 * `src/domain/audit/hash.ts`, `src/domain/audit/chain.ts` and `src/domain/audit/verify.ts`. The
 * `AuditEvent` and `ChainReport` entities belong to `./entities`, which imports the vocabulary below
 * rather than redeclaring it.
 *
 * OPEN ITEM: contracts §6 fixes 16 audit action names and the inputs available in this run enumerate
 * 12 of them, so `AuditAction` stays an open alias over the canonical spellings recorded on it. A
 * closed union would either invent a member or reject a legitimate seed record at compile time.
 * OPEN ITEM: contracts §6 fixes the `result` term of the concatenated string without giving its
 * literals, so `AuditResult` carries the four values traceable to the ledger columns of AAP 0.12.4
 * and the simulated write-back behaviour of AAP 0.2.2.
 */

import type { AuditEventId, PolicyId, Timestamp } from './primitives';

/**
 * Who appended an event, as the `actorType` term of contracts §6 names it.
 *
 * - `'user'` — the acting persona: every action a screen triggers while a role is active.
 * - `'policy'` — the policy engine, which appends its own event when it denies an action or blocks
 *   an assistant answer (AAP 0.8), so a refusal is recorded by the mechanism that made it.
 * - `'system'` — the originating actor of the seeded events the demonstration bootstraps, which no
 *   persona performed.
 */
export type AuditActorType = 'user' | 'policy' | 'system';

/**
 * The outcome an event records, as the `result` term of contracts §6 names it.
 *
 * The four values are derived rather than quoted, because contracts §6 fixes the term and not its
 * literals (see the second OPEN ITEM above). `'allowed'` and `'blocked'` are the two counts the
 * outbound ledger reports per endpoint over its window (AAP 0.12.1, AAP 0.12.4). `'succeeded'` and
 * `'failed'` separate a completed write from a write recorded as having failed (AAP 0.2.2). A
 * blocked call and a failed call both leave the record unchanged.
 */
export type AuditResult = 'allowed' | 'blocked' | 'succeeded' | 'failed';

/**
 * The action an event records, spelled as the appending module spells it.
 *
 * contracts §6 fixes 16 action names (AAP 0.12.1). The 12 the inputs available in this run enumerate
 * are the canonical spellings for every act a screen or a policy decision appends: `assign`, `note`,
 * `dismiss`, `custom solve`, `approval request`, `decision`, `outcome review`, `assistant question`,
 * `policy block`, `extraction review`, `export` and `role switch` (the data flow AAP 0.6.2 sets
 * out). The adapter derives two further spellings for write paths that enumeration does not name, so
 * 14 distinct values are appended: `simulated write-back` for a write-back step's transition,
 * spelled in `src/services/mock/handlers/approvals.ts`, and `policy exception request` for a
 * time-boxed policy exception, spelled in `src/services/mock/handlers/governance.ts`. A supplied
 * contracts document supersedes either constant without a consumer change.
 *
 * The two demonstrations of the chain itself append nothing. A verification is a read — AAP 0.12.3
 * lists `GET /audit-events/verify` — so it reports the chain as it stands and leaves every record as
 * it found it. The tamper control edits a recorded result of a seeded event without recomputing its
 * hash, and the break it leaves is the one a verification then reports (AAP 0.10): an appended event
 * would extend the chain rather than exhibit that disagreement, and a recomputed hash would be the
 * repair the control must not perform.
 *
 * OPEN ITEM: the remaining two of the 16 are named by no input available in this run, so this stays
 * an open alias over `string` rather than a closed union with an invented member — AAP 0.14.2 adds
 * no capability the inputs do not name.
 */
export type AuditAction = string;

/**
 * The `before` or `after` member values of an event: the two halves the payload hash covers.
 *
 * A payload is the affected record's fields, so its members are arbitrary JSON — a string
 * identifier, a number, a nested object — and one side is `null` when the action created or removed
 * the record. The keys are sorted and the whitespace omitted when the payload is serialised for
 * hashing, and a missing value is written as `null` (contracts §6). `unknown` rather than a wider
 * escape is what lets a caller write a payload without a cast and read one back only after checking
 * it. No input available in this run fixes a shaped payload, so this declaration is the module's
 * intended shape and not a stand-in for one.
 */
export type AuditPayload = Record<string, unknown>;

/**
 * One event's content, before the chain gives it an identity and its hashes.
 *
 * `appendEvent(events, draft)` (AAP 0.12.1) consumes this and returns the complete `AuditEvent`: the
 * sequence number, the `AUD-nnnnnn` identifier, the `previousHash` taken from the event before it,
 * the payload hash and the event hash are all computed there, which is why none of them appears
 * below. Every member except `before` and `after` is one term of the concatenated string of
 * contracts §6.
 */
export interface AuditEventDraft {
  /**
   * When the action happened, read from the demonstration clock rather than the system clock.
   */
  timestamp: Timestamp;

  /**
   * Which kind of actor appended the event.
   */
  actorType: AuditActorType;

  /**
   * The acting persona (`USR-01` and so on), or the policy identifier when `actorType` is
   * `'policy'`. Never a person's or a company's name (rule P-7).
   */
  actorId: string;

  /**
   * What the event records, from the canonical spellings of `AuditAction`.
   */
  action: AuditAction;

  /**
   * The identifier of the record the event is about, which is what a reader follows to the entity
   * and what the ledger groups an endpoint's events by.
   */
  objectRef: string;

  /**
   * The outcome the event records.
   */
  result: AuditResult;

  /**
   * The policy that decided the outcome, present only on an event a policy evaluation produced.
   * The concatenated string writes its absence as an empty string (contracts §6).
   */
  policyId?: PolicyId;

  /**
   * The affected record's values before the action, or `null` when the action created it.
   */
  before: AuditPayload | null;

  /**
   * The affected record's values after the action, or `null` when the action removed it.
   */
  after: AuditPayload | null;

  /**
   * The identifier that the `meta` of every result and every failure of the same request carries,
   * so an identifier a user quotes leads back to this event.
   */
  traceId: string;
}

/**
 * One position at which the chain does not verify.
 *
 * `verifyChain` (AAP 0.12.1) recomputes every hash in sequence and returns each break as this pair,
 * so the interface can report the first one and count the rest; the seeded event the simulation
 * popover edits is reported at sequence 142 (AAP 0.12.4). `sequence` is the stored sequence number
 * of the event at the break, and `id` is that event's `AUD-nnnnnn` identifier, so a reader can open
 * the record itself.
 */
export interface ChainBreak {
  /**
   * Stored sequence number of the event whose hash does not match the chain.
   */
  sequence: number;

  /**
   * `AUD-nnnnnn` identifier of that event.
   */
  id: AuditEventId;
}

/**
 * The `previousHash` of the chain's first event: the 64 zeros of contracts §6.
 *
 * Written as a repeat rather than as a literal, so no long key-shaped string of characters sits in
 * the source (rule B-2).
 */
export const GENESIS_PREVIOUS_HASH: string = '0'.repeat(64);
