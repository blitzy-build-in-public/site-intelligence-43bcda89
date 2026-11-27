/**
 * The single typed service port of Site Intelligence: the one boundary through which every screen,
 * component and domain consumer reads a record or asks for a change (AAP 0.6.2, AAP 0.12.1 "Port"
 * row, AAP 0.13.2 "Contract surface").
 *
 * Two adapters implement it, and nothing else may be bound to it (rule P-2). `MockBackend` in
 * `src/services/mock/` owns the seeded state, the latency, the permission and policy enforcement,
 * the audit chain and the demonstration controls. `ApiClient` in `src/services/api-client/` compiles
 * against the contracts §9 paths and is never called in this run. `src/services/create-service.ts`
 * is the single place the choice is made, so binding the other adapter is one line and no screen
 * changes.
 *
 * This file is a declaration and nothing else. It holds no state, performs no read, names no
 * address, carries no credential and imports nothing but types, so under `verbatimModuleSyntax`
 * every import and re-export here is type-only and the module emits no runtime code. It reaches no
 * seed record, no adapter, no domain module and no React: the dependency runs from screens to this
 * port to an adapter to the pure domain, never the reverse.
 *
 * Every member is asynchronous and resolves to `Result<T>`, whose `meta` carries the six sources'
 * freshness, the `simulated: true` marker and the call's `traceId`. A failure is thrown as a
 * `Problem` whose `type` names its cause, so a caller cannot read a payload beside a refusal
 * (AAP 0.2.2, AAP 0.12.3). A refusal made on the state of a source names that source and its as-of
 * time in the `Problem`'s `message`, which is the sentence the disabled approval controls repeat
 * (AAP 0.2.1, T-13).
 *
 * What the interface is careful not to say: it describes a contract, not a deployment. The
 * sovereignty, policy and chain members below return records that state what this demonstration
 * declares, and each surface that shows one labels it `Declared, not verified` or `Simulated
 * control` (rule P-4). Nothing here claims that this code establishes a configuration, prevents a
 * copy or defeats an edit.
 *
 * HOW THIS INTERFACE RELATES TO contracts §2, AND WHAT IS MISSING (AAP 0.6.2, AAP 0.12.1
 * "Port" row). `platform-contracts.md` §2 fixes this interface method for method, and that
 * document is not readable anywhere in this run: it is a plan attachment (AAP 0.17), and no
 * copy of it exists in the checkout (`git ls-files '*.md'` reports the README alone), in any
 * git ref's history, on the filesystem, in the run's attached-file directory (which does not
 * exist) or among the staged assets. No member name or signature below is transcribed from §2,
 * and this interface is therefore not claimed to be that document's text. What is recorded
 * instead is a derivation a reviewer can check against the document the moment it is supplied:
 * one member per capability a fixing input names, that input cited on the member itself, and
 * each member's §9 entry either quoted by AAP 0.12.3 or labelled derived in
 * `src/services/api-client/paths.ts`. AAP 0.1 is the rule that decides this — where a value the
 * work requires is undefined, the run reports it rather than inventing one — and reconciling
 * the two files with §2 and §9 is mechanical, member by member, once they arrive.
 *
 * THE DERIVATION, FAMILY BY FAMILY — 46 members, each against the input that names the
 * capability:
 * - `getOverview` — AAP 0.12.1 "Overview aggregates" row, specification SCR-01.
 * - `listExceptions`, `getExceptionDetail`, `getAffectedLines`, `assignException`,
 *   `noteException`, `dismissException` — specification SCR-02 and SCR-03, and AAP 0.6.2 for
 *   the three audited writes.
 * - `getScenarioSet`, `solveScenario` — AAP 0.12.3 `POST /exceptions/{id}/scenarios/solve`,
 *   specification SCR-04.
 * - `listApprovals`, `getApproval`, `getApprovalOutcome`, `requestApproval`, `decideApproval`,
 *   `reviewApprovalOutcome`, `retryWriteBack` — AAP 0.12.3 `POST /approvals` and
 *   `POST /approvals/{id}/decision`, specification SCR-05, and AAP 0.2.2 for the outcome card
 *   and the retry.
 * - `listAuditEvents`, `getAuditEvent`, `verifyAuditChain` — AAP 0.12.3
 *   `GET /audit-events/verify`, and specification SCR-05's audit table with its detail drawer.
 * - `getModelCatalogue`, `listSuggestedQuestions`, `askAssistant` — AAP 0.12.3
 *   `POST /assistant/queries`, specification SCR-06.
 * - `getSovereigntyStatus`, `getOutboundLedger`, `listPolicies`, `getPolicy`,
 *   `requestPolicyException` — specification SCR-07 and AAP 0.12.4's grant flow.
 * - `getEvidence`, `getDocument`, `listPins`, `reviewPin`, `listPackages`, `getPackage`,
 *   `reviewElement` — contracts §3 and §8 as AAP 0.12.2 types them, and AAP 0.6.2 for the
 *   review.
 * - `searchIdentifiers` — specification §5.1's identifier search, typed by AAP 0.12.2 as
 *   `SearchHit`.
 * - `getTopology`, `getCanvasRibbon` — AAP 0.12.3 `GET /topology`, specification SCR-12's
 *   ribbon.
 * - `getAtlas` — AAP 0.12.3 `GET /market-intelligence/atlas`, specification SCR-13.
 * - `getSourceCatalogue`, `getPlanGrid`, `getExitPackage` — the S4 and S5 endpoints AAP 0.12.3
 *   has both adapters carry for conformance.
 * - `exportEvidencePack`, `exportScenarioComparison`, `exportChokepointBrief` — AAP 0.12.1's
 *   "Exports" row and contracts §11.
 * - `setSimulation`, `resetDemo` — AAP 0.6.2's two demonstration methods, which carry no HTTP
 *   counterpart.
 *
 * THREE ITEMS THIS RECORD USED TO CARRY ARE CLOSED BY THE CODE THAT STANDS: the three export
 * members resolved the payload's text because `src/types` held no export-payload type, and
 * `ExportPayload` now sits in `src/types/service.ts` and they resolve it; the four collection
 * reads `getOutboundLedger`, `listPolicies`, `listPins` and `listPackages` carried no list
 * parameters, and all four now take `ListQuery` with their handlers paging and ordering; and
 * five capabilities the specification names had no member at all — SCR-12's ribbon, SCR-05's
 * audit detail read, its write-back retry and its outcome card, and SCR-06's suggested
 * questions — each of which is now a member both adapters bind.
 *
 * STILL OPEN, each naming the clause that is absent and the condition that closes it:
 * - §2 itself, method for method: no member's name, parameter list or return type is that
 *   document's. Closes when §2 is supplied, and the reconciliation is then a review of the
 *   family list above against §2's entries rather than a redesign, because every member already
 *   names the capability it serves.
 * - §9's entries: `paths.ts` holds 40, of which the nine AAP 0.12.3 quotes are transcribed and
 *   the other 31 are derived — the five added for this interface among them, `GET /topology/ribbon`,
 *   `GET /audit-events/{id}`, `GET /approvals/{id}/outcome`,
 *   `POST /approvals/{id}/write-backs/{writeBackId}/retry` and `GET /assistant/questions`, whose
 *   capabilities the specification names without a §9 entry beside them. Each entry says in its
 *   own TSDoc that it is derived. Closes when §9 is supplied, or when AAP 0.12.3 names them.
 * - The stage S4 reads for a binder manifest, a supplier profile and a material profile are not
 *   declared. AAP 0.12.3 lists them among the endpoints both adapters carry for conformance,
 *   but `src/types` holds no response type for them — the plant, supplier, material, product,
 *   customer and order records are typed in `src/seed`, which rule P-2 bars this module from
 *   importing — and this module declares no type of its own. Closes when those response types
 *   enter `src/types`; the package, pin and element-review reads of the same stage are declared
 *   because their types exist.
 * - `listApprovals` narrows by approval status through an inline extension of `ListQuery`,
 *   because `src/types` holds no `ApprovalQuery`. That one field is what the inbox's read needs,
 *   and carrying it in the query keeps the limit and the cursor on the service side of the
 *   boundary rather than applied to an already-truncated page by a screen. Closes when §9 or §3
 *   names that query.
 * - `requestApproval`, `requestPolicyException` and `askAssistant` take inline request objects,
 *   because `src/types` holds no `ApprovalRequest`, no policy-exception draft and no
 *   assistant-query type. Each member of those objects is fixed by the screen that sends it
 *   (SCR-04, SCR-07, SCR-06); the requester, the second approver and the acting persona are not
 *   among them, because the adapter takes the acting persona from its own state rather than from
 *   a caller. Closes with those types.
 * - `reviewApprovalOutcome` takes the approval's identifier alone. SCR-05's outcome card sets
 *   the plan's figures against the resulting ones, both sides computed by the adapter from the
 *   records it holds — `getApprovalOutcome` returns them — so a caller supplies neither a figure
 *   nor a comment (rule P-6). Closes if §2 gives the write a payload of its own.
 * - `searchIdentifiers` is not among the families AAP 0.12.3 tabulates, but specification §5.1
 *   requires the identifier search and rule P-2 leaves a screen no other route to the records it
 *   searches. Its response is `SearchHit`, which AAP 0.12.2 types for exactly that read. Closes
 *   when §9 names the path.
 * - `decideApproval` carries no side-effect acknowledgement member. SCR-05's acknowledgement
 *   gates the decision control in the interface (rule P-8), while the decision itself carries the
 *   action and its comment, and the service refuses the call on grounds it reads from the
 *   records: the acting persona's permission, POL-003, and the freshness of the source behind
 *   the plan. Closes if §2 names a member.
 * - AAP 0.2.2 says a policy denial creates no audit record, while AAP 0.8 says the policy
 *   engine's denial appends a policy-actor event that the outbound ledger counts. The prose on
 *   the members below asserts neither outcome for that event and describes only what a caller
 *   observes — the approval left as it stood and no write-back created — so the conflict stays
 *   visible for the adapter to settle rather than being settled silently here. Closes when
 *   contracts §6 or §7.2 settles it.
 */

