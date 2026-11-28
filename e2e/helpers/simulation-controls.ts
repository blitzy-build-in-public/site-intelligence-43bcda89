/**
 * The simulation lever of the browser suite: it opens the one simulation popover, puts the
 * demonstration into a required trigger, and restores the seeded records — every time through the
 * visible interface, so no spec needs a lever of its own.
 *
 * WHAT IT DRIVES. `src/app/simulation-controls.tsx`, the single popover AAP 0.12.1 and AAP 0.12.4
 * hold the seven screen states, the two triggers that are not screen states and `Reset demo data` in
 * — "and never in a production path: no query parameter and no global changes behaviour". The panel
 * is a `role="dialog"` named by the exact specification §5.3 label `Simulated control`, and it is
 * opened by the persistent `Simulated data` badge the shell mounts once on every route
 * (`src/components/simulated-data-badge.tsx`, activated through the shell store's `simulationOpen`).
 * This module is the only way the suite reaches that panel.
 *
 * WHY EACH TRIGGER IS RESOLVED FROM THE RUNNING PANEL. The plan fixes the popover's own label and the
 * reset action's wording, and it fixes no wording for the nine per-state controls: the panel owns
 * that copy, and a helper that repeated it would be a second owner able to drift from the component.
 * So the controls are enumerated from the live dialog and ranked against the flag's own token — the
 * whole name first, then a suffix, then a substring, then a word of the token appearing in the name.
 * The word tier is what separates the two flags that are named by copy rather than by a word of their
 * own: `empty-queue` is `Empty the exception queue` and matches nothing at the first three tiers.
 * Inside the winning tier the best fit wins: the token words the name answers to, then the fewest
 * name words the token accounts for nothing of, which is what keeps `empty` off `Empty the exception
 * queue`. A tier that yields no control, or a fit that leaves two controls equal, is an error listing
 * what the panel actually rendered — never a guess.
 *
 * WHY EVERY WAIT IS WEB-FIRST. Nothing here sleeps. Opening the panel awaits the dialog's own
 * visibility; a trigger awaits the control's own applied state, `aria-pressed` or `aria-checked`,
 * which the panel writes only after the port call has returned; a reset awaits the panel closing,
 * which the panel does itself once the port call has resolved. The port carries the mock adapter's
 * 150-400 ms of injected latency, so a state that has not appeared inside the bounds below has not
 * appeared rather than merely taken its time. A refusal is awaited beside the success, so a rejected
 * change is reported with the panel's own message instead of surfacing as a timeout.
 *
 * WHAT IT NEVER DOES.
 * - No navigation by address. The mock adapter keeps the session in memory, so loading the document
 *   again would re-seed it and lose whatever a spec had arranged. Every trigger has to survive this
 *   module.
 * - No timer, no script run inside the page, no synthetic event, no pointer coordinates, no storage
 *   seed, no query parameter, no global: the popover is a product feature and the only lever, and the
 *   build ships no test hook for this module to find (AAP 0.7, 0.9). Activation is the control's own
 *   click or check, so the helper drives exactly the control a keyboard reader reaches (rule B-3).
 * - No request, no host, port or origin, no environment read, no credential, no cookie (rules B-1,
 *   B-2). The watch T-20 keeps sees nothing from here.
 * - No figure, amount, date, threshold or record identifier: the only strings typed below are the two
 *   the plan fixes, the nine union member names, and the panel's own rendered names read back from
 *   the document (rule P-6). The edited audit result the `tampered-audit` trigger produces belongs to
 *   the adapter — this module asks for the trigger and writes no sequence, hash or result of its own,
 *   and it calls that control simulated because that is what it is: the chain reports where it broke
 *   and repairs nothing (rule P-4).
 * - No claim that the demonstration establishes a configuration, prevents a copy or resists an edit
 *   (rule P-4), and no real vendor, customer or model name (rule P-7 — the product is Site
 *   Intelligence and its workspace is the FileMap canvas).
 *
 * Rules served: P-1 (the panel is matched by the exact §5.3 label `Simulated control`, the reset
 * action by its exact text, and the badge by the `Simulated data` label), P-8 (a control that cannot
 * act is reported with the explanation it gives rather than clicked into a timeout), B-3 (role and
 * accessible name only, never a class, a colour or a position), B-1, B-2, P-4, P-6 and P-7 as above.
 */
import type { Locator, Page } from '@playwright/test';

import type { SimulationFlag } from '../../src/types';

/* ---------------------------------------------------------------------------------------------
 * The fixed strings — AAP 0.10, platform-specification.md §5.3, rules P-1 and P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The accessible name of the popover: `Simulated control`, the fifth of the seven labels
 * specification §5.3 fixes, which rule P-1 requires on every simulated control.
 *
 * The literal is stated here rather than imported from the tuple that owns it: this module runs in
 * the Playwright runner and must not load application code, so the browser test asserts the
 * contract instead of asking the application what the contract says.
 * `src/app/simulation-controls.tsx` therefore has to render exactly this string as its dialog's name
 * — it selects the same member of `SIM_LABELS` — and that pairing is what this constant checks.
 */
const SIMULATED_CONTROL_NAME = 'Simulated control';

/**
 * The action text of the control that restores the seeded records, fixed by AAP 0.10 and AAP 0.12.4
 * as `Reset demo data` and rendered from the panel's own copy record.
 *
 * Repeated here for the reason above: a browser test may not import the module it drives, so the
 * wording this suite holds the panel to is stated once, here, and the panel has to match it exactly.
 */
