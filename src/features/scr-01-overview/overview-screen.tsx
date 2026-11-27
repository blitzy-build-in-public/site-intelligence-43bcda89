/**
 * SCR-01 Overview, the page a planner lands on to read what changed and why it matters: the four computed
 * tiles, the "Changed since your last visit" list, the risk-by-plant table, the revenue-at-risk bars that
 * narrow the queue and the opened/resolved series, at the route `/overview` in stage S1 (AAP 0.12.4's
 * SCR-01 row, AAP 0.15.1's row for this path, AAP 0.12.1's `scr-01-overview` screen folder).
 *
 * Every figure is `getOverview`'s payload, computed by `src/domain/aggregation` over the records the active
 * scope admits, and this module reaches records only through `useService()` (rule P-2): it derives, rounds
 * and formats nothing, places the payload's own values, draws its one formatter from
 * `src/components/mono-value.tsx`, and its one sort reorders the payload's own rows. Each tile and chart
 * frame carries `SIM_LABELS`' `Simulated calculation` member rather than relying on the page-level badge
 * (rules P-1, P-6), and every control here acts or opens its own evidence (rule P-8).
 *
 * WHY THE DAY'S CONTROL IS THE SERIES TABLE'S DATE CELL, NOT THE CHART'S MARK. AAP 0.12.4 asks this
 * series for two things at once: every figure opens its 420 px evidence drawer (principle PR-6), and
 * the fourteen days' dates filter the queue. One gesture cannot do both — a mark's single activation
 * opens that day's evidence, so a second effect that navigated to the queue would unmount this screen,
 * and the drawer with it, before a reader could read a word of it. The mark therefore keeps its
 * evidence and nothing else, exactly as every other figure does, and the day's own row in the series'
 * table view carries the narrowing: its date cell is a control named for the day it narrows to, so the
 * affordance states the effect it performs (rule P-8) and the shared chart primitive keeps the one
 * contract it already has.
 *
 * GAPS THIS FILE HAS TO REPORT, each recorded where it bites:
 * 1. `Overview` carries no evidence reference for the four tiles, for the by-plant rows or for the
 *    series points, so `aggregateRef` below composes one that names the aggregate and the shell
 *    selection the figure was read under — `overview:<key>`, with `?plants=<ids>&products=<ids>`
 *    appended when the top bar's filters name any. The evidence read answers that family from the same
 *    aggregate over the same resolved scope, so a narrowed screen and a narrowed drawer state one
 *    figure (AAP 0.2.1 F12, principle PR-6). This gap is closed; the derived reference map is held in
 *    one `useMemo` so a figure keeps one reference for one reading.
 * 2. `Overview.alternateSourceReadinessPercent` is not one of the four tiles specification SCR-01
 *    fixes, so it is not rendered here; the surfaces that read material readiness own it.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';

import { Card } from '../../components/card';
import { ChartFrame } from '../../components/chart-frame';
import type { ChartTableSpec } from '../../components/chart-frame';
import { DataTable } from '../../components/data-table';
import type { TableColumn, TableSort } from '../../components/data-table';
import { EvidenceRef } from '../../components/evidence-drawer';
import { HorizontalBarChart } from '../../components/horizontal-bar-chart';
import type { HorizontalBarDatum } from '../../components/horizontal-bar-chart';
import { LineChart } from '../../components/line-chart';
import type { LinePoint, LineSeriesSpec } from '../../components/line-chart';
import { MetricTile } from '../../components/metric-tile';
import { MonoValue, formatMoney } from '../../components/mono-value';
import { PageHeader } from '../../components/page-header';
import { deriveScreenState, forbiddenOf, staleSourceOf } from '../../components/screen-state';
import { StateBoundary } from '../../components/state-boundary';
import { ActionButton } from '../../components/tooltip';
import { useService } from '../../services/service-provider';
import { APPROVAL_GATE_SOURCE, EXCEPTION_QUEUE_PATH, SIM_LABELS } from '../../types';
import type {
  ChangedSinceLastVisitItem,
  DailyCountPoint,
  IsoDate,
  Overview,
  PlantId,
  PlantRiskRow,
  Result,
  Scope,
  SimLabel,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The wording this module owns
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence, caption, column header and axis name this screen states.
 *
 * Held in one object so the wording has a single owner: the component renders these strings and its suite
 * names them through this object instead of retyping them. The tile captions and the primary action are
 * the words AAP 0.12.4's SCR-01 row fixes; the rest are this screen's own, and none states a figure, an
 * amount, an identifier or a date (rule P-6).
 */
