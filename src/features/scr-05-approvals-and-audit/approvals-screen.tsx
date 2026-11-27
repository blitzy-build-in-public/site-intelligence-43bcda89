/**
 * The approval inbox of SCR-05: every plan put to an approver, with the cost it adds, the revenue it
 * protects, where it stands and how current the record behind it is.
 *
 * WHAT THIS FILE IMPLEMENTS. The SCR-05 inbox row of AAP 0.12.4 — "Inbox and detail with plan
 * summary, cost against protected revenue, missing inputs, write-back preview" — at the `/approvals`
 * route AAP 0.7 and 0.13.1 assign to stage S1, and the `DataTable` of approvals with "plan summary,
 * cost against protected revenue, status and freshness, every figure through `EvidenceRef`, with the
 * body inside `StateBoundary`" that the file plan states for this folder. It serves functional
 * requirement F9 and success criterion 7, and it is the surface T-07's journey opens before it walks
 * to a decision.
 *
 * THE INBOX ONLY. The approval's detail, its write-back tracker, its outcome card and the audit trail
 * are sibling modules of this folder and are rendered by their own routes (`/approvals/:approvalId`,
 * `/audit`). This screen opens a record and never decides one: no row action exists here, because
 * assign and dismiss belong to the exception queue and every decision belongs to the detail. A row
 * therefore carries exactly one behaviour — open the approval it names — which is what
 * `DataTable`'s `onRowActivate` reports.
 *
 * WHERE THE ROWS COME FROM — rules P-2 and P-6. One `useQuery` calls the port's `listApprovals`, the
 * member `src/services/site-intelligence-service.ts` declares for this read, with the shell's
 * `Scope`. The list arrives already narrowed twice: the query's status filter lives at the service,
 * and the shell's plant and product selection is intersected with the acting role's plant scope by
 * `src/domain/aggregation/scope.ts` before the records are selected. This screen therefore filters
 * nothing, sorts nothing on load and computes nothing: the row order is the service's, and the only
 * ordering this file can apply is the presentation sort a reader asks for by activating a column
 * header, over the rows it was handed.
 *
 * WHERE THE FIGURES COME FROM. The two euro members are the approval record's own `addedCostEur` and
 * `protectedRevenueEur`, formatted by `MonoValue` and reachable through `EvidenceRef`, whose drawer
 * resolves the `APR-` reference to the evidence record `GET /evidence?ref=` returns for it (PR-6:
 * every figure opens its source, record, time, freshness and formula). No amount is typed here, and
 * `tests/source-checks/no-typed-figures.test.ts` scans this folder for exactly that (rule P-6).
 *
 * LABELLING — rule P-1. Each of the two computed columns names the `Simulated calculation` label in
 * its own header, so a reader of the column sees that its figures were computed rather than typed;
 * the persistent `Simulated data` badge belongs to the shell and is mounted above every route, and a
 * page-level badge does not stand in for a column's own label. The label is read from `SIM_LABELS`
 * rather than retyped, so a reworded label reaches every surface at once.
 *
 * THE SEVEN STATES — AAP 0.12.4, `platform-specification.md` §8. {@link deriveScreenState} is the one
 * place this screen decides which state its records are in, from the query's own settled facts: a
 * permission refusal is `forbidden`, a validation refusal is `conflict`, any other rejection and the
 * `unavailable` report are `offline`, a pending read is `loading`, an aged order book is `stale`, an
 * incomplete one or a record missing a member the inbox shows is `partial`, and a resolved empty list
 * is `empty`. `StateBoundary` owns what each state looks like, so this file composes no banner, no
 * skeleton and no denial card of its own.
 *
 * Rules this file is built to satisfy:
 * - P-1: the two computed columns carry `Simulated calculation` from `SIM_LABELS`; nothing presents a
 *   synthetic approval as a real production record.
 * - P-2: the only data path is `useService()`. No seed module, adapter, domain module or HTTP client
 *   is reachable from here, and no arithmetic is performed on a record.
 * - P-3: nothing here states that a check this browser performs stands in for the authorisation a
 *   deployment would make. The inbox either renders the records the adapter released or explains its
 *   refusal; the demonstration's own statement about that belongs to the role switcher.
 * - P-4: no sentence here states a property of the deployment. The statuses this screen shows are
 *   record values, it carries no control panel, and nothing on it is presented as an established fact
 *   about the environment the application runs in.
 * - P-6: no figure, amount, date or record identifier is typed. Every displayed value is a member of
 *   the record the service returned, or the label the column header states.
 * - P-7: the only names on screen are the records' own synthetic ones, and the screen adds no company,
 *   vendor or product of its own.
 * - P-8: every control either acts or is disabled with a reason. The screen offers two kinds — the
 *   sort controls `DataTable` owns and the retry control `StateBoundary` renders only when a read can
 *   be repeated — and the evidence triggers of the two figure columns.
 * - B-1, B-2: nothing here contacts an address, reads an environment value or carries a credential.
 * - B-3: the table is a real `<table>` with a caption and scoped headers supplied by `DataTable`, its
 *   sortable headers are real buttons carrying `aria-sort` on the cell, the `J`/`K` row cursor and
 *   `Enter` activation come from the same component, every status carries an icon, a label and a
 *   colour together, and every colour is a role token of `src/theme/tokens.css`, so both themes keep
 *   the contrast the specification measured.
 *
 * OPEN ITEM — no colocated test. AAP 0.13.1 names `approval-detail-screen.test.tsx`,
 * `write-back-tracker.test.tsx` and `audit-screen.test.tsx` for this folder and does not name an
 * `approvals-screen.test.tsx`, so this file adds none: its behaviour is exercised end to end by
 * `e2e/s1-approvals-audit.spec.ts` (T-07 and T-09), which reaches the inbox through the navigation and
 * opens a row, and by the detail screen's own suite once a row has been opened. Recorded here rather
 * than resolved by adding a file the plan does not name.
 *
 * OPEN ITEM — the return type. The plan writes the signature as `JSX.Element`; this file states
 * `ReactElement`, the form every shared component and the sibling audit screen of this folder use,
 * because the two are the same type under this repository's `react-jsx` configuration and one spelling
 * in a folder is worth more than two.
 *
 * OPEN ITEM — the freshness column. `Approval` carries no freshness member of its own: contracts §3
 * does not give it one, and the freshness a reader needs is the state of the source the figure was
 * read from, which `Result.meta` reports for the call (AAP 0.2.1). The column therefore reports the
 * entry for `APPROVAL_GATE_SOURCE` — the one source that gates `requestApproval` and `decideApproval`
 * — so the cell, the stale banner and the service's own refusal all describe one source rather than
 * three that agree only until the gate moves. `FreshnessPill` is not composed here because its prop is
 * `SourceHealth`, the catalogue shape that carries a printable `label`, while `Meta.freshness` carries
 * `Freshness`; the cell composes the same primitives the pill does (`StatusIndicator` for the meaning
 * and its state token, `MonoValue` for the instant) instead of a second indicator or a second mapping.
 *
 * OPEN ITEM — refreshing after a decision. This screen's query re-reads on mount and relies on the
 * invalidation the detail screen performs after a decision (AAP 0.6.2): the detail screen invalidates
 * the reads its decision moved, which matches every cached `listApprovals` entry by key prefix.
 * Window-focus refetching is off for the whole application by `src/app/providers.tsx`'s deliberate
 * choice — the demonstration is deterministic, so a background refetch could replace a figure a reader
 * is midway through comparing — and this screen does not overturn that default or mutate a record
 * locally to fake the new status.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { DataTable } from '../../components/data-table';
import type { TableColumn, TableSort } from '../../components/data-table';
import { EvidenceRef } from '../../components/evidence-drawer';
import { freshnessMeaning } from '../../components/freshness-pill';
import { MonoValue } from '../../components/mono-value';
import { PageHeader } from '../../components/page-header';
import { StateBoundary } from '../../components/state-boundary';
import type { StateBoundaryForbidden, StateBoundaryStale } from '../../components/state-boundary';
import { StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { useService } from '../../services/service-provider';
import { APPROVAL_GATE_SOURCE, SIM_LABELS, SOURCE_LABELS } from '../../types';
import type {
  Approval,
  ApprovalStatus,
  Freshness,
  ListQuery,
  Problem,
  ProblemType,
  Result,
  Scope,
  ScreenState,
  SimLabel,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The fixed label, held once
 * ------------------------------------------------------------------------------------------- */

