/**
 * T-20 — the request-origin proof of specification §9: while every route is visited in both themes,
 * the application issues no request to any origin but its own.
 *
 * WHAT IT PROVES, AND WHY IT IS OBSERVED THIS WAY. Rule B-1 forbids the built output from contacting
 * any third-party host at runtime — no CDN script or stylesheet, no hosted font, no analytics, no
 * tile server, no embedded video — and success criterion 4 states the same thing as a request that
 * never leaves the application's origin. A claim of that kind can only be tested by watching the
 * network: `context.on('request', …)` collects every URL the browser asks for, from the first
 * document onward, and the assertion at the end is that every HTTP(S) URL in that collection carries
 * the origin `vite preview` serves the build from.
 *
 * THE LISTENER SITS ON THE BROWSER CONTEXT, NOT THE PAGE. A request made by a service worker, a
 * worker or a popup surfaces only on the context, so a page-level listener could watch every request
 * a page makes and still miss the one that mattered. It is registered before the first `page.goto`,
 * because a listener added afterwards would miss the document, its scripts, its stylesheet and its
 * fonts — exactly the requests a hosted-font or CDN leak shows up in. The Playwright configuration
 * blocks service workers and the application registers none, which the last assertion here confirms,
 * so the collection is complete.
 *
 * WHERE THE EXPECTED ORIGIN COMES FROM. It is read from `testInfo.project.use.baseURL`, the setting
 * the preview server is started against, and falls back to the origin the page itself reports once
 * it has loaded. Typing a literal instead would let a changed preview port pass silently: the sweep
 * would then be asserting against an address the browser never used.
 *
 * WHERE THE LANGUAGE LITERALS COME FROM. Every route is reached through the shell's own navigation
 * and every parameterised route by activating a row of the table that lists it, so no exception,
 * approval or policy identifier is ever typed into an address — the identifiers this sweep opens are
 * the ones the page's own controls carry. The label literals below are the accessible names those
 * controls render, each with the module that owns it named in a comment, the way
 * `e2e/helpers/theme.ts` treats the theme switch's name: rule B-3 makes an accessible name a
 * contract, so the test asserts the contract rather than a class or a coordinate.
 *
 * WHAT IT DOES NOT DO. It mocks nothing (`page.route` would hide precisely the traffic this test
 * exists to see), it skips nothing, and it widens the ignore list no further than the `data:` and
 * `blob:` schemes, which are not network requests at all. It runs no accessibility scan (T-16 owns
 * axe) and scans no bundle text (`e2e/bundle-checks.spec.ts` owns that). It imports no application
 * module, no seed record and no fixture: the only imports are the two browser-suite helpers and the
 * shared types.
 *
 * Rules served: B-1 — the rule this file proves, with a failure that names every offending URL and
 * its origin; B-3 — every route and control reached by role and accessible name, from the keyboard
 * where the surface is drawn rather than laid out; P-1 — the `Simulated data` badge asserted on every
 * route the sweep visits, so a route that fails to render is noticed here as well; P-2 — the data
 * comes from the in-browser mock backend and a foreign request would mean it no longer did; P-6 — no
 * figure, amount, date or record identifier is written here, and the assertions count requests and
 * routes rather than reading a business value; P-7 — the product's own vocabulary only, Site
 * Intelligence and the FileMap canvas.
 */
import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';

import { PERSONAS, switchRole } from './helpers/role';
import { setTheme } from './helpers/theme';
import type { Role, ThemeName, UserId } from '../src/types';

/* ---------------------------------------------------------------------------------------------
 * The two themes the sweep runs in, and the budget a whole sweep needs
 * ------------------------------------------------------------------------------------------- */

/**
 * The whole route set is walked twice, once per theme, and the second pass has to be the other
 * theme for the run to mean anything. Command is the default, so it is visited first and the paper
 * pass is the one that proves a theme change was observed rather than assumed.
 */
const THEMES: readonly ThemeName[] = ['command', 'paper'];

/**
 * The time this test is given. The suite's default is 30 s per case, which suits a spec that visits
 * one screen; this one visits every route twice, switches persona three times and drives the FileMap
 * canvas's controls, while every read behind a screen carries the mock backend's own latency. The
 * ceiling stays well inside the gate's ten-minute budget: it bounds a sweep that should settle in
 * well under a minute, and it is a ceiling rather than a wait.
 */
