/**
 * Core entity types of `platform-contracts.md` §3: the record vocabulary the seed modules hold,
 * the solver and the aggregations measure, the mock adapter and its handlers serve, the
 * unconnected API client would request, and the screens of stages S1 to S3 display.
 *
 * Fixed verbatim by contracts §3 and copied without alteration (AAP 0.1, AAP 0.12.2): `Role`,
 * `Severity`, `ExceptionType`, `ExceptionStatus`, `FreshnessState`, `Confidence`, `PinState`,
 * `Classification`, `Residency`, `Provenance`, `Freshness`, `Evidence`, `AffectedLine`,
 * `OperationalException`, `Levers`, `OrderResult`, `Scenario`, `SideEffect`, `WriteBack`,
 * `Rejected`, `ScenarioSet`, `Approval`, `AuditEvent`, `ChainReport`, `PpapElement`, `PpapPackage`
 * and `EvidencePin`. The contracts' `SimLabel` is declared once in `./primitives`, beside the seven
 * label strings it is derived from, so this module imports it rather than restating a label.
 *
 * Declared here from the input that consumes each one, because contracts §2 and §3 name them
 * without defining them (AAP 0.12.2): `ConfidenceLevel`, `ScenarioOrigin`, `WriteBackState`,
 * `ApprovalStatus`, `DecisionAction`, `Decision` and `ActiveUser`.
 *
 * The folder's single cycle in the import graph, accepted rather than treated as a defect. This
 * module imports `SolverResult` from `./solver`, and `./solver` imports `Levers`, `OrderResult`,
 * `SideEffect`, `WriteBack` and `Confidence` from here, because a scenario carries its own
 * identity — the exception it belongs to, its name, its origin — while the solver owns its
 * measures (AAP 0.12.1). Every cross-import on both sides is `import type` under
 * `verbatimModuleSyntax`, and both modules declare types only — no value, no function, no
 * constant — so those edges are erased at compile time and no runtime cycle can exist while that
 * holds. Extracting the shared shapes into a third module is declined: it would move contracts §3
 * declarations out of the module that owns the entity vocabulary and away from the `Scenario` and
 * `Approval` records that carry them (AAP 0.12.1, AAP 0.12.2).
 *
 * This module declares shapes and never values (rule P-6). Every numeric member is a slot the
 * solver, an aggregation or a seed record fills; no threshold, amount, count, date or identifier
 * value is written here. Collections are plain mutable arrays, because the mock adapter holds the
 * demonstration's records in memory and replaces members in place (AAP 0.2.1, AAP 0.12.1).
 *
 * Rules this module is built to satisfy:
 * - P-2: it imports `./primitives`, `./audit`, `./packages` and `./solver` and nothing else — no
 *   seed record, no adapter, no service, no React — so it cannot become a second data boundary.
 * - P-5: `Provenance` separates a first-party or computed value from a market-intelligence one,
 *   and no interface below carries both in a single numeric member.
 * - P-1: `Evidence.label` is typed `SimLabel`, and `Scenario.origin` is what marks a seeded
 *   scenario so the comparison matrix labels its column `Simulated data` (AAP 0.10).
 * - P-4: the audit records below describe an append-only hash chain and claim nothing beyond that
 *   mechanism, which the interface labels `Simulated control`.
 *
 * Vocabularies the contracts name without enumerating stay open or derived, never closed:
 * `ExceptionType`, `Classification` and `Residency` remain `string` aliases, `Severity`'s levels
 * beyond SCR-01's quoted `critical` follow the urgency ordering AAP 0.12.1 fixes, `ConfidenceLevel`
 * supplies the level of the pair AAP 0.12.4 fixes, and `ScenarioOrigin`, `WriteBackState` and
 * `ApprovalStatus` follow the behaviour AAP 0.10 and AAP 0.2.2 fix. A closed union in any of them
 * would invent a member or reject a legitimate seed record at compile time.
 */

