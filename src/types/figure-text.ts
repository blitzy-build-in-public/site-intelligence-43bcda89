/**
 * The text two layers of the application render one record with: the interface's one money formatter
 * and the run-out reading AAP §0.8 fixes.
 *
 * WHY THE RENDERINGS SIT IN THIS FOLDER RATHER THAN IN `src/components`. The comparison matrix states
 * every measure of an option and the comparison CSV states the same measures of the same option, and
 * the checkpoint holds the export to the screen ("export payload equals the screen"). A service module
 * may not import `src/components` — AAP §0.18.1's boundary discipline keeps the service tier below the
 * presentation tier — so a rendering that lived only in a component could never be the export's. A
 * rendering the export wrote for itself was a second copy of the first, and it drifted exactly as two
 * copies do: the matrix stated `18.600 EUR` and the file stated `18600.00` for one record's amount.
 * Holding both renderings here leaves each with one owner that both layers reach, and leaves the
 * component that draws them with nothing to restate.
 *
 * `CANNOT_COMPUTE_LABEL` in `./primitives` is the precedent, stated in its own words: a word both the
 * matrix and the CSV state lives in this folder, beside the vocabulary the inputs fix, because the CSV
 * builder is a service module that may not import a feature module (AAP §0.18.1). A rendering that
 * both layers state has the same single copy for the same reason.
 *
 * WHAT IT IMPORTS, AND WHY THAT KEEPS IT A LEAF. The only import is `RunOut` as a type from
 * `./solver` — the shape the run-out reading renders — and nothing else, so no module of the folder
 * gains an edge it did not have and neither reading can reach a service, an adapter, a seed record or
 * the domain layer that measures what it states. `src/components/mono-value.tsx` and
 * `src/components/run-out-reading.ts` re-export what their importers already read from them, so the
 * screens keep importing the module they always imported while the rule itself has one home.
 *
 * Both renderings are presentation and change no value (AAP §0.8, rule P-6). The money rule groups and
 * labels the amount it is handed and re-rounds nothing; the run-out rule prints the day the pair
 * carries with the half-day wording "the day plus a half-day reading such as 'midday'". Neither types
 * a figure: the amount and the day arrive as arguments, and the only numbers written here are the two
 * fraction boundaries and the solver's no-run-out marker, each documented at its declaration.
 *
 * Rules served: P-6 (a rendering, never a value, and no typed figure), P-1 (a figure rendered here
 * carries the §5.3 label of the surface that draws it, which is the caller's business rather than this
 * module's), B-1 and B-2 (no address, no request, no configuration), P-2 (no service, no adapter, no
 * seed record).
 */
import type { RunOut } from './solver';

/* ---------------------------------------------------------------------------------------------
 * Money — one amount, one formatter, for the screen and the export alike
 * ------------------------------------------------------------------------------------------- */

/**
 * The interface's one money formatter, created once at module load and reused for every amount it
 * renders, because compiling a locale's number pattern is the expensive part of formatting.
 *
 * The options are AAP §0.8's: the `de-DE` locale supplies the thousands separator and the decimal
 * comma that Europe/Berlin business figures are read with, `currencyDisplay: 'code'` prints the
 * currency as a code rather than as a symbol, and the fraction range of zero to two digits prints a
 * whole amount without decimals and at most the two decimals `Money` carries. An amount is not
 * re-rounded here — two decimals is the contract's own precision, not a presentation choice.
 *
 * ICU separates the amount from the code with a no-break space, which is the shape the plan writes as
 * an amount followed by the code, joined by a space that cannot break across a line. That separator is
 * deliberately not rewritten to a plain space: no input fixes another one, and a post-processing step
 * would put a second formatting rule inside the module that is meant to hold exactly one.
 *
 * This is rendering 1 of the four `src/components/mono-value.tsx` records, and the only one this
 * module emits. A sentence a record owns quotes its amount with the code first and a comma between
 * thousands — rendering 2 there — and neither shape is a typo in the other, so do not "fix" the
 * separator in a seed record or here. Rendering 3 there, a dot-decimal CSV field, is retired: the
 * comparison CSV reproduces the screen, so its Added cost and Value deferred cells are this formatter's
 * text, character for character.
 */
const MONEY_FORMAT = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats one amount, or hands back the input's own text when it has no formatted form.
 *
 * Exported so every surface that states an amount prints the same text: a component's `<span>`, an SVG
 * `<text>`, which has no children of another namespace, and the comparison CSV's money cells, which a
 * service module composes. Formatting still has one owner — this function — and no caller applies a
 * second rule to what it returns.
 *
 * Only a finite number is formatted. A string is returned untouched rather than parsed, because
 * parsing would silently reinterpret a caller's mistake — one dotted digit group is twenty-one and
 * three tenths to a number parser and twenty-one thousand to the reader — and a number that is not
 * finite has no formatted form at all. Both cases leave the raw input in the text as the marker of the
 * defect, which is what rule P-6 asks for: never a formatted `NaN` and never a substituted zero.
 *
 * @param value - The amount exactly as the record states it.
 * @returns The amount with the currency code and at most two decimals, or the input as text.
 */
export function formatMoney(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return MONEY_FORMAT.format(value);
  }

  return String(value);
}

/* ---------------------------------------------------------------------------------------------
 * The run-out reading — the wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * The run-out pair as the reading AAP §0.8 requires: the day contracts §4 rule 4 reports, followed by
 * the half-day wording that says where inside that day the position ran out — "day 5, end of day",
 * "day 4, midday".
 *
 * AAP §0.8 fixes the presentation of the pair — "`fractionOfDay` shown as the day plus a half-day
 * reading such as 'midday'" — while the solver keeps returning the two numbers rule 4 measures, so the
 * wording needs an owner of its own, and both surfaces that draw a run-out need the same one: the
 * matrix's Run-out row and the CSV's row of the same name.
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
 * end. Retyping the fraction instead would state a number no source fixes a format for.
 *
 * NOTHING IS TYPED HERE (rule P-6). The module types no figure: the day every reading prints comes from
 * the `RunOut` argument, and the only numbers in it are the two mapping boundaries and the solver's
 * "no run-out" marker, each documented at its declaration. The wording itself is held once, in
 * {@link RUN_OUT_READING_TEXT}, so a surface and its suite name the same strings.
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

/**
 * The `day` a `RunOut` carries when no run-out falls inside the projection window.
 *
 * `src/domain/solver/solve-supply-delay.ts` declares this marker as `NO_RUN_OUT_DAY` and documents it:
 * a run-out inside the window is numbered from one, so zero is left to mean the position survived
 * every working day of it. The value is restated here rather than imported because `src/types` is a
 * leaf that no domain module may be depended on from (AAP §0.18.1 boundary discipline, and `./solver`
 * declares shapes only); it is a sentinel, not a figure a reader is ever shown, and
 * {@link runOutReading} answers it with wording instead of a day number.
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
 * covered most of the day, and `1` is the solver's "went on covering it to the end".
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

/**
 * The compact reading a table cell, a figure or an export's measure cell states: the day and its
 * half-day wording.
 *
 * AAP §0.8 fixes the form — "the day plus a half-day reading such as 'midday'" — and the day is printed
 * from the pair rather than typed, so the reading cannot disagree with the measurement behind it (rule
 * P-6). A pair carrying the no-run-out marker states that the position survived the window instead of
 * naming a day it does not have.
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
