/**
 * Component suite for `scenario-comparison-screen.tsx`, the composition root of SCR-04 — and, through
 * it, for the two presentational modules it composes, `./comparison-matrix.tsx` and
 * `./write-back-preview.tsx`, neither of which owns a suite of its own.
 *
 * WHAT IT PROVES. Eleven contracts the screen is relied on for, each stated as a case that fails on one
 * specific regression rather than as a description of the markup:
 *
 * 1. EVERY MEASURE ROW PER OPTION. The matrix draws the eight measures AAP §0.12.4 fixes, in that
 *    order, and then the run-out reading AAP §0.8 requires after the idle days it explains; each
 *    option's own value sits in that option's cell — asserted row by row and cell by cell, and the
 *    run-out row against the reading each option's own pair composes, so a transposed row or column
 *    fails rather than passing on a page-wide search — and the header's eyebrow names the exception
 *    whose options these are rather than the product name every route already carries.
 * 2. THE RECOMMENDATION. The recommended option's column is marked structurally, and its block shows
 *    the fixed badge, the rule the recommendation applied and the trade-off it makes, verbatim from the
 *    record, each under its own `Simulated recommendation` label (rule P-1).
 * 3. THE PER-COLUMN LABELS. An option shipped with the dataset is labelled `Simulated data` on its own
 *    column and an option computed here `Simulated calculation`, so a reader can tell which figures
 *    were measured in this session (rule P-1, AAP §0.10).
 * 4. A COMPUTATION THAT COULD NOT COMPLETE. A failed constraint check renders `Cannot compute` in the
 *    affected cells with the record's own messages, renders no figure for them, and leaves the primary
 *    action disabled with that record's reason as its accessible description (AAP §0.8, rule P-8). The
 *    same action is disabled with the gating source's label and as-of instant while that source is
 *    `stale` or `unavailable`, and left able to act for any other state it reports (AAP §0.2.1, T-13).
 * 5. THE FIXED EMPTY AND DISABLED SENTENCES. An exception with no option states the plan's sentence
 *    character for character, and the constraints control keeps the plan's own tooltip (AAP §0.12.4).
 * 6. THE EXPORT. Activating the export calls the port once with the route's exception and offers the
 *    payload the service composed as a file, under the name and media type the payload carries — the
 *    screen composes no document of its own (rule P-2, rule P-6).
 * 7. THE WRITE-BACK PREVIEW. The selected option's steps appear in the record's order and each carries
 *    `Simulated write-back` on its own row (rule P-1).
 * 8. THE TABLE VIEW. The units-late chart's frame reveals the same rows its bars draw, once round trip
 *    (success criterion 9). The frame's own contract belongs to `src/components/chart-frame.test.tsx`.
 * 9. ALL SEVEN STATES. Every member of `ScreenState` is reached through the read's own settled facts —
 *    none needs the boundary mocked — and each renders its own evidence: the busy region, the fixed
 *    empty sentence, the stale banner naming the source and its as-of time with the body still drawn,
 *    the partial notice with the body, the offline notice with a retry that a keyboard can operate, the
 *    forbidden card naming the permission, the roles and the trace id, and the conflict notice with a
 *    reload control.
 * 10. BOTH THEMES. The same heading, the same recommended block and the same figures render under
 *    `data-theme="command"` and under `data-theme="paper"`. Colour correctness is the token layer's and
 *    is proven in the component suites; this is the smoke assertion that neither theme drops a figure.
 * 11. THE KEYBOARD. The primary action, the export and the matrix's own selection are reachable by
 *    tabbing, and choosing another option with `Enter` moves the marked column and moves the primary
 *    action between acting and explaining why it cannot (rule B-3, rule P-8). The accessibility
 *    identifier of that journey belongs to the browser suite and is deliberately not claimed here.
 *
 * WHERE THE DATA COMES FROM. The service is mocked at `service-provider.tsx`, the one boundary a screen
 * may read through (rule P-2), so no seed module, adapter, API client, domain module or shell is
 * involved and the suite observes exactly the calls the screen makes. Everything else — the matrix, the
 * chart frame, the write-back preview, `StateBoundary`, `ForbiddenCard`, `StatusIndicator`, `MonoValue`
 * and `ActionButton` with its hint — is the real component, because what a reader receives is the thing
 * under test. Each render sits in a `QueryClientProvider` holding a fresh cache and in a
 * `MemoryRouter` whose route supplies `useParams()`'s exception identifier.
 *
 * THE FIXTURES ARE INPUT, NOT EXPECTED RESULTS (rule P-6). Every value below is data handed to the
 * mocked call, so a case can only pass by finding what the screen actually rendered. The folder is
 * inside the figure scan, so identifiers are opaque placeholders (`exc-alpha`, `scn-alpha`) rather than
 * record-shaped references, measures are small plain integers, and every amount is asserted through the
 * imported `formatMoney` rather than as a currency literal — formatting truth belongs to
 * `src/components/mono-value.test.tsx`.
 *
 * THE WORDING IS NOT RETYPED. The fixed sentences are imported from the module that owns each of them,
 * so a reworded label fails the case that names it and a string keeps exactly one owner.
 *
 * THE SCREEN'S OWN SELECTION. No case activates the primary action: what it does with a recorded
 * approval — navigating to SCR-05's detail — belongs to that screen's suite, and the request itself to
 * the adapter's. What is proven here is the control's state, which is the part a planner meets.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock, touches the network or waits on a real timer longer than a tick.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatMoney } from '../../components/mono-value';
import { runOutReading } from '../../components/run-out-reading';
import { STATE_BOUNDARY_TEXT } from '../../components/state-boundary';
import { VIEW_AS_TABLE_LABELS } from '../../components/view-as-table-toggle';
import { SIM_LABELS, SOURCE_LABELS } from '../../types';
import type {
  Approval,
  ApprovalId,
  ApprovalStatus,
  Confidence,
  ConstraintCheck,
  ExceptionId,
  ExportPayload,
  Freshness,
  FreshnessState,
  Levers,
  Meta,
  Money,
  OrderResult,
  Permission,
  Problem,
  Result,
  Role,
  RunOut,
  Scenario,
  ScenarioId,
  ScenarioOrigin,
  ScenarioSet,
  SideEffect,
  SimLabel,
  ThemeName,
  Timestamp,
  WriteBack,
} from '../../types';
import { CANNOT_COMPUTE_LABEL, COMPARISON_MATRIX_TEXT } from './comparison-matrix';
import {
  CUSTOM_CONSTRAINTS_DISABLED_REASON,
  EDIT_CONSTRAINTS_LABEL,
  EMPTY_SCENARIO_SET_MESSAGE,
  EXPORT_COMPARISON_LABEL,
  RECOMMENDED_BADGE_LABEL,
  REQUEST_APPROVAL_LABEL,
  SCENARIO_COMPARISON_TEXT,
  SCENARIO_COMPARISON_TITLE,
  WRITE_BACK_PREVIEW_LABEL,
  ScenarioComparisonScreen,
} from './scenario-comparison-screen';

/* ---------------------------------------------------------------------------------------------
 * The port, replaced at the one seam a screen may read through
 * ------------------------------------------------------------------------------------------- */

/**
 * The service double every case drives, created before the module graph is evaluated.
 *
 * `vi.mock` is hoisted above the imports, so the factory may only close over bindings that already
 * exist — hence `vi.hoisted`. The double carries the five members this screen and the sandbox it
 * composes reach for, each named exactly as `SiteIntelligenceService` names it: the set read, the
 * approval list that says whether the selected option has been decided, the approval request, the
 * comparison export and the sandbox's own measurement. Nothing else is declared, so a member the screen
 * started to read would fail at the call site instead of quietly returning an empty value.
 */
const stub = vi.hoisted(() => ({
  service: {
    getScenarioSet: vi.fn<(exceptionId: ExceptionId) => Promise<Result<ScenarioSet>>>(),
    listApprovals: vi.fn<() => Promise<Result<Approval[]>>>(),
    exportScenarioComparison:
      vi.fn<(exceptionId: ExceptionId) => Promise<Result<ExportPayload>>>(),
    requestApproval: vi.fn(),
    solveScenario: vi.fn(),
  },
}));

