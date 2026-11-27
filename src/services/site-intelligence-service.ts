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
 * OPEN ITEM: `platform-contracts.md` §2, which fixes this interface method for method, is a plan
 * attachment rather than a file in this checkout, and no copy of it is readable in this run. The
 * members below therefore declare one method per capability AAP 0.6.2, 0.12.1, 0.12.3 and 0.12.4
 * name, each signature derived from the type that capability returns or accepts in `src/types`.
 * No method name or signature here is transcribed from §2, and the transcription has to be
 * reconciled with §2 before the interface is called verbatim.
 * OPEN ITEM: contracts §9 fixes 34 paths, and that document is not readable here either, so the
 * members below are not one per path. The nine paths AAP 0.12.3 quotes exactly are cited on the
 * member that serves them: `POST /approvals`, `POST /approvals/{id}/decision`,
 * `POST /assistant/queries`, `GET /evidence?ref=`, `GET /documents/{id}`,
 * `GET /audit-events/verify`, `GET /market-intelligence/atlas`,
 * `POST /exceptions/{id}/scenarios/solve` and `GET /topology`. Every other member's path is fixed
 * by §9 and held as a constant in `src/services/api-client/paths.ts`; no path literal is invented
 * here, and the two files have to describe the same set once §9 is available.
 * OPEN ITEM: the stage S4 reads for the binder manifest, a supplier profile and a material profile
 * are not declared. AAP 0.12.3 lists them among the endpoints both adapters carry for conformance,
 * but `src/types` holds no response type for them — the plant, supplier, material, product,
 * customer and order records are typed in `src/seed`, which rule P-2 bars this module from
 * importing — and this module declares no type of its own. They arrive with the stage that types
 * them. The package, pin and element-review reads of the same stage are declared, because
 * `src/types/packages.ts`, `src/types/entities.ts` and `src/types/topology.ts` type them.
 * OPEN ITEM: `listApprovals` narrows by approval status through an inline extension of `ListQuery`,
 * because `src/types` holds no `ApprovalQuery`. That one field is what the inbox's read needs, and
 * carrying it in the query keeps the limit and the cursor on the service side of the boundary
 * rather than applied to an already-truncated page by a screen.
 * OPEN ITEM: `requestApproval`, `requestPolicyException` and `askAssistant` take inline request
 * objects, because `src/types` holds no `ApprovalRequest`, no policy-exception draft and no
 * assistant-query type. Each member of those objects is fixed by the screen that sends it (SCR-04,
 * SCR-07, SCR-06); the requester, the second approver and the acting persona are not among them,
 * because the adapter takes the acting persona from its own state rather than from a caller.
 * OPEN ITEM: `reviewApprovalOutcome` takes the approval's identifier alone. SCR-05's outcome card
 * sets the plan's figures against the resulting ones, and both sides of that comparison are
 * computed by the adapter from the records it holds, so a caller supplies neither a figure nor a
 * comment (rule P-6).
 * OPEN ITEM: the three export members resolve to the payload's text, because `src/types` holds no
 * export-payload type. Each JSON payload carries `"simulated": true` at its top level (AAP 0.12.1)
 * and the caller offers the text as a download; the media type is JSON for the evidence pack and
 * the chokepoint brief and CSV for the scenario comparison (contracts §11).
 * OPEN ITEM: `searchIdentifiers` is not among the families AAP 0.12.3 tabulates, but specification
 * §5.1 requires the identifier search, and rule P-2 leaves a screen no other route to the records it
 * searches. Its response is `SearchHit`, which AAP 0.12.2 types for exactly that read.
 * OPEN ITEM: `decideApproval` carries no side-effect acknowledgement member. SCR-05's
 * acknowledgement gates the decision control in the interface (rule P-8), while the decision itself
 * carries the action and its comment, and the service refuses the call on grounds it reads from the
 * records: the acting persona's permission, POL-003, and the freshness of the source behind the
 * plan.
 * OPEN ITEM: AAP 0.2.2 says a policy denial creates no audit record, while AAP 0.8 says the policy
 * engine's denial appends a policy-actor event that the outbound ledger counts. The prose on the
 * members below asserts neither outcome for that event and describes only what a caller observes —
 * the approval left as it stood and no write-back created — so the conflict stays visible for the
 * adapter to settle rather than being settled silently here.
 */

import type {
  AffectedLine,
  Answer,
  Approval,
  ApprovalId,
  ApprovalStatus,
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
  Scenario,
  ScenarioId,
  ScenarioSet,
  Scope,
  SearchHit,
  SimulationFlag,
  SourceCatalogue,
  SovereigntyStatus,
  Timestamp,
  Topology,
  UserId,
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
   */
  getOutboundLedger(): Promise<Result<LedgerRow[]>>;

  /**
   * Reads the policy list: every policy the engine evaluates and every one the deployment only
   * declares.
   *
   * contracts §9: the policy list read. Each entry states whether the engine evaluates it, which is
   * how the screen distinguishes a policy it can show decisions for from one it can only show as
   * declared — POL-009 on customer-held keys is declared and never evaluated (rule P-4).
   */
  listPolicies(): Promise<Result<PolicyDetail[]>>;

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
   */
  listPins(): Promise<Result<EvidencePin[]>>;

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
   */
  listPackages(): Promise<Result<PpapPackage[]>>;

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
   */
  exportEvidencePack(): Promise<Result<string>>;

  /**
   * Builds the scenario comparison for one exception as CSV: one column per option and one row per
   * measure, as the comparison matrix shows them.
   *
   * contracts §9: no HTTP path — the comparison is built in the browser from the same solver output
   * the matrix renders, so the file and the screen cannot disagree (AAP 0.12.4 SCR-04).
   */
  exportScenarioComparison(exceptionId: ExceptionId): Promise<Result<string>>;

  /**
   * Builds the chokepoint brief for download from the current market-intelligence pack: the JSON
   * payload whose top level carries `"simulated": true`.
   *
   * contracts §9: no HTTP path — the brief is built in the browser, and every competitor figure in
   * it carries the market-intelligence provenance and its own label so the export cannot be read as
   * a first-party record (rules P-5, P-1).
   */
  exportChokepointBrief(): Promise<Result<string>>;

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
