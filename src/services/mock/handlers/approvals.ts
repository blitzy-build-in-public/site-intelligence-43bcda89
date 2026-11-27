/**
 * The approvals family of the in-browser mock adapter: the inbox, the approval detail, the
 * approve / reject / request-changes decision, the simulated write-back tracker, the retry of a
 * failed write-back, and the outcome card's planned-versus-resulting figures.
 *
 * Implements the "Handlers" row of AAP 0.12.1 and the `handlers/` line of AAP 0.13.1, over
 * `platform-contracts.md` §3 (`Approval`, `ApprovalStatus`, `WriteBack`, `WriteBackState`,
 * `Decision`), §6 (the audited actions), §7.1 (the permission matrix) and §7.2 (POL-003). Three
 * invariants of this family are enforced here rather than only displayed, so no caller can bypass
 * any of them:
 *
 * - A STALE OR UNAVAILABLE ORDER BOOK REFUSES BOTH APPROVAL WRITES (AAP 0.2.1, AAP 0.12.3).
 *   `requestApproval` and `decideApproval` — and the write-back writes that continue a decision —
 *   read the order-book source's freshness through `freshnessFor(ctx.state)` and throw a `Problem`
 *   naming that source's label and the instant it last answered when the source is `stale` or
 *   `unavailable`. A refused call creates no approval, no write-back state change and no audit
 *   record, and the same instant reaches the screen's stale banner and the disabled control's
 *   explanation from the one source, so the tooltip and the refusal cannot disagree (T-13).
 * - A RESPONSE OPTION THAT FAILS ITS CONSTRAINT CHECK IS NOT SENT FOR APPROVAL (AAP F7, POL-005).
 *   `requestApproval` asks the policy engine before it writes anything, and an option whose check
 *   reports a breach is refused with the rule and the solver's own message rather than recorded: the
 *   refusal appends a policy-actor event, no approval record is created, and the rule's subject is
 *   the one `src/seed/policies.ts` states.
 * - A SIMULATED WRITE-BACK IS ALL-OR-NOTHING (AAP 0.2.1). The steps advance in the record's own
 *   array order, each transition is recorded on the step and in the trail, and a step that fails
 *   stops the run: no later step runs, the change is not applied, and the failure is thrown as a
 *   `'simulated-write-back'` failure whose message is the failure's own. A retry re-attempts that
 *   one step and then lets the remaining steps run once; a step that already succeeded is never
 *   written a second time.
 *
 * WHERE THE FIXED WORDING LIVES. This module types no simulation label, exactly as `./audit.ts`
 * does: the tracker renders the fixed `Simulated write-back` tag beside each step from
 * `src/types/primitives.ts`, and the outcome card's figures are labelled `Simulated calculation`
 * where they are displayed. Nothing here paraphrases either string and nothing here invents a
 * failed-write label — the failure's own message travels on the thrown `Problem`, and the component
 * sets it beside the tag (rule P-1).
 *
 * WHAT THIS MODULE COMPUTES, AND WHAT IT DOES NOT. `Approval.addedCostEur` is the plan's own cost
 * exactly as the solver (or the shipped scenario record) states it, and both figures the outcome card
 * shows are two `solveSupplyDelay` calls returned untouched (rule P-6). The one difference it takes is
 * `Approval.protectedRevenueEur`, which AAP 0.8 states as the delayed revenue the plan avoids: the
 * delayed revenue the exception's do-nothing position leaves, less the delayed revenue the option
 * itself still leaves, floored at none of it — see `plannedFiguresFor`. AAP 0.12.2 gives the `Approval`
 * that member and AAP 0.12.4 shows it on SCR-05 against the added cost, so the pair reads as what the plan
 * spends against the delay it buys. Carrying the option's own residual in its place would report a
 * better option as protecting less than a worse one and the do-nothing option as protecting the whole
 * disruption, which contradicts the figure AAP 0.8 fixes. Where the records state no option at both
 * levers unpulled the unmitigated position is the set's greatest delayed revenue — the path the
 * disruption takes when nothing is done — so the figure is still measured from the records rather than
 * from the option's own residual. The module
 * self-dates nothing: the instant a decision or a review is recorded at is read from the audit event
 * that append produced, because contracts §1 forbids reading the system clock for business logic and
 * this module holds no second clock of its own.
 *
 * DECISIONS THIS MODULE TAKES WHERE NO INPUT FIXES THE ANSWER, each recorded here because a reader
 * otherwise takes it for a mistake.
 *
 * 1. THE STALENESS REFUSAL IS A `'validation'` CAUSE. `ProblemType` in `src/types/service.ts`
 *    enumerates the five causes contracts §2 fixes — permission, policy, validation,
 *    simulated-write-back and not-found — and none of them is "a source behind this record is out of
 *    date". The refusal is therefore reported as `'validation'`, which is the cause that already
 *    carries the family's other "the records cannot honour this request" refusals, and a sixth cause
 *    is not invented. The message names the source and its instant, which is what T-13 asserts.
 * 2. THE CONFLICTING-UPDATE STATE IS THE SAME CAUSE. A decision on an approval that is no longer
 *    pending, a review of an approval whose outcome is already reviewed, and every write of this
 *    family while the simulation's `conflict` trigger is in effect are refused as `'validation'`
 *    with a message stating that the record changed since it was read. `ProblemType` has no
 *    conflict member and adding one is forbidden, so the screen state is carried by the message.
 * 3. READS REQUIRE `exception.read`. An approval is the plan for an exception, and the matrix in
 *    `src/domain/policy/permissions.ts` grants `exception.read` to every role that may request or
 *    decide one. Gating the inbox on either approval permission would hide a route a persona needs:
 *    on `approval.request` it would hide the plant manager's own `/approvals` home, since no role
 *    that requests also covers the request gate for them, and on `approval.decide` it would hide from
 *    a requester the plan it put forward and may not decide. Each record's plant scope is then the
 *    matrix's own answer, `hasPermission` with the approval's exception as the subject, rather than a
 *    second copy of the scope rule.
 * 4. A REQUESTER'S OWN DECISION IS REFUSED BY POL-003 BEFORE THE PERMISSION CHECK, so the refusal
 *    carries `policyId: 'POL-003'` and the rule's own plain-words reason instead of a permission
 *    failure the reader could not act on. The deny appends a policy-actor event and the failure
 *    names it, as every policy block of this adapter does (AAP 0.8).
 * 5. THE WRITE-BACK STEP'S AUDIT SPELLING IS DERIVED. contracts §6 fixes sixteen action names and
 *    the inputs available in this run enumerate twelve; two more are derived in this tree — this one
 *    and `policy exception request` in `./governance.ts` — so the adapter appends fourteen distinct
 *    values, and the last two of the sixteen are named by no available input. A step's transition is
 *    spelled `simulated write-back` after the specification §5.3 label it carries, in the lower-case
 *    form the seeded spellings use, and `./governance.ts` sets the same precedent for `policy
 *    exception request`. A supplied contracts document supersedes the constant without a consumer
 *    change.
 * 6. THE RETRY IS ADDRESSED BY THE STEP'S OWN REFERENCE. `WriteBack` declares no identifier member,
 *    and the tracker's retry control calls its handler with the step's `recordRef`, so that
 *    reference is the key a retry names; an unknown or blank reference is a `'not-found'` failure
 *    listing the references the record holds.
 * 7. THE AUDIENCE A NEW REQUEST NAMES IS THE DECIDERS THAT REACH THE PLAN. `eligibleApproverRoles` is
 *    the matrix's decider roles less the requester's own role (POL-003) less the roles whose plant
 *    scope does not cover the exception, because the decision path refuses a role that cannot reach
 *    the record and a control offering one would explain nothing (rule P-8). A plan no role in reach
 *    could then decide — the acting persona is the only role whose scope covers it and has requested
 *    it — is refused rather than created, since an approval nobody may decide is a record that can
 *    only sit in the inbox.
 *
 * DETERMINISTIC BY CONSTRUCTION (AAP 0.2.1, AAP 0.18.2). No clock, no random source and no
 * module-level mutable value is read. The solver is a pure function of its arguments, the seeded
 * records arrive as the session's own clone, the identifier a new approval takes is derived from the
 * identifiers the records hold, and every instant is taken from the append that recorded it — so two
 * calls made against equal states answer equally.
 *
 * Rules this module is built to satisfy:
 * - P-1: it types no label. The write-back tag and the outcome card's label are applied where those
 *   elements surface, from the fixed vocabulary of `src/types/primitives.ts`.
 * - P-2: records are reached through `ctx.state` and the sibling `../seed-loader.ts` type surface
 *   only, and the module imports no seed record, no React, no app module, no screen and no API
 *   client, so it cannot become a second data boundary.
 * - P-3, P-8: every verdict comes from `ctx.actor` through the contracts §7.1 matrix, so a disabled
 *   control's reason and this module's refusal share one source, and every refusal names the
 *   permission required and the roles that hold it. The checks run in the browser of a build with no
 *   backend and no sign-in: they are a demonstration control and not production authorisation.
 * - P-4: the tracker and the outcome card demonstrate a mechanism. Nothing here claims that the
 *   flow establishes sovereignty, withstands an edit or prevents a copy, and the write-backs are
 *   recorded as steps rather than as assurances.
 * - P-5: the family states no market-intelligence figure at all, so no first-party value of its own
 *   is ever combined with one.
 * - P-6: no currency literal, no lever volume, no record identifier and no rounding is stated here;
 *   the expected results of `platform-seed-data.md` are fixtures this module neither holds nor reads.
 * - P-7: only the seed's synthetic identifiers and the workspace's own words; the source names it
 *   prints come from `SOURCE_LABELS`, and no company, person or vendor is named.
 * - B-1, B-2: no address is opened, no configuration is read and no credential is carried.
 */

