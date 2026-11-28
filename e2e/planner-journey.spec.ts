/**
 * The planner journey: the one end-to-end path the demonstration exists to show, driven through the
 * visible interface from the entry route to the audit record (AAP 0.2.2, AAP 0.7, success criterion 7).
 *
 * WHAT THIS SPEC PROVES. A planner sees a disruption, sees what it touches, compares the response
 * options with their arithmetic, puts one forward for approval, watches the simulated write-back land,
 * and reads the trail of what they did. The journey is asserted against the numbers the solver states
 * — rendered cell by rendered cell against `tests/fixtures/solver-expected-results.ts` — and against
 * the trail listing the very writes the test caused, so the file proves the figures on screen and the
 * records behind them in one pass rather than two independent claims (rule P-6).
 *
 * ONE TEST, SEVEN STEPS. Every step is a `test.step`, which is a Playwright reporting feature and not
 * a second runner, so a failure names the step that broke and the whole journey still runs as one
 * continuous session. The session matters: the in-browser adapter keeps its state in memory and a
 * document load would restore the seed, so the approval created in step five would not exist in step
 * seven. Nothing here reloads the page after the first navigation; every screen is reached by the
 * shell's own navigation or by a control the screen offers, from the entry route outwards.
 *
 * WHERE THE EXPECTED NUMBERS COME FROM. From the fixture module and from nowhere else: the option a
 * column names is matched to the fixture row the solver's own expected results state, and the cell is
 * parsed back to a number and compared with that row's measure. No amount, count, day, instant or
 * record identifier is typed into this file (rule P-6). The one identifier the queue is searched by is
 * derived from `SOLVER_CASE_ID` rather than written, and the expected path of each step is built from
 * the identifier the screen itself displayed.
 *
 * THE JOURNEY CROSSES THREE PERSONAS, AND THAT IS THE PRODUCT'S OWN DESIGN. The head of supply chain
 * holds `approval.request` but POL-003 forbids the persona who requested a plan from deciding it — the
 * adapter's `eligibleApproverRoles` excludes the requester's own role — so the decision belongs to the
 * plant manager, whose scope reaches the disrupted plant and who holds `approval.decide`. The trail
 * then needs `audit.read`, which the planning roles do not hold while the auditor does. Each switch is
 * made through the demonstration role switcher, the visible control a reader has, and the shell
 * navigates to that persona's entry route itself; no lever of this suite's own is added to the build
 * (AAP 0.7, 0.9, 0.12.4).
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It is not a second per-screen suite: the specification's numbered
 * acceptance tests keep their own coverage of filters, saved views, states and keyboard paths, and this file asserts only what the
 * journey itself must observe (AAP 0.7). It reads nothing through the service, seeds no storage, opens
 * no deep link on the happy path, uses no test hook, and names no company, supplier or model of the
 * real world (rule P-7). It carries no acceptance identifier: the journey is named, not numbered, and
 * the specification's `T-nn` identifiers belong to the tests that own them.
 *
 * Rules served:
 * - P-6: every expected figure is the solver's, held once in the fixture and compared cell by cell;
 *   the matrix does not render a revenue-delayed row, so that measure is compared where the app does
 *   render it, on the approval's outcome card.
 * - P-1: the `Simulated data`, `Simulated calculation`, `Simulated recommendation`, `Simulated
 *   write-back` and `Simulated control` labels are asserted where the steps meet them, and the
 *   tracker's fixed tag and the chain's fixed note are asserted character for character.
 * - P-2: the journey creates state through the one typed interface and observes it on five screens,
 *   which is the data boundary holding from the queue to the trail.
 * - P-4: the audit step asserts the chain's note and the absence of the vocabulary of a claim the
 *   demonstration may not make.
 * - P-8: a control on the happy path must act; each is checked to be operable before it is used
 *   rather than clicked through a disabled state.
 * - B-3: every control is located by its role and accessible name, and the journey is operable from
 *   the keyboard because the controls it drives are.
 * - B-1, B-2: no origin, port, address, credential or configuration is named here.
 */
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import {
  EXPECTED_SOLVER_ROWS,
  SOLVER_CASE_ID,
} from '../tests/fixtures/solver-expected-results';
import type { ExpectedSolverRow } from '../tests/fixtures/solver-expected-results';
import { entryRouteForPersona, switchRole } from './helpers/role';

/* ---------------------------------------------------------------------------------------------
 * The fixed strings, held once so a reworded label fails here rather than passing quietly
 * ------------------------------------------------------------------------------------------- */

/**
 * The specification §5.3 labels the journey meets, character for character. They are fixed text, not
 * figures, so they are restated as the assertions that prove them; rule P-1 makes each one a property
 * of the surface that carries it, which is why every one of them is asserted where the step reaches
 * that surface rather than once for the whole application.
 */
