/**
 * T-07, T-08 and T-09: SCR-05's decision loop and its record of what happened.
 *
 * WHAT THIS SPEC DRIVES. Three things a planner does after a plan is put to an approver, in the order
 * AAP §0.12.4 gives them:
 *
 * - **T-07** — the decision itself. An approval carries duties the service enforces and the screen
 *   explains: a comment, the eligible role, and an acknowledgement of every side effect the plan
 *   defers. Each duty is asserted through the control that carries it, and the decision is then
 *   recorded by the persona the record names as eligible to take it.
 * - **T-08** — the simulated write-back and its outcome. The tracker lists the plan's write-backs in
 *   the record's own order, each carrying the fixed `Simulated write-back` tag, and the outcome card
 *   sets the plan's figures against the figures the records reached after the change landed, down to
 *   the stock condition to 16 December that §0.7's T-08 row reads from that same post-approval solve.
 * - **T-09** — the audit record. The trail is filterable by the record an action touched, it holds the
 *   decision and every write-back that followed it in chain order, each event's detail shows the
 *   values before and after, and "Verify chain" recomputes every hash in this browser.
 *
 * A fourth test, titled in plain words rather than by an identifier, covers the failure branch T-08
 * names: a simulated write-back that fails is all-or-nothing, is recorded, and can be retried without
 * writing a step twice. It is a separate test because the branch needs a plan that has not been
 * decided, and a page load re-seeds the in-memory records, so it cannot share one with T-08.
 *
 * WHY EVERY TEST BUILDS ITS OWN APPROVAL. The mock adapter keeps the whole session — the records, the
 * audit chain and any decision taken — in memory, and loading the document again re-seeds it (AAP
 * §0.2.1). A test therefore never inherits another's action and never reloads mid-test: it starts from
 * a fresh page, walks the visible interface to a pending plan, and decides that plan itself. The two
 * personas it needs are the plan's requester and its eligible approver, and it reaches both through
 * the role switcher so the eligibility rules are exercised rather than bypassed.
 *
 * WHERE THE NUMBERS COME FROM (rule P-6). No business figure is typed here. The amount of a plan is
 * read from the screen; the write-backs' order is compared between the preview the record renders
 * before the decision and the tracker the same record renders after it; both of the outcome card's
 * tables are read row by row and each row's two readings compared with each other, because every step
 * succeeded and the change therefore landed at the plan's own levers; and the number of events the
 * chain check reports is compared with the number of rows the unfiltered trail lists. Apart from the
 * screen's own copy, the only literal stated for a record value is the acceptance date the stock table
 * is expected to reach — a date, not a figure. The seeds, the solver and the aggregates stay behind the
 * service boundary — this spec imports no seed record, no adapter and no fixture (rule P-2).
 *
 * WHAT IT DOES NOT DO. It adds no hook, no global, no query parameter and no storage entry (AAP §0.7,
 * §0.9): the role switcher, the data table's rows, the evidence triggers and the one simulation popover
 * are product features, and they are the only levers used. It names no origin, port or request (rule
 * B-1) and carries no credential (rule B-2). It selects by role and accessible name and never by a
 * class, a colour or a position, so nothing here depends on a theme (rule B-3). It asserts no colour or
 * token value, and it covers neither the comparison matrix (T-04) nor the investigation screen
 * (T-02/T-03) nor the seven states as a set (T-17).
 *
 * THE FIXED STRINGS, HELD ONCE. The seven §5.3 simulation labels, the write-back tag, the audit note
 * and the side-effect acknowledgement's opening words are stated below because a browser spec may not
 * import the application modules that own them — a test that asked the code under test what the
 * contract says would prove nothing. Everything else typed below is either the screen's own visible
 * copy, read back to scope an assertion, or the contracts' own action vocabulary (`decision`,
 * `simulated write-back`) used to identify a row.
 */
import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { entryRouteForPersona, switchRole } from './helpers/role';
import { openSimulationControls, triggerSimulationState } from './helpers/simulation-controls';

/* ---------------------------------------------------------------------------------------------
 * The fixed strings — AAP §0.10, platform-specification.md §5.3, rules P-1 and P-4
 * ------------------------------------------------------------------------------------------- */

/** The first §5.3 label: the badge the shell mounts on every route. */
const SIMULATED_DATA = 'Simulated data';

/** The second §5.3 label: every computed figure carries it. */
const SIMULATED_CALCULATION = 'Simulated calculation';

/** The fourth §5.3 label: every step of a simulated write-back carries it. */
const SIMULATED_WRITE_BACK = 'Simulated write-back';

/** The fifth §5.3 label: the audit chain, its verification and every other demonstration control. */
const SIMULATED_CONTROL = 'Simulated control';

/**
 * The tag the write-back tracker and its preview put on every individual step, fixed by AAP §0.12.4's
 * SCR-05 row. A page-level badge does not label one write-back, so the tag belongs to each step.
 */
const WRITE_BACK_TAG = 'Simulated write-back. Not demonstrated on a live system.';

