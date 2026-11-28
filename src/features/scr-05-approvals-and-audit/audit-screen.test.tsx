/**
 * Component suite for `audit-screen.tsx`, the audit trail of SCR-05.
 *
 * WHAT IT PROVES. Eleven groups of assertions, each stated as a contract the screen is relied on for
 * rather than as a description of its markup: the trail's rows (`T-09`), the `AuditQuery` each filter
 * sends, the one page each read asks for with the controls that move through the trail, the fixed chain
 * note character for character with the specification §5.3 label it carries,
 * a verification that found no break, an edited chain that reports the position of its first break
 * (`T-17`), a chain with more than one break so "first" and "total" cannot be confused, a verification
 * that repairs nothing, the detail drawer and its keyboard contract (`T-16`), the seven screen states
 * (`T-17`), and both themes. Together they are the component-level half of the audit trail the
 * browser specs assert, and they make the edited-chain behaviour observable without a browser.
 *
 * WHERE THE DATA COMES FROM. The service is mocked at `service-provider.tsx`, the one boundary the
 * screen is allowed to read through (rule P-2), so no seed module, no adapter and no domain module is
 * involved and the suite observes exactly the calls the screen makes. Everything else — `DataTable`,
 * `MonoValue`, `StatusIndicator`, `StateBoundary`, `ActionButton` and the panels — is the real
 * component, because what a reader actually receives is the thing under test.
 *
 * THE FIXTURE CONSTRAINT (rule P-6). `tests/source-checks/no-typed-figures.test.ts` scans
 * `src/features/**`, this file included, for currency literals and for literals shaped like a domain
 * identifier, so every identifier here is an opaque placeholder (`event-alpha`, `record-beta`) and no
 * amount appears anywhere in the suite. The one figure the screen reports that matters most — the
 * position of the first break — is never typed: each fixture event's `sequence` derives from the
 * list's own base, and each `ChainBreak` is built from the event fixture's own `sequence` and `id`.
 * A case therefore cannot pass by agreeing with a constant someone typed here; it passes only where
 * the screen prints what the report handed it. Instants are derived from the imported `DEMO_CLOCK`
 * constant rather than written out, and digests are built by repetition rather than held as literal
 * hex, so no long credential-shaped string sits in this file either (rule B-2 and its scan).
 *
 * THE NOTE, AND WHY THIS SUITE AND THE CLAIM SCAN HOLD TOGETHER. {@link AUDIT_CHAIN_NOTE} is the
 * sentence the "Verify chain" row of AAP §0.10 and the SCR-05 row of AAP §0.12.4 fix for this screen,
 * and rule P-4 requires the chain to carry it; it is imported here rather than re-spelled, so a reworded
 * note fails a case instead of passing silently. The claim patterns reject exactly the five adjectival
 * forms AAP §0.10 names — one for a proof against tampering, one for a resistance to it, one for a
 * trusting-nothing posture, one for a guarantee and one for a certification — and stop deliberately
 * short of the noun phrase the note carries, because the note *denies* the claim rather than making it,
 * and a pattern that reached the noun would forbid the very sentence rule P-4 requires. Both halves of
 * the rule prove it: `tests/source-checks/forbidden-strings.test.ts` lists the note among the interface
 * text its scan must leave alone (`REQUIRED_INTERFACE_TEXT`), and `e2e/bundle-checks.spec.ts` does the
 * same over the built `dist/` (`SAMPLES_THAT_MUST_NOT_MATCH`).
 *
 * Two habits here follow from that and stay. The claim vocabulary the verification must *not* use is
 * assembled from fragments — the same device `tests/source-checks/no-secrets.test.ts` uses for its own
 * samples — so this suite can assert that vocabulary's absence without carrying it. And the
 * whole-document scan runs over the rendered text with the fixed note removed, because the note is the
 * one place the words legitimately appear and it is the sentence denying the claim rather than making
 * it.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock, touches the network or reaches outside the service boundary.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STATE_BOUNDARY_TEXT } from '../../components/state-boundary';
import { MEANING_COLOUR_CLASSES } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import {
  APPROVAL_GATE_SOURCE,
  DEMO_CLOCK,
  GENESIS_PREVIOUS_HASH,
  SIM_LABELS,
  SOURCE_IDS,
  SOURCE_LABELS,
} from '../../types';
import type {
  AuditActorType,
  AuditEvent,
  AuditPayload,
  AuditQuery,
  AuditResult,
  ChainBreak,
  ChainReport,
  Freshness,
  FreshnessState,
  Permission,
  PolicyId,
  Problem,
  Result,
  Role,
  Scope,
  SourceId,
  Timestamp,
} from '../../types';
import { AUDIT_CHAIN_NOTE, AUDIT_PAGE_SIZE, AuditScreen } from './audit-screen';

/* ---------------------------------------------------------------------------------------------
 * The fixtures — every value a record's own, and none of them a typed figure
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every result and every failure of these fixtures carries. */
const TRACE_ID = 'trace-audit-trail';

/** The instant the six sources last answered: the demonstration clock's own instant, never typed. */
const AS_OF: Timestamp = DEMO_CLOCK;

/**
 * The clock's own date and offset with a given hour.
 *
 * Fixture instants are derived from `DEMO_CLOCK` rather than written out, so the suite holds no typed
 * date and a change of the demonstration clock reaches every instant here at once.
 */
function instantAt(hour: number): Timestamp {
  return `${DEMO_CLOCK.slice(0, 11)}${String(hour).padStart(2, '0')}${DEMO_CLOCK.slice(13)}`;
}

/** The position the fixture events start at; every sequence below derives from it and the list order. */
const FIRST_SEQUENCE = 7;

/** The walk time a report carries; the screen renders neither it nor anything derived from it. */
const WALK_DURATION_MS = 3;

/** The scope the shell hands the screen: the unfiltered "all plants, all products" selection. */
const SCOPE: Scope = { plants: [], products: [] };

/**
 * The page every trail read asks for: one page plus the single event that follows it, which is how the
 * screen learns whether a further page exists without counting the chain.
 *
 * Derived from the screen's own exported page size rather than re-typed, so a suite that spelled the
 * number itself would not keep passing after the screen's page changed.
 */
const PAGE_QUERY: AuditQuery = { limit: AUDIT_PAGE_SIZE + 1 };

/**
 * The payload value the drawer must print as text rather than run: markup a record may legitimately
 * hold and that a screen which injected it would execute. Held once, because the fixture and the
 * escaping assertion must be about the same string.
 */
const INJECTED_TEXT = '<strong>held</strong>';

/** The policy the fixture's policy-actor event records. */
const POLICY_ID: PolicyId = 'policy-alpha';

/** One event's content, before the list gives it a position and the chain gives it its digests. */
interface EventSpec {
  /** The event's opaque identifier; no record-identifier shape, so no figure scan reads one. */
  readonly id: string;

