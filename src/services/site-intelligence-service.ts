/**
 * The single typed service port of Site Intelligence: the one boundary through which every screen,
 * component and domain consumer reads a record or asks for a change (AAP 0.6.2, AAP 0.12.1 "Port"
 * row, AAP 0.13.2 "Contract surface").
 *
 * Two adapters implement it and nothing else may be bound to it: `MockBackend` in
 * `src/services/mock/` owns the seeded state, the latency, the enforcement, the audit chain and the
 * demonstration controls, and `ApiClient` in `src/services/api-client/` compiles against the
 * contracts §9 paths and is never called. `src/services/create-service.ts` is the single place the
 * choice is made, so binding the other adapter is one line and no screen changes.
 *
 * This file is a declaration and nothing else: it holds no state, names no address, carries no
 * credential and imports nothing but types, so under `verbatimModuleSyntax` every import and
 * re-export here is type-only and the module emits no runtime code. The dependency runs from screens
 * to this port to an adapter to the pure domain, never the reverse.
 *
 * Every member is asynchronous and resolves to `Result<T>`, whose `meta` carries the six sources'
 * freshness, the `simulated: true` marker and the call's `traceId`. A failure is thrown as a
 * `Problem` whose `type` names its cause, so a caller cannot read a payload beside a refusal
 * (AAP 0.2.2, AAP 0.12.3), and a refusal made on a source's state names that source and its as-of
 * time, which is the sentence the disabled approval controls repeat (AAP 0.2.1, T-13).
 *
 * What the interface is careful not to say: it describes a contract, not a deployment. The
 * sovereignty, policy and chain members return records stating what this demonstration declares, and
 * each surface showing one labels it `Declared, not verified` or `Simulated control`; nothing here
 * claims that this code establishes a configuration, prevents a copy or defeats an edit (rule P-4).
 * The two demonstration members at the end, `setSimulation` and `resetDemo`, carry no HTTP
 * counterpart, which is why the API client resolves them as no-ops (AAP 0.6.2).
 *
 * Two open items belong to the file rather than to a member, each naming what closes it (AAP 0.1):
 * - contracts §2 itself is not readable in this run: it is a plan attachment (AAP 0.17), and no copy
 *   of it exists in the checkout, in any git ref's history, on the filesystem or among the staged
 *   assets, so no member's name, parameter list or return type is claimed to be that document's
 *   text. Each member records instead the fixing input that names its capability, so reconciling the
 *   two is a review of that input against §2 once it is supplied (AAP 0.1).
 * - §9's path entries are derived in `src/services/api-client/paths.ts`, which holds 40: the nine
 *   AAP 0.12.3 quotes are transcribed and the other 31 derived. Closes when §9 is supplied.
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

/**
 * `Meta`, `Result` and `Problem` are declared once, in `src/types/service.ts`, and reach every
 * consumer of the port through this re-export rather than through a second declaration, so a screen
 * that reads `result.meta.freshness` or catches a `Problem` names the same three types the mock
 * adapter, the API client and this interface are written against, and `Result` cannot be widened
 * locally (AAP 0.12.1 "Port" row, rule P-2).
 */
export type { Meta, Problem, Result } from '../types/service';