/**
 * The `Simulated calculation` label of specification §5.3, read from `SIM_LABELS` at the index §5.3
 * gives it.
 *
 * The tuple holds the seven fixed strings once (AAP 0.10), so this screen carries the label rather than
 * a copy of it: the string the two figure columns print is the same one the overview tiles and the
 * comparison matrix print, and a reworded label reaches every surface at once. Typed `SimLabel`, so a
 * member the union gains or loses fails this file's compilation (rule P-1).
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/* ---------------------------------------------------------------------------------------------
 * The screen's own wording — no input fixes these sentences
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this screen states in its own voice, held here so the wording has one owner and the
 * fixed label above is never confused with it.
 *
 * A displayed string no input fixes is the screen author's own plain wording, the arrangement
 * `STATE_BOUNDARY_TEXT` and the sibling audit screen use, and the scope words are the filter labels
 * AAP 0.12.2 fixes for the empty selection ("All plants", "All products"). No sentence below carries a
 * figure, an amount, a date or a record identifier (rule P-6), and none states a deployment property
 * (rule P-4).
 */
const SCREEN_TEXT = {
  /** The screen's title, in the one `<h1>` it renders. */
  title: 'Approvals',

  /** What the inbox holds, under the title. */
  description: 'Every plan put to an approver, with the cost it adds and the revenue it protects.',

  /** Introduces the scope the inbox is filtered to, so a filtered list says what it is filtered to. */
  scopeLabel: 'Scope',

  /** The plant selection that means "all plants" — the empty selection of AAP 0.12.2. */
  allPlants: 'All plants',

  /** The product selection that means "all products" — the empty selection of AAP 0.12.2. */
  allProducts: 'All products',

  /** Separates the plant half of the scope from the product half in the description line. */
  scopeSeparator: ' · ',

  /** The identifier column: the approval's own `APR-` reference. */
  approvalColumn: 'Approval',

  /** The plan column: the option under approval and the exception it answers. */
  planColumn: 'Plan',

  /** The cost column, before its simulation label is appended below. */
  costColumn: 'Cost',

  /** The protected-revenue column, before its simulation label is appended below. */
  protectedRevenueColumn: 'Protected revenue',

  /** The status column. */
  statusColumn: 'Status',

  /** The freshness column, before the gating source's own display name is appended below. */
  freshnessColumn: 'Freshness',

  /** The table's accessible name, rendered as its caption and never shown twice on screen. */
  tableCaption:
    'Approvals in scope, with the plan each one puts forward, the cost it adds, the revenue it protects, its status and the freshness of the order book behind it.',

  /** The inbox's sentence when the read answered with nothing in scope. */
  empty: 'No approvals in the current scope.',

  /** Why a value on this screen is shown as the record holds it rather than as a complete reading. */
  partial:
    'The read did not report every member this inbox shows, so the values are shown as the records hold them.',

  /** What a validation refusal means here, and the one action that re-reads the record. */
  conflict: 'One of these approvals changed while you were reading it. Reload to read it as it now stands.',
} as const;

