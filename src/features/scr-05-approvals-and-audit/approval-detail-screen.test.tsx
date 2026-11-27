/**
 * Component suite for `approval-detail-screen.tsx`, the approval detail of SCR-05.
 *
 * WHAT IT PROVES. The decision gate (acceptance test `T-07`): all three decisions stay disabled
 * without a comment, each with a reason a reader can reach by keyboard and read as text rather than
 * a `title` attribute; a comment releases reject and request changes while approve waits for every
 * side effect to be acknowledged; each decision then reaches the port once, with its own `Decision`
 * member and the trimmed comment, and the screen re-reads the record instead of writing it locally.
 * The stale gate (`T-13`): with the gating source not current, the boundary's banner names the source
 * and its instant and all three decisions are disabled with a reason naming the same two values —
 * both halves of one rule, in one test — and a disabled decision never reaches the service. The
 * detail's content: the plan summary, both euro members through the one money formatter, the missing
 * inputs and the write-back preview with the fixed tag. The two failure explanations the port can
 * return: a permission refusal through the forbidden card, and a policy refusal that names the rule
 * and leaves the decisions disabled. The decided approval: the tracker's steps in the record's own
 * order and the outcome card's two columns, and the caption that stands in when no resulting record
 * arrives. The seven screen states (`T-17`) and the accessibility contract (`T-16`): one level-one
 * heading, every decision reachable by `Tab` and operable by `Enter` and `Space`, a programmatically
 * labelled comment field, an `aria-pressed` acknowledgement, and the same structure in both themes.
 *
 * WHERE THE DATA COMES FROM — rule P-2. The service is mocked at `service-provider.tsx`, the one
 * boundary the screen and the shared components are allowed to read through, so no seed module, no
 * adapter and no HTTP client is involved and the suite observes exactly the calls the screen makes.
 * Everything else is the real component — `StateBoundary`, `ActionButton`, `DataTable`, `MonoValue`,
 * `EvidenceRef`, `StatusIndicator`, `Card`, `Panel`, the tracker and the outcome card — because what
 * a reader receives is the thing under test.
 *
 * THE FIXTURE CONSTRAINT — rule P-6. `tests/source-checks/no-typed-figures.test.ts` scans
 * `src/features/**`, this file included, for currency literals and for literals shaped like a domain
 * record identifier, so every reference here is an opaque placeholder (`approval-under-test`,
 * `plant-alpha`, `scenario-planned`, `record-alpha`) and no amount is written with a currency marker.
 * The euro members are the plain integers a record holds; they are the fixtures' own values, never a
 * figure a screen computes, and no displayed figure is compared against a literal typed here — the
 * amounts are asserted through {@link formatMoney} and the outcome columns through the values the
 * `SolverResult` fixtures carry. Plain integers a component test cannot avoid — a step's `sequence`,
 * a count of units — are not figures a reader could mistake for a computed measure, and the check
 * does not flag them, so there is no collision to report there.
 *
 * WHY {@link formatMoney} IS REBUILT HERE RATHER THAN IMPORTED. `mono-value.tsx` exports the
 * interface's one money formatter, and importing it would make every amount assertion agree with the
 * component's formatter by construction — the test would pass even if that formatter had drifted to
 * another locale, another currency or another fraction range. This suite therefore recomputes the
 * presentation from the options `platform-contracts.md` §1 and AAP §0.8 document, so a change to the
 * component's formatter fails here instead of being silently accepted, and the presentation is never
 * embedded as a formatted literal.
 *
 * GAPS REPORTED RATHER THAN RESOLVED.
 * - `Approval` carries no plant member, so the screen reads the plant the plan lands on from
 *   `getExceptionDetail().exception.plantId`. The suite proves the acknowledgement's accessible name
 *   comes from that record — not from this file — by rendering a second plant and asserting the name
 *   follows it.
 * - The port's `decideApproval` carries no side-effect acknowledgement member, so the acknowledgement
 *   is a screen-side gate on approve. The suite asserts what the screen owes: approve stays disabled
 *   until every acknowledgement is given, and nothing else about the decision changes.
 * - Neither `Approval` nor `SolverResult` carries a "resulting" measure, so "the service supplies no
 *   resulting record" is expressed the only way the port can express it: a rejected
 *   `getApprovalOutcome`. The suite asserts the caption that stands in and that no zero-valued row
 *   appears in its place.
 * - Two symbols are imported from modules outside the plan's `depends_on_files` list for this file:
 *   `STATE_BOUNDARY_TEXT` from `../../components/state-boundary` and `OUTCOME_CARD_TEXT` from
 *   `./outcome-card`. Both own strings this suite has to assert — the stale banner's headline and
 *   the outcome card's column headings — and re-spelling them here would be a second copy of fixed
 *   text that could drift from the component that renders it. The agent prompt requires the real
 *   components to be rendered rather than mocked, so their constants are imported rather than
 *   restated, and nothing is written to either module.
 * - `tests/source-checks/no-typed-figures.test.ts` and `tests/source-checks/forbidden-strings.test.ts`
 *   are not in the tree at the time this suite is written; other lanes of this batch own them. The
 *   suite is written to their stated contract rather than around them, and the only source check
 *   present — `no-secrets.test.ts` — is run over this file as part of the validation.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock, touches the network or reaches outside the service boundary.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STATE_BOUNDARY_TEXT } from '../../components/state-boundary';
import {
  APPROVAL_GATE_SOURCE,
  DEMO_CLOCK,
  SIM_LABELS,
  SOURCE_IDS,
  SOURCE_LABELS,
} from '../../types';
import type {
  Approval,
  ApprovalOutcome,
  ExceptionDetail,
  Freshness,
  FreshnessState,
  Permission,
  PlantId,
  PolicyId,
  Problem,
  Result,
  Role,
  Scenario,
  ScenarioSet,
  Scope,
  SideEffect,
  SolverResult,
  Timestamp,
  WriteBack,
} from '../../types';
import {
  APPROVAL_DETAIL_TEXT,
  ApprovalDetailScreen,
  sideEffectAcknowledgement,
} from './approval-detail-screen';
import { OUTCOME_CARD_TEXT } from './outcome-card';
import { WRITE_BACK_TAG } from './write-back-tracker';

/* ---------------------------------------------------------------------------------------------
 * The fixtures — every value a record's own, and none of them a typed figure
 * ------------------------------------------------------------------------------------------- */

