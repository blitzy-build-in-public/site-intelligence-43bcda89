/**
 * T-04, the scenario comparison: one browser journey over SCR-04 at the route
 * `/exceptions/:exceptionId/scenarios`.
 *
 * Fixing inputs: AAP §0.7's acceptance row for T-04 ("S1, browser journey: SCN-1184's four rows are
 * solver output; the seeded scenarios of other exceptions carry `Simulated data` individually"),
 * AAP §0.12.4's SCR-04 row (one column per option; rows for units late, maximum days late, orders on
 * time, added cost, line idle days, confidence, constraint check and side effects; the "Recommended"
 * badge with the stated rule and trade-off; rejected options with their blocking constraint;
 * units-late-by-order grouped bars; the write-back preview; the sandbox; "Request approval for
 * selected plan"; the empty-state sentence; the disabled "Edit solver constraints" tooltip; the CSV
 * export), AAP §0.10 on the seeded sets' own provenance, and AAP §0.8 on an option that cannot be
 * measured ("Cannot compute" with its reason and no recommendation).
 *
 * WHERE EVERY EXPECTED NUMBER COMES FROM — rule P-6. The only figures this file compares against are
 * the rows of `tests/fixtures/solver-expected-results.ts`, which AAP §0.8 fixes as the expected
 * results' one home. No amount, count, percentage or record identifier is typed here as an
 * expectation: the scenario identifiers, their levers and all five measures are read from the
 * fixture, ad-hoc sandbox arithmetic is never performed, and every other figure on screen is compared
 * with another figure the same screen rendered. The literals below are the specification's fixed
 * strings (§5.3's labels, `Cannot compute`, `Recommended`, the empty-state sentence, the disabled
 * action's reason) plus the labels, captions and route paths the screens themselves publish — the
 * wording a test must state in order to fail when the interface paraphrases it. The three exception
 * identifiers name which record to open; they are inputs to the visible interface, never expected
 * values.
 *
 * WHAT IS DRIVEN — rule B-3, the task's "visible interface only". Each test loads the application
 * once, switches persona through the role switcher, reaches the queue through the navigation, opens
 * the exception from its row action and activates "Compare options". Every assertion is addressed by
 * role and accessible name, and the chart is read through its "View as table" view rather than
 * through drawn geometry. Nothing waits on a fixed duration: the mock adapter injects 150–400 ms per
 * call, so every settle is a web-first assertion.
 *
 * SCOPE. This file owns T-04 and the SCR-04 behaviours the task assigns it. It does not assert an
 * approval decision (T-07 to T-09 own that, and the primary-action test stops at the approval the
 * request opens) and it does not assert the seven screen states (T-17 owns those). No page object, no
 * fixture module and no configuration file is added: the only shared code is `./helpers/role`.
 */

import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { EXPECTED_SOLVER_ROWS } from '../tests/fixtures/solver-expected-results';
import type { ExpectedSolverRow } from '../tests/fixtures/solver-expected-results';
import { switchRole } from './helpers/role';

/* ---------------------------------------------------------------------------------------------
 * The fixed strings, each with the input that fixes it
 * ------------------------------------------------------------------------------------------- */

/** §5.3's label for a figure the dataset shipped rather than one computed in this session. */
const SIMULATED_DATA_LABEL = 'Simulated data';

/** §5.3's label for a computed figure, carried by every column the solver measured. */
const SIMULATED_CALCULATION_LABEL = 'Simulated calculation';

/** §5.3's label for the recommendation block and for the column the rule picked. */
const SIMULATED_RECOMMENDATION_LABEL = 'Simulated recommendation';

/** §5.3's label every write-back step carries. */
const SIMULATED_WRITE_BACK_LABEL = 'Simulated write-back';

/** AAP §0.8's wording for an option whose constraint check failed, in place of any figure. */
const CANNOT_COMPUTE_LABEL = 'Cannot compute';

/** The recommended option's badge word, fixed by AAP §0.12.4's SCR-04 row. */
const RECOMMENDED_LABEL = 'Recommended';

/** AAP §0.12.4's empty-state sentence, fixed character for character. */
const EMPTY_OPTIONS_SENTENCE =
  'No options yet. Option generation for this exception type arrives with the optimisation service in the pilot.';