const SWEEP_TIMEOUT_MS = 180_000;

/* ---------------------------------------------------------------------------------------------
 * The accessible names the sweep drives — each owned by the module named beside it
 * ------------------------------------------------------------------------------------------- */

/** The shell's navigation landmark, named by `APP_SHELL_TEXT.navLandmark` in `src/app/app.tsx`. */
const NAV_LANDMARK = 'Primary';

/**
 * The demonstration-wide simulated-data label, `SIM_LABELS[0]` of `src/types/primitives.ts` and the
 * first of the seven fixed §5.3 strings. Asserted on every route because rule P-1 puts it on every
 * route; the badge's full accessible name appends the demonstration clock, so this prefix is matched
 * as a substring rather than as the whole name.
 */
const SIMULATED_DATA_LABEL = 'Simulated data';

/** The exception queue's row action, `EXCEPTION_QUEUE_TEXT.open`; each row's name appends its id. */
const OPEN_EXCEPTION_ACTION = /^Open\b/;

/** The investigation's primary action, `INVESTIGATION_TEXT.compareOptions`. */
const COMPARE_OPTIONS_ACTION = 'Compare options';

/** The sovereignty screen's policy card, titled by `SOVEREIGNTY_SCREEN_TEXT.policiesTitle`. */
const POLICIES_REGION = 'Policies';

/** The canvas's lens switch group, `FILEMAP_CANVAS_TEXT.lensGroupLabel`. */
const CANVAS_LENS_GROUP = 'Canvas lens';

/** The map lens's zoom controls, `MAP_CANVAS_TEXT.zoomInLabel` and `zoomOutLabel`. */
const MAP_ZOOM_IN = 'Zoom in';
const MAP_ZOOM_OUT = 'Zoom out';

/** The map lens's five view presets, `MAP_CANVAS_TEXT.presetGroupLabel`. */
const MAP_VIEW_GROUP = 'Map view';

/**
 * How a drawn node of either lens names itself: each node is a `role="button"` stop whose
 * accessible name ends with its evidence-pin counts, which `MAP_CANVAS_TEXT.pinsPrefix` and the
 * graph lens's own wording both phrase that way. Matching on the pin summary rather than on the
 * glyphs lets the same locator find a node in whichever lens is in view.
 */
const NETWORK_NODE_NAME = /evidence pins?/i;

/**
 * The three paths this file names: the exception queue, the approvals inbox and the FileMap canvas,
 * each an entry of `NAV_GROUPS` in `src/app/nav-items.ts`. They are routes the router declares,
 * never a record's address, and each is followed by activating the navigation entry that carries it.
 */
const QUEUE_PATH = '/exceptions';
const APPROVALS_PATH = '/approvals';
const CANVAS_PATH = '/canvas';

/**
 * An address no route declares, to prove that the not-found page — which the shell still frames, the
 * badge included — sends no request either. A reader reaches it by mistyping an address, which is
 * exactly how this test asks for it.
 */
const UNKNOWN_PATH = '/an-address-that-matches-no-route';

/* ---------------------------------------------------------------------------------------------
 * Anything read back from the page
 * ------------------------------------------------------------------------------------------- */

/**
 * The persona a role acts as, read from the browser suite's own table of the eight seeded personas.
 *
 * The identifier is taken from that table rather than written here, so this spec types no persona
 * identifier and a change to the seeded roster reaches it as a change to the helper.
 *
 * @param role The role the sweep has to act as for the routes it is about to visit.
 * @returns The persona identifier `switchRole` accepts.
 * @throws Error when no seeded persona acts as that role, which would make the sweep un-runnable.
 */
function personaIdFor(role: Role): UserId {
  const persona = PERSONAS.find((candidate) => candidate.role === role);

  if (persona === undefined) {
    throw new Error(
      `T-20: no seeded persona acts as ${role}, so the sweep cannot be run as that role. The browser suite's table lists ${PERSONAS.length} personas.`,
    );
  }

  return persona.id;
}

