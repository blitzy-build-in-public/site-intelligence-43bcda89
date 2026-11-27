/**
 * The policy engine: one decision from an action, the acting persona and the records a rule reads,
 * for the four policies this workspace evaluates and the one it only declares.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §7.2 fixes the five policies, the identifier each is cited by and which
 *   of them is a rule rather than declared configuration; §7.1 fixes the permission matrix, which is
 *   a different question and is answered by `./permissions.ts`.
 * - AAP 0.12.1's "Domain core" row fixes this module's location, its public interface
 *   (`evaluate(action, actor, records): PolicyDecision`) and its treatment of each rule: POL-001,
 *   POL-003, POL-005 and POL-007 evaluated, POL-009 reaching `notApplicable` by design.
 * - AAP F7 and AAP 0.8 fix the outcome: a denial names the rule that caused it and gives its reason in
 *   plain words.
 * - AAP 0.6.3 and AAP 0.10 fix POL-001's empty allowed list, so every outbound endpoint is refused by
 *   a list the records declare rather than by a constant in this file.
 * - AAP 0.6.3, AAP 0.8 and AAP 0.12.4 (SCR-06) fix the block POL-007 places on an external model when
 *   the context carries material classified `customer-confidential` or material whose residency is
 *   `eu-only`, together with the in-boundary model as the permitted alternative the block card offers
 *   as a one-click switch.
 * - AAP 0.12.2 fixes POL-003's fact: an approval's requester is never eligible to decide it.
 * - AAP F7 and AAP 0.12.1 fix that POL-005 is evaluated too, and the policy record
 *   `src/seed/policies.ts` fixes its subject: a response option whose constraint check reports a
 *   breach is not sent for approval (AAP 0.12.2's validation rules, AAP 0.12.4 SCR-04).
 *
 * Pure, total and deterministic (AAP 0.2.1, AAP 0.18.2). The decision is a function of the three
 * arguments: no clock, no random source, no I/O, no mutable module state, no `throw` for an ordinary
 * input, and no write to `records`, which is read-only throughout. Each action is answered by the one
 * rule that governs it — POL-001 for an outbound endpoint, POL-003 for an approval decision, POL-005
 * for an approval request and POL-007 for an assistant question — so the same arguments always yield
 * the same decision, reason text included.
 *
 * A demonstration control, not production authorisation (rule P-3). These verdicts are computed in
 * the browser of a build with no backend, no sign-in and no session, exactly as `./permissions.ts`
 * states for the matrix. The mock adapter calls this engine itself before it touches a record, so
 * bypassing a disabled control gains nothing, and a deployment would evaluate the same rule in the
 * service that holds the data.
 *
 * One-way dependencies (rule P-2): this module imports the shared types and nothing else — no seed
 * record, no adapter, no React, no `src/domain` sibling. The rule text a reader sees on SCR-07 belongs
 * to the policy records; this module composes its own sentence from the policy identifier and the
 * facts it was handed, so it can never become a second source of that text.
 *
 * Rules this module is built to satisfy:
 * - P-4: POL-009 is declared configuration and is never evaluated; no reason below states that a
 *   policy prevents, establishes, resists or proves anything. The label that marks declared
 *   configuration as declared rather than verified belongs to the screen that shows it, is applied by a
 *   component there, and is deliberately absent from this module — rule P-1 likewise keeps every
 *   simulation label out of it.
 * - P-6: no figure, measure, currency value or threshold is typed here, and no record identifier of a
 *   plant, product, order, exception, approval or model: the engine compares identifiers it was handed
 *   with ones a record holds, and performs no arithmetic. The only literals it holds are the four policy
 *   identifiers its rules cite and the four record values its rules compare — the blocking
 *   classification and residency, the boundary of a model, and the constraint check a response option
 *   reports — each declared once so that no comparison and no consumer repeats one. POL-009, the fifth
 *   identifier contracts §7.2 fixes, is named by no predicate, because a lookup of it is answered
 *   without a verdict.
 * - P-5: nothing is summed or aggregated, so no verdict can blend a market-intelligence figure with a
 *   first-party one.
 * - P-7: every reason is user-visible prose built only from interpolated identifiers and record facts.
 * - P-8: a denial always carries both the rule and a non-empty reason, and carries the alternative
 *   where the rule that refused names one, which is what lets a control explain itself instead of
 *   merely refusing.
 * - B-1, B-2 and B-3: the module contacts nothing, holds no configuration and no credential, and
 *   writes reasons a screen can show as plain self-contained prose.
 *
 * RULE IDENTITY, RESOLVED. AAP 0.6.3 assigns both blocking conditions — material classified
 * `customer-confidential` and material whose residency is `eu-only` — to POL-007, and AAP 0.12.4
 * names the DOC-0031 block card as the POL-007 card, so this module denies a blocked question under
 * that one identifier rather than splitting the two conditions between rules. `platform-contracts.md`
 * §7.2 is not readable in this run and would be the only input able to move a condition to another
 * rule. POL-005 carries instead the response-option validation gate the policy record
 * `src/seed/policies.ts` states and AAP F7 evaluates: an option whose constraint check fails is not
 * sent for approval, and `decideApprovalRequest` below is that rule's one call site.
 * OPEN ITEM: AAP 0.12.1 lists `./permissions.ts` as this module's dependency, and it is not imported.
 * No predicate needs a permission lookup: who may request or decide, and who may ask the
 * assistant, are matrix cells the adapter evaluates through `hasPermission`, and
 * `Approval.eligibleApproverRoles` is that same matrix read from a record. Importing the matrix here
 * would create a second enforcement point for a question the adapter already owns — the reasoning
 * `./permissions.ts` records for own-vendor redaction — and the `actor` argument is read only for the
 * one fact POL-003 needs, the persona's identifier.
 * OPEN ITEM: `PolicyRecords` and `PolicyAction` are declared in this module rather than in
 * `src/types`, because `platform-contracts.md` defines no shape for either and AAP 0.12.1 fixes only
 * the function signature. `PolicyDecision`, `PolicyOutcome` and the entity types they compose come
 * from `src/types` unchanged; nothing here renames, widens or restates one of them.
 * OPEN ITEM: `Classification` and `Residency` are `string` aliases in `src/types`, so this module
 * cannot be exhaustive over their values. It names the two values POL-007 reads as module constants
 * and interprets no other value of either alias: a classification it does not name is not a blocking
 * condition here, which is why `contracts` §3's full member lists matter when they arrive.
 * OPEN ITEM: `PolicyDecision.policyId` is filled on an allow only where a rule's own condition is what
 * permitted the action — an endpoint on the allowed list, a persona that is not the requester, or a
 * response option whose constraint check passes. An assistant query is permitted by the absence of a
 * blocking condition rather than by one rule's permission, so its allow cites no rule and the member
 * is omitted under `exactOptionalPropertyTypes`.
 */

