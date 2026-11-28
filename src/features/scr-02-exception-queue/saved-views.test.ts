/**
 * Unit suite for `saved-views.ts`, the exception queue's in-memory filter sets.
 *
 * Each case asserts what the module's own doc comments promise, because those promises are what the
 * queue screen relies on: a name decides its identifier, so the same name always yields the same one
 * and nothing here needs a counter, a clock or a random source; a view and the query inside it are
 * copied and frozen, so a caller that changes its own query afterwards cannot rewrite a view that is
 * already saved; a view stores the filters — the day the queue was narrowed to among them — the page
 * size and the ordering rather than a continuation position, and applying one restores exactly that
 * set with nothing of the queue's current query laid under it, so a filter the view does not carry is
 * cleared rather than left to narrow the saved rows to nothing; listing returns a new array in
 * the order the planner's own names imply; and no call reaches browser storage, because the theme
 * and the density are the only preferences this application keeps between visits
 * (platform-contracts.md §1).
 *
 * The filter values below are placeholders that name no record: this module copies a query and
 * resolves none, so no plant, supplier, owner or exception is named here (rule P-6), and the service
 * and aggregation modules that finally read a query are tested where they live (rule P-2).
 *
 * jsdom environment, as `vite.config.ts` sets it, rather than the `node` one the arithmetic suites
 * declare: the storage case spies on `Storage.prototype`, so that interface has to be present.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { applySavedView, createSavedView, listSavedViews } from './saved-views';
// The namespace form backs the public-surface case: a helper exported in future would appear here.
import * as savedViews from './saved-views';

import type { ExceptionQuery, IsoDate } from '../../types';

/* ---------------------------------------------------------------------------------------------
 * Fixtures — one factory, so no case restates the queue's paging or ordering
 * ------------------------------------------------------------------------------------------- */

/**
 * A page size the queue might ask for.
 *
 * The module copies it and computes nothing from it, so the value stands for itself rather than for
 * a figure some other module derives (rule P-6).
 */
const PAGE_SIZE = 25;

/** A continuation position, in the opaque form a previous page's response reported it. */
const CURSOR_KEY = 'page-two';

/** The ordering the queue sends, written `field:dir` as contracts §9 fixes that parameter. */
const SEVERITY_ORDER = 'severity:desc';

/** Filter values that match no record: the module carries them into a view and resolves none. */
const PLANT_FILTER = 'plant-a';
const SUPPLIER_FILTER = 'supplier-a';
const OWNER_FILTER = 'owner-a';

/**
 * The day the queue was narrowed to when the view was saved.
 *
 * `ExceptionQuery.date` is how SCR-01's series hands the queue a day, so a view taken while that
 * narrowing stands carries it. A placeholder in the contracts §1 `YYYY-MM-DD` shape: the module copies
 * the value and resolves no record from it (rule P-6).
 */
const DAY_FILTER: IsoDate = '2000-01-01';

/** Builds the query the queue holds, with each member the caller names replacing the default. */
function queryOf(overrides: ExceptionQuery = {}): ExceptionQuery {
  return {
    limit: PAGE_SIZE,
    cursor: CURSOR_KEY,
    sort: SEVERITY_ORDER,
    ...overrides,
  };
}

/**
 * A copy of a query, taken member by member.
 *
 * Every member `ExceptionQuery` declares is a primitive, so one level of copying is a deep copy. The
 * copy is what a case compares against after a call: asserting on the input itself would pass even
 * if the call had rewritten it.
 */
function copyOfQuery(query: ExceptionQuery): ExceptionQuery {
  return { ...query };
}

/**
 * Attempts to write one member of a value, reporting whether the write happened.
 *
 * `Reflect.set` reports a refused write as `false` rather than throwing the way a strict-mode
 * assignment would, so a case can assert that a frozen view did not change instead of asserting that
 * an exception was raised.
 */
function writeMember(target: object, member: string, value: unknown): boolean {
  return Reflect.set(target, member, value);
}

/* ---------------------------------------------------------------------------------------------
 * createSavedView — the identifier comes from the name, and the view owns what it holds
 * ------------------------------------------------------------------------------------------- */

