/**
 * Acceptance test T-19 and the three descriptive browser tests of the FileMap canvas (SCR-12, stage S2)
 * at `/canvas`: one surface, two lenses, one selection.
 *
 * WHAT THIS FILE DRIVES, AND WHY EACH TEST STARTS WHERE THE APPLICATION LEAVES THE READER. AAP 0.7
 * fixes `/canvas` as the entry route of the four planning personas, so the journey test begins by
 * loading `/` and switching the demonstration role switcher to the head of the supply chain: the
 * assertion that follows is that the application itself lands on `/canvas`, not that a spec knows an
 * address. Nothing here navigates to a route the reader cannot reach, no lever of the suite's own is
 * added to the application, and no test hook, storage seed, query parameter or global is used
 * (AAP 0.7, 0.9; rule P-8 keeps every route reachable from the entry point).
 *
 * T-19's SUBSTANCE IS THE CARRY-ACROSS. `FilemapCanvasScreen` holds one `selectedNodeId` and hands it
 * to both lenses, so a node chosen in the graph lens is the selection the map lens draws and the
 * reverse. The test proves it in both directions and, for every node it touches, re-asserts the
 * selection after the lens has been switched away and back. On the graph lens the selection and the
 * emphasis are stated in words — the drawing's own caption names the traced node, the "Selected" strip
 * names it again, and the frame's table view states every node's place on the path — which is why the
 * assertions read those words rather than a class, a colour or a geometry value (rule B-3, AAP 0.18.2
 * "never assert colour or geometry as a value").
 *
 * WHICH NODES THE CHAIN RESOLVES TO. T-19's specification row speaks of "the three named materials and
 * the one supplier", and the canvas carries both families: the topology names a material as a node of
 * its own (AAP 0.7, 0.12.2), the graph lens draws each one in the Materials lane, and the lanes a
 * material carries on to the plants that build its product place it upstream of the plant the selected
 * exception lands on. The chain this test walks is therefore the one the row names, read from the
 * rendered graph: the three materials the trace marks and the supplier it reaches. Nothing stands in for
 * them, so no `GAP:` is recorded against the node families any more; the one gap the file still records
 * is the selection that reaches no exception, which is asserted at the assertion that states it.
 *
 * WHAT IS DELIBERATELY NOT ASSERTED HERE. The request-origin property is T-20's
 * (`e2e/network-origin.spec.ts`), the seven screen states are T-17's, and the competitive atlas screen
 * is T-21's; this file asserts only the market-intelligence labelling that the canvas itself draws.
 * No figure, amount, identifier, material, supplier, plant or product name is typed into this file:
 * every name it asserts is read back from the rendered canvas, and every ordering it checks compares
 * rendered values with each other (rule P-6). The literals below are four kinds and no more: interface
 * copy the specification or AAP fixes (`Simulated calculation`, `Arrives in stage S4`, the region and
 * control labels), the sizes the AAP fixes for this surface (six ribbon tiles, three zoom levels, five
 * presets, four urgent exceptions, five audit events, one theme-independent selection), the `Severity`
 * union's own member words, and the family words the drawing prints.
 *
 * THE PERSONA EVERY TEST RUNS AS. All of them read the surface as the head of supply chain, USR-03:
 * the canvas is that persona's entry route (AAP 0.7, 0.12.4), and the permission matrix grants it
 * `exception.read` — the canvas, its ribbon and its queue — together with `audit.read`, the trail the
 * dock's events half shows. The ribbon, the stack and the dock are therefore read as the persona whose
 * entry route the canvas is, and no second persona is reached through the navigation to read them.
 *
 * RULES THIS FILE SERVES.
 * - P-1: the persistent `Simulated data` badge is asserted on the route, each of the ribbon's six
 *   tiles carries `Simulated calculation`, and the dock's projected series carries it too.
 * - P-2: the topology reaches both lenses through the service boundary; this file imports no seed
 *   module, no mock adapter and no API client, and it names no record of its own.
 * - P-6: every name, count and value asserted is read from the DOM, and every comparison is between
 *   rendered values.
 * - P-8: `Open part` is asserted disabled with exactly `Arrives in stage S4`, by its description and
 *   not by a forced click, and every other control this file activates is one that acts.
 * - P-5: every market-intelligence element the canvas draws carries its own fixed label, every
 *   competitor name is tagged a synthetic company, and the first-party table view of the map carries
 *   no competitor row.
 * - B-3: controls are reached by role and accessible name and activated from the keyboard where the
 *   requirement is that they are operable that way; the pin states are asserted as an icon beside a
 *   label, never as a colour; nothing is asserted about pixel geometry.
 * - B-1, B-2: no address, host or origin is named and no configuration or credential is read.
 * - P-7: the product's own vocabulary only — the FileMap canvas — and every company, plant and place
 *   name printed is the payload's own.
 */
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { switchRole } from './helpers/role';

/* ---------------------------------------------------------------------------------------------
 * The interface copy this suite holds the canvas to
 * ------------------------------------------------------------------------------------------- */

/** The demonstration-wide label AAP 0.10 requires on every route (rule P-1). */
const SIMULATED_DATA = 'Simulated data';

