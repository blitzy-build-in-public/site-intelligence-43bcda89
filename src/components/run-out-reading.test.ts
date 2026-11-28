/**
 * Unit suite for `run-out-reading.ts`, the module that renders the solver's run-out pair as the
 * reading AAP §0.8 requires: the day plus a half-day wording such as "midday".
 *
 * WHAT IT PROVES. That both readings are composed from the pair rather than typed — the day in every
 * expectation is the one the case handed over, and every word around it comes from
 * {@link RUN_OUT_READING_TEXT}, so a reworded reading reaches this suite and the screens together
 * (rule P-6) — that the two boundaries of the half-day mapping fall on the side the module documents,
 * and that the solver's no-run-out marker is answered with wording rather than with "day 0".
 *
 * WHY THE BOUNDARIES ARE CASES OF THEIR OWN. A quarter and three quarters of a day are the two
 * fractions the mapping turns on, and each sits on the inclusive side of its comparison: a quarter
 * already reads as the middle of the day, and three quarters as its end. A case that only sampled the
 * ends of the range would pass with either boundary moved.
 *
 * WHERE THE EXPECTATIONS COME FROM. Every expected string is assembled from the module's own text
 * constants, and the pairs are plain integers a case states: nothing is copied out of a rendered screen
 * or out of the expected-results fixtures, and no "day N" phrase is written here (rule P-6).
 */

import { describe, expect, it } from 'vitest';

import type { RunOut } from '../types';
import { RUN_OUT_READING_TEXT, runOutReading, runOutStatement } from './run-out-reading';

/* ---------------------------------------------------------------------------------------------
 * The values a case states, and the readings the module's own text composes from them
 * ------------------------------------------------------------------------------------------- */

/**
 * The day every reading in this suite names.
 *
 * A small plain integer, chosen because a real run-out is numbered from one within the projection
 * window and nothing about the reading depends on which day it is.
 */
const DAY = 5;

/** The two fractions the half-day mapping turns on, which a case below sits exactly on. */
const QUARTER_DAY = 0.25;
const THREE_QUARTERS_DAY = 0.75;

/** A pair whose run-out falls inside the projection window, on {@link DAY}. */
function pairAt(fractionOfDay: number): RunOut {
  return { day: DAY, fractionOfDay };
}

/**
 * The pair the solver reports when no run-out falls inside the projection window.
 *
 * `solve-supply-delay.ts` leaves day zero to mean exactly that, because a real run-out is numbered from
 * one; the reading must state the survival rather than print the marker as a day.
 */
const NO_RUN_OUT: RunOut = { day: 0, fractionOfDay: 0 };

/** The compact reading for a half-day wording, assembled from the module's day word and separator. */
function readingFor(halfDay: string): string {
  return [`${RUN_OUT_READING_TEXT.dayWord} ${String(DAY)}`, halfDay].join(
    RUN_OUT_READING_TEXT.readingSeparator,
  );
}

/** The prose statement for a compact reading, assembled from the module's own lead and full stop. */
function statementFor(reading: string): string {
  return `${RUN_OUT_READING_TEXT.statementLead} ${reading}${RUN_OUT_READING_TEXT.fullStop}`;
}

/* ---------------------------------------------------------------------------------------------
 * The suite
 * ------------------------------------------------------------------------------------------- */

describe('run-out reading', () => {
  /**
   * One case per fraction, each proving both readings at once: the compact phrase a table cell shows
   * and the sentence fragment a screen composes into its own prose.
   */
  it.each([
    {
      what: 'a run-out at the opening of the day reads as its start',
      fractionOfDay: 0,
      halfDay: RUN_OUT_READING_TEXT.halfDay.startOfDay,
    },
    {
      what: 'a run-out half way through the day reads as midday',
      fractionOfDay: 0.5,
      halfDay: RUN_OUT_READING_TEXT.halfDay.midday,
    },
    {
      what: 'a run-out at the close of the day reads as its end',
      fractionOfDay: 1,
      halfDay: RUN_OUT_READING_TEXT.halfDay.endOfDay,
    },
    {
      what: 'a quarter of the way through is already the middle of the day',
      fractionOfDay: QUARTER_DAY,
      halfDay: RUN_OUT_READING_TEXT.halfDay.midday,
    },
    {
      what: 'three quarters of the way through is already the end of the day',
      fractionOfDay: THREE_QUARTERS_DAY,
      halfDay: RUN_OUT_READING_TEXT.halfDay.endOfDay,
    },
  ])('states the day with its half-day wording: $what', ({ fractionOfDay, halfDay }) => {
    const runOut = pairAt(fractionOfDay);
    const reading = readingFor(halfDay);

    expect(runOutReading(runOut)).toBe(reading);
    expect(runOutStatement(runOut)).toBe(statementFor(reading));
  });

  it('states that the position survived the window, rather than printing the no-run-out marker as a day', () => {
    /* Both readings answer the solver's marker with wording: "day 0" would name a day the projection
       does not have, and a reader would take it for the first day of the window (AAP §0.8). */
    expect(runOutReading(NO_RUN_OUT)).toBe(RUN_OUT_READING_TEXT.noRunOut);
    expect(runOutStatement(NO_RUN_OUT)).toBe(RUN_OUT_READING_TEXT.statementNoRunOut);
  });
});