const SCREEN_TEXT = {
  /** The eyebrow above the title: the product name rule P-7 fixes. */
  eyebrow: 'Site Intelligence',

  title: 'Overview',

  primaryAction: 'Review critical exceptions',

  tileOpenExceptions: 'Open exceptions',

  tileRevenueAtRisk: 'Revenue at risk',

  tileCustomerOrdersAtRisk: 'Customer orders at risk',

  tileMedianHours: 'Median hours to approved plan',

  changedSinceTitle: 'Changed since your last visit',

  changedSinceEmpty: 'No record has changed since your last visit.',

  byPlantTitle: 'Risk by plant',

  byPlantCaption: 'Open exceptions and revenue at risk, by plant',

  byPlantEmpty: 'No plant in this scope carries an open exception.',

  columnPlant: 'Plant',

  columnPlantName: 'Name',

  columnOpenExceptions: 'Open exceptions',

  columnRevenueAtRisk: 'Revenue at risk',

  revenueChartTitle: 'Revenue at risk by plant',

  revenueChartAxis: 'Revenue at risk',

  revenueChartCaption: 'Revenue at risk by plant, as a table',

  seriesChartTitle: 'Exceptions opened and resolved per day',

  /** Which series each path is, for a reader who cannot tell them apart by colour. */
  seriesChartDescription:
    'The solid path counts the exceptions opened on each day and the dashed one counts the exceptions resolved.',

  seriesChartAxis: 'Exceptions',

  seriesOpenedLabel: 'Opened',

  seriesResolvedLabel: 'Resolved',

  columnDate: 'Date',

  columnOpened: 'Opened',

  columnResolved: 'Resolved',

  seriesChartCaption: 'Exceptions opened and resolved per day, as a table',

  /**
   * What the series table view's date control does, as the start of a sentence that names the day.
   *
   * It is this screen's own wording, not a specification §5.3 label: the control's accessible name is
   * this sentence followed by the day the row carries, so a reader of the table hears the action and
   * the day it acts on ("Narrow the queue to 2026-11-21") while the visible text stays the date
   * (rules P-8 and B-3). It states no figure and no date of its own (rule P-6).
   */
  narrowToDay: 'Narrow the queue to ',

  /** What the boundary says when the scope holds nothing to report. */
  empty: 'No exception is open in this scope, so there is nothing to summarise.',

  partial:
    'A source behind these figures answered incompletely, so the readings cover the inputs it supplied.',

  conflict: 'These figures were read against records that have since changed. Read the overview again.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The fixed strings and the references this screen composes
 * ------------------------------------------------------------------------------------------- */

/**
 * The one specification §5.3 label every figure on this screen carries: `Simulated calculation`,
 * taken from the tuple in `src/types/primitives.ts` that owns the seven exact strings, so this module
 * types no label text of its own (rule P-1).
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/**
 * The root of this screen's aggregate references, prefixed to every figure's `evidenceRef`.
 *
 * The evidence read answers `overview:<key>` from the aggregate this screen reads — the same method,
 * over the same resolved scope — so a figure's drawer states the number the screen drew rather than a
 * second computation of it (AAP 0.2.1 F12, principle PR-6). The payload carries no reference of its
 * own, so `aggregateRef` composes one from this root and the aggregate's key; it is stable across
 * renders, so a figure keeps one reference for one reading.
 */
const AGGREGATE_REF_ROOT = 'overview';

/** The query parameter a reference carries the shell's plant selection in. */
const PLANTS_PARAM = 'plants';

/** The query parameter a reference carries the shell's product selection in. */
const PRODUCTS_PARAM = 'products';

/** The separator a selection's two lists are stated with. */
const SELECTION_SEPARATOR = ',';

/**
 * The shell selection a reference carries, as a query suffix.
 *
 * The suffix is present only when the selection names plants or products, so an unnarrowed screen
 * composes the bare `<root>:<key>` form the evidence read documents. It is what makes the drawer's
 * figure the screen's figure: the read resolves these filters through the same one scope resolver the
 * read behind this screen was narrowed by (AAP 0.2.1).
 *
 * @param scope - The shell's plant and product selection.
 * @returns `?plants=…&products=…`, or an empty string when the selection names neither.
 */
function selectionQuery(scope: Scope): string {
  const params: string[] = [];

  if (scope.plants.length > 0) {
    params.push(`${PLANTS_PARAM}=${scope.plants.join(SELECTION_SEPARATOR)}`);
  }

  if (scope.products.length > 0) {
    params.push(`${PRODUCTS_PARAM}=${scope.products.join(SELECTION_SEPARATOR)}`);
  }

  return params.length === 0 ? '' : `?${params.join('&')}`;
}

/**
 * The reference one aggregate figure carries: the root, a colon, the aggregate's own key, then the
 * selection the figure was read under.
 *
 * @param key - The aggregate the figure reports, such as `revenue-at-risk`.
 * @param scope - The shell's selection, which the drawer's read narrows by.
 * @returns The reference the figure's `EvidenceRef` and the chart's mark carry.
 */
function aggregateRef(key: string, scope: Scope): string {
  return `${AGGREGATE_REF_ROOT}:${key}${selectionQuery(scope)}`;
}

/**
 * The reference one plant's open-exceptions count carries.
 *
 * The count and the amount are two figures of one row, so each names its own aggregate: a reference
 * that named the plant but not which of its readings the reader activated would answer the other figure
 * (principle PR-6).
 *
 * @param plantId - The plant the row reports on.
 * @param scope - The shell's selection, which the drawer's read narrows by.
 * @returns The reference the row's count carries.
 */
function plantOpenExceptionsRef(plantId: PlantId, scope: Scope): string {
  return aggregateRef(`plant/${plantId}/open-exceptions`, scope);
}

/**
 * The reference one plant's revenue reading carries.
 *
 * @param plantId - The plant the row reports on.
 * @param scope - The shell's selection, which the drawer's read narrows by.
 * @returns The reference the row's amount and its bar carry.
 */
function plantRef(plantId: PlantId, scope: Scope): string {
  return aggregateRef(`plant/${plantId}/revenue-at-risk`, scope);
}

/**
 * The reference one day's count carries.
 *
 * @param kind - Which of the day's two readings the figure is.
 * @param date - The calendar date the count was taken over.
 * @param scope - The shell's selection, which the drawer's read narrows by.
 * @returns The reference the point's mark and the table view's cell carry.
 */
function dayRef(kind: 'open' | 'resolved', date: IsoDate, scope: Scope): string {
  return aggregateRef(`day/${date}/${kind}`, scope);
}

/* ---------------------------------------------------------------------------------------------
 * Props and the narrowing this screen emits
 * ------------------------------------------------------------------------------------------- */

/**
 * What activating a figure on this screen asks the shell to do to the exception queue.
 *
 * AAP 0.12.4 fixes both gestures: a revenue bar narrows the queue to the plant it draws, and a date
 * on the opened/resolved series narrows it to that day. This screen emits the member and nothing more,
 * because a screen may not read the shell's store; the shell turns it into the navigation and the day
 * it carries, and `ExceptionQuery.date` in `src/types/service.ts` is the member the queue's read
 * narrows by — so the date a reader chose is the date asked of the records, never a filter this screen
 * re-applies to rows it already has (rule P-2).
 */
export type OverviewNarrowing =
  | { readonly kind: 'plant'; readonly plantId: PlantId }
  | { readonly kind: 'date'; readonly date: IsoDate };

/** Props of {@link OverviewScreen}. */
export interface OverviewScreenProps {
  /**
   * The shell's plant and product selection, passed in because a screen never reads the shell's
   * stores (AAP 0.18.1). The service intersects it with the acting role's plant scope before the
   * aggregate runs, so the overview and the queue describe one population (AAP 0.2.1).
   */
  readonly scope: Scope;

  /**
   * What the shell does when a figure narrows the queue. Absent, a bar still opens its own evidence,
   * so the control keeps performing its function with no handler in reach (rule P-8).
   */
  readonly onNarrowQueue?: (narrowing: OverviewNarrowing) => void;
}

/* ---------------------------------------------------------------------------------------------
 * Layout, built from role tokens and the 4 px grid only
 * ------------------------------------------------------------------------------------------- */

/** The page frame: one column, separated by the 6-step of the spacing scale. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-6';

/**
 * The four tiles: one column when the row is narrow, two once it can hold two, four once it can hold
 * four. The tracks are equal fractions rather than content-sized, so a long amount cannot push a
 * neighbouring tile out of the row.
 *
 * WHY THE COLUMN COUNT FOLLOWS THE ROW'S OWN WIDTH AND NOT THE VIEWPORT'S. From 1280 px the evidence
 * drawer docks beside the page and reserves its 420 px inside the page (AAP §0.12.4), so the column
 * this grid is laid out in can be 860 px wide at a 1280 px viewport. A viewport breakpoint cannot see
 * that: it would keep asking for four tracks, each 195 px, and the widest figure the tiles carry — a
 * 28 px money run of about 218 px — would render past its own card and be covered by the next one. An
 * `auto-fit` track with a 17rem floor answers the space actually available instead: four tracks of
 * 300 px in the full 1248 px row, two of 406 px in the 828 px the docked drawer leaves, one on a
 * phone — the same column counts this grid produced before, decided by the room it has.
 */
const TILE_GRID_CLASSES =
  'grid min-w-0 grid-cols-[repeat(auto-fit,minmax(17rem,1fr))] gap-4';

/**
 * The two charts: stacked, then side by side where the page has the width for both.
 *
 * `items-start` keeps each card the height of its own figure rather than stretching the shorter one, so a
 * two-row bar chart does not leave a card of empty surface beside a line chart that fills its own.
 */
const CHART_GRID_CLASSES = 'grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-2';

/** The changed-since list: one column, one item per row. */
const LIST_CLASSES = 'flex min-w-0 flex-col gap-3';

/** One changed-since item: the record it opens, then the record's own account of the change. */
const LIST_ITEM_CLASSES = 'flex min-w-0 flex-col gap-1 border-b border-hairline pb-3 last:border-b-0 last:pb-0';

/** A changed-since item's record label: the primary text role, at the body step. */
const ITEM_LABEL_CLASSES = 'min-w-0 break-words text-14 text-text-primary';

/** Supporting text: a record's detail or an empty group's sentence, in the secondary role. */
const DETAIL_CLASSES = 'min-w-0 break-words text-13 text-text-secondary';

/* ---------------------------------------------------------------------------------------------
 * Neutral empty collections, so a memoised member needs no fabricated record
 * ------------------------------------------------------------------------------------------- */

/** The by-plant rows of a payload that has not settled yet. */
const NO_ROWS: readonly PlantRiskRow[] = [];

/** The changed-since items of a payload that has not settled yet. */
const NO_ITEMS: readonly ChangedSinceLastVisitItem[] = [];

/** The series points of a payload that has not settled yet. */
const NO_POINTS: readonly DailyCountPoint[] = [];

/** The count an empty population reports, used only to recognise a scope with nothing in it. */
const EMPTY_COUNT = 0;

/** The floor of a bar chart's axis when no bar has a positive extent. */
const AXIS_FLOOR = 0;

/* ---------------------------------------------------------------------------------------------
 * The by-plant table: its columns, its ordering, and nothing recomputed
 * ------------------------------------------------------------------------------------------- */

/** One column's ordering key: the row's own value, never a value computed here. */
type PlantSortAccessor = (row: PlantRiskRow) => string | number;

/**
 * The value each sortable column orders by, read straight off the row the payload supplied.
 *
 * A column without an entry orders nothing, and the table falls back to the payload's delivered
 * order, so a column added without an accessor cannot silently sort by an unrelated member.
 */
const PLANT_SORT_ACCESSORS: Record<string, PlantSortAccessor> = {
  plantId: (row) => row.plantId,
  plantName: (row) => row.plantName,
  openExceptions: (row) => row.openExceptions,
  revenueAtRiskEur: (row) => row.revenueAtRiskEur,
};

/**
 * Compares two of a row's own values: numerically for two numbers, as text otherwise.
 *
 * @param left - The first row's value.
 * @param right - The second row's value.
 * @returns A negative number when the first sorts first, positive when the second does, zero otherwise.
 */
function compareValues(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right));
}