const RESET_ACTION_NAME = 'Reset demo data';

/* ---------------------------------------------------------------------------------------------
 * The accepted triggers — src/types/service.ts, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * Every trigger the single popover offers, in the order the panel renders them: the seven members of
 * `ScreenState`, then the two that are not screen states.
 *
 * The list types itself against the union, and the assertion below proves it is exhaustive, so a
 * member added to `SimulationFlag` without being added here fails the type check rather than becoming
 * a trigger this helper silently refuses. Nothing is listed that the union does not declare: the
 * reset is a method of the port rather than a flag, so it has no member and its own function drives
 * it.
 */
const SIMULATION_FLAGS = [
  'loading',
  'empty',
  'stale',
  'partial',
  'offline',
  'forbidden',
  'conflict',
  'tampered-audit',
  'empty-queue',
] as const satisfies readonly SimulationFlag[];

/** Every member of `SimulationFlag` the list above leaves out: `never` while the list is complete. */
type UnlistedFlag = Exclude<SimulationFlag, (typeof SIMULATION_FLAGS)[number]>;

/**
 * Fails the type check unless its argument is `never`, which is what makes the list above exhaustive
 * at compile time rather than by inspection.
 */
type AssertNever<T extends never> = T;

/** The assertion itself: a trigger added to the union and not to the list is a compile error here. */
type FlagsListed = AssertNever<UnlistedFlag>;

/* ---------------------------------------------------------------------------------------------
 * Bounds — every wait below is web-first; these ceilings are what make a stuck control report itself
 * ------------------------------------------------------------------------------------------- */

/**
 * How long the panel is given to appear once the badge is activated.
 *
 * Opening it is one synchronous write to the shell store, so this bounds a wait that settles on the
 * next frame. Reaching it means the popover never mounted.
 */
const DIALOG_OPEN_TIMEOUT_MS = 10_000;

/**
 * How long one change is given to settle.
 *
 * The panel calls the port, whose mock adapter carries 150-400 ms of injected latency, and writes the
 * control's applied state once that call returns, so the state follows within a second. The ceiling
 * sits far above that and below the suite's own test timeout, so reaching it means the change never
 * landed.
 */
const CONTROL_SETTLE_TIMEOUT_MS = 10_000;

/**
 * How long a control marked `aria-disabled` is given to become actionable again.
 *
 * The panel marks every control `aria-disabled` while its port call is in flight — the cache
 * invalidation the change starts is issued afterwards and not awaited — and clears the mark when that
 * call returns, so a spec that chains two calls lands in that window. Giving the mark a bounded wait
 * keeps a transient busy state from being reported as a permanent refusal; when it does not clear, the
 * check that follows reports the panel's own explanation (rule P-8).
 */
const ACTIONABLE_TIMEOUT_MS = 5_000;

/* ---------------------------------------------------------------------------------------------
 * The controls the panel can render — resolved from the running dialog, never from invented wording
 * ------------------------------------------------------------------------------------------- */

/**
 * The roles a trigger of this popover can carry.
 *
 * The panel renders each trigger as a native `button` today, and the enumeration stays open to the
 * three other idioms a two-state control is built from so a spec keeps working if the component is
 * rebuilt as radios, checkboxes or switches. No element carries two roles, so nothing is counted
 * twice.
 */
const CONTROL_ROLES = ['button', 'checkbox', 'radio', 'switch'] as const;

/** One of the roles {@link CONTROL_ROLES} enumerates. */
type ControlRole = (typeof CONTROL_ROLES)[number];

/**
 * The roles a native input expresses by being checked rather than pressed, which is the case where
 * the control's own action is `check()` instead of a click.
 */
const CHECKABLE_ROLES: readonly ControlRole[] = ['checkbox', 'radio'];

/**
 * The shortest token word a word-tier match may hinge on.
 *
 * The word tier matches a name word that begins with a token word, which is what lets `conflicting`
 * answer to `conflict`. A floor of four characters keeps a fragment of a token from matching half the
 * panel: every word of every member of `SimulationFlag` is at least five characters long, so the floor
 * excludes fragments only and never a real token.
 */
const MIN_WORD_LENGTH = 4;

/** One control the open panel renders, read once so a failure can describe what was on screen. */
interface RenderedControl {
  /** The role the control carries. */
  readonly role: ControlRole;

  /** The locator that reaches the control, which every press and state read goes through. */
  readonly control: Locator;

  /** The accessible name as rendered, whitespace collapsed. */
  readonly name: string;

  /** {@link name} lower-cased with each run of punctuation folded to one space, for the ranking. */
  readonly normalisedName: string;

  /** {@link normalisedName} as words. */
  readonly words: readonly string[];
}

/** How well one rendered control fits a flag's token, used to break a tie inside one tier. */
interface FitScore {
  /** The number of token words the name answers to: higher is a better fit. */
  readonly matched: number;

  /** The number of name words the token accounts for nothing of: lower is a better fit. */
  readonly unmatched: number;
}

/** The page states a settle can await. */
type AwaitableState = 'attached' | 'visible' | 'hidden';

/** The page state that proves a change landed, and whether it is the control's own expression. */
interface AppliedSignal {
  /** The locator that reaches the proof. */
  readonly locator: Locator;

