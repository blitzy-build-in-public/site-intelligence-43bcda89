/**
 * The persona lever of the browser suite: switches the demonstration role switcher to a seeded
 * persona and states, as the suite's oracle, where each persona is expected to land.
 *
 * WHAT IT DRIVES. `src/app/role-switcher.tsx`, the last control in the shell's top bar. That control
 * renders a native `<select>` — the keyboard- and screen-reader-native element — with one option per
 * persona the bound adapter reports, the option's value being the persona's own identifier. Choosing
 * another option calls the demonstration capability's `switchRole`, and on success the shell stores
 * the returned role, drops its cached reads and sends the router to the entry route AAP 0.12.4 fixes
 * for that role. Everything here is done by selecting an option, exactly as a reader would: no lever
 * of the suite's own is added to the application, and the build ships no test hook (AAP 0.7, 0.9).
 *
 * WHY THE PERSONA TABLE IS TYPED HERE. The eight identifiers and the eight entry routes are this
 * suite's expectation, so they are stated here rather than read back from the shell's own
 * `entryRouteFor` in `src/app/nav-items.ts`: a check that asks the code under test where it thinks a
 * persona belongs proves nothing. The table is AAP 0.12.4's per-persona landing routes, once S2
 * exists — `/canvas` for the four planning roles, `/approvals` for the plant manager,
 * `/admin/sovereignty` for the platform administrator, `/audit` for the auditor and `/evidence` for
 * the external supplier engineer, whose entry route renders the S4 stage-notice page and is a
 * correct landing rather than a failure. It is also the only place a persona identifier is written:
 * everything a spec says about a persona's wording is read from the DOM through
 * `renderedPersonaOptions`, so no spec has to invent a label matcher and no label wording, person's
 * name or role display string is typed here.
 *
 * WHAT A SWITCH PROVES, AND WHAT IT DOES NOT. It changes which persona the in-browser adapter acts
 * as, and nothing more. Every read and write afterwards is authorised by that adapter against the
 * persona it now enforces — the permission matrix and the policy engine of `platform-contracts.md`
 * §7 are enforced there, on the seed's own records — so bypassing the visible control grants
 * nothing, and the checks behind it run in a build with no backend and are a demonstration rather
 * than production authorisation (rule P-3). The switcher states that on screen; this module adds no
 * claim of its own.
 *
 * A SWITCH NEVER RELOADS. The mock adapter keeps its state in memory, so loading the document again
 * would put the seed back and lose whatever the spec had arranged. This module therefore never
 * navigates by address: it selects an option and waits for the navigation the application performs
 * itself. That is also why the persona is switched rather than injected through storage, a query
 * parameter or a global — none of which exists, and none of which this module may invent.
 *
 * WHAT IT DOES NOT DO. It issues no request and names no host, port or origin (rule B-1); it reads no
 * configuration and carries no key or secret (rule B-2); it locates the control by
 * role and identifies a persona by an option's value, never by a class, a colour or a position (rule
 * B-3); it types no figure, amount, date, threshold or record identifier of the application's data
 * and imports no seed and no fixture (rule P-6); and it writes nothing into the application's own
 * text (rule P-7 — the product is Site Intelligence and its workspace is the FileMap canvas).
 *
 * WHY THE FAILURES ARE ERRORS AND NOT ASSERTIONS. A lookup that finds no control, no option or no
 * landing route is reported as an `Error` naming the control, the state it was asked for and what was
 * actually on screen. A disabled control's own explanation is quoted in that error rather than lost
 * to a click timeout (rule P-8) — `src/components/tooltip.tsx` and `src/app/role-switcher.tsx` both
 * keep that sentence reachable by keyboard, and this module's job is to surface it.
 *
 * Serves every browser spec that has to read the application as a particular persona:
 * `s1-overview-queue`, `s1-investigation`, `s1-scenarios`, `s1-approvals-audit`, `s1-assistant`,
 * `s1-governance`, `s1-labelling-and-states`, `s1-keyboard-and-axe`, `s2-canvas`, `s3-atlas`,
 * `network-origin` and `planner-journey` (§9 of `platform-specification.md`).
 */
import type { Locator, Page } from '@playwright/test';

import type { Role, UserId } from '../../src/types';

