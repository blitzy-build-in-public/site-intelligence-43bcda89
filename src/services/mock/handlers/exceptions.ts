/**
 * The exceptions family of the in-browser mock adapter: the overview read, the exception queue, the
 * investigation detail, the three writes a persona performs on an exception — assign, note and
 * dismiss — and the resolution an approved plan's completed write-back records (see
 * `recordApprovedPlan`).
 *
 * Implements the "Handlers" row of AAP 0.12.1 at the `handlers/` path AAP 0.13.1 fixes, and the three
 * payload shapes it returns are the ones AAP 0.12.2 derives — `Overview`, `ExceptionRow` and
 * `ExceptionDetail`. AAP 0.8 fixes the rule the whole family exists to keep: every displayed number
 * traces to a pure deterministic function, so nothing below computes a figure of its own.
 *
 * ONE SCOPE RESOLUTION, AND WHY IT LIVES HERE. AAP 0.2.1 requires one scope resolver combining the top
 * bar's selection with the role's plant scope, "used by every list call and every aggregate, so a
 * filtered queue and a filtered overview cannot disagree". `resolveScope` is that resolver, and the
 * overview therefore belongs to this family: it is the same exceptions, prices, order book and
 * baseline solves, over the same resolved scope, as the queue a screen shows beside it (see `scopeOf`).
 *
 * Rules this module is built to satisfy:
 * - P-1: it types no simulation label, and no payload it returns carries one.
 * - P-2: records are reached only through `ctx.state` and the sibling `../seed-loader.ts` type surface,
 *   and the arithmetic only through `src/domain`; only `mock-backend.ts` imports this file.
 * - P-3, P-8: the permission verdict comes from `ctx.actor`, and every failure carries the permission
 *   and the roles that hold it so a disabled control can say who may act. The checks are a
 *   demonstration control: they run in a browser page and are not production authorisation.
 * - P-4: nothing here claims a security property; the trail it appends to is a mechanism the interface
 *   labels `Simulated control`.
 * - P-5: no market-intelligence value enters any payload, so no overview tile, queue row or detail
 *   figure can blend a competitor reading with a first-party one.
 * - P-6: every number is an aggregate's or the solver's output, or a record value copied across; no
 *   currency amount, count, threshold or domain identifier is written here and nothing is rounded.
 * - P-7: every name it returns is a seed record's own synthetic name or identifier.
 * - B-1, B-2: it contacts no host, addresses none, holds no credential-shaped literal and reads no
 *   configuration.
 * - B-3: it renders nothing, so what it owes the rule is that every refusal carries the plain-words
 *   sentence a screen prints beside the permission and the roles that hold it.
 */

/* ---------------------------------------------------------------------------------------------
 * Imports — the shared vocabulary, the domain modules this family delegates to, and the siblings
 * ------------------------------------------------------------------------------------------- */

import { DEMO_CLOCK } from '../../../types';
import type {
  AffectedLine,
  Approval,
  ApprovalStatus,
  AuditEvent,
  ExceptionDetail,
  ExceptionId,
  ExceptionQuery,
  ExceptionRow,
  ExceptionStatus,
  Freshness,
  ImpactChainNode,
  Levers,
  OperationalException,
  Overview,
  Permission,
  Problem,
  Scope,
  SolverCase,
  SolverResult,
  SourceId,
  Timestamp,
  UserId,
  WriteBackState,
} from '../../../types';

import {
  admitsPlant,
  baselineViewFor,
  computeExceptionRows,
  plantsTouchedBy,
  resolveAffectedLines,
} from '../../../domain/aggregation/exceptions';
import type { BaselineSolve } from '../../../domain/aggregation/exceptions';
import { computeOverview, openedOrResolvedOn } from '../../../domain/aggregation/overview';
import type { ActivityRecord, OverviewInput } from '../../../domain/aggregation/overview';
import { resolveScope } from '../../../domain/aggregation/scope';
import type { ScopeFilterInput } from '../../../domain/aggregation/scope';
import { sortUrgent } from '../../../domain/aggregation/urgency';
import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import { solveSupplyDelay } from '../../../domain/solver/solve-supply-delay';

import type { HandlerContext, MockState } from '../mock-state';
import type {
  ExceptionHistoryRecord,
  Line,
  Material,
  Plant,
  PurchaseOrder,
  SeededUser,
} from '../seed-loader';
import {
  demonstrationForbiddenReason,
  emptiesLists,
  freshnessFor,
  isSimulationOn,
} from '../simulation';
import { appendAuditEvent, assertFreeTextLength, listLimitOf, requireNoConflict } from './audit';

/* ---------------------------------------------------------------------------------------------
 * A. Structural constants — contracts §1, §4 and §7.1
 * ------------------------------------------------------------------------------------------- */

/** The permission every read of this family requires — contracts §7.1. */
const EXCEPTION_READ: Permission = 'exception.read';

/** The permission every write of this family requires — contracts §7.1. */
const EXCEPTION_WORK: Permission = 'exception.work';

/**
 * The source whose freshness a read of this family reports.
 *
 * `ExceptionRow.freshness` is the state the adapter attaches to a read rather than a member of an
 * exception, and the figures a queue row carries are drawn from the order book and the stock. ERP is
 * that source, and it is also the source `src/services/mock/simulation.ts` marks stale for the stale
 * trigger, so the state a row reports and the state the approval controls are disabled on are one
 * answer (AAP 0.2.1, T-13).
 */
const ORDER_BOOK_SOURCE: SourceId = 'erp';

/**
 * The sets a lever recovers in the do-nothing measurement.
 *
 * AAP 0.8 fixes the baseline as `solveSupplyDelay(<case>, { airSets: 0, transferSets: 0 })`, and a
 * lever below zero breaches its own bound (contracts §4), so zero is the lower bound every
 * `LeverConstraint` admits. It is a solver input rather than a business figure, and the solver echoes
 * it on the result it returns.
 */
const NO_SETS_RECOVERED = 0;

/** The baseline levers: neither lever pulled. */
const DO_NOTHING_LEVERS: Levers = {
  airSets: NO_SETS_RECOVERED,
  transferSets: NO_SETS_RECOVERED,
};

/** The status an exception carries while it can still be dismissed — `ExceptionStatus`. */
const OPEN_STATUS: ExceptionStatus = 'open';

/** The status a dismissal leaves the exception in. */
const DISMISSED_STATUS: ExceptionStatus = 'dismissed';

/**
 * The status an approved plan's completed change leaves the exception in.
 *
 * AAP 0.2.2's journey ends with the plan written back, and specification §3 gives an exception the
 * three states `open`, `resolved` and `dismissed` (`ExceptionStatus`): a disruption whose response has
 * been decided and written is resolved rather than dismissed, because nothing was set aside. The
 * seeded trail spells the state the same way — `EXC-2026-1187` carries a `resolved` history record and
 * this status (see `src/seed/exception-history.ts`) — so a live resolution and a seeded one read
 * alike.
 */
const RESOLVED_STATUS: ExceptionStatus = 'resolved';

/** The `Approval.status` a plan carries once its change may be written back — `ApprovalStatus`. */
const APPROVED_PLAN_STATUS: ApprovalStatus = 'approved';

/** The state a write-back step reaches when its write completed — `WriteBackState`. */
const SUCCEEDED_WRITE_BACK: WriteBackState = 'succeeded';

/** Digits in the sequence a history record's own key carries, as `src/seed/exception-history.ts` spells it. */
const HISTORY_SEQUENCE_DIGITS = 2;

/* ---------------------------------------------------------------------------------------------
 * B. Failures — platform-contracts.md §2, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The refusal a call the acting role may not make throws.
 *
 * The members are the ones a permission cause carries: the cause itself, the reason in plain words,
 * the permission the role lacks and the roles that hold it — which is what a forbidden card prints and
 * what a disabled control's explanation names (rules P-3 and P-8). The trace identifier is the call's
 * own, from the one derivation in `./audit.ts`, so a reader can quote it and find the event the same
 * call appended.
 *
 * @param ctx - The call's context, whose trace identifier the failure carries.
 * @param permission - The permission the call required and the role lacks.
 * @param message - The reason, in plain words, naming the role and the permission.
 * @returns The `Problem` to throw.
 */
