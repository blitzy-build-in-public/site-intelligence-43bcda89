// @vitest-environment node

/**
 * What the identifier search indexes, how it narrows what it indexes, and what bounds its answer.
 *
 * `searchIdentifiers` is the one read behind the shell's field (functional requirement F16, AAP 0.2.1),
 * and the families it groups are AAP 0.12.2's `SearchHit` row: the identifier, the entity type the
 * results are grouped by, and the route or drawer target that opens the record. `mock-backend.test.ts`
 * covers the adapter's other duties and touches the search only where a collection read is emptied or a
 * read is refused; this suite is the search's own, one case per duty:
 *
 * 1. every family the workspace publishes is findable by the identifier the records carry, with the
 *    target that opens it — a route for the four families with a screen, a drawer reference for the
 *    rest;
 * 2. an exception is found through the plants it also affects, as the queue lists it, and one whose
 *    whole reach lies outside a persona's scope is not offered to that persona;
 * 3. the index is narrowed by the redaction the reads apply — the vendor-scoped pins of AAP 0.2.1 and
 *    the customer-confidential documents the drawer withholds;
 * 4. the answer is bounded, so a one-character term cannot return the whole trail;
 * 5. the index is rebuilt when the session moves and not per term, which is what makes the bound and
 *    the reuse observable at all.
 *
 * WHY THE NODE ENVIRONMENT: the same reason `mock-backend.test.ts` states — the bootstrap hashes the
 * seeded audit trail through `crypto.subtle`, and nothing here renders.
 *
 * WHAT IT READS. Every expected value is derived from records read through the port: the node
 * identifiers from the topology, the competitor and chokepoint identifiers from the atlas, the
 * documents' classifications from the documents themselves and the pins a persona may open from its own
 * pin read. The identifiers typed into a case are the seeded records the review named as its
 * reproduction (rule P-6 allows naming a seeded record; inventing one is what it forbids) and the
 * identifier prefixes the record patterns fix, used as the term a reader types.
 */

import { describe, expect, it } from 'vitest';

import type { Approval, Scope, SearchHit, Topology, UserId } from '../../types';
import { MockBackend, SEARCH_HIT_LIMIT } from './mock-backend';

/* ---------------------------------------------------------------------------------------------
 * The request values every case shares
 * ------------------------------------------------------------------------------------------- */

/**
 * The shell's selection with nothing chosen, which reads as "all plants, all products" and leaves the
 * acting role's own scope as the only narrowing (the adapter's own reading of a `Scope`).
 */
const NO_SCOPE: Scope = { plants: [], products: [] };

/**
 * The term that matches every identifier the record patterns build, used for the bound's case.
 *
 * Contracts §1 writes every identifier as a prefix, a separator and a body — `EXC-2026-1184`,
 * `AUD-000142`, `PIN-SUP-DONAU-DICHTUNG-01` — so a single hyphen matches an exception, an audit event
 * and a pin alike, and the answer is the whole index unless the search bounds it.
 */
const ONE_CHARACTER_TERM = '-';

/** The term that matches the document family alone, which is what the redaction case searches. */
const DOCUMENT_TERM = 'DOC-';

/** The term that matches the evidence-pin family alone. */
const PIN_TERM = 'PIN-';

/** The term that matches the approval family alone, which is what the invalidation case searches. */
const APPROVAL_TERM = 'APR-';

/* ---------------------------------------------------------------------------------------------
 * The personas the cases act as — `src/seed/users.ts`, addressed by identifier
 * ------------------------------------------------------------------------------------------- */