import type {
  ApprovalId,
  AuditEventId,
  CustomerOrderId,
  DocumentId,
  EvidencePinId,
  ExceptionId,
  IsoDate,
  LineId,
  MaterialId,
  Money,
  PackageId,
  Permission,
  PlantId,
  PolicyId,
  ProductId,
  PurchaseOrderId,
  ScenarioId,
  SimLabel,
  SourceId,
  SupplierId,
  Timestamp,
  UserId,
} from './primitives';
import type {
  AuditAction,
  AuditActorType,
  AuditPayload,
  AuditResult,
  ChainBreak,
} from './audit';
import type { EvidenceRuleId } from './packages';
import type { SolverResult } from './solver';

/* ---------------------------------------------------------------------------------------------
 * A. Closed vocabularies the inputs enumerate
 * ------------------------------------------------------------------------------------------- */

/**
 * The eight personas of specification §3, one role per seeded user (`USR-01` to `USR-08`).
 *
 * The role selects the permission set and plant scope the mock adapter enforces (contracts §7.1)
 * and the home route the router sends the visitor to, so it is the single key to both what a
 * persona may do and where the demonstration opens for them.
 */
export type Role =
  | 'material-planner'
  | 'plant-manager'
  | 'head-of-supply-chain'
  | 'platform-administrator'
  | 'production-planner'
  | 'auditor'
  | 'supplier-quality-engineer'
  | 'external-supplier-engineer';

/**
 * The six states an evidence pin reports, fixed by contracts §3.
 *
 * `StatusIndicator`'s `meaningOf` helper maps them onto the shared status meanings (AAP 0.5.2):
 * pass to pass, fail to fail, stale to warning, pending to warning with the clock icon, review to
 * review and empty to empty. There is no second pin vocabulary and no second indicator.
 */
export type PinState = 'empty' | 'pending' | 'pass' | 'fail' | 'stale' | 'review';

/**
 * Where a value came from, fixed by contracts §3 and enumerated by AAP 0.8 and 0.12.2.
 *
 * Rule P-5 governs every use: market intelligence is never blended with a first-party record in
 * one number. No aggregate may sum a `first_party` or `computed` value with a
 * `market_intelligence` one, which is why the atlas draws each series separately and the provenance
 * of a series travels with the series itself.
 */
export type Provenance = 'first_party' | 'computed' | 'market_intelligence';

/**
 * How urgently an exception needs a response.
 *
 * `critical` is quoted by SCR-01's "Review critical exceptions"; the levels around it are the ones
 * the urgency ordering of AAP 0.12.1 ranks on.
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Where an exception stands, fixed by contracts §5's "open exceptions" tile and open/resolved
 * series, and by SCR-02's dismiss-with-a-reason row action (AAP 0.12.4).
 */
export type ExceptionStatus = 'open' | 'resolved' | 'dismissed';

/**
 * The state of one data source's contribution, as the six freshness pills report it.
 *
 * `stale` and `unavailable` gate `requestApproval` and `decideApproval`: the service refuses both
 * with a `Problem` naming the source and its as-of time, and every screen offering those actions
 * renders the stale banner and disables the controls with the same reason (AAP 0.2.1, T-13).
 * `partial` covers a source that answered incompletely, so a figure derived from it is shown with
 * its missing inputs rather than as a complete reading.
 */
export type FreshnessState = 'fresh' | 'stale' | 'partial' | 'unavailable';

/**
 * How much confidence a computed figure, a scenario or a package carries.
 *
 * The level travels with a reason, never alone: SCR-04's comparison matrix shows the confidence
 * with the sentence that explains it, while the three level names are derived (AAP 0.12.4).
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/* ---------------------------------------------------------------------------------------------
 * B. Vocabularies the inputs name without enumerating — documented open aliases
 * ------------------------------------------------------------------------------------------- */

