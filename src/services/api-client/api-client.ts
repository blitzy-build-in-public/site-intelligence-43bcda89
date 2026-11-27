/**
 * The unconnected adapter of the service port: `ApiClient` implements every member of
 * `SiteIntelligenceService` against the path vocabulary of `platform-contracts.md` §9, and nothing
 * binds it at runtime in this demonstration (AAP 0.6.2, AAP 0.12.1 "API client" row, AAP 0.12.3).
 *
 * WHY IT EXISTS. Rule P-2 requires that an unconnected client implement the same interface as the
 * in-browser mock backend, so "a deployment points the application at its own service" is a
 * compile-time fact rather than a promise: this class and `MockBackend` satisfy one interface, and
 * `src/services/create-service.ts` is the single line that chooses between them (AAP 0.6.2). No
 * screen, component, feature or shell module imports this file (AAP 0.12.1, success criterion 8);
 * its importers are that binding point and, where the run has one, the conformance suite beside it.
 *
 * WHAT A DEPLOYMENT SUPPLIES. A real service behind these paths: connectors for the six data
 * sources, identity and authorisation in place of the seeded personas, and a store behind the audit
 * chain. This adapter sends the call the port describes and reports what came back. It manufactures
 * no record, computes no figure, draws no inference from a payload and offers no fallback: a call it
 * cannot complete propagates the typed failure it received (AAP 0.12.3, rules P-1, P-6).
 *
 * WHO IS AUTHORISED, AND WHERE THAT IS DECIDED. The port carries no acting user, no role and no
 * session: the demonstration adapter holds the acting persona in its own state, and the eight personas
 * are seeded records it reads. This class therefore invents none of them — an actor,
 * a default user or a session minted here would be a fabricated capability, and the two adapters
 * would disagree about who may act in the direction the contracts forbid. Authorisation here is the
 * service's: the same pure permission and policy modules of `src/domain/policy/` that the
 * demonstration adapter applies are applied on the service side, and a refusal arrives as the
 * service's own `Problem` with the permission it lacked and the roles that hold it, or with the rule
 * that denied the action, its reason and the alternative it permits (AAP 0.12.3, rules P-3, P-8).
 * The role switcher of the demonstration is a testing lever, and the checks behind it are not
 * production authorisation; the switcher states that on screen and the README repeats it (rule P-3).
 *
 * THE ENVELOPE TRAVELS UNCHANGED. Every member resolves to the `Result<T>` the service answered
 * with, `meta` included: the six sources' freshness, the `traceId` the service reported and the
 * literal `simulated: true` the type fixes. A body that does not declare itself simulated is refused
 * by the transport as a validation failure rather than passed to a screen as a live result (rule
 * P-1). This file holds none of the seven fixed simulation labels and composes no label of its own:
 * labelling belongs to `src/components/`, where a reader sees it beside the element it qualifies.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It adds no latency — the 150 to 400 ms band is the demonstration
 * adapter's mechanism for making a loading state observable, and a real service's own latency
 * replaces it (AAP 0.12.1). It redacts nothing and withholds nothing: message-level redaction
 * belongs to the service that holds the records, so a customer-confidential body never crosses the
 * boundary upstream and no filtering here could be mistaken for that guarantee (AAP 0.6.2). It
 * performs no aggregation, so the competitive atlas arrives as the service composed it and no
 * first-party value is combined with a market-intelligence one at this layer (rule P-5). It types
 * no figure, identifier or currency amount: identifiers arrive as typed parameters and values leave
 * as received (rule P-6). It names no origin: every call is a path relative to the origin that
 * served the application, so a request cannot address a third-party host (rule B-1). It reads no
 * configuration, environment value or credential, because the application needs none (rule B-2).
 *
 * STATE. A new instance holds nothing: the class declares no field, no active user, no session, no
 * cache and no module-level mutable value, and its constructor takes no argument, so
 * `new ApiClient()` is the whole of its construction. Every helper below the imports is a
 * module-private function rather than a member, which keeps the class's public surface exactly the
 * port's own member set.
 *
 * NAMING. The product is Site Intelligence and its workspace is the FileMap canvas; every path this
 * file calls serves that workspace (rule P-7).
 *
 * OPEN ITEM: `platform-contracts.md` §9 is a plan attachment rather than a file in this checkout, so
 * the paths this class calls are the ones `src/services/api-client/paths.ts` holds. The nine paths
 * AAP 0.12.3 quotes exactly are transcribed there character for character and the remainder are
 * derived in the same style; that file records the derivation under each entry. Reconciling the
 * derived paths with §9 is an open item for the attachment, not a decision taken here.
 * OPEN ITEM: the three export members — `exportEvidencePack`, `exportScenarioComparison` and
 * `exportChokepointBrief` — carry no §9 path, because the payload is assembled in the browser from
 * the records the demonstration adapter holds (contracts §11, AAP 0.12.1 "exports"). This adapter
 * holds no record and has no target to ask for one, so it reports that absence with a typed failure
 * instead of handing back an empty file that a reader would take for an export, or inventing a path
 * that §9 does not fix. A deployment that serves exports supplies them from its own service, and
 * this is the member that would change.
 * THE TWO VERBS CONTRACTS §9 USES ARE THE TWO THE TRANSPORT OFFERS. Every read here is a `GET` and
 * every write a `POST`, so `RequestOptions` needs no third method and no call acquires one. The
 * assignee sub-resource is the one place a third verb could be imagined, and `paths.ts` documents
 * it as a `POST`: `assignException` sends that method to that path with the new owner in the body.
 * OPEN ITEM: a `Scope` carries two identifier lists, and contracts §9 fixes no repeated-parameter
 * syntax for a list. The transport deliberately omits an array-valued parameter rather than
 * flattening it, so a selection handed to it as an array would reach the service as no selection at
 * all and a scoped read would quietly widen to every plant. The selection therefore travels as two
 * comma-separated identifier lists, and `selectionQuery` leaves an empty list out of the parameters
 * altogether: an absent parameter is the other way `Scope` itself says "All plants" or "All
 * products", and the transport sends an empty value when it is given one, so that meaning is
 * carried by the selection helper rather than by a value the serialiser discarded. Reconciling that
 * encoding with §9 is an open item.
 * OPEN ITEM: `setSimulation` and `resetDemo` are demonstration controls with no server counterpart
 * (AAP 0.6.2). They resolve as no-ops below rather than as requests, and each carries the sentence
 * saying why a deployment has no such control.
 */

