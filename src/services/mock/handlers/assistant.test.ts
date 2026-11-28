// @vitest-environment node

/**
 * Handler suite for `handlers/assistant.ts`: the permission each record family a question cites asks,
 * and the precedence that permission keeps against the two refusals beside it.
 *
 * WHAT IT PROVES. An answer is composed from the records its question cites, and those records belong to
 * families whose own reads require permissions of their own (contracts §7.1). The exception screens
 * refuse `exception.read` to a role the evidence read admits, so a question citing an exception — and
 * the customer orders and the solver case its answer measures — has to answer to that permission, or the
 * assistant would state the figures the screen behind it withholds (AAP 0.2.1, AAP 0.6.2). The cases
 * below hold the family gate to that from both sides: the question is refused to every persona the
 * matrix leaves without `exception.read`, with a `Problem` naming the permission, the roles that hold it,
 * the acting role and the cited record and with none of the question's customer-order identifiers in it;
 * and the same question is answered to a persona the matrix grants the permission, which is what proves
 * the gate is the matrix's decision rather than a blanket refusal. A question citing no record stays
 * answerable to the persona the matrix withholds `exception.read` from, because the gate judges a
 * question's citations and not its reader. The last case holds the precedence: a persona the matrix
 * withholds both `document.confidential.read` and `exception.read` from, asking the question whose
 * customer-confidential document stands first among its citations, still meets the body refusal the
 * evidence family already gives it — so the message-quoting check did not displace the stronger one and
 * no body leaves the service on the way to a record-family verdict.
 *
 * WHY IT CALLS THE HANDLER RATHER THAN THE PORT. The adapter's suite drives every read through
 * `MockBackend`, which owns its state privately and adds 150-400 ms of latency to every call. The
 * question here is a property of the handler, so the cases hand it a state directly, built by
 * `createMockState()` — the same async bootstrap the adapter awaits — and a context of the shape the
 * adapter builds: the persona is the record set's own user record for a role, and its `permissions` are
 * the contracts §7.1 matrix's answer, never a list written here (rule P-3 — the check is a demonstration
 * control, not production authorisation).
 *
 * WHAT IT DOES NOT DO. It types no question sentence, no figure and no record identifier of its own
 * (rule P-6): every question it asks is read from the record set by the key the seed gives it, every
 * identifier it asserts against is read from that record, and the permission set it selects a persona by
 * is the matrix's. It reaches no network, reads no environment value and carries no credential (rules
 * B-1 and B-2).
 */

import { describe, expect, it } from 'vitest';

import { hasPermission, plantScopeFor, rolesWith } from '../../../domain/policy/permissions';
import { PERMISSIONS } from '../../../types';
import type { ActiveUser, Permission, Problem, Role } from '../../../types';
import { UNSCRIPTED_NOTICE } from '../seed-loader';
import type { AssistantQuestion, AssistantQuestionRecordKind } from '../seed-loader';
import { createMockState } from '../mock-state';
import type { HandlerContext, MockState } from '../mock-state';
import { askAssistant } from './assistant';

/* ---------------------------------------------------------------------------------------------
 * The permissions the four cases select a persona by — contracts §7.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission every read of the exception family requires, which is the property under test.
 *
 * Stated on its own rather than read from the handler, for the reason `evidence.test.ts` states its
 * three: the permission a record family's read asks is what these cases assert, and a value read back
 * from the module under test could not be wrong. `./exceptions.ts` gates the same reads on it.
 */
const EXCEPTION_READ: Permission = 'exception.read';

/**
 * The permission that releases a customer-confidential document body — `./evidence.ts`'s own constant,
 * restated here as the second property under test in the precedence case.
 */
const DOCUMENT_CONFIDENTIAL_READ: Permission = 'document.confidential.read';

/**
 * The sentence the withheld-document refusal ends with, which the precedence case asserts character for
 * character: it is the interface's statement that no answer was composed from the body (AAP 0.2.1).
 */
