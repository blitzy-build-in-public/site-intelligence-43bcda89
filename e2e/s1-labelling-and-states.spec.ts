/**
 * T-15 and T-17: the badge every route carries, and the nine triggers the single simulation popover
 * offers.
 *
 * WHAT THESE TWO IDENTIFIERS ASK FOR. T-15 asserts that the demonstration-wide `Simulated data` badge
 * is on every route the shell renders — the stage-notice pages and the not-found page included — with
 * the demonstration clock beside it, and that the badge is the control that opens the simulation
 * popover (rule P-1). T-17 asserts that each of the seven screen states of specification §8, the
 * deliberately edited audit event and the emptied exception queue are reachable from that one popover
 * and that each renders as its own state rather than as a colour, a blank region or an invented
 * sentence (rule P-1, rule P-8).
 *
 * HOW EVERY STEP IS TAKEN. Through the visible interface only: the badge, the navigation entries, the
 * row controls of the tables, the role switcher and the theme switch. No global, no query parameter and
 * no storage seed is set, because the build ships no test hook and this spec must not need one — the
 * popover and the role switcher are product features a reader operates, which is exactly why a test may
 * operate them (AAP 0.7, AAP 0.9). Navigation after a trigger is by clicking and never by loading a
 * document: the mock adapter keeps the session in memory, so a page load would re-seed the records and
 * lose the state the test had arranged.
 *
 * WHERE THE ROUTE LIST COMES FROM. T-15 visits the enabled entries of the navigation and then drills
 * into the parameterised screens from the records they list — a queue row, a plan row, a policy row —
 * recording each pathname the browser reaches, so no exception, approval or policy identifier is ever
 * typed into a URL. The stage-notice page is reached the way a persona reaches it, by switching to the
 * external supplier engineer whose home route is the evidence workspace, and the six stage-notice paths
 * no entry can be followed to are opened by address, which is the only way in; the unknown route is the
 * one path no visible control offers, which is what the not-found page exists for. The count of distinct
 * routes is then asserted against the list this suite expects, so a route added to the shell without the
 * badge cannot pass unnoticed.
 *
 * THE ONE STRUCTURAL NUMBER. The edited audit event is the seeded event at sequence 142: the plan fixes
 * that edit, and a verification reports the first position whose stored hash and recomputation disagree.
 * It is a property of the fixture the demonstration ships, not a business figure, so it is the single
 * literal of that kind here. Every other value this file asserts — an as-of instant, a row count, the
 * open-exceptions figure the overview computes — is read from the screen at the moment of assertion
 * (rule P-6).
 *
 * Rules served: P-1 (the badge and every exact §5.3 label), P-8 (a control that cannot act says why, and
 * the disabled stage entries are asserted rather than forced), P-3 (the role switcher's label and its
 * non-authorisation note), P-4 (the audit verification carries its `Simulated control` wording and no
 * claim of tamper resistance), P-2 (no seed record and no adapter is imported here; data arrives through
 * the screens the port feeds), B-3 (every locator is a role and an accessible name, and nothing is
 * asserted about colour or geometry) and P-7 (only the synthetic names the application renders).
 */
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { switchRole } from './helpers/role';
import { setTheme } from './helpers/theme';
import { resetDemoData, triggerSimulationState } from './helpers/simulation-controls';

/* ---------------------------------------------------------------------------------------------
 * The fixed strings — platform-specification.md §5.3, AAP 0.10, and the components' own wording
 * ------------------------------------------------------------------------------------------- */

/**
 * The demonstration-wide label of specification §5.3 that the shell's badge carries.
 *
 * Stated here rather than imported, because a browser test must not load the module it drives: the
 * assertion is worth something only if the suite holds the expected text independently of the tuple the
 * application reads it from (rule P-1).
 */
const BADGE_LABEL = 'Simulated data';

/**
 * The name of the single popover the badge opens: the `Simulated control` label of §5.3, which the
 * panel takes as its accessible name.
 */
const SIMULATED_CONTROL = 'Simulated control';

/**
 * The demonstration's constant clock, which the badge prints beside its label (AAP 0.2.1: no business
 * logic reads the system clock, so the demonstration states the instant it acts at).
 */
const DEMO_CLOCK = '2026-12-03T08:00:00+01:00';

/**
 * The note every surface of the audit chain carries, character for character as AAP 0.12.4 fixes it.
 *
 * It is the sentence that *denies* the claim the application may never make, so asserting it is how this
 * file proves the chain is presented as a mechanism rather than as tamper resistance (rule P-4).
 */
const AUDIT_CHAIN_NOTE =
  'Simulated control: this shows the mechanism, not production tamper resistance.';

/**
 * The sequence number of the seeded audit event the tamper control edits — the one structural literal
 * this file holds (see the module documentation).
 */
const TAMPERED_SEQUENCE = 142;

/**
 * The source whose state gates an approval, named by `SOURCE_LABELS` as the freshness strip, the stale
 * banner and the approval refusal all spell it. The stale trigger marks this source, so the banner above
 * the queue has to name it.
 */
const APPROVAL_GATE_SOURCE = 'ERP';

