/**
 * Component suite for `scenario-sandbox.tsx`, the SCR-04 control that duplicates one option and
 * measures the duplicate again at the lever values a reader types.
 *
 * WHAT IT PROVES. Nine contracts the sandbox is relied on for, each stated as a case that fails on
 * one specific regression rather than as a description of the markup:
 *
 * 1. ONE REQUEST PER BURST. Two lever fields edited inside the debounce window produce exactly one
 *    `solveScenario` call once that window passes, and a further edit produces exactly one more. A
 *    per-keystroke caller — the defect a mutation in the query cache would let through, because the
 *    cache is not asked to deduplicate one (AAP §0.18.1) — fails it. This is the case the folder
 *    brief centres on.
 * 2. ONLY THE LEVER VALUES TRAVEL. The port receives a `Levers` object holding the values the fields
 *    were left holding and nothing else: no identifier, no derived member, no stale value. Equality
 *    against the expected object is what makes an extra field a failure.
 * 3. NO LOCAL ARITHMETIC AND NO LOCAL FORMATTING. Nothing is measured until the call settles — the
 *    base option's own measures are not repeated as a guess — and once it settles the figures on
 *    screen are exactly the ones the service returned, from a payload whose measures differ from the
 *    base option's, so the component could only have obtained them from the port (rule P-6). Each of
 *    those figures is an evidence trigger too, and activating it opens the drawer on the duplicated
 *    option's reference — the record whose case the measurement was taken from, and the reference the
 *    comparison matrix's cells carry — rather than on the identifier the adapter minted for the
 *    duplicate, which names no record the service holds (AAP §0.12.4, F12).
 * 4. THE FAILED CONSTRAINT PATH. A lever outside its bound comes back as a `Scenario` whose
 *    `constraintCheck` is `'fail'` with one message per breach, not as a `Problem` (AAP §0.12.3). The
 *    panel states `CANNOT_COMPUTE_LABEL` with the record's own messages, renders no figure for the
 *    failing measures, and leaves the recompute control disabled with a reason that names the cause
 *    instead of inert (rule P-8).
 * 5. A `Problem` FROM THE PORT. A `'validation'` refusal prints the service's own sentence and trace
 *    identifier with one retry that repeats the call; a `'permission'` refusal names the permission
 *    and the roles that hold it and offers no retry at all, because repeating it would be a control
 *    that cannot act (rule P-8).
 * 6. KEYBOARD OPERATION (`T-16`, rule B-3). `Tab` reaches each lever field, each field's accessible
 *    name is the contract's own member name, `Enter` sends one request without waiting out the delay
 *    and cancels the pending one, and the focused field carries the focus-ring utility the theme
 *    exposes.
 * 7. BOTH THEMES. The same controls and the same figures render under `data-theme="command"` and
 *    `data-theme="paper"`, because the panel is built from role utilities rather than a theme-aware
 *    branch. Token correctness is the theme's own suite; this is the smoke assertion that neither
 *    theme hides a figure.
 * 8. THE DISABLED STATE. With no option to duplicate, the recompute control keeps its label, refuses
 *    activation, and carries its reason as its accessible description and as the hint a keyboard
 *    reader brings up (rule P-8) — asserted as text, never as `aria-disabled` alone.
 * 9. THE BOUNDS THE CASE SETS. Each lever field is described by the rule the case holds every lever to
 *    and, where the option set records them, by the case's own bound statements — the failing option's
 *    constraint messages, naming that case's maximum and step — handed to the panel verbatim and
 *    rendered above the fields as well as described by them. A field that is not a number keeps its own
 *    sentence after those two, so the bound is heard before the defect; a set that records no statement
 *    publishes the rule alone, with nothing standing in its place; and no `min`, `max`, `step` or
 *    `aria-value*` attribute appears on either field, because no record the panel can reach carries a
 *    bound (rule P-6, rule B-3).
 * 10. A LEVER FAR OUTSIDE ITS BOUND, ECHOED READABLY. A value typed into a field and refused by the
 *    constraint check comes back in the grouped notation the interface prints numbers in, never in
 *    the exponent form `String()` gives a large one: the sentence naming the values the measurement
 *    was taken at states the typed digits, and no `1e+30` appears anywhere in the panel (AAP §0.8,
 *    AAP §0.12.3, rule P-6).
 *
 * WHERE THE DATA COMES FROM. The service is mocked at `service-provider.tsx`, the one boundary the
 * component may read through (rule P-2), so no seed module, adapter, domain module or shell is
 * involved and the suite observes exactly the call the sandbox makes. Everything else — `Panel`,
 * `StatusIndicator`, `MonoValue`, `EvidenceRef` with the drawer it mounts, and `ActionButton` with
 * its hint — is the real component, because what a reader receives is the thing under test. The
 * drawer reads its record through that same mocked `getEvidence`, so a case observes both the
 * reference a figure carries and the payload the drawer renders from it. Each render sits in a
 * `QueryClientProvider` holding a fresh client, as the component's sibling suites do; the sandbox
 * itself reads no query, and no router is used, because the panel has nothing to navigate.
 *
 * THE FIXTURE IS INPUT, NOT AN EXPECTED RESULT (rule P-6). Every value below is data handed to the
 * mocked call, so a case can only pass by finding what the component actually rendered. The folder is
 * inside the figure scan, so identifiers are opaque placeholders (`scn-alpha`, `exc-alpha`) rather
 * than record-shaped references, the lever values typed by a case are plain integers apart from the
 * one value a case states far outside its bound — that one is typed as its own thirty digits, because
 * the exponent form a large number stringifies to is exactly what the case exists to rule out — and
 * every amount is asserted through the imported `formatMoney` rather than as a currency literal. The
 * constraint messages are record text — the service's own wording for a breach — built here from the
 * bound fixture so the two cannot drift apart.
 *
 * THE WORDING IS NOT RETYPED. `SCENARIO_SANDBOX_TEXT`, `CANNOT_COMPUTE_LABEL` and
 * `COMPARISON_MATRIX_TEXT` are imported, so a reworded label or measure fails the case that names it,
 * and `sandboxDisabledReason` and `invalidLeverText` are imported so the expected explanation and the
 * expected field description are the component's own sentences rather than copies of them.
 *
 * TWO CONSTRAINTS THE SUITE WORKS WITHIN. `scenario-sandbox.tsx` keeps its input class list
 * module-private, so the focus-ring utility the keyboard case asserts is named once in
 * {@link FOCUS_RING_UTILITY} with the reason it is stated there; and a lever's bound lives on
 * `SolverCase`, which no member of the port's scenario reads carries, so a field wears no `min`, `max`
 * or `step` and the breach case states the bound on the fixture and drives the breach through the
 * response. The one path a bound takes to the panel is the records' own wording: the failing option's
 * constraint messages, handed in as `caseBoundStatements` and asserted verbatim by the bounds case.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock, touches the network or waits on a real timer.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EVIDENCE_DRAWER_TEXT } from '../../components/evidence-drawer';
import { formatMoney, formatQuantity } from '../../components/mono-value';
import { MEANING_COLOUR_CLASSES, STATUS_LABEL_CLASS } from '../../components/status-indicator';
import { SIM_LABELS } from '../../types';
import type {
  Confidence,
  ConstraintCheck,
  Evidence,
  ExceptionId,
  Levers,
  LeverConstraint,
  Meta,
  Money,
  Permission,
  Problem,
  Result,
  Role,
  RunOut,
  Scenario,
  ScenarioId,
  ScenarioOrigin,
  SimLabel,
} from '../../types';
import {
  CANNOT_COMPUTE_LABEL,
  COMPARISON_MATRIX_TEXT,
  CONFIDENCE_PRESENTATION,
} from './comparison-matrix';
import {
  SANDBOX_RECOMPUTE_DELAY_MS,
  SCENARIO_SANDBOX_TEXT,
  ScenarioSandbox,
  invalidLeverText,
  measuredAtText,
  sandboxDisabledReason,
} from './scenario-sandbox';
import type { ScenarioSandboxProps } from './scenario-sandbox';

/* ---------------------------------------------------------------------------------------------
 * The port, replaced at the one seam a screen may read through
 * ------------------------------------------------------------------------------------------- */

