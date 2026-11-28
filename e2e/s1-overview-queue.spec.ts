/**
 * T-01 and the overview and queue assertions of the S1 route set, driven through the browser only.
 *
 * WHAT THIS SPEC PROVES. Acceptance test T-01 of `platform-specification.md` §9 is about reachability:
 * the exception queue is reached the way a reader reaches it, from the workspace the application opens
 * on and through the shell's navigation, never by typing an address. AAP §0.7 attaches that to the
 * head of the supply chain (`USR-03`), whose entry route is the FileMap canvas, so the first test
 * switches to that persona, watches the application land on `/canvas`, and only then follows the
 * navigation entry to `/exceptions`. Beside it this file states what SCR-01 and SCR-02 must show once
 * a reader arrives: the queue's twelve columns in their implemented order, its default order proved
 * from the rows themselves, the computed revenue column's exact §5.3 label, the evidence drawer behind
 * a row's figure, the plant filter and a saved view, the acting role's plant scoping, and the
 * overview's four tiles, changed-since list, risk-by-plant table and two charts with their table views,
 * together with the queue those charts narrow — to the day one of the series' marks draws (and, from
 * the table view, to the day one of its rows states), and to the plant a revenue bar draws.
 *
 * HOW IT DRIVES THE APPLICATION. Every step is a reader's step: an option on the demonstration role
 * switcher (through `e2e/helpers/role.ts`, the suite's one persona lever), a link in the shell's
 * navigation, a filter's own control, a figure's own trigger. The build ships no test hook — no
 * global, no query parameter, no branch that exists for this file's benefit — and none is invented
 * here. Routes are opened by path against the configured `baseURL` where the test needs a clean seed
 * or the brief asks for it by name, so no address, port or origin is written in this file (rule B-1).
 *
 * WHY EVERY WAIT IS A WEB-FIRST ONE. The mock backend adds 150-400 ms to each call and hashes 200
 * seeded audit events before the first screen paints, and a filter change replaces the query and
 * therefore the read. The assertions below therefore let Playwright retry (`expect(...)`,
 * `expect.poll`) instead of sleeping: this file contains no fixed wait, so a slower host moves the
 * time a check takes rather than its outcome.
 *
 * WHAT IT DOES NOT DO. It imports no seed record, no adapter and no fixture (rule P-2), and it types
 * no business figure (rule P-6): counts, amounts and dates are read from the running application and
 * compared with each other — a tile's figure against the number of rows the queue shows for the same
 * scope and status, a chart's table view against the amounts the risk table carries and the counts
 * its own marks draw. It touches no colour, pixel or token (rule B-3 asks for role-and-name locators,
 * which is all it uses), runs no axe pass (T-16 owns that), asserts none of the seven screen states
 * (T-17 owns them), and does not reach into the approval, audit or scenario routes (T-04 and T-07 to
 * T-09 own those).
 *
 * Rules served: B-1 and B-2 (no request, no configuration, no credential), B-3 (every control is
 * located by role and accessible name and is driven by keyboard where the rule's keyboard requirement
 * is what is under test), P-1 (the exact §5.3 labels are asserted on the figures this file touches),
 * P-2 and P-6 (data arrives only through the service, and no figure is typed here), P-7 (only the
 * names the running application renders are used) and P-8 (a control that cannot act is asserted
 * through the explanation it gives rather than forced). Rules P-3, P-4 and P-5 are not engaged: the
 * demonstration switcher is driven only through its own labelled control, nothing here asserts or
 * implies a deployment property, and no competitor figure is read or shown.
 */
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { switchRole } from './helpers/role';

/* ---------------------------------------------------------------------------------------------
 * The fixed strings and the vocabularies this spec compares against
 * ------------------------------------------------------------------------------------------- */

/**
 * The exact specification §5.3 label a computed figure carries (rule P-1).
 *
 * Written once here as the suite's expectation of the application's own text: the overview labels each
 * of its four tiles and both chart frames with it, and the queue labels its computed revenue column
 * with it.
 */
const CALCULATED_LABEL = 'Simulated calculation';

/**
 * The persistent badge's accessible name, as the shell renders it: the label, the word `at` and the
 * demonstration clock (rule P-1). Only the label is this spec's expectation — the clock is a record
 * value and is deliberately not written here (rule P-6).
 */
const SIMULATED_DATA_BADGE = /^Simulated data at /;

/**
 * The completion `EvidenceRef` appends to the accessible name and the text of the figure it wraps, so
 * a figure is announced as the control that opens its evidence. It is the seam this spec uses to strip
 * a cell back to its value, and to find the trigger inside a cell.
 */
const EVIDENCE_SUFFIX = '— open evidence';

/**
 * The evidence drawer's four section captions, in the order `src/components/evidence-drawer.tsx`
 * renders them (AAP §0.12.4: value, provenance, formula and inputs, upstream and downstream, and
 * confidence).
 */
const EVIDENCE_SECTIONS: readonly string[] = [
  'Value and formula',
  'Source, record and time',
  'Inputs, upstream and downstream',
  'Confidence, missing inputs and documents',
];

/**
 * The two sentences that mark a drawer whose read was refused.
 *
 * The first is the drawer's own headline for a failed read and the second is the service's refusal for
 * a reference no family answers. Neither may appear behind a figure the application offers as a
 * control: every figure, chart mark, node, arc or pin opens evidence it can show (AAP 0.2.1 F12, rule
 * P-8). Both are restated here because a browser spec compares rendered text.
 */
const EVIDENCE_FAILURE_HEADLINE = 'The evidence behind this figure could not be read';
const UNRESOLVED_REFERENCE = 'No record family answers the reference';

/**
 * The queue's columns in the order `src/features/scr-02-exception-queue/exception-queue-screen.tsx`
 * renders them: AAP §0.12.4's twelve members in the order it gives them, then the row-actions column
 * rule P-8 requires so an unavailable row action can state its own reason.
 */
const QUEUE_COLUMNS: readonly string[] = [
  'Exception',
  'Type',
  'Title',
  'Products',
  'Plant',
  'Severity',
  'Revenue at risk',
  'Days to impact',
  'Status',
  'Owner',
  'Age (hours)',
  'Freshness',
  'Actions',
];

/**
 * The rank each severity label stands for, read from the label the queue renders (`Critical` first).
 *
 * This is the ordering SCR-02's default sort is stated in — severity, then days to impact — expressed
 * as ranks so the rendered rows can be checked against it. It carries no count, amount or date (rule
 * P-6): it is the sequence a reader reads, not a figure the application computes.
 */
const SEVERITY_RANK: Readonly<Record<string, number>> = {
  Critical: 3,
  High: 2,
  Medium: 1,
  Low: 0,
};

/** The distance one polling assertion is given, which is far above the adapter's injected latency. */
const POLL_TIMEOUT_MS = 20_000;

/* ---------------------------------------------------------------------------------------------
 * Reading the page — text helpers, so every comparison is made on collapsed text
 * ------------------------------------------------------------------------------------------- */

