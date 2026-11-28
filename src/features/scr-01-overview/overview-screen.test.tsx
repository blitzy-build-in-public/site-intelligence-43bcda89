/**
 * Component suite for `overview-screen.tsx`, the SCR-01 overview a planner lands on.
 *
 * WHAT IT PROVES. Each case states a contract the screen is relied on for rather than a description
 * of its markup: that `getOverview` is read once through the port with the shell's scope and nothing
 * else is written; that each of the four tiles carries the exact specification §5.3 label for a
 * computed figure on the tile itself — and that the risk-by-plant and changed-since cards carry it
 * over their rows — asserted inside each of them so the shell's page-level badge could not satisfy it
 * (AAP 0.10, rule P-1); that a tile's figure opens the evidence behind it; that a revenue bar
 * reports the plant it draws to the shell once and opens no dialog — the gesture narrows the queue and
 * takes the reader there (rule P-8, AAP 0.12.4); that the opened and resolved series draws one mark per
 * delivered day, that a mark narrows the queue to the day it draws and opens nothing, and that the
 * series' table view narrows the queue to the day its row's date control states, activated from the
 * keyboard (AAP §0.12.4, principle PR-6); that both charts swap to
 * a table whose cells are the values the chart drew, in both directions and from the keyboard (success
 * criterion 9, rule B-3); that the changed-since list and the risk-by-plant table render every record
 * they were handed, with the amounts set through the one money formatter in the mono face (AAP
 * §0.5.3); that each of the seven states specification §8 fixes renders for the outcome the screen maps
 * it to; that both themes render the same figures; and that the primary action is reached with `Tab`,
 * shows its focus ring and opens the exception queue on `Enter` (`T-16`).
 *
 * WHY THE NARROWING IS ON THE MARKS AND ON THE TABLE'S DATE CELL. AAP §0.12.4 gives the bars and the
 * days the queue-filtering job, so activating either narrows the queue and the reader follows the
 * gesture to it; the same days are reachable from the series' table view, whose date cell narrows to
 * the day it prints. Both halves are asserted, so a change that moved the narrowing off a mark — or
 * that put a drawer back on it — would fail here rather than pass silently. Every figure keeps its
 * evidence in the charts' "View as table" grids, which is where those cases read it.
 *
 * WHERE THE DATA COMES FROM. The service is mocked at `service-provider.tsx`, the one boundary a
 * screen may read through (rule P-2), so no seed module, adapter or domain module is involved and
 * the suite observes exactly the calls the screen makes. Everything else — `MetricTile`, `Card`,
 * `ChartFrame`, `DataTable`, `StateBoundary`, `EvidenceRef`, `MonoValue`, `ActionButton` and the two
 * SVG surfaces — is the real component, because what a reader receives is the thing under test.
 *
 * THE FIXTURE IS INPUT, NOT AN EXPECTED RESULT (rule P-6). Every value below is data handed to the
 * mocked read, so the screen is free to place it and a case can only pass by finding what the screen
 * actually rendered. Nothing is imported from `tests/fixtures/` or `src/seed`, and the file is
 * written to stay clear of the figures scan that covers `src/features/**`: identifiers are opaque
 * placeholders (`plant-alpha`, `record-beta`) rather than domain-identifier shapes, the series'
 * dates are derived from the imported demonstration clock instead of written out, and every amount
 * is asserted through the imported `formatMoney` rather than as a typed currency string, while the
 * median tile's unrounded duration is asserted through the imported `formatMeasuredHours`. The
 * wording is a different matter: `SCREEN_TEXT` is module-private in the screen, so the captions this
 * suite drives by name are restated once in {@link UI} below — the device `audit-screen.test.tsx`
 * uses for the same reason — while every string an input or a sibling component owns (the §5.3
 * labels, the boundary's sentences, the toggle's two labels, the drawer's heading, the source names)
 * is imported and never retyped.
 *
 * WHERE THE SUITE MUST STATE A STRING ITSELF. `overview-screen.tsx` exports no `SCREEN_TEXT`, so
 * {@link UI} states the screen's visible wording once, and a reworded caption reaches exactly one
 * place here.
 *
 * WHERE THE CASE'S EVIDENCE REFERENCES COME FROM. `Overview` carries no evidence reference for its
 * tiles, rows or points, so the screen composes `overview:<key>` references of its own. A case
 * therefore asserts that a reference reaches the drawer, not that a record answers one: resolving an
 * aggregate reference is the adapter's work — covered through the port in
 * `src/services/mock/mock-backend.test.ts` — and the mock here answers every reference with the same
 * evidence.
 *
 * WHAT THE SERIES' TABLE VIEW IS FOR. Its date cell narrows the queue to the day the row carries — the
 * same narrowing the chart's own mark performs (AAP §0.12.4) — so a reader who has switched to the table
 * takes it from the row they are reading. The row's two counts open the evidence behind them, which is
 * also how a mark's figure keeps its evidence reachable: the grid renders it, not a dialog of its own.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock, touches the network or reaches outside the service boundary.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EVIDENCE_DRAWER_TEXT } from '../../components/evidence-drawer';
import { MONO_VALUE_CLASSES, formatMeasuredHours, formatMoney } from '../../components/mono-value';
import { STATE_BOUNDARY_TEXT } from '../../components/state-boundary';
import { CONTROL_STRUCTURE_CLASSES } from '../../components/tooltip';
import { VIEW_AS_TABLE_LABELS } from '../../components/view-as-table-toggle';
import {
  APPROVAL_GATE_SOURCE,
  DEMO_CLOCK,
  SIM_LABELS,
  SOURCE_IDS,
  SOURCE_LABELS,
} from '../../types';
import type {
  ChangedSinceLastVisitItem,
  DailyCountPoint,
  Evidence,
  Freshness,
  FreshnessState,
  IsoDate,
  Overview,
  Permission,
  PlantId,
  PlantRiskRow,
  Problem,
  Result,
  Role,
  Scope,
  SimLabel,
  SourceId,
} from '../../types';
import { OverviewScreen } from './overview-screen';
import type { OverviewNarrowing } from './overview-screen';

/* ---------------------------------------------------------------------------------------------
 * The wording this suite drives, and why it is restated here
 * ------------------------------------------------------------------------------------------- */

/**
 * The screen's own visible wording, stated once.
 *
 * None of these is a specification string: the seven §5.3 labels, the boundary's sentences, the
 * toggle's labels and the drawer's heading all belong to the modules that export them and are
 * imported instead. The one caption this object takes from a private component constant is the
 * forbidden card's heading prefix, which `forbidden-card.tsx` does not export either.
 */
