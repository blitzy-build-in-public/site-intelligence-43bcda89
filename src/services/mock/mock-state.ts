/**
 * The demonstration's mutable state: the seeded record set the mock adapter edits, the hashed audit
 * chain it appends to, the persona it acts as, the simulation triggers in effect, and the
 * deterministic counter behind `Meta.traceId`.
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
 * DETERMINISTIC BY CONSTRUCTION. No clock, no random source and no module-level mutable value is read.
 * Every seeded timestamp arrives on its own draft; no random-number generator and no UUID source is
 * touched anywhere below; and the correlation counter is a plain integer, so the same sequence of
 * calls yields the same identifiers in every run (AAP 0.18.2). The only platform global the bootstrap
 * reaches is the Web Crypto inside `hash.ts`, through `chain.ts`, which is a function of its input
 * alone.
 *
 * ONE BOOTSTRAP PER STATE. `createMockState()` builds one independent state per call and hashes a
 * fresh clone each time. The adapter keeps the promise its first call returned and hands that same
 * promise to `whenReady()`, so a provider awaiting readiness never starts a second hash pass over the
 * same state; a second `createMockState()` call is a second state, which is what a test comparing a
 * fresh state against a reset one needs, and it never re-hashes the first.
 *
 * OPEN ITEM — which persona the demonstration opens as. The inputs fix each persona's home route
 * (specification §3, AAP 0.12.4) but not which of the eight is active on load, so the seed's own order
 * decides: the first record of `records.users` is the persona the session acts as, which is `USR-01`,
 * the material planner. No rule beyond that ordering is invented here, and a persona list that changes
 * order changes the opening persona with it rather than contradicting a rule stated in this file.
 *
 * A TRAP WORTH STATING — the test environment. This module hashes, so a suite that exercises it must
 * declare the Node environment on its own first line (`// @vitest-environment node`): under jsdom the
 * platform declines to hash jsdom's `ArrayBuffer` realm and every digest rejects. Component suites keep
 * the shared jsdom default and never reach this module, which is why the requirement stays with the
 * code that has it rather than with the shared configuration.
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
import type { ActiveUser, AuditEvent, AuditEventDraft, SimulationFlag, UserId } from '../../types';
import { loadSeed } from './seed-loader';
import type { SeedRecordSet } from './seed-loader';

/* ---------------------------------------------------------------------------------------------
 * The state the adapter holds — AAP 0.12.1, contracts §1
 * ------------------------------------------------------------------------------------------- */

/**
 * Everything the demonstration remembers between calls: the records, the audit chain, the acting
 * persona, the simulation triggers and the request counter.
 *
 * One of these is created by `createMockState()` and held by the mock adapter for the session's
 * lifetime. Every member is mutable because the session is meant to change: a handler edits the
 * records, appends an event, switches the persona, flips a trigger, and increments the counter, and
 * `restoreSeed` puts all five back to what a fresh state holds.
 */
export interface MockState {
  /**
   * The seeded records the demonstration reads and edits: one deep clone of the seed's record set,
   * taken by `loadSeed()` so the modules under `src/seed/` are never written to (contracts §1).
   *
   * Replaced wholesale by `restoreSeed` rather than reverted field by field, because a clone is the
   * only way to put back a record a handler removed.
   */
  records: SeedRecordSet;

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
   * How many calls the adapter has served, from which `Meta.traceId` is derived.
   *
   * A counter rather than a clock or a random source, so the trace identifier of the n-th call is the
   * same in every run of the demonstration (AAP 0.18.2). The counter starts at its initial value and
   * the adapter increments it; how the identifier is spelled from it is the adapter's own decision,
   * and the seeded trail already occupies the `TRC-000nnn` and `TRC-9nnnnn` blocks, so the block a
   * live call draws from is chosen where the identifier is formatted.
   */
  requestCount: number;
}