/**
 * Five of the eight seeded personas, each chosen for what the matrix grants it.
 *
 * - `MATERIAL_PLANNER` holds `exception.read` and `evidence.read` over two plants, so it reads most
 *   families and only part of each plant-scoped one.
 * - `PLANT_MANAGER` is scoped to a single plant, which is the scope half of the reach case.
 * - `PRODUCTION_PLANNER` is scoped to the three plants its lines stand in, so it reaches an exception
 *   laid elsewhere through a plant that exception also affects, which is the reach the index and the
 *   reads behind its targets have to agree on.
 * - `HEAD_OF_SUPPLY_CHAIN` spans every plant and may read a customer-confidential body, so it is the
 *   persona that sees the records the redaction withholds from others.
 * - `ADMINISTRATOR` holds `evidence.read` and `competitive.read` and not
 *   `document.confidential.read`, which is the redaction under test and the permission the atlas
 *   families need.
 * - `EXTERNAL_ENGINEER` holds `evidence.read` alone, and sees only its own vendor's pins (AAP 0.2.1).
 */
const MATERIAL_PLANNER: UserId = 'USR-01';
const PLANT_MANAGER: UserId = 'USR-02';
const HEAD_OF_SUPPLY_CHAIN: UserId = 'USR-03';
const ADMINISTRATOR: UserId = 'USR-04';
const PRODUCTION_PLANNER: UserId = 'USR-05';
const AUDITOR: UserId = 'USR-06';
const EXTERNAL_ENGINEER: UserId = 'USR-08';

/* ---------------------------------------------------------------------------------------------
 * The seeded records the review named, used as read inputs (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/**
 * The two exceptions the queue lists that the search could not find.
 *
 * Both are laid on one plant and reach another through `alsoAffectsPlantIds`, so they are in the
 * material planner's queue and were absent from its answer — the `EXC` reproduction of the review.
 * They are read inputs to the assertion rather than expected values, exactly as an identifier a case
 * opens from the queue is (rule P-6).
 */
const REACHED_THROUGH_ANOTHER_PLANT: readonly string[] = ['EXC-2026-1186', 'EXC-2026-1192'];

/**
 * The product and the line the review searched for, each a seeded record of the two families the
 * topology does not publish as nodes: a product is read from the queue's rows and a line from the
 * records the impact chain names, so the case names the seeded record itself.
 */
const SEEDED_PRODUCT = 'PRD-R75';
const SEEDED_LINE = 'LN-BRN-1';

/**
 * The competitor network and the chokepoint the review searched for, as the atlas publishes them.
 *
 * Used as the term a reader types rather than as an expected value: the case asserts that the record
 * the atlas read returns for that prefix is the hit it received.
 */
const COMPETITOR_TERM = 'CMP-';
const CHOKEPOINT_TERM = 'CHK-';

/**
 * The budget one case gets: every call waits the adapter's 150-400 ms band by design (AAP 0.12.1), and
 * the cases that resolve their subject from several reads make a dozen calls.
 */
const CASE_TIMEOUT_MS = 30_000;

/* ---------------------------------------------------------------------------------------------
 * Helpers — one fresh session per case, and the readings each case needs
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
 * Acts as one of the seeded personas, as the role switcher does.
 *
 * @param backend - The session to switch.
 * @param userId - The persona to act as.
 */
async function actAs(backend: MockBackend, userId: UserId): Promise<void> {
  await backend.switchRole(userId);
}

/**
 * The first member of a list a case needs, or a failure naming what it looked for.
 *
 * @param values - The list the case reads.
 * @param label - What the list holds, for the failure's message.
 * @returns The first member.
 * @throws Error - The list is empty, which would leave the case without a subject.
 */
function firstOf<T>(values: readonly T[], label: string): T {
  const [first] = values;

  if (first === undefined) {
    throw new Error(`The records hold no ${label}, so the case cannot run.`);
  }

  return first;
}

/**
 * The hit whose reference is one identifier, or a failure naming the identifier.
 *
 * @param hits - The answer being read.
 * @param ref - The identifier the case expects to find.
 * @returns The hit that carries it.
 * @throws Error - The answer does not carry that identifier.
 */
function hitNamed(hits: readonly SearchHit[], ref: string): SearchHit {
  const found = hits.find((hit) => hit.ref === ref);

  if (found === undefined) {
    throw new Error(`The search did not return ${ref}, so the case cannot assert on it.`);
  }

  return found;
}

/**
 * The identifiers an answer carries, in the order the index returned them.
 *
 * @param hits - The answer being read.
 * @returns The hit references.
 */
