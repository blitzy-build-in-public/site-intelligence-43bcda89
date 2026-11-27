/**
 * SCR-04 Scenario comparison, the composition root of the route
 * `/exceptions/:exceptionId/scenarios` (specification §7 SCR-04, AAP 0.12.4's SCR-04 row, AAP 0.13.1).
 *
 * WHAT THE SCREEN IS FOR. A planner has one exception in front of them and several ways to answer it.
 * This screen lays those ways side by side with their arithmetic — one column per option, the eight
 * measures AAP 0.12.4 names as its rows — states which option the recommendation rule picked, the rule
 * it applied and the trade-off it makes, lists nothing of its own about the options that were set
 * aside (see gap 2), compares the orders the options leave late, previews the write-back the selected
 * option would set in motion, and lets the reader duplicate one option at their own lever values. It
 * approves nothing: requesting an approval is the last thing it does, and the decision belongs to
 * SCR-05, which is where a successful request lands.
 *
 * WHERE EVERY FIGURE COMES FROM — contracts §3 `ScenarioSet`, contracts §4 rules 1 to 11, rule P-6.
 * The measures are the solver's: the domain layer computes them, the adapter composes the `Scenario`
 * records, and this module renders the members it was handed. It types no
 * figure, computes none and formats none: no sum, no difference, no maximum, no ordering by a measure,
 * no percentage and no locale formatter appears below, and the one axis ceiling a chart requires is
 * drawing geometry (see the note on {@link axisCeilingOf}). `recommendedId` is a lookup, never a
 * comparison — the rule that picked it belongs to the recommendation, and the rule it states arrives
 * in `recommendationRule` to be rendered verbatim.
 *
 * THE FIXED STRINGS AND THEIR ONE OWNER — AAP 0.12.4, AAP 0.10, rule P-1. The empty sentence, the
 * disabled sentence, the two action labels and the recommended badge are exported constants, so the
 * colocated suite asserts them against one owner rather than retyping a sentence the plan fixes. Each
 * figure carries its own label and never the route's page-level badge: the matrix labels every column
 * from its own origin, this screen labels the recommendation block `Simulated recommendation` from
 * `SIM_LABELS`, the chart frame labels its surface `Simulated calculation`, and each write-back step
 * is labelled by the component that renders it.
 *
 * ALL DATA THROUGH ONE BOUNDARY — rule P-2. `useService()` is the only path to a record: no seed
 * module, no adapter, no API client and no domain module is imported here, and the export's CSV text is
 * composed by the service rather than by this file.
 *
 * FOUR GAPS THIS SCREEN REPORTS RATHER THAN WORKS AROUND.
 * 1. `getScenarioSet(exceptionId)` takes no `Scope`, so the shell's plant and product selection cannot
 *    be handed to it. It travels in the cache key instead — a change in the top bar re-reads the set
 *    the way every other screen's reads do — while the adapter applies the acting role's plant scope
 *    itself (AAP 0.12.4), which is why this screen never filters a record it was given.
 * 2. AAP 0.12.4's row asks for "rejected options with the blocking constraint", and
 *    `./comparison-matrix.tsx` already renders exactly that list from `ScenarioSet.rejected` directly
 *    beneath its table. A second list on the same page would state each rejected identifier and its
 *    constraint twice, so this screen renders none: the block has one owner, the matrix's. The row's
 *    further wish for a `permittedAlternative` cannot be met from `Rejected`, which carries no such
 *    member; the alternative a policy permits does reach the reader, in the refusal card below, where
 *    a policy blocks the approval request and the `Problem` carries it.
 * 3. `GroupedBarChart` requires its axis ceiling as a prop, because only the caller knows what the
 *    axis is scaled against. The ceiling is therefore derived here from the cells the chart draws, both
 *    of which are figures the solver produced — the same treatment `src/features/scr-01-overview/
 *    overview-screen.tsx` gives its own bars, and the only arithmetic in this file. It is geometry: the
 *    surface marks its axis guides `aria-hidden`, so no reader is offered a number that this screen
 *    computed in place of the record's own value.
 * 4. No member of the port adds a recomputed option to a scenario set, so the sandbox's duplicate is
 *    not appended as a ninth column here: the sandbox renders the measurement it received, in full,
 *    and `ScenarioSet` stays exactly what the service answered with. Minting a column from a
 *    measurement the service did not publish would be a figure this screen made up (rule P-6).
 *
 * Rules served:
 * - P-1: per-element labels, each read from `SIM_LABELS` or from a component that owns it.
 * - P-2: one boundary, `useService()`; no seed, mock, API-client or domain import.
 * - P-4: no sentence claims that the workspace establishes a configuration, prevents a copy or
 *   withstands an edit, and none suggests a model is connected: the screen reads a script of measures
 *   and says so.
 * - P-6, P-7: no typed number, no typed record identifier, no company, customer or vendor name; every
 *   word on screen is a fixed string of an input, a component's own, or a record's own field.
 * - P-8: every control acts or is visibly disabled through `ActionButton`'s `disabledReason`, and every
 *   refusal names its cause.
 * - B-1, B-2: nothing is fetched — the one download is offered from a `blob:` URL of a payload the
 *   service already composed — nothing is configured and no credential shape appears.
 * - B-3: `PageHeader` owns the single level-one heading, the body renders inside `StateBoundary`, the
 *   chart ships its table view through `ChartFrame`'s required `tableRows`, and every control is a
 *   first-party component with the focus ring and the minimum target the token layer fixes.
 */

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Card } from '../../components/card';
import { ChartFrame } from '../../components/chart-frame';
import { EvidenceRef } from '../../components/evidence-drawer';
import { ForbiddenCard } from '../../components/forbidden-card';
import { GroupedBarChart } from '../../components/grouped-bar-chart';
import type { BarGroup, BarSeries, BarTone } from '../../components/grouped-bar-chart';
import { MonoValue } from '../../components/mono-value';
import { PageHeader } from '../../components/page-header';
import { STATE_BOUNDARY_TEXT, StateBoundary } from '../../components/state-boundary';
import type { StateBoundaryForbidden, StateBoundaryStale } from '../../components/state-boundary';
import { StatusIndicator } from '../../components/status-indicator';
import { ActionButton } from '../../components/tooltip';
import { useService } from '../../services/service-provider';
import { APPROVAL_GATE_SOURCE, SIM_LABELS, SOURCE_LABELS } from '../../types';
import type {
  Approval,
  ExportPayload,
  Freshness,
  FreshnessState,
  Problem,
  ProblemType,
  Result,
  Scenario,
  ScenarioId,
  ScenarioSet,
  Scope,
  ScreenState,
  SimLabel,
} from '../../types';
import { CANNOT_COMPUTE_LABEL, COMPARISON_MATRIX_TEXT, ComparisonMatrix } from './comparison-matrix';
import { ScenarioSandbox } from './scenario-sandbox';
import { WriteBackPreview } from './write-back-preview';