function permissionProblem(ctx: HandlerContext, permission: Permission, message: string): Problem {
  return {
    type: 'permission',
    message,
    traceId: ctx.traceId,
    requiredPermission: permission,
    rolesWithPermission: rolesWith(permission),
  };
}

/**
 * The refusal an identifier the acting role's read does not reach throws — contracts §2's
 * `'not-found'` cause.
 *
 * Both the identifier the record set does not hold and the one it holds outside the role's plant scope
 * are reported this way: the second is a record this read does not cover rather than a refusal of the
 * role's permission, which the family's reads already checked.
 *
 * @param ctx - The call's context, whose trace identifier the failure carries.
 * @param message - The reason, in plain words, naming the identifier.
 * @returns The `Problem` to throw.
 */
function notFoundProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'not-found', message, traceId: ctx.traceId };
}

/**
 * The refusal a request the records cannot honour throws.
 *
 * It carries the causes this family reports as validation: an empty note, a dismissal without a
 * reason, an assignee the record set does not hold, a dismissal of an exception that is no longer
 * open, a record set whose case cannot be measured, and a record that moved under the reader while the
 * conflicting-update trigger was in effect — which `./audit`'s `requireNoConflict` refuses, the one
 * guard every write this build's screens make on an existing record meets. `ProblemType` has no cause
 * for a record that has moved on, so the conflicting-update state is reported as `'validation'` either
 * way — by that guard while the trigger is in effect, and here with the record's current status when the
 * record's own state rules the write out — rather than through an invented sixth cause.
 *
 * @param ctx - The call's context, whose trace identifier the failure carries.
 * @param message - The reason, in plain words.
 * @returns The `Problem` to throw.
 */
function validationProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'validation', message, traceId: ctx.traceId };
}

/* ---------------------------------------------------------------------------------------------
 * C. The permission gates — contracts §7.1, rules P-3 and P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * Refuses the call unless the acting persona may read the exception family.
 *
 * Two ways to be refused, reported as one shape because a screen renders one forbidden card: the
 * forbidden trigger is in effect, which refuses every call of the family while it is set, or the
 * persona's role does not hold `exception.read`. The trigger is checked first because it stands for a
 * session-wide refusal rather than for a fact about the role.
 *
 * The permission is evaluated with no subject: which exceptions a role may read within its plants is
 * the resolved scope's answer, applied to the rows and to the detail, not the matrix's.
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
      demonstrationForbiddenReason(ctx.actor.role, EXCEPTION_READ),
    );
  }

  if (hasPermission(ctx.actor.role, EXCEPTION_READ, null, ctx.actor)) {
    return;
  }

  throw permissionProblem(
    ctx,
    EXCEPTION_READ,
    `The acting role (${ctx.actor.role}) does not hold the ${EXCEPTION_READ} permission, so these ` +
      `exception records are not readable here. The roles that hold it are ${rolesWith(EXCEPTION_READ).join(', ')}.`,
  );
}

/**
 * Refuses the call while the forbidden trigger is in effect, before any write is attempted.
 *
 * A session in the forbidden state is one a screen shows as forbidden, so a write reaching the adapter
 * through it is refused rather than applied: the trigger changes what every call of this family
 * returns, not only the reads.
 *
 * @param ctx - The call's context, whose triggers are read.
 * @throws Problem - A `'permission'` failure naming the permission a write requires.
 */
function requireWritable(ctx: HandlerContext): void {
  if (!isSimulationOn(ctx.state, 'forbidden')) {
    return;
  }

  throw permissionProblem(
    ctx,
    EXCEPTION_WORK,
    demonstrationForbiddenReason(ctx.actor.role, EXCEPTION_WORK),
  );
}

/**
 * Refuses the write unless the acting persona may work the exception, over the plant it lands on.
 *
 * The check is made against the exception as its subject, so the contracts §7.1 matrix applies both the
 * role's plant scope and the persona's own: a planner cannot change an exception at a plant outside
 * their reach even while another persona in the same role could. The refusal states the cause that
 * failed, the way the disabled control beside it does (rule P-8):
 *
 * - A persona that holds `exception.work` while its own plants miss the exception's is refused as a
 *   record outside its plant scope. It is one of the permission's holders, so the sentence says it
 *   holds the permission, names the plant it does not reach and the plants it covers — its own
 *   `plantIds`, in the order the adapter reports them (rule P-6) — and names no holders, because
 *   listing them beside a role that is one of them would contradict itself.
 * - A persona that does not hold the permission at all is refused for the missing permission, and the
 *   sentence closes with the roles that hold it, the acting role left out because this branch has
 *   established that it is not one of them.
 *
 * None of the family's writes consults the policy engine: `evaluate()`'s `PolicyAction` union covers an
 * outbound endpoint, an approval decision, an assistant query and a policy lookup, and none of the
 * actions here is one of them, so asking it would be asking a question it does not answer.
 *
 * @param ctx - The call's context.
 * @param exception - The exception the write concerns.
 * @throws Problem - A `'permission'` failure naming the permission a write requires, the plant the
 *   exception sits on and, for a missing permission, the roles that hold it.
 */
function requireWork(ctx: HandlerContext, exception: OperationalException): void {
  if (hasPermission(ctx.actor.role, EXCEPTION_WORK, exception, ctx.actor)) {
    return;
  }

  if (hasPermission(ctx.actor.role, EXCEPTION_WORK, null, ctx.actor)) {
    throw permissionProblem(
      ctx,
      EXCEPTION_WORK,
      `Exception ${exception.id} is outside the acting role's plant scope ` +
        `(${ctx.actor.plantIds.join(', ')}): the acting role (${ctx.actor.role}) holds the ` +
        `${EXCEPTION_WORK} permission, but not over ${exception.plantId}, so the exception cannot be ` +
        `changed here.`,
    );
  }

  const otherHolders = rolesWith(EXCEPTION_WORK).filter((role) => role !== ctx.actor.role);
  const holderClause =
    otherHolders.length === 0 ? '' : ` The roles that hold it are ${otherHolders.join(', ')}.`;

  throw permissionProblem(
    ctx,
    EXCEPTION_WORK,
    `The acting role (${ctx.actor.role}) does not hold the ${EXCEPTION_WORK} permission over ` +
      `${exception.plantId}, so ${exception.id} cannot be changed here.${holderClause}`,
  );
}

/* ---------------------------------------------------------------------------------------------
 * D. One scope resolution — AAP 0.2.1, AAP 0.12.1 "Scope resolution"
 * ------------------------------------------------------------------------------------------- */

/**
 * Resolves the one scope a call is served under.
 *
 * The top bar's plant and product selection is intersected with the acting role's plant scope here,
 * once, by the one resolver, and the answer is handed to the aggregate unchanged: a filtered queue and a
 * filtered overview then describe the same population, and a product chosen in the top bar narrows both
 * (AAP 0.2.1). Nothing in this module re-derives a scope, reads a store or looks at a URL.
 *
 * @param ctx - The call's context, whose persona the role is read from.
 * @param selection - The shell's selection, as the adapter carried it: the plants and the product it
 *   names, each absent for "all".
 * @returns The resolved scope; its `plants` member empty means nothing is in scope.
 */
function scopeOf(ctx: HandlerContext, selection: ScopeFilterInput): Scope {
  return resolveScope(selection, ctx.actor.role);
}

/* ---------------------------------------------------------------------------------------------
 * E. The state of a read — AAP 0.2.1, AAP 0.12.1 simulation triggers
 * ------------------------------------------------------------------------------------------- */