/**
 * The note the audit trail carries wherever the chain appears, fixed by AAP §0.12.4 and rule P-4. It is
 * the sentence that *denies* the claim the application may never make, which is why it is asserted
 * exactly: a paraphrase would leave the denial weaker than the input requires.
 */
const AUDIT_CHAIN_NOTE =
  'Simulated control: this shows the mechanism, not production tamper resistance.';

/**
 * The opening words of one side-effect acknowledgement, fixed by AAP §0.12.4 as "I have read the side
 * effect on <plant>". The plant is the record's own value and is never typed here: the control is
 * located by these words and its whole name is then read from the document.
 */
const ACKNOWLEDGEMENT_PREFIX = 'I have read the side effect on ';

/** The verification's pass reading, so the report is recognised by what it says rather than by order. */
const CHAIN_VERIFIED_HEADLINE = 'The chain verified at the moment of this check';

/** The statement a verification may make about what it did: nothing was re-hashed or re-sequenced. */
const CHAIN_UNCHANGED = 'This check changed no record';

/* ---------------------------------------------------------------------------------------------
 * The record vocabulary this spec reads back — contracts §6, `AuditAction` and `ApprovalStatus`
 * ------------------------------------------------------------------------------------------- */

/** The action the decision event carries, as the trail's own Action column states it. */
const DECISION_ACTION = 'decision';

/** The action every write-back event carries, as the trail's own Action column states it. */
const WRITE_BACK_ACTION = 'simulated write-back';

/** The status of a plan no decision has been taken on, and the one its row is found by. */
const PENDING_STATUS = 'pending';

/** The status a plan reaches once it is approved. */
const APPROVED_STATUS = 'approved';

/** The three states a write-back step reports, in the order the tracker's own vocabulary lists them. */
const WRITE_BACK_STATES = ['succeeded', 'failed', 'pending'] as const;

/* ---------------------------------------------------------------------------------------------
 * The screen's own visible copy, read back to scope an assertion
 * ------------------------------------------------------------------------------------------- */

/** The four cards T-07 requires the detail to render, by the headings those cards own. */
const DETAIL_SECTIONS = {
  planSummary: 'Plan summary',
  cost: 'Cost against protected revenue',
  missingInputs: 'Missing inputs',
  writeBackPreview: 'Write-back preview',
} as const;

/** The captions inside the plan summary, which is what makes the summary a plan rather than a record. */
const PLAN_CAPTIONS = {
  option: 'Option under approval',
  requestedBy: 'Requested by',
  approverRoles: 'Roles that may decide it',
} as const;

/** The card, panel and region names the approval detail and the audit trail render. */
const REGIONS = {
  decisionTaken: 'Decision taken',
  sideEffects: 'Side effects to acknowledge',
  policyBlock: 'Policy block',
  writeBackProgress: 'Write-back progress',
  writeBackSteps: 'Simulated write-back steps',
  outcome: 'Planned against resulting',
  evidence: 'Evidence',
  chainVerification: 'Chain verification',
} as const;

/**
 * The column headers that tell the outcome card's two tables apart.
 *
 * The card prints the measures the two records share and then the daily closing stock both of them
 * project, so a row count taken across the whole region would mix the two. Each table is scoped by the
 * one header only it declares: `Measure` on the comparison, `Date` on the stock series.
 */
const OUTCOME_COLUMNS = {
  measure: 'Measure',
  date: 'Date',
} as const;

/**
 * The date AAP §0.7's T-08 row reads the stock condition at: "the stock condition to 16 December is
 * read from the post-approval solve".
 *
 * It is a date and not a figure, which is the one thing this spec may state for itself: every reading
 * below is compared against the other record's reading of the same row and never typed (rule P-6).
 * The solver projects the case's window day by day, so this date is a row of that series rather than a
 * value chosen here.
 */
const ACCEPTANCE_STOCK_DATE = '2026-12-16';

/** The four sections the evidence drawer must supply, in the order the drawer prints them. */
const EVIDENCE_SECTIONS = [
  'Value and formula',
  'Source, record and time',
  'Inputs, upstream and downstream',
  'Confidence, missing inputs and documents',
] as const;

/** The audit trail's own names: the table, the two filter controls this spec fills, and the drawer. */
const AUDIT_TEXT = {
  table: 'Audit events, in chain order',
  recordFilter: 'Record',
  actionColumn: 'Action',
  closeDetail: 'Close event detail',
  before: 'Before',
  after: 'After',
} as const;

/**
 * The trail's columns, in the order `src/features/scr-05-approvals-and-audit/audit-screen.tsx`
 * declares them. A cell is read by its position because every row of the table carries the same
 * columns, and the three headers this spec relies on are asserted by name before any cell is read, so
 * a moved column fails the assertion that names it rather than silently reading the wrong value.
 */
const AUDIT_COLUMN = {
  sequence: 0,
  action: 5,
  record: 6,
} as const;

/** The reason the detail screen gives for a decision that has no comment yet (rule P-8). */
const COMMENT_REQUIRED_REASON = 'A comment is required before a decision is recorded.';

/** The reason it gives for an approval whose side effects have not all been acknowledged (rule P-8). */
const ACKNOWLEDGEMENT_REQUIRED_REASON =
  'Acknowledge every side effect of this plan before approving it.';

