/**
 * T-10 and T-11 — the evidence assistant of SCR-06: a scripted answer with the records it cites, the
 * fixed notice for anything outside the script, and the POL-007 policy block with its one-click switch
 * to the in-boundary model.
 *
 * WHAT EACH TEST PROVES, AND THE INPUT THAT FIXES IT.
 * - T-10 (AAP 0.7, AAP 0.12.4 SCR-06): the six suggested questions are offered, asking one returns an
 *   answer whose figures carry `Simulated calculation`, whose citation chips name the records,
 *   their sources and their freshness, and whose expander lists the queries that were run and the model
 *   that composed them. The figures that answer states are compared with the same solver-backed figures
 *   the investigation screen renders for the same orders, which is the cross-check AAP 0.7 asks of this
 *   identifier; a question outside the script returns the fixed notice character for character and
 *   offers no citation at all.
 * - T-11 (AAP 0.7, AAP 0.6.3, AAP 0.12.3, AAP 0.12.4 SCR-06): the model selector offers the in-boundary
 *   entry and an external entry and starts on the in-boundary one; a question whose context carries the
 *   customer-confidential supply agreement is blocked by POL-007 before any answer exists, the block card
 *   states the policy, its reason, the model it permits and the event it recorded, and it produces no
 *   answer text beside it; the one-click switch selects the permitted model and the question is answered
 *   with citations; and the block is then found in the audit trail as the policy-actor event the card
 *   named.
 *
 * HOW IT DRIVES THE APPLICATION. Through the visible interface only: the navigation landmark, the role
 * switcher, the question controls, the composer, the model selector and the block card's own switch. Every
 * control it operates is located by role and accessible name, and the few static strings it locates — a
 * caption, a term, a label — are read as text, so T-16 can replay the T-11 path without a pointer (rule B-3)
 * and nothing is clicked by position, style or geometry. No test hook, no query parameter, no storage state
 * and no global is used or added (AAP 0.7).
 *
 * WHAT IT DOES NOT TYPE (rule P-6). No figure, amount, date, record identifier, question wording, source
 * name or citation reference is written below as an expectation. The suggested questions, the citation
 * chips, the model entries, the permitted alternative, the recorded policy event and the solver-backed
 * figures are all read from the screen and compared with one another, so an answer whose number drifts
 * from the solver's fails here rather than passing on a transcribed figure. The only literals this file
 * states are the interface's own fixed strings — the seven §5.3 labels, the unscripted notice AAP 0.12.4
 * fixes, the control labels of the assistant, and the policy identifier T-11 is about.
 *
 * WHERE THE DOCUMENT IN CONTEXT COMES FROM. The assistant panel owns one control for what a question runs
 * over: the question itself. It sends no caller-supplied references, and the adapter derives a question's
 * context from the records the suggested question cites, which is why this file selects the external model
 * and then asks the offered questions in order until the policy blocks one, instead of typing a document
 * identifier into a field that does not exist. The blocked question is the one whose seeded outline carries
 * the customer-confidential agreement, and the assertion is on the block itself, never on its wording.
 *
 * RULES THIS FILE IS BUILT TO SATISFY.
 * - P-1: the `Simulated data` badge is asserted on the route, every answer's figures are asserted to carry
 *   `Simulated calculation`, and the unscripted notice is asserted as the interface's own statement that no
 *   model stands behind the panel.
 * - P-2: the application reaches its records through its service port; this file imports no seed module, no
 *   adapter and no fixture, and the one shared module it imports is the persona lever the suite publishes.
 * - P-4: the assistant's text is asserted to contain none of the vocabulary of a claim the demonstration
 *   cannot support, alongside the block card the policy record supplies.
 * - P-7: nothing here names a real vendor, customer, carmaker or cloud product; the only names that reach an
 *   assertion were rendered by the application from its own synthetic records.
 * - B-1, B-2: no address, host or port is named, no request is made by this file, and no credential shape
 *   appears in it.
 */
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { switchRole } from './helpers/role';

