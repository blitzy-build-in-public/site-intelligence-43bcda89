/**
 * The demonstration's mutable state: the seeded record set the mock adapter edits, the hashed audit
 * chain it appends to, the persona it acts as, the simulation triggers in effect, the time-boxed
 * policy exceptions the session has requested, the queue that serialises its audited writes, and the
 * ticket and session nonce behind `Meta.traceId`.
 *
 * Implements the "Mock state" row of AAP 0.12.1 — "Seeded mutable state, the async bootstrap that
 * hashes the 200 seeded events, the simulation flags, and the reset that restores the seed" — at the
 * path AAP 0.13.1 gives it, together with the timing requirement AAP 0.2.1 adds: the seeded trail is
 * hashed through the platform's own Web Crypto before the first screen renders, and the provider's
 * loading state covers that pass. contracts §1 fixes what the state is — in memory only, restored by
 * `Reset demo data`, with the theme and the density the only values anything persists.
 *
 * WHY THE RECORDS ARRIVE CLONED, AND WHY A RESET RE-CLONES THEM. `loadSeed()` hands back a fresh deep
 * copy of the seeded record set on every call, and it is the one door to `src/seed/` (rule P-2), so
 * the records reach this module through a single named function and nowhere else. The adapter then
 * edits that copy: an exception is dismissed, a note is added, an approval is decided. The seed
 * modules themselves are never written to, which is what makes a reset trivial — cloning again puts
 * every record back — and what makes a state built by `restoreSeed` hold the same values as one built
 * by `createMockState`, the property the adapter's own suite asserts.
 *
 * WHY THE HASH FOLD IS SEQUENTIAL. contracts §6 links an event to its predecessor by carrying that
 * event's `eventHash` as its own `previousHash`, so position n cannot be hashed before position n−1
 * is. A `Promise.all` over the drafts would hand the same incomplete chain to several appends, and the
 * trail would link to the wrong predecessor or to none, which a verification then reports as breaks
 * the demonstration does not have. The fold below is therefore one `await` per draft, in the order the
 * seed records them: `src/seed/audit-events.ts` fixes that order by instant and checks the position of
 * the event the simulation's tamper control edits, so the order walked here is the order the trail
 * declares.
 *
 * WHY THE SESSION'S AUDITED WRITES QUEUE BEHIND ONE ANOTHER. The fold above serialises the bootstrap,
 * and a live write needs the same treatment for the same reason. An append reads the chain's length
 * and its predecessor, then awaits two digests before pushing the event it derived, so two audited
 * writes issued together — which the adapter's own latency band makes overlap — would derive the same
 * sequence from the same predecessor and fork the chain, which contracts §6's strictly increasing
 * sequence and predecessor link forbid (AAP 0.12.2). `runExclusive` below is that queue: one section
 * at a time per state, in the order the writes arrived.
 *
 * WHAT THIS MODULE DOES NOT DO. It computes no hash — `appendEvent` in `src/domain/audit/chain.ts`
 * owns the two digests, the sequence number and the identifier, and this module only decides the order
 * the fold runs in. It verifies nothing: that read-only walk is `src/domain/audit/verify.ts`. It
 * evaluates no permission and no policy, renders nothing, signs nothing in and performs no I/O. It
 * reads no configuration and carries no credential (rule B-2), and it opens no address of any kind
 * (rule B-1). It states no figure and no identifier of its own (rule P-6) and names no company, product
 * or person (rule P-7); the identifiers its comments quote are the synthetic `USR-nn`, `AUD-nnnnnn`
 * and `TRC-nnnnnn` patterns the contracts and the seed records fix.
 *
 * THE CHAIN THIS MODULE BUILDS SHOWS A MECHANISM AND NOTHING MORE. A hashed trail demonstrates how a
 * chain exposes an edited record: the simulation's tamper control changes a recorded result without
 * recomputing its hash, and a verification reports the position of that break. It establishes nothing
 * about a record being intact against a determined party, it prevents neither editing nor copying, and
 * a verification repairs nothing. The interface applies the fixed control label of specification §5.3
 * to the chain wherever it surfaces, from the one vocabulary `src/types/primitives.ts` owns (rules P-1
 * and P-4), and no sentence below claims more than the recomputation shows.
 *
 * DETERMINISTIC WHERE IT MATTERS, AND UNIQUE WHERE IT HAS TO BE. No clock and no module-level mutable
 * value is read, every seeded timestamp arrives on its own draft, and the request counter is a plain
 * integer, so a session's n-th call takes the n-th ticket and the ladder's n-th delay in every run
 * (AAP 0.18.2). The one random draw below is the session nonce, taken once when a session is built and
 * once more when it is reset, from the platform's own `crypto.getRandomValues`: it reaches the
 * diagnostic identifier and nothing else, so no record value, no business figure and no delay depends
 * on it, while the identifier a user quotes resolves to one session's one call instead of to whichever
 * session happened to reach that call ordinal (AAP 0.18.1). The other platform global the bootstrap
 * reaches is the Web Crypto inside `hash.ts`, through `chain.ts`, which is a function of its input
 * alone.
 *
 * ONE BOOTSTRAP PER STATE. `createMockState()` builds one independent state per call and hashes a
 * fresh clone each time. The adapter keeps the promise its first call returned and hands that same
 * promise to `whenReady()`, so a provider awaiting readiness never starts a second hash pass over the
 * same state; a second `createMockState()` call is a second state, which is what a test comparing a
 * fresh state against a reset one needs, and it never re-hashes the first.
 *
 * WHICH PERSONA THE DEMONSTRATION OPENS AS. The inputs fix each persona's home route
 * (specification §3, AAP 0.12.4) but not which of the eight is active on load, so the seed's own order
 * decides: the first record of `records.users` is the persona the session acts as, which is `USR-01`,
 * the material planner. No rule beyond that ordering is invented here, and a persona list that changes
 * order changes the opening persona with it rather than contradicting a rule stated in this file.
 *
 * A TRAP WORTH STATING — the test environment. This module hashes, so a suite that exercises it must
 * declare the Node environment on its own first line (`// @vitest-environment node`). Not because the
 * jsdom default would fail the call: under it `globalThis.crypto` and `window.crypto` are already the
 * platform's Web Crypto — the object `node:crypto.webcrypto` exports, over the realm's own
 * `Uint8Array` — so jsdom contributes no `SubtleCrypto` and the digest resolves. Hashing is a platform
 * call rather than a DOM one, so the declaration states the environment the suite means to use.
 * Component suites keep the shared jsdom default and never reach this module, which is why the
 * requirement stays with the code that has it rather than with the shared configuration.
 *
 * Rules this module is built to satisfy:
 * - P-2: it imports the sibling `seed-loader.ts` and the domain chain module, both of which are the
 *   sanctioned doors to seed data and to the hash, and `src/types` for types only. It never imports
 *   `src/seed/`, so it cannot become a second path to a record.
 * - P-6: it carries no figure, no currency amount, no identifier and no expected result. The trail's
 *   length and the tamper target are the seed module's own constants, asserted where the trail is
 *   declared, so nothing here restates them and nothing imports `tests/fixtures/`.
 * - P-1: it holds no simulation label. The seven exact strings live in `src/types/primitives.ts` and
 *   are applied where an element surfaces, never in the state behind it.
 * - P-4: the mechanism paragraph above is the module's whole claim about the chain.
 * - P-7: the wording is Site Intelligence's own, and the identifiers quoted are the synthetic patterns
 *   of contracts §1 rather than a real company, customer or model name.
 * - B-1, B-2: no request leaves for any host, and nothing here reads configuration or a credential.
 */

