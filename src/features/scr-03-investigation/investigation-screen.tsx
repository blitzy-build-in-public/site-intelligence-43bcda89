/**
 * SCR-03, the investigation screen of `/exceptions/:exceptionId`: what changed, what the disruption
 * touches, what the projection does, and the way onward to the options (AAP 0.12.4 SCR-03).
 *
 * WHAT IT RENDERS, IN THE ORDER THE SCREEN ANSWERS ITS FOUR QUESTIONS. The page header carries the
 * exception's own title, its identifier as the eyebrow and the controls; the exception's facts follow
 * — severity, status, owner and the days to impact, each a figure that opens its evidence; then
 * "What changed"; then the impact chain from the purchase order to the customer orders it puts at
 * risk; then the projected closing stock for the case's window; then the customer orders the
 * disruption measures; then the missing inputs and the confidence; then the activity the chain
 * records against the exception. The primary action is "Compare options", which is what the screen
 * exists to reach.
 *
 * WHERE THE DATA COMES FROM. One read of `getExceptionDetail` through `useService()` supplies the
 * whole payload, and the option set is read beside it so the projection can plot the option the
 * service designates rather than a baseline alone. The persona roster is read beside those two
 * through the demonstration capability's optional `listPersonas` — the member the shell's role
 * switcher names the same personas from, read here under this screen's own cache key — so the owner
 * the exception identifies is shown as the person the records hold for that identifier. Nothing in
 * this file reaches a seed record, the mock adapter, the API client or a domain module, and no
 * fixture is imported: the port is the only data boundary a screen has (rule P-2). The two writes
 * this screen offers — assign to me and record a note — go through the port's own methods and
 * invalidate this screen's cache entries, so the activity beneath them re-reads rather than showing
 * what the cache held before the write.
 *
 * WHO MAY WRITE IS STATED BEFORE THE ATTEMPT. Both writes are the adapter's own calls, and it refuses
 * either one for a persona the matrix does not let work the exception at its plant. Both controls are
 * therefore gated here from the facts the adapter itself derived — the persona's permissions and plant
 * scope through `useActiveUser()`, and the roles that hold the permission through the persona roster —
 * so a read-only persona finds them disabled with a sentence saying why: the roles that may act, or the
 * plants its own scope does cover when it holds the permission but not over that plant. The reader
 * therefore learns the reason before activating a control rather than from the refusal afterwards
 * (AAP 0.2.1, rules P-3 and P-8).
 *
 * NOTHING IS COMPUTED HERE (rule P-6). No amount, count, duration, date, percentage or delta is
 * derived, rounded, parsed or formatted in this module: every figure arrives from the service, and
 * the only formatter it uses is `src/components/mono-value.tsx`. `String(units)` renders a record
 * value as the text a chart point carries, which is the same presentation the overview screen applies
 * to its own series, and no arithmetic operator appears in the file at all. The one span this module
 * derives is the idle window's own dates — the first and the last day the plotted series reads no
 * closing stock on — which selects dates the record states rather than measuring anything. Both
 * numeric literals are zero: the level the projected-stock surface is read against, and the closing
 * reading that marks an empty day. Neither is a figure of any record.
 *
 * THE SEVEN STATES (specification §8). {@link deriveScreenState} decides once, from what the read
 * settled to and from the freshness report the result itself carries: a permission refusal is
 * `forbidden` and the card names the permission, the roles that hold it and the trace identifier; a
 * `not-found` refusal is handled above the boundary as the panel that links back to the queue, since
 * the union has no member for it and a page must not render blank; a validation refusal is `conflict`;
 * any other rejection is `offline`; a pending read is `loading`; a source that did not answer is
 * `offline`; a source reported stale is `stale`, naming that source and the instant it last answered;
 * a source reported partial, and a payload whose own missing inputs are not empty, are `partial`; and
 * a payload carrying no chain, no series and no measured order is `empty`. Every one of those values
 * is derived from the records, never from a simulation flag: the popover changes what the service
 * answers and this screen reads the answer (AAP 0.12.1).
 *
 * A COMPUTATION THAT CANNOT COMPLETE (AAP 0.2.2, 0.8). An exception whose records carry no solver
 * case has no projection, and the surface shows the fixed words "Cannot compute" with the payload's
 * own missing inputs and draws no series; no `NaN`, no zero and no partial figure stands in its place,
 * and nothing on the screen recommends an option.
 *
 * WHAT IT DOES NOT DO. It states no property of the workspace, so nothing here claims that a record
 * cannot be altered or copied (rule P-4); it carries no role control, and the forbidden state explains
 * a refusal the service made rather than presenting a browser-side check as production authorisation
 * (rule P-3); it blends no provenance, since every record it shows is first-party (rule P-5); it names
 * no company, product or person of its own, every name on screen being a record value (rule P-7); and
 * it fetches no asset and reads no configuration value (rules B-1, B-2). Each control either acts or is
 * an `ActionButton` disabled with a plain sentence saying why (rule P-8).
 *
 * WHAT THE PAYLOAD DOES NOT DECLARE. `ExceptionDetail` has no window label and no summary line, so the
 * projection's caption is composed from the dates the supplied points themselves carry and the header
 * renders no description. It carries no zero reference and no due-date marker either: the zero level is
 * a property of the axis, labelled from this module's own text, and the due-date markers are the
 * exception's own affected lines, one per promised date. No member is invented in `src/types` to fill
 * one of them.
 *
 * WHERE THE TABLE'S VALUES, THE BAND AND THE CHAIN COME FROM. `ExceptionDetail.affectedOrders` declares
 * the order identifier and the two measured days and units, so the orders table joins each measured
 * order to the exception's own `affectedLines` for the promised date and the units at risk — a lookup,
 * not a computation — and a measured order with no line leaves those two cells empty rather than
 * reading `undefined`. The chart's idle band is the plotted series read as zero — the designated option's
 * own series where it carries one, the baseline's otherwise — from its first such date to the last in the
 * series' own order, and no span is shaded when that series holds no zero day: a range of the record's
 * own dates, never a measure counted from them. The impact chain reaches the panel unchanged: this screen
 * decides nothing about which nodes are openable.
 *
 * Rules served: B-1, B-2, B-3, P-1, P-2, P-3, P-4, P-5, P-6, P-7, P-8.
 */
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Card, INSET_SURFACE_CLASSES } from '../../components/card';
import { DataTable } from '../../components/data-table';
import type { TableColumn } from '../../components/data-table';
import { EvidenceRef } from '../../components/evidence-drawer';
import type {
  LineBand,
  LineMarker,
  LinePoint,
  LineReference,
  LineSeriesSpec,
} from '../../components/line-chart';
import { MetricTile } from '../../components/metric-tile';
import { MonoValue } from '../../components/mono-value';
import { PageHeader } from '../../components/page-header';
import { Panel } from '../../components/panel';
import { runOutStatement } from '../../components/run-out-reading';
import {
  deriveScreenState,
  forbiddenOf,
  isProblem,
  staleSourceOf,
} from '../../components/screen-state';
import { StateBoundary } from '../../components/state-boundary';
import { StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { TextAreaField } from '../../components/text-area-field';
import {
  ActionButton,
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
} from '../../components/tooltip';
import {
  useActiveUser,
  useDemonstration,
  useRolesHolding,
  useService,
} from '../../services/service-provider';
import { WRITE_READS, type CachedRead } from '../../services/write-reads';
/*
 * `EXCEPTION_QUEUE_PATH` is the queue this screen returns to when the route names no exception it may
 * read. It has one declaration, in `src/types/routes.ts`, shared with the navigation table, the shell's
 * pages and every screen that navigates to it, so a rename reaches all of them.
 */
import {
  ALREADY_OWNER_REASON,
  EXCEPTION_QUEUE_PATH,
  SIM_LABELS,
} from '../../types';
import type {
  AffectedLine,
  ActiveUser,
  AuditResult,
  ConfidenceLevel,
  CustomerOrderId,
  DailyClosingStockPoint,
  ExceptionDetail,
  ExceptionId,
  ExceptionStatus,
  IsoDate,
  OperationalException,
  Permission,
  PlantId,
  Result,
  Role,
  Scenario,
  ScenarioSet,
  Scope,
  Severity,
  SimLabel,
} from '../../types';
import { ImpactChain } from './impact-chain';
import { ProjectedStockChart } from './projected-stock-chart';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this screen states, held here so the wording has one owner.
 *
 * None of these is a specification string: the seven §5.3 simulation labels arrive from
 * `SIM_LABELS` in `src/types`, the exception's own title and text arrive in the record, and the
 * sentences below are the screen's own copy for the states and controls it owns. They type no figure,
 * no amount and no record identifier (rule P-6).
 */
export const INVESTIGATION_TEXT = {
  /** The heading of the page a reader reaches with no exception identifier in the route. */
  notFoundTitle: 'Exception not found',

  /** What an address naming no exception says: nothing is claimed about a record that was not asked for. */
  noIdentifier: 'This address names no exception, so there is nothing to investigate here.',

  /** The link back to the queue, named by where it goes rather than by what went wrong. */
  notFoundLinkLabel: 'Back to the exception queue',

  /** The region name for the header facts. */
  factsGroup: 'Exception facts',

  /** The three labelled facts, each a record value rather than a computed one. */
  severityLabel: 'Severity',
  statusLabel: 'Status',
  ownerLabel: 'Owner',

  /** The computed figure beside them, and the qualifier under it. */
  daysToImpactLabel: 'Days to impact',
  daysToImpactHint: 'Working days until the impact reaches a customer order.',

  /** The card that states what changed, in the record's own words. */
  whatChangedHeading: 'What changed',

  /** The region wrapping the impact chain. */
  chainHeading: 'What the disruption touches',

  /** What an exception whose records state no chain shows instead of an empty list. */
  chainEmpty: 'The records state no impact chain for this exception.',

  /** The projection's section heading and the opening of its composed caption. */
  projectionHeading: 'Projected closing stock',
  projectionPrefix: 'Projected closing stock',

  /**
   * The projection's two axis names: the calendar the series is plotted over, and what each plotted
   * reading is measured in. They are the words the canvas dock already gives the same projection, so
   * one figure's axes read the same way wherever the projected stock is drawn.
   */
  projectionXAxisLabel: 'Calendar date',
  projectionYAxisLabel: 'Units at close',

  /** What a projection with no reading shows when the baseline does carry points. */
  projectionEmpty: 'The records report no closing-stock reading for this exception.',

  /** The fixed words AAP 0.2.2 and 0.8 require where a computation cannot complete. */
  cannotCompute: 'Cannot compute',

  /** Why a payload with no series could not be projected, when it names no missing input. */
  cannotComputeNoCase:
    'The records carry no solver case for this exception, so no projection can be measured.',

  /** The two series' names, so the baseline and the option are told apart without relying on tone. */
  baselineSeriesLabel: 'Baseline: no action taken',
  selectedSeriesPrefix: 'Selected option:',

  /**
   * What joins the designated option's series label to the run-out reading stated under the
   * projection's title, so the two read as one sentence (AAP §0.8).
   */
  runOutSeparator: ' — ',

  /** The zero level's label. The level itself is the axis's own zero, never a record's reading. */
  zeroReferenceLabel: 'Zero stock',

  /** The label the shaded idle window carries inside the projection, in this screen's words. */
  idleWindowLabel: 'Idle window',

  /** The orders table: its section heading, its accessible name and its empty sentence. */
  ordersHeading: 'Customer orders at risk',
  ordersCaption: 'Customer orders this disruption places at risk, with the measured units late',
  ordersEmpty: 'The records measure no affected customer order for this exception.',
  ordersNote:
    'Units late and days late are the solver\'s measurement of the baseline, where no lever is pulled.',

  /** The four order columns. */
  orderColumn: 'Order',
  unitsLateColumn: 'Units late',
  daysLateColumn: 'Days late',
  promisedColumn: 'Promised',
  unitsAtRiskColumn: 'Units at risk',

  /** The confidence and missing-inputs region. */
  confidenceHeading: 'Missing inputs and confidence',
  confidenceLabel: 'Confidence',
  missingInputsLabel: 'Inputs the assessment could not read',
  missingInputsNone: 'Every input this assessment needs was readable.',

  /** The activity region. */
  activityHeading: 'Activity',
  activityEmpty: 'The chain records no event against this exception yet.',

  /** The four controls. */
  compareOptions: 'Compare options',
  askAssistant: 'Ask the assistant',
  assignToMe: 'Assign to me',
  addNote: 'Add note',

  /** Why "assign to me" cannot act, one sentence per condition. */
  assignInFlight: 'The assignment is being recorded.',
  assignUnavailable:
    'This session reports no acting persona, so there is nobody to assign the exception to.',
  alreadyOwner: ALREADY_OWNER_REASON,

  /**
   * Why a write to the exception cannot act. {@link mayWork} refuses for two different reasons, and
   * {@link noWorkReason} states the one that is true rather than one sentence for both: a persona that
   * holds `exception.work` whose plants miss the exception's says so with {@link noWorkHolds},
   * {@link noWorkNotOver} and {@link noWorkPlants}, because that persona is one of the permission's
   * holders and a sentence claiming it lacks the permission would contradict itself; a persona that
   * does not hold the permission at all says so and closes with {@link noWorkRoles} once the roster has
   * answered. The role the adapter enforces, the plant the exception lands on and the permission's own
   * name — held as the constant the gate itself checks, so the sentence and the check cannot name two
   * permissions — are composed in from the persona's own facts. "Assign to me" and "Add note" both
   * write to the record, so both state this one reason, and the reader learns why the control cannot
   * act, and who may act, before activating either of them (AAP 0.2.1, rules P-3 and P-8).
   */
  noWorkActor: 'The acting role',
  noWorkLacks: 'does not hold the',
  noWorkOver: 'permission over',
  noWorkHolds: 'holds the',
  noWorkNotOver: 'permission, but not over',
  noWorkOutcome: 'so this exception cannot be changed here.',

  /** The clause naming the plants the acting persona does reach, with those plants after it. */
  noWorkPlants: 'The plants it covers are',

  /**
   * The clause naming the roles that hold `exception.work`, composed in by {@link noWorkReason} for the
   * persona that does not hold the permission at all.
   */
  noWorkRoles: 'The roles that hold it are',

  /** The note form. */
  noteHeading: 'Add a note',
  noteField: 'Note',
  recordNote: 'Record note',
  cancelNote: 'Cancel',
  noteRequired: 'Enter the note before recording it.',
  noteInFlight: 'The note is being recorded.',

  /** What the two writes report once the port has answered. */
  assigned: 'Assigned.',
  noted: 'Note recorded.',
  writeFailed: 'The service refused the write.',

  /** The states the screen's own wording covers. */
  empty: 'This exception carries no chain, projection or measured order in the records as they stand.',
  partial: 'A source answered incompletely, so some of the inputs behind these figures are missing.',
  conflict:
    'The record changed before this request could be honoured. Reload the exception to read it as it now stands.',
} as const;

/** `Simulated calculation` — the label every figure the solver measured carries (AAP 0.10). */
const CALCULATED_LABEL: SimLabel = SIM_LABELS[1];

/**
 * `Simulated data` — the label of a reading that shipped with the dataset rather than being computed
 * in this session, which is what a seeded option's projection is (AAP 0.10, rule P-1).
 */
const DATA_LABEL: SimLabel = SIM_LABELS[0];

/* ---------------------------------------------------------------------------------------------
 * Routes
 * ------------------------------------------------------------------------------------------- */

/** The assistant's route, reachable from the header (specification §5.2). */
const ASSISTANT_ROUTE = '/assistant';

/**
 * The comparison route for one exception.
 *
 * @param exceptionId - The exception the options are measured for.
 * @returns The path of SCR-04 for that exception.
 */
function scenariosRouteFor(exceptionId: ExceptionId): string {
  return `${EXCEPTION_QUEUE_PATH}/${exceptionId}/scenarios`;
}

/* ---------------------------------------------------------------------------------------------
 * The sentence a failed write reports
 * ------------------------------------------------------------------------------------------- */

/**
 * The sentence a failed write reports: the service's own when it refused with a `Problem`, and the
 * screen's own when it failed some other way.
 *
 * @param thrown - What the write rejected with.
 * @returns The sentence to print beside the failure.
 */
function failureMessageOf(thrown: unknown): string {
  return isProblem(thrown) ? thrown.message : INVESTIGATION_TEXT.writeFailed;
}

/**
 * A record's own spelling, made readable: its words separated by spaces, the first one capitalised.
 *
 * The vocabulary stays the record's — a severity of `high` reads "High", a result of `succeeded`
 * reads "Succeeded" — so a value this screen has never seen still reads as the record spells it, and
 * a status label is never replaced by the meaning its icon carries (rule B-3, rule P-6).
 *
 * @param value - The record's own spelling.
 * @returns The same words, read as a label.
 */
function sentenceOf(value: string): string {
  const words = value.split(/[-_\s]+/).filter((word) => word !== '');

  const [first] = words;

  if (first === undefined) {
    return value;
  }

  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(' ');
}

/* ---------------------------------------------------------------------------------------------
 * The shared status vocabulary, applied to the four closed vocabularies this screen prints
 * ------------------------------------------------------------------------------------------- */

/**
 * What each severity amounts to in the shared status vocabulary.
 *
 * No input fixes this mapping, so it is this screen's decision and it is made once: the most urgent
 * level reads as a failure, the next as a warning, the third as something to review and the least
 * urgent as empty. The label beside the icon is always the record's own spelling, so the meaning never
 * replaces what the record says and no status rests on colour alone (rule B-3). Exhaustive by type, so
 * a fifth severity fails compilation here rather than rendering a status with no meaning.
 */
const SEVERITY_MEANINGS = {
  critical: 'fail',
  high: 'warning',
  medium: 'review',
  low: 'empty',
} as const satisfies Record<Severity, StatusMeaning>;

/**
 * What each exception status amounts to in the same vocabulary: an open exception is the warning a
 * planner acts on, a resolved one a pass, and a dismissed one empty — it was set aside rather than
 * answered. Exhaustive by type for the reason above.
 */
const STATUS_MEANINGS = {
  open: 'warning',
  resolved: 'pass',
  dismissed: 'empty',
} as const satisfies Record<ExceptionStatus, StatusMeaning>;

/**
 * What each confidence level amounts to in the same vocabulary: a high reading is a pass, a medium one
 * is something to review, and a low one is the warning that the assessment rests on little.
 */
const CONFIDENCE_MEANINGS = {
  high: 'pass',
  medium: 'review',
  low: 'warning',
} as const satisfies Record<ConfidenceLevel, StatusMeaning>;

/**
 * What one recorded outcome amounts to in the same vocabulary: an allowed or succeeded event is a pass,
 * a blocked one the warning that a rule refused it, and a failed one a failure. The label is the
 * record's own spelling, so the meaning is never announced in place of what the event says.
 */
const RESULT_MEANINGS = {
  allowed: 'pass',
  blocked: 'warning',
  succeeded: 'pass',
  failed: 'fail',
} as const satisfies Record<AuditResult, StatusMeaning>;

/* ---------------------------------------------------------------------------------------------
 * This screen's own reading of an empty payload
 * ------------------------------------------------------------------------------------------- */

/**
 * Whether a payload carries nothing the investigation can show.
 *
 * The three collections the body is built from are the chain, the projection and the measured orders;
 * a payload holding none of them describes an exception the records connect to nothing, which is the
 * screen's empty state rather than a page of headings over three empty regions.
 *
 * @param detail - The payload the read returned.
 * @returns True when there is nothing to investigate.
 */
function holdsNothing(detail: ExceptionDetail): boolean {
  return (
    detail.impactChain.length === 0 &&
    detail.stockSeries.length === 0 &&
    detail.affectedOrders.length === 0
  );
}

/* ---------------------------------------------------------------------------------------------
 * The projection: the baseline the payload carries and the option the service designates
 * ------------------------------------------------------------------------------------------- */

/** No points at all, shared so an absent series allocates nothing and cannot be edited by a caller. */
const NO_POINTS: readonly LinePoint[] = [];

/**
 * The zero level the projection is read against.
 *
 * `y` is the axis's own zero rather than a reading from any record, so it types no figure the solver
 * produced; the label says what the level means in this screen's words, and `LineChart` keeps it inside
 * the drawn domain whatever the series does (rule P-6).
 */
const ZERO_REFERENCE: LineReference = { y: 0, label: INVESTIGATION_TEXT.zeroReferenceLabel };

/**
 * The payload's baseline reading as the chart's points.
 *
 * `y` places the mark and `yLabel` is the text a reader receives, which is the record value rendered as
 * text and never recomputed here; `evidenceRef` is the exception the projection was measured for, so a
 * mark opens the record whose case produced it rather than a reference nothing resolves.
 *
 * @param points - The closing-stock series exactly as the payload states it.
 * @param evidenceRef - The reference the marks carry.
 * @returns One chart point per reading, in the supplied order.
 */
function stockPointsOf(
  points: readonly DailyClosingStockPoint[],
  evidenceRef: string,
): readonly LinePoint[] {
  return points.map((point) => ({
    x: point.date,
    y: point.units,
    yLabel: String(point.units),
    evidenceRef,
  }));
}

/**
 * The idle window the projection shades: the span of days the plotted series reads no closing stock on.
 *
 * AAP 0.12.4's SCR-03 row asks the figure for "the idle window shaded". No record states a window of its
 * own, so the span is read off the series the figure plots: the first zero closing day is where the
 * window opens and the last is where it closes, in the series' own order. That selects two dates the
 * record states and measures nothing (rule P-6) — the readings, the counts and the idle-day measure stay
 * the solver's, and this module only says where to shade.
 *
 * The series read here is the one the figure states its run-out from — the option the service designates
 * — rather than the baseline: the baseline is the do-nothing case, whose stock runs out when the
 * disruption lands and therefore reads zero on every day after it, so a band read off the baseline would
 * cover the whole window and say nothing about the option the reader is looking at. The baseline answers
 * only where nothing is designated, or where the designated option carries no series of its own.
 *
 * A series with no zero closing day has no idle window, so no band is drawn: the surface shades nothing
 * rather than inventing a span, and the series is otherwise unchanged.
 *
 * @param points - The series the figure plots, exactly as its points state it.
 * @returns One band over the zero run, or no band at all.
 */
function idleWindowBandsOf(points: readonly LinePoint[]): readonly LineBand[] {
  const zeroDays = points.filter((point) => point.y === 0);
  const first = zeroDays[0];
  const last = zeroDays.at(-1);

  if (first === undefined || last === undefined) {
    return [];
  }

  return [{ from: first.x, to: last.x, label: INVESTIGATION_TEXT.idleWindowLabel }];
}

/**
 * The option the service designates as the one to read, or `undefined` when it designates none.
 *
 * The choice is the service's: `recommendedId` is the option its recommendation rule picked, and this
 * screen takes it as stated rather than comparing measures or ordering the columns itself (rule P-6).
 * A set that recommends nothing yields no second series, so the projection plots the baseline alone.
 *
 * @param set - The option set the read returned, or `undefined` when it has not answered.
 * @returns The designated option, or `undefined`.
 */
function selectedScenarioOf(set: ScenarioSet | undefined): Scenario | undefined {
  if (set === undefined || set.recommendedId === undefined) {
    return undefined;
  }

  return set.scenarios.find((scenario) => scenario.id === set.recommendedId);
}

/**
 * The two series the projection draws: the baseline first, then the designated option when there is one.
 *
 * The baseline is dashed so the two are told apart without relying on tone (rule B-3). Each series
 * declares the label its own readings require: the baseline is the solver's output, while a seeded
 * option's measures shipped with the dataset and therefore carry `Simulated data` (AAP 0.10, rule P-1).
 *
 * @param baseline - The baseline's points.
 * @param selected - The designated option, or `undefined`.
 * @param selectedPoints - The option's points, when it has any.
 * @returns The series, in the order they should be read.
 */
function seriesFor(
  baseline: readonly LinePoint[],
  selected: Scenario | undefined,
  selectedPoints: readonly LinePoint[],
): readonly LineSeriesSpec[] {
  const baselineSeries: LineSeriesSpec = {
    id: 'baseline',
    label: INVESTIGATION_TEXT.baselineSeriesLabel,
    tone: 'accent',
    points: baseline,
    simLabel: CALCULATED_LABEL,
    dashed: true,
  };

  if (selected === undefined) {
    return [baselineSeries];
  }

  const selectedSeries: LineSeriesSpec = {
    id: selected.id,
    label: `${INVESTIGATION_TEXT.selectedSeriesPrefix} ${selected.name}`,
    tone: 'review',
    points: selectedPoints,
    simLabel: selected.origin === 'seeded' ? DATA_LABEL : CALCULATED_LABEL,
  };

  return [baselineSeries, selectedSeries];
}

/**
 * The projection's caption, composed from the dates the supplied points themselves carry.
 *
 * The payload states no window label, so the caption names the span the series actually
 * covers rather than a date this module typed: the first and last dates are the records' own, printed as
 * the records state them.
 *
 * @param series - The series the surface draws.
 * @returns The figure's title, its accessible name and its table view's name.
 */
function projectionCaptionOf(series: readonly LineSeriesSpec[]): string {
  for (const spec of series) {
    const first = spec.points[0];
    const last = spec.points[spec.points.length - 1];

    if (first !== undefined && last !== undefined) {
      return `${INVESTIGATION_TEXT.projectionPrefix} from ${first.x} to ${last.x}`;
    }
  }

  return INVESTIGATION_TEXT.projectionPrefix;
}

/**
 * The run-out reading the projection states under its title, for the option the service designates.
 *
 * AAP §0.8 requires the run-out pair rendered as "the day plus a half-day reading such as 'midday'", and
 * this screen states it for the option whose series it draws: the option's own series label names it,
 * and its own pair supplies the day. The wording of the reading is
 * `../../components/run-out-reading.ts`'s, the pair is the record's, so nothing is measured, typed or
 * formatted here beyond the joining words (rule P-6). No designated option means no reading, and the
 * projection then states no description at all rather than one about an option it does not draw.
 *
 * @param series - The series the surface draws, whose labels name each option.
 * @param selected - The designated option, or `undefined`.
 * @returns The sentence under the title, or `undefined` when there is nothing to state.
 */
function projectionDescriptionOf(
  series: readonly LineSeriesSpec[],
  selected: Scenario | undefined,
): string | undefined {
  if (selected === undefined) {
    return undefined;
  }

  const drawn = series.find((spec) => spec.id === selected.id);

  if (drawn === undefined) {
    return undefined;
  }

  return `${drawn.label}${INVESTIGATION_TEXT.runOutSeparator}${runOutStatement(selected.runOut)}`;
}

/**
 * What the projection shows where it cannot be drawn.
 *
 * The payload's own missing inputs are the reason a projection could not be completed, so they are
 * printed beside the fixed words; a payload that names none says instead that the records carry no case
 * to measure. No series, no reading and no recommendation accompanies either sentence (AAP 0.2.2).
 *
 * @param detail - The payload the read returned.
 * @returns The sentence standing where the surface would be.
 */
function cannotComputeMessageOf(detail: ExceptionDetail): string {
  const reasons = detail.missingInputs;

  return reasons.length === 0
    ? `${INVESTIGATION_TEXT.cannotCompute}. ${INVESTIGATION_TEXT.cannotComputeNoCase}`
    : `${INVESTIGATION_TEXT.cannotCompute}. ${reasons.join(' ')}`;
}

/**
 * The promised dates the projection marks, one per date the exception's affected lines promise.
 *
 * A due date is a record value, so the marker sits on the date the line carries; the label names the
 * orders promised that day, joined from the records rather than counted here. No date is derived,
 * compared or adjusted (rule P-6).
 *
 * @param exception - The exception whose affected lines are marked.
 * @returns One marker per promised date, in the order the records state them.
 */
function dueDateMarkersOf(exception: OperationalException): readonly LineMarker[] {
  const ordersByDate = new Map<IsoDate, string[]>();

  for (const line of exception.affectedLines) {
    const orders = ordersByDate.get(line.dueDate);

    if (orders === undefined) {
      ordersByDate.set(line.dueDate, [line.orderId]);
      continue;
    }

    if (!orders.includes(line.orderId)) {
      orders.push(line.orderId);
    }
  }

  return [...ordersByDate.entries()].map(([x, orders]) => ({ x, label: orders.join(', ') }));
}

/* ---------------------------------------------------------------------------------------------
 * The measured orders: the payload's own rows, joined to the exception's lines for their dates
 * ------------------------------------------------------------------------------------------- */

/**
 * One row of the affected-orders table: what the payload measured, plus the two record values the
 * exception's own affected lines carry for the same order.
 *
 * The two joined members are declared as possibly absent rather than optional, so a measured order with
 * no line renders an empty cell instead of the word `undefined`.
 */
interface AffectedOrderRow {
  /** The customer order the payload measured. */
  readonly orderId: CustomerOrderId;

  /** The units the baseline leaves late. */
  readonly unitsLate: number;

  /** How many days late the last of those units is. */
  readonly daysLate: number;

  /** The date the customer was promised, taken from the exception's line for this order. */
  readonly dueDate: IsoDate | undefined;

  /** The units of that line the exception places at risk, taken from the same line. */
  readonly unitsAtRisk: number | undefined;
}

/** No rows at all, shared for the same reason as {@link NO_POINTS}. */
const NO_ORDER_ROWS: readonly AffectedOrderRow[] = [];

/**
 * The exception's own line for one order, when the records carry it.
 *
 * @param exception - The exception whose affected lines are searched.
 * @param orderId - The order the row reports.
 * @returns The line, or `undefined` when the exception does not name it.
 */
function lineFor(
  exception: OperationalException,
  orderId: CustomerOrderId,
): AffectedLine | undefined {
  return exception.affectedLines.find((line) => line.orderId === orderId);
}

/**
 * The payload's measured orders as table rows, in the order the solver measured them.
 *
 * Nothing is ordered, filtered or measured here: the join supplies the promised date and the units at
 * risk the payload itself does not carry on these rows, and every figure comes from a record.
 *
 * @param detail - The payload the read returned.
 * @returns One row per measured order.
 */
function orderRowsOf(detail: ExceptionDetail): readonly AffectedOrderRow[] {
  return detail.affectedOrders.map((order) => {
    const line = lineFor(detail.exception, order.orderId);

    return {
      orderId: order.orderId,
      unitsLate: order.unitsLate,
      daysLate: order.daysLate,
      dueDate: line?.dueDate,
      unitsAtRisk: line?.unitsAtRisk,
    };
  });
}

/**
 * The orders table's columns.
 *
 * Every identifier and date is rendered by the interface's one formatter and every measured figure is
 * wrapped in the control that opens its evidence, so no cell states a number a reader cannot follow
 * (rule P-6). No column is orderable — the rows are the solver's own order — so `DataTable` draws no
 * sort control and an ordering is never offered that would have nothing to report.
 */
const ORDER_COLUMNS: readonly TableColumn<AffectedOrderRow>[] = [
  {
    id: 'order',
    header: INVESTIGATION_TEXT.orderColumn,
    render: (row) => (
      <EvidenceRef ref={row.orderId}>
        <MonoValue value={row.orderId} kind="id" />
      </EvidenceRef>
    ),
  },
  {
    id: 'unitsLate',
    header: INVESTIGATION_TEXT.unitsLateColumn,
    align: 'end',
    render: (row) => <EvidenceRef ref={row.orderId}>{row.unitsLate}</EvidenceRef>,
  },
  {
    id: 'daysLate',
    header: INVESTIGATION_TEXT.daysLateColumn,
    align: 'end',
    render: (row) => <EvidenceRef ref={row.orderId}>{row.daysLate}</EvidenceRef>,
  },
  {
    id: 'promised',
    header: INVESTIGATION_TEXT.promisedColumn,
    render: (row) =>
      row.dueDate === undefined ? '' : <MonoValue value={row.dueDate} kind="timestamp" />,
  },
  {
    id: 'unitsAtRisk',
    header: INVESTIGATION_TEXT.unitsAtRiskColumn,
    align: 'end',
    render: (row) =>
      row.unitsAtRisk === undefined ? (
        ''
      ) : (
        <EvidenceRef ref={row.orderId}>{row.unitsAtRisk}</EvidenceRef>
      ),
  },
];

/**
 * `DataTable` requires a sort handler, and this table offers no ordering.
 *
 * Every column above clears its `sortable` flag, so the component draws no sort control and this
 * handler is unreachable; it exists only to satisfy the required prop, which `src/components/chart-frame.tsx`
 * documents for the same case.
 */
const KEEP_SUPPLIED_ROW_ORDER = (): void => {};

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The screen's column: one block on the 4 px grid, in the order the screen answers its questions. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-6';

/** The facts region: the record's facts beside the computed figure, wrapping when the width runs out. */
const FACT_ROW_CLASSES = 'flex min-w-0 flex-wrap items-stretch gap-4';

/** One labelled fact: its name in the caption role above its value. */
const FACT_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The fact's name: the type scale's 12 px step in the caption role. */
const TERM_CLASSES = 'text-12 text-text-caption';

/** A row of values or controls, wrapping rather than overflowing its cell. */
const VALUE_ROW_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2 text-14 text-text-primary';

/** The list of facts, one column on the same 4 px step. */
const FACT_LIST_CLASSES = 'flex min-w-0 flex-col gap-3';

/** The record's own sentence, and any other running text at the 14 px step in the primary role. */
const BODY_CLASSES = 'min-w-0 break-words text-14 text-text-primary';

/** A secondary sentence beneath a figure or beneath a table. */
const DETAIL_CLASSES = 'min-w-0 break-words text-13 text-text-secondary';

/** The type step a simulated label takes inside a region that is already named. */
const LABEL_CLASSES = 'text-13';

/**
 * The report a completed or refused write leaves behind: the inset box `src/components/card.tsx`
 * names as the third surface role, stacked so the outcome's indicator and its sentence sit one 4 px
 * step apart. The box's boundary, radius, surface and padding come from `INSET_SURFACE_CLASSES`, so
 * this report wears the same surface as the exception queue's own report region and the two shared
 * notices instead of hand-rolling a fourth box of its own.
 */
const REPORT_CLASSES = `flex min-w-0 flex-col gap-1 ${INSET_SURFACE_CLASSES}`;

/** The group holding a table and the label and sentence that qualify its figures. */
const TABLE_GROUP_CLASSES = 'flex min-w-0 flex-col gap-2';

/** The activity list: one entry per event, in the chain's own order. */
const ACTIVITY_LIST_CLASSES = 'flex min-w-0 list-none flex-col gap-2';

/** One activity entry: its instant and identifier above its action and outcome. */
const ACTIVITY_ITEM_CLASSES =
  'flex min-w-0 flex-col gap-1 rounded-control border border-hairline px-2 py-1';

/** The missing-inputs list: a bulleted column of the sentences the payload states. */
const MISSING_INPUTS_CLASSES = 'flex min-w-0 list-disc flex-col gap-1 pl-5';

/** The confidence region: the level, its reason and the inputs, on the same grid step. */
const CONFIDENCE_CLASSES = 'flex min-w-0 flex-col gap-2';

/** The note form's field group. */
const FIELD_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The note field: the theme's control boundary, the card radius and the 2 px focus ring of rule B-3. */
const NOTE_FIELD_CLASSES =
  'min-h-24 w-full min-w-0 resize-y rounded-control border border-control-boundary bg-surface-1 px-2 py-1 text-14 text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

/** A refusal printed under the note field, in the failure role. */
const FAILURE_CLASSES = 'text-12 text-status-fail';

/**
 * The link back to the queue.
 *
 * It composes the bordered shape `src/components/tooltip.tsx` owns rather than restating it, so the one
 * control on the not-found panel answers the pointer the way every other control does and picks up their
 * token changes with them; `self-start` keeps it at its own width inside the column.
 */
const QUEUE_LINK_CLASSES = [
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
  'self-start',
].join(' ');

/**
 * Invalidates every cached entry of each read a recorded write moved.
 *
 * Every entry is keyed `[method, ...args]` (AAP 0.6.2), so naming a member invalidates every entry of
 * that read under every argument list — TanStack Query's default match is by key prefix — and the row is
 * the one table in `src/services/write-reads.ts`, so this screen and the write channel that feeds the
 * cache name the same reads.
 *
 * @param queryClient The client this screen obtained with `useQueryClient()`.
 * @param reads The port members the write moved. An empty list invalidates nothing.
 */
function invalidateReads(queryClient: QueryClient, reads: readonly CachedRead[]): void {
  for (const read of reads) {
    void queryClient.invalidateQueries({ queryKey: [read] });
  }
}

/* ---------------------------------------------------------------------------------------------
 * The note form
 * ------------------------------------------------------------------------------------------- */

/**
 * What the screen hands its note form: the exception a note is recorded against, and the two outcomes
 * the caller reacts to. The form makes the port's call itself, so no request and no payload is
 * supplied — only the identifier the write targets, the dismissal, and the signal that the write
 * landed and the reads it moved are stale.
 */
interface NoteFormProps {
  /** The exception the note is recorded against. */
  readonly exceptionId: ExceptionId;

  /** Closes the form without recording anything. */
  readonly onClose: () => void;

  /** Runs once the port has recorded the note, so the caller can re-read what the write moved. */
  readonly onRecorded: () => void;
}

/**
 * The note field and its two controls.
 *
 * The field is a multi-line field composed through `TextAreaField`, which owns the `<textarea>`
 * element (AAP §0.5.2); this screen supplies the label, the token-built class list and the sentence a
 * refusal prints. `ActionButton` owns both buttons beside it, and the label is bound to the field by
 * `htmlFor`/`id`, so the control has a name a reader can hear (rule B-3). Recording is disabled with a
 * plain reason until the field holds something, and while the write is in flight, so pressing it can
 * never send a note the records would refuse for being empty (rule P-8). A refusal keeps the typed text
 * and prints the service's own sentence beneath the field rather than discarding the reader's work.
 *
 * Focus moves into the field as the form opens and returns to whatever opened it as the form closes, so
 * a keyboard reader's first keystrokes reach the field and their place in the page survives the form
 * appearing and leaving (rule B-3). The form closes in one of three ways — `Cancel`, the close that
 * follows a recorded note, and a re-render that hides the card — and every one unmounts this component,
 * so the one return covers all three.
 */
function NoteForm({ exceptionId, onClose, onRecorded }: NoteFormProps): ReactElement {
  const service = useService();

  const fieldId = useId();
  const failureId = useId();

  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const fieldRef = useRef<HTMLTextAreaElement | null>(null);

  /* The latch a submission is held by. `submitting` reaches the rendered control only in the pass that
     follows the state change that set it, so two activations inside one synchronous block both read the
     state before that pass and both pass the gate; the latch is tested and set in the handler itself,
     before the port is called, so a second activation arriving ahead of that pass is discarded and one
     note cannot be recorded twice, while the control's presentation stays the one rule P-8 asks for. It
     is released once the port has answered, whatever it answered, so a refused note leaves the reader
     free to correct it and record it again. */
  const inFlight = useRef(false);

  /* While the write is in flight that state outranks the field's own requirement: the reader can no
     longer change the outcome, so the control says what is actually holding it. */
  const blocker = submitting
    ? INVESTIGATION_TEXT.noteInFlight
    : draft.trim() === ''
      ? INVESTIGATION_TEXT.noteRequired
      : null;

  /* Focus moves into the field as the form opens and returns to whatever opened it as the form closes.
     The opener is read in this pass rather than in a later one, because the field is focused straight
     after and `document.activeElement` would already be that field. */
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    fieldRef.current?.focus();

    return () => {
      opener?.focus();
    };
  }, []);

  /** Records the note once, through the port, and reports what the service answered. */
  const recordNote = (): void => {
    if (blocker !== null || inFlight.current) {
      return;
    }

    const note = draft.trim();

    inFlight.current = true;
    setFailure(null);
    setSubmitting(true);

    void (async () => {
      try {
        await service.noteException(exceptionId, note);
        setSubmitting(false);
        setDraft('');
        onRecorded();
      } catch (thrown) {
        setSubmitting(false);
        setFailure(failureMessageOf(thrown));
      } finally {
        inFlight.current = false;
      }
    })();
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className={FIELD_CLASSES}>
        <label className={TERM_CLASSES} htmlFor={fieldId}>
          {INVESTIGATION_TEXT.noteField}
        </label>
        <TextAreaField
          id={fieldId}
          ref={fieldRef}
          className={NOTE_FIELD_CLASSES}
          value={draft}
          aria-describedby={failure === null ? undefined : failureId}
          aria-invalid={failure === null ? undefined : true}
          onChange={setDraft}
        />
        {failure === null ? null : (
          <p id={failureId} className={FAILURE_CLASSES}>
            {failure}
          </p>
        )}
      </div>

      <div className={VALUE_ROW_CLASSES}>
        {blocker === null ? (
          <ActionButton variant="primary" onClick={recordNote}>
            {INVESTIGATION_TEXT.recordNote}
          </ActionButton>
        ) : (
          <ActionButton variant="primary" disabled disabledReason={blocker}>
            {INVESTIGATION_TEXT.recordNote}
          </ActionButton>
        )}
        <ActionButton variant="secondary" onClick={onClose}>
          {INVESTIGATION_TEXT.cancelNote}
        </ActionButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Who may work this exception — contracts §7.1, rules P-3 and P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission a write to an exception requires — contracts §7.1's `exception.work` cell, the one the
 * adapter evaluates as `requireWork` before it changes a record.
 *
 * Held as a typed `Permission` rather than written into a sentence, so a reworded matrix row fails to
 * compile here instead of reaching a reader as text that names a permission the service no longer
 * enforces (rule P-6).
 */
const WORK_PERMISSION: Permission = 'exception.work';

/**
 * Whether the acting persona may work a record that lands on one plant.
 *
 * This is the matrix's own answer for every persona the demonstration seeds. A persona's `permissions`
 * are the row contracts §7.1 grants its role, and its `plantIds` are that role's scope as
 * `plantScopeFor` states it, so holding the permission *and* reaching the plant is exactly
 * `hasPermission(role, 'exception.work', exception, actor)`: the scope test the matrix applies to the
 * role is the same set the persona carries, and the persona's own set narrows it no further. Both facts
 * arrive from the adapter through `useActiveUser()`, the only route a feature has to them (rule P-2),
 * and the adapter keeps enforcing the permission on the call itself, so a disabled control is an
 * explanation and never the defence (rule P-3).
 *
 * @param actingUser - The persona the adapter is enforcing.
 * @param plantId - The plant the record lands on.
 * @returns Whether this persona may change records at that plant.
 */
function mayWork(actingUser: ActiveUser, plantId: PlantId): boolean {
  return actingUser.permissions.includes(WORK_PERMISSION) && actingUser.plantIds.includes(plantId);
}

/**
 * The sentence the screen's two write controls are disabled with when the acting persona may not work the
 * exception.
 *
 * {@link mayWork} refuses for two different reasons, and the sentence states the one that failed rather
 * than one shape for both:
 *
 * - The persona holds `exception.work` while its own plants do not include the exception's. It is then
 *   one of the permission's holders, so nothing here names the roles that hold it: the sentence states
 *   the permission it holds, the plant it does not reach and the plants it does, the last of them the
 *   persona's own `plantIds` in the order the adapter reports them (rule P-6).
 * - The persona does not hold the permission at all. The sentence states the permission and the plant,
 *   and then, once the roster has answered, the roles that hold the permission in the roster's own
 *   order, with the acting role left out because this branch has established that it is not one of
 *   them. A roster nobody has reported, or one that reports no holder at all, leaves that closing
 *   clause out rather than claiming no role may act.
 *
 * Either way rule P-8 owes a reader who has not activated the control a true reason for its state.
 *
 * @param actingUser - The persona the adapter is enforcing.
 * @param plantId - The plant the exception lands on.
 * @param rolesWithWork - The roles holding `exception.work`, or `null` while that is unknown.
 * @returns The sentence explaining the disabled state.
 */
function noWorkReason(
  actingUser: ActiveUser,
  plantId: PlantId,
  rolesWithWork: readonly Role[] | null,
): string {
  if (actingUser.permissions.includes(WORK_PERMISSION)) {
    const reached =
      `${INVESTIGATION_TEXT.noWorkActor} (${actingUser.role}) ${INVESTIGATION_TEXT.noWorkHolds} ` +
      `${WORK_PERMISSION} ${INVESTIGATION_TEXT.noWorkNotOver} ${plantId}, ` +
      INVESTIGATION_TEXT.noWorkOutcome;

    /* A persona whose own scope names no plant has no plant to state, so the clause is left out. */
    return actingUser.plantIds.length === 0
      ? reached
      : `${reached} ${INVESTIGATION_TEXT.noWorkPlants} ${actingUser.plantIds.join(', ')}.`;
  }

  const opening =
    `${INVESTIGATION_TEXT.noWorkActor} (${actingUser.role}) ${INVESTIGATION_TEXT.noWorkLacks} ` +
    `${WORK_PERMISSION} ${INVESTIGATION_TEXT.noWorkOver} ${plantId}, ` +
    INVESTIGATION_TEXT.noWorkOutcome;
  const othersWithWork =
    rolesWithWork === null ? [] : rolesWithWork.filter((role) => role !== actingUser.role);

  if (othersWithWork.length === 0) {
    return opening;
  }

  return `${opening} ${INVESTIGATION_TEXT.noWorkRoles} ${othersWithWork.join(', ')}.`;
}

/**
 * Why a write to the exception cannot act, or `null` when it can.
 *
 * Both writes this screen offers — assigning the exception and recording a note on it — are refused by
 * the same adapter gate, so both state the same reason, and neither is offered to a persona the service
 * would refuse. A persona the adapter has not reported blocks nothing: the control would otherwise be
 * disabled on a fact nobody knows, and the service refuses the write either way (rules P-3 and P-8).
 *
 * @param exception - The record the control would act on.
 * @param actingUser - The persona the adapter is enforcing, or `null` while it is unknown.
 * @param rolesWithWork - The roles holding `exception.work`, or `null` while that is unknown.
 * @returns The sentence explaining the disabled state, or `null` when the write may act.
 */
function workBlockerOf(
  exception: OperationalException,
  actingUser: ActiveUser | null,
  rolesWithWork: readonly Role[] | null,
): string | null {
  if (actingUser === null || mayWork(actingUser, exception.plantId)) {
    return null;
  }

  return noWorkReason(actingUser, exception.plantId, rolesWithWork);
}

/* ---------------------------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------------------------- */

/**
 * What the router hands SCR-03: the shell's plant and product selection, and nothing else — the
 * exception itself comes from the `:exceptionId` parameter, which the screen reads. The selection is
 * optional because a route mounted before the top bar's filters resolve supplies none, and it earns no
 * place in the request or in the cache keys either: the port takes the identifier alone and narrows by
 * the acting role's plant scope itself (AAP 0.6.2, 0.12.4).
 */
export interface InvestigationScreenProps {
  /**
   * The shell's plant and product selection.
   *
   * The detail read itself is not scope-parameterised: the port's method takes the identifier and the
   * service narrows by the acting role's plant scope, refusing an exception outside it as one this read
   * does not reach. The selection is carried in neither of this screen's cache keys, so a change in the
   * top bar re-reads nothing here: the record cannot differ under one (AAP 0.6.2, 0.12.4).
   */
  readonly scope?: Scope;
}

/** What a completed or refused write leaves on screen: its meaning, its headline and its detail. */
interface WriteReport {
  /** The status meaning the report reads as. */
  readonly meaning: StatusMeaning;

  /** The one line saying what happened. */
  readonly headline: string;

  /** The service's own sentence on a refusal, or the affected record on a success. */
  readonly detail?: string;
}

/**
 * Renders SCR-03: one exception investigated, from what changed through to the options.
 *
 * The read is keyed on the method's name and the exception's identifier alone — the port takes the
 * identifier, and the adapter applies the acting role's plant scope itself — and its settled facts
 * decide the state in one place ({@link deriveScreenState}); the boundary owns how that state looks.
 * The option set is read beside it so the projection can plot the designated option, and its
 * failure is deliberately not fatal: an exception whose options cannot be read still shows what
 * changed, what it touches and what the baseline projects. The only state this component owns is what
 * the reader chose — whether the note form is open, and the report a write left behind.
 *
 * @param _props - The shell's plant and product selection, accepted for the router's uniform route
 *   contract; no read on this screen is parameterised by it.
 * @returns The investigation inside the state boundary, or the panel that explains a route which names
 *   no readable exception.
 */
export function InvestigationScreen(_props: InvestigationScreenProps): ReactElement {
  const service = useService();
  const activeUser = useActiveUser();
  const demonstration = useDemonstration();
  /*
   * The roles the permission a write needs reaches, read from the roster the service reports so a
   * disabled control can name who may act (rule P-8). `null` while that answer is unknown: the sentence
   * then leaves the role clause out rather than claiming no role may act.
   */
  const rolesWithWork = useRolesHolding(WORK_PERMISSION);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const params = useParams<{ exceptionId: string }>();
  const exceptionId = params.exceptionId;

  const [noteOpen, setNoteOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [report, setReport] = useState<WriteReport | null>(null);

  /*
   * The investigation read. Retries are off on purpose: a refusal the records' own permissions produce
   * fails the same way however often it is repeated, and the boundary offers the reader an explicit
   * retry for the case where repeating the call can succeed.
   */
  const detailQuery = useQuery<Result<ExceptionDetail>, unknown>({
    queryKey: ['getExceptionDetail', exceptionId],
    queryFn:
      exceptionId === undefined ? skipToken : () => service.getExceptionDetail(exceptionId),
    retry: false,
  });

  /*
   * The options read, which supplies the projection's second series. An exception with no solver case
   * answers with an empty set rather than a failure, so no error state is raised for one; a refusal
   * simply leaves the projection plotting the baseline alone.
   */
  const scenarioQuery = useQuery<Result<ScenarioSet>, unknown>({
    queryKey: ['getScenarioSet', exceptionId],
    queryFn: exceptionId === undefined ? skipToken : () => service.getScenarioSet(exceptionId),
    retry: false,
  });

  /*
   * The roster the owner is named from. `listPersonas` is optional on the demonstration capability —
   * a deployment knows its caller from the session that reached it — so the read runs only when the
   * bound adapter holds it, and it is bound once here rather than narrowed again inside the query.
   *
   * The value cached is the persona list, not the `Result` envelope the call resolves, and it is
   * keyed under this screen's own `'investigation'` qualifier. One member serves several readers —
   * this screen, the approval detail, the governance screens and the shell's role switcher
   * (`src/app/role-switcher.tsx`) — so a key names its reader as well as its member: a key's value
   * shape belongs to the reader that caches it, and naming the reader is what keeps one reader's
   * shape from reaching another.
   */
  const readPersonas =
    demonstration === null ? undefined : demonstration.listPersonas?.bind(demonstration);

  const personasQuery = useQuery<readonly ActiveUser[], unknown>({
    queryKey: ['listPersonas', 'investigation'],
    queryFn: readPersonas === undefined ? skipToken : async () => (await readPersonas()).data,
    retry: false,
  });

  const result = detailQuery.data;
  const detail = result?.data;
  const scenarioSet = scenarioQuery.data?.data;

  /*
   * The owner, named as the person the record's identifier stands for. The exception states its
   * `ownerId` and nothing that reads as a person, and the roster is the only source of a persona's
   * name (rule P-2), so the text shown is a join of two records rather than a value of this module's
   * own — presented the way the role switcher presents a persona, the name and then the role it acts
   * in (`src/app/role-switcher.tsx`), so the facts and the switcher describe one persona one way.
   * Until the roster answers, when the bound adapter carries none, or when the roster does not name
   * that identifier, this is `undefined` and the record's own identifier stays what the facts show:
   * the alternative is a name this module would have to invent (rules P-6, P-7).
   */
  const owner = personasQuery.data?.find((persona) => persona.id === detail?.exception.ownerId);
  const ownerName = owner === undefined ? undefined : `${owner.name} · ${owner.role}`;

  /*
   * The read's own facts, plus this screen's reading of its payload. The route comes first: an address
   * naming no exception has nothing to read. This screen's figures come from several sources, so the
   * stale notice names whichever one the service reported rather than a source chosen here; a payload
   * whose own missing inputs are not empty reports itself incomplete; and a payload holding none of the
   * three collections is the empty state. A `'not-found'` refusal is the unified `'empty'`, which the
   * panel below replaces before the boundary ever renders it.
   */
  const state = deriveScreenState({
    namedNoRecord: exceptionId === undefined,
    isPending: detailQuery.isPending,
    error: detailQuery.error,
    freshness: result?.meta.freshness,
    payloadReportsPartial: detail !== undefined && detail.missingInputs.length > 0,
    hasContent: detail === undefined ? false : !holdsNothing(detail),
  });
  const staleRecord = result === undefined ? undefined : staleSourceOf(result.meta.freshness);
  const forbiddenRecord = forbiddenOf(detailQuery.error);

  const retryRead = (): void => {
    void detailQuery.refetch();
  };

  /* A route that names no exception, and an identifier the records do not hold, are both answered by
     the panel below rather than by an empty page: the union has no member for the second, and a reader
     who mistyped an address is owed the way back. */
  const notFoundSentence =
    exceptionId === undefined
      ? INVESTIGATION_TEXT.noIdentifier
      : isProblem(detailQuery.error) && detailQuery.error.type === 'not-found'
        ? detailQuery.error.message
        : null;

  const partialMessage =
    detail === undefined || detail.missingInputs.length === 0
      ? INVESTIGATION_TEXT.partial
      : `${INVESTIGATION_TEXT.partial} ${detail.missingInputs.join(' ')}`;

  const baselinePoints =
    detail === undefined ? NO_POINTS : stockPointsOf(detail.stockSeries, detail.exception.id);
  const selected = selectedScenarioOf(scenarioSet);
  const selectedPoints =
    selected === undefined ? NO_POINTS : stockPointsOf(selected.dailyClosingStock, selected.id);
  const series = seriesFor(baselinePoints, selected, selectedPoints);

  const projectionCaption = projectionCaptionOf(series);
  const projectionDescription = projectionDescriptionOf(series, selected);
  const projectionEmptyMessage =
    detail !== undefined && detail.stockSeries.length === 0
      ? cannotComputeMessageOf(detail)
      : INVESTIGATION_TEXT.projectionEmpty;
  const markers = detail === undefined ? [] : dueDateMarkersOf(detail.exception);

  /* The band is the run-out the figure's own selected scenario states — the option's own points when the
     service designates one that carries them, the baseline's otherwise — so the shade names the window a
     reader is looking at rather than the do-nothing case's whole run (AAP 0.12.4). */
  const bands = idleWindowBandsOf(selectedPoints.length > 0 ? selectedPoints : baselinePoints);
  const orderRows = detail === undefined ? NO_ORDER_ROWS : orderRowsOf(detail);

  /** Moves to the comparison for this exception, which is the action the screen exists to reach. */
  const openScenarios = (): void => {
    if (exceptionId !== undefined) {
      navigate(scenariosRouteFor(exceptionId));
    }
  };

  /** Opens the assistant, which is a route of this stage rather than a panel of this screen. */
  const openAssistant = (): void => {
    navigate(ASSISTANT_ROUTE);
  };

  /**
   * Why "assign to me" cannot act, or `null` when it can.
   *
   * Four conditions are decided here, in the order a reader meets them: an assignment already being
   * recorded, a session whose adapter reports no persona (which cannot name an assignee at all), a
   * persona that does not hold `exception.work` over the exception's plant, and an exception the acting
   * persona already owns — assigning it again would change nothing and append an event for a change that
   * did not happen. The permission stands ahead of the record's own state because it answers whether this
   * persona may act at all, and the adapter refuses the assignment on it (AAP 0.2.1, rule P-8).
   *
   * @param exception - The record the control would act on.
   * @param actingUser - The persona the adapter is enforcing, or `null`.
   * @returns The sentence explaining the disabled state, or `null`.
   */
  function assignBlockerOf(
    exception: OperationalException,
    actingUser: ActiveUser | null,
  ): string | null {
    if (assigning) {
      return INVESTIGATION_TEXT.assignInFlight;
    }

    if (actingUser === null) {
      return INVESTIGATION_TEXT.assignUnavailable;
    }

    const workBlocker = workBlockerOf(exception, actingUser, rolesWithWork);

    if (workBlocker !== null) {
      return workBlocker;
    }

    return exception.ownerId === actingUser.id ? INVESTIGATION_TEXT.alreadyOwner : null;
  }

  /**
   * Assigns the exception to the acting persona, once, through the port.
   *
   * The assignee is the persona the provider reports, which is the persona the adapter is enforcing, so
   * this screen names no user of its own (rule P-6). A recorded assignment invalidates the reads the
   * write moved — this exception's detail so the activity beneath it shows the event the append recorded,
   * the queue's owner column, the overview's tiles and the ribbon, all named once in
   * `WRITE_READS.assignException` — and a refused one changes nothing and reports the service's own
   * sentence.
   */
  const assignToMe = (): void => {
    if (detail === undefined || exceptionId === undefined || activeUser === null || assigning) {
      return;
    }

    const assignee = activeUser.id;

    setReport(null);
    setAssigning(true);

    void (async () => {
      try {
        const assigned = await service.assignException(exceptionId, assignee);
        invalidateReads(queryClient, WRITE_READS.assignException);
        setAssigning(false);
        setReport({
          meaning: 'pass',
          headline: INVESTIGATION_TEXT.assigned,
          detail: assigned.data.ownerId,
        });
      } catch (thrown) {
        setAssigning(false);
        setReport({
          meaning: 'fail',
          headline: INVESTIGATION_TEXT.writeFailed,
          detail: failureMessageOf(thrown),
        });
      }
    })();
  };

  /** Opens the note form; nothing is written until its record control is reached. */
  const openNoteForm = (): void => {
    setNoteOpen(true);
  };

  /** Closes the note form without recording anything. */
  const closeNoteForm = (): void => {
    setNoteOpen(false);
  };

  /**
   * Records what a completed note means for this screen: the reads the write moved are invalidated —
   * this exception's detail, the queue row that summarises it, the overview and the ribbon, from
   * `WRITE_READS.noteException` — and the report says the note was recorded. Called by the form only
   * once the port has resolved it.
   */
  const handleNoted = (): void => {
    invalidateReads(queryClient, WRITE_READS.noteException);
    setNoteOpen(false);
    setReport({ meaning: 'pass', headline: INVESTIGATION_TEXT.noted });
  };

  if (notFoundSentence !== null) {
    return (
      <div className={SCREEN_CLASSES}>
        <PageHeader title={INVESTIGATION_TEXT.notFoundTitle} />
        <Card as="div">
          <p className={BODY_CLASSES}>{notFoundSentence}</p>
          <Link className={QUEUE_LINK_CLASSES} to={EXCEPTION_QUEUE_PATH}>
            {INVESTIGATION_TEXT.notFoundLinkLabel}
          </Link>
        </Card>
      </div>
    );
  }

  const assignBlocker =
    detail === undefined ? INVESTIGATION_TEXT.assignUnavailable : assignBlockerOf(detail.exception, activeUser);

  /*
   * Why "add note" cannot act, or `null` when it can. The note is a write to the same record, so it needs
   * the same permission over the same plant the assignment does; nothing else gates it. A payload that has
   * not arrived blocks nothing here because the header these controls sit in is not rendered until it has.
   */
  const noteBlocker =
    detail === undefined ? null : workBlockerOf(detail.exception, activeUser, rolesWithWork);

  return (
    <div className={SCREEN_CLASSES}>
      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryRead}
        emptyMessage={INVESTIGATION_TEXT.empty}
        partialMessage={partialMessage}
        conflictMessage={INVESTIGATION_TEXT.conflict}
        forbidden={forbiddenRecord}
      >
        {detail === undefined ? null : (
          <>
            <PageHeader
              title={detail.exception.title}
              eyebrow={<MonoValue value={detail.exception.id} kind="id" />}
              actions={
                <>
                  <ActionButton variant="primary" onClick={openScenarios}>
                    {INVESTIGATION_TEXT.compareOptions}
                  </ActionButton>
                  <ActionButton variant="secondary" onClick={openAssistant}>
                    {INVESTIGATION_TEXT.askAssistant}
                  </ActionButton>
                  {assignBlocker === null ? (
                    <ActionButton variant="secondary" onClick={assignToMe}>
                      {INVESTIGATION_TEXT.assignToMe}
                    </ActionButton>
                  ) : (
                    <ActionButton variant="secondary" disabled disabledReason={assignBlocker}>
                      {INVESTIGATION_TEXT.assignToMe}
                    </ActionButton>
                  )}
                  {noteBlocker === null ? (
                    <ActionButton variant="secondary" onClick={openNoteForm}>
                      {INVESTIGATION_TEXT.addNote}
                    </ActionButton>
                  ) : (
                    <ActionButton variant="secondary" disabled disabledReason={noteBlocker}>
                      {INVESTIGATION_TEXT.addNote}
                    </ActionButton>
                  )}
                </>
              }
            />

            {report === null ? null : (
              <div role="status" className={REPORT_CLASSES}>
                <StatusIndicator meaning={report.meaning} label={report.headline} />
                {report.detail === undefined ? null : (
                  <p className={DETAIL_CLASSES}>{report.detail}</p>
                )}
              </div>
            )}

            <div className={FACT_ROW_CLASSES}>
              <Panel label={INVESTIGATION_TEXT.factsGroup} className="min-w-0 flex-1">
                <dl className={FACT_LIST_CLASSES}>
                  <div className={FACT_CLASSES}>
                    <dt className={TERM_CLASSES}>{INVESTIGATION_TEXT.severityLabel}</dt>
                    <dd className={VALUE_ROW_CLASSES}>
                      <StatusIndicator
                        meaning={SEVERITY_MEANINGS[detail.exception.severity]}
                        label={sentenceOf(detail.exception.severity)}
                      />
                    </dd>
                  </div>
                  <div className={FACT_CLASSES}>
                    <dt className={TERM_CLASSES}>{INVESTIGATION_TEXT.statusLabel}</dt>
                    <dd className={VALUE_ROW_CLASSES}>
                      <StatusIndicator
                        meaning={STATUS_MEANINGS[detail.exception.status]}
                        label={sentenceOf(detail.exception.status)}
                      />
                    </dd>
                  </div>
                  <div className={FACT_CLASSES}>
                    <dt className={TERM_CLASSES}>{INVESTIGATION_TEXT.ownerLabel}</dt>
                    <dd className={VALUE_ROW_CLASSES}>
                      {ownerName === undefined ? (
                        <MonoValue value={detail.exception.ownerId} kind="id" />
                      ) : (
                        <span className={BODY_CLASSES}>{ownerName}</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </Panel>

              <MetricTile
                label={INVESTIGATION_TEXT.daysToImpactLabel}
                value={detail.exception.daysToImpact}
                evidenceRef={detail.exception.id}
                simLabel={CALCULATED_LABEL}
                hint={INVESTIGATION_TEXT.daysToImpactHint}
              />
            </div>

            {noteOpen ? (
              <Card title={INVESTIGATION_TEXT.noteHeading}>
                <NoteForm
                  exceptionId={detail.exception.id}
                  onClose={closeNoteForm}
                  onRecorded={handleNoted}
                />
              </Card>
            ) : null}

            <Card title={INVESTIGATION_TEXT.whatChangedHeading}>
              <p className={BODY_CLASSES}>{detail.exception.whatChanged}</p>
            </Card>

            <Card title={INVESTIGATION_TEXT.chainHeading}>
              <ImpactChain
                nodes={detail.impactChain}
                emptyMessage={INVESTIGATION_TEXT.chainEmpty}
              />
            </Card>

            <Card title={INVESTIGATION_TEXT.projectionHeading}>
              <ProjectedStockChart
                caption={projectionCaption}
                description={projectionDescription}
                series={series}
                references={[ZERO_REFERENCE]}
                markers={markers}
                bands={bands}
                xAxisLabel={INVESTIGATION_TEXT.projectionXAxisLabel}
                yAxisLabel={INVESTIGATION_TEXT.projectionYAxisLabel}
                emptyMessage={projectionEmptyMessage}
              />
            </Card>

            <Card title={INVESTIGATION_TEXT.ordersHeading}>
              <div className={TABLE_GROUP_CLASSES}>
                <StatusIndicator meaning="simulated" label={CALCULATED_LABEL} className={LABEL_CLASSES} />
                <p className={DETAIL_CLASSES}>{INVESTIGATION_TEXT.ordersNote}</p>
                <DataTable<AffectedOrderRow>
                  columns={ORDER_COLUMNS}
                  rows={orderRows}
                  getRowKey={(row) => row.orderId}
                  caption={INVESTIGATION_TEXT.ordersCaption}
                  sort={null}
                  onSort={KEEP_SUPPLIED_ROW_ORDER}
                  emptyMessage={INVESTIGATION_TEXT.ordersEmpty}
                />
              </div>
            </Card>

            <Panel label={INVESTIGATION_TEXT.confidenceHeading}>
              <div className={CONFIDENCE_CLASSES}>
                <StatusIndicator
                  meaning={CONFIDENCE_MEANINGS[detail.confidence.level]}
                  label={sentenceOf(detail.confidence.level)}
                />
                <p className={BODY_CLASSES}>{detail.confidence.reason}</p>
                <p className={TERM_CLASSES}>{INVESTIGATION_TEXT.missingInputsLabel}</p>
                {detail.missingInputs.length === 0 ? (
                  <p className={BODY_CLASSES}>{INVESTIGATION_TEXT.missingInputsNone}</p>
                ) : (
                  <ul className={MISSING_INPUTS_CLASSES}>
                    {detail.missingInputs.map((input) => (
                      <li key={input} className={BODY_CLASSES}>
                        {input}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>

            <Card title={INVESTIGATION_TEXT.activityHeading}>
              {detail.activity.length === 0 ? (
                <p className={BODY_CLASSES}>{INVESTIGATION_TEXT.activityEmpty}</p>
              ) : (
                <ol className={ACTIVITY_LIST_CLASSES}>
                  {detail.activity.map((event) => (
                    <li key={event.id} className={ACTIVITY_ITEM_CLASSES}>
                      <span className={VALUE_ROW_CLASSES}>
                        <MonoValue value={event.timestamp} kind="timestamp" />
                        <MonoValue value={event.id} kind="id" />
                      </span>
                      <span className={VALUE_ROW_CLASSES}>
                        <StatusIndicator
                          meaning={RESULT_MEANINGS[event.result]}
                          label={sentenceOf(event.result)}
                        />
                        <span className={BODY_CLASSES}>{sentenceOf(event.action)}</span>
                        <MonoValue value={event.actorId} kind="id" />
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </>
        )}
      </StateBoundary>
    </div>
  );
}