/** AAP §0.12.4's disabled-control sentence, fixed character for character. */
const CUSTOM_CONSTRAINTS_REASON =
  'Custom constraints arrive with the optimisation service in the pilot';

/** The comparison matrix's `<caption>`, which `COMPARISON_MATRIX_TEXT` owns. */
const MATRIX_CAPTION = 'Response options and the measures they are compared on';

/** The five measure rows this file compares with the fixture, in the order the matrix states them. */
const MEASURE_LABELS = [
  'Units late',
  'Maximum days late',
  'Orders on time',
  'Added cost',
  'Line idle days',
] as const;

/** The matrix row that reports an option's constraint state, and the reasons it states. */
const CONSTRAINT_ROW_LABEL = 'Constraint check';

/** The screen's level-one heading, which `SCENARIO_COMPARISON_TITLE` owns. */
const COMPARISON_TITLE = 'Scenario comparison';

/** The primary action's label, fixed by AAP §0.12.4's SCR-04 row. */
const REQUEST_APPROVAL_LABEL = 'Request approval for selected plan';

/** The secondary action's label, fixed by AAP §0.12.4's SCR-04 row. */
const EXPORT_COMPARISON_LABEL = 'Export the comparison as CSV';

/** The disabled action whose reason AAP §0.12.4 fixes. */
const EDIT_CONSTRAINTS_LABEL = 'Edit solver constraints';

/** The write-back preview's card heading, in the screen's own words for that block. */
const WRITE_BACK_HEADING = 'Write-back preview';

/** The heading of the list carrying the options the set held back. */
const SET_ASIDE_HEADING = 'Set aside';

/** The chart frame's title for the units-late-by-order surface. */
const CHART_TITLE = 'Units late by order';

/** The chart's table-view caption, which is that table's accessible name. */
const CHART_TABLE_CAPTION = 'Units late per customer order, one column per option';

/** The sandbox panel's caption, which is the region's accessible name. */
const SANDBOX_REGION = 'Recompute an option';

/** The sandbox's recompute control. */
const RECOMPUTE_LABEL = 'Recompute measures';

/** The investigation screen's action that opens the comparison. */
const COMPARE_OPTIONS_LABEL = 'Compare options';

/** The navigation entry that opens the exception queue. */
const NAV_QUEUE_LABEL = 'Exceptions';

/** The queue's per-row action, whose accessible name is that label plus the row's identifier. */
const ROW_OPEN_LABEL = 'Open';

/** The persona whose plant scope reaches every exception and who may request an approval. */
const PERSONA = 'USR-03';

/** The exception carrying the measured solver case, the one T-04 is about. */
const MEASURED_EXCEPTION = 'EXC-2026-1184';

/** An exception whose options ship with the dataset, so its columns carry their own provenance. */
const SEEDED_EXCEPTION = 'EXC-2026-1185';

/** An exception with neither a seeded option set nor a solver case: the empty comparison. */
const UNMODELLED_EXCEPTION = 'EXC-2026-1186';

/* ---------------------------------------------------------------------------------------------
 * Reading a rendered figure, without ever typing one
 * ------------------------------------------------------------------------------------------- */

/**
 * The count a cell or a definition renders, read from the leading numeric run of its text.
 *
 * A count is written by the component as the record's own number (`1220`, `10`, `0.75`), and the
 * cell also carries the evidence trigger's hidden completion, so only the leading run is the value.
 * Nothing is rounded or reinterpreted here: the digits are parsed exactly as the record states them.
 */
function countOf(text: string): number {
  const match = /^[\s\u00a0]*(-?\d+(?:\.\d+)?)/.exec(text);

  if (match === null || match[1] === undefined) {
    throw new Error(`No count is rendered in ${JSON.stringify(text)}.`);
  }

  return Number(match[1]);
}

/**
 * The amount a cell renders, read from the same leading numeric run in the `de-DE` shape `MonoValue`
 * emits: a full stop as the thousands separator, a comma before the decimals, the currency code last.
 *
 * The code itself is never read, because the code is a constant of the formatter rather than a value.
 */
function moneyOf(text: string): number {
  const match = /^[\s\u00a0]*(\d[\d.]*(?:,\d+)?)/.exec(text);

  if (match === null || match[1] === undefined) {
    throw new Error(`No amount is rendered in ${JSON.stringify(text)}.`);
  }

  const digits = match[1].split('.').join('').replace(',', '.');

  return Number(digits);
}

