/**
 * The query cache's write-reads map: which reads each audited write moves, and the channel that tells
 * whatever holds the cache that a write resolved.
 *
 * WHY THIS MAP EXISTS, AND WHY IT LIVES IN `src/services`. Every write the port carries appends an audit
 * event and changes at least one record, so each one moves reads other than the one its own screen
 * happened to be looking at: an assignment moves the overview's tiles and the canvas ribbon as well as
 * the queue row, and every write moves the trail. AAP 0.6.2 states the obligation — "every write ...
 * appends an audit event and invalidates the queries it affects" — and leaves the list itself only to
 * the code that knows the handlers. Held inside a screen, that list can name no more than the reads
 * that screen subscribes to, which is how the map came to be incomplete in four separate screens at
 * once; held here, it is written once and read by every write site.
 *
 * It belongs to the service layer because the port is the only shared vocabulary a screen and an adapter
 * have (rule P-2), and because the channel below has to outlive the component that started a write: a
 * write whose screen unmounts mid-flight still moved the records, and the cache must hear about it from
 * something the navigation cannot remove. `src/services/create-service.ts` binds the adapter through
 * {@link withWriteReporting}, so the report is issued by the boundary every write already crosses, and a
 * screen that also invalidates its own reads keeps doing so — the two paths agree because they read one
 * table.
 *
 * WHAT EACH ROW NAMES. A row lists the port members whose cached answers a write changes, keyed by the
 * port member that performs it, and it names the reads the write moves on any path — an answer and a
 * refusal alike. The names are the port's own, checked by `satisfies` at compile time, so a renamed
 * member fails the build instead of silently invalidating nothing. Every audited write emits an audit
 * event (contracts §6: one append function, called by every write), which is why no row omits
 * `listAuditEvents`. The two reads every recorded refusal moves are not repeated in the rows: the
 * channel adds them (see `POLICY_DECISION_READS`), because they are the same two whatever rule took the
 * decision.
 *
 * WHY EVERY ROW ALSO CLOSES WITH `getEvidence` AND `searchIdentifiers`. Those two are named in every row
 * because the rule that fills the rows reaches them for every audited write, not for the handful a
 * reader would guess at: each write appends an audit event (contracts §6); the evidence payload behind
 * a reference is composed from the record's own fields and the events whose `objectRef` is that record
 * (`handlers/evidence.ts`), so it reports whatever the write moved on the record it names; and the
 * identifier index is built over the session's records including every event
 * (`mock-backend.ts`'s `searchIdentifiers`), so each appended identifier becomes a hit of the term that
 * names it. Their absence is a hole a long cache lifetime exposes rather than one it creates: a drawer
 * closed and reopened inside that lifetime is served the pre-write payload with no control the reader
 * could use to refresh it, and a search term already typed keeps an index the trail has moved past. The
 * cost is stated rather than left implicit — one re-read of an open drawer and of the cached search
 * terms per write, which React Query de-duplicates while a fetch of the same key is in flight, so a
 * write that closes several rows at once still issues each read once. An export's event names the file
 * it built rather than a reference a drawer opens, so its row's `getEvidence` is the direction this map
 * takes rather than a payload that event lands in, and the same re-read is what that direction costs.
 *
 * Rules served:
 * - P-2: the single data path is unchanged. This module imports the port's type and nothing else — no
 *   seed record, no adapter, no domain module and no React — and it reaches no record: it names members.
 * - P-6: no figure, amount, identifier or record value is written here; every key is a method name.
 * - B-1, B-2: nothing here contacts an origin, reads configuration or carries a credential.
 *
 * Fixing inputs: AAP §0.6.2 (the data flow that states the invalidation obligation, and the ports-and-
 * adapters boundary this table sits on), AAP §0.12.1 (the adapter-selection row, which keeps the binding
 * in `create-service.ts`), AAP §0.12.3 (the policy block that appends its event and rejects with
 * `auditEventId`), and contracts §6 for the audit chain every write appends to.
 */

import type { SiteIntelligenceService } from './site-intelligence-service';

/* ---------------------------------------------------------------------------------------------
 * The map — AAP §0.6.2, contracts §6
 * ------------------------------------------------------------------------------------------- */

/**
 * A cached read: one member of the port, which is the whole vocabulary a cache entry can be keyed on.
 *
 * Every query in the application is keyed `[method, ...args]` (AAP §0.6.2), so a member name is both the
 * key's first element and the window an invalidation matches by prefix: naming the member invalidates
 * every entry of that read, under every argument list, which is the granularity a write to shared records
 * needs.
 */
