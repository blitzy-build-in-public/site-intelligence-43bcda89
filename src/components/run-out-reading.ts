/**
 * The run-out pair as the reading AAP §0.8 requires: the day contracts §4 rule 4 reports, followed by
 * the half-day wording that says where inside that day the position ran out — "day 5, end of day",
 * "day 4, midday".
 *
 * WHY THE WORDING LIVES HERE. AAP §0.8 fixes the presentation of the pair — "`fractionOfDay` shown as
 * the day plus a half-day reading such as 'midday'" — while the solver keeps returning the two numbers
 * rule 4 measures. `src/types/solver.ts` states the same division on `RunOut`: the interface renders
 * the pair as a single reading, "and that wording is presentation, so it lives in `src/components`".
 * This module is that owner, and it holds nothing else: two total functions over a `RunOut` and the
 * wording they compose.
 *
 * WHY THREE HALF-DAY READINGS RATHER THAN THE FRACTION. The fraction of a day is a solver measurement a
 * reader cannot act on — "0.5" of 9 December says nothing a planner can carry into a plan. What the
 * interface states is the qualitative half of the day the run-out falls in, which is the reading AAP
 * §0.8 names, and it does so without discarding the measurement: the evidence drawer's formula string
 * states the exact pair behind every figure (`handlers/evidence.ts`), so the qualitative wording on a
 * screen and the exact fraction in the evidence answer different questions rather than the same one
 * twice. The two boundaries are what make the wording a half-day reading: below a quarter of the day
 * the position was gone when the day opened, so the day reads as its start; from a quarter through
 * three quarters it reads as the middle of the day; and from three quarters on it reads as the day's
 * end. Retyping the fraction here instead would state a number no source fixes a format for.
 *
 * NOTHING IS TYPED HERE (rule P-6). The module types no figure: the day every reading prints comes
 * from the `RunOut` argument, and the only numbers in it are the two mapping boundaries and the
 * solver's "no run-out" marker, each documented at its declaration. The wording itself is held once, in
 * {@link RUN_OUT_READING_TEXT}, so a surface and its suite name the same strings.
 *
 * Rules served: P-6 (no typed figure, no typed record identifier), P-1 (a run-out is a computed figure;
 * the surface that draws it carries its §5.3 label, which is the caller's business rather than this
 * module's), B-1 and B-2 (no address, no request, no configuration), P-2 (no service, no seed record,
 * no domain import — the pair arrives as a value).
 */
import type { RunOut } from '../types';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every word this module states, held here so the run-out reading has one owner.
 *
 * The three half-day readings are AAP §0.8's own ("the day plus a half-day reading such as 'midday'");
 * the rest is the vocabulary of the two sentences the screens compose from it. None of it carries a
 * figure, an amount, a date or a record identifier: the day, the separator's spacing and the full stop
 * are the only punctuation, and the day number is printed from the argument (rule P-6).
 */