/**
 * Collapses runs of whitespace so rendered text compares equal however the DOM wrapped it.
 *
 * @param text - The text as the document holds it.
 * @returns The same text with each run of whitespace reduced to one space, trimmed.
 */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Escapes a string for use inside a regular expression.
 *
 * @param text - The literal text, such as a plant's rendered name.
 * @returns The text with every regular-expression metacharacter escaped.
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A locator's own text content, collapsed.
 *
 * `textContent` rather than `innerText` on purpose: the accessible name of a figure's trigger ends
 * with a visually hidden suffix, which `textContent` reports and a screenshot would not.
 *
 * @param locator - The element to read.
 * @returns The element's text, whitespace-collapsed.
 */
async function textOf(locator: Locator): Promise<string> {
  return collapse((await locator.textContent()) ?? '');
}

/**
 * A figure's value, with the evidence trigger's suffix removed.
 *
 * @param text - The text of a figure that may be wrapped in `EvidenceRef`.
 * @returns The value alone, such as an amount or a count.
 */
function valueIn(text: string): string {
  const collapsed = collapse(text);
  return collapsed.endsWith(EVIDENCE_SUFFIX)
    ? collapsed.slice(0, collapsed.length - EVIDENCE_SUFFIX.length).trim()
    : collapsed;
}

/**
 * The number a rendered count carries.
 *
 * Money is grouped and a duration is printed with its unit, so the digits are the only part two
 * renderings of one figure are guaranteed to share; nothing is computed from the result beyond
 * comparing it with another rendered value.
 *
 * @param text - The rendered figure.
 * @param context - What was being read, for the failure message.
 * @returns The digits as a number.
 * @throws Error when the text holds no digits at all.
 */
function countIn(text: string, context: string): number {
  const digits = text.replace(/[^0-9]/g, '');
  const value = Number.parseInt(digits, 10);

  if (digits === '' || Number.isNaN(value)) {
    throw new Error(`${context}: expected a rendered number, but the text was ${JSON.stringify(text)}.`);
  }

  return value;
}

/**
 * One row of a two-dimensional list, or a failure naming the position that was missing.
 *
 * `noUncheckedIndexedAccess` makes every index possibly `undefined`, and a spec that silently read
 * `undefined` would assert something nobody could act on, so the lookup is stated once here.
 *
 * @param values - The list read from the page.
 * @param index - The position wanted.
 * @param context - What was being read, for the failure message.
 * @returns The entry at that position.
 * @throws Error when the list is shorter than the position wanted.
 */
function at<T>(values: readonly T[], index: number, context: string): T {
  const value = values[index];

  if (value === undefined) {
    throw new Error(
      `${context}: position ${index} is beyond the ${values.length} entries that were read.`,
    );
  }

  return value;
}

/* ---------------------------------------------------------------------------------------------
 * The shell — the badge and the navigation every route carries
 * --------------------------------------------------------------------------------------------- */

/**
 * The persistent `Simulated data` badge the shell mounts above the router outlet (rule P-1).
 *
 * @param page - The page showing the application.
 * @returns The badge's control, present on every route including the two this spec visits.
 */
function simulatedDataBadge(page: Page): Locator {
  return page.getByRole('banner').getByRole('button', { name: SIMULATED_DATA_BADGE });
}

/**
 * The shell's navigation landmark, named as `src/app/app.tsx` names it.
 *
 * @param page - The page showing the application.
 * @returns The navigation landmark holding the three labelled groups of entries.
 */
function primaryNavigation(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Primary' });
}

/* ---------------------------------------------------------------------------------------------
 * SCR-02 — the queue's table, its columns and its rows
 * --------------------------------------------------------------------------------------------- */

/**
 * The queue's table, named by its caption.
 *
 * @param page - The page showing the application.
 * @returns The exception queue's table.
 */
function queueTable(page: Page): Locator {
  return page.getByRole('table', { name: 'Exception queue' });
}

/**
 * The queue's data rows: every body row whose cells match the declared columns.
 *
 * The table also renders a single full-width cell carrying the empty sentence when it has nothing to
 * show, so a body row is recognised by its cell count rather than by its position: a row of one cell
 * is the empty state and not a record.
 *
 * @param page - The page showing the application.
 * @returns The data rows, in the order the table renders them; empty while the queue is reading or
 *   when it holds no row.
 */
async function queueDataRows(page: Page): Promise<Locator[]> {
  const table = queueTable(page);

  if ((await table.count()) === 0) {
    return [];
  }

  const rows = table.getByRole('row');
  const total = await rows.count();
  const data: Locator[] = [];

  for (let index = 1; index < total; index += 1) {
    const row = rows.nth(index);

    if ((await row.getByRole('cell').count()) === QUEUE_COLUMNS.length) {
      data.push(row);
    }
  }

  return data;
}

/**
 * The position of one of a table's columns, found by its header text.
 *
 * @param table - The table to read.
 * @param header - The header text wanted.
 * @returns The column's zero-based position.
 * @throws Error naming the headers the table actually renders when the wanted one is absent.
 */
async function columnIndex(table: Locator, header: string): Promise<number> {
  const headers = table.getByRole('columnheader');
  const total = await headers.count();
  const rendered: string[] = [];

  for (let index = 0; index < total; index += 1) {
    const text = await textOf(headers.nth(index));
    rendered.push(text);

    if (text === header) {
      return index;
    }
  }

  throw new Error(
    `No column headed ${JSON.stringify(header)} was rendered; the table shows [${rendered.join(', ')}].`,
  );
}

/**
 * The values one column of the queue currently shows, one per data row.
 *
 * @param page - The page showing the application.
 * @param header - The header text of the column to read.
 * @returns The column's values, with any evidence suffix stripped, in row order.
 */
async function queueColumn(page: Page, header: string): Promise<string[]> {
  const rows = await queueDataRows(page);

  if (rows.length === 0) {
    return [];
  }

  const index = await columnIndex(queueTable(page), header);
  const values: string[] = [];

  for (const row of rows) {
    values.push(valueIn(await textOf(row.getByRole('cell').nth(index))));
  }

  return values;
}

/**
 * Two columns of the queue read together, one row at a time, so the pairing of the two values is
 * guaranteed rather than inferred from two separate reads that a re-read could interleave.
 *
 * @param page - The page showing the application.
 * @param first - The header text of the first column.
 * @param second - The header text of the second column.
 * @returns One pair per data row, both values with any evidence suffix stripped.
 */
async function queueRowPairs(
  page: Page,
  first: string,
  second: string,
): Promise<[string, string][]> {
  const rows = await queueDataRows(page);

  if (rows.length === 0) {
    return [];
  }

  const table = queueTable(page);
  const firstIndex = await columnIndex(table, first);
  const secondIndex = await columnIndex(table, second);
  const pairs: [string, string][] = [];

  for (const row of rows) {
    const cells = row.getByRole('cell');
    pairs.push([
      valueIn(await textOf(cells.nth(firstIndex))),
      valueIn(await textOf(cells.nth(secondIndex))),
    ]);
  }

  return pairs;
}

