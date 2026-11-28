/**
 * The overview aggregates of SCR-01: the four computed tiles, the alternate-source readiness share, the
 * "changed since your last visit" list, the risk-by-plant rows and the fourteen-day opened-and-resolved
 * series.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §5, which fixes the computed aggregates as pure functions over records.
 * - AAP 0.8's computation table, whose `src/domain/aggregation/overview.ts` row fixes this module's
 *   arithmetic: "open exceptions, revenue at risk (tile), customer orders at risk, median hours to
 *   approved plan, alternate-source readiness and the open/resolved per-day series", with "readiness
 *   through `wholePercent` (contracts §5); median is the middle value of the qualifying history
 *   records, unrounded; counts are integers".
 * - AAP 0.12.1's "Overview aggregates" row, which fixes the public interface —
 *   `computeOverview(records, scope): Overview` — and its dependence on the rounding helpers and on
 *   the exception aggregates.
 * - AAP 0.12.2's `Overview`, `PlantRiskRow`, `ChangedSinceLastVisitItem` and `DailyCountPoint` rows,
 *   which fix every member this module fills, and `platform-specification.md` SCR-01, which fixes the
 *   screen that reads them.
 * - AAP 0.2.1, which fixes the one scope resolver: the overview takes a `Scope` the caller already
 *   resolved and never re-derives one, so a filtered queue and a filtered overview cannot disagree.
 * - AAP 0.10, which places each simulation label on the component that renders a figure: this module
 *   emits values and no label.
 *
 * Five aggregates, one call. The tiles count what is still open, value it, count the customer orders
 * it carries and measure how long an approved plan takes. The readiness share reads the material
 * master the bundle carries and reports how much of what the scope reaches a second supplier can
 * cover. The changed-since list reports the activity the records themselves date. The by-plant rows
 * are the tiles split across the plants the selection names and the plants the admitted exceptions are
 * recorded at, and the fourteen-day series is the flow behind the open count. Each is computed from the
 * records handed in, and each returned collection is freshly built.
 *
 * ONE RULE THE SERIES AND THE QUEUE SHARE IS EXPORTED ON ITS OWN. `openedOrResolvedOn(exception,
 * history, day)` states when an exception is one of the entries the fourteen-day series counts on a
 * day, and it is what the mock adapter's day filter reads, so the queue a reader narrows by date keeps
 * exactly the exceptions the mark that narrowed it counted (AAP 0.12.4, AAP 0.2.1). It is a pure
 * predicate over records — no clock, no state — and the aggregate's counts state the same rule, so
 * neither can be changed without the other's tests noticing.
 *
 * Where the figures come from. Every euro is computed by `revenueOfAffectedLines` from the affected lines
 * `resolveAffectedLines` derives, once per admitted exception, where those lines are already in hand: no
 * caller here derives or values them a second time, the tile closes the sum of those per-exception
 * amounts once through `halfUp2`, and the by-plant rows are a partition of exactly the same amounts, so
 * the tile and the rows add up to the cent (AAP 0.2.1, AAP 0.8). No price, quantity, business amount,
 * threshold or record identifier is written in this file (rule P-6); its only literal numbers are the
 * arithmetic's own unit constants and the fourteen days the specification fixes for the series, and the
 * expected results of `platform-seed-data.md` are test fixtures this module neither holds nor reads.
 *
 * Purity, determinism and the clock (AAP 0.2.1, AAP 0.18.2). The function is a pure function of its
 * two arguments: it reads no system clock, opens no random source, holds no module-level mutable value
 * and performs no I/O, so the same arguments always produce a deeply equal result. Neither argument nor
 * any record inside it is modified, every array returned is built here, and every ordering is stated
 * (ascending series dates, canonical plant order, identifier order, most-recent-first changes) rather
 * than inherited from an engine's comparison or a caller's array order.
 *
 * Rules this module is built to satisfy:
 * - P-6: every number is computed from the records handed in — a count of the exceptions in scope, a
 *   duration between two record instants, a euro amount `revenueOfAffectedLines` computed, or a share of
 *   the material master — and the two helpers of `src/domain/solver/rounding.ts` are the only rounding
 *   applied: `halfUp2` for money and `wholePercent` for the readiness share.
 * - P-5: every value here is a first-party figure computed from first-party records. Nothing in this
 *   module reads a market-intelligence value, so no tile, row, series point or change can blend the
 *   two provenances.
 * - P-2: it imports the shared types, one rounding helper, the calendar module and the exception
 *   aggregates — no seed record, no adapter, no service module and no React — so it cannot become a
 *   second data boundary. Every calendar date it needs comes from `src/domain/solver/calendar.ts`,
 *   the pure core's single civil-date implementation, and none is derived here.
 * - P-1: it emits no label and no `SimLabel`; the component that renders a tile or a chart mark applies
 *   the `Simulated calculation` label.
 * - P-3: the scope handed in reflects the demonstration's browser-side role scoping. This module
 *   narrows by it and asserts nothing about authorisation; the adapter applies the same role scope to
 *   every call it serves.
 * - P-4: it reports counts, durations and amounts and claims no security property; the declared and
 *   simulated wording belongs to the screens that carry it.
 * - P-7: the only identifiers it handles are the synthetic records handed in, and no company, person
 *   or vendor name is written here.
 * - B-1 and B-2: it contacts no host, addresses none and reads no configuration.
 *
 * Alternate-source readiness — the aggregate that is not a tile. AAP 0.8's row for this module and
 * contracts §5 both name alternate-source readiness among the overview aggregates, rounded through
 * `wholePercent`, and `Overview.alternateSourceReadinessPercent` in `src/types/screen-dto.ts` is where
 * it reaches a screen. `alternateSourceReadiness` below states the rule it follows: a material is in
 * scope when the products it goes into meet the resolved scope's products, where an empty `products`
 * member is the "All products" selection `./scope` states, so the rule is the product admission the
 * rest of the overview already applies; the part is the in-scope materials carrying an
 * `alternateSupplierId`; the whole is the in-scope materials; and the part over its whole is rounded
 * half up to a whole percent. With no material in scope the member is `0`, the identity of an empty set
 * rather than a reading of zero readiness. It is reported once for the overview and not per
 * `PlantRiskRow`, because a material record names the products it goes into and no plant: a per-plant
 * share would read a plant into records that do not carry one.
 *
 * The last-visit window. No record carries the instant of a user's previous visit, so "since your last
 * visit" dates from the start of the most recent working day before the as-of date through the as-of
 * instant. The working calendar is the one contracts §1 fixes, so a visit on a Monday covers the
 * preceding Friday instead of an empty weekend, and the window is derived from `asOf` alone: no clock
 * is read and nothing is persisted.
 *
 * The order book. A customer order reaches this module as an `AffectedLine` or as the exception
 * aggregate's `OrderBookEntry`, and `ExceptionAggregateInput.customerOrders` — inherited by this
 * module's bundle — is the order book the affected-line derivation reads. `src/types` declares no
 * separate order type, and none is declared here.
 *
 * The plant an exception is counted at, which is the plant it is recorded at. The queue admits an
 * exception that lands on a plant in scope *or* reaches one through `alsoAffectsPlantIds`, and the
 * by-plant rows must add up to the tiles, so each admitted exception is counted at exactly one plant:
 * the record's own `plantId`, which is the plant the queue's row carries. Nothing is folded into an
 * in-scope plant, so a plant's figure is the same whatever the selection is — an exception recorded at
 * one plant that reaches another is the recorded plant's on both surfaces, and the selection decides
 * only which exceptions are counted, never where they are counted. The rows therefore cover every
 * plant the selection names and every plant an admitted open exception is recorded at, and no
 * exception is counted twice or left out of them (AAP 0.2.1).
 *
 * The median's two conventions. AAP 0.8 fixes "the middle value of the qualifying history records" and
 * states no even-count case, so an even number of qualifying plans takes the arithmetic mean of the two
 * middle values, which is why the member is presented unrounded; with no qualifying record the member is
 * `0`, the identity of an empty set rather than a business reading of zero hours.
 *
 * The series counts one side from the record and the other from the trail. An exception's own
 * `detectedAt` dates its detection, so the opened count reads that member and no exception is missing
 * from it; an exception record carries no resolved-at member, so the resolved count reads the activity
 * trail's `resolved` records. The days are calendar days, because the chart's dates are the queue
 * filter's own keys and a skipped weekend would leave a gap in an axis the queue has a date for, and
 * both counts are whole exceptions.
 *
 * The two record shapes declared here. A plant's name and an activity record's own text are record
 * content this module reads, and `src/types` declares neither a plant record nor an activity record, so
 * `NamedPlant` and `ActivityRecord` below are the minimal shapes of the call, in the manner of
 * `PricedProduct` and `OrderBookEntry` in `./exceptions` and `ScopeFilterInput` in `./scope`: a full
 * plant record and a full exception-history record are both assignable to them, so the adapter passes
 * its records through without mapping them.
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
// The queue's row-admission predicates are stated once, in `./exceptions`, and imported here: the
// exception queue and this overview admit a record by one plant predicate and one product predicate,
// so a change to either cannot leave a narrowed queue and a narrowed overview describing different
// populations (AAP 0.2.1).
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
 * Milliseconds in an hour: the divisor that turns the difference between two record instants into the
 * hours the fourth tile is measured in.
 */