  /** The state {@link locator} has to reach. */
  readonly state: AwaitableState;

  /**
   * Whether the signal is the control's own applied state. When it is not, the panel exposes no such
   * state and the fallback below is awaited instead, with the reason recorded at that code.
   */
  readonly fromControl: boolean;
}

/** What an awaited change came to: it landed, the panel reported a refusal, or neither arrived. */
type Settled = 'applied' | 'reported' | null;

/* ---------------------------------------------------------------------------------------------
 * Reading strings and controls
 * ------------------------------------------------------------------------------------------- */

/**
 * Collapses runs of whitespace so a rendered name or reason fits one line of a failure message.
 *
 * @param text The text as read from the document.
 * @returns The same text with each run of whitespace reduced to one space, trimmed.
 */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * A string as the ranking compares it: lower-cased, with each run of characters that is neither a
 * letter nor a digit folded to one space, so `Empty, Not in effect` becomes `empty not in effect` and
 * a flag's `-` reads as the space the panel's copy would use.
 *
 * @param text The name or token to normalise.
 * @returns The normalised form.
 */
function normalise(text: string): string {
  return collapseWhitespace(text.toLowerCase().replace(/[^a-z0-9]+/g, ' '));
}

/**
 * A normalised string as words.
 *
 * @param text A string already passed through {@link normalise}.
 * @returns Its words, and no words at all for the empty string.
 */
function wordsOf(text: string): readonly string[] {
  return text === '' ? [] : text.split(' ');
}

/**
 * The accessible name of a control, read the two ways a component can supply it.
 *
 * `aria-label` first, because a control whose visible content carries a status beside its label names
 * itself explicitly; then the rendered text, which is how every plain button in this application is
 * named. Both are diagnostic reads of an already-located control, never a way of locating one.
 *
 * @param control The control to read.
 * @returns The name, whitespace collapsed, or `''` when the control renders none.
 */
async function controlNameOf(control: Locator): Promise<string> {
  const ariaLabel = collapseWhitespace((await control.getAttribute('aria-label')) ?? '');

  if (ariaLabel !== '') {
    return ariaLabel;
  }

  return collapseWhitespace((await control.textContent()) ?? '');
}

/**
 * A set of rendered controls as one clause of a failure message.
 *
 * @param candidates The controls a lookup considered.
 * @returns Their names, or a statement that there were none.
 */
function describeCandidates(candidates: readonly RenderedControl[]): string {
  if (candidates.length === 0) {
    return 'the panel rendered no control at all';
  }

  return `${candidates.length} control(s): [${candidates.map((candidate) => JSON.stringify(candidate.name)).join(', ')}]`;
}

/**
 * The buttons one region of the page renders, with their names, for the failure of a lookup that
 * matched nothing.
 *
 * @param scope The region to describe.
 * @param where How a failure refers to that region, such as `The top bar`.
 * @returns A sentence naming each control the region renders.
 */
async function describeControlsIn(scope: Locator, where: string): Promise<string> {
  const controls = scope.getByRole('button');
  const total = await controls.count();

  if (total === 0) {
    return `${where} renders no control at all`;
  }

  const names: string[] = [];
  for (let index = 0; index < total; index += 1) {
    names.push(JSON.stringify(await controlNameOf(controls.nth(index))));
  }

  return `${where} renders ${total} control(s): [${names.join(', ')}]`;
}

/**
 * The explanation a control gives for not acting (rule P-8), quoted by the error that reports it.
 *
 * Read from the targets of `aria-describedby` first, because that is the mechanism
 * `src/components/tooltip.tsx` and the popover's own toggles use and it keeps the sentence reachable
 * by keyboard whatever else is hidden; then from `title`. Every one of those is a diagnostic read of
 * an already-located control, never a way of locating one.
 *
 * @param page The Playwright page showing the application.
 * @param control The control that cannot act.
 * @returns The explanation, or a statement that the control renders none.
 */
async function readExplanation(page: Page, control: Locator): Promise<string> {
  const describedBy = collapseWhitespace((await control.getAttribute('aria-describedby')) ?? '');
  const described: string[] = [];

  for (const id of describedBy === '' ? [] : describedBy.split(' ')) {
    const text = collapseWhitespace(
      (await page
        .locator(`[id="${id}"]`)
        .textContent()
        .catch(() => null)) ?? '',
    );

    if (text !== '') {
      described.push(text);
    }
  }

  if (described.length > 0) {
    return described.join(' ');
  }

  const title = collapseWhitespace((await control.getAttribute('title')) ?? '');
  if (title !== '') {
    return title;
  }

  return 'the control renders no explanation, which is itself the rule P-8 breach';
}

/**
 * Whether a word read from outside the compiler is one of the nine triggers.
 *
 * `SimulationFlag` is a union of literals, but a spec can reach an exported function with a value the
 * union never saw — a table row, a loop over strings — and the failure that would follow is a search
 * for a control that cannot exist.
 *
 * @param value The string to test.
 * @returns `true` when the value names one of the nine triggers.
 */
function isSimulationFlag(value: string): value is SimulationFlag {
  return SIMULATION_FLAGS.some((flag) => flag === value);
}

/* ---------------------------------------------------------------------------------------------
 * Ranking a rendered control against the trigger that was asked for
 * ------------------------------------------------------------------------------------------- */

