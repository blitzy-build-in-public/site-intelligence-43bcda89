// @vitest-environment node

/**
 * What the in-browser mock adapter does, driven only through the port it implements.
 *
 * `src/services/service-conformance.test.ts` proves the shape of both adapters; this suite proves the
 * behaviour of `MockBackend`, because the duties rule P-2 loads onto the service have nowhere else to
 * be observed. The cases are grouped one `describe` per duty:
 *
/* ---------------------------------------------------------------------------------------------
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
 * 12. the comparison option set of the case measured at call time: its four measured columns, the
 *     recommendation, the rejected alternate and the trade-off its figures fill;
 * 13. the loading trigger, which leaves every served call pending while the controls that lift it still
 *     answer;
 * 14. the empty trigger, which empties every collection a read returns rather than the queue alone.
 * 15. the shell's selection: the plant and product the top bar names, resolved once and applied to every
 *     read it narrows.
 * 16. the port's remaining reads: the canvas ribbon, one audit event, the outcome card, the write-back
 *     retry and the assistant's suggestions, each reached through the port rather than through a
 *     handler;
 * 17. the browser-built exports, which resolve a download payload whose document equals the one the
 *     shared composition produces from the same reads, and which refuse the pack to a persona that may
 *     not read the audit trail;
 * 18. the list parameters the four collection reads carry, where `limit` bounds the page, `cursor`
 *     continues from the position a previous page ended at, and `sort` orders the records by the
 *     member it names in both directions.
 * 19. the policy exception request: the pending record SCR-07's grant flow writes, readable back
 *     through the policy detail it names, the reset that clears it, and the reads that append nothing.
 *
 * WHY THE NODE ENVIRONMENT, MANDATORY ON THE FIRST LINE ABOVE. The bootstrap hashes the 200 seeded
 * events through `crypto.subtle.digest`, which is a platform call rather than a DOM one: under
 * Vitest's jsdom default `globalThis.crypto` and `window.crypto` are already the platform's Web
 * Crypto — the object `node:crypto.webcrypto` exports — so jsdom contributes no `SubtleCrypto` and
 * the call resolves either way, while the declaration states the environment this suite means to
 * use. No DOM matcher appears below, because nothing here renders.
 *
 * WHAT THE SUITE DELIBERATELY DOES NOT DO.
 * - It imports no expected-results fixture (`tests/fixtures/`). Those belong to the solver and
 *   aggregation suites, and this suite asserts invariants and cross-checks the adapter against the
 *   domain modules' own output instead (rule P-6).
 * - It imports no module under `src/seed/`. The records, the seeded trail length, the tamper target
 *   and the assistant's fixed notice arrive as the constants `./seed-loader.ts` re-exports (rule P-2).
 * - It retypes no simulation label: where a label reaches an assertion it is compared against
 *   `SIM_LABELS` from `src/types` (rule P-1).
 * - It uses no test hook. Every call goes through a member of the port plus the three members the
 *   adapter adds — `whenReady()`, `switchRole()` and `getActiveUser()` — and the demonstration control
 *   `setSimulation()` the popover drives. No private field is read, no global is set and no query
 *   parameter is consulted, so the behaviour asserted is the behaviour a screen meets.
 * - It names no real company, customer, carmaker or cloud product, and carries no credential-shaped
 *   text, so the scans that cover `src/**` find nothing new here (rules P-7 and B-2).
 */

import { describe, expect, it } from 'vitest';

import type {
  ActiveUser,
  DocumentBody,
  EvidencePin,
  ExceptionId,
  ExceptionRow,
  ExceptionStatus,
  Freshness,
  LedgerRow,
  Levers,
  ListQuery,
  PolicyDetail,
  PolicyException,
  PolicyId,
  PpapPackage,
  Problem,
  ProductId,
  Result,
  RibbonTile,
  Scenario,
  ScenarioId,
  Scope,
  SolverResult,
  SourceId,
  Timestamp,
  Topology,
  UserId,
} from '../../types';
import { DEMO_CLOCK, PERMISSIONS, SIM_LABELS, SOURCE_IDS, SOURCE_LABELS } from '../../types';
import { buildChokepointBrief } from '../exports/chokepoint-brief';
import { buildEvidencePack } from '../exports/evidence-pack';
import { buildScenarioComparisonCsv } from '../exports/scenario-csv';
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
const WRITE_BACK_ACTION = 'simulated write-back';

/**
 * How many questions the assistant panel offers, and therefore how many the assistant answers from
 * its script.
 *
 * The plan fixes six scripted answers (AAP 0.2.1's "six scripted assistant answers", AAP 0.8), and
 * `src/seed/` holds the six prompts; the run re-exports no constant for the count, so it is stated
 * here beside the other record facts this suite reads rather than counted from the seed (rule P-2).
 */
const SCRIPTED_QUESTION_COUNT = 6;

/** The two members a suggestion publishes, and the only two the panel may read (rule P-6). */
const SUGGESTION_MEMBERS = 'id,prompt';

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
 * - `ADMINISTRATOR` lacks `document.confidential.read`, which is the redaction under test, and holds
 *   `policy.exception.request` with `policy.read` and `audit.read` beside it, which are the write the
 *   governance case drives and the two reads it answers with.
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

/** The reason one time-boxed policy exception request carries, in a planner's own words. */
const POLICY_EXCEPTION_REASON =
  'The delayed air sets need a one-week deviation from the sourcing policy while the transfer lands.';

/**
 * The reason a second request against the same policy carries, which is what lets the case tell the
 * two apart in the pending list: the record carries no requested-at member.
 */
const SECOND_POLICY_EXCEPTION_REASON =
  'The following week needs the same deviation while the alternate supplier is onboarded.';