vi.mock('../../services/service-provider', () => ({
  useService: () => stub.service,
}));

/* ---------------------------------------------------------------------------------------------
 * Fixtures — the input every case supplies, and nothing an expected result would hold
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every result and every failure of these fixtures carries. */
const TRACE_ID = 'trace-comparison-run';

/** The exception the route names: an opaque placeholder, not a record-identifier shape. */
const EXCEPTION_ID: ExceptionId = 'exc-alpha';

/** The option the recommendation rule picked, and the column a reader lands on. */
const RECOMMENDED_ID: ScenarioId = 'scn-alpha';

/** The second option: dataset content, so its column carries the dataset's own label. */
const SEEDED_ID: ScenarioId = 'scn-beta';

/** The option whose constraint check failed, which is the one no figure is shown for. */
const FAILED_ID: ScenarioId = 'scn-gamma';

/** The option the set held back, listed with the constraint that blocked it. */
const SET_ASIDE_ID: ScenarioId = 'scn-delta';

/** The route the shell mounts the comparison on. */
const COMPARISON_ROUTE = `/exceptions/${EXCEPTION_ID}/scenarios`;

/** When the records below were last read, in the application's time zone. */
const AS_OF: Timestamp = '2026-12-03T06:00:00+01:00';

/** The two customer orders the compared options are measured over, in the case's own order. */
const ORDER_ALPHA = 'order-alpha';
const ORDER_BETA = 'order-beta';

/** The confidence each option's measurement carries, with the sentence that explains it. */
const SOLVER_CONFIDENCE: Confidence = {
  level: 'high',
  reason: 'Every order in the case is placed inside the window.',
};
const SEEDED_CONFIDENCE: Confidence = {
  level: 'medium',
  reason: 'The option was shipped with the dataset rather than measured in this session.',
};
const FAILED_CONFIDENCE: Confidence = {
  level: 'low',
  reason: 'The option breaches a bound, so its measures do not stand.',
};

/** The measures the two comparable options carry, each value distinct so a swap fails a case. */
const SOLVER_UNITS_LATE = 5;
const SOLVER_MAX_DAYS_LATE = 4;
const SOLVER_ORDERS_ON_TIME = 6;
const SOLVER_ADDED_COST: Money = 1200;
const SOLVER_LINE_IDLE_DAYS = 1.5;
const SOLVER_KITS_DELAYED = 900;
const SOLVER_DAYS_DEFERRED = 10;

const SEEDED_UNITS_LATE = 7;
const SEEDED_MAX_DAYS_LATE = 6;
const SEEDED_ORDERS_ON_TIME = 5;
const SEEDED_ADDED_COST: Money = 3400;
const SEEDED_LINE_IDLE_DAYS = 0.75;
const SEEDED_KITS_DELAYED = 480;
const SEEDED_DAYS_DEFERRED = 4;

/** How many orders the case measures, which is the denominator the matrix's third row reports. */
const ORDERS_TOTAL = 7;

/** Where the projection runs out under either comparable option. Never shown by this screen. */
const RUN_OUT_DAY = 6;
const RUN_OUT_FRACTION = 0.5;

/** The lever values each option was measured at. The matrix shows none of them. */
const SOLVER_LEVERS: Levers = { airSets: 2, transferSets: 3 };
const SEEDED_LEVERS: Levers = { airSets: 4, transferSets: 0 };
const FAILED_LEVERS: Levers = { airSets: 15, transferSets: 4 };

/**
 * The messages a failed constraint check carries, one per breach (AAP §0.12.2).
 *
 * They are this fixture's record text — the wording a measurement returns — and the case asserts both
 * halves of the failed option against them: the cells that report the reason and the disabled control
 * that repeats it.
 */
const CONSTRAINT_MESSAGES: readonly string[] = [
  'airSets is above its maximum of 12.',
  'transferSets is between two steps, and the step is 3.',
];

/** The rule the recommendation applied, in the words the record states it. */
const RECOMMENDATION_RULE =
  'The option with the fewest units late, then the lowest added cost, among those inside their bounds.';

/** The trade-off the recommended option makes, in the words the record states it. */
const TRADE_OFF =
  'It spends the least of the options measured and defers the smallest number of kits at the site it draws from.';

/** The constraint that set one option aside. */
const BLOCKING_CONSTRAINT = 'The air-freight lever is above its maximum.';

/** The per-order results each option carries, in the order the case lists them. */
const SOLVER_ORDERS: readonly OrderResult[] = [
  { orderId: ORDER_ALPHA, unitsLate: SOLVER_UNITS_LATE, daysLate: 2 },
  { orderId: ORDER_BETA, unitsLate: 0, daysLate: 0 },
];
const SEEDED_ORDERS: readonly OrderResult[] = [
  { orderId: ORDER_ALPHA, unitsLate: 2, daysLate: 1 },
  { orderId: ORDER_BETA, unitsLate: 3, daysLate: 4 },
];

/** What the recommended option costs a record that is not the one being rescued. */
const SOLVER_SIDE_EFFECTS: readonly SideEffect[] = [
  {
    productId: 'prd-alpha',
    kitsDelayed: SOLVER_KITS_DELAYED,
    valueDeferredEur: 108000,
    daysDeferred: SOLVER_DAYS_DEFERRED,
  },
];
const SEEDED_SIDE_EFFECTS: readonly SideEffect[] = [
  {
    productId: 'prd-beta',
    kitsDelayed: SEEDED_KITS_DELAYED,
    valueDeferredEur: 21000,
    daysDeferred: SEEDED_DAYS_DEFERRED,
  },
];

/**
 * The steps the recommended option would write, in the record's own order.
 *
 * The seeded option carries none, which is the state in which the screen renders no block at all.
 */
const SOLVER_WRITE_BACKS: readonly WriteBack[] = [
  {
    sequence: 1,
    system: 'erp',
    recordRef: 'ref-alpha-one',
    description: 'Move the delayed order into the expedited bucket.',
    state: 'pending',
  },
  {
    sequence: 2,
    system: 'scheduling',
    recordRef: 'ref-alpha-two',
    description: 'Reschedule the affected line for the first working day.',
    state: 'succeeded',
  },
];

/* ---------------------------------------------------------------------------------------------
 * The labels, read from the one tuple that holds the seven fixed strings
 * ------------------------------------------------------------------------------------------- */

/**
 * The four §5.3 labels these cases assert, each read from `SIM_LABELS` at the position specification
 * §5.3 gives it and typed `SimLabel`, so a paraphrase in either the component or the case fails to
 * compile rather than reaching a reader as a near miss (rule P-1).
 */
const SEEDED_LABEL: SimLabel = SIM_LABELS[0];
const CALCULATED_LABEL: SimLabel = SIM_LABELS[1];
const RECOMMENDATION_LABEL: SimLabel = SIM_LABELS[2];
const WRITE_BACK_LABEL: SimLabel = SIM_LABELS[3];

/**
 * The nine measure rows, in the order AAP §0.12.4 fixes for SCR-04 — units late, maximum days late,
 * orders on time, added cost, line idle days, confidence, constraint check, side effects — with the
 * run-out reading AAP §0.8 requires carried after the idle days it explains, named through the constant
 * that owns each label.
 */
const MEASURE_LABELS: readonly string[] = [
  COMPARISON_MATRIX_TEXT.rows.unitsLate,
  COMPARISON_MATRIX_TEXT.rows.maxDaysLate,
  COMPARISON_MATRIX_TEXT.rows.ordersOnTime,
  COMPARISON_MATRIX_TEXT.rows.addedCost,
  COMPARISON_MATRIX_TEXT.rows.lineIdleDays,
  COMPARISON_MATRIX_TEXT.rows.runOut,
  COMPARISON_MATRIX_TEXT.rows.confidence,
  COMPARISON_MATRIX_TEXT.rows.constraintCheck,
  COMPARISON_MATRIX_TEXT.rows.sideEffects,
];