/** The whole accessible name is the flag's token. */
const RANK_EXACT = 1;

/** The accessible name ends with the flag's token. */
const RANK_SUFFIX = 2;

/** The accessible name contains the flag's token. */
const RANK_SUBSTRING = 3;

/** A word of the flag's token appears in the name as a word, or as the start of one. */
const RANK_WORDS = 4;

/** No tier matched, so the control is not a candidate for the trigger. */
const RANK_NONE = 0;

/**
 * Whether one word of a rendered name answers to one word of a flag's token.
 *
 * The name word is the longer of the two in the one case this has to bridge — `conflicting` for
 * `conflict` — because the panel's copy carries a state's name in the words a reader knows rather
 * than in the union's member. The floor that keeps a fragment from matching is applied by
 * {@link answersToWord}, so this test stays a plain comparison.
 *
 * @param nameWord One word of a rendered accessible name.
 * @param tokenWord One word of a flag's normalised token.
 * @returns `true` when the name word answers to the token word.
 */
function wordMatches(nameWord: string, tokenWord: string): boolean {
  return nameWord === tokenWord || nameWord.startsWith(tokenWord);
}

/**
 * Whether a rendered control answers to one word of a flag's token.
 *
 * @param candidate The control under consideration.
 * @param tokenWord One word of the flag's normalised token.
 * @returns `true` when a word of the name answers to it and the token word is long enough to mean
 *   something.
 */
function answersToWord(candidate: RenderedControl, tokenWord: string): boolean {
  return (
    tokenWord.length >= MIN_WORD_LENGTH &&
    candidate.words.some((nameWord) => wordMatches(nameWord, tokenWord))
  );
}

/**
 * The tier one rendered control is ranked in for a flag's token, or {@link RANK_NONE}.
 *
 * @param candidate The control under consideration.
 * @param token The flag's normalised token, such as `empty queue`.
 * @param tokenWords {@link token} as words.
 * @returns The best tier the name reaches, lowest number being the best match.
 */
function rankOf(
  candidate: RenderedControl,
  token: string,
  tokenWords: readonly string[],
): number {
  if (candidate.normalisedName === token) {
    return RANK_EXACT;
  }

  if (candidate.normalisedName.endsWith(token)) {
    return RANK_SUFFIX;
  }

  if (candidate.normalisedName.includes(token)) {
    return RANK_SUBSTRING;
  }

  if (tokenWords.some((word) => answersToWord(candidate, word))) {
    return RANK_WORDS;
  }

  return RANK_NONE;
}

/**
 * How well one control fits a flag's token, for telling two controls apart inside one tier.
 *
 * The substring tier cannot separate `empty` from `Empty the exception queue` on its own — both
 * contain the token — so both are scored: the name that answers to more of the token's words wins,
 * and between names that answer to the same number, the one carrying fewer words the token accounts
 * for nothing of wins. For `empty` that is `Empty`, whose remaining words are the panel's own status
 * wording rather than the words of a second trigger.
 *
 * @param candidate The control under consideration.
 * @param tokenWords The flag's normalised token as words.
 * @returns The fit, higher `matched` and lower `unmatched` being the better.
 */
function fitOf(candidate: RenderedControl, tokenWords: readonly string[]): FitScore {
  const matched = tokenWords.filter((word) => answersToWord(candidate, word)).length;
  const unmatched = candidate.words.filter(
    (nameWord) =>
      !tokenWords.some(
        (word) => word.length >= MIN_WORD_LENGTH && wordMatches(nameWord, word),
      ),
  ).length;

  return { matched, unmatched };
}

/**
 * The one control of the open panel that produces a trigger, or an error naming what the panel
 * rendered instead.
 *
 * The best tier that holds at least one control is taken, and only the controls in that tier are
 * considered further, so a name that merely shares a word with the trigger never competes with one
 * that carries the trigger's own token. Two controls left equal on both counts is a failure rather
 * than a guess: picking one would leave a spec asserting a state the reader may not have chosen,
 * which is the whole reason the panel keeps `empty` and `empty-queue` apart.
 *
 * @param candidates Every interactive control the open panel renders.
 * @param flag The trigger the caller asked for, for the failure messages.
 * @param token The flag's normalised token.
 * @param tokenWords {@link token} as words.
 * @returns The single control that produces the trigger.
 * @throws Error when no control matches, or when more than one matches equally well.
 */