/** The label of the demonstration's role switcher, which rule P-3 requires on the interface. */
const ROLE_SWITCHER_LABEL = 'Demo role switcher (simulation only)';

/** The note rule P-3 requires beside that control: the checks behind it are not production authorisation. */
const ROLE_SWITCHER_NOTE = 'Browser-side permission checks are not production authorisation.';

/** The accessible name of the control a failure state offers to repeat the read it could not complete. */
const RETRY_LABEL = 'Try again';

/** The accessible name of the control that recomputes every hash in the chain, on the audit trail. */
const VERIFY_CHAIN_LABEL = 'Verify chain';

/** The caption that appears on an approval only once a decision has been recorded on it. */
const DECISION_TAKEN_LABEL = 'Decision taken';

/** The visible label of the decision comment field, and the button that approves a plan. */
const COMMENT_LABEL = 'Comment';
const APPROVE_LABEL = 'Approve';

/* ---------------------------------------------------------------------------------------------
 * The states' own wording — src/components/state-boundary.tsx and the screens that feed it
 * ------------------------------------------------------------------------------------------- */

/**
 * The one rendering each of the seven states gives, read from the component that owns it.
 *
 * A state is asserted by the words its own rendering states, never by a colour, a class or a position,
 * so a token or layout change cannot make this suite pass or fail (rule B-3). A screen supplies its own
 * sentence for the empty, partial and conflict states, so those are asserted through the sentence the
 * screen that renders them fixes as well.
 */
const LOADING_HEADLINE = 'Loading';
const PARTIAL_HEADLINE = 'Some inputs are missing';
const OFFLINE_HEADLINE = 'No source is answering';
const ROLES_THAT_MAY_ACT = 'Roles that may act';
const PERMISSION_REQUIRED_PREFIX = 'Permission required:';
const STALE_SUFFIX = /is not current/;
const STALE_AS_OF_PREFIX = /As of/;

/** The queue's own sentence for an answer that holds no row. */
const QUEUE_EMPTY = 'No exceptions match the current filters.';

/** The not-found page's heading and the stage notice's arrival sentence for the S4 routes. */
const NOT_FOUND_HEADING = 'Page not found';
const STAGE_NOTICE_ARRIVAL = /arrives in stage S\d/i;

/**
 * The words the approval handler uses when the conflict trigger refuses a decision: the record changed
 * under the reader, so the change is refused rather than merged. Asserting the refusal is what proves
 * the conflict is reported instead of silently resolved.
 */
const CONFLICT_REFUSAL = /refused rather than merged/i;

/**
 * The vocabulary rule P-4 forbids anywhere in the interface: the application never states that it
 * establishes sovereignty, prevents copying or resists tampering. `tamper resistance` — which the fixed
 * note above names in order to deny it — deliberately does not match this pattern.
 */
const UNIMPLEMENTED_CLAIM = /tamper-proof|tamper resistant|zero trust|guaranteed|certified/i;

/** The shape of an ISO 8601 instant, used only to prove that an as-of time is printed at all. */
const INSTANT = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/* ---------------------------------------------------------------------------------------------
 * The navigation the shell declares — src/app/nav-items.ts, asserted independently
 * ------------------------------------------------------------------------------------------- */

/** One entry that navigates: the label a reader activates and the route it lands on. */
interface EnabledEntry {
  readonly label: string;
  readonly path: string;
}

/** One entry whose stage this run does not build: the label and the tooltip it must expose. */
interface DisabledEntry {
  readonly label: string;
  readonly tooltip: string;
}

/**
 * The eight entries of the navigation whose route this run declares, in the table's own order.
 *
 * Written out here rather than imported from `src/app/nav-items.ts`, so the suite compares what the
 * shell renders against an expectation of its own instead of against the table it is checking.
 */
const ENABLED_ENTRIES: readonly EnabledEntry[] = [
  { label: 'FileMap canvas', path: '/canvas' },
  { label: 'Overview', path: '/overview' },
  { label: 'Exceptions', path: '/exceptions' },
  { label: 'Competitive atlas', path: '/competitive' },
  { label: 'Approvals', path: '/approvals' },
  { label: 'Audit trail', path: '/audit' },
  { label: 'Sovereignty and policies', path: '/admin/sovereignty' },
  { label: 'Evidence assistant', path: '/assistant' },
];

/**
 * The five entries whose stage has not been built, with the tooltip AAP 0.12.4 fixes for each.
 *
 * Rule P-8 allows such an entry to exist only as a visibly disabled control that explains itself, so
 * each is asserted for its disabled state and for the exact sentence it exposes as its description.
 */
const DISABLED_ENTRIES: readonly DisabledEntry[] = [
  { label: 'Evidence workspace', tooltip: 'Arrives in stage S4' },
  { label: 'Suppliers', tooltip: 'Arrives in stage S4' },
  { label: 'Production plan', tooltip: 'Arrives in stage S5' },
  { label: 'Data sources', tooltip: 'Arrives in stage S5' },
  { label: 'Models', tooltip: 'Arrives in stage S5' },
];

