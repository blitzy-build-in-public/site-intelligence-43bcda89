// @vitest-environment node

/**
 * Unit suite for the audit chain: the two hashes of `hash.ts`, the append path of `chain.ts` and the
 * read-only walk of `verify.ts`.
 *
 * `platform-contracts.md` §6 fixes the mechanism under test: `payloadHash` is the SHA-256 of the
 * canonical JSON of `{ before, after }`, `eventHash` is the SHA-256 of eleven concatenated
 * positions, an event carries its predecessor's `eventHash` as its own `previousHash`, and the first
 * event carries the genesis value. Every case asserts a structural property of that mechanism — a
 * length, an alphabet, an equality between two computations, the sequence a report names — and never
 * a digest copied from anywhere, so the suite measures the arithmetic instead of recording one run
 * of it (rule P-6).
 *
 * Two properties the demonstration rests on are proven here rather than assumed (AAP 0.2.1): an
 * append leaves the chain it was handed untouched and returns a new event, and the same drafts build
 * identical hashes in two separate runs, which is what makes the bootstrap of the seeded trail
 * reproduce itself on every start.
 *
 * The report speaks only for the mechanism. A verification recomputes hashes and names the positions
 * whose stored hashes disagree with the arithmetic; it repairs nothing, and the interface labels the
 * chain "Simulated control" wherever it surfaces (rule P-4). Nothing below repeats the check or
 * claims more than the recomputation shows.
 *
 * The Node environment is declared on line 1, the only position the runner reads it from, rather
 * than inherited from the shared jsdom default, because the chain hashes with
 * `globalThis.crypto.subtle` — a platform call, not a DOM one (AAP 0.3.1, 0.11.2). Stated on the
 * module, the requirement travels with the code that has it: jsdom 31 exposes no `crypto.subtle` of
 * its own, so the digest resolves to the platform's implementation and a hash failure below can only
 * be the chain's. Nothing else in the file needs a DOM.
 */

import { describe, expect, it } from 'vitest';

import type { AuditEvent, AuditEventDraft } from '../../types';
import { DEMO_CLOCK, GENESIS_PREVIOUS_HASH } from '../../types';
import { appendEvent } from './chain';
import { canonicalJson, payloadHash } from './hash';
import { verifyChain } from './verify';

/* ---------------------------------------------------------------------------------------------
 * Shapes and positions the cases name
 * ------------------------------------------------------------------------------------------- */

/** The shape of every digest this folder produces: 64 lowercase hex characters (contracts §6). */
const HASH_PATTERN = /^[0-9a-f]{64}$/;

/** The shape of the genesis predecessor: the 64 zeros contracts §6 fixes for the first event. */
const GENESIS_PATTERN = /^0{64}$/;

/** How long the plain chains below are: enough for a link before, at and after the middle event. */
const CHAIN_LENGTH = 3;

/**
 * The sequence the demonstration's editable record occupies, `AUD-000142` (AAP 0.12.4). The report a
 * verification returns names this position rather than a boolean, which is what the interface shows.
 */
const EDITED_SEQUENCE = 142;

/* ---------------------------------------------------------------------------------------------
 * Builders — a fresh chain per case, never a mutable array shared between cases
 * ------------------------------------------------------------------------------------------- */

/** The `TRC-nnnnnn` correlation identifier of the draft at a position, following the seed's form. */
function traceIdFor(sequence: number): string {
  return `TRC-${String(sequence).padStart(6, '0')}`;
}

/**
 * A draft for the event at a given position.
 *
 * The position is written into both payload sides, so each draft hashes differently from its
 * neighbours and two events can never be mistaken for one. The sequence number, the `AUD-nnnnnn`
 * identifier and the two hashes are absent by design: the chain derives them (see
 * `AuditEventDraft` in `src/types/audit.ts`).
 *
 * @param sequence The position the appended event will occupy in the chain.
 * @returns The draft content, with the demonstration clock as its instant.
 */
function draftFor(sequence: number): AuditEventDraft {
  return {
    timestamp: DEMO_CLOCK,
    actorType: 'user',
    actorId: 'USR-01',
    action: 'note',
    objectRef: 'EXC-2026-1184',
    result: 'succeeded',
    before: { position: sequence },
    after: { position: sequence, state: 'open' },
    traceId: traceIdFor(sequence),
  };
}

/**
 * Appends one event per position, 1 through the requested length, and hands the chain back.
 *
 * Each case calls this for its own chain, so no case can inherit a mutation from another.
 *
 * @param length How many events the chain holds.
 * @returns The chain, in sequence order.
 */