/** The approvals route the shell declares, so the harness opens the detail through it. */
const APPROVALS_ROUTE = '/approvals';

/** The correlation identifier every successful read of these fixtures carries. */
const TRACE_ID = 'trace-approval-detail';

/** The instant the sources last answered: the demonstration clock's own, never typed here. */
const AS_OF: Timestamp = DEMO_CLOCK;

/** The identifier the harness puts in the route, and the approval every fixture reads. */
const APPROVAL_ID = 'approval-under-test';

/** The exception the plan answers, as the approval record names it. */
const EXCEPTION_ID = 'exception-under-test';

/** The option under approval. */
const SCENARIO_ID = 'scenario-planned';

/** The option's name, which the plan summary prints beside its identifier. */
const SCENARIO_NAME = 'Planned option';

/** The persona who requested the plan. */
const REQUESTER_ID = 'persona-requester';

/** The persona who decided it, in the approved fixture. */
const DECIDER_ID = 'persona-decider';

/** The plant the plan lands on, which is the record's own and not this file's. */
const PLANT_ID: PlantId = 'plant-alpha';

/** A second plant, used to prove the acknowledgement's name follows the record. */
const OTHER_PLANT_ID: PlantId = 'plant-beta';

/** A write-back step's own record references: opaque placeholders, not record identifiers. */
const WRITE_BACK_REFS = ['record-alpha', 'record-beta', 'record-gamma'] as const;

/** The kit counts and value the side effects defer: plain integers a record holds. */
const SIDE_EFFECT_KITS = 900;
const SIDE_EFFECT_VALUE = 108000;
const SIDE_EFFECT_DAYS = 10;

/** The plan's added cost and the revenue it protects: plain integers, asserted through the formatter. */
const ADDED_COST = 5000;
const PROTECTED_REVENUE = 12000;

/** The units the plan leaves late, and the units the records left late afterwards. */
const PLANNED_UNITS_LATE = 5;
const RESULTING_UNITS_LATE = 2;

/** The inputs the impact assessment could not read, as the exception's record states them. */
const MISSING_INPUTS = ['missing input alpha', 'missing input beta'] as const;

/**
 * The clock's own date and offset with a given hour.
 *
 * Instants are derived from `DEMO_CLOCK` rather than written out, so the suite holds no typed date
 * and a change of the demonstration clock reaches every instant here at once.
 */
function instantAt(hour: number): Timestamp {
  return `${DEMO_CLOCK.slice(0, 11)}${String(hour).padStart(2, '0')}${DEMO_CLOCK.slice(13)}`;
}

/** The instant the stale fixture's gating source last answered: the clock's own, an hour earlier. */
const STALE_AS_OF = instantAt(Number(DEMO_CLOCK.slice(11, 13)) - 2);

/** The display name the gating source carries, read from the one map that fixes it. */
const GATE_LABEL = SOURCE_LABELS[APPROVAL_GATE_SOURCE];

/** The scope the shell hands the screen: the unfiltered "all plants, all products" selection. */
const SCOPE: Scope = { plants: [], products: [] };

/** The roles the record names as able to decide the plan. */
const APPROVER_ROLES: readonly Role[] = ['plant-manager', 'head-of-supply-chain'];

/** The permission a decision requires, typed so a wrong name fails compilation. */
const DECISION_PERMISSION: Permission = 'approval.decide';

/** The policy the fixture's refusal names, an opaque placeholder rather than a rule identifier. */
const POLICY_ID: PolicyId = 'policy-blocking';

/** The sentence the fixture's policy refusal states, in the service's own words. */
const POLICY_REASON = 'A rule refuses a decision while the deferred supply stands unacknowledged.';

/** The alternative that rule permits, which the block panel prints beside the reason. */
const POLICY_ALTERNATIVE = 'Acknowledge the deferred supply and raise the decision again.';

/** The audit event the fixture's policy refusal appended. */
const REFUSAL_EVENT_ID = 'event-refusal';

/** The correlation identifier of the fixture's refusals. */
const REFUSAL_TRACE_ID = 'trace-refusal';

/** The sentence the port reports when no resulting measurement follows the plan. */
const OUTCOME_UNAVAILABLE_MESSAGE = 'The write-back has not run, so no measurement follows it.';

/**
 * The six sources' state at the moment of one call, with the gating source set as given.
 *
 * The other five stay `fresh` in every variant, so only the gating source's state can change what
 * the screen derives: `stale` raises the banner, `unavailable` is the offline rendering and `partial`
 * is the partial notice.
 */
function freshnessOf(state: FreshnessState, asOf: Timestamp): readonly Freshness[] {
  return SOURCE_IDS.map((source): Freshness => ({
    source,
    asOf: source === APPROVAL_GATE_SOURCE ? asOf : AS_OF,
    state: source === APPROVAL_GATE_SOURCE ? state : 'fresh',
  }));
}

/** Every source fresh: the state the happy-path cases run in. */
const FRESH = freshnessOf('fresh', AS_OF);

/** One measurement a `SolverResult` carries, built once and spread by the fixtures below. */
function solverResult(unitsLate: number, addedCostEur: number): SolverResult {
  return {
    unitsLate,
    maxDaysLate: 3,
    ordersOnTime: 2,
    ordersTotal: 4,
    addedCostEur,
    lineIdleDays: 1.5,
    revenueDelayedEur: 9000,
    runOut: { day: 4, fractionOfDay: 0.5 },
    dailyClosingStock: [],
    orders: [],
    constraintCheck: 'pass',
    constraintMessages: [],
    sideEffects: [],
    writeBacks: [],
    levers: { airSets: 0, transferSets: 0 },
    confidence: { level: 'high', reason: 'The assessment read every order it measures.' },
  };
}