/** The two themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES: readonly ThemeName[] = ['command', 'paper'];

/* ---------------------------------------------------------------------------------------------
 * The record builders
 * ------------------------------------------------------------------------------------------- */

/** One source's contribution, in the state a case asks about. */
function freshnessOf(state: FreshnessState): Freshness {
  return { source: 'erp', asOf: AS_OF, state };
}

/**
 * The metadata every result carries: a freshness report in the state the case asked for, the
 * simulation marker `Meta` fixes as the literal `true`, and a correlation identifier.
 */
function metaOf(freshness: readonly Freshness[]): Meta {
  return { freshness: [...freshness], simulated: true, traceId: TRACE_ID };
}

/** A successful result, in the shape every port read resolves to. */
function ok<Payload>(data: Payload, freshness: readonly Freshness[] = []): Result<Payload> {
  return { data, meta: metaOf(freshness) };
}

/** One option as a case states it, before the builder fills the members this screen never shows. */
interface ScenarioSpec {
  /** The option's own identifier: an opaque placeholder, not a record-identifier shape. */
  readonly id: ScenarioId;

  /** The option's name, as the comparison matrix labels its column. */
  readonly name: string;

  /** How the option came to exist, which decides the label its column carries. */
  readonly origin: ScenarioOrigin;

  /** The lever values the measurement was taken under. */
  readonly levers: Levers;

  /** How many units the option leaves late. */
  readonly unitsLate: number;

  /** The largest number of days late among those units. */
  readonly maxDaysLate: number;

  /** How many of the case's orders arrive on time. */
  readonly ordersOnTime: number;

  /** What the option costs, in euro. */
  readonly addedCostEur: Money;

  /** The working days the line stands idle. */
  readonly lineIdleDays: number;

  /** Whether every lever stayed inside its bound. */
  readonly constraintCheck: ConstraintCheck;

  /** One plain message per breach; absent for an option that stayed inside its bounds. */
  readonly constraintMessages?: readonly string[];

  /** How much confidence the measurement carries, with the reason for it. */
  readonly confidence: Confidence;

  /** The per-order results the units-late chart draws. */
  readonly orders?: readonly OrderResult[];

  /** What the option costs a record that is not the one being rescued. */
  readonly sideEffects?: readonly SideEffect[];

  /** The steps the option would write, in the record's own order. */
  readonly writeBacks?: readonly WriteBack[];
}

/**
 * Builds one option, member by member.
 *
 * The daily closing-stock series and the revenue held up are stated empty or zero: this screen's
 * matrix, chart, recommendation block and write-back preview render none of them, so a fixture that
 * invented values there would be asserting nothing. Every member the screen does render comes from the
 * spec, which is what lets a case vary one measure and see exactly that one change.
 */
function scenarioOf(spec: ScenarioSpec): Scenario {
  return {
    id: spec.id,
    exceptionId: EXCEPTION_ID,
    name: spec.name,
    origin: spec.origin,
    levers: spec.levers,
    unitsLate: spec.unitsLate,
    maxDaysLate: spec.maxDaysLate,
    ordersOnTime: spec.ordersOnTime,
    ordersTotal: ORDERS_TOTAL,
    addedCostEur: spec.addedCostEur,
    lineIdleDays: spec.lineIdleDays,
    revenueDelayedEur: 0,
    runOut: { day: RUN_OUT_DAY, fractionOfDay: RUN_OUT_FRACTION },
    dailyClosingStock: [],
    orders: [...(spec.orders ?? [])],
    constraintCheck: spec.constraintCheck,
    constraintMessages: [...(spec.constraintMessages ?? [])],
    sideEffects: [...(spec.sideEffects ?? [])],
    writeBacks: [...(spec.writeBacks ?? [])],
    confidence: spec.confidence,
  };
}

/** The option the recommendation rule picked: computed here, and the one a reader lands on. */
const SOLVER_SCENARIO: Scenario = scenarioOf({
  id: RECOMMENDED_ID,
  name: 'Option Alpha',
  origin: 'solver',
  levers: SOLVER_LEVERS,
  unitsLate: SOLVER_UNITS_LATE,
  maxDaysLate: SOLVER_MAX_DAYS_LATE,
  ordersOnTime: SOLVER_ORDERS_ON_TIME,
  addedCostEur: SOLVER_ADDED_COST,
  lineIdleDays: SOLVER_LINE_IDLE_DAYS,
  constraintCheck: 'pass',
  confidence: SOLVER_CONFIDENCE,
  orders: SOLVER_ORDERS,
  sideEffects: SOLVER_SIDE_EFFECTS,
  writeBacks: SOLVER_WRITE_BACKS,
});

/** The option shipped with the dataset, so its column is labelled as dataset content. */
const SEEDED_SCENARIO: Scenario = scenarioOf({
  id: SEEDED_ID,
  name: 'Option Beta',
  origin: 'seeded',
  levers: SEEDED_LEVERS,
  unitsLate: SEEDED_UNITS_LATE,
  maxDaysLate: SEEDED_MAX_DAYS_LATE,
  ordersOnTime: SEEDED_ORDERS_ON_TIME,
  addedCostEur: SEEDED_ADDED_COST,
  lineIdleDays: SEEDED_LINE_IDLE_DAYS,
  constraintCheck: 'pass',
  confidence: SEEDED_CONFIDENCE,
  orders: SEEDED_ORDERS,
  sideEffects: SEEDED_SIDE_EFFECTS,
});

/**
 * The option whose constraint check failed: still a `Scenario`, with one message per breach (AAP
 * §0.12.3), which is what the matrix must report instead of a figure.
 */
const FAILED_SCENARIO: Scenario = scenarioOf({
  id: FAILED_ID,
  name: 'Option Gamma',
  origin: 'sandbox',
  levers: FAILED_LEVERS,
  unitsLate: 77,
  maxDaysLate: 78,
  ordersOnTime: 79,
  addedCostEur: 91000,
  lineIdleDays: 3.75,
  constraintCheck: 'fail',
  constraintMessages: CONSTRAINT_MESSAGES,
  confidence: FAILED_CONFIDENCE,
  orders: SOLVER_ORDERS,
});

/**
 * One option set, exactly as the port answers with it.
 *
 * `recommendedId` is a lookup the screen performs and never compares, so the case states which option
 * the rule picked rather than re-deriving it. The set deliberately carries a rejected option too, so
 * the matrix's own list of what it set aside is exercised alongside the table.
 */
function setOf(scenarios: readonly Scenario[], recommendedId?: ScenarioId): ScenarioSet {
  return {
    exceptionId: EXCEPTION_ID,
    scenarios: [...scenarios],
    ...(recommendedId === undefined ? {} : { recommendedId }),
    recommendationRule: RECOMMENDATION_RULE,
    tradeOff: TRADE_OFF,
    rejected: [{ scenarioId: SET_ASIDE_ID, blockingConstraint: BLOCKING_CONSTRAINT }],
  };
}

/** The set two comparable options make, with the recommendation the rule picked. */
function comparableSet(): ScenarioSet {
  return setOf([SOLVER_SCENARIO, SEEDED_SCENARIO], RECOMMENDED_ID);
}

/* ---------------------------------------------------------------------------------------------
 * The plan the approval list answers, which is what decides the control and the preview
 * ------------------------------------------------------------------------------------------- */

/** The plan's own identifier: an opaque placeholder, not a record-identifier shape. */
const PLAN_ID = 'apr-alpha';

/**
 * A second plan naming the same option, lodged after the decided one and still pending.
 *
 * Identifiers ascend in creation order, so this is the record a screen that read only the highest
 * identifier would report — while the decision sits on `PLAN_ID` and the adapter refuses a second
 * request for the option on that record's account.
 */
const LATER_PLAN_ID: ApprovalId = 'apr-bravo';

/** The roles whose members may decide the plan, which this screen never renders. */
const PLAN_APPROVER_ROLES: readonly Role[] = ['plant-manager'];

/** The persona who requested the plan, which this screen never renders either. */
const PLAN_REQUESTER_ID = 'persona-alpha';