async function chainOf(length: number): Promise<AuditEvent[]> {
  const events: AuditEvent[] = [];
  for (let position = 1; position <= length; position += 1) {
    events.push(await appendEvent(events, draftFor(position)));
  }
  return events;
}

/**
 * The event at a sequence number, or a failure that names the missing position.
 *
 * Reading by `find` rather than by index keeps the suite honest under `noUncheckedIndexedAccess`: a
 * position the chain does not hold is reported as itself instead of surfacing as `undefined` in an
 * assertion about something else.
 *
 * @param events The chain to read.
 * @param sequence The sequence number to locate.
 * @returns The event carrying that sequence number.
 */
function eventAt(events: readonly AuditEvent[], sequence: number): AuditEvent {
  const event = events.find((candidate) => candidate.sequence === sequence);
  if (event === undefined) {
    throw new Error(`The chain holds no event at sequence ${sequence}.`);
  }
  return event;
}

/* ---------------------------------------------------------------------------------------------
 * Canonical JSON — contracts §6: keys sorted at every level, no whitespace, missing value as null
 * ------------------------------------------------------------------------------------------- */

describe('canonicalJson', () => {
  it('serialises the same members identically whatever order they were written in', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson({ a: 2, b: 1 })).toBe(canonicalJson({ b: 1, a: 2 }));
  });

  it('sorts the keys of a nested record too', () => {
    const written = canonicalJson({ outer: { b: 1, a: 2 } });
    const rewritten = canonicalJson({ outer: { a: 2, b: 1 } });

    expect(written).toBe(rewritten);
    expect(written).toBe('{"outer":{"a":2,"b":1}}');
  });

  it('emits no whitespace', () => {
    const text = canonicalJson({ after: { state: 'open', position: 2 }, before: null });

    expect(text).not.toMatch(/\s/);
  });

  it('writes a missing value as null', () => {
    expect(canonicalJson({ a: undefined })).toBe('{"a":null}');
  });
});

/* ---------------------------------------------------------------------------------------------
 * The payload hash — the SHA-256 of that canonical `{ before, after }`
 * ------------------------------------------------------------------------------------------- */

