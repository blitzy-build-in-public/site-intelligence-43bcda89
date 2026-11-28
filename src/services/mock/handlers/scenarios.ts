/**
 * The scenarios family of the in-browser mock adapter: the option set the comparison screen reads, and
 * the sandbox that recomputes one option at the levers a caller supplies.
 *
 * Implements the "Handlers" row of AAP 0.12.1 at the `handlers/` path AAP 0.13.1 fixes, together with
 * that section's "Solver" row — `solveSupplyDelay` measures an option, and "the mock adapter adds the
 * identity fields (`id`, `exceptionId`, `name`, `origin`) to form a `Scenario`" — and the sandbox path
 * of AAP 0.12.3: "`POST /exceptions/{id}/scenarios/solve` … a constraint breach returns a scenario whose
 * `constraintCheck` fails with its messages, not a `Problem`". `platform-contracts.md` §4 fixes what a
 * measure is and the order its eleven rules apply in, §3 fixes `Scenario`, `ScenarioSet`, `Levers`,
 * `SideEffect` and `Rejected`, and §1 fixes the `SCN-nnnn-x` form an option's identifier takes. AAP 0.8
 * fixes the recommendation rule — "fewest units late, then lowest added cost" — and AAP 0.10 fixes why a
 * seeded option's column carries its own label.
 *
 * WHAT IT COMPUTES, AND WHAT IT NEVER COMPUTES. Every measure a returned `Scenario` carries is
 * `solveSupplyDelay`'s own output, passed through untouched: units late, maximum days late, orders on
 * time and total, added cost, line idle days, revenue delayed, the run-out, the daily closing-stock
 * series, the per-order results, the constraint check and its messages, the side effects, the
 * write-backs and the levers. This module adds a scenario's identity — identifier, exception, name and
 * origin — attaches the confidence the exception record carries, ranks the options, and computes one
 * difference of its own: `protectedRevenueOf`, the delayed revenue a position avoids, which is the set's
 * unmitigated delayed revenue less that position's own residual (AAP 0.8, rule P-6). It computes no
 * measure and no ranking figure of its own, rounds nothing (the solver rounds line idle days once, half
 * up to two decimals, per contracts §4 rule 5), and states no currency amount, no lever volume and no
 * record identifier as a typed value.
 *
 * WHAT THE OPTION SET HOLDS, AND WHERE IT COMES FROM. AAP 0.7's T-04 row fixes four rows for this
 * case and AAP 0.8 fixes what they are, and the positions those rows stand at are record content:
 * `src/seed/exception-scenarios.ts` publishes `SOLVER_OPTION_SETS`, one row per position carrying the
 * identifier its column takes, the words it is labelled with and the levers it is measured at. This
 * module reads them through the session's state, measures each at its own levers with one
 * `solveSupplyDelay` call and serves the set in the seed's order — the baseline first, because the
 * seed states it, then the positions that follow it, the recommended plan and the one the constraint
 * check rejects. An exception whose positions no record states keeps the derivation this module has
 * always made: the do-nothing baseline AAP 0.8 fixes by name, then each lever set the seeded trail's
 * `custom solve` events record (`src/seed/audit-events.ts`), in the trail's order. No row carries a
 * measure, so every figure a column shows is the solver's output for that column's own levers at call
 * time (rule P-6).
 *
 * WHY AN UNSEEDED OPTION'S IDENTIFIER COMES FROM THE SEEDED PLAN. Where the records state a set's
 * positions, each option keeps the identifier its row states and nothing is derived. Where they do
 * not, §1 fixes the form `SCN-nnnn-x` — the exception's number and the option's letter within that set
 * — and the letter is the one thing no derivation can recover, because the options the records do not
 * state occupy letters of their own. Spelling a letter here would mint the identifier of a record that
 * does not exist, so the letter is taken from the one identifier the records state, the seeded plan's:
 * that option keeps its own letter, the baseline takes the lowest letter the plan leaves unused, and
 * the sandbox takes the letter after the highest one the set uses. The set then names exactly what the
 * records name, and it grows correctly when a seed document adds the missing options.
 *
 * THE MONEY MEASURES AND THE TRADE-OFF SENTENCE COME FROM THE MEASUREMENT. Every euro figure is the
 * solver's: `addedCostEur` from the levers at the case's own per-set rates, `revenueDelayedEur` from
 * the units each order is left late at that order's price. The recommendation rule's second key
 * therefore separates two options that tie on units late, and where the keys still leave them equal
 * the first passing option stands — no third key is invented. The trade-off is narrative text carrying
 * numbers, and AAP 0.8 fixes how it is written: the seeded row of the recommended position carries the
 * sentence as a template with a brace per figure, and this module fills each brace from the
 * measurement it just took and from the delayed revenue that measurement avoids, which
 * `protectedRevenueOf` computes as the set's unmitigated delayed revenue less the option's own
 * residual. Every amount renders through the one prose formatter the assistant's answers already use —
 * `renderAmount` from `../assistant-script.ts` — so one convention serves both narrative surfaces and
 * no second formatter exists. A position that carries no template, and a measurement that carries no
 * side effect for a brace the template names, leave the sentence empty rather than printing a zero:
 * `tradeOffFor` states why.
 *
 * THE SEEDED SETS ARE RETURNED AS THEY STAND. For `EXC-2026-1185`, `EXC-2026-1187` and `EXC-2026-1195`
 * the option columns are seed records rather than solver output, so they are served unchanged, in a copy
 * the caller may not mutate, with `origin: 'seeded'` preserved: that member is what makes the component
 * and the CSV export label each column `Simulated data` from the fixed label set, so no label is typed
 * here (rule P-1, AAP 0.10). They are never re-solved — a shipped option re-measured here would be a
 * second answer to the same question.
 *
 * ONE OPTION BY REFERENCE, FOR THE EVIDENCE READ. `scenarioForReference` answers the option an evidence
 * reference names out of the same sets this module serves a screen: `handlers/evidence.ts` calls it
 * after the sets the dataset ships and before it reports that no record answers a reference. A column
 * measured from an exception's own case is a record the dataset does not hold, so without this answer
 * the drawer behind a comparison figure would open on a failure instead of on the record behind the
 * figure (AAP 0.12.4, F12). The lookup reads and refuses nothing: it evaluates no permission, writes
 * nothing, and answers `undefined` for a reference no set names, for the caller to refuse — while a
 * record defect that stops an option set being produced travels on as the typed failure it is.
 *
 * WHAT IT DOES NOT DO. It renders nothing, formats nothing, opens no address (rule B-1) and reads no
 * configuration or credential (rule B-2). It holds no record of its own: every value comes from the
 * session's `MockState` or from the solver (rule P-2). It evaluates no policy — a plan that may not be
 * approved is refused by the approvals family — and it decides no permission except the two its own
 * calls need, which the matrix in `src/domain/policy/permissions.ts` owns. It claims nothing about what
 * a plan establishes (rule P-4), and it names no company, product or person of its own (rule P-7).
 *
 * THE PERMISSION CHECKS HERE ARE A DEMONSTRATION CONTROL, NOT PRODUCTION AUTHORISATION (rule P-3). They
 * run in the browser of a build with no backend and no sign-in, and they exist so that a screen cannot
 * offer what the service would refuse. A deployment authorises each call in the service that holds the
 * data; the failure built below therefore names the permission it required and the roles that hold it,
 * which is what a forbidden card and a disabled control's explanation print (rule P-8).
 *
 * DETERMINISTIC (AAP 0.2.1, AAP 0.18.2). Two calls with the same state return deeply equal sets: the
 * solver is a pure function of its arguments, the seeded option set is read from the seed's own records
 * rather than from the session's growing chain (so a sandbox solve cannot become an option column), no
 * clock or random source is read, and no module-level mutable value exists. The only value a call
 * appends is the sandbox's `custom solve` audit event, which is a write and not a read's answer.
 *
 * Rules this module is built to satisfy:
 * - P-1: it types no label. `Simulated calculation`, `Simulated data` and `Simulated recommendation` are
 *   applied by the components and the export that render a column, from `src/types/primitives.ts`.
 * - P-2: records are reached through `ctx.state` and the sibling `../seed-loader.ts` type surface only,
 *   and the module imports no seed record, no React, no screen, no app module and no API client.
 * - P-3, P-8: verdicts come from `ctx.actor`; a permission refusal carries `requiredPermission` and
 *   `rolesWithPermission`, while a record the role's read does not reach is a `'not-found'` failure
 *   naming the exception and the scope, as the exception family reports it; a breached option carries
 *   the solver's own messages, which is what a screen shows as "Cannot compute" with the reason.
 * - P-4: no wording claims that a plan establishes anything, and the sandbox demonstrates a mechanism
 *   without asserting a property of a live system.
 * - P-6: no currency literal, no lever volume, no record identifier and no rounding of its own. The one
 *   difference it takes is `protectedRevenueOf`'s, reasoned from the measurements the records produce,
 *   and the expected results of `platform-seed-data.md` are fixtures this module neither holds nor
 *   reads.
 * - P-7: only the seed's synthetic records and the workspace's own words for its two levers.
 * - B-1, B-2: no request leaves for any host, and nothing here reads configuration or a credential.
 */

