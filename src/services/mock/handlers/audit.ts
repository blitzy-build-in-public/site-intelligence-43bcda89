/**
 * The audit family of the in-browser mock adapter: the one append path every audited write reaches,
 * the filterable read of the trail, the detail read behind the drawer, and the verification report.
 *
 * Implements the "Handlers" row of AAP 0.12.1 — one handler module per read/write family, of which
 * this is the audit family — at the path AAP 0.13.1 gives `handlers/`, over the mechanism AAP 0.8
 * sets out for `platform-contracts.md` §6: an event carries its predecessors's `eventHash` as its own
 * `previousHash` (the genesis value for the first event), a payload hash over the canonical
 * `{ before, after }`, an event hash over the concatenated identity string, and a verification
 * recomputes every hash in sequence and reports each position where the record and the arithmetic
 * disagree. The three other handlers that record activity — exceptions, scenarios, approvals — and
 * the governance, evidence, assistant, topology and atlas families all append through
 * `appendAuditEvent` below, which is why it is the first module of the folder and why its signature
 * is stable.
 *
 * WHY THE FOLDER'S SHARED PAGE BOUND IS DECLARED HERE. AAP 0.12.1 fixes this folder at nine modules,
 * one per read/write family, so a rule every list family applies has no module of its own to sit in: it
 * belongs in one the others already import. This is that module — the append path below is why every
 * writing family imports it, and its own list read is the trail — so `listLimitOf` and the two page
 * constants beside it stand here and are called by exceptions, approvals, governance and evidence.
 * That is what makes contracts §9's `limit` mean one thing across the families: one default page, one
 * ceiling, and one refusal for a parameter that bounds no page at all. The same reason puts
 * `requireNoConflict` below beside them: the conflict trigger's write half is one refusal every write
 * this build's screens make on an existing record meets, so it stands where the family that happened to
 * hold it first is not the only one that can reach it, and no family can refuse one such write against a
 * moved record while accepting another.
 *
 * WHAT THIS MODULE OWNS, AND WHAT IT DELIBERATELY LEAVES ALONE. It owns the event's *content*: the
 * instant it was recorded, the actor, the correlation identifier, and the payload halves a caller
 * supplies. It owns no hash — `src/domain/audit/chain.ts` derives the sequence number, the
 * `AUD-nnnnnn` identifier, both digests and the link, from the chain it is handed, and this module
 * never computes, verifies or caches one. It owns no policy and no permission *rule* — the matrix
 * lives in `src/domain/policy/permissions.ts` and a denial or a policy block is decided before a
 * caller asks for an append. It owns no state of its own: everything below reads and writes the
 * `MockState` the adapter holds (rule P-2).
 *
 * THE CLOCK, RECONCILED HERE BECAUSE THE INPUTS FIX BOTH HALVES AND NEITHER RESOLVES THEM. contracts
 * §1 fixes one constant demonstration clock, `DEMO_CLOCK`, so no business logic reads the system
 * clock; contracts §3 requires the chain's timestamps to be strictly increasing. A constant instant
 * for every appended event would satisfy the first and break the second. The reconciliation, and the
 * whole of the derivation below: the base is the constant, the first event the session appends is
 * stamped at it, and each later append advances it by one whole second per event the chain has gained
 * beyond the seeded trail. Every instant is computed from that constant string and from the chain's
 * own length — never by reading the current time, never from a random or module-mutable value — so
 * the same sequence of appends yields the same instants in every run (AAP 0.18.2). A chain shorter than
 * the seeded trail, which only a test builds, advances by its own length instead, so successive appends
 * still differ; the demonstration ships the seeded trail, so that branch is a guard rather than a path
 * a session takes.
 *
 * THE CORRELATION IDENTIFIER, DERIVED BECAUSE NO INPUT FIXES ITS PATTERN. contracts §1 fixes an
 * identifier pattern for every record it names and none for `traceId`, so `traceIdFor` derives one from
 * three segments: the demonstration day, read from the constant clock; the session's nonce, drawn once
 * by `../mock-state.ts` when the session was built; and the ticket the adapter took for the call,
 * written once at the call's entry before it awaits anything. Spelling the identifier from that number
 * rather than from the counter as it stands is what makes every event, result and failure of one call
 * quote the same value while the session's other calls are in flight, and the nonce is what makes a
 * quoted identifier resolve to one call rather than to whichever call happens to share its ordinal in
 * another session — the counter restarts with every session and every reset, the nonce does not
 * (AAP 0.18.1). The seeded trail occupies the six-digit `TRC-nnnnnn` block and its authored events the
 * `TRC-9nnnnn` block, so a live call's identifier carries the day and the nonce in front of the ticket
 * and cannot be mistaken for a seeded one. Nothing but the identifier reads the nonce: the ticket alone
 * still fixes the call's number and its place on the latency ladder (AAP 0.18.2).
 *
 * WHAT A VERIFICATION SHOWS, AND WHAT IT DOES NOT. `verifyAuditChain` returns `verifyChain`'s report
 * unchanged: how many events were recomputed, every break as a `{ sequence, id }` pair, and how long
 * the walk took. The mechanism it demonstrates is that an edited record no longer matches the hash
 * computed from the fields beside it. It establishes nothing about a store behind a browser page, it
 * prevents neither editing nor copying, and it repairs nothing — no event is re-hashed, re-sequenced
 * or dropped, here or anywhere else in this module. The interface labels the chain `Simulated
 * control` from the fixed vocabulary of specification §5.3 wherever it surfaces (rules P-1 and P-4),
 * and the simulation popover's tamper control that produces a break is `../simulation.ts`'s work; this
 * module neither inspects nor corrects what that control wrote.
 *
 * Rules this module is built to satisfy:
 * - B-1: every byte it returns comes from the state it is handed. It opens no request, no socket and
 *   no asset, and it names no address of its own.
 * - B-2: it reads no configuration and carries no credential; the digests it returns come from the
 *   platform's own Web Crypto through the domain chain module.
 * - P-1: it types no simulation label. Where the chain surfaces, the interface applies the fixed
 *   string from `src/types/primitives.ts`.
 * - P-2: it reaches records only through the `HandlerContext` the adapter builds, imports the sibling
 *   `../seed-loader.ts` rather than `src/seed/`, and imports no React, no screen and no API client, so
 *   it cannot become a second data boundary.
 * - P-3, P-4: the permission checks below are a demonstration control and are not production
 *   authorisation, and no wording here claims more for the chain than a recomputation shows.
 * - P-6: it states no figure, amount or record identifier of its own beyond the identifier pattern
 *   contracts §1 fixes, and it imports nothing from `tests/fixtures/`.
 * - P-7: the wording is Site Intelligence's own and names no company, product or person; the
 *   identifiers quoted in comments are the synthetic patterns of contracts §1.
 */

