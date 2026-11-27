/**
 * Unit suite for `saved-views.ts`, the exception queue's in-memory filter sets.
 *
 * Each case asserts what the module's own doc comments promise, because those promises are what the
 * queue screen relies on: a name decides its identifier, so the same name always yields the same one
 * and nothing here needs a counter, a clock or a random source; a view and the query inside it are
 * copied and frozen, so a caller that changes its own query afterwards cannot rewrite a view that is
 * already saved; a view stores the filters, the page size and the ordering rather than a continuation
 * position, and applying one lays its defined members over the queue's current query, keeps the page
 * size and the ordering it says nothing about, and sends no continuation position from either side,
 * so the queue reopens at its first page; listing returns a new array in the order the planner's own
 * names imply; and no call reaches browser storage, because the theme and the density are the only
 * preferences this application keeps between visits (platform-contracts.md §1).
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

import type { ExceptionQuery } from '../../types';

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
 * applySavedView — the view's own members over the query the queue holds
 * ------------------------------------------------------------------------------------------- */

describe('applySavedView', () => {
  it('lays the view over the base query and keeps the members the view leaves out', () => {
    const base = queryOf({ severity: 'high' });
    const view = createSavedView('Critical at one plant', {
      severity: 'critical',
      plantId: PLANT_FILTER,
    });

    const applied = applySavedView(view, base);

    // The members the view defines replace the base's own.
    expect(applied.severity).toBe('critical');
    expect(applied.plantId).toBe(PLANT_FILTER);
    // The page size and the ordering the view says nothing about survive the switch.
    expect(applied.limit).toBe(PAGE_SIZE);
    // The continuation position does not: it names a place in the population the previous query
    // selected, so the applied query asks the service for the first page instead.
    expect('cursor' in applied).toBe(false);
    expect(applied.sort).toBe(SEVERITY_ORDER);
    // A member neither side names stays absent rather than arriving as `undefined`.
    expect('ownerId' in applied).toBe(false);
    expect('supplierId' in applied).toBe(false);
    // The base is the queue's own query, and switching views does not consume it.
    expect(base.severity).toBe('high');
    expect(base.plantId).toBeUndefined();
  });

  it('carries no continuation position from the view or from the base query', () => {
    // Both sides carry a position: the view was saved while the queue was part way through one list,
    // and the query it is applied over is part way through another.
    const view = createSavedView('Critical rows', queryOf({ severity: 'critical' }));
    const base = queryOf({ severity: 'high' });

    expect('cursor' in base).toBe(true);
    expect('cursor' in view.query).toBe(false);

    const applied = applySavedView(view, base);

    // A position names a place in the records the query that produced it selected, so it cannot travel
    // to a different filter set: the applied query asks for the first page of the new one.
    expect('cursor' in applied).toBe(false);
    expect(applied).toEqual({
      limit: PAGE_SIZE,
      sort: SEVERITY_ORDER,
      severity: 'critical',
    });
  });

  it('returns a new query and changes neither of its inputs', () => {
    const view = createSavedView('Saved filters', {
      severity: 'critical',
      plantId: PLANT_FILTER,
      ownerId: OWNER_FILTER,
    });
    // Both sides are frozen: the view's query by the module and the base here, so a call that tried
    // to write either one would fail rather than pass unnoticed.
    const base = Object.freeze(queryOf({ severity: 'high' }));
    const baseBefore = copyOfQuery(base);
    const viewQueryBefore = copyOfQuery(view.query);

    const applied = applySavedView(view, base);

    expect(applied).not.toBe(base);
    expect(applied).not.toBe(view.query);
    expect(base).toEqual(baseBefore);
    expect(view.query).toEqual(viewQueryBefore);
    expect(applied.ownerId).toBe(OWNER_FILTER);
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

    const firstApplied = applySavedView(firstView, queryOf({ severity: 'high' }));
    const secondApplied = applySavedView(secondView, queryOf({ severity: 'high' }));

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
    applySavedView(view, queryOf({ severity: 'high' }));
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
    applySavedView(view, queryOf({ plantId: PLANT_FILTER }));
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