import { appendEvent } from '../../domain/audit/chain';
import type {
  ActiveUser,
  AuditEvent,
  AuditEventDraft,
  PolicyException,
  SimulationFlag,
  UserId,
} from '../../types';
import { loadSeed } from './seed-loader';
import type { MockRecordSet } from './seed-loader';

/* ---------------------------------------------------------------------------------------------
 * The state the adapter holds — AAP 0.12.1, contracts §1
 * ------------------------------------------------------------------------------------------- */

/**
 * Everything the demonstration remembers between calls: the records, the audit chain, the acting
 * persona, the simulation triggers, the pending policy exceptions, the write queue, the request counter
 * and the session nonce.
 *
 * One of these is created by `createMockState()` and held by the mock adapter for the session's
 * lifetime. Every member is mutable because the session is meant to change: a handler edits the
 * records, appends an event, switches the persona, flips a trigger, records a pending policy
 * exception, and increments the counter, and `restoreSeed` puts back what a fresh state holds — every
 * member that carries a record, a counter or a nonce, and never the write queue, which holds none of
 * them.
 */
export interface MockState {
  /**
   * The seeded records the demonstration reads and edits: one deep clone of the seed's record set,
   * taken by `loadSeed()` so the modules under `src/seed/` are never written to (contracts §1). The
   * set carries the option positions of the case measured at call time beside the seed's own
   * aggregate, so a handler reads them from the session like every other record.
   *
   * Replaced wholesale by `restoreSeed` rather than reverted field by field, because a clone is the
   * only way to put back a record a handler removed.
   */
  records: MockRecordSet;