/**
 * The freshness record a read of this family reports.
 *
 * The order-book source's own record, so a figure drawn from the order book and the stock is qualified
 * by the instant that source last answered, and a stale or unavailable state the popover triggered
 * reaches this read exactly as it reaches the shell's freshness strip (AAP 0.2.1, T-13). The record
 * comes from `freshnessFor(state)` and is never rebuilt here, so there is one answer to "how current is
 * this source?" rather than two.
 *
 * @param ctx - The call's context, whose triggers, seeded source health and trace identifier are read.
 * @returns The order-book source's freshness record, or the first reported source's when the catalogue
 *   does not carry that source.
 * @throws Problem - A `'validation'` failure when the source catalogue reports no health at all,
 *   because the read would then have no state to qualify itself with.
 */
function readFreshness(ctx: HandlerContext): Freshness {
  const report = freshnessFor(ctx.state);
  const orderBook = report.find((entry) => entry.source === ORDER_BOOK_SOURCE);

  if (orderBook !== undefined) {
    return orderBook;
  }

  const [first] = report;

  if (first !== undefined) {
    return first;
  }

  throw validationProblem(
    ctx,
    'The source catalogue reports no health, so a read of the exception records cannot state the ' +
      'state of the records behind it.',
  );
}

/**
 * The exceptions a read of this family is computed over.
 *
 * The session's own collection, or an empty one while the emptied-queue trigger is in effect or the
 * simulation's `empty` trigger has emptied the session's collections. The choice is made here, once, so
 * the queue's rows and the overview's counts are computed from the same population rather than from two
 * branches that could disagree (AAP 0.12.1, T-17): `listExceptions` projects its rows from what this
 * returns and `getOverview` counts, sums, groups and plots it, so a control that empties the session
 * empties one population rather than emptying a list on one screen while the tiles beside it still count
 * the records that list no longer shows.
 *
 * `empty-queue` is this family's own trigger and empties that population alone, which is what makes it
 * different from `empty`: `emptiesLists` also empties every other collection the adapter serves, and the
 * population both reads are computed over is one of them.
 *
 * @param state - The session whose triggers and records are read. Not modified.
 * @returns The exceptions the read is computed over.
 */
function exceptionsFor(state: MockState): readonly OperationalException[] {
  return isSimulationOn(state, 'empty-queue') || emptiesLists(state) ? [] : state.records.exceptions;
}

/* ---------------------------------------------------------------------------------------------
 * F. Solver cases and the baseline measurements — AAP 0.8, contracts §4
 * ------------------------------------------------------------------------------------------- */

/**
 * The solver case an exception is measured against, when its records carry one.
 *
 * Resolved by the case the exception names, and otherwise by the case that names the exception, so a
 * record whose `solverCaseId` was not populated is still measured against its own case rather than
 * against none. An exception that names a case the record set does not hold is reported instead of
 * being measured against something else: a measurement of another disruption's supply position is a
 * figure rule P-6 forbids.
 *
 * @param ctx - The call's context, whose records are read.
 * @param exception - The exception whose case is wanted.
 * @returns That exception's case, or `undefined` when its records name none.
 * @throws Problem - A `'validation'` failure when the exception names a case the records do not hold.
 */
function solverCaseOf(ctx: HandlerContext, exception: OperationalException): SolverCase | undefined {
  const caseId = exception.solverCaseId;

  if (caseId !== undefined) {
    const named = ctx.state.records.solverCases.find((candidate) => candidate.id === caseId);

    if (named !== undefined) {
      return named;
    }

    throw validationProblem(
      ctx,
      `Exception ${exception.id} names solver case ${caseId}, which the record set does not hold, so ` +
        'its affected lines and its projection cannot be measured.',
    );
  }

  return ctx.state.records.solverCases.find((candidate) => candidate.exceptionId === exception.id);
}

/**
 * The measurement of a case at the do-nothing levers, which is the baseline the aggregates read.
 *
 * The solver returns a failed check rather than throwing, so a case that cannot be measured at its own
 * lower bounds is reported here instead of being projected: the screen shows no figure at all rather
 * than a zero that looks computed (AAP 0.8).
 *
 * @param ctx - The call's context, whose records are read.
 * @param exception - The exception being measured.
 * @param solverCase - That exception's case.
 * @returns The baseline measurement.
 * @throws Problem - A `'validation'` failure when the case breaches its own lever bounds.
 */
function baselineOf(
  ctx: HandlerContext,
  exception: OperationalException,
  solverCase: SolverCase,
): SolverResult {
  const baseline = solveSupplyDelay(solverCase, DO_NOTHING_LEVERS);

  if (baseline.constraintCheck !== 'fail') {
    return baseline;
  }

  throw validationProblem(
    ctx,
    `The baseline measurement of case ${solverCase.id} for ${exception.id} cannot be taken at the ` +
      `do-nothing levers: ${baseline.constraintMessages.join(' ')}`,
  );
}

/**
 * The baseline measurement of every exception in a read that carries a solver case.
 *
 * The affected-lines rule reads the baseline rather than a stored figure (AAP 0.12.2), so the bundle the
 * aggregates consume carries it and no aggregate calls the solver itself. Exactly one seeded exception
 * names a case, and the solver is a pure function of the case record and the levers, so two calls
 * measure the same baseline (AAP 0.18.2).
 *
 * @param ctx - The call's context, whose records are read.
 * @param exceptions - The exceptions the read is computed over.
 * @returns One baseline per exception that carries a case, in the order they were handed in.
 * @throws Problem - A `'validation'` failure when a named case is missing or cannot be measured.
 */
function baselineSolves(
  ctx: HandlerContext,
  exceptions: readonly OperationalException[],
): BaselineSolve[] {
  const solves: BaselineSolve[] = [];

  for (const exception of exceptions) {
    const solverCase = solverCaseOf(ctx, exception);

    if (solverCase === undefined) {
      continue;
    }

    solves.push({
      exceptionId: exception.id,
      result: baselineOf(ctx, exception, solverCase),
    });
  }

  return solves;
}

/* ---------------------------------------------------------------------------------------------
 * G. The record bundle the aggregates read — AAP 0.12.1, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The record bundle the overview and the queue are computed over, built from the session's records.
 *
 * `OverviewInput` extends `ExceptionAggregateInput`, so one bundle serves both reads: the two are then
 * computed over the same exceptions, the same prices, the same order book, the same baseline solves and
 * the same as-of instant, which is what makes a filtered queue and a filtered overview describe one
 * population (AAP 0.2.1). Every member is a record the session holds or the aggregate's own declared
 * shape, so the bundle states no figure and copies nothing a record does not say.
 *
 * Two handlers build this bundle, this one and `handlers/topology.ts` for the canvas ribbon, and the
 * two builders stay two copies of one short function: AAP 0.12.1 fixes this folder at nine files, one
 * per read/write family plus the audit append path, so there is no shared helper module to hold the
 * copy and adding one would make a tenth. Each copy reads its own family's inputs from the session and
 * neither computes anything.
 *
 * @param ctx - The call's context, whose records and triggers are read. Not modified.
 * @param exceptions - The exceptions the reads are computed over: the record set's own, or an empty
 *   collection when the queue has been emptied.
 * @returns The bundle, freshly allocated on every call.
 * @throws Problem - A `'validation'` failure when a case a figure is drawn from cannot be resolved.
 */
function aggregateBundle(
  ctx: HandlerContext,
  exceptions: readonly OperationalException[],
): OverviewInput {
  const { records } = ctx.state;

  return {
    exceptions,
    products: records.products,
    customerOrders: records.customerOrders,
    baselines: baselineSolves(ctx, exceptions),
    freshness: readFreshness(ctx),
    asOf: DEMO_CLOCK,
    plants: records.plants,
    materials: records.materials,
    history: records.exceptionHistory,
    approvals: records.approvals,
  };
}

/* ---------------------------------------------------------------------------------------------
 * H. The queue's filters, its order and its pages — SCR-02, contracts §9
 * ------------------------------------------------------------------------------------------- */

