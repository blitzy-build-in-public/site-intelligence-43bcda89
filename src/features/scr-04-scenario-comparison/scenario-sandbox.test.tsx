/**
 * Component suite for `scenario-sandbox.tsx`, the SCR-04 control that duplicates one option and
 * measures the duplicate again at the lever values a reader types.
 *
 * WHAT IT PROVES. Eight contracts the sandbox is relied on for, each stated as a case that fails on
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
 * than record-shaped references, the lever values typed by a case are small plain integers, and every
 * amount is asserted through the imported `formatMoney` rather than as a currency literal. The
 * constraint messages are record text — the service's own wording for a breach — built here from the
 * bound fixture so the two cannot drift apart.
 *
 * THE WORDING IS NOT RETYPED. `SCENARIO_SANDBOX_TEXT`, `CANNOT_COMPUTE_LABEL` and
 * `COMPARISON_MATRIX_TEXT` are imported, so a reworded label or measure fails the case that names it,
 * and `sandboxDisabledReason` is imported so the expected explanation is the component's own sentence
 * rather than a copy of it.
 *
 * TWO CONSTRAINTS THE SUITE WORKS WITHIN. `scenario-sandbox.tsx` keeps its input class list
 * module-private, so the focus-ring utility the keyboard case asserts is named once in
 * {@link FOCUS_RING_UTILITY} with the reason it is stated there; and the lever bounds live on
 * `SolverCase`, which no member of the port's scenario reads carries, so the fields are unbounded and the
 * breach case states the bound on the fixture and drives the breach through the response — the only path
 * a bound can reach the panel by.
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
import { formatMoney } from '../../components/mono-value';
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
import { CANNOT_COMPUTE_LABEL, COMPARISON_MATRIX_TEXT } from './comparison-matrix';
import {
  SANDBOX_RECOMPUTE_DELAY_MS,
  SCENARIO_SANDBOX_TEXT,
  ScenarioSandbox,
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

/** The lever values a case types: distinct from the base option's, so a stale send fails case 2. */
const EDITED_LEVERS: Levers = { airSets: 8, transferSets: 9 };

/** One more air-freight value, typed after the debounce window has passed (case 1). */
const LATER_AIR_SETS = 4;

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
  const input = leverField(field);

  await interact(() => user.clear(input));
  await interact(() => user.type(input, String(value)));
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

