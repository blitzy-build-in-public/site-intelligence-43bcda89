/**
 * The outbound ledger aggregate of SCR-07: one row per endpoint the deployment declares, carrying
 * that endpoint's declared purpose and state beside the two counts the audit trail supports over the
 * last thirty days and the last attempt on record.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §5, which fixes the computed aggregates and states the ledger's counts as
 *   the audit events that name an endpoint as their object, split by result.
 * - AAP 0.8's computation table, which fixes this module's arithmetic: the last thirty days' events
 *   whose `objectRef` is the endpoint, split by result, as integers with no rounding.
 * - AAP 0.12.1's "Ledger aggregates" row, which fixes the public interface —
 *   `computeLedger(events, sovereignty, clock)` returning `LedgerRow[]` — and records the module's
 *   dependency as types only.
 * - AAP 0.6.3, which fixes the declared outbound endpoints as blocked by policy and never contacted:
 *   the ledger reports what the trail recorded about them and generates no traffic of its own.
 *
 * The declared half of a row is copied from the sovereignty record, so this module names no endpoint,
 * invents none beyond the declared set, and types no record value into code (rule P-6). A row carries
 * counts, an instant and record text, so it needs neither the money nor the data-source vocabulary.
 *
 * One source for the rows. `SovereigntyStatus` carries a `ledger` member, and this function is the
 * single computation that fills it: it reads that member as the declared configuration, recomputes
 * both counts and the last attempt from the events it is handed, and returns fresh row objects. A
 * caller stores this result and keeps no second, hand-written copy of the counts, so the declared
 * configuration and the counted columns cannot drift apart.
 *
 * Determinism and purity (AAP 0.2.1, AAP 0.18.2). The window is derived from the `clock` argument —
 * the demonstration clock — and never from the system clock: the module reads no system time, builds
 * no `Date` object, opens no random source and holds no mutable module-level state. Timestamps are
 * located by integer arithmetic over their own fields, so the same input yields the same rows on every
 * engine and on every run. Counts are whole numbers, so no rounding is applied and none is needed; no
 * money value, percentage or locale formatting passes through the module. Both input arrays are read
 * and never modified.
 *
 * Rules this module is built to satisfy:
 * - P-6: every number in a row is counted from the events handed in. The module types no count, no
 *   endpoint and no threshold, and the one fixed number it carries is the contracts' window length.
 * - P-4: a row reports what the configuration declares and what the audit trail recorded, and claims
 *   no verified state. The screen renders the declared half under the fixed `Declared, not verified`
 *   label, and this module supplies no member with which a screen could claim more.
 * - P-2: it imports the shared types and nothing else — no seed record, no adapter, no service module
 *   and no React — so it cannot become a second data boundary.
 * - P-5: the ledger counts first-party audit events only; no market-intelligence value reaches it and
 *   nothing here blends a competitor figure into a first-party count.
 * - B-1 and B-2: the module contacts nothing and reads no configuration, because a count is derived
 *   from records that already exist. There is no request, no address and no credential in it.
 *
 * OPEN ITEM: an event belongs to a row when its `objectRef` equals the row's endpoint exactly, which
 * is the rule AAP 0.8 states. A deployment whose trail names an endpoint differently — a full URL
 * where the record holds a host, or the reverse — counts zero against that row; closing the gap needs
 * a normalisation rule the inputs do not state, so none is invented here.
 * OPEN ITEM: `LedgerRow` declares no member for the action an attempt recorded, so a row cannot say
 * what was attempted. The instant, the declared text and the two counts are the whole of what the DTO
 * declares, and nothing is added to it.
 */

