// @vitest-environment node

/**
 * What the in-browser mock adapter does, driven only through the port it implements.
 *
 * `src/services/service-conformance.test.ts` proves the shape of both adapters; this suite proves the
 * behaviour of `MockBackend`, because the duties rule P-2 loads onto the service have nowhere else to
 * be observed. The cases are grouped one `describe` per duty, listed below in the order the file
 * states them.
 */

/*
 * The duties this suite proves, in the order the file states them:
 *
 * 1. the bootstrap, which hashes the seeded trail before the first call answers;
 * 2. the latency band that keeps a loading state observable;
 * 3. the refusal an approval meets while the order book is stale — the service half of the
 *    stale-source rule, which holds whether or not a screen disabled the control;
 * 4. permission enforcement, in the adapter rather than in a view;
 * 5. policy enforcement, with the rule, its reason, the alternative it permits, the event it wrote and
 *    the ledger row that event is counted on;
 * 6. message redaction, applied before a record crosses the boundary;
 * 7. the audit append a write makes, the append a read does not, and the queue that keeps two
 *    audited writes issued together from claiming one position;
 * 8. the reset that puts the session back to the seeded state, and the chain it leaves whole when one
 *    lands while an audited write is in flight;
 * 9. the tamper control, whose edit a verification reports and repairs nothing of;
 * 10. the assistant's cited answer and its fixed notice;
 * 11. determinism: the same call twice returns the same business figures;
 * 12. the comparison option set of the case measured at call time — its four measured columns, the
 *     recommendation, the rejected alternate and the trade-off its figures fill — and the evidence read
 *     that answers a reference to one of those columns, which no seeded record holds;
 * 13. the loading trigger, which leaves every served call pending while the controls that lift it still
 *     answer;
 * 14. the empty trigger, which empties every collection a read returns — and the one population the queue
 *     and the overview are both computed over — rather than the queue alone;
 * 15. the shell's selection: the plants and product the top bar names, resolved once and applied to
 *     every read it narrows — one reading of a multi-plant selection across the members that take it,
 *     a plant set that names no plant admitting nothing, and a record whose subject the session cannot
 *     place reaching nobody;
 * 16. the port's remaining reads: the canvas ribbon, one audit event, the outcome card, the write-back
 *     retry and the assistant's suggestions, each reached through the port rather than through a
 *     handler;
 * 17. the browser-built exports, which resolve a download payload whose document equals the one the
 *     shared composition produces from the same reads, and which refuse the pack to a persona that may
 *     not read the audit trail;
 * 18. the list parameters the four collection reads carry, where `limit` bounds the population a
 *     filter leaves rather than a page of it, `cursor` continues from the position a previous page
 *     ended at, and `sort` orders the records by the member it names in both directions;
 * 19. the response envelope every served result carries — the source freshness records, the literal
 *     `simulated` marker and the trace identifier of the call, which stays the call's own when several
 *     calls are issued in one turn;
 * 20. the policy exception request: the pending record SCR-07's grant flow writes, readable back
 *     through the policy detail it names, the reset that clears it, and the reads that append nothing;
 * 21. the decision's records: the comment its audit event keeps, the resolution a landed write-back
 *     leaves on the exception the plan answers, and the request the approved plan closes;
 * 22. the evidence behind any figure, mark, node, arc or pin: a composed aggregate reference answered
 *     from the aggregate read's own output, a narrowed selection read the way the adapter reads a
 *     `Scope`, one reference per node family the canvas and the impact chain carry, a radar series
 *     kept apart from the client's own reading by its provenance, and the three typed refusals.
 * 23. the evidence a governance figure opens: a declared outbound endpoint and every policy resolving
 *     to the record each one states, with the label the record itself decides;
 * 24. the queue's day filter: the exceptions SCR-01's series counted on one day and no others, read
 *     from the series itself, with the unfiltered queue strictly larger and a day of no activity
 *     answering with no rows;
 * 25. the partial trigger, reported through the freshness every result carries and yielding to a stale or
 *     unavailable report beside it;
 * 26. the conflict trigger: every collection read refused with its own reason and its own trace, every
 *     read of one record served so the act it carries can be attempted, the decision it demonstrates
 *     refused rather than merged and left undecided, the control's lift answering those reads again, and
 *     the demonstration controls never refused;
 * 27. a request against a set-aside exception: refused with the status the record stands in, and
 *     neither an approval record nor an audit event written for it;
 * 28. the evidence behind one step of a plan's write-back: the composed reference
 *     `write-back:<ownerId>/<sequence>` answered with the step's own record, system and state, for an
 *     approval and for an option measured at call time, with the malformed, unknown-owner and
 *     unknown-position refusals;
 * 29. the queue's record filters and its page: each filter decided on the member the exception record
 *     carries, the plant a row reaches as well as the one it lands on, and a page taken from the order
 *     the whole queue states;
 * 30. the free-text ceiling: the one bound the audited writes apply to the prose they store, refused as
 *     a `'validation'` failure naming the field, the ceiling and the length submitted, with the record,
 *     the history and the trail left as they stood — and a text of exactly the ceiling accepted.
 */

/**
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
 * - It uses no test hook. A call goes through a member of the port plus the three members the
 *   adapter adds — `whenReady()`, `switchRole()` and `getActiveUser()` — or through the
 *   demonstration control `setSimulation()` the popover drives, with one exception stated where
 *   it is made: the approval family's exported handler is called directly by the case that places
 *   a record the session's exceptions cannot resolve, because the adapter member is a pure
 *   delegation of that handler and the plant-scope test therefore lives there. That case builds
 *   its session with the adapter's own factory, so no production hook, no private field, no
 *   global and no query parameter is involved, and the behaviour asserted is still the behaviour a
 *   screen meets.
 * - It names no real company, customer, carmaker or cloud product, and carries no credential-shaped
 *   text, so the scans that cover the source tree find nothing new here (rules P-7 and B-2).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  ActiveUser,
  Approval,
  ApprovalStatus,
  Atlas,
  AuditQuery,
  DocumentBody,
  EvidencePin,
  ExceptionId,
  ExceptionQuery,
  ExceptionRow,
  ExceptionStatus,
  Freshness,
  LedgerRow,
  Levers,
  ListQuery,
  PlantId,
  Permission,
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
import {
  CLIENT_SELF_ASSESSMENT_LABEL,
  DEMO_CLOCK,
  PERMISSIONS,
  SIM_LABELS,
  SOURCE_IDS,
  SOURCE_LABELS,
} from '../../types';
import { hasPermission, plantScopeFor, rolesWith } from '../../domain/policy/permissions';
import { buildChokepointBrief } from '../exports/chokepoint-brief';
import { buildEvidencePack } from '../exports/evidence-pack';
import { buildScenarioComparisonCsv } from '../exports/scenario-csv';
import { listApprovals } from './handlers/approvals';
import { getAtlas } from './handlers/atlas';
import { FREE_TEXT_MAX_LENGTH, traceIdFor } from './handlers/audit';
import { getEvidence } from './handlers/evidence';
import { getScenarioSet } from './handlers/scenarios';
import { MockBackend } from './mock-backend';
import { createMockState, type HandlerContext } from './mock-state';
import {
  BASELINE_CASE_ID,
  SEEDED_EVENT_COUNT,
  TAMPER_TARGET_ID,
  UNSCRIPTED_NOTICE,
} from './seed-loader';
import type { SeededUser } from './seed-loader';

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
const RESOLVED_ACTION = 'resolved';
const DISMISS_ACTION = 'dismiss';

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

/**
 * The status an approval waits in, which is the one the inbox's pending population holds and the one
 * the status filter is proved against. Restated here for the same reason as `OPEN_STATUS`: a case
 * counts the same member the record carries rather than a label of its own.
 */
const PENDING_APPROVAL_STATUS: ApprovalStatus = 'pending';

/**
 * The status a landed write-back leaves the exception in, which is the one AAP 0.2.2's journey ends at.
 * Restated here for the same reason as `OPEN_STATUS`: a case reads the same member the record carries
 * rather than a label of its own.
 */
const RESOLVED_STATUS: ExceptionStatus = 'resolved';

/**
 * The status a dismissal leaves an exception in, which is the one a request against it is refused for.
 * Restated here for the same reason as `OPEN_STATUS`: a case reads the same member the record carries
 * rather than a label of its own.
 */
const DISMISSED_STATUS: ExceptionStatus = 'dismissed';

/* ---------------------------------------------------------------------------------------------
 * The personas the cases act as — `src/seed/users.ts`, addressed by identifier
 * ------------------------------------------------------------------------------------------- */

/**
 * Four of the eight seeded personas, each chosen for what the permission matrix grants it, because a
 * refusal is only observable from a persona that does not hold the permission the call requires.
 *
 * - `AUDITOR` holds `audit.read`, the permission the trail and its verification require.
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
const SUPPLIER_QUALITY_ENGINEER: UserId = 'USR-07';
const EXTERNAL_ENGINEER: UserId = 'USR-08';

/* ---------------------------------------------------------------------------------------------
 * The two exception records the comparison read's permission cases name
 * ------------------------------------------------------------------------------------------- */

/**
 * The exception laid on one plant and reaching another — the record the comparison read must serve.
 *
 * An identifier here is an input to a read rather than an expected value (rule P-6), exactly as the
 * identifier a case opens from the queue is. The record states no solver case, so the option set the
 * adapter answers with is empty, which is the comparison screen's own empty state (AAP 0.12.4). It is
 * reached through the plant it affects rather than the plant it is laid on, which is the reach the
 * exception family applies and this read now shares.
 */
const REACHED_THROUGH_ANOTHER_PLANT: ExceptionId = 'EXC-2026-1186';

/**
 * The exception laid on a plant the opening persona's scope does not cover and affecting none it does.
 *
 * Its read lies outside the acting role's reach rather than outside its permissions, which is the
 * distinction the comparison read has to report as `'not-found'` (AAP 0.12.3's causes).
 */
const OUTSIDE_THE_OPENING_SCOPE: ExceptionId = 'EXC-2026-1185';

/** The permission the comparison read requires — contracts §7.1, AAP 0.12.4's SCR-04 row. */
const EXCEPTION_READ_PERMISSION: Permission = 'exception.read';

/* ---------------------------------------------------------------------------------------------
 * The words the cases submit
 * ------------------------------------------------------------------------------------------- */

/** A note in a planner's own words, as SCR-02's row action records it. */
const NOTE_TEXT = 'Waiting on the supplier to confirm a dispatch date.';

/** The reason a dismissal carries, as SCR-02's row action records it in a planner's own words. */
const DISMISS_REASON =
  'The line was rerouted for the rest of the week, so this disruption is set aside.';

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
 * The band is checked twice over, and the two checks answer different questions. The delay the adapter
 * asks its timer for — recorded by the case below, which lets the timer itself through — must sit
 * inside 150 to 400 ms: that is the band AAP 0.12.1 fixes, and it is a fact about the adapter rather
 * than about this host, because the delay is a ladder over the session's request counter, so the first
 * two calls of a session take the floor and the floor plus one step and no scheduling can produce a
 * number outside the band. The measured duration must then be at least that same delay, less the
 * tolerance below, which is what proves a call really waits rather than scheduling a timer it never
 * awaits.
 *
 * The two tolerances are deliberately different. The floor's is tight, because the scheduled delay and
 * the duration a clock measures for it are two readings of one wait, and 25 ms is room for the
 * difference between the clock read and the timer's own resolution. The ceiling's is generous, because
 * this suite runs on a host shared with other work and an event loop can be kept from a finished timer
 * for far longer than the delay itself; a tight ceiling there would report a loaded machine as a
 * defect, and what the generous one still catches is a band set an order of magnitude off.
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
 * The page a case asks for when it needs every event of the trail rather than one page of them.
 *
 * The adapter serves a list read one page at a time: a read that states no `limit` is answered with its
 * default page and no read serves more than its maximum page, both of which
 * `src/services/mock/handlers/audit.ts` declares. A case that counts, maps or re-hashes every event
 * therefore has to ask for the widest page the adapter will serve, and this is that page — a bound
 * above any trail this suite builds, which is the seeded trail plus the handful of events the cases
 * here append. It is a parameter a caller passes rather than a figure of the domain: it bounds how many
 * records a case looks at, is never shown and describes no record (rule P-6).
 */
const WHOLE_TRAIL_LIMIT = 500;

/** The query every whole-trail case sends, so no case re-spells the bound above. */
const WHOLE_TRAIL: AuditQuery = { limit: WHOLE_TRAIL_LIMIT };

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
 * One seeded persona, resolved the way the adapter resolves the persona it acts as.
 *
 * A handler receives the session's state and the persona together, and the adapter builds that pair
 * from the session's own active identifier rather than from anything a caller passes, so a case that
 * calls a handler directly has to build it the same way: the record's role, the plant scope the matrix
 * states for that role, and the permissions the matrix grants it. The permissions are derived through
 * `hasPermission` with no subject — the question is what the role holds at all, which is the reading
 * that module documents — so the persona here cannot drift from the one a port call would act as.
 *
 * @param record - The seeded persona record.
 * @returns The persona, with the plant scope and permissions its role holds.
 */