/** The cost column's header, carrying the label its figures are computed under (rule P-1). */
const COST_HEADER = `${SCREEN_TEXT.costColumn} (${CALCULATION_LABEL})`;

/** The protected-revenue column's header, carrying the same label for the same reason. */
const PROTECTED_REVENUE_HEADER = `${SCREEN_TEXT.protectedRevenueColumn} (${CALCULATION_LABEL})`;

/**
 * The freshness column's header, naming the source whose state the cells report.
 *
 * The name comes from `SOURCE_LABELS`, the one map that pairs a `SourceId` with the display name the
 * freshness strip prints, so the column, the top bar's pill and the stale banner say the same word
 * about the same source.
 */
const FRESHNESS_HEADER = `${SCREEN_TEXT.freshnessColumn} (${SOURCE_LABELS[APPROVAL_GATE_SOURCE]})`;

/* ---------------------------------------------------------------------------------------------
 * The route this screen opens, and the class lists it applies
 * ------------------------------------------------------------------------------------------- */

/**
 * The base of the approval detail route, as `src/app/router.tsx` declares it.
 *
 * Held as a constant because the identifier is appended to it on activation, and a route spelling
 * repeated at a second call site is the kind of pair that drifts apart.
 */
const APPROVAL_ROUTE_BASE = '/approvals';