import type {
  AffectedLine,
  Answer,
  Approval,
  ApprovalId,
  ApprovalOutcome,
  ApprovalStatus,
  Atlas,
  AuditEvent,
  AuditEventId,
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
  Levers,
  LedgerRow,
  ListQuery,
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
  RibbonTile,
  Scenario,
  ScenarioId,
  ScenarioSet,
  Scope,
  SearchHit,
  SimulationFlag,
  SourceCatalogue,
  SovereigntyStatus,
  SuggestedQuestion,
  Timestamp,
  Topology,
  UserId,
  WriteBack,
} from '../types';
import type { Result } from '../types/service';

/* ---------------------------------------------------------------------------------------------
 * The envelope, carried by re-export — AAP 0.12.1 "Port" row
 * ------------------------------------------------------------------------------------------- */

/**
 * `Meta`, `Result` and `Problem` are declared once, in `src/types/service.ts`, and reach every
 * consumer of the port through this re-export rather than through a second declaration. A screen
 * that reads `result.meta.freshness` or catches a `Problem` therefore names the same three types the
 * mock adapter, the API client and this interface are written against, so the boundary cannot be
 * restated and `Result` cannot be widened locally (rule P-2).
 */
export type { Meta, Problem, Result } from '../types/service';

/* ---------------------------------------------------------------------------------------------
 * The port — platform-contracts.md §2, AAP 0.6.2 and AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The service port of Site Intelligence, transcribed for the adapters in `src/services/mock/` and
 * `src/services/api-client/` and consumed by every screen through `useService()`.
 *
 * The interface is deliberately one flat contract rather than one per screen: a screen reads what it
 * needs from here and never from a record it obtained another way (rule P-2), so the same read
 * serves the exception queue, the canvas ribbon and the comparison screen when they ask for the same
 * figures, and a write invalidates the reads it touched in one place rather than in each caller.
 *
 * Every method is asynchronous, resolves to a `Result<T>` and fails by throwing a `Problem`. The two
 * demonstration members at the end of the interface carry no HTTP counterpart, which is why the API
 * client implements them as no-ops rather than as requests (AAP 0.6.2).
 *
 * The acting persona is not a parameter anywhere below. The adapter holds the active user from the
 * demonstration role switcher, evaluates the permission matrix and the policies against it, and
 * applies the role's plant scope before it answers, so a caller cannot widen its own reach by
 * passing a role, and a disabled control is an explanation rather than the defence (rules P-2, P-8).
 *
 * Because that enforcement runs in the browser, the permission checks behind it are a demonstration
 * and are not production authorisation: the role switcher carries that statement on screen where it
 * is offered, and the README repeats it (rule P-3).
 */
