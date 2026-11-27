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
 * - AAP 0.6.3, AAP 0.8 and AAP 0.12.4 (SCR-06) fix the block an external model meets, together with
 *   the in-boundary model as the permitted alternative the block card offers as a one-click switch.
 * - AAP 0.12.2 fixes POL-003's fact: an approval's requester is never eligible to decide it.
 *
 * Pure, total and deterministic (AAP 0.2.1, AAP 0.18.2). The decision is a function of the three
 * arguments: no clock, no random source, no I/O, no mutable module state, no `throw` for an ordinary
 * input, and no write to `records`, which is read-only throughout. The rules are evaluated in numeric
 * order — POL-001, then POL-003, then POL-005, then POL-007 — and the first condition that fires
 * decides, so the same arguments always yield the same decision, reason text included.
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
 *   with ones a record holds, and performs no arithmetic. The only literals it holds are the five policy
 *   identifiers contracts §7.2 fixes and the three record values its two model rules compare, each
 *   declared once so that no comparison and no consumer repeats one.
 * - P-5: nothing is summed or aggregated, so no verdict can blend a market-intelligence figure with a
 *   first-party one.
 * - P-7: every reason is user-visible prose built only from interpolated identifiers and record facts.
 * - P-8: a denial always carries both the rule and a non-empty reason, and carries the alternative
 *   where contracts §7.2 defines one, which is what lets a control explain itself instead of merely
 *   refusing.
 * - B-1, B-2 and B-3: the module contacts nothing, holds no configuration and no credential, and
 *   writes reasons a screen can show as plain self-contained prose.
 *
 * OPEN ITEM: AAP 0.6.3 attributes both blocking conditions — material classified
 * `customer-confidential` and material whose residency is `eu-only` — to POL-007, while the assigned
 * brief for this file binds POL-005 and POL-007 to the same external-model block. The split
 * implemented below is confidentiality to POL-005 and residency to POL-007. It is chosen so that a
 * context carrying either condition is always denied, so that neither rule is left unimplemented, and
 * so that the first condition to fire is the lower-numbered rule; a context carrying both is denied by
 * POL-005. `platform-contracts.md` §7.2 overrides this split the moment it is readable.
 * OPEN ITEM: `src/seed/policies.ts` records POL-005's subject as response-option constraint
 * validation before approval, which is a different subject from the confidential-context block this
 * module implements under that identifier. The seed's record cannot be read from here (rule P-2) and
 * cannot be consulted as a rule table, so the identifier's meaning for the engine is the one fixed by
 * this file; a supplied contracts §7.2 settles which subject POL-005 carries, and the seed and this
 * module are then corrected together.
 * OPEN ITEM: AAP 0.12.1 lists `./permissions.ts` as this module's dependency, and it is not imported.
 * The four predicates need no permission lookup: who may request or decide, and who may ask the
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
 * cannot be exhaustive over their values. It names the two values POL-005 and POL-007 read as module
 * constants and interprets no other value of either alias: a classification it does not name is not a
 * blocking condition here, which is why `contracts` §3's full member lists matter when they arrive.
 * OPEN ITEM: `PolicyDecision.policyId` is filled on an allow only where a rule's own condition is what
 * permitted the action — an endpoint on the allowed list, or a persona that is not the requester. An
 * assistant query is permitted by the absence of a blocking condition rather than by one rule's
 * permission, so its allow cites no rule and the member is omitted under `exactOptionalPropertyTypes`.
 */