const MILLIS_PER_HOUR = MILLIS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

/**
 * Days the opened-and-resolved series reports, the fourteen days `platform-specification.md` SCR-01
 * fixes for the overview's per-day chart.
 */
const SERIES_LENGTH = 14;

/**
 * Days the search for the previous working day may step back before it gives up: a full week always
 * contains one Monday to Friday, because the calendar of contracts §1 has no holiday table.
 */
const WORKING_DAY_LOOKBACK = 7;

/**
 * The fourth tile's value with no qualifying record: the identity of an empty set, not a reading of
 * zero hours between a detection and an approval.
 */
const NO_QUALIFYING_MEDIAN = 0;

/**
 * The readiness share with no material in scope: the identity of an empty set, not a reading that none
 * of a sourced population has an alternate.
 */
const NO_MATERIAL_IN_SCOPE = 0;

/**
 * The activity-trail action that dates the moment an exception was detected, as
 * `src/seed/exception-history.ts` spells it. The series counts its opened days from the exception
 * record's own `detectedAt` instead, which every exception carries; the median measures from this
 * action, so both of its ends are activities of the same trail.
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
 * Declared here rather than in `src/types` because it is not a contracts type but the minimal shape of
 * the call; the plant records of `src/seed/plants.ts` are richer (`lines`, coordinates, capacity) and
 * assignable to it, so the adapter passes them through without mapping them.
 */
