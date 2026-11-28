/**
 * Component suite for SCR-06, the evidence assistant.
 *
 * WHAT THIS FILE IS. The one colocated test module the plan's tree enumerates for
 * `src/features/scr-06-evidence-assistant/` (AAP §0.13.1), so it carries the contract assertions for
 * all five source files of the folder: the route wrapper (`assistant-screen.tsx`), the connected panel
 * and its presentational half (`assistant-panel.tsx`), the cited answer (`assistant-answer.tsx`), the
 * model selector (`model-selector.tsx`) and the refusal card (`policy-block-card.tsx`). Splitting it
 * into one module per source file is a later stage's decision, not this file's: the plan names one
 * module here, and `src/features/**` — this file included — is scanned by
 * `tests/source-checks/no-typed-figures.test.ts`.
 *
 * WHAT IT PROVES, AND WHERE THE OTHER HALVES LIVE. A suggested question reaches the port once with
 * the model the selector shows, and the answer it returns is rendered character for character; the
 * answer carries `Simulated calculation` itself rather than relying on the shell's badge (rule P-1);
 * a citation chip opens the evidence drawer from the keyboard and `Escape` returns focus to the chip;
 * the queries and the model stay behind a keyboard-operable disclosure; a policy refusal renders the
 * block card with the rule, its reason, the model it permits and the event it recorded, and its
 * one-click switch re-asks on the in-boundary model; a permission refusal renders the forbidden card;
 * any other rejection renders the offline notice with a retry that repeats the read; a question
 * outside the script renders whatever text the service returned; a disabled control carries a reason
 * a keyboard user can read; a question activated from the keyboard hands its focus to the answer
 * region instead of dropping it to the document's body, while a question submitted from the composer's
 * field keeps the focus the reader is typing with, and the block card hands its own focus to that
 * region again when its switch re-asks; the model selector carries an `id` and a `name`
 * beside the legend that names it; all seven screen states render; the route mounts the product
 * eyebrow, one level-one heading and the screen's single primary action; and both themes render the
 * same content from role tokens.
 * The browser halves of `T-10` and `T-11` are `e2e/s1-assistant.spec.ts`, and axe is `T-16` in
 * `e2e/s1-keyboard-and-axe.spec.ts`: `@axe-core/playwright` is browser-only and the project declares
 * no jest-axe dependency, so no accessibility scan can run here. This suite proves instead the
 * keyboard reachability, the focus return and the accessible naming those passes depend on.
 *
 * THE SERVICE IS MOCKED AT THE PROVIDER, the one boundary a screen is allowed to read through
 * (rule P-2). The specifier below is exactly the one `assistant-panel.tsx` and
 * `components/evidence-drawer.tsx` import, because Vitest keys a mock on the resolved module rather
 * than on a path spelling: from this folder that is `../../services/service-provider`. The stub is
 * created through `vi.hoisted` so it exists before that module loads, and each member is typed from
 * the port itself (`SiteIntelligenceService['askAssistant']` and its siblings), so the stub cannot
 * drift from the signature the components call and no cast appears anywhere in this file. With the
 * provider replaced, the in-browser adapter, its seed records and the domain modules are never
 * reached from a component test.
 *
 * NO TYPED FIGURES AND NO TYPED IDENTIFIERS (rule P-6). Every reference, query line, policy name,
 * event name, model identifier and message here is an opaque placeholder that matches no
 * `platform-contracts.md` §1 identifier shape, and no currency literal appears at all — the source
 * check above reads `src/features/**` for both. The one instant is the imported `DEMO_CLOCK`, so the
 * suite holds no date either, and the one fixed simulation label is read from `SIM_LABELS` at its
 * §5.3 position rather than retyped (rule P-1). Wording this suite compares against is imported from
 * the module that owns it — `ASSISTANT_PANEL_TEXT`, `ASSISTANT_ANSWER_TEXT`, `EVIDENCE_DRAWER_TEXT` —
 * so a case cannot pass by agreeing with a sentence typed here.
 *
 * THE STATE BOUNDARY'S RENDERINGS ARE NOT IMPORTED, because `src/components/state-boundary.tsx` is
 * not one of this file's dependencies: the seven-state cases below therefore assert what each state
 * renders — the busy region, the caller's own message, the source label with the record's own as-of
 * instant, the children the warning keeps, the control that repeats the read, the denial handed to
 * `ForbiddenCard` — rather than restating that module's wording, whose one owner stays the module
 * itself. Its exported `STATE_BOUNDARY_TEXT` is read where a case asserts that wording is absent, so
 * no sentence of that module is retyped here.
 *
 * A RECORDED DIVERGENCE, AND HOW THE CONFLICT STATE IS REACHED. (1) The plan names one test module for
 * five source files, so this file carries all five contracts; a later stage that splits them makes that
 * split its own decision.
 * (2) `'conflict'` reaches the panel through the adapter's collection-read refusal rather than through
 * a family's own malformed-request check: the suggested-question read's payload is a collection, so the
 * simulation's conflict trigger refuses it with a `'validation'` `Problem` before the family runs
 * (`src/services/mock/mock-backend.ts`, `dispatchCollection`). The state mapping is one owner for every
 * screen (`src/components/screen-state.ts`), so that refusal does reach the panel as `'conflict'`
 * exactly as it does its siblings; this suite replaces the port at the provider (rule P-2) and holds no
 * simulation trigger, so the state is proven through `AssistantPanelBody`, which renders it when handed
 * it, and this suite fabricates no service signal to reach it through the connected panel.
 *
 * THE PARTIAL NOTICE'S SENTENCE COMES FROM THE RECORD. `AssistantPanelBody` derives the detail its
 * partial notice prints from the missing inputs the answer carries and hands it to `StateBoundary`,
 * which owns the headline; the body declares no message member of its own, so no caller supplies one
 * and the panel composes no sentence of its own (rule P-6). The partial case below asserts the
 * record's own value for that reason, and the connected half reaches that state the way the panel
 * derives it — a source reporting that it answered incompletely — rather than through an answer's own
 * gap, which belongs to the answer's disclosure and not to the screen.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default, with the jest-dom matchers
 * `tests/setup.ts` registers. Nothing here hashes, reads the system clock or touches the network.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EVIDENCE_DRAWER_TEXT } from '../../components/evidence-drawer';
import { STATE_BOUNDARY_TEXT } from '../../components/state-boundary';
import type { SiteIntelligenceService } from '../../services/site-intelligence-service';
import { DEMO_CLOCK, FREE_TEXT_MAX_LENGTH, SIM_LABELS, SOURCE_IDS, SOURCE_LABELS } from '../../types';
import type {
  Answer,
  Evidence,
  Freshness,
  Meta,
  ModelBoundary,
  ModelCatalogue,
  Permission,
  Problem,
  Result,
  Role,
  ScreenState,
  SimLabel,
  SourceId,
  SuggestedQuestion,
  ThemeName,
  Timestamp,
} from '../../types';
import { ASSISTANT_ANSWER_TEXT, AssistantAnswer } from './assistant-answer';
import {
  ASSISTANT_PANEL_TEXT,
  AssistantPanel,
  AssistantPanelBody,
} from './assistant-panel';
import type { AssistantPanelBodyProps } from './assistant-panel';
import { AssistantScreen } from './assistant-screen';
import { ModelSelector } from './model-selector';
import { PolicyBlockCard } from './policy-block-card';

/* ---------------------------------------------------------------------------------------------
 * The port, replaced
 * ------------------------------------------------------------------------------------------- */

