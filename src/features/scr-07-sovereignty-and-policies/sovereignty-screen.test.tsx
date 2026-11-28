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
 * endpoint, purpose, state, instant and two counts under the two fixed labels it separates — the
 * declared label on the four columns that state declared configuration, and the label a computed
 * figure carries on the two counts, each cell naming its own label by id (rules P-1 and P-4); that
 * the export action calls the port once and hands the payload the service returned to the browser's
 * download path unchanged, `simulated: true` included; that each policy row's own grant action opens
 * the dialog named by its own heading for that row's policy and closes without sending a
 * request, while a policy the engine never evaluates offers none and says why; that one row per
 * recorded decision renders the event's own values, most recent first; that a policy row opens that
 * policy's route; that the seven states specification §8 fixes each render from the read's own
 * outcome; that a grant control which cannot act is disabled with its reason reachable from the
 * keyboard (rule P-8); that nothing the screen was not given reaches the page, so no claim about the
 * deployment can arrive unasserted (rule P-4); that both themes render the same declaration and the
 * same actions; and that the export action and a row's grant action are each reached with `Tab` and
 * show the focus ring (rule B-3, T-16).
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
 * THE CLAIM VOCABULARY IS NOT TYPED (rule P-4). `tests/source-checks/forbidden-strings.test.ts`
 * rejects those phrases anywhere under `src/`, and this folder sits inside that scan, so writing
 * them into an assertion would turn the project's own gate red to prove the screen does not say
 * them. The property is proved structurally instead, by the one case that walks every rendered text
 * node and requires each to be a string the screen, the boundary or the payload supplied: a claim
 * phrase is by definition a sentence no input here supplies, so it cannot pass. The vocabulary
 * itself stays owned by the source check.
 *
 * THREE STRINGS THIS SUITE MUST RESTATE. `forbidden-card.tsx` does not export the prefix it puts
 * before the permission a denial names, and `outbound-ledger.tsx` exports neither its six column
 * headers nor the dash it shows for an endpoint no attempt was recorded against. A test cannot reach
 * a private const, so those are restated once below; a reworded one reaches exactly one place here.
 *
 * ALL SEVEN STATES ARE REACHABLE. Every `ScreenState` value specification §8 fixes is reachable from
 * this screen's own service surface, so none of the seven is skipped: the two reads it makes supply
 * the failure that maps to `forbidden`, `empty` and `conflict`, every other rejection and a source
 * that did not answer supply `offline`, a never-settling read supplies `loading`, and the freshness
 * report the result itself carries supplies `stale` and `partial`.
 *
 * THE DOWNLOAD PATH IS STUBBED IN THE EXPORT CASES. The offering case installs `URL.createObjectURL`
 * and `URL.revokeObjectURL` as spies and stubs `HTMLAnchorElement.prototype.click` so the file that
 * would be offered is observed rather than navigated to. The refusal case withholds both members, which
 * is the engine it stands for: this environment answers `URL.createObjectURL` from the global's
 * prototype as well as from the global itself, so deleting the global's member would expose the
 * inherited one rather than leave the page without a factory. Every case hands the globals back
 * afterwards.
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