/** Collapses runs of whitespace, so rendered text fits one line of a failure message. */
function collapseWhitespace(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * The origin a URL belongs to, or `undefined` when it cannot be parsed as one.
 *
 * `data:` and `blob:` URLs are parsed and answered with their own origin (`null`), which is why the
 * caller filters by scheme before comparing: neither is a network request, so neither may decide
 * whether the run contacts a foreign host.
 */
function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/** The scheme of a URL, or `''` when it cannot be parsed. */
function protocolOf(url: string): string {
  try {
    return new URL(url).protocol;
  } catch {
    return '';
  }
}

/**
 * Whether a URL is one of the two schemes this test ignores. Only these: `data:` and `blob:` are
 * not network requests — the favicon the entry document declares is a `data:` URL, and a canvas
 * export would be a `blob:` — while every other scheme is either a request this test must judge or
 * one whose appearance means the build reached for something it does not ship.
 */
function isIgnoredScheme(url: string): boolean {
  const protocol = protocolOf(url);
  return protocol === 'data:' || protocol === 'blob:';
}

/**
 * Whether a collected URL is one of the bundled webfonts.
 *
 * The assertion this feeds is what proves the observation is live: the application's typefaces are
 * served from its own `dist/assets`, so a `.woff2` request must have been seen. `document.fonts`
 * being ready would prove a font was applied, not that the request behind it was observed.
 */
function isFontRequest(url: string): boolean {
  try {
    return new URL(url).pathname.endsWith('.woff2');
  } catch {
    return false;
  }
}

/**
 * Whether a collected URL is the entry document itself: the request the listener has to have seen
 * for its observation to be trustworthy.
 *
 * The listener is registered before the first `page.goto`, so the document the browser asked for at
 * `/` must be in the collection. A list that began at the scripts would mean the watch was attached
 * too late, and every assertion after it would then be weaker than it looks — which is why this is
 * asserted rather than left to the reading of the code.
 */
function isEntryDocumentRequest(url: string): boolean {
  try {
    return new URL(url).pathname === '/';
  } catch {
    return false;
  }
}

/**
 * The origin the browser is expected to stay on: the configured `baseURL`, or — when the project
 * supplies none — the origin the loaded page itself reports.
 *
 * @param baseURL The value `testInfo.project.use.baseURL` carried, which is optional in the type.
 * @param page The loaded page, read only when no base URL was configured.
 * @returns The one origin every request must belong to.
 * @throws Error when neither source yields an origin, because a comparison against nothing would
 *   pass silently.
 */
function expectedOriginOf(baseURL: string | undefined, page: Page): string {
  const configured = baseURL === undefined || baseURL === '' ? undefined : originOf(baseURL);
  const origin = configured ?? originOf(page.url());

  if (origin === undefined) {
    throw new Error(
      `T-20: neither testInfo.project.use.baseURL (${JSON.stringify(baseURL ?? '')}) nor the loaded page (${JSON.stringify(page.url())}) yields an origin, so there is nothing for the collected requests to be compared against.`,
    );
  }

  return origin;
}

/* ---------------------------------------------------------------------------------------------
 * The sweep's assertions — one per route, so a route that fails to render fails here
 * ------------------------------------------------------------------------------------------- */

/**
 * Waits for a route to render and asserts the two things every route of this demonstration carries.
 *
 * The level-one heading is what proves the screen behind the address actually rendered rather than
 * leaving the previous one on screen while a read settles, and the badge is rule P-1's requirement
 * on every route — the stage-notice pages and the not-found page included. It also gives the screen
 * time to issue whatever it requests, which is what makes the sweep's collection meaningful.
 *
 * @param page The Playwright page showing the application.
 * @param where The route as the failure message should name it.
 */
async function expectRouteRendered(page: Page, where: string): Promise<void> {
  await expect(
    page.getByRole('heading', { level: 1 }).first(),
    `${where} rendered no level-one heading, so the screen behind it did not mount.`,
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: SIMULATED_DATA_LABEL }).first(),
    `${where} does not carry the "${SIMULATED_DATA_LABEL}" badge rule P-1 requires on every route.`,
  ).toBeVisible();
}