/**
 * The by-plant rows in the order the reader asked for, or exactly as the payload delivered them.
 *
 * Ordering moves rows and recomputes nothing (rule P-6), so a sorted table and the unsorted one hold
 * the same figures. The rows are copied before they are sorted, because the payload's array is the
 * query cache's own.
 *
 * @param rows - The payload's rows.
 * @param sort - The active ordering, or `null` for the delivered order.
 * @returns A new array in the requested order, or the caller's array when no ordering applies.
 */
function orderPlantRows(
  rows: readonly PlantRiskRow[],
  sort: TableSort | null,
): readonly PlantRiskRow[] {
  if (sort === null) {
    return rows;
  }

  const accessor = PLANT_SORT_ACCESSORS[sort.columnId];

  if (accessor === undefined) {
    return rows;
  }

  const ordered = [...rows].sort((left, right) =>
    compareValues(accessor(left), accessor(right)),
  );

  return sort.direction === 'asc' ? ordered : ordered.reverse();
}

/**
 * The columns of the risk-by-plant table, and the same list the revenue bars' table view renders, so the
 * two representations show identical columns over identical rows.
 *
 * The plant identifier and the amount go through `MonoValue`, so they are set in the tabular mono face
 * AAP 0.5.3 fixes, and each figure is wrapped in `EvidenceRef`, because a figure on this workspace
 * opens the record and formula behind it (rule P-6, principle PR-6). Every column is sortable: the
 * table's `onSort` and the chart's table view share one handler, so ordering either one orders both.
 *
 * The list is built per selection because a row's reference carries the shell's filters: a narrowed
 * screen must open a narrowed drawer, exactly as its bars and tiles do (AAP 0.2.1).
 *
 * @param scope - The shell's plant and product selection.
 * @returns The columns, with each figure's reference composed for that selection.
 */
