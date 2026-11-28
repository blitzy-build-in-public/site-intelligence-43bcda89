/**
 * The bottom dock of the FileMap canvas: the projected closing stock of the selected exception — the
 * baseline and the option in view, over one scale — and the five latest events of the audit trail.
 *
 * WHERE IT COMES FROM. AAP §0.12.4's SCR-12 row fixes the dock's content — "bottom dock with
 * projected stock for the selected exception and the five latest audit events" — and its labelling,
 * "the dock's stock series carry `Simulated calculation`"; AAP §0.5.2 and AAP §0.12.1 place the
 * dock among the shared components this folder owns, §0.12.1 recording those as the primitives that
 * own semantics, tokens and the "View as table" toggle; AAP §0.15.1's file plan names
 * `src/components/timeline-dock.tsx` as the dock; and AAP §0.13.1 gives it this path. Both payloads
 * already exist: the baseline is the exception's `ExceptionDetail.stockSeries`, the option's series
 * is the `Scenario.dailyClosingStock` of the option the reader is shown, and the events are the
 * page `listAuditEvents` returns.
 *
 * TWO SERIES ON ONE SCALE — AAP §0.9 T-03, `src/types/screen-dto.ts`. The baseline the records
 * project for the case and the option in view are drawn by ONE chart, in that order, over one
 * calendar and one y domain, so a reader compares the two on the same marks: that contract states the
 * baseline projection with "the selected option … plotted over the same series", and a dock drawing
 * the baseline alone would withhold the projection of the option the reader is looking at. The
 * baseline is dashed, which is how the two are told apart without relying on colour (rule B-3), and
 * the zero line stays the level both are read against.
 *
 * WHY IT READS NO DATA — rule P-2, AAP §0.18.1. The dock is presentational, the way
 * `./map-canvas.tsx` and `./dependency-graph.tsx` are: the canvas screen holds the selection, asks
 * the service for the two payloads and passes them down. A dock that called the port itself would
 * put a second reader of `src/services` in the component layer, would read twice whenever two docks
 * are mounted, and could not render a payload that a preview or a test supplies. Every prop below
 * is data in, and the dock keeps no state of its own: the one piece of state on screen — which
 * representation the projected series is shown in — belongs to `./chart-frame.tsx`.
 *
 * WHY THE CHART IS COMPOSED INSIDE `ChartFrame` — rule B-3, success criterion 9, AAP §0.5.2. The
 * frame is the one owner of the "View as table" switch, and a chart reaches a screen only inside it,
 * so the dock hands the frame a `tableRows` spec built from THE SAME series array it hands the chart:
 * one date column and one column per series headed by that series' own label, over the dates the
 * records state in their own order, so the marks and the rows cannot disagree.
 * `./line-chart.tsx` is a pure surface with no toggle of its own, which is exactly why it may be
 * composed here and may not be placed on a screen on its own: the table view becomes structural
 * rather than remembered.
 *
 * WHY THE EVENTS ARE A LIST RATHER THAN A TABLE — AAP §0.5.2, §0.12.4. An event reads as a sequence
 * — identifier, instant, outcome, action, then the actor, the record and the policy behind it — and
 * five rows are read one after another rather than compared down a column. `./data-table.tsx` is
 * the application's only table vocabulary and it is reached here through the frame's table view, so
 * a second `<table>` in this file would be a second set of caption, column and row-cursor rules for
 * five items. The sequence is what the record has, so it is an `<ol>` of `<li>`.
 *
 * WHY THE UNITS PRINT AS THE VALUE ITSELF — rule P-6. The points arrive from the solver, and the
 * value printed is the number it returned: rounding it, scaling it or appending a unit would be a
 * second computation inside a component, which is the one place rule P-6 forbids one. The plain
 * count is rendered exactly as `./metric-tile.tsx` renders a count it did not compute; `yLabel` is
 * the same text, so the mark a reader focuses and the row of the table view state one number.
 *
 * WHY THE TWO FIXED LABELS ARE IMPORTED RATHER THAN TYPED — rules P-1 and P-4. `Simulated
 * calculation` and `Simulated control` are two of the seven strings specification §5.3 fixes, and
 * `SIM_LABELS` in `src/types/primitives.ts` is their single owner. Spelling either here would give
 * the fixed wording a second owner and would leave this module asserting yesterday's string after a
 * correction lands upstream. P-1 requires the exact label on the computed series, which the frame
 * paints; P-4 requires the control surface — the chain and what a reader sees of it — to be labelled
 * `Simulated control`, which the event panel carries because these events are that surface.
 *
 * WHICH LABEL THE FRAME PAINTS — rules P-1, P-6, AAP §0.10. Each series carries the label its own
 * figures require, and both arrive as data: `./line-chart.tsx` reads a series' label out in that
 * series' own legend row. The frame-level label is then the one label true of every series drawn —
 * exactly one distinct label is that label, and two series that declare different ones state the
 * weaker `Simulated data`, because a seeded option's measures shipped with the dataset rather than
 * being computed here. That is the rule
 * `src/features/scr-03-investigation/projected-stock-chart.tsx` already implements for the same pair
 * of series, and the table helpers below are its pattern for the same reason: a component may not
 * import a feature folder (AAP §0.13.2), so both are stated here again rather than reached for — as
 * `RESULT_MEANINGS` below records for the status vocabulary.
 *
 * NO CLAIM, NOTHING FETCHED, NOTHING TO CONFIGURE — rules P-4, P-7, B-1, B-2. Nothing here states
 * that a record cannot be altered, that anything is confined or that a copy could not be made: the
 * labels are the fixed strings and everything else is the record's own text. No vendor, company or
 * product name is written, and the only identifiers on screen are the ones the service supplied. The
 * module fetches no asset, reads no configuration value and holds no secret.
 *
 * NO CONTROL OF ITS OWN — rule P-8. Every control the dock puts on screen belongs to a component it
 * composes: the frame's toggle and the evidence triggers `./evidence-drawer.tsx` and
 * `./line-chart.tsx` own. This file adds no button and no link, so it cannot add a disabled control
 * that would need an explanation.
 */