/**
 * The service port of Site Intelligence: `platform-contracts.md` §2's interface as AAP 0.6.2 and
 * AAP 0.12.1 "Port" row describe it, implemented by the adapters in `src/services/mock/` and
 * `src/services/api-client/` and consumed by every screen through `useService()`.
 *
 * One flat contract rather than one per screen: a screen reads what it needs from here and never
 * from a record it obtained another way (rule P-2), so one read serves the exception queue, the
 * canvas ribbon and the comparison screen when they ask for the same figures, and a write
 * invalidates the reads it touched in one place rather than in each caller. The members run in
 * families: overview, exceptions, scenarios, approvals, audit, assistant, governance, evidence,
 * identifier search, canvas, atlas, the S4 and S5 catalogue reads, the browser exports, and the two
 * demonstration members last.
 *
 * Three shapes recur and are stated once, here. Every list read takes `ListQuery` for the parameters
 * contracts §9 fixes — `limit`, `cursor` and `sort=field:dir`, a cursor naming no position of the
 * requested order refused as `'validation'` rather than restarting the page. Every refusal names its
 * cause in `Problem.type`: `'permission'` with the permission lacked and the roles holding it,
 * `'policy'` with the policy, its reason and its permitted alternative, `'not-found'` with the
 * reference no record holds, `'validation'` with the input rejected (AAP 0.12.3). And every scoped read
 * is intersected with the role's plant scope, so a row beyond the acting persona's reach is never
 * returned (AAP 0.2.1).
 *
 * The acting persona is not a parameter anywhere below: the adapter holds the active user from the
 * demonstration role switcher, evaluates the matrix and the policies against it and applies that scope
 * before answering, so a caller cannot widen its own reach by passing a role, and a disabled control is
 * an explanation rather than the defence (rules P-2, P-8). Because that enforcement runs in the browser
 * the checks behind it are a demonstration, not production authorisation: the role switcher states it
 * where it is offered and the README repeats it (rule P-3).
 */
export interface SiteIntelligenceService {
  /**
   * Reads the overview: four computed tiles, the changed-since list, risk-by-plant rows and the
   * fourteen-day series (AAP 0.12.1 "Overview aggregates" row, specification SCR-01; rule P-1 tiles).
   */
  getOverview(scope: Scope): Promise<Result<Overview>>;

  /**
   * Reads the exception queue: one row per exception in scope, by severity then days to impact unless
   * `query.sort` says otherwise (specification SCR-02; contracts §9; revenue at risk computed, P-6).
   */
  listExceptions(query: ExceptionQuery, scope: Scope): Promise<Result<ExceptionRow[]>>;

  /**
   * Reads one exception's investigation payload: header, what changed, the impact chain, projected
   * stock, affected orders, missing inputs, confidence and activity (SCR-03; §9; freshness 0.2.1).
   */
  getExceptionDetail(exceptionId: ExceptionId): Promise<Result<ExceptionDetail>>;

  /**
   * Reads the customer order lines one exception places at risk: the only input to its revenue at
   * risk (contracts §9). A solver case takes them from the baseline solve, not a stored figure (P-6).
   */
  getAffectedLines(exceptionId: ExceptionId): Promise<Result<AffectedLine[]>>;

  /**
   * Assigns an exception to a persona and appends the `assign` audit event (AAP 0.6.2, contracts §9).
   * SCR-02's "assign to me" fills `ownerId` with the acting user; `exception.work` is needed (P-8).
   */
  assignException(exceptionId: ExceptionId, ownerId: UserId): Promise<Result<OperationalException>>;

  /**
   * Records a note against an exception and appends the `note` audit event (AAP 0.6.2, contracts §9).
   * The planner's own words travel to the event unchanged, so activity lists the record itself.
   */
  noteException(exceptionId: ExceptionId, note: string): Promise<Result<OperationalException>>;

  /**
   * Dismisses an exception with the reason it rests on and appends the `dismiss` audit event
   * (AAP 0.6.2, contracts §9); a dismissal without a reason is refused, not trusted to the control.
   */
  dismissException(exceptionId: ExceptionId, reason: string): Promise<Result<OperationalException>>;

  /**
   * Reads every option measured for one exception: the six measures, the recommended option with its
   * rule and trade-off, and the options set aside with their blocking constraint (SCR-04, AAP 0.12.1;
   * contracts §4 and §9). `recommendedId` is absent when nothing passes, so the matrix recommends
   * nothing (AAP 0.8), and a seeded option's column carries `Simulated data` (rule P-1, AAP 0.10).
   */
  getScenarioSet(exceptionId: ExceptionId): Promise<Result<ScenarioSet>>;

