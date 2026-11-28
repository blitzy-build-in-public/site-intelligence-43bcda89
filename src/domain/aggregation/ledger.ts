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
 *   dependency as types only. The one dependency it gains is `../solver/calendar`, the pure core's
 *   single civil-date implementation: the day an event falls on is that module's answer rather than a
 *   second copy of the same arithmetic.
 * - AAP 0.6.3, which fixes the declared outbound endpoints as blocked by policy and never contacted:
 *   the ledger reports what the trail recorded about them and generates no traffic of its own.
 *
 * The declared half of a row is copied from the sovereignty record, so this module names no endpoint,
 * invents none beyond the declared set, and types no record value into code (rule P-6). A row carries
 * counts, an instant and record text, so it needs neither the money nor the data-source vocabulary.
 *
 * One source for the rows. The declared record carries a `ledger` member naming each endpoint with
 * its purpose and state, and this function is the single computation that fills it in: it takes that
 * member as the declared configuration, counts both columns and the last attempt from the events it
 * is handed, and returns fresh row objects. The three counted members are absent from the input by
 * construction, so a caller hands the record in as it stands and fabricates nothing to satisfy the
 * call; because it stores this result and keeps no second, hand-written copy, the declared
 * configuration and the counted columns cannot drift apart.
 *
 * One pass over the trail. The declared record names the rows, so its endpoints seed the accumulators
 * and the events are then walked once for all of them together: an event's `objectRef` selects the
 * accumulator it feeds, and its timestamp is located a single time, that one answer serving both the
 * window test and the last-attempt comparison. Counting each declared endpoint by filtering the whole
 * trail for it — the shape this module used to have — parses every event's instant once per endpoint
 * and derives the same value repeatedly inside one request (AAP 0.2.1: a pure aggregate derives each
 * figure once per request; AAP 0.8).
 *
 * Determinism and purity (AAP 0.2.1, AAP 0.18.2). The window is derived from the `clock` argument —
 * the demonstration clock — and never from the system clock: the module reads no system time, opens no
 * random source and holds no mutable module-level state, and the only `Date` its arithmetic reaches is
 * the UTC timestamp `../solver/calendar` builds from a date the record itself states, so no host zone
 * is read. A timestamp is located by integer arithmetic over its own fields and the calendar date it
 * falls on comes from that same calendar module, so the same input yields the same rows on every
 * engine and on every run. Counts are whole numbers, so no rounding is applied and none is needed; no
 * money value, percentage or locale formatting passes through the module. Both input arrays are read
 * and never modified.
 *
 * REFUSING A CLOCK IT CANNOT PLACE (AAP 0.2.2, AAP 0.12.3). The clock fixes the window's end, so an
 * instant the module cannot locate leaves no window to count over, and a silently empty window would
 * report a count of zero for every endpoint. The aggregate therefore refuses, and the refusal is typed:
 * `UnlocatableClockError` carries the clock value it was handed, and the mock adapter reports it as a
 * `'validation'` `Problem` naming that cause with the call's trace identifier, so nothing untyped
 * crosses the service port. It is raised rather than returned because AAP 0.12.1 fixes the result as
 * `LedgerRow[]`, which has no member for an outcome. An event whose own timestamp cannot be located is
 * not a refusal: it contributes to no column and is never a last attempt, since the counts cover the
 * events that can be placed.
 *
 * Rules this module is built to satisfy:
 * - P-6: every number in a row is counted from the events handed in. The module types no count, no
 *   endpoint and no threshold, and the one fixed number it measures against — the window's length —
 *   is read from the `LEDGER_WINDOW_DAYS` constant of `src/types` rather than typed here.
 * - P-4: a row reports what the configuration declares and what the audit trail recorded, and claims
 *   no verified state. The screen renders the declared half under the fixed `Declared, not verified`
 *   label, and this module supplies no member with which a screen could claim more.
 * - P-2: it imports the shared types and the pure core's calendar module — no seed record, no adapter,
 *   no service module and no React — so it cannot become a second data boundary. The calendar date an
 *   event falls on is `../solver/calendar`'s answer, not a copy of the arithmetic kept beside it.
 * - P-5: the ledger counts first-party audit events only; no market-intelligence value reaches it and
 *   nothing here blends a competitor figure into a first-party count.
 * - B-1 and B-2: the module contacts nothing and reads no configuration, because a count is derived
 *   from records that already exist. There is no request, no address and no credential in it.
 *
 * Matching an event to a row. An event belongs to a row when its `objectRef` equals the row's endpoint
 * exactly, which is the rule AAP 0.8 states. A deployment whose trail names an endpoint differently —
 * a full URL where the record holds a host, or the reverse — counts zero against that row; closing the
 * gap needs a normalisation rule the inputs do not state, so none is invented here.
 *
 * What a row holds. `LedgerRow` declares no member for the action an attempt recorded, so a row cannot
 * say what was attempted: the instant, the declared text and the two counts are the whole of what the
 * DTO declares, and nothing is added to it.
 */