/**
 * Visits every entry the shell's navigation offers, by activating the entry itself.
 *
 * A disabled entry is a button rather than a link (`src/app/app.tsx`), so the links inside the
 * navigation landmark are exactly the entries this run's stages built — every one of them is
 * followed, and the disabled ones are left to the tooltip assertions of T-17 rather than clicked
 * and timed out here.
 *
 * @param page The Playwright page showing the application.
 * @returns The path of every entry visited, in navigation order.
 */
async function visitEveryNavigationEntry(page: Page): Promise<readonly string[]> {
  const navigation = page.getByRole('navigation', { name: NAV_LANDMARK });
  const entries = navigation.getByRole('link');
  const total = await entries.count();

  expect(
    total,
    `The shell's navigation renders no link, so the sweep has no route to visit.`,
  ).toBeGreaterThan(0);

  const visited: string[] = [];

  for (let index = 0; index < total; index += 1) {
    const entry = entries.nth(index);
    const path = await entry.getAttribute('href');
    const label = collapseWhitespace(await entry.textContent());

    if (path === null || path === '') {
      throw new Error(
        `T-20: the navigation entry "${label}" carries no href, so the sweep cannot follow it.`,
      );
    }

    await entry.click();
    await page.waitForURL((url) => url.pathname === path);
    await expectRouteRendered(page, `The navigation entry "${label}" (${path})`);
    visited.push(path);
  }

  return visited;
}

/**
 * Follows one navigation entry again, by the path it declares.
 *
 * The sweep above walks every entry in order; this reaches a named screen afterwards, so a drill-in
 * that starts from it is stated beside the screen it starts from instead of depending on where that
 * screen happens to sit in the navigation.
 *
 * @param page The Playwright page showing the application.
 * @param path The route the entry declares.
 */
async function followNavigationEntry(page: Page, path: string): Promise<void> {
  await page
    .getByRole('navigation', { name: NAV_LANDMARK })
    .locator(`a[href="${path}"]`)
    .click();
  await page.waitForURL((url) => url.pathname === path);
  await expectRouteRendered(page, `The screen at ${path}`);
}

/**
 * Opens the exception queue and drills into one exception and then into its options.
 *
 * Both addresses are parameterised by a record's identifier, and both are reached the way a reader
 * reaches them: the queue's row action opens the investigation, and the investigation's primary
 * action opens the comparison. No identifier is typed into an address anywhere in this file.
 *
 * @param page The Playwright page showing the application.
 * @returns The two paths the drill-in reached.
 */
async function visitExceptionDetailAndOptions(page: Page): Promise<readonly string[]> {
  const openAction = page.getByRole('button', { name: OPEN_EXCEPTION_ACTION }).first();

  await expect(
    openAction,
    'The exception queue rendered no row action, so no exception can be opened and the parameterised routes behind it cannot be visited.',
  ).toBeVisible();
  await openAction.click();

  await page.waitForURL((url) => /^\/exceptions\/[^/]+$/.test(url.pathname));
  const detailPath = new URL(page.url()).pathname;
  await expectRouteRendered(page, `The investigation at ${detailPath}`);

  const compare = page.getByRole('button', { name: COMPARE_OPTIONS_ACTION, exact: true });
  await expect(
    compare,
    `The investigation at ${detailPath} offers no "${COMPARE_OPTIONS_ACTION}" action, so its options cannot be opened.`,
  ).toBeEnabled();
  await compare.click();

  await page.waitForURL((url) => url.pathname.endsWith('/scenarios'));
  const optionsPath = new URL(page.url()).pathname;
  await expectRouteRendered(page, `The scenario comparison at ${optionsPath}`);

  return [detailPath, optionsPath];
}

/**
 * Opens the approvals inbox and drills into one approval by activating its row.
 *
 * The inbox's rows are activated from the keyboard — the row cursor `src/components/data-table.tsx`
 * owns puts the first row in the tab order and `Enter` activates it — which is how a keyboard
 * reader opens an approval and how this test reaches the detail route without typing an identifier.
 *
 * @param page The Playwright page showing the application.
 * @returns The approval detail path the drill-in reached.
 */