/**
 * Whether an exception answers every filter the query set.
 *
 * The predicate is asked of the record rather than of the row projected from it, because every member it
 * reads is the record's own: the type, severity, status and owner are the values `computeExceptionRows`
 * copies onto the row unchanged, the supplier is the one the exception buys its material from, and the
 * plant filter matches the plant the exception lands on **or** one it also affects, which is the reading
 * `src/types/service.ts` fixes for it and the one the scoped aggregate applies. The day filter reads
 * neither the record alone: the date a reader chose on SCR-01's series is a property of the records'
 * timeline, so it is asked of the exception and the activity trail together, through
 * `openedOrResolvedOn` — the predicate the series itself counts by — and no row is kept that the mark
 * which narrowed the queue did not count (AAP 0.12.4). Each filter is applied only where the query states
 * it, and deciding the whole filter here is what lets the queue narrow the population before it measures
 * it.
 *
 * The shell's product selection does not travel inside the query. `ExceptionQuery` carries the plant,
 * type, severity, status, owner and supplier filters and the day the overview's series narrows the
 * queue to, because AAP 0.12.2 fixes that query as the queue's own filters and AAP 0.12.4 fixes the
 * series' dates as one of them; a product chosen in the top bar reaches the service as a member of
 * `Scope` instead, so each read of this family resolves it once through `resolveScope` and the queue
 * and the overview are narrowed by the same aggregate predicate (`admitsProducts`) both apply.
 *
 * @param exception - The exception to test.
 * @param query - The query the call was served with.
 * @param history - The activity trail, which dates the exceptions the day filter keeps.
 * @returns `true` when the exception answers every filter stated.
 */
function admitsQuery(
  exception: OperationalException,
  query: ExceptionQuery,
  history: readonly ActivityRecord[],
): boolean {
  if (query.type !== undefined && exception.type !== query.type) {
    return false;
  }

  if (query.severity !== undefined && exception.severity !== query.severity) {
    return false;
  }

  if (query.status !== undefined && exception.status !== query.status) {
    return false;
  }

  if (query.ownerId !== undefined && exception.ownerId !== query.ownerId) {
    return false;
  }

  if (query.supplierId !== undefined && exception.supplierId !== query.supplierId) {
    return false;
  }

  if (query.date !== undefined && !openedOrResolvedOn(exception, history, query.date)) {
    return false;
  }

  if (query.plantId === undefined) {
    return true;
  }

  return plantsTouchedBy(exception).includes(query.plantId);
}

/**
 * The queue members an explicit `sort=field:dir` may order by.
 *
 * The row's own comparable members, plus `severity`, which is ordered by the urgency ranking rather than
 * by a comparison this module makes (see `orderRows`). An unknown member falls back to the default
 * ordering rather than failing a read a screen can recover from, and no member is invented: every name
 * below is one `ExceptionRow` carries.
 */
const SORTABLE_FIELDS = [
  'id',
  'type',
  'title',
  'plantId',
  'severity',
  'daysToImpact',
  'revenueAtRiskEur',
  'status',
  'ownerId',
  'ageHours',
] as const;

/** One member a queue read may be ordered by. */
type RowSortField = (typeof SORTABLE_FIELDS)[number];

/** The member whose ordering belongs to the domain's urgency ranking rather than to this module. */
const SEVERITY_SORT_FIELD = 'severity';

/** One ordering: the member to order by and the direction to read it in. */
interface RowSortOrder {
  /** The member ordered by. */
  readonly field: RowSortField;

  /** Whether the order runs from the greatest value to the least. */
  readonly descending: boolean;
}

/** Whether a string names a member the queue may be ordered by. */
function isSortField(value: string): value is RowSortField {
  return SORTABLE_FIELDS.some((field) => field === value);
}

/**
 * The ordering a `sort=field:dir` parameter asks for, or `null` when it asks for none this list honours.
 *
 * The parameter's form is contracts §9's: the member, a colon, then `asc` or `desc`. A missing direction
 * reads as ascending, and a member or a direction this list does not order by yields `null`, which the
 * caller reads as the default urgent order.
 *
 * @param sort - The parameter as the query carried it, or `undefined` when it carried none.
 * @returns The ordering to apply, or `null` for the default one.
 */
function sortOrderOf(sort: string | undefined): RowSortOrder | null {
  if (sort === undefined) {
    return null;
  }

  const [field, direction] = sort.split(':');

  if (field === undefined || !isSortField(field)) {
    return null;
  }

  if (direction === undefined || direction === 'asc') {
    return { field, descending: false };
  }

  return direction === 'desc' ? { field, descending: true } : null;
}

/** Orders two strings by their own code-unit order, which is stable across hosts. */
function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  return left > right ? 1 : 0;
}

/** Orders two numbers, treating them as they stand. */
function compareNumbers(left: number, right: number): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

/**
 * Compares two rows by one of the members this module orders itself.
 *
 * `id`, `type`, `plantId`, `status`, `ownerId` and `title` are compared as text in code-unit order,
 * which reads the same on every host; the three measures are compared as numbers.
 *
 * @param left - One row.
 * @param right - The other.
 * @param field - The member to compare, never `severity`.
 * @returns A negative number when `left` comes first, a positive one when `right` does.
 */
function compareRows(
  left: ExceptionRow,
  right: ExceptionRow,
  field: Exclude<RowSortField, typeof SEVERITY_SORT_FIELD>,
): number {
  switch (field) {
    case 'daysToImpact':
      return compareNumbers(left.daysToImpact, right.daysToImpact);
    case 'revenueAtRiskEur':
      return compareNumbers(left.revenueAtRiskEur, right.revenueAtRiskEur);
    case 'ageHours':
      return compareNumbers(left.ageHours, right.ageHours);
    default:
      return compareText(left[field], right[field]);
  }
}

/**
 * Orders the queue's rows.
 *
 * With no explicit order the rows come back in `sortUrgent`'s order — SCR-02's default sort, applied by
 * the module that owns that ranking. An explicit order on `severity` is that same ranking read forwards
 * or backwards, because the urgency rank is `src/domain/aggregation/urgency.ts`'s and is not restated
 * here; an explicit order on any other member compares that member and breaks ties by identifier
 * ascending, so the order is total and a re-render cannot swap two rows.
 *
 * @param rows - The rows to order, read and not modified.
 * @param order - The explicit order to apply, or `null` for the default one.
 * @returns A new array holding the same rows in the requested order.
 */
function orderRows(rows: readonly ExceptionRow[], order: RowSortOrder | null): ExceptionRow[] {
  if (order === null) {
    return sortUrgent(rows);
  }

  if (order.field === SEVERITY_SORT_FIELD) {
    const urgent = sortUrgent(rows);

    return order.descending ? urgent.reverse() : urgent;
  }

  const field = order.field;

  return [...rows].sort((left, right) => {
    const primary = compareRows(left, right, field);

    if (primary !== 0) {
      return order.descending ? -primary : primary;
    }

    return compareText(left.id, right.id);
  });
}

/**
 * The index of the first row a page returns, given the cursor the query carried.
 *
 * The cursor is the identifier of the last row the previous page returned, so the next page continues at
 * the row that follows it in the order that call reported. A cursor no row of that order carries — a
 * malformed one, or one from an order the caller has since changed — is refused rather than read as the
 * start of the list: a page beginning again at the top would report a queue that ends where the page the
 * client already read ends, so the queue's tail would go unread behind an answer that looked complete.
 * The refusal names the position and the ordering it named no row of, which is what lets the client
 * restart from the first page instead of trusting a page it has already seen.
 *
 * @param ctx - The call's context, whose trace a refusal carries.
 * @param rows - The ordered rows the page is taken from.
 * @param cursor - The cursor the query carried, or `undefined` when it carried none.
 * @returns The index to start at.
 * @throws Problem - A `'validation'` failure when the cursor names no row of the ordered page.
 */
function startIndexOf(
  ctx: HandlerContext,
  rows: readonly ExceptionRow[],
  cursor: string | undefined,
): number {
  if (cursor === undefined) {
    return 0;
  }

  const found = rows.findIndex((row) => row.id === cursor);

  if (found < 0) {
    throw validationProblem(
      ctx,
      `The exception cursor ${cursor} names no row of this queue in the requested order.`,
    );
  }

  return found + 1;
}

