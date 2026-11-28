/**
 * The saved views of the exception queue: the filter sets a planner keeps for the session.
 *
 * A saved view pairs a name the planner typed with the query that name stands for, so the queue can
 * reapply a whole filter set in one action: the filters, the day the queue was narrowed to, the page
 * size and the ordering, and never the continuation position, which names a place in the records the
 * query that produced it selected and so has no meaning over a different filter set
 * (platform-contracts.md §9).
 *
 * THE WHOLE SET IS WHAT A VIEW STANDS FOR. Applying one answers exactly the members it saved, so a
 * filter the queue holds and the view does not carry is cleared rather than left in force, and the
 * queue shows the records the view shows — the filter set the planner saved, not that set laid over
 * whatever they chose afterwards, since a view saved on severity alone laid over a later status filter
 * matches no record at all. A view lives in memory and only for the session: the theme and the density
 * are the only preferences this application keeps between visits (platform-contracts.md §1), so no view
 * reaches browser storage, a cookie or a request.
 *
 * A pure module (AAP 0.12.4 "saved views in memory"; AAP 0.13.1 and 0.15.1 name this file). It holds
 * no React, no I/O, no clock and no module-level mutable state, and every function returns a fresh
 * value built from its arguments: one name always yields one identifier, and reading a view never
 * changes it.
 *
 * Rules served:
 * - P-2: the shared type barrel is the only import, so this module cannot become a second data
 *   boundary. A query is a request the service answers, and no record is read here.
 * - P-6: names, the identifiers derived from them and the member values a query already carries. No
 *   figure is computed, held or formatted here, and the module renders nothing.
 * - B-2: nothing here reads configuration and nothing resembles a credential.
 * - B-3: the module adds no control, so it adds nothing that could be unreachable by keyboard.
 * - P-4, P-5, P-7: no claim about the deployment, no competitor name and no wording invented, since
 *   every word here is either a name the planner typed or an identifier derived from it.
 */

import type { ExceptionQuery } from '../../types';

/**
 * A run of characters an identifier cannot carry: every run of them is joined by one separator.
 *
 * Compiled once at module scope and only ever read. Both replacements below pass it to
 * `String.prototype.replace`, which resets the pattern's position before and after every call, so the
 * shared pattern carries no state between two views.
 */
const NON_IDENTIFIER_RUN = /[^a-z0-9]+/g;

/** A separator left at either end of a derived identifier, and the hyphen that fills its place. */
const EDGE_SEPARATOR = /^-+|-+$/g;

/**
 * The message a view without a usable name raises.
 *
 * It is one plain sentence, and the only failure text this module produces: a saved view that cannot
 * be named is a fault in the calling screen rather than a condition a planner can act on, so nothing
 * more is said about it.
 */
const MISSING_NAME_MESSAGE = 'A saved view needs a name.';

/**
 * The query a saved view keeps: every member of the exception query except the continuation position.
 *
 * `ListQuery.cursor` is the opaque position a previous page's response reported, so it names a place in
 * the records the query that produced it selected, and a different filter set selects a different set of
 * records. Laid over one, it either names no record of the requested order — which the port's list reads
 * that validate a cursor refuse as a `'validation'` failure rather than restarting the page
 * (platform-contracts.md §9, and the list reads of `SiteIntelligenceService`) — or it still names one and
 * starts the new list part-way through it. A view therefore stores the filters — the day the queue was
 * narrowed to among them, since a narrowed queue is part of the set the planner saved — the page size
 * and the ordering only, and always reopens at the first page.
 */
type SavedQuery = Omit<ExceptionQuery, 'cursor'>;

/**
 * One saved view of the exception queue: the name a planner recognises and the query it reapplies.
 */
export interface SavedView {
  /**
   * The identifier derived from the name: lower case, with every run of characters an identifier
   * cannot carry replaced by one separator and no separator left at either end. Derived rather than
   * generated, so the same name always yields the same identifier and nothing here needs a counter, a
   * clock or a random source.
   */
  readonly id: string;

  /** The name as the planner typed it, trimmed, and never empty. */
  readonly name: string;

  /**
   * The filter set the view stands for: the filters — the day the queue was narrowed to among them —
   * the page size and the ordering, and no continuation position. Copied when the view is created, so a
   * later change to the query the caller passed cannot rewrite a view that is already saved.
   */
  readonly query: SavedQuery;
}

/**
 * Derives a saved view's identifier from its trimmed name.
 *
 * Lower case, then every run of characters outside the lower-case letters and the digits is joined
 * by one separator, then the separators at either end are removed: `Severity: High` becomes
 * `severity-high` and `  My view  ` becomes `my-view`.
 *
 * A name carrying no letter and no digit (`---`) leaves no identifier at all, so `createSavedView`
 * raises the same failure a blank name does rather than saving a view keyed by an empty string.
 *
 * @param trimmedName - The view's name, already trimmed and known not to be empty.
 * @returns The identifier the name derives.
 */