/** The side effects the plan defers another product's supply for: two, so "every" can be asserted. */
const SIDE_EFFECTS = [
  {
    productId: 'product-alpha',
    kitsDelayed: SIDE_EFFECT_KITS,
    valueDeferredEur: SIDE_EFFECT_VALUE,
    daysDeferred: SIDE_EFFECT_DAYS,
  },
  {
    productId: 'product-beta',
    kitsDelayed: SIDE_EFFECT_KITS + 1,
    valueDeferredEur: SIDE_EFFECT_VALUE + 1,
    daysDeferred: SIDE_EFFECT_DAYS + 1,
  },
] as const satisfies readonly SideEffect[];

/**
 * The write-back steps the approval carries, in the order the record states them.
 *
 * Three steps, each with its own description and reference, so the preview and the tracker can be
 * asserted item by item in that order rather than merely counted.
 */
const WRITE_BACKS = [
  {
    sequence: 1,
    system: 'erp',
    recordRef: WRITE_BACK_REFS[0],
    description: 'Release the delayed supply order',
    state: 'pending',
  },
  {
    sequence: 2,
    system: 'mes',
    recordRef: WRITE_BACK_REFS[1],
    description: 'Re-sequence the consuming line',
    state: 'pending',
  },
  {
    sequence: 3,
    system: 'scheduling',
    recordRef: WRITE_BACK_REFS[2],
    description: 'Move the transfer window',
    state: 'pending',
  },
] as const satisfies readonly WriteBack[];

/** A copy of the steps, so a screen that mutated its record could not reach the fixtures. */
function writeBackCopies(): WriteBack[] {
  return WRITE_BACKS.map((step) => ({ ...step }));
}

/**
 * The approval under test, pending.
 *
 * A fresh object per call, because `Approval.writeBacks` is a mutable array the adapter replaces in
 * place: handing the same instance to two renders would let one case see the other's record.
 */
function pendingApproval(): Approval {
  return {
    id: APPROVAL_ID,
    exceptionId: EXCEPTION_ID,
    scenarioId: SCENARIO_ID,
    requestedBy: REQUESTER_ID,
    eligibleApproverRoles: [...APPROVER_ROLES],
    status: 'pending',
    addedCostEur: ADDED_COST,
    protectedRevenueEur: PROTECTED_REVENUE,
    writeBacks: writeBackCopies(),
    outcomeReviewed: false,
  };
}

/** The same approval after it was approved, with the decision the record keeps. */
function approvedApproval(): Approval {
  return {
    ...pendingApproval(),
    status: 'approved',
    decision: { action: 'approve', comment: 'plan accepted' },
    decidedBy: DECIDER_ID,
    decidedAt: AS_OF,
    writeBacks: writeBackCopies().map((step) => ({ ...step, state: 'succeeded' as const })),
  };
}

/** The plan's own option: its name, its identity, and the side effects an approver must acknowledge. */
const SCENARIO: Scenario = {
  ...solverResult(PLANNED_UNITS_LATE, ADDED_COST),
  id: SCENARIO_ID,
  exceptionId: EXCEPTION_ID,
  name: SCENARIO_NAME,
  origin: 'solver',
  sideEffects: SIDE_EFFECTS.map((sideEffect) => ({ ...sideEffect })),
};

/** The option set the service returns for the exception the approval names. */
const SCENARIO_SET: ScenarioSet = {
  exceptionId: EXCEPTION_ID,
  scenarios: [SCENARIO],
  recommendedId: SCENARIO_ID,
  recommendationRule: 'The option with the fewest units late, then the lowest added cost.',
  tradeOff: 'The plan spends the added cost to hold the revenue it protects.',
  rejected: [],
};

/**
 * The exception behind the plan, with the given plant.
 *
 * The plant is a parameter because it is the record the acknowledgement's accessible name is built
 * from, and one case renders a second plant to prove the name follows it.
 */
function exceptionDetail(plantId: PlantId = PLANT_ID): ExceptionDetail {
  return {
    exception: {
      id: EXCEPTION_ID,
      title: 'Supply delay on a material',
      type: 'supply-delay',
      severity: 'critical',
      status: 'open',
      plantId,
      alsoAffectsPlantIds: [],
      materialId: 'material-alpha',
      supplierId: 'supplier-alpha',
      purchaseOrderId: 'purchase-order-alpha',
      lineId: 'line-alpha',
      ownerId: 'persona-owner',
      daysToImpact: 5,
      affectedLines: [],
      missingInputs: [...MISSING_INPUTS],
      confidence: { level: 'medium', reason: 'One input could not be read.' },
      whatChanged: 'The supply order did not arrive as planned.',
      detectedAt: AS_OF,
    },
    impactChain: [],
    stockSeries: [],
    affectedOrders: [],
    missingInputs: [...MISSING_INPUTS],
    confidence: { level: 'medium', reason: 'One input could not be read.' },
    activity: [],
  };
}

/** The two measurements the outcome card sets side by side, distinct so a swap would be visible. */
const APPROVAL_OUTCOME: ApprovalOutcome = {
  planned: solverResult(PLANNED_UNITS_LATE, ADDED_COST),
  resulting: solverResult(RESULTING_UNITS_LATE, 0),
};

/** The permission refusal the port throws when the acting role may not decide the plan. */
function permissionProblem(): Problem {
  return {
    type: 'permission',
    message: 'This role may not decide this plan.',
    traceId: REFUSAL_TRACE_ID,
    requiredPermission: DECISION_PERMISSION,
    rolesWithPermission: [...APPROVER_ROLES],
  };
}

/** The policy refusal the port throws when a rule denies the decision. */
function policyProblem(): Problem {
  return {
    type: 'policy',
    message: POLICY_REASON,
    traceId: REFUSAL_TRACE_ID,
    policyId: POLICY_ID,
    permittedAlternative: POLICY_ALTERNATIVE,
    auditEventId: REFUSAL_EVENT_ID,
  };
}

