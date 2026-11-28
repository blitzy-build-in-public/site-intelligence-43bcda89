/**
 * Component suite for `approvals-screen.tsx`, the approvals inbox of SCR-05.
 *
 * WHAT IT PROVES. The inbox draws the rows its read returned, in the order the read returned them, and
 * it tells a reader which order that is: the inbox read sends no `sort`, so the service answers in its
 * own default — the approval identifier ascending — and the table announces it on the Approval column
 * before anything is activated. A table that reported every header as unsorted while its rows were
 * already ordered left the order in effect unannounced, which is the gap this case holds shut; the
 * announcement is the caller's `defaultOrder`, so it reorders no row and reaches no `onSort`.
 *
 * The plan cell is the one cell in this inbox holding two values, so a second case holds it to one
 * line: the cell carries the table's single-line marker, the two references stand in a row rather than
 * in a stacking column, and each of them is still the text of its own element inside that one cell. A
 * row's `height` is only a minimum, so a stacked cell would grow the row past the 32 px compact and
 * 44 px comfortable the density tokens fix (AAP 0.5.3, 0.12.4). That floor is the whole table's
 * rather than one cell's — a cell that wraps in a container too narrow for the columns grows the row
 * just as a stacked one does — so a third case holds every column of a row to the same marker, and
 * the freshness cell, whose two parts sit in a flex row, to a row that does not wrap.
 *
 * The empty state is proved on both of its branches, because the two ways a read comes back with
 * nothing must not read alike: a read the shell's selection narrowed keeps the scope wording, and a
 * read nothing narrowed states the trigger-neutral sentence, since an empty answer is the same answer
 * either way and only the selection the read was built from can tell them apart.
 *
 * HOW THE SERVICE IS REACHED — rule P-2. The provider module is replaced, not the port: `vi.mock` swaps
 * `../../services/service-provider` for the one hook the screen reads, backed by a hoisted stub whose
 * `vi.fn` is named exactly as the port's member is, so a renamed member surfaces here as a call to an
 * undefined function rather than as a quietly passing suite. Nothing else is replaced — every component
 * the screen renders is the real one, because the structure a reader receives is the thing under test.
 *
 * THE FIXTURES — rule P-6. Every identifier below is an opaque placeholder and every amount is a plain
 * integer the fixture record holds, so no domain identifier and no currency literal is written into a
 * feature folder, and no displayed figure is compared against a literal typed here.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock, touches the network or reaches outside the service boundary.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_CLOCK, SOURCE_IDS } from '../../types';
import type { Approval, Freshness, Result, Scope, Timestamp } from '../../types';
import { ApprovalsScreen } from './approvals-screen';

/* ---------------------------------------------------------------------------------------------
 * The service double
 * ------------------------------------------------------------------------------------------- */

/**
 * The one port member the inbox reads, as the double the provider hands the screen.
 *
 * Held through `vi.hoisted` because the `vi.mock` factory below is lifted above the module body, and
 * named as the port names it so a call the screen makes to a member this suite does not know fails
 * loudly here instead of being silently ignored.
 */
const mockService = vi.hoisted(() => ({ listApprovals: vi.fn() }));

vi.mock('../../services/service-provider', () => ({
  useService: () => mockService,
}));

/* ---------------------------------------------------------------------------------------------
 * Fixtures, all of them the suite's own input
 * ------------------------------------------------------------------------------------------- */

/** The instant the sources last answered: the demonstration clock's own, never typed here. */
const AS_OF: Timestamp = DEMO_CLOCK;

/** The correlation identifier every successful read of these fixtures carries. */
const TRACE_ID = 'trace-approvals-inbox';

/** The scope the shell hands in when it selected nothing. */
const SCOPE: Scope = { plants: [], products: [] };

/** The six sources all answering and current, as `Meta.freshness` reports them. */
const FRESH_SOURCES: Freshness[] = SOURCE_IDS.map(
  (source): Freshness => ({ source, asOf: AS_OF, state: 'fresh' }),
);

/** The envelope the inbox read resolves to. */
function envelope(data: readonly Approval[]): Result<Approval[]> {
  return { data: [...data], meta: { freshness: FRESH_SOURCES, simulated: true, traceId: TRACE_ID } };
}

/** One approval of the inbox, with every member `Approval` declares and the plan it puts forward. */
function buildApproval(overrides: Partial<Approval> & Pick<Approval, 'id'>): Approval {
  return {
    exceptionId: 'exception-under-approval',
    scenarioId: 'scenario-under-approval',
    requestedBy: 'persona-planner',
    eligibleApproverRoles: ['plant-manager'],
    status: 'pending',
    addedCostEur: 1200,
    protectedRevenueEur: 4800,
    writeBacks: [],
    outcomeReviewed: false,
    ...overrides,
  };
}