const WITHHELD_BODY_SENTENCE = 'the body was withheld before an answer was composed';

/* ---------------------------------------------------------------------------------------------
 * The context a handler call receives
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier these direct calls quote; no adapter minted one for them. */
const TRACE_ID = 'trace-handler-suite';

/**
 * Every permission the contracts §7.1 matrix grants a role.
 *
 * Derived from the one matrix the adapter evaluates, so the persona built below cannot claim a
 * permission its role does not hold — the arrangement `evidence.test.ts` and `mock-backend.test.ts` use
 * to resolve a session's acting persona from its user record.
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
 * The questions and the records they cite
 * ------------------------------------------------------------------------------------------- */

/**
 * One suggested question, read from the record set by the key the seed gives it.
 *
 * `Q1` to `Q6` are the identifiers AAP 0.8 uses and the contract between the seed and the builders, so
 * a case names a key and reads every word it sends from the record.
 *
 * @param state - The session whose questions are read.
 * @param id - The question's key.
 * @returns The seeded question.
 * @throws Error - The record set holds no question with that key.
 */
function questionOf(state: MockState, id: string): AssistantQuestion {
  const question = state.records.assistantQuestions.find((candidate) => candidate.id === id);

  if (question === undefined) {
    throw new Error(`The seeded record set holds no suggested question ${id}.`);
  }

  return question;
}

/**
 * The identifiers a question cites from one record family, in the order it cites them.
 *
 * @param question - The question whose citations are read.
 * @param kind - The record family wanted.
 * @returns The identifiers of that family, empty when the question cites none of them.
 */
function citedIdentifiersIn(question: AssistantQuestion, kind: AssistantQuestionRecordKind): string[] {
  return question.records.filter((record) => record.kind === kind).map((record) => record.id);
}

/**
 * The one identifier a question cites from a record family its answer depends on.
 *
 * @param question - The question whose citations are read.
 * @param kind - The record family wanted.
 * @returns The identifier the question cites from that family.
 * @throws Error - The question cites no record of that family, so the case has nothing to assert.
 */
function citedIdentifierIn(question: AssistantQuestion, kind: AssistantQuestionRecordKind): string {
  const [first] = citedIdentifiersIn(question, kind);

  if (first === undefined) {
    throw new Error(`The suggested question ${question.id} cites no ${kind} record.`);
  }

  return first;
}

/* ---------------------------------------------------------------------------------------------
 * The refusals
 * ------------------------------------------------------------------------------------------- */

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
 * The record-family gate on a question's citations
 * ------------------------------------------------------------------------------------------- */