export interface SiteIntelligenceService {
  /* -------------------------------------------------------------------------------------------
   * Overview — specification SCR-01, AAP 0.12.1 `computeOverview`
   * ----------------------------------------------------------------------------------------- */

  /**
   * Reads the overview: the four computed tiles, the "changed since your last visit" list, the
   * risk-by-plant rows and the fourteen-day opened-and-resolved series, every one of them computed
   * over the records the caller may see.
   *
   * contracts §9: the overview read. `scope` is the shell's plant and product selection, which the
   * service intersects with the role's plant scope before computing — the same resolver the
   * exception queue uses, which is what keeps a filtered queue and a filtered overview from
   * disagreeing (AAP 0.2.1). Each tile reaches a screen as a computed figure and carries
   * `Simulated calculation` there (rule P-1).
   */
  getOverview(scope: Scope): Promise<Result<Overview>>;

  /* -------------------------------------------------------------------------------------------
   * Exceptions — specification SCR-02 and SCR-03, AAP 0.12.1
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the exception queue: one row per exception in scope, ordered by severity and then by days
   * to impact unless `query.sort` names another order.
   *
   * contracts §9: the exception-queue list read. `query` carries SCR-02's own filters and `scope`
   * the shell's selection, and the service intersects both with the role's plant scope before it
   * filters, so a row outside the acting persona's reach is never returned. Each row's revenue at
   * risk is computed from the exception's affected lines rather than read from a stored figure
   * (rule P-6).
   */
  listExceptions(query: ExceptionQuery, scope: Scope): Promise<Result<ExceptionRow[]>>;

  /**
   * Reads one exception's investigation payload: the record with its header fields and what
   * changed, the impact chain from purchase order to customer orders, the projected closing stock,
   * the affected orders as the solver measures them, the missing inputs, the confidence and the
   * activity recorded against the exception.
   *
   * contracts §9: the exception detail read. The freshness of the sources behind these figures
   * travels in the result's `meta.freshness`, which is what raises the screen's stale banner beside
   * the figures it qualifies (AAP 0.2.1).
   */
  getExceptionDetail(exceptionId: ExceptionId): Promise<Result<ExceptionDetail>>;

  /**
   * Reads the customer order lines one exception places at risk — the only input to its revenue at
   * risk, and the narrow read a caller takes when it needs the lines without the whole
   * investigation.
   *
   * contracts §9: the exception's affected-lines read. The lines of an exception that has a solver
   * case come from the baseline solve rather than from a stored figure, so the revenue a reader
   * sees is measured from the same records the solver used (AAP 0.12.2, rule P-6).
   */
  getAffectedLines(exceptionId: ExceptionId): Promise<Result<AffectedLine[]>>;

  /**
   * Assigns an exception to a persona and appends the `assign` audit event.
   *
   * contracts §9: the exception assignment write. `ownerId` is the persona being made accountable,
   * which SCR-02's "assign to me" fills with the acting user's own identifier. The acting persona
   * has to hold `exception.work` over the exception's plant, and a refusal names the permission it
   * lacks and the roles that hold it (rule P-8).
   */
  assignException(exceptionId: ExceptionId, ownerId: UserId): Promise<Result<OperationalException>>;

  /**
   * Records a note against an exception and appends the `note` audit event.
   *
   * contracts §9: the exception note write. The note is the planner's own words and travels to the
   * event's payload unchanged, so the activity the investigation screen lists is the record a reader
   * can follow rather than a second copy of the sentence.
   */
  noteException(exceptionId: ExceptionId, note: string): Promise<Result<OperationalException>>;

  /**
   * Dismisses an exception with the reason the dismissal rests on, and appends the `dismiss` audit
   * event.
   *
   * contracts §9: the exception dismissal write. SCR-02 enables the action only once a reason is
   * given, and the service refuses a dismissal without one rather than trusting the control's own
   * state, so a dismissed row always says why it was set aside (rule P-8).
   */
  dismissException(exceptionId: ExceptionId, reason: string): Promise<Result<OperationalException>>;