/** The demonstration clock's own date one year on, which is the expiry's date token. */
const LATER_DATE = `${Number(DEMO_CLOCK.slice(0, 4)) + 1}${DEMO_CLOCK.slice(4, 10)}`;

/**
 * The expiry a request carries: `LATER_DATE` at midnight, in the offset the constant states.
 *
 * The flow refuses an expiry that does not fall after the demonstration clock (AAP 0.12.4), and the
 * contract's instants are ISO 8601 in Europe/Berlin with the offset `DEMO_CLOCK` carries (§1), so the
 * date and the offset are both read from that constant rather than typed into the case (rule P-6).
 */
const EXCEPTION_EXPIRY: Timestamp = `${LATER_DATE}T00:00:00${DEMO_CLOCK.slice(-6)}`;

/**
 * The first of the six seeded suggestions, character for character.
 *
 * The adapter matches a question against a seeded prompt exactly, so the case submits a prompt the
 * assistant panel offers, read from the list the port publishes; its figures are filled in by the
 * adapter, which is what the case cross-checks against the solver.
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

/**
 * How long a call held by the loading trigger is given before a case concludes that it never settles.
 *
 * The probe has to outlast the top of the latency band by a wide margin, because the adapter waits that
 * band before it holds a call: a probe at the band's ceiling would report a loaded host as a held call.
 * 900 ms leaves room for a busy machine and still fails an adapter that answers instead of holding.
 */
const HOLD_PROBE_MS = 900;

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
 * Whether a call settles inside the given budget.
 *
 * Awaiting a call the loading trigger holds would hang the case, so a case races it against a real
 * timer instead and asserts which of the two came first. The call's own outcome is swallowed on
 * purpose: a resolution and a refusal both count as settled, and a case that cares which one it was
 * reads the result or expects the refusal itself.
 *
 * @param run - The call to race.
 * @param milliseconds - How long the call is given.
 * @returns `true` when the call settled first, `false` when the timer did.
 */