describe('createSavedView', () => {
  it('derives the identifier from the name, dropping its case and its punctuation', () => {
    const view = createSavedView('  My critical view  ', queryOf({ severity: 'critical' }));

    // The name is kept as the planner typed it, without the whitespace around it.
    expect(view.name).toBe('My critical view');
    // Lower case, one separator per run of characters an identifier cannot carry, none at either end.
    expect(view.id).toBe('my-critical-view');

    const sameNameAgain = createSavedView('My critical view', queryOf({ severity: 'critical' }));
    expect(sameNameAgain.id).toBe(view.id);

    // Case and punctuation collapse, so the identifier is the same one for the same words.
    expect(createSavedView('MY CRITICAL VIEW', queryOf()).id).toBe(view.id);
    expect(createSavedView('My  critical: view!', queryOf()).id).toBe(view.id);
  });

  it('rejects a name that leaves no identifier to derive', () => {
    const query = queryOf();

    expect(() => createSavedView('', query)).toThrow(RangeError);
    expect(() => createSavedView('   ', query)).toThrow(RangeError);
    // A name of punctuation alone carries no letter and no digit, so it fails the same way rather
    // than saving a view keyed by an empty identifier.
    expect(() => createSavedView('---', query)).toThrow(RangeError);
    expect(() => createSavedView('  ...  ', query)).toThrow(RangeError);
  });

  it('copies the query it is given, so a later change cannot rewrite a saved view', () => {
    const source = queryOf({ severity: 'high', supplierId: SUPPLIER_FILTER });
    const view = createSavedView('High severity', source);

    expect(view.query).not.toBe(source);

    // The caller keeps its own query and changes it, which is what the copy defends against.
    source.severity = 'low';
    source.limit = PAGE_SIZE * 2;
    delete source.supplierId;

    expect(view.query.severity).toBe('high');
    expect(view.query.limit).toBe(PAGE_SIZE);
    expect(view.query.supplierId).toBe(SUPPLIER_FILTER);
    expect(source.severity).toBe('low');
  });

  it('freezes the view and the query inside it', () => {
    const view = createSavedView('Frozen view', queryOf({ severity: 'critical' }));

    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.query)).toBe(true);

    // A saved view is a value: a write to it is refused, and nothing observable changes.
    expect(writeMember(view, 'name', 'Renamed view')).toBe(false);
    expect(writeMember(view, 'id', 'renamed-view')).toBe(false);
    expect(writeMember(view.query, 'severity', 'low')).toBe(false);

    expect(view.name).toBe('Frozen view');
    expect(view.id).toBe('frozen-view');
    expect(view.query.severity).toBe('critical');
  });
});

/* ---------------------------------------------------------------------------------------------
 * applySavedView — the whole saved filter set, and nothing of the queue's own query
 * ------------------------------------------------------------------------------------------- */

describe('applySavedView', () => {
  it('restores every member the view saved, and clears the filters the queue held beside them', () => {
    const view = createSavedView(
      'Critical at one plant',
      queryOf({ severity: 'critical', plantId: PLANT_FILTER, date: DAY_FILTER }),
    );

    const applied = applySavedView(view);

    /*
     * The whole set comes back: the filters, the day the queue was narrowed to, the page size and the
     * ordering. A queue that had since chosen a status and an owner shows the saved rows again, because
     * neither of those was part of what the planner saved.
     */
    expect(applied).toEqual({
      limit: PAGE_SIZE,
      sort: SEVERITY_ORDER,
      severity: 'critical',
      plantId: PLANT_FILTER,
      date: DAY_FILTER,
    });

    /* A filter the queue may hold and the view does not carry is absent, not inherited, so nothing of
       the queue's current query can narrow the saved set to a different population. */
    expect('status' in applied).toBe(false);
    expect('ownerId' in applied).toBe(false);
    expect('supplierId' in applied).toBe(false);
    expect('type' in applied).toBe(false);
  });

  it('clears the day the queue was narrowed to when the view was saved without one', () => {
    const view = createSavedView('Every day', { severity: 'high' });

    const applied = applySavedView(view);

    /* The day is part of the saved set like any filter: a view saved over the whole calendar leaves no day
       in force, so the day the queue happened to hold cannot narrow the saved rows away. */
    expect('date' in applied).toBe(false);
    expect(applied).toEqual({ severity: 'high' });
  });

  it('carries no continuation position, which a view never stores', () => {
    /* The query the view was saved from was part way through a list; the view keeps the filter set and
       leaves the position behind. */
    const saved = queryOf({ severity: 'critical' });

    expect('cursor' in saved).toBe(true);

    const view = createSavedView('Critical rows', saved);

    expect('cursor' in view.query).toBe(false);

    const applied = applySavedView(view);

    /* A position names a place in the records the query that produced it selected, so a filter set can
       never reopen at one: the applied query asks for the first page. */
    expect('cursor' in applied).toBe(false);
    expect(applied).toEqual({
      limit: PAGE_SIZE,
      sort: SEVERITY_ORDER,
      severity: 'critical',
    });
  });

  it('returns a new query that changes neither the view nor the query it was saved from', () => {
    const source = queryOf({ severity: 'high', supplierId: SUPPLIER_FILTER });
    const view = createSavedView('Saved filters', {
      ...source,
      severity: 'critical',
      plantId: PLANT_FILTER,
      ownerId: OWNER_FILTER,
    });
    /* The query the view was saved from is the caller's own and stays as it was, as does the frozen
       copy inside the view. */
    const sourceBefore = copyOfQuery(source);
    const viewQueryBefore = copyOfQuery(view.query);

    const applied = applySavedView(view);

    expect(applied).not.toBe(view.query);
    expect(source).toEqual(sourceBefore);
    expect(view.query).toEqual(viewQueryBefore);

    /* The answer is the caller's to change: writing to it cannot reach the frozen view it came from,
       which is what makes applying a view a read of a value rather than a handle on it. */
    applied.severity = 'low';
    applied.limit = PAGE_SIZE * 2;

    expect(view.query.severity).toBe('critical');
    expect(view.query.limit).toBe(PAGE_SIZE);
    expect(Object.isFrozen(view.query)).toBe(true);
  });
});