import { appendEvent } from '../../../domain/audit/chain';
import { verifyChain } from '../../../domain/audit/verify';
import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import { DEMO_CLOCK, FREE_TEXT_MAX_LENGTH } from '../../../types';
import type {
  AuditAction,
  AuditActorType,
  AuditEvent,
  AuditEventDraft,
  AuditEventId,
  AuditPayload,
  AuditQuery,
  AuditResult,
  ChainReport,
  Permission,
  PolicyId,
  Problem,
  Timestamp,
} from '../../../types';
import { runExclusive } from '../mock-state';
import type { HandlerContext, MockState } from '../mock-state';
import { SEEDED_EVENT_COUNT } from '../seed-loader';
import { demonstrationForbiddenReason, isSimulationOn } from '../simulation';

/* ---------------------------------------------------------------------------------------------
 * The draft a caller supplies — AAP 0.12.1, contracts §6
 * ------------------------------------------------------------------------------------------- */

/**
 * What a caller hands `appendAuditEvent`: the event's content, without the identity the chain derives.
 *
 * Declared here rather than in `src/types` because `src/types` has no shape for it and inventing one
 * there would put a handler's calling convention in the shared vocabulary: `AuditEventDraft` in
 * `src/types/audit.ts` is the chain module's input and carries the instant, the actor and the trace
 * the chain knows nothing about, while this interface is what one handler asks another's family for.
 * The same arrangement is used for `PolicyExceptionDraft` in `./governance.ts`.
 *
 * Every member is a term of the record an append produces: what was done (`action`), to which record
 * (`objectRef`), with what outcome (`result`), by which policy where a policy decided it, and the two
 * payload halves the payload hash covers. `actorType` and `actorId` are optional so a persona's own
 * action needs neither, while a policy block passes `'policy'` with the acting persona's identifier.
 */
export interface AuditWriteDraft {
  /** What the event records, spelled as the appending handler spells it. */
  action: AuditAction;

  /** The identifier of the record the event is about, which a reader follows to the entity. */
  objectRef: string;

  /** The outcome the event records. */
  result: AuditResult;

  /** The policy that decided the outcome, present only on an event a policy produced. */
  policyId?: PolicyId;

  /** The affected record's values before the action, or `null` when the action created the record. */
  before?: AuditPayload | null;

  /** The affected record's values after the action, or `null` when the action removed the record. */
  after?: AuditPayload | null;

  /** Which kind of actor appended the event; the acting persona when absent. */
  actorType?: AuditActorType;

  /** The acting persona, or the policy identifier on a policy-actor event; the session's persona when absent. */
  actorId?: string;
}

/* ---------------------------------------------------------------------------------------------
 * The demonstration clock and the instant an append takes — contracts §1 and §3
 * ------------------------------------------------------------------------------------------- */

/** Milliseconds in a second, the unit the append advance is counted in. */
const MILLISECONDS_PER_SECOND = 1000;

/**
 * The offset the demonstration clock carries, in milliseconds.
 *
 * `DEMO_CLOCK` states it as `+01:00`, which is Europe/Berlin's offset on the December instant
 * contracts §1 fixes, and every appended instant stays within seconds of that instant — so the offset
 * never shifts under a session, and the value is stated once here rather than recomputed per call.
 */
const CLOCK_OFFSET_MS = 3_600_000;

/** The same offset as ISO 8601 spells it, kept character for character from `DEMO_CLOCK`. */
const CLOCK_OFFSET_SUFFIX = '+01:00';

/** Digits in the year of a formatted instant. */
const YEAR_DIGITS = 4;

/** Digits in the month, day, hour, minute and second of a formatted instant. */
const TWO_DIGIT_WIDTH = 2;

/**
 * The base instant every appended event advances from, in epoch milliseconds.
 *
 * Read once from the constant string, so the derivation below depends on `DEMO_CLOCK` alone and reads
 * no clock: the argument is the constant, not the current time.
 */
const DEMO_CLOCK_INSTANT_MS = Date.parse(DEMO_CLOCK);

/** Formats a count of two or fewer digits with a leading zero, as ISO 8601 writes it. */
function twoDigits(value: number): string {
  return String(value).padStart(TWO_DIGIT_WIDTH, '0');
}

/**
 * The instant `advanceSeconds` seconds after the demonstration clock, in the clock's own offset.
 *
 * The epoch value is the constant's plus the whole-second advance; the field readings are the UTC
 * ones taken after the offset is added back, so the wall-clock reading is Berlin's and the suffix the
 * formatted string carries is the offset it was read at. Nothing here consults the current time: a
 * rollover past midnight moves the date rather than the offset, which is why the arithmetic is done on
 * the constant's instant instead of on its digits.
 *
 * @param advanceSeconds - Whole seconds to advance from the demonstration clock; zero is the clock itself.
 * @returns The instant as ISO 8601 with the demonstration clock's offset.
 */
