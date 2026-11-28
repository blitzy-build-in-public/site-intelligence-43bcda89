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
 * WHY THE DENSITY AXIS IS PROVED HERE. The badge, the theme switch and the density switch are the shell's
 * demonstration-wide controls — each changes something a reader sees on every screen at once — and this
 * file is where they are proved: T-15 drives the badge on every route, the role switcher test drives the
 * theme switch through both themes, and the last test below drives the density switch. AAP 0.5.3 fixes
 * that axis as two row heights, 32 px and 44 px, selected by the `data-density` attribute
 * `src/theme/theme-provider.tsx` writes on `<html>` and read by the `--row-height` token
 * `src/theme/tokens.css` derives from it. No other suite presses the switch, so an application that
 * stopped writing the attribute, or whose rows stopped reading the token, would pass every other test in
 * the gate; this file is the only one that measures a row to prove the two still agree, and that
 * measurement is the one place here where geometry is the subject rather than a word a screen renders.
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
 * the screens the port feeds), B-3 (every locator is a role and an accessible name, and no state is read
 * from a colour or a size — the one measurement this file takes is the density token itself) and P-7
 * (only the synthetic names the application renders).
 */
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { setDensity } from './helpers/density';
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
 * The pass reading a verification of the restored chain states: the audit screen's own sentence for a
 * report that found no break.
 *
 * No input fixes this wording, so it is stated here rather than read back from the screen the assertion
 * is checking — a reading the suite took from the screen itself could agree with any sentence at all.
 */
const CHAIN_VERIFIED_HEADLINE = 'The chain verified at the moment of this check';

/**
 * What a verification that found a break reports, matched without the position.
 *
 * The two assertions below are about that reading being absent — before the check is re-run, so no
 * verdict about the edited chain is left standing, and after it, so the restored chain is not described
 * by the break the edit produced — so the position has no part in either of them.
 */
const CHAIN_BREAK_READING = /does not verify/;

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
const RELOAD_LABEL = 'Reload';
const PARTIAL_HEADLINE = 'Some inputs are missing';
const OFFLINE_HEADLINE = 'No source is answering';
const ROLES_THAT_HOLD_THE_PERMISSION = 'Roles that hold this permission';
const PERMISSION_REQUIRED_PREFIX = 'Permission required:';
const STALE_SUFFIX = /is not current/;
const STALE_AS_OF_PREFIX = /As of/;

/**
 * The queue's own sentence for an answer that holds no row and nothing narrowed the read.
 *
 * Both triggers below empty the queue itself rather than narrowing it — the "Empty the exception queue"
 * control and the popup's empty state — so the answer states no filter, and the sentence the screen
 * shows is the trigger-neutral one rather than the wording a filter set that matched nothing gets.
 */
const QUEUE_EMPTY = 'No exceptions to show.';

/**
 * The overview's own sentence for a scope holding nothing to summarise.
 *
 * The screen reports an emptied population in words rather than as four confident zeros, so this is the
 * rendering the empty state gives on that screen (specification §8, AAP §0.12.4).
 */
const OVERVIEW_EMPTY = 'No exception is open in this scope, so there is nothing to summarise.';

/** The not-found page's heading and the stage notice's arrival sentence for the S4 routes. */
const NOT_FOUND_HEADING = 'Page not found';
const STAGE_NOTICE_ARRIVAL = /arrives in stage S\d/i;

/**
 * The headline the state boundary gives the conflicting-update state.
 *
 * The state is reached from the popover's "Conflicting update" trigger, whose service behaviour is to
 * refuse a read whose payload is a collection — a set presented as current is what the state prevents —
 * so the screens that present one report it. The write half of the same condition, a decision refused
 * rather than merged, is proved at the service layer in `src/services/mock/mock-backend.test.ts`: a read
 * of one record is served so the decision can be attempted, and the refusal the decision meets is what
 * the approval detail reports in place.
 */
const CONFLICT_HEADLINE = 'This record changed while you were reading it';

/**
 * The vocabulary rule P-4 forbids anywhere in the interface: the application never states that it
 * establishes sovereignty, prevents copying or resists tampering. `tamper resistance` — which the fixed
 * note above names in order to deny it — deliberately does not match this pattern.
 */
const UNIMPLEMENTED_CLAIM = /tamper-proof|tamper resistant|zero trust|guaranteed|certified/i;