/**
 * The four port members these components call, replaced before either module is imported.
 *
 * Each is typed from the port itself, so a renamed member or a changed parameter list makes this file
 * fail to compile instead of leaving the stub answering a call nobody makes. The set is the whole of
 * the assistant's data path: the two reads the panel opens with, the question it puts, and the
 * evidence read the citation chip's drawer performs.
 */
const service = vi.hoisted(() => ({
  listSuggestedQuestions: vi.fn<SiteIntelligenceService['listSuggestedQuestions']>(),
  getModelCatalogue: vi.fn<SiteIntelligenceService['getModelCatalogue']>(),
  askAssistant: vi.fn<SiteIntelligenceService['askAssistant']>(),
  getEvidence: vi.fn<SiteIntelligenceService['getEvidence']>(),
}));

vi.mock('../../services/service-provider', () => ({ useService: () => service }));

/* ---------------------------------------------------------------------------------------------
 * Fixtures — every value a record's own, and none of them a typed figure
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every result and every failure of these fixtures carries. */
const TRACE_ID = 'stub-trace';

/** The instant every source last answered: the demonstration clock's own instant, never typed. */
const AS_OF: Timestamp = DEMO_CLOCK;

/** The one suggested question the stubbed read publishes, in the record's own words. */
const QUESTION: SuggestedQuestion = { id: 'stub-question-a', prompt: 'stub-question-prompt' };

/** The sentence a composed answer carries, compared against the stub's own value and never typed. */
const ANSWER_TEXT = 'stub-answer-text';

/** The text the service returns for a question outside its script, held here as a sentinel only. */
const UNSCRIPTED_TEXT = 'stub-unscripted-answer';

/**
 * The one input the unscripted answer reports it lacks, standing in for the adapter's own diagnostic.
 *
 * It is that answer's member and nothing else's: the demonstration holds no question covering the one
 * asked, which is why the adapter marks the answer partial, and the panel renders the answer rather
 * than turning the gap into a state of the screen (rule P-6).
 */
const UNSCRIPTED_MISSING = 'stub-unscripted-missing-input';

/** The two query lines the answer reports having run. */
const QUERY_ONE = 'stub-query-a';
const QUERY_TWO = 'stub-query-b';

/** The citation references, opaque placeholders rather than record-identifier shapes. */
const CITATION_REF = 'stub-ref-1';
const SECOND_CITATION_REF = 'stub-ref-2';

/** The source a citation came from: a member of the six-source vocabulary, read from the barrel. */
const CITATION_SOURCE: SourceId = 'erp';

/** The two catalogue entries: the model the policy permits, and the one it can block. */
const IN_BOUNDARY_ID = 'stub-model-in-boundary';
const EXTERNAL_ID = 'stub-model-external';
const IN_BOUNDARY_LABEL = 'stub-model-label-a';
const EXTERNAL_LABEL = 'stub-model-label-b';
const IN_BOUNDARY: ModelBoundary = 'in-boundary';
const EXTERNAL: ModelBoundary = 'external';

/** The refusal the denying policy produces, and every member the block card prints. */
const POLICY_ID = 'stub-policy';
const AUDIT_EVENT_ID = 'stub-audit-event';
const POLICY_REASON = 'stub-policy-reason';

/** The evidence the drawer shows for a citation. */
const EVIDENCE_VALUE = 'stub-evidence-value';
const EVIDENCE_FORMULA = 'stub-evidence-formula';
const EVIDENCE_INPUT = 'stub-input';
const EVIDENCE_UPSTREAM = 'stub-upstream';
const EVIDENCE_DOWNSTREAM = 'stub-downstream';
const EVIDENCE_CONFIDENCE_REASON = 'stub-confidence-reason';

/** The permission a denial requires, and the roles that hold it. */
const PERMISSION: Permission = 'evidence.read';
const ROLES: readonly Role[] = ['auditor', 'material-planner'];

/** Every message the suite supplies itself, so no case depends on wording the components own. */
const FAILURE_MESSAGE = 'stub-failure-message';
const SELECTOR_REASON = 'stub-selector-reason';
const EMPTY_MESSAGE = 'stub-empty-message';
const TYPED_QUESTION = 'stub-typed-question';

/**
 * One input the service reported it could not read.
 *
 * The panel's partial notice names the missing inputs an answer carries rather than a sentence of its
 * own, so this value is the notice's text and is compared against the record's own field (rule P-6).
 */
const MISSING_INPUT = 'stub-missing-input';

/**
 * The one simulation label the answer carries, read from the fixed §5.3 vocabulary at the position
 * the plan gives it (rule P-1) rather than written again here.
 */
const CALC_LABEL: SimLabel = SIM_LABELS[1];

/**
 * The SCR-06 screen name, which AAP §0.12.4 fixes as the route's title.
 *
 * Not a record value, an amount or a contracts §1 identifier, so typing it here breaches nothing: it
 * is the specification's own name for the screen, and the assertion below would be silent if the
 * heading were checked only for being present.
 */
const SCREEN_TITLE = 'Evidence assistant';

/**
 * The product eyebrow above the title, the string every sibling route renders in the same slot.
 *
 * Typed rather than imported for the same reason as `SCREEN_TITLE`: `./assistant-screen` exports the
 * component and its props and keeps its text object private, and this work does not widen that
 * surface. Rule P-7 fixes the product's name, so the string is the specification's own vocabulary and
 * no record value, figure, amount or contracts §1 identifier is stated by typing it.
 */