/**
 * The steps a recorded plan states, each in a state the option's own fixture never reaches.
 *
 * The option's steps are one pending and one succeeded; these two are both recorded as succeeded, so a
 * case can tell the plan's record from the option's by the steps themselves and not only by the states
 * they carry.
 */
const PLAN_WRITE_BACKS: readonly WriteBack[] = [
  {
    sequence: 1,
    system: 'erp',
    recordRef: 'ref-plan-one',
    description: 'Record the approved release against the plan the reader decided.',
    state: 'succeeded',
  },
  {
    sequence: 2,
    system: 'mes',
    recordRef: 'ref-plan-two',
    description: 'Record the approved production order against the same plan.',
    state: 'succeeded',
  },
];

/**
 * The steps a request lodged beside a decided plan would write, each still pending.
 *
 * A record the adapter creates clones the option's steps and sets every one of them pending, which is
 * the state this fixture keeps. The steps are distinct from both other sets, so a case can tell which
 * record the preview drew them from.
 */
const LATER_WRITE_BACKS: readonly WriteBack[] = [
  {
    sequence: 1,
    system: 'plm-qms',
    recordRef: 'ref-later-one',
    description: 'Release the drawing the later request would write.',
    state: 'pending',
  },
];

/**
 * The plan naming the recommended option of this route's exception.
 *
 * A fresh object per call, because `Approval.writeBacks` is a mutable array the adapter replaces in
 * place: handing one instance to two renders would let a case read a record another one left behind.
 *
 * @param status - Where the plan stands.
 * @param writeBacks - The steps the plan states, in its own order.
 * @param id - The identifier the record carries, which orders it against another plan naming the same
 *   option: a case holding two of them states which one was lodged later.
 * @returns The approval record those three describe.
 */
function planOf(
  status: ApprovalStatus,
  writeBacks: readonly WriteBack[],
  id: ApprovalId = PLAN_ID,
): Approval {
  return {
    id,
    exceptionId: EXCEPTION_ID,
    scenarioId: RECOMMENDED_ID,
    requestedBy: PLAN_REQUESTER_ID,
    eligibleApproverRoles: [...PLAN_APPROVER_ROLES],
    status,
    addedCostEur: SOLVER_ADDED_COST,
    protectedRevenueEur: SOLVER_ADDED_COST,
    writeBacks: writeBacks.map((step) => ({ ...step })),
    outcomeReviewed: false,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The failures the port can throw, and the payload the export returns
 * ------------------------------------------------------------------------------------------- */

/** The permission a permission refusal names, from the contracts §7.1 vocabulary. */
const REQUIRED_PERMISSION: Permission = 'exception.read';

/** The roles that hold it, which the refusal carries so the forbidden card can name them. */
const ROLES_WITH_PERMISSION: readonly Role[] = ['plant-manager'];

/** The refusal a session without the permission receives, shaped as the port documents it. */
const PERMISSION_PROBLEM: Problem = {
  type: 'permission',
  message: 'Your role does not permit this comparison.',
  traceId: TRACE_ID,
  requiredPermission: REQUIRED_PERMISSION,
  rolesWithPermission: [...ROLES_WITH_PERMISSION],
};

/** The refusal a read receives when the records moved under the reader. */
const VALIDATION_PROBLEM: Problem = {
  type: 'validation',
  message: 'The records moved while this comparison was being read.',
  traceId: TRACE_ID,
};

/** A rejection that is not a `Problem` at all, which the screen reports as nothing answering. */
const UNREPORTED_FAILURE = new Error('The read stopped without reporting a cause.');

/**
 * The download payload the export member returns: the name, the media type and the document exactly as
 * the service composed them. The screen must offer these three and compose none of them (rule P-6).
 */
const EXPORT_PAYLOAD: ExportPayload = {
  filename: 'scenario-comparison.csv',
  mediaType: 'text/csv',
  content: 'option,units late\nfirst option,5\nsecond option,7\n',
};

/** The object URL the stubbed factory hands back; nothing resolves it, because nothing requests it. */
const OBJECT_URL = 'blob:scenario-comparison-object-url';

/* ---------------------------------------------------------------------------------------------
 * The harness: a fresh query cache, the route that names the exception, and the reads a case makes
 * ------------------------------------------------------------------------------------------- */

/**
 * Mounts the screen on its route inside the query cache and the router the shell would supply.
 *
 * A fresh `QueryClient` per render keeps one case's cache out of the next one's, and `retry: false`
 * with `gcTime: 0` makes every read settle once and request its records again when the boundary's own
 * retry asks for them. The route supplies the exception identifier `useParams()` reads, so the screen
 * is exercised the way the shell mounts it rather than through a prop a test invented.
 */
function renderScreen(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[COMPARISON_ROUTE]}>
        <Routes>
          <Route path="/exceptions/:exceptionId/scenarios" element={<ScenarioComparisonScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Waits for the first answer to be drawn, which is the moment the comparison exists. */
async function awaitMatrix(): Promise<HTMLElement> {
  return screen.findByRole('table', { name: COMPARISON_MATRIX_TEXT.caption });
}

/**
 * Waits for the read to settle.
 *
 * Every screen starts in `loading`, and that state renders a live region of its own, so a query for
 * "the status region" would otherwise meet the skeleton before the answer arrives and a case would
 * assert the state it asked about against the one that precedes it. Waiting for the busy caption to
 * leave is what makes the region a case then reads the region the read actually settled in.
 */
async function awaitSettled(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByText(STATE_BOUNDARY_TEXT.loading)).not.toBeInTheDocument();
  });
}

/** The matrix's table, named by the caption the component renders as its accessible name. */
function matrixTable(): HTMLElement {
  return screen.getByRole('table', { name: COMPARISON_MATRIX_TEXT.caption });
}

/** The nine measure rows' header cells, in drawn order. */
function measureHeaders(): HTMLElement[] {
  return within(matrixTable()).getAllByRole('rowheader');
}

/** One measure's row, found by the header that names it. */
function measureRow(label: string): HTMLTableRowElement {
  const header = within(matrixTable()).getByRole('rowheader', { name: label });
  const row = header.parentElement;

  if (!(row instanceof HTMLTableRowElement)) {
    throw new Error(`the measure ${label} rendered with no row around it`);
  }

  return row;
}

/** One row's measure cells: one per option, in the set's own order. */
function cellsOf(row: HTMLElement): HTMLElement[] {
  return within(row).getAllByRole('cell');
}

/** The column header the matrix drew for one option. */
function columnOf(scenarioId: ScenarioId): HTMLElement {
  const column = within(matrixTable())
    .getAllByRole('columnheader')
    .find((header) => (header.textContent ?? '').includes(scenarioId));

  if (column === undefined) {
    throw new Error(`the matrix drew no column for ${scenarioId}`);
  }

  return column;
}

/**
 * The one column the set recommends, marked structurally through `aria-current` rather than by a
 * colour, so the mark survives a greyscale rendering and reaches a screen reader (rule B-3).
 */
function recommendedColumn(): HTMLElement {
  const marked = within(matrixTable())
    .getAllByRole('columnheader')
    .filter((header) => header.getAttribute('aria-current') === 'true');
  const [column] = marked;

  if (marked.length !== 1 || column === undefined) {
    throw new Error(`the matrix marked ${String(marked.length)} columns as recommended`);
  }

  return column;
}

/** The card that owns one heading, which is the surface a case scopes its label assertions to. */
function cardOwning(heading: HTMLElement): HTMLElement {
  const card = heading.closest('section');

  if (!(card instanceof HTMLElement)) {
    throw new Error(`the heading ${heading.textContent ?? ''} sits in no card`);
  }

  return card;
}

/**
 * The status region holding one labelled notice.
 *
 * The two states that warn about the data keep the comparison on screen, and the sandbox inside that
 * comparison carries a live region of its own, so a screen in one of those states has more than one
 * status region. The notice a case asserts belongs to the region holding the label it is about.
 */