/**
 * The stage-notice paths no navigation entry can be followed to, in the table's own order.
 *
 * Four are the routes of the disabled entries in `DISABLED_ENTRIES`, which rule P-8 renders as a
 * control that explains itself rather than as a link, and two are the profile paths the navigation
 * never lists. A person reaches one of them by typing its address, so that is how this sweep opens
 * them: no control leads there, and activating a disabled entry would assert the opposite of what the
 * rule requires. The seventh stage-notice path, `/evidence`, is not repeated here — it is the external
 * supplier engineer's home route, so the role switcher reaches it below.
 *
 * Three of the six are parameterised, and each carries a segment that is plainly not a record
 * identifier: the stage-notice page reads no path parameter — it derives the workspace's name from the
 * route table (`workspaceNameFor` in `src/app/stage-notice-page.tsx`) — so any segment reaches the same
 * page, and rule P-6 keeps a record's identifier out of an address.
 */
const STAGE_NOTICE_PATHS: readonly string[] = [
  '/suppliers',
  '/suppliers/any-supplier',
  '/materials/any-material',
  '/plants/any-plant/plan',
  '/admin/sources',
  '/admin/models',
];

/**
 * How many distinct routes the T-15 sweep must cover.
 *
 * The eight entries that navigate, the four parameterised screens they lead to (one exception, its
 * option set, one approval and one policy), the seven stage-notice paths — the evidence workspace the
 * external supplier engineer lands on, the four routes of the disabled entries and the two profile
 * paths the navigation never lists — and the one unknown route the not-found page answers: twenty.
 * Asserting the number is what turns "the badge was on the routes I happened to visit" into "the badge
 * was on every route this build declares" — a route added without the badge changes the count and
 * fails.
 */
const EXPECTED_ROUTE_COUNT = 20;

/* ---------------------------------------------------------------------------------------------
 * Locators and assertions shared by the tests — role and accessible name only (rule B-3)
 * ------------------------------------------------------------------------------------------- */

/**
 * The one badge the shell mounts, located the way a reader reaches it: the banner's own control whose
 * accessible name carries the §5.3 label and, with it, the demonstration clock.
 *
 * @param page The Playwright page showing the application.
 * @returns The locator for the badge as a control.
 */
function simulatorBadge(page: Page): Locator {
  return page.getByRole('banner').getByRole('button', { name: BADGE_LABEL });
}

/**
 * The route's own content: the shell's `main` landmark, inside which the router outlet renders.
 *
 * Every state assertion below is scoped to it, so a word the top bar happens to print — the popover's own
 * `Loading` toggle, for instance — can never stand in for a state a screen renders.
 *
 * @param page The Playwright page showing the application.
 * @returns The locator for the main landmark.
 */
function screen(page: Page): Locator {
  return page.getByRole('main');
}

/**
 * The shell's primary navigation landmark, which carries the accessible name its module fixes.
 *
 * @param page The Playwright page showing the application.
 * @returns The locator for the navigation landmark.
 */
function primaryNavigation(page: Page): Locator {
  return page.getByRole('navigation');
}

/**
 * The single simulation popover, by the exact §5.3 name its heading gives it.
 *
 * @param page The Playwright page showing the application.
 * @returns The locator for the dialog.
 */
function simulationDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: SIMULATED_CONTROL });
}

/**
 * One route path as an end-anchored pattern, so `toHaveURL` compares the path on this preview origin
 * rather than an origin the test would have to state.
 *
 * @param path The absolute path the route lands on, such as `/overview`.
 * @returns A pattern matching a URL that ends with that path.
 */
function routePattern(path: string): RegExp {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`${escaped}$`);
}

/**
 * Asserts the badge, its label and its clock on the route the page is showing, and that the badge belongs
 * to the shell rather than to the route.
 *
 * The last assertion is the one that keeps rule P-1 structural: the badge must not be a descendant of the
 * `main` landmark the outlet renders inside, because a badge inside a route would be one screen's and the
 * next route could omit it.
 *
 * @param page The Playwright page showing the application.
 * @param pathname The pathname the assertion is reporting, used in every failure message.
 */
async function expectBadgeOnRoute(page: Page, pathname: string): Promise<void> {
  const badge = simulatorBadge(page);

  await expect(
    badge,
    `Rule P-1 requires one ${BADGE_LABEL} badge on every route, and the shell renders none on ${pathname}.`,
  ).toHaveCount(1);
  await expect(badge, `The ${BADGE_LABEL} badge is not visible on ${pathname}.`).toBeVisible();
  await expect(
    badge,
    `The badge on ${pathname} does not carry the §5.3 label ${BADGE_LABEL}.`,
  ).toContainText(BADGE_LABEL);
  await expect(
    badge,
    `The badge on ${pathname} does not print the demonstration clock ${DEMO_CLOCK}.`,
  ).toContainText(DEMO_CLOCK);
  await expect(
    screen(page).getByRole('button', { name: BADGE_LABEL }),
    `The badge on ${pathname} sits inside the router outlet, so it belongs to a route rather than to the shell and another route could omit it.`,
  ).toHaveCount(0);
}

/**
 * Records the pathname the browser is showing and asserts the badge on it.
 *
 * @param page The Playwright page showing the application.
 * @param visited The set of distinct pathnames this sweep has covered.
 * @returns The pathname recorded.
 */