/** The shape of an ISO 8601 instant, used only to prove that an as-of time is printed at all. */
const INSTANT = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/* ---------------------------------------------------------------------------------------------
 * The density axis — AAP 0.5.3's 32 px and 44 px rows, and the table they are measured on
 * ------------------------------------------------------------------------------------------- */

/**
 * One of the two densities the switch leaves the session in, taken from the helper's own signature
 * rather than restated as a second union here.
 */
type Density = Parameters<typeof setDensity>[1];

/**
 * The custom property `src/theme/tokens.css` derives from `<html data-density>` and every table row is
 * sized by.
 *
 * Named once, so the utility a row must carry and the value the property must compute to are spelled
 * from one string: two spellings could drift apart and leave the assertions checking different tokens.
 */
const ROW_HEIGHT_TOKEN = '--row-height';

/**
 * The utility `src/components/data-table.tsx` sizes a data row with: the arbitrary Tailwind form of the
 * token above, which the component states as its own `ROW_HEIGHT_CLASS`.
 *
 * It is asserted on the measured row because it is what makes the measurement follow the switch. A row
 * whose height came from a fixed pixel utility would measure the same in both densities, and a row that
 * named another custom property would take its height from a token the switch does not set.
 */
const ROW_HEIGHT_UTILITY = `h-[var(${ROW_HEIGHT_TOKEN})]`;

/**
 * The two row heights AAP 0.5.3 fixes, in pixels, for the density that selects each.
 *
 * These are the specification's density tokens — specification §4.3's "32 px and 44 px rows", mapped by
 * AAP 0.5.3 onto `--row-compact` and `--row-comfortable` — and not business figures, which rule P-6
 * forbids typing: that rule governs every number a screen computes from its records, while a design
 * token is the value a screen is measured against. Holding them here rather than reading them back from
 * the page is what lets a measurement disagree with the token it is supposed to follow.
 */
const ROW_HEIGHT_PX: Readonly<Record<Density, number>> = {
  compact: 32,
  comfortable: 44,
};

/**
 * The accessible name of the overview's risk-by-plant table: the table the two row heights are measured
 * on.
 *
 * `src/features/scr-01-overview` renders that sentence as the table's caption, so the table is found by
 * the name a reader is given rather than by its position on the screen. This is the table whose height
 * is the token alone: a row that describes an incident or summarises a plan keeps the height its own
 * content needs, whatever the density, so neither could prove the token.
 */
const BY_PLANT_TABLE = 'Open exceptions and revenue at risk, by plant';

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
 * waits until the shell has rendered and that entry route has been reached.
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
  /* The root address is answered by the shell's own redirect, and the screen it redirects to arrives as
     its own module, so the shell paints while the address is still `/`. Waiting for the entry route is
     what makes the screen a reader lands on the first route this suite reads: without it a sweep that
     recorded the address right here would count the redirect itself as a route of the application. The
     predicate is the whole wait — any path but the root is the redirect having committed. */
  await page.waitForURL((url) => url.pathname !== '/');
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
 * The density axis — the switch, the attribute and the token a table row is sized by (AAP 0.5.3)
 * ------------------------------------------------------------------------------------------- */

/** What one table row renders at the moment it is measured. */
interface RowMeasurement {
  /** The height the row occupies on screen, in pixels, as the browser lays it out. */
  readonly heightPx: number;
  /** The class list the row carries, which is what its height is derived from. */
  readonly classes: string;
}

/**
 * Measures one table row and reads the classes that size it.
 *
 * One `evaluate` reads both, so the two describe the same rendering, and the height comes from the row's
 * own box rather than from a cell's: `border-collapse: collapse` gives the row's box the borders its
 * cells share, which is the height the density token sets.
 *
 * @param row The row locator to measure.
 * @returns The row's measured height and its class list.
 */
async function measureRow(row: Locator): Promise<RowMeasurement> {
  return row.evaluate((element) => {
    const rect = element.getBoundingClientRect();

    return { heightPx: rect.height, classes: element.getAttribute('class') ?? '' };
  });
}

/**
 * The density the session is in, read from the attribute that selects the row height.
 *
 * Read rather than assumed, because AAP 0.12.4 gives the personas different starting densities. A value
 * outside the two AAP 0.5.3 defines is reported as an error naming what `<html>` carried: a session whose
 * provider wrote nothing has no row height to be measured against.
 *
 * @param page The Playwright page showing the application.
 * @returns The density in effect.
 * @throws An `Error` naming the observed attribute value when it is neither of the two densities.
 */
