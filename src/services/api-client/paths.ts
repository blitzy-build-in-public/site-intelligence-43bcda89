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
 * THE LIST AND THE PORT IT SERVES. Thirty-five distinct path entries follow, numbered 1 to 35 below
 * in the order of the members that serve them, and each is built from `API_BASE_PATH` alone, so
 * the `/api/v1` prefix AAP 0.6.3 and 0.12.3 require holds entry for entry. They serve the port's
 * thirty-six server-backed members: the port in `src/services/site-intelligence-service.ts`
 * declares forty-one, and five carry no path and take none here. `setSimulation(flag, on)` and
 * `resetDemo()` are demonstration controls with no server-side counterpart (AAP 0.6.2), and
 * `exportEvidencePack()`, `exportScenarioComparison(exceptionId)` and `exportChokepointBrief()`
 * assemble their payload in the browser and offer it as a download instead of sending a request
 * (contracts §11, AAP 0.12.1 "exports"). `approvalsPath` is the only entry two members share —
 * `listApprovals` reads that collection with `GET`, `requestApproval` posts to it — so thirty-six
 * members occupy thirty-five entries. No entry is invented to reach a round count, and no member
 * is left without one.
 *
 * AAP'S THIRTY-FOUR AND THIS FILE'S THIRTY-FIVE. AAP 0.6.3 ("Backend HTTP API"), 0.12.1 ("API
 * client" row) and 0.12.3 each state that contracts §9 fixes thirty-four paths — "against the 34
 * paths of contracts §9", "paths.ts holds the 34 path constants", "ApiClient implements all 34
 * paths" — and this file holds thirty-five. AAP 0.13.1's tree comment and 0.15.1 repeat the
 * figure, and 0.17 records contracts §9 itself as "the 34 API paths", so the plan states
 * thirty-four consistently. The gap is not closed by trimming. AAP 0.12.3 also names S4/S5
 * conformance endpoints this port omits on purpose — among them the binder manifest,
 * the supplier profile and the material profile, which the port's own OPEN ITEM records and
 * explains — so the plan's set and this set differ structurally; and contracts §9 and §2 are
 * absent from this checkout and from the whole run, so no entry's presence or absence can be
 * checked against the document that fixes it. Both figures stand as their source states them, and
 * every claim in this header is one this file and its suite can be checked against.
 *
 * HOW EACH PATH WAS FIXED. Nine entries are transcribed character for character from the paths AAP
 * 0.12.3 tabulates: `/approvals`, for both of its methods, `/approvals/{id}/decision`,
 * `/assistant/queries`, `/evidence`, `/documents/{id}`, `/audit-events/verify`,
 * `/market-intelligence/atlas`, `/exceptions/{id}/scenarios/solve` and `/topology`. The other
 * twenty-six are derived from their member's family and name in the style those nine follow —
 * kebab-case plural collection segments, an `{id}` segment for one record and a sub-resource
 * segment for an action — and derivation is the only provenance each has, stated in its own TSDoc
 * on every one of the twenty-six.
 *
 * WHAT REVERSES THIS. A supplied contracts §9 — or §2, which types the members these entries
 * serve — settles both the count and each derived entry: that document decides whether
 * thirty-five is the right number, which derived path is spelled differently, and which entry has
 * no member behind it. Until one is supplied no entry here may be called verbatim, and the count
 * in this header is this file's own rather than the plan's.
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
 * §9 path 1 — `GET` `/overview`, derived from the family's aggregate read. Family: overview. Serves
 * `getOverview(scope)`.
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
 * §9 path 2 — `GET` `/exceptions`, derived from the family's collection segment. Family: exceptions.
 * Serves `listExceptions(query, scope)`.
 *
 * `limit`, `cursor`, `sort` and the queue's filters travel as query parameters built by the request
 * module, never as part of this path. The list is narrowed to the acting persona's plant scope and
 * gated by `exception.read`.
 */
export const exceptionsPath = `${API_BASE_PATH}/exceptions`;

/**
 * §9 path 3 — `GET` `/exceptions/{id}`, derived: one record of the collection above. Family:
 * exceptions. Serves `getExceptionDetail(exceptionId)`. Gated by `exception.read`.
 */
export function exceptionPath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}`;
}

/**
 * §9 path 4 — `GET` `/exceptions/{id}/affected-lines`, derived: the record segment of path 3 plus
 * the read's own sub-resource. Serves `getAffectedLines(exceptionId)`. Gated by `exception.read`.
 */
export function exceptionAffectedLinesPath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/affected-lines`;
}

