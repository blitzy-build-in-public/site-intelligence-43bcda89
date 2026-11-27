/**
 * SCR-03's projected closing stock: the baseline and the selected option over the case's window, with
 * the zero reference, the due-date markers and the idle window shaded (AAP 0.12.4 SCR-03). The series
 * are the solver's own output under contracts §4 rules 1 to 11, arriving here already measured.
 *
 * A COMPOSITION, NOT A SURFACE. `../../components/chart-frame.tsx` owns the `<figure>`, its caption,
 * the frame-level simulation label and the "View as table" control, and
 * `../../components/line-chart.tsx` owns the paths, the marks, the references, the markers and the
 * bands. Re-implementing either here would put a second chart vocabulary in the application
 * (AAP 0.12.1), so this module decides only which props reach the surface — and it builds the table
 * view from THE SAME `series` array it hands to `LineChart`, so the two representations of one chart
 * cannot disagree (success criterion 9, rule B-3).
 *
 * NOTHING IS COMPUTED HERE (rule P-6). The window, the axis domain, the references, the markers, the
 * bands, the dates and every reading arrive as props; each point carries the value text the module
 * that computed it formatted, plus the evidence reference behind it. The zero line is the caller's own
 * `references` entry — AAP 0.12.4 SCR-03 fixes the zero reference line, so this file states no number
 * of its own, and a second clamp here would silently drop a negative reading that the solver reported
 * and that `LineChart` deliberately draws. Row order is the order the records state; nothing is
 * sorted, parsed or re-derived.
 *
 * PROVENANCE (rule P-1). `ChartFrame`'s first-party branch requires a frame-level label, which is how
 * rule P-1 is made structural rather than remembered. A surface whose series all declare the same
 * label carries that label once, at frame level. A surface whose series declare none carries the
 * label AAP 0.10 gives this chart's computed figures. A surface whose series declare different labels
 * — a selected option whose measures are a seed record rather than solver output (AAP 0.10) — states
 * the weaker true label `Simulated data` instead of claiming the seeded series was computed, and each
 * series' own exact label is still read out beside the surface by `LineChart`. Every one of those
 * strings comes from the `SIM_LABELS` owner in `../../types`; none is retyped here.
 *
 * EMPTY DATA. A window with no points draws no surface at all: a zero line with no series beside it
 * would imply a flat reading the records do not report, so the caller's `emptyMessage` stands where
 * the chart would be and the frame's table view opens on no rows.
 *
 * Rules served: B-1 (SVG composed from `LineChart`; no charting dependency and no URL of any kind),
 * B-2 (nothing to configure), B-3 (the table view is mandatory through the frame, series differ by
 * dash as well as by tone, and this module adds no focus stop or control of its own), P-1, P-2 (no
 * service, no seed record, no domain module), P-5 (first-party stock series only, so no
 * market-intelligence series can enter), P-6, P-7, P-8.
 */
import type { ReactElement } from 'react';

import type { IsoDate, SimLabel } from '../../types';
import { SIM_LABELS } from '../../types';
import { ChartFrame } from '../../components/chart-frame';
import type { ChartTableSpec } from '../../components/chart-frame';
import type { TableColumn } from '../../components/data-table';
import { LineChart } from '../../components/line-chart';
import type {
  LineBand,
  LineMarker,
  LineReference,
  LineSeriesSpec,
} from '../../components/line-chart';

/* ---------------------------------------------------------------------------------------------
 * The frame's label, taken from the series rather than typed
 * ------------------------------------------------------------------------------------------- */

/**
 * `Simulated calculation` — the label AAP 0.10 gives the projected-stock chart, and the one a series
 * that declares none is covered by at frame level. Read out of the §5.3 tuple rather than retyped, so
 * the wording cannot drift from its owner (rule P-1).
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/**
 * `Simulated data` — the label of a figure whose readings are seed records, and therefore the weaker
 * claim a surface makes when its series do not share one label: it is true of the whole figure, while
 * `Simulated calculation` over a seeded series would say the seed record had been computed here.
 */
const DATA_LABEL: SimLabel = SIM_LABELS[0];

/**
 * The one label true of every series the surface draws.
 *
 * The signals are the series' own `simLabel`s, which the module that produced each series sets; this
 * function reads them and decides nothing about the readings themselves.
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
 * The table view, built from the same series the surface draws
 * ------------------------------------------------------------------------------------------- */

/** One row of the table view: a date, and each series' already-formatted reading for that date. */
interface ProjectedStockRow {
  /** The date the readings belong to, exactly as the records state it. */
  readonly date: IsoDate;

  /**
   * Each series' reading for this date, keyed by series id and carried as the text the computing
   * module formatted. A series with no point on this date contributes an empty string, so a cell is
   * never blank and never reads `undefined` (a gap in one series is not an error).
   */
  readonly values: Readonly<Record<string, string>>;
}