/* ---------------------------------------------------------------------------------------------
 * Waits — every one of them bounded, so a stuck control reports what it reached instead of a timeout
 * ------------------------------------------------------------------------------------------- */

/**
 * How long the shell is given to render its top bar and the switcher within it.
 *
 * The mock adapter bootstraps before the first screen paints — it computes the hashes of the seeded
 * audit events — so the control does not exist on the first frame. The ceiling is far above that
 * work and below the suite's own test timeout, so reaching it means the shell never mounted rather
 * than that it was slow.
 */
const SCREEN_READY_TIMEOUT_MS = 10_000;

/**
 * How long the switcher is given to render the persona an option was asked for.
 *
 * The roster is a service read with the adapter's injected latency, so a select that has just
 * appeared may hold the acting persona alone for a moment. Waiting for the option is what turns that
 * one-moment gap into a wait instead of a failure.
 */
const OPTION_TIMEOUT_MS = 8_000;

/**
 * How long the application is given to land on the entry route after a persona is chosen.
 *
 * A switch is one adapter call plus one client-side navigation, so this bounds a wait that settles
 * in a fraction of a second. It is a ceiling on a web-first wait, never a sleep.
 */
const ROUTE_TIMEOUT_MS = 10_000;

/* ---------------------------------------------------------------------------------------------
 * The persona table — the suite's oracle, AAP 0.12.4
 * ------------------------------------------------------------------------------------------- */

/**
 * One of the eight seeded personas the demonstration can act as.
 *
 * The identifier is the option value the role switcher itself carries, so a spec passes the same
 * value a reader's choice would; the role is the `Role` union member that identifier names, which is
 * what the shell resolves an entry route from; and the entry route is where AAP 0.12.4 says that
 * persona lands once the FileMap canvas exists.
 */
export interface Persona {
  /** The persona's identifier, `USR-01` to `USR-08`, as the roster of the bound adapter reports it. */
  readonly id: UserId;

  /** The role the persona acts with, one member of the `Role` union of `src/types/entities.ts`. */
  readonly role: Role;

  /**
   * The path the application sends this persona to, as AAP 0.12.4 fixes it. A path only — no origin,
   * no port and no query, because the switch is the application's own navigation and this module
   * never addresses one (rule B-1).
   */
  readonly entryRoute: string;
}

/**
 * The eight personas in `USR-01` … `USR-08` order, with the entry route AAP 0.12.4 fixes for each.
 *
 * This is the suite's expectation, not a copy of the application's own table: the specs compare what
 * the shell does against this list, so the list has to be written independently of
 * `src/app/nav-items.ts` to be worth comparing against. `USR-08`'s `/evidence` renders the stage
 * notice that says the workspace arrives in S4, which is that persona's correct landing in this run.
 */
export const PERSONAS: readonly Persona[] = [
  { id: 'USR-01', role: 'material-planner', entryRoute: '/canvas' },
  { id: 'USR-02', role: 'plant-manager', entryRoute: '/approvals' },
  { id: 'USR-03', role: 'head-of-supply-chain', entryRoute: '/canvas' },
  { id: 'USR-04', role: 'platform-administrator', entryRoute: '/admin/sovereignty' },
  { id: 'USR-05', role: 'production-planner', entryRoute: '/canvas' },
  { id: 'USR-06', role: 'auditor', entryRoute: '/audit' },
  { id: 'USR-07', role: 'supplier-quality-engineer', entryRoute: '/canvas' },
  { id: 'USR-08', role: 'external-supplier-engineer', entryRoute: '/evidence' },
];

/**
 * Whether a value read from outside the compiler is one of the eight seeded personas.
 *
 * `UserId` is a string alias rather than a union of literals, so this check is the only thing that
 * tells a persona identifier from a typo: a spec that reaches this module with a mistyped value
 * would otherwise become a missing-option failure instead of a bad-argument failure.
 *
 * @param value The string to test, such as an option's value.
 * @returns `true` when the value names one of the eight personas.
 */
function isPersonaId(value: string): boolean {
  return PERSONAS.some((persona) => persona.id === value);
}

/**
 * Every accepted identifier, with the role it names, as one clause of a failure message.
 *
 * @returns The eight identifiers in table order, each followed by its role in parentheses.
 */