/**
 * The one member of the port this component uses, typed with the port's own signature so a case reads
 * the arguments it sent without a cast (rule P-2, and success criterion 5's bar on widened types).
 *
 * Created through `vi.hoisted` because the module mock below is hoisted above the imports: the
 * factory needs the function to exist by the time the component module is evaluated.
 */
const solveScenario = vi.hoisted(() =>
  vi.fn<(exceptionId: ExceptionId, levers: Levers) => Promise<Result<Scenario>>>(),
);

/**
 * The port member the evidence drawer reads through, replaced at the same seam.
 *
 * The sandbox itself reads no evidence: the drawer each measure's trigger mounts does, and it asks
 * this member for the reference the trigger carries. Mocking it here is what lets a case observe the
 * reference a figure opens rather than asserting the drawer's markup, and it keeps the real provider
 * — and with it the in-browser adapter and its seeded records — out of a component test (rule P-2).
 */
const getEvidence = vi.hoisted(() => vi.fn<(ref: string) => Promise<Result<Evidence>>>());

vi.mock('../../services/service-provider', () => ({
  useService: () => ({ solveScenario, getEvidence }),
}));

/* ---------------------------------------------------------------------------------------------
 * The fixtures — input for the mocked call, and nothing an expected result would hold
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every result and every failure of these fixtures carries. */
const TRACE_ID = 'trace-sandbox-run';

/** The exception the option belongs to: an opaque placeholder, not a record-identifier shape. */
const EXCEPTION_ID: ExceptionId = 'exc-alpha';

/** The metadata every `Result` carries: no source recorded, simulated, and one trace. */
const META: Meta = { freshness: [], simulated: true, traceId: TRACE_ID };

/**
 * The label every computed figure carries, read from the tuple that owns the seven fixed strings so
 * this suite can never assert a label the interface does not print (rule P-1).
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/**
 * The focus-ring utility the lever field applies.
 *
 * `scenario-sandbox.tsx` keeps its input class list private (see the module note above), so the keyboard
 * case names this one utility instead: it is the role the theme exposes for the visible indicator rule
 * B-3 requires, and a field that stopped carrying it fails the case.
 */
const FOCUS_RING_UTILITY = 'focus-visible:outline-focus-ring';

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/** The bound the case holds the air-freight lever to, as `SolverCase` states it. */
const AIR_SETS_BOUND: LeverConstraint = { max: 12, step: 3 };

/** The bound the case holds the transfer lever to. */
const TRANSFER_SETS_BOUND: LeverConstraint = { max: 9, step: 3 };

/**
 * The levers the failed response reports: one above its maximum and one between two steps, which are
 * the two breaches AAP §0.12.2 names besides a negative value.
 */
const BREACHED_LEVERS: Levers = {
  airSets: AIR_SETS_BOUND.max + AIR_SETS_BOUND.step,
  transferSets: TRANSFER_SETS_BOUND.step + 1,
};

/**
 * The two breaches the failed-constraint response reports, one message per breach (AAP §0.12.2).
 *
 * They are this fixture's record text — the wording a solver returns — and are built from the bounds
 * above so a changed bound moves the messages with it rather than leaving them disagreeing with it.
 */
const BREACH_MESSAGES: readonly string[] = [
  `airSets is above its maximum of ${String(AIR_SETS_BOUND.max)}.`,
  `transferSets is between two steps, and the step is ${String(TRANSFER_SETS_BOUND.step)}.`,
];

/**
 * Both levers the panel offers, in the order it renders them: the contract's own member names, which are
 * also the accessible names their fields carry.
 */
const LEVER_FIELDS: readonly (keyof Levers)[] = ['airSets', 'transferSets'];

/**
 * A set in which every option stayed inside its bounds, so the records state no bound at all.
 *
 * It is what the port answers for an exception whose options all pass their constraint check, and the
 * state a case passes to prove the panel publishes its own rule alone rather than standing a
 * placeholder where a record's statement would be.
 */
const NO_CASE_BOUND_STATEMENTS: readonly string[] = [];

/**
 * A statement holding nothing but whitespace: the one shape of record text that would leave an empty
 * sentence on the screen, and which the panel drops rather than renders as a blank line.
 */
const BLANK_STATEMENT = '   ';

/** The lever values a case types: distinct from the base option's, so a stale send fails case 2. */
const EDITED_LEVERS: Levers = { airSets: 8, transferSets: 9 };

/** One more air-freight value, typed after the debounce window has passed (case 1). */
const LATER_AIR_SETS = 4;

/**
 * The digits a case types into the air-freight field to stand far outside every bound the case states.
 *
 * Thirty nines are deliberately beyond the range in which a double prints in decimal notation — a
 * magnitude beyond a trillion billions stringifies in exponent form — so the value the request carries
 * is one a raw interpolation would render as `1e+30`. The case reads the number back with `Number`,
 * exactly as the field's own parse does, rather than stating the value a second time.
 */
const BEYOND_BOUND_DIGITS = '9'.repeat(30);

/** The value those digits name, converted the way the field converts the reader's text. */
const BEYOND_BOUND_VALUE = Number(BEYOND_BOUND_DIGITS);

/** The permission a `'permission'` refusal names, from the contracts §7.1 vocabulary. */
const REQUIRED_PERMISSION: Permission = 'scenario.create';

/** The roles that hold it, which the refusal carries so the panel can name them. */
const ROLES_WITH_PERMISSION: Role[] = ['material-planner'];

