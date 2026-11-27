/**
 * The demonstration's simulation layer: the triggers the single simulation popover drives, the
 * freshness report every result carries while a trigger is in effect, and the one edit the tamper
 * control makes to the seeded audit chain.
 *
 * Implements the "Simulation" row of AAP 0.12.1 — "`SimulationFlag` handling: loading, empty queue,
 * stale ERP, partial failure, offline, forbidden, conflicting update, tampered audit; each flag changes
 * service behaviour, never a component's branch" — at the path AAP 0.13.1 gives it. The triggers are
 * `SimulationFlag` in `src/types/service.ts`: the seven screen states of specification §8, plus the two
 * triggers that are not screen states, the edited audit event and the emptied exception queue.
 *
 * WHO READS WHAT, AND WHY NO COMPONENT SEES A FLAG. `src/services/mock/mock-state.ts` holds the set;
 * its reset empties it, the adapter's `setSimulation` member adds or removes one member, and the
 * adapter's handlers ask `isSimulationOn` before deciding what a read returns. A screen therefore meets
 * a trigger through the shape of the result it was handed — a refusal, an empty list, a stale freshness
 * entry — and never through a branch on the flag itself, which is what keeps one read producing the
 * same state whichever screen asks for it (AAP 0.12.1).
 *
 * THE TWO TRIGGERS THAT ACT ON THE CALL RATHER THAN ON ONE FAMILY'S RECORDS. Seven of the nine change
 * the shape of what a handler was about to return, and each handler asks `isSimulationOn` about the one
 * it handles: `forbidden` refuses the call, `empty-queue` empties the exception queue, `stale` and
 * `offline` report the sources that way, `partial` withholds a write-back step, `conflict` refuses an
 * update made against a record that changed, and `tampered-audit` edits one seeded event's recorded
 * result. The other two change what every read returns rather than one family's records, so the
 * adapter's dispatcher applies them once for every call it serves, from the two predicates below:
 *
 * - `loading` — `holdsReads` reports it, and a served call then never settles, so the screen that asked
 *   renders the pending state it renders for any call still in flight (AAP 0.2.1 F10, AAP 0.2.2). The
 *   demonstration controls are served anyway: a control that could not answer while the trigger is in
 *   effect could not lift it, which is the one thing rule P-8 will not have.
 * - `empty` — `emptiesLists` reports it, and every read whose payload is a collection answers with
 *   nothing to show, so a screen renders the generic empty state (AAP 0.12.1). It is distinct from
 *   `empty-queue`, which empties the exception queue alone and is a handler's own trigger: a filter
 *   that happens to match nothing must not be confusable with a control that emptied every list.
 *
 * WHY THE STALE TRIGGER NAMES ERP. ERP is the source whose state gates approval: `requestApproval` and
 * `decideApproval` refuse with a `Problem` naming the source and its as-of time when ERP is stale or
 * unavailable, and every screen offering those controls renders the banner and disables them with that
 * same reason (AAP 0.2.1, T-13). That source is named once, by `APPROVAL_GATE_SOURCE` in
 * `src/types/sources.ts`, so the source this trigger marks, the source the refusal quotes and the
 * source a banner prints are one value rather than three literals that agree until one of them moves.
 * The banner quotes the as-of instant this module reports, so that instant is the seed's own value:
 * recomputing it would name a time the records never recorded and would make the two halves of the
 * rule disagree (contracts §1 forbids reading the system clock for business logic).
 *
 * WHAT THIS MODULE DOES NOT DO. It owns no label: the simulation path is labelled `Simulated control`
 * by the popover that triggers it, from the one vocabulary `src/types/primitives.ts` holds, and no
 * label text is retyped here (rule P-1). It computes no hash, appends no event and verifies nothing —
 * `src/domain/audit/` owns all three — and the edit below leaves every hash field exactly as the chain
 * computed it, which is the point of the demonstration: a verification then reports the position that
 * edit touched and repairs nothing. It renders nothing, evaluates no permission and no policy, holds no
 * record of its own, performs no I/O, and opens no address of any kind (rule B-1). It reads no
 * configuration and carries no credential (rule B-2), states no amount, figure or record identifier
 * (rule P-6), and names no company, product or person (rule P-7).
 *
 * DETERMINISTIC BY CONSTRUCTION. No clock, no random source and no module-level mutable value is read.
 * A reported freshness is the seed's own instant, a trigger read is the set the caller holds, and the
 * one value the tamper control writes is a fixed member of `AuditResult`, so the same state always
 * yields the same report (AAP 0.18.2).
 *
 * Rules this module is built to satisfy:
 * - P-1: it types no label. The label lives on the control that triggers the behaviour.
 * - P-2: it imports the sibling `seed-loader.ts` rather than `src/seed/`, and reaches `src/types` for
 *   its types and for the one source constant `APPROVAL_GATE_SOURCE`, so it cannot become a second
 *   path to a record.
 * - P-4: the tamper path demonstrates a mechanism. The chain is labelled `Simulated control` wherever
 *   it surfaces, and a verification establishes nothing beyond the arithmetic it recomputes.
 * - P-6, P-7, B-1, B-2: no figure or identifier literal, synthetic naming only, no request, no
 *   configuration read.
 * - No test hook: nothing here reads a query parameter, a global flag or `window`. The trigger set on
 *   the state is the only input.
 */