import type {
  AuditEvent,
  AuditResult,
  LedgerRow,
  SovereigntyStatus,
  Timestamp,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * Constants fixed by the contracts
 * ------------------------------------------------------------------------------------------- */

/**
 * The number of calendar days a ledger count covers: the last thirty, fixed by contracts §5.
 *
 * Held once, so the window the counts are taken over exists in a single place and every endpoint is
 * measured against the same rule.
 */
const WINDOW_DAYS = 30;

/* ---------------------------------------------------------------------------------------------
 * Constants of the calendar arithmetic
 * ------------------------------------------------------------------------------------------- */

const MINUTES_PER_HOUR = 60;

const SECONDS_PER_MINUTE = 60;

const SECONDS_PER_HOUR = MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

const HOURS_PER_DAY = 24;

const SECONDS_PER_DAY = HOURS_PER_DAY * SECONDS_PER_HOUR;

/** Years in a Gregorian era, which is also the leap-cycle length for the century rule. */
const ERA_YEARS = 400;

/** Days in a Gregorian era: 400 common years plus the century-corrected leap days. */
const ERA_DAYS = 146097;

/** Days in a common year, before the leap day is added. */
const COMMON_YEAR_DAYS = 365;

const LEAP_CYCLE_YEARS = 4;

const CENTURY_YEARS = 100;

/**
 * Days from 1970-01-01 back to the origin of the day count below, so that the epoch itself reads as
 * day zero.
 */
const CIVIL_EPOCH_SHIFT = 719468;

/** Months in a year, the highest month a timestamp field may name. */
const MONTHS_IN_YEAR = 12;

/** Days in the longest month, the highest day-of-month a timestamp field may name. */
const DAYS_IN_LONGEST_MONTH = 31;

/** The last hour of a day, and the last minute and second of an hour and a minute. */
const LAST_HOUR_OF_DAY = 23;

const LAST_MINUTE_OF_HOUR = 59;

const LAST_SECOND_OF_MINUTE = 59;

/**
 * The shape of an ISO 8601 instant as contracts §1 fixes it: a calendar date, a clock time, optional
 * seconds with optional sub-second digits, and an offset either as `Z` or as a signed hour and minute.
 *
 * Named groups are used so the fields are read by name rather than by position, which keeps the
 * parser readable and each read checkable against the field it expects. Sub-second digits are
 * accepted because they belong to the format, and are not read: an audit event's sequence already
 * orders two events recorded in the same second.
 */
const TIMESTAMP_PATTERN =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2})(?:\.(?<fraction>\d+))?)?(?<zone>Z|(?<sign>[+-])(?<offsetHours>\d{2}):(?<offsetMinutes>\d{2}))$/;

/* ---------------------------------------------------------------------------------------------
 * Locating a timestamp: the window boundary and the ordering both read this
 * ------------------------------------------------------------------------------------------- */

/**
 * Where an instant sits: the calendar day it falls on in the offset it records, and the instant itself
 * as whole seconds from the epoch.
 *
 * Both halves are needed and neither replaces the other. The window is stated in calendar days, so a
 * comparison needs the day; the last attempt is stated as an instant, so ordering needs a value that
 * stays correct when two records carry different offsets — the same wall-clock reading in a summer
 * offset and in a winter one is two different instants an hour apart.
 */
interface LocatedInstant {
  /** The calendar day the instant falls on, counted in the offset the timestamp records. */
  day: number;

  /** The instant in whole seconds from the epoch, so instants at different offsets compare. */
  epochSeconds: number;
}

/** One of the pattern's fields, read as a number, or `null` when the field is absent. */
function digitsOf(groups: Record<string, string>, name: string): number | null {
  const text = groups[name];
  if (text === undefined) {
    return null;
  }
  const value = Number(text);
  return Number.isInteger(value) ? value : null;
}

/** The offset a timestamp records, in minutes east of UTC, or `null` when it records none. */
function offsetMinutesOf(groups: Record<string, string>): number | null {
  if (groups['zone'] === 'Z') {
    return 0;
  }
  const sign = groups['sign'];
  const hours = digitsOf(groups, 'offsetHours');
  const minutes = digitsOf(groups, 'offsetMinutes');
  if (sign === undefined || hours === null || minutes === null) {
    return null;
  }
  const magnitude = hours * MINUTES_PER_HOUR + minutes;
  return sign === '-' ? -magnitude : magnitude;
}

/**
 * The number of days from the epoch to a calendar date, in the proleptic Gregorian calendar.
 *
 * The days-from-civil conversion: pure integer arithmetic over the date's own fields, so it reads no
 * clock, allocates nothing and answers identically on every engine. Dates are held as a day count
 * rather than as an instant because the window's boundary is stated in calendar days.
 *
 * The day-of-year step below is the conversion's own month-length expression — floor((153m + 2) / 5)
 * for the March-based month index `m` — whose constants come from the lengths of the twelve months
 * and carry no meaning of their own.
 */