/** One `Scenario` as a case states it, before the builder fills the members the panel never shows. */
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

  /** How many orders the case measures. */
  readonly ordersTotal: number;

  /** What the option costs, in euro. */
  readonly addedCostEur: Money;

  /** The working days the line stands idle. */
  readonly lineIdleDays: number;

  /** The value of the revenue the option holds up, in euro. */
  readonly revenueDelayedEur: Money;

  /** When supply runs out under the option. */
  readonly runOut: RunOut;

  /** Whether every lever stayed inside its bound. */
  readonly constraintCheck: ConstraintCheck;

  /** One plain message per breach; absent for an option that stayed inside its bounds. */
  readonly constraintMessages?: readonly string[];

  /** How much confidence the measurement carries, with the reason for it. */
  readonly confidence: Confidence;
}

/**
 * Builds the record the service returns, member by member.
 *
 * The series, the per-order results, the side effects and the write-backs are stated empty: the panel
 * renders none of them (AAP §0.12.4 gives the side-effect row to the matrix's own column), so a
 * fixture that invented them would be asserting nothing. Every member the panel does render comes
 * from the spec, so a case can vary one measure and see exactly that one change.
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
    ordersTotal: spec.ordersTotal,
    addedCostEur: spec.addedCostEur,
    lineIdleDays: spec.lineIdleDays,
    revenueDelayedEur: spec.revenueDelayedEur,
    runOut: spec.runOut,
    dailyClosingStock: [],
    orders: [],
    constraintCheck: spec.constraintCheck,
    constraintMessages: [...(spec.constraintMessages ?? [])],
    sideEffects: [],
    writeBacks: [],
    confidence: spec.confidence,
  };
}

/** The option the screen hands the sandbox: the one a run duplicates. */
function makeBaseScenario(): Scenario {
  return scenarioOf({
    id: 'scn-alpha',
    name: 'Combined response',
    origin: 'solver',
    levers: { airSets: 2, transferSets: 3 },
    unitsLate: 5,
    maxDaysLate: 4,
    ordersOnTime: 6,
    ordersTotal: 7,
    addedCostEur: 1200,
    lineIdleDays: 1.5,
    revenueDelayedEur: 3400,
    runOut: { day: 6, fractionOfDay: 0.5 },
    constraintCheck: 'pass',
    confidence: { level: 'high', reason: 'Every order in the case is placed inside the window.' },
  });
}

/**
 * The measurement the port returns: a duplicate whose measures all differ from the base option's, so
 * a figure on screen can only have come from this payload.
 */
function makeRecomputedScenario(): Scenario {
  return scenarioOf({
    id: 'scn-beta',
    name: 'Duplicate of the selected option',
    origin: 'sandbox',
    levers: EDITED_LEVERS,
    unitsLate: 11,
    maxDaysLate: 12,
    ordersOnTime: 13,
    ordersTotal: 14,
    addedCostEur: 46500,
    lineIdleDays: 2.25,
    revenueDelayedEur: 61000,
    runOut: { day: 3, fractionOfDay: 0.25 },
    constraintCheck: 'pass',
    confidence: { level: 'medium', reason: 'The duplicate recovers sets the case does not price.' },
  });
}

/**
 * The measurement the port returns for a lever outside its bound: still a `Scenario`, with the check
 * failed and one message per breach (AAP §0.12.3), which is what the panel must render instead of a
 * figure.
 */
function makeBreachedScenario(): Scenario {
  return scenarioOf({
    id: 'scn-gamma',
    name: 'Duplicate beyond the bound',
    origin: 'sandbox',
    levers: BREACHED_LEVERS,
    unitsLate: 77,
    maxDaysLate: 78,
    ordersOnTime: 79,
    ordersTotal: 80,
    addedCostEur: 91000,
    lineIdleDays: 3.75,
    revenueDelayedEur: 88000,
    runOut: { day: 2, fractionOfDay: 0.75 },
    constraintCheck: 'fail',
    constraintMessages: BREACH_MESSAGES,
    confidence: { level: 'low', reason: 'The duplicate breaches a bound, so its measures do not stand.' },
  });
}

/** The one breach a value far above the air lever's maximum reports, in the record's own wording. */
const BEYOND_BOUND_MESSAGES: readonly string[] = [
  `airSets is above its maximum of ${String(AIR_SETS_BOUND.max)}.`,
];

/**
 * The measurement the port returns for a lever far outside its bound: still a `Scenario`, with the
 * check failed and the record's own message, which is the path AAP §0.12.3 fixes for a breach — never
 * a `Problem`.
 *
 * The levers are the position the case typed, so the sentence under the result states the value the
 * request carried rather than a number of this fixture's own; the measures nobody renders for a
 * failed check are the breached fixture's, since a failing option shows no figure at all.
 *
 * @param levers - The position the case typed into the two fields.
 * @returns The failing option the service would answer with.
 */
function makeBeyondBoundScenario(levers: Levers): Scenario {
  return { ...makeBreachedScenario(), levers, constraintMessages: [...BEYOND_BOUND_MESSAGES] };
}

/** The `Problem` a refused call throws when the records cannot support the request. */
const VALIDATION_PROBLEM: Problem = {
  type: 'validation',
  message: 'The case has no opening position for this window, so no measurement could be taken.',
  traceId: TRACE_ID,
};

/** The `Problem` a refused call throws when the acting role may not measure an option. */
const PERMISSION_PROBLEM: Problem = {
  type: 'permission',
  message: 'Measuring an option needs a permission the acting persona does not hold.',
  traceId: TRACE_ID,
  requiredPermission: REQUIRED_PERMISSION,
  rolesWithPermission: ROLES_WITH_PERMISSION,
};

/** One lever position the evidence record states as an input, in place of a reference. */
const EVIDENCE_INPUT = 'a lever position the measurement read';

/** One record the evidence payload names as upstream: the case the measurement was taken from. */
const EVIDENCE_UPSTREAM = 'the case the measurement was taken from';

/**
 * The record the evidence read answers a measure's trigger with.
 *
 * The drawer asks the port for the reference the trigger carries as it opens and renders the payload
 * it receives, so the fixture fills the sections a case reads: the value and the rule behind it, the
 * records that fed it, and the judgement it carries. Every string is this suite's own record text and
 * states no figure (rule P-6), and the label is the fixed §5.3 one the computed-figure tuple owns,
 * because a record the drawer shows a figure for carries its own label (rule P-1, AAP §0.10).
 */
const MEASURED_EVIDENCE: Evidence = {
  value: 'the option under test, as the record states it',
  provenance: 'computed',
  label: CALCULATION_LABEL,
  formula: 'the rule the service names for the measures behind it',
  inputs: [EVIDENCE_INPUT],
  upstream: [EVIDENCE_UPSTREAM],
  downstream: [],
  confidence: { level: 'high', reason: 'the records behind it were read in full' },
  missingInputs: [],
  documents: [],
};

/** Wraps one record in the envelope every method of the port resolves to. */
function resultOf(scenario: Scenario): Result<Scenario> {
  return { data: scenario, meta: META };
}

