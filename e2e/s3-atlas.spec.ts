/**
 * T-21 of `platform-specification.md` §9, at the browser-journey level AAP 0.7 assigns it: the
 * competitive atlas of stage S3 labels what is simulated series by series, keeps market intelligence
 * out of every first-party figure, lists the pack's shared crossings and alerts on them, and refuses
 * the external supplier engineer with an explanation the refusal itself supplies. The overlay and the
 * halos the same stage adds to the FileMap canvas are covered in the third test, and the same surface
 * drawn without them is covered in the second, so both halves of one requirement are observed.
 *
 * WHAT THIS FILE COVERS, AND WHAT IT DELIBERATELY LEAVES ALONE. Five tests:
 *
 * 1. `T-21` — SCR-13's surface: the chokepoint alert strip that leads it, the pack banner, the
 *    product-class selector that narrows the drawing and restores the whole pack, the entity selector,
 *    the five-axis radar with a label per series, the legend that keys those series apart, the network
 *    view, the chokepoint table with its overlap, buffer days and contention note, and the radar's
 *    "View as table" reading of the same series.
 * 2. The canvas's first-party surface as the auditor, the persona the pack's read is refused to: what
 *    no first-party figure may carry, and the absence of the overlay and the halos there.
 * 3. The S3 additions on the canvas as a persona the pack's read admits: the competitor overlay, one
 *    legend row per competitor network under the market-intelligence label, and one
 *    market-intelligence caption per crossing the atlas table lists.
 * 4. The refusal the external supplier engineer meets on `/competitive`, and what it explains.
 * 5. The chokepoint brief as a browser-built download.
 *
 * It does not re-assert the canvas's selection behaviour or the seven states (T-19 and T-15 own
 * those), and it does not open the export's payload: the brief's contents are the builder's own
 * suite, and this process has no file access to them.
 *
 * THE CANVAS DRAWS THE OVERLAY WHEN THE PACK'S READ IS ADMITTED. The canvas derives its state from
 * the topology, ribbon and urgent reads alone: the atlas is its one optional read and the audit trail
 * the dock's accessory read, whose refusal states itself inside the dock rather than blanking the
 * surface (`filemap-canvas-screen.tsx`). The head of supply chain therefore sees the competitor
 * overlay and the chokepoint halos on `/canvas`, while the auditor — who may read the trail and not the
 * pack — sees the first-party drawing alone. The second and third tests assert those two states.
 *
 * RULE P-5 IS THE SUBJECT OF TEST 1. Market intelligence is never blended with a first-party record
 * in one number, every competitor element carries the market-intelligence label and every competitor
 * name the competitor tag. The assertions below prove that structurally rather than by counting
 * occurrences of a word: each series carries its own label, no legend key names two families, every
 * chokepoint row states the provenance of the row it prints, and on the canvas the market label
 * reaches only the overlay and the legend that describes it. The competitor tag is asserted as rule
 * P-5 words it — `Synthetic company` — because the rule ranks above AAP 0.10's companion-string row,
 * which pairs the same tag with a different company word; `src/types/primitives.ts` resolves the pair
 * in the rule's favour and the interface renders that constant.
 *
 * WHAT IS READ AND WHAT IS TYPED (rule P-6). No competitor name, resilience score, overlap, buffer-day
 * count or chokepoint name is written here: every one is read from the screen at run time, which is
 * why the assertions compare the page against itself — the legend against the table's headers, the
 * atlas against the canvas — instead of against a figure this file would have to know. What is typed
 * is the fixed vocabulary the inputs fix: the specification's label strings, the pack banner, the
 * screen and region names that give a locator its accessible name, and the permission USR-08 lacks.
 *
 * HOW THE APPLICATION IS REACHED (AAP 0.7, 0.12.4). Only through the visible interface: the
 * document is opened at the application's entry address, the persona is switched with the role
 * switcher through `e2e/helpers/role.ts`, and every route is reached by activating the navigation
 * entry that publishes it. No query parameter, global, storage seed or direct address to a route is
 * used, because the build ships no test hook and this file invents none. Nothing here types a route
 * as a URL either — `baseURL` belongs to `playwright.config.ts`, and the port it derives is the
 * checkout's own.
 *
 * A PAGE LOAD RE-SEEDS THE ADAPTER, so the document is loaded once per test and never again: every
 * later step is a client-side navigation or a control activation, and the mock backend's in-memory
 * state survives it. The adapter adds 150-400 ms to each call and hashes the seeded audit trail at
 * bootstrap, so every wait below is a web-first assertion or an explicit event, never a sleep.
 *
 * Rules this file is written to serve: B-1 (nothing loaded or requested but the preview server's own
 * origin), B-2 (no credential, no configuration read), B-3 (locators are roles, names and captions;
 * the radar is read through its table view rather than its drawn geometry; no colour is asserted),
 * P-1 (the `Simulated data` badge on both routes and the exact label of every figure the tests read),
 * P-2 (the atlas arrives through the service interface, and the refusal is the service's own typed
 * failure — no seed module and no adapter is imported here), P-3 (the refusal is asserted as the card
 * explains it and no server-side enforcement is claimed for it), P-5 (the subject of test 1), P-6 (no
 * figure or record name is typed), P-7 (only the synthetic names the application renders, and the
 * product's own vocabulary) and P-8 (a refused view names its permission, the roles that hold it and
 * the trace id, rather than leaving a blank screen).
 */
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { switchRole } from './helpers/role';