/** The §5.3 label every computed figure carries, the ribbon's six tiles and the dock's series among them. */
const SIMULATED_CALCULATION = 'Simulated calculation';

/** The §5.3 label the audit trail carries wherever the canvas shows it (rule P-4). */
const SIMULATED_CONTROL = 'Simulated control';

/** The §5.3 label every market-intelligence element carries (rule P-5). */
const MARKET_INTELLIGENCE = 'Simulated market intelligence';

/** The companion tag every competitor name carries (rule P-5). */
const SYNTHETIC_COMPANY = 'Synthetic company';

/**
 * The exact stage tooltip the disabled `Open part` control carries — AAP 0.12.4 and rule P-8 fix it
 * character for character, so it is quoted here rather than paraphrased.
 */
const STAGE_FOUR_REASON = 'Arrives in stage S4';

/** The region names the canvas's ribbon, its two lenses and its stack declare. */
const RIBBON_REGION = 'Canvas ribbon';
const MAP_REGION = 'Network map';
const GRAPH_REGION = 'Dependency graph';
const STACK_REGION = 'Urgent exceptions and product health';
const DOCK_REGION = 'Timeline';

/** The controls that switch lens, wall mode and the map's view (AAP 0.12.4). */
const MAP_LENS = 'Map lens';
const GRAPH_LENS = 'Graph lens';
const ENTER_WALL_MODE = 'Enter wall mode';
const EXIT_WALL_MODE = 'Exit wall mode';
const ZOOM_GROUP = 'Zoom level';
const ZOOM_IN = 'Zoom in';
const ZOOM_OUT = 'Zoom out';
const PRESET_GROUP = 'Map view';
const VIEW_AS_TABLE = /^View as table/;
const VIEW_AS_CHART = /^View as chart/;

/**
 * The screen's one primary action, on screen whatever the selection is: it investigates the exception
 * the selection resolves to, and states why it cannot act while the selection reaches none (rule P-8).
 */
const INVESTIGATE = 'Investigate selected exception';

/**
 * The exact sentence the primary action carries while the selected node answers no exception.
 *
 * It is `FILEMAP_CANVAS_TEXT.primaryActionUnavailable` — the screen's own wording, naming the node to
 * select and why a plant is that node — so it is quoted here character for character rather than
 * paraphrased, the way {@link STAGE_FOUR_REASON} quotes the one fixed stage string.
 */
const INVESTIGATE_BLOCKED_REASON =
  'Select a plant node on the canvas: an exception names the plant the disruption lands on, so a plant is the node this action can investigate.';

/** The disabled control the graph lens carries for the stage that owns a part's own screen. */
const OPEN_PART = 'Open part';

/** The pin-state key the graph lens prints beside its drawing (rule B-3). */
const PIN_KEY = 'Pin states in this view';

/**
 * The five view presets, in the order the lens offers them, as their controls print them.
 *
 * These are the drawing's own labels (`MAP_VIEW_PRESET_LABELS`), and the requirement is that five
 * presets exist as named controls, so the names are this suite's expectation rather than a reading of
 * the component.
 */
const PRESET_LABELS = [
  'World',
  'Europe',
  'Americas',
  'Asia-Pacific',
  'Africa and Middle East',
] as const;

/**
 * The four severity members in the order the urgency aggregate ranks them.
 *
 * Vocabulary, not record data: `Severity` is the contracts' own union and `sortUrgent` ranks it
 * critical first, so the stack's order is checked against the ranking the application documents
 * instead of against a copy of any record.
 */
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

/** The family words the graph lens prints in its table view, which its own drawing announces too. */
const FAMILY_SUPPLIER = 'Supplier';
const FAMILY_MATERIAL = 'Material';

/** The sentence a lane the payload carries no nodes for states, so only the Lines stage may show it. */
const EMPTY_LANE = 'No nodes in this view.';

/** The path column's words: the selection, the two directions of the traced chain, and its complement. */
const PATH_SELECTED = 'Selected node';
const PATH_UPSTREAM = 'Upstream';
const PATH_DOWNSTREAM = 'Downstream';
const PATH_NONE = 'Not on the path';

/** The captions of the stack's per-exception readings, as the card prints them. */
const CAPTION_SEVERITY = 'Severity';
const CAPTION_DAYS_TO_IMPACT = 'Days to impact';
const CAPTION_REVENUE = 'Revenue at risk';

/**
 * The caption a product health card's figure carries, in the composed form the canvas states it.
 *
 * A card shows one urgent exception row's own revenue at risk: the port declares no per-product
 * aggregate and the screen sums nothing (rule P-6), so the caption names the exception whose amount
 * is displayed instead of reading as the product's total.
 */
const CAPTION_PRODUCT_REVENUE = /^Revenue at risk on exception \S+$/u;

/** The stack's two named groups and the dock's own captions. */
const URGENT_GROUP = 'Most urgent exceptions';
const HEALTH_GROUP = 'Product health';
const INSIGHTS_SELECTED = 'Selected exception';
const DOCK_STOCK = 'Projected stock';
const DOCK_EVENTS = /Latest audit events/;

/** The table views' captions, which are also their accessible names (rule B-3). */
const GRAPH_TABLE_CAPTION = 'Dependency graph nodes by lane';
const MAP_TABLE_CAPTION = 'FileMap canvas nodes, with family, connected nodes and evidence pins';

