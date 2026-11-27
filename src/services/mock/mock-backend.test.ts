// @vitest-environment node

/**
 * What the in-browser mock adapter does, driven only through the port it implements.
 *
 * `src/services/service-conformance.test.ts` proves the shape of both adapters; this suite proves the
 * behaviour of `MockBackend`, because the duties rule P-2 loads onto the service have nowhere else to
 * be observed. The cases are grouped one `describe` per duty:
 *
 * 1. the bootstrap, which hashes the seeded trail before the first call answers;
 * 2. the latency band that keeps a loading state observable;
 * 3. the refusal an approval meets while the order book is stale — the service half of the
 *    stale-source rule, which holds whether or not a screen disabled the control;
 * 4. permission enforcement, in the adapter rather than in a view;
 * 5. policy enforcement, with the rule, its reason, the alternative it permits and the event it wrote;
 * 6. message redaction, applied before a record crosses the boundary;
 * 7. the audit append a write makes, the append a read does not, and the queue that keeps two
 *    audited writes issued together from claiming one position;
 * 8. the reset that puts the session back to the seeded state;
 * 9. the tamper control, whose edit a verification reports and repairs nothing of;
 * 10. the assistant's cited answer and its fixed notice;
 * 11. determinism: the same call twice returns the same business figures;
 * 12. the shell's selection: the plant and product the top bar names, resolved once and applied to every
 *     read it narrows.
 *
 * WHY THE NODE ENVIRONMENT, MANDATORY ON THE FIRST LINE ABOVE. The bootstrap hashes the 200 seeded
 * events through `crypto.subtle.digest`, and under Vitest's jsdom default that call rejects jsdom's
 * `ArrayBuffer` realm, so every case here runs in Node and no DOM matcher appears below.
 *
 * WHAT THE SUITE DELIBERATELY DOES NOT DO.
 * - It imports no expected-results fixture (`tests/fixtures/`). Those belong to the solver and
 *   aggregation suites, and this suite asserts invariants and cross-checks the adapter against the
 *   domain modules' own output instead (rule P-6).
 * - It imports no module under `src/seed/`. The records, the seeded trail length, the tamper target
 *   and the assistant's fixed notice arrive as the constants `./seed-loader.ts` re-exports (rule P-2).
 * - It retypes no simulation label: where a label reaches an assertion it is compared against
 *   `SIM_LABELS` from `src/types` (rule P-1).
 * - It uses no test hook. Every call goes through a member of the port plus the two members the
 *   adapter adds — `whenReady()` and `switchRole()` — and the demonstration control `setSimulation()`
 *   the popover drives. No private field is read, no global is set and no query parameter is consulted,
 *   so the behaviour asserted is the behaviour a screen meets.
 * - It names no real company, customer, carmaker or cloud product, and carries no credential-shaped
 *   text, so the scans that cover `src/**` find nothing new here (rules P-7 and B-2).
 */

import { describe, expect, it } from 'vitest';

import type {
  ActiveUser,
  DocumentBody,
  ExceptionId,
  ExceptionRow,
  ExceptionStatus,
  Freshness,
  Levers,
  Problem,
  ProductId,
  Scenario,
  ScenarioId,
  Scope,
  SourceId,
  Topology,
  UserId,
} from '../../types';
import { DEMO_CLOCK, PERMISSIONS, SIM_LABELS, SOURCE_IDS, SOURCE_LABELS } from '../../types';
import { MockBackend } from './mock-backend';
import {
  BASELINE_CASE_ID,
  SEEDED_EVENT_COUNT,
  TAMPER_TARGET_ID,
  UNSCRIPTED_NOTICE,
} from './seed-loader';

/* ---------------------------------------------------------------------------------------------
 * The request values every case shares
 * ------------------------------------------------------------------------------------------- */

/**
 * The shell's selection with nothing chosen, which reads as "all plants, all products" rather than as
 * "no plants": the service then narrows by the acting role's own scope and by nothing else.
 */
const NO_SCOPE: Scope = { plants: [], products: [] };

/**
 * The do-nothing lever position: neither air freight nor a transfer in the plan.
 *
 * A request's own input to the solver, not a figure the interface shows, and the position the seeded
 * baseline scenario is measured at. The figures a case then compares are the solver's output.
 */
const NO_ACTION_LEVERS: Levers = { airSets: 0, transferSets: 0 };

/**
 * The source whose state gates an approval: the one the stale trigger marks, the one the refusal names
 * and the one the freshness strip shows beside the disabled controls.
 */
const APPROVAL_GATE_SOURCE: SourceId = 'erp';

/** The classification whose body is released only to a role holding the matching permission. */
const CONFIDENTIAL_CLASSIFICATION = 'customer-confidential';

/** The audit actions these cases assert on, spelled as the appending module spells them. */
const NOTE_ACTION = 'note';
const DECISION_ACTION = 'decision';
const ROLE_SWITCH_ACTION = 'role switch';

/**
 * The status the overview's open-exception tile counts, which is the one `src/domain/aggregation` reads
 * as open. Restated here so a case can count the same rows the aggregate counted.
 */
const OPEN_STATUS: ExceptionStatus = 'open';

/* ---------------------------------------------------------------------------------------------
 * The personas the cases act as — `src/seed/users.ts`, addressed by identifier
 * ------------------------------------------------------------------------------------------- */

/**
 * Four of the eight seeded personas, each chosen for what the permission matrix grants it, because a
 * refusal is only observable from a persona that does not hold the permission the call requires.
 *
 * - `AUDITOR` holds `audit.read`, which is the only route to the trail and to a verification.
 * - `PLANT_MANAGER` holds `approval.decide`, is scoped to a single plant, and is one of the roles the
 *   seeded pending approval names as eligible, which is what makes it able to decide that plan.
 * - `HEAD_OF_SUPPLY_CHAIN` holds `exception.read` across every plant, so it reads a record a
 *   single-plant persona cannot write to.
 * - `ADMINISTRATOR` lacks `document.confidential.read`, which is the redaction under test.
 * - `EXTERNAL_ENGINEER` holds `evidence.read` alone: the atlas is refused to it and its evidence pins
 *   are narrowed to its own vendor's records.
 *
 * A case that needs the opening persona uses none of them: a fresh session acts as the seed's first
 * record, which `src/services/mock/mock-state.ts` fixes as the material planner.
 */