/* ---------------------------------------------------------------------------------------------
 * The interface's fixed strings, in the one place they are written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every string, label and count this file states.
 *
 * Each member is either a fixed label of the specification (the seven §5.3 simulation labels), a string
 * AAP 0.12.4 fixes for SCR-06 (the unscripted notice), the visible label of a control the assistant owns, or
 * the policy identifier T-11 is named for. No record value, figure or record identifier appears here: those
 * arrive from the screen and are compared with one another (rule P-6).
 */
const TEXT = {
  /** The shell's navigation landmark, whose accessible name the shell owns. */
  navigationLandmark: 'Primary',

  /** The navigation entry that reaches SCR-06 (AAP 0.12.4). */
  assistantEntry: 'Evidence assistant',

  /** SCR-06's panel region, which is also the screen's one heading. */
  assistantRegion: 'Evidence assistant',

  /** The caption of the suggested questions, and the accessible name of their list. */
  suggestedQuestions: 'Suggested questions',

  /** The count AAP 0.2.3 and 0.12.4 fix for the suggested questions. */
  suggestedQuestionCount: 6,

  /** The composer's field label, bound to the input it names. */
  composerLabel: 'Your question',

  /** SCR-06's primary action, transcribed by AAP 0.12.4. */
  askLabel: 'Ask a suggested question',

  /** Why the composer's submit cannot act on an empty draft (rule P-8). */
  emptyDraftReason: 'Type a question, or choose one of the suggested questions.',

  /** The announcement a question in flight makes, which is how this file waits for a settled outcome. */
  pendingAnswer: 'Waiting for an answer',

  /** `Simulated calculation` — the label every computed figure carries (AAP 0.10, rule P-1). */
  calculationLabel: 'Simulated calculation',

  /** `Simulated data` — the badge the shell mounts on every route (rule P-1). */
  demonstrationLabel: 'Simulated data',

  /** The disclosure that reveals the queries an answer ran and the model it named. */
  showDetail: 'Show queries and model',

  /** The term the queries are listed under, and the term the model is printed under. */
  queriesTerm: 'Queries run',
  modelTerm: 'Model',

  /** The visually hidden completion of every evidence trigger's accessible name. */
  evidenceTriggerSuffix: /— open evidence/,

  /** The evidence drawer's heading, which is its accessible name, and the row naming its record. */
  evidenceDialog: 'Evidence',
  evidenceFreshnessSection: 'Source freshness',

  /** The drawer's close control. */
  closeLabel: 'Close',

  /** The model selector's group label, which names the native list it holds. */
  modelSelectorLabel: 'Answer model',

  /** The two words `ModelBoundary` declares, which the selector prints verbatim beside each entry. */
  inBoundary: 'in-boundary',
  external: 'external',

  /** The block card's heading and its one-click switch. */
  blockedTitle: 'Blocked by policy',
  switchToInBoundary: 'Switch to the in-boundary model',

  /** The three fields the block card files its evidence under. */
  policyTerm: 'Policy',
  alternativeTerm: 'Permitted alternative',
  auditEventTerm: 'Recorded policy event',

  /** POL-007 — the policy AAP 0.6.3 and 0.12.4 name as the external-model block (contracts §7.2). */
  externalModelPolicy: 'POL-007',

  /** The audit event identifier the block card reports, matched by the pattern contracts §1 fixes. */
  auditEventId: /AUD-\d{6}/,

  /** The navigation entry that reaches the audit trail, and the row action that opens an exception. */
  auditEntry: 'Audit trail',
  exceptionsEntry: 'Exceptions',
  openRowLabel: 'Open',

  /** The investigation screen's affected-orders table, whose caption names the orders it measures. */
  ordersTable: /Customer orders/,

  /** A question outside the six scripted ones. A question string, not a figure, with no record in it. */
  unscriptedQuestion: 'Summarise the week ahead for me.',

  /** The fixed notice AAP 0.12.4 fixes for anything outside the script, character for character. */
  unscriptedNotice:
    'This demonstration has no model behind it. Try one of the suggested questions.',

  /**
   * The vocabulary of a claim the demonstration cannot support (rule P-4). The assistant may describe the
   * declared policy set and the records it read; it may not assert that anything is proven, guaranteed or
   * resistant to alteration.
   */
  barredClaim: /tamper-proof|tamper resistant|zero trust|guaranteed|certified/i,
} as const;