const SCREEN_EYEBROW = 'Site Intelligence';

/** Both themes of specification §4.1, as the `data-theme` values the token layer keys on. */
const THEMES: readonly ThemeName[] = ['command', 'paper'];

/** One source's freshness in the report every read carries. */
function freshFor(source: SourceId): Freshness {
  return { source, asOf: AS_OF, state: 'fresh' };
}

/** The six sources' report, every one of them current. */
const FRESHNESS: readonly Freshness[] = SOURCE_IDS.map((source) => freshFor(source));

/**
 * The same report with one source saying it answered incompletely: the reads' own account of a gap.
 *
 * This is what puts the screen in the partial state — a source's report, not an answer's account of
 * what it could not fill — so the case that uses it proves the state is still reachable once the
 * answer's own gap stops being promoted to it.
 */
const PARTIAL_FRESHNESS: readonly Freshness[] = SOURCE_IDS.map((source) =>
  source === CITATION_SOURCE ? { source, asOf: AS_OF, state: 'partial' } : freshFor(source),
);

/** The metadata qualifying every result, including the literal `simulated: true` marker. */
const META: Meta = { freshness: [...FRESHNESS], simulated: true, traceId: TRACE_ID };

/** Wraps a payload in the envelope the port resolves. */
function envelope<T>(data: T): Result<T> {
  return { data, meta: META };
}

/** Wraps a payload in an envelope whose report carries a given freshness — the stale cases' input. */
function envelopeReporting<T>(data: T, freshness: readonly Freshness[]): Result<T> {
  return { data, meta: { freshness: [...freshness], simulated: true, traceId: TRACE_ID } };
}

/** The catalogue the selector lists: one in-boundary entry and the external one, in record order. */
const CATALOGUE: ModelCatalogue = {
  models: [
    { id: IN_BOUNDARY_ID, label: IN_BOUNDARY_LABEL, version: '', boundary: IN_BOUNDARY },
    { id: EXTERNAL_ID, label: EXTERNAL_LABEL, version: '', boundary: EXTERNAL },
  ],
  defaultModelId: IN_BOUNDARY_ID,
};

/** One answer with every member filled, so the disclosure and the chips both have content. */
function citedAnswer(): Answer {
  return {
    text: ANSWER_TEXT,
    citations: [
      { ref: CITATION_REF, source: CITATION_SOURCE, freshness: freshFor(CITATION_SOURCE) },
      {
        ref: SECOND_CITATION_REF,
        source: CITATION_SOURCE,
        freshness: freshFor(CITATION_SOURCE),
      },
    ],
    queriesRun: [QUERY_ONE, QUERY_TWO],
    modelId: IN_BOUNDARY_ID,
    partial: false,
    missing: [],
  };
}

/**
 * The answer a question outside the script returns, in the shape the adapter actually produces: the
 * notice as its text, no citation and no query because it rested on no record, and `partial` true with
 * the one input the demonstration would need. `partial` is true exactly when `missing` is not empty
 * (`src/types/screen-dto.ts`), so a fixture that filled one and not the other would hide a panel that
 * promoted the answer's own gap to a state of the screen.
 */
const UNSCRIPTED_ANSWER: Answer = {
  text: UNSCRIPTED_TEXT,
  citations: [],
  queriesRun: [],
  modelId: IN_BOUNDARY_ID,
  partial: true,
  missing: [UNSCRIPTED_MISSING],
};

/**
 * The incomplete answer the partial state renders: a citation and one input the service could not
 * read, so the notice has the record's own sentence to print.
 */
function partialAnswer(): Answer {
  return { ...citedAnswer(), partial: true, missing: [MISSING_INPUT] };
}

/** The evidence record behind a citation, filling all four of the drawer's sections. */
const EVIDENCE: Evidence = {
  value: EVIDENCE_VALUE,
  provenance: 'computed',
  label: CALC_LABEL,
  formula: EVIDENCE_FORMULA,
  inputs: [EVIDENCE_INPUT],
  upstream: [EVIDENCE_UPSTREAM],
  downstream: [EVIDENCE_DOWNSTREAM],
  confidence: { level: 'high', reason: EVIDENCE_CONFIDENCE_REASON },
  missingInputs: [],
  documents: [],
};

/**
 * The `'policy'` refusal the model-boundary policy produces for a context an external model may not
 * answer, carrying every member the block card prints.
 */
function policyProblem(): Problem {
  return {
    type: 'policy',
    message: POLICY_REASON,
    traceId: TRACE_ID,
    policyId: POLICY_ID,
    permittedAlternative: IN_BOUNDARY_ID,
    auditEventId: AUDIT_EVENT_ID,
  };
}

/** The `'permission'` refusal the matrix produces, with everything the forbidden card needs. */
function permissionProblem(): Problem {
  return {
    type: 'permission',
    message: FAILURE_MESSAGE,
    traceId: TRACE_ID,
    requiredPermission: PERMISSION,
    rolesWithPermission: [...ROLES],
  };
}

/** A refusal of any other cause, whose rendering is the compact failure region with its retry. */
function validationProblem(): Problem {
  return { type: 'validation', message: FAILURE_MESSAGE, traceId: TRACE_ID };
}

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/** One user-event session, as the helpers below take it. */
type UserSession = ReturnType<typeof userEvent.setup>;

/**
 * Renders a component inside a cache of its own.
 *
 * The cache is created per call rather than shared, because two cases must never serve each other a
 * payload. Retries are off so a refusal settles in one call, and `gcTime` is zero so a cache that is
 * collected between renders cannot keep a previous case's records alive.
 */
function withProviders(ui: ReactElement): ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  return <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>;
}

/** Renders a component inside its own cache and hands back the render result. */
function renderWithProviders(ui: ReactElement): ReturnType<typeof render> {
  return render(withProviders(ui));
}

/** Renders the presentational panel — the half that takes its state as a prop. */
function renderBody(props: AssistantPanelBodyProps): void {
  renderWithProviders(<AssistantPanelBody {...props} />);
}

/**
 * The named group that holds a given value, found by the value rather than by a heading this suite
 * would otherwise have to retype.
 *
 * A card and a panel are both a `<section>` named by the element they carry their caption in, so the
 * nearest such ancestor is the group whose accessible name the value sits under. Failing loudly here
 * names the behaviour rather than surfacing as a confusing `undefined` later in the case.
 */
