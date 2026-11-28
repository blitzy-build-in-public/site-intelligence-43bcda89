/**
 * SCR-04 Scenario comparison, the composition root of the route
 * `/exceptions/:exceptionId/scenarios` (specification §7 SCR-04, AAP 0.12.4's SCR-04 row, AAP 0.13.1).
 *
 * WHAT THE SCREEN IS FOR. A planner has one exception in front of them and several ways to answer it.
 * This screen lays those ways side by side with their arithmetic — one column per option, the eight
 * measures AAP 0.12.4 names as its rows — states which option the recommendation rule picked, the rule
 * it applied and the trade-off it makes, lists nothing of its own about the options that were set
 * aside, compares the orders the options leave late, previews the write-back the selected
 * option would set in motion, and lets the reader duplicate one option at their own lever values. It
 * approves nothing: requesting an approval is the last thing it does, and the decision belongs to
 * SCR-05, which is where a successful request lands. It does report the decision a plan has already
 * taken, where one exists, because a reader who returns to the comparison has to be able to tell that
 * the option in front of them has been decided rather than merely put forward.
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
 * THE TWO READS, AND WHY THE SECOND ONE EXISTS — AAP 0.2.2, rule P-8. `getScenarioSet` states the
 * options and the steps each of them would write, and it states no approval: whether an option has
 * already been decided is the approval record's answer. The screen therefore reads the approval list
 * as a second query, keyed under `listApprovals` so the invalidation a request and a decision perform
 * reaches it, and derives from that list the plan that decides the selected option: the approved record
 * naming it, whichever request followed it in that list, because that is the record the adapter's own
 * refusal reads. A plan that stands approved disables the request control with one sentence naming the
 * record and its status, because a control that cannot act explains why (rule P-8), and its own
 * write-backs replace the option's always-pending steps in the preview, so a reader returning after the
 * write-back reads the states the records reached rather than the states the option shipped in. A read
 * that is refused, or one that answers nothing, leaves this screen behaving exactly as it does without
 * it: the control decides from the option alone and the preview renders the option's own steps. Nothing
 * about the plan is typed here — the identifier, the status and the steps are the record's members.
 *
 * THE FRESHNESS GATE, IN BOTH HALVES — AAP 0.2.1, T-13, rule P-8. `requestApproval` is refused while
 * `APPROVAL_GATE_SOURCE` reports `stale` or `unavailable`, and this screen states the same rule rather
 * than leaving it to the service: the boundary renders the stale banner naming the source and the
 * instant it last answered, and the request control is disabled with a sentence naming that same source
 * and instant, read from the same freshness report. The sentence is assembled from
 * `SCENARIO_COMPARISON_TEXT`'s two halves plus the record's own label and as-of value; SCR-05's approval
 * detail states the same words for the same record, and a feature may not import another feature
 * (AAP 0.18.1), so the wording is held here as well by design rather than shared. Only `stale` and
 * `unavailable` block the request: a source reported `partial` is one the service accepts, and a control
 * disabled where the service would act would lie about what it can do.
 *
 * FOUR GAPS THIS SCREEN REPORTS RATHER THAN WORKS AROUND.
 * 1. `getScenarioSet(exceptionId)` takes no `Scope`, so the shell's plant and product selection cannot
 *    be handed to it: the adapter applies the acting role's plant scope itself (AAP 0.12.4), which is
 *    why this screen never filters a record it was given. The selection is not carried in the set's
 *    cache key either — the method takes the identifier alone, so the selection cannot change the
 *    answer and a top-bar change re-reads nothing here.
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
import {
  deriveScreenState,
  forbiddenOf,
  isProblem,
  staleSourceOf,
} from '../../components/screen-state';
import { STATE_BOUNDARY_TEXT, StateBoundary } from '../../components/state-boundary';
import { StatusIndicator } from '../../components/status-indicator';
import { ActionButton } from '../../components/tooltip';
import { useService } from '../../services/service-provider';
import { APPROVAL_GATE_SOURCE, SIM_LABELS, SOURCE_LABELS } from '../../types';
import type {
  Approval,
  ApprovalStatus,
  ExportPayload,
  Freshness,
  ListQuery,
  Problem,
  Result,
  Scenario,
  ScenarioId,
  ScenarioSet,
  Scope,
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

/**
 * The approval status that closes an option.
 *
 * AAP 0.2.2's journey ends at an approved plan whose write-back landed, so an approved plan is the one
 * thing this screen must not offer to request again. The member is named once here rather than compared
 * as a bare literal, so both the sentence that explains the control and the read that supplies it state
 * the same condition.
 */