/** The lens caption's prefix, so the lens in view is read as words rather than inferred from a class. */
const LENS_CAPTION_PREFIX = 'Lens in view:';

/** The drawer the evidence triggers open, and the control that closes it. */
const EVIDENCE_DIALOG = 'Evidence';
const CLOSE_DRAWER = 'Close';

/**
 * The drawer's four section captions, in the order it renders them, and the refusal that marks a
 * drawer whose read failed.
 *
 * A composed `canvas:<key>` reference names an aggregate rather than a record, and the evidence read
 * answers that family with the aggregate's own output, so all four sections are what a ribbon figure
 * must show (AAP 0.2.1 F12, principle PR-6). Both strings are restated here because a browser spec
 * compares rendered text.
 */
const EVIDENCE_SECTIONS: readonly string[] = [
  'Value and formula',
  'Source, record and time',
  'Inputs, upstream and downstream',
  'Confidence, missing inputs and documents',
];
const UNRESOLVED_REFERENCE = 'No record family answers the reference';

/* ---------------------------------------------------------------------------------------------
 * The personas this file drives
 * ------------------------------------------------------------------------------------------- */

/**
 * The persona every test begins as: the head of supply chain, for whom AAP 0.7 fixes `/canvas` as the
 * entry route, which is why the tests can assert that the application itself lands there.
 *
 * It is also the persona holding both permissions the surface's halves need — `exception.read` for the
 * canvas, its ribbon and its queue, and `audit.read` for the trail the dock's events half shows — so
 * the ribbon, the stack and the dock are read as the persona whose entry route the canvas is.
 */
const CANVAS_PERSONA = 'USR-03';

/* ---------------------------------------------------------------------------------------------
 * Reading the page — role and accessible name first, structure only to read a value
 * ------------------------------------------------------------------------------------------- */

/** Escapes a rendered record's own text so it can be matched literally inside a regular expression. */
function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Loads the application and switches the demonstration role switcher to `persona`, then asserts that
 * the application reached the entry route AAP 0.12.4 fixes for that persona.
 *
 * A switch to the persona already in force is a no-op in the helper, and `/` has by then already sent
 * the session to that persona's entry route, so both paths end at the same assertion.
 */
async function landAs(page: Page, persona: string, entryRoute: RegExp): Promise<void> {
  await page.goto('/');
  await switchRole(page, persona);
  await expect(page).toHaveURL(entryRoute, { timeout: 30_000 });
}

/**
 * The badge every route carries (rule P-1), matched by role and by the start of its accessible name so
 * the assertion does not depend on the demonstration clock it also prints.
 */
function simulatedDataBadge(page: Page): Locator {
  return page.getByRole('button', { name: new RegExp(`^${SIMULATED_DATA} `) });
}

/** The figure the CANVAS region draws, matched by its caption rather than by position. */
function frameOf(page: Page, caption: string): Locator {
  return page.locator('figure').filter({ hasText: caption });
}

/** The graph lens's drawing: the `svg` whose accessible name is the lens's own title. */
function graphDrawing(page: Page): Locator {
  return page.getByRole('group', { name: GRAPH_REGION, exact: true });
}

/** The map lens's drawing: the `svg` whose accessible name is the lens's own title. */
function mapDrawing(page: Page): Locator {
  return page.getByRole('group', { name: MAP_REGION, exact: true });
}

/**
 * One node of the graph lens, located by its accessible name — its label, its family and its whole pin
 * summary — so a node is a control a reader would name rather than an index into the drawing.
 */
function graphNode(page: Page, label: string): Locator {
  const family = '(?:Tier-2 origin|Supplier|Material|Plant|Customer)';
  return graphDrawing(page).getByRole('button', {
    name: new RegExp(`^${escaped(label)}, ${family} node`),
  });
}

/** One node of the map lens, located the same way through its own accessible name. */
function mapNode(page: Page, label: string): Locator {
  return mapDrawing(page)
    .getByRole('group', { name: 'Network nodes' })
    .getByRole('button', {
      name: new RegExp(`^${escaped(label)}, (?:Plant|Supplier|Material|Tier-2 origin|Customer)\\.`),
    });
}

/** The control that switches the canvas to a lens, by its visible label. */
function lensControl(page: Page, lens: string): Locator {
  return page.getByRole('button', { name: lens, exact: true });
}

/** The caption that states which lens is on screen, in words rather than in colour (rule B-3). */
function lensCaption(page: Page, lens: string): Locator {
  return page.getByText(`${LENS_CAPTION_PREFIX} ${lens}`, { exact: true });
}

/** One row of a chart frame's table view, as text. */
interface TableRowReading {
  readonly cells: readonly string[];
}

/** Every body row of a table view, each cell's text, in the order the table renders them. */
async function tableRows(table: Locator): Promise<readonly TableRowReading[]> {
  const rows = table.locator('tbody tr');
  const total = await rows.count();
  const readings: TableRowReading[] = [];

  for (let index = 0; index < total; index += 1) {
    const cells = rows.nth(index).locator('td');
    const count = await cells.count();
    const texts: string[] = [];

    for (let cell = 0; cell < count; cell += 1) {
      texts.push((await cells.nth(cell).innerText()).trim());
    }

    readings.push({ cells: texts });
  }

  return readings;
}