  /**
   * Measures one option at the levers a caller supplies, recomputing every measure from the
   * exception's solver case (contracts §9 `POST /exceptions/{id}/scenarios/solve`). A lever outside
   * its constraint fails `constraintCheck` with a message per breach and is never recommended;
   * `Problem` is kept for causes such as an exception with no solver case (AAP 0.8, AAP 0.12.2).
   */
  solveScenario(exceptionId: ExceptionId, levers: Levers): Promise<Result<Scenario>>;

  /**
   * Reads the approval inbox: one record per approval in scope, narrowed to `query.status` so a
   * caller can ask for the pending set alone (specification SCR-05; contracts §9). The status is an
   * inline extension of `ListQuery` because `src/types` holds no `ApprovalQuery`, which keeps the
   * limit and the cursor on the service side; closes when §3 or §9 names that query.
   */
  listApprovals(
    query: ListQuery & { status?: ApprovalStatus },
    scope: Scope,
  ): Promise<Result<Approval[]>>;

  /**
   * Reads one approval: the plan under it, its added cost against the revenue it protects, the
   * eligible approvers, the decision taken and the simulated write-backs in recorded order (SCR-05;
   * contracts §9). The preview travels as records, not as a second rendering of the plan.
   */
  getApproval(approvalId: ApprovalId): Promise<Result<Approval>>;

  /**
   * Reads the outcome card's two measurements for one approval: the plan as approved and the state
   * the records reached (AAP 0.2.2, specification SCR-05).
   * SCR-05 sets one against the other after the tracker has stepped through the change (AAP 0.12.4),
   * and the write-back is all-or-nothing: a change with a pending or failed step has not been applied,
   * so the resulting side stands at the do-nothing position. Both sides are measured at the read, so a
   * caller supplies neither figure nor comment (rule P-6), and the card labels it (rule P-1).
   * contracts §9: `approvalOutcomePath` is derived, §9 not being readable in this run.
   */
  getApprovalOutcome(approvalId: ApprovalId): Promise<Result<ApprovalOutcome>>;

  /**
   * Puts a scenario forward for approval and appends the `approval request` audit event (AAP 0.12.3
   * `POST /approvals`, specification SCR-05). The adapter takes the requester from the acting persona
   * and the eligible approvers from the permission matrix, which is why neither is a member; cost and
   * protected revenue are computed at the request (rule P-6), and a stale or unavailable source refuses
   * it with its as-of time and no approval created. The object is inline because `src/types` holds no
   * `ApprovalRequest`: its members are fixed by SCR-04, which sends it. Closes with that type.
   */
  requestApproval(request: {
    /** The exception the plan answers. */
    exceptionId: ExceptionId;

    /** The option put forward, which has to be one whose constraint check passes. */
    scenarioId: ScenarioId;
  }): Promise<Result<Approval>>;

  /**
   * Records a decision on an approval and appends the `decision` audit event (AAP 0.12.3
   * `POST /approvals/{id}/decision`, specification SCR-05). The service refuses when the acting persona
   * may not decide it — the requester is never eligible and `approval.decide` has to be held — when a
   * policy denies it, and when the source behind the plan is stale or unavailable; a refusal leaves the
   * approval as it stood and creates no write-back (rule P-8).
   * No side-effect acknowledgement member exists: SCR-05's acknowledgement gates the control while the
   * service refuses on grounds it reads from the records, and it closes if §2 names one. Nor is a policy
   * denial's own audit event settled — AAP 0.2.2 creates no record for a denial while AAP 0.8 appends
   * one the ledger counts — so the conflict stays with the adapter until contracts §6 or §7.2 says.
   */
  decideApproval(approvalId: ApprovalId, decision: Decision): Promise<Result<Approval>>;

  /**
   * Records that the post-approval outcome has been read against the plan, and appends the
   * `outcome review` audit event (specification SCR-05; contracts §9). Both sides are computed by the
   * adapter, so the write takes the approval's identifier alone and records that the comparison was read
   * rather than restating it — a caller supplies neither figure nor comment (rule P-6). It closes with a
   * payload of its own if §2 gives the write one.
   */
  reviewApprovalOutcome(approvalId: ApprovalId): Promise<Result<Approval>>;