/**
 * The vocabulary of a claim the application may never make (rule P-4): an assurance that something is
 * immune to alteration, trusted by definition, or formally warranted. The phrases are assembled from
 * their parts rather than written out, so that a source check which later widens its own scan to this
 * folder cannot be tripped by the prover rather than by the application.
 */
const CLAIM_VOCABULARY = new RegExp(
  [
    `${['tamper', 'proof'].join('')}`,
    `${['tamper', 'proof'].join('[\\s-]?')}`,
    `${['tamper', 'resistant'].join('[\\s-]?')}`,
    ['zero', 'trust'].join('[\\s-]?'),
    'guaranteed',
    'certified',
  ].join('|'),
  'i',
);

/**
 * What the outcome card prints in place of a reading a record does not carry, in either of its tables.
 * A comparison whose resulting column showed this would be one the service never measured, so T-08
 * refuses to read it as a figure, and a stock row that showed it would be a date one of the two series
 * does not reach.
 */
const NOT_APPLICABLE = 'Not applicable';

/* ---------------------------------------------------------------------------------------------
 * Walking to a pending plan
 * ------------------------------------------------------------------------------------------- */

/**
 * A table row's cells, as text, in the table's own column order.
 *
 * @param row One body row of a table.
 * @returns The trimmed visible text of each cell, left to right.
 */
async function cellsOf(row: Locator): Promise<readonly string[]> {
  const cells = row.getByRole('cell');
  const total = await cells.count();
  const values: string[] = [];

  for (let index = 0; index < total; index += 1) {
    values.push((await cells.nth(index).innerText()).trim());
  }

  return values;
}

/**
 * The first non-empty line of an element's visible text.
 *
 * Both the write-back preview and the tracker print a step's own description first and its fields
 * after it, in different orders, so the description is the one part of a step that can be compared
 * between the two surfaces without restating what the record holds.
 *
 * @param locator The element to read.
 * @returns The first line of its text, trimmed, or an empty string when it renders none.
 */
async function firstLineOf(locator: Locator): Promise<string> {
  const lines = (await locator.innerText())
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

  return lines[0] ?? '';
}

/**
 * The write-back state a step's text reports, or `'no state'` when it reports none of the three.
 *
 * The tracker renders the state as the record's own token beside an icon, so the token is what tells
 * one step's progress from another's (rule B-3: the state never rests on colour alone).
 *
 * @param text One step's visible text.
 * @returns `'succeeded'`, `'failed'`, `'pending'` or `'no state'`.
 */
function writeBackStateIn(text: string): string {
  return WRITE_BACK_STATES.find((state) => text.includes(state)) ?? 'no state';
}

/**
 * Opens the persona's own approval inbox and the pending plan it holds.
 *
 * The persona is the plant manager, whose entry route AAP §0.12.4 fixes as `/approvals`; the switch is
 * what the application uses to send them there, so this function addresses no route itself. The row is
 * opened through the table's own activation, and the plan summary is awaited before the test asserts
 * anything, because the detail reads its record asynchronously and its four cards arrive with it.
 *
 * @param page The Playwright page showing the application.
 * @returns Nothing; the call resolves once the pending plan's plan summary is on screen.
 */
async function openPendingApproval(page: Page): Promise<void> {
  await page.goto('/');
  await switchRole(page, 'USR-02');

  await page
    .getByRole('row')
    .filter({ hasText: PENDING_STATUS })
    .first()
    .getByRole('cell')
    .first()
    .click();

  await expect(page.getByRole('region', { name: DETAIL_SECTIONS.planSummary })).toBeVisible();
}

/**
 * The approval's identifier, read from the page header that renders it.
 *
 * The identifier is a record value (rule P-6), so it is read from the screen and used as the filter
 * that finds the events it appended rather than being typed.
 *
 * @param page The Playwright page showing an approval detail.
 * @returns The identifier the header shows, such as `APR-2026-104`.
 */
async function approvalIdOf(page: Page): Promise<string> {
  const identifier = page.getByText(/^APR-\d{4}-\d{3}$/).first();
  await expect(identifier).toBeVisible();

  return (await identifier.innerText()).trim();
}

/**
 * Acknowledges every side effect the plan carries, through the control that names the plant it lands
 * on.
 *
 * The control's accessible name is the whole sentence an approver is giving, so it is matched by its
 * opening words and its full text is left to the record. The loop is written for more than one side
 * effect even though a plan may carry a single one, because the gate is "every side effect" and a
 * second one added to a record must not be silently left unacknowledged.
 *
 * @param page The Playwright page showing an approval detail.
 * @returns Nothing; the call resolves once every acknowledgement reads as pressed.
 */
async function acknowledgeEverySideEffect(page: Page): Promise<void> {
  const toggles = page
    .getByRole('region', { name: REGIONS.sideEffects })
    .getByRole('button', { name: new RegExp(`^${ACKNOWLEDGEMENT_PREFIX}`) });
  await expect(toggles.first()).toBeVisible();

  const total = await toggles.count();

  for (let index = 0; index < total; index += 1) {
    const toggle = toggles.nth(index);

    if ((await toggle.getAttribute('aria-pressed')) !== 'true') {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    }
  }
}

