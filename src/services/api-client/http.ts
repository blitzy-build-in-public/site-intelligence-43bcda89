/**
 * The transport of the service port's second adapter: one function that sends a same-origin request
 * and answers with the envelope every result carries, or throws the typed failure every call can
 * produce (`platform-contracts.md` §2 and §9; AAP 0.12.1 "API client" row; AAP 0.12.3).
 *
 * The target is a path, never an address. The caller passes a constant from `paths.ts`, this module
 * sends it unchanged and appends only the encoded query its arguments describe, so every request
 * reaches the origin that served the application and none reaches another (rule B-1). A target that
 * is not rooted at the application origin is refused here rather than sent, which makes that
 * containment a check instead of a convention. There is no base origin, no host, no port and no
 * second target in this file, and a call that fails is never repeated against one.
 *
 * Nothing identifies a caller. The request carries the two media-type headers a JSON call needs,
 * and no member of it carries an identity, a session or a preference: the authority behind a call
 * comes from the service that answers it, never from a value this file supplies (rule B-2).
 *
 * The envelope is validated rather than assumed (rule P-1). A success is returned only when the body
 * holds `data` and a `meta` whose `simulated` member is the literal `true`, whose `freshness` is an
 * array and whose `traceId` is a string; a body that fails those checks is refused as a
 * `'validation'` failure instead of reaching a screen looking like a live result. The marker is read
 * and passed on unchanged, and this file holds no simulation label of its own: the seven fixed
 * strings live in `src/types/primitives.ts` and belong to the components that render them.
 *
 * The correlation identifier is received, never produced. `traceId` comes from the response body,
 * else from the response header, else it is the empty string; nothing here reads the clock or a
 * random source, so the same response yields the same failure on every run (AAP 0.2.1).
 *
 * It adds no latency and withholds nothing. Artificial delay is the mock adapter's duty, so loading
 * states stay observable (AAP 0.12.1), and redaction belongs to the service that holds the records:
 * this module sends a call and reports what came back, without sleeping, repeating or filtering.
 *
 * Shapes only (rule P-6): the only numerals in this file are the response status codes its failure
 * mapping reads. They are protocol constants that classify a transport outcome and are never shown
 * as a value, so none of them is a figure of the domain.
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
  AuditEventId,
  Meta,
  Permission,
  PolicyId,
  Problem,
  ProblemType,
  Result,
  Role,
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
 * not the envelope, a call that never arrived, a target that is not a relative path — it is this
 * module's sentence naming the status code and the path, and it never quotes the body it could not
 * use.
 *
 * The instance describes one call and states nothing about the records behind it (rule P-4).
 */
export class ProblemError extends Error implements Problem {
  /** Which cause the failure names, one of the five the contracts fix. */
  readonly type: ProblemType;

  /** The correlation identifier of the call that failed, as the service reported it. */
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
 * not describe. There is no member for a header, a mode, an identity or a deadline: a call is sent
 * as it is described here and nothing else is attached to it (rules B-1, B-2).
 *
 * @typeParam Q - The query shape of the call, an interface such as `ExceptionQuery` or the default
 * empty record when the call carries no parameters.
 */
export interface RequestOptions<Q extends object> {
  /** The method to send; absent means `GET`. */
  readonly method?: 'GET' | 'POST';

  /**
   * The parameters to append, serialised by `request` from the members that hold a representable
   * value. `sort` travels exactly as the caller writes it, because contracts §9 fixes it as
   * `field:dir`; no member is read as a field path, a range or a structured filter.
   */
  readonly query?: Q;