import { LEDGER_WINDOW_DAYS } from '../../types';
import type { AuditEvent, AuditResult, IsoDate, LedgerRow, Timestamp } from '../../types';
import { dayNumberFromIsoDate } from '../solver/calendar';

/* ---------------------------------------------------------------------------------------------
 * Constants of the instant arithmetic: the clock-time fields, the offset and the epoch second
 * ------------------------------------------------------------------------------------------- */

const MINUTES_PER_HOUR = 60;

const SECONDS_PER_MINUTE = 60;

const SECONDS_PER_HOUR = MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

const HOURS_PER_DAY = 24;

const SECONDS_PER_DAY = HOURS_PER_DAY * SECONDS_PER_HOUR;

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

/**
 * The offset a timestamp records, in minutes east of UTC, or `null` when it records a value this
 * module will not place.
 *
 * Both fields are held to the bounds the clock time uses, so `+24:00` and `+99:99` are refused
 * rather than read as a displacement no zone announces, which would land the instant on a day it
 * does not fall on. Every offset a real zone keeps — up to `+14:00` and down to `-23:59` — stays
 * inside those bounds, and `Z` still reads as zero.
 */
function offsetMinutesOf(groups: Record<string, string>): number | null {
  if (groups['zone'] === 'Z') {
    return 0;
  }
  const sign = groups['sign'];
  const hours = digitsOf(groups, 'offsetHours');
  const minutes = digitsOf(groups, 'offsetMinutes');
  if (
    sign === undefined ||
    hours === null ||
    minutes === null ||
    hours > LAST_HOUR_OF_DAY ||
    minutes > LAST_MINUTE_OF_HOUR
  ) {
    return null;
  }
  const magnitude = hours * MINUTES_PER_HOUR + minutes;
  return sign === '-' ? -magnitude : magnitude;
}

/**
 * The calendar-date half of a matched instant, as `YYYY-MM-DD`, or `null` when a field is absent.
 *
 * The pattern's own date fields are read verbatim rather than re-formatted, so the string this
 * produces is the one the record states and the calendar module judges it unaltered.
 *
 * @param groups The pattern's named groups for one matched timestamp.
 * @returns The recorded calendar date, or `null` when the pattern supplied none of its three fields.
 */
