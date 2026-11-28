/**
 * Audit chain vocabulary: the append-only hash chain of `platform-contracts.md` §6, which records
 * every action the demonstration appends and every decision a policy reached.
 *
 * The mechanism: `eventHash` is the lowercase-hex SHA-256 of the UTF-8 concatenation of sequence,
 * id, timestamp, actorType, actorId, action, objectRef, result, policyId, payloadHash and
 * previousHash, with an empty string where `policyId` is absent; `payloadHash` is the SHA-256 of
 * the canonical JSON of `{ before, after }`, keys sorted, no whitespace, a missing value as `null`;
 * and each event carries its predecessor's `eventHash` as `previousHash`, the first carrying
 * `GENESIS_PREVIOUS_HASH`.
 *
 * The chain is append-only, a verification recomputes every hash in sequence and reports each
 * break, and the interface labels it "Simulated control" wherever it surfaces, because a browser
 * page establishes nothing about the store behind it (rule P-4).
 *
 * Fixing inputs: contracts §6 for the string, the canonical JSON, the genesis value and the link;
 * AAP 0.8 for the mechanism; AAP 0.12.1 for `appendEvent` and `verifyChain`; AAP 0.12.1 and
 * AAP 0.12.4 for `ChainBreak`. `AuditPayload` is deliberately arbitrary record content, because
 * contracts §6 fixes no member of either side of `{ before, after }`, so no input fixes a member
 * it could declare.
 */

import type { AuditEventId, PolicyId, Timestamp } from './primitives';

/**
 * Who appended an event, as contracts §6's `actorType` term names it: `'user'` for a screen
 * action, `'policy'` for the engine appending its own denial event, `'system'` for the seeded
 * events.
 */
export type AuditActorType = 'user' | 'policy' | 'system';

/**
 * The outcome an event records, as contracts §6's `result` term names it: the term is fixed and
 * its literals are not, so the four are derived — `'allowed'` and `'blocked'` the ledger's counts
 * (AAP 0.12.1, AAP 0.12.4), `'succeeded'` and `'failed'` the write outcomes (AAP 0.2.2).
 */
export type AuditResult = 'allowed' | 'blocked' | 'succeeded' | 'failed';

/**
 * The action an event records, spelled as the appending module spells it.
 *
 * contracts §6 fixes 16 action names where the inputs enumerate 12 — `assign`, `note`, `dismiss`,
 * `custom solve`, `approval request`, `decision`, `outcome review`, `assistant question`,
 * `policy block`, `extraction review`, `export` and `role switch` (AAP 0.6.2) — so the alias stays
 * open over the canonical spellings rather than closing as a union with an invented member, which
 * would either add one or reject a legitimate seed record at compile time (AAP 0.14.2).
 */
export type AuditAction = string;

/**
 * The `before` or `after` member values of an event: the two halves the payload hash covers. A
 * payload is the affected record's fields, so its members are arbitrary JSON, and one side is
 * `null` when the action created or removed the record. The keys are sorted, the whitespace omitted
 * and a missing value written as `null` when it is serialised for hashing (contracts §6).
 */
export type AuditPayload = Record<string, unknown>;

/**
 * One event's content, before the chain gives it an identity and its hashes. `appendEvent(events,
 * draft)` (AAP 0.12.1) computes the sequence, the `AUD-nnnnnn` identifier and both hashes, so none
 * is a member; every other member is one term of the string contracts §6 concatenates.
 */
export interface AuditEventDraft {
  /** When the action happened, read from the demonstration clock rather than the system clock. */
  timestamp: Timestamp;

  actorType: AuditActorType;

  /**
   * The acting role's seeded user identifier, or the policy identifier when `actorType` is
   * `'policy'`. Never a person's or a company's name (rule P-7).
   */
  actorId: string;

  action: AuditAction;

  /**
   * The identifier of the record the event is about: what a reader follows to the entity, and what
   * the outbound ledger groups an endpoint's events by.
   */
  objectRef: string;

  result: AuditResult;

  /**
   * The policy that decided the outcome, present only on an event a policy evaluation produced; the
   * concatenated string writes its absence as an empty string (contracts §6).
   */
  policyId?: PolicyId;

  /** The affected record's values before the action, or `null` when the action created it. */
  before: AuditPayload | null;

  /** The affected record's values after the action, or `null` when the action removed it. */
  after: AuditPayload | null;

  /**
   * The identifier a user quotes from a failure's `meta` to reach this event.
   */
  traceId: string;
}

/**
 * One position at which the chain does not verify. `verifyChain` (AAP 0.12.1) recomputes every hash
 * in sequence and returns each break as this pair; the seeded event the tamper control edits is
 * reported at sequence 142 (AAP 0.12.4), and the stored sequence number with the identifier lets a
 * reader open the record itself.
 */
export interface ChainBreak {
  sequence: number;

  id: AuditEventId;
}

/**
 * The `previousHash` of the chain's first event: the 64 zeros of contracts §6, written as a repeat
 * so no long key-shaped literal sits in the source (rule B-2).
 */
export const GENESIS_PREVIOUS_HASH: string = '0'.repeat(64);