import { ProblemError, request } from './http';
import {
  approvalDecisionPath,
  approvalOutcomeReviewPath,
  approvalPath,
  approvalsPath,
  assistantQueriesPath,
  atlasPath,
  auditEventsPath,
  auditEventsVerifyPath,
  documentPath,
  evidencePath,
  evidencePinReviewPath,
  evidencePinsPath,
  exceptionAffectedLinesPath,
  exceptionAssigneePath,
  exceptionDismissalPath,
  exceptionNotesPath,
  exceptionPath,
  exceptionScenarioSolvePath,
  exceptionScenariosPath,
  exceptionsPath,
  exitPackagePath,
  modelsPath,
  overviewPath,
  packageElementReviewPath,
  packagePath,
  packagesPath,
  plantPlanGridPath,
  policiesPath,
  policyExceptionsPath,
  policyPath,
  searchPath,
  sourcesPath,
  sovereigntyOutboundLedgerPath,
  sovereigntyPath,
  topologyPath,
} from './paths';
import type {
  AffectedLine,
  Answer,
  Approval,
  ApprovalId,
  Atlas,
  AuditEvent,
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
  LedgerRow,
  Levers,
  Meta,
  ModelCatalogue,
  OperationalException,
  Overview,
  PackageId,
  PinState,
  PlanGrid,
  PlantId,
  PolicyDetail,
  PolicyException,
  PolicyId,
  PpapPackage,
  Result,
  Scenario,
  ScenarioSet,
  Scope,
  SearchHit,
  SimulationFlag,
  SourceCatalogue,
  SovereigntyStatus,
  Topology,
  UserId,
} from '../../types';
import type { SiteIntelligenceService } from '../site-intelligence-service';

/* ---------------------------------------------------------------------------------------------
 * Helpers of the adapter — module-private, so the class's surface is exactly the port's
 * ------------------------------------------------------------------------------------------- */

/**
 * The metadata of a call that consulted no source: an empty freshness list, the literal simulation
 * marker the envelope fixes, and no correlation identifier, because nothing was sent and no service
 * reported one (AAP 0.6.2, rule P-1).
 *
 * A fresh object on each call rather than one shared constant, so a caller that keeps or rewrites
 * the array of one result cannot alter the metadata of the next.
 */
function localMeta(): Meta {
  return { freshness: [], simulated: true, traceId: '' };
}

/**
 * The parameters a scoped read sends for the shell's selection: each is present only when the shell
 * has picked at least one identifier, so an absent member is what "All plants" or "All products"
 * means to a service.
 */
type SelectionParameters = { plants?: string; products?: string };

/**
 * The shell's selection as the parameters a scoped read sends.
 *
 * A list travels as a comma-separated run of identifiers, and an empty list is left out of the
 * result altogether rather than sent as an empty parameter: an absent parameter is what "All plants"
 * and "All products" mean to a service, which is the other way `Scope` itself says the same thing
 * (see the third OPEN ITEM in this module's header).
 *
 * @param scope - The plant and product selection the shell's filters hold.
 * @returns The selection as up to two comma-separated identifier lists, an empty list omitted.
 */
function selectionQuery(scope: Scope): SelectionParameters {
  const selection: SelectionParameters = {};
  if (scope.plants.length > 0) {
    selection.plants = scope.plants.join(',');
  }
  if (scope.products.length > 0) {
    selection.products = scope.products.join(',');
  }
  return selection;
}

/**
 * The typed failure a member reports when this adapter's contract carries no target for what the
 * member produces: a `Problem` whose cause is `'not-found'`, because nothing answers the call
 * (see the second OPEN ITEM in this module's header).
 *
 * @param capability - What the member produces, named as the port names it.
 * @returns The failure to throw, carrying the reason a reader needs to see why nothing was sent.
 */
function notServedHere(capability: string): ProblemError {
  return new ProblemError({
    type: 'not-found',
    message:
      `This client's contract carries no path for the ${capability}, which the demonstration ` +
      'adapter assembles in the browser from the records it holds.',
    traceId: '',
  });
}

/* ---------------------------------------------------------------------------------------------
 * The shapes a member sends, taken from the port so they cannot drift from it
 * ------------------------------------------------------------------------------------------- */