/**
 * §9 path 5 — `PATCH` `/exceptions/{id}/assignee`, derived: the assignee is the exception's
 * sub-resource that the write replaces. Serves `assignException(exceptionId, ownerId)`, which
 * carries the new owner in the body rather than in the path. Gated by `exception.work`.
 */
export function exceptionAssigneePath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/assignee`;
}

/**
 * §9 path 6 — `POST` `/exceptions/{id}/notes`, derived: a note is appended to the exception's own
 * collection of notes. Serves `noteException(exceptionId, note)`. Gated by `exception.work`.
 */
export function exceptionNotesPath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/notes`;
}

/**
 * §9 path 7 — `POST` `/exceptions/{id}/dismissal`, derived in the shape of the approval decision of
 * path 12: an action on one record whose body carries why. Serves
 * `dismissException(exceptionId, reason)`. Gated by `exception.work`.
 */
export function exceptionDismissalPath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/dismissal`;
}

/* ---------------------------------------------------------------------------------------------
 * Scenarios — specification SCR-04, platform-contracts.md §4
 * ------------------------------------------------------------------------------------------- */

/**
 * §9 path 8 — `GET` `/exceptions/{id}/scenarios`, derived: the option set of one exception. Serves
 * `getScenarioSet(exceptionId)`. Gated by `exception.read`, the permission the exception's own
 * record requires.
 */
export function exceptionScenariosPath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/scenarios`;
}

/**
 * §9 path 9 — `POST` `/exceptions/{id}/scenarios/solve`, transcribed from AAP 0.12.3. The sandbox
 * read: a lever outside its constraint returns a scenario whose constraint check fails rather than a
 * refusal. Serves `solveScenario(exceptionId, levers)`. Gated by `scenario.create` (AAP 0.12.3).
 */
export function exceptionScenarioSolvePath(exceptionId: ExceptionId): string {
  return `${API_BASE_PATH}/exceptions/${encodeSegment(exceptionId)}/scenarios/solve`;
}

/* ---------------------------------------------------------------------------------------------
 * Approvals — specification SCR-05, port members `listApprovals` to `reviewApprovalOutcome`
 * ------------------------------------------------------------------------------------------- */

/**
 * §9 path 10 — `GET` and `POST` `/approvals`, the approvals collection, transcribed from AAP 0.12.3
 * for both methods. Serves two port members: `listApprovals(query, scope)` reads it, narrowed by the
 * acting persona's plant scope and by the status in its query; `requestApproval(request)` posts to
 * it, gated by `approval.request`. A collection with two methods is one path, so this is the single
 * entry those two members share, and it is why thirty-six members occupy thirty-five paths.
 */
export const approvalsPath = `${API_BASE_PATH}/approvals`;

/**
 * §9 path 11 — `GET` `/approvals/{id}`, derived: one approval of the collection above. Serves
 * `getApproval(approvalId)`. The read is narrowed to the acting persona's plant scope.
 */
export function approvalPath(approvalId: ApprovalId): string {
  return `${API_BASE_PATH}/approvals/${encodeSegment(approvalId)}`;
}

/**
 * §9 path 12 — `POST` `/approvals/{id}/decision`, transcribed from AAP 0.12.3. Serves
 * `decideApproval(approvalId, decision)`, which carries the action and its comment in the body.
 * Gated by `approval.decide`, and POL-003 is evaluated before the decision is recorded.
 */
export function approvalDecisionPath(approvalId: ApprovalId): string {
  return `${API_BASE_PATH}/approvals/${encodeSegment(approvalId)}/decision`;
}

/**
 * §9 path 13 — `POST` `/approvals/{id}/outcome-review`, derived in the shape of the decision above:
 * the record that the plan's figures were read against the resulting ones. Serves
 * `reviewApprovalOutcome(approvalId)`, whose body carries nothing, because both sides of the
 * comparison are computed by the adapter from the records it holds.
 */
export function approvalOutcomeReviewPath(approvalId: ApprovalId): string {
  return `${API_BASE_PATH}/approvals/${encodeSegment(approvalId)}/outcome-review`;
}

/* ---------------------------------------------------------------------------------------------
 * Audit — specification SCR-05, platform-contracts.md §6
 * ------------------------------------------------------------------------------------------- */

/**
 * §9 path 14 — `GET` `/audit-events`, derived from the family's collection segment. Serves
 * `listAuditEvents(query)`, whose filters and page travel as query parameters. Gated by
 * `audit.read`; the chain is not plant-scoped, so this path takes no scope.
 */
export const auditEventsPath = `${API_BASE_PATH}/audit-events`;

/**
 * §9 path 15 — `GET` `/audit-events/verify`, transcribed from AAP 0.12.3. Serves
 * `verifyAuditChain()`, which takes no parameter: the events verified are the ones the adapter
 * holds. Gated by `audit.read`.
 */