/* ---------------------------------------------------------------------------------------------
 * The fixed vocabulary — every string below is an input's, not this file's
 * ------------------------------------------------------------------------------------------- */

/**
 * The banner naming the simulated market-intelligence pack (AAP 0.10, `ATLAS_PACK_BANNER` in
 * `src/types/primitives.ts`), asserted character for character.
 */
const PACK_BANNER =
  'Simulated market intelligence pack v2026.11. No first-party record is used in any competitor figure.';

/** The label of specification §5.3 that every computed figure carries. */
const SIMULATED_CALCULATION = 'Simulated calculation';

/** The badge label of specification §5.3 that the shell shows on every route (rule P-1). */
const SIMULATED_DATA = 'Simulated data';

/** The label of specification §5.3 that every market-intelligence element carries (rule P-5). */
const MARKET_INTELLIGENCE = 'Simulated market intelligence';

/** The companion label the client's own radar series carries (AAP 0.10). */
const CLIENT_SELF_ASSESSMENT = 'Simulated data: client self-assessment';

/** The tag every competitor name carries, as rule P-5 words it (rule P-5, `COMPETITOR_NAME_TAG`). */
const COMPETITOR_NAME_TAG = 'Synthetic company';

/**
 * How many competitor networks the pack holds.
 *
 * AAP 0.12.4's SCR-13 row fixes the selector as "the client and three competitors" and AAP 0.2.3
 * fixes the same scale for the pack, so this is the input's structural count rather than a value read
 * from a record. It lets an assertion say "one client series and one per competitor" without naming
 * any network.
 */
const COMPETITOR_NETWORKS = 3;

/** The navigation landmark the shell labels, so a route is reached the way a reader reaches it. */
const NAV_LANDMARK = 'Primary';

/** The navigation entries these tests drive. */
const ATLAS_ENTRY = 'Competitive atlas';
const CANVAS_ENTRY = 'FileMap canvas';

/** The level-one heading each screen publishes, which is how a navigation is confirmed to have arrived. */
const ATLAS_TITLE = 'Competitive atlas';
const CANVAS_TITLE = 'FileMap canvas';

/** The banner region's accessible name on SCR-13. */
const BANNER_REGION = 'Market-intelligence pack';

/** The region holding SCR-13's two selector groups. */
const SELECTOR_REGION = 'What the atlas is read for';

/** The selector group of product classes, the caption prefix that restates the choice in words, and
 *  the control that puts every class the pack holds back in view. */
const CLASS_GROUP = 'Product class in view';
const CLASS_CAPTION_PREFIX = 'Product class in view:';
const ALL_CLASSES = 'All product classes';

/** The selector group of the client and the competitor networks. */
const ENTITY_GROUP = 'Entity in view';

/** The card, figure and group of the five-axis resilience radar. */
const RADAR_REGION = 'Resilience radar';
const RADAR_TITLE = 'Resilience scores by axis and series';
const RADAR_GROUP =
  'Resilience scores by series across the radar axes, one polygon per series and no combined score';
const RADAR_TABLE_CAPTION = 'Resilience scores by axis, one column per series';

/** The card, figure and group of the network view. */
const NETWORK_REGION = 'Competitor network view';
const NETWORK_TITLE = 'Sites placed by network';
const NETWORK_GROUP =
  'Competitor networks and the client network in one frame, each family drawn and labelled on its own';

/**
 * The card and table caption of the chokepoint table.
 *
 * The caption is the table's accessible name, and it is quoted character for character: the screen
 * spells "competitor\u2019s" with a typographic apostrophe in its own caption, so the ASCII form would
 * name no table at all and the locator would report a missing surface rather than a wrong word.
 */
const CHOKEPOINT_REGION = 'Shared chokepoints';
const CHOKEPOINT_TABLE_CAPTION =
  'Shared crossings in the pack, with overlap, each competitor\u2019s buffer days and the contention note';