/* ---------------------------------------------------------------------------------------------
 * Shared assertions
 * --------------------------------------------------------------------------------------------- */

/**
 * Waits for the queue to hold at least one record and returns its rows.
 *
 * @param page - The page showing the application.
 * @returns The queue's data rows once one exists.
 */
async function waitForQueueRows(page: Page): Promise<Locator[]> {
  await expect(queueTable(page)).toBeVisible();
  await expect
    .poll(async () => (await queueDataRows(page)).length, { timeout: POLL_TIMEOUT_MS })
    .toBeGreaterThan(0);

  return queueDataRows(page);
}

/**
 * Asserts the evidence drawer is open and shows all four of its sections (AAP §0.12.4).
 *
 * @param page - The page showing the application.
 * @returns The drawer, so a caller can make a further assertion inside it.
 */
async function expectEvidenceDrawerSections(page: Page): Promise<Locator> {
  const drawer = page.getByRole('dialog', { name: 'Evidence' });

  await expect(drawer).toBeVisible();

  for (const section of EVIDENCE_SECTIONS) {
    await expect(drawer.getByRole('region', { name: section })).toBeVisible();
  }

  return drawer;
}

/**
 * The region a titled group renders as: the card or panel whose own heading names it.
 *
 * The name is matched exactly, because the shell's top bar also renders regions whose names contain
 * one of these as a substring — the scope filters' own `Scope filters` group would otherwise answer a
 * search for the queue's `Filters` group — and the assertion has to be about the group it names.
 *
 * @param page - The page showing the application.
 * @param name - The group's heading text.
 * @returns The named region.
 */
function regionNamed(page: Page, name: string): Locator {
  return page.getByRole('region', { name, exact: true });
}

/* ---------------------------------------------------------------------------------------------
 * T-01 — the queue reached through the navigation from the persona's own entry route
 * ------------------------------------------------------------------------------------------- */

/**
 * T-01: the exception queue is reached from the FileMap canvas through the shell's navigation.
 *
 * A head of supply chain lands on `/canvas` (AAP §0.12.4's entry-route table), so the test starts
 * there and walks to the queue the way that persona would. Everything the queue must then show is
 * asserted on the rows the service returned: the twelve specified columns in order, the default
 * ordering proved from the severity and days-to-impact cells of each row, the computed revenue
 * column's exact label, and the evidence drawer behind one row's figure — including the focus
 * returning to the figure that opened it (rule B-3).
 */