/**
 * The kind of operational exception an exception record is.
 *
 * The fixing input is contracts §3, which names `ExceptionType` without listing its members; the
 * inputs quote the supply delay of `EXC-2026-1184` and the quality hold of `EXC-2026-1190`. The
 * alias therefore stays open rather than becoming a union with an invented member that would
 * reject a legitimate seed record at compile time.
 */
export type ExceptionType = string;

/**
 * How sensitive a document is, as the classification it carries.
 *
 * The fixing input is contracts §3, which names `Classification` without listing its members; the
 * inputs quote `customer-confidential`, whose body never crosses the service boundary for USR-04,
 * and `eu-only`. POL-007 blocks the external reasoning model when the assistant's context carries
 * either (AAP 0.6.3). The alias stays open rather than narrowed to an invented member that would
 * reject a legitimate seed record.
 */
export type Classification = string;

/**
 * Where a document's content may be processed.
 *
 * The fixing input is contracts §3, which names `Residency` without listing its members; the input
 * quotes the EU processing boundary, `eu-only`, which POL-007 also uses to block the external
 * reasoning model (AAP 0.6.3). The alias stays open rather than narrowed to an invented member that
 * would reject a legitimate seed record.
 */
export type Residency = string;

/* ---------------------------------------------------------------------------------------------
 * C. Primitive-carrying entities
 * ------------------------------------------------------------------------------------------- */

/**
 * How much confidence a figure carries, with the reason it carries it.
 *
 * The reason is required, not optional, because SCR-04 shows the two together: a level without its
 * sentence would leave a planner unable to judge an option (AAP 0.12.4).
 */
export interface Confidence {
  /** The level of confidence. */
  level: ConfidenceLevel;

  /** The plain-language reason for that level, as the record states it. */
  reason: string;
}

/**
 * One data source's contribution, as the six freshness pills read it.
 *
 * AAP 0.12.2 fixes the three members: the source, the instant it was read, and its state. The
 * adapter returns a freshness array in the `meta` of every result, which is what a screen reads to
 * raise its stale banner (AAP 0.2.1, 0.12.3).
 */
export interface Freshness {
  /** Which of the six sources this record describes. */
  source: SourceId;

  /** When that source last answered, an instant in the application's time zone. */
  asOf: Timestamp;

  /** How current the source's contribution is. */
  state: FreshnessState;
}

/**
 * The evidence behind one displayed figure: what a reader reaches when they open the evidence
 * drawer from a value, a chart mark, a node, an arc or a pin.
 *
 * AAP 0.12.2 fixes all ten members — the value, its provenance, its simulation label, the formula
 * it came from, the inputs and the records upstream and downstream of it, its confidence, the
 * inputs it is missing, and the documents behind it. That is the drawer's four sections in typed
 * form, and every figure reaching a screen carries one (PR-6).
 *
 * `label` is a `SimLabel`, so the element carries its exact specification §5.3 string rather than
 * a paraphrased one (rule P-1), and `provenance` keeps a market-intelligence reading separate from
 * a first-party one (rule P-5).
 */
export interface Evidence {
  /** The displayed value, already formatted by the module that computed it. */
  value: string;

  /** Where the value came from, which decides whether it may be combined with another. */
  provenance: Provenance;

  /** The exact simulation label the element must carry. */
  label: SimLabel;

  /** The formula or rule that produced the value, stated plainly. */
  formula: string;

  /** The record values that fed the formula. */
  inputs: string[];

  /** The records the value depends on. */
  upstream: string[];

  /** The records and figures that depend on the value. */
  downstream: string[];

  /** How much confidence the value carries, with its reason. */
  confidence: Confidence;

  /** The inputs the computation could not read, so the reader can judge the gap. */
  missingInputs: string[];

  /** The documents behind the value, each `DOC-nnnn`. */
  documents: DocumentId[];
}

