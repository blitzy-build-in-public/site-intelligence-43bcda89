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
 * THE TWO ACTIONS, EACH OF WHICH ACTS (rule P-8). "Export evidence pack" sits in the page header: it
 * calls the port's `exportEvidencePack` and offers the payload it returns as a file, built in the
 * browser from the document the service composed. It is disabled with a sentence naming the condition
 * when the acting persona cannot be read or does not hold both permissions the pack requires — the
 * same pair, in the same order, that the adapter checks — and with a second sentence while a download
 * is being prepared, and a refusal the service raises is reported beside the header rather than
 * swallowed. "Grant time-boxed exception" is offered once per policy, inside the policy set, and opens
 * `./grant-exception-dialog` for the policy whose own row the reader pressed, with the second
 * approvers read from the demonstration roster; each copy carries its row's identifier in its
 * accessible name and is disabled with a sentence naming the condition when the acting persona cannot
 * be read, when it does not hold `policy.exception.request`, or when the row is a policy the engine
 * never evaluates. The identity and permission checks decide nothing the adapter does not decide
 * again (rule P-3); the evaluated condition is the record's own fact, stated where the request would
 * be raised. A policy set that holds no policy offers no control at all: the table states its own
 * empty sentence.
 *
 * REPORTED DECISIONS AND GAPS, each recorded where it bites:
 * 1. "Grant time-boxed exception" is offered per policy, in the policy set's own last column, because
 *    AAP 0.12.4 assigns it to SCR-07 as a whole and a time-boxed exception is always requested against
 *    one policy. The dialog therefore names the row the reader acted on, and a policy the engine only
 *    declares offers no control at all, since no exception can be requested against a rule nothing
 *    evaluates. Every copy carries the same visible label AAP 0.12.4 fixes, so each adds its row's
 *    identifier as an `sr-only` suffix — the treatment
 *    `src/features/scr-02-exception-queue/exception-queue-screen.tsx` gives its saved-view actions —
 *    and five controls never share one accessible name. The per-policy route
 *    (`./policy-detail-screen.tsx`) offers the same flow in the page header, against the policy it
 *    shows.
 * 2. `DeploymentSummary` carries no configuration record, so the summary cannot print the reference
 *    behind its own declaration the way each row prints `record`. The record identifiers are on the
 *    rows, and `src/types/screen-dto.ts` is not widened from a screen component; should the summary
 *    gain one, it renders beside the label and nothing else here changes.
 * 3. `LedgerRow` and `PolicyDetail` carry no evidence reference (contracts §3 fixes their members), so
 *    each figure on this page reaches the drawer through a reference its own record already states:
 *    `OutboundLedger` wraps both count columns in `EvidenceRef` with the row's endpoint, and the policy
 *    table wraps each identifier in `EvidenceRef` with the record's `id`. `getEvidence` resolves both
 *    families in `src/services/mock/handlers/evidence.ts`, so a count opens the ledger aggregate that
 *    produced it and an identifier opens the rule and the decisions citing it.
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
import { EvidenceRef } from '../../components/evidence-drawer';
import { MonoValue } from '../../components/mono-value';
import { PageHeader } from '../../components/page-header';
import {
  deriveScreenState,
  forbiddenOf,
  isProblem,
  staleSourceOf,
} from '../../components/screen-state';
import { StateBoundary } from '../../components/state-boundary';
import { PENDING_CLOCK_ICON, StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { ActionButton } from '../../components/tooltip';
import { useDemonstration, useService } from '../../services/service-provider';
import { APPROVAL_GATE_SOURCE, LEDGER_WINDOW_DAYS, SIM_LABELS } from '../../types';
import type {
  ActiveUser,
  AuditEvent,
  AuditResult,
  ExportPayload,
  Permission,
  PolicyDetail,
  Result,
  Scope,
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
 * The permission the grant flow's write requires, which the service enforces and its handler checks
 * again.
 *
 * Written against `Permission` so a renamed member of the contracts §7.1 matrix fails this file's
 * compilation rather than leaving a gate that quietly matches nothing.
 */
const POLICY_EXCEPTION_REQUEST: Permission = 'policy.exception.request';

/**
 * The two permissions the export requires, both of them, which is why they are held as one list.
 *
 * `MockBackend.exportEvidencePack` composes the pack from the declared deployment record and from the
 * audit trail with its verification, so it refuses a caller lacking either `sovereignty.read` or
 * `audit.read`. The control below is disabled on the same pair of permissions, in the same order, so a
 * reader without them learns that before activating it rather than from a refusal afterwards (rule
 * P-8); the adapter still evaluates the matrix itself, so a bypassed control grants nothing (rule P-3).
 *
 * Written against `Permission` for the reason above: a renamed permission fails the compilation.
 */
const EXPORT_PERMISSIONS: readonly Permission[] = ['sovereignty.read', 'audit.read'];

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

  /** The policy set's last column, which holds the grant action against that row's policy. */
  grantColumn: 'Time-boxed exception',

  /** The export action's label, which AAP 0.12.4 fixes for SCR-07. */
  exportAction: 'Export evidence pack',

  /** The export control's reason while the pack is being built and offered as a file. */
  exportPreparing: 'The evidence pack is being prepared for download.',

  /** What is reported beside the actions when the export did not produce a file. */
  exportFailed: 'The evidence pack could not be prepared, so no file was offered.',

  /** The export control's reason when the bound adapter reports no acting persona. */
  exportNoIdentity:
    'This session reports no acting persona, so the evidence pack cannot be prepared here.',

  /** The export control's reason while the acting persona is still being read. */
  exportIdentityPending:
    'The acting persona is still being read, so the evidence pack cannot be prepared yet.',

  /** The export control's reason when the acting persona could not be read. */
  exportIdentityFailed:
    'The acting persona could not be read, so the evidence pack cannot be prepared here.',

  /**
   * The export control's reason when the acting persona lacks either permission the pack requires.
   *
   * Both are named, because the service asks for both: the pack carries the declared deployment record
   * and the audit trail, so `sovereignty.read` alone or `audit.read` alone is not enough, and a
   * sentence naming one of them would describe a gate the adapter does not apply (rule P-8).
   */
  exportNotPermitted:
    'The evidence pack carries the declared deployment record and the audit trail, so exporting it ' +
    'requires the sovereignty.read and audit.read permissions, which the acting persona does not ' +
    'hold. The service refuses the export for the same reason.',

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

  /**
   * The ledger region's caption, which also names its table and states the window its counts cover.
   *
   * The window's length is the `LEDGER_WINDOW_DAYS` constant the ledger aggregate measures with, so
   * the caption cannot promise a window the counts were not taken over (rule P-6), and a reader who
   * reaches the region by its name alone still learns what the two figures beside each endpoint mean.
   */
  ledgerCaption: `Outbound ledger, with the counts the audit trail supports over the trailing ${LEDGER_WINDOW_DAYS} days`,

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

  /**
   * The grant control's reason on a policy the engine never evaluates: the record is stated as
   * declared configuration rather than as a rule that was applied, and a rule nothing evaluates
   * cannot be excepted from (rules P-4 and P-8).
   */
  grantNeverEvaluated:
    'The policy engine does not evaluate this policy: the deployment declares it, so no time-boxed ' +
    'exception can be requested against it.',
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
 * The denial the forbidden card explains
 * ------------------------------------------------------------------------------------------- */

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
 * The identifier opens the evidence of the policy it names — the record's own `id` is the reference
 * `getEvidence` resolves — so a reader can reach the rule, the engine's status and the decisions
 * citing it without leaving the page (AAP 0.2.1 F12, principle PR-6). Opening that evidence is the
 * cell's own control; activating the row anywhere else still opens the policy's route.
 *
 * `evaluated` is the discriminator the service supplies, so no identifier is special-cased here: a
 * policy the engine does not evaluate is rendered as declared configuration under the fixed label
 * (rule P-4), and the decision of which policy that is stays the record's own fact (rule P-6). The
 * requests column states presence rather than a number — a count is a figure, and no aggregate for
 * one exists (rule P-6) — so it shows the record's pending state or the dash that marks its absence.
 *
 * These are the four columns the payload supplies, and they are declared once, here. The fifth — the
 * grant action against the row's own policy — needs the gate's inputs and this component's handler, so
 * it is composed inside the component and appended to this list there rather than widened in place.
 */
const POLICY_COLUMNS: readonly TableColumn<PolicyDetail>[] = [
  {
    id: 'policy',
    header: SOVEREIGNTY_SCREEN_TEXT.columnPolicy,
    render: (policy) => (
      <EvidenceRef ref={policy.id}>
        <MonoValue value={policy.id} kind="id" />
      </EvidenceRef>
    ),
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
 * blob is served from an object URL that is released on the next task rather than in the task that
 * activated the anchor, so an engine that takes the file after the click still finds it; it leaves the
 * application's own origin as a local file and no request is made (rule B-1).
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

  /* The click above has handed the blob to the browser's download machinery; the URL is released on the
     next task so an engine that reads it asynchronously still finds it. */
  globalThis.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
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

  /** Whether the policy engine evaluates the policy the control would request against. */
  readonly evaluated: boolean;
}

/**
 * Why the grant control cannot act, or `null` when it can.
 *
 * One sentence per way the control is blocked, in the order a reader can act on: no capability to
 * read a persona from, a read still in flight, a read that failed, a policy the engine never
 * evaluates, and a persona that does not hold the permission the write requires. The `evaluated`
 * check comes before the permission one because it is a property of the record rather than of the
 * reader: a policy nothing evaluates has no rule to be excepted from whoever is asking, so the
 * sentence names the record's own condition instead of sending a reader after a permission that would
 * not help. The permission half decides presentation only — the adapter evaluates the matrix itself,
 * so a reader who bypasses the control is refused by the service for the same reason (rule P-3).
 */
function grantBlockerOf({
  hasCapability,
  isPending,
  isError,
  permissions,
  evaluated,
}: GrantGateInput): string | null {
  if (!hasCapability) {
    return SOVEREIGNTY_SCREEN_TEXT.grantNoIdentity;
  }

  if (isPending) {
    return SOVEREIGNTY_SCREEN_TEXT.grantIdentityPending;
  }

  if (isError || permissions === undefined) {
    return SOVEREIGNTY_SCREEN_TEXT.grantIdentityFailed;
  }

  if (!evaluated) {
    return SOVEREIGNTY_SCREEN_TEXT.grantNeverEvaluated;
  }

  return permissions.includes(POLICY_EXCEPTION_REQUEST)
    ? null
    : SOVEREIGNTY_SCREEN_TEXT.grantNotPermitted;
}

/* ---------------------------------------------------------------------------------------------
 * The export gate: why the pack cannot be prepared, in the same order a reader can act on
 * ------------------------------------------------------------------------------------------- */

/** What the export gate reads. */
interface ExportGateInput {
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
 * Why the export control cannot act, or `null` when it can.
 *
 * The same shape and the same order as {@link grantBlockerOf}, so the two controls of this page
 * explain themselves the same way: no capability to read a persona from, a read still in flight, a
 * read that failed, and a persona that does not hold both permissions the export requires. The foreign
 * states are checked before the permission because a reader can do nothing about a permission while the
 * persona itself is still unknown, and because the sentence about the read is the one that tells them
 * the page is still settling.
 *
 * The gate decides presentation only. `MockBackend.exportEvidencePack` evaluates the same two
 * permissions itself and refuses the export whether or not the control was bypassed, so a reader who
 * activates a disabled control gets the service's refusal for the same reason (rule P-3).
 *
 * @param input - The demonstration capability, the persona read's settled state and its permissions.
 * @returns The sentence the disabled control carries, or `null` when the export may be offered.
 */
function exportBlockerOf({
  hasCapability,
  isPending,
  isError,
  permissions,
}: ExportGateInput): string | null {
  if (!hasCapability) {
    return SOVEREIGNTY_SCREEN_TEXT.exportNoIdentity;
  }

  if (isPending) {
    return SOVEREIGNTY_SCREEN_TEXT.exportIdentityPending;
  }

  if (isError || permissions === undefined) {
    return SOVEREIGNTY_SCREEN_TEXT.exportIdentityFailed;
  }

  return EXPORT_PERMISSIONS.every((permission) => permissions.includes(permission))
    ? null
    : SOVEREIGNTY_SCREEN_TEXT.exportNotPermitted;
}

/* ---------------------------------------------------------------------------------------------
 * The screen — AAP 0.12.4 SCR-07, rules P-4 and P-1
 * ------------------------------------------------------------------------------------------- */

/**
 * What the router hands SCR-07: the shell's plant and product selection, and nothing else. Neither
 * read takes it — the declared configuration and the policy set are group-wide — but it keys both
 * cache entries, so a change in the top bar re-reads the page while the payload stays the records the
 * acting role may see (AAP 0.18.1, rule P-2).
 */
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
 * The component keeps no record of its own. The only state it owns is which policy's dialog is open,
 * whether a download is being prepared, and the message of an export that produced no file, so a
 * re-render can never move a record (rule P-6).
 *
 * @param props - The shell's plant and product selection.
 * @returns The header with the export action, the deployment summary, the declared rows, the outbound
 *   ledger, the policy set with a grant action on each row and the recent decisions — all of it inside
 *   the boundary that explains a read which could not be completed — and the grant dialog while a row
 *   has opened it.
 */
export function SovereigntyScreen({ scope }: SovereigntyScreenProps): ReactElement {
  const service = useService();
  const demonstration = useDemonstration();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  /*
   * The policy the grant dialog is open for, or `null` while it is closed. The row that carries the
   * control names the policy, so the dialog can only ever be composed with the record the reader acted
   * on rather than with a policy this screen selected (rule P-6).
   */
  const [grantTarget, setGrantTarget] = useState<PolicyDetail | null>(null);
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
   *
   * The value cached is the persona list, not the `Result` envelope the call resolves, and it is
   * keyed under this screen's own `'governance'` qualifier. One method serves two readers — this
   * dialog and the shell's role switcher (`src/app/role-switcher.tsx`) — so two keys are needed: a
   * key's value shape belongs to the reader that caches it, and naming the reader is what keeps one
   * reader's shape from reaching the other. Sharing the bare member name is exactly how a `Result`
   * once reached the shell where an array was expected, which unmounted the application rather than
   * degrading one panel.
   */
  const readPersonas =
    demonstration === null ? undefined : demonstration.listPersonas?.bind(demonstration);

  const personasQuery = useQuery<readonly ActiveUser[], unknown>({
    queryKey: ['listPersonas', 'governance'],
    queryFn: readPersonas === undefined ? skipToken : async () => (await readPersonas()).data,
    retry: false,
  });

  const result = sovereigntyQuery.data;
  const status = result?.data;
  const policies = policiesQuery.data?.data ?? NO_POLICIES;

  /* The first refusal either read ended in. A permission refusal forbids the page whichever read
     raised it, and the freshness report the sovereignty read carries supplies the boundary's stale
     banner, so the two reads answer one screen state rather than two. */
  const readError = sovereigntyQuery.error ?? policiesQuery.error;

  /*
   * The reads' own facts, plus this screen's facts about itself: the first refusal either read ended in
   * is the page's, because a permission refusal forbids the page whichever read raised it, and the
   * freshness report the sovereignty read carries supplies the stale notice — the order book named
   * first, because it gates the approval a planner takes next (AAP 0.2.1, T-13). An empty policy list
   * is deliberately not a screen state: the other blocks stay readable, so the table's own empty
   * sentence reports it.
   */
  const state = deriveScreenState({
    isPending: sovereigntyQuery.isPending || policiesQuery.isPending,
    error: readError,
    freshness: result?.meta.freshness,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
  });
  const staleRecord =
    result === undefined ? undefined : staleSourceOf(result.meta.freshness, APPROVAL_GATE_SOURCE);
  const forbiddenRecord = forbiddenOf(readError);
  const emptyMessage = isProblem(readError) ? readError.message : undefined;

  /*
   * The identity half of every row's grant gate, read once: a request is evaluated against the acting
   * persona whoever the row names, so the column list below depends on these values rather than on the
   * query object, and a row's own fact — whether the engine evaluates that policy — is the only thing
   * that varies between one copy of the control and the next.
   */
  const hasGrantCapability = demonstration !== null;
  const identityPending = actingUserQuery.isPending;
  const identityFailed = actingUserQuery.isError;
  const identityPermissions = actingUserQuery.data?.data.permissions;

  /*
   * The export is gated on the acting persona's own permissions rather than on the payload, because
   * the two permissions the pack requires are the persona's and not the record's (rule P-8). While a
   * download is being prepared the control keeps the `exportPreparing` sentence instead, so a reader
   * who just activated it reads why it is not offered again yet.
   */
  const exportBlocker = exportBlockerOf({
    hasCapability: demonstration !== null,
    isPending: actingUserQuery.isPending,
    isError: actingUserQuery.isError,
    permissions: actingUserQuery.data?.data.permissions,
  });

  const actingUserId = actingUserQuery.data?.data.id;
  const personaRecords = personasQuery.data ?? NO_PERSONAS;

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

  /**
   * The policy set's columns: the four the payload supplies, held at module scope, plus the grant
   * action each row offers against its own policy.
   *
   * The fifth column is built here rather than beside the other four because its cell needs the gate
   * inputs and the handler, neither of which exists at module scope. Its control carries the label AAP
   * 0.12.4 fixes for every copy of it and appends the row's own identifier as an `sr-only` suffix, so
   * the controls of a five-policy set never share one accessible name (rule B-3). Whether that copy
   * acts is the row's own gate answer, and `ActionButtonProps` will not let a disabled control be
   * constructed without the sentence explaining it (rule P-8).
   */
  const policyColumns = useMemo<readonly TableColumn<PolicyDetail>[]>(
    () => [
      ...POLICY_COLUMNS,
      {
        id: 'grant',
        header: SOVEREIGNTY_SCREEN_TEXT.grantColumn,
        render: (policy) => {
          const blocker = grantBlockerOf({
            hasCapability: hasGrantCapability,
            isPending: identityPending,
            isError: identityFailed,
            permissions: identityPermissions,
            evaluated: policy.evaluated,
          });

          /*
           * One label for both states, so the accessible name cannot change with the gate. The
           * identifier sits inside a positioned box because the `sr-only` suffix is absolutely
           * positioned: with no containing block inside the cell it would resolve against the initial
           * containing block, escape the table's own horizontal scroll area and widen the document at a
           * narrow viewport, which is the same fault the evidence trigger carries a positioned class
           * for.
           */
          const label = (
            <span className="relative">
              {SOVEREIGNTY_SCREEN_TEXT.grantAction}
              <span className="sr-only">{`: ${policy.id}`}</span>
            </span>
          );

          return blocker === null ? (
            <ActionButton
              variant="secondary"
              onClick={() => {
                setGrantTarget(policy);
              }}
            >
              {label}
            </ActionButton>
          ) : (
            <ActionButton variant="secondary" disabled disabledReason={blocker}>
              {label}
            </ActionButton>
          );
        },
      },
    ],
    [hasGrantCapability, identityPending, identityFailed, identityPermissions],
  );

  /** Closes the grant dialog: the policy it was opened for is forgotten with it, so it reopens fresh. */
  const closeGrantDialog = (): void => {
    setGrantTarget(null);
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
        SCR-07's export action, which belongs to the page rather than to any one policy. The grant
        action AAP 0.12.4 fixes is offered in the policy set's own last column instead, against the
        policy whose row the reader acts on, so no reader is shown a dialog for a policy they did not
        choose.

        The control is written once per state on purpose: `ActionButtonProps` is a discriminated union,
        so a disabled control cannot be constructed without the sentence that explains why (rule P-8).
      */}
      <PageHeader
        eyebrow={SOVEREIGNTY_SCREEN_TEXT.eyebrow}
        title={SOVEREIGNTY_SCREEN_TEXT.title}
        description={SOVEREIGNTY_SCREEN_TEXT.description}
        actions={
          isExporting ? (
            <ActionButton
              variant="secondary"
              disabled
              disabledReason={SOVEREIGNTY_SCREEN_TEXT.exportPreparing}
            >
              {SOVEREIGNTY_SCREEN_TEXT.exportAction}
            </ActionButton>
          ) : exportBlocker === null ? (
            <ActionButton variant="secondary" onClick={handleExport}>
              {SOVEREIGNTY_SCREEN_TEXT.exportAction}
            </ActionButton>
          ) : (
            <ActionButton variant="secondary" disabled disabledReason={exportBlocker}>
              {SOVEREIGNTY_SCREEN_TEXT.exportAction}
            </ActionButton>
          )
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
              so those columns carry `Simulated calculation`; the four declared columns beside them
              state the record's own endpoint, purpose, state and last attempt, so they carry the
              declared-configuration label the summary and the declared rows above carry (rules P-1
              and P-4). Neither label is spelled here: both are read from `SIM_LABELS`.
            */}
            <OutboundLedger
              rows={status.ledger}
              simLabel={CALCULATION_LABEL}
              declaredLabel={DECLARED_LABEL}
              caption={SOVEREIGNTY_SCREEN_TEXT.ledgerCaption}
              emptyMessage={SOVEREIGNTY_SCREEN_TEXT.ledgerEmpty}
            />

            {/*
              The policy set. Each row states the policy's identifier, its title, whether the engine
              evaluates it and whether a request awaits a decision, and its own last column offers the
              grant flow against that policy; activating the row itself opens the policy's detail, which
              is the route AAP 0.12.4 fixes and where the same flow is offered in the page header.
            */}
            <Card title={SOVEREIGNTY_SCREEN_TEXT.policiesTitle}>
              <DataTable<PolicyDetail>
                columns={policyColumns}
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
        The grant flow, composed with the policy whose own row the reader pressed: the identifier and
        the title are that record's, so the dialog names the policy the request is made against rather
        than one this screen picked. It is rendered only while a row has opened it, and the roster of
        second approvers is the demonstration capability's own read.
      */}
      {grantTarget === null ? null : (
        <GrantExceptionDialog
          policyId={grantTarget.id}
          policyLabel={grantTarget.title}
          onClose={closeGrantDialog}
          onSubmitted={handleRequestRecorded}
          secondApprovers={secondApprovers}
        />
      )}
    </div>
  );
}