async function visitApprovalDetail(page: Page): Promise<string> {
  /*
   * The inbox renders its page header before its read settles, so the first body row — index 1,
   * because row 0 is the header — is waited for rather than counted: a count taken on the loading
   * frame would report zero rows for a table that is about to draw them.
   */
  const firstApproval = page.getByRole('row').nth(1);
  await expect(
    firstApproval,
    'The approvals inbox drew no row, so no approval detail can be visited from it.',
  ).toBeVisible();

  await firstApproval.focus();
  await page.keyboard.press('Enter');

  await page.waitForURL((url) => /^\/approvals\/[^/]+$/.test(url.pathname));
  const detailPath = new URL(page.url()).pathname;
  await expectRouteRendered(page, `The approval detail at ${detailPath}`);

  return detailPath;
}

/**
 * Drives the FileMap canvas as the one persona whose role reads everything the screen asks for, so
 * the map lens's controls are on screen rather than behind a permission card.
 *
 * Panning and zooming are the lens's own controls, because the surface offers no drag: the three
 * zoom levels are the zoom group's two buttons and the five view presets are the group of five that
 * reframe the projection from the whole world to one region and back. Both are driven, and then a
 * node of the drawn network is activated from the keyboard — the nodes are `role="button"` stops, so
 * `Enter` is the equivalent of the pointer press the hit areas overlap. The lens switch is used as
 * well, because the graph lens draws the same bundled topology through a second surface.
 *
 * The map is drawn from the boundary file compiled into the bundle, so any pan or zoom that fetched
 * a tile from a tile server would be collected by the listener this test registered.
 *
 * @param page The Playwright page showing the application.
 * @returns The path the canvas was reached at, plus the paths of every route it moved through.
 */
async function exerciseFileMapCanvas(page: Page): Promise<readonly string[]> {
  await followNavigationEntry(page, CANVAS_PATH);

  const zoomIn = page.getByRole('button', { name: MAP_ZOOM_IN, exact: true });
  const zoomOut = page.getByRole('button', { name: MAP_ZOOM_OUT, exact: true });

  await expect(
    zoomIn,
    `The FileMap canvas at ${CANVAS_PATH} rendered no "${MAP_ZOOM_IN}" control, so the map lens is not on screen.`,
  ).toBeEnabled();
  await zoomIn.click();
  await expect(
    zoomOut,
    `After one step closer, the map lens's "${MAP_ZOOM_OUT}" control is still unavailable, so the zoom level did not move.`,
  ).toBeEnabled();
  await zoomOut.click();

  const presets = page.getByRole('group', { name: MAP_VIEW_GROUP }).getByRole('button');
  const presetCount = await presets.count();

  expect(
    presetCount,
    `The map lens rendered no view preset, so the network cannot be panned across the five framings the specification fixes.`,
  ).toBeGreaterThan(0);

  for (let index = 0; index < presetCount; index += 1) {
    const preset = presets.nth(index);
    await preset.click();
    await expect(
      preset,
      `View preset ${index + 1} of ${presetCount} did not report itself pressed after it was activated.`,
    ).toHaveAttribute('aria-pressed', 'true');
  }

  const nodes = page.getByRole('button', { name: NETWORK_NODE_NAME });
  const nodeCount = await nodes.count();

  expect(
    nodeCount,
    `The map lens drew no node of the client network, so there is nothing to select on the surface.`,
  ).toBeGreaterThan(0);

  const firstNode = nodes.first();
  await firstNode.focus();
  await page.keyboard.press('Enter');

  const lenses = page.getByRole('group', { name: CANVAS_LENS_GROUP }).getByRole('button');
  const lensCount = await lenses.count();

  expect(
    lensCount,
    `The canvas rendered ${lensCount} lens control(s); the specification fixes two, a map lens and a graph lens.`,
  ).toBe(2);

  const graphLens = lenses.nth(1);
  await graphLens.click();
  await expect(
    page.getByRole('button', { name: NETWORK_NODE_NAME }).first(),
    'The graph lens drew no node, so switching to it did not put the second surface on screen.',
  ).toBeVisible();

  const mapLens = lenses.nth(0);
  await mapLens.click();
  await expect(
    page.getByRole('button', { name: MAP_ZOOM_IN, exact: true }),
    'Switching back to the map lens did not restore its zoom controls.',
  ).toBeVisible();

  return [CANVAS_PATH];
}

