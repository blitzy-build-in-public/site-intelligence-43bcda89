/**
 * Verification of the append-only audit chain: a read-only walk that recomputes every hash and
 * reports each position where the record and the arithmetic disagree.
 *
 * Implements `platform-contracts.md` §6 as AAP 0.8 and AAP 0.12.1 restate it. A verification
 * recomputes the payload hash and the event hash of every event in sequence, compares each
 * recomputation with the hash the record stores, compares each event's `previousHash` with its
 * predecessor's stored `eventHash`, and returns the positions that do not match. It writes nothing:
 * no event is re-hashed in place, no array is sorted, and no report carries a repaired copy, so the
 * caller's records read exactly as they did before the call.
 *
 * The report describes the mechanism and only the mechanism. It shows how a hash chain exposes an
 * edited record; it does not establish that a deployment's record is intact against a determined
 * party, and it repairs nothing. The interface labels the chain "Simulated control" wherever it
 * surfaces (rule P-4), and every statement here stops at what the arithmetic shows.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §6 for the two hashes and the linkage a verification recomputes.
 * - AAP 0.8 for the per-position report the simulation popover's edit relies on: the seeded event
 *   that edit touches is reported at its own sequence, and the interface shows the first position
 *   and the total.
 * - AAP 0.12.1 for the `verifyChain(events)` signature and the `ChainReport` members.
 *
 * Rules this module is built to satisfy:
 * - P-4: the wording above claims no property of the mechanism beyond recomputation, and no
 *   stronger claim appears in a comment, a name or a string below.
 * - P-6: the report carries numbers and never formatted text. Nothing is rounded, no locale is
 *   read, and the elapsed time is returned raw for the interface's own formatter to present.
 * - B-1: recomputation is local arithmetic over strings already in hand; no digest is fetched and
 *   no host is asked anything.
 * - B-2: nothing here reads configuration, and the genesis value is imported from `src/types`
 *   rather than written again.
 * - P-2: it imports `src/types` and the sibling `hash.ts` only, so it reaches no seed record, no
 *   service layer and no screen.
 * - P-7: no product, company or person is named anywhere below; the identifier pattern quoted is
 *   the synthetic `AUD-nnnnnn` of contracts §1.
 */

import type { AuditEvent, ChainBreak, ChainReport } from '../../types';
import { GENESIS_PREVIOUS_HASH } from '../../types';
import { eventHash, payloadHash } from './hash';

/**
 * Recomputes every hash of the chain in sequence and reports each position where it does not hold
 * together, per `platform-contracts.md` §6.
 *
 * For each event the payload hash is recomputed from the stored `before` and `after`, and the event
 * hash is recomputed from the event's own identity positions together with that recomputed payload
 * hash and the event's stored `previousHash`. An event is reported as a break when either
 * recomputation differs from the hash the record stores, or when its stored `previousHash` differs
 * from its predecessor's stored `eventHash` — at most one entry per event, so a single edited field
 * is one reported position rather than two.
 *
 * The report shows the mechanism and not production assurance: it demonstrates how a hash chain
 * exposes an edited record, does not establish that a deployment's record is intact against a
 * determined party, and leaves every record exactly as it arrived — it repairs nothing.
 *
 * `performance.now()` measures only how long the walk took. The value enters no hash, no comparison
 * and no break decision, and it is returned unrounded for the interface to present.
 *
 * The array order is the chain order, so the caller's array is never reordered.
 *
 * @param events The chain in sequence order, as the caller holds it. An empty array is a chain of
 *   no events, which verifies with nothing checked and nothing reported.
 * @returns The number of events recomputed, every break in the order encountered, and the elapsed
 *   time in milliseconds.
 */
export async function verifyChain(events: AuditEvent[]): Promise<ChainReport> {
  const startedAt = performance.now();
  const breaks: ChainBreak[] = [];

  // The first event has no predecessor, so the value it must carry is the genesis constant.
  let expectedPreviousHash: string = GENESIS_PREVIOUS_HASH;

  for (const event of events) {
    const recomputedPayloadHash = await payloadHash(event.before ?? null, event.after ?? null);

    // Only the eleven positions `eventHash` reads are passed, and both hashes it chains are the
    // ones this walk establishes: the payload hash recomputed above, and the stored `previousHash`.
    const recomputedEventHash = await eventHash({
      sequence: event.sequence,
      id: event.id,
      timestamp: event.timestamp,
      actorType: event.actorType,
      actorId: event.actorId,
      action: event.action,
      objectRef: event.objectRef,
      result: event.result,
      ...(event.policyId === undefined ? {} : { policyId: event.policyId }),
      payloadHash: recomputedPayloadHash,
      previousHash: event.previousHash,
    });

    const contentMatches = recomputedEventHash === event.eventHash;
    const linkMatches = event.previousHash === expectedPreviousHash;

    if (!contentMatches || !linkMatches) {
      breaks.push({ sequence: event.sequence, id: event.id });
    }

    // The next event is expected to link to the hash this record stores, not to the recomputation
    // above. That is what keeps one edited field to one reported position: the edited event's own
    // link and its successor's link are both still the values the chain recorded, so only the
    // edited event itself disagrees with the arithmetic.
    expectedPreviousHash = event.eventHash;
  }

  return {
    eventsChecked: events.length,
    breaks,
    durationMs: performance.now() - startedAt,
  };
}