  /**
   * Re-attempts one failed step of an approved change's simulated write-back, addressed by the
   * reference that step writes, and lets the change complete (AAP 0.2.2). The change stays
   * all-or-nothing, the failure is recorded, and the retry never duplicates a success record: it refuses
   * a step that already succeeded, and the untouched steps then run in their recorded order. The
   * reference is the key because a write-back names the record it writes rather than carrying an
   * identifier.
   * contracts §9: `approvalWriteBackRetryPath` is derived in the shape of the decision AAP 0.12.3
   * fixes, because §9 is not readable in this run.
   */
  retryWriteBack(approvalId: ApprovalId, writeBackId: string): Promise<Result<WriteBack>>;

  /**
   * Reads the audit trail: the events the filter admits, in chain order, with the before and after
   * values the detail drawer shows (specification SCR-05, contracts §6; §9). The chain is not
   * plant-scoped — a persona either holds `audit.read` or does not — and every surface showing it
   * labels it `Simulated control` (rule P-4).
   */
  listAuditEvents(query: AuditQuery): Promise<Result<AuditEvent[]>>;

  /**
   * Reads one event of the chain, with the two payload halves the audit detail drawer shows
   * (specification SCR-05, contracts §6). SCR-05's table opens a selected row in a drawer rendering the
   * event the trail read already returned, so this member is carried for conformance with the
   * single-event read derived from the chain's collection, as `getPlanGrid` and `getExitPackage` are for
   * their stages (AAP 0.12.3). Its payloads are the event's own, which is what makes a read of it a
   * reading of the chain a verification walks.
   * contracts §9: `auditEventPath` is derived from the collection the transcribed paths fix.
   */
  getAuditEvent(auditEventId: AuditEventId): Promise<Result<AuditEvent>>;

  /**
   * Verifies the chain by recomputing every hash in sequence, and reports the positions at which it
   * does not verify (contracts §9 `GET /audit-events/verify`, specification SCR-05). The report carries
   * every break and the count of events checked, and the screen shows the position of the first with
   * the total; the verification repairs nothing and changes no record (AAP 0.8, AAP 0.12.1).
   */
  verifyAuditChain(): Promise<Result<ChainReport>>;

  /**
   * Reads the model catalogue the assistant's selector offers: the four placeholder model records with
   * the processing boundary each declares (specification SCR-06, contracts §10 and §9). The boundary is
   * what POL-007 evaluates before an answer, so the selector needs the records rather than names, shown
   * under `Declared, not verified` (rule P-4); no model is connected (rule P-1).
   */
  getModelCatalogue(): Promise<Result<ModelCatalogue>>;

  /**
   * Lists the questions the assistant panel offers, in the order the records hold them. SCR-06 fixes
   * "suggested questions with scripted cited answers" as the screen's content (AAP 0.12.4), and each is
   * answered by one of the six scripted builders when submitted to `askAssistant`; only the identifier
   * and the prompt cross the boundary (rule P-6).
   * contracts §9: it is not among the families AAP 0.12.3 tabulates, and `assistantQuestionsPath` is
   * derived beside the path that section quotes, because §9 is not readable in this run.
   */
  listSuggestedQuestions(): Promise<Result<SuggestedQuestion[]>>;