/** The failure the port reports when no resulting measurement follows the plan. */
function outcomeProblem(): Problem {
  return {
    type: 'simulated-write-back',
    message: OUTCOME_UNAVAILABLE_MESSAGE,
    traceId: REFUSAL_TRACE_ID,
  };
}

/** The one success envelope the port resolves with, carrying the six sources' report. */
function ok<T>(data: T, freshness: readonly Freshness[] = FRESH): Result<T> {
  return { data, meta: { freshness: [...freshness], simulated: true, traceId: TRACE_ID } };
}

/**
 * The interface's money presentation, rebuilt from the documented options.
 *
 * `platform-contracts.md` §1 fixes a EUR amount with at most two decimals and a thousands separator,
 * read in Europe/Berlin, and `mono-value.tsx` renders it with the code rather than a symbol. This
 * helper deliberately repeats those options instead of importing the component's formatter, so a
 * drift in that formatter fails the assertions below rather than travelling into them — see the file
 * header for the full reason. No amount is embedded as a formatted literal anywhere in this suite.
 */
function formatMoney(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * The amount as a text query compares it.
 *
 * `Intl.NumberFormat` separates an amount from its currency code with a no-break space, and the
 * queries normalise every run of whitespace — that character included — to one plain space. Applying
 * the same rule to the expectation keeps the assertion about the amount rather than about the
 * character ICU happened to choose, and it still fails when the locale, the currency or the fraction
 * range changes.
 */
function amountText(value: number): string {
  return formatMoney(value).replace(/\s+/g, ' ').trim();
}

/* ---------------------------------------------------------------------------------------------
 * The service boundary — mocked at the provider, never at the network
 * ------------------------------------------------------------------------------------------- */

/**
 * The port members this suite observes.
 *
 * The six are exactly the reads and writes the screen makes: four reads keyed by the record they
 * answer for, the decision, and the write-back retry. `restoreMocks` in `vite.config.ts` clears each
 * one between cases, and {@link installHappyPath} gives every case its own resolved values.
 */
const mockService = vi.hoisted(() => ({
  getApproval: vi.fn(),
  getScenarioSet: vi.fn(),
  getExceptionDetail: vi.fn(),
  getApprovalOutcome: vi.fn(),
  decideApproval: vi.fn(),
  retryWriteBack: vi.fn(),
}));

vi.mock('../../services/service-provider', () => ({
  useService: () => mockService,
}));

/** One user-event session, as the suite's helpers take it. */
type UserSession = ReturnType<typeof userEvent.setup>;

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/**
 * The number of focus moves a tab walk may make before the walk is abandoned.
 *
 * The detail screen holds fewer than a dozen focus stops, so a walk that has not returned to the
 * control it was looking for within this bound is a control the keyboard cannot reach, which is what
 * the walk exists to report.
 */
const FOCUS_LIMIT = 40;

/**
 * Resolves every read and the decision with the fixtures above, before a case changes any of them.
 *
 * The screen makes four reads on mount and a fifth only once a plan is approved, so a case that does
 * not care about one of them must still answer it: an unanswered `vi.fn()` returns `undefined`, which
 * React Query reads as a settled read with no envelope and turns into a screen state the case would
 * not be testing.
 */
function installHappyPath(): void {
  mockService.getApproval.mockResolvedValue(ok(pendingApproval()));
  mockService.getScenarioSet.mockResolvedValue(ok(SCENARIO_SET));
  mockService.getExceptionDetail.mockResolvedValue(ok(exceptionDetail()));
  mockService.getApprovalOutcome.mockResolvedValue(ok(APPROVAL_OUTCOME));
  mockService.decideApproval.mockResolvedValue(ok(approvedApproval()));
  mockService.retryWriteBack.mockResolvedValue(ok(WRITE_BACKS[0]));
}

beforeEach(() => {
  installHappyPath();
});

afterEach(() => {
  /* A theme case sets the attribute the theme provider owns; leaving it behind would theme every
     later case in this worker, and jsdom shares one document per file. */
  delete document.documentElement.dataset['theme'];
});

/**
 * Renders the detail as the shell mounts it: behind an in-memory router so `useParams` resolves and
 * `Link` has a target, inside a cache of its own so no case inherits another's records, with retries
 * off so a refusal fails the same way however often it is repeated.
 *
 * A `null` route renders the base approvals path, which is the route that named no approval — the
 * empty state the screen derives from a route rather than from a record.
 */
function renderDetail(routeId: string | null = APPROVAL_ID): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const entry = routeId === null ? APPROVALS_ROUTE : `${APPROVALS_ROUTE}/${routeId}`;

  render(
    <MemoryRouter initialEntries={[entry]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route
            path={`${APPROVALS_ROUTE}/:approvalId`}
            element={<ApprovalDetailScreen scope={SCOPE} />}
          />
          <Route path={APPROVALS_ROUTE} element={<ApprovalDetailScreen scope={SCOPE} />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/* ---------------------------------------------------------------------------------------------
 * Reading the screen
 * ------------------------------------------------------------------------------------------- */

/** The entry at a position of a list, or a failure naming the position the case expected. */
function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`expected an entry at position ${String(index)}`);
  }

  return item;
}

/** One control by its accessible name, which is the text a reader sees on it. */
function controlNamed(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

/** The text of the description a control carries, resolved through its `aria-describedby`. */
function describedByText(control: HTMLElement): string {
  const describedBy = control.getAttribute('aria-describedby');

  if (describedBy === null) {
    return '';
  }

  return describedBy
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

/** The named region a card or a panel renders, found by the heading it carries. */
function regionNamed(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

/** The decision's comment field, found by its visible label rather than by a test identifier. */
function commentField(): HTMLTextAreaElement {
  return screen.getByLabelText<HTMLTextAreaElement>(APPROVAL_DETAIL_TEXT.commentLabel);
}

/**
 * Every side-effect acknowledgement named from the given plant, in the record's own order.
 *
 * The accessible name is built from the plant alone — it is the plant the plan lands on, not the
 * product each side effect defers — so a plan with two side effects renders two toggles under one
 * name. They are told apart by their position, which is the order the record states them in.
 */
function acknowledgementsFor(plantId: PlantId): readonly HTMLElement[] {
  return screen.getAllByRole('button', { name: sideEffectAcknowledgement(plantId) });
}

/* ---------------------------------------------------------------------------------------------
 * Driving the screen
 * ------------------------------------------------------------------------------------------- */

/** Types a comment, which is the one thing only the reader can supply to a decision. */
async function giveComment(user: UserSession, comment: string): Promise<void> {
  await user.type(commentField(), comment);
}

/** Acknowledges every side effect the plan carries, which is what approve waits for. */
async function acknowledgeEverySideEffect(
  user: UserSession,
  plantId: PlantId = PLANT_ID,
): Promise<void> {
  /* One toggle per side effect, every one named from the same plant — the name carries the plant,
     not the product — so the toggles are told apart by their position in the record's own list. */
  const toggles = acknowledgementsFor(plantId);

  expect(toggles).toHaveLength(SIDE_EFFECTS.length);

  for (const toggle of toggles) {
    await user.click(toggle);
  }
}

/**
 * Moves focus with `Tab` until the given control holds it, and reports whether it got there.
 *
 * Used wherever a case has to prove a control is reachable by keyboard rather than by a pointer
 * call: the walk visits exactly the controls the document exposes, so a control outside the tab
 * order is reported as unreachable instead of being focused programmatically.
 */
async function tabTo(user: UserSession, control: HTMLElement): Promise<boolean> {
  for (let step = 0; step < FOCUS_LIMIT; step += 1) {
    if (document.activeElement === control) {
      return true;
    }

    await user.tab();
  }

  return document.activeElement === control;
}

/* ---------------------------------------------------------------------------------------------
 * The decision gate — AAP 0.12.2, T-07
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders the detail and waits for the plan's reads to settle into the screen's own content.
 *
 * Both mounts are awaited: the approval is the first read to answer, and the option set and the
 * exception behind it settle a tick later — the side-effect panel is the one place that proves all
 * three arrived, so a case that asserted before it would be reading a half-read screen.
 */
async function renderPendingDetail(): Promise<void> {
  renderDetail();
  await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection });
  await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.sideEffectSection });
}

