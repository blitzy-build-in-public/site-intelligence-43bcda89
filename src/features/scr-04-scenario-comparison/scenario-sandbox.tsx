/**
 * The scenario sandbox: the control on the SCR-04 comparison screen that duplicates one option and
 * measures the duplicate again at the lever values a reader types.
 *
 * WHAT IS DELEGATED AND WHAT IS NOT. The measurement is the service's, never this file's. The
 * sandbox sends the two lever values to `solveScenario` — contracts §9's
 * `POST /exceptions/{id}/scenarios/solve`, which AAP 0.12.3 assigns to this control — and renders
 * the `Scenario` that comes back. The pure `solve-supply-delay.ts` function (contracts §4 rules 1 to
 * 11) is the only place a measure is computed, the mock adapter composes it, and this component
 * neither imports nor reimplements either of them (AAP 0.12.1). There is no local clamp, no local
 * sum, no local "what would happen", no unit conversion and no formatting rule of any kind: money
 * leaves here through `MonoValue kind="money"`, the application's one money formatter, and every
 * count is rendered as the record's own number (rule P-6).
 *
 * A BREACH IS NOT A FAILED CALL. A lever outside its bound comes back as a `Scenario` whose
 * `constraintCheck` is `'fail'` with one message per breach, not as a `Problem` (AAP 0.12.3,
 * AAP 0.12.2). That option renders {@link CANNOT_COMPUTE_LABEL} — imported from `./comparison-matrix`
 * rather than retyped — with the record's own `constraintMessages` and no figure at all: no `NaN`,
 * no substituted zero, no blank cell (AAP §0.8). A `Problem` is the other path: a permission, a
 * policy, a validation refusal or a cause the service names, printed with its own sentence and its
 * trace identifier, with one retry that repeats the call and nothing else. A permission refusal
 * offers no retry, because repeating a call the acting role may not make would be a control that
 * cannot act (rule P-8).
 *
 * ONE REQUEST PER BURST. A lever edit schedules one request {@link SANDBOX_RECOMPUTE_DELAY_MS}
 * later, so a burst of edits inside that window collapses into a single call and a further edit
 * after it produces exactly one more (AAP 0.18.1: the query cache is not asked to deduplicate a
 * mutation). `Enter` inside either field cancels the pending request and issues one immediately, so
 * the control is fully keyboard-operated and the delay never becomes a timing a keyboard user has
 * to wait out. The pending timer is cleared when the option under edit changes and when the
 * component unmounts, so no request fires into a component that is no longer there; a settled
 * response is adopted only when it belongs to the newest request for the option still in the
 * register, so a slow answer can never overwrite a newer measurement or land under a different
 * option.
 *
 * WHY THE OUTCOME IS LOCAL STATE AND NOT A QUERY-CACHE MUTATION. The sandbox's result is its own
 * last measurement of a draft, not a record the rest of the screen reads, and AAP 0.18.1 forbids an
 * effect that loads data — this component has no such effect at all: the request is raised from the
 * reader's own edit, timer and key handlers. The settled `Scenario` is therefore held beside the
 * draft and handed to the caller through `onRecomputed`, so the screen that owns the
 * `getScenarioSet` read decides what to refresh and what to show alongside its columns. That keeps
 * this file free of a second data path (rule P-2) and of a second cache.
 *
 * WHAT IT SAYS ABOUT ITSELF. Every measure carries the specification §5.3 label `Simulated
 * calculation` on itself, through `StatusIndicator` with `meaning="simulated"`, because each one is a
 * computed figure — a page-level badge does not label an individual figure (rule P-1). Every measure
 * also opens its evidence: its value is rendered inside the shared `EvidenceRef`, carrying the
 * identifier of the option the sandbox duplicates — the record whose case, levers and confidence
 * produced every figure here, and the reference the comparison matrix's cells carry for the same
 * measures — so a reader reaches the drawer from the figure itself rather than from a control beside
 * the block, and the drawer opens on a record the service answers (AAP §0.12.4, §0.5.2, F12). The
 * name the duplicate itself carries is the measurement's, and a reference to it would name nothing:
 * {@link MeasuredRegionProps} states why. The panel's own sentence names what the
 * control does and what it does not: the values are measured here, and choosing them automatically
 * is the optimisation service's work, which the pilot brings. Nothing in this file claims that a
 * measurement is an outcome, that anything was verified, that the reader's data is confined or that
 * the record cannot be altered (rule P-4).
 *
 * ACCESSIBILITY. Two labelled number fields composed through `TextField` inside a named `<fieldset>`
 * (rule B-3), each with a visible label, a 24x24 px minimum target, the 2 px
 * `--color-focus-ring` indicator on
 * `:focus-visible`, and `Enter` submitting the recompute from inside either field. Each field is
 * described by the group's own sentences — the rule its values are held to, then the case's bound
 * statements where the option set records them — and, last, a field holding something that is not a
 * number is marked `aria-invalid` and described by the visible sentence that says so. An
 * assistive-technology user therefore hears the bound with the field rather than learning it from a
 * refusal, and the recompute control explains in text why it cannot act. Every outcome is written into
 * a `role="status"` region with `aria-live="polite"`, so a screen-reader or keyboard user learns
 * that a recomputation started and what it produced, without a pointer and without a timeout to
 * chase. No meaning rests on colour alone: a status carries its icon and its word, and the computed
 * figures carry their label as text.
 *
 * NOTHING HERE REACHES OUT. The only data path is `useService()` (rule P-2): no seed module, no
 * adapter, no HTTP client, no domain module. Colours, type sizes, radii and spacing are role tokens of
 * `src/theme/tokens.css`, so both themes render without a theme-aware branch and no shadow is
 * available to select (rules B-1, B-3). No credential and no environment read appears in the file
 * (rule B-2), and no wording names a company, a customer, a carmaker or a cloud product (rule P-7).
 *
 * THE LEVER BOUNDS ARE NOT REACHABLE AS AN ATTRIBUTE, SO THE PANEL STATES THEM IN WORDS. A
 * `LeverConstraint` (a maximum and a step) sits on `SolverCase`, and no member of the port's scenario
 * reads — neither `getScenarioSet` nor `solveScenario` — carries one, so this component states no
 * `min`, `max` or `step` on its inputs rather than typing a bound of its own: a bound typed here would
 * be a second, unchecked one and a figure no record states (rule P-6). What the records do state is
 * what the panel publishes. The rule itself is `SCENARIO_SANDBOX_TEXT`'s `leverBoundsRule` sentence,
 * rendered above the fields and describing both of them, and the case's own bound statements — the
 * constraint messages of the option set's failed option, which name that case's maximum and its step —
 * arrive in `caseBoundStatements` from the screen that read the set, and are rendered there verbatim
 * and carried as the fields' description beside that rule. A reader therefore learns a bound before
 * typing instead of only from a refused measurement. Nothing about the enforcement moves: the solver
 * applies the bounds and reports every breach in `constraintMessages`, which is what the reader sees,
 * and a field left unbounded is what keeps a breach demonstrable at all (AAP 0.12.3).
 *
 * THE INPUTS ARE COMPOSED, NOT WRITTEN HERE. AAP 0.5.2 gives a raw `<input>` to the component that
 * owns it, and `TextField` in `src/components` is that owner for a single-line field: it renders the
 * platform's number input and owns its type, its controlled value and its change contract, which
 * reports the field's new text as one string rather than the DOM event. Every native prop this panel
 * needs — the `id` the label is bound to, the two `aria-*` attributes and the `Enter` handler — is
 * forwarded by the primitive untouched. This file therefore composes it with the token-built class
 * list {@link INPUT_CLASSES} declares instead of rendering the element itself, and the lever bounds
 * stay where the solver enforces them: no bound is typed here, and the only thing the panel publishes
 * about them is the records' own wording.
 */