function describePersonaIds(): string {
  return PERSONAS.map((persona) => `${persona.id} (${persona.role})`).join(', ');
}

/**
 * The persona a switch was asked for, or a failure naming what was asked for and what is accepted.
 *
 * @param id The identifier the caller passed, which the compiler cannot narrow.
 * @param caller The exported function reporting the failure, so the message names the call the
 *   reader can find in the spec rather than a private helper.
 * @returns The matching persona row.
 * @throws Error when the identifier names none of the eight personas.
 */
function personaFor(id: UserId, caller: string): Persona {
  const requested: string = id;
  const persona = PERSONAS.find((candidate) => candidate.id === requested);
  if (persona === undefined) {
    throw new Error(
      `${caller}: ${JSON.stringify(requested)} is not one of the eight seeded personas this suite drives, so no control could offer it. Accepted identifiers: ${describePersonaIds()}.`,
    );
  }
  return persona;
}

/**
 * The path AAP 0.12.4 says a persona lands on, read from this module's own table.
 *
 * A spec that asserts a landing route compares the page against this value, so the expectation is
 * stated once rather than retyped in every spec that switches persona.
 *
 * @param id One of the eight persona identifiers.
 * @returns The entry route, such as `/canvas` or `/audit`.
 * @throws Error when the identifier names none of the eight personas.
 */
export function entryRouteForPersona(id: UserId): string {
  return personaFor(id, 'entryRouteForPersona').entryRoute;
}

/* ---------------------------------------------------------------------------------------------
 * Reading the switcher — located by role and identified by its option values, rules B-3 and P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * One option as the switcher currently renders it: the value a selection would set, and the text a
 * reader sees.
 *
 * Both are read from the live document rather than typed here, so the module knows no persona's
 * name and no role display wording (rule P-7): a spec that needs either asks
 * `renderedPersonaOptions` for what the control is showing.
 */
interface SelectOption {
  /** The option's `value`, which for this control is a persona identifier. */
  readonly value: string;

  /** The option's visible text, as rendered. */
  readonly label: string;
}

/**
 * Collapses runs of whitespace so rendered text fits one line of a failure message.
 *
 * @param text The text as read from the document.
 * @returns The same text with each run of whitespace reduced to one space, trimmed.
 */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * The options a select currently offers, in the order the document renders them.
 *
 * An option carries its persona identifier in `value`; a select in the middle of an update may hold
 * a single option, which is why the caller waits for the one it wants rather than reading once.
 *
 * @param select The switcher's `<select>`.
 * @returns Every rendered option, value and label.
 */
async function readOptions(select: Locator): Promise<readonly SelectOption[]> {
  const options = select.locator('option');
  const total = await options.count();
  const rendered: SelectOption[] = [];

  for (let index = 0; index < total; index += 1) {
    const option = options.nth(index);
    const value = collapseWhitespace((await option.getAttribute('value')) ?? '');
    const label = collapseWhitespace((await option.textContent()) ?? '');
    rendered.push({ value, label });
  }

  return rendered;
}

/**
 * A set of options as one clause of a failure message, so an error reports what was on screen.
 *
 * @param options The options a select rendered.
 * @returns The values with their labels, or a statement that the select rendered none.
 */
function describeOptions(options: readonly SelectOption[]): string {
  if (options.length === 0) {
    return 'no options rendered';
  }

  const rendered = options.map(
    (option) =>
      `${option.value === '' ? '(no value)' : option.value} = ${JSON.stringify(option.label)}`,
  );

  return `[${rendered.join(', ')}]`;
}

/**
 * Whether a set of options is the persona switcher's own.
 *
 * A select is identified by what it offers, not by where it sits or what it is called: the
 * switcher's every option value is a seeded persona identifier, which no other control in the
 * application renders. A select holding a value that is not a persona — a plant filter, a product
 * filter, a sort order — therefore cannot be mistaken for it.
 *
 * @param options The options a select rendered.
 * @returns `true` when the select offers at least one option and every value is a persona.
 */
function looksLikePersonaSwitcher(options: readonly SelectOption[]): boolean {
  return options.length > 0 && options.every((option) => isPersonaId(option.value));
}

/**
 * One combobox with the options it currently offers, kept together so a scan can be described.
 */