import { useId } from 'react';
import type { ReactElement } from 'react';

import { SIM_LABELS } from '../types';
import type {
  AuditEvent,
  AuditResult,
  DailyClosingStockPoint,
  IsoDate,
  SimLabel,
} from '../types';
import { ChartFrame } from './chart-frame';
import type { ChartTableSpec } from './chart-frame';
import type { TableColumn } from './data-table';
import { EvidenceRef } from './evidence-drawer';
import { LineChart } from './line-chart';
import type { LinePoint, LineSeriesSpec } from './line-chart';
import { MonoValue } from './mono-value';
import { Panel } from './panel';
import { StatusIndicator } from './status-indicator';
import type { StatusMeaning } from './status-indicator';

/* ---------------------------------------------------------------------------------------------
 * The wording, and the fixed labels
 * ------------------------------------------------------------------------------------------- */

/**
 * Every string this module states, held here so the wording has one owner: the component renders
 * these, and its suite names them through this object rather than retyping them.
 *
 * None of these is a fixed specification string. The seven §5.3 labels belong to the figures that
 * carry them and are read from `SIM_LABELS` below (rule P-1); an event's action, actor, record,
 * policy and outcome are the record's own text and are never paraphrased here (rule P-6). Nothing
 * below carries an amount, an instant or a record identifier, and nothing states a property the
 * demonstration does not implement (rule P-4). The one reading the object holds — `stockZeroLabel` —
 * is the level the series is drawn against rather than a measurement of it.
 */