const AUDITOR: UserId = 'USR-06';
const PLANT_MANAGER: UserId = 'USR-02';
const HEAD_OF_SUPPLY_CHAIN: UserId = 'USR-03';
const ADMINISTRATOR: UserId = 'USR-04';
const EXTERNAL_ENGINEER: UserId = 'USR-08';

/* ---------------------------------------------------------------------------------------------
 * The words the cases submit
 * ------------------------------------------------------------------------------------------- */

/** A note in a planner's own words, as SCR-02's row action records it. */
const NOTE_TEXT = 'Waiting on the supplier to confirm a dispatch date.';

/** The comment a decision carries, which the record keeps and the trail reports. */
const DECISION_COMMENT = 'Approved against the transferred option, with the side effect acknowledged.';

/**
 * The first of the six seeded suggestions, character for character.
 *
 * The adapter matches a question against a seeded prompt exactly, and the port binds no read that would
 * hand the suggestions over — `handlers/assistant.ts` declares a suggested-questions read that
 * `mock-backend.ts` exposes on no member — so the case submits the prompt the assistant panel offers.
 * Its figures are filled in by the adapter, which is what the case cross-checks against the solver.
 */
const SEEDED_QUESTION =
  'If nothing is done about the delayed air sets, which customer orders run late and by how much?';

/** A question outside the six, which must return the seeded notice rather than a composed answer. */
const UNSEEDED_QUESTION = 'Which option should be taken while the line keeps running as it is?';

/** The substring every document identifier carries, used to search for the seeded documents. */
const DOCUMENT_TERM = 'DOC-';

/* ---------------------------------------------------------------------------------------------
 * The band and the shape checks the cases assert against
 * ------------------------------------------------------------------------------------------- */

/**
 * The latency band a call takes, restated here because the adapter's own ladder is private.
 *
 * The floor is asserted on both a read and a write: the delay is a ladder over the session's request
 * counter rather than a random draw, so the first two calls of a session take the floor and the floor
 * plus one step, and an adapter with no delay at all measures in single-digit milliseconds.
 *
 * The two bounds carry different tolerances, and each is deliberate. The floor's is tight, because a
 * measured duration can land a fraction below the delay the timer was given — the clock read and the
 * timer's own resolution differ — and 25 ms is room for that alone. The ceiling's is generous, because
 * this suite runs on a host shared with other work and an event loop can be kept from a finished timer
 * for far longer than the delay itself; a tight ceiling there would report a loaded machine as a defect.
 * What the generous ceiling still catches is a band set an order of magnitude off, which the floor alone
 * cannot.
 */
const LATENCY_FLOOR_MS = 150;
const LATENCY_CEILING_MS = 400;
const FLOOR_TOLERANCE_MS = 25;
const CEILING_TOLERANCE_MS = 600;

/**
 * How many approval requests one case issues in the same turn.
 *
 * The case's own input rather than a figure of the demonstration: it is chosen only so that the
 * adapter receives several audited writes together, which is the overlap a queued append has to hold.
 */
const CONCURRENT_REQUESTS = 8;

/** The form every event hash takes: lowercase hex SHA-256, character for character. */
const EVENT_HASH_PATTERN = /^[0-9a-f]{64}$/;

/** The form a policy identifier takes, so a denial names a rule rather than free text. */
const POLICY_ID_PATTERN = /^POL-\d{3}$/;

/** How much leading body text a redaction check looks for in a serialised refusal. */
const BODY_EXCERPT_LENGTH = 40;

/**
 * The budget one case gets.
 *
 * The adapter's latency ladder is why it is stated at all: every call takes 150 to 400 ms by design,
 * and the longest case here makes a dozen calls while resolving its subject, so the runner's default
 * budget would report a working adapter as a slow one. It is a ceiling and not an expectation — a
 * passing case settles well inside it.
 */
const CASE_TIMEOUT_MS = 30_000;

/* ---------------------------------------------------------------------------------------------
 * Helpers — one fresh session per case, and the readings each case needs
 * ------------------------------------------------------------------------------------------- */

/**
 * A session whose bootstrap has resolved, which every case starts from.
 *
 * Each call builds an independent state over a fresh clone of the seeded records and hashes that
 * clone's trail, so no case can see another's writes and the modules under `src/seed/` are never
 * touched.
 *
 * @returns The ready adapter.
 */
async function readyBackend(): Promise<MockBackend> {
  const backend = new MockBackend();

  await backend.whenReady();

  return backend;
}

/**
 * Whether a caught value is the typed failure the port throws.
 *
 * A guard rather than a cast: a case that caught something else — a bug in a handler, a rejected
 * promise — fails on the message below instead of being reported as a refusal it never was.
 *
 * @param value - What the call threw.
 * @returns `true` when the value is a `Problem`.
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

  throw new Error('The call was expected to be refused and resolved instead.');
}

/**
 * Acts as one of the seeded personas, as the role switcher does.
 *
 * @param backend - The session to switch.
 * @param userId - The persona to act as.
 * @returns The persona the session now acts as, with its scope and its permissions.
 */
async function actAs(backend: MockBackend, userId: UserId): Promise<ActiveUser> {
  const switched = await backend.switchRole(userId);

  return switched.data;
}

/**
 * The first member of a collection the record set is expected to hold.
 *
 * @param values - The collection read.
 * @param what - What the collection holds, named in the failure message.
 * @returns The first member.
 * @throws Error - The collection is empty, so the case has no subject to work on.
 */
function firstOf<T>(values: readonly T[], what: string): T {
  const [first] = values;

  if (first === undefined) {
    throw new Error(`The seeded record set holds no ${what}, so the case cannot run.`);
  }

  return first;
}

/**
 * The exception queue as the acting persona sees it.
 *
 * @param backend - The session to read.
 * @returns The rows the persona may see.
 * @throws Error - The queue is empty, which would leave every case built on it without a subject.
 */
async function queueOf(backend: MockBackend): Promise<ExceptionRow[]> {
  const rows = (await backend.listExceptions({}, NO_SCOPE)).data;

  if (rows.length === 0) {
    throw new Error('The exception queue is empty, so the case cannot run.');
  }

  return rows;
}

/**
 * The products the queue rows name, in first-appearance order.
 *
 * The selection cases choose their subjects from this list rather than naming one, so no identifier of
 * the seeded record set is typed here (rule P-6) and every product the demonstration publishes is
 * exercised by the same case.
 *
 * @param rows - The queue as the acting persona sees it.
 * @returns The distinct product identifiers the rows name, in the order the rows state them.
 */
