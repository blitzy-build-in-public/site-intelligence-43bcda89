/**
 * The SCR-05 outcome card: the approved plan's figures set beside the figures the records reached
 * after the decision and its simulated write-backs (AAP §0.12.4 SCR-05 — "after approval a tracker
 * steps through the write-backs and then an outcome card sets planned against resulting figures").
 *
 * WHAT IT RENDERS. One list of measures under two columns: the plan as approved, and the state the
 * approval's write-backs left. The right-hand column is the post-approval reading acceptance test
 * T-08 checks, so both sides are printed exactly as the service computed them: this component
 * subtracts nothing, rounds nothing, computes no delta, percentage or trend, and states no verdict
 * about the change — it sets the two measurements side by side and lets the reader compare them
 * (rule P-6).
 *
 * THE SHAPE IT TAKES IS THE DECLARED ONE. The port resolves a dedicated post-approval shape,
 * `ApprovalOutcome` in `src/types/screen-dto.ts`: `planned` and `resulting`, both `SolverResult`
 * and both `solveSupplyDelay`'s own output, with the resulting side measured at the plan's own
 * levers when every write-back step succeeded and at the do-nothing levers otherwise, because
 * AAP §0.2.2 makes a simulated write-back all-or-nothing. This component therefore takes that
 * shape's two members rather than the two `Scenario` records an earlier sketch of this file named:
 * a `Scenario` adds only the option's identity — identifier, exception, name, origin — none of
 * which this card shows, and reading the measurements from the declared DTO keeps the card and
 * `getApprovalOutcome` from describing the same comparison two ways. A caller holding the read's
 * response passes its members straight through (`<OutcomeCard {...outcome} />`).
 *
 * WHY NO EVIDENCE TRIGGER HERE. A displayed figure normally opens its evidence (rule P-6,
 * principle PR-6), and this card would wrap each measure if its records supplied a reference.
 * Neither `ApprovalOutcome` nor `SolverResult` carries one, and building a reference here by
 * concatenation would be exactly the fabricated figure rule P-6 exists to prevent, so each measure
 * renders through the one presentation formatter and nothing is invented in its place. The day
 * `SolverResult` names a reference per measure, these cells wrap through `EvidenceRef` and this
 * note is what a reader will find to explain why they did not before.
 *
 * WHY NO HEADLINE TILE. `./metric-tile.tsx` is the component for a single computed figure, and it
 * requires both an evidence reference and a label. This card has seven measures and no reference
 * for any of them, so choosing one to headline would invent both a ranking the inputs do not fix
 * and a reference the service does not supply; the measures are therefore shown where they belong,
 * as rows of one table.
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
 * measurement twice: which figures to compare is the caller's decision, never this card's.
 *
 * THE LABEL IS ITS OWN (rule P-1, AAP §0.10). The comparison is a computed figure, so the card
 * carries `Simulated calculation` itself and paints it as visible text beside the status icon — a
 * page-level badge does not label an individual figure. The string is taken from the fixed §5.3
 * list rather than re-spelled, and typed `SimLabel` so no other string could stand in for it.
 *
 * WHAT IT DOES NOT DO. It reaches no service, imports no seed record, no domain module, no app
 * module and no other feature — the two measurements arrive as props (rule P-2). It renders no
 * control, so it has no disabled state to explain (rule P-8). It says nothing about sovereignty,
 * copying, audit integrity or resistance to alteration (rule P-4), mixes no market-intelligence figure
 * into a first-party one (rule P-5), names no company, person or record beyond the values it is
 * handed (rule P-7), and holds no URL, request, environment read or credential shape (rules B-1 and
 * B-2). Its heading, caption, column scope and text-only values are what rule B-3's accessibility
 * bar rests on, and every colour comes from a role token of `src/theme/tokens.css`, so Command and
 * Paper each supply their own measured pairing.
 *
 * Exercised through the approval detail screen's colocated suite (`approval-detail-screen.test.tsx`)
 * and by T-08 in `e2e/s1-approvals-audit.spec.ts`.
 */
import type { JSX, ReactNode } from 'react';

import { Card } from '../../components/card';
import { DataTable } from '../../components/data-table';
import type { TableColumn } from '../../components/data-table';
import { MonoValue } from '../../components/mono-value';
import { StatusIndicator } from '../../components/status-indicator';
import { SIM_LABELS } from '../../types';
import type { ApprovalOutcome, SimLabel, SolverResult } from '../../types';

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
 * The two column headings are AAP §0.12.4's own words for the comparison ("sets planned against
 * resulting figures"), and each row label is the plain UI form of that measure's `SolverResult`
 * member, worded as the SCR-04 comparison row words the same measure. None of them carries a
 * figure, an amount, a date or a record identifier: values arrive as props and only as props
 * (rule P-6). The label in {@link OUTCOME_SIM_LABEL} is the one fixed string, and it is not
 * repeated here.
 */
