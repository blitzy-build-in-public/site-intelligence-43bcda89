/**
 * The working-day calendar of the demonstration: Monday to Friday, no public holidays.
 *
 * `platform-contracts.md` §1 fixes the calendar as a Monday-to-Friday working week with no public
 * holidays, so Thursday 24 and Friday 25 December 2026 are both working days and the window the
 * solver projects (3 to 23 December 2026) contains no special day. The solver walks this calendar to
 * project closing stock, count line idle days and find the run-out day; the aggregates use it where
 * a readiness or an urgency figure spans days.
 *
 * Every function here is pure and total. A date arrives and leaves as an `IsoDate` (`YYYY-MM-DD`) —
 * never a `Date`, never a millisecond count, because the solver's arithmetic and the records it works
 * from are plain calendar dates. The one function that reads a record's instant, `calendarDateOf`,
 * only reads the calendar date that record itself states: nothing is converted to the host time zone
 * and no `Date` parses it. Nothing reads the clock, the host time zone or a locale: every computation
 * runs on the UTC timestamp `Date.UTC` returns, so a machine in any time zone gets the same answer and
 * a date never shifts by a day across a time-zone or daylight-saving boundary. A malformed input
 * yields the neutral value documented on each function rather than a throw, so the solver's own input
 * validation is what reports a bad case, naming the offending input in its constraint messages.
 *
 * This module is the pure core's one civil-date implementation. A day number counts whole days from
 * 1 January 1970, and the four functions below are the only place a calendar date becomes a day
 * number, a day number becomes a date, a date moves by whole days, or an instant is read as the date
 * it states — so `../aggregation/overview` and `../aggregation/ledger`, which need the same
 * arithmetic for the fourteen-day series, the changed-since window and the ledger's thirty days,
 * express it through these functions rather than through their own copies. A correction to a leap
 * rule, a month length or a date format is therefore made once, here, and every module that dates a
 * record answers identically.
 */

import type { IsoDate, Timestamp } from '../../types';

/** Millisecond length of one civil day, the step every walk over the calendar takes. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Number of `-`-separated parts in an `IsoDate`, which is `YYYY-MM-DD`. */
const DATE_PART_COUNT = 3;

/** Accepted shape of the year part of an `IsoDate`. */
const YEAR_FORMAT = /^\d{4}$/;

/** Accepted shape of the month and of the day part of an `IsoDate`. */
const MONTH_DAY_FORMAT = /^\d{2}$/;

/** `getUTCDay()` value of Monday, the first working day of the week. */
const MONDAY = 1;

/** `getUTCDay()` value of Friday, the last working day of the week. */
const FRIDAY = 5;

/** Days a weekend can occupy: Saturday and Sunday, the two non-working days of the week. */
const WEEKEND_LENGTH = 2;

/**
 * Forward steps `nextWorkingDay` may take before it gives up and returns its argument: the whole
 * weekend plus the working day it lands on.
 */
const MAX_FORWARD_STEPS = WEEKEND_LENGTH + 1;

/** Width the year is padded to when a UTC timestamp is rendered back to an `IsoDate`. */
const YEAR_WIDTH = 4;

/** Width the month and the day are padded to when a UTC timestamp is rendered back to an `IsoDate`. */
const MONTH_DAY_WIDTH = 2;

/**
 * Characters an `IsoDate` occupies at the head of an ISO 8601 instant, which is where an instant
 * states the calendar date it falls on in its own offset.
 */
const ISO_DATE_LENGTH = 10;

/**
 * Renders a UTC timestamp as an `IsoDate`.
 *
 * The caller passes a timestamp `Date.UTC` produced, so the arithmetic stays in UTC and the result
 * is the calendar date that timestamp names, whatever the host time zone reads.
 *
 * @param millis A UTC timestamp in milliseconds.
 * @returns The calendar date it names, as `YYYY-MM-DD`.
 */