/**
 * The four request shapes the port declares inline rather than as named types. Each is taken from
 * the member that declares it by indexed access, so a caller of this adapter passes what the port
 * accepts and a change to one of those shapes is a compile error here rather than a silent
 * difference between the two adapters (rule P-2).
 */

/** The inbox query: the page and ordering every list takes, narrowed by one approval status. */
type ApprovalInboxQuery = Parameters<SiteIntelligenceService['listApprovals']>[0];

/** The approval request: the exception and the option put forward for it. */
type ApprovalRequestDraft = Parameters<SiteIntelligenceService['requestApproval']>[0];

/** The assistant query: the question, the chosen model and the records it runs over. */
type AssistantQuestionDraft = Parameters<SiteIntelligenceService['askAssistant']>[0];

/** The policy-exception request: the policy, the reason, the expiry and the second approver. */
type PolicyExceptionDraft = Parameters<SiteIntelligenceService['requestPolicyException']>[0];

/* ---------------------------------------------------------------------------------------------
 * The adapter — AAP 0.6.2, AAP 0.12.1 "API client" row, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The second adapter of `SiteIntelligenceService`: one HTTP call per member, against the paths of
 * `src/services/api-client/paths.ts`, through the transport of `src/services/api-client/http.ts`.
 *
 * It is unconnected: nothing binds it in this run, a deployment supplies the real service behind the
 * paths it calls, and `src/services/create-service.ts` is the one line that would bind it instead of
 * the in-browser adapter (AAP 0.6.2, AAP 0.12.1). It holds no state and takes no constructor
 * argument, so a caller's authority, its plant scope and its view of the records are the service's
 * to decide, never a value this class carries or claims (rule P-3).
 *
 * Each member does one of three things, and nothing else: it sends the call its name describes with
 * the query or the body the port fixes for it; or, for the two demonstration controls, it resolves
 * without sending anything, because a deployment has no simulation flag and no demo reset; or, for
 * the three exports, it reports that this adapter's contract carries no target for a payload the
 * browser assembles. No member catches a failure, retries a call, substitutes a payload or reports a
 * success it did not receive (AAP 0.12.3).
 */