/* ---------------------------------------------------------------------------------------------
 * listSavedViews — a presentation order over the views the screen holds
 * ------------------------------------------------------------------------------------------- */

describe('listSavedViews', () => {
  it('returns a new array in name order and leaves the input where it was', () => {
    const created = [
      createSavedView('Zulu ward', queryOf()),
      createSavedView('Mike cell', queryOf()),
      createSavedView('alpha line', queryOf()),
    ];
    const createdNames = created.map((view) => view.name);

    const listed = listSavedViews(created);

    expect(listed).not.toBe(created);
    // Collation by name, not by code point: a capital first letter does not carry a view to the top.
    expect(listed.map((view) => view.name)).toEqual(['alpha line', 'Mike cell', 'Zulu ward']);
    // Every view is offered, and the input array keeps the order it was built in.
    expect(listed).toHaveLength(created.length);
    expect(created.map((view) => view.name)).toEqual(createdNames);
    // No view to offer is an empty list rather than a fault.
    expect(listSavedViews([])).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * Determinism — the same input yields the same output, whatever ran before
 * ------------------------------------------------------------------------------------------- */

describe('determinism', () => {
  it('gives each function the same result for deep-equal inputs', () => {
    const firstView = createSavedView('Repeatable view', queryOf({ status: 'open' }));
    const secondView = createSavedView('Repeatable view', queryOf({ status: 'open' }));

    expect(secondView).toEqual(firstView);
    expect(secondView.id).toBe(firstView.id);

    /*
     * Applying a view is a function of the view alone, so two views saved from deep-equal queries answer
     * deep-equal queries whatever the queue happened to hold when each was applied.
     */
    const firstApplied = applySavedView(firstView);
    const secondApplied = applySavedView(secondView);

    expect(secondApplied).toEqual(firstApplied);

    const firstList = listSavedViews([
      createSavedView('beta row', queryOf()),
      createSavedView('Alpha row', queryOf()),
    ]);
    const secondList = listSavedViews([
      createSavedView('beta row', queryOf()),
      createSavedView('Alpha row', queryOf()),
    ]);

    expect(secondList).toEqual(firstList);
  });
});

/* ---------------------------------------------------------------------------------------------
 * No side channels — nothing is stored and nothing reads the clock or a random source
 * ------------------------------------------------------------------------------------------- */

describe('saved views touch no side channel', () => {
  // The spies below are put back explicitly rather than left to the runner's `restoreMocks` setting, so
  // the property this block rests on holds whatever the configuration says: a later case sees the
  // platform's own storage, clock and random source.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('touches no browser storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');

    // The spies sit on the interface a storage call would reach, so a pass below means the module
    // left storage alone rather than that the watch was never wired.
    expect(vi.isMockFunction(Storage.prototype.setItem)).toBe(true);
    expect(vi.isMockFunction(Storage.prototype.getItem)).toBe(true);
    expect(vi.isMockFunction(Storage.prototype.removeItem)).toBe(true);

    const view = createSavedView('Session-only view', queryOf({ severity: 'critical' }));
    applySavedView(view);
    listSavedViews([view, createSavedView('Another view', queryOf({ status: 'open' }))]);

    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('reads no clock and no random source', () => {
    const clock = vi.spyOn(Date, 'now');
    const random = vi.spyOn(Math, 'random');

    expect(vi.isMockFunction(Date.now)).toBe(true);
    expect(vi.isMockFunction(Math.random)).toBe(true);

    const view = createSavedView('Timeless view', queryOf({ status: 'open' }));
    applySavedView(view);
    listSavedViews([view]);

    // An identifier derived from a name needs no counter and no instant, so neither source is read.
    expect(clock).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------------------------------------------
 * Public surface — the three functions and nothing else
 * ------------------------------------------------------------------------------------------- */

describe('the public surface of saved views', () => {
  it('exports the three functions and nothing else', () => {
    expect(Object.keys(savedViews).sort()).toEqual([
      'applySavedView',
      'createSavedView',
      'listSavedViews',
    ]);

    expect(typeof savedViews.createSavedView).toBe('function');
    expect(typeof savedViews.applySavedView).toBe('function');
    expect(typeof savedViews.listSavedViews).toBe('function');
  });
});
