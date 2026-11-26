/**
 * The service boundary vocabulary: the envelope every read returns, the typed failure every call can
 * produce, the list-query shapes the read methods accept, the seven screen states with their
 * simulation flags, and the decision the pure policy engine returns.
 *
 * Fixed by `platform-contracts.md` §2, which declares `Meta`, `Result<T>` and `Problem` as the two
 * halves of every response, and derived by AAP 0.12.1 (the envelope and the policy decision), AAP
 * 0.12.2 (the query shapes, whose fields the consuming screen fixes) and AAP 0.12.3 (`{ data, meta }`
 * on every response, and the five causes a `Problem` distinguishes).
 *
 * `Meta`, `Result` and `Problem` are declared here and nowhere else. The port,
 * `src/services/site-intelligence-service.ts`, imports and re-exports them, so the mock adapter, the
 * unconnected API client and every screen share one copy and the boundary cannot be restated
 * (rule P-2). This module imports only `./primitives`, `./entities` and `./audit` — no seed record, no
 * adapter, no domain module, no React — so it cannot become a second data boundary.
 *
 * Where the neighbouring names live, so that none of them is declared twice:
 * - `Decision` and `DecisionAction` are in `./entities`, beside the `Approval` that carries a
 *   decision. Declaring them here would force `Approval` to import this module, and this folder's
 *   dependency direction is `./service` to `./entities`, never the reverse.
 * - `Permission`, `SourceId`, the entity identifiers and `Timestamp` are in `./primitives`, the leaf
 *   module, so `./entities` can type `Freshness.source` without reaching this module.
 *
 * Shapes only (rule P-6): no threshold, count, duration or identifier value is written here, and
 * there is no function, state or latency constant, because `MockBackend` owns behaviour (AAP
 * 0.12.1). Collections are plain mutable arrays and no member is marked as read-only, because the
 * mock adapter replaces freshness arrays and flags in place (AAP 0.2.1).
 *
 * OPEN ITEM: `ProblemType`'s five causes are quoted from AAP 0.12.3 in prose ("permission, policy,
 * validation, simulated write-back, not found") and spelled in kebab case here, following this
 * repository's casing for multi-word literals (`changes-requested`).
 * OPEN ITEM: the stale-source refusal (AAP 0.2.1, T-13) has no cause of its own in that list. The
 * plan reads it as `'validation'`, with the source and its as-of time in `message`, because a
 * refusal made on the state of the records is a validation of the request rather than a permission
 * or a policy block.
 * OPEN ITEM: `ScreenState` carries the seven states AAP 0.5.2 gives `StateBoundary`'s `state` prop.
 * A thrown `Problem` is not one of them: a failed read is the screen's error path (AAP 0.18.1) and a
 * denied one shows the forbidden or policy card.
 * OPEN ITEM: `SimulationFlag` composes `ScreenState` and adds the two triggers that are not screen
 * states — the edited audit event and the emptied exception queue — because the single simulation
 * popover holds exactly those, the seven states and `Reset demo data` (AAP 0.12.1, 0.12.4). The
 * reset is a method of the port, not a flag, so no member below stands for it.
 * OPEN ITEM: `ListQuery.sort` and `ListQuery.cursor` are `string`, because contracts §9 fixes the
 * `sort=field:dir` parameter and an opaque cursor without enumerating a sortable field set.
 * OPEN ITEM: `AuditQuery.actorId` is `string` rather than `UserId`, because an event's `actorId` is a
 * persona or a policy identifier (see `AuditEventDraft` in `./audit`), and `AuditEvent` is the record
 * the query filters.
 * OPEN ITEM: `Problem.permittedAlternative` and `PolicyDecision.permittedAlternative` are plain
 * strings, because contracts §7.2 names no identifier type for the alternative a deny permits.
 */

import type { AuditAction, AuditResult } from './audit';
import type {
  ExceptionStatus,
  ExceptionType,
  Freshness,
  Role,
  Severity,
} from './entities';
import type {
  AuditEventId,
  Permission,
  PlantId,
  PolicyId,
  ProductId,
  SupplierId,
  Timestamp,
  UserId,
} from './primitives';

/* ---------------------------------------------------------------------------------------------
 * The envelope — platform-contracts.md §2, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The metadata every result carries: the freshness of the six sources, the simulation marker and the
 * correlation identifier of the call.
 */
export interface Meta {
  /**
   * The six sources' state at the moment of the call. A screen reads this array to raise its stale
   * banner and to name the source and its as-of time beside the disabled approval controls (AAP
   * 0.2.1), so the visible half of the freshness rule and the service's own refusal quote the same
   * record.
   */
  freshness: Freshness[];

  /**
   * The literal `true`, not a boolean: every response this application produces is simulated, and
   * the literal makes that a compile-time fact rather than a convention. It is the typed fact behind
   * the persistent `Simulated data` badge the shell mounts on every route (rule P-1, AAP 0.10), and a
   * caller cannot construct a meta that claims otherwise.
   */
  simulated: true;