  /** Which kind of actor appended it. */
  readonly actorType: AuditActorType;

  /** The acting persona, or the policy identifier on a policy-actor event. */
  readonly actorId: string;

  /** What the event records, in the canonical action spelling the record itself uses. */
  readonly action: string;

  /** The record the event is about. */
  readonly objectRef: string;

  /** The outcome it records. */
  readonly result: AuditResult;

  /** The policy that decided it, present only on a policy-actor event. */
  readonly policyId?: PolicyId;

  /** The values the action started from, or `null` when it created the record. */
  readonly before: AuditPayload | null;

  /** The values the action produced, or `null` when it removed the record. */
  readonly after: AuditPayload | null;
}

/**
 * A lowercase-hex-shaped placeholder digest, distinct per marker.
 *
 * Built by repetition rather than held as a literal: a sixty-four character hex digest of mixed case
 * and digits is exactly the shape rule B-2's scan treats as an encoded credential, and a fixture has
 * no reason to carry one.
 */
function digest(marker: string): string {
  return marker.repeat(64);
}

/**
 * One event of the fixture chain, at the given position of the list.
 *
 * The link is coherent on purpose: an event's `previousHash` is the predecessor's `eventHash`, and the
 * first event's is the genesis value of contracts §6, so the fixtures are a chain rather than a list
 * that merely has the right fields.
 */
function auditEvent(spec: EventSpec, index: number): AuditEvent {
  return {
    sequence: FIRST_SEQUENCE + index,
    id: spec.id,
    timestamp: instantAt(Number(DEMO_CLOCK.slice(11, 13)) + index),
    actorType: spec.actorType,
    actorId: spec.actorId,
    action: spec.action,
    objectRef: spec.objectRef,
    result: spec.result,
    ...(spec.policyId === undefined ? {} : { policyId: spec.policyId }),
    before: spec.before,
    after: spec.after,
    payloadHash: digest(String(index + 2)),
    traceId: TRACE_ID,
    previousHash: index === 0 ? GENESIS_PREVIOUS_HASH : digest(String(index)),
    eventHash: digest(String(index + 1)),
  };
}

/** A persona's own note on a record, which succeeded and carries the markup payload in its `after`. */
const EVENT_ALPHA = auditEvent(
  {
    id: 'event-alpha',
    actorType: 'user',
    actorId: 'persona-alpha',
    action: 'note',
    objectRef: 'record-alpha',
    result: 'succeeded',
    before: { state: 'held', remark: 'held pending review' },
    after: { state: 'released', remark: INJECTED_TEXT },
  },
  0,
);

/** A policy's own refusal, recorded by the mechanism that made it. */
const EVENT_BETA = auditEvent(
  {
    id: 'event-beta',
    actorType: 'policy',
    actorId: POLICY_ID,
    action: 'policy block',
    objectRef: 'record-beta',
    result: 'blocked',
    policyId: POLICY_ID,
    before: null,
    after: { decision: 'blocked', policyId: POLICY_ID },
  },
  1,
);

/** A write the adapter recorded as failed, which left the record as it stood. */
const EVENT_GAMMA = auditEvent(
  {
    id: 'event-gamma',
    actorType: 'system',
    actorId: 'bootstrap',
    action: 'export',
    objectRef: 'record-gamma',
    result: 'failed',
    before: { state: 'exported' },
    after: { state: 'failed' },
  },
  2,
);

/** A reassignment an allowed call recorded. */
const EVENT_DELTA = auditEvent(
  {
    id: 'event-delta',
    actorType: 'user',
    actorId: 'persona-beta',
    action: 'assign',
    objectRef: 'record-delta',
    result: 'allowed',
    before: { owner: 'persona-alpha' },
    after: { owner: 'persona-beta' },
  },
  3,
);

/** The trail the read returns, in the chain's own order. */
const EVENTS: readonly AuditEvent[] = [EVENT_ALPHA, EVENT_BETA, EVENT_GAMMA, EVENT_DELTA];

/**
 * One filled page of the trail: `AUDIT_PAGE_SIZE` events plus the single event that follows them, which
 * is what a read asks for so the screen can tell whether a further page exists.
 *
 * Every value derives from the list's own index — the position, the identifier, the payload — so the
 * fixture types no record value (rule P-6). All of them carry the demonstration clock's own instant,
 * because the cases built on them assert which page a read asked for rather than how a page is ordered
 * in time.
 */
const FULL_PAGE: readonly AuditEvent[] = Array.from(
  { length: AUDIT_PAGE_SIZE + 1 },
  (_, index): AuditEvent => ({
    sequence: FIRST_SEQUENCE + index,
    id: `event-${String(index)}`,
    timestamp: instantAt(Number(DEMO_CLOCK.slice(11, 13))),
    actorType: 'user',
    actorId: 'persona-alpha',
    action: 'note',
    objectRef: `record-${String(index)}`,
    result: 'succeeded',
    before: null,
    after: { position: index },
    payloadHash: digest(String(index + 2)),
    traceId: TRACE_ID,
    previousHash: index === 0 ? GENESIS_PREVIOUS_HASH : digest(String(index)),
    eventHash: digest(String(index + 1)),
  }),
);

/** What the read behind the newest page returns: the one event the first read had to hold back. */
const PAGE_TAIL: readonly AuditEvent[] = FULL_PAGE.slice(-1);

/**
 * The break the report of an edited event carries, taken from the event fixtures themselves.
 *
 * The position and the identifier are the record's own, so the assertion downstream compares the
 * screen's reading against the report rather than against a constant typed here (rule P-6).
 */
const FIRST_BREAK: ChainBreak = { sequence: EVENT_BETA.sequence, id: EVENT_BETA.id };

/** A second break further down the chain, so "the position of the first" is distinguishable. */
const SECOND_BREAK: ChainBreak = { sequence: EVENT_DELTA.sequence, id: EVENT_DELTA.id };

/** The three reports a verification can return, as the service hands them over. */
const REPORTS = {
  /** Every event recomputed, nothing to report. */
  unbroken: { eventsChecked: EVENTS.length, breaks: [], durationMs: WALK_DURATION_MS },
  /** One recorded result edited without recomputing its hash. */
  oneBreak: { eventsChecked: EVENTS.length, breaks: [FIRST_BREAK], durationMs: WALK_DURATION_MS },
  /** Two positions that do not verify, so the first and the count differ. */
  twoBreaks: {
    eventsChecked: EVENTS.length,
    breaks: [FIRST_BREAK, SECOND_BREAK],
    durationMs: WALK_DURATION_MS,
  },
} satisfies Record<string, ChainReport>;

/** The status meaning each fixture outcome must read as, which is the screen's documented mapping. */
const EXPECTED_MEANINGS: Record<AuditResult, StatusMeaning> = {
  allowed: 'pass',
  blocked: 'warning',
  succeeded: 'pass',
  failed: 'fail',
};