  /* -------------------------------------------------------------------------------------------
   * Scenarios — specification SCR-04, AAP 0.12.1 and platform-contracts.md §4
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads every option measured for one exception: the scenarios with their six measures, the
   * recommended option with the rule that picked it and the trade-off it states, and the options set
   * aside with the constraint that blocked each.
   *
   * contracts §9: the scenario-set read. `recommendedId` is absent when no option passes its
   * constraint, and the matrix then recommends nothing rather than falling back to the first column
   * (AAP 0.8). A seeded option's column carries `Simulated data` on screen, because its figures
   * shipped with the dataset rather than being computed in this session (rule P-1, AAP 0.10).
   */
  getScenarioSet(exceptionId: ExceptionId): Promise<Result<ScenarioSet>>;

  /**
   * Measures one option at the levers a caller supplies: the comparison screen's sandbox, which
   * recomputes every measure from the exception's solver case instead of storing a figure.
   *
   * contracts §9: `POST /exceptions/{id}/scenarios/solve`. A lever outside its constraint is not a
   * failed call: the result is a scenario whose `constraintCheck` fails with one message per breach,
   * which the matrix shows as "Cannot compute" with the reason and never recommends. `Problem` is
   * kept for the causes it names, such as an exception with no solver case (AAP 0.8, AAP 0.12.2).
   */
  solveScenario(exceptionId: ExceptionId, levers: Levers): Promise<Result<Scenario>>;

  /* -------------------------------------------------------------------------------------------
   * Approvals — specification SCR-05, AAP 0.12.1 and AAP 0.12.3
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the approval inbox: one record per approval in scope, narrowed to `query.status` so a
   * caller can ask for the pending set alone.
   *
   * contracts §9: the approval list read. The status travels in the query rather than being filtered
   * from an already-truncated page by a screen, so a limit applies to the approvals the caller asked
   * for. The acting persona's plant scope still narrows the inbox, whichever status is requested.
   */
  listApprovals(
    query: ListQuery & { status?: ApprovalStatus },
    scope: Scope,
  ): Promise<Result<Approval[]>>;

  /**
   * Reads one approval: the plan under it, its added cost against the revenue it protects, the
   * eligible approver roles, the decision taken where one exists, and the simulated write-backs it
   * sets in motion in their recorded order.
   *
   * contracts §9: the approval detail read. The detail is what SCR-05 shows before a decision, so it
   * carries the write-back preview as records rather than as a second rendering of the plan.
   */
  getApproval(approvalId: ApprovalId): Promise<Result<Approval>>;

  /**
   * Reads the outcome card's two measurements for one approval: the plan as it was approved, and
   * the state the records reached once the change had run.
   *
   * SCR-05 sets the plan's figures against the resulting ones after the write-back tracker has
   * stepped through the change (AAP 0.12.4), and AAP 0.2.2 makes a simulated write-back
   * all-or-nothing: a change any of whose steps is pending or failed has not been applied, so the
   * resulting side stands at the do-nothing position rather than part-way through. Both sides are
   * measured from the exception's own solver case at the moment of the read, so a caller supplies
   * neither a figure nor a comment (rule P-6), and the card labels the comparison where it is shown
   * (rule P-1).
   *
   * contracts §9: `approvalOutcomePath` is derived because §9 is not readable in this run, and sits
   * beside the outcome review AAP 0.12.3 does fix (see the derivation record at the head of this
   * file). A `'not-found'` refusal names the approval or the option the records do not hold, a
   * `'permission'` refusal names `exception.read` and the roles that hold it, and a `'validation'`
   * refusal names an exception that carries no solver case — which the card shows as "Cannot
   * compute" with that reason rather than as a partial figure.
   */
  getApprovalOutcome(approvalId: ApprovalId): Promise<Result<ApprovalOutcome>>;

  /**
   * Puts a scenario forward for approval and appends the `approval request` audit event.
   *
   * contracts §9: `POST /approvals`. The request names the exception and the option, and the adapter
   * fills in the requester from the acting persona and the eligible approver roles from the
   * permission matrix, which is why neither is a member of the request. The plan's added cost and
   * protected revenue are computed from the solver's figures at the moment of the request rather
   * than carried from the screen (rule P-6). Refused when the source behind the plan is stale or
   * unavailable, with the source and its as-of time in the message and no approval created.
   */
  requestApproval(request: {
    /** The exception the plan answers. */
    exceptionId: ExceptionId;

    /** The option put forward, which has to be one whose constraint check passes. */
    scenarioId: ScenarioId;
  }): Promise<Result<Approval>>;

  /**
   * Records a decision on an approval and appends the `decision` audit event.
   *
   * contracts §9: `POST /approvals/{id}/decision`. The service refuses the call when the acting
   * persona may not decide it — the requester is never eligible, and `approval.decide` has to be
   * held — when a policy denies it, and when the source behind the plan is stale or unavailable. A
   * refusal leaves the approval as it stood and creates no write-back; the `Problem` names the
   * permission with the roles that may act, the policy with the alternative it permits, or the stale
   * source with its as-of time, which is the sentence the disabled controls repeat (rule P-8).
   */
  decideApproval(approvalId: ApprovalId, decision: Decision): Promise<Result<Approval>>;

