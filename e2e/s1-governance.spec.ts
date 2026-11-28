/**
 * The governance browser suite of stage S1: the declared sovereignty posture (T-12), the stale source
 * named in both of its halves (T-13), and the policy screens with the time-boxed exception flow
 * (T-14).
 *
 * WHAT EACH TEST DRIVES.
 * - T-12 walks `/admin/sovereignty` as the platform administrator: the deployment summary and all ten
 *   declared rows under the fixed `Declared, not verified` label, the outbound ledger with its two
 *   computed count columns under `Simulated calculation`, the top bar's declared posture beside its
 *   `Simulated control` tag, the absence of every claim the demonstration cannot support, and the
 *   evidence pack offered as a download. AAP 0.12.4's SCR-07 row, AAP 0.10 and rule P-4 fix each of
 *   those.
 * - T-13 drives the freshness rule end to end. The service refuses an approval request and a decision
 *   while the order book is stale, naming the source and the instant it last answered; the visible
 *   half is that every screen offering those actions renders the same source and the same instant in
 *   its banner and in each disabled control's own explanation. The test asserts both halves, proves
 *   that a refused request writes nothing, and resets the demonstration at the end so it leaves no
 *   residue for the tests beside it. AAP 0.2.1 and AAP 0.7's T-13 row fix that pair.
 * - T-14 reads the policy set: five policies with identifier and title, the declared one shown as
 *   declaration rather than as an evaluated rule, an evaluated one with its statement and the
 *   decisions the engine recorded — a denial naming the rule that refused it — and the
 *   "Grant time-boxed exception" flow whose three terms are each refused by the control itself, whose
 *   recorded request then appears as pending against the policy it named. AAP 0.12.4's SCR-07 row
 *   fixes the content and rule P-8 the refusal.
 *
 * HOW IT REACHES THE APPLICATION. Every value is read from the screen it is compared with: the stale
 * banner's own as-of instant is the string each disabled control's explanation has to carry, the
 * policy a dialog names is looked up in the list by the label it printed, and the audit trail is
 * counted before and after a refused request rather than compared with a figure written here. Rule
 * P-6 asks exactly that — no number is typed into a test hook — and it is also what keeps these
 * assertions honest when a seed record changes.
 *
 * WHAT IT NEVER DOES. It imports no seed module, no adapter and no screen (rule P-2), so nothing here
 * can agree with the records by construction. It uses no browser test hook, because the build ships
 * none: the role switcher and the simulation popover are product features, and they are the only
 * levers this file has (AAP 0.7, 0.9). It never loads the document again after arranging a state,
 * because the in-browser adapter keeps the session in memory and a load would restore the seed; every
 * step after that travels by the navigation the application renders. Every wait is web-first — no
 * timer, no poll of its own — and every selector is a role with an accessible name, so a keyboard
 * reader reaches the same controls this file does (rule B-3).
 *
 * Rules served: P-4 (declared configuration labelled as declared, the audit mechanism labelled
 * `Simulated control`, and no claim of established sovereignty, prevented copying or resisted
 * tampering anywhere on the route), P-1 (each fixed §5.3 label asserted verbatim), P-8 (every disabled
 * control's explanation read and asserted, never bypassed), P-6 (rendered values compared with one
 * another, never with literals), P-2, P-7 (the product's own vocabulary only), B-2 (no configuration,
 * credential or environment read) and B-1 (this file names no host and issues no request of its own).
 */
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import type { ApprovalStatus, AuditResult, PolicyExceptionStatus } from '../src/types';

import { switchRole } from './helpers/role';
import { resetDemoData, triggerSimulationState } from './helpers/simulation-controls';

/* ---------------------------------------------------------------------------------------------
 * The fixed strings — specification §5.3, AAP 0.10 and AAP 0.12.4
 * ------------------------------------------------------------------------------------------- */

/**
 * The sixth of the seven §5.3 labels: what a declared value carries instead of a verification.
 *
 * Stated here because this file may not import the module that owns the tuple (a browser test asserts
 * the contract rather than asking the application what it says), and typed as the label so the
 * screens have to render exactly this string (rules P-1 and P-4).
 */
const DECLARED_NOT_VERIFIED = 'Declared, not verified';

/** The fifth §5.3 label: the tag a simulated control carries, asserted on the top bar's pill. */
const SIMULATED_CONTROL = 'Simulated control';

/** The second §5.3 label: what a computed figure carries, asserted over the ledger's count columns. */
const SIMULATED_CALCULATION = 'Simulated calculation';

/**
 * The declared posture AAP 0.10 fixes for the top bar, character for character, including the middle
 * dot with one space either side of it.
 */
const DECLARED_POSTURE = 'Declared: tier S3 · outbound blocked';

/**
 * The display name of the one source whose currency gates approval — `SOURCE_LABELS.erp`, which
 * `APPROVAL_GATE_SOURCE` selects and which AAP 0.2.1 and T-13 name as the stale source.
 *
 * The banner, the disabled controls and the service's own refusal all print this name from that one
 * map, so asserting it here is asserting the contract rather than a value of this file's choosing.
 */
const SUPPLY_SOURCE_LABEL = 'ERP';

/**
 * How the boundary completes a stale banner's headline: the source's display name, then this suffix.
 *
 * Read from `STATE_BOUNDARY_TEXT.staleSuffix`, which is the boundary's own wording; it is repeated
 * only to locate the banner by a name the assertion can then read back.
 */
const STALE_SUFFIX = ' is not current';

/** How the banner introduces the instant the stale source last answered (`staleAsOfPrefix`). */
const AS_OF_PREFIX = 'As of ';

/**
 * What the grant control, the export control and both SCR-07 headings are named, as AAP 0.12.4's
 * SCR-07 row fixes them.
 */