function dateTextOf(groups: Record<string, string>): IsoDate | null {
  const year = groups['year'];
  const month = groups['month'];
  const day = groups['day'];
  if (year === undefined || month === undefined || day === undefined) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

/**
 * Locates an ISO 8601 instant, or answers `null` when the value is not one this module can place.
 *
 * A value that is not an ISO 8601 instant, or whose fields name a date, a time of day or an offset
 * that cannot exist, cannot be assigned to a day or ordered against another instant, so it is
 * reported as unlocatable rather than guessed at. The date's validity is `../solver/calendar`'s
 * judgement, taken from `dayNumberFromIsoDate`: that is what makes 31 November and 29 February of a
 * common year unlocatable instead of rolling them into the following month, and it is why the leap
 * rule lives in one place rather than in a copy here. The time of day is checked field by field, and
 * the offset is held to the same hour and minute bounds, so `+99:99` is unlocatable while every offset
 * a real zone keeps still resolves. Every timestamp the adapter supplies is ISO 8601 with an offset by
 * construction (contracts §1).
 *
 * @param timestamp The instant to place, as ISO 8601 with an offset.
 * @returns The day it falls on and the epoch second it names, or `null` when it cannot be placed.
 */
function locate(timestamp: Timestamp): LocatedInstant | null {
  const match = TIMESTAMP_PATTERN.exec(timestamp);
  if (match === null || match.groups === undefined) {
    return null;
  }
  const groups = match.groups;
  const date = dateTextOf(groups);
  const hour = digitsOf(groups, 'hour');
  const minute = digitsOf(groups, 'minute');
  const offsetMinutes = offsetMinutesOf(groups);
  if (date === null || hour === null || minute === null || offsetMinutes === null) {
    return null;
  }
  const day = dayNumberFromIsoDate(date);
  if (day === null) {
    return null;
  }
  const second = digitsOf(groups, 'second') ?? 0;
  const clockTimeDescribesAnInstant =
    hour <= LAST_HOUR_OF_DAY && minute <= LAST_MINUTE_OF_HOUR && second <= LAST_SECOND_OF_MINUTE;
  if (!clockTimeDescribesAnInstant) {
    return null;
  }
  const epochSeconds =
    day * SECONDS_PER_DAY +
    hour * SECONDS_PER_HOUR +
    minute * SECONDS_PER_MINUTE +
    second -
    offsetMinutes * SECONDS_PER_MINUTE;
  return { day, epochSeconds };
}

/**
 * The refusal `computeLedger` raises when the clock it was handed is not an instant it can place.
 *
 * A bare `RangeError` would leave the adapter nothing to classify, so the refusal would cross the
 * service port untyped. This class is the aggregate's own name for it: it carries the clock value the
 * caller handed in, and the mock adapter reports it once, at the boundary, as a `'validation'`
 * `Problem` carrying this message and the call's trace identifier (AAP 0.2.2, AAP 0.12.3). A caller can
 * narrow it with `instanceof` and read the value that could not be placed.
 */
export class UnlocatableClockError extends Error {
  /** The clock value the aggregate could not place, exactly as the caller handed it in. */
  readonly clock: Timestamp;

  /**
   * @param clock The clock value the aggregate could not place.
   */
  constructor(clock: Timestamp) {
    super(
      `computeLedger needs the demonstration clock as an ISO 8601 instant with an offset; received "${clock}".`,
    );
    this.name = 'UnlocatableClockError';
    this.clock = clock;
  }
}

/**
 * The calendar day the ledger's window ends on: the clock's own day, or `null` when the clock is not an
 * instant this module can place.
 *
 * Kept as one helper so the boundary rule exists in a single place and every endpoint is counted
 * against the same window. Answering `null` is a decision rather than an exception: the caller is the
 * one that knows no window follows from it, and `computeLedger` turns that answer into the typed
 * `UnlocatableClockError` the adapter reports as a `'validation'` `Problem`.
 *
 * @param clock The demonstration clock, as ISO 8601 with an offset.
 * @returns The calendar day the clock falls on, or `null` when it cannot be located.
 */
function windowEndDayOf(clock: Timestamp): number | null {
  const located = locate(clock);
  if (located === null) {
    return null;
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
 * The declared input, as a caller holds it
 * ------------------------------------------------------------------------------------------- */

/**
 * One endpoint as the declared configuration states it: the address, its purpose and its state.
 *
 * The three counted members are left out of `LedgerRow` because this module produces them — both
 * counts from the window's events and the last attempt from the newest one — so a caller hands the
 * declared record in as it stands instead of inventing a count to satisfy the call (rule P-6), and
 * no stored count can be passed in and reach a screen unchanged.
 */
type DeclaredLedgerEndpoint = Omit<LedgerRow, 'lastAttempt' | 'allowed' | 'blocked'>;

/**
 * The declared record this aggregate reads: the sovereignty record's `ledger` member as it stands.
 *
 * Only that member is named, because it is the whole of what the aggregate reads, and it is held as
 * a read-only array so the record's own order passes through untouched. A caller's fuller record —
 * the seed's, whose rows also state a `lastAttempt` — satisfies this shape without conversion,
 * because a row that carries extra members is still one of these.
 */
interface DeclaredLedgerConfiguration {
  readonly ledger: ReadonlyArray<DeclaredLedgerEndpoint>;
}

/* ---------------------------------------------------------------------------------------------
 * The accumulation: one tally per endpoint, filled by one pass over the trail
 * ------------------------------------------------------------------------------------------- */

/**
 * What one endpoint's row accumulates while the trail is walked: the two counts, and the members that
 * decide which attempt is the most recent.
 *
 * The two ordering members are kept beside the attempt rather than read back from it, because a
 * timestamp this module cannot place must contribute nothing — not even a comparison — while a placed
 * one is ordered by `epochSeconds` and then by `sequence`. They are the same values the per-endpoint
 * loop kept, so a reader can still reproduce a row by hand.
 */
interface LedgerTally {
  /** The window's events whose result is `'allowed'`. */
  allowed: number;

  /** The window's events whose result is `'blocked'`. */
  blocked: number;

  /** The most recent placed event naming the endpoint, or `null` while there is none. */
  lastAttempt: Timestamp | null;

  /** That attempt's instant in whole seconds from the epoch, so two offsets compare as instants. */
  lastAttemptSeconds: number;

  /** That attempt's chain sequence, which breaks a tie between two events of the same instant. */
  lastAttemptSequence: number;
}

/**
 * The tally for one endpoint, created empty the first time the endpoint is seen.
 *
 * The map is keyed by the endpoint string the declared record and the trail share, so an event finds
 * the tally of the row it counts against with one lookup. A total accessor is used rather than a
 * `get` whose absence the caller re-decides each time: whether an endpoint has a tally and whether an
 * event counts at all are one question, answered by the caller's membership test, and every endpoint
 * that passes it owns its tally from then on.
 *
 * @param tallies The per-endpoint tallies this call accumulates into.
 * @param endpoint The endpoint whose tally is wanted.
 * @returns That endpoint's tally, empty when it had none.
 */
function tallyFor(tallies: Map<string, LedgerTally>, endpoint: string): LedgerTally {
  const held = tallies.get(endpoint);
  if (held !== undefined) {
    return held;
  }
  const tally: LedgerTally = {
    allowed: 0,
    blocked: 0,
    lastAttempt: null,
    lastAttemptSeconds: 0,
    lastAttemptSequence: 0,
  };
  tallies.set(endpoint, tally);
  return tally;
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
 * - The window is the `LEDGER_WINDOW_DAYS` calendar days ending on the clock's own day, both ends
 *   included.
 *   With the demonstration clock of 2026-12-03 the covered days therefore run from 2026-11-04 through
 *   2026-12-03, which is thirty days. Each event is assigned to the calendar day its own offset
 *   records, and the clock's day counts in full, so an instant recorded later on that day is inside
 *   the window too — the window's boundary is a day, which is what the column's label states.
 * - An event belongs to a row when its `objectRef` equals that row's endpoint exactly. An event whose
 *   `objectRef` names no declared endpoint belongs to no row and is ignored, so an endpoint the trail
 *   mentions but the record does not declare cannot add a row of its own.
 * - The whole trail is walked once for all the rows together rather than once per row: an event's
 *   `objectRef` selects the tally it feeds, and its timestamp is located a single time, that answer
 *   serving both the window test and the last-attempt comparison below. No instant is parsed or
 *   calendar-checked twice inside a request (AAP 0.2.1 — a pure aggregate derives each figure once).
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
 * @param sovereignty The declared record whose `ledger` member names the endpoints, their order, and
 *   each one's purpose and state. The counted members are absent from its rows by construction, so
 *   no stored figure can be handed to this function; both counts and the last attempt are recomputed
 *   here from `events`, which is why no hand-written number can reach a screen.
 * @param clock The demonstration clock the window ends on, as an ISO 8601 instant.
 * @returns One row per declared endpoint, in the declared order.
 * @throws UnlocatableClockError When `clock` is not an ISO 8601 instant, because no window can be
 *   derived from it and a silently empty window would report a count of zero for every endpoint. The
 *   refusal carries the clock value, and the adapter reports it as a `'validation'` `Problem` naming
 *   that cause, so nothing untyped leaves the aggregate (AAP 0.2.2).
 */
export function computeLedger(
  events: readonly AuditEvent[],
  sovereignty: DeclaredLedgerConfiguration,
  clock: Timestamp,
): LedgerRow[] {
  const windowEndDay = windowEndDayOf(clock);
  if (windowEndDay === null) {
    throw new UnlocatableClockError(clock);
  }
  const windowStartDay = windowEndDay - (LEDGER_WINDOW_DAYS - 1);

  /*
   * The declared endpoints are the rows, so the same set decides which events count at all: an event
   * whose object reference is not one of its members contributes to no row, and one that is a member
   * accumulates into the single tally its endpoint owns — which is why a record declaring the same
   * endpoint twice still reports both of those rows with the same counts, as the per-endpoint loop did.
   */
  const declaredEndpoints = new Set(sovereignty.ledger.map((declared) => declared.endpoint));
  const tallies = new Map<string, LedgerTally>();

  for (const event of events) {
    if (!declaredEndpoints.has(event.objectRef)) {
      continue;
    }
    const located = locate(event.timestamp);
    if (located === null) {
      continue;
    }
    const tally = tallyFor(tallies, event.objectRef);

    if (located.day >= windowStartDay && located.day <= windowEndDay) {
      const column = columnOf(event.result);
      if (column === 'allowed') {
        tally.allowed += 1;
      } else if (column === 'blocked') {
        tally.blocked += 1;
      }
    }

    const laterInstant = located.epochSeconds > tally.lastAttemptSeconds;
    const laterInTheSameInstant =
      located.epochSeconds === tally.lastAttemptSeconds &&
      event.sequence > tally.lastAttemptSequence;
    if (tally.lastAttempt === null || laterInstant || laterInTheSameInstant) {
      tally.lastAttempt = event.timestamp;
      tally.lastAttemptSeconds = located.epochSeconds;
      tally.lastAttemptSequence = event.sequence;
    }
  }

  return sovereignty.ledger.map((declared) => {
    const tally = tallyFor(tallies, declared.endpoint);

    return {
      endpoint: declared.endpoint,
      purpose: declared.purpose,
      state: declared.state,
      lastAttempt: tally.lastAttempt,
      allowed: tally.allowed,
      blocked: tally.blocked,
    };
  });
}