describe('T-07 the decision gate', () => {
  it('T-07 keeps every decision disabled without a comment, each with a reason a reader can reach', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    const approve = controlNamed(APPROVAL_DETAIL_TEXT.approve);
    const reject = controlNamed(APPROVAL_DETAIL_TEXT.reject);
    const requestChanges = controlNamed(APPROVAL_DETAIL_TEXT.requestChanges);

    for (const decision of [approve, reject, requestChanges]) {
      expect(decision).toHaveAttribute('aria-disabled', 'true');
      /* The reason is the control's description, so it is announced when focus arrives and is not a
         `title` attribute a keyboard reader never sees (rule P-8). */
      expect(describedByText(decision)).toContain(APPROVAL_DETAIL_TEXT.commentRequiredReason);
      expect(decision).not.toHaveAttribute('title');
    }

    /* And it is painted on keyboard focus, which is the reading a sighted keyboard user gets. */
    expect(await tabTo(user, approve)).toBe(true);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      APPROVAL_DETAIL_TEXT.commentRequiredReason,
    );
  });

  it('T-07 releases the shared decisions on a comment and keeps approve behind the acknowledgements', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    await giveComment(user, 'plan accepted');

    expect(controlNamed(APPROVAL_DETAIL_TEXT.reject)).not.toHaveAttribute('aria-disabled');
    expect(controlNamed(APPROVAL_DETAIL_TEXT.requestChanges)).not.toHaveAttribute('aria-disabled');

    const blockedApprove = controlNamed(APPROVAL_DETAIL_TEXT.approve);

    expect(blockedApprove).toHaveAttribute('aria-disabled', 'true');
    expect(describedByText(blockedApprove)).toContain(
      APPROVAL_DETAIL_TEXT.acknowledgementRequiredReason,
    );

    const toggles = acknowledgementsFor(PLANT_ID);

    expect(toggles).toHaveLength(SIDE_EFFECTS.length);

    /* One of two acknowledged is not every one of them: approve stays blocked until the last. */
    await user.click(nth(toggles, 0));
    expect(controlNamed(APPROVAL_DETAIL_TEXT.approve)).toHaveAttribute('aria-disabled', 'true');

    await user.click(nth(toggles, 1));
    expect(controlNamed(APPROVAL_DETAIL_TEXT.approve)).not.toHaveAttribute('aria-disabled');
  });

  it('T-07 names each acknowledgement from the plant the record states', async () => {
    mockService.getExceptionDetail.mockResolvedValue(ok(exceptionDetail(OTHER_PLANT_ID)));

    await renderPendingDetail();

    const toggles = acknowledgementsFor(OTHER_PLANT_ID);

    expect(toggles).toHaveLength(SIDE_EFFECTS.length);

    for (const toggle of toggles) {
      expect(toggle.textContent).toBe(sideEffectAcknowledgement(OTHER_PLANT_ID));
      expect(toggle.textContent).toContain(OTHER_PLANT_ID);
    }
    /* The other plant's name is not on a control at all, so the name came from the record rather
       than from a value written into the screen. */
    expect(screen.queryByRole('button', { name: sideEffectAcknowledgement(PLANT_ID) })).toBeNull();
  });

  it('T-07 records one approval with its decision and trimmed comment, then shows what the re-read returned', async () => {
    const user = userEvent.setup();

    /* The record moves only in the service: the first read is pending, and every read after the
       decision returns the approved record. Anything the screen shows of the approval therefore came
       from the second read, which is the assertion that the screen wrote nothing locally. */
    mockService.getApproval
      .mockResolvedValueOnce(ok(pendingApproval()))
      .mockResolvedValue(ok(approvedApproval()));

    await renderPendingDetail();

    expect(
      screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.trackerSection }),
    ).toBeNull();

    const readsBefore = mockService.getApproval.mock.calls.length;

    await giveComment(user, '  plan accepted  ');
    await acknowledgeEverySideEffect(user);
    await user.click(controlNamed(APPROVAL_DETAIL_TEXT.approve));

    await waitFor(() => {
      expect(mockService.decideApproval).toHaveBeenCalledTimes(1);
    });
    expect(mockService.decideApproval).toHaveBeenNthCalledWith(1, APPROVAL_ID, {
      action: 'approve',
      comment: 'plan accepted',
    });

    await waitFor(() => {
      expect(mockService.getApproval.mock.calls.length).toBeGreaterThan(readsBefore);
    });

    expect(
      await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.trackerSection }),
    ).toBeInTheDocument();
    expect(commentField()).toHaveValue('');
  });

  it('T-07 records a rejection with its own decision member and the comment', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    await giveComment(user, 'not this plan');
    await user.click(controlNamed(APPROVAL_DETAIL_TEXT.reject));

    await waitFor(() => {
      expect(mockService.decideApproval).toHaveBeenCalledTimes(1);
    });
    expect(mockService.decideApproval).toHaveBeenNthCalledWith(1, APPROVAL_ID, {
      action: 'reject',
      comment: 'not this plan',
    });
  });

  it('T-07 records a request for changes with its own decision member and the comment', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    await giveComment(user, 'tighten the transfer window');
    await user.click(controlNamed(APPROVAL_DETAIL_TEXT.requestChanges));

    await waitFor(() => {
      expect(mockService.decideApproval).toHaveBeenCalledTimes(1);
    });
    expect(mockService.decideApproval).toHaveBeenNthCalledWith(1, APPROVAL_ID, {
      action: 'request-changes',
      comment: 'tighten the transfer window',
    });
  });

  it('T-07 keeps every decision disabled for a comment of nothing but spaces', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    await giveComment(user, '   ');

    for (const label of [
      APPROVAL_DETAIL_TEXT.approve,
      APPROVAL_DETAIL_TEXT.reject,
      APPROVAL_DETAIL_TEXT.requestChanges,
    ]) {
      expect(controlNamed(label)).toHaveAttribute('aria-disabled', 'true');
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The stale gate — AAP 0.2.1, T-13's visible half
 * ------------------------------------------------------------------------------------------- */

describe('T-13 the stale gate', () => {
  it('T-13 names the gating source and its instant in the banner and in every disabled decision’s reason', async () => {
    mockService.getApproval.mockResolvedValue(
      ok(pendingApproval(), freshnessOf('stale', STALE_AS_OF)),
    );

    await renderPendingDetail();

    /* The banner's half: the record's own source label and the record's own instant, unchanged. */
    expect(
      screen.getByText(`${GATE_LABEL}${STATE_BOUNDARY_TEXT.staleSuffix}`),
    ).toBeInTheDocument();
    expect(screen.getByText(STALE_AS_OF)).toBeInTheDocument();

    /* The controls' half: one shared sentence, naming the same source and the same instant. */
    for (const label of [
      APPROVAL_DETAIL_TEXT.approve,
      APPROVAL_DETAIL_TEXT.reject,
      APPROVAL_DETAIL_TEXT.requestChanges,
    ]) {
      const decision = controlNamed(label);
      const reason = describedByText(decision);

      expect(decision).toHaveAttribute('aria-disabled', 'true');
      expect(reason).toContain(GATE_LABEL);
      expect(reason).toContain(STALE_AS_OF);
      /* The gate outranks the comment, so the reason states the staleness rather than asking for a
         comment the reader cannot use. */
      expect(reason).not.toContain(APPROVAL_DETAIL_TEXT.commentRequiredReason);
    }
  });

  it('T-13 never sends a decision while the gating source is not current', async () => {
    mockService.getApproval.mockResolvedValue(
      ok(pendingApproval(), freshnessOf('stale', STALE_AS_OF)),
    );

    await renderPendingDetail();

    /* `aria-disabled` keeps the control focusable and clickable on purpose (rule B-3), so the
       activation attempt is the raw pointer event a reader's click delivers: the screen refuses it,
       and the service-side refusal is asserted in the adapter's own suite. */
    fireEvent.click(controlNamed(APPROVAL_DETAIL_TEXT.approve));

    await waitFor(() => {
      expect(mockService.decideApproval).not.toHaveBeenCalled();
    });
  });
});

/* ---------------------------------------------------------------------------------------------
 * The detail's own records
 * ------------------------------------------------------------------------------------------- */

describe('the records the detail renders', () => {
  it('renders the plan summary, both amounts, the missing inputs and the simulated write-back preview', async () => {
    await renderPendingDetail();

    const plan = regionNamed(APPROVAL_DETAIL_TEXT.planSection);

    expect(within(plan).getByText(SCENARIO_NAME)).toBeInTheDocument();
    expect(plan).toHaveTextContent(SCENARIO_ID);
    expect(plan).toHaveTextContent(EXCEPTION_ID);
    expect(plan).toHaveTextContent(REQUESTER_ID);

    for (const role of APPROVER_ROLES) {
      expect(within(plan).getByText(role)).toBeInTheDocument();
    }

    const cost = regionNamed(APPROVAL_DETAIL_TEXT.costSection);

    /* Both amounts reach the screen through the interface's money presentation, recomputed here
       from the documented options rather than embedded as a formatted literal. */
    expect(within(cost).getByText(amountText(ADDED_COST))).toBeInTheDocument();
    expect(within(cost).getByText(amountText(PROTECTED_REVENUE))).toBeInTheDocument();
    /* A computed figure carries its own exact §5.3 label, taken from the fixed list (rule P-1). */
    expect(within(cost).getByText(SIM_LABELS[1])).toBeInTheDocument();

    const missing = regionNamed(APPROVAL_DETAIL_TEXT.missingInputsSection);

    for (const input of MISSING_INPUTS) {
      expect(within(missing).getByText(input)).toBeInTheDocument();
    }

    const preview = regionNamed(APPROVAL_DETAIL_TEXT.writeBackPreviewSection);
    const steps = within(preview).getAllByRole('listitem');

    expect(steps).toHaveLength(WRITE_BACKS.length);

    WRITE_BACKS.forEach((step, index) => {
      const item = nth(steps, index);

      /* The record's own order, item by item, and the fixed tag inside every step: a page-level
         badge does not label an individual write-back (rule P-1). */
      expect(item).toHaveTextContent(step.description);
      expect(item).toHaveTextContent(WRITE_BACK_TAG);
    });
  });
});

describe('the failures the port can report', () => {
  it('explains a permission refusal with the permission, the roles that hold it and the trace id', async () => {
    mockService.getApproval.mockRejectedValue(permissionProblem());

    renderDetail();

    /* The card names the required permission in its own heading, the roles that hold it and the
       correlation identifier of the refused call, so the denial is explained rather than reported. */
    expect(
      await screen.findByRole('heading', { name: new RegExp(DECISION_PERMISSION) }),
    ).toBeInTheDocument();

    for (const role of APPROVER_ROLES) {
      expect(screen.getByText(role)).toBeInTheDocument();
    }

    expect(screen.getByText(REFUSAL_TRACE_ID)).toBeInTheDocument();
    /* The content is replaced rather than shown beside controls that could not act. */
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
    expect(screen.queryByRole('button', { name: APPROVAL_DETAIL_TEXT.approve })).toBeNull();
  });

  it('explains a policy refusal and keeps the decisions disabled with the same reason', async () => {
    const user = userEvent.setup();
    mockService.decideApproval.mockRejectedValue(policyProblem());

    await renderPendingDetail();

    await giveComment(user, 'plan accepted');
    await acknowledgeEverySideEffect(user);
    await user.click(controlNamed(APPROVAL_DETAIL_TEXT.approve));

    const block = await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.policySection });

    expect(block).toHaveTextContent(POLICY_ID);
    expect(block).toHaveTextContent(POLICY_REASON);
    expect(block).toHaveTextContent(POLICY_ALTERNATIVE);
    expect(block).toHaveTextContent(REFUSAL_EVENT_ID);

    for (const label of [
      APPROVAL_DETAIL_TEXT.approve,
      APPROVAL_DETAIL_TEXT.reject,
      APPROVAL_DETAIL_TEXT.requestChanges,
    ]) {
      const decision = controlNamed(label);

      expect(decision).toHaveAttribute('aria-disabled', 'true');
      expect(describedByText(decision)).toContain(POLICY_REASON);
    }

    /* One attempt, and nothing written: the refusal created no decision the screen could show. */
    expect(mockService.decideApproval).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(APPROVAL_DETAIL_TEXT.decisionActionLabel)).toBeNull();
  });
});