export type CachedRead = keyof SiteIntelligenceService;

/**
 * The port members that write, in the order contracts §6 and AAP §0.6.2 name the actions they perform.
 *
 * The list exists so {@link WRITE_READS} can be checked for completeness: `satisfies` over a
 * `Record<WritingMember, ...>` fails to compile when a write has no row, which is the defect this module
 * was written to end. A member that only reads is absent, because a read moves nothing.
 */
export const WRITING_MEMBERS = [
  'assignException',
  'noteException',
  'dismissException',
  'decideApproval',
  'retryWriteBack',
  'requestApproval',
  'reviewApprovalOutcome',
  'solveScenario',
  'askAssistant',
  'requestPolicyException',
  'exportEvidencePack',
  'exportScenarioComparison',
  'exportChokepointBrief',
  'reviewPin',
  'reviewElement',
] as const satisfies readonly (keyof SiteIntelligenceService)[];

/** One of the port members that writes, named from {@link WRITING_MEMBERS}. */
export type WritingMember = (typeof WRITING_MEMBERS)[number];

/**
 * The reads each audited write moves, keyed by the member that performs it.
 *
 * A row is the handler's own effect read back into cache terms: the handler's member in
 * `src/services/mock/handlers/*` is what a maintainer checks a row against, and the docblock on each row
 * names the effect there that makes those reads answer differently. Each row also carries
 * `listAuditEvents`, because every write in the table appends to the chain (contracts §6), and closes
 * with `getEvidence` and `searchIdentifiers`, because the payload over the record the write moves and
 * the index over the trail it appends to both answer differently once it resolves — the reason the
 * module docblock sets out at length, held once there rather than restated row by row.
 */