import { evaluate } from '../../../domain/policy/evaluate';
import type { PolicyRecords } from '../../../domain/policy/evaluate';
import { hasPermission, plantScopeFor, rolesWith } from '../../../domain/policy/permissions';
import { solveSupplyDelay } from '../../../domain/solver/solve-supply-delay';
import { DEMO_CLOCK, SOURCE_LABELS } from '../../../types';
import type {
  Approval,
  ApprovalId,
  ApprovalOutcome,
  ApprovalStatus,
  AuditAction,
  AuditPayload,
  AuditResult,
  Decision,
  ExceptionId,
  Freshness,
  Levers,
  ListQuery,
  Money,
  OperationalException,
  Permission,
  PolicyDecision,
  PolicyId,
  Problem,
  Role,
  Scenario,
  ScenarioId,
  ScenarioSet,
  SimulationFlag,
  SourceId,
  SolverCase,
  WriteBack,
  WriteBackState,
} from '../../../types';
import type { HandlerContext, MockState } from '../mock-state';
import type { SeedRecordSet } from '../seed-loader';
import { freshnessFor, isSimulationOn } from '../simulation';
import { appendAuditEvent, traceIdFor } from './audit';
import { getScenarioSet } from './scenarios';

/* ---------------------------------------------------------------------------------------------
 * A. Structural constants — contracts §1, §7.1, §7.2
 * ------------------------------------------------------------------------------------------- */

/** The permission every read of this family requires — contracts §7.1 (decision 3 in the header). */
const EXCEPTION_READ: Permission = 'exception.read';

/** The permission `requestApproval` requires — contracts §7.1. */
const APPROVAL_REQUEST: Permission = 'approval.request';

/** The permission a decision, a write-back retry and an outcome review require — contracts §7.1. */
const APPROVAL_DECIDE: Permission = 'approval.decide';

/**
 * The one source whose freshness gates approval — contracts §3, AAP 0.2.1, T-13.
 *
 * `src/services/mock/simulation.ts` marks this same source stale for the stale trigger, so the state
 * a pill reports, the state the banner names and the state this family refuses on are one answer.
 */
const ORDER_BOOK_SOURCE: SourceId = 'erp';

/**
 * The sets a lever recovers in the do-nothing measurement.
 *
 * AAP 0.8 fixes the baseline as `<case>` with `{ airSets: 0, transferSets: 0 }`, and a lever below
 * zero breaches its own bound (contracts §4 rule), so zero is the floor every `LeverConstraint`
 * admits. It is a solver input rather than a business figure, and the solver echoes it on the
 * result it returns.
 */
const NO_SETS_RECOVERED = 0;

/**
 * The levers an option that changed nothing was measured at.
 *
 * Used for the outcome card's resulting figures when the approved change did not land: AAP 0.2.2
 * makes the write-back all-or-nothing, so a plan any of whose steps has not succeeded has changed
 * nothing and the resulting measurement is the one taken with both levers unpulled.
 */
const DO_NOTHING_LEVERS: Levers = {
  airSets: NO_SETS_RECOVERED,
  transferSets: NO_SETS_RECOVERED,
};

/** The status an approval carries before it is decided — `ApprovalStatus`. */
const PENDING_STATUS: ApprovalStatus = 'pending';

/** The status an approval decision leaves behind, one member per `DecisionAction`. */
const STATUS_FOR_DECISION: Record<Decision['action'], ApprovalStatus> = {
  approve: 'approved',
  reject: 'rejected',
  'request-changes': 'changes-requested',
};

/** The status a plan must already carry before its outcome may be reviewed. */
const APPROVED_STATUS: ApprovalStatus = 'approved';

/** The state a write-back step awaits in, before the run reaches it — `WriteBackState`. */
const PENDING_STEP: WriteBackState = 'pending';

/** The state a write-back step reaches when its write completed. */
const SUCCEEDED_STEP: WriteBackState = 'succeeded';

/** The state a write-back step reaches when its write did not complete. */
const FAILED_STEP: WriteBackState = 'failed';

/**
 * The actions this family records, in the spellings contracts §6 and the seeded trail fix.
 *
 * `approval request`, `decision`, `outcome review` and `policy block` are the enumerated canonical
 * spellings of `src/types/audit.ts` and of `src/seed/audit-events.ts`. `simulated write-back` is
 * derived — see decision 5 in the module header.
 */
const APPROVAL_REQUEST_ACTION: AuditAction = 'approval request';
const DECISION_ACTION: AuditAction = 'decision';
const OUTCOME_REVIEW_ACTION: AuditAction = 'outcome review';
const POLICY_BLOCK_ACTION: AuditAction = 'policy block';
const WRITE_BACK_ACTION: AuditAction = 'simulated write-back';

/** The outcomes this family records — `AuditResult`. */
const SUCCEEDED_RESULT: AuditResult = 'succeeded';
const FAILED_RESULT: AuditResult = 'failed';
const BLOCKED_RESULT: AuditResult = 'blocked';

/**
 * The `APR-<year>-nnn` form of an approval identifier — contracts §1.
 *
 * The prefix, the separator and the digit width are the identifier's shape rather than a record's
 * identifier, exactly as the trace prefix of `./audit.ts` and the option letters of `./scenarios.ts`
 * are theirs. The year is read from the constant demonstration clock, so no date literal is written
 * here (rule P-6).
 */
const APPROVAL_ID_PREFIX = 'APR-';
const IDENTIFIER_SEPARATOR = '-';
const YEAR_TOKEN_WIDTH = 4;
const APPROVAL_SEQUENCE_DIGITS = 3;

/** The year every approval identifier of this dataset carries, read from `DEMO_CLOCK`. */
const APPROVAL_YEAR = DEMO_CLOCK.slice(0, YEAR_TOKEN_WIDTH);

/**
 * The statuses that let an approval be decided, and the one a request starts in.
 *
 * The pair is stated once so the "a decision needs a pending record" rule and the "a new request
 * starts pending" rule cannot drift apart.
 */
const DECIDABLE_STATUSES: readonly ApprovalStatus[] = [PENDING_STATUS];

/**
 * The trigger the simulation popover sets for the partial-failure state, as `SimulationFlag` spells
 * it.
 *
 * The popover offers the seven screen states of specification §8 plus the two triggers that are not
 * states, and the partial-failure state is the `'partial'` member: `src/types/service.ts` documents
 * it as "a source answered incompletely", which is the state this family demonstrates by stopping an
 * approved change at one of its write-back steps. The member is named once here so a reader of the
 * decision below does not have to hold that mapping in mind.
 */
const PARTIAL_FAILURE_FLAG: SimulationFlag = 'partial';

/* ---------------------------------------------------------------------------------------------
 * B. Failures — platform-contracts.md §2, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The refusal a call the acting role may not make throws.
 *
 * The members are the ones a `'permission'` cause carries: the cause, the reason in plain words, the
 * permission the call required and the roles that hold it — which is what a forbidden card prints
 * and what a disabled control's explanation names (rule P-8). The permission list is the matrix's
 * current answer rather than a list this module keeps, so the two cannot drift.
 *
 * @param ctx - The call's context, whose state supplies the correlation identifier.
 * @param permission - The permission the call required.
 * @param message - The reason in plain words, naming what the call would have done.
 * @returns The `Problem` to throw.
 */
function permissionProblem(ctx: HandlerContext, permission: Permission, message: string): Problem {
  return {
    type: 'permission',
    message,
    traceId: traceIdFor(ctx.state),
    requiredPermission: permission,
    rolesWithPermission: rolesWith(permission),
  };
}

/**
 * The refusal a request the records cannot honour throws.
 *
 * It carries the causes this family reports as validation: a stale or unavailable order book (see
 * decision 1 in the module header), a record that moved under the reader (decision 2), a blank
 * decision comment, an approval whose plan cannot be measured because the records carry no case for
 * its exception, a retry of a step that already succeeded, and a page cursor that names no position
 * of the ordered page.
 *
 * @param ctx - The call's context, whose state supplies the correlation identifier.
 * @param message - The reason in plain words.
 * @returns The `Problem` to throw.
 */
function validationProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'validation', message, traceId: traceIdFor(ctx.state) };
}

/**
 * The refusal an identifier the records do not answer throws — contracts §2's `'not-found'` cause.
 *
 * Both an identifier the record set does not hold and one it holds outside the acting role's plant
 * scope are reported this way by a read: the second is a record the read does not cover rather than
 * a permission the role lacks, and `./exceptions.ts` reports the same pair the same way.
 *
 * @param ctx - The call's context, whose state supplies the correlation identifier.
 * @param message - The reason in plain words, naming the identifier.
 * @returns The `Problem` to throw.
 */
function notFoundProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'not-found', message, traceId: traceIdFor(ctx.state) };
}

/**
 * The failure a simulated write-back that did not complete throws — AAP 0.2.2, contracts §2.
 *
 * The message is the failure's own and carries the step that failed, the system it writes to and the
 * record it writes there; the fixed `Simulated write-back` label is the component's, rendered beside
 * this message, so no label is paraphrased here and no failed-write label is invented (rule P-1).
 * The step's state and the trail's event have already been written when this is thrown, which is what
 * makes the failure recoverable: the change stays all-or-nothing and a retry addresses this step.
 *
 * @param ctx - The call's context, whose state supplies the correlation identifier.
 * @param message - The failure's own message, composed from the step that failed.
 * @returns The `Problem` to throw.
 */
function writeBackProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'simulated-write-back', message, traceId: traceIdFor(ctx.state) };
}


/* ---------------------------------------------------------------------------------------------
 * C. The session's records — rule P-2, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The approvals a read of this family is computed over.
 *
 * The session's own collection, which a decision, a retry and a review mutate in place. No trigger
 * empties it: the simulation popover empties the exception queue, and an approval inbox that
 * emptied with it would describe a different demonstration than the one the popover names.
 *
 * @param state - The session whose records are read. Not modified.
 * @returns The approvals the call may consider, before plant scoping.
 */
function approvalsFor(state: MockState): readonly Approval[] {
  return state.records.approvals;
}