/* ---------------------------------------------------------------------------------------------
 * The fixed strings, each with the input that fixes it
 * ------------------------------------------------------------------------------------------- */

/** The screen's title, in the one level-one heading it renders (AAP 0.12.4's SCR-04 row). */
export const SCENARIO_COMPARISON_TITLE = 'Scenario comparison';

/**
 * What the comparison says when the exception has no option, fixed character for character by AAP
 * 0.12.4's SCR-04 row. It also explains the disabled primary action in that state, so the reader meets
 * one sentence for one condition rather than two paraphrases of it.
 */
export const EMPTY_SCENARIO_SET_MESSAGE =
  'No options yet. Option generation for this exception type arrives with the optimisation service in the pilot.';

/**
 * Why the "Edit solver constraints" action cannot act, fixed character for character by AAP 0.12.4.
 * Custom constraints belong to the optimisation service of a later stage (AAP 0.14.2), so the control
 * is disabled for the whole of this run and never becomes enabled.
 */
export const CUSTOM_CONSTRAINTS_DISABLED_REASON =
  'Custom constraints arrive with the optimisation service in the pilot';

/** The primary action's label, which AAP 0.12.4 fixes for SCR-04. */
export const REQUEST_APPROVAL_LABEL = 'Request approval for selected plan';

/** The secondary action's label, which AAP 0.12.4 fixes for SCR-04. */
export const EXPORT_COMPARISON_LABEL = 'Export the comparison as CSV';

/** The recommended option's badge, which AAP 0.12.4's SCR-04 row fixes word for word. */
export const RECOMMENDED_BADGE_LABEL = 'Recommended';

/** The disabled action's label, which AAP 0.10 lists with the tooltip above. */
export const EDIT_CONSTRAINTS_LABEL = 'Edit solver constraints';

/** The write-back block's heading, in AAP 0.12.4's own words for that block. */
export const WRITE_BACK_PREVIEW_LABEL = 'Write-back preview';

/**
 * The two specification §5.3 labels this screen carries itself, read from the tuple that owns the seven
 * exact strings so no label text is typed here (rule P-1, AAP 0.10).
 *
 * `Simulated recommendation` marks the recommendation block, its rule and its trade-off.
 * `Simulated calculation` marks the chart frame, whose bars are the solver's measured counts.
 */
const RECOMMENDATION_LABEL: SimLabel = SIM_LABELS[2];
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/* ---------------------------------------------------------------------------------------------
 * The wording this screen states itself
 * ------------------------------------------------------------------------------------------- */

/**
 * The captions and notices no input fixes but a shared component or a state requires.
 *
 * None of them is a specification string: the fixed sentences are the exported constants above, the
 * §5.3 labels come from `SIM_LABELS`, the measure names come from the matrix's own `COMPARISON_MATRIX_TEXT`
 * and `Cannot compute` from `CANNOT_COMPUTE_LABEL`. None carries a figure, an amount, a date or a record
 * identifier (rule P-6), and none claims a capability the demonstration does not implement (rule P-4).
 * Held here so the wording has one owner and the suite names it rather than retyping it.
 */