export const TIMELINE_DOCK_TEXT = {
  /** The dock's heading, and the accessible name of the region it renders. */
  title: 'Timeline',

  /** The caption that introduces the exception the two halves below describe. */
  selectedLabel: 'Selected exception',

  /** The caption of the projected-stock half, and of the panel that stands in for it when empty. */
  stockTitle: 'Projected stock',

  /**
   * The baseline series' name, read out with each of its marks and heading its column in the table
   * view.
   *
   * The baseline is the projection with no lever pulled — the same wording
   * `src/features/scr-03-investigation/investigation-screen.tsx` gives the same series — so a reader
   * meets the baseline under one name on both screens. A component may not import a feature folder
   * (AAP §0.13.2), so the wording is stated here as well rather than reached for.
   */
  baselineSeriesLabel: 'Baseline: no action taken',

  /**
   * What introduces the option's own name in that series' label, which is the second wording
   * SCR-03's projection uses for the same pair. The name that follows it is the record's, composed at
   * render time, so nothing here types a record's value (rule P-6).
   */
  selectedSeriesPrefix: 'Selected option:',

  /** The x axis' name: the calendar the solver projected the series over. */
  stockXAxisLabel: 'Calendar date',

  /** The y axis' name: what each plotted count is measured in. */
  stockYAxisLabel: 'Units at close',

  /** The level the series is read against, which is where stock would run out. */
  stockZeroLabel: '0',

  /** The table view's accessible name, so the switch announces what replaced the chart. */
  stockTableCaption: 'Projected closing stock by date, as a table',

  /** The date column's header in the table view; each series' own label heads its column beside it. */
  stockDateColumn: 'Date',

  /**
   * Shown in place of the chart when the records project no baseline for the selected exception, so the
   * half is explained rather than blank. Neutral wording: no figure, no identifier and no invented
   * record.
   */
  stockEmpty: 'No projected closing stock has been computed for this exception yet.',

  /** The caption of the audit half, beside the label that marks it a simulated control (rule P-4). */
  activityTitle: 'Latest audit events',

  /**
   * Shown in place of the list when no event has arrived, so the half explains itself rather than
   * leaving an empty panel. Neutral wording: no figure, no identifier and no invented record.
   */
  activityEmpty: 'No audit events are recorded for this workspace yet.',

  /** The caption-role name of the persona or policy that appended an event. */
  actorLabel: 'Actor',

  /** The caption-role name of the record an event is about. */
  recordLabel: 'Record',

  /** The caption-role name of the policy behind an event, shown only where one is recorded. */
  policyLabel: 'Policy',
} as const;

/**
 * How many events the dock shows: the five latest, which AAP §0.12.4's SCR-12 row fixes and which
 * is the single owner of that count. `listAuditEvents` returns the events newest first, so the slice
 * from the head of the array is the five latest and no ordering is computed here.
 */
export const TIMELINE_DOCK_AUDIT_EVENTS = 5;

/**
 * The label a computed figure carries, read from the fixed vocabulary rather than typed (rule P-1).
 * Index 1 of `SIM_LABELS` is `Simulated calculation`, the string specification §5.3 assigns to every
 * computed figure, and the projected series is one.
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/**
 * The label of a figure whose readings shipped with the dataset rather than being computed in this
 * session, and therefore the weaker claim the frame makes when its series do not share one label
 * (rule P-1, AAP §0.10). `Simulated data` is true of the whole figure, while `Simulated calculation`
 * over a seeded option's series would say the seed record had been measured here.
 */
const DATA_LABEL: SimLabel = SIM_LABELS[0];

/**
 * The label the audit surface carries, read from the fixed vocabulary rather than typed (rule P-4).
 * Index 4 of `SIM_LABELS` is `Simulated control`, the string the rule fixes for the chain and for
 * what a reader sees of it — which is what these events are.
 */
const CONTROL_LABEL: SimLabel = SIM_LABELS[4];

/**
 * What one audit outcome amounts to in the shared status vocabulary of `./status-indicator.tsx`.
 *
 * No input fixes this mapping, so it is a reading rather than a quotation: an outcome the records
 * mark `allowed` or `succeeded` reads as a pass, one they mark `failed` reads as a failure, and one
 * they mark `blocked` reads as a warning, because the call was refused by a rule rather than failing
 * on its own. It is the same reading `src/features/scr-05-approvals-and-audit/audit-screen.tsx`
 * applies to the audit table, so an outcome looks and reads the same wherever it appears; the two
 * copies exist because a component may not import a feature folder, and a shared helper — a module
 * of the status vocabulary's own — would replace both. The label beside the icon is always the
 * record's own spelling, so the meaning never replaces what the event says (rule B-3: meaning is
 * carried by icon, label and colour together).
 */
const RESULT_MEANINGS = {
  allowed: 'pass',
  blocked: 'warning',
  succeeded: 'pass',
  failed: 'fail',
} as const satisfies Record<AuditResult, StatusMeaning>;

/* ---------------------------------------------------------------------------------------------
 * The frame's label, taken from the series rather than typed
 * ------------------------------------------------------------------------------------------- */

/**
 * The one label true of every series the surface draws.
 *
 * The signals are the series' own `simLabel`s, which the caller supplies from the records it read;
 * this function reads them and decides nothing about the readings themselves. Exactly one distinct
 * label is that label; two different ones make the surface state the weaker `Simulated data`, because
 * a seeded option's measures shipped with the dataset (AAP §0.10); none at all leaves the computed
 * label, which every series here carries anyway. This mirrors
 * `src/features/scr-03-investigation/projected-stock-chart.tsx`, which draws the same pair of series.
 *
 * @param series - The series the chart draws, in the order they are read.
 * @returns The label the frame paints for the whole figure.
 */
