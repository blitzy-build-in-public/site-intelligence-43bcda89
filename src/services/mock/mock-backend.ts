/**
 * The in-browser adapter of the service port: `MockBackend` implements every member of
 * `SiteIntelligenceService` over the demonstration's seeded, mutable state, and `DemonstrationControls`
 * beside it (AAP 0.6.2, AAP 0.12.1 "Mock adapter" row, AAP 0.12.3, rule P-2).
 *
 * WHAT THIS CLASS IS. Rule P-2 requires that all data access goes through the one typed service
 * interface, bound to an in-browser mock backend, with components and screens never reaching a seed
 * record. This class is that backend. It owns nothing itself: the session it serves lives in
 * `./mock-state.ts`, the triggers the simulation popover sets live in `./simulation.ts`, and every
 * read and write is a function of one of the nine families under `./handlers/`. Each port member
 * below is therefore a dispatcher — it awaits the bootstrap, waits the call's latency, resolves the
 * acting persona from the session, delegates to the matching family and wraps what comes back in the
 * envelope. No business arithmetic lives here, and no figure, amount, identifier or label is typed
 * here (rule P-6, rule P-1).
 *
 * THE ENVELOPE AND THE OBSERVABLE BEHAVIOUR BOTH ADAPTERS SHARE (AAP 0.12.3). Every call resolves to
 * `Result<T>` whose `meta` carries the six sources' freshness, the literal `simulated: true` and the
 * call's `traceId`; every failure is thrown as a `Problem` whose `type` names its cause, so a caller
 * cannot read a payload beside a refusal. Three properties make the swap to `ApiClient` invisible and
 * are applied here once rather than per method:
 *
 * 1. Latency inside the 150-400 ms band, so a loading state is observable. The delay is a ladder over
 *    the session's own request counter — never `Math.random`, never a clock — so the n-th call of a
 *    session takes the same time in every run (AAP 0.18.2).
 * 2. The correlation identifier comes from `traceIdFor` in `./handlers/audit.ts`, which is the module
 *    that already stamps every appended event and every refusal this adapter produces. Using one
 *    derivation means the `traceId` of a `Result` and the `traceId` of the `Problem` thrown by the
 *    same call are one value, and an identifier a reader quotes leads back to the record.
 * 3. The acting persona is resolved from the session's own state, never from a caller. No port member
 *    accepts a role, so a caller cannot widen its own reach, and the permission matrix of contracts
 *    §7.1 and the policy engine are evaluated against the persona the demonstration claims to be.
 *
 * WHO ACTS, AND WHAT THAT MEANS (rule P-3). The persona comes from the role switcher, which is a
 * demonstration control: the checks behind it run in the browser of a build with no backend, no
 * sign-in and no session, so they are not production authorisation. They are nevertheless evaluated
 * here and in each family rather than trusted from the caller, so bypassing the visible control
 * changes nothing about what this adapter returns. `switchRole` carries the same statement on the
 * member itself.
 *
 * WHAT IT DOES NOT DO, AND WHY. It performs no network request of any kind (rule B-1): every read is
 * a function over records already in memory, and the three exports are built as text for the browser
 * to offer as a download. It reads no configuration, environment value or credential and holds none
 * (rule B-2). It types no label — the seven fixed simulation labels live in `src/types/primitives.ts`
 * and are applied where an element surfaces (rule P-1) — and it states no figure, currency amount or
 * record identifier of its own (rule P-6); the identifiers it passes through are the ones a record
 * carries. It names no real company, customer, carmaker or cloud product (rule P-7). It makes no claim
 * that the application establishes a configuration, prevents a copy or defeats an edit: the chain is a
 * mechanism the interface labels from `src/types/primitives.ts` wherever it surfaces, and a
 * verification recomputes hashes and repairs nothing (rule P-4). A simulated write-back that fails
 * carries the fixed write-back label of specification §5.3 beside the failure's own message where the
 * screen shows it; no label text is stated here and none is invented.
 *
 * REDACTION HAPPENS INSIDE THE ADAPTER, ON THE VALUE ABOUT TO BE RETURNED (AAP 0.6.2, AAP 0.12.3).
 * A customer-confidential document body never crosses this boundary for a persona without
 * `document.confidential.read`, and the external supplier engineer receives its own vendor's evidence
 * pins and no other's. Both are applied by the family that owns the record — `getDocument` withholds
 * the body through the evidence family and `listPins` returns the evidence family's visible set — so
 * there is one enforcement point per rule. This file copies no document body into any payload it
 * builds, including the before-and-after payload of an audit event, so a withheld body cannot leak
 * through a record this adapter composed.
 *
 * THE DEMONSTRATION CONTROLS (AAP 0.6.2, AAP 0.12.1). `setSimulation` and `resetDemo` are port members
 * with no HTTP counterpart, and the API client implements them as documented no-ops. The tampered-audit
 * trigger additionally edits the seeded event the tamper control addresses, through
 * `tamperAuditEvent`, so a verification then reports that event's position and repairs nothing; turning
 * the trigger off clears the flag and leaves the edit in place, because a repair would hide the very
 * disagreement the control exists to show. The role switch and the read of the acting persona are the
 * capability the port does not carry, declared together in
 * `src/services/demonstration-controls.ts`, and this class implements both from its own state.
 *
 * DETERMINISM. The only state consulted is the session's; the only platform facility used is the
 * timer that makes a loading state observable. No clock, no random source and no module-level mutable
 * value is read, so the same session driven by the same calls yields the same answers in every run.
 *
 * Rules this class is built to satisfy: P-1 (no label typed; `simulated: true` in every envelope),
 * P-2 (the port is the only contract, and no module under `src/seed/` is imported — records arrive
 * through `./seed-loader.ts` inside the state), P-3 (the role switch is a demonstration control and
 * the matrix is enforced here), P-4 (no overclaim, and the chain is labelled where it surfaces), P-6
 * (no number, amount or identifier typed here), P-7 (synthetic naming only), P-8 (every refusal names
 * its cause, with the permission and the roles that hold it), B-1 (no request leaves for any host) and
 * B-2 (no configuration, no credential).
 *
 * HOW THE PORT'S `Scope` REACHES THE FAMILIES (AAP 0.2.1). Six port members take a scope, and all six
 * are narrowed by one reading of it: `selectionOf` carries the whole plant selection the caller named —
 * every plant it lists, or nothing when it lists none — together with the one selected product, into the
 * single resolver `resolveScope` in `src/domain/aggregation/scope.ts`, which intersects the plants with
 * the acting role's scope and passes the product through. `getOverview`, `listExceptions`, `getTopology`
 * and `getCanvasRibbon` hand that selection to the family that owns the read, and the family resolves it
 * once through the same resolver, so a filtered queue, a filtered overview, a narrowed canvas and its
 * ribbon describe one population instead of four. `listApprovals` and `searchIdentifiers` apply the
 * plant half here, because neither an approval nor a search hit carries a product to narrow by, and both
 * take the plant set from `scopedPlants`, which is the resolver's own answer rather than a second copy
 * of the rule. A two-plant selection therefore narrows to those two plants everywhere it reaches, and a
 * selection naming no plant resolves to every plant the acting role reaches — never to every plant in the
 * record set. The product half travels the same way and is passed through the resolver unchanged, because
 * no role narrows a product; a selection naming no product means "all products".
 * OPEN ITEM — `getAffectedLines` returns the exception record's own affected lines. The
 * baseline-measured view of the same orders is `ExceptionDetail.affectedOrders`, derived by the
 * exception family from the solver case; deriving the lines a second time here would be a second
 * answer to one measurement, so this member delegates and returns the record's lines.
 * OPEN ITEM — `searchIdentifiers` is carried here rather than in a family, because no family owns the
 * identifier search (see the port's own OPEN ITEM on the member). The record-kind words it groups
 * hits under are record content no seeded module holds, so they are stated here; the route spellings
 * are the ones specification §5.2 and AAP 0.12.4 fix, and `src/app/router.tsx` declares them
 * authoritatively.
 * OPEN ITEM — the stage S4 and S5 families are carried for interface conformance: the package, pin and
 * element-review reads are implemented because the seed holds those records, while the production plan
 * grid and the exit package are refused with a `'not-found'` naming the absent record family, because
 * no seeded module holds one and inventing a record or a figure is forbidden (rule P-6).
 * OPEN ITEM — this class's public surface is exactly the port's members plus the two members the
 * demonstration capability declares — `switchRole` and `getActiveUser` — plus `whenReady`, which is the
 * readiness promise `src/services/create-service.ts` awaits; a conformance check that compares the
 * class's keys against the two interfaces must subtract all three, and
 * `src/services/service-conformance.test.ts` owns that comparison.
 */

import { resolveScope } from '../../domain/aggregation/scope';
import type { ScopeFilterInput } from '../../domain/aggregation/scope';
import { hasPermission, plantScopeFor, rolesWith } from '../../domain/policy/permissions';
import { PERMISSIONS } from '../../types';
import type {
  ActiveUser,
  AffectedLine,
  Answer,
  Approval,
  ApprovalId,
  ApprovalOutcome,
  ApprovalStatus,
  Atlas,
  AuditEvent,
  AuditEventId,
  AuditPayload,
  AuditQuery,
  ChainReport,
  Decision,
  DocumentBody,
  DocumentId,
  ElementReview,
  Evidence,
  EvidencePin,
  EvidencePinId,
  ExceptionDetail,
  ExceptionId,
  ExceptionQuery,
  ExceptionRow,
  ExitPackage,
  ExportPayload,
  LedgerRow,
  Levers,
  ListQuery,
  Meta,
  ModelCatalogue,
  OperationalException,
  Overview,
  PackageId,
  Permission,
  PinState,
  PlanGrid,
  PlantId,
  PolicyDetail,
  PolicyException,
  PolicyId,
  PpapPackage,
  Problem,
  Result,
  RibbonTile,
  Role,
  Scenario,
  ScenarioId,
  ScenarioSet,
  Scope,
  SearchHit,
  SearchTarget,
  SimulationFlag,
  SourceCatalogue,
  SovereigntyStatus,
  SuggestedQuestion,
  Timestamp,
  Topology,
  UserId,
  WriteBack,
} from '../../types';
import type { DemonstrationControls } from '../demonstration-controls';
import type { SiteIntelligenceService } from '../site-intelligence-service';
import { buildChokepointBrief } from './exports/chokepoint-brief';
import { buildEvidencePack } from './exports/evidence-pack';
import { buildScenarioComparisonCsv } from './exports/scenario-csv';
import * as approvals from './handlers/approvals';
import * as assistant from './handlers/assistant';
import * as atlas from './handlers/atlas';
import * as audit from './handlers/audit';
import * as evidence from './handlers/evidence';
import * as exceptions from './handlers/exceptions';
import * as governance from './handlers/governance';
import * as scenarios from './handlers/scenarios';
import * as topology from './handlers/topology';
import { createMockState, restoreSeed } from './mock-state';
import type { HandlerContext, MockState } from './mock-state';
import type { SeedRecordSet } from './seed-loader';
import {
  clearSimulationFlags,
  emptiesLists,
  freshnessFor,
  holdsReads,
  setSimulationFlag,
  tamperAuditEvent,
} from './simulation';