/**
 * The accessible name of the chokepoint alert strip that leads the atlas content (AAP 0.14.1's S3
 * row, AAP 0.7's S3 stage row).
 *
 * It is the heading the band renders, quoted as the region's name so the strip is located by what it
 * says rather than by where it sits, and so a band left unnamed fails instead of passing on a text
 * match somewhere inside it.
 */
const CHOKEPOINT_ALERTS_REGION = 'Chokepoint alerts';

/** The label of the control that swaps a chart for the same data as a table (rule B-3). */
const VIEW_AS_TABLE = 'View as table';

/** The region, lens surface, node group and overlay group of the FileMap canvas, and its ribbon. */
const CANVAS_REGION = 'Canvas';
const MAP_TITLE = 'Network map';
const NODES_GROUP = 'Network nodes';
const OVERLAY_GROUP = `${MARKET_INTELLIGENCE}: competitor sites`;
const RIBBON_REGION = 'Canvas ribbon';

/** The label SCR-13 puts on the one action it exists to take. */
const EXPORT_ACTION = 'Export the chokepoint brief as JSON';

/** The permission `GET /market-intelligence/atlas` requires (AAP 0.12.3, contracts §7.1). */
const COMPETITIVE_READ = 'competitive.read';

/** The heading prefix the forbidden card puts in front of the permission it names. */
const PERMISSION_TITLE_PREFIX = 'Permission required: ';

/**
 * The personas these tests act as.
 *
 * USR-03 is the head of supply chain, the persona contracts §7.1 grants `competitive.read` to whose
 * entry route is the FileMap canvas; USR-08 is the external supplier engineer, whose only permission
 * is `evidence.read` and whose entry route is the evidence workspace; USR-06 is the auditor, who holds
 * the two permissions the FileMap canvas's own reads require — `exception.read` for the topology, the
 * ribbon and the queue, and `audit.read` for the dock — and none for the atlas, which is why the
 * canvas it reads draws the client network alone. None of the three is a figure or a record name: they
 * are the demonstration personas AAP 0.12.4 fixes, and `switchRole` takes them as its argument.
 */
const PERSONA_WITH_ATLAS = 'USR-03';
const PERSONA_WITHOUT_ATLAS = 'USR-08';
const PERSONA_WITH_CANVAS = 'USR-06';

/* ---------------------------------------------------------------------------------------------
 * Shared helpers — reading the page, never asserting for it
 * ------------------------------------------------------------------------------------------- */

/** Collapses runs of whitespace so a rendered string compares as one line. */
function collapse(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * A pattern matching any accessible name that contains `text`, with the text's own metacharacters
 * escaped, so a label holding a colon or a hyphen is matched literally rather than as a pattern.
 */
function mentions(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

/** The rendered text of each element a locator matches, in document order, whitespace collapsed. */
async function textsOf(items: Locator): Promise<string[]> {
  const total = await items.count();
  const texts: string[] = [];

  for (let index = 0; index < total; index += 1) {
    texts.push(collapse(await items.nth(index).innerText()));
  }

  return texts;
}

/**
 * Opens the application at its entry address and waits for the shell's navigation.
 *
 * The address is the application's own root, not a route: `/` redirects to the entry route AAP 0.12.4
 * fixes for the acting persona's role, so this file never names a screen's path to reach it. Waiting
 * for the navigation landmark is what makes the shell — and the adapter's bootstrap behind it —
 * ready before a persona is switched.
 */
async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: NAV_LANDMARK })).toBeVisible();
}

/**
 * Activates a navigation entry and waits for the route and heading it publishes.
 *
 * A disabled entry would make this wait fail rather than silently do nothing, which is the point:
 * every route these tests need is built in this run, so an entry that cannot navigate is a defect
 * the failure names.
 */
async function openThroughNavigation(
  page: Page,
  entry: string,
  url: RegExp,
  heading: string,
): Promise<void> {
  await page.getByRole('navigation', { name: NAV_LANDMARK }).getByRole('link', { name: entry }).click();
  await expect(page).toHaveURL(url);
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
}

/**
 * Opens the competitive atlas as a persona that holds `competitive.read`.
 *
 * The atlas is refused to four of the eight personas, so a spec that opened the route as the load-time
 * persona would be asserting a refusal instead of the atlas; switching first is what makes the screen
 * the subject rather than the denial.
 */
async function openAtlas(page: Page): Promise<void> {
  await openApp(page);
  await switchRole(page, PERSONA_WITH_ATLAS);
  await openThroughNavigation(page, ATLAS_ENTRY, /\/competitive$/, ATLAS_TITLE);
  await expect(page.getByRole('region', { name: RADAR_REGION })).toBeVisible();
}

/**
 * The radar's figure on SCR-13, located by its caption rather than by position, so a second chart on
 * the screen cannot be mistaken for it.
 */