function frameSimLabelFor(series: readonly LineSeriesSpec[]): SimLabel {
  const declared: SimLabel[] = [];

  for (const spec of series) {
    const label = spec.simLabel;

    if (label !== undefined && !declared.includes(label)) {
      declared.push(label);
    }
  }

  if (declared.length === 1 && declared[0] !== undefined) {
    return declared[0];
  }

  return declared.length === 0 ? CALCULATION_LABEL : DATA_LABEL;
}

/* ---------------------------------------------------------------------------------------------
 * The two series, and the table view built from them
 * ------------------------------------------------------------------------------------------- */

/**
 * The baseline's own series id, which no option series can take because every one of those is
 * prefixed.
 */
const BASELINE_SERIES_ID = 'baseline';

/**
 * An option series' id, prefixed so it can never equal the baseline's: two series sharing an id would
 * render two paths, two mark sets and two table columns under one React key. The record's own
 * identifier follows the prefix, so one option keeps one id wherever it is drawn.
 *
 * @param evidenceRef - The option's own reference, which is the record's identifier.
 * @returns The series id that option draws under.
 */
function optionSeriesId(evidenceRef: string): string {
  return `option-${evidenceRef}`;
}

/**
 * The chart points one series' readings become.
 *
 * `y` places the mark and `yLabel` is the text a reader receives, which is the record value rendered
 * as text and never recomputed here (rule P-6); every point carries the reference the caller supplied
 * for that series, so a mark opens the record whose measurement produced it.
 *
 * @param points - The closing-stock series exactly as the payload states it.
 * @param evidenceRef - The reference every point of this series carries.
 * @returns One chart point per reading, in the supplied order.
 */
function pointsOf(
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
 * The series the chart draws, in the order they should be read: the baseline first, then the option
 * in view when the caller supplies one.
 *
 * The baseline is dashed so the two are told apart without relying on tone (rule B-3), and each series
 * declares the label its own figures require, which arrives from the caller rather than being decided
 * here (rule P-1). An option with no points is still drawn, so the legend and the table state that the
 * option has no reading rather than leaving the reader to infer it from the baseline alone.
 *
 * @param baseline - The baseline's points, as the exception's detail states them.
 * @param baselineEvidenceRef - The reference the baseline's marks carry.
 * @param baselineSimLabel - The label the baseline's figures carry.
 * @param option - The option in view, or `undefined` when the caller has none.
 * @returns The series, in the order they should be read.
 */
function seriesFor(
  baseline: readonly DailyClosingStockPoint[],
  baselineEvidenceRef: string,
  baselineSimLabel: SimLabel,
  option: TimelineDockOptionSeries | undefined,
): readonly LineSeriesSpec[] {
  const baselineSeries: LineSeriesSpec = {
    id: BASELINE_SERIES_ID,
    label: TIMELINE_DOCK_TEXT.baselineSeriesLabel,
    tone: 'accent',
    points: pointsOf(baseline, baselineEvidenceRef),
    simLabel: baselineSimLabel,
    dashed: true,
  };

  if (option === undefined) {
    return [baselineSeries];
  }

  return [
    baselineSeries,
    {
      id: optionSeriesId(option.evidenceRef),
      label: `${TIMELINE_DOCK_TEXT.selectedSeriesPrefix} ${option.name}`,
      tone: 'review',
      points: pointsOf(option.dailyClosingStock, option.evidenceRef),
      simLabel: option.simLabel,
    },
  ];
}

/** One row of the table view: a date, and each series' already-formatted reading for that date. */
interface ProjectedStockRow {
  /** The date the readings belong to, exactly as the records state it. */
  readonly date: IsoDate;

  /**
   * Each series' reading for this date, keyed by series id and carried as the text the computing
   * module formatted. A series with no point on this date contributes an empty string, so a cell
   * states that the series reports no reading there rather than reading `undefined`: a gap in one
   * series beside a reading in the other is the records' own state, not an error.
   */
  readonly values: Readonly<Record<string, string>>;
}

/** The table's date column id, which no series column can take because every one of those is prefixed. */
const DATE_COLUMN_ID = 'date';

/**
 * A series column's id, prefixed so it can never equal the date column's: two columns sharing an id
 * would render two cells under one React key.
 *
 * @param seriesId - The series the column carries.
 * @returns The column id.
 */
function seriesColumnId(seriesId: string): string {
  return `series-${seriesId}`;
}

/**
 * Every date any series reports, in the order the records state them: the baseline's dates first,
 * then any the option reports beyond them, so the row order is the records' rather than sorted here.
 *
 * @param series - The series the chart draws.
 * @returns The union of the series' dates, in record order.
 */
function datesOf(series: readonly LineSeriesSpec[]): readonly IsoDate[] {
  const dates: IsoDate[] = [];
  const seen = new Set<IsoDate>();

  for (const spec of series) {
    for (const point of spec.points) {
      if (seen.has(point.x)) {
        continue;
      }

      seen.add(point.x);
      dates.push(point.x);
    }
  }

  return dates;
}

/**
 * One date's reading from each series, taken from the point that series reported for it.
 *
 * @param series - The series the chart draws.
 * @param date - The date to read.
 * @returns The formatted reading per series id, empty where a series reports none.
 */
function readingsFor(
  series: readonly LineSeriesSpec[],
  date: IsoDate,
): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};

  for (const spec of series) {
    const point = spec.points.find((candidate) => candidate.x === date);
    values[spec.id] = point === undefined ? '' : point.yLabel;
  }

  return values;
}