/** Wraps one evidence record in that same envelope, for the read the drawer makes. */
function evidenceResultOf(evidence: Evidence): Result<Evidence> {
  return { data: evidence, meta: META };
}

/* ---------------------------------------------------------------------------------------------
 * The harness: a fresh query client, a session on the fake clock, and the queries a case reads with
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders the sandbox inside a fresh query client, the boundary its sibling screens render under.
 *
 * The client is created per render and never retries, so a failure is observed once and no case can
 * be satisfied by an attempt the sandbox did not ask for. No router is supplied: the panel has
 * nothing to navigate, and a case that needed one would be reporting a defect in the component rather
 * than in the harness.
 */
function renderSandbox(props: ScenarioSandboxProps): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ScenarioSandbox {...props} />
    </QueryClientProvider>,
  );
}

/**
 * One session driving the fake clock.
 *
 * `delay: null` keeps the session from spacing its own events, so the only thing that moves the
 * debounce is {@link settleRecomputeDelay}: a case can then tell a request that waited for the window
 * from one raised on a keystroke. The session is always driven through {@link interact}, because with
 * the clock faked the library's own settling work waits on a timer nothing else advances.
 */
function userSession(): UserEvent {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime, delay: null });
}

/**
 * The most clock steps one interaction may need before it is declared stuck.
 *
 * A step is one millisecond of fake time and every interaction of this suite needs a handful, so the
 * budget stays far below {@link SANDBOX_RECOMPUTE_DELAY_MS}: a case can never reach the debounce by
 * driving the keyboard, only by {@link settleRecomputeDelay} asking for the window explicitly.
 */
const MAX_INTERACTION_STEPS = 100;

/**
 * Runs one interaction while the fake clock is installed, advancing the clock until it settles.
 *
 * `@testing-library/user-event` settles part of its own work through the timer queue, so an `await
 * user.keyboard(...)` under `vi.useFakeTimers()` waits on a timer that nothing advances and the case
 * times out. The helper pumps the clock in one-millisecond steps until the interaction's promise has
 * settled, which is bounded, keeps every real wait out of the gate, and leaves the component's own
 * debounce untouched because the budget is smaller than the window.
 */
async function interact<T>(action: () => Promise<T>): Promise<T> {
  const result = action();
  let isSettled = false;
  const markSettled = (): void => {
    isSettled = true;
  };

  void result.then(markSettled, markSettled);

  for (let step = 0; step < MAX_INTERACTION_STEPS && !isSettled; step += 1) {
    await vi.advanceTimersByTimeAsync(1);
  }

  if (!isSettled) {
    throw new Error('the interaction did not settle on the fake clock');
  }

  return result;
}

/**
 * Advances the clock past the component's own debounce and lets the call it raises settle.
 *
 * The delay is the constant the component exports, never a number of this suite's own, so a change of
 * the window moves the suite with it. The advance runs inside `act` because a settled measurement
 * lands in React state, and the asynchronous variant flushes the microtasks the call's continuation
 * needs before a case reads the screen.
 */
async function settleRecomputeDelay(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SANDBOX_RECOMPUTE_DELAY_MS);
  });
}

/** A promise a case settles by hand, so the in-flight state can be observed while it is true. */
interface Deferred<T> {
  /** What the call returns until it is settled. */
  readonly promise: Promise<T>;
  /** Settles the call with a value. */
  readonly resolve: (value: T) => void;
  /** Settles the call with a failure. */
  readonly reject: (reason: unknown) => void;
}

/** Builds one hand-settled promise. */
function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {
    /* replaced by the executor below before this value can be observed */
  };
  let reject: (reason: unknown) => void = () => {
    /* replaced by the executor below before this value can be observed */
  };
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });

  return { promise, resolve, reject };
}

/** The recompute control, named by the label the component states for it. */
function recomputeControl(): HTMLElement {
  return screen.getByRole('button', { name: SCENARIO_SANDBOX_TEXT.recomputeLabel });
}

/** The retry control a reported failure offers, or `null` when the panel offers none. */
function retryControl(): HTMLElement | null {
  return screen.queryByRole('button', { name: SCENARIO_SANDBOX_TEXT.retryLabel });
}

/** One lever field, found by the accessible name that is the contract's own member name. */
function leverField(field: keyof Levers): HTMLInputElement {
  const input = screen.getByRole('spinbutton', { name: field });

  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`the ${field} field is not an input`);
  }

  return input;
}

/**
 * One measure row's row element: the row the measure's own name sits in.
 *
 * Found from the name rather than from the value, because the name is the one string in a row that
 * carries no figure of its own (rule P-6), and returned as the element so a case can look inside it
 * for whatever the row is relied on for — its value, its §5.3 label or the trigger that opens its
 * evidence.
 */
function measureRow(label: string): HTMLElement {
  const term = screen.getByText(label);
  const row = term.parentElement;

  if (row === null) {
    throw new Error(`the measure ${label} rendered with no row around it`);
  }

  return row;
}

/**
 * One measure row's text: the value the service returned, with the label the row carries beside it.
 *
 * The row is read whole because a bare count is a text node inside the evidence trigger, which no
 * role query names by itself, and because the simulation label beside that trigger is part of what
 * the row has to state (rule P-1).
 */
function measureRowText(label: string): string {
  return measureRow(label).textContent ?? '';
}

/** The arguments of the last request the sandbox made, as the port's own signature types them. */
function lastRequest(): readonly [ExceptionId, Levers] {
  const call = solveScenario.mock.calls.at(-1);

  if (call === undefined) {
    throw new Error('the sandbox sent no request to the port');
  }

  return call;
}

/** Replaces one field's value the way a pointer user edits it: select the contents, then type. */
async function replaceLeverValue(user: UserEvent, field: keyof Levers, value: number): Promise<void> {
  await replaceLeverText(user, field, String(value));
}

/**
 * Replaces one field's value with the characters a case writes out, the way a pointer user types them.
 *
 * A number field holds the reader's own text, so a case about that text has to enter it as it stands:
 * `String(value)` is the wrong input for a value whose exponent form the case exists to rule out, and
 * the field is where the reader's typing enters the component.
 */
async function replaceLeverText(user: UserEvent, field: keyof Levers, text: string): Promise<void> {
  const input = leverField(field);

  await interact(() => user.clear(input));
  await interact(() => user.type(input, text));
}

/** Fills both lever fields with the values a case states. */
async function editLevers(user: UserEvent, levers: Levers): Promise<void> {
  await replaceLeverValue(user, 'airSets', levers.airSets);
  await replaceLeverValue(user, 'transferSets', levers.transferSets);
}

/**
 * Replaces the focused field's value with the keyboard alone: select what the field holds, then type.
 *
 * `Control`+`A` followed by the digits is the keyboard's own replacement, so nothing here clicks and
 * the field is the one `Tab` arrived at. A number input does not offer the selection API, which is why
 * the selection has to come from the key rather than from a helper that would need it.
 */