import { EVIDENCE_DRAWER_TEXT } from '../../components/evidence-drawer';
import { STATE_BOUNDARY_TEXT } from '../../components/state-boundary';
import { MEANING_COLOUR_CLASSES } from '../../components/status-indicator';
import { CONTROL_STRUCTURE_CLASSES } from '../../components/tooltip';
import type { DemonstrationControls } from '../../services/demonstration-controls';
import type { SiteIntelligenceService } from '../../services/site-intelligence-service';
import {
  APPROVAL_GATE_SOURCE,
  DEMO_CLOCK,
  LEDGER_WINDOW_DAYS,
  SIM_LABELS,
  SOURCE_IDS,
  SOURCE_LABELS,
} from '../../types';
import type {
  ActiveUser,
  AuditEvent,
  Density,
  DeploymentSummary,
  Evidence,
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
 * The prefix `forbidden-card.tsx` puts before the permission a denial names, which it does not
 * export. The permission itself is appended from the fixture, as the card appends it.
 */
const PERMISSION_REQUIRED_PREFIX = 'Permission required: ';

/**
 * The outbound ledger's six column headers, in the order it renders them, and the dash it shows for an
 * endpoint the trail records no attempt against. Both belong to `outbound-ledger.tsx`, which exports
 * neither (reported gap 2). The two count headers name the window their figures cover, composed from
 * the `LEDGER_WINDOW_DAYS` constant the aggregate measures with, so this list states the window in the
 * same terms the component does.
 */
const LEDGER_HEADERS = [
  'Endpoint',
  'Purpose',
  'State',
  'Last attempt',
  `Allowed, ${LEDGER_WINDOW_DAYS} days`,
  `Blocked, ${LEDGER_WINDOW_DAYS} days`,
] as const;
const NO_LAST_ATTEMPT_MARKER = '—';

/**
 * The dash the policy table shows in place of a value it has none of — a policy no request is pending
 * against. The screen holds it privately, so it is restated here beside the ledger's own marker.
 */
const NO_REQUESTS_MARKER = '—';

/**
 * The suffix each policy row's grant control appends to its fixed label, so that the copies of one
 * action never share an accessible name. The screen holds the template privately, so it is restated
 * here and compared with the text the page actually rendered.
 */
function grantNameSuffix(policyId: string): string {
  return `: ${policyId}`;
}

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
 * two decisions supplied out of order; one the deployment only declares; and a second evaluated policy
 * whose own grant action acts, so a case can prove the dialog names a row other than the first.
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
  {
    id: 'policy-gamma',
    title: 'Policy gamma',
    statement: 'statement-gamma',
    evaluated: true,
    recentDecisions: [],
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

/**
 * The persona the session acts as, holding everything the page's two controls gate on: the write the
 * grant flow makes, and both permissions the export requires.
 *
 * The export's pair is the one `MockBackend.exportEvidencePack` enforces — the pack carries the
 * declared deployment record and the audit trail — so a persona without them cannot reach the download
 * path at all, and this fixture carries them so the export cases exercise an enabled control.
 */
const PERMITTED_ACTOR: ActiveUser = {
  id: 'persona-alpha',
  name: 'Persona Alpha',
  role: 'platform-administrator',
  plantIds: ['plant-alpha'],
  permissions: ['audit.read', 'sovereignty.read', 'policy.read', 'policy.exception.request'],
  homeRoute: '/admin/sovereignty',
};

/**
 * The same persona without the write's permission, so the grant control cannot act (rule P-8).
 *
 * It keeps both permissions the export requires, which is what lets a case prove the grant control is
 * disabled while the export beside it still acts.
 */
const UNPERMITTED_ACTOR: ActiveUser = {
  ...PERMITTED_ACTOR,
  permissions: ['audit.read', 'sovereignty.read', 'policy.read'],
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

/**
 * The evidence a figure's drawer read answers with: one payload of opaque placeholder values, so a
 * case can prove the drawer resolved *a record* — the read happened, and its own value, formula and
 * reference reached the dialog — without asserting anything about the aggregate the service computes.
 *
 * Its `label` is the tuple member a computed figure carries, because the figures this page opens are
 * the ledger's counts; the drawer prints the label beside the value rather than choosing one.
 */
const EVIDENCE: Evidence = {
  value: 'evidence-value-alpha',
  provenance: 'computed',
  label: CALCULATION_LABEL,
  formula: 'evidence-formula-alpha',
  inputs: ['evidence-input-alpha'],
  upstream: ['evidence-upstream-alpha'],
  downstream: ['evidence-downstream-alpha'],
  confidence: { level: 'high', reason: 'evidence-reason-alpha' },
  missingInputs: [],
  documents: [],
};


/* ---------------------------------------------------------------------------------------------
 * The service boundary — mocked at the provider, never at the network
 * ------------------------------------------------------------------------------------------- */

/** The port members this suite drives: the two reads the page makes, the drawer's read and the write its export calls. */
type ScreenReads = Pick<
  SiteIntelligenceService,
  'getSovereigntyStatus' | 'listPolicies' | 'getEvidence' | 'exportEvidencePack' | 'requestPolicyException'
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
  getEvidence: vi.fn<ScreenReads['getEvidence']>(),
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
    /*
     * The cache key the screen reads the acting persona under. The real module owns the tuple; this
     * double has to carry it because the screen imports the binding, and a suite that left it out would
     * fail on the import rather than on the behaviour it means to assert.
     */
    ACTIVE_USER_QUERY_KEY: ['getActiveUser'],
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
 * Supplies both object-URL members, so the export path is reachable at all. `Object.defineProperty` is
 * used rather than `vi.spyOn` because the members are replaced rather than wrapped;
 * {@link withholdObjectUrlMembers} takes them away again.
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

/**
 * Withholds both object-URL members, which is the engine that offers no way to save a file: no factory
 * to build a URL with and none to revoke.
 *
 * They are shadowed with `undefined` rather than deleted because this environment answers
 * `URL.createObjectURL` from the global's prototype as well as from the global itself, so a deleted own
 * member would only expose the inherited one and the page would still have a factory.
 */
function withholdObjectUrlMembers(): void {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: undefined,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: undefined,
  });
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

/**
 * A matcher for the accessible name of a figure that opens its evidence: the visible value leading
 * the name the drawer's trigger gives it, followed by that trigger's own suffix
 * (`EVIDENCE_DRAWER_TEXT.openSuffix`).
 *
 * The value is pinned as the name's start rather than compared whole, because the join between the
 * figure and the visually hidden suffix is the accessible-name computation's business and not this
 * suite's: what a case has to prove is that the figure itself names the control, which is what a
 * speech-input user says to reach it (WCAG 2.2 SC 2.5.3).
 */
function evidenceTriggerName(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

  return new RegExp(`^${escaped}`, 'u');
}

/** Every string an element's subtree holds, with its whitespace collapsed. */
function collapsedTextOf(element: HTMLElement): string {
  return collapse(element.textContent ?? '');
}

/** The rows of a table, in document order, with its header row left out. */
function dataRowsOf(table: HTMLElement): readonly HTMLElement[] {
  return within(table).getAllByRole('row').slice(1);
}

/**
 * The number of focus moves a keyboard walk may make before it is abandoned.
 *
 * The page holds fewer than twenty focus stops, so a walk that has not reached the control it is
 * looking for within this bound has found a control the keyboard cannot reach, which is what the walk
 * exists to report.
 */
const FOCUS_LIMIT = 20;

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

/**
 * The grant control's visible label, which AAP 0.12.4 fixes for every copy of it. Each copy appends
 * its own row's identifier as an `sr-only` suffix, so the label on its own names none of them.
 */
const GRANT_ACTION_NAME = TEXT.grantAction;

/** The policy set's table, once the read has resolved it onto the page. */
async function settledPoliciesTable(): Promise<HTMLElement> {
  return screen.findByRole('table', { name: TEXT.policiesCaption });
}

/**
 * One policy row's grant control.
 *
 * The control's accessible name is the fixed label followed by its row's own identifier, so a case
 * reaches exactly one of the copies by that name. The identifier alone is not enough to select it: the
 * same row's identifier is also the visible text of the evidence trigger beside it, so a pattern over
 * the identifier alone would match both controls.
 */
function grantActionOf(policy: PolicyDetail): HTMLElement {
  return screen.getByRole('button', {
    name: `${GRANT_ACTION_NAME}${grantNameSuffix(policy.id)}`,
  });
}

/**
 * That row's grant control, once the acting persona's permissions have settled onto the page.
 *
 * Before that read answers, every copy is disabled with the sentence saying the persona is still being
 * read, so a case that acts on one waits for the settled state rather than for the element.
 */
async function settledGrantAction(policy: PolicyDetail): Promise<HTMLElement> {
  await settledPoliciesTable();

  await waitFor(() => {
    expect(grantActionOf(policy)).not.toHaveAttribute('aria-disabled', 'true');
  });

  return grantActionOf(policy);
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
 * the state boundary's wording, the dialog's wording, the drawer trigger's suffix on every figure that
 * opens its evidence, the seven fixed labels, the ledger's six column headers, each fixture value a cell
 * prints, and the one status word the declared rows carry.
 *
 * A text node outside this set is a sentence no input of this suite supplied — which is exactly what a
 * claim about the deployment would be (rule P-4).
 */
const ACCOUNTED_TEXT: readonly string[] = [
  ...Object.values(TEXT),
  ...Object.values(STATE_BOUNDARY_TEXT),
  ...Object.values(GRANT_EXCEPTION_DIALOG_TEXT),
  EVIDENCE_DRAWER_TEXT.openSuffix,
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
  // The `sr-only` half of each grant control's accessible name, which is a text node of its own.
  ...POLICIES.map((policy) => grantNameSuffix(policy.id)),
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
  mockService.getEvidence.mockReset().mockResolvedValue(envelope({ ...EVIDENCE }));
  mockService.exportEvidencePack.mockReset().mockResolvedValue(envelope(EXPORT_PAYLOAD));
  mockService.requestPolicyException.mockReset().mockResolvedValue(envelope(PENDING_EXCEPTION));

  mockDemonstration.getActiveUser.mockReset().mockResolvedValue(envelope(PERMITTED_ACTOR));
  mockDemonstration.listPersonas.mockReset().mockResolvedValue(envelope([...ROSTER]));
  mockDemonstration.switchRole.mockReset().mockResolvedValue(envelope(PERMITTED_ACTOR));

  navigateMock.mockReset();
  createObjectUrl.mockClear();
  revokeObjectUrl.mockClear();
});

/**
 * Leaves `<html>` on the theme of whichever suite runs next, and no object-URL factory of this one
 * behind: every case but the offering one expects the page to have none.
 */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-density');
  withholdObjectUrlMembers();
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
    // computed figure inside their own region (rule P-1); the four declared columns beside them carry
    // the declared label, and every cell names the one that applies to it (rule P-4).
    expect(within(ledger).getAllByText(CALCULATION_LABEL)).toHaveLength(1);

    const declaredLabel = within(ledger).getByText(DECLARED_LABEL);
    const calculationLabel = within(ledger).getByText(CALCULATION_LABEL);
    const declaredLabelId = declaredLabel.closest('[id]')?.id ?? '';
    const calculationLabelId = calculationLabel.closest('[id]')?.id ?? '';

    expect(declaredLabel).toBeVisible();
    expect(declaredLabelId).not.toBe('');
    expect(calculationLabelId).not.toBe('');

    const rows = dataRowsOf(table);

    expect(rows).toHaveLength(LEDGER.length);

    LEDGER.forEach((row, index) => {
      const cells = cellsOf(at(rows, index, 'ledger row'));

      expect(cells).toHaveLength(LEDGER_HEADERS.length);
      expect(collapsedTextOf(at(cells, 0, 'endpoint cell'))).toBe(row.endpoint);
      expect(collapsedTextOf(at(cells, 1, 'purpose cell'))).toBe(row.purpose);

      // The declared state is the record's own word beside its meaning's icon and colour (rule B-3),
      // and that colour is the neutral meaning this vocabulary gives declared configuration rather
      // than the pass mark a verified state would earn (rule P-4).
      const state = at(cells, 2, 'state cell');
      const stateIcon = state.querySelector('[aria-hidden="true"]');
      const stateMeaning = row.state === 'blocked' ? 'simulated' : 'warning';

      expect(within(state).getByText(row.state)).toBeVisible();
      expect(stateIcon).not.toBeNull();
      expect(stateIcon?.className.split(' ')).toContain(MEANING_COLOUR_CLASSES[stateMeaning]);
      expect(stateIcon?.className.split(' ')).not.toContain(MEANING_COLOUR_CLASSES.pass);

      // The instant the trail recorded, verbatim, or the dash that states there is none (rule P-6).
      expect(collapsedTextOf(at(cells, 3, 'last attempt cell'))).toBe(
        row.lastAttempt === null ? NO_LAST_ATTEMPT_MARKER : row.lastAttempt,
      );

      // Each declared cell names the label row that says the column states declared configuration and
      // that nothing verified it (rule P-4).
      for (const [position, what] of [
        [0, 'endpoint cell'],
        [1, 'purpose cell'],
        [2, 'state cell'],
        [3, 'last attempt cell'],
      ] as const) {
        expect(at(cells, position, what).querySelector('[aria-describedby]')).toHaveAttribute(
          'aria-describedby',
          declaredLabelId,
        );
      }

      // Both counts are printed as the aggregate supplied them, each tied to the calculation label
      // above them — never the declared one — and each a control that opens the evidence of the
      // endpoint it was counted for (AAP 0.2.1 F12).
      expect(
        within(at(cells, 4, 'allowed cell')).getByRole('button', {
          name: evidenceTriggerName(String(row.allowed)),
        }),
      ).toBeVisible();
      expect(
        within(at(cells, 5, 'blocked cell')).getByRole('button', {
          name: evidenceTriggerName(String(row.blocked)),
        }),
      ).toBeVisible();
      expect(at(cells, 4, 'allowed cell').querySelector('[aria-describedby]')).toHaveAttribute(
        'aria-describedby',
        calculationLabelId,
      );
      expect(at(cells, 5, 'blocked cell').querySelector('[aria-describedby]')).toHaveAttribute(
        'aria-describedby',
        calculationLabelId,
      );
    });
  });

  it('names the window both counts cover in their headers and in the region caption', async () => {
    renderScreen();

    const ledger = await screen.findByRole('region', { name: TEXT.ledgerCaption });
    const table = within(ledger).getByRole('table', { name: TEXT.ledgerCaption });
    const headers = within(table).getAllByRole('columnheader').map(collapsedTextOf);
    const countHeaders = headers.slice(-2);

    // Each count column states the window its figure covers, in the same terms the ledger aggregate
    // measures it with, so the number means something to a reader who arrives at the column without
    // the heading above the table.
    expect(countHeaders).toEqual([
      `Allowed, ${LEDGER_WINDOW_DAYS} days`,
      `Blocked, ${LEDGER_WINDOW_DAYS} days`,
    ]);

    // Neither column states its figure with the window named only elsewhere.
    expect(headers).not.toContain('Allowed');
    expect(headers).not.toContain('Blocked');

    // The region's own caption names the same window, so the column and the region cannot disagree.
    expect(TEXT.ledgerCaption).toContain(`trailing ${LEDGER_WINDOW_DAYS} days`);
  });

  it('opens the evidence of the endpoint a ledger count was counted for', async () => {
    const user = userEvent.setup();

    renderScreen();

    const table = await screen.findByRole('table', { name: TEXT.ledgerCaption });
    const target = at(LEDGER, 0, 'ledger row');
    const cells = cellsOf(at(dataRowsOf(table), 0, 'ledger row'));

    await user.click(
      within(at(cells, 4, 'allowed cell')).getByRole('button', {
        name: evidenceTriggerName(String(target.allowed)),
      }),
    );

    const drawer = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });

    // The reference the figure carries is the row's own endpoint — the row key, and the value the
    // aggregate counted against — and the read it made resolved a record that reached the dialog
    // (AAP 0.2.1 F12, principle PR-6).
    expect(mockService.getEvidence).toHaveBeenCalledTimes(1);
    expect(mockService.getEvidence).toHaveBeenCalledWith(target.endpoint);
    expect(drawer).toHaveTextContent(EVIDENCE.value);
    expect(drawer).toHaveTextContent(target.endpoint);
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
    // been offered rather than left alive (rule B-1: nothing is requested to offer it). The release
    // happens on the task after the anchor is activated, so that an engine still reading the blob when
    // the click's task ends finds it, which is why it is read for rather than assumed to have happened.
    expect(at(offered, 0, 'offered file').download).toBe(EXPORT_PAYLOAD.filename);
    expect(offered).toHaveLength(1);

    await waitFor(() => {
      expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    });

    expect(revokeObjectUrl).toHaveBeenCalledWith(OBJECT_URL);
  });

  it('reports that this page cannot offer a file where it has no object-URL factory', async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    /* The engine this case is about: one with no factory to build a file with, which is the state
       jsdom answers with once the members are withheld. */
    withholdObjectUrlMembers();

    renderScreen();
    await settledSummary();

    await user.click(screen.getByRole('button', { name: TEXT.exportAction }));

    /* The pack was composed and recorded — the export itself did not fail — so the service answered
       once and what is reported is the page's own limit. */
    await waitFor(() => {
      expect(mockService.exportEvidencePack).toHaveBeenCalledTimes(1);
    });

    const alert = await screen.findByRole('alert');

    /* The failure region states both halves: what could not be produced, and why this page could not
       produce it, rather than leaving the reader with a control that did nothing (rule P-8). */
    expect(within(alert).getByText(TEXT.exportFailed)).toBeVisible();
    expect(within(alert).getByText(TEXT.downloadUnavailable)).toBeVisible();

    /* Nothing was offered at all, so no anchor was activated. */
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('opens the grant dialog for the policy whose own row was pressed, and closes it unsent', async () => {
    const user = userEvent.setup();

    renderScreen();

    /*
     * A policy that is not the first of the set, so the case shows the dialog follows the row a reader
     * acted on rather than a position this screen chose; the first policy's title is asserted absent
     * from it for the same reason.
     */
    const pressed = at(POLICIES, POLICIES.length - 1, 'policy');
    const first = at(POLICIES, 0, 'policy');

    await user.click(await settledGrantAction(pressed));

    const dialog = await screen.findByRole('dialog', {
      name: GRANT_EXCEPTION_DIALOG_TEXT.heading,
    });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // The dialog names the policy the reader acted on, from that record itself (rule P-6).
    expect(dialog).toHaveTextContent(pressed.title);
    expect(dialog).not.toHaveTextContent(first.title);

    // One copy of the action per policy, and each carries its own row's identifier, so the copies never
    // share an accessible name (rule B-3).
    expect(screen.getAllByRole('button', { name: new RegExp(GRANT_ACTION_NAME) })).toHaveLength(
      POLICIES.length,
    );

    POLICIES.forEach((policy) => {
      expect(grantActionOf(policy).textContent).toBe(
        `${GRANT_ACTION_NAME}${grantNameSuffix(policy.id)}`,
      );
    });

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

  it('offers no exception against a policy the engine never evaluates, and says why', async () => {
    const user = userEvent.setup();

    renderScreen();

    const declared = at(
      POLICIES.filter((policy) => !policy.evaluated),
      0,
      'declared policy',
    );
    const evaluated = at(
      POLICIES.filter((policy) => policy.evaluated),
      0,
      'evaluated policy',
    );

    await settledPoliciesTable();

    const declaredAction = grantActionOf(declared);

    await waitFor(() => {
      expect(declaredAction).toHaveAttribute('aria-disabled', 'true');
    });

    // The sentence names the record's own condition rather than a permission the reader could ask for
    // (rules P-4 and P-8), and it is read the way assistive technology receives it.
    declaredAction.focus();
    expect(declaredAction).toHaveFocus();

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(TEXT.grantNeverEvaluated);
    });

    // A policy does not need to be the first of the set to offer the flow: an evaluated row still acts.
    expect(await settledGrantAction(evaluated)).not.toHaveAttribute('aria-disabled', 'true');

    await user.click(declaredAction);

    expect(screen.queryByRole('dialog')).toBeNull();
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

      // The identifier is the record's own, and it is the control that opens that policy's evidence
      // (AAP 0.2.1 F12).
      expect(
        within(at(cells, 0, 'policy cell')).getByRole('button', {
          name: evidenceTriggerName(policy.id),
        }),
      ).toBeVisible();
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

  it('opens the evidence of the policy a row’s identifier names', async () => {
    const user = userEvent.setup();

    renderScreen();

    const table = await screen.findByRole('table', { name: TEXT.policiesCaption });
    const target = at(POLICIES, 0, 'policy');
    const cells = cellsOf(at(dataRowsOf(table), 0, 'policy row'));

    await user.click(
      within(at(cells, 0, 'policy cell')).getByRole('button', {
        name: evidenceTriggerName(target.id),
      }),
    );

    const drawer = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });

    // The record's own identifier is the reference, and opening the evidence is the cell's own control
    // rather than the row's activation: the policy route is left to the row (AAP 0.2.1 F12).
    expect(mockService.getEvidence).toHaveBeenCalledTimes(1);
    expect(mockService.getEvidence).toHaveBeenCalledWith(target.id);
    expect(drawer).toHaveTextContent(EVIDENCE.value);
    expect(navigateMock).not.toHaveBeenCalled();
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

  it('disables every row’s grant action with the sentence naming the permission the acting persona lacks', async () => {
    const user = userEvent.setup();

    mockDemonstration.getActiveUser.mockResolvedValue(envelope(UNPERMITTED_ACTOR));

    renderScreen();

    await settledPoliciesTable();

    /*
     * An evaluated policy's copy, because the gate answers a record's own condition before it answers
     * a permission: the sentence read below must be the permission one, and it can only be that on a
     * policy the engine evaluates.
     */
    const evaluated = at(
      POLICIES.filter((policy) => policy.evaluated),
      0,
      'evaluated policy',
    );
    const action = grantActionOf(evaluated);

    await waitFor(() => {
      expect(action).toHaveAttribute('aria-disabled', 'true');
    });

    // The reason is not painted until the hint opens, so it is read off the hint a keyboard focus
    // brings up rather than off the page's standing text (rule P-8, rule B-3).
    action.focus();
    expect(action).toHaveFocus();

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(TEXT.grantNotPermitted);
    });

    // A control that cannot act does nothing, and the export beside it still can.
    await user.click(action);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: TEXT.exportAction })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('keeps each grant label’s hidden identifier inside a positioned box, so it cannot widen the page', async () => {
    renderScreen();

    await settledPoliciesTable();

    for (const policy of POLICIES) {
      const action = grantActionOf(policy);
      const hidden = within(action).getByText(`: ${policy.id}`);

      /*
       * `sr-only` is absolutely positioned: with no containing block inside the cell it resolves
       * against the initial containing block, escapes the table's own horizontal scroll area and
       * widens the document at a narrow viewport (measured at 375 px on SCR-07). jsdom computes no
       * layout, so the class that supplies that containing block is what a case can observe.
       */
      expect(hidden.parentElement?.className.split(' ')).toContain('relative');
    }
  });

  it.each([
    { title: 'neither permission the pack requires', holds: [] },
    { title: 'sovereignty.read alone', holds: ['sovereignty.read'] },
    { title: 'audit.read alone', holds: ['audit.read'] },
  ] as const)(
    'disables the export with its reason when the persona holds $title',
    async ({ holds }) => {
      /*
       * The grant's own permissions are carried by every persona here, so a case cannot pass by
       * disabling both controls: what it observes is the export's gate on the pair the service asks
       * for, with the sibling control still able to act.
       */
      mockDemonstration.getActiveUser.mockResolvedValue(
        envelope({
          ...PERMITTED_ACTOR,
          permissions: ['policy.read', 'policy.exception.request', ...holds],
        }),
      );

      renderScreen();

      const action = screen.getByRole('button', { name: TEXT.exportAction });

      await waitFor(() => {
        expect(action).toHaveAttribute('aria-disabled', 'true');
      });

      // The reason names both permissions the service requires, read off the hint a keyboard focus
      // brings up rather than off a title attribute (rule P-8, rule B-3).
      action.focus();
      expect(action).toHaveFocus();
      expect(await screen.findByRole('tooltip')).toHaveTextContent(TEXT.exportNotPermitted);

      const enabledRow = POLICIES.find((policy) => policy.evaluated);

      expect(enabledRow, 'the fixture holds an evaluated policy whose grant action acts').toBeDefined();

      if (enabledRow !== undefined) {
        expect(await settledGrantAction(enabledRow)).not.toHaveAttribute('aria-disabled', 'true');
      }
    },
  );

  it.each([
    {
      title: 'while the acting persona is still being read',
      sentence: TEXT.exportIdentityPending,
      configure: (): void => {
        mockDemonstration.getActiveUser.mockReturnValue(
          new Promise<Result<ActiveUser>>(() => {
            /* never settles: the persona read the gate stands in for */
          }),
        );
      },
    },
    {
      title: 'when the acting persona could not be read',
      sentence: TEXT.exportIdentityFailed,
      configure: (): void => {
        mockDemonstration.getActiveUser.mockRejectedValue(UNANSWERED);
      },
    },
  ])('disables the export $title, naming why', async ({ sentence, configure }) => {
    configure();

    renderScreen();

    const action = screen.getByRole('button', { name: TEXT.exportAction });

    await waitFor(() => {
      expect(action).toHaveAttribute('aria-disabled', 'true');
    });

    action.focus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(sentence);
  });

  it.each([
    {
      title: 'is still being read',
      configure: (): void => {
        mockService.listPolicies.mockReturnValue(
          new Promise<Result<PolicyDetail[]>>(() => {
            /* never settles: the policy read the gate stands in for */
          }),
        );
      },
    },
    {
      title: 'was refused for policy.read',
      configure: (): void => {
        mockService.listPolicies.mockRejectedValue(DENIAL);
      },
    },
    {
      title: 'could not be read at all',
      configure: (): void => {
        mockService.listPolicies.mockRejectedValue(UNANSWERED);
      },
    },
  ])('claims nothing about the policy set while it $title', async ({ configure }) => {
    configure();

    renderScreen();

    /*
     * No policy row was read, so no row carries a grant control, and the page states no empty set: the
     * sentence that reports an empty policy set describes a read that answered with nothing, and none
     * of these states answered (rule P-8, rule P-6).
     */
    await waitFor(() => {
      expect(screen.queryByText(TEXT.policiesEmpty)).toBeNull();
    });

    expect(screen.queryAllByRole('button', { name: new RegExp(GRANT_ACTION_NAME) })).toHaveLength(0);
  });

  it('states the empty policy set only for a read that succeeded and returned no policy', async () => {
    // The one state the empty sentence describes: the read answered, and the set it answered with
    // holds nothing — so the page states what the payload said and offers no control to request an
    // exception against a policy that does not exist (rule P-8, rule P-6).
    mockService.listPolicies.mockResolvedValue(envelope([]));

    renderScreen();

    expect(await screen.findByText(TEXT.policiesEmpty)).toBeVisible();
    expect(screen.queryAllByRole('button', { name: new RegExp(GRANT_ACTION_NAME) })).toHaveLength(0);
  });

  it('renders nothing the page was not given, and duplicates no badge of its own', async () => {
    const container = renderScreen();

    await settledSummary();

    // The `Simulated data` marker belongs to the shell, which mounts it on every route: a screen that
    // rendered its own would say it twice (rule P-1).
    expect(screen.queryByText(SIM_LABELS[0])).toBeNull();

    // Every text node is a string the screen, the boundary or the payload supplied, so no sentence of
    // the screen's own — and with it no claim about the deployment — can reach the page unasserted
    // (rule P-4).
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
      expect(await settledGrantAction(at(POLICIES, 0, 'policy'))).toBeVisible();
      expect(screen.getByRole('button', { name: TEXT.exportAction })).toBeVisible();
    },
  );

  it('reaches the export action and a row’s grant action with Tab and acts from the keyboard', async () => {
    const user = userEvent.setup();

    installObjectUrlStubs();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      /* the file is offered, not navigated to */
    });

    renderScreen();
    await settledPoliciesTable();

    // The ring is the shared control structure's, read from that list rather than retyped (rule B-3):
    // jsdom paints nothing, so the utilities the control carries are what a case observes.
    const ringClasses = CONTROL_STRUCTURE_CLASSES.split(' ').filter((token) =>
      token.startsWith('focus-visible:'),
    );

    expect(ringClasses.length).toBeGreaterThan(0);

    /*
     * The export action is the page header's only control now, so the tab order opens on it. The grant
     * action is offered per policy row, below the header and below the tables that precede the policy
     * set, so the walk after it follows the document's own order instead of assuming a position.
     */
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

    let grant: HTMLElement | undefined;

    for (let step = 0; step < FOCUS_LIMIT && grant === undefined; step += 1) {
      await user.tab();

      const focused = document.activeElement;

      if (focused instanceof HTMLElement && focused.textContent?.startsWith(GRANT_ACTION_NAME)) {
        grant = focused;
      }
    }

    expect(grant, 'a policy row’s grant action is reachable with Tab (rule B-3)').toBeDefined();

    if (grant === undefined) {
      return;
    }

    for (const ringClass of ringClasses) {
      expect(grant.className.split(' ')).toContain(ringClass);
    }

    /*
     * The copy the keyboard reached is one that acts, and it opens the flow for its own policy: the
     * identifier its accessible name carries is the policy the dialog then names (AAP 0.12.4, rule B-3).
     */
    expect(grant).not.toHaveAttribute('aria-disabled', 'true');

    const reachedText = grant.textContent ?? '';
    const pressed = POLICIES.filter((policy) => reachedText.includes(policy.id));

    expect(pressed).toHaveLength(1);

    await user.keyboard('{Enter}');

    const dialog = await screen.findByRole('dialog', {
      name: GRANT_EXCEPTION_DIALOG_TEXT.heading,
    });

    expect(dialog).toHaveTextContent(at(pressed, 0, 'policy the keyboard reached').title);
  });
});