const GRANT_ACTION = 'Grant time-boxed exception';
const EXPORT_ACTION = 'Export evidence pack';
const SUMMARY_HEADING = 'Deployment summary';

/**
 * The outbound ledger's region name, which states the window its two counts cover.
 *
 * The window belongs to the region's own name rather than to the page around it: a reader who reaches
 * the ledger by its heading, or by the table's accessible name, learns there what the two figures
 * beside each endpoint mean (AAP 0.12.4's "30-day allowed and blocked counts").
 */
const LEDGER_HEADING =
  'Outbound ledger, with the counts the audit trail supports over the trailing 30 days';

/**
 * The two count columns' headers, each naming the window the figure beneath it covers.
 *
 * The length is the one AAP 0.12.4 states for the ledger's counts and contracts §5 fixes for the
 * aggregate; it is written here as the expected wording a browser test asserts, not as a figure any
 * screen is asked to use.
 */
const ALLOWED_HEADING = 'Allowed, 30 days';
const BLOCKED_HEADING = 'Blocked, 30 days';

/**
 * The suffix every evidence trigger adds to its figure's visible text.
 *
 * `src/components/evidence-drawer.tsx` appends this as a visually hidden completion of the control's
 * accessible name, so a figure that opens its evidence reads as the figure and then says what
 * activating it does (WCAG 2.2 SC 2.5.3). It is stripped when a reading is compared with another
 * reading of the same figure.
 */
const EVIDENCE_SUFFIX = '— open evidence';

/** The captions `DataTable` renders as its accessible names on the screens this file reads. */
const DECLARED_ROWS_CAPTION = 'Configuration the deployment declares, row by row';
const POLICIES_CAPTION = 'Policies the engine evaluates and policies the deployment declares';
const DECISIONS_CAPTION = 'Decisions the policy engine recorded against this policy';
const REQUESTS_CAPTION = 'Time-boxed exception requests recorded against this policy';
const QUEUE_CAPTION = 'Exception queue';
const AUDIT_CAPTION = 'Audit events, in chain order';
/** The approvals inbox's own caption, which scopes a row to the inbox and not to another screen's table. */
const APPROVALS_CAPTION = 'Approvals in scope, with the plan each one puts forward';

/** The evaluation statuses the policy screens print, in the record's own vocabulary. */
const EVALUATED_STATUS = 'Evaluated by the policy engine';

/** The traffic state every declared endpoint reads, which is the declared empty allowed list. */
const BLOCKED_STATE = 'blocked';

/** The suggested file name of the evidence pack, fixed so an export varies by no clock reading. */
const EVIDENCE_PACK_FILENAME = 'evidence-pack.json';

/** The identifier pattern the declared rows follow (`SD-n`), in the order the record states them. */
const DECLARED_ROW_PREFIX = 'SD-';

/**
 * How many declared rows and outbound endpoints SCR-07 shows: the ten rows `SD-1` to `SD-10` and the
 * four blocked endpoints AAP 0.10 and AAP 0.12.4 fix for the screen. A structural count from those
 * inputs, never a figure a record holds (rule P-6).
 */
const DECLARED_ROW_COUNT = 10;
const DECLARED_ENDPOINT_COUNT = 4;

/**
 * The five policies AAP 0.8 and contracts §7.2 fix, in the identifier order the policy list shows
 * them in: the four the engine evaluates and the one the deployment only declares.
 */
const POLICY_IDENTIFIERS = ['POL-001', 'POL-003', 'POL-005', 'POL-007', 'POL-009'] as const;

/**
 * The two policies T-14 reads by kind rather than by position: the rule the engine evaluates and the
 * one the deployment only declares (AAP 0.8, AAP 0.10 — POL-001, POL-003, POL-005 and POL-007 are
 * evaluated, POL-009 is declared and never evaluated).
 */
const EVALUATED_POLICY_ID = 'POL-001';
const DECLARED_POLICY_ID = 'POL-009';

/**
 * The reason typed into the time-boxed exception dialog.
 *
 * A sentence the reader states, not a value of the record set: the assertion that follows compares the
 * row's own text with this string to show the record kept what was written, and no figure, date or
 * record identifier appears in it (rule P-6).
 */
const REQUEST_REASON = 'A second persona is asked to approve this exception for the demonstration.';

/** The status a recorded exception request reads back as, and the status a decision can be taken on. */
const PENDING_REQUEST: PolicyExceptionStatus = 'pending';
const PENDING_APPROVAL: ApprovalStatus = 'pending';

/** The outcome the trail records for a denial, and the action a policy's own block is filed under. */
const BLOCKED_OUTCOME: AuditResult = 'blocked';

/**
 * The record's own plain-words action for a decision a policy refused.
 *
 * `AuditAction` is an open alias, and `policy block` is the canonical spelling `src/types/audit.ts`
 * records for the events an engine-appended denial carries, so the decisions table prints it as the
 * record states it.
 */
const POLICY_BLOCK_ACTION = 'policy block';

/**
 * The vocabulary rule P-4 forbids: nothing may state or imply that the workspace establishes
 * sovereignty, prevents a copy or resists an edit, so the route is scanned for each claim's words.
 */
const BARRED_CLAIMS =
  /tamper-proof|tamper proof|tamper-resistant|tamper resistant|zero trust|guaranteed|guarantees|certified|prevents copying|establishes sovereignty/i;

/* ---------------------------------------------------------------------------------------------
 * Reading the document — rules B-3 and P-6
 * ------------------------------------------------------------------------------------------- */

/**
 * Collapses runs of whitespace so text read from the document fits one line of a failure message.
 *
 * @param text - The text as the document rendered it.
 * @returns The same text with each run of whitespace reduced to one space, trimmed.
 */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * The visible text of the first element a locator matches, or the empty string when it matches none.
 *
 * @param locator - The element to read.
 * @returns The collapsed text, never `null`.
 */