function radarFigure(page: Page): Locator {
  return page
    .getByRole('region', { name: RADAR_REGION })
    .getByRole('figure', { name: mentions(RADAR_TITLE) });
}

/** The `aria-label` of each element a locator matches, in document order. */
async function labelsOf(items: Locator): Promise<string[]> {
  const total = await items.count();
  const labels: string[] = [];

  for (let index = 0; index < total; index += 1) {
    labels.push(collapse(await items.nth(index).getAttribute('aria-label')));
  }

  return labels;
}

/**
 * The competitor groups the network view draws, one per competitor network in view.
 *
 * The screen narrows the networks by the product class in view, so this locator is what an assertion
 * counts to prove the class filter reaches the drawing rather than only the caption (AAP 0.12.4).
 */
function networkCompetitorGroups(page: Page): Locator {
  return page
    .getByRole('region', { name: NETWORK_REGION })
    .getByRole('figure', { name: mentions(NETWORK_TITLE) })
    .getByRole('group', { name: NETWORK_GROUP })
    .getByRole('group', { name: mentions(COMPETITOR_NAME_TAG) });
}

/**
 * The position of the first header matching `pattern`, or `-1`.
 *
 * A header's wording is the table's own, so a column is located by what it says rather than by its
 * position: an assertion then reads the cell under the column it meant, whatever order the table
 * renders its columns in.
 */
function columnOf(headers: readonly string[], pattern: RegExp): number {
  return headers.findIndex((header) => pattern.test(header));
}

/* ---------------------------------------------------------------------------------------------
 * T-21 — the atlas labels what is simulated, series by series, and keeps the two provenances apart
 * ------------------------------------------------------------------------------------------- */