function refsOf(hits: readonly SearchHit[]): string[] {
  return hits.map((hit) => hit.ref);
}

/**
 * The canvas payload as one persona reads it, which is where four node families' identifiers come from.
 *
 * @param backend - The session to read.
 * @param userId - The persona to read it as.
 * @returns The topology the persona's scope admits.
 */
async function topologyOf(backend: MockBackend, userId: UserId): Promise<Topology> {
  await actAs(backend, userId);

  return (await backend.getTopology(NO_SCOPE)).data;
}

/**
 * The identifiers of one family in the search's own answer, gathered by searching that family's own
 * prefix as one persona.
 *
 * @param backend - The session to read.
 * @param userId - The persona to read it as.
 * @param term - The prefix the family's identifiers carry.
 * @returns The answer's hit references.
 */
async function searchAs(
  backend: MockBackend,
  userId: UserId,
  term: string,
): Promise<readonly SearchHit[]> {
  await actAs(backend, userId);

  return (await backend.searchIdentifiers(term, NO_SCOPE)).data;
}

/**
 * The documents one classification covers, read as a persona that may read every body.
 *
 * The set is derived rather than typed: each document identifier the search publishes is opened as the
 * head of the supply chain, which holds `document.confidential.read`, and the classification the record
 * states decides whether it belongs to the set (AAP 0.2.1's redaction, contracts §7.1).
 *
 * @param backend - The session to read.
 * @returns The identifiers of the customer-confidential documents, in record order.
 */
async function confidentialDocumentIds(backend: MockBackend): Promise<string[]> {
  const hits = await searchAs(backend, HEAD_OF_SUPPLY_CHAIN, DOCUMENT_TERM);
  const confidential: string[] = [];

  for (const hit of hits) {
    const document = (await backend.getDocument(hit.ref)).data;

    if (document.classification === 'customer-confidential') {
      confidential.push(document.id);
    }
  }

  return confidential;
}

/**
 * One approval request the seeded records accept, found through the port rather than named.
 *
 * The first open exception of the acting persona's queue whose options include one that passes its
 * constraint check is requested. A request the records refuse — an option an approved plan already
 * holds, a policy the plan breaches — is not a failure of this case but a reason to look at the next
 * option, so a refusal the port reports is caught and the search continues; anything that is not the
 * port's own `Problem` is rethrown, so a defect in the adapter still fails the case.
 *
 * @param backend - The session to write to, acting as the persona the queue admits.
 * @returns The approval the request created.
 * @throws Error - No option of any open exception in scope is requestable.
 */
async function requestedApprovalOf(backend: MockBackend): Promise<Approval> {
  for (const row of (await backend.listExceptions({}, NO_SCOPE)).data) {
    if (row.status !== 'open') {
      continue;
    }

    for (const option of (await backend.getScenarioSet(row.id)).data.scenarios) {
      if (option.constraintCheck !== 'pass') {
        continue;
      }

      const request = { exceptionId: row.id, scenarioId: option.id };

      try {
        return (await backend.requestApproval(request)).data;
      } catch (error) {
        if (!isProblem(error)) {
          throw error;
        }
      }
    }
  }

  throw new Error('No open exception in scope offers a requestable option, so the case cannot run.');
}

/**
 * Whether a caught value is the typed refusal the port reports.
 *
 * @param value - What the call threw.
 * @returns `true` when the value is a `Problem`.
 */
function isProblem(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'message' in value &&
    'traceId' in value
  );
}

/* ---------------------------------------------------------------------------------------------
 * The families the index publishes — one case per added family
 * ------------------------------------------------------------------------------------------- */

/** What one family's case asserts about the record it searches for. */
interface FamilyCase {
  /** The family, as the case's own name states it. */
  readonly family: string;

  /** The persona that may read the family. */
  readonly userId: UserId;

  /** The term the reader types. */
  readonly term: string;

  /** The record kind the hit is grouped under. */
  readonly entityType: string;

  /** Where the hit opens: a screen of the record's own, or the evidence drawer's reference. */
  readonly kind: 'route' | 'drawer';