const SIMULATED_DATA_LABEL = 'Simulated data';
const SIMULATED_CALCULATION_LABEL = 'Simulated calculation';
const SIMULATED_RECOMMENDATION_LABEL = 'Simulated recommendation';
const SIMULATED_WRITE_BACK_LABEL = 'Simulated write-back';

/**
 * The tag the write-back tracker prints on every step: the §5.3 write-back label followed by the
 * sentence AAP 0.12.4's SCR-05 row fixes for this tracker.
 */
const WRITE_BACK_TAG = 'Simulated write-back. Not demonstrated on a live system.';

/**
 * The note the audit chain carries, and the sentence that denies the claim the application may never
 * make: the chain is a simulated control, not production tamper resistance (rule P-4).
 */
const AUDIT_CHAIN_NOTE =
  'Simulated control: this shows the mechanism, not production tamper resistance.';

/**
 * The recommendation rule the records state for a computed option set, as the seed states it. The
 * service quotes it and this journey asserts the block shows it, so the screen is proved to state the
 * rule it applied rather than only its outcome.
 */
const RECOMMENDATION_RULE =
  'The option with the fewest units late, then the lowest added cost, among those whose constraint check passes.';

/**
 * What an option whose constraint check failed reads as, on the row a failed column still fills: the
 * wording AAP 0.8 fixes for a computation that cannot complete. No `NaN`, no substituted zero and no
 * blank cell reaches the screen in its place.
 */
const CANNOT_COMPUTE_LABEL = 'Cannot compute';

/**
 * The vocabulary of a claim the application may not make (rule P-4), asserted absent from the audit
 * route: the chain shows a mechanism, and nothing on the screen says it prevents, proves or
 * guarantees anything. `tamper resistant` is checked separately from the note's own `tamper
 * resistance`, which is the phrase that *withholds* the claim and therefore must be present.
 */
const FORBIDDEN_CLAIM_WORDS = [
  'tamper-proof',
  'tamper resistant',
  'zero trust',
  'guaranteed',
  'certified',
] as const;

/**
 * The navigation entries the journey follows, by the accessible name the shell publishes for each.
 * Both are links the navigation landmark renders; a disabled entry is an action button and never a
 * link, so a renamed or disabled entry fails here as a missing link rather than as a silent skip.
 */
const NAVIGATION = {
  exceptions: 'Exceptions',
  audit: 'Audit trail',
} as const;

/**
 * The mentions of the trail's decision, quoted from the audit record's own action vocabulary. The
 * action a decision appends is `decision`, and every write-back step appends `simulated write-back`;
 * both are the record's values rather than wording this spec invents, and they are what the trail is
 * filtered and counted by.
 */
const DECISION_ACTION = 'decision';
const WRITE_BACK_ACTION = 'simulated write-back';

/* ---------------------------------------------------------------------------------------------
 * Reading the browser: paths, cells and the fixture
 * ------------------------------------------------------------------------------------------- */

/**
 * The path the browser is on, without the origin, so each step can assert where the application sent
 * the session. Read from the URL rather than from a heading, because the path is what a step's
 * navigation acts on and it is the same value a reader could copy from the address bar.
 *
 * @param page The Playwright page showing the application.
 * @returns The pathname, such as `/canvas`.
 */
function pathnameOf(page: Page): string {
  return new URL(page.url()).pathname;
}

/**
 * The amount a rendered money cell states, read back out of the application's one money formatter.
 *
 * `MonoValue` renders an amount in the `de-DE` convention with the currency as a code: a full stop
 * groups the thousands, a comma separates the decimals, and a non-breaking space precedes `EUR`. The
 * currency code and the whitespace are dropped, the grouping stops are removed and the decimal comma
 * becomes a full stop, so the number compared is the number the record holds. The cell's accessible
 * name adds the trigger's hidden suffix, which carries no digit and therefore never reaches the match.
 *
 * @param text The cell's rendered text.
 * @param where What the value is, for the failure message: the option and the measure.
 * @returns The amount as a number.
 * @throws Error when the cell holds no amount at all, which is a defect in the cell rather than a
 *   comparison this spec should quietly skip.
 */
function moneyFrom(text: string, where: string): number {
  const match = /-?\d[\d.,]*/.exec(text.replace(/EUR/g, ' '));
  const digits = match?.[0];

  if (digits === undefined) {
    throw new Error(`${where}: the cell reads ${JSON.stringify(text)}, which carries no amount.`);
  }

  const value = Number(digits.replace(/\./g, '').replace(',', '.'));

  if (!Number.isFinite(value)) {
    throw new Error(
      `${where}: the cell reads ${JSON.stringify(text)}, whose amount cannot be read as a number.`,
    );
  }

  return value;
}

/**
 * The count or day total a rendered cell states.
 *
 * A count is rendered as the record's own number with no formatting — `10`, not `10.00` — so the
 * digits are read as they stand. Only the first number is taken, because the cell also carries the
 * evidence trigger's hidden suffix.
 *
 * @param text The cell's rendered text.
 * @param where What the value is, for the failure message.
 * @returns The value as a number.
 * @throws Error when the cell holds no number.
 */
