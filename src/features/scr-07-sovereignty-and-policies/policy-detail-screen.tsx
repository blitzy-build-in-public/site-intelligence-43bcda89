/**
 * SCR-07's policy detail: one policy as the workspace holds it — its identifier and display
 * statement, whether the policy engine evaluates it or the deployment only declares it, the
 * decisions the engine recorded against it, and the time-boxed exception requests recorded against
 * it — together with SCR-07's "Grant time-boxed exception" action.
 *
 * Fixing input: AAP 0.12.4's SCR-07 row and its route table fix this route
 * (`/admin/policies/:policyId`, stage S1). The row gives the screen two halves — "the policy list and
 * recent decisions", and the grant flow that records a pending request — and fixes that every
 * declared value is shown under the label `Declared, not verified` (rule P-4). `PolicyDetail`,
 * `PolicyException` and `PolicyExceptionStatus` are the read's shape (AAP 0.12.2), and they are the
 * only source of the strings and values below.
 *
 * DECLARED VERSUS EVALUATED, READ FROM THE RECORD. `PolicyDetail.evaluated` is the discriminator the
 * service supplies, and it is the only thing this screen consults: a policy the engine evaluates
 * states that the engine evaluates it and shows the decisions it recorded; a policy the engine does
 * not evaluate is rendered as declared configuration under the exact `Declared, not verified` string
 * of `SIM_LABELS` (AAP 0.10, rule P-4). No identifier is special-cased here — this file carries no
 * `POL-` literal at all, so which policy is declared stays the seeded record's fact and cannot drift
 * from the engine's (rule P-6). Neither branch claims anything about production enforcement: the
 * evaluated branch says which component evaluates the record in this workspace, and the declared
 * branch says the record is declared configuration (rule P-4).
 *
 * THE GRANT ACTION IS THE SAME FLOW SCR-07 OFFERS ON `/admin/sovereignty`. AAP 0.12.4 assigns "Grant
 * time-boxed exception" to SCR-07 as a whole, and a time-boxed exception is always requested against
 * one policy, so this screen composes `./grant-exception-dialog` with the policy it is showing rather
 * than carrying a second form of its own. The alternative reading — that the action belongs only to
 * the sovereignty route — would leave a reader standing on a policy unable to request an exception
 * for the policy they are reading. The dialog owns the three terms (reason, expiry, second
 * approver), the call and the refusal rendering; this screen only decides whether the acting persona
 * may raise the request and tells the cache to re-read the policy once one is recorded.
 *
 * WHERE THE DATA COMES FROM, AND WHERE IT DOES NOT. Both reads go through the hooks of
 * `../../services/service-provider`: `getPolicy` returns the policy's whole detail, and the acting
 * persona — read from the demonstration capability's `getActiveUser` — decides whether the grant
 * control can act. The route parameter arrives from `useParams()` and the shell's plant and product
 * selection arrives as `scope`, which this screen carries in the cache key so a selection change
 * re-reads the policy as every other screen's reads do (AAP 0.6.2, 0.12.4). No seed module, mock
 * adapter, API client, domain module, shell module or other feature is imported: the port is the only
 * data boundary here (rule P-2).
 *
 * THE SEVEN STATES. The screen renders inside `StateBoundary`, and the state is derived once, in
 * {@link deriveScreenState}, from what the query settled to and from the freshness report the result
 * carries: a permission refusal is `forbidden` (rendered as the forbidden card, whose evidence is the
 * refusal's own permission, roles and trace identifier — rule P-3 states that enforcement is the
 * service's), a `not-found` refusal is `empty` and prints the service's own message rather than a
 * sentence written here, a validation refusal is `conflict`, any other rejection is `offline`, a
 * pending read is `loading`, a source that did not answer is `offline`, the approval-gate source
 * reported stale is `stale`, and a source that answered incompletely is `partial`. The page header
 * names the record, so it renders with the record; a policy that could not be read is explained by
 * the boundary instead. An empty decision list is the table's own empty sentence rather than a
 * screen state, because the header and the other panels stay readable when one list is empty.
 *
 * WHAT IS LABELLED, AND WHY NOTHING ELSE IS. The declared branch carries `Declared, not verified`;
 * the decisions panel carries `Simulated control`, because the engine that recorded those events runs
 * in this browser; and each request row carries its status as icon, label and colour together (rule
 * B-3). The persistent `Simulated data` badge belongs to the shell and is deliberately not mounted
 * here, so no route can carry two of them (rule P-1).
 *
 * REPORTED GAPS AND DECISIONS.
 * - The second approver a request needs cannot be offered from here. `SiteIntelligenceService`
 *   publishes no read of the seeded personas — the approval records carry eligible *roles*, not
 *   people, and `searchIdentifiers` returns domain records — so `GrantExceptionDialog` is composed
 *   without `secondApprovers`, and it disables its own submit with the sentence naming that missing
 *   capability rather than sending a request that cannot name an approver (rule P-8). The day a read
 *   for the personas exists, its result is passed to that prop and nothing else in this file moves.
 * - The grant control is disabled when the acting persona does not hold `policy.exception.request`,
 *   which is the permission the service itself requires for the write. That check is presentation
 *   only: the adapter evaluates the matrix against its own persona, so bypassing the control changes
 *   nothing (rule P-3). The condition is read from a fresh `getActiveUser` call on mount rather than
 *   from the persona the shell seeded at start-up, so a reader who switched role and then opened a
 *   policy is judged on the role the adapter is enforcing.
 * - No second disabling condition is invented. `PolicyDetail` carries `evaluated` and nothing that
 *   states a policy refuses exceptions, and the service accepts a request against any policy it
 *   holds, so the screen does not disable the action for a condition no record carries (rule P-6).
 * - `EvidenceRef` is not composed here: no figure on this screen carries an evidence reference, since
 *   the record supplies identifiers, statements and recorded events rather than computed values. It
 *   will be composed by the screens that show figures.
 * - `Card` is composed for the three blocks rather than `Panel`, because each block owns a heading of
 *   its own and `Panel` intentionally renders none.
 *
 * Rules this module is built to satisfy:
 * - B-1, B-2: nothing here fetches, names an address, reads an environment value or carries a
 *   credential; both reads are calls on the in-browser port.
 * - B-3: one `<h1>` from `PageHeader`, table semantics and captions from `DataTable`, every control a
 *   keyboard-operable `ActionButton` with the theme's focus ring and the 24 by 24 px minimum target,
 *   every status carried by icon, label and colour together, role-token colours only, and no motion
 *   declared that `prefers-reduced-motion` would have to suppress.
 * - P-1: the declared label and the `Simulated control` label are members of `SIM_LABELS`, typed as
 *   `SimLabel`, and no label is retyped in another form.
 * - P-2: both reads go through `useService()` and `useDemonstration()`; no seed, adapter, domain,
 *   shell or HTTP module is reachable from here.
 * - P-3: a denial is the `ForbiddenCard` inside `StateBoundary`, and the permission gate on the grant
 *   control decides nothing the adapter does not decide again.
 * - P-4: declared configuration is labelled `Declared, not verified`, the engine's record is labelled
 *   `Simulated control`, and nothing on this screen states that the workspace establishes a
 *   configuration, prevents a copy or withstands an edit.
 * - P-5: no market-intelligence value is reachable from this screen's payload, so nothing here can be
 *   blended with a first-party figure.
 * - P-6: no policy identifier, count, amount, date or percentage is typed in this file. Every value
 *   rendered is a member of the payload the port returned.
 * - P-7: every name on screen is a seeded record's own; this file names no company, product or person
 *   and writes no placeholder prose.
 * - P-8: every control either acts or is disabled with the sentence that explains why, and the
 *   discriminated `ActionButtonProps` union is what prevents a disabled control without one.
 */
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { useParams } from 'react-router';

