/**
 * The Command/Paper theme lever the browser suites drive before a spec asserts what the theme
 * changes.
 *
 * `setTheme` activates the control rendered by `src/theme/theme-switch.tsx` and then waits for the
 * application itself to settle `<html data-theme="…">` — the attribute `src/theme/theme-provider.tsx`
 * applies at module initialisation and the one `src/theme/command.css` and `src/theme/paper.css`
 * select on. Command is the default theme, so a suite that never switches would assert twice against
 * Command; the confirmation inside `setTheme` is what makes a both-theme loop mean two themes.
 *
 * It serves T-16 (`e2e/s1-keyboard-and-axe.spec.ts`), whose axe pass runs on every route in Command
 * and Paper, and T-20 (`e2e/network-origin.spec.ts`), which visits every route in both themes while
 * watching for a foreign origin. `e2e/s1-labelling-and-states.spec.ts`, `e2e/s2-canvas.spec.ts` and
 * `e2e/s3-atlas.spec.ts` reach for it wherever the theme changes what is drawn.
 *
 * Rules served: B-3 (the control is reached the way a keyboard user reaches it — by role and
 * accessible name, never by a class or a position — and the confirmation is what gives a both-themes
 * axe pass its meaning), B-1 (this module issues no request and names no host or origin, so T-20's
 * watch sees no request from it), B-2 (it reads no environment value, secret, token or cookie and
 * writes no storage), P-1 (it hides, clips and filters nothing, so the "Simulated data" badge stays
 * visible across a theme change), P-6 (it states and imports no figure, amount, date or record
 * identifier — "command" and "paper" are the theme tokens the type vocabulary fixes, not data), P-7
 * (the product's own vocabulary only) and P-8 (a disabled control's explanation is surfaced rather
 * than lost to a click timeout).
 */
import type { Locator, Page } from '@playwright/test';

import type { ThemeName } from '../../src/types';

/**
 * The accessible-name prefix `src/theme/theme-switch.tsx` puts in front of the theme it offers.
 *
 * The literal is repeated here rather than imported: this module runs in the Playwright process, and
 * importing the component would pull React and the theme context into it. Rule B-3 makes the
 * accessible name the contract, so the helper asserts the contract — anchored and case-insensitive,
 * as `^Switch colour theme:\s*paper$`, so a control added later cannot match loosely. The prefix
 * holds no regular-expression metacharacter; if it gains one, the enumeration below reports the
 * pattern it tried beside the names the page actually rendered.
 */
const THEME_SWITCH_NAME_PREFIX = 'Switch colour theme:';

/**
 * How long a theme change is given to reach `<html>`. The change is one synchronous attribute write,
 * so this bounds a wait that should settle on the next frame: a ceiling on a web-first wait, never a
 * sleep, and the reason a stuck switch fails with the value it did reach instead of only when the
 * whole test times out.
 */
const THEME_SETTLE_TIMEOUT_MS = 10_000;

/** Whether a received string is one of the two theme tokens of `src/types/primitives.ts`. */
function isThemeName(value: string): value is ThemeName {
  return value === 'command' || value === 'paper';
}

/** Collapses runs of whitespace so a rendered name or reason fits one line of a failure message. */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The text an element renders, or `''` when the locator matches nothing or holds no text. */
async function textOf(locator: Locator): Promise<string> {
  if ((await locator.count()) === 0) {
    return '';
  }
  const text = await locator.first().textContent();
  return text === null ? '' : collapseWhitespace(text);
}

/**
 * Every name the page's buttons render, taken from `aria-label` and from text content because the
 * accessible name may come from either. Read only to explain a lookup that already failed.
 */
async function renderedButtonNames(page: Page): Promise<string[]> {
  const buttons = page.getByRole('button');
  const count = await buttons.count();
  const names: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const label = collapseWhitespace((await button.getAttribute('aria-label')) ?? '');
    const text = await textOf(button);
    for (const name of [label, text]) {
      if (name !== '' && !names.includes(name)) {
        names.push(name);
      }
    }
  }
  return names;
}

/**
 * The rendered names that begin with the theme switch's prefix, phrased as a clause for a failure
 * message — or a statement that the page renders none, which is the case that usually means the
 * shell never mounted.
 */
async function describeSwitchCandidates(page: Page): Promise<string> {
  const prefix = THEME_SWITCH_NAME_PREFIX.toLowerCase();
  const names = await renderedButtonNames(page);
  const candidates = names.filter((name) => name.toLowerCase().startsWith(prefix));
  if (candidates.length === 0) {
    return `No button on the page renders a name beginning with "${THEME_SWITCH_NAME_PREFIX}" (${names.length} button(s) found).`;
  }
  return `Buttons beginning with "${THEME_SWITCH_NAME_PREFIX}": ${candidates
    .map((name) => `"${name}"`)
    .join(', ')}.`;
}