export const OUTCOME_CARD_TEXT = {
  /** The card's heading, rendered as the `<h2>` `./card.tsx` owns. */
  title: 'Planned against resulting',

  /** The table's caption, which is its accessible name (rule B-3). */
  caption: 'The approved plan’s figures beside the figures the records reached',

  /** The heading of the row-label column. */
  measureHeader: 'Measure',

  /** The heading of the column holding the measurement taken when the plan was approved. */
  plannedHeader: 'Planned',

  /** The heading of the column holding the measurement taken from the records afterwards. */
  resultingHeader: 'Resulting',

  /**
   * What a measure either record does not carry reads as, in place of a zero or a blank cell.
   */
  notApplicable: 'Not applicable',

  /**
   * Shown in the table's single full-width cell when it has no rows to show.
   *
   * Unreachable while {@link MEASURES} is non-empty — the component always builds one row per
   * measure — but `DataTable` requires the sentence so a table can never render as a blank grid,
   * and the row list belongs to this module rather than to a calling screen.
   */
  emptyTable: 'Neither measurement carries a measure this comparison can show.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The measures, and the one table that drives the rows
 * ------------------------------------------------------------------------------------------- */

/**
 * The `SolverResult` members this card compares, taken member by member from the type rather than
 * described here: the five measures AAP §0.12.4's SCR-04 row names for the comparison matrix
 * ("units late, maximum days late, orders on time, added cost, line idle days"), which are the
 * measures the SCR-05 row sets planned against resulting, plus `revenueDelayedEur` — the exposure
 * that row does not list and an approved plan is read for — and `ordersTotal`, the denominator of
 * `ordersOnTime`, without which "orders on time" cannot be read as a figure. Seven rows in all.
 *
 * The remaining members are deliberately absent. `runOut`, `dailyClosingStock` and `orders` are
 * draws and series rather than single measures; `constraintCheck` and `constraintMessages` are the
 * comparison screen's verdict per option; `sideEffects` and `writeBacks` belong to the comparison's
 * write-back preview and to `./write-back-tracker.tsx`; and `levers` and `confidence` describe the
 * measurement rather than measuring it. Restating any of them here would be a second surface for
 * one fact.
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
 * Renders one measure of one record: the record's amount through the one formatter, its count as
 * the number the record holds, and the absence caption when the record carries no reading.
 */
function renderMeasure(value: number | undefined, format: MeasureFormat): ReactNode {
  if (value === undefined) {
    return <span className={NOT_APPLICABLE_CLASSES}>{OUTCOME_CARD_TEXT.notApplicable}</span>;
  }

  return format === 'money' ? <MonoValue value={value} kind="money" /> : value;
}

/** A row's stable identity: the measure it reports, which also survives a re-render in place. */
const rowKeyOf = (row: OutcomeRow): string => row.key;

/**
 * The three columns: the measure's label, then the two records' values in the order AAP §0.12.4
 * states them, both right-aligned so digits line up down each column.
 *
 * No column declares `sortable`, so `DataTable` renders no sort control and the rows stay in the
 * order above — the comparison's own reading order rather than a ranking this card would have to
 * judge.
 */
const COLUMNS: readonly TableColumn<OutcomeRow>[] = [
  {
    id: 'measure',
    header: OUTCOME_CARD_TEXT.measureHeader,
    render: (row) => row.label,
  },
  {
    id: 'planned',
    header: OUTCOME_CARD_TEXT.plannedHeader,
    align: 'end',
    render: (row) => renderMeasure(row.planned, row.format),
  },
  {
    id: 'resulting',
    header: OUTCOME_CARD_TEXT.resultingHeader,
    align: 'end',
    render: (row) => renderMeasure(row.resulting, row.format),
  },
];

/**
 * The sort callback `DataTable` requires and this table never reaches: no column above declares
 * `sortable`, so no control can report a sort and there is nothing to call. Re-ordering these rows
 * would rank two measurements against each other in a component, which is the arithmetic and the
 * judgement this card exists without (rule P-6).
 */
const KEEP_SUPPLIED_ROW_ORDER = (): void => {
  /* Unreachable: no column of this table declares `sortable`, so no control can report a sort. */
};

/* ---------------------------------------------------------------------------------------------
 * The card
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link OutcomeCard}. */
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
}

/**
 * Renders the post-approval comparison as one titled card carrying its own simulated-calculation
 * label.
 *
 * The card renders whenever the caller has both measurements, which is the caller's decision to
 * make: a screen that has an outcome to show passes both, and this component never suppresses
 * itself — two identical measurements still render as two columns.
 */
export function OutcomeCard({ planned, resulting }: OutcomeCardProps): JSX.Element {
  const rows = buildRows(planned, resulting);

  return (
    <Card title={OUTCOME_CARD_TEXT.title}>
      <StatusIndicator
        meaning="simulated"
        label={OUTCOME_SIM_LABEL}
        className={LABEL_CLASSES}
      />
      <DataTable<OutcomeRow>
        columns={COLUMNS}
        rows={rows}
        getRowKey={rowKeyOf}
        caption={OUTCOME_CARD_TEXT.caption}
        sort={null}
        onSort={KEEP_SUPPLIED_ROW_ORDER}
        emptyMessage={OUTCOME_CARD_TEXT.emptyTable}
      />
    </Card>
  );
}