function countFrom(text: string, where: string): number {
  const match = /-?\d+(?:[.,]\d+)?/.exec(text);
  const digits = match?.[0];

  if (digits === undefined) {
    throw new Error(`${where}: the cell reads ${JSON.stringify(text)}, which carries no number.`);
  }

  const value = Number(digits.replace(',', '.'));

  if (!Number.isFinite(value)) {
    throw new Error(
      `${where}: the cell reads ${JSON.stringify(text)}, whose value cannot be read as a number.`,
    );
  }

  return value;
}

/**
 * The fixture row one rendered column names.
 *
 * The column's header carries the option's own identifier in the mono face, so the identifier is
 * matched against the fixture's rows rather than parsed by a pattern this spec would have to invent:
 * a column the fixture does not measure has no expected figures and fails here, naming what the matrix
 * showed and which options the fixture does hold.
 *
 * @param header The column header cell as rendered.
 * @returns The fixture row for that option.
 * @throws Error when the header names no option the fixture states.
 */
async function expectedRowOf(header: Locator): Promise<ExpectedSolverRow> {
  const text = await header.innerText();
  const expected = EXPECTED_SOLVER_ROWS.find((row) => text.includes(row.id));

  if (expected === undefined) {
    throw new Error(
      `The comparison matrix shows a column reading ${JSON.stringify(text)}, which names no option the fixture measures. The fixture holds ${EXPECTED_SOLVER_ROWS.map(
        (row) => row.id,
      ).join(', ')}, so either the screen rendered an option the expected results do not state or the header lost its identifier.`,
    );
  }

  return expected;
}

/**
 * The row of the comparison matrix that reports one measure.
 *
 * The matrix is transposed, so a measure is a row named by its row header rather than a column; the
 * row header is what is matched, and the cells beneath it are the options in the header's order.
 *
 * @param page The Playwright page showing the application, which roots the row-header lookup.
 * @param matrix The comparison matrix's table.
 * @param label The measure's label, as the matrix renders it.
 * @returns The row, ready for its cells to be read by position.
 */
function measureRowOf(page: Page, matrix: Locator, label: string): Locator {
  return matrix
    .locator('tbody')
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: label, exact: true }) });
}

/**
 * One option's cell for one measure: the row's cells exclude its row header, so the option the header
 * named at position `column` is the cell at `column - 1`.
 *
 * @param page The Playwright page showing the application, which roots the row-header lookup.
 * @param matrix The comparison matrix's table.
 * @param label The measure's label.
 * @param column The column's position in the header row, where 0 is the corner cell.
 * @returns The cell to read.
 */
function measureCellOf(page: Page, matrix: Locator, label: string, column: number): Locator {
  return measureRowOf(page, matrix, label).getByRole('cell').nth(column - 1);
}

/**
 * The option the records' own rule recommends, derived from the fixture rather than from the screen:
 * the fewest units late, then the lowest added cost, among the options whose constraint check passes.
 *
 * Reading the expectation from the fixture is what makes the assertion worth making — a screen asked
 * which option it recommended would agree with itself — and the tie-break is stated here because that
 * is the rule the records apply and the block on screen prints.
 *
 * @returns The fixture row for the recommended option.
 * @throws Error when the fixture holds no option that passes its constraint check.
 */
function recommendedRow(): ExpectedSolverRow {
  let best: ExpectedSolverRow | undefined;

  for (const row of EXPECTED_SOLVER_ROWS) {
    if (row.constraintCheck !== 'pass') {
      continue;
    }

    const beatsIt =
      best === undefined ||
      row.unitsLate < best.unitsLate ||
      (row.unitsLate === best.unitsLate && row.addedCostEur < best.addedCostEur);

    if (beatsIt) {
      best = row;
    }
  }

  if (best === undefined) {
    throw new Error(
      'The fixture holds no option whose constraint check passes, so the journey cannot know which option the rule recommends.',
    );
  }

  return best;
}

/**
 * The description one write-back step states, read out of the step's own text.
 *
 * A step renders the record's description first and then the fields of the write it performs — the
 * target system, its state and the record it writes — in a structure each surface owns. The
 * description is therefore taken as the text ahead of the "Target system" caption both the preview and
 * the tracker print, so the two are compared on the record's own wording rather than on either
 * component's markup.
 *
 * @param text The step's rendered text.
 * @param where What the step is, for the failure message.
 * @returns The description, trimmed.
 * @throws Error when the step states no description ahead of its write fields.
 */
function stepDescriptionOf(text: string, where: string): string {
  const marker = text.indexOf('Target system');
  const description = (marker === -1 ? text : text.slice(0, marker)).trim();

  if (description === '') {
    throw new Error(`${where}: the step reads ${JSON.stringify(text)}, which states no description.`);
  }

  return description;
}

