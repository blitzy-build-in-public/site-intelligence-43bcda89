/**
 * SCR-07 Sovereignty and policies, at `/admin/sovereignty`: the configuration this deployment
 * declares, the outbound ledger the audit trail supports, the policy set with the decisions the
 * engine recorded against it, and SCR-07's two actions — grant a time-boxed policy exception and
 * export the evidence pack.
 *
 * Fixing inputs: AAP 0.12.4's SCR-07 row (the deployment summary, the ten declared rows with status,
 * record and last-declared date, the outbound ledger with its thirty-day counts, and the policy list
 * with recent decisions), AAP 0.15.1's row for this path, and stage S1, which owns it. Rules P-4 and
 * P-1 govern every label on the page: the rows and the summary are **declared configuration** and
 * carry the exact `Declared, not verified` string of specification §5.3, while the ledger's two
 * count columns are **computed from audit events** by `src/domain/aggregation/ledger.ts` and carry
 * `Simulated calculation`. Neither label is spelled in this module; both are read from `SIM_LABELS`.
 *
 * WHAT THIS SCREEN MAY NOT SAY (rule P-4). Nothing here states or implies that the workspace
 * establishes a residency boundary, prevents a copy or withstands an edit. The summary and every
 * declares row are labelled as declarations; the decisions panel is labelled `Simulated control`,
 * because the engine that recorded those events runs in this browser; and the wording below says
 * what a record declares rather than what the deployment has been shown to do. The vocabulary of an
 * asserted posture is kept out of this file entirely — of a string, a sentence and a comment alike —
 * because a claim the demonstration cannot support must not ship in a label.
 *
 * DECLARED VERSUS COMPUTED, KEPT APART. `DeploymentSummary`, `SovereigntyRow` and `LedgerRow` mix the
 * two kinds of value, and this screen labels each by what it is: `tier`, `residency`,
 * `outboundBlocked`, each row's `status`, `record` and `lastDeclaredOn`, and the ledger's `endpoint`,
 * `purpose`, `state` and `lastAttempt` are record text shown under `Declared, not verified`; only
 * `LedgerRow.allowed` and `LedgerRow.blocked` are figures, and the ledger region carries
 * `Simulated calculation` above the two columns that print them. No declared value is presented as a
 * computed one and no count as a declaration.
 *
 * WHERE EVERY VALUE COMES FROM, AND WHERE IT DOES NOT (rule P-2 and P-6). Both reads go through the
 * port: `getSovereigntyStatus` answers the summary, the declared rows and the ledger in one payload,
 * and `listPolicies` answers the policy set with each policy's recorded decisions and its pending
 * exception requests. The acting persona and the roster a second approver is chosen from come from
 * the demonstration capability, which is where the port carries no identity. This module types no
 * endpoint, count, date, amount, policy identifier or row count: the SD rows are rendered exactly as
 * the payload carries them, so a record set that holds a different number of rows renders that
 * number. It performs no arithmetic over business data — the only ordering it applies is the
 * decisions list's, which sorts the payload's own events by their own instants.
 *
 * THE TWO ACTIONS, EACH OF WHICH ACTS (rule P-8). "Export evidence pack" calls the port's
 * `exportEvidencePack` and offers the payload it returns as a file, built in the browser from the
 * document the service composed; it is disabled with a sentence while a download is being prepared,
 * and a refusal the service raises is reported beside the actions rather than swallowed.
 * "Grant time-boxed exception" opens `./grant-exception-dialog` for the policy the payload supplies
 * first, with the second approvers read from the demonstration roster; it is disabled with a
 * sentence naming the condition when the acting persona cannot be read, when it does not hold
 * `policy.exception.request`, or when the payload holds no policy at all. Neither check decides
 * anything the adapter does not decide again (rule P-3).
 *
 * REPORTED DECISIONS AND GAPS, each recorded where it bites:
 * 1. "Grant time-boxed exception" is one control, in the page header, because AAP 0.12.4 assigns it
 *    to SCR-07 as a whole. A time-boxed exception is always requested against one policy, so the
 *    action targets the first policy the service returns in its own order and the dialog names that
 *    policy; the per-policy route (`./policy-detail-screen.tsx`) offers the same flow against the
 *    policy it shows. Giving each row its own copy of the control would put several controls with
 *    one accessible name on the page.
 * 2. `DeploymentSummary` carries no configuration record, so the summary cannot print the reference
 *    behind its own declaration the way each row prints `record`. The record identifiers are on the
 *    rows, and `src/types/screen-dto.ts` is not widened from a screen component; should the summary
 *    gain one, it renders beside the label and nothing else here changes.
 * 3. `LedgerRow` carries no evidence reference (contracts §3 fixes its six members), so a count
 *    cannot open the evidence drawer. `OutboundLedger` associates both count columns with the
 *    region's visible label instead, and no `EvidenceRef` or `MetricTile` is composed for a figure
 *    that has no reference to carry.
 * 4. The second approver is read from `DemonstrationControls.listPersonas`, which is absent on an
 *    adapter without seeded personas; the dialog then offers no choice and disables its own submit,
 *    which is the dialog's decided behaviour rather than a gap this screen papers over.
 * 5. The counts in the ledger are the aggregate's, reaching this screen only through the payload
 *    (AAP 0.8). This screen counts nothing, and no state of its own can disagree with them.
 *
 * Rules this module is built to satisfy:
 * - B-1: nothing here fetches, names an address or loads an asset; the export is a browser-built
 *   file from a payload the service returned, and no endpoint is turned into a link.
 * - B-2: no credential, no configuration switch and no environment read.
 * - B-3: one `<h1>` from `PageHeader`, table semantics, captions and the `J`/`K` cursor from
 *   `DataTable`, every control a keyboard-operable `ActionButton` with the theme's focus ring and the
 *   minimum target, every status carried by icon, label and colour together, role-token colours
 *   only, and no motion that `prefers-reduced-motion` would have to suppress.
 * - P-1 and P-4: every label is a member of `SIM_LABELS`, applied where its element surfaces.
 * - P-2: the port and the demonstration capability are the only data boundaries reachable here.
 * - P-6: no figure, instant, identifier or label text is typed in this file.
 * - P-8: each control either acts or is disabled with the sentence that explains why, which the
 *   discriminated `ActionButtonProps` union makes structural.
 */
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';

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
  ExportPayload,
  Freshness,
  FreshnessState,
  Permission,
  PolicyDetail,
  Problem,
  ProblemType,
  Result,
  Scope,
  ScreenState,
  SimLabel,
  SovereigntyRow,
  SovereigntyStatus,
} from '../../types';
import { GrantExceptionDialog } from './grant-exception-dialog';
import type { GrantExceptionApprover } from './grant-exception-dialog';
import { OutboundLedger } from './outbound-ledger';