import { useEffect, useId, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
  ReactNode,
} from 'react';

import { EvidenceRef } from '../../components/evidence-drawer';
import { MonoValue } from '../../components/mono-value';
import { Panel } from '../../components/panel';
import { StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { TextField } from '../../components/text-field';
import { ActionButton } from '../../components/tooltip';
import { useService } from '../../services/service-provider';
import { SIM_LABELS } from '../../types';
import type {
  ConstraintCheck,
  ExceptionId,
  Levers,
  Problem,
  Scenario,
  ScenarioId,
  SimLabel,
} from '../../types';
import {
  CANNOT_COMPUTE_LABEL,
  COMPARISON_MATRIX_TEXT,
  CONFIDENCE_PRESENTATION,
} from './comparison-matrix';

/* ---------------------------------------------------------------------------------------------
 * The one timing, exported so the suite advances it instead of duplicating it
 * ------------------------------------------------------------------------------------------- */

/**
 * How long a lever edit waits before it is sent to the service.
 *
 * The value collapses a burst of edits — typing a three-digit count raises three change events — into
 * one call, which is what keeps the recompute off every keystroke without ever leaving the reader
 * waiting for a spinner they did not cause. It is exported so the component's suite advances fake
 * timers by this constant rather than by a number of its own: a change of the delay then moves the
 * suite with it instead of breaking it.
 */
export const SANDBOX_RECOMPUTE_DELAY_MS = 300;

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this component states itself, held here so its wording has one owner.
 *
 * None of them is a specification string: the fixed §5.3 simulation labels are read from
 * `SIM_LABELS` at their own positions, `Cannot compute` is imported from the comparison matrix, and
 * the measure names are the matrix's own rows. What is written here is this surface's own vocabulary
 * — the panel's caption, the sentence explaining what the control measures, the sentence naming what a
 * measure's evidence opens, the lever group's name, the three reasons a control cannot act, the two
 * states of an outcome, and the two field labels of a refusal. None carries a figure, an amount, a date
 * or a record identifier (rule P-6), and none claims a capability the demonstration does not implement
 * (rule P-4).
 */
export const SCENARIO_SANDBOX_TEXT = {
  /** The panel's caption: what the block does, named in the caption text role. */
  panelLabel: 'Recompute an option',

  /**
   * What the control measures, and what it does not. The second sentence names the fix that would
   * replace the reader's own input, so the control never reads as a live optimisation service.
   */
  note: 'Measures a duplicate of the selected option at the lever values below, from the exception’s own solver case. Choosing those values automatically arrives with the optimisation service in the pilot.',

  /**
   * What a measure's evidence trigger opens. The duplicate is a measurement the service holds no
   * record of, while the option it was measured from is one the records state, so the trigger names
   * that option: a reader who follows a figure to its evidence reaches a record, the rule that
   * computes it and the inputs behind it, rather than a reference nothing answers.
   */
  evidenceSubject:
    'Each measure above opens the evidence of the option this duplicate is measured from: its record, ' +
    'the rule that computes it and the inputs it was measured with.',

  /** The name of the group of lever fields. */
  legend: 'Lever values',

  /**
   * The rule the case holds every lever to, stated before a value is typed rather than only after a
   * measurement is refused.
   *
   * It carries no figure, no amount and no record identifier (rule P-6): the case's own numbers arrive
   * from the records, in {@link ScenarioSandboxProps.caseBoundStatements}, exactly as the option set
   * states them. That is what keeps one sentence right for every case, and it is why this one names
   * the rule instead of a bound.
   */
  leverBoundsRule:
    'Each lever is held to the exception case’s own maximum and step: a value above that maximum, ' +
    'below zero or between two steps is refused, and the refusal names that lever’s maximum and step.',

  /** The recompute control's visible label. */
  recomputeLabel: 'Recompute measures',

  /** The retry control shown beside a failure the service reported. */
  retryLabel: 'Recompute the measures again',

  /** Shown while a request is in flight, inside the live region. */
  inFlight: 'Recomputing the measures.',

  /** The reason the control cannot act while a request is already in flight. */
  alreadyRunning: 'A recomputation is already running, and its measures follow when it settles.',

  /** The region's resting sentence, before any measurement has been taken. */
  idle: 'No measurement yet.',

  /** The state of a sandbox with nothing to duplicate. */
  noOption: 'No option is selected, so there is nothing to duplicate.',

  /** The heading a refusal opens with. */
  failureLabel: 'Recomputation failed',

  /** The sentence used when a call stopped for a cause that did not arrive as a `Problem`. */
  unreported: 'The recomputation stopped without reporting a cause.',

  /** The label the correlation identifier is printed under. */
  traceLabel: 'Trace',

  /** The label a missing permission is printed under. */
  permissionLabel: 'Permission required',

  /** The label the roles that hold that permission are printed under. */
  rolesLabel: 'Roles that may act',

  /**
   * Why a permission refusal carries no retry control: repeating the call would be refused again.
   */
  permissionNoRetry: 'Retrying as the acting role would be refused again, so this state offers no retry.',
} as const;

/**
 * The label every measure in this component carries: specification §5.3's `Simulated calculation`,
 * read from the tuple that holds the seven fixed labels at the position §5.3 gives it.
 *
 * Typed `SimLabel`, so a paraphrase cannot compile, and read rather than retyped, so this surface
 * cannot drift from the matrix, the tiles or any other place a computed figure is shown (rule P-1).
 */
const CALCULATED_SIM_LABEL: SimLabel = SIM_LABELS[1];

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The panel's content column: one vertical rhythm for the note, the fields, the action and the outcome. */
const STACK_CLASSES = 'flex min-w-0 flex-col gap-3';

/** A tighter column, for the parts of one outcome that belong together. */
const STACK_TIGHT_CLASSES = 'flex min-w-0 flex-col items-start gap-1';

/** A sentence in the secondary text role: the note, a reason, a measurement's own caption. */
const NOTE_CLASSES = 'min-w-0 text-12 break-words text-text-secondary';

/** The `<fieldset>` is the group's box in the panel; it adds no surface of its own. */
const FIELD_SET_CLASSES = 'min-w-0';

/** The legend names the group and sits in the caption text role above the controls. */
const LEGEND_CLASSES = 'mb-1 p-0 text-12 font-medium text-text-secondary';

/**
 * The sentences the group states about its own bounds, above the fields they describe: one vertical
 * rhythm for the rule and the case's own statements, and one step of separation from the inputs.
 */
const HINT_STACK_CLASSES = 'mb-2 flex min-w-0 flex-col gap-1';

/** The lever fields, side by side and wrapping on a narrow panel. */
const INPUT_ROW_CLASSES = 'flex flex-wrap items-end gap-3';

/** One field: its label above its input. */
const FIELD_CLASSES = 'flex min-w-0 flex-col gap-1';

/**
 * A lever's label: the contract's own field name in the mono face, because the name a reader sees is
 * the name the record declares and the service reads. No friendlier wording is invented for it.
 */
const LABEL_CLASSES = 'font-mono text-12 text-text-caption';

/**
 * The number input: role tokens only — `rounded-control` for the 2 px radius,
 * `--color-control-boundary` for its edge, the first raised surface behind it, and the type scale's
 * 13 px in the primary text role with tabular figures so a count reads like every other figure in
 * the product.
 *
 * `min-h-6` is the 24x24 px target rule B-3 sets, and the focus ring is the 2 px
 * `--color-focus-ring` role drawn on `focus-visible`, so a pointer click leaves none behind while a
 * keyboard user never loses the indicator. The pointer is answered as well: `hover:` lifts the
 * boundary to the accent role, the same state the shared secondary control carries. No raw palette
 * value, no arbitrary value and no opacity appears here, because dimming a label is exactly how
 * contrast falls below the ratio rule B-3 requires. `motion-safe:` gates the colour transition, so a
 * reduced-motion session gets the same hover with no transition.
 */
const INPUT_CLASSES = [
  'block w-24 min-h-6 rounded-control border border-control-boundary px-2 py-1',
  'bg-surface-1 font-mono text-13 tabular-nums text-text-primary hover:border-accent',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/** The row holding the recompute control. */
const ACTIONS_CLASSES = 'flex flex-wrap items-center gap-2';

/**
 * The live region: separated from the controls above it by the decorative hairline, so the outcome a
 * reader hears is also the outcome they see in its own block.
 */
const REGION_CLASSES = 'flex min-w-0 flex-col gap-2 border-t border-hairline pt-3';

/** The recomputed option's identity: its identifier in the mono face, then its own name. */
const RESULT_HEADER_CLASSES = 'flex min-w-0 flex-wrap items-baseline gap-2 text-13 text-text-primary';

/** The measure list: one row per measure, each row laid out as its name and its value. */
const MEASURE_LIST_CLASSES = 'flex min-w-0 flex-col gap-2';

/** One measure row. It wraps rather than overflowing a narrow panel. */
const MEASURE_ROW_CLASSES = 'flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1';

/** A measure's name, in the secondary text role so it recedes behind the value. */
const MEASURE_LABEL_CLASSES = 'text-13 text-text-secondary';

/** A measure's value with its simulation label beside it. */
const MEASURE_VALUE_CLASSES = 'flex min-w-0 flex-wrap items-baseline gap-2 text-13 text-text-primary';

/** The confidence's reason, one step down the type scale from the status stating its level. */
const CONFIDENCE_REASON_CLASSES = 'min-w-0 text-12 break-words text-text-secondary';

/** A refusal's message, and the list of constraint messages a failed option states. */
const MESSAGE_CLASSES = 'min-w-0 text-13 break-words text-text-primary';
const MESSAGE_LIST_CLASSES = 'flex min-w-0 flex-col gap-1 text-12 text-text-secondary';

/* ---------------------------------------------------------------------------------------------
 * The lever fields, and the draft the reader edits
 * ------------------------------------------------------------------------------------------- */

/**
 * The lever fields the sandbox offers, in the order it renders them: the contract's own member names
 * on `Levers`, which are also the accessible names their inputs carry.
 *
 * A field name is not a figure, an amount or a record identifier, so nothing here needs a record to
 * state it. The keys are typed against `Levers`, and {@link draftOf} and {@link parseLevers} build
 * their objects exhaustively, so a lever added to that type fails to compile until it is offered here
 * too rather than being silently left out of the control.
 */
const LEVER_FIELDS: readonly (keyof Levers)[] = ['airSets', 'transferSets'];

/**
 * The lever values as the reader is typing them: one string per lever, exactly as the input's value
 * carries them.
 *
 * The draft is held as text rather than as numbers because a field can legitimately be empty or hold
 * something that is not a number while the reader is between keystrokes, and a numeric draft would
 * have to turn that into a number — which is the silent substitution rule P-6 forbids. Nothing is
 * computed from these strings: they are parsed once, only to be sent, and a field that does not parse
 * disables the control with a visible reason instead of being coerced.
 */
type LeverDraft = Record<keyof Levers, string>;

/**
 * One option's draft, tagged with the option it was edited from.
 *
 * The tag is what lets the draft reset when the reader selects a different option without an effect:
 * a draft that belongs to another option is ignored and the new option's own levers seed the fields.
 */
interface LeverDraftState {
  readonly scenarioId: ScenarioId;
  readonly values: LeverDraft;
}

/** A draft parsed into the values the port will accept, or the field that stopped it. */
type ParsedLevers =
  | { readonly ok: true; readonly levers: Levers }
  | { readonly ok: false; readonly field: keyof Levers };

/**
 * The settled failure of the last call, as the sandbox reports it.
 *
 * `problem` is the service's own `Problem` when the call failed in that shape, and `null` when the
 * rejection carried none — a cause the component does not know and therefore does not invent.
 */
interface SandboxFailure {
  readonly problem: Problem | null;
}

/**
 * The draft one option starts from, or the one already being edited for it.
 *
 * The seeded text is the record's own lever value written out, not a formatted figure: a number input
 * holds a plain string, and no presentation rule applies to a value the reader is about to change.
 */
function draftOf(state: LeverDraftState | null, option: Scenario): LeverDraft {
  if (state !== null && state.scenarioId === option.id) {
    return state.values;
  }

  return {
    airSets: String(option.levers.airSets),
    transferSets: String(option.levers.transferSets),
  };
}

/**
 * Turns one field's text into the value the port takes, or `null` when it is not a number.
 *
 * This is input validation at the boundary where the text enters the component, not a computation:
 * the text is trimmed, an empty field is refused rather than read as zero, and only a finite value
 * passes. No bound is applied — the contract's own bounds belong to the solver's constraint check,
 * and clamping here would hide the breach the reader is entitled to see reported.
 */
function toLeverValue(text: string): number | null {
  const trimmed = text.trim();

  if (trimmed === '') {
    return null;
  }

  const value = Number(trimmed);

  return Number.isFinite(value) ? value : null;
}

/**
 * Parses both levers, or names the first field that is not a number.
 *
 * Both members are read before the result is returned, so the object handed to the port is exactly a
 * `Levers` value and carries nothing else: no identifier, no field derived from another and no
 * default the record did not state (AAP 0.12.2).
 */
function parseLevers(draft: LeverDraft): ParsedLevers {
  const airSets = toLeverValue(draft.airSets);

  if (airSets === null) {
    return { ok: false, field: 'airSets' };
  }

  const transferSets = toLeverValue(draft.transferSets);

  if (transferSets === null) {
    return { ok: false, field: 'transferSets' };
  }

  return { ok: true, levers: { airSets, transferSets } };
}

/**
 * The sentence a field that is not a number is described by, and the reason the control cannot act.
 *
 * One function, so the visible description and the disabled control's reason are the same words: a
 * reader who arrives at either one is told which field to fix, and rule P-8's explanation cannot say
 * something else than the field's own description.
 */
export function invalidLeverText(field: keyof Levers): string {
  return `Enter a number for ${field} to recompute the measures.`;
}

/**
 * The sentence naming the lever values a measurement was taken at.
 *
 * The result carries the `levers` it was measured under, so the block states them: a reader who has
 * edited a field since the last measurement can see which values the figures beside it belong to,
 * rather than having to assume they match what the inputs now hold. Every word of the value is the
 * record's own number written out, and the field names are the contract's.
 */
export function measuredAtText(levers: Levers): string {
  const stated = LEVER_FIELDS.map((field) => `${field} ${String(levers[field])}`).join(', ');

  return `Measured at ${stated}.`;
}

/* ---------------------------------------------------------------------------------------------
 * The service's failure, recovered from the value a rejected call was handed
 * ------------------------------------------------------------------------------------------- */

/**
 * Decides whether a value names one of the causes `Problem.type` distinguishes.
 *
 * Written as a chain of comparisons rather than as a membership test on a list, so the narrowing is a
 * type guard the compiler accepts without a cast: `src/types/service.ts` declares the five members,
 * and a member added there fails to compile here until it is named.
 */
function isProblemType(value: unknown): value is Problem['type'] {
  return (
    value === 'permission' ||
    value === 'policy' ||
    value === 'validation' ||
    value === 'simulated-write-back' ||
    value === 'not-found'
  );
}

/**
 * The service's failure, recovered from the value a rejected promise was handed.
 *
 * A call fails by throwing its `Problem` (contracts §2), and the sandbox catches that same value as
 * `unknown`. The three members every failure carries are checked before the value is treated as one,
 * so a rejection that is not a `Problem` — a defect rather than a refusal — is never printed as
 * though it were one: it reaches the failure region with no problem at all, which says the call
 * stopped and prints no member of a failure nobody raised.
 */
function asProblem(error: unknown): Problem | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  if (!('type' in error) || !('message' in error) || !('traceId' in error)) {
    return null;
  }

  if (!isProblemType(error.type)) {
    return null;
  }

  if (typeof error.message !== 'string' || typeof error.traceId !== 'string') {
    return null;
  }

  /* The three members every failure carries are checked above, and the cause is one the union names,
     so the value is the service's own `Problem` — the same narrowing `evidence-drawer.tsx` performs
     for the value a rejected query hands it. The optional members travel with it untouched. */
  return error as Problem;
}

/* ---------------------------------------------------------------------------------------------
 * How a constraint check is presented
 * ------------------------------------------------------------------------------------------- */

/** One state of the record's `ConstraintCheck`: the shared status meaning, and the word beside it. */
interface ConstraintPresentation {
  /** The shared status meaning, selecting the icon and the status colour role. */
  readonly meaning: StatusMeaning;
  /** The visible word beside the icon, and the status's accessible name. */
  readonly label: string;
}

/**
 * The presentation of each `ConstraintCheck`, read from the comparison matrix's own words so a check
 * says the same thing in this panel as it does in the option's column.
 *
 * Exhaustive over the union and without an index signature, so a third state fails to compile rather
 * than falling back to whichever entry happened to be listed first.
 */
const CONSTRAINT_PRESENTATION: Record<ConstraintCheck, ConstraintPresentation> = {
  pass: { meaning: 'pass', label: COMPARISON_MATRIX_TEXT.constraint.pass },
  fail: { meaning: 'fail', label: COMPARISON_MATRIX_TEXT.constraint.fail },
};


/* ---------------------------------------------------------------------------------------------
 * The measures a recomputation reports, in the matrix's own order and words
 * ------------------------------------------------------------------------------------------- */

/** One measure: the name it is shown under, and how its value is drawn from the record. */
interface MeasureRow {
  /** Stable row id, used as the React key. */
  readonly id: string;
  /** The visible measure name, taken from the comparison matrix so both surfaces say the same. */
  readonly label: string;
  /**
   * How the measure is drawn: it reads the record's field and computes and formats nothing. The figure
   * it returns is what {@link MeasureList} wraps in the row's evidence trigger, so the trigger carries
   * one reference for all seven rows instead of each row naming its own.
   */
  readonly render: (scenario: Scenario) => ReactNode;
}

/**
 * The measures one recomputed option reports, in the comparison matrix's own order and under its own
 * names: units late, maximum days late, orders on time, added cost, line idle days, confidence and
 * the constraint check.
 *
 * AAP §0.12.4's SCR-04 row gives the sandbox "every measure at once", and this list is the part of
 * the matrix's eight rows that a single measurement states on its own: the side-effect row is what
 * the option costs a record that is not the one being rescued, which the matrix shows in full and
 * which this panel leaves to the column the caller adds from `onRecomputed`. Each row reads exactly
 * the `Scenario` member that states it — money through the application's one money formatter, every
 * count as the record's own number with no rounding and no unit conversion (rule P-6). The confidence
 * row draws its level as the status the matrix's {@link CONFIDENCE_PRESENTATION} makes of it, so one
 * level reads the same here as it does in the column beside this panel (AAP §0.5.2, rule B-3).
 *
 * Every figure a row draws is wrapped in the evidence trigger by {@link MeasureList}, with the
 * duplicated option's reference, because each of them is a computed figure and every figure on screen
 * opens its evidence (AAP §0.12.4, F12).
 */
const MEASURE_ROWS: readonly MeasureRow[] = [
  {
    id: 'units-late',
    label: COMPARISON_MATRIX_TEXT.rows.unitsLate,
    render: (scenario) => scenario.unitsLate,
  },
  {
    id: 'max-days-late',
    label: COMPARISON_MATRIX_TEXT.rows.maxDaysLate,
    render: (scenario) => scenario.maxDaysLate,
  },
  {
    id: 'orders-on-time',
    label: COMPARISON_MATRIX_TEXT.rows.ordersOnTime,
    render: (scenario) => scenario.ordersOnTime,
  },
  {
    id: 'added-cost',
    label: COMPARISON_MATRIX_TEXT.rows.addedCost,
    render: (scenario) => <MonoValue kind="money" value={scenario.addedCostEur} />,
  },
  {
    id: 'line-idle-days',
    label: COMPARISON_MATRIX_TEXT.rows.lineIdleDays,
    render: (scenario) => scenario.lineIdleDays,
  },
  {
    id: 'confidence',
    label: COMPARISON_MATRIX_TEXT.rows.confidence,
    render: (scenario) => (
      <span className="flex min-w-0 flex-col items-start gap-1">
        <StatusIndicator
          meaning={CONFIDENCE_PRESENTATION[scenario.confidence.level]}
          label={COMPARISON_MATRIX_TEXT.confidence[scenario.confidence.level]}
        />
        <span className={CONFIDENCE_REASON_CLASSES}>{scenario.confidence.reason}</span>
      </span>
    ),
  },
  {
    id: 'constraint-check',
    label: COMPARISON_MATRIX_TEXT.rows.constraintCheck,
    render: (scenario) => (
      <StatusIndicator
        meaning={CONSTRAINT_PRESENTATION[scenario.constraintCheck].meaning}
        label={CONSTRAINT_PRESENTATION[scenario.constraintCheck].label}
      />
    ),
  },
];

/* ---------------------------------------------------------------------------------------------
 * The reason a control cannot act, in one place
 * ------------------------------------------------------------------------------------------- */

/**
 * Why the recompute control cannot act, or `null` when it can.
 *
 * The four causes are ordered by what the reader can do about them: nothing to duplicate is the
 * record's state, a running request is a wait, a field that is not a number is theirs to fix, and a
 * failed constraint check is the record's own messages — stated verbatim rather than paraphrased,
 * because they are the reason that option cannot be recommended (rule P-8, AAP §0.8).
 *
 * Exported so the component and its suite name the same sentences instead of each spelling them out.
 */
export function sandboxDisabledReason(input: {
  readonly hasOption: boolean;
  readonly isPending: boolean;
  readonly invalidField: keyof Levers | null;
  readonly constraintMessages: readonly string[];
}): string | null {
  if (!input.hasOption) {
    return SCENARIO_SANDBOX_TEXT.noOption;
  }

  if (input.isPending) {
    return SCENARIO_SANDBOX_TEXT.alreadyRunning;
  }

  if (input.invalidField !== null) {
    return invalidLeverText(input.invalidField);
  }

  if (input.constraintMessages.length > 0) {
    return input.constraintMessages.join(' ');
  }

  return null;
}

/* ---------------------------------------------------------------------------------------------
 * The parts of one outcome
 * ------------------------------------------------------------------------------------------- */

/**
 * What a surface that renders one measured option takes: the option exactly as the service returned
 * it. Its own members are the figures on screen, so the record is passed whole rather than as a
 * selection of fields, and nothing here derives one member from another (rule P-6).
 */
interface ScenarioRecordProps {
  /** The option exactly as the service returned it. Nothing here derives a member from it. */
  readonly scenario: Scenario;
}

/**
 * Props of the surfaces that render one measured option together with the record its figures open.
 *
 * The two records are different on purpose, and neither is the other's stand-in. `scenario` is the
 * measurement: the copy the adapter minted for this request, whose members are the figures on screen.
 * `evidenceRef` is the option that measurement was taken from, which is the record the evidence behind
 * those figures belongs to — its case was measured, its formula produced the arithmetic, its upstream
 * records supplied the inputs and its confidence is the one the payload states.
 */
interface MeasuredRegionProps {
  /** The option exactly as the service returned it. Nothing here derives a member from it. */
  readonly scenario: Scenario;

  /**
   * The identifier every measure opens its evidence on: the duplicated option's own.
   *
   * It is the option the sandbox duplicated rather than the duplicate itself, because the duplicate is
   * a measurement the adapter assembled for this request and not a record the service holds: a
   * reference to its identifier resolves to nothing, and a drawer opened on it would report that no
   * record answers it instead of showing the record behind the figures. The duplicated option is that
   * record, and the comparison matrix's cells carry the same reference for the same measures, so a
   * sandbox figure and a matrix cell open one record.
   */
  readonly evidenceRef: ScenarioId;
}

/**
 * The recomputed option's identity: the identifier the adapter gave the duplicate, its own name, and
 * the lever values the figures beneath it were measured at.
 */
function ResultHeader({ scenario }: ScenarioRecordProps): ReactElement {
  return (
    <div className={STACK_TIGHT_CLASSES}>
      <p className={RESULT_HEADER_CLASSES}>
        <MonoValue kind="id" value={scenario.id} />
        <span className="min-w-0 break-words">{scenario.name}</span>
      </p>
      <p className={NOTE_CLASSES}>{measuredAtText(scenario.levers)}</p>
    </div>
  );
}

/**
 * The measures of one passing option, each with the §5.3 label that marks it as a computed figure.
 *
 * The label sits on every row rather than once for the block: rule P-1 asks it of each computed
 * figure, and a reader who meets one number in isolation — a screenshot, a zoomed panel, a row read
 * aloud — still learns what it is.
 *
 * Each value is wrapped in the shared evidence trigger with the duplicated option's reference, so the
 * figure itself opens the record behind it (AAP §0.12.4, F12). The wrap sits here rather than in each
 * row so all seven rows carry one reference and none can be missed when a row is added. The label sits
 * beside that trigger and never inside it: it describes the figure rather than being part of the
 * value, and keeping it out leaves the control's accessible name the value a reader would say.
 */
function MeasureList({ scenario, evidenceRef }: MeasuredRegionProps): ReactElement {
  return (
    <>
      <dl className={MEASURE_LIST_CLASSES}>
        {MEASURE_ROWS.map((row) => (
          <div key={row.id} className={MEASURE_ROW_CLASSES}>
            <dt className={MEASURE_LABEL_CLASSES}>{row.label}</dt>
            <dd className={MEASURE_VALUE_CLASSES}>
              <EvidenceRef ref={evidenceRef}>{row.render(scenario)}</EvidenceRef>
              <StatusIndicator meaning="simulated" label={CALCULATED_SIM_LABEL} />
            </dd>
          </div>
        ))}
      </dl>
      {/* The reference every row opens is the duplicated option's, so the panel says whose record the
          drawer behind these figures shows rather than leaving the duplicate's own identifier to imply
          a record the session does not hold. */}
      <p className={NOTE_CLASSES}>{SCENARIO_SANDBOX_TEXT.evidenceSubject}</p>
    </>
  );
}

/**
 * One settled measurement: the option's identity, then either its measures or the reason none exists.
 *
 * A failed constraint check hides every figure and states {@link CANNOT_COMPUTE_LABEL} with the
 * record's own messages instead — showing some figures beside the breach would suggest the others
 * were computed (AAP §0.8). The word is the comparison matrix's, so the sandbox and the option's
 * column cannot disagree about what a refused measurement is called. That branch renders no measure
 * row and therefore no evidence trigger: it states no figure for a trigger to open.
 */
function ResultRegion({ scenario, evidenceRef }: MeasuredRegionProps): ReactElement {
  if (scenario.constraintCheck === 'fail') {
    return (
      <div className={STACK_TIGHT_CLASSES}>
        <ResultHeader scenario={scenario} />
        <StatusIndicator meaning="fail" label={CANNOT_COMPUTE_LABEL} />
        {scenario.constraintMessages.length === 0 ? null : (
          <ul className={MESSAGE_LIST_CLASSES}>
            {scenario.constraintMessages.map((message, index) => (
              <li key={`${index}-${message}`} className="break-words">
                {message}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={STACK_TIGHT_CLASSES}>
      <ResultHeader scenario={scenario} />
      <MeasureList scenario={scenario} evidenceRef={evidenceRef} />
    </div>
  );
}

/**
 * What the sandbox hands a call that settled without a measurement: the rejection it caught, wrapped
 * so a `Problem` can be absent, and the retry that repeats the call at the values the fields hold now.
 * The rejection arrives whole because the message, the permission, the roles that hold it and the
 * trace identifier are the service's own account, and the component neither summarises nor invents any
 * of them (rule P-8).
 */
interface FailureRegionProps {
  /** The settled failure: the service's `Problem`, or `null` when the rejection carried none. */
  readonly failure: SandboxFailure;
  /** Repeats the call with the values the fields hold now. */
  readonly onRetry: () => void;
}

/**
 * A call that did not settle with a measurement: the service's own sentence, the permission and the
 * roles that hold it when the cause is a refusal, the trace identifier, and one retry.
 *
 * The message is printed character for character rather than replaced with a friendlier one, because
 * it is the only account of the cause the component has. A permission refusal carries no retry: the
 * same call by the same role would be refused again, and rule P-8 forbids a control that cannot act.
 * A failure that arrived without a `Problem` gets the component's own sentence and a retry, and names
 * no cause, permission or role it was not given.
 */
function FailureRegion({ failure, onRetry }: FailureRegionProps): ReactElement {
  const problem = failure.problem;

  if (problem === null) {
    return (
      <div className={STACK_TIGHT_CLASSES}>
        <StatusIndicator meaning="fail" label={SCENARIO_SANDBOX_TEXT.failureLabel} />
        <p className={NOTE_CLASSES}>{SCENARIO_SANDBOX_TEXT.unreported}</p>
        <ActionButton variant="secondary" onClick={onRetry}>
          {SCENARIO_SANDBOX_TEXT.retryLabel}
        </ActionButton>
      </div>
    );
  }

  const permission = problem.requiredPermission;
  const roles = problem.rolesWithPermission;

  return (
    <div className={STACK_TIGHT_CLASSES}>
      <StatusIndicator meaning="fail" label={SCENARIO_SANDBOX_TEXT.failureLabel} />
      <p className={MESSAGE_CLASSES}>{problem.message}</p>
      {permission === undefined ? null : (
        <p className={NOTE_CLASSES}>
          {SCENARIO_SANDBOX_TEXT.permissionLabel} <MonoValue kind="id" value={permission} />
        </p>
      )}
      {roles === undefined || roles.length === 0 ? null : (
        <p className={NOTE_CLASSES}>
          {SCENARIO_SANDBOX_TEXT.rolesLabel} {roles.join(', ')}
        </p>
      )}
      <p className={NOTE_CLASSES}>
        {SCENARIO_SANDBOX_TEXT.traceLabel} <MonoValue kind="id" value={problem.traceId} />
      </p>
      {problem.type === 'permission' ? (
        <p className={NOTE_CLASSES}>{SCENARIO_SANDBOX_TEXT.permissionNoRetry}</p>
      ) : (
        <ActionButton variant="secondary" onClick={onRetry}>
          {SCENARIO_SANDBOX_TEXT.retryLabel}
        </ActionButton>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The sandbox
 * ------------------------------------------------------------------------------------------- */

/** The option a request is made for: the exception to measure, and the option it duplicates. */
interface SolveTarget {
  /** The option the reader is editing, which the settled answer has to still belong to. */
  readonly scenarioId: ScenarioId;
  /** The exception whose solver case the service measures against. */
  readonly exceptionId: ExceptionId;
}

/** The target of one option, taken from the record rather than from anything typed here. */
function targetOf(option: Scenario): SolveTarget {
  return { scenarioId: option.id, exceptionId: option.exceptionId };
}

/**
 * Props of {@link ScenarioSandbox}.
 *
 * The base option is the whole input: the sandbox duplicates it, so its identifier says which option
 * the duplicate belongs to, its exception says which solver case to measure against, and its levers
 * seed the two fields. Nothing is asked of the caller that the record does not already state.
 */
export interface ScenarioSandboxProps {
  /**
   * The option being duplicated, exactly as the service returned it, or `null` when the screen has
   * none to offer — no option selected, or an exception whose set holds no duplicable option.
   *
   * Absent and `null` state the same thing, and both render the reason rather than a dead control
   * (rule P-8).
   */
  readonly scenario?: Scenario | null | undefined;

  /**
   * The case's own bound statements, exactly as the option set records them: the constraint messages of
   * the set's option whose constraint check failed, which name that case's lever maximum and step.
   *
   * They are rendered verbatim and are never composed, formatted or invented here, because a bound this
   * component stated in its own words would be a figure no record carries (rule P-6). The screen that
   * reads the set collects them; a set whose options all stayed inside their bounds records none, and
   * `undefined` or an empty list then renders nothing beside the rule, while a blank entry in the list is
   * dropped rather than rendered as an empty sentence. Nothing else changes either way: the solver still
   * enforces the bounds, and a refused measurement still states its own messages.
   */
  readonly caseBoundStatements?: readonly string[] | undefined;

  /**
   * Called with the scenario the service measured, once a recomputation settles with one.
   *
   * It is called for a passing option and for one whose constraint check failed: a refused
   * measurement is still the answer to the request, and the screen decides whether the duplicate's
   * column appears with its figures or with the record's own reason. It is never called for a
   * `Problem`, which has no measurement to hand over.
   */
  readonly onRecomputed?: ((scenario: Scenario) => void) | undefined;

  /** Layout-only additions for the panel. Never a colour and never a surface. */
  readonly className?: string | undefined;
}

/**
 * Renders the sandbox: two lever fields, the recompute control, and the last settled outcome.
 *
 * One request is sent per burst of lever edits, `Enter` sends one immediately, and every settled
 * outcome is written into a live region. The measurement itself is entirely the service's: this
 * component sends the two lever values and renders the `Scenario` that comes back, which is why it
 * holds no arithmetic, no formatting rule and no copy of the option set (rules P-2, P-6). The bounds
 * the case holds those values to are stated above the fields — the rule in this file's own numberless
 * words, and the case's own statements exactly as the records give them — so a reader meets them
 * before typing rather than only in a refusal (rule B-3).
 *
 * @param props The option to duplicate, the case's own bound statements as the option set records
 *   them, the callback a measurement is reported through, and the panel's layout classes. See
 *   {@link ScenarioSandboxProps}.
 * @returns The panel holding the fields, the control and the outcome of the last recomputation.
 */
export function ScenarioSandbox({
  scenario,
  caseBoundStatements,
  onRecomputed,
  className,
}: ScenarioSandboxProps): ReactElement {
  const service = useService();

  const [draftState, setDraftState] = useState<LeverDraftState | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<Scenario | null>(null);
  const [failure, setFailure] = useState<SandboxFailure | null>(null);

  const fieldIdPrefix = useId();
  const ruleDescriptionId = useId();
  const caseBoundDescriptionId = useId();
  const invalidDescriptionId = useId();

  const timerRef = useRef<number | null>(null);
  const requestSequenceRef = useRef(0);
  const targetRef = useRef<ScenarioId | null>(null);
  const isActiveRef = useRef(true);

  const hasOption = scenario !== null && scenario !== undefined;
  const optionId = hasOption ? scenario.id : null;

  /* The debounce's whole lifecycle. The body registers which option is now in the register, so a
     settled answer can be matched against it; the cleanup runs when that option changes and when the
     component unmounts, and it clears any request the reader had queued. Nothing is fetched here —
     AAP 0.18.1 reserves effects for exactly this kind of bookkeeping, not for loading. */
  useEffect(() => {
    targetRef.current = optionId;
    isActiveRef.current = true;

    return () => {
      isActiveRef.current = false;

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [optionId]);

  const draft = hasOption ? draftOf(draftState, scenario) : null;
  const parsedDraft = draft === null ? null : parseLevers(draft);
  const invalidField = parsedDraft !== null && !parsedDraft.ok ? parsedDraft.field : null;

  /* The case's own bound statements, exactly as the option set's failed option records them. They are
     rendered and described verbatim, never derived here: a sentence this component wrote about a bound
     would state a figure no record carries (rule P-6), so an absent or empty list publishes the rule
     alone and nothing stands in place of the statements nobody recorded. A blank entry is dropped rather
     than rendered as an empty sentence, which is the one change made to the records' text and the only
     one that adds nothing to it. */
  const caseBound = (caseBoundStatements ?? []).filter((statement) => statement.trim() !== '');

  /* The two halves every field carries, in one order for both of them: the rule the case holds every
     lever to, then the case's own statements where the set records them. A field holding something that
     is not a number is described by its own sentence after these, and only that field is, so one field's
     defect never describes its neighbour and a reader hears the bound before the defect (rule B-3). */
  const boundDescription = [
    ruleDescriptionId,
    ...(caseBound.length === 0 ? [] : [caseBoundDescriptionId]),
  ].join(' ');

  /* The record's own messages, when the last settled option breached a bound. They are what the
     control explains itself with: measuring the same values again would breach the same bound. */
  const constraintMessages =
    result !== null && result.constraintCheck === 'fail' ? result.constraintMessages : [];

  const blocker = sandboxDisabledReason({
    hasOption,
    isPending,
    invalidField,
    constraintMessages,
  });

  /** Drops a queued request, so one burst of edits cannot leave a second call behind it. */
  function cancelPendingRequest(): void {
    if (timerRef.current === null) {
      return;
    }

    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  /**
   * Whether a settled answer is still the one this panel is waiting for.
   *
   * Three conditions, each closing a way a stale answer could reach the screen: the component is
   * still mounted, no newer request has been raised since, and the option in the register is the one
   * the request was made for. A rejected or slower answer therefore changes nothing.
   */
  function isCurrent(sequence: number, scenarioId: ScenarioId): boolean {
    return (
      isActiveRef.current && sequence === requestSequenceRef.current && targetRef.current === scenarioId
    );
  }

  /** Asks the service to measure one option at one set of lever values. */
  async function submit(target: SolveTarget, values: LeverDraft): Promise<void> {
    const request = parseLevers(values);

    /* A field the reader is midway through typing is not a request: the reason is already visible
       beside the field, so nothing is sent and no failure is invented for it. */
    if (!request.ok) {
      return;
    }

    requestSequenceRef.current += 1;
    const sequence = requestSequenceRef.current;

    setIsPending(true);
    setFailure(null);

    try {
      const settled = await service.solveScenario(target.exceptionId, request.levers);

      if (!isCurrent(sequence, target.scenarioId)) {
        return;
      }

      setIsPending(false);
      setResult(settled.data);
      onRecomputed?.(settled.data);
    } catch (thrown) {
      if (!isCurrent(sequence, target.scenarioId)) {
        return;
      }

      setIsPending(false);
      setResult(null);
      setFailure({ problem: asProblem(thrown) });
    }
  }

  /** Queues one request, replacing any the reader's previous keystroke had queued. */
  function scheduleRequest(target: SolveTarget, values: LeverDraft): void {
    cancelPendingRequest();

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void submit(target, values);
    }, SANDBOX_RECOMPUTE_DELAY_MS);
  }

  /** Sends the values the fields hold now, without waiting for the delay. */
  function recomputeNow(): void {
    if (blocker !== null || !hasOption || draft === null) {
      return;
    }

    cancelPendingRequest();
    void submit(targetOf(scenario), draft);
  }

  /** Records one keystroke in the draft, then queues the request it will become. */
  function handleLeverChange(field: keyof Levers, value: string): void {
    if (!hasOption || draft === null) {
      return;
    }

    const next: LeverDraft = { ...draft, [field]: value };

    setDraftState({ scenarioId: scenario.id, values: next });
    scheduleRequest(targetOf(scenario), next);
  }

  /* `Enter` in either field is the keyboard route to the same request the control makes, so a
     keyboard user is never left waiting out a delay the pointer never meets (rule B-3). */
  function handleLeverKeyDown(event: ReactKeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    recomputeNow();
  }

  return (
    <Panel
      label={SCENARIO_SANDBOX_TEXT.panelLabel}
      {...(className === undefined ? {} : { className })}
    >
      <div className={STACK_CLASSES}>
        <p className={NOTE_CLASSES}>{SCENARIO_SANDBOX_TEXT.note}</p>

        {!hasOption || draft === null ? (
          <p className={NOTE_CLASSES}>{SCENARIO_SANDBOX_TEXT.noOption}</p>
        ) : (
          <fieldset className={FIELD_SET_CLASSES}>
            <legend className={LEGEND_CLASSES}>{SCENARIO_SANDBOX_TEXT.legend}</legend>
            {/* What these fields are held to, stated before a value is typed: the rule the case
                applies to every lever, and — verbatim, where the option set records them — the case's
                own statements of its maximum and step. Both describe each field below, so the words a
                reader sees are the words an assistive-technology user hears with the field (rule
                B-3). */}
            <div className={HINT_STACK_CLASSES}>
              <p id={ruleDescriptionId} className={NOTE_CLASSES}>
                {SCENARIO_SANDBOX_TEXT.leverBoundsRule}
              </p>
              {caseBound.length === 0 ? null : (
                <p id={caseBoundDescriptionId} className={NOTE_CLASSES}>
                  {caseBound.join(' ')}
                </p>
              )}
            </div>
            <div className={INPUT_ROW_CLASSES}>
              {LEVER_FIELDS.map((field) => {
                const inputId = `${fieldIdPrefix}-${field}`;
                const isInvalid = invalidField === field;

                return (
                  <div key={field} className={FIELD_CLASSES}>
                    {/* The accessible name is the contract's own field name: the name the record
                        declares and the service reads, with no friendlier wording invented. */}
                    <label htmlFor={inputId} className={LABEL_CLASSES}>
                      {field}
                    </label>
                    {/* A number field composed through `TextField`, and deliberately without `min`,
                        `max` or `step`: the record the port returns carries no bound for either
                        lever, so the bounds are published as the sentences above and described by
                        them rather than annotated with a typed one. The solver holds the bounds and
                        reports every breach as the messages this control renders. */}
                    <TextField
                      id={inputId}
                      type="number"
                      className={INPUT_CLASSES}
                      value={draft[field]}
                      aria-invalid={isInvalid ? true : undefined}
                      aria-describedby={
                        isInvalid ? `${boundDescription} ${invalidDescriptionId}` : boundDescription
                      }
                      onChange={(value) => {
                        handleLeverChange(field, value);
                      }}
                      onKeyDown={handleLeverKeyDown}
                    />
                  </div>
                );
              })}
            </div>
            {invalidField === null ? null : (
              <p id={invalidDescriptionId} className={NOTE_CLASSES}>
                {invalidLeverText(invalidField)}
              </p>
            )}
          </fieldset>
        )}

        <div className={ACTIONS_CLASSES}>
          {blocker === null ? (
            <ActionButton variant="secondary" onClick={recomputeNow}>
              {SCENARIO_SANDBOX_TEXT.recomputeLabel}
            </ActionButton>
          ) : (
            <ActionButton variant="secondary" disabled disabledReason={blocker}>
              {SCENARIO_SANDBOX_TEXT.recomputeLabel}
            </ActionButton>
          )}
        </div>

        {/* The outcome, announced as it changes: a recomputation's own result is the answer to a
            control the reader just operated, so it is a status and not an alert. */}
        <div
          role="status"
          aria-live="polite"
          aria-busy={isPending ? true : undefined}
          className={REGION_CLASSES}
        >
          {isPending ? <p className={NOTE_CLASSES}>{SCENARIO_SANDBOX_TEXT.inFlight}</p> : null}
          {isPending || failure === null ? null : (
            <FailureRegion failure={failure} onRetry={recomputeNow} />
          )}
          {/* A settled answer is always an answer to the option in the register, so the duplicated
              option's identifier is present whenever there is a result: the guard says so for the
              compiler, and the reference the measures open is that option rather than the record the
              adapter minted for this request. */}
          {isPending || failure !== null || result === null || optionId === null ? null : (
            <ResultRegion scenario={result} evidenceRef={optionId} />
          )}
          {isPending || failure !== null || result !== null ? null : (
            <p className={NOTE_CLASSES}>{SCENARIO_SANDBOX_TEXT.idle}</p>
          )}
        </div>
      </div>
    </Panel>
  );
}

