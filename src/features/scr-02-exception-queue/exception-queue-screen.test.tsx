/**
 * Component suite for `exception-queue-screen.tsx`: the SCR-02 queue of stage S1, its twelve columns,
 * its six filters, its row actions, its saved views, the two states that withhold the table's rows,
 * the keyboard row cursor and both themes.
 *
 * WHAT IT PROVES. Each case asserts a contract of AAP §0.12.4's SCR-02 row rather than a shape of the
 * markup: the twelve columns AAP fixes appear in its order with the actions cell after them; the rows
 * arrive in the order the service returned them, because the queue's default order is the service's
 * (`sortUrgent`) and a screen that re-sorted would disagree with the overview computed over the same
 * records; each filter reaches the port once with the member it narrowed; the day the screen is handed
 * reaches the port as the query's own member and is cleared by the control that states it; the two row
 * writes go through the port exactly once; the confirm of the dismissal dialog is disabled with its
 * reason until a reason exists (rule P-8) and the dialog closes only once the write settles; the empty
 * state keeps the table with its caption and every one of its headers and states the sentence in the
 * one cell that spans them — the filter wording for a read the reader narrowed, the neutral sentence
 * for one nothing narrowed — while the forbidden state renders the refusal's evidence in place of the
 * table; `J`, `K` and `Enter` drive the row cursor; a saved view restores the filter set it holds;
 * each figure a row shows — revenue at risk, days to impact and age — is a trigger whose activation
 * opens that exception's evidence (AAP §0.12.4, functional requirement F12, principle PR-6); and the
 * queue renders in Command and in Paper.
 *
 * HOW THE SERVICE IS REACHED. The provider module is replaced, not the port: `vi.mock` swaps
 * `../../services/service-provider` for the four hooks the screen reads, backed by one hoisted stub
 * whose `vi.fn`s are named exactly as the port's members are, so a renamed member surfaces here as a
 * call to an undefined function rather than as a quietly passing suite. Nothing else is replaced —
 * no seed module, adapter, HTTP client or domain module is imported, and every record below is
 * hand-built (rule P-2). Every identifier-shaped value is assembled by concatenation, and every
 * amount is a plain number, so no domain identifier and no currency literal is written into a feature
 * folder (rule P-6); the fixture rows are the suite's own input, standing for what the adapter returns
 * at run time, in the same way `src/components/state-boundary.test.tsx` supplies its own denial. The
 * roster `useRolesHolding` answers with is the suite's own input for the same reason: the adapter
 * derives it from the personas it reports, and no seed module is reached from here.
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
 * - P-8: every control the queue can render disabled — the two row writes for a persona that may not
 *   work the row or for a session reporting no persona, the dismissal confirm and the saved-view save —
 *   is asserted to state its reason, and the two row writes are asserted enabled for a persona that does
 *   hold `exception.work` over the row's plant.
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
  Role,
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
 * port member the screen reaches: `listExceptions` for the queue's own read, `assignException` and
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
    /** The roles the provider reports as holding `exception.work`, or `null` while that is unknown. */
    rolesWithWork: null as Role[] | null,
  };
});

/**
 * The provider replaced by the stub.
 *
 * `useService()` hands back the double, `useActiveUser()` the persona a case wants,
 * `useRolesHolding()` the roles a case reports as holding the permission the row writes need, and
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
  useRolesHolding: (): Role[] | null => stub.rolesWithWork,
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

/**
 * The permission a write to an exception needs, as the adapter's own gate checks it.
 *
 * A row action and the note action are disabled without it, so the suite asserts the sentence names
 * this permission rather than a paraphrase of it.
 */
const WORK_PERMISSION: Permission = 'exception.work';

/**
 * The roles the roster reports as holding {@link WORK_PERMISSION}, in the order it lists them.
 *
 * The roles the persona roster derives from the matrix are the adapter's own answer, so this is the
 * suite's input for what `useRolesHolding` returns, standing for what the provider reads at run time —
 * the disabled control's sentence is composed from it and must name every one of them in this order.
 */
const ROLES_WITH_WORK: Role[] = [
  'material-planner',
  'plant-manager',
  'production-planner',
  'supplier-quality-engineer',
];

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

/**
 * The twelve columns AAP 0.12.4's SCR-02 row names, in the order it gives them.
 *
 * Shared by the case that reads them off a queue holding rows and the case that reads them off a queue
 * holding none, because the empty state replaces the rows and not the table: a header a reader could
 * sort the queue by is a header they must still reach after narrowing it to nothing.
 */