function personaFor(record: SeededUser): ActiveUser {
  const probe: ActiveUser = {
    id: record.id,
    name: record.name,
    role: record.role,
    plantIds: plantScopeFor(record.role),
    permissions: [],
    homeRoute: record.homeRoute,
  };

  return {
    ...probe,
    permissions: PERMISSIONS.filter((permission) =>
      hasPermission(record.role, permission, null, probe),
    ),
  };
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
 * Every node identifier a topology payload carries, across its five families.
 *
 * The narrowing a case asserts on is stated over the payload's own node set, which is what a lane
 * endpoint and a pin-count key are drawn against.
 *
 * @param topology - The canvas payload read.
 * @returns The identifiers of the plants, suppliers, materials, origins and customers it holds.
 */
function nodeIdsOf(topology: Topology): string[] {
  return [
    ...topology.plants,
    ...topology.suppliers,
    ...topology.materials,
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
 * The first measured option of an exception the acting persona may set aside.
 *
 * Found through the port rather than by naming a record, for the same reason as the helper above: the
 * queue is walked in its own order, and the first row that is open, laid on a plant the acting role
 * works in and stating a measured option answers the call. The status and the plant are read from the
 * row, so a row the acting role could not dismiss, and one whose plan was never measured and so has
 * nothing to put forward, are both skipped rather than becoming the subject of a case that would then
 * assert against a refusal the case did not mean to provoke.
 *
 * @param backend - The session to read.
 * @returns The exception the option belongs to and the option's identifier.
 * @throws Error - No open exception the acting role may work states a measured option.
 */
async function firstDismissableOptionOf(
  backend: MockBackend,
): Promise<{ readonly exceptionId: ExceptionId; readonly scenarioId: ScenarioId }> {
  const actor = (await backend.getActiveUser()).data;

  for (const row of await queueOf(backend)) {
    if (row.status !== OPEN_STATUS || !actor.plantIds.includes(row.plantId)) {
      continue;
    }

    const [option] = (await backend.getScenarioSet(row.id)).data.scenarios;

    if (option !== undefined) {
      return { exceptionId: row.id, scenarioId: option.id };
    }
  }

  throw new Error(
    'No open exception the acting role may set aside states a measured option, so the case cannot run.',
  );
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

    const trail = (await backend.listAuditEvents(WHOLE_TRAIL)).data;

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
  // The case rests on a spy, so it removes it itself rather than leaning on the runner's
  // `restoreMocks` setting: a later case must not inherit a recorded scheduler.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('waits the 150 to 400 ms delay it schedules, on a read and on a write', async () => {
    const backend = await readyBackend();

    // The delay the adapter asks its timer for is recorded here rather than inferred from a duration.
    // The spy calls through to the real timer, so each call waits exactly as a screen sees it, while
    // the number the adapter chose is readable afterwards; the session's bootstrap has already run, so
    // everything recorded below belongs to this case's own two calls.
    const scheduled = vi.spyOn(globalThis, 'setTimeout');
    const scheduledDelays = (): number[] =>
      scheduled.mock.calls.flatMap((call) => (call[1] === undefined ? [] : [call[1]]));

    expect(scheduledDelays()).toEqual([]);

    const readStartedAt = performance.now();
    const rows = (await backend.listExceptions({}, NO_SCOPE)).data;
    const readElapsed = performance.now() - readStartedAt;
    const readDelay = lastOf(scheduledDelays(), 'delay the read scheduled');
    const target = firstOf(rows, 'exception row');

    const writeStartedAt = performance.now();

    await backend.noteException(target.id, NOTE_TEXT);

    const writeElapsed = performance.now() - writeStartedAt;
    const writeDelay = lastOf(scheduledDelays(), 'delay the write scheduled');

    // The delay the adapter chose is inside the band the plan fixes, which is a fact about the adapter
    // and not about this host: no amount of load can make it schedule a number outside the band.
    expect(readDelay).toBeGreaterThanOrEqual(LATENCY_FLOOR_MS);
    expect(readDelay).toBeLessThanOrEqual(LATENCY_CEILING_MS);
    expect(writeDelay).toBeGreaterThanOrEqual(LATENCY_FLOOR_MS);
    expect(writeDelay).toBeLessThanOrEqual(LATENCY_CEILING_MS);

    // The floor is the delay just recorded, less room for the clock's own resolution, rather than the
    // band's floor: this suite shares its host with other work, and a loaded event loop delays a timer
    // that has already expired but can never fire one early. The ceiling stays generous for the same
    // reason, and still catches a band set an order of magnitude out of place.
    expect(readElapsed).toBeGreaterThanOrEqual(readDelay - FLOOR_TOLERANCE_MS);
    expect(writeElapsed).toBeGreaterThanOrEqual(writeDelay - FLOOR_TOLERANCE_MS);
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

  it('serves the option set of an exception another plant lays and this scope reaches', async () => {
    const backend = await readyBackend();

    // The opening persona is the material planner, whose role holds `exception.read`, and the record
    // below is laid on a plant outside its scope while reaching one inside it. The comparison read
    // answers with the set rather than refusing it: the reach that admits the record to the exception
    // reads admits it here, so the two surfaces cannot disagree about whether the planner may read it.
    const set = (await backend.getScenarioSet(REACHED_THROUGH_ANOTHER_PLANT)).data;

    expect(set.exceptionId).toBe(REACHED_THROUGH_ANOTHER_PLANT);

    // The record states no solver case, so the answer is the empty set the screen renders its empty
    // state from, rather than a refusal (AAP 0.12.4).
    expect(set.scenarios).toEqual([]);
  }, CASE_TIMEOUT_MS);

  it("refuses an option set outside the acting role's plant scope as not found, naming the scope", async () => {
    const backend = await readyBackend();
    const planner = (await backend.getActiveUser()).data;
    const problem = await refusalOf(() => backend.getScenarioSet(OUTSIDE_THE_OPENING_SCOPE));

    // The role holds the permission and the record simply lies outside the plants its scope covers, so
    // the cause is the one the exception reads report for a record they do not cover rather than the
    // one a forbidden card is rendered from (AAP 0.12.3, rule P-8).
    expect(problem.type).toBe('not-found');
    expect(problem.requiredPermission).toBeUndefined();
    expect(problem.message).toContain(OUTSIDE_THE_OPENING_SCOPE);

    // The refusal names the scope it was measured against, so a reader learns the plants the read does
    // cover rather than a permission the role already holds.
    for (const plantId of planner.plantIds) {
      expect(problem.message).toContain(plantId);
    }
  }, CASE_TIMEOUT_MS);

  it('still refuses an option set to a role that does not hold the permission at all', async () => {
    const backend = await readyBackend();
    const externalEngineer = await actAs(backend, EXTERNAL_ENGINEER);
    const problem = await refusalOf(() => backend.getScenarioSet(REACHED_THROUGH_ANOTHER_PLANT));

    // The matrix hold is asked before the reach, so a role that reads no exception is refused with the
    // permission failure a forbidden card renders, whichever record it names (rule P-8).
    expect(problem.type).toBe('permission');

    if (problem.requiredPermission === undefined || problem.rolesWithPermission === undefined) {
      throw new Error('A permission failure carries the permission and the roles that hold it.');
    }

    expect(problem.requiredPermission).toBe(EXCEPTION_READ_PERMISSION);
    expect(problem.message).toContain(EXCEPTION_READ_PERMISSION);
    expect(problem.rolesWithPermission).not.toContain(externalEngineer.role);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 4b. The atlas pack — a broken classification fails the session, not one call
 * ------------------------------------------------------------------------------------------- */

describe('the atlas pack', () => {
  /**
   * A session and the context a port call hands the atlas handler, acting as the persona the
   * contracts grant `competitive.read` to.
   *
   * @returns The state and the handler context over it.
   */
  async function atlasSession(): Promise<HandlerContext> {
    const state = await createMockState();
    const record = firstOf(
      state.records.users.filter((user) => user.id === PLANT_MANAGER),
      'seeded plant manager',
    );

    return { state, actor: personaFor(record), traceId: traceIdFor(state.requestCount + 1) };
  }

  it('fails loudly when a competitor network states no class the atlas offers', async () => {
    const context = await atlasSession();
    const pack = context.state.records.marketIntelligence;
    const network = firstOf(pack.competitors, 'competitor network');
    const offered = context.state.records.products.map((product) => product.id);

    // A class the client's own products do not publish can never be chosen in the selector, so a
    // network classified only in it would be drawn under no class at all.
    const unoffered = `${network.competitorId}-class`;

    expect(offered).not.toContain(unoffered);

    context.state.records = {
      ...context.state.records,
      marketIntelligence: {
        ...pack,
        competitors: pack.competitors.map((entry) =>
          entry.competitorId === network.competitorId
            ? { ...entry, productClasses: [unoffered] }
            : entry,
        ),
      },
    };

    // A broken record set is reported as the defect it is, naming the record to fix, rather than as
    // one call's failure that would leave the same record on every later read.
    await expect(getAtlas(context)).rejects.toThrow(network.competitorId);
  });

  it('fails loudly when a competitor series names no network the pack holds', async () => {
    const context = await atlasSession();
    const pack = context.state.records.marketIntelligence;
    const series = firstOf(
      pack.radarSeries.filter((entry) => entry.provenance === 'market_intelligence'),
      'market-intelligence series',
    );

    context.state.records = {
      ...context.state.records,
      marketIntelligence: {
        ...pack,
        radarSeries: pack.radarSeries.map((entry) =>
          entry.id === series.id ? { ...entry, competitorId: null } : entry,
        ),
      },
    };

    // The series is hidden from every class the selector offers when its join resolves to nothing, so
    // the pack is refused rather than served with a competitor's reading missing.
    await expect(getAtlas(context)).rejects.toThrow(series.id);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The evidence behind the atlas records — AAP 0.2.1 F12, AAP 0.12.4
 * ------------------------------------------------------------------------------------------- */

/**
 * The four record families SCR-13's marks stand on, driven through the port the screen reads.
 *
 * Each case reads the atlas as a persona the contracts grant `competitive.read` to, takes an
 * identifier the payload itself published and asks `getEvidence` for the record behind it, so no
 * identifier is typed here and no payload is hand-built: what a drawer would show is what these cases
 * assert (rule P-2, rule P-6). The refusals are driven the same way, because a reference whose family
 * or axis the pack does not hold must reach the drawer as the typed failure rather than as a
 * neighbouring record.
 */
describe('the evidence behind the atlas records', () => {
  /**
   * One session, the persona the atlas is readable to, and the payload it answered with.
   *
   * The plant manager is the persona because the contracts grant it `competitive.read` while it is
   * scoped to a single plant, so the same session can also show that a client plant outside that scope
   * is refused.
   *
   * @returns The adapter, acting as that persona, and the atlas payload it served.
   */
  async function atlasReading(): Promise<{ readonly backend: MockBackend; readonly atlas: Atlas }> {
    const backend = await readyBackend();

    await actAs(backend, PLANT_MANAGER);

    return { backend, atlas: (await backend.getAtlas()).data };
  }

  it('resolves the crossing behind a shared chokepoint from the record own members', async () => {
    const { backend, atlas } = await atlasReading();
    const crossing = firstOf(atlas.chokepoints, 'shared chokepoint');

    const evidence = (await backend.getEvidence(crossing.id)).data;

    /* The payload is market intelligence under the fixed label, and every figure in it is the
       crossing record's own (rule P-1, rule P-5). */
    expect(evidence.provenance).toBe('market_intelligence');
    expect(evidence.label).toBe(SIM_LABELS[5]);
    expect(evidence.value).toContain(String(crossing.overlap));
    expect(evidence.inputs).toContain(`overlap = ${crossing.overlap}`);

    const buffers = Object.entries(crossing.competitorBufferDays);

    expect(buffers.length).toBeGreaterThan(0);

    for (const [competitorId, bufferDays] of buffers) {
      expect(evidence.inputs).toContain(`buffer days for ${competitorId} = ${bufferDays}`);
      expect(evidence.upstream).toContain(competitorId);
    }

    /* Nothing the payload states is missing, and it cites no document: every document in the record
       set belongs to the client rather than to the pack (rule P-5). */
    expect(evidence.missingInputs).toStrictEqual([]);
    expect(evidence.documents).toStrictEqual([]);
  });

  it('resolves a competitor site, and the network that owns it under the competitor identifier', async () => {
    const { backend, atlas } = await atlasReading();
    const network = firstOf(atlas.competitors, 'competitor network');
    const site = firstOf(network.sites, 'competitor site');

    const siteEvidence = (await backend.getEvidence(site.id)).data;

    expect(siteEvidence.provenance).toBe('market_intelligence');
    expect(siteEvidence.label).toBe(SIM_LABELS[5]);
    expect(siteEvidence.value).toContain(site.label);
    expect(siteEvidence.value).toContain(String(site.latitude));
    expect(siteEvidence.upstream).toStrictEqual([network.competitorId]);

    const touching = network.lanes.filter(
      (lane) => lane.fromId === site.id || lane.toId === site.id,
    );

    expect(touching.length).toBeGreaterThan(0);

    for (const lane of touching) {
      expect(siteEvidence.downstream).toContain(`lane from ${lane.fromId} to ${lane.toId}`);
    }

    const networkEvidence = (await backend.getEvidence(network.competitorId)).data;

    expect(networkEvidence.provenance).toBe('market_intelligence');
    expect(networkEvidence.label).toBe(SIM_LABELS[5]);
    expect(networkEvidence.value).toContain(network.label);
    expect(networkEvidence.inputs).toContain(`competitorId = ${network.competitorId}`);
  });

  it('resolves a radar reading with and without the axis a vertex names', async () => {
    const { backend, atlas } = await atlasReading();
    const axis = firstOf(atlas.radarAxes, 'radar axis');
    const competitorSeries = atlas.radarSeries.find(
      (series) => series.provenance === 'market_intelligence',
    );
    const clientSeries = atlas.radarSeries.find((series) => series.competitorId === null);

    if (competitorSeries === undefined || clientSeries === undefined) {
      throw new Error('The payload serves no competitor series and no client series.');
    }

    const score = competitorSeries.values[atlas.radarAxes.indexOf(axis)];

    if (score === undefined) {
      throw new Error('The series records no score on the axis this case reads.');
    }

    /* The reference a radar vertex carries: the series, the separator, then the axis. */
    const reading = (await backend.getEvidence(`${competitorSeries.id}#${axis.id}`)).data;

    expect(reading.provenance).toBe('market_intelligence');
    expect(reading.label).toBe(SIM_LABELS[5]);
    expect(reading.value).toContain(axis.label);
    expect(reading.value).toContain(String(score));
    expect(reading.inputs).toContain(`${axis.label} = ${score}`);

    /* Without the separator the whole series answers, with every axis reading it holds listed. */
    const whole = (await backend.getEvidence(competitorSeries.id)).data;

    expect(whole.value).toContain(competitorSeries.label);

    atlas.radarAxes.forEach((entry, position) => {
      const recorded = competitorSeries.values[position];

      if (recorded !== undefined) {
        expect(whole.inputs).toContain(`${entry.label} = ${recorded}`);
      }
    });

    /* The client's own series is a first-party self-assessment, so it carries the label of a seeded
       record rather than the market-intelligence one (rule P-1, rule P-5). */
    const client = (await backend.getEvidence(clientSeries.id)).data;

    expect(client.provenance).toBe('first_party');
    expect(client.label).toBe(SIM_LABELS[0]);
  });

  it('resolves a client plant and narrows it to the acting persona plant scope', async () => {
    const { backend, atlas } = await atlasReading();
    const scope = plantScopeFor('plant-manager');
    const inside = atlas.clientSites.find((site) => scope.includes(site.id));
    const outside = atlas.clientSites.find((site) => !scope.includes(site.id));

    if (inside === undefined || outside === undefined) {
      throw new Error('The atlas serves no plant inside and none outside the persona plant scope.');
    }

    const evidence = (await backend.getEvidence(inside.id)).data;

    expect(evidence.provenance).toBe('first_party');
    expect(evidence.label).toBe(SIM_LABELS[0]);
    expect(evidence.value).toContain(inside.label);
    expect(evidence.inputs).toContain(`id = ${inside.id}`);

    /* A plant the acting role cannot act at is refused exactly as every other plant-scoped record is:
       a reference narrows nothing the matrix would have released. */
    const refused = await refusalOf(() => backend.getEvidence(outside.id));

    expect(refused.type).toBe('permission');
  });

  it('refuses a radar reference naming an axis the pack does not hold, and one naming no record', async () => {
    const { backend, atlas } = await atlasReading();
    const series = firstOf(atlas.radarSeries, 'radar series');
    const unknownAxis = `${series.id}#${series.id}-axis`;
    const unknownSeries = `${series.id}-absent`;

    const axisRefusal = await refusalOf(() => backend.getEvidence(unknownAxis));

    expect(axisRefusal.type).toBe('not-found');
    expect(axisRefusal.message).toContain(unknownAxis);

    const seriesRefusal = await refusalOf(() => backend.getEvidence(unknownSeries));

    expect(seriesRefusal.type).toBe('not-found');
    expect(seriesRefusal.message).toContain(unknownSeries);

    /* And a reference belonging to no family at all is refused naming what it sent. */
    const strayRefusal = await refusalOf(() => backend.getEvidence(atlas.packVersion));

    expect(strayRefusal.type).toBe('not-found');
    expect(strayRefusal.message).toContain(atlas.packVersion);
  });

  it('refuses a market-intelligence record to a persona that may not read the pack', async () => {
    const { backend, atlas } = await atlasReading();
    const crossing = firstOf(atlas.chokepoints, 'shared chokepoint');

    await actAs(backend, EXTERNAL_ENGINEER);

    const refused = await refusalOf(() => backend.getEvidence(crossing.id));

    /* The evidence behind a mark is exactly as readable as the mark itself: the pack's own read
       permission decides it, so a reference cannot reach a record the atlas withholds (rule P-8). */
    expect(refused.type).toBe('permission');
    expect(refused.requiredPermission).toBe('competitive.read');
  });
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

  it('refuses a question to the external model over classified context, counts the block on its endpoint and names the permitted alternative', async () => {
    const backend = await readyBackend();
    const catalogue = (await backend.getModelCatalogue()).data;
    const external = firstOf(
      catalogue.models.filter((entry) => entry.boundary === 'external'),
      'external model entry',
    );
    const confidential = await confidentialDocumentOf(backend);

    // The ledger row the refusal has to land on is the one whose endpoint the catalogue entry
    // declares, read from the record rather than typed here (rule P-6). The row is read before the
    // question as a persona pair that may read the ledger, so the case reports the difference the
    // block made instead of a count of its own.
    const endpoint = external.endpoint;

    if (endpoint === undefined) {
      throw new Error(
        'The external entry of the model catalogue declares no outbound endpoint, so a refusal of it ' +
          'lands on no ledger row and this case has no endpoint to count.',
      );
    }

    const opener = (await backend.getActiveUser()).data.id;

    await actAs(backend, AUDITOR);

    const countedBefore = firstOf(
      (await backend.getOutboundLedger({})).data.filter((row) => row.endpoint === endpoint),
      'ledger row for the endpoint the external model entry declares',
    );

    await actAs(backend, opener);

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

    // The refusal was an attempt at the entry's declared destination, so it is counted on that
    // endpoint's row and nowhere else: one more blocked event, the same allowed count, and the row's
    // last attempt the instant of the event the failure names (AAP 0.6.3, AAP 0.8).
    const countedAfter = firstOf(
      (await backend.getOutboundLedger({})).data.filter((row) => row.endpoint === endpoint),
      'ledger row for the endpoint the external model entry declares',
    );
    const aboutEndpoint = (await backend.listAuditEvents({ objectRef: endpoint })).data;
    const appended = aboutEndpoint.find((event) => event.id === recorded);

    expect(countedAfter.blocked).toBe(countedBefore.blocked + 1);
    expect(countedAfter.allowed).toBe(countedBefore.allowed);
    expect(appended).toBeDefined();
    expect(countedAfter.lastAttempt).toBe(appended?.timestamp);

    expect(appended?.objectRef).toBe(endpoint);
    expect(appended?.actorType).toBe('policy');
    expect(appended?.policyId).toBe(rule);
    // The object reference names the destination; the payload still names the model refused for it.
    expect(appended?.after?.modelId).toBe(external.id);

    // And the block is filed nowhere else: the trail holds no event about the model entry with this
    // identifier, which is the object reference the refusal used before it was counted on an endpoint.
    const aboutModel = (await backend.listAuditEvents({ objectRef: external.id })).data;

    expect(aboutModel.some((event) => event.id === recorded)).toBe(false);
  }, CASE_TIMEOUT_MS);

  it('records the question a policy blocked beside the block it met, as one request under one trace', async () => {
    const backend = await readyBackend();
    const catalogue = (await backend.getModelCatalogue()).data;
    const external = firstOf(
      catalogue.models.filter((entry) => entry.boundary === 'external'),
      'external model entry',
    );
    const confidential = await confidentialDocumentOf(backend);

    // The endpoint the block is counted on, read from the record rather than typed here (rule P-6).
    const endpoint = external.endpoint;

    if (endpoint === undefined) {
      throw new Error(
        'The external entry of the model catalogue declares no outbound endpoint, so the block it ' +
          'meets is counted on no ledger row and this case has no pair to read.',
      );
    }

    // The persona the seeded blocked question was asked by. POL-007 decides on the entry's boundary
    // before any body is opened, so this question meets the block rather than a redaction refusal.
    await actAs(backend, ADMINISTRATOR);

    const problem = await refusalOf(() =>
      backend.askAssistant({
        question: UNSEEDED_QUESTION,
        modelId: external.id,
        contextRefs: [confidential.id],
      }),
    );

    expect(problem.type).toBe('policy');
    expect(problem.policyId).toMatch(POLICY_ID_PATTERN);

    if (problem.policyId === undefined || problem.auditEventId === undefined) {
      throw new Error(
        'A policy failure carries the rule that denied the call and the event it wrote.',
      );
    }

    const rule = problem.policyId;
    const recorded = problem.auditEventId;

    await actAs(backend, AUDITOR);

    // The pair is read the way the audit screen reads it — one filter per action — and told apart from
    // the seeded trail's own rows by the trace of this call, which both appended rows carry.
    const questionRows = (await backend.listAuditEvents({ action: 'assistant question' })).data.filter(
      (event) => event.traceId === problem.traceId,
    );
    const blockRows = (await backend.listAuditEvents({ objectRef: endpoint })).data.filter(
      (event) => event.traceId === problem.traceId,
    );

    const questionRow = firstOf(questionRows, 'assistant question event for the blocked question');
    const blockRow = firstOf(blockRows, 'policy block event for the blocked question');

    // One question, one record of it, and one block on the endpoint the blocked entry declares: this
    // is the seeded pairing, and the ledger still counts the refusal once.
    expect(questionRows).toHaveLength(1);
    expect(blockRows).toHaveLength(1);

    // The row records what was asked, as the seeded blocked question records it: the model entry the
    // question was put to, the block, the rule that decided it and the persona that asked.
    expect(questionRow.objectRef).toBe(external.id);
    expect(questionRow.result).toBe('blocked');
    expect(questionRow.policyId).toBe(rule);
    expect(questionRow.actorType).toBe('user');
    expect(questionRow.actorId).toBe(ADMINISTRATOR);
    expect(questionRow.after?.modelId).toBe(external.id);
    expect(questionRow.after?.context).toBe(confidential.id);

    // The two rows are one request: one trace, and the question is written first, so a chain read from
    // the question reaches the rule that answered it at the next position.
    expect(blockRow.traceId).toBe(questionRow.traceId);
    expect(blockRow.traceId).toBe(problem.traceId);
    expect(questionRow.sequence).toBe(blockRow.sequence - 1);

    // The failure still names the policy block, which is the record the block card opens, and the
    // block is recorded by the mechanism that made the decision.
    expect(blockRow.action).toBe('policy block');
    expect(blockRow.actorType).toBe('policy');
    expect(blockRow.id).toBe(recorded);
    expect(questionRow.id).not.toBe(recorded);
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

  it('withholds that body from an answer, which a seeded question would otherwise quote', async () => {
    const backend = await readyBackend();
    const released = await confidentialDocumentOf(backend);
    const catalogue = (await backend.getModelCatalogue()).data;
    const suggested = (await backend.listSuggestedQuestions()).data;

    expect(released.body.length).toBeGreaterThan(0);

    // The opening persona holds `document.confidential.read`, so a question whose template quotes the
    // body is answered rather than refused here. Which question that is comes from the seed rather
    // than from this case: every suggestion the port publishes is asked, and the first answer that
    // carries the body names the question the second half puts to a persona that may not read it.
    let quoting: string | undefined;

    for (const question of suggested) {
      const answer = (
        await backend.askAssistant({
          question: question.prompt,
          modelId: catalogue.defaultModelId,
          contextRefs: [],
        })
      ).data;

      if (answer.text.includes(released.body)) {
        quoting = question.prompt;
        break;
      }
    }

    if (quoting === undefined) {
      throw new Error(
        'No suggested question answers with the confidential body, so the answer path cannot be checked.',
      );
    }

    // Held in a `const` because the narrowed type does not survive into the arrow call below.
    const prompt = quoting;
    // The roles the contracts §7.1 matrix grants the permission, read from the matrix itself.
    const holders = rolesWith('document.confidential.read');

    expect(holders.length).toBeGreaterThan(0);

    await actAs(backend, ADMINISTRATOR);

    // The call throws rather than resolving, which is the assertion that no answer text — and so no
    // body in one — is produced for the persona the document read above already refuses.
    const problem = await refusalOf(() =>
      backend.askAssistant({
        question: prompt,
        modelId: catalogue.defaultModelId,
        contextRefs: [],
      }),
    );

    expect(problem.type).toBe('permission');
    expect(problem.requiredPermission).toBe('document.confidential.read');
    expect(problem.rolesWithPermission?.length ?? 0).toBeGreaterThan(0);
    expect(problem.rolesWithPermission).toEqual(expect.arrayContaining(holders));
    expect(problem.traceId.length).toBeGreaterThan(0);

    // The whole failure is serialised, as in the document case above: a body leaked anywhere in the
    // object graph fails this line, not only one the message happens to print.
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

    const trail = (await backend.listAuditEvents(WHOLE_TRAIL)).data;
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

    const trail = (await backend.listAuditEvents(WHOLE_TRAIL)).data;

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

    const trail = (await backend.listAuditEvents({ ...WHOLE_TRAIL, sort: 'sequence:asc' })).data;
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

  it('leaves the chain whole when a reset lands while an audited write is in flight', async () => {
    const backend = await readyBackend();
    const target = firstOf(await queueOf(backend), 'exception row');

    // One audited write first, so the session's chain ends on a hash of its own rather than on the
    // seeded trail's: the reset installs the freshly hashed seeded chain, and two chains that differ in
    // their tail are what makes a mistaken push visible to a verification at all.
    await backend.noteException(target.id, NOTE_TEXT);

    // Pressing "Reset demo data" while an audited write is on its way. The write computes its two
    // digests over the chain as it stands, and the reset installs a freshly hashed chain in place of
    // that one; a reset landing between those two steps would push the event onto the new chain with
    // the old tail's predecessor hash, and a verification would report a break nobody caused. Issued
    // and awaited together, so the two overlap exactly as a reader pressing the control mid-write does.
    await Promise.all([backend.noteException(target.id, NOTE_TEXT), backend.resetDemo()]);

    await actAs(backend, AUDITOR);

    const report = (await backend.verifyAuditChain()).data;

    expect(report.breaks).toEqual([]);
    // The reset may have replaced the chain before the write's event or after it, so the length is
    // asserted as a floor rather than as a count: the seeded trail is in the chain either way.
    expect(report.eventsChecked).toBeGreaterThanOrEqual(SEEDED_EVENT_COUNT);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 9. The tamper control — one reported break, no hash rewritten
 * ------------------------------------------------------------------------------------------- */

describe('the tamper control', () => {
  it('reports exactly one break at the edited event and leaves every stored hash as it stood', async () => {
    const backend = await readyBackend();

    await actAs(backend, AUDITOR);

    const before = (await backend.listAuditEvents(WHOLE_TRAIL)).data;
    const hashesBefore = before.map((event) => ({
      id: event.id,
      eventHash: event.eventHash,
      previousHash: event.previousHash,
    }));
    const clean = (await backend.verifyAuditChain()).data;

    expect(clean.breaks).toEqual([]);

    await backend.setSimulation('tampered-audit', true);

    const after = (await backend.listAuditEvents(WHOLE_TRAIL)).data;

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
 * template filled from the wrong member of the scenario still reads as a sentence but fails here. It is
 * also AAP 0.8's sentence character for character, closing figure included, which is what makes it an
 * anchor rather than a snapshot of current output: the delayed revenue it ends with is the baseline's own
 * delayed revenue less the recommended option's residual, and the plan's quote fixes that figure at
 * 2,257,000, the 1,220 late units of `CASE-1184` at the 1,850 price the order records carry.
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

    // One measure, one computed value: the seeded plan of this same option states the delayed revenue
    // the set measures it avoiding, so the record's figure and the sentence's last figure are one
    // arithmetic over one set of measurements and cannot drift apart.
    const seededPlan = lodged.find((approval) => approval.scenarioId === plan.id);

    if (seededPlan === undefined) {
      throw new Error('The records state no pending plan for the option the set recommends.');
    }

    expect(seededPlan.protectedRevenueEur).toBe(baseline.revenueDelayedEur - plan.revenueDelayedEur);

    // An option that sets a plan in motion writes the case's own steps back; the baseline recovers
    // nothing, and the rejected position cannot be carried out, so neither writes anything back.
    expect(baseline.writeBacks).toEqual([]);
    expect(beyondMaximum.writeBacks).toEqual([]);
    expect(plan.writeBacks.length).toBeGreaterThan(0);
    expect(plan.writeBacks).toEqual(airOnly.writeBacks);
  }, CASE_TIMEOUT_MS);

  it("answers a reference to an option measured from the exception's own case", async () => {
    const backend = await readyBackend();
    const lodged = (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data;
    const subject = firstOf(lodged, 'pending approval').exceptionId;
    const set = (await backend.getScenarioSet(subject)).data;
    const recommended = set.scenarios.find((option) => option.id === set.recommendedId);

    if (recommended === undefined) {
      throw new Error('The measured set recommends no option, so the case cannot run.');
    }

    // The columns are measured rather than shipped, which is the set no seeded record holds: that is
    // the premise of the case, and the reason the evidence read could not answer them before.
    expect(recommended.origin).toBe('solver');

    const payload = (await backend.getEvidence(recommended.id)).data;

    // The payload states the option's own measures, read from the record the option set just returned
    // rather than typed here (rule P-6), so a payload built from a neighbouring option fails.
    expect(payload.value).toContain(`${String(recommended.unitsLate)} units late`);
    expect(payload.value).toContain(`at most ${String(recommended.maxDaysLate)} days`);
    expect(payload.upstream).toContain(recommended.exceptionId);
    expect(payload.confidence).toEqual(recommended.confidence);

    // A suffix no option set carries, appended to an identifier the records do answer: the reference
    // still reaches the scenario family, and a family that found nothing there must say so rather than
    // answer with a neighbouring record.
    const unanswered: ScenarioId = `${recommended.id}-absent`;
    const refused = await refusalOf(() => backend.getEvidence(unanswered));

    expect(refused.type).toBe('not-found');
    expect(refused.message).toContain(unanswered);
  }, CASE_TIMEOUT_MS);

  /**
   * A session whose records a case may break, and the context a port call hands the evidence handler,
   * acting as the persona a fresh session acts as.
   *
   * The adapter keeps its own state private, so a case that needs a broken record set builds the
   * session's state directly, as the atlas cases do: the factory the bootstrap uses, the persona the
   * matrix states for the session's own active user, and the trace identifier of the call about to be
   * made.
   *
   * @returns The state, and the context a handler reads it through.
   */
  async function recordsSession(): Promise<HandlerContext> {
    const state = await createMockState();
    const record = firstOf(
      state.records.users.filter((user) => user.id === state.activeUserId),
      'seeded opening persona',
    );

    return { state, actor: personaFor(record), traceId: traceIdFor(state.requestCount + 1) };
  }

  it('reports a record defect rather than answering that no option set names the reference', async () => {
    const context = await recordsSession();
    const measured = firstOf(
      context.state.records.exceptions.filter((record) => record.solverCaseId !== undefined),
      'exception with a solver case',
    );
    const caseId = measured.solverCaseId;

    if (caseId === undefined) {
      throw new Error('The measured exception names no solver case, so the case cannot run.');
    }

    const set = await getScenarioSet(context, measured.id);
    const recommended = set.scenarios.find((option) => option.id === set.recommendedId);

    if (recommended === undefined) {
      throw new Error('The measured set recommends no option, so the case cannot run.');
    }

    expect(recommended.origin).toBe('solver');

    // The defect this case creates: a case identifier derived from the one the records state, which the
    // loaded records therefore do not hold. No identifier is typed here (rule P-6).
    const missingCaseId = `${caseId}-absent`;

    // An exception the records give neither a case nor an option set of their own, laid ahead of the
    // measured one so the walk meets the broken record first. That order is what the case is about: a
    // broken record must not hide a reference to an option another exception's set does name.
    const broken = firstOf(
      context.state.records.exceptions.filter(
        (record) =>
          record.id !== measured.id &&
          record.solverCaseId === undefined &&
          !context.state.records.exceptionScenarios.some(
            (seeded) => seeded.exceptionId === record.id,
          ),
      ),
      'exception with no option set of its own',
    );

    expect(context.state.records.solverCases.map((record) => record.id)).not.toContain(missingCaseId);

    context.state.records = {
      ...context.state.records,
      exceptions: [
        { ...broken, solverCaseId: missingCaseId },
        ...context.state.records.exceptions.filter((record) => record.id !== broken.id),
      ],
    };

    // The reference the healthy set names still resolves: the failure is remembered and the walk carries
    // on, so one exception's broken record does not hide another exception's option (AAP 0.18.1).
    const payload = await getEvidence(context, recommended.id);

    expect(payload.value).toContain(`${String(recommended.unitsLate)} units late`);
    expect(payload.upstream).toContain(recommended.exceptionId);

    // A reference of the same shape that no set names reaches the remembered defect at the end of its
    // walk, and it arrives as the failure naming the case to repair rather than as the statement that
    // the record set holds no such scenario, which the swallowed failure used to produce.
    const unnamed: ScenarioId = `${recommended.id}-absent`;
    const refused = await refusalOf(() => getEvidence(context, unnamed));

    expect(refused.type).toBe('not-found');
    expect(refused.message).toContain(missingCaseId);
    expect(refused.message).toContain(broken.id);
    expect(refused.message).not.toContain('The record set holds no scenario');
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

  it.each([
    { family: 'plant', lane: 'plants' },
    { family: 'supplier', lane: 'suppliers' },
    { family: 'origin', lane: 'origins' },
    { family: 'customer', lane: 'customers' },
  ] as const)(
    'resolves the evidence behind a $family node of the FileMap canvas',
    async ({ lane }) => {
      const backend = await readyBackend();

      await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

      const topology = (await backend.getTopology(NO_SCOPE)).data;
      const node = firstOf(topology[lane], `${lane} node`);

      // The identifier a canvas node carries is the record's own — the topology handler copies the
      // record into the node — so the drawer's read answers the node rather than refusing it, which is
      // the half of AAP 0.2.1 F12 every topology node was missing.
      const evidence = (await backend.getEvidence(node.id)).data;

      // Every member is the record's own: the value opens with the name the node is labelled with, and
      // a seeded record is `Simulated data` rather than a computed figure (rules P-1, P-6).
      expect(evidence.value.startsWith(node.label)).toBe(true);
      expect(evidence.provenance).toBe('first_party');
      expect(evidence.label).toBe(SIM_LABELS[0]);
      expect(evidence.formula).not.toBe('');
      expect(evidence.inputs.length).toBeGreaterThan(0);
      expect(evidence.confidence.level).toBe('high');
      expect(evidence.missingInputs).toEqual([]);
    },
    CASE_TIMEOUT_MS,
  );

  it('refuses the evidence behind a plant node outside the acting persona’s plant scope', async () => {
    const backend = await readyBackend();

    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const topology = (await backend.getTopology(NO_SCOPE)).data;
    const persona = await actAs(backend, PLANT_MANAGER);
    const outside = topology.plants.find((node) => !persona.plantIds.includes(node.id));

    if (outside === undefined) {
      throw new Error(
        'Every plant node lies inside the plant manager’s scope, so the case cannot observe a refusal.',
      );
    }

    // A node reaches plants rather than belonging to one, so the scope is decided over every plant the
    // records place it in; a plant node reaches its own and no other, and the refusal names both the
    // node and that plant (contracts §7.1, AAP 0.2.1).
    const problem = await refusalOf(() => backend.getEvidence(outside.id));

    expect(problem.type).toBe('permission');
    expect(problem.message).toContain(outside.id);
    expect(problem.requiredPermission).toBe('evidence.read');
  }, CASE_TIMEOUT_MS);

  it('answers every reference the overview screen composes with the aggregate’s own figure', async () => {
    const backend = await readyBackend();

    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const overview = (await backend.getOverview(NO_SCOPE)).data;
    const tiles = [
      { ref: 'overview:open-exceptions', figure: overview.openExceptions },
      { ref: 'overview:revenue-at-risk', figure: overview.revenueAtRiskEur },
      { ref: 'overview:customer-orders-at-risk', figure: overview.customerOrdersAtRisk },
      { ref: 'overview:median-hours-to-approved-plan', figure: overview.medianHoursToApprovedPlan },
    ] as const;

    for (const tile of tiles) {
      const evidence = (await backend.getEvidence(tile.ref)).data;

      // The value opens with the aggregate's own number, so the drawer and the tile report one figure
      // computed by one function rather than two that could drift apart (rule P-6). A computed figure
      // carries the computed label and the rule that produced it (rule P-1).
      expect(evidence.value.startsWith(`${tile.figure} `)).toBe(true);
      expect(evidence.provenance).toBe('computed');
      expect(evidence.label).toBe(SIM_LABELS[1]);
      expect(evidence.formula).not.toBe('');
      expect(evidence.inputs.length).toBeGreaterThan(0);

      // The plant grouping is the aggregate's upstream, so the three figures it sums name their plants
      // there. The median is measured over the exceptions' own detection-to-approval pairs and names no
      // plant, and its payload states the member empty rather than a plant it was not computed from.
      expect(Array.isArray(evidence.upstream)).toBe(true);

      if (tile.ref !== 'overview:median-hours-to-approved-plan') {
        expect(evidence.upstream.length).toBeGreaterThan(0);
      }

      expect(evidence.confidence.reason).not.toBe('');
      expect(Array.isArray(evidence.downstream)).toBe(true);
      expect(Array.isArray(evidence.missingInputs)).toBe(true);
      expect(Array.isArray(evidence.documents)).toBe(true);
    }

    // The by-plant row and the series point are the two composed references the screen puts on a bar
    // and on a chart mark, and each answers with the row's or the day's own figures.
    const row = firstOf(overview.byPlant, 'by-plant row');
    const plantEvidence = (await backend.getEvidence(`overview:plant/${row.plantId}/revenue-at-risk`))
      .data;

    expect(plantEvidence.value.startsWith(`${row.revenueAtRiskEur} `)).toBe(true);
    expect(plantEvidence.value).toContain(row.plantName);
    expect(plantEvidence.provenance).toBe('computed');

    const point = firstOf(overview.openResolvedSeries, 'series point');
    const opened = (await backend.getEvidence(`overview:day/${point.date}/open`)).data;
    const resolved = (await backend.getEvidence(`overview:day/${point.date}/resolved`)).data;

    expect(opened.value.startsWith(`${point.open} `)).toBe(true);
    expect(resolved.value.startsWith(`${point.resolved} `)).toBe(true);
    expect(opened.value).toContain(point.date);
    expect(resolved.value).toContain(point.date);

    // The sentence agrees with the figure it states: a day that counts one exception reads "1
    // exception opened on …", and a count of any other size reads "2 exceptions opened on …", so the
    // drawer never says "1 exceptions". The wording is the service's own (rule P-6), and the series is
    // the read's, so neither the day nor either count is written into this case.
    const singularDays = overview.openResolvedSeries.filter(
      (day) => day.open === 1 || day.resolved === 1,
    );

    expect(
      singularDays.length,
      'the series counts a day holding exactly one exception in one of its two readings',
    ).toBeGreaterThan(0);

    for (const day of singularDays) {
      const dayOpened = (await backend.getEvidence(`overview:day/${day.date}/open`)).data;
      const dayResolved = (await backend.getEvidence(`overview:day/${day.date}/resolved`)).data;

      expect(dayOpened.value).toBe(
        `${day.open} ${day.open === 1 ? 'exception' : 'exceptions'} opened on ${day.date}`,
      );
      expect(dayResolved.value).toBe(
        `${day.resolved} ${day.resolved === 1 ? 'exception' : 'exceptions'} resolved on ${day.date}`,
      );
    }
  }, CASE_TIMEOUT_MS);

  it('answers every ribbon reference the canvas screen composes with the tile’s own figure', async () => {
    const backend = await readyBackend();

    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const tiles = (await backend.getCanvasRibbon(NO_SCOPE)).data;

    for (const tile of tiles) {
      const evidence = (await backend.getEvidence(`canvas:${tile.id}`)).data;

      expect(evidence.value.startsWith(`${tile.value} `)).toBe(true);
      expect(evidence.provenance).toBe('computed');
      expect(evidence.label).toBe(SIM_LABELS[1]);
      expect(evidence.formula).not.toBe('');

      // The drawer states the tile's own provenance rather than a second reading of it: every ribbon
      // tile is a computed figure (rule P-5), and the payload's provenance is the one the tile carries.
      expect(evidence.provenance).toBe(tile.provenance);
    }

    // The emptied-queue trigger empties the population the ribbon counts, so the aggregate's evidence
    // reports the same zero the tile does rather than a figure from the records the queue no longer
    // lists (AAP §0.12.4, T-17).
    await backend.setSimulation('empty-queue', true);

    const emptied = (await backend.getEvidence('canvas:open-exceptions')).data;

    expect(emptied.value.startsWith('0 ')).toBe(true);
  }, CASE_TIMEOUT_MS);

  it('answers a filtered aggregate reference over the population its selection states, not the whole scope', async () => {
    const backend = await readyBackend();

    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const unrestricted = (await backend.getOverview(NO_SCOPE)).data;
    const row = firstOf(unrestricted.byPlant, 'by-plant row');
    const plantSelection = `?plants=${row.plantId}`;
    const plantScope: Scope = { plants: [row.plantId], products: [] };
    const filtered = (await backend.getOverview(plantScope)).data;
    const filteredRow = firstOf(filtered.byPlant, 'by-plant row');
    const point = firstOf(filtered.openResolvedSeries, 'series point');

    /* The narrowing has to be a narrowing, or the case would observe a drawer that agrees with the tile
       only because both cover the persona's whole scope. */
    expect(unrestricted.byPlant.length).toBeGreaterThan(filtered.byPlant.length);
    expect(filtered.openExceptions).toBeLessThan(unrestricted.openExceptions);

    /* The reference a tile composes states the selection it was read with, so the drawer's aggregate is
       computed over the same plants the tile counted rather than over every plant the acting role
       reaches (AAP §0.2.1 F12, PR-6, AAP §0.12.1 "Scope resolution"). The value compared is the filtered
       read's own figure, so the tile and its evidence are one figure from one function. */
    const tiles = [
      { key: 'open-exceptions', figure: filtered.openExceptions },
      { key: 'revenue-at-risk', figure: filtered.revenueAtRiskEur },
      { key: 'customer-orders-at-risk', figure: filtered.customerOrdersAtRisk },
      { key: 'median-hours-to-approved-plan', figure: filtered.medianHoursToApprovedPlan },
    ] as const;

    for (const tile of tiles) {
      const evidence = (await backend.getEvidence(`overview:${tile.key}${plantSelection}`)).data;

      expect(evidence.value.startsWith(`${tile.figure} `)).toBe(true);

      // The payload names the population it was computed over, and that population is the filtered
      // scope: the plant list is the one plant the reference named, not the persona's whole scope.
      expect(evidence.inputs).toContain(`selection = plants ${row.plantId}; products all`);
    }

    /* The by-plant row and the series point carry the same selection, so a filtered figure's drawer
       agrees with the row or the mark it was opened from. */
    const rowEvidence = (
      await backend.getEvidence(
        `overview:plant/${filteredRow.plantId}/revenue-at-risk${plantSelection}`,
      )
    ).data;
    const pointEvidence = (
      await backend.getEvidence(`overview:day/${point.date}/open${plantSelection}`)
    ).data;

    expect(rowEvidence.value.startsWith(`${filteredRow.revenueAtRiskEur} `)).toBe(true);
    expect(rowEvidence.value).toContain(filteredRow.plantName);
    expect(pointEvidence.value.startsWith(`${point.open} `)).toBe(true);
    expect(pointEvidence.inputs).toContain(`selection = plants ${row.plantId}; products all`);

    // The product selection travels the same way, and the payload names the product it counted.
    const productId = firstOf(productsOf(await queueOf(backend)), 'product of the queue');
    const productScope: Scope = { plants: [], products: [productId] };
    const productOverview = (await backend.getOverview(productScope)).data;
    const productEvidence = (
      await backend.getEvidence(`overview:revenue-at-risk?products=${productId}`)
    ).data;

    expect(productEvidence.value.startsWith(`${productOverview.revenueAtRiskEur} `)).toBe(true);
    expect(productEvidence.inputs).toContain(`selection = plants all; products ${productId}`);

    // The canvas ribbon composes the same grammar, so every one of its six tiles opens the figure the
    // filtered ribbon returned rather than the persona-wide one.
    const ribbon = (await backend.getCanvasRibbon(plantScope)).data;

    expect(tileValueOf(ribbon, 'open-exceptions')).toBe(filtered.openExceptions);

    for (const tile of ribbon) {
      const evidence = (await backend.getEvidence(`canvas:${tile.id}${plantSelection}`)).data;

      expect(evidence.value.startsWith(`${tile.value} `)).toBe(true);
    }
  }, CASE_TIMEOUT_MS);

  it('refuses an aggregate selection it cannot read instead of computing the whole scope', async () => {
    const backend = await readyBackend();

    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const overview = (await backend.getOverview(NO_SCOPE)).data;
    const row = firstOf(overview.byPlant, 'by-plant row');
    const productId = firstOf(productsOf(await queueOf(backend)), 'product of the queue');
    const outside = overview.byPlant.find((candidate) => candidate.plantId !== row.plantId);

    if (outside === undefined) {
      throw new Error(
        'Every by-plant row names the same plant, so the case cannot observe a reference outside the ' +
          'selection it states.',
      );
    }

    /* Each reference below states a selection the drawer cannot read: an empty value, an empty segment,
       a parameter stated twice, a plant the record set does not hold, a product it does not hold, and a
       plant identifier offered where a product belongs. Each is refused as `'not-found'` naming the
       reference rather than having its selection dropped, because dropping it would compute the figure
       over the acting persona's whole scope and hand the drawer a number the tile never showed (AAP
       §0.2.1 F12, PR-6). */
    const unreadable = [
      'overview:revenue-at-risk?plants=',
      `overview:revenue-at-risk?plants=${row.plantId},`,
      `overview:revenue-at-risk?plants=${row.plantId}&plants=${row.plantId}`,
      `overview:revenue-at-risk?plants=${row.plantId}-unknown`,
      `canvas:open-exceptions?products=${productId}-unknown`,
      `overview:revenue-at-risk?plants=${row.plantId}&products=${row.plantId}`,
    ] as const;

    for (const ref of unreadable) {
      const problem = await refusalOf(() => backend.getEvidence(ref));

      expect(problem.type).toBe('not-found');
      expect(problem.message).toContain(ref);
    }

    /* A parameter the grammar does not carry is a defect in the request rather than an unreadable
       population, so it is refused as `'validation'` — refused all the same, never ignored. */
    const unknownParameter = await refusalOf(() =>
      backend.getEvidence(`overview:revenue-at-risk?plant=${row.plantId}`),
    );

    expect(unknownParameter.type).toBe('validation');
    expect(unknownParameter.message).toContain('query parameter plant');

    // A row the reference's own selection excludes is refused as well, so the drawer never opens on a
    // neighbouring plant's figure.
    const problem = await refusalOf(() =>
      backend.getEvidence(
        `overview:plant/${outside.plantId}/revenue-at-risk?plants=${row.plantId}`,
      ),
    );

    expect(problem.type).toBe('not-found');
    expect(problem.message).toContain(outside.plantId);
  }, CASE_TIMEOUT_MS);

  it('answers the material and the production line the impact chain draws, from their own records', async () => {
    const backend = await readyBackend();

    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const row = firstOf(await queueOf(backend), 'exception row');
    const detail = (await backend.getExceptionDetail(row.id)).data;
    const material = detail.impactChain.find((node) => node.kind === 'material');
    const line = detail.impactChain.find((node) => node.kind === 'line');

    if (material === undefined || line === undefined) {
      throw new Error(
        `The impact chain of ${row.id} holds no material and no production-line node, so the case ` +
          'cannot observe the two families the chain draws.',
      );
    }

    for (const node of [material, line]) {
      const evidence = (await backend.getEvidence(node.ref)).data;

      // Both nodes name the record behind them, so the drawer answers with that record's own fields and
      // a seeded record is `Simulated data` rather than a computed figure (rules P-1, P-6).
      expect(evidence.value.startsWith(node.label)).toBe(true);
      expect(evidence.provenance).toBe('first_party');
      expect(evidence.label).toBe(SIM_LABELS[0]);
      expect(evidence.formula).not.toBe('');
      expect(evidence.inputs.length).toBeGreaterThan(0);
      expect(evidence.confidence.level).toBe('high');

      // The record the node names places it in the chain, so the payload states what the node came from,
      // and the gaps it reports are the sentences the exceptions behind it state rather than a
      // placeholder (AAP 0.12.2's `Evidence.missingInputs`).
      expect(evidence.upstream.length).toBeGreaterThan(0);
      expect(evidence.missingInputs.every((input) => input.length > 0)).toBe(true);
    }
  }, CASE_TIMEOUT_MS);

  it('refuses an aggregate or a record reference nothing answers, naming the reference it sent', async () => {
    const backend = await readyBackend();

    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const overview = (await backend.getOverview(NO_SCOPE)).data;
    const row = firstOf(overview.byPlant, 'by-plant row');
    const point = firstOf(overview.openResolvedSeries, 'series point');
    const unknownRecord = `${firstOf(await queueOf(backend), 'exception row').id}-unknown`;

    /* Each reference below names something no aggregate and no record holds: a key no aggregate module
       produces, a plant no by-plant row carries, a series member the overview does not count, and a
       record identifier the record set does not hold. Each is refused as `'not-found'` and quotes the
       reference it was sent, so the drawer reports what it could not resolve instead of opening on a
       neighbour's figure (AAP §0.2.1 F12). */
    const refusals = [
      'overview:not-an-aggregate',
      'canvas:not-a-tile',
      `overview:plant/${row.plantId}-unknown/revenue-at-risk`,
      `overview:day/${point.date}/not-a-member`,
      unknownRecord,
    ] as const;

    for (const ref of refusals) {
      const problem = await refusalOf(() => backend.getEvidence(ref));

      expect(problem.type).toBe('not-found');
      expect(problem.message).toContain(ref);
    }
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

    // The reference the card's figures carry is the approval's own record, and it is a route rather
    // than a dead string: the evidence read resolves it for the same persona (AAP 0.2.1's F12). An
    // await on a rejected read fails here, which is what proves the drawer would open on this
    // reference rather than on its not-found region.
    expect(outcome.evidenceRef).toBe(lodged.id);

    const evidence = (await backend.getEvidence(outcome.evidenceRef)).data;

    expect(evidence.value).toContain(approved.status);
    expect(evidence.upstream).toContain(lodged.exceptionId);
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

    // The change landed nowhere, so the exception the plan answers stays open: the same rule read from
    // the record's side rather than from the card's.
    expect((await backend.getExceptionDetail(lodged.exceptionId)).data.exception.status).toBe(
      OPEN_STATUS,
    );

    await backend.setSimulation('partial', false);

    const retried = (await backend.retryWriteBack(lodged.id, failedStep.recordRef)).data;

    expect(retried.state).toBe('succeeded');

    const completed = (await backend.getApproval(lodged.id)).data;
    const landed = (await backend.getApprovalOutcome(lodged.id)).data;

    expect(completed.writeBacks.every((step) => step.state === 'succeeded')).toBe(true);
    expect(measuresOf(landed.resulting)).toEqual(measuresOf(landed.planned));

    // The retry landed the change, so the exception is resolved by the same continuation a decision
    // uses: a failure retried to success closes the disruption it was interrupting.
    expect((await backend.getExceptionDetail(lodged.exceptionId)).data.exception.status).toBe(
      RESOLVED_STATUS,
    );

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

    // The failure is recorded with its own message — the text the thrown failure carried — so the
    // event states why the write did not complete rather than only that it did not (AAP 0.2.2).
    const failedEvent = firstOf(
      stepEvents.filter((event) => event.result === 'failed'),
      'failed write-back event',
    );

    expect(failedEvent.after).toEqual({
      sequence: failedStep.sequence,
      system: failedStep.system,
      recordRef: failedStep.recordRef,
      state: 'failed',
      message: failure.message,
    });

    // A step that succeeded carries the payload it always did: the position, the system, the reference
    // and the state, with no message, because nothing failed to explain.
    const succeededEvent = firstOf(
      stepEvents.filter((event) => event.result === 'succeeded'),
      'successful write-back event',
    );

    expect(Object.keys(succeededEvent.after ?? {}).sort()).toEqual([
      'recordRef',
      'sequence',
      'state',
      'system',
    ]);
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
    read: async (backend) => (await backend.listAuditEvents(WHOLE_TRAIL)).data,
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

  it('empties the one population the queue and the overview are both computed over', async () => {
    const backend = await readyBackend();

    // `AUDITOR` reads the exception family, so the two reads below are ones the caller is entitled to
    // receive and the comparison is between two answers rather than between an answer and a refusal.
    await actAs(backend, AUDITOR);

    const overviewBefore = (await backend.getOverview(NO_SCOPE)).data;
    const queueBefore = await queueOf(backend);

    await backend.setSimulation('empty', true);

    const overviewWhileEmpty = (await backend.getOverview(NO_SCOPE)).data;

    /*
     * One population, two readings: the queue projects its rows from it and the overview counts, sums and
     * groups it, so a control that empties the session cannot show an empty queue beside tiles that still
     * count the exceptions the queue no longer lists (AAP 0.12.1, T-17).
     */
    expect((await backend.listExceptions({}, NO_SCOPE)).data).toHaveLength(0);
    expect(overviewWhileEmpty.openExceptions).toBe(0);
    expect(overviewWhileEmpty.revenueAtRiskEur).toBe(0);
    expect(overviewWhileEmpty.customerOrdersAtRisk).toBe(0);
    expect(
      overviewWhileEmpty.byPlant.every(
        (row) => row.openExceptions === 0 && row.revenueAtRiskEur === 0,
      ),
    ).toBe(true);
    expect(overviewWhileEmpty.changedSinceLastVisit).toHaveLength(0);

    // The two readings agreed before the trigger too, which is what makes the agreement below a property
    // of the reads rather than of the trigger.
    expect(queueBefore.length).toBeGreaterThan(0);
    expect(overviewBefore.openExceptions).toBeGreaterThan(0);

    await backend.setSimulation('empty', false);

    // Lifting the trigger restores both readings from the same records, unchanged.
    expect((await backend.getOverview(NO_SCOPE)).data).toEqual(overviewBefore);
    expect((await backend.listExceptions({}, NO_SCOPE)).data).toEqual(queueBefore);
  }, CASE_TIMEOUT_MS);
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
    const events = (await backend.listAuditEvents(WHOLE_TRAIL)).data;
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
 * 15. The shell's selection — one resolver, applied to every read it narrows
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

  it('reads one two-plant selection the same way in every member that takes a scope', async () => {
    const backend = await readyBackend();

    // The role that reaches every plant, so a selection naming two of them is a real narrowing of the
    // scope the role would otherwise read with.
    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const unrestrictedRows = (await backend.listExceptions({}, NO_SCOPE)).data;
    const unrestrictedOverview = (await backend.getOverview(NO_SCOPE)).data;
    const unrestrictedApprovals = (await backend.listApprovals({}, NO_SCOPE)).data;
    // The plants are the ones the network names, read through the port rather than typed (rule P-6).
    const plantIds = (await backend.getTopology(NO_SCOPE)).data.plants.map((node) => node.id);

    expect(plantIds.length).toBeGreaterThan(2);

    const pair = plantIds.slice(0, 2);
    const scope: Scope = { plants: pair, products: [] };

    const rows = (await backend.listExceptions({}, scope)).data;
    const overview = (await backend.getOverview(scope)).data;
    const plants = (await backend.getTopology(scope)).data.plants.map((node) => node.id);
    const approvals = (await backend.listApprovals({}, scope)).data;

    // The queue narrows, because the selection names fewer plants than the role reaches. A row recorded
    // at another plant may stay: the domain admits an exception that reaches a selected plant through
    // `alsoAffectsPlantIds` (src/domain/aggregation/exceptions.ts), which is the documented rule rather
    // than a second reading of the selection.
    expect(rows.length).toBeLessThan(unrestrictedRows.length);

    // The tile counts the open rows the queue lists under the same selection, so the two members cannot
    // describe two populations from one argument.
    expect(overview.openExceptions).toBe(rows.filter((row) => row.status === OPEN_STATUS).length);
    expect(overview.openExceptions).toBeLessThan(unrestrictedOverview.openExceptions);

    // The canvas network's plant family is exactly the two selected plants, never the role's four.
    expect(plants).toEqual(pair);

    // The inbox holds exactly the approvals whose exception sits at one of the two plants. An approval
    // names its exception rather than a plant, so the plant is read from the queue the same selection
    // returned, and no approval is offered to a reader the queue would hide its exception from.
    const plantOfException = new Map<ExceptionId, PlantId>(
      unrestrictedRows.map((row): [ExceptionId, PlantId] => [row.id, row.plantId]),
    );
    const atSelectedPlant = unrestrictedApprovals.filter((approval) => {
      const plantId = plantOfException.get(approval.exceptionId);

      return plantId !== undefined && pair.includes(plantId);
    });

    expect(approvals.map((approval) => approval.id)).toEqual(
      atSelectedPlant.map((approval) => approval.id),
    );
  }, CASE_TIMEOUT_MS);

  // The adapter's `listApprovals` is now a pure delegation of the approval family's read, so the plant
  // scope is applied there and this case calls that handler directly: it builds a session with the
  // adapter's own factory and hands the handler the pair a port call hands it.
  it('admits nothing for a plant set naming no plant, and withholds an approval it cannot place', async () => {
    const state = await createMockState();
    const record = firstOf(state.records.users, 'seeded persona');
    // The adapter hands a handler the call's own correlation identifier, minted from the ticket it takes
    // at the call's entry. A case that calls the handler directly mints the same value from the ticket
    // the session would take next, so the context below is the pair a port call would hand over and
    // nothing in this case depends on the adapter having done it.
    const context: HandlerContext = {
      state,
      actor: personaFor(record),
      traceId: traceIdFor(state.requestCount + 1),
    };
    const keysOf = (rows: readonly Approval[]): string[] => rows.map((row) => row.id);

    const visible = await listApprovals(context, {});

    // The persona reaches more than one approval, so a record that goes missing below is observable as
    // one that is missing rather than as an inbox that was empty all along.
    expect(visible.length).toBeGreaterThan(1);

    const placeable = firstOf(visible, 'approval the persona may read');
    const subject = firstOf(
      state.records.exceptions.filter((exception) => exception.id === placeable.exceptionId),
      'exception the approval names',
    );

    // A plant set naming no plant admits nothing: a resolved selection is never read as "all plants".
    expect(await listApprovals(context, { plantIds: [] })).toEqual([]);

    // The record's own plant does admit it, which is what makes the withholding below a statement about
    // the subject the records cannot place rather than about the persona.
    expect(keysOf(await listApprovals(context, { plantIds: [subject.plantId] }))).toContain(
      placeable.id,
    );

    // The records lose the exception the approval names, so the approval has no plant to be placed at.
    state.records = {
      ...state.records,
      exceptions: state.records.exceptions.filter((exception) => exception.id !== subject.id),
    };

    const after = await listApprovals(context, {});

    // The filter fails closed on a subject it cannot resolve instead of admitting the record to every
    // role, and every approval it can still place comes back, so the withholding is that subject's alone.
    expect(keysOf(after)).not.toContain(placeable.id);
    expect(keysOf(after)).toEqual(
      keysOf(visible.filter((approval) => approval.exceptionId !== subject.id)),
    );
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 18. The list parameters of the collection reads — contracts §9, AAP 0.6.3 and AAP 0.12.3
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

  it('pages and orders the exception queue', async () => {
    await expectPageableAndSortable<ExceptionRow>({
      read: (backend, query) => backend.listExceptions(query, NO_SCOPE),
      reader: HEAD_OF_SUPPLY_CHAIN,
      keyOf: (row) => row.id,
      sortField: 'id',
      valueOf: (row) => row.id,
    });
  }, CASE_TIMEOUT_MS);

  // The approval inbox needs its own case rather than the shared helper above: `listApprovals` takes
  // the shell's scope beside the list parameters, and a status filter the other four reads do not
  // carry, so neither fits the helper's shape.
  it('pages the approvals a status filter leaves rather than a page it filters', async () => {
    const backend = await readyBackend();
    const keysOf = (rows: readonly Approval[]): string[] => rows.map((row) => row.id);
    const waiting = firstOf(
      (await backend.listApprovals({ status: PENDING_APPROVAL_STATUS }, NO_SCOPE)).data,
      'pending approval',
    );

    // Two more records of the same plan, through the port, so the filtered population runs past one page
    // and the cursor half below has a position to continue from. The adapter accepts a repeated request
    // as a record of its own, which is what the audit-append case drives several of at once.
    await backend.requestApproval({ exceptionId: waiting.exceptionId, scenarioId: waiting.scenarioId });
    await backend.requestApproval({ exceptionId: waiting.exceptionId, scenarioId: waiting.scenarioId });

    const every = (await backend.listApprovals({}, NO_SCOPE)).data;
    const population = (await backend.listApprovals({ status: PENDING_APPROVAL_STATUS }, NO_SCOPE))
      .data;

    // The filtered population is the read's own order restricted to the status, and it is shorter than
    // that order, so the page below has something to cut and cutting it before the filter would lose a
    // row the population holds.
    expect(keysOf(population)).toEqual(
      keysOf(every.filter((approval) => approval.status === PENDING_APPROVAL_STATUS)),
    );
    expect(population.length).toBeGreaterThan(PAGE_SIZE);
    expect(every.length).toBeGreaterThan(population.length);

    // `limit` bounds the population rather than a page of the unfiltered order: the page is the first
    // `PAGE_SIZE` of the filtered records. Narrowed the other way round, the first page of the
    // unfiltered order would answer with fewer rows than asked for while the population still held them.
    const page = (
      await backend.listApprovals({ status: PENDING_APPROVAL_STATUS, limit: PAGE_SIZE }, NO_SCOPE)
    ).data;

    expect(keysOf(page)).toEqual(keysOf(population).slice(0, PAGE_SIZE));

    // A limit at the population's own length asks for all of it and answers with all of it: a shorter
    // answer would mean the page had been cut before the status was applied.
    const whole = (
      await backend.listApprovals(
        { status: PENDING_APPROVAL_STATUS, limit: population.length },
        NO_SCOPE,
      )
    ).data;

    expect(keysOf(whole)).toEqual(keysOf(population));

    // The cursor continues the filtered order from the position the page ended at, with no gap and no
    // repeat, so the two pages together are the population.
    const cursor = lastOf(page, 'approval on the page').id;
    const rest = (
      await backend.listApprovals(
        { status: PENDING_APPROVAL_STATUS, limit: PAGE_SIZE, cursor },
        NO_SCOPE,
      )
    ).data;

    expect(keysOf(rest)).toEqual(keysOf(population).slice(PAGE_SIZE));
    expect(keysOf([...page, ...rest])).toEqual(keysOf(population));
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 19. The response envelope — AAP 0.6.3, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

describe('the response envelope', () => {
  it('carries the freshness records, the simulation marker and a trace identifier on a read and a write', async () => {
    const backend = await readyBackend();
    const target = firstOf(await queueOf(backend), 'exception row');

    // One read and one write, served through the same envelope: the note answers with the exception it
    // recorded the note on, so both halves of the port are held to the one shape they share rather than
    // to the three members of a single member's payload.
    const served = [
      ['read', await backend.getOverview(NO_SCOPE)],
      ['write', await backend.noteException(target.id, NOTE_TEXT)],
    ] as const;

    for (const [half, result] of served) {
      // The six sources' state at the moment of the call, as records rather than as a count (AAP 0.2.1):
      // a banner cannot name a source the envelope did not carry.
      expect(
        result.meta.freshness.length,
        `the ${half} carries no freshness record`,
      ).toBeGreaterThan(0);

      for (const record of result.meta.freshness) {
        expect(SOURCE_IDS).toContain(record.source);
      }

      // The literal simulation marker the persistent badge rests on (rule P-1, AAP 0.6.3).
      expect(result.meta.simulated, `the ${half} does not declare itself simulated`).toBe(true);

      // The call's correlation identifier, asserted as a property and never as a value: it is derived
      // from the session's counter, so a case that typed one would restate the adapter (rule P-6).
      expect(typeof result.meta.traceId, `the ${half} carries no trace identifier`).toBe('string');
      expect(
        result.meta.traceId.trim().length,
        `the ${half} carries an empty trace identifier`,
      ).toBeGreaterThan(0);
    }

    const [, read] = served[0];
    const [, write] = served[1];

    // Two calls are two correlations, so the identifier names the call rather than the session.
    expect(read.meta.traceId).not.toBe(write.meta.traceId);
  }, CASE_TIMEOUT_MS);

/* ---------------------------------------------------------------------------------------------
 * 25. The partial trigger — the freshness every result carries, yielding to a stale or offline report
 * ------------------------------------------------------------------------------------------- */

  it('reports the partial trigger on the source that answered incompletely, yielding to a stale or offline report', async () => {
    const backend = await readyBackend();
    const asSeeded = await freshnessOf(backend, APPROVAL_GATE_SOURCE);

    await backend.setSimulation('partial', true);

    const asPartial = await freshnessOf(backend, APPROVAL_GATE_SOURCE);

    // The trigger reaches a screen through the one array every screen derives its state from, so the
    // partial notice is raised from a report rather than from a branch on the flag (AAP 0.12.1).
    expect(asPartial.state).toBe('partial');

    // The report keeps the instant the records carry rather than recomputing one (contracts §1).
    expect(asPartial.asOf).toBe(asSeeded.asOf);

    /*
     * The three reports are one precedence rather than three independent statements: a source that is out
     * of date outranks one that answered incompletely, and a source that did not answer at all outranks
     * both. A screen reading this array therefore cannot be told two things about one source.
     */
    await backend.setSimulation('stale', true);

    expect((await freshnessOf(backend, APPROVAL_GATE_SOURCE)).state).toBe('stale');

    await backend.setSimulation('offline', true);

    expect((await freshnessOf(backend, APPROVAL_GATE_SOURCE)).state).toBe('unavailable');

    await backend.setSimulation('offline', false);
    await backend.setSimulation('stale', false);
    await backend.setSimulation('partial', false);

    // Lifting them all restores the seeded report, so the trigger changed what was reported rather than
    // what the record set holds.
    expect(await freshnessOf(backend, APPROVAL_GATE_SOURCE)).toEqual(asSeeded);
  }, CASE_TIMEOUT_MS);

  it('gives every call issued in one turn an identifier of its own', async () => {
    const backend = await readyBackend();
    const target = firstOf(await queueOf(backend), 'exception row');

    // The overlap the identifier has to survive: a write issued first and the reads a screen mounts
    // behind it. The write awaits its two digests while the reads are served, so a value read from the
    // counter after a call has entered can be taken by a neighbour — the audited write issued first is
    // the shape that shows it, because it is the call still in flight when the reads behind it answer.
    const [written, overview, queue] = await Promise.all([
      backend.noteException(target.id, NOTE_TEXT),
      backend.getOverview(NO_SCOPE),
      backend.listExceptions({}, NO_SCOPE),
    ]);

    const identifiers = [written.meta.traceId, overview.meta.traceId, queue.meta.traceId];

    for (const identifier of identifiers) {
      expect(
        identifier.trim().length,
        'a call issued in this turn carries no identifier',
      ).toBeGreaterThan(0);
    }

    // One identifier per call, so a quoted identifier names one call rather than the turn it was
    // served in.
    expect(
      new Set(identifiers).size,
      'two calls issued in one turn carry one identifier between them',
    ).toBe(identifiers.length);

    // ... and the identifier the write answered with is the one its own event records, so quoting
    // either leads to the same call rather than to the call that happened to be served beside it.
    await actAs(backend, AUDITOR);

    const trail = (await backend.listAuditEvents(WHOLE_TRAIL)).data;
    const recorded = trail.filter(
      (event) =>
        event.objectRef === target.id &&
        event.action === NOTE_ACTION &&
        event.sequence > SEEDED_EVENT_COUNT,
    );
    const event = firstOf(recorded, `event recording a ${NOTE_ACTION} on ${target.id}`);

    expect(event.traceId).toBe(written.meta.traceId);
  }, CASE_TIMEOUT_MS);

  it("gives a refusal the identifier of the call that raised it rather than the other call's", async () => {
    const backend = await readyBackend();
    const target = firstOf(await queueOf(backend), 'exception row');

    // A refused call beside an audited write that is still in flight, which is when the counter moves
    // under a call that is being composed. The opening persona holds no `sovereignty.read`, so the
    // refusal is the adapter's own rather than a staged one, and the identifier it carries is the one
    // the forbidden card prints for a reader to quote.
    const [written, refused] = await Promise.all([
      backend.noteException(target.id, NOTE_TEXT),
      refusalOf(() => backend.getSovereigntyStatus()),
    ]);

    expect(refused.type).toBe('permission');
    expect(refused.traceId.trim().length).toBeGreaterThan(0);
    expect(refused.traceId).not.toBe(written.meta.traceId);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 20. The policy exception request — SCR-07's grant flow, read back through the policy it names
 * ------------------------------------------------------------------------------------------- */

/**
 * Files a time-boxed exception request against a policy, as SCR-07's grant flow does.
 *
 * The requester is the acting persona, which the cases set to the platform administrator: the matrix
 * grants `policy.exception.request` to that role alone and gives it `policy.read` and `audit.read`
 * as well, so one session files the request and reads both the policy and the trail back — while a
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
    const beforeRequest = (await backend.listAuditEvents(WHOLE_TRAIL)).data.length;

    await requestException(backend, policy.id, POLICY_EXCEPTION_REASON);

    const afterRequest = (await backend.listAuditEvents(WHOLE_TRAIL)).data.length;

    // The write appends one event, once.
    expect(afterRequest).toBe(beforeRequest + 1);

    await backend.getPolicy(policy.id);
    await backend.listPolicies({});

    // The reads that return the request append nothing: one event per accepted request, and none for
    // reading the request back (AAP 0.2.1).
    expect((await backend.listAuditEvents(WHOLE_TRAIL)).data.length).toBe(afterRequest);
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

/* ---------------------------------------------------------------------------------------------
 * 27. The free-text ceiling — the bound on the prose an audited write stores
 * ------------------------------------------------------------------------------------------- */

describe('the free-text ceiling', () => {
  it('refuses a note longer than the ceiling, and leaves the activity and the chain unextended', async () => {
    const backend = await readyBackend();
    const target = firstOf(await queueOf(backend), 'exception row');
    const before = (await backend.getExceptionDetail(target.id)).data;
    const chainBefore = (await backend.verifyAuditChain()).data.eventsChecked;

    const refusal = await refusalOf(() =>
      backend.noteException(target.id, 'x'.repeat(FREE_TEXT_MAX_LENGTH + 1)),
    );

    /*
     * The refusal names the field, the ceiling and the length actually submitted, so a caller learns
     * what was refused and by how much rather than that the write failed (CR4-F26).
     */
    expect(refusal.type).toBe('validation');
    expect(refusal.message).toContain(`note against ${target.id}`);
    expect(refusal.message).toContain(String(FREE_TEXT_MAX_LENGTH));
    expect(refusal.message).toContain(String(FREE_TEXT_MAX_LENGTH + 1));

    const after = (await backend.getExceptionDetail(target.id)).data;

    // A refused note records nothing: no activity for the exception, and no event on the trail that
    // the audit screen and every filter over it scan.
    expect(after.activity).toHaveLength(before.activity.length);
    expect((await backend.verifyAuditChain()).data.eventsChecked).toBe(chainBefore);
  }, CASE_TIMEOUT_MS);

  it('refuses a dismissal reason longer than the ceiling, and leaves the exception as it stood', async () => {
    const backend = await readyBackend();
    const open = (await queueOf(backend)).find((row) => row.status === 'open');

    if (open === undefined) {
      throw new Error('The queue holds no open exception, so the case has nothing to dismiss.');
    }

    const refusal = await refusalOf(() =>
      backend.dismissException(open.id, 'x'.repeat(FREE_TEXT_MAX_LENGTH + 1)),
    );

    expect(refusal.type).toBe('validation');
    expect(refusal.message).toContain(`dismissal reason for ${open.id}`);
    expect(refusal.message).toContain(String(FREE_TEXT_MAX_LENGTH + 1));

    // The row still stands open, so the refusal left the record a dismissal would have moved untouched.
    expect((await backend.getExceptionDetail(open.id)).data.exception.status).toBe('open');
  }, CASE_TIMEOUT_MS);

  it('refuses a decision comment longer than the ceiling, and leaves the approval pending', async () => {
    const backend = await readyBackend();
    const lodged = firstOf(
      (await backend.listApprovals({ status: PENDING_APPROVAL_STATUS }, NO_SCOPE)).data,
      'pending approval',
    );

    await actAs(backend, PLANT_MANAGER);

    const refusal = await refusalOf(() =>
      backend.decideApproval(lodged.id, {
        action: 'approve',
        comment: 'x'.repeat(FREE_TEXT_MAX_LENGTH + 1),
      }),
    );

    expect(refusal.type).toBe('validation');
    expect(refusal.message).toContain('decision comment');
    expect(refusal.message).toContain(String(FREE_TEXT_MAX_LENGTH + 1));

    // Nothing was decided and no write-back ran, so the record is still the pending plan it was.
    expect((await backend.getApproval(lodged.id)).data.status).toBe(PENDING_APPROVAL_STATUS);
  }, CASE_TIMEOUT_MS);

  it('refuses a policy exception reason longer than the ceiling, and records no request', async () => {
    const backend = await readyBackend();

    await actAs(backend, ADMINISTRATOR);

    const policy = firstOf((await backend.listPolicies({})).data, 'policy');
    const before = (await backend.getPolicy(policy.id)).data.pendingExceptions;

    const refusal = await refusalOf(() =>
      requestException(backend, policy.id, 'x'.repeat(FREE_TEXT_MAX_LENGTH + 1)),
    );

    expect(refusal.type).toBe('validation');
    expect(refusal.message).toContain('policy exception reason');
    expect(refusal.message).toContain(String(FREE_TEXT_MAX_LENGTH + 1));

    // The refused request never entered the policy's pending list, so no second approver has a record
    // to read that no one can account for.
    expect((await backend.getPolicy(policy.id)).data.pendingExceptions).toEqual(before);
  }, CASE_TIMEOUT_MS);

  it('accepts a note of exactly the ceiling, so the bound is a bound and not an off-by-one', async () => {
    const backend = await readyBackend();
    const target = firstOf(await queueOf(backend), 'exception row');
    const before = (await backend.getExceptionDetail(target.id)).data;

    // The ceiling is inside the bound: the note the first case proves refused one character over it is
    // accepted here at exactly the ceiling, and reaches the exception's activity as any other note does.
    await expect(
      backend.noteException(target.id, 'x'.repeat(FREE_TEXT_MAX_LENGTH)),
    ).resolves.toBeDefined();

    expect((await backend.getExceptionDetail(target.id)).data.activity).toHaveLength(
      before.activity.length + 1,
    );
  }, CASE_TIMEOUT_MS);

  it('refuses a corrected extraction value longer than the ceiling, and leaves the element as it stood', async () => {
    const backend = await readyBackend();

    await actAs(backend, SUPPLIER_QUALITY_ENGINEER);

    const partPackage = firstOf((await backend.listPackages({})).data, 'part approval package');
    const element = firstOf(partPackage.elements, 'package element');

    /*
     * A corrected value is the evidence family's one free-text member: it becomes the element's own
     * reading and travels in the audit event the review appends, so the ceiling the exceptions,
     * approvals and governance writes apply to their prose applies to it too (CR4-F26).
     */
    const refusal = await refusalOf(() =>
      backend.reviewElement({
        packageId: partPackage.id,
        elementNumber: element.number,
        decision: 'correct',
        correctedValue: 'x'.repeat(FREE_TEXT_MAX_LENGTH + 1),
      }),
    );

    expect(refusal.type).toBe('validation');
    expect(refusal.message).toContain(`corrected value for element ${element.number}`);

    const after = (await backend.getPackage(partPackage.id)).data;
    const reviewed = firstOf(
      after.elements.filter((candidate) => candidate.number === element.number),
      'the element after the refused review',
    );

    // The refused review changed nothing: the element keeps its extracted reading and its review mark.
    expect(reviewed.actual).toBe(element.actual);
    expect(reviewed.humanReviewed).toBe(element.humanReviewed);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 21. The decision's records — the comment its event keeps and the resolution it lands
 * ------------------------------------------------------------------------------------------- */

describe("the decision's records", () => {
  it('keeps the comment on the decision event and resolves the exception the plan answers', async () => {
    const backend = await readyBackend();
    const lodged = firstOf(
      (await backend.listApprovals({ status: PENDING_APPROVAL_STATUS }, NO_SCOPE)).data,
      'pending approval',
    );

    await actAs(backend, PLANT_MANAGER);

    const decided = (
      await backend.decideApproval(lodged.id, { action: 'approve', comment: DECISION_COMMENT })
    ).data;

    // Every step of the change succeeded, so the change landed and the plan is the approved one the
    // resolution below rests on (AAP 0.2.1).
    expect(decided.writeBacks.every((step) => step.state === 'succeeded')).toBe(true);

    await actAs(backend, AUDITOR);

    const decisionEvent = firstOf(
      (await backend.listAuditEvents({ objectRef: lodged.id })).data.filter(
        (event) => event.action === DECISION_ACTION,
      ),
      'decision event',
    );

    // The comment the screen tells the decider is recorded with the decision is in the event's payload,
    // trimmed exactly as the record keeps it, so the two cannot disagree (contracts §6).
    expect(decisionEvent.after).toEqual({
      status: decided.status,
      action: 'approve',
      comment: DECISION_COMMENT,
    });

    await actAs(backend, PLANT_MANAGER);

    const detail = (await backend.getExceptionDetail(lodged.exceptionId)).data;

    // AAP 0.2.2's journey ends at a written-back plan, so the record a reader returns to reports the
    // decision rather than the open disruption they left, and the resolution is recorded against the
    // exception rather than only against the approval.
    expect(detail.exception.status).toBe(RESOLVED_STATUS);

    const resolution = firstOf(
      detail.activity.filter((event) => event.action === RESOLVED_ACTION),
      'resolution event',
    );

    expect(resolution.objectRef).toBe(lodged.exceptionId);
    expect(resolution.result).toBe('succeeded');
    expect(resolution.before).toEqual({ status: OPEN_STATUS });
    expect(resolution.after).toEqual({
      status: RESOLVED_STATUS,
      approvalId: lodged.id,
      scenarioId: lodged.scenarioId,
    });

    // A second attempt to continue the same plan changes nothing: the step it names already succeeded,
    // so the retry is refused, and the exception keeps the one resolution it recorded.
    const repeat = await refusalOf(() =>
      backend.retryWriteBack(lodged.id, firstOf(decided.writeBacks, 'write-back step').recordRef),
    );
    const repeated = (await backend.getExceptionDetail(lodged.exceptionId)).data;

    expect(repeat.type).toBe('validation');
    expect(repeated.exception.status).toBe(RESOLVED_STATUS);
    expect(repeated.activity.filter((event) => event.action === RESOLVED_ACTION)).toHaveLength(1);
  }, CASE_TIMEOUT_MS);

  it('refuses a second request for an option an approved plan already holds', async () => {
    const backend = await readyBackend();
    const lodged = firstOf(
      (await backend.listApprovals({ status: PENDING_APPROVAL_STATUS }, NO_SCOPE)).data,
      'pending approval',
    );

    await actAs(backend, PLANT_MANAGER);

    // The partial trigger stops the approved change at one of its steps, which leaves the plan approved
    // while the exception it answers stays open: AAP 0.2.2's write-back is all-or-nothing, so a change
    // that did not land leaves the disruption unanswered. That is the state this rule answers; an
    // exception a landed plan has already resolved meets the open-exception rule first, as the
    // set-aside case at the end of this file states.
    await backend.setSimulation('partial', true);

    const stopped = await refusalOf(() =>
      backend.decideApproval(lodged.id, { action: 'approve', comment: DECISION_COMMENT }),
    );

    await backend.setSimulation('partial', false);

    expect(stopped.type).toBe('simulated-write-back');

    const decided = (await backend.getApproval(lodged.id)).data;

    // The persona who lodged the request is the one who may lodge another, and it meets the record the
    // first one left behind: a decided plan is not put forward a second time (rule P-8).
    await actAs(backend, lodged.requestedBy);

    const problem = await refusalOf(() =>
      backend.requestApproval({ exceptionId: lodged.exceptionId, scenarioId: lodged.scenarioId }),
    );

    expect(problem.type).toBe('validation');
    // The refusal names the record that holds the option and the status it stands in, which is what a
    // reader needs in order to read that plan instead of lodging another.
    expect(problem.message).toContain(decided.id);
    expect(problem.message).toContain(decided.status);

    // The refused call created nothing: one record names the option, and it is the one already there.
    const named = (await backend.listApprovals({}, NO_SCOPE)).data.filter(
      (record) => record.scenarioId === lodged.scenarioId,
    );

    expect(named).toHaveLength(1);
    expect(named[0]?.id).toBe(lodged.id);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 26. The conflict trigger — every collection read refused, every record read served, the decision
 *     refused rather than merged
 * ------------------------------------------------------------------------------------------- */

/**
 * The identifiers the conflict cases address records by, taken through the port before the trigger.
 *
 * The trigger refuses every collection read, so the sets these cases address — the exception queue, the
 * approvals, the trail, the policies and the packages — are read first and held: no identifier is
 * stated here that a record does not carry (rule P-6).
 */
interface ConflictReadSubjects {
  /** An exception the reading persona may see, which the three exception reads address. */
  readonly exceptionId: string;

  /** The plant that exception lands on, which the plan grid is addressed at. */
  readonly plantId: string;

  /** A seeded approval, which the two approval reads address. */
  readonly approvalId: string;

  /** A seeded policy, which the policy detail read addresses. */
  readonly policyId: string;

  /** An event of the seeded chain, which the single-event read addresses. */
  readonly auditEventId: string;

  /** A seeded package, which the package detail read addresses. */
  readonly packageId: string;

  /** A document reference the identifier search indexes, which the document read addresses. */
  readonly documentRef: string;
}

/**
 * The first seeded approval whose exception carries a solver case.
 *
 * The outcome card compares two measurements of the exception's own solver case, so an approval naming an
 * exception the seed carries no case for refuses that read for a reason that has nothing to do with the
 * trigger. Found through the port rather than by naming an identifier (rule P-6).
 *
 * @param backend - The session to read.
 * @returns The approval, with the exception it names.
 * @throws Error - No seeded approval names an exception the records measure, which would leave the
 *   outcome read without a subject it can answer.
 */
async function approvalWithSolverCase(backend: MockBackend): Promise<Approval> {
  for (const candidate of (await backend.listApprovals({}, NO_SCOPE)).data) {
    const detail = (await backend.getExceptionDetail(candidate.exceptionId)).data;

    if (detail.exception.solverCaseId !== undefined) {
      return candidate;
    }
  }

  throw new Error(
    'No seeded approval names an exception the records measure, so the case cannot run.',
  );
}

/**
 * Reads the identifiers the conflict cases need, each as a persona the matrix lets read it.
 *
 * The permissions are split across two personas — the head of supply chain holds `exception.read` and
 * `competitive.read`, the auditor holds `audit.read` and `policy.read` — and the trigger is off here, so
 * these are ordinary reads of the seeded record set (AAP 0.12.1, rule P-3).
 *
 * @param backend - The session to read, before the `conflict` trigger is set.
 * @returns Every identifier, taken from the records themselves.
 * @throws Error - A family these reads address holds no record, which would leave a case without a
 *   subject.
 */
async function conflictReadSubjects(backend: MockBackend): Promise<ConflictReadSubjects> {
  await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

  const exception = firstOf((await backend.listExceptions({}, NO_SCOPE)).data, 'exception');
  const approval = await approvalWithSolverCase(backend);
  const sealed = firstOf((await backend.listPackages({})).data, 'package');
  const documentHit = firstOf(
    (await backend.searchIdentifiers(DOCUMENT_TERM, NO_SCOPE)).data,
    'document hit',
  );

  await actAs(backend, AUDITOR);

  const event = firstOf((await backend.listAuditEvents(WHOLE_TRAIL)).data, 'audit event');
  const policy = firstOf((await backend.listPolicies({})).data, 'policy');

  return {
    exceptionId: exception.id,
    plantId: exception.plantId,
    approvalId: approval.id,
    policyId: policy.id,
    auditEventId: event.id,
    packageId: sealed.id,
    documentRef: documentHit.ref,
  };
}

/**
 * Every read the port declares whose payload is a collection, as the conflict cases address them.
 *
 * These are the reads the trigger refuses, because a set presented as current is what the
 * conflicting-update state prevents: the whole of that surface is listed here, and a collection read
 * added to the port without a line here is one no case proves the trigger reaches.
 *
 * @param backend - The session the reads are made against.
 * @param subject - The identifiers read before the trigger was set.
 * @returns One labelled thunk per collection read member of the port.
 */
function everyCollectionRead(
  backend: MockBackend,
  subject: ConflictReadSubjects,
): readonly (readonly [string, () => Promise<unknown>])[] {
  return [
    ['listExceptions', () => backend.listExceptions({}, NO_SCOPE)],
    ['getAffectedLines', () => backend.getAffectedLines(subject.exceptionId)],
    ['listApprovals', () => backend.listApprovals({}, NO_SCOPE)],
    ['listAuditEvents', () => backend.listAuditEvents({})],
    ['getOutboundLedger', () => backend.getOutboundLedger({})],
    ['listPolicies', () => backend.listPolicies({})],
    ['listPins', () => backend.listPins({})],
    ['listPackages', () => backend.listPackages({})],
    ['searchIdentifiers', () => backend.searchIdentifiers(subject.exceptionId, NO_SCOPE)],
  ];
}

/**
 * Every read the port declares whose payload is one record, as the conflict cases address them.
 *
 * These are the reads the trigger serves, so a case proves each one is answered while it is in effect.
 * The persona is carried beside the member because a served read runs its family's own permission
 * check — the one the refused reads never reached — and no single role holds every permission of the
 * matrix: the head of supply chain holds the exception, audit, evidence, document and competitive
 * reads, and the auditor holds the sovereignty and policy reads. The list is ordered so those two
 * groups stay together, and every persona the matrix admits to a member is named per member rather than
 * assumed.
 *
 * The two members carried for conformance alone — the plan grid and the exit package, whose record
 * families this set does not hold — are not listed here: their own families refuse them with a
 * `'not-found'`, which the case asserts beside the list.
 *
 * @param backend - The session the reads are made against.
 * @param subject - The identifiers read before the trigger was set.
 * @returns One labelled thunk per record read member of the port, with the persona the matrix admits
 *   to it.
 */
function everyRecordRead(
  backend: MockBackend,
  subject: ConflictReadSubjects,
): readonly (readonly [string, UserId, () => Promise<unknown>])[] {
  return [
    ['getOverview', HEAD_OF_SUPPLY_CHAIN, () => backend.getOverview(NO_SCOPE)],
    ['getExceptionDetail', HEAD_OF_SUPPLY_CHAIN, () => backend.getExceptionDetail(subject.exceptionId)],
    ['getScenarioSet', HEAD_OF_SUPPLY_CHAIN, () => backend.getScenarioSet(subject.exceptionId)],
    ['getApproval', HEAD_OF_SUPPLY_CHAIN, () => backend.getApproval(subject.approvalId)],
    ['getApprovalOutcome', HEAD_OF_SUPPLY_CHAIN, () => backend.getApprovalOutcome(subject.approvalId)],
    ['getAuditEvent', HEAD_OF_SUPPLY_CHAIN, () => backend.getAuditEvent(subject.auditEventId)],
    ['verifyAuditChain', HEAD_OF_SUPPLY_CHAIN, () => backend.verifyAuditChain()],
    ['getModelCatalogue', HEAD_OF_SUPPLY_CHAIN, () => backend.getModelCatalogue()],
    ['listSuggestedQuestions', HEAD_OF_SUPPLY_CHAIN, () => backend.listSuggestedQuestions()],
    ['getEvidence', HEAD_OF_SUPPLY_CHAIN, () => backend.getEvidence(subject.exceptionId)],
    ['getDocument', HEAD_OF_SUPPLY_CHAIN, () => backend.getDocument(subject.documentRef)],
    ['getPackage', HEAD_OF_SUPPLY_CHAIN, () => backend.getPackage(subject.packageId)],
    ['getTopology', HEAD_OF_SUPPLY_CHAIN, () => backend.getTopology(NO_SCOPE)],
    ['getCanvasRibbon', HEAD_OF_SUPPLY_CHAIN, () => backend.getCanvasRibbon(NO_SCOPE)],
    ['getAtlas', HEAD_OF_SUPPLY_CHAIN, () => backend.getAtlas()],
    ['getSourceCatalogue', HEAD_OF_SUPPLY_CHAIN, () => backend.getSourceCatalogue()],
    ['getSovereigntyStatus', AUDITOR, () => backend.getSovereigntyStatus()],
    ['getPolicy', AUDITOR, () => backend.getPolicy(subject.policyId)],
  ];
}

describe('the conflict trigger', () => {
  it('refuses every collection read and serves every read of one record, each with its own trace', async () => {
    const backend = await readyBackend();
    const subject = await conflictReadSubjects(backend);

    await backend.setSimulation('conflict', true);

    /*
     * Half of the contract: every read whose payload is a collection answers with the one condition the
     * trigger stands for, so no screen presenting a set is left reading records that changed under it
     * (AAP 0.2.1 F10, AAP 0.12.1). The label names the member, so a read that is served reports which
     * one escaped.
     */
    for (const [member, read] of everyCollectionRead(backend, subject)) {
      const refusal = await refusalOf(read);

      /*
       * A `'validation'` cause is the one `ProblemType` gives a request that cannot be honoured against
       * the records as they stand, so the screen reports the conflicting update rather than a bare
       * failure (AAP 0.12.3), and the trace is the call's own (rule P-8).
       */
      expect(refusal.type, member).toBe('validation');
      expect(refusal.message, member).toMatch(/changed/);
      expect(refusal.message, member).toMatch(/refused rather than served stale/);
      expect(refusal.traceId.trim().length, member).toBeGreaterThan(0);
    }

    /*
     * The other half: a read whose payload is one record is served while the trigger is in effect,
     * because the record is where the act it carries starts and the state refuses that act rather than
     * the read (`ScreenState` in `src/types/service.ts`, AAP 0.12.4 SCR-05). The persona changes only
     * where the matrix's row changes.
     */
    let reader: UserId | null = null;

    for (const [member, persona, read] of everyRecordRead(backend, subject)) {
      if (persona !== reader) {
        await actAs(backend, persona);
        reader = persona;
      }

      await expect(read(), member).resolves.toBeDefined();
    }

    /*
     * The two members this record set carries for conformance alone are served by the same dispatcher
     * and refused by their own families: a `'not-found'` names the absent record family, where the
     * trigger's refusal is a `'validation'` one (AAP 0.12.3).
     */
    expect((await refusalOf(() => backend.getPlanGrid(subject.plantId))).type).toBe('not-found');
    expect((await refusalOf(() => backend.getExitPackage())).type).toBe('not-found');

    /*
     * The refusal is a condition of the records rather than a one-shot state the first call consumed, so
     * a second read meets it too — and each refusal carries the trace of its own call (AAP 0.18.2).
     */
    const first = await refusalOf(() => backend.listExceptions({}, NO_SCOPE));
    const second = await refusalOf(() => backend.listExceptions({}, NO_SCOPE));

    expect(second.type).toBe('validation');
    expect(second.traceId).not.toBe(first.traceId);

    /*
     * The demonstration controls answer while the trigger is in effect: a popover that could not lift it
     * would leave the session conflicting with no way out, and the shell could not learn which persona it
     * acts as (rule P-8).
     */
    expect((await backend.getActiveUser()).data.id).toBe(AUDITOR);
    expect((await backend.switchRole(ADMINISTRATOR)).data.id).toBe(ADMINISTRATOR);
    expect((await backend.setSimulation('conflict', false)).data).toBe(true);
  }, CASE_TIMEOUT_MS);

  it('answers the reads a decision is composed from again once the control lifts the trigger', async () => {
    const backend = await readyBackend();
    const subject = await conflictReadSubjects(backend);

    // The reads below are made as the persona that reaches every plant, which the head of supply chain does.
    await actAs(backend, HEAD_OF_SUPPLY_CHAIN);

    const before = (await backend.getOverview(NO_SCOPE)).data;

    await backend.setSimulation('conflict', true);

    expect((await refusalOf(() => backend.listExceptions({}, NO_SCOPE))).type).toBe('validation');

    const lifted = await backend.setSimulation('conflict', false);

    expect(lifted.data).toBe(true);

    /*
     * The reads the approval screens compose a decision from answer again once the control lifts the
     * trigger, and the set it refused answers with them: the lift is the popover's, and the records
     * behind it never moved (rule P-8).
     */
    expect((await backend.getOverview(NO_SCOPE)).data).toEqual(before);
    expect((await backend.listExceptions({}, NO_SCOPE)).data.length).toBeGreaterThan(0);
    expect((await backend.getExceptionDetail(subject.exceptionId)).data.exception.id).toBe(
      subject.exceptionId,
    );
    expect((await backend.getApproval(subject.approvalId)).data.id).toBe(subject.approvalId);
    expect((await backend.listApprovals({}, NO_SCOPE)).data.length).toBeGreaterThan(0);
    await expect(backend.getScenarioSet(subject.exceptionId)).resolves.toBeDefined();
    await expect(backend.getApprovalOutcome(subject.approvalId)).resolves.toBeDefined();
  }, CASE_TIMEOUT_MS);

  it('refuses the decision rather than merging it, and leaves the approval undecided', async () => {
    const backend = await readyBackend();

    await actAs(backend, PLANT_MANAGER);

    const pending = firstOf(
      (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data,
      'pending approval',
    );
    const before = (await backend.getApproval(pending.id)).data;

    await backend.setSimulation('conflict', true);

    const refusal = await refusalOf(() =>
      backend.decideApproval(pending.id, { action: 'approve', comment: DECISION_COMMENT }),
    );

    /*
     * The write half of the demonstration: a decision attempted from records a caller already holds is
     * refused rather than merged with the record that changed under it, and it words that condition
     * differently from the refusal a collection read meets (AAP 0.12.4 SCR-05).
     */
    expect(refusal.type).toBe('validation');
    expect(refusal.message).toMatch(/refused rather than merged/);
    expect(refusal.traceId.trim().length).toBeGreaterThan(0);

    // The refusal writes nothing: the approval still stands where it stood, with no decision on it.
    await backend.setSimulation('conflict', false);

    const after = (await backend.getApproval(pending.id)).data;

    expect(after.status).toBe(before.status);
    expect(after.decision).toBeUndefined();
    expect(after.decidedBy).toBeUndefined();

    // The same decision goes through once the trigger is lifted, which is what the control exists for.
    const decided = (
      await backend.decideApproval(pending.id, { action: 'approve', comment: DECISION_COMMENT })
    ).data;

    expect(decided.status).toBe('approved');
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 22. The evidence behind any figure, mark, node, arc or pin — AAP 0.2.1 F12, principle PR-6
 * ------------------------------------------------------------------------------------------- */

/**
 * The evidence read answers every reference the screens compose, not only a record's identifier.
 *
 * Each case compares the drawer's payload with the read that computed the figure — the overview, the
 * canvas ribbon, the exception detail's chain, the topology or the atlas — so no figure is typed here
 * and no case can pass by agreeing with a second copy of a number (rule P-6). The references a case
 * composes are the ones the screens compose: `<root>:<key>` for a computed figure, a node's own
 * identifier, and `atlas:<seriesId>` for a radar series (AAP 0.2.1 F12, AAP 0.12.2).
 */
describe('the evidence behind a composed figure, a node and a radar series', () => {
  it('answers an overview tile with the aggregate the overview read computed', async () => {
    const backend = await readyBackend();
    const overview = (await backend.getOverview(NO_SCOPE)).data;

    const openTile = (await backend.getEvidence('overview:open-exceptions')).data;

    expect(openTile.value).toContain(String(overview.openExceptions));
    expect(openTile.provenance).toBe('computed');
    expect(openTile.label).toBe(SIM_LABELS[1]);
    expect(openTile.formula.length).toBeGreaterThan(0);

    const revenueTile = (await backend.getEvidence('overview:revenue-at-risk')).data;

    expect(revenueTile.value).toContain(String(overview.revenueAtRiskEur));

    // The total's components are the by-plant rows the read delivered, quoted rather than summed here.
    for (const row of overview.byPlant) {
      expect(revenueTile.inputs.join(' ')).toContain(row.plantId);
    }

    // Both surfaces draw the tile, so the payload names the other one in its downstream records.
    expect(revenueTile.downstream.join(' ')).toContain('revenue-at-risk');
  }, CASE_TIMEOUT_MS);

  it('answers a plant row and a day point with the readings the overview delivered', async () => {
    const backend = await readyBackend();
    const overview = (await backend.getOverview(NO_SCOPE)).data;
    const row = firstOf(overview.byPlant, 'risk-by-plant row');
    const point = firstOf(overview.openResolvedSeries, 'series point');

    const rowEvidence = (await backend.getEvidence(
      `overview:plant/${row.plantId}/revenue-at-risk`,
    )).data;

    expect(rowEvidence.value).toContain(String(row.revenueAtRiskEur));
    expect(rowEvidence.value).toContain(row.plantName);
    expect(rowEvidence.upstream).toEqual([row.plantId]);

    // The row's other figure has its own key, so a reader who activates the count is not answered with
    // the amount (principle PR-6).
    const countEvidence = (await backend.getEvidence(
      `overview:plant/${row.plantId}/open-exceptions`,
    )).data;

    expect(countEvidence.value).toContain(String(row.openExceptions));
    expect(countEvidence.value).toContain(row.plantName);
    expect(countEvidence.value).not.toContain(String(row.revenueAtRiskEur));

    const opened = (await backend.getEvidence(`overview:day/${point.date}/open`)).data;

    expect(opened.value).toContain(String(point.open));

    // Both counts of the point are stated, so a reader compares the two halves of one record.
    expect(opened.inputs.join(' ')).toContain(`resolved = ${point.resolved}`);

    const resolved = (await backend.getEvidence(`overview:day/${point.date}/resolved`)).data;

    expect(resolved.value).toContain(String(point.resolved));
  }, CASE_TIMEOUT_MS);

  it('reads a narrowed selection through the one resolver, so its figure is the narrowed one', async () => {
    const backend = await readyBackend();
    const overview = (await backend.getOverview(NO_SCOPE)).data;
    const row = firstOf(overview.byPlant, 'risk-by-plant row');
    const narrowedScope: Scope = { plants: [row.plantId], products: [] };
    const narrowedOverview = (await backend.getOverview(narrowedScope)).data;

    // The selection must change the figure, or the case would prove nothing about the suffix.
    expect(narrowedOverview.revenueAtRiskEur).not.toBe(overview.revenueAtRiskEur);

    const narrowed = (await backend.getEvidence(
      `overview:revenue-at-risk?plants=${row.plantId}`,
    )).data;

    // The drawer's figure is the one the same aggregate reports for the same filters: one resolver
    // narrows both, so the two cannot disagree (AAP 0.2.1).
    expect(narrowed.value).toContain(String(narrowedOverview.revenueAtRiskEur));
    expect(narrowed.value).not.toContain(String(overview.revenueAtRiskEur));

    // The selection the reference carried is stated in the payload, so a reader sees what narrowed it.
    expect(narrowed.inputs.join(' ')).toContain(`plants ${row.plantId}`);
  }, CASE_TIMEOUT_MS);

  it('answers every ribbon tile from the ribbon read, the critical count included', async () => {
    const backend = await readyBackend();
    const tiles = (await backend.getCanvasRibbon(NO_SCOPE)).data;

    expect(tiles.length).toBeGreaterThan(0);

    for (const tile of tiles) {
      const evidence = (await backend.getEvidence(`canvas:${tile.id}`)).data;

      expect(evidence.value).toContain(String(tile.value));
      expect(evidence.provenance).toBe('computed');
      expect(evidence.label).toBe(SIM_LABELS[1]);
      expect(evidence.inputs.join(' ')).toContain('canvas:');
    }
  }, CASE_TIMEOUT_MS);

  it('answers one reference per node family the canvas and the impact chain carry', async () => {
    const backend = await readyBackend();
    const row = firstOf(await queueOf(backend), 'exception queue row');
    const detail = (await backend.getExceptionDetail(row.id)).data;
    const topology = (await backend.getTopology(NO_SCOPE)).data;
    const plant = firstOf(topology.plants, 'plant node');
    const material = firstOf(
      detail.impactChain.filter((node) => node.kind === 'material'),
      'material node of the impact chain',
    );
    const line = firstOf(
      detail.impactChain.filter((node) => node.kind === 'line'),
      'production line node of the impact chain',
    );

    const references = [
      plant.id,
      firstOf(topology.suppliers, 'supplier node').id,
      firstOf(topology.origins, 'origin node').id,
      firstOf(topology.customers, 'customer node').id,
      material.ref,
      line.ref,
      firstOf(row.productIds, 'product of the first queue row'),
    ];

    for (const ref of references) {
      const evidence = (await backend.getEvidence(ref)).data;

      // A node is a seeded record, so its payload is first-party, carries `Simulated data` and states
      // the record's own fields (rule P-1, AAP 0.12.2).
      expect(evidence.provenance).toBe('first_party');
      expect(evidence.label).toBe(SIM_LABELS[0]);
      expect(evidence.value.length).toBeGreaterThan(0);
      expect(evidence.formula.length).toBeGreaterThan(0);
      expect(evidence.inputs.length).toBeGreaterThan(0);
    }

    const plantEvidence = (await backend.getEvidence(plant.id)).data;

    // The node the canvas drew opens the record it was drawn from: the label the drawing prints is the
    // record's own name.
    expect(plantEvidence.value).toContain(plant.label);
  }, CASE_TIMEOUT_MS);

  it('answers a radar series with the pack scores, and keeps the two families apart', async () => {
    const backend = await readyBackend();

    // USR-02 holds `competitive.read`, which the atlas read requires (contracts §7.1).
    await actAs(backend, PLANT_MANAGER);

    const atlas = (await backend.getAtlas()).data;
    const client = firstOf(
      atlas.radarSeries.filter((series) => series.provenance === 'first_party'),
      'client radar series',
    );
    const competitor = firstOf(
      atlas.radarSeries.filter((series) => series.provenance === 'market_intelligence'),
      'competitor radar series',
    );
    const axis = firstOf(atlas.radarAxes, 'radar axis');

    const clientEvidence = (await backend.getEvidence(`atlas:${client.id}`)).data;

    expect(clientEvidence.provenance).toBe('first_party');
    expect(clientEvidence.label).toBe(SIM_LABELS[0]);
    expect(clientEvidence.value).toContain(CLIENT_SELF_ASSESSMENT_LABEL);

    const competitorEvidence = (await backend.getEvidence(`atlas:${competitor.id}`)).data;

    expect(competitorEvidence.provenance).toBe('market_intelligence');
    expect(competitorEvidence.label).toBe(SIM_LABELS[5]);
    expect(competitorEvidence.value).not.toContain(CLIENT_SELF_ASSESSMENT_LABEL);

    // One payload carries one series' scores and no total across series (rule P-5): the axis and score
    // the pack states reach the drawer exactly as the pack holds them.
    expect(competitorEvidence.value).toContain(
      `${axis.label} ${firstOf(competitor.values, 'competitor score')}`,
    );
  }, CASE_TIMEOUT_MS);

  it('refuses an unknown key, an unknown parameter and a subject the read does not carry', async () => {
    const backend = await readyBackend();
    const row = firstOf(await queueOf(backend), 'exception queue row');

    const unknownKey = await refusalOf(() => backend.getEvidence('overview:no-such-aggregate'));

    expect(unknownKey.type).toBe('not-found');
    expect(unknownKey.message).toContain('overview:no-such-aggregate');

    const unknownParameter = await refusalOf(() =>
      backend.getEvidence(`overview:revenue-at-risk?plant=${row.plantId}`),
    );

    // A parameter the grammar does not carry is named, rather than silently ignored (contracts §2).
    expect(unknownParameter.type).toBe('validation');
    expect(unknownParameter.message).toContain('query parameter plant');

    const absentRecord = `${row.id}-ABSENT`;
    const missingRecord = await refusalOf(() => backend.getEvidence(absentRecord));

    expect(missingRecord.type).toBe('not-found');
    expect(missingRecord.message).toContain(absentRecord);

    const absentPlant = `${row.plantId}-ABSENT`;
    const missingSubject = await refusalOf(() =>
      backend.getEvidence(`overview:plant/${absentPlant}/revenue-at-risk`),
    );

    expect(missingSubject.type).toBe('not-found');
    expect(missingSubject.message).toContain(`plant/${absentPlant}/revenue-at-risk`);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 23. The evidence a governance figure opens — principle PR-6, AAP 0.2.1 F12, contracts §3
 * ------------------------------------------------------------------------------------------- */

describe('the evidence a governance figure opens', () => {
  it('resolves a declared outbound endpoint and every policy to the record each one states', async () => {
    const backend = await readyBackend();

    // The auditor holds `evidence.read`, `sovereignty.read` and `policy.read`, so both families are
    // readable from one session and neither read below is answered by a refusal.
    await actAs(backend, AUDITOR);

    const row = firstOf((await backend.getOutboundLedger({})).data, 'outbound ledger row');
    const endpointEvidence = (await backend.getEvidence(row.endpoint)).data;

    /*
     * The endpoint's payload is the ledger aggregate's own reading rather than a second count: the two
     * numbers the row carries are the two the payload quotes, as its sentence and as its inputs, so an
     * evidence path that recounted by hand would disagree here (rule P-6).
     */
    expect(endpointEvidence.provenance).toBe('computed');
    expect(endpointEvidence.label).toBe(SIM_LABELS[1]);
    expect(endpointEvidence.value).toContain(`${row.allowed} allowed`);
    expect(endpointEvidence.value).toContain(`${row.blocked} blocked`);
    expect(endpointEvidence.inputs).toContain(`endpoint = ${row.endpoint}`);
    expect(endpointEvidence.inputs).toContain(`allowed = ${row.allowed}`);
    expect(endpointEvidence.inputs).toContain(`blocked = ${row.blocked}`);

    const policies = (await backend.listPolicies({})).data;

    expect(policies.length).toBeGreaterThan(0);

    for (const policy of policies) {
      const policyEvidence = (await backend.getEvidence(policy.id)).data;

      /*
       * A policy's payload quotes the record itself and carries the label its own record decides:
       * `Simulated control` for a rule the engine runs, and `Declared, not verified` for the one the
       * deployment only declares (rules P-1 and P-4).
       */
      expect(policyEvidence.provenance).toBe('first_party');
      expect(policyEvidence.label).toBe(policy.evaluated ? SIM_LABELS[4] : SIM_LABELS[6]);
      expect(policyEvidence.inputs).toContain(`id = ${policy.id}`);
      expect(policyEvidence.inputs).toContain(`title = ${policy.title}`);
      expect(policyEvidence.upstream).toEqual([policy.id]);
    }
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 24. The queue's day filter — AAP 0.12.4's "14 days whose dates filter the queue"
 * ------------------------------------------------------------------------------------------- */

/**
 * The day a reader chose on SCR-01's series, as the queue read is asked for it.
 *
 * The day and every expectation around it are derived from the series the same session reports, so this
 * case types no date and no count (rule P-6): the series is the record of which days carry which
 * entries, and the filter's answer is compared with it rather than with a figure of the suite's own.
 */
describe("the queue's day filter", () => {
  it('keeps exactly the exceptions the series counted on one day, and none on a day it counted nothing', async () => {
    const backend = await readyBackend();
    const wholeQueue = await queueOf(backend);
    const series = (await backend.getOverview(NO_SCOPE)).data.openResolvedSeries;

    const activeDays = series.filter((point) => point.open + point.resolved > 0);
    const quietDays = series.filter((point) => point.open === 0 && point.resolved === 0);

    expect(activeDays.length, 'the seeded series counts no day at all').toBeGreaterThan(0);
    expect(quietDays.length, 'every day of the seeded series carries a count').toBeGreaterThan(0);

    /* The narrowest day the series offers, so the subset below is one a filter could not reach by
       admitting everything the queue holds. */
    const day = activeDays.reduce((fewest, point) =>
      point.open + point.resolved < fewest.open + fewest.resolved ? point : fewest,
    );

    const dayRows = (await backend.listExceptions({ date: day.date }, NO_SCOPE)).data;
    const wholeIdentifiers = wholeQueue.map((row) => row.id);

    /*
     * The read keeps the day's entries and no others. An exception a reader's series counted is one
     * row at most and one count at least, so the rows lie between the larger of the day's two counts
     * and their sum — an exception opened and resolved on the same day is two counts and one row.
     */
    expect(dayRows.length).toBeGreaterThanOrEqual(Math.max(day.open, day.resolved));
    expect(dayRows.length).toBeLessThanOrEqual(day.open + day.resolved);

    /* Every row it keeps is a row the unfiltered read returns, and that read is strictly larger: a
       filter that ignored the day would answer with the whole queue and fail both readings. */
    expect(dayRows.length).toBeLessThan(wholeQueue.length);

    for (const row of dayRows) {
      expect(wholeIdentifiers, `${row.id} is outside the queue the same session reads`).toContain(
        row.id,
      );
    }

    /* A day the series counted nothing on keeps nothing, which no query-level shortcut could fake. */
    const quiet = firstOf(quietDays, 'day without activity');

    expect((await backend.listExceptions({ date: quiet.date }, NO_SCOPE)).data).toEqual([]);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 27. A request against a set-aside exception — refused with the status the record stands in
 * ------------------------------------------------------------------------------------------- */

describe('a request against a set-aside exception', () => {
  it('refuses the plan, naming the status the record stands in, and writes no record or event', async () => {
    const backend = await readyBackend();
    const subject = await firstDismissableOptionOf(backend);

    // The opening session acts as the seed's first record — the material planner — which holds
    // `exception.work` over the exception's plant and `approval.request` beside it (contracts §7.1), so
    // both calls below are ones the persona may make.
    const dismissed = (await backend.dismissException(subject.exceptionId, DISMISS_REASON)).data;

    expect(dismissed.status).toBe(DISMISSED_STATUS);

    const approvalsBefore = (await backend.listApprovals({}, NO_SCOPE)).data;
    const trailBefore = (await backend.listAuditEvents({})).data;

    // A plan put forward on a record the workspace has set aside is refused: only an open exception
    // answers a request, so the call meets that rule rather than the order-book gate, the option's own
    // check or the audience, and the sentence says so in plain words (rule P-8).
    const problem = await refusalOf(() =>
      backend.requestApproval({ exceptionId: subject.exceptionId, scenarioId: subject.scenarioId }),
    );

    expect(problem.type).toBe('validation');
    // The sentence names the record and the status it stands in, which is what a reader needs in order
    // to reopen or replace that record instead of lodging a plan against it.
    expect(problem.message).toContain(subject.exceptionId);
    expect(problem.message).toContain(DISMISSED_STATUS);

    // The refused call created nothing: no approval rests on the dismissed exception, and the trail
    // still ends at the dismissal the case made — so no write-back could ever report a change landing on
    // a record the workspace considers set aside.
    expect((await backend.listApprovals({}, NO_SCOPE)).data).toEqual(approvalsBefore);

    const trailAfter = (await backend.listAuditEvents({})).data;

    expect(trailAfter).toHaveLength(trailBefore.length);

    // The read answers newest first, and the chain's own position is what "newest" means here: the last
    // event appended is still the dismissal, so no `approval request` was written on top of it.
    const newest = trailAfter.reduce(
      (latest, event) => (event.sequence > latest.sequence ? event : latest),
      firstOf(trailAfter, 'audit event'),
    );

    expect(newest.action).toBe(DISMISS_ACTION);
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 28. The evidence behind a write-back step — AAP 0.2.1 F12, AAP 0.2.2, principle PR-6
 * ------------------------------------------------------------------------------------------- */

describe('the evidence behind a write-back step', () => {
  it("answers a step of an approval's write-back with that step's own record, system and state", async () => {
    const backend = await readyBackend();
    const lodged = firstOf(
      (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data,
      'pending approval',
    );
    const step = firstOf(lodged.writeBacks, 'write-back step');

    /*
     * The reference names the record the steps belong to and the step's own position, because
     * `WriteBack` declares no identifier of its own: the contract §3 members are the position, the
     * system, the reference it writes, its description and its state.
     */
    const evidence = (await backend.getEvidence(`write-back:${lodged.id}/${String(step.sequence)}`))
      .data;

    /* The payload states the step's own row, every part of it a field of a record (rule P-6). */
    expect(evidence.provenance).toBe('first_party');
    expect(evidence.label).toBe(SIM_LABELS[3]);
    expect(evidence.value).toBe(
      `write-back step ${String(step.sequence)} of ${lodged.id} to ${SOURCE_LABELS[step.system]} ` +
        `record ${step.recordRef} stands ${step.state}`,
    );
    expect(evidence.inputs).toContain(`sequence = ${String(step.sequence)}`);
    expect(evidence.inputs).toContain(`system = ${step.system}`);
    expect(evidence.inputs).toContain(`recordRef = ${step.recordRef}`);
    expect(evidence.inputs).toContain(`state = ${step.state}`);
    expect(evidence.inputs).toContain(`description = ${step.description}`);
    expect(evidence.inputs).toContain(`owner = ${lodged.id}`);

    /* The plan a step belongs to is upstream of it, with the option it was requested for, and the
       approval's own trail is downstream: the events the chain records against that approval. */
    expect(evidence.upstream).toEqual([lodged.exceptionId, lodged.scenarioId]);

    await actAs(backend, AUDITOR);

    const trail = (await backend.listAuditEvents({ objectRef: lodged.id })).data;

    expect(evidence.downstream).toEqual(trail.map((event) => event.id));
  }, CASE_TIMEOUT_MS);

  it("answers a step of an option the adapter measured from the exception's own case", async () => {
    const backend = await readyBackend();
    const lodged = firstOf(
      (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data,
      'pending approval',
    );
    const set = (await backend.getScenarioSet(lodged.exceptionId)).data;
    const recommended = set.scenarios.find((option) => option.id === set.recommendedId);

    if (recommended === undefined) {
      throw new Error('The measured set recommends no option, so the case cannot run.');
    }

    /* The option is measured rather than shipped, which is the record no seeded set holds: the premise
       of the case, and the reason the owner lookup reads the measured sets as well as the shipped ones. */
    expect(recommended.origin).toBe('solver');

    const step = firstOf(recommended.writeBacks, 'write-back step');
    const evidence = (
      await backend.getEvidence(`write-back:${recommended.id}/${String(step.sequence)}`)
    ).data;

    expect(evidence.value).toContain(`of ${recommended.id}`);
    expect(evidence.value).toContain(step.recordRef);
    expect(evidence.inputs).toContain(`owner = ${recommended.id}`);

    /* An option's steps reach the exception it was measured from upstream, and the approvals naming
       the option downstream — the records the comparison screen's own column leads a reader to. */
    expect(evidence.upstream).toEqual([recommended.exceptionId]);

    const naming = (await backend.listApprovals({}, NO_SCOPE)).data.filter(
      (approval) => approval.scenarioId === recommended.id,
    );

    expect(evidence.downstream).toEqual(naming.map((approval) => approval.id));
  }, CASE_TIMEOUT_MS);

  it('refuses a malformed reference, an unknown owner and a position the plan does not hold', async () => {
    const backend = await readyBackend();
    const lodged = firstOf(
      (await backend.listApprovals({ status: 'pending' }, NO_SCOPE)).data,
      'pending approval',
    );
    const step = firstOf(lodged.writeBacks, 'write-back step');

    /*
     * Every form the grammar does not state is a validation failure naming the grammar: no position at
     * all, an empty owner, a position of zero, a position that is not a whole number, and a reference
     * carrying more after the position than the grammar has room for. None is trimmed or repaired.
     */
    const malformed = [
      `write-back:${lodged.id}`,
      `write-back:/${String(step.sequence)}`,
      `write-back:${lodged.id}/0`,
      `write-back:${lodged.id}/next`,
      `write-back:${lodged.id}/${String(step.sequence)}/extra`,
    ];

    for (const reference of malformed) {
      const problem = await refusalOf(() => backend.getEvidence(reference));

      expect(problem.type, reference).toBe('validation');
      expect(problem.message, reference).toContain('write-back:<ownerId>/<sequence>');
    }

    /* A well-formed reference whose owner no record answers names the owner it could not resolve. */
    const unknownOwner = `${lodged.id}-absent`;
    const ownerProblem = await refusalOf(() =>
      backend.getEvidence(`write-back:${unknownOwner}/${String(step.sequence)}`),
    );

    expect(ownerProblem.type).toBe('not-found');
    expect(ownerProblem.message).toContain(unknownOwner);

    /* A position the plan does not hold names the position and lists the ones the record does state,
       which is what a reader needs to address a step correctly instead of guessing at one. */
    const absentPosition = lodged.writeBacks.length + 1;
    const positionProblem = await refusalOf(() =>
      backend.getEvidence(`write-back:${lodged.id}/${String(absentPosition)}`),
    );

    expect(positionProblem.type).toBe('not-found');
    expect(positionProblem.message).toContain(String(absentPosition));

    for (const held of lodged.writeBacks) {
      expect(positionProblem.message).toContain(String(held.sequence));
    }
  }, CASE_TIMEOUT_MS);
});

/* ---------------------------------------------------------------------------------------------
 * 29. The queue's record filters and its page — the population is narrowed before it is measured
 * ------------------------------------------------------------------------------------------- */

/**
 * One filter the queue's query states on a member the row itself carries.
 *
 * The query is built from the row rather than typed, so a case asks for a value the records hold and
 * nothing in this file names a record (rule P-6).
 */
interface RecordFilterCase {
  /** The query member the filter sets, named in the case's title. */
  readonly member: string;

  /** The query that narrows by one row of the queue. */
  readonly query: (row: ExceptionRow) => ExceptionQuery;

  /** The row member whose value that query names. */
  readonly pick: (row: ExceptionRow) => string;
}

/**
 * The four filters decided on a member `ExceptionRow` carries.
 *
 * The queue narrows its population before it measures it, so each of these is now applied to the
 * exception record rather than to the projected row. The two carry the same value for all four — the
 * projection copies them unchanged — and these cases are what holds that equivalence: a filter applied
 * to the wrong member, or one dropped on the way down, answers with a different set.
 */
const RECORD_FILTER_CASES: readonly RecordFilterCase[] = [
  { member: 'type', query: (row) => ({ type: row.type }), pick: (row) => row.type },
  { member: 'severity', query: (row) => ({ severity: row.severity }), pick: (row) => row.severity },
  { member: 'status', query: (row) => ({ status: row.status }), pick: (row) => row.status },
  { member: 'ownerId', query: (row) => ({ ownerId: row.ownerId }), pick: (row) => row.ownerId },
];

describe("the queue's record filters", () => {
  it.each(RECORD_FILTER_CASES)(
    'keeps exactly the rows the $member filter names, in the order the whole queue states',
    async ({ query, pick }) => {
      const backend = await readyBackend();
      const wholeQueue = await queueOf(backend);
      const values = [...new Set(wholeQueue.map(pick))];

      expect(values.length, 'the seeded queue carries one value for this filter').toBeGreaterThan(0);

      for (const value of values) {
        const row = firstOf(
          wholeQueue.filter((candidate) => pick(candidate) === value),
          `row carrying ${value}`,
        );
        const expected = wholeQueue.filter((candidate) => pick(candidate) === value);
        const kept = (await backend.listExceptions(query(row), NO_SCOPE)).data;

        expect(kept.map((candidate) => candidate.id), `the ${value} rows`).toEqual(
          expected.map((candidate) => candidate.id),
        );
      }
    },
    CASE_TIMEOUT_MS,
  );

  /**
   * The plant filter keeps a row that reaches the plant without landing on it.
   *
   * `ExceptionQuery.plantId` is fixed by `src/types/service.ts` to admit the plant the exception lands
   * on **or** one it also affects, and the row carries only the landing plant. That reading is the one a
   * filter applied to the record can lose most easily, so every row the filter keeps either lands on the
   * plant or states it among the plants it also affects.
   */
  it('keeps the rows landing on a plant and the rows reaching it, and nothing else', async () => {
    const backend = await readyBackend();
    const wholeQueue = await queueOf(backend);
    const wholeIdentifiers = wholeQueue.map((row) => row.id);
    const plants = [...new Set(wholeQueue.map((row) => row.plantId))];
    let narrowed = 0;
    let answered = 0;

    for (const plantId of plants) {
      const kept = (await backend.listExceptions({ plantId }, NO_SCOPE)).data;
      const keptIdentifiers = kept.map((row) => row.id);

      /*
       * A plant outside the acting role's plant scope answers with nothing, and that is the adapter's
       * own rule rather than this filter's: the port hands the plant it was asked for to the one
       * resolver, which intersects it with the role's scope, so a selection the role does not reach
       * resolves to no plant at all. A row that lands on such a plant is in the whole queue only
       * because it also reaches one of the role's own, so its being kept is asserted in the branch
       * below and the empty answer is not read as a lost filter.
       */
      if (kept.length === 0) {
        continue;
      }

      answered += 1;

      for (const row of wholeQueue.filter((candidate) => candidate.plantId === plantId)) {
        expect(keptIdentifiers, `${row.id} lands on ${plantId} and was dropped`).toContain(row.id);
      }

      for (const row of kept) {
        expect(wholeIdentifiers, `${row.id} is outside the queue`).toContain(row.id);
      }

      for (const row of kept.filter((candidate) => candidate.plantId !== plantId)) {
        const detail = await backend.getExceptionDetail(row.id);

        expect(
          detail.data.exception.alsoAffectsPlantIds,
          `${row.id} neither lands on ${plantId} nor reaches it`,
        ).toContain(plantId);
      }

      if (kept.length < wholeQueue.length) {
        narrowed += 1;
      }
    }

    expect(answered, 'no plant the queue lands on answered the filter').toBeGreaterThan(0);
    expect(narrowed, 'no plant narrowed the queue, so the filter proved nothing').toBeGreaterThan(0);
  }, CASE_TIMEOUT_MS);

  /**
   * The supplier filter keeps the rows whose exception buys from the supplier it names.
   *
   * No row member carries the supplier — the exception does — so this filter is the one that could only
   * ever have been decided on the record, and the case reads the supplier from the record that states it
   * rather than naming one here (rule P-6).
   */
  it('keeps exactly the rows whose exception buys from the supplier it names', async () => {
    const backend = await readyBackend();
    const wholeQueue = await queueOf(backend);
    const subject = firstOf(wholeQueue, 'exception row');
    const supplierId = (await backend.getExceptionDetail(subject.id)).data.exception.supplierId;
    const kept = (await backend.listExceptions({ supplierId }, NO_SCOPE)).data;

    expect(kept.map((row) => row.id), 'the row the supplier was read from').toContain(subject.id);

    for (const row of kept) {
      const detail = await backend.getExceptionDetail(row.id);

      expect(detail.data.exception.supplierId, `${row.id} buys from another supplier`).toBe(
        supplierId,
      );
    }
  }, CASE_TIMEOUT_MS);

  /**
   * A page is taken from the ordered queue, not from the order the records happen to sit in.
   *
   * The queue's filters now run before its measurement, so the ordering and the page have to keep
   * following the measures: `limit` returns the first rows of the whole queue's own order and `cursor`
   * continues from the row it names.
   */
  it('pages and continues the order the whole queue states', async () => {
    const backend = await readyBackend();
    const wholeQueue = await queueOf(backend);

    expect(wholeQueue.length, 'the seeded queue holds too few rows to page').toBeGreaterThan(2);

    const firstTwo = (await backend.listExceptions({ limit: 2 }, NO_SCOPE)).data;

    expect(firstTwo.map((row) => row.id)).toEqual(wholeQueue.slice(0, 2).map((row) => row.id));

    const first = firstOf(wholeQueue, 'exception row');
    const afterFirst = (await backend.listExceptions({ cursor: first.id }, NO_SCOPE)).data;

    expect(afterFirst.map((row) => row.id)).toEqual(
      wholeQueue.slice(1).map((row) => row.id),
    );
  }, CASE_TIMEOUT_MS);
});