async function readDensity(page: Page): Promise<Density> {
  const observed = await page.locator('html').getAttribute('data-density');

  if (observed !== 'compact' && observed !== 'comfortable') {
    throw new Error(
      `<html> carries data-density=${JSON.stringify(observed)}, and AAP 0.5.3 defines only "compact" and "comfortable", so no row height is selected.`,
    );
  }

  return observed;
}

/**
 * The value the row-height token computes to on the document root.
 *
 * Read as the substituted value — `32px` or `44px` — rather than as the declaration in the stylesheet,
 * because substitution is what proves the attribute reached the custom property, and not only that it
 * was set.
 *
 * @param page The Playwright page showing the application.
 * @returns The computed value of the token, trimmed.
 */
async function rowHeightToken(page: Page): Promise<string> {
  return page.evaluate(
    (token: string) => getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
    ROW_HEIGHT_TOKEN,
  );
}

/**
 * Asserts that the row-height token computes to the value `density` fixes.
 *
 * @param page The Playwright page showing the application.
 * @param density The density the page is in.
 */
async function expectRowHeightToken(page: Page, density: Density): Promise<void> {
  const expected = `${ROW_HEIGHT_PX[density]}px`;
  const measured = await rowHeightToken(page);

  expect(
    measured,
    `The session is in ${density} density and ${ROW_HEIGHT_TOKEN} on :root reads ${JSON.stringify(measured)}, where AAP 0.5.3 fixes it at ${expected}.`,
  ).toBe(expected);
}

/**
 * Asserts that one row renders the height `density` fixes and still takes that height from the token.
 *
 * The class assertion is what keeps the measurement from passing by coincidence: a row that switched to a
 * fixed pixel utility, or to another custom property, would stop following the switch however tall it
 * happened to stand. The measurement itself is polled, because the application writes the attribute in
 * the switch's own handler and the row re-lays out on the frame after it — a single reading would race
 * that recalculation, and a row that never reaches the height still reports the height it settled on.
 *
 * @param row The row locator to measure.
 * @param density The density the page is in.
 * @param description The row as a reader would name it, quoted in every failure message.
 * @returns The height the row was measured at, in pixels.
 */