const APPROVED_STATUS: ApprovalStatus = 'approved';

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

  /**
   * Why the primary action cannot act while the source the request is refused on is not current, in
   * the two parts the sentence is assembled from: the source's display name and its as-of instant are
   * filled in from the record, so neither is typed here (rule P-6).
   *
   * SCR-05's approval detail states the same sentence for the same condition, because both screens
   * describe one record and one rule; the words are held here as well because a feature may not import
   * another feature (AAP 0.18.1).
   */
  staleSourcePrefix: 'Approvals need a current',

  /** The stale sentence's second half, before the source's label and as-of instant. */
  staleSourceSuffix: 'source.',

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
 * The neutral collections a memoised member or a `??` fallback needs
 * ------------------------------------------------------------------------------------------- */

/**
 * The neutral collections a memoised member or a `??` fallback needs, declared once so a render does
 * not allocate a fresh array and defeat its own memo.
 */
const NO_SCOPE: Scope = { plants: [], products: [] };
const NO_SCENARIOS: readonly Scenario[] = [];
const NO_APPROVALS: readonly Approval[] = [];

/**
 * The query this screen's approval read sends: no status filter.
 *
 * The comparison asks the same question the inbox asks — every approval in the scope, because the plan
 * the reader is looking at may be pending or may already be decided — so the query is held as one named
 * value used in both the call and the cache key, exactly as the inbox holds its own. Two readers that
 * send the same query under an unnamed literal would key the same read two ways, which is how one read
 * comes to have two entries.
 */
const APPROVALS_QUERY: ListQuery = {};

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
 * maximum is the right scale. Every value read here is a figure the solver produced and the screen
 * only passes on, the zero floor keeps a set of all-zero counts drawable, and the surface marks its
 * axis guides `aria-hidden`, so no reader is offered a number this file computed in place of the
 * record's own value.
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
 * Whether one approval answers one option: the exception and the option, both as the record states them.
 *
 * An approval names the exception it answers and the option it puts forward, so a record and an option
 * agree exactly when both members are the option's. Nothing beyond them is compared.
 *
 * @param record - The approval record the read answered with.
 * @param option - The option the reader has chosen.
 * @returns Whether the record names that option.
 */
function namesOption(record: Approval, option: Scenario): boolean {
  return record.exceptionId === option.exceptionId && record.scenarioId === option.id;
}

/**
 * The latest plan naming one option, whatever it stands in, or `undefined` when no record names it.
 *
 * This is the option's record for the preview, and deliberately not the record that decides it: the
 * steps a plan states are worth showing whatever the plan's status, and identifiers ascend in creation
 * order, so the highest of them is the plan lodged last. Whether the option has been decided is
 * {@link decidedPlanForOption}'s answer. The two are read separately because they answer different
 * questions: the later record of one option can be the pending one while the decision sits on the
 * earlier record, so the highest identifier is not the record that carries the decision's state.
 *
 * @param approvals - The approval records the read answered with.
 * @param option - The option the reader has chosen, or `undefined` when the set holds none.
 * @returns The highest-identified plan naming that option, or `undefined` when none does.
 */
function planForOption(
  approvals: readonly Approval[],
  option: Scenario | undefined,
): Approval | undefined {
  if (option === undefined) {
    return undefined;
  }

  let latest: Approval | undefined;

  for (const record of approvals) {
    if (!namesOption(record, option)) {
      continue;
    }

    if (latest === undefined || record.id > latest.id) {
      latest = record;
    }
  }

  return latest;
}