/**
 * The approval an identifier names, when the session holds one.
 *
 * @param state - The session whose records are searched. Not modified.
 * @param id - The approval identifier the call names.
 * @returns The record, or `undefined` when the session holds none.
 */
function findApproval(state: MockState, id: ApprovalId): Approval | undefined {
  return approvalsFor(state).find((approval) => approval.id === id);
}

/**
 * The exception an approval is the plan for, when the records hold it.
 *
 * @param state - The session whose records are searched. Not modified.
 * @param approval - The approval whose exception is wanted.
 * @returns The exception, or `undefined` when the record set holds none.
 */
function exceptionOf(state: MockState, approval: Approval): OperationalException | undefined {
  return state.records.exceptions.find((exception) => exception.id === approval.exceptionId);
}

/**
 * The exception an identifier names, when the records hold it.
 *
 * @param state - The session whose records are searched. Not modified.
 * @param exceptionId - The exception identifier the call names.
 * @returns The record, or `undefined` when the record set holds none.
 */
function findException(state: MockState, exceptionId: ExceptionId): OperationalException | undefined {
  return state.records.exceptions.find((exception) => exception.id === exceptionId);
}

/* ---------------------------------------------------------------------------------------------
 * D. The permission gates — contracts §7.1, rules P-3 and P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * Refuses the call unless the acting persona may read the plans of the exceptions it may read.
 *
 * Two ways to be refused, reported as one shape because a screen renders one forbidden card: the
 * simulation's forbidden trigger is in effect, which refuses every call of the family while it is
 * set, or the persona's role does not hold `exception.read` (decision 3 in the module header). The
 * trigger is checked first because it stands for a session-wide refusal rather than for a fact about
 * the role.
 *
 * The permission is evaluated with no subject here: which approvals a role may read within its
 * plants is `landsInScope`'s answer, applied per record.
 *
 * @param ctx - The call's context: the persona the check is made for and the state its triggers are
 *   read from.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function requireRead(ctx: HandlerContext): void {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    throw permissionProblem(
      ctx,
      EXCEPTION_READ,
      `The approval records are not readable in this state; reading them requires the ` +
        `${EXCEPTION_READ} permission.`,
    );
  }

  if (hasPermission(ctx.actor.role, EXCEPTION_READ, null, ctx.actor)) {
    return;
  }

  throw permissionProblem(
    ctx,
    EXCEPTION_READ,
    `The acting role (${ctx.actor.role}) does not hold the ${EXCEPTION_READ} permission, so these ` +
      `approval records are not readable here. The roles that hold it are ` +
      `${rolesWith(EXCEPTION_READ).join(', ')}.`,
  );
}

/**
 * Refuses every write of this family while the simulation's forbidden trigger is in effect.
 *
 * A session in the forbidden state is one a screen shows as forbidden, so a write reaching the
 * adapter through it is refused rather than applied: the trigger changes what every call of this
 * family returns, not only the reads.
 *
 * @param ctx - The call's context, whose triggers are read.
 * @param permission - The permission the refused write would have required.
 * @param reason - What the write would have done, in plain words.
 * @throws Problem - A `'permission'` failure naming that permission and the roles that hold it.
 */
function requireNotForbidden(ctx: HandlerContext, permission: Permission, reason: string): void {
  if (!isSimulationOn(ctx.state, 'forbidden')) {
    return;
  }

  throw permissionProblem(
    ctx,
    permission,
    `${reason} The approval records are not writable in this state; writing to them requires the ` +
      `${permission} permission. The roles that hold it are ${rolesWith(permission).join(', ')}.`,
  );
}

/**
 * Refuses the write unless the acting persona holds a permission over the exception at hand.
 *
 * The check is made against the exception as its subject, so the contracts §7.1 matrix applies both
 * the role's plant scope and the persona's own: a planner cannot act on an approval at a plant
 * outside their reach even while another persona in the same role could. The refusal names the
 * permission and the roles that hold it, which is what a disabled action's explanation prints (rule
 * P-8); where the record itself narrows the audience further, the caller says so in `reason`.
 *
 * @param ctx - The call's context.
 * @param permission - The permission the call requires.
 * @param exception - The exception the call concerns, used as the matrix's subject.
 * @param reason - What the call would have done, in plain words, including any further restriction.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function requirePermission(
  ctx: HandlerContext,
  permission: Permission,
  exception: OperationalException,
  reason: string,
): void {
  if (hasPermission(ctx.actor.role, permission, exception, ctx.actor)) {
    return;
  }

  throw permissionProblem(
    ctx,
    permission,
    `The acting role (${ctx.actor.role}) does not hold the ${permission} permission over ` +
      `${exception.plantId}, so ${reason} The roles that hold it are ${rolesWith(permission).join(', ')}.`,
  );
}

/**
 * Says whether an approval is inside the acting role's plant scope.
 *
 * The matrix's own answer, taken with the approval's exception as the subject, so the role's plant
 * scope and the persona's narrower one are applied by the contracts §7.1 rule rather than by a
 * second copy of it (decision 3 in the module header). An approval whose exception the records do
 * not hold cannot be placed and is outside every scope.
 *
 * @param ctx - The call's context, whose actor the matrix is evaluated for.
 * @param state - The session whose records the exception is read from.
 * @param approval - The approval to place.
 * @returns `true` when the approval's exception is inside the effective plant scope.
 */
function landsInScope(ctx: HandlerContext, state: MockState, approval: Approval): boolean {
  const exception = exceptionOf(state, approval);

  if (exception === undefined) {
    return false;
  }

  return hasPermission(ctx.actor.role, EXCEPTION_READ, exception, ctx.actor);
}

/**
 * The approval a read of this family resolves, or the failure that names why it could not.
 *
 * A record the session does not hold and one it holds outside the acting role's plant scope are
 * refused alike, and the second names the plants the role does reach so a reader learns why the
 * identifier they were given answers nothing (rule P-8).
 *
 * @param ctx - The call's context: the persona the scope is resolved for and the state read.
 * @param id - The approval identifier the call names.
 * @returns The approval record.
 * @throws Problem - A `'not-found'` failure naming the identifier and, where the record exists
 *   outside the role's reach, the plants that role covers.
 */
function approvalOrThrow(ctx: HandlerContext, id: ApprovalId): Approval {
  const approval = findApproval(ctx.state, id);

  if (approval === undefined) {
    throw notFoundProblem(
      ctx,
      `No approval record answers ${id}. The records this session holds are ` +
        `${approvalsFor(ctx.state)
          .map((record) => record.id)
          .join(', ')}.`,
    );
  }

  if (!landsInScope(ctx, ctx.state, approval)) {
    throw notFoundProblem(
      ctx,
      `${id} is not an approval this read covers: it belongs to ${approval.exceptionId}, which is ` +
        `outside the acting role's plant scope (${ctx.actor.role}: ${plantScopeFor(ctx.actor.role).join(', ')}).`,
    );
  }

  return approval;
}

/* ---------------------------------------------------------------------------------------------
 * E. The order-book gate — AAP 0.2.1, AAP 0.12.3, T-13
 * ------------------------------------------------------------------------------------------- */

/**
 * The order-book source's freshness as the popover's triggers leave it.
 *
 * One record, read from `freshnessFor(state)` and never rebuilt here, so the banner a screen raises,
 * the instant a tooltip prints and the refusal below quote one answer rather than two.
 *
 * @param ctx - The call's context, whose triggers and seeded source health are read.
 * @returns The order-book source's freshness record.
 * @throws Problem - A `'validation'` failure when the source catalogue reports no health at all,
 *   because the gate would then have no state to decide on.
 */
function orderBookFreshness(ctx: HandlerContext): Freshness {
  const report = freshnessFor(ctx.state);
  const orderBook = report.find((entry) => entry.source === ORDER_BOOK_SOURCE);

  if (orderBook !== undefined) {
    return orderBook;
  }

  throw validationProblem(
    ctx,
    `The source catalogue reports no health for ${SOURCE_LABELS[ORDER_BOOK_SOURCE]}, so an approval ` +
      'cannot be written against it.',
  );
}

/**
 * Refuses the call while the order book is stale or unavailable — AAP 0.2.1, AAP 0.12.3.
 *
 * The rule has two halves and this is the half a bypassed control cannot escape: every screen
 * offering the action also renders the stale banner and disables the control with the same reason,
 * and the adapter refuses the call whether or not a screen offered it. `partial` does not refuse: a
 * source that answered incompletely has disclosed its missing inputs on the records that carry them,
 * which is what `FreshnessState` documents, while `stale` and `unavailable` mean the source's
 * contribution cannot be relied on at all.
 *
 * Nothing is written before this runs, which is what makes a refused call create no approval, no
 * write-back state change and no audit record.
 *
 * @param ctx - The call's context, whose triggers and seeded source health are read.
 * @throws Problem - A `'validation'` failure naming the source's label and the instant it last
 *   answered, and stating what the reader has to do about it.
 */
function requireFreshOrderBook(ctx: HandlerContext): void {
  const freshness = orderBookFreshness(ctx);

  if (freshness.state !== 'stale' && freshness.state !== 'unavailable') {
    return;
  }

  const source = SOURCE_LABELS[freshness.source];

  throw validationProblem(
    ctx,
    `${source} last answered at ${freshness.asOf} and is reported ${freshness.state}, so an approval ` +
      'cannot be requested or decided against it. The freshness strip shows the same state, and this ' +
      `action stays unavailable until ${source} answers again.`,
  );
}

/* ---------------------------------------------------------------------------------------------
 * F. The facts POL-003 reads — contracts §7.2, AAP 0.8
 * ------------------------------------------------------------------------------------------- */

/**
 * The record facts the policy engine is handed, read from the session's own records.
 *
 * `PolicyRecords` requires three members and POL-003 reads one of them: the approvals, so the rule
 * can name the requester it refuses. POL-005 reads none of them, because the option's own constraint
 * check is the fact its caller states. The outbound allowed list is the declared configuration of the
 * sovereignty ledger, computed from records rather than asserted (AAP 0.10), and the catalogue is
 * the seeded one, so no fact here is this module's own.
 *
 * @param records - The session's record set.
 * @returns The facts `evaluate` reads.
 */
