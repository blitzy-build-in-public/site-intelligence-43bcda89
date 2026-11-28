/**
 * SCR-06's data-connected panel: the suggested questions the service offers, the composer that puts a
 * question of the reader's own, the model selector, the cited answer, and the refusal a policy or a
 * permission produced.
 *
 * THE CONTRACT IT IMPLEMENTS. AAP §0.12.4's SCR-06 row places the assistant at "`/assistant` and a side
 * panel" and fixes its content: "Suggested questions with scripted cited answers; citation chips; an
 * expander listing the queries and the model; a model selector offering the in-boundary model and an
 * external reasoning model", with the unscripted notice and the external-model block card as its two
 * failure surfaces. `platform-contracts.md` §10 fixes an answer's shape, which `src/types/screen-dto.ts`
 * declares as `Answer`, and the three reads this panel makes are members of the single port,
 * `SiteIntelligenceService` (`listSuggestedQuestions`, `getModelCatalogue`, `askAssistant`). The port is
 * the only data boundary here (rule P-2): no seed module, adapter, API client or domain module is
 * imported, and nothing in this file reaches a record any other way.
 *
 * TWO COMPONENTS IN ONE MODULE, ON PURPOSE. `AssistantPanel` is the connected half — it reads through
 * `useService()` and React Query, owns the chosen model and the reader's draft, and puts a question to
 * the port. `AssistantPanelBody` is the presentational half and receives everything it renders as
 * props, so each of the seven `ScreenState` renderings can be proven at component level by passing the
 * state rather than by planting a flag in production code. AAP §0.18.1 forbids a test hook: nothing
 * here reads a query parameter, a global or a conditional test-only branch, and the simulation popover
 * remains the only lever a browser test drives. The seven states are proven app-wide by T-17 in
 * `e2e/s1-labelling-and-states.spec.ts`; this module proves its own derivation and the body's
 * renderings, and cannot substitute for that pass.
 *
 * IT COMPUTES, FORMATS AND TIMES NOTHING (rule P-6). No question text, no sentence, no displayed
 * figure, no currency amount, no model label and no identifier is typed here: the questions and their
 * prompts come from `listSuggestedQuestions`, the model entries from `getModelCatalogue`, the answer's
 * prose, citations, queries, model and missing inputs from the `Answer`, and every refusal's rule,
 * reason, permitted alternative and recorded event from the `Problem`. The strings this file owns are
 * control labels and state wording — the SCR-06 primary action's name, the composer's field label, the
 * reason a control cannot act, and the caller's empty message. The one number it holds is read rather
 * than stated — {@link FREE_TEXT_MAX_LENGTH}, the audited writes' own ceiling, which bounds what the
 * composer's field accepts so a reader cannot type past what the adapter refuses. Nothing reads a
 * clock, rounds a number, or formats an amount: the one formatter the interface has (`MonoValue`)
 * belongs to the components that render record values, and this file renders none of its own.
 *
 * THE UNSCRIPTED NOTICE IS THE ADAPTER'S, NOT THIS PANEL'S. `askAssistant` returns the seeded notice as
 * an ordinary answer's `text` when a question falls outside the six scripted ones, so this file renders
 * whatever text it is handed and never branches on whether an answer was scripted: writing that
 * sentence here would make this module a second owner of record content.
 *
 * STATES. `ScreenState` carries exactly the seven members of specification §8 and no healthy member, so
 * the derivation in `src/components/screen-state.ts` returns `undefined` for a current and complete read
 * and `StateBoundary` then renders the content alone. That one derivation owns all seven states for
 * every screen, so this panel answers the seven-state question exactly as its siblings do and a
 * `'validation'` refusal reaches it as `'conflict'` — the assistant family produces one only for a
 * request that carried no question or a question longer than the free-text ceiling
 * (`src/services/mock/handlers/assistant.ts`), and T-17 owns the app-wide proof of the seven.
 *
 * RULES THIS MODULE IS BUILT TO SATISFY.
 * - P-2: the port through `useService()` is the only data path; the cache is written only by the
 *   invalidation below — which names its reads from the one write-reads map in
 *   `src/services/write-reads.ts` rather than keeping a list of its own — and no second source of
 *   records exists in this folder.
 * - P-1: no model is presented as connected. The selector prints the boundary each catalogue entry
 *   declares, the answer carries `Simulated calculation` through `AssistantAnswer`, and no sentence here
 *   claims an answer is a production result. The persistent `Simulated data` badge belongs to the shell.
 * - P-3: nothing implies that the permission check behind a refusal is production authorisation. The
 *   denial is the service's own and is reported as it stands.
 * - P-4: no sentence claims that anything establishes a configuration, prevents a copy or resists an
 *   edit, and none of the barred vocabulary appears.
 * - P-5: the panel renders one answer's own members and aggregates nothing, so no market-intelligence
 *   value can be blended with a first-party one here.
 * - P-7: the product is Site Intelligence; no company, customer, plant, model provider or person is
 *   named in this file, and no placeholder prose appears.
 * - P-8: every control either acts or is disabled with the sentence that explains why — the question
 *   controls and the composer's submit are the two branches of one helper each, so a disabled control
 *   without its reason does not compile.
 * - B-1, B-2: the panel talks only to the in-browser adapter. It holds no address, fetches no asset and
 *   reads no environment value; the external model is a catalogue entry this file never contacts.
 * - B-3: the region is named by `Panel`'s caption, the question list is a real list of native buttons,
 *   focus order follows the document, every control keeps the 24x24 px minimum target and the theme's
 *   focus ring, and nothing animates — the pending answer region is announced through `role="status"`
 *   with no transition, so a reduced-motion session has nothing to opt out of. Focus itself is never
 *   dropped: the control an activation replaced is handed to the answer region, which is the one
 *   element that survives the render putting a question in flight (see {@link AssistantPanelBody}).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';

import { Panel } from '../../components/panel';
import {
  deriveScreenState,
  forbiddenOf,
  isProblem,
  staleSourceOf,
} from '../../components/screen-state';
import { StateBoundary } from '../../components/state-boundary';
import type { StateBoundaryForbidden, StateBoundaryStale } from '../../components/state-boundary';
import { TextField } from '../../components/text-field';
import { ActionButton } from '../../components/tooltip';
import { WRITE_READS } from '../../services/write-reads';
import { useService } from '../../services/service-provider';
import { FREE_TEXT_MAX_LENGTH } from '../../types';
import type {
  Answer,
  ModelCatalogue,
  Problem,
  Result,
  Scope,
  ScreenState,
  SuggestedQuestion,
} from '../../types';
import { AssistantAnswer } from './assistant-answer';
import { ModelSelector } from './model-selector';
import { PolicyBlockCard } from './policy-block-card';

/* ---------------------------------------------------------------------------------------------
 * The wording this module owns
 * ------------------------------------------------------------------------------------------- */