import { resolveScope } from '../../../domain/aggregation/scope';
import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import { solveSupplyDelay } from '../../../domain/solver/solve-supply-delay';
import { formatQuantity } from '../../../types';
import type {
  Approval,
  AuditAction,
  AuditEventDraft,
  AuditPayload,
  AuditResult,
  Confidence,
  ExceptionId,
  Levers,
  Money,
  OperationalException,
  Permission,
  Problem,
  Rejected,
  Scenario,
  ScenarioId,
  ScenarioOrigin,
  ScenarioSet,
  Scope,
  SolverCase,
  SolverResult,
} from '../../../types';
import { renderAmount } from '../assistant-script';
import type { HandlerContext, MockState } from '../mock-state';
import type { ExceptionScenarioSeed, SeededSolverOption } from '../seed-loader';
import { demonstrationForbiddenReason, isSimulationOn } from '../simulation';
import { appendAuditEvent } from './audit';

/* ---------------------------------------------------------------------------------------------
 * The fixed values this family addresses — contracts §1, contracts §7.1, AAP 0.8
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission a scenario-set read requires: the comparison screen is a second surface over the
 * exception records, so who may read an exception may read the options measured for it (contracts
 * §7.1).
 */
const EXCEPTION_READ: Permission = 'exception.read';

/**
 * The permission the sandbox requires: measuring an option is the `POST
 * /exceptions/{id}/scenarios/solve` write of contracts §9, which the matrix gates on `scenario.create`
 * (AAP 0.12.3).
 */
const SCENARIO_CREATE: Permission = 'scenario.create';

/**
 * The baseline option's levers: neither pulled.
 *
 * AAP 0.8 fixes this measurement by name — `solveSupplyDelay(CASE-1184, { airSets: 0, transferSets: 0 })`
 * is the do-nothing baseline the assistant's first answer and an exception's affected lines are read
 * from — and the solver's own floor is zero (`LeverConstraint` carries a maximum and a step, and a
 * negative value breaches it). Both members are solver inputs rather than business figures, and the
 * solver echoes them on the result it returns, so this constant states a lever position and no volume.
 */
const BASELINE_LEVERS: Levers = { airSets: 0, transferSets: 0 };

/**
 * The words the solver itself prints for the two levers, reused so an option's derived name reads in the
 * vocabulary the constraint messages already use. Nothing here is a new claim: `solve-supply-delay.ts`
 * names the same two labels when it reports a breach, and a comparison column that described a lever
 * differently from the message that blocked it would be two names for one thing.
 */
const AIR_LEVER_LABEL = 'Air freight sets';
const TRANSFER_LEVER_LABEL = 'Transfer sets';

/** The separator a column name puts between the two lever readings. */
const NAME_SEPARATOR = ' · ';


/**
 * The letters an option's identifier may take within its own set, in the order §1 implies: the suffix of
 * `SCN-nnnn-x` is the option's letter, so a set of four options runs from the first letter to the fourth.
 *
 * Structural rather than a record value: it is the alphabet the identifier form is written in, exactly
 * as the chain module holds the shape of `AUD-nnnnnn`. Which letter a given option takes is settled by
 * the seeded plan's own identifier, never by a literal in this module.
 */
const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The separator §1 puts between an identifier's number and its letter. */
const IDENTIFIER_SEPARATOR = '-';

/**
 * The action the sandbox's write records, spelled as the seeded trail spells it: the one `custom solve`
 * event of `src/seed/audit-events.ts` is the record that fixes this spelling, and AAP 0.6.2 lists the
 * custom solve among the writes the demonstration audits.
 */
const CUSTOM_SOLVE_ACTION: AuditAction = 'custom solve';

/** The outcome a solve records when the option it measured stayed inside its bounds. */
const SOLVE_SUCCEEDED: AuditResult = 'succeeded';

/** The outcome a solve records when the option it measured breached a bound and cannot be carried out. */
const SOLVE_FAILED: AuditResult = 'failed';

/** The origin marking an option `solveSupplyDelay` measured from the exception's own case. */
const SOLVER_ORIGIN: ScenarioOrigin = 'solver';

/** The origin marking the duplicate the sandbox recomputed at edited levers (AAP 0.12.4). */
const SANDBOX_ORIGIN: ScenarioOrigin = 'sandbox';

/**
 * The trade-off sentence a set carries when the recommended option states none.
 *
 * `ScenarioSet.tradeOff` is required, and this module may not author a sentence: the seed holds one for
 * each of its own option sets, in the records that ship those options, and holds a template for the one
 * measured position AAP 0.8 quotes a trade-off for. A computed set whose recommended option carries no
 * template — or whose template names a figure the measurement does not carry — therefore states no
 * sentence rather than one this module wrote, and the comparison screen renders the recommendation rule,
 * which the seed does state, with no claim behind it that no record carries.
 */
const NO_TRADE_OFF = '';

/**
 * The braces a sentence template writes a placeholder in.
 *
 * Structural rather than content: they are the form the seed's templates are written in, which is why
 * the fill is a plain text substitution and no template syntax of this module's own exists.
 */
const PLACEHOLDER_OPEN = '{';
const PLACEHOLDER_CLOSE = '}';

/* ---------------------------------------------------------------------------------------------
 * Failures — platform-contracts.md §2, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The failure a role that may not perform an action receives, and the one the forbidden trigger produces.
 *
 * The members are the ones a `'permission'` cause carries: the cause, a sentence in plain words that
 * names the permission and the roles holding it, the call's correlation identifier, the permission
 * itself, and those roles — which is what a forbidden card prints and what a disabled control's
 * explanation names instead of only refusing (rule P-8).
 *
 * @param ctx - The call's context, whose correlation identifier the failure carries.
 * @param permission - The permission the call required.
 * @param reason - The reason in plain words, naming what the call would have done.
 * @returns The `Problem` to throw, built per call so the role list is the matrix's current answer.
 */
function permissionProblem(ctx: HandlerContext, permission: Permission, reason: string): Problem {
  const roles = rolesWith(permission);

  return {
    type: 'permission',
    message: `${reason} That needs the ${permission} permission, which the roles ${roles.join(', ')} hold.`,
    traceId: ctx.traceId,
    requiredPermission: permission,
    rolesWithPermission: roles,
  };
}