import { APPROVAL_GATE_SOURCE } from '../../types';
import type {
  AuditResult,
  Freshness,
  FreshnessState,
  SimulationFlag,
  SourceId,
} from '../../types';
import type { MockState } from './mock-state';
import { TAMPER_TARGET_ID } from './seed-loader';

/* ---------------------------------------------------------------------------------------------
 * The one record value this module addresses — AAP 0.10
 * ------------------------------------------------------------------------------------------- */

/**
 * The result the tamper control records in place of the one the seeded event carries.
 *
 * The seeded event records a policy block, and the seed module's own note fixes this edit as the one
 * the control makes: that record's result changes, and nothing else about it does. Because the hash was
 * computed from the recorded result, the change is exactly what a verification then reports at the
 * event's own sequence — which is the mechanism the control exists to show, and the reason the value is
 * fixed rather than derived: a second call must leave the record in the same condition as the first.
 */
const TAMPERED_RESULT: AuditResult = 'allowed';

/* ---------------------------------------------------------------------------------------------
 * The trigger set — AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * Whether one trigger is in effect for the session.
 *
 * A plain read of the state's set, so a handler decides what a read returns from the same source of
 * truth the popover wrote to, and no second copy of the triggers exists anywhere. Nothing here
 * interprets the set: a handler asks about the member it handles.
 *
 * @param state - The session whose triggers are read. The state is not modified.
 * @param flag - The trigger to report on.
 * @returns `true` when the trigger is in effect, `false` otherwise.
 */
export function isSimulationOn(state: MockState, flag: SimulationFlag): boolean {
  return state.flags.has(flag);
}

/**
 * Whether every call the adapter serves is being held, which is the `loading` trigger in effect.
 *
 * The demonstration's way of showing a pending screen: while the trigger is in effect a served call
 * never settles, so a screen asking for a read renders the loading state it renders for any call still
 * in flight rather than an answer (AAP 0.2.1 F10, AAP 0.2.2). The state reaches the screen through the
 * result it was handed and never through a branch on the flag, which is why this is a property of a
 * read rather than a rendering decision.
 *
 * The demonstration controls are deliberately outside what is held: the popover has to be able to lift
 * the trigger it set, and a control that could not answer would leave the session pending with no way
 * out of it (rule P-8). The adapter's dispatcher decides which calls those are.
 *
 * @param state - The session whose triggers are read. The state is not modified.
 * @returns `true` while every served call is held, `false` otherwise.
 */
export function holdsReads(state: MockState): boolean {
  return isSimulationOn(state, 'loading');
}

/**
 * Whether every read whose payload is a collection answers with nothing, which is the `empty` trigger.
 *
 * The trigger empties every list the adapter serves — the exception queue, the approvals, the audit
 * trail, the ledger, the policies, the pins, the packages, the affected lines and the identifier hits —
 * so a screen renders the record set's generic empty state (AAP 0.12.1). It is not the `empty-queue`
 * trigger: that one empties the exception queue alone, from the exception family's own read, and
 * leaves every other collection as it stands.
 *
 * The read is otherwise served as usual, with its permission and policy checks run and a refused call
 * still refused, so an emptied list is an answer the caller was entitled to receive rather than a way
 * past the permission matrix. Which reads carry a collection is the adapter dispatcher's decision.
 *
 * @param state - The session whose triggers are read. The state is not modified.
 * @returns `true` while every collection read answers with nothing, `false` otherwise.
 */
export function emptiesLists(state: MockState): boolean {
  return isSimulationOn(state, 'empty');
}

/**
 * Turns one trigger on or off, and only that one.
 *
 * Whether two triggers may hold at once is the caller's business: this function neither interprets a
 * combination nor imposes an order, so the popover decides what turning one on means for another and
 * the state records exactly what it was told. Adding a member already present, or removing one that is
 * absent, leaves the set unchanged, so a repeated request is harmless.
 *
 * @param state - The session to change. Its trigger set is modified in place, so every handler holding
 *   the state sees the change without being handed anything.
 * @param flag - The trigger to set.
 * @param on - `true` to put the trigger in effect, `false` to lift it.
 */
export function setSimulationFlag(state: MockState, flag: SimulationFlag, on: boolean): void {
  if (on) {
    state.flags.add(flag);
    return;
  }

  state.flags.delete(flag);
}