/**
 * One customer order line an exception puts at risk.
 *
 * AAP 0.12.2 fixes the five members and the invariant that matters: affected lines are the only
 * input to revenue at risk, which the aggregate computes as `unitsAtRisk` multiplied by the
 * product's price. The exception carrying a solver case takes its lines from the baseline solve
 * rather than from a stored figure, so no revenue value lives here.
 */
export interface AffectedLine {
  /** The customer order whose line is affected. */
  orderId: CustomerOrderId;

  /** The product that order covers. */
  productId: ProductId;

  /** The plant that has to ship it. */
  plantId: PlantId;

  /** The date the customer was promised. */
  dueDate: IsoDate;

  /** The units of that line the exception places at risk. */
  unitsAtRisk: number;
}

/**
 * One evidence pin: a reviewable claim attached to a node of the FileMap canvas.
 *
 * AAP 0.12.2 fixes the four members — the pin's identifier, the node it belongs to, its state, and
 * optionally the vendor it concerns. The vendor member exists because USR-08 sees only its own
 * vendor's pins, a restriction the adapter applies before the record crosses the boundary
 * (AAP 0.6.2). S2 draws the counts per node; the pin screens themselves belong to stage S4.
 */
export interface EvidencePin {
  /** The pin's identifier, the `PIN-` prefix followed by its own key. */
  id: EvidencePinId;

  /** The node the pin is attached to, as the topology's node identifiers spell it. */
  nodeRef: string;

  /** The pin's review state, which is what a canvas badge counts. */
  state: PinState;

  /** The vendor the pin concerns, where the pin belongs to a supplier's own evidence. */
  vendorId?: SupplierId;
}

/* ---------------------------------------------------------------------------------------------
 * D. Exception, solver hand-off and scenario entities
 * ------------------------------------------------------------------------------------------- */

/**
 * One operational exception: what changed, where it hurts, who owns it, and how far it can travel.
 *
 * AAP 0.12.2 fixes the record — type, severity, status, plant and also-affects plants, material,
 * supplier, purchase order, line, owner, days to impact, affected lines, `solverCaseId`, missing
 * inputs and confidence — with `id` and `title` taken from SCR-02's table columns and
 * `whatChanged` from SCR-03's "What changed" card (AAP 0.8 quotes the field by name). No revenue
 * figure is stored here: revenue at risk is computed from `affectedLines` by
 * `src/domain/aggregation/exceptions.ts` (rule P-6).
 */
export interface OperationalException {
  /** The exception's identifier, `EXC-2026-nnnn`. */
  id: ExceptionId;

  /** The one-line title the queue and the ribbon show. */
  title: string;

  /** The kind of exception this is. */
  type: ExceptionType;

  /** How urgently it needs a response, which the queue sorts on first. */
  severity: Severity;

  /** Where the exception stands: open, resolved or dismissed with a reason. */
  status: ExceptionStatus;

  /** The plant the disruption lands on. */
  plantId: PlantId;

  /** The further plants it reaches, which the queue's plant filter also matches. */
  alsoAffectsPlantIds: PlantId[];

  /** The material whose supply is disturbed. */
  materialId: MaterialId;

  /** The supplier the material comes from. */
  supplierId: SupplierId;

  /** The purchase order carrying the delay, `PO-nnnnnnnn`. */
  purchaseOrderId: PurchaseOrderId;

  /** The production line that consumes the material. */
  lineId: LineId;

  /** The persona accountable for the exception. */
  ownerId: UserId;

  /** Working days until the impact reaches a customer order; the queue sorts on it second. */
  daysToImpact: number;

  /** The customer order lines at risk, the only input to revenue at risk. */
  affectedLines: AffectedLine[];

  /** The solver case the comparison screen measures options against, where one exists. */
  solverCaseId?: string;

  /** The inputs the impact assessment could not read, shown beside the confidence. */
  missingInputs: string[];

  /** How much confidence the assessment carries, with its reason. */
  confidence: Confidence;

  /** The plain-language account of what changed, as the record states it. */
  whatChanged: string;

