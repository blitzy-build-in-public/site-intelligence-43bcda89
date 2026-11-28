/**
 * The overview aggregates of SCR-01: the four tiles, the alternate-source readiness share, the
 * changed-since-last-visit list, the by-plant rows and the fourteen-day opened-and-resolved
 * series, computed once from the records handed in and the `Scope` the caller has resolved.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §5, which fixes the ten aggregates as pure functions over records.
 * - AAP 0.8's computation row: these six figures, readiness through `wholePercent`, the median
 *   as the middle qualifying history value unrounded, and counts as integers.
 * - AAP 0.12.1's overview row, which fixes `computeOverview(records, scope): Overview`, its
 *   dependence on the rounding helpers and exception aggregates, and — with AAP 0.12.2's
 *   `Overview`, `PlantRiskRow`, `ChangedSinceLastVisitItem` and `DailyCountPoint` rows — every
 *   member filled here; SCR-01 of `platform-specification.md` fixes the screen that reads them.
 * - AAP 0.2.1's one resolved scope, never re-derived here, so a filtered queue and a filtered
 *   overview cannot disagree; AAP 0.10, which leaves every simulation label to the component.
 *
 * What a reader cannot infer from the code:
 * - Readiness is reported once for the overview, not per by-plant row, because a material record
 *   names the products it goes into and no plant.
 * - The last-visit window runs from the start of the most recent working day before the as-of
 *   date to the as-of instant, derived from `asOf` alone, so no clock is read.
 * - An admitted exception is counted at the plant its own record states, so the by-plant rows
 *   stay a partition of the tiles.
 * - The median's even-count case, which AAP 0.8 leaves open, is the mean of the two middle
 *   durations, and the series reads opened days from `detectedAt` and resolved days from the
 *   trail, because an exception record carries no resolved-at member.
 * - No price, amount or record identifier is typed here (rule P-6); the expected results of
 *   `platform-seed-data.md` are fixtures this module never reads.
 */

import type {
  AffectedLine,
  Approval,
  ChangedSinceLastVisitItem,
  CustomerOrderId,
  DailyCountPoint,
  ExceptionId,
  IsoDate,
  MaterialId,
  Money,
  OperationalException,
  Overview,
  PlantId,
  PlantRiskRow,
  ProductId,
  Scope,
  SupplierId,
  Timestamp,
} from '../../types';
import type { ExceptionAggregateInput } from './exceptions';
import { calendarDateOf, isWorkingDay, shiftIsoDate } from '../solver/calendar';
import { halfUp2, wholePercent } from '../solver/rounding';
// The queue's row-admission predicates are stated once, in `./exceptions`: the queue and this
// overview admit a record by one plant predicate and one product predicate, so a change to
// either cannot leave a narrowed queue and a narrowed overview describing different populations
// (AAP 0.2.1).
import {
  admitsPlant,
  admitsProducts,
  baselineViewFor,
  productIdsOf,
  resolveAffectedLines,
  revenueOfAffectedLines,
} from './exceptions';

/* ---------------------------------------------------------------------------------------------
 * A. Structural constants
 * ------------------------------------------------------------------------------------------- */

/** Milliseconds in a second, the base unit `Date.parse` reports an instant in. */
const MILLIS_PER_SECOND = 1_000;

/** Seconds in a minute. */
const SECONDS_PER_MINUTE = 60;

/** Minutes in an hour. */
const MINUTES_PER_HOUR = 60;

/**
 * Milliseconds in an hour: the divisor that turns the difference between two record instants
 * into the hours the fourth tile is measured in.
 */
const MILLIS_PER_HOUR = MILLIS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

/**
 * The length of the opened-and-resolved series: the fourteen days SCR-01 of
 * `platform-specification.md` fixes for the overview's per-day chart.
 */
const SERIES_LENGTH = 14;

/**
 * Days the search for the previous working day steps back: a full week always holds one Monday
 * to Friday, because the calendar of contracts §1 has no holiday table.
 */
const WORKING_DAY_LOOKBACK = 7;

/**
 * The fourth tile's value with no qualifying record: the identity of an empty set, not a reading
 * of zero hours between a detection and an approval.
 */
const NO_QUALIFYING_MEDIAN = 0;

