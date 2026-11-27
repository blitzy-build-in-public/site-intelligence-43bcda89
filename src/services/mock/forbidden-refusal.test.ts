// @vitest-environment node

/**
 * What a refusal says: the demonstration's own sentence for the forbidden trigger, a permission the
 * acting role really lacks for a matrix denial, and a plant-scope condition for a record the read does
 * not cover.
 *
 * Three facts are asserted, one per way a call of the exception family can be refused, because the
 * failure the adapter throws is what a forbidden card renders: the card's wording is composed from
 * `requiredPermission` and `rolesWithPermission`, so a failure whose message claims a permission the
 * acting role holds is one it lacks describes a refusal that never happened. A refusal therefore has
 * to state the cause true of it — the demonstration withheld the view, the matrix found a permission
 * missing, or the record lies outside the acting role's plant scope — and the cases below assert each
 * of the three through the port a screen calls (rules P-3, P-4, rule P-8's "say why").
 *
 * WHY THE NODE ENVIRONMENT, MANDATORY ON THE FIRST LINE ABOVE. The adapter's bootstrap hashes the
 * seeded chain through `crypto.subtle.digest`, which the jsdom environment cannot digest, so the cases
 * run where the platform call works. Nothing here renders.
 *
 * WHAT THIS SUITE DOES NOT DO. It types no record identifier and no figure: the exception a case asks
 * about is found through the port, and the permission a case names is the one the refusal itself
 * carries (rule P-6). It retypes no simulation label (rule P-1), and it uses no test hook: every call
 * is a member of the port, the demonstration control `setSimulation()` the popover drives, or the
 * role switcher's own `switchRole()`.
 */

import { describe, expect, it } from 'vitest';

import { rolesWith } from '../../domain/policy/permissions';
import type { Permission, Problem, Role, Scope, UserId } from '../../types';
import { MockBackend } from './mock-backend';
import { demonstrationForbiddenReason } from './simulation';

/* ---------------------------------------------------------------------------------------------
 * The inputs the cases act on
 * ------------------------------------------------------------------------------------------- */

/** No top-bar selection: the acting role's own scope is the only one in force. */
const NO_SCOPE: Scope = { plants: [], products: [] };

/**
 * One permission the exception family's reads require, used to assert the two branches of the
 * refusal sentence against the matrix that decides which branch applies.
 */
const READ_PERMISSION: Permission = 'exception.read';

/** A role the matrix grants that permission. */
const HOLDER: Role = 'material-planner';

/** A seeded persona whose role the matrix does not grant it, which is a genuine matrix denial. */
const EXTERNAL_ENGINEER: UserId = 'USR-08';

/** A persona that holds the permission across every plant, so it reads records one plant cannot. */
const HEAD_OF_SUPPLY_CHAIN: UserId = 'USR-03';

/**
 * The budget one case gets.
 *
 * The adapter's latency ladder is why it is stated at all: every call takes 150 to 400 ms by design
 * and the scope case resolves its subject over two reads plus two role switches, so the runner's
 * default budget would report a working adapter as a slow one.
 */
const CASE_TIMEOUT_MS = 30_000;

/* ---------------------------------------------------------------------------------------------
 * Helpers — one fresh session per case
 * ------------------------------------------------------------------------------------------- */

/**
 * A session whose bootstrap has resolved, which every case starts from.
 *
 * @returns The ready adapter.
 */
async function readyBackend(): Promise<MockBackend> {
  const backend = new MockBackend();

  await backend.whenReady();

  return backend;
}

/**
 * The refusal a call throws.
 *
 * @param run - The call expected to be refused.
 * @returns The `Problem` it threw.
 * @throws Error - The call resolved, or threw something that is not a `Problem`.
 */
async function refusalOf(run: () => Promise<unknown>): Promise<Problem> {
  try {
    await run();
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'type' in error && 'message' in error) {
      return error as Problem;
    }

    throw error;
  }

  throw new Error('The call was expected to be refused and resolved instead.');
}

/* ---------------------------------------------------------------------------------------------
 * The sentence the demonstration's trigger produces — rules P-3, P-4
 * ------------------------------------------------------------------------------------------- */