export interface NamedPlant {
  /** The plant's identifier, one of `PLT-RGB`, `PLT-BRN`, `PLT-QRO` or `PLT-RAK`. */
  readonly id: PlantId;

  /** The plant's display name, as the plant record states it. */
  readonly name: string;
}

/**
 * One material, as the readiness share reads it: the products it goes into and whether a second
 * supplier can cover it.
 *
 * Declared here rather than in `src/types` for the same reason as `NamedPlant`: it is not a contracts
 * type but the minimal shape of the call, and the material records of `src/seed/materials.ts` are
 * richer — name, primary supplier, origin, unit cost, lead time — and assignable to it, so the adapter
 * passes them through without mapping them.
 */
export interface SourcedMaterial {
  /** The material's identifier, `MAT-` followed by its own key. */
  readonly id: MaterialId;

  /** The products the material goes into, which is the reach the product selection admits it by. */
  readonly productIds: readonly ProductId[];

  /**
   * The second qualified supplier that can cover the material, absent where the material is
   * single-sourced: the one member the readiness share counts.
   */
  readonly alternateSupplierId?: SupplierId;
}

/**
 * One activity on an exception, as the trail records it: the instant, what was done and the record's
 * own account of it.
 *
 * `src/seed/exception-history.ts` owns the fuller record — its own key and the actor — and is
 * assignable to this shape. Two members are read here and no more: `occurredAt` dates an activity for
 * the changed-since list, the median and the resolved count, and `note` is the account the list shows
 * as its detail.
 */
export interface ActivityRecord {
  /** The exception the activity happened on. */
  readonly exceptionId: ExceptionId;

  /** When the activity happened, ISO 8601 in the application's time zone. */
  readonly occurredAt: Timestamp;