  /** The payload to send as JSON; absent means the call has no body. */
  readonly body?: unknown;
}

/* ---------------------------------------------------------------------------------------------
 * The request — platform-contracts.md §2 and §9, AAP 0.12.1 and 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * Sends one call to a path of the service and resolves to the envelope the service answers with.
 *
 * The steps, in the order this function performs them:
 *
 * 1. Refuse a target that is not rooted at the application origin (rule B-1). Only a path beginning
 *    with a single slash is sent, so a caller cannot make this transport address another host by
 *    handing it an address where a path belongs.
 * 2. Serialise the query: every own enumerable member whose value is a non-empty string, a finite
 *    number or a boolean, with the name and the value both encoded, joined with `&` and prefixed
 *    with `?` when at least one survives. A member holding `null`, `undefined`, an empty string, a
 *    non-finite number, an array, a nested object or a function is left out rather than rendered,
 *    because contracts §9 fixes no list or range syntax for a query parameter and a shape it does
 *    not describe is omitted instead of being flattened into something the service never asked for.
 * 3. Send it: `GET` unless a method was given, a JSON content type only beside a body, a JSON accept
 *    header always, and no member that would identify a client or repeat a failed call.
 * 4. Read the answer as JSON. A 2xx body that is not the `{ data, meta }` envelope — `data` absent,
 *    `meta` not an object, `meta.simulated` not the literal `true`, `meta.freshness` not an array,
 *    `meta.traceId` not a string — is refused as a `'validation'` failure, which is the guard behind
 *    the disclosure rule: a response that does not say it is simulated never reaches a screen as if
 *    it were live (rule P-1). Every other 2xx answer is returned as it arrived, with no member
 *    added, dropped or recomputed.
 * 5. Map a failure to a `Problem` carrying the reason a reader needs (rule P-8). A body the service
 *    wrote in the failure shape is preferred, and every cause it carries is preserved; when there
 *    is none, the status code decides: `401` and `403` name a missing permission, `404` a record
 *    that does not exist, and `400`, `422` and every other status a validation of the call. The five
 *    causes contracts §2 fixes are the whole vocabulary, so no sixth is invented for a status the
 *    set does not describe.
 * 6. Report the correlation identifier it received: the response body's, else the response
 *    header's, else the empty string. Nothing here mints one, so a failure names a call the service
 *    can find rather than a value invented at this end.
 *
 * A rejected call — no network, no answer, an aborted request — becomes a `'validation'` failure
 * naming the path and carrying the rejection as its `cause`. The call is not repeated, no second
 * target is tried, and no origin or host appears in the message.
 *
 * @typeParam T - The payload the envelope carries.
 * @typeParam Q - The query shape of the call, `Record<string, never>` when it takes no parameters.
 * @param path - The target: a constant or a built path from `src/services/api-client/paths.ts`.
 * @param options - The method, the query and the payload of the call.
 * @returns The service's `Result<T>`, carrying the payload and its metadata exactly as the response
 * carried them.
 * @throws ProblemError - The typed failure, whose `type` names its cause.
 */
export async function request<T, Q extends object = Record<string, never>>(
  path: string,
  options?: RequestOptions<Q>,
): Promise<Result<T>> {
  if (!isRelativePath(path)) {
    throw new ProblemError({
      type: 'validation',
      message: 'The request target is not a path relative to the application origin.',
      traceId: '',
    });
  }

  const query = options?.query;
  const target = query === undefined ? path : `${path}${serialiseQuery(query)}`;
  const payload = options?.body;

  const init: RequestInit = {
    method: options?.method ?? 'GET',
    headers: requestHeaders(payload !== undefined),
  };
  if (payload !== undefined) {
    init.body = JSON.stringify(payload);
  }

  let response: Response;
  try {
    response = await fetch(target, init);
  } catch (cause) {
    throw new ProblemError(
      {
        type: 'validation',
        message: `The request to ${path} did not reach the service.`,
        traceId: '',
      },
      cause,
    );
  }

  const headerTraceId = response.headers.get(TRACE_ID_HEADER) ?? '';
  const body = await readBody(response);

  if (!response.ok) {
    throw failure(path, response.status, body, headerTraceId);
  }

  if (!body.readable) {
    throw new ProblemError({
      type: 'validation',
      message:
        `The service answered ${response.status} for ${path} ` +
        'with a body that could not be read as JSON.',
      traceId: headerTraceId,
    });
  }

  const result = readResult<T>(body.value);
  if (result === undefined) {
    throw new ProblemError({
      type: 'validation',
      message:
        `The service answered ${response.status} for ${path} ` +
        'without the data and meta envelope a result carries.',
      traceId: headerTraceId,
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
 * Whether a target is a path of the application's own origin.
 *
 * A path begins with one slash. A leading pair of slashes addresses a host instead, so it is
 * refused, and a full address beginning with a scheme never reaches this test because it does not
 * begin with a slash at all. The check is what keeps the same-origin property structural rather
 * than promised (rule B-1).
 */
function isRelativePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith(AUTHORITY_PREFIX);
}

/**
 * Renders a query shape as the parameter string a call appends, `''` when nothing survives.
 *
 * The ordering parameter contracts §9 writes as `field:dir` travels exactly as the caller wrote it:
 * it is encoded with the rest of the value rather than parsed, split or reordered, and no member is
 * interpreted as a field path.
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
 * express. A shape contracts §9 does not describe — an array, a nested object, a function — is
 * omitted rather than flattened, so a parameter never changes meaning on its way to the service.
 */
function queryValue(value: unknown): string | undefined {
  switch (typeof value) {
    case 'string':
      return value === '' ? undefined : value;
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
 * Reads a parsed body as the envelope every result carries, or `undefined` when it is not one.
 *
 * The payload is returned as it arrived. Nothing is added, dropped or recomputed, and the freshness
 * entries are carried through untouched so the screen that raises a stale banner reads the same
 * records the service reported (AAP 0.2.1).
 */
function readResult<T>(body: unknown): Result<T> | undefined {
  if (!isRecord(body)) {
    return undefined;
  }
  if (!isMeta(body['meta'])) {
    return undefined;
  }
  if (!Object.hasOwn(body, 'data')) {
    return undefined;
  }
  return body as unknown as Result<T>;
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

/** The status code of a call the caller is not permitted to make. */
const STATUS_REFUSED = 403;

/** The status code of a call naming no record that exists. */
const STATUS_MISSING = 404;

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
 * missing reason is replaced with this module's sentence, and a missing correlation identifier with
 * the one the response header carried.
 */
function problemFromBody(
  body: unknown,
  path: string,
  status: number,
  headerTraceId: string,
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
    typeof reportedTrace === 'string' && reportedTrace !== '' ? reportedTrace : headerTraceId;
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
 * `401` and `403` are a missing permission and `404` is a record that does not exist; `400`, `422`
 * and every other status are reported as a validation of the call. The five causes are closed, so a
 * status outside those ranges is described by the nearest cause rather than by a new one.
 */
function typeForStatus(status: number): ProblemType {
  if (status === STATUS_UNRECOGNISED || status === STATUS_REFUSED) {
    return 'permission';
  }
  if (status === STATUS_MISSING) {
    return 'not-found';
  }
  return 'validation';
}

/** This module's sentence for a failure: the status code and the path, and never the body. */
function diagnostic(path: string, status: number): string {
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
  headerTraceId: string,
): ProblemError {
  const reported = body.readable
    ? problemFromBody(body.value, path, status, headerTraceId)
    : undefined;
  if (reported !== undefined) {
    return new ProblemError(reported);
  }
  return new ProblemError({
    type: typeForStatus(status),
    message: diagnostic(path, status),
    traceId: headerTraceId,
  });
}