/**
 * The columns of the table view: the date, then one column per series in the order they are read, each
 * headed by that series' own label.
 *
 * The readings are aligned to the end so successive counts line up on their last digit, which is the
 * reason `TableColumn.align` exists. The cells hold the record's values as they arrived — the date it
 * states and the count the solver returned — because this component formats and recomputes nothing
 * (rule P-6).
 *
 * @param series - The series the chart draws.
 * @returns The columns, in the order they are read.
 */
function columnsFor(
  series: readonly LineSeriesSpec[],
): readonly TableColumn<ProjectedStockRow>[] {
  return [
    {
      id: DATE_COLUMN_ID,
      header: TIMELINE_DOCK_TEXT.stockDateColumn,
      render: (row) => row.date,
    },
    ...series.map<TableColumn<ProjectedStockRow>>((spec) => ({
      id: seriesColumnId(spec.id),
      header: spec.label,
      align: 'end',
      render: (row) => row.values[spec.id] ?? '',
    })),
  ];
}

/**
 * The frame's table data, built from the series the chart draws rather than from a second copy, so a
 * reader who switches representations reads the same dates and the same readings (success criterion 9,
 * rule B-3).
 *
 * No sort is offered: ordering belongs to the records, which the surface is given in the order they
 * should be read, so `ChartFrame` clears every `sortable` flag and no control appears that would have
 * nothing to report to (rule P-8).
 *
 * @param series - The series the chart draws.
 * @param caption - The table view's accessible name, supplied by this module's wording.
 * @returns The table specification the frame renders.
 */