/** The six sources all answering and current, as `Meta.freshness` reports them. */
const FRESH_SOURCES: Freshness[] = SOURCE_IDS.map(
  (source): Freshness => ({ source, asOf: AS_OF, state: 'fresh' }),
);

/** The same report with one source in the given state. */
function freshnessWith(state: FreshnessState, source: SourceId = APPROVAL_GATE_SOURCE): Freshness[] {
  return FRESH_SOURCES.map((entry) => (entry.source === source ? { ...entry, state } : entry));
}

/** The envelope every read resolves to. */
function envelope<T>(data: T, freshness: Freshness[] = FRESH_SOURCES): Result<T> {
  return { data, meta: { freshness, simulated: true, traceId: TRACE_ID } };
}

/** The permission the refused read names, from the contracts §7.1 vocabulary. */
const REQUIRED_PERMISSION: Permission = 'audit.read';

/** The roles that hold it, which the refusal carries so the card can name who may act. */
const ROLES_WITH_PERMISSION: Role[] = ['auditor', 'platform-administrator'];

/** The refusal a persona without `audit.read` meets. */
const DENIAL: Problem = {
  type: 'permission',
  message: 'Reading the audit trail needs a permission the acting persona does not hold.',
  traceId: TRACE_ID,
  requiredPermission: REQUIRED_PERMISSION,
  rolesWithPermission: ROLES_WITH_PERMISSION,
};

/** The refusal a record that moved under the reader produces. */
const MOVED_RECORD: Problem = {
  type: 'validation',
  message: 'The request was read against records that changed while the view was open.',
  traceId: TRACE_ID,
};

/**
 * The visible labels and control names this suite drives.
 *
 * They are the screen's own wording, which it does not export, so they are stated here once: a
 * reworded label reaches a single place in the suite. Every string an input fixes — the §5.3 labels,
 * {@link AUDIT_CHAIN_NOTE}, and the boundary's own sentences — is imported instead and never retyped.
 */
const UI = {
  verifyChain: 'Verify chain',
  closeDetail: 'Close event detail',
  actor: 'Actor',
  action: 'Action',
  objectRef: 'Record',
  outcome: 'Outcome',
  from: 'From',
  to: 'To',
  previousPage: 'Previous page',
  nextPage: 'Next page',
} as const;

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/**
 * The name the trail's read is cached under: the port's own method name, which is the read a write
 * marks invalid and a simulation trigger or `Reset demo data` clears.
 *
 * Typed here rather than imported, because what the case proves is that the screen reacts to the
 * re-issue the shell performs for that read — an import of the screen's own constant would let both
 * sides drift together and keep the case green.
 */
const TRAIL_READ = 'listAuditEvents';

/**
 * The vocabulary of an unimplemented claim, assembled from fragments (rule P-4).
 *
 * It is built rather than typed so that this file does not itself carry the words
 * `tests/source-checks/forbidden-strings.test.ts` rejects — the device
 * `tests/source-checks/no-secrets.test.ts` uses for its own samples. What the suite asserts is that
 * the verification's reading states none of it, which is the claim rule P-4 forbids the application
 * from making about a mechanism a browser page cannot establish.
 */
const CLAIM_PATTERN = new RegExp(
  [
    ['tamper', 'proof'],
    ['tamper', 'resist'],
    ['zero', 'trust'],
    ['guarant'],
    ['certif'],
    ['repair'],
    ['notaris'],
    ['seal'],
  ]
    .map((fragment) => fragment.join(''))
    .join('|'),
  'iu',
);

/* ---------------------------------------------------------------------------------------------
 * The service boundary — mocked at the provider, never at the network
 * ------------------------------------------------------------------------------------------- */

/**
 * The port members this suite observes.
 *
 * The two the screen reads are first, and the members beside them are the reads and writes of the
 * same port the screen must leave alone: "a verification repairs nothing" is only asserted where the
 * suite can show that no other member was reached at all, so the object it hands `useService()` is
 * enumerable and {@link calledMembers} reports exactly which of it was touched.
 */
const mockService = vi.hoisted(() => ({
  listAuditEvents: vi.fn(),
  verifyAuditChain: vi.fn(),
  getAuditEvent: vi.fn(),
  listExceptions: vi.fn(),
  requestApproval: vi.fn(),
  decideApproval: vi.fn(),
  resetDemo: vi.fn(),
}));

vi.mock('../../services/service-provider', () => ({
  useService: () => mockService,
}));

/** Every port member this suite observed a call on. */
function calledMembers(): readonly string[] {
  return Object.entries(mockService)
    .filter(([, member]) => member.mock.calls.length > 0)
    .map(([name]) => name);
}

/** The query of every trail read the screen issued, in call order. */
function readQueries(): readonly AuditQuery[] {
  return mockService.listAuditEvents.mock.calls.map(([query]) => query as AuditQuery);
}

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/** One user-event session, as the suite's helpers take it. */
type UserSession = ReturnType<typeof userEvent.setup>;

/**
 * Renders the screen as the shell mounts it: behind an in-memory router, inside a cache of its own,
 * with retries off so a refusal fails the same way however often it is repeated.
 *
 * The cache is handed back because the cache is how the application re-issues a read: a write marks
 * the reads it moved invalid, and `Reset demo data` and every simulation trigger clear what they
 * answered (`src/app/simulation-controls.tsx`), so a case that has to prove what the screen does once
 * the records behind its reads have moved has to drive the same cache the screen observes.
 *
 * @returns The cache the screen renders inside, for a case that re-issues a read the way the shell
 *   does.
 */
function renderScreen(): QueryClient {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuditScreen scope={SCOPE} />
      </QueryClientProvider>
    </MemoryRouter>,
  );

  return queryClient;
}

/**
 * The panel holding the verification control, its fixed note and the last report.
 *
 * Located through the note the panel carries, so no caption is retyped here: the note is the fixed
 * string an input owns, and it is the panel's own content.
 */
function verificationPanel(): HTMLElement {
  const panel = screen.getByText(AUDIT_CHAIN_NOTE).closest('section');

  if (!(panel instanceof HTMLElement)) {
    throw new Error('the verification group is not rendered as a panel');
  }

  return panel;
}

/** The region the last verification reported in. */
async function verifiedReport(): Promise<HTMLElement> {
  return within(verificationPanel()).findByRole('status');
}

/** Activates the verification control and waits for its report to arrive. */
async function verifyChain(user: UserSession): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: UI.verifyChain }));

  return verifiedReport();
}

/** Waits until the verification control can act again, which is how a second check is started. */
async function waitForIdleVerification(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: UI.verifyChain })).not.toHaveAttribute(
      'aria-disabled',
    );
  });
}

