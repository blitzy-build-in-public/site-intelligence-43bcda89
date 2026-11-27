/**
 * The governance family of the in-browser mock adapter: the declared deployment configuration SCR-07
 * reads, the outbound ledger computed from the audit trail, the policy list and its detail, the
 * time-boxed policy exception the screen requests, and the source catalogue.
 *
 * Implements the "Handlers" row of AAP 0.12.1 — one handler module per read/write family, of which
 * this is the governance family — at the path AAP 0.13.1 gives `handlers/`, over the records
 * `platform-seed-data.md` §8 holds and the aggregates `platform-contracts.md` §5 defines: the
 * thirty-day allowed and blocked counts per outbound endpoint, split by the result an audit event
 * recorded. It serves SCR-07 (`/admin/sovereignty`, `/admin/policies/:policyId`) and nothing else:
 * the plan grid and the exit package belong to the stage that shows them and have no record set
 * here, and the S4 package families are served by their own stage's data.
 *
 * WHAT EVERY VALUE BELOW IS, AND WHAT IT IS NOT. Everything this module returns describes declared
 * configuration or a mechanism, never a property the deployment has been shown to have (rule P-4).
 * The deployment summary, the ten configuration rows and POL-009 state what the configuration
 * declares, each under the fixed `Declared, not verified` label the component that renders it applies
 * from `SIM_LABELS`; and the ledger's two columns are counts of recorded audit events. No sentence
 * here, and no value it returns, states that the workspace establishes a residency boundary, prevents
 * a copy or withstands an edit. The interface labels the chain `Simulated control` wherever it
 * surfaces, and the harness behind the permission checks is a demonstration control rather than
 * production authorisation (rule P-3).
 *
 * WHY NO LABEL STRING IS TYPED HERE. `SovereigntyStatus`, `DeploymentSummary` and `SovereigntyRow`
 * carry no label member: the row's `status` is the literal `'declared'` and the summary's
 * `outboundBlocked` is a `boolean`, so a component renders the fixed label of specification §5.3
 * beside them and has no member with which to claim a verified state. The seven exact strings
 * therefore stay in `src/types/primitives.ts` and are applied where an element surfaces, which is
 * what keeps one copy of each (rule P-1).
 *
 * WHERE THE NUMBERS COME FROM, AND WHY THIS MODULE COMPUTES NONE (rule P-6).
 * - `getSovereignty` and `getOutboundLedger` return `computeLedger`'s rows unchanged:
 *   `src/domain/aggregation/ledger.ts` counts the events whose `objectRef` is a declared endpoint
 *   over the thirty days ending on the demonstration clock. This module holds no endpoint list, no
 *   count and no instant of its own — the endpoints and their purposes are the seeded record's, and
 *   the counts are the aggregate's.
 * - The declaration rows and the summary are copied from the seeded record field for field. No row,
 *   date or status is re-derived, so the panel cannot show a configuration the record does not hold.
 * - `PolicyDetail.recentDecisions` lists the events the policy engine itself appended for that
 *   policy, read from the chain. Nothing is filtered by result, so a reader counts what the trail
 *   recorded rather than what this module selected.
 *
 * WHY THE PENDING REQUEST LIVES ON THE SESSION. `requestPolicyException` records a time-boxed
 * exception as `status: 'pending'` on `MockState.policyExceptions`, beside the seeds rather than
 * inside them, because `src/seed/` publishes a fixed record set that a reset must restore exactly.
 * The request grants nothing: no policy verdict reads it, no permission is derived from it, and the
 * engine continues to evaluate the policy records and the acting persona alone. It is left pending
 * because nothing in the demonstration decides one (AAP 0.12.4, SCR-07), and `resetDemo` empties it
 * with the rest of the session.
 *
 * THE PERMISSIONS, AND THE JUDGEMENT EACH REQUIRES (contracts §7.1, rules P-3 and P-8). No read here
 * is plant-scoped — declared configuration and the policy set are group-wide — so every check passes
 * a `null` subject and the matrix reduces to the role's own permission list:
 * - `sovereignty.read` for the declared configuration and for the ledger beside it. The ledger is
 *   part of the same payload and is not a separate disclosure, so it carries the permission of the
 *   screen it belongs to rather than a second one.
 * - `policy.read` for the policy list and the policy detail, including the detail of POL-009, which
 *   is declared configuration the engine never evaluates: the record is shown, marked unevaluated,
 *   and never hidden (rule P-4).
 * - `policy.exception.request` for the time-boxed exception, which is the write this family owns.
 * - No role gate on the source catalogue, deliberately. The six sources' state and as-of instants
 *   already travel to every persona in the `meta` of every result the port returns, so a role check on
 *   this read would withhold nothing; the shell's freshness strip
 *   (`src/app/freshness-strip.tsx`) renders the six pills in the top bar on every route for every
 *   persona, which is the visible half of the freshness rule (AAP §0.2.1, T-13). The read still
 *   honours the demonstration's forbidden trigger, and `admin.read` stays the permission the sources
 *   workspace of a later stage will require.
 * - The export's sections are composed in `../exports/evidence-pack.ts` and not here. That builder
 *   reads the session's records through `computeLedger` and `chain.ts`'s `verifyChain`, so the pack
 *   has one composition and cannot disagree with the screen it came from (rule P-6); SCR-07's
 *   "Export evidence pack" action reaches the file through it directly.
 *
 * A REFUSAL NAMES WHAT IS MISSING, IN PLAIN WORDS (rule P-8). Every denial is a `Problem` literal
 * built here with cause `'permission'`, a sentence naming the acting role, the permission it lacks
 * and the roles that do hold it, plus `requiredPermission` and `rolesWithPermission` — the fields a
 * forbidden card and a disabled control's tooltip print. The correlation identifier is
 * `traceIdFor(ctx.state)`, the same value the result's `Meta.traceId` carries, so an identifier a
 * user quotes leads to the call. The forbidden trigger of `../simulation.ts` produces the same
 * failure from every entry point, so one state has one rendering.
 *
 * DETERMINISTIC AND READ-ONLY WHERE IT CAN BE (AAP 0.2.1, AAP 0.18.2). Reads modify nothing: the
 * records are copied out field by field, the ledger is a fresh array of fresh rows and the decisions
 * are fresh copies of the chain's events. The one write appends one event through the single append
 * path and one record to the session's pending requests. No clock is read — the ledger window and the
 * expiry comparison both run against the constant `DEMO_CLOCK` of contracts §1 — and no random
 * source, locale or module-level mutable value is touched, so two calls on one state return the same
 * payload.
 *
 * What this module does not do: it opens no request, socket or asset and names no address (rule B-1);
 * it reads no configuration and carries no credential (rule B-2); it imports no seed module, no
 * React, no screen and no API client, so the port stays the only data boundary (rule P-2); it carries
 * no competitor concept at all, so no first-party figure here can be blended with a market one (rule
 * P-5); it types no figure, amount or record identifier of its own (rule P-6); and every name it
 * returns is a synthetic record's own (rule P-7).
 */