async function recordRoute(page: Page, visited: Set<string>): Promise<string> {
  const { pathname } = new URL(page.url());
  visited.add(pathname);
  await expectBadgeOnRoute(page, pathname);

  return pathname;
}

/**
 * Opens the application at its root, which the shell resolves to the acting persona's entry route, and
 * waits until the shell itself has rendered.
 *
 * The wait is for the badge rather than for the `main` landmark, because the service provider's startup
 * skeleton renders a `main` of its own while the in-browser adapter hashes the seeded audit trail: the
 * landmark is therefore already there before the shell, and every control this suite drives — the badge,
 * the navigation, the role switcher — arrives with the shell.
 *
 * @param page The Playwright page showing the application.
 */
async function enterDemonstration(page: Page): Promise<void> {
  await page.goto('/');
  await expect(
    simulatorBadge(page),
    'The shell never rendered the badge that opens the simulation popover.',
  ).toBeVisible();
}

/**
 * Confirms the popover a trigger opened is on screen, then closes it the way a reader does.
 *
 * A spec that navigated under an open popover would be clicking a page the panel covers, and the panel's
 * own controls would share names with the states a screen renders; closing it is what makes the state
 * assertions unambiguous.
 *
 * @param page The Playwright page showing the application.
 */
async function closeSimulationPanel(page: Page): Promise<void> {
  await expect(simulationDialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    simulationDialog(page),
    'Escape did not close the simulation popover, which the panel binds while it is open.',
  ).toHaveCount(0);
}

/**
 * Activates one navigation entry and waits for the route it declares.
 *
 * @param page The Playwright page showing the application.
 * @param label The entry's visible label, which is also its accessible name.
 * @param path The path the entry navigates to.
 */
async function clickNavEntry(page: Page, label: string, path: string): Promise<void> {
  await primaryNavigation(page).getByRole('link', { name: label, exact: true }).click();
  await expect(page, `Activating the ${label} entry did not reach ${path}.`).toHaveURL(
    routePattern(path),
  );
}

/**
 * Opens one stage-notice route by address and asserts what that page must render.
 *
 * The badge is waited for rather than the `main` landmark, for the reason {@link enterDemonstration}
 * gives: the provider's startup skeleton draws a `main` of its own while the adapter hashes the seeded
 * chain, and the shell arrives with the badge. The arrival sentence is what proves the address rendered
 * the stage notice instead of falling through to the not-found page, which the shell frames identically.
 *
 * @param page The Playwright page showing the application.
 * @param path The stage-notice path to open, one of {@link STAGE_NOTICE_PATHS}.
 * @param visited The set of distinct pathnames this sweep has covered.
 * @returns The pathname recorded.
 */
async function openStageNotice(page: Page, path: string, visited: Set<string>): Promise<string> {
  await page.goto(path);
  await expect(
    simulatorBadge(page),
    `The shell never rendered the badge on the stage-notice route ${path}.`,
  ).toBeVisible();
  await expect(
    screen(page),
    `The stage-notice route ${path} does not state the stage its workspace arrives in, so the address did not render the notice.`,
  ).toContainText(STAGE_NOTICE_ARRIVAL);

  return recordRoute(page, visited);
}

/**
 * Waits until a table holds several records and returns its first data row.
 *
 * The mock adapter injects 150-400 ms of latency, and a table with nothing to show renders its header row
 * and one cell carrying the sentence that explains the absence: two rows. A table of several records has
 * more, so the count is the honest signal that the records arrived, and no record value is typed to find
 * them (rule P-6).
 *
 * Only for a table whose record set holds more than one row, which the exception queue and the policy
 * list do. The approvals inbox can hold a single plan — one record and an empty table then have the same
 * number of rows — so that table is reached through {@link rowsCarrying} instead.
 *
 * @param table The table locator to read.
 * @param description What the caller was waiting for, quoted when it never arrived.
 * @returns A locator for the table's first data row.
 */
async function firstRowOfSeveralRecords(table: Locator, description: string): Promise<Locator> {
  await expect.poll(async () => table.getByRole('row').count(), { message: description }).toBeGreaterThan(2);

  return table.getByRole('row').nth(1);
}

/**
 * The rows of a table that carry a given visible marker, once at least one has arrived.
 *
 * A row that holds a record carries something a row without one does not — each plan in the approvals
 * inbox carries an evidence trigger, and no empty table does — so the marker is how a data row is told
 * apart from the sentence a table shows when it holds nothing. Counting rows cannot do that for a table of
 * one record, and typing an identifier to find the row would break rule P-6.
 *
 * @param table The table locator to read.
 * @param marker A pattern only a row holding a record matches.
 * @param description What the caller was waiting for, quoted when it never arrived.
 * @returns A locator for the matching rows.
 */
async function rowsCarrying(table: Locator, marker: RegExp, description: string): Promise<Locator> {
  const rows = table.getByRole('row').filter({ hasText: marker });
  await expect.poll(async () => rows.count(), { message: description }).toBeGreaterThan(0);

  return rows;
}

/**
 * One of the nine triggers the popover offers, taken from the helper's own signature rather than from a
 * second list here.
 */
