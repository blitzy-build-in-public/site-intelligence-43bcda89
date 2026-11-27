/**
 * SCR-03, the investigation screen of `/exceptions/:exceptionId`: acceptance tests T-02, T-03, T-05 and
 * T-06, driven through the visible interface of the built application.
 *
 * WHAT THIS FILE PROVES, ONE IDENTIFIER AT A TIME. T-02 — the screen answers "what changed" and "what
 * does it touch", with the impact chain running from the purchase order through the material and the
 * production line to the customer orders, and each node opening its evidence. T-03 — the projected
 * closing stock never falls below zero, read from the chart's own table of readings rather than from a
 * drawn mark, so the reading survives a redraw. T-05 — the affected orders carry the identifiers,
 * quantities and promised dates the records state, and those readings are the solver's own. T-06 — the
 * missing inputs, the confidence behind the assessment, the activity recorded against the exception and
 * the four controls the screen offers, each either acting or explaining why it cannot.
 *
 * HOW THE EXCEPTION IS FOUND. The route names the exception, and this spec never types one: AAP 0.7
 * forbids addressing a record directly, and rule P-6 forbids an expected identifier written into a
 * test. Every test therefore loads the application at its root (the shell sends the acting persona to
 * its own entry route), reads the queue through the navigation, and opens the queue's rows in the order
 * the records put them until it reaches the one whose projection carries a dated caption. That caption
 * exists only for an exception the records connect to a solver case, and `src/seed/exceptions.ts` gives
 * the demonstration exactly one — the case `tests/fixtures/solver-expected-results.ts` is measured at.
 * The identifier the spec then works with is read back from the address the application itself
 * navigated to.
 *
 * WHERE THE EXPECTED NUMBERS COME FROM (rule P-6). This file types no amount, count, date or record
 * identifier of the application's data. The one expected figure it holds comes from
 * `tests/fixtures/solver-expected-results.ts`, which is the single home rule P-6 allows the
 * expected-results table; the baseline row is located by its own levers rather than by its row id, and
 * the screen's readings are compared against that row. Every other expectation is read from the
 * running interface — a figure another screen already shows, a label the component prints, or the
 * promise dates the records state — so a second copy of a business figure never enters the suite.
 * The sum and the maximum T-05 takes over the affected orders are the only arithmetic in the file, and
 * they exist to hold the screen against that one fixture row.
 *
 * WHAT IS DELIBERATELY NOT ASSERTED, AND WHY.
 * - GAP — the shaded idle window. AAP 0.12.4's SCR-03 row asks the chart to shade it, and the records
 *   cannot support it: the solver states the number of idle days, not the span they fall in, so a band
 *   would be a measure this application invented, which rule P-6 forbids. `investigation-screen.tsx`
 *   records the omission as its own open item and passes no bands. The requirement is therefore reported
 *   as a gap rather than asserted here, because an assertion could only pass on a figure the records do
 *   not hold; the rest of T-03 is asserted in full around it.
 * - A scenario switch on this screen. The investigation plots the option the service designates beside
 *   the baseline and offers no control to choose another; choosing one belongs to SCR-04. T-03's
 *   "changes the series without changing the window" is asserted in the form the screen delivers: two
 *   series over one date column, one of which reads differently on at least one day.
 * - The daily closing-stock series against the fixture. The fixture states the six measures of each
 *   option and no day-by-day series, so the comparison the brief conditions on "where the fixture holds
 *   that row" has no row to hold; the series is instead checked for the property T-03 exists to prove
 *   and cross-checked against the marks the same chart draws.
 * - The window's dates as literals. T-03's span is read from the table's own date column — every date an
 *   ISO day, strictly increasing, sharing one column across both series — and then checked against the
 *   promise dates the affected orders state, which must fall inside it. A date written here would be an
 *   expected figure outside the fixture, which rule P-6 does not allow.
 * - A per-exception revenue figure on the investigation screen. SCR-03 states none, so T-05 proves the
 *   revenue reading where the interface shows it — the queue's row figure — and ties it to the screen
 *   under test through the evidence that figure opens: its formula names the rule and its inputs list the
 *   same affected lines, units at risk and promise dates the investigation's table renders. Two reads of
 *   one record, checked against each other, which is what makes one computation reach every screen.
 *
 * HOW IT DRIVES THE SCREEN (rules B-3, P-8). Every locator is a role or an accessible name, never a
 * class, a colour or a pixel. The disabled controls are read for the sentence they give rather than
 * forced, and the reading of a chart goes through the table view `ChartFrame` makes mandatory, which is
 * both the accessible representation and the one that cannot be changed by a redraw. No fixed sleep
 * appears anywhere: the adapter adds 150–400 ms per read and the bootstrap hashes the seeded audit
 * events, so every wait is a web-first assertion on what the screen must eventually show.
 *
 * WHAT IT NEVER DOES: it imports no seed record, no mock adapter and no API client (rule P-2); it reads
 * no configuration and holds no credential (rule B-2); it asserts no colour or geometry and no
 * unimplemented claim (rules B-3, P-4); it names no company, product or person of its own, every name on
 * screen being a record value (rule P-7); and it does not test the comparison matrix (T-04), the
 * approval path (T-07 to T-09) or the seven screen states (T-17), which their own specs own.
 */
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { EXPECTED_SOLVER_ROWS } from '../tests/fixtures/solver-expected-results';
import { switchRole } from './helpers/role';

/* ---------------------------------------------------------------------------------------------
 * The wording the screens own, held once so this spec never retypes a sentence it asserts
 * ------------------------------------------------------------------------------------------- */