function policyRecordsFor(records: SeedRecordSet): PolicyRecords {
  return {
    outboundAllowedList: records.sovereignty.ledger
      .filter((endpoint) => endpoint.state === 'allowed')
      .map((endpoint) => endpoint.endpoint),
    approvals: records.approvals,
    modelCatalogue: records.modelCatalogue,
  };
}

/**
 * The failure a policy's refusal produces, and the policy-actor event that records it.
 *
 * The order is the point: the event is appended first, through the one append path of `./audit.ts`,
 * so the `auditEventId` the failure carries names a record that already exists when the screen opens
 * it. The event names the rule as its actor, as the seeded trail's own blocks do, and the rule, the
 * reason and the permitted alternative are reported from the engine's decision unchanged, so the
 * disabled control cannot disagree with the verdict that was taken (rule P-8). No approval, no
 * write-back state and no success record is created by a refused decision.
 *
 * What the event is about is the caller's: a decision POL-003 refuses points at the approval it would
 * have decided, and a request POL-005 refuses points at the exception whose option it would have sent,
 * because no approval exists yet for that one to name. Each caller states the reference and the
 * `after` payload the trail records for its own action, so one conversion serves both rules and the
 * two blocks cannot diverge in shape.
 *
 * @param ctx - The call's context, whose chain is extended in place.
 * @param decision - The engine's denial.
 * @param audit - The record the event is about and the values the refused action would have changed.
 * @returns The `'policy'` failure to throw.
 * @throws Error - The denial named no rule, which the engine never does; the refusal could not be
 *   reported without inventing the rule that caused it.
 */
async function policyDenialProblem(
  ctx: HandlerContext,
  decision: PolicyDecision,
  audit: { readonly objectRef: string; readonly after: AuditPayload },
): Promise<Problem> {
  const rule: PolicyId | undefined = decision.policyId;

  if (rule === undefined) {
    throw new Error(
      'The policy engine returned a denial without naming the rule that caused it, so the refusal ' +
        'cannot be reported. Every denial from src/domain/policy/evaluate.ts names its rule.',
    );
  }

  const event = await appendAuditEvent(ctx, {
    action: POLICY_BLOCK_ACTION,
    objectRef: audit.objectRef,
    result: BLOCKED_RESULT,
    policyId: rule,
    actorType: 'policy',
    actorId: rule,
    before: null,
    after: audit.after,
  });

  return {
    type: 'policy',
    message: decision.reason ?? `${rule} refused this action without stating a further reason.`,
    traceId: traceIdFor(ctx.state),
    policyId: rule,
    ...(decision.permittedAlternative === undefined
      ? {}
      : { permittedAlternative: decision.permittedAlternative }),
    auditEventId: event.id,
  };
}

/**
 * Refuses a decision POL-003 denies, before the matrix is consulted.
 *
 * The requester of an approval never decides it, and the engine owns that rule; asking it first
 * means a requester's own attempt is answered with the rule and its reason rather than with a
 * permission failure they could not act on (decision 4 in the module header). An approval the
 * records do not hold yields `notApplicable` here, which cannot happen for a record this module has
 * already resolved, and no verdict is invented for it.
 *
 * @param ctx - The call's context: the persona the rule compares and the chain a denial extends.
 * @param approval - The approval the decision is about.
 * @throws Problem - A `'policy'` failure carrying POL-003, its reason and the event it appended.
 */
async function requireDecidableByPolicy(ctx: HandlerContext, approval: Approval): Promise<void> {
  const decision = evaluate(
    { action: 'approval.decide', approvalId: approval.id },
    ctx.actor,
    policyRecordsFor(ctx.state.records),
  );

  if (decision.outcome === 'deny') {
    throw await policyDenialProblem(ctx, decision, {
      objectRef: approval.id,
      after: {
        approvalId: approval.id,
        exceptionId: approval.exceptionId,
        requestedBy: approval.requestedBy,
        status: approval.status,
      },
    });
  }
}

/**
 * Refuses a request to send an option whose constraint check fails — POL-005, AAP F7.
 *
 * The gate is the policy engine's, not this module's: `requestApproval` hands it the option's own
 * check and the breaches that check reported, exactly as it would hand a question's material
 * context, and a failing check comes back as a denial under POL-005 whose reason states the solver's
 * message (AAP 0.12.2, and the rule `src/seed/policies.ts` records). The refusal appends a
 * policy-actor event about the exception — the record the request was made against, because no
 * approval exists yet for it to name — and the failure carries that event's identifier (AAP 0.8).
 *
 * @param ctx - The call's context: the persona asking and the chain a denial extends.
 * @param exceptionId - The exception the option answers.
 * @param scenario - The option the request would send.
 * @throws Problem - A `'policy'` failure carrying POL-005, its reason and the event it appended.
 */
async function requireRequestableByPolicy(
  ctx: HandlerContext,
  exceptionId: ExceptionId,
  scenario: Scenario,
): Promise<void> {
  const decision = evaluate(
    {
      action: 'approval.request',
      scenarioId: scenario.id,
      constraintCheck: scenario.constraintCheck,
      constraintMessages: scenario.constraintMessages,
    },
    ctx.actor,
    policyRecordsFor(ctx.state.records),
  );

  if (decision.outcome === 'deny') {
    throw await policyDenialProblem(ctx, decision, {
      objectRef: exceptionId,
      after: {
        exceptionId,
        scenarioId: scenario.id,
        constraintCheck: scenario.constraintCheck,
        constraintMessages: [...scenario.constraintMessages],
      },
    });
  }
}

/* ---------------------------------------------------------------------------------------------
 * G. The conflict, the comment and the decision's status — AAP 0.12.4 SCR-05
 * ------------------------------------------------------------------------------------------- */

/**
 * Refuses a write whose record moved under the reader — AAP 0.12.4 SCR-05.
 *
 * The conflicting-update state needs a failure with a cause, and `ProblemType` fixes five causes
 * none of which is a conflict, so it is reported as `'validation'` with a message stating what
 * happened (decision 2 in the module header). Two ways to meet it: the simulation's `conflict`
 * trigger, which stands for a record another persona changed between the read and the write, and a
 * record the write's own precondition already rules out.
 *
 * @param ctx - The call's context, whose triggers are read and whose state supplies the trace.
 * @param message - The reason in plain words, naming the record and what has happened to it.
 * @throws Problem - A `'validation'` failure with that message.
 */
function requireNoConflict(ctx: HandlerContext, message: string): void {
  if (isSimulationOn(ctx.state, 'conflict')) {
    throw validationProblem(
      ctx,
      `This record changed since it was read, and the change is refused rather than merged. ${message}`,
    );
  }
}

/**
 * Refuses a decision whose comment is blank.
 *
 * SCR-05 takes a comment with each of its three decisions, and AAP 0.12.2 records the comment as a
 * required member of the decision, so a blank one is refused before any record is written: the trail
 * keeps what the decider said, and an empty comment leaves a reader with a decision and no reason
 * for it.
 *
 * The call's `comment` argument is authoritative — it is the text the reader typed — and the record
 * the approval keeps carries it, so the two cannot disagree.
 *
 * @param ctx - The call's context, whose state supplies the trace.
 * @param comment - The submitted comment, already trimmed by the caller.
 * @throws Problem - A `'validation'` failure naming the decision that needs a comment.
 */
function requireComment(ctx: HandlerContext, comment: string): void {
  if (comment !== '') {
    return;
  }

  throw validationProblem(
    ctx,
    'Every decision on an approval carries a comment the audit trail keeps — approving, rejecting ' +
      'and requesting changes alike — and this one is blank.',
  );
}

/**
 * The status a decision leaves the approval in.
 *
 * @param ctx - The call's context, whose state supplies the trace.
 * @param decision - The decision being taken.
 * @returns The status the record is set to.
 * @throws Problem - A `'validation'` failure naming an action the records do not recognise, which a
 *   typed caller cannot produce and a browser console can.
 */
function statusForDecision(ctx: HandlerContext, decision: Decision): ApprovalStatus {
  const status: ApprovalStatus | undefined = STATUS_FOR_DECISION[decision.action];

  if (status === undefined) {
    throw validationProblem(
      ctx,
      `The decision states the action "${String(decision.action)}", which is not one an approval ` +
        'answers: a plan is approved, rejected or sent back for changes.',
    );
  }

  return status;
}

/* ---------------------------------------------------------------------------------------------
 * H. Ordering and paging the inbox — contracts §9 list parameters
 * ------------------------------------------------------------------------------------------- */

/**
 * The approval members a caller may order the inbox by, spelled as `sort=field:dir` names them.
 *
 * The set is the record's own readable members rather than a display concept, and an unknown member
 * falls back to the default ordering rather than failing a read a screen can recover from.
 */
const SORTABLE_FIELDS = [
  'id',
  'status',
  'exceptionId',
  'addedCostEur',
  'protectedRevenueEur',
  'decidedAt',
] as const;

/** One member of `SORTABLE_FIELDS`. */
type ApprovalSortField = (typeof SORTABLE_FIELDS)[number];

/** One ordering: the member to order by and the direction to read it in. */
interface ApprovalSortOrder {
  /** The member ordered by. */
  readonly field: ApprovalSortField;

  /** Whether the order runs from the greatest value to the least. */
  readonly descending: boolean;
}

/**
 * The ordering a read uses when it names none: the identifier, ascending.
 *
 * The seeded records are ordered by identifier, so an unqualified inbox reads as the dataset reads
 * and a reader recognises it. The newest decision is one `sort=decidedAt:desc` away, and a plan
 * awaiting a decision carries no decision instant, which sorts it before every decided one in that
 * order rather than dropping it.
 */
const DEFAULT_SORT_ORDER: ApprovalSortOrder = { field: 'id', descending: false };