test('T-21 the atlas labels each simulated series on its own and keeps market intelligence apart from the first-party reading', async ({
  page,
}) => {
  await openAtlas(page);

  /* The banner names the pack on the surface itself, so the disclosure is met before any figure. */
  await expect(page.getByRole('note', { name: BANNER_REGION })).toHaveText(PACK_BANNER);

  /* Rule P-1: the shell's badge reaches this route like every other. */
  await expect(page.getByText(SIMULATED_DATA, { exact: true }).first()).toBeVisible();

  const selector = page.getByRole('region', { name: SELECTOR_REGION });
  await expect(selector).toBeVisible();

  /* The product-class filter acts, and the class it selects is restated in words beside it, so the
     choice never rests on which control looks active (rule B-3). Its first control is the unfiltered
     state, and every control after it names one class the pack holds. */
  const classGroup = selector.getByRole('group', { name: CLASS_GROUP });
  const classButtons = classGroup.getByRole('button');
  const classCount = await classButtons.count();
  expect(classCount, 'the atlas must offer the product classes the pack holds').toBeGreaterThan(1);
  await expect(classGroup.getByRole('button', { name: ALL_CLASSES })).toBeVisible();

  const entityButtons = selector.getByRole('group', { name: ENTITY_GROUP }).getByRole('button');
  const legendRows = page
    .getByRole('region', { name: RADAR_REGION })
    .getByRole('list')
    .getByRole('listitem');

  const chosenClass = collapse(await classButtons.nth(classCount - 1).textContent());
  expect(chosenClass, 'a class control must state the class it selects').not.toBe('');

  await classButtons.nth(classCount - 1).click();
  await expect(classGroup).toContainText(`${CLASS_CAPTION_PREFIX} ${chosenClass}`);

  /* A class narrows what the atlas draws: fewer series, fewer entities and fewer competitor groups
     than the pack holds, so the control filters the view rather than restating it (AAP 0.12.4). */
  const narrows = `the class in view must narrow the atlas: ${chosenClass}`;
  const narrowedSeries = await legendRows.count();
  const narrowedEntities = await entityButtons.count();
  const narrowedGroups = await networkCompetitorGroups(page).count();

  expect(narrowedSeries, narrows).toBeGreaterThan(0);
  expect(narrowedEntities, narrows).toBeGreaterThan(0);
  expect(narrowedGroups, narrows).toBeGreaterThan(0);
  expect(narrowedSeries, narrows).toBeLessThan(COMPETITOR_NETWORKS + 1);
  expect(narrowedEntities, narrows).toBeLessThan(COMPETITOR_NETWORKS + 1);
  expect(narrowedGroups, narrows).toBeLessThan(COMPETITOR_NETWORKS);

  /* Every class the pack holds is reachable again from the class group's first control, so the
     narrowing is reversible, and the whole pack is drawn once it is (rule P-8). */
  await classGroup.getByRole('button', { name: ALL_CLASSES }).click();
  await expect(classGroup).toContainText(`${CLASS_CAPTION_PREFIX} ${ALL_CLASSES}`);
  await expect(entityButtons).toHaveCount(COMPETITOR_NETWORKS + 1);
  await expect(legendRows).toHaveCount(COMPETITOR_NETWORKS + 1);
  await expect(networkCompetitorGroups(page)).toHaveCount(COMPETITOR_NETWORKS);

  /* The entity selector offers the client and one control per competitor; each competitor's control
     carries the name tag, the client's carries its self-assessment label (rule P-5). */
  await expect(entityButtons.filter({ hasText: COMPETITOR_NAME_TAG })).toHaveCount(COMPETITOR_NETWORKS);
  await expect(entityButtons.filter({ hasText: CLIENT_SELF_ASSESSMENT })).toHaveCount(1);

  /* The radar labels one series per polygon: the competitors under the market-intelligence label, the
     client under its own companion label — and the client is not tagged `Simulated data` as well. */
  const radar = radarFigure(page);
  const drawing = radar.getByRole('group', { name: RADAR_GROUP });
  await expect(drawing).toBeVisible();
  await expect(drawing.getByText(MARKET_INTELLIGENCE, { exact: true })).toHaveCount(COMPETITOR_NETWORKS);
  await expect(drawing.getByText(CLIENT_SELF_ASSESSMENT, { exact: true })).toHaveCount(1);
  await expect(drawing.getByText(SIMULATED_DATA, { exact: true })).toHaveCount(0);

  /* The legend beside the radar keys each series on its own, so no entry merges the two families.
     The whole pack is in view again, which the class group's own assertions above established. */
  await expect(legendRows.filter({ hasText: COMPETITOR_NAME_TAG })).toHaveCount(COMPETITOR_NETWORKS);
  await expect(legendRows.filter({ hasText: MARKET_INTELLIGENCE })).toHaveCount(COMPETITOR_NETWORKS);
  await expect(legendRows.filter({ hasText: CLIENT_SELF_ASSESSMENT })).toHaveCount(1);

  for (const row of await textsOf(legendRows)) {
    const families = [row.includes(COMPETITOR_NAME_TAG), row.includes(CLIENT_SELF_ASSESSMENT)].filter(
      (named) => named,
    );
    expect(families, `the legend entry "${row}" must name one family and not both`).toHaveLength(1);
  }

  /* "View as table" is the same series read accessibly: its column headers carry the series' own
     names and the provenance words the legend used, so the table states what the drawing states. */
  await radar.getByRole('button', { name: `${VIEW_AS_TABLE}: ${RADAR_TITLE}` }).click();

  const radarTable = radar.getByRole('table', { name: RADAR_TABLE_CAPTION });
  await expect(radarTable).toBeVisible();

  const seriesHeaders = radarTable.locator('thead th');
  await expect(seriesHeaders).toHaveCount(COMPETITOR_NETWORKS + 2);
  await expect(seriesHeaders.filter({ hasText: MARKET_INTELLIGENCE })).toHaveCount(COMPETITOR_NETWORKS);
  await expect(seriesHeaders.filter({ hasText: CLIENT_SELF_ASSESSMENT })).toHaveCount(1);
  await expect(seriesHeaders.filter({ hasText: COMPETITOR_NAME_TAG })).toHaveCount(COMPETITOR_NETWORKS);

  const axisRows = await radarTable.locator('tbody tr').count();
  expect(axisRows, 'the radar table must list the axes the drawing places').toBeGreaterThan(0);

  /* The network view draws both families on one frame and names each group as what it is. */
  const networkCard = page.getByRole('region', { name: NETWORK_REGION });
  const network = networkCard
    .getByRole('figure', { name: mentions(NETWORK_TITLE) })
    .getByRole('group', { name: NETWORK_GROUP });
  await expect(network).toBeVisible();

  const competitorGroups = network.getByRole('group', { name: mentions(COMPETITOR_NAME_TAG) });
  await expect(competitorGroups).toHaveCount(COMPETITOR_NETWORKS);
  for (const label of await labelsOf(competitorGroups)) {
    expect(label, 'a competitor group must be named as market intelligence').toContain(
      MARKET_INTELLIGENCE,
    );
  }
  await expect(network.getByRole('group', { name: mentions(CLIENT_SELF_ASSESSMENT) })).toHaveCount(1);

  /* The chokepoint table prints the pack's overlap, each competitor's buffer and the contention note,
     and states the provenance of every row it prints (AAP 0.8, rule P-5). */
  const chokepointCard = page.getByRole('region', { name: CHOKEPOINT_REGION });
  const chokepoints = chokepointCard.getByRole('table', { name: CHOKEPOINT_TABLE_CAPTION });
  await expect(chokepoints).toBeVisible();

  const headers = await textsOf(chokepoints.locator('thead th'));
  const overlapAt = columnOf(headers, /overlap/i);
  const bufferAt = columnOf(headers, /buffer days/i);
  const noteAt = columnOf(headers, /contention/i);
  expect(overlapAt, `the table must carry an overlap column: ${headers.join(' | ')}`).toBeGreaterThanOrEqual(0);
  expect(bufferAt, `the table must carry a competitor buffer column: ${headers.join(' | ')}`).toBeGreaterThanOrEqual(0);
  expect(noteAt, `the table must carry a contention note column: ${headers.join(' | ')}`).toBeGreaterThanOrEqual(0);

  const chokepointRows = chokepoints.locator('tbody tr');
  const chokepointCount = await chokepointRows.count();
  expect(chokepointCount, 'the pack must list the crossings it records').toBeGreaterThan(0);

  for (let index = 0; index < chokepointCount; index += 1) {
    const cells = await textsOf(chokepointRows.nth(index).locator('td'));
    const row = cells.join(' | ');

    expect(
      cells[cells.length - 1],
      `every chokepoint row must state the provenance of its figures: ${row}`,
    ).toBe(MARKET_INTELLIGENCE);
    expect(row, `a chokepoint row must tag the competitors it names: ${row}`).toContain(
      COMPETITOR_NAME_TAG,
    );
    expect(cells[overlapAt] ?? '', `a chokepoint row must print an overlap: ${row}`).toMatch(/[0-9]/);
    expect(cells[bufferAt] ?? '', `a chokepoint row must print a buffer in days: ${row}`).toMatch(/[0-9]/);
    expect(cells[noteAt] ?? '', `a chokepoint row must print a contention note: ${row}`).not.toBe('');
  }

  /* No first-party reading reaches these rows or this card: the crossings are the pack's alone. */
  await expect(chokepointCard.getByText(SIMULATED_DATA, { exact: true })).toHaveCount(0);
  await expect(chokepointCard).not.toContainText(CLIENT_SELF_ASSESSMENT);

  /* The chokepoint alert strip alerts on the same crossings the table lists: one alert per row the
     table rendered — counted from the table, never typed — and every alert carries the
     market-intelligence label on itself rather than inheriting one from the page (AAP 0.14.1's S3 row,
     rules P-1 and P-5). */
  const alertStrip = page.getByRole('region', { name: CHOKEPOINT_ALERTS_REGION });

  await expect(alertStrip).toBeVisible();

  const alerts = alertStrip.getByRole('listitem');

  await expect(alerts).toHaveCount(chokepointCount);

  for (const alert of await textsOf(alerts)) {
    expect(alert, `every chokepoint alert must carry the market-intelligence label: ${alert}`).toContain(
      MARKET_INTELLIGENCE,
    );
  }

  /* And nothing of the other two families reaches the band: no first-party record and no competitor
     name that would have to carry the competitor tag (rule P-5). */
  await expect(alertStrip.getByText(SIMULATED_DATA, { exact: true })).toHaveCount(0);
  await expect(alertStrip).not.toContainText(COMPETITOR_NAME_TAG);
});