/**
 * Lifts every trigger, returning the session to the demonstration's seeded behaviour.
 *
 * `restoreSeed` in `src/services/mock/mock-state.ts` clears the set as part of putting the records
 * back, and the popover's `Reset demo data` path is the other caller, so a session never keeps a
 * trigger across a reset. The set is emptied rather than replaced, so whoever holds it sees it empty.
 *
 * @param state - The session whose triggers are lifted. The set is modified in place.
 */
export function clearSimulationFlags(state: MockState): void {
  state.flags.clear();
}

/* ---------------------------------------------------------------------------------------------
 * The freshness report every result carries — AAP 0.2.1, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * Builds the freshness the metadata of every result carries, given the triggers in effect.
 *
 * With no trigger set the report is the seeded source health verbatim, which is what makes a healthy
 * session indistinguishable from the record set the demonstration ships. The stale trigger marks the
 * source that gates approval, keeping the instant the seed recorded; the offline trigger reports every
 * source as unavailable, because nothing answered. The offline trigger wins where both are set: a
 * session in which no source answered has no source whose answer is merely out of date.
 *
 * Every report is a fresh array of fresh records, so a caller cannot alter the session's records by
 * editing what it was handed, and the six entries keep the order the seed declares — the order the
 * shell's freshness strip renders them in.
 *
 * The triggers that change what a read returns rather than what the sources report are deliberately
 * absent here: the partial trigger describes a source that answered incompletely, which the records
 * carrying the missing inputs already state, so reporting a source as out of date for it would
 * contradict what the seed says the source did.
 *
 * @param state - The session whose triggers and seeded source health are read. The state is not
 *   modified.
 * @returns One `Freshness` record per seeded source, in the seeded order.
 */
export function freshnessFor(state: MockState): Freshness[] {
  const offline = isSimulationOn(state, 'offline');
  const approvalGateIsStale = isSimulationOn(state, 'stale');

  return state.records.sources.health.map((health) => ({
    source: health.source,
    asOf: health.asOf,
    state: reportedFreshness(health.source, health.state, offline, approvalGateIsStale),
  }));
}

/**
 * The state one source is reported in, once the triggers in effect are applied to what the seed says.
 *
 * Both seeded states are kept as they stand unless a trigger overrides them, so a source the seed
 * already records as stale or partial is reported that way whether or not a trigger is set.
 *
 * @param source - The source being reported.
 * @param seeded - The state the seeded catalogue records for it.
 * @param offline - Whether the offline trigger is in effect.
 * @param approvalGateIsStale - Whether the stale trigger is in effect.
 * @returns The state a pill, a banner and the approval refusal all quote.
 */
function reportedFreshness(
  source: SourceId,
  seeded: FreshnessState,
  offline: boolean,
  approvalGateIsStale: boolean,
): FreshnessState {
  if (offline) {
    return 'unavailable';
  }

  if (approvalGateIsStale && source === APPROVAL_GATE_SOURCE) {
    return 'stale';
  }

  return seeded;
}

/* ---------------------------------------------------------------------------------------------
 * The tamper control's one edit — AAP 0.8, AAP 0.10, rule P-4
 * ------------------------------------------------------------------------------------------- */

/**
 * Edits the recorded result of the one seeded event the tamper control addresses, leaving its hashes as
 * the chain computed them.
 *
 * The demonstration exists to show what a hash chain does with an edited record. This function changes
 * that event's result and nothing else: no hash is recomputed, no event is moved, added or dropped, and
 * nothing is repaired, so a verification of the chain afterwards reports that event's own position and
 * leaves the records as it found them. The chain is labelled `Simulated control` wherever it surfaces,
 * and a verification establishes nothing beyond the arithmetic it recomputes: it shows where a stored
 * hash and a recomputation disagree. It demonstrates the mechanism and makes no claim about a store
 * behind a browser page.
 *
 * The target is addressed by the identifier the seed publishes, never by a literal, so the control and
 * the record it edits cannot drift apart. A repeated call leaves the record in the same edited
 * condition and reports the same outcome as the first, which is what lets a reader trigger the control
 * twice without the second attempt undoing the first.
 *
 * @param state - The session whose chain is edited. The addressed event is modified in place; the
 *   array's order, length and every hash field are untouched.
 * @returns `true` when the addressed event was found — whether or not it needed changing — and `false`
 *   when the chain holds no such event, in which case nothing was written.
 */
export function tamperAuditEvent(state: MockState): boolean {
  const target = state.auditEvents.find((event) => event.id === TAMPER_TARGET_ID);

  if (target === undefined) {
    return false;
  }

  // Only the recorded result changes. Recomputing the hashes here would hide the very disagreement the
  // control exists to demonstrate.
  target.result = TAMPERED_RESULT;

  return true;
}