function statusRegionHolding(label: string): HTMLElement {
  const region = screen.getByText(label).closest('[role="status"]');

  if (!(region instanceof HTMLElement)) {
    throw new Error(`the notice ${label} rendered outside a status region`);
  }

  return region;
}

/** One control, found by its accessible name. */
function control(label: string): HTMLElement {
  return screen.getByRole('button', { name: label });
}

/** How many tab stops a case may walk before a control is declared unreachable. */
const MAX_TAB_STOPS = 60;

/**
 * Tabs forward until the target holds focus.
 *
 * The path a case takes to a control is the path a keyboard user takes, so a control that left the tab
 * order — or that another control now shadows — fails here rather than being focused programmatically
 * past the defect.
 */
async function tabTo(user: UserEvent, target: HTMLElement): Promise<void> {
  for (let step = 0; step < MAX_TAB_STOPS; step += 1) {
    await user.tab();

    if (document.activeElement === target) {
      return;
    }
  }

  throw new Error(`the control ${target.textContent ?? ''} was not reachable by tabbing`);
}

/** The hint a focused control paints, which is also the description it carries while closed. */
async function focusedHint(): Promise<HTMLElement> {
  return screen.findByRole('tooltip');
}

/**
 * Puts one property back as it was found, deleting it where the environment had none.
 *
 * jsdom exposes no object-URL factory at all, so the export case installs one to observe what the
 * screen hands over and removes it afterwards; restoring a descriptor the environment never had means
 * leaving the member undefined rather than deleting a non-optional property.
 */
function restoreProperty(
  target: object,
  key: string,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor === undefined) {
    Object.defineProperty(target, key, { configurable: true, writable: true, value: undefined });
    return;
  }

  Object.defineProperty(target, key, descriptor);
}

/* ---------------------------------------------------------------------------------------------
 * The suite
 * ------------------------------------------------------------------------------------------- */

