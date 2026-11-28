/**
 * The SCR-05 outcome card: the approved plan's figures set beside the figures the records reached
 * after the decision and its simulated write-backs (AAP §0.12.4 SCR-05 — "after approval a tracker
 * steps through the write-backs and then an outcome card sets planned against resulting figures").
 *
 * WHAT IT RENDERS. One list of measures under two columns — the plan as approved, and the state the
 * approval's write-backs left — and then the daily closing stock the two solves project, one row per
 * date. The right-hand column of the measures is the post-approval reading acceptance test T-08
 * checks, and the stock table is the surface AAP §0.7's T-08 row reads "the stock condition to 16
 * December" from, which no other screen renders. Both sides of both tables are printed exactly as
 * the service computed them: this component subtracts nothing, rounds nothing, computes no delta,
 * percentage, trend or total, sorts neither series and states no verdict about the change — it sets
 * the two measurements side by side and lets the reader compare them (rule P-6).
 *
 * THE SHAPE IT TAKES IS THE DECLARED ONE. The port resolves a dedicated post-approval shape,
 * `ApprovalOutcome` in `src/types/screen-dto.ts`: `planned` and `resulting`, both `SolverResult`
 * and both `solveSupplyDelay`'s own output, with the resulting side measured at the plan's own
 * levers when every write-back step succeeded and at the do-nothing levers otherwise, because
 * AAP §0.2.2 makes a simulated write-back all-or-nothing. This component therefore takes that
 * shape's two measurements rather than the two `Scenario` records an earlier sketch of this file
 * named: a `Scenario` adds only the option's identity — identifier, exception, name, origin — none of
 * which this card shows, and reading the measurements from the declared DTO keeps the card and
 * `getApprovalOutcome` from describing the same comparison two ways. A caller holding the read's
 * response passes its members straight through (`<OutcomeCard {...outcome} />`).
 *
 * EVERY FIGURE HERE OPENS ITS EVIDENCE (rule P-6, principle PR-6). The payload carries the record
 * the comparison is about — `ApprovalOutcome.evidenceRef`, the approval whose plan was measured and
 * whose simulated write-backs produced the resulting reading — and every reading in both tables is
 * rendered through `EvidenceRef`. A reading's reference names the figure as well as the record: the
 * record's own reference, then the column the reading stands in and the `SolverResult` member it
 * reports (`<approval id>#planned.unitsLate`), or, in the closing-stock table, the column and the date
 * whose close it states (`<approval id>#resulting.dailyClosingStock/<date>`). That is the grammar the
 * evidence read resolves, so two figures of one approval open two drawers that each state what was
 * clicked (AAP 0.12.2's `Evidence.value`). The caption an absent reading prints is not a figure and
 * stays plain text, and the card invents no figure of its own, which is the fabricated figure rule P-6
 * exists to prevent.
 *
 * WHY NO HEADLINE TILE. `./metric-tile.tsx` is the component for a single computed figure. This card
 * has seven measures and the stock series, and headlining one of them would invent a ranking the
 * inputs do not fix: no input says which measure of a plan matters most, so the figures are shown
 * where they belong, as rows of two tables.
 *
 * WHY A TABLE AND NOT A CHART FOR THE STOCK. AAP §0.7's success criterion 9 requires every chart to
 * expose a working "View as table" toggle, and AAP §0.2.1's F12 requires a chart's marks to open
 * their evidence — neither obligation is owed by a table, and the payload carries one reference for
 * the pair rather than one per mark. The series is also read here as a list of dated closes, which is
 * the reading T-08 asserts, rather than scanned as a shape. It sits in a `Panel` under its own visible
 * caption, because a table's own caption is exposed to assistive technology only and the card's
 * heading names the measures rather than the series (rule B-3).
 *
 * WHAT THE TWO KINDS OF MEASURE RENDER AS. A `*Eur` measure goes through `MonoValue` with
 * `kind="money"`, which is the application's only money formatter and the tabular mono face
 * AAP §0.5.3 fixes for amounts. A count has no formatter and no mono kind, so it prints as the
 * record's own value — the reading `./metric-tile.tsx` takes for a plain count — and `lineIdleDays`
 * prints as the number the solver rounded, never re-rounded here.
 *
 * A MEASURE A RECORD DOES NOT CARRY is stated in words (`Not applicable`) rather than as a zero, an
 * empty cell, a dash or a `NaN`. Both members of `SolverResult` are required, so at the type level
 * this cannot happen; the runtime guard exists because the shape arrives from the service, and a
 * missing or non-finite value has to read as absent rather than as a plausible figure — the
 * substitution rule P-6 forbids. Both columns always render, even when the caller passes the same
 * measurement twice: which figures to compare is the caller's decision, never this card's. The stock
 * table reads the same way: a date only one series reaches keeps its row and prints that caption in
 * the column the other series does not carry.
 *
 * THE LABEL IS ITS OWN (rule P-1, AAP §0.10). The comparison is a computed figure, so the card
 * carries `Simulated calculation` itself and paints it as visible text beside the status icon — a
 * page-level badge does not label an individual figure. The string is taken from the fixed §5.3
 * list rather than re-spelled, and typed `SimLabel` so no other string could stand in for it.
 *
 * WHAT IT DOES NOT DO. It reaches no service, imports no seed record, no domain module, no app
 * module and no other feature — the two measurements and their reference arrive as props (rule P-2).
 * The only controls it renders are the evidence triggers its figures carry; it offers no action, so
 * it has no disabled state to explain (rule P-8). It says nothing about sovereignty,
 * copying, audit integrity or resistance to alteration (rule P-4), mixes no market-intelligence figure
 * into a first-party one (rule P-5), names no company, person or record beyond the values it is
 * handed (rule P-7), and holds no URL, request, environment read or credential shape (rules B-1 and
 * B-2). Its headings, each table's caption, the scoped column headers and the triggers' 24x24 px
 * focus-ringed targets are what rule B-3's accessibility bar rests on, and every colour comes from a
 * role token of `src/theme/tokens.css`, so Command and Paper each supply their own measured pairing.
 *
 * Exercised through the approval detail screen's colocated suite (`approval-detail-screen.test.tsx`)
 * and by T-08 in `e2e/s1-approvals-audit.spec.ts`.
 */