/* ---------------------------------------------------------------------------------------------
 * Reading the screen — every value this file asserts comes from here
 * ------------------------------------------------------------------------------------------- */

/** One entry of the model selector: the text a reader sees and the identifier the control submits. */
interface OfferedModel {
  /** The option's visible text: the entry's designation and the boundary it declares. */
  readonly text: string;
  /** The option's value, which is the catalogue identifier the question is put to. */
  readonly value: string;
}

/**
 * A value the screen was expected to render, or an error naming what was missing.
 *
 * The assertions below compare values read from two surfaces, so a missing value is reported as the screen
 * failing to render it rather than as a comparison against nothing — which is what an absent member of a
 * locator read would otherwise become.
 *
 * @param value - The value a screen read produced.
 * @param what - What was being read, in the words a reader of a failure needs.
 * @returns The value, once it is known to be present and non-empty.
 * @throws Error - When the screen rendered nothing where a value was expected.
 */
function required(value: string | null | undefined, what: string): string {
  if (value === null || value === undefined || value.trim() === '') {
    throw new Error(`The application rendered no ${what}, so the comparison that follows cannot be made.`);
  }

  return value.trim();
}

/**
 * The first whitespace-delimited token of a rendered value.
 *
 * A cell or a chip leads with the record reference it names, followed by the source, the freshness state or
 * the completion of the control's name, so the leading token is the reference in both places.
 *
 * @param text - The rendered text.
 * @returns The reference, or `undefined` when the text is empty.
 */
function leadingToken(text: string): string | undefined {
  return text.trim().split(/\s+/)[0];
}

/**
 * The first number a rendered value states, as the record wrote it.
 *
 * Figures are read back as the record's own digits — grouped where the record groups them — so an assertion
 * compares two renderings of one computation rather than restating it (rule P-6).
 *
 * @param text - The rendered text.
 * @returns The figure as printed, or `undefined` when the text states none.
 */
function leadingNumber(text: string): string | undefined {
  /* A figure as the record writes it: digits, with a group separator only where three digits follow it, so
     the comma that ends a clause in a sentence is not taken for part of the number beside it. */
  return /\d+(?:[.,]\d{3})*/.exec(text)?.[0];
}

/**
 * A rendered value with every regular-expression metacharacter escaped, so it can stand for itself inside a
 * pattern built from text the screen supplied.
 *
 * @param value - The rendered value.
 * @returns The value as a literal pattern.
 */