/**
 * Every numeric run in a sentence, normalised to its digits, so two renderings of one figure can be
 * matched without assuming which separator or grouping a surface chose.
 */
function figuresIn(text: string): readonly string[] {
  return (text.match(/\d[\d.,]*/g) ?? []).map((figure) =>
    figure.split('.').join('').replace(',', '.'),
  );
}

/* ---------------------------------------------------------------------------------------------
 * The fixture, as the comparison's oracle — AAP §0.8, rule P-6
 * ------------------------------------------------------------------------------------------- */

/** One measure this file compares: its row label, the fixture member it must equal, and how it is read. */
interface MeasureExpectation {
  /** The matrix's own row header, which is also the sandbox's measure name. */
  readonly label: string;
  /** The row of the expected-results table the rendered cell must equal. */
  readonly expected: (row: ExpectedSolverRow) => number;
  /** How the rendered cell is turned back into the number it states. */
  readonly parse: (text: string) => number;
}

/** The five compared measures, each reading the fixture member and the parser that measure needs. */
const MEASURE_EXPECTATIONS: readonly MeasureExpectation[] = [
  { label: MEASURE_LABELS[0], expected: (row) => row.unitsLate, parse: countOf },
  { label: MEASURE_LABELS[1], expected: (row) => row.maxDaysLate, parse: countOf },
  { label: MEASURE_LABELS[2], expected: (row) => row.ordersOnTime, parse: countOf },
  { label: MEASURE_LABELS[3], expected: (row) => row.addedCostEur, parse: moneyOf },
  { label: MEASURE_LABELS[4], expected: (row) => row.lineIdleDays, parse: countOf },
];

/**
 * The option the recommendation rule picks, applied to the fixture's own rows.
 *
 * AAP §0.8 fixes the rule — fewest units late, then lowest added cost, among the options whose
 * constraint check passes — and applying it here rather than restating its outcome is what makes the
 * badge assertion a comparison between the interface and the expected results instead of a second
 * copy of the seeded answer.
 */
function recommendedRowOf(rows: readonly ExpectedSolverRow[]): ExpectedSolverRow {
  let best: ExpectedSolverRow | undefined;

  for (const row of rows) {
    if (row.constraintCheck !== 'pass') {
      continue;
    }

    if (best === undefined) {
      best = row;
      continue;
    }

    const fewerUnitsLate = row.unitsLate < best.unitsLate;
    const sameUnitsLate = row.unitsLate === best.unitsLate;

    if (fewerUnitsLate || (sameUnitsLate && row.addedCostEur < best.addedCostEur)) {
      best = row;
    }
  }

  if (best === undefined) {
    throw new Error('None of the fixture rows passes its constraint check, so no option could be recommended.');
  }

  return best;
}

/* ---------------------------------------------------------------------------------------------
 * The journey into the comparison — the visible interface only, rule B-3
 * ------------------------------------------------------------------------------------------- */

/** Loads the application at its entry point and switches to the persona that reaches every record. */
async function enterApplication(page: Page): Promise<void> {
  await page.goto('/');
  await switchRole(page, PERSONA);
}

/**
 * The reachable name of one queue row's open action.
 *
 * The visible word and the row's identifier are two children of the button, so the accessible name
 * joins them with a space and the identifier's own colon follows it; the pattern states that join
 * without asserting which side of the colon the space fell on.
 */
function rowActionNameFor(exceptionId: string): RegExp {
  return new RegExp(`^${ROW_OPEN_LABEL}\\s*:\\s*${exceptionId}$`);
}

/** Reaches one exception's investigation through the navigation and the queue's own row action. */
async function openException(page: Page, exceptionId: string): Promise<void> {
  await page.getByRole('link', { name: NAV_QUEUE_LABEL, exact: true }).click();
  await page.getByRole('button', { name: rowActionNameFor(exceptionId) }).click();
  await expect(page.getByRole('button', { name: COMPARE_OPTIONS_LABEL, exact: true })).toBeVisible();
}

/** Opens one exception's comparison and returns the matrix it renders. */
async function openComparison(page: Page, exceptionId: string): Promise<Locator> {
  await openException(page, exceptionId);
  await page.getByRole('button', { name: COMPARE_OPTIONS_LABEL, exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: COMPARISON_TITLE, exact: true }),
  ).toBeVisible();

  return page.getByRole('table', { name: MATRIX_CAPTION, exact: true });
}