/** One node of the graph lens, as its table view states it. */
interface GraphNodeReading {
  readonly lane: string;
  readonly label: string;
  readonly family: string;
  readonly path: string;
}

/**
 * Reads the graph lens's table view as node readings.
 *
 * The table is the drawing's own text: one row per node, in lane order, with the node's label, its
 * family, its pin summary and its place on the traced path. Reading it is how this suite knows which
 * nodes the chain reaches without importing a record or typing a name (rule P-6).
 */
async function graphNodes(table: Locator): Promise<readonly GraphNodeReading[]> {
  const rows = await tableRows(table);
  const readings: GraphNodeReading[] = [];

  for (const row of rows) {
    const [lane, label, family, , path] = row.cells;

    if (
      lane === undefined ||
      label === undefined ||
      family === undefined ||
      path === undefined
    ) {
      continue;
    }

    readings.push({ lane, label, family, path });
  }

  return readings;
}

/**
 * The integer a money cell states, read from the rendered text.
 *
 * `MonoValue` formats an amount with the Eurozone grouping Europe/Berlin business figures are read
 * with and the currency as a code (`1.512.800 EUR`), and the evidence trigger's suffix may follow it
 * inside the same cell, so the comparison strips everything that is not part of the amount and reads
 * the whole part. Nothing is computed from a figure of this suite's own: the number compared is the
 * one on screen.
 */
function amountIn(text: string): number {
  const amount = text.replace(/[^\d.,]/g, '');
  const [whole] = amount.split(',');

  return Number((whole ?? '').replace(/\./g, ''));
}

/** The first run of digits in a rendered identifier, so two rendered identifiers can be ordered. */
function sequenceIn(text: string): number {
  const digits = text.replace(/[^\d]/g, '');

  return digits === '' ? Number.NaN : Number(digits);
}

/** The value a definition list states beneath one of its captions, in a card or a detail panel. */
function fieldValue(scope: Locator, caption: string): Locator {
  return scope.locator(
    `xpath=.//dt[normalize-space(.)="${caption}"]/following-sibling::dd[1]`,
  );
}

/** The explanation a control gives for not acting, read from the element its `aria-describedby` names. */
async function disabledReason(page: Page, control: Locator): Promise<string> {
  const describedBy = (await control.getAttribute('aria-describedby')) ?? '';
  const texts: string[] = [];

  for (const id of describedBy === '' ? [] : describedBy.split(/\s+/)) {
    texts.push((await page.locator(`[id="${id}"]`).innerText()).trim());
  }

  return texts.join(' ').replace(/\s+/g, ' ').trim();
}

/** The country outlines' own path data in the map lens, which changes whenever the view is reframed. */
async function mapGeometry(page: Page): Promise<string> {
  const countryPath = mapDrawing(page).locator('path').first();
  await expect(countryPath).toBeAttached();

  return (await countryPath.getAttribute('d')) ?? '';
}

/* ---------------------------------------------------------------------------------------------
 * T-19 — one selection, two lenses
 * ------------------------------------------------------------------------------------------- */