  /**
   * The identifier the case searches for, and the target value it must open.
   *
   * @param backend - The session to resolve the record from.
   * @returns The identifier and the value its target must carry.
   */
  readonly subject: (backend: MockBackend) => Promise<{ readonly ref: string; readonly value: string }>;
}

/**
 * One case per family this change added to the index, in the index's own order.
 *
 * The four node families the canvas places are resolved from the topology read, the two market families
 * from the atlas read and the solver case from the comparison read its exception carries; the product
 * and the line are the seeded records the review searched for. `drawer` cases carry the reference as
 * their target value, which is the shape `drawerTarget` builds — the drawer resolves the reference, so
 * the hit and the read behind it name one identifier.
 */
const FAMILY_CASES: readonly FamilyCase[] = [
  {
    family: 'plant',
    userId: MATERIAL_PLANNER,
    term: 'PLT-',
    entityType: 'Plant',
    kind: 'drawer',
    subject: async (backend) => {
      const node = firstOf((await topologyOf(backend, MATERIAL_PLANNER)).plants, 'plant node');

      return { ref: node.id, value: node.id };
    },
  },
  {
    family: 'supplier',
    userId: MATERIAL_PLANNER,
    term: 'SUP-',
    entityType: 'Supplier',
    kind: 'drawer',
    subject: async (backend) => {
      const node = firstOf((await topologyOf(backend, MATERIAL_PLANNER)).suppliers, 'supplier node');

      return { ref: node.id, value: node.id };
    },
  },
  {
    family: 'tier-2 origin',
    userId: MATERIAL_PLANNER,
    term: 'ORG-',
    entityType: 'Origin',
    kind: 'drawer',
    subject: async (backend) => {
      const node = firstOf((await topologyOf(backend, MATERIAL_PLANNER)).origins, 'origin node');

      return { ref: node.id, value: node.id };
    },
  },
  {
    family: 'customer',
    userId: MATERIAL_PLANNER,
    term: 'CUS-',
    entityType: 'Customer',
    kind: 'drawer',
    subject: async (backend) => {
      const node = firstOf((await topologyOf(backend, MATERIAL_PLANNER)).customers, 'customer node');

      return { ref: node.id, value: node.id };
    },
  },
  {
    family: 'material',
    userId: MATERIAL_PLANNER,
    term: 'MAT-',
    entityType: 'Material',
    kind: 'drawer',
    subject: async (backend) => {
      const node = firstOf((await topologyOf(backend, MATERIAL_PLANNER)).materials, 'material node');

      return { ref: node.id, value: node.id };
    },
  },
  {
    family: 'product',
    userId: MATERIAL_PLANNER,
    term: SEEDED_PRODUCT,
    entityType: 'Product',
    kind: 'drawer',
    subject: async () => ({ ref: SEEDED_PRODUCT, value: SEEDED_PRODUCT }),
  },
  {
    family: 'line',
    userId: MATERIAL_PLANNER,
    term: SEEDED_LINE,
    entityType: 'Line',
    kind: 'drawer',
    subject: async () => ({ ref: SEEDED_LINE, value: SEEDED_LINE }),
  },
  {
    family: 'solver case',
    userId: MATERIAL_PLANNER,
    term: 'CASE-',
    entityType: 'Solver case',
    kind: 'route',
    subject: async (backend) => {
      await actAs(backend, MATERIAL_PLANNER);

      for (const row of (await backend.listExceptions({}, NO_SCOPE)).data) {
        const detail = (await backend.getExceptionDetail(row.id)).data;
        const caseId = detail.exception.solverCaseId;

        if (caseId !== undefined) {
          return { ref: caseId, value: `/exceptions/${row.id}/scenarios` };
        }
      }

      throw new Error('No exception in scope states a solver case, so the case cannot run.');
    },
  },
  {
    family: 'competitor network',
    userId: ADMINISTRATOR,
    term: COMPETITOR_TERM,
    entityType: 'Competitor',
    kind: 'drawer',
    subject: async (backend) => {
      await actAs(backend, ADMINISTRATOR);

      const network = firstOf((await backend.getAtlas()).data.competitors, 'competitor network');

      return { ref: network.competitorId, value: network.competitorId };
    },
  },
  {
    family: 'competitor site',
    userId: ADMINISTRATOR,
    term: COMPETITOR_TERM,
    entityType: 'Competitor site',
    kind: 'drawer',
    subject: async (backend) => {
      await actAs(backend, ADMINISTRATOR);

      const network = firstOf((await backend.getAtlas()).data.competitors, 'competitor network');
      const site = firstOf(network.sites, 'competitor site');

      return { ref: site.id, value: site.id };
    },
  },
  {
    family: 'shared chokepoint',
    userId: ADMINISTRATOR,
    term: CHOKEPOINT_TERM,
    entityType: 'Chokepoint',
    kind: 'drawer',
    subject: async (backend) => {
      await actAs(backend, ADMINISTRATOR);

      const crossing = firstOf((await backend.getAtlas()).data.chokepoints, 'shared chokepoint');

      return { ref: crossing.id, value: crossing.id };
    },
  },
];