interface ComboboxScan {
  /** The combobox itself. */
  readonly combobox: Locator;

  /** The options it renders at the moment of the scan. */
  readonly options: readonly SelectOption[];
}

/**
 * A region searched for the switcher, named so a failure can say where it looked.
 */
interface SwitcherScope {
  /** How a failure message refers to the region, such as `the top bar`. */
  readonly name: string;

  /** The comboboxes the region renders. */
  readonly comboboxes: Locator;
}

/**
 * Every combobox a region renders, each with the options it offers.
 *
 * @param comboboxes The region's comboboxes.
 * @returns One scan per combobox, in document order.
 */
async function scanComboboxes(comboboxes: Locator): Promise<readonly ComboboxScan[]> {
  const total = await comboboxes.count();
  const scans: ComboboxScan[] = [];

  for (let index = 0; index < total; index += 1) {
    const combobox = comboboxes.nth(index);
    scans.push({ combobox, options: await readOptions(combobox) });
  }

  return scans;
}

/**
 * A region's comboboxes described for the failure that reports a lookup which found nothing.
 *
 * @param scans The region's scans.
 * @returns The comboboxes with their options, or a statement that the region renders none.
 */
function describeScans(scans: readonly ComboboxScan[]): string {
  if (scans.length === 0) {
    return 'renders no combobox';
  }

  const described = scans.map(
    (scan, index) => `#${index + 1} offers ${describeOptions(scan.options)}`,
  );

  return `renders ${scans.length} combobox(es): ${described.join('; ')}`;
}

/**
 * The switcher within one region, or `null` when the region renders none.
 *
 * More than one match is a failure rather than a guess: the shell renders one switcher, and picking
 * one of two would leave a spec asserting a control the reader may not have used.
 *
 * @param scope The region to search and the name a failure gives it.
 * @returns The single matching combobox, or `null`.
 * @throws Error when the region renders more than one combobox offering persona values.
 */
async function switcherIn(scope: SwitcherScope): Promise<Locator | null> {
  const scans = await scanComboboxes(scope.comboboxes);
  const matches = scans.filter((scan) => looksLikePersonaSwitcher(scan.options));
  const [first, ...rest] = matches;

  if (first === undefined) {
    return null;
  }

  if (rest.length > 0) {
    throw new Error(
      `The role switcher is ambiguous: ${scope.name} renders ${matches.length} comboboxes whose values are all persona identifiers, so a selection would not prove which control a reader used. ${scope.name} ${describeScans(scans)}.`,
    );
  }

  return first.combobox;
}

/**
 * Waits for the shell to render its first combobox, or reports that it never did.
 *
 * @param page The Playwright page showing the application.
 * @param caller The exported function reporting the failure, so the message names the call a
 *   reader can find in the spec.
 * @throws Error when no combobox is attached within `SCREEN_READY_TIMEOUT_MS`.
 */
async function waitForFirstCombobox(page: Page, caller: string): Promise<void> {
  try {
    await page.getByRole('combobox').first().waitFor({
      state: 'attached',
      timeout: SCREEN_READY_TIMEOUT_MS,
    });
  } catch (cause) {
    throw new Error(
      `${caller}: the application rendered no combobox within ${SCREEN_READY_TIMEOUT_MS} ms, so the demonstration role switcher is not on the page. Either the shell did not mount, or the bound service carries no persona roster and the switcher renders its disabled action instead of a select.`,
      { cause },
    );
  }
}

/**
 * Reports what each region of the page renders, for the failure of a lookup that matched nothing.
 *
 * @param page The Playwright page showing the application.
 * @returns A sentence naming the top bar's comboboxes and the page's, with their options.
 */
async function describeSwitcherCandidates(page: Page): Promise<string> {
  const inBanner = await scanComboboxes(page.getByRole('banner').getByRole('combobox'));
  const onPage = await scanComboboxes(page.getByRole('combobox'));

  return `The top bar ${describeScans(inBanner)}; the page ${describeScans(onPage)}.`;
}

