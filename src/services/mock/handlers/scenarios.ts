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
 * origin — attaches the confidence the exception record carries, and ranks the options. It computes no
 * measure, no difference and no ranking figure of its own (rule P-6), rounds nothing (the solver rounds
 * line idle days once, half up to two decimals, per contracts §4 rule 5), and states no currency amount,
 * no lever volume and no record identifier as a typed value.
 *
 * THE GAP THIS MODULE REPORTS RATHER THAN FILLS — read this before changing anything below. AAP 0.8 and
 * acceptance test T-04 speak of four named options for `CASE-1184`, and `platform-seed-data.md` §4 holds
 * their names, lever values and expected measures. That document is not part of this repository, and the
 * seeded records this run holds state an option set for the three *other* exceptions only:
 * `src/seed/exception-scenarios.ts` omits `EXC-2026-1184` deliberately, because that case's options are
 * measured at call time. What the records here do state is narrower:
 * - the case `CASE-1184` and the bounds its two levers are held to (`src/seed/solver-cases.ts`);
 * - one lever set for this exception, in the seeded audit trail's `custom solve` event, whose payload
 *   carries `airSets` and `transferSets` (`src/seed/audit-events.ts`);
 * - the identifier of the option the seeded plan under this exception names (`src/seed/approvals.ts`),
 *   which AAP 0.8 corroborates as the recommended option of this case.
 * No record states an option's name, and no record states the other options at all. This module
 * therefore serves the options the records state — the do-nothing baseline AAP 0.8 fixes by name, plus
 * each lever set the seeded trail records — and reports the remainder as a gap rather than filling it:
 * it types no scenario name, no lever volume and no option identifier, and it invents no unnamed option
 * (rule P-6). A supplied seed document supersedes the derivation below without changing this module's
 * public surface, because a caller asks one exception for its options either way.
 *
 * WHY AN OPTION'S IDENTIFIER COMES FROM THE SEEDED PLAN. §1 fixes the form `SCN-nnnn-x` — the
 * exception's number and the option's letter within that set — and the letter is the one thing no
 * derivation can recover, because the options the records do not state occupy letters of their own.
 * Spelling a letter here would mint the identifier of a record that does not exist, so the letter is
 * taken from the one identifier the records state, the seeded plan's: that option keeps its own letter,
 * the baseline takes the lowest letter the plan leaves unused, and the sandbox takes the letter after
 * the highest one the set uses. The set then names exactly what the records name, and it grows correctly
 * when the seed document adds the missing options.
 *
 * THE EURO MEASURES ARE ZERO, AND THIS MODULE DOES NOT PATCH THEM. `SolverCase` carries no price for
 * either lever or for the orders it measures, so `solveSupplyDelay` reports `addedCostEur` and
 * `revenueDelayedEur` as zero and records the gap in its own header. The consequence reaches the
 * recommendation rule here: its second key cannot separate two options that tie on units late, and no
 * tie-break is invented to hide that — the first passing option then stands, which is what the rule as
 * the inputs allow it to be applied yields. For the set the records state the first key already
 * decides (the baseline leaves units late and the recorded option leaves none), so no tie arises.
 *
 * THE SEEDED SETS ARE RETURNED AS THEY STAND. For `EXC-2026-1185`, `EXC-2026-1187` and `EXC-2026-1195`
 * the option columns are seed records rather than solver output, so they are served unchanged, in a copy
 * the caller may not mutate, with `origin: 'seeded'` preserved: that member is what makes the component
 * and the CSV export label each column `Simulated data` from the fixed label set, so no label is typed
 * here (rule P-1, AAP 0.10). They are never re-solved — a shipped option re-measured here would be a
 * second answer to the same question.
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
 * - P-3, P-8: verdicts come from `ctx.actor`, and a refusal carries `requiredPermission` and
 *   `rolesWithPermission`; a breached option carries the solver's own messages, which is what a screen
 *   shows as "Cannot compute" with the reason.
 * - P-4: no wording claims that a plan establishes anything, and the sandbox demonstrates a mechanism
 *   without asserting a property of a live system.
 * - P-6: no currency literal, no lever volume, no record identifier and no rounding of its own; the
 *   expected results of `platform-seed-data.md` are fixtures this module neither holds nor reads.
 * - P-7: only the seed's synthetic records and the workspace's own words for its two levers.
 * - B-1, B-2: no request leaves for any host, and nothing here reads configuration or a credential.
 */

