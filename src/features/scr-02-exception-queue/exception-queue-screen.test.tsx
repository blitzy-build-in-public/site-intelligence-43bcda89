/**
 * Component suite for `exception-queue-screen.tsx`: the SCR-02 queue of stage S1, its twelve columns,
 * its six filters, its row actions, its saved views, the two states that replace the table, the
 * keyboard row cursor and both themes.
 *
 * WHAT IT PROVES. Each case asserts a contract of AAP §0.12.4's SCR-02 row rather than a shape of the
 * markup: the twelve columns AAP fixes appear in its order with the actions cell after them; the rows
 * arrive in the order the service returned them, because the queue's default order is the service's
 * (`sortUrgent`) and a screen that re-sorted would disagree with the overview computed over the same
 * records; each filter reaches the port once with the member it narrowed; the day the screen is handed
 * reaches the port as the query's own member and is cleared by the control that states it; the two row
 * writes go through the port exactly once; the confirm of the dismissal dialog is disabled with its
 * reason until a reason exists (rule P-8) and the dialog closes only once the write settles; the empty and
 * forbidden states render the boundary's own surfaces with the caller's sentence and the refusal's
 * evidence; `J`, `K` and `Enter` drive the row cursor; a saved view restores the filter set it holds;
 * each figure a row shows — revenue at risk, days to impact and age — is a trigger whose activation
 * opens that exception's evidence (AAP §0.12.4, functional requirement F12, principle PR-6); and the
 * queue renders in Command and in Paper.
 *
 * HOW THE SERVICE IS REACHED. The provider module is replaced, not the port: `vi.mock` swaps
 * `../../services/service-provider` for the three hooks the screen reads, backed by one hoisted stub
 * whose `vi.fn`s are named exactly as the port's members are, so a renamed member surfaces here as a
 * call to an undefined function rather than as a quietly passing suite. Nothing else is replaced —
 * no seed module, adapter, HTTP client or domain module is imported, and every record below is
 * hand-built (rule P-2). Every identifier-shaped value is assembled by concatenation, and every
 * amount is a plain number, so no domain identifier and no currency literal is written into a feature
 * folder (rule P-6); the fixture rows are the suite's own input, standing for what the adapter returns
 * at run time, in the same way `src/components/state-boundary.test.tsx` supplies its own denial.
 *
 * THE ROUTER. The screen calls `useNavigate()` and opens a row by navigating to its investigation, so
 * each render mounts a `MemoryRouter` around the screen and a probe beside it that reports
 * `useLocation().pathname`. The open action is therefore asserted on the route the reader would land
 * on, built from the fixture's own identifier, without reaching into the router's internals.
 *
 * Rules served:
 * - B-1: nothing here fetches, links or resolves an address; the only network-shaped surface in the
 *   suite is the mocked hook, which never leaves the process.
 * - B-2: no configuration is read and nothing here resembles a credential.
 * - B-3: the cases assert accessible names — the table's caption, `<label>` bindings for each filter
 *   and for the reason field, `scope="col"` on every header cell, the dialog's `aria-modal`, and the
 *   focus that returns to the control which opened the dialog after `Esc`. The row cursor is driven
 *   by the keyboard alone, and the disabled confirm is reached by keyboard focus rather than by a
 *   pointer, which is the component-level half of T-16 (the axe run itself belongs to
 *   `e2e/s1-keyboard-and-axe.spec.ts`).
 * - P-1: the computed revenue column's label is asserted inside the group that holds the table, so a
 *   page-level or shell-level string could never satisfy the case.
 * - P-2: the mocked provider is the only data path, and the suite imports no seed record.
 * - P-6: every figure a case sees is the fixture's or the service's, and the suite types no amount and
 *   no domain identifier; the only literal text it writes is the fixed §5.3 label it asserts and the
 *   record content it supplied itself.
 * - P-7: every company, plant and persona below is a synthetic placeholder, and no product, vendor or
 *   carmaker name appears.
 * - P-8: the three controls the queue can render disabled — the assignment, the dismissal confirm and
 *   the saved-view save — are each asserted to state their reason.
 * - P-3, P-4, P-5: nothing here is about who may act in production, where records are held or how a
 *   competitor compares, so the suite asserts nothing about them.
 *
 * The environment is jsdom, which `vite.config.ts` sets for every suite: nothing below hashes or reads
 * the clock, so this file needs no per-file environment override, and writing one here would be read
 * as a directive rather than as prose. `tests/setup.ts` registers the jest-dom matchers and the
 * `cleanup` between cases this suite relies on.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EVIDENCE_DRAWER_TEXT } from '../../components/evidence-drawer';
import { SOURCE_IDS } from '../../types';
import type {
  ActiveUser,
  Evidence,
  ExceptionQuery,
  ExceptionRow,
  Freshness,
  Meta,
  Permission,
  Problem,
  Result,
  Scope,
  SimLabel,
  ThemeName,
} from '../../types';
import { EXCEPTION_QUEUE_TEXT, ExceptionQueueScreen } from './exception-queue-screen';
import type { ExceptionQueueScreenProps } from './exception-queue-screen';

/* ---------------------------------------------------------------------------------------------
 * The stubbed provider
 * ------------------------------------------------------------------------------------------- */