type Trigger = Parameters<typeof triggerSimulationState>[1];

/**
 * Puts the demonstration into one trigger, closes the panel and opens the exception queue.
 *
 * The queue is the screen this suite reads most states from: the same read drives the loading, empty,
 * stale, partial, offline, forbidden and conflict renderings, and it lists the row that opens the
 * investigation screen the partial state is also readable on.
 *
 * @param page The Playwright page showing the application.
 * @param trigger The trigger to put in effect, which the helper resolves from the panel's own controls.
 * @returns The main landmark of the queue screen.
 */
async function triggerThenOpenQueue(page: Page, trigger: Trigger): Promise<Locator> {
  await enterDemonstration(page);
  await triggerSimulationState(page, trigger);
  await closeSimulationPanel(page);
  await clickNavEntry(page, 'Exceptions', '/exceptions');

  return screen(page);
}

/* ---------------------------------------------------------------------------------------------
 * T-15 — the badge on every route
 * ------------------------------------------------------------------------------------------- */

test('T-15 the Simulated data badge labels every route the shell renders', async ({ page }) => {
  const visited = new Set<string>();

  await enterDemonstration(page);
  await recordRoute(page, visited);

  /* The badge is the popover's only opener, so activating it is what proves the badge is the control
     that carries the demonstration's clock to a reader on any route rather than a decorative marker. */
  await simulatorBadge(page).click();
  await expect(
    simulationDialog(page),
    'Activating the badge did not open the simulation popover it is the only opener for.',
  ).toBeVisible();
  await expect(
    page.getByRole('dialog'),
    'More than one dialog opened from the badge, so a second popover could exist beside the shell\'s own.',
  ).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(
    simulationDialog(page),
    'Escape did not close the simulation popover, which the panel binds while it is open.',
  ).toHaveCount(0);

  /* Every entry of the navigation that navigates, in the table's own order. */
  for (const entry of ENABLED_ENTRIES) {
    await clickNavEntry(page, entry.label, entry.path);
    await recordRoute(page, visited);
  }

  /* The parameterised screens, reached from the record each parent screen lists rather than by address:
     a queue row opens its investigation, that investigation opens the option set, an inbox row opens
     its plan, and a policy row opens its detail. */
  await clickNavEntry(page, 'Exceptions', '/exceptions');
  await screen(page)
    .getByRole('button', { name: /^Open\s*:/ })
    .first()
    .click();
  await expect(page, 'A queue row did not open its own investigation.').toHaveURL(
    /\/exceptions\/[^/]+$/,
  );
  await recordRoute(page, visited);

  await screen(page).getByRole('button', { name: 'Compare options', exact: true }).click();
  await expect(page, 'The investigation did not open the option set it offers.').toHaveURL(
    /\/exceptions\/[^/]+\/scenarios$/,
  );
  await recordRoute(page, visited);

  await clickNavEntry(page, 'Approvals', '/approvals');
  const approvalRows = await rowsCarrying(
    screen(page),
    /open evidence/,
    'The approvals inbox never rendered the plan it holds.',
  );
  await approvalRows.first().dblclick();
  await expect(page, 'An inbox row did not open the plan it names.').toHaveURL(
    /\/approvals\/[^/]+$/,
  );
  await recordRoute(page, visited);

  /* The six stage-notice paths no entry can be followed to, opened by address. Nothing this test has
     arranged lives in the adapter's memory by this point — every step so far has only read — so the
     document load each address causes re-seeds nothing the sweep depends on, and the persona is chosen
     again below. */
  for (const path of STAGE_NOTICE_PATHS) {
    await openStageNotice(page, path, visited);
  }

  /* The two routes no screen of the material planner's scope lists: one policy, reached by the persona
     that may read the declared configuration, and the stage notice the external supplier engineer lands
     on. Both are reached by the role switcher, which is a product feature rather than a test hook. */
  await switchRole(page, 'USR-04');
  await recordRoute(page, visited);

  const policies = page.getByRole('region', { name: 'Policies', exact: true });
  const policyRow = await firstRowOfSeveralRecords(
    policies.getByRole('table'),
    'The policy list never rendered the policies the engine evaluates.',
  );
  await policyRow.dblclick();
  await expect(page, 'A policy row did not open its own detail.').toHaveURL(
    /\/admin\/policies\/[^/]+$/,
  );
  await recordRoute(page, visited);

  await switchRole(page, 'USR-08');
  await expect(page, 'The external supplier engineer did not land on the evidence workspace.').toHaveURL(
    routePattern('/evidence'),
  );
  await expect(
    screen(page),
    'The evidence workspace route does not state the stage its workspace arrives in.',
  ).toContainText(STAGE_NOTICE_ARRIVAL);
  await recordRoute(page, visited);

  /* The one route no control offers, which the not-found page answers. It is loaded rather than
     clicked because nothing links to it, and it is loaded last so the page reload cannot disturb a
     state an earlier step arranged. */
  await page.goto('/a-route-this-demonstration-does-not-declare');
  await expect(page.getByRole('heading', { name: NOT_FOUND_HEADING })).toBeVisible();
  await recordRoute(page, visited);

  for (const entry of ENABLED_ENTRIES) {
    expect(visited.has(entry.path), `The sweep never reached ${entry.path}.`).toBe(true);
  }

  for (const path of STAGE_NOTICE_PATHS) {
    expect(visited.has(path), `The sweep never reached the stage-notice route ${path}.`).toBe(true);
  }

  test.info().annotations.push({
    type: 'routes covered',
    description: [...visited].sort().join(' '),
  });

  expect(
    visited.size,
    `The sweep covered ${visited.size} distinct routes and this build declares ${EXPECTED_ROUTE_COUNT}: eight navigation entries, four parameterised screens, seven stage-notice paths and the not-found route. A route added without the badge, or one that stopped being reachable, changes this count.`,
  ).toBe(EXPECTED_ROUTE_COUNT);
});