/**
 * Every label, heading and caption this spec matches, copied from the modules that own it.
 *
 * None of these is a business figure: each is a screen's own wording (a card heading, a column header,
 * a fixed specification §5.3 label), and matching it is how a browser test identifies a region without
 * a class name. A caption that carries a figure — the projected-stock figure's date span — is matched
 * by a pattern below rather than by this table, and no amount, count, date or record identifier of the
 * application's data is written here (rule P-6).
 */
const SCREEN_COPY = {
  /** The queue's navigation entry (`src/app/nav-items.ts`). */
  navQueue: 'Exceptions',

  /** The queue's table caption, which is also its accessible name. */
  queueCaption: 'Exception queue',

  /** The queue's row action for opening one exception (`: <id>` is appended for the row's own name). */
  rowOpen: /^Open\s*:/,

  /** The queue's revenue column, whose figure opens the evidence behind it. */
  queueRevenueColumn: 'Revenue at risk',

  /** The currency code the interface's one money formatter prints (contracts §1). */
  currencyCode: 'EUR',

  /** SCR-03's header facts region and its three record values. */
  factsRegion: 'Exception facts',
  severityLabel: 'Severity',
  statusLabel: 'Status',
  ownerLabel: 'Owner',

  /** The computed figure beside the facts, and the card that carries it. */
  daysToImpact: 'Days to impact',

  /** The record's own account of the disruption. */
  whatChanged: 'What changed',

  /** The card holding the impact chain, and the list inside it. */
  chainCard: 'What the disruption touches',
  chainList: 'Impact chain',

  /** The four kinds of chain node, in the order a chain flows through them. */
  chainKind: {
    purchaseOrder: 'Purchase order',
    material: 'Material',
    line: 'Production line',
    customerOrder: 'Customer order',
  },

  /** The impact chain's node control, whose accessible name ends with this suffix. */
  openEvidenceSuffix: '— open evidence',

  /** The projection's card and the caption its figure and its table share. */
  projectionCard: 'Projected closing stock',
  projectionCaption: /^Projected closing stock from /,

  /** The date column of the projection's table view. */
  dateColumn: 'Date',

  /** The zero level the projection is read against. */
  zeroReference: 'Zero stock',

  /** The "View as table" control's accessible name, which carries the figure's own title. */
  viewAsTable: /^View as table: /,

  /**
   * The same control on a projection whose caption names the span it covers — the form only an
   * exception the records connect to a solver case can produce.
   */
  datedProjectionTable: /^View as table: Projected closing stock from /,

  /** The affected-orders card, its caption and its five columns. */
  ordersCard: 'Customer orders at risk',
  ordersCaption: 'Customer orders this disruption places at risk, with the measured units late',
  orderColumn: 'Order',
  unitsLateColumn: 'Units late',
  daysLateColumn: 'Days late',
  promisedColumn: 'Promised',
  unitsAtRiskColumn: 'Units at risk',

  /** The confidence and missing-inputs region and its two labels. */
  confidenceRegion: 'Missing inputs and confidence',
  missingInputsLabel: 'Inputs the assessment could not read',
  confidenceLevel: /^(High|Medium|Low)$/,

  /** The activity region. */
  activityRegion: 'Activity',

  /** The four controls, and the note form the two writes use. */
  compareOptions: 'Compare options',
  addNote: 'Add note',
  assignToMe: 'Assign to me',
  noteCard: 'Add a note',
  noteField: 'Note',
  recordNote: 'Record note',

  /**
   * The three conditions "Assign to me" states when it cannot act, and the one "Record note" states
   * before the note is typed. Both are sentences the screen gives, so matching them is how the control's
   * refusal is read rather than forced (rule P-8); neither carries a figure.
   */
  assignReason: /already assigned|being recorded|no acting persona/i,
  noteReason: /enter the note|being recorded/i,

  /* The two fixed specification §5.3 labels this screen's figures carry (rule P-1). */
  calculated: 'Simulated calculation',

  /** The shell's badge, whose accessible name is the label followed by the demonstration clock. */
  badgeName: /^Simulated data at /,

  /** The evidence drawer: its own name, the two sections this spec reads and the fields inside them. */
  drawerName: 'Evidence',
  valueSection: 'Value and formula',
  formulaLabel: 'Formula',
  linksSection: 'Inputs, upstream and downstream',
  inputsLabel: 'Inputs',
} as const;

/* ---------------------------------------------------------------------------------------------
 * Reading the document: text, cells and readings
 * ------------------------------------------------------------------------------------------- */

/** Collapses runs of whitespace so a rendered cell or sentence compares as one line. */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * The text of a locator, collapsed, with an empty string where the element has none.
 *
 * @param target The element to read.
 * @returns The element's text content, whitespace collapsed.
 */
async function textOf(target: Locator): Promise<string> {
  return collapse((await target.textContent()) ?? '');
}

/**
 * A reading whose rendered text is a number, or a failure naming what was rendered instead.
 *
 * The accepted forms are the ones the screens produce for a plain count or a plain stock reading: an
 * optionally signed integer or decimal, with grouping spaces and a decimal comma or point tolerated. An
 * amount carrying its currency code is deliberately not accepted, because silently reading "1.512.800
 * EUR" as a number would hide the very formatting difference an assertion exists to catch (rule P-6:
 * never a plausible value in place of the record's).
 *
 * @param text The rendered cell.
 * @param where What the cell is, for the failure message.
 * @returns The reading as a number.
 * @throws Error when the cell does not hold a number.
 */