/**
 * Opens one policy's detail from the sovereignty screen's policy table.
 *
 * The policy set is the only table on that screen whose rows are activatable, and it sits in the
 * card titled `Policies`; the row is activated from the keyboard for the same reason the approvals
 * inbox is, which keeps the policy's identifier out of the address and off this file.
 *
 * @param page The Playwright page showing the application.
 * @returns The policy detail path the drill-in reached.
 */
async function visitPolicyDetail(page: Page): Promise<string> {
  const region = page.getByRole('region', { name: POLICIES_REGION, exact: true });
  await expect(
    region,
    `The sovereignty screen rendered no "${POLICIES_REGION}" card, so the policy detail cannot be opened from it.`,
  ).toBeVisible();

  const rows = region.getByRole('row');

  /*
   * The card is waited for, then its first body row: the screen renders its cards before the reads
   * behind them settle, and a count taken on that frame would report a table with no rows.
   */
  const firstPolicy = rows.nth(1);
  await expect(
    firstPolicy,
    `The "${POLICIES_REGION}" table drew no row, so no policy detail can be visited from it.`,
  ).toBeVisible();

  await firstPolicy.focus();
  await page.keyboard.press('Enter');

  await page.waitForURL((url) => /^\/admin\/policies\/[^/]+$/.test(url.pathname));
  const detailPath = new URL(page.url()).pathname;
  await expectRouteRendered(page, `The policy detail at ${detailPath}`);

  return detailPath;
}

/* ---------------------------------------------------------------------------------------------
 * The test
 * ------------------------------------------------------------------------------------------- */