/** The page column: the header, then the table, separated by the 4 px grid rather than by margins. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-6';

/**
 * The plan cell's column, so the option and the exception it answers stack rather than run together:
 * two record values, each rendered by the component that owns an identifier, never one joined string.
 */
const PLAN_CELL_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The freshness cell's row: the state's status indicator beside the instant it last answered. */
const FRESHNESS_CELL_CLASSES = 'inline-flex min-w-0 flex-wrap items-center gap-2';

/** The secondary text role for the freshness cell's instant, one step down the type scale. */
const SECONDARY_TEXT_CLASSES = 'text-12 text-text-secondary';

/* ---------------------------------------------------------------------------------------------
 * The scope, described from the value the shell supplies
 * ------------------------------------------------------------------------------------------- */

/**
 * Describes the selection the inbox is filtered to, in the reader's words.
 *
 * Each half is the selection the shell holds: the chosen identifiers as the records state them, or the
 * "all plants" / "all products" wording of AAP 0.12.2 when the selection is empty. Nothing is resolved
 * here beyond that fallback — the identifiers are the filter's own values, and this screen neither
 * widens nor narrows what the service was asked for.
 */
function describeScope(scope: Scope): string {
  const plants =
    scope.plants.length === 0 ? SCREEN_TEXT.allPlants : scope.plants.join(', ');
  const products =
    scope.products.length === 0 ? SCREEN_TEXT.allProducts : scope.products.join(', ');

  return `${SCREEN_TEXT.description} ${SCREEN_TEXT.scopeLabel}: ${plants}${SCREEN_TEXT.scopeSeparator}${products}.`;
}

/* ---------------------------------------------------------------------------------------------
 * The status vocabulary and the presentation ordering
 * ------------------------------------------------------------------------------------------- */

/**
 * What one approval status amounts to in the shared status vocabulary.
 *
 * No input fixes this mapping, so it is this screen's decision and it is made once: an approval the
 * records mark `approved` reads as a pass, one they mark `rejected` reads as a failure, one awaiting a
 * decision reads as the review meaning — the eye that stands for a record a reader still has to look at
 * — and one whose reader asked for changes reads as the warning meaning, because the plan came back to
 * be reworked. The label beside the icon is always the record's own status token, so the meaning never
 * replaces what the record says and the status never rests on colour alone (rule B-3).
 *
 * The map is exhaustive by type, so a status added to `ApprovalStatus` fails this file's compilation
 * rather than rendering with whichever meaning happened to be last.
 */
const STATUS_MEANINGS = {
  pending: 'review',
  approved: 'pass',
  rejected: 'fail',
  'changes-requested': 'warning',
} as const satisfies Record<ApprovalStatus, StatusMeaning>;

/**
 * The value a column orders its rows by, or `undefined` for a column that is not sortable.
 *
 * Ordering reads the record's own members and nothing else: an identifier, an amount or a status token.
 * A column the inbox does not order — the freshness report, which describes the read rather than the
 * record — returns `undefined`, and its header renders no sort control for that reason.
 */
