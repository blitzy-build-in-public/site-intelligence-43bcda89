/**
 * Component suite for `sovereignty-screen.tsx`, SCR-07 Sovereignty and policies.
 *
 * WHAT IT PROVES. Each case states a contract the screen is relied on for rather than a description
 * of its markup: that the declaration and the policy set are read once through the port and nothing
 * is written; that every declared row carries the exact specification §5.3 `Declared, not verified`
 * label *on the row itself*, read with `within(row)` so a page-level marker could not satisfy it, and
 * that the deployment summary carries it beside them (rule P-4); that the row count is the payload's
 * rather than a number written into the screen, proved by rendering a second payload of a different
 * length; that each row's status reaches the page as an icon, the record's own word and the status
 * role colour together (rule B-3); that the outbound ledger prints its six columns and each row's own
 * endpoint, purpose, state, instant and two counts, with the fixed label a computed figure carries
 * (rule P-1); that the export action calls the port once and hands the payload the service returned to
 * the browser's download path unchanged, `simulated: true` included; that the grant action opens the
 * dialog named by its own heading and closes without sending a request; that one row per recorded
 * decision renders the event's own values, most recent first; that a policy row opens that policy's
 * route; that the seven states specification §8 fixes each render from the read's own outcome; that a
 * grant control which cannot act is disabled with its reason reachable from the keyboard (rule P-8);
 * that nothing the screen was not given reaches the page, so no claim about the deployment can arrive
 * unasserted (rule P-4); that both themes render the same declaration and the same two actions; and
 * that both actions are reached with `Tab` and show the focus ring (rule B-3, T-16).
 *
 * WHERE THE DATA COMES FROM. The service and the demonstration capability are mocked at
 * `service-provider.tsx`, the one boundary a screen may read through (rule P-2), so no seed module, no
 * adapter and no HTTP client is involved and the suite observes exactly the calls the screen makes.
 * `react-router`'s `useNavigate` is replaced by a spy, because the screen is the only module in this
 * tree that reaches a router hook and `src/app` may not be imported from a feature test: a policy row
 * is asserted to open its route without mounting the shell. Everything else — `Card`, `PageHeader`,
 * `DataTable`, `MonoValue`, `StatusIndicator`, `StateBoundary`, `ForbiddenCard`, `ActionButton`, the
 * `OutboundLedger` and the grant dialog — is the real module, because what a reader receives is the
 * thing under test.
 *
 * THE FIXTURE IS INPUT, NOT AN EXPECTED RESULT (rule P-6). Every value below is data handed to the
 * mocked reads, so the screen is free to place it and a case can only pass by finding what the screen
 * actually rendered. Nothing is imported from `tests/fixtures/` or `src/seed`; identifiers are opaque
 * placeholders (`row-alpha`, `record-beta`, `policy-alpha`, `endpoint-alpha.example`) rather than
 * record-identifier shapes, and every instant and date is derived from the imported `DEMO_CLOCK`
 * instead of being written out. The screen exports its own wording as `SOVEREIGNTY_SCREEN_TEXT`, so
 * the suite imports every sentence it drives by name and retypes only the three strings a composed
 * sibling owns privately, named once under "the wording this suite must restate" below.
 *
 * REPORTED DECISIONS AND GAPS, each recorded where it bites.
 * 1. The claim vocabulary of rule P-4 is NOT typed here. `tests/source-checks/forbidden-strings.test.ts`
 *    rejects those phrases anywhere under `src/`, and this folder sits inside that scan, so writing
 *    them into an assertion would turn the project's own gate red to prove the screen does not say
 *    them. The property is proved structurally instead, by the one case that walks every rendered text
 *    node and requires it to be a string the screen, the boundary or the payload supplied: a claim
 *    phrase is by definition a sentence no input here supplies, so it cannot pass. The vocabulary
 *    itself stays owned by the source check. This is the same course `grant-exception-dialog.test.tsx`
 *    records for the same reason.
 * 2. `forbidden-card.tsx` does not export the prefix it puts before the permission a denial names, and
 *    `outbound-ledger.tsx` does not export its six column headers or the dash it shows for an endpoint
 *    no attempt was recorded against. A test cannot reach a private const, so those three strings are
 *    restated once below; a reworded one reaches exactly one place here.
 * 3. All seven `ScreenState` values are reachable from this screen's own service surface, so none of
 *    the seven is skipped: the two reads it makes supply the failure that maps to `forbidden`,
 *    `empty` and `conflict`, every other rejection and a source that did not answer supply `offline`,
 *    a never-settling read supplies `loading`, and the freshness report the result itself carries
 *    supplies `stale` and `partial`.
 * 4. jsdom implements neither `URL.createObjectURL` nor `URL.revokeObjectURL`, and the screen's export
 *    path returns early without them. The export case therefore installs both as spies and restores
 *    the globals afterwards, and it stubs `HTMLAnchorElement.prototype.click` so the file that would be
 *    offered is observed rather than navigated to.
 *
 * WHAT EACH CASE WOULD CATCH. A dropped per-row label fails the row case, which reads the label inside
 * the status cell. A count hard-coded in the screen fails the two-payload case, which renders a
 * different length and requires a different number of rows. A ledger column removed, reordered or
 * reformatted fails the ledger case, which asserts the six headers in order and every value verbatim.
 * An export that rewrote, trimmed or re-serialised the document fails the export case, which compares
 * the bytes handed to the download path with the bytes the service returned. A grant flow that sent a
 * request on open, or a close that left the dialog mounted, fails the grant case. An explanation that
 * lives only under the pointer fails the disabled-control case, which reads the reason off the hint a
 * keyboard focus brings up. A screen that rendered a sentence of its own, or a second `Simulated data`
 * badge, fails the last case of the set.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock, touches the network or reaches outside the service boundary.
 */

/*
 * What is imported and what is replaced. The screen, the components it composes and the dialog it
 * opens are the real modules, because a reader receives them and this suite asserts their behaviour:
 * only the service boundary and the router hook are substituted, so no component is mocked. The
 * primitives, the boundary and the dialog are therefore imported directly rather than through the
 * screen, which is what lets each case name the wording and the roles those modules own instead of
 * retyping them.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STATE_BOUNDARY_TEXT } from '../../components/state-boundary';
import { MEANING_COLOUR_CLASSES } from '../../components/status-indicator';
import { CONTROL_STRUCTURE_CLASSES } from '../../components/tooltip';
import type { DemonstrationControls } from '../../services/demonstration-controls';
import type { SiteIntelligenceService } from '../../services/site-intelligence-service';
import {
  APPROVAL_GATE_SOURCE,
  DEMO_CLOCK,
  SIM_LABELS,
  SOURCE_IDS,
  SOURCE_LABELS,
} from '../../types';
import type {
  ActiveUser,
  AuditEvent,
  Density,
  DeploymentSummary,
  ExportPayload,
  Freshness,
  FreshnessState,
  IsoDate,
  LedgerRow,
  Permission,
  PolicyDetail,
  PolicyException,
  Problem,
  Result,
  Role,
  Scope,
  SimLabel,
  SovereigntyRow,
  SovereigntyStatus,
  ThemeName,
  Timestamp,
} from '../../types';
import { GRANT_EXCEPTION_DIALOG_TEXT } from './grant-exception-dialog';
import { SOVEREIGNTY_SCREEN_TEXT as TEXT, SovereigntyScreen } from './sovereignty-screen';

/* ---------------------------------------------------------------------------------------------
 * The wording this suite drives, and the three strings it must restate
 * ------------------------------------------------------------------------------------------- */