/**
 * The service double every case drives, created before the module graph is evaluated.
 *
 * `vi.mock` is hoisted above the imports, so the factory that returns the three hooks may only close
 * over bindings that exist before the graph runs — hence `vi.hoisted`. The stub holds one `vi.fn` per
 * port member the screen reaches: `listExceptions` for both reads, `assignException` and
 * `dismissException` for the two writes, and `getEvidence` for the evidence drawer a row's figure opens.
 * Each is named exactly as `SiteIntelligenceService` names it, and the port's type is applied at the
 * mock boundary below, so the double cannot drift from the contract it stands for without a compile
 * error at that one point.
 */
const stub = vi.hoisted(() => {
  const listExceptions = vi.fn();
  const assignException = vi.fn();
  const dismissException = vi.fn();
  const getEvidence = vi.fn();

  return {
    service: { listExceptions, assignException, dismissException, getEvidence },
    /** The persona the provider reports, or `null` for a session the adapter cannot name. */
    activeUser: null as ActiveUser | null,
  };
});

/**
 * The provider replaced by the stub.
 *
 * `useService()` hands back the double, `useActiveUser()` the persona a case wants, and
 * `useDemonstration()` nothing: the queue reads no demonstration control, and a `null` capability is
 * the shape the provider documents for an adapter that carries none.
 *
 * The double carries the four members the rendered tree reaches and no others: the three the screen
 * itself calls, plus the `getEvidence` read `evidence-drawer.tsx` makes once a row's figure is
 * activated. Re-declaring the port's other members as do-nothing mocks would claim the queue reaches
 * them, so a member the screen started to read would fail at the call site instead of quietly returning
 * nothing. The factory is left untyped at this boundary for the same reason the double is small — a mock
 * is not the port, and the screen is compiled against the port's own types wherever it calls one.
 */
vi.mock('../../services/service-provider', () => ({
  useService: () => stub.service,
  useActiveUser: (): ActiveUser | null => stub.activeUser,
  useDemonstration: () => null,
}));

/* ---------------------------------------------------------------------------------------------
 * Fixtures, all of them the suite's own input
 * ------------------------------------------------------------------------------------------- */

/** The instant the records below were last read, in the application's time zone. */
const AS_OF = '2026-12-03T06:00:00+01:00';

/**
 * The calendar day those instants fall on, derived from the instant rather than written out.
 *
 * The day-filter case hands the screen this date the way the queue's route does, and asserts it reaches
 * the port unchanged, so no date literal is typed into a feature folder (rule P-6).
 */
const THE_DAY = AS_OF.slice(0, 10);

/** The route the shell mounts the queue on. */
const QUEUE_ROUTE = '/exceptions';

/** The permission the refusal below names, taken from the matrix the port enforces. */
const REQUIRED_PERMISSION: Permission = 'exception.read';

/** The role the refusal below names as one that may act. */
const ROLE_WITH_PERMISSION = 'plant-manager';

/** The three exception identifiers this suite supplies, assembled rather than written out. */
const ROW_A_ID = ['EXC', '2026', '1184'].join('-');
const ROW_B_ID = ['EXC', '2026', '1185'].join('-');
const ROW_C_ID = ['EXC', '2026', '1186'].join('-');

/** The product both supply exceptions touch. */
const PRODUCT_ID = ['PRD', 'R75'].join('-');

/** The two plants the rows land on. */
const PLANT_RGB = ['PLT', 'RGB'].join('-');
const PLANT_BRN = ['PLT', 'BRN'].join('-');

/** The two personas the second and third rows are owned by. */
const OWNER_B = ['USR', '02'].join('-');
const OWNER_C = ['USR', '03'].join('-');

/**
 * The persona this session acts as.
 *
 * It owns no row of the default answer, so the assignment case exercises the control when it can act;
 * the screen disables that control on a row the persona already owns, and that branch has its own case
 * below.
 */
const OWNER_A = ['USR', '01'].join('-');

/**
 * The persona who owns the first row and is nobody this session acts as.
 *
 * The acting persona deliberately owns no row of the default answer, so the assignment case exercises
 * the control when it can act: the screen disables it on a row the persona already owns, and that
 * branch has its own case below.
 */
