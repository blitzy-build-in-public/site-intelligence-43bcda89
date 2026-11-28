/**
 * The path vocabulary of the second adapter of the service port: the API path constants that
 * `api-client.ts` and the request module beside it build their calls from, fixed by
 * `platform-contracts.md` §9 and named as one of the adapter's three files by AAP 0.12.1
 * ("API client" row), 0.12.3, 0.13.1 and 0.13.2 ("Contract surface").
 *
 * Every entry is a path relative to `API_BASE_PATH`, stated once below and the only root an entry
 * here can have. None names an origin, a scheme, a host or a port, and none can acquire one, because
 * each is a template over that single constant: the adapter's target is fixed by this file rather
 * than by a value a caller supplies (rule B-1). Nothing here is configuration either — the base is a
 * code constant, and no entry reads an environment value (rule B-2).
 *
 * THE LIST AND THE PORT IT SERVES. Forty distinct path entries follow, labelled "Entry 1 of 40" to
 * "Entry 40 of 40" in the order of the members that serve them, and each is built from
 * `API_BASE_PATH` alone, so the `/api/v1` prefix AAP 0.6.3 and 0.12.3 require holds entry for entry.
 * The port in `src/services/site-intelligence-service.ts` declares forty-six members, and five of
 * them carry no HTTP counterpart and take no entry here: `setSimulation(flag, on)` and `resetDemo()`
 * are demonstration controls with no server-side counterpart (AAP 0.6.2), and
 * `exportEvidencePack()`, `exportScenarioComparison(exceptionId)` and `exportChokepointBrief()`
 * assemble their payload in the browser and offer it as a download instead of sending a request
 * (contracts §11, AAP 0.12.1 "exports"). Forty-one members are therefore server-backed, and they
 * occupy the forty entries below because `approvalsPath` is the one entry two members share —
 * `listApprovals` reads that collection with `GET`, `requestApproval` posts to it — so no entry is
 * dead and no member is left without one.
 *
 * AAP'S THIRTY-FOUR AND THIS FILE'S FORTY. AAP 0.6.3 ("Backend HTTP API"), 0.12.1 ("API client"
 * row) and 0.12.3 each state that contracts §9 fixes thirty-four paths — "against the 34 paths of
 * contracts §9", "paths.ts holds the 34 path constants", "ApiClient implements all 34 paths" — and
 * 0.13.1's tree comment and 0.15.1 repeat the figure, while 0.17 records contracts §9 itself as
 * "the 34 API paths". The plan's set is therefore forty-one server-backed members over
 * thirty-four paths, which takes seven pairs of members to share a resource; this file shares one
 * pair, the approvals collection, so it holds forty entries. The six entries the plan's thirty-four
 * does not account for are `canvasRibbonPath`, `auditEventPath`, `approvalOutcomePath`,
 * `approvalWriteBackRetryPath`, `assistantQuestionsPath` and the shared `approvalsPath`: the first
 * five serve capabilities the specification names without a §9 member beside them — SCR-12's ribbon,
 * SCR-05's audit detail read, its outcome card and its write-back retry, and SCR-06's suggested
 * questions — and the sixth is the collection two members share. Neither figure is retired here, and
 * neither is resolved by this file alone: trimming an entry would strand the member behind it
 * (rule P-2), and re-spelling one would invent a path no input defines (AAP 0.1). A supplied
 * contracts §9 — or §2, which types the members these entries serve — settles both, deciding
 * whether forty is the right number, which derived path is spelled differently, and which entry has
 * no member behind it.
 *
 * HOW EACH PATH WAS FIXED. Nine entries are transcribed character for character from the paths AAP
 * 0.12.3 tabulates: `/approvals`, for both of its methods, `/approvals/{id}/decision`,
 * `/assistant/queries`, `/evidence`, `/documents/{id}`, `/audit-events/verify`,
 * `/market-intelligence/atlas`, `/exceptions/{id}/scenarios/solve` and `/topology`. The other
 * thirty-one are derived from their member's family and name in the style those nine follow —
 * kebab-case plural collection segments, an `{id}` segment for one record and a sub-resource
 * segment for an action — and derivation is the only provenance each has, stated in its own TSDoc
 * on every one of the thirty-one.
 *
 * QUERY PARAMETERS ARE NOT PART OF A PATH. `limit`, `cursor`, `sort=field:dir` and every filter are
 * added by the request module from its typed inputs (AAP 0.12.3), and the evidence read's `ref` is a
 * parameter as well, so no entry below carries a query separator or a fragment and no caller can
 * append one.
 *
 * THIS MODULE IS A LEAF. It imports the identifier aliases of `src/types/primitives.ts` for typing
 * and nothing else, and it is imported by the two sibling files of its own folder and by no screen
 * (rule P-2). It names no record identifier and no figure (rule P-6), holds no display string, and
 * states nothing about what the records behind these paths establish (rule P-4).
 */

