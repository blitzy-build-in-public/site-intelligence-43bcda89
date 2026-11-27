/**
 * Urgency ordering and the FileMap canvas ribbon: the two aggregates that order and summarise the
 * exception figures the rest of `src/domain/aggregation` computed, and compute none of their own.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §5, which fixes the computed aggregates as pure functions over records,
 *   and AAP 0.8's "Urgency" row, which fixes this module's share of them: the urgent-exception
 *   ordering and the canvas ribbon's six tiles, "no arithmetic beyond the modules above; ordering
 *   only".
 * - AAP 0.12.1's "Urgency" row, which fixes the public interface — `sortUrgent(rows)` returning
 *   `ExceptionRow[]` ordered by severity, then days to impact, then revenue at risk descending, plus
 *   "the six ribbon tiles" — and records the module's dependency as types only.
 * - `platform-specification.md` SCR-02, which fixes the exception queue's default sort as severity
 *   then days to impact, and SCR-12, which fixes the canvas ribbon of six computed tiles (both
 *   restated in AAP 0.12.4).
 * - AAP 0.10, which fixes where a simulation label is carried: by the component that renders the
 *   element, never by the module that supplies its value.
 *
 * Ordering is a comparison, not arithmetic. No sum, difference of business values, rounding or
 * formatting appears in this module: a tile's value is an `Overview` member copied across, or a count
 * of the rows the caller handed in, which is why the ribbon adds no figure of its own and why rule
 * P-6's "every number is computed by the solver or from seed records" holds for it by construction.
 *
 * One source for the order. `SEVERITY_RANK` below is the only statement of how the four severity
 * levels rank, so the queue's default sort (SCR-02) and the canvas's urgent stack (SCR-12) cannot
 * order the same records differently. The rank is never derived from the level's spelling: an
 * alphabetical comparison would place `high` above `medium`, which is the opposite of the order the
 * inputs fix.
 *
 * Determinism and purity (AAP 0.2.1, AAP 0.18.2). Neither function reads a clock, a random source,
 * a locale or a mutable module-level value, and neither modifies its arguments: `sortUrgent` sorts a
 * copy and `computeRibbonTiles` builds fresh tile objects, so the same arguments yield the same order
 * and the same tiles on every engine and on every run.
 *
 * Rules this module is built to satisfy:
 * - P-6: every number it emits is copied from a computed aggregate or counted from the rows handed
 *   in. It types no amount, identifier, threshold or duration.
 * - P-5: every tile is `computed` provenance, and nothing here reads a market-intelligence value, so
 *   a competitor figure cannot enter a ribbon tile.
 * - P-1: it carries no label text. The tile's caption, its evidence reference and its `Simulated
 *   calculation` label belong to the component that renders it.
 * - P-2: it imports the shared types and nothing else — no seed record, no adapter, no service
 *   module and no React — so it cannot become a second data boundary.
 * - P-3: the rows it orders arrive already scoped for the acting role by the service, whose scoping
 *   is a demonstration control rather than production authorisation; nothing here widens or narrows
 *   that set.
 * - P-4: it describes an order and a set of counts, and asserts no security property about itself;
 *   the declared and simulated wording is the business of the screens that carry it.
 * - P-7: the tile identifiers are neutral aggregate keys, and no company, person or vendor name
 *   appears in the module.
 * - B-1 and B-2: it contacts nothing, reads no configuration and holds no credential-shaped literal,
 *   because it derives its answer from records that are already in hand.
 *
 * OPEN ITEM: the inputs fix that the canvas ribbon carries six computed tiles (AAP 0.12.1, AAP 0.12.4)
 * without listing them, so the six below are chosen from the aggregates this folder already computes,
 * in this order: `open-exceptions` reading `Overview.openExceptions`, `critical-exceptions` counting
 * the rows handed in whose severity is `'critical'`, `revenue-at-risk` reading
 * `Overview.revenueAtRiskEur`, `customer-orders-at-risk` reading `Overview.customerOrdersAtRisk`,
 * `median-hours-to-approved-plan` reading `Overview.medianHoursToApprovedPlan`, and `plants-in-scope`
 * reading the length of `Overview.byPlant`. A consumer — `src/services/mock/handlers/topology.ts`,
 * the SCR-12 handlers or `src/features/scr-12-filemap-canvas/canvas-ribbon.tsx` — may reorder these
 * six, but may not supply a number of its own, add a seventh tile or add a member to `Overview`: the
 * set is closed until an input names the specification's own list.
 * OPEN ITEM: `ExceptionRow.daysToImpact` and `ExceptionRow.revenueAtRiskEur` are required numbers in
 * `src/types/screen-dto.ts`, so a guard for an absent value is never needed to satisfy the types. The
 * comparison still reads both through `Number.isFinite`, because a row assembled from a partially
 * filled aggregate can carry `NaN`, and a `NaN` operand makes every comparison against it false and
 * would silently leave two rows in the order the sort happened to visit them. A non-finite value is
 * therefore given an explicit place — last among its severity for days to impact, last among its day
 * group for revenue — rather than being allowed to corrupt the order.
 */