export const WRITE_READS = {
  /**
   * Assigning an exception records the new owner, appends an `assigned` history entry and appends an
   * `assign` audit event (`handlers/exceptions.ts`).
   *
   * The owner column is on the queue row, the exception's own header and activity are on its detail read,
   * the "changed since your last visit" list and the four tiles are on the overview aggregate, and the
   * most-urgent rows the ribbon carries are ordered from the same rows — so all four reads plus the trail
   * answer differently once the write resolves (AAP §0.6.2, contracts §6).
   *
   * The exception is also a record a drawer opens: the payload over it reports the state the assignment
   * left and lists the events that name it, and the index gains the `assign` event's identifier
   * (AAP §0.6.2, contracts §6).
   */
  assignException: [
    'getOverview',
    'listExceptions',
    'getExceptionDetail',
    'getCanvasRibbon',
    'listAuditEvents',
    'getEvidence',
    'searchIdentifiers',
  ],

  /**
   * A note records the text on the exception, appends a `noted` history entry and appends a `note` audit
   * event (`handlers/exceptions.ts`).
   *
   * The note is part of the exception's own record, so the detail read and the queue row that summarises
   * it both move; the overview's changed-since list and the ribbon count the same rows, so they move with
   * them (AAP §0.6.2, contracts §6). The payload the exception's drawer opens lists the `note` event among
   * the events that name the record, and the index gains that identifier (AAP §0.6.2, contracts §6).
   */
  noteException: [
    'getOverview',
    'listExceptions',
    'getExceptionDetail',
    'getCanvasRibbon',
    'listAuditEvents',
    'getEvidence',
    'searchIdentifiers',
  ],

  /**
   * A dismissal records the reason, moves the exception to `dismissed`, appends a `dismissed` history
   * entry and appends a `dismiss` audit event (`handlers/exceptions.ts`).
   *
   * The status column is on the queue row and in the overview's open-exception tile, the detail read
   * reports the record's own status, and a dismissed exception leaves the ribbon's most-urgent set (AAP
   * §0.6.2, contracts §6). The payload the exception's drawer opens reports the status the dismissal
   * moved and lists the `dismiss` event, and the index gains that identifier (AAP §0.6.2, contracts §6).
   */
  dismissException: [
    'getOverview',
    'listExceptions',
    'getExceptionDetail',
    'getCanvasRibbon',
    'listAuditEvents',
    'getEvidence',
    'searchIdentifiers',
  ],

  /**
   * A decision records the verdict on the approval, appends an `approved` or `rejected` event, and — when
   * the verdict approves the plan — continues into the approved-plan path, which moves the exception to
   * `resolved`, appends the resolution about it and appends a `resolved` event (`handlers/approvals.ts`,
   * `handlers/exceptions.ts`).
   *
   * That is why the row reaches past the approval: an approved decision resolves the exception, so the
   * queue's status column, the overview's open-exception tile, the exception's own detail read, the
   * ribbon's urgent set and the topology's per-node counts all move with the approval, the outcome
   * measured from it, the inbox and the trail (AAP §0.6.2, contracts §6).
   *
   * Both records a drawer opens move with it as well: the payload over the approval reports the verdict,
   * the decision and the write-back states the decision sets, the payload over the exception reports the
   * status the resolution moves, each lists the events that name it, and the index gains the identifiers
   * those events append (AAP §0.6.2, contracts §6).
   */
  decideApproval: [
    'getApproval',
    'getApprovalOutcome',
    'listApprovals',
    'getOverview',
    'listExceptions',
    'getExceptionDetail',
    'getCanvasRibbon',
    'getTopology',
    'listAuditEvents',
    'getEvidence',
    'searchIdentifiers',
  ],

  /**
   * A write-back retry records the step's new state on the approval, appends a `write-back retry` event
   * and records the retry on the exception's activity (`handlers/approvals.ts`).
   *
   * The approval and the outcome measured from its write-backs move together, and so do the exception's
   * activity, the overview's approved-plan figures and the contract's status column. The exception is
   * already resolved by the decision that started the write-back, so the reads that carry its resolution
   * are refreshed with it rather than left holding the state before the retry (AAP §0.6.2, contracts §6).
   *
   * The payload the approval's drawer opens reports the step states the retry moved and lists the step
   * events it appended, and the index gains those identifiers (AAP §0.6.2, contracts §6).
   */
  retryWriteBack: [
    'getApproval',
    'getApprovalOutcome',
    'getOverview',
    'listExceptions',
    'getExceptionDetail',
    'listAuditEvents',
    'getEvidence',
    'searchIdentifiers',
  ],

  /**
   * Requesting approval records a new approval against the option, appends a `request` event and turns
   * the option set's selection state into a requested one (`handlers/approvals.ts`).
   *
   * The inbox gains the new approval, the option set the request was made from reflects it, and the trail
   * gains the event (AAP §0.6.2, contracts §6). The payload over the new approval reports the request it
   * records, the payload over the exception lists that approval among the records answering it, and the
   * index gains the `request` event's identifier (AAP §0.6.2, contracts §6).
   */
  requestApproval: [
    'getScenarioSet',
    'listApprovals',
    'listAuditEvents',
    'getEvidence',
    'searchIdentifiers',
  ],

  /**
   * Reviewing an outcome records that the plan has been set against the resulting figures, appends an
   * `outcome review` event and stamps `outcomeReviewed` on the approval (`handlers/approvals.ts`).
   *
   * The approval and its outcome card both report the flag, and the trail gains the event (AAP §0.6.2,
   * contracts §6). The payload over the approval reports the flag it now carries, and the index gains the
   * review event's identifier (AAP §0.6.2, contracts §6).
   */
  reviewApprovalOutcome: [
    'getApproval',
    'getApprovalOutcome',
    'listAuditEvents',
    'getEvidence',
    'searchIdentifiers',
  ],

  /**
   * A sandbox solve measures one option at the levers a reader supplied and appends a `custom solve`
   * event naming the exception and whether the option stayed inside its bounds
   * (`handlers/scenarios.ts`).
   *
   * It changes no scenario, so the option set it was measured from is refreshed with the trail rather
   * than left holding a set the trail has moved past: the set and the trail are one answer about one
   * exception (AAP §0.6.2, contracts §6). The `custom solve` event names that exception, so the payload
   * its drawer opens lists the event, and the index gains its identifier (AAP §0.6.2, contracts §6).
   */
  solveScenario: ['getScenarioSet', 'listAuditEvents', 'getEvidence', 'searchIdentifiers'],

  /**
   * A question appends an `assistant query` event and answers from citations the evidence read serves
   * (`handlers/assistant.ts`).
   *
   * The block path appends an event too — a `policy block` event whose `objectRef` is the model entry's
   * declared outbound endpoint and whose result is `blocked` (`handlers/assistant.ts`, AAP §0.12.3) — and
   * the outbound ledger counts blocked events by that `objectRef`, so `getSovereigntyStatus` moves on a
   * refusal as well as on an answer. That is why the refusal path invalidates this row too. The same
   * event names POL-007 as its actor, so the policy set and that policy's detail move with the refusal as
   * well; the channel adds those two reads for any refusal that records itself rather than this row
   * stating them twice. The identifier index gains the identifier of whichever event the question or its
   * block appended, so a cached search term answers the hit that event now holds (AAP §0.6.2,
   * contracts §6).
   */
  askAssistant: ['getEvidence', 'listAuditEvents', 'getSovereigntyStatus', 'searchIdentifiers'],

  /**
   * A policy-exception request records a pending exception against the policy — read back through the
   * policy set and the policy's own detail — and appends a `policy exception request` event naming the
   * policy as its `objectRef` (`handlers/governance.ts`).
   *
   * The sovereignty payload is invalidated with them because the ledger it carries is computed over the
   * same trail: the request's own event names a policy rather than an endpoint, so it moves no ledger
   * count today, and refreshing that read anyway is the deliberate direction for a map whose cost is one
   * re-read instead of a count left behind the trail it is computed from (AAP §0.6.2, contracts §6).
   *
   * The payload over the policy lists the request the write records, and the index gains the request
   * event's identifier (AAP §0.6.2, contracts §6).
   */
  requestPolicyException: [
    'listPolicies',
    'getPolicy',
    'getSovereigntyStatus',
    'listAuditEvents',
    'getEvidence',
    'searchIdentifiers',
  ],

  /**
   * The evidence-pack export appends an `export` event naming the pack it built (`mock-backend.ts`).
   *
   * It writes no record the application reads, so the trail is the one answer that moves (AAP §0.6.2,
   * contracts §6). `getEvidence` closes the row as it closes every row, for the reason the module
   * docblock gives about an export's event naming the file it built rather than a reference a drawer
   * opens, and the index does answer differently because it gains that event's identifier
   * (AAP §0.6.2, contracts §6).
   */
  exportEvidencePack: ['listAuditEvents', 'getEvidence', 'searchIdentifiers'],

  /**
   * The scenario-comparison export appends an `export` event naming the comparison it built
   * (`mock-backend.ts`).
   *
   * As with the evidence pack, no record the application reads moves, so the trail is the answer that
   * moves, and the row closes with `getEvidence` and the identifier index for the same reason given there
   * (AAP §0.6.2, contracts §6).
   */
  exportScenarioComparison: ['listAuditEvents', 'getEvidence', 'searchIdentifiers'],

  /**
   * The chokepoint-brief export appends an `export` event naming the brief it built (`mock-backend.ts`).
   *
   * As with the other two exports, no record the application reads moves, so the trail is the answer that
   * moves, and the row closes with `getEvidence` and the identifier index for the same reason given at
   * the evidence pack (AAP §0.6.2, contracts §6).
   */
  exportChokepointBrief: ['listAuditEvents', 'getEvidence', 'searchIdentifiers'],

  /**
   * A pin review records the reviewer's state on the pin and appends an `extraction review` event
   * (`handlers/evidence.ts`).
   *
   * The pin set and the trail move; both are stage S4 surfaces whose routes are unreached in this run,
   * and the rows are complete for the stage that reaches them rather than left to a second table (AAP
   * §0.6.2, contracts §6). The payload over the pin reports the state the review sets, and the index gains
   * the review event's identifier (AAP §0.6.2, contracts §6).
   */
  reviewPin: ['listPins', 'listAuditEvents', 'getEvidence', 'searchIdentifiers'],

  /**
   * An element review records the human verdict on a package element, re-runs the evidence rules for the
   * package and appends an `extraction review` event (`handlers/evidence.ts`).
   *
   * The package's readiness is recomputed from the elements it holds, so the package, the package list
   * and the trail all move. Both are S4 surfaces, complete here for the same reason (AAP §0.6.2,
   * contracts §6). The payload over the package reports the readiness the re-run produced, and the index
   * gains the review event's identifier (AAP §0.6.2, contracts §6).
   */
  reviewElement: [
    'getPackage',
    'listPackages',
    'listAuditEvents',
    'getEvidence',
    'searchIdentifiers',
  ],
} as const satisfies Readonly<Record<WritingMember, readonly CachedRead[]>>;