/** How many data rows the trail's table renders, which is the page it was handed. */
function trailRowCount(): number {
  return within(screen.getByRole('table')).getAllByRole('row').length - 1;
}

/** The row of the trail that carries the given event, in whatever order the table shows it. */
function rowOf(event: AuditEvent): HTMLElement {
  const table = screen.getByRole('table');
  const rows = within(table).getAllByRole('row').slice(1);
  const row = rows.find(
    (candidate) =>
      within(candidate).getAllByRole('cell')[0]?.textContent === String(event.sequence),
  );

  if (row === undefined) {
    throw new Error(`the trail has no row for sequence ${String(event.sequence)}`);
  }

  return row;
}

/**
 * Opens the given event's detail with the keyboard, the way the row cursor's `Enter` does.
 *
 * The row is focused first because that is what the table's cursor does: exactly one row is tabbable
 * and `Enter` on it is the keyboard's way in. Focusing it is also what makes the focus-return case
 * meaningful, since the drawer returns focus to whichever element opened it.
 */
async function openDetail(user: UserSession, event: AuditEvent): Promise<HTMLElement> {
  const row = rowOf(event);

  act(() => {
    row.focus();
  });
  expect(row).toHaveFocus();

  await user.keyboard('{Enter}');

  return screen.getByRole('dialog');
}

/** One filter the screen renders, and the `AuditQuery` member its control must produce. */
interface FilterCase {
  /** The control's visible label, which is also its accessible name. */
  readonly label: string;

  /** The member of `AuditQuery` the control fills. */
  readonly member: string;

  /** The value the case types or picks. */
  readonly value: string;

  /** Which kind of control the filter is: a free-text field or an enumerated one. */
  readonly kind: 'text' | 'choice';

  /**
   * How a text filter's edit is committed: `Enter`, or the blur the reader makes on leaving the field.
   * The field accepts both, so the table drives both rather than testing the second gesture twice.
   */
  readonly commitsBy?: 'enter' | 'blur';
}

/** Every filter the trail renders, one case each. */
const FILTER_CASES: readonly FilterCase[] = [
  { label: UI.actor, member: 'actorId', value: 'persona-alpha', kind: 'text' },
  { label: UI.action, member: 'action', value: 'note', kind: 'text' },
  { label: UI.objectRef, member: 'objectRef', value: 'record-alpha', kind: 'text' },
  { label: UI.outcome, member: 'result', value: 'blocked', kind: 'choice' },
  { label: UI.from, member: 'from', value: instantAt(9), kind: 'text' },
  { label: UI.to, member: 'to', value: instantAt(17), kind: 'text', commitsBy: 'blur' },
];

/**
 * Applies one filter through its own control, and commits it the way a reader does.
 *
 * A text filter reports a finished edit rather than each keystroke — the screen commits it on `Enter`
 * and on blur — so the value is typed and then committed with the gesture the case names, `Enter`
 * unless it takes the blur path. An enumerated filter commits as soon as an option is picked, because
 * a select reports a finished choice rather than text being typed. Either way the edit is one commit,
 * and every case then asserts the one read that commit issues.
 */
async function applyFilter(user: UserSession, filter: FilterCase): Promise<void> {
  const control = screen.getByLabelText(filter.label);

  if (filter.kind === 'choice') {
    await user.selectOptions(control, filter.value);

    return;
  }

  await user.type(control, filter.value);

  /* Both gestures the field accepts are driven: `Enter` and leaving the field, which is what a reader
     who has finished with a filter does anyway. Each is one commit and therefore one read. */
  if (filter.commitsBy === 'blur') {
    await user.tab();

    return;
  }

  await user.keyboard('{Enter}');
}

/* ---------------------------------------------------------------------------------------------
 * Per-case state
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  for (const member of Object.values(mockService)) {
    member.mockReset();
  }

  mockService.listAuditEvents.mockResolvedValue(envelope(EVENTS));
  mockService.verifyAuditChain.mockResolvedValue(envelope(REPORTS.unbroken));
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

/* ---------------------------------------------------------------------------------------------
 * 1. The trail it renders — T-09
 * ------------------------------------------------------------------------------------------- */