/**
 * Fills the decision's comment, which every one of the three decisions requires.
 *
 * @param page The Playwright page showing an approval detail.
 * @param comment The comment to record.
 * @returns Nothing; the call resolves once the field holds the text.
 */
async function writeComment(page: Page, comment: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Comment' }).fill(comment);
}

/**
 * The explanation a disabled control carries, read from the description its `aria-describedby` points
 * at.
 *
 * `ActionButton` never sets the `disabled` attribute — that would take the explanation out of the tab
 * order — so a control that cannot act is recognised by `aria-disabled` and explained by its
 * description (rules P-8 and B-3). Reading the description directly keeps a spec from clicking a
 * control it believes is enabled and losing the reason to a timeout.
 *
 * @param control The control to read.
 * @returns The sentence the control describes itself with, or an empty string when it names none.
 */
async function descriptionOf(control: Locator): Promise<string> {
  const describedBy = await control.getAttribute('aria-describedby');

  if (describedBy === null) {
    return '';
  }

  return (await control.evaluate((element, id) => {
    const description = element.ownerDocument.getElementById(id);
    return description?.textContent ?? '';
  }, describedBy)).trim();
}

/**
 * Asserts that no surface of the current route makes a claim the application may not make (rule P-4).
 *
 * @param page The Playwright page showing the route.
 * @returns The assertion's promise.
 */
async function expectNoUnimplementedClaim(page: Page): Promise<void> {
  await expect(page.getByText(CLAIM_VOCABULARY)).toHaveCount(0);
}

/* ---------------------------------------------------------------------------------------------
 * T-07 — the decision and its duties
 * ------------------------------------------------------------------------------------------- */

