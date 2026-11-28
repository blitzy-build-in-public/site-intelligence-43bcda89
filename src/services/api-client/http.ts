/**
 * The transport of the service port's second adapter: one function that sends a same-origin request
 * and answers with the envelope every result carries, or throws the typed failure every call can
 * produce (`platform-contracts.md` §2 and §9; AAP 0.12.1 "API client" row; AAP 0.12.3).
 *
 * The target is a path, never an address. The caller passes a constant from `paths.ts`, this module
 * sends it unchanged and appends only the encoded query its arguments describe, so every request
 * reaches the origin that served the application and none reaches another (rule B-1). A target that
 * is not rooted at the application origin is refused here rather than sent, which makes that
 * containment a check instead of a convention; and it is judged in the form the URL parser that
 * sends it will read, because the parser removes an ASCII tab, carriage return or line feed from
 * anywhere in its input and reads a backslash as a slash in the special schemes a page is served
 * over. There is no base origin, no host, no port and no second target in this file, and a call
 * that fails is never repeated against one.
 *
 * Nothing identifies a caller. The request carries the two media-type headers a JSON call needs,
 * and no member of it carries an identity, a session or a preference: the authority behind a call
 * comes from the service that answers it, never from a value this file supplies (rule B-2).
 *
 * The envelope is validated rather than assumed (rule P-1). A success is returned only when the body
 * holds a `data` that carries the members its type declares and a `meta` whose `simulated` member is
 * the literal `true`, whose `freshness` is an array and whose `traceId` is a string; a body that
 * fails those checks is refused as a `'validation'` failure instead of reaching a screen looking
 * like a live result. The member names come from `PAYLOADS`, which the compiler proves is exactly
 * the members each `src/types` shape declares, so `src/types` keeps sole ownership of every shape.
 * The marker is read and passed on unchanged, and this file holds no simulation label of its
 * own: the seven fixed strings live in `src/types/primitives.ts` and belong to the components that
 * render them.
 *
 * The correlation identifier is the response body's, else the response header's, else the one this
 * module mints for the call. AAP 0.18.1 makes `traceId` the demonstration's diagnostic — every
 * `Problem` carries it and every card shows it so a user can quote it — so the failures no response
 * can name are named too: a refused target, a call that never reached the service and one abandoned
 * at its deadline each carry the identifier minted for their own call. Nothing here reads the clock
 * or a random source, so the same failure carries the same identifier on every run (AAP 0.2.1); the
 * minted value stays in this browser and is never sent, because nothing here identifies a caller
 * (rule B-2); and its prefix is this end's own, so it cannot collide with an identifier the service
 * issues beside it.
 *
 * IT TAKES THE SAME TIME THE DEMONSTRATION ADAPTER TAKES. AAP 0.12.3 requires both adapters to share
 * the observable behaviour that makes the swap invisible, and names the delay among it; AAP 0.12.1
 * assigns the 150 to 400 ms band to the demonstration adapter, so a loading state is observable rather
 * than skipped. Both hold here: every call waits that band, on the same ladder the demonstration
 * adapter walks and from this module's own call counter, before the request is sent — so a screen cannot
 * tell which adapter is bound from how long a read takes, and a deployment's own service adds its real
 * latency on top of the wait. The delay is the only thing this module does besides sending a call and
 * reporting what came back: it withholds nothing, because redaction belongs to the service that holds
 * the records, and it repeats nothing.
 *
 * Shapes only (rule P-6): the only numerals in this file are protocol constants — the response
 * status codes its failure mapping reads and the one deadline it arms. They classify a transport
 * outcome and are never shown as a value, so none of them is a figure of the domain.
 *
 * Nothing here is claimed as established (rule P-4). The file reports what a response said; it makes
 * no statement about the store behind it, about who may read a record, or about what an edit to a
 * record would do.
 *
 * This module is a leaf of the adapter: it imports the shared type vocabulary and the permission
 * names, and nothing from the domain, the seed, React or the mock backend. `api-client.ts` is its
 * only importer, and only `src/services/create-service.ts` binds that adapter (rule P-2), so no
 * screen reaches this file.
 */