  /**
   * When the exception was detected: SCR-02's age column counts from it and SCR-03's activity
   * history ends at it. No contracts §3 row names this member, so it is derived from those two.
   */
  detectedAt: Timestamp;
}

/**
 * The two levers a planner can pull on the supply delay case, fixed by the two solver calls
 * AAP 0.8 records: `solveSupplyDelay(CASE-1184, { airSets: 0, transferSets: 0 })` for the
 * do-nothing baseline, and the same case with a transfer quantity on `transferSets`.
 *
 * A lever outside its constraint — below zero, above its maximum or off its step — fails the
 * scenario with one message per breach rather than being silently clamped (AAP 0.12.2).
 */
export interface Levers {
  /** Sets recovered by air freight. */
  airSets: number;

  /** Sets recovered by transfer from another site. */
  transferSets: number;
}

/**
 * One customer order's outcome under a scenario.
 *
 * SCR-04 draws the units-late-by-order grouped bars from this series, and the scenario's
 * `unitsLate` and `maxDaysLate` measures are aggregates over the same orders (contracts §4).
 */
export interface OrderResult {
  /** The customer order measured, `CO-nnnnnn`. */
  orderId: CustomerOrderId;

  /** How many of that order's units the scenario leaves late. */
  unitsLate: number;

  /** How many days late the last of those units is. */
  daysLate: number;
}

/**
 * How a scenario came to exist, which decides what the interface has to say about it.
 *
 * - `'solver'` — computed at call time by `solveSupplyDelay` from the exception's solver case.
 * - `'seeded'` — a scenario shipped as dataset content, so its column carries `Simulated data`
 *   and a reader can tell it from a figure computed in this session (AAP 0.10, rule P-1).
 * - `'sandbox'` — the duplicate the comparison screen's sandbox recomputed from edited levers
 *   (AAP 0.12.4).
 */
export type ScenarioOrigin = 'solver' | 'seeded' | 'sandbox';

/**
 * One response option, as the comparison matrix shows a column of it.
 *
 * The measures are the solver's, carried in full by `SolverResult` (AAP 0.12.1: units late,
 * maximum days late, orders on time, added cost, line idle days, revenue delayed, run-out, the
 * daily closing-stock series, the per-order results, the constraint check and its messages, the
 * side effects, the write-backs, the levers and the confidence). The mock adapter adds the four
 * identity members below to form a `Scenario`. A scenario whose constraint check fails is shown as
 * "Cannot compute" with the reason and is never recommended (AAP 0.8).
 */
export interface Scenario extends SolverResult {
  /** The scenario's identifier, `SCN-nnnn-x`. */
  id: ScenarioId;

  /** The exception the option belongs to. */
  exceptionId: ExceptionId;

  /** The option's name, as the comparison matrix labels its column. */
  name: string;

  /** How the option came to exist, which decides its simulation label. */
  origin: ScenarioOrigin;
}

/**
 * What an option costs a record that is not the one being rescued: the side effect the approver
 * has to acknowledge before approving (SCR-05).
 *
 * AAP 0.8's recommendation sentence names three of the members — the kits deferred, their value
 * and the days of deferral — and the fourth identifies the product those kits belong to.
 */
export interface SideEffect {
  /** The product whose supply is deferred. */
  productId: ProductId;

  /** How many kits of that product are deferred. */
  kitsDelayed: number;

  /** The value of those kits, in euro. */
  valueDeferredEur: Money;

  /** How many days the deferral lasts. */
  daysDeferred: number;
}

/**
 * Where one simulated write-back stands.
 *
 * The write-back is all-or-nothing, and a failure is recorded rather than silently dropped: the
 * tracker shows the failure with the fixed `Simulated write-back` label beside its own message,
 * and a retry never leaves a second success record behind (AAP 0.2.2, 0.12.4 SCR-05).
 */
export type WriteBackState = 'pending' | 'succeeded' | 'failed';