function plantColumnsOf(scope: Scope): readonly TableColumn<PlantRiskRow>[] {
  return [
    {
      id: 'plantId',
      header: SCREEN_TEXT.columnPlant,
      sortable: true,
      render: (row) => <MonoValue value={row.plantId} kind="id" />,
    },
    {
      id: 'plantName',
      header: SCREEN_TEXT.columnPlantName,
      sortable: true,
      render: (row) => row.plantName,
    },
    {
      id: 'openExceptions',
      header: SCREEN_TEXT.columnOpenExceptions,
      sortable: true,
      align: 'end',
      render: (row) => (
        <EvidenceRef ref={plantOpenExceptionsRef(row.plantId, scope)}>
          {row.openExceptions}
        </EvidenceRef>
      ),
    },
    {
      id: 'revenueAtRiskEur',
      header: SCREEN_TEXT.columnRevenueAtRisk,
      sortable: true,
      align: 'end',
      render: (row) => (
        <EvidenceRef ref={plantRef(row.plantId, scope)}>
          <MonoValue value={row.revenueAtRiskEur} kind="money" />
        </EvidenceRef>
      ),
    },
  ];
}

/**
 * The columns of the opened/resolved series' table view, drawn from the same points its marks draw.
 *
 * This list is the chart's table representation only: the screen itself renders the series as a chart,
 * and the frame's "View as table" swaps one for the other. Each count is wrapped in `EvidenceRef`, so a
 * reader takes the same figure from the table as from the mark, and opens the same evidence behind it.
 *
 * The date cell is where the series narrows the queue to a day (AAP §0.12.4). It is a factory rather
 * than a constant because the activation belongs to the screen instance that renders it — the handler
 * arrives as a prop from the shell — and the day it reports is the row's own `date`, so the control
 * asks the records about the day it prints rather than about a position in the chart.
 *
 * THE CONTROL'S NAME IS ONE SENTENCE AND ITS FACE IS THE DAY. The action is stated in
 * `SCREEN_TEXT.narrowToDay` and the day follows it, so the name begins with what activating the control
 * does and ends with the day it does it to (rules P-8 and B-3). The sentence is carried as a single
 * text node and the day it shows is `aria-hidden`, because a name assembled from two elements loses
 * the space between them in the accessible-name computation — each contributor is trimmed before it is
 * appended — and a reader would hear "to2026-11-21". Nothing is withheld from a screen reader by that:
 * the same day is in the name, which is what the control is announced with.
 *
 * @param narrowToDate - What an activation asks for: the day the activated row carries.
 * @param scope - The shell's plant and product selection, which each count's reference carries so the
 *   table's figure is the one the mark beside it opens, over the same selection.
 * @returns The three columns of the series' table view, in the order specification SCR-01 reads them.
 */