function productsOf(rows: readonly ExceptionRow[]): ProductId[] {
  const productIds: ProductId[] = [];

  for (const row of rows) {
    for (const productId of row.productIds) {
      if (!productIds.includes(productId)) {
        productIds.push(productId);
      }
    }
  }

  return productIds;
}

/**
 * Every node identifier a topology payload carries, across its four families.
 *
 * The narrowing a case asserts on is stated over the payload's own node set, which is what a lane
 * endpoint and a pin-count key are drawn against.
 *
 * @param topology - The canvas payload read.
 * @returns The identifiers of the plants, suppliers, origins and customers it holds.
 */
function nodeIdsOf(topology: Topology): string[] {
  return [
    ...topology.plants,
    ...topology.suppliers,
    ...topology.origins,
    ...topology.customers,
  ].map((node) => node.id);
}

/**
 * One source's freshness as a result's metadata reports it.
 *
 * Read through the overview's envelope, which is the same report a screen raises its stale banner
 * from, so a case compares the refusal's wording against the metadata rather than against a literal.
 *
 * @param backend - The session to read.
 * @param source - The source to report on.
 * @returns That source's freshness record.
 * @throws Error - The result carries no entry for the source.
 */
async function freshnessOf(backend: MockBackend, source: SourceId): Promise<Freshness> {
  const { freshness } = (await backend.getOverview(NO_SCOPE)).meta;
  const entry = freshness.find((candidate) => candidate.source === source);

  if (entry === undefined) {
    throw new Error(`The overview reports no freshness for ${source}, so the case cannot run.`);
  }

  return entry;
}

/**
 * One document classified customer-confidential, as a persona that may read it receives it.
 *
 * Found by searching the identifiers the port indexes and reading each hit, so the case names no
 * record identifier of its own. The opening persona holds `document.confidential.read`, which is what
 * gives the redaction case a body to look for.
 *
 * @param backend - The session to read.
 * @returns The released document body.
 * @throws Error - The record set holds no document with that classification.
 */
async function confidentialDocumentOf(backend: MockBackend): Promise<DocumentBody> {
  const hits = (await backend.searchIdentifiers(DOCUMENT_TERM, NO_SCOPE)).data;

  for (const hit of hits) {
    const releasedBody = (await backend.getDocument(hit.ref)).data;

    if (releasedBody.classification === CONFIDENTIAL_CLASSIFICATION) {
      return releasedBody;
    }
  }

  throw new Error(
    'The seeded documents hold none classified customer-confidential, so the case cannot run.',
  );
}

/**
 * The first option the records measure whose own constraint check reports a breach.
 *
 * Found through the port rather than by naming a record: every exception the acting persona may read
 * is asked for its option set, and the first option that states a failed check is returned with the
 * exception it belongs to. A seed that ships no breaching option fails the case on the message below
 * instead of asserting against a subject it never found.
 *
 * @param backend - The session to read.
 * @returns The exception the option belongs to and the option's identifier.
 * @throws Error - No option in scope reports a failed constraint check.
 */
async function firstFailedOptionOf(
  backend: MockBackend,
): Promise<{ readonly exceptionId: ExceptionId; readonly scenarioId: ScenarioId }> {
  for (const row of await queueOf(backend)) {
    const set = (await backend.getScenarioSet(row.id)).data;
    const failed = set.scenarios.find((option) => option.constraintCheck === 'fail');

    if (failed !== undefined) {
      return { exceptionId: row.id, scenarioId: failed.id };
    }
  }

  throw new Error('No option in scope reports a failed constraint check, so the case cannot run.');
}

/**
 * The business figures of one measured option, which a determinism check compares.
 *
 * The identity members are left out on purpose: a sandbox option's identifier and name describe the
 * request, while every member below is arithmetic the solver performed.
 *
 * @param scenario - The measured option.
 * @returns The measures, as a comparable record.
 */
function measuresOf(scenario: Scenario): Record<string, number> {
  return {
    unitsLate: scenario.unitsLate,
    maxDaysLate: scenario.maxDaysLate,
    ordersOnTime: scenario.ordersOnTime,
    ordersTotal: scenario.ordersTotal,
    addedCostEur: scenario.addedCostEur,
    lineIdleDays: scenario.lineIdleDays,
    revenueDelayedEur: scenario.revenueDelayedEur,
  };
}

/* ---------------------------------------------------------------------------------------------
 * 1. Bootstrap — the seeded trail is hashed before the first call answers
 * ------------------------------------------------------------------------------------------- */