  /**
   * The audit chain, in sequence order: the seeded trail hashed at bootstrap, followed by the events
   * the adapter's audited writes append through `src/domain/audit/chain.ts`.
   *
   * The seeded drafts carry no hashes; this state is where they first become a chain, which is why
   * the adapter's readiness promise resolves only once the fold below has finished. Every event after
   * that is appended by a handler, never by this module.
   */
  auditEvents: AuditEvent[];

  /**
   * The tail of the session's critical sections: the audited writes that must not overlap.
   *
   * A promise chain rather than a record, and it lives here rather than in module scope so that two
   * sessions never wait on each other (AAP 0.18.2). An append passes its work through `runExclusive`
   * below, which chains it behind the section already in flight; the sequence it derives, the
   * predecessor it links to and the two digests it awaits are then all read from one chain state.
   *
   * `restoreSeed` deliberately leaves it alone: it holds no seeded value, and a section already in
   * flight has to be able to release the queue it took, so a reset never strands a waiting write.
   */
  writeQueue: Promise<void>;

  /**
   * The persona the session acts as, as an identifier from `records.users`.
   *
   * The role switch changes it, and every read and write resolves its actor from it, so the permission
   * matrix is evaluated against the persona the demonstration claims to be rather than against
   * anything a caller passes in. The role switcher is a demonstration control, and the browser-side
   * checks behind it are not production authorisation (rule P-3); the statement belongs on the control
   * and in the README, not here.
   */
  activeUserId: UserId;

  /**
   * The simulation triggers currently in effect, empty in a freshly seeded session.
   *
   * Product state, not a test hook: an empty set is the demonstration behaving as the record set
   * describes, and a member changes what a read returns rather than which branch a component takes
   * (`src/services/mock/simulation.ts` reads it). It is reachable only through the port's
   * `setSimulation` and is cleared by the reset, so a session cannot start with a trigger on.
   */
  flags: Set<SimulationFlag>;

  /**
   * The time-boxed policy exceptions the session has requested, in the order they were requested.
   *
   * A request is a record of the session rather than of the seeded record set: nothing in the
   * demonstration grants or decides one, so it enters here as `status: 'pending'` and leaves only
   * when the reset empties it. It is held beside the records rather than inside them because
   * `src/seed/` publishes a fixed record set and a reset must restore that set exactly.
   *
   * The governance family reads and appends this array; nothing else writes it. No policy verdict
   * consults it, which is what keeps a pending request from acting as a permission: the policy
   * engine evaluates the policy records and the acting persona, and a request that awaited a second
   * approver changes neither.
   */
  policyExceptions: PolicyException[];

  /**
   * The segment that distinguishes this session's identifiers from any other session's.
   *
   * Eight hexadecimal digits drawn once, from the platform's own `crypto.getRandomValues`, when the
   * session is built and once more when `restoreSeed` puts it back — a reset restarts the request
   * counter, so without a fresh draw the first call after a reset would repeat the identifier of the
   * first call before it. The counter alone cannot do this job: it starts at the same value in every
   * session, so two sessions that reach the same call ordinal mint the same identifier and a trace a
   * user quotes names two different calls (AAP 0.18.1). Nothing but the diagnostic identifier reads
   * it: it reaches no record value, no business figure and not the latency ladder, which stay functions
   * of the ticket (AAP 0.18.2).
   */
  sessionNonce: string;

  /**
   * The number of the last ticket the adapter took, from which the next call's `Meta.traceId` is spelled.
   *
   * A counter rather than a clock or a random source, so the n-th call of a session takes the ladder's
   * n-th delay in every run and nothing about a call depends on when it ran (AAP 0.18.2). The adapter
   * takes a call's ticket here once, at the call's entry and before it awaits anything, and a call's
   * identifier is spelled from that number and never from this member again — the counter moves under a
   * call that is in flight, so a second read of it would let a neighbouring call's ticket reach a
   * result, a refusal or an event. The ticket alone does not identify a call across sessions, because
   * every session starts this counter at the same value: `sessionNonce` above is the segment that makes
   * the identifier a user quotes resolve to one session's one call. How the identifier is spelled from
   * the two is the adapter's own decision, and the seeded trail already occupies the `TRC-nnnnnn` and
   * `TRC-9nnnnn` blocks, so the form a live call draws from is chosen where the identifier is
   * formatted.
   */
  requestCount: number;
}