export const auditEventsVerifyPath = `${API_BASE_PATH}/audit-events/verify`;

/* ---------------------------------------------------------------------------------------------
 * Evidence assistant — specification SCR-06 and SCR-11, platform-contracts.md §10
 * ------------------------------------------------------------------------------------------- */

/**
 * §9 path 16 — `GET` `/models`, derived from the models family AAP 0.12.3 names for the model
 * catalogue. Serves `getModelCatalogue()`, the assistant selector's read. Carried for conformance
 * with the stage that shows the catalogue, so no §7.1 permission is asserted on it here.
 */
export const modelsPath = `${API_BASE_PATH}/models`;

/**
 * §9 path 17 — `POST` `/assistant/queries`, transcribed from AAP 0.12.3. Serves
 * `askAssistant(query)`, which carries the question, the chosen model and the context records in the
 * body so POL-007 can evaluate them before an answer is composed. Gated by `evidence.read`.
 */
export const assistantQueriesPath = `${API_BASE_PATH}/assistant/queries`;

/* ---------------------------------------------------------------------------------------------
 * Governance — specification SCR-07, platform-contracts.md §7
 * ------------------------------------------------------------------------------------------- */

/**
 * §9 path 18 — `GET` `/sovereignty`, derived from the governance family's declared-configuration
 * record. Serves `getSovereigntyStatus()`. Gated by `sovereignty.read`, and every field it returns
 * describes declared configuration rather than a checked state (rule P-4).
 */
export const sovereigntyPath = `${API_BASE_PATH}/sovereignty`;

/**
 * §9 path 19 — `GET` `/sovereignty/outbound-ledger`, derived as the sub-resource of the record
 * above. Serves `getOutboundLedger()`, whose counts are computed from audit events. Gated by
 * `sovereignty.read`.
 */
export const sovereigntyOutboundLedgerPath = `${API_BASE_PATH}/sovereignty/outbound-ledger`;

/**
 * §9 path 20 — `GET` `/policies`, derived from the family's collection segment. Serves
 * `listPolicies()`. Gated by `policy.read`.
 */
export const policiesPath = `${API_BASE_PATH}/policies`;

/**
 * §9 path 21 — `GET` `/policies/{id}`, derived: one policy of the collection above. Serves
 * `getPolicy(policyId)`. Gated by `policy.read`.
 */
export function policyPath(policyId: PolicyId): string {
  return `${API_BASE_PATH}/policies/${encodeSegment(policyId)}`;
}

/**
 * §9 path 22 — `POST` `/policies/{id}/exceptions`, derived: the time-boxed exceptions requested
 * against one policy. Serves `requestPolicyException(request)`, whose body carries the reason, the
 * expiry and the second approver. Gated by `policy.exception.request`.
 */
export function policyExceptionsPath(policyId: PolicyId): string {
  return `${API_BASE_PATH}/policies/${encodeSegment(policyId)}/exceptions`;
}

/* ---------------------------------------------------------------------------------------------
 * Evidence and documents — PR-6 and specification §5, platform-contracts.md §8
 * ------------------------------------------------------------------------------------------- */

/**
 * §9 path 23 — `GET` `/evidence`, transcribed from AAP 0.12.3. Serves `getEvidence(ref)`, where
 * `ref` is the reference the element carries: it travels as a query parameter added by the request
 * module rather than as part of this path. Gated by `evidence.read`.
 */
export const evidencePath = `${API_BASE_PATH}/evidence`;

/**
 * §9 path 24 — `GET` `/documents/{id}`, transcribed from AAP 0.12.3. Serves
 * `getDocument(documentId)`. Gated by `evidence.read`, and by `document.confidential.read` for a body
 * classified customer-confidential, which the adapter withholds rather than returning empty.
 */
export function documentPath(documentId: DocumentId): string {
  return `${API_BASE_PATH}/documents/${encodeSegment(documentId)}`;
}

/**
 * §9 path 25 — `GET` `/evidence-pins`, derived from the family's collection segment. Serves
 * `listPins()`, narrowed by the adapter to the pins the acting persona may see. Gated by
 * `evidence.read`.
 */
export const evidencePinsPath = `${API_BASE_PATH}/evidence-pins`;

/**
 * §9 path 26 — `POST` `/evidence-pins/{id}/review`, derived in the shape of the approval decision of
 * path 12: an action on one record. Serves `reviewPin(pinId, state)`. Gated by `evidence.review`.
 */
export function evidencePinReviewPath(pinId: EvidencePinId): string {
  return `${API_BASE_PATH}/evidence-pins/${encodeSegment(pinId)}/review`;
}