/**
 * The failure a reference the records cannot resolve produces, naming what is missing.
 *
 * A read that names an exception, a case or an option the loaded records do not hold cannot answer, and
 * the reason names the reference rather than reporting an empty result: a screen shows "Cannot compute"
 * with the reason and recommends nothing (AAP 0.8), and a reader is owed the identifier that failed.
 *
 * @param ctx - The call's context, whose correlation identifier the failure carries.
 * @param reason - The reason in plain words, naming the reference that does not resolve.
 * @returns The `Problem` to throw.
 */
function notFoundProblem(ctx: HandlerContext, reason: string): Problem {
  return { type: 'not-found', message: reason, traceId: ctx.traceId };
}

/**
 * The failure a record set that contradicts itself produces.
 *
 * Used where the records this module reads disagree with each other or state nothing it may quote — a
 * seeded plan whose identifier cannot be read as an option identifier, or seeded option sets that
 * disagree about the recommendation rule. The module reports such a state instead of choosing between
 * two records, because a choice made here would be a figure the records do not state (rule P-6).
 *
 * @param ctx - The call's context, whose correlation identifier the failure carries.
 * @param reason - The reason in plain words, naming the records that disagree.
 * @returns The `Problem` to throw.
 */
function validationProblem(ctx: HandlerContext, reason: string): Problem {
  return { type: 'validation', message: reason, traceId: ctx.traceId };
}

/* ---------------------------------------------------------------------------------------------
 * Refusals — contracts §7.1, rules P-3 and P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * Refuses the call while the demonstration's forbidden trigger is in effect.
 *
 * The trigger stands for a session-wide refusal rather than for a fact about the acting role, so it is
 * checked before the matrix and produces the same failure shape: a screen renders one forbidden card
 * whether the refusal came from the role switcher's persona or from the simulation popover (AAP 0.12.4,
 * T-17). Its sentence is `demonstrationForbiddenReason`'s, because the role refused here may hold the
 * permission the call requires (rules P-3, P-4).
 *
 * @param ctx - The call's context: the state its triggers are read from.
 * @param permission - The permission the refused call required, carried into the failure.
 * @throws Problem - A `'permission'` failure naming the permission and its holders.
 */
function assertNotForbidden(ctx: HandlerContext, permission: Permission): void {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    throw permissionProblem(
      ctx,
      permission,
      demonstrationForbiddenReason(ctx.actor.role, permission),
    );
  }
}

/**
 * Says whether an exception is one the acting role's read reaches.
 *
 * `handlers/exceptions.ts` owns this rule and applies it to every exception read and every write on
 * one; it is restated here because AAP 0.12.1 fixes this folder at one module per read/write family
 * with no shared helper beside them, and because the comparison read has to place a record by the same
 * reach the investigation screen opened it with — a comparison that withheld an exception its own
 * investigation serves would answer one question two ways. The plant the exception lands on admits it,
 * and so does any plant it also affects; nothing here widens the rule past those two members, and an
 * empty scope admits nothing rather than everything.
 *
 * @param exception - The exception to place.
 * @param scope - The acting role's resolved scope.
 * @returns `true` when the exception, or a plant it also affects, is inside the scope.
 */
function landsInScope(exception: OperationalException, scope: Scope): boolean {
  if (scope.plants.includes(exception.plantId)) {
    return true;
  }

  return exception.alsoAffectsPlantIds.some((plantId) => scope.plants.includes(plantId));
}

/**
 * Refuses the call unless the acting persona holds the permission and reaches this exception.
 *
 * Two checks, in the order the exceptions family applies them, because a permission a role does not
 * hold and a record the role's read does not cover are two different answers that a screen shows
 * differently (AAP 0.12.4, rule P-8):
 *
 * 1. The matrix hold. Whether the role holds the permission at all is asked with no subject, so the
 *    plant scoping of contracts §7.1 is left to the reach below. A role without the permission is
 *    refused with the `'permission'` failure a forbidden card renders, naming the permission and the
 *    roles that do hold it.
 * 2. The reach. Whether the exception is one this role's read covers is `landsInScope`'s answer, the
 *    rule `handlers/exceptions.ts` owns. A record outside it is refused as `'not-found'`, because the
 *    role holds the permission and the read simply does not cover that record.
 *
 * Asking the matrix about the exception itself would collapse the two: the matrix reads only the plant
 * a record is laid on, while an exception also reaches every plant it affects, so a planner whose
 * plant the disruption reaches would be refused an option set the investigation screen serves her.
 *
 * @param ctx - The call's context: the persona both checks are made for.
 * @param permission - The permission the call requires.
 * @param exception - The exception the call is about, read for the reach.
 * @param reason - The reason in plain words for a role that lacks the permission.
 * @throws Problem - A `'permission'` failure naming the permission and its holders, or a `'not-found'`
 *   failure naming the exception and the acting role's plant scope.
 */
function assertPermitted(
  ctx: HandlerContext,
  permission: Permission,
  exception: OperationalException,
  reason: string,
): void {
  if (!hasPermission(ctx.actor.role, permission, null, ctx.actor)) {
    throw permissionProblem(ctx, permission, reason);
  }

  const scope = resolveScope({}, ctx.actor.role);

  if (landsInScope(exception, scope)) {
    return;
  }

  throw notFoundProblem(
    ctx,
    `Exception ${exception.id} is outside the acting role's plant scope (${scope.plants.join(', ')}), ` +
      'so it is not part of this read.',
  );
}

/* ---------------------------------------------------------------------------------------------
 * Reading the records this family needs — rule P-2, AAP 0.8
 * ------------------------------------------------------------------------------------------- */

/**
 * The exception a call names, or the failure naming the reference that did not resolve.
 *
 * @param ctx - The call's context, whose records are searched.
 * @param exceptionId - The identifier the caller asked for.
 * @returns The exception record.
 * @throws Problem - A `'not-found'` failure when no record answers the identifier.
 */
function exceptionOrThrow(ctx: HandlerContext, exceptionId: ExceptionId): OperationalException {
  const exception = ctx.state.records.exceptions.find((record) => record.id === exceptionId);

  if (exception === undefined) {
    throw notFoundProblem(ctx, `No exception record answers ${exceptionId}, so no option of it can be read.`);
  }

  return exception;
}

/**
 * The option set the dataset ships for an exception, where it ships one.
 *
 * `src/seed/exception-scenarios.ts` holds a set for each exception whose options are content rather than
 * solver output, and deliberately holds none for the case that is measured at call time. Finding one is
 * therefore the first branch of a read, and its absence is what sends the read to the solver.
 *
 * @param state - The session whose records are searched. The state is not modified.
 * @param exceptionId - The exception the set would answer.
 * @returns The seeded set, or `undefined` when the dataset ships none for that exception.
 */
function seededSetFor(state: MockState, exceptionId: ExceptionId): ScenarioSet | undefined {
  const seeded: ExceptionScenarioSeed | undefined = state.records.exceptionScenarios.find(
    (record) => record.exceptionId === exceptionId,
  );

  return seeded === undefined ? undefined : seeded.scenarioSet;
}

/**
 * The solver case an exception is measured against, or the failure naming what is missing.
 *
 * A scenario is only ever produced from a case (AAP 0.12.2), so an exception that names none, and an
 * exception that names one the loaded records do not hold, both leave the caller with a reference that
 * does not resolve. The reason names the identifier, which is what a reader needs to repair the record
 * set rather than the screen.
 *
 * @param ctx - The call's context, whose records are searched.
 * @param exception - The exception whose case is wanted.
 * @returns The solver case record.
 * @throws Problem - A `'not-found'` failure naming the missing case.
 */
function solverCaseFor(ctx: HandlerContext, exception: OperationalException): SolverCase {
  const caseId = exception.solverCaseId;

  if (caseId === undefined) {
    throw notFoundProblem(
      ctx,
      `${exception.id} carries no solver case, so there is no case to measure an option against.`,
    );
  }

  const caseRecord = ctx.state.records.solverCases.find((record) => record.id === caseId);

  if (caseRecord === undefined) {
    throw notFoundProblem(
      ctx,
      `${exception.id} names the solver case ${caseId}, which the loaded records do not hold.`,
    );
  }

  return caseRecord;
}