describe('the trail it renders', () => {
  it('T-09 renders one row per event the read returned, in the chain order the service gave them', async () => {
    renderScreen();

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);

    expect(rows).toHaveLength(EVENTS.length);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual(
      EVENTS.map((event) => String(event.sequence)),
    );
  });

  it('T-09 announces the sequence column as descending, the order the read answers in', async () => {
    /* The read's own default is newest first, so the trail below is laid out the way the adapter
       answers it: the latest chain position leads. The table states that order, which is what a reader
       hears before touching a header, and it reorders nothing. */
    const newestFirst = [...EVENTS].reverse();

    mockService.listAuditEvents.mockResolvedValue(envelope(newestFirst));
    renderScreen();

    const table = await screen.findByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    const [sequenceHeader] = headers;

    if (sequenceHeader === undefined) {
      throw new Error('the trail rendered no sequence header to announce the order on');
    }

    expect(sequenceHeader).toHaveAttribute('aria-sort', 'descending');

    /* Every other column is unsorted until a reader sorts it, which is what makes the one announcement
       readable rather than one claim among nine. */
    for (const header of headers.slice(1)) {
      expect(header.getAttribute('aria-sort') ?? 'none').toBe('none');
    }

    expect(
      within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0]?.textContent),
    ).toEqual(newestFirst.map((event) => String(event.sequence)));
  });

  it("T-09 prints each event's own fields, with its outcome as an icon and a visible label", async () => {
    renderScreen();
    await screen.findByRole('table');

    for (const event of EVENTS) {
      const row = rowOf(event);
      const icon = row.querySelector('svg');

      expect(within(row).getByText(event.id)).toBeInTheDocument();
      expect(within(row).getByText(event.timestamp)).toBeInTheDocument();
      expect(within(row).getByText(event.action)).toBeInTheDocument();
      expect(within(row).getByText(event.objectRef)).toBeInTheDocument();
      expect(within(row).getByText(event.result)).toBeInTheDocument();

      /* The meaning never rests on colour alone: an icon is present beside the label (rule B-3). */
      expect(icon).not.toBeNull();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it("T-09 keeps a policy-actor event's policy in the policy column and leaves it blank without one", async () => {
    renderScreen();
    await screen.findByRole('table');

    /* The policy column is the last one, and it carries the record's own policy where the event has
       one: the policy-actor event names the policy in its actor field too, which is why the cell is
       read by its position rather than by a text query that would match both. */
    expect(within(rowOf(EVENT_BETA)).getAllByRole('cell').at(-1)?.textContent).toBe(POLICY_ID);
    expect(within(rowOf(EVENT_ALPHA)).getAllByRole('cell').at(-1)?.textContent).toBe('');
  });

  it('T-09 renders every identifier and instant through the one presentation formatter', async () => {
    renderScreen();
    await screen.findByRole('table');

    const row = rowOf(EVENT_ALPHA);

    for (const value of [
      within(row).getByText(EVENT_ALPHA.id),
      within(row).getByText(EVENT_ALPHA.timestamp),
      within(row).getByText(EVENT_ALPHA.objectRef),
    ]) {
      expect(value).toHaveClass('font-mono');
      expect(value).toHaveClass('tabular-nums');
    }
  });

  it('T-09 forms the drawer’s Record field in the tabular mono face the column uses', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('table');

    const dialog = await openDetail(user, EVENT_ALPHA);
    const field = within(dialog).getByText(EVENT_ALPHA.objectRef);

    /* The drawer states the same member the Record column does, so it is the same kind of value and
       reaches the reader in the same face (AAP §0.5.3); its text stays the record's own. */
    expect(field).toHaveClass('font-mono');
    expect(field).toHaveClass('tabular-nums');
    expect(field.textContent).toBe(EVENT_ALPHA.objectRef);
  });

  it('T-09 carries every outcome in the shared status vocabulary, colour and label together', async () => {
    renderScreen();
    await screen.findByRole('table');

    for (const event of EVENTS) {
      const label = within(rowOf(event)).getByText(event.result);
      const meaning = EXPECTED_MEANINGS[event.result];
      const icon = label.parentElement?.querySelector('span[aria-hidden="true"]');

      expect(icon).not.toBeNull();
      expect(icon).toHaveClass(MEANING_COLOUR_CLASSES[meaning]);
    }
  });

  it('names the table for assistive technology and scopes a header to every column', async () => {
    renderScreen();

    const table = await screen.findByRole('table');
    const headers = within(table).getAllByRole('columnheader');

    expect(table).toHaveAccessibleName();
    expect(headers.length).toBeGreaterThan(0);

    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * 2. The filters it sends
 * ------------------------------------------------------------------------------------------- */

describe('the filters it sends', () => {
  it.each(FILTER_CASES)(
    'sends the $label filter as the one AuditQuery member its control builds',
    async (filter) => {
      const user = userEvent.setup();
      renderScreen();
      await screen.findByRole('table');
      await waitFor(() => {
        expect(mockService.listAuditEvents).toHaveBeenCalledTimes(1);
      });

      await applyFilter(user, filter);

      await waitFor(() => {
        expect(mockService.listAuditEvents).toHaveBeenCalledTimes(2);
      });
      /* The page travels with the filter: one page plus the event after it, and no cursor on the read
         that shows the newest page — paging back is a later read, asserted on its own below. */
      expect(mockService.listAuditEvents).toHaveBeenNthCalledWith(1, PAGE_QUERY);
      expect(mockService.listAuditEvents).toHaveBeenNthCalledWith(2, {
        ...PAGE_QUERY,
        [filter.member]: filter.value,
      });
    },
  );

  it('issues one read per committed filter rather than one per character typed', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('table');
    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(1);
    });

    const typed = 'persona-alpha';
    const actorField = screen.getByLabelText(UI.actor);

    await user.type(actorField, typed);

    /* Every character stays in the field's own draft: the committed filters are the read's cache key,
       so a commit per keystroke would ask the service for a page of the trail per character typed and
       cache a page behind each of them. */
    expect(actorField).toHaveValue(typed);
    expect(mockService.listAuditEvents).toHaveBeenCalledTimes(1);

    /* The reader's commit is the whole edit: one activation of the field, one read, one query. */
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(2);
    });
    expect(readQueries()).toEqual([PAGE_QUERY, { ...PAGE_QUERY, actorId: typed }]);
  });

  it('keeps the committed field in place and focused, so the next edit needs no second click', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('table');
    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(1);
    });

    /* The trailing space makes the commit change the filter to something other than the draft — the trim
       is what replaces it — so the case covers the resynchronisation as well as the place it happens in. */
    const actorField = screen.getByLabelText(UI.actor);

    await user.type(actorField, 'persona-alpha ');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(2);
    });

    /* The commit's read carries the trimmed value... */
    expect(readQueries()).toEqual([PAGE_QUERY, { ...PAGE_QUERY, actorId: 'persona-alpha' }]);

    /* ...and the input that sent it is the same element, still in the document, still holding the
       committed text and still the element with focus: a reader who commits with `Enter` carries on
       typing without reaching for the pointer (rule B-3). */
    const committedField = screen.getByLabelText(UI.actor);

    expect(committedField).toBe(actorField);
    expect(actorField).toBeInTheDocument();
    expect(actorField).toHaveValue('persona-alpha');
    expect(document.activeElement).toBe(actorField);
  });

  it('builds the query from every filter that is set, and re-issues no earlier one', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('table');
    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(1);
    });

    await applyFilter(user, { label: UI.actor, member: 'actorId', value: 'persona-alpha', kind: 'text' });
    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(2);
    });

    await applyFilter(user, { label: UI.action, member: 'action', value: 'note', kind: 'text' });
    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(3);
    });

    /* Exactly three reads, each carrying more of the filter than the one before it: the unfiltered
       query is never asked for again, no member is sent that the reader left alone, and every read
       carries the one page it asks for. */
    expect(readQueries()).toEqual([
      PAGE_QUERY,
      { ...PAGE_QUERY, actorId: 'persona-alpha' },
      { ...PAGE_QUERY, actorId: 'persona-alpha', action: 'note' },
    ]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * 3. The fixed note it carries
 * ------------------------------------------------------------------------------------------- */

describe('the fixed note it carries', () => {
  it('T-09 renders the chain note character for character, with the label the rule requires', () => {
    renderScreen();

    const note = screen.getByText(AUDIT_CHAIN_NOTE);
    const panel = verificationPanel();

    /* Character for character, against the imported constant: a paraphrased note fails here. */
    expect(note.textContent).toBe(AUDIT_CHAIN_NOTE);

    /* The note itself carries the §5.3 label, and the control it explains sits in the same group. */
    expect(note).toHaveTextContent(SIM_LABELS[4]);
    expect(within(panel).getByRole('button', { name: UI.verifyChain })).toBeInTheDocument();
    expect(within(panel).getByText(AUDIT_CHAIN_NOTE)).toBe(note);
  });

  it('labels the chain on the trail itself, because a page-level badge labels no figure', async () => {
    renderScreen();
    await screen.findByRole('table');

    /* One label before any check runs: the chain's own, printed above the trail it describes. */
    expect(screen.getAllByText(SIM_LABELS[4])).toHaveLength(1);
  });
});

/* ---------------------------------------------------------------------------------------------
 * 4. A chain that verifies
 * ------------------------------------------------------------------------------------------- */

describe('a chain that verifies', () => {
  it('reports the count it checked, the pass reading and the label, from one call', async () => {
    const user = userEvent.setup();
    mockService.verifyAuditChain.mockResolvedValue(envelope(REPORTS.unbroken));
    renderScreen();
    await screen.findByRole('table');

    const report = await verifyChain(user);

    expect(mockService.verifyAuditChain).toHaveBeenCalledTimes(1);
    expect(report).toHaveTextContent(`${REPORTS.unbroken.eventsChecked} recorded events`);
    expect(report.querySelector(`.${MEANING_COLOUR_CLASSES.pass}`)).not.toBeNull();
    expect(report.querySelector(`.${MEANING_COLOUR_CLASSES.fail}`)).toBeNull();
    expect(within(report).getByText(SIM_LABELS[4])).toBeInTheDocument();

    /* The trail keeps its own label, so the run has two: the chain's and the check's. */
    expect(screen.getAllByText(SIM_LABELS[4])).toHaveLength(2);
  });

  it('verifies only when it is asked, so the read on load issues no check', async () => {
    renderScreen();
    await screen.findByRole('table');

    expect(mockService.verifyAuditChain).not.toHaveBeenCalled();
    expect(within(verificationPanel()).queryByRole('status')).toBeNull();
  });
});

/* ---------------------------------------------------------------------------------------------
 * 5-7. A chain that does not verify, and the two demonstrations of what a check may not do — T-17
 * ------------------------------------------------------------------------------------------- */

describe('a chain that does not verify', () => {
  it('T-17 reports the position of the first break with the event there, and claims nothing more', async () => {
    const user = userEvent.setup();
    mockService.verifyAuditChain.mockResolvedValue(envelope(REPORTS.oneBreak));
    renderScreen();
    await screen.findByRole('table');

    /* The fixture's break is the event fixtures' own position, so this case cannot pass against a
       constant: the screen must print what the report handed it. */
    expect(REPORTS.oneBreak.breaks).toEqual([FIRST_BREAK]);

    const report = await verifyChain(user);

    expect(report).toHaveTextContent(String(FIRST_BREAK.sequence));
    expect(report).toHaveTextContent(FIRST_BREAK.id);
    expect(report).toHaveTextContent(`${REPORTS.oneBreak.eventsChecked} recorded events`);
    expect(report.querySelector(`.${MEANING_COLOUR_CLASSES.fail}`)).not.toBeNull();
    expect(within(report).getByText(SIM_LABELS[4])).toBeInTheDocument();

    /* Nothing the application may not claim appears: the reading states positions and no repair,
       seal, notarisation or resistance to an edit (rule P-4). */
    expect(report.textContent ?? '').not.toMatch(CLAIM_PATTERN);

    /* The same over every character on screen except the fixed note, which names the condition it
       denies rather than making the claim: note and scan pass together, and this file's header records
       both halves of the rule that let them. */
    const withoutFixedNote = (document.body.textContent ?? '').split(AUDIT_CHAIN_NOTE).join('');

    expect(withoutFixedNote).not.toMatch(CLAIM_PATTERN);
  });

  it('T-17 prints the first break as the position and the count as the total, keeping the two apart', async () => {
    const user = userEvent.setup();
    mockService.verifyAuditChain.mockResolvedValue(envelope(REPORTS.twoBreaks));
    renderScreen();
    await screen.findByRole('table');

    const report = await verifyChain(user);

    expect(report).toHaveTextContent(String(FIRST_BREAK.sequence));
    expect(report).not.toHaveTextContent(String(SECOND_BREAK.sequence));
    expect(
      within(report).getByText(
        new RegExp(`total:\\s*${String(REPORTS.twoBreaks.breaks.length)}`, 'u'),
      ),
    ).toBeInTheDocument();
  });

  it('T-17 repairs nothing: two activations are two checks, and no other member is reached', async () => {
    const user = userEvent.setup();
    mockService.verifyAuditChain.mockResolvedValue(envelope(REPORTS.oneBreak));
    renderScreen();

    const table = await screen.findByRole('table');
    const rowsBefore = within(table)
      .getAllByRole('row')
      .map((row) => row.textContent);

    await verifyChain(user);
    await waitForIdleVerification();
    await verifyChain(user);
    await waitForIdleVerification();

    expect(mockService.verifyAuditChain).toHaveBeenCalledTimes(2);

    /* The trail is the one it was: same rows, same order, same events, and no second read of it. */
    const rowsAfter = within(screen.getByRole('table'))
      .getAllByRole('row')
      .map((row) => row.textContent);

    expect(rowsAfter).toEqual(rowsBefore);
    expect(mockService.listAuditEvents).toHaveBeenCalledTimes(1);
    expect(calledMembers()).toEqual(['listAuditEvents', 'verifyAuditChain']);
  });
});

/* ---------------------------------------------------------------------------------------------
 * 7b. The lifetime of a verdict, once the records behind the trail are re-issued — T-17
 * ------------------------------------------------------------------------------------------- */

describe('a verdict whose records are re-issued', () => {
  /**
   * The two cache actions the application issues for the trail's read, each as the shell performs it.
   *
   * A write marks every read it moved invalid, while a simulation trigger and `Reset demo data` clear
   * what the reads answered — `resetQueries` in `src/app/simulation-controls.tsx`, so that no screen
   * can serve a payload taken before the trigger moved. To a reader both are one statement: the
   * records behind this verdict may have moved, so the verdict is no longer about them.
   */
  const REISSUE_ACTIONS = ['invalidated', 'cleared'] as const;

  it.each(REISSUE_ACTIONS)(
    'T-17 drops a verdict the re-issued records outran, keeping the note and the control (read %s)',
    async (action) => {
      const user = userEvent.setup();
      mockService.verifyAuditChain.mockResolvedValue(envelope(REPORTS.oneBreak));
      const queryClient = renderScreen();
      await screen.findByRole('table');

      const report = await verifyChain(user);

      expect(report).toHaveTextContent(String(FIRST_BREAK.sequence));

      /* One re-issue of the trail's read, as the shell performs it: the records behind the trail may
         have moved, so the re-issue is the application's own statement that a verdict about how they
         stood is no longer a statement about them. */
      await act(async () => {
        if (action === 'invalidated') {
          await queryClient.invalidateQueries({ queryKey: [TRAIL_READ], refetchType: 'none' });
        } else {
          await queryClient.resetQueries({ queryKey: [TRAIL_READ] });
        }
      });

      const panel = verificationPanel();

      /* The verdict is gone: the break it reported belongs to a chain the reader can no longer see. */
      expect(within(panel).queryByRole('status')).toBeNull();
      expect(panel).not.toHaveTextContent(String(FIRST_BREAK.sequence));

      /* What the group is for survives the drop — the fixed note of the mechanism (rules P-1 and P-4)
         and a control that can still act (rule P-8) — so the reader can verify the restored chain. */
      expect(screen.getByText(AUDIT_CHAIN_NOTE)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: UI.verifyChain })).not.toHaveAttribute(
        'aria-disabled',
      );

      /* And it does: the restored chain verifies, which is the reading the panel now carries. */
      mockService.verifyAuditChain.mockResolvedValue(envelope(REPORTS.unbroken));

      const restored = await verifyChain(user);

      expect(restored.querySelector(`.${MEANING_COLOUR_CLASSES.pass}`)).not.toBeNull();
      expect(restored.querySelector(`.${MEANING_COLOUR_CLASSES.fail}`)).toBeNull();
    },
  );

  it('T-17 drops a verdict when a persona switch resets the trail read', async () => {
    const user = userEvent.setup();
    mockService.verifyAuditChain.mockResolvedValue(envelope(REPORTS.oneBreak));
    const queryClient = renderScreen();
    await screen.findByRole('table');

    const report = await verifyChain(user);

    expect(report).toHaveTextContent(String(FIRST_BREAK.sequence));

    /* A persona switch appends an audit event of its own and then re-issues the reads the outgoing
       persona decided by resetting them rather than invalidating them — `switchTo` in
       `src/app/role-switcher.tsx` calls `queryClient.resetQueries` — so the trail this verdict
       describes is not the trail the incoming persona reads. */
    await act(async () => {
      await queryClient.resetQueries({ queryKey: [TRAIL_READ] });
    });

    const panel = verificationPanel();

    /* The verdict is gone even though nothing invalidated it: the chain it checked has grown. */
    expect(within(panel).queryByRole('status')).toBeNull();
    expect(panel).not.toHaveTextContent(String(FIRST_BREAK.sequence));

    /* What the group is for survives the drop, so the reader can verify the chain they now read. */
    expect(screen.getByText(AUDIT_CHAIN_NOTE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: UI.verifyChain })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('T-17 keeps the verdict when the reader changes a filter, which reads another entry', async () => {
    const user = userEvent.setup();
    mockService.verifyAuditChain.mockResolvedValue(envelope(REPORTS.oneBreak));
    renderScreen();
    await screen.findByRole('table');

    const report = await verifyChain(user);

    await applyFilter(user, {
      label: UI.actor,
      member: 'actorId',
      value: 'persona-alpha',
      kind: 'text',
    });
    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(2);
    });

    /* A filter is a different cache entry and invalidates nothing, so the verdict still describes the
       chain the reader is looking at and must not be discarded by a reader narrowing the trail. */
    expect(verificationPanel()).toContainElement(report);
    expect(report).toHaveTextContent(String(FIRST_BREAK.sequence));
    expect(mockService.verifyAuditChain).toHaveBeenCalledTimes(1);
  });
});