  /**
   * Puts a question to the evidence assistant and returns its answer with the citations behind it, the
   * queries it ran, the model that composed it and the inputs it is missing (SCR-06).
   * contracts §9: `POST /assistant/queries`. The figures are filled at call time from the records the
   * question touches, never typed (rule P-6), and a question outside the six scripted ones returns the
   * fixed notice with no citations. Where POL-007 blocks the requested model the call throws a
   * `'policy'` `Problem` carrying the policy, its reason, the permitted alternative and the appended
   * event, which the block card shows (AAP 0.12.4). The query object is inline because `src/types` holds
   * no assistant-query type: its members are fixed by SCR-06, which sends it. Closes with it.
   */
  askAssistant(query: {
    /** The question as the user asked it. */
    question: string;

    /** The model the selector has chosen, one identifier from the model catalogue. */
    modelId: string;

    /** The records the question runs over, such as a document identifier; POL-007 reads them. */
    contextRefs: string[];
  }): Promise<Result<Answer>>;

  /**
   * Reads the sovereignty screen's payload: the deployment summary, the ten declared configuration
   * rows and the outbound ledger with its counts (SCR-07, seed §8, contracts §7). Every part describes
   * declared configuration, so the screen renders it under `Declared, not verified` and nothing reports
   * a state that was checked (rule P-4); the counts are computed from audit events (rule P-6).
   */
  getSovereigntyStatus(): Promise<Result<SovereigntyStatus>>;

  /**
   * Reads the outbound ledger on its own: one row per endpoint with its purpose, declared state, last
   * attempt and allowed and blocked counts (contracts §9). It is separate so a caller refreshing the
   * counts does not re-read the declared rows, and both reads count by the same rule (contracts §5).
   */
  getOutboundLedger(query: ListQuery): Promise<Result<LedgerRow[]>>;

  /**
   * Reads the policy list: every policy the engine evaluates and every one the deployment only declares
   * (SCR-07, contracts §7 and §9). Each entry states whether the engine evaluates it — POL-009 on
   * customer-held keys is declared and never evaluated (rule P-4).
   */
  listPolicies(query: ListQuery): Promise<Result<PolicyDetail[]>>;

  /**
   * Reads one policy: its display statement, whether the engine evaluates it, and its decisions, most
   * recent first (contracts §9). The statement is the record's own wording, not a composed sentence
   * (rule P-6), so a denial's rule and this screen's cannot drift apart.
   */
  getPolicy(policyId: PolicyId): Promise<Result<PolicyDetail>>;

  /**
   * Requests a time-boxed exception against a policy and appends the audit event it records
   * (AAP 0.12.4's grant flow, SCR-07; contracts §9). The request needs a reason, an expiry and a second
   * approver, and it is recorded as pending: nothing in the demonstration decides one, so the outcome
   * is a pending request, and the requester comes from the acting persona. The object is inline because
   * `src/types` holds no policy-exception draft: its members are fixed by SCR-07, which sends it.
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

  /**
   * Reads the evidence behind one figure, mark, node, arc or pin: value, provenance, simulation label,
   * formula, records either side, confidence, missing inputs and documents (PR-6, §5; contracts §9
   * `GET /evidence?ref=`). `ref` is the reference the element carries, in the service's own form, so a
   * drawer opens without the screen holding the record (rule P-5 keeps market claims apart).
   */
  getEvidence(ref: string): Promise<Result<Evidence>>;

  /**
   * Reads one document's body as the calling persona may receive it (contracts §9). A
   * customer-confidential body never crosses for the platform administrator: the adapter withholds it
   * and the call throws a `Problem` rather than an empty body, so a redaction is not an empty document
   * (AAP 0.6.2, AAP 0.12.3).
   */
  getDocument(documentId: DocumentId): Promise<Result<DocumentBody>>;

  /**
   * Reads the evidence pins the canvas badges nodes with, filtered to what the caller may see: the
   * external supplier engineer receives its own vendor's pins and no other (contracts §9). The per-node
   * counts travel with the topology, so the badge needs no second call (AAP 0.12.2, AAP 0.12.3).
   */
  listPins(query: ListQuery): Promise<Result<EvidencePin[]>>;

  /**
   * Records a review of one evidence pin's state and appends the audit event it leaves behind
   * (AAP 0.6.2, contracts §3 and §8; §9). The reviewer needs `evidence.review`, the state is the
   * vocabulary the badges render, and the write is carried for conformance (AAP 0.12.3).
   */
  reviewPin(pinId: EvidencePinId, state: PinState): Promise<Result<EvidencePin>>;