describe('an approval that has been decided', () => {
  it('lists the write-backs in the order the record states and sets planned against resulting figures', async () => {
    mockService.getApproval.mockResolvedValue(ok(approvedApproval()));

    renderDetail();
    await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection });

    const tracker = await screen.findByRole('region', {
      name: APPROVAL_DETAIL_TEXT.trackerSection,
    });
    const steps = within(tracker).getAllByRole('listitem');

    expect(steps).toHaveLength(WRITE_BACKS.length);

    WRITE_BACKS.forEach((step, index) => {
      expect(nth(steps, index)).toHaveTextContent(step.description);
    });

    /* The comparison: one row per measure, the record's planned figure in the second column and the
       resulting figure in the third. Both sides are read from the two records the service returned,
       so a swap or a single-sided card fails here. */
    const outcome = await screen.findByRole('region', { name: OUTCOME_CARD_TEXT.title });
    const rows = within(outcome).getAllByRole('row');
    const firstMeasure = nth(rows, 1);
    const cells = within(firstMeasure).getAllByRole('cell');

    expect(cells).toHaveLength(3);
    expect(nth(cells, 1).textContent).toBe(String(APPROVAL_OUTCOME.planned.unitsLate));
    expect(nth(cells, 2).textContent).toBe(String(APPROVAL_OUTCOME.resulting.unitsLate));
    expect(
      within(outcome).getByRole('columnheader', { name: OUTCOME_CARD_TEXT.plannedHeader }),
    ).toBeInTheDocument();
    expect(
      within(outcome).getByRole('columnheader', { name: OUTCOME_CARD_TEXT.resultingHeader }),
    ).toBeInTheDocument();
  });

  it('states that the comparison is not shown yet when no resulting record arrives', async () => {
    mockService.getApproval.mockResolvedValue(ok(approvedApproval()));
    mockService.getApprovalOutcome.mockRejectedValue(outcomeProblem());

    renderDetail();
    await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection });

    const outcome = await screen.findByRole('region', {
      name: APPROVAL_DETAIL_TEXT.outcomeSection,
    });

    expect(await within(outcome).findByText(OUTCOME_UNAVAILABLE_MESSAGE)).toBeInTheDocument();
    /* No zero-valued row, no empty grid: the comparison is absent until a record supports it. */
    expect(within(outcome).queryByRole('table')).toBeNull();
    expect(within(outcome).queryByText(OUTCOME_CARD_TEXT.notApplicable)).toBeNull();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The seven states — platform-specification.md §8, T-17
 * ------------------------------------------------------------------------------------------- */

