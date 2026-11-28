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
 * WHAT ELSE IT HOLDS. The money shape two payload families state. The customer-order and the
 * purchase-order payload report a record's own amount, and the drawer prints that text unchanged, so
 * the cases below hold every record a solver case measures to the interface's one money shape and to
 * one text per record value — each expectation built with `formatMoney` rather than with an amount
 * written here, because two records stating equal prices must not reach the reader in two shapes
 * (contracts §1, AAP §0.8, rule P-6).
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
import { formatMoney, PERMISSIONS, SIM_LABELS } from '../../../types';
import type {
  ActiveUser,
  ElementReview,
  ElementReviewDecision,
  Money,
  Permission,
  PlantId,
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
 * The money shape a payload's `inputs` list states
 * ------------------------------------------------------------------------------------------- */

/**
 * The money of one record a solver case measures, read from the record rather than stated here.
 *
 * The subject is derived from the record set: a solver case's own order references and its delayed
 * purchase order are what fix the customer orders and the inbound order AAP §0.8's figures are
 * measured over, so the case below asserts over exactly those records while typing no identifier and
 * no amount (rule P-6).
 */
interface MeasuredMoney {
  /** The reference `getEvidence` answers for the record. */
  readonly reference: string;

  /** The plant the record sits at, which decides whether the acting persona may read it. */
  readonly plantId: PlantId;

  /** The amount exactly as the record states it. */
  readonly amount: Money;
}

/**
 * One record family a solver case measures, with the `inputs` member its money reaches the drawer
 * under.
 */
interface MoneyFamilyCase {
  /** How the record family is named in a case's title. */
  readonly family: string;

  /** The `inputs` member the family's amount is stated under, as the record spells it. */
  readonly member: string;

  /** The records of the family a solver case measures, with their own amounts. */
  readonly measured: (state: MockState) => readonly MeasuredMoney[];
}

/**
 * The record a reference of a set names.
 *
 * @param records - The records to read.
 * @param id - The reference the set is expected to carry.
 * @param what - How the set is named in a failure, so a thin fixture reports what it is missing.
 * @returns The record of that reference.
 * @throws Error - The set carries no record of that reference.
 */
function recordOf<T extends { readonly id: string }>(
  records: readonly T[],
  id: string,
  what: string,
): T {
  const found = records.find((record) => record.id === id);

  if (found === undefined) {
    throw new Error(`The seeded record set holds no ${what} ${id}.`);
  }

  return found;
}

/**
 * The persona the matrix grants the evidence read and whose plant scope reaches every plant a set of
 * records sits at.
 *
 * Both sides are answered by the matrix rather than by a role named here (rule P-3), so a case acts as
 * a persona the authority actually describes and keeps acting as one wherever the matrix moves.
 *
 * @param state - The session whose user records are read.
 * @param plantIds - Every plant the records a case reads sit at.
 * @returns The acting persona.
 * @throws Error - The record set carries no persona of that description.
 */
function personaReaching(state: MockState, plantIds: readonly PlantId[]): ActiveUser {
  const found = state.records.users
    .map(personaOf)
    .find(
      (persona) =>
        mayDo(persona, 'evidence.read') &&
        plantIds.every((plantId) => persona.plantIds.includes(plantId)),
    );

  if (found === undefined) {
    throw new Error(
      `The seeded record set carries no persona holding evidence.read whose plant scope reaches ${plantIds.join(', ')}.`,
    );
  }

  return found;
}

/**
 * The member one `inputs` entry states: the name to the left of the `name = value` separator the
 * payload's list uses.
 *
 * @param entry - One entry of a payload's `inputs` list.
 * @returns The member's name, or the entry itself when it carries no separator.
 */
function memberOf(entry: string): string {
  const [member] = entry.split(' = ');

  return member ?? entry;
}

/**
 * The two record families whose amount the payload reports verbatim from the record, and which a
 * solver case measures.
 *
 * The customer order is the family the two orders of the baseline case belong to; the purchase order
 * is the inbound commitment that case's disruption is measured on. Both members end in `Eur`, which is
 * what makes them the contracts' money members (contracts §1).
 */
const MONEY_FAMILY_CASES: readonly MoneyFamilyCase[] = [
  {
    family: 'customer order',
    member: 'unitPriceEur',
    measured: (state) =>
      state.records.solverCases.flatMap((solverCase) =>
        solverCase.orders.map((measured) => {
          const order = recordOf(state.records.customerOrders, measured.orderId, 'customer order');

          return { reference: order.id, plantId: order.plantId, amount: order.unitPriceEur };
        }),
      ),
  },
  {
    family: 'purchase order',
    member: 'unitCostEur',
    measured: (state) =>
      state.records.solverCases.map((solverCase) => {
        const order = recordOf(
          state.records.purchaseOrders,
          solverCase.delayedPurchaseOrderId,
          'purchase order',
        );

        return { reference: order.id, plantId: order.plantId, amount: order.unitCostEur };
      }),
  },
];

describe('the money shape a payload states for the records a solver case measures', () => {
  it.each(MONEY_FAMILY_CASES)(
    'states $member of every measured $family in the interface money shape, and one amount in one text',
    async ({ member, measured }) => {
      const state = await createMockState();
      const subjects = measured(state);
      const persona = personaReaching(
        state,
        subjects.map((subject) => subject.plantId),
      );
      const rendered = new Map<string, string>();

      expect(subjects.length).toBeGreaterThan(0);

      for (const subject of subjects) {
        const evidence = await getEvidence(contextFor(state, persona), subject.reference);
        const stated = `${member} = ${formatMoney(subject.amount)}`;

        /* The amount is the record's own, stated in the interface's one money shape — the currency
           code, a thousands separator and at most two decimals (contracts §1, AAP §0.8). The
           expectation is built with the formatter, never with an amount written here, so a case cannot
           agree with a second rendering of the same figure (rule P-6). */
        expect(evidence.inputs).toContain(stated);

        /* No money member of the payload reaches the drawer as the bare machine number a raw
           interpolation of the record leaves: every `*Eur` entry carries its currency code. */
        const money = evidence.inputs.filter((entry) => memberOf(entry).endsWith('Eur'));

        expect(money.length).toBeGreaterThan(0);

        for (const entry of money) {
          expect(entry).toContain('EUR');
        }

        /* One record value has one text. The case that produced this assertion is two orders of one
           solver case whose equal unit price reached the drawer in two shapes, `1.850 EUR` beside
           `1850 EUR`. */
        const previous = rendered.get(String(subject.amount));

        if (previous !== undefined) {
          expect(previous).toBe(stated);
        }

        rendered.set(String(subject.amount), stated);
      }
    },
  );
});

/* ---------------------------------------------------------------------------------------------
 * The solver case a scripted answer cites
 * ------------------------------------------------------------------------------------------- */

describe('the evidence behind a solver case', () => {
  it('answers the case a citation names, and refuses a reference under its prefix no case carries', async () => {
    const state = await createMockState();
    const persona = personaWhere(state, ['evidence.read'], []);
    const solverCase = firstOf(state.records.solverCases, 'solver case');
    const measured = firstOf(solverCase.orders, 'customer order the case measures');

    /* The reference a scripted answer cites is the case record's own identifier, so a prefix no record
       answers is derived from it here rather than typed: the record's digits, repeated, name no case
       (rule P-6). */
    const caseDigits = solverCase.id.replace(/^\D+/, '');
    const casePrefix = solverCase.id.slice(0, solverCase.id.length - caseDigits.length);
    const absentRef = `${casePrefix}${caseDigits}${caseDigits}`;

    const evidence = await getEvidence(contextFor(state, persona), solverCase.id);

    /* The chip that failed before opens the drawer's sections now: the payload states the case's own
       position in words and the rules that measure an option from it, and it names the exception the
       case belongs to upstream of itself (AAP 0.12.2's `Evidence`, principle PR-6). */
    expect(evidence.value.trim()).not.toBe('');
    expect(evidence.formula.trim()).not.toBe('');
    expect(evidence.upstream).toContain(solverCase.exceptionId);

    // The record's own inputs carry `Simulated data`, because every member reported here is a seeded field.
    expect(evidence.label).toBe(SIM_LABELS[0]);

    /* The price a measured order was agreed at reaches the payload in the one money shape the module
       states an amount in, never as a bare machine number (contracts §1, rule P-6). */
    expect(
      evidence.inputs.some(
        (entry) =>
          entry.includes(measured.orderId) && entry.includes(formatMoney(measured.unitPriceEur)),
      ),
    ).toBe(true);

    /* A reference under the case's own prefix that no record carries is refused as `'not-found'` naming
       it, rather than blaming another family's lookup, so a citation the records cannot answer reports
       what it looked for. */
    expect(state.records.solverCases.map((record) => record.id)).not.toContain(absentRef);

    const problem = await refusalOf(() => getEvidence(contextFor(state, persona), absentRef));

    expect(problem.type).toBe('not-found');
    expect(problem.traceId).toBe(TRACE_ID);
    expect(problem.message).toContain(absentRef);
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
