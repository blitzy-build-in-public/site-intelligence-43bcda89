/**
 * The in-browser adapter of the service port: `MockBackend` implements every member of
 * `SiteIntelligenceService` over the demonstration's seeded, mutable state, and `DemonstrationControls`
 * beside it (AAP 0.6.2, AAP 0.12.1 "Mock adapter" row, AAP 0.12.3, rule P-2).
 *
 * The session it serves lives in `./mock-state.ts`, the triggers the simulation popover sets in
 * `./simulation.ts`, and every read and write in one of the nine families under `./handlers/`, so each
 * port member below is a dispatcher and no business arithmetic lives here. Every permission check,
 * policy check and redaction happens inside the adapter, on the value about to be returned.
 *
 * The stage S4 and S5 families are carried for interface conformance: the package, pin and element-review
 * reads are implemented because the seed holds those records, while the production plan grid and the exit
 * package are refused with a `'not-found'` naming the absent record family, because inventing a record is
 * forbidden (rule P-6).
 *
 * The class's public surface is exactly the port's members plus the three names the demonstration
 * capability declares — `switchRole`, `getActiveUser` and the optional `listPersonas` — plus `whenReady`,
 * the readiness promise `src/services/create-service.ts` awaits; a conformance check that compares the
 * class's keys against the two interfaces subtracts all four, and
 * `src/services/service-conformance.test.ts` owns that comparison.
 */