  /**
   * Reads the part approval packages: each package's elements with the evidence rule that decided each
   * state, and the readiness they add up to (contracts §3 and §8, AAP 0.12.2; §9 list read, carried for
   * conformance). Readiness is the passed elements over the package's own count, through the shared
   * whole-percent rule (rule P-6).
   * The stage's binder-manifest, supplier-profile and material-profile reads are not declared:
   * AAP 0.12.3 lists those endpoints among the ones both adapters carry, but `src/types` holds no
   * response type for them — those records are typed in `src/seed`, which rule P-2 bars this module from
   * importing — and this module declares no type of its own. They close when those types enter
   * `src/types`; the package, pin and element-review reads of the same stage exist because their types do.
   */
  listPackages(query: ListQuery): Promise<Result<PpapPackage[]>>;

  /**
   * Reads one part approval package with its elements and its readiness (contracts §9). The elements
   * carry the rule that decided each state and that rule's own wording, not a composed label (P-6).
   */
  getPackage(packageId: PackageId): Promise<Result<PpapPackage>>;

  /**
   * Records a review of one extracted element value — accepted as extracted or corrected to the value
   * supplied — re-runs the evidence rules over the package and appends the audit event it leaves
   * (AAP 0.6.2, contracts §3 and §8; §9). The result is the package after the rules were re-run, so a
   * caller never applies them, and the reviewer holds `evidence.review`.
   */
  reviewElement(review: ElementReview): Promise<Result<PpapPackage>>;

  /**
   * Searches the identifiers the caller may see and returns the hits grouped by record kind, each
   * carrying the route or drawer reference that opens it (specification §5.1, AAP 0.12.2 `SearchHit`;
   * contracts §9), narrowed by the shell's selection and the plant scope (AAP 0.2.1).
   * It is not among the families AAP 0.12.3 tabulates, but specification §5.1 requires the search and
   * rule P-2 leaves a screen no other route to the records. Closes when §9 names the path.
   */
  searchIdentifiers(term: string, scope: Scope): Promise<Result<SearchHit[]>>;

  /**
   * Reads the topology the FileMap canvas renders through both lenses: the five node families, the
   * lanes joining them and each node's evidence-pin counts (specification §6 and SCR-12; contracts §9
   * `GET /topology`). The selection narrows both lenses and the plant scope still applies, so the two
   * read one payload; the pin counts travel here so a node badge needs no second call.
   */
  getTopology(scope: Scope): Promise<Result<Topology>>;

  /**
   * Reads the six computed tiles of the FileMap canvas ribbon for the caller's selection
   * (specification SCR-12; AAP 0.12.1's "Urgency" row fixes the module that builds them and their
   * order). Each tile is an aggregate's output copied across or a count of the rows the same scope
   * returns, so a caller supplies no figure and can add no seventh tile (rule P-6); a tile carries its
   * aggregate key and provenance, no label, and is shown under `Simulated calculation` (rule P-1).
   * contracts §9: `canvasRibbonPath` is derived as the ribbon's sub-resource of the topology path
   * AAP 0.12.3 quotes exactly, because §9 is not readable in this run.
   */
  getCanvasRibbon(scope: Scope): Promise<Result<RibbonTile[]>>;

  /**
   * Reads the competitive atlas: the simulated market-intelligence pack's banner, the client's own
   * sites and series, the three competitor networks, the shared chokepoints and the radar axes
   * (AAP 0.12.3 `GET /market-intelligence/atlas`, specification SCR-13). The payload separates the
   * client's series from the competitors' and each carries its own label, so no figure mixes
   * first-party records with market intelligence (rule P-5); the whole pack arrives at once.
   */
  getAtlas(): Promise<Result<Atlas>>;