/* ---------------------------------------------------------------------------------------------
 * The write-observation channel — AAP §0.3.2, AAP §0.6.2
 * ------------------------------------------------------------------------------------------- */

/** What an observer is told about a write: the reads that write moved. */
export type WriteObserver = (reads: readonly CachedRead[]) => void;

/**
 * The observers of this session's writes.
 *
 * Module scope rather than a field of a component, because the things that meet here both outlive a
 * screen: the adapter is the session's single instance (`create-service.ts`) and the cache is created
 * once above the router (`providers.tsx`), while a screen that starts a write may unmount inside the
 * write's own 150-400 ms. An observer that arrives and leaves is added and removed by
 * {@link observeWriteReads}, so nothing accumulates across a mount.
 */
const writeObservers = new Set<WriteObserver>();

/**
 * Subscribes to the audited writes the bound adapter settles.
 *
 * The returned function removes the subscription, which is what an effect returns as its cleanup. Every
 * observer is called with the reads the write moved — its row of the [map]{@link WRITE_READS}, and on a
 * refusal that recorded itself the policy reads as well — so a cache invalidates exactly those without
 * knowing which member wrote.
 *
 * @param listener - Called once per settled audited write, with the reads that write moved.
 * @returns The unsubscribe function.
 */
export function observeWriteReads(listener: WriteObserver): () => void {
  writeObservers.add(listener);

  return () => {
    writeObservers.delete(listener);
  };
}