function selectControl(
  candidates: readonly RenderedControl[],
  flag: SimulationFlag,
  token: string,
  tokenWords: readonly string[],
): RenderedControl {
  const ranked = candidates
    .map((candidate) => ({ candidate, rank: rankOf(candidate, token, tokenWords) }))
    .filter((entry) => entry.rank !== RANK_NONE);

  if (ranked.length === 0) {
    throw new Error(
      `triggerSimulationState: the simulation popover renders no control matching the "${flag}" trigger — its normalised token "${token}" was tried as a whole name, a suffix, a substring, then as a word of the name. ${describeCandidates(candidates)}.`,
    );
  }

  const bestRank = Math.min(...ranked.map((entry) => entry.rank));
  const pool = ranked
    .filter((entry) => entry.rank === bestRank)
    .map((entry) => entry.candidate);
  const [winner, ...rest] = pool;

  if (winner === undefined) {
    throw new Error(
      `triggerSimulationState: the "${flag}" trigger resolved to an empty tier, which cannot happen for a non-empty ranked list. ${describeCandidates(candidates)}.`,
    );
  }

  if (rest.length === 0) {
    return winner;
  }

  const scored = pool.map((candidate) => ({ candidate, fit: fitOf(candidate, tokenWords) }));
  const bestMatched = Math.max(...scored.map((entry) => entry.fit.matched));
  const byMatched = scored.filter((entry) => entry.fit.matched === bestMatched);
  const fewestUnmatched = Math.min(...byMatched.map((entry) => entry.fit.unmatched));
  const byUnmatched = byMatched.filter((entry) => entry.fit.unmatched === fewestUnmatched);
  const [chosen, ...equals] = byUnmatched;

  if (chosen === undefined) {
    throw new Error(
      `triggerSimulationState: the "${flag}" trigger left no control after scoring, which cannot happen for a non-empty pool. ${describeCandidates(pool)}.`,
    );
  }

  if (equals.length > 0) {
    throw new Error(
      `triggerSimulationState: ${byUnmatched.length} controls produce the "${flag}" trigger equally well, so activating one of them would not prove which state the panel reached. ${describeCandidates(byUnmatched.map((entry) => entry.candidate))}.`,
    );
  }

  return chosen.candidate;
}

/* ---------------------------------------------------------------------------------------------
 * Driving one control — rules P-8 and B-3
 * ------------------------------------------------------------------------------------------- */

/**
 * Every interactive control the open panel renders, in the order the roles are enumerated.
 *
 * The enumeration is the whole of the resolution: the panel's names are its own copy, so nothing is
 * matched against wording written here.
 *
 * @param dialog The open panel.
 * @returns Each control with its role, name and words.
 */
async function enumerateControls(dialog: Locator): Promise<readonly RenderedControl[]> {
  const rendered: RenderedControl[] = [];

  for (const role of CONTROL_ROLES) {
    const controls = dialog.getByRole(role);
    const total = await controls.count();

    for (let index = 0; index < total; index += 1) {
      const control = controls.nth(index);
      const name = await controlNameOf(control);
      const normalisedName = normalise(name);
      rendered.push({ role, control, name, normalisedName, words: wordsOf(normalisedName) });
    }
  }

  return rendered;
}

/**
 * Refuses to act on a control that cannot act, quoting the explanation it gives (rule P-8).
 *
 * A control the panel has marked `aria-disabled` is first given a bounded wait to become actionable
 * again, because the panel sets that mark on every control while a change is in flight and a spec
 * that chains two calls arrives inside that window. When the mark does not clear, the control's
 * explanation is reported instead of a click the panel would ignore — a change whose port call has not
 * returned inside that bound is one the panel has not finished, and rule P-8's sentence is the one a
 * reader needs to see rather than a click that lands on nothing.
 *
 * Both ways of being disabled are checked: the native `disabled` attribute, and the `aria-disabled`
 * state the panel actually uses so its controls stay in the tab order and their explanations stay
 * reachable by keyboard.
 *
 * @param page The Playwright page showing the application.
 * @param control The control that is about to be activated.
 * @param description How a failure refers to it, such as `the reset control`.
 * @param caller The exported function reporting the failure, so the message names the call a reader
 *   can find in the spec.
 * @throws Error quoting the control's own explanation when it cannot act.
 */
async function awaitCanAct(
  page: Page,
  control: Locator,
  description: string,
  caller: string,
): Promise<void> {
  const busy = control.and(page.locator('[aria-disabled="true"]'));

  if ((await busy.count()) > 0) {
    await busy
      .waitFor({ state: 'hidden', timeout: ACTIONABLE_TIMEOUT_MS })
      .catch(() => undefined);
  }

  const ariaDisabled = await control.getAttribute('aria-disabled');

  if ((await control.isDisabled()) || ariaDisabled === 'true') {
    throw new Error(
      `${caller}: ${description} cannot act, and rule P-8 requires a disabled control to explain itself, so this helper reports that explanation instead of waiting for an activation that can never land. It gives: ${await readExplanation(page, control)}`,
    );
  }
}

/**
 * Whether a control already reports its trigger in effect.
 *
 * The read is what makes {@link triggerSimulationState} idempotent: the panel's controls are toggles,
 * so a second press lifts the trigger it set, and a spec that repeats a call wants the demonstration
 * to stay in the state it asked for rather than to flip back out of it.
 *
 * @param chosen The control that produces the trigger.
 * @returns `true` when the control's own applied state says the trigger is in effect.
 */
async function isInEffect(chosen: RenderedControl): Promise<boolean> {
  const pressed = await chosen.control.getAttribute('aria-pressed');

  if (pressed !== null) {
    return pressed === 'true';
  }

  const checked = await chosen.control.getAttribute('aria-checked');

  if (checked !== null) {
    return checked === 'true';
  }

  if (CHECKABLE_ROLES.includes(chosen.role)) {
    return chosen.control.isChecked();
  }

  return false;
}

/**
 * The page state that proves a change this control was asked for landed, or the nearest expression
 * the panel gives when the control carries none.
 *
 * The control's own applied state is the signal the panel writes once the port call returns — the
 * cache invalidation the change starts is not awaited — which is why it is preferred to everything
 * else: it cannot be satisfied by the moment before the press.
 *
 * @param page The Playwright page showing the application.
 * @param dialog The open panel.
 * @param chosen The control that produces the trigger.
 * @returns The proof to await.
 */