/**
 * One step of the write-back that would follow an approval, in the order the record states them.
 *
 * T-08 asserts the five write-backs appear in the seed's order, and the post-approval tracker steps
 * through the same records (AAP 0.7, 0.12.4 SCR-05). `system` is a generic source category rather
 * than a named product, so the record names no vendor (rule P-7).
 */
export interface WriteBack {
  /** The step's position in the write-back, from one upwards. */
  sequence: number;

  /** The system class the step writes to. */
  system: SourceId;

  /** The record the step writes, in that system's own reference form. */
  recordRef: string;

  /** What the step does, in plain words. */
  description: string;

  /** Where the step stands. */
  state: WriteBackState;
}

/**
 * An option the comparison matrix sets aside, with the constraint that blocked it.
 *
 * AAP 0.12.2 fixes the pair: SCR-04 lists the rejected options and the blocking constraint each one
 * breached, so a planner can see what was considered and why it was not proposed.
 */
export interface Rejected {
  /** The option that was set aside. */
  scenarioId: ScenarioId;

  /** The constraint the option breached, as the record states it. */
  blockingConstraint: string;
}

/**
 * Every option measured for one exception, with the recommendation and the arithmetic behind it.
 *
 * AAP 0.12.2 fixes the six members. `recommendedId` is the first option by "fewest units late, then
 * lowest added cost" among those whose constraint check passes, and a set where none passes
 * recommends nothing; `recommendationRule` and `tradeOff` carry the stated rule and the sentence
 * with its computed figures, so the badge on screen is never unexplained (AAP 0.8, 0.10).
 */
export interface ScenarioSet {
  /** The exception these options answer. */
  exceptionId: ExceptionId;

  /** The measured options, one column each in the comparison matrix. */
  scenarios: Scenario[];

  /** The option the recommendation rule picks, absent when no option passes its constraint. */
  recommendedId?: ScenarioId;

  /** The rule the recommendation applied, stated in plain words. */
  recommendationRule: string;

  /** The trade-off the recommended option makes, with the figures it spends and protects. */
  tradeOff: string;

  /** The options set aside and the constraint that blocked each one. */
  rejected: Rejected[];
}

/**
 * Where an approval stands, both before and after a decision.
 *
 * `changes-requested` is the state a "request changes" decision leaves behind, spelled in the
 * repository's hyphenated casing for multi-word literals.
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes-requested';

/** What a decision does to an approval, one member per SCR-05 action. */
export type DecisionAction = 'approve' | 'reject' | 'request-changes';

/**
 * The decision recorded against an approval.
 *
 * SCR-05 offers approve, reject and request changes, and each one needs a comment (AAP 0.12.2), so
 * the comment is required rather than optional. Declared beside `Approval`, the entity that
 * carries it, rather than in `./service`, so this folder's dependency direction stays one-way.
 */
export interface Decision {
  /** Which decision was taken. */
  action: DecisionAction;

  /** The comment the decider left, which the audit record keeps. */
  comment: string;
}

/**
 * One approval: a plan put to an eligible approver, and what was decided about it.
 *
 * AAP 0.12.2 fixes the record — requester, eligible approvers, status, added cost, protected
 * revenue, the decision fields, the write-backs and `outcomeReviewed` — together with the rule that
 * the requester is never eligible to decide. The two euro members are the plan's comparison shown
 * side by side on the detail screen, and `outcomeReviewed` records that the post-approval card has
 * set planned figures against resulting ones (SCR-05).
 */
export interface Approval {
  /** The approval's identifier, `APR-2026-nnn`. */
  id: ApprovalId;

  /** The exception the plan answers. */
  exceptionId: ExceptionId;

  /** The option under approval. */
  scenarioId: ScenarioId;

  /** The persona who requested approval, who is excluded from deciding it. */
  requestedBy: UserId;

  /** The roles whose members may decide it, from the contracts §7.1 matrix. */
  eligibleApproverRoles: Role[];