  /**
   * Records that the post-approval outcome has been read against the plan, and appends the
   * `outcome review` audit event.
   *
   * contracts §9: the outcome-review write. The card sets the plan's figures against the resulting
   * ones, both sides computed by the adapter from the records it holds after the decision, and the
   * review records that the comparison was read rather than restating its figures (SCR-05,
   * rule P-6).
   */
  reviewApprovalOutcome(approvalId: ApprovalId): Promise<Result<Approval>>;

  /**
   * Re-attempts one failed step of an approved change's simulated write-back, addressed by the
   * reference that step writes, and lets the change complete.
   *
   * AAP 0.2.2's failure behaviour for a simulated write-back: the change stays all-or-nothing, the
   * failure is recorded, and a retry is offered that never duplicates a success record. The retry
   * therefore refuses a step that already succeeded rather than writing it again, and the steps the
   * failure left untouched then run in their recorded order, so the change reaches the state the
   * plan described. The step's reference is the key because a write-back names the record it writes
   * rather than carrying an identifier of its own. A refusal leaves the change as it stood, and the
   * `Problem` names the step, the approval's status or the stale source with its as-of time.
   *
   * contracts §9: `approvalWriteBackRetryPath` is derived in the shape of the decision AAP 0.12.3
   * fixes, because §9 is not readable in this run (see the derivation record at the head of this
   * file). A `'not-found'` refusal names a reference that answers no step of the approval; a
   * `'validation'` one covers an approval that is not approved, a step that already succeeded, a
   * record that moved under the reader and a stale or unavailable order book; a `'permission'` one
   * names `approval.decide` and the roles that hold it.
   */
  retryWriteBack(approvalId: ApprovalId, writeBackId: string): Promise<Result<WriteBack>>;

  /* -------------------------------------------------------------------------------------------
   * Audit — specification SCR-05, platform-contracts.md §6
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the audit trail: the events the filter admits, in chain order, with the before and after
   * values the detail drawer shows.
   *
   * contracts §9: the audit list read. The chain is not plant-scoped — a persona either holds
   * `audit.read` or does not — so this read takes the query's own filters and no scope. Every
   * surface that shows the chain labels it `Simulated control` (rule P-4).
   */
  listAuditEvents(query: AuditQuery): Promise<Result<AuditEvent[]>>;

  /**
   * Reads one event of the chain, with the two payload halves the audit detail drawer shows.
   *
   * SCR-05's audit table opens an event in a detail drawer that shows its before and after values
   * (AAP 0.12.4), so this read serves the record itself rather than a second rendering of the action
   * that wrote it: the payloads are the event's own, which is what makes the drawer a reading of
   * the chain a verification walks. The chain is not plant-scoped — a persona either holds
   * `audit.read` or does not — so the read takes no scope, and an identifier the chain does not hold
   * is refused as a `'not-found'` naming it rather than answered with an empty event.
   *
   * contracts §9: `auditEventPath` is derived as one event of the collection the transcribed paths
   * fix, because §9 is not readable in this run (see the derivation record at the head of this
   * file). A role without `audit.read` meets a `'permission'` refusal that names the permission and
   * the roles that hold it.
   */
  getAuditEvent(auditEventId: AuditEventId): Promise<Result<AuditEvent>>;

  /**
   * Verifies the chain by recomputing every hash in sequence, and reports the positions at which it
   * does not verify.
   *
   * contracts §9: `GET /audit-events/verify`. The report carries every break and the count of events
   * checked, and the screen shows the position of the first with the total. The verification repairs
   * nothing and changes no record (AAP 0.8, AAP 0.12.1).
   */
  verifyAuditChain(): Promise<Result<ChainReport>>;

  /* -------------------------------------------------------------------------------------------
   * Evidence assistant — specification SCR-06, platform-contracts.md §10
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the model catalogue the assistant's selector offers: the four placeholder model records
   * with the processing boundary each declares.
   *
   * contracts §9: the model-catalogue read. The boundary is what POL-007 evaluates before an answer
   * is produced, so the selector needs the records rather than a list of names, and the screen shows
   * them under `Declared, not verified` (rule P-4). No model is connected in this run (rule P-1).
   */
  getModelCatalogue(): Promise<Result<ModelCatalogue>>;

  /**
   * Lists the questions the assistant panel offers, in the order the records hold them.
   *
   * SCR-06 fixes "suggested questions with scripted cited answers" as the screen's content
   * (AAP 0.12.4), and each suggestion is answered by one of the six scripted builders when it is
   * submitted to `askAssistant`. Only the identifier and the prompt cross the boundary: the
   * answer's outline, the sentence template that fills it and the records it cites stay behind the
   * adapter until a question is asked, so no figure and no sentence of an answer reaches the panel
   * before the answer itself does (rule P-6).
   *
   * contracts §9: `assistantQuestionsPath` is derived beside the `/assistant/queries` path
   * AAP 0.12.3 quotes, because §9 is not readable in this run (see the derivation record at the head
   * of this file). A `'permission'` refusal names `evidence.read` and the roles that hold it, which
   * is the refusal a question meets.
   */
  listSuggestedQuestions(): Promise<Result<SuggestedQuestion[]>>;

  /**
   * Puts a question to the evidence assistant and returns its answer with the citations behind it,
   * the queries it ran, the model that composed it and the inputs it is missing.
   *
   * contracts §9: `POST /assistant/queries`. The figures in the answer are filled at call time from
   * the records the question touches, never typed (rule P-6). A question outside the six scripted
   * ones returns the fixed notice as its text with no citations. Where POL-007 blocks the requested
   * model for the context the question carries, the call throws a `Problem` of type `'policy'`
   * carrying the policy, the reason, the alternative it permits and the event it appended, which is
   * what the block card shows with its one-click switch to the in-boundary model (AAP 0.12.4).
   */
  askAssistant(query: {
    /** The question as the user asked it. */
    question: string;

    /** The model the selector has chosen, one identifier from the model catalogue. */
    modelId: string;

    /** The records the question runs over, such as a document identifier; POL-007 reads them. */
    contextRefs: string[];
  }): Promise<Result<Answer>>;