/* ---------------------------------------------------------------------------------------------
 * Imports — the domain arithmetic this family delegates to, the shared vocabulary, and its siblings
 * ------------------------------------------------------------------------------------------- */

import { computeLedger } from '../../../domain/aggregation/ledger';
import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import { DEMO_CLOCK, SOURCE_LABELS } from '../../../types';
import type {
  AuditAction,
  AuditEvent,
  LedgerRow,
  ListQuery,
  Permission,
  PolicyDetail,
  PolicyException,
  PolicyExceptionStatus,
  PolicyId,
  Problem,
  SourceCatalogue,
  SovereigntyStatus,
  Timestamp,
  UserId,
} from '../../../types';
import type { HandlerContext } from '../mock-state';
import type { SeededPolicy } from '../seed-loader';
import { freshnessFor, isSimulationOn } from '../simulation';
import { appendAuditEvent, traceIdFor } from './audit';

/* ---------------------------------------------------------------------------------------------
 * The vocabulary this family addresses — contracts §7.1, §7.2, §6
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission the declared configuration and the ledger beside it require.
 *
 * Named once so the check and the failure's `requiredPermission` cannot disagree, as is each constant
 * below. Every member is a `Permission` from the tuple of `src/types/primitives.ts`, so a permission
 * the matrix stops naming is a compile error here rather than a check that silently never fires.
 */
const SOVEREIGNTY_READ: Permission = 'sovereignty.read';

/** The permission the policy list and the policy detail require. */
const POLICY_READ: Permission = 'policy.read';

/** The permission the time-boxed policy exception requires: the write this family owns. */
const POLICY_EXCEPTION_REQUEST: Permission = 'policy.exception.request';

/**
 * The permission the sources workspace of a later stage requires, and the permission the source
 * catalogue's refusal reports while the demonstration's forbidden trigger is on.
 *
 * The catalogue read itself is not gated on it: the six sources' state and as-of instants reach every
 * persona in the `meta` of every result the port returns, and the shell's freshness strip shows them
 * in the top bar on every route, so the read withholds nothing a role check could protect.
 */
const ADMIN_READ: Permission = 'admin.read';

/**
 * The action the exception request appends to the chain.
 *
 * contracts §6 fixes sixteen action names and the inputs available in this run enumerate twelve,
 * which is why `AuditAction` is an open alias: it has no member for this write, and none may be
 * invented for it in `src/types`. This spelling and `simulated write-back` in `./approvals.ts` are
 * the two the adapter derives, so fourteen distinct values are appended and the last two of the
 * sixteen are named by no available input. The spelling follows the "approval request" form the
 * enumerated names use, so the trail reads consistently, and the record's own subject is the policy
 * the exception is requested against.
 */
const POLICY_EXCEPTION_REQUESTED: AuditAction = 'policy exception request';

/** Where a request leaves the flow. Nothing in the demonstration decides one. */
const PENDING: PolicyExceptionStatus = 'pending';

/**
 * The demonstration clock as an epoch value, read once from the constant.
 *
 * The argument is the constant of contracts §1 and never the current time, so comparing an expiry
 * against it is a comparison against a fixed instant (AAP 0.2.1). The same reading is what the audit
 * family uses to stamp an appended event.
 */
const DEMO_CLOCK_INSTANT = Date.parse(DEMO_CLOCK);