/* ---------------------------------------------------------------------------------------------
 * T-17 — the seven screen states, each from the one popover
 * ------------------------------------------------------------------------------------------- */

test('T-17 the loading state holds the queue and withholds its rows', async ({ page }) => {
  const queue = await triggerThenOpenQueue(page, 'loading');

  const loading = queue.getByRole('status', { name: LOADING_HEADLINE });
  await expect(
    loading,
    'The queue never rendered the loading state, so a pending read is presented as an answer.',
  ).toBeVisible();
  await expect(loading, 'The loading region does not announce that it is busy.').toHaveAttribute(
    'aria-busy',
    'true',
  );
  await expect(
    queue.getByRole('button', { name: /^Open\s*:/ }),
    'The loading state left the queue\'s rows on screen, so a half-read queue could be read as a complete one.',
  ).toHaveCount(0);

  await resetDemoData(page);
});

test('T-17 the empty state reports an answer that holds no record', async ({ page }) => {
  const queue = await triggerThenOpenQueue(page, 'empty');

  const notice = queue.getByRole('status').filter({ hasText: QUEUE_EMPTY });
  await expect(
    notice,
    'The queue did not report the empty state, so an answer with no record in it is presented as a failure or as nothing at all.',
  ).toHaveCount(1);
  await expect(notice).toBeVisible();
  await expect(queue.getByRole('button', { name: /^Open\s*:/ })).toHaveCount(0);

  await resetDemoData(page);
});

test('T-17 the stale state names the source behind the queue and the instant it last answered', async ({
  page,
}) => {
  const queue = await triggerThenOpenQueue(page, 'stale');

  const banner = queue.getByRole('status').filter({ hasText: STALE_SUFFIX });
  await expect(
    banner,
    'The queue did not warn that the source behind it is out of date, so stale figures are presented as current.',
  ).toHaveCount(1);
  await expect(banner, 'The stale banner names no source.').toContainText(APPROVAL_GATE_SOURCE);
  await expect(banner, 'The stale banner prints no as-of reading.').toContainText(
    STALE_AS_OF_PREFIX,
  );
  await expect(banner, 'The stale banner prints no as-of instant.').toContainText(INSTANT);

  /* A stale source warns about the figures; it does not remove them. */
  await expect(queue.getByRole('button', { name: /^Open\s*:/ }).first()).toBeVisible();

  await resetDemoData(page);
});

test('T-17 the partial state warns above the figures a source answered incompletely for', async ({
  page,
}) => {
  const queue = await triggerThenOpenQueue(page, 'partial');

  /* The trigger stands for a source that answered incompletely, which the record states in its own
     missing inputs; that record's investigation is where the state is rendered, so the row that lists
     it is opened the way a reader opens it. */
  await queue
    .getByRole('button', { name: /^Open\s*:/ })
    .first()
    .click();
  await expect(page, 'A queue row did not open its own investigation.').toHaveURL(
    /\/exceptions\/[^/]+$/,
  );

  const investigation = screen(page);
  const notice = investigation.getByRole('status').filter({ hasText: PARTIAL_HEADLINE });
  await expect(
    notice,
    'The investigation did not warn that inputs are missing, so figures drawn from incomplete records are presented as complete.',
  ).toHaveCount(1);
  await expect(notice).toBeVisible();

  /* A partial answer warns above the content, which keeps rendering. */
  await expect(
    investigation.getByRole('button', { name: 'Compare options', exact: true }),
  ).toBeVisible();

  await resetDemoData(page);
});

test('T-17 the offline state withholds the figures and offers a retry', async ({ page }) => {
  const queue = await triggerThenOpenQueue(page, 'offline');

  const notice = queue.getByRole('status').filter({ hasText: OFFLINE_HEADLINE });
  await expect(
    notice,
    'The queue did not report that no source answered, so a read that failed is presented as an answer.',
  ).toHaveCount(1);
  await expect(notice).toBeVisible();
  await expect(
    queue.getByRole('button', { name: RETRY_LABEL, exact: true }),
    'The failure offered no control to repeat the read it could not complete (rule P-8).',
  ).toBeVisible();
  await expect(queue.getByRole('button', { name: /^Open\s*:/ })).toHaveCount(0);

  await resetDemoData(page);
});