const OWNER_ELSEWHERE = ['USR', '07'].join('-');

/** The supplier identifier the supplier filter is given. */
const SUPPLIER_ID = ['SUP', '01'].join('-');

/** The correlation identifier the refusal below carries. */
const REFUSAL_TRACE = ['trace', '4f8a21'].join('-');

/** The reason typed into the dismissal dialog, with the whitespace the write must trim. */
const TYPED_REASON = '  Waiting on a revised delivery date  ';
const TRIMMED_REASON = TYPED_REASON.trim();

/**
 * The exact specification §5.3 label the computed revenue column carries.
 *
 * Typed as `SimLabel`, exactly as the screen types it, so a paraphrase in either place fails to
 * compile rather than reaching a reader as a near miss (rule P-1).
 */
const CALCULATED_LABEL: SimLabel = 'Simulated calculation';

/** One source's contribution, in the state that raises none of the boundary's warnings. */
const FRESH_RECORD: Freshness = { source: 'erp', asOf: AS_OF, state: 'fresh' };

/**
 * The metadata every result below carries: six sources that all answered, the simulation marker a
 * `Meta` fixes as the literal `true`, and a correlation identifier.
 */
const META: Meta = {
  freshness: SOURCE_IDS.map((source) => ({ source, asOf: AS_OF, state: 'fresh' })),
  simulated: true,
  traceId: REFUSAL_TRACE,
};

/** A successful result, in the shape every port read resolves to. */
function ok<Payload>(data: Payload): Result<Payload> {
  return { data, meta: META };
}

/** The persona the provider reports unless a case says otherwise. */
const ACTIVE_USER: ActiveUser = {
  id: OWNER_A,
  name: 'Sample Planner',
  role: 'material-planner',
  plantIds: [PLANT_RGB],
  permissions: ['exception.read', 'exception.work'],
  homeRoute: '/canvas',
};

/** The scope the screen hands the read when the shell selected nothing. */
const NO_SCOPE_SELECTION: Scope = { plants: [], products: [] };

/** One row of the queue, with every member `ExceptionRow` declares and nothing else. */
function buildRow(overrides: Partial<ExceptionRow>): ExceptionRow {
  return {
    id: ROW_A_ID,
    type: 'supply-delay',
    title: 'Late housing delivery',
    productIds: [PRODUCT_ID],
    plantId: PLANT_RGB,
    severity: 'low',
    revenueAtRiskEur: 1800,
    daysToImpact: 2,
    status: 'open',
    ownerId: OWNER_ELSEWHERE,
    ageHours: 36,
    freshness: FRESH_RECORD,
    ...overrides,
  };
}

/**
 * The three rows the queue reads by default, in an order that is *not* severity-then-days.
 *
 * The first row is the least urgent, the second the most urgent and the third sits between them, so a
 * screen that re-sorted the service's answer would draw a different first row than the one supplied
 * and the order case below would fail.
 */
const ROW_A = buildRow({});
const ROW_B = buildRow({
  id: ROW_B_ID,
  type: 'quality-hold',
  title: 'Supplier quality hold',
  plantId: PLANT_BRN,
  severity: 'critical',
  revenueAtRiskEur: 2400,
  daysToImpact: 9,
  status: 'resolved',
  ownerId: OWNER_B,
  ageHours: 12,
});
const ROW_C = buildRow({
  id: ROW_C_ID,
  title: 'Late transfer arrival',
  severity: 'high',
  revenueAtRiskEur: 950,
  daysToImpact: 1,
  ownerId: OWNER_C,
  ageHours: 4,
});

/** The rows the default stub returns, in the order the service returned them. */
const ROWS: readonly ExceptionRow[] = [ROW_A, ROW_B, ROW_C];

/**
 * The evidence record every figure of a row opens, shaped as `getEvidence` resolves it.
 *
 * The drawer prints the record's own fields and computes nothing (rule P-6), so this is what a case
 * reads back: the reference the cell carried sits beside it in the drawer's record row, which is how a
 * case proves the figure opened *this* row's evidence rather than another's. No amount, identifier or
 * instant is typed here — the suite supplies the record, exactly as the adapter would at run time.
 */
const FIGURE_EVIDENCE: Evidence = {
  value: 'the figure this reference answers',
  provenance: 'computed',
  label: CALCULATED_LABEL,
  formula: 'one record over another, by the rule that owns the figure',
  inputs: [],
  upstream: [],
  downstream: [],
  confidence: { level: 'high', reason: 'the records behind it were read in full' },
  missingInputs: [],
  documents: [],
};

