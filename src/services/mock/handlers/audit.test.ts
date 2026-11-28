// @vitest-environment node

/**
 * Handler suite for `handlers/audit.ts`: the page bound the trail read enforces.
 *
 * WHAT IT PROVES. The read of the trail is bounded, because the trail is not: the chain gains an event
 * on every audited write, so a read answered with all of it would grow with every write and cost a
 * filter and a sort over the whole chain each time. Two properties hold that in place, and each is
 * asserted here rather than inferred from the adapter's suite: a read that asks for no `limit` is
 * answered with the adapter's own default page rather than with the whole ordered trail, a read that
 * asks for more than the greatest page the adapter serves is capped at that page, and a `limit` that
 * bounds no page at all is refused rather than answered — the page length is the folder's one rule, so
 * the trail read does not give a stated length a meaning of its own.
 *
 * WHY IT CALLS THE HANDLER RATHER THAN THE PORT. The adapter's suite drives every read through
 * `MockBackend`, which owns its state privately and hashes the seeded trail at bootstrap; its chain is
 * the seeded trail plus whatever a case appends, and reaching the greatest page through writes alone
 * would take hundreds of calls each waiting the adapter's 150-400 ms latency. The page bound is a
 * property of the handler, so the cases here hand the handler a state directly and build the chain they
 * need with the domain's own append. The context they build is the shape the adapter builds:
 * `listAuditEvents` evaluates the acting role through the contracts §7.1 matrix and reads nothing else
 * of the persona (rule P-3 — the check is a demonstration control, not production authorisation).
 *
 * WHAT IT DOES NOT DO. It types no figure of the domain (rule P-6): the two page lengths it holds the
 * handler to are the adapter's own bounds, and the chain it builds derives every position, identifier
 * and hash from the domain's append rather than from a record written here. It reaches no network, reads
 * no environment value and carries no credential (rules B-1 and B-2), and it verifies nothing about the
 * chain — `verifyAuditChain` walks the records the state holds and has no page to bound.
 */

import { describe, expect, it } from 'vitest';

import { appendEvent } from '../../../domain/audit/chain';
import { hasPermission, plantScopeFor } from '../../../domain/policy/permissions';
import { PERMISSIONS } from '../../../types';
import type { ActiveUser, AuditEvent, Permission, Role } from '../../../types';
import { createMockState } from '../mock-state';
import type { HandlerContext, MockState } from '../mock-state';
import { listAuditEvents } from './audit';

/* ---------------------------------------------------------------------------------------------
 * The bounds this suite holds the handler to
 * ------------------------------------------------------------------------------------------- */

/**
 * The page the adapter serves a read that asks for no `limit`.
 *
 * It is `LIST_PAGE_DEFAULT` in `./audit.ts` — the folder's one page rule, which every list read of this
 * adapter shares — stated here because this suite exists to hold the handler to it: a page that changed
 * without a case changing would have changed what every caller receives, and a suite that read the
 * constant back would agree with any value the handler chose.
 */
const DEFAULT_PAGE = 250;

/**
 * The greatest page the adapter serves, whatever `limit` asks for.
 *
 * `LIST_PAGE_MAX` in `./audit.ts`, on the same footing as {@link DEFAULT_PAGE}.
 */
const GREATEST_PAGE = 500;

/* ---------------------------------------------------------------------------------------------
 * The context a handler call receives
 * ------------------------------------------------------------------------------------------- */

/** The role the contracts §7.1 matrix grants `audit.read`, as the seeded personas carry it. */
const READER_ROLE: Role = 'auditor';

/** The correlation identifier these direct calls quote; no adapter minted one for them. */
const TRACE_ID = 'trace-handler-suite';

/**
 * Every permission the contracts §7.1 matrix grants a role.
 *
 * Derived from the one matrix the adapter evaluates, so the persona built below cannot claim a
 * permission its role does not hold — the arrangement `src/services/mock/mock-backend.ts` uses to
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
 * The context one handler call receives over a given state, acting as the seeded persona whose role
 * reads the trail.
 *
 * The persona is taken from the state's own user records rather than written here, so the identity the
 * read is evaluated for is one the record set carries.
 *
 * @param state - The session state the read walks.
 * @returns The context, carrying the persona and a trace identifier of this suite's own.
 * @throws Error - The record set carries no persona in a role that holds the permission.
 */