test('T-20 no request leaves the application origin on any route, in either theme', async ({
  page,
}, testInfo: TestInfo) => {
  test.setTimeout(SWEEP_TIMEOUT_MS);

  /*
   * The collection, and the listener that fills it. Registered here — before the first navigation —
   * on the browser context, so the document, its scripts, its stylesheet and its fonts are all seen
   * and a request a worker made could not slip past.
   */
  const collected: string[] = [];
  page.context().on('request', (request) => {
    collected.push(request.url());
  });

  await page.goto('/');
  await expectRouteRendered(page, 'The entry route');

  const expectedOrigin = expectedOriginOf(testInfo.project.use.baseURL, page);
  const visited: string[] = [new URL(page.url()).pathname];
  const themesVisited: ThemeName[] = [];

  for (const theme of THEMES) {
    /*
     * The whole route set is walked once per theme. The persona is set explicitly at the top of each
     * pass rather than relied on from the pass before: the unknown-route visit at the end of a pass
     * loads the document again, and a fresh load seeds the demonstration's first persona.
     *
     * The role switcher is a demonstration lever (rule P-3), not an authorisation mechanism: every
     * switch below only changes which seeded persona the in-browser adapter acts as, so the routes a
     * pass visits are the routes that persona is shown, and the sweep claims nothing about what a
     * deployment would let anyone reach.
     */
    await switchRole(page, personaIdFor('material-planner'));
    await setTheme(page, theme);

    await expect(
      page.locator('html'),
      `The ${theme} pass did not render in the ${theme} theme, so its routes were not visited in the theme it claims.`,
    ).toHaveAttribute('data-theme', theme);
    themesVisited.push(theme);

    visited.push(...(await visitEveryNavigationEntry(page)));

    /*
     * The parameterised screens, each reached by activating the row or the action that names the
     * record it shows: no exception, approval or policy identifier is typed into an address here.
     */
    await followNavigationEntry(page, QUEUE_PATH);
    visited.push(...(await visitExceptionDetailAndOptions(page)));

    await followNavigationEntry(page, APPROVALS_PATH);
    visited.push(await visitApprovalDetail(page));

    /*
     * The auditor reads both the exception records and the audit trail, which is what the canvas's
     * dock asks for; the planning roles do not, and their view of the screen is a permission card
     * with no lens to drive.
     */
    await switchRole(page, personaIdFor('auditor'));
    await expectRouteRendered(page, 'The audit trail');
    visited.push(new URL(page.url()).pathname);
    visited.push(...(await exerciseFileMapCanvas(page)));

    await switchRole(page, personaIdFor('platform-administrator'));
    await expectRouteRendered(page, 'The sovereignty screen');
    visited.push(new URL(page.url()).pathname);
    visited.push(await visitPolicyDetail(page));

    await switchRole(page, personaIdFor('external-supplier-engineer'));
    await expectRouteRendered(page, 'The evidence workspace stage notice');
    visited.push(new URL(page.url()).pathname);

    /*
     * An address no route declares. The not-found page is inside the shell, so the badge and the
     * theme are asserted there too, and the load that reaches it is one more document the listener
     * sees.
     */
    await page.goto(UNKNOWN_PATH);
    await expectRouteRendered(page, `The not-found page at ${UNKNOWN_PATH}`);
    await expect(
      page.locator('html'),
      `The not-found page at ${UNKNOWN_PATH} did not stay in the ${theme} theme.`,
    ).toHaveAttribute('data-theme', theme);
    visited.push(UNKNOWN_PATH);
  }

  /*
   * The self-hosted fonts are requested by the entry document's stylesheet, so waiting for
   * `document.fonts` before asserting is what turns "the font applied" into "the request was
   * observed". The watch is live only if that request is in the collection.
   */
  await page.evaluate(() => document.fonts.ready);

  const observed = [...new Set(collected)];
  const fontRequests = observed.filter(isFontRequest);

  expect(
    observed.filter(isEntryDocumentRequest).length,
    `The entry document's own request is not in the ${observed.length} collected URL(s), so the listener was not watching when the first page loaded and the run proves nothing about what that load asked for. Collected: ${observed.join(', ')}`,
  ).toBeGreaterThan(0);

  expect(
    fontRequests.length,
    `No bundled webfont request was observed among the ${observed.length} collected URL(s), so this run's watch may not be seeing the document's own traffic at all. Collected: ${observed.join(', ')}`,
  ).toBeGreaterThan(0);

  /*
   * Every URL the browser asked for, judged by its origin. `data:` and `blob:` are ignored by scheme
   * because they are not network requests; nothing else is ignored, and a URL that cannot be parsed
   * is reported rather than skipped.
   */
  const offenders = observed
    .filter((url) => !isIgnoredScheme(url))
    .filter((url) => originOf(url) !== expectedOrigin)
    .map((url) => `${url} (origin ${originOf(url) ?? 'unparseable'})`);

  expect(
    offenders,
    `Rule B-1: the application contacted ${offenders.length} URL(s) outside its own origin ${expectedOrigin} while ${themesVisited.length} theme(s) and ${new Set(visited).size} route(s) were visited. Every offending request is listed with its origin:`,
  ).toEqual([]);

  /*
   * A controller would mean a service worker answered part of the page. The Playwright configuration
   * blocks them and the application registers none, so a run that ended with one active would be a
   * run whose collection rested on a mechanism this build does not ship.
   */
  const hasServiceWorkerController = await page.evaluate(
    () => navigator.serviceWorker.controller !== null,
  );
  expect(
    hasServiceWorkerController,
    'A service worker controls the page, so requests it made would not be attributable to the routes this sweep visited.',
  ).toBe(false);

  /*
   * The evidence this run leaves behind: how much traffic was watched, over how many routes, in how
   * many themes. It is attached to the report rather than only printed, so the numbers travel with
   * the run that produced them.
   */
  const summary = {
    expectedOrigin,
    originsObserved: [
      ...new Set(
        observed
          .filter((url) => !isIgnoredScheme(url))
          .map((url) => originOf(url) ?? '(unparseable)'),
      ),
    ].sort(),
    themes: themesVisited,
    routesVisited: [...new Set(visited)].sort(),
    requestsObserved: observed.length,
    fontRequests: fontRequests.length,
    observedUrls: observed,
  };

  await testInfo.attach('T-20 request-origin sweep', {
    body: `${JSON.stringify(summary, null, 2)}\n`,
    contentType: 'application/json',
  });

  console.log(
    `T-20: ${summary.requestsObserved} request(s) observed, ${summary.fontRequests} of them bundled webfonts, across ${summary.routesVisited.length} route(s) in ${summary.themes.length} theme(s), all on ${expectedOrigin}.`,
  );
});