/**
 * The plan that decides one option, or `undefined` when no record does.
 *
 * An approved plan closes the option it names: `requestApproval` refuses a second request while *any*
 * record of the same exception and option stands approved (`./approvals.ts`'s
 * `requireNoDecidedPlan`), so this screen reads the same set the refusal reads — every record naming
 * the option, of which the approved ones are the decision. The status is therefore tested before the
 * identifier is, and the highest-identified approved record is the one named: identifiers ascend in
 * creation order, so it is the latest of the decisions on that option. A pending record beside it
 * changes nothing — the documented journey requests an option the seeded plan already holds pending —
 * and neither does a rejected or a changes-requested one, which invite the option to be put forward
 * again once it has been reworked.
 *
 * @param approvals - The approval records the read answered with.
 * @param option - The option the reader has chosen, or `undefined` when the set holds none.
 * @returns The approved plan naming that option, or `undefined` when none does.
 */
function decidedPlanForOption(
  approvals: readonly Approval[],
  option: Scenario | undefined,
): Approval | undefined {
  if (option === undefined) {
    return undefined;
  }

  let decided: Approval | undefined;

  for (const record of approvals) {
    if (!namesOption(record, option) || record.status !== APPROVED_STATUS) {
      continue;
    }

    if (decided === undefined || record.id > decided.id) {
      decided = record;
    }
  }

  return decided;
}

/**
 * Why the request cannot act on an option whose plan is already approved.
 *
 * One sentence, naming the record and the status it stands in, because that is what a reader needs in
 * order to stop looking for a request to make and read the decision instead (rule P-8). It states no
 * figure and no identifier of its own: both are the record's, and the wording is the same whatever
 * option the reader has selected.
 *
 * @param plan - The approved plan naming the selected option.
 * @returns The sentence the disabled control explains itself with.
 */
function decidedPlanReason(plan: Approval): string {
  return (
    `${plan.id} already holds this option and stands ${plan.status}, so there is no second request ` +
    'to make: the decision and the write-back that followed it are recorded against that approval.'
  );
}

/**
 * Why the approval request cannot act, or `null` when it can.
 *
 * One sentence per way the control is blocked, in the order a reader can act on: there is no option to
 * put forward, the source the request is refused on is not current (the same sentence the stale banner
 * states), the option already carries an approved plan so the decision is taken and nothing is left to
 * request, a request is already running, or the selected option's own constraint check failed and the
 * record's messages are the reason it cannot be recommended or sent. The gate decides presentation only
 * — the adapter refuses the write for the same reasons, so bypassing the control changes no outcome
 * (rule P-8), and the decided plan this gate reads is the one the adapter's own refusal reads, so the
 * control is disabled exactly where a click would be refused.
 *
 * @param selected - The option the reader has chosen, or `undefined` when the set holds none.
 * @param emptySentence - The sentence the boundary states for the state that left no option to put
 *   forward: a set with no option, or the refusal that emptied it. Both the notice and the control
 *   state that one sentence, so a reader is never given two reasons for one condition.
 * @param gateReason - Why the gating source blocks the request, or `null` when it is current.
 * @param isRequesting - Whether a request is already in flight.
 * @param decided - The approved plan naming the selected option, or `undefined` when no read answered
 *   one.
 * @returns The sentence the disabled control explains itself with, or `null` when it can act.
 */