/** Whether a string names a member the inbox may be ordered by. */
function isSortField(value: string): value is ApprovalSortField {
  return SORTABLE_FIELDS.some((field) => field === value);
}

/**
 * The ordering a `sort=field:dir` parameter asks for, or the default when it asks for none this list
 * can honour.
 *
 * The parameter's form is contracts §9's: the member, a colon, then `asc` or `desc`. A member the
 * record does not order by, or a direction spelled in another form, yields the default ordering
 * rather than a failure — a read that can answer is worth more than a refusal over a presentation
 * hint.
 *
 * @param sort - The parameter as the query carried it, or `undefined` when it carried none.
 * @returns The ordering to apply.
 */
function sortOrderOf(sort: string | undefined): ApprovalSortOrder {
  if (sort === undefined) {
    return DEFAULT_SORT_ORDER;
  }

  const [field, direction] = sort.split(':');

  if (field === undefined || !isSortField(field)) {
    return DEFAULT_SORT_ORDER;
  }

  if (direction === undefined || direction === 'asc') {
    return { field, descending: false };
  }

  return direction === 'desc' ? { field, descending: true } : DEFAULT_SORT_ORDER;
}

/** Orders two strings by their own lexical order, which is also ISO 8601's for a single offset. */
function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  return left > right ? 1 : 0;
}

/** Orders two numbers by their own order. */
function compareNumbers(left: number, right: number): number {
  return left - right;
}

/**
 * The value one sortable member holds on an approval, compared in its own type.
 *
 * The two euro members are numbers and compare numerically; a decision instant compares as text,
 * which is its instant order because every record in this build carries the one offset contracts §1
 * fixes; the identifier, the status and the exception identifier compare as text. A pending
 * approval's absent decision instant compares as an empty string, so it stands before every decided
 * plan rather than being dropped from the ordering.
 *
 * @param left - One approval.
 * @param right - The other.
 * @param field - The member to compare.
 * @returns A negative number when `left` comes first and a positive one when `right` does.
 */
function compareField(left: Approval, right: Approval, field: ApprovalSortField): number {
  if (field === 'addedCostEur') {
    return compareNumbers(left.addedCostEur, right.addedCostEur);
  }

  if (field === 'protectedRevenueEur') {
    return compareNumbers(left.protectedRevenueEur, right.protectedRevenueEur);
  }

  if (field === 'decidedAt') {
    return compareText(left.decidedAt ?? '', right.decidedAt ?? '');
  }

  return compareText(left[field], right[field]);
}

/**
 * Orders two approvals by one ordering, and by identifier where the ordered members are equal.
 *
 * @param left - One approval.
 * @param right - The other.
 * @param order - The ordering to apply.
 * @returns A negative number when `left` comes first and a positive one when `right` does; the
 *   identifier breaks every tie in the same direction, so no pair is unordered.
 */
function compareApprovals(left: Approval, right: Approval, order: ApprovalSortOrder): number {
  const primary = compareField(left, right, order.field);

  if (primary !== 0) {
    return order.descending ? -primary : primary;
  }

  return order.descending ? compareText(right.id, left.id) : compareText(left.id, right.id);
}

/**
 * The position in an ordered page from which a cursor continues.
 *
 * The cursor is opaque to a caller and holds the identifier of the last record the previous page
 * returned, so the next page starts at the record that follows it in the requested order and a page
 * boundary can neither repeat nor skip a record however the inbox has changed in between. A cursor
 * that names no record of this page — a malformed one, or one from an ordering the caller has since
 * changed — is refused rather than silently restarted, because a page beginning again at the top
 * would read as a truncated inbox.
 *
 * @param ordered - The visible approvals, already in the requested order.
 * @param cursor - The identifier the previous page ended at, or `undefined` for the first page.
 * @param ctx - The call's context, whose state supplies the trace a refusal carries.
 * @returns The index the page starts at.
 * @throws Problem - A `'validation'` failure when the cursor names no record of the ordered page.
 */
function startIndexOf(
  ordered: readonly Approval[],
  cursor: string | undefined,
  ctx: HandlerContext,
): number {
  if (cursor === undefined) {
    return 0;
  }

  const found = ordered.findIndex((approval) => approval.id === cursor);

  if (found < 0) {
    throw validationProblem(
      ctx,
      `The approval cursor ${cursor} is not a record of this inbox in the requested order.`,
    );
  }

  return found + 1;
}

/**
 * The greatest number of records a page may hold, or `null` when the query sets no boundary.
 *
 * A parameter that is absent, not an integer, or not positive asks for no page rather than for an
 * empty one: contracts §9 leaves `limit` optional, and a screen that omits it wants the inbox.
 *
 * @param limit - The parameter as the query carried it.
 * @returns The page's greatest length, or `null` for every remaining record.
 */
function limitOf(limit: number | undefined): number | null {
  if (limit === undefined || !Number.isInteger(limit) || limit <= 0) {
    return null;
  }

  return limit;
}

/* ---------------------------------------------------------------------------------------------
 * I. Copies — the records a caller may not reach behind
 * ------------------------------------------------------------------------------------------- */

/**
 * A copy of one approval, its write-backs and its decision.
 *
 * The session holds the record and mutates it; a caller that edited what it was handed would edit
 * the session, so every read and every write returns a copy whose arrays and nested records are its
 * own. The write-back order is the record's own and is preserved exactly — it is the tracker's step
 * order (AAP 0.7, T-08).
 *
 * @param approval - The record to copy.
 * @returns The copy.
 */
function copyApproval(approval: Approval): Approval {
  return {
    ...approval,
    ...(approval.decision === undefined ? {} : { decision: { ...approval.decision } }),
    writeBacks: approval.writeBacks.map((step) => ({ ...step })),
  };
}

/* ---------------------------------------------------------------------------------------------
 * J. The plan's measurement — AAP 0.8, AAP 0.12.1 solver row
 * ------------------------------------------------------------------------------------------- */

/**
 * The solver case an exception is measured against, or the failure that says why it cannot be.
 *
 * Resolved by the case the exception names, and otherwise by the case that names the exception, so a
 * record whose `solverCaseId` was not populated is still measured against its own case. An exception
 * with no case at all is refused rather than measured against another disruption's supply position:
 * that would be a figure nothing computed (rule P-6). Only the exception the records carry a case
 * for is measurable, which is the demonstration's own journey.
 *
 * @param ctx - The call's context, whose records are read.
 * @param exception - The exception whose plan is being measured.
 * @returns The exception's solver case.
 * @throws Problem - A `'validation'` failure naming the exception, because the outcome card shows
 *   "Cannot compute" with the reason rather than a partial figure (AAP 0.8).
 */
function solverCaseFor(ctx: HandlerContext, exception: OperationalException): SolverCase {
  const cases = ctx.state.records.solverCases;
  const named =
    exception.solverCaseId === undefined
      ? undefined
      : cases.find((candidate) => candidate.id === exception.solverCaseId);
  const found = named ?? cases.find((candidate) => candidate.exceptionId === exception.id);

  if (found === undefined) {
    throw validationProblem(
      ctx,
      `The records carry no solver case for ${exception.id}, so the plan's measures cannot be ` +
        'computed and the outcome card has nothing to compare.',
    );
  }

  return found;
}

/**
 * One option, resolved inside the options a set states.
 *
 * Split out of `scenarioOrThrow` so a caller that needs the set's other options as well — the
 * do-nothing position `plannedFiguresFor` weighs the plan against — reads the set once instead of
 * twice, and both reads then see the same options.
 *
 * @param ctx - The call's context, whose records the failure names.
 * @param exceptionId - The exception the option belongs to.
 * @param scenarioId - The option wanted.
 * @param scenarios - The options the set states.
 * @returns The option.
 * @throws Problem - A `'not-found'` failure when no option carries that identifier.
 */
function optionOrThrow(
  ctx: HandlerContext,
  exceptionId: ExceptionId,
  scenarioId: ScenarioId,
  scenarios: readonly Scenario[],
): Scenario {
  const scenario = scenarios.find((option) => option.id === scenarioId);

  if (scenario === undefined) {
    const measured = scenarios.map((option) => option.id).join(', ');

    throw notFoundProblem(
      ctx,
      `No option measured for ${exceptionId} answers ${scenarioId}. The options this record set ` +
        `states for it are ${measured === '' ? 'none at all' : measured}.`,
    );
  }

  return scenario;
}

/**
 * The option an approval puts forward, within the option set measured for its exception.
 *
 * The set comes from `./scenarios.ts`, which is the one module that composes an option — measured
 * from the exception's case for the supply-delay decision, returned as shipped for the seeded ones —
 * so the levers below are the option's own and no second measurement is taken here.
 *
 * @param ctx - The call's context, whose records and persona the set is read for.
 * @param exceptionId - The exception the approval belongs to.
 * @param scenarioId - The option the approval names.
 * @returns The option.
 * @throws Problem - Whatever the set's read throws, or a `'not-found'` failure when the set holds
 *   no option with that identifier.
 */
async function scenarioOrThrow(
  ctx: HandlerContext,
  exceptionId: ExceptionId,
  scenarioId: ScenarioId,
): Promise<Scenario> {
  const set: ScenarioSet = await getScenarioSet(ctx, exceptionId);

  return optionOrThrow(ctx, exceptionId, scenarioId, set.scenarios);
}

/**
 * The delayed revenue the set's unmitigated position leaves — the delay a plan is weighed against.
 *
 * The unmitigated position is the disruption with nothing done about it, and every set states it as the
 * option no lever position improves on: an option's delayed revenue is the late units priced, and pulling
 * a lever can only reduce them, so the set's greatest `revenueDelayedEur` is the path the disruption
 * takes when no option is carried out. For a set measured from an exception's case it is the baseline AAP
 * 0.8 fixes by name, which `candidateOptions` in `./scenarios.ts` always lists first at both levers
 * unpulled; for a seeded set it is the option whose measures the records themselves describe as repeating
 * the unmitigated path (the seeded sets carry it as their rejected, over-bound option). Every set the
 * service serves states at least the option a caller asks for, so the reading is always available and no
 * figure is invented in its place.
 *
 * @param scenarios - The options of the set the approval's option came from.
 * @returns The delayed revenue the unmitigated position leaves.
 */