  /**
   * What was done, spelled as the trail spells it. Typed as an open string rather than a closed union
   * because this module reads two members of the trail's vocabulary (`approved` and `resolved`) and
   * owns neither; a trail that grows an action needs no change here.
   */
  readonly action: string;

  /** What happened, in plain words, as the record states it. */
  readonly note: string;
}

/**
 * Every record the overview is computed over, in one bundle.
 *
 * AAP 0.12.1's signature names `records` as what `computeOverview` is computed over, and this interface
 * is that argument. It extends the exception aggregate's own bundle, so the adapter that already builds
 * one for the queue hands the same object here: the exceptions, the product prices their lines are
 * valued at, the order book, the baseline solves, the read's freshness and the as-of instant are the
 * queue's, and the overview adds only what it alone reads — the plants it groups by, the material
 * master its readiness share counts, the activity trail it dates changes and approvals from, and the
 * approvals themselves.
 *
 * Inheriting the queue's bundle is what makes the two agree: this module admits exceptions with the same
 * two filters the queue applies and values their revenue through the same function, so a narrowed queue
 * and a narrowed overview cannot describe different populations. The inherited `freshness` member is the
 * one part of the bundle this module does not read — the overview declares no freshness member of its
 * own — and it arrives because the adapter builds one bundle for both reads rather than two.
 *
 * The bundle is read and never modified and holds no computed figure; every member is a record, the
 * state of the read, or the demonstration clock's instant.
 */
export interface OverviewInput extends ExceptionAggregateInput {
  /** The plants the by-plant rows report on, each with the name its record states. */
  readonly plants: readonly NamedPlant[];

  /**
   * The material master the alternate-source readiness share is measured over.
   *
   * One record per material, carrying the products it goes into and the second supplier that can cover
   * it. `alternateSourceReadiness` counts the materials the resolved scope's products reach, so this
   * member and the scope the call is made with are all the figure reads.
   */
  readonly materials: readonly SourcedMaterial[];

  /** The activity trail, which dates the changed-since list, the median and the resolved count. */
  readonly history: readonly ActivityRecord[];

  /**
   * The approval records, in any order.
   *
   * A decided approval is listed in the changed-since list from its own record, because a decision is a
   * change in its own right and carries the decider's comment as its account. The trail's mirroring
   * `approved` activity is not listed a second time where the approval itself is (see `collectChanges`).
   */
  readonly approvals: readonly Approval[];
}

/* ---------------------------------------------------------------------------------------------
 * C. Instants and calendar dates
 * ------------------------------------------------------------------------------------------- */

/*
 * The civil-date arithmetic itself lives in `../solver/calendar`, the pure core's one implementation
 * of it: `calendarDateOf` reads the calendar date a record's own instant states, `shiftIsoDate` moves
 * a date by whole days, and `isWorkingDay` answers the working calendar contracts §1 fixes. This
 * module expresses the series' fourteen days and the changed-since window through those functions
 * rather than through copies of its own, so a correction to a leap rule, a month length or a date
 * format is made once. What stays here is what concerns an instant rather than a calendar date — an
 * elapsed-time measurement, and the code-unit ordering every non-date ordering of this module uses.
 */