function sortValueOf(approval: Approval, columnId: string): string | number | undefined {
  switch (columnId) {
    case 'approval':
      return approval.id;
    case 'plan':
      return approval.scenarioId;
    case 'cost':
      return approval.addedCostEur;
    case 'protectedRevenue':
      return approval.protectedRevenueEur;
    case 'status':
      return approval.status;
    default:
      return undefined;
  }
}

/**
 * Compares two values of the same column.
 *
 * Two numbers compare numerically and two strings compare by code unit, which is a total order that
 * does not depend on a locale, a collator or the platform's default language: the demonstration is
 * deterministic (AAP 0.18.2), so the order a reader sees must not vary with the machine it runs on.
 */
function compareValues(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  const leftText = String(left);
  const rightText = String(right);

  if (leftText === rightText) {
    return 0;
  }

  return leftText < rightText ? -1 : 1;
}

/**
 * The rows in the order the reader asked for, or exactly as the service returned them.
 *
 * Sorting is presentation only over the rows already supplied (AAP 0.12.1's `TableSort` contract): no
 * read is repeated, no record is changed, and a `null` sort returns the array untouched, which is how
 * the service's own order — identifier ascending — survives a fresh render. Two equal values keep the
 * order they arrived in, so a re-sort never reshuffles rows that the reader cannot tell apart.
 */
function orderRows(rows: readonly Approval[], sort: TableSort | null): readonly Approval[] {
  if (sort === null) {
    return rows;
  }

  const ordered = [...rows].sort((left, right) => {
    const leftValue = sortValueOf(left, sort.columnId);
    const rightValue = sortValueOf(right, sort.columnId);

    if (leftValue === undefined || rightValue === undefined) {
      return 0;
    }

    const comparison = compareValues(leftValue, rightValue);

    return sort.direction === 'asc' ? comparison : -comparison;
  });

  return ordered;
}

/* ---------------------------------------------------------------------------------------------
 * The failure a read can produce — platform-contracts.md §2, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The causes a `Problem` names, quoted as `ProblemType` spells them.
 *
 * Declared beside the guard rather than imported as a value, because `ProblemType` is a type in
 * `src/types/service.ts`: this list is typed against that union, so a cause the union gains or loses
 * fails this file's compilation instead of letting the guard accept a failure it does not describe.
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
 * A `Problem` is thrown rather than returned (AAP 0.12.3), so a screen that catches a read has to tell
 * the two apart before it can name a cause. Every member checked here is one a `Problem` declares, so a
 * `TypeError` from a broken module reaches the offline rendering rather than being read as a permission
 * refusal it never carried.
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
 * The denial the forbidden rendering explains, or `undefined` when the failure was not a permission
 * refusal.
 *
 * The evidence is the failure's own: the permission the acting role lacks, the roles that hold it and
 * the correlation identifier of the refused call. A refusal that named no permission supplies no
 * record rather than one naming a permission nobody was refused for.
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

/* ---------------------------------------------------------------------------------------------
 * The freshness report, and the members a row needs
 * ------------------------------------------------------------------------------------------- */

/**
 * The read's report on the one source whose currency decides whether an approval can be acted on.
 *
 * `Result.meta.freshness` carries the six sources' state at the moment of the call. The entry returned
 * here is `APPROVAL_GATE_SOURCE` — the source `requestApproval` and `decideApproval` refuse on when it
 * is stale or unavailable — so the freshness column, the stale banner and the service's own refusal
 * describe one source rather than three literals that agree only until the gate moves. `undefined`
 * means the read reported nothing for it, which is a member this screen needs and does not have.
 */
function gateFreshnessOf(freshness: readonly Freshness[]): Freshness | undefined {
  return freshness.find((entry) => entry.source === APPROVAL_GATE_SOURCE);
}

/**
 * The record the boundary's stale banner names, or `undefined` unless the gating source reports
 * `stale`.
 *
 * The banner prints the source's display name, from `SOURCE_LABELS`, and the instant it last answered,
 * both as the record states them, so the freshness column and the banner cannot describe the staleness
 * differently (AAP 0.2.1, T-13). Nothing is derived from the instant — no age and no duration
 * (rule P-6). A source that did not answer at all is the offline condition
 * {@link deriveScreenState} reports, which is why only `stale` produces this record.
 */