import { UnpriceableLineError } from '../../domain/aggregation/exceptions';
import { UnlocatableClockError } from '../../domain/aggregation/ledger';
import { resolveScope } from '../../domain/aggregation/scope';
import type { ScopeFilterInput } from '../../domain/aggregation/scope';
import { hasPermission, plantScopeFor, rolesWith } from '../../domain/policy/permissions';
import { EXCEPTION_QUEUE_PATH, PERMISSIONS } from '../../types';
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
import { createMockState, restoreSeed, runExclusive } from './mock-state';
import type { HandlerContext, MockState } from './mock-state';
import type { SeedRecordSet } from './seed-loader';
import {
  clearSimulationFlags,
  emptiesLists,
  freshnessFor,
  holdsReads,
  refusesCollectionReads,
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
 * The ticket a session's first call takes.
 *
 * One past the counter's initial value: the counter holds the last ticket taken, so a call's ticket is
 * that number plus one and a fresh session's first call is numbered from here. It is also the ladder's
 * own first step, which is why subtracting it lands the first call of a session on the band's floor.
 */
const FIRST_TICKET = 1;

/**
 * The latency one call takes, from the ticket that call took at its entry.
 *
 * A ladder rather than a random draw: the session's counter starts at the value a fresh session takes
 * and each call takes the next number, so the first six calls of a session take each of the band's six
 * values in turn and the seventh starts again. Two sessions driven by the same calls therefore wait the
 * same amounts, which is what keeps a run reproducible (AAP 0.18.2). The ticket is one-based and the
 * ladder's first step is its floor, so the first call of a session still waits the floor.
 *
 * The ticket is passed in rather than the session being read here, because the counter has moved on by
 * the time a call that overlapped another is served: two calls issued together would read one value
 * between them, wait one ladder step and, worse, be spelled with one correlation identifier
 * (AAP 0.18.1).
 *
 * @param ticket - The call's own number, taken from the session's counter at its entry.
 * @returns The delay, in milliseconds, inside the band AAP 0.12.1 fixes.
 */
function latencyForTicket(ticket: number): number {
  return LATENCY_FLOOR_MS + ((ticket - FIRST_TICKET) % LATENCY_STEPS) * LATENCY_STEP_MS;
}

/**
 * Waits the given number of milliseconds.
 *
 * The only platform facility this adapter uses. Nothing is fetched, no clock is read for business
 * logic and no random source is consulted: the delay is what makes a pending call observable, and the
 * value comes from `latencyForTicket`.
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
 * `src/domain/policy/permissions.ts` owns the matrix, so the list is the matrix's own answer for every
 * permission the vocabulary holds rather than a second table. Each permission is evaluated with no
 * subject, because the question here is what the role holds at all — the probe actor satisfies the
 * signature and is not read — while the plant a call is narrowed to is decided per record by the family
 * that reads it.
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
 * The port carries no acting user, so this is where the demonstration's identity is decided from the
 * record the role switcher selected: every read and write of this adapter is evaluated against the
 * result, so a caller cannot pass a wider identity than the session holds. A session whose active
 * identifier matches no seeded persona is a broken state rather than a caller's mistake — the reset and
 * the bootstrap both install a persona from the same record set — so it fails loudly instead of
 * answering every call as an identity that does not exist.
 *
 * @param state - The session whose active persona is resolved. Not modified.
 * @returns The persona, with the plant scope and permissions its role holds.
 * @throws Error - The session names an identifier the record set does not carry.
 */
function actorOf(state: MockState): ActiveUser {
  const record = state.records.users.find((candidate) => candidate.id === state.activeUserId);

  if (record === undefined) {
    throw new Error(
      `The session acts as ${state.activeUserId}, which the seeded record set does not carry. ` +
        'Every start and every demonstration reset installs the acting persona from that set, so the ' +
        'session must name one of its user records.',
    );
  }

  return activeUserOf(record);
}

/**
 * One persona record as the identity surface reports it: the shape both the acting-persona read and
 * the roster answer with, built in one place so the two cannot describe the same record differently.
 *
 * The plant scope and the permissions are the role's rather than the record's, exactly as the adapter
 * enforces them, so a switch and the roster cannot disagree about what a persona can do.
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
 * The identifier arrives as an argument rather than being read from the session here: it was minted
 * once from the ticket the call took at its entry, and the counter has moved on since — by the time a
 * slow call builds its envelope, the calls issued behind it have each taken a ticket, so reading the
 * counter again would label this result with a neighbour's identifier (AAP 0.18.1).
 *
 * @param state - The session the call was served from. Not modified.
 * @param traceId - The call's correlation identifier, minted from its own ticket.
 * @returns The envelope's `meta`.
 */
function metaFor(state: MockState, traceId: string): Meta {
  return { freshness: freshnessFor(state), simulated: true, traceId };
}

/* ---------------------------------------------------------------------------------------------
 * Refusals this adapter raises itself — rule P-8, AAP 0.12.3
 * --------------------------------------------------------------------------------------------- */

/**
 * The refusal a call this adapter authorises itself throws: the cause, the reason in plain words, the
 * call's trace and the two members a forbidden card needs to name who may act instead (rule P-8).
 *
 * @param ctx - The call's context, whose persona the reason can name and whose trace the refusal
 *   carries.
 * @param permission - The permission the call requires.
 * @param message - The reason, in the plain words the caller supplies.
 * @returns The `Problem` to throw.
 */
function permissionProblem(ctx: HandlerContext, permission: Permission, message: string): Problem {
  return {
    type: 'permission',
    message,
    traceId: ctx.traceId,
    requiredPermission: permission,
    rolesWithPermission: rolesWith(permission),
  };
}

/**
 * The refusal a call naming a record the session does not hold throws.
 *
 * @param ctx - The call's context, whose trace the refusal carries.
 * @param message - The reason, naming the identifier and the records the session does hold where that
 *   helps a reader follow a stale reference.
 * @returns The `Problem` to throw.
 */
function notFoundProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'not-found', message, traceId: ctx.traceId };
}

/**
 * The refusal a collection read meets while the simulation's `conflict` trigger is in effect.
 *
 * The trigger stands for records another persona changed between the moment a screen read them and the
 * moment this adapter served the set, so a set is refused rather than answered from the one that
 * replaced the set the reader was reading: a reader shown a set that changed under them cannot tell
 * which half is current. `ProblemType` fixes five causes and none of them is a conflict, so it is
 * reported as `'validation'` — a request that cannot be honoured against the records as they stand, the
 * reading the stale-source refusal and the approvals family's write refusal also take (AAP 0.12.1,
 * AAP 0.12.3).
 *
 * The message states in plain words what happened and what the reader can do about it, because the
 * screen that renders it is showing the conflicting-update state and nothing else (rule P-8). It words
 * the refusal differently from the decision the approvals family refuses, which says the change is
 * refused rather than merged: the two report one condition and two different actions.
 *
 * @param traceId - The correlation identifier of the call being refused, minted at its entry, so the
 *   identifier a reader quotes is the one the same call's metadata would have carried.
 * @returns The `Problem` to throw.
 */