/**
 * Compares two strings by code unit, ascending.
 *
 * Every ordering in this module that is not a date or a duration uses this comparison: a locale
 * comparison would order by the host's collation, where code-unit order answers identically everywhere
 * (AAP 0.18.2).
 *
 * @param left One string.
 * @param right The other string.
 * @returns A negative number when `left` sorts first, a positive one when `right` does, zero when they
 *   are equal.
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
 *
 * @param from The earlier instant.
 * @param to The later instant.
 * @returns The elapsed hours, or `null` when either instant is unreadable or the order is reversed.
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
 * Finds the most recent working day before a date.
 *
 * Implements the calendar of contracts §1 through `isWorkingDay`, so a visit dated on a Monday reaches
 * back to the preceding Friday and the window it opens is the one a planner would expect. The search
 * steps back at most a week, which always contains one working day because the calendar has no holiday
 * table.
 *
 * @param date The date to look back from, as `YYYY-MM-DD`.
 * @returns The nearest preceding working day, or `null` when the argument is not a well-formed date.
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
 * AAP 0.8 fixes "the middle value of the qualifying history records" for the fourth tile and leaves the
 * even-count case open: with an even number of plans the value is the arithmetic mean of the two middle
 * durations, which is why the member is presented unrounded. With no qualifying plan the answer is the
 * empty set's identity rather than a reading of zero hours.
 *
 * @param durations The qualifying durations, in any order.
 * @returns The median duration, unrounded, or `NO_QUALIFYING_MEDIAN` for an empty set.
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
 * One exception the resolved scope admits, with the plant it is counted at, the affected lines derived
 * for it and the revenue those lines place at risk.
 *
 * The pair keeps the two decisions apart. Whether the exception is in the population is the scope's
 * answer, through `admitsPlant`; where it is counted is the record's own answer, its `plantId`. Reading
 * the plant from the record rather than from the selection is what makes one attribution serve both
 * surfaces: the queue's row and the by-plant row of this aggregate name the same plant for the same
 * exception, so no exception is counted twice and none the queue would show is missing here. The lines
 * and their amount travel with it because both are computed once, where they are first in hand, and
 * every tile and row that needs them reads them here (AAP 0.2.1).
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
   *
   * `revenueOfAffectedLines` computes it from the very lines this entry carries, so the revenue tile and
   * the by-plant rows read an amount rather than valuing the same lines again (AAP 0.2.1, AAP 0.8).
   */
  readonly revenue: Money;
}

/**
 * Collects the exceptions the resolved scope admits, each with the plant it is counted at.
 *
 * The two filters are the queue's own: the plant selection, applied through `admitsPlant`, and the
 * product selection, applied through `admitsProducts` over the products the exception's affected lines
 * name. Both predicates and `productIdsOf` are imported from `./exceptions`, where they are stated
 * once: the queue and the overview admit by one pair of rules, so a change to plant or product
 * admission cannot leave the two describing different populations. Both modules also read the one
 * `Scope` that `./scope` resolved (AAP 0.2.1).
 *
 * The plant an admitted exception is attributed to is the record's own `plantId`, which is the plant
 * the queue's row carries. The selection decides only which exceptions are in the population, never
 * which plant one of them is counted at, so an exception is counted at the same plant on both surfaces
 * whatever the selection is.
 *
 * A resolved `plants` member is never read as "all plants": `resolveScope` states that an empty array
 * means nothing is in scope and `admitsPlant` reads it that way, so a selection outside the acting
 * role's scope yields no entries rather than another plant's records.
 *
 * The affected lines and the revenue they place at risk are derived and valued once here, where the
 * lines are first in hand, and every tile and row that needs them reads them from the entry rather than
 * computing them again (AAP 0.18.2).
 *
 * The affected lines are derived once per admitted exception and valued once, where they are in hand,
 * which is why the customer-order count, the revenue tile and the by-plant rows all read one entry and
 * no caller re-derives or re-values it (AAP 0.2.1). An exception the product selection rejects is never
 * valued, so the refusal an unpriceable line raises stays about a line this overview actually counts.
 * Ordering: the exceptions come back in ascending identifier order, so two calls with the same records
 * return the same sequence and a caller can assert it.
 *
 * @param records The record bundle: the exceptions, the prices, the order book and the baseline solves.
 * @param scope The resolved scope, from `./scope`'s `resolveScope`.
 * @returns Fresh entries for the admitted exceptions, in ascending identifier order.
 * @throws UnpriceableLineError when an admitted exception's affected line names a product the bundle
 *   carries no price for, since its revenue could not be computed. The refusal is raised here because
 *   this is where the lines are valued.
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
 * `ExceptionStatus` fixes three states and this module reads one of them: an exception is open when its
 * status says so, and a resolved or dismissed exception is history the tiles do not count. The three risk
 * tiles and the by-plant rows share this reading, which is what keeps the tile and the row sum equal.
 *
 * @param exception The exception to read.
 * @returns `true` when the exception's status is `open`.
 */
function isOpen(exception: OperationalException): boolean {
  return exception.status === 'open';
}