import type {
  ApprovalId,
  AuditEventId,
  DocumentId,
  EvidencePinId,
  ExceptionId,
  PackageId,
  PlantId,
  PolicyId,
} from '../../types/primitives';

/* ---------------------------------------------------------------------------------------------
 * The root — the only target this adapter can address, and it is a path
 * ------------------------------------------------------------------------------------------- */

/**
 * The root every entry below is built from. A path, not an address: it holds no scheme, no host and
 * no port, so a request built from it can only reach the origin that served the application
 * (rule B-1). Requests are relative to it rather than to a configured base, which is why the
 * application needs no configuration at all (rule B-2).
 */
export const API_BASE_PATH = '/api/v1' as const;

/**
 * Percent-encodes one identifier for use as a path segment, so a value holding a separator, a space
 * or a character outside the unreserved set cannot alter the shape of a path or append a segment of
 * its own. Every parameterised entry below goes through it, which is why none concatenates a
 * caller's value into a path directly.
 */
function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

/* ---------------------------------------------------------------------------------------------
 * Overview — specification SCR-01, port member `getOverview`
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 1 of 40 — `GET` `/overview` — derived from the overview family's aggregate read; no §9
 * entry is transcribed for it. Family: overview. Serves `getOverview(scope)`.
 *
 * The figures the read returns are computed by the adapter over the exceptions the acting persona's
 * plant scope admits, and `exception.read` is the §7.1 permission that gates those records.
 */
export const overviewPath = `${API_BASE_PATH}/overview`;

/* ---------------------------------------------------------------------------------------------
 * Exceptions — specification SCR-02 and SCR-03, port members `listExceptions` to
 * `dismissException`
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 2 of 40 — `GET` `/exceptions` — derived from the exceptions family's collection segment; no
 * §9 entry is transcribed for it. Family: exceptions. Serves `listExceptions(query, scope)`.
 *
 * `limit`, `cursor`, `sort` and the queue's filters travel as query parameters built by the request
 * module, never as part of this path. The list is narrowed to the acting persona's plant scope and
 * gated by `exception.read`.
 */
export const exceptionsPath = `${API_BASE_PATH}/exceptions`;

/**
 * Entry 3 of 40 — `GET` `/exceptions/{id}` — derived: one record of the collection above; no §9
 * entry is transcribed for it. Family: exceptions. Serves `getExceptionDetail(exceptionId)`. Gated
 * by `exception.read`.
 */
export function exceptionPath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}`;
}

/**
 * Entry 4 of 40 — `GET` `/exceptions/{id}/affected-lines` — derived: the record segment of entry 3
 * plus the read's own sub-resource; no §9 entry is transcribed for it. Serves
 * `getAffectedLines(exceptionId)`. Gated by `exception.read`.
 */
export function exceptionAffectedLinesPath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/affected-lines`;
}

/**
 * Entry 5 of 40 — `POST` `/exceptions/{id}/assignee` — derived: the assignee is the exception's
 * sub-resource that the write sets, and the new owner travels in the body rather than in the path;
 * no §9 entry is transcribed for it. Serves `assignException(exceptionId, ownerId)`. Gated by
 * `exception.work`.
 */
export function exceptionAssigneePath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/assignee`;
}

/**
 * Entry 6 of 40 — `POST` `/exceptions/{id}/notes` — derived: a note is appended to the exception's
 * own collection of notes; no §9 entry is transcribed for it. Serves `noteException(exceptionId,
 * note)`. Gated by `exception.work`.
 */
export function exceptionNotesPath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/notes`;
}

/**
 * Entry 7 of 40 — `POST` `/exceptions/{id}/dismissal` — derived in the shape of the approval
 * decision of entry 12: an action on one record whose body carries why; no §9 entry is transcribed
 * for it. Serves `dismissException(exceptionId, reason)`. Gated by `exception.work`.
 */