/**
 * Takes one page of the ordered rows.
 *
 * The page starts at the row the cursor continues from and holds `listLimitOf`'s number of rows, so an
 * absent, an oversized and an unusable `limit` are answered here exactly as every other list family
 * answers them (contracts §9).
 *
 * @param ctx - The call's context, whose trace a refusal carries.
 * @param rows - The ordered rows.
 * @param query - The query, whose `cursor` and `limit` bound the page.
 * @returns The rows of the page, in the order the caller asked for.
 * @throws Problem - A `'validation'` failure when the cursor names no row of the ordered page, or when
 *   the limit bounds no page.
 */
function pageOf(
  ctx: HandlerContext,
  rows: readonly ExceptionRow[],
  query: ExceptionQuery,
): ExceptionRow[] {
  const page = rows.slice(startIndexOf(ctx, rows, query.cursor));

  return page.slice(0, listLimitOf(ctx, query.limit, 'exception queue'));
}


/* ---------------------------------------------------------------------------------------------
 * I. The record a detail read is about — AAP 0.12.2's `ExceptionDetail`, rule P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The exception one detail read is about, refused when the acting role's read does not reach it.
 *
 * Two identifiers are refused as `'not-found'`, and the message names the identifier in both cases: the
 * one the record set does not hold at all, and the one it holds outside the acting role's plant scope.
 * The second is a record this read does not cover rather than a permission the role lacks, which is why
 * it does not produce a `'permission'` failure — `requireRead` has already established what the role may
 * read. Which plants a record reaches is `admitsPlant`'s answer, the one predicate the queue rows, the
 * overview's population and the evidence drawer are all narrowed by, so this read covers exactly the
 * records those surfaces show (AAP 0.2.1).
 *
 * @param ctx - The call's context, whose records and persona are read.
 * @param id - The identifier the call asked for.
 * @returns The exception record the session holds, by reference, so a write can change it.
 * @throws Problem - A `'not-found'` failure naming the identifier.
 */
function visibleException(ctx: HandlerContext, id: ExceptionId): OperationalException {
  const exception = ctx.state.records.exceptions.find((candidate) => candidate.id === id);

  if (exception === undefined) {
    throw notFoundProblem(ctx, `The record set holds no exception ${id}.`);
  }

  const scope = resolveScope({}, ctx.actor.role);

  if (!admitsPlant(exception, scope)) {
    throw notFoundProblem(
      ctx,
      `Exception ${id} is outside the acting role's plant scope (${scope.plants.join(', ')}), so it is ` +
        'not part of this read.',
    );
  }

  return exception;
}

/**
 * Looks one referenced record up, refusing the read when the record set does not hold it.
 *
 * A chain node, a projection or a line needs the record it names, and a read that substituted a
 * placeholder for a missing one would present a chain the records do not describe. The identifier may be
 * a record the seed simply does not carry, which is an absent input rather than a permission: the
 * message names the exception, the kind of record and the identifier a reader has to resolve (rule P-8).
 *
 * @param ctx - The call's context, whose trace identifier the refusal carries.
 * @param collection - The records to search.
 * @param id - The identifier of the record wanted.
 * @param what - What kind of record it is, in the words the message uses.
 * @param exceptionId - The exception whose reference is unresolved.
 * @returns The record found.
 * @throws Problem - A `'validation'` failure naming the record and the exception.
 */
function recordNamed<T extends { readonly id: string }>(
  ctx: HandlerContext,
  collection: readonly T[],
  id: string,
  what: string,
  exceptionId: ExceptionId,
): T {
  const found = collection.find((candidate) => candidate.id === id);

  if (found === undefined) {
    throw validationProblem(
      ctx,
      `Exception ${exceptionId} names ${what} ${id}, which the record set does not hold, so its ` +
        'impact chain cannot be drawn from the records.',
    );
  }

  return found;
}

/* ---------------------------------------------------------------------------------------------
 * J. The impact chain — SCR-03, AAP 0.12.2's `ImpactChainNode`
 * ------------------------------------------------------------------------------------------- */

/**
 * The node standing for the purchase order that carries the delay.
 *
 * `ref` is the order's own identifier, which the evidence drawer resolves the node's evidence from, and
 * the detail states the order's own values: the quantity it carries, the material it brings and the date
 * it is now due (rule P-6 — every number is a record value).
 *
 * @param order - The purchase order record.
 * @param material - The material the order carries.
 * @param supplierName - The supplier the order is placed with, as its record names it.
 * @returns The chain's first node.
 */
function purchaseOrderNode(
  order: PurchaseOrder,
  material: Material,
  supplierName: string,
): ImpactChainNode {
  return {
    ref: order.id,
    kind: 'purchase-order',
    label: order.id,
    detail: `${order.quantity} units of ${material.name} from ${supplierName}, now due ${order.currentDueDate}.`,
  };
}

/**
 * The node standing for the material whose supply is disturbed.
 *
 * @param material - The material record.
 * @param originName - The tier-2 origin the material is sourced through, as its record names it.
 * @returns The chain's second node.
 */
function materialNode(material: Material, originName: string): ImpactChainNode {
  return {
    ref: material.id,
    kind: 'material',
    label: material.name,
    detail: `${material.name}, ${material.leadTimeDays} working days of lead time, sourced through ${originName}.`,
  };
}

/**
 * The node standing for the production line that consumes the material.
 *
 * @param line - The line record.
 * @param plant - The plant the line belongs to.
 * @returns The chain's third node.
 */
function lineNode(line: Line, plant: Plant): ImpactChainNode {
  return {
    ref: line.id,
    kind: 'line',
    label: line.name,
    detail: `${line.name} at ${plant.name}, ${line.unitsPerDay} units per working day.`,
  };
}

/**
 * The node standing for one customer order a line places at risk.
 *
 * The units are the ones `resolveAffectedLines` derived from the exception's own record or from its
 * baseline measurement, so the node states the same quantity the queue row's revenue was valued on
 * rather than a second count of its own.
 *
 * @param line - The affected line the node stands for.
 * @param customerName - The customer the order belongs to, or `undefined` when the order book holds no
 *   such order and the customer is therefore unknown.
 * @returns One node of the chain's fourth group.
 */
function customerOrderNode(line: AffectedLine, customerName: string | undefined): ImpactChainNode {
  const forCustomer = customerName === undefined ? '' : ` for ${customerName}`;

  return {
    ref: line.orderId,
    kind: 'customer-order',
    label: line.orderId,
    detail: `${line.unitsAtRisk} units at risk${forCustomer}, promised ${line.dueDate}.`,
  };
}

/**
 * Builds the investigation's impact chain: purchase order → material → line → customer orders.
 *
 * The four kinds are the closed union `src/types/screen-dto.ts` fixes, in the order SCR-03 draws them,
 * and every node carries the identifier of the record behind it so a reader opens the record rather than
 * a copy of it. Nothing here is a computed figure: the quantities, lead times, rates and dates are record
 * values, and the units at risk come from the same affected-lines derivation the revenue was computed
 * from (rules P-6 and P-8).
 *
 * @param ctx - The call's context, whose records are read.
 * @param exception - The exception the chain describes.
 * @param lines - The affected lines `resolveAffectedLines` derived for it.
 * @returns The chain's nodes, in the order the investigation draws them.
 * @throws Problem - A `'validation'` failure when a record the chain names is not held.
 */
