// @vitest-environment node

/**
 * Unit suite for `rounding.ts`, the only rounding module in the codebase.
 *
 * `platform-contracts.md` §4 rule 5 fixes line idle days as half up to two decimals and §5 fixes
 * alternate-source and package readiness as half up to a whole percent, so each helper is asserted
 * against what its own doc comment promises: the documented ties, ordinary roundings, the
 * hundredth and whole-number granularity of every result, the zero form the guard returns, freedom
 * from `NaN` over the documented domain, and determinism. The expected values are the rounding
 * rule's own arithmetic, not business figures.
 *
 * Node environment: the module is pure arithmetic with no DOM, judged by the values it returns.
 */

import { describe, expect, it } from 'vitest';

import { halfUp2, wholePercent } from './rounding';

/* ---------------------------------------------------------------------------------------------
 * Cases — the ties and the ordinary roundings each function's doc comment describes
 * ------------------------------------------------------------------------------------------- */

/** Two-decimal ties: `halfUp2` rounds each one up, away from the lower hundredth. */
const HALF_UP_TIES: Array<[value: number, rounded: number]> = [
  [2.345, 2.35],
  [1.005, 1.01],
  [0.045, 0.05],
  [0.125, 0.13],
  [0.375, 0.38],
  [100.555, 100.56],
];

/** Values that are not ties, rounded to the nearer hundredth. */
const HALF_UP_ORDINARY: Array<[value: number, rounded: number]> = [
  [2.674, 2.67],
  [3.14159, 3.14],
  [12.5, 12.5],
  [0.001, 0],
  [9.999, 10],
];

/** Percentage ties: `wholePercent` rounds each one up to the next whole percent. */
const PERCENT_TIES: Array<[fraction: number, percent: number]> = [
  [0.775, 78],
  [0.005, 1],
  [0.125, 13],
];

/** Fractions that are not ties, converted to the nearer whole percent. */
const PERCENT_ORDINARY: Array<[fraction: number, percent: number]> = [
  [0.7777, 78],
  [0.5, 50],
  [1, 100],
  [0, 0],
  [0.0123, 1],
  [0.334, 33],
  [0.666, 67],
  [0.999, 100],
];

/** Finite, non-negative figures spread across `halfUp2`'s documented domain. */
const FIGURES = [0, 0.001, 0.045, 0.125, 0.775, 1, 2.345, 2.674, 3.14159, 9.999, 12.5, 99.999, 100];

/** Fractions of a whole spread across `wholePercent`'s documented domain, `[0, 1]`. */
const FRACTIONS = [0, 0.005, 0.0123, 0.125, 0.334, 0.5, 0.666, 0.775, 1];

/** A computed zero, and a negative zero, which the doc comment says must leave as positive zero. */
const ZERO_INPUTS = [0, -0];

/**
 * Whether a value already sits exactly on a hundredth, which is the granularity `halfUp2`
 * guarantees: a value carrying no finer fraction of a unit survives a round trip through hundredths
 * unchanged.
 */
function sitsOnHundredth(value: number): boolean {
  return Math.round(value * 100) / 100 === value;
}

/* ---------------------------------------------------------------------------------------------
 * halfUp2 — contracts §4 rule 5
 * ------------------------------------------------------------------------------------------- */

describe('halfUp2', () => {
  it.each(HALF_UP_TIES)('rounds the tie %d up to %d', (value, rounded) => {
    expect(halfUp2(value)).toBe(rounded);
  });

  it.each(HALF_UP_ORDINARY)('rounds %d to the nearer hundredth, %d', (value, rounded) => {
    expect(halfUp2(value)).toBe(rounded);
  });

  it('rounds the binary artefact of 0.1 + 0.2 down to 0.3', () => {
    // The sum is 0.30000000000000004 in binary floating point; the rounding removes the artefact.
    expect(halfUp2(0.1 + 0.2)).toBe(0.3);
  });

  it.each(FIGURES)('returns %d as a finite multiple of 0.01', (value) => {
    const rounded = halfUp2(value);

    expect(Number.isFinite(rounded)).toBe(true);
    expect(sitsOnHundredth(rounded)).toBe(true);
  });

  it.each(FIGURES)('never returns NaN for the finite non-negative input %d', (value) => {
    expect(Number.isNaN(halfUp2(value))).toBe(false);
  });

  it.each(ZERO_INPUTS)('returns positive zero, never negative zero, for the input %d', (value) => {
    const rounded = halfUp2(value);

    expect(Object.is(rounded, 0)).toBe(true);
    expect(Object.is(rounded, -0)).toBe(false);
  });
});

/* ---------------------------------------------------------------------------------------------
 * wholePercent — contracts §5
 * ------------------------------------------------------------------------------------------- */

describe('wholePercent', () => {
  it.each(PERCENT_TIES)('rounds the tie %d up to %d per cent', (fraction, percent) => {
    expect(wholePercent(fraction)).toBe(percent);
  });

  it.each(PERCENT_ORDINARY)('converts %d to the nearer whole percent, %d', (fraction, percent) => {
    expect(wholePercent(fraction)).toBe(percent);
  });

  it.each(FRACTIONS)('returns %d as a whole number of per cent', (fraction) => {
    const percent = wholePercent(fraction);

    expect(Number.isInteger(percent)).toBe(true);
    expect(percent).toBeGreaterThanOrEqual(0);
    expect(percent).toBeLessThanOrEqual(100);
  });

  it.each(FRACTIONS)('never returns NaN for the fraction %d', (fraction) => {
    expect(Number.isNaN(wholePercent(fraction))).toBe(false);
  });

  it.each(ZERO_INPUTS)('returns positive zero, never negative zero, for the input %d', (value) => {
    const percent = wholePercent(value);

    expect(Object.is(percent, 0)).toBe(true);
    expect(Object.is(percent, -0)).toBe(false);
  });
});

/* ---------------------------------------------------------------------------------------------
 * Determinism — a module-level mutable value or a hidden cache would show up here
 * ------------------------------------------------------------------------------------------- */

describe('determinism', () => {
  it('gives halfUp2 the same answer for the same input, whatever ran in between', () => {
    const firstPass = FIGURES.map((value) => halfUp2(value));
    const percentages = FRACTIONS.map((fraction) => wholePercent(fraction));
    const secondPass = FIGURES.map((value) => halfUp2(value));

    expect(percentages).toEqual(FRACTIONS.map((fraction) => wholePercent(fraction)));
    expect(secondPass).toEqual(firstPass);
  });

  it('gives wholePercent the same answer for the same input, whatever ran in between', () => {
    const firstPass = FRACTIONS.map((fraction) => wholePercent(fraction));
    const figures = FIGURES.map((value) => halfUp2(value));
    const secondPass = FRACTIONS.map((fraction) => wholePercent(fraction));

    expect(figures).toEqual(FIGURES.map((value) => halfUp2(value)));
    expect(secondPass).toEqual(firstPass);
  });
});