/** The comparison matrix on the screen the browser is showing. */
function matrixOf(page: Page): Locator {
  return page.getByRole('table', { name: MATRIX_CAPTION, exact: true });
}

/* ---------------------------------------------------------------------------------------------
 * Reading the comparison matrix
 * ------------------------------------------------------------------------------------------- */

/** One rendered option column: its position among the measure cells, its header, and its fixture row. */
interface ComparisonColumn {
  /** The cell index the column occupies in every measure row, the row header taking none. */
  readonly index: number;
  /** The column header cell, which carries the option's name, identifier and labels. */
  readonly header: Locator;
  /** The fixture row the column's identifier names. */
  readonly row: ExpectedSolverRow;
}

/**
 * Binds every rendered column to the fixture row its identifier names, in the order the set lists
 * them.
 *
 * The fixture is the authority in both directions: a column whose header names no fixture row is
 * reported rather than skipped, because an unaccounted column is an option whose figures this test
 * cannot check.
 */
async function columnsOf(matrix: Locator): Promise<readonly ComparisonColumn[]> {
  const headers = matrix.getByRole('columnheader');

  /* The comparison is read through the service, so the matrix arrives after the screen's loading
     state. Waiting for the first header to be painted is what makes the count that follows a count of
     the rendered options rather than of a table that has not been read yet. */
  await expect(headers.first()).toBeVisible();

  const total = await headers.count();
  const columns: ComparisonColumn[] = [];

  /* The first header cell is the corner naming the row axis, so the options begin at the second. */
  for (let position = 1; position < total; position += 1) {
    const header = headers.nth(position);
    const text = (await header.textContent()) ?? '';
    const row = EXPECTED_SOLVER_ROWS.find((candidate) => text.includes(candidate.id));

    if (row === undefined) {
      throw new Error(
        `The comparison names an option that none of the fixture's rows accounts for: ${JSON.stringify(text)}.`,
      );
    }

    columns.push({ index: position - 1, header, row });
  }

  return columns;
}

/** The matrix row a measure label names, matched on its own row header. */
function measureRowOf(page: Page, label: string): Locator {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: label, exact: true }) });
}

/** The text one measure cell renders for a column. */
async function cellTextOf(page: Page, column: ComparisonColumn, label: string): Promise<string> {
  return (await measureRowOf(page, label).getByRole('cell').nth(column.index).textContent()) ?? '';
}

/** The column whose option the fixture's rows imply the recommendation rule picks. */
function recommendedColumnOf(
  columns: readonly ComparisonColumn[],
): ComparisonColumn & { readonly row: ExpectedSolverRow } {
  const recommended = recommendedRowOf(columns.map((column) => column.row));
  const column = columns.find((candidate) => candidate.row.id === recommended.id);

  if (column === undefined) {
    throw new Error(
      `The recommendation rule picks ${recommended.id}, and the comparison renders no column for it.`,
    );
  }

  return { ...column, row: recommended };
}

/* ---------------------------------------------------------------------------------------------
 * Asserting a control that cannot act — rule P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * Asserts a control is disabled and that its reason is the explanation the interface shows.
 *
 * The control refuses activation through `aria-disabled` so the reason stays reachable by keyboard,
 * which is why the absence of the `disabled` attribute is not a contradiction: the hint is painted on
 * hover and on focus and mounted as the control's description at all times. Both halves are asserted
 * — the state, and the sentence a reader receives — because rule P-8 requires the explanation, not
 * only the state.
 */
async function expectDisabledWithReason(
  page: Page,
  name: string,
  reason: string,
): Promise<void> {
  const control = page.getByRole('button', { name, exact: true });

  await expect(control).toHaveAttribute('aria-disabled', 'true');
  await control.hover();
  await expect(page.getByRole('tooltip')).toHaveText(reason);
}


/**
 * The constraint messages one option's constraint-check cell states, exactly as the record supplies
 * them.
 *
 * They are the reason that option cannot be measured, and the same messages are what the set-aside
 * list and the sandbox must state, so this reading is the one copy every other surface is compared
 * with — no sentence is composed here.
 */