function dayNumberOf(year: number, month: number, dayOfMonth: number): number {
  const shiftedYear = month <= 2 ? year - 1 : year;
  const era = Math.floor(shiftedYear / ERA_YEARS);
  const yearOfEra = shiftedYear - era * ERA_YEARS;
  const marchMonth = month > 2 ? month - 3 : month + 9;
  const dayOfYear = Math.floor((153 * marchMonth + 2) / 5) + dayOfMonth - 1;
  const dayOfEra =
    yearOfEra * COMMON_YEAR_DAYS +
    Math.floor(yearOfEra / LEAP_CYCLE_YEARS) -
    Math.floor(yearOfEra / CENTURY_YEARS) +
    dayOfYear;
  return era * ERA_DAYS + dayOfEra - CIVIL_EPOCH_SHIFT;
}

/**
 * Locates an ISO 8601 instant, or answers `null` when the value is not one this module can place.
 *
 * A value that is not an ISO 8601 instant, or whose fields name a date or a time of day that cannot
 * exist, cannot be assigned to a day or ordered against another instant, so it is reported as
 * unlocatable rather than guessed at. Every timestamp the adapter supplies is ISO 8601 with an offset
 * by construction (contracts §1).
 */
function locate(timestamp: Timestamp): LocatedInstant | null {
  const match = TIMESTAMP_PATTERN.exec(timestamp);
  if (match === null || match.groups === undefined) {
    return null;
  }
  const groups = match.groups;
  const year = digitsOf(groups, 'year');
  const month = digitsOf(groups, 'month');
  const dayOfMonth = digitsOf(groups, 'day');
  const hour = digitsOf(groups, 'hour');
  const minute = digitsOf(groups, 'minute');
  const offsetMinutes = offsetMinutesOf(groups);
  if (
    year === null ||
    month === null ||
    dayOfMonth === null ||
    hour === null ||
    minute === null ||
    offsetMinutes === null
  ) {
    return null;
  }
  const second = digitsOf(groups, 'second') ?? 0;
  const fieldsDescribeAnInstant =
    month >= 1 &&
    month <= MONTHS_IN_YEAR &&
    dayOfMonth >= 1 &&
    dayOfMonth <= DAYS_IN_LONGEST_MONTH &&
    hour <= LAST_HOUR_OF_DAY &&
    minute <= LAST_MINUTE_OF_HOUR &&
    second <= LAST_SECOND_OF_MINUTE;
  if (!fieldsDescribeAnInstant) {
    return null;
  }
  const day = dayNumberOf(year, month, dayOfMonth);
  const epochSeconds =
    day * SECONDS_PER_DAY +
    hour * SECONDS_PER_HOUR +
    minute * SECONDS_PER_MINUTE +
    second -
    offsetMinutes * SECONDS_PER_MINUTE;
  return { day, epochSeconds };
}

/**
 * The calendar day the ledger's window ends on: the clock's own day.
 *
 * Kept as one helper so the boundary rule exists in a single place and every endpoint is counted
 * against the same window.
 *
 * @throws RangeError When the clock is not an ISO 8601 instant, because no window can be derived and a
 *   silently empty window would report a count of zero for every endpoint.
 */
function windowEndDayOf(clock: Timestamp): number {
  const located = locate(clock);
  if (located === null) {
    throw new RangeError(
      `computeLedger needs the demonstration clock as an ISO 8601 instant with an offset; received "${clock}".`,
    );
  }
  return located.day;
}

/* ---------------------------------------------------------------------------------------------
 * The result mapping, stated once
 * ------------------------------------------------------------------------------------------- */

/** The two columns a ledger row counts. */
type LedgerColumn = 'allowed' | 'blocked';

/**
 * The column an event's result contributes to, or `null` where it contributes to neither.
 *
 * Implements the split AAP 0.12.1 fixes. `'allowed'` and `'blocked'` are the two decisions an
 * outbound call can be given, so each counts in its own column. `'succeeded'` and `'failed'` record
 * how a write that did happen turned out, which is not a decision about a call; counting either in a
 * column would misreport what that column means, so both are excluded here by name rather than
 * folded in by a catch-all.
 */
function columnOf(result: AuditResult): LedgerColumn | null {
  switch (result) {
    case 'allowed':
      return 'allowed';
    case 'blocked':
      return 'blocked';
    case 'succeeded':
    case 'failed':
      return null;
  }
}

/* ---------------------------------------------------------------------------------------------
 * The aggregate
 * ------------------------------------------------------------------------------------------- */

