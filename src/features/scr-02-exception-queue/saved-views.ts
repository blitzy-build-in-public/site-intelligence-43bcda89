/**
 * The saved views of the exception queue: the filter sets a planner keeps for the session.
 *
 * A saved view pairs a name the planner typed with the exception query that name stands for, so the
 * queue can reapply a whole filter set in one action. It lives in memory and only for the session:
 * the theme and the density are the only preferences this application keeps between visits
 * (platform-contracts.md §1), so no view reaches browser storage, a cookie or a request.
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
   * The filter set the view stands for. Copied when the view is created, so a later change to the
   * query the caller passed cannot rewrite a view that is already saved.
   */
  readonly query: ExceptionQuery;
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
 * Creates a saved view from a name and the query it stands for.
 *
 * The name is trimmed and kept as typed, the identifier is derived from it, and the query is copied
 * into the view, so the view never shares an object with its caller. The view and the query inside it
 * are both frozen: a saved view is a value, and a caller that wanted a different filter set creates a
 * different view.
 *
 * @param name - The name the planner typed. Whitespace at either end is not part of it.
 * @param query - The filter set to save. It is copied, never retained.
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

  const savedQuery: ExceptionQuery = Object.freeze({ ...query });
  const view: SavedView = { id, name: trimmedName, query: savedQuery };

  return Object.freeze(view);
}

/**
 * Applies a saved view over the queue's current query.
 *
 * Every member the saved view defines replaces the same member of `base`, and every member it leaves
 * undefined keeps `base`'s value. That is what lets a view save the filters a planner chose while the
 * page size, the continuation position and the ordering the queue is using survive the switch: a view
 * that names no `sort` leaves the queue sorted as it was.
 *
 * The result is a new object: neither `base` nor the view's own query is changed, and members the view
 * leaves undefined are absent from the result rather than present as `undefined`. Nothing is
 * intersected or re-filtered here, because narrowing a query to the acting role's plant scope is the
 * service's work (AAP 0.8, 0.12.4) and a queue that re-filtered would disagree with the overview.
 *
 * @param view - The saved view to apply.
 * @param base - The query the queue currently holds.
 * @returns A new query: the view's defined members over the base.
 */
export function applySavedView(view: SavedView, base: ExceptionQuery): ExceptionQuery {
  const saved = view.query;

  return {
    ...base,
    ...(saved.limit !== undefined ? { limit: saved.limit } : {}),
    ...(saved.cursor !== undefined ? { cursor: saved.cursor } : {}),
    ...(saved.sort !== undefined ? { sort: saved.sort } : {}),
    ...(saved.type !== undefined ? { type: saved.type } : {}),
    ...(saved.plantId !== undefined ? { plantId: saved.plantId } : {}),
    ...(saved.severity !== undefined ? { severity: saved.severity } : {}),
    ...(saved.status !== undefined ? { status: saved.status } : {}),
    ...(saved.ownerId !== undefined ? { ownerId: saved.ownerId } : {}),
    ...(saved.supplierId !== undefined ? { supplierId: saved.supplierId } : {}),
  };
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