describe('ScenarioComparisonScreen', () => {
  /**
   * Every case starts from the same answer: two comparable options with the recommendation the rule
   * picked, and an export that returns the payload the service composed. The unmount between cases is
   * registered globally by `tests/setup.ts`, which is the `cleanup` Testing Library arms once it finds
   * a global `afterEach`; the theme attribute is cleared here because the theme case sets it before
   * rendering.
   */
  beforeEach(() => {
    vi.clearAllMocks();
    delete document.documentElement.dataset.theme;

    stub.service.getScenarioSet.mockResolvedValue(ok(comparableSet()));
    stub.service.exportScenarioComparison.mockResolvedValue(ok(EXPORT_PAYLOAD));

    /* No plan by default: the cases that are not about a decided option read the comparison alone, so
       every other assertion here states the behaviour the screen has without an approval list. */
    stub.service.listApprovals.mockResolvedValue(ok([]));
  });

  it('draws the nine specified measures in order, with each option value in its own cell', async () => {
    renderScreen();
    await awaitMatrix();

    /* The eyebrow names the record the screen belongs to — the exception the route was opened for — the
       way SCR-03's header states its own record's identifier, so a reader knows whose options these are.
       Nothing else on the page carries that identifier, so this cannot pass on a page-wide match. */
    expect(screen.getByText(EXCEPTION_ID)).toBeVisible();

    /* The row headers are the eight measures of AAP §0.12.4 in that section's own order, with the
       run-out reading AAP §0.8 requires after the idle days it explains: a transposed pair or a missing
       row fails here, whatever the cells below happen to hold. */
    expect(measureHeaders().map((header) => (header.textContent ?? '').trim())).toEqual([
      ...MEASURE_LABELS,
    ]);

    /* One expectation per row, each stated from the fixture: the first option's value in the first
       cell and the second option's in the second, so a row or column transposition cannot pass. */
    const expectations: readonly {
      readonly label: string;
      readonly firstOption: string;
      readonly secondOption: string;
    }[] = [
      {
        label: COMPARISON_MATRIX_TEXT.rows.unitsLate,
        firstOption: String(SOLVER_UNITS_LATE),
        secondOption: String(SEEDED_UNITS_LATE),
      },
      {
        label: COMPARISON_MATRIX_TEXT.rows.maxDaysLate,
        firstOption: String(SOLVER_MAX_DAYS_LATE),
        secondOption: String(SEEDED_MAX_DAYS_LATE),
      },
      {
        label: COMPARISON_MATRIX_TEXT.rows.ordersOnTime,
        firstOption: String(SOLVER_ORDERS_ON_TIME),
        secondOption: String(SEEDED_ORDERS_ON_TIME),
      },
      {
        label: COMPARISON_MATRIX_TEXT.rows.addedCost,
        firstOption: formatMoney(SOLVER_ADDED_COST),
        secondOption: formatMoney(SEEDED_ADDED_COST),
      },
      {
        label: COMPARISON_MATRIX_TEXT.rows.lineIdleDays,
        firstOption: String(SOLVER_LINE_IDLE_DAYS),
        secondOption: String(SEEDED_LINE_IDLE_DAYS),
      },
      {
        /* The run-out pair rendered as AAP §0.8 requires: the reading each option's own pair composes
           through the module that owns the wording, never a "day N" phrase typed here (rule P-6). */
        label: COMPARISON_MATRIX_TEXT.rows.runOut,
        firstOption: runOutReading(SOLVER_SCENARIO.runOut),
        secondOption: runOutReading(SEEDED_SCENARIO.runOut),
      },
      {
        label: COMPARISON_MATRIX_TEXT.rows.confidence,
        firstOption: SOLVER_CONFIDENCE.reason,
        secondOption: SEEDED_CONFIDENCE.reason,
      },
      {
        label: COMPARISON_MATRIX_TEXT.rows.constraintCheck,
        firstOption: COMPARISON_MATRIX_TEXT.constraint.pass,
        secondOption: COMPARISON_MATRIX_TEXT.constraint.pass,
      },
      {
        label: COMPARISON_MATRIX_TEXT.rows.sideEffects,
        firstOption: String(SOLVER_KITS_DELAYED),
        secondOption: String(SEEDED_KITS_DELAYED),
      },
    ];

    for (const expectation of expectations) {
      const cells = cellsOf(measureRow(expectation.label));

      expect(cells).toHaveLength(2);
      expect(cells[0]?.textContent ?? '').toContain(expectation.firstOption);
      expect(cells[1]?.textContent ?? '').toContain(expectation.secondOption);
    }
  });

  it('states each option’s own run-out as the day plus its half-day reading, and none for a failed option', async () => {
    const first: RunOut = { day: RUN_OUT_DAY, fractionOfDay: RUN_OUT_FRACTION };
    const second: RunOut = { day: RUN_OUT_DAY + 2, fractionOfDay: 0 };

    stub.service.getScenarioSet.mockResolvedValue(
      ok(
        setOf(
          [
            { ...SOLVER_SCENARIO, runOut: first },
            { ...SEEDED_SCENARIO, runOut: second },
            FAILED_SCENARIO,
          ],
          RECOMMENDED_ID,
        ),
      ),
    );

    renderScreen();
    await awaitMatrix();

    /* The row exists, and it sits directly beneath the idle days it explains (AAP §0.8, §0.12.4). */
    const row = measureRow(COMPARISON_MATRIX_TEXT.rows.runOut);
    const headers = measureHeaders().map((header) => (header.textContent ?? '').trim());

    expect(headers.indexOf(COMPARISON_MATRIX_TEXT.rows.runOut)).toBe(
      headers.indexOf(COMPARISON_MATRIX_TEXT.rows.lineIdleDays) + 1,
    );

    const cells = cellsOf(row);
    expect(cells).toHaveLength(3);

    /* Each option states the reading its own pair composes — the two pairs differ, so a row reading one
       option's record for every column fails here — and the expectation comes from the fixture through
       the module that owns the wording rather than from a phrase typed into this case (rule P-6). */
    expect(cells[0]?.textContent ?? '').toContain(runOutReading(first));
    expect(cells[1]?.textContent ?? '').toContain(runOutReading(second));

    /* The option whose constraint check failed states nothing measured in this row either, exactly as
       its sibling measure rows do (AAP §0.8). */
    expect(cells[2]?.textContent).toBe(CANNOT_COMPUTE_LABEL);
  });

  it('marks the recommended option and states its rule and trade-off verbatim, under its own label', async () => {
    renderScreen();
    await awaitMatrix();

    /* The mark is structural — `aria-current` on the column header, never a colour alone (rule B-3). */
    expect(within(recommendedColumn()).getByText(RECOMMENDED_ID)).toBeVisible();

    const badge = screen.getByRole('heading', { name: RECOMMENDED_BADGE_LABEL, level: 2 });
    const block = cardOwning(badge);

    /* Scoped to the block, so the page-level badge of another surface could not satisfy the label. */
    expect(within(block).getByText(RECOMMENDATION_LABEL)).toBeVisible();
    expect(within(block).getByText(RECOMMENDED_ID)).toBeVisible();
    expect(within(block).getByText(RECOMMENDATION_RULE)).toBeVisible();
    expect(within(block).getByText(TRADE_OFF)).toBeVisible();
  });

  it('labels each column from its option origin, and scopes each label to that column', async () => {
    renderScreen();
    await awaitMatrix();

    const computed = columnOf(RECOMMENDED_ID);
    const seeded = columnOf(SEEDED_ID);

    expect(within(computed).getByText(CALCULATED_LABEL)).toBeVisible();
    expect(within(computed).queryByText(SEEDED_LABEL)).not.toBeInTheDocument();
    expect(within(seeded).getByText(SEEDED_LABEL)).toBeVisible();
    expect(within(seeded).queryByText(CALCULATED_LABEL)).not.toBeInTheDocument();
  });

  it('reports Cannot compute with the record messages, no figure, and the same reason on the action', async () => {
    const user = userEvent.setup();

    stub.service.getScenarioSet.mockResolvedValue(ok(setOf([FAILED_SCENARIO])));
    renderScreen();
    await awaitMatrix();

    /* Every measure the failed option cannot state reports the fixed sentence and nothing else: no
       NaN, no substituted zero, no blank cell (AAP §0.8). The constraint-check row is excluded because
       it is the row that carries the record's own reasons instead. */
    const unmeasurable: readonly string[] = [
      COMPARISON_MATRIX_TEXT.rows.unitsLate,
      COMPARISON_MATRIX_TEXT.rows.maxDaysLate,
      COMPARISON_MATRIX_TEXT.rows.ordersOnTime,
      COMPARISON_MATRIX_TEXT.rows.addedCost,
      COMPARISON_MATRIX_TEXT.rows.lineIdleDays,
      COMPARISON_MATRIX_TEXT.rows.runOut,
      COMPARISON_MATRIX_TEXT.rows.confidence,
      COMPARISON_MATRIX_TEXT.rows.sideEffects,
    ];

    for (const label of unmeasurable) {
      const cells = cellsOf(measureRow(label));

      expect(cells).toHaveLength(1);
      expect(cells[0]?.textContent).toBe(CANNOT_COMPUTE_LABEL);

      /* The cell states the record's own reason as its description rather than only the bare sentence:
         the messages the fixture's option carries are what the cell is described by, so the reason AAP
         §0.8 requires reaches every measure a reader lands on, without the text being repeated in the
         cell (rule B-3). */
      expect(cells[0]).toHaveAccessibleDescription(CONSTRAINT_MESSAGES.join(' '));
    }

    const constraintCell = cellsOf(measureRow(COMPARISON_MATRIX_TEXT.rows.constraintCheck))[0];

    expect(constraintCell?.textContent ?? '').toContain(COMPARISON_MATRIX_TEXT.constraint.fail);

    for (const message of CONSTRAINT_MESSAGES) {
      expect(constraintCell?.textContent ?? '').toContain(message);
    }

    /* The control that would put the plan forward cannot act, and says why in the record's own words:
       stated programmatically through `aria-describedby`, and painted as the hint a keyboard reader
       brings up on focus. */
    const reason = CONSTRAINT_MESSAGES.join(' ');
    const primary = control(REQUEST_APPROVAL_LABEL);

    expect(primary).toHaveAttribute('aria-disabled', 'true');
    expect(primary).toHaveAccessibleDescription(reason);

    await tabTo(user, primary);

    expect(await focusedHint()).toHaveTextContent(reason);
  });

  /*
   * THE PLAN THE APPROVAL LIST ANSWERS. The option set states no approval, so whether the option in
   * front of the reader has been decided arrives from the list read: a pending plan leaves the action
   * exactly as the option describes it, and an approved one closes it with the record's own identifier
   * and status in the explanation (AAP §0.2.2, rule P-8). Either way the preview shows the steps the
   * plan states, which is how a reader who returns from SCR-05 reads the states the record reached
   * instead of the always-pending steps the option shipped in.
   */
  it.each<{ readonly status: ApprovalStatus; readonly closed: boolean }>([
    { status: 'pending', closed: false },
    { status: 'approved', closed: true },
  ])(
    'reports a $status plan on the request control and previews that plan’s own steps',
    async ({ status, closed }) => {
      stub.service.getScenarioSet.mockResolvedValue(ok(setOf([SOLVER_SCENARIO], RECOMMENDED_ID)));
      stub.service.listApprovals.mockResolvedValue(ok([planOf(status, PLAN_WRITE_BACKS)]));

      renderScreen();
      await awaitMatrix();

      const primary = control(REQUEST_APPROVAL_LABEL);

      if (closed) {
        expect(primary).toHaveAttribute('aria-disabled', 'true');
        /* The reason names the record that holds the option and the status it stands in, so a reader
           learns which plan already answers this option rather than only that the control is shut. */
        expect(primary).toHaveAccessibleDescription(new RegExp(`${PLAN_ID}.*${status}`));
      } else {
        expect(primary).not.toHaveAttribute('aria-disabled');
      }

      const preview = cardOwning(
        screen.getByRole('heading', { level: 2, name: WRITE_BACK_PREVIEW_LABEL }),
      );

      for (const step of PLAN_WRITE_BACKS) {
        expect(within(preview).getByText(step.description)).toBeVisible();
      }

      /* The option's own steps are not the ones shown: the record's are. */
      for (const step of SOLVER_WRITE_BACKS) {
        expect(within(preview).queryByText(step.description)).not.toBeInTheDocument();
      }
    },
  );

  /*
   * THE DECISION IS THE APPROVED RECORD, NOT THE HIGHEST IDENTIFIER. One option can carry two plans at
   * once: a plan a decision was taken on, and a request lodged against the same option afterwards. The
   * adapter refuses a second request for that option while any approved record names it, so a control
   * that read only the latest record would offer a request the service then refuses — the state rule
   * P-8 forbids. The approved record carries the LOWER identifier here, and the list is answered in
   * both orders, because the screen must read the records rather than the order the read returned them
   * in.
   */
  it.each<{ readonly lodged: string; readonly approvals: readonly Approval[] }>([
    {
      lodged: 'the decided plan first in the list',
      approvals: [
        planOf('approved', PLAN_WRITE_BACKS),
        planOf('pending', LATER_WRITE_BACKS, LATER_PLAN_ID),
      ],
    },
    {
      lodged: 'the later request first in the list',
      approvals: [
        planOf('pending', LATER_WRITE_BACKS, LATER_PLAN_ID),
        planOf('approved', PLAN_WRITE_BACKS),
      ],
    },
  ])(
    'shuts the request control on an approved plan a later request outranks, with $lodged',
    async ({ approvals }) => {
      stub.service.getScenarioSet.mockResolvedValue(ok(setOf([SOLVER_SCENARIO], RECOMMENDED_ID)));
      stub.service.listApprovals.mockResolvedValue(ok([...approvals]));

      renderScreen();
      await awaitMatrix();

      const primary = control(REQUEST_APPROVAL_LABEL);

      expect(primary).toHaveAttribute('aria-disabled', 'true');
      /* The approved record is the one named, with the status it stands in, even though the pending
         request holds the higher identifier. */
      expect(primary).toHaveAccessibleDescription(new RegExp(`${PLAN_ID}.*approved`));
      /* The later request is not the decision, so it is not what the explanation names. */
      expect(primary).not.toHaveAccessibleDescription(new RegExp(LATER_PLAN_ID));

      const preview = cardOwning(
        screen.getByRole('heading', { level: 2, name: WRITE_BACK_PREVIEW_LABEL }),
      );

      /* The preview draws the decided plan's own steps: the states the decision reached, and neither
         the pending steps the later request would write nor the option's own always-pending ones. */
      for (const step of PLAN_WRITE_BACKS) {
        expect(within(preview).getByText(step.description)).toBeVisible();
      }

      for (const step of LATER_WRITE_BACKS) {
        expect(within(preview).queryByText(step.description)).not.toBeInTheDocument();
      }

      for (const step of SOLVER_WRITE_BACKS) {
        expect(within(preview).queryByText(step.description)).not.toBeInTheDocument();
      }
    },
  );

  it('states the fixed empty sentence and explains both controls it leaves disabled', async () => {
    const user = userEvent.setup();

    stub.service.getScenarioSet.mockResolvedValue(ok(setOf([])));
    renderScreen();
    await awaitSettled();

    /* Scoped to the notice: the same sentence also explains the disabled action, and the assertion
       belongs on the region that states the state. */
    const notice = screen.getByRole('status');

    expect(within(notice).getByText(EMPTY_SCENARIO_SET_MESSAGE)).toBeVisible();

    const primary = control(REQUEST_APPROVAL_LABEL);

    expect(primary).toHaveAttribute('aria-disabled', 'true');
    expect(primary).toHaveAccessibleDescription(EMPTY_SCENARIO_SET_MESSAGE);

    await tabTo(user, primary);

    expect(await focusedHint()).toHaveTextContent(EMPTY_SCENARIO_SET_MESSAGE);

    /* The constraints control is disabled for the whole of this run, and its explanation is reachable
       with the keyboard rather than only under a pointer (rule P-8, rule B-3). */
    const constraints = control(EDIT_CONSTRAINTS_LABEL);

    expect(constraints).toHaveAttribute('aria-disabled', 'true');
    expect(constraints).toHaveAccessibleDescription(CUSTOM_CONSTRAINTS_DISABLED_REASON);

    await tabTo(user, constraints);

    expect(await focusedHint()).toHaveTextContent(CUSTOM_CONSTRAINTS_DISABLED_REASON);
  });

  it('offers the service payload as a file when the export acts, and composes no document itself', async () => {
    const user = userEvent.setup();

    /* jsdom exposes no object-URL factory, so one is installed for this case only and removed again:
       a case that asserts a failure path would otherwise meet a factory the environment never had. */
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => OBJECT_URL);
    const revokeObjectURL = vi.fn<(url: string) => void>();
    const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    /* The anchor is in the document at the moment it is activated, and removed straight after, so the
       download name is read from there rather than from an element the screen leaves behind. */
    const downloaded: string[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      const anchor = document.querySelector('a[download]');
      downloaded.push(anchor?.getAttribute('download') ?? '');
    });

    try {
      renderScreen();
      await awaitMatrix();

      await user.click(control(EXPORT_COMPARISON_LABEL));

      await waitFor(() => {
        expect(createObjectURL).toHaveBeenCalledTimes(1);
      });

      /* One call, with the route's exception: the comparison is the service's document, so the screen
         asks for it once and hands on what it received (rule P-2, rule P-6). */
      expect(stub.service.exportScenarioComparison).toHaveBeenCalledTimes(1);
      expect(stub.service.exportScenarioComparison).toHaveBeenCalledWith(EXCEPTION_ID);

      /* The file is the payload's own name and media type, not a name or a type composed here. */
      expect(downloaded).toEqual([EXPORT_PAYLOAD.filename]);

      const handed = createObjectURL.mock.calls[0]?.[0];

      expect(handed).toBeInstanceOf(Blob);
      expect(handed?.type).toBe(EXPORT_PAYLOAD.mediaType);

      /* The object URL is released on the next task, so an engine that reads the blob asynchronously
         still finds it: this reads for the release once it has happened rather than in the task that
         activated the anchor (rule B-1). */
      await waitFor(() => {
        expect(revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL);
      });
    } finally {
      clickSpy.mockRestore();
      restoreProperty(URL, 'createObjectURL', createDescriptor);
      restoreProperty(URL, 'revokeObjectURL', revokeDescriptor);
    }
  });

  it('previews the selected option write-backs in record order, each labelled one by one', async () => {
    renderScreen();
    await awaitMatrix();

    const heading = screen.getByRole('heading', { name: WRITE_BACK_PREVIEW_LABEL });
    const steps = within(cardOwning(heading)).getAllByRole('listitem');

    expect(steps).toHaveLength(SOLVER_WRITE_BACKS.length);

    /* Step n of the preview is step n of the record: the assertion is positional, so a re-ordered or
       re-counted list fails rather than passing on a search of the whole block. */
    SOLVER_WRITE_BACKS.forEach((writeBack, index) => {
      const rendered = steps[index];

      if (rendered === undefined) {
        throw new Error(`the preview drew no step at position ${String(index)}`);
      }

      expect(within(rendered).getByText(writeBack.description)).toBeVisible();
      expect(within(rendered).getByText(WRITE_BACK_LABEL)).toBeVisible();
    });
  });

  it('reveals the units-late chart as the rows its bars draw, then returns to the chart', async () => {
    const user = userEvent.setup();

    /* The toggle names the representation it asks for and the chart it belongs to, so two charts on
       one screen stay distinguishable; the name is the component's own composition. */
    const toggleName = (label: string): string =>
      `${label}: ${SCENARIO_COMPARISON_TEXT.chartTitle}`;

    renderScreen();
    await awaitMatrix();

    expect(
      screen.getByRole('group', { name: COMPARISON_MATRIX_TEXT.rows.unitsLate }),
    ).toBeVisible();

    await user.click(control(toggleName(VIEW_AS_TABLE_LABELS.showTable)));

    const table = await screen.findByRole('table', {
      name: SCENARIO_COMPARISON_TEXT.chartTableCaption,
    });
    const dataRows = within(table).getAllByRole('row').slice(1);

    expect(dataRows).toHaveLength(SOLVER_ORDERS.length);

    /* One row per order, and one cell per option: the table view holds the same readings the bars
       draw, in the same order, so a chart that had drifted from its table would fail here. */
    SOLVER_ORDERS.forEach((order, index) => {
      const row = dataRows[index];
      const seeded = SEEDED_ORDERS[index];

      if (row === undefined || seeded === undefined) {
        throw new Error(`the table view drew no row at position ${String(index)}`);
      }

      const cells = within(row).getAllByRole('cell');

      expect(cells).toHaveLength(3);
      expect(cells[0]?.textContent ?? '').toContain(order.orderId);
      expect(cells[1]?.textContent ?? '').toContain(String(order.unitsLate));
      expect(cells[2]?.textContent ?? '').toContain(String(seeded.unitsLate));
    });

    await user.click(control(toggleName(VIEW_AS_TABLE_LABELS.showChart)));

    expect(
      screen.getByRole('group', { name: COMPARISON_MATRIX_TEXT.rows.unitsLate }),
    ).toBeVisible();
    expect(
      screen.queryByRole('table', { name: SCENARIO_COMPARISON_TEXT.chartTableCaption }),
    ).not.toBeInTheDocument();
  });


  /* -------------------------------------------------------------------------------------------
   * The seven states
   *
   * Every member of `ScreenState` is reached through the read's own settled facts — the promise's
   * state, its rejection and the freshness report its `meta` carries — so no case mocks
   * `StateBoundary`: the screen derives each state in one place and the boundary owns how it looks.
   * ----------------------------------------------------------------------------------------- */

  it('renders the loading state as a busy region, with no comparison behind it', async () => {
    stub.service.getScenarioSet.mockReturnValue(
      new Promise<Result<ScenarioSet>>(() => undefined),
    );
    renderScreen();

    const busy = await screen.findByRole('status');

    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toHaveTextContent(STATE_BOUNDARY_TEXT.loading);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the empty state with the fixed sentence and no comparison', async () => {
    stub.service.getScenarioSet.mockResolvedValue(ok(setOf([])));
    renderScreen();
    await awaitSettled();

    const notice = screen.getByRole('status');

    expect(within(notice).getByText(EMPTY_SCENARIO_SET_MESSAGE)).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the stale banner naming the source and its as-of time, and still draws the comparison', async () => {
    stub.service.getScenarioSet.mockResolvedValue(
      ok(comparableSet(), [freshnessOf('stale')]),
    );
    renderScreen();
    await awaitSettled();

    const banner = statusRegionHolding(`${SOURCE_LABELS.erp}${STATE_BOUNDARY_TEXT.staleSuffix}`);

    expect(within(banner).getByText(AS_OF)).toBeVisible();

    /* The two states that warn about the data keep it on screen, which is the half a reader needs in
       order to judge the figures the warning is about. */
    expect(await awaitMatrix()).toBeVisible();
  });

  it('disables the request while the gating source is not current, giving its label and as-of time as the reason', async () => {
    /* The two states the service refuses a request on. The sentence the control must carry is
       assembled from the module's own wording and the record's own label and instant, so the case
       types neither (rule P-6). */
    for (const state of ['stale', 'unavailable'] as const) {
      const gate = freshnessOf(state);

      stub.service.getScenarioSet.mockResolvedValue(ok(comparableSet(), [gate]));
      renderScreen();
      await awaitSettled();

      const request = control(REQUEST_APPROVAL_LABEL);

      expect(request).toHaveAttribute('aria-disabled', 'true');
      expect(request).toHaveAccessibleDescription(
        `${SCENARIO_COMPARISON_TEXT.staleSourcePrefix} ${SOURCE_LABELS[gate.source]} ` +
          `${SCENARIO_COMPARISON_TEXT.staleSourceSuffix} ${SOURCE_LABELS[gate.source]} ` +
          `as of ${gate.asOf}.`,
      );

      /* Unmount before the next state, so one state's render cannot satisfy the next one's queries. */
      cleanup();
    }

    /* A source the service accepts leaves the control able to act, which is the other half of the
       same rule: the reason is the record's, not a blanket refusal. */
    stub.service.getScenarioSet.mockResolvedValue(ok(comparableSet(), [freshnessOf('fresh')]));
    renderScreen();
    await awaitMatrix();

    expect(control(REQUEST_APPROVAL_LABEL)).not.toHaveAttribute('aria-disabled');
  });

  it('renders the partial notice above the comparison it still draws', async () => {
    stub.service.getScenarioSet.mockResolvedValue(
      ok(comparableSet(), [freshnessOf('partial')]),
    );
    renderScreen();
    await awaitSettled();

    const notice = statusRegionHolding(STATE_BOUNDARY_TEXT.partialHeadline);

    expect(within(notice).getByText(SCENARIO_COMPARISON_TEXT.partial)).toBeVisible();
    expect(await awaitMatrix()).toBeVisible();
    expect(control(STATE_BOUNDARY_TEXT.retryLabel)).toBeVisible();
  });

  it('renders the offline notice with a retry a keyboard can operate', async () => {
    const user = userEvent.setup();

    stub.service.getScenarioSet.mockRejectedValue(UNREPORTED_FAILURE);
    renderScreen();
    await awaitSettled();

    const notice = screen.getByRole('status');

    expect(within(notice).getByText(STATE_BOUNDARY_TEXT.offlineHeadline)).toBeVisible();
    expect(within(notice).getByText(STATE_BOUNDARY_TEXT.offlineDetail)).toBeVisible();

    const retry = control(STATE_BOUNDARY_TEXT.retryLabel);

    await tabTo(user, retry);

    expect(retry).toHaveFocus();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(stub.service.getScenarioSet).toHaveBeenCalledTimes(2);
    });
  });

  it('renders the forbidden card with the permission, the roles and the trace id of the refusal', async () => {
    stub.service.getScenarioSet.mockRejectedValue(PERMISSION_PROBLEM);
    renderScreen();

    /* The card's title carries the permission the refusal named, so the assertion reads the text node
       that holds it rather than restating the sentence the card composes. */
    const namedPermission = await screen.findByText((content) =>
      content.includes(REQUIRED_PERMISSION),
    );

    expect(namedPermission).toBeVisible();

    for (const role of ROLES_WITH_PERMISSION) {
      expect(screen.getByText(role)).toBeVisible();
    }

    expect(screen.getByText(TRACE_ID)).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the conflict notice with the refusal sentence and a reload control', async () => {
    stub.service.getScenarioSet.mockRejectedValue(VALIDATION_PROBLEM);
    renderScreen();
    await awaitSettled();

    const notice = screen.getByRole('status');

    expect(within(notice).getByText(STATE_BOUNDARY_TEXT.conflictHeadline)).toBeVisible();
    expect(within(notice).getByText(VALIDATION_PROBLEM.message)).toBeVisible();
    expect(control(STATE_BOUNDARY_TEXT.reloadLabel)).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  /* -------------------------------------------------------------------------------------------
   * Both themes
   * ----------------------------------------------------------------------------------------- */

  it('renders the same heading, recommendation and figures under both themes', async () => {
    for (const theme of THEMES) {
      document.documentElement.setAttribute('data-theme', theme);
      renderScreen();

      await awaitMatrix();

      expect(
        screen.getByRole('heading', { level: 1, name: SCENARIO_COMPARISON_TITLE }),
      ).toBeVisible();
      expect(
        screen.getByRole('heading', { level: 2, name: RECOMMENDED_BADGE_LABEL }),
      ).toBeVisible();
      expect(
        cellsOf(measureRow(COMPARISON_MATRIX_TEXT.rows.unitsLate))[0]?.textContent ?? '',
      ).toContain(String(SOLVER_UNITS_LATE));

      /* Unmount before the next theme, so one theme's render cannot satisfy the next one's queries. */
      cleanup();
    }
  });

  /* -------------------------------------------------------------------------------------------
   * The keyboard
   * ----------------------------------------------------------------------------------------- */

  it('reaches both actions and the option selection by tabbing, and the selection moves the action state', async () => {
    const user = userEvent.setup();

    /* One option inside its bounds and one that breached them: choosing the second must disable the
       request with that option's own reason, which is what proves the control follows the selection. */
    stub.service.getScenarioSet.mockResolvedValue(
      ok(setOf([SOLVER_SCENARIO, FAILED_SCENARIO], RECOMMENDED_ID)),
    );
    renderScreen();
    await awaitMatrix();

    const primary = control(REQUEST_APPROVAL_LABEL);

    expect(primary).not.toHaveAttribute('aria-disabled');

    await tabTo(user, primary);

    expect(primary).toHaveFocus();

    const exportAction = control(EXPORT_COMPARISON_LABEL);

    await tabTo(user, exportAction);

    expect(exportAction).toHaveFocus();

    const failedOption = screen.getByRole('button', { name: FAILED_SCENARIO.name });

    await tabTo(user, failedOption);

    expect(failedOption).toHaveAttribute('aria-pressed', 'false');

    await user.keyboard('{Enter}');

    expect(failedOption).toHaveAttribute('aria-pressed', 'true');
    expect(control(REQUEST_APPROVAL_LABEL)).toHaveAttribute('aria-disabled', 'true');
    expect(control(REQUEST_APPROVAL_LABEL)).toHaveAccessibleDescription(
      CONSTRAINT_MESSAGES.join(' '),
    );

    /* Back one stop to the other option's own control: the same keystrokes re-enable the action. */
    const solverOption = screen.getByRole('button', { name: SOLVER_SCENARIO.name });

    await user.tab({ shift: true });

    expect(solverOption).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(solverOption).toHaveAttribute('aria-pressed', 'true');
    expect(failedOption).toHaveAttribute('aria-pressed', 'false');
    expect(control(REQUEST_APPROVAL_LABEL)).not.toHaveAttribute('aria-disabled');
  });
});