async function textOf(locator: Locator): Promise<string> {
  if ((await locator.count()) === 0) {
    return '';
  }

  return collapseWhitespace((await locator.first().innerText()) ?? '');
}

/**
 * The explanation a control gives for itself, read the way assistive technology receives it.
 *
 * `src/components/tooltip.tsx` mounts its hint at all times and points the trigger at it with
 * `aria-describedby`, so the sentence is reachable whoever asks — this is the half of rule P-8 that
 * survives the hint being closed, and the half a force-click would defeat.
 *
 * @param page - The page the control renders on.
 * @param control - The control whose explanation is read.
 * @returns The description's text, collapsed to one line.
 * @throws Never: an absent description is reported by the caller's assertion, which is where the
 *   sentence belongs.
 */
async function descriptionOf(page: Page, control: Locator): Promise<string> {
  const describedBy = collapseWhitespace((await control.getAttribute('aria-describedby')) ?? '');

  if (describedBy === '') {
    return '';
  }

  const parts: string[] = [];

  for (const id of describedBy.split(' ')) {
    const text = await textOf(page.locator(`[id="${id}"]`));
    if (text !== '') {
      parts.push(text);
    }
  }

  return collapseWhitespace(parts.join(' '));
}

/**
 * The hint a control paints once it is focused, which is the visible half of rule P-8.
 *
 * The control is focused rather than hovered because focus is the route a keyboard reader takes, and
 * the hint closes again with `Escape` without moving focus, so the caller keeps the reader's place.
 *
 * @param page - The page the control renders on.
 * @param control - The control to focus.
 * @returns The hint's text.
 */
async function paintedHintOf(page: Page, control: Locator): Promise<string> {
  await control.focus();

  const hint = page.getByRole('tooltip');
  await expect(hint, 'a disabled control must paint its explanation on focus (rule P-8)').toHaveCount(
    1,
  );

  const text = await textOf(hint);
  await page.keyboard.press('Escape');

  return text;
}

/**
 * The calendar date one day after a date the document supplied.
 *
 * The time-boxed exception's expiry has to fall after the demonstration clock, and the date field
 * states that earliest date in its own `min` attribute; this takes the value the field printed and
 * moves it on by one day, so no date is written into this file (rule P-6). ISO 8601 dates order
 * lexicographically, which is why the result is compared as text by the dialog's own check.
 *
 * @param isoDate - A calendar date as the field states it, `YYYY-MM-DD`.
 * @returns The following calendar date in the same form.
 */