/** The sentence the fixture's validation refusal states, in the service's own words. */
const CONFLICT_MESSAGE = 'This approval changed while you were reading it.';

/** The failure the port reports when the record moved under the reader. */
function conflictProblem(): Problem {
  return { type: 'validation', message: CONFLICT_MESSAGE, traceId: REFUSAL_TRACE_ID };
}

describe('T-17 the seven states', () => {
  it('T-17 renders the loading state in place of the content', async () => {
    mockService.getApproval.mockReturnValue(new Promise<Result<Approval>>(() => {}));

    renderDetail();

    const loading = await screen.findByRole('status', { name: STATE_BOUNDARY_TEXT.loading });

    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(loading).toHaveTextContent(STATE_BOUNDARY_TEXT.loading);
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
  });

  it('T-17 renders the empty state for a route that named no approval', async () => {
    renderDetail(null);

    expect(await screen.findByText(APPROVAL_DETAIL_TEXT.empty)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
    /* A misaddressed route reads nothing rather than asking the service for an empty identifier. */
    expect(mockService.getApproval).not.toHaveBeenCalled();
  });

  it('T-17 keeps the records under the stale banner', async () => {
    mockService.getApproval.mockResolvedValue(
      ok(pendingApproval(), freshnessOf('stale', STALE_AS_OF)),
    );

    await renderPendingDetail();

    expect(
      screen.getByText(`${GATE_LABEL}${STATE_BOUNDARY_TEXT.staleSuffix}`),
    ).toBeInTheDocument();
    /* A figure that is out of date is still the figure a planner came to read. */
    expect(regionNamed(APPROVAL_DETAIL_TEXT.planSection)).toBeInTheDocument();
  });

  it('T-17 keeps the records under the partial notice', async () => {
    mockService.getApproval.mockResolvedValue(ok(pendingApproval(), freshnessOf('partial', AS_OF)));

    await renderPendingDetail();

    expect(screen.getByText(STATE_BOUNDARY_TEXT.partialHeadline)).toBeInTheDocument();
    expect(screen.getByText(APPROVAL_DETAIL_TEXT.partial)).toBeInTheDocument();
    expect(regionNamed(APPROVAL_DETAIL_TEXT.planSection)).toBeInTheDocument();
  });

  it('T-17 replaces the records with the offline notice and its retry', async () => {
    mockService.getApproval.mockResolvedValue(
      ok(pendingApproval(), freshnessOf('unavailable', STALE_AS_OF)),
    );

    renderDetail();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.offlineHeadline)).toBeInTheDocument();
    /* Nothing answered for the content, so the record the call did return is not shown as though
       the sources behind it had reported. */
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
    expect(controlNamed(STATE_BOUNDARY_TEXT.retryLabel)).toBeInTheDocument();
  });

  it('T-17 replaces the records with the forbidden card', async () => {
    mockService.getApproval.mockRejectedValue(permissionProblem());

    renderDetail();

    expect(
      await screen.findByRole('heading', { name: new RegExp(DECISION_PERMISSION) }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
    expect(screen.getByText(REFUSAL_TRACE_ID)).toBeInTheDocument();
  });

  it('T-17 replaces the records with the conflict notice and its reload', async () => {
    mockService.getApproval.mockRejectedValue(conflictProblem());

    renderDetail();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.conflictHeadline)).toBeInTheDocument();
    expect(screen.getByText(CONFLICT_MESSAGE)).toBeInTheDocument();
    expect(controlNamed(STATE_BOUNDARY_TEXT.reloadLabel)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
  });
});