test('T-19 a node selected in one lens is the selection the other lens carries', async ({ page }) => {
  test.setTimeout(120_000);

  await landAs(page, CANVAS_PERSONA, /\/canvas$/);
  await expect(simulatedDataBadge(page)).toBeVisible({ timeout: 30_000 });

  /* The canvas opens on the map lens, which is what makes the switch that follows a reader's choice
     rather than the only state the screen can draw (AAP 0.12.4). */
  await expect(lensCaption(page, MAP_LENS)).toBeVisible({ timeout: 30_000 });

  await lensControl(page, GRAPH_LENS).click();
  await expect(lensCaption(page, GRAPH_LENS)).toBeVisible();

  /* The selection the canvas resolves on opening reaches the exception the dock projects: the primary
     action is offered and the dock names the record behind the projection (AAP 0.12.4). */
  const dock = page.getByRole('region', { name: DOCK_REGION });
  await expect(dock).toBeVisible();
  await expect(dock.getByText(INSIGHTS_SELECTED, { exact: true })).toBeVisible();
  await expect(dock.getByText(DOCK_STOCK, { exact: true })).toBeVisible();
  await expect(dock.getByText(SIMULATED_CALCULATION).first()).toBeVisible();
  await expect(page.getByRole('button', { name: INVESTIGATE })).toBeVisible();

  /* The drawing's own caption states the emphasis in words, so the selection is legible without
     reading a colour (rule B-3). */
  const graphFrame = frameOf(page, GRAPH_REGION);
  await expect(graphFrame.getByText(/Emphasis traces the upstream and downstream path of /)).toBeVisible();

  /* One row per node the drawing marks: the count is taken from the drawing before the table replaces
     it, because the frame unmounts the surface while the table is up. */
  const drawnNodes = await graphDrawing(page).getByRole('button').count();
  await graphFrame.getByRole('button', { name: VIEW_AS_TABLE }).click();

  const graphTable = graphFrame.getByRole('table');
  await expect(graphTable).toBeVisible();
  await expect(graphTable.locator('caption')).toHaveText(GRAPH_TABLE_CAPTION);

  const nodes = await graphNodes(graphTable);
  expect(nodes.length).toBe(drawnNodes);

  await graphFrame.getByRole('button', { name: VIEW_AS_CHART }).click();
  await expect(graphTable).toHaveCount(0);

  /* The chain the test walks, read from the rendered table: the plant the exception lands on, the three
     materials the trace marks upstream of it, and the one supplier the trace reaches. */
  const selectedRows = nodes.filter((node) => node.path === PATH_SELECTED);
  expect(selectedRows).toHaveLength(1);

  const plant = selectedRows[0];

  if (plant === undefined) {
    throw new Error(
      'T-19: the canvas opened with no node selected, so the chain of the selected exception cannot be read.',
    );
  }

  const upstream = nodes.filter((node) => node.path === PATH_UPSTREAM);
  expect(upstream.length).toBeGreaterThan(0);

  const materials = upstream.filter((node) => node.family === FAMILY_MATERIAL).slice(0, 3);
  const supplier = upstream.find((node) => node.family === FAMILY_SUPPLIER);
  expect(materials.length).toBe(3);
  expect(supplier).toBeDefined();

  /* The Materials lane is a lane of nodes now: each material the trace marks is drawn in it, so the
     column no longer states that it holds none. The one stage this payload carries no node for is
     Lines, whose records belong to S4, so that column is the only place the note is left. */
  await expect(graphFrame.getByText('Materials', { exact: true })).toBeVisible();
  await expect(graphFrame.getByText(EMPTY_LANE)).toHaveCount(1);

  for (const material of materials) {
    await expect(graphNode(page, material.label)).toHaveCount(1);
  }

  const chain = [...materials, ...(supplier === undefined ? [] : [supplier])];

  /* Every node of the chain is chosen in the graph lens, drawn by the map lens, and found again as the
     selection once the graph lens is back: the carry-across is asserted in both directions, and the
     selection is re-read after each switch rather than assumed to have survived it. */
  for (const node of chain) {
    await graphNode(page, node.label).first().click();
    await expect(graphFrame.getByText(node.label, { exact: true }).last()).toHaveText(node.label);
    /* The frame's own caption states the selection in words, so every node of the chain — the three
       materials included — is proven to be the selection rather than merely present in the drawing
       (rule B-3). */
    await expect(
      graphFrame.getByText(
        new RegExp(`^Emphasis traces the upstream and downstream path of ${escaped(node.label)};`),
      ),
    ).toBeVisible();

    await lensControl(page, MAP_LENS).click();
    await expect(lensCaption(page, MAP_LENS)).toBeVisible();
    await expect(mapNode(page, node.label)).toHaveCount(1);

    await lensControl(page, GRAPH_LENS).click();
    await expect(lensCaption(page, GRAPH_LENS)).toBeVisible();
    await expect(graphFrame.getByText(node.label, { exact: true }).last()).toHaveText(node.label);
    await expect(
      graphFrame.getByText(
        new RegExp(`^Emphasis traces the upstream and downstream path of ${escaped(node.label)};`),
      ),
    ).toBeVisible();
  }

  /* The canvas opens the selection on a plant, which is the selection that reaches an exception. A
     supplier, a material, an origin and a customer carry no member of an exception row to join on, so a
     non-plant selection reaches no exception: the dock states that gap instead of projecting one, and
     the primary action cannot act — so it stays on screen, reports itself unavailable and carries the
     sentence that names the node to select, instead of vanishing and leaving a reader with no path
     forward (rule P-8). Both are asserted here as the screen's own component suite asserts them. */
  await expect(page.getByRole('region', { name: DOCK_REGION })).toHaveCount(0);

  const blockedInvestigate = page.getByRole('button', { name: INVESTIGATE, exact: true });

  await expect(blockedInvestigate).toHaveCount(1);
  await expect(blockedInvestigate).toHaveAttribute('aria-disabled', 'true');
  await blockedInvestigate.focus();
  await expect(blockedInvestigate).toBeFocused();
  expect(await disabledReason(page, blockedInvestigate)).toBe(INVESTIGATE_BLOCKED_REASON);

  /* The activation is refused rather than performed: the reader is answered and stays where they were. */
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/canvas$/);

  /* The other direction: a node chosen in the map lens is the selection the graph lens marks, which is
     what makes the carry-across symmetric rather than one-way. The plant is chosen in the map, and the
     graph lens is asked to state it as the selection. */
  await lensControl(page, MAP_LENS).click();
  await expect(lensCaption(page, MAP_LENS)).toBeVisible();
  /* Activated from the keyboard rather than by a pointer: a node's label is drawn beside its mark and a
     neighbour's label can lie over it, so the keyboard is both the accessible path and the reliable one
     (rule B-3 — the node is a focus stop that answers Enter). */
  const plantOnMap = mapNode(page, plant.label);
  await plantOnMap.focus();
  await expect(plantOnMap).toBeFocused();
  await page.keyboard.press('Enter');

  await lensControl(page, GRAPH_LENS).click();
  await expect(lensCaption(page, GRAPH_LENS)).toBeVisible();
  await expect(graphFrame.getByText(plant.label, { exact: true }).last()).toHaveText(plant.label);

  /* Back on the plant, the selection reaches the exception again and the dock returns to it. */
  await expect(page.getByRole('region', { name: DOCK_REGION })).toBeVisible();
  await expect(page.getByRole('button', { name: INVESTIGATE })).toBeVisible();

  await graphFrame.getByRole('button', { name: VIEW_AS_TABLE }).click();
  const reselected = await graphNodes(graphFrame.getByRole('table'));
  const markedSelected = reselected.filter((node) => node.path === PATH_SELECTED);

  expect(markedSelected).toHaveLength(1);
  expect(markedSelected[0]?.label).toBe(plant.label);
  expect(reselected.some((node) => node.path === PATH_UPSTREAM)).toBe(true);
  expect(reselected.some((node) => node.path === PATH_NONE)).toBe(true);
});