export class ApiClient implements SiteIntelligenceService {
  /* -------------------------------------------------------------------------------------------
   * Overview — specification SCR-01, AAP 0.12.1 `computeOverview`
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the overview through `GET /overview`, the contracts §9 path `paths.overviewPath` holds.
   *
   * The shell's selection travels as the list parameters `selectionQuery` builds, and the
   * `exception.read` permission of the contracts §7.1 matrix is evaluated by the service over the
   * records the call reaches. Every tile, row and series in the payload was computed upstream: this
   * member transports it unchanged (rule P-6).
   *
   * @param scope - The shell's plant and product selection.
   * @returns The overview the service computed for that selection.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getOverview(scope: Scope): Promise<Result<Overview>> {
    return request<Overview, SelectionParameters>(overviewPath, { query: selectionQuery(scope) });
  }

  /* -------------------------------------------------------------------------------------------
   * Exceptions — specification SCR-02 and SCR-03, AAP 0.12.1
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the exception queue through `GET /exceptions`, the path `paths.exceptionsPath` holds.
   *
   * The queue's own filters and page travel with the shell's selection as query parameters, and the
   * service applies the `exception.read` permission and the acting persona's plant scope before it
   * filters, so a row outside that reach is never in the answer (AAP 0.2.1).
   *
   * @param query - The queue's filters, page and ordering.
   * @param scope - The shell's plant and product selection.
   * @returns One row per exception in scope, as the service ordered them.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async listExceptions(
    query: ExceptionQuery,
    scope: Scope,
  ): Promise<Result<ExceptionRow[]>> {
    return request<ExceptionRow[], ExceptionQuery & SelectionParameters>(exceptionsPath, {
      query: { ...query, ...selectionQuery(scope) },
    });
  }

  /**
   * Reads one exception's investigation payload through `GET /exceptions/{id}`, the path
   * `paths.exceptionPath` builds for the identifier.
   *
   * The freshness of the sources behind these figures arrives in the result's `meta`, which is what
   * raises a stale banner beside the figures it qualifies; the `exception.read` permission gates the
   * record (AAP 0.2.1).
   *
   * @param exceptionId - The exception to read.
   * @returns The investigation payload as the service composed it.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getExceptionDetail(exceptionId: ExceptionId): Promise<Result<ExceptionDetail>> {
    return request<ExceptionDetail>(exceptionPath(exceptionId));
  }

  /**
   * Reads the customer order lines one exception places at risk through
   * `GET /exceptions/{id}/affected-lines`, the path `paths.exceptionAffectedLinesPath` builds.
   *
   * The lines are the only input to the exception's revenue at risk, and `exception.read` gates the
   * read. This member takes no figure from a caller and adds none (rule P-6).
   *
   * @param exceptionId - The exception whose lines are read.
   * @returns The affected lines as the service measured them.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getAffectedLines(exceptionId: ExceptionId): Promise<Result<AffectedLine[]>> {
    return request<AffectedLine[]>(exceptionAffectedLinesPath(exceptionId));
  }

  /**
   * Assigns an exception to a persona through `POST /exceptions/{id}/assignee`, the path
   * `paths.exceptionAssigneePath` builds, with the new owner in the body.
   *
   * `ownerId` is the persona being made accountable, not the caller: the acting persona is the
   * service's, and `exception.work` is the permission it evaluates over the exception's plant
   * (rule P-3). `POST` is the method `paths.ts` documents for this sub-resource, and the transport
   * offers the two methods contracts §9 uses, so the call and the path entry name the same verb
   * (see the paragraph on the transport's two verbs in this module's header).
   *
   * @param exceptionId - The exception to assign.
   * @param ownerId - The persona being made accountable for it.
   * @returns The exception as the service recorded it after the assignment.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async assignException(
    exceptionId: ExceptionId,
    ownerId: UserId,
  ): Promise<Result<OperationalException>> {
    return request<OperationalException>(exceptionAssigneePath(exceptionId), {
      method: 'POST',
      body: { ownerId },
    });
  }

  /**
   * Records a note against an exception through `POST /exceptions/{id}/notes`, the path
   * `paths.exceptionNotesPath` builds, with the note in the body.
   *
   * The note travels to the event's payload unchanged, so the activity an investigation lists is the
   * record the caller wrote. `exception.work` gates the write.
   *
   * @param exceptionId - The exception the note is recorded against.
   * @param note - The note, in the writer's own words.
   * @returns The exception as the service recorded it after the note.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async noteException(exceptionId: ExceptionId, note: string): Promise<Result<OperationalException>> {
    return request<OperationalException>(exceptionNotesPath(exceptionId), {
      method: 'POST',
      body: { note },
    });
  }

  /**
   * Dismisses an exception with its reason through `POST /exceptions/{id}/dismissal`, the path
   * `paths.exceptionDismissalPath` builds, with the reason in the body.
   *
   * A reason is part of the call rather than a condition the interface checks, so the service refuses
   * a dismissal without one and a dismissed row always says why it was set aside. `exception.work`
   * gates the write (rule P-8).
   *
   * @param exceptionId - The exception to dismiss.
   * @param reason - Why it is being set aside.
   * @returns The exception as the service recorded it after the dismissal.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async dismissException(
    exceptionId: ExceptionId,
    reason: string,
  ): Promise<Result<OperationalException>> {
    return request<OperationalException>(exceptionDismissalPath(exceptionId), {
      method: 'POST',
      body: { reason },
    });
  }

  /* -------------------------------------------------------------------------------------------
   * Scenarios — specification SCR-04, AAP 0.12.1 and platform-contracts.md §4
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads one exception's option set through `GET /exceptions/{id}/scenarios`, the path
   * `paths.exceptionScenariosPath` builds.
   *
   * The measures, the recommended option with its rule and trade-off, and the options each blocked
   * constraint set aside all arrive as the service settled them; `exception.read` gates the read. No
   * column is recomputed here, which is why a seeded option and a computed one cannot be confused by
   * this layer (rule P-6).
   *
   * @param exceptionId - The exception whose options are read.
   * @returns The option set the service returned.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getScenarioSet(exceptionId: ExceptionId): Promise<Result<ScenarioSet>> {
    return request<ScenarioSet>(exceptionScenariosPath(exceptionId));
  }

  /**
   * Measures one option at the levers supplied through `POST /exceptions/{id}/scenarios/solve`, the
   * path `paths.exceptionScenarioSolvePath` builds, with the levers in the body.
   *
   * `scenario.create` is the permission the endpoint requires (AAP 0.12.3). A lever outside its
   * constraint is not a failed call: the service answers with a scenario whose constraint check fails
   * with its messages, which the comparison matrix shows as "Cannot compute"; a `Problem` is kept for
   * the causes it names, such as an exception with no solver case (AAP 0.8, AAP 0.12.2).
   *
   * @param exceptionId - The exception whose case is measured.
   * @param levers - The two levers to measure at.
   * @returns The scenario the service measured.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async solveScenario(exceptionId: ExceptionId, levers: Levers): Promise<Result<Scenario>> {
    return request<Scenario>(exceptionScenarioSolvePath(exceptionId), {
      method: 'POST',
      body: levers,
    });
  }

  /* -------------------------------------------------------------------------------------------
   * Approvals — specification SCR-05, AAP 0.12.1 and AAP 0.12.3
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the approval inbox through `GET /approvals`, the path `paths.approvalsPath` holds for the
   * collection's read.
   *
   * The page, the ordering, the status filter and the shell's selection all travel as query
   * parameters, so a limit applies to the approvals asked for rather than to a page a screen then
   * filters. The service narrows the answer by the acting persona's plant scope whichever status was
   * requested, and the path entry asserts no further §7.1 permission for this read.
   *
   * @param query - The inbox's status filter, page and ordering.
   * @param scope - The shell's plant and product selection.
   * @returns The approvals in scope, as the service ordered them.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async listApprovals(query: ApprovalInboxQuery, scope: Scope): Promise<Result<Approval[]>> {
    return request<Approval[], ApprovalInboxQuery & SelectionParameters>(approvalsPath, {
      query: { ...query, ...selectionQuery(scope) },
    });
  }

  /**
   * Reads one approval through `GET /approvals/{id}`, the path `paths.approvalPath` builds.
   *
   * The record carries the plan under it, its cost against the revenue it protects, the eligible
   * approver roles and the write-backs it sets in motion, and the service narrows the read by the
   * acting persona's plant scope.
   *
   * @param approvalId - The approval to read.
   * @returns The approval as the service returned it.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getApproval(approvalId: ApprovalId): Promise<Result<Approval>> {
    return request<Approval>(approvalPath(approvalId));
  }

  /**
   * Puts a scenario forward for approval through `POST /approvals`, the same collection the inbox
   * reads.
   *
   * The body carries exactly the two members the port declares: the exception and the option. The
   * requester, the eligible approver roles, the plan's added cost and the revenue it protects are the
   * service's to fill from the acting persona and from the solver's figures, which is why a caller
   * cannot supply them (rule P-6). `approval.request` is the permission the endpoint requires, and a
   * refusal made on the freshness of the source behind the plan names that source and its as-of time
   * (AAP 0.2.1, AAP 0.12.3).
   *
   * @param draft - The exception and the option put forward.
   * @returns The approval the service created.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async requestApproval(draft: ApprovalRequestDraft): Promise<Result<Approval>> {
    return request<Approval>(approvalsPath, {
      method: 'POST',
      body: { exceptionId: draft.exceptionId, scenarioId: draft.scenarioId },
    });
  }

  /**
   * Records a decision through `POST /approvals/{id}/decision`, the path
   * `paths.approvalDecisionPath` builds, with the action and its comment in the body.
   *
   * `approval.decide` is the permission the endpoint requires, POL-003 is evaluated before the
   * decision is recorded, and the requester is never eligible to decide — all three are the
   * service's evaluation, and this adapter neither repeats it nor anticipates it. A refusal leaves
   * the approval as it stood and no write-back is created; the `Problem` names the permission with
   * the roles that may act, the rule with the alternative it permits, or the stale source with its
   * as-of time (rule P-8).
   *
   * @param approvalId - The approval being decided.
   * @param decision - The action taken and the comment that records it.
   * @returns The approval as the service recorded it after the decision.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async decideApproval(approvalId: ApprovalId, decision: Decision): Promise<Result<Approval>> {
    return request<Approval>(approvalDecisionPath(approvalId), {
      method: 'POST',
      body: { action: decision.action, comment: decision.comment },
    });
  }

  /**
   * Records that the post-approval outcome was read against the plan through
   * `POST /approvals/{id}/outcome-review`, the path `paths.approvalOutcomeReviewPath` builds.
   *
   * The call carries no body: both sides of the comparison are computed by the service from the
   * records it holds after the decision, so a caller supplies no figure and no comment (rule P-6).
   *
   * @param approvalId - The approval whose outcome was reviewed.
   * @returns The approval as the service recorded it after the review.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async reviewApprovalOutcome(approvalId: ApprovalId): Promise<Result<Approval>> {
    return request<Approval>(approvalOutcomeReviewPath(approvalId), { method: 'POST' });
  }

  /* -------------------------------------------------------------------------------------------
   * Audit — specification SCR-05, platform-contracts.md §6
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the audit trail through `GET /audit-events`, the path `paths.auditEventsPath` holds.
   *
   * The query's filters and page travel as query parameters, and `audit.read` is the permission the
   * endpoint requires. The chain is not plant-scoped, so this read takes no selection. Every surface
   * that shows the chain carries the fixed simulation label of specification §5.3 that marks a
   * control, because a browser page establishes nothing about the store behind it (rule P-4); the
   * label itself belongs to the component that renders it, so none is composed here.
   *
   * @param query - The filters and page of the trail read.
   * @returns The events the filter admits, in the order the service returned them.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async listAuditEvents(query: AuditQuery): Promise<Result<AuditEvent[]>> {
    return request<AuditEvent[], AuditQuery>(auditEventsPath, { query });
  }

  /**
   * Verifies the chain through `GET /audit-events/verify`, the path `paths.auditEventsVerifyPath`
   * holds, gated by `audit.read`.
   *
   * The verification is the service's: it recomputes every hash in sequence and reports the positions
   * at which the chain does not verify, and it repairs nothing. This member takes no parameter,
   * because the events verified are the ones the service holds (AAP 0.8, AAP 0.12.1).
   *
   * @returns The verification report the service returned.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async verifyAuditChain(): Promise<Result<ChainReport>> {
    return request<ChainReport>(auditEventsVerifyPath);
  }

  /* -------------------------------------------------------------------------------------------
   * Evidence assistant — specification SCR-06, platform-contracts.md §10
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the model catalogue through `GET /models`, the path `paths.modelsPath` holds.
   *
   * The records carry the processing boundary each model declares, which is what POL-007 evaluates
   * before an answer is produced; the path entry asserts no §7.1 permission for this read, and the
   * screen presents the entries as declared configuration rather than as a checked state (rule P-4).
   * No model is connected in this run (rule P-1).
   *
   * @returns The catalogue the service returned.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getModelCatalogue(): Promise<Result<ModelCatalogue>> {
    return request<ModelCatalogue>(modelsPath);
  }

  /**
   * Puts a question to the assistant through `POST /assistant/queries`, the path
   * `paths.assistantQueriesPath` holds, with the question, the chosen model and the context records
   * in the body.
   *
   * `evidence.read` is the permission the endpoint requires, and POL-007 is evaluated over the
   * context before an answer is composed: when it blocks the requested model, the call fails with a
   * `Problem` of type `'policy'` carrying the rule, the reason, the alternative it permits and the
   * event it appended, which is what the block card shows with its one-click switch to the
   * in-boundary model (AAP 0.12.4). Every figure in an answer is filled by the service at call time
   * (rule P-6).
   *
   * @param draft - The question, the chosen model and the records it runs over.
   * @returns The answer the service composed, with its citations.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async askAssistant(draft: AssistantQuestionDraft): Promise<Result<Answer>> {
    return request<Answer>(assistantQueriesPath, {
      method: 'POST',
      body: {
        question: draft.question,
        modelId: draft.modelId,
        contextRefs: draft.contextRefs,
      },
    });
  }

  /* -------------------------------------------------------------------------------------------
   * Governance — specification SCR-07, platform-contracts.md §7
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the sovereignty screen's payload through `GET /sovereignty`, the path
   * `paths.sovereigntyPath` holds, gated by `sovereignty.read`.
   *
   * Every part of the payload describes declared configuration, so the screen renders the summary and
   * its ten rows as declared rather than verified, under the fixed label for that reading of
   * specification §5.3; this adapter composes no label of its own. The ledger counts inside the
   * payload are computed by the service from its audit events (rule P-4, rule P-6).
   *
   * @returns The declared configuration and the outbound ledger, as the service reported them.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getSovereigntyStatus(): Promise<Result<SovereigntyStatus>> {
    return request<SovereigntyStatus>(sovereigntyPath);
  }

  /**
   * Reads the outbound ledger on its own through `GET /sovereignty/outbound-ledger`, the path
   * `paths.sovereigntyOutboundLedgerPath` holds, gated by `sovereignty.read`.
   *
   * It is separate from the payload above so a caller refreshing the counts after a decision does not
   * re-read the declared rows beside them; both reads are computed by the same rule upstream.
   *
   * @returns One row per endpoint, with its declared state and its counts.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getOutboundLedger(): Promise<Result<LedgerRow[]>> {
    return request<LedgerRow[]>(sovereigntyOutboundLedgerPath);
  }

  /**
   * Reads the policy list through `GET /policies`, the path `paths.policiesPath` holds, gated by
   * `policy.read`.
   *
   * Each entry states whether the engine evaluates it, which is how the screen tells a policy it can
   * show decisions for from one it can only show as declared: POL-009 is declared and never evaluated
   * (rule P-4).
   *
   * @returns The policies the service holds.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async listPolicies(): Promise<Result<PolicyDetail[]>> {
    return request<PolicyDetail[]>(policiesPath);
  }

  /**
   * Reads one policy through `GET /policies/{id}`, the path `paths.policyPath` builds, gated by
   * `policy.read`.
   *
   * The statement in the payload is the policy record's own wording, so the rule a denial cites and
   * the rule the screen shows cannot drift apart (rule P-6).
   *
   * @param policyId - The policy to read.
   * @returns The policy with the decisions it made, as the service returned them.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getPolicy(policyId: PolicyId): Promise<Result<PolicyDetail>> {
    return request<PolicyDetail>(policyPath(policyId));
  }

  /**
   * Requests a time-boxed policy exception through `POST /policies/{id}/exceptions`, the path
   * `paths.policyExceptionsPath` builds, with the reason, the expiry and the second approver in the
   * body.
   *
   * `policy.exception.request` is the permission the endpoint requires, and the requester comes from
   * the service's own view of the acting persona rather than from the body (rule P-3). The flow's
   * outcome is a pending request: nothing in the demonstration decides one (SCR-07, AAP 0.12.4).
   *
   * @param draft - The policy, the reason, the expiry and the second approver.
   * @returns The pending request the service recorded.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async requestPolicyException(draft: PolicyExceptionDraft): Promise<Result<PolicyException>> {
    return request<PolicyException>(policyExceptionsPath(draft.policyId), {
      method: 'POST',
      body: {
        reason: draft.reason,
        expiresAt: draft.expiresAt,
        secondApproverId: draft.secondApproverId,
      },
    });
  }

  /* -------------------------------------------------------------------------------------------
   * Evidence — PR-6, specification §5, AAP 0.12.3
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the evidence behind one displayed element through `GET /evidence`, the path
   * `paths.evidencePath` holds, with the reference as its `ref` query parameter.
   *
   * `evidence.read` is the permission the endpoint requires, and the drawer opens from the reference
   * the element carries rather than from a record a screen holds. The provenance keeps a
   * market-intelligence reading separate from a first-party one, and the service composes it, so no
   * reading is blended at this layer (rule P-5).
   *
   * @param ref - The reference the element carries, in the service's own form.
   * @returns The evidence the service returned for that reference.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getEvidence(ref: string): Promise<Result<Evidence>> {
    return request<Evidence, { ref: string }>(evidencePath, { query: { ref } });
  }

  /**
   * Reads one document's body through `GET /documents/{id}`, the path `paths.documentPath` builds.
   *
   * `evidence.read` gates the read, and `document.confidential.read` gates a body classified
   * customer-confidential. The withholding is the service's: a body it does not release to the acting
   * persona fails the call with a `Problem` rather than arriving empty, so a redaction cannot be
   * mistaken for an empty document. This adapter withholds nothing of its own and could not, because
   * it holds no record to withhold (AAP 0.6.2, AAP 0.12.3).
   *
   * @param documentId - The document to read.
   * @returns The document body the service released.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getDocument(documentId: DocumentId): Promise<Result<DocumentBody>> {
    return request<DocumentBody>(documentPath(documentId));
  }

  /**
   * Reads the evidence pins through `GET /evidence-pins`, the path `paths.evidencePinsPath` holds,
   * gated by `evidence.read`.
   *
   * The service filters the pins to what the acting persona may see, so an external supplier engineer
   * receives its own vendor's pins and no other. The per-node counts travel with the topology, so the
   * canvas badges a node without this call (AAP 0.12.2).
   *
   * @returns The pins the service released for the acting persona.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async listPins(): Promise<Result<EvidencePin[]>> {
    return request<EvidencePin[]>(evidencePinsPath);
  }

  /**
   * Records a review of one pin's state through `POST /evidence-pins/{id}/review`, the path
   * `paths.evidencePinReviewPath` builds, with the state in the body.
   *
   * `evidence.review` is the permission the endpoint requires, and the reviewer is the service's view
   * of the acting persona. The state is the pin vocabulary the badges already render, so no label is
   * composed here (rule P-1).
   *
   * @param pinId - The pin under review.
   * @param state - The state the review records.
   * @returns The pin as the service recorded it after the review.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async reviewPin(pinId: EvidencePinId, state: PinState): Promise<Result<EvidencePin>> {
    return request<EvidencePin>(evidencePinReviewPath(pinId), {
      method: 'POST',
      body: { state },
    });
  }

  /**
   * Reads the part approval packages through `GET /packages`, the path `paths.packagesPath` holds,
   * gated by `evidence.read`.
   *
   * Readiness in the payload is the service's whole-percent figure over the package's own element
   * count; this member transports it and computes nothing (rule P-6).
   *
   * @returns The packages the service returned.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async listPackages(): Promise<Result<PpapPackage[]>> {
    return request<PpapPackage[]>(packagesPath);
  }

  /**
   * Reads one part approval package through `GET /packages/{id}`, the path `paths.packagePath`
   * builds, gated by `evidence.read`.
   *
   * Its elements carry the evidence rule that decided each state, in the rule's own wording, so a
   * reader sees what the record applied rather than a label the interface composed (rule P-6).
   *
   * @param packageId - The package to read.
   * @returns The package the service returned.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getPackage(packageId: PackageId): Promise<Result<PpapPackage>> {
    return request<PpapPackage>(packagePath(packageId));
  }

  /**
   * Records a review of one extracted element value through `POST /package-elements/review`, the path
   * `paths.packageElementReviewPath` holds, with the review in the body.
   *
   * `evidence.review` is the permission the endpoint requires. The service re-runs the evidence rules
   * over the package and answers with the package as it stands, so a caller never applies a rule
   * itself and the reviewer comes from the service's view of the acting persona.
   *
   * @param review - The package, the element and the decision the review records.
   * @returns The package as the service recomputed it.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async reviewElement(review: ElementReview): Promise<Result<PpapPackage>> {
    return request<PpapPackage>(packageElementReviewPath, {
      method: 'POST',
      body: review,
    });
  }

  /* -------------------------------------------------------------------------------------------
   * Identifier search — specification §5.1, AAP 0.12.2 `SearchHit`
   * ------------------------------------------------------------------------------------------- */