/**
 * The explanation a disabled control gives for itself (rule P-8). It is read from the target of
 * `aria-describedby` first, because that is the mechanism `src/components/tooltip.tsx` uses and it
 * keeps the sentence mounted and linked whatever the hint's visibility; then from `title`; then from
 * the text around the control. Traversing to the parent is a diagnostic read only — the control
 * itself is never located that way.
 */
async function readDisabledReason(page: Page, control: Locator): Promise<string> {
  const describedBy = collapseWhitespace((await control.getAttribute('aria-describedby')) ?? '');
  const descriptions: string[] = [];
  for (const id of describedBy === '' ? [] : describedBy.split(' ')) {
    const description = await textOf(page.locator(`[id="${id}"]`));
    if (description !== '') {
      descriptions.push(description);
    }
  }
  if (descriptions.length > 0) {
    return descriptions.join(' ');
  }
  const title = collapseWhitespace((await control.getAttribute('title')) ?? '');
  if (title !== '') {
    return title;
  }
  const surrounding = await textOf(control.locator('xpath=..'));
  if (surrounding !== '') {
    return surrounding;
  }
  return 'the control renders no explanation, which is itself the rule P-8 breach';
}

/**
 * Puts the application into `theme` and proves it arrived, serving T-16 and T-20.
 *
 * The theme is a client-side preference, so this never loads a page: a reload would re-seed the mock
 * backend's in-memory state and lose whatever the spec had set up. It also never writes storage, since
 * `src/theme/theme-provider.tsx` persists the choice itself.
 *
 * A page already in the requested theme returns immediately, because the switch's button is named
 * after the theme it would move to and therefore offers no such button to activate.
 *
 * @param page The Playwright page showing the application.
 * @param theme The theme to reach: `command` or `paper`.
 * @throws If `theme` is not a theme token, if no single theme switch offers it, if that control is
 * disabled (quoting the explanation rule P-8 requires), or if `<html data-theme>` does not reach the
 * requested value — each message naming the control, the attribute value it was asked for and the
 * value observed.
 */
export async function setTheme(page: Page, theme: ThemeName): Promise<void> {
  /*
   * A spec that walks a table or a loop can reach this function with a value the union never saw, and
   * the failure that would follow is a wait against a button that cannot exist. Widening to `string`
   * for the check keeps the guard meaningful to the compiler as well as at run time.
   */
  const requested: string = theme;
  if (!isThemeName(requested)) {
    throw new Error(
      `setTheme: unsupported theme ${JSON.stringify(requested)}. The switch has two positions, "command" and "paper" (ThemeName in src/types/primitives.ts).`,
    );
  }

  const root = page.locator('html');
  const current = await root.getAttribute('data-theme');

  if (current === requested) {
    return;
  }

  const targetName = new RegExp(`^${THEME_SWITCH_NAME_PREFIX}\\s*${requested}$`, 'i');
  const control = page.getByRole('button', { name: targetName });
  const matches = await control.count();

  if (matches === 0) {
    throw new Error(
      `setTheme: no button whose accessible name matches ${targetName.source} while <html> carries data-theme="${current ?? '(absent)'}", so the page cannot reach "${requested}". ${await describeSwitchCandidates(page)}`,
    );
  }
  if (matches > 1) {
    throw new Error(
      `setTheme: ${matches} buttons match ${targetName.source}; the top bar renders one theme switch, so activating one of them would not prove which control the reader reaches.`,
    );
  }

  const ariaDisabled = await control.getAttribute('aria-disabled');
  if ((await control.isDisabled()) || ariaDisabled === 'true') {
    throw new Error(
      `setTheme: the control offering "${requested}" is disabled. Rule P-8 requires a disabled control to explain itself, so the helper reports that explanation instead of waiting for a click that cannot land. It gives: ${await readDisabledReason(page, control)}`,
    );
  }

  await control.click();

  try {
    await page
      .locator(`html[data-theme="${requested}"]`)
      .waitFor({ state: 'attached', timeout: THEME_SETTLE_TIMEOUT_MS });
  } catch (cause) {
    const observed = await root
      .getAttribute('data-theme')
      .catch(() => '(unreadable: the page closed while waiting)');
    throw new Error(
      `setTheme: activated the control offering "${requested}", but <html> did not reach data-theme="${requested}" within ${THEME_SETTLE_TIMEOUT_MS} ms; it carries data-theme="${observed ?? '(absent)'}".`,
      { cause },
    );
  }
}