  /* -------------------------------------------------------------------------------------------
   * Governance — specification SCR-07, platform-seed-data.md §8, platform-contracts.md §7
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the sovereignty screen's payload: the deployment summary, the ten declared configuration
   * rows and the outbound ledger with its thirty-day counts.
   *
   * contracts §9: the sovereignty read. Every part of it describes declared configuration, so the
   * screen renders the summary and each of the ten rows under `Declared, not verified`; nothing here
   * reports a state that was checked (rule P-4). The counts are computed from audit events whose
   * object is the endpoint, not asserted (rule P-6).
   */
  getSovereigntyStatus(): Promise<Result<SovereigntyStatus>>;

  /**
   * Reads the outbound ledger on its own: one row per endpoint with its purpose, its declared state,
   * its last attempt and its allowed and blocked counts over the window.
   *
   * contracts §9: the outbound-ledger read, which `getSovereigntyStatus` also carries. It is
   * separate so a caller refreshing the counts after a decision does not re-read the declared rows
   * beside them, and both reads compute the counts by the same rule (contracts §5).
   *
   * `query` carries the list parameters contracts §9 fixes: `limit` bounds the page, `cursor`
   * continues from the position a previous page ended at, and `sort` names one of the row's own
   * members as `field:dir`. Without a sort the rows keep the order the records are held in, and a
   * cursor that names no position of the requested order is refused as a `'validation'` failure
   * rather than restarting the page.
   */
  getOutboundLedger(query: ListQuery): Promise<Result<LedgerRow[]>>;

  /**
   * Reads the policy list: every policy the engine evaluates and every one the deployment only
   * declares.
   *
   * contracts §9: the policy list read. Each entry states whether the engine evaluates it, which is
   * how the screen distinguishes a policy it can show decisions for from one it can only show as
   * declared — POL-009 on customer-held keys is declared and never evaluated (rule P-4).
   *
   * `query` carries the list parameters contracts §9 fixes: `limit` bounds the page, `cursor`
   * continues from the position a previous page ended at, and `sort` names one of the row's own
   * members as `field:dir`. Without a sort the rows keep the order the records are held in, and a
   * cursor that names no position of the requested order is refused as a `'validation'` failure
   * rather than restarting the page.
   */
  listPolicies(query: ListQuery): Promise<Result<PolicyDetail[]>>;

  /**
   * Reads one policy: its display statement, whether the engine evaluates it, and the decisions it
   * made, most recent first.
   *
   * contracts §9: the policy detail read. The statement is the policy record's own wording rather
   * than a sentence composed by a screen (rule P-6), so the rule a denial cites and the rule this
   * screen shows cannot drift apart.
   */
  getPolicy(policyId: PolicyId): Promise<Result<PolicyDetail>>;

  /**
   * Requests a time-boxed exception against a policy and appends the audit event the request
   * records.
   *
   * contracts §9: the policy-exception write. The request needs a reason, an expiry and a second
   * approver before it exists, and it is recorded as pending: nothing in the demonstration decides
   * one, so the flow's outcome is a pending request rather than a granted exception (SCR-07,
   * AAP 0.12.4). The requester is taken from the acting persona by the adapter.
   */
  requestPolicyException(request: {
    /** The policy the exception is requested against. */
    policyId: PolicyId;

    /** Why the exception is needed, in the requester's own words. */
    reason: string;

    /** The instant the exception stops applying. */
    expiresAt: Timestamp;

    /** The second persona whose approval the request needs. */
    secondApproverId: UserId;
  }): Promise<Result<PolicyException>>;

  /* -------------------------------------------------------------------------------------------
   * Evidence — PR-6, specification §5, AAP 0.12.3
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the evidence behind one displayed figure, chart mark, node, arc or pin: its value, its
   * provenance, its simulation label, the formula that produced it, the records upstream and
   * downstream of it, its confidence, the inputs it is missing and the documents behind it.
   *
   * contracts §9: `GET /evidence?ref=`. `ref` is the reference the element carries, in the service's
   * own form, which is why the drawer can open from a figure without the screen holding the record.
   * The provenance keeps a market-intelligence reading separate from a first-party one (rule P-5).
   */
  getEvidence(ref: string): Promise<Result<Evidence>>;

  /**
   * Reads one document's body as the calling persona may receive it.
   *
   * contracts §9: `GET /documents/{id}`. A body classified customer-confidential never crosses this
   * boundary for the platform administrator persona: the adapter withholds it and the call throws a
   * `Problem` rather than returning an empty body, so a redaction cannot be mistaken for an empty
   * document (AAP 0.6.2, AAP 0.12.3).
   */
  getDocument(documentId: DocumentId): Promise<Result<DocumentBody>>;