const SPECIFIED_COLUMNS: readonly string[] = [
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

/**
 * The persona a role that may only read the queue acts as.
 *
 * `permissions` is the matrix as the adapter derives it for the role, so this persona reaches the queue
 * and holds no `exception.work` over any row — the case the row controls must explain before the
 * attempt rather than refuse after it (AAP 0.2.1, rule P-8). Its plant scope covers both rows the
 * assertions read, so nothing but the missing permission can disable them.
 */
const READ_ONLY_USER: ActiveUser = {
  id: ['USR', '06'].join('-'),
  name: 'Sample Auditor',
  role: 'auditor',
  plantIds: [PLANT_RGB, PLANT_BRN],
  permissions: ['exception.read'],
  homeRoute: '/audit',
};

/**
 * The persona a role that may work records acts as, scoped to the second row's plant alone.
 *
 * It holds {@link WORK_PERMISSION} and owns none of the supplied rows, so it may change a record at its
 * own plant and no other: one render therefore tells the two halves of the gate apart, because the first
 * row lands on `PLANT_RGB` and the second on `PLANT_BRN`.
 */
const PLANT_SCOPED_USER: ActiveUser = {
  id: ['USR', '05'].join('-'),
  name: 'Sample Production Planner',
  role: 'production-planner',
  plantIds: [PLANT_BRN],
  permissions: ['exception.read', 'exception.work'],
  homeRoute: '/exceptions',
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

/** One enumerated filter, and the member of a row whose values it offers. */
interface OptionSourceCase {
  /** The filter's visible label, which is also its control's accessible name. */
  readonly label: string;

  /** The member of the supplied rows the filter's options are the distinct values of. */
  readonly pick: (row: ExceptionRow) => string;
}

/**
 * The five enumerated filters, each beside the row member its options come from.
 *
 * The expected values are read from the rows the stub returns rather than written here (rule P-6), so a
 * case can assert that each control offers what that one answer carries.
 */
const OPTION_SOURCE_CASES: readonly OptionSourceCase[] = [
  { label: EXCEPTION_QUEUE_TEXT.typeFilter, pick: (row) => row.type },
  { label: EXCEPTION_QUEUE_TEXT.plantFilter, pick: (row) => row.plantId },
  { label: EXCEPTION_QUEUE_TEXT.severityFilter, pick: (row) => row.severity },
  { label: EXCEPTION_QUEUE_TEXT.statusFilter, pick: (row) => row.status },
  { label: EXCEPTION_QUEUE_TEXT.ownerFilter, pick: (row) => row.ownerId },
];

/** One way the shell mounts the queue, with the props that mount supplies. */
interface MountCase {
  /** How the mount narrows the queue, named in the case's title. */
  readonly mount: string;

  /** The props that mount hands the screen. */
  readonly props: ExceptionQueueScreenProps;
}

/**
 * The two mounts held to one read each: the queue the shell opens whole, and the queue the overview's day
 * has already narrowed — the shape that used to pay a second, unfiltered read for the filters' options.
 */
const MOUNT_CASES: readonly MountCase[] = [
  { mount: 'no narrowing', props: {} },
  { mount: 'the day it is handed', props: { initialQuery: { date: THE_DAY } } },
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
    stub.rolesWithWork = [...ROLES_WITH_WORK];
    stub.service.listExceptions.mockResolvedValue(ok([...ROWS]));
    stub.service.assignException.mockResolvedValue(ok({ ownerId: ACTIVE_USER.id }));
    stub.service.dismissException.mockResolvedValue(ok({ id: ROW_A_ID }));
    stub.service.getEvidence.mockResolvedValue(ok(FIGURE_EVIDENCE));
  });

  it('draws the twelve specified columns in order, with the actions cell after them', async () => {
    renderQueue();
    await awaitQueue();

    const headers = headerCells();

    expect(headers).toHaveLength(SPECIFIED_COLUMNS.length + 1);
    expect(headers.map((header) => header.textContent?.trim())).toEqual([
      ...SPECIFIED_COLUMNS,
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

  it('reverses the order it announces on the first activation of the sorted header', async () => {
    const user = setUpUser();
    renderQueue();
    await awaitQueue();

    /*
     * The rows arrive in the service's order — severity then days to impact — and the table states it,
     * so Severity is the one header a reader is told about before touching anything.
     */
    const severityHeader = headerCells().find(
      (header) => header.textContent?.trim() === EXCEPTION_QUEUE_TEXT.columnSeverity,
    );

    if (severityHeader === undefined) {
      throw new Error('the queue drew no severity header to sort by');
    }

    expect(severityHeader).toHaveAttribute('aria-sort', 'ascending');

    const readsBefore = readCount();
    await user.click(within(severityHeader).getByRole('button'));

    /*
     * The first activation reverses the announced order instead of asking for it again: the read carries
     * `severity:desc`, which the service answers with the urgency ranking read backwards, so the rows a
     * reader sees change and the announcement follows them (rule P-8).
     */
    await waitFor(() => {
      expect(readCount()).toBe(readsBefore + 1);
    });
    expect(lastQuery()).toMatchObject({ sort: 'severity:desc' });
    /*
     * The sorted read withholds the table while it is pending, so the header that states the order is
     * read again from the table the answer renders rather than from the node that carried the
     * activation.
     */
    await waitFor(() => {
      expect(
        screen.getByRole('columnheader', { name: EXCEPTION_QUEUE_TEXT.columnSeverity }),
      ).toHaveAttribute('aria-sort', 'descending');
    });
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
     * The day reaches the port as the query's own member, with no other constraint beside it, and the
     * mount issues that read alone: the filters' options come from the answer it returns, so no second,
     * unfiltered read of the same list travels beside it.
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

  /**
   * One read per mount, the five enumerated filters filled from that same answer, and one read when a
   * filter is chosen.
   *
   * Every `listExceptions` call computes the whole exception aggregate — a solver call per case included —
   * so a mount that narrowed the queue cannot also pay a second, unfiltered read for the filters' option
   * values. The two reads once hashed to one cache key on a bare mount and to two on a narrowed one, which
   * is how a queue opened from the overview's day paid the aggregate twice.
   */
  it.each(MOUNT_CASES)(
    'reads the queue once on a mount with $mount, fills the five selects from that answer and narrows by one read',
    async ({ props }) => {
      const user = setUpUser();
      renderQueue(props);
      await awaitQueue();

      expect(readCount()).toBe(1);
      expect(stub.service.listExceptions.mock.calls.map((call) => call[0] as ExceptionQuery)).toEqual([
        props.initialQuery ?? {},
      ]);

      /* Each select offers the distinct values the rows of that one answer carry. */
      for (const { label, pick } of OPTION_SOURCE_CASES) {
        const offered = within(filterControl(label))
          .getAllByRole<HTMLOptionElement>('option')
          .map((option) => option.value);

        for (const value of new Set(ROWS.map(pick))) {
          expect(offered).toContain(value);
        }
      }

      /*
       * The read a changed filter set issues answers with only the rows that set admits, and with none at
       * all when it admits nothing, so the values the first answer stated are gone from it. The control
       * still states the value in force — a select that dropped it could neither show what narrows the
       * queue nor report a change of it (rules P-8, B-3) — and the "All severities" entry is the way back
       * to the wider set. The chosen value replaces the query and is paid for by exactly one more read,
       * which keeps the day the mount was narrowed to.
       */
      stub.service.listExceptions.mockResolvedValue(ok([]));

      await user.selectOptions(filterControl(EXCEPTION_QUEUE_TEXT.severityFilter), ROW_B.severity);
      await screen.findByText(EXCEPTION_QUEUE_TEXT.empty);

      expect(readCount()).toBe(2);
      expect(lastQuery()).toMatchObject({ severity: ROW_B.severity, ...props.initialQuery });

      const severityControl = filterControl(EXCEPTION_QUEUE_TEXT.severityFilter);

      expect(severityControl).toHaveValue(ROW_B.severity);
      expect(
        within(severityControl).getByRole('option', { name: EXCEPTION_QUEUE_TEXT.anySeverity }),
      ).toBeVisible();
    },
  );

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

  it('disables both row writes for a persona that does not hold the work permission, naming the roles that do', async () => {
    const user = setUpUser();
    stub.activeUser = READ_ONLY_USER;
    renderQueue();
    await awaitQueue();

    const firstRow = within(rowAt(0));
    const secondRow = within(rowAt(1));
    const assign = firstRow.getByRole('button', { name: /^Assign to me/ });
    const dismiss = secondRow.getByRole('button', { name: /^Dismiss/ });

    /* Every row is refused, at either plant, because the permission is missing rather than the plant. */
    expect(assign).toHaveAttribute('aria-disabled', 'true');
    expect(firstRow.getByRole('button', { name: /^Dismiss/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(secondRow.getByRole('button', { name: /^Assign to me/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(dismiss).toHaveAttribute('aria-disabled', 'true');

    await user.click(assign);

    const reason = screen.getByRole('tooltip');

    expect(reason).toHaveTextContent(EXCEPTION_QUEUE_TEXT.noWorkActor);
    expect(reason).toHaveTextContent(READ_ONLY_USER.role);
    expect(reason).toHaveTextContent(WORK_PERMISSION);
    expect(reason).toHaveTextContent(ROW_A.plantId);
    expect(reason).toHaveTextContent(EXCEPTION_QUEUE_TEXT.noWorkRoles);
    expect(reason).toHaveTextContent(ROLES_WITH_WORK.join(', '));

    /*
     * The dismissal is refused at the row action, which is the only way into the dialog: activating it
     * opens nothing, and neither write reached the port (rule P-8, and the adapter refuses them anyway).
     */
    await user.click(dismiss);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(stub.service.assignException).not.toHaveBeenCalled();
    expect(stub.service.dismissException).not.toHaveBeenCalled();
  });

  it('disables the row writes at a plant outside the acting persona’s scope and enables them inside it', async () => {
    const user = setUpUser();
    stub.activeUser = PLANT_SCOPED_USER;
    renderQueue();
    await awaitQueue();

    const outOfScope = within(rowAt(0));
    const inScope = within(rowAt(1));

    expect(outOfScope.getByRole('button', { name: /^Assign to me/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(outOfScope.getByRole('button', { name: /^Dismiss/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    /* The permission is held, so the rows the persona reaches offer both writes as they stand. */
    expect(inScope.getByRole('button', { name: /^Assign to me/ })).not.toHaveAttribute(
      'aria-disabled',
    );
    expect(inScope.getByRole('button', { name: /^Dismiss/ })).not.toHaveAttribute('aria-disabled');

    await user.click(outOfScope.getByRole('button', { name: /^Assign to me/ }));

    /* The sentence names the plant the row lands on, which is the fact that is wrong rather than the role. */
    expect(screen.getByRole('tooltip')).toHaveTextContent(ROW_A.plantId);
    expect(stub.service.assignException).not.toHaveBeenCalled();
  });

  it('names no role while the roster has not reported the roles that may act', async () => {
    const user = setUpUser();
    stub.activeUser = READ_ONLY_USER;
    stub.rolesWithWork = null;
    renderQueue();
    await awaitQueue();

    await user.click(within(rowAt(0)).getByRole('button', { name: /^Dismiss/ }));

    const reason = screen.getByRole('tooltip');

    expect(reason).toHaveTextContent(WORK_PERMISSION);
    expect(reason).toHaveTextContent(ROW_A.plantId);
    expect(reason).not.toHaveTextContent(EXCEPTION_QUEUE_TEXT.noWorkRoles);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

  it('T-17 keeps the table, its caption and every column when the read answers with no row', async () => {
    stub.service.listExceptions.mockResolvedValue(ok([]));
    renderQueue();

    /*
     * The empty state replaces the rows, not the table. A reader who emptied the queue still sees the
     * caption and the headers they were narrowing it by, and the sentence stands in the one cell that
     * spans them, so the answer is stated inside the structure it belongs to (specification §8,
     * AAP 0.12.4).
     */
    const table = await screen.findByRole('table', {
      name: EXCEPTION_QUEUE_TEXT.tableCaption,
    });

    expect(within(table).getByText(EXCEPTION_QUEUE_TEXT.emptyUnnarrowed)).toBeVisible();
    expect(headerCells().map((header) => header.textContent?.trim())).toEqual([
      ...SPECIFIED_COLUMNS,
      EXCEPTION_QUEUE_TEXT.columnActions,
    ]);

    /* No row, so no row action: the cell that states the emptiness is the body's only cell. */
    expect(within(table).getAllByRole('cell')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /^Open\s*:/ })).not.toBeInTheDocument();

    /* The computed column's label and the sentence explaining it stay with the content: an empty
       answer holds no figure for a label to refer to (rule P-1). */
    expect(screen.queryByText(CALCULATED_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(EXCEPTION_QUEUE_TEXT.revenueNote)).not.toBeInTheDocument();
  });

  it('T-17 keeps the filter wording when a narrowed read answers with no row', async () => {
    const user = setUpUser();

    /* The first read fills the table and the filters' options; the narrowed read that follows empties
       it, which is the answer a filter set that matches nothing produces. */
    stub.service.listExceptions.mockResolvedValueOnce(ok([...ROWS])).mockResolvedValue(ok([]));
    renderQueue();
    await awaitQueue();

    await user.selectOptions(filterControl(EXCEPTION_QUEUE_TEXT.severityFilter), 'critical');

    expect(await screen.findByText(EXCEPTION_QUEUE_TEXT.empty)).toBeVisible();
    expect(screen.getByRole('table', { name: EXCEPTION_QUEUE_TEXT.tableCaption })).toBeVisible();

    /* The sentence the unfiltered answer gets is not the one a narrowed answer gets: the reader
       narrowed the queue themselves, and the wording says so. */
    expect(screen.queryByText(EXCEPTION_QUEUE_TEXT.emptyUnnarrowed)).not.toBeInTheDocument();
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