function seriesColumnsOf(
  narrowToDate: (date: IsoDate) => void,
  scope: Scope,
): readonly TableColumn<DailyCountPoint>[] {
  return [
    {
      id: 'date',
      header: SCREEN_TEXT.columnDate,
      render: (point) => (
        <ActionButton
          variant="secondary"
          onClick={() => {
            narrowToDate(point.date);
          }}
        >
          <span className="sr-only">{`${SCREEN_TEXT.narrowToDay}${point.date}`}</span>
          <span aria-hidden="true">
            <MonoValue value={point.date} kind="timestamp" />
          </span>
        </ActionButton>
      ),
    },
    {
      id: 'open',
      header: SCREEN_TEXT.columnOpened,
      align: 'end',
      render: (point) => (
        <EvidenceRef ref={dayRef('open', point.date, scope)}>{point.open}</EvidenceRef>
      ),
    },
    {
      id: 'resolved',
      header: SCREEN_TEXT.columnResolved,
      align: 'end',
      render: (point) => (
        <EvidenceRef ref={dayRef('resolved', point.date, scope)}>{point.resolved}</EvidenceRef>
      ),
    },
  ];
}

/* ---------------------------------------------------------------------------------------------
 * The screen's own reading of an empty payload
 * ------------------------------------------------------------------------------------------- */