import type {
  ActiveUser,
  Approval,
  ApprovalId,
  Classification,
  ConstraintCheck,
  ModelBoundary,
  ModelCatalogue,
  ModelEntry,
  PolicyDecision,
  PolicyId,
  Residency,
  ScenarioId,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The four policy identifiers the rules cite — contracts §7.2
 * ------------------------------------------------------------------------------------------- */

/**
 * POL-001: a request to an endpoint outside this deployment is checked against the declared allowed
 * list before it is made — contracts §7.2.
 */
const POL_OUTBOUND_EGRESS: PolicyId = 'POL-001';

/** POL-003: an approval is decided by a persona other than the one who requested it. */
const POL_SEGREGATION_OF_DUTIES: PolicyId = 'POL-003';

/**
 * POL-005: a response option whose constraint check reports a breach is not sent for approval.
 *
 * AAP F7 and AAP 0.12.1 fix that this rule is evaluated, and the policy record `src/seed/policies.ts`
 * states its subject in the same terms — the check the solver runs before a plan is put forward
 * (AAP 0.12.2's validation rules, AAP 0.12.4 SCR-04). `decideApprovalRequest` below is that rule's
 * one call site, and the identifier is written once so no consumer repeats it.
 */
const POL_RESPONSE_OPTION_VALIDATION: PolicyId = 'POL-005';

/**
 * POL-007: material classified `customer-confidential`, or material whose residency is `eu-only`,
 * never reaches an external model — AAP 0.6.3, AAP 0.12.4 (SCR-06).
 *
 * One rule owns both blocking conditions, so a context carrying both is denied once under this
 * identifier rather than once under each of them.
 */
const POL_EXTERNAL_MODEL_BOUNDARY: PolicyId = 'POL-007';

/* ---------------------------------------------------------------------------------------------
 * The record values the rules compare — contracts §3, §7.2, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The classification that keeps material from an external model — contracts §3 and §7.2.
 *
 * Held as one constant because `Classification` is a `string` alias: the value POL-007 reads exists
 * once here rather than in each comparison, and no other classification is interpreted.
 */
const CUSTOMER_CONFIDENTIAL: Classification = 'customer-confidential';

/** The residency that confines material to the EU boundary — contracts §3, §7.2. */
const EU_ONLY_RESIDENCY: Residency = 'eu-only';

/**
 * The boundary of a model that processes inside the EU boundary — contracts §3, AAP 0.6.3.
 *
 * An `'external'` model is the one POL-007 can block, and an `'in-boundary'` one is the permitted
 * alternative a blocked question is offered instead.
 */
const IN_BOUNDARY: ModelBoundary = 'in-boundary';

/**
 * The constraint check a response option reports when the solver found no breach — `ConstraintCheck`
 * in `src/types`, read by POL-005.
 *
 * The option's check is a fact the caller states, so the engine reads which of the two values it
 * holds rather than measuring the option itself; the passing value is declared once here so no
 * comparison repeats it.
 */
const CONSTRAINT_PASSED: ConstraintCheck = 'pass';

/* ---------------------------------------------------------------------------------------------
 * The facts the rules read — AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The record facts the pure engine reads, handed in by the caller so the engine holds no state and
 * reaches for no record it was not given (rule P-2).
 *
 * Every member is a reference to records the adapter already holds: nothing is copied, and nothing is
 * written to, so a decision can be recomputed from the same records at any time.
 */
export interface PolicyRecords {
  /**
   * The declared outbound allowed list of POL-001 — contracts §7.2.
   *
   * The seeded configuration declares an empty list (AAP 0.6.3, AAP 0.10), so every endpoint is
   * refused, but the predicate is membership of this list rather than a constant in this file: a
   * record that declared an endpoint would permit it, and the ledger's blocked counts are computed
   * from records rather than asserted.
   */
  readonly outboundAllowedList: readonly string[];

  /**
   * The approvals in scope, so POL-003 can read both the requester and the identifier it reports.
   *
   * An approval the array does not hold yields `notApplicable`: an absent record is a not-found the
   * service reports, never a policy verdict.
   */
  readonly approvals: readonly Approval[];

  /**
   * The model catalogue of POL-007, each entry carrying the boundary that rule reads.
   *
   * It also supplies the permitted alternative a denial offers: the catalogue's own in-boundary model,
   * never an identifier written into this module.
   */
  readonly modelCatalogue: ModelCatalogue;
}

/* ---------------------------------------------------------------------------------------------
 * The actions a policy governs — AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * A request to an endpoint outside this deployment, the action POL-001 governs — contracts §7.2.
 */
export interface OutboundEndpointAction {
  /** Which policy question the action asks. */
  readonly action: 'outbound-endpoint';

  /** The endpoint the request would reach, as the record names it. */
  readonly endpoint: string;
}

/**
 * A decision on an approval, the action POL-003 governs — contracts §7.2 and AAP 0.12.2.
 */
export interface ApprovalDecisionAction {
  /** Which policy question the action asks. */
  readonly action: 'approval.decide';

  /** The approval the decision would be taken on. */
  readonly approvalId: ApprovalId;
}

/**
 * A request to send one response option for approval, the action POL-005 governs — AAP F7,
 * `src/seed/policies.ts`.
 *
 * The constraint check and the breaches it reports are facts the caller states, exactly as
 * `AssistantQueryContext` states the material a question carries: the engine reads the option's own
 * verdict rather than measuring the option, so it reaches for no scenario record and computes no
 * figure of its own.
 */
export interface ApprovalRequestAction {
  /** Which policy question the action asks. */
  readonly action: 'approval.request';

  /** The response option the request would send. */
  readonly scenarioId: ScenarioId;

  /** The option's constraint check, as the solver reported it. */
  readonly constraintCheck: ConstraintCheck;

  /** The breach messages that check reported, empty when it reported none. */
  readonly constraintMessages: readonly string[];
}

/**
 * The material context a question carries, as POL-007 reads it — contracts §3, §7.2.
 *
 * A `null` member means the context carries nothing of that kind, which is a fact the caller states
 * rather than one the engine infers from an absent member.
 */
export interface AssistantQueryContext {
  /** The highest classification among the documents the question carries, or `null` for none. */
  readonly classification: Classification | null;

  /** The strictest residency among those documents, or `null` for none. */
  readonly residency: Residency | null;
}

/**
 * A question put to the assistant, the action POL-007 governs — contracts §7.2, AAP 0.12.3.
 *
 * The model is named by identifier rather than passed as an entry, so the engine reads the boundary
 * from the catalogue at evaluation time and a caller cannot hand it a boundary the catalogue does not
 * declare.
 */
export interface AssistantQueryAction {
  /** Which policy question the action asks. */
  readonly action: 'assistant.query';

  /** The model the question would be sent to, as the catalogue identifies it. */
  readonly modelId: string;

  /** The material the question carries. */
  readonly context: AssistantQueryContext;
}

/**
 * A question about one policy, by identifier — the action that is never governed by a policy.
 *
 * It exists so a caller holding a policy identifier can ask the engine and receive an explicit
 * `notApplicable` instead of special-casing the declared policy outside it: POL-009 is declared
 * configuration the engine never evaluates (rule P-4), and every other policy is evaluated against an
 * action rather than read by identifier alone.
 */
export interface PolicyLookupAction {
  /** Which policy question the action asks. */
  readonly action: 'policy-lookup';

  /** The policy the question is about. */
  readonly policyId: PolicyId;
}

/**
 * One action a policy can govern, as a discriminated union so no fact is invented at a call site and
 * the engine narrows each member without a cast — AAP 0.12.1.
 *
 * Declared here rather than in `src/types`, because `platform-contracts.md` fixes no shape for an
 * action and AAP 0.12.1 fixes only the `evaluate` signature. An action no evaluated rule governs
 * yields `notApplicable` rather than a denial.
 */
export type PolicyAction =
  | OutboundEndpointAction
  | ApprovalDecisionAction
  | ApprovalRequestAction
  | AssistantQueryAction
  | PolicyLookupAction;

/* ---------------------------------------------------------------------------------------------
 * The four decisions a rule can reach — AAP 0.12.1, src/types/service.ts `PolicyDecision`
 * ------------------------------------------------------------------------------------------- */

/**
 * A permission reached by a rule whose own condition permitted the action.
 *
 * The rule identifier travels with the allow, so a caller can record which rule it satisfied. Used
 * only where that condition is the reason the action may proceed.
 *
 * @param rule The evaluated rule that permitted the action.
 * @returns The allow decision, naming the rule.
 */
function permitUnder(rule: PolicyId): PolicyDecision {
  return { outcome: 'allow', policyId: rule };
}

/**
 * A permission reached because no evaluated rule's condition fires at all.
 *
 * Returned for an action whose governing rules were read and found not to block — a question sent to
 * an in-boundary model, which never leaves the boundary, or to an external model whose context
 * carries neither blocking condition. `policyId` is deliberately absent rather than filled with a
 * rule that permitted nothing.
 *
 * @returns The allow decision, naming no rule.
 */
function permitWithoutRule(): PolicyDecision {
  return { outcome: 'allow' };
}

/**
 * A denial, carrying the rule that caused it, its reason in plain words, and the alternative the rule
 * permits where contracts §7.2 defines one.
 *
 * @param rule The evaluated rule whose condition fired.
 * @param reason The reason in plain words, beginning with the rule identifier so a tooltip or a block
 *   card can quote it (rules B-3, P-8).
 * @param permittedAlternative The identifier of the alternative the rule permits, when the rule names
 *   one. Omitted, not set to `undefined`, when it is absent (`exactOptionalPropertyTypes`).
 * @returns The denial decision.
 */
function denyUnder(
  rule: PolicyId,
  reason: string,
  permittedAlternative?: string,
): PolicyDecision {
  if (permittedAlternative === undefined) {
    return { outcome: 'deny', policyId: rule, reason };
  }

  return { outcome: 'deny', policyId: rule, reason, permittedAlternative };
}

/**
 * No evaluated rule governs the action, so no verdict is given and no reason is stated.
 *
 * A policy verdict is never a substitute for a not-found: a caller that handed an identifier no record
 * answers receives this, and the service produces its own `Problem` (AAP 0.12.1). It is also the
 * outcome of POL-009 by design.
 *
 * @returns The `notApplicable` decision.
 */
function notApplicable(): PolicyDecision {
  return { outcome: 'notApplicable' };
}

/* ---------------------------------------------------------------------------------------------
 * POL-001 — outbound egress — contracts §7.2, AAP 0.6.3 and 0.10
 * ------------------------------------------------------------------------------------------- */

/**
 * The reason POL-001 gives for refusing an endpoint — contracts §7.2, rule B-3.
 *
 * @param endpoint The endpoint the request would reach.
 * @returns One sentence naming the rule, the endpoint and the list that refused it.
 */
function outboundEgressReason(endpoint: string): string {
  return (
    `${POL_OUTBOUND_EGRESS}: a request to ${endpoint} is refused, because the declared outbound ` +
    `allowed list does not include that endpoint. The endpoint is not contacted.`
  );
}

/**
 * Decides a request to an endpoint outside this deployment — contracts §7.2 POL-001.
 *
 * The declared allowed list decides it: an endpoint the records permit is allowed under this rule,
 * and every other endpoint is denied with the rule and its reason. The predicate is membership of the
 * list rather than a constant here, so the seeded empty list and any later one are read from records
 * (AAP 0.10).
 *
 * @param action The endpoint the request would reach.
 * @param records The records holding the declared allowed list.
 * @returns An allow under POL-001, or a denial naming it.
 */
function decideOutboundEndpoint(
  action: OutboundEndpointAction,
  records: PolicyRecords,
): PolicyDecision {
  if (records.outboundAllowedList.includes(action.endpoint)) {
    return permitUnder(POL_OUTBOUND_EGRESS);
  }

  return denyUnder(POL_OUTBOUND_EGRESS, outboundEgressReason(action.endpoint));
}

/* ---------------------------------------------------------------------------------------------
 * POL-003 — segregation of duties — contracts §7.2, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The reason POL-003 gives when the acting persona requested the approval it would decide —
 * contracts §7.2, rule B-3.
 *
 * @param actor The persona acting.
 * @param approval The approval the decision is about.
 * @returns One or two sentences naming the rule, the approval, the requester and who may decide.
 */
function segregationOfDutiesReason(actor: ActiveUser, approval: Approval): string {
  return (
    `${POL_SEGREGATION_OF_DUTIES}: ${actor.id} requested approval ${approval.id}, and the persona ` +
    `who requested an approval cannot decide it. The decision has to be taken by another persona ` +
    `the approval names as eligible.`
  );
}

/**
 * Decides who may decide an approval — contracts §7.2 POL-003.
 *
 * The requester of an approval never decides it. An approval the records do not hold yields
 * `notApplicable`, because an absent record is a not-found the service reports rather than a policy
 * verdict. Eligibility itself is the permission matrix's question, evaluated by the adapter through
 * `hasPermission`; this rule answers the one fact it owns, whether the acting persona is the requester.
 *
 * @param action The approval the decision is about.
 * @param actor The persona acting.
 * @param records The records holding the approvals.
 * @returns An allow under POL-003 when another persona is deciding, a denial naming it when the
 *   requester is, or `notApplicable` when the approval is not among the records.
 */
function decideApprovalDecision(
  action: ApprovalDecisionAction,
  actor: ActiveUser,
  records: PolicyRecords,
): PolicyDecision {
  const approval: Approval | undefined = records.approvals.find(
    (candidate) => candidate.id === action.approvalId,
  );

  if (approval === undefined) {
    return notApplicable();
  }

  if (approval.requestedBy === actor.id) {
    return denyUnder(POL_SEGREGATION_OF_DUTIES, segregationOfDutiesReason(actor, approval));
  }

  return permitUnder(POL_SEGREGATION_OF_DUTIES);
}

/* ---------------------------------------------------------------------------------------------
 * POL-005 — response-option validation before approval — AAP F7, AAP 0.12.2, src/seed/policies.ts
 * ------------------------------------------------------------------------------------------- */

/**
 * The reason POL-005 gives for refusing to send a response option for approval — AAP F7, rule B-3.
 *
 * The breach is the solver's own message, joined where the check reports more than one, so the
 * refusal names the constraint the option breached rather than composing one here (rule P-6). A
 * check that failed without stating a breach says exactly that and names none: a constraint invented
 * for the sentence would be a fact nothing computed.
 *
 * @param action The option the request would send and the check it reports.
 * @returns Two sentences naming the rule, the option and the breach, and stating that the option is
 *   not approved.
 */
function responseOptionValidationReason(action: ApprovalRequestAction): string {
  const breaches = action.constraintMessages.join(' ');
  const failure =
    breaches === ''
      ? 'its constraint check fails, and the check states no breach of its own.'
      : `its constraint check fails: ${breaches}`;

  return (
    `${POL_RESPONSE_OPTION_VALIDATION}: response option ${action.scenarioId} is not sent for ` +
    `approval, because ${failure} An option whose constraint check fails is not approved.`
  );
}

/**
 * Decides whether a response option may be sent for approval — AAP F7, `src/seed/policies.ts`.
 *
 * The option's own constraint check decides it: a check that passes permits the request under
 * POL-005 and a check that fails denies it. The check and its messages are the caller's facts, read
 * exactly as the engine reads the material context a question carries, so this predicate reaches for
 * no scenario record and measures nothing.
 *
 * The rule names no alternative. An option that breached a constraint is corrected rather than
 * replaced, so the denial carries no `permittedAlternative` (rule P-8), and a caller that received
 * one would be offering a switch the rule does not make.
 *
 * @param action The option the request would send and the check it reports.
 * @returns An allow under POL-005 when the check passes, or a denial naming it when it fails.
 */
function decideApprovalRequest(action: ApprovalRequestAction): PolicyDecision {
  if (action.constraintCheck === CONSTRAINT_PASSED) {
    return permitUnder(POL_RESPONSE_OPTION_VALIDATION);
  }

  return denyUnder(POL_RESPONSE_OPTION_VALIDATION, responseOptionValidationReason(action));
}

/* ---------------------------------------------------------------------------------------------
 * POL-007 — the model boundary — AAP 0.6.3, AAP 0.12.4 (SCR-06)
 * ------------------------------------------------------------------------------------------- */

/**
 * The in-boundary model a blocked question is offered instead — contracts §7.2, AAP 0.12.4 (SCR-06).
 *
 * The catalogue's default entry is preferred when its boundary is `'in-boundary'`, and otherwise the
 * first in-boundary entry in catalogue order is taken, so the alternative a denial names is a model
 * the catalogue declares and the same one on every call. No identifier is written here: the
 * catalogue is the only source of one (rule P-6).
 *
 * @param catalogue The catalogue the caller supplied.
 * @returns The in-boundary entry, or `undefined` when the catalogue declares none.
 */
function inBoundaryModel(catalogue: ModelCatalogue): ModelEntry | undefined {
  const defaultModel: ModelEntry | undefined = catalogue.models.find(
    (entry) => entry.id === catalogue.defaultModelId,
  );

  if (defaultModel !== undefined && defaultModel.boundary === IN_BOUNDARY) {
    return defaultModel;
  }

  return catalogue.models.find((entry) => entry.boundary === IN_BOUNDARY);
}

/**
 * The blocking conditions a question's context carries, in plain words, or `undefined` for none.
 *
 * Both are facts the caller states on the context: the highest classification among the documents
 * the question carries and the strictest of their residencies. A context carrying both is described
 * as one condition list so the denial reports it once, under the single rule that blocks both
 * (AAP 0.6.3). `Classification` and `Residency` are `string` aliases, so a value this module does not
 * name is not a blocking condition here.
 *
 * @param context The material context the question carries.
 * @returns The conditions in plain words, joined where the context carries both, or `undefined` when
 *   it carries neither.
 */
function blockingContextOf(context: AssistantQueryContext): string | undefined {
  const carriesClassification = context.classification === CUSTOMER_CONFIDENTIAL;
  const carriesResidency = context.residency === EU_ONLY_RESIDENCY;

  if (carriesClassification && carriesResidency) {
    return (
      `material classified ${CUSTOMER_CONFIDENTIAL} and material whose residency is ` +
      `${EU_ONLY_RESIDENCY}`
    );
  }

  if (carriesClassification) {
    return `material classified ${CUSTOMER_CONFIDENTIAL}`;
  }

  if (carriesResidency) {
    return `material whose residency is ${EU_ONLY_RESIDENCY}`;
  }

  return undefined;
}

/**
 * The reason POL-007 gives for keeping a blocked context from an external model — AAP 0.6.3, rule B-3.
 *
 * The reason names the rule, the conditions the context actually carries and the model that cannot
 * answer it, and then states what the reader can do instead: the in-boundary model the catalogue
 * declares, or the fact that it declares none.
 *
 * @param carried The blocking conditions the context carries, as `blockingContextOf` words them.
 * @param model The external model the question named.
 * @param alternative The in-boundary model the rule permits, when the catalogue declares one.
 * @returns The reason in plain words, in two sentences.
 */
function externalModelBoundaryReason(
  carried: string,
  model: ModelEntry,
  alternative: ModelEntry | undefined,
): string {
  const block =
    `${POL_EXTERNAL_MODEL_BOUNDARY}: the context of this question carries ${carried}, so the ` +
    `external model ${model.id} cannot answer it.`;

  if (alternative === undefined) {
    return `${block} The model catalogue declares no in-boundary model to offer instead.`;
  }

  return `${block} The in-boundary model ${alternative.id} is the alternative this rule permits.`;
}

/**
 * Decides whether a question may be sent to the model it names — AAP 0.6.3, AAP 0.12.4 POL-007.
 *
 * The boundary comes from the catalogue, so a caller cannot declare one for a model. A model the
 * catalogue does not hold yields `notApplicable`, because an unknown model is a not-found the service
 * reports. An in-boundary model is allowed: the question never leaves the boundary, so the rule's
 * condition cannot fire. An external model is denied by POL-007 when the context carries material
 * classified `customer-confidential`, material whose residency is `eu-only`, or both — one rule, so a
 * context carrying both is denied once and the reason names the conditions it actually carries. The
 * denial carries the catalogue's in-boundary model as the permitted alternative, which is the
 * one-click switch AAP 0.12.4 gives the block card.
 *
 * @param action The model the question would be sent to and the material it carries.
 * @param records The records holding the model catalogue.
 * @returns An allow, a denial naming POL-007 with the alternative it permits, or `notApplicable` when
 *   the catalogue does not hold the model.
 */
function decideAssistantQuery(
  action: AssistantQueryAction,
  records: PolicyRecords,
): PolicyDecision {
  const model: ModelEntry | undefined = records.modelCatalogue.models.find(
    (entry) => entry.id === action.modelId,
  );

  if (model === undefined) {
    return notApplicable();
  }

  if (model.boundary === IN_BOUNDARY) {
    return permitWithoutRule();
  }

  const carried = blockingContextOf(action.context);

  if (carried === undefined) {
    return permitWithoutRule();
  }

  const alternative = inBoundaryModel(records.modelCatalogue);

  return denyUnder(
    POL_EXTERNAL_MODEL_BOUNDARY,
    externalModelBoundaryReason(carried, model, alternative),
    alternative?.id,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The decision — AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * Evaluates every rule that governs an action and returns the first decision it reaches —
 * contracts §7.2, AAP F7, AAP 0.12.1.
 *
 * Each action is answered by the rule that governs it: POL-001 for an outbound endpoint, POL-003 for
 * an approval decision, POL-005 for an approval request and POL-007 for an assistant question.
 * POL-009 is declared configuration and is never evaluated (rule P-4). An action no evaluated rule
 * governs yields `notApplicable` rather than a permission, and only a rule whose condition actually
 * fires returns a denial, so a caller can treat `notApplicable` as "ask the service" and `deny` as
 * "refuse with this rule and this reason".
 *
 * The arguments are read and never modified, and the result is a fresh object, so a denial can be
 * stored, logged or shown without reaching the records behind it.
 *
 * @param action The action to evaluate.
 * @param actor The persona acting, whose identifier POL-003 compares with an approval's requester.
 * @param records The facts the rules read, as the caller holds them.
 * @returns The decision: an allow, a denial naming the rule that fired with its reason in plain
 *   words, or `notApplicable` when no evaluated rule governs the action.
 */
export function evaluate(
  action: PolicyAction,
  actor: ActiveUser,
  records: PolicyRecords,
): PolicyDecision {
  switch (action.action) {
    case 'outbound-endpoint':
      return decideOutboundEndpoint(action, records);
    case 'approval.decide':
      return decideApprovalDecision(action, actor, records);
    case 'approval.request':
      return decideApprovalRequest(action);
    case 'assistant.query':
      return decideAssistantQuery(action, records);
    case 'policy-lookup':
      // A lookup asks what a policy says, never whether a rule governs an action, so the engine gives
      // no verdict for it. POL-009 is declared configuration it never evaluates (rule P-4, contracts
      // §7.2), and every other identifier names a policy read against an action a lookup does not
      // supply. The decision states a rule and a reason on a denial only, so no member could tell the
      // two cases apart and no branch on the identifier exists.
      return notApplicable();
    default: {
      // A member added to `PolicyAction` without a predicate lands here, where this assignment makes
      // the missing case a compile error rather than a silent outcome.
      const unhandled: never = action;
      return unhandled;
    }
  }
}