test('T-01 the exception queue is reached from the FileMap canvas through the navigation', async ({
  page,
}) => {
  await page.goto('/');
  await switchRole(page, 'USR-03');

  /* The landing assertion AAP §0.7 attaches to T-01: the persona whose home is the canvas arrives
     there, and the queue is reached from it rather than opened by address. */
  await expect(page).toHaveURL(/\/canvas$/);
  await expect(simulatedDataBadge(page)).toBeVisible();

  await primaryNavigation(page).getByRole('link', { name: 'Exceptions' }).click();

  await expect(page).toHaveURL(/\/exceptions$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Exception queue' })).toBeVisible();
  await expect(simulatedDataBadge(page)).toBeVisible();

  const rows = await waitForQueueRows(page);
  expect(rows.length, 'the queue rendered at least one row').toBeGreaterThan(0);

  /* The header row: the twelve SCR-02 columns in the implemented order, as an ordered list. */
  const headers = queueTable(page).getByRole('columnheader');
  const headerTexts: string[] = [];

  for (let index = 0; index < (await headers.count()); index += 1) {
    headerTexts.push(await textOf(headers.nth(index)));
  }

  expect(headerTexts, 'the queue renders the SCR-02 columns in their specified order').toEqual([
    ...QUEUE_COLUMNS,
  ]);

  /* The default order, proved from the rows: severity descending by rank, and days to impact
     ascending inside one severity. No sort-arrow icon is trusted for this. */
  const severities = await queueColumn(page, 'Severity');
  const days = await queueColumn(page, 'Days to impact');

  expect(severities.length, 'the queue rendered a severity for every row').toBeGreaterThan(0);
  expect(days.length, 'the queue rendered days to impact for every row').toBe(severities.length);

  let previousRank: number | undefined;
  let previousDays: number | undefined;

  for (let index = 0; index < severities.length; index += 1) {
    const severity = at(severities, index, 'the rendered severity column');
    const day = at(days, index, 'the rendered days-to-impact column');
    const rank = SEVERITY_RANK[severity];

    if (rank === undefined) {
      throw new Error(
        `Row ${index + 1} shows severity ${JSON.stringify(severity)}, which is not one of the four levels the queue orders by (${Object.keys(SEVERITY_RANK).join(', ')}).`,
      );
    }

    const daysToImpact = countIn(day, `row ${index + 1}'s days to impact`);

    if (previousRank !== undefined) {
      expect(
        rank,
        `row ${index + 1} (${severity}) must not be more urgent than the row before it — the default sort is severity first`,
      ).toBeLessThanOrEqual(previousRank);

      if (rank === previousRank && previousDays !== undefined) {
        expect(
          daysToImpact,
          `row ${index + 1} and the row before it share the severity ${severity}, so days to impact must not decrease`,
        ).toBeGreaterThanOrEqual(previousDays);
      }
    }

    previousRank = rank;
    previousDays = daysToImpact;
  }

  /*
   * Rule P-1. The queue states the exact §5.3 label once for its computed revenue column, immediately
   * above the table, rather than in every cell: `TableColumn.header` is a string and cannot hold the
   * icon-and-label status the label needs, which the screen records in its own header. The assertion
   * is therefore one label for the column — and, per row, that the revenue figure is the trigger that
   * opens the evidence behind it, which is the other half of the same duty.
   */
  const calculatedLabel = page.getByText(CALCULATED_LABEL, { exact: true });
  await expect(calculatedLabel).toHaveCount(1);
  await expect(calculatedLabel).toBeVisible();

  const revenueColumn = await columnIndex(queueTable(page), 'Revenue at risk');
  const evidenceTrigger = new RegExp(`${escapeRegExp(EVIDENCE_SUFFIX)}$`);

  for (const row of rows) {
    await expect(
      row.getByRole('cell').nth(revenueColumn).getByRole('button', { name: evidenceTrigger }),
    ).toBeVisible();
  }

  /* The drawer behind the first row's revenue figure: the record, the four sections, and the focus
     returning to the figure once `Esc` closes it (rule B-3). */
  const firstRow = at(rows, 0, 'the queue’s first data row');
  const identifierColumn = await columnIndex(queueTable(page), 'Exception');
  const firstIdentifier = valueIn(
    await textOf(firstRow.getByRole('cell').nth(identifierColumn)),
  );
  const revenueFigure = firstRow
    .getByRole('cell')
    .nth(revenueColumn)
    .getByRole('button', { name: evidenceTrigger });

  await revenueFigure.click();

  const drawer = await expectEvidenceDrawerSections(page);
  await expect(drawer, 'the drawer names the record behind the figure').toContainText(
    firstIdentifier,
  );

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(
    revenueFigure,
    'the focus returns to the figure that opened the drawer',
  ).toBeFocused();
});

/* ---------------------------------------------------------------------------------------------
 * The queue's own filters and the views a planner keeps for the session
 * --------------------------------------------------------------------------------------------- */

/**
 * The plant filter narrows the queue, clearing it widens the queue back, and a saved view re-applies it.
 *
 * WHAT THE PLANT FILTER MEANS, AND WHY THIS TEST DOES NOT ASSERT PLANT-CELL EQUALITY. The service
 * applies the plant filter to the exceptions that are at that plant OR that also affect it — the
 * queue's own handler admits either — so a row recorded at another plant stays visible when its
 * exception reaches the chosen one, and its plant cell therefore shows that other plant. This test
 * asserts the invariant that meaning does guarantee: every row the filter returns was already in the
 * unfiltered queue, the set never grows, at least one row is excluded so the filter really narrows,
 * and every unfiltered row recorded at the chosen plant survives the filter that names it.
 *
 * Every value used here is read from the running page — the plant to filter by is the plant of the
 * queue's own first row, and the option that clears the filter is the control's unfiltered option — so
 * no plant code, count or amount is written into this file (rule P-6). The saved view's name is this
 * test's own input, and the view is applied through the row that renders it.
 */
test('the queue’s plant filter narrows it, clearing it restores it, and a saved view re-applies it', async ({
  page,
}) => {
  await page.goto('/');
  await primaryNavigation(page).getByRole('link', { name: 'Exceptions' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Exception queue' })).toBeVisible();

  await waitForQueueRows(page);

  const unfiltered = await queueRowPairs(page, 'Exception', 'Plant');
  expect(unfiltered.length, 'the unfiltered queue rendered rows').toBeGreaterThan(0);

  const unfilteredIdentifiers = unfiltered.map((pair) => pair[0]);
  const filters = regionNamed(page, 'Filters');
  const plantFilter = filters.getByRole('combobox', { name: 'Plant' });
  await expect(plantFilter).toBeVisible();

  /* The control's own options: the unfiltered one carries the empty value, and the plant to narrow to
     is the plant the queue's first row reports. */
  const options = plantFilter.locator('option');
  const optionCount = await options.count();
  const optionValues: string[] = [];

  for (let index = 0; index < optionCount; index += 1) {
    optionValues.push((await options.nth(index).getAttribute('value')) ?? '');
  }

  const plantToFilter = at(unfiltered, 0, 'the unfiltered queue’s first row')[1];
  const unfilteredValue = optionValues.find((value) => value === '');

  expect(
    optionValues,
    'the plant filter offers an option for the plant its own rows report',
  ).toContain(plantToFilter);

  if (unfilteredValue === undefined) {
    throw new Error(
      `The plant filter offers no unfiltered option: its values are [${optionValues.join(', ')}].`,
    );
  }

  /* Narrowing: the queue shrinks, and what remains was already there. */
  await plantFilter.selectOption(plantToFilter);
  await expect
    .poll(
      async () => {
        const identifiers = (await queueRowPairs(page, 'Exception', 'Plant')).map(
          (pair) => pair[0],
        );

        return (
          identifiers.length > 0 &&
          identifiers.length < unfilteredIdentifiers.length &&
          identifiers.every((identifier) => unfilteredIdentifiers.includes(identifier))
        );
      },
      { timeout: POLL_TIMEOUT_MS },
    )
    .toBe(true);

  const narrowed = await queueRowPairs(page, 'Exception', 'Plant');
  const narrowedIdentifiers = narrowed.map((pair) => pair[0]);

  for (const pair of unfiltered.filter((entry) => entry[1] === plantToFilter)) {
    expect(
      narrowedIdentifiers,
      `the row recorded at ${plantToFilter} survives the filter that names that plant`,
    ).toContain(pair[0]);
  }

  /* Clearing the filter widens the queue back to exactly the rows it held before. */
  await plantFilter.selectOption(unfilteredValue);
  await expect
    .poll(
      async () => (await queueRowPairs(page, 'Exception', 'Plant')).map((pair) => pair[0]),
      { timeout: POLL_TIMEOUT_MS },
    )
    .toEqual(unfilteredIdentifiers);

  /* A saved view of the narrowed filter set, kept for this session only. */
  const viewName = 'Plant narrowed';
  const savedViews = regionNamed(page, 'Saved views');
  const saveControl = savedViews.getByRole('button', { name: 'Save current view' });

  /* Rule P-8: before the field holds a name the control cannot act, and it says so. */
  await expect(saveControl).toHaveAttribute('aria-disabled', 'true');
  await expect(
    savedViews.getByText('A saved view needs a name.'),
    'the disabled save control carries its own explanation',
  ).toHaveCount(1);

  await plantFilter.selectOption(plantToFilter);
  await expect
    .poll(
      async () => (await queueRowPairs(page, 'Exception', 'Plant')).map((pair) => pair[0]),
      { timeout: POLL_TIMEOUT_MS },
    )
    .toEqual(narrowedIdentifiers);

  await savedViews.getByRole('textbox', { name: 'View name' }).fill(viewName);
  await saveControl.click();

  const applyControl = savedViews.getByRole('button', {
    name: new RegExp(`^Apply: ${escapeRegExp(viewName)}$`),
  });
  await expect(applyControl, 'the saved view is listed once it is saved').toBeVisible();

  await plantFilter.selectOption(unfilteredValue);
  await expect
    .poll(
      async () => (await queueRowPairs(page, 'Exception', 'Plant')).map((pair) => pair[0]),
      { timeout: POLL_TIMEOUT_MS },
    )
    .toEqual(unfilteredIdentifiers);

  await applyControl.click();
  await expect
    .poll(
      async () => (await queueRowPairs(page, 'Exception', 'Plant')).map((pair) => pair[0]),
      { timeout: POLL_TIMEOUT_MS },
    )
    .toEqual(narrowedIdentifiers);
});

/* ---------------------------------------------------------------------------------------------
 * The acting role's plant scope
 * --------------------------------------------------------------------------------------------- */

/**
 * The queue an acting persona sees is scoped by that persona's plants.
 *
 * WHAT THE ROLE'S SCOPE MEANS HERE. The service intersects the shell's selection with the role's plant
 * scope before a row is computed, and the records it returns are the exceptions at those plants or
 * reaching them, so a persona scoped to one plant still sees an exception recorded elsewhere whose
 * disruption reaches its own — and that row's plant cell names the plant the exception is recorded at.
 * This test therefore asserts the narrowing a reader can rely on rather than a one-plant column: the
 * plant manager's queue is a strict subset of the head of supply chain's, draws on fewer distinct
 * plants, and shows no record the wider persona could not see. No plant code is written here: every
 * set is read from the rows.
 */
test('the queue narrows to the acting role’s plant scope when the persona changes', async ({
  page,
}) => {
  await page.goto('/');
  await switchRole(page, 'USR-03');
  await expect(page).toHaveURL(/\/canvas$/);

  await primaryNavigation(page).getByRole('link', { name: 'Exceptions' }).click();
  await waitForQueueRows(page);

  const across = await queueRowPairs(page, 'Exception', 'Plant');
  const acrossIdentifiers = across.map((pair) => pair[0]);
  const acrossPlants = new Set(across.map((pair) => pair[1]));

  expect(acrossIdentifiers.length, 'the head of supply chain sees a queue').toBeGreaterThan(0);
  expect(
    acrossPlants.size,
    'the head of supply chain sees the exceptions of more than one plant',
  ).toBeGreaterThan(1);

  await switchRole(page, 'USR-02');
  await primaryNavigation(page).getByRole('link', { name: 'Exceptions' }).click();
  await waitForQueueRows(page);

  /* The narrowing is waited for rather than read once: a single read would accept the rows the
     previous persona's read left on screen. */
  await expect
    .poll(
      async () => {
        const identifiers = (await queueRowPairs(page, 'Exception', 'Plant')).map(
          (pair) => pair[0],
        );

        return (
          identifiers.length > 0 &&
          identifiers.length < acrossIdentifiers.length &&
          identifiers.every((identifier) => acrossIdentifiers.includes(identifier))
        );
      },
      { timeout: POLL_TIMEOUT_MS },
    )
    .toBe(true);

  const scoped = await queueRowPairs(page, 'Exception', 'Plant');
  const scopedPlants = new Set(scoped.map((pair) => pair[1]));

  expect(
    scopedPlants.size,
    'the plant manager’s queue draws on fewer plants than the head of supply chain’s',
  ).toBeLessThan(acrossPlants.size);

  for (const pair of scoped) {
    expect(
      acrossPlants.has(pair[1]),
      `${pair[1]} is a plant the wider persona’s queue already showed`,
    ).toBe(true);
  }
});


/* ---------------------------------------------------------------------------------------------
 * Reading any table and any set of marks — used by the overview's figures
 * ------------------------------------------------------------------------------------------- */

/**
 * A table's data rows: every body row whose cell count matches the table's declared columns.
 *
 * A table that has nothing to show renders one cell spanning every column, so counting cells is what
 * tells a record apart from the empty sentence.
 *
 * @param table - The table to read.
 * @returns The data rows, in the order the table renders them.
 */
async function tableDataRows(table: Locator): Promise<Locator[]> {
  const columns = await table.getByRole('columnheader').count();
  const rows = table.getByRole('row');
  const total = await rows.count();
  const data: Locator[] = [];

  for (let index = 1; index < total; index += 1) {
    const row = rows.nth(index);

    if ((await row.getByRole('cell').count()) === columns) {
      data.push(row);
    }
  }

  return data;
}

/**
 * The values one column of any table currently shows.
 *
 * @param table - The table to read.
 * @param header - The header text of the column to read.
 * @returns The column's values, with any evidence suffix stripped, in row order.
 */
async function tableColumnValues(table: Locator, header: string): Promise<string[]> {
  const rows = await tableDataRows(table);

  if (rows.length === 0) {
    return [];
  }

  const index = await columnIndex(table, header);
  const values: string[] = [];

  for (const row of rows) {
    values.push(valueIn(await textOf(row.getByRole('cell').nth(index))));
  }

  return values;
}

/**
 * The accessible names of every element a locator matches, in document order.
 *
 * @param locator - The marks to name.
 * @returns Each element's `aria-label`, or the empty string where it carries none.
 */
async function ariaLabels(locator: Locator): Promise<string[]> {
  const elements = await locator.all();
  const labels: string[] = [];

  for (const element of elements) {
    labels.push((await element.getAttribute('aria-label')) ?? '');
  }

  return labels;
}

/**
 * The numbers a chart's marks report, read from the count each mark's accessible name states.
 *
 * A line mark is named `<series>, <date>: <count>. <the action activating it performs>`, so the count is
 * the run of digits between the colon after the date and the sentence that follows it. Only that run is
 * read: the action names the day it narrows to, and a case that took the last number in the name would
 * compare the table's counts with a date.
 *
 * @param labels - The marks' accessible names.
 * @param context - What was being read, for the failure message.
 * @returns The counts, in the order the marks are drawn.
 */
function markCounts(labels: readonly string[], context: string): number[] {
  return labels.map((label, index) => {
    const match = /^[^,]+, \d{4}-\d{2}-\d{2}: (\d+)/u.exec(label);
    const count = match?.[1];

    if (count === undefined) {
      throw new Error(
        `${context}: mark ${index + 1} is named ${JSON.stringify(label)}, which states no count after its date.`,
      );
    }

    return countIn(count, `${context} mark ${index + 1}`);
  });
}

/**
 * The date a series mark draws, read from the mark's own accessible name.
 *
 * A line mark is named `<series>, <date>: <count>. <the action activating it performs>`, and the action
 * on SCR-01's series is the sentence that narrows the queue to that same day, so the name ends
 * `Narrow the queue to <date>`. The date is the member between the comma and the first colon, read
 * rather than written out here, so a day compared with the series' table view is the day the mark
 * itself states — the record's date, not a fixture's (rule P-6).
 *
 * @param label - The mark's accessible name.
 * @param context - What was being read, for the failure message.
 * @returns The date the mark draws, in the `YYYY-MM-DD` form the name carries.
 */
function dayOfMarkLabel(label: string, context: string): string {
  const match = /^[^,]+, (\d{4}-\d{2}-\d{2}): \d+\. Narrow the queue to \d{4}-\d{2}-\d{2}$/u.exec(
    label,
  );
  const day = match?.[1];

  if (day === undefined) {
    throw new Error(
      `${context}: mark is named ${JSON.stringify(label)}, which carries no date in its name.`,
    );
  }

  return day;
}

/**
 * The day a series table row's date control narrows the queue to, read from the control itself.
 *
 * The control is announced as `<action> <day>`: its accessible name is the sentence it carries, which
 * begins with the action and ends with the row's own day. The day is therefore read from the control
 * rather than written out here, so the day the queue is expected to open on is the day the row itself
 * states (rule P-6).
 *
 * @param text - The control's text, which is the sentence it is named by.
 * @param context - What was being read, for the failure message.
 * @returns The day the control narrows to, in the `YYYY-MM-DD` form the sentence carries.
 */
function dayOfQueueDateControl(text: string, context: string): string {
  const match = /^Narrow the queue to (\d{4}-\d{2}-\d{2})/u.exec(collapse(text));
  const day = match?.[1];

  if (day === undefined) {
    throw new Error(
      `${context}: the day control reads ${JSON.stringify(text)}, which states no day after its action.`,
    );
  }

  return day;
}

/* ---------------------------------------------------------------------------------------------
 * SCR-01 — the overview's figures, its two charts and the narrowing they perform
 * ------------------------------------------------------------------------------------------- */

/**
 * The overview's four tiles, its changed-since list, its risk-by-plant table and both charts.
 *
 * The tiles are asserted to carry their exact §5.3 label and to open their evidence; the
 * open-exceptions tile's figure is compared with the number of rows the queue shows for the same scope
 * and status rather than with a typed count (rule P-6); both charts are switched to their table view
 * and the table is compared with the figures the chart draws, which is success criterion 9's "a working
 * view as table carrying the same values"; the series' own date mark and the date cell of its table view
 * are each shown to narrow the queue to the day they state, with clearing that day restoring the whole
 * queue; and a revenue bar is shown to narrow the queue to a strict subset of the rows it held, still
 * holding every row recorded at the plant that bar draws.
 */
test('the overview shows its tiles, changed-since list, risk-by-plant table and both charts, and its date marks, series table rows and revenue bars narrow the queue', async ({
  page,
}) => {
  await page.goto('/');
  await primaryNavigation(page).getByRole('link', { name: 'Overview' }).click();

  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
  await expect(simulatedDataBadge(page)).toBeVisible();

  /* The four computed tiles, each labelled with its own exact label and each opening its evidence. */
  const tileNames: readonly string[] = [
    'Open exceptions',
    'Revenue at risk',
    'Customer orders at risk',
    'Median hours to approved plan',
  ];

  for (const name of tileNames) {
    const tile = regionNamed(page, name);
    await expect(tile, `the ${name} tile is on the overview`).toBeVisible();
    await expect(
      tile.getByText(CALCULATED_LABEL, { exact: true }),
      `the ${name} tile carries its own ${CALCULATED_LABEL} label`,
    ).toHaveCount(1);
    await expect(
      tile.getByRole('button', { name: new RegExp(`open evidence$`) }),
      `the ${name} tile's figure opens its evidence`,
    ).toHaveCount(1);
  }

  const openExceptionsTile = regionNamed(page, 'Open exceptions');
  const openExceptionsFigure = openExceptionsTile.getByRole('button', {
    name: new RegExp(`open evidence$`),
  });
  const openExceptionCount = countIn(
    valueIn(await textOf(openExceptionsFigure)),
    'the open-exceptions tile',
  );

  await openExceptionsFigure.click();

  const tileDrawer = page.getByRole('dialog', { name: 'Evidence', exact: true });
  await expect(tileDrawer, 'a tile’s figure opens the evidence drawer').toBeVisible();

  /*
   * The figure's reference is the composed aggregate reference (`overview:<aggregate>`), and the
   * evidence read answers that family with the aggregate's own output, so the drawer fills all four of
   * its sections rather than opening on a reference no record answers (AAP 0.2.1 F12, principle PR-6).
   */
  await expect(tileDrawer, 'the drawer states which figure it was opened for').toContainText(
    'overview:',
  );

  for (const section of EVIDENCE_SECTIONS) {
    await expect(
      tileDrawer.getByRole('region', { name: section }),
      `the ${section} section of the aggregate figure's evidence`,
    ).toBeVisible();
  }

  await expect(
    tileDrawer.getByText(EVIDENCE_FAILURE_HEADLINE, { exact: true }),
    'an aggregate figure opens evidence that could be read',
  ).toHaveCount(0);
  await expect(tileDrawer).not.toContainText(UNRESOLVED_REFERENCE);

  await page.keyboard.press('Escape');
  await expect(tileDrawer).toBeHidden();

  /*
   * The same scope's queue, and the same status the tile counts. The open-exceptions tile is the
   * number of exceptions that are still open (contracts §5), while the queue lists every exception the
   * acting role can see, so the queue's own status filter is narrowed to the open status — its option
   * read from the control, never typed — before the two rendered figures are compared. No count is
   * written here: the equality is between a tile and the rows the queue shows.
   */
  await primaryNavigation(page).getByRole('link', { name: 'Exceptions' }).click();
  await waitForQueueRows(page);

  /* The queue as this persona is shown it, kept for the narrowing a revenue bar performs further
     down: the bar narrows the shell's plant selection, so what it opens must be a subset of these
     rows. */
  const unscoped = await queueRowPairs(page, 'Exception', 'Plant');
  const unscopedIdentifiers = unscoped.map((pair) => pair[0]);
  const unscopedPlants = [...new Set(unscoped.map((pair) => pair[1]))];

  const statusFilter = regionNamed(page, 'Filters').getByRole('combobox', { name: 'Status' });
  const statusOptions = statusFilter.locator('option');
  let openStatusValue: string | undefined;

  for (let index = 0; index < (await statusOptions.count()); index += 1) {
    const option = statusOptions.nth(index);

    if ((await textOf(option)) === 'Open') {
      openStatusValue = (await option.getAttribute('value')) ?? undefined;
    }
  }

  if (openStatusValue === undefined) {
    throw new Error('The queue’s status filter offers no open status to narrow the queue to.');
  }

  await statusFilter.selectOption(openStatusValue);
  await expect
    .poll(async () => (await queueDataRows(page)).length, { timeout: POLL_TIMEOUT_MS })
    .toBe(openExceptionCount);

  await primaryNavigation(page).getByRole('link', { name: 'Overview' }).click();
  await expect(page).toHaveURL(/\/overview$/);

  /* The changed-since group, in either of its two renderings. */
  const changedSince = regionNamed(page, 'Changed since your last visit');
  await expect(changedSince).toBeVisible();

  const changedItems = await changedSince.getByRole('listitem').count();

  if (changedItems === 0) {
    await expect(
      changedSince,
      'the group states that nothing changed rather than rendering an empty list',
    ).toContainText('No record has changed since your last visit.');
  } else {
    await expect(
      changedSince.getByRole('button', { name: new RegExp('open evidence$') }),
      'every changed record opens its own evidence',
    ).toHaveCount(changedItems);
  }

  /*
   * The freshness state the figures rest on. `ChangedSinceLastVisitItem` carries no freshness member
   * — its ref, label and detail are the whole record — so per-entry freshness cannot be read here;
   * the six sources' states and as-of instants are reported by the shell's freshness strip, which is
   * asserted beside the list.
   */
  await expect(
    page.getByRole('group', { name: 'Source freshness', exact: true }),
    'the six sources’ freshness is visible beside the overview’s figures',
  ).toBeVisible();

  /* The risk-by-plant table. */
  const plantTable = page.getByRole('table', {
    name: 'Open exceptions and revenue at risk, by plant',
    exact: true,
  });
  await expect(plantTable).toBeVisible();

  const plantIdentifiers = await tableColumnValues(plantTable, 'Plant');
  const plantNames = await tableColumnValues(plantTable, 'Name');
  const plantRevenue = await tableColumnValues(plantTable, 'Revenue at risk');

  expect(plantIdentifiers.length, 'the risk-by-plant table rendered its rows').toBeGreaterThan(0);
  expect(plantNames.length).toBe(plantIdentifiers.length);
  expect(plantRevenue.length).toBe(plantIdentifiers.length);

  /* The revenue bars' table view carries the same amounts as the table beside it. */
  const revenueToggle = page.getByRole('button', {
    name: 'View as table: Revenue at risk by plant',
  });
  await expect(revenueToggle).toBeVisible();
  await revenueToggle.click();

  const revenueTableView = page.getByRole('table', {
    name: 'Revenue at risk by plant, as a table',
    exact: true,
  });
  await expect(revenueTableView).toBeVisible();
  expect(
    [...(await tableColumnValues(revenueTableView, 'Revenue at risk'))].sort(),
    'the revenue bars’ table view carries the amounts the risk-by-plant table carries',
  ).toEqual([...plantRevenue].sort());

  await page.getByRole('button', { name: 'View as chart: Revenue at risk by plant' }).click();

  /* The opened/resolved series: its marks, the days and counts they state, and its table view. */
  const openedMarks = page.getByRole('button', { name: /^Opened, / });
  const openedLabels = await ariaLabels(openedMarks);

  expect(openedLabels.length, 'the series drew a mark for each of its days').toBeGreaterThan(0);

  const firstOpenedMark = at(openedLabels, 0, 'the opened series’ first mark');
  expect(
    firstOpenedMark,
    'each date mark names the series, the day and the count it draws, then the action it performs',
  ).toMatch(/^Opened, \d{4}-\d{2}-\d{2}: \d+\. Narrow the queue to \d{4}-\d{2}-\d{2}$/u);

  /*
   * The mark narrows the queue rather than opening a drawer, so it declares no dialog: the gesture
   * leaves this screen and the queue it narrowed is where the reader goes (AAP §0.12.4). The narrowing
   * itself is asserted below, from a mark of a day that counts an exception.
   */
  await expect(
    openedMarks.first(),
    'a date mark opens no dialog, because activating it narrows the queue and leaves the screen',
  ).not.toHaveAttribute('aria-haspopup', 'dialog');

  const seriesToggle = page.getByRole('button', {
    name: 'View as table: Exceptions opened and resolved per day',
  });
  await expect(seriesToggle).toBeVisible();
  await seriesToggle.click();

  const seriesTableView = page.getByRole('table', {
    name: 'Exceptions opened and resolved per day, as a table',
    exact: true,
  });
  await expect(seriesTableView).toBeVisible();

  const openedValues = await tableColumnValues(seriesTableView, 'Opened');
  const openedCounts = openedValues.map((value, index) =>
    countIn(value, `the series table’s opened column, row ${index + 1}`),
  );

  expect(
    openedCounts,
    'the series’ table view carries the counts its marks draw',
  ).toEqual(markCounts(openedLabels, 'the opened series'));

  const seriesRows = await tableDataRows(seriesTableView);
  const tableDays: string[] = [];

  for (const [index, row] of seriesRows.entries()) {
    tableDays.push(
      dayOfQueueDateControl(
        await textOf(row.getByRole('button', { name: /^Narrow the queue to /u })),
        `the series table’s date control, row ${index + 1}`,
      ),
    );
  }

  expect(
    tableDays,
    'the series’ table view carries the days its marks draw, in the same order',
  ).toEqual(openedLabels.map((label) => dayOfMarkLabel(label, 'an opened series mark')));

  /*
   * A day of the series narrows the queue to that day (AAP §0.12.4's "14 days whose dates filter the
   * queue"), and two controls perform it: the date cell of the series' table view, taken here, and the
   * chart's own mark of that day, taken further down. Neither opens a drawer — the gesture leaves this
   * screen, and a drawer opened beside it could never be read — and the figure keeps its evidence in the
   * table view's counts beside this cell.
   *
   * The day is the row's own: the control names the action and the day, and both the day the queue's day
   * row prints and the day this case narrows to are read from that control rather than written here, so
   * the case types neither a date nor a count (rule P-6). Every row of the table is on screen, so the
   * first row that counts an opened exception is the one used. The narrowing is then asserted as the
   * reader gets it — a non-empty strict subset of the rows the same persona saw before the day was
   * chosen — and clearing it restores exactly that set, which is the other half of rule P-8: the control
   * that ends the narrowing performs its function rather than merely closing the row that states it.
   */
  const activeIndex = openedCounts.findIndex((count) => count > 0);

  if (activeIndex === -1) {
    throw new Error('The opened series counts no day, so no row can narrow the queue to one.');
  }

  const activeRow = at(seriesRows, activeIndex, 'the series table’s counted row');
  const dayControl = activeRow.getByRole('button', { name: /^Narrow the queue to /u });

  await expect(
    dayControl,
    'the day’s row carries the control that narrows the queue to that day',
  ).toHaveCount(1);

  const activeDay = dayOfQueueDateControl(
    await textOf(dayControl),
    'the series table’s counted day control',
  );

  await expect(
    dayControl,
    'the day’s control is named for the action it performs and the day it narrows to',
  ).toHaveAccessibleName(`Narrow the queue to ${activeDay}`);

  await dayControl.focus();
  await expect(dayControl, 'the day’s control took the keyboard focus').toBeFocused();
  await dayControl.press('Enter');

  await expect(page, 'activating the day’s control opens the queue').toHaveURL(/\/exceptions$/);
  await waitForQueueRows(page);

  const filterGroup = regionNamed(page, 'Filters');
  const dayRow = filterGroup.getByText(
    new RegExp(`^Opened or resolved on ${escapeRegExp(activeDay)}$`, 'u'),
  );
  await expect(dayRow, 'the queue names the day it was narrowed to').toBeVisible();

  await expect
    .poll(
      async () => {
        const identifiers = (await queueRowPairs(page, 'Exception', 'Plant')).map((pair) => pair[0]);

        return (
          identifiers.length > 0 &&
          identifiers.length < unscopedIdentifiers.length &&
          identifiers.every((identifier) => unscopedIdentifiers.includes(identifier))
        );
      },
      { timeout: POLL_TIMEOUT_MS },
    )
    .toBe(true);

  const clearDay = filterGroup.getByRole('button', { name: 'Clear day' });
  const dayRowCount = (await queueRowPairs(page, 'Exception', 'Plant')).length;

  await clearDay.focus();
  await clearDay.press('Enter');

  await expect
    .poll(
      async () => (await queueRowPairs(page, 'Exception', 'Plant')).length,
      { timeout: POLL_TIMEOUT_MS },
    )
    .toBe(unscopedIdentifiers.length);

  await expect(dayRow, 'the cleared day no longer narrows the queue').toHaveCount(0);

  /*
   * The chart's own mark narrows the same queue: AAP §0.12.4 gives the fourteen days' dates the
   * queue-filtering job, so activating a mark of the series takes the reader to the queue it narrowed
   * and opens no dialog of its own. The mark is the one for the day the table row above states, so the
   * day is read from the page and this case still types neither a date nor a count (rule P-6); the
   * narrowing is asserted as the same strict subset of the unscoped queue, down to the same run of rows
   * the table's date cell produced.
   */
  await primaryNavigation(page).getByRole('link', { name: 'Overview' }).click();
  await expect(page).toHaveURL(/\/overview$/);

  const markedDay = at(tableDays, activeIndex, 'the day the counted series row states');
  const markOfDay = page.getByRole('button', {
    name: new RegExp(`^Opened, ${escapeRegExp(markedDay)}: `, 'u'),
  });

  await expect(markOfDay, 'the day the series table states is drawn as a mark of the chart').toBeVisible();
  await markOfDay.focus();
  await expect(markOfDay, 'the day’s mark took the keyboard focus').toBeFocused();
  await markOfDay.press('Enter');

  await expect(page, 'activating a date mark opens the queue it narrows').toHaveURL(/\/exceptions$/);
  await expect(
    page.getByRole('dialog', { name: 'Evidence', exact: true }),
    'the mark opens no evidence dialog, because its gesture leaves the screen',
  ).toHaveCount(0);
  await waitForQueueRows(page);

  await expect(
    regionNamed(page, 'Filters').getByText(
      new RegExp(`^Opened or resolved on ${escapeRegExp(markedDay)}$`, 'u'),
    ),
    'the queue names the day the mark narrowed to',
  ).toBeVisible();

  await expect
    .poll(
      async () => {
        const identifiers = (await queueRowPairs(page, 'Exception', 'Plant')).map((pair) => pair[0]);

        return (
          identifiers.length > 0 &&
          identifiers.length < unscopedIdentifiers.length &&
          identifiers.every((identifier) => unscopedIdentifiers.includes(identifier))
        );
      },
      { timeout: POLL_TIMEOUT_MS },
    )
    .toBe(true);

  await expect
    .poll(
      async () => (await queueRowPairs(page, 'Exception', 'Plant')).length,
      { timeout: POLL_TIMEOUT_MS },
    )
    .toBe(dayRowCount);

  /* Back to the overview, where the revenue bar of the next block is drawn. */
  await primaryNavigation(page).getByRole('link', { name: 'Overview' }).click();
  await expect(page).toHaveURL(/\/overview$/);

  /*
   * A revenue bar narrows the queue to the plant it draws and takes the reader there.
   *
   * AAP §0.12.4 gives the revenue-at-risk bars the queue-filtering job, so activating one sets the
   * shell's Plant selection and opens the queue that selection produces. The bar declares no dialog and
   * opens none: a drawer opened in the same gesture would be unmounted before it was read, and the
   * figure's evidence stays reachable from the chart's "View as table" grid. The narrowing is asserted
   * where a reader sees it — the top bar's Plant control on the queue the gesture opened.
   *
   * The narrowed queue is asserted as the reader gets it: the queue opens on the chosen plant's
   * population — a strict subset of the rows the same persona saw before the bar was touched, holding
   * every row recorded at that plant — rather than as plant-cell equality, because the plant filter also
   * admits an exception recorded at another plant whose disruption reaches the chosen one, and such a
   * row correctly keeps naming its own plant.
   */
  const plantToNarrow = at(plantIdentifiers, 0, 'the risk-by-plant table’s first plant');
  const plantNameToNarrow = at(plantNames, 0, 'the risk-by-plant table’s first plant name');
  const bar = page.getByRole('button', {
    name: new RegExp(`^${escapeRegExp(plantNameToNarrow)}: `),
  });

  await expect(bar, 'the revenue bar of the first plant is a control').toBeVisible();

  const barDialog = page.getByRole('dialog', { name: 'Evidence', exact: true });
  const plantControl = page
    .getByRole('group', { name: 'Scope filters', exact: true })
    .getByRole('combobox', { name: 'Plant' });

  /* The keyboard path: the mark is reachable, and activating it opens the queue it narrowed. */
  await bar.focus();
  await bar.press('Enter');

  await expect(page, 'activating a revenue bar opens the queue it narrows').toHaveURL(/\/exceptions$/);
  await expect(
    barDialog,
    'a revenue bar opens no evidence dialog, because its gesture leaves the screen',
  ).toHaveCount(0);
  await expect(
    plantControl,
    'the queue opens with the shell’s Plant control showing the plant the bar draws',
  ).toHaveValue(plantToNarrow);

  await waitForQueueRows(page);

  await expect
    .poll(
      async () => {
        const identifiers = (await queueRowPairs(page, 'Exception', 'Plant')).map(
          (pair) => pair[0],
        );

        return (
          identifiers.length > 0 &&
          identifiers.length < unscopedIdentifiers.length &&
          identifiers.every((identifier) => unscopedIdentifiers.includes(identifier))
        );
      },
      { timeout: POLL_TIMEOUT_MS },
    )
    .toBe(true);

  const narrowedPairs = await queueRowPairs(page, 'Exception', 'Plant');
  const narrowedIdentifiers = narrowedPairs.map((pair) => pair[0]);

  for (const pair of narrowedPairs) {
    expect(
      unscopedPlants,
      `${pair[1]} is one of the plants the queue showed before the bar narrowed it`,
    ).toContain(pair[1]);
  }

  for (const pair of unscoped.filter((entry) => entry[1] === plantToNarrow)) {
    expect(
      narrowedIdentifiers,
      `the row recorded at ${plantToNarrow} survives the bar that narrows to it`,
    ).toContain(pair[0]);
  }

  /*
   * The pointer path: back to the overview, where the narrowed scope still draws that plant's bar, and
   * the same mark taken the way a reader without a keyboard takes it. The mark's whole row is its
   * pointer target — the row it draws its focus ring across, and the row its `cursor-pointer` affordance
   * describes — so the click is aimed at the mark itself: Playwright aims at the centre of an element's
   * box, which on this row is a point the bar does not paint.
   */
  await primaryNavigation(page).getByRole('link', { name: 'Overview' }).click();
  await expect(page).toHaveURL(/\/overview$/);

  await bar.click();

  await expect(
    page,
    'a pointer click takes the reader to the queue the bar narrows',
  ).toHaveURL(/\/exceptions$/);
  await expect(barDialog, 'the pointer path opens no evidence dialog either').toHaveCount(0);
  await expect(
    plantControl,
    'the pointer path narrows the shell’s Plant selection to the same plant',
  ).toHaveValue(plantToNarrow);
});

/* ---------------------------------------------------------------------------------------------
 * SCR-01's primary action
 * ------------------------------------------------------------------------------------------- */

/**
 * The overview's one primary action opens the exception queue.
 *
 * Rule P-8's other half: a control a screen exists to offer performs its function. The button is
 * located by its accessible name and activated as a reader would, and the queue it opens is asserted
 * through the route, the screen's heading and its first row.
 */
test('the overview’s primary action opens the exception queue', async ({ page }) => {
  await page.goto('/');
  await primaryNavigation(page).getByRole('link', { name: 'Overview' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
  await expect(simulatedDataBadge(page)).toBeVisible();

  await page.getByRole('button', { name: 'Review critical exceptions' }).click();

  await expect(page, 'the primary action opens the exception queue').toHaveURL(/\/exceptions$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Exception queue' })).toBeVisible();
  await waitForQueueRows(page);
});