test('T-17 the forbidden state names the permission and the roles that may act', async ({ page }) => {
  const queue = await triggerThenOpenQueue(page, 'forbidden');

  const card = queue.getByRole('region', {
    name: new RegExp(`^${PERMISSION_REQUIRED_PREFIX}`),
  });
  await expect(
    card,
    'The refusal did not name the permission the call required, so a reader is told only that something was denied.',
  ).toHaveCount(1);
  await expect(card).toBeVisible();
  await expect(card.getByText(ROLES_THAT_MAY_ACT, { exact: true })).toBeVisible();
  await expect(
    card.getByRole('listitem').first(),
    'The refusal names no role that may act, so a reader has nobody to take the action to.',
  ).toBeVisible();
  await expect(queue.getByRole('button', { name: /^Open\s*:/ })).toHaveCount(0);

  await resetDemoData(page);
});

test('T-17 the conflicting-update state refuses a decision instead of merging it', async ({ page }) => {
  await enterDemonstration(page);

  /* The decision needs a role that may take it, and the inbox the role lands on is where the plan that
     awaits one is listed. */
  await switchRole(page, 'USR-02');

  await triggerSimulationState(page, 'conflict');
  await closeSimulationPanel(page);
  await clickNavEntry(page, 'Approvals', '/approvals');

  const inbox = screen(page).getByRole('table');

  /* The one plan that still awaits a decision: every other row of the seeded inbox carries the decision
     already recorded on it. Waiting for that row is also how the read's latency is waited out, without
     counting rows — an inbox holding one plan has as many rows as an empty one. */
  const pendingRow = inbox.getByRole('row').filter({ hasText: 'pending' });
  await expect(pendingRow, 'The inbox holds no plan awaiting a decision.').toHaveCount(1);
  await pendingRow.first().dblclick();
  await expect(page, 'An inbox row did not open the plan it names.').toHaveURL(
    /\/approvals\/[^/]+$/,
  );

  const detail = screen(page);
  const decision = detail.getByRole('region', { name: 'Decision', exact: true });
  await expect(decision).toBeVisible();
  await decision.getByLabel(COMMENT_LABEL).fill(
    'A decision taken against a record that changed while it was being read.',
  );

  /* Every side effect the plan defers another product's supply for has to be acknowledged before it may be
     approved, and that list arrives with the plan's own read rather than with the page: the wait is for the
     first acknowledgement, not for the click that follows it. */
  const acknowledgements = decision.getByRole('button', { name: /I have read the side effect/ });
  await expect(
    acknowledgements.first(),
    'The plan lists no side effect to acknowledge, so the gate this decision has to pass is not on screen.',
  ).toBeVisible();
  for (const acknowledgement of await acknowledgements.all()) {
    if ((await acknowledgement.getAttribute('aria-pressed')) !== 'true') {
      await acknowledgement.click();
    }
  }

  const approve = decision.getByRole('button', { name: APPROVE_LABEL, exact: true });
  await expect(
    approve,
    'Approve stayed disabled after the comment and the side effect were given, so no decision could be attempted.',
  ).toBeEnabled();
  await approve.click();

  const refusal = detail.getByRole('status').filter({ hasText: CONFLICT_REFUSAL });
  await expect(
    refusal,
    'The conflicting-update trigger refused the decision without reporting it to the reader.',
  ).toHaveCount(1);
  await expect(refusal).toBeVisible();

  /* Reported rather than silently resolved: the plan still carries no decision. */
  await expect(
    detail.getByText(DECISION_TAKEN_LABEL, { exact: true }),
    'A decision was recorded against a record the service refused to write to, so the conflict was resolved silently.',
  ).toHaveCount(0);

  await resetDemoData(page);
});

/* ---------------------------------------------------------------------------------------------
 * T-17 — the two triggers that are not screen states
 * ------------------------------------------------------------------------------------------- */

test('T-17 the edited audit result makes verification report the break and repair nothing', async ({
  page,
}) => {
  await enterDemonstration(page);

  /* The trail is readable by the auditor, which is the persona whose home route it is. */
  await switchRole(page, 'USR-06');

  await triggerSimulationState(page, 'tampered-audit');
  await closeSimulationPanel(page);
  await clickNavEntry(page, 'Audit trail', '/audit');

  const trail = screen(page);
  const verification = trail.getByRole('region', { name: 'Chain verification', exact: true });
  await expect(verification).toBeVisible();
  await expect(
    verification,
    'The chain does not carry the note that states it shows a mechanism rather than tamper resistance (rule P-4).',
  ).toContainText(AUDIT_CHAIN_NOTE);

  const verify = verification.getByRole('button', { name: VERIFY_CHAIN_LABEL, exact: true });
  await verify.click();

  const report = verification.getByRole('status');
  await expect(report).toHaveCount(1);
  await expect(
    report,
    'Verification did not report the position the edit broke the chain at.',
  ).toContainText(new RegExp(`does not verify at sequence\\s*${TAMPERED_SEQUENCE}`));
  await expect(
    report,
    'The verification does not state that the check changed no record, which is the one claim it may make.',
  ).toContainText(/This check changed no record/);
  await expect(
    report,
    'The verification report carries no `Simulated control` label of its own (rule P-4).',
  ).toContainText(SIMULATED_CONTROL);

  /* Re-running the check reports the same position: the control demonstrates a mechanism and repairs
     nothing. */
  await verify.click();
  await expect(
    verification.getByRole('status'),
    'A second verification no longer reports the same break, so the first check appears to have repaired the chain.',
  ).toContainText(new RegExp(`does not verify at sequence\\s*${TAMPERED_SEQUENCE}`));

  expect(
    await trail.innerText(),
    'The audit trail states a property of the deployment that the demonstration cannot establish (rule P-4).',
  ).not.toMatch(UNIMPLEMENTED_CLAIM);

  await resetDemoData(page);
});