/**
 * What one handler receives: the session's state, the persona the call acts as and the call's own
 * correlation identifier.
 *
 * The three travel together so a handler can neither read a record without knowing who is reading it
 * nor resolve a different actor halfway through, and so every refusal and every event of one call
 * quotes one identifier. The adapter builds the context once per call from `state.activeUserId` and
 * from the ticket it takes at the call's entry, resolving the persona against the contracts §7.1 matrix
 * so `actor.permissions` and `actor.plantIds` are the ones that role holds rather than a caller's
 * claim. `state` and `actor` are references, so a handler that edits `state` is editing the session the
 * next call reads; `traceId` is the call's own value and nothing can change it.
 */
export interface HandlerContext {
  /** The session's mutable state, by reference. */
  readonly state: MockState;

  /** The persona the call acts as, resolved from the state rather than supplied by a caller. */
  readonly actor: ActiveUser;

  /**
   * The call's correlation identifier, minted once by the adapter from the session's nonce and the
   * ticket it took at entry.
   *
   * Every refusal this call raises and every event it appends quotes this value rather than reading the
   * session's counter again, because that counter is advanced by whichever call entered next and a
   * second read would stamp one call's record with another call's identifier. The nonce is what makes
   * the value this call's alone rather than this call ordinal's: the counter restarts with every
   * session, and the nonce does not (AAP 0.18.1).
   */
  readonly traceId: string;
}

/* ---------------------------------------------------------------------------------------------
 * The one value a fresh session starts from
 * ------------------------------------------------------------------------------------------- */

/**
 * The request counter's value in a freshly seeded session.
 *
 * The first call the adapter serves after a start or a reset takes this value, so a session's
 * identifiers depend on how many calls it has made and on nothing else. It is a starting value rather
 * than a record: no figure, amount or identifier of the demonstration is stated by it (rule P-6).
 */
const INITIAL_REQUEST_COUNT = 0;

/**
 * How many random bytes the session nonce carries, and the width one byte is written in.
 *
 * Four bytes are eight hexadecimal digits: wide enough that two sessions drawing one collide with a
 * probability below one in four billion, and short enough that a quoted identifier still reads as three
 * segments rather than a paragraph.
 */
const SESSION_NONCE_BYTES = 4;
const HEX_DIGITS_PER_BYTE = 2;
const HEX_RADIX = 16;

/**
 * Mints the segment that tells one session's identifiers apart from another session's.
 *
 * The platform's own `globalThis.crypto` is the one random source this demonstration touches, and it is
 * asked once per session rather than once per call: a draw per call would be a second identifier nothing
 * quotes, and a value read from a clock would repeat under a reset. The bytes are written as lowercase
 * hexadecimal, so the segment has a fixed width and cannot be read as the ticket beside it, and a live
 * identifier keeps the `TRC-<day>-<nonce>-<ticket>` form the seeded `TRC-nnnnnn` and `TRC-9nnnnn`
 * records do not have (AAP 0.18.1).
 *
 * @returns Eight lowercase hexadecimal digits.
 */
function mintSessionNonce(): string {
  const bytes = new Uint8Array(SESSION_NONCE_BYTES);

  globalThis.crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) =>
    byte.toString(HEX_RADIX).padStart(HEX_DIGITS_PER_BYTE, '0'),
  ).join('');
}

/* ---------------------------------------------------------------------------------------------
 * The seeded baseline both entry points install — AAP 0.2.1, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The four members a seeded session starts from, built together so that `createMockState` and
 * `restoreSeed` cannot drift into two different notions of a pristine state.
 *
 * Not exported: a caller receives the whole state from one of the two functions below, and no
 * consumer has a reason to hold the baseline on its own.
 */
interface SeededSession {
  /** A fresh clone of the seeded record set. */
  readonly records: MockRecordSet;

  /** The chain hashed from that clone's audit drafts, in the seed's own order. */
  readonly auditEvents: AuditEvent[];

  /** The persona the session acts as, taken from the clone's user records. */
  readonly activeUserId: UserId;

  /** The nonce the session's identifiers carry, drawn fresh for this session alone. */
  readonly sessionNonce: string;
}