function impactChainOf(
  ctx: HandlerContext,
  exception: OperationalException,
  lines: readonly AffectedLine[],
): ImpactChainNode[] {
  const { records } = ctx.state;

  const order = recordNamed(
    ctx,
    records.purchaseOrders,
    exception.purchaseOrderId,
    'purchase order',
    exception.id,
  );
  const material = recordNamed(ctx, records.materials, exception.materialId, 'material', exception.id);
  const line = recordNamed(ctx, records.lines, exception.lineId, 'production line', exception.id);
  const plant = recordNamed(ctx, records.plants, exception.plantId, 'plant', exception.id);

  const supplier = records.suppliers.find((candidate) => candidate.id === order.supplierId);
  const origin = records.origins.find((candidate) => candidate.id === material.originId);

  const nodes: ImpactChainNode[] = [
    purchaseOrderNode(order, material, supplier === undefined ? order.supplierId : supplier.name),
    materialNode(material, origin === undefined ? material.originId : origin.name),
    lineNode(line, plant),
  ];

  for (const affectedLine of lines) {
    const customerOrder = records.customerOrders.find((candidate) => candidate.id === affectedLine.orderId);
    const customer =
      customerOrder === undefined
        ? undefined
        : records.customers.find((candidate) => candidate.id === customerOrder.customerId);

    nodes.push(customerOrderNode(affectedLine, customer === undefined ? undefined : customer.name));
  }

  return nodes;
}

/**
 * The audit events recorded against one exception, in chain order.
 *
 * `ExceptionDetail.activity` is typed as the chain's events (`src/types/screen-dto.ts` fixes it as
 * `AuditEvent[]`), so this reads the session's chain for the events whose `objectRef` is the exception
 * and copies each one, which keeps a caller from altering the trail through the payload it was handed.
 * The seeded history records are not events and are not dressed up as any: they date the overview's
 * median-hours tile and are read by `overview.ts`.
 *
 * @param state - The session whose chain is read. Not modified.
 * @param id - The exception whose activity is wanted.
 * @returns The events recorded against it, in the order the chain grew.
 */
function activityOf(state: MockState, id: ExceptionId): AuditEvent[] {
  return state.auditEvents
    .filter((event) => event.objectRef === id)
    .map((event) => ({ ...event }));
}

/* ---------------------------------------------------------------------------------------------
 * K. The reads — SCR-01, SCR-02 and SCR-03
 * ------------------------------------------------------------------------------------------- */

/**
 * Reads the overview: the four computed tiles, the changed-since list, the risk-by-plant rows and the
 * fourteen-day opened-and-resolved series.
 *
 * Every value is `src/domain/aggregation/overview.ts`'s output over the resolved scope and the records
 * this call may see, so the overview and the queue beside it describe one population (contracts §5, AAP
 * 0.2.1). The emptied-queue and `empty` triggers both compute the overview over an empty exception
 * collection, which is what makes the tiles report nothing rather than counting exceptions the queue no
 * longer lists.
 *
 * @param ctx - The session and the persona the call acts as.
 * @param selection - The shell's plant and product selection, which the one resolver intersects with
 *   the role's plant scope before the aggregate runs.
 * @returns The computed overview, freshly built.
 * @throws Problem - A `'permission'` failure when the role may not read the family or the forbidden
 *   trigger is on, or a `'validation'` failure when a figure's record cannot be resolved.
 */
export async function getOverview(
  ctx: HandlerContext,
  selection: ScopeFilterInput,
): Promise<Overview> {
  requireRead(ctx);

  return computeOverview(aggregateBundle(ctx, exceptionsFor(ctx.state)), scopeOf(ctx, selection));
}

/**
 * Reads the exception queue: one row per exception in scope, narrowed by the query's filters and ordered
 * as SCR-02 orders it.
 *
 * The read has one delivered order, and it is the order of these four steps: the query's filters narrow
 * the population, the narrowed population is measured, its rows are ordered, and one page of them is
 * returned. The filters come first because every member they read is the exception's own — the type,
 * severity, status and owner `computeExceptionRows` copies onto the row unchanged, the supplier the
 * exception buys its material from, the plant it also affects, and the day `openedOrResolvedOn` states
 * for it against the trail beside it — so a filtered or bounded read measures the exceptions it can
 * return rather than building an aggregate bundle and a row for the whole record set and then discarding
 * most of it in the filter and the page (contracts §9).
 *
 * Measuring cannot follow paging. A row's position in the queue is a function of members only the
 * measurement produces — revenue at risk above all, and the urgency rank `sortUrgent` takes over the
 * measures — so a slice cut before the ordering would hold the first `limit` records by identifier
 * rather than the most urgent ones, which is neither SCR-02's default sort nor the order contracts §9's
 * `sort` names. The ordering also states the position a `cursor` continues from, so it has to precede
 * the page rather than follow it.
 *
 * The rows themselves are still `computeExceptionRows`'s projection over the resolved scope, and the
 * plant and product narrowing stays inside it: the product selection admits a row by the products its
 * derived affected lines name, which is a member of the measured row and not of the record, and the
 * plant selection narrows beside it through the same predicate the overview applies, so a filtered queue
 * and the overview read beside it cannot describe two populations (AAP 0.2.1). `scopeOf` resolves the
 * scope once per call and the aggregate is handed that single answer unchanged.
 *
 * @param ctx - The session and the persona the call acts as.
 * @param query - The filters, order and page the queue read asked for.
 * @param selection - The shell's plant and product selection, resolved here once with the role's plant
 *   scope; the queue's own plant filter arrives in the query beside it and is applied to each exception
 *   by `admitsQuery`, as is the day filter it may carry.
 * @returns The page's rows, in the requested order.
 * @throws Problem - A `'permission'` failure when the role may not read the family or the forbidden
 *   trigger is on, or a `'validation'` failure when a figure's record cannot be resolved, the cursor
 *   names no row of the ordered queue, or the limit bounds no page.
 */
export async function listExceptions(
  ctx: HandlerContext,
  query: ExceptionQuery,
  selection: ScopeFilterInput,
): Promise<ExceptionRow[]> {
  requireRead(ctx);

  const history = ctx.state.records.exceptionHistory;
  const exceptions = exceptionsFor(ctx.state).filter((exception) =>
    admitsQuery(exception, query, history),
  );
  const bundle = aggregateBundle(ctx, exceptions);
  const rows = computeExceptionRows(bundle, scopeOf(ctx, selection));

  return pageOf(ctx, orderRows(rows, sortOrderOf(query.sort)), query);
}

/**
 * Reads one exception's investigation payload: the record, the impact chain, the projected stock, the
 * affected orders, the missing inputs and confidence, and the activity recorded against it.
 *
 * The projection is the exception's own solver case measured at the do-nothing levers over the case's own
 * window, so the series a planner reads is the one the case describes and never another disruption's. An
 * exception whose records name no case has no projection and no measured orders: both are empty rather
 * than borrowed, because a figure drawn from a case the records do not connect to it is a figure rule P-6
 * forbids. The record travels as a copy, so a screen cannot alter the session through the payload it was
 * handed.
 *
 * @param ctx - The session and the persona the call acts as.
 * @param id - The exception to read.
 * @returns The investigation payload, freshly built.
 * @throws Problem - A `'permission'` failure when the role may not read the family or the forbidden
 *   trigger is on; a `'not-found'` failure for an identifier this read does not reach; or a
 *   `'validation'` failure when a record the chain or the projection names is not held.
 */
export async function getException(ctx: HandlerContext, id: ExceptionId): Promise<ExceptionDetail> {
  requireRead(ctx);

  const exception = visibleException(ctx, id);
  const bundle = aggregateBundle(ctx, [exception]);
  const view = baselineViewFor(bundle, exception);
  const baseline = view.solve;
  const lines = resolveAffectedLines(exception, view);

  return {
    exception: structuredClone(exception),
    impactChain: impactChainOf(ctx, exception, lines),
    stockSeries:
      baseline === null
        ? []
        : baseline.dailyClosingStock.map((point) => ({ date: point.date, units: point.units })),
    affectedOrders:
      baseline === null
        ? []
        : baseline.orders.map((orderResult) => ({
            orderId: orderResult.orderId,
            unitsLate: orderResult.unitsLate,
            daysLate: orderResult.daysLate,
          })),
    missingInputs: [...exception.missingInputs],
    confidence: { level: exception.confidence.level, reason: exception.confidence.reason },
    activity: activityOf(ctx.state, exception.id),
  };
}

