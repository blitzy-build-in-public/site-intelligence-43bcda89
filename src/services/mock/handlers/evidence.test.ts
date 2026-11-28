// @vitest-environment node

/**
 * Handler suite for `handlers/evidence.ts`: the permission each record class asks, and the decision an
 * element review states.
 *
 * WHAT IT PROVES. Two refusals of one handler family. The evidence read answers records of the whole
 * workspace, and three of those record classes are published by a read of a *different* handler — an
 * event of the audit trail by `./audit.ts`, a policy of the policy set and a row of the outbound ledger
 * by `./governance.ts` — each of which requires a permission of its own (contracts §7.1). The reference
 * that reaches one of them therefore has to answer to that permission, or a role the matrix leaves out
 * of the trail or the policy set would read those records through the drawer instead; the cases below
 * hold each of the three families to exactly that, once with a persona the matrix withholds the
 * permission from and once with the persona it grants all three to. The element review records a
 * decision the contracts §8 act names, and `ElementReviewDecision` is erased at run time, so the cases
 * also hold the review to the two members it answers: a value outside them is refused before any record
 * is written, leaving the element, the package's readiness and the chain as they stood, while a valid
 * member still settles the element.
 *
 * WHY IT CALLS THE HANDLER RATHER THAN THE PORT. The adapter's suite drives every read through
 * `MockBackend`, which owns its state privately and hashes the seeded trail at bootstrap; reaching a
 * package review through it would take a role switch and the adapter's 150-400 ms of latency per call,
 * and reaching an audit event or a policy would need the persona that holds its permission. Both
 * properties are properties of the handler, so the cases here hand it a state directly, built by
 * `createMockState()` — the same async bootstrap the adapter awaits — and a context of the shape the
 * adapter builds: the persona is the record set's own user record for a role, and its `permissions` are
 * the contracts §7.1 matrix's answer, never a list written here (rule P-3 — the check is a
 * demonstration control, not production authorisation).
 *
 * WHAT IT DOES NOT DO. It types no figure and no record identifier of its own (rule P-6): every
 * reference it sends, every identifier it asserts against and every count it compares is read from the
 * record set or from a returned payload. It reaches no network, reads no environment value and carries
 * no credential (rules B-1 and B-2).
 */

import { describe, expect, it } from 'vitest';

import { hasPermission, plantScopeFor } from '../../../domain/policy/permissions';
import { PERMISSIONS, SIM_LABELS } from '../../../types';
import type {
  ActiveUser,
  ElementReview,
  ElementReviewDecision,
  Permission,
  Problem,
  Role,
} from '../../../types';
import { createMockState } from '../mock-state';
import type { HandlerContext, MockState } from '../mock-state';
import { getEvidence, reviewPackageElement } from './evidence';

/* ---------------------------------------------------------------------------------------------
 * The context a handler call receives
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier these direct calls quote; no adapter minted one for them. */
const TRACE_ID = 'trace-handler-suite';

/**
 * Every permission the contracts §7.1 matrix grants a role.
 *
 * Derived from the one matrix the adapter evaluates, so the persona built below cannot claim a
 * permission its role does not hold — the arrangement `mock-backend.test.ts` and `audit.test.ts` use to
 * resolve a session's acting persona from its user record.
 *
 * @param role - The role whose held permissions are wanted.
 * @returns Every permission the matrix grants it.
 */
function permissionsOf(role: Role): Permission[] {
  const probe: ActiveUser = {
    id: '',
    name: '',
    role,
    plantIds: plantScopeFor(role),
    permissions: [],
    homeRoute: '',
  };

  return PERMISSIONS.filter((permission) => hasPermission(role, permission, null, probe));
}

/**
 * The persona one seeded user record describes, as the adapter builds it for a call.
 *
 * @param record - The user record the session holds.
 * @returns The acting persona, with the plant scope and permissions its role carries.
 */
function personaOf(record: MockState['records']['users'][number]): ActiveUser {
  return {
    id: record.id,
    name: record.name,
    role: record.role,
    plantIds: plantScopeFor(record.role),
    permissions: permissionsOf(record.role),
    homeRoute: record.homeRoute,
  };
}

/**
 * Whether the matrix grants a persona a permission, asked the way every handler asks it.
 *
 * @param persona - The acting persona.
 * @param permission - The permission to ask about.
 * @returns `true` when the persona's role holds it.
 */
function mayDo(persona: ActiveUser, permission: Permission): boolean {
  return hasPermission(persona.role, permission, null, persona);
}

/**
 * The persona the record set carries in a role the matrix answers `held` for and `withheld` for.
 *
 * Both lists are answered by the matrix rather than by a role named here, so a case acts as the persona
 * the authority actually describes — the reasoning rule P-3 asks for, and the one that keeps a case
 * honest when the matrix moves.
 *
 * @param state - The session whose user records are read.
 * @param held - Every permission the persona's role must hold.
 * @param withheld - Every permission the persona's role must not hold.
 * @returns The acting persona.
 * @throws Error - The record set carries no persona of that description.
 */