import { Card } from '../../components/card';
import { DataTable } from '../../components/data-table';
import type { TableColumn } from '../../components/data-table';
import { MonoValue } from '../../components/mono-value';
import { PageHeader } from '../../components/page-header';
import { StateBoundary } from '../../components/state-boundary';
import type { StateBoundaryForbidden, StateBoundaryStale } from '../../components/state-boundary';
import { PENDING_CLOCK_ICON, StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { ActionButton } from '../../components/tooltip';
import { useDemonstration, useService } from '../../services/service-provider';
import { APPROVAL_GATE_SOURCE, SIM_LABELS, SOURCE_LABELS } from '../../types';
import type {
  ActiveUser,
  AuditEvent,
  AuditResult,
  Freshness,
  FreshnessState,
  Permission,
  PolicyDetail,
  PolicyException,
  PolicyExceptionStatus,
  Problem,
  ProblemType,
  Result,
  Scope,
  ScreenState,
  SimLabel,
} from '../../types';
import { GrantExceptionDialog } from './grant-exception-dialog';

/* ---------------------------------------------------------------------------------------------
 * The fixed labels and the one permission this screen names
 * ------------------------------------------------------------------------------------------- */

/**
 * The `Declared, not verified` label of specification §5.3, read from the tuple that holds the seven
 * fixed strings once, so this screen carries the label rather than a copy of it (rule P-1, AAP 0.10).
 *
 * Typed `SimLabel`, so a member the union gains or loses fails this file's compilation instead of
 * leaving a string that no longer names a label.
 */
const DECLARED_LABEL: SimLabel = SIM_LABELS[6];

/**
 * The `Simulated control` label of specification §5.3, read from the same tuple at the index §5.3
 * gives it. It marks the decisions panel, because the engine that recorded those events runs in this
 * browser rather than in a deployment (rule P-4).
 */
const SIMULATED_CONTROL_LABEL: SimLabel = SIM_LABELS[4];

/**
 * The one permission this screen needs to know about: the write the grant flow makes, which the
 * service requires and its handler checks again.
 *
 * Written against `Permission` so a renamed member of the contracts §7.1 matrix fails this file's
 * compilation rather than leaving a gate that quietly matches nothing.
 */
const POLICY_EXCEPTION_REQUEST: Permission = 'policy.exception.request';

/* ---------------------------------------------------------------------------------------------
 * The screen's own wording — no input fixes these sentences
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this screen states, held here so the wording has one owner: the component renders
 * these strings and a reader finds them in one place.
 *
 * None of them carries a figure, an amount, an identifier, a date or a persona (rule P-6) — the
 * policy's own identifier, title, statement, decisions and requests are rendered exactly as the
 * service supplies them. None claims that the workspace establishes a configuration, prevents a copy
 * or withstands an edit, and the declared case defers to the fixed label rather than repeating it
 * (rule P-4).
 */
export const POLICY_DETAIL_SCREEN_TEXT = {
  /** The caption before the policy's identifier in the page header's eyebrow. */
  policyCaption: 'Policy',

  /** The grant action's label, which AAP 0.12.4 fixes for SCR-07. */
  grantAction: 'Grant time-boxed exception',

  /** The heading of the block that states whether the engine evaluates the policy. */
  evaluationTitle: 'Declared or evaluated',

  /** The status line of a policy the policy engine evaluates. */
  evaluatedStatus: 'Evaluated by the policy engine',

  /** What the evaluated case means, in the reader's terms, without claiming production enforcement. */
  evaluatedDetail:
    'The policy engine in this workspace evaluates this policy. The decisions below are the events it ' +
    'recorded, as the trail holds them.',

  /** What the declared case means, beside the fixed `Declared, not verified` label. */
  declaredDetail:
    'The policy engine does not evaluate this policy. The deployment declares it, and this screen ' +
    'shows it as declared configuration rather than as a rule that was applied.',

  /** The heading of the recorded-decisions block. */
  decisionsTitle: 'Recent decisions',

  /** The decisions table's accessible name. */
  decisionsCaption: 'Decisions the policy engine recorded against this policy',

  /** The decisions table's sentence when the engine has recorded nothing for an evaluated policy. */
  decisionsEmpty: 'The policy engine has recorded no decision against this policy in this session.',

  /** The decisions table's sentence for a policy the engine does not evaluate at all. */
  declaredDecisionsEmpty:
    'The policy engine does not evaluate this policy, so it has recorded no decision for it.',

  /** The heading of the requests block. */
  requestsTitle: 'Time-boxed exception requests',

  /** The requests table's accessible name. */
  requestsCaption: 'Time-boxed exception requests recorded against this policy',

  /** The requests table's sentence when nothing has been requested against the policy. */
  requestsEmpty:
    'No time-boxed exception has been requested against this policy in this session.',

  /** The header column of a decision's instant. */
  decisionRecorded: 'Recorded',

  /** The header column of the persona or policy that produced a decision. */
  decisionActor: 'Actor',

  /** The header column of the action a decision recorded. */
  decisionAction: 'Action',

  /** The header column of the record a decision is about. */
  decisionRecord: 'Record',

  /** The header column of a decision's outcome. */
  decisionOutcome: 'Outcome',

  /** The header column of the policy that decided an outcome, when a policy decided it. */
  decisionPolicy: 'Policy',

  /** The header column of a request's status. */
  requestStatus: 'Status',

  /** The header column of a request's stated reason. */
  requestReason: 'Reason',

  /** The header column of the instant a request stops applying. */
  requestExpiry: 'Expires',

  /** The header column of the persona who requested an exception. */
  requestRequester: 'Requested by',

  /** The header column of the persona whose approval a request needs. */
  requestSecondApprover: 'Second approver',

  /** The screen's sentence for a route that names no policy at all. */
  noPolicyIdentifier: 'This route names no policy, so there is nothing to read here.',

  /** The notice above a read whose source answered incompletely. */
  partial:
    'A source answered this read incompletely, so a decision or a request may be missing from the ' +
    'tables below.',

  /** The notice above a read the service refused against the records as they stand. */
  conflict:
    'The service refused this read against the records as they stand. Read the policy again to see ' +
    'it as it now is.',

  /** The grant control's reason while the acting persona is still being read. */
  grantIdentityPending:
    'The acting persona is still being read, so a time-boxed exception cannot be requested yet.',

  /** The grant control's reason when the bound adapter reports no acting persona. */
  grantNoIdentity:
    'This session reports no acting persona, so a time-boxed exception cannot be requested here.',

  /** The grant control's reason when the acting persona could not be read. */
  grantIdentityFailed:
    'The acting persona could not be read, so a time-boxed exception cannot be requested here.',

  /** The grant control's reason when the acting persona does not hold the write's permission. */
  grantNotPermitted:
    'A time-boxed exception is requested with policy.exception.request, and the acting persona does ' +
    'not hold it. The service refuses the write for the same reason.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The page frame: one column, separated by the 4 px grid rather than by a margin on any child. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-4';

/** The loaded page: the header and the three blocks, in the same single column. */
const PAGE_CLASSES = 'flex min-w-0 flex-col gap-4';

/** A block's supporting sentence, one step down the type scale in the secondary text role. */
const DETAIL_CLASSES = 'text-13 break-words text-text-secondary';

/**
 * A decision's actor and the record's own word for what kind of actor it is, on one baseline and
 * wrapping rather than overflowing a narrow column.
 */
const ACTOR_CLASSES = 'inline-flex min-w-0 flex-wrap items-baseline gap-2';

/** The caption role for the actor kind, one step down from the identifier beside it. */
const ACTOR_KIND_CLASSES = 'text-12 text-text-caption';

/** A request's reason: a sentence, which breaks rather than overflowing its cell. */
const REASON_CLASSES = 'block text-13 break-words text-text-primary';

/* ---------------------------------------------------------------------------------------------
 * Narrowing the service's failure, and the freshness report
 * ------------------------------------------------------------------------------------------- */

/**
 * The five causes a `Problem` may name, listed once against the port's own union so a rejection can
 * be narrowed to the service's failure shape without widening anything.
 */
const PROBLEM_TYPES = [
  'permission',
  'policy',
  'validation',
  'simulated-write-back',
  'not-found',
] as const satisfies readonly ProblemType[];

/**
 * Whether a rejection is the port's typed failure rather than something the platform threw.
 *
 * A `Problem` is thrown rather than returned (AAP 0.12.3), so a screen that catches a read has to
 * tell the two apart before it can name a cause: a refusal of the record is not the same condition
 * as a failure of the call. Every member checked here is one a `Problem` declares, so a `TypeError`
 * from a broken module reaches the offline rendering instead of being read as a refusal it never was.
 */
function isProblem(error: unknown): error is Problem {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if (!('type' in error) || !('message' in error) || !('traceId' in error)) {
    return false;
  }

  const { type, message, traceId } = error;

  return (
    typeof type === 'string' &&
    PROBLEM_TYPES.some((known) => known === type) &&
    typeof message === 'string' &&
    typeof traceId === 'string'
  );
}

/**
 * The service's own message for a refusal of one cause, or `undefined` when the rejection was not
 * that refusal.
 *
 * Used for the `not-found` case, which the boundary renders as an empty result: the sentence a
 * reader sees is the adapter's, naming the identifiers the record set does hold, so this screen
 * invents none (rule P-6).
 */
function serviceMessageOf(error: unknown, cause: ProblemType): string | undefined {
  return isProblem(error) && error.type === cause ? error.message : undefined;
}

/**
 * The denial the forbidden card explains, or `undefined` when the failure was not a permission
 * refusal.
 *
 * The card's evidence is the failure's own: the permission the acting role lacks, the roles that
 * hold it and the trace identifier of the refused call. The card states that enforcement happens in
 * the service, which is the one thing this screen may say about authority (rule P-3).
 */
function forbiddenOf(error: unknown): StateBoundaryForbidden | undefined {
  if (!isProblem(error) || error.type !== 'permission') {
    return undefined;
  }

  const permission = error.requiredPermission;

  if (permission === undefined) {
    return undefined;
  }

  return {
    permission,
    roles: error.rolesWithPermission ?? [],
    traceId: error.traceId,
  };
}

/**
 * The stale record the boundary's banner names, or `undefined` unless the approval-gate source
 * itself reports `stale`.
 *
 * The source is `APPROVAL_GATE_SOURCE`, declared once in `src/types/sources.ts` and labelled from
 * `SOURCE_LABELS`, so the banner names the same source the freshness strip prints rather than a
 * second literal that agrees only until the gate moves. Nothing is derived from the instant — no age
 * and no duration (rule P-6).
 */
function staleRecordOf(freshness: readonly Freshness[]): StateBoundaryStale | undefined {
  const gate = freshness.find(
    (entry) => entry.source === APPROVAL_GATE_SOURCE && entry.state === 'stale',
  );

  if (gate === undefined) {
    return undefined;
  }

  return { source: gate.source, label: SOURCE_LABELS[gate.source], asOf: gate.asOf };
}

/** Whether a source in the read's freshness report answered in the state asked about. */
function reportsState(freshness: readonly Freshness[], state: FreshnessState): boolean {
  return freshness.some((entry) => entry.state === state);
}

/** What {@link deriveScreenState} reads: whether a policy was named, and what the read settled to. */
interface ScreenStateInput {
  /** Whether the route named a policy at all. */
  readonly hasPolicyId: boolean;

  /** Whether the read has not answered yet. */
  readonly isPending: boolean;

  /** What the read rejected with, or `null` while it has not. */
  readonly error: unknown;

  /** The read's result, or `undefined` until it settles. */
  readonly result: Result<PolicyDetail> | undefined;
}

/**
 * The one place this screen decides which of the seven states its record is in.
 *
 * The route comes first: a route that names no policy has nothing to read. The failure side is then
 * fixed — a permission refusal is `forbidden`, an identifier no record answers is `empty`, a
 * validation refusal is `conflict`, and every other rejection is `offline` — and a pending read is
 * `loading`. The record side reads the freshness report the result itself carries: a source that did
 * not answer makes the read `offline`, the approval-gate source reported stale makes it `stale`, and
 * a source that answered incompletely makes it `partial`. Everything else returns `undefined`, the
 * boundary's documented "no exceptional state holds".
 *
 * An empty decision list is deliberately not a screen state: the header and the other blocks stay
 * readable when one list is empty, so the table's own empty sentence reports it. Its input is the
 * query's settled facts rather than a flag of this screen's, so the state cannot disagree with the
 * read it describes and no effect is needed to keep the two in step.
 */
function deriveScreenState({
  hasPolicyId,
  isPending,
  error,
  result,
}: ScreenStateInput): ScreenState | undefined {
  if (!hasPolicyId) {
    return 'empty';
  }

  if (isProblem(error)) {
    switch (error.type) {
      case 'permission':
        return 'forbidden';
      case 'not-found':
        return 'empty';
      case 'validation':
        return 'conflict';
      case 'policy':
      case 'simulated-write-back':
        return 'offline';
    }
  }

  if (error !== null && error !== undefined) {
    return 'offline';
  }

  if (isPending || result === undefined) {
    return 'loading';
  }

  const freshness = result.meta.freshness;

  if (reportsState(freshness, 'unavailable')) {
    return 'offline';
  }

  if (staleRecordOf(freshness) !== undefined) {
    return 'stale';
  }

  if (reportsState(freshness, 'partial')) {
    return 'partial';
  }

  return undefined;
}

/* ---------------------------------------------------------------------------------------------
 * The shared status vocabulary, applied to a decision's outcome and a request's status
 * ------------------------------------------------------------------------------------------- */

/**
 * What one recorded outcome amounts to in the shared status vocabulary.
 *
 * No input fixes this mapping, so it is this screen's decision and it is made once: an outcome the
 * record marks `allowed` or `succeeded` reads as a pass, `blocked` reads as a warning — a rule
 * refused it rather than the call failing — and `failed` reads as a failure. The label beside the
 * icon is always the record's own spelling, so the meaning never replaces what the event says and no
 * status is carried by colour alone (rule B-3). The map is exhaustive by type, so an outcome added
 * to `AuditResult` fails this file's compilation.
 */
const RESULT_MEANINGS = {
  allowed: 'pass',
  blocked: 'warning',
  succeeded: 'pass',
  failed: 'fail',
} as const satisfies Record<AuditResult, StatusMeaning>;

/**
 * What one request's status amounts to in the same vocabulary: `pending` is the warning that awaits
 * a decision, `granted` a pass and `denied` a failure.
 *
 * A `Record` keyed on `PolicyExceptionStatus` rather than a `switch` with a fallback, so a status
 * added to that union fails to compile here instead of rendering as whichever arm happened to be
 * last. Nothing in the demonstration decides a request, so `pending` is the state the grant flow
 * leaves behind — but the mapping covers every member the type declares, because the record is the
 * service's and this screen prints what it is given.
 */
const REQUEST_STATUS_MEANINGS = {
  pending: 'warning',
  granted: 'pass',
  denied: 'fail',
} as const satisfies Record<PolicyExceptionStatus, StatusMeaning>;

/**
 * One request's status, as icon, label and colour together.
 *
 * The label is the record's own word for the state, so a reader is told what the record says rather
 * than a paraphrase of it. The clock icon marks the one state that awaits a decision, which is the
 * icon `meaningOf` gives the `pending` pin state, so "awaiting a decision" reads the same here as it
 * does on the canvas.
 */
function requestStatusIndicator(status: PolicyExceptionStatus): ReactElement {
  const meaning = REQUEST_STATUS_MEANINGS[status];

  return status === 'pending' ? (
    <StatusIndicator meaning={meaning} label={status} icon={PENDING_CLOCK_ICON} />
  ) : (
    <StatusIndicator meaning={meaning} label={status} />
  );
}

/* ---------------------------------------------------------------------------------------------
 * The two tables
 * ------------------------------------------------------------------------------------------- */

/**
 * One row of the requests table: the recorded request, and the key that keeps a row on its own DOM
 * node across a re-render.
 *
 * A request carries no identifier of its own — `PolicyException` is the terms and the personas, not
 * a record key — so the key is composed from the members that identify it in the session, with its
 * position as the tie-break for two requests a reader made with the same terms. It is a React key
 * and nothing else: it is never displayed, never compared and never parsed.
 */
interface PendingRequestRow {
  /** The key React keeps the row on. */
  readonly key: string;

  /** The request the row prints. */
  readonly request: PolicyException;
}

/**
 * The requests in the order the service supplied them — the record's own "newest first" — with a
 * stable key each.
 */
function pendingRowsOf(requests: readonly PolicyException[]): readonly PendingRequestRow[] {
  return requests.map((request, index) => ({
    key: `${request.requestedBy} ${request.expiresAt} ${String(index)}`,
    request,
  }));
}

/**
 * The decisions table's columns, in the order a reader follows them: when the decision was recorded,
 * who or what recorded it, what it recorded, the record it is about, its outcome and — when a policy
 * decided the outcome — the policy that decided it.
 *
 * Every cell prints a member of the event exactly as the trail holds it: the instant and the two
 * identifiers in the mono face with tabular figures (AAP 0.5.3), the action and the outcome in the
 * record's own spelling. A blocked row therefore names the policy that caused it wherever the event
 * carries one, which is the rule the contracts §6 record supplies rather than a rule this screen
 * infers (rule P-6).
 */
const DECISION_COLUMNS: readonly TableColumn<AuditEvent>[] = [
  {
    id: 'timestamp',
    header: POLICY_DETAIL_SCREEN_TEXT.decisionRecorded,
    render: (event) => <MonoValue value={event.timestamp} kind="timestamp" />,
  },
  {
    id: 'actor',
    header: POLICY_DETAIL_SCREEN_TEXT.decisionActor,
    render: (event) => (
      <span className={ACTOR_CLASSES}>
        <MonoValue value={event.actorId} kind="id" />
        <span className={ACTOR_KIND_CLASSES}>{event.actorType}</span>
      </span>
    ),
  },
  {
    id: 'action',
    header: POLICY_DETAIL_SCREEN_TEXT.decisionAction,
    render: (event) => event.action,
  },
  {
    id: 'objectRef',
    header: POLICY_DETAIL_SCREEN_TEXT.decisionRecord,
    render: (event) => <MonoValue value={event.objectRef} kind="id" />,
  },
  {
    id: 'result',
    header: POLICY_DETAIL_SCREEN_TEXT.decisionOutcome,
    render: (event) => (
      <StatusIndicator meaning={RESULT_MEANINGS[event.result]} label={event.result} />
    ),
  },
  {
    id: 'policy',
    header: POLICY_DETAIL_SCREEN_TEXT.decisionPolicy,
    render: (event) =>
      event.policyId === undefined ? null : <MonoValue value={event.policyId} kind="id" />,
  },
];

/**
 * The requests table's columns: where the request stands, why it was made, when it stops applying,
 * who made it and whose approval it needs.
 *
 * The status is the shared indicator, so it is never carried by colour alone; the reason is the
 * requester's own sentence; the expiry and the two personas are record values printed in the mono
 * face. No column computes, ranks or reformats anything (rule P-6).
 */
const REQUEST_COLUMNS: readonly TableColumn<PendingRequestRow>[] = [
  {
    id: 'status',
    header: POLICY_DETAIL_SCREEN_TEXT.requestStatus,
    render: (row) => requestStatusIndicator(row.request.status),
  },
  {
    id: 'reason',
    header: POLICY_DETAIL_SCREEN_TEXT.requestReason,
    render: (row) => <span className={REASON_CLASSES}>{row.request.reason}</span>,
  },
  {
    id: 'expiresAt',
    header: POLICY_DETAIL_SCREEN_TEXT.requestExpiry,
    render: (row) => <MonoValue value={row.request.expiresAt} kind="timestamp" />,
  },
  {
    id: 'requestedBy',
    header: POLICY_DETAIL_SCREEN_TEXT.requestRequester,
    render: (row) => <MonoValue value={row.request.requestedBy} kind="id" />,
  },
  {
    id: 'secondApproverId',
    header: POLICY_DETAIL_SCREEN_TEXT.requestSecondApprover,
    render: (row) => <MonoValue value={row.request.secondApproverId} kind="id" />,
  },
];

/**
 * The sort callback `DataTable` requires and neither table reaches.
 *
 * No column above declares `sortable`, so `DataTable` renders no sort control and there is nothing to
 * call. Re-ordering the decisions would replace the order the service returned with one computed in a
 * component (rule P-6), and re-ordering the requests would replace the record's own "newest first",
 * so the callback keeps the supplied order and does nothing else.
 */
const KEEP_SUPPLIED_ROW_ORDER = (): void => {
  /* Unreachable: no column of either table declares `sortable`, so no control can report a sort. */
};

/* ---------------------------------------------------------------------------------------------
 * The grant control's gate
 * ------------------------------------------------------------------------------------------- */

/** What the grant control's gate reads. */
interface GrantGateInput {
  /** Whether the bound adapter carries the demonstration capability that reports a persona. */
  readonly hasCapability: boolean;

  /** Whether the acting persona has not been read yet. */
  readonly isPending: boolean;

  /** Whether reading the acting persona failed. */
  readonly isError: boolean;

  /** The permissions the acting persona holds, or `undefined` while they are unknown. */
  readonly permissions: readonly Permission[] | undefined;
}

/**
 * Why the grant control cannot act, or `null` when it can.
 *
 * One sentence per way the control is blocked, in the order a reader can act on: no capability to
 * read a persona from, a read still in flight, a read that failed, and a persona that does not hold
 * the permission the write requires. The gate decides presentation only — the adapter evaluates the
 * matrix itself, so a reader who bypasses the control is refused by the service for the same reason
 * (rule P-3).
 */
function grantBlockerOf({
  hasCapability,
  isPending,
  isError,
  permissions,
}: GrantGateInput): string | null {
  if (!hasCapability) {
    return POLICY_DETAIL_SCREEN_TEXT.grantNoIdentity;
  }

  if (isPending) {
    return POLICY_DETAIL_SCREEN_TEXT.grantIdentityPending;
  }

  if (isError || permissions === undefined) {
    return POLICY_DETAIL_SCREEN_TEXT.grantIdentityFailed;
  }

  return permissions.includes(POLICY_EXCEPTION_REQUEST)
    ? null
    : POLICY_DETAIL_SCREEN_TEXT.grantNotPermitted;
}

/* ---------------------------------------------------------------------------------------------
 * Row identity
 * ------------------------------------------------------------------------------------------- */

/**
 * A decision's key in the table: the event's identifier, which the chain holds once per event, so a
 * re-render keeps each row on its own DOM node instead of remounting the list.
 */
function decisionKeyOf(event: AuditEvent): string {
  return event.id;
}

/** A request's key in the table, composed once by {@link pendingRowsOf}. */
function requestRowKeyOf(row: PendingRequestRow): string {
  return row.key;
}

/* ---------------------------------------------------------------------------------------------
 * The screen — AAP 0.12.4 SCR-07, rules P-4 and P-1
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link PolicyDetailScreen}. */
export interface PolicyDetailScreenProps {
  /**
   * The shell's plant and product selection.
   *
   * The policy set is group-wide rather than plant-scoped, so the port's read takes the identifier
   * alone; the selection is carried in the cache key instead, so a change re-reads the policy as
   * every other screen's reads do, while the records the service returns stay exactly the ones the
   * acting role may see.
   */
  readonly scope: Scope;
}

/**
 * SCR-07's policy detail, at `/admin/policies/:policyId`.
 *
 * Two reads, both through the service boundary (rule P-2): the policy through `getPolicy` under one
 * cache entry per identifier and selection, and the acting persona through the demonstration
 * capability's `getActiveUser`, which decides whether the grant control can act. The identifier
 * arrives from the route and the selection from the shell, so nothing is typed here — every
 * identifier, statement, persona and instant on screen is a member of a payload the port returned
 * (rule P-6).
 *
 * The component keeps no record of its own. The only state it owns is whether the grant dialog is
 * open, so a re-render can never change a record, and a request the reader records appears because
 * the detail read is invalidated once the port resolves it rather than because this screen holds a
 * copy of it (AAP 0.12.2 `PolicyDetail.pendingExceptions`).
 *
 * @param props - The shell's plant and product selection.
 * @returns The page header with the grant action, the declared-or-evaluated block, the recorded
 *   decisions, the time-boxed exception requests, and the grant dialog while it is open — all of it
 *   inside the boundary that explains a record which could not be read.
 */
export function PolicyDetailScreen({ scope }: PolicyDetailScreenProps): ReactElement {
  const service = useService();
  const demonstration = useDemonstration();
  const queryClient = useQueryClient();
  const params = useParams<{ policyId: string }>();

  const policyIdentifier = params.policyId;

  const [isGranting, setIsGranting] = useState(false);

  /*
   * The policy read. Retries are off on purpose, matching the cache the shell creates: the records are
   * deterministic, so a silent second attempt would only delay the state the boundary reports, and the
   * boundary offers the reader an explicit retry for the case where repeating the call can succeed.
   * `skipToken` disables the call when the route named no policy at all, so a misaddressed route reads
   * nothing rather than asking the service for an empty identifier.
   */
  const policyQuery = useQuery<Result<PolicyDetail>, unknown>({
    queryKey: ['getPolicy', policyIdentifier, scope.plants, scope.products],
    queryFn:
      policyIdentifier === undefined ? skipToken : () => service.getPolicy(policyIdentifier),
    retry: false,
  });

  /*
   * The acting persona. Read fresh on every mount rather than taken from the persona the shell seeded
   * at start-up, because a reader may have switched role since: the adapter is enforcing whichever
   * persona the switch selected, and the gate below has to describe the role a request would actually
   * be evaluated against. The capability is absent on an adapter without identity, and `skipToken`
   * then reads nothing.
   */
  const actingUserQuery = useQuery<Result<ActiveUser>, unknown>({
    queryKey: ['getActiveUser'],
    queryFn: demonstration === null ? skipToken : () => demonstration.getActiveUser(),
    retry: false,
  });

  const result = policyQuery.data;
  const detail = result?.data;

  const state = deriveScreenState({
    hasPolicyId: policyIdentifier !== undefined,
    isPending: policyQuery.isPending,
    error: policyQuery.error,
    result,
  });
  const staleRecord = result === undefined ? undefined : staleRecordOf(result.meta.freshness);
  const forbiddenRecord = forbiddenOf(policyQuery.error);
  const emptyMessage =
    policyIdentifier === undefined
      ? POLICY_DETAIL_SCREEN_TEXT.noPolicyIdentifier
      : serviceMessageOf(policyQuery.error, 'not-found');

  const grantBlocker = grantBlockerOf({
    hasCapability: demonstration !== null,
    isPending: actingUserQuery.isPending,
    isError: actingUserQuery.isError,
    permissions: actingUserQuery.data?.data.permissions,
  });

  const retryRead = (): void => {
    void policyQuery.refetch();
  };

  const openGrantDialog = (): void => {
    setIsGranting(true);
  };

  const closeGrantDialog = (): void => {
    setIsGranting(false);
  };

  /*
   * A recorded request is a write to this policy, so the detail read is marked stale and the pending
   * request appears from the payload the service now answers with. The prefix key matches every
   * selection the screen was read under, which is the granularity a write needs because the record it
   * moved is shared by all of them. The dialog invalidates the other reads its write touched.
   */
  const handleRequestRecorded = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['getPolicy'] });
  };

  return (
    <div className={SCREEN_CLASSES}>
      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryRead}
        emptyMessage={emptyMessage}
        partialMessage={POLICY_DETAIL_SCREEN_TEXT.partial}
        conflictMessage={POLICY_DETAIL_SCREEN_TEXT.conflict}
        forbidden={forbiddenRecord}
      >
        {detail === undefined ? null : (
          <div className={PAGE_CLASSES}>
            {/*
              The header names the record, so it renders with the record: the identifier and the
              statement are the payload's own, and the grant action sits beside them. The control is
              written once per state on purpose — `ActionButtonProps` is a discriminated union, so a
              disabled control cannot be constructed without the sentence that explains why.
            */}
            <PageHeader
              eyebrow={
                <>
                  <span>{POLICY_DETAIL_SCREEN_TEXT.policyCaption}</span>
                  <MonoValue value={detail.id} kind="id" />
                </>
              }
              title={detail.title}
              description={detail.statement}
              actions={
                grantBlocker === null ? (
                  <ActionButton variant="primary" onClick={openGrantDialog}>
                    {POLICY_DETAIL_SCREEN_TEXT.grantAction}
                  </ActionButton>
                ) : (
                  <ActionButton variant="primary" disabled disabledReason={grantBlocker}>
                    {POLICY_DETAIL_SCREEN_TEXT.grantAction}
                  </ActionButton>
                )
              }
            />

            <Card title={POLICY_DETAIL_SCREEN_TEXT.evaluationTitle}>
              {detail.evaluated ? (
                <StatusIndicator
                  meaning="review"
                  label={POLICY_DETAIL_SCREEN_TEXT.evaluatedStatus}
                />
              ) : (
                <StatusIndicator meaning="simulated" label={DECLARED_LABEL} />
              )}
              <p className={DETAIL_CLASSES}>
                {detail.evaluated
                  ? POLICY_DETAIL_SCREEN_TEXT.evaluatedDetail
                  : POLICY_DETAIL_SCREEN_TEXT.declaredDetail}
              </p>
            </Card>

            <Card title={POLICY_DETAIL_SCREEN_TEXT.decisionsTitle}>
              {/*
                The decisions are the record of what a browser-side control did, so the panel carries
                that control's fixed label next to the events themselves rather than relying on the
                page-level badge (rules P-1 and P-4).
              */}
              <StatusIndicator meaning="simulated" label={SIMULATED_CONTROL_LABEL} />
              <DataTable
                columns={DECISION_COLUMNS}
                rows={detail.recentDecisions}
                getRowKey={decisionKeyOf}
                caption={POLICY_DETAIL_SCREEN_TEXT.decisionsCaption}
                sort={null}
                onSort={KEEP_SUPPLIED_ROW_ORDER}
                emptyMessage={
                  detail.evaluated
                    ? POLICY_DETAIL_SCREEN_TEXT.decisionsEmpty
                    : POLICY_DETAIL_SCREEN_TEXT.declaredDecisionsEmpty
                }
              />
            </Card>

            <Card title={POLICY_DETAIL_SCREEN_TEXT.requestsTitle}>
              <DataTable
                columns={REQUEST_COLUMNS}
                rows={pendingRowsOf(detail.pendingExceptions)}
                getRowKey={requestRowKeyOf}
                caption={POLICY_DETAIL_SCREEN_TEXT.requestsCaption}
                sort={null}
                onSort={KEEP_SUPPLIED_ROW_ORDER}
                emptyMessage={POLICY_DETAIL_SCREEN_TEXT.requestsEmpty}
              />
            </Card>
          </div>
        )}
      </StateBoundary>

      {/*
        The grant flow, composed with the record this page is showing. It is rendered only while the
        record is loaded, because the dialog names the policy it is requested against.
      */}
      {isGranting && detail !== undefined ? (
        <GrantExceptionDialog
          policyId={detail.id}
          policyLabel={detail.title}
          onClose={closeGrantDialog}
          onSubmitted={handleRequestRecorded}
        />
      ) : null}
    </div>
  );
}