/* ---------------------------------------------------------------------------------------------
 * The ribbon, the right stack and the dock
 * ------------------------------------------------------------------------------------------- */

test('the ribbon, the right stack and the dock report one selection', async ({ page }) => {
  test.setTimeout(120_000);

  await landAs(page, CANVAS_PERSONA, /\/canvas$/);
  await expect(simulatedDataBadge(page)).toBeVisible({ timeout: 30_000 });

  /* The ribbon: six computed tiles, each labelled with the §5.3 string and each opening its own
     evidence (rule P-1, principle PR-6). */
  const ribbon = page.getByRole('group', { name: RIBBON_REGION });
  const tiles = ribbon.getByRole('region');
  await expect(tiles).toHaveCount(6, { timeout: 30_000 });

  for (let index = 0; index < 6; index += 1) {
    const tile = tiles.nth(index);

    await expect(tile.getByText(SIMULATED_CALCULATION)).toBeVisible();

    const trigger = tile.getByRole('button');
    await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');

    await trigger.click();
    const drawer = page.getByRole('dialog', { name: EVIDENCE_DIALOG, exact: true });
    await expect(drawer).toBeVisible();

    if (index === 0) {
      /* One of the six is read in full: the tile's reference is the composed `canvas:<key>` form, and
         the evidence read answers it with the aggregate's own output, so the drawer states all four of
         its sections and reports no unresolved reference (AAP 0.2.1 F12, principle PR-6). */
      for (const section of EVIDENCE_SECTIONS) {
        await expect(
          drawer.getByRole('region', { name: section }),
          `the ribbon figure's evidence states its “${section}” section`,
        ).toBeVisible();
      }

      await expect(drawer).not.toContainText(UNRESOLVED_REFERENCE);
    }

    await drawer.getByRole('button', { name: CLOSE_DRAWER, exact: true }).click();
    await expect(drawer).toHaveCount(0);
  }

  /* The right stack: the four most urgent exceptions, in the order the urgency aggregate fixes, read
     from the severity, the days to impact and the revenue each card prints. */
  const urgent = page.getByRole('region', { name: URGENT_GROUP });
  const cards = urgent.locator('article');
  await expect(cards).toHaveCount(4);

  const readings: { severity: string; days: number; revenue: number }[] = [];

  for (let index = 0; index < 4; index += 1) {
    const card = cards.nth(index);
    const severity = (await fieldValue(card, CAPTION_SEVERITY).innerText()).trim();
    const days = Number((await fieldValue(card, CAPTION_DAYS_TO_IMPACT).innerText()).trim());
    const revenue = amountIn(await fieldValue(card, CAPTION_REVENUE).innerText());

    expect(SEVERITY_ORDER).toContain(severity);
    expect(Number.isNaN(days)).toBe(false);
    expect(Number.isNaN(revenue)).toBe(false);

    readings.push({ severity, days, revenue });
    await expect(card.getByText(SIMULATED_CALCULATION)).toBeVisible();
  }

  for (let index = 1; index < readings.length; index += 1) {
    const previous = readings[index - 1];
    const current = readings[index];

    if (previous === undefined || current === undefined) {
      continue;
    }

    const previousRank = SEVERITY_ORDER.findIndex((level) => level === previous.severity);
    const currentRank = SEVERITY_ORDER.findIndex((level) => level === current.severity);

    expect(currentRank).toBeGreaterThanOrEqual(previousRank);

    if (currentRank === previousRank) {
      expect(current.days).toBeGreaterThanOrEqual(previous.days);
    }

    if (currentRank === previousRank && current.days === previous.days) {
      expect(current.revenue).toBeLessThanOrEqual(previous.revenue);
    }
  }

  /* One health card per product, each labelled with the computed figure it shows. */
  const health = page.getByRole('region', { name: HEALTH_GROUP });
  const productCards = health.locator('article');
  expect(await productCards.count()).toBeGreaterThan(0);

  const headings = await health.locator('article h2').allInnerTexts();
  expect(new Set(headings).size).toBe(headings.length);

  for (let index = 0; index < headings.length; index += 1) {
    const card = productCards.nth(index);
    await expect(card.getByText(CAPTION_PRODUCT_REVENUE)).toBeVisible();
    await expect(card.getByText(SIMULATED_CALCULATION)).toBeVisible();
  }

  /* The dock: the selected exception's projected series, labelled, and the five latest events in the
     order the trail returns them, under the label the audit surface carries (rules P-1, P-4). */
  const dock = page.getByRole('region', { name: DOCK_REGION });
  await expect(dock).toBeVisible();
  await expect(dock.getByText(INSIGHTS_SELECTED, { exact: true })).toBeVisible();
  await expect(dock.getByText(DOCK_STOCK, { exact: true })).toBeVisible();
  await expect(dock.getByText(SIMULATED_CALCULATION).first()).toBeVisible();

  const trail = dock.getByRole('region', { name: DOCK_EVENTS });
  await expect(trail.getByText(SIMULATED_CONTROL, { exact: true })).toBeVisible();

  const events = trail.getByRole('listitem');
  await expect(events).toHaveCount(5);

  const sequences: number[] = [];

  for (let index = 0; index < 5; index += 1) {
    const identifier = await events.nth(index).getByRole('button').first().innerText();
    sequences.push(sequenceIn(identifier));
  }

  expect(sequences.every((value) => !Number.isNaN(value))).toBe(true);

  for (let index = 1; index < sequences.length; index += 1) {
    const previous = sequences[index - 1];
    const current = sequences[index];

    expect(previous).toBeDefined();
    expect(current).toBeDefined();
    expect(current ?? 0).toBeLessThan(previous ?? 0);
  }
});