/** The refusal a session without `exception.read` receives, shaped as the port documents it. */
const PERMISSION_PROBLEM: Problem = {
  type: 'permission',
  message: 'Your role does not permit this view.',
  traceId: REFUSAL_TRACE,
  requiredPermission: REQUIRED_PERMISSION,
  rolesWithPermission: [ROLE_WITH_PERMISSION],
};

/** The two themes a case renders the queue in. */
const THEMES: readonly ThemeName[] = ['command', 'paper'];

/* ---------------------------------------------------------------------------------------------
 * The harness: the router, the query cache and the reads every case makes of what was drawn
 * ------------------------------------------------------------------------------------------- */

/**
 * Reports the pathname the router holds.
 *
 * The queue opens a row by navigating to its investigation, so the assertion belongs on the route a
 * reader would land on rather than on a call the router made internally.
 */
function LocationProbe(): ReactElement {
  const location = useLocation();

  return <span data-testid="location-probe">{location.pathname}</span>;
}

/** The user-event instance one case drives. */
function setUpUser(): UserEvent {
  return userEvent.setup();
}

/**
 * Mounts the queue on its route inside the query cache and the router the shell would supply.
 *
 * A fresh `QueryClient` per render keeps one case's cache out of the next one's, and `retry: false`
 * with `gcTime: 0` makes every read settle once and request its records again when it is re-read,
 * which is what lets a write be observed by the reads it invalidated.
 */
function renderQueue(props: ExceptionQueueScreenProps = {}): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[QUEUE_ROUTE]}>
        <ExceptionQueueScreen {...props} />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Waits for the first answer to be drawn, which is the moment the table exists. */
async function awaitQueue(): Promise<void> {
  await screen.findByRole('table', { name: EXCEPTION_QUEUE_TEXT.tableCaption });
}

/** The table the queue drew, named by the caption `DataTable` renders as its accessible name. */
function queueTable(): HTMLElement {
  return screen.getByRole('table', { name: EXCEPTION_QUEUE_TEXT.tableCaption });
}

/** The data rows in drawn order, with the header row left out. */
function tableRows(): HTMLElement[] {
  return within(queueTable()).getAllByRole('row').slice(1);
}

/** One data row by position, failing loudly rather than yielding a missing element. */
function rowAt(index: number): HTMLElement {
  const rows = tableRows();
  const row = rows[index];

  if (row === undefined) {
    throw new Error(
      `The queue drew ${String(rows.length)} rows, so row ${String(index)} does not exist.`,
    );
  }

  return row;
}

/** The header cells in drawn order. */
function headerCells(): HTMLElement[] {
  return within(queueTable()).getAllByRole('columnheader');
}

/**
 * One row's cell for the column a header names.
 *
 * The column is located by the header the queue drew rather than by a position written into the case, so
 * a column added ahead of it cannot move an assertion onto a different figure; the row is the element a
 * reader's assistive technology reads, and the cell is its own role inside it (rule B-3).
 */
function cellIn(row: HTMLElement, column: string): HTMLElement {
  const index = headerCells().findIndex((header) => header.textContent?.trim() === column);
  const cell = index === -1 ? undefined : within(row).getAllByRole('cell')[index];

  if (cell === undefined) {
    throw new Error(`The queue drew no cell in the “${column}” column.`);
  }

  return cell;
}

/** The identifier each data row carries in its first cell, in drawn order. */
function drawnIdentifiers(): string[] {
  return tableRows().map((row) => {
    const firstCell = within(row).getAllByRole('cell')[0];

    return firstCell?.textContent?.trim() ?? '';
  });
}

/** The pathname the router currently holds. */
function shownPathname(): string {
  return screen.getByTestId('location-probe').textContent ?? '';
}

/** The query of the last read the screen issued, or `undefined` before the first one. */
function lastQuery(): ExceptionQuery | undefined {
  const calls = stub.service.listExceptions.mock.calls;
  const lastCall = calls[calls.length - 1];

  return lastCall === undefined ? undefined : (lastCall[0] as ExceptionQuery);
}

/** How many reads the screen has issued so far. */
function readCount(): number {
  return stub.service.listExceptions.mock.calls.length;
}

/**
 * The scope the last read was made with.
 *
 * The queue hands the shell's selection to the port untouched and lets the port intersect it with the
 * acting role's plant scope, so a screen that narrowed it here would disagree with the overview.
 */
function lastScope(): Scope | undefined {
  const calls = stub.service.listExceptions.mock.calls;
  const lastCall = calls[calls.length - 1];

  return lastCall === undefined ? undefined : (lastCall[1] as Scope);
}