  /**
   * The correlation identifier of the request, carried by every failure of the same call and by the
   * audit event the call appended, so an identifier a user quotes leads back to the record. It
   * correlates a request with its records and authenticates nothing (rule B-2).
   */
  traceId: string;
}

/**
 * One service call's success: the payload and the metadata that qualifies it.
 *
 * Every method of the port resolves to a `Result<T>` or throws a `Problem` (AAP 0.6.2), so a caller
 * reads a payload only once the call has settled, and the simulated marker reaches every screen with
 * every figure instead of being asserted once by the shell (rule P-1).
 *
 * @typeParam T - The payload the call returns.
 */
export interface Result<T> {
  /** The payload. */
  data: T;

  /** The freshness, simulation marker and correlation identifier of the call. */
  meta: Meta;
}

/* ---------------------------------------------------------------------------------------------
 * The failure — platform-contracts.md §2, AAP 0.2.2 and AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The cause a `Problem` names, one member per cause AAP 0.12.3 enumerates.
 *
 * - `'permission'` — the acting role lacks the permission the call requires, so the forbidden card
 *   names the role that may act; `requiredPermission` and `rolesWithPermission` carry it.
 * - `'policy'` — a policy denied the action, so `policyId`, `permittedAlternative` and
 *   `auditEventId` carry the rule, the alternative it permits and the event it appended.
 * - `'validation'` — the request cannot be honoured against the records as they stand, which
 *   includes the stale-source refusal that names the source and its as-of time.
 * - `'simulated-write-back'` — a simulated write failed. The change stays all-or-nothing, the
 *   failure is recorded, and a retry never duplicates a success record (AAP 0.2.2).
 * - `'not-found'` — no record answers the identifier requested.
 */
export type ProblemType =
  | 'permission'
  | 'policy'
  | 'validation'
  | 'simulated-write-back'
  | 'not-found';

/**
 * The typed failure a service call throws, whose `type` names its cause.
 *
 * A failure is thrown rather than returned, so a caller cannot read a payload beside it and the
 * simulated write-back of AAP 0.2.2 cannot be mistaken for a success. The optional members are the
 * evidence a screen needs to explain the refusal instead of merely reporting it (rule P-8).
 */
export interface Problem {
  /** Which cause the failure names. */
  type: ProblemType;

  /**
   * The reason in plain words, and the only member every failure carries. For a stale-source refusal
   * it names the source and its as-of time, which is the sentence T-13 asserts beside the disabled
   * approval controls.
   */
  message: string;

  /** The correlation identifier of the call that failed, matching the `traceId` of its meta. */
  traceId: string;

  /**
   * The permission the acting role lacks, present on a `'permission'` failure so the forbidden card
   * can name it.
   */
  requiredPermission?: Permission;

  /**
   * The roles that hold `requiredPermission`, present on a `'permission'` failure, so the forbidden
   * card names the role that may act rather than only the permission that is missing (AAP 0.12.3).
   */
  rolesWithPermission?: Role[];

  /** The policy that denied the action, present on a `'policy'` failure. */
  policyId?: PolicyId;

  /**
   * The alternative the denying policy permits, present on a `'policy'` failure. For a POL-007 block
   * it is the one-click switch the block card offers to the in-boundary model (AAP 0.12.4).
   */
  permittedAlternative?: string;

  /**
   * The policy-actor audit event the denial appended, present on a `'policy'` failure, so the block
   * card can point at the record that the refusal itself created (AAP 0.8).
   */
  auditEventId?: AuditEventId;
}

/* ---------------------------------------------------------------------------------------------
 * Screen states and simulation flags — platform-specification.md §8, AAP 0.5.2 and AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The seven states a screen renders, one member per state specification §8 fixes, and the value of
 * `StateBoundary`'s `state` prop (AAP 0.5.2).
 *
 * - `'loading'` — the call is pending, and the skeleton stands in for the content.
 * - `'empty'` — the call succeeded and returned nothing to show.
 * - `'stale'` — a source behind the figures is out of date, and the banner names it with its as-of
 *   time.
 * - `'partial'` — a source answered incompletely, so the missing inputs are named beside the figures.
 * - `'offline'` — no source answered, which the demonstration produces from its own controls.
 * - `'forbidden'` — the acting role lacks the permission, shown as the forbidden card.
 * - `'conflict'` — the record changed under the reader, so the update is refused rather than merged.
 */
export type ScreenState =
  | 'loading'
  | 'empty'
  | 'stale'
  | 'partial'
  | 'offline'
  | 'forbidden'
  | 'conflict';