async function typeOverFocusedValue(user: UserEvent, value: number): Promise<void> {
  await interact(() => user.keyboard(`{Control>}a{/Control}${String(value)}`));
}

/** Sends one keystroke sequence to whatever element currently holds focus. */
async function press(user: UserEvent, keys: string): Promise<void> {
  await interact(() => user.keyboard(keys));
}

/** Moves focus to the next stop in document order, the way a keyboard reader does. */
async function tabToNextStop(user: UserEvent): Promise<void> {
  await interact(() => user.tab());
}

/** Activates a control with the pointer, which is the path a disabled control has to refuse. */
async function activate(user: UserEvent, control: HTMLElement): Promise<void> {
  await interact(() => user.click(control));
}

/**
 * The explanation the component must give for a control it cannot let act, in its own words.
 *
 * `sandboxDisabledReason` is imported rather than the sentence being retyped, so a reworded reason
 * reaches the component and this suite together (rule P-8).
 */
function expectedBlocker(input: {
  readonly hasOption: boolean;
  readonly isPending: boolean;
  readonly invalidField: keyof Levers | null;
  readonly constraintMessages: readonly string[];
}): string {
  const reason = sandboxDisabledReason(input);

  if (reason === null) {
    throw new Error('the case expects the control to be disabled, and the component named no reason');
  }

  return reason;
}

beforeEach(() => {
  vi.useFakeTimers();
  solveScenario.mockReset();
  getEvidence.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  delete document.documentElement.dataset.theme;
});

/**
 * The seven measure rows the panel states, in the order the comparison matrix fixes them.
 *
 * Read from the matrix's own map rather than retyped, so a renamed measure reaches this suite and the
 * component together. The eighth row — the side effects — is deliberately absent: those belong to the
 * matrix's column, which the caller adds from `onRecomputed` (AAP §0.12.4).
 */
const RENDERED_MEASURES: readonly string[] = [
  COMPARISON_MATRIX_TEXT.rows.unitsLate,
  COMPARISON_MATRIX_TEXT.rows.maxDaysLate,
  COMPARISON_MATRIX_TEXT.rows.ordersOnTime,
  COMPARISON_MATRIX_TEXT.rows.addedCost,
  COMPARISON_MATRIX_TEXT.rows.lineIdleDays,
  COMPARISON_MATRIX_TEXT.rows.confidence,
  COMPARISON_MATRIX_TEXT.rows.constraintCheck,
];

/* ---------------------------------------------------------------------------------------------
 * 1. One request per burst of lever edits
 * ------------------------------------------------------------------------------------------- */

describe('one request per burst of lever edits', () => {
  it('collapses a burst into one call, then sends exactly one more for an edit made later', async () => {
    solveScenario.mockResolvedValue(resultOf(makeRecomputedScenario()));
    const user = userSession();
    renderSandbox({ scenario: makeBaseScenario() });

    await editLevers(user, EDITED_LEVERS);

    /* Four keystrokes reached two fields and not one of them reached the port: the window has not
       passed, so the burst is still one pending request. A caller that fires per change fails here. */
    expect(solveScenario).not.toHaveBeenCalled();

    await settleRecomputeDelay();
    expect(solveScenario).toHaveBeenCalledTimes(1);

    await replaceLeverValue(user, 'airSets', LATER_AIR_SETS);
    expect(solveScenario).toHaveBeenCalledTimes(1);

    await settleRecomputeDelay();
    expect(solveScenario).toHaveBeenCalledTimes(2);
    expect(lastRequest()[1]).toEqual({ ...EDITED_LEVERS, airSets: LATER_AIR_SETS });
  });
});

/* ---------------------------------------------------------------------------------------------
 * 2. Only the lever values travel
 * ------------------------------------------------------------------------------------------- */

describe('what the port receives', () => {
  it('sends the two lever values the fields were left holding, and no other member', async () => {
    solveScenario.mockResolvedValue(resultOf(makeRecomputedScenario()));
    const base = makeBaseScenario();
    const user = userSession();
    renderSandbox({ scenario: base });

    await editLevers(user, EDITED_LEVERS);
    await settleRecomputeDelay();

    expect(solveScenario).toHaveBeenCalledTimes(1);

    const [exceptionId, levers] = lastRequest();

    expect(exceptionId).toBe(base.exceptionId);
    /* Equality against the expected object is the assertion: a member the component invented fails
       it, and so does a value it read from the seeded option rather than from the fields. */
    expect(levers).toEqual(EDITED_LEVERS);
    expect(levers).not.toEqual(base.levers);
    expect(Object.keys(levers).sort()).toEqual(Object.keys(base.levers).sort());
  });
});

/* ---------------------------------------------------------------------------------------------
 * 3. No local arithmetic and no local formatting
 * ------------------------------------------------------------------------------------------- */