function staleOrderBookOf(gate: Freshness | undefined): StateBoundaryStale | undefined {
  if (gate === undefined || gate.state !== 'stale') {
    return undefined;
  }

  return { source: gate.source, label: SOURCE_LABELS[gate.source], asOf: gate.asOf };
}

/**
 * Whether one approval holds every member this inbox shows.
 *
 * The check is the resolved payload's own: an identifier the column would render, the two euro members
 * the figure columns format, and the option and exception the plan cell names. A record that arrived
 * without one of them is shown as the record holds it — `MonoValue` prints an unformattable value as it
 * stands rather than as a plausible zero — while the boundary says above the table that the read was
 * incomplete, which is the `partial` state of specification §8 rather than a silent blank cell.
 */
function isMeasurable(approval: Approval): boolean {
  return (
    approval.id !== '' &&
    approval.scenarioId !== '' &&
    approval.exceptionId !== '' &&
    Number.isFinite(approval.addedCostEur) &&
    Number.isFinite(approval.protectedRevenueEur)
  );
}

/** What {@link deriveScreenState} reads: what the read settled to. */
interface ScreenStateInput {
  /** Whether the read has not answered yet. */
  readonly isPending: boolean;

  /** What the read rejected with, or `null` while it has not. */
  readonly error: unknown;

  /** The read's result, or `undefined` until it settles. */
  readonly result: Result<Approval[]> | undefined;
}

/**
 * The one place this screen decides which of the seven states its records are in.
 *
 * The failure side comes first and is fixed by the cause a `Problem` names: a permission refusal is
 * `forbidden`, a validation refusal is `conflict`, and every other rejection — the port's own remaining
 * causes and anything the platform threw — is `offline`, because nothing answered for the content. A
 * pending read is `loading`.
 *
 * The record side then reads the freshness report the result itself carries, and each member is
 * rendered as the condition it describes rather than folded into one:
 * - `unavailable` → `offline`: the source did not answer, so the figures on screen are not a reading
 *   of the present. This is the state the simulation popover's offline trigger produces, which is why
 *   it is not reported as an aged-but-readable order book.
 * - `stale` → `stale`: the source answered and what it answered has aged, so the figures stay on
 *   screen under the banner that names the source and its as-of time (AAP 0.2.1, T-13).
 * - `partial` → `partial`: the source answered incompletely, so the figures are shown with the notice
 *   that the read was not whole.
 * - absent → `partial`: the report carried no entry for the gating source, which is a member this
 *   screen needs and did not receive.
 *
 * Then an empty list is `empty`, and a list holding a record without a member the inbox shows is
 * `partial`. Every other case returns `undefined`, the boundary's documented "no exceptional state
 * holds", and the content renders exactly as handed in.
 *
 * One deliberate difference from a plain reading of the plan's precedence: `unavailable` is reported as
 * `offline` rather than as `stale`. The plan collapses every non-fresh report into `stale`, while
 * `platform-specification.md` §8 requires the seven states to be present on every screen and
 * `src/services/mock/simulation.ts` produces the offline state by reporting every source
 * `unavailable` because nothing answered. Reporting a source that never answered as a merely aged one
 * would leave this screen's offline rendering unreachable and would describe the data as readable when
 * it is not, so the higher-ranked requirement decides.
 *
 * Its input is the query's own settled facts rather than a flag of this screen's, so the state cannot
 * disagree with the read it describes and no effect is needed to keep the two in step.
 */