/**
 * Reads the customer order lines one exception places at risk, from the record that states them.
 *
 * The lines are the exception record's own `affectedLines`, copied member by member so a caller cannot
 * reach the session's state through them, and they are the same lines the investigation payload carries
 * inside `ExceptionDetail.exception`. The stored lines are the answer because the record states them: the
 * baseline-measured view of the same orders travels as `ExceptionDetail.affectedOrders`, and the figure
 * built from them is the detail read's revenue, so measuring them a second time here would be a second
 * answer to one measurement.
 *
 * The narrow read exists because the two things it needs are the two checks a detail read makes before
 * it reaches a record, and nothing else that read builds: `requireRead` and `visibleException` are called
 * in the same order, so the permission refusal, the forbidden trigger's refusal, the out-of-scope
 * `'not-found'` refusal and the trace identifier are the detail read's own answers rather than a second
 * set that could drift from them (AAP 0.18.1). The aggregate bundle, the baseline solve, the impact
 * chain and the filter of the activity trail belong to the payload that carries them, not to this one.
 *
 * @param ctx - The session and the persona the call acts as.
 * @param id - The exception whose lines are read.
 * @returns The affected lines, each a fresh copy.
 * @throws Problem - A `'permission'` failure when the role may not read the family or the forbidden
 *   trigger is on, or a `'not-found'` failure for an identifier this read does not reach.
 */
export function getAffectedLines(ctx: HandlerContext, id: ExceptionId): AffectedLine[] {
  requireRead(ctx);

  const exception = visibleException(ctx, id);

  return exception.affectedLines.map((line) => ({ ...line }));
}

/* ---------------------------------------------------------------------------------------------
 * L. The writes — SCR-02's row actions, contracts §6, rule P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The history actions this family appends.
 *
 * `src/seed/exception-history.ts` fixes the trail's vocabulary — `opened`, `assigned`, `noted`,
 * `dismissed`, `approved` and `resolved` — and the seeded records spell them the same way, so the set
 * below is that vocabulary minus `opened`, which is the detection a seeded record carries and no write
 * here performs. The first three are what a persona's own writes record; the last two are what
 * `recordApprovedPlan` records, in that order, when the approved change lands. The audit event records
 * the contracts §6 action (`assign`, `note`, `dismiss`, and the derived `resolved`), which is a
 * different vocabulary from the trail's past-tense one and is spelled where the event is appended.
 */
type ExceptionHistoryAction = 'assigned' | 'noted' | 'dismissed' | 'approved' | 'resolved';

/**
 * The sequence number the next history record of one exception carries.
 *
 * Seeded records key themselves `<exceptionId>-NN`, so the next one continues that count. It is derived
 * from the records the session holds rather than stored, which keeps a reset's history identical to a
 * fresh session's.
 *
 * @param history - The session's history records.
 * @param id - The exception the record will belong to.
 * @returns One more than the number of records the exception already has.
 */
function historySequenceFor(
  history: readonly ExceptionHistoryRecord[],
  id: ExceptionId,
): number {
  let existing = 0;

  for (const record of history) {
    if (record.exceptionId === id) {
      existing += 1;
    }
  }

  return existing + 1;
}

/**
 * Appends one activity record to the session's exception history.
 *
 * The record is stamped with the instant the audit event of the same action carries, so the two records
 * of one write agree about when it happened and no clock is read. The history collection is replaced with
 * a new array holding the new record, because the seeded collection is declared read-only.
 *
 * @param ctx - The call's context, whose history and persona are read.
 * @param exception - The exception the activity happened on, after the write was applied — its status is
 *   the state the record reports.
 * @param action - The trail action the write records.
 * @param note - What happened, in the words the write supplies.
 * @param occurredAt - The instant the appended audit event carries.
 */
function appendHistory(
  ctx: HandlerContext,
  exception: OperationalException,
  action: ExceptionHistoryAction,
  note: string,
  occurredAt: Timestamp,
): void {
  const { exceptionHistory } = ctx.state.records;
  const record: ExceptionHistoryRecord = {
    id: `${exception.id}-${String(historySequenceFor(exceptionHistory, exception.id)).padStart(
      HISTORY_SEQUENCE_DIGITS,
      '0',
    )}`,
    exceptionId: exception.id,
    occurredAt,
    actorId: ctx.actor.id,
    action,
    status: exception.status,
    note,
  };

  ctx.state.records.exceptionHistory = [...exceptionHistory, record];
}

/**
 * The persona an assignment makes accountable, refused when the records hold no such persona.
 *
 * The queue's "assign to me" fills the member with the acting persona's own identifier, so the record set
 * always holds the assignee of that path; a caller naming an identifier the records do not carry is a
 * request the records cannot honour rather than a missing record behind a figure (rule P-8).
 *
 * @param ctx - The call's context, whose users are read.
 * @param assigneeId - The persona the call names.
 * @returns The persona's record.
 * @throws Problem - A `'validation'` failure when no persona carries that identifier.
 */
function assigneeOf(ctx: HandlerContext, assigneeId: UserId): SeededUser {
  const wanted = assigneeId.trim();

  if (wanted === '') {
    throw validationProblem(
      ctx,
      'An assignment names the persona who becomes accountable for the exception; this request names none.',
    );
  }

  const assignee = ctx.state.records.users.find((candidate) => candidate.id === wanted);

  if (assignee === undefined) {
    throw validationProblem(
      ctx,
      `The record set holds no persona ${wanted}, so the exception cannot be assigned to it.`,
    );
  }

  return assignee;
}

/**
 * Assigns an exception to a persona, appends the `assign` audit event and the history record behind it.
 *
 * The write authorises first, then refuses a record that moved under the reader through
 * `requireNoConflict` in `./audit` — the one guard every write this build's screens make on an existing
 * record meets — and only then appends one event whose `before` and `after` payloads hold only the owner
 * that changed, edits the session's record, and stamps the history entry from that event's own instant.
 * A refusal leaves the records and the chain untouched, so a denied or refused assignment creates no
 * approval, no write-back and no audit record (AAP 0.2.2, contracts §6).
 *
 * @param ctx - The session and the persona the call acts as.
 * @param id - The exception to assign.
 * @param assigneeId - The persona becoming accountable.
 * @returns The exception's investigation payload as the session now holds it.
 * @throws Problem - A `'permission'` failure when the role may not work the exception; a `'not-found'`
 *   failure for an identifier this write does not reach; or a `'validation'` failure when the record
 *   moved under the reader or no persona carries the assignee identifier.
 */
export async function assignException(
  ctx: HandlerContext,
  id: ExceptionId,
  assigneeId: UserId,
): Promise<ExceptionDetail> {
  requireWritable(ctx);

  const exception = visibleException(ctx, id);
  requireWork(ctx, exception);
  requireNoConflict(ctx, `Exception ${exception.id} is reported ${exception.status}.`);
  const assignee = assigneeOf(ctx, assigneeId);

  const event = await appendAuditEvent(ctx, {
    action: 'assign',
    objectRef: exception.id,
    result: 'succeeded',
    before: { ownerId: exception.ownerId },
    after: { ownerId: assignee.id },
  });

  exception.ownerId = assignee.id;

  appendHistory(
    ctx,
    exception,
    'assigned',
    `Assigned to ${assignee.name} by ${ctx.actor.name}.`,
    event.timestamp,
  );

  return getException(ctx, exception.id);
}

/**
 * Records a note against an exception, appends the `note` audit event and the history record behind it.
 *
 * The note is the planner's own words and travels to the event's payload unchanged, so the activity a
 * reader follows is the record itself rather than a second copy of the sentence. An empty note is refused
 * rather than recorded, because a record that says nothing is of no use to the next reader (rule P-8).
 * A record that moved under the reader is refused first, through `requireNoConflict` in `./audit` — the
 * one guard every write this build's screens make on an existing record meets — so a note is never
 * merged into a record another persona changed.
 *
 * @param ctx - The session and the persona the call acts as.
 * @param id - The exception the note concerns.
 * @param note - The note, in the caller's own words.
 * @returns The exception's investigation payload as the session now holds it.
 * @throws Problem - A `'permission'` failure when the role may not work the exception; a `'not-found'`
 *   failure for an identifier this write does not reach; or a `'validation'` failure when the record
 *   moved under the reader, the note is empty or longer than `FREE_TEXT_MAX_LENGTH`.
 */