function instantAfterSeconds(advanceSeconds: number): Timestamp {
  const wallClock = new Date(
    DEMO_CLOCK_INSTANT_MS + advanceSeconds * MILLISECONDS_PER_SECOND + CLOCK_OFFSET_MS,
  );

  const year = String(wallClock.getUTCFullYear()).padStart(YEAR_DIGITS, '0');
  const month = twoDigits(wallClock.getUTCMonth() + 1);
  const day = twoDigits(wallClock.getUTCDate());
  const hours = twoDigits(wallClock.getUTCHours());
  const minutes = twoDigits(wallClock.getUTCMinutes());
  const seconds = twoDigits(wallClock.getUTCSeconds());

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${CLOCK_OFFSET_SUFFIX}`;
}

/**
 * Whole seconds the next append advances beyond the demonstration clock.
 *
 * The rule contracts §3 needs: the seeded trail is stamped at instants before the demonstration clock,
 * so the first event a session appends is stamped at the clock and every later one a second after the
 * one before it. A chain shorter than the seeded trail cannot be produced by a session, and for it the
 * advance counts the chain's own length, so two successive appends still take two instants rather than
 * one — a guard, not a path the demonstration takes.
 *
 * @param state - The session whose chain length is read. The state is not modified.
 * @returns The advance in whole seconds.
 */
function appendAdvanceSeconds(state: MockState): number {
  const beyondSeeded = state.auditEvents.length - SEEDED_EVENT_COUNT;

  return beyondSeeded >= 0 ? beyondSeeded : state.auditEvents.length;
}

/* ---------------------------------------------------------------------------------------------
 * The correlation identifier — AAP 0.12.1, contracts §1
 * ------------------------------------------------------------------------------------------- */

/** The prefix a trace identifier carries, matching the seeded trail's own form. */
const TRACE_PREFIX = 'TRC-';

/** Digits in the counter a trace identifier carries. */
const TRACE_COUNTER_DIGITS = 6;

/** Characters in the calendar day an ISO 8601 instant states, `YYYY-MM-DD`. */
const DAY_TOKEN_WIDTH = 10;

/**
 * The correlation identifier of one call, spelled from the session it belongs to and the ticket the
 * call was given.
 *
 * contracts §1 fixes no pattern for a trace identifier while fixing one for every record it names, so
 * the form is derived here: the demonstration day from the constant clock, the session's nonce, then the
 * ticket zero-padded, as three hyphen-separated segments. The ticket is the number the adapter writes
 * once, at the call's entry, before it awaits anything — it is not read from the session's counter here,
 * because that counter moves under a call that is in flight and two calls served together would then be
 * spelled with one value. The nonce is the segment that makes the identifier a reader quotes lead back
 * to exactly one call, which is the whole of this application's observability (AAP 0.18.1): the ticket
 * alone repeats, because the counter restarts with every session and with every reset, so two sessions
 * reaching the same call ordinal would print one identifier for two different calls. The seeded blocks
 * are untouched by it: `TRC-nnnnnn` and `TRC-9nnnnn` hold neither a day token nor a nonce.
 *
 * @param sessionNonce - The segment the session was given when it was built, held on `MockState`.
 * @param ticket - The call's own number, taken from the session's counter by the adapter.
 * @returns The identifier, for the event an append records and the `Problem` a refusal throws.
 */
export function traceIdFor(sessionNonce: string, ticket: number): string {
  const dayToken = DEMO_CLOCK.slice(0, DAY_TOKEN_WIDTH).replaceAll('-', '');

  return (
    `${TRACE_PREFIX}${dayToken}-${sessionNonce}-` +
    String(ticket).padStart(TRACE_COUNTER_DIGITS, '0')
  );
}

/* ---------------------------------------------------------------------------------------------
 * Who may read the trail — contracts §7.1, rules P-3 and P-8
 * ------------------------------------------------------------------------------------------- */

/** The permission every read of the audit family requires. */
const AUDIT_READ: Permission = 'audit.read';

/** The actor a draft describes when it names none: the persona the session acts as. */
const DEFAULT_ACTOR_TYPE: AuditActorType = 'user';

/**
 * The refusal a read of this family throws: the cause, the reason in plain words, the trace and the
 * evidence a forbidden card or a disabled control needs to say who may act (rule P-8).
 *
 * The checks behind it run in the browser of a build with no backend and no session, so they are a
 * demonstration control rather than production authorisation (rule P-3); the adapter evaluates them
 * itself regardless of what a screen offered, so a bypassed control grants nothing.
 *
 * @param ctx - The call's context, whose trace the failure carries and whose persona the reason names.
 * @param message - The reason, in the plain words the caller supplies.
 * @returns The `Problem` to throw.
 */
function auditReadProblem(ctx: HandlerContext, message: string): Problem {
  return {
    type: 'permission',
    message,
    traceId: ctx.traceId,
    requiredPermission: AUDIT_READ,
    rolesWithPermission: rolesWith(AUDIT_READ),
  };
}

/**
 * Refuses the call unless the acting persona may read the audit trail.
 *
 * Two ways to be refused, both reported as the same `Problem` shape so a screen's forbidden card reads
 * one way: the demonstration's forbidden trigger is in effect, which refuses every read of this family
 * while it is set, or the persona's role does not hold `audit.read`. The trigger is checked first
 * because it stands for a session-wide refusal rather than for a fact about the role.
 *
 * The chain is not plant-scoped — a persona either holds `audit.read` or does not — so the permission
 * is evaluated with no subject.
 *
 * @param ctx - The call's context: the persona the check is made for and the state its triggers are read from.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function requireAuditRead(ctx: HandlerContext): void {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    throw auditReadProblem(
      ctx,
      demonstrationForbiddenReason(ctx.actor.role, AUDIT_READ),
    );
  }

  if (!hasPermission(ctx.actor.role, AUDIT_READ, null, ctx.actor)) {
    throw auditReadProblem(
      ctx,
      `The acting role (${ctx.actor.role}) does not hold the ${AUDIT_READ} permission, so the audit trail is not readable here.`,
    );
  }
}

/**
 * The refusal a request the records cannot honour throws, for a draft that cannot name what it
 * records, for a page position this chain does not hold, and for a free-text field too long to store.
 *
 * @param ctx - The call's context, whose trace the failure carries.
 * @param message - The reason, in the plain words the caller supplies.
 * @returns The `Problem` to throw.
 */
function validationProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'validation', message, traceId: ctx.traceId };
}

/* ---------------------------------------------------------------------------------------------
 * The one conflict guard every write this build's screens make on an existing record applies
 * — AAP 0.12.1, AAP 0.12.4 SCR-05
 * ------------------------------------------------------------------------------------------- */

/**
 * Refuses a write whose record moved under the reader — AAP 0.12.1, AAP 0.12.4 SCR-05.
 *
 * The conflicting-update trigger has two halves, and this is the write half. The adapter's dispatcher
 * refuses the reads whose payload is a collection, because a set presented as current is what a reader
 * would otherwise take as the state of the world; a read of one record is served, so the act that record
 * carries can be attempted, and the refusal that attempt meets belongs to the family owning the record
 * rather than to the dispatcher (AAP 0.12.4 SCR-05, `../mock-backend.ts`'s `dispatchRead`). One
 * predicate answers for every write this build's screens make against an existing record — the
 * approvals family's decision, write-back retry and outcome review, the exceptions family's assign,
 * note and dismiss — because a demonstration that refused one such write made against a record that
 * changed while accepting another would be reporting two states under one label (AAP 0.2.1 F10). The
 * evidence family's pin and element reviews also update an existing record and do not call it: carried
 * for interface conformance with the evidence stage, they are reached by no route or screen of this
 * build, whose routes render the stage notice.
 *
 * `ProblemType` fixes five causes and none of them is a conflict, so the refusal is reported as
 * `'validation'` — a request that cannot be honoured against the records as they stand — exactly as the
 * dispatcher reports the set it refuses (AAP 0.12.3). The sentence opens with the one clause below and
 * closes with the caller's own message, which names the record and what has happened to it: a caller
 * derives the identifier and the status from the record it holds rather than typing them, so the
 * refusal cannot disagree with the record it describes (rule P-6).
 *
 * A demonstration control and not production authorisation (rule P-3): the trigger stands for a record
 * another persona changed between the read and the write, and the check is a member of the session's
 * trigger set rather than a concurrency mechanism behind the data.
 *
 * It writes nothing. A refused write appends no event and no history record, so the record it addresses
 * and the trail stand exactly as they stood, and lifting the trigger lets the same write succeed
 * unchanged (AAP 0.6.2, rule P-8).
 *
 * @param ctx - The call's context, whose triggers are read and whose trace the refusal carries.
 * @param message - The reason in plain words, naming the record and what has happened to it.
 * @throws Problem - A `'validation'` failure carrying that reason while the trigger is in effect.
 */
export function requireNoConflict(ctx: HandlerContext, message: string): void {
  if (!isSimulationOn(ctx.state, 'conflict')) {
    return;
  }

  throw validationProblem(
    ctx,
    `This record changed since it was read, and the change is refused rather than merged. ${message}`,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The two bounds every handler family shares: the page a list read returns and the free text an
 * audited write stores — contracts §9, contracts §6
 * ------------------------------------------------------------------------------------------- */

/**
 * The page a list read returns when the caller names no limit — contracts §9.
 *
 * contracts §9 leaves `limit` optional on every list path, so a read that carries none needs an answer
 * that is neither the whole collection nor nothing at all. The largest collection a demonstration read
 * serves whole is the audit trail: the 200 seeded events plus the events a session appends, which the
 * adapter's own suite follows to 201 after one audited write and to 203 after three. A default page
 * therefore holds that collection, so no read the interface already makes loses a record to this bound,
 * while every response a caller can ask for is bounded.
 *
 * A page bound is a request parameter and never a figure the interface shows, so rule P-6 — which
 * governs the numbers a screen prints — fixes no value here. The value is the folder's own declaration
 * and it is stated once, for the reason this module's header gives: the nine family modules AAP 0.12.1
 * fixes leave no shared helper module to hold it.
 */
export const LIST_PAGE_DEFAULT = 250;

/**
 * The greatest page a list read returns, whatever the caller asks for — contracts §9.
 *
 * Twice the default page, so a caller may ask for more than one page of the trail or of the queue and
 * never for the whole of a collection that grows without bound: `state.auditEvents`,
 * `records.approvals`, `records.exceptionHistory` and `state.policyExceptions` all grow with every
 * audited write and are reset only by `restoreSeed`. The ceiling is what keeps one request from
 * demanding a whole growing collection in one response, whichever family it was addressed to.
 */
export const LIST_PAGE_MAX = 500;

/**
 * The number of records one list read returns, from the `limit` the query carried — contracts §9.
 *
 * One rule for every list family, so the parameter means the same thing in the queue, the inbox, the
 * trail, the ledger, the policy set, the pins and the packages:
 *
 * - absent, it answers `LIST_PAGE_DEFAULT`, so no caller has to name a page to be given a bounded one;
 * - above `LIST_PAGE_MAX`, it answers `LIST_PAGE_MAX`, so the ceiling holds whatever was asked for;
 * - present and not a positive whole number, it is refused as a `'validation'` failure naming the
 *   family, the value and the rule, rather than read as either end of the contract. A limit of zero is
 *   a request for no records, a negative one for fewer than none, and a fraction for part of a record;
 *   none of the three is a page the record set can honour, and answering one of them with every record
 *   — as the other families did — or with none, as this one's own read did, left one contracts §9
 *   parameter meaning two things in one folder.
 *
 * `!Number.isInteger` is what refuses `NaN` and both infinities as well as a fraction: each of them is
 * a number a JSON body can carry, and none of them bounds a page.
 *
 * @param ctx - The call's context, whose trace a refusal carries.
 * @param limit - The `limit` the query carried, or `undefined` when it carried none.
 * @param family - How the read is named in the refusal, such as `inbox`.
 * @returns The page's greatest length, at least one and at most `LIST_PAGE_MAX`.
 * @throws Problem - A `'validation'` failure when the limit bounds no page.
 */
export function listLimitOf(
  ctx: HandlerContext,
  limit: number | undefined,
  family: string,
): number {
  if (limit === undefined) {
    return LIST_PAGE_DEFAULT;
  }

  if (!Number.isInteger(limit) || limit <= 0) {
    throw validationProblem(
      ctx,
      `The ${family} limit ${limit} bounds no page: a list read takes a whole number of records, at ` +
        `least one and at most ${LIST_PAGE_MAX}, or no limit at all for the default page of ` +
        `${LIST_PAGE_DEFAULT}.`,
    );
  }

  return Math.min(limit, LIST_PAGE_MAX);
}

/**
 * The greatest length of a free-text field one request may carry, re-exported here for the families
 * that bound their prose through {@link assertFreeTextLength} beside it — contracts §6, §9.
 *
 * The value is declared once in `src/types/primitives.ts`, because the assistant's composer puts the
 * same ceiling on its question field while a screen reaches this folder only through the port (rule
 * P-2): one declaration is what keeps a field from accepting text the adapter refuses, or refusing
 * what it accepts. What the ceiling guards is what the writes that store prose leave behind — an
 * exception's history, a policy exception's pending list, a package element's own value — beside the
 * `after` half of the audit event each write appends, so every later read of those records and of the
 * trail filters and scans the paragraph a caller submitted.
 */
export { FREE_TEXT_MAX_LENGTH };

/**
 * What a field refused for its length would otherwise have reached, stated once for the writes that
 * store their text: the history and the trail every later read of the session filters and scans.
 *
 * It is the default consequence of {@link assertFreeTextLength}, so the writes that keep their prose
 * answer with one sentence while the one caller whose text no record holds can state what is true of
 * its own request instead of borrowing a consequence that does not apply to it.
 */
const STORED_REFUSAL_CONSEQUENCE =
  'stored in the history and the audit trail those reads later scan';

/**
 * Refuses free text longer than `FREE_TEXT_MAX_LENGTH`, and answers normally otherwise.
 *
 * Every audited write that bounds prose calls this beside its own emptiness refusal, so the folder
 * bounds the input in one place rather than in each family. The value a caller passes is the trimmed
 * string the write is about to store — or, where the field no record keeps, the trimmed string the
 * request is about to read — because that is the string the call carries; an empty one is the
 * caller's own refusal to report, and one within the ceiling is nothing this function has to say.
 *
 * The message names the field, the ceiling and the length actually submitted, so a caller learns what
 * was refused and by how much rather than that the call failed. `field` is the phrase the sentence
 * opens with, such as `a note against EXC-2026-1184`, and it is capitalised here so every caller
 * passes plain words and every refusal reads as one sentence.
 *
 * The sentence closes with what the refusal spared, and that half is the caller's wherever its field
 * is not stored: `consequence` defaults to the storage every audited write avoids, and a caller whose
 * text no record keeps names what its own request would otherwise have done. The clause is a phrase
 * the sentence completes with `rather than`, so the shape of the refusal is the same everywhere.
 *
 * @param ctx - The call's context, whose trace the refusal carries.
 * @param field - How the refused field is named, such as `a decision comment`.
 * @param text - The trimmed text the write would store, or the text the request would read.
 * @param consequence - What the refusal spared, as a phrase the sentence completes with `rather
 *   than`: by default, the storage in the history and the trail every later read scans.
 * @throws Problem - A `'validation'` failure when the text is longer than `FREE_TEXT_MAX_LENGTH`.
 */
export function assertFreeTextLength(
  ctx: HandlerContext,
  field: string,
  text: string,
  consequence: string = STORED_REFUSAL_CONSEQUENCE,
): void {
  if (text.length <= FREE_TEXT_MAX_LENGTH) {
    return;
  }

  const subject = `${field.charAt(0).toUpperCase()}${field.slice(1)}`;

  throw validationProblem(
    ctx,
    `${subject} is at most ${FREE_TEXT_MAX_LENGTH} characters and this one is ${text.length}, so it ` +
      `is refused rather than ${consequence}.`,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The one append path — AAP 0.8, AAP 0.12.1, contracts §6
 * ------------------------------------------------------------------------------------------- */

/**
 * Refuses a draft that names no action or no record, before any section of the write queue is taken.
 *
 * A link that cannot say what it records is of no use to a reader, and an append cannot be taken back.
 * Both append paths below check it first, so a refusal neither waits behind a write nor holds one up,
 * and a section a caller already holds is never spent on a draft that cannot be appended.
 *
 * @param ctx - The call's context, whose trace the refusal carries.
 * @param draft - The event's content, as the caller supplied it.
 * @throws Problem - A `'validation'` failure when the draft names no action or no record.
 */
function assertAppendable(ctx: HandlerContext, draft: AuditWriteDraft): void {
  if (draft.action.trim() === '' || draft.objectRef.trim() === '') {
    throw validationProblem(
      ctx,
      'An audit event is appended with the action it records and the identifier of the record it is about; this draft names no action or no record.',
    );
  }
}

/**
 * Appends one event to the chain and returns it: the append path every audited write takes, except the
 * role switch, which shares the same body from the section it already holds.
 *
 * The two members this function decides are the instant and the correlation identifier, and it decides
 * neither from a clock or a counter it moves: the instant comes from the constant demonstration clock
 * advanced by the chain's own growth (`appendAdvanceSeconds`), and the identifier from the call's own
 * context, which the adapter minted once from the ticket it took at the call's entry. Everything else
 * is the caller's: the action, the record it is about, the outcome, the policy where one decided it,
 * the two payload halves, and the actor, which defaults to the session's persona because a persona's
 * own action is what most appends record. A policy block passes `'policy'` with the persona it refused,
 * so the refusal is recorded by the mechanism that made it and still names who asked.
 *
 * The sequence number, the `AUD-nnnnnn` identifier, the payload hash, the predecessor's hash and the
 * event hash are all derived by `appendEvent` in `src/domain/audit/chain.ts` from the chain this
 * function hands it, which is why none of them is computed, validated or cached here: one append path
 * means one arithmetic, and a second copy of it would be a second answer to what a hash is.
 *
 * The append runs as one section of the session's write queue. Deriving the instant, reading the
 * chain's length and its predecessor, awaiting the two digests and pushing the event would otherwise be
 * a read-modify-write two audited writes could interleave: issued together, they read one chain state,
 * derive one sequence from one predecessor, and push two events that claim the same position — a forked
 * chain, which AAP 0.12.2's strictly increasing sequence and predecessor link forbid. The queue is
 * taken here through `runExclusive` in `../mock-state.ts`, and the derivation itself is
 * `appendAuditEventInSection` below, so the work runs in the order it was submitted and the appends'
 * instants stay strictly increasing with their sequences. A draft that cannot be appended is refused
 * before the queue is taken, so a refusal neither waits behind a write nor holds one up.
 *
 * A caller whose own work must not be interleaved with the event it appends calls
 * `appendAuditEventInSection` directly, from inside the section it already holds. A section cannot take
 * a second one: this queue is a plain promise chain rather than a re-entrant lock, so a section that
 * awaited this function would wait on a release only its own section could give, and the session would
 * hang with every write behind it.
 *
 * The section also binds the chain it works on, once, and pushes onto that same array. The session's
 * `auditEvents` is a member a reset replaces outright, so reading it again after the digests would
 * follow whichever chain stood at that moment: an event whose predecessor lives in the old chain would
 * be pushed onto the new one, and a verification would report a break nobody caused. Binding it keeps
 * the digests and the push on one array, and the demonstration reset takes this queue for the matching
 * reason — it installs a freshly hashed chain in place of the session's, and a reset that ran beside a
 * section could replace it between the digests and the push.
 *
 * No permission is evaluated here. A caller has already authorised the action it is recording, and a
 * refusal a policy made still has to reach the record — that is the event the policy block card points
 * at. The demonstration's forbidden trigger therefore does not stop an append; it stops the reads.
 *
 * @param ctx - The call's context: the chain to append to, the persona the event defaults its actor to,
 *   and the correlation identifier the event records. The chain is extended in place.
 * @param draft - The event's content, without the identity the chain derives.
 * @returns The complete event, hashed and linked, as the state now holds it.
 * @throws Problem - A `'validation'` failure when the draft names no action or no record.
 */
export async function appendAuditEvent(
  ctx: HandlerContext,
  draft: AuditWriteDraft,
): Promise<AuditEvent> {
  assertAppendable(ctx, draft);

  return runExclusive(ctx.state, () => appendAuditEventInSection(ctx, draft));
}

/**
 * Appends one event to the chain of the critical section the caller already holds, taking no section of
 * its own.
 *
 * The invariant is the caller's to keep: it holds the session's section through `runExclusive` in
 * `../mock-state.ts`, and nothing this function awaits takes a section of its own. The two digests of
 * `appendEvent` are the whole of what it awaits and the domain chain module opens no queue, so a
 * section that keeps to the rule always releases the one it took; a section that broke it would wait on
 * a release only it could give, and every write queued behind it would wait with it.
 *
 * The member that needs this is `MockBackend.switchRole`. The event a role switch appends records the
 * identity the switch installs, so the read of the identity before it, the mutation and the append are
 * one section: taken separately, two switches issued together serialise their appends correctly and
 * still record the second one's `before` as the identity the first had already replaced, which is a
 * trail stating a transition that never happened (AAP 0.12.2, contracts §6).
 *
 * Everything the append derives — the instant, the sequence, the `AUD-nnnnnn` identifier, the two
 * hashes and the link — is `appendAuditEvent`'s derivation, because this function is the body that one
 * runs inside its section. A second derivation here would be a second answer to what a hash is.
 *
 * @param ctx - The call's context: the chain to append to, the persona the event defaults its actor to,
 *   and the correlation identifier the event records. The chain is extended in place.
 * @param draft - The event's content, without the identity the chain derives.
 * @returns The complete event, hashed and linked, as the state now holds it.
 * @throws Problem - A `'validation'` failure when the draft names no action or no record.
 */
export async function appendAuditEventInSection(
  ctx: HandlerContext,
  draft: AuditWriteDraft,
): Promise<AuditEvent> {
  assertAppendable(ctx, draft);

  // The section's chain, read once. Both digests below are computed over this array and the push has to
  // land on the same one, so it is bound here rather than read from the session again after the awaits:
  // a chain replaced in the meantime — the reset installs a freshly hashed one — would take the push
  // onto its first event with the old tail's predecessor hash, and a verification would report a break
  // nobody caused (contracts §6).
  const chain = ctx.state.auditEvents;

  const chainDraft: AuditEventDraft = {
    timestamp: instantAfterSeconds(appendAdvanceSeconds(ctx.state)),
    actorType: draft.actorType ?? DEFAULT_ACTOR_TYPE,
    actorId: draft.actorId ?? ctx.actor.id,
    action: draft.action,
    objectRef: draft.objectRef,
    result: draft.result,
    // Written conditionally because `exactOptionalPropertyTypes` distinguishes an absent `policyId`
    // from one holding `undefined`, and the event hash writes an absent policy as an empty string.
    ...(draft.policyId === undefined ? {} : { policyId: draft.policyId }),
    before: draft.before ?? null,
    after: draft.after ?? null,
    traceId: ctx.traceId,
  };

  const event = await appendEvent(chain, chainDraft);

  chain.push(event);

  return event;
}

/* ---------------------------------------------------------------------------------------------
 * Reading the trail — specification SCR-05, contracts §9 list parameters
 * ------------------------------------------------------------------------------------------- */

/**
 * The event members a caller may order the list by, spelled as `sort=field:dir` names them.
 *
 * The set is the record's own filterable and readable members; nothing here is a display concept, and
 * an unknown member falls back to the default ordering rather than failing a read a screen can
 * recover from.
 */
const SORTABLE_FIELDS = [
  'timestamp',
  'sequence',
  'id',
  'actorId',
  'action',
  'objectRef',
  'result',
] as const;

/** One member of `SORTABLE_FIELDS`. */
type AuditSortField = (typeof SORTABLE_FIELDS)[number];

/** One ordering: the member to order by and the direction to read it in. */
interface AuditSortOrder {
  /** The member ordered by. */
  readonly field: AuditSortField;

  /** Whether the order runs from the greatest value to the least. */
  readonly descending: boolean;
}

/**
 * The ordering a read uses when it names none: newest first, and the later chain position first where
 * two events share an instant.
 *
 * The audit screen lists the trail as it grew, so the most recent event — the one a reader is usually
 * asking about — stands at the top, and the chain's own order is one `sort=sequence:asc` away. Both
 * keys are compared in the same direction, so a page of equal instants still walks the chain
 * consistently. The list is a subsequence of the chain in every case: the filter drops events and the
 * ordering reads them forwards or backwards, but the returned records are never shuffled, which is why
 * the newest-first default and the service's promise of the trail's own order do not disagree —
 * `sort=sequence:asc` is exactly that order.
 */
const DEFAULT_SORT_ORDER: AuditSortOrder = { field: 'timestamp', descending: true };

/** Whether a string names a member the list may be ordered by. */
function isSortField(value: string): value is AuditSortField {
  return SORTABLE_FIELDS.some((field) => field === value);
}

/**
 * The ordering a `sort=field:dir` parameter asks for, or the default when it asks for none this list
 * can honour.
 *
 * The parameter's form is contracts §9's: the member, a colon, then `asc` or `desc`. A member the
 * record does not order by, or a direction spelled in another form, yields the default ordering rather
 * than a failure — a read that can answer is worth more than a refusal over a presentation hint.
 *
 * @param sort - The parameter as the query carried it, or `undefined` when it carried none.
 * @returns The ordering to apply.
 */
function sortOrderOf(sort: string | undefined): AuditSortOrder {
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

/**
 * The text value one sortable member holds on an event.
 *
 * `sequence` is the one numeric member and is compared separately, so every member reached here reads
 * as a string — and the timestamps share one offset, which is what makes their lexical order their
 * instant order.
 */
function sortText(event: AuditEvent, field: Exclude<AuditSortField, 'sequence'>): string {
  return event[field];
}

/**
 * Orders two events by one ordering, and by chain position where the ordered members are equal.
 *
 * @param left - One event.
 * @param right - The other.
 * @param order - The ordering to apply.
 * @returns A negative number when `left` comes first and a positive one when `right` does; the chain
 *   position breaks every tie, so no pair is unordered.
 */
function compareEvents(left: AuditEvent, right: AuditEvent, order: AuditSortOrder): number {
  const primary =
    order.field === 'sequence'
      ? left.sequence - right.sequence
      : compareText(sortText(left, order.field), sortText(right, order.field));

  if (primary !== 0) {
    return order.descending ? -primary : primary;
  }

  return order.descending ? right.sequence - left.sequence : left.sequence - right.sequence;
}

/**
 * Whether an event answers every filter the query set.
 *
 * Each filter is applied only where the query states it, and the two instant bounds are inclusive. The
 * comparison of instants as text is exact because every record in this build carries the one offset
 * contracts §1 fixes for the application.
 *
 * `AuditQuery` declares no filter for a policy identifier, so none is applied here: a reader who wants
 * the decisions of one policy filters the rows it was handed, and no second way of asking is invented
 * in the service.
 */
function admitsQuery(event: AuditEvent, query: AuditQuery): boolean {
  if (query.actorId !== undefined && event.actorId !== query.actorId) {
    return false;
  }

  if (query.action !== undefined && event.action !== query.action) {
    return false;
  }

  if (query.objectRef !== undefined && event.objectRef !== query.objectRef) {
    return false;
  }

  if (query.result !== undefined && event.result !== query.result) {
    return false;
  }

  if (query.from !== undefined && event.timestamp < query.from) {
    return false;
  }

  return query.to === undefined || event.timestamp <= query.to;
}

/**
 * The position in an ordered page from which a cursor continues.
 *
 * The cursor is opaque to a caller and holds the chain position of the last event the previous page
 * returned, so the next page starts at the event that follows it in the requested order and a page
 * boundary can neither repeat nor skip an event however the trail has grown in between. A cursor that
 * names no position of this chain — a malformed one, or one from a query the caller has since
 * changed — is refused rather than silently restarted, because a page beginning again at the top would
 * read as a truncated trail.
 *
 * @param ordered - The admitted events, already in the requested order.
 * @param cursor - The position the previous page ended at, or `undefined` for the first page.
 * @param ctx - The call's context, whose trace a refusal carries.
 * @returns The index the page starts at.
 * @throws Problem - A `'validation'` failure when the cursor names no position of the ordered page.
 */
function startIndexFor(
  ordered: readonly AuditEvent[],
  cursor: string | undefined,
  ctx: HandlerContext,
): number {
  if (cursor === undefined) {
    return 0;
  }

  const position = Number(cursor);
  const found = Number.isInteger(position)
    ? ordered.findIndex((event) => event.sequence === position)
    : -1;

  if (found < 0) {
    throw validationProblem(
      ctx,
      `The audit cursor ${cursor} is not a position this chain holds in the requested order.`,
    );
  }

  return found + 1;
}

/**
 * Reads the trail: the events the query admits, in the order it asks for, and one page of them.
 *
 * The filters are the ones `AuditQuery` declares — the actor, the action, the record, the outcome and
 * an inclusive instant range — with the list parameters contracts §9 fixes for a paging read: `sort`
 * as `member:dir`, `limit` as the page's greatest length under the folder's one rule (`listLimitOf`
 * above), and `cursor` as the position a previous page ended at. Without a `sort` the newest event
 * stands first (`DEFAULT_SORT_ORDER`).
 *
 * The read is bounded, because the trail is not: `state.auditEvents` gains an event on every audited
 * write, so a read that asked for the whole of it would return more of it on every write and cost a
 * filter and a sort over all of it each time. The page length is the folder's one rule (`listLimitOf`
 * above): a query that carries no `limit` is answered with `LIST_PAGE_DEFAULT` events, one that asks
 * for more than `LIST_PAGE_MAX` is served that maximum, and a `limit` that bounds no page at all is
 * refused rather than guessed at. A caller walks the whole trail by taking the next page from the
 * cursor each page's last event sits at, and it reads every event in one answer only where the chain
 * is shorter than the cap — a chain-wide fact (the verification of every hash) is `verifyAuditChain`'s,
 * which walks the records the state holds rather than paging through them.
 *
 * The stored chain is never reordered or handed out: the filter produces a new array, the ordering is
 * applied to that array, and each returned event is a copy of the record — so a caller that edits what
 * it was given cannot reach the chain a verification walks.
 *
 * @param ctx - The call's context: the chain read, and the persona the permission is evaluated for.
 * @param query - The filters, ordering and page position the read carries.
 * @returns The admitted events of the requested page, in the requested order.
 * @throws Problem - A `'permission'` failure when the trail is not readable, or a `'validation'` one
 *   when the cursor names no position of this chain or the limit bounds no page.
 */
export async function listAuditEvents(
  ctx: HandlerContext,
  query: AuditQuery,
): Promise<AuditEvent[]> {
  requireAuditRead(ctx);

  const order = sortOrderOf(query.sort);
  const ordered = ctx.state.auditEvents
    .filter((event) => admitsQuery(event, query))
    .sort((left, right) => compareEvents(left, right, order));

  const start = startIndexFor(ordered, query.cursor, ctx);

  return ordered
    .slice(start, start + listLimitOf(ctx, query.limit, 'audit trail'))
    .map((event) => ({ ...event }));
}

/**
 * Reads one event of the chain, with the two payload halves the detail drawer shows.
 *
 * The payloads are the record's own `before` and `after` values, which is what makes the drawer's
 * before-and-after view a reading of the chain rather than a second rendering of an action's intent.
 * The returned event is a copy, so a drawer cannot reach the record a verification walks.
 *
 * @param ctx - The call's context: the chain read, and the persona the permission is evaluated for.
 * @param id - The `AUD-nnnnnn` identifier of the event to read.
 * @returns The event that identifier names.
 * @throws Problem - A `'permission'` failure when the trail is not readable, or a `'not-found'` one
 *   naming the identifier when the chain holds no such event.
 */
export async function getAuditEvent(ctx: HandlerContext, id: AuditEventId): Promise<AuditEvent> {
  requireAuditRead(ctx);

  const event = ctx.state.auditEvents.find((candidate) => candidate.id === id);

  if (event === undefined) {
    const notFound: Problem = {
      type: 'not-found',
      message: `The audit chain holds no event with the identifier ${id}.`,
      traceId: ctx.traceId,
    };

    throw notFound;
  }

  return { ...event };
}

/* ---------------------------------------------------------------------------------------------
 * Verifying the chain — AAP 0.8, contracts §6
 * ------------------------------------------------------------------------------------------- */

/**
 * Verifies the chain and reports every position at which it does not hold together.
 *
 * The report is `verifyChain`'s, returned unchanged: how many events were recomputed, every break as a
 * `{ sequence, id }` pair, and how long the walk took. The interface shows the first break's position
 * with the total, so a reader learns where the trail stops agreeing with itself and can open that
 * event; a report carrying only the first would hide the rest.
 *
 * This walk demonstrates a mechanism and protects no record. It shows that an edited field no longer
 * matches the hash computed from the fields beside it — which is what the simulation popover's control
 * exhibits — and it establishes nothing about the store behind a browser page, prevents neither
 * editing nor copying, repairs nothing and re-sequences nothing. The records read exactly as they did
 * before the call, which is why a reader can verify as often as they like.
 *
 * @param ctx - The call's context: the chain walked, and the persona the permission is evaluated for.
 * @returns The verification report.
 * @throws Problem - A `'permission'` failure when the trail is not readable.
 */
export async function verifyAuditChain(ctx: HandlerContext): Promise<ChainReport> {
  requireAuditRead(ctx);

  return verifyChain(ctx.state.auditEvents);
}