/* ---------------------------------------------------------------------------------------------
 * Accessibility and both themes — rule B-3, T-16
 * ------------------------------------------------------------------------------------------- */

describe('T-16 the accessibility contract', () => {
  it('T-16 renders exactly one level-one heading', async () => {
    await renderPendingDetail();

    const headings = screen.getAllByRole('heading', { level: 1 });

    expect(headings).toHaveLength(1);
    expect(nth(headings, 0)).toHaveTextContent(APPROVAL_DETAIL_TEXT.title);
  });

  it('T-16 reaches all three decisions with Tab alone', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    const decisions = [
      controlNamed(APPROVAL_DETAIL_TEXT.approve),
      controlNamed(APPROVAL_DETAIL_TEXT.reject),
      controlNamed(APPROVAL_DETAIL_TEXT.requestChanges),
    ];
    const visited: HTMLElement[] = [];

    for (let step = 0; step < FOCUS_LIMIT; step += 1) {
      await user.tab();

      if (document.activeElement instanceof HTMLElement) {
        visited.push(document.activeElement);
      }
    }

    for (const decision of decisions) {
      expect(visited).toContain(decision);
    }
  });

  it('T-16 operates a decision with Enter and Space alone', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    await giveComment(user, 'plan accepted');

    const reject = controlNamed(APPROVAL_DETAIL_TEXT.reject);

    expect(await tabTo(user, reject)).toBe(true);
    await user.keyboard(' ');

    await waitFor(() => {
      expect(mockService.decideApproval).toHaveBeenCalledTimes(1);
    });
    expect(mockService.decideApproval).toHaveBeenNthCalledWith(1, APPROVAL_ID, {
      action: 'reject',
      comment: 'plan accepted',
    });

    /* The recorded decision cleared the comment, so the reader supplies it again before the second
       decision can be taken — which is also the proof that the control re-enabled honestly. */
    await giveComment(user, 'plan accepted');
    const requestChanges = controlNamed(APPROVAL_DETAIL_TEXT.requestChanges);

    expect(await tabTo(user, requestChanges)).toBe(true);
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockService.decideApproval).toHaveBeenCalledTimes(2);
    });
    expect(mockService.decideApproval).toHaveBeenNthCalledWith(2, APPROVAL_ID, {
      action: 'request-changes',
      comment: 'plan accepted',
    });
  });

  it('T-16 labels the comment field and carries the acknowledgement state on the control', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    const field = commentField();

    expect(field.tagName).toBe('TEXTAREA');
    expect(field).toHaveAccessibleName(APPROVAL_DETAIL_TEXT.commentLabel);
    expect(field).toHaveAttribute('aria-required', 'true');

    const toggle = nth(acknowledgementsFor(PLANT_ID), 0);

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('T-16 renders the same structure and labels in both themes', async () => {
    for (const theme of ['command', 'paper'] as const) {
      document.documentElement.dataset['theme'] = theme;

      await renderPendingDetail();

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(regionNamed(APPROVAL_DETAIL_TEXT.planSection)).toBeInTheDocument();
      expect(controlNamed(APPROVAL_DETAIL_TEXT.approve)).toHaveAttribute('aria-disabled', 'true');
      expect(
        within(regionNamed(APPROVAL_DETAIL_TEXT.costSection)).getByText(amountText(ADDED_COST)),
      ).toBeInTheDocument();

      cleanup();
    }
  });
});