describe('the bootstrap', () => {
  it('hashes every seeded event before the first call answers and verifies without a break', async () => {
    const backend = await readyBackend();

    // The trail is readable by a persona holding `audit.read`, and a role switch is itself an append,
    // so the trail below holds the seeded events plus the switch made here.
    await actAs(backend, AUDITOR);

    const trail = (await backend.listAuditEvents({})).data;

    expect(trail).toHaveLength(SEEDED_EVENT_COUNT + 1);

    for (const event of trail) {
      expect(event.eventHash).toMatch(EVENT_HASH_PATTERN);
    }

    const report = (await backend.verifyAuditChain()).data;

    expect(report.breaks).toEqual([]);
    expect(report.eventsChecked).toBe(trail.length);
  }, CASE_TIMEOUT_MS);

  it('resolves whenReady twice over one bootstrap and keeps what the session has written', async () => {
    const backend = await readyBackend();
    const target = firstOf(await queueOf(backend), 'exception row');
    const before = (await backend.getExceptionDetail(target.id)).data;

    await backend.noteException(target.id, NOTE_TEXT);

    const noted = (await backend.getExceptionDetail(target.id)).data;

    // A note is an audit event about the exception, and the exception's activity is the events about
    // it, so one append is one more activity record.
    expect(noted.activity).toHaveLength(before.activity.length + 1);

    await expect(backend.whenReady()).resolves.toBeUndefined();
    await expect(Promise.all([backend.whenReady(), backend.whenReady()])).resolves.toEqual([
      undefined,
      undefined,
    ]);

    // A second bootstrap would install a fresh clone of the seeded records and drop the note with it.
    const after = (await backend.getExceptionDetail(target.id)).data;

    expect(after.activity).toEqual(noted.activity);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 2. Latency — the band that keeps a loading state observable
 * ------------------------------------------------------------------------------------------- */

describe('the latency band', () => {
  it('holds a read and a write inside the 150 to 400 ms band the adapter schedules', async () => {
    const backend = await readyBackend();

    const readStartedAt = performance.now();
    const rows = (await backend.listExceptions({}, NO_SCOPE)).data;
    const readElapsed = performance.now() - readStartedAt;
    const target = firstOf(rows, 'exception row');

    const writeStartedAt = performance.now();

    await backend.noteException(target.id, NOTE_TEXT);

    const writeElapsed = performance.now() - writeStartedAt;

    expect(readElapsed).toBeGreaterThanOrEqual(LATENCY_FLOOR_MS - FLOOR_TOLERANCE_MS);
    expect(writeElapsed).toBeGreaterThanOrEqual(LATENCY_FLOOR_MS - FLOOR_TOLERANCE_MS);
    expect(readElapsed).toBeLessThan(LATENCY_CEILING_MS + CEILING_TOLERANCE_MS);
    expect(writeElapsed).toBeLessThan(LATENCY_CEILING_MS + CEILING_TOLERANCE_MS);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 3. The stale-source refusal — the service half of the freshness rule
 * ------------------------------------------------------------------------------------------- */

describe('the stale-source refusal', () => {
  it('refuses a request and a decision while the order book is stale, and records neither', async () => {
    const backend = await readyBackend();

    const lodged = (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data;
    const target = firstOf(lodged, 'pending approval');
    const approvalsBefore = (await backend.listApprovals({}, NO_SCOPE)).data;
    const approvalBefore = (await backend.getApproval(target.id)).data;
    const orderBookAsSeeded = await freshnessOf(backend, APPROVAL_GATE_SOURCE);

    await backend.setSimulation('stale', true);

    const orderBookAsReported = await freshnessOf(backend, APPROVAL_GATE_SOURCE);

    expect(orderBookAsReported.state).toBe('stale');
    // The report keeps the instant the records carry rather than recomputing one (contracts §1), so the
    // refusal below and the strip beside the disabled controls name one time.
    expect(orderBookAsReported.asOf).toBe(orderBookAsSeeded.asOf);

    // Refused with no control in the way: the call came straight at the adapter.
    const requestProblem = await refusalOf(() =>
      backend.requestApproval({ exceptionId: target.exceptionId, scenarioId: target.scenarioId }),
    );

    expect(requestProblem.type).toBe('validation');
    expect(requestProblem.message).toContain(SOURCE_LABELS[APPROVAL_GATE_SOURCE]);
    expect(requestProblem.message).toContain(orderBookAsSeeded.asOf);

    expect((await backend.listApprovals({}, NO_SCOPE)).data).toEqual(approvalsBefore);

    // A persona that may decide the plan meets the same refusal.
    await actAs(backend, PLANT_MANAGER);

    const decideProblem = await refusalOf(() =>
      backend.decideApproval(target.id, { action: 'approve', comment: DECISION_COMMENT }),
    );

    expect(decideProblem.type).toBe('validation');
    expect(decideProblem.message).toContain(SOURCE_LABELS[APPROVAL_GATE_SOURCE]);
    expect(decideProblem.message).toContain(orderBookAsSeeded.asOf);

    const approvalAfter = (await backend.getApproval(target.id)).data;

    expect(approvalAfter).toEqual(approvalBefore);
    expect(approvalAfter.writeBacks.every((step) => step.state === 'pending')).toBe(true);

    // Neither refusal appended an event, so the plan's record carries no decision.
    await actAs(backend, AUDITOR);

    const aboutApproval = (await backend.listAuditEvents({ objectRef: target.id })).data;

    expect(aboutApproval.some((event) => event.action === DECISION_ACTION)).toBe(false);

    // Clearing the trigger restores the operation, which is what makes the refusal a condition of the
    // source rather than a property of the record.
    await actAs(backend, PLANT_MANAGER);
    await backend.setSimulation('stale', false);

    const decided = (
      await backend.decideApproval(target.id, {
        action: 'approve',
        comment: DECISION_COMMENT,
      })
    ).data;

    expect(decided.status).toBe('approved');
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 4. Permission enforcement — in the adapter, not in a view
 * ------------------------------------------------------------------------------------------- */

describe('permission enforcement', () => {
  it('refuses a read the acting role lacks the permission for, and serves it to a role that holds it', async () => {
    const backend = await readyBackend();
    const externalEngineer = await actAs(backend, EXTERNAL_ENGINEER);
    const problem = await refusalOf(() => backend.getAtlas());

    expect(problem.type).toBe('permission');

    if (problem.requiredPermission === undefined || problem.rolesWithPermission === undefined) {
      throw new Error('A permission failure carries the permission and the roles that hold it.');
    }

    expect(PERMISSIONS).toContain(problem.requiredPermission);
    expect(problem.rolesWithPermission.length).toBeGreaterThan(0);
    expect(problem.rolesWithPermission).not.toContain(externalEngineer.role);

    // The same read is served to a persona the matrix grants it, and each series drawn from market
    // intelligence carries its label from the fixed vocabulary rather than a string the adapter wrote.
    await actAs(backend, PLANT_MANAGER);

    const atlas = (await backend.getAtlas()).data;
    const marketSeries = atlas.radarSeries.filter(
      (series) => series.provenance === 'market_intelligence',
    );

    expect(marketSeries.length).toBeGreaterThan(0);
    expect(marketSeries.every((series) => series.simLabel === SIM_LABELS[5])).toBe(true);
  }, CASE_TIMEOUT_MS);

  it("refuses a write to another plant's exception and names the roles that may act", async () => {
    const backend = await readyBackend();
    const queue = await queueOf(backend);
    const plantManager = await actAs(backend, PLANT_MANAGER);

    // The queue was read before the switch, so it still holds the rows the opening persona sees; the
    // first one outside the plant now narrowed to is the subject of the refusal.
    const outside = queue.find((row) => !plantManager.plantIds.includes(row.plantId));

    if (outside === undefined) {
      throw new Error('Every queued exception sits inside the plant narrowed to, so the case cannot run.');
    }

    const problem = await refusalOf(() => backend.assignException(outside.id, plantManager.id));

    expect(problem.type).toBe('permission');

    if (problem.requiredPermission === undefined || problem.rolesWithPermission === undefined) {
      throw new Error('A permission failure carries the permission and the roles that hold it.');
    }

    expect(PERMISSIONS).toContain(problem.requiredPermission);
    expect(problem.rolesWithPermission.length).toBeGreaterThan(0);
    // The matrix does grant the permission to this role, so the roles it names include the acting one:
    // what refused the call is the persona's plant scope rather than the role, and the reason says so by
    // naming the plant the record sits on.
    expect(problem.rolesWithPermission).toContain(plantManager.role);
    expect(problem.message).toContain(outside.plantId);

    // Nothing was written: the record is read back, by a persona whose scope reaches every plant.
    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const unchanged = (await backend.getExceptionDetail(outside.id)).data;

    expect(unchanged.exception.ownerId).toBe(outside.ownerId);
  }, CASE_TIMEOUT_MS);
});


/* ---------------------------------------------------------------------------------------------
 * 5. Policy enforcement — the rule, its reason, its alternative and the event it wrote
 * ------------------------------------------------------------------------------------------- */

describe('policy enforcement', () => {
  it('refuses a decision the segregation rule denies and points at the event the denial appended', async () => {
    const backend = await readyBackend();

    const lodged = (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data;
    const target = firstOf(lodged, 'pending approval');
    const approvalsBefore = (await backend.listApprovals({}, NO_SCOPE)).data;

    // The seeded pending plan was requested by the persona the session opens as, and a requester never
    // decides its own plan, so that persona's attempt meets the rule.
    const problem = await refusalOf(() =>
      backend.decideApproval(target.id, { action: 'approve', comment: DECISION_COMMENT }),
    );

    expect(problem.type).toBe('policy');
    expect(problem.policyId).toMatch(POLICY_ID_PATTERN);
    expect(problem.message.trim().length).toBeGreaterThan(0);

    if (problem.policyId === undefined || problem.auditEventId === undefined) {
      throw new Error('A policy failure carries the rule that denied the call and the event it wrote.');
    }

    const rule = problem.policyId;
    const recorded = problem.auditEventId;

    // The rule that denied this decision permits no alternative, so the member is absent; the next case
    // covers a rule that names one.
    expect(problem.permittedAlternative).toBeUndefined();

    // The approval is exactly as it stood, and no step of the change ran.
    const unchanged = (await backend.getApproval(target.id)).data;

    expect((await backend.listApprovals({}, NO_SCOPE)).data).toEqual(approvalsBefore);
    expect(unchanged.status).toBe(target.status);
    expect(unchanged.writeBacks.every((step) => step.state === 'pending')).toBe(true);

    // The event the failure names exists, and the engine is its actor.
    await actAs(backend, AUDITOR);

    const aboutApproval = (await backend.listAuditEvents({ objectRef: target.id })).data;
    const appended = aboutApproval.find((event) => event.id === recorded);

    expect(appended?.actorType).toBe('policy');
    expect(appended?.actorId).toBe(rule);
    expect(appended?.policyId).toBe(rule);
  }, CASE_TIMEOUT_MS);

  it('refuses a question to the external model over classified context and names the permitted alternative', async () => {
    const backend = await readyBackend();
    const catalogue = (await backend.getModelCatalogue()).data;
    const external = firstOf(
      catalogue.models.filter((entry) => entry.boundary === 'external'),
      'external model entry',
    );
    const confidential = await confidentialDocumentOf(backend);

    const problem = await refusalOf(() =>
      backend.askAssistant({
        question: UNSEEDED_QUESTION,
        modelId: external.id,
        contextRefs: [confidential.id],
      }),
    );

    expect(problem.type).toBe('policy');
    expect(problem.policyId).toMatch(POLICY_ID_PATTERN);
    expect(problem.message.trim().length).toBeGreaterThan(0);
    // The document the helper resolves is DOC-0031, which is classified customer-confidential and
    // carries eu-only residency, so both blocking conditions are present — and AAP 0.6.3 and AAP
    // 0.12.4 put both of them, and the DOC-0031 block card, under POL-007.
    expect(confidential.id).toBe('DOC-0031');
    expect(problem.policyId).toBe('POL-007');

    if (
      problem.policyId === undefined ||
      problem.permittedAlternative === undefined ||
      problem.auditEventId === undefined
    ) {
      throw new Error(
        'A policy that names an alternative carries it, with the rule and the event, on the failure.',
      );
    }

    const rule = problem.policyId;
    const alternative = problem.permittedAlternative;
    const recorded = problem.auditEventId;

    // The alternative is an entry of the catalogue the selector offers, inside the declared boundary.
    expect(
      catalogue.models.some((entry) => entry.id === alternative && entry.boundary === 'in-boundary'),
    ).toBe(true);

    await actAs(backend, AUDITOR);

    const aboutModel = (await backend.listAuditEvents({ objectRef: external.id })).data;
    const appended = aboutModel.find((event) => event.id === recorded);

    expect(appended?.actorType).toBe('policy');
    expect(appended?.policyId).toBe(rule);
  }, CASE_TIMEOUT_MS);

  it('refuses a request for an option whose constraint check fails and points at the event it appended', async () => {
    const backend = await readyBackend();

    // The option is found through the port rather than named: the queue as a persona holding
    // `approval.request` across every plant, then the first option whose own check reports a breach.
    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const failed = await firstFailedOptionOf(backend);
    const approvalsBefore = (await backend.listApprovals({}, NO_SCOPE)).data;

    const problem = await refusalOf(() =>
      backend.requestApproval({ exceptionId: failed.exceptionId, scenarioId: failed.scenarioId }),
    );

    // POL-005 owns the gate — the rule src/seed/policies.ts records and AAP F7 evaluates — so the
    // refusal is a policy block naming it, with the solver's breach stated in the message.
    expect(problem.type).toBe('policy');
    expect(problem.policyId).toBe('POL-005');
    expect(problem.message.trim().length).toBeGreaterThan(0);
    // The rule names no alternative, so the member is absent rather than filled with one.
    expect(problem.permittedAlternative).toBeUndefined();

    if (problem.auditEventId === undefined) {
      throw new Error('A policy failure carries the event it wrote.');
    }

    // Nothing was written: no approval exists for the refused request.
    expect((await backend.listApprovals({}, NO_SCOPE)).data).toEqual(approvalsBefore);

    // The event the failure names exists, records the policy as its actor, and is about the exception
    // the request was made against, since no approval record was created for it to point at.
    await actAs(backend, AUDITOR);

    const aboutException = (await backend.listAuditEvents({ objectRef: failed.exceptionId })).data;
    const appended = aboutException.find((event) => event.id === problem.auditEventId);

    expect(appended?.actorType).toBe('policy');
    expect(appended?.policyId).toBe('POL-005');
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 6. Message redaction — applied before a record crosses the boundary
 * ------------------------------------------------------------------------------------------- */

describe('message redaction', () => {
  it('withholds a confidential body from a role that may not read it, before it leaves the service', async () => {
    const backend = await readyBackend();
    const released = await confidentialDocumentOf(backend);

    expect(released.body.length).toBeGreaterThan(0);

    await actAs(backend, ADMINISTRATOR);

    const problem = await refusalOf(() => backend.getDocument(released.id));

    expect(problem.type).toBe('permission');

    if (problem.requiredPermission === undefined) {
      throw new Error('A permission failure carries the permission the role lacks.');
    }

    expect(PERMISSIONS).toContain(problem.requiredPermission);

    // The whole failure is serialised, so a body leaked anywhere in the object graph fails this case
    // rather than only one the message happens to print.
    const serialised = JSON.stringify(problem);

    expect(serialised).not.toContain(released.body);
    expect(serialised).not.toContain(released.body.slice(0, BODY_EXCERPT_LENGTH));
  }, CASE_TIMEOUT_MS);

  it("narrows the external engineer's evidence pins to its own vendor's records", async () => {
    const backend = await readyBackend();

    await actAs(backend, EXTERNAL_ENGINEER);

    const externalPins = (await backend.listPins()).data;

    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const everyPin = (await backend.listPins()).data;
    const widerIds = new Set(everyPin.map((pin) => pin.id));

    expect(everyPin.length).toBeGreaterThan(externalPins.length);
    expect(externalPins.every((pin) => widerIds.has(pin.id))).toBe(true);

    // The plant, origin and customer pins the wider read releases carry no vendor at all, so a read
    // that lost the vendor narrowing would return them here and fail this line. The persona's own
    // vendor set is resolved by the adapter from the exceptions it owns, and this record set names
    // none for it, so the vendor-scoped read releases nothing rather than another vendor's records.
    expect(externalPins.every((pin) => pin.vendorId !== undefined)).toBe(true);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 7. The audit append — one event per write, none per read
 * ------------------------------------------------------------------------------------------- */

describe('the audit append', () => {
  it('appends one event per write, linked to its predecessor and stamped with the demonstration clock', async () => {
    const backend = await readyBackend();
    const target = firstOf(await queueOf(backend), 'exception row');

    // The session's first append, so the chain's next position and the constant instant are both known
    // without reading the trail first.
    await backend.noteException(target.id, NOTE_TEXT);

    // The trail is readable by a persona holding `audit.read`.
    await actAs(backend, AUDITOR);

    const trail = (await backend.listAuditEvents({})).data;
    const appended = trail.filter(
      (event) => event.objectRef === target.id && event.action === NOTE_ACTION,
    );

    expect(appended).toHaveLength(1);

    const note = firstOf(appended, `event recording a ${NOTE_ACTION} on ${target.id}`);

    expect(note.sequence).toBe(SEEDED_EVENT_COUNT + 1);
    expect(note.timestamp).toBe(DEMO_CLOCK);
    expect(note.actorType).toBe('user');

    const predecessor = trail.find((event) => event.sequence === note.sequence - 1);

    if (predecessor === undefined) {
      throw new Error('The chain holds no event before the one this write appended.');
    }

    expect(note.previousHash).toBe(predecessor.eventHash);
  }, CASE_TIMEOUT_MS);

  it('appends nothing for a read, including a read that is refused', async () => {
    const backend = await readyBackend();
    const target = firstOf(await queueOf(backend), 'exception row');

    await backend.getOverview(NO_SCOPE);
    await backend.listApprovals({}, NO_SCOPE);
    await backend.getModelCatalogue();
    await backend.getExceptionDetail(target.id);

    // The opening persona does not hold `sovereignty.read`, so this read is refused — and a refusal
    // records nothing either.
    const refused = await refusalOf(() => backend.getSovereigntyStatus());

    expect(refused.type).toBe('permission');

    await actAs(backend, AUDITOR);

    const trail = (await backend.listAuditEvents({})).data;

    // The seeded trail plus one event, and that one is the role switch above: the four reads, one of
    // them refused, appended nothing. The seeded trail carries switches of its own inside its 200
    // events, so the event appended here is selected by position rather than by its action.
    expect(trail).toHaveLength(SEEDED_EVENT_COUNT + 1);

    const appended = trail.filter((event) => event.sequence > SEEDED_EVENT_COUNT);

    expect(appended).toHaveLength(1);

    const switched = firstOf(appended, 'event appended since the bootstrap');

    expect(switched.action).toBe(ROLE_SWITCH_ACTION);
    expect(switched.objectRef).toBe(AUDITOR);
  }, CASE_TIMEOUT_MS);

  it('keeps every sequence distinct and contiguous when two audited writes are issued together', async () => {
    const backend = await readyBackend();
    const queue = await queueOf(backend);
    const first = firstOf(queue, 'exception row');
    const second = firstOf(
      queue.filter((row) => row.id !== first.id),
      'second exception row to write to',
    );

    // Issued together and through the port. The adapter's latency ladder gives two calls started
    // together the same delay, so both handlers reach their append at the same moment: an append that
    // read the chain's length and its predecessor without a queue would claim one position twice.
    await Promise.all([
      backend.noteException(first.id, NOTE_TEXT),
      backend.noteException(second.id, NOTE_TEXT),
    ]);

    await actAs(backend, AUDITOR);

    const trail = (await backend.listAuditEvents({ sort: 'sequence:asc' })).data;
    const sequences = trail.map((event) => event.sequence);

    // The seeded trail, the two notes and the role switch: two writes issued together still append
    // exactly one event each, and the queue puts them after each other rather than beside each other,
    // so no sequence is claimed twice and none is missing.
    expect(trail).toHaveLength(SEEDED_EVENT_COUNT + 3);
    expect(new Set(sequences).size).toBe(sequences.length);
    expect(sequences).toEqual(sequences.map((_, index) => index + 1));

    const report = (await backend.verifyAuditChain()).data;

    expect(report.breaks).toEqual([]);
    expect(report.eventsChecked).toBe(trail.length);
  }, CASE_TIMEOUT_MS);

  it('keeps every approval record when several requests are issued together, and the chain whole', async () => {
    const backend = await readyBackend();
    const lodged = (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data;
    const target = firstOf(lodged, 'pending approval');
    const before = (await backend.listApprovals({}, NO_SCOPE)).data;

    // Several requests for one plan in the same turn, as a planner retrying a slow one does. Each call
    // reads the records, installs a record of its own and appends the event about it, which is where
    // an unserialised append would make two events claim one position.
    const requests = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      backend.requestApproval({ exceptionId: target.exceptionId, scenarioId: target.scenarioId }),
    );

    const outcomes = await Promise.all(requests);
    const requested = outcomes.map((outcome) => outcome.data.id);
    const after = (await backend.listApprovals({}, NO_SCOPE)).data;
    const ids = after.map((approval) => approval.id);

    // Every request resolved with a record of its own, and one record was installed per request.
    expect(requested).toHaveLength(CONCURRENT_REQUESTS);
    expect(new Set(requested).size).toBe(requested.length);
    expect(after).toHaveLength(before.length + CONCURRENT_REQUESTS);
    expect(new Set(ids).size).toBe(ids.length);

    await actAs(backend, AUDITOR);

    const report = (await backend.verifyAuditChain()).data;

    expect(report.breaks).toEqual([]);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 8. The reset — the seeded state back, with no trigger left set
 * ------------------------------------------------------------------------------------------- */

describe('the reset', () => {
  it('puts the session back to the seeded state after writes, a tamper and a role switch', async () => {
    const pristine = await readyBackend();
    const used = await readyBackend();
    const target = firstOf(await queueOf(used), 'exception row');

    await used.noteException(target.id, NOTE_TEXT);
    await used.assignException(target.id, PLANT_MANAGER);
    await used.setSimulation('stale', true);
    await used.setSimulation('empty-queue', true);
    await used.setSimulation('tampered-audit', true);
    await actAs(used, HEAD_OF_SUPPLY_CHAIN);

    await used.resetDemo();

    // Both sessions now act as the persona a first visit does, so their readings are comparable: the
    // queues agree only if the reset restored that persona along with the records.
    const resetQueue = (await used.listExceptions({}, NO_SCOPE)).data;
    const pristineQueue = (await pristine.listExceptions({}, NO_SCOPE)).data;
    const resetOverview = (await used.getOverview(NO_SCOPE)).data;
    const pristineOverview = (await pristine.getOverview(NO_SCOPE)).data;
    const resetApprovals = (await used.listApprovals({}, NO_SCOPE)).data;
    const pristineApprovals = (await pristine.listApprovals({}, NO_SCOPE)).data;

    expect(resetQueue).toEqual(pristineQueue);
    expect(resetOverview).toEqual(pristineOverview);
    expect(resetApprovals).toEqual(pristineApprovals);
    // No trigger survived: the freshness reported is the seeded catalogue's own again.
    expect((await used.getOverview(NO_SCOPE)).meta.freshness).toEqual(
      (await pristine.getOverview(NO_SCOPE)).meta.freshness,
    );

    await actAs(used, AUDITOR);
    await actAs(pristine, AUDITOR);

    const resetReport = (await used.verifyAuditChain()).data;
    const pristineReport = (await pristine.verifyAuditChain()).data;

    expect(resetReport.breaks).toEqual([]);
    expect(resetReport.eventsChecked).toBe(pristineReport.eventsChecked);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 9. The tamper control — one reported break, no hash rewritten
 * ------------------------------------------------------------------------------------------- */

describe('the tamper control', () => {
  it('reports exactly one break at the edited event and leaves every stored hash as it stood', async () => {
    const backend = await readyBackend();

    await actAs(backend, AUDITOR);

    const before = (await backend.listAuditEvents({})).data;
    const hashesBefore = before.map((event) => ({
      id: event.id,
      eventHash: event.eventHash,
      previousHash: event.previousHash,
    }));
    const clean = (await backend.verifyAuditChain()).data;

    expect(clean.breaks).toEqual([]);

    await backend.setSimulation('tampered-audit', true);

    const after = (await backend.listAuditEvents({})).data;

    // Nothing was re-hashed, re-sequenced or repaired: only the recorded result of the one addressed
    // event differs, which is what a verification then reports.
    expect(
      after.map((event) => ({
        id: event.id,
        eventHash: event.eventHash,
        previousHash: event.previousHash,
      })),
    ).toEqual(hashesBefore);
    expect(after).toHaveLength(before.length);

    const edited = after.find((event) => event.id === TAMPER_TARGET_ID);
    const original = before.find((event) => event.id === TAMPER_TARGET_ID);

    if (edited === undefined || original === undefined) {
      throw new Error('The chain holds no event with the identifier the tamper control addresses.');
    }

    expect(edited.result).not.toBe(original.result);

    const report = (await backend.verifyAuditChain()).data;

    expect(report.breaks).toHaveLength(1);
    expect(report.breaks[0]?.id).toBe(TAMPER_TARGET_ID);
    expect(report.breaks[0]?.sequence).toBe(original.sequence);
    expect(report.eventsChecked).toBe(after.length);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 10. The assistant — cited answers, and the notice for a question outside the six
 * ------------------------------------------------------------------------------------------- */

describe('the assistant', () => {
  it("answers a seeded question with citations whose figures are the solver's own", async () => {
    const backend = await readyBackend();
    const catalogue = (await backend.getModelCatalogue()).data;
    const queue = await queueOf(backend);

    const answer = (
      await backend.askAssistant({
        question: SEEDED_QUESTION,
        modelId: catalogue.defaultModelId,
        contextRefs: [],
      })
    ).data;

    expect(answer.text).not.toBe(UNSCRIPTED_NOTICE);
    expect(answer.modelId).toBe(catalogue.defaultModelId);
    expect(answer.partial).toBe(false);
    expect(answer.citations.length).toBeGreaterThan(0);
    expect(answer.citations.some((citation) => citation.ref === BASELINE_CASE_ID)).toBe(true);

    for (const citation of answer.citations) {
      expect(SOURCE_IDS).toContain(citation.source);
    }

    // The exception the answer cites is the one whose measurement its figures come from, so the same
    // levers put through the adapter return the numbers the answer reports.
    const cited = answer.citations.find((citation) => queue.some((row) => row.id === citation.ref));

    if (cited === undefined) {
      throw new Error('The answer cites no exception, so its figures cannot be cross-checked.');
    }

    const measured = (await backend.solveScenario(cited.ref, NO_ACTION_LEVERS)).data;
    const citedOrders = answer.citations.filter((citation) =>
      measured.orders.some((order) => order.orderId === citation.ref),
    );

    expect(citedOrders.length).toBeGreaterThan(0);

    for (const citation of citedOrders) {
      const order = measured.orders.find((candidate) => candidate.orderId === citation.ref);

      if (order === undefined) {
        throw new Error(`The measurement holds no row for ${citation.ref}.`);
      }

      expect(answer.text).toContain(citation.ref);
      expect(answer.text).toContain(String(order.unitsLate));
    }
  }, CASE_TIMEOUT_MS);

  it('returns the seeded notice for a question outside the six, with no citations', async () => {
    const backend = await readyBackend();
    const catalogue = (await backend.getModelCatalogue()).data;

    const answer = (
      await backend.askAssistant({
        question: UNSEEDED_QUESTION,
        modelId: catalogue.defaultModelId,
        contextRefs: [],
      })
    ).data;

    expect(answer.text).toBe(UNSCRIPTED_NOTICE);
    expect(answer.citations).toEqual([]);
    expect(answer.partial).toBe(true);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 11. Determinism — the same call twice returns the same business figures
 * ------------------------------------------------------------------------------------------- */

describe('determinism', () => {
  it('returns the same data for the same read twice', async () => {
    const backend = await readyBackend();
    const target = firstOf(await queueOf(backend), 'exception row');

    const firstOverview = (await backend.getOverview(NO_SCOPE)).data;
    const secondOverview = (await backend.getOverview(NO_SCOPE)).data;
    const firstDetail = (await backend.getExceptionDetail(target.id)).data;
    const secondDetail = (await backend.getExceptionDetail(target.id)).data;
    const firstQueue = (await backend.listExceptions({}, NO_SCOPE)).data;
    const secondQueue = (await backend.listExceptions({}, NO_SCOPE)).data;

    expect(secondOverview).toEqual(firstOverview);
    expect(secondDetail).toEqual(firstDetail);
    expect(secondQueue).toEqual(firstQueue);
  }, CASE_TIMEOUT_MS);

  it('measures the same levers to the same figures twice', async () => {
    const backend = await readyBackend();
    const lodged = (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data;
    const subject = firstOf(lodged, 'pending approval').exceptionId;

    const first = (await backend.solveScenario(subject, NO_ACTION_LEVERS)).data;
    const second = (await backend.solveScenario(subject, NO_ACTION_LEVERS)).data;

    expect(second.id).toBe(first.id);
    expect(measuresOf(second)).toEqual(measuresOf(first));
    expect(second.dailyClosingStock).toEqual(first.dailyClosingStock);
    expect(second.orders).toEqual(first.orders);
    expect(second.sideEffects).toEqual(first.sideEffects);
    expect(second.writeBacks).toEqual(first.writeBacks);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 12. The shell's selection — one resolver, applied to every read it narrows
 * ------------------------------------------------------------------------------------------- */

describe("the shell's selection", () => {
  it('narrows the queue and the overview to every product the top bar can name', async () => {
    const backend = await readyBackend();
    const unrestrictedRows = await queueOf(backend);
    const unrestrictedOverview = (await backend.getOverview(NO_SCOPE)).data;
    const productIds = productsOf(unrestrictedRows);

    // The case narrows by each product in turn, which needs more than one to be a narrowing at all.
    expect(productIds.length).toBeGreaterThan(1);

    for (const productId of productIds) {
      const scope: Scope = { plants: [], products: [productId] };
      const rows = (await backend.listExceptions({}, scope)).data;
      const overview = (await backend.getOverview(scope)).data;

      // The product reaches the family read: every row names it, and the selection drops the rest.
      expect(rows.length, `the queue holds no row for ${productId}`).toBeGreaterThan(0);
      expect(rows.length).toBeLessThan(unrestrictedRows.length);

      for (const row of rows) {
        expect(row.productIds, `${row.id} is outside the ${productId} selection`).toContain(
          productId,
        );
      }

      // The tile counts the rows the queue lists under the same selection, and it shrinks with them.
      const openRows = rows.filter((row) => row.status === OPEN_STATUS);

      expect(overview.openExceptions).toBe(openRows.length);
      expect(overview.openExceptions).toBeLessThan(unrestrictedOverview.openExceptions);
    }
  }, CASE_TIMEOUT_MS);

  it('narrows the canvas network to every plant the top bar can name', async () => {
    const backend = await readyBackend();
    const network = (await backend.getTopology(NO_SCOPE)).data;
    const plantIds = network.plants.map((node) => node.id);

    // One plant per node the unrestricted read returns, and a network wide enough to see it narrow.
    expect(plantIds.length).toBeGreaterThan(1);
    expect(network.lanes.length).toBeGreaterThan(0);

    // A customer no lane reaches is one the records place at no plant, so no plant may drop it: its
    // node carries seeded pin counts that a narrower payload would otherwise strand.
    const laneLessCustomers = network.customers
      .filter(
        (node) =>
          !network.lanes.some((lane) => lane.fromId === node.id || lane.toId === node.id),
      )
      .map((node) => node.id);

    expect(laneLessCustomers.length).toBeGreaterThan(0);

    for (const plantId of plantIds) {
      const narrowed = (await backend.getTopology({ plants: [plantId], products: [] })).data;
      const nodeIds = nodeIdsOf(narrowed);
      const otherPlantIds = plantIds.filter((candidate) => candidate !== plantId);

      // The plant family is exactly the selection, and the network is narrower than the whole.
      expect(narrowed.plants.map((node) => node.id)).toEqual([plantId]);
      expect(narrowed.lanes.length).toBeLessThan(network.lanes.length);

      // No lane points at a node the payload dropped, and no badge outlives its node.
      for (const lane of narrowed.lanes) {
        expect(nodeIds, `the lane from ${lane.fromId} leaves the payload`).toContain(lane.fromId);
        expect(nodeIds, `the lane to ${lane.toId} leaves the payload`).toContain(lane.toId);
        expect(otherPlantIds, `a lane reaches ${lane.toId}, which the selection excludes`).not.toContain(
          lane.toId,
        );
      }

      for (const nodeId of Object.keys(narrowed.pinsByNode)) {
        expect(nodeIds, `the pin count for ${nodeId} outlives its node`).toContain(nodeId);
      }

      // The selected plant is still fed, so the narrowing narrowed rather than emptied the network.
      expect(narrowed.lanes.some((lane) => lane.toId === plantId)).toBe(true);

      for (const customerId of laneLessCustomers) {
        expect(nodeIds, `the lane-less customer ${customerId} was dropped`).toContain(customerId);
      }
    }
  }, CASE_TIMEOUT_MS);
});