async function constraintReasonsOf(
  page: Page,
  column: ComparisonColumn,
): Promise<readonly string[]> {
  return measureRowOf(page, CONSTRAINT_ROW_LABEL)
    .getByRole('cell')
    .nth(column.index)
    .locator('li')
    .allTextContents();
}

/**
 * One measure the sandbox rendered for the option it measured.
 *
 * The sandbox's measure list pairs each measure's name with its value and the §5.3 label of a computed
 * figure, so the label is removed from the value's text and the remainder is the record's own number.
 */
async function sandboxMeasureOf(
  sandbox: Locator,
  label: string,
  parse: (text: string) => number,
): Promise<number> {
  /* The measure's own name is the anchor, and the row is read through the definition list the panel
     renders: the name and the value sit in the same `dt`/`dd` pair, so waiting for the name to be
     stated is what keeps the reading on the measurement that has just settled rather than on the one
     the panel showed before it. */
  const row = sandbox.locator('dl > div').filter({ hasText: label });

  await expect(row.locator('dt')).toHaveText(label);

  const text = ((await row.locator('dd').textContent()) ?? '')
    .split(SIMULATED_CALCULATION_LABEL)
    .join('')
    .trim();

  return parse(text);
}

/* ---------------------------------------------------------------------------------------------
 * T-04 — the comparison's columns are the solver's own output
 * ------------------------------------------------------------------------------------------- */

