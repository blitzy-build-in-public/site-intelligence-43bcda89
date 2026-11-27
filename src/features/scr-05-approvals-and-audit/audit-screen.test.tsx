/**
 * Component suite for `audit-screen.tsx`, the audit trail of SCR-05.
 *
 * WHAT IT PROVES. Ten groups of assertions, each stated as a contract the screen is relied on for
 * rather than as a description of its markup: the trail's rows (`T-09`), the `AuditQuery` each filter
 * sends, the fixed chain note character for character with the specification §5.3 label it carries,
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
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
import { AUDIT_CHAIN_NOTE, AuditScreen } from './audit-screen';

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
} as const;

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

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
 */
function renderScreen(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuditScreen scope={SCOPE} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
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
}

/** Every filter the trail renders, one case each. */
const FILTER_CASES: readonly FilterCase[] = [
  { label: UI.actor, member: 'actorId', value: 'persona-alpha', kind: 'text' },
  { label: UI.action, member: 'action', value: 'note', kind: 'text' },
  { label: UI.objectRef, member: 'objectRef', value: 'record-alpha', kind: 'text' },
  { label: UI.outcome, member: 'result', value: 'blocked', kind: 'choice' },
  { label: UI.from, member: 'from', value: instantAt(9), kind: 'text' },
  { label: UI.to, member: 'to', value: instantAt(17), kind: 'text' },
];

/**
 * Applies one filter through its own control.
 *
 * A text field is changed in a single event rather than typed a character at a time, because each
 * keystroke would issue a read of its own and the assertion is about the query a control's value
 * produces, not about how fast the suite types.
 */
async function applyFilter(user: UserSession, filter: FilterCase): Promise<void> {
  const control = screen.getByLabelText(filter.label);

  if (filter.kind === 'choice') {
    await user.selectOptions(control, filter.value);

    return;
  }

  fireEvent.change(control, { target: { value: filter.value } });
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
    ]) {
      expect(value).toHaveClass('font-mono');
      expect(value).toHaveClass('tabular-nums');
    }
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
      expect(mockService.listAuditEvents).toHaveBeenNthCalledWith(1, {});
      expect(mockService.listAuditEvents).toHaveBeenNthCalledWith(2, {
        [filter.member]: filter.value,
      });
    },
  );

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
       query is never asked for again, and no member is sent that the reader left alone. */
    expect(readQueries()).toEqual([
      {},
      { actorId: 'persona-alpha' },
      { actorId: 'persona-alpha', action: 'note' },
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