async function resolveAppliedSignal(
  page: Page,
  dialog: Locator,
  chosen: RenderedControl,
): Promise<AppliedSignal> {
  const pressed = await chosen.control.getAttribute('aria-pressed');

  if (pressed !== null) {
    return {
      locator: chosen.control.and(page.locator('[aria-pressed="true"]')),
      state: 'visible',
      fromControl: true,
    };
  }

  const checked = await chosen.control.getAttribute('aria-checked');

  if (checked !== null) {
    return {
      locator: chosen.control.and(page.locator('[aria-checked="true"]')),
      state: 'visible',
      fromControl: true,
    };
  }

  if (CHECKABLE_ROLES.includes(chosen.role)) {
    return {
      locator: chosen.control.and(page.locator(':checked')),
      state: 'visible',
      fromControl: true,
    };
  }

  /* A control with no applied state is a defect in `src/app/simulation-controls.tsx`: a toggle that
     cannot say whether it is in effect leaves a reader — and a spec — to guess. The nearest
     expression the panel does give is its busy line, the single `role="status"` element that holds
     one sentence while a change is in flight and nothing once it has settled, so that is awaited
     rather than a delay. */
  return {
    locator: dialog.getByRole('status').and(page.locator(':empty')),
    state: 'attached',
    fromControl: false,
  };
}

/**
 * Activates one control with the action its own kind implies.
 *
 * A control that is a native checkbox or radio is checked, which is that element's own action and the
 * one a keyboard reader performs; a button or a switch is pressed. A two-state control built from an
 * element that is not an input is pressed as well, because `check()` is defined for native inputs
 * alone and would fail the call rather than report something a reader can act on.
 *
 * @param chosen The control to activate.
 */
async function activate(chosen: RenderedControl): Promise<void> {
  if (CHECKABLE_ROLES.includes(chosen.role)) {
    const type = (await chosen.control.getAttribute('type'))?.toLowerCase() ?? '';

    if (type === 'checkbox' || type === 'radio') {
      await chosen.control.check();
      return;
    }
  }

  await chosen.control.click();
}

/**
 * Awaits the proof a change landed, or the panel reporting that it did not, whichever comes first.
 *
 * Both waits are bounded and both failures are handled inside this function, so whichever loses the
 * race cannot surface later as an unhandled rejection. A `null` result means neither arrived inside
 * the bound, which the caller reports with what it observed.
 *
 * @param applied The locator that reaches the proof.
 * @param appliedState The state it has to reach.
 * @param reported The panel's failure region.
 * @param timeoutMs How long to give both.
 * @returns Which of the two arrived, or `null` when neither did.
 */
async function settleOn(
  applied: Locator,
  appliedState: AwaitableState,
  reported: Locator,
  timeoutMs: number,
): Promise<Settled> {
  const appliedOutcome = applied
    .waitFor({ state: appliedState, timeout: timeoutMs })
    .then(() => 'applied' as const, () => null);
  const reportedOutcome = reported
    .first()
    .waitFor({ state: 'visible', timeout: timeoutMs })
    .then(() => 'reported' as const, () => null);

  return Promise.race([appliedOutcome, reportedOutcome]);
}

/**
 * The message the panel's failure region carries.
 *
 * @param reported The panel's failure region.
 * @returns The panel's own words, or a statement that it reported a failure without them.
 */
async function readReportedFailure(reported: Locator): Promise<string> {
  const text = collapseWhitespace((await reported.first().textContent()) ?? '');

  return text === '' ? 'the panel reported a failure without a message' : text;
}

/**
 * Waits for a failure left by an earlier attempt to clear, so it cannot be read as this attempt's
 * outcome.
 *
 * The panel drops a reported failure the moment a new change begins — it clears the failure before it
 * calls the port — so an alert that is showing now belongs to an attempt that is over. The wait is
 * bounded and best-effort: when the failure does not clear, the settle that follows still reports
 * whatever the panel shows.
 *
 * @param reported The panel's failure region.
 * @param timeoutMs How long to give it.
 */
async function clearReportedFailure(reported: Locator, timeoutMs: number): Promise<void> {
  const first = reported.first();

  if (!(await first.isVisible())) {
    return;
  }

  await first.waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => undefined);
}

/* ---------------------------------------------------------------------------------------------
 * The export surface — three functions, AAP 0.13.1's and AAP 0.15.1's `e2e/helpers/*`
 * ------------------------------------------------------------------------------------------- */

/**
 * Opens the single simulation popover the shell's `Simulated data` badge activates, and returns once
 * its panel is on screen.
 *
 * Drives `src/app/simulation-controls.tsx` — the `role="dialog"` panel named by the exact
 * specification §5.3 label `Simulated control` — through `src/components/simulated-data-badge.tsx`,
 * the one control in the banner landmark whose accessible name carries the `Simulated data` label and
 * which announces `aria-haspopup="dialog"`. Serves T-13 and T-17 directly and T-15 and T-08's
 * partial-failure path, which `e2e/s1-governance.spec.ts`, `e2e/s1-labelling-and-states.spec.ts` and
 * `e2e/s1-approvals-audit.spec.ts` drive through the functions below.
 *
 * Idempotent: a panel that is already open is left as it is, so a spec may call this before each of
 * several triggers without closing the panel it just used. Both paths leave the panel open, because
 * the badge's activation only ever sets the shell store's `simulationOpen` to true.
 *
 * The panel is left open deliberately. It is the demonstration's own surface, and a spec that needs
 * the page behind it unobstructed closes it the way a reader does — `Escape`, which the panel binds
 * on the document for as long as it is mounted. Nothing here presses a control to close it, because
 * the wording of that control belongs to the panel and this module types no label of its own.
 *
 * @param page The Playwright page showing the application.
 * @throws Error when the top bar renders no control carrying the `Simulated data` label or more than
 *   one, when that control cannot act (quoting its explanation, rule P-8), or when no panel named
 *   `Simulated control` becomes visible.
 */