describe('the families the identifier search indexes', () => {
  it.each(FAMILY_CASES)(
    'finds a $family record by its identifier, with the target that opens it',
    async ({ userId, term, entityType, kind, subject }) => {
      const backend = await readyBackend();
      const expected = await subject(backend);
      const hits = await searchAs(backend, userId, term);
      const hit = hitNamed(hits, expected.ref);

      expect(hit.entityType).toBe(entityType);
      expect(hit.target).toEqual({ kind, value: expected.value });
    },
    CASE_TIMEOUT_MS,
  );
});

/* ---------------------------------------------------------------------------------------------
 * The reach the scope narrows — the exception family's own rule
 * ------------------------------------------------------------------------------------------- */

describe('the scope the answer is narrowed by', () => {
  it(
    'finds every exception the queue lists, the ones reached through another plant included',
    async () => {
      const backend = await readyBackend();
      const hits = await searchAs(backend, MATERIAL_PLANNER, 'EXC-');
      const queue = (await backend.listExceptions({}, NO_SCOPE)).data;

      // One population, two readings: the queue the persona sees and the answer it can search are the
      // same set of exceptions, so a row the queue lists cannot be missing from the search (F16).
      expect(refsOf(hits).sort()).toEqual(queue.map((row) => row.id).sort());

      for (const alsoAffecting of REACHED_THROUGH_ANOTHER_PLANT) {
        expect(refsOf(hits)).toContain(alsoAffecting);
      }
    },
    CASE_TIMEOUT_MS,
  );

  it(
    'leaves out an exception whose whole reach lies outside the persona scope',
    async () => {
      const backend = await readyBackend();
      const everything = (await backend.listExceptions({}, NO_SCOPE)).data;
      const scoped = await searchAs(backend, PLANT_MANAGER, 'EXC-');
      const outside = everything.find((row) => !refsOf(scoped).includes(row.id));

      if (outside === undefined) {
        throw new Error('Every exception lies in the plant manager scope, so the case cannot run.');
      }

      // The records hold it and the wide-scoped persona is offered it, so its absence below is the
      // scope narrowing rather than a record the index never built.
      expect(refsOf(scoped)).not.toContain(outside.id);

      const wide = await searchAs(backend, HEAD_OF_SUPPLY_CHAIN, outside.id);

      expect(refsOf(wide)).toContain(outside.id);
    },
    CASE_TIMEOUT_MS,
  );
});