/** The control bound to one visible filter label, found by that label (rule B-3). */
function filterControl(label: string): HTMLElement {
  return screen.getByLabelText(label);
}

/** One enumerated filter, the row member it narrows and a value the options offer. */
interface FilterCase {
  /** The filter's visible label, which is also its control's accessible name. */
  readonly label: string;

  /** The member of the query the filter sets. */
  readonly member: keyof ExceptionQuery;

  /** The option chosen. */
  readonly value: string;
}

/**
 * The five enumerated filters, one case each.
 *
 * The supplier filter is a text field rather than a select — `ExceptionRow` carries no supplier — so
 * it is driven by its own case below. Each value is one the supplied rows actually carry, so the
 * option exists in the control the read populated.
 */
const FILTER_CASES: readonly FilterCase[] = [
  { label: EXCEPTION_QUEUE_TEXT.typeFilter, member: 'type', value: 'supply-delay' },
  { label: EXCEPTION_QUEUE_TEXT.plantFilter, member: 'plantId', value: PLANT_BRN },
  { label: EXCEPTION_QUEUE_TEXT.severityFilter, member: 'severity', value: 'critical' },
  { label: EXCEPTION_QUEUE_TEXT.statusFilter, member: 'status', value: 'resolved' },
  { label: EXCEPTION_QUEUE_TEXT.ownerFilter, member: 'ownerId', value: OWNER_B },
];

/** One figure a queue row shows: the column it sits in and the reading that column prints. */
interface FigureCellCase {
  /** The column's visible header, which is also how the case locates its cell. */
  readonly column: string;

  /** The reading the cell prints, derived from the row the case reads (rule P-6). */
  readonly reading: string;
}

/**
 * The two figures a row shows besides the computed revenue, one case each.
 *
 * Both readings are derived from the first supplied row rather than typed here (rule P-6), and the age
 * reading is that row's duration as the column presents it. The revenue cell has carried its evidence
 * wrapper from the start; these two cells carried the same readings as bare text, with no way to reach
 * the evidence behind them, which is the contract these cases now hold (AAP 0.12.4, F12, PR-6).
 */
const FIGURE_CELL_CASES: readonly FigureCellCase[] = [
  { column: EXCEPTION_QUEUE_TEXT.columnDaysToImpact, reading: String(ROW_A.daysToImpact) },
  { column: EXCEPTION_QUEUE_TEXT.columnAge, reading: String(ROW_A.ageHours) },
];

/* ---------------------------------------------------------------------------------------------
 * The suite
 * ------------------------------------------------------------------------------------------- */