/* ---------------------------------------------------------------------------------------------
 * The S3 additions on the FileMap canvas, half one — the surface as the persona the pack refuses,
 * where what a first-party figure must never carry is the whole of what can be observed
 * ------------------------------------------------------------------------------------------- */

test('the canvas keeps every competitor figure out of its first-party surface for the auditor the pack read is refused to', async ({
  page,
}) => {
  await openApp(page);

  /* The auditor is the persona who reads the trail and not the pack: `audit.read` is the dock's, and
     `competitive.read` is refused to it, so this is the state in which the canvas draws the client's
     own network alone. */
  await switchRole(page, PERSONA_WITH_CANVAS);

  await openThroughNavigation(page, CANVAS_ENTRY, /\/canvas$/, CANVAS_TITLE);

  const canvas = page.getByRole('region', { name: CANVAS_REGION });
  await expect(canvas).toBeVisible();

  const mapFigure = canvas.getByRole('figure', { name: mentions(MAP_TITLE) });
  await expect(mapFigure).toBeVisible();

  const map = mapFigure.getByRole('group', { name: MAP_TITLE });
  await expect(map).toBeVisible();
  await expect(map.getByRole('group', { name: NODES_GROUP })).toBeVisible();

  /* The drawing degrades to the client's own network because the pack's read is refused for this
     persona, which is the lens's documented behaviour and the half of rule P-5 observable here: no
     competitor mark, halo or overlay legend reaches a first-party surface. What the same drawing holds
     once that read is admitted is the next test's subject. */
  await expect(map.getByRole('group', { name: OVERLAY_GROUP })).toHaveCount(0);
  await expect(map.getByRole('group', { name: MARKET_INTELLIGENCE, exact: true })).toHaveCount(0);

  /* The one route to the atlas is the navigation entry, asserted so the screen the competitor overlay
     belongs to is still reached from the canvas a reader lands on. */
  await expect(
    page.getByRole('navigation', { name: NAV_LANDMARK }).getByRole('link', { name: ATLAS_ENTRY }),
  ).toBeVisible();

  /* The canvas's own figures stay labelled as the computed figures they are, and carry neither
     family's wording: no competitor value reaches a tile, a card or the dock (rule P-5). */
  const ribbon = page.getByRole('group', { name: RIBBON_REGION });
  await expect(ribbon).toBeVisible();
  await expect(ribbon.getByText(SIMULATED_CALCULATION, { exact: true }).first()).toBeVisible();
  await expect(ribbon).not.toContainText(MARKET_INTELLIGENCE);
  await expect(ribbon).not.toContainText(COMPETITOR_NAME_TAG);

  /* No competitor figure reaches this route at all: the pack's read is refused, so neither the drawing
     nor a legend beside it names one, and a first-party tile, card or dock entry cannot carry one. */
  const labelsInDrawing = await mapFigure.getByText(MARKET_INTELLIGENCE, { exact: true }).count();
  const labelsOnRoute = await page.getByText(MARKET_INTELLIGENCE, { exact: true }).count();
  expect(
    labelsOnRoute,
    `the market-intelligence label must reach only the map drawing and its legend, but ${labelsOnRoute} of its ${labelsInDrawing} occurrences sit elsewhere on the route`,
  ).toBe(labelsInDrawing);

  const tagsInDrawing = await mapFigure.getByText(COMPETITOR_NAME_TAG, { exact: true }).count();
  const tagsOnRoute = await page.getByText(COMPETITOR_NAME_TAG, { exact: true }).count();
  expect(
    tagsOnRoute,
    `a competitor name tag must appear only in the overlay's own legend, but ${tagsOnRoute} of its ${tagsInDrawing} occurrences sit elsewhere on the route`,
  ).toBe(tagsInDrawing);
});