import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import { solveSupplyDelay } from '../../../domain/solver/solve-supply-delay';
import type {
  Approval,
  AuditAction,
  AuditEventDraft,
  AuditPayload,
  AuditResult,
  Confidence,
  ExceptionId,
  Levers,
  OperationalException,
  Permission,
  Problem,
  Rejected,
  Scenario,
  ScenarioId,
  ScenarioOrigin,
  ScenarioSet,
  SolverCase,
  SolverResult,
} from '../../../types';
import type { HandlerContext, MockState } from '../mock-state';
import type { ExceptionScenarioSeed } from '../seed-loader';
import { isSimulationOn } from '../simulation';
import { appendAuditEvent, traceIdFor } from './audit';

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
 * The trade-off sentence a set carries when no record states one.
 *
 * `ScenarioSet.tradeOff` is required, and this module may not author a sentence: the seed holds a
 * trade-off sentence for each of its own option sets, in the records that ship those options, and holds
 * none for an option measured at call time. A computed set therefore states no sentence rather than one
 * this module wrote, and the comparison screen renders the recommendation rule — which the seed does
 * state — with no claim behind it that no record carries.
 */
const NO_TRADE_OFF = '';

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
 * @param ctx - The call's context, whose state supplies the correlation identifier.
 * @param permission - The permission the call required.
 * @param reason - The reason in plain words, naming what the call would have done.
 * @returns The `Problem` to throw, built per call so the role list is the matrix's current answer.
 */