/**
 * The `Declared, not verified` label of specification §5.3, read from the tuple that owns the seven
 * fixed strings so this suite can never assert a label the interface does not carry (rule P-4).
 */
const DECLARED_LABEL: SimLabel = SIM_LABELS[6];

/** The `Simulated calculation` label the ledger's two count columns carry (rule P-1). */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/** The `Simulated control` label the recorded-decisions panel carries (rule P-4). */
const SIMULATED_CONTROL_LABEL: SimLabel = SIM_LABELS[4];

/**
 * The prefix `forbidden-card.tsx` puts before the permission a denial names, which it does not export
 * (reported gap 2). The permission itself is appended from the fixture, as the card appends it.
 */
const PERMISSION_REQUIRED_PREFIX = 'Permission required: ';

/**
 * The outbound ledger's six column headers, in the order it renders them, and the dash it shows for an
 * endpoint the trail records no attempt against. Both belong to `outbound-ledger.tsx`, which exports
 * neither (reported gap 2).
 */
const LEDGER_HEADERS = ['Endpoint', 'Purpose', 'State', 'Last attempt', 'Allowed', 'Blocked'] as const;
const NO_LAST_ATTEMPT_MARKER = '—';

/**
 * The dash the policy table shows in place of a value it has none of — a policy no request is pending
 * against. The screen holds it privately, so it is restated here beside the ledger's own marker.
 */
const NO_REQUESTS_MARKER = '—';

/**
 * The route a policy row opens, from AAP 0.12.4's SCR-07 row. The screen holds it as a private
 * constant appended with the row's own identifier, so the expectation below is the same shape.
 */
const POLICY_DETAIL_ROUTE = '/admin/policies';

/* ---------------------------------------------------------------------------------------------
 * Instants and dates, derived from the demonstration clock rather than typed (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every result and every failure of these fixtures carries. */
const TRACE_ID = 'trace-sovereignty';

