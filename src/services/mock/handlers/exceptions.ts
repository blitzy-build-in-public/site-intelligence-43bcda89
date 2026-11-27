/**
 * The exceptions family of the in-browser mock adapter: the overview read, the exception queue, the
 * investigation detail, and the three writes that change an exception — assign, note and dismiss.
 *
 * Implements the "Handlers" row of AAP 0.12.1 at the `handlers/` path AAP 0.13.1 fixes, in the shape
 * the parent folder's brief gives this entry: "the queue list and the investigation detail:
 * `ExceptionRow[]` and `ExceptionDetail` built through `src/domain/aggregation/exceptions.ts` and
 * `urgency.ts` against the resolved scope, with filters from `ExceptionQuery`". AAP 0.12.2 derives the
 * three payload shapes it returns — `Overview`, `ExceptionRow` and `ExceptionDetail` — and AAP 0.8
 * fixes the rule the whole family exists to keep: every displayed number traces to a pure
 * deterministic function, so nothing below computes a figure of its own.
 *
 * WHAT THIS MODULE DOES, IN ONE SENTENCE PER MEMBER. `getOverview` returns the aggregate
 * `src/domain/aggregation/overview.ts` computes — four tiles, the changed-since list, the by-plant
 * rows and the fourteen-day series (contracts §5). `listExceptions` projects the queue rows
 * `src/domain/aggregation/exceptions.ts` computes, narrows them by the filters `ExceptionQuery`
 * declares, orders them with `sortUrgent` in `src/domain/aggregation/urgency.ts`, and pages them.
 * `getException` returns the investigation payload: the record, the impact chain from purchase order
 * to customer orders, the projected closing stock the solver measures, the affected orders, the
 * missing inputs and confidence the record carries, and the activity recorded against the exception.
 * The three writes update the session's record, append one history record and append exactly one
 * audit event.
 *
 * ONE SCOPE RESOLUTION, AND WHY IT LIVES HERE. AAP 0.2.1 requires one scope resolver combining the
 * top bar's selection with the role's plant scope, "used by every list call and every aggregate, so a
 * filtered queue and a filtered overview cannot disagree". `resolveScope` from
 * `src/domain/aggregation/scope.ts` is that resolver, and this module calls it once per call and hands
 * the single resulting `Scope` to the aggregate. The overview therefore belongs to this family: it is
 * the same exceptions, the same prices, the same order book and the same baseline solves, over the
 * same resolved scope, as the queue a screen shows beside it.
 *
 * THE QUEUE'S ORDER AND ITS LIST PARAMETERS. The default order is `sortUrgent`'s — severity, then days
 * to impact ascending, then revenue at risk descending, then identifier — which is SCR-02's default
 * sort. An explicit `sort=field:dir` (contracts §9) orders by one of the row's own comparable members
 * instead, and the severity ordering stays `sortUrgent`'s own: the urgency rank is the domain module's
 * ranking and is not restated here, because a second copy of it would be a second answer to "which
 * exception is most urgent" (rule P-6). `limit` is the greatest number of rows to return and `cursor`
 * is the identifier of the last row the previous page returned, from which the next page continues;
 * both are honoured as contracts §9 spells them.
 *
 * THE TWO TRIGGERS THIS FAMILY ANSWERS, AS DATA AND NOT AS A COMPONENT BRANCH. The emptied-queue
 * trigger returns no rows and computes the overview over the same emptied exception collection, so the
 * tiles and the queue describe one population rather than two. The forbidden trigger refuses every call
 * of the family with the permission failure a forbidden card renders, before any record is read. Both
 * reach a screen through the shape of the result, never through a flag a component reads
 * (AAP 0.12.1).
 *
 * WHAT THE INVESTIGATION DETAIL IS BUILT FROM, AND WHAT IT REFUSES TO INVENT. The impact chain runs
 * purchase order → material → production line → customer orders, each node carrying the identifier of
 * the record behind it so the evidence drawer resolves its evidence from that record, and each node's
 * detail being the record's own values rather than a figure authored here. The projected closing stock
 * is the daily series `solveSupplyDelay` measures for the exception's OWN solver case at the case's own
 * baseline levers — the do-nothing measurement AAP 0.8 fixes — over the case's own window, which is the
 * seeded 3 to 23 December 2026 window. An exception whose records name no case has no projection and
 * gets an empty series: the seeded case of another exception is never lent to it, because a projection
 * of one plant's supply position shown against another plant's disruption would be a figure rule P-6
 * forbids. For the same reason the affected orders are the solver's own per-order measurements, empty
 * when nothing was measured, and neither the confidence nor the missing inputs is synthesised: both are
 * copied from the record that states them.
 *
 * THE WRITES ARE ALL-OR-NOTHING, AUDITED ONCE, AND THEY DO NOT CONSULT THE POLICY ENGINE. Each write
 * authorises first (`exception.work` over the exception's plant, plus the forbidden trigger), then
 * appends one audit event through `./audit.ts`'s `appendAuditEvent` with the action contracts §6
 * spells — `assign`, `note`, `dismiss` — the exception's identifier as `objectRef`, and `before`/`after`
 * payloads holding only the fields the write changed. It then edits the session's record and appends
 * one history record stamped with the instant the appended audit event itself carries, so the two
 * records of one action agree and no clock is read. `evaluate()` in `src/domain/policy/evaluate.ts` is
 * deliberately not called: its `PolicyAction` union covers an outbound endpoint, an approval decision,
 * an assistant query and a policy lookup, and none of the three actions here is one of them, so asking
 * it would be asking a question it does not answer.
 *
 * WHAT IT REFUSES, AND THE CAUSE EACH REFUSAL NAMES. An identifier the record set does not hold, and
 * one it holds outside the acting role's plant scope, both produce `'not-found'`: the first because no
 * record answers it, the second because it is not part of the read this role may make, and the message
 * names the identifier either way. A role that lacks the permission produces `'permission'`, carrying
 * `requiredPermission` and the roles that hold it, which is what a forbidden card and a disabled
 * control's explanation print (rules P-3 and P-8). A dismissal without a reason, an empty note, an
 * unknown assignee and a dismissal of an exception that is no longer open produce `'validation'`. The
 * conflicting-update state specification §8 gives the screens has no cause of its own in
 * `ProblemType`, so a write that meets a record which has already moved on is reported as
 * `'validation'` with the record's current status in the message rather than through a sixth cause
 * invented here.
 *
 * LABELS: NONE ARE ATTACHED HERE, BECAUSE NO PAYLOAD HAS A PLACE FOR ONE. `Overview`, `ExceptionRow`
 * and `ExceptionDetail` in `src/types/screen-dto.ts` carry no `SimLabel` member — the label belongs to
 * the element that renders a figure (AAP 0.10), and `src/types/primitives.ts` owns the seven exact
 * strings — so this module types none of them, paraphrases none of them, and adds no member to a
 * contracts-derived shape to hold one (rules P-1 and P-6).
 *
 * DETERMINISTIC BY CONSTRUCTION. Every "now" is the constant `DEMO_CLOCK` of contracts §1, which the
 * aggregate bundle carries as its as-of instant; the writes take their history instant from the audit
 * event they appended. No system clock, random source, locale comparison or module-level mutable value
 * is read, so two calls with the same session return the same payload (AAP 0.18.2). The aggregates are
 * pure functions of the bundle, and the bundle is built fresh on every call from records the session
 * holds, so a caller can neither alter the session by editing what it was handed nor observe a figure
 * that a previous call cached.
 *
 * WHY THE AGGREGATE BUNDLE IS BUILT HERE RATHER THAN SHARED. `handlers/topology.ts` builds the same
 * bundle for the canvas ribbon, and the two builders are two copies of one fifteen-line function. They
 * stay two: AAP 0.12.1 fixes this folder at nine files, of which one per read/write family plus the
 * audit append path, so there is no shared helper module to hold the copy and adding one would make a
 * tenth. What the handlers do import from each other is another family's data —
 * `handlers/approvals.ts` reads the scenario set `handlers/scenarios.ts` builds — and the append path
 * `handlers/audit.ts` owns, which the writing families call instead of repeating it; neither is a
 * builder lifted out of another family. Each copy reads its own family's inputs from the session and
 * neither computes anything.
 *
 * Rules this module is built to satisfy:
 * - P-6: every number is an aggregate's or the solver's output, or a record value copied across. No
 *   currency amount, count, threshold or domain identifier is written here, and nothing is rounded —
 *   `halfUp2` and `wholePercent` live in `src/domain/solver/rounding.ts` and are reached only through
 *   the modules that own the arithmetic. `tests/fixtures/` is not imported.
 * - P-2: records are reached only through `ctx.state` and the sibling `../seed-loader.ts` type surface,
 *   and the arithmetic only through `src/domain`. No `src/seed` import, no React, no `src/app`, no
 *   `src/features`, no API client: only `mock-backend.ts` imports this file, so the port stays the one
 *   data boundary.
 * - P-1: it types no simulation label, and no payload it returns carries one.
 * - P-3, P-8: the permission verdict comes from `ctx.actor`, so bypassing the role switcher changes
 *   nothing, and the failure carries the permission and the roles that hold it so a disabled control
 *   can say who may act. The checks are a demonstration control: they run in a browser page and are not
 *   production authorisation.
 * - P-4: nothing here claims a security property. The audit trail it appends to is a mechanism the
 *   interface labels `Simulated control`, and no sentence below claims anything of the chain beyond the
 *   recomputation a verification performs.
 * - P-5: no market-intelligence value enters any payload, so no overview tile, queue row or detail
 *   figure can blend a competitor reading with a first-party one.
 * - P-7: every name it returns is a seed record's own synthetic name or identifier; this file names no
 *   company, product or person of its own and carries no placeholder text.
 * - B-1, B-2: it contacts no host, addresses none, holds no credential-shaped literal and reads no
 *   configuration.
 * - B-3: it renders nothing, so no focusable element, colour or motion is its to get wrong. What it owes
 *   the rule is the other half of it: every refusal carries the plain-words sentence a screen prints and
 *   the permission with the roles that hold it, so the control a reader meets is an explained one rather
 *   than a silent disabled button.
 *
 * WHY THE PRODUCT SELECTION TRAVELS BESIDE THE QUERY RATHER THAN INSIDE IT. `src/types/service.ts` gives
 * `ExceptionQuery` the plant, type, severity, status, owner and supplier filters and no product member,
 * because AAP 0.12.2 fixes that query as the queue's own filters. The shell's product selection reaches
 * the service as a member of `Scope` instead, so each read of this family takes the shell's selection as
 * a `ScopeFilterInput` of its own beside the query and resolves it once through `resolveScope`. A product
 * chosen in the top bar therefore narrows the queue and the overview through the same aggregate
 * predicate (`admitsProducts`) both already apply, and neither read is narrowed by a plant alone.
 *
 * OPEN ITEM — the cursor is a row identifier. `ListQuery.cursor` is opaque by contracts §9 and the
 * method returns rows rather than a paged envelope, so the position this module accepts is the
 * identifier of the last row the previous call returned, and the next page continues after it in the
 * order that call reported. A cursor no row carries is read as the start of the list rather than as a
 * failure, because a page that can answer is worth more than a refusal over a position.
 *
 * OPEN ITEM — `ExceptionDetail.activity` is typed as audit events, and the seeded history records are
 * not audit events. `src/types/screen-dto.ts` fixes the member as `AuditEvent[]` — "the audit events
 * recorded against this exception, in chain order" — so it carries the chain's events whose
 * `objectRef` is the exception, shallow-copied per call. The seeded `EXCEPTION_HISTORY` records date
 * the overview's median-hours tile and are read by `overview.ts`; they are not a second activity list
 * and are not dressed up as chain events here.
 */