/**
 * Builds the outbound ledger: one row per endpoint the sovereignty record declares, in that record's
 * own order, carrying the declared purpose and state beside the two counts the audit trail supports
 * over the last thirty days and the last attempt on record.
 *
 * Implements contracts §5's ledger counts (AAP 0.8's "Ledger counts" row) for specification SCR-07,
 * and is the single computation behind `SovereigntyStatus.ledger` (AAP 0.12.1): a caller stores the
 * rows this returns and keeps no second, hand-written copy of the counts.
 *
 * The counting rule, stated so that a reader can reproduce a row by hand:
 * - The window is the `WINDOW_DAYS` calendar days ending on the clock's own day, both ends included.
 *   With the demonstration clock of 2026-12-03 the covered days therefore run from 2026-11-04 through
 *   2026-12-03, which is thirty days. Each event is assigned to the calendar day its own offset
 *   records, and the clock's day counts in full, so an instant recorded later on that day is inside
 *   the window too — the window's boundary is a day, which is what the column's label states.
 * - An event belongs to a row when its `objectRef` equals that row's endpoint exactly. An event whose
 *   `objectRef` names no declared endpoint belongs to no row and is ignored, so an endpoint the trail
 *   mentions but the record does not declare cannot add a row of its own.
 * - `allowed` counts the window's events whose result is `'allowed'`, and `blocked` counts those
 *   whose result is `'blocked'`. The remaining two results are counted in neither column, for the
 *   reason `columnOf` states.
 * - `lastAttempt` is the timestamp of the most recent event naming the endpoint — the later instant
 *   wins, and two events at the same instant are ordered by the higher `sequence`. It stays `null`
 *   when no event names the endpoint, which is the "never contacted" value `LedgerRow` declares. It is
 *   deliberately not limited to the window: the column reports when the endpoint was last attempted,
 *   which is a fact about the trail rather than about the last thirty days.
 *
 * An event whose timestamp is not a locatable ISO 8601 instant contributes to neither count and is
 * never a last attempt, because it can be placed in no window and ordered against no other instant.
 * The records the adapter supplies are ISO 8601 with an offset by construction (contracts §1).
 *
 * The returned rows are fresh objects: the declared record and the events are both read and neither
 * is modified, so the same arguments produce the same rows in the same order on every call.
 *
 * @param events The audit chain's events, read and not modified. Only the events naming a declared
 *   endpoint contribute to a row.
 * @param sovereignty The sovereignty record whose `ledger` member declares the endpoints, their
 *   order, and each one's purpose and state. Any counts or last attempt already present in that
 *   record are recomputed here, so a stale hand-written value cannot reach a screen.
 * @param clock The demonstration clock the window ends on, as an ISO 8601 instant.
 * @returns One row per declared endpoint, in the declared order.
 * @throws RangeError When `clock` is not an ISO 8601 instant, because no window can be derived from
 *   it and a silently empty window would report a count of zero for every endpoint.
 */
export function computeLedger(
  events: readonly AuditEvent[],
  sovereignty: SovereigntyStatus,
  clock: Timestamp,
): LedgerRow[] {
  const windowEndDay = windowEndDayOf(clock);
  const windowStartDay = windowEndDay - (WINDOW_DAYS - 1);

  return sovereignty.ledger.map((declared) => {
    let allowed = 0;
    let blocked = 0;
    let lastAttempt: Timestamp | null = null;
    let lastAttemptSeconds = 0;
    let lastAttemptSequence = 0;

    for (const event of events) {
      if (event.objectRef !== declared.endpoint) {
        continue;
      }
      const located = locate(event.timestamp);
      if (located === null) {
        continue;
      }

      if (located.day >= windowStartDay && located.day <= windowEndDay) {
        const column = columnOf(event.result);
        if (column === 'allowed') {
          allowed += 1;
        } else if (column === 'blocked') {
          blocked += 1;
        }
      }

      const laterInstant = located.epochSeconds > lastAttemptSeconds;
      const laterInTheSameInstant =
        located.epochSeconds === lastAttemptSeconds && event.sequence > lastAttemptSequence;
      if (lastAttempt === null || laterInstant || laterInTheSameInstant) {
        lastAttempt = event.timestamp;
        lastAttemptSeconds = located.epochSeconds;
        lastAttemptSequence = event.sequence;
      }
    }

    return {
      endpoint: declared.endpoint,
      purpose: declared.purpose,
      state: declared.state,
      lastAttempt,
      allowed,
      blocked,
    };
  });
}