/** One day and one minute in milliseconds, for deriving instants and dates from the clock. */
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/** A calendar date the given number of days from the demonstration clock, derived rather than typed. */
function isoDateAt(offsetDays: number): IsoDate {
  return new Date(Date.parse(DEMO_CLOCK) + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/** An instant the given number of minutes from the demonstration clock, derived rather than typed. */
function instantAt(offsetMinutes: number): Timestamp {
  return new Date(Date.parse(DEMO_CLOCK) + offsetMinutes * MINUTE_MS).toISOString();
}

/** The date the configuration was last declared: the clock's own date, never a typed one. */
const DECLARED_ON: IsoDate = isoDateAt(0);

/** An earlier declaration date, so two rows can be told apart on that column. */
const DECLARED_EARLIER: IsoDate = isoDateAt(-1);

/* ---------------------------------------------------------------------------------------------
 * The fixture: the payload the mocked reads answer with
 * ------------------------------------------------------------------------------------------- */

/** The deployment summary, every member the record would state and none verified here (rule P-4). */
const SUMMARY: DeploymentSummary = {
  tier: 'S3',
  residency: 'residency-alpha',
  outboundBlocked: true,
  lastDeclaredOn: DECLARED_ON,
};

/** One declared row before the row shape is built from it: an opaque identifier per record. */
interface RowSpec {
  /** The row's key, an opaque placeholder rather than a record-identifier shape. */
  readonly id: string;

  /** What the row declares, in the record's own words. */
  readonly label: string;

  /** The configuration record the declaration rests on. */
  readonly record: string;

  /** The date that record was last declared. */
  readonly lastDeclaredOn: IsoDate;
}

/** Three declared rows, so a per-row assertion has more than one row to tell apart. */
const ROW_SPECS: readonly RowSpec[] = [
  {
    id: 'row-alpha',
    label: 'Where processing happens',
    record: 'record-alpha',
    lastDeclaredOn: DECLARED_ON,
  },
  {
    id: 'row-beta',
    label: 'Which outbound endpoints are listed',
    record: 'record-beta',
    lastDeclaredOn: DECLARED_EARLIER,
  },
  {
    id: 'row-gamma',
    label: 'Who holds the keys',
    record: 'record-gamma',
    lastDeclaredOn: DECLARED_ON,
  },
];

/** The same declaration plus two rows: the payload a screen that hard-codes a row count cannot pass. */
const MORE_ROW_SPECS: readonly RowSpec[] = [
  ...ROW_SPECS,
  {
    id: 'row-delta',
    label: 'How long an audit entry is kept',
    record: 'record-delta',
    lastDeclaredOn: DECLARED_EARLIER,
  },
  {
    id: 'row-epsilon',
    label: 'Which models sit inside the boundary',
    record: 'record-epsilon',
    lastDeclaredOn: DECLARED_ON,
  },
];

/** Builds the row records the payload carries from their specs, in the order given. */
function rowsFrom(specs: readonly RowSpec[]): SovereigntyRow[] {
  return specs.map((spec) => ({
    id: spec.id,
    label: spec.label,
    status: 'declared',
    record: spec.record,
    lastDeclaredOn: spec.lastDeclaredOn,
  }));
}

/** The rows a healthy read returns. */
const ROWS = rowsFrom(ROW_SPECS);

/** The rows of the second payload, at a different length. */
const MORE_ROWS = rowsFrom(MORE_ROW_SPECS);

/** One outbound ledger row before the row shape is built from it. */
interface LedgerSpec {
  /** The endpoint, as the record states it: an opaque host rather than an address anything requests. */
  readonly endpoint: string;

  /** What the endpoint would be used for, in the record's own words. */
  readonly purpose: string;

  /** Whether the declared configuration allows or blocks traffic to it. */
  readonly state: LedgerRow['state'];

  /** When it was last attempted, or `null` when the declared configuration blocks it. */
  readonly lastAttempt: Timestamp | null;

  /** The calls the trail recorded as allowed over the window. */
  readonly allowed: number;

  /** The calls it recorded as blocked over the window. */
  readonly blocked: number;
}

/**
 * Two endpoints, one of each declared state and one of them never attempted, so both the instant cell
 * and the absence marker are exercised.
 */
const LEDGER_SPECS: readonly LedgerSpec[] = [
  {
    endpoint: 'endpoint-alpha.example',
    purpose: 'Reasons over a document',
    state: 'blocked',
    lastAttempt: null,
    allowed: 0,
    blocked: 4,
  },
  {
    endpoint: 'endpoint-beta.example',
    purpose: 'Reads a public index',
    state: 'allowed',
    lastAttempt: instantAt(-90),
    allowed: 7,
    blocked: 0,
  },
];

/** The ledger the payload carries, built from {@link LEDGER_SPECS} so both read one set of values. */
const LEDGER: LedgerRow[] = LEDGER_SPECS.map((spec) => ({ ...spec }));

/** One recorded decision before the event record is built from it. */
interface EventSpec {
  /** The event's position in the chain. */
  readonly sequence: number;

  /** The event's identifier, an opaque placeholder rather than a record-identifier shape. */
  readonly id: string;

  /** When the decision was recorded. */
  readonly timestamp: Timestamp;

  /** Which kind of actor recorded it. */
  readonly actorType: AuditEvent['actorType'];

  /** The actor's own identifier. */
  readonly actorId: string;

  /** What the event records, in the trail's own spelling. */
  readonly action: string;

  /** The record the event is about. */
  readonly objectRef: string;

  /** The outcome it records. */
  readonly result: AuditEvent['result'];
}

/**
 * Builds one event of the trail: the payload hashes are placeholders because this screen prints none
 * of them, and the screen that verifies a chain is SCR-05's, not this one.
 */
function eventFrom(spec: EventSpec): AuditEvent {
  return {
    sequence: spec.sequence,
    id: spec.id,
    timestamp: spec.timestamp,
    actorType: spec.actorType,
    actorId: spec.actorId,
    action: spec.action,
    objectRef: spec.objectRef,
    result: spec.result,
    before: null,
    after: null,
    payloadHash: 'hash-payload',
    traceId: TRACE_ID,
    previousHash: 'hash-previous',
    eventHash: 'hash-event',
  };
}

/** The most recent decision on record. */
const RECENT_EVENT: AuditEvent = eventFrom({
  sequence: 3,
  id: 'event-recent',
  timestamp: instantAt(0),
  actorType: 'policy',
  actorId: 'policy-alpha',
  action: 'policy block',
  objectRef: 'record-alpha',
  result: 'blocked',
});

/** A decision recorded an hour earlier, under another policy. */
const MIDDLE_EVENT: AuditEvent = eventFrom({
  sequence: 2,
  id: 'event-middle',
  timestamp: instantAt(-60),
  actorType: 'user',
  actorId: 'persona-beta',
  action: 'note',
  objectRef: 'record-beta',
  result: 'succeeded',
});

/** The oldest decision on record. */
const OLDEST_EVENT: AuditEvent = eventFrom({
  sequence: 1,
  id: 'event-oldest',
  timestamp: instantAt(-120),
  actorType: 'user',
  actorId: 'persona-alpha',
  action: 'export',
  objectRef: 'record-gamma',
  result: 'allowed',
});

/** The time-boxed request one policy holds, which its requests column reports as present. */
const PENDING_EXCEPTION: PolicyException = {
  policyId: 'policy-alpha',
  reason: 'reason-alpha',
  expiresAt: instantAt(1440),
  requestedBy: 'persona-alpha',
  secondApproverId: 'persona-beta',
  status: 'pending',
};

/**
 * The policy set the read answers with: one policy the engine evaluates, holding a pending request and
 * two decisions supplied out of order, and one the deployment only declares.
 */
const POLICIES: readonly PolicyDetail[] = [
  {
    id: 'policy-alpha',
    title: 'Policy alpha',
    statement: 'statement-alpha',
    evaluated: true,
    recentDecisions: [OLDEST_EVENT, RECENT_EVENT],
    pendingExceptions: [PENDING_EXCEPTION],
  },
  {
    id: 'policy-beta',
    title: 'Policy beta',
    statement: 'statement-beta',
    evaluated: false,
    recentDecisions: [MIDDLE_EVENT],
    pendingExceptions: [],
  },
];

/**
 * Every recorded decision across the policy set, in the order the screen must print them: most recent
 * first, gathered from every policy's own list rather than from one.
 */
const DECISIONS: readonly { readonly policyId: string; readonly event: AuditEvent }[] = [
  { policyId: 'policy-alpha', event: RECENT_EVENT },
  { policyId: 'policy-beta', event: MIDDLE_EVENT },
  { policyId: 'policy-alpha', event: OLDEST_EVENT },
];

/** The persona the session acts as, holding the write the grant flow makes. */
const PERMITTED_ACTOR: ActiveUser = {
  id: 'persona-alpha',
  name: 'Persona Alpha',
  role: 'platform-administrator',
  plantIds: ['plant-alpha'],
  permissions: ['policy.read', 'policy.exception.request'],
  homeRoute: '/admin/sovereignty',
};

/** The same persona without the write's permission, so the grant control cannot act (rule P-8). */
const UNPERMITTED_ACTOR: ActiveUser = {
  ...PERMITTED_ACTOR,
  permissions: ['policy.read'],
};

/** The roster a second approver is chosen from, which the screen offers without the acting persona. */
const ROSTER: ActiveUser[] = [
  PERMITTED_ACTOR,
  {
    id: 'persona-beta',
    name: 'Persona Beta',
    role: 'auditor',
    plantIds: ['plant-alpha'],
    permissions: ['audit.read'],
    homeRoute: '/audit',
  },
];

/** The scope the shell hands the screen: the unfiltered "all plants, all products" selection. */
const SCOPE: Scope = { plants: [], products: [] };

/** The six sources all answering and current, as `Meta.freshness` reports them. */
const FRESH_SOURCES: Freshness[] = SOURCE_IDS.map(
  (source): Freshness => ({ source, asOf: DEMO_CLOCK, state: 'fresh' }),
);

/** The same report with every source in the state asked about. */
function freshnessWith(state: FreshnessState): Freshness[] {
  return FRESH_SOURCES.map((entry) => ({ ...entry, state }));
}

/** The envelope every read resolves to: the payload and the metadata that qualifies it. */
function envelope<T>(data: T, freshness: readonly Freshness[] = FRESH_SOURCES): Result<T> {
  return { data, meta: { freshness: [...freshness], simulated: true, traceId: TRACE_ID } };
}

/** The sovereignty payload a healthy read returns. */
const STATUS: SovereigntyStatus = {
  summary: SUMMARY,
  rows: [...ROWS],
  ledger: [...LEDGER],
};

/** The permission a refused read names, from the contracts §7.1 vocabulary. */
const REQUIRED_PERMISSION: Permission = 'policy.read';

/** The roles that hold it, so the forbidden card names who may act instead of only what is missing. */
const DENIAL_ROLES: Role[] = ['platform-administrator'];

/** The refusal a persona without `policy.read` meets. */
const DENIAL: Problem = {
  type: 'permission',
  message: 'Reading the declaration needs a permission the acting persona does not hold.',
  traceId: TRACE_ID,
  requiredPermission: REQUIRED_PERMISSION,
  rolesWithPermission: DENIAL_ROLES,
};

/** A refusal of the identifier asked for, which the screen reports as its empty state. */
const NO_RECORD: Problem = {
  type: 'not-found',
  message: 'No declaration answers this request.',
  traceId: TRACE_ID,
};

/** The refusal a record that moved under the reader produces, which the screen reports as a conflict. */
const MOVED_RECORD: Problem = {
  type: 'validation',
  message: 'The declaration was read against records that changed while the page was open.',
  traceId: TRACE_ID,
};

/** A refusal of no permission kind, which the screen reports as the offline state. */
const UNANSWERED: Problem = {
  type: 'policy',
  message: 'The read was refused by a rule the records no longer satisfy.',
  traceId: TRACE_ID,
};

/**
 * The evidence pack the service composed for this session: a JSON document carrying the simulation
 * marker at its own top level, and the two members a browser needs to offer it as a file.
 */
const EXPORT_PAYLOAD: ExportPayload = {
  filename: 'evidence-pack-alpha.json',
  mediaType: 'application/json',
  content: JSON.stringify({ simulated: true, records: [{ ref: 'record-alpha' }] }),
};


/* ---------------------------------------------------------------------------------------------
 * The service boundary — mocked at the provider, never at the network
 * ------------------------------------------------------------------------------------------- */

/** The port members this suite drives: the two reads the page makes and the write its export calls. */
type ScreenReads = Pick<
  SiteIntelligenceService,
  'getSovereigntyStatus' | 'listPolicies' | 'exportEvidencePack' | 'requestPolicyException'
>;

/** The demonstration capability the screen reads its acting persona and its roster through. */
type IdentityReads = Pick<DemonstrationControls, 'getActiveUser' | 'switchRole'> & {
  listPersonas: NonNullable<DemonstrationControls['listPersonas']>;
};

/**
 * The port members this suite observes, replaced before the component module is imported so the real
 * binding — and with it the in-browser adapter and its seeded records — is never reached from a
 * component test (rule P-2).
 */
const mockService = vi.hoisted(() => ({
  getSovereigntyStatus: vi.fn<ScreenReads['getSovereigntyStatus']>(),
  listPolicies: vi.fn<ScreenReads['listPolicies']>(),
  exportEvidencePack: vi.fn<ScreenReads['exportEvidencePack']>(),
  requestPolicyException: vi.fn<ScreenReads['requestPolicyException']>(),
}));

/** The identity surface the demonstration supplies, with the same rule behind it. */
const mockDemonstration = vi.hoisted(() => ({
  getActiveUser: vi.fn<IdentityReads['getActiveUser']>(),
  listPersonas: vi.fn<IdentityReads['listPersonas']>(),
  switchRole: vi.fn<IdentityReads['switchRole']>(),
}));

/** The router's one hook this screen calls, replaced so a policy row's navigation is observable. */
const navigateMock = vi.hoisted(() => vi.fn<(target: string) => void>());

/**
 * The provider replaced before the screen is imported, with every hook the rendered tree could reach
 * exported rather than only the two the screen calls.
 *
 * The two typed locals are the conformance check: each stub is assigned to the port's own member set,
 * so a renamed or reformed member fails this file's compilation instead of leaving a stub that answers
 * nothing. `useActiveUser` is stubbed with the module's "no session persona" value, as the sibling
 * suites do, so a component that starts reading it finds a shape rather than `undefined`.
 */
vi.mock('../../services/service-provider', () => {
  const service: ScreenReads = mockService;
  const demonstration: IdentityReads = mockDemonstration;

  return {
    useService: () => service,
    useDemonstration: () => demonstration,
    useActiveUser: () => null,
  };
});

/**
 * `react-router` keeps every real export and yields the spy for `useNavigate`.
 *
 * The screen's only router use is that hook, and `src/app` may not be imported from a feature test, so
 * the route a policy row opens is asserted on the call rather than on a mounted route table.
 */
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();

  return { ...actual, useNavigate: () => navigateMock };
});