/* ---------------------------------------------------------------------------------------------
 * Failures — platform-contracts.md §2, rules P-3 and P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The failure a role that may not call this family receives, and the one the forbidden trigger
 * produces.
 *
 * Every member a permission cause carries is filled: the cause itself, a sentence that names the
 * acting role, the permission it lacks and the roles that do hold it, the permission, and those
 * roles. That is the whole of what a forbidden card prints and what a disabled control's reason
 * states, so the screen explains the refusal rather than only reporting it (rule P-8). The checks run
 * in the browser of a build with no backend and no session, so they are a demonstration control and
 * not production authorisation (rule P-3); the adapter evaluates them itself regardless of what a
 * screen offered, so a bypassed control grants nothing.
 *
 * @param ctx - The call's context, whose persona the reason names and whose state supplies the trace.
 * @param permission - The permission the call requires.
 * @param refusal - The leading clause, in plain words, saying what was refused and why in this state.
 * @returns A fresh `Problem` per call, so the role list is the matrix's current answer.
 */
function permissionProblem(ctx: HandlerContext, permission: Permission, refusal: string): Problem {
  const roles = rolesWith(permission);

  return {
    type: 'permission',
    message:
      `${refusal} That requires the ${permission} permission, which the acting role ` +
      `(${ctx.actor.role}) does not hold; the roles that hold it are ${roles.join(', ')}.`,
    traceId: traceIdFor(ctx.state),
    requiredPermission: permission,
    rolesWithPermission: roles,
  };
}

/**
 * The failure a request the records cannot honour throws: a draft that names no reason, an expiry
 * that has already passed, or a second approver who cannot approve it.
 *
 * @param ctx - The call's context, whose state supplies the trace the failure carries.
 * @param message - The reason, in the plain words the caller supplies, naming the field at fault.
 * @returns A fresh validation failure carrying that reason.
 */
function validationProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'validation', message, traceId: traceIdFor(ctx.state) };
}

/**
 * The failure a policy identifier that answers no record produces.
 *
 * A policy a reader cannot open is a record the state does not hold rather than a malformed request,
 * which is the `'not-found'` cause of AAP 0.12.3; the message names the identifiers the record set
 * does hold, so the reader learns what may be opened instead.
 *
 * @param ctx - The call's context, whose state supplies the trace and the identifiers.
 * @param policyId - The identifier that resolved to nothing.
 * @returns A fresh not-found failure.
 */
function notFoundProblem(ctx: HandlerContext, policyId: PolicyId): Problem {
  const known = ctx.state.records.policies.map((policy) => policy.id).join(', ');

  return {
    type: 'not-found',
    message: `No policy record answers the identifier ${policyId}. The policy set holds ${known}.`,
    traceId: traceIdFor(ctx.state),
  };
}

/**
 * Refuses the call unless the acting persona holds `permission` and the forbidden trigger is off.
 *
 * Two causes produce one failure shape on purpose: a screen renders one forbidden card and disables
 * one set of controls whether the refusal came from the contract matrix or from the simulation
 * popover, so the explanation a reader sees is the one the matrix would give (AAP 0.12.4, T-17). The
 * trigger is checked first because it stands for a session-wide refusal rather than for a fact about
 * a role. The verdict is the persona's, resolved by the adapter from `state.activeUserId`, so a
 * caller cannot pass a role in.
 *
 * @param ctx - The call's context: the persona the check is made for and the state its triggers are read from.
 * @param permission - The permission the call requires.
 * @param subject - The thing the call returns or records, named in the refusal as a reader would say it.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function requirePermission(ctx: HandlerContext, permission: Permission, subject: string): void {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    throw permissionProblem(
      ctx,
      permission,
      `The ${subject} is not available in this state, which the demonstration reports as forbidden.`,
    );
  }

  if (!hasPermission(ctx.actor.role, permission, null, ctx.actor)) {
    throw permissionProblem(ctx, permission, `The ${subject} is not available to the acting role.`);
  }
}

/**
 * Refuses the source catalogue while the demonstration's forbidden trigger is on, and admits every
 * acting persona otherwise.
 *
 * The six sources' state and as-of instants are ambient workspace state rather than a disclosure: they
 * already reach every persona in the `meta` of every result the port returns, and the shell's freshness
 * strip renders them in the top bar on every route for every persona (AAP §0.2.1, T-13). A role check
 * here would therefore withhold nothing, while refusing the read to a planner would leave the top bar
 * unable to say how current the data behind the plan is. The trigger is kept so the demonstration's
 * refusal state is reported by the strip instead of being papered over with pills that would read as
 * current.
 *
 * @param ctx - The call's context: the state whose triggers are read, and the persona the refusal is
 *   reported for.
 */
function requireCatalogueReadable(ctx: HandlerContext): void {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    throw permissionProblem(
      ctx,
      ADMIN_READ,
      'The source catalogue is not available in this state, which the demonstration reports as forbidden.',
    );
  }
}

/* ---------------------------------------------------------------------------------------------
 * The record reads the payloads are built from — AAP 0.12.1, contracts §5
 * ------------------------------------------------------------------------------------------- */

