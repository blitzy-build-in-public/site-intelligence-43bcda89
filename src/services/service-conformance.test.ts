// @vitest-environment node

/**
 * Conformance suite for the two adapters of `SiteIntelligenceService`: the compile-time and runtime
 * proof that the in-browser mock backend and the unconnected API client implement the one service port
 * member for member (AAP 0.7 T-18, AAP 0.16 rule P-2).
 *
 * WHY THE PROOF IS TYPED RATHER THAN RENDERED. Rule P-2 fixes the boundary as one typed service
 * interface bound to an in-browser mock backend, with an unconnected API client implementing the same
 * interface. AAP 0.3.2 records why a type-level check is the proof of that: the port is a plain
 * TypeScript interface, so an adapter that loses a member, or narrows a signature a screen relies on,
 * fails `tsc --noEmit` in this file instead of failing behind a screen at run time. AAP 0.7 assigns
 * T-18 to exactly this pair of checks — a source check for the seed boundary and this proof for the
 * port — and gives the reason a browser run is not used: nothing a browser can observe shows a
 * one-line provider swap.
 *
 * WHAT IS PROVEN, IN THREE PARTS.
 * 1. Assignability. `ConformsToPort` is parameterised by the port, so `MockBackend` and `ApiClient`
 *    pass through it only while each satisfies every member of `SiteIntelligenceService` with a
 *    compatible signature.
 * 2. Surface equality. Assignability alone would also hold for an adapter that added members, so the
 *    `keyof` sets are compared in both directions as well: neither adapter omits a port member, the
 *    API client carries nothing beyond the port, and the mock backend's two extra names are stated
 *    here by name so that a third one cannot slip past unremarked.
 * 3. The capability split. The role switch belongs to the demonstration capability of
 *    `src/services/demonstration-controls.ts` rather than to the port, so the mock backend is proven to
 *    implement that capability and the API client to lack it — the split AAP 0.12.1 records, proved
 *    rather than described.
 *
 * The runtime cases cover what the types cannot. A type says a member is declared, not that the object
 * a binding point receives carries it, so both instances are walked member by member; the two
 * demonstration members are then answered on the API client, which is where a member that quietly
 * turned into a request would show up as a call the platform's `fetch` recorded; the role switch is
 * shown to belong to the mock backend alone; and the mock backend's readiness promise is shown to
 * resolve with its seeded audit trail in place.
 *
 * WHAT THIS FILE DOES NOT DO. It asserts nothing about which adapter is bound — that is the one line
 * of `src/services/create-service.ts`, and rule P-2 keeps the choice there. It tests no behaviour of
 * a member: the solver's proof is `src/domain/solver/solve-supply-delay.test.ts`, the chain's is
 * `src/domain/audit/audit.test.ts`, and the mock adapter's own suite covers its refusals and its
 * redaction. It reaches the seeded records only through the mock folder's own loader, for the two
 * facts that name the auditor persona and count the seeded trail, so no import of the seed modules
 * leaves `src/services/mock/`; and it types no figure and no identifier of its own (rule P-6).
 *
 * The Node environment is declared on line 1 rather than inherited from the shared jsdom default,
 * because the mock backend hashes its seeded trail through `globalThis.crypto.subtle` during its
 * bootstrap and that is a platform call rather than a DOM one: jsdom 31 supplies no `SubtleCrypto`
 * of its own, so the digest resolves through the platform's Web Crypto under either environment, and
 * the declaration states what this case needs instead of relying on the shared default (AAP 0.3.1).
 * Nothing here needs a DOM, and no Node built-in is imported: the module reads no file and inspects
 * no process, so `@types/node` stays out of the project.
 *
 * Rules this suite is built to satisfy:
 * - P-2: it exists to prove the one service interface is implemented twice, and it imports both
 *   adapters itself rather than letting a screen or a component reach either of them.
 * - P-6: the only quantities it compares are the seeded trail's own count, read from the record set
 *   the mock folder's loader returns, and the single record the role switch appends, each named as a
 *   constant instead of being written into an assertion.
 * - B-1: nothing here opens a socket. The API client is constructed and its two demonstration members
 *   are called, and the case that calls them asserts that the platform's `fetch` was never reached.
 * - B-2: no credential, no environment read and no configuration of the build is consulted.
 * - P-4: neither adapter, nor the chain behind it, is credited with establishing anything; the
 *   readiness case counts the events a walk covers and says nothing about a store behind a page.
 * - P-7: every persona named below comes from the seeded record set, and the product and workspace
 *   names are the ones the inputs fix.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from './api-client/api-client';
import type { DemonstrationControls } from './demonstration-controls';
import { MockBackend } from './mock/mock-backend';

/*
 * The seeded record set is reached here for exactly two facts: `SEEDED_EVENT_COUNT`, the number of
 * events the readiness case expects the chain to hold, and the personas `loadSeed()` hands back, one
 * of which is the auditor the audit read needs. Rule P-6 forbids typing either fact and the port
 * exposes neither, so the record set's own values are the only source that keeps this suite from
 * restating seed data. Both arrive through `src/services/mock/seed-loader.ts`, the mock folder's one
 * door to the records and the only importer of them in the application, so no import of the seed
 * modules leaves `src/services/mock/` and
 * `tests/source-checks/no-seed-import-outside-mock.test.ts` holds over this file exactly as it holds
 * over the rest of `src/`. Neither fact is typed here: the count is the record set's own constant and
 * a persona is whatever the loader's clone carries.
 */