function groupScopeFor(value: string): ReturnType<typeof within> {
  const group = screen.getByText(value).closest('section');

  if (!(group instanceof HTMLElement)) {
    throw new Error(`No named group holds ${value}`);
  }

  return within(group);
}

/** The citation chips of a rendered answer: the controls that open a dialog. */
function citationChips(): readonly HTMLElement[] {
  return screen
    .getAllByRole('button')
    .filter((control) => control.getAttribute('aria-haspopup') === 'dialog');
}

/** A colour a component would have written into its own `style` attribute instead of a role token. */
const INLINE_COLOUR = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i;

/**
 * Asserts that no rendered element colours itself inline.
 *
 * Both themes resolve the same role tokens of `src/theme/tokens.css`, so a palette value, a colour
 * function or an inline elevation in the markup would be a component painting itself rather than a
 * token, and no contrast the specification measured would hold in the other theme.
 */
function expectNoInlineColour(container: HTMLElement): void {
  expect(container.innerHTML.length).toBeGreaterThan(0);

  for (const element of Array.from(container.querySelectorAll('[style]'))) {
    expect(element.getAttribute('style') ?? '').not.toMatch(INLINE_COLOUR);
  }
}

/** A promise and the resolver that settles it, for the case that must observe a call in flight. */
function deferredAnswer(): { promise: Promise<Result<Answer>>; resolve: (value: Result<Answer>) => void } {
  let settle: (value: Result<Answer>) => void = () => undefined;
  const promise = new Promise<Result<Answer>>((resolve) => {
    settle = resolve;
  });

  return { promise, resolve: settle };
}

/** Selects a catalogue entry through the control, once the catalogue has arrived. */
async function selectModel(user: UserSession, modelId: string): Promise<void> {
  const select = await screen.findByRole('combobox');
  await user.selectOptions(select, modelId);
}

/** Puts a suggested question to the panel by activating its own control. */
async function ask(user: UserSession, prompt: string): Promise<void> {
  const control = await screen.findByRole('button', { name: prompt });
  await user.click(control);
}

/** Restores every stub to the state a case expects before it starts. */
beforeEach(() => {
  vi.clearAllMocks();

  service.listSuggestedQuestions.mockResolvedValue(envelope([QUESTION]));
  service.getModelCatalogue.mockResolvedValue(envelope(CATALOGUE));
  service.askAssistant.mockResolvedValue(envelope(citedAnswer()));
  service.getEvidence.mockResolvedValue(envelope(EVIDENCE));
});

/**
 * Takes the theme attribute off `<html>` and unstubs any global a case replaced, so one case cannot
 * colour the next.
 */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  vi.unstubAllGlobals();
});

/* ---------------------------------------------------------------------------------------------
 * A suggested question, its cited answer, and the evidence behind it
 * ------------------------------------------------------------------------------------------- */