function dayAfter(isoDate: string): string {
  const parsed = Date.parse(`${isoDate}T00:00:00Z`);

  expect(Number.isFinite(parsed), `"${isoDate}" is not a calendar date the field can state`).toBe(true);

  return new Date(parsed + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/* ---------------------------------------------------------------------------------------------
 * Moving through the application — the visible interface only (AAP 0.7, rule B-3)
 * ------------------------------------------------------------------------------------------- */
/**
 * Follows one of the shell's navigation entries.
 *
 * The entry is a `NavLink`, so it is a link whose accessible name is the label the navigation table
 * declares; clicking it is the navigation a reader performs, and no step of this file addresses a
 * route directly.
 *
 * @param page - The page showing the application.
 * @param name - The entry's visible label, which is also its accessible name.
 */
async function follow(page: Page, name: string): Promise<void> {
  await page.getByRole('link', { name, exact: true }).click();
}

/**
 * Activates a table row the way the application's own row cursor does.
 *
 * `src/components/data-table.tsx` moves a roving cursor with `J`/`K` and activates the row it sits on
 * with `Enter`; a row also opens on a click. This file takes the keyboard route, because that
 * is the one rule B-3 makes non-negotiable, and it focuses the row first rather than relying on
 * whichever row the cursor happens to hold.
 *
 * @param page - The page showing the table.
 * @param row - The data row to activate.
 */
async function activateRow(page: Page, row: Locator): Promise<void> {
  await row.focus();
  await page.keyboard.press('Enter');
}

/**
 * The stale banner a screen has raised, with the instant it prints.
 *
 * The banner is the boundary's stale rendering: a status region naming the source that is not current
 * and stating the instant it last answered. Both are read back from the document, so the instant this
 * returns is the one the screen printed rather than a value chosen here (rule P-6).
 *
 * @param page - The page that should be showing the banner.
 * @returns The banner's locator and the instant its text carries.
 */
async function staleBannerOf(page: Page): Promise<{ banner: Locator; asOf: string }> {
  const banner = page
    .getByRole('status')
    .filter({ hasText: `${SUPPLY_SOURCE_LABEL}${STALE_SUFFIX}` });

  await expect(
    banner,
    `the screen must raise the stale banner naming ${SUPPLY_SOURCE_LABEL} (AAP 0.2.1, T-13)`,
  ).toHaveCount(1);

  const text = collapseWhitespace(await banner.innerText());

  expect(
    text,
    'the stale banner must state the instant the source last answered (AAP 0.2.1)',
  ).toContain(AS_OF_PREFIX);

  const asOf = text.slice(text.indexOf(AS_OF_PREFIX) + AS_OF_PREFIX.length).trim();
  expect(asOf.length, 'the stale banner must print an as-of instant').toBeGreaterThan(0);

  return { banner, asOf };
}

/**
 * Counts the audit events the trail holds for one record, read through the trail's own filter.
 *
 * The count is the number of rows the filtered table renders, so the two calls a test makes are
 * compared with each other and never with a figure written here: that comparison is what proves a
 * refused action appended nothing (AAP 0.2.1, rule P-6).
 *
 * @param page - The page showing the application.
 * @param objectRef - The record whose events are counted, as the screen itself rendered it.
 * @returns The number of event rows the filtered trail shows.
 */
async function countEventsFor(page: Page, objectRef: string): Promise<number> {
  await follow(page, 'Audit trail');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Audit trail', exact: true }),
  ).toBeVisible();

  const filters = page.getByRole('region', { name: 'Filters' });
  const record = filters.getByLabel('Record', { exact: true });
  await record.fill(objectRef);

  /* The trail's text filters commit on `Enter` rather than on every keystroke — one edit, one read —
     so the record is committed here, before the trail the filter leaves is awaited. */
  await record.press('Enter');

  /*
   * The settled condition is the trail the filter leaves, not the busy region: a read the session has
   * already made for this filter answers from the cache on a second visit, so no loading rendering
   * appears and waiting for one would assert the adapter's latency rather than the filter. T-17 owns
   * the loading state; this counts the rows the trail shows once every one of them names the record.
   */
  const trail = page.getByRole('table', { name: AUDIT_CAPTION });
  await expect(trail).toBeVisible();

  const rows = trail.locator('tbody tr');

  await expect
    .poll(
      async () => {
        const shown = await rows.allInnerTexts();

        return shown.every((text) => text.includes(objectRef));
      },
      { message: `the trail must settle on the events of ${objectRef}` },
    )
    .toBe(true);

  return rows.count();
}

/**
 * The row of a table whose cells mention a value the screen rendered.
 *
 * Locating by rendered text rather than by position is what lets a test talk about "the approval that
 * is still pending" or "the exception this plan answers" without writing an identifier of its own.
 *
 * @param table - The table to search.
 * @param value - A string read from the document earlier in the same test.
 * @returns The single matching row.
 */
async function rowMentioning(table: Locator, value: string): Promise<Locator> {
  const row = table.getByRole('row').filter({ hasText: value });

  await expect(
    row,
    `no single row of the table mentions "${value}", so the record it names is not on this screen`,
  ).toHaveCount(1);

  return row;
}


/* ---------------------------------------------------------------------------------------------
 * T-12 — the declared posture, labelled as declaration and claiming nothing further
 * ------------------------------------------------------------------------------------------- */

test('T-12 the sovereignty screen shows declared configuration under "Declared, not verified" and claims nothing it cannot support', async ({
  page,
}) => {
  await page.goto('/');
  await switchRole(page, 'USR-04');
  await expect(page).toHaveURL(/\/admin\/sovereignty$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sovereignty and policies' }),
  ).toBeVisible();

  /*
   * The shell's declared posture, beside the tag that says the statement is a control's rather than a
   * measurement (AAP 0.10, rules P-1 and P-4). The pair is read from the element that holds the
   * posture sentence, so a tag that drifted away from it would fail here.
   */
  const posture = page.getByText(DECLARED_POSTURE, { exact: true });
  await expect(posture).toBeVisible();
  await expect(posture.locator('xpath=..')).toContainText(SIMULATED_CONTROL);

  /*
   * The deployment summary and every declared row are declared configuration, so each carries the
   * fixed §5.3 label. The outbound sentence is the record's own declaration of an empty allowed list,
   * which is what makes every endpoint below read blocked.
   */
  const summary = page.getByRole('region', { name: SUMMARY_HEADING });
  await expect(summary).toContainText(DECLARED_NOT_VERIFIED);
  await expect(summary).toContainText('Outbound traffic declared blocked');

  const declaredRows = page
    .getByRole('table', { name: DECLARED_ROWS_CAPTION })
    .locator('tbody tr');
  await expect(
    declaredRows,
    'AAP 0.12.4 fixes ten declared configuration rows for SCR-07',
  ).toHaveCount(DECLARED_ROW_COUNT);

  for (let index = 0; index < DECLARED_ROW_COUNT; index += 1) {
    const cells = declaredRows.nth(index).getByRole('cell');

    await expect(
      cells.nth(0),
      'the rows are shown in the record’s own SD order',
    ).toHaveText(`${DECLARED_ROW_PREFIX}${index + 1}`);
    await expect(cells.nth(1), 'every declared row names the control it declares').not.toBeEmpty();
    await expect(
      cells.nth(2),
      'the status of a declared row carries the label that says nothing verified it',
    ).toContainText(DECLARED_NOT_VERIFIED);
    await expect(cells.nth(3), 'every declared row names the record behind it').not.toBeEmpty();
    await expect(
      cells.nth(4),
      'every declared row states the date the declaration was last made',
    ).not.toBeEmpty();
  }

  /*
   * The outbound ledger. Its six columns are the ones AAP 0.12.4 fixes, its two count columns are the
   * only computed figures on the page and carry the label that says so, and every declared endpoint
   * reads blocked because the declared allowed list is empty (AAP 0.10, rule P-1).
   */
  const ledger = page.getByRole('region', { name: LEDGER_HEADING });
  await expect(ledger).toContainText(SIMULATED_CALCULATION);

  const ledgerTable = ledger.getByRole('table');
  const headers = (await ledgerTable.getByRole('columnheader').allInnerTexts()).map(
    collapseWhitespace,
  );
  expect(headers, 'the ledger states the six columns AAP 0.12.4 fixes').toEqual([
    'Endpoint',
    'Purpose',
    'State',
    'Last attempt',
    ALLOWED_HEADING,
    BLOCKED_HEADING,
  ]);

  const ledgerRows = ledgerTable.locator('tbody tr');
  await expect(
    ledgerRows,
    'AAP 0.12.4 and AAP 0.10 fix four declared outbound endpoints',
  ).toHaveCount(DECLARED_ENDPOINT_COUNT);

  const allowedReadings: string[] = [];

  for (let index = 0; index < DECLARED_ENDPOINT_COUNT; index += 1) {
    const cells = ledgerRows.nth(index).getByRole('cell');

    await expect(cells.nth(0), 'every endpoint is the record’s own').not.toBeEmpty();
    await expect(cells.nth(1), 'every endpoint declares a purpose').not.toBeEmpty();
    await expect(cells.nth(2), 'every declared endpoint reads blocked').toHaveText(BLOCKED_STATE);

    /*
     * Each count is a computed figure and opens the evidence of the aggregate that counted it
     * (principle PR-6), so the cell holds the trigger that drawer hangs on and the trigger's name is
     * the figure followed by the suffix every trigger of the application carries.
     */
    const allowedFigure = cells.nth(4).getByRole('button', { name: /open evidence$/u });
    const blockedFigure = cells.nth(5).getByRole('button', { name: /open evidence$/u });

    await expect(
      allowedFigure,
      'the allowed count is a computed figure that opens its evidence',
    ).toHaveAccessibleName(/^\d+\s*— open evidence$/u);
    await expect(
      blockedFigure,
      'the blocked count is a computed figure that opens its evidence',
    ).toHaveAccessibleName(/^\d+\s*— open evidence$/u);

    allowedReadings.push(
      (await textOf(allowedFigure)).replace(EVIDENCE_SUFFIX, '').trim(),
    );
  }

  /*
   * The allowed list is declared empty, so no endpoint records an allowed attempt: the four readings
   * are one value, and that value is compared with itself rather than with a figure written here
   * (rule P-6).
   */
  for (const reading of allowedReadings) {
    expect(
      reading,
      'the declared allowed list is empty, so no endpoint records an allowed attempt',
    ).toBe(allowedReadings[0]);
  }

  /* The record of what a browser-side control did carries that control's own label (rules P-1, P-4). */
  await expect(page.getByRole('region', { name: 'Recent decisions' })).toContainText(
    SIMULATED_CONTROL,
  );

  /*
   * Rule P-4's prohibition, asserted over everything the route renders: no wording may claim that the
   * workspace establishes sovereignty, prevents a copy or withstands an edit.
   */
  const routeText = await page.locator('body').innerText();
  expect(
    collapseWhitespace(routeText),
    'rule P-4 forbids every claim the demonstration cannot support',
  ).not.toMatch(BARRED_CLAIMS);

  /* The evidence pack is a browser-built file, offered under the fixed name the service composed. */
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: EXPORT_ACTION, exact: true }).click();
  const pack = await download;

  expect(pack.suggestedFilename()).toBe(EVIDENCE_PACK_FILENAME);
});