import { loadSeed, SEEDED_EVENT_COUNT } from './mock/seed-loader';
import type { SeededUser } from './mock/seed-loader';
import type { SiteIntelligenceService } from './site-intelligence-service';

/* ---------------------------------------------------------------------------------------------
 * The port's members, spelled once — the runtime walk names the member that is missing
 * ------------------------------------------------------------------------------------------- */

/**
 * Every member of `SiteIntelligenceService`, in the order the port declares them.
 *
 * The list is `as const` and constrained by `keyof SiteIntelligenceService`, and the two aliases in
 * the next section prove it names each member exactly once: a member added to the port leaves
 * `PortMethodsAllListed` unsatisfied, and a name that is no member of the port leaves
 * `PortMethodsAllReal` unsatisfied. The walk that reads this list then checks the two instances,
 * which the compiler cannot see.
 */
const PORT_METHODS = [
  'getOverview',
  'listExceptions',
  'getExceptionDetail',
  'getAffectedLines',
  'assignException',
  'noteException',
  'dismissException',
  'getScenarioSet',
  'solveScenario',
  'listApprovals',
  'getApproval',
  'requestApproval',
  'decideApproval',
  'reviewApprovalOutcome',
  'listAuditEvents',
  'verifyAuditChain',
  'getModelCatalogue',
  'askAssistant',
  'getSovereigntyStatus',
  'getOutboundLedger',
  'listPolicies',
  'getPolicy',
  'requestPolicyException',
  'getEvidence',
  'getDocument',
  'listPins',
  'reviewPin',
  'listPackages',
  'getPackage',
  'reviewElement',
  'searchIdentifiers',
  'getTopology',
  'getAtlas',
  'getSourceCatalogue',
  'getPlanGrid',
  'getExitPackage',
  'exportEvidencePack',
  'exportScenarioComparison',
  'exportChokepointBrief',
  'setSimulation',
  'resetDemo',
] as const satisfies readonly (keyof SiteIntelligenceService)[];

/** The union of the names the list above spells. */
type ListedPortMethod = (typeof PORT_METHODS)[number];

/* ---------------------------------------------------------------------------------------------
 * The compile-time proof — an adapter that drifts fails `tsc --noEmit` in this file
 * ------------------------------------------------------------------------------------------- */

/**
 * A type that holds only where its argument is `never`.
 *
 * The terminal step of every set comparison below. `Exclude<…>` resolves to `never` when the two key
 * sets agree, and applying this alias to a result that did not cancel out is a compile error naming
 * the union that survived — which is the member an adapter added or lost.
 */
type AssertNever<T extends never> = T;

/**
 * A type that holds only where its argument is `true`.
 *
 * Used where the proof is a conditional rather than a set difference, so a check resolving to `false`
 * is a compile error instead of a silently unused alias. A `false` argument fails the constraint;
 * `never` cannot arise from `Same` below, which answers `true` or `false` and nothing else.
 */
type AssertTrue<T extends true> = T;

/**
 * A type that answers `true` where its two arguments are the same type and `false` otherwise.
 *
 * Both directions are compared, so a member set that grows on one side and shrinks on the other cannot
 * cancel out the way one assignability test would let it.
 */
type Same<Left, Right> = [Left] extends [Right] ? ([Right] extends [Left] ? true : false) : false;

/**
 * The assignability proof: a candidate is accepted only while it satisfies the port in full.
 *
 * @typeParam Candidate - An adapter class, constrained by the port it has to implement.
 */
type ConformsToPort<Candidate extends SiteIntelligenceService> = Candidate;

/** `MockBackend` satisfies the port: every member present, with a compatible signature. */
type MockBackendConforms = ConformsToPort<MockBackend>;