function deriveScreenState({
  isPending,
  error,
  result,
}: ScreenStateInput): ScreenState | undefined {
  if (isProblem(error)) {
    if (error.type === 'permission') {
      return 'forbidden';
    }

    return error.type === 'validation' ? 'conflict' : 'offline';
  }

  if (error !== null && error !== undefined) {
    return 'offline';
  }

  if (isPending || result === undefined) {
    return 'loading';
  }

  const gate = gateFreshnessOf(result.meta.freshness);

  if (gate === undefined) {
    return 'partial';
  }

  if (gate.state === 'unavailable') {
    return 'offline';
  }

  if (gate.state === 'stale') {
    return 'stale';
  }

  if (gate.state === 'partial') {
    return 'partial';
  }

  if (result.data.length === 0) {
    return 'empty';
  }

  return result.data.some((approval) => !isMeasurable(approval)) ? 'partial' : undefined;
}

/* ---------------------------------------------------------------------------------------------
 * The columns
 * ------------------------------------------------------------------------------------------- */

/**
 * One row's freshness: the gating source's state as icon, label and colour together, and the instant it
 * last answered.
 *
 * The cell composes the primitives `freshnessMeaning` maps a state onto, exactly as `FreshnessPill`
 * does, because a table cell cannot hand that component its `SourceHealth` prop: `Meta.freshness`
 * carries `Freshness`, which has no display name of its own, and the source's name is stated once in
 * the column header instead of once per row. The state token is the record's own value and is the
 * indicator's label, so a reader hears the state rather than a phrase this screen wrote, and its colour
 * is never the only thing that distinguishes it (rule B-3).
 *
 * A read that reported nothing for the source renders an empty cell rather than an invented state; the
 * boundary's `partial` notice above the table is what explains the gap.
 */
function freshnessCell(gate: Freshness | undefined): ReactNode {
  if (gate === undefined) {
    return '';
  }

  return (
    <span className={FRESHNESS_CELL_CLASSES}>
      <StatusIndicator meaning={freshnessMeaning(gate.state)} label={gate.state} />
      <span className={SECONDARY_TEXT_CLASSES}>
        <MonoValue value={gate.asOf} kind="timestamp" />
      </span>
    </span>
  );
}

/**
 * The inbox's columns, in the order AAP 0.12.4 states them: the identifier, the plan, the cost, the
 * protected revenue, the status and the freshness.
 *
 * Built per read because the freshness column reports the report the read carried; every other cell is
 * a member of the row's own record, formed by the component that owns that kind of value — an
 * identifier and an amount through `MonoValue`, an amount behind `EvidenceRef` so its evidence opens,
 * and a status through `StatusIndicator` so icon, label and colour are always present together.
 *
 * The plan cell states the record's two references — the option under approval and the exception it
 * answers — as the two identifier values they are, each rendered by `MonoValue`. They are never joined
 * into one string: an identifier is a record value, and a string assembled from two of them would be a
 * value no record holds.
 */
function buildColumns(gate: Freshness | undefined): readonly TableColumn<Approval>[] {
  return [
    {
      id: 'approval',
      header: SCREEN_TEXT.approvalColumn,
      sortable: true,
      render: (approval) => <MonoValue value={approval.id} kind="id" />,
    },
    {
      id: 'plan',
      header: SCREEN_TEXT.planColumn,
      sortable: true,
      render: (approval) => (
        <span className={PLAN_CELL_CLASSES}>
          <MonoValue value={approval.scenarioId} kind="id" />
          <MonoValue value={approval.exceptionId} kind="id" />
        </span>
      ),
    },
    {
      id: 'cost',
      header: COST_HEADER,
      sortable: true,
      align: 'end',
      render: (approval) => (
        <EvidenceRef ref={approval.id}>
          <MonoValue value={approval.addedCostEur} kind="money" />
        </EvidenceRef>
      ),
    },
    {
      id: 'protectedRevenue',
      header: PROTECTED_REVENUE_HEADER,
      sortable: true,
      align: 'end',
      render: (approval) => (
        <EvidenceRef ref={approval.id}>
          <MonoValue value={approval.protectedRevenueEur} kind="money" />
        </EvidenceRef>
      ),
    },
    {
      id: 'status',
      header: SCREEN_TEXT.statusColumn,
      sortable: true,
      render: (approval) => (
        <StatusIndicator meaning={STATUS_MEANINGS[approval.status]} label={approval.status} />
      ),
    },
    {
      id: 'freshness',
      header: FRESHNESS_HEADER,
      render: () => freshnessCell(gate),
    },
  ];
}