/* ---------------------------------------------------------------------------------------------
 * The browser's download path, stubbed because jsdom implements none of it
 * ------------------------------------------------------------------------------------------- */

/** The object URL the stubbed factory hands back, which nothing resolves. */
const OBJECT_URL = 'blob:synthetic-object-url';

/** The factory the screen's export helper is expected to call, once, with the composed document. */
const createObjectUrl = vi.fn<(value: Blob) => string>(() => OBJECT_URL);

/** The revoker it is expected to call once the file has been offered. */
const revokeObjectUrl = vi.fn<(value: string) => void>();

/**
 * Supplies both object-URL members jsdom leaves undefined, so the export path is reachable at all
 * (reported decision 4). `Object.defineProperty` is used rather than `vi.spyOn` because there is no
 * property to spy on; {@link removeObjectUrlStubs} puts the globals back afterwards.
 */
function installObjectUrlStubs(): void {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: createObjectUrl,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: revokeObjectUrl,
  });
}

/** Removes the stubs, whether or not a case installed them. */
function removeObjectUrlStubs(): void {
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
}

/* ---------------------------------------------------------------------------------------------
 * The harness and the readings it takes
 * ------------------------------------------------------------------------------------------- */

/** Renders the screen as the shell mounts it: inside a cache of its own, with retries off. */
function renderScreen(): HTMLElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <SovereigntyScreen scope={SCOPE} />
    </QueryClientProvider>,
  );

  return container;
}

/** Puts the document on one theme and one density, the two preferences the theme layer keys on. */
function useTheme(theme: ThemeName, density: Density): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-density', density);
}

/**
 * The item at a position, or a failure naming what was missing.
 *
 * `noUncheckedIndexedAccess` makes every indexed read a possible absence, and a case that reached for
 * a missing row would otherwise compare against `undefined` and report the wrong thing.
 */
function at<T>(items: readonly T[], index: number, what: string): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`the ${what} at position ${String(index)} is missing`);
  }

  return item;
}