import type { ExceptionId, ExceptionRow, Overview, Provenance, Severity } from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The severity ordering — SCR-02 default sort, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The rank of each severity level: the single statement of how the four levels order, ascending from
 * the most urgent.
 *
 * AAP 0.12.1 fixes the urgent ordering as severity first, and `Severity` fixes the four levels. A
 * `Record` over the union rather than a list or an alphabetical comparison is what makes the order
 * total and what turns a missing level into a compile error: the spelling of `medium` and `high`
 * would sort the wrong way round, and the queue's default sort must not depend on that.
 */
const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * The most urgent severity level, which is the head of `SEVERITY_RANK`.
 *
 * Named once so the ribbon's count of urgent exceptions and the ordering read the same level, and so
 * neither states the level's spelling independently of the table.
 */
const HEAD_OF_URGENCY: Severity = 'critical';

/**
 * The rank given to a severity the table does not know.
 *
 * Such a row sorts after the four known levels rather than ahead of them: a record whose severity is
 * outside the union cannot be called the most urgent one, and placing it last keeps it visible without
 * displacing the rows whose urgency the inputs do fix.
 */
const UNRANKED_SEVERITY = Number.POSITIVE_INFINITY;

/* ---------------------------------------------------------------------------------------------
 * Comparison helpers — comparisons only, never arithmetic on business values
 * ------------------------------------------------------------------------------------------- */

/**
 * Compares two numbers as a sort comparator: negative when the left sorts first, positive when the
 * right does, zero when they are equal.
 *
 * Stated as comparisons rather than as a subtraction, because the difference of two money values is
 * a business arithmetic result and this module computes none (rule P-6). The three-way form also
 * answers `0` for two equal infinities, which is the case the two "unknown" constants below rely on.
 */
function compareNumbers(left: number, right: number): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

/**
 * Reads a numeric member as a comparable number, substituting `fallback` where the value is absent or
 * not finite.
 *
 * The types say these members are numbers, so this guard never changes a value that a caller could
 * legitimately pass; it exists for the `NaN` a partially filled aggregate can carry, which would
 * otherwise make every comparison against it false (see the second OPEN ITEM in the module header).
 */
function comparableOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

/**
 * Compares two exception identifiers as a sort comparator: code-unit order, ascending.
 *
 * This is the ordering's final tiebreak, so it must not depend on the machine: `localeCompare` would
 * order by the host's collation and could put two rows in a different order on two machines, where a
 * code-unit comparison answers identically everywhere (AAP 0.18.2). Every seeded identifier shares
 * one shape — `EXC-2026-nnnn` — so code-unit order is also the order a reader expects.
 */
function compareExceptionIds(left: ExceptionId, right: ExceptionId): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

/**
 * A row's position in the severity ordering, read through `SEVERITY_RANK`.
 *
 * @param row The row whose severity is read.
 * @returns The level's rank, or `UNRANKED_SEVERITY` for a level the table does not hold.
 */
function severityRankOf(row: ExceptionRow): number {
  return comparableOr(SEVERITY_RANK[row.severity], UNRANKED_SEVERITY);
}

/**
 * A row's days to impact as a comparable number, with an absent or non-finite value sorting last
 * within its severity.
 *
 * The fallback is positive infinity, so a row carrying no usable days-to-impact value is placed after
 * every row of the same severity that does carry one, and the next sort key — revenue at risk — decides
 * between two such rows.
 */
function daysToImpactOf(row: ExceptionRow): number {
  return comparableOr(row.daysToImpact, Number.POSITIVE_INFINITY);
}

/**
 * A row's revenue at risk as a comparable number, with an absent or non-finite value sorting last
 * within its severity and day group.
 *
 * The fallback is negative infinity, which is last under the descending order this key is compared in.
 */
function revenueAtRiskOf(row: ExceptionRow): number {
  return comparableOr(row.revenueAtRiskEur, Number.NEGATIVE_INFINITY);
}

/* ---------------------------------------------------------------------------------------------
 * The urgent ordering — SCR-02 default sort, SCR-12 urgent stack
 * ------------------------------------------------------------------------------------------- */

/**
 * Orders exception rows by urgency: severity first, then days to impact ascending, then revenue at
 * risk descending, then identifier ascending.
 *
 * Implements AAP 0.12.1's "Urgency" row and SCR-02's default sort (AAP 0.12.4). The four keys, in the
 * order they decide a pair of rows:
 * 1. `severity`, ranked by `SEVERITY_RANK`, most urgent first.
 * 2. `daysToImpact` ascending, so the disruption that reaches a customer order soonest comes first.
 *    A row carrying no usable value sorts after every row of its severity that does carry one.
 * 3. `revenueAtRiskEur` descending, so the more expensive disruption comes first among rows that agree
 *    on the two keys above. A row carrying no usable value sorts last within its day group.
 * 4. `id` ascending, which makes the order total: two rows that agree on every business field come
 *    back in one fixed order, so a re-render cannot swap them and a test can assert the sequence.
 *
 * The rows are read and not modified: the returned array is a new one, holding the caller's own row
 * objects, and the caller's array keeps its order. Two calls with the same rows therefore return the
 * same sequence (AAP 0.18.2), which is what lets a screen's urgent stack be asserted once.
 *
 * @param rows The rows to order, in any order, scoped already by the service. Neither the array nor
 *   any row in it is modified.
 * @returns A new array holding the same rows, most urgent first.
 */