/* ---------------------------------------------------------------------------------------------
 * T-13 — the stale source, named in the banner and in every disabled control's explanation
 * ------------------------------------------------------------------------------------------- */

test('T-13 a stale source is named in the banner and in each disabled approval action, and the refusal records nothing', async ({
  page,
}) => {
  /* The head of supply chain holds both approval permissions and reaches every plant (contracts §7.1). */
  await page.goto('/');
  await switchRole(page, 'USR-03');

  /*
   * The approval the demonstration leaves pending. It is found by the status the screen prints rather
   * than by an identifier, so this file names no record of its own (rule P-6), and its identifier is
   * read back from the cell that renders it.
   */
  await follow(page, 'Approvals');
  await expect(page.getByRole('heading', { level: 1, name: 'Approvals' })).toBeVisible();

  const pendingRow = page.getByRole('row').filter({ hasText: PENDING_APPROVAL });
  await expect(
    pendingRow,
    'the seeded plan awaiting a decision must appear in the inbox the acting role reads',
  ).toHaveCount(1);

  const approvalId = await textOf(pendingRow.getByRole('cell').nth(0));
  expect(approvalId.length, 'the inbox cell states the approval’s own identifier').toBeGreaterThan(0);

  /*
   * What the trail holds for that approval before anything is attempted. The refused action below has
   * to leave this count where it stands, which is the assertion that no approval, write-back or audit
   * record was created (AAP 0.2.1).
   */
  const eventsBefore = await countEventsFor(page, approvalId);

  /* Open the record, and read the exception the plan answers from the plan summary it renders. The row
     is taken from the approvals inbox by the inbox's own caption: a client-side navigation leaves the
     screen being left mounted for a frame, and the trail this session may now read holds a row under
     the same reference, so a row matched anywhere in the document can be the departing screen's. */
  await follow(page, 'Approvals');

  const inbox = page.getByRole('table', { name: APPROVALS_CAPTION });
  await expect(inbox).toBeVisible();
  await activateRow(page, inbox.getByRole('row').filter({ hasText: approvalId }));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Approval', exact: true }),
  ).toBeVisible();

  const planSummary = page.getByRole('region', { name: 'Plan summary' });
  await expect(planSummary).toBeVisible();

  const exceptionValue = planSummary
    .getByText('Exception', { exact: true })
    .locator('xpath=..')
    .locator('span')
    .last();

  await expect(
    exceptionValue,
    'the plan summary names the exception whose option the plan puts forward',
  ).not.toBeEmpty();

  const exceptionId = await textOf(exceptionValue);
  expect(exceptionId.length).toBeGreaterThan(0);

  /*
   * The one lever the demonstration offers: the simulation popover. It is a product control, not a
   * test hook, and the trigger survives client-side navigation because the adapter keeps the session
   * in memory (AAP 0.7, 0.9).
   */
  await triggerSimulationState(page, 'stale');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: SIMULATED_CONTROL })).toHaveCount(0);

  /* The visible half: the banner names the source and the instant it last answered. */
  const { asOf } = await staleBannerOf(page);

  /*
   * The other half: each decision control cannot act, and every one of them gives the same sentence —
   * the source and the as-of instant the banner printed, framed by the screen's own wording. The
   * explanation is read both ways rule P-8 requires: as the description assistive technology receives
   * and as the hint a keyboard reader sees on focus.
   */
  const decisions = ['Approve', 'Reject', 'Request changes'] as const;
  const explanations: string[] = [];

  for (const name of decisions) {
    const control = page.getByRole('button', { name, exact: true });

    await expect(control).toHaveCount(1);
    await expect(
      control,
      `"${name}" must be disabled while ${SUPPLY_SOURCE_LABEL} is not current (rule P-8)`,
    ).toHaveAttribute('aria-disabled', 'true');

    const described = await descriptionOf(page, control);
    const painted = await paintedHintOf(page, control);

    expect(described, `"${name}" must explain why it cannot act`).not.toBe('');
    expect(painted, `"${name}" must paint the explanation it also describes`).toBe(described);
    expect(
      described,
      `"${name}" must name the stale source and the instant the banner printed`,
    ).toContain(`${SUPPLY_SOURCE_LABEL} as of ${asOf}`);

    explanations.push(described);
  }

  for (const explanation of explanations) {
    expect(
      explanation,
      'one stale record raises one reason, so every decision control gives the same sentence',
    ).toBe(explanations[0]);
  }

  /*
   * A refused activation changes nothing: the control still refuses, the screen records no decision,
   * and the route stays on the record it was reading. The attempt is the keyboard one a reader makes —
   * the control stays focusable and refuses in its own handler — so nothing here forces a click the
   * control's `aria-disabled` state would refuse to receive.
   */
  const approve = page.getByRole('button', { name: 'Approve', exact: true });
  await approve.focus();
  await page.keyboard.press('Enter');
  await expect(approve).toHaveAttribute('aria-disabled', 'true');
  expect(new URL(page.url()).pathname, 'no decision is recorded while the source is stale').toBe(
    `/approvals/${approvalId}`,
  );

  /*
   * The request half of the same rule. The option screen offers the request, and it prints the banner
   * naming the same instant because both screens read one freshness report; its request control cannot
   * act either, and carries the gate's sentence — the source and the as-of instant the banner printed —
   * as the description assistive technology receives (AAP 0.2.1, T-13, rule P-8).
   *
   * The service's half of the rule, which a bypassed control cannot escape, is asserted in
   * `src/services/mock/mock-backend.test.ts`: the adapter refuses the request and the decision while
   * the order book is stale and records neither, so the rule stays proven from both sides.
   */
  await follow(page, 'Exceptions');
  await expect(page.getByRole('heading', { level: 1, name: 'Exception queue' })).toBeVisible();

  const queueRow = await rowMentioning(
    page.getByRole('table', { name: QUEUE_CAPTION }),
    exceptionId,
  );
  await activateRow(page, queueRow);

  const compareOptions = page.getByRole('button', { name: 'Compare options', exact: true });
  await expect(compareOptions).toBeVisible();
  await compareOptions.click();
  await expect(page).toHaveURL(/\/scenarios$/);

  const comparisonBanner = await staleBannerOf(page);
  expect(
    comparisonBanner.asOf,
    'both screens print the instant of the one stale record the service reported',
  ).toBe(asOf);

  const request = page.getByRole('button', {
    name: 'Request approval for selected plan',
    exact: true,
  });

  await expect(request).toHaveCount(1);
  await expect(
    request,
    `the request control must be disabled while ${SUPPLY_SOURCE_LABEL} is not current (rule P-8)`,
  ).toHaveAttribute('aria-disabled', 'true');

  const requestReason = await descriptionOf(page, request);

  expect(
    requestReason,
    `the request control must name ${SUPPLY_SOURCE_LABEL} and the instant the banner printed`,
  ).toContain(`${SUPPLY_SOURCE_LABEL} as of ${asOf}`);

  expect(
    new URL(page.url()).pathname,
    'a request the screen cannot raise opens no approval, so the route does not move',
  ).toBe(`/exceptions/${exceptionId}/scenarios`);

  /* Nothing was appended for the record on either attempt. */
  const eventsAfter = await countEventsFor(page, approvalId);
  expect(eventsAfter, 'a refused request and a refused decision append no audit event').toBe(
    eventsBefore,
  );

  /*
   * The reset restores the seeded records and lifts every trigger through the popover's own control.
   * The banner goes with it, and so does the gate: the decision controls fall back to the one condition
   * a reader can still meet — a comment — which is what shows the refusal was the source's and not the
   * record's.
   */
  await resetDemoData(page);
  await switchRole(page, 'USR-03');
  await follow(page, 'Approvals');
  await activateRow(page, page.getByRole('row').filter({ hasText: approvalId }));
  await expect(page.getByRole('heading', { level: 1, name: 'Approval' })).toBeVisible();

  await expect(
    page.getByRole('status').filter({ hasText: `${SUPPLY_SOURCE_LABEL}${STALE_SUFFIX}` }),
    'the banner disappears with the trigger that raised it',
  ).toHaveCount(0);

  const reject = page.getByRole('button', { name: 'Reject', exact: true });

  /*
   * The re-read the reset caused may still be landing, and a screen serves the entry it already holds
   * while the fresh call is in flight, so the gate's absence is awaited rather than read once.
   */
  await expect
    .poll(async () => (await descriptionOf(page, reject)).includes(asOf), {
      message: 'the gate’s sentence must be gone once the source is current again',
    })
    .toBe(false);

  await page.getByLabel('Comment', { exact: true }).fill('Read again once the source answered.');
  await expect(
    reject,
    'with the gate lifted, the one condition left is the comment a reader can supply',
  ).not.toHaveAttribute('aria-disabled', 'true');
});