/**
 * The measures the comparison matrix renders and the fixture states, with how each one is read back.
 *
 * The matrix's measure rows are the eight AAP 0.12.4's SCR-04 row fixes; five of them are figures the
 * expected-results table also states, and those five are compared here cell by cell. Confidence, the
 * constraint check and the side effects are asserted where the journey meets them instead, because
 * they are records and reasons rather than one of the six measures the table fixes.
 *
 * `revenueDelayedEur` is the sixth measure of the table and no row of the matrix renders it, so the
 * journey compares it where the application does state it: the approval's outcome card, which sets the
 * plan's own measurement beside the one the records reached. Comparing it nowhere would leave a
 * measure of the table unverified; comparing it against a figure derived from the screen would prove
 * nothing.
 */
interface ComparedMeasure {
  /** The measure's row header, as the matrix renders it. */
  readonly label: string;

  /** The same measure in the expected-results table. */
  readonly expected: (row: ExpectedSolverRow) => number;

  /** How the rendered cell is read back to the number it states. */
  readonly read: (text: string, where: string) => number;
}

/** The five measures of the expected-results table that the comparison matrix renders. */
const COMPARED_MEASURES: readonly ComparedMeasure[] = [
  { label: 'Units late', expected: (row) => row.unitsLate, read: countFrom },
  { label: 'Maximum days late', expected: (row) => row.maxDaysLate, read: countFrom },
  { label: 'Orders on time', expected: (row) => row.ordersOnTime, read: countFrom },
  { label: 'Added cost', expected: (row) => row.addedCostEur, read: moneyFrom },
  { label: 'Line idle days', expected: (row) => row.lineIdleDays, read: countFrom },
];

/**
 * One value a later step needs and an earlier step read.
 *
 * The steps are one continuous journey, so a value a later step asserts against is read from the
 * screen in the step that saw it. A missing value means the earlier step did not get that far, and the
 * journey then fails where the value is used with a sentence saying so, rather than reporting a
 * comparison against `undefined`.
 *
 * @param value The value an earlier step read, or `undefined`.
 * @param what What the value is, as a clause of the failure message.
 * @returns The value, once known.
 * @throws Error when the earlier step did not record it.
 */
function mustBeKnown<T>(value: T | undefined, what: string): T {
  if (value === undefined) {
    throw new Error(
      `The journey reached an assertion about ${what} without it: the step that reads it did not complete, so this comparison could not be made.`,
    );
  }

  return value;
}

/**
 * The queue row whose exception carries the solver case the fixture measures.
 *
 * The queue states an exception's identifier, type, title, plant and measures, and it does not state
 * its `solverCaseId`, so the row cannot be looked up by the case's own identifier. What ties the two
 * records together is the number they share — the case `CASE-nnnn` measures the exception
 * `EXC-yyyy-nnnn` — so the digits are taken from the fixture's `SOLVER_CASE_ID` rather than typed
 * here, and the queue is searched for the one row whose identifier ends with them (rule P-6: the
 * journey derives what it looks for instead of writing an identifier down).
 *
 * @param table The exception queue's table.
 * @param caseId The solver case's identifier, from the fixture.
 * @returns The row to open and the exception identifier it displayed.
 * @throws Error when no row names that exception, quoting the identifiers the queue did show.
 */