/** `ApiClient` satisfies the port: every member present, with a compatible signature. */
type ApiClientConforms = ConformsToPort<ApiClient>;

/**
 * The port members `MockBackend` does not carry.
 *
 * Resolves to `never`, so an adapter that lost a member fails to compile rather than answering
 * `undefined` for it at run time.
 */
type MockBackendOmitted = AssertNever<Exclude<keyof SiteIntelligenceService, keyof MockBackend>>;

/** The port members `ApiClient` does not carry. Resolves to `never`, for the same reason. */
type ApiClientOmitted = AssertNever<Exclude<keyof SiteIntelligenceService, keyof ApiClient>>;

/**
 * The members `ApiClient` publishes besides the port's own.
 *
 * Resolves to `never`: the unconnected client is the port and nothing else, so a member a screen could
 * reach on one adapter and not the other cannot appear here. The exports, which carry no HTTP path,
 * are port members for that reason rather than additions beside it.
 */
type ApiClientExtras = AssertNever<Exclude<keyof ApiClient, keyof SiteIntelligenceService>>;

/**
 * The members `MockBackend` publishes besides the port's own.
 *
 * Two names, and both are stated deliberately: `whenReady` is the readiness promise the binding point
 * awaits before the first screen renders, and `switchRole` is the demonstration capability beside the
 * port. The next alias proves the pair is exact, so a third public member here is a compile error.
 */
type MockBackendExtras = Exclude<keyof MockBackend, keyof SiteIntelligenceService>;

/** The mock backend's extras are the readiness promise and the role switch, and nothing else. */
type MockBackendExtrasAreNamed = AssertTrue<Same<MockBackendExtras, 'whenReady' | 'switchRole'>>;

/** `MockBackend` implements the demonstration capability that sits beside the port. */
type MockBackendImplementsDemonstration = AssertTrue<
  Same<MockBackend extends DemonstrationControls ? true : false, true>
>;

/**
 * `ApiClient` does not implement the demonstration capability.
 *
 * The role switch changes which seeded persona the session acts as, which a service holding the real
 * records and the real identity has no counterpart for (AAP 0.12.1). Proving the absence keeps the
 * capability from leaking into the port, where every adapter would have to satisfy it.
 */
type ApiClientLacksDemonstration = AssertTrue<
  Same<ApiClient extends DemonstrationControls ? true : false, false>
>;

/** The member list names every member of the port. */
type PortMethodsAllListed = AssertNever<Exclude<keyof SiteIntelligenceService, ListedPortMethod>>;

/** The member list names nothing that is not a member of the port. */
type PortMethodsAllReal = AssertNever<Exclude<ListedPortMethod, keyof SiteIntelligenceService>>;

/**
 * Every compile-time assertion of this suite, gathered under one name.
 *
 * The aliases above are compile-time only, so nothing at run time consumes them; this record is where
 * a reader finds them together, and each member names the proof it carries. A failure points at the
 * alias whose constraint was not met, and that alias states in its own comment what the port requires.
 */
export type ConformanceProof = {
  readonly mockBackendConforms: MockBackendConforms;
  readonly apiClientConforms: ApiClientConforms;
  readonly mockBackendOmitted: MockBackendOmitted;
  readonly apiClientOmitted: ApiClientOmitted;
  readonly apiClientExtras: ApiClientExtras;
  readonly mockBackendExtrasAreNamed: MockBackendExtrasAreNamed;
  readonly mockBackendImplementsDemonstration: MockBackendImplementsDemonstration;
  readonly apiClientLacksDemonstration: ApiClientLacksDemonstration;
  readonly portMethodsAllListed: PortMethodsAllListed;
  readonly portMethodsAllReal: PortMethodsAllReal;
};

/* ---------------------------------------------------------------------------------------------
 * Facts the runtime cases read from the seeded record set
 * ------------------------------------------------------------------------------------------- */

/**
 * One simulation trigger, passed to the API client's no-op only to show that the call addresses
 * nothing.
 *
 * The member sets no flag — it holds no state — so which trigger it is handed cannot change what it
 * answers. `loading` is the trigger the popover's list of states begins with, and the type is read
 * from the port's own signature rather than restated here.
 */
const SAMPLE_SIMULATION_FLAG: Parameters<SiteIntelligenceService['setSimulation']>[0] = 'loading';

/**
 * How many audit events the role switch that reaches the auditor appends.
 *
 * One: the `role switch` record contracts §6 fixes for a change of persona, written by the adapter when
 * the switch succeeds. The chain therefore covers the seeded trail plus that single record when it is
 * walked below, which is why the expected count adds it rather than comparing against the trail alone.
 */
const ROLE_SWITCH_EVENTS = 1;