/* ---------------------------------------------------------------------------------------------
 * The S3 additions on the FileMap canvas, half two — the overlay and the halos as the persona the
 * pack's read admits
 * ------------------------------------------------------------------------------------------- */

test('the canvas draws the atlas overlay and the chokepoint halos for a persona that may read the pack', async ({
  page,
}) => {
  await openApp(page);
  await switchRole(page, PERSONA_WITH_ATLAS);

  /* The crossings the pack records are counted from the atlas the browser draws, before the canvas is
     opened, so the halo assertion below compares the canvas against the atlas itself rather than against
     a number written here (rule P-6, AAP 0.7's S3 stage row). */
  await openThroughNavigation(page, ATLAS_ENTRY, /\/competitive$/, ATLAS_TITLE);

  const crossings = page
    .getByRole('region', { name: CHOKEPOINT_REGION })
    .getByRole('table', { name: CHOKEPOINT_TABLE_CAPTION })
    .locator('tbody tr');

  /* The table arrives once the pack's read settles, so its first row is awaited rather than counted
     into: a count taken before the read resolves would be zero and would make the halo comparison
     below compare the drawing against nothing. */
  await expect(crossings.first()).toBeVisible();

  const crossingCount = await crossings.count();

  expect(crossingCount, 'the pack must list the crossings the halos are drawn for').toBeGreaterThan(0);

  /* The canvas is reached the way a reader reaches it, as the same persona: USR-03 holds
     `competitive.read` beside the reads the surface itself needs, so the atlas payload reaches the
     drawing instead of being refused there (AAP 0.12.4, AAP 0.14.1's S3 row). */
  await openThroughNavigation(page, CANVAS_ENTRY, /\/canvas$/, CANVAS_TITLE);

  const canvas = page.getByRole('region', { name: CANVAS_REGION });
  await expect(canvas).toBeVisible();

  const mapFigure = canvas.getByRole('figure', { name: mentions(MAP_TITLE) });
  await expect(mapFigure).toBeVisible();

  const map = mapFigure.getByRole('group', { name: MAP_TITLE });
  await expect(map).toBeVisible();

  /* The first-party network is still the drawing's own: the overlay is added over it, not instead of
     it (AAP 0.14.1's S3 row). */
  await expect(map.getByRole('group', { name: NODES_GROUP })).toBeVisible();

  /* The competitor overlay: the pack's marks are drawn in a group of their own, named as market
     intelligence rather than as a place of the client's, and that group holds the marks themselves
     (rule P-1, rule P-5). */
  const overlay = map.getByRole('group', { name: OVERLAY_GROUP });

  await expect(overlay).toBeVisible();
  expect(
    await overlay.locator('polygon').count(),
    'the competitor overlay must draw a mark for the sites the pack places',
  ).toBeGreaterThan(0);

  /* One legend row per competitor network, each naming its own network beside the competitor tag and
     the market-intelligence label: the legend is where the drawing's hue-only distinction is stated in
     words, so a reader learns each series is simulated without reading a colour (rules P-1, P-5, B-3). */
  const overlayLegend = mapFigure.getByRole('listitem');

  await expect(overlayLegend).toHaveCount(COMPETITOR_NETWORKS);

  for (const row of await textsOf(overlayLegend)) {
    expect(row, `a competitor's legend row must carry the competitor tag: ${row}`).toContain(
      COMPETITOR_NAME_TAG,
    );
    expect(row, `a competitor's legend row must carry the market-intelligence label: ${row}`).toContain(
      MARKET_INTELLIGENCE,
    );
  }

  /* The chokepoint halos: the drawing places one market-intelligence caption per crossing the atlas
     table lists, counted from that table so no crossing is named here (rule P-6), inside the group the
     label alone names (rules P-1, P-5). */
  const halos = map.getByRole('group', { name: MARKET_INTELLIGENCE, exact: true });

  await expect(halos).toBeVisible();
  await expect(halos.getByText(MARKET_INTELLIGENCE, { exact: true })).toHaveCount(crossingCount);

  /* And the first-party surfaces still carry neither family's wording: the ribbon holds the screen's own
     computed figures, so no market-intelligence label and no competitor name reaches it (rule P-5). */
  const ribbon = page.getByRole('group', { name: RIBBON_REGION });

  await expect(ribbon).toBeVisible();
  await expect(ribbon).not.toContainText(MARKET_INTELLIGENCE);
  await expect(ribbon).not.toContainText(COMPETITOR_NAME_TAG);
});