/**
 * Whether the payload holds nothing to report at all: no open exception, no risk row, no changed record.
 *
 * Recognising that here is what lets the boundary show the empty state instead of blank surfaces.
 *
 * A plant row is counted rather than merely present, because the aggregate lists one row per plant in
 * the resolved scope whether or not that plant has risk: a row carrying no open exception and no
 * revenue is the same identity a missing row would be, so a scope whose every row is the identity has
 * nothing to show. That is what makes the simulation popover's `empty` trigger render this screen's
 * empty state — the state specification §8 requires on every screen and AAP §0.12.4 makes structural —
 * rather than four confident zeros with nothing marking them as no data (T-17).
 *
 * @param overview - The payload the read resolved to.
 * @returns Whether there is nothing to show.
 */
function hasNothingToShow(overview: Overview): boolean {
  return (
    overview.openExceptions === EMPTY_COUNT &&
    overview.changedSinceLastVisit.length === 0 &&
    overview.byPlant.every(
      (row) => row.openExceptions === EMPTY_COUNT && row.revenueAtRiskEur === EMPTY_COUNT,
    )
  );
}

/* ---------------------------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------------------------- */

/**
 * SCR-01 Overview: the four computed tiles, what changed since the last visit, the risk-by-plant table,
 * the revenue-at-risk bars and the opened/resolved series.
 *
 * One read, through the port: `getOverview`, keyed by the method's own name and the scope it was made
 * with (AAP 0.6.2), so a scope change re-reads the overview and a write that invalidates `getOverview`
 * reaches this entry. The settled facts decide the screen's state in one place
 * ({@link deriveScreenState}), and the boundary owns how that state looks. Nothing here writes: the
 * only state the component owns is what the reader chose — the table's ordering and the bar they last
 * activated — so a re-render can never move a record. A day the reader narrows the queue by is
 * reported to the shell rather than held here: the shell carries it to the queue, and nothing on this
 * screen's own rendering depends on it (rule P-2).
 *
 * @param props - The shell's plant and product selection, and the handler a figure reports to.
 * @returns The header with the screen's primary action, and the overview inside the state boundary.
 */