/* ---------------------------------------------------------------------------------------------
 * The fixed labels and the one permission this screen names
 * ------------------------------------------------------------------------------------------- */

/**
 * The `Declared, not verified` label of specification §5.3, read from the tuple that holds the seven
 * fixed strings once (rule P-1, AAP 0.10). It marks the deployment summary and every declared row,
 * because each of them states configuration rather than a checked state (rule P-4).
 */
const DECLARED_LABEL: SimLabel = SIM_LABELS[6];

/**
 * The `Simulated calculation` label of specification §5.3, carried by the ledger's two count
 * columns: those are the only figures on this page, and they are counted from audit events by the
 * aggregation module rather than declared (AAP 0.8, rule P-1).
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/**
 * The `Simulated control` label of specification §5.3, which marks the panel printing the decisions
 * the policy engine recorded: that engine runs in this browser rather than in a deployment, so its
 * record is the mechanism rather than a deployment's control (rule P-4).
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
 * Every sentence, caption and column header this screen states, held here so the wording has one
 * owner: the component renders these strings and a suite names them through this object instead of
 * retyping them.
 *
 * None of them carries a figure, an amount, an identifier, a date or a persona (rule P-6), and none
 * claims that the workspace establishes a configuration, prevents a copy or withstands an edit (rule
 * P-4). The two actions are the words AAP 0.12.4 fixes for them; the rest is this screen's own and
 * says what a region holds rather than what a deployment would do.
 */