/**
 * Folds the seeded audit drafts into a chain, one append at a time.
 *
 * `appendEvent` reads the chain it is handed to find its predecessor, so the fold grows the array as
 * it goes and awaits each append before starting the next — the ordering the module comment sets out,
 * and the reason a parallel map would produce a trail whose links disagree with its own contents.
 *
 * The drafts are read from the clone the caller is about to install, so the chain and the records
 * describe one dataset.
 *
 * @param drafts The seeded drafts, in sequence order.
 * @returns The complete chain: one hashed event per draft, linked to the event before it.
 */
async function hashSeededTrail(drafts: readonly AuditEventDraft[]): Promise<AuditEvent[]> {
  const events: AuditEvent[] = [];

  for (const draft of drafts) {
    // Sequential on purpose: this append reads the hash of the event the pass before it pushed, so a
    // parallel fold would link several drafts to one predecessor.
    const event = await appendEvent(events, draft);
    events.push(event);
  }

  return events;
}

/**
 * The persona a freshly seeded session acts as: the first record of the clone's user set.
 *
 * The module comment records why the seed's own order decides this. The guard states the documented
 * invariant that `noUncheckedIndexedAccess` makes explicit: a record set with no persona would leave
 * the session with nobody to act as, and every permission check would then be evaluated against an
 * identity that does not exist, so the bootstrap fails loudly instead of starting a session that
 * cannot answer a single call.
 *
 * @param records The clone a session is about to be built from.
 * @returns The identifier of the persona the session acts as.
 * @throws Error - The record set holds no persona at all.
 */
function defaultPersonaId(records: MockRecordSet): UserId {
  const [persona] = records.users;

  if (persona === undefined) {
    throw new Error(
      'The seeded record set holds no persona, so the demonstration has nobody to act as. ' +
        'src/seed/users.ts must publish at least one user record.',
    );
  }

  return persona.id;
}

/**
 * Clones the seeded records, hashes their audit drafts, names the persona the session acts as and mints
 * the session's nonce.
 *
 * Every start and every reset passes through here, which is what makes the records and the chain of the
 * two indistinguishable: the clone is fresh, the chain is rebuilt from it by the same sequential fold,
 * and the persona is read from that clone rather than from anything left over from the session being
 * replaced. The nonce is the one value drawn anew each time, and it has to be: a reset restarts the
 * request counter, so a session that kept the nonce of the session it replaced would mint identifiers it
 * had already minted (AAP 0.18.1).
 *
 * The hash pass is why both entry points are asynchronous, and it completes before the caller installs
 * anything (AAP 0.2.1).
 *
 * @returns The seeded records, the chain hashed from them, the acting persona's identifier, and the
 *   nonce this session's identifiers carry.
 */