function unmitigatedDelayedRevenueOf(scenarios: readonly Scenario[]): Money {
  let greatest: Money = 0;

  for (const option of scenarios) {
    if (option.revenueDelayedEur > greatest) {
      greatest = option.revenueDelayedEur;
    }
  }

  return greatest;
}

/**
 * The two euro figures an approval carries: what the plan spends, and the delay it protects.
 *
 * `Approval` requires an added cost and a protected revenue (AAP 0.12.2), and SCR-05 shows the pair as
 * cost against protected revenue (AAP 0.12.4). The cost is the option's own `addedCostEur`, untouched.
 * The protected figure is the delayed revenue the plan avoids, which is the figure AAP 0.8 states the
 * spend buys: the delayed revenue the do-nothing position leaves, less the delayed revenue the option
 * itself still leaves. Carrying the option's own residual instead reads a better option as protecting
 * less than a worse one, and the do-nothing option as protecting the whole disruption.
 *
 * The unmitigated figure is the set's greatest delayed revenue (see `unmitigatedDelayedRevenueOf`), so it
 * is never below the option's own residual and the difference needs no floor. The option that repeats the
 * unmitigated path itself protects nothing, which is what a plan that changes nothing buys.
 *
 * Both measures are the solver's own: `SolverCase` carries the price each order was agreed at and the
 * rate each lever costs, so `solveSupplyDelay` reports a real added cost and a real delayed revenue for
 * an option it measures, and this pair is computed from them rather than from a typed figure. A seeded
 * plan keeps the figures its own record states, because a shipped option is not re-solved.
 *
 * @param scenario - The option the approval puts forward.
 * @param unmitigatedDelayedEur - The delayed revenue the set's unmitigated position leaves.
 * @returns The pair the approval record carries.
 */
function plannedFiguresFor(
  scenario: Scenario,
  unmitigatedDelayedEur: Money,
): Pick<Approval, 'addedCostEur' | 'protectedRevenueEur'> {
  return {
    addedCostEur: scenario.addedCostEur,
    protectedRevenueEur: unmitigatedDelayedEur - scenario.revenueDelayedEur,
  };
}

/**
 * The identifier a new approval takes, derived from the identifiers the records hold.
 *
 * contracts §1 fixes the `APR-<year>-nnn` form and no input states which number a new record takes,
 * so the next number follows the highest one the session holds. Deriving it keeps the identifier
 * inside the form, keeps it unique within the session, and types no record identifier here (rule
 * P-6); a record set that gains a later identifier moves the next one with it.
 *
 * @param approvals - The approvals the session holds.
 * @returns The identifier the new record takes.
 */
function nextApprovalIdentifier(approvals: readonly Approval[]): ApprovalId {
  let highest = 0;

  for (const approval of approvals) {
    const parts = approval.id.split(IDENTIFIER_SEPARATOR);
    const last = parts[parts.length - 1];
    const sequence = last === undefined ? Number.NaN : Number.parseInt(last, 10);

    if (Number.isFinite(sequence) && sequence > highest) {
      highest = sequence;
    }
  }

  const next = String(highest + 1).padStart(APPROVAL_SEQUENCE_DIGITS, '0');

  return `${APPROVAL_ID_PREFIX}${APPROVAL_YEAR}${IDENTIFIER_SEPARATOR}${next}`;
}

/* ---------------------------------------------------------------------------------------------
 * K. The write-back tracker — AAP 0.2.1, AAP 0.12.4 SCR-05, rule P-1
 * ------------------------------------------------------------------------------------------- */

/**
 * Moves one step to its new state and records the transition in the trail.
 *
 * The step is changed first and the event second, so the record a reader opens already holds the
 * state the event describes. The event names the approval as the record it is about — which is what
 * the ledger and the audit screen follow — and carries the step's own position, system and reference
 * on both halves, so the transition reads without opening the approval. The outcome is the
 * `'succeeded'` or `'failed'` result contracts §6 and AAP 0.2.2 give a write; a step is never
 * recorded as allowed or blocked, because those are the policy outcomes.
 *
 * @param ctx - The call's context, whose chain the event is appended to.
 * @param approval - The approval the step belongs to.
 * @param step - The step being moved. Its state is changed here.
 * @param from - The state the step stood in.
 * @param to - The state it moves to.
 */
async function recordStep(
  ctx: HandlerContext,
  approval: Approval,
  step: WriteBack,
  from: WriteBackState,
  to: WriteBackState,
): Promise<void> {
  step.state = to;

  await appendAuditEvent(ctx, {
    action: WRITE_BACK_ACTION,
    objectRef: approval.id,
    result: to === SUCCEEDED_STEP ? SUCCEEDED_RESULT : FAILED_RESULT,
    before: { state: from, recordRef: step.recordRef },
    after: {
      sequence: step.sequence,
      system: step.system,
      recordRef: step.recordRef,
      state: to,
    },
  });
}

/**
 * The failure's own message for a step whose write did not complete.
 *
 * It names the step, the reference it would have written and the system it writes to, and it states
 * what the all-or-nothing rule did next: no later step ran and no part of the change was applied.
 * The fixed `Simulated write-back` label is not repeated here — the tracker renders it beside this
 * message — so the label is neither paraphrased nor supplemented with a second failed-write wording
 * (rule P-1).
 *
 * @param approval - The approval the step belongs to.
 * @param step - The step that failed.
 * @returns The message the thrown failure carries, which the tracker shows beside its tag.
 */
function stepFailureMessage(approval: Approval, step: WriteBack): string {
  return (
    `Write-back step ${step.sequence} of ${approval.id} did not complete: the simulated write of ` +
    `${step.recordRef} to ${SOURCE_LABELS[step.system]} was refused, so no part of the approved ` +
    'change was applied and no later step ran.'
  );
}

/**
 * Runs the steps the change has not yet written, in the record's own order.
 *
 * A step that already succeeded is skipped, which is what stops a second success record ever being
 * written for it. With `failOnFirstStep` set — the simulation's partial-failure trigger — the first
 * step that has not succeeded ends in `'failed'` and the run stops there: the change is
 * all-or-nothing, so nothing after it runs, the steps it did not reach stay `'pending'`, and the call
 * throws the failure that step produced. Otherwise every step the run reaches ends in `'succeeded'`.
 *
 * @param ctx - The call's context, whose chain each transition is recorded in.
 * @param approval - The approval whose steps are run. Its write-backs are changed in place.
 * @param failOnFirstStep - Whether the run stops at the first step it reaches with a failure.
 * @throws Problem - A `'simulated-write-back'` failure when a step did not complete.
 */
async function advanceWriteBacks(
  ctx: HandlerContext,
  approval: Approval,
  failOnFirstStep: boolean,
): Promise<void> {
  for (const step of approval.writeBacks) {
    if (step.state === SUCCEEDED_STEP) {
      continue;
    }

    if (failOnFirstStep) {
      const message = stepFailureMessage(approval, step);

      await recordStep(ctx, approval, step, step.state, FAILED_STEP);

      throw writeBackProblem(ctx, message);
    }

    await recordStep(ctx, approval, step, step.state, SUCCEEDED_STEP);
  }
}

/**
 * Whether every step of the change was written.
 *
 * The whole point of the all-or-nothing rule: a change lands when all of its steps succeeded, and an
 * approval with no steps at all has nothing to withhold, so it has landed. The outcome card's
 * resulting figures are measured at the plan's levers when this holds and at the do-nothing levers
 * when it does not (AAP 0.2.2).
 *
 * @param approval - The approval whose steps are read. Not modified.
 * @returns `true` when no step is pending or failed.
 */
function changeLanded(approval: Approval): boolean {
  return approval.writeBacks.every((step) => step.state === SUCCEEDED_STEP);
}

/**
 * The write-back step a reference names, or the failure that says why it names none.
 *
 * `WriteBack` declares no identifier member, and the tracker's retry control calls its handler with
 * the step's `recordRef` — the record's own reference for what it writes — so that reference is the
 * key a retry names (decision 6 in the module header). The failure lists the references the approval
 * holds, which is what a reader needs to address a step correctly instead of guessing.
 *
 * @param ctx - The call's context, whose state supplies the trace.
 * @param approval - The approval whose steps are searched.
 * @param writeBackId - The reference the call names.
 * @returns The step.
 * @throws Problem - A `'not-found'` failure naming the reference and the steps the approval holds.
 */
function writeBackOrThrow(ctx: HandlerContext, approval: Approval, writeBackId: string): WriteBack {
  const reference = writeBackId.trim();
  const step = approval.writeBacks.find((candidate) => candidate.recordRef === reference);

  if (step === undefined) {
    const held = approval.writeBacks.map((candidate) => candidate.recordRef).join(', ');

    throw notFoundProblem(
      ctx,
      `No write-back step of ${approval.id} answers the reference "${writeBackId}". The steps this ` +
        `approval holds are ${held === '' ? 'none at all' : held}.`,
    );
  }

  return step;
}

/**
 * Refuses a decision the approval's own record does not open to the acting role.
 *
 * `Approval.eligibleApproverRoles` is the record's own audience — AAP 0.12.2 fixes it, and POL-003
 * excludes the requester from it — so a role the matrix lets decide may still not decide *this*
 * plan: the seeded plans for `EXC-2026-1185`, `EXC-2026-1187` and `EXC-2026-1195` name the head of
 * supply chain alone, while the matrix also lets a plant manager decide a plan. The refusal reuses the
 * decision's permission so a disabled control prints one shape, and its reason names the roles this
 * record opens to, which is what a reader has to know (rule P-8).
 *
 * @param ctx - The call's context, whose actor the record's audience is compared with.
 * @param approval - The approval the decision is about.
 * @throws Problem - A `'permission'` failure naming the roles the record opens to.
 */