  /**
   * Searches the identifiers the acting persona may see through `GET /search`, the path
   * `paths.searchPath` holds, with the term and the selection as query parameters.
   *
   * The service narrows the answer by the shell's selection and by the acting persona's plant scope,
   * so a hit for a record outside that reach is not returned at all rather than returned and then
   * refused (AAP 0.2.1). The path entry asserts no further §7.1 permission for this read.
   *
   * @param term - What the search field holds.
   * @param scope - The shell's plant and product selection.
   * @returns The hits the service returned, grouped by record kind.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async searchIdentifiers(term: string, scope: Scope): Promise<Result<SearchHit[]>> {
    return request<SearchHit[], { term: string } & SelectionParameters>(searchPath, {
      query: { term, ...selectionQuery(scope) },
    });
  }

  /* -------------------------------------------------------------------------------------------
   * FileMap canvas — specification §6 and SCR-12, AAP 0.12.3
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the topology both lenses of the FileMap canvas render through `GET /topology`, the path
   * `paths.topologyPath` holds, with the selection as query parameters.
   *
   * `exception.read` is the permission the endpoint requires, within the reach left by the selection
   * and the acting persona's plant scope. The per-node pin counts travel with the payload, so the
   * canvas badges a node without a second call and the map lens and the graph lens read one payload
   * (AAP 0.12.3).
   *
   * @param scope - The shell's plant and product selection.
   * @returns The topology the service returned.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getTopology(scope: Scope): Promise<Result<Topology>> {
    return request<Topology, SelectionParameters>(topologyPath, { query: selectionQuery(scope) });
  }

  /* -------------------------------------------------------------------------------------------
   * Competitive atlas — specification SCR-13, AAP 0.12.3, rule P-5
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the competitive atlas through `GET /market-intelligence/atlas`, the path `paths.atlasPath`
   * holds, gated by `competitive.read`.
   *
   * The payload separates the client's own series from the three competitors' rather than combining
   * them, and each series carries its own provenance and label, so no figure the screen draws mixes a
   * first-party record with market intelligence. This adapter transports the pack unchanged and
   * aggregates nothing (rule P-5). The service refuses the read for the external supplier engineer,
   * naming in the `Problem` the permission that is missing and the roles that hold it.
   *
   * @returns The atlas the service returned.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getAtlas(): Promise<Result<Atlas>> {
    return request<Atlas>(atlasPath);
  }

  /* -------------------------------------------------------------------------------------------
   * Catalogue reads carried for interface conformance — stage S5, AAP 0.12.3
   *
   * The three members below exist so the port is complete for the stage that shows the sources, the
   * production plan and the exit package: both adapters carry them, no screen in this run calls them,
   * and the routes that would own them render the stage notice instead.
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the six data sources through `GET /sources`, the path `paths.sourcesPath` holds.
   *
   * The six sources' freshness reaches every other screen through each result's `meta`, so this read
   * is the catalogue rather than the strip. The path entry asserts no §7.1 permission for it.
   *
   * @returns The source catalogue the service returned.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getSourceCatalogue(): Promise<Result<SourceCatalogue>> {
    return request<SourceCatalogue>(sourcesPath);
  }

  /**
   * Reads one plant's plan grid through `GET /plants/{id}/plan`, the path
   * `paths.plantPlanGridPath` builds.
   *
   * The horizon comes from the records rather than from a clock, so the same state yields the same
   * grid; the path entry asserts no §7.1 permission for this read.
   *
   * @param plantId - The plant whose plan is read.
   * @returns The plan grid the service returned.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getPlanGrid(plantId: PlantId): Promise<Result<PlanGrid>> {
    return request<PlanGrid>(plantPlanGridPath(plantId));
  }

  /**
   * Reads the exit package through `GET /exit-package`, the path `paths.exitPackagePath` holds.
   *
   * The package names the records a deployment hands over and states no figure of its own; its
   * instant is the constant demonstration clock rather than a system clock, so the same state
   * produces the same package. The path entry asserts no §7.1 permission for this read.
   *
   * @returns The exit package the service returned.
   * @throws Problem - The failure the service reported, whose `type` names its cause.
   */
  async getExitPackage(): Promise<Result<ExitPackage>> {
    return request<ExitPackage>(exitPackagePath);
  }