/* ---------------------------------------------------------------------------------------------
 * Timing the calls of a session — AAP 0.12.1, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The shortest latency a call takes, in milliseconds: the floor of the 150-400 ms band AAP 0.12.1
 * fixes so that a screen's loading state is observable rather than skipped.
 */
const LATENCY_FLOOR_MS = 150;

/** The step the ladder advances by, in milliseconds. */
const LATENCY_STEP_MS = 50;

/** How many steps the ladder spans, so the band's ceiling is the floor plus five steps. */
const LATENCY_STEPS = 6;

/**
 * The latency one call takes, from the session's request counter alone.
 *
 * A ladder rather than a random draw: the counter starts at the value a fresh session takes and
 * advances once per call, so the first six calls of a session take each of the band's six values in
 * turn and the seventh starts again. Two sessions driven by the same calls therefore wait the same
 * amounts, which is what keeps a run reproducible (AAP 0.18.2).
 *
 * @param state - The session whose counter is read. Not modified.
 * @returns The delay, in milliseconds, inside the band AAP 0.12.1 fixes.
 */
function latencyFor(state: MockState): number {
  return LATENCY_FLOOR_MS + (state.requestCount % LATENCY_STEPS) * LATENCY_STEP_MS;
}

/**
 * Waits the given number of milliseconds.
 *
 * The only platform facility this adapter uses. Nothing is fetched, no clock is read for business
 * logic and no random source is consulted: the delay is what makes a pending call observable, and the
 * value comes from `latencyFor`.
 *
 * @param milliseconds - How long to wait; zero resolves on the next turn.
 * @returns A promise that settles once the delay has passed.
 */
function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/* ---------------------------------------------------------------------------------------------
 * The acting persona and the envelope — AAP 0.12.1, contracts §7.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The permissions the contracts §7.1 matrix grants a role.
 *
 * `src/domain/policy/permissions.ts` owns the matrix and documents that the adapter derives this
 * member from it, so the list is the matrix's own answer for every permission the vocabulary holds
 * rather than a second table. The permission is evaluated with no subject, because the question here
 * is what the role holds at all; the plant a call is narrowed to is decided per record by the family
 * that reads it. The probe actor satisfies the signature and is not read for a subject-less
 * evaluation, which is the reading `hasPermission` documents.
 *
 * @param role - The role whose held permissions are wanted.
 * @returns Every permission the matrix grants the role, in the vocabulary's order.
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
 * The persona the session is acting as, resolved from the session's own state.
 *
 * The port carries no acting user, so this is where the demonstration's identity is decided: the
 * record the role switcher selected, its role's plant scope and its role's permissions. Every read
 * and write of this adapter is evaluated against the result, so a caller cannot pass a wider identity
 * than the session holds.
 *
 * A session whose active identifier matches no seeded persona is a broken state rather than a caller's
 * mistake — the reset and the bootstrap both install a persona from the same record set — so it fails
 * loudly instead of answering every call as an identity that does not exist.
 *
 * @param state - The session whose active persona is resolved. Not modified.
 * @returns The persona, with the plant scope and permissions its role holds.
 * @throws Error - The session names an identifier the record set does not carry.
 */
function actorOf(state: MockState): ActiveUser {
  const record = state.records.users.find((candidate) => candidate.id === state.activeUserId);

  if (record === undefined) {
    throw new Error(
      `The session acts as ${state.activeUserId}, which the seeded record set does not carry; ` +
        'src/services/mock/mock-state.ts installs a persona from that set on every start and reset.',
    );
  }

  return activeUserOf(record);
}

/**
 * One persona record as the identity surface reports it: the shape both the acting-persona read and
 * the roster answer with, built in one place so the two cannot describe the same record differently.
 *
 * The plant scope and the permissions are the role's rather than the record's, exactly as the
 * adapter enforces them: a caller that acts as this persona is narrowed to the scope below and
 * allowed exactly these permissions, so a switch and the roster do not disagree about what a persona
 * can do.
 *
 * @param record - One of the seeded persona records.
 * @returns The persona, with the plant scope and permissions its role holds.
 */
function activeUserOf(record: MockState['records']['users'][number]): ActiveUser {
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
 * The metadata every result of this adapter carries: the six sources' freshness as the triggers in
 * effect report it, the literal simulation marker and the call's correlation identifier.
 *
 * A fresh object on each call, with a freshly built freshness array, so a caller that keeps or
 * rewrites one result's metadata cannot alter the next.
 *
 * @param state - The session the call was served from. Not modified.
 * @returns The envelope's `meta`.
 */
function metaFor(state: MockState): Meta {
  return { freshness: freshnessFor(state), simulated: true, traceId: audit.traceIdFor(state) };
}

/* ---------------------------------------------------------------------------------------------
 * Refusals this adapter raises itself — rule P-8, AAP 0.12.3
 * --------------------------------------------------------------------------------------------- */

/**
 * The refusal a call this adapter authorises itself throws: the cause, the reason in plain words, the
 * call's trace and the two members a forbidden card needs to name who may act instead (rule P-8).
 *
 * @param ctx - The call's context, whose persona the reason can name.
 * @param permission - The permission the call requires.
 * @param message - The reason, in the plain words the caller supplies.
 * @returns The `Problem` to throw.
 */
function permissionProblem(ctx: HandlerContext, permission: Permission, message: string): Problem {
  return {
    type: 'permission',
    message,
    traceId: audit.traceIdFor(ctx.state),
    requiredPermission: permission,
    rolesWithPermission: rolesWith(permission),
  };
}

/**
 * The refusal a call naming a record the session does not hold throws.
 *
 * @param ctx - The call's context, whose state supplies the trace.
 * @param message - The reason, naming the identifier and the records the session does hold where that
 *   helps a reader follow a stale reference.
 * @returns The `Problem` to throw.
 */
function notFoundProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'not-found', message, traceId: audit.traceIdFor(ctx.state) };
}

/**
 * Whether a thrown value is a `Problem` rather than an `Error` or anything else.
 *
 * The three members a refusal is recognised by are the three every `Problem` carries: its cause, its
 * reason and its correlation identifier. Checking them structurally is what lets the dispatcher fill
 * in a refusal's trace without narrowing an `Error` — such as the one a mislabelled market pack
 * raises — into something a screen would try to render as a refusal.
 *
 * @param value - Whatever a family call threw.
 * @returns `true` when the value is a `Problem`.
 */
function isProblem(value: unknown): value is Problem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { type?: unknown; message?: unknown; traceId?: unknown };

  return (
    typeof candidate.type === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.traceId === 'string'
  );
}

/**
 * Gives a refusal the correlation identifier of the call that produced it.
 *
 * A family composes its refusals from the records it reads and has no request counter of its own, so
 * it reports the empty identifier rather than inventing one — two of them say so in their own words.
 * This adapter owns the counter, so it is the one place that can fill the value in, and doing it here
 * means every refusal a caller meets carries the same `traceId` its `Result` would have carried, which
 * is what makes an identifier a user quotes lead back to the call (AAP 0.12.1, rule P-8).
 *
 * A refusal that already names an identifier keeps it, and a value that is not a refusal is returned
 * untouched: only the empty case is filled, and only for a `Problem`.
 *
 * @param error - Whatever a family call threw.
 * @param state - The session the call was served from, whose counter spells the identifier.
 * @returns The refusal to throw, carrying the call's identifier where it had none.
 */
function withCallTrace(error: unknown, state: MockState): unknown {
  if (!isProblem(error) || error.traceId !== '') {
    return error;
  }

  return { ...error, traceId: audit.traceIdFor(state) };
}

/* ---------------------------------------------------------------------------------------------
 * The vocabulary this adapter decides for itself — contracts §6 and §7.1, specification §5.1 and §5.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission the exception family's reads require, and the one the approval inbox is read under.
 *
 * Named here because the identifier search evaluates it to decide which families it indexes; the
 * approval inbox's own read is gated by the family under the same permission, so the two agree about
 * who may see those records.
 */
const EXCEPTION_READ: Permission = 'exception.read';

/** The permission the audit trail's reads require. */
const AUDIT_READ: Permission = 'audit.read';

/** The permission the policy reads require. */
const POLICY_READ: Permission = 'policy.read';

/** The permission the evidence reads require. */
const EVIDENCE_READ: Permission = 'evidence.read';

/** The permission a review of an evidence pin requires (AAP 0.12.1, contracts §7.1). */
const EVIDENCE_REVIEW: Permission = 'evidence.review';

/**
 * The permission the declared deployment record is read under.
 *
 * The governance screen's payload and the outbound ledger both require it, and the evidence pack is
 * exported under it together with `AUDIT_READ`: the pack is composed from those two reads, so a persona
 * that may not read the trail may not export a document that carries it (`exportEvidencePack`).
 */
const SOVEREIGNTY_READ: Permission = 'sovereignty.read';

/**
 * The action an export appends to the chain, one of the sixteen contracts §6 names (AAP 0.6.2 lists
 * an export among the writes that record themselves).
 */
const EXPORT_ACTION = 'export';

/** The action a persona change appends, as the data flow of AAP 0.6.2 spells it. */
const ROLE_SWITCH_ACTION = 'role switch';

/**
 * The action a review of extracted evidence appends.
 *
 * A pin review and an element review are the same act on two records of the evidence workspace, so
 * they record the one action contracts §6 gives that act rather than two spellings of it.
 */
const EVIDENCE_REVIEW_ACTION = 'extraction review';

/** The trigger that edits a recorded result of one seeded event (specification §8, AAP 0.10). */
const TAMPER_FLAG: SimulationFlag = 'tampered-audit';

/**
 * The route each search hit of a recorded kind opens, as specification §5.2 and AAP 0.12.4 fix them.
 *
 * A hit whose record has a screen opens that screen by its identifier; a record the workspace shows
 * only through the evidence drawer opens by its reference instead, which is why only three families
 * carry a route and the rest carry one of these prefixes.
 */