function conflictProblem(traceId: string): Problem {
  return {
    type: 'validation',
    message:
      'This record changed while it was being read, so the read was refused rather than served stale. ' +
      'Lift the conflicting update in the simulation controls and read again.',
    traceId,
  };
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
 * The refusal a typed refusal from the domain core is reported as: one `Problem` naming a
 * `'validation'` cause, carrying the aggregate's own reason and this call's correlation identifier.
 *
 * The pure aggregates answer a figure or refuse, and AAP 0.12.1 and AAP 0.12.2 fix what they answer —
 * a `Money`, an `ExceptionRow[]`, a `LedgerRow[]` — with no member for an outcome, so a refusal cannot
 * travel back as a value. It travels as the typed error the aggregate raises instead:
 * `UnpriceableLineError` when an affected line names a product the record bundle does not carry, and
 * `UnlocatableClockError` when the demonstration clock is not an instant the ledger's window can be
 * derived from. This is the one place those two become the failure AAP 0.2.2 requires the port to
 * report: the cause is a validation of the records the call was served from, the message is the
 * aggregate's own wording — it already names the record or the value that could not be used — and the
 * identifier is the one this call's `meta` carries, so a reader quoting it leads back to the call.
 *
 * Any other thrown value answers `null`, so the caller keeps handling every other error as it did.
 *
 * @param error - Whatever a family call threw.
 * @param traceId - The call's correlation identifier, minted from the ticket it took at its entry.
 * @returns The `Problem` the domain refusal is reported as, or `null` when the value is not one.
 */
function aggregateRefusalProblem(error: unknown, traceId: string): Problem | null {
  if (!(error instanceof UnpriceableLineError) && !(error instanceof UnlocatableClockError)) {
    return null;
  }

  return { type: 'validation', message: error.message, traceId };
}

/**
 * Gives a refusal the correlation identifier of the call that produced it, and reports a refusal the
 * domain core raised as the `Problem` the port reports failures with.
 *
 * A family composes a few of its refusals from the records it reads and reports the empty identifier
 * rather than inventing one — two of them say so in their own words. This adapter is the one that
 * minted the call's identifier from the ticket it took at the call's entry, so it is the one place that
 * can fill the value in, and doing it here means every refusal a caller meets carries the same
 * `traceId` its `Result` would have carried, which is what makes an identifier a user quotes lead back
 * to the call (AAP 0.12.1, rule P-8). A refusal that already names an identifier keeps it, and a value
 * that is not a refusal is returned untouched: only the empty case is filled, and only for a `Problem`.
 *
 * A typed refusal from the domain core is classified first, by `aggregateRefusalProblem`: a `Money`, an
 * `ExceptionRow[]` or a `LedgerRow[]` is what AAP 0.12.1 and AAP 0.12.2 let an aggregate answer, so a
 * refusal has no result member to arrive in and reaches here as an error instead. Reporting it as a
 * `'validation'` `Problem` with this call's identifier is what keeps an untyped exception from crossing
 * the port (AAP 0.2.2). Every other error keeps the behaviour above unchanged, so a mislabelled record
 * still propagates untouched rather than being passed to a screen as a refusal.
 *
 * @param error - Whatever a family call threw.
 * @param traceId - The call's correlation identifier, minted from its own ticket.
 * @returns The refusal to throw: the `Problem` a domain refusal is reported as, or the value it was
 *   given with the call's identifier where it had none.
 */
function withCallTrace(error: unknown, traceId: string): unknown {
  const refusal = aggregateRefusalProblem(error, traceId);

  if (refusal !== null) {
    return refusal;
  }

  if (!isProblem(error) || error.traceId !== '') {
    return error;
  }

  return { ...error, traceId };
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
 *
 * The queue's prefix is the shared declaration in `src/types/routes.ts`, so a search hit that opens an
 * exception follows the same one path the navigation entry, the stage-notice page and the screens build.
 */
const EXCEPTION_ROUTE = `${EXCEPTION_QUEUE_PATH}/`;
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
 * This is the adapter's whole reading of a `Scope`, and it exists so no family read is handed half of
 * the top bar's selection: a filtered queue, a filtered overview, a narrowed canvas and its ribbon all
 * resolve the same scope from the same filters through `resolveScope` (AAP 0.2.1, AAP 0.12.1 "Scope
 * resolution"). The plant half travels as the whole list the caller named, so a two-plant selection
 * narrows to those two plants instead of widening to every plant the role reaches; a list naming no
 * plant is left out rather than carried as an empty one, which is the shape `exactOptionalPropertyTypes`
 * reads as "All plants" or "All products" — the shape the top bar's absent filters take.
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
 * cannot become a way round a forbidden read. Records that name a plant are returned as plant-scoped
 * candidates and are narrowed by the shell's selection afterwards; the rest name none. An approval or a
 * scenario whose exception the records do not hold is left out rather than indexed as a record naming
 * no plant, so the search fails closed on a subject it cannot place.
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
 * the trace and the persona are decided in one place rather than in every member, and the four methods
 * built on it decide which of the simulation's trigger-wide behaviours a member meets: `dispatchRead`
 * serves a read whose payload is one record, which the `conflict` trigger leaves served so the act that
 * record carries can be attempted (AAP 0.12.4 SCR-05); `dispatch` serves a call that trigger leaves
 * alone because it is not a read — a write, a measurement, an answer or an export; `dispatchControl`
 * serves the demonstration controls that must answer whatever is in effect so the popover can lift it
 * (rule P-8); and `dispatchCollection` serves a read whose payload is a collection, which the `empty`
 * trigger empties and the `conflict` trigger refuses beside the behaviours every read meets (AAP
 * 0.12.1).
 *
 * The public surface is deliberately the port's own set plus the four names its callers need: the
 * readiness promise, the role switch, the read of the persona the session is acting as and the roster
 * a switch may name. Nothing else is public, so a screen cannot reach the families, the state or the
 * chain except through the contract they were declared against.
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
   * Serves one call: the ticket, the timing, the persona, the delegation and the envelope.
   *
   * The order is fixed and each step depends on the one before it. The bootstrap settles first, so the
   * records and the chain are whole. The call's ticket is taken next and before anything is awaited —
   * the counter holds the last ticket taken, so this call's is the next number — and the correlation
   * identifier is minted from that same number once. The delay is then waited, from the ticket rather
   * than from the counter, so the ladder follows the session's own call sequence, a pending screen has
   * something to show, and two calls issued together wait the ladder steps of their own tickets. The
   * persona is resolved from the session, and only then does the family run.
   *
   * Reading the counter at the end instead would be the same mistake twice over: several reads fired by
   * one screen mount enter before any of them answers, so each would wait one step and each would be
   * labelled with whichever ticket the last of them took — and the `traceId` a reader quotes would name
   * no single call, which is the whole of this application's observability (AAP 0.18.1).
   *
   * The simulation's `loading` trigger is decided here, once for every call the adapter serves, because
   * it changes what the call does rather than what one family's records look like (AAP 0.12.1): once
   * the call has taken its ticket, a holdable call the trigger covers never settles, so the screen that
   * asked renders the pending state it renders for any call still in flight (AAP 0.2.1 F10, AAP 0.2.2).
   * `holdable` is what keeps the demonstration controls out of the hold, because the popover has to be
   * able to lift the trigger it set and a control that could not answer would leave the session pending
   * with no way back (rule P-8). The wait happens before the hold, so a held call still occupies the
   * latency band every other call does rather than answering differently.
   *
   * A refusal propagates as it was thrown, with two additions. The pure domain aggregates answer a
   * figure or refuse, and AAP 0.12.1 and AAP 0.12.2 fix their results with no member for an outcome, so
   * a refusal arrives here as the typed error the aggregate raised
   * (`UnpriceableLineError`, `UnlocatableClockError`); `withCallTrace` reports each of them as a
   * `'validation'` `Problem` carrying the aggregate's own reason, so no untyped exception crosses the
   * port (AAP 0.2.2). A family also composes a few of its refusals from the records without a
   * correlation identifier, and those are given this call's before they leave. Either way a caller
   * meets one identifier, and it is the value the same call's `meta` carries.
   *
   * The simulation's `conflict` trigger is decided in the same place and for the same reason (AAP
   * 0.12.1): once the loading trigger has been answered, a refusable call is refused before its family
   * runs, so every collection read reports the conflicting update the one way a screen can render
   * rather than each family deciding for itself what a changed set means (AAP 0.12.3). `refusable` is
   * what keeps the rest out of the refusal: a read whose payload is one record is served so the act it
   * carries can be attempted and refused by the family that owns it (AAP 0.12.4 SCR-05), a write is
   * refused by the family that owns it, and the demonstration controls have to answer so the popover
   * can lift the trigger it set (rule P-8).
   *
   * @param work - The family call to serve, given the session and the acting persona.
   * @param holdable - Whether the `loading` trigger holds this call; `false` only for the demonstration
   *   controls.
   * @param refusable - Whether the `conflict` trigger refuses this call; `true` for every read whose
   *   payload is a collection, `false` for a read of one record, a write or a demonstration control.
   * @returns The payload the family produced inside the envelope every port member returns, or a
   *   promise that never settles while the `loading` trigger holds a holdable call.
   * @throws Problem - The `'validation'` refusal the `conflict` trigger makes of a refusable call, or
   *   whatever the family refused the call with, carrying this call's identifier.
   */
  private async serve<T>(
    work: (ctx: HandlerContext) => T | Promise<T>,
    holdable: boolean,
    refusable: boolean,
  ): Promise<Result<T>> {
    const state = await this.bootstrap;

    // The ticket is written before anything is awaited, which is the whole of the fix this method
    // needed: the counter holds the last ticket taken, so a call's number is the next one, and a call
    // that read it after a delay would read a number another call had already taken (AAP 0.18.1).
    const ticket = state.requestCount + FIRST_TICKET;

    state.requestCount = ticket;

    const traceId = audit.traceIdFor(ticket);

    await wait(latencyForTicket(ticket));

    if (holdable && holdsReads(state)) {
      // The `loading` trigger's whole behaviour: the call is served by never answering it, which is the
      // pending state a screen renders while a call is in flight.
      return new Promise<Result<T>>(() => undefined);
    }

    if (refusable && refusesCollectionReads(state)) {
      // The `conflict` trigger's whole behaviour for a collection read: the records moved under the
      // reader, so the set is refused rather than answered from what replaced it (AAP 0.12.1, 0.12.3).
      throw conflictProblem(traceId);
    }

    const ctx: HandlerContext = { state, actor: actorOf(state), traceId };

    try {
      const data = await work(ctx);

      return { data, meta: metaFor(state, traceId) };
    } catch (error) {
      throw withCallTrace(error, traceId);
    }
  }

  /**
   * Serves one call the simulation's `conflict` trigger leaves alone because it is not a read: a write,
   * a measurement, an answer or a browser-built export.
   *
   * Such a call acts on records the caller already holds rather than reading them afresh, so the
   * trigger's half of the condition is the family's own refusal: the approvals family names the record
   * that moved and refuses to merge the change, which is the write refusal this demonstration shows
   * (AAP 0.12.4 SCR-05). Every read the port declares goes through {@link dispatchRead} or
   * {@link dispatchCollection} instead: a set reaches its screen with the conflicting update reported,
   * and a record is served so the act it carries can be attempted (AAP 0.2.1 F10).
   *
   * @param work - The family call to serve, given the session and the acting persona.
   * @returns The payload the family produced, inside the envelope every port member returns, or a
   *   promise that never settles while the `loading` trigger is in effect.
   * @throws Problem - Whatever the family refused the call with, carrying this call's identifier.
   */
  private async dispatch<T>(work: (ctx: HandlerContext) => T | Promise<T>): Promise<Result<T>> {
    return this.serve(work, true, false);
  }

  /**
   * Serves one read whose payload is a single record: held by the `loading` trigger like any other read,
   * and served while the `conflict` trigger is in effect.
   *
   * The record is where the act it carries starts, so this trigger serves the read and refuses the act
   * instead — the approvals family names the record that moved and refuses to merge the decision made
   * from it (AAP 0.12.4 SCR-05), which is what lets a screen keep its controls and report the refusal in
   * the service's own sentence. A set presented as current is the other half of the condition, and
   * {@link dispatchCollection} is where that half is refused.
   *
   * @param work - The family read to serve, given the session and the acting persona.
   * @returns The payload the family produced, inside the envelope every port member returns, or a
   *   promise that never settles while the `loading` trigger is in effect.
   * @throws Problem - Whatever the family refused the call with, carrying this call's identifier.
   */
  private async dispatchRead<T>(work: (ctx: HandlerContext) => T | Promise<T>): Promise<Result<T>> {
    return this.serve(work, true, false);
  }

  /**
   * Serves one demonstration control, which answers while the `loading` trigger is in effect.
   *
   * None of the four controls can be held: each is a lever the popover or the role switcher has to be
   * able to operate while the trigger is set, and a control that never answered would leave the session
   * pending with no way back (rule P-8).
   *
   * @param work - The control's own work, given the session and the acting persona.
   * @returns The payload the control produced, inside the envelope every port member returns.
   * @throws Problem - Whatever the control refused the call with, carrying this call's identifier.
   */
  private async dispatchControl<T>(
    work: (ctx: HandlerContext) => T | Promise<T>,
  ): Promise<Result<T>> {
    return this.serve(work, false, false);
  }

  /**
   * Serves one read whose payload is a collection, which the simulation's `empty` trigger empties and
   * its `conflict` trigger refuses.
   *
   * The read is served in full — its permission and policy checks run, and a refused call is still
   * refused — and only the records it answers with are withheld while the trigger is in effect, so an
   * emptied list is an answer the caller was entitled to receive rather than a way round the matrix
   * (AAP 0.12.1). The `loading` trigger holds the call exactly as it holds any other, and the `conflict`
   * trigger refuses it because a set presented as current is what that state prevents (AAP 0.12.3,
   * AAP 0.12.4 SCR-05).
   *
   * @param work - The family read to serve, given the session and the acting persona.
   * @returns The records the family read, or no records while the `empty` trigger is in effect.
   * @throws Problem - The `'validation'` refusal the `conflict` trigger makes of a collection read, or
   *   whatever the family refused the call with, carrying this call's identifier.
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
      true,
    );
  }

  /* -------------------------------------------------------------------------------------------
   * Overview — specification SCR-01
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the overview over the records the acting persona may see, narrowed by the shell's selection.
   *
   * The whole payload is the exception family's aggregation, computed in
   * `src/domain/aggregation/overview.ts`; this member only supplies the scope.
   *
   * @param scope - The shell's plant and product selection.
   * @returns The overview, with the six sources' freshness in its metadata.
   * @throws Problem - A `'permission'` failure when the role may not read the exception family.
   */
  async getOverview(scope: Scope): Promise<Result<Overview>> {
    return this.dispatchRead((ctx) => exceptions.getOverview(ctx, selectionOf(scope)));
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
    return this.dispatchRead((ctx) => exceptions.getException(ctx, exceptionId));
  }

  /**
   * Reads the customer order lines one exception places at risk.
   *
   * The lines are the exception record's own, and the family answers them from that record: the
   * baseline-measured view of the same orders travels as `ExceptionDetail.affectedOrders`, so deriving
   * them here a second time would be a second answer to one measurement. The member is a dispatch and
   * nothing more — the narrow read the family exposes, whose `requireRead` and `visibleException` refuse
   * exactly as the detail read refuses, while the aggregate bundle, the baseline solve, the impact chain
   * and the filter of the activity trail the detail read builds are not built for a payload the record
   * already stores.
   *
   * @param exceptionId - The exception whose lines are read.
   * @returns The affected lines, each with a usable unit count; none while the simulation's `empty`
   *   trigger empties the session's collections.
   * @throws Problem - A `'permission'` failure when the role may not read the family or the forbidden
   *   trigger is on, or a `'not-found'` failure for an identifier this read does not reach.
   */
  async getAffectedLines(exceptionId: ExceptionId): Promise<Result<AffectedLine[]>> {
    return this.dispatchCollection((ctx) => exceptions.getAffectedLines(ctx, exceptionId));
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
    return this.dispatchRead((ctx) => scenarios.getScenarioSet(ctx, exceptionId));
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
   * The family owns the whole read, so a `limit` bounds the approvals that answer the query rather than
   * a page the filter is applied to afterwards, and an approval whose exception the records do not hold
   * reaches nobody (the port's `listApprovals` states the same rule; AAP 0.2.1). This member therefore
   * supplies the resolved plant set and nothing else: it filters no record, maps none and slices nothing.
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
   * Reads one approval: its plan, its cost against the revenue it protects and its write-backs.
   *
   * @param approvalId - The approval to read.
   * @returns The approval record.
   * @throws Problem - A `'not-found'` failure for an identifier the set does not hold.
   */
  async getApproval(approvalId: ApprovalId): Promise<Result<Approval>> {
    return this.dispatchRead((ctx) => approvals.getApproval(ctx, approvalId));
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
    return this.dispatchRead((ctx) => approvals.getApprovalOutcome(ctx, approvalId));
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
   * Every refusal leaves the approval as it stood and creates no write-back, naming the permission, the
   * policy or the stale source with its as-of time, which the disabled controls repeat (rule P-8).
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
    return this.dispatchRead((ctx) => audit.getAuditEvent(ctx, auditEventId));
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
    return this.dispatchRead((ctx) => audit.verifyAuditChain(ctx));
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
    return this.dispatchRead((ctx) => assistant.listModels(ctx));
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
    return this.dispatchRead((ctx) => assistant.listSuggestedQuestions(ctx));
  }

  /**
   * Puts a question to the evidence assistant and returns its cited answer.
   *
   * A question outside the six scripted ones comes back as the seeded notice with no citations, and a
   * question the policy blocks is refused rather than answered: the `Problem` carries the policy, its
   * reason, the alternative it permits and the event it appended, which is what the block card shows
   * with its one-click switch to the in-boundary model (AAP 0.12.4).
   *
   * A body the acting role may not open never reaches an answer either: where a question cites a
   * customer-confidential document the persona does not hold `document.confidential.read` for, the
   * call is refused exactly as the document read refuses the same body, so the two paths withhold it
   * alike (AAP 0.2.1, AAP 0.12.3).
   *
   * @param query - The question, the model the selector chose and the records it runs over.
   * @returns The answer: its text, its citations, the queries it ran, its model and its gaps.
   * @throws Problem - A `'policy'` failure where POL-007 blocks the requested model, a
   *   `'permission'` failure for a role that may not read the evidence or may not open the body of a
   *   document the question cites, a `'not-found'` failure for a model the catalogue does not hold.
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
   * Reads the sovereignty payload: the deployment summary, the ten declared rows and the ledger.
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
    return this.dispatchRead((ctx) => governance.getSovereignty(ctx));
  }

  /**
   * Reads the outbound ledger on its own: one row per endpoint, with its allowed and blocked counts.
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
    return this.dispatchRead((ctx) => governance.getPolicy(ctx, policyId));
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
    return this.dispatchRead((ctx) => evidence.getEvidence(ctx, ref));
  }

  /**
   * Reads one document's body as the calling persona may receive it.
   *
   * A body classified customer-confidential is withheld before it reaches this boundary for a persona
   * without `document.confidential.read`, refused as a `'permission'` failure rather than answered with
   * an empty body, so a redaction cannot be mistaken for an empty document (AAP 0.6.2, AAP 0.12.3).
   *
   * @param documentId - The document to read.
   * @returns The body, for a caller permitted to receive it.
   * @throws Problem - A `'permission'` failure for a withheld body, a `'not-found'` failure for an
   *   identifier the set does not hold.
   */
  async getDocument(documentId: DocumentId): Promise<Result<DocumentBody>> {
    return this.dispatchRead((ctx) => evidence.getDocument(ctx, documentId));
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
   * Carried for interface conformance with the stage that shows pins (AAP 0.12.3). The reviewer is the
   * acting persona, which has to hold `evidence.review`, and the adapter authorises the review itself
   * rather than trusting a screen to have hidden a control.
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
   * The list's own `evidence.read` gate runs before any record is read, and each record is still read
   * through the package read, so one copy rule serves the list and the detail rather than two
   * (AAP 0.12.3). Readiness travels on the record: it is the package's own whole-percent figure and no
   * percentage is computed here (rule P-6).
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
    return this.dispatchRead((ctx) => evidence.getPackage(ctx, packageId));
  }

  /**
   * Records a review of one extracted element value, re-runs the evidence rules and returns the package.
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
   * a forbidden read, and the records that name a plant are narrowed by the role's scope intersected with
   * the shell's selection. A record that should name one and cannot — an approval or a scenario whose
   * exception the records do not hold — is absent from the index rather than offered as one that names
   * none, while a record the workspace never plant-scopes is returned. An empty term returns nothing
   * rather than every record.
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
   * Reads the topology both lenses of the FileMap canvas draw, narrowed to the shell's selection.
   *
   * A plant chosen in the top bar narrows the graph exactly as it narrows the queue (AAP 0.2.1,
   * AAP 0.12.3 "`exception.read` in scope"), and the pin counts travel here, so a node badge needs no
   * second call.
   *
   * @param scope - The shell's plant and product selection.
   * @returns The nodes, the lanes and the per-node pin counts the resolved scope retains.
   * @throws Problem - A `'permission'` failure when the role may not read the canvas.
   */
  async getTopology(scope: Scope): Promise<Result<Topology>> {
    return this.dispatchRead((ctx) => topology.getTopology(ctx, selectionOf(scope)));
  }

  /**
   * Reads the six computed tiles of the FileMap canvas ribbon for the shell's selection.
   *
   * The ribbon is the exception family's aggregation, not this adapter's arithmetic, so the only thing
   * this member supplies is the scope. That scope reaches the canvas family through `selectionOf`, as
   * `getOverview` and `getTopology` map it, so the ribbon, the overview and the canvas count the same
   * records.
   *
   * @param scope - The shell's plant and product selection.
   * @returns Six tiles, in the order the aggregation states them.
   * @throws Problem - A `'permission'` failure when the role may not read the canvas, or a
   *   `'validation'` failure when a record a tile's figure is drawn from does not resolve.
   */
  async getCanvasRibbon(scope: Scope): Promise<Result<RibbonTile[]>> {
    return this.dispatchRead((ctx) => topology.getCanvasRibbon(ctx, selectionOf(scope)));
  }

  /* -------------------------------------------------------------------------------------------
   * Competitive atlas — specification SCR-13, rule P-5
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the simulated market-intelligence pack's atlas: the client's and the competitors' networks.
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
    return this.dispatchRead((ctx) => atlas.getAtlas(ctx));
  }

  /* -------------------------------------------------------------------------------------------
   * Catalogue reads carried for interface conformance — stage S5, AAP 0.12.3
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the six data sources with their labels, states and as-of times.
   *
   * Carried for the stage that shows the sources workspace, and live in this run as well: it is also
   * the read the shell's freshness strip makes through the port on every mount of the top bar, so the
   * six pills render from this catalogue, while the freshness behind every other figure reaches its
   * screen through each result's metadata.
   *
   * @returns The source catalogue, in the order the freshness strip renders it.
   * @throws Problem - A `'permission'` failure while the demonstration's forbidden trigger is on.
   */
  async getSourceCatalogue(): Promise<Result<SourceCatalogue>> {
    return this.dispatchRead((ctx) => governance.getSourceCatalogue(ctx));
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
    return this.dispatchRead((ctx) => {
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
    return this.dispatchRead((ctx) => {
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
   * record and the ledger, `audit.read` for the trail and its verification — and the API client composes
   * the same document from the same reads, so a persona refused here meets the same refusal there
   * (AAP 0.12.3). The export records itself: one `export` event is appended after the document is built,
   * so the file describes the session as it stood when the reader asked for it (contracts §6).
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
   * The reset runs as a section of the session's write queue, the queue an audited append takes. A
   * reset that ran beside an append would install the freshly hashed chain between that append's two
   * digests and its push, and the chain a reader verified afterwards would report a break nobody
   * caused; queueing it means the reset lands either wholly before an append or wholly after it, so the
   * chain is whole either way (contracts §6). `restoreSeed` deliberately takes no section of its own,
   * so a section waiting here can always be released by this one.
   *
   * @returns The literal `true`, in the envelope every call returns.
   */
  async resetDemo(): Promise<Result<true>> {
    return this.dispatchControl<true>((ctx) =>
      runExclusive(ctx.state, async (): Promise<true> => {
        await restoreSeed(ctx.state);
        clearSimulationFlags(ctx.state);

        return true;
      }),
    );
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
   * The switch is recorded only once the persona it names has been resolved, so a refused call leaves
   * neither an identity nor an event changed, and a successful one appends the `role switch` event with
   * the persona before and after it, so the trail records who acted as whom (contracts §6).
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
   * `actorOf`'s own resolution of `state.activeUserId`, and nothing else. The record is therefore the
   * identity this adapter authorises every other call against rather than a second account of it, and a
   * demonstration reset that puts `state.activeUserId` back to the seeded persona is reported by the next
   * read instead of leaving a caller holding the role it switched to.
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
   * produces cannot describe one persona two ways. The order is the seed's order, so the first option is
   * the persona a fresh session acts as.
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