  /* -------------------------------------------------------------------------------------------
   * Browser-built exports — contracts §11, and the second OPEN ITEM in this module's header
   * ------------------------------------------------------------------------------------------- */

  /**
   * The evidence pack download.
   *
   * contracts §9 fixes no path for it: the payload is assembled in the browser from the records the
   * demonstration adapter holds, so its top level carries `simulated: true` (contracts §11, AAP
   * 0.12.1 "exports"). This adapter holds no record and has no target to ask for one, so it reports
   * that absence rather than handing back an empty file a reader would take for an export.
   *
   * @returns Nothing: the member cannot produce the payload in this adapter.
   * @throws ProblemError - `type: 'not-found'`, because this client's contract carries no target for
   * the payload.
   */
  async exportEvidencePack(): Promise<Result<string>> {
    throw notServedHere('evidence pack');
  }

  /**
   * The scenario comparison download for one exception.
   *
   * contracts §9 fixes no path for it either: the comparison is built in the browser from the same
   * solver output the matrix renders, so the file and the screen cannot disagree (AAP 0.12.4
   * SCR-04). The measurement is the service's, but the CSV assembly is the demonstration's, so this
   * member reports the absence rather than recomputing a figure or inventing a target.
   *
   * @param exceptionId - The exception whose comparison would be exported.
   * @returns Nothing: the member cannot produce the payload in this adapter.
   * @throws ProblemError - `type: 'not-found'`, because this client's contract carries no target for
   * the payload.
   */
  async exportScenarioComparison(exceptionId: ExceptionId): Promise<Result<string>> {
    throw notServedHere(`scenario comparison of ${exceptionId}`);
  }