test('T-04 the four measured options are the solver output, and a seeded option carries its own label', async ({
  page,
}) => {
  await enterApplication(page);

  const matrix = await openComparison(page, MEASURED_EXCEPTION);
  const columns = await columnsOf(matrix);

  /* AAP §0.7's T-04 row fixes one column per option, and the measured case carries four. */
  expect(columns.length).toBe(4);

  /* THE RECOMMENDATION. The rule AAP §0.8 fixes is applied to the fixture's own rows, so the badge is
     asserted against the expected results rather than against a remembered answer, and it is published
     structurally by `aria-current` as well as by the §5.3 label. */
  const recommended = recommendedColumnOf(columns);

  await expect(recommended.header).toHaveAttribute('aria-current', 'true');
  await expect(
    recommended.header.getByText(SIMULATED_RECOMMENDATION_LABEL, { exact: true }),
  ).toBeVisible();

  for (const column of columns) {
    if (column.row.id === recommended.row.id) {
      continue;
    }

    await expect(column.header).not.toHaveAttribute('aria-current', 'true');
    await expect(
      column.header.getByText(SIMULATED_RECOMMENDATION_LABEL, { exact: true }),
    ).toHaveCount(0);
  }

  /* EVERY MEASURE OF EVERY OPTION, row by row against the fixture. The five rows the task names are
     compared for all four options, so a single crossed, stale or re-derived cell fails the test rather
     than one sampled row carrying it. An option whose constraint check failed states `Cannot compute`
     in place of each figure — AAP §0.8's behaviour, which the fixture's own `constraintCheck` records
     — so that column is checked for the refusal rather than for its neutral numbers. */
  for (const measure of MEASURE_EXPECTATIONS) {
    await expect(measureRowOf(page, measure.label)).toHaveCount(1);
  }

  for (const column of columns) {
    for (const measure of MEASURE_EXPECTATIONS) {
      const text = await cellTextOf(page, column, measure.label);

      if (column.row.constraintCheck === 'fail') {
        expect(text, `${measure.label} of ${column.row.id}`).toContain(CANNOT_COMPUTE_LABEL);
        continue;
      }

      expect(measure.parse(text), `${measure.label} of ${column.row.id}`).toBe(
        measure.expected(column.row),
      );
    }
  }

  /* THE LABELS. The matrix labels each column from that option's own origin (rule P-1), which is what
     makes the requirement true for every numeric row of the column: a column of solver output says
     `Simulated calculation` and never the dataset's label. */
  for (const column of columns) {
    await expect(column.header).toContainText(SIMULATED_CALCULATION_LABEL);
    await expect(column.header).not.toContainText(SIMULATED_DATA_LABEL);
  }

  /* THE RECOMMENDATION'S TWO SENTENCES. The rule that picked the option and the trade-off it makes are
     the service's own text, so they are asserted to be present and non-empty, and the figures the
     trade-off states are matched against the figures the same matrix renders — never typed here. The
     protected revenue the sentence ends with is not a measure of the matrix, so the assertion is that
     the sentence's figures are the table's, not that every one of them is on the table. */
  const recommendationCard = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: RECOMMENDED_LABEL, exact: true }) });

  await expect(recommendationCard).toBeVisible();
  await expect(recommendationCard).toContainText(recommended.row.id);
  await expect(
    recommendationCard.getByText(SIMULATED_RECOMMENDATION_LABEL, { exact: true }),
  ).toBeVisible();

  const sentences = await recommendationCard.locator('p').allTextContents();
  expect(sentences.length).toBeGreaterThanOrEqual(3);

  const ruleText = (sentences[1] ?? '').trim();
  const tradeOffText = (sentences[2] ?? '').trim();

  expect(ruleText).not.toBe('');
  expect(tradeOffText).not.toBe('');

  const matrixFigures = new Set(figuresIn((await matrix.textContent()) ?? ''));
  const sharedFigures = figuresIn(tradeOffText).filter((figure) => matrixFigures.has(figure));

  expect(sharedFigures.length).toBeGreaterThanOrEqual(2);

  /* EVERY FIGURE OPENS ITS EVIDENCE. One cycle per measure row of the recommended column, through the
     figure's own trigger and the drawer it opens, so a row that lost its trigger fails here. */
  for (const label of MEASURE_LABELS) {
    const cell = measureRowOf(page, label).getByRole('cell').nth(recommended.index);

    await cell.getByRole('button').click();

    const drawer = page.getByRole('dialog', { name: 'Evidence', exact: true });

    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(drawer).toHaveCount(0);
  }

  /* THE SAME ORDERS, READ AS A TABLE (success criterion 9, rule B-3). The chart's axis is the customer
     order while the matrix's row is the option's total over those orders, so each column's per-order
     cells must sum to the total the matrix renders — a figure compared with another figure the screen
     produced, and the reason a stale or crossed series cannot pass. */
  await page.getByRole('button', { name: `View as table: ${CHART_TITLE}`, exact: true }).click();

  const chartTable = page.getByRole('table', { name: CHART_TABLE_CAPTION, exact: true });

  await expect(chartTable).toBeVisible();
  await expect(chartTable.getByRole('columnheader')).toHaveCount(columns.length + 1);

  const orderRows = chartTable.locator('tbody tr');
  const orderCount = await orderRows.count();

  expect(orderCount).toBeGreaterThan(0);

  for (const column of columns) {
    let sum = 0;
    let refusals = 0;

    for (let rowIndex = 0; rowIndex < orderCount; rowIndex += 1) {
      const text =
        (await orderRows.nth(rowIndex).getByRole('cell').nth(column.index + 1).textContent()) ?? '';

      if (text.includes(CANNOT_COMPUTE_LABEL)) {
        refusals += 1;
        continue;
      }

      sum += countOf(text);
    }

    if (column.row.constraintCheck === 'fail') {
      expect(refusals, `the chart's refused series for ${column.row.id}`).toBe(orderCount);
      continue;
    }

    expect(sum, `the units late by order for ${column.row.id}`).toBe(
      countOf(await cellTextOf(page, column, MEASURE_LABELS[0])),
    );
  }

  await expect(
    page.getByRole('button', { name: `View as chart: ${CHART_TITLE}`, exact: true }),
  ).toBeVisible();

  /* THE SEEDED SET'S OWN PROVENANCE — AAP §0.10. One exception's options ship with the dataset, and
     each of its columns says so on itself; the computed columns above say the opposite, which is what
     lets a reader tell a figure computed in this session from one the dataset supplied. */
  const seededMatrix = await openComparison(page, SEEDED_EXCEPTION);
  const seededHeaders = seededMatrix.getByRole('columnheader');

  await expect(seededHeaders.first()).toBeVisible();

  const seededTotal = await seededHeaders.count();

  expect(seededTotal).toBeGreaterThan(1);

  let seededRecommendations = 0;

  for (let position = 1; position < seededTotal; position += 1) {
    const header = seededHeaders.nth(position);

    await expect(header).toContainText(SIMULATED_DATA_LABEL);
    await expect(header).not.toContainText(SIMULATED_CALCULATION_LABEL);

    if ((await header.getAttribute('aria-current')) === 'true') {
      seededRecommendations += 1;
      await expect(header).toContainText(SIMULATED_RECOMMENDATION_LABEL);
    }
  }

  expect(seededRecommendations).toBe(1);
});