  /**
   * Reads the evidence pins the canvas badges nodes with, filtered to what the calling persona may
   * see: the external supplier engineer receives its own vendor's pins and no other.
   *
   * contracts §9: the evidence-pin list read. The per-node counts travel with the topology, so the
   * canvas badges a node without this call; the pin records themselves belong to the stage that
   * opens them, and this read exists for interface conformance (AAP 0.12.2, AAP 0.12.3).
   *
   * `query` carries the list parameters contracts §9 fixes: `limit` bounds the page, `cursor`
   * continues from the position a previous page ended at, and `sort` names one of the row's own
   * members as `field:dir`. Without a sort the rows keep the order the records are held in, and a
   * cursor that names no position of the requested order is refused as a `'validation'` failure
   * rather than restarting the page.
   */
  listPins(query: ListQuery): Promise<Result<EvidencePin[]>>;

  /**
   * Records a review of one evidence pin's state and appends the audit event that review leaves
   * behind.
   *
   * contracts §9: the evidence-pin review write, carried for interface conformance with the stage
   * that shows pins (AAP 0.12.3). The reviewer is the acting persona, which has to hold
   * `evidence.review`, and the state is the pin vocabulary the badges already render.
   */
  reviewPin(pinId: EvidencePinId, state: PinState): Promise<Result<EvidencePin>>;

  /**
   * Reads the part approval packages: each package's elements with the evidence rule that decided
   * each state, and the readiness those elements add up to.
   *
   * contracts §9: the package list read, carried for interface conformance with the stage that shows
   * the package map (AAP 0.12.3). Readiness is the passed elements over the package's own element
   * count, handed to the shared whole-percent rule rather than typed anywhere (rule P-6).
   *
   * `query` carries the list parameters contracts §9 fixes: `limit` bounds the page, `cursor`
   * continues from the position a previous page ended at, and `sort` names one of the row's own
   * members as `field:dir`. Without a sort the rows keep the order the records are held in, and a
   * cursor that names no position of the requested order is refused as a `'validation'` failure
   * rather than restarting the page.
   */
  listPackages(query: ListQuery): Promise<Result<PpapPackage[]>>;

  /**
   * Reads one part approval package with its elements and its readiness.
   *
   * contracts §9: the package detail read. The elements carry the rule that decided each state and
   * that rule's own wording, so a reader sees the rule the record applied rather than a label the
   * interface composed (rule P-6).
   */
  getPackage(packageId: PackageId): Promise<Result<PpapPackage>>;

  /**
   * Records a review of one extracted element value — accepted as extracted or corrected to the
   * value the reviewer supplies — re-runs the evidence rules over the package and appends the audit
   * event that review leaves behind.
   *
   * contracts §9: the element-review write, carried for interface conformance (AAP 0.12.3). The
   * result is the package as it stands after the rules were re-run, so a caller never applies the
   * rules itself, and the reviewer is the acting persona, which has to hold `evidence.review`.
   */
  reviewElement(review: ElementReview): Promise<Result<PpapPackage>>;

  /* -------------------------------------------------------------------------------------------
   * Identifier search — specification §5.1, AAP 0.12.2 `SearchHit`
   * ------------------------------------------------------------------------------------------- */

  /**
   * Searches the identifiers the caller may see and returns the hits grouped by the record kind they
   * belong to, each carrying the route or the drawer reference that opens it.
   *
   * contracts §9: the identifier-search read. The search is narrowed by the shell's selection and by
   * the role's plant scope, so a hit for a record outside the caller's reach is not returned at all
   * rather than being returned and then refused (AAP 0.2.1).
   */
  searchIdentifiers(term: string, scope: Scope): Promise<Result<SearchHit[]>>;

  /* -------------------------------------------------------------------------------------------
   * FileMap canvas — specification §6 and SCR-12, AAP 0.12.3
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the topology the FileMap canvas renders through both lenses: the four node families, the
   * lanes joining them, and the evidence-pin counts of each node.
   *
   * contracts §9: `GET /topology`. The selection narrows the nodes and lanes the two lenses draw and
   * the role's plant scope still applies, so the map lens and the graph lens read one payload and a
   * selection made in one is a selection in the other. The pin counts travel here so a node badge
   * needs no second call, and a node absent from the map carries no badge rather than a zero.
   */
  getTopology(scope: Scope): Promise<Result<Topology>>;

  /**
   * Reads the six computed tiles of the FileMap canvas ribbon for the caller's selection.
   *
   * SCR-12 fixes the ribbon as six computed tiles above the canvas (AAP 0.12.4), and AAP 0.12.1's
   * "Urgency" row fixes the module that builds them and the order they are reported in. Each tile's
   * value is an aggregate's own output copied across or a count of the rows the same scope returns,
   * so a caller supplies no figure, can add no seventh tile and cannot alter one (rule P-6). A tile
   * travels as `RibbonTile` with its aggregate key and the provenance of its value, carries no
   * caption and no label of its own, and is shown under `Simulated calculation` where it is
   * rendered (rule P-1).
   *
   * contracts §9: `canvasRibbonPath` is derived as the ribbon's sub-resource of the topology path
   * AAP 0.12.3 quotes exactly, because §9 is not readable in this run (see the derivation record at
   * the head of this file). A `'permission'` refusal names `exception.read` and the roles that hold
   * it, which is the refusal the canvas and the queue meet; a `'validation'` one names a record a
   * tile's figure could not be resolved from.
   */
  getCanvasRibbon(scope: Scope): Promise<Result<RibbonTile[]>>;

  /* -------------------------------------------------------------------------------------------
   * Competitive atlas — specification SCR-13, AAP 0.12.3, rule P-5
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the competitive atlas: the simulated market-intelligence pack's version banner, the
   * client's own sites and series, the three competitor networks, the shared chokepoints and the
   * five-axis radar axes.
   *
   * contracts §9: `GET /market-intelligence/atlas`. The payload separates the client's series from
   * the competitors' rather than combining them, and each series carries its own label, so no figure
   * on the screen mixes first-party records with market intelligence (rule P-5). The whole pack
   * arrives in one result, which is what lets the screen's selector switch between the client and a
   * competitor without a second call. Refused for the external supplier engineer, with the
   * permission it lacks and the roles that hold it in the `Problem`.
   */
  getAtlas(): Promise<Result<Atlas>>;