async function expectRowFollowsDensity(
  row: Locator,
  density: Density,
  description: string,
): Promise<number> {
  const expectedPx = ROW_HEIGHT_PX[density];

  await expect
    .poll(async () => (await measureRow(row)).heightPx, {
      message: `${description} should measure ${expectedPx} px in ${density} density (AAP 0.5.3) and never reached that height.`,
    })
    .toBe(expectedPx);

  const measured = await measureRow(row);
  expect(
    measured.classes,
    `${description} measures ${measured.heightPx} px in ${density} density but carries the classes ${JSON.stringify(measured.classes)}, none of which is ${ROW_HEIGHT_UTILITY}: its height does not come from the ${ROW_HEIGHT_TOKEN} token, so the density the attribute names cannot size it.`,
  ).toContain(ROW_HEIGHT_UTILITY);

  return measured.heightPx;
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
  await approvalRows.first().getByRole('cell').first().click();
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
  /* The row's policy cell holds an evidence reference — a control that opens the drawer for the policy
     it names (principle PR-6) — so the row is activated through a cell that carries no control of its
     own, which is how a reader opens a record from this table. */
  await policyRow.getByRole('cell').nth(1).click();
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

test('T-17 the forbidden state names the permission and the roles that hold it', async ({ page }) => {
  const queue = await triggerThenOpenQueue(page, 'forbidden');

  const card = queue.getByRole('region', {
    name: new RegExp(`^${PERMISSION_REQUIRED_PREFIX}`),
  });
  await expect(
    card,
    'The refusal did not name the permission the call required, so a reader is told only that something was denied.',
  ).toHaveCount(1);
  await expect(card).toBeVisible();
  await expect(card.getByText(ROLES_THAT_HOLD_THE_PERMISSION, { exact: true })).toBeVisible();
  await expect(
    card.getByRole('listitem').first(),
    'The refusal names no role that holds the permission, so a reader has nobody to take the action to.',
  ).toBeVisible();
  await expect(queue.getByRole('button', { name: /^Open\s*:/ })).toHaveCount(0);

  await resetDemoData(page);
});

test('T-17 the conflicting-update state replaces the record on every screen the trigger reaches', async ({
  page,
}) => {
  await enterDemonstration(page);

  /* The inbox is the screen this trigger used to leave untouched: its read is a collection, which the
     trigger refuses now, so a reader meets the moved record rather than a list the service will not
     stand behind. */
  await switchRole(page, 'USR-02');
  await triggerSimulationState(page, 'conflict');
  await closeSimulationPanel(page);
  await clickNavEntry(page, 'Approvals', '/approvals');

  const inbox = screen(page);
  const notice = inbox.getByRole('status').filter({ hasText: CONFLICT_HEADLINE });
  await expect(
    notice,
    'The inbox listed plans while the records behind them had moved, so its content was presented as current.',
  ).toHaveCount(1);
  await expect(notice).toBeVisible();
  await expect(
    inbox.getByRole('table'),
    'The inbox kept its table while the conflicting-update state was in effect, so the state did not replace the content it qualifies.',
  ).toHaveCount(0);

  /* The state offers the way back the boundary owns; a state that withheld the record without one would
     leave the reader no route to it (rule P-8). */
  await expect(
    inbox.getByRole('button', { name: RELOAD_LABEL, exact: true }),
    'The conflicting-update state offered no way to read the record as it now stands.',
  ).toBeVisible();

  /* A second screen, reached the way a reader reaches it, reports the same condition: the trigger's
     consequence is the service's rather than one screen's. */
  await clickNavEntry(page, 'Exceptions', '/exceptions');
  await expect(
    screen(page).getByRole('status').filter({ hasText: CONFLICT_HEADLINE }),
    'A second screen kept rendering its records while the same trigger was in effect, so the state reaches one screen instead of every screen.',
  ).toHaveCount(1);

  /* Once the change is lifted the same inbox lists its plans again, so the refusal was the trigger's
     doing rather than an inbox holding nothing. */
  await resetDemoData(page);
  await clickNavEntry(page, 'Approvals', '/approvals');
  await expect(
    screen(page).getByRole('table'),
    'The inbox did not report its plans again after the demonstration was reset.',
  ).toBeVisible();
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

  /* `Reset demo data` restores the seeded chain and re-issues the reads behind every screen, so the
     verdict above describes records that are no longer on screen. Left standing, it would tell a reader
     the restored chain does not verify at a position the check they are looking at never examined. */
  await resetDemoData(page);

  const cleared = screen(page).getByRole('region', { name: 'Chain verification', exact: true });
  await expect(
    cleared.getByRole('status').filter({ hasText: CHAIN_BREAK_READING }),
    'A verdict from a check that ran before the reset is still on screen, so the panel reports a break in a chain the reader can no longer see.',
  ).toHaveCount(0);
  await expect(
    cleared,
    'The reset dropped the note that states the chain shows a mechanism rather than tamper resistance (rule P-4).',
  ).toContainText(AUDIT_CHAIN_NOTE);

  /* The reset keeps the persona the session acts as, so the restored chain is verified as the auditor
     the trail belongs to and the switch below changes nothing while the switcher already holds it. */
  await switchRole(page, 'USR-06');
  await clickNavEntry(page, 'Audit trail', '/audit');

  const restored = screen(page).getByRole('region', { name: 'Chain verification', exact: true });
  const recheck = restored.getByRole('button', { name: VERIFY_CHAIN_LABEL, exact: true });

  await expect(
    recheck,
    'The verification control cannot act on the restored chain, so a reader has no way to check the records the reset put back (rule P-8).',
  ).toBeEnabled();
  await recheck.click();

  const verified = restored.getByRole('status');

  await expect(
    verified,
    'Verifying the restored chain reported nothing, so no reading tells the reader whether the records the reset put back hold together.',
  ).toHaveCount(1);
  await expect(
    verified,
    'A break is reported for records no edit has touched since the reset, so the reset did not restore the chain.',
  ).not.toContainText(CHAIN_BREAK_READING);
  await expect(
    verified,
    'The verification of the restored chain does not report it as verified, so the check ran against something other than the restored records.',
  ).toContainText(CHAIN_VERIFIED_HEADLINE);
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

  /* The overview computes its figures from the same records, so an emptied population reaches it as
     nothing to summarise: the two screens agreeing that nothing is open is the whole assertion, and the
     overview states it in its own sentence rather than as four confident zeros a reader cannot tell
     apart from computed figures (specification §8, AAP §0.12.4, rule P-6). */
  await clickNavEntry(page, 'Overview', '/overview');
  await expect(
    screen(page).getByRole('status').filter({ hasText: OVERVIEW_EMPTY }),
    'The overview reported the emptied queue as figures rather than as the empty state, so a zero on it is indistinguishable from a computed reading.',
  ).toHaveCount(1);
  await expect(
    screen(page).getByRole('region', { name: 'Open exceptions', exact: true }),
    'The overview kept its open-exceptions tile while the queue holds nothing, so the two screens describe different record sets.',
  ).toHaveCount(0);

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

/* ---------------------------------------------------------------------------------------------
 * The density axis — AAP 0.5.3's two row heights, driven through the shell's own switch
 * ------------------------------------------------------------------------------------------- */

test('the density switch resizes the overview table rows from one density token to the other and back', async ({
  page,
}) => {
  await enterDemonstration(page);
  await clickNavEntry(page, 'Overview', '/overview');

  const html = page.locator('html');
  const byPlant = screen(page).getByRole('table', { name: BY_PLANT_TABLE });
  await expect(
    byPlant,
    `The overview renders no table named ${JSON.stringify(BY_PLANT_TABLE)}, so the row the two density tokens are proved on is not on screen.`,
  ).toBeVisible();

  const firstRow = await firstRowOfSeveralRecords(
    byPlant,
    'The overview never rendered the records of its risk-by-plant table, so no row could be measured.',
  );

  /* The plant the first row reports, so the three measurements below are provably of one record: the row
     is looked up by that value each time instead of by its position, which a density change has no
     reason to preserve. The value is read from the screen at the moment of assertion rather than typed
     (rule P-6). */
  const plant = ((await firstRow.getByRole('cell').first().textContent()) ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  expect(
    plant,
    `The first by-plant row reports ${JSON.stringify(plant)} in its plant cell, so no record can be followed through the two densities.`,
  ).not.toBe('');

  /* The density the session starts in, read rather than assumed: AAP 0.12.4 gives the planners and the
     supplier quality engineer compact rows and the other five personas comfortable ones, so the value a
     first-time session carries follows the persona the shell opens as. */
  const start = await readDensity(page);
  await expect(
    html,
    `The session is in ${start} density and <html> does not carry it, so the attribute the two row heights are selected by is not the one the switch controls.`,
  ).toHaveAttribute('data-density', start);

  const other: Density = start === 'compact' ? 'comfortable' : 'compact';
  const row = byPlant.getByRole('row').filter({ hasText: plant });
  await expect(
    row,
    `The by-plant table holds no single row reporting ${plant}, so the row measured in one density would not be the row measured in the other.`,
  ).toHaveCount(1);

  const startedAt = await expectRowFollowsDensity(row, start, `The by-plant row for ${plant}`);
  await expectRowHeightToken(page, start);

  await setDensity(page, other);
  await expect(
    html,
    `Pressing the switch that offers ${other} rows left <html data-density> on another value, so the density a reader chose is not the one the application holds.`,
  ).toHaveAttribute('data-density', other);
  await expectRowHeightToken(page, other);

  const switched = await expectRowFollowsDensity(row, other, `The by-plant row for ${plant}`);
  expect(
    switched,
    `The row for ${plant} measured ${switched} px in ${other} density after measuring ${startedAt} px in ${start}: the two densities do not resize it, so the switch changes the attribute without changing the rows a reader reads.`,
  ).not.toBe(startedAt);

  /* The session goes back to the density it was found in, so this test cannot colour one that follows it:
     the chosen density is one of the two values the application persists, and a density left behind would
     be a state the next test inherits rather than one it arranged. */
  await setDensity(page, start);
  await expect(
    html,
    `Restoring the density found at the start left <html data-density> on another value, so this test does not hand the session back as it received it.`,
  ).toHaveAttribute('data-density', start);

  const restored = await expectRowFollowsDensity(
    row,
    start,
    `The by-plant row for ${plant} once the density was restored`,
  );
  expect(
    restored,
    `The row for ${plant} measured ${restored} px after the density was restored to ${start}, and it measured ${startedAt} px before the switch: the row did not come back to the height the session started on.`,
  ).toBe(startedAt);

  /* The three heights the row was measured at, kept in the report beside the run: the assertions above
     are what fail the test, and this line is what a reader checks them against afterwards. */
  test.info().annotations.push({
    type: 'density measured',
    description: `${start} ${startedAt} px, ${other} ${switched} px, restored to ${start} ${restored} px`,
  });
});