function formatIsoDate(millis: number): IsoDate {
  const moment = new Date(millis);
  const year = String(moment.getUTCFullYear()).padStart(YEAR_WIDTH, '0');
  const month = String(moment.getUTCMonth() + 1).padStart(MONTH_DAY_WIDTH, '0');
  const day = String(moment.getUTCDate()).padStart(MONTH_DAY_WIDTH, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Checks that a timestamp falls on Monday to Friday.
 *
 * @param millis A UTC timestamp in milliseconds.
 * @returns `true` for Monday to Friday, `false` for Saturday and Sunday.
 */
function isWorkingWeekday(millis: number): boolean {
  const weekday = new Date(millis).getUTCDay();

  return weekday >= MONDAY && weekday <= FRIDAY;
}

/**
 * Parses an `IsoDate` into the UTC timestamp of its midnight.
 *
 * The parts are checked for shape first, because `noUncheckedIndexedAccess` leaves each one possibly
 * absent, and then checked by round trip: `Date.UTC` silently rolls an out-of-range value forward
 * (30 February becomes 2 March, month 13 becomes January of the next year), so a date that does not
 * render back to the string it came from is malformed rather than a shifted day. That one comparison
 * is what rejects every impossible calendar date, and it also rejects a four-digit year the platform
 * would otherwise remap, so no input is ever quietly relabelled.
 *
 * @param date The date to parse, expected as `YYYY-MM-DD`.
 * @returns The UTC timestamp of that date's midnight, or `null` when the text is not a well-formed
 *   calendar date.
 */
function toUtcMillis(date: IsoDate): number | null {
  const parts = date.split('-');

  if (parts.length !== DATE_PART_COUNT) {
    return null;
  }

  const yearPart = parts[0];
  const monthPart = parts[1];
  const dayPart = parts[2];

  if (yearPart === undefined || monthPart === undefined || dayPart === undefined) {
    return null;
  }

  if (!YEAR_FORMAT.test(yearPart) || !MONTH_DAY_FORMAT.test(monthPart) || !MONTH_DAY_FORMAT.test(dayPart)) {
    return null;
  }

  const millis = Date.UTC(Number(yearPart), Number(monthPart) - 1, Number(dayPart));

  return formatIsoDate(millis) === date ? millis : null;
}

/**
 * Reports whether a calendar date is a working day.
 *
 * Implements the calendar of `platform-contracts.md` §1: Monday to Friday are working days and
 * Saturday and Sunday are not, with no holiday table, no configuration and no parameter to supply
 * one — 24 December 2026, a Thursday, is therefore a working day. A malformed date reports `false`.
 *
 * @param date The date to test, as `YYYY-MM-DD`, such as `2026-12-24`.
 * @returns `true` for Monday to Friday, `false` for a weekend or a malformed date.
 */
export function isWorkingDay(date: IsoDate): boolean {
  const millis = toUtcMillis(date);

  if (millis === null) {
    return false;
  }

  return isWorkingWeekday(millis);
}

/**
 * Counts the working days in the half-open interval `[from, to)`.
 *
 * Implements the calendar of `platform-contracts.md` §1 over the half-open interval: `from` counts
 * when it is a working day and `to` never does, which is the only convention that composes — summing
 * two adjacent spans counts the boundary day once instead of twice. So 24 to 29 December 2026 holds
 * 24, 25 and 28 December and returns `3`. A `to` on or before `from` returns `0`, and so does a
 * malformed date at either end.
 *
 * @param from The first day of the interval, included, as `YYYY-MM-DD`.
 * @param to The day the interval ends on, excluded, as `YYYY-MM-DD`.
 * @returns The number of working days in `[from, to)`, or `0` for an empty interval or a malformed
 *   date.
 */
export function workingDaysBetween(from: IsoDate, to: IsoDate): number {
  const fromMillis = toUtcMillis(from);
  const toMillis = toUtcMillis(to);

  if (fromMillis === null || toMillis === null || toMillis <= fromMillis) {
    return 0;
  }

  let workingDays = 0;

  for (let millis = fromMillis; millis < toMillis; millis += DAY_MS) {
    if (isWorkingWeekday(millis)) {
      workingDays += 1;
    }
  }

  return workingDays;
}

/**
 * Finds the first working day at or after a date.
 *
 * Implements the calendar of `platform-contracts.md` §1. Because no day is a holiday, the function
 * is idempotent on a working day — 24 December 2026, a Thursday, returns itself — and only a weekend
 * moves the answer forward, to the following Monday: 26 December 2026, a Saturday, returns
 * `2026-12-28`. A malformed date returns its argument unchanged.
 *
 * @param date The earliest acceptable day, as `YYYY-MM-DD`.
 * @returns `date` itself when it is a working day, the next Monday when it falls on a weekend, and
 *   `date` unchanged when it is malformed.
 */
export function nextWorkingDay(date: IsoDate): IsoDate {
  const millis = toUtcMillis(date);

  if (millis === null) {
    return date;
  }

  for (let step = 0; step < MAX_FORWARD_STEPS; step += 1) {
    const candidate = millis + step * DAY_MS;

    if (isWorkingWeekday(candidate)) {
      return formatIsoDate(candidate);
    }
  }

  return date;
}

/**
 * Lists every working day in the closed interval `[from, to]`.
 *
 * Implements the calendar of `platform-contracts.md` §1 over the closed interval, both ends
 * included, in ascending order: 3 to 9 December 2026 yields the five days from Thursday 3 to
 * Wednesday 9 December and omits the weekend of 5 and 6 December. This is the walk the solver uses
 * to project closing stock across its window. A `to` before `from` returns an empty list, and so
 * does a malformed date at either end.
 *
 * @param from The first day of the interval, included, as `YYYY-MM-DD`.
 * @param to The last day of the interval, included, as `YYYY-MM-DD`.
 * @returns The working days of `[from, to]` in ascending order, or an empty list for a reversed or
 *   malformed interval.
 */
export function workingDaysInRange(from: IsoDate, to: IsoDate): IsoDate[] {
  const fromMillis = toUtcMillis(from);
  const toMillis = toUtcMillis(to);

  if (fromMillis === null || toMillis === null || toMillis < fromMillis) {
    return [];
  }

  const workingDays: IsoDate[] = [];

  for (let millis = fromMillis; millis <= toMillis; millis += DAY_MS) {
    if (isWorkingWeekday(millis)) {
      workingDays.push(formatIsoDate(millis));
    }
  }

  return workingDays;
}

/**
 * Counts the days from 1 January 1970 to a calendar date.
 *
 * A day number is the calendar's own unit: it moves by exactly one at every midnight, so moving a
 * date by whole days is addition on it and comparing two of them orders two dates. The value is `0`
 * on 1 January 1970 itself and negative before it. Validity is the round trip `toUtcMillis` applies,
 * so a date the calendar would roll forward — 30 February, a thirteenth month, a thirty-first day of
 * a thirty-day month — is rejected here rather than relabelled, and no caller has to re-test a date's
 * shape or the length of its month.
 *
 * @param date The date to read, as `YYYY-MM-DD`.
 * @returns The day number, or `null` when the text is not a well-formed calendar date.
 */
export function dayNumberFromIsoDate(date: IsoDate): number | null {
  const millis = toUtcMillis(date);

  return millis === null ? null : millis / DAY_MS;
}

/**
 * Renders a day number as an `IsoDate`.
 *
 * The inverse of `dayNumberFromIsoDate` for every date that function accepts: the day number becomes
 * a UTC timestamp again and is rendered from that timestamp's UTC fields, so no host zone can shift
 * the answer by a day.
 *
 * @param dayNumber The day number to render, counted from 1 January 1970 in the scale
 *   `dayNumberFromIsoDate` produces, negative before it.
 * @returns The calendar date it names, as `YYYY-MM-DD`.
 */
export function isoDateFromDayNumber(dayNumber: number): IsoDate {
  return formatIsoDate(dayNumber * DAY_MS);
}

/**
 * Shifts a calendar date by a whole number of days.
 *
 * The day-number conversion is what makes the shift exact: adding days to a day number crosses month
 * and year boundaries, the leap day of a leap February included, without a month-length table. The
 * overview's fourteen-day series and its changed-since window are both built with it.
 *
 * @param date The date to shift, as `YYYY-MM-DD`.
 * @param days The days to move it by, negative to move backwards.
 * @returns The shifted date, or `null` when the argument is not a well-formed calendar date.
 */
export function shiftIsoDate(date: IsoDate, days: number): IsoDate | null {
  const dayNumber = dayNumberFromIsoDate(date);

  return dayNumber === null ? null : isoDateFromDayNumber(dayNumber + days);
}

/**
 * Reads the calendar date an instant falls on, in the offset the instant states.
 *
 * An instant is ISO 8601 with an offset (contracts §1), so its opening ten characters are the calendar
 * date at the place the record was written — the application's time zone — whatever the host's own
 * zone reads. That date is then held to the calendar, so an instant opening with 30 February states no
 * day rather than a day rolled into March. Nothing is converted, no `Date` parses the instant and no
 * clock is consulted: the record's own text is the whole of the input.
 *
 * @param instant The instant to read, as ISO 8601 with an offset.
 * @returns That calendar date, or `null` when the opening characters are not a well-formed date.
 */
export function calendarDateOf(instant: Timestamp): IsoDate | null {
  const date = instant.slice(0, ISO_DATE_LENGTH);

  return date.length === ISO_DATE_LENGTH && dayNumberFromIsoDate(date) !== null ? date : null;
}