export function OverviewScreen({ scope, onNarrowQueue }: OverviewScreenProps): ReactElement {
  const service = useService();
  const navigate = useNavigate();

  const [sort, setSort] = useState<TableSort | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<PlantId | null>(null);

  /*
   * Retries are off on purpose: a refusal the records' own permissions produce fails the same way
   * however often it is repeated, and the boundary offers the reader an explicit retry for the case
   * where repeating the call can succeed.
   *
   * The payload already on screen stays mounted while a narrowed scope re-reads
   * (`placeholderData: keepPreviousData`), so the revenue bar the reader activated keeps the figure it
   * draws and the evidence drawer that same gesture opened: substituting the pending state would
   * unmount the chart, and the drawer with it. What stays up until the new read settles is the outgoing
   * scope's reading of the same aggregate, never a figure the incoming scope would not report.
   */
  const overviewQuery = useQuery<Result<Overview>, unknown>({
    queryKey: ['getOverview', scope],
    queryFn: () => service.getOverview(scope),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const result = overviewQuery.data;
  const overview = result?.data;

  /*
   * The read's own facts, plus this screen's reading of its payload: the order book is the source the
   * approval taken next depends on, so the stale notice names it first (AAP 0.2.1, T-13), and an
   * empty scope is one where no exception is open, no plant carries a risk row and no record changed.
   */
  const state = deriveScreenState({
    isPending: overviewQuery.isPending,
    error: overviewQuery.error,
    freshness: result?.meta.freshness,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    hasContent: overview === undefined ? false : !hasNothingToShow(overview),
  });
  const staleRecord =
    result === undefined ? undefined : staleSourceOf(result.meta.freshness, APPROVAL_GATE_SOURCE);
  const forbiddenRecord = forbiddenOf(overviewQuery.error);

  const byPlant = overview?.byPlant ?? NO_ROWS;
  const changed = overview?.changedSinceLastVisit ?? NO_ITEMS;
  const series = overview?.openResolvedSeries ?? NO_POINTS;

  const orderedByPlant = useMemo(() => orderPlantRows(byPlant, sort), [byPlant, sort]);

  /*
   * The references and the columns this screen's figures carry, derived once per selection: the four
   * tiles, the by-plant cells, the bars and the series points of one reading then share one reference
   * per figure, and a re-render that moves no selection moves no reference (AAP 0.2.1 F12).
   */
  const tileRefs = useMemo(
    () => ({
      openExceptions: aggregateRef('open-exceptions', scope),
      revenueAtRisk: aggregateRef('revenue-at-risk', scope),
      customerOrdersAtRisk: aggregateRef('customer-orders-at-risk', scope),
      medianHoursToApprovedPlan: aggregateRef('median-hours-to-approved-plan', scope),
    }),
    [scope],
  );

  const plantColumns = useMemo(() => plantColumnsOf(scope), [scope]);
  const seriesColumns = useMemo(
    () => seriesColumnsOf(narrowToDate, scope),
    [narrowToDate, scope],
  );

  /*
   * The bars, one per by-plant row, in the payload's own order: `value` is the amount's magnitude for
   * geometry alone and `valueLabel` is the text a reader sees, formatted by the interface's one money
   * formatter rather than by a rule of this file's, so the bar and the table cell beneath it read the
   * same amount the same way.
   */
  const bars = useMemo<readonly HorizontalBarDatum[]>(
    () =>
      byPlant.map((row) => ({
        id: row.plantId,
        label: row.plantName,
        value: row.revenueAtRiskEur,
        valueLabel: formatMoney(row.revenueAtRiskEur),
        evidenceRef: plantRef(row.plantId, scope),
        simLabel: CALCULATION_LABEL,
      })),
    [byPlant, scope],
  );

  /*
   * The axis maximum is one value for the whole series, taken from the payload rather than from the
   * bars, so a later narrowing cannot redraw the same amount at a different length. It is geometry:
   * no figure on screen is derived from it.
   */
  const axisMax = useMemo(
    () => Math.max(AXIS_FLOOR, ...byPlant.map((row) => row.revenueAtRiskEur)),
    [byPlant],
  );

  const openedPoints = useMemo<readonly LinePoint[]>(
    () =>
      series.map((point) => ({
        x: point.date,
        y: point.open,
        yLabel: String(point.open),
        evidenceRef: dayRef('open', point.date, scope),
      })),
    [series, scope],
  );

  const resolvedPoints = useMemo<readonly LinePoint[]>(
    () =>
      series.map((point) => ({
        x: point.date,
        y: point.resolved,
        yLabel: String(point.resolved),
        evidenceRef: dayRef('resolved', point.date, scope),
      })),
    [series, scope],
  );

  /*
   * The two series are told apart by their own paths and labels as well as by tone, so the reading
   * does not rest on colour (rule B-3): the counts that need a response take the warning role and a
   * solid path, the ones that closed take the pass role and a dashed path, each series names itself in
   * every mark's accessible name, and the frame's description states which path is which for a reader
   * who never sees a mark's name.
   */
  const lineSeries: readonly LineSeriesSpec[] = [
    {
      id: 'opened',
      label: SCREEN_TEXT.seriesOpenedLabel,
      tone: 'warning',
      points: openedPoints,
      simLabel: CALCULATION_LABEL,
    },
    {
      id: 'resolved',
      label: SCREEN_TEXT.seriesResolvedLabel,
      tone: 'pass',
      points: resolvedPoints,
      simLabel: CALCULATION_LABEL,
      dashed: true,
    },
  ];

  const revenueTable: ChartTableSpec<PlantRiskRow> = {
    caption: SCREEN_TEXT.revenueChartCaption,
    columns: plantColumns,
    rows: orderedByPlant,
    getRowKey: (row) => row.plantId,
    sort,
    onSort: (columnId) => {
      handleSort(columnId);
    },
  };

  const seriesTable: ChartTableSpec<DailyCountPoint> = {
    caption: SCREEN_TEXT.seriesChartCaption,
    columns: seriesColumns,
    rows: series,
    getRowKey: (point) => point.date,
  };

  /** Turns a column's sort control into the next ordering the table and the chart's table share. */
  function handleSort(columnId: string): void {
    setSort((current) =>
      current !== null && current.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' },
    );
  }

  /** Asks the port for the overview again, which is what the boundary's retry control does. */
  function retryRead(): void {
    void overviewQuery.refetch();
  }

  /*
   * One gesture, two effects, as AAP 0.12.4's SCR-01 row fixes them: the mark opens its own evidence —
   * the chart owns that half, for a pointer and for `Enter` or `Space` alike — and the shell is asked
   * to narrow the queue to the plant the bar draws. The reader stays on the overview, because the
   * drawer the same gesture opened is the evidence behind this figure and leaving the screen would
   * close it; the narrowed queue is reached through this screen's primary action "Review critical
   * exceptions", or through the queue's navigation entry. The selection is held here only so the chart
   * can mark the bar the reader chose.
   */
  function narrowToPlant(plantId: string): void {
    setSelectedPlantId(plantId);
    onNarrowQueue?.({ kind: 'plant', plantId });
  }

  /*
   * The day the reader narrowed by, asked of the records. The date is the activated row's own, so the
   * queue is asked about the day the control prints rather than about a position in the table; nothing
   * is held here, because the shell carries the day to the queue and this screen's rendering does not
   * depend on it (rule P-2). With no handler in reach the row's figures still open their own evidence,
   * so the table keeps performing (rule P-8).
   */
  function narrowToDate(date: IsoDate): void {
    onNarrowQueue?.({ kind: 'date', date });
  }

  return (
    <div className={SCREEN_CLASSES}>
      <PageHeader
        title={SCREEN_TEXT.title}
        eyebrow={SCREEN_TEXT.eyebrow}
        actions={
          <ActionButton
            variant="primary"
            onClick={() => {
              void navigate(EXCEPTION_QUEUE_PATH);
            }}
          >
            {SCREEN_TEXT.primaryAction}
          </ActionButton>
        }
      />

      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryRead}
        emptyMessage={SCREEN_TEXT.empty}
        partialMessage={SCREEN_TEXT.partial}
        conflictMessage={SCREEN_TEXT.conflict}
        forbidden={forbiddenRecord}
      >
        {overview === undefined ? null : (
          <>
            <div className={TILE_GRID_CLASSES}>
              <MetricTile
                label={SCREEN_TEXT.tileOpenExceptions}
                value={overview.openExceptions}
                evidenceRef={tileRefs.openExceptions}
                simLabel={CALCULATION_LABEL}
              />
              <MetricTile
                label={SCREEN_TEXT.tileRevenueAtRisk}
                value={overview.revenueAtRiskEur}
                kind="money"
                evidenceRef={tileRefs.revenueAtRisk}
                simLabel={CALCULATION_LABEL}
              />
              <MetricTile
                label={SCREEN_TEXT.tileCustomerOrdersAtRisk}
                value={overview.customerOrdersAtRisk}
                evidenceRef={tileRefs.customerOrdersAtRisk}
                simLabel={CALCULATION_LABEL}
              />
              <MetricTile
                label={SCREEN_TEXT.tileMedianHours}
                value={overview.medianHoursToApprovedPlan}
                kind="hours"
                evidenceRef={tileRefs.medianHoursToApprovedPlan}
                simLabel={CALCULATION_LABEL}
              />
            </div>

            <Card title={SCREEN_TEXT.changedSinceTitle}>
              {changed.length === 0 ? (
                <p className={DETAIL_CLASSES}>{SCREEN_TEXT.changedSinceEmpty}</p>
              ) : (
                <ul className={LIST_CLASSES}>
                  {changed.map((item) => (
                    <li key={item.ref} className={LIST_ITEM_CLASSES}>
                      <EvidenceRef ref={item.ref}>
                        <span className={ITEM_LABEL_CLASSES}>{item.label}</span>
                      </EvidenceRef>
                      <p className={DETAIL_CLASSES}>{item.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={SCREEN_TEXT.byPlantTitle}>
              <DataTable<PlantRiskRow>
                columns={plantColumns}
                rows={orderedByPlant}
                getRowKey={(row) => row.plantId}
                caption={SCREEN_TEXT.byPlantCaption}
                sort={sort}
                onSort={handleSort}
                emptyMessage={SCREEN_TEXT.byPlantEmpty}
              />
            </Card>

            <div className={CHART_GRID_CLASSES}>
              <Card as="div">
                <ChartFrame<PlantRiskRow>
                  title={SCREEN_TEXT.revenueChartTitle}
                  simLabel={CALCULATION_LABEL}
                  tableRows={revenueTable}
                >
                  <HorizontalBarChart
                    bars={bars}
                    max={axisMax}
                    xAxisLabel={SCREEN_TEXT.revenueChartAxis}
                    onActivate={narrowToPlant}
                    activeId={selectedPlantId ?? undefined}
                  />
                </ChartFrame>
              </Card>

              <Card as="div">
                <ChartFrame<DailyCountPoint>
                  title={SCREEN_TEXT.seriesChartTitle}
                  description={SCREEN_TEXT.seriesChartDescription}
                  simLabel={CALCULATION_LABEL}
                  tableRows={seriesTable}
                >
                  <LineChart series={lineSeries} yAxisLabel={SCREEN_TEXT.seriesChartAxis} />
                </ChartFrame>
              </Card>
            </div>
          </>
        )}
      </StateBoundary>
    </div>
  );
}