/**
 * Locates the demonstration role switcher.
 *
 * The control is found by role first — the banner landmark the shell's top bar renders, then the
 * page as a whole, so a shell whose bar is a plain region is still reached — and then identified by
 * the values it offers, which is what makes the lookup independent of a label wording this suite
 * does not fix (rule B-3).
 *
 * @param page The Playwright page showing the application.
 * @param caller The exported function reporting the failure, so the message names the call a
 *   reader can find in the spec.
 * @returns The switcher's combobox.
 * @throws Error when the page renders no combobox, no combobox offers persona values, or more than
 *   one does.
 */
async function resolveSwitcher(page: Page, caller: string): Promise<Locator> {
  await waitForFirstCombobox(page, caller);

  const inBanner = await switcherIn({
    name: 'the top bar',
    comboboxes: page.getByRole('banner').getByRole('combobox'),
  });
  if (inBanner !== null) {
    return inBanner;
  }

  const onPage = await switcherIn({
    name: 'the page',
    comboboxes: page.getByRole('combobox'),
  });
  if (onPage !== null) {
    return onPage;
  }

  throw new Error(
    `${caller}: no combobox on the page offers persona identifiers as its option values, so the role switcher is missing or its options carry something else. ${await describeSwitcherCandidates(page)}`,
  );
}

/**
 * The explanation a control gives for not acting (rule P-8), quoted by the error that reports it.
 *
 * Read from the targets of `aria-describedby` first, because that is the mechanism both
 * `src/components/tooltip.tsx` and `src/app/role-switcher.tsx` use and it keeps the sentence
 * reachable whatever else is hidden; then from `title`; then from the text rendered around the
 * control. Every one of those is a diagnostic read of an already-located control, never a way of
 * locating one.
 *
 * @param page The Playwright page showing the application.
 * @param control The control that cannot act.
 * @returns The explanation, or a statement that the control renders none.
 */
async function readDisabledReason(page: Page, control: Locator): Promise<string> {
  const describedBy = collapseWhitespace((await control.getAttribute('aria-describedby')) ?? '');
  const described: string[] = [];

  for (const id of describedBy === '' ? [] : describedBy.split(/\s+/)) {
    const text = collapseWhitespace(
      (await page
        .locator(`[id="${id}"]`)
        .textContent()
        .catch(() => null)) ?? '',
    );
    if (text !== '') {
      described.push(text);
    }
  }

  if (described.length > 0) {
    return described.join(' ');
  }

  const title = collapseWhitespace((await control.getAttribute('title')) ?? '');
  if (title !== '') {
    return title;
  }

  const surrounding = collapseWhitespace(
    (await control
      .locator('xpath=..')
      .textContent()
      .catch(() => null)) ?? '',
  );
  if (surrounding !== '') {
    return surrounding;
  }

  return 'the control renders no explanation, which is itself the rule P-8 breach';
}

/**
 * The options the running role switcher currently renders, in document order.
 *
 * The read a spec uses when it needs to talk about a persona the way the interface does: the labels
 * are the control's own text, so no spec retypes a persona's name or role wording and none of that
 * wording is written here (rule P-7).
 *
 * @param page The Playwright page showing the application.
 * @returns Each option's value and label, in the order the select renders them.
 */
export async function renderedPersonaOptions(
  page: Page,
): Promise<readonly { value: string; label: string }[]> {
  const select = await resolveSwitcher(page, 'renderedPersonaOptions');

  return readOptions(select);
}

/* ---------------------------------------------------------------------------------------------
 * Switching the persona — rules P-3 and P-8, AAP 0.7 and 0.12.4
 * ------------------------------------------------------------------------------------------- */

/**
 * Waits for the switcher to offer the persona that was asked for, or reports what it offers instead.
 *
 * The roster arrives from the service, so a select that has just rendered may hold the acting
 * persona alone for a moment. Waiting for the option is what makes that gap a wait rather than a
 * failure, and the report on a ceiling reached names the options actually rendered and, when the
 * control also explains why it cannot act, that explanation (rule P-8).
 *
 * @param page The Playwright page showing the application.
 * @param select The switcher's combobox.
 * @param target The persona the caller asked for.
 * @throws Error when the option never attaches, with every rendered option in the message.
 */