/**
 * One lever reading out of an audit payload, or `undefined` when the payload does not carry a number.
 *
 * An audit payload is arbitrary JSON (`AuditPayload`), so a value is read only after it proves to be a
 * finite number: a payload that carries text, a `null` or no member at all states no lever position, and
 * the option it might have described is left out rather than defaulted to a volume this module chose.
 *
 * @param payload - The event's `after` half, or `null` when the action created nothing readable.
 * @param member - Which of the two lever members to read.
 * @returns The lever position, or `undefined` when the payload states none.
 */
function leverReading(
  payload: AuditPayload | null,
  member: keyof Levers,
): number | undefined {
  if (payload === null) {
    return undefined;
  }

  const value = payload[member];

  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * The lever sets the seeded records state for an exception, in the trail's own order.
 *
 * The trail's `custom solve` events are the only records that state a lever position for the case that
 * is measured at call time, so each of them that carries two finite numbers becomes a candidate option
 * and one that carries anything else is skipped rather than defaulted (rule P-6). Two events stating
 * the same position describe one option, so a repeat collapses onto the first.
 *
 * The session's own chain is deliberately not the source: the seed's drafts are read from
 * `records.auditEvents`, so a sandbox solve this session appended cannot turn into a comparison column
 * and two reads of the same state return the same set.
 *
 * @param state - The session whose seeded records are read. The state is not modified.
 * @param exceptionId - The exception the recorded positions belong to.
 * @returns The distinct recorded lever positions, in the order the trail records them.
 */
function recordedLeverSets(state: MockState, exceptionId: ExceptionId): Levers[] {
  const sets: Levers[] = [];
  const drafts: readonly AuditEventDraft[] = state.records.auditEvents;

  for (const draft of drafts) {
    if (draft.action !== CUSTOM_SOLVE_ACTION || draft.objectRef !== exceptionId) {
      continue;
    }

    const airSets = leverReading(draft.after, 'airSets');
    const transferSets = leverReading(draft.after, 'transferSets');

    if (airSets === undefined || transferSets === undefined) {
      continue;
    }

    const alreadyRecorded = sets.some(
      (set) => set.airSets === airSets && set.transferSets === transferSets,
    );

    if (!alreadyRecorded) {
      sets.push({ airSets, transferSets });
    }
  }

  return sets;
}

/* ---------------------------------------------------------------------------------------------
 * Option identities — contracts §1's `SCN-nnnn-x`, read from the seeded plan
 * ------------------------------------------------------------------------------------------- */

/** One option identifier split into the part its set shares and the letter it occupies. */
interface IdentifierAnchor {
  /** Everything before the option's letter: the set every option of the exception shares. */
  readonly stem: string;

  /** The letter the option occupies within its set. */
  readonly letter: string;
}

/**
 * Splits an option identifier into the stem its set shares and the letter the option occupies.
 *
 * Read as §1 writes the form: the last separator divides the set from the option's single letter. A
 * text that does not read that way states no identifier this module can extend, and its caller reports
 * the record it came from rather than guessing.
 *
 * @param identifier - The identifier to split, as a record states it.
 * @returns The stem and the letter, or `undefined` when the text is not an option identifier.
 */
function splitOptionIdentifier(identifier: ScenarioId): IdentifierAnchor | undefined {
  const separator = identifier.lastIndexOf(IDENTIFIER_SEPARATOR);

  if (separator <= 0) {
    return undefined;
  }

  const letter = identifier.slice(separator + 1);

  if (letter.length !== 1 || !OPTION_LETTERS.includes(letter)) {
    return undefined;
  }

  return { stem: identifier.slice(0, separator), letter };
}

/**
 * Joins a set's stem and an option's letter into an identifier.
 *
 * @param stem - The part the set's options share, as a record states it.
 * @param letter - The letter the option occupies within the set.
 * @returns The option's identifier.
 */
function identifierFor(stem: string, letter: string): ScenarioId {
  return `${stem}${IDENTIFIER_SEPARATOR}${letter}`;
}

/**
 * Takes the lowest letter the set has not used yet, and marks it used.
 *
 * The set's letters are allocated in the alphabet's own order, so a set grows from the lowest free
 * letter upwards and two calls on the same records allocate the same letters (AAP 0.18.2).
 *
 * @param used - The letters the set has already allocated. It is extended in place.
 * @returns The letter taken, or `undefined` when every letter is taken.
 */
function takeLowestFreeLetter(used: Set<string>): string | undefined {
  for (const letter of OPTION_LETTERS) {
    if (!used.has(letter)) {
      used.add(letter);
      return letter;
    }
  }

  return undefined;
}

/**
 * The letter that follows the highest one a set uses, which the sandbox occupies.
 *
 * A sandbox option is a transient duplicate rather than a shipped one, so it takes the position after
 * the set's last option instead of borrowing a letter an option already holds. Reading the highest
 * letter from the set means the sandbox follows the set as the records grow: a set that gains an option
 * moves the sandbox on with it.
 *
 * @param used - The letters the set uses.
 * @returns The next letter, or `undefined` when the set already reaches the end of the alphabet.
 */
function letterAfterHighest(used: ReadonlySet<string>): string | undefined {
  let highest = -1;

  for (const letter of used) {
    const position = OPTION_LETTERS.indexOf(letter);

    if (position > highest) {
      highest = position;
    }
  }

  return OPTION_LETTERS[highest + 1];
}

/**
 * The identifier the seeded plan under an exception states, split into its stem and its letter.
 *
 * The plan is the one record that names an option of that exception, so its identifier is the anchor the
 * whole set is built from: the option it names keeps its own letter, and every other option takes a
 * letter the plan leaves free. A read that finds no such plan reports the gap instead of minting an
 * identifier no record holds (rule P-6).
 *
 * @param ctx - The call's context, whose records are searched.
 * @param exceptionId - The exception whose options are being identified.
 * @returns The stem and letter the seeded plan states.
 * @throws Problem - A `'validation'` failure when no seeded plan names an option of this exception, or
 *   when the identifier it names cannot be read as an option identifier.
 */
function optionIdentifierAnchor(ctx: HandlerContext, exceptionId: ExceptionId): IdentifierAnchor {
  const plan: Approval | undefined = ctx.state.records.approvals.find(
    (record) => record.exceptionId === exceptionId,
  );

  if (plan === undefined) {
    throw validationProblem(
      ctx,
      `No seeded plan names an option of ${exceptionId}, so the records state no option identifier for it ` +
        'and this demonstration will not mint one.',
    );
  }

  const anchor = splitOptionIdentifier(plan.scenarioId);

  if (anchor === undefined) {
    throw validationProblem(
      ctx,
      `The seeded plan for ${exceptionId} names the option ${plan.scenarioId}, which does not read as the ` +
        'SCN-nnnn-x form an option identifier takes.',
    );
  }

  return anchor;
}

/* ---------------------------------------------------------------------------------------------
 * Composing options — AAP 0.12.1's identity fields, contracts §3's `Scenario`
 * ------------------------------------------------------------------------------------------- */

/** One candidate option: the identity its column takes, the position it is measured at and its record content. */
interface CandidateOption {
  /** The identifier the option takes within its set. */
  readonly id: ScenarioId;

  /** The lever position the option is measured at. */
  readonly levers: Levers;

  /** The words the column is labelled with, as a seeded row states them, or `undefined` when it states none. */
  readonly name: string | undefined;

  /** The trade-off template the seeded row carries, or `undefined` when it carries none. */
  readonly tradeOffTemplate: string | undefined;
}

/**
 * The option positions the seed states for an exception, in the order the comparison matrix shows them.
 *
 * `src/seed/exception-scenarios.ts` publishes one row per position for each exception measured from its
 * solver case, and the rows reach this module through the session's state like every other record
 * (rule P-2). An exception no record states a position for answers `undefined`, which is what sends the
 * read to the derivation below.
 *
 * @param state - The session whose loaded records are read. The state is not modified.
 * @param exceptionId - The exception whose positions are wanted.
 * @returns The seeded positions in the seed's order, or `undefined` when the seed states none for it.
 */
function seededOptionsFor(
  state: MockState,
  exceptionId: ExceptionId,
): readonly SeededSolverOption[] | undefined {
  const positions = state.records.solverOptions.filter((option) => option.exceptionId === exceptionId);

  return positions.length === 0 ? undefined : positions;
}

/**
 * The options the records state for an exception, in the order the comparison matrix shows them.
 *
 * Where the seed states the positions, its rows are served verbatim and in the seed's own order: each
 * keeps the identifier and the name its record states, and the rows already hold the baseline AAP 0.8
 * fixes by name, so no baseline is derived here — adding one would put a second do-nothing column in
 * the matrix.
 *
 * Where the seed states no position, the derivation stands: the same baseline, which stands first so a
 * reader sees what the recommendation is measured against, and then each lever position the seeded
 * trail records, in the trail's order. Those options carry no seeded name and no trade-off template,
 * and the option the seeded plan names keeps the identifier the plan states, which is why the recorded
 * options are allocated their letters before the baseline takes the lowest one the plan leaves free.
 *
 * @param ctx - The call's context, whose records are read.
 * @param exceptionId - The exception whose options are wanted.
 * @returns The candidate options, in the order the matrix shows them.
 * @throws Problem - A `'validation'` failure from the identifier anchor, or when the set has no letter
 *   left for an option.
 */
function candidateOptions(ctx: HandlerContext, exceptionId: ExceptionId): CandidateOption[] {
  const seeded = seededOptionsFor(ctx.state, exceptionId);

  if (seeded !== undefined) {
    return seeded.map((option) => ({
      id: option.id,
      levers: { ...option.levers },
      name: option.name,
      tradeOffTemplate: option.tradeOffTemplate,
    }));
  }

  const anchor = optionIdentifierAnchor(ctx, exceptionId);
  const recorded = recordedLeverSets(ctx.state, exceptionId);
  // The plan's letter is taken from the start, so no other option can occupy the identifier the seeded
  // record already names — even where the trail records no position for it.
  const used = new Set<string>([anchor.letter]);
  const recordedOptions: CandidateOption[] = [];

  for (const [index, levers] of recorded.entries()) {
    const letter = index === 0 ? anchor.letter : takeLowestFreeLetter(used);

    if (letter === undefined) {
      throw validationProblem(
        ctx,
        `The options of ${exceptionId} occupy every letter of the SCN-nnnn-x form, so the recorded option ` +
          'at the next position cannot be identified.',
      );
    }

    used.add(letter);
    recordedOptions.push({
      id: identifierFor(anchor.stem, letter),
      levers,
      name: undefined,
      tradeOffTemplate: undefined,
    });
  }

  const baselineLetter = takeLowestFreeLetter(used);

  if (baselineLetter === undefined) {
    throw validationProblem(
      ctx,
      `The options of ${exceptionId} occupy every letter of the SCN-nnnn-x form, so the baseline cannot be ` +
        'identified.',
    );
  }

  return [
    {
      id: identifierFor(anchor.stem, baselineLetter),
      levers: BASELINE_LEVERS,
      name: undefined,
      tradeOffTemplate: undefined,
    },
    ...recordedOptions,
  ];
}


/**
 * The name a comparison column shows for an option whose record states none.
 *
 * Derived from the option's own lever position, in the two labels the solver prints for the levers, so a
 * column names exactly what was measured and no record has to name it. A seeded row does state a name,
 * and a column of a seeded position takes the record's own words instead: this is the fallback for a
 * position no record names, because a name written into a record this module does not hold would be
 * this module's own words about it (rule P-6).
 *
 * Each lever value is stated in the grouped, unitless shape `formatQuantity` gives every number the
 * interface prints — the rule `src/types/figure-text.ts` owns, so the column and the sandbox's own echo
 * read one position the same way — which keeps a position far outside its bound a decimal number rather
 * than the exponent form a raw interpolation gives it (AAP §0.12.3 keeps that position a measured
 * option rather than a refusal).
 *
 * @param levers - The lever position the option was measured at.
 * @returns The column name.
 */
function optionName(levers: Levers): string {
  return (
    `${AIR_LEVER_LABEL} ${formatQuantity(levers.airSets)}${NAME_SEPARATOR}` +
    `${TRANSFER_LEVER_LABEL} ${formatQuantity(levers.transferSets)}`
  );
}

/** The identity members AAP 0.12.1 adds to a solver result to form a `Scenario`. */
interface ScenarioIdentity {
  /** The option's identifier within its set. */
  readonly id: ScenarioId;

  /** The exception the option answers. */
  readonly exceptionId: ExceptionId;

  /** The name the comparison matrix labels the option's column with. */
  readonly name: string;

  /** How the option came to exist, which decides how the interface labels it. */
  readonly origin: ScenarioOrigin;
}

/**
 * Wraps one solver result into a `Scenario`, adding identity and carrying the record's own confidence.
 *
 * Every measure is the result's, untouched (rule P-6). The confidence is the one exception: the solver
 * reports a placeholder level with the reason that it is the placeholder, because `SolverCase` carries no
 * confidence (`src/domain/solver/solve-supply-delay.ts` records the gap and hands the member to the
 * adapter), while the exception record states the confidence its figures carry with the reason for it —
 * which is the pair SCR-04 shows beside a scenario.
 *
 * @param result - The measurement `solveSupplyDelay` returned.
 * @param identity - The identity members this family adds.
 * @param confidence - The confidence the exception record carries.
 * @returns The scenario, ready for the comparison matrix.
 */
function composeScenario(
  result: SolverResult,
  identity: ScenarioIdentity,
  confidence: Confidence,
): Scenario {
  return { ...result, ...identity, confidence };
}

/* ---------------------------------------------------------------------------------------------
 * The recommendation — AAP 0.8, contracts §4
 * ------------------------------------------------------------------------------------------- */

/**
 * The recommendation rule's wording, quoted from the option sets the seed ships.
 *
 * The rule is contracts §4's, and the seed states it in the record of every set it ships rather than in a
 * constant this module could hold: a computed set has to state the rule it applied, and the records that
 * fix that wording are the seeded sets. All of them state one sentence, so the module quotes it and
 * refuses the read when they disagree or when the seed states none — a wording chosen here would be a
 * statement of this module's own, which is what rule P-6 and AAP 0.8 keep out of the adapter.
 *
 * @param ctx - The call's context, whose seeded option sets are read.
 * @returns The rule's wording, as the seed states it.
 * @throws Problem - A `'validation'` failure when the seeded sets state no rule or disagree about it.
 */
function recommendationRuleOf(ctx: HandlerContext): string {
  const rules = new Set(
    ctx.state.records.exceptionScenarios.map((seeded) => seeded.scenarioSet.recommendationRule),
  );
  const [rule] = rules;

  if (rule === undefined) {
    throw validationProblem(
      ctx,
      'The seeded option sets state no recommendation rule, so a computed set cannot state the rule it applied.',
    );
  }

  if (rules.size > 1) {
    throw validationProblem(
      ctx,
      'The seeded option sets disagree about the recommendation rule, so a computed set cannot state which of them it applied.',
    );
  }

  return rule;
}

/**
 * The option the recommendation rule picks, or `undefined` when no option may be recommended.
 *
 * The rule contracts §4 and AAP 0.8 fix: among the options whose constraint check passes, fewest units
 * late first, then the lowest added cost. Only `solveSupplyDelay`'s own measures are compared, so the
 * ranking orders the solver's figures and computes none of its own, and an option that breached a bound
 * is never a candidate — it is listed as rejected with the constraint that blocked it instead. Where the
 * two keys leave options equal, the one the set lists first stands: the rule as the inputs allow it to be
 * applied has no third key, and a tie-break written here would be a ranking rule the contracts do not fix.
 *
 * @param scenarios - The options, in the order the set lists them.
 * @returns The recommended option's identifier, or `undefined` when no option passes its check.
 */
function rankRecommendation(scenarios: readonly Scenario[]): ScenarioId | undefined {
  let recommended: Scenario | undefined;

  for (const scenario of scenarios) {
    if (scenario.constraintCheck !== 'pass') {
      continue;
    }

    if (recommended === undefined) {
      recommended = scenario;
      continue;
    }

    const fewerUnitsLate = scenario.unitsLate < recommended.unitsLate;
    const sameUnitsLate = scenario.unitsLate === recommended.unitsLate;
    const cheaper = scenario.addedCostEur < recommended.addedCostEur;

    if (fewerUnitsLate || (sameUnitsLate && cheaper)) {
      recommended = scenario;
    }
  }

  return recommended === undefined ? undefined : recommended.id;
}

/**
 * The options the recommendation leaves out, each with the constraint that blocked it.
 *
 * An option whose constraint check failed stays in the set, where its column shows the reason a number is
 * missing, and is listed here as well so the comparison screen can say what was considered and why it was
 * not proposed. The blocking constraint is the solver's own message, joined when a position breached more
 * than one bound; a failed check that carried no message names no constraint, so it is left out rather
 * than given a sentence of this module's own.
 *
 * @param scenarios - The options, in the order the set lists them.
 * @returns The rejected options, in that same order.
 */
function rejectedOf(scenarios: readonly Scenario[]): Rejected[] {
  const rejected: Rejected[] = [];

  for (const scenario of scenarios) {
    if (scenario.constraintCheck !== 'fail' || scenario.constraintMessages.length === 0) {
      continue;
    }

    rejected.push({
      scenarioId: scenario.id,
      blockingConstraint: scenario.constraintMessages.join(' '),
    });
  }

  return rejected;
}

/* ---------------------------------------------------------------------------------------------
 * The protected revenue and the trade-off sentence — AAP 0.8, rule P-6
 * ------------------------------------------------------------------------------------------- */

/**
 * Writes a value into every brace a sentence template carries for it.
 *
 * The template is record content, written as AAP 0.8 writes the sentence, with one brace per figure, so
 * the fill is a plain substitution of text the caller has already rendered. A brace the caller supplies
 * no value for stays in the sentence, which is what tells the caller the sentence cannot be stated.
 *
 * @param template - The sentence, with one brace per figure.
 * @param values - One rendered value per brace, keyed by the name the brace carries.
 * @returns The filled sentence, or `undefined` when a brace is left without a value.
 */
function fillTemplate(template: string, values: Readonly<Record<string, string>>): string | undefined {
  let filled = template;

  for (const [member, value] of Object.entries(values)) {
    filled = filled.split(`${PLACEHOLDER_OPEN}${member}${PLACEHOLDER_CLOSE}`).join(value);
  }

  return filled.includes(PLACEHOLDER_OPEN) ? undefined : filled;
}

/**
 * The delayed revenue one option protects: what the set's unmitigated position leaves, less the delay
 * this option still leaves.
 *
 * AAP 0.8 states an approval's protected revenue as the delayed revenue a plan avoids, and the records
 * measure both ends of that difference. An option's `revenueDelayedEur` is the units it leaves late
 * priced at their own orders' prices, so pulling a lever can only lower it: the set's greatest
 * `revenueDelayedEur` is the position no lever improves on — the path the disruption takes with nothing
 * done, which a set measured from a case holds as the baseline `candidateOptions` lists first at both
 * levers unpulled, and a seeded set holds as the option that leaves the whole delay in place — and this
 * option's own figure is what it still leaves late. Subtracting the second from the first is the delay
 * the option buys back, and the position that repeats the unmitigated path protects nothing, which is
 * what a plan that changes nothing is worth.
 *
 * The greatest figure is read from the set the option came from rather than from a member a record
 * types, so the trade-off sentence's last figure and an approval's `protectedRevenueEur` are one
 * arithmetic over one set of measurements (rule P-6). The difference is floored at none of it, so a set
 * that measured nothing worse than this option reports no protection rather than a negative figure.
 *
 * @param scenario - The option whose protected revenue is wanted.
 * @param scenarios - The options of the set that option stands in.
 * @returns The delayed revenue the option avoids, in euro.
 */
export function protectedRevenueOf(scenario: Scenario, scenarios: readonly Scenario[]): Money {
  let unmitigatedEur: Money = 0;

  for (const option of scenarios) {
    if (option.revenueDelayedEur > unmitigatedEur) {
      unmitigatedEur = option.revenueDelayedEur;
    }
  }

  const avoidedEur = unmitigatedEur - scenario.revenueDelayedEur;

  return avoidedEur > 0 ? avoidedEur : 0;
}

/**
 * The trade-off the recommended option makes, with its own measured figures written into the sentence
 * the record states for it.
 *
 * AAP 0.8 fixes both the sentence and where its numbers come from: the sentence is the one the records
 * supply, and the figures in it are computed, so this function fills a template it was handed and authors
 * nothing. The spent figure and the deferral are the recommended option's own measurement —
 * `addedCostEur`, and the first side effect's `kitsDelayed`, `valueDeferredEur` and `daysDeferred` — while
 * the protected revenue is the difference `protectedRevenueOf` computes from that same set. Every amount
 * renders through the one prose formatter the assistant's answers use, so a figure reads the same in
 * both sentences.
 *
 * An option that carries no template states no trade-off, and so does an option the set holds no
 * measurement for. A measurement that carries no side effect leaves the deferral's braces without a
 * value: the sentence is then returned empty rather than filled with a zero, because "defers 0 kits"
 * would state a fact the measurement never produced. The same holds for any brace the template names
 * and this function has no value for.
 *
 * @param option - The candidate option the recommendation picked, or `undefined` when it picked none.
 * @param scenarios - The measurements of the set that option stands in, which the protected figure is
 *   read from.
 * @returns The filled trade-off sentence, or the empty trade-off when no sentence can be stated.
 */
function tradeOffFor(option: CandidateOption | undefined, scenarios: readonly Scenario[]): string {
  const template = option === undefined ? undefined : option.tradeOffTemplate;
  const scenario =
    option === undefined ? undefined : scenarios.find((candidate) => candidate.id === option.id);

  if (template === undefined || scenario === undefined) {
    return NO_TRADE_OFF;
  }

  const [effect] = scenario.sideEffects;

  if (effect === undefined) {
    return NO_TRADE_OFF;
  }

  return (
    fillTemplate(template, {
      addedCostEur: renderAmount(scenario.addedCostEur),
      kitsDeferred: renderAmount(effect.kitsDelayed),
      valueDeferredEur: renderAmount(effect.valueDeferredEur),
      daysDeferred: renderAmount(effect.daysDeferred),
      protectedRevenueEur: renderAmount(protectedRevenueOf(scenario, scenarios)),
    }) ?? NO_TRADE_OFF
  );
}

/* ---------------------------------------------------------------------------------------------
 * Copies — the caller must not be able to edit the session through a read
 * ------------------------------------------------------------------------------------------- */

/**
 * A copy of one scenario, deep enough that a caller edits nothing the session holds.
 *
 * The seeded options are records inside the session's state, and a screen that sorted one's series or
 * pushed onto its messages would be editing the seeded record itself. Every collection and every nested
 * record is therefore rebuilt here, and no value is changed on the way: the copy states the same figures
 * the record states.
 *
 * @param scenario - The scenario to copy.
 * @returns An independent scenario with the same values.
 */
function copyScenario(scenario: Scenario): Scenario {
  return {
    id: scenario.id,
    exceptionId: scenario.exceptionId,
    name: scenario.name,
    origin: scenario.origin,
    unitsLate: scenario.unitsLate,
    maxDaysLate: scenario.maxDaysLate,
    ordersOnTime: scenario.ordersOnTime,
    ordersTotal: scenario.ordersTotal,
    addedCostEur: scenario.addedCostEur,
    lineIdleDays: scenario.lineIdleDays,
    revenueDelayedEur: scenario.revenueDelayedEur,
    runOut: { ...scenario.runOut },
    dailyClosingStock: scenario.dailyClosingStock.map((point) => ({ ...point })),
    orders: scenario.orders.map((order) => ({ ...order })),
    constraintCheck: scenario.constraintCheck,
    constraintMessages: [...scenario.constraintMessages],
    sideEffects: scenario.sideEffects.map((sideEffect) => ({ ...sideEffect })),
    writeBacks: scenario.writeBacks.map((step) => ({ ...step })),
    levers: { ...scenario.levers },
    confidence: { ...scenario.confidence },
  };
}

/**
 * A copy of a whole option set, for the same reason as `copyScenario`.
 *
 * The measures are the record's, unchanged: a seeded option is never re-solved here, because measuring a
 * shipped option would put a second answer beside the one the dataset states. `recommendedId` is copied
 * only when the set states one, since `exactOptionalPropertyTypes` distinguishes an absent recommendation
 * from one holding `undefined` — and an absent recommendation is exactly what a set with no passing option
 * means (AAP 0.8).
 *
 * @param set - The set to copy.
 * @returns An independent set with the same values.
 */
function copyScenarioSet(set: ScenarioSet): ScenarioSet {
  return {
    exceptionId: set.exceptionId,
    scenarios: set.scenarios.map(copyScenario),
    ...(set.recommendedId === undefined ? {} : { recommendedId: set.recommendedId }),
    recommendationRule: set.recommendationRule,
    tradeOff: set.tradeOff,
    rejected: set.rejected.map((option) => ({ ...option })),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The two reads — AAP 0.12.1, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The set an exception with neither a shipped option nor a solver case answers with: no options at all.
 *
 * Option generation for an exception type with no solver case is the optimisation service's work in the
 * pilot, which is the state SCR-04 shows as an empty comparison rather than as a failure: the read
 * succeeded, and the set states the rule it would apply and no recommended option. The trade-off sentence
 * is absent for the reason `NO_TRADE_OFF` records.
 *
 * @param ctx - The call's context, whose seeded option sets supply the rule's wording.
 * @param exceptionId - The exception the empty set answers.
 * @returns A set with no options, no recommendation and the rule the recommendation would apply.
 */
function emptyScenarioSet(ctx: HandlerContext, exceptionId: ExceptionId): ScenarioSet {
  return {
    exceptionId,
    scenarios: [],
    recommendationRule: recommendationRuleOf(ctx),
    tradeOff: NO_TRADE_OFF,
    rejected: [],
  };
}

/**
 * The option set of an exception measured from its own solver case.
 *
 * One `solveSupplyDelay` call per candidate option, each wrapped with its identity and labelled with the
 * name its record states where there is one, and the set assembled around them: the recommendation the
 * contracts rule picks, the rule's wording as the seed states it, the trade-off that recommendation
 * states with its braces filled from the option's own measurement and from the protected revenue
 * `protectedRevenueOf` computes over those same measurements, and the options the rule had to leave out.
 * No measure is derived here — every measure in the returned set is the solver's own output for the
 * lever position the option stands at.
 *
 * @param ctx - The call's context, whose records supply the case, the positions and the confidence.
 * @param exception - The exception whose options are measured.
 * @returns The measured option set.
 * @throws Problem - A `'not-found'` failure when the exception's case does not resolve.
 */
function computedScenarioSet(ctx: HandlerContext, exception: OperationalException): ScenarioSet {
  const caseRecord = solverCaseFor(ctx, exception);
  const confidence = exception.confidence;
  const options = candidateOptions(ctx, exception.id);

  const scenarios = options.map((option) =>
    composeScenario(
      solveSupplyDelay(caseRecord, option.levers),
      {
        id: option.id,
        exceptionId: exception.id,
        name: option.name ?? optionName(option.levers),
        origin: SOLVER_ORIGIN,
      },
      confidence,
    ),
  );

  const recommendedId = rankRecommendation(scenarios);

  if (recommendedId === undefined) {
    return {
      exceptionId: exception.id,
      scenarios,
      recommendationRule: recommendationRuleOf(ctx),
      tradeOff: NO_TRADE_OFF,
      rejected: rejectedOf(scenarios),
    };
  }

  return {
    exceptionId: exception.id,
    scenarios,
    recommendedId,
    recommendationRule: recommendationRuleOf(ctx),
    tradeOff: tradeOffFor(
      options.find((option) => option.id === recommendedId),
      scenarios,
    ),
    rejected: rejectedOf(scenarios),
  };
}

/**
 * The options the records state for one exception, as the comparison read would serve them.
 *
 * Two sources, in the order `getScenarioSet` takes them: the set the dataset ships for the exception,
 * which is served as it stands, and otherwise the set measured from the exception's own solver case. An
 * exception that states neither — no shipped set and no case at all — states no option, which is the
 * empty list here rather than a failure: option generation for an exception type with no case is the
 * optimisation service's work in the pilot, and SCR-04 shows that as its empty comparison rather than as
 * a defect (AAP 0.12.4, AAP 0.14.2).
 *
 * A set the records cannot produce is not answered as no options. The measurement refuses a case the
 * records do not hold and a set whose positions occupy every letter of the `SCN-nnnn-x` form, and each
 * refusal is a record defect rather than an absence: answering it as "this exception names no option"
 * would state that the records hold nothing where in fact they are broken, which is the false statement
 * AAP 0.18.1 forbids a `catch` to make. The failure therefore travels out of this read as the `Problem`
 * it is, for the caller to report. Nothing is written or audited by the measurement.
 *
 * @param ctx - The call's context, whose records supply the case, the positions and the confidence.
 * @param exception - The exception whose options are wanted.
 * @returns The shipped or measured options, or an empty list when the records state none for it.
 * @throws Problem - A `'not-found'` failure when the exception's solver case does not resolve, or a
 *   `'validation'` failure when its option identifiers or the recommendation rule cannot be stated.
 */
function optionsOf(ctx: HandlerContext, exception: OperationalException): readonly Scenario[] {
  const shipped = seededSetFor(ctx.state, exception.id);

  if (shipped !== undefined) {
    return shipped.scenarios;
  }

  if (exception.solverCaseId === undefined) {
    return [];
  }

  return computedScenarioSet(ctx, exception).scenarios;
}

/**
 * The option one evidence reference names, out of the option sets the records state.
 *
 * `handlers/evidence.ts` resolves a `SCN-` reference with this, after the sets the dataset ships and
 * before it reports that no record answers the reference. The comparison screen's columns are measured
 * from an exception's own solver case rather than shipped as records, so an option a figure belongs to
 * is often one the dataset does not hold: without this answer the drawer behind a comparison or sandbox
 * figure would open on its failure region instead of on the record behind the figure (AAP 0.12.4, F12;
 * principle PR-6 — every figure opens its evidence).
 *
 * THE EXCEPTION IS FOUND FROM THE RECORDS, NOT FROM THE REFERENCE. Contracts §1 fixes the form
 * `SCN-nnnn-x`, and the number in it is not a key any record is addressed by: which exception a
 * reference belongs to is what the option sets themselves state, so every exception is asked what its
 * set names, in the records' own order.
 *
 * IT REFUSES NOTHING AND DECIDES NOTHING. No permission is evaluated here, so a reference naming an
 * option of an exception outside the acting role's plant scope resolves like any other and the evidence
 * read's own refusal decides what the reader may open; nothing is written or audited; and a reference no
 * set names is answered `undefined` rather than as a failure, as a reference to a shipped option the
 * records do not hold is.
 *
 * THE ONE THING IT PROPAGATES IS A RECORD DEFECT'S OWN FAILURE. A set the records cannot produce throws
 * (see `optionsOf`), and that is no verdict this lookup takes: it is the defect the caller has to report.
 * One exception's broken record must not hide a valid reference to another exception's option, so every
 * set is asked inside a `try` that remembers the first failure and carries on, a reference the walk does
 * answer is answered at once, and only when the walk ends having found nothing does the remembered
 * failure travel — as the typed `Problem` it is, rather than as the statement that the records hold no
 * such scenario, which would be false while a record they should hold is missing (AAP 0.18.1).
 *
 * @param ctx - The call's context, whose records state the option sets. The state is not modified.
 * @param scenarioId - The identifier the reference names.
 * @returns The option that identifier names, or `undefined` when every set the records can produce
 *   states none and none of them failed.
 * @throws Problem - The first `'not-found'` or `'validation'` failure an option set the walk asked for
 *   could not be produced, once the walk has found that no set names the reference.
 */
export function scenarioForReference(
  ctx: HandlerContext,
  scenarioId: ScenarioId,
): Scenario | undefined {
  let defect: { readonly failure: unknown } | undefined;

  for (const exception of ctx.state.records.exceptions) {
    try {
      const found = optionsOf(ctx, exception).find((candidate) => candidate.id === scenarioId);

      if (found !== undefined) {
        return found;
      }
    } catch (error) {
      // One exception's broken record must not hide a valid reference to another exception's option, so
      // the first failure is remembered and the walk carries on. Wrapping it is what tells a remembered
      // failure apart from no failure at all, whichever value was thrown.
      defect ??= { failure: error };
    }
  }

  if (defect !== undefined) {
    throw defect.failure;
  }

  return undefined;
}

/**
 * Reads every option measured for one exception: the columns, the recommended option with the rule that
 * picked it, and the options set aside with the constraint that blocked each.
 *
 * The refusals come first, in this order: the forbidden trigger, as a permission failure before anything
 * is read; an identifier no record answers, as a not-found failure naming it; a role that does not hold
 * `exception.read` at all, as a permission failure naming the roles that do; and an exception outside
 * the acting role's plant scope, as a not-found failure naming the exception and that scope. A dataset
 * that ships options for the exception then returns them unchanged, with `origin: 'seeded'` preserved
 * so each column carries `Simulated data` from the fixed label set. Otherwise the options the records
 * state are measured from the exception's own case; an exception with no case at all answers with an
 * empty set, which is the comparison screen's empty state rather than a failure.
 *
 * @param ctx - The call's context: the session's records, the acting persona and its triggers.
 * @param exceptionId - The exception whose options are read.
 * @returns The option set.
 * @throws Problem - A `'permission'` failure when the call may not be served, or a `'not-found'` or
 *   `'validation'` failure when the records cannot answer it.
 */
export async function getScenarioSet(
  ctx: HandlerContext,
  exceptionId: ExceptionId,
): Promise<ScenarioSet> {
  assertNotForbidden(ctx, EXCEPTION_READ);

  const exception = exceptionOrThrow(ctx, exceptionId);

  assertPermitted(
    ctx,
    EXCEPTION_READ,
    exception,
    `The acting role (${ctx.actor.role}) may not read the options measured for ${exceptionId}.`,
  );

  const seeded = seededSetFor(ctx.state, exceptionId);

  if (seeded !== undefined) {
    return copyScenarioSet(seeded);
  }

  if (exception.solverCaseId === undefined) {
    return emptyScenarioSet(ctx, exceptionId);
  }

  return computedScenarioSet(ctx, exception);
}

/**
 * The identifier the sandbox's transient option takes.
 *
 * The option set the records state is read first, so the letter follows whatever the set occupies: the
 * sandbox takes the position after the set's highest letter, and moves with the set when a supplied seed
 * document adds options to it.
 *
 * @param ctx - The call's context, whose records supply the set.
 * @param exceptionId - The exception the sandbox is measuring for.
 * @returns The sandbox option's identifier.
 * @throws Problem - A `'validation'` failure when the set cannot be identified or has no letter left.
 */
function sandboxIdentifier(ctx: HandlerContext, exceptionId: ExceptionId): ScenarioId {
  const options = candidateOptions(ctx, exceptionId);
  const [first] = options;
  const anchor = first === undefined ? undefined : splitOptionIdentifier(first.id);

  if (anchor === undefined) {
    throw validationProblem(
      ctx,
      `The option set of ${exceptionId} states no identifier the sandbox option could take a position after.`,
    );
  }

  const used = new Set<string>();

  for (const option of options) {
    const parts = splitOptionIdentifier(option.id);

    if (parts !== undefined) {
      used.add(parts.letter);
    }
  }

  const letter = letterAfterHighest(used);

  if (letter === undefined) {
    throw validationProblem(
      ctx,
      `The options of ${exceptionId} reach the end of the SCN-nnnn-x form's letters, so the sandbox option ` +
        'cannot be identified.',
    );
  }

  return identifierFor(anchor.stem, letter);
}

/**
 * Measures one option at the levers a caller supplies: the comparison screen's sandbox.
 *
 * The measurement is one `solveSupplyDelay` call at the caller's lever position, wrapped with identity the
 * way a candidate option is — the set's own stem, the position after the set's last option, and the lever
 * position as its name. A lever outside its bound is not a failed call: the solver reports one message per
 * breach and the scenario comes back with `constraintCheck: 'fail'` and those messages, which the matrix
 * shows as "Cannot compute" with the reason and never recommends (AAP 0.8, AAP 0.12.3). No measure is
 * emitted as a partial figure, and this module adds none of its own.
 *
 * The call is audited, because a custom solve is one of the writes AAP 0.6.2 names: one `custom solve`
 * event naming the exception, recording the lever position the caller asked for and whether the option
 * stayed inside its bounds. The append runs whether the option passes or breaches — the ask happened
 * either way — and it changes no scenario, so a retry at the same levers returns the same scenario and
 * appends a second event rather than a second result.
 *
 * @param ctx - The call's context: the session's records and the acting persona.
 * @param exceptionId - The exception the option is measured for.
 * @param levers - The lever position the caller asked for.
 * @returns The measured scenario.
 * @throws Problem - A `'permission'` failure when the call may not be served, a `'not-found'` failure when
 *   the exception or its case does not resolve or lies outside the acting role's plant scope, or a
 *   `'validation'` failure when the set cannot be identified.
 */
export async function solveScenarioSandbox(
  ctx: HandlerContext,
  exceptionId: ExceptionId,
  levers: Levers,
): Promise<Scenario> {
  assertNotForbidden(ctx, SCENARIO_CREATE);

  const exception = exceptionOrThrow(ctx, exceptionId);

  assertPermitted(
    ctx,
    SCENARIO_CREATE,
    exception,
    `The acting role (${ctx.actor.role}) may not measure an option of ${exceptionId}.`,
  );

  const caseRecord = solverCaseFor(ctx, exception);
  const result = solveSupplyDelay(caseRecord, levers);

  const scenario = composeScenario(
    result,
    {
      id: sandboxIdentifier(ctx, exceptionId),
      exceptionId,
      name: optionName(result.levers),
      origin: SANDBOX_ORIGIN,
    },
    exception.confidence,
  );

  await appendAuditEvent(ctx, {
    action: CUSTOM_SOLVE_ACTION,
    objectRef: exceptionId,
    result: result.constraintCheck === 'pass' ? SOLVE_SUCCEEDED : SOLVE_FAILED,
    before: null,
    after: {
      exceptionId,
      scenarioId: scenario.id,
      airSets: result.levers.airSets,
      transferSets: result.levers.transferSets,
      constraintCheck: result.constraintCheck,
    },
  });

  return scenario;
}