describe('where every measure comes from', () => {
  it('withholds them until the call settles, then shows exactly the figures the service returned', async () => {
    const pending = deferred<Result<Scenario>>();
    solveScenario.mockReturnValue(pending.promise);

    const onRecomputed = vi.fn<(scenario: Scenario) => void>();
    const base = makeBaseScenario();
    const recomputed = makeRecomputedScenario();
    const user = userSession();
    renderSandbox({ scenario: base, onRecomputed });

    await editLevers(user, EDITED_LEVERS);
    await settleRecomputeDelay();

    /* In flight: the request reached the port and nothing has been measured. The base option's own
       measures are not repeated as a guess, and the caller has been told nothing yet. */
    expect(solveScenario).toHaveBeenCalledTimes(1);
    const region = screen.getByRole('status');
    expect(within(region).getByText(SCENARIO_SANDBOX_TEXT.inFlight)).toBeVisible();
    expect(screen.queryByText(COMPARISON_MATRIX_TEXT.rows.unitsLate)).toBeNull();
    expect(screen.queryByText(String(base.unitsLate))).toBeNull();
    expect(onRecomputed).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve(resultOf(recomputed));
      await pending.promise;
    });

    /* Settled: every figure is the payload's, and the payload differs from the base option in every
       measure it states, so none of them could have been derived here (rule P-6). */
    expect(measureRowText(COMPARISON_MATRIX_TEXT.rows.unitsLate)).toContain(
      String(recomputed.unitsLate),
    );
    expect(measureRowText(COMPARISON_MATRIX_TEXT.rows.maxDaysLate)).toContain(
      String(recomputed.maxDaysLate),
    );
    expect(measureRowText(COMPARISON_MATRIX_TEXT.rows.ordersOnTime)).toContain(
      String(recomputed.ordersOnTime),
    );
    expect(measureRowText(COMPARISON_MATRIX_TEXT.rows.addedCost)).toContain(
      formatMoney(recomputed.addedCostEur),
    );
    expect(measureRowText(COMPARISON_MATRIX_TEXT.rows.lineIdleDays)).toContain(
      String(recomputed.lineIdleDays),
    );
    expect(measureRowText(COMPARISON_MATRIX_TEXT.rows.confidence)).toContain(
      recomputed.confidence.reason,
    );
    expect(screen.queryByText(String(base.unitsLate))).toBeNull();

    /* Each measured figure carries the section 5.3 label of a computed figure on itself rather than
       relying on a page-level badge (rule P-1). */
    for (const measure of RENDERED_MEASURES) {
      expect(measureRowText(measure)).toContain(CALCULATION_LABEL);
    }

    expect(screen.getByText(recomputed.id)).toBeVisible();
    expect(onRecomputed).toHaveBeenCalledTimes(1);
    expect(onRecomputed).toHaveBeenCalledWith(recomputed);
  });

  it('states the recomputed option’s confidence level as the status the matrix draws it as', async () => {
    const recomputed = makeRecomputedScenario();
    solveScenario.mockResolvedValue(resultOf(recomputed));

    const user = userSession();
    renderSandbox({ scenario: makeBaseScenario() });

    await editLevers(user, EDITED_LEVERS);
    await settleRecomputeDelay();

    const row = measureRow(COMPARISON_MATRIX_TEXT.rows.confidence);
    const word = within(row).getByText(
      COMPARISON_MATRIX_TEXT.confidence[recomputed.confidence.level],
    );

    /* One level, one treatment: the panel draws it through the matrix's own presentation map, so a
       reader meets the same icon, word and status colour here as in the column beside the panel
       (AAP §0.5.2, rule B-3). The reason the payload states sits under it, unparaphrased. */
    expect(word).toHaveClass(STATUS_LABEL_CLASS);

    const iconWrapper = word.previousElementSibling;

    expect(iconWrapper).not.toBeNull();
    expect(iconWrapper).toHaveClass(
      MEANING_COLOUR_CLASSES[CONFIDENCE_PRESENTATION[recomputed.confidence.level]],
    );
    expect(iconWrapper?.querySelector('svg')).not.toBeNull();
    expect(row.textContent ?? '').toContain(recomputed.confidence.reason);
  });

  it('opens the duplicated option’s evidence from every measure it reports', async () => {
    const base = makeBaseScenario();
    const recomputed = makeRecomputedScenario();
    solveScenario.mockResolvedValue(resultOf(recomputed));
    getEvidence.mockResolvedValue(evidenceResultOf(MEASURED_EVIDENCE));

    const user = userSession();
    renderSandbox({ scenario: base });

    await editLevers(user, EDITED_LEVERS);
    await settleRecomputeDelay();

    /* What each row states, read from the payload rather than typed here: a row showing another
       option's figure fails on its value as well as on its trigger (rule P-6). */
    const statedValues: readonly (readonly [string, string])[] = [
      [COMPARISON_MATRIX_TEXT.rows.unitsLate, String(recomputed.unitsLate)],
      [COMPARISON_MATRIX_TEXT.rows.maxDaysLate, String(recomputed.maxDaysLate)],
      [COMPARISON_MATRIX_TEXT.rows.ordersOnTime, String(recomputed.ordersOnTime)],
      [COMPARISON_MATRIX_TEXT.rows.addedCost, formatMoney(recomputed.addedCostEur)],
      [COMPARISON_MATRIX_TEXT.rows.lineIdleDays, String(recomputed.lineIdleDays)],
      [COMPARISON_MATRIX_TEXT.rows.confidence, recomputed.confidence.reason],
      [
        COMPARISON_MATRIX_TEXT.rows.constraintCheck,
        COMPARISON_MATRIX_TEXT.constraint[recomputed.constraintCheck],
      ],
    ];

    for (const [measure, stated] of statedValues) {
      const row = measureRow(measure);
      const trigger = within(row).getByRole('button', {
        name: new RegExp(`${EVIDENCE_DRAWER_TEXT.openSuffix}$`, 'u'),
      });

      /* The row is unchanged around the trigger: it still states the record's own value, and the
         §5.3 label of a computed figure still sits beside the figure rather than on the panel
         (rules P-6, P-1). */
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger.textContent ?? '').toContain(stated);
      expect(row.textContent ?? '').toContain(CALCULATION_LABEL);

      await activate(user, trigger);

      /* The trigger carries the duplicated option's reference and the read is made for it: that is
         the record whose case the measurement was taken from, never the identifier the adapter minted
         for the duplicate, which names nothing the service holds (AAP §0.12.4, F12). */
      expect(getEvidence).toHaveBeenCalledWith(base.id);
      expect(getEvidence.mock.calls.every(([requested]) => requested === base.id)).toBe(true);

      /* The drawer opens on that reference and renders the payload it was given: its record line
         names the duplicated option, the value, the rule and the upstream record are the read's own
         strings, and the minted identifier appears nowhere inside it. */
      const dialog = screen.getByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });
      expect(within(dialog).getAllByText(base.id).length).toBeGreaterThan(0);
      expect(within(dialog).getByText(MEASURED_EVIDENCE.value)).toBeVisible();
      expect(within(dialog).getByText(MEASURED_EVIDENCE.formula)).toBeVisible();
      expect(within(dialog).getByText(EVIDENCE_UPSTREAM)).toBeVisible();
      expect(within(dialog).queryByText(recomputed.id)).toBeNull();

      await activate(
        user,
        within(dialog).getByRole('button', { name: EVIDENCE_DRAWER_TEXT.closeLabel }),
      );
      expect(screen.queryByRole('dialog')).toBeNull();
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * 4. The failed constraint path — a breach is a measurement, not a refused call
 * ------------------------------------------------------------------------------------------- */

describe('an option whose constraint check fails', () => {
  it("states that it cannot compute, with the record's own messages and no figure at all", async () => {
    const breached = makeBreachedScenario();
    solveScenario.mockResolvedValue(resultOf(breached));

    const user = userSession();
    renderSandbox({ scenario: makeBaseScenario() });

    await editLevers(user, BREACHED_LEVERS);
    await settleRecomputeDelay();

    expect(screen.getByText(CANNOT_COMPUTE_LABEL)).toBeVisible();

    for (const message of BREACH_MESSAGES) {
      expect(screen.getByText(message)).toBeVisible();
    }

    /* Nothing stands beside the breach: the measure rows are not rendered at all, and neither a count
       nor a formatted amount of the failed option reaches the screen (AAP section 0.8). */
    for (const measure of RENDERED_MEASURES) {
      expect(screen.queryByText(measure)).toBeNull();
    }
    expect(screen.queryByText(String(breached.unitsLate))).toBeNull();
    expect(screen.queryByText(formatMoney(breached.addedCostEur))).toBeNull();

    /* The control is not left inert: it is disabled with a reason that is the record's own messages,
       so a reader who asks why learns which bound was breached (rule P-8). */
    const control = recomputeControl();
    expect(control).toHaveAttribute('aria-disabled', 'true');
    expect(control).toHaveAccessibleDescription(
      expectedBlocker({
        hasOption: true,
        isPending: false,
        invalidField: null,
        constraintMessages: BREACH_MESSAGES,
      }),
    );

    /* Activating it anyway sends nothing, because the same values would breach the same bound. */
    fireEvent.click(control);
    await settleRecomputeDelay();
    expect(solveScenario).toHaveBeenCalledTimes(1);
  });
});