const EXCEPTION_ROUTE = '/exceptions/';
const APPROVAL_ROUTE = '/approvals/';
const POLICY_ROUTE = '/admin/policies/';

/**
 * The record kind each family of search hits is grouped under (specification §5.1).
 *
 * These words are record content: `SearchHit.entityType` is an open string because the search groups
 * its hits by the record kinds the seed publishes, and no seeded module carries the kind word itself.
 * They are therefore stated once here, beside the families that produce them.
 */
const EXCEPTION_KIND = 'Exception';
const APPROVAL_KIND = 'Approval';
const POLICY_KIND = 'Policy';
const CUSTOMER_ORDER_KIND = 'Customer order';
const PURCHASE_ORDER_KIND = 'Purchase order';
const SCENARIO_KIND = 'Scenario';
const DOCUMENT_KIND = 'Document';
const PACKAGE_KIND = 'Part approval package';
const AUDIT_EVENT_KIND = 'Audit event';
const PIN_KIND = 'Evidence pin';

/* ---------------------------------------------------------------------------------------------
 * The scope a read is narrowed by — AAP 0.2.1, AAP 0.12.2 `Scope`, specification §5.1
 * --------------------------------------------------------------------------------------------- */

/**
 * The plants a read is narrowed to: the acting role's scope, intersected with the shell's selection.
 *
 * The answer is the one resolver's rather than a second copy of its rule: `selectionOf` carries the
 * caller's whole plant selection and `resolveScope` intersects it with the role's scope in the matrix's
 * own canonical order, so a member that narrows by the plant half here and one that hands the selection
 * to a family cannot disagree about which records a `Scope` names (AAP 0.2.1, AAP 0.12.2). The selection
 * narrows the role's scope and never widens it, and an empty selection means every plant the role
 * reaches rather than every plant in the record set.
 *
 * @param scope - The shell's selection as the caller passed it.
 * @param role - The acting persona's role.
 * @returns The plants the read may reach, in the role's canonical order.
 */
function scopedPlants(scope: Scope, role: Role): PlantId[] {
  return resolveScope(selectionOf(scope), role).plants;
}

/**
 * The one product the shell's selection names, or `undefined` when it names none.
 *
 * The top bar offers one product (specification §5.1), so a single product is what the selection
 * states, and an empty or multi-product list states nothing the resolver's single input member can
 * carry. The resolver passes the member through unchanged, because no role narrows a product.
 *
 * @param scope - The shell's selection as the caller passed it. Not modified.
 * @returns The selected product, or `undefined` when the selection names none or several.
 */
function selectedProductOf(scope: Scope): Scope['products'][number] | undefined {
  const [only] = scope.products;

  return scope.products.length === 1 ? only : undefined;
}

/**
 * The shell's selection as the one scope resolver reads it: the plants and the product it names.
 *
 * This is the adapter's whole reading of a `Scope`, and it exists so no family read can be handed half
 * of the top bar's selection: both members travel to `resolveScope` in
 * `src/domain/aggregation/scope.ts`, which intersects the plants with the acting role's scope and
 * passes the product through, so a filtered queue, a filtered overview, a narrowed canvas and its
 * ribbon resolve the same scope from the same filters (AAP 0.2.1, AAP 0.12.1 "Scope resolution"). The
 * plant half travels as the whole list the caller named, so a two-plant selection narrows to those two
 * plants instead of widening to every plant the role reaches; a list naming no plant is left out of the
 * input rather than carried as an empty one, which is the shape `exactOptionalPropertyTypes` reads as
 * "All plants" or "All products" and the shape the top bar's absent filters take.
 *
 * @param scope - The shell's selection as the caller passed it. Not modified.
 * @returns The resolver's input, with each member present only when the selection names one.
 */