/* ---------------------------------------------------------------------------------------------
 * Imports — the shared vocabulary, the domain modules this family delegates to, and the siblings
 * ------------------------------------------------------------------------------------------- */

import { DEMO_CLOCK } from '../../../types';
import type {
  AffectedLine,
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
} from '../../../types';

import {
  baselineViewFor,
  computeExceptionRows,
  resolveAffectedLines,
} from '../../../domain/aggregation/exceptions';
import type { BaselineSolve } from '../../../domain/aggregation/exceptions';
import { computeOverview } from '../../../domain/aggregation/overview';
import type { OverviewInput } from '../../../domain/aggregation/overview';
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
import { freshnessFor, isSimulationOn } from '../simulation';
import { appendAuditEvent, traceIdFor } from './audit';

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
 * @param ctx - The call's context, whose state supplies the trace identifier.
 * @param permission - The permission the call required and the role lacks.
 * @param message - The reason, in plain words, naming the role and the permission.
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
 * The refusal an identifier the acting role's read does not reach throws — contracts §2's
 * `'not-found'` cause.
 *
 * Both the identifier the record set does not hold and the one it holds outside the role's plant scope
 * are reported this way: the second is a record this read does not cover rather than a refusal of the
 * role's permission, which the family's reads already checked.
 *
 * @param ctx - The call's context, whose state supplies the trace identifier.
 * @param message - The reason, in plain words, naming the identifier.
 * @returns The `Problem` to throw.
 */
function notFoundProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'not-found', message, traceId: traceIdFor(ctx.state) };
}

/**
 * The refusal a request the records cannot honour throws.
 *
 * It carries the causes this family reports as validation: an empty note, a dismissal without a
 * reason, an assignee the record set does not hold, a dismissal of an exception that is no longer
 * open, and a record set whose case cannot be measured. `ProblemType` has no cause for a record that
 * has moved on, so the conflicting-update state is reported here with the record's current status in
 * the message rather than through an invented sixth cause.
 *
 * @param ctx - The call's context, whose state supplies the trace identifier.
 * @param message - The reason, in plain words.
 * @returns The `Problem` to throw.
 */
function validationProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'validation', message, traceId: traceIdFor(ctx.state) };
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
      `The exception records are not readable in this state; reading them requires the ${EXCEPTION_READ} permission.`,
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
    `The exception records are not writable in this state; writing to them requires the ` +
      `${EXCEPTION_WORK} permission. The roles that hold it are ${rolesWith(EXCEPTION_WORK).join(', ')}.`,
  );
}

/**
 * Refuses the write unless the acting persona may work the exception, over the plant it lands on.
 *
 * The check is made against the exception as its subject, so the contracts §7.1 matrix applies both the
 * role's plant scope and the persona's own: a planner cannot change an exception at a plant outside
 * their reach even while another persona in the same role could. The refusal names the permission and
 * the roles that hold it, which is what a disabled action's explanation prints (rule P-8).
 *
 * @param ctx - The call's context.
 * @param exception - The exception the write concerns.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function requireWork(ctx: HandlerContext, exception: OperationalException): void {
  if (hasPermission(ctx.actor.role, EXCEPTION_WORK, exception, ctx.actor)) {
    return;
  }

  throw permissionProblem(
    ctx,
    EXCEPTION_WORK,
    `The acting role (${ctx.actor.role}) does not hold the ${EXCEPTION_WORK} permission over ` +
      `${exception.plantId}, so ${exception.id} cannot be changed here. The roles that hold it are ` +
      `${rolesWith(EXCEPTION_WORK).join(', ')}.`,
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
 * @param selection - The shell's selection, as the adapter carried it: one plant and one product, each
 *   absent for "all".
 * @returns The resolved scope; its `plants` member empty means nothing is in scope.
 */
