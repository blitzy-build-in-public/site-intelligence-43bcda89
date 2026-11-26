/**
 * The only rounding in the codebase.
 *
 * Every other module that shows a business figure rounds it by calling one of the two functions
 * below, so each displayed number has exactly one rounding rule behind it and no second rule can
 * drift into an aggregate or a screen.
 *
 * Both functions are pure and total over their documented domain: a finite, non-negative input
 * yields a finite, non-negative number, never `NaN`. Neither clamps, throws, formats or validates
 * its argument — the caller establishes the domain, and the rounding returns a number so the
 * formatting layer above it keeps control of the presentation.
 */

/** Hundredths in a unit, which is also the whole-percent scale: "two decimals" and "per cent". */
const SCALE = 100;

/** Added to a scaled value before flooring, which turns the floor into a half-up round. */
const HALF = 0.5;

/**
 * Relative tie guard. Binary floating point represents most decimal fractions inexactly, so a value
 * reading as an exact tie in decimal can land a hair either side of that tie once scaled. The guard
 * grows with the magnitude, so it recovers the tie the decimal reading implies while staying far
 * below any precision a computed figure carries.
 */
const TIE_GUARD = 1e-12;

/**
 * Rounds a computed figure to two decimal places, half up.
 *
 * Implements contracts §4 rule 5: line idle days accumulate per working day and are shown rounded
 * half up to two decimals. A tie rounds up, towards positive infinity (`2.345` becomes `2.35` and
 * `1.005` becomes `1.01`), and the result is always a multiple of `0.01` held as a `number`, never
 * as text, so the caller keeps the numeric type its arithmetic needs.
 *
 * @param value The figure to round. Its documented domain is finite and non-negative; a computed
 *   zero returns as `0`, never as negative zero.
 * @returns The value rounded to hundredths, half up.
 */
export function halfUp2(value: number): number {
  const scaled = value * SCALE;
  const rounded = Math.floor(scaled + HALF + Math.abs(scaled) * TIE_GUARD) / SCALE;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Converts a fraction of a whole into a whole-number percentage, half up.
 *
 * Implements contracts §5: alternate-source readiness and package readiness are shown half up to a
 * whole percent. The argument is a fraction, not a percentage — the caller divides the passing
 * parts by the total before calling, so a part-over-whole ratio arrives as `0.7777` and leaves as
 * `78`. A tie rounds up (`0.775` becomes `78`), and the result is a whole number in `[0, 100]`.
 *
 * @param fraction A part over its whole, in `[0, 1]`, such as `0.775`.
 * @returns The equivalent percentage as a whole number, half up.
 */
export function wholePercent(fraction: number): number {
  const percentage = fraction * SCALE;
  const rounded = Math.floor(percentage + HALF + Math.abs(percentage) * TIE_GUARD);
  return rounded === 0 ? 0 : rounded;
}
