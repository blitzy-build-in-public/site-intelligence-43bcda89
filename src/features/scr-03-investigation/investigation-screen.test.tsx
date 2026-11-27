/**
 * Component suite for `investigation-screen.tsx`, the SCR-03 investigation a planner reads before
 * choosing a response option.
 *
 * WHAT IT PROVES. Each case states a contract the screen is relied on for rather than a description
 * of its markup: that the exception's own title is the page's one level-one heading and its
 * identifier is set in the mono face; that severity and status each render as an icon *and* a visible
 * label inside their own indicator (rule B-3), and that the days-to-impact figure carries the exact
 * §5.3 label for a computed figure on the figure itself, with a trigger that opens its evidence
 * (rule P-1); that every node of the impact chain is a focusable control opening **that** node's own
 * evidence, that `Escape` returns focus to the node it was opened from, and that a node with no
 * evidence reference is static text with no focus stop (rule P-8); that the projection labels its zero
 * reference and draws every reading the records state, a negative one included, because `LineChart`
 * never clamps one, and that it shades the idle window the record's own zero closing days span — with
 * no span at all where no day reads zero — naming it in the screen's own words; that the projection's
 * table view holds the same dates and readings the marks
 * carried and that the chart is unmounted rather than hidden while the table is up (success criterion
 * 9, rule B-3); that the missing-inputs panel lists the inputs the assessment could not read beside
 * the confidence, that the screen states "Cannot compute" instead of a partial figure, and that a
 * partial read warns without withholding the figures; that each of the seven states specification §8
 * fixes renders for the outcome the screen maps it to, and that a `not-found` refusal lands on the
 * panel linking back to the queue rather than a blank page; that the four controls act — two navigate,
 * two write once through the port and re-read what they moved — and that a control which cannot act is
 * disabled with a reason reachable from the keyboard; and that both themes render the same content.
 *
 * WHERE THE DATA COMES FROM. The service is mocked at `service-provider.tsx`, the one boundary a screen
 * may read through (rule P-2), so no seed module, adapter or domain module is reached and the suite
 * observes exactly the calls the screen makes. Everything else — `PageHeader`, `Card`, `Panel`,
 * `MetricTile`, `StatusIndicator`, `MonoValue`, `DataTable`, `ChartFrame`, `ViewAsTableToggle`,
 * `LineChart`, `StateBoundary`, `ForbiddenCard`, `EvidenceRef` and `ActionButton` — is the real
 * component, because what a reader receives is the thing under test.
 *
 * NO ACCEPTANCE IDENTIFIER IS CARRIED HERE. T-02, T-03, T-05 and T-06 belong to the browser suite in
 * `e2e/s1-investigation.spec.ts`, which alone carries `T-` identifiers; T-03's never-below-zero
 * reading is asserted there against the series the solver returns, not against a rendered chart. The
 * solver's arithmetic is proven in the solver's own suite, the axe pass in the keyboard-and-axe
 * browser spec, so neither is imported, repeated or approximated here.
 *
 * THE FIXTURE IS INPUT, NOT AN EXPECTED RESULT (rule P-6). Every value below is data handed to the
 * mocked read, so the screen is free to place it and a case can only pass by finding what the screen
 * actually rendered. Nothing is imported from the expected-results fixtures or from the seed records,
 * no currency literal and no record-identifier shape is written here — every identifier is an opaque
 * `fixture-…` placeholder and the series' dates are derived from the imported demonstration clock —
 * and the wording the screen owns is imported from `INVESTIGATION_TEXT` rather than retyped, as is
 * every string a sibling component owns (`IMPACT_CHAIN_TEXT`, `EVIDENCE_DRAWER_TEXT`,
 * `STATE_BOUNDARY_TEXT`, `VIEW_AS_TABLE_LABELS`, `SIM_LABELS`, `SOURCE_LABELS`, `STATUS_LABEL_CLASS`,
 * `MONO_VALUE_CLASSES`, `CONTROL_STRUCTURE_CLASSES`).
 *
 * THREE CONSTRAINTS THE SUITE WORKS WITHIN. No state is driven through a prop: the screen derives each of
 * the seven from what the read settled to, so every state case drives it through the stub alone (AAP
 * 0.12.1); `ScreenState` has no member for "current and complete", so a healthy read passes `undefined`
 * and the case following one asserts the content rather than a state value; and two strings the component
 * layer keeps private are restated once, in {@link FORBIDDEN_TITLE_PREFIX} (the forbidden card's title
 * prefix) and {@link DATE_COLUMN_HEADER} (the projected stock chart's date column header).
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock, touches the network or reaches outside the service boundary.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EVIDENCE_DRAWER_TEXT } from '../../components/evidence-drawer';
import { MONO_VALUE_CLASSES } from '../../components/mono-value';
import { runOutStatement } from '../../components/run-out-reading';
import { STATE_BOUNDARY_TEXT } from '../../components/state-boundary';
import { STATUS_LABEL_CLASS } from '../../components/status-indicator';
import { CONTROL_STRUCTURE_CLASSES } from '../../components/tooltip';
import { VIEW_AS_TABLE_LABELS } from '../../components/view-as-table-toggle';
import {
  ALREADY_OWNER_REASON,
  APPROVAL_GATE_SOURCE,
  DEMO_CLOCK,
  SIM_LABELS,
  SOURCE_IDS,
  SOURCE_LABELS,
} from '../../types';
import type {
  ActiveUser,
  AffectedLine,
  AuditEvent,
  Confidence,
  DailyClosingStockPoint,
  Evidence,
  ExceptionDetail,
  Freshness,
  FreshnessState,
  ImpactChainNode,
  OperationalException,
  OrderResult,
  Permission,
  Problem,
  Result,
  RunOut,
  Scenario,
  ScenarioSet,
  SimLabel,
  SourceId,
} from '../../types';
import { IMPACT_CHAIN_KIND_LABELS, IMPACT_CHAIN_TEXT } from './impact-chain';
import { INVESTIGATION_TEXT, InvestigationScreen } from './investigation-screen';

/* ---------------------------------------------------------------------------------------------
 * The two strings this suite must restate, because their owners do not export them
 * ------------------------------------------------------------------------------------------- */

/**
 * The prefix `forbidden-card.tsx` puts before the permission it names.
 *
 * The card's own heading is the region's accessible name, and the constant is private to that module,
 * so the one string is stated here once rather than spelled out at every assertion.
 */
const FORBIDDEN_TITLE_PREFIX = 'Permission required: ';

/** The projection's date column header, which `projected-stock-chart.tsx` keeps private. */
const DATE_COLUMN_HEADER = 'Date';

/* ---------------------------------------------------------------------------------------------
 * The fixture: input data for the mocked read, and nothing the screen would compute
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every result and every failure of these fixtures carries. */
const TRACE_ID = 'trace-investigation';