/* ---------------------------------------------------------------------------------------------
 * T-14 — the policy screens, the declared policy, and the time-boxed exception request
 * ------------------------------------------------------------------------------------------- */

test('T-14 the policy set declares POL-009 without evaluating it and records a time-boxed exception as pending', async ({
  page,
}) => {
  await page.goto('/');
  await switchRole(page, 'USR-04');
  await expect(page).toHaveURL(/\/admin\/sovereignty$/);

  const policies = page.getByRole('table', { name: POLICIES_CAPTION });
  const policyRows = policies.locator('tbody tr');

  await expect(
    policyRows,
    'contracts §7.2 fixes the five policies of the workspace',
  ).toHaveCount(POLICY_IDENTIFIERS.length);

  /* Every policy renders its identifier and its title, in the identifier order the record holds. */
  for (let index = 0; index < POLICY_IDENTIFIERS.length; index += 1) {
    const cells = policyRows.nth(index).getByRole('cell');

    /*
     * The identifier is the trigger of the evidence behind the policy record (principle PR-6), so the
     * cell is read through that control: the record's own identifier is its visible text, and the
     * control's name is that identifier followed by the suffix every evidence trigger carries.
     */
    const identifier = cells.nth(0).getByRole('button', { name: /open evidence$/u });

    await expect(
      identifier,
      'every policy identifier opens the evidence behind its record',
    ).toContainText(POLICY_IDENTIFIERS[index] ?? '');
    await expect(identifier).toHaveAccessibleName(
      new RegExp(`^${POLICY_IDENTIFIERS[index] ?? ''}\\s*— open evidence$`, 'u'),
    );
    await expect(cells.nth(1), 'every policy renders the title it carries').not.toBeEmpty();
  }

  /*
   * The one policy the engine never evaluates. It is shown as declared configuration under the fixed
   * label, and nothing on it is presented as a decision: no evaluated status, and no recorded decision
   * row in the table beside it (rules P-4 and P-6).
   */
  await activateRow(page, await rowMentioning(policies, DECLARED_POLICY_ID));
  await expect(page).toHaveURL(new RegExp(`/admin/policies/${DECLARED_POLICY_ID}$`));
  /*
   * The router swaps the outlet on a client-side transition, so the policy list is still mounted for a
   * frame after the address changes. Waiting for it to leave keeps the assertions below from reading a
   * status the *list* prints beside the one the detail prints (the run's own settle signal, measured
   * rather than slept for).
   */
  await expect(policies, 'the policy list leaves the screen once a policy detail opens').toHaveCount(0);
  await expect(page.getByText(DECLARED_NOT_VERIFIED, { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText(EVALUATED_STATUS, { exact: true }),
    'a declared policy is never presented as one the engine evaluated',
  ).toHaveCount(0);
  await expect(
    page
      .getByRole('table', { name: DECISIONS_CAPTION })
      .locator('tbody tr[aria-rowindex]'),
    'the engine has recorded no decision against a policy it does not evaluate',
  ).toHaveCount(0);

  /*
   * And it offers no time-boxed exception either. No exception can be requested against a rule nothing
   * evaluates, so the control is disabled and carries the reason in its own description, read the way
   * assistive technology receives it — the half of rule P-8 a force-click would defeat (qa-w013-I31).
   */
  const declaredGrant = page.getByRole('button', { name: GRANT_ACTION, exact: true });

  await expect(
    declaredGrant,
    'a policy the engine never evaluates offers no time-boxed exception (qa-w013-I31)',
  ).toHaveAttribute('aria-disabled', 'true');

  const declaredRefusal = await descriptionOf(page, declaredGrant);

  expect(
    declaredRefusal,
    'the control that cannot act states why, in its own accessible description (rule P-8)',
  ).not.toBe('');
  await expect(declaredGrant).toHaveAccessibleDescription(declaredRefusal);

  /*
   * An evaluated policy: the statement behind the rule, the evaluation status the record carries, and
   * the decisions the engine recorded. The denial among them names the rule that refused it, in the
   * policy column the trail supplies and in the actor the event was filed under.
   */
  await follow(page, 'Sovereignty and policies');
  await activateRow(page, await rowMentioning(policies, EVALUATED_POLICY_ID));
  await expect(page).toHaveURL(new RegExp(`/admin/policies/${EVALUATED_POLICY_ID}$`));
  await expect(policies, 'the policy list leaves the screen once a policy detail opens').toHaveCount(0);
  await expect(page.getByText(EVALUATED_STATUS, { exact: true })).toBeVisible();

  /* The same route on a policy the engine does evaluate offers the flow, which is the contrast the
     declared policy above is asserted against (qa-w013-I31). */
  await expect(
    page.getByRole('button', { name: GRANT_ACTION, exact: true }),
    'an evaluated policy offers the time-boxed exception flow',
  ).not.toHaveAttribute('aria-disabled', 'true');

  const heading = page.getByRole('heading', { level: 1 });
  const policyTitle = await textOf(heading);
  const statement = await textOf(heading.locator('xpath=following-sibling::p[1]'));

  expect(
    statement.length,
    'the policy detail renders the statement behind the rule the engine applies',
  ).toBeGreaterThan(0);
  expect(statement, 'the statement is the rule’s own text, not a copy of the title').not.toBe(
    policyTitle,
  );

  const decisionRows = page
    .getByRole('table', { name: DECISIONS_CAPTION })
    .locator('tbody tr[aria-rowindex]');
  const decisionCount = await decisionRows.count();

  expect(
    decisionCount,
    'the engine has recorded decisions against the evaluated policy',
  ).toBeGreaterThan(0);

  let denial: Locator | undefined;

  for (let index = 0; index < decisionCount; index += 1) {
    const row = decisionRows.nth(index);
    if ((await textOf(row.getByRole('cell').nth(4))) === BLOCKED_OUTCOME) {
      denial = row;
      break;
    }
  }

  expect(denial, 'the decisions include at least one denial the engine recorded').toBeDefined();

  if (denial !== undefined) {
    const cells = denial.getByRole('cell');

    /*
     * The record carries no free-text reason member — `AuditEvent` is terms and hashes — so the
     * plain-words account of a denial is what the trail itself states: the action the engine filed it
     * under, the record it refused, and the rule identifier. A live denial's further sentence is
     * rendered by the screens that produce one (the option screen's refusal, the approval's policy
     * block, the assistant's block card), which T-13 and their own suites assert.
     */
    await expect(cells.nth(1), 'the denial names the rule that refused it').toContainText(
      EVALUATED_POLICY_ID,
    );
    await expect(cells.nth(2), 'the denial states its plain-words action').toHaveText(
      POLICY_BLOCK_ACTION,
    );
    await expect(cells.nth(3), 'the denial names the record it refused').not.toBeEmpty();
    await expect(cells.nth(5), 'the denial names the policy that decided it').toHaveText(
      EVALUATED_POLICY_ID,
    );
  }

  /*
   * The time-boxed exception. The action belongs to the policy it would be raised against, so it is
   * offered in each policy row's own last column: the row a reader presses is the policy the dialog
   * names (qa-w013-I31). The control acts, the dialog it opens collects the three terms AAP 0.12.4
   * fixes, and each missing term is named by the submit's own explanation until it is supplied — which
   * is rule P-8 applied to a form whose reader can fix every cause it has.
   */
  await follow(page, 'Sovereignty and policies');

  const grantRow = await rowMentioning(policies, EVALUATED_POLICY_ID);
  const grant = grantRow.getByRole('button', { name: GRANT_ACTION });
  await expect(
    grant,
    'the platform administrator holds policy.exception.request, so the row’s control acts (contracts §7.1)',
  ).not.toHaveAttribute('aria-disabled', 'true');
  await grant.click();

  const dialog = page.getByRole('dialog', { name: GRANT_ACTION });
  await expect(dialog).toBeVisible();

  const reason = dialog.getByLabel('Reason', { exact: true });
  const expiry = dialog.getByLabel('Expiry', { exact: true });
  const approver = dialog.getByLabel('Second approver', { exact: true });
  const submit = dialog.getByRole('button', { name: 'Request exception', exact: true });

  await expect(reason).toBeVisible();
  await expect(expiry).toBeVisible();
  await expect(approver).toBeVisible();

  /* The policy the dialog names, read from the caption it renders rather than assumed. */
  const captions = await dialog.locator('p').allInnerTexts();
  const policyCaption = captions
    .map(collapseWhitespace)
    .find((text) => text.startsWith('Policy '));

  expect(policyCaption, 'the dialog names the policy the request is made against').toBeDefined();

  const requestedAgainst = (policyCaption ?? '').slice('Policy '.length).trim();
  expect(requestedAgainst.length).toBeGreaterThan(0);

  /* The dialog names the policy whose own row was pressed, not the first policy of the set. */
  await expect(
    grantRow,
    'the dialog names the policy whose own row the reader pressed (qa-w013-I31)',
  ).toContainText(requestedAgainst);

  /* Nothing supplied: the submit refuses, and the sentence it gives is the reason field's own. */
  await expect(submit).toHaveAttribute('aria-disabled', 'true');
  const reasonMessage = await descriptionOf(page, reason);
  expect(reasonMessage, 'the empty reason field states what it needs').not.toBe('');
  await expect(
    submit,
    'the refusal names the field still to be supplied',
  ).toHaveAccessibleDescription(reasonMessage);

  /* The reason supplied: the refusal moves to the expiry, again in that field's own words. */
  await reason.fill(REQUEST_REASON);
  const expiryMessage = await descriptionOf(page, expiry);
  expect(expiryMessage).not.toBe(reasonMessage);
  await expect(submit).toHaveAccessibleDescription(expiryMessage);

  /*
   * The expiry is filled from the earliest date the field itself accepts, so this file types no date:
   * the record's demonstration clock fixes that minimum, and the term has to fall after it.
   */
  const earliest = await expiry.getAttribute('min');
  expect(earliest, 'the expiry field states the earliest date it accepts').not.toBeNull();
  await expiry.fill(dayAfter(earliest ?? ''));

  const approverMessage = await descriptionOf(page, approver);
  await expect(submit).toHaveAccessibleDescription(approverMessage);

  const candidate = await approver.locator('option').nth(1).getAttribute('value');
  expect(candidate, 'the dialog offers a second persona to approve the request').toBeTruthy();
  await approver.selectOption(candidate ?? '');

  await expect(
    submit,
    'every term supplied, the one action the dialog exists to take can act',
  ).not.toHaveAttribute('aria-disabled', 'true');

  await submit.click();
  await expect(dialog, 'a recorded request closes the dialog that sent it').toHaveCount(0);

  /*
   * The request reads back as pending against the policy it named. The row's reason is compared with
   * the text the reader typed, so the assertion is that the record kept what was written rather than
   * that it kept a figure chosen here (rule P-6).
   */
  await activateRow(page, await rowMentioning(policies, requestedAgainst));
  await expect(page).toHaveURL(/\/admin\/policies\//);

  const requests = page
    .getByRole('table', { name: REQUESTS_CAPTION })
    .locator('tbody tr[aria-rowindex]');

  await expect(requests, 'the request is recorded once, against the policy it named').toHaveCount(1);
  await expect(requests.first().getByRole('cell').nth(0)).toContainText(PENDING_REQUEST);
  await expect(requests.first().getByRole('cell').nth(1)).toHaveText(REQUEST_REASON);
});