function selectionOf(scope: Scope): ScopeFilterInput {
  const productId = selectedProductOf(scope);

  return {
    ...(scope.plants.length === 0 ? {} : { plantIds: scope.plants }),
    ...(productId === undefined ? {} : { productId }),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The identifier search's index — specification §5.1, AAP 0.12.2 `SearchHit`
 * --------------------------------------------------------------------------------------------- */

/**
 * One record the identifier search may return, before the term is matched against it.
 *
 * The candidate carries where the record opens rather than a rendered hit, so the term and the scope
 * are applied once over one collection and the shape a caller receives is built at the end.
 */
interface SearchCandidate {
  /** The record's identifier, which is what the term is matched against. */
  readonly ref: string;

  /** The record kind the hit is grouped under. */
  readonly entityType: string;

  /** Where selecting the hit opens it. */
  readonly target: SearchTarget;

  /** The plant the record belongs to, absent for a record that names none. */
  readonly plantId?: PlantId;
}

/**
 * The target that opens a record's own screen.
 *
 * @param route - The route, already carrying the record's identifier.
 * @returns The hit's target.
 */
function routeTarget(route: string): SearchTarget {
  return { kind: 'route', value: route };
}

/**
 * The target that opens a record in the evidence drawer.
 *
 * @param ref - The record's reference, in the form the evidence read resolves.
 * @returns The hit's target.
 */
function drawerTarget(ref: string): SearchTarget {
  return { kind: 'drawer', value: ref };
}

/**
 * Builds one search candidate, with its plant member present only when the record names a plant.
 *
 * The conditional spread is what `exactOptionalPropertyTypes` needs: an absent plant and a plant
 * holding `undefined` are different types, and only the former means "not plant-scoped".
 *
 * @param ref - The record's identifier.
 * @param entityType - The record kind the hit is grouped under.
 * @param target - Where the hit opens.
 * @param plantId - The plant the record belongs to, when it names one.
 * @returns The candidate.
 */
function searchCandidate(
  ref: string,
  entityType: string,
  target: SearchTarget,
  plantId?: PlantId,
): SearchCandidate {
  return plantId === undefined ? { ref, entityType, target } : { ref, entityType, target, plantId };
}

/**
 * The plant of the exception a record answers.
 *
 * An approval and a scenario name the exception they belong to rather than a plant, so their plant is
 * read from that exception. A record naming an exception the set does not hold has no plant here, and
 * the caller leaves that record out of the index: a hit that names no plant would be offered to every
 * role, which is a scope filter failing open.
 *
 * @param records - The session's record set.
 * @param exceptionId - The exception the record names.
 * @returns The exception's plant, or `undefined` when the set holds no such exception.
 */
function plantOfException(records: SeedRecordSet, exceptionId: ExceptionId): PlantId | undefined {
  return records.exceptions.find((candidate) => candidate.id === exceptionId)?.plantId;
}

/**
 * Every record the acting persona's search may return, in the order the families are grouped.
 *
 * A family is included only when the persona holds the permission its read requires, so the search
 * cannot become a way around a forbidden read: the exception, approval, scenario and order families
 * need `exception.read`, the documents, packages and pins need `evidence.read`, the trail needs
 * `audit.read` and the policies need `policy.read`. Records that name a plant are returned as
 * plant-scoped candidates and are narrowed by the shell's selection afterwards; the rest name none. An
 * approval or a scenario whose exception the records do not hold is left out rather than indexed as a
 * record naming no plant, so the search fails closed on a subject it cannot place.
 *
 * @param state - The session whose records are indexed. Not modified.
 * @param actor - The persona the call acts as, whose permissions decide the families.
 * @returns The candidates, grouped by family in the order they were added.
 */
function searchableCandidates(state: MockState, actor: ActiveUser): SearchCandidate[] {
  const records = state.records;
  const candidates: SearchCandidate[] = [];
  const holds = (permission: Permission): boolean =>
    hasPermission(actor.role, permission, null, actor);

  if (holds(EXCEPTION_READ)) {
    for (const exception of records.exceptions) {
      candidates.push(
        searchCandidate(
          exception.id,
          EXCEPTION_KIND,
          routeTarget(`${EXCEPTION_ROUTE}${exception.id}`),
          exception.plantId,
        ),
      );
    }

    for (const order of records.customerOrders) {
      candidates.push(
        searchCandidate(order.id, CUSTOMER_ORDER_KIND, drawerTarget(order.id), order.plantId),
      );
    }

    for (const order of records.purchaseOrders) {
      candidates.push(
        searchCandidate(order.id, PURCHASE_ORDER_KIND, drawerTarget(order.id), order.plantId),
      );
    }

    for (const approval of records.approvals) {
      const plantId = plantOfException(records, approval.exceptionId);

      if (plantId === undefined) {
        continue;
      }

      candidates.push(
        searchCandidate(
          approval.id,
          APPROVAL_KIND,
          routeTarget(`${APPROVAL_ROUTE}${approval.id}`),
          plantId,
        ),
      );
    }

    for (const seeded of records.exceptionScenarios) {
      for (const scenario of seeded.scenarioSet.scenarios) {
        const plantId = plantOfException(records, scenario.exceptionId);

        if (plantId === undefined) {
          continue;
        }

        candidates.push(
          searchCandidate(scenario.id, SCENARIO_KIND, drawerTarget(scenario.id), plantId),
        );
      }
    }
  }

  if (holds(EVIDENCE_READ)) {
    for (const document of records.documents) {
      candidates.push(searchCandidate(document.id, DOCUMENT_KIND, drawerTarget(document.id)));
    }

    for (const packageRecord of records.ppapPackages) {
      candidates.push(
        searchCandidate(packageRecord.id, PACKAGE_KIND, drawerTarget(packageRecord.id)),
      );
    }

    for (const pin of records.evidencePins) {
      candidates.push(searchCandidate(pin.id, PIN_KIND, drawerTarget(pin.id)));
    }
  }

  if (holds(AUDIT_READ)) {
    for (const event of state.auditEvents) {
      candidates.push(searchCandidate(event.id, AUDIT_EVENT_KIND, drawerTarget(event.id)));
    }
  }

  if (holds(POLICY_READ)) {
    for (const policy of records.policies) {
      candidates.push(
        searchCandidate(policy.id, POLICY_KIND, routeTarget(`${POLICY_ROUTE}${policy.id}`)),
      );
    }
  }

  return candidates;
}


/* ---------------------------------------------------------------------------------------------
 * The adapter — AAP 0.6.2, AAP 0.12.1 "Mock adapter" row, rule P-2
 * --------------------------------------------------------------------------------------------- */

/**
 * The in-browser adapter of `SiteIntelligenceService`, and of the demonstration capability beside it.
 *
 * One instance serves a session. Its constructor takes no argument and starts the bootstrap the
 * moment it is built, so a binding point constructs it and awaits `whenReady()` before the first
 * screen renders; the seeded trail is hashed by that pass rather than on a screen's first read
 * (AAP 0.2.1). A second instance is a second, independent session, which is what a suite comparing a
 * reset session against a fresh one needs.
 *
 * Every port member is a dispatcher and nothing more: it awaits the bootstrap, waits the call's
 * latency, takes the persona from the session, delegates to the family that owns the record and wraps
 * the answer in the envelope. The private `serve` method is the whole of that mechanism, so the timing,
 * the trace and the persona are decided in one place rather than in every member, and the three methods
 * built on it decide which of the simulation's two call-wide triggers a member meets: `dispatch` serves
 * a call the `loading` trigger holds, `dispatchControl` serves the demonstration controls that must
 * answer anyway so the popover can lift that trigger (rule P-8), and `dispatchCollection` serves a read
 * whose payload is a collection, which the `empty` trigger empties (AAP 0.12.1).
 *
 * The public surface is deliberately the port's own set plus the three names its callers need: the
 * readiness promise, the role switch and the read of the persona the session is acting as. Nothing
 * else is public, so a screen cannot reach the families, the state or the chain except through the
 * contract they were declared against.
 */
export class MockBackend implements SiteIntelligenceService, DemonstrationControls {
  /**
   * The session's bootstrap, started when the instance is built and awaited by every call.
   *
   * The promise resolves to the state rather than the field being assigned later, so no member can
   * observe a half-built session and no member needs a null check: a call either has the state or the
   * bootstrap failed. The seeded record set is cloned and every seeded audit draft is hashed inside
   * this one promise, and a second read of it never starts a second pass.
   */
  private readonly bootstrap: Promise<MockState> = createMockState();

  /**
   * Resolves once the session can answer a call: its records are installed and its audit chain has
   * been hashed through the platform's own Web Crypto.
   *
   * The binding point awaits this before it renders a screen, so no read meets drafts that carry no
   * hash (AAP 0.2.1). It is idempotent: every call awaits the one bootstrap the constructor started,
   * so awaiting it twice costs nothing and never re-hashes the trail.
   *
   * @returns A promise that settles when the session is ready, and rejects if the bootstrap failed.
   */
  whenReady(): Promise<void> {
    return this.bootstrap.then(() => undefined);
  }

  /**
   * Serves one call: the timing, the persona, the delegation and the envelope.
   *
   * The order is fixed and each step depends on the one before it. The bootstrap settles first, so the
   * records and the chain are whole. The latency is waited next, from the counter's value at entry, so
   * the ladder follows the session's own call sequence and a pending screen has something to show. The
   * counter then advances, once per call, so the `traceId` this call's metadata carries is the one the
   * families stamp on the events and refusals they produce. The persona is resolved from the session
   * after any change the previous step made, and only then does the family run.
   *
   * The simulation's `loading` trigger is decided here, once for every call the adapter serves, because
   * it changes what the call does rather than what one family's records look like (AAP 0.12.1): once
   * the counter has advanced, a holdable call the trigger covers never settles, so the screen that
   * asked renders the pending state it renders for any call still in flight (AAP 0.2.1 F10, AAP 0.2.2).
   * `holdable` is what keeps the demonstration controls out of the hold, because the popover has to be
   * able to lift the trigger it set and a control that could not answer would leave the session pending
   * with no way back (rule P-8). The wait happens before the hold, so a held call still occupies the
   * latency band every other call does rather than answering differently.
   *
   * A refusal propagates as it was thrown, with one addition: a family composes its refusals from the
   * records rather than from a request counter, so a refusal that names no correlation identifier is
   * given this call's before it leaves. Either way a caller meets one identifier, and it is the value
   * the same call's `meta` would have carried.
   *
   * @param work - The family call to serve, given the session and the acting persona.
   * @param holdable - Whether the `loading` trigger holds this call; `false` only for the demonstration
   *   controls.
   * @returns The payload the family produced inside the envelope every port member returns, or a
   *   promise that never settles while the `loading` trigger holds a holdable call.
   * @throws Problem - Whatever the family refused the call with, carrying this call's identifier.
   */
  private async serve<T>(
    work: (ctx: HandlerContext) => T | Promise<T>,
    holdable: boolean,
  ): Promise<Result<T>> {
    const state = await this.bootstrap;

    await wait(latencyFor(state));
    state.requestCount += 1;

    if (holdable && holdsReads(state)) {
      // The `loading` trigger's whole behaviour: the call is served by never answering it, which is the
      // pending state a screen renders while a call is in flight.
      return new Promise<Result<T>>(() => undefined);
    }

    const ctx: HandlerContext = { state, actor: actorOf(state) };

    try {
      const data = await work(ctx);

      return { data, meta: metaFor(state) };
    } catch (error) {
      throw withCallTrace(error, state);
    }
  }

  /**
   * Serves one call the simulation may hold: the reading every member takes unless it is a
   * demonstration control or a read whose payload is a collection.
   *
   * @param work - The family call to serve, given the session and the acting persona.
   * @returns The payload the family produced, inside the envelope every port member returns, or a
   *   promise that never settles while the `loading` trigger is in effect.
   * @throws Problem - Whatever the family refused the call with, carrying this call's identifier.
   */
  private async dispatch<T>(work: (ctx: HandlerContext) => T | Promise<T>): Promise<Result<T>> {
    return this.serve(work, true);
  }

  /**
   * Serves one demonstration control, which answers while the `loading` trigger is in effect.
   *
   * `setSimulation` and `resetDemo` are how the popover lifts a trigger, `switchRole` is how the
   * session changes hands, and `getActiveUser` is how the shell learns who it is acting as, so none of
   * the four can be held: a control that never answered would leave the session pending with no way
   * back, and rule P-8 will not have a control that cannot act.
   *
   * @param work - The control's own work, given the session and the acting persona.
   * @returns The payload the control produced, inside the envelope every port member returns.
   * @throws Problem - Whatever the control refused the call with, carrying this call's identifier.
   */
  private async dispatchControl<T>(
    work: (ctx: HandlerContext) => T | Promise<T>,
  ): Promise<Result<T>> {
    return this.serve(work, false);
  }

  /**
   * Serves one read whose payload is a collection, which the simulation's `empty` trigger empties.
   *
   * The read is served in full — its permission and policy checks run, and a refused call is still
   * refused — and only the records it answers with are withheld while the trigger is in effect, so an
   * emptied list is an answer the caller was entitled to receive rather than a way round the matrix
   * (AAP 0.12.1). The `loading` trigger holds the call exactly as it holds any other.
   *
   * @param work - The family read to serve, given the session and the acting persona.
   * @returns The records the family read, or no records while the `empty` trigger is in effect.
   * @throws Problem - Whatever the family refused the call with, carrying this call's identifier.
   */
  private async dispatchCollection<T>(
    work: (ctx: HandlerContext) => T[] | Promise<T[]>,
  ): Promise<Result<T[]>> {
    return this.serve(
      async (ctx) => {
        const records = await work(ctx);

        return emptiesLists(ctx.state) ? [] : records;
      },
      true,
    );
  }

  /* -------------------------------------------------------------------------------------------
   * Overview — specification SCR-01
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the overview over the records the acting persona may see, narrowed by the shell's selection.
   *
   * The four tiles, the by-plant rows and the fourteen-day series are the exception family's
   * aggregation, computed in `src/domain/aggregation/overview.ts`; this member only supplies the scope.
   *
   * @param scope - The shell's plant and product selection.
   * @returns The overview, with the six sources' freshness in its metadata.
   * @throws Problem - A `'permission'` failure when the role may not read the exception family.
   */
  async getOverview(scope: Scope): Promise<Result<Overview>> {
    return this.dispatch((ctx) => exceptions.getOverview(ctx, selectionOf(scope)));
  }

  /* -------------------------------------------------------------------------------------------
   * Exceptions — specification SCR-02 and SCR-03
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the exception queue, narrowed by the caller's filters and the shell's selection.
   *
   * The queue's own plant filter wins over the shell's plant selection where it is present, because it
   * is the narrower statement of the same fact and the reader who set it is looking at that filter;
   * the shell's selection fills the plant only when the queue's filter is absent. Both members of the
   * shell's selection otherwise reach the one resolver, so a product chosen in the top bar narrows
   * these rows exactly as it narrows the overview beside them (AAP 0.2.1).
   *
   * @param query - SCR-02's own filters, order and page.
   * @param scope - The shell's plant and product selection.
   * @returns The page's rows, ordered as the query asked; none while the simulation's `empty` trigger
   *   empties the session's collections.
   * @throws Problem - A `'permission'` failure when the role may not read the family, or a
   *   `'validation'` failure when a row's figure cannot be resolved.
   */
  async listExceptions(
    query: ExceptionQuery,
    scope: Scope,
  ): Promise<Result<ExceptionRow[]>> {
    const selection = selectionOf(scope);

    return this.dispatchCollection((ctx) =>
      exceptions.listExceptions(
        ctx,
        query,
        // The queue's own filter replaces the shell's plant selection outright where it is present,
        // rather than joining it: it is the narrower statement of the same fact, so the list the
        // selection named is cleared to the one plant the reader typed.
        query.plantId === undefined
          ? selection
          : { ...selection, plantId: query.plantId, plantIds: [] },
      ),
    );
  }

  /**
   * Reads one exception's investigation payload.
   *
   * @param exceptionId - The exception to read.
   * @returns The record, its impact chain, the projected stock, the affected orders, the missing
   *   inputs, the confidence and the activity recorded against it.
   * @throws Problem - A `'not-found'` failure for an identifier the set does not hold, a
   *   `'permission'` failure for one outside the role's reach.
   */
  async getExceptionDetail(exceptionId: ExceptionId): Promise<Result<ExceptionDetail>> {
    return this.dispatch((ctx) => exceptions.getException(ctx, exceptionId));
  }

  /**
   * Reads the customer order lines one exception places at risk.
   *
   * The lines are the exception record's own, copied so a caller cannot reach the adapter's state
   * through them. The family's baseline-measured view of the same orders travels as
   * `ExceptionDetail.affectedOrders`; deriving the lines a second time here would be a second answer
   * to one measurement (the third OPEN ITEM in this module's header).
   *
   * @param exceptionId - The exception whose lines are read.
   * @returns The affected lines, each with a usable unit count; none while the simulation's `empty`
   *   trigger empties the session's collections.
   * @throws Problem - The `Problem` the detail read refuses the call with.
   */
  async getAffectedLines(exceptionId: ExceptionId): Promise<Result<AffectedLine[]>> {
    return this.dispatchCollection(async (ctx) => {
      const detail = await exceptions.getException(ctx, exceptionId);

      return detail.exception.affectedLines.map((line) => ({ ...line }));
    });
  }

  /**
   * Assigns an exception to a persona and appends the `assign` audit event.
   *
   * @param exceptionId - The exception to assign.
   * @param ownerId - The persona made accountable.
   * @returns The exception as it now stands.
   * @throws Problem - A `'permission'` failure when the role may not work the exception, a
   *   `'not-found'` failure for an assignee the records do not hold.
   */
  async assignException(
    exceptionId: ExceptionId,
    ownerId: UserId,
  ): Promise<Result<OperationalException>> {
    return this.dispatch(async (ctx) => {
      const detail = await exceptions.assignException(ctx, exceptionId, ownerId);

      return detail.exception;
    });
  }

  /**
   * Records a note against an exception and appends the `note` audit event.
   *
   * @param exceptionId - The exception the note is about.
   * @param note - The planner's own words; a blank note is refused by the family.
   * @returns The exception as it now stands.
   * @throws Problem - A `'permission'` failure for a role that may not work the exception, a
   *   `'validation'` failure for a blank note.
   */
  async noteException(exceptionId: ExceptionId, note: string): Promise<Result<OperationalException>> {
    return this.dispatch(async (ctx) => {
      const detail = await exceptions.addExceptionNote(ctx, exceptionId, note);

      return detail.exception;
    });
  }

  /**
   * Dismisses an exception with the reason it rests on, and appends the `dismiss` audit event.
   *
   * @param exceptionId - The exception to dismiss.
   * @param reason - Why it is set aside; a blank reason is refused by the family.
   * @returns The exception as it now stands.
   * @throws Problem - A `'permission'` failure for a role that may not work the exception, a
   *   `'validation'` failure for a blank reason.
   */
  async dismissException(
    exceptionId: ExceptionId,
    reason: string,
  ): Promise<Result<OperationalException>> {
    return this.dispatch(async (ctx) => {
      const detail = await exceptions.dismissException(ctx, exceptionId, reason);

      return detail.exception;
    });
  }

  /* -------------------------------------------------------------------------------------------
   * Scenarios — specification SCR-04, contracts §4
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads every option measured for one exception, with the recommendation and the rejected options.
   *
   * @param exceptionId - The exception whose options are read.
   * @returns The scenario set the comparison matrix renders.
   * @throws Problem - A `'permission'` failure where the role may not read the exception, a
   *   `'not-found'` failure for an identifier the set does not hold.
   */
  async getScenarioSet(exceptionId: ExceptionId): Promise<Result<ScenarioSet>> {
    return this.dispatch((ctx) => scenarios.getScenarioSet(ctx, exceptionId));
  }

  /**
   * Measures one option at the levers a caller supplies — the comparison screen's sandbox.
   *
   * A lever outside its constraint is not a failed call: the family returns a scenario whose
   * `constraintCheck` fails with one message per breach (contracts §4, AAP 0.8).
   *
   * @param exceptionId - The exception the option answers.
   * @param levers - The air and transfer quantities to measure.
   * @returns The measured option.
   * @throws Problem - A `'permission'` failure for a role that may not create an option, a
   *   `'not-found'` failure for an exception with no solver case.
   */
  async solveScenario(exceptionId: ExceptionId, levers: Levers): Promise<Result<Scenario>> {
    return this.dispatch((ctx) => scenarios.solveScenarioSandbox(ctx, exceptionId, levers));
  }

  /* -------------------------------------------------------------------------------------------
   * Approvals — specification SCR-05
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the approval inbox: the approvals that answer the query, in scope, ordered and paged.
   *
   * The family owns the whole read. It applies the acting role's plant scope together with the plant set
   * the shell's selection resolves to, narrows the population by the status the query names, and only
   * then orders it, continues from the cursor and cuts the page — so a `limit` bounds the approvals that
   * answer the query rather than a page the filter is applied to afterwards, and an approval whose
   * exception the records do not hold reaches nobody (the port's `listApprovals` states the same rule;
   * AAP 0.2.1). This member therefore supplies the resolved plant set and nothing else: it filters no
   * record, maps none and slices nothing.
   *
   * @param query - The paging, order and optional status filter.
   * @param scope - The shell's plant and product selection.
   * @returns One page of the approvals answering the query, in the requested order; none while the
   *   simulation's `empty` trigger empties the session's collections.
   * @throws Problem - A `'permission'` failure when the role may not read the exception family.
   */
  async listApprovals(
    query: ListQuery & { status?: ApprovalStatus },
    scope: Scope,
  ): Promise<Result<Approval[]>> {
    return this.dispatchCollection((ctx) =>
      approvals.listApprovals(ctx, { ...query, plantIds: scopedPlants(scope, ctx.actor.role) }),
    );
  }

  /**
   * Reads one approval: the plan, its cost against the revenue it protects, the eligible approver
   * roles, the decision taken where one exists and the write-backs it sets in motion.
   *
   * @param approvalId - The approval to read.
   * @returns The approval record.
   * @throws Problem - A `'not-found'` failure for an identifier the set does not hold.
   */
  async getApproval(approvalId: ApprovalId): Promise<Result<Approval>> {
    return this.dispatch((ctx) => approvals.getApproval(ctx, approvalId));
  }

  /**
   * Reads the outcome card's planned and resulting measurements for one approval.
   *
   * Both are `solveSupplyDelay`'s output on the exception's own case — the plan taken at its option's
   * levers, the records taken at the levers the change actually reached — so this member supplies
   * nothing but the identifier and computes no difference itself (rule P-6). The all-or-nothing rule
   * of AAP 0.2.2 is what decides the second side.
   *
   * @param approvalId - The approval whose outcome is measured.
   * @returns The planned measurement and the resulting one.
   * @throws Problem - A `'permission'` failure when the plans are not readable, a `'not-found'`
   *   failure for an approval or an option the records do not hold, or a `'validation'` failure when
   *   the exception carries no solver case.
   */
  async getApprovalOutcome(approvalId: ApprovalId): Promise<Result<ApprovalOutcome>> {
    return this.dispatch((ctx) => approvals.getApprovalOutcome(ctx, approvalId));
  }

  /**
   * Puts a scenario forward for approval and appends the `approval request` audit event.
   *
   * The requester and the eligible approver roles are taken from the acting persona by the family,
   * which is why neither is a member of the request. The call is refused, with the source and its
   * as-of time in the message and with no approval created, while the order-book source is stale or
   * unavailable — the service half of the freshness rule the screens repeat (AAP 0.2.1, T-13).
   *
   * @param request - The exception and the option put forward.
   * @returns The approval the request created.
   * @throws Problem - A `'permission'` failure for a role that may not request, a `'validation'`
   *   failure for a stale source or an option that cannot be approved, a `'policy'` failure where a
   *   rule denies it.
   */
  async requestApproval(request: {
    exceptionId: ExceptionId;
    scenarioId: ScenarioId;
  }): Promise<Result<Approval>> {
    return this.dispatch((ctx) =>
      approvals.requestApproval(ctx, request.exceptionId, request.scenarioId),
    );
  }

  /**
   * Records a decision on an approval and appends the `decision` audit event.
   *
   * Every refusal leaves the approval as it stood and creates no write-back: the `Problem` names the
   * permission with the roles that may act, the policy with the alternative it permits, or the stale
   * source with its as-of time, which is the sentence the disabled controls repeat (rule P-8).
   *
   * @param approvalId - The approval being decided.
   * @param decision - The action taken and the comment it requires.
   * @returns The approval as it now stands.
   * @throws Problem - A `'permission'` failure, a `'policy'` failure, a `'validation'` failure or a
   *   `'not-found'` failure, each naming its cause.
   */
  async decideApproval(approvalId: ApprovalId, decision: Decision): Promise<Result<Approval>> {
    return this.dispatch((ctx) =>
      approvals.decideApproval(ctx, approvalId, decision, decision.comment),
    );
  }

  /**
   * Records that the post-approval outcome has been read against the plan.
   *
   * Both sides of that comparison are computed by the adapter from the records it holds, so a caller
   * supplies neither a figure nor a comment (rule P-6).
   *
   * @param approvalId - The approval whose outcome is reviewed.
   * @returns The approval as it now stands.
   * @throws Problem - A `'permission'` failure, a `'validation'` failure for an approval not yet
   *   decided, or a `'not-found'` failure.
   */
  async reviewApprovalOutcome(approvalId: ApprovalId): Promise<Result<Approval>> {
    return this.dispatch((ctx) => approvals.reviewApprovalOutcome(ctx, approvalId));
  }

  /**
   * Re-attempts one failed step of an approved change's write-back and lets the change complete.
   *
   * AAP 0.2.2's retry: the step is addressed by the reference it writes, a step that already
   * succeeded is refused rather than written a second time, and the steps the failure left untouched
   * run afterwards in their recorded order. A refusal leaves the change as it stood, and the order
   * book's freshness still gates the write, because a retry writes where the first attempt did.
   *
   * @param approvalId - The approval whose step is retried.
   * @param writeBackId - The reference of the step to re-attempt, as the tracker reports it.
   * @returns The step, in the state the retry left it.
   * @throws Problem - A `'permission'` failure when the role may not act on the plan, a `'not-found'`
   *   failure for a reference that answers no step, or a `'validation'` failure when the approval is
   *   not approved, the step already succeeded, the record moved or the order book is stale.
   */
  async retryWriteBack(approvalId: ApprovalId, writeBackId: string): Promise<Result<WriteBack>> {
    return this.dispatch((ctx) => approvals.retryWriteBack(ctx, approvalId, writeBackId));
  }

  /* -------------------------------------------------------------------------------------------
   * Audit — specification SCR-05, contracts §6
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the audit trail, in chain order, with the before and after values the drawer shows.
   *
   * @param query - The filters, order and page the trail read asked for.
   * @returns The events the filter admits; none while the simulation's `empty` trigger empties the
   *   session's collections.
   * @throws Problem - A `'permission'` failure when the role does not hold `audit.read`.
   */
  async listAuditEvents(query: AuditQuery): Promise<Result<AuditEvent[]>> {
    return this.dispatchCollection((ctx) => audit.listAuditEvents(ctx, query));
  }

  /**
   * Reads one event of the chain with the before and after payloads the detail drawer shows.
   *
   * The audit family owns the read and its `audit.read` gate. The chain is not plant-scoped, so no
   * selection narrows this read and none is taken.
   *
   * @param auditEventId - The event to read, in the chain's own identifier form.
   * @returns The event, as a copy of the record.
   * @throws Problem - A `'permission'` failure when the role does not hold `audit.read`, or a
   *   `'not-found'` failure naming an identifier the chain does not hold.
   */
  async getAuditEvent(auditEventId: AuditEventId): Promise<Result<AuditEvent>> {
    return this.dispatch((ctx) => audit.getAuditEvent(ctx, auditEventId));
  }

  /**
   * Verifies the chain by recomputing every hash in sequence and reporting each break.
   *
   * The walk changes nothing: after the simulation's tamper control edits the seeded event, the
   * report names that event's own position and the records stay as they were edited (AAP 0.8, AAP
   * 0.10). The interface applies `SIM_LABELS[4]`, the control label, wherever the chain surfaces
   * (rule P-4).
   *
   * @returns The report: how many events were checked and every position at which the chain does not
   *   verify.
   * @throws Problem - A `'permission'` failure when the role does not hold `audit.read`.
   */
  async verifyAuditChain(): Promise<Result<ChainReport>> {
    return this.dispatch((ctx) => audit.verifyAuditChain(ctx));
  }

  /* -------------------------------------------------------------------------------------------
   * Evidence assistant — specification SCR-06, contracts §10
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the model catalogue the assistant's selector offers.
   *
   * The four records are placeholders that declare the boundary each model processes within; no model
   * is connected in this run (rule P-1), and the screen shows them under `SIM_LABELS[6]`, the
   * declared-configuration label.
   *
   * @returns The catalogue, with the default model's identifier.
   * @throws Problem - A `'permission'` failure when the role does not hold `evidence.read`.
   */
  async getModelCatalogue(): Promise<Result<ModelCatalogue>> {
    return this.dispatch((ctx) => assistant.listModels(ctx));
  }

  /**
   * Lists the questions the assistant panel offers, in the order the records hold them.
   *
   * Only each question's identifier and prompt cross the boundary; the answer it is scripted to
   * receive stays with the builders until the question is asked (rule P-6).
   *
   * @returns The suggested questions, in record order.
   * @throws Problem - A `'permission'` failure when the role does not hold `evidence.read`.
   */
  async listSuggestedQuestions(): Promise<Result<SuggestedQuestion[]>> {
    return this.dispatch((ctx) => assistant.listSuggestedQuestions(ctx));
  }

  /**
   * Puts a question to the evidence assistant and returns its cited answer.
   *
   * A question outside the six scripted ones comes back as the seeded notice with no citations, and a
   * question the policy blocks is refused rather than answered: the `Problem` carries the policy, its
   * reason, the alternative it permits and the event it appended, which is what the block card shows
   * with its one-click switch to the in-boundary model (AAP 0.12.4).
   *
   * @param query - The question, the model the selector chose and the records it runs over.
   * @returns The answer: its text, its citations, the queries it ran, its model and its gaps.
   * @throws Problem - A `'policy'` failure where POL-007 blocks the requested model, a
   *   `'permission'` failure for a role that may not read the evidence, a `'not-found'` failure for a
   *   model the catalogue does not hold.
   */
  async askAssistant(query: {
    question: string;
    modelId: string;
    contextRefs: string[];
  }): Promise<Result<Answer>> {
    return this.dispatch((ctx) =>
      assistant.askAssistant(ctx, {
        text: query.question,
        modelId: query.modelId,
        contextRefs: query.contextRefs,
      }),
    );
  }


  /* -------------------------------------------------------------------------------------------
   * Governance — specification SCR-07
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the sovereignty screen's payload: the deployment summary, the ten declared rows and the
   * outbound ledger with its thirty-day counts.
   *
   * Every part of it describes declared configuration, so the screen renders the summary and each row
   * under `SIM_LABELS[6]`, the declared-configuration label; nothing here reports a state that was
   * checked (rule P-4), and the ledger's two columns are counted from the audit trail rather than
   * asserted (rule P-6).
   *
   * @returns The summary, the declared rows and the ledger.
   * @throws Problem - A `'permission'` failure when the role does not hold `sovereignty.read`.
   */
  async getSovereigntyStatus(): Promise<Result<SovereigntyStatus>> {
    return this.dispatch((ctx) => governance.getSovereignty(ctx));
  }

  /**
   * Reads the outbound ledger on its own: one row per endpoint, with its purpose, its declared state,
   * its last attempt and its allowed and blocked counts over the window.
   *
   * The list parameters `query` carries are the ones contracts §9 fixes for every list read
   * (AAP 0.6.3, AAP 0.12.3), applied by the governance family to the rows `computeLedger` produced.
   *
   * @param query - The ordering and page position the read carries.
   * @returns The ledger rows; none while the simulation's `empty` trigger empties the session's
   *   collections.
   * @throws Problem - A `'permission'` failure when the role does not hold `sovereignty.read`, and a
   *   `'validation'` failure when the cursor names no endpoint of the requested order.
   */
  async getOutboundLedger(query: ListQuery): Promise<Result<LedgerRow[]>> {
    return this.dispatchCollection((ctx) => governance.getOutboundLedger(ctx, query));
  }

  /**
   * Reads the policy list: every policy the engine evaluates and the one the deployment only declares.
   *
   * The list parameters `query` carries are the ones contracts §9 fixes for every list read
   * (AAP 0.6.3, AAP 0.12.3), applied by the governance family to the entries it builds.
   *
   * @param query - The ordering and page position the read carries.
   * @returns The policies, each stating whether the engine evaluates it and the decisions it
   *   recorded; none while the simulation's `empty` trigger empties the session's collections.
   * @throws Problem - A `'permission'` failure when the role does not hold `policy.read`, and a
   *   `'validation'` failure when the cursor names no policy of the requested order.
   */
  async listPolicies(query: ListQuery): Promise<Result<PolicyDetail[]>> {
    return this.dispatchCollection((ctx) => governance.listPolicies(ctx, query));
  }

  /**
   * Reads one policy with its display statement and its recent decisions.
   *
   * @param policyId - The policy to read.
   * @returns The policy detail.
   * @throws Problem - A `'permission'` failure for a role without `policy.read`, a `'not-found'`
   *   failure for an identifier the set does not hold.
   */
  async getPolicy(policyId: PolicyId): Promise<Result<PolicyDetail>> {
    return this.dispatch((ctx) => governance.getPolicy(ctx, policyId));
  }

  /**
   * Requests a time-boxed exception against a policy and records the request.
   *
   * The request needs a reason, an expiry and a second approver before it exists, and the flow leaves
   * it pending: nothing in the demonstration decides one (AAP 0.12.4). The requester is the acting
   * persona, taken from the session rather than from the caller.
   *
   * @param request - The policy, the reason, the expiry and the second approver.
   * @returns The pending request.
   * @throws Problem - A `'permission'` failure for a role without `policy.exception.request`, a
   *   `'validation'` failure for a blank reason, an expiry that is not after the demonstration clock,
   *   or a second approver who is the requester.
   */
  async requestPolicyException(request: {
    policyId: PolicyId;
    reason: string;
    expiresAt: Timestamp;
    secondApproverId: UserId;
  }): Promise<Result<PolicyException>> {
    return this.dispatch((ctx) =>
      governance.requestPolicyException(ctx, request.policyId, {
        reason: request.reason,
        expiresAt: request.expiresAt,
        secondApproverId: request.secondApproverId,
      }),
    );
  }

  /* -------------------------------------------------------------------------------------------
   * Evidence — principle PR-6, AAP 0.12.3
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the evidence behind one displayed figure, mark, node, arc or pin.
   *
   * @param ref - The reference the element carries, in the service's own form.
   * @returns The value, its provenance, its label, its formula, the records around it, its
   *   confidence, its missing inputs and the documents behind it.
   * @throws Problem - A `'not-found'` failure for a reference no family answers, a `'permission'`
   *   failure for a record outside the role's reach.
   */
  async getEvidence(ref: string): Promise<Result<Evidence>> {
    return this.dispatch((ctx) => evidence.getEvidence(ctx, ref));
  }

  /**
   * Reads one document's body as the calling persona may receive it.
   *
   * A body classified customer-confidential is withheld before it reaches this boundary for a persona
   * without `document.confidential.read`: the call is refused with a `'permission'` failure rather
   * than answered with an empty body, so a redaction cannot be mistaken for an empty document
   * (AAP 0.6.2, AAP 0.12.3).
   *
   * @param documentId - The document to read.
   * @returns The body, for a caller permitted to receive it.
   * @throws Problem - A `'permission'` failure for a withheld body, a `'not-found'` failure for an
   *   identifier the set does not hold.
   */
  async getDocument(documentId: DocumentId): Promise<Result<DocumentBody>> {
    return this.dispatch((ctx) => evidence.getDocument(ctx, documentId));
  }

  /**
   * Reads the evidence pins the calling persona may see: the external supplier engineer receives its
   * own vendor's pins and no other vendor's (AAP 0.6.2, AAP 0.12.3).
   *
   * The list parameters `query` carries are the ones contracts §9 fixes for every list read
   * (AAP 0.6.3, AAP 0.12.3), applied by the evidence family to the pins the persona may see.
   *
   * @param query - The ordering and page position the read carries, applied to the visible pins.
   * @returns The visible pins, each with its node and review state; none while the simulation's
   *   `empty` trigger empties the session's collections.
   * @throws Problem - A `'permission'` failure when the role does not hold `evidence.read`, and a
   *   `'validation'` failure when the cursor names no pin of the requested order.
   */
  async listPins(query: ListQuery): Promise<Result<EvidencePin[]>> {
    return this.dispatchCollection((ctx) => evidence.listVisiblePins(ctx, query));
  }

  /**
   * Records a review of one pin's state and appends the event that review leaves behind.
   *
   * Carried for interface conformance with the stage that shows pins (AAP 0.12.3). The reviewer is
   * the acting persona, which has to hold `evidence.review`; the state is the vocabulary the canvas
   * badges already render. The adapter authorises the review itself rather than trusting a screen to
   * have hidden a control.
   *
   * @param pinId - The pin under review.
   * @param state - The state the reviewer sets.
   * @returns The pin as it now stands.
   * @throws Problem - A `'permission'` failure when the role does not hold `evidence.review`, a
   *   `'not-found'` failure for an identifier the set does not hold.
   */
  async reviewPin(pinId: EvidencePinId, state: PinState): Promise<Result<EvidencePin>> {
    return this.dispatch(async (ctx) => {
      if (!hasPermission(ctx.actor.role, EVIDENCE_REVIEW, null, ctx.actor)) {
        throw permissionProblem(
          ctx,
          EVIDENCE_REVIEW,
          `Reviewing an evidence pin requires the ${EVIDENCE_REVIEW} permission, which the acting ` +
            `role (${ctx.actor.role}) does not hold, so no review is recorded.`,
        );
      }

      const pin = ctx.state.records.evidencePins.find((candidate) => candidate.id === pinId);

      if (pin === undefined) {
        throw notFoundProblem(
          ctx,
          `The record set holds no evidence pin with the identifier ${pinId}, so no review can be ` +
            'recorded against it.',
        );
      }

      const before: AuditPayload = { id: pin.id, state: pin.state };

      pin.state = state;

      const after: AuditPayload = { id: pin.id, state: pin.state };

      await audit.appendAuditEvent(ctx, {
        action: EVIDENCE_REVIEW_ACTION,
        objectRef: pin.id,
        result: 'succeeded',
        before,
        after,
      });

      return { ...pin };
    });
  }

  /**
   * Reads the part approval packages with the elements whose states the evidence rules decided.
   *
   * Each record is read through the package read, so one permission check and one copy rule serve the
   * list and the detail rather than two (AAP 0.12.3). Readiness travels on the record: it is the
   * package's own whole-percent figure and no percentage is computed here (rule P-6).
   *
   * The list parameters `query` carries are the ones contracts §9 fixes for every list read
   * (AAP 0.6.3, AAP 0.12.3), applied by the evidence family.
   *
   * @param query - The ordering and page position the read carries.
   * @returns The packages, in the record set's order unless the query names another; none while the
   *   simulation's `empty` trigger empties the session's collections.
   * @throws Problem - A `'permission'` failure when the role does not hold `evidence.read`, and a
   *   `'validation'` failure when the cursor names no package of the requested order.
   */
  async listPackages(query: ListQuery): Promise<Result<PpapPackage[]>> {
    return this.dispatchCollection((ctx) => evidence.listPackages(ctx, query));
  }

  /**
   * Reads one part approval package with its elements and its readiness.
   *
   * @param packageId - The package to read.
   * @returns The package, with each element's rule and that rule's own wording.
   * @throws Problem - A `'permission'` failure for a role without `evidence.read`, a `'not-found'`
   *   failure for an identifier the set does not hold.
   */
  async getPackage(packageId: PackageId): Promise<Result<PpapPackage>> {
    return this.dispatch((ctx) => evidence.getPackage(ctx, packageId));
  }

  /**
   * Records a review of one extracted element value, re-runs the evidence rules and returns the
   * package as it now stands.
   *
   * The reviewer is the acting persona, which has to hold `evidence.review`; a caller never applies
   * the rules itself, so one module decides what an element's state is (contracts §8).
   *
   * @param review - The package, the element, the decision and the value it holds afterwards.
   * @returns The package as the re-run left it.
   * @throws Problem - A `'permission'` failure for a role without `evidence.review`, a
   *   `'validation'` failure for a review that contradicts the package it addresses.
   */
  async reviewElement(review: ElementReview): Promise<Result<PpapPackage>> {
    return this.dispatch((ctx) =>
      evidence.reviewPackageElement(ctx, review.packageId, review.elementNumber, review),
    );
  }

  /* -------------------------------------------------------------------------------------------
   * Identifier search — specification §5.1
   * ----------------------------------------------------------------------------------------- */

  /**
   * Searches the identifiers the caller may see, grouped by the record kind they belong to.
   *
   * Only the families the acting persona may read are indexed, so the search cannot become a way round
   * a forbidden read, and the records that name a plant are narrowed by the role's scope intersected
   * with the shell's selection. A record that names no plant at all — a document, a package, a pin, an
   * event, a policy — is not plant-scoped and is returned; a record that should name one and cannot,
   * such as an approval or a scenario whose exception the records do not hold, is absent from the index
   * rather than offered as one that names none. A hit opens its own screen where one exists and the
   * evidence drawer otherwise; an empty term returns nothing rather than every record.
   *
   * @param term - What the reader typed.
   * @param scope - The shell's plant and product selection.
   * @returns The hits, grouped by family in the order the families are indexed; none while the
   *   simulation's `empty` trigger empties the session's collections.
   */
  async searchIdentifiers(term: string, scope: Scope): Promise<Result<SearchHit[]>> {
    return this.dispatchCollection((ctx) => {
      const needle = term.trim().toLowerCase();

      if (needle === '') {
        return [];
      }

      const plants = scopedPlants(scope, ctx.actor.role);

      return searchableCandidates(ctx.state, ctx.actor)
        .filter((candidate) => candidate.ref.toLowerCase().includes(needle))
        .filter(
          (candidate) => candidate.plantId === undefined || plants.includes(candidate.plantId),
        )
        .map((candidate) => ({
          ref: candidate.ref,
          entityType: candidate.entityType,
          target: candidate.target,
        }));
    });
  }

  /* -------------------------------------------------------------------------------------------
   * FileMap canvas — specification §6 and SCR-12
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the topology both lenses of the FileMap canvas draw: the four node families, the lanes
   * between them and the evidence-pin counts of each node, narrowed to the shell's selection.
   *
   * The canvas family owns the payload, applies the role's reach and narrows the network to the scope
   * `resolveScope` returns, so a plant chosen in the top bar narrows the graph exactly as it narrows the
   * queue (AAP 0.2.1, AAP 0.12.3 "`exception.read` in scope"). The pin counts travel here, so a node
   * badge needs no second call.
   *
   * @param scope - The shell's plant and product selection.
   * @returns The nodes, the lanes and the per-node pin counts the resolved scope retains.
   * @throws Problem - A `'permission'` failure when the role may not read the canvas.
   */
  async getTopology(scope: Scope): Promise<Result<Topology>> {
    return this.dispatch((ctx) => topology.getTopology(ctx, selectionOf(scope)));
  }

  /**
   * Reads the six computed tiles of the FileMap canvas ribbon for the shell's selection.
   *
   * The ribbon is the exception family's aggregation, not this adapter's arithmetic:
   * `computeRibbonTiles` copies the overview's aggregate values across and counts the rows the same
   * scope returns, so the only thing this member supplies is the scope. The shell's selection reaches
   * the canvas family through `selectionOf`, exactly as `getOverview` and `getTopology` map it, so the
   * ribbon, the overview and the canvas count the same records.
   *
   * @param scope - The shell's plant and product selection.
   * @returns Six tiles, in the order the aggregation states them.
   * @throws Problem - A `'permission'` failure when the role may not read the canvas, or a
   *   `'validation'` failure when a record a tile's figure is drawn from does not resolve.
   */
  async getCanvasRibbon(scope: Scope): Promise<Result<RibbonTile[]>> {
    return this.dispatch((ctx) => topology.getCanvasRibbon(ctx, selectionOf(scope)));
  }

  /* -------------------------------------------------------------------------------------------
   * Competitive atlas — specification SCR-13, rule P-5
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the simulated market-intelligence pack's atlas: the client's sites, the three competitor
   * networks, the shared chokepoints and the radar axes and series.
   *
   * The payload separates the client's series from the competitors' rather than combining them, and
   * each series carries its own label, so no figure on the screen mixes first-party records with
   * market intelligence (rule P-5). The external supplier engineer is refused, with the permission it
   * lacks and the roles that hold it in the `Problem`.
   *
   * @returns The atlas payload.
   * @throws Problem - A `'permission'` failure when the role does not hold `competitive.read`.
   */
  async getAtlas(): Promise<Result<Atlas>> {
    return this.dispatch((ctx) => atlas.getAtlas(ctx));
  }

  /* -------------------------------------------------------------------------------------------
   * Catalogue reads carried for interface conformance — stage S5, AAP 0.12.3
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the six data sources with their labels, states and as-of times.
   *
   * Carried for the stage that shows the sources workspace; no screen in this run invokes it, and the
   * same freshness reaches every other screen through each result's metadata.
   *
   * @returns The source catalogue, in the order the freshness strip renders it.
   * @throws Problem - A `'permission'` failure while the demonstration's forbidden trigger is on.
   */
  async getSourceCatalogue(): Promise<Result<SourceCatalogue>> {
    return this.dispatch((ctx) => governance.getSourceCatalogue(ctx));
  }

  /**
   * Reads one plant's production plan grid.
   *
   * The record set holds no plan record: the plan workspace and its grid arrive with the stage that
   * adds them, so the call is refused with a `'not-found'` naming the absent family rather than
   * answered with a grid assembled from figures this run has no rule for (rule P-6). The plant is
   * resolved first, so a caller following a stale plant reference is told which of the two is missing.
   *
   * @param plantId - The plant whose plan is asked for.
   * @returns Nothing: the read is carried for conformance and this record set cannot answer it.
   * @throws Problem - A `'not-found'` failure naming the plant or the absent plan-grid record family.
   */
  async getPlanGrid(plantId: PlantId): Promise<Result<PlanGrid>> {
    return this.dispatch((ctx) => {
      const plant = ctx.state.records.plants.find((candidate) => candidate.id === plantId);

      if (plant === undefined) {
        throw notFoundProblem(
          ctx,
          `The record set holds no plant with the identifier ${plantId}, so no plan grid can be ` +
            'resolved for it.',
        );
      }

      throw notFoundProblem(
        ctx,
        `The record set holds no production plan grid for ${plant.name} (${plant.id}): the plan ` +
          'workspace and the plan records behind it arrive with the stage that adds them, and this ' +
          'demonstration holds none.',
      );
    });
  }

  /**
   * Reads the exit package: the sections a deployment hands over.
   *
   * No seeded module holds an exit package or a section of one — the section list and each section's
   * heading are record content this run does not have — so the call is refused with a `'not-found'`
   * naming the absent family rather than answered with sections this module composed (rule P-6).
   *
   * @returns Nothing: the read is carried for conformance and this record set cannot answer it.
   * @throws Problem - A `'not-found'` failure naming the absent exit-package record family.
   */
  async getExitPackage(): Promise<Result<ExitPackage>> {
    return this.dispatch((ctx) => {
      throw notFoundProblem(
        ctx,
        'The record set holds no exit package and no exit-package section: the exit workspace and the ' +
          'records behind it arrive with the stage that adds them, and this demonstration holds none.',
      );
    });
  }

  /* -------------------------------------------------------------------------------------------
   * Browser-built exports — contracts §11, AAP 0.12.1 "exports"
   * ------------------------------------------------------------------------------------------- */

  /**
   * Builds the evidence pack for download: the payload whose document carries `"simulated": true` at
   * its top level, beside the file name and media type a browser offers it under.
   *
   * The pack is composed from the declared deployment record, the outbound ledger and the audit trail, so
   * exporting it is gated by the two permissions those reads are gated by — `sovereignty.read` for the
   * record and the ledger, `audit.read` for the trail and its verification. The API client composes the
   * same document from those same reads, so this gate is what keeps the two adapters from disagreeing
   * about who may export: a persona refused here meets the same refusal there (AAP 0.12.3). The export
   * records itself: one `export` event is appended through the chain after the document is built, so the
   * file describes the session as it stood when the reader asked for it (contracts §6, AAP 0.6.2).
   *
   * @returns The payload: the suggested file name, the media type and the pack's JSON text, built in
   *   the browser and offered as a file rather than sent.
   * @throws Problem - A `'permission'` failure naming whichever of `sovereignty.read` and `audit.read`
   *   the acting role does not hold.
   */
  async exportEvidencePack(): Promise<Result<ExportPayload>> {
    return this.dispatch(async (ctx) => {
      if (!hasPermission(ctx.actor.role, SOVEREIGNTY_READ, null, ctx.actor)) {
        throw permissionProblem(
          ctx,
          SOVEREIGNTY_READ,
          `The evidence pack is composed from the declared deployment record, so exporting it ` +
            `requires the ${SOVEREIGNTY_READ} permission, which the acting role ` +
            `(${ctx.actor.role}) does not hold.`,
        );
      }

      if (!hasPermission(ctx.actor.role, AUDIT_READ, null, ctx.actor)) {
        throw permissionProblem(
          ctx,
          AUDIT_READ,
          `The evidence pack carries the audit trail and its verification, so exporting it requires ` +
            `the ${AUDIT_READ} permission, which the acting role (${ctx.actor.role}) does not hold.`,
        );
      }

      const pack = await buildEvidencePack(ctx.state);

      await audit.appendAuditEvent(ctx, {
        action: EXPORT_ACTION,
        objectRef: pack.filename,
        result: 'succeeded',
        after: { filename: pack.filename, mediaType: pack.mediaType },
      });

      return pack;
    });
  }

  /**
   * Builds one exception's scenario comparison as CSV, from the same solver output the matrix shows.
   *
   * The set is read through the scenario family, so a persona that may not read the exception's
   * options is refused here exactly as it is refused on the screen, and the file and the screen cannot
   * disagree (rule P-6). The client builds the same comparison from its own scenario-set read, so the
   * gate is the same one on both adapters (AAP 0.12.3).
   *
   * @param exceptionId - The exception whose options are compared.
   * @returns The payload: the suggested file name, the CSV media type and the comparison's text.
   * @throws Problem - The `Problem` the scenario-set read refuses the call with.
   */
  async exportScenarioComparison(exceptionId: ExceptionId): Promise<Result<ExportPayload>> {
    return this.dispatch(async (ctx) => {
      const set = await scenarios.getScenarioSet(ctx, exceptionId);
      const comparison = buildScenarioComparisonCsv(set);

      await audit.appendAuditEvent(ctx, {
        action: EXPORT_ACTION,
        objectRef: exceptionId,
        result: 'succeeded',
        after: { filename: comparison.filename, mediaType: comparison.mediaType },
      });

      return comparison;
    });
  }

  /**
   * Builds the chokepoint brief for download: the payload whose document carries
   * `"simulated": true` at its top level, beside the file name and media type a browser offers it
   * under.
   *
   * The brief's gate is the atlas family's own, evaluated once before the file is built and over
   * the same session pack the file is composed from, so the export is refused exactly where the
   * picture is refused and the external supplier engineer reaches neither. The API client composes
   * the brief from its own atlas read, so it refuses the same persona for the same reason (AAP
   * 0.12.3). The brief carries only market-intelligence records, each with its provenance and its
   * label, so the file cannot be read as a first-party record (rules P-5, P-1). The document itself
   * is composed once, by the builder both adapters share, so no payload is composed here and thrown
   * away.
   *
   * @returns The payload: the suggested file name, the JSON media type and the brief's text.
   * @throws Problem - The `Problem` the atlas family refuses the call with.
   */
  async exportChokepointBrief(): Promise<Result<ExportPayload>> {
    return this.dispatch(async (ctx) => {
      atlas.assertChokepointBriefReadable(ctx);

      const brief = buildChokepointBrief(ctx.state);

      await audit.appendAuditEvent(ctx, {
        action: EXPORT_ACTION,
        objectRef: ctx.state.records.marketPackVersion,
        result: 'succeeded',
        after: { filename: brief.filename, mediaType: brief.mediaType },
      });

      return brief;
    });
  }

  /* -------------------------------------------------------------------------------------------
   * Demonstration controls — AAP 0.6.2, AAP 0.12.1
   * ------------------------------------------------------------------------------------------- */

  /**
   * Turns one demonstration trigger on or off.
   *
   * The trigger changes what this adapter returns rather than which branch a component takes, so the
   * same read produces the state whichever screen asks (AAP 0.12.1). Turning the tampered-audit
   * trigger on also edits the seeded event the tamper control addresses, through the simulation
   * module; turning it off clears the flag and leaves the edit in place, because a repair would hide
   * the disagreement a verification is meant to report (rule P-4).
   *
   * The member answers while the `loading` trigger it sets is in effect, because it is the control that
   * lifts that trigger: a demonstration control the trigger held could not lift it, and rule P-8 will
   * not have a control that cannot act.
   *
   * @param flag - The trigger to set: one of the seven screen states, the edited audit event or the
   *   emptied exception queue.
   * @param on - `true` to put the trigger in effect, `false` to lift it.
   * @returns The literal `true`, in the envelope every call returns.
   */
  async setSimulation(flag: SimulationFlag, on: boolean): Promise<Result<true>> {
    return this.dispatchControl<true>((ctx) => {
      setSimulationFlag(ctx.state, flag, on);

      if (on && flag === TAMPER_FLAG) {
        tamperAuditEvent(ctx.state);
      }

      return true;
    });
  }

  /**
   * Restores the seeded state and lifts every trigger, leaving the session as a first visit found it.
   *
   * The records and the chain are re-installed together, so a reader never meets a fresh record set
   * beside the chain of the session being replaced, and the triggers, the pending policy exceptions
   * and the request counter return to what a fresh session holds (contracts §1). It answers while the
   * `loading` trigger is in effect, so a reader can always put the session back (rule P-8).
   *
   * @returns The literal `true`, in the envelope every call returns.
   */
  async resetDemo(): Promise<Result<true>> {
    return this.dispatchControl<true>(async (ctx): Promise<true> => {
      await restoreSeed(ctx.state);
      clearSimulationFlags(ctx.state);

      return true;
    });
  }

  /* -------------------------------------------------------------------------------------------
   * The demonstration capability — AAP 0.12.1, rule P-3
   * ------------------------------------------------------------------------------------------- */

  /**
   * Acts as another of the seeded personas for the rest of the session.
   *
   * A demonstration control, and nothing more. It changes which persona the session claims to be; it
   * grants no right of its own, because every read and write after it is authorised against the new
   * persona by the permission matrix of contracts §7.1 and the policy engine, applied here and in the
   * families rather than in a screen. Because that enforcement runs in the browser of a build with no
   * backend and no sign-in, the checks behind this switch are not production authorisation: the role
   * switcher states so where the control is offered, and the README repeats it. A deployment replaces
   * this capability with real identity and real authorisation.
   *
   * An identifier the record set does not carry is refused with a `'not-found'` failure naming the
   * personas it does carry, and the acting persona stays as it stood: the switch is recorded only
   * once the persona it names has been resolved, so a refused call leaves neither an identity nor an
   * event changed. A successful switch appends the `role switch` event, carrying the persona before
   * and after it, so the trail records who acted as whom (contracts §6).
   *
   * @param userId - The identifier of one of the seeded personas.
   * @returns The persona the session now acts as, in the envelope every call returns.
   * @throws Problem - A `'not-found'` failure for an identifier that matches no seeded persona.
   */
  async switchRole(userId: UserId): Promise<Result<ActiveUser>> {
    return this.dispatchControl(async (ctx) => {
      const record = ctx.state.records.users.find((candidate) => candidate.id === userId);

      if (record === undefined) {
        const known = ctx.state.records.users.map((candidate) => candidate.id).join(', ');

        throw notFoundProblem(
          ctx,
          `The seeded personas are ${known}, and none of them carries the identifier ${userId}, so ` +
            'the demonstration cannot act as it and the acting persona is unchanged.',
        );
      }

      const before: AuditPayload = { id: ctx.actor.id, role: ctx.actor.role };

      ctx.state.activeUserId = record.id;

      const after: AuditPayload = { id: record.id, role: record.role };

      await audit.appendAuditEvent(ctx, {
        action: ROLE_SWITCH_ACTION,
        objectRef: record.id,
        result: 'succeeded',
        before,
        after,
      });

      return actorOf(ctx.state);
    });
  }

  /**
   * Reads the persona the session is acting as.
   *
   * `actorOf`'s own resolution of `state.activeUserId`, and nothing else: the persona's identifier and
   * name, its role, that role's plant scope and permissions, and the home route the router sends it to.
   * The record is therefore the identity this adapter authorises every other call against rather than a
   * second account of it, and a demonstration reset that puts `state.activeUserId` back to the seeded
   * persona is reported by the next read instead of leaving a caller holding the role it switched to.
   *
   * It goes through `dispatchControl` for the same reason `switchRole` does: it must answer while the
   * simulation's `loading` trigger holds, so the shell can always learn who it is acting as. The read
   * the boundary takes at start-up is this member, and it runs before any screen exists — a held read
   * would leave that start-up pending with nothing on screen from which to lift the trigger.
   *
   * @returns The persona the session acts as, in the envelope every call returns.
   */
  async getActiveUser(): Promise<Result<ActiveUser>> {
    return this.dispatchControl((ctx) => actorOf(ctx.state));
  }

  /**
   * Reads the personas a role switch may name, in the record set's own order.
   *
   * The roster the shell's role switcher offers as its options: each record is built by the same
   * {@link activeUserOf} the acting-persona read uses, so an option and the identity a switch to it
   * produces cannot describe one persona two ways. The order is the seed's order, which is also the
   * order the session's opening persona is taken from, so the first option is the persona a fresh
   * session acts as.
   *
   * It changes nothing and records nothing: reading who the demonstration could act as is not one of
   * the acts contracts §6 records, so this member appends no audit event and asks no permission. It
   * goes through `dispatchControl` for `getActiveUser`'s reason — the roster must answer while the
   * simulation's `loading` trigger holds, because a switcher with no options could not be operated
   * to lift it.
   *
   * @returns The personas the adapter can act as, in the envelope every call returns.
   */
  async listPersonas(): Promise<Result<ActiveUser[]>> {
    return this.dispatchControl((ctx) => ctx.state.records.users.map(activeUserOf));
  }
}