async function rowCarryingCase(
  table: Locator,
  caseId: string,
): Promise<{ readonly row: Locator; readonly exceptionId: string }> {
  const digits = caseId.replace(/\D/g, '');

  if (digits === '') {
    throw new Error(
      `The fixture's solver case identifier ${JSON.stringify(caseId)} carries no number, so the queue cannot be searched for the exception it measures.`,
    );
  }

  const rows = table.locator('tbody').getByRole('row');
  const total = await rows.count();
  const seen: string[] = [];

  for (let index = 0; index < total; index += 1) {
    const row = rows.nth(index);
    const identifier = (await row.getByRole('cell').first().innerText()).trim().split(/\s+/)[0] ?? '';

    if (identifier !== '') {
      seen.push(identifier);
    }

    if (identifier.endsWith(digits)) {
      return { row, exceptionId: identifier };
    }
  }

  throw new Error(
    `The queue shows ${String(total)} row(s) — ${seen.join(', ')} — and none of them names the exception the solver case ${JSON.stringify(caseId)} measures, whose identifier ends in ${digits}.`,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The journey
 * ------------------------------------------------------------------------------------------- */

/**
 * The named end-to-end journey the request makes the product's central demonstration: a disruption is
 * seen, its impact is walked, the response options are compared with their arithmetic, one is put
 * forward and approved, its simulated write-back lands, and the trail of what happened is read.
 *
 * The title carries no acceptance identifier: the journey is named rather than numbered, and the
 * specification's numbered identifiers stay with the tests that own them.
 */
test("the planner journey: from the disruption to the audit record, with the solver's figures on screen", async ({
  page,
}) => {
  /* What earlier steps read and later steps assert against, so one journey needs no second read. */
  let exceptionId: string | undefined;
  let approvalId: string | undefined;
  let plannedSteps: readonly string[] | undefined;

  await test.step('1 · entry: the head of supply chain lands on the FileMap canvas', async () => {
    await page.goto('/');
    await switchRole(page, 'USR-03');

    await expect
      .poll(() => pathnameOf(page), {
        message: 'the head of supply chain lands on the FileMap canvas',
      })
      .toBe(entryRouteForPersona('USR-03'));

    await expect(
      page.getByRole('button', { name: new RegExp(`^${SIMULATED_DATA_LABEL} at `) }),
      'the Simulated data badge is visible on the entry route',
    ).toBeVisible();
  });

  await test.step('2 · the disruption: the queue opens the exception the solver case measures', async () => {
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: NAVIGATION.exceptions, exact: true })
      .click();
    await expect
      .poll(() => pathnameOf(page), { message: 'the queue is reached by its navigation entry' })
      .toBe('/exceptions');

    const queue = page.getByRole('table', { name: 'Exception queue' });
    await expect(queue).toBeVisible();

    const found = await rowCarryingCase(queue, SOLVER_CASE_ID);
    exceptionId = found.exceptionId;

    await found.row.getByRole('cell').first().click();
    await expect
      .poll(() => pathnameOf(page), { message: 'the row opens its investigation' })
      .toBe(`/exceptions/${found.exceptionId}`);

    const whatChanged = page.getByRole('region', { name: 'What changed' });
    await expect(whatChanged, 'the investigation states what changed').toBeVisible();

    const stated = (await whatChanged.locator('p').first().innerText()).trim();
    expect(
      stated.length,
      'the card states the change in the record’s own words',
    ).toBeGreaterThan(0);
  });

  await test.step('3 · what it touches: the impact chain, each node’s evidence, the affected orders', async () => {
    const chain = page.getByRole('list', { name: 'Impact chain' });
    await expect(chain, 'the investigation shows the impact chain').toBeVisible();

    /*
     * The chain opens the four kinds AAP 0.12.4's SCR-03 row fixes, from the purchase order to the
     * customer orders, and it holds one node per record of the kind: a disruption that reaches several
     * orders shows each of them, so the count is asserted as a floor and the closing kind as a rule
     * rather than as a fixed length.
     */
    const nodeKinds = ['Purchase order', 'Material', 'Production line', 'Customer order'] as const;
    const nodes = chain.getByRole('listitem');
    const nodeCount = await nodes.count();
    expect(
      nodeCount,
      'the chain holds at least the four links from the purchase order to the customer orders',
    ).toBeGreaterThanOrEqual(nodeKinds.length);

    /* Every node opens the evidence behind it, and the drawer closes without leaving the record. */
    const openEvidenceOf = async (node: Locator, kind: string): Promise<void> => {
      await node.getByRole('button').click();
      const drawer = page.getByRole('dialog', { name: 'Evidence' });
      await expect(drawer, `a ${kind} node opens its evidence`).toBeVisible();
      await expect(drawer, 'the drawer names the record behind the node').toContainText('Record');

      await drawer.getByRole('button', { name: 'Close' }).click();
      await expect(drawer).toBeHidden();
    };

    for (const [index, kind] of nodeKinds.entries()) {
      const node = nodes.nth(index);
      await expect(node, `link ${String(index + 1)} of the chain is the ${kind}`).toContainText(
        kind,
      );
      await openEvidenceOf(node, kind);
    }

    /* Whatever the customer orders number, every remaining link is one of them. */
    for (let index = nodeKinds.length; index < nodeCount; index += 1) {
      const node = nodes.nth(index);
      await expect(
        node,
        `link ${String(index + 1)} of the chain is a further customer order`,
      ).toContainText('Customer order');
      await openEvidenceOf(node, 'Customer order');
    }

    /* The impact reaches orders: the affected-orders table is populated rather than empty. */
    const orders = page
      .getByRole('region', { name: 'Customer orders at risk' })
      .getByRole('table');
    await expect(orders).toBeVisible();

    const orderRows = orders.locator('tbody').getByRole('row');
    const orderCount = await orderRows.count();
    expect(
      orderCount,
      'the affected-orders table lists the orders the disruption reaches',
    ).toBeGreaterThan(0);
  });

  await test.step('4 · options with their arithmetic: every rendered measure equals the solver’s', async () => {
    await page.getByRole('button', { name: 'Compare options' }).click();
    await expect
      .poll(() => pathnameOf(page), { message: 'the investigation opens its options' })
      .toBe(`/exceptions/${mustBeKnown(exceptionId, 'the exception identifier')}/scenarios`);
    await expect(page.getByRole('heading', { level: 1, name: 'Scenario comparison' })).toBeVisible();

    const matrix = page.getByRole('table', {
      name: 'Response options and the measures they are compared on',
    });
    await expect(matrix, 'the comparison matrix is shown').toBeVisible();

    const headers = matrix.locator('thead').getByRole('columnheader');
    const columnCount = await headers.count();
    expect(
      columnCount,
      'the matrix shows the row-label column and one column per option',
    ).toBeGreaterThan(1);

    let measuredOptions = 0;

    for (let column = 1; column < columnCount; column += 1) {
      const header = headers.nth(column);
      const expected = await expectedRowOf(header);
      const where = (measure: string): string => `option ${expected.id}, measure "${measure}"`;

      /* A computed option carries the §5.3 calculation label on its own column (rule P-1). */
      await expect(header, `${expected.id} is labelled as a calculation`).toContainText(
        SIMULATED_CALCULATION_LABEL,
      );

      /*
       * An option whose constraint check failed cannot be measured at all, so its figures are not
       * comparable and the matrix states the reason instead of a number (AAP 0.8). The expected row
       * records the same verdict, and the journey therefore has to agree with the verdict before it
       * can agree about a figure.
       */
      if (expected.constraintCheck === 'fail') {
        for (const measure of COMPARED_MEASURES) {
          await expect(
            measureCellOf(page, matrix, measure.label, column),
            `${where(measure.label)} reads "${CANNOT_COMPUTE_LABEL}", because the option breaches the case's bounds`,
          ).toContainText(CANNOT_COMPUTE_LABEL);
        }

        await expect(
          measureCellOf(page, matrix, 'Constraint check', column),
          `${expected.id} reports the failed constraint the expected results state`,
        ).toContainText('Fail');
        continue;
      }

      for (const measure of COMPARED_MEASURES) {
        const cell = measureCellOf(page, matrix, measure.label, column);
        await expect(cell, `${where(measure.label)} is rendered`).toBeVisible();

        const rendered = measure.read(await cell.innerText(), where(measure.label));
        expect(
          rendered,
          `${where(measure.label)} equals the solver's own expected result, not a figure derived from the screen`,
        ).toBe(measure.expected(expected));
      }

      await expect(
        measureCellOf(page, matrix, 'Constraint check', column),
        `${expected.id} passes the constraint check the expected results state`,
      ).toContainText('Pass');

      measuredOptions += 1;
    }

    expect(
      measuredOptions,
      'at least one option the solver measured is compared figure by figure',
    ).toBeGreaterThan(0);

    /* The rule's pick, its own column marked, and the block that states the rule and the trade-off. */
    const recommended = recommendedRow();
    const recommendedHeader = matrix
      .getByRole('columnheader')
      .filter({ hasText: recommended.id });

    await expect(
      recommendedHeader,
      'the recommended option is marked on its own column',
    ).toHaveAttribute('aria-current', 'true');
    await expect(recommendedHeader).toContainText(SIMULATED_RECOMMENDATION_LABEL);

    const recommendedCard = page.getByRole('region', { name: 'Recommended' });
    await expect(recommendedCard, 'the recommendation block is shown').toBeVisible();
    await expect(recommendedCard).toContainText(SIMULATED_RECOMMENDATION_LABEL);
    await expect(recommendedCard, 'the block states the rule it applied').toContainText(
      RECOMMENDATION_RULE,
    );
    await expect(
      recommendedCard
        .locator('p')
        .filter({ hasText: recommended.addedCostEur.toLocaleString('en-US') }),
      'the trade-off sentence carries the spend the solver computed for the recommended option',
    ).toBeVisible();
  });

  await test.step('5 · approve one: the plan is requested, then decided by the persona the record names', async () => {
    const recommended = recommendedRow();
    const recommendedHeader = page
      .getByRole('table', { name: 'Response options and the measures they are compared on' })
      .getByRole('columnheader')
      .filter({ hasText: recommended.id });

    /* Selecting the recommended option is the reader's act; its column then reports itself pressed. */
    await recommendedHeader.getByRole('button').click();
    await expect(recommendedHeader.getByRole('button')).toHaveAttribute('aria-pressed', 'true');

    const requestApproval = page.getByRole('button', {
      name: 'Request approval for selected plan',
    });
    await expect(
      requestApproval,
      'the request a reader can act on is operable rather than disabled (rule P-8)',
    ).not.toHaveAttribute('aria-disabled', 'true');
    await requestApproval.click();

    await expect
      .poll(() => pathnameOf(page), { message: 'the request opens the approval it created' })
      .toMatch(/^\/approvals\/[^/]+$/);

    const path = pathnameOf(page);
    approvalId = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1));
    expect(approvalId.length, 'the approval page names the approval it opened').toBeGreaterThan(0);

    await expect(page.getByRole('heading', { level: 1, name: 'Approval' })).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Plan summary' }),
      'the record states who may decide this plan, and the requester’s own role is not among them',
    ).toContainText('plant-manager');

    /*
     * POL-003 forbids the persona who requested a plan from deciding it, so the decision belongs to
     * the role the record names. The switch is the demonstration's own control, it reloads nothing,
     * and the shell sends the session to that persona's entry route — the inbox the approval is in.
     */
    await switchRole(page, 'USR-02');
    await expect
      .poll(() => pathnameOf(page), { message: 'the plant manager lands on the approvals inbox' })
      .toBe(entryRouteForPersona('USR-02'));

    const inbox = page.getByRole('table', { name: /^Approvals in scope/ });
    await expect(inbox).toBeVisible();

    const ownApproval = inbox
      .getByRole('row')
      .filter({ hasText: mustBeKnown(approvalId, 'the approval identifier') });
    await expect(ownApproval, 'the inbox lists the plan the journey requested').toHaveCount(1);
    await ownApproval.getByRole('cell').first().click();
    await expect.poll(() => pathnameOf(page)).toBe(path);

    /* The steps the record states, read before the decision so the tracker can be compared with them. */
    const previewCard = page.getByRole('region', { name: 'Write-back preview' });
    await expect(previewCard, 'the plan summarises the write-back it would perform').toBeVisible();

    const previewItems = previewCard.getByRole('listitem');
    const previewCount = await previewItems.count();
    expect(
      previewCount,
      'the plan carries the simulated write-back steps its approval will run',
    ).toBeGreaterThan(0);

    const stated: string[] = [];
    for (let index = 0; index < previewCount; index += 1) {
      const item = previewItems.nth(index);
      await expect(item, 'every previewed step is labelled a simulated write-back').toContainText(
        SIMULATED_WRITE_BACK_LABEL,
      );
      stated.push(stepDescriptionOf(await item.innerText(), 'the previewed write-back step'));
    }
    plannedSteps = stated;

    /* The acknowledgement AAP 0.12.4 fixes, by the sentence the control carries rather than by a plant
       identifier typed here: the plant the plan lands on is read from the control's own wording. */
    const acknowledgement = page.getByRole('button', {
      name: /^I have read the side effect on /,
    });
    await expect(acknowledgement, 'the plan states the side effect its approval requires').toBeVisible();
    await expect(
      acknowledgement,
      'the acknowledgement is operable rather than disabled (rule P-8)',
    ).not.toHaveAttribute('aria-disabled', 'true');
    await acknowledgement.click();
    await expect(acknowledgement).toHaveAttribute('aria-pressed', 'true');

    await page
      .getByLabel('Comment', { exact: true })
      .fill('Reviewed the option, its measures and the side effect before deciding.');

    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    await expect(
      approve,
      'with the side effect acknowledged and a comment written, the decision is operable (rule P-8)',
    ).not.toHaveAttribute('aria-disabled', 'true');
    await approve.click();

    await expect(
      page.getByText('Decision taken', { exact: true }),
      'the record reports the decision it took',
    ).toBeVisible();
    await expect(
      page.getByText('approved', { exact: true }).first(),
      'the approval moved out of the pending state the journey found it in',
    ).toBeVisible();
  });

  await test.step('6 · the simulated write-back: the tracker steps in order, then the outcome', async () => {
    const steps = mustBeKnown(plannedSteps, 'the write-back steps the record states');

    const tracker = page.getByRole('list', { name: 'Simulated write-back steps' });
    await expect(tracker, 'the approved plan reports its write-back progress').toBeVisible();

    const trackerSteps = tracker.getByRole('listitem');
    await expect(
      trackerSteps,
      'the tracker carries one step per write-back the record states',
    ).toHaveCount(steps.length);

    for (let index = 0; index < steps.length; index += 1) {
      const step = trackerSteps.nth(index);
      const stated = mustBeKnown(steps[index], `write-back step ${String(index + 1)}`);

      expect(
        stepDescriptionOf(await step.innerText(), `write-back step ${String(index + 1)}`),
        `step ${String(index + 1)} follows the record’s own order`,
      ).toBe(stated);
      await expect(step, `step ${String(index + 1)} carries the fixed write-back tag`).toContainText(
        WRITE_BACK_TAG,
      );
      await expect(step, `step ${String(index + 1)} completed`).toContainText('succeeded');
    }

    /* The outcome card sets the plan's own measurement beside the one the records reached. */
    const outcome = page.getByRole('region', { name: 'Planned against resulting' }).last();
    await expect(outcome, 'the approved plan reports its outcome').toBeVisible();
    await expect(outcome, 'the outcome is labelled a simulated calculation').toContainText(
      SIMULATED_CALCULATION_LABEL,
    );

    /*
     * Revenue delayed is the sixth measure of the expected-results table and the one row the comparison
     * matrix does not render, so it is compared here: the outcome card's planned column is the same
     * solver measurement taken at the plan's own levers, which are the recommended option's, and the
     * expected row already states the figure for that position. Nothing read from the screen is used as
     * its own expectation.
     */
    const planned = recommendedRow();
    const revenueRow = outcome.getByRole('row').filter({ hasText: 'Revenue delayed' });
    await expect(revenueRow, 'the outcome reports the revenue the plan delayed').toHaveCount(1);

    const plannedRevenue = moneyFrom(
      await revenueRow.getByRole('cell').nth(1).innerText(),
      `option ${planned.id}, measure "Revenue delayed"`,
    );

    expect(
      plannedRevenue,
      `option ${planned.id}, measure "Revenue delayed" equals the solver's own expected result`,
    ).toBe(planned.revenueDelayedEur);
  });

  await test.step('7 · the audit record: the journey’s own writes, in chain order, and a verifying chain', async () => {
    const approval = mustBeKnown(approvalId, 'the approval identifier');
    const steps = mustBeKnown(plannedSteps, 'the write-back steps the record states');

    /*
     * The trail is a governance screen: the planning roles hold no `audit.read`, so the session changes
     * to the auditor through the same visible control and the shell lands it on the audit route. The
     * navigation entry is still followed, so the route is reached from the interface rather than by
     * address.
     */
    await switchRole(page, 'USR-06');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: NAVIGATION.audit, exact: true })
      .click();
    await expect
      .poll(() => pathnameOf(page), { message: 'the auditor reads the trail at its own route' })
      .toBe(entryRouteForPersona('USR-06'));

    await expect(page.getByRole('heading', { level: 1, name: 'Audit trail' })).toBeVisible();
    await expect(
      page.getByText(AUDIT_CHAIN_NOTE),
      'the chain states that it is a simulated control rather than production tamper resistance',
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: new RegExp(`^${SIMULATED_DATA_LABEL} at `) }),
      'the Simulated data badge is visible on the audit route too',
    ).toBeVisible();

    const trail = page.getByRole('table', { name: /^Audit events, in chain order/ });
    await expect(trail, 'the trail lists the chain').toBeVisible();

    /* Narrowed to the record the journey touched, so the events asserted are the journey's own. The
       trail's text filters commit on `Enter` rather than on every keystroke — one edit, one read — so
       the record is typed and then committed. */
    const recordFilter = page.getByLabel('Record', { exact: true });
    await recordFilter.fill(approval);
    await recordFilter.press('Enter');

    await expect(
      trail.getByRole('row').filter({ hasText: DECISION_ACTION }),
      'the trail lists the decision the journey took',
    ).toHaveCount(1);
    await expect(
      trail.getByRole('row').filter({ hasText: WRITE_BACK_ACTION }),
      'the trail lists each simulated write-back the journey caused',
    ).toHaveCount(steps.length);

    /* Chain order: the sequence column, sorted ascending, is the order the chain grew in. */
    await trail.getByRole('button', { name: 'Sequence' }).click();

    const bodyRows = trail.locator('tbody').getByRole('row');
    const rowCount = await bodyRows.count();
    expect(
      rowCount,
      'the filtered trail holds the request, the decision and every write-back of the journey',
    ).toBe(steps.length + 2);

    let previous: number | undefined;
    for (let index = 0; index < rowCount; index += 1) {
      const sequence = countFrom(
        await bodyRows.nth(index).getByRole('cell').first().innerText(),
        'the trail’s sequence column',
      );

      if (previous !== undefined) {
        expect(sequence, 'the trail lists the events in chain order').toBeGreaterThan(previous);
      }

      previous = sequence;
    }

    /* One event's detail: what the action started from and what it produced. */
    await trail
      .getByRole('row')
      .filter({ hasText: DECISION_ACTION })
      .getByRole('cell')
      .first()
      .click();

    const detail = page.getByRole('dialog', { name: /^Audit event / });
    await expect(detail, 'an event opens its own detail').toBeVisible();
    await expect(
      detail.getByText('Before', { exact: true }),
      'the detail shows what the action started from',
    ).toBeVisible();
    await expect(
      detail.getByText('After', { exact: true }),
      'the detail shows what the action produced',
    ).toBeVisible();
    await detail.getByRole('button', { name: 'Close event detail' }).click();
    await expect(detail).toBeHidden();

    /* The chain verifies, and says in words what its verification does and does not establish. */
    await page.getByRole('button', { name: 'Verify chain' }).click();
    await expect(
      page.getByText('The chain verified at the moment of this check'),
      'every hash in the chain recomputes to the value the record holds',
    ).toBeVisible();

    const shown = (await page.locator('body').innerText()).toLowerCase();
    for (const word of FORBIDDEN_CLAIM_WORDS) {
      expect(
        shown,
        `the audit route may not state the claim "${word}" (rule P-4)`,
      ).not.toContain(word);
    }
  });
});