/**
 * The readiness share with no material in scope: the identity of an empty set, not a reading
 * that none of a sourced population has an alternate.
 */
const NO_MATERIAL_IN_SCOPE = 0;

/**
 * The activity-trail action that dates detection, as `src/seed/exception-history.ts` spells it:
 * the median measures from this action, so both of its ends are activities of the same trail.
 */
const OPENED_ACTION = 'opened';

/** The activity-trail action that dates the moment a plan was approved, in the same vocabulary. */
const APPROVED_ACTION = 'approved';

/** The activity-trail action that closes an exception, which the series counts as a resolution. */
const RESOLVED_ACTION = 'resolved';

/* ---------------------------------------------------------------------------------------------
 * B. The record bundle the overview is computed from — AAP 0.12.1, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * One plant's identifier and display name: the only two members the by-plant rows read.
 *
 * Not a contracts type but the minimal shape of the call; the richer plant records of
 * `src/seed/plants.ts` are assignable to it, so the adapter passes them through without mapping.
 */
export interface NamedPlant {
  /** The plant's identifier, as the plant record states it. */
  readonly id: PlantId;

  /** The plant's display name, as the plant record states it. */
  readonly name: string;
}

/**
 * One material, as the readiness share reads it: the products it goes into and whether a second
 * supplier can cover it.
 *
 * Not a contracts type but the minimal shape of the call, so the richer material records of
 * `src/seed/materials.ts` are assignable to it and pass through without mapping.
 */
export interface SourcedMaterial {
  /** The material's identifier, as the material record states it. */
  readonly id: MaterialId;

  /** The products the material goes into, which is the reach the product selection admits it by. */
  readonly productIds: readonly ProductId[];

  /**
   * The second qualified supplier that can cover the material, absent where it is
   * single-sourced.
   */
  readonly alternateSupplierId?: SupplierId;
}

/**
 * One activity on an exception, as the trail records it: the instant, what was done and the
 * record's own account of it.
 *
 * The fuller `src/seed/exception-history.ts` record is assignable to this shape; `occurredAt`
 * dates an activity for the changed-since list, the median and the resolved count, and `note` is
 * the account the list shows as its detail.
 */
export interface ActivityRecord {
  /** The exception the activity happened on. */
  readonly exceptionId: ExceptionId;

  /** When the activity happened, ISO 8601 in the application's time zone. */
  readonly occurredAt: Timestamp;

  /**
   * What was done, spelled as the trail spells it. An open string, not a closed union, because
   * this module reads two members of that vocabulary and owns neither.
   */
  readonly action: string;

  /** What happened, in plain words, as the record states it. */
  readonly note: string;
}

/**
 * Every record the overview is computed over, in one bundle: AAP 0.12.1's `records` argument.
 *
 * It extends the exception aggregate's bundle, so the adapter that already builds one for the
 * queue hands the same object here, and adds only what only this module reads — the plants it
 * groups by, the material master its readiness share counts, the activity trail and the
 * approvals. That inheritance is what makes the two agree: this module admits exceptions with
 * the same two filters the queue applies and values their revenue through the same function. The
 * inherited `freshness` member is the one part the overview does not read, and it arrives
 * because the adapter builds one bundle for both reads.
 */
export interface OverviewInput extends ExceptionAggregateInput {
  /** The plants the by-plant rows report on, each with the name its record states. */
  readonly plants: readonly NamedPlant[];

  /**
   * The material master the alternate-source readiness share is measured over: one record per
   * material, carrying the products it goes into and the second supplier that can cover it.
   */
  readonly materials: readonly SourcedMaterial[];

  /** The activity trail, which dates the changed-since list, the median and the resolved count. */
  readonly history: readonly ActivityRecord[];

  /**
   * The approval records, in any order. A decided approval is listed in the changed-since list
   * from its own record, a decision being a change in its own right, rather than from its
   * mirroring `approved` activity (see `collectChanges`).
   */
  readonly approvals: readonly Approval[];
}

/* ---------------------------------------------------------------------------------------------
 * C. Instants and calendar dates
 * ------------------------------------------------------------------------------------------- */