/** Collapses a string's runs of whitespace, so a cell of two elements compares as one line. */
function collapse(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

/** Every string an element's subtree holds, with its whitespace collapsed. */
function collapsedTextOf(element: HTMLElement): string {
  return collapse(element.textContent ?? '');
}

/** The rows of a table, in document order, with its header row left out. */
function dataRowsOf(table: HTMLElement): readonly HTMLElement[] {
  return within(table).getAllByRole('row').slice(1);
}

/** One row's cells, in column order. */
function cellsOf(row: HTMLElement): readonly HTMLElement[] {
  return within(row).getAllByRole('cell');
}

/** The region the deployment summary occupies, once the read has resolved it onto the page. */
async function settledSummary(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: TEXT.summaryTitle });
}

/** The declared rows' table, once the read has resolved it onto the page. */
async function settledRowsTable(): Promise<HTMLElement> {
  return screen.findByRole('table', { name: TEXT.rowsCaption });
}

/** The grant control's accessible name, which is also the dialog's heading. */
const GRANT_ACTION_NAME = TEXT.grantAction;

/**
 * The grant control, once the acting persona's permissions have settled onto the page.
 *
 * Before that read answers, the control is disabled with the sentence saying the persona is still being
 * read, so a case that acts on it waits for the settled state rather than for the element.
 */
async function settledGrantAction(): Promise<HTMLElement> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: GRANT_ACTION_NAME })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  return screen.getByRole('button', { name: GRANT_ACTION_NAME });
}

/** Every port member a call was observed on, in the order the stub object declares them. */
function membersCalled(): readonly string[] {
  return Object.entries(mockService)
    .filter(([, member]) => member.mock.calls.length > 0)
    .map(([name]) => name);
}

/* ---------------------------------------------------------------------------------------------
 * Every string the page may show, and the walk that requires it
 * ------------------------------------------------------------------------------------------- */

/**
 * Every string these fixtures and the modules they drive account for: the screen's own wording object,
 * the state boundary's wording, the dialog's wording, the seven fixed labels, the ledger's six column
 * headers, each fixture value a cell prints, and the one status word the declared rows carry.
 *
 * A text node outside this set is a sentence no input of this suite supplied — which is exactly what a
 * claim about the deployment would be (rule P-4, reported decision 1).
 */
const ACCOUNTED_TEXT: readonly string[] = [
  ...Object.values(TEXT),
  ...Object.values(STATE_BOUNDARY_TEXT),
  ...Object.values(GRANT_EXCEPTION_DIALOG_TEXT),
  ...SIM_LABELS,
  ...ROW_SPECS.flatMap((spec) => [spec.id, spec.label, spec.record, spec.lastDeclaredOn]),
  ...MORE_ROW_SPECS.flatMap((spec) => [spec.id, spec.label, spec.record, spec.lastDeclaredOn]),
  ...ROWS.map((row) => row.status),
  ...LEDGER_HEADERS,
  SUMMARY.tier,
  SUMMARY.residency,
  SUMMARY.lastDeclaredOn,
  ...LEDGER_SPECS.flatMap((spec) => [
    spec.endpoint,
    spec.purpose,
    spec.state,
    String(spec.allowed),
    String(spec.blocked),
    ...(spec.lastAttempt === null ? [] : [spec.lastAttempt]),
  ]),
  ...POLICIES.flatMap((policy) => [
    policy.id,
    policy.title,
    policy.statement,
    ...policy.pendingExceptions.flatMap((request) => [
      request.policyId,
      request.reason,
      request.expiresAt,
      request.requestedBy,
      request.secondApproverId,
      request.status,
    ]),
  ]),
  ...DECISIONS.flatMap(({ event }) => [
    event.id,
    event.timestamp,
    event.actorId,
    event.actorType,
    event.action,
    event.objectRef,
    event.result,
    event.traceId,
    ...(event.policyId === undefined ? [] : [event.policyId]),
  ]),
  NO_LAST_ATTEMPT_MARKER,
];

/**
 * Every text node of the rendered page whose text none of {@link ACCOUNTED_TEXT} accounts for.
 *
 * Text nodes are read rather than the container's whole text for two reasons: adjacent cells
 * concatenate without a separator, and a node is exactly one string a component rendered — a count is
 * `"4"`, a label is the sentence its caller passed — so a claim would have to arrive as a whole node
 * of its own, which this walk reports.
 */
function unaccountedText(container: HTMLElement): readonly string[] {
  const accounted = new Set(ACCOUNTED_TEXT.map(collapse));
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const unaccounted: string[] = [];

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = collapse(node.textContent ?? '');

    if (text.length > 0 && !accounted.has(text)) {
      unaccounted.push(text);
    }
  }

  return unaccounted;
}

/* ---------------------------------------------------------------------------------------------
 * Per-case state
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  mockService.getSovereigntyStatus.mockReset().mockResolvedValue(envelope(STATUS));
  mockService.listPolicies.mockReset().mockResolvedValue(envelope([...POLICIES]));
  mockService.exportEvidencePack.mockReset().mockResolvedValue(envelope(EXPORT_PAYLOAD));
  mockService.requestPolicyException.mockReset().mockResolvedValue(envelope(PENDING_EXCEPTION));

  mockDemonstration.getActiveUser.mockReset().mockResolvedValue(envelope(PERMITTED_ACTOR));
  mockDemonstration.listPersonas.mockReset().mockResolvedValue(envelope([...ROSTER]));
  mockDemonstration.switchRole.mockReset().mockResolvedValue(envelope(PERMITTED_ACTOR));

  navigateMock.mockReset();
  createObjectUrl.mockClear();
  revokeObjectUrl.mockClear();
});

/** Leaves `<html>` on the theme of whichever suite runs next, and no stub of this one behind. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-density');
  removeObjectUrlStubs();
});

/* ---------------------------------------------------------------------------------------------
 * The reads, the declaration and the label each value carries
 * ------------------------------------------------------------------------------------------- */