function contextFor(state: MockState): HandlerContext {
  const record = state.records.users.find((user) => user.role === READER_ROLE);

  if (record === undefined) {
    throw new Error(`The seeded record set carries no ${READER_ROLE} persona to read the trail as.`);
  }

  return {
    state,
    actor: {
      id: record.id,
      name: record.name,
      role: record.role,
      plantIds: plantScopeFor(record.role),
      permissions: permissionsOf(record.role),
      homeRoute: record.homeRoute,
    },
    traceId: TRACE_ID,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The chain the capped case reads
 * ------------------------------------------------------------------------------------------- */

/**
 * A chain longer than the given page, folded from the seeded trail's own drafts.
 *
 * Built with `appendEvent`, one draft at a time, so what the read is given is a chain — unique
 * positions, unique `AUD-nnnnnn` identifiers and hashes linked to their predecessor — rather than a
 * list that merely has the right fields. The seeded drafts are folded as many times as it takes, which
 * is the only way to a trail past the greatest page that costs a test nothing: each fold appends in the
 * order it was handed, so positions stay strictly increasing and every derived member remains the chain
 * module's own. The drafts' instants repeat after the first fold, which no read depends on — the
 * ordering of equal instants breaks the tie by chain position.
 *
 * @param state - The session whose seeded drafts are folded.
 * @param page - The page the chain must be longer than.
 * @returns The chain, in sequence order.
 */
async function chainLongerThan(state: MockState, page: number): Promise<AuditEvent[]> {
  const drafts = state.records.auditEvents;
  const chain: AuditEvent[] = [];

  while (chain.length <= page) {
    for (const draft of drafts) {
      chain.push(await appendEvent(chain, draft));

      if (chain.length > page) {
        break;
      }
    }
  }

  return chain;
}

/** The event identifiers of a page, which is what two pages of the same order are compared by. */
function idsOf(events: readonly AuditEvent[]): readonly string[] {
  return events.map((event) => event.id);
}

/* ---------------------------------------------------------------------------------------------
 * The bounds
 * ------------------------------------------------------------------------------------------- */

describe('the page the trail read serves', () => {
  it('serves its default page to a read that asks for no limit', async () => {
    const state = await createMockState();
    const context = contextFor(state);
    state.auditEvents = await chainLongerThan(state, DEFAULT_PAGE);

    // The chain holds more events than one page, so what bounds this read is the page and not the chain.
    expect(state.auditEvents.length).toBeGreaterThan(DEFAULT_PAGE);

    const unbounded = await listAuditEvents(context, {});
    const stated = await listAuditEvents(context, { limit: DEFAULT_PAGE + 1 });

    /* The read that states no page is answered with the adapter's default one rather than with the whole
       ordered trail, and that page is the head of the order a stated read returns — the bound slices the
       trail, it does not reshuffle it. */
    expect(unbounded).toHaveLength(DEFAULT_PAGE);
    expect(stated).toHaveLength(DEFAULT_PAGE + 1);
    expect(idsOf(unbounded)).toEqual(idsOf(stated).slice(0, DEFAULT_PAGE));
  });

  it('caps a read that asks for more than the greatest page it serves', async () => {
    const state = await createMockState();
    const context = contextFor(state);
    state.auditEvents = await chainLongerThan(state, GREATEST_PAGE);

    // The chain is longer than any page the adapter serves, so the cap is what bounds these reads.
    expect(state.auditEvents.length).toBeGreaterThan(GREATEST_PAGE);

    const oversized = await listAuditEvents(context, { limit: state.auditEvents.length });
    const greatest = await listAuditEvents(context, { limit: GREATEST_PAGE });

    /* A request for the whole chain is served the greatest page rather than the chain, and a request for
       that page is served the same events: the cap is a page bound, not a silent truncation of one. */
    expect(oversized).toHaveLength(GREATEST_PAGE);
    expect(idsOf(oversized)).toEqual(idsOf(greatest));
  });

  it.each([0, -1])('refuses a read that asks for %i rows', async (limit) => {
    const state = await createMockState();
    const context = contextFor(state);

    /* A length that bounds no page is refused rather than answered with an empty one: the page length is
       the folder's one rule (`listLimitOf` in `./audit.ts`), and the trail read does not invent a
       different meaning for a limit of its own. */
    await expect(listAuditEvents(context, { limit })).rejects.toMatchObject({
      type: 'validation',
      traceId: TRACE_ID,
    });
  });
});