function identifierOf(trimmedName: string): string {
  return trimmedName.toLowerCase().replace(NON_IDENTIFIER_RUN, '-').replace(EDGE_SEPARATOR, '');
}

/**
 * Copies the members a saved view may keep, leaving the continuation position behind.
 *
 * Written member by member rather than by spreading the query and removing one key, so a member the
 * caller left undefined stays absent from the copy instead of arriving as `undefined`, which
 * `exactOptionalPropertyTypes` and this module both treat as a different query. `cursor` is the one
 * member deliberately not copied: it is a position in the records the caller's query selected, not part
 * of the filter set a view stands for.
 *
 * @param query - The query to project.
 * @returns A new object holding the filters — the day among them — the page size and the ordering, and
 *   nothing else.
 */
function filtersOf(query: ExceptionQuery): SavedQuery {
  return {
    ...(query.limit !== undefined ? { limit: query.limit } : {}),
    ...(query.sort !== undefined ? { sort: query.sort } : {}),
    ...(query.type !== undefined ? { type: query.type } : {}),
    ...(query.plantId !== undefined ? { plantId: query.plantId } : {}),
    ...(query.severity !== undefined ? { severity: query.severity } : {}),
    ...(query.status !== undefined ? { status: query.status } : {}),
    ...(query.ownerId !== undefined ? { ownerId: query.ownerId } : {}),
    ...(query.supplierId !== undefined ? { supplierId: query.supplierId } : {}),
    ...(query.date !== undefined ? { date: query.date } : {}),
  };
}

/**
 * Creates a saved view from a name and the query it stands for.
 *
 * The name is trimmed and kept as typed, the identifier is derived from it, and the query is copied
 * into the view as the filter set it stands for: its filters — the day the queue was narrowed to among
 * them — its page size and its ordering, and not the continuation position, so applying the view always
 * reopens the queue at its first page. The view never shares an object with its caller. The view and
 * the query inside it are both frozen: a saved view is a value, and a caller that wanted a different
 * filter set creates a different view.
 *
 * @param name - The name the planner typed. Whitespace at either end is not part of it.
 * @param query - The filter set to save. It is copied, never retained, and its continuation position is
 * not part of what is saved.
 * @returns The saved view, frozen.
 * @throws RangeError when the trimmed name is empty, or holds no letter and no digit to derive an
 * identifier from.
 */
export function createSavedView(name: string, query: ExceptionQuery): SavedView {
  const trimmedName = name.trim();
  const id = identifierOf(trimmedName);

  if (id === '') {
    throw new RangeError(MISSING_NAME_MESSAGE);
  }

  const savedQuery: SavedQuery = Object.freeze(filtersOf(query));
  const view: SavedView = { id, name: trimmedName, query: savedQuery };

  return Object.freeze(view);
}

/**
 * Restores the filter set a saved view stands for, whole.
 *
 * The result is exactly the set the view saved: the filters it carries — the day the queue was narrowed
 * to among them — its page size and its ordering. Nothing of the queue's current query is laid under
 * it, so a filter the view does not carry is absent from the result rather than left in force, and a
 * planner who saved "High severity" gets the high-severity rows even though they had since chosen a
 * status that, combined with it, matches nothing. That is the contract the queue's own Apply control
 * shows: the view is what the queue then reads.
 *
 * The continuation position is the one member that travels from neither side. `ListQuery.cursor` is the
 * opaque position a previous page's response reported, so it names a place in the records the query that
 * produced it selected; a view never stores one, so applying a view always reopens the queue at its
 * first page.
 *
 * The result is a new object: the view's own query is frozen and is never handed out, and a caller that
 * changes the answer cannot reach the view it came from. Members the view does not carry are absent from
 * the result rather than present as `undefined`. Nothing is intersected or re-filtered here, because
 * narrowing a query to the acting role's plant scope is the service's work (AAP 0.8, 0.12.4) and a queue
 * that re-filtered would disagree with the overview.
 *
 * @param view - The saved view to apply.
 * @returns A new query carrying the view's own filter set, and no continuation position.
 */
export function applySavedView(view: SavedView): ExceptionQuery {
  return { ...view.query };
}

/**
 * Lists the saved views in the order the queue offers them.
 *
 * Sorted by name, so the order a planner sees is the one their own names imply rather than the order
 * the views happened to be created in. The input array and the views inside it are left untouched, and
 * nothing is dropped, merged or de-duplicated: two views a planner named the same thing stay two
 * entries, and the list is a presentation order rather than a filter.
 *
 * @param views - The saved views to list.
 * @returns A new array, sorted by name; an empty array when there are no views.
 */
export function listSavedViews(views: readonly SavedView[]): readonly SavedView[] {
  return [...views].sort((left, right) => left.name.localeCompare(right.name));
}