function readingOf(text: string, where: string): number {
  const cleaned = collapse(text).replace(/[\u2007\u202f\u00a0\s]/g, '');
  const normalised = /^-?\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?$/.test(cleaned)
    ? cleaned.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')
    : cleaned.replace(',', '.');
  const value = Number(normalised);

  if (!/^-?\d+(?:\.\d+)?$/.test(normalised) || !Number.isFinite(value)) {
    throw new Error(`${where}: "${collapse(text)}" is not a reading this spec can compare.`);
  }

  return value;
}

/**
 * The cell of a row at one index, or a failure naming the row so a missing column is never read as an
 * empty string.
 *
 * @param cells The row's cells, already read.
 * @param index The column's position.
 * @param where What the row is, for the failure message.
 * @returns The cell's text, collapsed.
 * @throws Error when the row has no such cell.
 */
function cellAt(cells: readonly string[], index: number, where: string): string {
  const cell = cells[index];

  if (cell === undefined || index < 0) {
    throw new Error(`${where}: the row renders no column at position ${index}, only ${cells.length}.`);
  }

  return collapse(cell);
}

/**
 * The column position whose header reads the way the caller names it, or a failure listing the headers.
 *
 * @param headers The table's header cells, in column order.
 * @param label The header the caller is looking for.
 * @returns The column's position.
 * @throws Error when no header matches.
 */
function columnOf(headers: readonly string[], label: string): number {
  const index = headers.findIndex((header) => collapse(header) === label);

  if (index < 0) {
    throw new Error(
      `No column is headed "${label}". The table renders: ${headers.map((header) => JSON.stringify(collapse(header))).join(', ')}.`,
    );
  }

  return index;
}

/**
 * The value a cell states, with the evidence control's own accessible suffix removed.
 *
 * A figure that opens its evidence is rendered as a control whose visible text is the value and whose
 * accessible name continues with the suffix that says what activating it does. Reading the cell's text
 * therefore yields both, so the suffix is taken off before the value is compared: it is part of the
 * control, never part of the record. A cell that carries no such control is returned as it renders.
 *
 * @param text The cell's rendered text.
 * @returns The value alone, whitespace collapsed.
 */
function valueOf(text: string): string {
  const collapsed = collapse(text);
  const suffix = SCREEN_COPY.openEvidenceSuffix;

  return collapsed.endsWith(suffix)
    ? collapse(collapsed.slice(0, collapsed.length - suffix.length))
    : collapsed;
}

/**
 * The rendered text of every cell in one table row, with each cell's evidence suffix removed.
 *
 * @param row The `<tr>` to read.
 * @returns Each cell's value, in column order.
 */
async function cellsOf(row: Locator): Promise<readonly string[]> {
  return (await row.locator('td').allTextContents()).map(valueOf);
}

/**
 * The rows of a table's body.
 *
 * A `<tbody>` row is read rather than any `<tr>`, so the header row can never be mistaken for a record.
 *
 * @param table The table to read.
 * @returns Its body rows, in render order.
 */
function bodyRowsOf(table: Locator): Locator {
  return table.locator('tbody tr');
}

/* ---------------------------------------------------------------------------------------------
 * Reaching the investigation, through the interface only
 * ------------------------------------------------------------------------------------------- */

/** The acting persona every test drives: the one with a plant scope covering the flagship exception. */
const PERSONA = 'USR-01';

/** The queue's table, by its caption. */
function queueTable(page: Page): Locator {
  return page.getByRole('table', { name: SCREEN_COPY.queueCaption });
}

/** The investigation's header facts region. */
function factsRegion(page: Page): Locator {
  return page.getByRole('region', { name: SCREEN_COPY.factsRegion });
}

/**
 * The projected-stock figure: the `<figure>` that holds the "View as table" control named after the
 * chart's own dated caption.
 *
 * The caption is what tells this figure from any other on the page, and its dated form is what tells an
 * exception with a projection from one whose records carry no solver case — the case-less exception's
 * figure is titled by the projection's own heading, with no span.
 */
function projectedStockFigure(page: Page): Locator {
  return page.locator('figure').filter({
    has: page.getByRole('button', { name: SCREEN_COPY.datedProjectionTable }),
  });
}

/**
 * Loads the application, has the acting persona land on its entry route, and opens the exception queue
 * through the navigation — never by address (AAP 0.7).
 *
 * The persona switch is a real use of the role switcher and is idempotent: the seeded session already
 * acts as this persona, so the helper returns once the switcher confirms it, and the queue is reached
 * by activating the navigation entry a reader would activate.
 *
 * @param page The browser page showing the application.
 */
async function openExceptionQueue(page: Page): Promise<void> {
  await page.goto('/');
  await switchRole(page, PERSONA);
  await page.getByRole('link', { name: SCREEN_COPY.navQueue, exact: true }).click();
  await expect(queueTable(page)).toBeVisible();
}

/**
 * The identifier of the exception the open investigation is showing, read back from the address the
 * application navigated to.
 *
 * The route is `/exceptions/:exceptionId`, so the last path segment is the record's own identifier: it
 * is read here rather than typed anywhere, which is what lets the later assertions name the exception
 * without this file holding a copy of it (rule P-6).
 *
 * @param page The browser page showing an investigation.
 * @returns The exception identifier the route names.
 * @throws Error when the address is not an investigation route.
 */
function openExceptionId(page: Page): string {
  const segments = new URL(page.url()).pathname.split('/').filter((segment) => segment !== '');
  const id = segments[segments.length - 1];

  if (segments[0] !== 'exceptions' || id === undefined || id === 'exceptions') {
    throw new Error(`"${page.url()}" is not an exception's investigation route.`);
  }

  return id;
}