async function settlesWithin(run: Promise<unknown>, milliseconds: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => {
      resolve(false);
    }, milliseconds);
  });

  try {
    return await Promise.race([run.then(() => true, () => true), expired]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
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
 * request, while every member below is arithmetic the solver performed. The parameter accepts the
 * solver's own result as well as a scenario, because the outcome card's two sides are that result
 * rather than a scenario the adapter assembled.
 *
 * @param scenario - The measured option, or one side of the outcome card.
 * @returns The measures, as a comparable record.
 */
function measuresOf(scenario: Scenario | SolverResult): Record<string, number> {
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

/**
 * One ribbon tile's value, read by its aggregate key.
 *
 * The key is what the ribbon contract carries rather than the tile's position, so a case that reads a
 * tile this way proves the key a consumer addresses a tile by is present as well as the value.
 *
 * @param tiles - The tiles the ribbon read returned.
 * @param id - The aggregate key to read.
 * @returns That tile's value.
 * @throws Error - The ribbon carries no tile under that key.
 */
function tileValueOf(tiles: readonly RibbonTile[], id: string): number {
  const tile = tiles.find((candidate) => candidate.id === id);

  if (tile === undefined) {
    throw new Error(`The canvas ribbon carries no ${id} tile, so the case cannot run.`);
  }

  return tile.value;
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

    const externalPins = (await backend.listPins({})).data;

    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const everyPin = (await backend.listPins({})).data;
    const widerIds = new Set(everyPin.map((pin) => pin.id));

    expect(everyPin.length).toBeGreaterThan(externalPins.length);
    expect(externalPins.every((pin) => widerIds.has(pin.id))).toBe(true);

    // The plant, origin and customer pins the wider read releases carry no vendor at all, so a read
    // that lost the vendor narrowing would return them here and fail this line.
    expect(externalPins.every((pin) => pin.vendorId !== undefined)).toBe(true);

    // The positive half of the same redaction: the external engineer is released exactly its own
    // vendor's evidence, so the read is not narrowed to nothing.
    expect(externalPins.length).toBeGreaterThan(0);

    // One vendor and one only, which is the vendor the persona's record declares — a read that widened
    // to every vendor's evidence would carry several here.
    const releasedVendors = new Set(
      externalPins.flatMap((pin) => (pin.vendorId === undefined ? [] : [pin.vendorId])),
    );

    expect(releasedVendors.size).toBe(1);

    const ownVendor = firstOf(
      [...releasedVendors],
      "vendor the external engineer's released pins carry",
    );

    // The count is the wider read's own tally of that vendor's pins — the seeded pins of the vendor,
    // as the service releases them — so a partial release fails here as a missing one does.
    const ownVendorPins = everyPin.filter((pin) => pin.vendorId === ownVendor);

    expect(ownVendorPins.length).toBeGreaterThan(0);
    expect(externalPins).toHaveLength(ownVendorPins.length);

    // Withholding: every pin of another vendor, and every pin of no vendor at all, stays out of the
    // external read.
    const externalIds = new Set(externalPins.map((pin) => pin.id));
    const withheld = everyPin.filter((pin) => pin.vendorId !== ownVendor);

    expect(withheld.length).toBeGreaterThan(0);
    expect(withheld.some((pin) => externalIds.has(pin.id))).toBe(false);
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
    /*
     * The count is of the events this session appended. The seeded trail may already carry a note on
     * the same exception, so the write's own event is the one past the seeded run and every note below
     * it is seed content the case did not write.
     */
    const appended = trail.filter(
      (event) =>
        event.objectRef === target.id &&
        event.action === NOTE_ACTION &&
        event.sequence > SEEDED_EVENT_COUNT,
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

  it('reports the persona the session acts as, and the seeded persona again once it has reset', async () => {
    const backend = await readyBackend();

    // The read and the switch are two views of one value, which is what the boundary seeds the shell
    // from: whatever a caller can read here is the persona every other call is authorised against, so a
    // switch has to move both and a reset has to put both back.
    const opening = (await backend.getActiveUser()).data;
    const switched = (await backend.switchRole(AUDITOR)).data;
    const afterSwitch = (await backend.getActiveUser()).data;

    expect(afterSwitch).toEqual(switched);
    expect(afterSwitch.id).not.toBe(opening.id);

    await backend.resetDemo();

    // The reset puts the adapter back to the persona a first visit acts as, so the read reports that
    // persona rather than the one the switch selected.
    expect((await backend.getActiveUser()).data).toEqual(opening);
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
 * 11. The comparison option set — AAP 0.7's T-04 row, AAP 0.8
 * ------------------------------------------------------------------------------------------- */

/**
 * The trade-off sentence AAP 0.8 fixes for the recommended option of the case measured at call time.
 *
 * An expected value rather than a record: it carries the figures the measurement produces — what the plan
 * spends, the kits it defers, their value, the days they wait and the delayed revenue avoided — so a
 * template filled from the wrong member of the scenario still reads as a sentence but fails here.
 */
const EXPECTED_TRADE_OFF =
  'Spends EUR 21,300 and defers 900 Brno service kits (EUR 108,000) by 10 days to avoid EUR 2,257,000 of delayed revenue.';

describe('the comparison option set', () => {
  it('serves the four seeded positions as measured columns, one recommended and one rejected', async () => {
    const backend = await readyBackend();
    const lodged = (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data;
    const subject = firstOf(lodged, 'pending approval').exceptionId;
    const set = (await backend.getScenarioSet(subject)).data;
    const [baseline, airOnly, plan, beyondMaximum] = set.scenarios;

    if (
      baseline === undefined ||
      airOnly === undefined ||
      plan === undefined ||
      beyondMaximum === undefined
    ) {
      throw new Error('The set holds fewer than the four columns the records state for the case.');
    }

    // T-04's four rows, in the seed's order, and each one the solver's output rather than a shipped
    // figure: the columns are measured here, from the positions the records state.
    expect(set.scenarios.length).toBe(4);
    expect(set.scenarios.map((scenario) => scenario.id)).toEqual([
      'SCN-1184-A',
      'SCN-1184-B',
      'SCN-1184-C',
      'SCN-1184-D',
    ]);
    expect(set.scenarios.every((scenario) => scenario.origin === 'solver')).toBe(true);
    expect(new Set(set.scenarios.map((scenario) => scenario.name)).size).toBe(set.scenarios.length);

    // The first column is the do-nothing baseline, and the plan the records state is the one the rule
    // recommends: fewest units late first, then the lowest added cost.
    expect(baseline.levers).toEqual(NO_ACTION_LEVERS);
    expect(set.recommendedId).toBe(plan.id);
    expect(plan.levers).toEqual({ airSets: 600, transferSets: 900 });
    expect(baseline.addedCostEur).toBe(0);
    expect(airOnly.unitsLate).toBeGreaterThan(plan.unitsLate);
    expect(airOnly.addedCostEur).toBeLessThan(plan.addedCostEur);

    // The position beyond the air lever's bound keeps its column, where its cell carries the reason a
    // figure is missing, and it is the alternate the set lists with the constraint that blocked it.
    expect(beyondMaximum.constraintCheck).toBe('fail');
    expect(set.rejected).toEqual([
      {
        scenarioId: beyondMaximum.id,
        blockingConstraint: beyondMaximum.constraintMessages.join(' '),
      },
    ]);
    expect(set.rejected[0]?.blockingConstraint.length).toBeGreaterThan(0);

    // AAP 0.8's sentence, with every figure the measurement produced written into it.
    expect(set.tradeOff).toBe(EXPECTED_TRADE_OFF);

    // An option that sets a plan in motion writes the case's own steps back; the baseline recovers
    // nothing, and the rejected position cannot be carried out, so neither writes anything back.
    expect(baseline.writeBacks).toEqual([]);
    expect(beyondMaximum.writeBacks).toEqual([]);
    expect(plan.writeBacks.length).toBeGreaterThan(0);
    expect(plan.writeBacks).toEqual(airOnly.writeBacks);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 12. Determinism — the same call twice returns the same business figures
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
 * 12. The loading trigger — every served call pending, the controls that lift it still answering
 * ------------------------------------------------------------------------------------------- */

describe('the loading trigger', () => {
  it('holds a read past the latency band while the controls that lift it still answer', async () => {
    const backend = await readyBackend();

    await backend.setSimulation('loading', true);

    // The call is served up to the point of the hold, so the latency band has already passed when the
    // probe gives up: an adapter that answered late rather than not at all would settle inside it.
    expect(await settlesWithin(backend.getOverview(NO_SCOPE), HOLD_PROBE_MS)).toBe(false);

    // The controls the popover needs in order to leave the trigger answer while it is in effect. A
    // control the trigger held would have no way of lifting it (rule P-8).
    const switched = await backend.switchRole(AUDITOR);

    expect(switched.data.id).toBe(AUDITOR);

    const reset = await backend.resetDemo();

    expect(reset.data).toBe(true);

    // The reset lifted every trigger, so the loading trigger is set once more and lifted by hand, which
    // is the path the popover's own switch takes.
    await backend.setSimulation('loading', true);

    const lifted = await backend.setSimulation('loading', false);

    expect(lifted.data).toBe(true);

    // A fresh read answers normally again, so the hold was a condition of the trigger rather than of
    // the session.
    const overview = (await backend.getOverview(NO_SCOPE)).data;

    expect(overview.openExceptions).toBeGreaterThan(0);
  }, CASE_TIMEOUT_MS);

  it('answers the persona read while the trigger holds every served read', async () => {
    const backend = await readyBackend();

    const opening = (await backend.getActiveUser()).data;

    await backend.setSimulation('loading', true);

    // The precondition stated rather than assumed: under the same trigger a served read does not
    // settle, so the answer below is a control that bypasses the hold and not a trigger that never took
    // effect.
    expect(await settlesWithin(backend.getOverview(NO_SCOPE), HOLD_PROBE_MS)).toBe(false);

    // The shell seeds the role it displays from this read, and the start-up that takes it runs before
    // any screen exists: a read the trigger held would leave that start-up pending with nothing on
    // screen from which to lift the trigger (rule P-8).
    const held = await backend.getActiveUser();

    expect(held.data).toEqual(opening);

    await backend.setSimulation('loading', false);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 15. The port's remaining reads — the ribbon, one audit event, the outcome card, the write-back
 *     retry and the assistant's suggestions
 * ------------------------------------------------------------------------------------------- */

describe("the port's remaining reads", () => {
  it('answers the canvas ribbon with six computed tiles in the order the aggregate states', async () => {
    const backend = await readyBackend();
    const tiles = (await backend.getCanvasRibbon(NO_SCOPE)).data;
    const overview = (await backend.getOverview(NO_SCOPE)).data;

    expect(tiles).toHaveLength(6);
    expect(tiles.map((tile) => tile.id)).toEqual([
      'open-exceptions',
      'critical-exceptions',
      'revenue-at-risk',
      'customer-orders-at-risk',
      'median-hours-to-approved-plan',
      'plants-in-scope',
    ]);
    expect(tiles.every((tile) => tile.provenance === 'computed')).toBe(true);

    // Five of the six report an overview aggregate or the length of one of its collections, so the
    // ribbon adds no figure of its own and the same scope yields the same values through both reads
    // (rule P-6). The sixth counts the rows the same scope returns, which the queue case covers.
    expect(tileValueOf(tiles, 'open-exceptions')).toBe(overview.openExceptions);
    expect(tileValueOf(tiles, 'revenue-at-risk')).toBe(overview.revenueAtRiskEur);
    expect(tileValueOf(tiles, 'customer-orders-at-risk')).toBe(overview.customerOrdersAtRisk);
    expect(tileValueOf(tiles, 'median-hours-to-approved-plan')).toBe(
      overview.medianHoursToApprovedPlan,
    );
    expect(tileValueOf(tiles, 'plants-in-scope')).toBe(overview.byPlant.length);
  }, CASE_TIMEOUT_MS);

  it('reads one seeded audit event and refuses an identifier the chain does not hold', async () => {
    const backend = await readyBackend();

    await actAs(backend, AUDITOR);

    const event = (await backend.getAuditEvent(TAMPER_TARGET_ID)).data;

    expect(event.id).toBe(TAMPER_TARGET_ID);
    expect(event.eventHash).toMatch(EVENT_HASH_PATTERN);

    // The drawer's two halves are the record's own payloads, which is what makes the detail a reading
    // of the chain a verification walks rather than a second rendering of the action (AAP 0.12.4).
    expect(event).toHaveProperty('before');
    expect(event).toHaveProperty('after');

    // An identifier the chain does not hold is refused rather than answered with an empty event. The
    // unknown value is derived from the seeded one, so the case types no identifier of its own.
    const unknown = `${TAMPER_TARGET_ID}0`;
    const problem = await refusalOf(() => backend.getAuditEvent(unknown));

    expect(problem.type).toBe('not-found');
    expect(problem.message).toContain(unknown);
  }, CASE_TIMEOUT_MS);

  it('answers the outcome card with the planned measurement and the resulting one', async () => {
    const backend = await readyBackend();
    const lodged = firstOf(
      (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data,
      'pending approval',
    );
    const optionSet = (await backend.getScenarioSet(lodged.exceptionId)).data;
    const option = optionSet.scenarios.find((candidate) => candidate.id === lodged.scenarioId);

    if (option === undefined) {
      throw new Error(
        `The approval names the option ${lodged.scenarioId}, which its exception's set does not ` +
          'hold, so the case cannot cross-check the planned side.',
      );
    }

    const planned = (await backend.solveScenario(lodged.exceptionId, option.levers)).data;

    await actAs(backend, PLANT_MANAGER);
    await backend.decideApproval(lodged.id, { action: 'approve', comment: DECISION_COMMENT });

    const approved = (await backend.getApproval(lodged.id)).data;
    const outcome = (await backend.getApprovalOutcome(lodged.id)).data;

    // Both sides are the solver's own output on the exception's case, so the card's planned side is
    // the measurement a sandbox read at the plan's levers returns (rule P-6).
    expect(measuresOf(outcome.planned)).toEqual(measuresOf(planned));

    // Every step of this plan's change succeeded, so the change landed and the card's two sides
    // agree (AAP 0.2.2).
    expect(approved.writeBacks.every((step) => step.state === 'succeeded')).toBe(true);
    expect(measuresOf(outcome.resulting)).toEqual(measuresOf(planned));
  }, CASE_TIMEOUT_MS);

  it('refuses a step that already succeeded and completes a failed one without a second success record', async () => {
    const backend = await readyBackend();
    const lodged = firstOf(
      (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data,
      'pending approval',
    );
    const doNothing = (await backend.solveScenario(lodged.exceptionId, NO_ACTION_LEVERS)).data;

    await actAs(backend, PLANT_MANAGER);
    await backend.setSimulation('partial', true);

    // A decision whose write-back fails reports that failure, and the change stops where it stopped.
    const failure = await refusalOf(() =>
      backend.decideApproval(lodged.id, { action: 'approve', comment: DECISION_COMMENT }),
    );

    expect(failure.type).toBe('simulated-write-back');

    const failedRun = (await backend.getApproval(lodged.id)).data;
    const failedStep = firstOf(
      failedRun.writeBacks.filter((step) => step.state === 'failed'),
      'failed write-back step',
    );
    const unlanded = (await backend.getApprovalOutcome(lodged.id)).data;

    // All-or-nothing: no later step ran, so no part of the change was applied and the card's
    // resulting side stands at the do-nothing position (AAP 0.2.2).
    expect(failedRun.writeBacks.filter((step) => step.state === 'succeeded')).toEqual([]);
    expect(measuresOf(unlanded.resulting)).toEqual(measuresOf(doNothing));

    await backend.setSimulation('partial', false);

    const retried = (await backend.retryWriteBack(lodged.id, failedStep.recordRef)).data;

    expect(retried.state).toBe('succeeded');

    const completed = (await backend.getApproval(lodged.id)).data;
    const landed = (await backend.getApprovalOutcome(lodged.id)).data;

    expect(completed.writeBacks.every((step) => step.state === 'succeeded')).toBe(true);
    expect(measuresOf(landed.resulting)).toEqual(measuresOf(landed.planned));

    // The step that has now succeeded is refused rather than written a second time, which is what
    // keeps a retry from leaving a second success record behind (AAP 0.2.2).
    const repeated = await refusalOf(() =>
      backend.retryWriteBack(lodged.id, failedStep.recordRef),
    );

    expect(repeated.type).toBe('validation');

    await actAs(backend, AUDITOR);

    const trail = (await backend.listAuditEvents({ objectRef: lodged.id })).data;
    const stepEvents = trail.filter((event) => event.action === WRITE_BACK_ACTION);

    // One failure record for the interrupted run and exactly one success record per step: the retry
    // re-attempts without duplicating a step that already succeeded.
    expect(stepEvents.filter((event) => event.result === 'failed')).toHaveLength(1);
    expect(stepEvents.filter((event) => event.result === 'succeeded')).toHaveLength(
      completed.writeBacks.length,
    );
  }, CASE_TIMEOUT_MS);

  it('lists the six suggested questions with an identifier and a prompt only', async () => {
    const backend = await readyBackend();
    const questions = (await backend.listSuggestedQuestions()).data;

    expect(questions).toHaveLength(SCRIPTED_QUESTION_COUNT);
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);

    // Only the two members the panel needs cross the boundary: no outline, no template and no figure
    // of an answer reaches the screen before the answer does (rule P-6).
    expect(
      questions.every((question) => Object.keys(question).sort().join(',') === SUGGESTION_MEMBERS),
    ).toBe(true);

    // The list offers the prompt the assistant case submits and the script answers, so the panel and
    // the assistant agree on the question (AAP 0.8, AAP 0.12.4).
    expect(firstOf(questions, 'suggested question').prompt).toBe(SEEDED_QUESTION);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 13. The empty trigger — every collection read answers with nothing, then with its records
 * ------------------------------------------------------------------------------------------- */

/**
 * The nine port reads whose payload is a collection, each named as the port names it.
 *
 * The table is the whole set: the `empty` trigger empties every collection the adapter serves rather
 * than the exception queue alone, so a read missing from this table would be one that answered records
 * while the screen beside it showed none. The exception identifier each read is handed is captured
 * before the trigger is set, and the reads that address no record ignore it.
 */
const COLLECTION_READS: readonly {
  readonly name: string;
  readonly read: (backend: MockBackend, subject: ExceptionId) => Promise<readonly unknown[]>;
}[] = [
  {
    name: 'listExceptions',
    read: async (backend) => (await backend.listExceptions({}, NO_SCOPE)).data,
  },
  {
    name: 'getAffectedLines',
    read: async (backend, subject) => (await backend.getAffectedLines(subject)).data,
  },
  {
    name: 'listApprovals',
    read: async (backend) => (await backend.listApprovals({}, NO_SCOPE)).data,
  },
  {
    name: 'listAuditEvents',
    read: async (backend) => (await backend.listAuditEvents({})).data,
  },
  {
    name: 'getOutboundLedger',
    read: async (backend) => (await backend.getOutboundLedger({})).data,
  },
  {
    name: 'listPolicies',
    read: async (backend) => (await backend.listPolicies({})).data,
  },
  {
    name: 'listPins',
    read: async (backend) => (await backend.listPins({})).data,
  },
  {
    name: 'listPackages',
    read: async (backend) => (await backend.listPackages({})).data,
  },
  {
    name: 'searchIdentifiers',
    read: async (backend) => (await backend.searchIdentifiers(DOCUMENT_TERM, NO_SCOPE)).data,
  },
];

describe('the empty trigger', () => {
  it.each(COLLECTION_READS)(
    'empties $name while the trigger is on and returns its records once it is lifted',
    async ({ read }) => {
      const backend = await readyBackend();

      // `AUDITOR` holds `exception.read`, `audit.read`, `sovereignty.read`, `policy.read` and
      // `evidence.read`, so every read below is one the caller is entitled to receive: each answers an
      // emptied list rather than a refusal.
      await actAs(backend, AUDITOR);

      const subject = firstOf(await queueOf(backend), 'exception row').id;

      expect((await read(backend, subject)).length).toBeGreaterThan(0);
      await backend.setSimulation('empty', true);

      expect((await read(backend, subject)).length).toBe(0);

      await backend.setSimulation('empty', false);

      // The records come back as they stood, so the trigger emptied the answer rather than the session.
      expect((await read(backend, subject)).length).toBeGreaterThan(0);
    },
    CASE_TIMEOUT_MS,
  );
});


/* ---------------------------------------------------------------------------------------------
 * The browser-built exports — contracts §11, AAP 0.12.1 "Exports", AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The media types the two export formats declare.
 *
 * Stated here because they are two of the three members the port now carries beside the document: the
 * adapter keeps no file name and no media type of its own, so an export's descriptive members are
 * asserted against the format they describe rather than against a second copy inside the adapter.
 */
const JSON_MEDIA_TYPE = 'application/json';
const CSV_MEDIA_TYPE = 'text/csv;charset=utf-8';

/**
 * The simulation marker at the top level of a JSON export, or `undefined` when the document states
 * none.
 *
 * A guard rather than a cast: the case asserts the marker the file carries, so a payload whose top
 * level is not an object has to read as a document without one rather than as a parse failure.
 *
 * @param content - The export's text, as the port returned it.
 * @returns The document's `simulated` member, or `undefined` when it declares none.
 */
function simulationMarkerOf(content: string): unknown {
  const parsed: unknown = JSON.parse(content);

  if (typeof parsed !== 'object' || parsed === null || !('simulated' in parsed)) {
    return undefined;
  }

  return parsed.simulated;
}

/**
 * Two personas the pack is refused to, and the permission each of them lacks.
 *
 * The pack is composed from the declared deployment configuration and the audit trail, so the gate
 * names `sovereignty.read` first — the permission the external engineer and the plant manager both
 * lack. Naming the missing permission is what keeps the two adapters' refusals the same: the API client
 * composes the same document from the same reads, so it refuses the same personas for the same reason
 * (AAP 0.12.3).
 */
const REFUSED_EXPORTERS: [UserId, string][] = [
  [EXTERNAL_ENGINEER, 'sovereignty.read'],
  [PLANT_MANAGER, 'sovereignty.read'],
];

describe('the browser-built exports', () => {
  it('resolves a download payload for each export, with the file name and media type beside the text', async () => {
    const backend = await readyBackend();
    const lodged = firstOf(
      (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data,
      'pending approval',
    );

    const comparison = (await backend.exportScenarioComparison(lodged.exceptionId)).data;

    // The three members cross the boundary together: the CSV's own name and media type, and a document
    // whose labels travel on their own row rather than as a top-level marker (AAP 0.6.3).
    expect(comparison.mediaType).toBe(CSV_MEDIA_TYPE);
    expect(comparison.filename.endsWith('.csv')).toBe(true);
    expect(comparison.content.length).toBeGreaterThan(0);

    // The pack is composed from the declared configuration and the audit trail, so it is exported by a
    // persona holding both permissions; the brief needs the competitive read, which the auditor lacks.
    await actAs(backend, AUDITOR);

    const pack = (await backend.exportEvidencePack()).data;

    expect(pack.mediaType).toBe(JSON_MEDIA_TYPE);
    expect(pack.filename.endsWith('.json')).toBe(true);

    // The marker sits at the document's top level, so a reader of the file meets it before any figure
    // (rule P-1, AAP 0.12.1).
    expect(simulationMarkerOf(pack.content)).toBe(true);

    await actAs(backend, PLANT_MANAGER);

    const brief = (await backend.exportChokepointBrief()).data;

    expect(brief.mediaType).toBe(JSON_MEDIA_TYPE);
    expect(brief.filename.endsWith('.json')).toBe(true);
    expect(simulationMarkerOf(brief.content)).toBe(true);
  }, CASE_TIMEOUT_MS);

  it('composes the same document the shared builder produces from the same reads', async () => {
    const backend = await readyBackend();
    const lodged = firstOf(
      (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data,
      'pending approval',
    );

    // The comparison is a pure function of the set the scenario read returns, so the port's payload is
    // the shared builder's payload for that set, byte for byte (AAP 0.12.3, rule P-6).
    const set = (await backend.getScenarioSet(lodged.exceptionId)).data;

    expect((await backend.exportScenarioComparison(lodged.exceptionId)).data).toEqual(
      buildScenarioComparisonCsv(set),
    );

    await actAs(backend, AUDITOR);

    // The four reads the pack is composed from, taken before the export: exporting appends the event
    // that records it, so a read taken afterwards would describe a longer trail.
    const sovereignty = (await backend.getSovereigntyStatus()).data;
    const ledgerRows = (await backend.getOutboundLedger({})).data;
    const events = (await backend.listAuditEvents({})).data;
    const report = (await backend.verifyAuditChain()).data;

    const expectedPack = buildEvidencePack({
      sovereignty: { summary: sovereignty.summary, rows: sovereignty.rows },
      ledgerRows,
      events,
      report,
    });

    expect((await backend.exportEvidencePack()).data).toEqual(expectedPack);

    await actAs(backend, PLANT_MANAGER);

    const atlas = (await backend.getAtlas()).data;

    // The brief is composed over the atlas read alone, which publishes the pack's release label — the
    // same document the client builds without reaching the seed (rule P-2).
    expect((await backend.exportChokepointBrief()).data).toEqual(
      buildChokepointBrief({
        competitors: atlas.competitors,
        chokepoints: atlas.chokepoints,
        packVersion: atlas.packVersion,
      }),
    );
  }, CASE_TIMEOUT_MS);

  it(
    'exports the pack for the administrator whose own screen offers the action',
    async () => {
      const backend = await readyBackend();

      // SCR-07 is the platform administrator's home route and carries "Export evidence pack" as its
      // primary action, so the persona that owns the screen reads the chain the pack declares. Both
      // adapters answer this persona, which is what AAP 0.12.3's swap rule requires of them.
      await actAs(backend, ADMINISTRATOR);

      const pack = (await backend.exportEvidencePack()).data;

      expect(pack.mediaType).toBe(JSON_MEDIA_TYPE);
      expect(pack.filename.endsWith('.json')).toBe(true);
      expect(simulationMarkerOf(pack.content)).toBe(true);
    },
    CASE_TIMEOUT_MS,
  );

  it.each(REFUSED_EXPORTERS)(
    'refuses the pack to %s, naming the %s the persona lacks',
    async (userId, permission) => {
      const backend = await readyBackend();

      await actAs(backend, userId);

      const refusal = await refusalOf(() => backend.exportEvidencePack());

      expect(refusal.type).toBe('permission');
      expect(refusal.requiredPermission).toBe(permission);
    },
    CASE_TIMEOUT_MS,
  );
});

/* ---------------------------------------------------------------------------------------------
 * 14. The shell's selection — one resolver, applied to every read it narrows
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

/* ---------------------------------------------------------------------------------------------
 * 17. The list parameters of the collection reads — contracts §9, AAP 0.6.3 and AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The page size the paging cases ask a read for.
 *
 * A parameter a caller passes rather than a figure of the domain: it bounds how many records a case
 * looks at, it is never shown, and it describes no record (rule P-6).
 */
const PAGE_SIZE = 2;

/**
 * One collection read of the port, described by what a paging case needs from it.
 *
 * `sortField` and `valueOf` name one member whose values are distinct across the seeded records, so an
 * ordering case compares two orders exactly: with two equal values the tie the adapter breaks by
 * identity would be a rule the case had to restate rather than a property it measures.
 */
interface PagedRead<TRow> {
  /** The read, addressed as the port addresses it, with the query under test. */
  readonly read: (backend: MockBackend, query: ListQuery) => Promise<Result<TRow[]>>;

  /** The persona the read is made as, which holds the permission it requires. */
  readonly reader: UserId;

  /** The identity the read's cursor names. */
  readonly keyOf: (row: TRow) => string;

  /** The member `sort` is asked for, spelled as `field:dir` names it. */
  readonly sortField: string;

  /** The value that member holds on a row, which is what the ordering is measured by. */
  readonly valueOf: (row: TRow) => string;
}

/**
 * The last member of a collection a read returned.
 *
 * @param values - The collection read.
 * @param what - What the read returns, named in the failure message.
 * @returns The last member.
 * @throws Error - The collection is empty, so the case has no position to continue from.
 */
function lastOf<T>(values: readonly T[], what: string): T {
  const last = values[values.length - 1];

  if (last === undefined) {
    throw new Error(`The read returned no ${what}, so the case cannot run.`);
  }

  return last;
}

/**
 * Proves the three list parameters contracts §9 fixes on one collection read, through the port.
 *
 * `limit` bounds the page; `cursor` continues from the position a previous page ended at, so the second
 * page holds the records that follow the first and repeats none of them; `sort` orders the records by
 * the member it names, and the two directions are one order read backwards. A member the read cannot
 * order by falls back to that read's own default order, and a cursor naming no position of the
 * requested order is refused as a `'validation'` failure rather than restarting the page (AAP 0.6.3,
 * AAP 0.12.3).
 *
 * The four reads are proved one case each rather than through one parameterised table, because they
 * return four different record types and a table holding them would have to erase the row type.
 *
 * @param described - The read and the members the case measures it by.
 * @throws Error - The seeded records hold too few rows for a second page, which would leave the case
 *   without a subject.
 */
async function expectPageableAndSortable<TRow>(described: PagedRead<TRow>): Promise<void> {
  const backend = await readyBackend();

  await actAs(backend, described.reader);

  const keysOf = (rows: readonly TRow[]): string[] => rows.map(described.keyOf);
  const every = (await described.read(backend, {})).data;

  if (every.length <= PAGE_SIZE) {
    throw new Error(
      `The read returned ${every.length} record(s), too few to page by ${PAGE_SIZE}, so the case cannot run.`,
    );
  }

  // The limit bounds the page, and the page is the read's own order cut to that length.
  const firstPage = (await described.read(backend, { limit: PAGE_SIZE })).data;

  expect(keysOf(firstPage)).toEqual(keysOf(every).slice(0, PAGE_SIZE));

  // The second page starts at the record after the position the first page ended at, and holds none of
  // the records the first page returned (AAP 0.6.3).
  const cursor = described.keyOf(lastOf(firstPage, 'record on the first page'));
  const secondPage = (await described.read(backend, { limit: PAGE_SIZE, cursor })).data;
  const firstKeys = new Set(keysOf(firstPage));

  expect(keysOf(secondPage)).toEqual(keysOf(every).slice(PAGE_SIZE, PAGE_SIZE * 2));
  expect(keysOf(secondPage).some((key) => firstKeys.has(key))).toBe(false);

  // Ascending by the member the case names is the records ordered by that member's own value, and
  // descending is the same order read backwards.
  const byValue = [...every].sort((left, right) => {
    const leftValue = described.valueOf(left);
    const rightValue = described.valueOf(right);

    if (leftValue === rightValue) {
      return 0;
    }

    return leftValue < rightValue ? -1 : 1;
  });
  const ascending = (await described.read(backend, { sort: `${described.sortField}:asc` })).data;
  const descending = (await described.read(backend, { sort: `${described.sortField}:desc` })).data;

  expect(keysOf(ascending)).toEqual(keysOf(byValue));
  expect(keysOf(descending)).toEqual([...keysOf(byValue)].reverse());

  // A member the read cannot honour falls back to that read's own order rather than failing it.
  const unhonoured = (await described.read(backend, { sort: 'not-a-member:asc' })).data;

  expect(keysOf(unhonoured)).toEqual(keysOf(every));

  // A cursor that names no position of the requested order is refused rather than restarted.
  const refusal = await refusalOf(() => described.read(backend, { cursor: 'not-a-position' }));

  expect(refusal.type).toBe('validation');
}

describe('the list parameters of the collection reads', () => {
  it('pages and orders the outbound ledger', async () => {
    await expectPageableAndSortable<LedgerRow>({
      read: (backend, query) => backend.getOutboundLedger(query),
      reader: AUDITOR,
      keyOf: (row) => row.endpoint,
      sortField: 'endpoint',
      valueOf: (row) => row.endpoint,
    });
  }, CASE_TIMEOUT_MS);

  it('pages and orders the policy list', async () => {
    await expectPageableAndSortable<PolicyDetail>({
      read: (backend, query) => backend.listPolicies(query),
      reader: AUDITOR,
      keyOf: (entry) => entry.id,
      sortField: 'title',
      valueOf: (entry) => entry.title,
    });
  }, CASE_TIMEOUT_MS);

  it('pages and orders the evidence pins the persona may see', async () => {
    await expectPageableAndSortable<EvidencePin>({
      read: (backend, query) => backend.listPins(query),
      reader: AUDITOR,
      keyOf: (pin) => pin.id,
      sortField: 'id',
      valueOf: (pin) => pin.id,
    });
  }, CASE_TIMEOUT_MS);

  it('pages and orders the part approval packages', async () => {
    await expectPageableAndSortable<PpapPackage>({
      read: (backend, query) => backend.listPackages(query),
      reader: AUDITOR,
      keyOf: (partPackage) => partPackage.id,
      sortField: 'id',
      valueOf: (partPackage) => partPackage.id,
    });
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 19. The policy exception request — SCR-07's grant flow, read back through the policy it names
 * ------------------------------------------------------------------------------------------- */

/**
 * Files a time-boxed exception request against a policy, as SCR-07's grant flow does.
 *
 * The requester is the acting persona, which the cases set to the platform administrator: the matrix
 * grants `policy.exception.request` to that role alone and gives it `policy.read` and `audit.read`
 * beside, so one session files the request and reads both the policy and the trail back — while a
 * role change would append an event of its own to the trail one case measures (contracts §7.1).
 *
 * @param backend - The session to write to, acting as the platform administrator.
 * @param policyId - The policy the exception is requested against.
 * @param reason - Why the exception is needed, in the requester's own words.
 * @returns The pending request the adapter installed and answered with.
 */
async function requestException(
  backend: MockBackend,
  policyId: PolicyId,
  reason: string,
): Promise<PolicyException> {
  const requested = await backend.requestPolicyException({
    policyId,
    reason,
    expiresAt: EXCEPTION_EXPIRY,
    secondApproverId: HEAD_OF_SUPPLY_CHAIN,
  });

  return requested.data;
}

describe('the policy exception request', () => {
  it('answers the pending requests the grant flow recorded on the policy they name', async () => {
    const backend = await readyBackend();

    await actAs(backend, ADMINISTRATOR);

    const policies = (await backend.listPolicies({})).data;
    const policy = firstOf(policies, 'policy');
    const unrelated = policies.find((candidate) => candidate.id !== policy.id);

    if (unrelated === undefined) {
      throw new Error('The policy set holds one policy, so the case has no second policy to read.');
    }

    const first = await requestException(backend, policy.id, POLICY_EXCEPTION_REASON);
    const second = await requestException(backend, policy.id, SECOND_POLICY_EXCEPTION_REASON);

    const detail = (await backend.getPolicy(policy.id)).data;

    /*
     * The detail answers with the records the writes installed, field for field, and the newest request
     * comes first: the session appends one record per accepted request and the record carries no
     * requested-at member to order them by (AAP 0.12.2, AAP 0.12.4).
     */
    expect(detail.pendingExceptions).toEqual([second, first]);
    expect(detail.pendingExceptions[0]).toEqual({
      policyId: policy.id,
      reason: SECOND_POLICY_EXCEPTION_REASON,
      expiresAt: EXCEPTION_EXPIRY,
      requestedBy: ADMINISTRATOR,
      secondApproverId: HEAD_OF_SUPPLY_CHAIN,
      status: 'pending',
    });

    // The list entry for the same policy carries the same requests, so the list and the detail read one
    // record rather than two, and a policy nothing was requested against carries none of them.
    const entry = (await backend.listPolicies({})).data.find(
      (candidate) => candidate.id === policy.id,
    );

    if (entry === undefined) {
      throw new Error(`The policy list no longer holds ${policy.id}, so the case cannot compare.`);
    }

    expect(entry.pendingExceptions).toEqual(detail.pendingExceptions);
    expect((await backend.getPolicy(unrelated.id)).data.pendingExceptions).toEqual([]);
  }, CASE_TIMEOUT_MS);

  it('appends no audit event for the reads that answer with it', async () => {
    const backend = await readyBackend();

    await actAs(backend, ADMINISTRATOR);

    const policy = firstOf((await backend.listPolicies({})).data, 'policy');
    const beforeRequest = (await backend.listAuditEvents({})).data.length;

    await requestException(backend, policy.id, POLICY_EXCEPTION_REASON);

    const afterRequest = (await backend.listAuditEvents({})).data.length;

    // The write appends one event, once.
    expect(afterRequest).toBe(beforeRequest + 1);

    await backend.getPolicy(policy.id);
    await backend.listPolicies({});

    // The reads that return the request append nothing: one event per accepted request, and none for
    // reading the request back (AAP 0.2.1).
    expect((await backend.listAuditEvents({})).data.length).toBe(afterRequest);
  }, CASE_TIMEOUT_MS);

  it('clears the pending requests with the rest of the session on reset', async () => {
    const backend = await readyBackend();

    await actAs(backend, ADMINISTRATOR);

    const policy = firstOf((await backend.listPolicies({})).data, 'policy');

    await requestException(backend, policy.id, POLICY_EXCEPTION_REASON);

    expect((await backend.getPolicy(policy.id)).data.pendingExceptions).toHaveLength(1);

    await backend.resetDemo();
    await actAs(backend, ADMINISTRATOR);

    // A reset restores the seeded records, the chain and the persona, and clears the session's own
    // pending requests beside them, so the policy answers with none of them again.
    expect((await backend.getPolicy(policy.id)).data.pendingExceptions).toEqual([]);
  }, CASE_TIMEOUT_MS);
});