/* ---------------------------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------------------------- */

/**
 * The query the inbox sends: no status filter.
 *
 * The inbox shows every approval in the scope — the pending ones it exists to surface and the decided
 * ones whose status column a reader compares against them — so the port's optional `status` narrowing
 * is left out rather than defaulted to one member. The plant narrowing is not here either: it arrives
 * with the scope, and the service applies it.
 */
const INBOX_QUERY: ListQuery = {};

/** Props of {@link ApprovalsScreen}. */
export interface ApprovalsScreenProps {
  /**
   * The shell's plant and product selection.
   *
   * Passed to the port as the read's scope and nothing else: the service intersects it with the acting
   * role's plant scope before it selects records, so this screen never narrows the list itself and a
   * filtered inbox and a filtered overview cannot disagree about what is in scope. It is also part of
   * the query key, so changing the selection is a new read rather than a re-filter in the browser.
   */
  readonly scope: Scope;
}

/**
 * The approval inbox.
 *
 * One read through `useService()` (rule P-2), one table of the records it returned, and the state its
 * records are in decided in one place. A row opens the approval it names; nothing on this screen
 * decides one, so the only controls it offers are the header's sort buttons, the evidence triggers of
 * the two figure columns, and the retry control the boundary renders when a read can be repeated.
 *
 * @param props - The shell's plant and product selection.
 * @returns The page header, and the inbox inside the state boundary.
 */
export function ApprovalsScreen({ scope }: ApprovalsScreenProps): ReactElement {
  const service = useService();
  const navigate = useNavigate();

  const [sort, setSort] = useState<TableSort | null>(null);

  /*
   * The inbox read. Its key is the port member's name followed by the arguments that vary — the two
   * halves of the scope — so a selection change is a new entry rather than a cached page re-filtered,
   * and the invalidation a decision performs (`['listApprovals']`, matched by key prefix) reaches every
   * scope's entry at once. Retries follow the shell's client, which turns them off and leaves the
   * repeating to the boundary's own control.
   */
  const approvalsQuery = useQuery<Result<Approval[]>, unknown>({
    queryKey: ['listApprovals', scope.plants, scope.products],
    queryFn: () => service.listApprovals(INBOX_QUERY, scope),
  });

  const result = approvalsQuery.data;
  const gate = result === undefined ? undefined : gateFreshnessOf(result.meta.freshness);
  const rows = useMemo(() => orderRows(result?.data ?? [], sort), [result, sort]);
  const columns = useMemo(() => buildColumns(gate), [gate]);

  const state = deriveScreenState({
    isPending: approvalsQuery.isPending,
    error: approvalsQuery.error,
    result,
  });
  const staleRecord = staleOrderBookOf(gate);
  const forbiddenRecord = forbiddenOf(approvalsQuery.error);

  const retryRead = (): void => {
    void approvalsQuery.refetch();
  };

  const handleSort = (columnId: string): void => {
    setSort((current) =>
      current !== null && current.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' },
    );
  };

  /* The row's one behaviour: open the approval it names, at the route the detail screen answers on. */
  const openApproval = (approval: Approval): void => {
    void navigate(`${APPROVAL_ROUTE_BASE}/${approval.id}`);
  };

  return (
    <div className={SCREEN_CLASSES}>
      <PageHeader title={SCREEN_TEXT.title} description={describeScope(scope)} />

      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryRead}
        emptyMessage={SCREEN_TEXT.empty}
        partialMessage={SCREEN_TEXT.partial}
        conflictMessage={SCREEN_TEXT.conflict}
        forbidden={forbiddenRecord}
      >
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(approval) => approval.id}
          caption={SCREEN_TEXT.tableCaption}
          sort={sort}
          onSort={handleSort}
          onRowActivate={openApproval}
          emptyMessage={SCREEN_TEXT.empty}
        />
      </StateBoundary>
    </div>
  );
}