/**
 * The inbox the read returns, in the order the read's own default produces it: the approval identifier
 * ascending, so the earlier of the two identifiers stands first.
 */
const APPROVALS: readonly Approval[] = [
  buildApproval({ id: 'approval-alpha' }),
  buildApproval({ id: 'approval-beta', status: 'approved', outcomeReviewed: true }),
];

/**
 * The inbox's visible column header for the plan's identifier.
 *
 * It is the screen's own wording, which the module does not export, so it is stated here once rather
 * than reached for through a rendered cell: the assertion is about the header a reader hears.
 */
const APPROVAL_COLUMN = 'Approval';

/**
 * The inbox's visible column header for the plan cell, stated here for the same reason: it is the
 * screen's own wording, and the assertion is about the cell under the header a reader hears.
 */
const PLAN_COLUMN = 'Plan';

/**
 * The opening word of the freshness column's header.
 *
 * The header appends the display name of the source the cells report, which the screen reads from the
 * one map that pairs a source with its name, so the suite matches the part that identifies the column
 * rather than re-typing the whole header.
 */
const FRESHNESS_COLUMN = 'Freshness';

/**
 * The two sentences the inbox states when its read answered with no approval.
 *
 * They are the screen's own wording, which the module does not export, so they are stated here once
 * for the same reason {@link APPROVAL_COLUMN} is: the assertion is about the sentence a reader reads,
 * and a reworded sentence reaches a single place in the suite. Which one is stated follows the
 * selection the read was built from, never the answer, so each case selects the scope its read is
 * made with (`simulation.ts`: a filter that happens to match nothing must not be confusable with a
 * control that emptied every list).
 */