export function exceptionDismissalPath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/dismissal`;
}

/* ---------------------------------------------------------------------------------------------
 * Scenarios — specification SCR-04, platform-contracts.md §4
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 8 of 40 — `GET` `/exceptions/{id}/scenarios` — derived: the option set of one exception; no
 * §9 entry is transcribed for it. Serves `getScenarioSet(exceptionId)`. Gated by `exception.read`,
 * the permission the exception's own record requires.
 */
export function exceptionScenariosPath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/scenarios`;
}

/**
 * Entry 9 of 40 — `POST` `/exceptions/{id}/scenarios/solve` — quoted verbatim by AAP 0.12.3. The
 * sandbox read: a lever outside its constraint returns a scenario whose constraint check fails rather
 * than a refusal. Serves `solveScenario(exceptionId, levers)`. Gated by `scenario.create`
 * (AAP 0.12.3).
 */
export function exceptionScenarioSolvePath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/scenarios/solve`;
}

/* ---------------------------------------------------------------------------------------------
 * Approvals — specification SCR-05, port members `listApprovals` to `reviewApprovalOutcome`
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 10 of 40 — `POST` `/approvals` — quoted verbatim by AAP 0.12.3, and the same collection
 * answers `GET`. Serves two port members: `listApprovals(query, scope)` reads it, narrowed by the
 * acting persona's plant scope and by the status in its query; `requestApproval(request)` posts to
 * it, gated by `approval.request`. A collection with two methods is one path, so this is the single
 * entry those two members share, and it is why forty-one members occupy forty entries.
 */
export const approvalsPath = `${API_BASE_PATH}/approvals`;

/**
 * Entry 11 of 40 — `GET` `/approvals/{id}` — derived: one approval of the collection above; no §9
 * entry is transcribed for it. Serves `getApproval(approvalId)`. The read is narrowed to the acting
 * persona's plant scope.
 */
export function approvalPath(approvalId: ApprovalId): string {
  return `${API_BASE_PATH}/approvals/${encodeSegment(approvalId)}`;
}

/**
 * Entry 12 of 40 — `POST` `/approvals/{id}/decision` — quoted verbatim by AAP 0.12.3. Serves
 * `decideApproval(approvalId, decision)`, which carries the action and its comment in the body.
 * Gated by `approval.decide`, and POL-003 is evaluated before the decision is recorded.
 */
export function approvalDecisionPath(approvalId: ApprovalId): string {
  return `${API_BASE_PATH}/approvals/${encodeSegment(approvalId)}/decision`;
}

/**
 * Entry 13 of 40 — `POST` `/approvals/{id}/outcome-review` — derived in the shape of the decision
 * above: the record that the plan's figures were read against the resulting ones; no §9 entry is
 * transcribed for it. Serves `reviewApprovalOutcome(approvalId)`, whose body carries nothing,
 * because both sides of the comparison are computed by the adapter from the records it holds.
 */
export function approvalOutcomeReviewPath(approvalId: ApprovalId): string {
  return `${API_BASE_PATH}/approvals/${encodeSegment(approvalId)}/outcome-review`;
}

/* ---------------------------------------------------------------------------------------------
 * Audit — specification SCR-05, platform-contracts.md §6
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 14 of 40 — `GET` `/audit-events` — derived from the audit family's collection segment; no
 * §9 entry is transcribed for it. Serves `listAuditEvents(query)`, whose filters and page travel as
 * query parameters. Gated by `audit.read`; the chain is not plant-scoped, so this path takes no
 * scope.
 */
export const auditEventsPath = `${API_BASE_PATH}/audit-events`;

/**
 * Entry 15 of 40 — `GET` `/audit-events/verify` — quoted verbatim by AAP 0.12.3. Serves
 * `verifyAuditChain()`, which takes no parameter: the events verified are the ones the adapter
 * holds. Gated by `audit.read`.
 */
export const auditEventsVerifyPath = `${API_BASE_PATH}/audit-events/verify`;

/* ---------------------------------------------------------------------------------------------
 * Evidence assistant — specification SCR-06 and SCR-11, platform-contracts.md §10
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 16 of 40 — `GET` `/models` — derived from the models family AAP 0.12.3 names for the model
 * catalogue; no §9 entry is transcribed for it. Serves `getModelCatalogue()`, the assistant
 * selector's read. Carried for conformance with the stage that shows the catalogue, so no §7.1
 * permission is asserted on it here.
 */
export const modelsPath = `${API_BASE_PATH}/models`;

/**
 * Entry 17 of 40 — `POST` `/assistant/queries` — quoted verbatim by AAP 0.12.3. Serves
 * `askAssistant(query)`, which carries the question, the chosen model and the context records in the
 * body so POL-007 can evaluate them before an answer is composed. Gated by `evidence.read`.
 */
export const assistantQueriesPath = `${API_BASE_PATH}/assistant/queries`;

/* ---------------------------------------------------------------------------------------------
 * Governance — specification SCR-07, platform-contracts.md §7
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 18 of 40 — `GET` `/sovereignty` — derived from the governance family's
 * declared-configuration record; no §9 entry is transcribed for it. Serves
 * `getSovereigntyStatus()`. Gated by `sovereignty.read`, and every field it returns describes
 * declared configuration rather than a checked state (rule P-4).
 */
export const sovereigntyPath = `${API_BASE_PATH}/sovereignty`;

/**
 * Entry 19 of 40 — `GET` `/sovereignty/outbound-ledger` — derived as the sub-resource of the record
 * above; no §9 entry is transcribed for it. Serves `getOutboundLedger(query)`, whose counts are
 * computed from audit events and whose page and order travel as query parameters. Gated by
 * `sovereignty.read`.
 */
export const sovereigntyOutboundLedgerPath = `${API_BASE_PATH}/sovereignty/outbound-ledger`;

/**
 * Entry 20 of 40 — `GET` `/policies` — derived from the policies family's collection segment; no
 * §9 entry is transcribed for it. Serves `listPolicies(query)`, whose page and order travel as
 * query parameters. Gated by `policy.read`.
 */
export const policiesPath = `${API_BASE_PATH}/policies`;

/**
 * Entry 21 of 40 — `GET` `/policies/{id}` — derived: one policy of the collection above; no §9
 * entry is transcribed for it. Serves `getPolicy(policyId)`. Gated by `policy.read`.
 */
export function policyPath(policyId: PolicyId): string {
  return `${API_BASE_PATH}/policies/${encodeSegment(policyId)}`;
}

/**
 * Entry 22 of 40 — `POST` `/policies/{id}/exceptions` — derived: the time-boxed exceptions
 * requested against one policy; no §9 entry is transcribed for it. Serves
 * `requestPolicyException(request)`, whose body carries the reason, the expiry and the second
 * approver. Gated by `policy.exception.request`.
 */
export function policyExceptionsPath(policyId: PolicyId): string {
  return `${API_BASE_PATH}/policies/${encodeSegment(policyId)}/exceptions`;
}

/* ---------------------------------------------------------------------------------------------
 * Evidence and documents — PR-6 and specification §5, platform-contracts.md §8
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 23 of 40 — `GET` `/evidence` — quoted verbatim by AAP 0.12.3. Serves `getEvidence(ref)`,
 * where `ref` is the reference the element carries: it travels as a query parameter added by the
 * request module rather than as part of this path. Gated by `evidence.read`.
 */
export const evidencePath = `${API_BASE_PATH}/evidence`;

/**
 * Entry 24 of 40 — `GET` `/documents/{id}` — quoted verbatim by AAP 0.12.3. Serves
 * `getDocument(documentId)`. Gated by `evidence.read`, and by `document.confidential.read` for a body
 * classified customer-confidential, which the adapter withholds rather than returning empty.
 */
export function documentPath(documentId: DocumentId): string {
  return `${API_BASE_PATH}/documents/${encodeSegment(documentId)}`;
}

/**
 * Entry 25 of 40 — `GET` `/evidence-pins` — derived from the evidence-pins family's collection
 * segment; no §9 entry is transcribed for it. Serves `listPins(query)`, narrowed by the adapter to
 * the pins the acting persona may see, with its page and order travelling as query parameters.
 * Gated by `evidence.read`.
 */
export const evidencePinsPath = `${API_BASE_PATH}/evidence-pins`;

/**
 * Entry 26 of 40 — `POST` `/evidence-pins/{id}/review` — derived in the shape of the approval
 * decision of entry 12: an action on one record; no §9 entry is transcribed for it. Serves
 * `reviewPin(pinId, state)`. Gated by `evidence.review`.
 */
export function evidencePinReviewPath(pinId: EvidencePinId): string {
  return `${API_BASE_PATH}/evidence-pins/${encodeSegment(pinId)}/review`;
}

/* ---------------------------------------------------------------------------------------------
 * Part approval packages — stage S4 surfaces, carried for interface conformance (AAP 0.12.3)
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 27 of 40 — `GET` `/packages` — derived from the packages family AAP 0.12.3 names; no §9
 * entry is transcribed for it. Serves `listPackages(query)`, whose page and order travel as query
 * parameters. Gated by `evidence.read`.
 */
export const packagesPath = `${API_BASE_PATH}/packages`;

/**
 * Entry 28 of 40 — `GET` `/packages/{id}` — derived: one package of the collection above; no §9
 * entry is transcribed for it. Serves `getPackage(packageId)`. Gated by `evidence.read`.
 */
export function packagePath(packageId: PackageId): string {
  return `${API_BASE_PATH}/packages/${encodeSegment(packageId)}`;
}

/**
 * Entry 29 of 40 — `POST` `/package-elements/review` — derived as a collection-level action: the
 * review names its package and element in the body, so an element is not addressed as a record of its
 * own here and this path cannot be mistaken for a package identifier; no §9 entry is transcribed for
 * it. Serves `reviewElement(review)`. Gated by `evidence.review`; the adapter re-runs the evidence
 * rules over the package once the review is recorded.
 */
export const packageElementReviewPath = `${API_BASE_PATH}/package-elements/review`;

/* ---------------------------------------------------------------------------------------------
 * Identifier search — specification §5.1, port member `searchIdentifiers`
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 30 of 40 — `GET` `/search` — derived from the member name, because AAP 0.12.3 tabulates no
 * search family: the port's own header records that specification §5.1 requires this read and that
 * its response type is the search hit the plan fixes, and no §9 entry is transcribed for it. Serves
 * `searchIdentifiers(term, scope)`, whose term and selection travel as query parameters. Narrowed by
 * the acting persona's plant scope.
 */
export const searchPath = `${API_BASE_PATH}/search`;

/* ---------------------------------------------------------------------------------------------
 * FileMap canvas — specification §6 and SCR-12
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 31 of 40 — `GET` `/topology` — quoted verbatim by AAP 0.12.3. Serves `getTopology(scope)`,
 * and the per-node pin counts travel with the payload. Gated by `exception.read`, within the reach
 * left by the caller's selection and the acting persona's plant scope.
 */
export const topologyPath = `${API_BASE_PATH}/topology`;

/* ---------------------------------------------------------------------------------------------
 * Competitive atlas — specification SCR-13, rule P-5
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 32 of 40 — `GET` `/market-intelligence/atlas` — quoted verbatim by AAP 0.12.3. Serves
 * `getAtlas()`, whose payload keeps the client's series and the competitors' series apart. Gated by
 * `competitive.read`.
 */
export const atlasPath = `${API_BASE_PATH}/market-intelligence/atlas`;

/* ---------------------------------------------------------------------------------------------
 * Catalogue reads carried for interface conformance — stage S5 (AAP 0.12.3)
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 33 of 40 — `GET` `/sources` — derived from the sources family AAP 0.12.3 names; no §9
 * entry is transcribed for it. Serves `getSourceCatalogue()`. Carried for conformance with the
 * stage that shows the sources workspace, so no §7.1 permission is asserted on it here.
 */
export const sourcesPath = `${API_BASE_PATH}/sources`;

/**
 * Entry 34 of 40 — `GET` `/plants/{id}/plan` — derived from the plan-grid family: the plan of one
 * plant, which is the shape the application's own route for that screen takes; no §9 entry is
 * transcribed for it. Serves `getPlanGrid(plantId)`. Carried for conformance with the stage that
 * shows the plan, so no §7.1 permission is asserted on it here.
 */
export function plantPlanGridPath(plantId: PlantId): string {
  return `${API_BASE_PATH}/plants/${encodeSegment(plantId)}/plan`;
}

/**
 * Entry 35 of 40 — `GET` `/exit-package` — derived from the exit-package family AAP 0.12.3 names;
 * no §9 entry is transcribed for it. Serves `getExitPackage()`. Carried for conformance with the
 * stage that assembles the package, so no §7.1 permission is asserted on it here.
 */
export const exitPackagePath = `${API_BASE_PATH}/exit-package`;

/* ---------------------------------------------------------------------------------------------
 * The port's last five members, entries 36 to 40 — derived, not transcribed
 * ------------------------------------------------------------------------------------------- */

/**
 * Entry 36 of 40 — `GET` `/topology/ribbon` — derived: the sub-resource of entry 31 that carries
 * the six computed tiles of SCR-12's ribbon beside the topology they summarise; no §9 entry is
 * transcribed for it. Serves `getCanvasRibbon(scope)`, whose selection travels as query parameters.
 * Gated by `exception.read` within the reach left by that selection and by the acting persona's
 * plant scope, exactly as entry 31 is; each tile's value is a computed aggregate and carries
 * `Simulated calculation` where the tile is rendered (rule P-1).
 */
export const canvasRibbonPath = `${API_BASE_PATH}/topology/ribbon`;

/**
 * Entry 37 of 40 — `GET` `/audit-events/{id}` — derived: one event of the collection entry 14
 * lists, with the before and after payloads the audit detail drawer shows; no §9 entry is
 * transcribed for it. Serves `getAuditEvent(auditEventId)`. Gated by `audit.read`, and the chain is
 * not plant-scoped, so this read takes no scope; an identifier the chain does not hold is refused as
 * a not-found rather than answered with an empty event.
 */
export function auditEventPath(auditEventId: AuditEventId): string {
  return `${API_BASE_PATH}/audit-events/${encodeSegment(auditEventId)}`;
}

/**
 * Entry 38 of 40 — `GET` `/approvals/{id}/outcome` — derived: the comparison the review of entry 13
 * records a reading of, split out because SCR-05's outcome card reads it before anyone confirms it;
 * no §9 entry is transcribed for it. Serves `getApprovalOutcome(approvalId)`. Both sides of the
 * comparison are computed by the service from the records it holds, so the call carries no body and
 * no parameter beyond this path.
 */
export function approvalOutcomePath(approvalId: ApprovalId): string {
  return `${API_BASE_PATH}/approvals/${encodeSegment(approvalId)}/outcome`;
}

/**
 * Entry 39 of 40 — `POST` `/approvals/{id}/write-backs/{writeBackId}/retry` — derived in the shape
 * of the decision of entry 12: an action on one step of the change the approval set in motion,
 * addressed by the reference that step writes; no §9 entry is transcribed for it. Serves
 * `retryWriteBack(approvalId, writeBackId)`, whose body carries nothing because the step and its
 * state are the service's to read. AAP 0.2.2 fixes the behaviour behind the path: a retry
 * re-attempts a failed step and never writes one that already succeeded, so a step's success record
 * cannot be duplicated. Gated by `approval.decide`, the permission the decision and the outcome
 * review share.
 */
export function approvalWriteBackRetryPath(approvalId: ApprovalId, writeBackId: string): string {
  return `${API_BASE_PATH}/approvals/${encodeSegment(approvalId)}/write-backs/${encodeSegment(
    writeBackId,
  )}/retry`;
}

/**
 * Entry 40 of 40 — `GET` `/assistant/questions` — derived: the collection of questions the
 * assistant panel offers, beside the queries collection of entry 17 they are submitted to; no §9
 * entry is transcribed for it. Serves `listSuggestedQuestions()`. Gated by `evidence.read`, the
 * permission every read of the assistant family requires; only each question's identifier and prompt
 * cross the boundary, because an answer's outline, template and citations belong to the answer
 * itself (rule P-6).
 */
export const assistantQuestionsPath = `${API_BASE_PATH}/assistant/questions`;

/* ---------------------------------------------------------------------------------------------
 * The five members with no entry here — AAP 0.6.2 and contracts §11
 * ------------------------------------------------------------------------------------------- */

/*
 * `setSimulation`, `resetDemo`, `exportEvidencePack`, `exportScenarioComparison` and
 * `exportChokepointBrief` have no entry above: the first two are demonstration controls and the last
 * three build their payload in the browser. `api-client.ts` answers all five without a request of their
 * own, which is the reason it needs no path for them: the exports are composed from reads that do have
 * entries above.
 */

