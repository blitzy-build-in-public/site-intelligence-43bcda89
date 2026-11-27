/**
 * The one append path of the audit chain: the function every audited write reaches, and the only
 * place an event's two hashes are computed.
 *
 * Implements `platform-contracts.md` §6 as AAP 0.8 and AAP 0.12.1 restate it. An appended event
 * carries its predecessor's `eventHash` as its own `previousHash` — the genesis value of
 * `src/types/audit.ts` for the first event in the chain — and hashes the canonical `{ before, after }`
 * payload before hashing the concatenated identity string that includes that payload hash and the
 * predecessor's. Because the linkage is computed here and nowhere else, no caller can append a record
 * whose `previousHash` disagrees with the event before it.
 *
 * Two properties the mock adapter's behaviour rests on (AAP 0.2.1, AAP 0.18.2):
 *
 * - Deterministic. The same `(events, draft)` pair yields equal hashes on every call, which is why the
 *   bootstrap of the two hundred seeded events hashes to the same values on every start. Nothing here
 *   reads the system clock, a random source or a module-level value: `timestamp` arrives on the draft,
 *   and both digests come from `./hash`, a function of its input alone.
 * - Non-mutating. `events` is the adapter's own state, so nothing is written into it — no push, no
 *   splice, no sort — and the event returned is a new object rather than any member's identity.
 *   Committing it to the chain is the caller's step.
 *
 * The sequence number and the `AUD-nnnnnn` identifier are derived below rather than read from the
 * draft, because `AuditEventDraft` carries neither: it is the event's content before the chain gives
 * it an identity, as its declaration in `src/types/audit.ts` records. The sequence continues the chain
 * one above its predecessor, and the identifier is that number in the six-digit form
 * `platform-contracts.md` §1 fixes, so the event at sequence 142 is `AUD-000142`. Neither value is
 * validated here: whether the sequence order holds is what a verification examines, and an append does
 * not stand in for one.
 *
 * Rules this module is built to satisfy:
 * - P-2: it imports `src/types` (type-only, through the barrel) and the sibling `./hash`, so it cannot
 *   reach a seed record, the service layer, React or a screen.
 * - P-4: it hashes and links records. No wording here claims a property of the store behind them, and
 *   the interface labels the mechanism "Simulated control" wherever it surfaces.
 * - P-6: nothing is rounded, formatted or localised. Every digest is lowercase hex from `./hash`, and
 *   the only number derived here is a position in a list.
 * - B-1: both digests come from the platform's own Web Crypto through `./hash`, so an append adds no
 *   request to any host.
 * - B-2: the genesis value is imported from `src/types/audit.ts` rather than written here, and nothing
 *   reads configuration.
 * - P-7: the identifier quoted above is the synthetic `AUD-nnnnnn` pattern of contracts §1.
 */

import type { AuditEvent, AuditEventDraft } from '../../types';
import { GENESIS_PREVIOUS_HASH } from '../../types';
import { eventHash, payloadHash } from './hash';

/** The identifier prefix contracts §1 fixes for an audit event. */
const IDENTIFIER_PREFIX = 'AUD-';

/** Digits in the identifier's counter, so sequence 142 reads `AUD-000142` (contracts §1). */
const IDENTIFIER_DIGITS = 6;

/** The sequence number of the first event in a chain, which contracts §1 counts from one. */
const FIRST_SEQUENCE = 1;

/**
 * The `AUD-nnnnnn` identifier of the event that takes a given sequence number.
 *
 * A counter wider than the pattern is left as it reads rather than truncated, so a chain longer than
 * the six digits the pattern fixes still yields one distinct identifier per event.
 *
 * @param sequence The position the event takes in the chain.
 * @returns The identifier, its counter zero-padded to the pattern's six digits.
 */
function identifierFor(sequence: number): string {
  return `${IDENTIFIER_PREFIX}${String(sequence).padStart(IDENTIFIER_DIGITS, '0')}`;
}

/**
 * Appends one draft to the chain and returns the complete event.
 *
 * Implements `platform-contracts.md` §6. The event links to its predecessor by carrying that event's
 * `eventHash` as its own `previousHash`, and carries the genesis value when the chain is empty; it
 * hashes the canonical `{ before, after }` payload first, then the concatenated identity string that
 * includes that payload hash and the predecessor's. The input array is not mutated.
 *
 * Every field the draft supplies is carried over unchanged, and the sequence, the identifier and the
 * three hashes are this function's own: a value a caller happened to attach where one of them belongs
 * is replaced by the computed one.
 *
 * A malformed stored hash is a verification concern rather than an append one, so no input is rejected
 * here. A failure inside the platform's digest is left to propagate, because an event this module did
 * not hash is worse than a failed append.
 *
 * @param events The chain as it stands, in sequence order, or an empty array for the first event.
 * @param draft The event's content: its identity positions, its two payload sides and its trace.
 * @returns The complete event, with the sequence, the identifier and the three hashes filled in.
 */
export async function appendEvent(
  events: AuditEvent[],
  draft: AuditEventDraft,
): Promise<AuditEvent> {
  const predecessor = events.length === 0 ? undefined : events[events.length - 1];
  const previousHash = predecessor === undefined ? GENESIS_PREVIOUS_HASH : predecessor.eventHash;
  const sequence = predecessor === undefined ? FIRST_SEQUENCE : predecessor.sequence + 1;
  const payloadDigest = await payloadHash(draft.before ?? null, draft.after ?? null);

  // The draft's members first and the computed ones after, so a hash or an identity already attached
  // where one belongs is replaced by the value computed here rather than carried along.
  const linked = {
    ...draft,
    sequence,
    id: identifierFor(sequence),
    payloadHash: payloadDigest,
    previousHash,
  };
  const eventDigest = await eventHash(linked);

  return { ...linked, eventHash: eventDigest };
}