/** The instant the six sources last answered: the demonstration clock's own instant, never typed. */
const AS_OF = DEMO_CLOCK;

/**
 * `Simulated calculation` — the label every computed figure carries, read from the tuple that owns the
 * seven fixed strings so this suite can never assert a label the interface does not carry (rule P-1).
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/** One day, in milliseconds, for deriving the fixture's dates from the demonstration clock. */
const DAY_MS = 86_400_000;

/**
 * The calendar date a given number of days from the demonstration clock's instant, as `YYYY-MM-DD`.
 *
 * Derived rather than written out, so the fixture holds no typed date and a change of the
 * demonstration clock reaches every point of the series and every promised date at once.
 */
function isoDateAt(offsetDays: number): string {
  return new Date(Date.parse(DEMO_CLOCK) + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/* Identifiers. Every one is an opaque placeholder: none matches a contracts §1 pattern (rule P-6). */
const EXCEPTION_ID = 'fixture-exception';
const OWNER_ID = 'fixture-owner';
const ACTOR_ID = 'fixture-planner';
const PLANT_ID = 'fixture-plant';
const PRODUCT_ID = 'fixture-product';
const SUPPLIER_ID = 'fixture-supplier';
const MATERIAL_REF = 'fixture-material';
const LINE_REF = 'fixture-line';
const PURCHASE_ORDER_REF = 'fixture-purchase-order';
const CUSTOMER_ORDER_REF = 'fixture-order';
const SECOND_ORDER_REF = 'fixture-order-second';
const EVENT_ID = 'fixture-event';

/** How far in the future the fixture's promises and readings run, in days from the clock. */
const FIRST_DAY = 0;
const NEGATIVE_DAY = 1;
const LAST_DAY = 2;

/** The confidence the fixture assessment carries, with the reason the record states for it. */
const CONFIDENCE: Confidence = {
  level: 'medium',
  reason: 'the delayed purchase order was read from a single source',
};

/** The one reading of the series that is below zero, so a case can prove the chart draws it truthfully. */
const NEGATIVE_READING = -35;

/**
 * The baseline projection the read returns, three closings across the case's window.
 *
 * The middle reading is negative on purpose: `LineChart`'s contract is to draw and name a reading below
 * zero rather than clamp it, and a second clamp in the projection would hide the value a reader needs.
 * The "never below zero" property is the solver's, and it is asserted against the solver's own series
 * in the browser suite, never against this chart.
 */
const SERIES: readonly DailyClosingStockPoint[] = [
  { date: isoDateAt(FIRST_DAY), units: 240 },
  { date: isoDateAt(NEGATIVE_DAY), units: NEGATIVE_READING },
  { date: isoDateAt(LAST_DAY), units: 0 },
];

/**
 * A projection whose closing stock runs out inside the window and stays at zero to its end.
 *
 * The two zero days are what AAP 0.12.4's shaded idle window covers: the span runs from the first of
 * them to the last, which this case proves the screen shades and names.
 */
const IDLE_WINDOW_SERIES: readonly DailyClosingStockPoint[] = [
  { date: isoDateAt(FIRST_DAY), units: 240 },
  { date: isoDateAt(NEGATIVE_DAY), units: 0 },
  { date: isoDateAt(LAST_DAY), units: 0 },
];

/** A projection with stock on hand on every day of the window: no idle day, so no shaded span. */
const STOCK_ALL_WINDOW_SERIES: readonly DailyClosingStockPoint[] = [
  { date: isoDateAt(FIRST_DAY), units: 240 },
  { date: isoDateAt(NEGATIVE_DAY), units: NEGATIVE_READING },
  { date: isoDateAt(LAST_DAY), units: 240 },
];

/** The customer order lines the exception puts at risk, which supply the table's promised dates. */
const AFFECTED_LINES: readonly AffectedLine[] = [
  {
    orderId: CUSTOMER_ORDER_REF,
    productId: PRODUCT_ID,
    plantId: PLANT_ID,
    dueDate: isoDateAt(LAST_DAY),
    unitsAtRisk: 120,
  },
  {
    orderId: SECOND_ORDER_REF,
    productId: PRODUCT_ID,
    plantId: PLANT_ID,
    dueDate: isoDateAt(FIRST_DAY),
    unitsAtRisk: 40,
  },
];

/** What the solver measured for each affected order, as the payload reports it. */
const ORDER_RESULTS: readonly OrderResult[] = [
  { orderId: CUSTOMER_ORDER_REF, unitsLate: 60, daysLate: 3 },
  { orderId: SECOND_ORDER_REF, unitsLate: 20, daysLate: 1 },
];

/** The impact chain: one node of each kind the union declares, in the order a chain reads. */
const IMPACT_CHAIN: readonly ImpactChainNode[] = [
  {
    ref: PURCHASE_ORDER_REF,
    kind: 'purchase-order',
    label: PURCHASE_ORDER_REF,
    detail: 'the record states the promised date it moved',
  },
  {
    ref: MATERIAL_REF,
    kind: 'material',
    label: 'Fixture housing',
    detail: 'the material the delayed order carries',
  },
  {
    ref: LINE_REF,
    kind: 'line',
    label: 'Fixture line',
    detail: 'the line that consumes the material',
  },
  {
    ref: CUSTOMER_ORDER_REF,
    kind: 'customer-order',
    label: CUSTOMER_ORDER_REF,
    detail: 'the order the line puts at risk',
  },
];

/** The audit events the chain records against the exception, in chain order. */
const ACTIVITY: readonly AuditEvent[] = [
  {
    sequence: 1,
    id: EVENT_ID,
    timestamp: DEMO_CLOCK,
    actorType: 'user',
    actorId: OWNER_ID,
    action: 'note',
    objectRef: EXCEPTION_ID,
    result: 'succeeded',
    before: null,
    after: null,
    payloadHash: 'fixture-payload-hash',
    traceId: TRACE_ID,
    previousHash: 'fixture-previous-hash',
    eventHash: 'fixture-event-hash',
  },
];

/** The exception record itself, carrying the header fields the screen prints. */
const EXCEPTION: OperationalException = {
  id: EXCEPTION_ID,
  title: 'Fixture disruption on a fixture line',
  type: 'supply-delay',
  severity: 'high',
  status: 'open',
  plantId: PLANT_ID,
  alsoAffectsPlantIds: [],
  materialId: MATERIAL_REF,
  supplierId: SUPPLIER_ID,
  purchaseOrderId: PURCHASE_ORDER_REF,
  lineId: LINE_REF,
  ownerId: OWNER_ID,
  daysToImpact: 6,
  affectedLines: [...AFFECTED_LINES],
  solverCaseId: 'fixture-case',
  missingInputs: [],
  confidence: CONFIDENCE,
  whatChanged: 'The fixture supplier moved the promised date out by a working week.',
  detectedAt: DEMO_CLOCK,
};

/** The persona the session acts as, so "assign to me" has somebody to assign the exception to. */
const ACTIVE_USER: ActiveUser = {
  id: ACTOR_ID,
  name: 'Fixture planner',
  role: 'material-planner',
  plantIds: [PLANT_ID],
  permissions: ['exception.read'],
  homeRoute: '/overview',
};

/** The payload a healthy read resolves to, built once and varied per case through {@link detail}. */
function detail(overrides: Partial<ExceptionDetail> = {}): ExceptionDetail {
  return {
    exception: EXCEPTION,
    impactChain: [...IMPACT_CHAIN],
    stockSeries: [...SERIES],
    affectedOrders: [...ORDER_RESULTS],
    missingInputs: [],
    confidence: CONFIDENCE,
    activity: [...ACTIVITY],
    ...overrides,
  };
}

/** The healthy payload: a current, complete exception with a chain, a projection and two orders. */
const HEALTHY = detail();

/** A payload holding nothing the body can show, which is the screen's empty state. */
const NOTHING_TO_SHOW = detail({ impactChain: [], stockSeries: [], affectedOrders: [] });

/** The option set the read returns: none yet, so the projection plots the baseline alone. */
const NO_OPTIONS: ScenarioSet = {
  exceptionId: EXCEPTION_ID,
  scenarios: [],
  recommendationRule: 'the fewest units late first, then the lowest added cost',
  tradeOff: 'the service states no trade-off while no option passes its constraint check',
  rejected: [],
};

/**
 * The run-out pair the fixture option carries: day four, half way through it.
 *
 * Beside the day it states a fraction the mapping reads as the middle of the day, so the reading the
 * projection composes has to carry both halves of what AAP §0.8 requires rather than the day alone.
 */
const OPTION_RUN_OUT: RunOut = { day: 4, fractionOfDay: 0.5 };

/** The option's identifier: an opaque placeholder, as every identifier in this suite is (rule P-6). */
const OPTION_ID = 'fixture-option';

/** The option's name, which the projection's reading names before the run-out it states. */
const OPTION_NAME = 'Fixture transfer option';

/**
 * One response option the option-set read answers with.
 *
 * Only the members the projection reads are given values — the pair above, the levers at zero and a
 * passing constraint check — and the closing-stock series is empty, because no case here draws the
 * second series: what these cases prove is the reading under the figure's title, while the series the
 * chart draws is proven elsewhere in this suite.
 */
const OPTION: Scenario = {
  id: OPTION_ID,
  exceptionId: EXCEPTION_ID,
  name: OPTION_NAME,
  origin: 'solver',
  unitsLate: 0,
  maxDaysLate: 0,
  ordersOnTime: 0,
  ordersTotal: 0,
  addedCostEur: 0,
  lineIdleDays: 0,
  revenueDelayedEur: 0,
  runOut: OPTION_RUN_OUT,
  dailyClosingStock: [],
  orders: [],
  constraintCheck: 'pass',
  constraintMessages: [],
  sideEffects: [],
  writeBacks: [],
  levers: { airSets: 0, transferSets: 0 },
  confidence: CONFIDENCE,
};

/** The option set the service answers with when it designates {@link OPTION} as the one to read. */
const DESIGNATED_OPTION: ScenarioSet = {
  exceptionId: EXCEPTION_ID,
  scenarios: [OPTION],
  recommendedId: OPTION_ID,
  recommendationRule: 'the fewest units late first, then the lowest added cost',
  tradeOff: 'the service states the trade-off of the option it recommends',
  rejected: [],
};

/** The same option held by a set that designates none: the record is there, the choice is not. */
const UNDESIGNATED_OPTION: ScenarioSet = {
  exceptionId: EXCEPTION_ID,
  scenarios: [OPTION],
  recommendationRule: 'the fewest units late first, then the lowest added cost',
  tradeOff: 'the service states no trade-off while it recommends nothing',
  rejected: [],
};

/**
 * The sentence the projection states under its title for {@link OPTION}.
 *
 * Composed the way the screen composes it — the option's own series label, the screen's joining words,
 * and the run-out statement the wording module builds from the pair — so the case asserts the reading
 * rather than a phrase retyped beside it (rule P-6).
 */
const OPTION_DESCRIPTION = `${INVESTIGATION_TEXT.selectedSeriesPrefix} ${OPTION_NAME}${INVESTIGATION_TEXT.runOutSeparator}${runOutStatement(OPTION_RUN_OUT)}`;

/** A record the drawer can render in full, so an opened dialog shows content rather than a failure. */
const EVIDENCE: Evidence = {
  value: 'the figure this reference answers',
  provenance: 'computed',
  label: CALCULATION_LABEL,
  formula: 'one record over another, by the rule that owns the figure',
  inputs: ['fixture-input'],
  upstream: ['fixture-upstream'],
  downstream: ['fixture-downstream'],
  confidence: CONFIDENCE,
  missingInputs: [],
  documents: [],
};

/** The six sources all answering and current, as `Meta.freshness` reports them. */
const FRESH_SOURCES: readonly Freshness[] = SOURCE_IDS.map(
  (source): Freshness => ({ source, asOf: AS_OF, state: 'fresh' }),
);

/**
 * The same report with one source in the state asked about.
 *
 * The approval gate is the default because it is the source the freshness rule names first
 * (AAP §0.2.1), so a case can also put another source in that state and prove the banner still names
 * one.
 */
function freshnessWith(
  state: FreshnessState,
  source: SourceId = APPROVAL_GATE_SOURCE,
): readonly Freshness[] {
  return FRESH_SOURCES.map((entry) => (entry.source === source ? { ...entry, state } : entry));
}

/** The envelope every detail read resolves to: the payload and the metadata that qualifies it. */
function envelope(
  data: ExceptionDetail,
  freshness: readonly Freshness[] = FRESH_SOURCES,
): Result<ExceptionDetail> {
  return { data, meta: { freshness: [...freshness], simulated: true, traceId: TRACE_ID } };
}

/** The envelope the option-set read resolves to. */
function optionsEnvelope(data: ScenarioSet = NO_OPTIONS): Result<ScenarioSet> {
  return { data, meta: { freshness: [...FRESH_SOURCES], simulated: true, traceId: TRACE_ID } };
}

/** The envelope the evidence read resolves to. */
function evidenceEnvelope(): Result<Evidence> {
  return {
    data: EVIDENCE,
    meta: { freshness: [...FRESH_SOURCES], simulated: true, traceId: TRACE_ID },
  };
}

/** The permission the refused read names, from the contracts §7.1 vocabulary. */
const REQUIRED_PERMISSION: Permission = 'exception.read';

/** The roles that hold it, so the forbidden card names who may act instead of only what is missing. */
const ROLES_WITH_PERMISSION = ['material-planner', 'head-of-supply-chain'] as const;

/** The refusal a persona without `exception.read` meets. */
const DENIAL: Problem = {
  type: 'permission',
  message: 'Reading this exception needs a permission the acting persona does not hold.',
  traceId: TRACE_ID,
  requiredPermission: REQUIRED_PERMISSION,
  rolesWithPermission: [...ROLES_WITH_PERMISSION],
};

/** The refusal a record that moved under the reader produces, which the screen shows as a conflict. */
const MOVED_RECORD: Problem = {
  type: 'validation',
  message: 'The exception changed before this request could be honoured.',
  traceId: TRACE_ID,
};

/** The refusal an address naming no readable exception produces. */
const MISSING_RECORD: Problem = {
  type: 'not-found',
  message: 'No exception answers the identifier in this address.',
  traceId: TRACE_ID,
};

/**
 * A failure that did not arrive in the port's `Problem` shape, which the screen reports as offline:
 * nothing answered, and no cause is invented for it (rule P-6).
 */
const GENERIC_FAILURE = new Error('the read stopped without answering');

/* ---------------------------------------------------------------------------------------------
 * The service boundary — mocked at the provider, never at the network
 * ------------------------------------------------------------------------------------------- */

/**
 * The port members this suite observes: the two reads the screen makes, the two writes it offers, and
 * the evidence read `evidence-drawer.tsx` performs when a figure is activated.
 */
const port = vi.hoisted(() => ({
  getExceptionDetail: vi.fn(),
  getScenarioSet: vi.fn(),
  assignException: vi.fn(),
  noteException: vi.fn(),
  getEvidence: vi.fn(),
}));

/**
 * The persona the provider reports, held outside the mock factory so a case can change it.
 *
 * `useActiveUser()` is read beside the service, and the screen's "assign to me" control is enabled
 * exactly when a persona exists and does not already own the exception — so a case that wants the
 * disabled control sets this to `null` rather than reaching into the screen.
 */
const session = vi.hoisted(() => ({ activeUser: null as ActiveUser | null }));

/**
 * The provider replaced before the screen is imported, so the real binding — and with it the
 * in-browser adapter — is never reached from a component test (rule P-2).
 *
 * Every hook the rendered tree can reach is exported, not only the ones the screen calls:
 * `evidence-drawer.tsx` reads `useService()`, the shell's provider is stubbed as a pass-through, and
 * the demonstration capability is stubbed with the module's own "none bound" value so a component that
 * starts reading it finds a shape rather than `undefined`.
 */
vi.mock('../../services/service-provider', () => ({
  useService: () => port,
  useActiveUser: () => session.activeUser,
  useDemonstration: () => null,
  ServiceProvider: ({ children }: { children: ReactNode }) => children,
}));

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/** The route the screen is mounted at: one exception, named by the fixture's identifier. */
const SCREEN_ROUTE = `/exceptions/${EXCEPTION_ID}`;

/** The route each control is asserted to reach, rendered as a probe rather than driven into. */
const PROBE = {
  scenarios: 'Scenario comparison probe',
  assistant: 'Evidence assistant probe',
  queue: 'Exception queue probe',
} as const;

/**
 * Renders the screen as the shell mounts it: at its own route, inside a cache of its own, with a probe
 * at each route a control navigates to.
 *
 * The cache is fresh per render and its retries are off, so a refusal fails the same way however often
 * it is repeated and one case cannot read another's cached payload. The probes are what let navigation
 * be asserted through the visible interface: a case activates a control and finds the heading a reader
 * would arrive at, rather than inspecting a router's internals.
 */
function renderScreen(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  render(
    <MemoryRouter initialEntries={[SCREEN_ROUTE]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/exceptions/:exceptionId" element={<InvestigationScreen />} />
          <Route path="/exceptions/:exceptionId/scenarios" element={<h1>{PROBE.scenarios}</h1>} />
          <Route path="/assistant" element={<h1>{PROBE.assistant}</h1>} />
          <Route path="/exceptions" element={<h1>{PROBE.queue}</h1>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/** Waits for the header the healthy payload renders, which is the screen's settled state. */
async function settledScreen(): Promise<HTMLElement> {
  return screen.findByRole('heading', { level: 1, name: EXCEPTION.title });
}

/**
 * The item at a position, or a failure naming what was missing.
 *
 * `noUncheckedIndexedAccess` makes every indexed read a possible absence, and a case that reached for a
 * missing row would otherwise compare against `undefined` and report the wrong thing.
 */
function at<T>(items: readonly T[], index: number, what: string): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`the ${what} at position ${String(index)} is missing`);
  }

  return item;
}

/** Collapses a string's runs of whitespace, so a rendered line compares as one run of words. */
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
 * A chart mark's accessible name is composed from the series label, the date and the reading, so an
 * exact string would be hostage to the separator between them; the pattern keeps the assertion
 * readable in a failure by naming the text it looked for.
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

/**
 * The status indicator whose label is the given text, found inside the region that holds it.
 *
 * Rule B-3 requires a status to reach a reader as an icon *and* a label, so the assertion is made on
 * the indicator's own subtree — its decorative icon and the label node beside it — rather than on the
 * screen at large, where another region's icon could satisfy it.
 */
function indicatorFor(scope: HTMLElement, label: string): HTMLElement {
  const labelNode = within(scope).getByText(label);
  const indicator = labelNode.parentElement;

  if (indicator === null) {
    throw new Error(`the indicator carrying “${label}” has no parent element`);
  }

  return indicator;
}

/** Asserts that one status is an icon and a visible label inside the same indicator (rule B-3). */
function expectStatusOf(scope: HTMLElement, label: string): void {
  const indicator = indicatorFor(scope, label);
  const labelNode = within(indicator).getByText(label);

  expect(labelNode.className.split(' ')).toEqual(
    expect.arrayContaining(STATUS_LABEL_CLASS.split(' ')),
  );
  expect(indicator.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
}

/**
 * Tabs until the given control has focus, failing when it is never reached.
 *
 * Rule B-3 requires every interactive element to be reachable by keyboard, and `Tab` is the only way a
 * reader gets there, so a control is reached the way a reader reaches it rather than by calling
 * `focus()` on it.
 */
async function tabTo(
  user: ReturnType<typeof userEvent.setup>,
  target: HTMLElement,
  limit = 40,
): Promise<void> {
  for (let step = 0; step < limit; step += 1) {
    if (document.activeElement === target) {
      return;
    }

    await user.tab();
  }

  throw new Error('the control was not reached by tabbing');
}

/* ---------------------------------------------------------------------------------------------
 * Readings derived from the fixture, so no case retypes one
 * ------------------------------------------------------------------------------------------- */

/** The position of the reading below zero, which is the one the chart must not clamp. */
const NEGATIVE_INDEX = 1;

/** The label the screen gives the record's own severity, capitalised as the record spells it. */
const SEVERITY_LABEL = 'High';

/** The label the screen gives the record's own status, capitalised the same way. */
const STATUS_LABEL = 'Open';

/** The label the screen gives the confidence level, capitalised the same way. */
const CONFIDENCE_LABEL = 'Medium';

/**
 * The projection's caption, composed from the dates the series itself carries.
 *
 * The payload states no window label, so the screen composes the caption from the first and last
 * readings it was handed. The case derives the same string from the same fixture rather than typing a
 * window of its own (rule P-6).
 */
const PROJECTION_CAPTION = `${INVESTIGATION_TEXT.projectionPrefix} from ${at(SERIES, 0, 'first reading').date} to ${at(SERIES, SERIES.length - 1, 'last reading').date}`;

/** The focus-ring utilities the shared control structure names, taken from it rather than retyped. */
const FOCUS_RING_CLASSES = CONTROL_STRUCTURE_CLASSES.split(' ').filter((token) =>
  token.startsWith('focus-visible:'),
);

/** The two themes and the two densities specification §4.3 fixes, paired so a case covers each once. */
const APPEARANCES = [
  { theme: 'command', density: 'compact' },
  { theme: 'paper', density: 'comfortable' },
] as const;

/**
 * The two conditions that leave "assign to me" disabled, each with the persona the session acts as,
 * the owner the record states and the sentence the reader receives with the control.
 *
 * The sentences are read from the screen's own text map rather than retyped, and the already-owner
 * member is the `ALREADY_OWNER_REASON` constant the exception queue renders too — one sentence with
 * one owner for one condition (rule P-8), which this case proves reaches a reader of both screens.
 */
const DISABLED_ASSIGN_CONDITIONS = [
  {
    condition: 'the session reports no acting persona',
    actingUser: null,
    ownerId: OWNER_ID,
    reason: INVESTIGATION_TEXT.assignUnavailable,
  },
  {
    condition: 'the acting persona already owns the exception',
    actingUser: ACTIVE_USER,
    ownerId: ACTOR_ID,
    reason: ALREADY_OWNER_REASON,
  },
] as const;

/**
 * The projection's drawn surface, found by the name it is announced with.
 *
 * `LineChart` names the surface from the series it draws, so the baseline's own label is what locates
 * it: no case reaches for an element by its tag or its class.
 */
function chartSurface(): HTMLElement {
  return screen.getByRole('group', {
    name: patternOf(INVESTIGATION_TEXT.baselineSeriesLabel),
  });
}

/** Whether the projection's surface is on screen at all. */
function projectionSurfaceIsDrawn(): boolean {
  return (
    screen.queryByRole('group', {
      name: patternOf(INVESTIGATION_TEXT.baselineSeriesLabel),
    }) !== null
  );
}

/* ---------------------------------------------------------------------------------------------
 * Per-case state
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  for (const member of Object.values(port)) {
    member.mockReset();
  }

  port.getExceptionDetail.mockResolvedValue(envelope(HEALTHY));
  port.getScenarioSet.mockResolvedValue(optionsEnvelope());
  port.getEvidence.mockResolvedValue(evidenceEnvelope());
  port.assignException.mockResolvedValue({
    data: { ...EXCEPTION, ownerId: ACTOR_ID },
    meta: { freshness: [...FRESH_SOURCES], simulated: true, traceId: TRACE_ID },
  });
  port.noteException.mockResolvedValue({
    data: EXCEPTION,
    meta: { freshness: [...FRESH_SOURCES], simulated: true, traceId: TRACE_ID },
  });

  session.activeUser = ACTIVE_USER;
});

/** Leaves `<html>` on the theme and density of whichever suite runs next, and no persona behind. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-density');
  session.activeUser = null;
});

/* ---------------------------------------------------------------------------------------------
 * The suite
 * ------------------------------------------------------------------------------------------- */

describe('SCR-03 investigation screen', () => {
  describe('the header', () => {
    it('renders the exception’s own title as the page’s one level-one heading, identified in the mono face', async () => {
      renderScreen();

      expect(await settledScreen()).toBeVisible();
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

      // The identifier is a record value set in the tabular mono face (AAP §0.5.3, rule P-6).
      const identifier = screen.getByText(EXCEPTION_ID);
      expect(identifier.className.split(' ')).toEqual(
        expect.arrayContaining(MONO_VALUE_CLASSES.base.split(' ')),
      );

      // One read of the detail, and the option set beside it for the projection's second series.
      expect(port.getExceptionDetail).toHaveBeenCalledWith(EXCEPTION_ID);
      expect(port.getScenarioSet).toHaveBeenCalledWith(EXCEPTION_ID);
    });

    it('states severity and status as an icon and a visible label, and the owner as a recorded identifier', async () => {
      renderScreen();
      await settledScreen();

      const facts = screen.getByRole('region', { name: INVESTIGATION_TEXT.factsGroup });

      expect(within(facts).getByText(INVESTIGATION_TEXT.severityLabel)).toBeVisible();
      expectStatusOf(facts, SEVERITY_LABEL);

      expect(within(facts).getByText(INVESTIGATION_TEXT.statusLabel)).toBeVisible();
      expectStatusOf(facts, STATUS_LABEL);

      // The owner is the record's own identifier rather than a name this screen resolved.
      expect(within(facts).getByText(INVESTIGATION_TEXT.ownerLabel)).toBeVisible();
      expect(within(facts).getByText(EXCEPTION.ownerId)).toBeVisible();
    });

    it('labels the days-to-impact figure on the figure itself and opens its evidence from the keyboard', async () => {
      const user = userEvent.setup();

      renderScreen();
      await settledScreen();

      const tile = screen.getByRole('region', { name: INVESTIGATION_TEXT.daysToImpactLabel });

      // The label is read inside this one figure, so a page-level badge could not satisfy it (rule P-1).
      expect(within(tile).getAllByText(CALCULATION_LABEL)).toHaveLength(1);

      const trigger = within(tile).getByRole('button');
      expect(trigger).toHaveTextContent(String(EXCEPTION.daysToImpact));

      await tabTo(user, trigger);
      expect(trigger).toHaveFocus();
      await user.keyboard('{Enter}');

      const drawer = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });
      // The drawer prints the reference the figure carried, so the record behind it is named.
      expect(within(drawer).getAllByText(EXCEPTION_ID).length).toBeGreaterThan(0);
      expect(port.getEvidence).toHaveBeenCalledWith(EXCEPTION_ID);

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(trigger).toHaveFocus();
    });
  });

  describe('the impact chain', () => {
    it('renders one focusable control per node, each named for the record it opens', async () => {
      renderScreen();
      await settledScreen();

      const chain = screen.getByRole('list', { name: IMPACT_CHAIN_TEXT.regionLabel });
      const controls = within(chain).getAllByRole('button');

      expect(controls).toHaveLength(IMPACT_CHAIN.length);

      IMPACT_CHAIN.forEach((node, index) => {
        const control = at(controls, index, 'chain node');

        // The four node kinds are all controls, and each carries its own identifier in its name.
        expect(control).toHaveAccessibleName(patternOf(node.ref));
        expect(within(chain).getByText(IMPACT_CHAIN_KIND_LABELS[node.kind])).toBeVisible();
      });
    });

    it('opens each node’s own evidence from the keyboard and returns focus to the node on Escape', async () => {
      const user = userEvent.setup();

      renderScreen();
      await settledScreen();

      const chain = screen.getByRole('list', { name: IMPACT_CHAIN_TEXT.regionLabel });
      const controls = within(chain).getAllByRole('button');

      for (const [index, node] of IMPACT_CHAIN.entries()) {
        const control = at(controls, index, 'chain node');

        await tabTo(user, control);
        expect(control).toHaveFocus();

        port.getEvidence.mockClear();
        await user.keyboard('{Enter}');

        const drawer = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });
        // That node's reference, not the chain's first and not a shared one.
        expect(within(drawer).getAllByText(node.ref).length).toBeGreaterThan(0);
        expect(port.getEvidence).toHaveBeenCalledWith(node.ref);

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(control).toHaveFocus();
      }
    });

    it('renders a node with no evidence reference as static text, with no focus stop', async () => {
      const unopened: ImpactChainNode = {
        ref: '',
        kind: 'material',
        label: 'Fixture record with nothing behind it',
        detail: 'the record states no reference to open',
      };

      port.getExceptionDetail.mockResolvedValue(envelope(detail({ impactChain: [unopened] })));

      renderScreen();
      await settledScreen();

      const chain = screen.getByRole('list', { name: IMPACT_CHAIN_TEXT.regionLabel });

      // A control that could open nothing must not reach a reader (rule P-8).
      expect(within(chain).queryAllByRole('button')).toHaveLength(0);
      expect(within(chain).getByText(unopened.label)).toBeVisible();
    });
  });

  describe('the projected stock', () => {
    it('labels the zero reference and names every reading the records state, a negative one included', async () => {
      renderScreen();
      await settledScreen();

      const chart = chartSurface();

      // The zero level is the axis's own and is labelled in the screen's words.
      expect(within(chart).getByText(INVESTIGATION_TEXT.zeroReferenceLabel)).toBeVisible();

      const marks = within(chart).getAllByRole('button');
      expect(marks).toHaveLength(SERIES.length);

      SERIES.forEach((point, index) => {
        const mark = at(marks, index, 'projection mark');

        expect(mark).toHaveAccessibleName(
          patternOf(
            `${INVESTIGATION_TEXT.baselineSeriesLabel}, ${point.date}: ${String(point.units)}`,
          ),
        );
      });

      // A reading below zero is drawn and named rather than clamped. T-03's never-below-zero property
      // is the solver's, and it is asserted against the solver's own series in
      // `e2e/s1-investigation.spec.ts`, never against this chart.
      const negative = at(SERIES, NEGATIVE_INDEX, 'negative reading');
      expect(negative.units).toBeLessThan(0);
      expect(
        within(chart).getByRole('button', { name: patternOf(String(negative.units)) }),
      ).toBeVisible();
    });

    it('shades the idle window the record’s own zero closing days span, and names it', async () => {
      port.getExceptionDetail.mockResolvedValue(
        envelope(detail({ stockSeries: [...IDLE_WINDOW_SERIES] })),
      );

      renderScreen();
      await settledScreen();

      const chart = chartSurface();
      const bands = Array.from(chart.querySelectorAll('rect'));

      // One span, drawn across the plot from the first zero closing day to the last (AAP 0.12.4).
      expect(bands).toHaveLength(1);

      const band = at(bands, 0, 'shaded idle window');
      expect(Number(band.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(band.getAttribute('height'))).toBeGreaterThan(0);

      // The span carries the screen's own words, so it is not left to the shade alone (rule B-3).
      expect(within(chart).getByText(INVESTIGATION_TEXT.idleWindowLabel)).toBeVisible();
    });

    it('shades no idle window where no closing day reads zero', async () => {
      port.getExceptionDetail.mockResolvedValue(
        envelope(detail({ stockSeries: [...STOCK_ALL_WINDOW_SERIES] })),
      );

      renderScreen();
      await settledScreen();

      const chart = chartSurface();

      // A window with stock on hand every day states no idle span, so nothing is shaded and nothing
      // claims one (rule P-6).
      expect(chart.querySelectorAll('rect')).toHaveLength(0);
      expect(within(chart).queryByText(INVESTIGATION_TEXT.idleWindowLabel)).toBeNull();
    });

    it('replaces the projection with a table of the same dates and readings, and back, from the keyboard', async () => {
      const user = userEvent.setup();

      renderScreen();
      await settledScreen();

      const showTable = screen.getByRole('button', {
        name: `${VIEW_AS_TABLE_LABELS.showTable}: ${PROJECTION_CAPTION}`,
      });

      await tabTo(user, showTable);
      expect(showTable).toHaveFocus();
      await user.keyboard('{Enter}');

      const table = screen.getByRole('table', { name: PROJECTION_CAPTION });

      expect(within(table).getAllByRole('columnheader').map(collapsedTextOf)).toEqual([
        DATE_COLUMN_HEADER,
        INVESTIGATION_TEXT.baselineSeriesLabel,
      ]);

      const rows = within(table).getAllByRole('row').slice(1);
      expect(rows).toHaveLength(SERIES.length);

      SERIES.forEach((point, index) => {
        const cells = within(at(rows, index, 'table row')).getAllByRole('cell');

        expect(at(cells, 0, 'date cell')).toHaveTextContent(point.date);
        expect(at(cells, 1, 'reading cell')).toHaveTextContent(String(point.units));
      });

      // The surface is unmounted rather than hidden, so no focus stop survives inside a chart that is
      // no longer shown.
      expect(projectionSurfaceIsDrawn()).toBe(false);

      const showChart = screen.getByRole('button', {
        name: `${VIEW_AS_TABLE_LABELS.showChart}: ${PROJECTION_CAPTION}`,
      });

      await tabTo(user, showChart);
      await user.keyboard('{Enter}');

      expect(screen.queryByRole('table', { name: PROJECTION_CAPTION })).toBeNull();
      expect(projectionSurfaceIsDrawn()).toBe(true);
    });

    it('states the designated option’s run-out under the figure’s title as the day and its half-day reading', async () => {
      port.getScenarioSet.mockResolvedValue(optionsEnvelope(DESIGNATED_OPTION));

      renderScreen();
      await settledScreen();

      /* AAP §0.8 requires the run-out pair rendered as "the day plus a half-day reading such as
         'midday'", and the sentence names the option it belongs to, so a reader of the projection knows
         whose supply runs out and when inside that day. */
      expect(screen.getByText(OPTION_DESCRIPTION)).toBeVisible();
    });

    it('states no run-out reading where the set designates no option', async () => {
      port.getScenarioSet.mockResolvedValue(optionsEnvelope(UNDESIGNATED_OPTION));

      renderScreen();
      await settledScreen();

      /* The set holds the option and its pair, but nothing designates it, so the projection draws the
         baseline alone and states no reading about an option it does not plot (AAP §0.8). */
      expect(screen.queryByText(OPTION_DESCRIPTION)).toBeNull();
      expect(screen.queryByText(runOutStatement(OPTION_RUN_OUT))).toBeNull();
    });
  });

  describe('the missing inputs and the confidence', () => {
    it('names the inputs the assessment could not read beside the confidence, and still shows the figures', async () => {
      const missing = [
        'the fixture source that did not answer',
        'the fixture document that could not be read',
      ];

      port.getExceptionDetail.mockResolvedValue(envelope(detail({ missingInputs: [...missing] })));

      renderScreen();
      await settledScreen();

      // A source that answered incompletely warns about the data without withholding it.
      expect(await screen.findByText(STATE_BOUNDARY_TEXT.partialHeadline)).toBeVisible();
      expect(
        screen.getByText(patternOf(`${INVESTIGATION_TEXT.partial} ${missing.join(' ')}`)),
      ).toBeVisible();

      const panel = screen.getByRole('region', { name: INVESTIGATION_TEXT.confidenceHeading });

      expect(within(panel).getByText(INVESTIGATION_TEXT.missingInputsLabel)).toBeVisible();
      expect(within(panel).getAllByRole('listitem').map(collapsedTextOf)).toEqual(missing);
      expectStatusOf(panel, CONFIDENCE_LABEL);
      expect(within(panel).getByText(CONFIDENCE.reason)).toBeVisible();

      // The figures the warning is about are still there to be read.
      expect(screen.getByRole('region', { name: INVESTIGATION_TEXT.daysToImpactLabel })).toBeVisible();
      expect(screen.getByText(EXCEPTION.whatChanged)).toBeVisible();
    });

    it('states that no projection can be measured instead of drawing a stand-in figure', async () => {
      const reasons = ['no closing-stock reading was readable for the window'];

      port.getExceptionDetail.mockResolvedValue(
        envelope(detail({ stockSeries: [], missingInputs: [...reasons] })),
      );

      renderScreen();
      await settledScreen();

      const projection = screen.getByRole('region', { name: INVESTIGATION_TEXT.projectionHeading });

      // The fixed words and the payload's own reason, with no series, no reading and no stand-in.
      expect(
        within(projection).getByText(
          patternOf(`${INVESTIGATION_TEXT.cannotCompute}. ${reasons.join(' ')}`),
        ),
      ).toBeVisible();
      expect(projectionSurfaceIsDrawn()).toBe(false);
    });
  });

  describe('the seven states', () => {
    it('shows the busy loading region until the read settles, and no half-read figure beside it', () => {
      port.getExceptionDetail.mockReturnValue(new Promise<Result<ExceptionDetail>>(() => {}));

      renderScreen();

      const region = screen.getByRole('status', { name: STATE_BOUNDARY_TEXT.loading });

      expect(region).toBeVisible();
      expect(region).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    });

    it('states the empty sentence when the payload holds no chain, projection or measured order', async () => {
      port.getExceptionDetail.mockResolvedValue(envelope(NOTHING_TO_SHOW));

      renderScreen();

      expect(await screen.findByText(INVESTIGATION_TEXT.empty)).toBeVisible();
      // An empty payload shows the sentence instead of a screen of headings over empty regions.
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    });

    it.each<SourceId>([APPROVAL_GATE_SOURCE, 'transport'])(
      'names the %s source and its as-of time as stale while the figures stay on screen',
      async (source) => {
        port.getExceptionDetail.mockResolvedValue(envelope(HEALTHY, freshnessWith('stale', source)));

        renderScreen();
        await settledScreen();

        // Waiting for the header is also what waits the loading region away: once the read has settled
        // the stale banner is the only live region left.
        const banner = screen.getByRole('status');

        expect(banner).toHaveTextContent(
          `${SOURCE_LABELS[source]}${STATE_BOUNDARY_TEXT.staleSuffix}`,
        );
        expect(banner).toHaveTextContent(STATE_BOUNDARY_TEXT.staleAsOfPrefix);
        // The instant printed is the record's own, never an age derived here (rule P-6).
        expect(banner).toHaveTextContent(AS_OF);

        expect(
          screen.getByRole('region', { name: INVESTIGATION_TEXT.daysToImpactLabel }),
        ).toBeVisible();
      },
    );

    it('reports an unanswered read as offline and repeats the read from its retry control', async () => {
      const user = userEvent.setup();

      port.getExceptionDetail.mockRejectedValueOnce(GENERIC_FAILURE);

      renderScreen();

      expect(await screen.findByText(STATE_BOUNDARY_TEXT.offlineHeadline)).toBeVisible();
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();

      const retry = screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel });

      await tabTo(user, retry);
      expect(retry).toHaveFocus();
      await user.keyboard('{Enter}');

      // The retry repeats the same read, and the record replaces the notice once it answers.
      expect(await settledScreen()).toBeVisible();
      expect(port.getExceptionDetail).toHaveBeenCalledTimes(2);
    });

    it('explains a permission refusal with the permission, the roles that may act and the trace id', async () => {
      port.getExceptionDetail.mockRejectedValue(DENIAL);

      renderScreen();

      const card = await screen.findByRole('region', {
        name: `${FORBIDDEN_TITLE_PREFIX}${REQUIRED_PERMISSION}`,
      });

      expect(within(card).getAllByRole('listitem').map(collapsedTextOf)).toEqual([
        ...ROLES_WITH_PERMISSION,
      ]);
      expect(card).toHaveTextContent(TRACE_ID);

      // Repeating a call the acting role may not make would fail the same way, so no retry is offered
      // and no figure is shown beside the refusal (rule P-8).
      expect(screen.queryByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel })).toBeNull();
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    });

    it('treats a record that moved under the reader as a conflict and offers a reload', async () => {
      const user = userEvent.setup();

      port.getExceptionDetail.mockRejectedValueOnce(MOVED_RECORD);

      renderScreen();

      expect(await screen.findByText(STATE_BOUNDARY_TEXT.conflictHeadline)).toBeVisible();
      expect(screen.getByText(INVESTIGATION_TEXT.conflict)).toBeVisible();
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();

      const reload = screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.reloadLabel });

      await tabTo(user, reload);
      await user.keyboard('{Enter}');

      expect(await settledScreen()).toBeVisible();
      expect(port.getExceptionDetail).toHaveBeenCalledTimes(2);
    });

    it('lands on the panel back to the queue when the identifier answers no record', async () => {
      const user = userEvent.setup();

      port.getExceptionDetail.mockRejectedValue(MISSING_RECORD);

      renderScreen();

      // The union has no member for a record that is not there, so the screen answers with the panel
      // that offers the way back rather than with a blank page.
      expect(
        await screen.findByRole('heading', { level: 1, name: INVESTIGATION_TEXT.notFoundTitle }),
      ).toBeVisible();
      expect(screen.getByText(MISSING_RECORD.message)).toBeVisible();

      const link = screen.getByRole('link', { name: INVESTIGATION_TEXT.notFoundLinkLabel });

      for (const focusClass of FOCUS_RING_CLASSES) {
        expect(link.className.split(' ')).toContain(focusClass);
      }

      await tabTo(user, link);
      expect(link).toHaveFocus();
      await user.keyboard('{Enter}');

      expect(await screen.findByRole('heading', { level: 1, name: PROBE.queue })).toBeVisible();
    });
  });

  describe('the controls', () => {
    it('sends a reader to the comparison for this exception from the primary control, by keyboard', async () => {
      const user = userEvent.setup();

      renderScreen();
      await settledScreen();

      const compare = screen.getByRole('button', { name: INVESTIGATION_TEXT.compareOptions });

      await tabTo(user, compare);
      expect(compare).toHaveFocus();
      await user.keyboard('{Enter}');

      expect(await screen.findByRole('heading', { level: 1, name: PROBE.scenarios })).toBeVisible();
      // Navigating is not a read, so the exception was not fetched again.
      expect(port.getExceptionDetail).toHaveBeenCalledTimes(1);
    });

    it('opens the evidence assistant from the header’s second control', async () => {
      const user = userEvent.setup();

      renderScreen();
      await settledScreen();

      await user.click(screen.getByRole('button', { name: INVESTIGATION_TEXT.askAssistant }));

      expect(await screen.findByRole('heading', { level: 1, name: PROBE.assistant })).toBeVisible();
    });

    it('assigns the exception to the acting persona once and re-reads what the write moved', async () => {
      const user = userEvent.setup();

      renderScreen();
      await settledScreen();

      await user.click(screen.getByRole('button', { name: INVESTIGATION_TEXT.assignToMe }));

      expect(port.assignException).toHaveBeenCalledTimes(1);
      expect(port.assignException).toHaveBeenCalledWith(EXCEPTION_ID, ACTIVE_USER.id);

      expect(await screen.findByText(INVESTIGATION_TEXT.assigned)).toBeVisible();

      // The reads the write moved are invalidated, so the activity beneath it re-reads.
      await waitFor(() => {
        expect(port.getExceptionDetail).toHaveBeenCalledTimes(2);
      });
    });

    it('records a note once, and only once the field holds one, and re-reads the activity', async () => {
      const user = userEvent.setup();
      const note = 'The fixture supplier confirmed the moved date.';

      renderScreen();
      await settledScreen();

      await user.click(screen.getByRole('button', { name: INVESTIGATION_TEXT.addNote }));

      const field = screen.getByLabelText(INVESTIGATION_TEXT.noteField);
      const record = screen.getByRole('button', { name: INVESTIGATION_TEXT.recordNote });

      // Nothing is sent while the field is empty, and the control says why it cannot act (rule P-8).
      expect(record).toHaveAttribute('aria-disabled', 'true');
      expect(record).toHaveAccessibleDescription(INVESTIGATION_TEXT.noteRequired);

      await user.click(record);
      expect(port.noteException).not.toHaveBeenCalled();

      await user.type(field, note);

      /* The control is queried again after typing: while the field is empty the button is wrapped by
         the tooltip that explains why it cannot act, and the enabled control replaces that whole
         wrapper, so the node captured before typing is no longer the one on screen. */
      await user.click(screen.getByRole('button', { name: INVESTIGATION_TEXT.recordNote }));

      expect(port.noteException).toHaveBeenCalledTimes(1);
      expect(port.noteException).toHaveBeenCalledWith(EXCEPTION_ID, note);

      expect(await screen.findByText(INVESTIGATION_TEXT.noted)).toBeVisible();

      await waitFor(() => {
        expect(port.getExceptionDetail).toHaveBeenCalledTimes(2);
      });
    });

    it.each(DISABLED_ASSIGN_CONDITIONS)(
      'explains a control that cannot act when $condition, from the keyboard, without performing it',
      async ({ actingUser, ownerId, reason }) => {
        const user = userEvent.setup();

        session.activeUser = actingUser;
        port.getExceptionDetail.mockResolvedValue(
          envelope(detail({ exception: { ...EXCEPTION, ownerId } })),
        );

        renderScreen();
        await settledScreen();

        const assign = screen.getByRole('button', { name: INVESTIGATION_TEXT.assignToMe });

        expect(assign).toHaveAttribute('aria-disabled', 'true');

        await tabTo(user, assign);
        expect(assign).toHaveFocus();
        // The reason is the control's own description, so it reaches a reader the moment focus arrives.
        expect(assign).toHaveAccessibleDescription(reason);

        await user.keyboard('{Enter}');
        expect(port.assignException).not.toHaveBeenCalled();
      },
    );
  });

  describe('both themes', () => {
    it.each(APPEARANCES)(
      'renders the same content under the $theme theme at $density density',
      async ({ theme, density }) => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-density', density);

        renderScreen();
        await settledScreen();

        // What a case asserts is what a reader receives, never a colour: the themes differ in token
        // values and no reading of the screen depends on one of them.
        expect(screen.getByText(EXCEPTION.whatChanged)).toBeVisible();
        expect(screen.getByRole('list', { name: IMPACT_CHAIN_TEXT.regionLabel })).toBeVisible();
        expect(projectionSurfaceIsDrawn()).toBe(true);
        expect(screen.getByRole('table', { name: INVESTIGATION_TEXT.ordersCaption })).toBeVisible();
        expect(
          screen.getByRole('region', { name: INVESTIGATION_TEXT.confidenceHeading }),
        ).toBeVisible();
      },
    );
  });
});