function personaWhere(
  state: MockState,
  held: readonly Permission[],
  withheld: readonly Permission[],
): ActiveUser {
  const found = state.records.users
    .map(personaOf)
    .find(
      (persona) =>
        held.every((permission) => mayDo(persona, permission)) &&
        withheld.every((permission) => !mayDo(persona, permission)),
    );

  if (found === undefined) {
    throw new Error(
      `The seeded record set carries no persona the matrix grants ${held.join(', ')} to and withholds ${withheld.join(', ')} from.`,
    );
  }

  return found;
}

/**
 * The context one handler call receives over a given state, acting as a given persona.
 *
 * @param state - The session state the call reads and writes.
 * @param persona - The persona the call acts as.
 * @returns The context, carrying the persona and a trace identifier of this suite's own.
 */
function contextFor(state: MockState, persona: ActiveUser): HandlerContext {
  return { state, actor: persona, traceId: TRACE_ID };
}

/* ---------------------------------------------------------------------------------------------
 * The records and the refusals
 * ------------------------------------------------------------------------------------------- */

/**
 * The first record of a set, which is the one record a case needs.
 *
 * @param records - The records to read.
 * @param what - How the set is named in a failure, so a thin fixture reports what it is missing.
 * @returns The first record.
 * @throws Error - The set holds no record at all.
 */
function firstOf<T>(records: readonly T[], what: string): T {
  const [first] = records;

  if (first === undefined) {
    throw new Error(`The seeded record set holds no ${what}.`);
  }

  return first;
}

/**
 * Whether a thrown value is the `Problem` the service refuses with.
 *
 * @param value - The value a call threw.
 * @returns `true` when it carries the three members every `Problem` carries.
 */
function isProblem(value: unknown): value is Problem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return 'type' in value && 'message' in value && 'traceId' in value;
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
    if (isProblem(error)) {
      return error;
    }

    throw error;
  }

  throw new Error('The call resolved where the suite expected a refusal.');
}

/* ---------------------------------------------------------------------------------------------
 * The three record classes whose own read requires a permission of its own
 * ------------------------------------------------------------------------------------------- */

/**
 * One of the three record classes whose own read requires a permission beside `evidence.read`, with the
 * reference this read resolves for one record of it.
 *
 * The permission is stated here rather than read from the handler because it is the property under
 * test: `audit.read` is the trail's own permission (contracts §7.1, `./audit.ts`), `policy.read` the
 * policy set's and `sovereignty.read` the declared configuration's (`./governance.ts`). The reference is
 * derived from the record set, so the suite types no identifier (rule P-6).
 */
interface FamilyReadCase {
  /** How the record class is named in a case's title. */
  readonly family: string;

  /** The permission the record class's own read requires. */
  readonly permission: Permission;

  /** The reference a caller sends for one record of the class. */
  readonly reference: (state: MockState) => string;
}

const FAMILY_READ_CASES: readonly FamilyReadCase[] = [
  {
    family: 'audit event',
    permission: 'audit.read',
    reference: (state) => firstOf(state.auditEvents, 'audit event').id,
  },
  {
    family: 'policy',
    permission: 'policy.read',
    reference: (state) => firstOf(state.records.policies, 'policy').id,
  },
  {
    family: 'outbound endpoint',
    permission: 'sovereignty.read',
    reference: (state) => firstOf(state.records.sovereignty.ledger, 'outbound ledger row').endpoint,
  },
];