function approvalBlockerOf(
  selected: Scenario | undefined,
  emptySentence: string,
  gateReason: string | null,
  isRequesting: boolean,
  decided: Approval | undefined,
): string | null {
  if (selected === undefined) {
    return emptySentence;
  }

  if (gateReason !== null) {
    return gateReason;
  }

  if (decided !== undefined) {
    return decidedPlanReason(decided);
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
        reason={problem.message}
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


/**
 * The read's report on the one source whose currency decides whether an approval can be requested.
 *
 * `Result.meta.freshness` carries the six sources' state at the moment of the call. The entry returned
 * here is `APPROVAL_GATE_SOURCE` — the source `requestApproval` refuses on — so the banner, the
 * disabled control and the service's own refusal describe one source rather than three literals that
 * agree only until the gate moves. `undefined` means the read reported nothing for it.
 */
function gateFreshnessOf(freshness: readonly Freshness[]): Freshness | undefined {
  return freshness.find((entry) => entry.source === APPROVAL_GATE_SOURCE);
}

/**
 * Why the approval request cannot act while the gating source is not current, or `null` when it is.
 *
 * The sentence names the source's display name and its as-of instant, both taken from the record, so
 * the reason a reader is given and the reason the service would refuse with describe one state
 * (AAP 0.2.1, T-13). It is built for the two states the service refuses on — `stale` and `unavailable`
 * — and for no other: a source reported `partial` is one the service accepts, and a control disabled
 * where the service would act would be a control that lies about what it can do.
 *
 * @param gate - The report on `APPROVAL_GATE_SOURCE`, or `undefined` when the read carried none.
 * @returns The sentence the disabled control explains itself with, or `null` when the source is current.
 */
function approvalGateReasonOf(gate: Freshness | undefined): string | null {
  if (gate === undefined || (gate.state !== 'stale' && gate.state !== 'unavailable')) {
    return null;
  }

  const label = SOURCE_LABELS[gate.source];
  const { staleSourcePrefix, staleSourceSuffix } = SCENARIO_COMPARISON_TEXT;

  return `${staleSourcePrefix} ${label} ${staleSourceSuffix} ${label} as of ${gate.asOf}.`;
}

/* ---------------------------------------------------------------------------------------------
 * The screen — AAP 0.12.4 SCR-04, rules P-2, P-8 and P-1
 * ------------------------------------------------------------------------------------------- */

/**
 * What the router hands SCR-04: the shell's plant and product selection, and nothing else — the
 * exception comes from the `:exceptionId` parameter the screen reads itself. The selection is optional
 * because a route can mount the screen before the top bar's filters resolve. It reaches the approval
 * read, which takes it as its own second argument beside the query that read sends; the option set
 * takes the exception's identifier alone, so the acting role's plant scope reaches it through the
 * adapter instead of the key (AAP 0.12.4, AAP 0.18.1).
 */
export interface ScenarioComparisonScreenProps {
  /**
   * The shell's plant and product selection, passed in because a screen never reads the shell's stores
   * (AAP 0.18.1). Optional so the route may mount the screen without one.
   *
   * The option read itself is not scope-parameterised: `getScenarioSet` takes the exception's
   * identifier, and the adapter applies the acting role's plant scope before it answers, so the
   * selection is not in the set's cache key and a change in the top bar leaves that read alone. The
   * approval list does take it, as the second argument of both its call and its key.
   */
  readonly scope?: Scope;
}

/**
 * Renders SCR-04: one exception's response options, their arithmetic, the recommendation and the plan
 * the reader puts forward.
 *
 * Each read is keyed on the method's name and exactly the arguments it receives — the option set on the
 * exception's identifier alone, the approval list on the query it sends and the shell's selection —
 * and the set's settled facts decide the state in one place ({@link deriveScreenState}); the boundary
 * owns how that state looks. The only state this component owns is what the reader chose — the
 * selected option, whether a request or a download is running, and what a refused request left
 * behind — so a re-render can never move a record (rule P-6).
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
    queryKey: ['getScenarioSet', exceptionId],
    queryFn: exceptionId === undefined ? skipToken : () => service.getScenarioSet(exceptionId),
    retry: false,
  });

  /*
   * The approvals, which are what say whether the option in front of the reader has already been
   * decided: the option set states no approval, so this is a read of its own, named as the port names
   * it. Every invalidation a request, a decision and a write-back retry perform carries the
   * `listApprovals` prefix, so those writes reach this entry and a reader returning from SCR-05 reads
   * the decision rather than the state the comparison was first drawn in. Its key is the method's name,
   * the query it sends and the two halves of the shell's selection — the same shape the inbox keys its
   * own entry with, so the two readers of one (query, scope) share a single entry rather than fetching
   * it twice. A refusal here is not turned into a state of the page: the comparison below behaves as it
   * does without the read (see the module note), so an inbox this persona may not read never breaks the
   * comparison they may.
   */
  const approvalsQuery = useQuery<Result<Approval[]>, unknown>({
    queryKey: ['listApprovals', APPROVALS_QUERY, scope.plants, scope.products],
    queryFn: () => service.listApprovals(APPROVALS_QUERY, scope),
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

  /* The two answers the approval list gives about the selected option, both read from the records rather
     than from the option because the set states no approval. The decided plan is the record the
     adapter's own refusal reads — a plan standing approved that names this exception and this option,
     whatever else the list holds for it — and it is what shuts the request control. The latest plan of
     any status is the preview's fallback, and it is not the decision: the later record of an option can
     be the pending one while the decision sits on the earlier record. Nothing about either is typed
     here; the identifier, the status and the steps are the records' own members. */
  const approvals = approvalsQuery.data?.data ?? NO_APPROVALS;
  const plan = planForOption(approvals, selected);
  const decidedPlan = decidedPlanForOption(approvals, selected);

  const recommendedId = scenarioSet?.recommendedId;
  const recommended =
    recommendedId === undefined
      ? undefined
      : scenarios.find((option) => option.id === recommendedId);

  /*
   * The read's own facts, plus this screen's reading of its payload: a route that names no exception
   * has nothing to read; the approval gate is the source the approval request is refused on, so the
   * stale notice names it first (AAP 0.2.1, T-13); and an option set holding no option is the empty
   * state, whose sentence the screen supplies below.
   */
  const state = deriveScreenState({
    namedNoRecord: exceptionId === undefined,
    isPending: scenarioQuery.isPending,
    error: scenarioQuery.error,
    freshness: result?.meta.freshness,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    hasContent: scenarios.length > 0,
  });

  const staleRecord =
    result === undefined
      ? undefined
      : staleSourceOf(result.meta.freshness, APPROVAL_GATE_SOURCE);

  /* The same read's report on the source the request is refused on, in the words the request control
     states while that source is not current: one record explains the banner and the disabled control
     both (AAP 0.2.1, T-13). */
  const approvalGateReason = approvalGateReasonOf(
    result === undefined ? undefined : gateFreshnessOf(result.meta.freshness),
  );

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

  const approvalBlocker = approvalBlockerOf(
    selected,
    emptyMessage,
    approvalGateReason,
    isRequesting,
    decidedPlan,
  );
  const exportBlocker = exportBlockerOf(exceptionId !== undefined, isExporting);

  /* The steps the preview shows: the decided plan's own where the records hold the decision, because the
     state a step reached is what a reader returning to a decided plan needs, then the latest plan naming
     the option, then the option's own always-pending steps. */
  const previewWriteBacks = decidedPlan?.writeBacks ?? plan?.writeBacks ?? selected?.writeBacks;

  return (
    <div className={SCREEN_CLASSES}>
      {/*
        The three controls of AAP 0.12.4's SCR-04 row. Each is written once per state on purpose:
        `ActionButtonProps` is a discriminated union, so a disabled control cannot be constructed
        without the sentence that explains why (rule P-8). The constraints control is disabled for the
        whole of this run, because custom constraints belong to the optimisation service of a later
        stage (AAP 0.14.2).

        The eyebrow names the record this screen belongs to — the exception the route was opened for —
        the way SCR-03's header reads its own record's identifier, rather than naming the product every
        route already carries in the top bar and the badge: a reader looking at a comparison needs to
        know whose options these are. It comes from the route, so it is stated before the read settles
        and cannot disagree with it, and a route that names no exception carries no eyebrow at all
        rather than an empty one.
      */}
      <PageHeader
        eyebrow={
          exceptionId === undefined ? undefined : <MonoValue kind="id" value={exceptionId} />
        }
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
              the matrix's own). The selection is controlled from here, so the column a reader chose
              and the option this screen would put forward cannot disagree.
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
              What the plan for this option would write — or has written, where the records hold a
              decision — in the record's own order, each step labelled by the component that renders it.
              The steps are the decided plan's own where one exists, because a recorded step that
              succeeded or failed is what a reader returning to a decided plan needs to see; then the
              latest plan naming the option; then the option's own. An option that sets nothing in motion
              renders no block at all: no heading and no empty placeholder stands where a write-back
              would be.
            */}
            {previewWriteBacks === undefined || previewWriteBacks.length === 0 ? null : (
              <Card title={WRITE_BACK_PREVIEW_LABEL}>
                <WriteBackPreview writeBacks={previewWriteBacks} />
              </Card>
            )}

            {/*
              The sandbox: a duplicate of the selected option, measured again by the service at the
              reader's own lever values. Its measurement is rendered by the sandbox itself, because no
              member of the port publishes a recomputed option into the set.
            */}
            <ScenarioSandbox scenario={selected ?? null} />
          </div>
        )}
      </StateBoundary>
    </div>
  );
}

