// @vitest-environment node

/**
 * What the API client does at the transport boundary, driven against a stubbed `fetch`.
 *
 * WHY THIS SUITE EXISTS. `src/services/service-conformance.test.ts` proves that both adapters satisfy the
 * port, and `src/services/mock/mock-backend.test.ts` proves what the demonstration adapter does; nothing
 * exercised the client's own members, so a member that threw, sent nothing or sent the wrong read
 * survived every gate (AAP 0.12.3). The cases here cover the duties AAP 0.12.3 and AAP 0.18.1 put on a
 * call and that only a call can show: the three browser-built exports resolve a download payload rather
 * than reporting an absence, a call takes at least the floor of the band both adapters share, and a failed
 * call names itself with a correlation identifier even when no answer carried one.
 *
 * HOW THE SERVICE IS SIMULATED. `globalThis.fetch` is replaced by a stub that answers a valid
 * `{ data, meta }` envelope per path — the transport refuses anything else (rule P-1) — and records the
 * URLs it was asked for. Every payload carries the members its type declares, which is the other half
 * of what the transport checks (AAP 0.12.3): the suite asserts what crosses the boundary and which
 * reads were made, never a figure, so every member holds the neutral value of its type and no expected
 * value of the domain is restated here (rule P-6). A case that needs a different answer — a payload
 * that does not carry those members — puts its own stub in place for the length of that case.
 *
 * WHY THE NODE ENVIRONMENT, ON THE FIRST LINE ABOVE. Nothing here renders, and the suite measures a
 * timer: the Node environment gives it the platform's own `setTimeout` and `Response` without a DOM to
 * stand between them.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It asserts nothing about the demonstration adapter, the seed, the
 * domain or a component. It reads no file and no environment value (rules B-2), it names no origin —
 * every path the stub sees is relative to the application's own (rule B-1), and the host-shaped
 * targets the transport's guard refuses are handed to it and never reach the stub — and it calls no
 * real network: the stub is the only `fetch` this module ever reaches.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from './api-client';
import { PAYLOADS, request } from './http';
import type { Problem, Scope } from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The stub service
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every stubbed answer carries, so a result's `meta` is well formed. */
const TRACE_ID = 'TRC-000000';

/**
 * The floor of the band both adapters apply, in milliseconds, and the tolerance a measured duration is
 * allowed below it.
 *
 * The floor is restated here rather than imported, because it is a private constant of the transport and
 * a suite that read it from there would pass whatever the transport set it to. The tolerance is room for
 * the difference between the timer's resolution and the clock a measurement reads, and nothing more.
 */
const BAND_FLOOR_MS = 150;
const FLOOR_TOLERANCE_MS = 25;

/** The exception the comparison export is asked for: a stub value, not a record of the seed. */
const EXPORTED_EXCEPTION = 'exception-under-test';

/**
 * The one scenario the stub's set holds, so the comparison has a column to render.
 *
 * Every measure is the neutral value of its type: the suite asserts what crosses the boundary and which
 * reads were made, never a figure of the domain, so no expected value of the seed or of the solver is
 * restated here (rule P-6).
 */
const STUB_SCENARIO = {
  id: 'scenario-under-test',
  exceptionId: EXPORTED_EXCEPTION,
  name: 'Stub option',
  origin: 'solver',
  unitsLate: 0,
  maxDaysLate: 0,
  ordersOnTime: 0,
  ordersTotal: 0,
  addedCostEur: 0,
  lineIdleDays: 0,
  revenueDelayedEur: 0,
  runOut: { day: 0, fractionOfDay: 0 },
  dailyClosingStock: [],
  orders: [],
  constraintCheck: 'pass',
  constraintMessages: [],
  sideEffects: [],
  writeBacks: [],
  levers: { airSets: 0, transferSets: 0 },
  confidence: { level: 'high', reason: 'the stub states none' },
};

/** The arguments the platform's request function takes, taken from it so they cannot drift. */
type FetchArguments = Parameters<typeof fetch>;