/* ---------------------------------------------------------------------------------------------
 * The refusal USR-08 meets — a card that explains itself, not an empty screen (rule P-8)
 * ------------------------------------------------------------------------------------------- */

test('the atlas is refused to the external supplier engineer, and the refusal names the permission, the roles and the trace id', async ({
  page,
}) => {
  await openApp(page);
  await switchRole(page, PERSONA_WITHOUT_ATLAS);

  /* The entry is offered to this persona, so the refusal below is the service's own rather than a
     hidden control's: the entry navigates and the read behind it is what refuses (rule P-2). */
  const entry = page
    .getByRole('navigation', { name: NAV_LANDMARK })
    .getByRole('link', { name: ATLAS_ENTRY });
  await expect(entry).toBeVisible();

  await entry.click();
  await expect(page).toHaveURL(/\/competitive$/);
  await expect(page.getByRole('heading', { level: 1, name: ATLAS_TITLE })).toBeVisible();

  /* A card, not a blank surface, and its heading names the permission that was required. */
  const card = page.getByRole('region', { name: `${PERMISSION_TITLE_PREFIX}${COMPETITIVE_READ}` });
  await expect(card).toBeVisible();

  /* The roles that hold the permission, and the refused call's trace id: both come from the service's
     failure rather than from a claim this view makes (rules P-2, P-8). */
  await expect(card).toContainText('Roles that hold this permission');

  const roles = card.getByRole('listitem');
  const roleCount = await roles.count();
  expect(roleCount, 'the refusal must name at least one role that holds the permission').toBeGreaterThan(0);
  for (const role of await textsOf(roles)) {
    expect(role, 'a named role must not be blank').not.toBe('');
  }

  const cardText = collapse(await card.innerText());
  expect(cardText, `the refusal must carry the refused call's trace id: ${cardText}`).toMatch(
    /Trace ID\s+\S+/,
  );

  /* It explains a check this browser build made and claims no server behind it (rule P-3). */
  expect(
    cardText,
    `the refusal must claim no server-side enforcement: ${cardText}`,
  ).not.toMatch(/server|backend/i);

  /* The persona is restored, so the run leaves nothing of this test behind. */
  await switchRole(page, PERSONA_WITH_ATLAS);
  await expect(page).toHaveURL(/\/canvas$/);
});

/* ---------------------------------------------------------------------------------------------
 * The chokepoint brief — a browser-built download, and nothing about its contents here
 * ------------------------------------------------------------------------------------------- */

test('the chokepoint brief downloads as a JSON file named for the brief', async ({ page }) => {
  await openAtlas(page);

  const exportControl = page.getByRole('button', { name: EXPORT_ACTION });
  await expect(exportControl).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent('download'), exportControl.click()]);

  /* The file's name identifies the brief; its bytes belong to the export builder's own suite, which
     this process has no access to. */
  expect(download.suggestedFilename(), 'the download must be named for the brief').toMatch(
    /chokepoint/i,
  );
  expect(download.suggestedFilename(), 'the brief is a JSON document').toMatch(/\.json$/i);
});