function permissionProblem(ctx: HandlerContext, permission: Permission, reason: string): Problem {
  const roles = rolesWith(permission);

  return {
    type: 'permission',
    message: `${reason} That needs the ${permission} permission, which the roles ${roles.join(', ')} hold.`,
    traceId: traceIdFor(ctx.state),
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
 * @param ctx - The call's context, whose state supplies the correlation identifier.
 * @param reason - The reason in plain words, naming the reference that does not resolve.
 * @returns The `Problem` to throw.
 */
function notFoundProblem(ctx: HandlerContext, reason: string): Problem {
  return { type: 'not-found', message: reason, traceId: traceIdFor(ctx.state) };
}

/**
 * The failure a record set that contradicts itself produces.
 *
 * Used where the records this module reads disagree with each other or state nothing it may quote — a
 * seeded plan whose identifier cannot be read as an option identifier, or seeded option sets that
 * disagree about the recommendation rule. The module reports such a state instead of choosing between
 * two records, because a choice made here would be a figure the records do not state (rule P-6).
 *
 * @param ctx - The call's context, whose state supplies the correlation identifier.
 * @param reason - The reason in plain words, naming the records that disagree.
 * @returns The `Problem` to throw.
 */
function validationProblem(ctx: HandlerContext, reason: string): Problem {
  return { type: 'validation', message: reason, traceId: traceIdFor(ctx.state) };
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
 * T-17).
 *
 * @param ctx - The call's context: the state its triggers are read from.
 * @param permission - The permission the refused call required, carried into the failure.
 * @param reason - The reason in plain words for the refused call.
 * @throws Problem - A `'permission'` failure naming the permission and its holders.
 */
function assertNotForbidden(ctx: HandlerContext, permission: Permission, reason: string): void {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    throw permissionProblem(ctx, permission, reason);
  }
}

/**
 * Refuses the call unless the acting persona may perform a permission on this exception.
 *
 * The exception record is the subject, because §7.1 scopes a verdict by plant: a role limited to one
 * plant may not read or measure an option of another plant's exception, and the persona's own scope
 * narrows its role's where it is narrower. A refusal names the permission and the roles that hold it
 * (rule P-8), and the checks behind it are a demonstration control rather than production authorisation
 * (rule P-3).
 *
 * @param ctx - The call's context: the persona the check is made for.
 * @param permission - The permission the call requires.
 * @param exception - The exception the call is about, read for its plant.
 * @param reason - The reason in plain words for the refusal.
 * @throws Problem - A `'permission'` failure naming the permission and its holders.
 */
function assertPermitted(
  ctx: HandlerContext,
  permission: Permission,
  exception: OperationalException,
  reason: string,
): void {
  if (!hasPermission(ctx.actor.role, permission, exception, ctx.actor)) {
    throw permissionProblem(ctx, permission, reason);
  }
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

/** One candidate option: the identifier it takes and the lever position it is measured at. */
interface CandidateOption {
  /** The identifier the option takes within its set. */
  readonly id: ScenarioId;

  /** The lever position the option is measured at. */
  readonly levers: Levers;
}

/**
 * The options the records state for an exception, in the order the comparison matrix shows them.
 *
 * Two sources, both records: the do-nothing baseline AAP 0.8 fixes by name, which stands first so a
 * reader sees what the recommendation is measured against, and then each lever position the seeded trail
 * records, in the trail's order. The option the seeded plan names keeps the identifier the plan states,
 * which is why the recorded options are allocated their letters before the baseline takes the lowest one
 * the plan leaves free.
 *
 * @param ctx - The call's context, whose records are read.
 * @param exceptionId - The exception whose options are wanted.
 * @returns The candidate options, baseline first.
 * @throws Problem - A `'validation'` failure from the identifier anchor, or when the set has no letter
 *   left for an option.
 */
function candidateOptions(ctx: HandlerContext, exceptionId: ExceptionId): CandidateOption[] {
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
    recordedOptions.push({ id: identifierFor(anchor.stem, letter), levers });
  }

  const baselineLetter = takeLowestFreeLetter(used);

  if (baselineLetter === undefined) {
    throw validationProblem(
      ctx,
      `The options of ${exceptionId} occupy every letter of the SCN-nnnn-x form, so the baseline cannot be ` +
        'identified.',
    );
  }

  return [{ id: identifierFor(anchor.stem, baselineLetter), levers: BASELINE_LEVERS }, ...recordedOptions];
}

/**
 * The name a comparison column shows for an option.
 *
 * Derived from the option's own lever position, in the two labels the solver prints for the levers, so a
 * column names exactly what was measured and no record has to name it: the seeded records this run holds
 * state no option name, and a name written here would be this module's own words about a record it does
 * not hold (rule P-6). A supplied seed document's option names supersede it.
 *
 * @param levers - The lever position the option was measured at.
 * @returns The column name.
 */
function optionName(levers: Levers): string {
  return `${AIR_LEVER_LABEL} ${levers.airSets}${NAME_SEPARATOR}${TRANSFER_LEVER_LABEL} ${levers.transferSets}`;
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
 * One `solveSupplyDelay` call per candidate option, each wrapped with its identity, and the set assembled
 * around them: the recommendation the contracts rule picks, the rule's wording as the seed states it, and
 * the options the rule had to leave out. No figure is derived here — every measure in the returned set is
 * the solver's own output for the lever position the option stands at.
 *
 * @param ctx - The call's context, whose records supply the case and the confidence.
 * @param exception - The exception whose options are measured.
 * @returns The measured option set.
 */
function computedScenarioSet(ctx: HandlerContext, exception: OperationalException): ScenarioSet {
  const caseRecord = solverCaseFor(ctx, exception);
  const confidence = exception.confidence;

  const scenarios = candidateOptions(ctx, exception.id).map((option) =>
    composeScenario(
      solveSupplyDelay(caseRecord, option.levers),
      {
        id: option.id,
        exceptionId: exception.id,
        name: optionName(option.levers),
        origin: SOLVER_ORIGIN,
      },
      confidence,
    ),
  );

  const recommendedId = rankRecommendation(scenarios);

  return {
    exceptionId: exception.id,
    scenarios,
    ...(recommendedId === undefined ? {} : { recommendedId }),
    recommendationRule: recommendationRuleOf(ctx),
    tradeOff: NO_TRADE_OFF,
    rejected: rejectedOf(scenarios),
  };
}

/**
 * Reads every option measured for one exception: the columns, the recommended option with the rule that
 * picked it, and the options set aside with the constraint that blocked each.
 *
 * Four paths, in this order. A session with the forbidden trigger in effect is refused with a permission
 * failure before anything is read. An identifier no record answers is a not-found failure naming it. A
 * dataset that ships options for the exception returns them unchanged, with `origin: 'seeded'` preserved
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
  assertNotForbidden(
    ctx,
    EXCEPTION_READ,
    `The options measured for ${exceptionId} are not readable in this state.`,
  );

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
 *   the exception or its case does not resolve, or a `'validation'` failure when the set cannot be
 *   identified.
 */
export async function solveScenarioSandbox(
  ctx: HandlerContext,
  exceptionId: ExceptionId,
  levers: Levers,
): Promise<Scenario> {
  assertNotForbidden(
    ctx,
    SCENARIO_CREATE,
    `An option of ${exceptionId} cannot be measured in this state.`,
  );

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