export async function addExceptionNote(
  ctx: HandlerContext,
  id: ExceptionId,
  note: string,
): Promise<ExceptionDetail> {
  requireWritable(ctx);

  const exception = visibleException(ctx, id);
  requireWork(ctx, exception);
  requireNoConflict(ctx, `Exception ${exception.id} is reported ${exception.status}.`);

  const text = note.trim();

  if (text === '') {
    throw validationProblem(
      ctx,
      `A note against ${exception.id} has to say something; this one is empty, so there is nothing to record.`,
    );
  }

  assertFreeTextLength(ctx, `a note against ${exception.id}`, text);

  const event = await appendAuditEvent(ctx, {
    action: 'note',
    objectRef: exception.id,
    result: 'succeeded',
    before: null,
    after: { note: text },
  });

  appendHistory(ctx, exception, 'noted', text, event.timestamp);

  return getException(ctx, exception.id);
}

/**
 * Dismisses an exception with the reason the dismissal rests on, appends the `dismiss` audit event and
 * the history record behind it.
 *
 * SCR-02 enables the action only once a reason is given, and this write refuses a dismissal without one
 * rather than trusting the control's own state, so a dismissed row always says why it was set aside. A
 * record that moved under the reader is refused first, through `requireNoConflict` in `./audit` — the
 * one guard every write this build's screens make on an existing record meets — so no dismissal is
 * merged into a record another persona changed. Only an exception that still stands open is dismissed: a
 * record that has already moved on is reported with its current status, which is the conflicting-update
 * condition reported through `'validation'` because `ProblemType` gives it no cause of its own (see
 * `validationProblem`).
 *
 * @param ctx - The session and the persona the call acts as.
 * @param id - The exception to dismiss.
 * @param reason - Why the exception is being set aside.
 * @returns The exception's investigation payload as the session now holds it.
 * @throws Problem - A `'permission'` failure when the role may not work the exception; a `'not-found'`
 *   failure for an identifier this write does not reach; or a `'validation'` failure when the record
 *   moved under the reader, the reason is empty or longer than `FREE_TEXT_MAX_LENGTH`, or the exception
 *   is no longer open.
 */
export async function dismissException(
  ctx: HandlerContext,
  id: ExceptionId,
  reason: string,
): Promise<ExceptionDetail> {
  requireWritable(ctx);

  const exception = visibleException(ctx, id);
  requireWork(ctx, exception);
  requireNoConflict(ctx, `Exception ${exception.id} is reported ${exception.status}.`);

  const text = reason.trim();

  if (text === '') {
    throw validationProblem(
      ctx,
      `A dismissal of ${exception.id} has to state its reason; this one is empty, so the row would ` +
        'not say why it was set aside.',
    );
  }

  assertFreeTextLength(ctx, `a dismissal reason for ${exception.id}`, text);

  if (exception.status !== OPEN_STATUS) {
    throw validationProblem(
      ctx,
      `Exception ${exception.id} stands ${exception.status}, so only an open exception can be dismissed.`,
    );
  }

  const event = await appendAuditEvent(ctx, {
    action: 'dismiss',
    objectRef: exception.id,
    result: 'succeeded',
    before: { status: exception.status },
    after: { status: DISMISSED_STATUS, reason: text },
  });

  exception.status = DISMISSED_STATUS;

  appendHistory(ctx, exception, 'dismissed', text, event.timestamp);

  return getException(ctx, exception.id);
}

/* ---------------------------------------------------------------------------------------------
 * M. The resolution an approved plan's completed change leaves — AAP 0.2.2, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * Whether every step of an approval's change was written.
 *
 * AAP 0.2.1 makes a simulated write-back all-or-nothing, so a change lands only when no step of it is
 * pending or failed; an approval that states no step has nothing to withhold and has landed. The
 * approvals family asks the same question of the same record before it measures an outcome (see
 * `changeLanded` in `./approvals.ts`), and the two read the record rather than an outcome each keeps,
 * so a plan cannot land for one of them and not the other.
 *
 * @param approval - The plan whose steps are read. Not modified.
 * @returns `true` when every step succeeded.
 */
function planChangeLanded(approval: Approval): boolean {
  return approval.writeBacks.every((step) => step.state === SUCCEEDED_WRITE_BACK);
}

/**
 * Records the resolution an approved plan's completed change leaves on its exception.
 *
 * AAP 0.2.2 ends the planner's journey at a written-back plan, and the record that journey is about
 * is the exception: `src/seed/exception-history.ts` states the intent for the flagship case — "the
 * planner approves it in the browser during the end-to-end journey" — and the seeded exceptions that
 * carry an approval carry its history beside it. A decision taken live therefore closes the loop here
 * rather than only inside the approval record and the trail: the exception's status moves to
 * `resolved`, its activity gains the event that says so, and its history gains the two records the
 * seeded vocabulary already spells, `approved` at the decision's instant and `resolved` after it, so
 * the overview's median-hours tile measures a live approval the way it measures a seeded one.
 *
 * The event names the EXCEPTION as the record it is about, never the approval. A reader who filters
 * the trail by the exception follows the resolution from the record they are reading, and the
 * journey's own filter — the approval's identifier, which holds the request, the decision and each
 * write-back step — keeps exactly its own rows. Both members the payload adds are the records the
 * resolution rests on, so an event read on its own states which plan was written and which option it
 * carried.
 *
 * THE THREE CONDITIONS, EACH OF WHICH MAKES THIS A NO-OP RATHER THAN A REFUSAL. The call is a
 * continuation of a write the approvals family has already authorised, validated and recorded, so
 * nothing here refuses: it either has something to record or nothing to do. A plan that is not
 * approved has no change to land. A plan whose change has not landed — a step failed, or a step is
 * still pending — leaves the exception open, because AAP 0.2.2's all-or-nothing rule means the
 * disruption is still unanswered. An exception that is no longer `open` has already been resolved (or
 * dismissed), and recording a second resolution of it would add an event, a pair of history records
 * and a status change that describe a decision the record already holds — which is why a second
 * landing call, from a retry after the change already landed, changes nothing at all.
 *
 * @param ctx - The call's context, whose chain the event is appended to and whose persona the history
 *   records name.
 * @param exception - The exception the plan answers. Its status is changed here.
 * @param approval - The approved plan whose change landed.
 * @returns Nothing; the session's records carry the result.
 */
export async function recordApprovedPlan(
  ctx: HandlerContext,
  exception: OperationalException,
  approval: Approval,
): Promise<void> {
  if (exception.status !== OPEN_STATUS || approval.status !== APPROVED_PLAN_STATUS) {
    return;
  }

  if (!planChangeLanded(approval)) {
    return;
  }

  /* The resolution is appended once, about the exception, and the status the payload records is the
     one the record is moved to below — the same order every write of this family keeps, so the event
     a reader opens already describes the state they find. */
  const event = await appendAuditEvent(ctx, {
    action: 'resolved',
    objectRef: exception.id,
    result: 'succeeded',
    before: { status: exception.status },
    after: {
      status: RESOLVED_STATUS,
      approvalId: approval.id,
      scenarioId: approval.scenarioId,
    },
  });

  /* The decision's own instant, which the approvals family read from the event that decision
     appended. A plan whose record states none is dated by this append instead, so the two history
     records stay in the order the vocabulary expects rather than resting on a member that happens to
     be present. */
  appendHistory(
    ctx,
    exception,
    'approved',
    `The plan ${approval.id} for ${approval.scenarioId} was approved, and the change it sets in ` +
      'motion follows.',
    approval.decidedAt ?? event.timestamp,
  );

  exception.status = RESOLVED_STATUS;

  appendHistory(
    ctx,
    exception,
    'resolved',
    `Every step of the approved change under ${approval.id} was written, so the response is ` +
      `recorded and ${exception.id} stands resolved.`,
    event.timestamp,
  );
}