export const SOVEREIGNTY_SCREEN_TEXT = {
  /** The eyebrow above the title: the product name rule P-7 fixes. */
  eyebrow: 'Site Intelligence',

  /** The screen's title, in the one level-one heading it renders. */
  title: 'Sovereignty and policies',

  /** What the page holds, in the reader's terms. */
  description:
    'The configuration this deployment declares, the outbound endpoints it declares blocked, and the ' +
    'policies the engine evaluates beside the ones the deployment only declares.',

  /** The grant action's label, which AAP 0.12.4 fixes for SCR-07. */
  grantAction: 'Grant time-boxed exception',

  /** The export action's label, which AAP 0.12.4 fixes for SCR-07. */
  exportAction: 'Export evidence pack',

  /** The export control's reason while the pack is being built and offered as a file. */
  exportPreparing: 'The evidence pack is being prepared for download.',

  /** What is reported beside the actions when the export did not produce a file. */
  exportFailed: 'The evidence pack could not be prepared, so no file was offered.',

  /** The deployment summary's heading. */
  summaryTitle: 'Deployment summary',

  /** The summary's declared-tier caption. */
  summaryTier: 'Declared processing tier',

  /** The summary's declared-residency caption. */
  summaryResidency: 'Declared data residency',

  /** The summary's outbound caption. */
  summaryOutbound: 'Declared outbound state',

  /** The summary's last-declared caption. */
  summaryLastDeclared: 'Last declared',

  /** What the summary says when the record declares outbound traffic blocked. */
  outboundBlocked: 'Outbound traffic declared blocked',

  /** What the summary says when the record declares outbound traffic permitted. */
  outboundPermitted: 'Outbound traffic declared permitted',

  /** The declared-rows heading. */
  rowsTitle: 'Declared configuration',

  /** The declared rows' accessible name. */
  rowsCaption: 'Configuration the deployment declares, row by row',

  /** What the declared rows table says when the record carries no row. */
  rowsEmpty: 'The deployment record declares no configuration row.',

  /** The declared rows' identifier column. */
  columnRow: 'Row',

  /** The declared rows' label column. */
  columnControl: 'Control declared',

  /** The declared rows' status column. */
  columnStatus: 'Status',

  /** The declared rows' record column. */
  columnRecord: 'Record',

  /** The declared rows' last-declared column. */
  columnLastDeclared: 'Last declared',

  /** The ledger region's caption, which also names its table. */
  ledgerCaption: 'Outbound ledger, with the counts the audit trail supports over the window',

  /** What the ledger says when the record declares no endpoint. */
  ledgerEmpty: 'The deployment record declares no outbound endpoint.',

  /** The policy list's heading. */
  policiesTitle: 'Policies',

  /** The policy list's accessible name. */
  policiesCaption: 'Policies the engine evaluates and policies the deployment declares',

  /** What the policy list says when the service returns no policy. */
  policiesEmpty: 'The policy set is empty, so there is nothing to show here.',

  /** The policy list's status column: a policy the engine evaluates. */
  policyEvaluated: 'Evaluated by the policy engine',

  /** The policy list's status column when a request awaits a decision. */
  policyRequestPending: 'A request awaits a second approval',

  /** The policy list's identifier column. */
  columnPolicy: 'Policy',

  /** The policy list's title column. */
  columnPolicyTitle: 'Title',

  /** The policy list's evaluation column. */
  columnEvaluation: 'Declared or evaluated',

  /** The policy list's requests column. */
  columnRequests: 'Exception requests',

  /** The recent decisions' heading. */
  decisionsTitle: 'Recent decisions',

  /** The recent decisions' accessible name. */
  decisionsCaption: 'Decisions the policy engine recorded, most recent first',

  /** What the recent decisions say when the engine recorded none. */
  decisionsEmpty: 'The policy engine has recorded no decision in this session.',

  /** A decision's instant column. */
  columnRecorded: 'Recorded',

  /** A decision's actor column. */
  columnActor: 'Actor',

  /** A decision's action column. */
  columnAction: 'Action',

  /** A decision's affected-record column. */
  columnDecisionRecord: 'Record',

  /** A decision's outcome column. */
  columnOutcome: 'Outcome',

  /** The notice above a read that a source answered incompletely. */
  partial:
    'A source answered this read incompletely, so a declared row or a decision may be missing from ' +
    'the tables below.',

  /** The notice above a read the service refused against the records as they stand. */
  conflict:
    'The service refused this read against the records as they stand. Read the page again to see ' +
    'them as they now are.',

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

  /** The grant control's reason when the payload holds no policy to request against. */
  grantNoPolicy:
    'The policy set holds no policy, so there is none to request a time-boxed exception against.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The page frame: one column, separated by the 4 px grid rather than by a child's margin. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-4';

/** The loaded page: the five blocks, in the same single column. */
const PAGE_CLASSES = 'flex min-w-0 flex-col gap-4';

/** A supporting sentence, one step down the type scale in the secondary text role. */
const DETAIL_CLASSES = 'text-13 break-words text-text-secondary';

/**
 * A declared label beside the record's own status word, on one wrapping baseline, so the fixed label
 * travels with the row rather than only with the panel it sits under (rule P-1).
 */
const LABEL_ROW_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2 text-13';

/** The caption role for a label printed as text beside a status. */
const CAPTION_CLASSES = 'text-12 text-text-caption';

/** The summary's definition list: one column, one declared value per row. */
const SUMMARY_LIST_CLASSES = 'flex min-w-0 flex-col gap-2';

/** One declared value: its caption beside its reading, wrapping rather than overflowing. */
const SUMMARY_ROW_CLASSES = 'flex min-w-0 flex-wrap items-baseline gap-2';

/** A declared value's caption, in the caption role the token layer fixes. */
const SUMMARY_TERM_CLASSES = 'min-w-0 text-12 text-text-caption';

/** A declared value's reading, in the primary text role. */
const SUMMARY_VALUE_CLASSES = 'min-w-0 break-words text-14 text-text-primary';

/** A decision's actor and the record's own word for what kind of actor it is, on one baseline. */
const ACTOR_CLASSES = 'inline-flex min-w-0 flex-wrap items-baseline gap-2';

/** The caption role for the actor kind, one step down from the identifier beside it. */
const ACTOR_KIND_CLASSES = 'text-12 text-text-caption';

/** The dash that states a row holds no reading, so the cell can never be blank. */
const MARKER_CLASSES = 'text-text-secondary';

/** The dash itself: a marker of absence rather than a substituted value. */
const NO_VALUE_MARKER = '—';

/**
 * The region an export refusal is reported in. It is a live region, so a failure is announced when it
 * arrives rather than only when a reader next walks the page (rule B-3); it states that no file was
 * offered and carries the service's own message beside that (rule P-8).
 */
const NOTICE_CLASSES =
  'flex min-w-0 flex-col gap-1 rounded-card border border-hairline bg-surface-2 px-3 py-2';

/* ---------------------------------------------------------------------------------------------
 * Narrowing the service's failure, and reading the freshness report
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
 * The port fails by throwing a `Problem` (AAP 0.12.3), so a screen that catches a read has to tell
 * the two apart before it can name a cause: a refusal of the record is not the same condition as a
 * failure of the call. A `TypeError` from a broken module therefore reaches the offline rendering
 * instead of being read as a refusal it never was.
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
 * The denial the forbidden card explains, or `undefined` when the failure was not a permission
 * refusal.
 *
 * The card's evidence is the failure's own: the permission the acting role lacks, the roles that hold
 * it and the trace identifier of the refused call. The card states that enforcement happens in the
 * service, which is the one thing this screen may say about authority (rule P-3).
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
 * The source behind a stale page, with the display name to print and the instant it last answered.
 *
 * The order book is looked for first, because it is the source that gates the approval a planner
 * takes next (AAP 0.2.1, T-13), and another stale source is reported when the order book is current.
 * The label comes from `SOURCE_LABELS`, the map that owns the six display names, so the banner and
 * the top bar's pill say the same words about the same source. Nothing is derived from the instant —
 * no age and no duration (rule P-6).
 */
function staleRecordOf(freshness: readonly Freshness[]): StateBoundaryStale | undefined {
  const gate = freshness.find(
    (entry) => entry.source === APPROVAL_GATE_SOURCE && entry.state === 'stale',
  );
  const stale = gate ?? freshness.find((entry) => entry.state === 'stale');

  if (stale === undefined) {
    return undefined;
  }

  return { source: stale.source, label: SOURCE_LABELS[stale.source], asOf: stale.asOf };
}

/** Whether a source in the read's freshness report answered in the state asked about. */
function reportsState(freshness: readonly Freshness[], state: FreshnessState): boolean {
  return freshness.some((entry) => entry.state === state);
}

/** What {@link deriveScreenState} reads: the read's settled facts, and the payload if it arrived. */
interface ScreenStateInput {
  /** Whether either read has yet to answer. */
  readonly isPending: boolean;

  /** The first rejection either read ended in, or `null` when neither failed. */
  readonly error: unknown;

  /** The sovereignty payload, `undefined` until the read settles. */
  readonly result: Result<SovereigntyStatus> | undefined;
}

/**
 * The one place this screen decides which of the seven states its records are in.
 *
 * The failure side comes first, because a refusal is final: a permission refusal is `forbidden`, an
 * identifier no record answers is `empty`, a validation refusal is `conflict`, and every other
 * rejection is `offline`. A read still in flight is `loading`. The record side then reads the
 * freshness report the result itself carries: a source that did not answer makes the page `offline`,
 * a stale source makes it `stale`, and a source that answered incompletely makes it `partial`.
 * Everything else returns `undefined`, the boundary's documented "no exceptional state holds".
 *
 * The input is the queries' settled facts rather than a flag of this screen's, so the state cannot
 * disagree with the reads it describes and no effect is needed to keep the two in step. An empty
 * table is deliberately not a screen state: the other blocks stay readable when one list is empty, so
 * the table's own empty sentence reports it.
 */
function deriveScreenState({
  isPending,
  error,
  result,
}: ScreenStateInput): ScreenState | undefined {
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
 * The route a policy row opens, and the neutral collections a memoised member needs
 * ------------------------------------------------------------------------------------------- */

/**
 * The route a policy row activates: the per-policy page AAP 0.12.4's SCR-07 row fixes, to which the
 * row's own identifier is appended. It is a route of this application, not an address anything is
 * requested from (rule B-1), and the identifier is the record's own rather than a typed one.
 */
const POLICIES_ROUTE = '/admin/policies';

/**
 * The policy set of a read that has not settled yet.
 *
 * A shared frozen empty array, so a memoised member over it needs no fabricated record and a render
 * before the payload arrives allocates nothing new.
 */
const NO_POLICIES: readonly PolicyDetail[] = [];

/** The roster of a read that has not settled yet, for the same reason. */
const NO_PERSONAS: readonly ActiveUser[] = [];

/* ---------------------------------------------------------------------------------------------
 * The three tables, each printing a member of the payload it was handed
 * ------------------------------------------------------------------------------------------- */

/**
 * The declared rows, in the order the record holds them: the row's key, what it declares, its status
 * beside the fixed label, the record the declaration rests on and the date it was last declared.
 *
 * Every cell prints a member exactly as the payload supplied it — the two identifiers in the mono
 * face with tabular figures (AAP 0.5.3) and the date as the record states it. The status cell carries
 * the record's own word beside the `Declared, not verified` label, so the label travels with the row
 * rather than only with the panel above it (rules P-1, P-4). No column is sortable: re-ordering these
 * rows would replace the record's own order with one this module computed.
 */
const SOVEREIGNTY_COLUMNS: readonly TableColumn<SovereigntyRow>[] = [
  {
    id: 'row',
    header: SOVEREIGNTY_SCREEN_TEXT.columnRow,
    render: (row) => <MonoValue value={row.id} kind="id" />,
  },
  {
    id: 'control',
    header: SOVEREIGNTY_SCREEN_TEXT.columnControl,
    render: (row) => <span className={DETAIL_CLASSES}>{row.label}</span>,
  },
  {
    id: 'status',
    header: SOVEREIGNTY_SCREEN_TEXT.columnStatus,
    render: (row) => (
      <span className={LABEL_ROW_CLASSES}>
        <StatusIndicator meaning="simulated" label={row.status} />
        <span className={CAPTION_CLASSES}>{DECLARED_LABEL}</span>
      </span>
    ),
  },
  {
    id: 'record',
    header: SOVEREIGNTY_SCREEN_TEXT.columnRecord,
    render: (row) => <MonoValue value={row.record} kind="id" />,
  },
  {
    id: 'last-declared',
    header: SOVEREIGNTY_SCREEN_TEXT.columnLastDeclared,
    render: (row) => <MonoValue value={row.lastDeclaredOn} kind="timestamp" />,
  },
];

/**
 * The policy set, one row per policy: its identifier, its title, whether the engine evaluates it, and
 * whether a time-boxed exception request against it awaits a decision.
 *
 * `evaluated` is the discriminator the service supplies, so no identifier is special-cased here: a
 * policy the engine does not evaluate is rendered as declared configuration under the fixed label
 * (rule P-4), and the decision of which policy that is stays the record's own fact (rule P-6). The
 * requests column states presence rather than a number — a count is a figure, and no aggregate for
 * one exists (rule P-6) — so it shows the record's pending state or the dash that marks its absence.
 */
const POLICY_COLUMNS: readonly TableColumn<PolicyDetail>[] = [
  {
    id: 'policy',
    header: SOVEREIGNTY_SCREEN_TEXT.columnPolicy,
    render: (policy) => <MonoValue value={policy.id} kind="id" />,
  },
  {
    id: 'title',
    header: SOVEREIGNTY_SCREEN_TEXT.columnPolicyTitle,
    render: (policy) => <span className={DETAIL_CLASSES}>{policy.title}</span>,
  },
  {
    id: 'evaluation',
    header: SOVEREIGNTY_SCREEN_TEXT.columnEvaluation,
    render: (policy) =>
      policy.evaluated ? (
        <StatusIndicator meaning="review" label={SOVEREIGNTY_SCREEN_TEXT.policyEvaluated} />
      ) : (
        <StatusIndicator meaning="simulated" label={DECLARED_LABEL} />
      ),
  },
  {
    id: 'requests',
    header: SOVEREIGNTY_SCREEN_TEXT.columnRequests,
    render: (policy) =>
      policy.pendingExceptions.length === 0 ? (
        <span className={MARKER_CLASSES}>{NO_VALUE_MARKER}</span>
      ) : (
        <StatusIndicator
          meaning="warning"
          label={SOVEREIGNTY_SCREEN_TEXT.policyRequestPending}
          icon={PENDING_CLOCK_ICON}
        />
      ),
  },
];

/**
 * One decision in the recent-decisions table, with the policy whose list it was read from.
 *
 * A decision carries no own key in this context — the same event can appear under one policy only,
 * but a row still needs a stable identity — so the key is the policy's identifier joined to the
 * event's. It is a React key and nothing else: never displayed, never compared and never parsed.
 */
interface DecisionRow {
  /** The key React keeps the row on. */
  readonly key: string;

  /** The policy whose recorded decisions the event was read from. */
  readonly policyId: string;

  /** The event itself, exactly as the trail holds it. */
  readonly event: AuditEvent;
}

/**
 * Every recorded decision across the policy set, most recent first.
 *
 * The rows are gathered from each policy's own list and ordered by their own instants, read as ISO
 * 8601 text, which orders that format without arithmetic on a clock. No event is filtered and no
 * member is recomputed, so the table shows what the engine recorded rather than a selection of it
 * (rule P-6).
 */
function decisionRowsOf(policies: readonly PolicyDetail[]): readonly DecisionRow[] {
  const rows: DecisionRow[] = [];

  for (const policy of policies) {
    for (const event of policy.recentDecisions) {
      rows.push({ key: `${policy.id}:${event.id}`, policyId: policy.id, event });
    }
  }

  return rows.sort((left, right) => right.event.timestamp.localeCompare(left.event.timestamp));
}

/**
 * What one recorded outcome amounts to in the shared status vocabulary of
 * `src/components/status-indicator.tsx`.
 *
 * No input fixes this mapping, so it is this screen's decision and it is made once: an outcome the
 * record marks `allowed` or `succeeded` reads as a pass, `blocked` reads as a warning — a rule
 * refused it rather than the call failing — and `failed` reads as a failure. The label beside the
 * icon is the record's own spelling, so the meaning never replaces what the event says and no status
 * is carried by colour alone (rule B-3). The map is exhaustive by type, so an outcome added to
 * `AuditResult` fails this file's compilation.
 */
const DECISION_MEANINGS = {
  allowed: 'pass',
  blocked: 'warning',
  succeeded: 'pass',
  failed: 'fail',
} as const satisfies Record<AuditResult, StatusMeaning>;

/** One decision's outcome, as its meaning's icon and colour beside the record's own word. */
function decisionOutcomeCell(result: AuditResult): ReactElement {
  return <StatusIndicator meaning={DECISION_MEANINGS[result]} label={result} />;
}

/**
 * The recorded decisions, in the order {@link decisionRowsOf} put them: when the decision was made,
 * the policy it was made against, the actor that made it, what it recorded, the record it is about
 * and its outcome.
 *
 * Every cell prints a member of the event as the trail holds it — the instants and identifiers in the
 * mono face with tabular figures, the action and the outcome in the record's own spelling.
 */
const DECISION_COLUMNS: readonly TableColumn<DecisionRow>[] = [
  {
    id: 'recorded',
    header: SOVEREIGNTY_SCREEN_TEXT.columnRecorded,
    render: (row) => <MonoValue value={row.event.timestamp} kind="timestamp" />,
  },
  {
    id: 'policy',
    header: SOVEREIGNTY_SCREEN_TEXT.columnPolicy,
    render: (row) => <MonoValue value={row.policyId} kind="id" />,
  },
  {
    id: 'actor',
    header: SOVEREIGNTY_SCREEN_TEXT.columnActor,
    render: (row) => (
      <span className={ACTOR_CLASSES}>
        <MonoValue value={row.event.actorId} kind="id" />
        <span className={ACTOR_KIND_CLASSES}>{row.event.actorType}</span>
      </span>
    ),
  },
  {
    id: 'action',
    header: SOVEREIGNTY_SCREEN_TEXT.columnAction,
    render: (row) => <span className={DETAIL_CLASSES}>{row.event.action}</span>,
  },
  {
    id: 'record',
    header: SOVEREIGNTY_SCREEN_TEXT.columnDecisionRecord,
    render: (row) => <MonoValue value={row.event.objectRef} kind="id" />,
  },
  {
    id: 'outcome',
    header: SOVEREIGNTY_SCREEN_TEXT.columnOutcome,
    render: (row) => decisionOutcomeCell(row.event.result),
  },
];

/**
 * The sort callback `DataTable` requires and none of these tables reaches.
 *
 * No column above declares `sortable`, so the table renders no sort control and nothing can report a
 * sort. Re-ordering a payload's rows here would replace the record's own order with one computed in a
 * component (rule P-6), so the callback keeps the supplied order and does nothing else.
 */
const KEEP_SUPPLIED_ROW_ORDER = (): void => {
  /* Unreachable: no column of these tables declares `sortable`, so no control can report a sort. */
};

/** A declared row's key: its own identifier, which the record holds once per row. */
function sovereigntyRowKeyOf(row: SovereigntyRow): string {
  return row.id;
}

/** A policy's key: its identifier, which the policy set holds once per policy. */
function policyRowKeyOf(policy: PolicyDetail): string {
  return policy.id;
}

/** A decision row's key, composed once by {@link decisionRowsOf}. */
function decisionRowKeyOf(row: DecisionRow): string {
  return row.key;
}

/* ---------------------------------------------------------------------------------------------
 * The export: a file built in the browser from the payload the service composed
 * ------------------------------------------------------------------------------------------- */

/**
 * Offers one export payload as a downloaded file.
 *
 * The document arrives composed: this function writes nothing into it, removes nothing from it and
 * rewrites no field, so the `"simulated": true` flag the service set at the payload's top level
 * survives untouched (rule P-1). The name and the media type are the payload's own, which is why the
 * file a reader saves is the one the builder declared rather than a name typed here (rule P-6). The
 * blob is served from an object URL that is revoked as soon as the anchor has been activated, so the
 * file leaves the application's own origin as a local file and no request is made (rule B-1).
 *
 * The feature check is deliberate. A test environment that implements no object-URL factory leaves
 * nothing to revoke and no file to offer, and the alternative — letting the missing member throw —
 * would report a failure of the export itself, which did not fail. The service has already composed
 * and recorded the pack by the time this runs.
 */
function offerExportFile(payload: ExportPayload): void {
  if (typeof URL.createObjectURL !== 'function') {
    return;
  }

  const url = URL.createObjectURL(new Blob([payload.content], { type: payload.mediaType }));
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = payload.filename;

  /* The anchor is attached before it is activated and removed immediately after: a detached anchor's
     synthetic click is ignored by some browsers, and leaving it in the document would add an element
     to the page that no reader asked for. */
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------------------------------------
 * The grant gate: why the action cannot act, in the order a reader can act on it
 * ------------------------------------------------------------------------------------------- */

/** What the grant gate reads. */
interface GrantGateInput {
  /** Whether the bound adapter carries the demonstration capability that reports a persona. */
  readonly hasCapability: boolean;

  /** Whether the acting persona has not been read yet. */
  readonly isPending: boolean;

  /** Whether reading the acting persona failed. */
  readonly isError: boolean;

  /** The permissions the acting persona holds, or `undefined` while they are unknown. */
  readonly permissions: readonly Permission[] | undefined;

  /** Whether the payload holds a policy a request could be raised against. */
  readonly hasPolicy: boolean;
}

/**
 * Why the grant control cannot act, or `null` when it can.
 *
 * One sentence per way the control is blocked, in the order a reader can act on: no policy to request
 * against, no capability to read a persona from, a read still in flight, a read that failed, and a
 * persona that does not hold the permission the write requires. The gate decides presentation only —
 * the adapter evaluates the matrix itself, so a reader who bypasses the control is refused by the
 * service for the same reason (rule P-3).
 */
function grantBlockerOf({
  hasCapability,
  isPending,
  isError,
  permissions,
  hasPolicy,
}: GrantGateInput): string | null {
  if (!hasPolicy) {
    return SOVEREIGNTY_SCREEN_TEXT.grantNoPolicy;
  }

  if (!hasCapability) {
    return SOVEREIGNTY_SCREEN_TEXT.grantNoIdentity;
  }

  if (isPending) {
    return SOVEREIGNTY_SCREEN_TEXT.grantIdentityPending;
  }

  if (isError || permissions === undefined) {
    return SOVEREIGNTY_SCREEN_TEXT.grantIdentityFailed;
  }

  return permissions.includes(POLICY_EXCEPTION_REQUEST)
    ? null
    : SOVEREIGNTY_SCREEN_TEXT.grantNotPermitted;
}

/* ---------------------------------------------------------------------------------------------
 * The screen — AAP 0.12.4 SCR-07, rules P-4 and P-1
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link SovereigntyScreen}. */
export interface SovereigntyScreenProps {
  /**
   * The shell's plant and product selection, passed in because a screen never reads the shell's
   * stores (AAP 0.18.1).
   *
   * Declared configuration and the policy set are group-wide, so neither read takes the selection:
   * the port's members accept no scope argument. The selection is carried in the cache keys instead,
   * so a change re-reads this page as every other screen's reads do while the records the service
   * returns stay exactly the ones the acting role may see.
   */
  readonly scope: Scope;
}

/**
 * SCR-07 Sovereignty and policies, at `/admin/sovereignty`.
 *
 * Three reads and one write, all through the service boundary (rules P-2, P-3): the sovereignty
 * payload through `getSovereigntyStatus`, the policy set through `listPolicies`, and the acting
 * persona and the roster a second approver is chosen from through the demonstration capability. The
 * grant flow composes `./grant-exception-dialog`, which owns the three terms, the call and the
 * refusal rendering; this screen decides whether the control can act and tells the cache to re-read
 * the policies once a request is recorded, so the pending request appears without a reload.
 *
 * The component keeps no record of its own. The only state it owns is whether the dialog is open,
 * whether a download is being prepared, and the message of an export that produced no file, so a
 * re-render can never move a record (rule P-6).
 *
 * @param props - The shell's plant and product selection.
 * @returns The header with the two actions, the deployment summary, the declared rows, the outbound
 *   ledger, the policy set and the recent decisions — all of it inside the boundary that explains a
 *   read which could not be completed — and the grant dialog while it is open.
 */
export function SovereigntyScreen({ scope }: SovereigntyScreenProps): ReactElement {
  const service = useService();
  const demonstration = useDemonstration();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isGranting, setIsGranting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFailure, setExportFailure] = useState<string | null>(null);

  /*
   * The declared configuration, its ledger and the policy set. Retries are off on purpose, matching
   * the cache the shell creates: the records are deterministic, so a silent second attempt would only
   * delay the state the boundary reports, and the boundary offers the reader an explicit retry for
   * the case where repeating the call can succeed.
   */
  const sovereigntyQuery = useQuery<Result<SovereigntyStatus>, unknown>({
    queryKey: ['getSovereigntyStatus', scope.plants, scope.products],
    queryFn: () => service.getSovereigntyStatus(),
    retry: false,
  });

  const policiesQuery = useQuery<Result<PolicyDetail[]>, unknown>({
    queryKey: ['listPolicies', scope.plants, scope.products],
    queryFn: () => service.listPolicies({}),
    retry: false,
  });

  /*
   * The acting persona, read on mount rather than taken from the persona the shell seeded at
   * start-up, because a reader may have switched role since: the adapter is enforcing whichever
   * persona the switch selected, and the gate below has to describe the role a request would be
   * evaluated against. The capability is absent on an adapter without identity, and `skipToken` then
   * reads nothing.
   */
  const actingUserQuery = useQuery<Result<ActiveUser>, unknown>({
    queryKey: ['getActiveUser'],
    queryFn: demonstration === null ? skipToken : () => demonstration.getActiveUser(),
    retry: false,
  });

  /*
   * The roster a second approver is chosen from. `listPersonas` is optional on the capability — a
   * deployment knows its caller from the session that reached it — so the read runs only when the
   * bound adapter holds it, and it is bound once here rather than narrowed again inside the query.
   */
  const readPersonas =
    demonstration === null ? undefined : demonstration.listPersonas?.bind(demonstration);

  const personasQuery = useQuery<Result<ActiveUser[]>, unknown>({
    queryKey: ['listPersonas'],
    queryFn: readPersonas === undefined ? skipToken : () => readPersonas(),
    retry: false,
  });

  const result = sovereigntyQuery.data;
  const status = result?.data;
  const policies = policiesQuery.data?.data ?? NO_POLICIES;

  /* The first refusal either read ended in. A permission refusal forbids the page whichever read
     raised it, and the freshness report the sovereignty read carries supplies the boundary's stale
     banner, so the two reads answer one screen state rather than two. */
  const readError = sovereigntyQuery.error ?? policiesQuery.error;

  const state = deriveScreenState({
    isPending: sovereigntyQuery.isPending || policiesQuery.isPending,
    error: readError,
    result,
  });
  const staleRecord = result === undefined ? undefined : staleRecordOf(result.meta.freshness);
  const forbiddenRecord = forbiddenOf(readError);
  const emptyMessage = isProblem(readError) ? readError.message : undefined;

  const grantPolicy = policies.length === 0 ? undefined : policies[0];

  const grantBlocker = grantBlockerOf({
    hasCapability: demonstration !== null,
    isPending: actingUserQuery.isPending,
    isError: actingUserQuery.isError,
    permissions: actingUserQuery.data?.data.permissions,
    hasPolicy: grantPolicy !== undefined,
  });

  const actingUserId = actingUserQuery.data?.data.id;
  const personaRecords = personasQuery.data?.data ?? NO_PERSONAS;

  /*
   * The personas offered as the second approver, in the roster's own order and without the acting
   * persona: a request needs a second person's approval, so offering the requester would offer a
   * choice that cannot be honoured. An empty list is honest — the dialog then disables its own
   * submit with the sentence naming the missing read rather than inventing a persona.
   */
  const secondApprovers = useMemo<readonly GrantExceptionApprover[]>(
    () =>
      personaRecords
        .filter((persona) => persona.id !== actingUserId)
        .map((persona) => ({ id: persona.id, name: persona.name })),
    [personaRecords, actingUserId],
  );

  const decisions = useMemo(() => decisionRowsOf(policies), [policies]);

  /** Asks the port for both reads again, which is what the boundary's retry control does. */
  const retryRead = (): void => {
    void sovereigntyQuery.refetch();
    void policiesQuery.refetch();
  };

  const openGrantDialog = (): void => {
    setIsGranting(true);
  };

  const closeGrantDialog = (): void => {
    setIsGranting(false);
  };

  /*
   * A recorded request is a write to one policy, so the policy set is marked stale: the pending
   * request then appears from the payload the service now answers with, under every selection the
   * screen was read at. The per-policy reads are invalidated beside it, because a reader who follows
   * the request to its policy must see it there too.
   */
  const handleRequestRecorded = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['listPolicies'] });
    void queryClient.invalidateQueries({ queryKey: ['getPolicy'] });
  };

  /** Opens the policy the reader activated: its own identifier, resolved from the row's data. */
  const openPolicy = (policy: PolicyDetail): void => {
    void navigate(`${POLICIES_ROUTE}/${encodeURIComponent(policy.id)}`);
  };

  /*
   * The export and its two outcomes. The pack is built and recorded by the service before anything is
   * offered, so a refusal is reported with the service's own message beside the actions rather than
   * as a file that does not exist; a payload that arrived is offered exactly as it was returned.
   */
  const handleExport = (): void => {
    setIsExporting(true);
    setExportFailure(null);

    void service
      .exportEvidencePack()
      .then((exported) => {
        offerExportFile(exported.data);
      })
      .catch((thrown: unknown) => {
        setExportFailure(
          isProblem(thrown) ? thrown.message : SOVEREIGNTY_SCREEN_TEXT.exportFailed,
        );
      })
      .finally(() => {
        setIsExporting(false);
      });
  };

  return (
    <div className={SCREEN_CLASSES}>
      {/*
        The two actions of AAP 0.12.4's SCR-07 row. Each control is written once per state on
        purpose: `ActionButtonProps` is a discriminated union, so a disabled control cannot be
        constructed without the sentence that explains why (rule P-8).
      */}
      <PageHeader
        eyebrow={SOVEREIGNTY_SCREEN_TEXT.eyebrow}
        title={SOVEREIGNTY_SCREEN_TEXT.title}
        description={SOVEREIGNTY_SCREEN_TEXT.description}
        actions={
          <>
            {grantBlocker === null ? (
              <ActionButton variant="primary" onClick={openGrantDialog}>
                {SOVEREIGNTY_SCREEN_TEXT.grantAction}
              </ActionButton>
            ) : (
              <ActionButton variant="primary" disabled disabledReason={grantBlocker}>
                {SOVEREIGNTY_SCREEN_TEXT.grantAction}
              </ActionButton>
            )}
            {isExporting ? (
              <ActionButton
                variant="secondary"
                disabled
                disabledReason={SOVEREIGNTY_SCREEN_TEXT.exportPreparing}
              >
                {SOVEREIGNTY_SCREEN_TEXT.exportAction}
              </ActionButton>
            ) : (
              <ActionButton variant="secondary" onClick={handleExport}>
                {SOVEREIGNTY_SCREEN_TEXT.exportAction}
              </ActionButton>
            )}
          </>
        }
      />

      {/* The export's own outcome, announced when it arrives rather than only on the next pass. */}
      {exportFailure === null ? null : (
        <div className={NOTICE_CLASSES} role="alert">
          <StatusIndicator meaning="fail" label={SOVEREIGNTY_SCREEN_TEXT.exportFailed} />
          <p className={DETAIL_CLASSES}>{exportFailure}</p>
        </div>
      )}

      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryRead}
        emptyMessage={emptyMessage}
        partialMessage={SOVEREIGNTY_SCREEN_TEXT.partial}
        conflictMessage={SOVEREIGNTY_SCREEN_TEXT.conflict}
        forbidden={forbiddenRecord}
      >
        {status === undefined ? null : (
          <div className={PAGE_CLASSES}>
            {/*
              The deployment summary, under the fixed `Declared, not verified` label: every value in
              it is what the configuration record declares, and the label says that nothing verified
              it (rule P-4). The outbound state is the record's own boolean, stated in words that
              repeat the declaration rather than reporting a check.
            */}
            <Card title={SOVEREIGNTY_SCREEN_TEXT.summaryTitle}>
              <StatusIndicator meaning="simulated" label={DECLARED_LABEL} />
              <dl className={SUMMARY_LIST_CLASSES}>
                <div className={SUMMARY_ROW_CLASSES}>
                  <dt className={SUMMARY_TERM_CLASSES}>{SOVEREIGNTY_SCREEN_TEXT.summaryTier}</dt>
                  <dd className={SUMMARY_VALUE_CLASSES}>
                    <MonoValue value={status.summary.tier} kind="id" />
                  </dd>
                </div>
                <div className={SUMMARY_ROW_CLASSES}>
                  <dt className={SUMMARY_TERM_CLASSES}>
                    {SOVEREIGNTY_SCREEN_TEXT.summaryResidency}
                  </dt>
                  <dd className={SUMMARY_VALUE_CLASSES}>{status.summary.residency}</dd>
                </div>
                <div className={SUMMARY_ROW_CLASSES}>
                  <dt className={SUMMARY_TERM_CLASSES}>
                    {SOVEREIGNTY_SCREEN_TEXT.summaryOutbound}
                  </dt>
                  <dd className={SUMMARY_VALUE_CLASSES}>
                    <StatusIndicator
                      meaning={status.summary.outboundBlocked ? 'pass' : 'warning'}
                      label={
                        status.summary.outboundBlocked
                          ? SOVEREIGNTY_SCREEN_TEXT.outboundBlocked
                          : SOVEREIGNTY_SCREEN_TEXT.outboundPermitted
                      }
                    />
                  </dd>
                </div>
                <div className={SUMMARY_ROW_CLASSES}>
                  <dt className={SUMMARY_TERM_CLASSES}>
                    {SOVEREIGNTY_SCREEN_TEXT.summaryLastDeclared}
                  </dt>
                  <dd className={SUMMARY_VALUE_CLASSES}>
                    <MonoValue value={status.summary.lastDeclaredOn} kind="timestamp" />
                  </dd>
                </div>
              </dl>
            </Card>

            {/* The declared rows: exactly the rows the record carries, each labelled as declared. */}
            <Card title={SOVEREIGNTY_SCREEN_TEXT.rowsTitle}>
              <DataTable<SovereigntyRow>
                columns={SOVEREIGNTY_COLUMNS}
                rows={status.rows}
                getRowKey={sovereigntyRowKeyOf}
                caption={SOVEREIGNTY_SCREEN_TEXT.rowsCaption}
                sort={null}
                onSort={KEEP_SUPPLIED_ROW_ORDER}
                emptyMessage={SOVEREIGNTY_SCREEN_TEXT.rowsEmpty}
              />
            </Card>

            {/*
              The outbound ledger. Its two count columns are the only computed figures on this page,
              so the region carries `Simulated calculation`; the declared columns beside them state
              the record's own endpoint, purpose and state, and the declared rows above the ledger
              carry the label for the configuration half (rules P-1 and P-4).
            */}
            <OutboundLedger
              rows={status.ledger}
              simLabel={CALCULATION_LABEL}
              caption={SOVEREIGNTY_SCREEN_TEXT.ledgerCaption}
              emptyMessage={SOVEREIGNTY_SCREEN_TEXT.ledgerEmpty}
            />

            {/*
              The policy set. Activating a row opens that policy's detail, which is the route AAP
              0.12.4 fixes and the place the same grant flow is offered against one policy.
            */}
            <Card title={SOVEREIGNTY_SCREEN_TEXT.policiesTitle}>
              <DataTable<PolicyDetail>
                columns={POLICY_COLUMNS}
                rows={policies}
                getRowKey={policyRowKeyOf}
                caption={SOVEREIGNTY_SCREEN_TEXT.policiesCaption}
                sort={null}
                onSort={KEEP_SUPPLIED_ROW_ORDER}
                onRowActivate={openPolicy}
                emptyMessage={SOVEREIGNTY_SCREEN_TEXT.policiesEmpty}
              />
            </Card>

            {/*
              The decisions the engine recorded, labelled `Simulated control`: the engine runs in this
              browser, so its record is the mechanism rather than a deployment's control (rule P-4).
            */}
            <Card title={SOVEREIGNTY_SCREEN_TEXT.decisionsTitle}>
              <StatusIndicator meaning="simulated" label={SIMULATED_CONTROL_LABEL} />
              <DataTable<DecisionRow>
                columns={DECISION_COLUMNS}
                rows={decisions}
                getRowKey={decisionRowKeyOf}
                caption={SOVEREIGNTY_SCREEN_TEXT.decisionsCaption}
                sort={null}
                onSort={KEEP_SUPPLIED_ROW_ORDER}
                emptyMessage={SOVEREIGNTY_SCREEN_TEXT.decisionsEmpty}
              />
            </Card>
          </div>
        )}
      </StateBoundary>

      {/*
        The grant flow, composed with the policy the payload supplies first. It is rendered only while
        the record set is loaded, because the dialog names the policy it is requested against.
      */}
      {isGranting && grantPolicy !== undefined ? (
        <GrantExceptionDialog
          policyId={grantPolicy.id}
          policyLabel={grantPolicy.title}
          onClose={closeGrantDialog}
          onSubmitted={handleRequestRecorded}
          secondApprovers={secondApprovers}
        />
      ) : null}
    </div>
  );
}