/**
 * Opens the queue's exception that carries a solver case, and leaves the browser on its investigation.
 *
 * The rows are tried in the order the records put them, and the first one whose projection is titled by
 * a date span is the exception the solver measured: AAP 0.8 gives the demonstration exactly one such
 * case, and the seed states it as the only record carrying a solver case, so the search terminates on
 * the choice the records make rather than on an identifier this file wrote down. A queue with no such
 * exception is a failure with the row count in its message, not a silent pass.
 *
 * @param page The browser page showing the application.
 * @returns The identifier of the exception the investigation shows.
 * @throws Error when no row in the queue leads to an exception with a projection.
 */
async function openCaseException(page: Page): Promise<string> {
  await openExceptionQueue(page);

  const total = await page.getByRole('button', { name: SCREEN_COPY.rowOpen }).count();

  for (let index = 0; index < total; index += 1) {
    await page.getByRole('button', { name: SCREEN_COPY.rowOpen }).nth(index).click();
    await expect(factsRegion(page)).toBeVisible();

    if ((await projectedStockFigure(page).count()) > 0) {
      return openExceptionId(page);
    }

    await page.getByRole('link', { name: SCREEN_COPY.navQueue, exact: true }).click();
    await expect(queueTable(page)).toBeVisible();
  }

  throw new Error(
    `None of the queue's ${total} exceptions carries a projection, so no investigation could be read.`,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The screen's regions, each located by the name it renders
 * ------------------------------------------------------------------------------------------- */

/** The affected-orders table, by its caption. */
function ordersTable(page: Page): Locator {
  return page.getByRole('table', { name: SCREEN_COPY.ordersCaption });
}

/** The card holding the affected orders, whose figures carry the computed label. */
function ordersCard(page: Page): Locator {
  return page.getByRole('region', { name: SCREEN_COPY.ordersCard });
}

/** The confidence and missing-inputs region. */
function confidenceRegion(page: Page): Locator {
  return page.getByRole('region', { name: SCREEN_COPY.confidenceRegion });
}

/** The activity region. */
function activityRegion(page: Page): Locator {
  return page.getByRole('region', { name: SCREEN_COPY.activityRegion });
}

/** The evidence drawer, by the name its own heading gives it. */
function evidenceDrawer(page: Page): Locator {
  return page.getByRole('dialog', { name: SCREEN_COPY.drawerName });
}

/**
 * One affected order as the screen renders it: the identifier, the two measured delays and the two
 * record values the exception's own line supplies.
 *
 * Every member is read from the table. Nothing here is computed, and the two record values stay
 * optional because a measured order the exception names no line for renders an empty cell rather than
 * the word "undefined".
 */
interface AffectedOrder {
  /** The customer order the record names. */
  readonly orderId: string;

  /** The units the baseline leaves late, as the cell reads them. */
  readonly unitsLate: number;

  /** The days late the cell reads. */
  readonly daysLate: number;

  /** The date the customer was promised, exactly as the record states it. */
  readonly promised: string;

  /** The units the exception places at risk, or `undefined` where the row leaves the cell empty. */
  readonly unitsAtRisk: number | undefined;
}

/**
 * The affected-orders table's rows, read once and reused by the assertions that reason about them.
 *
 * @param page The browser page showing the investigation.
 * @returns One entry per rendered row, in the table's own order.
 */
async function readAffectedOrders(page: Page): Promise<readonly AffectedOrder[]> {
  const table = ordersTable(page);
  await expect(table).toBeVisible();

  const headers = await table.locator('thead th').allTextContents();
  const orderColumn = columnOf(headers, SCREEN_COPY.orderColumn);
  const unitsLateColumn = columnOf(headers, SCREEN_COPY.unitsLateColumn);
  const daysLateColumn = columnOf(headers, SCREEN_COPY.daysLateColumn);
  const promisedColumn = columnOf(headers, SCREEN_COPY.promisedColumn);
  const unitsAtRiskColumn = columnOf(headers, SCREEN_COPY.unitsAtRiskColumn);

  const rows = bodyRowsOf(table);
  const total = await rows.count();
  const orders: AffectedOrder[] = [];

  for (let index = 0; index < total; index += 1) {
    const where = `Affected order ${index + 1}`;
    const cells = await cellsOf(rows.nth(index));
    const atRisk = cellAt(cells, unitsAtRiskColumn, where);
    const promised = cellAt(cells, promisedColumn, where);

    orders.push({
      orderId: cellAt(cells, orderColumn, where),
      unitsLate: readingOf(cellAt(cells, unitsLateColumn, where), `${where} units late`),
      daysLate: readingOf(cellAt(cells, daysLateColumn, where), `${where} days late`),
      promised,
      unitsAtRisk: atRisk === '' ? undefined : readingOf(atRisk, `${where} units at risk`),
    });
  }

  return orders;
}

/* ---------------------------------------------------------------------------------------------
 * Reading the projection: the marks the chart draws, and the table view of the same readings
 * ------------------------------------------------------------------------------------------- */

/**
 * One reading of one series on one day, as either representation of the chart states it.
 *
 * `raw` is kept beside the parsed number so a failure message can quote what was actually rendered, and
 * so the table's cell text can be compared with the mark's own value text character for character.
 */
interface SeriesReading {
  /** The series' own label, which is the chart's series name and the table's column header. */
  readonly series: string;

  /** The day the reading belongs to, exactly as the record states it. */
  readonly date: string;

  /** The reading as the computing module formatted it. */
  readonly raw: string;
}

/** One day of the projection's table: its date and each series' reading for that date. */
interface ProjectionDay {
  /** The day, exactly as the record states it. */
  readonly date: string;

  /** One entry per series column, in the table's own order; empty where a series has no reading. */
  readonly readings: readonly string[];
}

/** The projection's table view: the series it holds and one entry per day of its window. */
interface ProjectionTable {
  /** The series columns' headers, in order, with the date column left out. */
  readonly series: readonly string[];

  /** The days of the window, in the table's own order. */
  readonly days: readonly ProjectionDay[];
}

/** The pattern a mark's accessible name follows: `<series>, <date>: <value>`. */
const MARK_NAME = /^(.+), (\d{4}-\d{2}-\d{2}): (.+)$/;

/**
 * The readings the chart draws, taken from its marks' accessible names.
 *
 * A point's accessible name carries the series, the day and the value text the computing module
 * formatted, so this is the surface's own statement of every reading rather than a measurement of a
 * drawn position: it survives a redraw, a resize and a change of projection, which is what makes it
 * comparable with the table view.
 *
 * @param figure The projected-stock figure, while its chart view is on screen.
 * @returns One entry per mark, in the order the series and their points are rendered.
 * @throws Error when a mark's accessible name does not carry a series, a date and a value.
 */
async function readChartMarks(figure: Locator): Promise<readonly SeriesReading[]> {
  const marks = figure.locator('svg g[role="button"]');
  const total = await marks.count();
  const readings: SeriesReading[] = [];

  for (let index = 0; index < total; index += 1) {
    const label = collapse((await marks.nth(index).getAttribute('aria-label')) ?? '');
    const parsed = MARK_NAME.exec(label);
    const series = parsed?.[1];
    const date = parsed?.[2];
    const raw = parsed?.[3];

    if (series === undefined || date === undefined || raw === undefined) {
      throw new Error(
        `Mark ${index + 1} of the projected-stock chart is named "${label}", which carries no series, date and value.`,
      );
    }

    readings.push({ series, date, raw });
  }

  return readings;
}

/**
 * The projection's table view, read column by column.
 *
 * @param page The browser page showing the investigation, with the table view on screen.
 * @returns The series headers and every day's readings.
 * @throws Error when the table names no series column.
 */
async function readProjection(page: Page): Promise<ProjectionTable> {
  const table = page.getByRole('table', { name: SCREEN_COPY.projectionCaption });
  await expect(table).toBeVisible();

  const headers = (await table.locator('thead th').allTextContents()).map(collapse);
  const dateColumn = columnOf(headers, SCREEN_COPY.dateColumn);
  const series = headers.filter((header, index) => index !== dateColumn);
  const rows = bodyRowsOf(table);
  const total = await rows.count();
  const days: ProjectionDay[] = [];

  for (let index = 0; index < total; index += 1) {
    const cells = await cellsOf(rows.nth(index));

    days.push({
      date: cellAt(cells, dateColumn, `Projection day ${index + 1}`),
      readings: cells.filter((cell, position) => position !== dateColumn),
    });
  }

  if (series.length === 0) {
    throw new Error('The projection table names no series column, so it holds no reading to compare.');
  }

  return { series, days };
}

/**
 * A reading as one comparable key: the series, the day and the value text.
 *
 * @param reading The reading to encode.
 * @returns Its key.
 */
function keyOf(reading: SeriesReading): string {
  return `${reading.series}|${reading.date}|${reading.raw}`;
}

/**
 * The chain node kinds in the order a disruption flows through them, which is the order the impact
 * chain renders: the purchase order first, then the material, the production line and the customer
 * orders it puts at risk.
 */
const CHAIN_KIND_ORDER = [
  'purchaseOrder',
  'material',
  'line',
  'customerOrder',
] as const;

/** One kind of chain node, as `src/features/scr-03-investigation/impact-chain.tsx` captions it. */
type ChainKind = (typeof CHAIN_KIND_ORDER)[number];

/**
 * The kind a chain node renders, decided by the caption the node itself states.
 *
 * The caption is a node's own first line, so this reads the record rather than guessing from the
 * identifier's shape or from the node's position.
 *
 * @param text The node's rendered text, whitespace collapsed.
 * @param position The node's position in the list, for the failure message.
 * @returns The kind the node captions itself with.
 * @throws Error when the node states none of the four captions.
 */
function chainKindOf(text: string, position: number): ChainKind {
  const kind = CHAIN_KIND_ORDER.find((candidate) =>
    text.startsWith(SCREEN_COPY.chainKind[candidate]),
  );

  if (kind === undefined) {
    throw new Error(
      `Impact chain node ${position + 1} reads "${text}", which states none of the four node kinds the chain renders.`,
    );
  }

  return kind;
}

/**
 * The position of a kind in the chain's flow order.
 *
 * @param kind A chain node kind.
 * @returns Its zero-based position in {@link CHAIN_KIND_ORDER}.
 */
function chainRankOf(kind: ChainKind): number {
  return CHAIN_KIND_ORDER.indexOf(kind);
}

/**
 * The chain's node controls, in the order the records state them.
 *
 * @param page The browser page showing the investigation.
 * @returns The impact chain's list items.
 */
function chainNodes(page: Page): Locator {
  return page.getByRole('list', { name: SCREEN_COPY.chainList }).getByRole('listitem');
}

/**
 * The control that opens one node's evidence, named by the record it carries.
 *
 * @param chainNode One chain list item.
 * @returns The node's evidence control.
 */
function nodeEvidenceControl(chainNode: Locator): Locator {
  return chainNode.getByRole('button', { name: SCREEN_COPY.openEvidenceSuffix });
}


/* ---------------------------------------------------------------------------------------------
 * T-02 — what changed, and what the disruption touches
 * ------------------------------------------------------------------------------------------- */

/**
 * T-02: the investigation states what changed and shows the chain of records the disruption reaches.
 *
 * The header's three record facts and the computed days to impact are asserted first, then the
 * record's own account of the change, then the impact chain — which must run from the purchase order
 * through the material and the production line to the customer orders, in that order and with all four
 * kinds present — and finally that one node's control opens its evidence and hands focus back on
 * `Escape` (rule B-3: a keyboard reader is returned where they were, not to the top of the page).
 */
test('T-02 the investigation states what changed and what the disruption touches', async ({ page }) => {
  await openCaseException(page);

  /* The demonstration's own badge labels this route, exactly as it labels every other (rule P-1). */
  await expect(page.getByRole('button', { name: SCREEN_COPY.badgeName })).toBeVisible();

  /* The three record facts. Their values are record content, so the assertion is that each states one. */
  const facts = factsRegion(page);
  const factLabels = [SCREEN_COPY.severityLabel, SCREEN_COPY.statusLabel, SCREEN_COPY.ownerLabel];

  for (const label of factLabels) {
    await expect(facts.getByText(label, { exact: true })).toBeVisible();
  }

  const factsCount = await facts.locator('dd').count();
  expect(factsCount).toBe(factLabels.length);

  for (let index = 0; index < factsCount; index += 1) {
    expect((await textOf(facts.locator('dd').nth(index))).length).toBeGreaterThan(0);
  }

  /* The computed figure beside them: its value opens the evidence behind it, and it labels itself. */
  const daysTile = page.getByRole('region', { name: SCREEN_COPY.daysToImpact });
  await expect(daysTile).toBeVisible();
  await expect(daysTile.getByText(SCREEN_COPY.calculated).first()).toBeVisible();
  await expect(daysTile.getByRole('button', { name: SCREEN_COPY.openEvidenceSuffix })).toBeVisible();

  /* The record's own account of what changed. */
  const whatChanged = page.getByRole('region', { name: SCREEN_COPY.whatChanged });
  await expect(whatChanged).toBeVisible();
  expect((await textOf(whatChanged.locator('p').first())).length).toBeGreaterThan(0);

  /* The chain: the card the screen frames it in, holding an ordered list with one item per record. */
  const chainCard = page.getByRole('region', { name: SCREEN_COPY.chainCard });
  await expect(chainCard.getByRole('list', { name: SCREEN_COPY.chainList })).toBeVisible();

  const nodes = chainNodes(page);
  const nodeCount = await nodes.count();
  expect(nodeCount).toBeGreaterThan(0);

  const kinds: ChainKind[] = [];

  for (let index = 0; index < nodeCount; index += 1) {
    kinds.push(chainKindOf(await textOf(nodes.nth(index)), index));
  }

  /* A chain begins at the purchase order and ends at the customer orders, and never runs backwards. */
  expect(kinds[0]).toBe('purchaseOrder');

  for (const kind of CHAIN_KIND_ORDER) {
    expect(kinds).toContain(kind);
  }

  for (let index = 1; index < kinds.length; index += 1) {
    const previous = kinds[index - 1];
    const current = kinds[index];

    if (previous === undefined || current === undefined) {
      throw new Error(`Impact chain node ${index} carries no kind.`);
    }

    expect(chainRankOf(current)).toBeGreaterThanOrEqual(chainRankOf(previous));
  }

  /* One node opens its evidence, and `Escape` returns focus to that node rather than to the page. */
  const firstNode = nodeEvidenceControl(nodes.first());
  await expect(firstNode).toBeVisible();
  await firstNode.focus();
  await firstNode.press('Enter');

  const drawer = evidenceDrawer(page);
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText(SCREEN_COPY.valueSection, { exact: true })).toBeVisible();
  await expect(drawer.getByText(SCREEN_COPY.formulaLabel, { exact: true })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(firstNode).toBeFocused();
});

/* ---------------------------------------------------------------------------------------------
 * T-03 — the projection never falls below zero, read from the series rather than from a drawing
 * ------------------------------------------------------------------------------------------- */

/**
 * T-03: the projected closing stock never falls below zero.
 *
 * The reading is taken from the chart's own table view, never from a drawn mark, so it survives a
 * redraw; the marks' accessible names are then compared with it value by value, which is what proves
 * the table states the same series the chart draws rather than a second copy. The window is read from
 * the table's own date column and is checked against the promise dates the records state, so a
 * projection that lost a day or shifted its span fails without this file holding a date of its own.
 *
 * GAP, reported rather than asserted: the shaded idle window. See this file's header — the records
 * state the number of idle days, not the span they fall in, so no band can be drawn without inventing a
 * measure (rule P-6).
 */
test('T-03 the projected closing stock never falls below zero', async ({ page }) => {
  await openCaseException(page);

  const figure = projectedStockFigure(page);
  await expect(figure).toBeVisible();

  /* The figure belongs to the projection's own card rather than to some other surface on the page. */
  await expect(
    page.getByRole('region', { name: SCREEN_COPY.projectionCard }).getByRole('figure'),
  ).toBeVisible();

  /* Rule P-1: the figure labels the series it draws. */
  await expect(figure.getByText(SCREEN_COPY.calculated).first()).toBeVisible();

  /* The zero level is stated in the surface's own text, not inferred from a mark's position. */
  await expect(
    figure.locator('svg text').filter({ hasText: SCREEN_COPY.zeroReference }).first(),
  ).toBeVisible();

  /* GAP, reported rather than asserted: no shaded idle window is drawn. The records state the number of
     idle days and not the span they fall in, so a band here would be a measure rule P-6 forbids this
     application to invent. `investigation-screen.tsx` carries the same finding as its open item. */

  /* Every promised date is marked, and each marker carries the order it belongs to. */
  const orders = await readAffectedOrders(page);
  expect(orders.length).toBeGreaterThan(0);

  for (const order of orders) {
    await expect(figure.locator('svg text').filter({ hasText: order.orderId }).first()).toBeVisible();
  }

  /* What the chart draws, read from the marks' own names, before the table view replaces it. */
  const marks = await readChartMarks(figure);
  expect(marks.length).toBeGreaterThan(0);

  /* The table view: the accessible representation of the same readings. */
  await figure.getByRole('button', { name: SCREEN_COPY.viewAsTable }).click();

  const projection = await readProjection(page);
  expect(projection.days.length).toBeGreaterThan(1);
  expect(projection.series.length).toBeGreaterThanOrEqual(2);

  /* The window: readable dates, in order, with no day repeated. */
  const dates = projection.days.map((day) => day.date);

  for (const date of dates) {
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }

  for (let index = 1; index < dates.length; index += 1) {
    const previous = dates[index - 1] ?? '';
    const current = dates[index] ?? '';

    expect(current > previous).toBe(true);
  }

  /* Never below zero, for every series on every day, and each reading is a number this spec can read. */
  const fromTable: SeriesReading[] = [];

  for (const day of projection.days) {
    const seriesCount = projection.series.length;
    expect(day.readings.filter((reading) => reading !== '').length).toBe(seriesCount);

    for (const [index, series] of projection.series.entries()) {
      const raw = day.readings[index] ?? '';

      expect(raw).not.toBe('');
      expect(readingOf(raw, `${series} on ${day.date}`)).toBeGreaterThanOrEqual(0);
      fromTable.push({ series, date: day.date, raw: collapse(raw) });
    }
  }

  /* The table and the drawing state one set of readings, value for value. */
  expect(fromTable.map(keyOf).sort()).toEqual(marks.map(keyOf).sort());

  /* One date column, two series: the option changes the readings and leaves the window where it was. */
  expect(projection.days.some((day) => new Set(day.readings).size > 1)).toBe(true);

  /* The promise dates the records state fall inside the window the projection covers. */
  const first = dates[0] ?? '';
  const last = dates[dates.length - 1] ?? '';

  for (const order of orders) {
    expect(order.promised >= first && order.promised <= last).toBe(true);
  }
});

/* ---------------------------------------------------------------------------------------------
 * T-05 — the affected orders, and the figures the solver measured for them
 * ------------------------------------------------------------------------------------------- */

/**
 * T-05: the affected orders carry their identifiers, quantities and dates, and the figures are the
 * solver's own.
 *
 * The table's rows are read as records: each states an order, the units and days the baseline leaves
 * late, the promised date and the units at risk. Those readings are then compared with the
 * expected-results table's do-nothing row — located by its levers, not by its identifier — which is the
 * one place rule P-6 allows an expected figure to live; the row's units late are the sum of the orders,
 * its maximum delay the largest of them, and its orders-on-time count the rows that arrive whole. The
 * exception's own evidence is opened to prove the formula and the inputs behind the figure, and the
 * queue's revenue figure for the same exception is then shown to read the same lines, which is what
 * makes one computation reach every screen.
 */
test('T-05 the affected orders and the figures the solver measured for them', async ({ page }) => {
  const exceptionId = await openCaseException(page);

  const card = ordersCard(page);
  await expect(card.getByText(SCREEN_COPY.calculated).first()).toBeVisible();

  const orders = await readAffectedOrders(page);
  expect(orders.length).toBeGreaterThan(0);

  for (const order of orders) {
    expect(order.orderId.length).toBeGreaterThan(0);
    expect(order.promised).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(order.unitsLate).toBeGreaterThanOrEqual(0);
    expect(order.daysLate).toBeGreaterThanOrEqual(0);
    expect(order.unitsAtRisk).toBeDefined();
  }

  /* The baseline row of the expected-results table, found by the levers it sets rather than by its id. */
  const baseline = EXPECTED_SOLVER_ROWS.find(
    (row) => row.levers.airSets === 0 && row.levers.transferSets === 0,
  );

  expect(baseline).toBeDefined();

  if (baseline === undefined) {
    throw new Error('The expected-results fixture holds no do-nothing row to compare the screen with.');
  }

  /* The only arithmetic in this file: it holds the screen against the fixture's own row. */
  const unitsLate = orders.reduce((total, order) => total + order.unitsLate, 0);
  const daysLate = orders.map((order) => order.daysLate);

  expect(unitsLate).toBe(baseline.unitsLate);
  expect(Math.max(...daysLate)).toBe(baseline.maxDaysLate);
  expect(orders.filter((order) => order.daysLate === 0).length).toBe(baseline.ordersOnTime);

  /* The evidence behind the exception's figures names the rule that values them and the lines it reads. */
  const daysFigure = page
    .getByRole('region', { name: SCREEN_COPY.daysToImpact })
    .getByRole('button', { name: SCREEN_COPY.openEvidenceSuffix });

  await daysFigure.focus();
  await daysFigure.press('Enter');

  const drawer = evidenceDrawer(page);
  await expect(drawer.getByText(SCREEN_COPY.formulaLabel, { exact: true })).toBeVisible();

  const formulaText = await textOf(drawer.getByRole('region', { name: SCREEN_COPY.valueSection }));
  expect(formulaText.toLowerCase()).toContain(SCREEN_COPY.queueRevenueColumn.toLowerCase());


  const inputs = await textOf(drawer.getByRole('region', { name: SCREEN_COPY.linksSection }));
  expect(inputs).toContain(SCREEN_COPY.inputsLabel);

  for (const order of orders) {
    expect(inputs).toContain(`${order.orderId}:`);
    expect(inputs).toContain(`due ${order.promised}`);

    if (order.unitsAtRisk !== undefined) {
      expect(inputs).toContain(`${order.orderId}: ${order.unitsAtRisk} units`);
    }
  }

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();

  /* The queue's own revenue figure for this exception, and the evidence behind it. */
  await page.getByRole('link', { name: SCREEN_COPY.navQueue, exact: true }).click();

  const table = queueTable(page);
  await expect(table).toBeVisible();

  const revenueColumn = columnOf(
    (await table.locator('thead th').allTextContents()).map(collapse),
    SCREEN_COPY.queueRevenueColumn,
  );
  const row = bodyRowsOf(table).filter({ hasText: exceptionId });

  await expect(row).toHaveCount(1);

  const revenueCell = row.locator('td').nth(revenueColumn);
  const revenueText = await textOf(revenueCell);

  expect(revenueText).toContain(SCREEN_COPY.currencyCode);
  expect(revenueText).toMatch(/\d/);

  await revenueCell.getByRole('button', { name: SCREEN_COPY.openEvidenceSuffix }).click();
  await expect(drawer.getByText(SCREEN_COPY.formulaLabel, { exact: true })).toBeVisible();

  const queueValue = await textOf(drawer.getByRole('region', { name: SCREEN_COPY.valueSection }));
  expect(queueValue.toLowerCase()).toContain(SCREEN_COPY.queueRevenueColumn.toLowerCase());

  const queueInputs = await textOf(drawer.getByRole('region', { name: SCREEN_COPY.linksSection }));

  for (const order of orders) {
    expect(queueInputs).toContain(`${order.orderId}:`);

    if (order.unitsAtRisk !== undefined) {
      expect(queueInputs).toContain(`${order.orderId}: ${order.unitsAtRisk} units`);
    }
  }
});

/* ---------------------------------------------------------------------------------------------
 * T-06 — the inputs the assessment lacks, the confidence behind it, its activity and its actions
 * ------------------------------------------------------------------------------------------- */

/**
 * T-06: the missing inputs and the confidence, the activity recorded against the exception, and the
 * four controls.
 *
 * The confidence region states the level the record carries and the sentence that explains it, then
 * either the inputs the assessment could not read or the documented rendering for an assessment that
 * read everything; the activity lists the trail's entries in the order the chain holds them; and each
 * control either acts — the note is recorded and the form closes, "Compare options" moves to the
 * comparison for this exception — or is disabled with the sentence it gives, read from its accessible
 * description rather than forced (rule P-8).
 */
test('T-06 the missing inputs, the confidence, the activity and the actions', async ({ page }) => {
  const exceptionId = await openCaseException(page);

  const confidence = confidenceRegion(page);
  await expect(confidence).toBeVisible();
  await expect(confidence.getByText(SCREEN_COPY.confidenceLevel).first()).toBeVisible();

  const reason = await textOf(confidence.locator('p').first());
  expect(reason.length).toBeGreaterThan(0);
  expect(reason).not.toBe(SCREEN_COPY.missingInputsLabel);

  await expect(confidence.getByText(SCREEN_COPY.missingInputsLabel, { exact: true })).toBeVisible();

  const missing = confidence.locator('li');
  const missingCount = await missing.count();

  if (missingCount > 0) {
    for (let index = 0; index < missingCount; index += 1) {
      expect((await textOf(missing.nth(index))).length).toBeGreaterThan(0);
    }
  } else {
    /* The documented rendering for an assessment that could read every input, stated rather than left
       blank: the region's last sentence says so and it is not empty. */
    expect((await textOf(confidence.locator('p').last())).length).toBeGreaterThan(0);
  }

  /* The activity, in the chain's own order: the timestamps never run backwards. */
  const activity = activityRegion(page);
  await expect(activity).toBeVisible();

  const entries = activity.locator('li');
  const entryCount = await entries.count();
  expect(entryCount).toBeGreaterThan(0);

  let previous = '';

  for (let index = 0; index < entryCount; index += 1) {
    const stamp = await textOf(entries.nth(index).getByText(/^\d{4}-\d{2}-\d{2}T/).first());

    expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(stamp >= previous).toBe(true);
    previous = stamp;
  }

  /* "Add note" opens the form, whose record control explains why it cannot act until the note is typed. */
  await page.getByRole('button', { name: SCREEN_COPY.addNote }).click();

  const noteCard = page.getByRole('region', { name: SCREEN_COPY.noteCard });
  await expect(noteCard).toBeVisible();

  const field = noteCard.getByLabel(SCREEN_COPY.noteField);
  await expect(field).toBeVisible();

  const record = noteCard.getByRole('button', { name: SCREEN_COPY.recordNote });
  await expect(record).toBeDisabled();
  await expect(record).toHaveAccessibleDescription(SCREEN_COPY.noteReason);

  await field.fill('Read from the browser suite while checking the investigation screen.');
  await expect(record).toBeEnabled();
  await record.click();

  /* The write is recorded: the form closes once the service answers. */
  await expect(noteCard).toBeHidden();

  /* "Assign to me" either acts or states why it cannot, and a disabled control always states a reason. */
  const assign = page.getByRole('button', { name: SCREEN_COPY.assignToMe });
  await expect(assign).toBeAttached();

  if (await assign.isDisabled()) {
    await expect(assign).toHaveAccessibleDescription(SCREEN_COPY.assignReason);
  } else {
    await expect(assign).toBeEnabled();
  }

  /* The primary action reaches the comparison for this exception, which is where the screen leads. */
  await page.getByRole('button', { name: SCREEN_COPY.compareOptions }).click();
  await expect(page).toHaveURL(new RegExp(`/exceptions/${exceptionId}/scenarios$`));
});