/** The table's date column id, which no series column can take because every one of those is prefixed. */
const DATE_COLUMN_ID = 'date';

/**
 * A series column's id, prefixed so it can never equal the date column's: two columns sharing an id
 * would render two cells under one React key.
 */
function seriesColumnId(seriesId: string): string {
  return `series-${seriesId}`;
}

/** The date column's header. The series columns are headed by their own labels. */
const DATE_COLUMN_HEADER = 'Date';

/** Every date any series reports, in the order the records state them. */
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

/** One date's reading from each series, taken from the point the series reported for it. */
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

/** The columns of the table view: the date, then one column per series in the order they are read. */
function columnsFor(
  series: readonly LineSeriesSpec[],
): readonly TableColumn<ProjectedStockRow>[] {
  return [
    {
      id: DATE_COLUMN_ID,
      header: DATE_COLUMN_HEADER,
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
 * The frame's table data, built from the series the surface draws rather than from a second copy, so a
 * reader who switches representations reads the same dates and the same readings.
 *
 * No sort is offered: ordering belongs to the caller, and this surface is given its records in the
 * order they should be read, so `ChartFrame` clears every `sortable` flag and no control appears that
 * would have nothing to report to (rule P-8).
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

/** Props of {@link ProjectedStockChart}: every reading, level and marker arrives already measured. */
export interface ProjectedStockChartProps {
  /**
   * The window the surface covers, as the caller composes it from the records it read — the figure's
   * title, its accessible name and the name of its table view.
   */
  readonly caption: string;

  /**
   * A one-line reading the caller composes about the series it draws, shown under the figure's title
   * and visible in both the chart view and the table view.
   *
   * SCR-03 states the designated option's run-out here, because AAP §0.8 requires that pair rendered on
   * this surface as the day plus a half-day reading. The sentence is the caller's — the wording belongs
   * to `../../components/run-out-reading.ts` and the pair to the record — and this component only
   * forwards it to `ChartFrame`'s caption, computing and formatting nothing of its own (rule P-6). No
   * reading means no description, so a figure with nothing to state renders exactly the caption it did
   * before.
   */
  readonly description?: string | undefined;

  /**
   * The series to draw, in the order they should be read: the baseline, and the selected option when
   * the service supplies one. Each carries its own tone, dash, simulation label and per-point evidence
   * reference, so nothing about how a series reads is decided here.
   */
  readonly series: readonly LineSeriesSpec[];

  /** The horizontal levels the series are read against, the zero reference line among them. */
  readonly references: readonly LineReference[];

  /** The customer orders' due dates, drawn as dated markers on the x axis. */
  readonly markers: readonly LineMarker[];

  /** The idle window the solver reports, shaded behind the series. */
  readonly bands: readonly LineBand[];

  /** What the caller shows in place of the surface when no series carries a point. */
  readonly emptyMessage: string;
}

/** The empty state's text: the secondary text role, at the type step a caption step down from the title. */
const EMPTY_MESSAGE_CLASS = 'text-14 text-text-secondary';

/**
 * SCR-03's projected closing-stock figure: the chart view and its table view over one set of readings.
 *
 * The surface is the caller's series, references, markers and bands passed straight through, because
 * `LineChart` already draws a negative reading truthfully and keeps the zero line inside the drawn
 * domain — a second domain calculation here would hide the very value T-03 reads off the series. The
 * table view is built from the same `series` array in this module, so the frame's two representations
 * cannot drift apart.
 *
 * When no series carries a point, the caller's `emptyMessage` stands where the chart would be: an
 * empty window is stated rather than drawn as a flat line the records never reported.
 */
export function ProjectedStockChart({
  caption,
  description,
  series,
  references,
  markers,
  bands,
  emptyMessage,
}: ProjectedStockChartProps): ReactElement {
  const drawsSeries = series.some((spec) => spec.points.length > 0);

  /* `ChartFrame`'s optional caption slot accepts no explicit `undefined` under
     `exactOptionalPropertyTypes`, so a figure with no reading leaves the slot out rather than handing
     the frame an absence it would have to tell from a sentence. */
  const descriptionProps = description === undefined ? {} : { description };

  return (
    <ChartFrame<ProjectedStockRow>
      title={caption}
      {...descriptionProps}
      simLabel={frameSimLabelFor(series)}
      tableRows={tableFor(series, caption)}
    >
      {drawsSeries ? (
        <LineChart series={series} references={references} markers={markers} bands={bands} />
      ) : (
        <p className={EMPTY_MESSAGE_CLASS}>{emptyMessage}</p>
      )}
    </ChartFrame>
  );
}