/**
 * The outbound ledger: one row per declared endpoint, with the thirty-day counts the aggregate
 * computes from the audit trail.
 *
 * The declared record supplies the endpoints, their order, their purposes and their states; the
 * aggregate supplies the two counts and the last attempt. Neither an endpoint name nor a count is
 * written here, so the panel cannot report a blocked call the trail does not hold (rule P-6).
 *
 * @param ctx - The call's context: the chain the counts are taken from and the record declaring the endpoints.
 * @returns Fresh rows, one per declared endpoint, in the record's own order.
 */
function ledgerOf(ctx: HandlerContext): LedgerRow[] {
  return computeLedger(ctx.state.auditEvents, ctx.state.records.sovereignty, DEMO_CLOCK);
}

/**
 * The sovereignty screen's whole payload, built from the seeded record and the ledger above.
 *
 * The summary and the ten rows are copied field for field — status, record and last-declared date
 * included — so a reader sees the configuration the record declares and no row this module derived.
 * `status` stays the literal `'declared'` the DTO fixes, and the label that qualifies it is the
 * component's, which is why no string of specification §5.3 is typed here (rules P-1, P-4).
 *
 * @param ctx - The call's context, whose records and chain the payload is read from.
 * @returns The summary, the declared rows in the record's order, and the counted ledger.
 */
function sovereigntyStatusOf(ctx: HandlerContext): SovereigntyStatus {
  const record = ctx.state.records.sovereignty;

  return {
    summary: { ...record.summary },
    rows: record.rows.map((row) => ({ ...row })),
    ledger: ledgerOf(ctx),
  };
}

/**
 * The decisions one policy made, most recent first.
 *
 * An event belongs to a policy when it carries that policy's identifier, which is how the engine
 * records a deny or a block it produced (AAP 0.8). The chain's own sequence orders them — strictly
 * increasing, so the highest position is the newest record — and each event is copied, so a screen
 * that edits what it was handed cannot alter the trail.
 *
 * @param ctx - The call's context, whose chain the decisions are read from. The state is not modified.
 * @param policyId - The policy whose decisions are counted.
 * @returns Fresh copies of the matching events, newest first; empty when the policy has decided nothing.
 */
function decisionsFor(ctx: HandlerContext, policyId: PolicyId): AuditEvent[] {
  return ctx.state.auditEvents
    .filter((event) => event.policyId === policyId)
    .sort((left, right) => right.sequence - left.sequence)
    .map((event) => ({ ...event }));
}

/**
 * One policy as its list row and its detail screen show it.
 *
 * The statement is the record's own `displayText` and the evaluated flag is the record's own
 * `evaluationStatus`, so the rule a denial cites and the rule the screen prints cannot drift apart
 * and no wording is composed here (rule P-6). POL-009 comes through this path like the other four,
 * carrying `evaluated: false` because the engine never runs it: the record is shown as declared
 * configuration rather than hidden or evaluated (rule P-4).
 *
 * @param ctx - The call's context, whose chain the policy's decisions are read from.
 * @param policy - The seeded policy record.
 * @returns The policy's display detail.
 */
function policyDetailOf(ctx: HandlerContext, policy: SeededPolicy): PolicyDetail {
  return {
    id: policy.id,
    title: policy.title,
    statement: policy.displayText,
    evaluated: policy.evaluationStatus === 'evaluated',
    recentDecisions: decisionsFor(ctx, policy.id),
  };
}

/**
 * The policy record an identifier names.
 *
 * @param ctx - The call's context, whose records the policy is looked up in.
 * @param policyId - The identifier the caller asked for.
 * @returns The seeded policy record.
 * @throws Problem - A `'not-found'` failure when no record answers the identifier.
 */
function findPolicy(ctx: HandlerContext, policyId: PolicyId): SeededPolicy {
  const policy = ctx.state.records.policies.find((candidate) => candidate.id === policyId);

  if (policy === undefined) {
    throw notFoundProblem(ctx, policyId);
  }

  return policy;
}

/* ---------------------------------------------------------------------------------------------
 * Ordering and paging the list reads — contracts §9 list parameters, AAP 0.6.3 and AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The ledger members a caller may order the rows by, spelled as `sort=field:dir` names them.
 *
 * The set is the row's own readable members rather than a display concept — the endpoint, its
 * purpose, its declared state, its last attempt and its two counted columns — and an unknown member
 * falls back to the default ordering rather than failing a read a screen can recover from.
 */
const LEDGER_SORT_FIELDS = [
  'endpoint',
  'purpose',
  'state',
  'lastAttempt',
  'allowed',
  'blocked',
] as const;

/** One member of `LEDGER_SORT_FIELDS`. */
type LedgerSortField = (typeof LEDGER_SORT_FIELDS)[number];

/**
 * The policy members a caller may order the entries by, spelled as `sort=field:dir` names them: the
 * identifier, the title, the display statement and the flag saying whether the engine evaluates the
 * policy. `recentDecisions` is not among them, because the events an entry carries are its payload
 * rather than a value the entry is ordered by.
 */
const POLICY_SORT_FIELDS = ['id', 'title', 'statement', 'evaluated'] as const;

/** One member of `POLICY_SORT_FIELDS`. */
type PolicySortField = (typeof POLICY_SORT_FIELDS)[number];

/** Whether a string names a ledger member the rows may be ordered by. */
function isLedgerSortField(value: string): value is LedgerSortField {
  return LEDGER_SORT_FIELDS.some((field) => field === value);
}