export const SCENARIO_COMPARISON_TEXT = {
  /** The eyebrow above the title: the product name rule P-7 fixes. */
  eyebrow: 'Site Intelligence',

  /** The chart's caption, composed from AAP 0.12.4's own words for the surface. */
  chartTitle: 'Units late by order',

  /**
   * What the chart's bars are, introducing the option names in the order they are drawn. The surface
   * carries no legend of its own, so the caption is where a reader who never opens a bar learns which
   * series is which; every option's own name follows from the records.
   */
  chartSeriesIntro: 'One bar per option in each order cluster, drawn in this order:',

  /** The table view's accessible name, which `ChartFrame` requires and must not be blank. */
  chartTableCaption: 'Units late per customer order, one column per option',

  /** The chart table's first column, naming the axis its rows are grouped by. */
  orderColumn: 'Customer order',

  /** Why the primary action cannot act while a request is already in flight. */
  requestInFlight: 'A request for approval is in flight, and its outcome follows when it settles.',

  /** The heading of the card a policy refusal is reported in, beside the rule's identifier. */
  requestRefused: 'The approval request was refused',

  /** The label the alternative a denying policy permits is printed under. */
  permittedAlternative: 'The alternative this policy permits',

  /** The sentence used when a request stopped for a cause that did not arrive as a `Problem`. */
  requestUnreported: 'The request stopped without reporting a cause.',

  /** The heading of the notice an export that produced no file is reported in. */
  exportFailed: 'The comparison was not offered as a file',

  /** Why the export cannot act while a download is being prepared. */
  exportPreparing: 'The comparison is being prepared, and the file follows when it settles.',

  /** The sentence used when an export stopped for a cause that did not arrive as a `Problem`. */
  exportUnreported: 'The export stopped without reporting a cause.',

  /**
   * Why no file can be offered in a browser that exposes no object-URL factory. The service has already
   * composed the comparison by then; what is missing is the page's own way of handing a file over.
   */
  downloadUnavailable:
    'This page offers no way to save a file, so the comparison could not be downloaded.',

  /** Why the export cannot act on a route that names no exception. */
  noException: 'This route names no exception, so there is no comparison to export.',

  /** The notice above a read a source answered incompletely. */
  partial:
    'A source answered this read incompletely, so an option or one of its measures may be missing ' +
    'from this comparison.',

  /** The notice above a read the service refused against the records as they stand. */
  conflict:
    'The service refused this read against the records as they stand. Read the comparison again to ' +
    'see them as they now are.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The page frame: one column, separated by the 4 px grid rather than by a child's margin. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-4';

/** The loaded body: the same single column, one block per part of the comparison. */
const PAGE_CLASSES = 'flex min-w-0 flex-col gap-4';

/** One card's content: the same single column on the tighter rhythm a card holds. */
const BLOCK_CLASSES = 'flex min-w-0 flex-col gap-2';

/** The option's own row inside the recommendation block: its identifier beside its name. */
const OPTION_ROW_CLASSES = 'flex min-w-0 flex-wrap items-baseline gap-2 text-13 text-text-primary';

/** The trade-off sentence, at the body size the type scale fixes for running text. */
const STATEMENT_CLASSES = 'text-14 break-words text-text-primary';

/** A supporting sentence, one step down the type scale in the secondary text role. */
const DETAIL_CLASSES = 'text-13 break-words text-text-secondary';

/** A supporting value beside its caption, where the two share a baseline rather than a column. */
const INLINE_CLASSES = 'flex min-w-0 flex-wrap items-baseline gap-2';

/**
 * The region a refusal or an export failure is reported in: the second raised surface inside the
 * decorative hairline at the card radius, as every other notice in the product paints its own. The
 * region is a live one, so a failure is announced when it arrives rather than only when a reader next
 * walks the page (rule B-3).
 */
const NOTICE_CLASSES =
  'flex min-w-0 flex-col gap-2 rounded-card border border-hairline bg-surface-2 px-3 py-2';

/* ---------------------------------------------------------------------------------------------
 * Narrowing the service's failure, and reading the freshness report
 * ------------------------------------------------------------------------------------------- */

/**
 * The neutral collections a memoised member or a `??` fallback needs, declared once so a render does
 * not allocate a fresh array and defeat its own memo.
 */
const NO_SCOPE: Scope = { plants: [], products: [] };
const NO_SCENARIOS: readonly Scenario[] = [];

/**
 * The five causes a `Problem` may name, listed once against the port's own union so a rejection can be
 * narrowed to the service's failure shape without widening anything.
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
 * The port fails by throwing a `Problem` (AAP 0.12.3), so a screen that catches a call has to tell the
 * two apart before it can name a cause: a refusal of the request is not the same condition as a failure
 * of the call, and reading a `TypeError` as a refusal would report a cause nobody raised.
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
 * The denial the forbidden card explains, or `undefined` when the failure was not a permission refusal.
 *
 * The card's evidence is the failure's own — the permission the acting role lacks, the roles that hold
 * it and the correlation identifier of the refused call — so nothing is translated between the service
 * and the explanation a reader receives.
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
 * The source behind a stale comparison, with the display name to print and the instant it last answered.
 *
 * The approval gate is looked for first, because it is the source whose state the approval request is
 * refused on (AAP 0.2.1, T-13), and another stale source is reported when the gate is current. The label
 * comes from `SOURCE_LABELS`, the map that owns the six display names, so the banner and the top bar's
 * pill say the same words about the same source. Nothing is derived from the instant — no age and no
 * duration (rule P-6).
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

/** What {@link deriveScreenState} reads: the route's identifier and the read's settled facts. */
interface ScreenStateInput {
  /** Whether the route names an exception at all. */
  readonly hasExceptionId: boolean;

  /** Whether the read has yet to answer. */
  readonly isPending: boolean;

  /** The read's rejection, or `null` when it did not fail. */
  readonly error: unknown;

  /** The payload, `undefined` until the read settles. */
  readonly result: Result<ScenarioSet> | undefined;
}

/**
 * The one place this screen decides which of the seven states its records are in.
 *
 * The failure side comes first, because a refusal is final: a permission refusal is `forbidden`, an
 * identifier no record answers is `empty`, a validation refusal is `conflict`, a policy or simulated
 * write-back refusal and every other rejection are `offline`. A read still in flight is `loading`. The
 * record side then reads the freshness report the result itself carries: a source that did not answer
 * makes the page `offline`, a stale source makes it `stale`, and a source that answered incompletely
 * makes it `partial`. An empty option set is `empty`, and the screen supplies that state's fixed
 * sentence. Everything else returns `undefined`, the boundary's documented "no exceptional state holds".
 *
 * The input is the query's settled facts rather than a flag of this screen's, so the state cannot
 * disagree with the read it describes and no effect is needed to keep the two in step.
 */
function deriveScreenState({
  hasExceptionId,
  isPending,
  error,
  result,
}: ScreenStateInput): ScreenState | undefined {
  if (!hasExceptionId) {
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

  return result.data.scenarios.length === 0 ? 'empty' : undefined;
}

/* ---------------------------------------------------------------------------------------------
 * The route a request lands on, and the tone each series is drawn in
 * ------------------------------------------------------------------------------------------- */

/**
 * The approval inbox's route root, which `src/app/nav-items.ts` mounts: the detail a successful request
 * opens is that root plus the approval's own identifier. It is a route of this application, not an
 * address anything is requested from (rule B-1), and the identifier is the record's own.
 */
const APPROVALS_ROUTE = '/approvals';

/**
 * The route one approval's detail is read at, which is where SCR-05 owns the decision.
 *
 * @param approval - The record the service returned for the request.
 * @returns The route this screen navigates to once a request has been recorded.
 */
function approvalRouteFor(approval: Approval): string {
  return `${APPROVALS_ROUTE}/${encodeURIComponent(approval.id)}`;
}

/**
 * The tones the compared options are drawn in, in the order the set lists them.
 *
 * The tone distinguishes one series from another by position and carries no verdict: the recommendation
 * is published structurally by the matrix (`aria-current` plus the §5.3 label) and never by a colour, so
 * a status hue here cannot be read as a judgement on an option (rule B-3). Every member is a role the
 * token layer exposes, so both themes paint the pairing the specification measured.
 */
const SERIES_TONES = ['accent', 'review', 'warning', 'pass', 'simulated'] as const satisfies
  readonly BarTone[];

/**
 * The tone one series is drawn in: its position in the set, and the first tone for any series beyond the
 * list. A lookup rather than a computation, and the fallback keeps a set of more options readable.
 *
 * @param index - The series' position in the option set.
 * @returns The role family the series' bars are painted in.
 */
function toneFor(index: number): BarTone {
  return SERIES_TONES[index] ?? 'accent';
}

/* ---------------------------------------------------------------------------------------------
 * The chart's data: the orders the options leave late
 * ------------------------------------------------------------------------------------------- */

/**
 * The chart's groups: one per customer order the option set measures, in the order the records list them.
 *
 * Every option of a set is measured from the same solver case, so the case's own order list is the axis.
 * The group's label is the order's identifier, which is the record's own member, and its evidence
 * reference is that same identifier, which `getEvidence` resolves to the customer-order record behind it.
 *
 * @param scenarios - The measured options, exactly as the service returned them.
 * @returns One group per order, or an empty axis when the set holds no option.
 */
function orderGroupsOf(scenarios: readonly Scenario[]): readonly BarGroup[] {
  const [first] = scenarios;

  if (first === undefined) {
    return [];
  }

  return first.orders.map((order) => ({
    id: order.orderId,
    label: order.orderId,
    evidenceRef: order.orderId,
  }));
}

/**
 * The chart's series: one per option, its cells the units each order is left late.
 *
 * `value` is the record's own count, for geometry alone, and `valueLabel` is that same count as a plain
 * decimal string — counts only, never money, so the application's one money formatter stays in
 * `MonoValue`. Nothing is rounded, converted or resequenced, and a cell's evidence reference is the
 * option's own identifier, whose record carries the measurement and the formula behind it.
 *
 * @param scenarios - The measured options, exactly as the service returned them.
 * @returns One series per option, each aligned by index with {@link orderGroupsOf}'s groups.
 */
function orderSeriesOf(scenarios: readonly Scenario[]): readonly BarSeries[] {
  return scenarios.map((scenario, index) => ({
    id: scenario.id,
    label: scenario.name,
    tone: toneFor(index),
    values: scenario.orders.map((order) => ({
      value: order.unitsLate,
      valueLabel: String(order.unitsLate),
      evidenceRef: scenario.id,
    })),
  }));
}

/**
 * The axis ceiling the grouped bars are scaled against, taken from the cells the surface draws.
 *
 * `GroupedBarChart` requires this as a prop, because only the caller knows whether the data's own
 * maximum is the right scale (see gap 3 in the module note). Every value read here is a figure the
 * solver produced and the screen only passes on, the zero floor keeps a set of all-zero counts drawable,
 * and the surface marks its axis guides `aria-hidden`, so no reader is offered a number this file
 * computed in place of the record's own value.
 *
 * @param series - The series the chart draws, exactly as {@link orderSeriesOf} built them.
 * @returns The largest cell, or zero when the surface has no cell to draw.
 */
function axisCeilingOf(series: readonly BarSeries[]): number {
  return Math.max(0, ...series.flatMap((entry) => entry.values.map((cell) => cell.value)));
}

/**
 * The table view's columns: the order the group names, then one column per option.
 *
 * The cells print the series' own `valueLabel`, so the table view states exactly the words the bars
 * announce and this file formats nothing a second time (success criterion 9, rule P-6).
 *
 * @param series - The series the chart draws, in the set's own order.
 * @returns The columns the frame's required table view renders.
 */
function chartColumnsOf(scenarios: readonly Scenario[], series: readonly BarSeries[]) {
  return [
    {
      id: 'order',
      header: SCENARIO_COMPARISON_TEXT.orderColumn,
      render: (group: BarGroup) => <MonoValue kind="id" value={group.label} />,
    },
    ...scenarios.map((option) => {
      const own = series.find((entry) => entry.id === option.id);

      return {
        id: option.id,
        header: option.name,
        align: 'end' as const,
        render: (_group: BarGroup, index: number): ReactNode =>
          orderCellLabelOf(option, own, index),
      };
    }),
  ];
}

/**
 * One cell of the table view: the series' own formatted label for the group at that position.
 *
 * A series shorter than the group list draws no mark for the groups it does not reach, and its table
 * cell is left empty for the same reason — a missing reading is not a zero, and writing one would put a
 * figure on screen that no record states (rule P-6). The one exception is an option whose constraint
 * check failed: it carries no measurement at all, so its cell states `Cannot compute`, the same words the
 * comparison matrix puts in that option's column.
 *
 * @param option - The option the column belongs to, exactly as the service returned it.
 * @param series - That option's series, or `undefined` when the surface drew none for it.
 * @param index - The group's position, which is the cell's position in the series.
 * @returns The label the table view prints for that cell.
 */
function orderCellLabelOf(
  option: Scenario,
  series: BarSeries | undefined,
  index: number,
): string {
  const cell = series?.values[index];

  if (cell !== undefined) {
    return cell.valueLabel;
  }

  return option.constraintCheck === 'fail' ? CANNOT_COMPUTE_LABEL : '';
}

/**
 * The chart's description: the options named in the order their bars are drawn.
 *
 * The surface draws one bar per option inside each order cluster and carries no legend of its own, so
 * this caption is what tells a reader which bars belong to which option — no colour is relied on and no
 * figure is involved (rule B-3, rule P-6).
 *
 * @param scenarios - The measured options, in the set's own order.
 * @returns The sentence the frame prints under the chart's caption.
 */
function seriesDescriptionOf(scenarios: readonly Scenario[]): string {
  const names = scenarios.map((option) => option.name).join('; ');

  return `${SCENARIO_COMPARISON_TEXT.chartSeriesIntro} ${names}`;
}

/* ---------------------------------------------------------------------------------------------
 * The export: a file built in the browser from the payload the service composed
 * ------------------------------------------------------------------------------------------- */

/**
 * Offers one export payload as a downloaded file, and reports whether it could.
 *
 * The document arrives composed: this function writes nothing into it and rewrites no field, so the
 * `"simulated": true` marker its builder set survives untouched (rule P-1), and the name and media type
 * are the payload's own, which is why the saved file is the one the builder declared rather than a name
 * typed here (rule P-6). The blob is served from an object URL that is released on the next task rather
 * than in the task that activated the anchor, so an engine that takes the file after the click still
 * finds it; it leaves the application as a local file and no request is made (rule B-1).
 *
 * The feature check is deliberate: a browser — or a test environment — that exposes no object-URL factory
 * leaves nothing to offer, and letting the missing member throw would report a failure of the export
 * itself, which did not fail. The caller states that reason instead.
 *
 * @param payload - The download payload the service returned, unmodified.
 * @returns `true` when the file was offered, `false` when this page cannot offer one.
 */
function offerExportFile(payload: ExportPayload): boolean {
  if (typeof URL.createObjectURL !== 'function') {
    return false;
  }

  const url = URL.createObjectURL(new Blob([payload.content], { type: payload.mediaType }));
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = payload.filename;

  /* The anchor is attached before it is activated and removed immediately after: a detached anchor's
     synthetic click is ignored by some browsers, and leaving it in the document would add an element to
     the page that no reader asked for. */
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  /* The click above has handed the blob to the browser's download machinery, which may still be reading
     it when this task ends: the URL is released on the next task so an engine that reads it
     asynchronously still finds it. */
  globalThis.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);

  return true;
}

/* ---------------------------------------------------------------------------------------------
 * Why a control cannot act, in the order a reader can act on it
 * ------------------------------------------------------------------------------------------- */

/**
 * Why the approval request cannot act, or `null` when it can.
 *
 * One sentence per way the control is blocked, in the order a reader can act on: there is no option to
 * put forward (the row's own fixed sentence), a request is already running, or the selected option's own
 * constraint check failed and the record's messages are the reason it cannot be recommended or sent. The
 * gate decides presentation only — the adapter refuses the write for the same reasons, so bypassing the
 * control changes no outcome (rule P-8).
 *
 * @param selected - The option the reader has chosen, or `undefined` when the set holds none.
 * @param isRequesting - Whether a request is already in flight.
 * @returns The sentence the disabled control explains itself with, or `null` when it can act.
 */
function approvalBlockerOf(
  selected: Scenario | undefined,
  isRequesting: boolean,
): string | null {
  if (selected === undefined) {
    return EMPTY_SCENARIO_SET_MESSAGE;
  }

  if (isRequesting) {
    return SCENARIO_COMPARISON_TEXT.requestInFlight;
  }

  if (selected.constraintCheck === 'fail') {
    return selected.constraintMessages.length > 0
      ? selected.constraintMessages.join(' ')
      : CANNOT_COMPUTE_LABEL;
  }

  return null;
}

/**
 * Why the comparison export cannot act, or `null` when it can.
 *
 * Two causes: a route that names no exception, so there is no comparison to build, and a download
 * already being prepared. The service composes the CSV whether or not the option set turned out to be
 * empty, so an empty comparison is still exportable.
 *
 * @param hasExceptionId - Whether the route names an exception.
 * @param isExporting - Whether a download is being prepared.
 * @returns The sentence the disabled control explains itself with, or `null` when it can act.
 */
function exportBlockerOf(hasExceptionId: boolean, isExporting: boolean): string | null {
  if (!hasExceptionId) {
    return SCENARIO_COMPARISON_TEXT.noException;
  }

  return isExporting ? SCENARIO_COMPARISON_TEXT.exportPreparing : null;
}

/* ---------------------------------------------------------------------------------------------
 * The refusal a request left behind
 * ------------------------------------------------------------------------------------------- */

/**
 * What the last approval request left on screen.
 *
 * A refusal is either the port's typed `Problem` or a call that stopped without one, and the two are
 * kept apart so a defect is never printed as though it were the service's refusal of the request.
 */
type RequestRefusal =
  | { readonly cause: 'problem'; readonly problem: Problem }
  | { readonly cause: 'unreported' };

/**
 * The region a refused request is explained in, or `null` when the request was not refused.
 *
 * A permission refusal is the forbidden card, carrying the permission, the roles that may act and the
 * trace identifier the failure supplied. A policy refusal is a card headed by the rule's identifier
 * showing the reason in plain words and the alternative the rule permits, so the rule and the reason are
 * visible where the action was offered rather than only in console output (rule P-8). Every other cause
 * states the service's own sentence beside a retry control, and a call that stopped without a `Problem`
 * says exactly that.
 *
 * @param refusal - What the last request left, or `null` when it left nothing.
 * @param onRetry - What the retry control does: the same request, raised again.
 * @returns The region to render above the comparison, or `null`.
 */
function refusalRegionOf(refusal: RequestRefusal | null, onRetry: () => void): ReactNode {
  if (refusal === null) {
    return null;
  }

  if (refusal.cause === 'unreported') {
    return (
      <div role="alert" className={NOTICE_CLASSES}>
        <StatusIndicator meaning="fail" label={SCENARIO_COMPARISON_TEXT.requestUnreported} />
        <span className={INLINE_CLASSES}>
          <ActionButton onClick={onRetry}>{STATE_BOUNDARY_TEXT.retryLabel}</ActionButton>
        </span>
      </div>
    );
  }

  const { problem } = refusal;
  const permission = problem.requiredPermission;

  if (problem.type === 'permission' && permission !== undefined) {
    return (
      <ForbiddenCard
        permission={permission}
        roles={problem.rolesWithPermission ?? []}
        traceId={problem.traceId}
      />
    );
  }

  if (problem.type === 'policy' && problem.policyId !== undefined) {
    return (
      <Card title={<MonoValue kind="id" value={problem.policyId} />}>
        <div role="alert" className={BLOCK_CLASSES}>
          <StatusIndicator meaning="warning" label={SCENARIO_COMPARISON_TEXT.requestRefused} />
          <p className={STATEMENT_CLASSES}>{problem.message}</p>
          {problem.permittedAlternative === undefined ? null : (
            <>
              <p className={DETAIL_CLASSES}>
                {SCENARIO_COMPARISON_TEXT.permittedAlternative}
              </p>
              <p className={STATEMENT_CLASSES}>{problem.permittedAlternative}</p>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div role="alert" className={NOTICE_CLASSES}>
      <StatusIndicator meaning="fail" label={problem.message} />
      <span className={INLINE_CLASSES}>
        <ActionButton onClick={onRetry}>{STATE_BOUNDARY_TEXT.retryLabel}</ActionButton>
      </span>
    </div>
  );
}


/* ---------------------------------------------------------------------------------------------
 * The screen — AAP 0.12.4 SCR-04, rules P-2, P-8 and P-1
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link ScenarioComparisonScreen}. */
export interface ScenarioComparisonScreenProps {
  /**
   * The shell's plant and product selection, passed in because a screen never reads the shell's stores
   * (AAP 0.18.1). Optional so the route may mount the screen without one.
   *
   * The option read itself is not scope-parameterised: `getScenarioSet` takes the exception's
   * identifier, and the adapter applies the acting role's plant scope before it answers (see gap 1 in
   * the module note). The selection is carried in this screen's cache key, so a change in the top bar
   * re-reads the comparison the way every other screen's reads do.
   */
  readonly scope?: Scope;
}

/**
 * Renders SCR-04: one exception's response options, their arithmetic, the recommendation and the plan
 * the reader puts forward.
 *
 * The read is keyed on the method's name, the identifier and the shell's selection, and its settled
 * facts decide the state in one place ({@link deriveScreenState}); the boundary owns how that state
 * looks. The only state this component owns is what the reader chose — the selected option, whether a
 * request or a download is running, and what a refused request left behind — so a re-render can never
 * move a record (rule P-6).
 *
 * @param props - The shell's plant and product selection.
 * @returns The header with its three controls, the notices a refused request or export left, and — inside
 *   the boundary that explains a read which could not be completed — the comparison matrix, the
 *   recommendation, the units-late-by-order chart, the write-back preview and the sandbox.
 */
export function ScenarioComparisonScreen(props: ScenarioComparisonScreenProps): ReactElement {
  const scope = props.scope ?? NO_SCOPE;

  const service = useService();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const params = useParams<{ exceptionId: string }>();
  const exceptionId = params.exceptionId;

  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [refusal, setRefusal] = useState<RequestRefusal | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFailure, setExportFailure] = useState<string | null>(null);

  /*
   * The option set. Retries are off on purpose, matching the cache the shell creates: the records are
   * deterministic, so a silent second attempt would only delay the state the boundary reports, and the
   * boundary offers the reader an explicit retry for the case where repeating the read can succeed.
   * A route that names no exception asks for nothing at all.
   */
  const scenarioQuery = useQuery<Result<ScenarioSet>, unknown>({
    queryKey: ['getScenarioSet', exceptionId, scope.plants, scope.products],
    queryFn: exceptionId === undefined ? skipToken : () => service.getScenarioSet(exceptionId),
    retry: false,
  });

  const result = scenarioQuery.data;
  const scenarioSet = result?.data;
  const scenarios = scenarioSet?.scenarios ?? NO_SCENARIOS;

  /*
   * The selection, as a lookup chain and never a comparison: the option the reader chose, then the one
   * the recommendation rule picked, then the set's first column. No measure is compared, no option is
   * ordered and nothing is recomputed; the chosen identifier is the only thing this screen sends back,
   * and it is sent as the subject of an approval request rather than as a figure.
   */
  const selectionId = selectedScenarioId ?? scenarioSet?.recommendedId ?? scenarios[0]?.id;
  const selected =
    selectionId === undefined ? undefined : scenarios.find((option) => option.id === selectionId);

  const recommendedId = scenarioSet?.recommendedId;
  const recommended =
    recommendedId === undefined
      ? undefined
      : scenarios.find((option) => option.id === recommendedId);

  const state = deriveScreenState({
    hasExceptionId: exceptionId !== undefined,
    isPending: scenarioQuery.isPending,
    error: scenarioQuery.error,
    result,
  });

  const staleRecord = result === undefined ? undefined : staleRecordOf(result.meta.freshness);
  const forbiddenRecord = forbiddenOf(scenarioQuery.error);

  /* A refusal's own sentence explains the empty state when the refusal is what emptied it; the fixed
     sentence of AAP 0.12.4 explains the state an exception with no option is actually in. */
  const emptyMessage = isProblem(scenarioQuery.error)
    ? scenarioQuery.error.message
    : EMPTY_SCENARIO_SET_MESSAGE;

  const conflictMessage = isProblem(scenarioQuery.error)
    ? scenarioQuery.error.message
    : SCENARIO_COMPARISON_TEXT.conflict;

  /* The chart's data, built once per option set: the orders on the axis, one series per option, the
     ceiling their bars are scaled against, and the columns of the table view the frame requires. */
  const orderGroups = useMemo(() => orderGroupsOf(scenarios), [scenarios]);
  const orderSeries = useMemo(() => orderSeriesOf(scenarios), [scenarios]);
  const axisCeiling = useMemo(() => axisCeilingOf(orderSeries), [orderSeries]);
  const chartColumns = useMemo(
    () => chartColumnsOf(scenarios, orderSeries),
    [scenarios, orderSeries],
  );
  const chartDescription = useMemo(() => seriesDescriptionOf(scenarios), [scenarios]);

  const chartTable = useMemo(
    () => ({
      caption: SCENARIO_COMPARISON_TEXT.chartTableCaption,
      columns: chartColumns,
      rows: orderGroups,
      getRowKey: (group: BarGroup): string => group.id,
    }),
    [chartColumns, orderGroups],
  );

  /** Asks the port for the option set again, which is what the boundary's retry control does. */
  const retryRead = (): void => {
    void scenarioQuery.refetch();
  };

  /**
   * Puts the selected option forward for approval, which is the last act this screen takes.
   *
   * The request names the exception and the option and nothing else: the adapter fills in the requester
   * from the acting persona, the eligible approver roles from the permission matrix, and both sides of
   * the cost comparison from the solver's figures, so no figure crosses the boundary from here (rule
   * P-6). A recorded request opens the approval's own page, because the decision belongs to SCR-05. A
   * refusal is kept whole rather than reduced to a sentence, so the card that explains it can name the
   * permission, the policy or the record the failure named.
   */
  const requestSelectedPlan = (): void => {
    if (selected === undefined) {
      return;
    }

    setIsRequesting(true);
    setRefusal(null);

    void service
      .requestApproval({ exceptionId: selected.exceptionId, scenarioId: selected.id })
      .then((recorded) => {
        /* A request writes an approval and appends an audit event, so the reads that show either are
           marked stale: the inbox in SCR-05 and the trail in SCR-05's audit table. */
        void queryClient.invalidateQueries({ queryKey: ['getScenarioSet'] });
        void queryClient.invalidateQueries({ queryKey: ['listApprovals'] });
        void queryClient.invalidateQueries({ queryKey: ['listAuditEvents'] });
        void navigate(approvalRouteFor(recorded.data));
      })
      .catch((thrown: unknown) => {
        setRefusal(
          isProblem(thrown)
            ? { cause: 'problem', problem: thrown }
            : { cause: 'unreported' },
        );
      })
      .finally(() => {
        setIsRequesting(false);
      });
  };

  /**
   * Offers the comparison as a CSV file, built by the service from the same solver output the matrix
   * renders, so the file and the screen cannot disagree (AAP 0.12.4).
   *
   * The export records itself on the trail, so that read is marked stale once a file has been offered.
   * A refusal is reported with the service's own message beside the actions rather than as a file that
   * does not exist, and a page that can offer no file at all says so instead of throwing.
   */
  const exportComparison = (): void => {
    if (exceptionId === undefined) {
      return;
    }

    setIsExporting(true);
    setExportFailure(null);

    void service
      .exportScenarioComparison(exceptionId)
      .then((exported) => {
        void queryClient.invalidateQueries({ queryKey: ['listAuditEvents'] });

        if (!offerExportFile(exported.data)) {
          setExportFailure(SCENARIO_COMPARISON_TEXT.downloadUnavailable);
        }
      })
      .catch((thrown: unknown) => {
        setExportFailure(
          isProblem(thrown) ? thrown.message : SCENARIO_COMPARISON_TEXT.exportUnreported,
        );
      })
      .finally(() => {
        setIsExporting(false);
      });
  };

  const approvalBlocker = approvalBlockerOf(selected, isRequesting);
  const exportBlocker = exportBlockerOf(exceptionId !== undefined, isExporting);

  return (
    <div className={SCREEN_CLASSES}>
      {/*
        The three controls of AAP 0.12.4's SCR-04 row. Each is written once per state on purpose:
        `ActionButtonProps` is a discriminated union, so a disabled control cannot be constructed
        without the sentence that explains why (rule P-8). The constraints control is disabled for the
        whole of this run, because custom constraints belong to the optimisation service of a later
        stage (AAP 0.14.2).
      */}
      <PageHeader
        eyebrow={SCENARIO_COMPARISON_TEXT.eyebrow}
        title={SCENARIO_COMPARISON_TITLE}
        actions={
          <>
            {approvalBlocker === null ? (
              <ActionButton variant="primary" onClick={requestSelectedPlan}>
                {REQUEST_APPROVAL_LABEL}
              </ActionButton>
            ) : (
              <ActionButton variant="primary" disabled disabledReason={approvalBlocker}>
                {REQUEST_APPROVAL_LABEL}
              </ActionButton>
            )}
            {exportBlocker === null ? (
              <ActionButton variant="secondary" onClick={exportComparison}>
                {EXPORT_COMPARISON_LABEL}
              </ActionButton>
            ) : (
              <ActionButton variant="secondary" disabled disabledReason={exportBlocker}>
                {EXPORT_COMPARISON_LABEL}
              </ActionButton>
            )}
            <ActionButton
              variant="secondary"
              disabled
              disabledReason={CUSTOM_CONSTRAINTS_DISABLED_REASON}
            >
              {EDIT_CONSTRAINTS_LABEL}
            </ActionButton>
          </>
        }
      />

      {/* An export that produced no file, announced when it arrives rather than only on the next pass. */}
      {exportFailure === null ? null : (
        <div role="alert" className={NOTICE_CLASSES}>
          <StatusIndicator meaning="fail" label={SCENARIO_COMPARISON_TEXT.exportFailed} />
          <p className={DETAIL_CLASSES}>{exportFailure}</p>
        </div>
      )}

      {/* What the last approval request left: the denial, the policy block or the service's own sentence. */}
      {refusalRegionOf(refusal, requestSelectedPlan)}

      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryRead}
        emptyMessage={emptyMessage}
        partialMessage={SCENARIO_COMPARISON_TEXT.partial}
        conflictMessage={conflictMessage}
        forbidden={forbiddenRecord}
      >
        {scenarioSet === undefined ? null : (
          <div className={PAGE_CLASSES}>
            {/*
              The comparison itself: one column per option and the eight measures of AAP 0.12.4's row,
              each column labelled from its own origin, the recommended column marked structurally, and
              the options the set held back listed with the constraint that blocked each (that list is
              the matrix's own — see gap 2). The selection is controlled from here, so the column a
              reader chose and the option this screen would put forward cannot disagree.
            */}
            <ComparisonMatrix
              scenarioSet={scenarioSet}
              selectedScenarioId={selected?.id}
              onSelectScenario={setSelectedScenarioId}
            />

            {/*
              The recommendation: the fixed badge word as the block's heading, the §5.3
              `Simulated recommendation` label, the option the rule picked with the evidence behind its
              measurement, and then the rule and the trade-off rendered exactly as the service stated
              them — their figures are the record's, so neither sentence is composed here (rule P-6).
            */}
            {recommended === undefined ? null : (
              <Card title={RECOMMENDED_BADGE_LABEL}>
                <div className={BLOCK_CLASSES}>
                  <StatusIndicator meaning="simulated" label={RECOMMENDATION_LABEL} />
                  <p className={OPTION_ROW_CLASSES}>
                    <EvidenceRef ref={recommended.id}>
                      <MonoValue kind="id" value={recommended.id} />
                    </EvidenceRef>
                    <span className={DETAIL_CLASSES}>{recommended.name}</span>
                  </p>
                  <p className={STATEMENT_CLASSES}>{scenarioSet.recommendationRule}</p>
                  {scenarioSet.tradeOff === '' ? null : (
                    <p className={STATEMENT_CLASSES}>{scenarioSet.tradeOff}</p>
                  )}
                </div>
              </Card>
            )}

            {/*
              The same orders read once per option. The frame owns the caption, the label and the table
              view the success criterion requires, and the surface draws the bars from the records' own
              counts (rules P-6, B-3).
            */}
            {orderGroups.length === 0 ? null : (
              <ChartFrame<BarGroup>
                title={SCENARIO_COMPARISON_TEXT.chartTitle}
                description={chartDescription}
                tableRows={chartTable}
                simLabel={CALCULATION_LABEL}
              >
                <GroupedBarChart
                  groups={orderGroups}
                  series={orderSeries}
                  max={axisCeiling}
                  yAxisLabel={COMPARISON_MATRIX_TEXT.rows.unitsLate}
                />
              </ChartFrame>
            )}

            {/*
              What the selected option would write, in the record's own order, each step labelled by the
              component that renders it. An option that sets nothing in motion renders no block at all:
              no heading and no empty placeholder stands where a write-back would be.
            */}
            {selected === undefined || selected.writeBacks.length === 0 ? null : (
              <Card title={WRITE_BACK_PREVIEW_LABEL}>
                <WriteBackPreview writeBacks={selected.writeBacks} />
              </Card>
            )}

            {/*
              The sandbox: a duplicate of the selected option, measured again by the service at the
              reader's own lever values. Its measurement is rendered by the sandbox itself, because no
              member of the port publishes a recomputed option into the set (see gap 4).
            */}
            <ScenarioSandbox scenario={selected ?? null} />
          </div>
        )}
      </StateBoundary>
    </div>
  );
}