function requireRecordEligibility(ctx: HandlerContext, approval: Approval): void {
  if (approval.eligibleApproverRoles.includes(ctx.actor.role)) {
    return;
  }

  const named = approval.eligibleApproverRoles.join(', ');

  throw permissionProblem(
    ctx,
    APPROVAL_DECIDE,
    `${approval.id} names the roles ${named === '' ? 'none at all' : named} as the ones that may ` +
      `decide it, and the acting role (${ctx.actor.role}) is not among them.`,
  );
}

/* ---------------------------------------------------------------------------------------------
 * L. The plan's outcome — AAP 0.12.4 SCR-05, rule P-6
 *
 * The shape the outcome card reads, `ApprovalOutcome`, is declared in `src/types/screen-dto.ts`: the
 * port resolves it and imports `src/types` alone (rule P-2). Both of its measurements are
 * `solveSupplyDelay`'s own output — the plan taken at its option's levers, the records taken at the
 * levers the change actually reached — so nothing in this module computes a difference for the card,
 * and AAP 0.2.2's all-or-nothing rule is what decides whether the change landed at all.
 * ------------------------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------------------------
 * M. The public surface — AAP 0.12.1 handlers row, AAP 0.12.3 approval paths
 * ------------------------------------------------------------------------------------------- */

/**
 * Reads the approval inbox: the plans inside the acting role's plant scope, ordered and paged.
 *
 * The scope is the contracts §7.1 matrix's own answer per record, so an approval at a plant the role
 * does not reach is not handed out and the count a screen shows is the count it may act on. The
 * ordering is `sort=field:dir` over the record's own members, the default is the identifier
 * ascending, `limit` bounds the page and `cursor` continues it — the list parameters contracts §9
 * fixes for every list read. Each returned record is a copy, so a caller cannot reach the session
 * through what it was handed.
 *
 * Declared asynchronous to match the port's promise-returning reads, so the adapter awaits one shape
 * for every call; the body awaits nothing and performs no I/O.
 *
 * @param ctx - The call's context: the persona the scope is resolved for, the triggers and the records.
 * @param query - The ordering and page position the read carries.
 * @returns One page of the visible approvals, in the requested order.
 * @throws Problem - A `'permission'` failure when the plans are not readable, or a `'validation'`
 *   one when the cursor names no record of the ordered page.
 */
export async function listApprovals(ctx: HandlerContext, query: ListQuery): Promise<Approval[]> {
  requireRead(ctx);

  const visible = approvalsFor(ctx.state).filter((approval) =>
    landsInScope(ctx, ctx.state, approval),
  );
  const order = sortOrderOf(query.sort);
  const ordered = [...visible].sort((left, right) => compareApprovals(left, right, order));
  const start = startIndexOf(ordered, query.cursor, ctx);
  const limit = limitOf(query.limit);
  const page = limit === null ? ordered.slice(start) : ordered.slice(start, start + limit);

  return page.map(copyApproval);
}

/**
 * Reads one approval: its plan reference, its audience, its decision fields and its write-backs.
 *
 * The write-backs come back in the record's own order, which is the tracker's step order, and
 * nothing here sorts them (AAP 0.7, T-08). An identifier the session does not hold, and one it holds
 * outside the acting role's plant scope, are both refused as not found, which is what
 * `./exceptions.ts` does with the same pair.
 *
 * @param ctx - The call's context: the persona the scope is resolved for and the records read.
 * @param id - The approval identifier the call names.
 * @returns The approval, as a copy.
 * @throws Problem - A `'permission'` failure when the plans are not readable, or a `'not-found'` one
 *   when the identifier answers no record inside the role's scope.
 */
export async function getApproval(ctx: HandlerContext, id: ApprovalId): Promise<Approval> {
  requireRead(ctx);

  return copyApproval(approvalOrThrow(ctx, id));
}

/**
 * Puts one option forward for approval and records the request.
 *
 * The order the checks run in is the order the rules are stated in, and nothing is written before
 * the last of them passes: the forbidden trigger, the exception's existence and the actor's
 * permission over it, the order-book gate (AAP 0.2.1 — a stale or unavailable source refuses the
 * request and creates no record), the option's own constraint check, which the policy engine decides
 * as POL-005 (an option that cannot be measured is refused with the rule and the breach rather than
 * put forward, and the refusal appends its policy-actor event), and only then the record and its
 * event.
 *
 * What the record carries. The requester is the acting persona, never a caller's claim. The audience is
 * the roles the matrix lets decide a plan at the exception's own plant, less the requester's own role:
 * POL-003 reads as the requester's role being absent from the list, and every role named can reach the
 * record, so a disabled control never offers a decider the decision path would then refuse (rule P-8).
 * The two euro members are the plan's cost and the delay it protects — the option's own `addedCostEur`,
 * and the delayed revenue the unmitigated position leaves less the option's own residual, which is the
 * figure AAP 0.8 states the spend buys
 * (see `plannedFiguresFor`). The write-backs are the option's, reset to pending, in the option's
 * order — an approval starts a run without any step of it written.
 *
 * One event is appended, through the single append path of `./audit.ts`, naming the approval as the
 * record it is about and carrying the same payload shape the seeded trail's own requests carry.
 *
 * @param ctx - The call's context: the persona requesting, the records read and the session written.
 * @param exceptionId - The exception the plan answers.
 * @param scenarioId - The option the plan puts forward.
 * @returns The created approval, as a copy.
 * @throws Problem - A `'permission'` failure when the role may not request or while the forbidden
 *   trigger is on, a `'not-found'` failure for an exception or an option the records do not answer, a
 *   `'validation'` failure when the order book is stale or unavailable or when no role left in the
 *   audience could decide the plan at the exception's plant, or a `'policy'` failure when POL-005
 *   refuses the option's constraint check, carrying the rule, its reason and the event it appended.
 */
export async function requestApproval(
  ctx: HandlerContext,
  exceptionId: ExceptionId,
  scenarioId: ScenarioId,
): Promise<Approval> {
  requireNotForbidden(
    ctx,
    APPROVAL_REQUEST,
    `An option of ${exceptionId} cannot be put forward for approval in this state.`,
  );

  const exception = findException(ctx.state, exceptionId);

  if (exception === undefined) {
    throw notFoundProblem(ctx, `No exception record answers ${exceptionId}, so no plan can answer it.`);
  }

  requirePermission(
    ctx,
    APPROVAL_REQUEST,
    exception,
    `${exceptionId} cannot be put forward for approval here.`,
  );
  requireFreshOrderBook(ctx);

  // The set is read here rather than through `scenarioOrThrow`, because the protected figure is
  // weighed against the do-nothing position the same set states: one read, so the option and its
  // baseline come from one set.
  const set: ScenarioSet = await getScenarioSet(ctx, exceptionId);
  const scenario = optionOrThrow(ctx, exceptionId, scenarioId, set.scenarios);

  await requireRequestableByPolicy(ctx, exceptionId, scenario);

  const approvals = approvalsFor(ctx.state);
  const figures = plannedFiguresFor(scenario, unmitigatedDelayedRevenueOf(set.scenarios));
  // The audience is the roles the matrix lets decide *this* plan, less the requester's own role: a role
  // whose plant scope does not reach the exception could not decide it, so naming it would offer a
  // decider the decision path refuses (rule P-8), and the requester's own role is left out because
  // POL-003 forbids the persona who requested a plan from deciding it (AAP 0.12.2).
  const eligibleApproverRoles: Role[] = rolesWith(APPROVAL_DECIDE).filter(
    (role) => role !== ctx.actor.role && plantScopeFor(role).includes(exception.plantId),
  );

  if (eligibleApproverRoles.length === 0) {
    throw validationProblem(
      ctx,
      `No role that may decide a plan covers ${exception.plantId}, and the acting role requested this ` +
        `one, so ${scenario.id} would reach no persona able to decide it. A plan nobody may decide is ` +
        'not put forward.',
    );
  }

  const approval: Approval = {
    id: nextApprovalIdentifier(approvals),
    exceptionId,
    scenarioId: scenario.id,
    requestedBy: ctx.actor.id,
    eligibleApproverRoles,
    status: PENDING_STATUS,
    addedCostEur: figures.addedCostEur,
    protectedRevenueEur: figures.protectedRevenueEur,
    writeBacks: scenario.writeBacks.map((step) => ({ ...step, state: PENDING_STEP })),
    outcomeReviewed: false,
  };

  // The record set publishes its collections readonly and a session's clone is edited in place, so a
  // new record is installed by replacing the collection — exactly as the seeded baseline is restored
  // by replacing it rather than by editing its members.
  ctx.state.records.approvals = [...approvals, approval];

  await appendAuditEvent(ctx, {
    action: APPROVAL_REQUEST_ACTION,
    objectRef: approval.id,
    result: SUCCEEDED_RESULT,
    before: null,
    after: {
      exceptionId: approval.exceptionId,
      scenarioId: approval.scenarioId,
      status: approval.status,
    },
  });

  return copyApproval(approval);
}