async function buildSeededSession(): Promise<SeededSession> {
  const records = loadSeed();

  return {
    records,
    auditEvents: await hashSeededTrail(records.auditEvents),
    activeUserId: defaultPersonaId(records),
    sessionNonce: mintSessionNonce(),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The two entry points — AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * Builds the session the adapter's `whenReady()` hands to the provider: one whose chain is already
 * hashed, so no screen ever renders against drafts that carry no hash.
 *
 * Each call builds an independent state from a fresh clone and draws its own nonce, which is what keeps
 * two sessions from sharing a record array or minting one identifier. The adapter keeps the promise of
 * its first call and starts no second bootstrap over the same state; a second call here is a second
 * state, which is what comparing a reset session against a fresh one needs.
 *
 * @returns A freshly seeded state, its chain hashed, its triggers clear, its write queue empty, its
 *   counter at its starting value and its nonce its own.
 */
export async function createMockState(): Promise<MockState> {
  const session = await buildSeededSession();

  return {
    records: session.records,
    auditEvents: session.auditEvents,
    // An already-resolved promise, so the first section through the queue waits for nothing.
    writeQueue: Promise.resolve(),
    activeUserId: session.activeUserId,
    flags: new Set<SimulationFlag>(),
    policyExceptions: [],
    sessionNonce: session.sessionNonce,
    requestCount: INITIAL_REQUEST_COUNT,
  };
}

/**
 * Puts a session back to the seeded baseline, in place, for `Reset demo data`.
 *
 * It mutates the state object it is given rather than returning a new one, so the adapter that holds
 * the reference — and every handler built from it — sees the reset without being handed anything. The
 * records and the chain are installed together once the hash pass resolves, so a reader never meets a
 * cloned record set beside the chain of the session being replaced. The trigger set and the pending
 * policy exceptions are cleared rather than swapped, so whoever holds either sees it emptied. The
 * counter returns to the value a fresh session starts from, and the nonce is redrawn with it, because
 * the counter restarting is exactly what would make a kept nonce mint the identifiers the session had
 * already printed — one call, quoted twice, for two different calls (AAP 0.18.1).
 *
 * After this resolves, the state holds what `createMockState()` returns for a fresh session: the same
 * records, the same hashed chain, the same acting persona, no trigger, no pending policy exception and
 * the same counter value. The nonce is the one member that differs, and it must: it is what keeps a
 * reset session's identifiers from repeating the ones it minted before the reset.
 *
 * The write queue is the one member left as it stands. It holds no seeded value to put back, and a
 * section already in flight on the chain being replaced still has to be able to release it, so
 * swapping the queue here would leave that section — and every append waiting behind it — waiting on
 * a release that never comes. The queue is instead how the reset is serialised: the adapter calls this
 * function inside a section of it (`MockBackend.resetDemo`), so the chain installed here and the chain
 * an append hashes are never two different arrays, and a verification of the chain a reader meets
 * afterwards reports no break the reset caused.
 *
 * @param state The session to restore. It is modified in place.
 */
export async function restoreSeed(state: MockState): Promise<void> {
  const session = await buildSeededSession();

  state.records = session.records;
  state.auditEvents = session.auditEvents;
  state.activeUserId = session.activeUserId;
  state.flags.clear();
  state.policyExceptions.length = 0;
  state.sessionNonce = session.sessionNonce;
  state.requestCount = INITIAL_REQUEST_COUNT;
}

/* ---------------------------------------------------------------------------------------------
 * The session's write queue — AAP 0.12.2, AAP 0.18.2
 * ------------------------------------------------------------------------------------------- */

/**
 * Runs one critical section of the session's work: after every section already waiting, and before
 * any section that arrives while it runs.
 *
 * contracts §6 fixes a strictly increasing sequence and a predecessor link for the chain, and an
 * append derives both from the chain as it stands. Two appends that interleaved would therefore
 * derive the same sequence from the same predecessor and fork the chain, which AAP 0.12.2's invariant
 * forbids — and the adapter's latency band makes audited writes overlap by design, so the overlap is
 * the session's normal behaviour rather than an edge case. The append path queues its work here
 * instead: `state.writeQueue` is the tail of the session's sections, this function chains the caller's
 * section behind it, and the section runs when everything in front of it has settled. The role switch
 * queues here for the other half of the same reason: its event records the identity it installs, so the
 * read of the identity before it, the mutation and the append are one section or the trail can state a
 * transition that never happened.
 *
 * Three properties a queue on the state has to hold, and how they are met:
 * - First in, first out. The new tail is installed synchronously, before this section waits on the old
 *   one, so a caller arriving a moment later chains behind it rather than beside it and the sections
 *   run in the order they were submitted. That order is what keeps the appends' instants increasing
 *   with their sequences.
 * - It never rejects on its own account. The promise installed here only ever resolves, so no section
 *   fails because another one failed, and the release below runs whether the section's work resolved
 *   or threw — a section that threw still hands the queue on.
 * - A section never takes another section. This is a plain promise chain rather than a re-entrant
 *   lock: a section that awaited a function which itself called `runExclusive` would wait on a release
 *   only it could give, and the session would hang. Two sections exist today: the one
 *   `appendAuditEvent` holds around an audited write's append, and the one `MockBackend.switchRole`
 *   holds around the whole switch, its identity mutation included, so that the `before` its event
 *   records is the identity the section before it left. Neither awaits anything that takes a section —
 *   which is why the switch appends through `appendAuditEventInSection`, the sibling `appendAuditEvent`
 *   calls inside its own section, rather than through `appendAuditEvent` itself.
 *
 * The queue is a member of the state it is handed and this function reads no clock, no random source
 * and no module-level value, so two sessions never wait on each other (AAP 0.18.2).
 *
 * @param state The session whose sections are serialised. Its queue is advanced to this section.
 * @param work The section itself, run once every earlier section has settled.
 * @returns Whatever the section returned.
 * @throws Whatever the section threw, once the queue behind it has been released.
 */
export async function runExclusive<T>(
  state: MockState,
  work: () => Promise<T> | T,
): Promise<T> {
  const previous = state.writeQueue;
  // Replaced synchronously by the promise executor below, which is why the placeholder is never the
  // release a section actually calls.
  let release: () => void = () => {};

  state.writeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  try {
    await previous;

    return await work();
  } finally {
    release();
  }
}