export function sortUrgent(rows: readonly ExceptionRow[]): ExceptionRow[] {
  return [...rows].sort((left, right) => {
    const bySeverity = compareNumbers(severityRankOf(left), severityRankOf(right));
    if (bySeverity !== 0) {
      return bySeverity;
    }

    const byDaysToImpact = compareNumbers(daysToImpactOf(left), daysToImpactOf(right));
    if (byDaysToImpact !== 0) {
      return byDaysToImpact;
    }

    const byRevenueAtRisk = compareNumbers(revenueAtRiskOf(right), revenueAtRiskOf(left));
    if (byRevenueAtRisk !== 0) {
      return byRevenueAtRisk;
    }

    return compareExceptionIds(left.id, right.id);
  });
}

/* ---------------------------------------------------------------------------------------------
 * The canvas ribbon — SCR-12, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * One tile of the FileMap canvas ribbon: an aggregate key, the value computed for it, and the
 * provenance of that value.
 *
 * Declared here rather than in `src/types` because it is not a contracts type but the shape of this
 * module's own output, which no other module reads as a shared vocabulary; the precedent is
 * `ScopedSubject` in `src/domain/policy/permissions.ts`. `id` is a stable aggregate key rather than a
 * figure, so a consumer can recognise a tile across renders and reorder the ribbon without depending
 * on its position.
 *
 * The tile carries no caption, no evidence reference and no simulation label (rule P-1): those belong
 * to the component that renders it, which is also the only place that knows how the value is
 * formatted (AAP 0.10).
 */
export interface RibbonTile {
  /** The aggregate key the tile reports, such as `open-exceptions`. Never a value. */
  readonly id: string;

  /** The value the aggregate computed, copied from it unchanged. */
  readonly value: number;

  /** Where the value came from; every tile this module builds is `'computed'` (rule P-5). */
  readonly provenance: Provenance;
}

/**
 * Counts the rows whose severity is the most urgent level.
 *
 * A count of the rows handed in and nothing else: it selects on the one level `HEAD_OF_URGENCY`
 * names, so it states no threshold of its own.
 *
 * @param rows The rows to count, read and not modified.
 * @returns How many of them sit at the head of the severity ordering.
 */
function countAtHeadOfUrgency(rows: readonly ExceptionRow[]): number {
  let count = 0;
  for (const row of rows) {
    if (row.severity === HEAD_OF_URGENCY) {
      count += 1;
    }
  }
  return count;
}

/**
 * Builds the FileMap canvas ribbon: six computed tiles, in the order the module header states.
 *
 * Implements SCR-12's "ribbon of six computed tiles" (AAP 0.12.4) and AAP 0.12.1's "six ribbon tiles"
 * for the canvas. It adds no figure: each value is an `Overview` member copied across, the length of
 * one of its collections, or a count of the rows handed in, so every tile is a computed aggregate's
 * own output and a screen can neither supply nor alter one (rule P-6).
 *
 * Each tile's provenance is `'computed'`. Nothing in this module reads a market-intelligence value and
 * the ribbon carries no competitor member, so a competitor figure cannot reach a tile (rule P-5). The
 * caller reads that provenance to decide what the tile opens and which label it renders; the label
 * itself is the rendering component's (rule P-1).
 *
 * The six tiles, and the aggregate each reports, are named in the first OPEN ITEM of the module
 * header, together with a consumer's freedom to reorder them.
 *
 * @param overview The overview aggregate the caller already computed, read and not modified.
 * @param rows The rows the caller assembled for the same scope, read and not modified. Only the
 *   count of the most urgent level among them is read.
 * @returns Six fresh tile objects, in the stated order.
 */
export function computeRibbonTiles(
  overview: Overview,
  rows: readonly ExceptionRow[],
): RibbonTile[] {
  return [
    {
      id: 'open-exceptions',
      value: overview.openExceptions,
      provenance: 'computed',
    },
    {
      id: 'critical-exceptions',
      value: countAtHeadOfUrgency(rows),
      provenance: 'computed',
    },
    {
      id: 'revenue-at-risk',
      value: overview.revenueAtRiskEur,
      provenance: 'computed',
    },
    {
      id: 'customer-orders-at-risk',
      value: overview.customerOrdersAtRisk,
      provenance: 'computed',
    },
    {
      id: 'median-hours-to-approved-plan',
      value: overview.medianHoursToApprovedPlan,
      provenance: 'computed',
    },
    {
      id: 'plants-in-scope',
      value: overview.byPlant.length,
      provenance: 'computed',
    },
  ];
}