export const RUN_OUT_READING_TEXT = {
  /** The word before the day number, so a bare numeral never stands on its own. */
  dayWord: 'day',

  /** The three half-day readings, in the order a day passes: its start, its middle, and its end. */
  halfDay: {
    startOfDay: 'start of day',
    midday: 'midday',
    endOfDay: 'end of day',
  },

  /** What separates the day from its half-day reading inside one compact phrase. */
  readingSeparator: ', ',

  /** The compact phrase for a pair whose day is the solver's "no run-out" marker. */
  noRunOut: 'no run-out inside the window',

  /** The opening of the prose statement, which the compact phrase and a full stop complete. */
  statementLead: 'runs out on',

  /** The prose statement for a pair whose day is the solver's "no run-out" marker. */
  statementNoRunOut: 'does not run out inside the projection window.',

  /** What closes the prose statement. */
  fullStop: '.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The mapping from the measured fraction to the half-day reading
 * ------------------------------------------------------------------------------------------- */

/**
 * The `day` a `RunOut` carries when no run-out falls inside the projection window.
 *
 * `src/domain/solver/solve-supply-delay.ts` declares this marker as `NO_RUN_OUT_DAY` and documents it:
 * a run-out inside the window is numbered from one, so zero is left to mean the position survived
 * every working day of it. The value is restated here rather than imported because a component does
 * not reach into the domain layer (AAP §0.18.1 boundary discipline); it is a sentinel, not a figure a
 * reader is ever shown, and {@link runOutReading} answers it with wording instead of a day number.
 */
const NO_RUN_OUT_DAY = 0;

/**
 * The fraction of a day from which the day no longer reads as its start.
 *
 * A quarter of the way through is where a reading stops describing the opening of the day: the solver
 * reports `0` when the position was already gone when the day opened, and anything past that up to the
 * midpoint reads as the middle of the day.
 */
const MIDDAY_FROM = 0.25;

/**
 * The fraction of a day from which the day reads as its end: three quarters through, the position
 * covered most of the day, and `1` is the solver's "went on covering it to its end".
 */
const END_OF_DAY_FROM = 0.75;

/**
 * Whether a pair reports no run-out inside the projection window.
 *
 * @param runOut - The pair the solver measured.
 * @returns True when the pair carries the solver's no-run-out marker.
 */
function isNoRunOut(runOut: RunOut): boolean {
  return runOut.day === NO_RUN_OUT_DAY;
}

/**
 * The half-day wording for one fraction of a day.
 *
 * The two comparisons are ordered and total over the values `RunOut` documents — the fraction runs from
 * the start of the day towards its end — so a fraction below the first boundary reads as the day's
 * start and one at or beyond the second reads as its end, and every value in between reads as midday.
 *
 * @param fractionOfDay - How far through the day the run-out falls, as the pair states it.
 * @returns One of the three readings {@link RUN_OUT_READING_TEXT} holds.
 */
function halfDayReadingOf(fractionOfDay: number): string {
  if (fractionOfDay < MIDDAY_FROM) {
    return RUN_OUT_READING_TEXT.halfDay.startOfDay;
  }

  if (fractionOfDay < END_OF_DAY_FROM) {
    return RUN_OUT_READING_TEXT.halfDay.midday;
  }

  return RUN_OUT_READING_TEXT.halfDay.endOfDay;
}

/* ---------------------------------------------------------------------------------------------
 * The two readings the surfaces compose
 * ------------------------------------------------------------------------------------------- */

/**
 * The compact reading a table cell or a figure states: the day and its half-day wording.
 *
 * AAP §0.8 fixes the form — "the day plus a half-day reading such as 'midday'" — and the day is printed
 * from the pair rather than typed, so the reading cannot disagree with the measurement behind it
 * (rule P-6). A pair carrying the no-run-out marker states that the position survived the window
 * instead of naming a day it does not have.
 *
 * @param runOut - The pair the solver measured, as the service returned it.
 * @returns A reading such as `day 5, end of day`, or the no-run-out phrase.
 */
export function runOutReading(runOut: RunOut): string {
  if (isNoRunOut(runOut)) {
    return RUN_OUT_READING_TEXT.noRunOut;
  }

  return [
    `${RUN_OUT_READING_TEXT.dayWord} ${String(runOut.day)}`,
    halfDayReadingOf(runOut.fractionOfDay),
  ].join(RUN_OUT_READING_TEXT.readingSeparator);
}

/**
 * The same pair as a sentence fragment for prose, lowercase at its start and closed with a full stop.
 *
 * A screen that states the reading inside a sentence of its own — SCR-03's projection names the option
 * it belongs to first — cannot use the compact form without leaving the sentence without a verb, so
 * this is the one place that verb and the closing full stop are written.
 *
 * @param runOut - The pair the solver measured, as the service returned it.
 * @returns A fragment such as `runs out on day 5, end of day.`, or the no-run-out sentence.
 */
export function runOutStatement(runOut: RunOut): string {
  if (isNoRunOut(runOut)) {
    return RUN_OUT_READING_TEXT.statementNoRunOut;
  }

  return `${RUN_OUT_READING_TEXT.statementLead} ${runOutReading(runOut)}${RUN_OUT_READING_TEXT.fullStop}`;
}