/* ---------------------------------------------------------------------------------------------
 * The options set aside
 * ------------------------------------------------------------------------------------------- */

test('an option set aside states the constraint that blocks it and is never the recommended one', async ({
  page,
}) => {
  await enterApplication(page);

  const matrix = await openComparison(page, MEASURED_EXCEPTION);
  const columns = await columnsOf(matrix);
  const recommended = recommendedColumnOf(columns);
  const rejectedColumns = columns.filter((column) => column.row.constraintCheck === 'fail');

  expect(rejectedColumns.length).toBeGreaterThan(0);

  await expect(page.getByText(SET_ASIDE_HEADING, { exact: true })).toBeVisible();

  for (const column of rejectedColumns) {
    /* The record a set-aside entry names, matched on its own identifier, so the entry and its column
       are the same option rather than two paraphrases of one. */
    const entry = page.locator('li').filter({ hasText: column.row.id });

    await expect(entry).toHaveCount(1);

    /* The blocking constraint the entry states is the reason the column's own constraint-check cell
       gives: both are the record's messages, so the two renderings are compared with each other rather
       than with a sentence written here. */
    const reasons = await constraintReasonsOf(page, column);

    expect(reasons.length).toBeGreaterThan(0);

    for (const reason of reasons) {
      await expect(entry).toContainText(reason);
    }

    await expect(column.header).not.toHaveAttribute('aria-current', 'true');
    expect(column.row.id).not.toBe(recommended.row.id);
  }
});

/* ---------------------------------------------------------------------------------------------
 * The sandbox — every measure recomputed at once, and a breach refused
 * ------------------------------------------------------------------------------------------- */

test('the sandbox recomputes every measure at once and refuses a position that breaches a bound', async ({
  page,
}) => {
  await enterApplication(page);

  const matrix = await openComparison(page, MEASURED_EXCEPTION);
  const columns = await columnsOf(matrix);
  const selected = recommendedColumnOf(columns);

  /* The position the sandbox is driven to: a passing fixture row at levers the screen does not start
     from, so each of its five measures differs from the option already on screen and a cell left
     behind by the previous measurement fails the comparison. The refused position is the fixture's own
     breaching row, so no bound is invented here either. */
  const target = EXPECTED_SOLVER_ROWS.find(
    (row) =>
      row.constraintCheck === 'pass' &&
      (row.levers.airSets !== selected.row.levers.airSets ||
        row.levers.transferSets !== selected.row.levers.transferSets),
  );
  const breached = EXPECTED_SOLVER_ROWS.find((row) => row.constraintCheck === 'fail');

  if (target === undefined || breached === undefined) {
    throw new Error(
      'The fixture states no passing option at another lever position, or no breaching one, so the sandbox cannot be driven from it.',
    );
  }

  expect(target.id).not.toBe(selected.row.id);

  const sandbox = page.getByRole('region', { name: SANDBOX_REGION, exact: true });

  await expect(sandbox).toBeVisible();

  /* ONE CHANGE OF POSITION, EVERY MEASURE AT ONCE. The two fields carry no bound of their own — the
     solver holds the bounds and reports each breach as a message — so the position is read from the
     fixture row rather than from a range the control does not publish. */
  await sandbox.getByLabel('airSets', { exact: true }).fill(String(target.levers.airSets));
  await sandbox.getByLabel('transferSets', { exact: true }).fill(String(target.levers.transferSets));
  await sandbox.getByRole('button', { name: RECOMPUTE_LABEL, exact: true }).click();

  for (const measure of MEASURE_EXPECTATIONS) {
    expect(
      await sandboxMeasureOf(sandbox, measure.label, measure.parse),
      `${measure.label} of the recomputed option`,
    ).toBe(measure.expected(target));
  }

  /* THE BREACH. The reasons the sandbox must state are the ones the same position produces in the
     matrix's own refused column, so the refusal is compared with a rendering of the same record
     rather than with a remembered sentence. */
  const breachingColumn = columns.find((column) => column.row.constraintCheck === 'fail');
  const breachingReasons =
    breachingColumn === undefined ? [] : await constraintReasonsOf(page, breachingColumn);

  expect(breachingReasons.length).toBeGreaterThan(0);

  await sandbox.getByLabel('airSets', { exact: true }).fill(String(breached.levers.airSets));
  await sandbox
    .getByLabel('transferSets', { exact: true })
    .fill(String(breached.levers.transferSets));
  await sandbox.getByRole('button', { name: RECOMPUTE_LABEL, exact: true }).click();

  await expect(sandbox.getByText(CANNOT_COMPUTE_LABEL, { exact: true })).toBeVisible();

  for (const reason of breachingReasons) {
    await expect(sandbox).toContainText(reason);
  }

  /* Nothing is recommended for a position that cannot be measured, and the set's own recommendation is
     untouched: the sandbox publishes no column into the comparison, so the badge stays where the rule
     put it (AAP §0.8, rule P-6). */
  await expect(sandbox.getByText(SIMULATED_RECOMMENDATION_LABEL, { exact: true })).toHaveCount(0);
  await expect(recommendedColumnOf(await columnsOf(matrix)).header).toHaveAttribute(
    'aria-current',
    'true',
  );

  /* And the control explains why it cannot repeat the measurement (rule P-8). */
  await expectDisabledWithReason(page, RECOMPUTE_LABEL, breachingReasons.join(' '));
});

