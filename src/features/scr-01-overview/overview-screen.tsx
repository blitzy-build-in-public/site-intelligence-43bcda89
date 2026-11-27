/**
 * SCR-01 Overview, the page a planner lands on to read what changed and why it matters.
 *
 * Implements AAP 0.12.4's SCR-01 row (four computed tiles, the "Changed since your last visit" list,
 * the risk-by-plant table, the revenue-at-risk bars that narrow the queue and the opened/resolved
 * series), AAP 0.15.1's row for this path, and AAP 0.12.1's `scr-01-overview` screen folder. The
 * route is `/overview`, the stage is S1.
 *
 * WHAT ARRIVES ALREADY COMPUTED (rule P-6). Every figure on this page is `getOverview`'s payload,
 * computed by `src/domain/aggregation` over the records the active scope admits. This module derives
 * nothing, rounds nothing, reads no clock and applies no formatting rule of its own: it places the
 * payload's own values, and the only formatter it reaches is `src/components/mono-value.tsx` — through
 * `MonoValue`'s `kind` for the figures it renders as elements, and through that module's exported
 * `formatMoney` for the one text an SVG cannot draw as an element, the bar chart's value label. The
 * only ordering this file performs is the by-plant table's sort, which reorders the payload's own rows
 * and never recomputes a member. The screen is a leaf of the import graph: the shell passes `scope`
 * in, and the screen reaches records only through `useService()` (rule P-2) — never a seed module, an
 * adapter, an API client or a domain module.
 *
 * EVERY FIGURE IS LABELLED AND EVERY CONTROL ACTS (rules P-1 and P-8). Each tile and each chart frame
 * receives `SIM_LABELS`' `Simulated calculation` member, so no computed figure depends on the shell's
 * page-level badge for its label. "Review critical exceptions" really navigates to `/exceptions`, and
 * each revenue bar opens its own evidence and reports the plant it names through `onNarrowQueue`, so
 * no control here is a dead mark.
 *
 * GAPS THIS FILE HAS TO REPORT, each recorded where it bites:
 * 1. `Overview` carries no evidence reference for the four tiles, for the by-plant rows or for the
 *    series points, and `getEvidence` resolves record identifiers only. `aggregateRef` below therefore
 *    composes a deterministic reference that names the aggregate a figure reports; the drawer reports
 *    that no record answers it until the adapter's evidence read resolves an aggregate family. The
 *    alternative — omitting the reference — cannot compile, because `MetricTile`,
 *    `HorizontalBarDatum` and `LinePoint` all require one.
 * 2. `LineChart` exposes no activation callback for a date, so the opened/resolved series cannot
 *    narrow the queue by date. No interactive affordance is rendered for a date, per rule P-8, and
 *    `OverviewNarrowing`'s `date` member is exported for the shell and the sibling screens that can
 *    emit it.
 * 3. `Overview.alternateSourceReadinessPercent` is not one of the four tiles specification SCR-01
 *    fixes, so it is not rendered here; the surfaces that read material readiness own it.
 */