const EMPTY_SENTENCES = {
  /** Nothing narrowed the read: the trigger-neutral sentence. */
  unnarrowed: 'No approvals to show.',

  /** The shell's selection narrowed the read: the scope sentence. */
  narrowed: 'No approvals in the current scope.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders the inbox as the shell mounts it: behind an in-memory router, inside a cache of its own with
 * retries off, so a refused read fails the same way however often it is repeated.
 *
 * @param scope - The selection the shell hands the screen, and so the selection its read is built
 *   from. It defaults to the empty selection, which is what every case that does not care about the
 *   selection uses.
 */
function renderScreen(scope: Scope = SCOPE): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ApprovalsScreen scope={scope} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The suite
 * ------------------------------------------------------------------------------------------- */

describe('ApprovalsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.listApprovals.mockResolvedValue(envelope(APPROVALS));
  });

  it('announces the approval column as ascending, the order the inbox read returns', async () => {
    renderScreen();

    const table = await screen.findByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    const approvalHeader = within(table).getByRole('columnheader', { name: APPROVAL_COLUMN });

    /*
     * The read sends no `sort`, so the order in effect is the service's default — the identifier
     * ascending — and the column it orders is the one that says so. Every other header is unsorted
     * until a reader sorts it, which is what makes the one announcement readable.
     */
    expect(approvalHeader).toHaveAttribute('aria-sort', 'ascending');
    for (const header of headers) {
      if (header !== approvalHeader) {
        expect(header.getAttribute('aria-sort') ?? 'none').toBe('none');
      }
    }

    /*
     * The announcement applies nothing: the rows are exactly the ones the read returned, in the order
     * it returned them, because ordering is the caller's and the table only states what it was handed.
     */
    expect(
      within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0]?.textContent),
    ).toEqual(APPROVALS.map((approval) => approval.id));
  });

  it('reverses the order it announces on the first activation of the sorted header', async () => {
    const user = userEvent.setup();
    renderScreen();

    const table = await screen.findByRole('table');
    const approvalHeader = within(table).getByRole('columnheader', { name: APPROVAL_COLUMN });

    expect(approvalHeader).toHaveAttribute('aria-sort', 'ascending');

    await user.click(within(approvalHeader).getByRole('button'));

    /*
     * The first activation reverses the announced order rather than re-stating it: the rows the reader
     * already had are reordered, and the header follows them, so the one column the table told them
     * about answers their activation with a visible change (rule P-8).
     */
    await waitFor(() => {
      expect(approvalHeader).toHaveAttribute('aria-sort', 'descending');
    });
    expect(
      within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0]?.textContent),
    ).toEqual([...APPROVALS].reverse().map((approval) => approval.id));
  });

  it('sets the plan cell on one line, its two references side by side in the one cell', async () => {
    renderScreen();

    const table = await screen.findByRole('table');
    const planColumnIndex = within(table)
      .getAllByRole('columnheader')
      .indexOf(within(table).getByRole('columnheader', { name: PLAN_COLUMN }));

    expect(planColumnIndex).toBeGreaterThanOrEqual(0);

    for (const approval of APPROVALS) {
      const row = within(table).getByText(approval.id).closest('tr');
      const cells = row === null ? [] : within(row).getAllByRole('cell');
      const planCell = cells[planColumnIndex];

      /*
       * The cell takes the table's single-line marker. That is what keeps the row on the density
       * token: a row's `height` is only a minimum, so a cell that wraps or stacks measures taller than
       * the 32 px compact and 44 px comfortable the tokens fix (AAP 0.5.3, 0.12.4).
       */
      expect(planCell).toHaveClass('whitespace-nowrap');

      /* The two references stand in a row rather than in a column that would stack them. */
      const planContent = planCell?.firstElementChild;
      expect(planContent).toHaveClass('flex', 'items-center');
      expect(planContent).not.toHaveClass('flex-col');

      /*
       * They stay two values of their own: each identifier is the whole text of its own element
       * inside the one cell, so neither is joined into a string no record holds (rule P-6).
       */
      expect(Array.from(planContent?.children ?? []).map((child) => child.textContent)).toEqual([
        approval.scenarioId,
        approval.exceptionId,
      ]);
    }
  });

  it('holds every cell of a row on one line, the freshness cell from wrapping too', async () => {
    renderScreen();

    const table = await screen.findByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    const freshnessColumnIndex = headers.findIndex((header) =>
      (header.textContent ?? '').startsWith(FRESHNESS_COLUMN),
    );

    expect(freshnessColumnIndex).toBeGreaterThanOrEqual(0);

    for (const approval of APPROVALS) {
      const row = within(table).getByText(approval.id).closest('tr');
      const cells = row === null ? [] : within(row).getAllByRole('cell');

      expect(cells).toHaveLength(headers.length);

      /*
       * Every column carries the table's single-line marker, not the plan column alone. A cell that
       * wraps in a container too narrow for the columns measures taller than the 32 px compact and
       * 44 px comfortable the density tokens fix, because a row's `height` is only a minimum: the
       * table scrolls inside its own container so that no row leaves the density in effect
       * (AAP 0.5.3, 0.12.4).
       */
      for (const cell of cells) {
        expect(cell).toHaveClass('whitespace-nowrap');
      }

      /*
       * The freshness cell holds the state's indicator and the instant it last answered side by side:
       * it is laid out as a flex row that neither wraps nor stacks, and the two parts are the read's
       * own values — the state the sources reported, then that source's `asOf`.
       */
      const freshnessContent = cells[freshnessColumnIndex]?.firstElementChild;
      expect(freshnessContent).toHaveClass('inline-flex', 'items-center');
      expect(freshnessContent).not.toHaveClass('flex-wrap');
      expect(freshnessContent).not.toHaveClass('flex-col');

      const freshnessParts = Array.from(freshnessContent?.children ?? []);
      expect(freshnessParts).toHaveLength(2);
      expect(freshnessParts[0]?.textContent).toBe(FRESH_SOURCES[0]?.state);
    }
  });

  it('states the trigger-neutral sentence when the read answers with nothing and no scope narrows it', async () => {
    mockService.listApprovals.mockResolvedValue(envelope([]));
    renderScreen();

    /*
     * The empty answer is the one fact the screen has, and nothing selected a plant or a product, so
     * the sentence names no scope: the demonstration control that empties every list empties the
     * collection this read is served from rather than narrowing it, and a scope wording would
     * describe a constraint the reader never set.
     */
    expect(await screen.findByText(EMPTY_SENTENCES.unnarrowed)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_SENTENCES.narrowed)).toBeNull();
  });

  it('states the scope sentence when the read answers with nothing under one selected plant', async () => {
    const scope: Scope = { plants: ['plant-alpha'], products: [] };

    mockService.listApprovals.mockResolvedValue(envelope([]));
    renderScreen(scope);

    /*
     * The selection the read was built from is what the sentence follows, and it reached the port as
     * the read's scope: the screen narrowed nothing itself, so the wording states the scope the
     * reader set rather than a cause it inferred from the empty answer.
     */
    expect(await screen.findByText(EMPTY_SENTENCES.narrowed)).toBeInTheDocument();
    expect(mockService.listApprovals).toHaveBeenCalledWith({}, scope);
    expect(screen.queryByText(EMPTY_SENTENCES.unnarrowed)).toBeNull();
  });
});