/** Whether a string names a policy member the entries may be ordered by. */
function isPolicySortField(value: string): value is PolicySortField {
  return POLICY_SORT_FIELDS.some((field) => field === value);
}

/** One ordering: the member to order by and the direction to read it in. */
interface SortOrder<TField extends string> {
  /** The member ordered by. */
  readonly field: TField;

  /** Whether the order runs from the greatest value to the least. */
  readonly descending: boolean;
}

/**
 * The ordering a `sort=field:dir` parameter asks for, or `null` when it asks for none this read can
 * honour — the default being the order the records the read was given hold.
 *
 * The parameter's form is contracts §9's: the member, a colon, then `asc` or `desc`. A member the
 * family's vocabulary does not name, or a direction spelled in another form, yields that default
 * rather than a failure: a read that can answer is worth more than a refusal over a presentation
 * hint.
 *
 * @param isField - The family's own test for a member it can order by.
 * @param sort - The parameter as the query carried it, or `undefined` when it carried none.
 * @returns The ordering to apply, or `null` for the order the records hold.
 */
function sortOrderOf<TField extends string>(
  isField: (value: string) => value is TField,
  sort: string | undefined,
): SortOrder<TField> | null {
  if (sort === undefined) {
    return null;
  }

  const [field, direction] = sort.split(':');

  if (field === undefined || !isField(field)) {
    return null;
  }

  if (direction === undefined || direction === 'asc') {
    return { field, descending: false };
  }

  return direction === 'desc' ? { field, descending: true } : null;
}

/** Orders two strings by their own lexical order, which is also ISO 8601's for a single offset. */
function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  return left > right ? 1 : 0;
}

/**
 * Orders two row values in the type they compare in: two counts numerically, and every other member
 * as the text it renders to.
 *
 * @param left - One row's value.
 * @param right - The other's.
 * @returns A negative number when `left` comes first and a positive one when `right` does.
 */
function compareValues(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return compareText(String(left), String(right));
}

/**
 * The value one sortable ledger member holds on a row.
 *
 * `allowed` and `blocked` are counts and compare numerically; `lastAttempt` compares as text, which
 * is its instant order because every record in this build carries the one offset contracts §1 fixes,
 * and an endpoint never contacted reads as an empty string, so it stands before every attempted one
 * in `asc` rather than being dropped from the ordering.
 *
 * @param row - The ledger row.
 * @param field - The member to read.
 * @returns The row's value for that member.
 */
function ledgerValueOf(row: LedgerRow, field: LedgerSortField): string | number {
  if (field === 'allowed') {
    return row.allowed;
  }

  if (field === 'blocked') {
    return row.blocked;
  }

  if (field === 'lastAttempt') {
    return row.lastAttempt ?? '';
  }

  return row[field];
}

/**
 * The value one sortable policy member holds on an entry.
 *
 * `evaluated` compares as its own text, so an ordering by it groups the declared policies beside each
 * other and the evaluated ones beside each other; the other three members are the record's own
 * strings.
 *
 * @param detail - The policy entry.
 * @param field - The member to read.
 * @returns The entry's value for that member.
 */
function policyValueOf(detail: PolicyDetail, field: PolicySortField): string | number {
  return field === 'evaluated' ? String(detail.evaluated) : detail[field];
}

/**
 * Orders two ledger rows by one ordering, and by endpoint where the ordered members are equal.
 *
 * @param left - One row.
 * @param right - The other.
 * @param order - The ordering to apply.
 * @returns A negative number when `left` comes first and a positive one when `right` does; the
 *   endpoint breaks every tie in the same direction, so no pair is unordered.
 */
function compareLedgerRows(
  left: LedgerRow,
  right: LedgerRow,
  order: SortOrder<LedgerSortField>,
): number {
  const primary = compareValues(
    ledgerValueOf(left, order.field),
    ledgerValueOf(right, order.field),
  );

  if (primary !== 0) {
    return order.descending ? -primary : primary;
  }

  return order.descending
    ? compareText(right.endpoint, left.endpoint)
    : compareText(left.endpoint, right.endpoint);
}

/**
 * Orders two policy entries by one ordering, and by identifier where the ordered members are equal.
 *
 * @param left - One entry.
 * @param right - The other.
 * @param order - The ordering to apply.
 * @returns A negative number when `left` comes first and a positive one when `right` does; the
 *   identifier breaks every tie in the same direction, so no pair is unordered.
 */
function comparePolicyEntries(
  left: PolicyDetail,
  right: PolicyDetail,
  order: SortOrder<PolicySortField>,
): number {
  const primary = compareValues(
    policyValueOf(left, order.field),
    policyValueOf(right, order.field),
  );

  if (primary !== 0) {
    return order.descending ? -primary : primary;
  }

  return order.descending ? compareText(right.id, left.id) : compareText(left.id, right.id);
}