describe('AssistantPanel — a suggested question and its cited answer', () => {
  it('puts the suggested question to the port once with the model the selector shows, and renders the answer it returns', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AssistantPanel />);

    await ask(user, QUESTION.prompt);

    await waitFor(() => expect(service.askAssistant).toHaveBeenCalledTimes(1));
    /* The prompt is the record's own text and the model is the catalogue's default, so the call the
       service receives contains nothing this suite or the panel composed. */
    expect(service.askAssistant).toHaveBeenCalledWith({
      question: QUESTION.prompt,
      modelId: CATALOGUE.defaultModelId,
      contextRefs: [],
    });

    expect(await screen.findByText(ANSWER_TEXT)).toBeVisible();
  });

  it('carries the simulated-calculation label inside the answer itself rather than on the page around it', () => {
    const { container } = renderWithProviders(<AssistantAnswer answer={citedAnswer()} />);

    /* Nothing else is rendered here — no shell, no page-level badge — so a label found inside the
       answer's own subtree is the answer's own, which a badge somewhere on the route could not
       satisfy (rule P-1, AAP §0.10). */
    const answer = within(container);
    expect(answer.getByText(CALC_LABEL)).toBeVisible();
    expect(answer.getByText(ANSWER_TEXT)).toBeVisible();
  });

  it('opens the evidence behind a citation from the keyboard and returns focus to the chip', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AssistantAnswer answer={citedAnswer()} />);

    expect(citationChips()).toHaveLength(2);

    const chip = screen.getByRole('button', { name: new RegExp(CITATION_REF) });

    /* The visible reference comes first and the name ends by saying what activating it does, so a
       speech-input user can name the figure and a screen-reader user is told it opens something. */
    expect(chip).toHaveAccessibleName(new RegExp(CITATION_REF));
    expect(chip).toHaveAccessibleName(new RegExp(`${EVIDENCE_DRAWER_TEXT.openSuffix}$`));
    expect(chip).toHaveAttribute('aria-haspopup', 'dialog');
    expect(chip).toHaveAttribute('aria-expanded', 'false');

    /* Reached by Tab rather than by a pointer: the chip is a keyboard stop of the answer, not a mark
       a pointer alone can reach (rule B-3). */
    for (let step = 0; step < 4 && document.activeElement !== chip; step += 1) {
      await user.tab();
    }
    expect(chip).toHaveFocus();

    await user.keyboard('{Enter}');

    const dialog = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });
    expect(await within(dialog).findByText(EVIDENCE_VALUE)).toBeVisible();

    /* The record's four sections, each a named region, with the record's own values inside them. */
    expect(within(dialog).getAllByRole('region')).toHaveLength(4);
    expect(within(dialog).getByText(EVIDENCE_FORMULA)).toBeVisible();
    expect(within(dialog).getByText(EVIDENCE.provenance)).toBeVisible();
    expect(service.getEvidence).toHaveBeenCalledWith(CITATION_REF);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(chip).toHaveFocus();
    expect(chip).toHaveAttribute('aria-expanded', 'false');
  });

  it('lists the queries the answer ran and the model it named behind a keyboard-operable disclosure', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AssistantAnswer answer={citedAnswer()} />);

    const disclosure = screen.getByRole('button', { name: ASSISTANT_ANSWER_TEXT.detailShow });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(QUERY_ONE)).toBeNull();

    for (let step = 0; step < 5 && document.activeElement !== disclosure; step += 1) {
      await user.tab();
    }
    expect(disclosure).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(QUERY_ONE)).toBeVisible();
    expect(screen.getByText(QUERY_TWO)).toBeVisible();
    expect(screen.getByText(IN_BOUNDARY_ID)).toBeVisible();

    await user.keyboard('{Enter}');

    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(QUERY_ONE)).toBeNull();
  });

  it('renders the text the service returned for a question outside its script, and announces nothing beside it', async () => {
    const user = userEvent.setup();
    service.askAssistant.mockResolvedValue(envelope(UNSCRIPTED_ANSWER));
    renderWithProviders(<AssistantPanel />);

    await ask(user, QUESTION.prompt);

    /* The assertion is against the stub's own value, so it proves the panel prints whatever the
       service said rather than a sentence the interface owns (rule P-6). */
    expect(await screen.findByText(UNSCRIPTED_TEXT)).toBeVisible();

    /* The notice is the whole of what a question outside the script renders. The answer reports
       itself partial, and that account is the answer's rather than the screen's: no second region is
       announced beside the notice, and no control invites a retry that cannot put a question into the
       script (AAP §0.12.4, rule P-8). */
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel })).toBeNull();

    /* The gap itself is not dropped: it stays the answer's own detail, behind the disclosure that
       carries the record's label for it. */
    await user.click(screen.getByRole('button', { name: ASSISTANT_ANSWER_TEXT.detailShow }));
    expect(screen.getByText(UNSCRIPTED_MISSING)).toBeVisible();
  });

  it('reports the partial state when a read says a source answered incompletely', async () => {
    service.listSuggestedQuestions.mockResolvedValue(
      envelopeReporting([QUESTION], PARTIAL_FRESHNESS),
    );
    renderWithProviders(<AssistantPanel />);

    /* The sources' own report is what the screen's partial state comes from, and it survives an
       answer's gap no longer being promoted to it: the notice is announced, and the content the read
       did fill keeps rendering beneath it. */
    expect(await screen.findByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(STATE_BOUNDARY_TEXT.partialHeadline);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The question read coming back empty — AAP §0.2.1 F10, AAP §0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The cache key of the question read: the port member's own name first, which is the key convention
 * every read in the cache follows (`src/app/providers.tsx`) and what the shell matches when a resolved
 * change re-issues the reads it moved.
 */
const QUESTION_READ_KEY = ['listSuggestedQuestions'] as const;

describe('AssistantPanel — the question read comes back empty', () => {
  /**
   * THE BEHAVIOUR THIS PROVES. With the simulation popover's `empty` trigger in effect, every read whose
   * payload is a collection answers with nothing to show (`src/services/mock/simulation.ts`), the
   * suggested-question read among them, and the panel must render the generic empty state — the
   * composer, the model selector and the answer it composed from questions the read no longer publishes
   * all leave with it (AAP §0.2.1 F10, AAP §0.12.1).
   *
   * HOW THE READ IS MADE TO CHANGE. The cache is cancelled and then reset for the question read, which
   * is the pair the shell issues once a resolved trigger change settles (`reissueReads` in
   * `src/app/simulation-controls.tsx`): the payload taken before the change is dropped and the read is
   * started again through the port. The stub is the suite's own and the client is this case's, so the
   * case leans on no lever production code lacks.
   */
  it('empties the panel when the question read returns no question, taking the composer, the selector and the last answer with it', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AssistantPanel />
      </QueryClientProvider>,
    );

    /* A question answered while the read still publishes one: the answer with its citation chips, the
       composer and the selector are on screen together. */
    await ask(user, QUESTION.prompt);

    expect(await screen.findByText(ANSWER_TEXT)).toBeVisible();
    expect(citationChips()).toHaveLength(2);
    expect(screen.getByLabelText(ASSISTANT_PANEL_TEXT.composerLabel)).toBeVisible();
    expect(screen.getByRole('combobox')).toHaveValue(IN_BOUNDARY_ID);

    /* The trigger's own answer, then the re-issue the shell performs after it resolves. */
    service.listSuggestedQuestions.mockResolvedValue(envelope([]));

    await act(async () => {
      await queryClient.cancelQueries({ queryKey: QUESTION_READ_KEY });
      await queryClient.resetQueries({ queryKey: QUESTION_READ_KEY });
    });

    /* The generic empty state stands alone. The last answer was composed from the questions the read no
       longer publishes, so it cannot keep the screen occupied beside an empty read. */
    expect(await screen.findByText(ASSISTANT_PANEL_TEXT.emptyFallback)).toBeVisible();
    expect(screen.queryByText(ANSWER_TEXT)).toBeNull();
    expect(screen.queryAllByRole('button', { name: new RegExp(CITATION_REF) })).toHaveLength(0);
    expect(screen.queryByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeNull();
    expect(screen.queryByLabelText(ASSISTANT_PANEL_TEXT.composerLabel)).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The refusals — a policy block, a denial, and every other cause
 * ------------------------------------------------------------------------------------------- */

describe('AssistantPanel — the refusals', () => {
  it('blocks an external question with the policy card and re-asks it on the in-boundary model', async () => {
    const user = userEvent.setup();
    service.askAssistant.mockRejectedValue(policyProblem());
    renderWithProviders(<AssistantPanel />);

    await selectModel(user, EXTERNAL_ID);
    await ask(user, QUESTION.prompt);

    await waitFor(() => expect(service.askAssistant).toHaveBeenCalledTimes(1));

    /* The refusal is the service's own record, rendered as data: the rule, its reason, the model it
       permits and the event the denial itself recorded. */
    const card = groupScopeFor(POLICY_ID);
    expect(card.getByText(POLICY_REASON)).toBeVisible();
    expect(card.getByText(IN_BOUNDARY_ID)).toBeVisible();
    expect(card.getByText(AUDIT_EVENT_ID)).toBeVisible();

    await user.click(card.getByRole('button', { name: new RegExp(IN_BOUNDARY) }));

    await waitFor(() => expect(service.askAssistant).toHaveBeenCalledTimes(2));

    /* The first question went to the model the reader chose; the one-click switch re-asked it on the
       model the policy permits, and never on the blocked one (AAP §0.12.4). */
    const [first, second] = service.askAssistant.mock.calls;
    expect(first?.[0].modelId).toBe(EXTERNAL_ID);
    expect(first?.[0].question).toBe(QUESTION.prompt);
    expect(second?.[0].modelId).toBe(IN_BOUNDARY_ID);
    expect(second?.[0].modelId).not.toBe(EXTERNAL_ID);
  });

  /* The card that reports a policy block carries the control that puts the question again, and the card
     leaves the document the moment that control does. The focus it held is handed to the region that
     survives the re-ask, so a reader who switches models from the keyboard is not left on the document's
     body with no ring on anything (rule B-3). */
  it("hands focus to the answer region when the block card's switch re-asks the question", async () => {
    const user = userEvent.setup();
    const pending = deferredAnswer();
    service.askAssistant
      .mockRejectedValueOnce(policyProblem())
      .mockImplementationOnce(() => pending.promise);
    renderWithProviders(<AssistantPanel />);

    await selectModel(user, EXTERNAL_ID);
    await ask(user, QUESTION.prompt);
    await waitFor(() => expect(service.askAssistant).toHaveBeenCalledTimes(1));

    const switchControl = groupScopeFor(POLICY_ID).getByRole('button', {
      name: new RegExp(IN_BOUNDARY),
    });
    const region = switchControl.closest('[tabindex="-1"]');

    if (!(region instanceof HTMLElement)) {
      throw new Error('The block card does not sit inside the panel’s focusable answer region.');
    }

    switchControl.focus();
    expect(switchControl).toHaveFocus();

    await user.keyboard('{Enter}');

    await waitFor(() => expect(service.askAssistant).toHaveBeenCalledTimes(2));

    /* The refusal the card reported is cleared by the question now in flight, and the region that held
       the card holds the focus the card could not keep. */
    expect(document.activeElement).toBe(region);
    expect(region).toContainElement(screen.getByText(ASSISTANT_PANEL_TEXT.asking));

    await act(async () => {
      pending.resolve(envelope(citedAnswer()));
    });

    expect(await screen.findByText(ANSWER_TEXT)).toBeVisible();
    expect(document.activeElement).toBe(region);
  });

  it('renders the forbidden card when the read is refused for want of a permission', async () => {
    service.listSuggestedQuestions.mockRejectedValue(permissionProblem());
    renderWithProviders(<AssistantPanel />);

    const card = await screen.findByRole('region', { name: new RegExp(PERMISSION) });

    /* The denial names the permission, the roles that may act and the trace id of the refused call,
       so a reader is told who to ask rather than only that they were refused. */
    for (const role of ROLES) {
      expect(within(card).getByText(role)).toBeVisible();
    }
    expect(within(card).getByText(TRACE_ID)).toBeVisible();

    /* A denial replaces the content rather than warning above it: nothing the refused read would
       have filled is left on screen. */
    expect(screen.queryByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeNull();
  });

  it('reports any other failed read as offline and repeats the read on retry', async () => {
    const user = userEvent.setup();
    service.listSuggestedQuestions.mockRejectedValue(new Error(FAILURE_MESSAGE));
    renderWithProviders(<AssistantPanel />);

    /* Nothing else is on screen in this state, so the one control is the retry the boundary offers. */
    const retry = await screen.findByRole('button');
    expect(retry).toHaveAccessibleName(/\S/);
    expect(screen.queryByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeNull();
    expect(service.listSuggestedQuestions).toHaveBeenCalledTimes(1);

    await user.click(retry);

    await waitFor(() => expect(service.listSuggestedQuestions).toHaveBeenCalledTimes(2));
  });

  it('delegates a permission denial whole to the forbidden card', () => {
    renderWithProviders(
      <PolicyBlockCard problem={permissionProblem()} onSwitchToInBoundary={vi.fn()} />,
    );

    expect(screen.getByRole('region', { name: new RegExp(PERMISSION) })).toBeVisible();
    expect(screen.getByText(TRACE_ID)).toBeVisible();
  });

  it('reports a refusal of any other cause with its correlation identifier and the caller retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderWithProviders(
      <PolicyBlockCard
        problem={validationProblem()}
        onSwitchToInBoundary={vi.fn()}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(FAILURE_MESSAGE)).toBeVisible();
    expect(screen.getByText(TRACE_ID)).toBeVisible();

    /* The retry exists only because the caller supplied one, and activating it repeats the caller's
       call rather than a call of this component's own. */
    await user.click(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The model selector
 * ------------------------------------------------------------------------------------------- */

describe('ModelSelector', () => {
  it('lists every catalogue entry with the boundary it declares and reports the choice once', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(
      <ModelSelector
        catalogue={CATALOGUE}
        selectedModelId={IN_BOUNDARY_ID}
        onSelect={onSelect}
      />,
    );

    expect(screen.getAllByRole('option')).toHaveLength(CATALOGUE.models.length);
    /* The boundary is the value the model-boundary policy evaluates, so it is printed verbatim
       beside the entry rather than mapped to friendlier prose. */
    expect(screen.getByRole('option', { name: new RegExp(IN_BOUNDARY_LABEL) })).toHaveTextContent(
      IN_BOUNDARY,
    );
    expect(screen.getByRole('option', { name: new RegExp(EXTERNAL_LABEL) })).toHaveTextContent(
      EXTERNAL,
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveAccessibleName(/\S/);
    expect(select).toHaveValue(IN_BOUNDARY_ID);

    await user.selectOptions(select, EXTERNAL_ID);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(EXTERNAL_ID);
  });

  /* A field carries an identity as well as a name, and this select gets its name from the legend
     through `aria-labelledby`, which leaves the element itself unidentified for anything keyed on
     `id` or `name` — a browser's autofill and the diagnostics that report an unnamed form field among
     them. Both are asserted because they answer different questions: the `id` tells this select apart
     from any other on the page, and the `name` identifies the field rather than the entry chosen. */
  it('carries the identity a form field needs, beside the legend that names it', () => {
    renderWithProviders(
      <ModelSelector
        catalogue={CATALOGUE}
        selectedModelId={IN_BOUNDARY_ID}
        onSelect={vi.fn()}
      />,
    );

    const select = screen.getByRole('combobox');

    expect(select.id).not.toBe('');
    expect(select.getAttribute('name')).toMatch(/\S/);
  });

  it('explains a selector that cannot act through the description its focus carries', () => {
    renderWithProviders(
      <ModelSelector
        catalogue={CATALOGUE}
        selectedModelId={IN_BOUNDARY_ID}
        onSelect={vi.fn()}
        disabled
        disabledReason={SELECTOR_REASON}
      />,
    );

    const select = screen.getByRole('combobox');

    /* Disabled, and carrying the reason as its description, so the explanation reaches a keyboard
       user on focus rather than only a pointer that hovers (rule P-8). */
    expect(select).toBeDisabled();
    expect(select).toHaveAccessibleDescription(SELECTOR_REASON);
    expect(screen.getByText(SELECTOR_REASON)).toBeVisible();
  });
});

/* ---------------------------------------------------------------------------------------------
 * A question in flight
 * ------------------------------------------------------------------------------------------- */

describe('AssistantPanel — a question in flight', () => {
  it('disables the submit control with its reason and keeps the draft the reader typed', async () => {
    const user = userEvent.setup();
    const pending = deferredAnswer();
    service.askAssistant.mockImplementation(() => pending.promise);
    renderWithProviders(<AssistantPanel />);

    const field = await screen.findByLabelText(ASSISTANT_PANEL_TEXT.composerLabel);

    /* Nothing to ask yet, so the control cannot act and says why rather than looking available
       (rule P-8). The reason is the control's description, which a keyboard user hears on focus. */
    const blocked = screen.getByRole('button', { name: ASSISTANT_PANEL_TEXT.submitLabel });
    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    expect(blocked).toHaveAccessibleDescription(ASSISTANT_PANEL_TEXT.emptyDraftBlocker);

    await user.type(field, TYPED_QUESTION);

    /* Every stage is re-queried: a control that becomes disabled is re-rendered inside its own
       explanation, so the node the previous assertion held is no longer the live one. */
    const armed = screen.getByRole('button', { name: ASSISTANT_PANEL_TEXT.submitLabel });
    expect(armed).not.toHaveAttribute('aria-disabled');

    await user.click(armed);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: ASSISTANT_PANEL_TEXT.submitLabel }),
      ).toHaveAttribute('aria-disabled', 'true');
    });

    const inFlight = screen.getByRole('button', { name: ASSISTANT_PANEL_TEXT.submitLabel });
    expect(inFlight).toHaveAccessibleDescription(ASSISTANT_PANEL_TEXT.askingBlocker);
    /* The draft stays in the field while the answer is awaited, so the reader keeps what was asked. */
    expect(field).toHaveValue(TYPED_QUESTION);

    await act(async () => {
      pending.resolve(envelope(citedAnswer()));
    });

    expect(await screen.findByText(ANSWER_TEXT)).toBeVisible();
  });

  it('hands focus to the answer region when a question activated from the keyboard replaces its own control', async () => {
    const user = userEvent.setup();
    const pending = deferredAnswer();
    service.askAssistant.mockImplementation(() => pending.promise);
    renderWithProviders(<AssistantPanel />);

    const control = await screen.findByRole('button', { name: QUESTION.prompt });

    /* Reached and activated the way the defect was: Tab to the question control, then `Enter`. */
    for (let step = 0; step < 4 && document.activeElement !== control; step += 1) {
      await user.tab();
    }
    expect(control).toHaveFocus();

    await user.keyboard('{Enter}');

    await waitFor(() => expect(service.askAssistant).toHaveBeenCalledTimes(1));

    /* The control moves inside its own explanation the moment the question is in flight, so it cannot
       keep the focus; the region holding the pending announcement takes it instead of the document's
       body, and carries the programmatic tab stop that hand-off needs. */
    const region = document.activeElement;

    if (!(region instanceof HTMLElement)) {
      throw new Error('No element holds focus while the question is in flight.');
    }

    expect(region).not.toBe(document.body);
    expect(region).toHaveAttribute('tabindex', '-1');
    expect(region).toContainElement(screen.getByText(ASSISTANT_PANEL_TEXT.asking));

    /* The answer replaces the announcement inside that same region, so the focus it was handed stays
       on the outcome rather than falling back to the body once the flight ends. */
    await act(async () => {
      pending.resolve(envelope(citedAnswer()));
    });

    expect(await screen.findByText(ANSWER_TEXT)).toBeVisible();
    expect(document.activeElement).toBe(region);
  });

  it('keeps focus in the composer field when the question is submitted from it', async () => {
    const user = userEvent.setup();
    const pending = deferredAnswer();
    service.askAssistant.mockImplementation(() => pending.promise);
    renderWithProviders(<AssistantPanel />);

    const field = await screen.findByLabelText(ASSISTANT_PANEL_TEXT.composerLabel);
    await user.type(field, TYPED_QUESTION);
    expect(field).toHaveFocus();

    /* `Enter` in the field submits the form, and the field itself survives the render that puts the
       question in flight, so the hand-off leaves the reader where they are typing rather than moving
       them to the answer region. */
    await user.keyboard('{Enter}');

    await waitFor(() => expect(service.askAssistant).toHaveBeenCalledTimes(1));
    expect(field).toHaveFocus();

    await act(async () => {
      pending.resolve(envelope(citedAnswer()));
    });

    expect(await screen.findByText(ANSWER_TEXT)).toBeVisible();
    expect(field).toHaveFocus();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The composer's bound
 * ------------------------------------------------------------------------------------------- */

describe("AssistantPanel — the composer's bound", () => {
  it('bounds the question field at the free-text ceiling the service refuses a longer question with', async () => {
    renderWithProviders(<AssistantPanel />);

    const field = await screen.findByLabelText(ASSISTANT_PANEL_TEXT.composerLabel);

    /* The ceiling is the application's one free-text bound, read from the shared vocabulary it is
       declared in rather than typed here; the assistant's handler refuses a longer question with that
       same value, so a reader cannot type past what the service would accept. */
    expect(field).toHaveAttribute('maxlength', String(FREE_TEXT_MAX_LENGTH));
  });
});

/* ---------------------------------------------------------------------------------------------
 * The seven states — specification §8, AAP §0.12.4
 * ------------------------------------------------------------------------------------------- */

/**
 * The seven members of `ScreenState`, in the order the specification lists them.
 *
 * Typed from the union rather than held as a bare list, so a member added to `ScreenState` reaches
 * this suite as a compile error instead of as a rendering nobody asserted.
 */
const SCREEN_STATES: readonly ScreenState[] = [
  'loading',
  'empty',
  'stale',
  'partial',
  'offline',
  'forbidden',
  'conflict',
];

/**
 * One assertion per state, keyed by the member itself.
 *
 * `Record<ScreenState, …>` is the exhaustiveness proof: a member added to the union leaves this map
 * incomplete and the file fails to type-check, which is the failure the suite wants rather than a
 * state that silently renders nothing. `'conflict'` is proven by handing the body the state: the
 * adapter reaches it for the suggested-question read under the simulation's conflict trigger (see the
 * module note), and this suite holds neither that trigger nor the adapter, so it asserts the state at
 * the body rather than driving the refusal through the connected panel.
 */
const STATE_CASES: Readonly<Record<ScreenState, () => Promise<void> | void>> = {
  loading: () => {
    renderBody({ state: 'loading', questions: [QUESTION] });

    const pending = screen.getByRole('status');
    expect(pending).toHaveAttribute('aria-busy', 'true');
    expect(pending).toHaveAccessibleName(/\S/);
    /* A half-read panel is never shown beside the skeleton, so nothing the reads would fill is
       present while they are pending. */
    expect(screen.queryByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeNull();
  },

  empty: () => {
    renderBody({ state: 'empty', questions: [QUESTION], emptyMessage: EMPTY_MESSAGE });

    /* The caller's own sentence, rendered character for character, and no content beneath it. */
    expect(screen.getByText(EMPTY_MESSAGE)).toBeVisible();
    expect(screen.queryByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeNull();
  },

  stale: () => {
    renderBody({
      state: 'stale',
      questions: [QUESTION],
      stale: {
        source: CITATION_SOURCE,
        label: SOURCE_LABELS[CITATION_SOURCE],
        asOf: AS_OF,
      },
    });

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent(SOURCE_LABELS[CITATION_SOURCE]);
    /* The instant is the record's own, printed character for character: a reformatted one would name
       a different moment from the one the record and the disabled controls quote (rule P-6). */
    expect(banner).toHaveTextContent(DEMO_CLOCK);

    /* A warning about currency withholds nothing: the questions keep rendering beneath it. */
    expect(screen.getByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeVisible();
  },

  partial: () => {
    renderBody({ state: 'partial', questions: [QUESTION], answer: partialAnswer() });

    const notice = screen.getByRole('status');
    /* The notice prints the inputs the record itself reported missing, read from the answer rather
       than composed by the interface (rule P-6). */
    expect(notice).toHaveTextContent(MISSING_INPUT);

    /* An incomplete read keeps its content, so the gap can be read beside the figures it affects. */
    expect(screen.getByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeVisible();
    expect(screen.getByText(ANSWER_TEXT)).toBeVisible();
  },

  offline: async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderBody({ state: 'offline', questions: [QUESTION], onRetry });

    /* Nothing answered, so nothing is shown: no figure is left standing that the sources could not
       support, and the notice replaces the content rather than warning above it. */
    expect(screen.queryByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeNull();

    const retry = screen.getByRole('button');
    expect(retry).toHaveAccessibleName(/\S/);

    /* Operable from the keyboard alone, which is how the control is reached. */
    await user.tab();
    expect(retry).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);
  },

  forbidden: () => {
    renderBody({
      state: 'forbidden',
      questions: [QUESTION],
      forbidden: { permission: PERMISSION, roles: ROLES, traceId: TRACE_ID },
    });

    const card = screen.getByRole('region', { name: new RegExp(PERMISSION) });
    expect(within(card).getByText(TRACE_ID)).toBeVisible();
    for (const role of ROLES) {
      expect(within(card).getByText(role)).toBeVisible();
    }
    expect(screen.queryByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeNull();
  },

  conflict: async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderBody({ state: 'conflict', questions: [QUESTION], onRetry });

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent(/\S/);
    expect(screen.queryByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeNull();

    /* The record moved under the reader, so the stale content is replaced and the control re-reads
       it rather than merging the two versions. */
    const reload = screen.getByRole('button');
    await user.click(reload);
    expect(onRetry).toHaveBeenCalledTimes(1);
  },
};

describe('AssistantPanelBody — the seven states', () => {
  it('names the panel region, so the assistant is announced as a landmark', () => {
    renderBody({ state: undefined, questions: [QUESTION] });

    expect(
      screen.getByRole('region', { name: ASSISTANT_PANEL_TEXT.regionLabel }),
    ).toBeVisible();
  });

  it.each(SCREEN_STATES)('renders the %s state', async (state) => {
    await STATE_CASES[state]();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The route wrapper, and both themes
 * ------------------------------------------------------------------------------------------- */

describe('AssistantScreen', () => {
  it('mounts one page heading, the panel, and no second primary action', async () => {
    renderWithProviders(<AssistantScreen />);

    expect(await screen.findByRole('heading', { level: 1, name: SCREEN_TITLE })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    const heading = screen.getByRole('heading', { level: 1 });
    const header = heading.closest('header');

    if (header === null) {
      throw new Error('The page heading is not inside the screen header');
    }

    /* The header carries the product eyebrow as every sibling route's header does (rule P-7), and it
       comes before the title so the slot reads in that same order. */
    const eyebrow = within(header).getByText(SCREEN_EYEBROW);

    expect(eyebrow).toBeVisible();
    expect(eyebrow.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    /* The screen's one action is the composer's submit, which belongs to the panel because it acts on
       the question in the field. A header action would be a second focus stop whose effect is not
       distinct from the first's (rule P-8). */
    expect(within(header).queryAllByRole('button')).toHaveLength(0);

    expect(
      await screen.findByRole('region', { name: ASSISTANT_PANEL_TEXT.regionLabel }),
    ).toBeVisible();
    expect(
      screen.getAllByRole('button', { name: ASSISTANT_PANEL_TEXT.submitLabel }),
    ).toHaveLength(1);
  });
});

describe.each(THEMES)('under the %s theme', (theme) => {
  it('renders the questions, the cited answer, its label and its controls', () => {
    document.documentElement.setAttribute('data-theme', theme);

    renderBody({
      state: undefined,
      questions: [QUESTION],
      catalogue: CATALOGUE,
      selectedModelId: IN_BOUNDARY_ID,
      answer: citedAnswer(),
      onSelectModel: vi.fn(),
    });

    expect(document.documentElement).toHaveAttribute('data-theme', theme);
    expect(screen.getByText(ASSISTANT_PANEL_TEXT.questionsCaption)).toBeVisible();
    expect(screen.getByText(ANSWER_TEXT)).toBeVisible();
    expect(screen.getByText(CALC_LABEL)).toBeVisible();
    expect(citationChips()).toHaveLength(2);
    expect(screen.getByRole('combobox')).toHaveValue(IN_BOUNDARY_ID);
  });

  it('leaves every element styled by a role token rather than an inline colour', () => {
    document.documentElement.setAttribute('data-theme', theme);

    const { container } = renderWithProviders(<AssistantAnswer answer={citedAnswer()} />);

    expectNoInlineColour(container);
  });
});