/* ---------------------------------------------------------------------------------------------
 * 8. The detail drawer — T-16
 * ------------------------------------------------------------------------------------------- */

describe('the detail drawer', () => {
  it('opens as a modal dialog named by its own heading, with the values the action changed', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('table');

    const dialog = await openDetail(user, EVENT_ALPHA);

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName(new RegExp(EVENT_ALPHA.id, 'u'));
    expect(
      within(dialog).getByRole('heading', { name: new RegExp(EVENT_ALPHA.id, 'u') }),
    ).toBeInTheDocument();

    /* The event's own fields, each as the record holds it. */
    expect(within(dialog).getByText(String(EVENT_ALPHA.sequence))).toBeInTheDocument();
    expect(within(dialog).getByText(EVENT_ALPHA.action)).toBeInTheDocument();
    expect(within(dialog).getByText(EVENT_ALPHA.objectRef)).toBeInTheDocument();
    expect(within(dialog).getByText(EVENT_ALPHA.traceId)).toBeInTheDocument();
    expect(within(dialog).getByText(GENESIS_PREVIOUS_HASH)).toBeInTheDocument();
    expect(within(dialog).getByText(EVENT_ALPHA.eventHash)).toBeInTheDocument();

    /* Both payload halves, each value the record's own. */
    expect(within(dialog).getByText('held pending review')).toBeInTheDocument();
    expect(within(dialog).getByText(INJECTED_TEXT)).toBeInTheDocument();
  });

  it('F22 renders both of the drawer’s hashes in the tabular mono face, as every hash is set', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('table');

    const dialog = await openDetail(user, EVENT_ALPHA);

    /* AAP §0.2.1 sets every hash in the tabular mono face, so the two sixty-four character digests
       share one character width and neither reads as prose; each stays the record's own text. */
    for (const hash of [EVENT_ALPHA.previousHash, EVENT_ALPHA.eventHash]) {
      const value = within(dialog).getByText(hash);

      expect(value).toHaveClass('font-mono');
      expect(value).toHaveClass('tabular-nums');
      expect(value.textContent).toBe(hash);
    }
  });

  it('prints a payload as text, so a record can never introduce markup into the drawer', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('table');

    const dialog = await openDetail(user, EVENT_ALPHA);
    const payload = within(dialog).getByText(INJECTED_TEXT);

    expect(payload.tagName).toBe('SPAN');
    expect(dialog.querySelector('strong')).toBeNull();
    expect(dialog.querySelector('b')).toBeNull();
    expect(dialog.innerHTML).not.toContain('<strong>');
  });

  it('T-16 moves focus into the dialog, holds Tab inside it in both directions, and returns it on Esc', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('table');

    const dialog = await openDetail(user, EVENT_ALPHA);
    const close = within(dialog).getByRole('button', { name: UI.closeDetail });

    /* The panel itself takes focus as it opens, which is what announces the dialog. */
    expect(dialog).toHaveFocus();

    /* Its only control is where the tab sequence starts and, at both edges, where it stays: without
       the trap a Tab would leave the dialog for the fields behind it. */
    act(() => {
      close.focus();
    });
    expect(close).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(rowOf(EVENT_ALPHA)).toHaveFocus();
  });

  it('offers a single labelled way to dismiss itself, which closes the dialog', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('table');

    const dialog = await openDetail(user, EVENT_ALPHA);
    const controls = within(dialog).getAllByRole('button');

    expect(controls).toHaveLength(1);
    expect(controls[0]).toHaveAccessibleName(UI.closeDetail);

    await user.click(within(dialog).getByRole('button', { name: UI.closeDetail }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(rowOf(EVENT_ALPHA)).toHaveFocus();
  });
});