describe('the permission a cited record family asks of the assistant path', () => {
  it('refuses a question citing the exception family to every role the matrix leaves without exception.read', async () => {
    const state = await createMockState();
    const question = questionOf(state, 'Q1');
    const citedException = citedIdentifierIn(question, 'exception');
    const citedOrders = citedIdentifiersIn(question, 'customer-order');

    /* Every persona the matrix admits to the evidence read and leaves out of the exception family's:
       derived from the matrix rather than named here, so the case covers the external engineer the
       finding reports and every other role the exception screens refuse (rule P-3). */
    const refused = state.records.users
      .map(personaOf)
      .filter((persona) => mayDo(persona, 'evidence.read') && !mayDo(persona, EXCEPTION_READ));

    expect(refused.length).toBeGreaterThan(0);
    expect(citedOrders.length).toBeGreaterThan(0);

    for (const persona of refused) {
      const problem = await refusalOf(() =>
        askAssistant(contextFor(state, persona), {
          text: question.prompt,
          modelId: state.records.modelCatalogue.defaultModelId,
          contextRefs: [],
        }),
      );

      /* The refusal is a permission cause carrying the permission the family's own read requires and
         the roles that hold it, so a forbidden card explains the refusal instead of only reporting it
         (rule P-8, AAP 0.12.3). */
      expect(problem.type).toBe('permission');
      expect(problem.traceId).toBe(TRACE_ID);
      expect(problem.requiredPermission).toBe(EXCEPTION_READ);
      expect(problem.rolesWithPermission).toEqual(rolesWith(EXCEPTION_READ));

      // The sentence names the acting role, the record family in words and the record the question cites.
      expect(problem.message).toContain(persona.role);
      expect(problem.message).toContain('exception');
      expect(problem.message).toContain(citedException);

      /* And it names no figure and no other citation of the question: the refusal reports what was not
         read rather than summarising the answer that was not composed (rule P-6). */
      for (const order of citedOrders) {
        expect(problem.message).not.toContain(order);
      }
    }
  });

  it('answers the same question for the persona the matrix grants exception.read', async () => {
    const state = await createMockState();
    const persona = personaWhere(state, ['evidence.read', EXCEPTION_READ], []);
    const question = questionOf(state, 'Q1');
    const citedException = citedIdentifierIn(question, 'exception');

    const answer = await askAssistant(contextFor(state, persona), {
      text: question.prompt,
      modelId: state.records.modelCatalogue.defaultModelId,
      contextRefs: [],
    });

    /* The gate is the matrix's decision and not a blanket refusal: the question the persona above was
       refused is answered here, from the scripted builder rather than with the notice, and it cites the
       exception whose records it read (AAP 0.8, contracts §10). */
    expect(answer.text).not.toBe(UNSCRIPTED_NOTICE);
    expect(answer.partial).toBe(false);
    expect(answer.citations.some((citation) => citation.ref === citedException)).toBe(true);
  });

  it('leaves a question citing no record answerable to the persona the matrix withholds exception.read from', async () => {
    const state = await createMockState();
    const persona = personaWhere(state, ['evidence.read'], [EXCEPTION_READ]);
    const question = questionOf(state, 'Q6');

    // The gate reads a question's citations, so a question about the demonstration itself carries none
    // for it to judge and is answered rather than refused.
    expect(question.records).toHaveLength(0);

    const answer = await askAssistant(contextFor(state, persona), {
      text: question.prompt,
      modelId: state.records.modelCatalogue.defaultModelId,
      contextRefs: [],
    });

    expect(answer.text).not.toBe(UNSCRIPTED_NOTICE);
    expect(answer.partial).toBe(false);
  });

  it('keeps the withheld-document refusal ahead of the record-family gate', async () => {
    const state = await createMockState();
    const persona = personaWhere(
      state,
      ['evidence.read'],
      [DOCUMENT_CONFIDENTIAL_READ, EXCEPTION_READ],
    );
    const question = questionOf(state, 'Q2');
    const citedDocument = citedIdentifierIn(question, 'document');
    const citedException = citedIdentifierIn(question, 'exception');

    /* The question cites a document before the exception beside it, so this case reports the order the
       handler applies rather than the order the citations happen to arrive in. */
    expect(question.records.map((record) => record.id).indexOf(citedDocument)).toBeLessThan(
      question.records.map((record) => record.id).indexOf(citedException),
    );

    const problem = await refusalOf(() =>
      askAssistant(contextFor(state, persona), {
        text: question.prompt,
        modelId: state.records.modelCatalogue.defaultModelId,
        contextRefs: [],
      }),
    );

    /* The body the document read withholds keeps its own refusal: the persona lacks both permissions,
       and the failure reports the one the evidence family already answers a question with, so the
       record-family gate added beside it displaced nothing (AAP 0.2.1, AAP 0.12.3). */
    expect(problem.type).toBe('permission');
    expect(problem.requiredPermission).toBe(DOCUMENT_CONFIDENTIAL_READ);
    expect(problem.message).toContain(WITHHELD_BODY_SENTENCE);
    expect(problem.message).toContain(citedDocument);
  });
});