/* ---------------------------------------------------------------------------------------------
 * The map lens's view: three zoom levels, five presets, and the table view of both lenses
 * ------------------------------------------------------------------------------------------- */

test('the map lens offers three zoom levels and five view presets over one drawing', async ({
  page,
}) => {
  test.setTimeout(120_000);

  await landAs(page, CANVAS_PERSONA, /\/canvas$/);
  await expect(lensCaption(page, MAP_LENS)).toBeVisible({ timeout: 30_000 });

  const zoomGroup = page.getByRole('group', { name: ZOOM_GROUP });
  const presets = page.getByRole('group', { name: PRESET_GROUP });

  await expect(zoomGroup.getByRole('button')).toHaveCount(2);
  await expect(presets.getByRole('button')).toHaveCount(PRESET_LABELS.length);

  /* The widest level: the control that would step back out finds nothing wider to offer, and says so
     rather than resting inert (rule P-8). */
  const widest = zoomGroup.getByRole('button', { name: ZOOM_OUT, exact: true });
  await expect(widest).toHaveAttribute('aria-disabled', 'true');
  expect(await disabledReason(page, widest)).not.toBe('');
  await expect(zoomGroup.getByText('Zoom 1 / 3')).toBeVisible();

  /* Each of the three levels is reachable from the keyboard, and each reframes the drawing: the country
     outlines' own path data is compared before and after, never a pixel measurement. */
  let geometry = await mapGeometry(page);

  for (const level of [2, 3]) {
    const closer = zoomGroup.getByRole('button', { name: ZOOM_IN, exact: true });
    await closer.focus();
    await expect(closer).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(zoomGroup.getByText(`Zoom ${level} / 3`)).toBeVisible();

    const reframed = await mapGeometry(page);
    expect(reframed === geometry, 'the next zoom level did not reframe the drawing').toBe(false);
    geometry = reframed;
  }

  const closest = zoomGroup.getByRole('button', { name: ZOOM_IN, exact: true });
  await expect(closest).toHaveAttribute('aria-disabled', 'true');
  expect(await disabledReason(page, closest)).not.toBe('');

  /* The five presets: named controls of which exactly one is pressed, and a drawing that changes with
     each. The lens opens on the widest preset, so the world's own control is asserted as the pressed
     one first and the other four are the ones that reframe the drawing; returning to the world at the
     end restores the framing it showed, which is what makes a preset a named view rather than a nudge. */
  const worldGeometry = geometry;
  await expect(presets.getByRole('button', { name: PRESET_LABELS[0], exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  for (const preset of PRESET_LABELS.slice(1)) {
    const control = presets.getByRole('button', { name: preset, exact: true });
    await control.focus();
    await expect(control).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(control).toHaveAttribute('aria-pressed', 'true');

    for (const other of PRESET_LABELS) {
      if (other !== preset) {
        await expect(presets.getByRole('button', { name: other, exact: true })).toHaveAttribute(
          'aria-pressed',
          'false',
        );
      }
    }

    const reframed = await mapGeometry(page);
    expect(reframed === geometry, `the "${preset}" preset did not reframe the drawing`).toBe(false);
    geometry = reframed;
  }

  await presets.getByRole('button', { name: PRESET_LABELS[0], exact: true }).click();
  expect(await mapGeometry(page)).toBe(worldGeometry);

  /* The market intelligence the lens overlays stays labelled, and no competitor value reaches the
     first-party table view (rule P-5). */
  expect(
    await page.getByRole('group', { name: new RegExp(`^${MARKET_INTELLIGENCE}`) }).count(),
  ).toBeGreaterThan(0);

  const legendRows = frameOf(page, MAP_REGION).getByRole('listitem');
  const competitorRows = await legendRows.allInnerTexts();
  const labelled = competitorRows.filter((row) => row.includes(MARKET_INTELLIGENCE));

  expect(labelled.length).toBeGreaterThan(0);

  for (const row of labelled) {
    expect(row).toContain(SYNTHETIC_COMPANY);
  }

  /* "View as table" on both lenses, each table carrying the same node set its lens draws. */
  const mapFrame = frameOf(page, MAP_REGION);
  const drawnOnMap = await mapDrawing(page).getByRole('button').count();

  await mapFrame.getByRole('button', { name: VIEW_AS_TABLE }).click();
  const mapTable = mapFrame.getByRole('table');
  await expect(mapTable.locator('caption')).toHaveText(MAP_TABLE_CAPTION);
  expect((await tableRows(mapTable)).length).toBe(drawnOnMap);

  for (const row of await tableRows(mapTable)) {
    for (const cell of row.cells) {
      expect(cell).not.toContain(MARKET_INTELLIGENCE);
      expect(cell).not.toContain(SYNTHETIC_COMPANY);
    }
  }

  await mapFrame.getByRole('button', { name: VIEW_AS_CHART }).click();
  await expect(mapTable).toHaveCount(0);

  await lensControl(page, GRAPH_LENS).click();
  await expect(lensCaption(page, GRAPH_LENS)).toBeVisible();

  const graphFrame = frameOf(page, GRAPH_REGION);
  const drawnOnGraph = await graphDrawing(page).getByRole('button').count();

  await graphFrame.getByRole('button', { name: VIEW_AS_TABLE }).click();
  const graphTable = graphFrame.getByRole('table');
  await expect(graphTable.locator('caption')).toHaveText(GRAPH_TABLE_CAPTION);
  expect((await tableRows(graphTable)).length).toBe(drawnOnGraph);

  await graphFrame.getByRole('button', { name: VIEW_AS_CHART }).click();
  await expect(graphTable).toHaveCount(0);
  await expect(graphDrawing(page).getByRole('button').first()).toBeVisible();
});

/* ---------------------------------------------------------------------------------------------
 * Pins, wall mode, the disabled part action and the primary action
 * ------------------------------------------------------------------------------------------- */

test('nodes carry their pins by state, wall mode hides the navigation, and both onward actions act', async ({
  page,
}) => {
  test.setTimeout(120_000);

  await landAs(page, CANVAS_PERSONA, /\/canvas$/);
  await expect(lensCaption(page, MAP_LENS)).toBeVisible({ timeout: 30_000 });

  await lensControl(page, GRAPH_LENS).click();
  await expect(lensCaption(page, GRAPH_LENS)).toBeVisible();

  const graphFrame = frameOf(page, GRAPH_REGION);

  /* The pin key states the words the node summaries are counted with, and each word carries an icon
     beside it, so a state is never named by a colour alone (rule B-3). */
  const pinKey = graphFrame
    .locator('div')
    .filter({ hasText: PIN_KEY })
    .last();
  const keyText = await pinKey.innerText();
  const states = keyText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && line !== PIN_KEY);

  expect(states.length).toBeGreaterThan(0);
  expect(await pinKey.locator('svg').count()).toBe(states.length);

  /* Every node's own summary is counted in those words, so a badge and the key that explains it cannot
     disagree; a node with no pins says so instead of showing a badge of nothing. */
  const summaries = await graphDrawing(page)
    .getByRole('button')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
  const counted = summaries.filter((summary) => /\d+ evidence pins?:/.test(summary));

  expect(counted.length).toBeGreaterThan(0);

  for (const summary of counted) {
    const names = states.filter((state) => summary.includes(state));
    expect(names.length).toBeGreaterThan(0);
  }

  /* Wall mode: the navigation goes, the top bar and the badge stay, and leaving the mode restores it.
     Both controls are reached from the keyboard, which is how a reader without a pointer enters and
     leaves the mode (rule B-3, rule P-8). */
  const enterWallMode = page.getByRole('button', { name: ENTER_WALL_MODE, exact: true });
  await enterWallMode.focus();
  await expect(enterWallMode).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  await expect(simulatedDataBadge(page)).toBeVisible();
  await expect(page.getByRole('complementary', { name: STACK_REGION })).toHaveCount(0);
  await expect(lensCaption(page, GRAPH_LENS)).toBeVisible();

  const exitWallMode = page.getByRole('button', { name: EXIT_WALL_MODE, exact: true });
  await exitWallMode.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(1);
  await expect(page.getByRole('complementary', { name: STACK_REGION })).toBeVisible();

  /* The part viewer belongs to the stage that owns it, so the control that would open one is visibly
     disabled and explains itself with the exact stage string (rule P-8). */
  const openPart = page.getByRole('button', { name: OPEN_PART, exact: true });
  await expect(openPart).toHaveAttribute('aria-disabled', 'true');
  await openPart.focus();
  await expect(openPart).toBeFocused();
  expect(await disabledReason(page, openPart)).toBe(STAGE_FOUR_REASON);

  /* The one action the surface exists to take reaches the exception the selection resolves to. */
  const investigate = page.getByRole('button', { name: INVESTIGATE, exact: true });
  await expect(investigate).toBeVisible();
  await investigate.click();

  await expect(page).toHaveURL(/\/exceptions\/[^/]+$/);
  await expect(page.getByRole('button', { name: INVESTIGATE, exact: true })).toHaveCount(0);
});