/* ---------------------------------------------------------------------------------------------
 * The fixed strings, the write-back preview and the download
 * ------------------------------------------------------------------------------------------- */

test('the write-back preview, the constraints control, the empty comparison and the export state their own fixed text', async ({
  page,
}) => {
  await enterApplication(page);

  await openComparison(page, MEASURED_EXCEPTION);

  /* THE WRITE-BACK PREVIEW. Each step of the plan the reader would set in motion carries the §5.3
     label, so a step cannot ship unlabelled. */
  const writeBackCard = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: WRITE_BACK_HEADING, exact: true }) });

  await expect(writeBackCard).toBeVisible();

  const steps = writeBackCard.locator('ol > li');
  const stepCount = await steps.count();

  expect(stepCount).toBeGreaterThan(0);

  for (let index = 0; index < stepCount; index += 1) {
    await expect(steps.nth(index)).toContainText(SIMULATED_WRITE_BACK_LABEL);
  }

  /* THE CONTROL THAT CANNOT ACT, with the sentence AAP §0.12.4 fixes for it. */
  await expectDisabledWithReason(page, EDIT_CONSTRAINTS_LABEL, CUSTOM_CONSTRAINTS_REASON);

  /* THE DOWNLOAD. The file is composed by the service from the same solver output the matrix renders
     and offered from this page's own origin, so what is asserted is that the action produced one under
     a name the payload declared (rule B-1). */
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: EXPORT_COMPARISON_LABEL, exact: true }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.csv$/);

  /* THE EXCEPTION WITH NO OPTION. Its sentence is fixed by AAP §0.12.4, and the primary action that
     cannot put a plan forward carries the same sentence as its reason (rule P-8). */
  await openComparison(page, UNMODELLED_EXCEPTION);

  await expect(page.getByText(EMPTY_OPTIONS_SENTENCE, { exact: true }).first()).toBeVisible();
  await expectDisabledWithReason(page, REQUEST_APPROVAL_LABEL, EMPTY_OPTIONS_SENTENCE);
});

/* ---------------------------------------------------------------------------------------------
 * The primary action
 * ------------------------------------------------------------------------------------------- */

test('the primary action opens the approval flow for the selected plan', async ({ page }) => {
  await enterApplication(page);

  const matrix = await openComparison(page, MEASURED_EXCEPTION);
  const columns = await columnsOf(matrix);
  const recommended = recommendedColumnOf(columns);

  /* The selected option starts as the recommended one, whose constraint check passes, so the action
     can act: a disabled primary here would be a defect, and the empty-state case covers the disabled
     variant. */
  const requestApproval = page.getByRole('button', { name: REQUEST_APPROVAL_LABEL, exact: true });

  await expect(requestApproval).not.toHaveAttribute('aria-disabled', 'true');

  await requestApproval.click();
  await page.waitForURL(/\/approvals\/[^/]+$/);

  /* SCR-05 owns the decision; this asserts only that the request landed on the plan it named. */
  await expect(
    page.getByRole('heading', { level: 1, name: 'Approval', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toContainText(recommended.row.id);
});