function scopeOf(ctx: HandlerContext, selection: ScopeFilterInput): Scope {
  return resolveScope(selection, ctx.actor.role);
}

/**
 * Says whether an exception is one a resolved scope admits.
 *
 * The rule `computeExceptionRows` applies, restated because this module also has to apply it to a
 * single record for the detail read: the exception is in scope when the plant it lands on, or any plant
 * it also affects, is one the selection names. Nothing is widened when `scope.plants` is empty — that
 * answer means nothing is in scope, never "all plants".
 *
 * @param exception - The exception to place.
 * @param scope - The resolved scope.
 * @returns `true` when the exception or a plant it also affects is inside the selection.
 */
function landsInScope(exception: OperationalException, scope: Scope): boolean {
  if (scope.plants.includes(exception.plantId)) {
    return true;
  }

  return exception.alsoAffectsPlantIds.some((plantId) => scope.plants.includes(plantId));
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
 * The session's own collection, or an empty one while the emptied-queue trigger is in effect. The choice
 * is made here, once, so the queue's rows and the overview's counts are computed from the same input
 * rather than from two branches that could disagree (AAP 0.12.1, T-17).
 *
 * @param state - The session whose triggers and records are read. Not modified.
 * @returns The exceptions the read is computed over.
 */
function exceptionsFor(state: MockState): readonly OperationalException[] {
  return isSimulationOn(state, 'empty-queue') ? [] : state.records.exceptions;
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
 * Indexes the exceptions a read was computed over by identifier.
 *
 * The queue rows carry twelve members and no `alsoAffectsPlantIds` and no `supplierId`, so the two
 * filters that read those members reach the exception each row was projected from. The map is built once
 * per call rather than scanning the collection per row.
 *
 * @param exceptions - The exceptions the read was computed over.
 * @returns A fresh map from an exception identifier to its record.
 */
function indexById(
  exceptions: readonly OperationalException[],
): Map<ExceptionId, OperationalException> {
  const index = new Map<ExceptionId, OperationalException>();

  for (const exception of exceptions) {
    index.set(exception.id, exception);
  }

  return index;
}

/**
 * Whether a queue row answers every filter the query set.
 *
 * Each filter is applied only where the query states it. The type, severity, status and owner filters
 * read the row, because the row carries those members. The plant filter matches the plant the exception
 * lands on **or** one it also affects, which is the reading `src/types/service.ts` fixes for it and the
 * one the scoped aggregate applies. The supplier filter reads the supplier the exception buys its
 * material from, which is a record value rather than a row member.
 *
 * @param row - The row to test.
 * @param exception - The exception the row was projected from.
 * @param query - The query the call was served with.
 * @returns `true` when the row answers every filter stated.
 */
function admitsQuery(
  row: ExceptionRow,
  exception: OperationalException,
  query: ExceptionQuery,
): boolean {
  if (query.type !== undefined && row.type !== query.type) {
    return false;
  }

  if (query.severity !== undefined && row.severity !== query.severity) {
    return false;
  }

  if (query.status !== undefined && row.status !== query.status) {
    return false;
  }

  if (query.ownerId !== undefined && row.ownerId !== query.ownerId) {
    return false;
  }

  if (query.supplierId !== undefined && exception.supplierId !== query.supplierId) {
    return false;
  }

  if (query.plantId === undefined) {
    return true;
  }

  return (
    exception.plantId === query.plantId || exception.alsoAffectsPlantIds.includes(query.plantId)
  );
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
 * the row that follows it in the order that call reported. A cursor no row carries is read as the start
 * of the list rather than as a failure, which is what `ListQuery.cursor` being opaque allows.
 *
 * @param rows - The ordered rows the page is taken from.
 * @param cursor - The cursor the query carried, or `undefined` when it carried none.
 * @returns The index to start at.
 */
function startIndexOf(rows: readonly ExceptionRow[], cursor: string | undefined): number {
  if (cursor === undefined) {
    return 0;
  }

  const found = rows.findIndex((row) => row.id === cursor);

  return found === -1 ? 0 : found + 1;
}

/**
 * The greatest number of rows a page may hold, or `null` when the query sets no usable bound.
 *
 * A limit that is absent, negative or not a whole number bounds nothing, so the page runs to the end of
 * the list rather than returning nothing at all.
 *
 * @param limit - The limit the query carried, or `undefined` when it carried none.
 * @returns The bound to apply, or `null`.
 */
function limitOf(limit: number | undefined): number | null {
  if (limit === undefined || !Number.isInteger(limit) || limit < 0) {
    return null;
  }

  return limit;
}

/**
 * Takes one page of the ordered rows.
 *
 * @param rows - The ordered rows.
 * @param query - The query, whose `cursor` and `limit` bound the page.
 * @returns The rows of the page, in the order the caller asked for.
 */
function pageOf(rows: readonly ExceptionRow[], query: ExceptionQuery): ExceptionRow[] {
  const page = rows.slice(startIndexOf(rows, query.cursor));
  const limit = limitOf(query.limit);

  return limit === null ? page : page.slice(0, limit);
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
 * read.
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

  if (!landsInScope(exception, scope)) {
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
 * median-hours tile (see the module header's third OPEN ITEM).
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
 * 0.2.1). The emptied-queue trigger computes the overview over an empty exception collection, which is
 * what makes the tiles report nothing rather than counting exceptions the queue no longer lists.
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
 * The rows are `computeExceptionRows`'s projection over the resolved scope and are not re-derived here;
 * the filters the row cannot answer on its own — the plant the exception also affects, and the supplier
 * its material is bought from — are read from the exception the row was projected from, which is why the
 * collection is indexed once. Ordering and paging are applied last, so a page holds the rows a reader
 * asked for rather than a slice of an unordered list (contracts §9).
 *
 * @param ctx - The session and the persona the call acts as.
 * @param query - The filters, order and page the queue read asked for.
 * @param selection - The shell's plant and product selection, resolved here once with the role's plant
 *   scope; the queue's own plant filter arrives in the query beside it and is applied to each row by
 *   `admitsQuery`.
 * @returns The page's rows, in the requested order.
 * @throws Problem - A `'permission'` failure when the role may not read the family or the forbidden
 *   trigger is on, or a `'validation'` failure when a figure's record cannot be resolved.
 */
export async function listExceptions(
  ctx: HandlerContext,
  query: ExceptionQuery,
  selection: ScopeFilterInput,
): Promise<ExceptionRow[]> {
  requireRead(ctx);

  const exceptions = exceptionsFor(ctx.state);
  const rows = computeExceptionRows(aggregateBundle(ctx, exceptions), scopeOf(ctx, selection));
  const byId = indexById(exceptions);

  const filtered = rows.filter((row) => {
    const exception = byId.get(row.id);

    return exception !== undefined && admitsQuery(row, exception, query);
  });

  return pageOf(orderRows(filtered, sortOrderOf(query.sort)), query);
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

/* ---------------------------------------------------------------------------------------------
 * L. The writes — SCR-02's row actions, contracts §6, rule P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The history actions this family appends.
 *
 * `src/seed/exception-history.ts` fixes the trail's vocabulary; these are the three members a write here
 * records, and the seeded records spell them the same way. The audit event records the contracts §6 action
 * (`assign`, `note`, `dismiss`), which is a different vocabulary from the trail's past-tense one and is
 * spelled where the event is appended.
 */
type ExceptionHistoryAction = 'assigned' | 'noted' | 'dismissed';

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
 * The write authorises first, then appends one event whose `before` and `after` payloads hold only the
 * owner that changed, then edits the session's record and stamps the history entry from that event's own
 * instant. A refusal leaves the records and the chain untouched, so a denied assignment creates no
 * approval, no write-back and no audit record (AAP 0.2.2, contracts §6).
 *
 * @param ctx - The session and the persona the call acts as.
 * @param id - The exception to assign.
 * @param assigneeId - The persona becoming accountable.
 * @returns The exception's investigation payload as the session now holds it.
 * @throws Problem - A `'permission'` failure when the role may not work the exception; a `'not-found'`
 *   failure for an identifier this write does not reach; or a `'validation'` failure when no persona
 *   carries the assignee identifier.
 */
export async function assignException(
  ctx: HandlerContext,
  id: ExceptionId,
  assigneeId: UserId,
): Promise<ExceptionDetail> {
  requireWritable(ctx);

  const exception = visibleException(ctx, id);
  requireWork(ctx, exception);
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
 *
 * @param ctx - The session and the persona the call acts as.
 * @param id - The exception the note concerns.
 * @param note - The note, in the caller's own words.
 * @returns The exception's investigation payload as the session now holds it.
 * @throws Problem - A `'permission'` failure when the role may not work the exception; a `'not-found'`
 *   failure for an identifier this write does not reach; or a `'validation'` failure when the note is
 *   empty.
 */
export async function addExceptionNote(
  ctx: HandlerContext,
  id: ExceptionId,
  note: string,
): Promise<ExceptionDetail> {
  requireWritable(ctx);

  const exception = visibleException(ctx, id);
  requireWork(ctx, exception);

  const text = note.trim();

  if (text === '') {
    throw validationProblem(
      ctx,
      `A note against ${exception.id} has to say something; this one is empty, so there is nothing to record.`,
    );
  }

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
 * rather than trusting the control's own state, so a dismissed row always says why it was set aside. Only
 * an exception that still stands open is dismissed: a record that has already moved on is reported with
 * its current status, which is the conflicting-update state reported through `'validation'` because
 * `ProblemType` gives it no cause of its own (see the module header).
 *
 * @param ctx - The session and the persona the call acts as.
 * @param id - The exception to dismiss.
 * @param reason - Why the exception is being set aside.
 * @returns The exception's investigation payload as the session now holds it.
 * @throws Problem - A `'permission'` failure when the role may not work the exception; a `'not-found'`
 *   failure for an identifier this write does not reach; or a `'validation'` failure when the reason is
 *   empty or the exception is no longer open.
 */
export async function dismissException(
  ctx: HandlerContext,
  id: ExceptionId,
  reason: string,
): Promise<ExceptionDetail> {
  requireWritable(ctx);

  const exception = visibleException(ctx, id);
  requireWork(ctx, exception);

  const text = reason.trim();

  if (text === '') {
    throw validationProblem(
      ctx,
      `A dismissal of ${exception.id} has to state its reason; this one is empty, so the row would ` +
        'not say why it was set aside.',
    );
  }

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