  /**
   * The chokepoint brief download.
   *
   * contracts §9 fixes no path for it: the brief is built in the browser from the market-intelligence
   * pack, and every competitor figure in it carries the market-intelligence provenance and its own
   * label so the file cannot be read as a first-party record (rules P-5, P-1). This adapter reports
   * the absence rather than composing that payload itself.
   *
   * @returns Nothing: the member cannot produce the payload in this adapter.
   * @throws ProblemError - `type: 'not-found'`, because this client's contract carries no target for
   * the payload.
   */
  async exportChokepointBrief(): Promise<Result<string>> {
    throw notServedHere('chokepoint brief');
  }

  /* -------------------------------------------------------------------------------------------
   * Demonstration controls — AAP 0.6.2, AAP 0.12.1
   * ------------------------------------------------------------------------------------------- */

  /**
   * Answers the simulation trigger without sending anything.
   *
   * A deployment has no simulation flags: the seven screen states, the edited audit event and the
   * emptied queue are the demonstration's own levers, so there is nothing to address and this member
   * resolves as a no-op rather than as a request (AAP 0.6.2). It touches no flag, no seed record and
   * no state of the demonstration adapter — it holds none — and the metadata reports an empty
   * freshness list because no source was consulted.
   *
   * @param flag - The trigger the popover would set. Unused: a deployment has no such trigger.
   * @param on - Whether the trigger would be set. Unused, for the same reason.
   * @returns The resolved marker, carrying the envelope a result always carries.
   */
  async setSimulation(flag: SimulationFlag, on: boolean): Promise<Result<true>> {
    return { data: true, meta: localMeta() };
  }

  /**
   * Answers the demo reset without sending anything.
   *
   * A deployment has no demo reset: `Reset demo data` restores the demonstration adapter's seed, and
   * a service that holds the real records has nothing seeded to restore, so this member resolves as a
   * no-op (AAP 0.6.2). It reaches no seed record and no adapter state, and reports an empty freshness
   * list because no source was consulted.
   *
   * @returns The resolved marker, carrying the envelope a result always carries.
   */
  async resetDemo(): Promise<Result<true>> {
    return { data: true, meta: localMeta() };
  }
}