async function waitForPersonaOption(page: Page, select: Locator, target: Persona): Promise<void> {
  const option = select.locator(`option[value=${JSON.stringify(target.id)}]`);

  try {
    await option.waitFor({ state: 'attached', timeout: OPTION_TIMEOUT_MS });
  } catch (cause) {
    const rendered = await readOptions(select);
    const disabled = await select.getAttribute('aria-disabled');
    const explanation =
      disabled === 'true'
        ? ` The switcher cannot act and gives: ${await readDisabledReason(page, select)}`
        : '';

    throw new Error(
      `switchRole: the role switcher offers no option for "${target.id}" (${target.role}) within ${OPTION_TIMEOUT_MS} ms, so selecting it would set nothing. It renders ${describeOptions(rendered)}.${explanation}`,
      { cause },
    );
  }
}

/**
 * Refuses to act on a switcher that is disabled, quoting the explanation it gives (rule P-8).
 *
 * Both ways of being disabled are checked: the native `disabled` attribute, and the `aria-disabled`
 * state the control actually uses so that it stays in the tab order and its explanation stays
 * reachable by keyboard.
 *
 * @param page The Playwright page showing the application.
 * @param select The switcher's combobox.
 * @throws Error quoting the control's own explanation when it cannot act.
 */
async function assertSwitcherCanAct(page: Page, select: Locator): Promise<void> {
  const ariaDisabled = await select.getAttribute('aria-disabled');
  const nativelyDisabled = await select.isDisabled();

  if (!nativelyDisabled && ariaDisabled !== 'true') {
    return;
  }

  throw new Error(
    `switchRole: the role switcher cannot act, so no persona can be selected. Rule P-8 requires a disabled control to explain itself, so this reports that explanation rather than waiting for a selection that cannot land. It gives: ${await readDisabledReason(page, select)}`,
  );
}

/**
 * The refusal the switcher is displaying, or `''` when it displays none.
 *
 * A switch the adapter rejects renders the rejection in an alert region inside the switcher's own
 * group, so reading that region is what turns "the route did not change" into a message carrying the
 * reason the service gave.
 *
 * @param select The switcher's combobox.
 * @returns The refusal's text, or an empty string.
 */
async function readRefusal(select: Locator): Promise<string> {
  const alert = select.locator('xpath=..').getByRole('alert');

  if ((await alert.count()) === 0) {
    return '';
  }

  return collapseWhitespace((await alert.first().textContent()) ?? '');
}

/**
 * Waits for the switcher to report that no switch is in flight, so the value it holds is settled.
 *
 * The control shows the persona the reader chose while that choice is being recorded, and reports
 * the recording through `aria-busy`. Reading the value without waiting for that state to clear
 * would therefore accept a selection the adapter has not answered yet — and a switch that is later
 * refused reverts to the persona the adapter still enforces. Waiting for the control to report
 * itself idle is what makes the reconciliation in `switchRole` read an answer rather than an
 * intention. A control that reports no busy state carries nothing to wait for, so the route wait is
 * then the only settle point and this returns.
 *
 * @param page The Playwright page showing the application.
 * @param select The switcher's combobox.
 * @throws Error when the control still reports a switch in flight at the ceiling, quoting the
 *   refusal it is displaying.
 */
async function waitForSwitcherIdle(page: Page, select: Locator): Promise<void> {
  const busy = await select.getAttribute('aria-busy');

  if (busy === null) {
    return;
  }

  const idle = select.and(page.locator('[aria-busy="false"]'));

  try {
    await idle.waitFor({ state: 'attached', timeout: ROUTE_TIMEOUT_MS });
  } catch (cause) {
    const refusal = await readRefusal(select);
    const stated = refusal === '' ? '' : ` The switcher states: ${JSON.stringify(refusal)}`;

    throw new Error(
      `switchRole: the role switcher still reports a switch in flight after ${ROUTE_TIMEOUT_MS} ms, so the persona it holds has not been confirmed by the adapter.${stated}`,
      { cause },
    );
  }
}

/**
 * The path the document is showing, without its origin, port or query.
 *
 * @param page The Playwright page showing the application.
 * @returns The current pathname, such as `/canvas`.
 */
function pathOf(page: Page): string {
  return new URL(page.url()).pathname;
}

/**
 * Trims the trailing slashes a path may carry, so `/canvas/` and `/canvas` compare equal.
 *
 * @param path A path read from the document.
 * @returns The path without a trailing slash.
 */
function normalisePath(path: string): string {
  return path.replace(/\/+$/, '');
}