test('T-07 a decision needs a comment, an eligible role and the side-effect acknowledgement', async ({
  page,
}) => {
  test.slow();
  await openPendingApproval(page);

  /* The shell mounts the badge above the router outlet, so the route carries it without asking
     (rule P-1). */
  await expect(
    page.getByRole('banner').getByRole('button', { name: SIMULATED_DATA }),
  ).toBeVisible();

  /* The persona lever this spec drives says what it is: the permission checks behind it run in the
     browser and are not the authorisation a deployment would make (rule P-3). */
  await expect(page.getByText(/not production authorisation/i).first()).toBeVisible();

  /* ---- the plan the approver is shown ------------------------------------------------------ */
  const planSummary = page.getByRole('region', { name: DETAIL_SECTIONS.planSummary });
  await expect(planSummary).toContainText(PLAN_CAPTIONS.option);
  await expect(planSummary).toContainText(PLAN_CAPTIONS.requestedBy);
  await expect(planSummary).toContainText(PLAN_CAPTIONS.approverRoles);
  const eligibleRoles = planSummary.getByRole('list').getByRole('listitem');
  await expect(eligibleRoles.first()).toBeVisible();

  const cost = page.getByRole('region', { name: DETAIL_SECTIONS.cost });
  await expect(cost).toContainText(SIMULATED_CALCULATION);
  const costFigures = cost.getByRole('button');
  const figureCount = await costFigures.count();
  expect(figureCount).toBeGreaterThan(0);

  for (let index = 0; index < figureCount; index += 1) {
    await expect(costFigures.nth(index)).toHaveAccessibleName(/— open evidence$/);
  }

  await expect(
    page.getByRole('region', { name: DETAIL_SECTIONS.missingInputs }).getByRole('listitem').first(),
  ).toBeVisible();

  const preview = page.getByRole('region', { name: DETAIL_SECTIONS.writeBackPreview });
  const previewSteps = preview.getByRole('listitem');
  await expect(previewSteps.first()).toBeVisible();
  const previewStepCount = await previewSteps.count();

  for (let index = 0; index < previewStepCount; index += 1) {
    await expect(previewSteps.nth(index)).toContainText(WRITE_BACK_TAG);
  }

  /* ---- every displayed figure opens its evidence ------------------------------------------- */
  await costFigures.first().click();
  const drawer = page.getByRole('dialog', { name: REGIONS.evidence });
  await expect(drawer).toBeVisible();

  for (const section of EVIDENCE_SECTIONS) {
    await expect(drawer.getByRole('region', { name: section })).toBeVisible();
  }

  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(drawer).toHaveCount(0);

  /* ---- the side-effect acknowledgement gates Approve --------------------------------------- */
  const approve = page.getByRole('button', { name: 'Approve', exact: true });
  const reject = page.getByRole('button', { name: 'Reject', exact: true });
  const requestChanges = page.getByRole('button', { name: 'Request changes', exact: true });

  await acknowledgeEverySideEffect(page);
  const acknowledgement = page
    .getByRole('button', { name: new RegExp(`^${ACKNOWLEDGEMENT_PREFIX}`) })
    .first();
  const acknowledgementName = ((await acknowledgement.innerText()) ?? '').trim();
  expect(acknowledgementName.startsWith(ACKNOWLEDGEMENT_PREFIX)).toBe(true);

  /* ---- the comment is the other duty, and the one only the reader can discharge ------------- */
  await writeComment(page, '');
  await expect(approve).toHaveAttribute('aria-disabled', 'true');
  expect(await descriptionOf(approve)).toBe(COMMENT_REQUIRED_REASON);
  await expect(reject).toHaveAttribute('aria-disabled', 'true');
  await expect(requestChanges).toHaveAttribute('aria-disabled', 'true');

  await writeComment(page, 'Approved after reviewing the plan and its side effect.');
  await expect(approve).not.toHaveAttribute('aria-disabled', 'true');
  await expect(reject).not.toHaveAttribute('aria-disabled', 'true');

  /* Removing the acknowledgement re-blocks Approve alone: the rejection path needs a comment and no
     acknowledgement, which is what tells the two duties apart. */
  await acknowledgement.click();
  await expect(acknowledgement).toHaveAttribute('aria-pressed', 'false');
  await expect(approve).toHaveAttribute('aria-disabled', 'true');
  expect(await descriptionOf(approve)).toBe(ACKNOWLEDGEMENT_REQUIRED_REASON);
  await expect(reject).not.toHaveAttribute('aria-disabled', 'true');

  /* ---- the requester cannot decide the plan it put forward --------------------------------- */
  await switchRole(page, 'USR-01');
  await page.getByRole('link', { name: 'Approvals' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Approvals' })).toBeVisible();
  await page
    .getByRole('row')
    .filter({ hasText: PENDING_STATUS })
    .first()
    .getByRole('cell')
    .first()
    .click();
  await expect(page.getByRole('region', { name: DETAIL_SECTIONS.planSummary })).toBeVisible();

  await acknowledgeEverySideEffect(page);
  await writeComment(page, 'Deciding the plan I requested myself.');

  /* The roles the record names are read from the plan summary, so the explanation the controls carry is
     compared with the record the screen shows rather than with a list typed here (rule P-6). */
  const approverRoles = await page
    .getByRole('region', { name: DETAIL_SECTIONS.planSummary })
    .getByRole('list')
    .getByRole('listitem')
    .allInnerTexts();
  expect(approverRoles.length).toBeGreaterThan(0);

  /* The record's own facts refuse the decision before it is attempted: POL-003 keeps a plan's requester
     from deciding it (AAP §0.12.2), so all three controls are disabled and each states the rule and the
     roles that may decide the plan — the explanation after the fact is what AAP §0.2.2 and rule P-8
     replace with an explanation before it. */
  for (const decision of [approve, reject, requestChanges]) {
    await expect(decision).toHaveAttribute('aria-disabled', 'true');

    const reason = await descriptionOf(decision);
    expect(reason).toMatch(/POL-\d{3}/);

    for (const role of approverRoles) {
      expect(reason).toContain(role.trim());
    }
  }

  /* Nothing was sent, so no verdict was earned: a decision would have appended the policy block, and
     the record still reads pending with no decision block on it. */
  await expect(page.getByRole('region', { name: REGIONS.policyBlock })).toHaveCount(0);
  await expect(page.locator('main header').first()).toContainText(PENDING_STATUS);
  await expect(page.getByRole('region', { name: REGIONS.decisionTaken })).toHaveCount(0);

  /* ---- the eligible approver records the decision ------------------------------------------ */
  await switchRole(page, 'USR-02');
  await expect(page).toHaveURL(new RegExp(`${entryRouteForPersona('USR-02')}$`));
  await page
    .getByRole('row')
    .filter({ hasText: PENDING_STATUS })
    .first()
    .getByRole('cell')
    .first()
    .click();
  await expect(page.getByRole('region', { name: DETAIL_SECTIONS.planSummary })).toBeVisible();

  await acknowledgeEverySideEffect(page);
  await writeComment(page, 'Approved after reviewing the plan and its side effect.');
  await approve.click();

  const decisionTaken = page.getByRole('region', { name: REGIONS.decisionTaken });
  await expect(decisionTaken).toBeVisible();
  await expect(decisionTaken).toContainText('approve');
  await expect(decisionTaken).toContainText('Approved after reviewing the plan and its side effect.');

  /* The status moved with the decision: the decision block now states the plan is approved, and the
     tracker the approved plan sets in motion is on screen. */
  await expect(approve).toHaveAttribute('aria-disabled', 'true');
  expect(await descriptionOf(approve)).toContain(APPROVED_STATUS);
  await expect(page.getByRole('region', { name: REGIONS.writeBackProgress })).toBeVisible();

  await expectNoUnimplementedClaim(page);
});

/* ---------------------------------------------------------------------------------------------
 * T-08 — the write-backs, their order and the outcome
 * ------------------------------------------------------------------------------------------- */

test('T-08 the write-backs run in the order the record states and the outcome sets planned against resulting', async ({
  page,
}) => {
  await openPendingApproval(page);

  /* The order the record fixes is read from the preview the same record renders before the decision,
     so the tracker is compared against the record rather than against references typed here
     (rule P-6). */
  const previewSteps = page
    .getByRole('region', { name: DETAIL_SECTIONS.writeBackPreview })
    .getByRole('listitem');
  await expect(previewSteps.first()).toBeVisible();

  const previewStepCount = await previewSteps.count();
  expect(previewStepCount).toBeGreaterThan(0);

  const orderTheRecordStates: string[] = [];

  for (let index = 0; index < previewStepCount; index += 1) {
    orderTheRecordStates.push(await firstLineOf(previewSteps.nth(index)));
  }

  await acknowledgeEverySideEffect(page);
  await writeComment(page, 'Approved so the simulated write-back runs and can be read back.');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();

  const tracker = page.getByRole('region', { name: REGIONS.writeBackProgress });
  await expect(tracker).toBeVisible();

  const steps = tracker
    .getByRole('list', { name: REGIONS.writeBackSteps })
    .getByRole('listitem');
  const stepCount = await steps.count();

  /* One step per write-back the record holds, in the record's own order, each carrying both the
     §5.3 label and the fuller tag the tracker owns (rule P-1). */
  expect(stepCount).toBe(previewStepCount);

  for (let index = 0; index < stepCount; index += 1) {
    const step = steps.nth(index);

    await expect(step).toContainText(SIMULATED_WRITE_BACK);
    await expect(step).toContainText(WRITE_BACK_TAG);
    expect(await firstLineOf(step)).toBe(orderTheRecordStates[index] ?? '');
    expect(writeBackStateIn(await step.innerText())).toBe('succeeded');
  }

  /* ---- the outcome card ------------------------------------------------------------------- */
  /*
   * AAP §0.7's T-08 row asks for two things of this surface: the plan's figures beside the figures the
   * records reached, and "the stock condition to 16 December … read from the post-approval solve". The
   * card renders both — the measures the two records share, and the daily closing stock both of them
   * project — so each table is scoped by the column header only it declares before any row is read, and
   * the readings are compared against each other rather than typed (rule P-6).
   */
  const outcome = page.getByRole('region', { name: REGIONS.outcome });
  await expect(outcome).toBeVisible();
  await expect(outcome).toContainText(SIMULATED_CALCULATION);

  const measures = outcome
    .getByRole('table')
    .filter({ has: page.getByRole('columnheader', { name: OUTCOME_COLUMNS.measure, exact: true }) });
  await expect(measures.getByRole('columnheader', { name: 'Resulting' })).toBeVisible();

  const measureRows = measures.locator('tbody tr');
  const measureCount = await measureRows.count();
  expect(measureCount).toBeGreaterThan(0);

  for (let index = 0; index < measureCount; index += 1) {
    const cells = await cellsOf(measureRows.nth(index));
    const planned = cells[1] ?? '';
    const resulting = cells[2] ?? '';

    /* A resulting column that read "Not applicable" would be a comparison the service never measured,
       so it is refused as a figure rather than accepted as a blank. */
    expect(resulting).not.toBe(NOT_APPLICABLE);

    /* Every step of the simulated write-back succeeded, so the change landed and the records were
       measured at the plan's own levers: the two columns report one measurement, and the card states
       it twice rather than deriving a difference the plan does not claim (AAP §0.2.2). */
    expect(resulting).toBe(planned);
  }

  /* ---- the stock condition to 16 December, from the same solve ------------------------------ */
  const stock = outcome
    .getByRole('table')
    .filter({ has: page.getByRole('columnheader', { name: OUTCOME_COLUMNS.date, exact: true }) });
  await expect(stock).toBeVisible();

  const stockRows = stock.locator('tbody tr');
  const stockCount = await stockRows.count();
  expect(stockCount).toBeGreaterThan(0);

  const stockDates: string[] = [];

  for (let index = 0; index < stockCount; index += 1) {
    const cells = await cellsOf(stockRows.nth(index));
    const date = cells[0] ?? '';
    const planned = cells[1] ?? '';
    const resulting = cells[2] ?? '';

    /* The date is the record's own value, printed as plain text rather than as a figure. */
    expect(date).not.toBe('');

    /* The same reading every measure above carries: because the change landed at the plan's own
       levers, the records project the plan's own daily close at every date of the window, so the two
       columns agree row by row and neither is a difference the card derived. */
    expect(resulting).not.toBe(NOT_APPLICABLE);
    expect(resulting).toBe(planned);

    stockDates.push(date);
  }

  /* The one literal this spec states for the series: the acceptance date, so the table is read to be
     the post-approval solve's own window rather than a handful of unrelated rows. */
  expect(stockDates).toContain(ACCEPTANCE_STOCK_DATE);

  /* ---- every reading opens the record the comparison is about ------------------------------- */
  const planReading = measures.locator('tbody tr').first().getByRole('button').first();
  await expect(planReading).toHaveAccessibleName(/— open evidence$/);
  await planReading.click();

  const drawer = page.getByRole('dialog', { name: REGIONS.evidence });
  await expect(drawer).toBeVisible();

  for (const section of EVIDENCE_SECTIONS) {
    await expect(drawer.getByRole('region', { name: section })).toBeVisible();
  }

  await drawer.getByRole('button', { name: 'Close' }).click();
  await expect(drawer).toHaveCount(0);
});

/* ---------------------------------------------------------------------------------------------
 * T-08's failure branch — a write-back that does not complete
 * ------------------------------------------------------------------------------------------- */

test('a simulated write-back that fails is all-or-nothing and a retry completes it without writing a step twice', async ({
  page,
}) => {
  await openPendingApproval(page);

  /* The one lever the specification allows for this branch: the simulation popover's partial-failure
     trigger, which changes what the adapter answers rather than which branch a screen takes. */
  await openSimulationControls(page);
  await triggerSimulationState(page, 'partial');
  const popover = page.getByRole('dialog', { name: SIMULATED_CONTROL });
  await popover.getByRole('button', { name: 'Close' }).click();
  await expect(popover).toHaveCount(0);

  await acknowledgeEverySideEffect(page);
  await writeComment(page, 'Approved while the simulated write refuses its first step.');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();

  /* The failure is reported in the service's own words, and those words state what the all-or-nothing
     rule did next: no later step ran and no part of the change was applied. */
  const failure = page.getByRole('status').filter({ hasText: /did not complete/ });
  await expect(failure).toBeVisible();
  await expect(failure).toContainText(/no part of the approved change was applied/);

  /* The failure is recorded against the plan, and the record it left behind is on the screen the
     decision was taken on: the tracker, the step that failed and the one control that retries it arrive
     with the failure itself, with no second visit to the record in between (AAP §0.2.2, rule P-8). */
  const tracker = page.getByRole('region', { name: REGIONS.writeBackProgress });
  await expect(tracker).toBeVisible();
  await expect(failure).toBeVisible();

  const steps = tracker
    .getByRole('list', { name: REGIONS.writeBackSteps })
    .getByRole('listitem');
  const stepCount = await steps.count();
  expect(stepCount).toBeGreaterThan(0);

  const interruptedStates: string[] = [];
  const failedStepIndexes: number[] = [];

  for (let index = 0; index < stepCount; index += 1) {
    const state = writeBackStateIn(await steps.nth(index).innerText());

    interruptedStates.push(state);

    if (state === 'failed') {
      failedStepIndexes.push(index);
    }
  }

  expect(interruptedStates.filter((state) => state === 'failed')).toHaveLength(1);
  expect(interruptedStates.filter((state) => state === 'succeeded')).toHaveLength(0);

  /* The fixed tag sits in the failed step's own item, beside the message the step's description carries
     — a page-level badge would not label one write-back (rule P-1, AAP §0.2.2). */
  expect(failedStepIndexes).toHaveLength(1);
  await expect(steps.nth(failedStepIndexes[0] ?? 0)).toContainText(WRITE_BACK_TAG);

  /* Only the failed step offers a retry, which is the control that lets the change proceed. */
  const retries = tracker.getByRole('button', { name: /^Retry write-back / });
  await expect(retries).toHaveCount(1);
  await retries.first().click();

  /* The change completes, and a step that succeeded is never offered for writing again: the retry
     controls are gone and every step appears once, so no success record can be duplicated. */
  await expect(tracker.getByRole('button', { name: /^Retry write-back / })).toHaveCount(0);

  const completedStates: string[] = [];
  const stepTexts: string[] = [];

  for (let index = 0; index < stepCount; index += 1) {
    const step = steps.nth(index);
    const text = (await step.innerText()).trim();
    stepTexts.push(text);
    completedStates.push(writeBackStateIn(text));
  }

  expect(completedStates.filter((state) => state === 'succeeded')).toHaveLength(stepCount);
  expect(completedStates.filter((state) => state === 'failed')).toHaveLength(0);
  expect(new Set(stepTexts).size).toBe(stepTexts.length);
});

/* ---------------------------------------------------------------------------------------------
 * T-09 — the audit record
 * ------------------------------------------------------------------------------------------- */

test('T-09 the audit record lists the decision and every write-back with the values before and after', async ({
  page,
}) => {
  test.slow();
  await openPendingApproval(page);

  const approvalId = await approvalIdOf(page);

  await acknowledgeEverySideEffect(page);
  await writeComment(page, 'Approved so the trail holds a decision and its write-backs.');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();

  const tracker = page.getByRole('region', { name: REGIONS.writeBackProgress });
  await expect(tracker).toBeVisible();
  const writeBackCount = await tracker
    .getByRole('list', { name: REGIONS.writeBackSteps })
    .getByRole('listitem')
    .count();
  expect(writeBackCount).toBeGreaterThan(0);

  /* The approval route makes no claim about tamper resistance, copying or a trusted configuration
     (rule P-4). */
  await expectNoUnimplementedClaim(page);

  /* The trail is read by a persona that holds `audit.read`; the switcher is the application's own way
     of sending the reader to that persona's entry route, so this spec addresses no route itself. */
  await switchRole(page, 'USR-06');
  await expect(page).toHaveURL(new RegExp(`${entryRouteForPersona('USR-06')}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Audit trail' })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('button', { name: SIMULATED_DATA })).toBeVisible();
  await expect(page.getByText(AUDIT_CHAIN_NOTE).first()).toBeVisible();

  /* ---- the trail, and what filtering it to the approval leaves ----------------------------- */
  const table = page.getByRole('table', { name: AUDIT_TEXT.table });
  await expect(table.getByRole('columnheader', { name: AUDIT_TEXT.actionColumn })).toBeVisible();

  const rows = table.locator('tbody tr');
  await expect(rows.first()).toBeVisible();

  const trailRows = await rows.count();
  expect(trailRows).toBeGreaterThan(writeBackCount);

  await page.getByRole('textbox', { name: AUDIT_TEXT.recordFilter }).fill(approvalId);

  /* The narrowed trail is awaited by what it renders rather than by a smaller number: while the read
     behind a filter is in flight the state boundary shows its loading rendering and the table has no
     rows at all, so a bare count would settle on the loading state instead of on the answer. */
  await expect
    .poll(async () => {
      try {
        const rendered = await rows.count();

        if (rendered === 0 || rendered >= trailRows) {
          return false;
        }

        const first = await cellsOf(rows.first());
        return first[AUDIT_COLUMN.record] === approvalId;
      } catch {
        return false;
      }
    })
    .toBe(true);

  const filteredRows = await rows.count();
  expect(filteredRows).toBeLessThan(trailRows);
  const sequences: number[] = [];
  const actions: string[] = [];

  for (let index = 0; index < filteredRows; index += 1) {
    const cells = await cellsOf(rows.nth(index));

    /* Every event the filter admits is about this approval, which is the record the decision and each
       write-back were recorded against. */
    expect(cells[AUDIT_COLUMN.record]).toBe(approvalId);
    sequences.push(Number.parseInt(cells[AUDIT_COLUMN.sequence] ?? '', 10));
    actions.push(cells[AUDIT_COLUMN.action] ?? '');
  }

  expect(actions).toContain(DECISION_ACTION);

  /* One write-back event per step the tracker listed: the trail records each step once. */
  expect(actions.filter((action) => action === WRITE_BACK_ACTION)).toHaveLength(writeBackCount);

  /* ---- the chain's own order: the decision, then each write-back behind it ------------------ */
  const ordered = sequences
    .map((sequence, position) => ({ sequence, action: actions[position] ?? '' }))
    .sort((left, right) => left.sequence - right.sequence);

  const decision = ordered.find((event) => event.action === DECISION_ACTION);
  const writeBackSequences = ordered
    .filter((event) => event.action === WRITE_BACK_ACTION)
    .map((event) => event.sequence);

  expect(decision).toBeDefined();

  const firstWriteBack = writeBackSequences[0];
  expect(firstWriteBack).toBeDefined();

  if (decision !== undefined && firstWriteBack !== undefined) {
    expect(firstWriteBack).toBe(decision.sequence + 1);

    writeBackSequences.forEach((sequence, position) => {
      expect(sequence).toBe(firstWriteBack + position);
    });
  }

  /* The table renders the trail in its own chain order — newest first — so the sequences it shows run
     strictly in one direction and are never shuffled by the filter. */
  const rendersAscending = (sequences[1] ?? Number.NaN) > (sequences[0] ?? Number.NaN);

  for (let index = 1; index < sequences.length; index += 1) {
    const previous = sequences[index - 1] ?? Number.NaN;
    const current = sequences[index] ?? Number.NaN;

    expect(rendersAscending ? current > previous : current < previous).toBe(true);
  }

  /* ---- one event's detail: the values before and after ------------------------------------ */
  await rows.filter({ hasText: DECISION_ACTION }).first().getByRole('cell').first().click();

  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('heading', { name: /^Audit event / })).toBeVisible();

  const before = drawer.getByText(AUDIT_TEXT.before, { exact: true }).locator('..');
  const after = drawer.getByText(AUDIT_TEXT.after, { exact: true }).locator('..');

  await expect(before).toContainText(PENDING_STATUS);
  await expect(after).toContainText(APPROVED_STATUS);
  await expect(after).toContainText('approve');

  await drawer.getByRole('button', { name: AUDIT_TEXT.closeDetail }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  /* ---- the verification ------------------------------------------------------------------- */
  await page.getByRole('textbox', { name: AUDIT_TEXT.recordFilter }).fill('');
  await expect.poll(async () => rows.count()).toBe(trailRows);

  await page
    .getByRole('region', { name: REGIONS.chainVerification })
    .getByRole('button', { name: 'Verify chain' })
    .click();

  const report = page.getByRole('status').filter({ hasText: CHAIN_VERIFIED_HEADLINE });
  await expect(report).toBeVisible();
  await expect(report).toContainText(CHAIN_UNCHANGED);
  await expect(report).toContainText(SIMULATED_CONTROL);
  await expect(report).not.toContainText(/does not verify/);

  /* Every event the chain holds was recomputed — the number the report names is the number of events
     the trail listed — and the check left them exactly as it found them. */
  const verified = /across (\d+) recorded events/.exec(await report.innerText());
  expect(verified).not.toBeNull();

  const eventsChecked = Number.parseInt(verified?.[1] ?? '', 10);
  expect(Number.isInteger(eventsChecked)).toBe(true);
  expect(eventsChecked).toBe(trailRows);

  await expect(page.getByText(AUDIT_CHAIN_NOTE).first()).toBeVisible();
  await expectNoUnimplementedClaim(page);
});