import type { JSX, ReactNode } from 'react';

import { Card } from '../../components/card';
import { DataTable } from '../../components/data-table';
import type { TableColumn } from '../../components/data-table';
import { EvidenceRef } from '../../components/evidence-drawer';
import { MonoValue } from '../../components/mono-value';
import { Panel } from '../../components/panel';
import { StatusIndicator } from '../../components/status-indicator';
import { SIM_LABELS } from '../../types';
import type {
  ApprovalOutcome,
  DailyClosingStockPoint,
  IsoDate,
  SimLabel,
  SolverResult,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * The exact specification §5.3 label a computed figure carries, taken from the fixed list rather
 * than re-spelled, and typed `SimLabel` so nothing else can be substituted for it (rule P-1).
 *
 * The second member of `SIM_LABELS` is `Simulated calculation`, which AAP §0.10 names for every
 * computed figure and AAP §0.12.4's SCR-05 row names for this card's two columns.
 */
export const OUTCOME_SIM_LABEL: SimLabel = SIM_LABELS[1];

/**
 * Every string this module shows, held here so the wording has one owner: the component renders
 * these and a suite names them through this object instead of retyping them.
 *
 * The two reading headings are AAP §0.12.4's own words for the comparison ("sets planned against
 * resulting figures"), and each row label is the plain UI form of that measure's `SolverResult`
 * member, worded as the SCR-04 comparison row words the same measure. The date heading names the one
 * column that carries no figure at all. None of these strings carries a figure, an amount, a date or
 * a record identifier: values and dates arrive as props and only as props (rule P-6). The label in
 * {@link OUTCOME_SIM_LABEL} is the one fixed string, and it is not repeated here.
 */
export const OUTCOME_CARD_TEXT = {
  /** The card's heading, rendered as the `<h2>` `./card.tsx` owns. */
  title: 'Planned against resulting',

  /** The measures table's caption, which is its accessible name (rule B-3). */
  caption: 'The approved plan’s figures beside the figures the records reached',

  /** The heading of the row-label column. */
  measureHeader: 'Measure',

  /** The heading of the column holding the measurement taken when the plan was approved. */
  plannedHeader: 'Planned',

  /** The heading of the column holding the measurement taken from the records afterwards. */
  resultingHeader: 'Resulting',

  /**
   * The heading of the stock table's first column: the date whose close the two readings belong to.
   *
   * The column holds the record's own date, printed as plain text rather than as a figure, so this
   * heading names a column that carries no measurement and opens no evidence.
   */
  dateHeader: 'Date',

  /**
   * What a measure either record does not carry reads as, in place of a zero or a blank cell.
   */
  notApplicable: 'Not applicable',

  /**
   * Shown in the measures table's single full-width cell when it has no rows to show.
   *
   * Unreachable while {@link MEASURES} is non-empty — the component always builds one row per
   * measure — but `DataTable` requires the sentence so a table can never render as a blank grid,
   * and the row list belongs to this module rather than to a calling screen.
   */
  emptyTable: 'Neither measurement carries a measure this comparison can show.',

  /**
   * The stock table's caption, which is its accessible name (rule B-3) and what tells the two tables
   * in this card apart for a reader who reaches them without the surrounding prose.
   */
  stockCaption: 'The stock left at each day’s close, planned beside resulting',

  /**
   * The stock block's visible caption, which the panel around the table prints.
   *
   * `./data-table.tsx` renders a table's caption for assistive technology only, so the measures table
   * takes its visible name from the card's heading — the card is that comparison — while the series
   * below it is a second block under the same heading and needs one of its own to be told apart on
   * screen. `./panel.tsx` is the component for a block that is already named by the surface above it,
   * and it renders no heading, so the card's outline stays as it is (rule B-3, AAP §0.5.2).
   */
  stockTitle: 'Daily closing stock',

  /**
   * Shown in the stock table's single full-width cell when neither series reports a date.
   *
   * Reachable: the two series are the solver's own output, and a solve may project no date at all.
   * The table then says so rather than rendering a blank grid.
   */
  emptyStockTable: 'Neither record carries a daily closing stock for this case.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The measures, and the table that drives their rows
 * ------------------------------------------------------------------------------------------- */

/**
 * The `SolverResult` members this card compares, taken member by member from the type rather than
 * described here: the five measures AAP §0.12.4's SCR-04 row names for the comparison matrix
 * ("units late, maximum days late, orders on time, added cost, line idle days"), which are the
 * measures the SCR-05 row sets planned against resulting, plus `revenueDelayedEur` — the exposure
 * that row does not list and an approved plan is read for — and `ordersTotal`, the denominator of
 * `ordersOnTime`, without which "orders on time" cannot be read as a figure. Seven rows in all.
 *
 * The remaining members are not single measures of the comparison and are not restated here.
 * `dailyClosingStock` is the series the card prints as its own table below, one row per date;
 * `runOut` is a draw and `orders` a per-order result; `constraintCheck` and `constraintMessages` are
 * the comparison screen's verdict per option; `sideEffects` and `writeBacks` belong to the
 * comparison's write-back preview and to `./write-back-tracker.tsx`; and `levers` and `confidence`
 * describe the measurement rather than measuring it. Restating any of them here would be a second
 * surface for one fact.
 */
type OutcomeMeasureKey =
  | 'unitsLate'
  | 'maxDaysLate'
  | 'ordersOnTime'
  | 'ordersTotal'
  | 'addedCostEur'
  | 'lineIdleDays'
  | 'revenueDelayedEur';

/**
 * How one measure is rendered: an amount the one formatter knows, or a count it does not.
 *
 * `MonoValue` deliberately offers no count kind — it formats money, identifiers, timestamps and
 * hashes — so the distinction is named here rather than forced into one of its four rules.
 */
type MeasureFormat = 'money' | 'count';

/** One row of the comparison, before either record's value is read. */
interface OutcomeMeasure {
  /** The `SolverResult` member the row reports. */
  readonly key: OutcomeMeasureKey;

  /** The row's label: plain UI text naming the measure, carrying no figure and no identifier. */
  readonly label: string;

  /** Which of the two rendering rules applies to the row's values. */
  readonly format: MeasureFormat;
}

/**
 * The rows of the comparison, in the order the card prints them: the delivery measures first, then
 * cost, then the commercial exposure, so a reader follows a disruption from lateness to money.
 */
const MEASURES: readonly OutcomeMeasure[] = [
  { key: 'unitsLate', label: 'Units late', format: 'count' },
  { key: 'maxDaysLate', label: 'Maximum days late', format: 'count' },
  { key: 'ordersOnTime', label: 'Orders on time', format: 'count' },
  { key: 'ordersTotal', label: 'Orders measured', format: 'count' },
  { key: 'addedCostEur', label: 'Added cost', format: 'money' },
  { key: 'lineIdleDays', label: 'Line idle days', format: 'count' },
  { key: 'revenueDelayedEur', label: 'Revenue delayed', format: 'money' },
];

/** One row as the table renders it: the measure, and the value each of the two records holds. */
interface OutcomeRow {
  /** The `SolverResult` member the row reports, which is also the row's stable key. */
  readonly key: OutcomeMeasureKey;

  /** The row's label. */
  readonly label: string;

  /** Which rendering rule the row's values take. */
  readonly format: MeasureFormat;

  /** The measurement the plan was approved at, or `undefined` when that record lacks it. */
  readonly planned: number | undefined;

  /** The measurement the records reached, or `undefined` when that record lacks it. */
  readonly resulting: number | undefined;
}

/**
 * Reads one measure from a record, treating a value that is missing at runtime or not a finite
 * number as absent rather than as a reading.
 *
 * The guard is not redundant with the type: the two measurements come from the service, and a
 * record that arrived without a member — or with a `NaN` where a figure belongs — must read as
 * absent on screen instead of as `NaN` or as a substituted zero (rule P-6). A string, a `null` and
 * an `undefined` all fail `Number.isFinite` and take the same path.
 */
function measureOf(record: SolverResult, key: OutcomeMeasureKey): number | undefined {
  const value: number = record[key];
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Builds the table's rows: one per measure, in {@link MEASURES}' order, carrying each record's own
 * reading of it.
 *
 * Both records are read in the same pass so the two columns can never report different measures,
 * and nothing is compared between them — the card sets the values beside each other and states no
 * difference.
 */
function buildRows(planned: SolverResult, resulting: SolverResult): OutcomeRow[] {
  return MEASURES.map((measure) => ({
    key: measure.key,
    label: measure.label,
    format: measure.format,
    planned: measureOf(planned, measure.key),
    resulting: measureOf(resulting, measure.key),
  }));
}

/* ---------------------------------------------------------------------------------------------
 * The cell and the columns
 * ------------------------------------------------------------------------------------------- */

/** An absent measure's caption: the 12 px step in the one role measured for a secondary reading. */
const NOT_APPLICABLE_CLASSES = 'text-12 text-text-caption';

/**
 * The label row above the table, at the 13 px step: `StatusIndicator` paints its label in the
 * primary text role and this size reaches it by inheritance, so the label reads the same size here
 * as it does on a metric tile.
 */
const LABEL_CLASSES = 'text-13';

/**
 * The separator the evidence read's reference grammar puts between a record and the figure inside it.
 *
 * A reading cell names its own figure, so the two halves of that grammar are spelled here and used
 * through {@link figureRef}: the record's reference, `#`, the column and `.${measure}`.
 */
const FRAGMENT_SEPARATOR = '#';

/** The separator the same grammar puts between a column and the measure read in it. */
const MEASURE_SEPARATOR = '.';

/** The column of the plan as approved, which is the first of the card's two value columns. */
const PLANNED_COLUMN = 'planned';

/** The column of the state the write-backs left, which is the card's second value column. */
const RESULTING_COLUMN = 'resulting';

/** The two columns a compared reading stands in, which are also the grammar's own column names. */
type OutcomeColumn = typeof PLANNED_COLUMN | typeof RESULTING_COLUMN;

/**
 * The `SolverResult` member the closing-stock series is held under, which is the name the evidence
 * read's grammar addresses that series by, and the separator before the date a single reading states.
 */
const STOCK_SERIES_MEMBER = 'dailyClosingStock';

/** The separator the grammar puts between that series member and the date a reading belongs to. */
const SERIES_SEPARATOR = '/';

/**
 * The reference one compared figure carries, composed from the record's own reference and the cell's
 * own column and measure.
 *
 * The evidence read resolves `<record ref>#<column>.<member>` to the figure the cell printed, so the
 * drawer states the measure and the number that was clicked instead of the whole record (AAP
 * 0.12.2's `Evidence.value`). Nothing is invented here beyond the positions the grammar fixes: the
 * record reference and the member both come from the read.
 *
 * @param evidenceRef - The record's own reference, which the service supplied.
 * @param column - The card column the reading stands in.
 * @param key - The `SolverResult` member the row reports.
 * @returns The reference the cell's evidence trigger carries.
 */
function figureRef(evidenceRef: string, column: OutcomeColumn, key: OutcomeMeasureKey): string {
  return `${evidenceRef}${FRAGMENT_SEPARATOR}${column}${MEASURE_SEPARATOR}${key}`;
}

/**
 * The reference one closing-stock reading carries, composed the same way from the record's own
 * reference, the cell's column and the date whose close it states.
 *
 * The series prints one row per date, so the date is part of what the figure is: without it the drawer
 * could state a number from a row the reader did not click.
 *
 * @param evidenceRef - The record's own reference, which the service supplied.
 * @param column - The card column the reading stands in.
 * @param date - The date whose close the reading states, as the record spells it.
 * @returns The reference the cell's evidence trigger carries.
 */
function stockFigureRef(evidenceRef: string, column: OutcomeColumn, date: IsoDate): string {
  return `${evidenceRef}${FRAGMENT_SEPARATOR}${column}${MEASURE_SEPARATOR}${STOCK_SERIES_MEMBER}${SERIES_SEPARATOR}${date}`;
}

/**
 * Renders one reading of one record inside the control that opens its evidence: the record's amount
 * through the one formatter, its count as the number the record holds.
 *
 * The reference it is handed is the one the payload supplied, or the one {@link figureRef} composed
 * for the figure this cell prints. A record that carries no reading prints the absence caption
 * instead, deliberately outside the trigger — the caption states that there is no figure, so a
 * control offering the evidence behind it would offer evidence for nothing.
 */
function renderReading(
  value: number | undefined,
  format: MeasureFormat,
  evidenceRef: string,
): ReactNode {
  if (value === undefined) {
    return <span className={NOT_APPLICABLE_CLASSES}>{OUTCOME_CARD_TEXT.notApplicable}</span>;
  }

  return (
    <EvidenceRef ref={evidenceRef}>
      {format === 'money' ? <MonoValue value={value} kind="money" /> : value}
    </EvidenceRef>
  );
}

/** A row's stable identity: the measure it reports, which also survives a re-render in place. */
const rowKeyOf = (row: OutcomeRow): string => row.key;

/**
 * The measures table's three columns: the measure's label, then the two records' values in the order
 * AAP §0.12.4 states them, both right-aligned so digits line up down each column.
 *
 * No column declares `sortable`, so `DataTable` renders no sort control and the rows stay in the
 * order {@link MEASURES} states — the comparison's own reading order rather than a ranking this card
 * would have to judge. Each value column composes the figure's own reference from the record's, by
 * {@link figureRef}, and the label column carries no reference at all.
 */
function buildMeasureColumns(evidenceRef: string): readonly TableColumn<OutcomeRow>[] {
  return [
    {
      id: 'measure',
      header: OUTCOME_CARD_TEXT.measureHeader,
      render: (row) => row.label,
    },
    {
      id: PLANNED_COLUMN,
      header: OUTCOME_CARD_TEXT.plannedHeader,
      align: 'end',
      render: (row) => {
        const ref = figureRef(evidenceRef, PLANNED_COLUMN, row.key);

        return renderReading(row.planned, row.format, ref);
      },
    },
    {
      id: RESULTING_COLUMN,
      header: OUTCOME_CARD_TEXT.resultingHeader,
      align: 'end',
      render: (row) => {
        const ref = figureRef(evidenceRef, RESULTING_COLUMN, row.key);

        return renderReading(row.resulting, row.format, ref);
      },
    },
  ];
}

/* ---------------------------------------------------------------------------------------------
 * The daily closing stock: the series the post-approval solve projects
 * ------------------------------------------------------------------------------------------- */

/**
 * One row of the stock table: a date both solves report a close for, and each record's reading at it.
 *
 * The date is the row's identity — a series states one close per date, so the same date from the two
 * records is one row — and it is kept as the record spells it rather than parsed, re-formatted or
 * compared as a moment in time.
 */
interface OutcomeStockRow {
  /** The date, as the record states it; also the row's stable key. */
  readonly key: string;

  /** The date the two readings belong to, printed as plain text rather than as a figure. */
  readonly date: IsoDate;

  /** The units the plan left at that close, or `undefined` when that record carries no such date. */
  readonly planned: number | undefined;

  /** The units the records left at that close, or `undefined` when its series does not reach it. */
  readonly resulting: number | undefined;
}

/**
 * One record's series as the row builder reads it.
 *
 * The guard is not redundant with the type for the same reason {@link measureOf}'s is: the series
 * arrives from the service, and a record that arrived without one must read as no dates rather than
 * losing the whole card to a runtime failure (rule P-6).
 */
function stockSeriesOf(record: SolverResult): readonly DailyClosingStockPoint[] {
  const series: readonly DailyClosingStockPoint[] = record.dailyClosingStock;
  return Array.isArray(series) ? series : [];
}

/**
 * Whether a point names a date the table can print.
 *
 * A point without a date identifies no row, cannot be matched against the other series, and would
 * print an empty cell where a date belongs, so it is dropped rather than rendered.
 */
function isDatedPoint(point: DailyClosingStockPoint): boolean {
  return typeof point.date === 'string' && point.date !== '';
}

/**
 * One point's units, treating a value missing at runtime or not finite as absent rather than as a
 * reading — the same rule {@link measureOf} applies to a scalar measure.
 */
function unitsOf(point: DailyClosingStockPoint): number | undefined {
  return Number.isFinite(point.units) ? point.units : undefined;
}

/**
 * Records one point's reading under its date, keeping the first reading a series states for a date it
 * repeats, so a malformed series cannot make one date appear twice.
 */
function addStockPoint(
  into: Map<string, number | undefined>,
  point: DailyClosingStockPoint,
): void {
  if (!isDatedPoint(point) || into.has(point.date)) {
    return;
  }

  into.set(point.date, unitsOf(point));
}

/**
 * Builds the stock table's rows: the dates the planned series states, in the order it states them,
 * then every date only the resulting series carries, in that series' order.
 *
 * Neither series is sorted, no date is dropped and no date is synthesised, so the table reads in the
 * order the two solves project it. A date both series carry becomes one row with both readings; a
 * date one of them omits keeps its row and prints the absence caption in the column that does not
 * reach it. The two readings are never subtracted: this card states no difference (rule P-6).
 */
function buildStockRows(planned: SolverResult, resulting: SolverResult): OutcomeStockRow[] {
  const plannedUnits = new Map<string, number | undefined>();
  const resultingUnits = new Map<string, number | undefined>();

  for (const point of stockSeriesOf(planned)) {
    addStockPoint(plannedUnits, point);
  }

  for (const point of stockSeriesOf(resulting)) {
    addStockPoint(resultingUnits, point);
  }

  const rows: OutcomeStockRow[] = [];

  for (const date of plannedUnits.keys()) {
    rows.push({
      key: date,
      date,
      planned: plannedUnits.get(date),
      resulting: resultingUnits.get(date),
    });
  }

  for (const date of resultingUnits.keys()) {
    if (plannedUnits.has(date)) {
      continue;
    }

    rows.push({ key: date, date, planned: undefined, resulting: resultingUnits.get(date) });
  }

  return rows;
}

/** The stock table's row identity: the date, which a series states once. */
const stockRowKeyOf = (row: OutcomeStockRow): string => row.key;

/**
 * The stock table's three columns: the date whose close the readings belong to, then the two records'
 * readings at that close, right-aligned so digits line up down each column.
 *
 * The date cell is plain text — a date is not a figure and has no evidence behind it of its own — while
 * each reading opens the figure it printed: its own column and date, composed by {@link stockFigureRef},
 * so a reader who opens one close is told which date's close and which solve they are looking at. No
 * column declares `sortable`, so the rows keep the order {@link buildStockRows} puts them in rather than
 * a chronological order this card would impose on the two solves.
 */
function buildStockColumns(evidenceRef: string): readonly TableColumn<OutcomeStockRow>[] {
  return [
    {
      id: 'date',
      header: OUTCOME_CARD_TEXT.dateHeader,
      render: (row) => row.date,
    },
    {
      id: PLANNED_COLUMN,
      header: OUTCOME_CARD_TEXT.plannedHeader,
      align: 'end',
      render: (row) =>
        renderReading(row.planned, 'count', stockFigureRef(evidenceRef, PLANNED_COLUMN, row.date)),
    },
    {
      id: RESULTING_COLUMN,
      header: OUTCOME_CARD_TEXT.resultingHeader,
      align: 'end',
      render: (row) =>
        renderReading(
          row.resulting,
          'count',
          stockFigureRef(evidenceRef, RESULTING_COLUMN, row.date),
        ),
    },
  ];
}

/**
 * The sort callback `DataTable` requires and neither table reaches: no column of either declares
 * `sortable`, so no control can report a sort and there is nothing to call. Re-ordering these rows
 * would rank two measurements against each other in a component, which is the arithmetic and the
 * judgement this card exists without (rule P-6).
 */
const KEEP_SUPPLIED_ROW_ORDER = (): void => {
  /* Unreachable: no column of either table declares `sortable`, so no control can report a sort. */
};

/* ---------------------------------------------------------------------------------------------
 * The card
 * ------------------------------------------------------------------------------------------- */

/**
 * One approval's two measurements and the record they are about: the plan as approved, the state its
 * simulated write-backs left, and the reference every reading on the card opens. The caller passes the
 * `getApprovalOutcome` response through as it stands, because which levers the resulting side was
 * measured at is the service's decision rather than a choice this card leaves open (AAP §0.2.2).
 */
export interface OutcomeCardProps {
  /**
   * The plan as approved, measured at the option's own levers.
   *
   * Typed through the declared `ApprovalOutcome` member it is, so this card and the port's
   * `getApprovalOutcome` cannot describe the same measurement two ways.
   */
  readonly planned: ApprovalOutcome['planned'];

  /**
   * The state the approval's write-backs left, measured on the same case.
   *
   * AAP §0.2.2 decides which levers this was taken at — the plan's own when every step of the
   * simulated write-back succeeded, the do-nothing levers otherwise — and that decision belongs to
   * the service, not here. The card prints whichever measurement it is handed.
   */
  readonly resulting: ApprovalOutcome['resulting'];

  /**
   * The record this comparison is about: the reference every reading on the card is composed from.
   *
   * Typed through the declared `ApprovalOutcome` member it is, and handed to `EvidenceRef` through
   * {@link figureRef} for a compared measure and {@link stockFigureRef} for a closing-stock reading, so
   * the drawer states the measure, the column and the number that were clicked rather than the record
   * alone (rule P-6, AAP §0.2.1's F12).
   */
  readonly evidenceRef: ApprovalOutcome['evidenceRef'];
}

/**
 * Renders the post-approval comparison as one titled card carrying its own simulated-calculation
 * label: the seven measures the two records share, and the daily closing stock both of them project.
 *
 * The card renders whenever the caller has both measurements, which is the caller's decision to
 * make: a screen that has an outcome to show passes both, and this component never suppresses
 * itself — two identical measurements still render as two columns. One `Simulated calculation` label
 * covers every figure the card shows, because the card is one computed comparison rather than a set
 * of independent ones (rule P-1, AAP §0.10).
 */
export function OutcomeCard({
  planned,
  resulting,
  evidenceRef,
}: OutcomeCardProps): JSX.Element {
  const rows = buildRows(planned, resulting);
  const stockRows = buildStockRows(planned, resulting);

  return (
    <Card title={OUTCOME_CARD_TEXT.title}>
      <StatusIndicator
        meaning="simulated"
        label={OUTCOME_SIM_LABEL}
        className={LABEL_CLASSES}
      />
      <DataTable<OutcomeRow>
        columns={buildMeasureColumns(evidenceRef)}
        rows={rows}
        getRowKey={rowKeyOf}
        caption={OUTCOME_CARD_TEXT.caption}
        sort={null}
        onSort={KEEP_SUPPLIED_ROW_ORDER}
        emptyMessage={OUTCOME_CARD_TEXT.emptyTable}
      />
      <Panel label={OUTCOME_CARD_TEXT.stockTitle}>
        <DataTable<OutcomeStockRow>
          columns={buildStockColumns(evidenceRef)}
          rows={stockRows}
          getRowKey={stockRowKeyOf}
          caption={OUTCOME_CARD_TEXT.stockCaption}
          sort={null}
          onSort={KEEP_SUPPLIED_ROW_ORDER}
          emptyMessage={OUTCOME_CARD_TEXT.emptyStockTable}
        />
      </Panel>
    </Card>
  );
}