/** The URLs the stub was asked for, in the order it was asked, cleared before each case. */
const requestedUrls: string[] = [];

/**
 * The URL of one call, whatever form the transport handed it in: this adapter passes a path, and a
 * `Request` or a `URL` is read the same way rather than reported as an empty target.
 */
function urlOf(input: FetchArguments[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.toString() : input.url;
}

/**
 * The payload the stubbed service answers for one path: a minimal, well-formed record of the family
 * that path serves.
 *
 * Each member is what the member that reads it needs and no more: the sovereignty payload carries a
 * summary and rows, the chain verification a count, a list of breaks and its duration, the scenario set
 * one scenario and the rejected options beside it, and the atlas the pack's release label with its
 * competitors and crossings. Every member the family's type declares is present, because the transport
 * validates them (AAP 0.12.3) and answers a payload missing one as the validation failure it is; each
 * holds the neutral value of its type, so no figure of the domain is restated here (rule P-6).
 */
function payloadFor(url: string): unknown {
  // The path alone: a list read appends its parameters, and the payload a path serves does not depend
  // on the page a caller asked for.
  const path = url.split('?')[0] ?? url;

  if (path.endsWith('/sovereignty/outbound-ledger')) {
    return [];
  }

  if (path.endsWith('/sovereignty')) {
    return { summary: {}, rows: [], ledger: [] };
  }

  if (path.endsWith('/policies') || path.endsWith('/evidence-pins') || path.endsWith('/packages')) {
    return [];
  }

  if (path.endsWith('/audit-events/verify')) {
    return { eventsChecked: 0, breaks: [], durationMs: 0 };
  }

  if (path.includes('/audit-events')) {
    return [];
  }

  if (path.includes('/scenarios')) {
    return {
      exceptionId: EXPORTED_EXCEPTION,
      scenarios: [STUB_SCENARIO],
      recommendedId: STUB_SCENARIO.id,
      recommendationRule: 'the stub recommends its only option',
      tradeOff: 'the stub states none',
      rejected: [],
    };
  }

  if (path.includes('/market-intelligence/atlas')) {
    return {
      packLabel: 'stub pack banner',
      packVersion: 'pack-under-test',
      productClasses: [],
      clientSites: [],
      competitors: [],
      chokepoints: [],
      radarAxes: [],
      radarSeries: [],
    };
  }

  return {};
}

/**
 * Replaces the platform's request function with a stub that records the path it was given and answers
 * that path's envelope.
 *
 * @param payload - The payload every answer carries, for a case whose answer the path's own payload
 * cannot give; absent means the payload `payloadFor` composes for the path.
 * @returns The spy, so a case can assert how a member was called.
 */
function stubService(payload?: unknown): ReturnType<typeof vi.fn> {
  const stub = vi.fn((input: FetchArguments[0]) => {
    const url = urlOf(input);

    requestedUrls.push(url);

    return Promise.resolve(
      new Response(JSON.stringify({ data: payload ?? payloadFor(url), meta: metaEnvelope() }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  vi.stubGlobal('fetch', stub);

  return stub;
}

/**
 * The metadata a stubbed answer carries: no source consulted, the simulation marker the envelope
 * requires as the literal `true`, and the correlation identifier.
 */
function metaEnvelope(): Record<string, unknown> {
  return { freshness: [], simulated: true, traceId: TRACE_ID };
}

/** The paths the stub was asked for, sorted, so a case compares them without depending on timing. */
function requestedPaths(): string[] {
  return [...requestedUrls].sort();
}

/** The payload of a JSON export, parsed, so a case can assert the document rather than its text. */
function documentOf(content: string): unknown {
  return JSON.parse(content);
}

/**
 * The failure a call throws, so a case can assert the members a card renders rather than the call.
 *
 * @param call - The promise a client member already started; the stub has to be in place before it is
 * made, so the case starts the call and hands the promise here.
 * @returns The typed failure the call threw.
 */
async function failureOf(call: Promise<unknown>): Promise<Problem> {
  try {
    await call;
  } catch (error) {
    return error as Problem;
  }

  throw new Error('the call resolved where the case expected it to fail');
}

/** Undoes the stub and forgets the paths one case recorded, so no case sees another's calls. */
afterEach(() => {
  vi.unstubAllGlobals();
  requestedUrls.length = 0;
});

/* ---------------------------------------------------------------------------------------------
 * The exports — contracts §11, AAP 0.12.1 "Exports", AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

describe('the browser-built exports on the API client', () => {
  it('resolves each export as a download payload rather than reporting an absence', async () => {
    stubService();

    const client = new ApiClient();

    const brief = await client.exportChokepointBrief();
    const comparison = await client.exportScenarioComparison(EXPORTED_EXCEPTION);
    const pack = await client.exportEvidencePack();

    // The JSON payloads: a suggested JSON file name, the JSON media type, and the simulation marker at
    // the document's top level (AAP 0.12.1, rule P-1).
    expect(pack.data.mediaType).toBe('application/json');
    expect(pack.data.filename.endsWith('.json')).toBe(true);
    expect(documentOf(pack.data.content)).toMatchObject({ simulated: true });

    expect(brief.data.mediaType).toBe('application/json');
    expect(brief.data.filename.endsWith('.json')).toBe(true);
    expect(documentOf(brief.data.content)).toMatchObject({ simulated: true, packVersion: 'pack-under-test' });

    // The comparison: the CSV media type, a name carrying the exception it compares, and the set's own
    // scenario as a column (AAP 0.6.3).
    expect(comparison.data.mediaType).toBe('text/csv;charset=utf-8');
    expect(comparison.data.filename).toContain(EXPORTED_EXCEPTION);
    expect(comparison.data.content).toContain(STUB_SCENARIO.name);

    // Every payload carries the envelope of the read that led its composition: the marker, the empty
    // freshness list of a source-less answer, and the correlation identifier the service reported.
    expect(pack.meta.simulated).toBe(true);
    expect(pack.meta.traceId).toBe(TRACE_ID);
  });

  it('requests the reads each composition needs', async () => {
    stubService();

    const client = new ApiClient();

    await client.exportScenarioComparison(EXPORTED_EXCEPTION);

    expect(requestedPaths()).toEqual([`/api/v1/exceptions/${EXPORTED_EXCEPTION}/scenarios`]);

    requestedUrls.length = 0;
    await client.exportChokepointBrief();

    expect(requestedPaths()).toEqual(['/api/v1/market-intelligence/atlas']);

    requestedUrls.length = 0;
    await client.exportEvidencePack();

    // The four reads the document is composed from, and nothing else: the declared configuration, the
    // outbound ledger, the audit trail and its verification.
    expect(requestedPaths()).toEqual([
      '/api/v1/audit-events',
      '/api/v1/audit-events/verify',
      '/api/v1/sovereignty',
      '/api/v1/sovereignty/outbound-ledger',
    ]);
  });

  it('waits at least the band floor before it sends a call', async () => {
    const stub = stubService();

    const client = new ApiClient();
    const startedAt = performance.now();

    await client.getSovereigntyStatus();

    const elapsed = performance.now() - startedAt;

    // AAP 0.12.3: the swap between the adapters has to be invisible, so a client call takes at least the
    // floor of the band the demonstration adapter takes — the ladder never waits less than that.
    expect(stub).toHaveBeenCalledTimes(1);
    expect(elapsed).toBeGreaterThanOrEqual(BAND_FLOOR_MS - FLOOR_TOLERANCE_MS);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The list parameters of the four collection reads — contracts §9, AAP 0.6.3 and AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The page, the position and the ordering the case below asks a read for.
 *
 * A caller's own parameters rather than figures of the domain: the case states them and expects them
 * back on the request unchanged, so nothing about a record is restated here (rule P-6).
 */
const LIST_LIMIT = 3;
const LIST_CURSOR = 'a-position';
const LIST_SORT = 'id:desc';

/**
 * The query parameters one requested target carried, decoded back to the values the caller passed.
 *
 * Read out of the URL rather than through the serialiser's own rules, so the case proves what the
 * transport sent: a member the adapter dropped or renamed is missing from the result, and one it
 * encoded differently decodes to a value other than the one it was given.
 *
 * @param url - The target the stub was asked for.
 * @returns The parameters that target carried, by name.
 */
function queryOf(url: string): Record<string, string> {
  const separator = url.indexOf('?');
  const search = separator < 0 ? '' : url.slice(separator + 1);
  const parameters: Record<string, string> = {};

  for (const part of search.split('&')) {
    const [name, value] = part.split('=');

    if (name === undefined || value === undefined) {
      continue;
    }

    parameters[decodeURIComponent(name)] = decodeURIComponent(value);
  }

  return parameters;
}

describe('the list parameters of the collection reads', () => {
  it('sends limit, cursor and sort on each collection read', async () => {
    stubService();

    const client = new ApiClient();
    const query = { limit: LIST_LIMIT, cursor: LIST_CURSOR, sort: LIST_SORT };

    await client.getOutboundLedger(query);
    await client.listPolicies(query);
    await client.listPins(query);
    await client.listPackages(query);

    // One request per read, each on its own §9 path with the parameters the caller passed and nothing
    // else added: the target is a path on this application's own origin (rule B-1), and the three
    // members are what contracts §9 fixes for a list read (AAP 0.6.3, AAP 0.12.3).
    expect(
      requestedUrls.map((url) => {
        const separator = url.indexOf('?');

        return separator < 0 ? url : url.slice(0, separator);
      }),
    ).toEqual([
      '/api/v1/sovereignty/outbound-ledger',
      '/api/v1/policies',
      '/api/v1/evidence-pins',
      '/api/v1/packages',
    ]);

    for (const url of requestedUrls) {
      expect(queryOf(url)).toEqual({
        limit: String(LIST_LIMIT),
        cursor: LIST_CURSOR,
        sort: LIST_SORT,
      });
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The identifier a failed call carries — AAP 0.18.1 "Trace and diagnostics", rule P-8
 * ------------------------------------------------------------------------------------------- */

describe('the correlation identifier of a failed call', () => {
  it('names each failed call when the answer carries no identifier', async () => {
    const client = new ApiClient();

    // A call the service never answers: with no response there is no header and no body to take an
    // identifier from, which is the one case the transport has to name itself.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('the stub answered nothing'))),
    );
    const unreached = await failureOf(client.getSovereigntyStatus());

    // A refusal that carries none either: a non-2xx answer without the correlation header.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 500 }))),
    );
    const refused = await failureOf(client.getSovereigntyStatus());

    // AAP 0.18.1: the member is the diagnostic every `Problem` carries and every card renders, so an
    // empty one leaves a reader nothing to quote. Two failures of one run are two calls, so each names
    // itself and neither answers with the other's identifier.
    expect(unreached.traceId).not.toBe('');
    expect(refused.traceId).not.toBe('');
    expect(unreached.traceId).not.toBe(refused.traceId);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The members a payload has to carry — AAP 0.12.3, rule P-1
 * ------------------------------------------------------------------------------------------- */

/**
 * The selection the overview read is asked for: no filter on either axis, which is the shell's
 * unfiltered selection rather than a record of the domain (rule P-6).
 */
const UNFILTERED_SELECTION: Scope = { plants: [], products: [] };

/**
 * The overview the stub answers when a case needs a well-formed one: every member the type declares,
 * each holding the neutral value of its type (rule P-6).
 */
const STUB_OVERVIEW = {
  openExceptions: 0,
  revenueAtRiskEur: 0,
  customerOrdersAtRisk: 0,
  medianHoursToApprovedPlan: 0,
  alternateSourceReadinessPercent: 0,
  changedSinceLastVisit: [],
  byPlant: [],
  openResolvedSeries: [],
};

/**
 * Two answers the overview's type does not accept: an empty record, which carries none of the members
 * `Overview` declares, and one carrying a single member of the eight.
 *
 * Neither states a figure of the domain: the case asserts the failure the transport raises, never a
 * value it refused (rule P-6).
 */
const MALFORMED_OVERVIEWS: [string, unknown][] = [
  ['an empty record', {}],
  ['a record carrying one member of the type', { changedSinceLastVisit: [] }],
];

describe('the members a payload has to carry', () => {
  it.each(MALFORMED_OVERVIEWS)(
    'refuses %s as a typed validation failure',
    async (_label: string, payload: unknown) => {
      const stub = stubService(payload);

      const client = new ApiClient();
      const refusal = await failureOf(client.getOverview(UNFILTERED_SELECTION));

      // AAP 0.12.3 and rule P-1: a body that is the envelope but not the record its type declares is
      // the same typed `'validation'` failure a body without an envelope produces, so no typed consumer
      // downstream ever reads a member the service did not send.
      expect(refusal.type).toBe('validation');
      expect(refusal.traceId).not.toBe('');
      expect(stub).toHaveBeenCalledTimes(1);
    },
  );

  it('resolves a payload that carries every member its type declares', async () => {
    stubService(STUB_OVERVIEW);

    const client = new ApiClient();
    const overview = await client.getOverview(UNFILTERED_SELECTION);

    expect(overview.data).toEqual(STUB_OVERVIEW);
  });

  it('refuses a record where the type declares a list', async () => {
    stubService({});

    const client = new ApiClient();
    const refusal = await failureOf(client.listPolicies({}));

    // A list type is answered with an array and never with a record, so the kind of the payload is
    // refused here for the same reason its members are: a screen that maps over the answer would
    // otherwise walk a record's members as if they were the records it asked for.
    expect(refusal.type).toBe('validation');
  });

  it('refuses a list whose element does not carry the members its type declares', async () => {
    stubService([{}]);

    const client = new ApiClient();
    const refusal = await failureOf(client.listPolicies({}));

    // Every element is the list's record type, so one element missing that type's members is refused
    // as the whole answer: a screen renders the list it was given, and one unchecked element reaches
    // it as a row whose cells read nothing.
    expect(refusal.type).toBe('validation');
  });
});

/* ---------------------------------------------------------------------------------------------
 * The same-origin guard of the transport — rule B-1
 * ------------------------------------------------------------------------------------------- */

/**
 * Targets the URL parser that sends a call would resolve to another origin, none of which is a path of
 * this application's own.
 *
 * The parser reads a backslash as a slash for the special schemes a page is served over, and removes an
 * ASCII tab, carriage return or line feed from its input altogether, so each of these three spells a
 * protocol-relative address while the raw text begins with a single slash.
 */
const OTHER_ORIGIN_TARGETS: string[] = [
  '/\\evil.example/x',
  '//evil.example/x',
  '/\t/evil.example/x',
];

describe('the same-origin guard of the transport', () => {
  it.each(OTHER_ORIGIN_TARGETS)('refuses %s before it sends anything', async (target: string) => {
    const stub = stubService();

    const refusal = await failureOf(request(target, { payload: PAYLOADS.overview }));

    // Rule B-1: the containment is a check on the target rather than a convention about what callers
    // pass, so a target the parser would read as another origin's address never leaves this module.
    expect(refusal.type).toBe('validation');
    expect(stub).not.toHaveBeenCalled();
  });

  it('sends a path whose backslash is past the first character', async () => {
    const stub = stubService(STUB_OVERVIEW);

    await request('/api/v1/over\\view', { payload: PAYLOADS.overview });

    // The parser reads that backslash as a slash of this origin's own path, so the target is a path
    // here and is sent as the caller wrote it.
    expect(stub).toHaveBeenCalledTimes(1);
    expect(requestedUrls).toEqual(['/api/v1/over\\view']);
  });
});