import { PERMISSIONS } from '../../types/primitives';
import type {
  AffectedLine,
  Answer,
  Approval,
  ApprovalOutcome,
  Atlas,
  AuditEvent,
  AuditEventId,
  ChainReport,
  DocumentBody,
  Evidence,
  EvidencePin,
  ExceptionDetail,
  ExceptionRow,
  ExitPackage,
  LedgerRow,
  Meta,
  ModelCatalogue,
  OperationalException,
  Overview,
  Permission,
  PlanGrid,
  PolicyDetail,
  PolicyException,
  PolicyId,
  PpapPackage,
  Problem,
  ProblemType,
  Result,
  RibbonTile,
  Role,
  Scenario,
  ScenarioSet,
  SearchHit,
  SourceCatalogue,
  SovereigntyStatus,
  SuggestedQuestion,
  Topology,
  WriteBack,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The typed failure — platform-contracts.md §2, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The typed failure a request throws: a `Problem` a caller can narrow on, carried as an `Error` so a
 * `try`/`catch` and a stack both work (`platform-contracts.md` §2).
 *
 * The members are the `Problem` fields and nothing besides, in the spelling `src/types/service.ts`
 * declares them, because a permission denial has to reach `src/components/forbidden-card.tsx` with
 * the permission it lacked and the roles that hold it, and a policy block has to reach the assistant
 * with the rule, the alternative it permits and the event it appended. A cause the response did not
 * carry is absent from the instance rather than present as a valueless member, so a reader can test
 * one member and learn what the service actually reported.
 *
 * The `message` is a sentence for a reader. For a failure the service described it is the service's
 * own reason, carried through unchanged, because that sentence is what a disabled control and a
 * stale-source banner show (rule P-8). For a failure this module detected itself — a body that is
 * not the envelope, a call that never reached the service, a call that outlasted its deadline, a
 * target that is not a relative path — it is this module's sentence naming the status code and the
 * path, with the service named as the side that failed where the status is the service's own, or
 * naming the deadline and the path, and it never quotes the body it could not use.
 *
 * The instance describes one call and states nothing about the records behind it (rule P-4).
 */
export class ProblemError extends Error implements Problem {
  /** Which cause the failure names, one of the five the contracts fix. */
  readonly type: ProblemType;

  /**
   * The correlation identifier of the call that failed: the one the service reported, or the one this
   * module minted for the call when no answer carried one.
   */
  readonly traceId: string;

  /** The permission the acting role lacked, present on a `'permission'` failure. */
  declare readonly requiredPermission?: Permission;

  /** The roles holding that permission, present on a `'permission'` failure. */
  declare readonly rolesWithPermission?: Role[];

  /** The rule that denied the action, present on a `'policy'` failure. */
  declare readonly policyId?: PolicyId;

  /** The alternative the denying rule permits, present on a `'policy'` failure. */
  declare readonly permittedAlternative?: string;

  /** The event the denial appended, present on a `'policy'` failure. */
  declare readonly auditEventId?: AuditEventId;

  /**
   * Copies a `Problem` onto the instance, cause by cause.
   *
   * @param problem - The failure to carry, either one the service reported or one this module
   * detected. Its `message` becomes the instance's message.
   * @param cause - What a rejected call rejected with, kept for a stack to show. Omitted when there
   * is nothing to record.
   */
  constructor(problem: Problem, cause?: unknown) {
    super(problem.message, cause === undefined ? undefined : { cause });
    this.type = problem.type;
    this.traceId = problem.traceId;
    if (problem.requiredPermission !== undefined) {
      this.requiredPermission = problem.requiredPermission;
    }
    if (problem.rolesWithPermission !== undefined) {
      this.rolesWithPermission = problem.rolesWithPermission;
    }
    if (problem.policyId !== undefined) {
      this.policyId = problem.policyId;
    }
    if (problem.permittedAlternative !== undefined) {
      this.permittedAlternative = problem.permittedAlternative;
    }
    if (problem.auditEventId !== undefined) {
      this.auditEventId = problem.auditEventId;
    }
  }
}

/* ---------------------------------------------------------------------------------------------
 * What a caller may ask for — platform-contracts.md §9
 * ------------------------------------------------------------------------------------------- */

/**
 * What a caller may ask the transport to send, apart from the target itself.
 *
 * Only the two methods contracts §9 uses are offered, so a call cannot acquire a verb the paths do
 * not describe. There is no member for a header, a mode or an identity: a call is sent as it is
 * described here and nothing else is attached to it (rules B-1, B-2). A deadline is not a member
 * either, because it is not the caller's to choose: `request` arms the one fixed deadline below for
 * every call, so a service that never answers cannot hold a call open and no caller can extend it,
 * shorten it or remove it (rule P-6).
 *
 * @typeParam Q - The query shape of the call, an interface such as `ExceptionQuery` or the default
 * empty record when the call carries no parameters.
 */
export interface RequestOptions<Q extends object> {
  /** The method to send; absent means `GET`. */
  readonly method?: 'GET' | 'POST';

  /**
   * The parameters to append, serialised by `request` from the members that hold a representable
   * value. A member the caller leaves out is omitted, and an empty string is a value rather than an
   * absence: a caller that passes one asks the service to match it, so it travels as a parameter
   * with an empty value instead of being dropped. `sort` travels exactly as the caller writes it,
   * because contracts §9 fixes it as `field:dir`; no member is read as a field path, a range or a
   * structured filter.
   */
  readonly query?: Q;

  /** The payload to send as JSON; absent means the call has no body. */
  readonly body?: unknown;
}

/* ---------------------------------------------------------------------------------------------
 * Timing a call — AAP 0.12.3, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The shortest time a call takes, in milliseconds: the floor of the 150 to 400 ms band AAP 0.12.1
 * assigns the demonstration adapter, so that a loading state is observable rather than skipped, and
 * AAP 0.12.3 requires of both adapters, so that binding the other one is not observable in the
 * interface.
 *
 * A protocol constant rather than a figure of the domain: it is the length of a call, it is never shown
 * as a value and it describes no record (rule P-6).
 */
const LATENCY_FLOOR_MS = 150;

/** The step the ladder advances by, in milliseconds. */
const LATENCY_STEP_MS = 50;

/** How many steps the ladder spans, so the band's ceiling is the floor plus five steps. */
const LATENCY_STEPS = 6;

/**
 * How many calls this module has timed.
 *
 * The counter the ladder is derived from, held for the module rather than for a call: it starts at zero
 * when the module is loaded and advances once per request, so the first six calls take each of the
 * band's six values in turn and the seventh starts again. Two runs of the same calls therefore wait the
 * same amounts, which is what keeps a run reproducible (AAP 0.18.2); a random draw would not.
 */
let callCount = 0;

/**
 * The wait one call takes, from the module's own counter alone.
 *
 * @returns The delay, in milliseconds, inside the band AAP 0.12.1 and AAP 0.12.3 fix.
 */
function latencyForCall(): number {
  const delay = LATENCY_FLOOR_MS + (callCount % LATENCY_STEPS) * LATENCY_STEP_MS;
  callCount += 1;

  return delay;
}

/**
 * Waits the given number of milliseconds.
 *
 * A local helper, so this module depends on nothing but the platform's timer: no clock is read, no
 * environment value is consulted and no package supplies the delay (rules B-1, B-2).
 *
 * @param milliseconds - How long to wait; zero resolves on the next turn.
 * @returns A promise that settles once the delay has passed.
 */
function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/* ---------------------------------------------------------------------------------------------
 * The identifier a call is named by — AAP 0.18.1 "Trace and diagnostics", rules B-1, B-2 and P-6
 * ------------------------------------------------------------------------------------------- */

/**
 * The prefix of an identifier this module mints, which keeps it clear of the identifiers the service
 * issues beside it: the demonstration adapter answers `TRC-` and its own counter
 * (`src/services/mock/handlers/audit.ts`). A protocol constant rather than a figure of the domain
 * (rule P-6): it names this end of a call and is never rendered as a value of a record.
 */
const MINTED_TRACE_PREFIX = 'CLT-';

/** Digits in the counter a minted identifier carries, so the form is the same width every time. */
const MINTED_TRACE_DIGITS = 6;

/**
 * How many identifiers this module has minted.
 *
 * Held for the module rather than for a call, and advanced once per request, so the first call of a run
 * is named by the first value of the sequence and the call after it by the second. A counter rather
 * than a clock or a random source, because either of those would make the same failure of the same call
 * print a different identifier on every run (AAP 0.2.1, AAP 0.18.2).
 */
let mintedTraceCount = 0;

/**
 * The correlation identifier this module mints for one call whose failure no answer can name.
 *
 * contracts §1 fixes a pattern for every record it names and none for a trace identifier — the
 * demonstration adapter records that same gap where it builds one — so the form is derived here: this
 * end's own prefix, then the counter zero-padded to a fixed width. The prefix is what makes the
 * identifier unmistakable for one the service issued, and the counter is what makes two failures of one
 * session tell a reader that they were two calls. The value names this end of the call and nothing else:
 * it is never sent (rule B-2), it holds no host, scheme, port or address (rule B-1), and it is a
 * protocol constant rather than a figure of the domain (rule P-6).
 *
 * @returns The identifier of the call this function is asked about, distinct from the one before it.
 */
function traceIdForCall(): string {
  const counter = String(mintedTraceCount).padStart(MINTED_TRACE_DIGITS, '0');
  mintedTraceCount += 1;

  return `${MINTED_TRACE_PREFIX}${counter}`;
}

/* ---------------------------------------------------------------------------------------------
 * The deadline — rules P-6 and B-2
 * ------------------------------------------------------------------------------------------- */

/**
 * How long one call may wait for the service's answer before it is abandoned: ten seconds.
 *
 * No input fixes this value, so it is a protocol constant of the transport rather than a figure of
 * the domain: it is the same for every call, it is never shown as a value, and nothing renders it
 * (rule P-6). It is not read from configuration or from the environment either, because the build
 * declares no variable to read (rule B-2); a deployment that needs another bound changes this bound
 * here, beside the code it governs.
 */
const REQUEST_DEADLINE_MS = 10_000;

/**
 * The failure a call becomes when its deadline passes: a `'validation'` cause, because no status the
 * service sends names it and the nearest of the five fixed causes is the one the set leaves for a
 * call that produced no answer (AAP 0.2.2, AAP 0.12.3).
 *
 * The message names the path and the deadline, so a reader knows which call was abandoned and after
 * how long, and it names no origin, host or port (rule B-1). The rejection that carried the call is
 * kept when there is one, so a stack still shows where the wait ended.
 *
 * @param path - The target the abandoned call named.
 * @param traceId - The correlation identifier of the abandoned call: the one its answer carried, or the
 * one minted for the call when none did.
 * @param cause - What the abandoned call rejected with, when there was such a value.
 * @returns The typed failure to throw.
 */
function deadlineFailure(path: string, traceId: string, cause?: unknown): ProblemError {
  return new ProblemError(
    {
      type: 'validation',
      message:
        `The request to ${path} received no answer within its ` +
        `${REQUEST_DEADLINE_MS} ms deadline and was abandoned.`,
      traceId,
    },
    cause,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The request — platform-contracts.md §2 and §9, AAP 0.12.1 and 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * Sends one call to a path of the service and resolves to the envelope the service answers with.
 *
 * The steps, in the order this function performs them:
 *
 * 1. Mint the identifier this call's failures are named by, so that a target refused here and a call
 *    that never reached the service are named as well as one the service answered (AAP 0.18.1 "Trace
 *    and diagnostics", rules B-1, B-2 and P-6). Then refuse a target that is not rooted at the
 *    application origin (rule B-1): only a target that is a single slash and then a path is sent,
 *    read the way the parser that sends it will read it — its tabs, carriage returns and line feeds
 *    removed and its backslashes taken as slashes — so a caller cannot make this transport address
 *    another host by handing it an address where a path belongs, however it spells the two leading
 *    separators.
 * 2. Serialise the query: every own enumerable member whose value is a string — the empty string
 *    included, which is a value a caller may ask the service to match and which therefore travels
 *    as a parameter with an empty value — a finite number or a boolean, with the name and the value
 *    both encoded, joined with `&` and prefixed with `?` when at least one survives. A member
 *    holding `null`, `undefined`, a non-finite number, an array, a nested object or a function is
 *    left out rather than rendered, because contracts §9 fixes no list or range syntax for a query
 *    parameter and a shape it does not describe is omitted instead of being flattened into
 *    something the service never asked for. An absent member is the one that sends no parameter, so
 *    a caller that omits a parameter asks for the whole selection and a caller that passes an empty
 *    value asks for what matches it.
 * 3. Wait the call's share of the 150 to 400 ms band both adapters apply (AAP 0.12.3), then send
 *    it: `GET` unless a method was given, a JSON content type only beside a body, a JSON accept
 *    header always, the deadline's signal beside them, and no member that would identify a client
 *    or repeat a failed call.
 * 4. Read the answer as JSON. A 2xx body that is not the `{ data, meta }` envelope — `data` absent
 *    or a scalar or `null`, `meta` not an object, `meta.simulated` not the literal `true`,
 *    `meta.freshness` not an array, `meta.traceId` not a string — is refused as a `'validation'`
 *    failure, which is the guard behind the disclosure rule: a response that does not say it is
 *    simulated never reaches a screen as if it were live (rule P-1). The kind of the payload is the
 *    other thing this layer decides: no member of the port answers a scalar or `null`, so one is
 *    refused here rather than reaching a screen to be read as a record. The members the payload's
 *    type declares are the third: the caller names its payload's shape from `PAYLOADS`, and a record
 *    missing one of those members — or a list whose element is — is refused by the same check, so a
 *    typed consumer never reads a member the service did not send. Every other 2xx answer is
 *    returned as it arrived, with no member added, dropped or recomputed.
 * 5. Map a failure to a `Problem` carrying the reason a reader needs (rule P-8). A body the service
 *    wrote in the failure shape is preferred, and every cause it carries is preserved — the
 *    permission a role lacked, the roles that hold it, and the rule, permitted alternative and
 *    event of a policy block. When the body names none, the status code decides: `401` a missing
 *    permission, `403` a policy block, `404` a record that does not exist, and `400`, `422` and
 *    every other status — `5xx` included — a validation of the call. That last one is the nearest
 *    of the five causes for a status the set does not name, and a call that produced no status at
 *    all takes it as well; the diagnostic names the one class that needs it in words — a `5xx` is
 *    the service failing to answer the call — so a server fault never reads as a fault in the call
 *    the reader made. The five causes contracts §2 fixes are the whole vocabulary, so no sixth is
 *    invented for a status the set does not describe.
 * 6. Report the correlation identifier of the call: the response body's, else the response header's,
 *    else the one step 1 minted for this call. The body's own identifier always wins, so a value the
 *    service reported is never replaced by one from here; the mint is the last resort that keeps a
 *    `Problem` from being blank, which matters because the member is the diagnostic a card shows so a
 *    user can quote it (AAP 0.18.1). It is derived from a counter rather than from a clock or a random
 *    source, so the same failure names the same call on every run (AAP 0.2.1).
 *
 * A call that outlasts its deadline is abandoned: the timer aborts the signal the call was sent
 * with, and the call becomes a `'validation'` failure — again the nearest of the five causes, since
 * no status names it — whose message names the path and the deadline. The deadline covers the whole
 * wait for the answer, its body included, because the signal stays armed while the body is read: a
 * service that accepts the connection and never answers, and one that answers with headers and then
 * stalls, are both abandoned rather than holding the caller open for the life of the page. Any other
 * rejection — no network, no answer — becomes a `'validation'` failure naming the path and carrying
 * the rejection as its `cause`. Neither is repeated: the call is not sent again, no second target is
 * tried, and no origin or host appears in the message.
 *
 * @typeParam T - The payload the envelope carries.
 * @typeParam Q - The query shape of the call, `Record<string, never>` when it takes no parameters.
 * @param path - The target: a constant or a built path from `src/services/api-client/paths.ts`.
 * @param options - The method, the query, the body and the payload shape of the call. The shape is the
 * `PAYLOADS` entry of the payload's own type: it is what the answer's `data` is validated against, so
 * a member the type declares reaches this caller only when the service sent it.
 * @returns The service's `Result<T>`, carrying the payload and its metadata exactly as the response
 * carried them.
 * @throws ProblemError - The typed failure, whose `type` names its cause.
 */
export async function request<T, Q extends object = Record<string, never>>(
  path: string,
  options: RequestOptions<Q> & { readonly payload: PayloadShape<T> },
): Promise<Result<T>> {
  // The identifier every failure of this call is named by, minted before the target is even checked,
  // so a refusal names the call it refused (AAP 0.18.1 "Trace and diagnostics").
  const mintedTrace = traceIdForCall();

  if (!isRelativePath(path)) {
    throw new ProblemError({
      type: 'validation',
      message: 'The request target is not a path relative to the application origin.',
      traceId: mintedTrace,
    });
  }

  // The band both adapters apply (AAP 0.12.3), waited before the call is sent so a pending state is
  // observable exactly as it is on the demonstration adapter (AAP 0.12.1).
  await wait(latencyForCall());

  const query = options.query;
  const target = query === undefined ? path : `${path}${serialiseQuery(query)}`;
  const requestBody = options.body;

  const controller = new AbortController();
  let deadlineReached = false;
  const deadline = setTimeout(() => {
    deadlineReached = true;
    controller.abort();
  }, REQUEST_DEADLINE_MS);

  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers: requestHeaders(requestBody !== undefined),
    signal: controller.signal,
  };
  if (requestBody !== undefined) {
    init.body = JSON.stringify(requestBody);
  }

  let response: Response;
  let body: BodyRead;
  try {
    response = await fetch(target, init);
    body = await readBody(response);
  } catch (cause) {
    if (deadlineReached) {
      throw deadlineFailure(path, mintedTrace, cause);
    }
    throw new ProblemError(
      {
        type: 'validation',
        message: `The request to ${path} did not reach the service.`,
        traceId: mintedTrace,
      },
      cause,
    );
  } finally {
    clearTimeout(deadline);
  }

  // The identifier of this call: the header's when the response carried one, and the minted one
  // otherwise. An empty header is no identifier — the same reading `problemFromBody` applies to an
  // empty member of a body — so it takes the minted value as well.
  const reportedTrace = response.headers.get(TRACE_ID_HEADER);
  const callTraceId =
    reportedTrace === null || reportedTrace === '' ? mintedTrace : reportedTrace;

  if (deadlineReached && !body.readable) {
    throw deadlineFailure(path, callTraceId);
  }

  if (!response.ok) {
    throw failure(path, response.status, body, callTraceId);
  }

  if (!body.readable) {
    throw new ProblemError({
      type: 'validation',
      message:
        `The service answered ${response.status} for ${path} ` +
        'with a body that could not be read as JSON.',
      traceId: callTraceId,
    });
  }

  const result = readResult<T>(body.value, options.payload);
  if (result === undefined) {
    throw new ProblemError({
      type: 'validation',
      message:
        `The service answered ${response.status} for ${path} without the data ` +
        'and meta envelope a result carries, or with a payload that does not carry ' +
        'the members its type declares.',
      traceId: callTraceId,
    });
  }

  return result;
}

/* ---------------------------------------------------------------------------------------------
 * The target, the query and the headers — platform-contracts.md §9, rules B-1 and B-2
 * ------------------------------------------------------------------------------------------- */

/** The media type of every payload and every answer this adapter exchanges. */
const JSON_MEDIA_TYPE = 'application/json';

/** The header stating the media type a caller accepts, sent with every call. */
const ACCEPT_HEADER = 'accept';

/** The header stating the media type of a payload, sent only beside a payload. */
const CONTENT_TYPE_HEADER = 'content-type';

/** The response header carrying the correlation identifier when the body does not. */
const TRACE_ID_HEADER = 'x-trace-id';

/** A leading pair of slashes, which addresses a host rather than a path of this origin. */
const AUTHORITY_PREFIX = '//';

/**
 * A target as the URL parser that will send it reads it: the ASCII tab, carriage return and line feed
 * removed from anywhere in the target, and every backslash taken as a slash.
 *
 * The transformation is the parser's own, and it is applied here because a decision taken on the raw
 * text is a different decision. `fetch` reads its input with the WHATWG URL parser, which strips the
 * three ASCII whitespace characters from anywhere in a target and, for the special schemes a page is
 * served over, normalises a backslash to a slash; so `/\host/path` and `/\t/host/path` are read as
 * `//host/path`, a protocol-relative address on another origin, while the raw text begins with a
 * single slash. Judging the transformed text is what makes the containment below a property of the
 * target rather than a property of its spelling (rule B-1).
 *
 * @param path - The target a caller asked for, as it was written.
 * @returns The target in the form the parser will resolve it.
 */
function asUrlParserReads(path: string): string {
  return path
    .replaceAll('\t', '')
    .replaceAll('\n', '')
    .replaceAll('\r', '')
    .replaceAll('\\', '/');
}

/**
 * Whether a target is a path of the application's own origin.
 *
 * A path begins with one slash. Two slashes address a host instead, so they are refused, and a full
 * address beginning with a scheme never reaches this test because it does not begin with a slash at
 * all. The target is judged in the form `asUrlParserReads` states, so a target that the parser would
 * resolve to another origin — a second separator written as a backslash, or a tab, carriage return or
 * line feed between the two — is refused here rather than sent. A backslash anywhere past the first
 * character is still a path of this origin to the parser, so it is accepted and read as a slash. The
 * check is what keeps the same-origin property structural rather than promised (rule B-1).
 */
function isRelativePath(path: string): boolean {
  const parsed = asUrlParserReads(path);

  return parsed.startsWith('/') && !parsed.startsWith(AUTHORITY_PREFIX);
}

/**
 * Renders a query shape as the parameter string a call appends, `''` when nothing survives.
 *
 * A member reaches the service only because the caller supplied it: an explicitly supplied empty
 * value is sent as a parameter with an empty value (`?ref=`), and a member the caller left out is
 * the one that produces no parameter at all. The ordering parameter contracts §9 writes as
 * `field:dir` travels exactly as the caller wrote it: it is encoded with the rest of the value
 * rather than parsed, split or reordered, and no member is interpreted as a field path.
 */
function serialiseQuery(query: object): string {
  const parts: string[] = [];
  for (const name of Object.keys(query)) {
    const rendered = queryValue((query as Readonly<Record<string, unknown>>)[name]);
    if (rendered === undefined) {
      continue;
    }
    parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(rendered)}`);
  }
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
}

/**
 * Renders one query member, or `undefined` when the member carries no value the path vocabulary can
 * express.
 *
 * An empty string is a value rather than an absence: a caller that passes one asks the service to
 * match it, so it is rendered as a parameter with an empty value instead of being dropped, which
 * would widen the read to the whole collection. The member that carries nothing is the absent one
 * — `null` or `undefined` — and a shape contracts §9 does not describe — an array, a nested
 * object, a function — is omitted rather than flattened, so a parameter never changes meaning on
 * its way to the service. A number and a boolean keep their own rendering, so a deliberate `0` or
 * `false` travels as the value it is.
 */
function queryValue(value: unknown): string | undefined {
  switch (typeof value) {
    case 'string':
      return value;
    case 'number':
      return Number.isFinite(value) ? String(value) : undefined;
    case 'boolean':
      return value ? 'true' : 'false';
    default:
      return undefined;
  }
}

/**
 * The headers a call carries: the accepted media type always, the payload's media type only when
 * there is a payload, and nothing that would identify a caller (rule B-2).
 */
function requestHeaders(hasPayload: boolean): Record<string, string> {
  const headers: Record<string, string> = { [ACCEPT_HEADER]: JSON_MEDIA_TYPE };
  if (hasPayload) {
    headers[CONTENT_TYPE_HEADER] = JSON_MEDIA_TYPE;
  }
  return headers;
}

/* ---------------------------------------------------------------------------------------------
 * Reading the answer — platform-contracts.md §2, AAP 0.12.3, rule P-1
 * ------------------------------------------------------------------------------------------- */

/**
 * What a response body turned out to be: the value it parsed to, or the report that it held no JSON.
 *
 * The two members are told apart by `readable` rather than by a valueless parsed value, because
 * `null` is valid JSON and has to read as the payload it is.
 */
type BodyRead =
  | { readonly readable: true; readonly value: unknown }
  | { readonly readable: false };

/**
 * Parses a response body as JSON without letting a parse failure escape, so a failure the service
 * described and a body that is not JSON are told apart by the caller.
 */
async function readBody(response: Response): Promise<BodyRead> {
  try {
    return { readable: true, value: await response.json() };
  } catch {
    return { readable: false };
  }
}

/**
 * The members a type declares as required: every key whose `Pick` an empty object does not satisfy.
 *
 * A member declared optional is excluded, so a service is never asked for one a caller may read as
 * absent. The `-?` modifier strips optionality from the mapped key before the test, so the `Pick`
 * describes the key's own declaration rather than the mapped copy's.
 */
type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];

/**
 * A key map of exactly the members a type declares as required, each mapped to `true`.
 *
 * `src/types` stays the single declaration of every shape: this carries member names only and no
 * member's type, so there is no second copy of a record here to drift from the one the port declares.
 */
type PayloadMembers<T> = { readonly [K in RequiredKeys<T>]: true };

/** The element type of a list payload, and `never` for a type that is not a list. */
type ListElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * The member names a payload of `T` has to carry, and the kind of value they have to appear on.
 *
 * A record carries them itself; a list is an array whose every element carries them, because a list
 * payload is a list of one record type. The kind is a member of the shape rather than a check on the
 * value alone, so the transport knows which of the two it is validating before it looks.
 */
type PayloadShape<T> = T extends readonly unknown[]
  ? { readonly kind: 'list'; readonly members: PayloadMembers<ListElement<T>> }
  : { readonly kind: 'record'; readonly members: PayloadMembers<T> };

/**
 * The member names each payload the client requests has to carry, one entry per payload type.
 *
 * WHY A MAP OF NAMES AND NOT THE SHAPES. `src/types` declares every record, once, and that stays
 * true: this object carries member names and no member's type, so it cannot contradict the shape
 * whose members it names. `PayloadMembers<T>` is a mapped type over `RequiredKeys<T>`, so the
 * compiler proves each entry holds exactly the members its type declares as required — a member
 * missing from an entry, or one its type does not declare, is a compile error here rather than a
 * defect a service finds at run time. Nothing is widened for that reason: an entry annotated as a
 * `Record<string, true>` or a cast would compile an incomplete map, so every entry is written as an
 * object literal checked by `satisfies PayloadShape<T>` against the type it names.
 *
 * WHY THE TRANSPORT CHECKS IT AT ALL. The envelope alone is not enough (AAP 0.12.3, rule P-1): a
 * service that answered `{ data: {}, meta }` for `getOverview` satisfies a validator that only asks
 * for an object, and every typed consumer downstream then reads an absent member as a value. With
 * the members required here, that answer becomes the same typed `'validation'` failure a body
 * without an envelope produces.
 */
export const PAYLOADS = {
  /** `Overview` — the SCR-01 read's tiles, rows and series. */
  overview: {
    kind: 'record',
    members: {
      openExceptions: true,
      revenueAtRiskEur: true,
      customerOrdersAtRisk: true,
      medianHoursToApprovedPlan: true,
      alternateSourceReadinessPercent: true,
      changedSinceLastVisit: true,
      byPlant: true,
      openResolvedSeries: true,
    },
  } satisfies PayloadShape<Overview>,

  /** `ExceptionRow[]` — the SCR-02 queue. */
  exceptionRows: {
    kind: 'list',
    members: {
      id: true,
      type: true,
      title: true,
      productIds: true,
      plantId: true,
      alsoAffectsPlantIds: true,
      severity: true,
      revenueAtRiskEur: true,
      daysToImpact: true,
      status: true,
      ownerId: true,
      ageHours: true,
      freshness: true,
    },
  } satisfies PayloadShape<ExceptionRow[]>,

  /** `ExceptionDetail` — the SCR-03 investigation payload. */
  exceptionDetail: {
    kind: 'record',
    members: {
      exception: true,
      impactChain: true,
      stockSeries: true,
      affectedOrders: true,
      missingInputs: true,
      confidence: true,
      activity: true,
    },
  } satisfies PayloadShape<ExceptionDetail>,

  /** `AffectedLine[]` — the lines one exception touches. */
  affectedLines: {
    kind: 'list',
    members: {
      orderId: true,
      productId: true,
      plantId: true,
      dueDate: true,
      unitsAtRisk: true,
    },
  } satisfies PayloadShape<AffectedLine[]>,

  /** `OperationalException` — a write on one exception returns the record it changed. */
  operationalException: {
    kind: 'record',
    members: {
      id: true,
      title: true,
      type: true,
      severity: true,
      status: true,
      plantId: true,
      alsoAffectsPlantIds: true,
      materialId: true,
      supplierId: true,
      purchaseOrderId: true,
      lineId: true,
      ownerId: true,
      daysToImpact: true,
      affectedLines: true,
      missingInputs: true,
      confidence: true,
      whatChanged: true,
      detectedAt: true,
    },
  } satisfies PayloadShape<OperationalException>,

  /** `ScenarioSet` — the options one exception's solve offers. */
  scenarioSet: {
    kind: 'record',
    members: {
      exceptionId: true,
      scenarios: true,
      recommendationRule: true,
      tradeOff: true,
      rejected: true,
    },
  } satisfies PayloadShape<ScenarioSet>,

  /** `Scenario` — one option's measures. */
  scenario: {
    kind: 'record',
    members: {
      id: true,
      exceptionId: true,
      name: true,
      origin: true,
      unitsLate: true,
      maxDaysLate: true,
      ordersOnTime: true,
      ordersTotal: true,
      addedCostEur: true,
      lineIdleDays: true,
      revenueDelayedEur: true,
      runOut: true,
      dailyClosingStock: true,
      orders: true,
      constraintCheck: true,
      constraintMessages: true,
      sideEffects: true,
      writeBacks: true,
      levers: true,
      confidence: true,
    },
  } satisfies PayloadShape<Scenario>,

  /** `Approval[]` — the SCR-05 inbox. */
  approvals: {
    kind: 'list',
    members: {
      id: true,
      exceptionId: true,
      scenarioId: true,
      requestedBy: true,
      eligibleApproverRoles: true,
      status: true,
      addedCostEur: true,
      protectedRevenueEur: true,
      writeBacks: true,
      outcomeReviewed: true,
    },
  } satisfies PayloadShape<Approval[]>,

  /** `Approval` — one approval request, as a write on it returns it. */
  approval: {
    kind: 'record',
    members: {
      id: true,
      exceptionId: true,
      scenarioId: true,
      requestedBy: true,
      eligibleApproverRoles: true,
      status: true,
      addedCostEur: true,
      protectedRevenueEur: true,
      writeBacks: true,
      outcomeReviewed: true,
    },
  } satisfies PayloadShape<Approval>,

  /** `ApprovalOutcome` — the review an approver's decision leaves open. */
  approvalOutcome: {
    kind: 'record',
    members: {
      planned: true,
      resulting: true,
      /* The record the two measurements belong to, so every reading the card prints opens the
         evidence drawer on that record rather than on a reference a screen composed (AAP §0.2.1's
         F12, rule P-6). */
      evidenceRef: true,
    },
  } satisfies PayloadShape<ApprovalOutcome>,

  /** `WriteBack` — one simulated write on the approval that triggered it. */
  writeBack: {
    kind: 'record',
    members: {
      sequence: true,
      system: true,
      recordRef: true,
      description: true,
      state: true,
    },
  } satisfies PayloadShape<WriteBack>,

  /** `AuditEvent[]` — the SCR-05 audit trail. */
  auditEvents: {
    kind: 'list',
    members: {
      sequence: true,
      id: true,
      timestamp: true,
      actorType: true,
      actorId: true,
      action: true,
      objectRef: true,
      result: true,
      before: true,
      after: true,
      payloadHash: true,
      traceId: true,
      previousHash: true,
      eventHash: true,
    },
  } satisfies PayloadShape<AuditEvent[]>,

  /** `AuditEvent` — one event of the trail. */
  auditEvent: {
    kind: 'record',
    members: {
      sequence: true,
      id: true,
      timestamp: true,
      actorType: true,
      actorId: true,
      action: true,
      objectRef: true,
      result: true,
      before: true,
      after: true,
      payloadHash: true,
      traceId: true,
      previousHash: true,
      eventHash: true,
    },
  } satisfies PayloadShape<AuditEvent>,

  /** `ChainReport` — the verification of the trail. */
  chainReport: {
    kind: 'record',
    members: {
      eventsChecked: true,
      breaks: true,
      durationMs: true,
    },
  } satisfies PayloadShape<ChainReport>,

  /** `ModelCatalogue` — the models the platform declares. */
  modelCatalogue: {
    kind: 'record',
    members: {
      models: true,
      defaultModelId: true,
    },
  } satisfies PayloadShape<ModelCatalogue>,

  /** `SuggestedQuestion[]` — the assistant's scripted prompts. */
  suggestedQuestions: {
    kind: 'list',
    members: {
      id: true,
      prompt: true,
    },
  } satisfies PayloadShape<SuggestedQuestion[]>,

  /** `Answer` — one cited answer of the assistant. */
  answer: {
    kind: 'record',
    members: {
      text: true,
      citations: true,
      queriesRun: true,
      modelId: true,
      partial: true,
      missing: true,
    },
  } satisfies PayloadShape<Answer>,

  /** `SovereigntyStatus` — the declared configuration of SCR-07. */
  sovereigntyStatus: {
    kind: 'record',
    members: {
      summary: true,
      rows: true,
      ledger: true,
    },
  } satisfies PayloadShape<SovereigntyStatus>,

  /** `LedgerRow[]` — the outbound ledger. */
  ledgerRows: {
    kind: 'list',
    members: {
      endpoint: true,
      purpose: true,
      state: true,
      lastAttempt: true,
      allowed: true,
      blocked: true,
    },
  } satisfies PayloadShape<LedgerRow[]>,

  /** `PolicyDetail[]` — the policy list of SCR-07. */
  policyDetails: {
    kind: 'list',
    members: {
      id: true,
      title: true,
      statement: true,
      evaluated: true,
      recentDecisions: true,
      pendingExceptions: true,
    },
  } satisfies PayloadShape<PolicyDetail[]>,

  /** `PolicyDetail` — one policy. */
  policyDetail: {
    kind: 'record',
    members: {
      id: true,
      title: true,
      statement: true,
      evaluated: true,
      recentDecisions: true,
      pendingExceptions: true,
    },
  } satisfies PayloadShape<PolicyDetail>,

  /** `PolicyException` — a grant requested against one policy. */
  policyException: {
    kind: 'record',
    members: {
      policyId: true,
      reason: true,
      expiresAt: true,
      requestedBy: true,
      secondApproverId: true,
      status: true,
    },
  } satisfies PayloadShape<PolicyException>,

  /** `Evidence` — the drawer's record for one figure. */
  evidence: {
    kind: 'record',
    members: {
      value: true,
      provenance: true,
      label: true,
      formula: true,
      inputs: true,
      upstream: true,
      downstream: true,
      confidence: true,
      missingInputs: true,
      documents: true,
    },
  } satisfies PayloadShape<Evidence>,

  /** `DocumentBody` — one document the evidence drawer cites. */
  documentBody: {
    kind: 'record',
    members: {
      id: true,
      title: true,
      classification: true,
      residency: true,
      attachments: true,
      body: true,
    },
  } satisfies PayloadShape<DocumentBody>,

  /** `EvidencePin[]` — the pins of the canvas. */
  evidencePins: {
    kind: 'list',
    members: {
      id: true,
      nodeRef: true,
      state: true,
    },
  } satisfies PayloadShape<EvidencePin[]>,

  /** `EvidencePin` — one pin. */
  evidencePin: {
    kind: 'record',
    members: {
      id: true,
      nodeRef: true,
      state: true,
    },
  } satisfies PayloadShape<EvidencePin>,

  /** `PpapPackage[]` — the package list. */
  ppapPackages: {
    kind: 'list',
    members: {
      id: true,
      supplierId: true,
      materialId: true,
      elements: true,
      readinessPercent: true,
    },
  } satisfies PayloadShape<PpapPackage[]>,

  /** `PpapPackage` — one package, as a review of its elements returns it. */
  ppapPackage: {
    kind: 'record',
    members: {
      id: true,
      supplierId: true,
      materialId: true,
      elements: true,
      readinessPercent: true,
    },
  } satisfies PayloadShape<PpapPackage>,

  /** `SearchHit[]` — the identifier search's answer. */
  searchHits: {
    kind: 'list',
    members: {
      ref: true,
      entityType: true,
      target: true,
    },
  } satisfies PayloadShape<SearchHit[]>,

  /** `Topology` — the canvas's nodes, lanes and pin counts. */
  topology: {
    kind: 'record',
    members: {
      plants: true,
      suppliers: true,
      materials: true,
      origins: true,
      customers: true,
      lanes: true,
      pinsByNode: true,
    },
  } satisfies PayloadShape<Topology>,

  /** `RibbonTile[]` — the canvas's ribbon. */
  ribbonTiles: {
    kind: 'list',
    members: {
      id: true,
      value: true,
      provenance: true,
    },
  } satisfies PayloadShape<RibbonTile[]>,

  /** `Atlas` — the SCR-13 market-intelligence pack. */
  atlas: {
    kind: 'record',
    members: {
      packLabel: true,
      packVersion: true,
      productClasses: true,
      clientSites: true,
      competitors: true,
      chokepoints: true,
      radarAxes: true,
      radarSeries: true,
    },
  } satisfies PayloadShape<Atlas>,

  /** `SourceCatalogue` — the health of the six sources. */
  sourceCatalogue: {
    kind: 'record',
    members: {
      health: true,
    },
  } satisfies PayloadShape<SourceCatalogue>,

  /** `PlanGrid` — one plant's plan. */
  planGrid: {
    kind: 'record',
    members: {
      horizon: true,
      rows: true,
    },
  } satisfies PayloadShape<PlanGrid>,

  /** `ExitPackage` — the exit package's sections. */
  exitPackage: {
    kind: 'record',
    members: {
      generatedAt: true,
      sections: true,
    },
  } satisfies PayloadShape<ExitPackage>,
};

/**
 * Reads a parsed body as the envelope every result carries, or `undefined` when it is not one.
 *
 * Three things are decided here: the envelope — a `meta` of the shape every result carries and a
 * `data` member that is present — the kind of the payload, which is a record of members or a list of
 * them, and the members the payload's own type declares. A JSON scalar or `null` is no payload any
 * member of the port returns, and a record without the members its type declares is not that record,
 * so both are refused through the same `undefined` this function answers for a broken envelope, and
 * become the same typed validation failure instead of reaching a screen whose fields then read as
 * nothing.
 *
 * The fields inside the payload are the port's typed contract, not this layer's, and this transport
 * keeps no second copy of a record shape: what it holds is `PAYLOADS`, a key map the compiler proves
 * is exactly the required members of each type `src/types` declares, so `src/types` remains the one
 * owner of every shape and the map cannot drift from it. A member added to or removed from a type
 * without the map following is a compile error rather than a validator that quietly disagrees.
 *
 * The payload is returned as it arrived. Nothing is added, dropped or recomputed, and the freshness
 * entries are carried through untouched so the screen that raises a stale banner reads the same
 * records the service reported (AAP 0.2.1).
 *
 * @param body - The parsed body of a 2xx answer.
 * @param shape - The payload's shape from `PAYLOADS`: the kind of value it is and the members its type
 * declares as required.
 * @returns The result the body carries, or `undefined` when the body is not one.
 */
function readResult<T>(body: unknown, shape: PayloadShape<T>): Result<T> | undefined {
  if (!isRecord(body)) {
    return undefined;
  }
  const meta = body['meta'];
  if (!isMeta(meta)) {
    return undefined;
  }
  const data = body['data'];
  if (!isPayloadOf(data, shape)) {
    return undefined;
  }
  return { data, meta };
}

/**
 * Whether a value is the metadata every result carries: the simulation marker as the literal `true`,
 * the freshness array and the correlation identifier (rule P-1). The freshness entries themselves
 * are the service's records and are passed on without inspection.
 */
function isMeta(value: unknown): value is Meta {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value['simulated'] === true &&
    Array.isArray(value['freshness']) &&
    typeof value['traceId'] === 'string'
  );
}

/**
 * Whether a record carries every member of a key map as an own property.
 *
 * `Object.hasOwn` reads the value's own members, so one inherited from a prototype — `toString`, or a
 * member of a prototype a body was built with — is not accepted in place of the member a type
 * declares. A member that is present and holds `null` is present: presence is what the type declares,
 * and a member's own value is the service's to answer for.
 *
 * @param value - The record to inspect.
 * @param members - The member names the payload's type declares, from `PAYLOADS`.
 * @returns Whether every one of them is an own property of the record.
 */
function carriesMembers(
  value: Readonly<Record<string, unknown>>,
  members: Readonly<Record<string, true>>,
): boolean {
  return Object.keys(members).every((name) => Object.hasOwn(value, name));
}

/**
 * Whether a value is a payload of the type its shape describes: a record carrying every member its
 * type declares as required, or a list whose every element does.
 *
 * A scalar — a string, a number, a boolean — and `null` are of neither kind, and an absent member
 * holds no payload at all, so each of them is refused here rather than returned as a record or a list
 * the caller's type says it received. An empty list is a valid payload of a list type: a caller whose
 * selection matched nothing is answered with one, and the elements are the only thing a list's shape
 * has to say.
 *
 * @param value - The parsed `data` member of a response body.
 * @param shape - The payload's shape from `PAYLOADS`.
 * @returns Whether the value carries the members, narrowing it to the payload type.
 */
function isPayloadOf<T>(value: unknown, shape: PayloadShape<T>): value is T {
  if (shape.kind === 'list') {
    if (!Array.isArray(value)) {
      return false;
    }
    // Read as `unknown[]` so an element is inspected as the unknown value it is, the same way
    // `asRoles` reads a reported list rather than letting its element type leak into the check.
    const entries: unknown[] = value;
    return entries.every((entry) => isRecord(entry) && carriesMembers(entry, shape.members));
  }
  return isRecord(value) && carriesMembers(value, shape.members);
}

/** Whether a value is an object of members, which is the shape a response body has to have. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/* ---------------------------------------------------------------------------------------------
 * Mapping a failure — platform-contracts.md §2, AAP 0.12.3, rule P-8
 * ------------------------------------------------------------------------------------------- */

/** The five causes contracts §2 fixes; the whole vocabulary a failure may name. */
const PROBLEM_TYPES: readonly ProblemType[] = [
  'permission',
  'policy',
  'validation',
  'simulated-write-back',
  'not-found',
];

/** The status code of a call whose caller is not recognised. */
const STATUS_UNRECOGNISED = 401;

/**
 * The status code of a call the service refuses, which reads as a policy block when no body names
 * the cause.
 */
const STATUS_REFUSED = 403;

/** The status code of a call naming no record that exists. */
const STATUS_MISSING = 404;

/** The first status code of the class the service answers with when it cannot answer the call. */
const STATUS_SERVER_FAULT_FLOOR = 500;

/** Whether a reported value is one of the five causes a failure may name. */
function isProblemType(value: unknown): value is ProblemType {
  return typeof value === 'string' && (PROBLEM_TYPES as readonly string[]).includes(value);
}

/** Whether a reported value is one of the permission names of the contracts §7.1 matrix. */
function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value);
}

/**
 * The roles a failure reports, or `undefined` when the member is not a list of role names.
 *
 * The role vocabulary is `src/types/entities.ts`'s, and this module does not restate it: a list of
 * non-empty strings is taken as the roles it names, and a member of another shape is dropped rather
 * than passed on as a role the interface would then print.
 */
function asRoles(value: unknown): Role[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const entries: unknown[] = value;
  const roles: Role[] = [];
  for (const entry of entries) {
    if (typeof entry !== 'string' || entry === '') {
      return undefined;
    }
    roles.push(entry as Role);
  }
  return roles;
}

/**
 * Reads a response body as the failure the service reported, or `undefined` when it is not one.
 *
 * The body's cause decides whether it is read at all: only a `type` among the five the contracts fix
 * is accepted, so a body of another shape falls through to the status mapping below instead of
 * inventing a cause. Every cause member the body carries is preserved, because a permission denial
 * and a policy block each reach a screen that explains them from those members (rule P-8). A
 * missing reason is replaced with this module's sentence, and a correlation identifier the body does
 * not state — absent or empty, which are the same absence here — with the identifier of the call: the
 * one its response header carried, or the one minted for it when the answer carried none. A body that
 * states a non-empty identifier always wins, so the service's own value is never replaced by one from
 * this end.
 */
function problemFromBody(
  body: unknown,
  path: string,
  status: number,
  callTraceId: string,
): Problem | undefined {
  if (!isRecord(body)) {
    return undefined;
  }
  const type = body['type'];
  if (!isProblemType(type)) {
    return undefined;
  }

  const reportedMessage = body['message'];
  const reportedTrace = body['traceId'];
  const traceId =
    typeof reportedTrace === 'string' && reportedTrace !== '' ? reportedTrace : callTraceId;
  const problem: Problem = {
    type,
    message:
      typeof reportedMessage === 'string' && reportedMessage !== ''
        ? reportedMessage
        : diagnostic(path, status),
    traceId,
  };

  const requiredPermission = body['requiredPermission'];
  if (isPermission(requiredPermission)) {
    problem.requiredPermission = requiredPermission;
  }

  const roles = asRoles(body['rolesWithPermission']);
  if (roles !== undefined) {
    problem.rolesWithPermission = roles;
  }

  const policyId = body['policyId'];
  if (typeof policyId === 'string' && policyId !== '') {
    problem.policyId = policyId;
  }

  const permittedAlternative = body['permittedAlternative'];
  if (typeof permittedAlternative === 'string' && permittedAlternative !== '') {
    problem.permittedAlternative = permittedAlternative;
  }

  const auditEventId = body['auditEventId'];
  if (typeof auditEventId === 'string' && auditEventId !== '') {
    problem.auditEventId = auditEventId;
  }

  return problem;
}

/**
 * The cause a status code reports when the body named none.
 *
 * `401` is a missing permission and `404` is a record that does not exist. `403` is a policy block:
 * a refusal that arrives without the envelope is still the refusal of a rule, so it reaches the
 * policy card with that cause rather than the permission card, which would report a permission the
 * reader never lacked (rule P-8). `400`, `422` and every other status the map does not name —
 * `5xx` included — take the nearest of the five causes, a validation of the call, and a connection
 * that never opened takes the same one. That cause says which of the five the failure belongs to,
 * never which side of the exchange failed, so `diagnostic` adds the second part in words for the one
 * class that needs it: a `5xx` answer names the service as the side that failed to answer the call.
 * The five causes are closed (AAP 0.2.2, AAP 0.12.3), so no sixth is invented for a status they do
 * not name.
 */
function typeForStatus(status: number): ProblemType {
  if (status === STATUS_UNRECOGNISED) {
    return 'permission';
  }
  if (status === STATUS_REFUSED) {
    return 'policy';
  }
  if (status === STATUS_MISSING) {
    return 'not-found';
  }
  return 'validation';
}

/**
 * This module's sentence for a failure: the status code, the path, and the one addition a `5xx`
 * needs, and never the body.
 *
 * The sentence is the whole of what this module can say about a failure the service did not
 * explain, so it stays truthful for every status. A `5xx` names the service as the side that failed,
 * because that status is the one class whose cause — the nearest of the five, `'validation'` — would
 * otherwise be read as a fault in the call the reader made. Every other status keeps the neutral
 * sentence, whose cause already names what it can: an unauthenticated caller is not helped by being
 * told the call itself was at fault. It quotes no member of the body, and it names no host, port or
 * address, because the target is a path of this origin (rule B-1).
 */
function diagnostic(path: string, status: number): string {
  if (status >= STATUS_SERVER_FAULT_FLOOR) {
    return (
      `The service answered ${status} for ${path}, ` +
      'which is the service failing to answer the call.'
    );
  }
  return `The service answered ${status} for ${path}.`;
}

/**
 * The failure a non-2xx answer becomes: the service's own `Problem` when the body reported one, and
 * this module's diagnostic otherwise.
 */
function failure(
  path: string,
  status: number,
  body: BodyRead,
  callTraceId: string,
): ProblemError {
  const reported = body.readable
    ? problemFromBody(body.value, path, status, callTraceId)
    : undefined;
  if (reported !== undefined) {
    return new ProblemError(reported);
  }
  return new ProblemError({
    type: typeForStatus(status),
    message: diagnostic(path, status),
    traceId: callTraceId,
  });
}