export async function openSimulationControls(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: SIMULATED_CONTROL_NAME });

  if (await dialog.first().isVisible()) {
    return;
  }

  /* The badge's accessible name is the first of the seven §5.3 strings — `Simulated data` — followed
     by the demonstration's clock. The lookup is a substring match on that fixed label rather than on
     the whole name, because the clock is a value the badge supplies and this module must not become a
     second owner of it (rule P-1). */
  const banner = page.getByRole('banner');
  const activator = banner.getByRole('button', { name: 'Simulated data' });
  const found = await activator.count();

  if (found === 0) {
    throw new Error(
      `openSimulationControls: the top bar renders no control whose accessible name contains the §5.3 label "Simulated data", so the badge that opens the simulation popover is missing, or it renders as a non-interactive span because the shell supplied no activation (rule P-8). ${await describeControlsIn(banner, 'The top bar')}.`,
    );
  }

  if (found > 1) {
    throw new Error(
      `openSimulationControls: ${found} controls in the top bar answer to the §5.3 label "Simulated data", so activating one of them would not prove which control a reader reaches. Rule P-1 asks for one badge, mounted once by the shell above the router outlet. ${await describeControlsIn(banner, 'The top bar')}.`,
    );
  }

  const control = activator.first();
  await awaitCanAct(
    page,
    control,
    'the badge that opens the simulation popover',
    'openSimulationControls',
  );
  await control.click();

  try {
    await dialog.first().waitFor({ state: 'visible', timeout: DIALOG_OPEN_TIMEOUT_MS });
  } catch (cause) {
    throw new Error(
      `openSimulationControls: activated the badge whose accessible name carries the §5.3 label "Simulated data", but no dialog named "${SIMULATED_CONTROL_NAME}" became visible within ${DIALOG_OPEN_TIMEOUT_MS} ms. The badge is a product feature rather than a test hook, so a panel that does not open is a defect in the popover and not something a spec can route around.`,
      { cause },
    );
  }
}

/**
 * Puts the demonstration into one of the nine triggers the single simulation popover offers, and
 * returns once the panel reports that trigger in effect.
 *
 * Drives `src/app/simulation-controls.tsx`, whose seven screen states and two further triggers are
 * the only levers the specification allows: the panel is labelled `Simulated control` (rule P-4) and
 * a trigger changes what the mock adapter answers rather than which branch a screen takes, so the
 * state a spec asserts afterwards is the one the reader would see. Serving T-13 (the stale source),
 * T-15 and T-17 (the seven states, the simulated edit of a recorded audit result and the emptied
 * queue) and T-08's partial-failure path; T-16 replays the same journeys without a pointer.
 *
 * The control is resolved from the panel's own rendered names, never from wording written here: the
 * plan fixes no copy for the nine per-state controls, so this function reads what the panel renders
 * and ranks it against the flag's token. The tiers and the fit that separates `empty` from
 * `empty-queue` are documented at {@link selectControl}.
 *
 * Idempotent for a trigger already in effect: the panel's controls are toggles, so a second press
 * would lift the trigger rather than set it, and a spec that repeats a call wants the demonstration
 * to stay where it asked for it. A refusal is reported with the panel's own message instead of
 * surfacing as a timeout, and a change that simply never settles reports what the control shows.
 *
 * @param page The Playwright page showing the application.
 * @param flag One of the nine members of `SimulationFlag`: the seven screen states, `tampered-audit`
 *   (the simulated control that edits a recorded audit result without recomputing its hash, so
 *   verification reports where the chain broke and repairs nothing) or `empty-queue`.
 * @throws Error when `flag` is not one of the nine triggers, when no single control matches it, when
 *   the control cannot act (quoting its explanation, rule P-8), when the panel reports a refusal, or
 *   when the trigger never reaches its applied state.
 */