  /** Where the approval stands. */
  status: ApprovalStatus;

  /** The plan's added cost, in euro. */
  addedCostEur: Money;

  /** The revenue the plan protects, in euro. */
  protectedRevenueEur: Money;

  /** The decision taken, absent while the approval is pending. */
  decision?: Decision;

  /** The persona who decided it, absent while pending. */
  decidedBy?: UserId;

  /** When the decision was taken, absent while pending. */
  decidedAt?: Timestamp;

  /** The simulated write-backs the approval sets in motion, in their recorded order. */
  writeBacks: WriteBack[];

  /** Whether the post-approval outcome has been reviewed against the plan. */
  outcomeReviewed: boolean;
}

/**
 * One link of the append-only audit chain, exactly as contracts §6 defines it.
 *
 * The member order follows the concatenated string the hash covers, so the type and the hash module
 * cannot drift:
 * `sequence|id|timestamp|actorType|actorId|action|objectRef|result|policyId|payloadHash|previousHash`,
 * with an empty string where `policyId` is absent. `payloadHash` is the SHA-256 of the canonical
 * JSON of `{ before, after }`, and `previousHash` is the predecessor's `eventHash` — the 64 zeros
 * of `GENESIS_PREVIOUS_HASH` for the first event. Contracts §6 fixes the string, the canonical
 * form, the genesis value and the linkage; AAP 0.8 restates the mechanism.
 *
 * The chain is append-only and the interface labels it `Simulated control`. A verification
 * recomputes each hash in sequence and reports the first position that does not match, and it
 * changes no record (AAP 0.8, 0.12.1).
 */
export interface AuditEvent {
  /** Strictly increasing position of the event in the chain, from one upwards. */
  sequence: number;

  /** The event's identifier, `AUD-nnnnnn`. */
  id: AuditEventId;

  /** When the action happened, read from the demonstration clock rather than the system clock. */
  timestamp: Timestamp;

  /** Which kind of actor appended the event. */
  actorType: AuditActorType;

  /** The acting persona, or the policy identifier when `actorType` is `'policy'`. */
  actorId: string;

  /** What the event records, from the canonical action spellings of `AuditAction`. */
  action: AuditAction;

  /** The record the event is about, which is what a reader follows and the ledger groups by. */
  objectRef: string;

  /** The outcome the event records. */
  result: AuditResult;

  /**
   * The policy the event was recorded against, when it names one.
   *
   * Not confined to the engine's own events: the trail records a decision against the policy that made
   * it whatever actor carried the request out — a refused assistant question is recorded against POL-007
   * with the persona who asked it as its actor — and the governance screen's decision list selects the
   * events that name a policy for exactly that reason.
   */
  policyId?: PolicyId;

  /** The affected record's values before the action, or `null` when the action created it. */
  before: AuditPayload | null;

  /** The affected record's values after the action, or `null` when the action removed it. */
  after: AuditPayload | null;

  /** Lowercase hex SHA-256 of the canonical payload, computed by the chain module. */
  payloadHash: string;

  /** The correlation identifier every result and failure of the same request carries. */
  traceId: string;

  /** The predecessor's `eventHash`, or the genesis value for the first event. */
  previousHash: string;

  /** Lowercase hex SHA-256 of the concatenated string above, computed by the chain module. */
  eventHash: string;
}

/**
 * The result of verifying the chain.
 *
 * AAP 0.12.1 fixes the three members: how many events were checked, every break found as a
 * `{ sequence, id }` pair, and how long the walk took. The interface shows the position of the
 * first break and the total count, and repairs nothing.
 */
export interface ChainReport {
  /** How many events the verification recomputed. */
  eventsChecked: number;

  /** Every position at which the chain does not verify. */
  breaks: ChainBreak[];

  /** How long the verification took, in milliseconds. */
  durationMs: number;
}