/**
 * Every trigger the single simulation popover offers, other than `Reset demo data`.
 *
 * It composes `ScreenState` rather than repeating its members, and adds the two triggers that are not
 * screen states (AAP 0.12.1, 0.12.4):
 *
 * - `'tampered-audit'` — the demonstration edits a recorded result of one seeded event without
 *   recomputing its hash, so a verification reports the position of the break. The member names that
 *   control, and the interface labels the chain `Simulated control` wherever it surfaces: a browser
 *   page establishes nothing about the store behind it and claims nothing about resistance to such an
 *   edit (rule P-4).
 * - `'empty-queue'` — the demonstration empties the exception queue. It is separate from `'empty'`,
 *   which is the generic empty screen state a read can produce, so emptying the queue cannot be
 *   confused with a filter that happens to match nothing.
 *
 * `Reset demo data` is a method of the port rather than a flag, because it changes the adapter's
 * state instead of one read's behaviour, so no member below stands for it.
 */
export type SimulationFlag = ScreenState | 'tampered-audit' | 'empty-queue';

/* ---------------------------------------------------------------------------------------------
 * Scope and queries — platform-specification.md §5.1, platform-contracts.md §5 and §9
 * ------------------------------------------------------------------------------------------- */

/**
 * The plant and product selection the shell's filters hold, before the acting role's plant scope is
 * applied.
 *
 * An empty array means the "All plants" or "All products" selection rather than "no plants" or "no
 * products". The service intersects this selection with the role's plant scope before a list or an
 * aggregate is computed, so a filtered queue and a filtered overview cannot disagree about what is in
 * scope (AAP 0.2.1, 0.12.1).
 */
export interface Scope {
  /** The selected plants, or an empty array for all plants. */
  plants: PlantId[];

  /** The selected products, or an empty array for all products. */
  products: ProductId[];
}

/**
 * The paging and ordering parameters every list method accepts, as contracts §9 fixes them.
 */
export interface ListQuery {
  /** The greatest number of records to return. */
  limit?: number;

  /** The opaque position to continue from, as the previous page's response reported it. */
  cursor?: string;

  /** The ordering, written `field:dir` (for example `severity:desc`). */
  sort?: string;
}

/**
 * The filters the exception queue sends, one member per filter specification SCR-02 offers.
 *
 * The queue's own default ordering is severity and then days to impact, which the service applies
 * when `sort` is absent. No member here is scoped by provenance, because every exception is a
 * first-party record: market intelligence reaches a screen only through the competitive atlas, where
 * it is never combined with a first-party value (rule P-5).
 */
export interface ExceptionQuery extends ListQuery {
  /** The exception type to keep. */
  type?: ExceptionType;

  /** The plant to keep, on the plant the exception names or on one it also affects. */
  plantId?: PlantId;

  /** The severity to keep. */
  severity?: Severity;

  /** The status to keep. */
  status?: ExceptionStatus;

  /** The owner to keep. */
  ownerId?: UserId;

  /** The supplier to keep, on the supplier the affected material is bought from. */
  supplierId?: SupplierId;
}

/**
 * The filters the audit table sends, over the members an `AuditEvent` carries (AAP 0.12.2).
 *
 * A verification is not a query: `verifyChain` walks the whole chain, and what a screen shows of its
 * report is the first break and the total.
 */
export interface AuditQuery extends ListQuery {
  /** The actor to keep — a persona identifier, or a policy identifier on a policy-actor event. */
  actorId?: string;

  /** The action to keep, spelled as the appending module spelled it. */
  action?: AuditAction;

  /** The record to keep, matched against the event's `objectRef`. */
  objectRef?: string;

  /** The outcome to keep. */
  result?: AuditResult;

  /** The earliest instant to keep, inclusive. */
  from?: Timestamp;

  /** The latest instant to keep, inclusive. */
  to?: Timestamp;
}

/* ---------------------------------------------------------------------------------------------
 * The pure policy engine's result — AAP 0.12.1 `evaluate`
 * ------------------------------------------------------------------------------------------- */

/**
 * What a policy evaluation concluded, one member per outcome AAP 0.12.1 fixes.
 *
 * `'notApplicable'` is the outcome of a policy that is declared configuration rather than an
 * evaluated rule: POL-009 on customer-held keys is shown as `Declared, not verified` and is never
 * evaluated (rule P-4), so it reaches this outcome by design rather than by a condition that happened
 * not to hold.
 */
export type PolicyOutcome = 'allow' | 'notApplicable' | 'deny';

/**
 * What `evaluate(action, actor, records)` returns: whether the action may proceed, and on a denial
 * the rule that caused it with its reason in plain words.
 *
 * The engine is a pure function of its arguments, so a decision is reproducible from the same
 * records. A denial is what the interface turns into a disabled control carrying the rule and the
 * reason (rule P-8) and into a policy-actor audit event, and the adapter refuses the action whether
 * or not a control was offered.
 */
export interface PolicyDecision {
  /** What the evaluation concluded. */
  outcome: PolicyOutcome;

  /** The rule that reached a denial, present when `outcome` is `'deny'`. */
  policyId?: PolicyId;

  /** Why the rule denied the action, in plain words, present when `outcome` is `'deny'`. */
  reason?: string;

  /**
   * The alternative the rule permits, present when the rule names one, so a blocked assistant answer
   * can offer the in-boundary model in one click instead of leaving the reader at a refusal.
   */
  permittedAlternative?: string;
}