/* ---------------------------------------------------------------------------------------------
 * The redaction the reads apply — AAP 0.2.1, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

describe('the redaction the index applies', () => {
  it(
    'offers the external supplier engineer only the pins it may open',
    async () => {
      const backend = await readyBackend();
      await actAs(backend, EXTERNAL_ENGINEER);

      const openable = (await backend.listPins({})).data.map((pin) => pin.id);
      const hits = await searchAs(backend, EXTERNAL_ENGINEER, PIN_TERM);

      expect(openable.length).toBeGreaterThan(0);
      expect(refsOf(hits)).toEqual(openable);

      // The whole pin set is larger, which is what makes the narrowing observable rather than a search
      // that happens to hold one vendor's pins.
      await actAs(backend, ADMINISTRATOR);

      const everyPin = (await backend.listPins({})).data;

      expect(everyPin.length).toBeGreaterThan(openable.length);
    },
    CASE_TIMEOUT_MS,
  );

  it(
    'offers the platform administrator no customer-confidential document identifier',
    async () => {
      const backend = await readyBackend();
      const confidential = await confidentialDocumentIds(backend);
      const withheld = refsOf(await searchAs(backend, ADMINISTRATOR, DOCUMENT_TERM));

      expect(confidential.length).toBeGreaterThan(0);
      expect(withheld.length).toBeGreaterThan(0);

      for (const documentId of confidential) {
        expect(withheld).not.toContain(documentId);
      }

      // The same identifiers reach the persona that may read the bodies, so the difference above is the
      // classification's effect and not a document the search never indexed.
      const released = refsOf(await searchAs(backend, HEAD_OF_SUPPLY_CHAIN, DOCUMENT_TERM));

      for (const documentId of confidential) {
        expect(released).toContain(documentId);
      }
    },
    CASE_TIMEOUT_MS,
  );
});

/* ---------------------------------------------------------------------------------------------
 * The answer the search returns for an empty term
 * ------------------------------------------------------------------------------------------- */

describe('the answer the search returns', () => {
  it.each(['', ' ', '   '])(
    'answers the term %j with no hits rather than with the whole index',
    async (term) => {
      const backend = await readyBackend();

      expect((await searchAs(backend, AUDITOR, term)).length).toBe(0);
    },
    CASE_TIMEOUT_MS,
  );
});

/* ---------------------------------------------------------------------------------------------
 * The bound the answer keeps — CWE-770's shape
 * ------------------------------------------------------------------------------------------- */

describe('the bound the answer keeps', () => {
  it(
    'bounds a one-character term while more identifiers than that match it',
    async () => {
      const backend = await readyBackend();
      await actAs(backend, AUDITOR);

      const events = (await backend.listAuditEvents({})).data;
      const queue = (await backend.listExceptions({}, NO_SCOPE)).data;
      const pins = (await backend.listPins({})).data;

      /*
       * Each of these families' identifiers contains the term — `AUD-000142`, `EXC-2026-1184`,
       * `PIN-...` — so the count of uncapped matches is at least their sum, and every one of them was
       * returned before the bound existed.
       */
      const matching = events.length + queue.length + pins.length;
      const hits = (await backend.searchIdentifiers(ONE_CHARACTER_TERM, NO_SCOPE)).data;

      expect(matching).toBeGreaterThan(SEARCH_HIT_LIMIT);
      expect(hits).toHaveLength(SEARCH_HIT_LIMIT);

      // The index's family order decides what the bound keeps: the exception family comes first, so
      // every exception the queue lists survives the bound with its own detail intact.
      expect(refsOf(hits).slice(0, queue.length).sort()).toEqual(queue.map((row) => row.id).sort());
    },
    CASE_TIMEOUT_MS,
  );
});

/* ---------------------------------------------------------------------------------------------
 * The index the adapter reuses and rebuilds — CR4-F19
 * ------------------------------------------------------------------------------------------- */

describe('the index the adapter reuses', () => {
  it(
    'answers the same term twice with the same hits',
    async () => {
      const backend = await readyBackend();
      const first = await searchAs(backend, MATERIAL_PLANNER, 'EXC-');
      const second = (await backend.searchIdentifiers('EXC-', NO_SCOPE)).data;

      expect(second).toEqual(first);
    },
    CASE_TIMEOUT_MS,
  );

  it(
    'finds an approval a write has just appended',
    async () => {
      const backend = await readyBackend();
      await actAs(backend, MATERIAL_PLANNER);

      // Warm the index before the write, so the case proves the cache was invalidated rather than never
      // built: an adapter that cached per session and never dropped the list would answer without it.
      const before = await searchAs(backend, MATERIAL_PLANNER, APPROVAL_TERM);
      const approval = await requestedApprovalOf(backend);

      expect(refsOf(before)).not.toContain(approval.id);

      const after = (await backend.searchIdentifiers(APPROVAL_TERM, NO_SCOPE)).data;
      const hit = hitNamed(after, approval.id);

      expect(hit.entityType).toBe('Approval');
      expect(hit.target).toEqual({ kind: 'route', value: `/approvals/${approval.id}` });
    },
    CASE_TIMEOUT_MS,
  );
});