import type {
  ActiveUser,
  Approval,
  ApprovalId,
  Classification,
  ModelBoundary,
  ModelCatalogue,
  ModelEntry,
  PolicyDecision,
  PolicyId,
  Residency,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The five policy identifiers — contracts §7.2
 * ------------------------------------------------------------------------------------------- */

/**
 * POL-001: a request to an endpoint outside this deployment is checked against the declared allowed
 * list before it is made — contracts §7.2.
 */
const POL_OUTBOUND_EGRESS: PolicyId = 'POL-001';

/** POL-003: an approval is decided by a persona other than the one who requested it. */
const POL_SEGREGATION_OF_DUTIES: PolicyId = 'POL-003';

/**
 * POL-005: material classified `customer-confidential` never reaches an external model — contracts §7.2.
 */
const POL_CONFIDENTIAL_CONTEXT: PolicyId = 'POL-005';

/** POL-007: material whose residency confines it never reaches an external model. */
const POL_EXTERNAL_MODEL_RESIDENCY: PolicyId = 'POL-007';

/**
 * POL-009: key custody is declared to sit with the customer.
 *
 * Declared configuration, not an evaluated rule: the engine never evaluates it and returns
 * `notApplicable` for it, and the sovereignty screen shows it under the fixed `Declared, not
 * verified` label (rule P-4). The identifier is declared here so that the one action which can name
 * it is answered without a second literal appearing anywhere else.
 */
const POL_CUSTOMER_HELD_KEYS: PolicyId = 'POL-009';

/* ---------------------------------------------------------------------------------------------
 * The record values the two model rules compare — contracts §3, §7.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The classification that keeps material from an external model — contracts §3 and §7.2.
 *
 * Held as one constant because `Classification` is a `string` alias: the value POL-005 reads exists
 * once here rather than in each comparison, and no other classification is interpreted.
 */
const CUSTOMER_CONFIDENTIAL: Classification = 'customer-confidential';

/** The residency that confines material to the EU boundary — contracts §3, §7.2. */
const EU_ONLY_RESIDENCY: Residency = 'eu-only';

/**
 * The boundary of a model that processes inside the EU boundary — contracts §3, AAP 0.6.3.
 *
 * An `'external'` model is the one POL-005 and POL-007 can block, and an `'in-boundary'` one is the
 * permitted alternative a blocked question is offered instead.
 */
const IN_BOUNDARY: ModelBoundary = 'in-boundary';

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
   * The model catalogue of POL-005 and POL-007, each entry carrying the boundary those rules read.
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
 * The material context a question carries, as POL-005 and POL-007 read it — contracts §3, §7.2.
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
 * A question put to the assistant, the action POL-005 and POL-007 govern — contracts §7.2, AAP 0.12.3.
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
 * POL-005 and POL-007 — the external model — contracts §7.2, AAP 0.6.3 and 0.12.4
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
 * The reason POL-005 gives for keeping classified material from an external model —
 * contracts §7.2, rule B-3.
 *
 * @param model The external model the question named.
 * @param alternative The in-boundary model the rule permits, when the catalogue declares one.
 * @returns The reason in plain words, naming the rule, the classification and the model, and stating
 *   what the reader can do instead.
 */
function confidentialContextReason(model: ModelEntry, alternative: ModelEntry | undefined): string {
  const block =
    `${POL_CONFIDENTIAL_CONTEXT}: the context of this question carries material classified ` +
    `${CUSTOMER_CONFIDENTIAL}, so the external model ${model.id} cannot answer it.`;

  if (alternative === undefined) {
    return `${block} The model catalogue declares no in-boundary model to offer instead.`;
  }

  return `${block} The in-boundary model ${alternative.id} is the alternative this rule permits.`;
}

/**
 * The reason POL-007 gives for keeping confined material from an external model — contracts §7.2,
 * rule B-3.
 *
 * @param model The external model the question named.
 * @param alternative The in-boundary model the rule permits, when the catalogue declares one.
 * @returns The reason in plain words, naming the rule, the residency and the model, and stating what
 *   the reader can do instead.
 */
function externalModelResidencyReason(
  model: ModelEntry,
  alternative: ModelEntry | undefined,
): string {
  const block =
    `${POL_EXTERNAL_MODEL_RESIDENCY}: the context of this question carries material whose residency ` +
    `is ${EU_ONLY_RESIDENCY}, so the external model ${model.id} cannot answer it.`;

  if (alternative === undefined) {
    return `${block} The model catalogue declares no in-boundary model to offer instead.`;
  }

  return `${block} The in-boundary model ${alternative.id} is the alternative this rule permits.`;
}

/**
 * Decides whether a question may be sent to the model it names — contracts §7.2 POL-005 and POL-007.
 *
 * The boundary comes from the catalogue, so a caller cannot declare one for a model. A model the
 * catalogue does not hold yields `notApplicable`, because an unknown model is a not-found the service
 * reports. An in-boundary model is allowed: the question never leaves the boundary, so no rule's
 * condition fires. An external model is denied by POL-005 when the context carries material
 * classified `customer-confidential`, and otherwise by POL-007 when the context carries material
 * whose residency is `eu-only`; the two conditions are tested in that order, so a context carrying
 * both is denied by the lower-numbered rule. Both denials carry the catalogue's in-boundary model as
 * the permitted alternative, which is the one-click switch AAP 0.12.4 gives the block card.
 *
 * @param action The model the question would be sent to and the material it carries.
 * @param records The records holding the model catalogue.
 * @returns An allow, a denial naming POL-005 or POL-007 with the alternative it permits, or
 *   `notApplicable` when the catalogue does not hold the model.
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

  if (action.context.classification === CUSTOMER_CONFIDENTIAL) {
    const alternative = inBoundaryModel(records.modelCatalogue);
    return denyUnder(
      POL_CONFIDENTIAL_CONTEXT,
      confidentialContextReason(model, alternative),
      alternative?.id,
    );
  }

  if (action.context.residency === EU_ONLY_RESIDENCY) {
    const alternative = inBoundaryModel(records.modelCatalogue);
    return denyUnder(
      POL_EXTERNAL_MODEL_RESIDENCY,
      externalModelResidencyReason(model, alternative),
      alternative?.id,
    );
  }

  return permitWithoutRule();
}

/* ---------------------------------------------------------------------------------------------
 * POL-009 — declared configuration, never evaluated — contracts §7.2, rule P-4
 * ------------------------------------------------------------------------------------------- */

/**
 * Answers a question about one policy by identifier — contracts §7.2.
 *
 * A lookup asks what a policy says, never whether a rule governs an action, so the engine gives no
 * verdict for it. Two cases reach this function and neither is a refusal: POL-009 is declared
 * configuration the engine never evaluates, so its answer is `notApplicable` by design, and every
 * other identifier names a policy that is read against an action rather than on its own, so its answer
 * is `notApplicable` for want of an action to evaluate. Declaring the declared policy explicitly keeps
 * the design decision in the code that answers it rather than only in this module's prose.
 *
 * @param action The policy the question is about.
 * @returns `notApplicable` in both cases; never a denial, and never a permission.
 */
function decidePolicyLookup(action: PolicyLookupAction): PolicyDecision {
  if (action.policyId === POL_CUSTOMER_HELD_KEYS) {
    // Declared configuration: a question about it is answered without a verdict rather than with a
    // permission, because the engine never evaluates it (rule P-4).
    return notApplicable();
  }

  // An evaluated policy is read against an action, and a lookup supplies none to read it against.
  return notApplicable();
}

/* ---------------------------------------------------------------------------------------------
 * The decision — AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * Evaluates every rule that governs an action and returns the first decision it reaches —
 * contracts §7.2, AAP F7, AAP 0.12.1.
 *
 * The rules are tried in numeric order: POL-001 for an outbound endpoint, POL-003 for an approval
 * decision, then POL-005 and POL-007 for an assistant question. POL-009 is declared configuration and
 * is never evaluated (rule P-4). An action no evaluated rule governs yields `notApplicable` rather
 * than a permission, and only a rule whose condition actually fires returns a denial, so a caller can
 * treat `notApplicable` as "ask the service" and `deny` as "refuse with this rule and this reason".
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
    case 'assistant.query':
      return decideAssistantQuery(action, records);
    case 'policy-lookup':
      return decidePolicyLookup(action);
    default: {
      // A member added to `PolicyAction` without a predicate lands here, where this assignment makes
      // the missing case a compile error rather than a silent outcome.
      const unhandled: never = action;
      return unhandled;
    }
  }
}