export async function triggerSimulationState(page: Page, flag: SimulationFlag): Promise<void> {
  /* A spec can walk a table or a loop and reach this function with a value the union never saw, and
     the failure that would follow is a search for a control that cannot exist. Widening to `string`
     for the check keeps the guard meaningful to the compiler as well as at run time. */
  const requested: string = flag;

  if (!isSimulationFlag(requested)) {
    throw new Error(
      `triggerSimulationState: ${JSON.stringify(requested)} is not one of the triggers the simulation popover offers, so no control can produce it. Accepted triggers: ${SIMULATION_FLAGS.join(', ')} (SimulationFlag in src/types/service.ts).`,
    );
  }

  await openSimulationControls(page);

  const dialog = page.getByRole('dialog', { name: SIMULATED_CONTROL_NAME });
  const token = normalise(requested);
  const tokenWords = wordsOf(token);
  const chosen = selectControl(await enumerateControls(dialog), requested, token, tokenWords);

  /* A trigger already in effect is answered before the control is inspected for actionability: the
     panel's controls are toggles, so a second press would lift the trigger rather than set it, and a
     repeat of a trigger that is already on has nothing to ask the port for. Doing this first also keeps
     a repeat working while the panel is still busy with a change in flight, which refuses a press. */
  if (await isInEffect(chosen)) {
    return;
  }

  await awaitCanAct(
    page,
    chosen.control,
    `the control for the "${requested}" trigger, rendered as ${JSON.stringify(chosen.name)}`,
    'triggerSimulationState',
  );

  const applied = await resolveAppliedSignal(page, dialog, chosen);
  const reported = dialog.getByRole('alert');
  await clearReportedFailure(reported, ACTIONABLE_TIMEOUT_MS);
  await activate(chosen);

  if (!applied.fromControl) {
    /* The fallback proof above only means something once the change has started, so the panel's busy
       line is given a bounded chance to appear before its clearing is awaited. Nothing is delayed for
       this: both waits are on the panel's own state. */
    await dialog
      .getByRole('status')
      .and(page.locator(':not(:empty)'))
      .waitFor({ state: 'attached', timeout: ACTIONABLE_TIMEOUT_MS })
      .catch(() => undefined);
  }

  const outcome = await settleOn(applied.locator, applied.state, reported, CONTROL_SETTLE_TIMEOUT_MS);

  if (outcome === 'applied') {
    return;
  }

  if (outcome === 'reported') {
    throw new Error(
      `triggerSimulationState: the simulation popover refused to put the demonstration into the "${requested}" state, so the control stays where it was and nothing on screen claims otherwise (rule P-8). It reports: ${await readReportedFailure(reported)}`,
    );
  }

  const observed = await chosen.control.getAttribute('aria-pressed');
  throw new Error(
    `triggerSimulationState: activated ${JSON.stringify(chosen.name)} for the "${requested}" trigger, but the panel did not report the trigger in effect within ${CONTROL_SETTLE_TIMEOUT_MS} ms: the control carries aria-pressed="${observed ?? '(absent)'}", and the panel reported no failure.`,
  );
}

/**
 * Restores the seeded records through the single simulation popover, lifting every trigger with them.
 *
 * Drives the `Reset demo data` control of `src/app/simulation-controls.tsx` — the panel named by the
 * exact specification §5.3 label `Simulated control` — which calls the port's `resetDemo()`: the
 * adapter's records and triggers return to the seed, while the persona the session acts as and
 * everything else the reader chose in the shell stay as they were, and the panel closes itself.
 * Serving T-13, which asserts the stale-source banner and resets afterwards; T-15, whose "Simulated
 * data" badge and demonstration clock a reset leaves as they stand; and T-17, which walks the states
 * and the two further triggers and resets at the end.
 *
 * A reload would restore the seed too, and that is exactly why this function never does one: a page
 * load would make a broken reset indistinguishable from a working one, so the reset has to travel
 * through the port and prove itself. Its proof is the panel closing — the component closes the panel
 * once `resetDemo()` resolves — and a refusal is reported with the panel's
 * own message instead of surfacing as a timeout.
 *
 * @param page The Playwright page showing the application.
 * @throws Error when the panel renders no single control named `Reset demo data`, when that control
 *   cannot act (quoting its explanation, rule P-8), when the panel reports a refusal, or when the
 *   panel does not close within the settle bound.
 */
export async function resetDemoData(page: Page): Promise<void> {
  await openSimulationControls(page);

  const dialog = page.getByRole('dialog', { name: SIMULATED_CONTROL_NAME });
  const control = dialog.getByRole('button', { name: RESET_ACTION_NAME, exact: true });
  const found = await control.count();

  if (found === 0) {
    throw new Error(
      `resetDemoData: the simulation popover renders no control whose accessible name is exactly "${RESET_ACTION_NAME}", so the demonstration's records cannot be restored through it. ${await describeControlsIn(dialog, 'The panel')}.`,
    );
  }

  if (found > 1) {
    throw new Error(
      `resetDemoData: ${found} controls in the panel are named "${RESET_ACTION_NAME}", so activating one of them would not prove which action a reader takes. ${await describeControlsIn(dialog, 'The panel')}.`,
    );
  }

  const target = control.first();
  await awaitCanAct(page, target, `the "${RESET_ACTION_NAME}" control`, 'resetDemoData');

  const reported = dialog.getByRole('alert');
  await clearReportedFailure(reported, ACTIONABLE_TIMEOUT_MS);
  await target.click();

  const outcome = await settleOn(dialog, 'hidden', reported, CONTROL_SETTLE_TIMEOUT_MS);

  if (outcome === 'applied') {
    return;
  }

  if (outcome === 'reported') {
    throw new Error(
      `resetDemoData: the simulation popover refused to restore the seeded records, so the session keeps the state it had and nothing on screen claims otherwise (rule P-8). It reports: ${await readReportedFailure(reported)}`,
    );
  }

  throw new Error(
    `resetDemoData: activated "${RESET_ACTION_NAME}", but the panel was still open after ${CONTROL_SETTLE_TIMEOUT_MS} ms and reported no failure. The component closes its own panel once the reset resolves, so a panel that stays open means the reset never settled.`,
  );
}