/* ---------------------------------------------------------------------------------------------
 * E. PPAP and package entities — contracts §8, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * One element of a part approval package, as the package map reports it.
 *
 * AAP 0.12.2 fixes the record: the element's number and name, its state, the evidence rule that
 * decided it and that rule's wording, the threshold and the actual reading, the extraction's
 * confidence, whether a person reviewed it, and the document and pin behind it. The state is a
 * `PinState` because the same six states drive the pin badges and the package map, and the seven
 * rules are re-run after every accept or correct of an extracted value (contracts §8).
 *
 * `threshold`, `actual` and `ruleText` are record content from `src/seed/packages.ts`; no rule
 * wording or reading is written in a component (rule P-6).
 */
export interface PpapElement {
  /** The element's number within its package. */
  number: number;

  /** The element's name. */
  name: string;

  /** The state the evidence rules produced for this element. */
  state: PinState;

  /** The contracts §8 evidence rule that decided the state. */
  ruleId: EvidenceRuleId;

  /** That rule's wording, taken from the seed record that declares it. */
  ruleText: string;

  /** The threshold the rule applies, as the record states it. */
  threshold: string;

  /** The actual reading the extraction produced, as the record states it. */
  actual: string;

  /** How confident the extraction was in that reading. */
  extractionConfidence: number;

  /** Whether a person has reviewed the extracted value. */
  humanReviewed: boolean;

  /** The document the reading was extracted from, `DOC-nnnn`. */
  documentId: DocumentId;

  /** The evidence pin that carries this element on the canvas, where one is attached. */
  pinId?: EvidencePinId;
}

/**
 * One part approval package: its elements and the readiness they add up to.
 *
 * The readiness figure is the elements whose state passed divided by the package's own element
 * count, handed to `wholePercent` so it is stated as a whole percent rounded half up (contracts §5,
 * AAP 0.12.1). The count is never a constant: it is the length of `elements`, so a package with a
 * different number of elements is still measured correctly. On screen the figure carries
 * `Simulated calculation` (rule P-1).
 */
export interface PpapPackage {
  /** The package's identifier, `PPAP-nnnn`. */
  id: PackageId;

  /** The supplier whose part the package covers. */
  supplierId: SupplierId;

  /** The material the package covers. */
  materialId: MaterialId;

  /** The package's elements, in the order the package lists them. */
  elements: PpapElement[];

  /** Elements whose state passed over the element count, as a whole percent. */
  readinessPercent: number;
}

/* ---------------------------------------------------------------------------------------------
 * F. The active demonstration user — AAP 0.12.1 `switchRole`, specification §3
 * ------------------------------------------------------------------------------------------- */

/**
 * The persona the demonstration is currently acting as.
 *
 * `switchRole(userId)` on the demonstration capability returns one of these (AAP 0.12.1), and the
 * mock adapter holds it while it enforces the contracts §7.1 permission matrix, so the interface
 * never decides what a caller may do. Each of the eight seeded personas has a fixed plant scope, a
 * permission set and a home route: the canvas for USR-01, USR-03, USR-05 and USR-07, the approval
 * inbox for USR-02, the sovereignty screen for USR-04, the audit trail for USR-06 and the evidence
 * workspace for USR-08, whose route states that its stage has not arrived yet (specification §3,
 * AAP 0.12.4).
 *
 * The role switcher is a demonstration control, and the interface states that browser-side
 * permission checks are not production authorisation (rule P-3).
 */
export interface ActiveUser {
  /** The persona's identifier, `USR-01` to `USR-08`. */
  id: UserId;

  /** The persona's synthetic name, from the seed records (rule P-7). */
  name: string;

  /** The persona's role, which selects the permission set and plant scope. */
  role: Role;

  /** The plants the persona's scope covers, which every list call and aggregate is narrowed to. */
  plantIds: PlantId[];

  /** The permissions the contracts §7.1 matrix grants this persona's role. */
  permissions: Permission[];

  /** The route the router sends this persona to, and the one it returns to when the role changes. */
  homeRoute: string;
}