/**
 * Reads a plant's display name from the bundle.
 *
 * A plant the bundle carries no record for is labelled by its own identifier, which is the record's key
 * as the scope names it. Nothing is invented and nothing is left blank, and no plant name is written in
 * this file (rule P-6).
 *
 * @param plants The plant records the bundle carries.
 * @param plantId The plant whose name is wanted.
 * @returns The name the plant record states, or the plant's identifier when the bundle carries none.
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
 * Measures alternate-source readiness: the share of the in-scope materials a second supplier can cover.
 *
 * Implements contracts §5 and AAP 0.8's "readiness through `wholePercent`". A material is in scope when
 * the products it goes into meet the resolved scope's product selection, which is the admission the
 * exception rows are narrowed by — `admitsProducts`, whose empty `products` member is the "All products"
 * selection `./scope` states — so the share describes the same product selection as the rest of the
 * overview. The part is the in-scope materials carrying an `alternateSupplierId`, the whole is every
 * in-scope material, and the part over its whole is rounded half up to a whole percent, the one rounding
 * AAP 0.8 fixes for readiness.
 *
 * A material record names no plant, which is why the figure is reported once for the overview rather
 * than per by-plant row. With no material in scope the answer is the empty set's identity rather than a
 * reading that a population of nothing is unsourced, and the division by zero that reading would need is
 * never taken.
 *
 * @param materials The material master the bundle carries, in any order.
 * @param scope The resolved scope, whose products member is the product selection.
 * @returns The readiness as a whole percent in `[0, 100]`, and `0` when no material is in scope.
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
 * Every term is the amount `revenueOfAffectedLines` valued for that exception from the very lines
 * `scopedExceptions` derived, so no term is derived or valued a second time here, and no term is rounded
 * on its way into the total: the total is closed once through `halfUp2`, which is the only rounding this
 * module applies (AAP 0.8, contracts §4 rule 5). The by-plant rows partition exactly these amounts, so
 * the tile and the rows add up to the cent.
 *
 * @param open The open exceptions the scope admits, each with the lines derived for it and the revenue
 *   they were valued at.
 * @returns The revenue at risk in euro, at most two decimals, and `0` when nothing is open.
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
 * An exception touches a customer order by naming it on a line, so the count is of distinct order
 * identifiers rather than of lines: two exceptions that reach the same order put one order at risk, not
 * two. The lines are the ones the bundle's baseline solves produced, so the figure follows the same
 * derivation the revenue and the queue use.
 *
 * @param open The open exceptions the scope admits, lines in hand.
 * @returns The number of distinct customer orders, as a whole count.
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
 * Both ends are activities of the trail the caller handed in: the earliest `opened` activity dates the
 * detection, and the earliest `approved` activity at or after it dates the approval (AAP 0.8's
 * "qualifying history records"). A trail with no opened activity, no approval after the detection, or an
 * unreadable instant contributes nothing to the median rather than a duration of zero, because neither
 * absence is a measurement that a plan took no time.
 *
 * @param activity The trail records of one exception, or `undefined` when the trail has none.
 * @param exceptionId The exception the activities must belong to.
 * @returns The elapsed hours, unrounded, or `null` when the exception has no qualifying pair.
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
 * The qualifying population is every exception the scope admits that carries both activities, whatever
 * its current status — a plan approved on an exception that has since been resolved is a real
 * measurement of how long approval took, and excluding it would bias the tile towards the exceptions
 * still open. The middle value is unrounded, as AAP 0.8 fixes it, and an empty population returns the
 * empty set's identity rather than a reading of zero hours.
 *
 * @param scoped The exceptions the scope admits.
 * @param historyByException The trail, grouped by the exception each activity belongs to.
 * @returns The median hours, unrounded, or `NO_QUALIFYING_MEDIAN` when no plan qualified.
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
 * The set is the selection's own plants together with the plant each admitted open exception is
 * recorded at. The order is `records.plants`' — the canonical plant order the records state — so two
 * calls with the same records return the same sequence; a plant no plant record holds follows those
 * that do, in the order it is first named, the selection first and then the admitted exceptions in
 * their own order.
 *
 * @param records The record bundle: the plant records that state the canonical order.
 * @param scope The resolved scope, whose plants member is one half of the set.
 * @param open The open exceptions the scope admits, whose recorded plants are the other half.
 * @returns The plant identifiers the rows cover, each once, in the stated order.
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
 * Groups the open exceptions by the plant each is recorded at, one row per plant the read reports.
 *
 * The rows are the tiles split by plant: the open count and the revenue at risk of the exceptions
 * recorded at each plant, so the rows partition the admitted open exceptions and add up to the tiles
 * exactly. Each exception's amount is the one `scopedExceptions` valued where its lines were derived, so
 * nothing is valued again here. A row is emitted for every plant the resolved scope names — a plant in
 * scope with nothing open keeps its row, with a count and an amount of zero, because a plant a planner
 * can see and that has no exception is a reading in its own right — and for every plant an admitted open
 * exception is recorded at. The second half is what gives an exception recorded outside the selection its
 * own row instead of folding it into an in-scope one, and it is the queue's own attribution read here, so
 * the two surfaces group the same rows the same way (AAP 0.2.1).
 *
 * The order is the canonical plant order `records.plants` states — `PLT-RGB`, `PLT-BRN`, `PLT-QRO`,
 * `PLT-RAK` — never the selection's or the caller's own order, so the table reads the same way twice
 * whatever the selection is. {@link plantRowOrder} states it and the set it orders.
 *
 * @param records The record bundle: the plant records that fix the order and label the rows.
 * @param scope The resolved scope, whose plants member fixes the rows a selection names.
 * @param open The open exceptions the scope admits, each with the revenue its lines were valued at.
 * @returns A fresh row per plant the selection names or an admitted open exception is recorded at.
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
 * This is the series' own rule, stated once and exported, so the counts and the queue's day filter
 * cannot drift apart: an exception counts on a day when its record was detected that day — the
 * `detectedAt` member every exception carries, which dates the opened count — or when its activity
 * trail holds a `resolved` record that day, which is where the resolved count reads it. A day is a
 * calendar date read from the instant in
 * that instant's own offset, through the same {@link calendarDateOf} the counts use, so no time zone,
 * locale or clock of the host can move an exception to another day. A day that is not a well-formed
 * calendar date matches nothing rather than throwing: it is a caller's malformed filter, and the read
 * it narrows answers with no rows.
 *
 * The history is the whole activity trail rather than this exception's slice, because that is the shape
 * the adapter holds and the trail is small; every record that is not this exception's resolution on
 * this day is ignored without being indexed.
 *
 * @param exception - The exception to place on the day.
 * @param history - The activity trail the resolved side is read from.
 * @param day - The calendar date to test, as `YYYY-MM-DD`.
 * @returns `true` when the exception was opened or resolved on that day.
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
 * Counts the exceptions opened and resolved on each of the fourteen days ending on the as-of date.
 *
 * The opened count reads each exception record's own `detectedAt`, which every exception carries, so no
 * exception is missing from it; the resolved count reads the activity trail's `resolved` records, because
 * an exception record carries no resolved-at member.
 * Both are counts of whole exceptions and both are restricted to the exceptions the scope admits.
 * {@link openedOrResolvedOn} states that rule for one day at a time and is what the queue's day filter
 * reads; this function states it as the two counts a chart draws, over one sweep of the records.
 *
 * The days are calendar days, ascending, ending on the as-of date and derived from that instant alone, so
 * the series is the same length on every run and its last point is the day the demonstration clock stands
 * on — the date the queue filters by. A day with no activity keeps its point with two zeros rather than
 * being dropped, so a chart drawn from the series has no gap in its axis. An as-of instant whose opening
 * characters are not a calendar date yields an empty series rather than a throw, because the tile and the
 * rows are still worth reporting without it.
 *
 * @param records The record bundle: the exceptions, the trail and the as-of instant.
 * @param scoped The exceptions the scope admits.
 * @param asOfDate The calendar date the as-of instant falls on, or `null` when it is unreadable.
 * @returns One point per day, in ascending date order.
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
 * The window opens on the start of the most recent working day before the as-of date and closes at the
 * as-of instant itself, so nothing dated after the demonstration clock is reported as a change. The
 * opening bound is compared as a calendar date, read in the instant's own offset, and the closing bound
 * as an instant, because a record written later on the as-of date has not happened yet by the clock.
 *
 * @param instant The instant of the record's own change.
 * @param windowStart The first calendar date the window admits.
 * @param asOfMillis The as-of instant in milliseconds, or `NaN` when it could not be read.
 * @returns `true` when the instant is on or after the window's first day and not after the as-of instant.
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
 * Two record kinds make a change. An activity on the trail — opened, assigned, noted, dismissed or
 * resolved — is listed from the trail record, whose `note` is its own account of what happened. A
 * decision on an approval is listed from the approval record, whose decider comment is the account and
 * whose identifier opens the approval itself. Where both describe the same decision, the trail's
 * mirroring `approved` activity is not listed beside the approval, so a decision appears once; an
 * approval the bundle does not carry is still reported from the trail it left.
 *
 * The list is ordered most recent first, then by reference and detail by code unit, so the order is a
 * function of the records rather than of the bundle's array order. The window is the one the module
 * header records, derived from the as-of instant alone (AAP 0.2.1's purity, rule P-6's no typed figure).
 *
 * @param records The record bundle: the trail, the approvals and the as-of instant.
 * @param scoped The exceptions the scope admits, which is what limits the list to what the user may see.
 * @param asOfDate The calendar date the as-of instant falls on, or `null` when it is unreadable.
 * @returns Fresh entries, most recent change first, or an empty list when nothing changed in the window.
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
 * The median walks one exception's activities at a time, so the trail is indexed once instead of scanned
 * once per exception. The groups keep the trail's own order, which makes the earliest-activity search in
 * `approvedPlanHours` a matter of the records rather than of the map.
 *
 * @param history The activity trail, in any order.
 * @returns A fresh map from an exception identifier to that exception's activities.
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
 * Computes the overview: the four tiles, the alternate-source readiness share, the changed-since list,
 * the by-plant rows and the series — contracts §5; AAP 0.8's overview row; AAP 0.12.1's overview
 * aggregates.
 *
 * One pure call over the records the caller hands in and a scope the caller has already resolved, which
 * is the whole contract of this module: the scope is never re-derived (AAP 0.2.1), no clock is read (the
 * as-of instant travels in the bundle, since AAP 0.12.1's signature carries no clock parameter), no
 * random source is opened and nothing is written to a global. The same two arguments always produce a
 * deeply equal `Overview`, and neither argument nor any record inside it is modified — every array and
 * object returned is built here.
 *
 * What each member is computed from:
 * - `openExceptions` counts the exceptions the scope admits whose status is open.
 * - `revenueAtRiskEur` sums the amount each of those exceptions was valued at once, where its affected
 *   lines were derived, and closes the total once through `halfUp2`.
 * - `customerOrdersAtRisk` counts the distinct customer orders their affected lines name.
 * - `medianHoursToApprovedPlan` takes the middle detection-to-approval duration of the exceptions that
 *   carry both activities, unrounded.
 * - `alternateSourceReadinessPercent` reports the share of the in-scope materials a second supplier can
 *   cover, rounded half up through `wholePercent`.
 * - `changedSinceLastVisit` lists the activity and the decisions of the window the module header fixes.
 * - `byPlant` groups the open exceptions by the plant each is recorded at, over the plants the
 *   selection names and the plants those exceptions are recorded at, in canonical plant order, so the
 *   rows add up to the tiles and a plant's figure is the same whatever the selection is.
 * - `openResolvedSeries` reports the fourteen days ending on the as-of date.
 *
 * Every figure reaches a screen as a computed one and carries `Simulated calculation` there (rule P-1);
 * this module emits no label, and nothing it returns combines a first-party value with a
 * market-intelligence one (rule P-5).
 *
 * @param records The record bundle: the exceptions, the product prices their lines are valued at, the
 *   order book, the baseline solves, the plants, the material master, the activity trail, the approvals
 *   and the as-of instant.
 * @param scope The resolved scope, from `./scope`'s `resolveScope`. Its `plants` member empty means
 *   nothing is in scope.
 * @returns The computed overview, freshly built.
 * @throws Error when an in-scope exception's affected line names a product the bundle does not carry,
 *   since its revenue could not be computed.
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