  /* -------------------------------------------------------------------------------------------
   * Catalogue reads declared for interface conformance — stage S5, AAP 0.12.3
   * ------------------------------------------------------------------------------------------- */

  /**
   * Reads the six data sources with their labels, states and as-of times, in the order the freshness
   * strip renders them.
   *
   * contracts §9: the source-catalogue read. Both adapters carry it so the stage that shows the
   * sources workspace calls the port rather than a second boundary; no screen in this run invokes it,
   * and the six sources' freshness reaches every other screen through the result's `meta`.
   */
  getSourceCatalogue(): Promise<Result<SourceCatalogue>>;

  /**
   * Reads one plant's production plan grid: the horizon of working dates and one row of planned
   * output per line.
   *
   * contracts §9: the plan-grid read for the plant named, carried for conformance with the stage
   * that shows the plan (AAP 0.12.3). The horizon comes from the records rather than from a clock, so
   * the same state always yields the same grid.
   */
  getPlanGrid(plantId: PlantId): Promise<Result<PlanGrid>>;

  /**
   * Reads the exit package: the sections a deployment hands over, each naming the records it
   * packages and stating no figure of its own.
   *
   * contracts §9: the exit-package read, carried for conformance with the stage that assembles the
   * package (AAP 0.12.3). The package's instant is the constant demonstration clock rather than the
   * system clock, so the same state produces the same package.
   */
  getExitPackage(): Promise<Result<ExitPackage>>;

  /* -------------------------------------------------------------------------------------------
   * Browser-built exports — platform-contracts.md §11, AAP 0.12.1 `exports/*`
   * ------------------------------------------------------------------------------------------- */

  /**
   * Builds the evidence pack for download from the current state: the JSON payload whose top level
   * carries `"simulated": true`.
   *
   * contracts §9: no HTTP path — the payload is assembled in the browser and offered as a download,
   * so the export leaves the application as a file rather than as a request (AAP 0.12.4 SCR-07).
   * The records it carries are read at call time, so an export reflects the state a reader is
   * looking at rather than a snapshot taken when the screen opened.
   *
   * The result is the download payload itself — the suggested file name, the media type and the
   * pack's text — so a caller offers the file under the name and type the document declares
   * rather than inventing either (AAP 0.12.1 "Exports" row). Both adapters compose it from their
   * own reads through one shared builder, so the same state yields the same file whichever adapter
   * is bound (AAP 0.12.3).
   */
  exportEvidencePack(): Promise<Result<ExportPayload>>;

  /**
   * Builds the scenario comparison for one exception as CSV: one column per option and one row per
   * measure, as the comparison matrix shows them.
   *
   * contracts §9: no HTTP path — the comparison is built in the browser from the same solver output
   * the matrix renders, so the file and the screen cannot disagree (AAP 0.12.4 SCR-04).
   *
   * The result carries the CSV's suggested file name and its media type beside the text, so the
   * caller offers the download as the document declares it (AAP 0.12.1 "Exports" row), and both
   * adapters compose it through the same builder from the scenario set each reads (AAP 0.12.3).
   */
  exportScenarioComparison(exceptionId: ExceptionId): Promise<Result<ExportPayload>>;

  /**
   * Builds the chokepoint brief for download from the current market-intelligence pack: the JSON
   * payload whose top level carries `"simulated": true`.
   *
   * contracts §9: no HTTP path — the brief is built in the browser, and every competitor figure in
   * it carries the market-intelligence provenance and its own label so the export cannot be read as
   * a first-party record (rules P-5, P-1).
   *
   * The result carries the brief's suggested file name and its JSON media type beside the text
   * (AAP 0.12.1 "Exports" row). Both adapters compose it through the same builder from the atlas
   * read, which publishes the pack's release label, so a client builds the same document without
   * reaching the seeded records the label is defined beside (rule P-2, AAP 0.12.3).
   */
  exportChokepointBrief(): Promise<Result<ExportPayload>>;

  /* -------------------------------------------------------------------------------------------
   * Demonstration controls — AAP 0.6.2, AAP 0.12.1
   * ------------------------------------------------------------------------------------------- */

  /**
   * Turns one demonstration trigger on or off: the seven screen states, the edited audit event or
   * the emptied exception queue.
   *
   * No HTTP counterpart — demonstration control. A deployment has no simulation flags, so the API
   * client implements this as a resolved no-op rather than as a request (AAP 0.6.2). The triggers
   * are reachable only from the single simulation popover, which is labelled `Simulated control`
   * (rule P-4), and a trigger changes the adapter's behaviour rather than a component's branch, so
   * the same read produces the state whichever screen asks (AAP 0.12.1).
   */
  setSimulation(flag: SimulationFlag, on: boolean): Promise<Result<true>>;

  /**
   * Restores the seeded state and clears every demonstration trigger, leaving the session as a first
   * visit found it.
   *
   * No HTTP counterpart — demonstration control. A deployment has no demo reset, so the API client
   * implements this as a resolved no-op (AAP 0.6.2). `Reset demo data` is the popover's own action
   * rather than a simulation flag, because it changes the state every read sees rather than one
   * read's behaviour.
   */
  resetDemo(): Promise<Result<true>>;
}