/* ---------------------------------------------------------------------------------------------
 * 5. A `Problem` from the port
 * ------------------------------------------------------------------------------------------- */

describe('a call the port refuses', () => {
  it("prints a validation refusal in the service's own words, with one retry that repeats the call", async () => {
    solveScenario.mockRejectedValue(VALIDATION_PROBLEM);

    const user = userSession();
    renderSandbox({ scenario: makeBaseScenario() });

    await editLevers(user, EDITED_LEVERS);
    await settleRecomputeDelay();

    const region = screen.getByRole('status');
    expect(region).toHaveTextContent(SCENARIO_SANDBOX_TEXT.failureLabel);
    expect(region).toHaveTextContent(VALIDATION_PROBLEM.message);
    expect(region).toHaveTextContent(VALIDATION_PROBLEM.traceId);
    expect(screen.queryByText(COMPARISON_MATRIX_TEXT.rows.unitsLate)).toBeNull();

    const retry = retryControl();
    expect(retry).not.toBeNull();

    if (retry === null) {
      throw new Error('the refused call offered no retry');
    }

    expect(retry).toBeEnabled();

    await activate(user, retry);

    expect(solveScenario).toHaveBeenCalledTimes(2);
    expect(lastRequest()[1]).toEqual(EDITED_LEVERS);
    expect(screen.getByRole('status')).toHaveTextContent(VALIDATION_PROBLEM.message);
  });

  it('names the permission and the roles that hold it, and offers no retry it could not honour', async () => {
    solveScenario.mockRejectedValue(PERMISSION_PROBLEM);

    const user = userSession();
    renderSandbox({ scenario: makeBaseScenario() });

    await editLevers(user, EDITED_LEVERS);
    await settleRecomputeDelay();

    const region = screen.getByRole('status');
    expect(region).toHaveTextContent(SCENARIO_SANDBOX_TEXT.failureLabel);
    expect(region).toHaveTextContent(PERMISSION_PROBLEM.message);
    expect(region).toHaveTextContent(REQUIRED_PERMISSION);
    expect(region).toHaveTextContent(ROLES_WITH_PERMISSION.join(', '));
    expect(region).toHaveTextContent(SCENARIO_SANDBOX_TEXT.permissionNoRetry);

    /* No retry is offered: the same call by the same role would be refused again, and a control that
       cannot act has no place on the panel (rule P-8). */
    expect(retryControl()).toBeNull();
    expect(solveScenario).toHaveBeenCalledTimes(1);
  });
});

/* ---------------------------------------------------------------------------------------------
 * 6. Keyboard operation
 * ------------------------------------------------------------------------------------------- */

describe('keyboard operation', () => {
  it('T-16 reaches each lever field with Tab, names it from the record, and sends one request on Enter', async () => {
    solveScenario.mockResolvedValue(resultOf(makeRecomputedScenario()));

    const user = userSession();
    renderSandbox({ scenario: makeBaseScenario() });

    await tabToNextStop(user);

    const air = leverField('airSets');
    expect(air).toHaveFocus();
    expect(air).toHaveAccessibleName('airSets');
    expect(air.className).toContain(FOCUS_RING_UTILITY);

    await typeOverFocusedValue(user, EDITED_LEVERS.airSets);
    expect(air.value).toBe(String(EDITED_LEVERS.airSets));

    /* `Enter` sends the request the delay would have sent, so the pending one is dropped and the
       settled count stays at one. */
    await press(user, '{Enter}');
    await settleRecomputeDelay();
    expect(solveScenario).toHaveBeenCalledTimes(1);

    await tabToNextStop(user);

    const transfer = leverField('transferSets');
    expect(transfer).toHaveFocus();
    expect(transfer).toHaveAccessibleName('transferSets');
    expect(transfer.className).toContain(FOCUS_RING_UTILITY);

    await typeOverFocusedValue(user, EDITED_LEVERS.transferSets);
    expect(transfer.value).toBe(String(EDITED_LEVERS.transferSets));

    await press(user, '{Enter}');
    await settleRecomputeDelay();

    expect(solveScenario).toHaveBeenCalledTimes(2);
    expect(lastRequest()[1]).toEqual(EDITED_LEVERS);
  });
});

/* ---------------------------------------------------------------------------------------------
 * 7. Both themes
 * ------------------------------------------------------------------------------------------- */

describe('both themes', () => {
  it.each(THEMES)('renders the same controls and the same figures under the %s theme', async (theme) => {
    document.documentElement.dataset.theme = theme;

    const recomputed = makeRecomputedScenario();
    solveScenario.mockResolvedValue(resultOf(recomputed));

    const user = userSession();
    renderSandbox({ scenario: makeBaseScenario() });

    expect(screen.getByRole('region', { name: SCENARIO_SANDBOX_TEXT.panelLabel })).toBeVisible();
    expect(screen.getByText(SCENARIO_SANDBOX_TEXT.legend)).toBeVisible();
    expect(leverField('airSets')).toBeVisible();
    expect(leverField('transferSets')).toBeVisible();
    expect(recomputeControl()).toBeEnabled();

    await editLevers(user, EDITED_LEVERS);
    await settleRecomputeDelay();

    expect(measureRowText(COMPARISON_MATRIX_TEXT.rows.unitsLate)).toContain(
      String(recomputed.unitsLate),
    );
    expect(measureRowText(COMPARISON_MATRIX_TEXT.rows.addedCost)).toContain(
      formatMoney(recomputed.addedCostEur),
    );
  });
});

/* ---------------------------------------------------------------------------------------------
 * 8. The disabled state
 * ------------------------------------------------------------------------------------------- */