/**
 * What one handler receives: the session's state together with the persona the call acts as.
 *
 * The pair travels together so a handler can neither read a record without knowing who is reading it
 * nor resolve a different actor halfway through. The adapter builds it once per call from
 * `state.activeUserId`, resolving the persona against the contracts §7.1 matrix so `actor.permissions`
 * and `actor.plantIds` are the ones that role holds rather than a caller's claim; both members are
 * references, so a handler that edits `state` is editing the session the next call reads.
 */
export interface HandlerContext {
  /** The session's mutable state, by reference. */
  readonly state: MockState;

  /** The persona the call acts as, resolved from the state rather than supplied by a caller. */
  readonly actor: ActiveUser;
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

/* ---------------------------------------------------------------------------------------------
 * The seeded baseline both entry points install — AAP 0.2.1, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The three members a seeded session starts from, built together so that `createMockState` and
 * `restoreSeed` cannot drift into two different notions of a pristine state.
 *
 * Not exported: a caller receives the whole state from one of the two functions below, and no
 * consumer has a reason to hold the baseline on its own.
 */
interface SeededSession {
  /** A fresh clone of the seeded record set. */
  readonly records: SeedRecordSet;

  /** The chain hashed from that clone's audit drafts, in the seed's own order. */
  readonly auditEvents: AuditEvent[];

  /** The persona the session acts as, taken from the clone's user records. */
  readonly activeUserId: UserId;
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
function defaultPersonaId(records: SeedRecordSet): UserId {
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
 * Clones the seeded records, hashes their audit drafts and names the persona the session acts as.
 *
 * Every start and every reset passes through here, which is what makes the two indistinguishable: the
 * clone is fresh, the chain is rebuilt from it by the same sequential fold, and the persona is read
 * from that clone rather than from anything left over from the session being replaced.
 *
 * The hash pass is why both entry points are asynchronous, and it completes before the caller installs
 * anything (AAP 0.2.1).
 *
 * @returns The seeded records, the chain hashed from them, and the acting persona's identifier.
 */
async function buildSeededSession(): Promise<SeededSession> {
  const records = loadSeed();

  return {
    records,
    auditEvents: await hashSeededTrail(records.auditEvents),
    activeUserId: defaultPersonaId(records),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The two entry points — AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * Builds the session the adapter's `whenReady()` hands to the provider: one whose chain is already
 * hashed, so no screen ever renders against drafts that carry no hash.
 *
 * Each call builds an independent state from a fresh clone. The adapter keeps the promise of its first
 * call and starts no second bootstrap over the same state; a second call here is a second state, which
 * is what comparing a reset session against a fresh one needs and what keeps two sessions from sharing
 * a record array.
 *
 * @returns A freshly seeded state, its chain hashed, its triggers clear and its counter at its
 *   starting value.
 */
export async function createMockState(): Promise<MockState> {
  const session = await buildSeededSession();

  return {
    records: session.records,
    auditEvents: session.auditEvents,
    activeUserId: session.activeUserId,
    flags: new Set<SimulationFlag>(),
    requestCount: INITIAL_REQUEST_COUNT,
  };
}

/**
 * Puts a session back to the seeded baseline, in place, for `Reset demo data`.
 *
 * It mutates the state object it is given rather than returning a new one, so the adapter that holds
 * the reference — and every handler built from it — sees the reset without being handed anything. The
 * records and the chain are installed together once the hash pass resolves, so a reader never meets a
 * cloned record set beside the chain of the session being replaced. The trigger set is cleared rather
 * than swapped, so whoever holds it sees it emptied, and the counter returns to the value a fresh
 * session starts from so a reset session's identifiers restart with it.
 *
 * After this resolves, the state holds what `createMockState()` returns for a fresh session: the same
 * records, the same hashed chain, the same acting persona, no trigger and the same counter value.
 *
 * @param state The session to restore. It is modified in place.
 */
export async function restoreSeed(state: MockState): Promise<void> {
  const session = await buildSeededSession();

  state.records = session.records;
  state.auditEvents = session.auditEvents;
  state.activeUserId = session.activeUserId;
  state.flags.clear();
  state.requestCount = INITIAL_REQUEST_COUNT;
}