/**
 * Every string this module states, held here so the wording has one owner: the components render these
 * strings and a suite names them through this object instead of retyping them.
 *
 * `submitLabel` is not this file's choice — AAP §0.12.4 fixes "Ask a suggested question" as SCR-06's
 * primary action, so it is transcribed rather than paraphrased. The remaining strings are the panel's
 * own: a field label, a caption naming the list, the announcement a pending answer makes, and the
 * sentence a control carries when it cannot act. None of them is a record value, a figure, a date, an
 * identifier or a simulation label (rules P-1, P-6), and none states a property of the deployment
 * (rule P-4).
 */
export const ASSISTANT_PANEL_TEXT = {
  /** The panel region's caption, which is also its accessible name. */
  regionLabel: 'Evidence assistant',

  /** The term the suggested questions are listed under. */
  questionsCaption: 'Suggested questions',

  /** The composer's field label, bound to the input it names. */
  composerLabel: 'Your question',

  /** SCR-06's primary action, transcribed from AAP §0.12.4. */
  submitLabel: 'Ask a suggested question',

  /**
   * The pending answer region's announcement. It is `role="status"` text rather than an animated
   * placeholder, so a reduced-motion session has nothing to opt out of (rule B-3).
   */
  asking: 'Waiting for an answer',

  /** What the empty state says when the caller supplied no message of its own. */
  emptyFallback: 'No suggested question is available yet.',

  /** Why a question control cannot act while another question is being answered (rule P-8). */
  askingBlocker: 'A question is still being answered.',

  /** Why the composer's submit cannot act on an empty draft (rule P-8). */
  emptyDraftBlocker: 'Type a question, or choose one of the suggested questions.',

  /**
   * Why the composer's submit cannot act before a model has been chosen (rule P-8). It states the
   * selector's own condition and names no catalogue entry, because the entries are record content.
   */
  noModelBlocker: 'No model is available to answer with.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The two compositions the panel is mounted in: the route's body, and the shell's side region. */
export type AssistantPanelVariant = 'page' | 'aside';

/**
 * The body's column, one 4 px step apart at page size and one step tighter in the side region.
 *
 * The two variants carry the same content and differ only in the gap between its groups: AAP §0.12.4
 * puts SCR-06 at the route and in the shell's side region, and the side region is the compact surface
 * (AAP §0.5.2's second raised surface), so nothing is dropped or reordered there. Every value is a role
 * token, so both Command and Paper resolve their own measured spacing and no palette literal is
 * reachable from here (rule B-3).
 */
const BODY_CLASSES = {
  page: 'flex min-w-0 flex-col gap-4',
  aside: 'flex min-w-0 flex-col gap-3',
} as const satisfies Record<AssistantPanelVariant, string>;

/**
 * The panel surface itself. `Panel` already owns the raised surface, its hairline and its radius, so the
 * only thing added here is the shrink behaviour a narrow side region needs.
 */
const PANEL_CLASSES = 'min-w-0';

/** One group of the body: a caption and the thing it names, one 4 px step apart. */
const GROUP_CLASSES = 'flex min-w-0 flex-col gap-2';

/** A group's caption, at the smallest type step in the caption text role. */
const CAPTION_CLASSES = 'text-12 font-medium text-text-caption';

/** The question list: real items, each holding one real control, stacked without a margin. */
const QUESTION_LIST_CLASSES = 'flex min-w-0 list-none flex-col items-stretch gap-2 p-0';

/** One list item. It may shrink, so a long prompt wraps inside the panel rather than pushing it wider. */
const QUESTION_ITEM_CLASSES = 'min-w-0';

/**
 * A question control fills the list column, because the prompt is a sentence that wraps.
 *
 * Only the box is sized from here: `ActionButton` hands a disabled control's class list to its tooltip
 * wrapper and lets the trigger fill it, so an alignment utility passed in this way would hold in one
 * state and lapse in the other. The label therefore carries its own left alignment (see
 * {@link QUESTION_LABEL_CLASSES}), which is identical whether the control can act or not.
 */
const QUESTION_CONTROL_CLASSES = 'w-full';

/**
 * The label inside a question control: full width and aligned to the start in both states.
 *
 * A full-width item leaves the control's own `justify-*` nothing to distribute, so the label starts at
 * the same offset while the control can act and while it is disabled with its reason (rule P-8): the
 * text does not shift under the reader the moment a question is put in flight.
 */
const QUESTION_LABEL_CLASSES = 'block w-full text-left';

/** The composer: the field's label, the field, and the control that submits it. */
const COMPOSER_CLASSES = 'flex min-w-0 flex-col gap-2';

/** The field's label, in the secondary text role so the field itself carries the strongest contrast. */
const FIELD_LABEL_CLASSES = 'text-12 font-medium text-text-secondary';

/**
 * The field: role tokens only — the control radius, the control boundary, the first raised surface and
 * the type scale's 13 px in the primary text role. `min-h-6` is the 24x24 px minimum target of rule
 * B-3, `w-full` fills the panel it sits in, the focus ring is the 2 px focus-ring role drawn on
 * `focus-visible`, and the one colour transition is `motion-safe:` so a reduced-motion session gets the
 * hover with no transition. No shadow and no palette value exists in the token layer to add.
 */
const FIELD_CLASSES = [
  'block w-full min-h-6 rounded-control border border-control-boundary px-2 py-1',
  'bg-surface-1 text-13 text-text-primary hover:border-accent',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/**
 * The answer region and the pending announcement above it, one 4 px step apart.
 *
 * The region is a programmatic focus target rather than a control: it carries `tabIndex={-1}` at its
 * call site, so a question activated from the keyboard hands its focus to the answer it produced
 * rather than leaving it on the document's body, and it draws the theme's 2 px focus-ring role
 * whenever the focus it was handed is visible (rule B-3). Every value is a role token, so both themes
 * resolve their own measured ring, and no palette literal and no elevation is reachable from here.
 */
const ANSWER_REGION_CLASSES = [
  'flex min-w-0 flex-col gap-2',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
].join(' ');

/** The pending announcement's own line, in the secondary text role at the type scale's 13 px step. */
const PENDING_CLASSES = 'text-13 text-text-secondary';

/**
 * The composer's submit control keeps its own width rather than filling the column, so the primary
 * action reads as one button under the field it submits.
 */
const SUBMIT_CONTROL_CLASSES = 'self-start';

/* ---------------------------------------------------------------------------------------------
 * The two controls, each with one disabled branch (rule P-8)
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link QuestionControl}: one suggested question, offered as one control. */
interface QuestionControlProps {
  /** The question as the service published it, used verbatim as the control's label. */
  readonly prompt: string;

  /** What activating the control does: submit this question. */
  readonly onAsk: (prompt: string) => void;

  /** Why the control cannot act, or `null` when it can (rule P-8). */
  readonly blocker: string | null;
}

/**
 * One suggested question as a native button.
 *
 * `ActionButton` is the application's only control pattern, so this is a real `button`, keyboard
 * operable, with the shared focus ring and the 24x24 px minimum target — never a styled mark or a
 * clickable div. The prompt is the record's own text and is not retyped here.
 *
 * The two branches are written out because `ActionButtonProps` is a discriminated union: a `disabled`
 * flag held in a boolean cannot carry the reason the type requires, so the sentence cannot go missing
 * (rule P-8).
 */
function QuestionControl({ prompt, onAsk, blocker }: QuestionControlProps): ReactElement {
  if (blocker === null) {
    return (
      <ActionButton
        variant="secondary"
        onClick={() => {
          onAsk(prompt);
        }}
        className={QUESTION_CONTROL_CLASSES}
      >
        <span className={QUESTION_LABEL_CLASSES}>{prompt}</span>
      </ActionButton>
    );
  }

  return (
    <ActionButton
      variant="secondary"
      onClick={() => {
        onAsk(prompt);
      }}
      disabled
      disabledReason={blocker}
      className={QUESTION_CONTROL_CLASSES}
    >
      <span className={QUESTION_LABEL_CLASSES}>{prompt}</span>
    </ActionButton>
  );
}

/** Props of {@link SubmitControl}: the composer's one action, and why it cannot act. */
interface SubmitControlProps {
  /** Why the control cannot act, or `null` when it can (rule P-8). */
  readonly blocker: string | null;

  /** What activating the control does: submit the draft. */
  readonly onActivate: () => void;
}

/**
 * The composer's submit control: SCR-06's primary action, transcribed from AAP §0.12.4.
 *
 * The two branches are the same union rule as {@link QuestionControl}: a control that cannot act
 * carries its explanation by type, so no call site can render a dead button.
 */
function SubmitControl({ blocker, onActivate }: SubmitControlProps): ReactElement {
  if (blocker === null) {
    return (
      <ActionButton variant="primary" onClick={onActivate} className={SUBMIT_CONTROL_CLASSES}>
        {ASSISTANT_PANEL_TEXT.submitLabel}
      </ActionButton>
    );
  }

  return (
    <ActionButton
      variant="primary"
      onClick={onActivate}
      disabled
      disabledReason={blocker}
      className={SUBMIT_CONTROL_CLASSES}
    >
      {ASSISTANT_PANEL_TEXT.submitLabel}
    </ActionButton>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The presentational half — every state renderable from props, with no test hook
 * ------------------------------------------------------------------------------------------- */

/** The list a panel with no suggested question renders, held once so no empty array is rebuilt. */
const NO_QUESTIONS: readonly SuggestedQuestion[] = [];

/**
 * Props of {@link AssistantPanelBody}: everything the panel shows, and everything it can be asked to do.
 *
 * The presentational half receives the state the panel derived rather than a flag, so each of the seven
 * `ScreenState` renderings can be exercised directly. Every member a caller may reasonably leave out is
 * optional, including the handlers: a control whose handler was not supplied is not rendered at all,
 * because a control that can never act must not exist (rule P-8).
 */
export interface AssistantPanelBodyProps {
  /**
   * The state the panel's records are in, or `undefined` when no exceptional state holds.
   *
   * Typed from `../types` so the seven members keep exactly one definition in `ScreenState`; `undefined`
   * is the healthy case, because that union carries no well member (AAP §0.5.2, AAP §0.12.4).
   */
  readonly state: ScreenState | undefined;

  /** The composition the panel is mounted in. Defaults to `'page'`. */
  readonly variant?: AssistantPanelVariant | undefined;

  /** The questions the service published, in its own order. */
  readonly questions?: readonly SuggestedQuestion[] | undefined;

  /** The model catalogue the selector lists, or `undefined` while it has not arrived. */
  readonly catalogue?: ModelCatalogue | undefined;

  /** The identifier of the catalogue entry selected for the next question. */
  readonly selectedModelId?: string | undefined;

  /** The answer on screen, or `undefined` when none is. */
  readonly answer?: Answer | undefined;

  /** The refusal on screen, or `undefined` when the last question was answered. */
  readonly refusal?: Problem | undefined;

  /** The composer's current text. */
  readonly draft?: string | undefined;

  /** Whether a question is being answered, which disables every control that would ask another. */
  readonly isAsking?: boolean | undefined;

  /** What submitting a question does: the text, as the reader typed it or as the record states it. */
  readonly onAsk?: ((question: string) => void) | undefined;

  /** What a change in the composer's field does. */
  readonly onDraftChange?: ((value: string) => void) | undefined;

  /** What choosing a catalogue entry does. */
  readonly onSelectModel?: ((modelId: string) => void) | undefined;

  /** What the block card's one-click switch does: re-ask on the model the denying policy permits. */
  readonly onSwitchToInBoundary?: (() => void) | undefined;

  /** What a failed read's retry does. Absent, no retry control is rendered. */
  readonly onRetry?: (() => void) | undefined;

  /** What re-asking the last question does, for a refusal the card offers a retry beside. */
  readonly onRetryQuestion?: (() => void) | undefined;

  /** The caller's sentence for the empty state; the panel's own stands in when it is absent. */
  readonly emptyMessage?: string | undefined;

  /** The source behind a stale panel, which the banner names with its as-of time. */
  readonly stale?: StateBoundaryStale | undefined;

  /** The denial the forbidden card explains. */
  readonly forbidden?: StateBoundaryForbidden | undefined;
}

/**
 * Everything SCR-06 shows, rendered from props alone.
 *
 * The region is a named `section` (`Panel`'s caption is its accessible name), the questions are a real
 * list of real buttons, and the composer is a real form: pressing `Enter` in the field submits it and the
 * control beside the field does the same, so the whole flow is operable from the keyboard with the
 * document's own focus order and the theme's focus ring (rule B-3). Nothing animates, so a
 * reduced-motion session has nothing to opt out of.
 *
 * A QUESTION IN FLIGHT REPLACES THE CONTROL THAT ASKED IT. `ActionButton` renders a control that can act
 * as a bare `button` and one that cannot inside the explanation for why, so the moment a question is put
 * in flight the node that was activated leaves the document and focus would otherwise fall to the body,
 * with no ring on anything (rule B-3). The activation handlers therefore record what was focused before
 * the question is put, and the answer region — the one element that survives both the flight and its
 * outcome — takes that focus once the recorded node has gone. A node still in the document keeps the
 * focus it holds, so a question submitted from the composer's field never pulls the reader out of it.
 *
 * @param props - The state, the payloads, the reader's draft and the handlers. See
 *   {@link AssistantPanelBodyProps}.
 * @returns The named panel, with its state rendered by `StateBoundary` around the content.
 */
export function AssistantPanelBody(props: AssistantPanelBodyProps): ReactElement {
  const {
    state,
    variant = 'page',
    questions = NO_QUESTIONS,
    catalogue,
    selectedModelId = '',
    answer,
    refusal,
    draft = '',
    isAsking = false,
    onAsk,
    onDraftChange,
    onSelectModel,
    onSwitchToInBoundary,
    onRetry,
    onRetryQuestion,
    emptyMessage,
    stale,
    forbidden,
  } = props;

  const fieldId = useId();
  const captionId = useId();

  /*
   * The node a question is being asked from, recorded before the question is put because the render
   * that puts it in flight replaces it: a question control moves inside its own explanation the moment
   * `isAsking` turns true, and the composer's submit does the same when its blocker changes to the
   * in-flight reason. What the reader activated is therefore captured while it is still in the
   * document, and the effect below hands focus on only when it has left.
   */
  const activatedControlRef = useRef<Element | null>(null);

  /* The region that takes that focus: the answer, the pending announcement, or the refusal card. */
  const answerRegionRef = useRef<HTMLDivElement | null>(null);

  /* The one reason the composer's submit cannot act, in the order of condition precedence: a question
     already in flight outranks an empty draft, which outranks having no model to answer with. */
  const submitBlocker: string | null = isAsking
    ? ASSISTANT_PANEL_TEXT.askingBlocker
    : draft.trim().length === 0
      ? ASSISTANT_PANEL_TEXT.emptyDraftBlocker
      : selectedModelId.length === 0
        ? ASSISTANT_PANEL_TEXT.noModelBlocker
        : null;

  /* What activating a control of this panel does first: record the node it was activated from, so the
     render that replaces it cannot leave the reader's focus on the document's body (rule B-3). */
  const rememberActivatedControl = (): void => {
    activatedControlRef.current = document.activeElement;
  };

  const askDraft = (): void => {
    rememberActivatedControl();
    onAsk?.(draft);
  };

  /* `Enter` in the field reaches this handler, so the form is the keyboard path and the control beside
     the field is the pointer path; both submit through the same guard. */
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (submitBlocker === null) {
      askDraft();
    }
  };

  const handleDraftChange = (value: string): void => {
    onDraftChange?.(value);
  };

  const handleQuestion = (prompt: string): void => {
    rememberActivatedControl();
    onAsk?.(prompt);
  };

  /* The block card's two controls put a question as well, and the card they sit in leaves the document
     the moment one of them does — a question in flight clears the refusal it was reporting — so the
     same recording answers for them: the focus the card held is handed to the region that survives it,
     rather than falling to the document's body (rule B-3). */
  const switchToInBoundary = (): void => {
    rememberActivatedControl();
    onSwitchToInBoundary?.();
  };

  const retryQuestion = (): void => {
    rememberActivatedControl();
    onRetryQuestion?.();
  };

  /* The region is rendered from every outcome this panel can hold rather than from the pending state
     alone, because it is the focus target a keyboard activation is handed to: it has to survive the
     render that replaces the pending announcement with the answer, and the one that replaces it with a
     refusal a policy recorded, or the focus it took would leave the document with that announcement.
     A refusal settles with no answer beside it, so the card that reports it belongs inside the same
     region. The region still shows exactly one of the three at a time, so nothing moves on screen. */
  const showsAnswerRegion =
    isAsking || answer !== undefined || (refusal !== undefined && onSwitchToInBoundary !== undefined);

  /*
   * The focus hand-off, at the one render that can drop it. `isAsking` turning true is the render that
   * moves an activated question control inside its explanation, so the recorded node is judged here
   * rather than at activation: a node the document still holds — the composer's field, which submits
   * the form without being replaced — keeps the focus it has, and only a node this render removed hands
   * it to the answer region. The recording belongs to that one transition, so it is cleared on every
   * pass and a later render cannot read an activation that has already been answered.
   */
  useEffect(() => {
    const activated = activatedControlRef.current;

    activatedControlRef.current = null;

    if (!isAsking || activated === null || activated.isConnected) {
      return;
    }

    answerRegionRef.current?.focus();
  }, [isAsking]);

  /* The partial state's own sentence is the inputs the service reported missing, read from the answer
     rather than composed here (rule P-6): the banner then names what is absent instead of stating only
     that something is, and an answer that reported no missing input leaves the headline to stand
     alone. */
  const partialMessage =
    answer !== undefined && answer.missing.length > 0 ? answer.missing.join('; ') : undefined;

  return (
    <Panel label={ASSISTANT_PANEL_TEXT.regionLabel} className={PANEL_CLASSES}>
      <StateBoundary
        state={state}
        emptyMessage={emptyMessage ?? ASSISTANT_PANEL_TEXT.emptyFallback}
        partialMessage={partialMessage}
        onRetry={onRetry}
        stale={stale}
        forbidden={forbidden}
      >
        <div className={BODY_CLASSES[variant]}>
          {questions.length === 0 ? null : (
            <div className={GROUP_CLASSES}>
              <p id={captionId} className={CAPTION_CLASSES}>
                {ASSISTANT_PANEL_TEXT.questionsCaption}
              </p>
              <ul className={QUESTION_LIST_CLASSES} aria-labelledby={captionId}>
                {questions.map((question) => (
                  <li key={question.id} className={QUESTION_ITEM_CLASSES}>
                    <QuestionControl
                      prompt={question.prompt}
                      onAsk={handleQuestion}
                      blocker={isAsking ? ASSISTANT_PANEL_TEXT.askingBlocker : null}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onAsk !== undefined && onDraftChange !== undefined ? (
            <form className={COMPOSER_CLASSES} onSubmit={handleSubmit}>
              <label className={FIELD_LABEL_CLASSES} htmlFor={fieldId}>
                {ASSISTANT_PANEL_TEXT.composerLabel}
              </label>
              <TextField
                id={fieldId}
                className={FIELD_CLASSES}
                type="text"
                maxLength={FREE_TEXT_MAX_LENGTH}
                value={draft}
                onChange={handleDraftChange}
                autoComplete="off"
              />
              <SubmitControl blocker={submitBlocker} onActivate={askDraft} />
            </form>
          ) : null}

          {showsAnswerRegion ? (
            /* Focusable but not a control: `tabIndex={-1}` puts the region in the programmatic focus
               order only, so it adds no Tab stop and hands the answer to the keyboard activation that
               produced it (rule B-3). */
            <div ref={answerRegionRef} tabIndex={-1} className={ANSWER_REGION_CLASSES}>
              {isAsking ? (
                <p role="status" className={PENDING_CLASSES}>
                  {ASSISTANT_PANEL_TEXT.asking}
                </p>
              ) : null}
              {answer === undefined ? null : <AssistantAnswer answer={answer} />}

              {/* The refusal is the service's own record, rendered as data. It needs the switch to take
                  the model the denying policy permits; without that handler the card would offer a
                  control that cannot act, so it is not rendered at all (rule P-8). A refusal settles
                  with no answer beside it, so the card is the region's own content and the region the
                  reader's focus was handed to stays in the document as it arrives. */}
              {refusal === undefined || onSwitchToInBoundary === undefined ? null : (
                <PolicyBlockCard
                  problem={refusal}
                  onSwitchToInBoundary={switchToInBoundary}
                  onRetry={onRetryQuestion === undefined ? undefined : retryQuestion}
                />
              )}
            </div>
          ) : null}

          {/* The selector stays operable while a question is in flight: the choice applies to the next
              question, and the answer on screen names the model the service composed it with, so
              changing it mid-flight cannot mislabel the answer already shown. */}
          {catalogue !== undefined &&
          onSelectModel !== undefined &&
          selectedModelId.length > 0 ? (
            <ModelSelector
              catalogue={catalogue}
              selectedModelId={selectedModelId}
              onSelect={onSelectModel}
            />
          ) : null}
        </div>
      </StateBoundary>
    </Panel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The connected half — the port is the only data path (rule P-2)
 * ------------------------------------------------------------------------------------------- */

/**
 * One question the panel put to the service: the text the reader saw, and the model it was put to.
 *
 * Held so the block card's one-click switch and a failure's retry can repeat the same question on the
 * model the policy permits, without this file keeping a copy of any question text of its own.
 */
interface AskedQuestion {
  /** The question as it was submitted, already trimmed. */
  readonly question: string;

  /** The catalogue identifier the question was put to. */
  readonly modelId: string;
}

/**
 * Whether a failure is the model-boundary block, which records its refusal even though it answers nothing.
 *
 * A POL-007 block rejects with a `Problem` carrying the rule, the alternative it permits and the
 * `auditEventId` of the policy-actor event it appended before refusing (AAP §0.12.3, contracts §6). That
 * identifier is what tells the block from every other refusal this panel can meet — a permission the
 * matrix denies, an unscripted question, a validation — none of which appends anything.
 */
function isBlockedQuestion(thrown: unknown): thrown is Problem {
  return isProblem(thrown) && thrown.auditEventId !== undefined;
}

/**
 * The model the denying policy permits, resolved from the catalogue the selector was offered.
 *
 * `problem.permittedAlternative` names the alternative the rule permits — for the model-boundary policy
 * the catalogue's in-boundary entry (`src/domain/policy/evaluate.ts`, AAP §0.12.4) — and it is used when
 * the catalogue
 * holds that entry. Otherwise the catalogue's own `defaultModelId` is taken, which
 * `src/types/models.ts` documents as the in-boundary entry the selector starts on, so the switch lands
 * on a model the records declare rather than on an identifier this file invented.
 *
 * @param problem - The refusal on screen, or `undefined`.
 * @param catalogue - The catalogue the selector lists, or `undefined` while it has not arrived.
 * @returns The identifier to select and re-ask on, or an empty string when none can be resolved.
 */
function inBoundaryModelIdFor(
  problem: Problem | undefined,
  catalogue: ModelCatalogue | undefined,
): string {
  const alternative = problem?.permittedAlternative?.trim() ?? '';

  if (catalogue === undefined) {
    return alternative;
  }

  if (alternative.length > 0 && catalogue.models.some((entry) => entry.id === alternative)) {
    return alternative;
  }

  return catalogue.defaultModelId;
}

/**
 * Props of {@link AssistantPanel}.
 *
 * Every member is optional, so the panel renders with no props at all: the route can mount it as the
 * page body and the shell can mount it in a side region, and neither has to supply anything (AAP
 * §0.12.4). The members are typed `| undefined` as well as optional so a caller forwarding a value it
 * may not have — a route parameter, a shell selection — passes `undefined` rather than omitting the
 * property.
 */
export interface AssistantPanelProps {
  /**
   * Where the panel is mounted. `'page'` is the route's body and the default; `'aside'` is the compact
   * surface of the shell's side region. Both carry the same content and neither renders a page heading,
   * which belongs to the screen wrapper.
   */
  readonly variant?: AssistantPanelVariant | undefined;

  /**
   * The shell's plant and product selection.
   *
   * The assistant's three reads take no scope: the adapter applies the acting role's own reach before it
   * answers, and no member of the port accepts a selection. The member therefore exists so the shell can
   * pass one set of props to every screen and this panel deliberately does not forward it, because
   * widening a read would put a second reach rule beside the adapter's (rule P-2).
   */
  readonly scope?: Scope | undefined;

  /**
   * The identifier of a suggested question to place in the composer before the reader asks anything.
   *
   * Resolved against the questions the service published, so the prompt is the record's own text. An
   * identifier the service does not know leaves the composer empty rather than inventing a question.
   */
  readonly initialQuestionId?: string | undefined;
}

/**
 * SCR-06's data-connected panel.
 *
 * Three calls, all through the port: `listSuggestedQuestions` and `getModelCatalogue` as reads keyed by
 * the method's own name, and `askAssistant` as one mutation that invalidates the reads
 * `WRITE_READS.askAssistant` names once it settles — on an answer, and on a POL-007 block too, because a
 * block records its refusal even though it answers nothing. The chosen model, the reader's draft and the
 * last question asked are the only state this component owns; nothing it renders is derived from a
 * figure, formatted here or read from a clock.
 *
 * The settled facts decide the panel's state in one place ({@link deriveScreenState}) and the body
 * renders it, which is why a policy block replaces neither the questions nor the composer: a refused
 * question is one question's outcome, not a screen state.
 *
 * @param props - The variant, the shell's selection and an optional question to preselect. See
 *   {@link AssistantPanelProps}.
 * @returns The presentational panel, handed the payloads, the draft and the handlers it renders.
 */
export function AssistantPanel({
  variant = 'page',
  initialQuestionId,
}: AssistantPanelProps): ReactElement {
  const service = useService();
  const queryClient = useQueryClient();

  const [typedDraft, setTypedDraft] = useState<string | null>(null);
  const [chosenModelId, setChosenModelId] = useState<string | null>(null);
  const [lastAsked, setLastAsked] = useState<AskedQuestion | null>(null);

  /**
   * Marks the reads a question moved for re-reading through the port.
   *
   * The row is `WRITE_READS.askAssistant`, the one write-reads map in `src/services/write-reads.ts`, so
   * the reads this panel refreshes are the reads the cache's own invalidation names: the evidence a
   * citation resolves to, the trail the question appended to, and the sovereignty payload whose ledger
   * counts a block against the endpoint it names (AAP §0.6.2, AAP §0.12.3).
   */
  const invalidateQuestionReads = (): void => {
    for (const read of WRITE_READS.askAssistant) {
      void queryClient.invalidateQueries({ queryKey: [read] });
    }
  };

  /* Retries are off on purpose: a refusal the matrix produces fails the same way however often it is
     repeated, and the boundary offers the reader an explicit retry for the case where repeating the
     call can succeed. */
  const questionsQuery = useQuery<Result<SuggestedQuestion[]>, unknown>({
    queryKey: ['listSuggestedQuestions'],
    queryFn: () => service.listSuggestedQuestions(),
    retry: false,
  });

  const catalogueQuery = useQuery<Result<ModelCatalogue>, unknown>({
    queryKey: ['getModelCatalogue'],
    queryFn: () => service.getModelCatalogue(),
    retry: false,
  });

  const askMutation = useMutation<Result<Answer>, unknown, AskedQuestion>({
    mutationFn: (asked) =>
      /* No context references are supplied: the adapter derives what a question runs over from the
         record the question names, so a reference list built here would be this file choosing records
         (rule P-2). */
      service.askAssistant({
        question: asked.question,
        modelId: asked.modelId,
        contextRefs: [],
      }),
    onSuccess: () => {
      invalidateQuestionReads();
    },
    onError: (error: unknown) => {
      /* A block answers nothing but records its refusal, so the reads it moved are re-read here as well:
         the trail gained the policy-actor event and the sovereignty ledger counts it against the
         endpoint the event names (AAP §0.12.3, AAP §0.6.2). */
      if (isBlockedQuestion(error)) {
        invalidateQuestionReads();
      }
    },
  });

  const questions = questionsQuery.data?.data ?? NO_QUESTIONS;
  const catalogue = catalogueQuery.data?.data;
  const selectedModelId = chosenModelId ?? catalogue?.defaultModelId ?? '';
  const readError = questionsQuery.error ?? catalogueQuery.error;

  /* Only the outcome of the latest question is shown: React Query keeps the last payload while a new
     call is in flight and after one fails, so a previous answer is not left standing beside a refusal
     that replaced it. */
  const answer = askMutation.isSuccess ? askMutation.data.data : undefined;
  const refusal = askMutation.isError && isProblem(askMutation.error) ? askMutation.error : undefined;

  /*
   * The reads' own facts, plus this screen's reading of its payload. The panel carries no gate of its
   * own, so the stale notice names the first aged source the report lists rather than one chosen here;
   * the partial state comes from the reads, because an answer's own gap belongs beside the sentence it
   * qualifies rather than in a screen-wide warning. The panel has something to show exactly when the
   * question read returned a question, and nothing else counts: every answer this panel holds is
   * composed from those questions' records, so a read that reports none means the screen is empty —
   * which is what the simulation's `empty` trigger produces, "every read whose payload is a collection
   * answers with nothing to show" (AAP 0.2.1 F10, AAP 0.12.1). The last composed answer is a record of
   * a question the emptied read no longer supports, so it cannot keep the composer, the answer and the
   * selector on screen beside an empty screen.
   */
  const state = deriveScreenState({
    isPending: questionsQuery.isPending || catalogueQuery.isPending,
    error: readError,
    freshness: questionsQuery.data?.meta.freshness,
    hasContent: questions.length > 0,
  });

  const stale =
    questionsQuery.data === undefined ? undefined : staleSourceOf(questionsQuery.data.meta.freshness);
  const forbidden = forbiddenOf(readError);

  /* The preselected question is resolved from the published list rather than typed, and the reader's own
     editing takes over from the moment the field changes. */
  const initialDraft =
    initialQuestionId === undefined
      ? ''
      : (questions.find((question) => question.id === initialQuestionId)?.prompt ?? '');
  const draft = typedDraft ?? initialDraft;

  const ask = (question: string, modelId: string): void => {
    const trimmed = question.trim();

    /* Nothing to ask, or no model to ask it of: the interface disables both controls in that state, so
       this guard is the one that keeps a bypassed control from reaching the port. */
    if (trimmed.length === 0 || modelId.length === 0) {
      return;
    }

    const asked: AskedQuestion = { question: trimmed, modelId };
    setLastAsked(asked);
    askMutation.mutate(asked);
  };

  const handleAsk = (question: string): void => {
    setTypedDraft(question);
    ask(question, selectedModelId);
  };

  const handleDraftChange = (value: string): void => {
    setTypedDraft(value);
  };

  const handleSelectModel = (modelId: string): void => {
    setChosenModelId(modelId);
  };

  const handleSwitchToInBoundary = (): void => {
    const modelId = inBoundaryModelIdFor(refusal, catalogue);

    if (modelId.length === 0) {
      return;
    }

    setChosenModelId(modelId);

    if (lastAsked !== null) {
      ask(lastAsked.question, modelId);
    }
  };

  const handleRetry = (): void => {
    void questionsQuery.refetch();
    void catalogueQuery.refetch();
  };

  const handleRetryQuestion =
    lastAsked === null
      ? undefined
      : (): void => {
          ask(lastAsked.question, lastAsked.modelId);
        };

  return (
    <AssistantPanelBody
      variant={variant}
      state={state}
      questions={questions}
      catalogue={catalogue}
      selectedModelId={selectedModelId}
      answer={answer}
      refusal={refusal}
      draft={draft}
      isAsking={askMutation.isPending}
      onAsk={handleAsk}
      onDraftChange={handleDraftChange}
      onSelectModel={handleSelectModel}
      onSwitchToInBoundary={handleSwitchToInBoundary}
      onRetry={handleRetry}
      onRetryQuestion={handleRetryQuestion}
      stale={stale}
      forbidden={forbidden}
    />
  );
}