/**
 * Tells every observer which reads one write moved.
 *
 * Each call is guarded on its own, because an observer is a side channel to a write that has already
 * committed: a failing subscriber must not starve the subscribers after it, and must not turn a
 * successful write into a failure the screen would report as a refused one. The failure is dropped
 * rather than rethrown for that reason — there is no third-party logger in this build (rule B-1) and the
 * write's own outcome is already the answer the reader is owed.
 */
function reportWrite(reads: readonly CachedRead[]): void {
  for (const observer of [...writeObservers]) {
    try {
      observer(reads);
    } catch {
      /* Deliberately swallowed: see this function's docblock. */
    }
  }
}

/**
 * The reads a refused write moves besides its own row: the policy set and one policy, whose decisions
 * are the events the policy engine appended for it (`handlers/governance.ts`).
 *
 * A policy block is the one refusal in this build that records itself and names the event in the
 * `Problem` it throws — the handler appends a policy-actor `policy block` event naming the rule as its
 * actor before it throws, and that `Problem` carries the event's identifier as `auditEventId`
 * (AAP §0.12.3, contracts §6). Both writes that the policy engine can refuse reach that path: a question
 * the model boundary blocks (`handlers/assistant.ts`) and an approval request or decision POL-005 or
 * POL-003 refuses (`handlers/approvals.ts`). Because `PolicyDetail.recentDecisions` lists the events a
 * rule appended, the two policy reads answer differently once that event exists. The failed write-back
 * records itself without naming an event, and it appends no policy decision, which is why these two reads
 * travel only with a refusal that carries `auditEventId`.
 */
const POLICY_DECISION_READS: readonly CachedRead[] = ['listPolicies', 'getPolicy'];

/**
 * Whether a refusal recorded itself, by naming the audit event its handler appended before throwing.
 *
 * The identifier is what tells a refusal that moved the trail from one that changed nothing: a
 * permission the matrix denies, a validation and a decision refused on the state of a source all throw
 * without appending anything, so no read of theirs moved. It is not the only condition
 * {@link reportResolvedWrite} tests, because one family of refusal records itself and names no event —
 * see {@link SELF_RECORDING_REFUSAL_MEMBERS}.
 */
function refusalRecorded(thrown: unknown): boolean {
  if (typeof thrown !== 'object' || thrown === null || !('auditEventId' in thrown)) {
    return false;
  }

  const { auditEventId } = thrown;

  return typeof auditEventId === 'string' && auditEventId.length > 0;
}

/**
 * The writes whose handler records what it did before it refuses, so a refusal of one of them has moved
 * records even though the `Problem` it throws names no audit event.
 *
 * These are the two write paths that run `advanceWriteBacks` (`handlers/approvals.ts`): the decision at
 * `:1823` and the retry at `:1899`. That function appends each transition through `recordStep`
 * (`:1367-1395`), which sets the step's `state` and appends the `write-back` event, and a step that did
 * not complete then throws `writeBackProblem` (`:361-363`) — a `Problem` carrying
 * `simulated-write-back`, its own message and its trace identifier, and no `auditEventId`. A decision
 * reaches that refusal whenever the partial-failure trigger is on, with the step's state and its event
 * already written; a retry runs the same `recordStep` → `advanceWriteBacks` sequence over the step it
 * re-attempts, so the change it lands is on the record before the member settles. Testing only for
 * `auditEventId` therefore left a failed write-back's moved records unreported, which is the
 * unmounted-screen hole this channel exists to close.
 *
 * A member here reports its row on every refusal, because the thrown `Problem` alone does not say which
 * branch refused: the cost is one re-read of reads that a permission, a validation or a stale source
 * refusal did not move, set against a written step and a moved approval the cache would never hear
 * about. Every other member still reports nothing for a refusal that recorded nothing.
 */