/* ---------------------------------------------------------------------------------------------
 * 9. The seven screen states — T-17
 * ------------------------------------------------------------------------------------------- */

describe('the seven screen states', () => {
  it('T-17 renders the loading state while the trail read is pending, withholding the trail', () => {
    mockService.listAuditEvents.mockReturnValue(new Promise<Result<AuditEvent[]>>(() => {}));
    renderScreen();

    expect(screen.getByRole('status', { name: STATE_BOUNDARY_TEXT.loading })).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('T-17 renders the empty state when the read returns no event, withholding the trail', async () => {
    mockService.listAuditEvents.mockResolvedValue(envelope([]));
    renderScreen();

    /* Wait for the read to settle rather than for the first status region: the loading region is one
       too, and it is the one on screen while the read is pending. */
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: STATE_BOUNDARY_TEXT.loading })).toBeNull();
    });

    const notice = screen.getByRole('status');

    expect(notice).toHaveTextContent(/audit events/iu);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('T-17 keeps the trail and names the source and its as-of time when the order book is stale', async () => {
    mockService.listAuditEvents.mockResolvedValue(envelope(EVENTS, freshnessWith('stale')));
    renderScreen();

    const headline = await screen.findByText(
      `${SOURCE_LABELS[APPROVAL_GATE_SOURCE]}${STATE_BOUNDARY_TEXT.staleSuffix}`,
    );
    const banner = headline.closest('[role="status"]');

    expect(banner).not.toBeNull();
    expect(banner).toHaveTextContent(AS_OF);
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(EVENTS.length + 1);
  });

  it('T-17 keeps the trail and names the incompleteness when a source answered partially', async () => {
    mockService.listAuditEvents.mockResolvedValue(envelope(EVENTS, freshnessWith('partial', 'mes')));
    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.partialHeadline)).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('T-17 withholds the trail and reaches a retry when no source answered', async () => {
    const user = userEvent.setup();
    mockService.listAuditEvents.mockResolvedValue(
      envelope(EVENTS, freshnessWith('unavailable', 'transport')),
    );
    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.offlineHeadline)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();

    await user.click(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel }));

    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(2);
    });
  });

  it('T-17 explains a refusal with the permission, the roles that hold it and the trace id', async () => {
    mockService.listAuditEvents.mockRejectedValue(DENIAL);
    renderScreen();

    expect(await screen.findByText(new RegExp(REQUIRED_PERMISSION, 'u'))).toBeInTheDocument();

    for (const role of ROLES_WITH_PERMISSION) {
      expect(screen.getByText(role)).toBeInTheDocument();
    }

    expect(screen.getByText(TRACE_ID)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('T-17 reports a record that moved under the reader as a conflict, with a reload', async () => {
    mockService.listAuditEvents.mockRejectedValue(MOVED_RECORD);
    renderScreen();

    const notice = await screen.findByText(STATE_BOUNDARY_TEXT.conflictHeadline);

    expect(notice).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.reloadLabel }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

/* ---------------------------------------------------------------------------------------------
 * 10. Both themes
 * ------------------------------------------------------------------------------------------- */

describe('both themes', () => {
  it.each(THEMES)(
    'renders the same trail, controls and verification reading under the %s theme',
    async (theme) => {
      const user = userEvent.setup();
      document.documentElement.setAttribute('data-theme', theme);
      mockService.verifyAuditChain.mockResolvedValue(envelope(REPORTS.oneBreak));
      renderScreen();

      const table = await screen.findByRole('table');

      expect(document.documentElement).toHaveAttribute('data-theme', theme);
      expect(table).toHaveAccessibleName();
      expect(within(table).getAllByRole('row')).toHaveLength(EVENTS.length + 1);
      expect(screen.getByRole('button', { name: UI.verifyChain })).toBeInTheDocument();
      expect(screen.getByText(AUDIT_CHAIN_NOTE)).toBeInTheDocument();

      const report = await verifyChain(user);

      expect(report).toHaveTextContent(String(FIRST_BREAK.sequence));
      expect(within(report).getByText(SIM_LABELS[4])).toBeInTheDocument();
      expect(report.querySelector(`.${MEANING_COLOUR_CLASSES.fail}`)).not.toBeNull();
    },
  );
});

/* ---------------------------------------------------------------------------------------------
 * 11. The page the trail is read in
 * ------------------------------------------------------------------------------------------- */

describe('the page the trail is read in', () => {
  it('asks for one page, and continues from the last event of the page it was served', async () => {
    const user = userEvent.setup();
    mockService.listAuditEvents
      .mockResolvedValueOnce(envelope(FULL_PAGE))
      .mockResolvedValueOnce(envelope(PAGE_TAIL));
    renderScreen();
    await screen.findByRole('table');
    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(1);
    });

    /* The read asks for one page plus the event after it, and the table is handed the page alone: the
       event beyond the page is the next page's first, not this page's last. */
    expect(mockService.listAuditEvents).toHaveBeenNthCalledWith(1, PAGE_QUERY);
    expect(trailRowCount()).toBe(AUDIT_PAGE_SIZE);

    /* The newest page has nothing before it, so the control says why it cannot act rather than
       accepting a press that would do nothing (rule P-8). */
    const backward = screen.getByRole('button', { name: UI.previousPage });
    expect(backward).toHaveAttribute('aria-disabled', 'true');
    expect(backward).toHaveAccessibleDescription(/no page before this one/);

    await user.click(screen.getByRole('button', { name: UI.nextPage }));

    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(2);
    });

    /* One activation, one read, continuing from the last event of the page the first read returned in
       that read's own order — never from the last row the table happens to display. */
    expect(mockService.listAuditEvents).toHaveBeenNthCalledWith(2, {
      ...PAGE_QUERY,
      cursor: String(FULL_PAGE[AUDIT_PAGE_SIZE - 1]?.sequence),
    });
    expect(readQueries()).toHaveLength(2);
    expect(trailRowCount()).toBe(PAGE_TAIL.length);

    /* The page behind the newest one has nothing after it: its forward control states that instead of
       moving, and the backward control now acts. */
    expect(screen.getByRole('button', { name: UI.nextPage })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: UI.previousPage })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('returns to the newest page when a filter changes', async () => {
    const user = userEvent.setup();
    mockService.listAuditEvents
      .mockResolvedValueOnce(envelope(FULL_PAGE))
      .mockResolvedValueOnce(envelope(PAGE_TAIL));
    renderScreen();
    await screen.findByRole('table');
    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole('button', { name: UI.nextPage }));
    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(2);
    });

    /* A blur that leaves a filter as it already was is not an edit: it asks the service for nothing
       and, in particular, it does not return the reader from the page they are on to the newest one. */
    act(() => {
      screen.getByLabelText(UI.actor).focus();
    });
    await user.tab();

    expect(mockService.listAuditEvents).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: UI.previousPage })).not.toHaveAttribute(
      'aria-disabled',
    );

    /* A page position belongs to the trail the filters admit, so narrowing the trail starts again at
       its newest page: the read carries the filter and no cursor at all. The filter is committed the
       way a reader commits it — typed, then `Enter` — and that commit is the edit that issues the read. */
    await user.type(screen.getByLabelText(UI.action), 'note');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockService.listAuditEvents).toHaveBeenCalledTimes(3);
    });
    expect(mockService.listAuditEvents).toHaveBeenNthCalledWith(3, {
      ...PAGE_QUERY,
      action: 'note',
    });
  });
});