/**
 * The position in an ordered page from which a cursor continues.
 *
 * The cursor is opaque to a caller and holds the identity of the last row the previous page returned
 * — the endpoint of a ledger row, the identifier of a policy — so the next page starts at the row
 * that follows it in the requested order and a page boundary can neither repeat nor skip a row
 * however the records have grown in between. A cursor that names no row of this read in the
 * requested order — a malformed one, or one from an ordering the caller has since changed — is
 * refused rather than silently restarted, because a page beginning again at the top would read as a
 * truncated list.
 *
 * @param ordered - The rows the read admits, already in the requested order.
 * @param cursor - The position the previous page ended at, or `undefined` for the first page.
 * @param keyOf - The row's own identity, which is what a cursor names.
 * @param ctx - The call's context, whose state supplies the trace a refusal carries.
 * @param family - How the read that refused is named, such as `ledger`.
 * @returns The index the page starts at.
 * @throws Problem - A `'validation'` failure when the cursor names no row of the ordered page.
 */
function startIndexFor<TRow>(
  ordered: readonly TRow[],
  cursor: string | undefined,
  keyOf: (row: TRow) => string,
  ctx: HandlerContext,
  family: string,
): number {
  if (cursor === undefined) {
    return 0;
  }

  const found = ordered.findIndex((row) => keyOf(row) === cursor);

  if (found < 0) {
    throw validationProblem(
      ctx,
      `The ${family} cursor ${cursor} names no record of this read in the requested order.`,
    );
  }

  return found + 1;
}

/**
 * The greatest number of records a page may hold, or `null` when the query sets no boundary.
 *
 * A parameter that is absent, not an integer, or not positive asks for no page rather than for an
 * empty one: contracts §9 leaves `limit` optional, and a caller that omits it wants the whole read.
 * The bound is the parameter's alone, so no page size is fixed here (rule P-6).
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
 * The two payloads this family declares — AAP 0.12.1, contracts §3 and §11
 * ------------------------------------------------------------------------------------------- */

/**
 * The terms a time-boxed policy exception needs before it exists.
 *
 * Declared here rather than in `src/types` because that folder holds no shape for it: the port's own
 * `requestPolicyException` adds the policy identifier to the same three terms and declares its
 * request there, while this interface is the handler's calling convention — the arrangement
 * `AuditWriteDraft` in `./audit.ts` already uses. What comes back is `PolicyException` from
 * `src/types/screen-dto.ts`, carrying these three terms beside the requester and the pending status
 * the handler supplies.
 *
 * SCR-07's grant flow fixes all three: a reason a second approver can read, an expiry that makes the
 * exception time-boxed, and a second persona whose approval the request needs (AAP 0.12.4).
 */
export interface PolicyExceptionDraft {
  /** Why the exception is needed, in the requester's own words. Required, and not blank. */
  reason: string;

  /** When the exception stops applying, as an ISO 8601 instant later than the demonstration clock. */
  expiresAt: Timestamp;

  /** The second persona whose approval the request needs; never the persona requesting it. */
  secondApproverId: UserId;
}

/* ---------------------------------------------------------------------------------------------
 * The reads — specification SCR-07, contracts §5, §7.2
 * ------------------------------------------------------------------------------------------- */

/**
 * Reads the sovereignty screen's payload: the deployment summary, the ten declared configuration rows
 * and the outbound ledger with its thirty-day counts.
 *
 * Every part of it is declared configuration or a count of recorded events, and no part reports a
 * state the deployment was checked for (rule P-4): the summary and the rows are the seeded record's
 * own values, and the ledger's two columns are `computeLedger`'s. The screen renders the summary and
 * each row under `Declared, not verified` and the ledger under `Simulated calculation`, both read from
 * `SIM_LABELS` by the components that print them (rule P-1).
 *
 * @param ctx - The call's context: the persona the permission is evaluated for, the record set and the chain.
 * @returns The summary, the ten rows in the record's order, and the counted ledger.
 * @throws Problem - A `'permission'` failure when the payload is not readable by the acting role, or while the forbidden trigger is on.
 */
export async function getSovereignty(ctx: HandlerContext): Promise<SovereigntyStatus> {
  requirePermission(ctx, SOVEREIGNTY_READ, 'declared deployment configuration');

  return sovereigntyStatusOf(ctx);
}

/**
 * Reads the outbound ledger on its own: one row per declared endpoint, with its purpose, its declared
 * state, its last attempt and its allowed and blocked counts over the window.
 *
 * The rows are `computeLedger`'s, so a caller refreshing the counts after a decision does not re-read
 * the declared rows beside them and both reads answer by the same rule (contracts §5). Nothing here
 * is a reachability test: a `.example` host resolves nowhere and no code path contacts one (rule B-1).
 *
 * The list parameters are the ones contracts §9 fixes: `sort` as `member:dir` over the row's own
 * members, `limit` as the page's greatest length, and `cursor` as the endpoint a previous page ended
 * at. Without a `sort` the rows keep the order the declared record states its endpoints in, which is
 * the order the sovereignty screen shows them.
 *
 * @param ctx - The call's context: the chain the counts are taken from and the record declaring the endpoints.
 * @param query - The ordering and page position the read carries.
 * @returns Fresh ledger rows, one page of them in the requested order.
 * @throws Problem - A `'permission'` failure when the ledger is not readable by the acting role or while the forbidden trigger is on, and a `'validation'` failure when the cursor names no endpoint of the ordered rows.
 */