function literal(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The accessible name of the queue's open action for one exception.
 *
 * The control renders its label and the row's identifier as two adjacent elements, so the computed name
 * carries the separator with the whitespace the name computation inserts between them. The pattern accepts
 * that spacing around the colon and nothing else, and the identifier itself is the one the answer cited
 * rather than one this file chose (rule P-6).
 *
 * @param reference - The exception reference read from the screen.
 * @returns A pattern matching that row's open control and no other.
 */
function openActionName(reference: string): RegExp {
  return new RegExp(`^${literal(TEXT.openRowLabel)}\\s*:\\s*${literal(reference)}$`);
}

/**
 * Opens the application at its entry route and reaches the assistant through the navigation.
 *
 * The route is not addressed directly: AAP 0.7 requires every screen to be reached from the entry point by
 * real navigation, so the shell is loaded at `/` — where the persona's own entry route answers — and the
 * assistant is reached through its navigation entry.
 *
 * @param page - The Playwright page showing the application.
 * @returns The assistant's panel region, once it has rendered.
 */
async function openAssistant(page: Page): Promise<Locator> {
  await page.goto('/');

  const navigation = page.getByRole('navigation', { name: TEXT.navigationLandmark, exact: true });
  await navigation.getByRole('link', { name: TEXT.assistantEntry, exact: true }).click();

  const panel = page.getByRole('region', { name: TEXT.assistantRegion, exact: true });
  await expect(panel).toBeVisible();

  return panel;
}

/**
 * The suggested questions as one list of real controls.
 *
 * The list is named by the caption the panel renders above it, so this locator names the grouping rather
 * than counting buttons: the six questions arrive from the service in its own order (AAP 0.12.4).
 *
 * @param panel - The assistant's panel region.
 * @returns The question controls, in the order the service published them.
 */
function suggestedQuestions(panel: Locator): Locator {
  return panel
    .getByRole('list', { name: TEXT.suggestedQuestions, exact: true })
    .getByRole('button');
}

/**
 * The citation chips of the answer on screen.
 *
 * Every chip is the shared evidence trigger, whose accessible name completes the reference it prints with
 * the drawer's own suffix, so the locator finds the chips and nothing else in the panel. An answer that
 * cites nothing therefore counts zero, which is how the unscripted notice's lack of citations is asserted.
 *
 * @param panel - The assistant's panel region.
 * @returns The evidence triggers of the answer on screen.
 */
function citationChips(panel: Locator): Locator {
  return panel.getByRole('button', { name: TEXT.evidenceTriggerSuffix });
}

/**
 * The entries the model selector offers, read once as text and value.
 *
 * A native `<select>`'s options are reachable by keyboard and by a screen reader's forms mode, and neither
 * the boundary word nor the identifier is typed here: both are the records' own, and the switch below is
 * asserted against the entry this read finds (rule P-6).
 *
 * @param selector - The model selector's `<select>`.
 * @returns One entry per option, in the order the catalogue lists them.
 */
async function offeredModels(selector: Locator): Promise<readonly OfferedModel[]> {
  return selector.locator('option').evaluateAll((options) =>
    options.map((option) => ({
      text: (option.textContent ?? '').trim(),
      value: option instanceof HTMLOptionElement ? option.value : '',
    })),
  );
}

/**
 * The state the selector currently holds, as the entry it names.
 *
 * @param selector - The model selector's `<select>`.
 * @param offered - The entries the selector offers.
 * @returns The selected entry.
 * @throws Error - When the control holds a value no option declares.
 */
async function selectedModel(selector: Locator, offered: readonly OfferedModel[]): Promise<OfferedModel> {
  const value = required(await selector.inputValue(), 'selected model identifier');
  const entry = offered.find((candidate) => candidate.value === value);

  if (entry === undefined) {
    throw new Error(
      `The model selector holds "${value}", which none of its options declares, so the entry it names cannot be read.`,
    );
  }

  return entry;
}

/* ---------------------------------------------------------------------------------------------
 * T-10 — a scripted answer with its citations, and the fixed notice outside the script
 * ------------------------------------------------------------------------------------------- */

test('T-10 a suggested question returns a cited answer and an unscripted question returns the fixed notice', async ({
  page,
}) => {
  const panel = await openAssistant(page);

  /* Rule P-1: the badge the shell mounts above the router outlet is on this route too, so a reader is told
     the workspace is a demonstration before reading anything the assistant says. */
  await expect(page.getByRole('button', { name: TEXT.demonstrationLabel })).toBeVisible();

  /* The six questions, in the order the service published them (AAP 0.2.3, AAP 0.12.4 SCR-06). */
  const questions = suggestedQuestions(panel);
  await expect(questions).toHaveCount(TEXT.suggestedQuestionCount);

  /* Rule P-8: the composer's action cannot act on an empty draft, and it carries the sentence that says so
     as its own description, so the reason is reachable by keyboard and by a screen reader and not only as a
     hint a pointer reveals. */
  const submit = panel.getByRole('button', { name: TEXT.askLabel, exact: true });
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveAccessibleDescription(TEXT.emptyDraftReason);

  /* The selector appears with the catalogue, and no question can be put without an entry to put it to, so
     its appearance is what says the panel's two reads have settled. */
  const selector = panel.getByRole('combobox', { name: TEXT.modelSelectorLabel, exact: true });
  await expect(selector).toBeVisible();

  /* ---------------------------------------------------------- the scripted answer */

  await questions.first().click();

  /* Every computed figure the answer states carries its own label (AAP 0.10, rule P-1). */
  await expect(panel.getByText(TEXT.calculationLabel, { exact: true })).toBeVisible();

  /* The answer as rendered, captured before anything else touches the panel: the figures it states are
     compared with the solver-backed screen further down, so no figure is transcribed here (rule P-6). */
  const answerText = await panel.innerText();

  /* Every chip names the reference it cites, the source that record comes from and that source's freshness
     as the adapter reported it. Three or more tokens is that statement: the reference this file reads and
     two record values it does not type. */
  const chips = citationChips(panel);
  const chipTexts = (await chips.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim());

  expect(chipTexts.length, 'the answer cites at least one record').toBeGreaterThan(0);

  for (const chipText of chipTexts) {
    expect(
      chipText.split(' ').length,
      `the citation chip "${chipText}" names a record, its source and that source's freshness`,
    ).toBeGreaterThan(2);
  }

  const citationRef = required(leadingToken(chipTexts[0] ?? ''), 'citation reference');

  /* Activating a chip opens that record's evidence, whose second section states the source's freshness. */
  const firstChip = chips.first();
  await expect(firstChip).toHaveAttribute('aria-haspopup', 'dialog');
  await firstChip.click();

  const drawer = page.getByRole('dialog', { name: TEXT.evidenceDialog, exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText(citationRef);
  await expect(drawer.getByText(TEXT.evidenceFreshnessSection, { exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: TEXT.closeLabel, exact: true }).click();
  await expect(drawer).toBeHidden();

  /* The disclosure keeps the answer's working: the queries it ran and the model the service named. */
  const offered = await offeredModels(selector);
  const modelEntry = await selectedModel(selector, offered);
  const listsBefore = await panel.getByRole('list').count();

  await panel.getByRole('button', { name: TEXT.showDetail, exact: true }).click();
  await expect(panel.getByText(TEXT.queriesTerm, { exact: true })).toBeVisible();
  await expect(panel.getByText(TEXT.modelTerm, { exact: true })).toBeVisible();

  /* Opening the disclosure reveals the queries as a list of their own, and it holds the records the answer
     read and the measurements it took, so it is not an empty grouping. */
  await expect(panel.getByRole('list')).toHaveCount(listsBefore + 1);
  await expect(panel.getByRole('list').last()).not.toBeEmpty();

  /* The model the answer names is the entry the selector offers, by the identifier the catalogue declares:
     a scripted answer over the cited records, not a composition by a connected model (rule P-1). */
  await expect(panel.getByText(modelEntry.value, { exact: true })).toBeVisible();

  /* ---------------------------------------------------------- the fixed notice */

  await panel.getByLabel(TEXT.composerLabel, { exact: true }).fill(TEXT.unscriptedQuestion);
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(panel.getByText(TEXT.unscriptedNotice, { exact: true })).toBeVisible();
  await expect(citationChips(panel), 'an answer that read no record cites none').toHaveCount(0);

  /* ---------------------------------------------------------- the figures, against the solver */

  /* The answer's figures are the solver's own, so they are compared with the same measurements the
     investigation screen renders for the same orders. The exception is the one the answer cited, read from
     its chip rather than typed, and it is opened through the queue's own row action. */
  const navigation = page.getByRole('navigation', { name: TEXT.navigationLandmark, exact: true });
  await navigation.getByRole('link', { name: TEXT.exceptionsEntry, exact: true }).click();
  await page.getByRole('button', { name: openActionName(citationRef) }).click();

  const ordersTable = page.getByRole('table', { name: TEXT.ordersTable });
  await expect(ordersTable).toBeVisible();

  const rows = ordersTable.getByRole('row');
  const rowCount = await rows.count();
  let compared = 0;

  /* Row zero is the header, so the measured orders start at one. The table's cells are the interface's own
     formatting of the solver's output: the order in the first column and the units it leaves late in the
     second, which is the measure the answer states in words. */
  for (let index = 1; index < rowCount; index += 1) {
    const cells = rows.nth(index).getByRole('cell');
    const orderRef = leadingToken(await cells.nth(0).innerText());
    const unitsLate = leadingNumber(await cells.nth(1).innerText());

    if (orderRef === undefined || unitsLate === undefined) {
      continue;
    }

    const statedAt = answerText.indexOf(orderRef);

    if (statedAt < 0) {
      continue;
    }

    const stated = leadingNumber(answerText.slice(statedAt + orderRef.length));

    expect(
      stated,
      `the units-late figure the answer states for ${orderRef} must be the one the solver-backed screen renders`,
    ).toBe(unitsLate);

    compared += 1;
  }

  expect(
    compared,
    'the answer must name at least one order the investigation screen measures',
  ).toBeGreaterThan(0);
});

/* ---------------------------------------------------------------------------------------------
 * T-11 — POL-007 blocks the external model, and one click switches to the in-boundary model
 * ------------------------------------------------------------------------------------------- */

test('T-11 POL-007 blocks the external model and one click switches to the in-boundary model', async ({
  page,
}) => {
  const panel = await openAssistant(page);

  const selector = panel.getByRole('combobox', { name: TEXT.modelSelectorLabel, exact: true });
  await expect(selector).toBeVisible();

  /* ---------------------------------------------------------- the catalogue, and its default */

  const offered = await offeredModels(selector);
  expect(offered.length, 'the catalogue offers the in-boundary entry and an external one').toBeGreaterThan(
    1,
  );

  const defaultEntry = await selectedModel(selector, offered);
  expect(defaultEntry.text, 'the selector starts on the in-boundary entry').toContain(TEXT.inBoundary);

  const externalEntry = offered.find((entry) => entry.text.includes(TEXT.external));

  if (externalEntry === undefined) {
    throw new Error(
      'The model selector offers no entry whose declared boundary is external, so the block POL-007 makes cannot be exercised.',
    );
  }

  const inBoundaryEntry = offered.find((entry) => entry.text.includes(TEXT.inBoundary));

  if (inBoundaryEntry === undefined) {
    throw new Error(
      'The model selector offers no entry whose declared boundary is in-boundary, so the alternative POL-007 permits cannot be read.',
    );
  }

  await selector.selectOption(externalEntry.value);
  await expect(selector).toHaveValue(externalEntry.value);

  /* ---------------------------------------------------------- the question POL-007 refuses */

  const questions = suggestedQuestions(panel);
  await expect(questions).toHaveCount(TEXT.suggestedQuestionCount);

  const blockCard = panel.getByRole('region', { name: TEXT.blockedTitle, exact: true });
  const pending = panel.getByText(TEXT.pendingAnswer, { exact: true });
  const chips = citationChips(panel);
  const questionCount = await questions.count();
  let blocked = false;

  /*
   * The document in context comes from the question, which is the assistant's own control over what a
   * question runs over: the panel supplies no caller-side reference list, and the adapter derives the
   * material a question carries from the records it cites. The offered questions are therefore asked in
   * order until one is refused, and the refused one is identified by the block itself rather than by its
   * wording, which this file never types.
   */
  for (let index = 0; index < questionCount; index += 1) {
    await questions.nth(index).click();

    /* A question in flight announces itself, which is what makes the wait below settle on an outcome
       rather than on the answer that was on screen when the control was activated. */
    await expect(pending).toBeVisible();
    await expect(pending).toBeHidden();

    if ((await blockCard.count()) > 0) {
      blocked = true;
      break;
    }

    await expect(chips.first()).toBeVisible();
  }

  expect(
    blocked,
    'a suggested question must carry a document the external entry may not answer over',
  ).toBe(true);

  /* ---------------------------------------------------------- what the policy block states */

  await expect(blockCard).toBeVisible();
  await expect(blockCard).toContainText(TEXT.externalModelPolicy);

  /* The card files its evidence under the rule, the model the rule permits and the event the refusal
     recorded, each as a caption with its record value beside it. */
  await expect(blockCard.getByText(TEXT.policyTerm, { exact: true })).toBeVisible();
  await expect(blockCard.getByText(TEXT.alternativeTerm, { exact: true })).toBeVisible();
  await expect(blockCard.getByText(TEXT.auditEventTerm, { exact: true })).toBeVisible();

  /* The permitted alternative is the in-boundary entry the catalogue declares, and the reason is a
     sentence rather than a bare identifier: both are the policy record's own values. */
  await expect(blockCard).toContainText(inBoundaryEntry.value);

  const reasonText = required(
    (await blockCard.getByRole('paragraph').first().innerText()).trim(),
    'reason the denying policy gave',
  );

  expect(
    reasonText.split(/\s+/).length,
    'the block states its reason in words rather than only naming the rule',
  ).toBeGreaterThan(3);

  await expect(
    blockCard.getByRole('button', { name: TEXT.switchToInBoundary, exact: true }),
  ).toBeVisible();

  /* A blocked question produces no answer: no citation stands beside the card and no computed figure is
     labelled, because the policy is evaluated before an answer exists (AAP 0.6.3, AAP 0.12.3). */
  await expect(chips, 'a blocked question produces no answer beside the block').toHaveCount(0);
  await expect(panel.getByText(TEXT.calculationLabel, { exact: true })).toHaveCount(0);

  const eventRef = required(
    (await blockCard.getByText(TEXT.auditEventId).innerText()).trim(),
    'audit event the block recorded',
  );

  /* ---------------------------------------------------------- the one-click switch */

  await blockCard.getByRole('button', { name: TEXT.switchToInBoundary, exact: true }).click();

  const switchedEntry = await selectedModel(selector, offered);
  expect(switchedEntry.value, 'the switch selects the entry the policy permits').toBe(
    inBoundaryEntry.value,
  );

  await expect(blockCard, 'the permitted question is answered rather than blocked again').toHaveCount(0);
  await expect(chips.first(), 'the permitted question is answered with its citations').toBeVisible();
  await expect(panel.getByText(TEXT.calculationLabel, { exact: true })).toBeVisible();

  /* The answer names the entry it was composed for, which is the entry the selector now holds. */
  await panel.getByRole('button', { name: TEXT.showDetail, exact: true }).click();
  await expect(panel.getByText(inBoundaryEntry.value, { exact: true })).toBeVisible();

  /* Rule P-4: nothing the assistant says claims a property the demonstration cannot support. */
  const panelText = await panel.innerText();
  expect(panelText, 'the assistant states no claim it cannot support').not.toMatch(TEXT.barredClaim);

  /* ---------------------------------------------------------- the block in the audit trail */

  /*
   * The refusal appends a policy-actor event, and it is followed here through the interface a reader would
   * use: the persona lever selects the role whose home route reads the chain (contracts §7.1 grants
   * `audit.read` to the auditor alone among the planning personas), and the audit trail is then opened
   * through its navigation entry.
   */
  await switchRole(page, 'USR-06');

  const navigation = page.getByRole('navigation', { name: TEXT.navigationLandmark, exact: true });
  await navigation.getByRole('link', { name: TEXT.auditEntry, exact: true }).click();
  await expect(page).toHaveURL(/\/audit$/);

  await expect(page.getByRole('cell', { name: eventRef, exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: eventRef })).toContainText(
    TEXT.externalModelPolicy,
  );
});

