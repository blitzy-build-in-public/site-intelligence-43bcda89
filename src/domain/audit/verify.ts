/**
 * Verification of the append-only audit chain: a read-only walk that recomputes every hash and
 * reports each position where the record and the arithmetic disagree.
 *
 * Implements `platform-contracts.md` §6 as AAP 0.8, AAP 0.12.1 and AAP 0.12.2 restate it. A
 * verification walks the events in order and makes three checks of each: it recomputes the payload
 * hash and the event hash and compares every recomputation with the hash the record stores; it
 * compares the event's `previousHash` with its predecessor's stored `eventHash`, the first event's
 * being the genesis value; and it compares the event's `sequence` with the number the chain reaches
 * it at, which is one for the first event and one more than its predecessor's for every event after
 * it. It returns the positions at which any of the three disagrees. It writes nothing: no event is
 * re-hashed in place, no array is sorted, and no report carries a repaired copy, so the caller's
 * records read exactly as they did before the call.
 *
 * Because the third check reads the numbering the chain gave its events, the array handed in must
 * be the whole chain from its first event: a subsequence is not a chain, and a run that begins part
 * way through disagrees with the numbers its records already carry. A removal at the very end of a
 * chain leaves no record behind to disagree with the arithmetic, so the walk cannot distinguish
 * that from a chain that never held the event.
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
 * - AAP 0.12.2 for the sequence the chain numbers each event with — strictly increasing from one,
 *   one above its predecessor's — which is what the third check reads.
 *
 * Rules this module is built to satisfy:
 * - P-4: the wording above claims no property of the mechanism beyond the hash and numbering
 *   arithmetic it performs, and no stronger claim appears in a comment, a name or a string below.
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
 * The sequence number the chain's first event carries.
 *
 * `platform-contracts.md` §1 counts a chain from one, and `chain.ts` numbers every event it appends
 * one above its predecessor, so a whole chain advances by one per event from this number onwards.
 */
const FIRST_SEQUENCE = 1;

/**
 * Recomputes every hash of the chain in sequence and reports each position where it does not hold
 * together, per `platform-contracts.md` §6.
 *
 * For each event the payload hash is recomputed from the stored `before` and `after`, and the event
 * hash is recomputed from the event's own identity positions together with that recomputed payload
 * hash and the event's stored `previousHash`. An event is reported as a break when either
 * recomputation differs from the hash the record stores, when its stored `previousHash` differs
 * from its predecessor's stored `eventHash`, or when its stored `sequence` is not one more than its
 * predecessor's — the chain numbers its first event from one and gives every event after it the
 * number after its predecessor's. At most one entry per event, so a single edited field is one
 * reported position rather than two.
 *
 * An event removed from the middle is reported at the next surviving event, where the numbering
 * stops advancing one per event; the events beyond it are read against the numbers they carry and
 * disagree with nothing. A removal at the very end of a chain leaves no record behind to disagree
 * with the arithmetic, so the walk cannot distinguish that from a chain that never held the event.
 *
 * The report shows the mechanism and not production assurance: it demonstrates how a hash chain
 * exposes an edited record, does not establish that a deployment's record is intact against a
 * determined party, and leaves every record exactly as it arrived — it repairs nothing.
 *
 * `performance.now()` measures only how long the walk took. The value enters no hash, no comparison
 * and no break decision, and it is returned unrounded for the interface to present.
 *
 * The array order is the chain order, so the caller's array is never reordered, and it must be the
 * whole chain from its first event, since a subsequence is not a chain.
 *
 * @param events The chain in sequence order, as the caller holds it, from its first event. An empty
 *   array is a chain of no events, which verifies with nothing checked and nothing reported.
 * @returns The number of events recomputed, every break in the order encountered, and the elapsed
 *   time in milliseconds.
 */
export async function verifyChain(events: AuditEvent[]): Promise<ChainReport> {
  const startedAt = performance.now();
  const breaks: ChainBreak[] = [];

  // The first event has no predecessor, so the value it must carry is the genesis constant and the
  // number it must carry is the chain's first.
  let expectedPreviousHash: string = GENESIS_PREVIOUS_HASH;
  let expectedSequence: number = FIRST_SEQUENCE;

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

    // A record whose sequence was renamed and re-hashed recomputes cleanly, because the event hash
    // covers whatever sequence it was handed; the numbering is what this comparison adds to the two
    // hash checks.
    const sequenceMatches = event.sequence === expectedSequence;

    if (!contentMatches || !linkMatches || !sequenceMatches) {
      breaks.push({ sequence: event.sequence, id: event.id });
    }

    // The next event is expected to link to the hash this record stores, not to the recomputation
    // above. That is what keeps one edited field to one reported position: the edited event's own
    // link and its successor's link are both still the values the chain recorded, so only the
    // edited event itself disagrees with the arithmetic.
    expectedPreviousHash = event.eventHash;

    // The numbering continues from the number this record carries, so an event removed from the
    // middle is reported where the run breaks and not again at every event after it: once the
    // surviving event's number is taken up, the events beyond it still count one per event.
    expectedSequence = event.sequence + 1;
  }

  return {
    eventsChecked: events.length,
    breaks,
    durationMs: performance.now() - startedAt,
  };
}