describe("the demonstration's forbidden refusal", () => {
  it('says the demonstration withheld a view the acting role may read', () => {
    // The matrix is the authority for which branch applies, so the case asserts the branch it means
    // to exercise before it asserts the sentence.
    expect(rolesWith(READ_PERMISSION)).toContain(HOLDER);

    const reason = demonstrationForbiddenReason(HOLDER, READ_PERMISSION);

    expect(reason).toContain(HOLDER);
    expect(reason).toContain(READ_PERMISSION);
    // The refusal is the demonstration's, and it may not claim the role lacks a permission it holds.
    expect(reason).toMatch(/demonstration/i);
    expect(reason).not.toMatch(/does not hold/);
  });

  it('names the permission and its holders when the acting role really does not hold it', () => {
    const role: Role = 'external-supplier-engineer';

    // The matrix is the authority for which branch applies here too: this role holds `evidence.read`
    // alone, so the sentence has to name what it is missing and who holds it.
    expect(rolesWith(READ_PERMISSION)).not.toContain(role);

    const reason = demonstrationForbiddenReason(role, READ_PERMISSION);

    expect(reason).toContain(role);
    expect(reason).toContain(READ_PERMISSION);
    expect(reason).toMatch(/does not hold/);
    for (const holder of rolesWith(READ_PERMISSION)) {
      expect(reason).toContain(holder);
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The refusal a read of the exception family produces
 * ------------------------------------------------------------------------------------------- */

describe('the refusal the exception reads produce', () => {
  it('refuses the queue through the demonstration, not through a permission the role lacks', async () => {
    const backend = await readyBackend();
    const acting = (await backend.getActiveUser()).data;

    await backend.setSimulation('forbidden', true);

    const problem = await refusalOf(() => backend.listExceptions({}, NO_SCOPE));

    expect(problem.type).toBe('permission');

    const permission = problem.requiredPermission;

    if (permission === undefined) {
      throw new Error('A permission refusal carries the permission the call required.');
    }

    // The acting role holds it and is one of the roles the failure lists, which is exactly why the
    // sentence may not say the role lacks it.
    expect(acting.permissions).toContain(permission);
    expect(problem.rolesWithPermission).toContain(acting.role);
    expect(problem.message).toBe(demonstrationForbiddenReason(acting.role, permission));
  }, CASE_TIMEOUT_MS);

  it('states the same refusal for the read the top bar shares, naming no screen', async () => {
    const backend = await readyBackend();
    const acting = (await backend.getActiveUser()).data;

    await backend.setSimulation('forbidden', true);

    // The canvas read is also the shell's source of the plant and product lists, whose notice prints
    // this sentence in the top bar of every route, so it may name neither of the two surfaces.
    const problem = await refusalOf(() => backend.getTopology(NO_SCOPE));

    expect(problem.type).toBe('permission');

    const permission = problem.requiredPermission;

    if (permission === undefined) {
      throw new Error('A permission refusal carries the permission the call required.');
    }

    expect(problem.message).toBe(demonstrationForbiddenReason(acting.role, permission));
    expect(problem.message).not.toContain('FileMap');
  }, CASE_TIMEOUT_MS);

  it('names the permission and the roles that hold it when the role really lacks it, naming no screen', async () => {
    const backend = await readyBackend();
    const switched = await backend.switchRole(EXTERNAL_ENGINEER);
    const acting = switched.data;

    const problem = await refusalOf(() => backend.getTopology(NO_SCOPE));

    expect(problem.type).toBe('permission');

    const permission = problem.requiredPermission;

    if (permission === undefined) {
      throw new Error('A permission refusal carries the permission the call required.');
    }

    expect(acting.permissions).not.toContain(permission);
    expect(problem.rolesWithPermission).toEqual(rolesWith(permission));
    expect(problem.message).toContain(permission);
    expect(problem.message).toContain(acting.role);
    expect(problem.message).not.toContain('FileMap');
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * The refusal a record outside the acting role's plant scope produces — contracts §2
 * ------------------------------------------------------------------------------------------- */

describe("a record outside the acting role's plant scope", () => {
  it('is reported as a scope condition rather than as a permission the role lacks', async () => {
    const backend = await readyBackend();
    const planner = (await backend.getActiveUser()).data;

    // The subject is found through the port as a persona that reads every plant, then asked for as
    // the single-plant persona the session opened as.
    const widened = await backend.switchRole(HEAD_OF_SUPPLY_CHAIN);

    expect(widened.data.plantIds.length).toBeGreaterThan(planner.plantIds.length);

    const rows = (await backend.listExceptions({}, NO_SCOPE)).data;
    const outside = rows.find((row) => !planner.plantIds.includes(row.plantId));

    if (outside === undefined) {
      throw new Error('The records hold an exception outside the opening persona’s plants.');
    }

    await backend.switchRole(planner.id);

    const problem = await refusalOf(() => backend.getScenarioSet(outside.id));

    // The role holds `exception.read`, so a permission failure here would name a permission it has:
    // the answer is that the record is outside this read, in the exception family's own words.
    expect(planner.permissions).toContain(READ_PERMISSION);
    expect(problem.type).toBe('not-found');
    expect(problem.requiredPermission).toBeUndefined();
    expect(problem.message).toContain(outside.id);
    expect(problem.message).toContain("outside the acting role's plant scope");
    expect(problem.message).toContain('not part of this read');
  }, CASE_TIMEOUT_MS);
});