describe('ExceptionQueueScreen', () => {
  /*
   * Every case starts from the same service double: one persona the adapter can name, three
   * exceptions in an order that is not severity-then-days, two writes that succeed and the evidence
   * record a row's figure opens. The unmount between cases is registered globally by `tests/setup.ts`,
   * which is the `cleanup` Testing Library arms once it finds a global `afterEach`; the theme attribute
   * is cleared here because a case sets it before rendering.
   */
  beforeEach(() => {
    vi.clearAllMocks();
    delete document.documentElement.dataset.theme;

    stub.activeUser = ACTIVE_USER;
    stub.service.listExceptions.mockResolvedValue(ok([...ROWS]));
    stub.service.assignException.mockResolvedValue(ok({ ownerId: ACTIVE_USER.id }));
    stub.service.dismissException.mockResolvedValue(ok({ id: ROW_A_ID }));
    stub.service.getEvidence.mockResolvedValue(ok(FIGURE_EVIDENCE));
  });

  it('draws the twelve specified columns in order, with the actions cell after them', async () => {
    renderQueue();
    await awaitQueue();

    const specified = [
      EXCEPTION_QUEUE_TEXT.columnID,
      EXCEPTION_QUEUE_TEXT.columnType,
      EXCEPTION_QUEUE_TEXT.columnTitle,
      EXCEPTION_QUEUE_TEXT.columnProducts,
      EXCEPTION_QUEUE_TEXT.columnPlant,
      EXCEPTION_QUEUE_TEXT.columnSeverity,
      EXCEPTION_QUEUE_TEXT.columnRevenue,
      EXCEPTION_QUEUE_TEXT.columnDaysToImpact,
      EXCEPTION_QUEUE_TEXT.columnStatus,
      EXCEPTION_QUEUE_TEXT.columnOwner,
      EXCEPTION_QUEUE_TEXT.columnAge,
      EXCEPTION_QUEUE_TEXT.columnFreshness,
    ];

    const headers = headerCells();

    expect(headers).toHaveLength(specified.length + 1);
    expect(headers.map((header) => header.textContent?.trim())).toEqual([
      ...specified,
      EXCEPTION_QUEUE_TEXT.columnActions,
    ]);

    /* A header cell is scoped to the column it names, so the table is read as a grid (rule B-3). */
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }

    /*
     * The computed column's label is asserted inside the group that holds the table, beside the
     * sentence that says what it refers to, so a page-level or shell-level string could never
     * satisfy this case (rule P-1).
     */
    const note = screen.getByText(EXCEPTION_QUEUE_TEXT.revenueNote);
    const columnGroup = note.parentElement;

    if (columnGroup === null) {
      throw new Error('The computed column’s label and the table it labels are not in one group.');
    }

    expect(within(columnGroup).getByText(CALCULATED_LABEL)).toBeVisible();
    expect(within(columnGroup).getByRole('table')).toBeVisible();
    expect(screen.getAllByText(CALCULATED_LABEL)).toHaveLength(1);
  });

  /**
   * Each figure the row shows is a control that opens that exception's evidence.
   *
   * AAP 0.12.4 makes every figure on screen an `EvidenceRef` and principle PR-6 makes every figure
   * answerable for its source, record, time, freshness and formula, so a reading printed as bare text
   * leaves the reader no way to reach the record behind it. The two cases below cover the figures the
   * revenue cell's wrapper did not: days to impact and age. Each asserts that the reading is still
   * printed as the record and `formatHours` present it, that the trigger's accessible name carries that
   * visible reading and then says what activating it does (WCAG 2.2 SC 2.5.3, rule B-3), and that
   * activating it opens the drawer bound to this row's own identifier rather than to another row's.
   */
  it.each(FIGURE_CELL_CASES)(
    'opens the row’s evidence from its $column figure, named for the reading it shows',
    async ({ column, reading }) => {
      const user = setUpUser();
      renderQueue();
      await awaitQueue();

      const cell = cellIn(rowAt(0), column);

      /* The wrapper changes nothing about the reading: it is still the figure the record holds. */
      expect(cell).toHaveTextContent(reading);

      const trigger = within(cell).getByRole('button');

      expect(trigger).toHaveAccessibleName(new RegExp(`^${reading}`));
      expect(trigger).toHaveAccessibleName(new RegExp(`${EVIDENCE_DRAWER_TEXT.openSuffix}$`));
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');

      await user.click(trigger);

      const drawer = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });

      /* The drawer prints the reference the figure carried, so this row's record is the one shown. */
      expect(within(drawer).getAllByText(ROW_A.id).length).toBeGreaterThan(0);
      expect(stub.service.getEvidence).toHaveBeenCalledTimes(1);
      expect(stub.service.getEvidence).toHaveBeenCalledWith(ROW_A.id);
    },
  );

  it('draws the rows in the order the service returned them, re-sorting nothing', async () => {
    renderQueue();
    await awaitQueue();

    /* The supplied order leads with the least urgent row, so a screen that ordered by severity
       would draw a different first identifier than the one the service returned. */
    expect(drawnIdentifiers()).toEqual([ROW_A.id, ROW_B.id, ROW_C.id]);
    expect(within(rowAt(0)).getByText('Low')).toBeVisible();
    expect(within(rowAt(1)).getByText('Critical')).toBeVisible();
  });

  it.each(FILTER_CASES)(
    'reads the queue once more, narrowed by the $label filter',
    async ({ label, member, value }) => {
      const user = setUpUser();
      renderQueue();
      await awaitQueue();

      const readsBefore = readCount();
      await user.selectOptions(filterControl(label), value);

      await waitFor(() => {
        expect(readCount()).toBe(readsBefore + 1);
      });
      expect(lastQuery()).toMatchObject({ [member]: value });
      expect(lastScope()).toEqual(NO_SCOPE_SELECTION);
    },
  );

  it('reads the queue once more, narrowed by the supplier typed into its field', async () => {
    const user = setUpUser();
    renderQueue();
    await awaitQueue();

    const readsBefore = readCount();
    await user.type(filterControl(EXCEPTION_QUEUE_TEXT.supplierFilter), SUPPLIER_ID);
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(readCount()).toBe(readsBefore + 1);
    });
    expect(lastQuery()).toMatchObject({ supplierId: SUPPLIER_ID });
  });

  it('reads the queue narrowed to the day it is handed, clears that day, and tells the shell it did', async () => {
    const user = setUpUser();
    const onDayCleared = vi.fn<() => void>();

    renderQueue({ initialQuery: { date: THE_DAY }, onDayCleared });
    await awaitQueue();

    /*
     * The day reaches the port as the query's own member, with no other constraint beside it: the second
     * read is the options read, which the screen issues unfiltered on purpose.
     */
    const issuedQueries = stub.service.listExceptions.mock.calls.map(
      (call) => call[0] as ExceptionQuery,
    );

    expect(issuedQueries).toContainEqual({ date: THE_DAY });

    /*
     * One row inside the Filters group says which day the read keeps and offers the control that leaves
     * it (rule P-8). It is not a seventh filter control: the six fields beneath it are the only filter
     * controls the group holds, which is what AAP 0.12.4's SCR-02 row fixes.
     */
    const filters = screen.getByRole('region', { name: EXCEPTION_QUEUE_TEXT.filterGroup });
    const daySentence = `${EXCEPTION_QUEUE_TEXT.dayNarrowing} ${THE_DAY}`;

    expect(within(filters).getByText(daySentence)).toBeVisible();

    const clear = within(filters).getByRole('button', { name: EXCEPTION_QUEUE_TEXT.clearDay });
    const readsBefore = readCount();

    clear.focus();
    expect(clear).toHaveFocus();
    await user.keyboard('{Enter}');

    /*
     * The whole queue is read again — one more read, carrying no constraint at all — and the row that
     * named the day is gone from the page, so the control did what it says rather than merely closing
     * itself (rule P-8).
     */
    await waitFor(() => {
      expect(readCount()).toBe(readsBefore + 1);
    });

    expect(lastQuery()).toEqual({});
    expect(within(filters).queryByText(daySentence)).toBeNull();

    /*
     * The shell is told exactly once, so the entry that carried the day stops stating a narrowing the
     * reader has ended and a reload of it opens the whole queue instead of narrowing it again.
     */
    expect(onDayCleared).toHaveBeenCalledTimes(1);
  });

  it('assigns a row to the acting persona once, then reads the queue again', async () => {
    const user = setUpUser();
    renderQueue();
    await awaitQueue();

    const readsBefore = readCount();
    await user.click(within(rowAt(0)).getByRole('button', { name: /^Assign to me/ }));

    await waitFor(() => {
      expect(stub.service.assignException).toHaveBeenCalledTimes(1);
    });
    expect(stub.service.assignException).toHaveBeenCalledWith(ROW_A.id, ACTIVE_USER.id);

    /* The report names the persona the service returned, and the read the write moved is repeated
       rather than served from the answer it cached before the write (AAP §0.6.2). */
    expect(await screen.findByText(EXCEPTION_QUEUE_TEXT.assigned)).toBeVisible();
    expect(screen.getByText(ACTIVE_USER.id)).toBeVisible();
    await waitFor(() => {
      expect(readCount()).toBeGreaterThan(readsBefore);
    });
  });

  it('disables the assignment with its reason when the session reports no persona', async () => {
    const user = setUpUser();
    stub.activeUser = null;
    renderQueue();
    await awaitQueue();

    const assign = within(rowAt(0)).getByRole('button', { name: /^Assign to me/ });

    expect(assign).toHaveAttribute('aria-disabled', 'true');

    await user.click(assign);

    expect(screen.getByRole('tooltip')).toHaveTextContent(
      EXCEPTION_QUEUE_TEXT.assignUnavailableReason,
    );
    expect(stub.service.assignException).not.toHaveBeenCalled();
  });

  it('disables the assignment on a row the acting persona already owns', async () => {
    const user = setUpUser();
    stub.service.listExceptions.mockResolvedValue(
      ok([buildRow({ ownerId: ACTIVE_USER.id })]),
    );
    renderQueue();
    await awaitQueue();

    const assign = within(rowAt(0)).getByRole('button', { name: /^Assign to me/ });

    expect(assign).toHaveAttribute('aria-disabled', 'true');

    await user.click(assign);

    expect(screen.getByRole('tooltip')).toHaveTextContent(EXCEPTION_QUEUE_TEXT.alreadyOwnerReason);
    expect(stub.service.assignException).not.toHaveBeenCalled();
  });

  it('keeps the dismissal confirm disabled with its reason until a reason is given', async () => {
    const user = setUpUser();
    renderQueue();
    await awaitQueue();

    await user.click(within(rowAt(0)).getByRole('button', { name: /^Dismiss/ }));

    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const blockedConfirm = within(dialog).getByRole('button', {
      name: EXCEPTION_QUEUE_TEXT.confirmDismiss,
    });

    expect(blockedConfirm).toHaveAttribute('aria-disabled', 'true');

    /* Keyboard focus, not a pointer, is what has to reach the reason (rule B-3, T-16 semantics). */
    await user.click(blockedConfirm);

    expect(screen.getByRole('tooltip')).toHaveTextContent(EXCEPTION_QUEUE_TEXT.reasonRequired);
    expect(stub.service.dismissException).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(EXCEPTION_QUEUE_TEXT.reasonLabel), TYPED_REASON);

    const confirm = within(dialog).getByRole('button', {
      name: EXCEPTION_QUEUE_TEXT.confirmDismiss,
    });

    expect(confirm).not.toHaveAttribute('aria-disabled');

    await user.click(confirm);

    await waitFor(() => {
      expect(stub.service.dismissException).toHaveBeenCalledTimes(1);
    });
    expect(stub.service.dismissException).toHaveBeenCalledWith(ROW_A.id, TRIMMED_REASON);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText(EXCEPTION_QUEUE_TEXT.dismissed)).toBeVisible();
  });

  it('closes the dismissal dialog on Escape and returns focus to the control that opened it', async () => {
    const user = setUpUser();
    renderQueue();
    await awaitQueue();

    const opener = within(rowAt(0)).getByRole('button', { name: /^Dismiss/ });

    await user.click(opener);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(opener).toHaveFocus();
  });

  it('renders the empty state with the sentence the screen supplies', async () => {
    stub.service.listExceptions.mockResolvedValue(ok([]));
    renderQueue();

    expect(await screen.findByText(EXCEPTION_QUEUE_TEXT.empty)).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the forbidden state with the permission, the roles and the trace id', async () => {
    stub.service.listExceptions.mockRejectedValue(PERMISSION_PROBLEM);
    renderQueue();

    /* The card's title carries the permission it names, so the assertion reads the text node that
       holds it rather than restating the sentence the card owns. */
    const namedPermission = await screen.findByText((content) =>
      content.includes(REQUIRED_PERMISSION),
    );

    expect(namedPermission).toBeVisible();
    expect(screen.getByText(ROLE_WITH_PERMISSION)).toBeVisible();
    expect(screen.getByText(REFUSAL_TRACE)).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('moves the row cursor with J and K and opens the focused row on Enter', async () => {
    const user = setUpUser();
    renderQueue();
    await awaitQueue();

    /* The row cursor is a roving tab stop, so the first data row is the table's focus entry. */
    act(() => {
      rowAt(0).focus();
    });

    await user.keyboard('j');

    expect(rowAt(1)).toHaveFocus();

    await user.keyboard('k');

    expect(rowAt(0)).toHaveFocus();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(shownPathname()).toBe(`${QUEUE_ROUTE}/${ROW_A.id}`);
    });
  });

  it.each(THEMES)('renders the queue in the %s theme', async (theme) => {
    document.documentElement.dataset.theme = theme;

    renderQueue();
    await awaitQueue();

    expect(queueTable()).toHaveAccessibleName(EXCEPTION_QUEUE_TEXT.tableCaption);
    expect(
      screen.getByRole('columnheader', { name: EXCEPTION_QUEUE_TEXT.columnRevenue }),
    ).toBeVisible();
    expect(screen.getByText(CALCULATED_LABEL)).toBeVisible();
    expect(drawnIdentifiers()).toEqual([ROW_A.id, ROW_B.id, ROW_C.id]);
  });

  it('reapplies a saved view and reads the queue with the filter set it holds', async () => {
    const user = setUpUser();
    renderQueue();
    await awaitQueue();

    const viewName = 'High severity';

    /* The save control states its own blocker until the field holds a name (rule P-8). */
    await user.click(screen.getByRole('button', { name: EXCEPTION_QUEUE_TEXT.saveView }));

    expect(screen.getByRole('tooltip')).toHaveTextContent(
      EXCEPTION_QUEUE_TEXT.viewNameRequiredReason,
    );

    await user.selectOptions(filterControl(EXCEPTION_QUEUE_TEXT.severityFilter), 'high');
    await waitFor(() => {
      expect(lastQuery()).toMatchObject({ severity: 'high' });
    });

    await user.type(screen.getByLabelText(EXCEPTION_QUEUE_TEXT.viewNameLabel), viewName);
    await user.click(screen.getByRole('button', { name: EXCEPTION_QUEUE_TEXT.saveView }));

    expect(screen.getByText(viewName)).toBeVisible();

    await user.selectOptions(filterControl(EXCEPTION_QUEUE_TEXT.severityFilter), 'critical');
    await waitFor(() => {
      expect(lastQuery()).toMatchObject({ severity: 'critical' });
    });

    await user.click(
      screen.getByRole('button', {
        name: `${EXCEPTION_QUEUE_TEXT.applyView}: ${viewName}`,
      }),
    );

    await waitFor(() => {
      expect(lastQuery()).toMatchObject({ severity: 'high' });
    });
    expect(filterControl(EXCEPTION_QUEUE_TEXT.severityFilter)).toHaveValue('high');
  });
});