function tableFor(
  series: readonly LineSeriesSpec[],
  caption: string,
): ChartTableSpec<ProjectedStockRow> {
  return {
    caption,
    columns: columnsFor(series),
    rows: datesOf(series).map((date) => ({ date, values: readingsFor(series, date) })),
    getRowKey: (row) => row.date,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * One option series the dock draws over the baseline: everything that series must state, supplied as
 * data.
 *
 * The dock reads no record, so the option's own name, the reference its points open, the points the
 * solver measured for it and the label its figures require all arrive from the caller — the module
 * that holds the `ScenarioSet` (rule P-2, AAP §0.10). Every member is the record's own value; nothing
 * here is composed by the dock except the series label that wraps the name.
 */
export interface TimelineDockOptionSeries {
  /**
   * The option's own reference, which every point of its series opens its evidence through.
   *
   * It is the option's identifier, because the evidence read resolves a `SCN` reference: a point that
   * carried any other reference would be a figure a reader could not open (rule P-6, principle PR-6).
   */
  readonly evidenceRef: string;

  /** The option's name as its record states it, printed after {@link TIMELINE_DOCK_TEXT.selectedSeriesPrefix}. */
  readonly name: string;

  /**
   * The closing stock the solver measured for the option, in the order the record states it.
   *
   * An empty series is a real state and is drawn as one: the option then has a legend row and a table
   * column stating that it reports no reading, rather than being silently dropped.
   */
  readonly dailyClosingStock: readonly DailyClosingStockPoint[];

  /**
   * The label the option's own figures carry, as the caller read it from `SIM_LABELS`.
   *
   * `Simulated calculation` where the option was measured in this session, and `Simulated data` where
   * its measures shipped with the dataset (AAP §0.10, rule P-1).
   */
  readonly simLabel: SimLabel;
}

/**
 * What the canvas screen hands the bottom dock: the selected exception's identifier and title, the
 * baseline the records project for its case, the option in view over that baseline, and the audit
 * page it read newest first. Every payload arrives whole because the dock calls no port and holds no
 * state of its own — it prints the head of the page and the records' own wording as they arrived, and
 * formats no figure of its own (AAP §0.12.4).
 */
export interface TimelineDockProps {
  /**
   * The identifier of the selected exception, in the service's own form.
   *
   * It is printed through `MonoValue` in the identifier kind and wrapped in the evidence trigger, so
   * the selection itself is a figure that opens the record behind it (rule P-6, principle PR-6).
   */
  readonly exceptionId: string;

  /**
   * The selected exception's own title, printed as it arrives.
   *
   * The dock does not own this wording: a record's title belongs to the record (rule P-6), so a
   * caller that has no title to show has no dock to place.
   */
  readonly exceptionTitle: string;

  /**
   * The baseline the records project for the selected exception: the closing stock the solver measured
   * for the case's window with no lever pulled, in the order the record states it.
   *
   * It is drawn first, and the option beside it is drawn over the same scale, because the contract
   * states the baseline projection with "the selected option … plotted over the same series" (T-03,
   * `src/types/screen-dto.ts`). An empty series is a real state — an exception whose records name no
   * case has no projection — and the dock explains it rather than drawing empty axes.
   */
  readonly stockSeries: readonly DailyClosingStockPoint[];

  /**
   * The reference the baseline's points open their evidence through.
   *
   * Required by `LinePoint`: a mark with no reference would be a figure a reader could not open,
   * which is the defect rule P-6 and principle PR-6 exist to prevent.
   */
  readonly stockEvidenceRef: string;

  /**
   * The simulation label the baseline's own figures carry, as the caller read it from `SIM_LABELS`.
   *
   * The baseline is the solver's output for the case, so the caller supplies `Simulated calculation`.
   * The label arrives as data because this component reads no record and never spells a §5.3 string
   * (rules P-1, P-6), and it is one of the two signals the frame-level label is decided from.
   */
  readonly stockSimLabel: SimLabel;

  /**
   * The option in view, drawn over the baseline, or `undefined` when the caller has none.
   *
   * A selection whose option set offers nothing, or whose set the acting role may not read, supplies
   * none; the chart then draws the baseline alone rather than waiting for a payload that is not
   * coming. What arrives here is the option's own record values, never a measure of the dock's.
   */
  readonly stockOption?: TimelineDockOptionSeries | undefined;

  /**
   * The audit events to show, newest first as `listAuditEvents` returns them.
   *
   * The dock prints only the first {@link TIMELINE_DOCK_AUDIT_EVENTS} of them: the count is this
   * module's to apply, so a caller hands over the page it read and the dock shows the head of it.
   */
  readonly auditEvents: readonly AuditEvent[];

  /**
   * What the events half says instead of {@link TIMELINE_DOCK_TEXT.activityEmpty} when the caller has a
   * reason of its own for the list being empty.
   *
   * The canvas uses it for the one case the neutral sentence would misdescribe: a role the permission
   * matrix does not grant `audit.read` receives no events at all, and "no event is recorded" would
   * state an absence of records where the records exist and the read was refused. The caller owns the
   * wording, because only the caller knows why it passed nothing.
   */
  readonly auditEmptyMessage?: string | undefined;
}

/**
 * Renders the canvas dock: the selected exception, its projected stock — the baseline and the option
 * in view over one scale — and the five latest events.
 *
 * The `<section>` is named by its own `<h2>` — no `aria-label` restates text that is already visible
 * — and the heading row carries the selection, so a reader arriving at the dock knows which
 * exception both halves below describe. From the `lg` breakpoint the two halves sit side by side,
 * the stock series taking roughly three fifths of the width because it is drawn rather than read,
 * and the events two fifths; below it they stack in the same order. Every value is a role token of
 * `src/theme/tokens.css`, so Command and Paper each supply their own measured pairing, and the surface
 * adds no elevation because specification §4.3 defines none.
 *
 * Neither half is ever blank: a baseline with no points renders a panel stating that no projection has
 * been computed, and an empty trail states that no event has been recorded, so an absent payload
 * reads as an absence rather than as a fault.
 */
export function TimelineDock({
  exceptionId,
  exceptionTitle,
  stockSeries,
  stockEvidenceRef,
  stockSimLabel,
  stockOption,
  auditEvents,
  auditEmptyMessage,
}: TimelineDockProps): ReactElement {
  const headingId = useId();
  const latestEvents = auditEvents.slice(0, TIMELINE_DOCK_AUDIT_EVENTS);

  /*
   * The chart and its table view are built from one array: the baseline first, then the option in
   * view, so the two representations of the figure cannot disagree (success criterion 9, rule B-3).
   * The frame's label is read off those same series rather than typed, so a seeded option cannot be
   * presented as computed output (rules P-1, AAP §0.10).
   */
  const chartSeries = seriesFor(stockSeries, stockEvidenceRef, stockSimLabel, stockOption);
  const frameSimLabel = frameSimLabelFor(chartSeries);
  const chartTable = tableFor(chartSeries, TIMELINE_DOCK_TEXT.stockTableCaption);

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 border-t border-hairline pt-4"
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-2">
        <h2 id={headingId} className="text-16 font-semibold text-text-primary">
          {TIMELINE_DOCK_TEXT.title}
        </h2>
        <span className="text-12 text-text-caption">{TIMELINE_DOCK_TEXT.selectedLabel}</span>
        <EvidenceRef ref={exceptionId}>
          <MonoValue value={exceptionId} kind="id" />
        </EvidenceRef>
        <span className="min-w-0 break-words text-14 text-text-primary">{exceptionTitle}</span>
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 lg:basis-3/5">
          {stockSeries.length === 0 ? (
            /* An exception with no projection states that, in a panel labelled with the half's own
               caption, so the empty state keeps the dock's structure instead of collapsing it. */
            <Panel label={TIMELINE_DOCK_TEXT.stockTitle}>
              {TIMELINE_DOCK_TEXT.stockEmpty}
            </Panel>
          ) : (
            <ChartFrame<ProjectedStockRow>
              title={TIMELINE_DOCK_TEXT.stockTitle}
              simLabel={frameSimLabel}
              tableRows={chartTable}
            >
              <LineChart
                series={chartSeries}
                references={[{ y: 0, label: TIMELINE_DOCK_TEXT.stockZeroLabel }]}
                xAxisLabel={TIMELINE_DOCK_TEXT.stockXAxisLabel}
                yAxisLabel={TIMELINE_DOCK_TEXT.stockYAxisLabel}
              />
            </ChartFrame>
          )}
        </div>

        <div className="min-w-0 lg:basis-2/5">
          <Panel
            label={
              <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                <span>{TIMELINE_DOCK_TEXT.activityTitle}</span>
                {/* The chain's own label, carried by the half that shows the chain (rule P-4). */}
                <StatusIndicator meaning="simulated" label={CONTROL_LABEL} />
              </span>
            }
          >
            {latestEvents.length === 0 ? (
              <p className="text-13 text-text-secondary">
                {auditEmptyMessage ?? TIMELINE_DOCK_TEXT.activityEmpty}
              </p>
            ) : (
              <ol className="flex min-w-0 flex-col gap-3">
                {latestEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex min-w-0 flex-col gap-1 border-b border-hairline pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <EvidenceRef ref={event.id}>
                        <MonoValue value={event.id} kind="id" />
                      </EvidenceRef>
                      <MonoValue value={event.timestamp} kind="timestamp" />
                      <StatusIndicator
                        meaning={RESULT_MEANINGS[event.result]}
                        label={event.result}
                      />
                      <span className="min-w-0 break-words text-14 text-text-primary">
                        {event.action}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-2 text-12 text-text-caption">
                      <span className="inline-flex min-w-0 items-center gap-1">
                        {TIMELINE_DOCK_TEXT.actorLabel}
                        <MonoValue value={event.actorId} kind="id" />
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        {TIMELINE_DOCK_TEXT.recordLabel}
                        <MonoValue value={event.objectRef} kind="id" />
                      </span>
                      {event.policyId === undefined ? null : (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          {TIMELINE_DOCK_TEXT.policyLabel}
                          <MonoValue value={event.policyId} kind="id" />
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}