  /**
   * Reads the six data sources with their labels, states and as-of times, in the order the freshness
   * strip renders them (the S5 source catalogue AAP 0.12.3 has both adapters carry for conformance).
   * contracts §9: the source-catalogue read. The shell's freshness strip is this run's reader: mounted
   * once in the top bar, it asks once on mount and caches the answer under this method's key, so every
   * route's pills come from that one reading and nothing re-reads it on navigation — only the shell's
   * cache maintenance does, since a simulation change invalidates every cached read and a role switch
   * resets every one but the roster, while a recorded write names only the reads it moved. The
   * freshness behind every other figure reaches its screen through `Result.meta`, so a pill and the
   * stale banner beside a disabled control name one source and one as-of time (T-13).
   */
  getSourceCatalogue(): Promise<Result<SourceCatalogue>>;

  /**
   * Reads one plant's production plan grid: the horizon of working dates and one row of planned output
   * per line (contracts §9, carried for conformance). The horizon comes from the records, not a clock.
   */
  getPlanGrid(plantId: PlantId): Promise<Result<PlanGrid>>;

  /**
   * Reads the exit package: the sections a deployment hands over, each naming the records it packages
   * (contracts §9, carried for conformance). Its instant is the constant demonstration clock.
   */
  getExitPackage(): Promise<Result<ExitPackage>>;

  /**
   * Builds the evidence pack for download from the current state: the JSON payload whose top level
   * carries `"simulated": true` (AAP 0.12.1 "Exports" row, contracts §11).
   * contracts §9: no HTTP path — it is assembled in the browser, so the export leaves as a file rather
   * than a request (AAP 0.12.4 SCR-07), and its records are read at call time. The result is the
   * download payload itself — file name, media type and text — composed by both adapters through one
   * shared builder, so the same state yields the same file (AAP 0.12.3).
   */
  exportEvidencePack(): Promise<Result<ExportPayload>>;

  /**
   * Builds the scenario comparison for one exception as CSV: one column per option and one row per
   * measure, as the comparison matrix shows them (AAP 0.12.1 "Exports" row, contracts §11).
   * contracts §9: no HTTP path — it is built from the same solver output the matrix renders, so file
   * and screen cannot disagree (AAP 0.12.4 SCR-04); the result carries the CSV's file name and media
   * type beside the text, and both adapters share one builder (AAP 0.12.3).
   */
  exportScenarioComparison(exceptionId: ExceptionId): Promise<Result<ExportPayload>>;

  /**
   * Builds the chokepoint brief for download from the current market-intelligence pack: the JSON
   * payload whose top level carries `"simulated": true` (AAP 0.12.1 "Exports" row, contracts §11).
   * contracts §9: no HTTP path — every competitor figure in it carries the market-intelligence
   * provenance and its own label, so the export cannot be read as a first-party record (rules P-5,
   * P-1); the result carries the brief's file name and JSON media type. Both adapters compose it from
   * the atlas read, which publishes the pack's release label, so a client builds the same document
   * without reaching the seeded records (rule P-2, AAP 0.12.3).
   */
  exportChokepointBrief(): Promise<Result<ExportPayload>>;

  /**
   * Turns one demonstration trigger on or off: the seven screen states, the edited audit event or the
   * emptied exception queue (AAP 0.6.2, specification §8).
   * No HTTP counterpart — a deployment has no simulation flags, so the API client resolves this as a
   * no-op. The triggers are reachable only from the single simulation popover, labelled `Simulated
   * control` (rule P-4), and a trigger changes the adapter's behaviour, not a screen's branch.
   */
  setSimulation(flag: SimulationFlag, on: boolean): Promise<Result<true>>;

  /**
   * Restores the seeded state and clears every demonstration trigger, leaving the session as a first
   * visit found it. No HTTP counterpart — the API client resolves this as a no-op (AAP 0.6.2).
   * `Reset demo data` is the popover's own action rather than a flag: it changes what every read sees.
   */
  resetDemo(): Promise<Result<true>>;
}