/*
 * The civil-date arithmetic lives in `../solver/calendar`, the pure core's one implementation of
 * it, so a correction to a leap rule, a month length or a date format is made once. What stays
 * here concerns an instant rather than a calendar date: an elapsed-time measurement, and the
 * code-unit ordering every non-date ordering of this module uses.
 */

/**
 * Compares two strings by code unit, ascending.
 *
 * Every ordering here that is not a date or a duration uses this comparison: a locale comparison
 * would order by the host's collation, where code-unit order answers identically everywhere (AAP
 * 0.18.2).
 */
function compareCodeUnits(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

/**
 * Measures the hours between two instants, both read against their own offsets.
 *
 * The difference of two parsed instants is the elapsed time, so the answer is the same on every
 * machine. An unparseable instant, or one that precedes the other, yields `null` rather than a
 * negative or a `NaN` duration: neither is a reading of how long a plan took.
 */
function hoursBetween(from: Timestamp, to: Timestamp): number | null {
  const fromMillis = Date.parse(from);
  const toMillis = Date.parse(to);

  if (!Number.isFinite(fromMillis) || !Number.isFinite(toMillis) || toMillis < fromMillis) {
    return null;
  }

  return (toMillis - fromMillis) / MILLIS_PER_HOUR;
}

/**
 * Finds the most recent working day before a date (contracts §1), through `isWorkingDay`, so a
 * visit dated on a Monday reaches back to the preceding Friday.
 *
 * The search steps back at most a week, which always contains one working day because the
 * calendar has no holiday table; a date that is not well formed yields `null`, as an unreadable
 * instant does.
 */
function previousWorkingDay(date: IsoDate): IsoDate | null {
  for (let back = 1; back <= WORKING_DAY_LOOKBACK; back += 1) {
    const candidate = shiftIsoDate(date, -back);

    if (candidate !== null && isWorkingDay(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Takes the middle value of a set of durations.
 *
 * AAP 0.8 fixes "the middle value of the qualifying history records" and leaves the even-count
 * case open: with an even number of plans the value is the mean of the two middle durations,
 * which is why the member is presented unrounded, and an empty set yields its identity rather
 * than zero hours.
 */
function medianOf(durations: readonly number[]): number {
  if (durations.length === 0) {
    return NO_QUALIFYING_MEDIAN;
  }

  const sorted = [...durations].sort((left, right) => left - right);
  const upperIndex = Math.floor(sorted.length / 2);
  const upper = sorted[upperIndex];

  if (upper === undefined) {
    return NO_QUALIFYING_MEDIAN;
  }

  if (sorted.length % 2 === 1) {
    return upper;
  }

  const lower = sorted[upperIndex - 1];

  return lower === undefined ? NO_QUALIFYING_MEDIAN : (lower + upper) / 2;
}


/* ---------------------------------------------------------------------------------------------
 * D. The population the overview describes — AAP 0.2.1's one resolved scope
 * ------------------------------------------------------------------------------------------- */

/**
 * One exception the resolved scope admits, with the plant it is counted at, the affected lines
 * derived for it and the revenue those lines place at risk.
 *
 * Whether the exception is in the population is the scope's answer, through `admitsPlant`; where
 * it is counted is the record's own `plantId`, so the queue's row and the by-plant row name the
 * same plant for the same exception. The lines and their amount travel with it because both are
 * computed once, where they are first in hand, and every tile and row that needs them reads them
 * here (AAP 0.2.1, AAP 0.8).
 */
interface ScopedException {
  /** The exception record itself, read and never modified. */
  readonly exception: OperationalException;

  /** The plant the record states it is at, and the one row this exception contributes to. */
  readonly plantId: PlantId;

  /** The affected lines `resolveAffectedLines` derived for it. */
  readonly lines: AffectedLine[];

  /**
   * The revenue those affected lines place at risk, valued once, where the lines are in hand.
   */
  readonly revenue: Money;
}

/**
 * Collects the exceptions the resolved scope admits, each with the plant it is counted at.
 *
 * The two filters are the queue's own — `admitsPlant`, and `admitsProducts` over the products
 * the exception's affected lines name — and both are imported from `./exceptions` where they are
 * stated once. A resolved `plants` member is never read as "all plants": `resolveScope` states
 * that an empty array means nothing is in scope. The affected lines are derived and valued once
 * here, where they are first in hand, so the customer-order count, the revenue tile and the
 * by-plant rows read one entry and no caller re-derives or re-values it; an exception the
 * product selection rejects is never valued, so the refusal an unpriceable line raises stays
 * about a line this overview counts. The entries come back in ascending identifier order, so two
 * calls with the same records return the same sequence.
 *
 * @throws UnpriceableLineError when an admitted exception's affected line names a product the
 *   bundle carries no price for, since its revenue could not be computed. The refusal is raised
 *   here because this is where the lines are valued.
 */
function scopedExceptions(records: OverviewInput, scope: Scope): ScopedException[] {
  const scoped: ScopedException[] = [];

  for (const exception of records.exceptions) {
    if (!admitsPlant(exception, scope)) {
      continue;
    }

    const baseline = baselineViewFor(records, exception);
    const lines = resolveAffectedLines(exception, baseline);

    if (!admitsProducts(productIdsOf(lines), scope)) {
      continue;
    }

    scoped.push({
      exception,
      plantId: exception.plantId,
      lines,
      revenue: revenueOfAffectedLines(exception, baseline, lines),
    });
  }

  return scoped.sort((left, right) => compareCodeUnits(left.exception.id, right.exception.id));
}

/**
 * Says whether an exception still counts as open.
 *
 * Two of `ExceptionStatus`'s three states are history the tiles do not count; the risk tiles and
 * the by-plant rows share this reading, which is what keeps the tile and the row sum equal.
 */
function isOpen(exception: OperationalException): boolean {
  return exception.status === 'open';
}

/**
 * Reads a plant's display name from the bundle, falling back to the identifier's own key when
 * the bundle carries no record for that plant: nothing is invented and nothing is left blank,
 * and no plant name is written in this file (rule P-6).
 */
function plantNameOf(plants: readonly NamedPlant[], plantId: PlantId): string {
  for (const plant of plants) {
    if (plant.id === plantId) {
      return plant.name;
    }
  }

  return plantId;
}

/**
 * Measures alternate-source readiness: the share of the in-scope materials a second supplier can
 * cover.
 *
 * Implements contracts §5 and AAP 0.8's "readiness through `wholePercent`". A material is in
 * scope when the products it goes into meet the resolved scope's product selection —
 * `admitsProducts`, whose empty `products` member is the "All products" selection `./scope`
 * states — so the share describes the same product selection as the rest of the overview; the
 * part is the in-scope materials carrying an `alternateSupplierId`, the whole is every in-scope
 * material.
 *
 * A material record names no plant, which is why the figure is reported once for the overview;
 * with no material in scope it is the empty set's identity and the division by zero is never
 * taken.
 */
function alternateSourceReadiness(materials: readonly SourcedMaterial[], scope: Scope): number {
  let inScope = 0;
  let withAlternate = 0;

  for (const material of materials) {
    if (!admitsProducts(material.productIds, scope)) {
      continue;
    }

    inScope += 1;

    if (material.alternateSupplierId !== undefined) {
      withAlternate += 1;
    }
  }

  return wholePercent(inScope === 0 ? NO_MATERIAL_IN_SCOPE : withAlternate / inScope);
}

/* ---------------------------------------------------------------------------------------------
 * E. The four tiles — contracts §5; AAP 0.8; AAP 0.12.2's `Overview`
 * ------------------------------------------------------------------------------------------- */

/**
 * Sums the revenue the open exceptions place at risk, in euro to two decimals.
 *
 * Every term is the amount `revenueOfAffectedLines` valued from the lines `scopedExceptions`
 * derived, so no term is derived or valued a second time and none is rounded on the way in: the
 * total closes once through `halfUp2`, and the by-plant rows partition exactly these amounts
 * (AAP 0.8, contracts §4 rule 5).
 */
function totalRevenue(open: readonly ScopedException[]): Money {
  let total = 0;

  for (const entry of open) {
    total += entry.revenue;
  }

  return halfUp2(total);
}

/**
 * Counts the distinct customer orders the open exceptions carry on their affected lines.
 *
 * An exception touches a customer order by naming it on a line, so the count is of distinct
 * order identifiers rather than of lines: two exceptions that reach the same order put one order
 * at risk.
 */
function distinctOrderCount(open: readonly ScopedException[]): number {
  const orderIds = new Set<CustomerOrderId>();

  for (const entry of open) {
    for (const line of entry.lines) {
      orderIds.add(line.orderId);
    }
  }

  return orderIds.size;
}

/**
 * Measures how long one exception took from detection to an approved plan.
 *
 * Both ends are activities of the trail handed in: the earliest `opened` activity dates the
 * detection and the earliest `approved` activity at or after it dates the approval (AAP 0.8's
 * "qualifying history records"). A trail with no opened activity, no approval after the
 * detection, or an unreadable instant contributes nothing to the median rather than a duration
 * of zero, because neither absence is a measurement that a plan took no time.
 */
function approvedPlanHours(
  activity: readonly ActivityRecord[] | undefined,
  exceptionId: ExceptionId,
): number | null {
  if (activity === undefined) {
    return null;
  }

  let openedAt: Timestamp | null = null;
  let openedMillis = Number.POSITIVE_INFINITY;

  for (const record of activity) {
    if (record.exceptionId !== exceptionId || record.action !== OPENED_ACTION) {
      continue;
    }

    const millis = Date.parse(record.occurredAt);

    if (Number.isFinite(millis) && millis < openedMillis) {
      openedMillis = millis;
      openedAt = record.occurredAt;
    }
  }

  if (openedAt === null) {
    return null;
  }

  let approvedAt: Timestamp | null = null;
  let approvedMillis = Number.POSITIVE_INFINITY;

  for (const record of activity) {
    if (record.exceptionId !== exceptionId || record.action !== APPROVED_ACTION) {
      continue;
    }

    const millis = Date.parse(record.occurredAt);

    if (Number.isFinite(millis) && millis >= openedMillis && millis < approvedMillis) {
      approvedMillis = millis;
      approvedAt = record.occurredAt;
    }
  }

  if (approvedAt === null) {
    return null;
  }

  return hoursBetween(openedAt, approvedAt);
}

/**
 * Measures the fourth tile: the middle hours between detection and an approved plan.
 *
 * The qualifying population is every exception the scope admits that carries both activities,
 * whatever its current status: a plan approved on an exception since resolved is a real
 * measurement of how long approval took, and excluding it would bias the tile towards the
 * exceptions still open. The middle value is unrounded, as AAP 0.8 fixes it, and an empty
 * population yields the empty set's identity.
 */
function medianHoursToApprovedPlan(
  scoped: readonly ScopedException[],
  historyByException: ReadonlyMap<ExceptionId, readonly ActivityRecord[]>,
): number {
  const durations: number[] = [];

  for (const entry of scoped) {
    const hours = approvedPlanHours(historyByException.get(entry.exception.id), entry.exception.id);

    if (hours !== null) {
      durations.push(hours);
    }
  }

  return medianOf(durations);
}

/* ---------------------------------------------------------------------------------------------
 * F. The by-plant rows — AAP 0.12.2's `PlantRiskRow`
 * ------------------------------------------------------------------------------------------- */

/**
 * Names the plants the by-plant rows cover, in the order the table states them.
 *
 * The set is the selection's plants together with the plant each admitted open exception is
 * recorded at. The order is `records.plants`' — the canonical plant order the records state; a
 * plant no record holds follows those that do, the selection first and then the admitted
 * exceptions in their own order.
 */
function plantRowOrder(
  records: OverviewInput,
  scope: Scope,
  open: readonly ScopedException[],
): PlantId[] {
  const wanted = new Set<PlantId>(scope.plants);

  for (const entry of open) {
    wanted.add(entry.plantId);
  }

  const order: PlantId[] = [];
  const placed = new Set<PlantId>();

  for (const plant of records.plants) {
    if (wanted.has(plant.id) && !placed.has(plant.id)) {
      order.push(plant.id);
      placed.add(plant.id);
    }
  }

  for (const plantId of scope.plants) {
    if (!placed.has(plantId)) {
      order.push(plantId);
      placed.add(plantId);
    }
  }

  for (const entry of open) {
    if (!placed.has(entry.plantId)) {
      order.push(entry.plantId);
      placed.add(entry.plantId);
    }
  }

  return order;
}

/**
 * Groups the open exceptions by the plant each is recorded at, one row per plant the read
 * reports.
 *
 * The rows are the tiles split by plant, so they partition the admitted open exceptions and add
 * up to the tiles exactly, each amount the one `scopedExceptions` valued. A row is emitted for
 * every plant the resolved scope names — a plant in scope with nothing open keeps its row, with
 * a zero count and amount, because a plant a planner can see and that has no exception is a
 * reading in its own right — and for every plant an admitted open exception is recorded at, so
 * an exception recorded outside the selection gets its own row instead of being folded into an
 * in-scope one (AAP 0.2.1). The order is the canonical plant order `records.plants` states,
 * never the selection's or the caller's own, so the table reads the same way twice;
 * {@link plantRowOrder} states it and the set it orders.
 *
 * @throws Error when an affected line names a product the baseline carries no price for, as
 *   `totalRevenue` does.
 */
function plantRows(
  records: OverviewInput,
  scope: Scope,
  open: readonly ScopedException[],
): PlantRiskRow[] {
  const openCounts = new Map<PlantId, number>();
  const revenueByPlant = new Map<PlantId, Money>();

  for (const entry of open) {
    openCounts.set(entry.plantId, (openCounts.get(entry.plantId) ?? 0) + 1);
    revenueByPlant.set(entry.plantId, (revenueByPlant.get(entry.plantId) ?? 0) + entry.revenue);
  }

  const rows: PlantRiskRow[] = [];

  for (const plantId of plantRowOrder(records, scope, open)) {
    rows.push({
      plantId,
      plantName: plantNameOf(records.plants, plantId),
      openExceptions: openCounts.get(plantId) ?? 0,
      revenueAtRiskEur: halfUp2(revenueByPlant.get(plantId) ?? 0),
    });
  }

  return rows;
}

/* ---------------------------------------------------------------------------------------------
 * G. The fourteen-day series — AAP 0.12.2's `DailyCountPoint`
 * ------------------------------------------------------------------------------------------- */

/**
 * Says whether one exception is an entry the fourteen-day series counts on one calendar day.
 *
 * This is the series' own rule, stated once and exported, so the counts and the queue's day
 * filter cannot drift apart: an exception counts on a day when its record was detected that day
 * — the `detectedAt` member every exception carries, which dates the opened count — or when its
 * activity trail holds a `resolved` record that day, which is where the resolved count reads it.
 * A day is a calendar date read from the instant in that instant's own offset, through the same
 * {@link calendarDateOf} the counts use, so no host time zone, locale or clock can move an
 * exception to another day. A day that is not a well-formed calendar date matches nothing rather
 * than throwing: it is a caller's malformed filter, and the read it narrows answers with no
 * rows.
 *
 * The history is the whole trail rather than this exception's slice, because that is the shape
 * the adapter holds and the trail is small; every other record is ignored without being indexed.
 */
export function openedOrResolvedOn(
  exception: OperationalException,
  history: readonly ActivityRecord[],
  day: IsoDate,
): boolean {
  if (calendarDateOf(exception.detectedAt) === day) {
    return true;
  }

  return history.some(
    (record) =>
      record.exceptionId === exception.id &&
      record.action === RESOLVED_ACTION &&
      calendarDateOf(record.occurredAt) === day,
  );
}

/**
 * Counts the exceptions opened and resolved on each of the fourteen days ending on the as-of
 * date.
 *
 * The opened count reads each exception record's own `detectedAt`, so no exception is missing
 * from it; the resolved count reads the trail's `resolved` records, because an exception record
 * carries no resolved-at member. Both count whole exceptions and both are restricted to the
 * exceptions the scope admits, which {@link openedOrResolvedOn} states for one day at a time and
 * the queue's day filter reads.
 *
 * The days are calendar days, ascending, derived from the as-of instant alone, so the series is
 * the same length on every run and its last point is the day the demonstration clock stands on.
 * A day with no activity keeps its point with two zeros, so a chart drawn from the series has no
 * gap in its axis. An as-of instant whose opening characters are not a calendar date yields an
 * empty series rather than a throw, because the tile and the rows are still worth reporting
 * without it.
 */
function buildSeries(
  records: OverviewInput,
  scoped: readonly ScopedException[],
  asOfDate: IsoDate | null,
): DailyCountPoint[] {
  if (asOfDate === null) {
    return [];
  }

  const openedByDate = new Map<IsoDate, number>();

  for (const entry of scoped) {
    const date = calendarDateOf(entry.exception.detectedAt);

    if (date !== null) {
      openedByDate.set(date, (openedByDate.get(date) ?? 0) + 1);
    }
  }

  const scopedIds = new Set<ExceptionId>(scoped.map((entry) => entry.exception.id));
  const resolvedByDate = new Map<IsoDate, number>();

  for (const record of records.history) {
    if (record.action !== RESOLVED_ACTION || !scopedIds.has(record.exceptionId)) {
      continue;
    }

    const date = calendarDateOf(record.occurredAt);

    if (date !== null) {
      resolvedByDate.set(date, (resolvedByDate.get(date) ?? 0) + 1);
    }
  }

  const series: DailyCountPoint[] = [];

  for (let offset = SERIES_LENGTH - 1; offset >= 0; offset -= 1) {
    const date = shiftIsoDate(asOfDate, -offset);

    if (date === null) {
      continue;
    }

    series.push({
      date,
      open: openedByDate.get(date) ?? 0,
      resolved: resolvedByDate.get(date) ?? 0,
    });
  }

  return series;
}

/* ---------------------------------------------------------------------------------------------
 * H. Changed since your last visit — AAP 0.12.2's `ChangedSinceLastVisitItem`
 * ------------------------------------------------------------------------------------------- */

/** One change before it is ordered and reduced to the list's three members. */
interface ChangeCandidate {
  /** The instant the change happened, which orders the list. */
  readonly instant: number;

  /** The record the entry opens, in the service's own reference form. */
  readonly ref: string;

  /** The one-line label that identifies the record in the list. */
  readonly label: string;

  /** The record's own account of what changed. */
  readonly detail: string;
}

/**
 * Says whether an instant falls inside the changed-since window.
 *
 * The window opens on the start of the most recent working day before the as-of date and closes
 * at the as-of instant itself, so nothing dated after the demonstration clock is reported as a
 * change. The opening bound is compared as a calendar date read in the instant's own offset and
 * the closing bound as an instant, because a record written later on the as-of date has not
 * happened yet by the clock.
 */
function isInChangeWindow(instant: Timestamp, windowStart: IsoDate, asOfMillis: number): boolean {
  const date = calendarDateOf(instant);

  if (date === null) {
    return false;
  }

  const millis = Date.parse(instant);

  if (!Number.isFinite(millis)) {
    return false;
  }

  if (Number.isFinite(asOfMillis) && millis > asOfMillis) {
    return false;
  }

  return date >= windowStart;
}

/**
 * Builds the changed-since list from the records' own dates.
 *
 * Two record kinds make a change: an activity on the trail — opened, assigned, noted, dismissed
 * or resolved — listed from the trail record, whose `note` is its own account, and a decision on
 * an approval, listed from the approval record, whose decider comment is the account and whose
 * identifier opens the approval itself. Where both describe the same decision, the trail's
 * mirroring `approved` activity is not listed beside the approval, so a decision appears once;
 * an approval the bundle does not carry is still reported from the trail it left.
 *
 * The list is ordered most recent first, then by reference and by detail by code unit, so the
 * order is a function of the records rather than of the bundle's array order. The window is the
 * module header's, derived from the as-of instant alone.
 */
function collectChanges(
  records: OverviewInput,
  scoped: readonly ScopedException[],
  asOfDate: IsoDate | null,
): ChangedSinceLastVisitItem[] {
  if (asOfDate === null) {
    return [];
  }

  const windowStart = previousWorkingDay(asOfDate) ?? shiftIsoDate(asOfDate, -1);

  if (windowStart === null) {
    return [];
  }

  const asOfMillis = Date.parse(records.asOf);
  const scopedById = new Map<ExceptionId, OperationalException>(
    scoped.map((entry) => [entry.exception.id, entry.exception]),
  );
  const candidates: ChangeCandidate[] = [];
  const decidedExceptions = new Set<ExceptionId>();

  for (const approval of records.approvals) {
    const exception = scopedById.get(approval.exceptionId);
    const decision = approval.decision;
    const decidedAt = approval.decidedAt;

    if (exception === undefined || decision === undefined || decidedAt === undefined) {
      continue;
    }

    if (!isInChangeWindow(decidedAt, windowStart, asOfMillis)) {
      continue;
    }

    decidedExceptions.add(exception.id);
    candidates.push({
      instant: Date.parse(decidedAt),
      ref: approval.id,
      label: exception.title,
      detail: decision.comment,
    });
  }

  for (const record of records.history) {
    const exception = scopedById.get(record.exceptionId);

    if (exception === undefined) {
      continue;
    }

    if (record.action === APPROVED_ACTION && decidedExceptions.has(exception.id)) {
      continue;
    }

    if (!isInChangeWindow(record.occurredAt, windowStart, asOfMillis)) {
      continue;
    }

    candidates.push({
      instant: Date.parse(record.occurredAt),
      ref: exception.id,
      label: exception.title,
      detail: record.note,
    });
  }

  candidates.sort(
    (left, right) =>
      right.instant - left.instant ||
      compareCodeUnits(left.ref, right.ref) ||
      compareCodeUnits(left.detail, right.detail),
  );

  return candidates.map((candidate) => ({
    ref: candidate.ref,
    label: candidate.label,
    detail: candidate.detail,
  }));
}

/* ---------------------------------------------------------------------------------------------
 * I. The overview — AAP 0.12.1's overview aggregates; specification SCR-01
 * ------------------------------------------------------------------------------------------- */

/**
 * Groups the activity trail by the exception each activity belongs to.
 *
 * The median walks one exception's activities at a time, so the trail is indexed once instead of
 * scanned once per exception. The groups keep the trail's own order, which makes the
 * earliest-activity search in `approvedPlanHours` a matter of the records rather than of the
 * map.
 */
function groupHistoryByException(
  history: readonly ActivityRecord[],
): Map<ExceptionId, readonly ActivityRecord[]> {
  const grouped = new Map<ExceptionId, ActivityRecord[]>();

  for (const record of history) {
    const activity = grouped.get(record.exceptionId);

    if (activity === undefined) {
      grouped.set(record.exceptionId, [record]);
    } else {
      activity.push(record);
    }
  }

  return grouped;
}

/**
 * Computes the overview: the four tiles, the alternate-source readiness share, the changed-since
 * list, the by-plant rows and the series — contracts §5; AAP 0.8's overview row; AAP 0.12.1's
 * overview aggregates; AAP 0.12.2's `Overview`.
 *
 * One pure call over the records handed in and a scope the caller has already resolved, which is
 * the whole contract of this module: the scope is never re-derived (AAP 0.2.1), no clock is read
 * (the as-of instant travels in the bundle, since AAP 0.12.1's signature carries no clock
 * parameter), no random source is opened and nothing is written to a global. The same two
 * arguments always produce a deeply equal `Overview`, and neither argument nor any record inside
 * it is modified — every array and object returned is built here.
 *
 * Every figure reaches a screen as a computed one and carries `Simulated calculation` there
 * (rule P-1); this module emits no label, and nothing it returns combines a first-party value
 * with a market-intelligence one (rule P-5).
 *
 * @throws Error when an in-scope exception's affected line names a product the bundle does not
 *   carry, since its revenue could not be computed.
 */
export function computeOverview(records: OverviewInput, scope: Scope): Overview {
  const scoped = scopedExceptions(records, scope);
  const open = scoped.filter((entry) => isOpen(entry.exception));
  const historyByException = groupHistoryByException(records.history);
  const asOfDate = calendarDateOf(records.asOf);

  return {
    openExceptions: open.length,
    revenueAtRiskEur: totalRevenue(open),
    customerOrdersAtRisk: distinctOrderCount(open),
    medianHoursToApprovedPlan: medianHoursToApprovedPlan(scoped, historyByException),
    alternateSourceReadinessPercent: alternateSourceReadiness(records.materials, scope),
    changedSinceLastVisit: collectChanges(records, scoped, asOfDate),
    byPlant: plantRows(records, scope, open),
    openResolvedSeries: buildSeries(records, scoped, asOfDate),
  };
}