describe('the permission a record class asks beside the evidence read', () => {
  it.each(FAMILY_READ_CASES)(
    'refuses $family evidence to a role the matrix leaves without $permission',
    async ({ permission, reference }) => {
      const state = await createMockState();
      const persona = personaWhere(state, ['evidence.read'], [permission]);
      const ref = reference(state);

      const problem = await refusalOf(() => getEvidence(contextFor(state, persona), ref));

      /* The refusal is a permission cause carrying the permission the record class's own read requires
         and the roles that hold it, so a forbidden card explains the refusal instead of only reporting
         it (rule P-8, AAP 0.12.3). */
      expect(problem.type).toBe('permission');
      expect(problem.traceId).toBe(TRACE_ID);
      expect(problem.requiredPermission).toBe(permission);
      expect(problem.rolesWithPermission?.length ?? 0).toBeGreaterThan(0);

      // The sentence names the record the reference resolved to, the acting role and the permission.
      expect(problem.message).toContain(ref);
      expect(problem.message).toContain(persona.role);
      expect(problem.message).toContain(permission);
    },
  );

  it('answers an event of the trail for the persona the matrix grants the trail to', async () => {
    const state = await createMockState();
    const persona = personaWhere(state, ['evidence.read', 'audit.read'], []);
    const event = firstOf(state.auditEvents, 'audit event');

    const evidence = await getEvidence(contextFor(state, persona), event.id);

    /* The payload is the chain's own reading of that one link — the action it records, the position it
       holds and the instant the chain hashed — so a drawer opened on an event reports the event the
       trail holds rather than a second account of it (contracts §6). */
    expect(evidence.value).toContain(event.action);
    expect(evidence.value).toContain(event.result);
    expect(evidence.value).toContain(String(event.sequence));
    expect(evidence.inputs).toContain(`timestamp = ${event.timestamp}`);
    expect(evidence.label).toBe(SIM_LABELS[4]);
  });

  it('answers a policy for the persona the matrix grants the policy set to', async () => {
    const state = await createMockState();
    const persona = personaWhere(state, ['evidence.read', 'policy.read'], []);
    const policy = firstOf(state.records.policies, 'policy');

    const evidence = await getEvidence(contextFor(state, persona), policy.id);

    // Every word of the payload is the record's own, its identifier and its title included.
    expect(evidence.value).toContain(policy.title);
    expect(evidence.inputs).toContain(`id = ${policy.id}`);
    expect(evidence.upstream).toContain(policy.id);
  });

  it('answers a declared outbound endpoint for the persona the matrix grants the ledger to', async () => {
    const state = await createMockState();
    const persona = personaWhere(state, ['evidence.read', 'sovereignty.read'], []);
    const row = firstOf(state.records.sovereignty.ledger, 'outbound ledger row');

    const evidence = await getEvidence(contextFor(state, persona), row.endpoint);

    /* The payload answers for the declared row the reference named — its endpoint and its purpose, read
       from the record — and it carries the ledger aggregate's provenance, because the counts beside them
       are that aggregate's reading of the trail rather than a seeded figure (rule P-6). */
    expect(evidence.provenance).toBe('computed');
    expect(evidence.inputs).toContain(`endpoint = ${row.endpoint}`);
    expect(evidence.inputs).toContain(`purpose = ${row.purpose}`);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The decision an element review states
 * ------------------------------------------------------------------------------------------- */

/**
 * The review a case submits for one element, with the decision it states.
 *
 * @param packageRecord - The package the element belongs to.
 * @param element - The element under review.
 * @param decision - The decision the review states.
 * @returns The review draft the handler receives.
 */
function reviewOf(
  packageRecord: MockState['records']['ppapPackages'][number],
  element: MockState['records']['ppapPackages'][number]['elements'][number],
  decision: ElementReviewDecision,
): ElementReview {
  return {
    packageId: packageRecord.id,
    elementNumber: element.number,
    decision,
    correctedValue: element.actual,
  };
}

describe('the decision an element review states', () => {
  it('refuses a decision outside the two members, before any record or event is written', async () => {
    const state = await createMockState();
    // `evidence.review` is the permission the write requires, so the case acts as the role holding it.
    const persona = personaWhere(state, ['evidence.review'], []);
    const packageRecord = firstOf(state.records.ppapPackages, 'part approval package');
    const element = firstOf(packageRecord.elements, 'part approval package element');
    const unsupported = 'bogus';
    const before = {
      state: element.state,
      humanReviewed: element.humanReviewed,
      readinessPercent: packageRecord.readinessPercent,
      events: state.auditEvents.length,
    };

    const problem = await refusalOf(() =>
      reviewPackageElement(
        contextFor(state, persona),
        packageRecord.id,
        element.number,
        reviewOf(packageRecord, element, unsupported as unknown as ElementReviewDecision),
      ),
    );

    /* The value the review stated is named beside both members an element review answers, so a caller
       learns what the two dispositions are instead of only that its own was refused. */
    expect(problem.type).toBe('validation');
    expect(problem.traceId).toBe(TRACE_ID);
    expect(problem.message).toContain(unsupported);
    expect(problem.message).toContain('accept');
    expect(problem.message).toContain('correct');

    /* A refused review writes nothing at all: an out-of-union decision cannot set the element's state,
       mark it reviewed, move the package's readiness or reach the chain. */
    expect(element.state).toBe(before.state);
    expect(element.humanReviewed).toBe(before.humanReviewed);
    expect(packageRecord.readinessPercent).toBe(before.readinessPercent);
    expect(state.auditEvents.length).toBe(before.events);
  });

  it('settles the same element on an accept, which the narrowing leaves as it was', async () => {
    const state = await createMockState();
    const persona = personaWhere(state, ['evidence.review'], []);
    const packageRecord = firstOf(state.records.ppapPackages, 'part approval package');
    const element = firstOf(packageRecord.elements, 'part approval package element');
    const eventsBefore = state.auditEvents.length;

    const reviewed = await reviewPackageElement(
      contextFor(state, persona),
      packageRecord.id,
      element.number,
      reviewOf(packageRecord, element, 'accept'),
    );

    const settled = firstOf(
      reviewed.elements.filter((candidate) => candidate.number === element.number),
      'reviewed element in the returned package',
    );

    expect(settled.humanReviewed).toBe(true);
    expect(state.auditEvents.length).toBe(eventsBefore + 1);

    // The one event the review appends carries the decision the caller stated, not a rewritten one.
    const appended = firstOf(state.auditEvents.slice(-1), 'appended audit event');

    expect(appended.action).toBe('extraction review');
    expect(appended.objectRef).toBe(packageRecord.id);
    expect(appended.after?.decision).toBe('accept');
  });
});