export async function getOutboundLedger(
  ctx: HandlerContext,
  query: ListQuery,
): Promise<LedgerRow[]> {
  requirePermission(ctx, SOVEREIGNTY_READ, 'outbound ledger');

  const rows = ledgerOf(ctx);
  const order = sortOrderOf(isLedgerSortField, query.sort);
  const ordered =
    order === null ? rows : [...rows].sort((left, right) => compareLedgerRows(left, right, order));
  const start = startIndexFor(ordered, query.cursor, (row) => row.endpoint, ctx, 'ledger');
  const limit = limitOf(query.limit);

  return limit === null ? ordered.slice(start) : ordered.slice(start, start + limit);
}

/**
 * Reads the policy list: every policy the engine evaluates and the one the deployment only declares.
 *
 * The order is the record set's unless `query.sort` names another, which is the order the policy list
 * shows, and each entry carries its own statement, its evaluated flag and the decisions the engine
 * recorded for it. POL-009 comes back with the rest and is never evaluated, hidden or paraphrased: it
 * is declared configuration, and the screen prints it under `Declared, not verified` (rule P-4).
 *
 * The list parameters are the ones contracts §9 fixes: `sort` as `member:dir` over the entry's own
 * members, `limit` as the page's greatest length, and `cursor` as the identifier a previous page
 * ended at.
 *
 * @param ctx - The call's context: the persona the permission is evaluated for and the records read.
 * @param query - The ordering and page position the read carries.
 * @returns One page of entries in the requested order.
 * @throws Problem - A `'permission'` failure when the policy set is not readable by the acting role or while the forbidden trigger is on, and a `'validation'` failure when the cursor names no policy of the ordered entries.
 */
export async function listPolicies(
  ctx: HandlerContext,
  query: ListQuery,
): Promise<PolicyDetail[]> {
  requirePermission(ctx, POLICY_READ, 'policy set');

  const entries = ctx.state.records.policies.map((policy) => policyDetailOf(ctx, policy));
  const order = sortOrderOf(isPolicySortField, query.sort);
  const ordered =
    order === null
      ? entries
      : [...entries].sort((left, right) => comparePolicyEntries(left, right, order));
  const start = startIndexFor(ordered, query.cursor, (entry) => entry.id, ctx, 'policy');
  const limit = limitOf(query.limit);

  return limit === null ? ordered.slice(start) : ordered.slice(start, start + limit);
}

/**
 * Reads one policy: its display statement, whether the engine evaluates it, and the decisions it
 * made, most recent first.
 *
 * The statement is the record's own wording rather than a sentence composed by a screen (rule P-6),
 * so the rule a denial cites and the rule this screen shows cannot drift apart. A policy the record
 * set does not hold is a `'not-found'` failure naming the identifiers it does hold, which is what a
 * reader following a stale reference needs.
 *
 * @param ctx - The call's context: the persona the permission is evaluated for and the records read.
 * @param policyId - The policy to read.
 * @returns The policy's display detail.
 * @throws Problem - A `'permission'` failure when the policy is not readable by the acting role or while the forbidden trigger is on, and a `'not-found'` failure for an identifier that answers no record.
 */
export async function getPolicy(ctx: HandlerContext, policyId: PolicyId): Promise<PolicyDetail> {
  requirePermission(ctx, POLICY_READ, 'policy detail');

  return policyDetailOf(ctx, findPolicy(ctx, policyId));
}

/* ---------------------------------------------------------------------------------------------
 * The one write — specification SCR-07, contracts §7.2 and §6
 * ------------------------------------------------------------------------------------------- */

/**
 * The instant an ISO 8601 value names, in epoch milliseconds, or `null` when it names none.
 *
 * The value is compared against the constant demonstration clock rather than the current time, so the
 * same draft is accepted or refused identically in every run (AAP 0.2.1). A value this platform
 * cannot place — an empty string, a phrase, a date that does not exist — answers `null` rather than a
 * guess, which is what turns it into a validation failure naming the field.
 *
 * @param value - The value a draft carries as an expiration.
 * @returns The instant in epoch milliseconds, or `null` when the value is not one.
 */
function instantOf(value: Timestamp): number | null {
  const instant = Date.parse(value);

  return Number.isFinite(instant) ? instant : null;
}

/**
 * Requests a time-boxed exception against a policy and records the request as pending.
 *
 * The three terms SCR-07's grant flow requires are checked before anything is written, and a request
 * missing one of them is refused with a `'validation'` failure naming the field at fault, so a reader
 * learns what to correct rather than that the call failed: a reason a second approver can read, an
 * expiry later than the demonstration clock, and a second persona distinct from the requester and
 * present in the record set. The requester is the acting persona, never a caller's claim.
 *
 * WHAT THE REQUEST DOES NOT DO, stated because it is the point. It grants nothing and decides
 * nothing: the record enters the session as `status: 'pending'`, no policy verdict consults it, no
 * permission is derived from it, and the engine continues to evaluate the policy records and the
 * acting persona alone. Nothing in the demonstration decides a request, so pending is the state the
 * flow leaves behind (AAP 0.12.4, rule P-4: the panel shows declared configuration and claims no
 * grant). The write appends exactly one event through the single append path of `./audit.ts`, so the
 * request reaches the trail once and its hash, sequence and identifier are the chain module's.
 *
 * @param ctx - The call's context: the persona requesting the exception, the records read and the session written.
 * @param policyId - The policy the exception is requested against.
 * @param draft - The reason, the expiry and the second approver the flow requires.
 * @returns The pending request, as the session now holds it.
 * @throws Problem - A `'permission'` failure when the acting role may not request one or while the forbidden trigger is on, a `'not-found'` failure for an identifier that answers no record, and a `'validation'` failure naming the term a draft does not satisfy.
 */