describe('SovereigntyScreen', () => {
  it('reads the declaration and the policy set once through the port, and writes nothing', async () => {
    renderScreen();

    expect(await screen.findByRole('heading', { level: 1, name: TEXT.title })).toBeVisible();
    expect(screen.getByText(TEXT.eyebrow)).toBeVisible();
    expect(screen.getByText(TEXT.description)).toBeVisible();

    await settledSummary();

    expect(mockService.getSovereigntyStatus).toHaveBeenCalledTimes(1);
    expect(mockService.listPolicies).toHaveBeenCalledTimes(1);
    expect(mockService.listPolicies).toHaveBeenCalledWith({});
    // A read is a read: neither write of the port was reached, so the page changed nothing it read.
    expect(membersCalled()).toEqual(['getSovereigntyStatus', 'listPolicies']);
  });

  it('labels every declared row on the row itself, and the summary, as declared configuration', async () => {
    renderScreen();

    const summary = await settledSummary();

    // The summary states configuration too, and says so (rule P-4).
    expect(within(summary).getAllByText(DECLARED_LABEL)).toHaveLength(1);

    const rows = dataRowsOf(await settledRowsTable());

    expect(rows).toHaveLength(ROWS.length);

    ROWS.forEach((row, index) => {
      const cells = cellsOf(at(rows, index, 'declared row'));

      // The label is read inside this row's own status cell, so the summary's label above the table —
      // or a sibling row's — could not satisfy it (rule P-4).
      expect(within(at(cells, 2, 'status cell')).getAllByText(DECLARED_LABEL)).toHaveLength(1);

      // Each cell prints the record's own value, in the order the payload carries it (rule P-6).
      expect(collapsedTextOf(at(cells, 0, 'row cell'))).toBe(row.id);
      expect(collapsedTextOf(at(cells, 1, 'control cell'))).toBe(row.label);
      expect(collapsedTextOf(at(cells, 3, 'record cell'))).toBe(row.record);
      expect(collapsedTextOf(at(cells, 4, 'last declared cell'))).toBe(row.lastDeclaredOn);
    });

    // Every row carries exactly one label: none is left to the panel above the table alone.
    expect(rows.filter((row) => within(row).queryAllByText(DECLARED_LABEL).length === 1)).toHaveLength(
      rows.length,
    );
  });

  it.each([
    { title: 'the payload this suite ships', rows: ROWS },
    { title: 'a payload holding a different number of rows', rows: MORE_ROWS },
  ])('renders exactly the rows $title carries', async ({ rows: payloadRows }) => {
    mockService.getSovereigntyStatus.mockResolvedValue(
      envelope({ ...STATUS, rows: [...payloadRows] }),
    );

    renderScreen();

    expect(dataRowsOf(await settledRowsTable())).toHaveLength(payloadRows.length);

    // The two payloads differ in length, so a row count written into the screen cannot satisfy both.
    expect(ROWS.length).not.toBe(MORE_ROWS.length);
  });

  it('shows each row’s status as an icon, the record’s own word and the status role colour together', async () => {
    renderScreen();

    const rows = dataRowsOf(await settledRowsTable());

    ROWS.forEach((row, index) => {
      const status = at(cellsOf(at(rows, index, 'declared row')), 2, 'status cell');

      // The record's own word is painted as text, and the fixed label sits beside it.
      expect(within(status).getByText(row.status)).toBeVisible();
      expect(within(status).getByText(DECLARED_LABEL)).toBeVisible();

      // The icon and the colour are one element: the meaning's role utility on the element hidden
      // from assistive technology, whose text label beside it is the accessible name. jsdom resolves
      // no custom property, so the role token reaching the markup is what a case can observe.
      const icon = status.querySelector('[aria-hidden="true"]');

      expect(icon).not.toBeNull();
      expect(icon?.className.split(' ')).toContain(MEANING_COLOUR_CLASSES.simulated);
    });
  });

  it('renders the outbound ledger with its six columns and each row’s own values', async () => {
    renderScreen();

    const ledger = await screen.findByRole('region', { name: TEXT.ledgerCaption });
    const table = within(ledger).getByRole('table', { name: TEXT.ledgerCaption });

    expect(within(table).getAllByRole('columnheader').map(collapsedTextOf)).toEqual([
      ...LEDGER_HEADERS,
    ]);

    // The two count columns are the only figures on this page, and they carry the fixed label for a
    // computed figure inside their own region (rule P-1).
    expect(within(ledger).getAllByText(CALCULATION_LABEL)).toHaveLength(1);

    const rows = dataRowsOf(table);

    expect(rows).toHaveLength(LEDGER.length);

    LEDGER.forEach((row, index) => {
      const cells = cellsOf(at(rows, index, 'ledger row'));

      expect(cells).toHaveLength(LEDGER_HEADERS.length);
      expect(collapsedTextOf(at(cells, 0, 'endpoint cell'))).toBe(row.endpoint);
      expect(collapsedTextOf(at(cells, 1, 'purpose cell'))).toBe(row.purpose);

      // The declared state is the record's own word beside its meaning's icon and colour (rule B-3).
      const state = at(cells, 2, 'state cell');

      expect(within(state).getByText(row.state)).toBeVisible();
      expect(state.querySelector('[aria-hidden="true"]')).not.toBeNull();

      // The instant the trail recorded, verbatim, or the dash that states there is none (rule P-6).
      expect(collapsedTextOf(at(cells, 3, 'last attempt cell'))).toBe(
        row.lastAttempt === null ? NO_LAST_ATTEMPT_MARKER : row.lastAttempt,
      );

      // Both counts are printed as the aggregate supplied them, each tied to the label above them.
      expect(collapsedTextOf(at(cells, 4, 'allowed cell'))).toBe(String(row.allowed));
      expect(collapsedTextOf(at(cells, 5, 'blocked cell'))).toBe(String(row.blocked));
      expect(at(cells, 4, 'allowed cell').querySelector('[aria-describedby]')).not.toBeNull();
      expect(at(cells, 5, 'blocked cell').querySelector('[aria-describedby]')).not.toBeNull();
    });
  });

  /* -------------------------------------------------------------------------------------------
   * The two actions
   * ----------------------------------------------------------------------------------------- */

  it('offers the evidence pack the service returned as the file it composed, unchanged', async () => {
    const user = userEvent.setup();
    const offered: { readonly href: string; readonly download: string }[] = [];

    installObjectUrlStubs();
    // The anchor is activated, not navigated: jsdom implements no download and would report one.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function capture(
      this: HTMLAnchorElement,
    ): void {
      offered.push({ href: this.href, download: this.download });
    });

    renderScreen();
    await settledSummary();

    await user.click(screen.getByRole('button', { name: TEXT.exportAction }));

    await waitFor(() => {
      expect(createObjectUrl).toHaveBeenCalledTimes(1);
    });

    // One call to the port, whatever renders the click caused.
    expect(mockService.exportEvidencePack).toHaveBeenCalledTimes(1);

    const composed = createObjectUrl.mock.calls[0]?.[0];

    if (composed === undefined) {
      throw new Error('the export document was never handed to the browser’s download path');
    }

    // The document is the one the service composed: nothing was added, dropped or re-serialised, so
    // the simulation marker the builder set at its top level survives the screen's handling (rule P-1).
    expect(composed).toBeInstanceOf(Blob);
    expect(composed.type).toBe(EXPORT_PAYLOAD.mediaType);
    expect(await composed.text()).toBe(EXPORT_PAYLOAD.content);

    const handed: unknown = JSON.parse(await composed.text());

    expect(handed).toMatchObject({ simulated: true });

    // The file a reader saves is the one the builder named, and the object URL is released once it has
    // been offered rather than left alive (rule B-1: nothing is requested to offer it).
    expect(at(offered, 0, 'offered file').download).toBe(EXPORT_PAYLOAD.filename);
    expect(offered).toHaveLength(1);
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith(OBJECT_URL);
  });

  it('opens the grant dialog for the first policy and closes it without sending a request', async () => {
    const user = userEvent.setup();

    renderScreen();

    await user.click(await settledGrantAction());

    const dialog = await screen.findByRole('dialog', {
      name: GRANT_EXCEPTION_DIALOG_TEXT.heading,
    });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // The dialog names the policy the payload supplies first, from the record itself (rule P-6).
    expect(dialog).toHaveTextContent(at(POLICIES, 0, 'policy').title);

    await user.click(
      within(dialog).getByRole('button', { name: GRANT_EXCEPTION_DIALOG_TEXT.cancel }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // Closing the dialog sends nothing: the write belongs to the form's own submit.
    expect(mockService.requestPolicyException).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: TEXT.title })).toBeVisible();
  });


  /* -------------------------------------------------------------------------------------------
   * The policy set, the decisions it recorded and the route a row opens
   * ----------------------------------------------------------------------------------------- */

  it('renders one row per recorded decision with the event’s own values, most recent first', async () => {
    renderScreen();

    const panel = await screen.findByRole('region', { name: TEXT.decisionsTitle });
    const table = within(panel).getByRole('table', { name: TEXT.decisionsCaption });

    // The panel says the engine that recorded these decisions runs in this browser (rule P-4).
    expect(within(panel).getAllByText(SIMULATED_CONTROL_LABEL)).toHaveLength(1);

    const rows = dataRowsOf(table);

    expect(rows).toHaveLength(DECISIONS.length);

    // {@link DECISIONS} is ordered most recent first, and the payload supplies one policy's two
    // decisions the other way round, so this asserts the screen's own ordering rather than the
    // fixture's. Each cell prints the event's own member (rule P-6).
    DECISIONS.forEach((decision, index) => {
      const cells = cellsOf(at(rows, index, 'decision row'));
      const actor = at(cells, 2, 'actor cell');

      expect(cells).toHaveLength(6);
      expect(collapsedTextOf(at(cells, 0, 'recorded cell'))).toBe(decision.event.timestamp);
      expect(collapsedTextOf(at(cells, 1, 'policy cell'))).toBe(decision.policyId);
      expect(actor).toHaveTextContent(decision.event.actorId);
      expect(actor).toHaveTextContent(decision.event.actorType);
      expect(collapsedTextOf(at(cells, 3, 'action cell'))).toBe(decision.event.action);
      expect(collapsedTextOf(at(cells, 4, 'record cell'))).toBe(decision.event.objectRef);
      expect(collapsedTextOf(at(cells, 5, 'outcome cell'))).toBe(decision.event.result);
    });
  });

  it('prints each policy of the set and opens the one a row activates at its own route', async () => {
    const user = userEvent.setup();

    renderScreen();

    const table = await screen.findByRole('table', { name: TEXT.policiesCaption });
    const rows = dataRowsOf(table);

    expect(rows).toHaveLength(POLICIES.length);

    POLICIES.forEach((policy, index) => {
      const cells = cellsOf(at(rows, index, 'policy row'));

      expect(collapsedTextOf(at(cells, 0, 'policy cell'))).toBe(policy.id);
      expect(collapsedTextOf(at(cells, 1, 'title cell'))).toBe(policy.title);

      // Whether the engine evaluates the policy, or the deployment only declares it (rule P-4).
      expect(collapsedTextOf(at(cells, 2, 'evaluation cell'))).toBe(
        policy.evaluated ? TEXT.policyEvaluated : DECLARED_LABEL,
      );

      // The requests column states presence rather than a count, which no aggregate here produces
      // (rule P-6).
      expect(collapsedTextOf(at(cells, 3, 'requests cell'))).toBe(
        policy.pendingExceptions.length === 0 ? NO_REQUESTS_MARKER : TEXT.policyRequestPending,
      );
    });

    // Activating a row from the keyboard opens that policy's own page (AAP 0.12.4's SCR-07 row).
    const target = at(POLICIES, 1, 'policy');
    const row = at(rows, 1, 'policy row');

    row.focus();
    expect(row).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(`${POLICY_DETAIL_ROUTE}/${target.id}`);
  });

  /* -------------------------------------------------------------------------------------------
   * The seven states specification §8 fixes, each driven from the reads alone
   * ----------------------------------------------------------------------------------------- */

  it('shows the loading region until both reads settle', () => {
    mockService.getSovereigntyStatus.mockReturnValue(
      new Promise<Result<SovereigntyStatus>>(() => {
        /* never settles: the read the skeleton stands in for */
      }),
    );

    renderScreen();

    const region = screen.getByRole('status', { name: STATE_BOUNDARY_TEXT.loading });

    expect(region).toBeVisible();
    expect(region).toHaveAttribute('aria-busy', 'true');
    // Nothing half-read is placed beside the skeleton.
    expect(screen.queryByRole('region', { name: TEXT.summaryTitle })).toBeNull();
  });

  it('shows the empty message the read reports when no declaration answers the request', async () => {
    mockService.getSovereigntyStatus.mockRejectedValue(NO_RECORD);

    renderScreen();

    expect(await screen.findByText(NO_RECORD.message)).toBeVisible();
    // An empty read shows the sentence instead of five blank surfaces.
    expect(screen.queryByRole('region', { name: TEXT.summaryTitle })).toBeNull();
  });

  it('explains a permission refusal with the permission, the roles that hold it and the trace id', async () => {
    mockService.listPolicies.mockRejectedValue(DENIAL);

    renderScreen();

    const card = await screen.findByRole('region', {
      name: `${PERMISSION_REQUIRED_PREFIX}${REQUIRED_PERMISSION}`,
    });

    expect(within(card).getAllByRole('listitem').map(collapsedTextOf)).toEqual([...DENIAL_ROLES]);
    expect(card).toHaveTextContent(TRACE_ID);
    // Repeating a call the acting role may not make would fail the same way, so no retry is offered
    // (rule P-8), and no figure is shown beside the refusal.
    expect(screen.queryByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel })).toBeNull();
    expect(screen.queryByRole('region', { name: TEXT.summaryTitle })).toBeNull();
  });

  it('shows the offline notice and repeats both reads from its retry control', async () => {
    const user = userEvent.setup();

    mockService.getSovereigntyStatus.mockRejectedValueOnce(UNANSWERED);

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.offlineHeadline)).toBeVisible();
    expect(screen.getByText(STATE_BOUNDARY_TEXT.offlineDetail)).toBeVisible();
    expect(screen.queryByRole('region', { name: TEXT.summaryTitle })).toBeNull();

    await user.click(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel }));

    // The retry repeats both reads, and the declaration replaces the notice once they answer.
    expect(await settledSummary()).toBeVisible();
    expect(mockService.getSovereigntyStatus).toHaveBeenCalledTimes(2);
    expect(mockService.listPolicies).toHaveBeenCalledTimes(2);
  });

  it('takes a source that did not answer as offline and withholds the declaration', async () => {
    mockService.getSovereigntyStatus.mockResolvedValue(
      envelope(STATUS, freshnessWith('unavailable')),
    );

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.offlineHeadline)).toBeVisible();
    // The read can be repeated, so the control that repeats it is there to be used (rule P-8).
    expect(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel })).toBeVisible();
    expect(screen.queryByRole('region', { name: TEXT.summaryTitle })).toBeNull();
  });

  it('keeps the declaration on screen while naming the stale source and its as-of time', async () => {
    mockService.getSovereigntyStatus.mockResolvedValue(envelope(STATUS, freshnessWith('stale')));

    renderScreen();

    await settledSummary();

    // Waiting for the declaration is also what waits the loading region away, so the stale banner is
    // the one live region left on the page.
    const banner = screen.getByRole('status');
    const source = SOURCE_LABELS[APPROVAL_GATE_SOURCE];

    expect(banner).toHaveTextContent(`${source}${STATE_BOUNDARY_TEXT.staleSuffix}`);
    expect(banner).toHaveTextContent(STATE_BOUNDARY_TEXT.staleAsOfPrefix);
    // The instant printed is the record's own, never an age derived here (rule P-6).
    expect(banner).toHaveTextContent(DEMO_CLOCK);

    // A warning about the figures is not a reason to withhold them.
    expect(await settledRowsTable()).toBeVisible();
  });

  it('names the inputs a partial read left out while still showing the declaration', async () => {
    mockService.getSovereigntyStatus.mockResolvedValue(envelope(STATUS, freshnessWith('partial')));

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.partialHeadline)).toBeVisible();
    expect(screen.getByText(TEXT.partial)).toBeVisible();
    expect(await settledSummary()).toBeVisible();
  });

  it('treats a record that moved under the reader as a conflict and offers a reload', async () => {
    mockService.getSovereigntyStatus.mockRejectedValue(MOVED_RECORD);

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.conflictHeadline)).toBeVisible();
    expect(screen.getByText(TEXT.conflict)).toBeVisible();
    expect(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.reloadLabel })).toBeVisible();
    expect(screen.queryByRole('region', { name: TEXT.summaryTitle })).toBeNull();
  });

  /* -------------------------------------------------------------------------------------------
   * A control that cannot act, the page's own text, both themes and the keyboard
   * ----------------------------------------------------------------------------------------- */

  it('disables the grant action with the sentence naming the permission the acting persona lacks', async () => {
    const user = userEvent.setup();

    mockDemonstration.getActiveUser.mockResolvedValue(envelope(UNPERMITTED_ACTOR));

    renderScreen();

    const action = screen.getByRole('button', { name: GRANT_ACTION_NAME });

    await waitFor(() => {
      expect(action).toHaveAttribute('aria-disabled', 'true');
    });

    // The reason is not painted until the hint opens, so it is read off the hint a keyboard focus
    // brings up rather than off the page's standing text (rule P-8, rule B-3).
    action.focus();
    expect(action).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(TEXT.grantNotPermitted);

    // A control that cannot act does nothing, and the export beside it still can.
    await user.click(action);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: TEXT.exportAction })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('renders nothing the page was not given, and duplicates no badge of its own', async () => {
    const container = renderScreen();

    await settledSummary();

    // The `Simulated data` marker belongs to the shell, which mounts it on every route: a screen that
    // rendered its own would say it twice (rule P-1).
    expect(screen.queryByText(SIM_LABELS[0])).toBeNull();

    // Every text node is a string the screen, the boundary or the payload supplied, so no sentence of
    // the screen's own — and with it no claim about the deployment — can reach the page unasserted
    // (rule P-4, reported decision 1).
    expect(unaccountedText(container)).toEqual([]);
  });

  it.each([
    { theme: 'command', density: 'compact' },
    { theme: 'paper', density: 'comfortable' },
  ] as const)(
    'renders the same declaration and both actions under the $theme theme',
    async ({ theme, density }) => {
      useTheme(theme, density);

      renderScreen();

      expect(await settledSummary()).toBeVisible();
      expect(await settledRowsTable()).toBeVisible();
      expect(screen.getByRole('table', { name: TEXT.ledgerCaption })).toBeVisible();
      expect(screen.getByRole('table', { name: TEXT.decisionsCaption })).toBeVisible();

      // What a case asserts is what a reader receives, never a colour: jsdom resolves no custom
      // property, so the two themes are asserted through the same structure and the same names.
      expect(await settledGrantAction()).toBeVisible();
      expect(screen.getByRole('button', { name: TEXT.exportAction })).toBeVisible();
    },
  );

  it('reaches both actions with Tab, shows each focus ring, and exports from the keyboard', async () => {
    const user = userEvent.setup();

    installObjectUrlStubs();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      /* the file is offered, not navigated to */
    });

    renderScreen();
    await settledGrantAction();

    // The ring is the shared control structure's, read from that list rather than retyped (rule B-3):
    // jsdom paints nothing, so the utilities the control carries are what a case observes.
    const ringClasses = CONTROL_STRUCTURE_CLASSES.split(' ').filter((token) =>
      token.startsWith('focus-visible:'),
    );

    expect(ringClasses.length).toBeGreaterThan(0);

    await user.tab();

    const grant = screen.getByRole('button', { name: GRANT_ACTION_NAME });

    expect(grant).toHaveFocus();

    for (const ringClass of ringClasses) {
      expect(grant.className.split(' ')).toContain(ringClass);
    }

    await user.tab();

    const exportAction = screen.getByRole('button', { name: TEXT.exportAction });

    expect(exportAction).toHaveFocus();

    for (const ringClass of ringClasses) {
      expect(exportAction.className.split(' ')).toContain(ringClass);
    }

    // The action performs its function from the keyboard: the pack the service composed is offered as
    // the file it named.
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(createObjectUrl).toHaveBeenCalledTimes(1);
    });

    expect(mockService.exportEvidencePack).toHaveBeenCalledTimes(1);
  });
});