/**
 * Waits for the application to land on the persona's entry route, or reports where it stands.
 *
 * The navigation is the application's own — the shell sends the router to the route AAP 0.12.4 fixes
 * for the role the adapter now enforces — so the wait is for that navigation rather than for a
 * timer or for a page load. A persona the document has already reached resolves immediately, which
 * is the idempotent case; a switch the adapter rejected is caught by the reconciliation in
 * `switchRole`, because several personas share an entry route and an unchanged path alone would not
 * show it.
 *
 * @param page The Playwright page showing the application.
 * @param select The switcher's combobox, read for a refusal when the route does not arrive.
 * @param target The persona the caller asked for.
 * @throws Error naming the route expected, the path observed and the refusal shown on screen.
 */
async function waitForEntryRoute(page: Page, select: Locator, target: Persona): Promise<void> {
  try {
    await page.waitForURL((url) => normalisePath(url.pathname) === target.entryRoute, {
      timeout: ROUTE_TIMEOUT_MS,
    });
  } catch (cause) {
    const refusal = await readRefusal(select);
    const stated = refusal === '' ? '' : ` The switcher states: ${JSON.stringify(refusal)}`;

    throw new Error(
      `switchRole: selected "${target.id}" (${target.role}), whose entry route is "${target.entryRoute}", but the page did not reach that path within ${ROUTE_TIMEOUT_MS} ms; it is at "${pathOf(page)}".${stated}`,
      { cause },
    );
  }
}

/**
 * Switches the demonstration role switcher to a seeded persona and waits for its entry route.
 *
 * This is the persona lever of the browser suite, and it is a reader's lever: it selects an option
 * on the control `src/app/role-switcher.tsx` renders and then waits for the navigation that control
 * performs itself. The document is never loaded again — the in-browser adapter keeps its state in
 * memory, so a load would restore the seed and lose what the spec arranged — and no lever of the
 * suite's own is used, because the build ships none (AAP 0.7, 0.9).
 *
 * The switch changes which persona the adapter acts as and grants nothing: every read and write
 * after it is authorised by that adapter against the persona it now enforces, so bypassing the
 * control changes nothing about what the service answers (rule P-3).
 *
 * A persona the switcher already holds is left alone and the call returns: the control dispatches a
 * change only for another persona, so there is nothing to select and no navigation to await, which
 * is what makes a second call in the same spec a no-op rather than a wait for a change that will
 * never come. The route is then wherever the spec left the application, because a persona lever
 * cannot make the application re-enter a route it is not being sent to.
 *
 * A switch that was made is confirmed twice, because the landing route alone does not prove it:
 * several personas share an entry route, so the document can already be where the chosen persona
 * belongs while the adapter is still answering. The call therefore waits for the control to report
 * itself idle and then reads back the persona it holds, which is what catches a selection the
 * adapter refused and the control reverted.
 *
 * @param page The Playwright page showing the application.
 * @param persona One of the eight persona identifiers from `PERSONAS`.
 * @returns Nothing; the call resolves once the switcher holds the persona, and — for a switch it
 *   made — once the document has reached that persona's entry route.
 * @throws Error when the identifier is not one of the eight, when the switcher cannot be found,
 *   when it offers no such option or cannot act (quoting its explanation), when the entry route does
 *   not arrive, or when the switcher no longer holds the persona once the route has settled.
 */
export async function switchRole(page: Page, persona: UserId): Promise<void> {
  const target = personaFor(persona, 'switchRole');
  const select = await resolveSwitcher(page, 'switchRole');

  await waitForPersonaOption(page, select, target);

  const held = await select.inputValue();
  if (held === target.id) {
    return;
  }

  await assertSwitcherCanAct(page, select);

  await select.selectOption(target.id);
  await waitForSwitcherIdle(page, select);
  await waitForEntryRoute(page, select, target);

  const settled = await select.inputValue();
  if (settled === target.id) {
    return;
  }

  const refusal = await readRefusal(select);
  const stated = refusal === '' ? '' : ` The switcher states: ${JSON.stringify(refusal)}`;

  throw new Error(
    `switchRole: selected "${target.id}" (${target.role}) but the switcher now holds "${settled}", so the switch did not take effect and the demonstration still acts as the persona it held.${stated}`,
  );
}