const SELF_RECORDING_REFUSAL_MEMBERS = [
  'decideApproval',
  'retryWriteBack',
] as const satisfies readonly WritingMember[];

/**
 * Whether `member` is one of the writes that record before they refuse.
 *
 * The cast widens the tuple to the element type `includes` is declared over, the same way
 * {@link isWritingMember} widens {@link WRITING_MEMBERS}; membership is the whole of the test, so no
 * second condition is needed.
 */
function recordsBeforeRefusing(member: WritingMember): boolean {
  return (SELF_RECORDING_REFUSAL_MEMBERS as readonly WritingMember[]).includes(member);
}

/* ---------------------------------------------------------------------------------------------
 * The reporting wrapper around an adapter — AAP §0.6.2, AAP §0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * Whether a property the wrapper was asked for is one of the audited writes.
 *
 * The cast widens the tuple to the element type `includes` is declared over; membership in it is exactly
 * what {@link WritingMember} means, so the predicate needs no second check.
 */
function isWritingMember(property: string | symbol): property is WritingMember {
  return typeof property === 'string' && (WRITING_MEMBERS as readonly string[]).includes(property);
}

/**
 * Wraps one write so a settled call reports the reads it moved.
 *
 * The call is made through `Reflect.apply` against the adapter itself rather than against the wrapper,
 * so a member reading its own private state or its own fields sees the adapter, not the proxy. A resolved
 * call reports its row. A refused one reports the row and {@link POLICY_DECISION_READS} when the refusal
 * names an appended event, reports the row alone when its member records before it refuses
 * ({@link SELF_RECORDING_REFUSAL_MEMBERS}) and names no event, and nothing when neither holds — and it
 * is rethrown either way, because the caller's own failure handling is the answer the reader is owed.
 */
function reportResolvedWrite(
  adapter: SiteIntelligenceService,
  member: WritingMember,
  implementation: Function,
): (...args: unknown[]) => Promise<unknown> {
  return async (...args: unknown[]): Promise<unknown> => {
    try {
      const result: unknown = await Reflect.apply(implementation, adapter, args);

      reportWrite(WRITE_READS[member]);

      return result;
    } catch (thrown: unknown) {
      if (refusalRecorded(thrown)) {
        reportWrite([...WRITE_READS[member], ...POLICY_DECISION_READS]);
      } else if (recordsBeforeRefusing(member)) {
        reportWrite(WRITE_READS[member]);
      }

      throw thrown;
    }
  };
}

/**
 * Returns `service` with every audited write reporting the reads it moved, and every other member
 * delegating to the adapter unchanged.
 *
 * A `Proxy` rather than a hand-written wrapper class, because the port is 46 members wide and a wrapper
 * would have to restate every signature: one trap covers the surface, and a member added to the port
 * later crosses it without being listed. The trap behaves as the adapter does in the three ways a caller
 * can observe — a non-function member is returned as it stands, every function is bound to the adapter so
 * `this` and its private fields stay its own, and the identical function is handed back for the identical
 * member, so a member read into a dependency array does not change identity on every access.
 *
 * The result is typed `SiteIntelligenceService`, which is what the caller binds: the reporting is a side
 * channel around the port, not a widening of it, so no screen can observe a member the interface does not
 * declare (rule P-2).
 *
 * @param service - The adapter to bind, the session's single instance.
 * @returns The same adapter, with its writes reporting the reads they move.
 */
export function withWriteReporting(service: SiteIntelligenceService): SiteIntelligenceService {
  /** The functions already handed out, so a member keeps one identity for the session. */
  const wrapped = new Map<string | symbol, unknown>();

  return new Proxy(service, {
    get(target, property) {
      const handed = wrapped.get(property);

      if (handed !== undefined) {
        return handed;
      }

      const value: unknown = Reflect.get(target, property, target);

      if (typeof value !== 'function') {
        return value;
      }

      const member = isWritingMember(property)
        ? reportResolvedWrite(target, property, value)
        : value.bind(target);

      wrapped.set(property, member);

      return member;
    },
  });
}