export async function requestPolicyException(
  ctx: HandlerContext,
  policyId: PolicyId,
  draft: PolicyExceptionDraft,
): Promise<PolicyException> {
  requirePermission(ctx, POLICY_EXCEPTION_REQUEST, 'time-boxed policy exception');

  const policy = findPolicy(ctx, policyId);
  const reason = draft.reason.trim();

  if (reason === '') {
    throw validationProblem(
      ctx,
      'A policy exception request states why it is needed, and draft.reason is blank: ' +
        'the second approver has nothing to read without it.',
    );
  }

  const expiry = instantOf(draft.expiresAt);

  if (expiry === null) {
    throw validationProblem(
      ctx,
      'A policy exception request states when it stops applying as an ISO 8601 instant, and ' +
        `draft.expiresAt ("${draft.expiresAt}") is not one.`,
    );
  }

  if (expiry <= DEMO_CLOCK_INSTANT) {
    throw validationProblem(
      ctx,
      'A policy exception request expires after the demonstration clock, and ' +
        `draft.expiresAt ("${draft.expiresAt}") does not: the exception is time-boxed from the ` +
        'instant the request is recorded.',
    );
  }

  const secondApproverId = draft.secondApproverId.trim();

  if (secondApproverId === '') {
    throw validationProblem(
      ctx,
      'A policy exception request names the second persona whose approval it needs, and ' +
        'draft.secondApproverId is blank.',
    );
  }

  if (secondApproverId === ctx.actor.id) {
    throw validationProblem(
      ctx,
      'A policy exception request names a second approver other than the persona requesting it, ' +
        `and draft.secondApproverId names the acting persona (${ctx.actor.id}).`,
    );
  }

  if (!ctx.state.records.users.some((user) => user.id === secondApproverId)) {
    const personas = ctx.state.records.users.map((user) => user.id).join(', ');

    throw validationProblem(
      ctx,
      'A policy exception request names a second approver the record set holds, and ' +
        `draft.secondApproverId ("${secondApproverId}") answers no persona; the personas are ` +
        `${personas}.`,
    );
  }

  const exception: PolicyException = {
    policyId: policy.id,
    reason,
    expiresAt: draft.expiresAt,
    requestedBy: ctx.actor.id,
    secondApproverId,
    status: PENDING,
  };

  ctx.state.policyExceptions.push(exception);

  await appendAuditEvent(ctx, {
    action: POLICY_EXCEPTION_REQUESTED,
    objectRef: policy.id,
    result: 'succeeded',
    before: null,
    after: {
      policyId: exception.policyId,
      reason: exception.reason,
      expiresAt: exception.expiresAt,
      requestedBy: exception.requestedBy,
      secondApproverId: exception.secondApproverId,
      status: exception.status,
    },
  });

  return { ...exception };
}

/* ---------------------------------------------------------------------------------------------
 * The source catalogue — platform-seed-data.md §7, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * Reads the six modelled data sources with their display names, their states and their as-of
 * instants, in the order the freshness strip renders them.
 *
 * A source is a record and never a connection: the payload carries no host, port, credential or
 * polling setting, because no connector exists anywhere in this demonstration (rule B-1, rule B-2).
 * The states come from `freshnessFor`, which reports the seeded health with whatever trigger the
 * simulation popover set, so the catalogue and the freshness of every other result's `meta`
 * describe one state rather than two — with no trigger in effect it is the seeded catalogue record
 * for record. Each label is `SOURCE_LABELS`' entry for its own source key, so a record cannot print a
 * name that contradicts its key.
 *
 * No acting persona is refused this read, and that is the decision rather than an omission. The six
 * sources' state and as-of instants already reach every persona in the `meta` of every result the port
 * returns, so there is nothing here for a role check to withhold, while the shell's freshness strip
 * renders these records in the top bar on every route for every persona (AAP §0.2.1, T-13). The
 * forbidden trigger still refuses it, so the demonstration's refusal state is reported by the strip
 * instead of being papered over with pills that would read as current.
 *
 * The six are the only stage S5-family records whose subject is declared configuration; the plan grid
 * and the exit package belong to the stage that shows them and this module invents no record set for
 * either.
 *
 * @param ctx - The call's context: the state whose triggers and freshness are read, and the persona
 *   the refusal is reported for.
 * @returns The six source records, labelled, in the specification's order.
 * @throws Problem - A `'permission'` failure while the demonstration's forbidden trigger is on.
 */
export async function getSourceCatalogue(ctx: HandlerContext): Promise<SourceCatalogue> {
  requireCatalogueReadable(ctx);

  return {
    health: freshnessFor(ctx.state).map((freshness) => ({
      source: freshness.source,
      label: SOURCE_LABELS[freshness.source],
      state: freshness.state,
      asOf: freshness.asOf,
    })),
  };
}