/**
 * Decides one approval: approves it, rejects it, or sends it back for changes.
 *
 * The checks run in the order a reader would state them, and every one of them refuses before a
 * record is written. The forbidden trigger refuses the call. The plan is resolved inside the acting
 * role's scope. POL-003 is asked first, so a requester's own attempt is answered with the rule, its
 * reason and the event it appended rather than with a permission failure. The matrix then answers
 * whether the role may decide at all, the record's own audience answers whether it may decide this
 * plan, the conflicting-update state answers whether the record moved, the order book answers whether
 * a decision may be written against it, and the comment answers what the reader said.
 *
 * What an approval does beyond recording the decision: it sets the tracker's steps in motion through
 * `advanceWriteBacks`, recording each transition and stopping at the first step that fails (AAP
 * 0.2.2). A rejection or a request for changes records the decision and leaves every step as it
 * stands, because no write follows a plan that was not approved.
 *
 * The instant the decision was taken is read from the event the decision appended, so the record and
 * the trail carry one instant and no clock is consulted (contracts §1).
 *
 * @param ctx - The call's context: the persona deciding, the records read and the session written.
 * @param id - The approval being decided.
 * @param decision - Which decision is taken and the comment that comes with it.
 * @param comment - The text the reader submitted; the authoritative comment the record keeps.
 * @returns The decided approval, as a copy.
 * @throws Problem - A `'permission'` failure when the role may not decide this plan or while the
 *   forbidden trigger is on; a `'policy'` failure when POL-003 refuses it, carrying the rule, the
 *   reason and the appended event; a `'validation'` failure when the record moved, the order book is
 *   stale or unavailable, the approval is no longer pending or the comment is blank; and a
 *   `'simulated-write-back'` failure when a step of the approved change did not complete.
 */
export async function decideApproval(
  ctx: HandlerContext,
  id: ApprovalId,
  decision: Decision,
  comment: string,
): Promise<Approval> {
  requireNotForbidden(ctx, APPROVAL_DECIDE, `Approval ${id} cannot be decided in this state.`);

  const approval = approvalOrThrow(ctx, id);
  const exception = exceptionOf(ctx.state, approval);

  if (exception === undefined) {
    throw notFoundProblem(
      ctx,
      `Approval ${id} names the exception ${approval.exceptionId}, which the records do not hold, so ` +
        'no decision can be recorded against it.',
    );
  }

  await requireDecidableByPolicy(ctx, approval);
  requirePermission(ctx, APPROVAL_DECIDE, exception, `${id} cannot be decided here.`);
  requireRecordEligibility(ctx, approval);
  requireNoConflict(ctx, `Approval ${id} is reported ${approval.status}.`);
  requireFreshOrderBook(ctx);

  if (!DECIDABLE_STATUSES.includes(approval.status)) {
    throw validationProblem(
      ctx,
      `Approval ${id} is ${approval.status}, so the record changed since it was read and this ` +
        'decision is refused rather than merged. A decision is taken on a pending plan alone.',
    );
  }

  const submitted = comment.trim();

  requireComment(ctx, submitted);

  const status = statusForDecision(ctx, decision);

  approval.status = status;
  approval.decision = { action: decision.action, comment: submitted };
  approval.decidedBy = ctx.actor.id;

  const event = await appendAuditEvent(ctx, {
    action: DECISION_ACTION,
    objectRef: approval.id,
    result: SUCCEEDED_RESULT,
    before: { status: PENDING_STATUS },
    after: { status: approval.status, action: decision.action },
  });

  approval.decidedAt = event.timestamp;

  if (status === APPROVED_STATUS) {
    await advanceWriteBacks(ctx, approval, isSimulationOn(ctx.state, PARTIAL_FAILURE_FLAG));
  }

  return copyApproval(approval);
}

/**
 * Re-attempts one failed write-back step and lets the change proceed.
 *
 * A retry addresses the step the tracker shows as failed, by the reference that step writes. The
 * addressed step is re-attempted once, and the steps the failure left untouched then run in their
 * own order, so the change reaches the state the plan described. A step that already succeeded is
 * never written again, which is what keeps a retry from leaving a second success record behind
 * (AAP 0.2.1); a step that already succeeded is therefore refused rather than silently re-run.
 *
 * The partial-failure trigger is not consulted: it stands for the run the failure interrupted, not
 * for a condition of the step, and a retry that failed again could never complete the change. The
 * order-book gate is consulted, because a retry writes to the sources the first attempt wrote to.
 *
 * @param ctx - The call's context: the persona retrying, the records read and the session written.
 * @param id - The approval whose step is retried.
 * @param writeBackId - The reference of the step to re-attempt, as the tracker reports it.
 * @returns The step, as a copy, in the state the retry left it.
 * @throws Problem - A `'permission'` failure when the role may not act on this plan or while the
 *   forbidden trigger is on; a `'not-found'` failure when the reference answers no step; and a
 *   `'validation'` failure when the approval is not approved, the record moved, the order book is
 *   stale or unavailable, or the step already succeeded.
 */
export async function retryWriteBack(
  ctx: HandlerContext,
  id: ApprovalId,
  writeBackId: string,
): Promise<WriteBack> {
  requireNotForbidden(
    ctx,
    APPROVAL_DECIDE,
    `A write-back of ${id} cannot be retried in this state.`,
  );

  const approval = approvalOrThrow(ctx, id);
  const exception = exceptionOf(ctx.state, approval);

  if (exception === undefined) {
    throw notFoundProblem(
      ctx,
      `Approval ${id} names the exception ${approval.exceptionId}, which the records do not hold, so ` +
        'no write-back of it can be retried.',
    );
  }

  requirePermission(ctx, APPROVAL_DECIDE, exception, `a write-back of ${id} cannot be retried here.`);
  requireRecordEligibility(ctx, approval);
  requireNoConflict(ctx, `Approval ${id} is reported ${approval.status}.`);
  requireFreshOrderBook(ctx);

  if (approval.status !== APPROVED_STATUS) {
    throw validationProblem(
      ctx,
      `No write-back of ${id} has run, because the approval is ${approval.status} rather than ` +
        'approved: there is nothing to retry.',
    );
  }

  const step = writeBackOrThrow(ctx, approval, writeBackId);

  if (step.state === SUCCEEDED_STEP) {
    throw validationProblem(
      ctx,
      `Write-back step ${step.sequence} of ${approval.id} already succeeded, and a step that ` +
        'succeeded is never written a second time.',
    );
  }

  await recordStep(ctx, approval, step, step.state, SUCCEEDED_STEP);
  await advanceWriteBacks(ctx, approval, false);

  return { ...step };
}

/**
 * Reads the outcome card's two measurements for one approval.
 *
 * Both figures are `solveSupplyDelay`'s output on the exception's own case, taken at the plan's
 * levers and at the levers the change actually reached, so nothing here is a difference the card
 * would have to trust. An exception whose case the records do not carry is refused with the reason,
 * which the card shows as "Cannot compute", rather than measured against another disruption or
 * rendered as a partial figure (AAP 0.8, rule P-6).
 *
 * The read is not plant-scoped twice: the approval was resolved inside the acting role's scope, and
 * the option set is read for the same persona.
 *
 * @param ctx - The call's context: the persona reading and the records measured.
 * @param id - The approval whose outcome is measured.
 * @returns The planned and resulting measurements.
 * @throws Problem - A `'permission'` failure when the plans are not readable; a `'not-found'` failure
 *   when the approval or its option answers no record; and a `'validation'` failure when the
 *   exception carries no solver case.
 */
export async function getApprovalOutcome(
  ctx: HandlerContext,
  id: ApprovalId,
): Promise<ApprovalOutcome> {
  requireRead(ctx);

  const approval = approvalOrThrow(ctx, id);
  const exception = exceptionOf(ctx.state, approval);

  if (exception === undefined) {
    throw notFoundProblem(
      ctx,
      `Approval ${id} names the exception ${approval.exceptionId}, which the records do not hold, so ` +
        'its plan cannot be measured.',
    );
  }

  const caseRecord = solverCaseFor(ctx, exception);
  const scenario = await scenarioOrThrow(ctx, approval.exceptionId, approval.scenarioId);
  const levers = changeLanded(approval) ? scenario.levers : DO_NOTHING_LEVERS;

  return {
    planned: solveSupplyDelay(caseRecord, scenario.levers),
    resulting: solveSupplyDelay(caseRecord, levers),
  };
}

/**
 * Records that the outcome card's figures have been reviewed against the plan.
 *
 * Only an approved plan has an outcome to review, and a plan whose outcome has already been reviewed
 * is refused rather than reviewed twice, so the trail carries one review record per approval. The
 * review writes no source and therefore consults no source's freshness: it records a person's
 * reading of figures that were already computed.
 *
 * @param ctx - The call's context: the persona reviewing, the records read and the session written.
 * @param id - The approval whose outcome is reviewed.
 * @returns The approval, as a copy, with its outcome marked reviewed.
 * @throws Problem - A `'permission'` failure when the role may not act on this plan or while the
 *   forbidden trigger is on, and a `'validation'` failure when the approval is not approved, the
 *   record moved, or the review is already recorded.
 */
export async function reviewApprovalOutcome(
  ctx: HandlerContext,
  id: ApprovalId,
): Promise<Approval> {
  requireNotForbidden(
    ctx,
    APPROVAL_DECIDE,
    `The outcome of ${id} cannot be reviewed in this state.`,
  );

  const approval = approvalOrThrow(ctx, id);
  const exception = exceptionOf(ctx.state, approval);

  if (exception === undefined) {
    throw notFoundProblem(
      ctx,
      `Approval ${id} names the exception ${approval.exceptionId}, which the records do not hold, so ` +
        'its outcome cannot be reviewed.',
    );
  }

  requirePermission(ctx, APPROVAL_DECIDE, exception, `the outcome of ${id} cannot be reviewed here.`);
  requireRecordEligibility(ctx, approval);
  requireNoConflict(ctx, `Approval ${id} is reported ${approval.status}.`);

  if (approval.status !== APPROVED_STATUS) {
    throw validationProblem(
      ctx,
      `Approval ${id} is ${approval.status}, and only an approved plan has an outcome to review.`,
    );
  }

  if (approval.outcomeReviewed) {
    throw validationProblem(
      ctx,
      `Approval ${id} already carries the review of its outcome, so the record changed since it was ` +
        'read and this review is refused rather than recorded twice.',
    );
  }

  approval.outcomeReviewed = true;

  await appendAuditEvent(ctx, {
    action: OUTCOME_REVIEW_ACTION,
    objectRef: approval.id,
    result: SUCCEEDED_RESULT,
    before: { outcomeReviewed: false },
    after: { outcomeReviewed: true },
  });

  return copyApproval(approval);
}