/**
 * The seeded personas, read once from the mock folder's loader.
 *
 * `src/services/mock/seed-loader.ts` is the application's only importer of `src/seed`, and its
 * `loadSeed()` hands back a deep clone of the whole record set, so `users` on that clone is where a
 * persona is found while this suite names no path into the seed modules itself. The clone is taken
 * once here rather than once per lookup: which persona holds a role does not change while the module
 * is loaded, and one clone costs one deep copy of the records. Nothing is typed here — the list is
 * the record set's own value (rule P-6).
 */
const SEEDED_PERSONAS = loadSeed().users;

/**
 * The seeded persona holding a role, so the audit read can be reached without typing an identifier.
 *
 * The auditor is the only role the permission matrix grants `audit.read` to, and the session opens as a
 * different persona, so the readiness case switches before it walks the chain. Finding the persona by
 * role keeps the identifier in the seed records, where rule P-6 puts it.
 *
 * @param role - The role whose persona is wanted.
 * @returns The seeded persona holding that role.
 * @throws Error - When the record set carries no persona for the role, which would mean the seed no
 *   longer spans the eight roles the demonstration's switcher offers.
 */
function personaWithRole(role: SeededUser['role']): SeededUser {
  const persona = SEEDED_PERSONAS.find((candidate) => candidate.role === role);

  if (persona === undefined) {
    throw new Error(
      `The seeded record set carries no ${role} persona, so the audit read this proof walks cannot ` +
        'be reached.',
    );
  }

  return persona;
}

/* ---------------------------------------------------------------------------------------------
 * The runtime proof
 * ------------------------------------------------------------------------------------------- */

/**
 * Undoes the spy a case installs over the platform's request function.
 *
 * Stated here rather than left to the configuration's `restoreMocks`, so the file does not depend on a
 * setting for the property its one instrumented case rests on: the request function a later case sees
 * is the platform's own.
 */
afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * The two adapters, constructed and settled for one case.
 *
 * The mock backend begins hashing its seeded trail the moment it is built, so its readiness promise is
 * awaited here: a case then holds a settled session rather than a bootstrap still running beside it.
 * The API client takes no constructor argument — its base path is the constant its own folder holds —
 * so constructing one starts nothing.
 *
 * @returns Both adapters, ready to be inspected.
 */
async function adapters(): Promise<{ mockBackend: MockBackend; apiClient: ApiClient }> {
  const mockBackend = new MockBackend();

  await mockBackend.whenReady();

  return { mockBackend, apiClient: new ApiClient() };
}

describe('SiteIntelligenceService, implemented by the mock backend and the API client', () => {
  it('carries a function under every port member on both adapters', async () => {
    const { mockBackend, apiClient } = await adapters();

    for (const method of PORT_METHODS) {
      expect(typeof mockBackend[method], `MockBackend.${method}`).toBe('function');
      expect(typeof apiClient[method], `ApiClient.${method}`).toBe('function');
    }
  });

  it('answers both demonstration members on the API client without addressing a host', async () => {
    const { mockBackend, apiClient } = await adapters();

    expect(typeof mockBackend.setSimulation).toBe('function');
    expect(typeof mockBackend.resetDemo).toBe('function');

    const requestSpy = vi.spyOn(globalThis, 'fetch');

    const simulated = await apiClient.setSimulation(SAMPLE_SIMULATION_FLAG, false);
    const reset = await apiClient.resetDemo();

    expect(simulated.data).toBe(true);
    expect(reset.data).toBe(true);
    expect(requestSpy).not.toHaveBeenCalled();
  });
});

describe('the demonstration capability beside the port', () => {
  it('offers the role switch on the mock backend and not on the API client', async () => {
    const { mockBackend, apiClient } = await adapters();

    expect(typeof mockBackend.switchRole).toBe('function');
    expect('switchRole' in apiClient).toBe(false);
  });

  it('is ready once its bootstrap settles, with the whole seeded trail in the chain', async () => {
    const mockBackend = new MockBackend();

    // The resolution itself is the subject here, so this case asserts it instead of building through
    // the helper above. `whenReady` hands back a promise settled by the one bootstrap the constructor
    // started, so a further call would cost nothing.
    await expect(mockBackend.whenReady()).resolves.toBeUndefined();

    const auditor = personaWithRole('auditor');
    const switched = await mockBackend.switchRole(auditor.id);

    expect(switched.data.id).toBe(auditor.id);

    const report = await mockBackend.verifyAuditChain();

    expect(report.data.eventsChecked).toBe(SEEDED_EVENT_COUNT + ROLE_SWITCH_EVENTS);
  });
});