describe('payloadHash', () => {
  it('covers both payload sides and ignores the order their members were written in', async () => {
    const written = await payloadHash(
      { state: 'open', position: 2 },
      { state: 'resolved', position: 2 },
    );
    const rewritten = await payloadHash(
      { position: 2, state: 'open' },
      { position: 2, state: 'resolved' },
    );

    expect(written).toBe(rewritten);
    expect(written).toMatch(HASH_PATTERN);
  });

  it('changes when a payload value changes', async () => {
    const resolved = await payloadHash({ state: 'open' }, { state: 'resolved' });
    const dismissed = await payloadHash({ state: 'open' }, { state: 'dismissed' });

    expect(dismissed).not.toBe(resolved);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The append path — genesis, linkage, digest shape, identity and the two payload-free rules
 * ------------------------------------------------------------------------------------------- */

describe('appendEvent', () => {
  it('gives the first event of a chain the genesis predecessor hash', async () => {
    const events = await chainOf(1);

    expect(GENESIS_PREVIOUS_HASH).toHaveLength(64);
    expect(GENESIS_PREVIOUS_HASH).toMatch(GENESIS_PATTERN);
    expect(eventAt(events, 1).previousHash).toBe(GENESIS_PREVIOUS_HASH);
  });

  it('gives every event a 64-character lowercase hex payload hash and event hash', async () => {
    const events = await chainOf(CHAIN_LENGTH);

    expect(events).toHaveLength(CHAIN_LENGTH);
    for (const event of events) {
      expect(event.payloadHash, `payload hash of ${event.id}`).toMatch(HASH_PATTERN);
      expect(event.eventHash, `event hash of ${event.id}`).toMatch(HASH_PATTERN);
    }
  });

  it('links each event to the event before it', async () => {
    const events = await chainOf(CHAIN_LENGTH);

    expect(eventAt(events, 2).previousHash).toBe(eventAt(events, 1).eventHash);
    expect(eventAt(events, 3).previousHash).toBe(eventAt(events, 2).eventHash);
  });

  it('numbers the chain from one and names each event AUD-nnnnnn', async () => {
    const events = await chainOf(CHAIN_LENGTH);

    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(events.map((event) => event.id)).toEqual(['AUD-000001', 'AUD-000002', 'AUD-000003']);
  });

  it('treats an absent policy and an empty-string policy as the same hashed position', async () => {
    const absent = await appendEvent([], draftFor(1));
    const empty = await appendEvent([], { ...draftFor(1), policyId: '' });
    const declared = await appendEvent([], { ...draftFor(1), policyId: 'POL-007' });

    expect(empty.payloadHash).toBe(absent.payloadHash);
    expect(empty.eventHash).toBe(absent.eventHash);
    expect(declared.eventHash).not.toBe(absent.eventHash);
  });

  it('leaves the chain it was given untouched and returns a new event', async () => {
    const events = await chainOf(CHAIN_LENGTH);
    const snapshot = JSON.stringify(events);

    const appended = await appendEvent(events, draftFor(CHAIN_LENGTH + 1));

    expect(events).toHaveLength(CHAIN_LENGTH);
    expect(JSON.stringify(events)).toBe(snapshot);
    expect(appended.sequence).toBe(CHAIN_LENGTH + 1);
    expect(events.includes(appended)).toBe(false);
  });
});

/* ---------------------------------------------------------------------------------------------
 * Verification — the empty chain, a clean chain, an edited record and a changed link
 * ------------------------------------------------------------------------------------------- */

describe('verifyChain', () => {
  it('verifies a chain of no events with nothing checked and nothing reported', async () => {
    const report = await verifyChain([]);

    expect(report.eventsChecked).toBe(0);
    expect(report.breaks).toEqual([]);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('verifies a clean chain of three events with nothing reported', async () => {
    const events = await chainOf(CHAIN_LENGTH);

    const report = await verifyChain(events);

    expect(report.eventsChecked).toBe(CHAIN_LENGTH);
    expect(report.breaks).toEqual([]);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('reports the edited event at its own sequence and leaves the record unchanged', async () => {
    const events = await chainOf(EDITED_SEQUENCE);
    const recorded = eventAt(events, EDITED_SEQUENCE);

    // An edit to a stored value with the hashes left as they were: the shape the demonstration's
    // editable record takes. The copy goes into a new array, so the chain built above stays clean.
    const edited: AuditEvent = { ...recorded, result: 'blocked' };
    const presented = events.map((event) =>
      event.sequence === EDITED_SEQUENCE ? edited : event,
    );

    const report = await verifyChain(presented);

    expect(report.eventsChecked).toBe(EDITED_SEQUENCE);
    expect(report.breaks).toHaveLength(1);
    expect(report.breaks.map((entry) => entry.sequence)).toEqual([EDITED_SEQUENCE]);
    expect(report.breaks.map((entry) => entry.id)).toEqual(['AUD-000142']);

    // Nothing is repaired: the array handed in still holds the edited copy, hashes and all, and the
    // chain it was copied from is untouched.
    expect(eventAt(presented, EDITED_SEQUENCE)).toBe(edited);
    expect(edited.eventHash).toBe(recorded.eventHash);
    expect(eventAt(events, EDITED_SEQUENCE).result).toBe('succeeded');
  });

  it('reports a changed predecessor link at the sequence that carries it', async () => {
    const events = await chainOf(CHAIN_LENGTH);
    const relinked = events.map((event) =>
      event.sequence === 2 ? { ...event, previousHash: GENESIS_PREVIOUS_HASH } : event,
    );

    const report = await verifyChain(relinked);

    expect(report.eventsChecked).toBe(CHAIN_LENGTH);
    expect(report.breaks.map((entry) => entry.sequence)).toEqual([2]);
    expect(report.breaks.map((entry) => entry.id)).toEqual(['AUD-000002']);
  });
});

/* ---------------------------------------------------------------------------------------------
 * Determinism — the seeded trail must hash to the same values on every start (AAP 0.2.1)
 * ------------------------------------------------------------------------------------------- */

describe('determinism', () => {
  it('builds the same chain from the same drafts in two separate runs', async () => {
    const first = await chainOf(CHAIN_LENGTH);
    const second = await chainOf(CHAIN_LENGTH);

    expect(second.map((event) => event.payloadHash)).toEqual(
      first.map((event) => event.payloadHash),
    );
    expect(second.map((event) => event.eventHash)).toEqual(first.map((event) => event.eventHash));
    expect((await verifyChain(second)).breaks).toEqual((await verifyChain(first)).breaks);
    expect((await verifyChain(first)).eventsChecked).toBe(CHAIN_LENGTH);
  });
});