describe('a sandbox with nothing to duplicate', () => {
  it('disables the recompute control and explains why, in text the keyboard reaches', async () => {
    const user = userSession();
    renderSandbox({ scenario: null });

    const panel = screen.getByRole('region', { name: SCENARIO_SANDBOX_TEXT.panelLabel });

    /* The sentence is the panel's own paragraph. The same words also sit in the hint that explains
       the control, so the case names the paragraph rather than whichever element came first. */
    expect(within(panel).getByText(SCENARIO_SANDBOX_TEXT.noOption, { selector: 'p' })).toBeVisible();
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);

    const control = recomputeControl();
    expect(control).toHaveTextContent(SCENARIO_SANDBOX_TEXT.recomputeLabel);
    expect(control).toHaveAttribute('aria-disabled', 'true');
    expect(control).toHaveAccessibleDescription(SCENARIO_SANDBOX_TEXT.noOption);

    /* The reason is not only an attribute: arriving by keyboard paints the hint that carries it. */
    await tabToNextStop(user);
    expect(control).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent(SCENARIO_SANDBOX_TEXT.noOption);

    /* And the control refuses activation rather than sending a request it has already ruled out. */
    fireEvent.click(control);
    await settleRecomputeDelay();
    expect(solveScenario).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------------------------------------------
 * 9. A lever far outside its bound, echoed readably
 * ------------------------------------------------------------------------------------------- */

describe('a lever far outside its bound', () => {
  it('echoes the value the reader typed in decimal notation, never in exponent form', async () => {
    const base = makeBaseScenario();
    const typed: Levers = {
      airSets: BEYOND_BOUND_VALUE,
      transferSets: base.levers.transferSets,
    };
    const measured = makeBeyondBoundScenario(typed);

    solveScenario.mockResolvedValue(resultOf(measured));

    const user = userSession();
    renderSandbox({ scenario: base });

    await replaceLeverText(user, 'airSets', BEYOND_BOUND_DIGITS);
    await activate(user, recomputeControl());
    await settleRecomputeDelay();

    /* The request carried the value the reader typed, converted as the field converts it, and the
       answer is the measurement AAP §0.12.3 requires of a breach — a `Scenario`, not a `Problem`. */
    expect(solveScenario).toHaveBeenCalledTimes(1);
    expect(lastRequest()[1]).toEqual(typed);

    const panel = screen.getByRole('region', { name: SCENARIO_SANDBOX_TEXT.panelLabel });
    const sentence = within(panel).getByText(measuredAtText(measured.levers));

    /* The sentence states each value in the grouped shape `formatQuantity` gives every number the
       interface prints, so the digits sit on screen as the reader typed them rather than as the
       exponent form a raw interpolation produces (AAP §0.8, rule P-6). */
    expect(sentence).toBeVisible();
    expect(sentence).toHaveTextContent(`airSets ${formatQuantity(measured.levers.airSets)}`);
    expect(sentence).toHaveTextContent(`transferSets ${formatQuantity(measured.levers.transferSets)}`);

    /* Nothing in the panel — the sentence, the record's messages or the control — carries the value
       in the exponent form, which is the only shape the check above could otherwise let through. */
    expect(panel).not.toHaveTextContent(String(BEYOND_BOUND_VALUE));
  });
});

/* ---------------------------------------------------------------------------------------------
 * 10. The bounds the case sets, published before a value is typed
 * ------------------------------------------------------------------------------------------- */

describe('the bounds the case holds the levers to', () => {
  it('describes both fields with the rule, and with the case’s own statements where the set records them', () => {
    renderSandbox({ scenario: makeBaseScenario(), caseBoundStatements: BREACH_MESSAGES });

    const group = screen.getByRole('group', { name: SCENARIO_SANDBOX_TEXT.legend });

    /* Both fields carry the same two halves in the same order — the rule, then the records' statements
       — so a reader meets the bound on either lever rather than on whichever one happened to be
       described. */
    const expected = [SCENARIO_SANDBOX_TEXT.leverBoundsRule, ...BREACH_MESSAGES].join(' ');

    for (const field of LEVER_FIELDS) {
      expect(leverField(field)).toHaveAccessibleDescription(expected);
    }

    /* And the words a screen reader hears are the words on screen: the panel's own rule as its own
       sentence, and each record statement verbatim in the paragraph beside it (rule P-6). The statements
       share one described paragraph, so the group is read for them rather than a single sentence. */
    expect(within(group).getByText(SCENARIO_SANDBOX_TEXT.leverBoundsRule)).toBeVisible();

    for (const statement of BREACH_MESSAGES) {
      expect(group).toHaveTextContent(statement);
    }
  });

  it.each<{ readonly condition: string; readonly caseBoundStatements: readonly string[] | undefined }>([
    { condition: 'no statement is supplied', caseBoundStatements: undefined },
    { condition: 'the set records none', caseBoundStatements: NO_CASE_BOUND_STATEMENTS },
    { condition: 'the set records a blank statement', caseBoundStatements: [BLANK_STATEMENT] },
  ])('publishes the rule alone when $condition, and nothing in its place', ({ caseBoundStatements }) => {
    renderSandbox({ scenario: makeBaseScenario(), caseBoundStatements });

    const group = screen.getByRole('group', { name: SCENARIO_SANDBOX_TEXT.legend });

    for (const field of LEVER_FIELDS) {
      expect(leverField(field)).toHaveAccessibleDescription(SCENARIO_SANDBOX_TEXT.leverBoundsRule);
    }

    /* One sentence in the group, and it is the rule: no empty paragraph, no placeholder sentence and no
       second description stand where a record's statements would be. */
    expect([...group.querySelectorAll('p')].map((sentence) => sentence.textContent)).toEqual([
      SCENARIO_SANDBOX_TEXT.leverBoundsRule,
    ]);
  });

  it('states the bound in words rather than on either field, which carries no attribute for it', () => {
    renderSandbox({ scenario: makeBaseScenario(), caseBoundStatements: BREACH_MESSAGES });

    for (const field of LEVER_FIELDS) {
      const input = leverField(field);

      /* No bound reaches this component from the port, so none is annotated on the control: a `min`,
         `max` or `step` here would be a figure no record carries (rule P-6), and a value outside the
         bound has to stay typeable for the refused measurement AAP §0.12.3 makes demonstrable. */
      expect(input).not.toHaveAttribute('min');
      expect(input).not.toHaveAttribute('max');
      expect(input).not.toHaveAttribute('step');
      expect(input).not.toHaveAttribute('aria-valuemin');
      expect(input).not.toHaveAttribute('aria-valuemax');
    }
  });

  it('keeps a field that is not a number described by its own sentence, after the rule and the statements', async () => {
    const user = userSession();
    renderSandbox({ scenario: makeBaseScenario(), caseBoundStatements: BREACH_MESSAGES });

    const group = screen.getByRole('group', { name: SCENARIO_SANDBOX_TEXT.legend });

    /* An air-freight field left empty is the state the disable path exists for: it is marked invalid
       and described by its own sentence, and the bound it is held to is heard before that sentence
       rather than instead of it. */
    await interact(() => user.clear(leverField('airSets')));

    expect(leverField('airSets')).toHaveAccessibleDescription(
      [SCENARIO_SANDBOX_TEXT.leverBoundsRule, ...BREACH_MESSAGES, invalidLeverText('airSets')].join(' '),
    );

    /* The other field keeps the rule and the records' statements: one field's defect does not describe
       its neighbour. */
    expect(leverField('transferSets')).toHaveAccessibleDescription(
      [SCENARIO_SANDBOX_TEXT.leverBoundsRule, ...BREACH_MESSAGES].join(' '),
    );

    expect(within(group).getByText(invalidLeverText('airSets'))).toBeVisible();
  });
});