import { useQuery } from '@tanstack/react-query';
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
import { StateBoundary } from '../../components/state-boundary';
import type { StateBoundaryForbidden, StateBoundaryStale } from '../../components/state-boundary';
import { ActionButton } from '../../components/tooltip';
import { useService } from '../../services/service-provider';
import { APPROVAL_GATE_SOURCE, SIM_LABELS, SOURCE_LABELS } from '../../types';
import type {
  ChangedSinceLastVisitItem,
  DailyCountPoint,
  Freshness,
  FreshnessState,
  IsoDate,
  Overview,
  PlantId,
  PlantRiskRow,
  Problem,
  Result,
  Scope,
  ScreenState,
  SimLabel,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The wording this module owns
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence, caption, column header and axis name this screen states.
 *
 * Held in one object so the wording has a single owner, the way the sibling screens hold theirs: the
 * component renders these strings and its suite names them through this object instead of retyping
 * them. The tile captions and the primary action are the words AAP 0.12.4's SCR-01 row fixes; the
 * column headers, captions and axis names are this screen's own, and none of them states a figure, an
 * amount, an identifier or a date (rule P-6).
 */
const SCREEN_TEXT = {
  /** The eyebrow above the title: the product name rule P-7 fixes. */
  eyebrow: 'Site Intelligence',

  /** The screen's title, in the one level-one heading it renders. */
  title: 'Overview',

  /** The one action this screen exists to take. */
  primaryAction: 'Review critical exceptions',

  /** The first tile's caption. */
  tileOpenExceptions: 'Open exceptions',

  /** The second tile's caption. */
  tileRevenueAtRisk: 'Revenue at risk',

  /** The third tile's caption. */
  tileCustomerOrdersAtRisk: 'Customer orders at risk',

  /** The fourth tile's caption. */
  tileMedianHours: 'Median hours to approved plan',

  /** The changed-since group's heading. */
  changedSinceTitle: 'Changed since your last visit',

  /** What the changed-since group says when nothing moved. */
  changedSinceEmpty: 'No record has changed since your last visit.',

  /** The risk-by-plant group's heading. */
  byPlantTitle: 'Risk by plant',

  /** The risk-by-plant table's accessible name. */
  byPlantCaption: 'Open exceptions and revenue at risk, by plant',

  /** What the risk-by-plant table says when the scope holds no plant with an open exception. */
  byPlantEmpty: 'No plant in this scope carries an open exception.',

  /** The risk-by-plant table's plant column. */
  columnPlant: 'Plant',

  /** The risk-by-plant table's name column. */
  columnPlantName: 'Name',

  /** The risk-by-plant table's open-exception count column. */
  columnOpenExceptions: 'Open exceptions',

  /** The risk-by-plant table's revenue column. */
  columnRevenueAtRisk: 'Revenue at risk',

  /** The revenue bars' frame title. */
  revenueChartTitle: 'Revenue at risk by plant',

  /** The revenue bars' accessible axis name. */
  revenueChartAxis: 'Revenue at risk',

  /** The revenue bars' table-view name. */
  revenueChartCaption: 'Revenue at risk by plant, as a table',

  /** The series frame's title. */
  seriesChartTitle: 'Exceptions opened and resolved per day',

  /** Which series each path is, for a reader who cannot tell them apart by colour. */
  seriesChartDescription:
    'The solid path counts the exceptions opened on each day and the dashed one counts the exceptions resolved.',

  /** The series' accessible axis name. */
  seriesChartAxis: 'Exceptions',

  /** The series series drawn from the days' opened counts. */
  seriesOpenedLabel: 'Opened',

  /** The series series drawn from the days' resolved counts. */
  seriesResolvedLabel: 'Resolved',

  /** The series table view's date column. */
  columnDate: 'Date',

  /** The series table view's opened column. */
  columnOpened: 'Opened',

  /** The series table view's resolved column. */
  columnResolved: 'Resolved',

  /** The series table view's name. */
  seriesChartCaption: 'Exceptions opened and resolved per day, as a table',

  /** What the boundary says when the scope holds nothing to report. */
  empty: 'No exception is open in this scope, so there is nothing to summarise.',

  /** What the boundary says when a source answered incompletely. */
  partial:
    'A source behind these figures answered incompletely, so the readings cover the inputs it supplied.',

  /** What the boundary says when the records moved under the reader. */
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

/** The route the primary action reaches. */
const EXCEPTIONS_ROUTE = '/exceptions';

/**
 * The root of this screen's aggregate references, prefixed to every figure's `evidenceRef`.
 *
 * See gap 1 in the module note: the payload carries no reference for an aggregate figure, and
 * `getEvidence` resolves record identifiers only. The reference still names the aggregate precisely
 * and is stable across renders, so a figure keeps one reference for one reading.
 */
const AGGREGATE_REF_ROOT = 'overview';

/**
 * The reference one aggregate figure carries: the root, a colon, then the aggregate's own key.
 *
 * @param key - The aggregate the figure reports, such as `revenue-at-risk`.
 * @returns The reference the figure's `EvidenceRef` and the bar chart's mark carry.
 */
function aggregateRef(key: string): string {
  return `${AGGREGATE_REF_ROOT}:${key}`;
}

/** The four tiles' references, one per computed figure. */
const TILE_REFS = {
  openExceptions: aggregateRef('open-exceptions'),
  revenueAtRisk: aggregateRef('revenue-at-risk'),
  customerOrdersAtRisk: aggregateRef('customer-orders-at-risk'),
  medianHoursToApprovedPlan: aggregateRef('median-hours-to-approved-plan'),
} as const;

/**
 * The reference one plant's revenue reading carries.
 *
 * @param plantId - The plant the row reports on.
 * @returns The reference the row's amount and its bar carry.
 */
function plantRef(plantId: PlantId): string {
  return aggregateRef(`plant/${plantId}/revenue-at-risk`);
}

/**
 * The reference one day's count carries.
 *
 * @param kind - Which of the day's two readings the figure is.
 * @param date - The calendar date the count was taken over.
 * @returns The reference the point's mark and the table view's cell carry.
 */
function dayRef(kind: 'open' | 'resolved', date: IsoDate): string {
  return aggregateRef(`day/${date}/${kind}`);
}

/* ---------------------------------------------------------------------------------------------
 * Props and the narrowing this screen emits
 * ------------------------------------------------------------------------------------------- */

/**
 * What activating a figure on this screen asks the shell to do to the exception queue.
 *
 * AAP 0.12.4 fixes both gestures: a revenue bar narrows the queue to the plant it draws, and a date
 * on the opened/resolved series narrows it to that day. `src/types/service.ts` carries no narrowing
 * member on `ExceptionQuery`, so this screen's contract with the shell is declared here rather than
 * restated from the service vocabulary. The `date` member is exported although this screen cannot yet
 * emit it — see gap 3 — because the series' table view and the shell's own controls narrow by date.
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
 * The four tiles: one column on a narrow viewport, two from the first breakpoint, four once the page
 * is wide enough for one row. The tracks are equal fractions rather than content-sized, so a long
 * amount cannot push a neighbouring tile out of the row.
 */
const TILE_GRID_CLASSES = 'grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4';

/**
 * The two charts: stacked, then side by side where the page has the width for both.
 *
 * `items-start` keeps each card the height of its own figure rather than stretching the shorter one to
 * match its neighbour, so a two-row bar chart does not leave a card of empty surface beside a line
 * chart that fills its own.
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
 * The columns of the risk-by-plant table, and the same list the revenue bars' table view renders so
 * the two representations show identical columns over identical rows.
 *
 * The plant identifier and the amount go through `MonoValue`, so they are set in the tabular mono face
 * AAP 0.5.3 fixes, and each figure is wrapped in `EvidenceRef`, because a figure on this workspace
 * opens the record and formula behind it (rule P-6, principle PR-6). Every column is sortable: the
 * table's `onSort` and the chart's table view share one handler, so ordering either one orders both.
 */
const PLANT_COLUMNS: readonly TableColumn<PlantRiskRow>[] = [
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
    render: (row) => <EvidenceRef ref={plantRef(row.plantId)}>{row.openExceptions}</EvidenceRef>,
  },
  {
    id: 'revenueAtRiskEur',
    header: SCREEN_TEXT.columnRevenueAtRisk,
    sortable: true,
    align: 'end',
    render: (row) => (
      <EvidenceRef ref={plantRef(row.plantId)}>
        <MonoValue value={row.revenueAtRiskEur} kind="money" />
      </EvidenceRef>
    ),
  },
];

/**
 * The columns of the opened/resolved series' table view, drawn from the same points its marks draw.
 *
 * This list is the chart's table representation only: the screen itself renders the series as a chart,
 * and the frame's "View as table" swaps one for the other. Each count is wrapped in `EvidenceRef`, so a
 * reader takes the same figure from the table as from the mark.
 */
const SERIES_COLUMNS: readonly TableColumn<DailyCountPoint>[] = [
  {
    id: 'date',
    header: SCREEN_TEXT.columnDate,
    render: (point) => <MonoValue value={point.date} kind="timestamp" />,
  },
  {
    id: 'open',
    header: SCREEN_TEXT.columnOpened,
    align: 'end',
    render: (point) => <EvidenceRef ref={dayRef('open', point.date)}>{point.open}</EvidenceRef>,
  },
  {
    id: 'resolved',
    header: SCREEN_TEXT.columnResolved,
    align: 'end',
    render: (point) => <EvidenceRef ref={dayRef('resolved', point.date)}>{point.resolved}</EvidenceRef>,
  },
];

/* ---------------------------------------------------------------------------------------------
 * The screen's state, derived in one place from the query outcome and the payload
 * ------------------------------------------------------------------------------------------- */

/** What the state derivation reads: the query's settled facts and the payload, if it arrived. */
interface ScreenStateInput {
  /** Whether the read is pending. */
  readonly isPending: boolean;

  /** The rejection the read ended in, when it did. */
  readonly error: unknown;

  /** The payload the read resolved to, when it did. */
  readonly result: Result<Overview> | undefined;
}

/**
 * Whether a value is the service's own typed failure.
 *
 * A service call fails by throwing its `Problem` (contracts §2) and the query cache hands that same
 * value back as an `unknown` error, so its three required members are checked before the value is
 * treated as one. A rejection in another shape is a defect in the read rather than a refusal, and the
 * boundary says so without printing a member of a failure nobody raised.
 *
 * @param error - The value the read rejected with.
 * @returns Whether the value is a `Problem`.
 */
function isProblem(error: unknown): error is Problem {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if (!('type' in error) || !('message' in error) || !('traceId' in error)) {
    return false;
  }

  const { type, message, traceId } = error;

  return typeof type === 'string' && typeof message === 'string' && typeof traceId === 'string';
}

/**
 * Whether a source in the read's freshness report answered in the state asked about.
 *
 * `Result.meta.freshness` is the adapter's own account of what each of the six sources did, so the
 * states are read from that report rather than inferred from a figure (AAP 0.2.1).
 *
 * @param freshness - The read's freshness report.
 * @param state - The state to look for.
 * @returns Whether a source reported it.
 */
function reportsState(freshness: readonly Freshness[], state: FreshnessState): boolean {
  return freshness.some((entry) => entry.state === state);
}

/**
 * The source behind a stale overview, with the display name to print and the instant it last answered.
 *
 * The order book is looked for first, because ERP is the source that gates the approval the planner
 * takes next (AAP 0.2.1, T-13), and another stale source is reported when the order book is current.
 * The label comes from `SOURCE_LABELS`, the map that owns the six display names, so the banner and the
 * top bar's pill say the same words about the same source.
 *
 * @param freshness - The read's freshness report.
 * @returns The record the banner names, or `undefined` when no source is stale.
 */
function staleSourceOf(freshness: readonly Freshness[]): StateBoundaryStale | undefined {
  const orderBook = freshness.find(
    (entry) => entry.source === APPROVAL_GATE_SOURCE && entry.state === 'stale',
  );
  const stale =
    orderBook ?? freshness.find((entry) => entry.state === 'stale');

  if (stale === undefined) {
    return undefined;
  }

  return {
    source: stale.source,
    label: SOURCE_LABELS[stale.source],
    asOf: stale.asOf,
  };
}

/**
 * The denial the forbidden card explains, or `undefined` when the read was refused for another reason.
 *
 * The card's evidence is the failure's own: the permission the acting role lacks, the roles that hold
 * it and the trace identifier of the refused call. A refusal that named no permission supplies no card
 * rather than one naming a permission nobody was refused for.
 *
 * @param error - The value the read rejected with.
 * @returns The denial, or `undefined`.
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
 * Whether the payload holds nothing to report at all.
 *
 * An empty scope is one where no exception is open, no plant carries a risk row and no record changed:
 * the tiles are then the identity the aggregate reports for an empty population, and the two charts
 * and the table have no row to draw. Recognising that here is what lets the boundary show the empty
 * state instead of three blank surfaces.
 *
 * @param overview - The payload the read resolved to.
 * @returns Whether there is nothing to show.
 */
function hasNothingToShow(overview: Overview): boolean {
  return (
    overview.openExceptions === EMPTY_COUNT &&
    overview.byPlant.length === 0 &&
    overview.changedSinceLastVisit.length === 0
  );
}

/**
 * The state this screen's records are in, or `undefined` when no exceptional state holds.
 *
 * The `switch` order is the state precedence: a refusal is reported before a failure, a failure before
 * the pending read, and the sources' own reports before the payload's emptiness. `ScreenState` carries
 * exactly specification §8's seven members and no healthy member, so a current and complete read
 * returns `undefined`, which `StateBoundary` renders as its content alone (rule B-3, AAP 0.12.4).
 *
 * @param input - The query's settled facts and the payload.
 * @returns The state to render, or `undefined` for no exceptional state.
 */
function deriveScreenState({ isPending, error, result }: ScreenStateInput): ScreenState | undefined {
  if (isProblem(error)) {
    return error.type === 'permission'
      ? 'forbidden'
      : error.type === 'validation'
        ? 'conflict'
        : 'offline';
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

  if (staleSourceOf(freshness) !== undefined) {
    return 'stale';
  }

  if (reportsState(freshness, 'partial')) {
    return 'partial';
  }

  return hasNothingToShow(result.data) ? 'empty' : undefined;
}


/* ---------------------------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------------------------- */

/**
 * SCR-01 Overview: the four computed tiles, what changed since the last visit, the risk-by-plant
 * table, the revenue-at-risk bars and the opened/resolved series.
 *
 * One read, through the port: `getOverview`, keyed by the method's own name and the scope it was made
 * with (AAP 0.6.2), so a scope change re-reads the overview and a write that invalidates `getOverview`
 * reaches this entry. The settled facts decide the screen's state in one place
 * ({@link deriveScreenState}), and the boundary owns how that state looks. Nothing here writes: the
 * only state the component owns is what the reader chose — the table's ordering and the bar they last
 * activated — so a re-render can never move a record.
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
   */
  const overviewQuery = useQuery<Result<Overview>, unknown>({
    queryKey: ['getOverview', scope],
    queryFn: () => service.getOverview(scope),
    retry: false,
  });

  const result = overviewQuery.data;
  const overview = result?.data;

  const state = deriveScreenState({
    isPending: overviewQuery.isPending,
    error: overviewQuery.error,
    result,
  });
  const staleRecord = result === undefined ? undefined : staleSourceOf(result.meta.freshness);
  const forbiddenRecord = forbiddenOf(overviewQuery.error);

  const byPlant = overview?.byPlant ?? NO_ROWS;
  const changed = overview?.changedSinceLastVisit ?? NO_ITEMS;
  const series = overview?.openResolvedSeries ?? NO_POINTS;

  const orderedByPlant = useMemo(() => orderPlantRows(byPlant, sort), [byPlant, sort]);

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
        evidenceRef: plantRef(row.plantId),
        simLabel: CALCULATION_LABEL,
      })),
    [byPlant],
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
        evidenceRef: dayRef('open', point.date),
      })),
    [series],
  );

  const resolvedPoints = useMemo<readonly LinePoint[]>(
    () =>
      series.map((point) => ({
        x: point.date,
        y: point.resolved,
        yLabel: String(point.resolved),
        evidenceRef: dayRef('resolved', point.date),
      })),
    [series],
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
    columns: PLANT_COLUMNS,
    rows: orderedByPlant,
    getRowKey: (row) => row.plantId,
    sort,
    onSort: (columnId) => {
      handleSort(columnId);
    },
  };

  const seriesTable: ChartTableSpec<DailyCountPoint> = {
    caption: SCREEN_TEXT.seriesChartCaption,
    columns: SERIES_COLUMNS,
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
   * One gesture, two effects, as AAP 0.12.4's SCR-01 row fixes them: the mark opens its own evidence
   * (the chart owns that half) and the shell is asked to narrow the queue to the plant the bar draws.
   * The selection is held here only so the chart can mark the bar the reader chose.
   */
  function narrowToPlant(plantId: string): void {
    setSelectedPlantId(plantId);
    onNarrowQueue?.({ kind: 'plant', plantId });
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
              void navigate(EXCEPTIONS_ROUTE);
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
                evidenceRef={TILE_REFS.openExceptions}
                simLabel={CALCULATION_LABEL}
              />
              <MetricTile
                label={SCREEN_TEXT.tileRevenueAtRisk}
                value={overview.revenueAtRiskEur}
                kind="money"
                evidenceRef={TILE_REFS.revenueAtRisk}
                simLabel={CALCULATION_LABEL}
              />
              <MetricTile
                label={SCREEN_TEXT.tileCustomerOrdersAtRisk}
                value={overview.customerOrdersAtRisk}
                evidenceRef={TILE_REFS.customerOrdersAtRisk}
                simLabel={CALCULATION_LABEL}
              />
              <MetricTile
                label={SCREEN_TEXT.tileMedianHours}
                value={overview.medianHoursToApprovedPlan}
                evidenceRef={TILE_REFS.medianHoursToApprovedPlan}
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
                columns={PLANT_COLUMNS}
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