test('T-17 the emptied exception queue leaves the queue and the overview agreeing nothing is open', async ({
  page,
}) => {
  const queue = await triggerThenOpenQueue(page, 'empty-queue');

  await expect(
    queue.getByRole('status').filter({ hasText: QUEUE_EMPTY }),
    'The emptied queue did not render its empty state.',
  ).toHaveCount(1);
  await expect(queue.getByRole('button', { name: /^Open\s*:/ })).toHaveCount(0);

  /* The overview computes its figures from the same records, so its open-exceptions tile has to read zero
     while the queue holds nothing: the two screens agreeing is the whole assertion. The figure is read
     from the tile's own evidence trigger, whose accessible name begins with it, so no figure is typed
     here (rule P-6). */
  await clickNavEntry(page, 'Overview', '/overview');
  const openExceptions = screen(page).getByRole('region', { name: 'Open exceptions', exact: true });
  await expect(openExceptions).toBeVisible();
  await expect(
    openExceptions.getByRole('button').first(),
    'The overview reports an open exception while the queue holds none, so the two screens describe different record sets.',
  ).toHaveAccessibleName(/^0\b/);

  await resetDemoData(page);

  /* Once the records are restored the same two screens report them again, so the empty queue was the
     trigger's doing rather than a workspace with nothing in it. */
  await clickNavEntry(page, 'Exceptions', '/exceptions');
  await expect(
    screen(page).getByRole('button', { name: /^Open\s*:/ }).first(),
    'The queue did not report its records again after the demonstration was reset.',
  ).toBeVisible();

  await clickNavEntry(page, 'Overview', '/overview');
  const restored = screen(page).getByRole('region', { name: 'Open exceptions', exact: true });
  await expect(
    restored.getByRole('button').first(),
    'The open-exceptions tile still reports nothing after the records were restored, so the zero read above was not the emptied queue\'s doing.',
  ).toHaveAccessibleName(/^[1-9]/);
});

/* ---------------------------------------------------------------------------------------------
 * The demonstration controls and the entries a stage has not declared
 * ------------------------------------------------------------------------------------------- */

test('the role switcher states what it is and that its checks are not production authorisation', async ({
  page,
}) => {
  await enterDemonstration(page);

  for (const theme of ['command', 'paper'] as const) {
    await setTheme(page, theme);

    await expect(
      page.getByText(ROLE_SWITCHER_LABEL, { exact: true }),
      `The role switcher's label is missing or reworded in the ${theme} theme (rule P-3).`,
    ).toBeVisible();
    await expect(
      page.getByText(ROLE_SWITCHER_NOTE, { exact: true }),
      `The non-authorisation note is missing or reworded in the ${theme} theme (rule P-3).`,
    ).toBeVisible();

    const switcher = page.getByRole('combobox', { name: 'Demo role switcher' });
    await expect(switcher, `The switcher is not one named control in the ${theme} theme.`).toHaveCount(
      1,
    );
    await expect(
      switcher,
      `The switcher's own description does not carry the non-authorisation note in the ${theme} theme.`,
    ).toHaveAccessibleDescription(/not production authorisation/);
  }
});

test('every navigation entry either navigates or explains why it cannot', async ({ page }) => {
  await enterDemonstration(page);

  const nav = primaryNavigation(page);
  await expect(nav).toBeVisible();

  for (const entry of DISABLED_ENTRIES) {
    const control = nav.getByRole('button', { name: entry.label, exact: true });
    await expect(
      control,
      `${entry.label} is not one disabled control, so a reader cannot tell what the entry does (rule P-8).`,
    ).toHaveCount(1);
    await expect(control).toBeVisible();
    await expect(
      control,
      `${entry.label} can still be activated although its stage has not been built.`,
    ).toBeDisabled();
    await expect(
      control,
      `${entry.label} does not expose the explanation rule P-8 requires it to give.`,
    ).toHaveAccessibleDescription(entry.tooltip);
    await expect(
      nav.getByRole('link', { name: entry.label, exact: true }),
      `${entry.label} renders as a link as well, so the entry could be followed to a route its stage does not declare.`,
    ).toHaveCount(0);
  }

  for (const entry of ENABLED_ENTRIES) {
    const link = nav.getByRole('link', { name: entry.label, exact: true });
    await expect(
      link,
      `${entry.label} is not one link, so the route it names cannot be reached from the shell.`,
    ).toHaveCount(1);
    await link.click();
    await expect(page, `Activating ${entry.label} did not reach ${entry.path}.`).toHaveURL(
      routePattern(entry.path),
    );
  }
});