/* ---------------------------------------------------------------------------------------------
 * Part approval packages — stage S4 surfaces, carried for interface conformance (AAP 0.12.3)
 * ------------------------------------------------------------------------------------------- */

/**
 * §9 path 27 — `GET` `/packages`, derived from the packages family AAP 0.12.3 names. Serves
 * `listPackages()`. Gated by `evidence.read`.
 */
export const packagesPath = `${API_BASE_PATH}/packages`;

/**
 * §9 path 28 — `GET` `/packages/{id}`, derived: one package of the collection above. Serves
 * `getPackage(packageId)`. Gated by `evidence.read`.
 */
export function packagePath(packageId: PackageId): string {
  return `${API_BASE_PATH}/packages/${encodeSegment(packageId)}`;
}

/**
 * §9 path 29 — `POST` `/package-elements/review`, derived as a collection-level action: the review
 * names its package and element in the body, so an element is not addressed as a record of its own
 * here and this path cannot be mistaken for a package identifier. Serves `reviewElement(review)`.
 * Gated by `evidence.review`; the adapter re-runs the evidence rules over the package once the
 * review is recorded.
 */
export const packageElementReviewPath = `${API_BASE_PATH}/package-elements/review`;

/* ---------------------------------------------------------------------------------------------
 * Identifier search — specification §5.1, port member `searchIdentifiers`
 * ------------------------------------------------------------------------------------------- */

/**
 * §9 path 30 — `GET` `/search`, derived from the member name, because AAP 0.12.3 tabulates no search
 * family; the port's own header records that specification §5.1 requires this read and that its
 * response type is the search hit the plan fixes. Serves `searchIdentifiers(term, scope)`, whose
 * term and selection travel as query parameters. Narrowed by the acting persona's plant scope.
 */
export const searchPath = `${API_BASE_PATH}/search`;

/* ---------------------------------------------------------------------------------------------
 * FileMap canvas — specification §6 and SCR-12
 * ------------------------------------------------------------------------------------------- */

/**
 * §9 path 31 — `GET` `/topology`, transcribed from AAP 0.12.3. Serves `getTopology(scope)`, and the
 * per-node pin counts travel with the payload. Gated by `exception.read`, within the reach left by
 * the caller's selection and the acting persona's plant scope.
 */
export const topologyPath = `${API_BASE_PATH}/topology`;

/* ---------------------------------------------------------------------------------------------
 * Competitive atlas — specification SCR-13, rule P-5
 * ------------------------------------------------------------------------------------------- */

/**
 * §9 path 32 — `GET` `/market-intelligence/atlas`, transcribed from AAP 0.12.3. Serves `getAtlas()`,
 * whose payload keeps the client's series and the competitors' series apart. Gated by
 * `competitive.read`.
 */
export const atlasPath = `${API_BASE_PATH}/market-intelligence/atlas`;

/* ---------------------------------------------------------------------------------------------
 * Catalogue reads carried for interface conformance — stage S5 (AAP 0.12.3)
 * ------------------------------------------------------------------------------------------- */

/**
 * §9 path 33 — `GET` `/sources`, derived from the sources family AAP 0.12.3 names. Serves
 * `getSourceCatalogue()`. Carried for conformance with the stage that shows the sources workspace,
 * so no §7.1 permission is asserted on it here.
 */
export const sourcesPath = `${API_BASE_PATH}/sources`;

/**
 * §9 path 34 — `GET` `/plants/{id}/plan`, derived from the plan-grid family: the plan of one plant,
 * which is the shape the application's own route for that screen takes. Serves
 * `getPlanGrid(plantId)`. Carried for conformance with the stage that shows the plan, so no §7.1
 * permission is asserted on it here.
 */
export function plantPlanGridPath(plantId: PlantId): string {
  return `${API_BASE_PATH}/plants/${encodeSegment(plantId)}/plan`;
}

/**
 * §9 path 35 — `GET` `/exit-package`, derived from the exit-package family AAP 0.12.3 names. Serves
 * `getExitPackage()`. Carried for conformance with the stage that assembles the package, so no §7.1
 * permission is asserted on it here.
 */
export const exitPackagePath = `${API_BASE_PATH}/exit-package`;

/* ---------------------------------------------------------------------------------------------
 * The five members with no entry here — AAP 0.6.2 and contracts §11
 * ------------------------------------------------------------------------------------------- */

/*
 * `setSimulation`, `resetDemo`, `exportEvidencePack`, `exportScenarioComparison` and
 * `exportChokepointBrief` have no entry above: the first two are demonstration controls and the last
 * three build their payload in the browser. `api-client.ts` answers all five without a request, which
 * is the reason it needs no path for them.
 */