/* ---------------------------------------------------------------------------------------------
 * The read behind every target — the index may never offer what the read refuses
 * ------------------------------------------------------------------------------------------- */

/**
 * Opens one hit through the read its target names.
 *
 * A route target names a screen, and the screen's own read is the one that has to answer: the
 * investigation screen reads the exception, the approval screen reads the approval, the comparison
 * screen reads the option set of the exception the case belongs to, and the policy screen reads the
 * policy. A drawer target names the evidence reference the drawer resolves. A refusal is thrown, so a
 * case that opens every hit fails on the first hit the index offered and the read behind it withheld.
 *
 * @param backend - The session to read.
 * @param hit - The hit to open.
 * @returns A promise that settles when the read has answered.
 * @throws Error - The hit names a record kind whose read this helper does not know.
 */
async function openHit(backend: MockBackend, hit: SearchHit): Promise<void> {
  if (hit.target.kind === 'drawer') {
    await backend.getEvidence(hit.target.value);
    return;
  }

  switch (hit.entityType) {
    case 'Exception':
      await backend.getExceptionDetail(hit.ref);
      return;
    case 'Approval':
      await backend.getApproval(hit.ref);
      return;
    case 'Policy':
      await backend.getPolicy(hit.ref);
      return;
    case 'Solver case': {
      // `/exceptions/<exceptionId>/scenarios`: the comparison read is the one the screen makes.
      const [, exceptionId] = hit.target.value.split('/').filter((segment) => segment !== '');

      if (exceptionId === undefined) {
        throw new Error(`Solver case ${hit.ref} carries no exception route, so it cannot be opened.`);
      }

      await backend.getScenarioSet(exceptionId);
      return;
    }
    default:
      throw new Error(`This case knows no read behind a ${hit.entityType} hit.`);
  }
}

/**
 * The terms the reach case opens every hit of: one per family whose read places it by a plant.
 *
 * A scenario, an approval, an exception and a solver case are the four families narrowed by the
 * exception they belong to, and the two reaches differ between them — the exception's screen and the
 * comparison screen admit a record through the plants it also affects, while the approval detail read
 * and the evidence drawer place it at the plant it lands on — so an index that applied one reach to all
 * four would offer a hit whose own read refuses it.
 */
const REACH_TERMS: readonly string[] = ['EXC-', 'SCN-', 'APR-', 'CASE-'];

/**
 * The personas the reach case opens the answer as: one scoped to two plants, one to a single plant, and
 * one whose scope meets several exceptions only through a plant they also affect.
 */
const REACH_PERSONAS: readonly UserId[] = [MATERIAL_PLANNER, PLANT_MANAGER, PRODUCTION_PLANNER];

describe('the read behind a hit', () => {
  it(
    'offers a persona no hit whose own read refuses it',
    async () => {
      const backend = await readyBackend();
      let opened = 0;

      for (const persona of REACH_PERSONAS) {
        for (const term of REACH_TERMS) {
          const hits = await searchAs(backend, persona, term);
          const reached: string[] = [];

          for (const hit of hits) {
            await openHit(backend, hit);
            reached.push(hit.ref);
          }

          // The hit that fails is the hit the read refused, and the comparison below names it against
          // the answer it came from. A persona may legitimately see nothing of a family, so the case
          // also asserts at the end that it opened something at all and is not vacuous.
          expect(reached).toEqual(refsOf(hits));
          opened += reached.length;
        }
      }

      expect(opened).toBeGreaterThan(0);
    },
    CASE_TIMEOUT_MS,
  );
});