const UI = {
  /** The screen's title, in the one level-one heading it renders. */
  title: 'Overview',

  /** The eyebrow above the title. */
  eyebrow: 'Site Intelligence',

  /** The one action this screen exists to take. */
  primaryAction: 'Review critical exceptions',

  /** The tiles' four captions, in the order the screen lays them out. */
  tileOpenExceptions: 'Open exceptions',
  tileRevenueAtRisk: 'Revenue at risk',
  tileCustomerOrdersAtRisk: 'Customer orders at risk',
  tileMedianHours: 'Median hours to approved plan',

  /** The changed-since group, what its figure label refers to, and what it says when nothing moved. */
  changedSinceTitle: 'Changed since your last visit',
  changedSinceNote: 'Every entry beneath is a computed reading of what moved.',
  changedSinceEmpty: 'No record has changed since your last visit.',

  /** The risk-by-plant group, what its figure label refers to, and its table's accessible name. */
  byPlantTitle: 'Risk by plant',
  byPlantLabelNote: 'Every count and amount beneath is a computed figure.',
  byPlantCaption: 'Open exceptions and revenue at risk, by plant',

  /** The attribution rule the screen prints above the risk-by-plant rows. */
  byPlantNote: 'Each exception is counted at the plant it is recorded at.',

  /** The risk-by-plant table's four column headers. */
  columnPlant: 'Plant',
  columnPlantName: 'Name',
  /** The third header is shortened for the phone-width table; the caption states the full phrase. */
  columnOpenExceptions: 'Open',
  columnRevenueAtRisk: 'Revenue at risk',

  /** The revenue bars: the frame title and the axis the surface is named by. */
  revenueChartTitle: 'Revenue at risk by plant',
  revenueChartCaption: 'Revenue at risk by plant, as a table',

  /** The sentence the revenue figure states about the scale its bars are read against. */
  revenueChartDescription:
    'One bar per plant, every bar scaled against the same maximum revenue at risk and printed at the end of its row in EUR, with the axis beneath the bars stating that maximum.',

  /** The series: the frame title and the two series names its marks are announced with. */
  seriesChartTitle: 'Exceptions opened and resolved per day',
  seriesChartCaption: 'Exceptions opened and resolved per day, as a table',
  seriesOpened: 'Opened',
  seriesResolved: 'Resolved',

  /** The series table's three column headers. */
  columnDate: 'Date',
  columnOpened: 'Opened',
  columnResolved: 'Resolved',

  /** What the series table's date control does, stated ahead of the day the row carries. */
  narrowToDay: 'Narrow the queue to ',

  /**
   * The four sentences the screen supplies to the boundary: the two empty ones — the filter wording a
   * narrowed read gets and the trigger-neutral wording a read nothing narrowed gets — and the partial
   * and moved ones.
   */
  empty: 'No exception matches the current filters, so there is nothing to summarise.',
  emptyUnnarrowed: 'There is nothing to summarise.',
  partial:
    'A source behind these figures answered incompletely, so the readings cover the inputs it supplied.',
  conflict: 'These figures were read against records that have since changed. Read the overview again.',

  /** The prefix `forbidden-card.tsx` puts before the permission it names, which it does not export. */
  permissionRequiredPrefix: 'Permission required: ',

  /** The heading the probe route renders, so a navigation is asserted through the visible interface. */
  queueProbe: 'Exception queue',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The fixture: input data for the mocked read, and nothing an aggregate would report
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every result and every failure of these fixtures carries. */
const TRACE_ID = 'trace-overview';

/** The instant the six sources last answered: the demonstration clock's own instant, never typed. */
const AS_OF = DEMO_CLOCK;

/**
 * The label a computed figure carries, read from the tuple that owns the seven fixed strings so
 * this suite can never assert a label the interface does not carry (rule P-1).
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/** One day, in milliseconds, for deriving a series' dates from the demonstration clock. */
const DAY_MS = 86_400_000;

/**
 * The calendar date a given number of days from the demonstration clock's instant, as `YYYY-MM-DD`.
 *
 * Derived rather than written out, so the fixture holds no typed date and a change of the
 * demonstration clock reaches every point of the series at once.
 */
function isoDateAt(offsetDays: number): IsoDate {
  return new Date(Date.parse(DEMO_CLOCK) + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/** One plant of the risk-by-plant rows, before the row shape is built from it. */
interface PlantSpec {
  /** The plant's identifier: an opaque placeholder, not a record-identifier shape. */
  readonly id: PlantId;

  /** The plant's display name, as the record would state it. */
  readonly name: string;

  /** How many exceptions at that plant are still open. */
  readonly open: number;

  /** The revenue those exceptions place at risk, as the aggregate would compute it. */
  readonly revenue: number;
}

/** Three plants, so an ordering and a per-row assertion have more than one row to tell apart. */
const PLANTS: readonly PlantSpec[] = [
  { id: 'plant-alpha', name: 'Alpha plant', open: 3, revenue: 1250.5 },
  { id: 'plant-beta', name: 'Beta plant', open: 2, revenue: 840.25 },
  { id: 'plant-gamma', name: 'Gamma plant', open: 1, revenue: 400 },
];

/** The by-plant rows the read returns, built from {@link PLANTS} so both read one set of values. */
const BY_PLANT: readonly PlantRiskRow[] = PLANTS.map((plant) => ({
  plantId: plant.id,
  plantName: plant.name,
  openExceptions: plant.open,
  revenueAtRiskEur: plant.revenue,
}));

/** Two records that moved since the last visit, each with the record's own account of the change. */
const CHANGED: readonly ChangedSinceLastVisitItem[] = [
  { ref: 'record-alpha', label: 'Record alpha', detail: 'the record says what changed about it' },
  {
    ref: 'record-beta',
    label: 'Record beta',
    detail: 'the second record states its own change',
  },
];

/** Three days of the opened/resolved series, the dates derived from the demonstration clock. */
const SERIES: readonly DailyCountPoint[] = [
  { date: isoDateAt(-2), open: 1, resolved: 0 },
  { date: isoDateAt(-1), open: 2, resolved: 1 },
  { date: isoDateAt(0), open: 3, resolved: 2 },
];

/**
 * The payload a healthy read resolves to: the four tiles, the changed list, the by-plant rows and
 * the series, every number a slot the aggregate would fill rather than a result this suite asserts.
 */
const OVERVIEW: Overview = {
  openExceptions: 6,
  revenueAtRiskEur: 2490.75,
  customerOrdersAtRisk: 4,
  medianHoursToApprovedPlan: 18.5,
  alternateSourceReadinessPercent: 75,
  changedSinceLastVisit: [...CHANGED],
  byPlant: [...BY_PLANT],
  openResolvedSeries: [...SERIES],
};

/** A scope holding nothing: the identity the aggregate reports for an empty population. */
const EMPTY_OVERVIEW: Overview = {
  openExceptions: 0,
  revenueAtRiskEur: 0,
  customerOrdersAtRisk: 0,
  medianHoursToApprovedPlan: 0,
  alternateSourceReadinessPercent: 0,
  changedSinceLastVisit: [],
  byPlant: [],
  openResolvedSeries: [],
};

/** The same payload with the by-plant rows but nothing moved since the last visit. */
const UNCHANGED_OVERVIEW: Overview = { ...OVERVIEW, changedSinceLastVisit: [] };

/**
 * An empty population the aggregate still lists a plant row for.
 *
 * `computeOverview` answers one row per plant in the resolved scope whether or not that plant has risk,
 * so a scope with nothing in it arrives as rows reading zero rather than as no rows at all — which is
 * the payload the simulation popover's `empty` trigger produces and the case the screen's emptiness
 * reading has to recognise.
 */
const EMPTIED_OVERVIEW: Overview = {
  ...EMPTY_OVERVIEW,
  byPlant: BY_PLANT.map((row) => ({ ...row, openExceptions: 0, revenueAtRiskEur: 0 })),
};

/** The scope the shell hands the screen: the unfiltered "all plants, all products" selection. */
const SCOPE: Scope = { plants: [], products: [] };

/** The six sources all answering and current, as `Meta.freshness` reports them. */
const FRESH_SOURCES: Freshness[] = SOURCE_IDS.map(
  (source): Freshness => ({ source, asOf: AS_OF, state: 'fresh' }),
);

/**
 * The same report with one source in the state asked about.
 *
 * The approval gate is the default because it is the source the screen's stale banner looks for
 * first (AAP §0.2.1, `T-13`), so a case can put another source in that state and prove the banner
 * still names one.
 */
function freshnessWith(state: FreshnessState, source: SourceId = APPROVAL_GATE_SOURCE): Freshness[] {
  return FRESH_SOURCES.map((entry) => (entry.source === source ? { ...entry, state } : entry));
}

/** The envelope every read resolves to: the payload and the metadata that qualifies it. */
function envelope(data: Overview, freshness: readonly Freshness[] = FRESH_SOURCES): Result<Overview> {
  return { data, meta: { freshness: [...freshness], simulated: true, traceId: TRACE_ID } };
}

/** The permission the refused read names, from the contracts §7.1 vocabulary. */
const REQUIRED_PERMISSION: Permission = 'exception.read';

/** The roles that hold it, so the forbidden card can name who may act instead of only what is missing. */
const ROLES_WITH_PERMISSION: Role[] = ['material-planner', 'head-of-supply-chain'];

/** The refusal a persona without `exception.read` meets. */
const DENIAL: Problem = {
  type: 'permission',
  message: 'Reading the overview needs a permission the acting persona does not hold.',
  traceId: TRACE_ID,
  requiredPermission: REQUIRED_PERMISSION,
  rolesWithPermission: ROLES_WITH_PERMISSION,
};

/**
 * A refusal the screen reports as the offline state: a rule suppressed the answer, so nothing stands
 * behind the figures. A `'not-found'` refusal is the unified `'empty'` on every screen, and
 * `src/components/screen-state.test.ts` proves that mapping once for all of them.
 */
const FAILURE: Problem = {
  type: 'policy',
  message: 'The overview could not be read.',
  traceId: TRACE_ID,
};

/** The refusal a record that moved under the reader produces, which the screen shows as a conflict. */
const MOVED_RECORD: Problem = {
  type: 'validation',
  message: 'The overview was read against records that changed while the view was open.',
  traceId: TRACE_ID,
};

/** A record the drawer can render in full, so an opened dialog shows content rather than a failure. */
const EVIDENCE: Evidence = {
  value: 'the figure this reference answers',
  provenance: 'computed',
  label: CALCULATION_LABEL,
  formula: 'one record over another, by the rule that owns the figure',
  inputs: ['input-alpha'],
  upstream: ['upstream-alpha'],
  downstream: ['downstream-alpha'],
  confidence: { level: 'high', reason: 'every input was read in full' },
  missingInputs: [],
  documents: [],
};

/** The response the evidence read resolves to, carrying the metadata every call returns. */
function evidenceEnvelope(): Result<Evidence> {
  return { data: EVIDENCE, meta: { freshness: [...FRESH_SOURCES], simulated: true, traceId: TRACE_ID } };
}

/**
 * The four tiles, each with the caption the reader sees and the figure the payload carries for it.
 *
 * The amount and the duration go through the imported formatters because those are the text the tiles
 * print: a typed currency string or a typed hour count here would be this suite's own formatting rule
 * rather than the interface's (rule P-6).
 */
const TILE_CASES = [
  { caption: UI.tileOpenExceptions, figure: String(OVERVIEW.openExceptions) },
  { caption: UI.tileRevenueAtRisk, figure: formatMoney(OVERVIEW.revenueAtRiskEur) },
  { caption: UI.tileCustomerOrdersAtRisk, figure: String(OVERVIEW.customerOrdersAtRisk) },
  { caption: UI.tileMedianHours, figure: formatMeasuredHours(OVERVIEW.medianHoursToApprovedPlan) },
] as const;

/**
 * The two inputs a chart mark answers to, one case each so both are held to the same assertions.
 *
 * A reader may take a revenue bar with a pointer or reach it with `Tab` and press `Enter`, and the mark
 * reports the plant it draws either way: the two inputs must produce one behaviour, so a mark whose
 * pointer path and keyboard path diverged would fail the case for its own input rather than pass
 * because only the keyboard was ever exercised.
 */
const MARK_ACTIVATIONS = [
  /** The finding's own reproduction: a left click on the bar, with nothing focused beforehand. */
  { input: 'a pointer click', modality: 'pointer' },
  /** The keyboard path: `Tab` leaves the mark focused and `Enter` activates it. */
  { input: 'Enter on the focused mark', modality: 'keyboard' },
] as const;

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/** The route the screen is mounted at, and the one its primary action reaches. */
const OVERVIEW_ROUTE = '/overview';
const EXCEPTIONS_ROUTE = '/exceptions';

/**
 * The focus-ring utilities the shared control structure names, taken from it rather than retyped.
 *
 * Rule B-3 requires a visible focus indicator, and jsdom paints nothing, so the class list the
 * control carries is what a case can observe. Reading the tokens from the exported list keeps the
 * assertion tied to the one owner of that structure: a renamed utility moves both together.
 */
const FOCUS_RING_CLASSES = CONTROL_STRUCTURE_CLASSES.split(' ').filter((token) =>
  token.startsWith('focus-visible:'),
);

/* ---------------------------------------------------------------------------------------------
 * The service boundary — mocked at the provider, never at the network
 * ------------------------------------------------------------------------------------------- */

/**
 * The port members this suite observes.
 *
 * The two the screen reads are first: `getOverview` for the page and `getEvidence` for whichever
 * figure's drawer is opened. The members beside them are reads and writes of the same port the
 * screen must leave alone, so "the overview is a read" is asserted rather than assumed — the object
 * is enumerable and {@link calledMembers} reports exactly which of it was touched.
 */
const mockService = vi.hoisted(() => ({
  getOverview: vi.fn(),
  getEvidence: vi.fn(),
  listExceptions: vi.fn(),
  requestApproval: vi.fn(),
}));

/**
 * The provider replaced before the screen is imported, so the real binding — and with it the
 * in-browser adapter — is never reached from a component test (rule P-2).
 *
 * Every hook the rendered tree could reach is exported, not only the one the screen calls:
 * `evidence-drawer.tsx` reads `useService()`, and the two siblings are stubbed with the module's own
 * "no demonstration capability, no session persona" values so a component that starts reading them
 * finds a shape rather than `undefined`.
 */
vi.mock('../../services/service-provider', () => ({
  useService: () => mockService,
  useDemonstration: () => null,
  useActiveUser: () => null,
}));

/** Every port member this suite observed a call on, in the order the object declares them. */
function calledMembers(): readonly string[] {
  return Object.entries(mockService)
    .filter(([, member]) => member.mock.calls.length > 0)
    .map(([name]) => name);
}

/* ---------------------------------------------------------------------------------------------
 * The harness and the readings it takes
 * ------------------------------------------------------------------------------------------- */

/** Props a case varies on the screen it mounts. */
interface ScreenOptions {
  /** What the shell does when a figure narrows the queue. Absent, the screen takes no handler. */
  readonly onNarrowQueue?: (narrowing: OverviewNarrowing) => void;

  /** The shell's selection. Absent, the screen is handed the empty "all plants and products" scope. */
  readonly scope?: Scope;
}

/**
 * Renders the screen as the shell mounts it: at its own route, inside a cache of its own, with the
 * exception queue mounted beside it as the probe the primary action navigates to.
 *
 * The cache is fresh per render and its retries are off, so a refusal fails the same way however
 * often it is repeated and one case cannot read another's cached payload. The probe route is what
 * lets the primary action be asserted through the visible interface: the case presses `Enter` and
 * finds the heading a reader would arrive at, rather than inspecting a router's internals.
 */
function renderScreen(options: ScreenOptions = {}): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const screenElement = (
    <OverviewScreen
      scope={options.scope ?? SCOPE}
      {...(options.onNarrowQueue === undefined
        ? {}
        : { onNarrowQueue: options.onNarrowQueue })}
    />
  );

  render(
    <MemoryRouter initialEntries={[OVERVIEW_ROUTE]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path={OVERVIEW_ROUTE} element={screenElement} />
          <Route path={EXCEPTIONS_ROUTE} element={<h1>{UI.queueProbe}</h1>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/**
 * The item at a position, or a failure naming what was missing.
 *
 * `noUncheckedIndexedAccess` makes every indexed read a possible absence, and a case that reached
 * for a missing row would otherwise compare against `undefined` and report the wrong thing.
 */
function at<T>(items: readonly T[], index: number, what: string): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`the ${what} at position ${String(index)} is missing`);
  }

  return item;
}

/** Collapses a string's runs of whitespace, so the formatter's no-break space compares as a space. */
function collapse(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

/** Escapes a string so it can be compared as a pattern rather than as a pattern's syntax. */
function escapePattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * A pattern matching the given text with any run of whitespace between its words.
 *
 * The money formatter separates the amount from the currency code with a no-break space, so a
 * regex built from the collapsed text would otherwise miss a figure it was meant to find. The
 * pattern also keeps an assertion readable in a failure: it says which figure it looked for.
 */
function patternOf(text: string): RegExp {
  return new RegExp(
    collapse(text)
      .split(' ')
      .map((word) => escapePattern(word))
      .join('\\s+'),
    'u',
  );
}

/** Every string an element's subtree holds, with its whitespace collapsed. */
function collapsedTextOf(element: HTMLElement): string {
  return collapse(element.textContent ?? '');
}

/** The tile carrying the given caption, which is the card's heading and the region's name. */
function tileRegion(caption: string): HTMLElement {
  return screen.getByRole('region', { name: caption });
}

/** The tile carrying the given caption, once the read has resolved it onto the screen. */
async function settledTile(caption: string): Promise<HTMLElement> {
  return screen.findByRole('region', { name: caption });
}

/** The "View as table" control of the chart with the given title. */
function tableToggle(chartTitle: string): HTMLElement {
  return screen.getByRole('button', {
    name: `${VIEW_AS_TABLE_LABELS.showTable}: ${chartTitle}`,
  });
}

/** The "View as chart" control of the chart with the given title, once its table view is up. */
function chartToggle(chartTitle: string): HTMLElement {
  return screen.getByRole('button', {
    name: `${VIEW_AS_TABLE_LABELS.showChart}: ${chartTitle}`,
  });
}

/** A pattern matching any revenue bar's accessible name, whichever plant it draws. */
const BAR_NAME_PATTERN = new RegExp(
  `^(?:${PLANTS.map((plant) => escapePattern(plant.name)).join('|')}):`,
  'u',
);

/** Every revenue bar on the screen, in the order the chart draws them. */
function barMarks(): readonly HTMLElement[] {
  return screen.queryAllByRole('button', { name: BAR_NAME_PATTERN });
}

/** The bar drawing the given plant, located by the name it is announced with. */
function barMark(plant: PlantSpec): HTMLElement {
  return screen.getByRole('button', { name: patternOf(`${plant.name}:`) });
}

/** The marks of one series of the opened/resolved chart, in the order the series states them. */
function seriesMarks(seriesLabel: string): readonly HTMLElement[] {
  return screen.queryAllByRole('button', {
    name: new RegExp(`^${escapePattern(seriesLabel)}, `, 'u'),
  });
}

/** The rows of a table, in document order, with its header row left out. */
function dataRowsOf(table: HTMLElement): readonly HTMLElement[] {
  return within(table).getAllByRole('row').slice(1);
}

/** One row's cells, in column order. */
function cellsOf(row: HTMLElement): readonly HTMLElement[] {
  return within(row).getAllByRole('cell');
}

/* ---------------------------------------------------------------------------------------------
 * Per-case state
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  for (const member of Object.values(mockService)) {
    member.mockReset();
  }

  mockService.getOverview.mockResolvedValue(envelope(OVERVIEW));
  mockService.getEvidence.mockResolvedValue(evidenceEnvelope());
});

/** Leaves `<html>` on the theme of whichever suite runs next, and no case's attribute behind. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('OverviewScreen', () => {
  it('reads the overview once through the port with the shell’s scope, and writes nothing', async () => {
    renderScreen();

    expect(await screen.findByRole('heading', { level: 1, name: UI.title })).toBeVisible();
    expect(screen.getByText(UI.eyebrow)).toBeVisible();

    for (const tile of TILE_CASES) {
      expect(await settledTile(tile.caption)).toBeVisible();
    }

    expect(mockService.getOverview).toHaveBeenCalledTimes(1);
    expect(mockService.getOverview).toHaveBeenCalledWith(SCOPE);
    // A read is a read: no other member of the port was reached (rule P-2).
    expect(calledMembers()).toEqual(['getOverview']);
  });

  it.each(TILE_CASES)(
    'labels the “$caption” tile on the tile itself with the fixed string for a computed figure',
    async ({ caption, figure }) => {
      renderScreen();

      const tile = await settledTile(caption);

      // The label is read inside this one tile, so the shell's page-level badge could not satisfy it
      // and neither could a sibling tile's label (rule P-1).
      expect(within(tile).getAllByText(CALCULATION_LABEL)).toHaveLength(1);
      expect(within(tile).getByRole('heading', { level: 2, name: caption })).toBeVisible();

      // The figure sits inside the tile's one control, whose accessible name starts with what a
      // reader sees there (WCAG 2.2 SC 2.5.3).
      const trigger = within(tile).getByRole('button');
      expect(trigger).toHaveTextContent(patternOf(figure));
      expect(trigger).toHaveAccessibleName(patternOf(figure));
      expect(within(tile).getAllByRole('button')).toHaveLength(1);
    },
  );

  it('opens the evidence behind a tile’s figure from that figure’s own trigger', async () => {
    const user = userEvent.setup();

    renderScreen();

    const tile = await settledTile(UI.tileRevenueAtRisk);
    await user.click(within(tile).getByRole('button'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(EVIDENCE_DRAWER_TEXT.title);
    expect(mockService.getEvidence).toHaveBeenCalledTimes(1);

    // The drawer prints the reference the tile carries, so the figure a reader opened is the one
    // the read was asked about rather than any figure on the page.
    const reference = mockService.getEvidence.mock.calls[0]?.[0];
    expect(typeof reference).toBe('string');
    expect(dialog).toHaveTextContent(String(reference));
  });

  it('names the aggregate and the shell selection in the reference a tile opens', async () => {
    const user = userEvent.setup();
    const plant = at(PLANTS, 0, 'plant');
    const product = 'product-alpha';

    renderScreen({ scope: { plants: [plant.id], products: [product] } });

    const tile = await settledTile(UI.tileRevenueAtRisk);
    await user.click(within(tile).getByRole('button'));
    await screen.findByRole('dialog');

    const reference = String(mockService.getEvidence.mock.calls[0]?.[0]);

    // The reference names the aggregate the tile reports and the shell selection the figure was read
    // under, so the evidence read resolves that same figure over those same filters rather than the
    // whole scope's (AAP 0.2.1 F12, the one scope resolver).
    expect(reference.startsWith('overview:revenue-at-risk')).toBe(true);
    expect(reference).toContain(`plants=${plant.id}`);
    expect(reference).toContain(`products=${product}`);
  });

  it.each(MARK_ACTIVATIONS)(
    'reports the plant a revenue bar draws, once, and opens no dialog, when activated by $input',
    async ({ modality }) => {
      const user = userEvent.setup();
      const onNarrowQueue = vi.fn<(narrowing: OverviewNarrowing) => void>();

      renderScreen({ onNarrowQueue });
      await settledTile(UI.tileOpenExceptions);

      const plant = at(PLANTS, 1, 'plant');
      const bar = barMark(plant);

      expect(barMarks()).toHaveLength(PLANTS.length);
      expect(bar).toHaveAttribute('tabindex', '0');

      // Each bar names its own figure and the exact §5.3 label that figure carries (rule P-1), and
      // declares no dialog: the gesture narrows the queue and takes the reader there instead (AAP
      // 0.12.4, rule P-8).
      for (const mark of barMarks()) {
        expect(mark).not.toHaveAttribute('aria-haspopup');
        expect(mark.getAttribute('aria-label')).toContain(`(${CALCULATION_LABEL})`);
      }

      if (modality === 'pointer') {
        /* Nothing has focused the mark: a pointer click has to stand on its own. */
        await user.click(bar);
      } else {
        bar.focus();
        expect(bar).toHaveFocus();
        await user.keyboard('{Enter}');
      }

      /*
       * One behaviour from either input: the shell is asked to narrow to this plant, exactly once, and
       * nothing is opened here. The queue the narrowing produces is where the reader goes, so a drawer
       * opened beside that report would be unmounted before a word of it was read (AAP 0.12.4).
       */
      expect(onNarrowQueue).toHaveBeenCalledTimes(1);
      expect(onNarrowQueue).toHaveBeenCalledWith({ kind: 'plant', plantId: plant.id });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(mockService.getEvidence).not.toHaveBeenCalled();
    },
  );

  it('draws one mark per delivered day for each series, and narrows the queue to the day a mark or a series table row states', async () => {
    const user = userEvent.setup();
    const onNarrowQueue = vi.fn<(narrowing: OverviewNarrowing) => void>();

    renderScreen({ onNarrowQueue });
    await settledTile(UI.tileOpenExceptions);

    const opened = seriesMarks(UI.seriesOpened);
    const resolved = seriesMarks(UI.seriesResolved);

    expect(opened).toHaveLength(SERIES.length);
    expect(resolved).toHaveLength(SERIES.length);

    SERIES.forEach((point, index) => {
      // Each mark states its series, its day and its count, then the action it performs, and declares
      // no dialog because it opens none (rules P-8 and B-3).
      expect(at(opened, index, 'opened mark')).toHaveAttribute(
        'aria-label',
        `${UI.seriesOpened}, ${point.date}: ${String(point.open)}. ${UI.narrowToDay}${point.date}`,
      );
      expect(at(resolved, index, 'resolved mark')).toHaveAttribute(
        'aria-label',
        `${UI.seriesResolved}, ${point.date}: ${String(point.resolved)}. ${UI.narrowToDay}${point.date}`,
      );
      expect(at(opened, index, 'opened mark')).not.toHaveAttribute('aria-haspopup');
    });

    /*
     * A mark narrows the queue to the day it draws and opens nothing (AAP 0.12.4): the reader follows
     * the gesture to the queue it narrowed, so a drawer opened here would be unmounted before it was
     * read. The day reported is the first mark's own, so the case states no date of its own (rule P-6).
     */
    const mark = at(opened, 0, 'opened mark');
    const firstDay = at(SERIES, 0, 'series day');

    mark.focus();
    expect(mark).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(onNarrowQueue).toHaveBeenCalledTimes(1);
    expect(onNarrowQueue).toHaveBeenLastCalledWith({ kind: 'date', date: firstDay.date });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mockService.getEvidence).not.toHaveBeenCalled();

    /*
     * The day is also reachable from the date cell of the series' table view, which narrows the queue to
     * the day the row carries. The second day is the one chosen, so the second report is about the date
     * that row states rather than about whichever row happens to come first.
     */
    const toggle = tableToggle(UI.seriesChartTitle);

    toggle.focus();
    await user.keyboard('{Enter}');

    expect(seriesMarks(UI.seriesOpened)).toHaveLength(0);

    const table = screen.getByRole('table', { name: UI.seriesChartCaption });
    const day = at(SERIES, 1, 'series day');
    const dateCell = at(cellsOf(at(dataRowsOf(table), 1, 'series row')), 0, 'date cell');
    const dateControl = within(dateCell).getByRole('button');

    // One control per row, named by what activating it does before it names the day (rules P-8 and
    // B-3), showing that row's own date in the mono face (AAP §0.5.3).
    expect(within(dateCell).getAllByRole('button')).toHaveLength(1);
    expect(dateControl).toHaveAccessibleName(`${UI.narrowToDay}${day.date}`);
    expect(within(dateControl).getByText(day.date).className.split(' ')).toEqual(
      expect.arrayContaining(MONO_VALUE_CLASSES.base.split(' ')),
    );

    dateControl.focus();
    expect(dateControl).toHaveFocus();

    await user.keyboard('{Enter}');

    // A second report, carrying the day that row prints: the screen asks the shell to narrow the queue
    // by the record's own date rather than re-filtering rows it already has (rule P-2).
    expect(onNarrowQueue).toHaveBeenCalledTimes(2);
    expect(onNarrowQueue).toHaveBeenLastCalledWith({ kind: 'date', date: day.date });
  });

  it('replaces the revenue bars with a table of the same rows, and back, from the keyboard', async () => {
    const user = userEvent.setup();

    renderScreen();
    await settledTile(UI.tileOpenExceptions);

    const toggle = tableToggle(UI.revenueChartTitle);
    toggle.focus();
    expect(toggle).toHaveFocus();

    await user.keyboard('{Enter}');

    // The surface is unmounted rather than hidden, so no focus stop survives inside a chart that is
    // no longer shown.
    expect(barMarks()).toHaveLength(0);

    const table = screen.getByRole('table', { name: UI.revenueChartCaption });
    expect(within(table).getAllByRole('columnheader').map(collapsedTextOf)).toEqual([
      UI.columnPlant,
      UI.columnPlantName,
      UI.columnOpenExceptions,
      UI.columnRevenueAtRisk,
    ]);

    const rows = dataRowsOf(table);
    expect(rows).toHaveLength(BY_PLANT.length);

    BY_PLANT.forEach((row, index) => {
      const cells = cellsOf(at(rows, index, 'row'));

      expect(cells).toHaveLength(4);
      // The identifier and the amount are set in the mono face with tabular figures (AAP §0.5.3).
      expect(collapsedTextOf(at(cells, 0, 'cell'))).toBe(row.plantId);
      expect(collapsedTextOf(at(cells, 1, 'cell'))).toBe(row.plantName);
      expect(within(at(cells, 2, 'cell')).getByRole('button')).toHaveAccessibleName(
        patternOf(String(row.openExceptions)),
      );

      const amount = within(at(cells, 3, 'cell')).getByText(
        patternOf(formatMoney(row.revenueAtRiskEur)),
      );
      expect(amount.className.split(' ')).toEqual(
        expect.arrayContaining(MONO_VALUE_CLASSES.base.split(' ')),
      );
    });

    const back = chartToggle(UI.revenueChartTitle);
    back.focus();
    await user.keyboard('{Enter}');

    expect(screen.queryByRole('table', { name: UI.revenueChartCaption })).toBeNull();
    expect(barMarks()).toHaveLength(PLANTS.length);
    expect(at(barMarks(), 0, 'bar')).toHaveAttribute('tabindex', '0');
  });

  it('labels the revenue axis from the axis maximum through the interface’s one money format', async () => {
    renderScreen();
    await settledTile(UI.tileOpenExceptions);

    /* The maximum every bar is scaled against: the largest amount the payload reports. */
    const axisMax = Math.max(...PLANTS.map((plant) => plant.revenue));
    const svg = barMark(at(PLANTS, 0, 'plant')).closest('svg');

    if (svg === null) {
      throw new Error('the revenue chart drew no graphic');
    }

    const axis = svg.querySelector('g[aria-hidden="true"]');

    if (axis === null) {
      throw new Error('the revenue chart drew no value axis');
    }

    /* The figure states its own scale — the zero baseline and the maximum — and both are the money
       formatter's own strings, the ones the bar ends and the table cells print (rule P-6). */
    expect(
      Array.from(axis.querySelectorAll('text')).map((node) => node.textContent ?? ''),
    ).toEqual([formatMoney(0), formatMoney(axisMax)]);

    /* The unit and the scale are stated in the figure's description as well as in its axis. */
    expect(screen.getByText(UI.revenueChartDescription)).toBeVisible();
  });

  it('replaces the opened and resolved series with a table of the same days, and back, from the keyboard', async () => {
    const user = userEvent.setup();

    renderScreen();
    await settledTile(UI.tileOpenExceptions);

    const toggle = tableToggle(UI.seriesChartTitle);
    toggle.focus();
    await user.keyboard('{Enter}');

    expect(seriesMarks(UI.seriesOpened)).toHaveLength(0);

    const table = screen.getByRole('table', { name: UI.seriesChartCaption });
    expect(within(table).getAllByRole('columnheader').map(collapsedTextOf)).toEqual([
      UI.columnDate,
      UI.columnOpened,
      UI.columnResolved,
    ]);

    const rows = dataRowsOf(table);
    expect(rows).toHaveLength(SERIES.length);

    SERIES.forEach((point, index) => {
      const cells = cellsOf(at(rows, index, 'row'));

      expect(cells).toHaveLength(3);

      // The date cell is the control that narrows the queue to the day it prints (AAP §0.12.4): the
      // cell holds exactly one control, its accessible name states that action before the day, and the
      // day it shows is that row's own date in the mono face (AAP §0.5.3).
      const dateCell = at(cells, 0, 'date cell');
      const dateControl = within(dateCell).getByRole('button');

      expect(within(dateCell).getAllByRole('button')).toHaveLength(1);
      expect(dateControl).toHaveAccessibleName(`${UI.narrowToDay}${point.date}`);
      expect(within(dateControl).getByText(point.date).className.split(' ')).toEqual(
        expect.arrayContaining(MONO_VALUE_CLASSES.base.split(' ')),
      );
      expect(within(at(cells, 1, 'cell')).getByRole('button')).toHaveAccessibleName(
        patternOf(String(point.open)),
      );
      expect(within(at(cells, 2, 'cell')).getByRole('button')).toHaveAccessibleName(
        patternOf(String(point.resolved)),
      );
    });

    const back = chartToggle(UI.seriesChartTitle);
    back.focus();
    await user.keyboard('{Enter}');

    expect(seriesMarks(UI.seriesOpened)).toHaveLength(SERIES.length);
  });

  it('lists every record that changed since the last visit, each opening its own evidence', async () => {
    renderScreen();

    const group = await screen.findByRole('region', { name: UI.changedSinceTitle });

    for (const item of CHANGED) {
      const trigger = within(group).getByRole('button', {
        name: new RegExp(`^${escapePattern(item.label)}`, 'u'),
      });

      expect(trigger).toBeVisible();
      expect(within(group).getByText(item.detail)).toBeVisible();
    }

    expect(within(group).getAllByRole('button')).toHaveLength(CHANGED.length);
  });

  it('names the record each changed-since entry opens, so two entries of one exception tell apart', async () => {
    /*
     * Two entries of one exception: the same title, and the two different records the entries open —
     * the shape a decided exception produces when its own activity also moved in the window. The
     * reference and the title are opaque placeholders, as every identifier in this suite is (rule P-6).
     */
    const sharedTitle = 'Record delta';
    const items: readonly ChangedSinceLastVisitItem[] = [
      { ref: 'record-delta-approval', label: sharedTitle, detail: 'the decision states its comment' },
      { ref: 'record-delta-activity', label: sharedTitle, detail: 'the activity states its note' },
    ];

    mockService.getOverview.mockResolvedValue(
      envelope({ ...OVERVIEW, changedSinceLastVisit: [...items] }),
    );

    renderScreen();

    const group = await screen.findByRole('region', { name: UI.changedSinceTitle });
    const entries = within(group).getAllByRole('listitem');
    expect(entries).toHaveLength(items.length);

    items.forEach((item, index) => {
      const entry = at(entries, index, 'changed-since entry');
      const trigger = within(entry).getByRole('button');

      /* The title both entries carry cannot say which record an entry opens, so the identifier is read
         inside the entry itself: this is the assertion that fails when the record is left unnamed. */
      expect(within(entry).getByText(item.ref)).toBeVisible();
      /* The label stays first, so the control is still announced with the text a reader sees before the
         identifier that qualifies it (WCAG 2.2 SC 2.5.3, label in name). */
      expect(trigger).toHaveAccessibleName(
        new RegExp(`^${escapePattern(item.label)}.*${escapePattern(item.ref)}`, 'u'),
      );
      /* Separated in the text itself, not only by a margin: whatever copies the line or reads its text
         content must see two tokens rather than the identifier fused to the end of the title. */
      expect(trigger.textContent).toContain(`${item.label} ${item.ref}`);
      expect(within(entry).getByText(item.detail)).toBeVisible();
    });
  });

  it('states that no record changed when nothing moved since the last visit', async () => {
    mockService.getOverview.mockResolvedValue(envelope(UNCHANGED_OVERVIEW));

    renderScreen();

    const group = await screen.findByRole('region', { name: UI.changedSinceTitle });

    expect(within(group).getByText(UI.changedSinceEmpty)).toBeVisible();
    expect(within(group).queryAllByRole('button')).toHaveLength(0);
  });

  it.each([
    { card: UI.byPlantTitle, note: UI.byPlantNote },
    { card: UI.changedSinceTitle, note: UI.changedSinceNote },
  ])(
    'labels the computed figures of the “$card” card on the card itself',
    async ({ card, note }) => {
      renderScreen();

      const group = await screen.findByRole('region', { name: card });

      // One label for the card's figures, read inside the card so the shell's page-level badge could
      // not satisfy it and neither could a sibling card's label (AAP 0.10, rule P-1).
      expect(within(group).getAllByText(CALCULATION_LABEL)).toHaveLength(1);

      // The sentence beneath the label states what it refers to, and carries no figure of its own.
      expect(within(group).getByText(note)).toBeVisible();
    },
  );

  it('renders the risk-by-plant table with its caption, its headers and each row’s own figures', async () => {
    renderScreen();

    expect(await screen.findByRole('heading', { level: 2, name: UI.byPlantTitle })).toBeVisible();

    // The caption is the table's accessible name, which is what makes an unnamed table impossible
    // to reach a reader without a name (rule B-3).
    const table = screen.getByRole('table', { name: UI.byPlantCaption });

    expect(within(table).getAllByRole('columnheader').map(collapsedTextOf)).toEqual([
      UI.columnPlant,
      UI.columnPlantName,
      UI.columnOpenExceptions,
      UI.columnRevenueAtRisk,
    ]);

    const rows = dataRowsOf(table);
    expect(rows).toHaveLength(BY_PLANT.length);

    BY_PLANT.forEach((row, index) => {
      const cells = cellsOf(at(rows, index, 'row'));

      expect(collapsedTextOf(at(cells, 0, 'cell'))).toBe(row.plantId);
      expect(collapsedTextOf(at(cells, 1, 'cell'))).toBe(row.plantName);

      // Each figure is wrapped in the trigger that opens its evidence, so its accessible name starts
      // with the figure a reader sees in the cell.
      expect(within(at(cells, 2, 'cell')).getByRole('button')).toHaveAccessibleName(
        patternOf(String(row.openExceptions)),
      );
      expect(within(at(cells, 3, 'cell')).getByRole('button')).toHaveAccessibleName(
        patternOf(formatMoney(row.revenueAtRiskEur)),
      );

      const identifier = within(at(cells, 0, 'cell')).getByText(row.plantId);
      expect(identifier.className.split(' ')).toEqual(
        expect.arrayContaining(MONO_VALUE_CLASSES.base.split(' ')),
      );
    });
  });

  it('states above the risk-by-plant rows which plant each exception is counted at', async () => {
    renderScreen();

    const group = await screen.findByRole('region', { name: UI.byPlantTitle });

    /*
     * The rule the rows follow is stated where they are read: a plant's figure is the same whether or
     * not the shell's Plant filter is narrowed to it, because an exception is counted at the plant its
     * record names rather than at the plant that admitted it (AAP 0.2.1: a filtered queue and a filtered
     * overview cannot disagree).
     */
    expect(within(group).getByText(UI.byPlantNote)).toBeVisible();
    expect(within(group).getByRole('table', { name: UI.byPlantCaption })).toBeVisible();
  });

  it('names each of a plant row’s two figures in the reference its own trigger opens', async () => {
    const user = userEvent.setup();
    const plant = at(PLANTS, 0, 'plant');

    renderScreen();

    const table = await screen.findByRole('table', { name: UI.byPlantCaption });
    const cells = cellsOf(at(dataRowsOf(table), 0, 'row'));

    await user.click(within(at(cells, 2, 'cell')).getByRole('button'));

    const dialog = await screen.findByRole('dialog');

    // The count and the amount are two figures of one row, so the count's reference names the count:
    // a drawer that answered with the row's revenue would report a figure the reader did not activate
    // (principle PR-6).
    expect(String(mockService.getEvidence.mock.calls[0]?.[0])).toBe(
      `overview:plant/${plant.id}/open-exceptions`,
    );

    await user.click(within(dialog).getByRole('button', { name: EVIDENCE_DRAWER_TEXT.closeLabel }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(within(at(cells, 3, 'cell')).getByRole('button'));

    expect(mockService.getEvidence).toHaveBeenCalledTimes(2);
    expect(String(mockService.getEvidence.mock.calls[1]?.[0])).toBe(
      `overview:plant/${plant.id}/revenue-at-risk`,
    );
  });

  it('renders no control that cannot act', async () => {
    renderScreen();
    await settledTile(UI.tileOpenExceptions);

    const controls = screen.getAllByRole('button');
    expect(controls.length).toBeGreaterThan(0);

    for (const control of controls) {
      // Nothing here is disabled, so nothing owes a reader a reason; and every control carries a
      // name, so no control reaches assistive technology as an unnamed button (rule P-8, rule B-3).
      expect(control).not.toHaveAttribute('aria-disabled', 'true');
      expect(control).toBeEnabled();
      expect(control).toHaveAccessibleName(/\S/u);
    }
  });

  /* -------------------------------------------------------------------------------------------
   * The seven states specification §8 fixes, each driven from the read alone
   * ----------------------------------------------------------------------------------------- */

  it('shows the loading region until the overview read settles', () => {
    mockService.getOverview.mockReturnValue(new Promise<Result<Overview>>(() => {}));

    renderScreen();

    const region = screen.getByRole('status', { name: STATE_BOUNDARY_TEXT.loading });

    expect(region).toBeVisible();
    expect(region).toHaveAttribute('aria-busy', 'true');
    // Nothing half-read is placed beside the skeleton.
    expect(screen.queryByRole('region', { name: UI.tileOpenExceptions })).toBeNull();
  });

  it('explains a permission refusal with the permission, the roles that may act and the trace id', async () => {
    mockService.getOverview.mockRejectedValue(DENIAL);

    renderScreen();

    const card = await screen.findByRole('region', {
      name: `${UI.permissionRequiredPrefix}${REQUIRED_PERMISSION}`,
    });

    expect(within(card).getAllByRole('listitem').map(collapsedTextOf)).toEqual([
      ...ROLES_WITH_PERMISSION,
    ]);
    expect(card).toHaveTextContent(TRACE_ID);

    // Repeating a call the acting role may not make would fail the same way, so no retry is offered
    // and no figure is shown beside the refusal (rule P-8).
    expect(screen.queryByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel })).toBeNull();
    expect(screen.queryByRole('region', { name: UI.tileOpenExceptions })).toBeNull();
  });

  it('shows the offline notice and repeats the read from its retry control', async () => {
    const user = userEvent.setup();

    mockService.getOverview.mockRejectedValueOnce(FAILURE);

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.offlineHeadline)).toBeVisible();
    expect(screen.getByText(STATE_BOUNDARY_TEXT.offlineDetail)).toBeVisible();
    expect(screen.queryByRole('region', { name: UI.tileOpenExceptions })).toBeNull();

    await user.click(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel }));

    // The retry repeats the same read, and the figures replace the notice once it answers.
    expect(await settledTile(UI.tileOpenExceptions)).toBeVisible();
    expect(mockService.getOverview).toHaveBeenCalledTimes(2);
    expect(mockService.getOverview).toHaveBeenNthCalledWith(2, SCOPE);
  });

  it('takes a source that did not answer as offline and withholds the figures', async () => {
    mockService.getOverview.mockResolvedValue(envelope(OVERVIEW, freshnessWith('unavailable')));

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.offlineHeadline)).toBeVisible();
    expect(screen.queryByRole('region', { name: UI.tileOpenExceptions })).toBeNull();
    // The read can be repeated, so the control that repeats it is there to be used (rule P-8).
    expect(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel })).toBeVisible();
  });

  it.each<SourceId>([APPROVAL_GATE_SOURCE, 'transport'])(
    'keeps the figures on screen while naming the %s source and its as-of time as stale',
    async (source) => {
      mockService.getOverview.mockResolvedValue(envelope(OVERVIEW, freshnessWith('stale', source)));

      renderScreen();

      // Waiting for a figure is also what waits the loading region away: once the read has settled
      // the stale banner is the only live region on the screen.
      await settledTile(UI.tileOpenExceptions);
      const banner = screen.getByRole('status');

      expect(banner).toHaveTextContent(
        `${SOURCE_LABELS[source]}${STATE_BOUNDARY_TEXT.staleSuffix}`,
      );
      expect(banner).toHaveTextContent(STATE_BOUNDARY_TEXT.staleAsOfPrefix);
      // The instant printed is the record's own, never an age derived here (rule P-6).
      expect(banner).toHaveTextContent(AS_OF);

      // A warning about the figures is not a reason to withhold them.
      expect(screen.getByRole('table', { name: UI.byPlantCaption })).toBeVisible();
    },
  );

  it('names the inputs a partial read left out while still showing the figures', async () => {
    mockService.getOverview.mockResolvedValue(envelope(OVERVIEW, freshnessWith('partial')));

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.partialHeadline)).toBeVisible();
    expect(screen.getByText(UI.partial)).toBeVisible();
    expect(tileRegion(UI.tileOpenExceptions)).toBeVisible();
  });

  it('states the trigger-neutral sentence when nothing narrowed the read and it holds nothing', async () => {
    mockService.getOverview.mockResolvedValue(envelope(EMPTY_OVERVIEW));

    renderScreen();

    // Nothing narrowed this read, so the sentence claims no filter: a collection the simulation
    // popover emptied must not be described as a scope the reader narrowed (the property
    // `src/services/mock/simulation.ts` states for its `empty` trigger, rule P-4).
    expect(await screen.findByText(UI.emptyUnnarrowed)).toBeVisible();
    expect(screen.queryByText(UI.empty)).toBeNull();
    // An empty read shows the sentence instead of three blank surfaces.
    expect(screen.queryByRole('region', { name: UI.tileOpenExceptions })).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('states the trigger-neutral sentence for a population whose every plant row reads zero', async () => {
    mockService.getOverview.mockResolvedValue(envelope(EMPTIED_OVERVIEW));

    renderScreen();

    // A row carrying no exception and no revenue is the aggregate's identity, not a risk row: the
    // screen says there is nothing to summarise rather than printing figures a reader cannot tell
    // apart from computed ones (specification §8, AAP §0.12.4, T-17).
    expect(await screen.findByText(UI.emptyUnnarrowed)).toBeVisible();
    expect(screen.queryByText(UI.empty)).toBeNull();
    expect(screen.queryByRole('region', { name: UI.tileOpenExceptions })).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('tells a read the shell narrowed apart from one nothing narrowed', async () => {
    const plant = at(PLANTS, 0, 'plant');
    const narrowed: Scope = { plants: [plant.id], products: [] };

    mockService.getOverview.mockResolvedValue(envelope(EMPTIED_OVERVIEW));

    renderScreen({ scope: narrowed });

    // The same empty payload, and only the selection differs: a filter is what emptied this read, so
    // the sentence a reader gets is the filter wording rather than the trigger-neutral one (rule P-4).
    expect(mockService.getOverview).toHaveBeenCalledWith(narrowed);
    expect(await screen.findByText(UI.empty)).toBeVisible();
    expect(screen.queryByText(UI.emptyUnnarrowed)).toBeNull();
  });

  it('treats a record that moved under the reader as a conflict and offers a reload', async () => {
    mockService.getOverview.mockRejectedValue(MOVED_RECORD);

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.conflictHeadline)).toBeVisible();
    expect(screen.getByText(UI.conflict)).toBeVisible();
    expect(
      screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.reloadLabel }),
    ).toBeVisible();
    expect(screen.queryByRole('region', { name: UI.tileOpenExceptions })).toBeNull();
  });

  /* -------------------------------------------------------------------------------------------
   * Both themes
   * ----------------------------------------------------------------------------------------- */

  it.each(THEMES)('renders the same figures under the %s theme', async (theme) => {
    document.documentElement.setAttribute('data-theme', theme);

    renderScreen();

    for (const tile of TILE_CASES) {
      expect(await settledTile(tile.caption)).toBeVisible();
    }

    // What a case asserts is what a reader receives, never a colour: the themes differ in token
    // values, and no reading of the screen depends on one of them.
    expect(screen.getByRole('table', { name: UI.byPlantCaption })).toBeVisible();
    expect(tableToggle(UI.revenueChartTitle)).toBeVisible();
    expect(tableToggle(UI.seriesChartTitle)).toBeVisible();
  });

  /* -------------------------------------------------------------------------------------------
   * The primary action, from the keyboard only
   * ----------------------------------------------------------------------------------------- */

  it('T-16 reaches the primary action with Tab, shows its focus ring, and opens the queue with Enter', async () => {
    const user = userEvent.setup();

    renderScreen();
    await settledTile(UI.tileOpenExceptions);

    await user.tab();

    const primary = screen.getByRole('button', { name: UI.primaryAction });

    expect(primary).toHaveFocus();
    // A visible focus indicator (rule B-3): jsdom paints nothing, so the utilities the shared control
    // structure owns are what the case can observe, taken from that list rather than retyped.
    expect(FOCUS_RING_CLASSES.length).toBeGreaterThan(0);
    for (const focusClass of FOCUS_RING_CLASSES) {
      expect(primary.className.split(' ')).toContain(focusClass);
    }

    await user.keyboard('{Enter}');

    // The action performs its function: the exception queue a reader would arrive at is on screen.
    expect(await screen.findByRole('heading', { level: 1, name: UI.queueProbe })).toBeVisible();
    // Navigating is not a read, so the overview was not fetched again.
    expect(mockService.getOverview).toHaveBeenCalledTimes(1);
  });
});


