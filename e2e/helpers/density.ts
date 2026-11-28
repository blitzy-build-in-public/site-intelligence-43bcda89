/**
 * Row-density lever of the browser suite: leaves the application in the requested density by
 * pressing the switch `src/theme/density-switch.tsx` renders, and returns only once `<html>` carries
 * that value in its `data-density` attribute.
 *
 * `data-density` is the contract asserted here. `src/theme/theme-provider.tsx` owns the attribute,
 * writes it together with the persisted preference (theme and density are the only two values the
 * application stores, contracts §1) and applies it at module initialisation, before any component
 * renders, while `src/theme/tokens.css` derives `--row-height` from it: the attribute is what
 * selects rows 32 px tall or rows 44 px tall in every table of the application. A frame painted
 * before that module executes carries the compact row instead, because `tokens.css` declares
 * `--row-height` on `:root` as the document default and that default is the density the seeded persona
 * starts on (AAP §0.12.4), so a session left on the seeded persona reflows no row at all. The helper
 * stops at the attribute and measures nothing itself: the stylesheet owns the pixel value, so what the
 * attribute renders is the calling test's assertion, not a second restatement of it here.
 *
 * The switch's accessible name is `Switch row density: <the density it offers>`, which the component
 * fixes. The prefix is restated in this module rather than read from the provider's label table:
 * that name is a user-facing contract, so locating the control by role and accessible name (rule
 * B-3) is what proves it, and a renamed label has to break this helper rather than be followed
 * without notice.
 *
 * Serves the density test at the end of `e2e/s1-labelling-and-states.spec.ts`: that test presses the
 * switch through both values and, being the caller, measures a table row before and after each press to
 * prove the height follows the attribute. Nothing else imports this module.
 */
import type { Locator, Page } from '@playwright/test';

import type { Density } from '../../src/types';

/**
 * The leading words of the density switch's accessible name, owned by
 * `src/theme/density-switch.tsx`. Every lookup in this module is anchored on it, so a button that
 * merely mentions row density does not match.
 */
const DENSITY_CONTROL_NAME_PREFIX = 'Switch row density:';

/** The values the `Density` union admits, in the order `src/types/primitives.ts` declares them. */
const DENSITIES: readonly string[] = ['compact', 'comfortable'];

/**
 * How long the switch is given to render, and the application to apply the choice, before the helper
 * reports what it observed.
 *
 * Both waits are bounded rather than left on the suite default, because a wait that outlives the
 * caller's test budget is torn down by the harness and reported as a timeout, which hides the two
 * values a reader needs. The bound is far above what the application takes — the shell renders
 * within the mock backend's bootstrap and the provider writes the attribute in the click's own
 * handler — so reaching it means the control is absent or the choice was not applied.
 */
const DENSITY_SETTLE_TIMEOUT_MS = 5_000;

/**
 * Whether a value arriving from outside TypeScript is one of the two densities.
 *
 * The union is a compile-time guarantee, and this check still earns its place: a spec that reaches
 * this helper through a cast, or a value read from somewhere other than a literal, would otherwise
 * become a silent locator miss reported as a missing control rather than as a bad argument.
 */
function isDensity(value: string): boolean {
  return DENSITIES.includes(value);
}

/** Every control whose accessible name begins with the density prefix, whichever density it offers. */
function densityControls(page: Page): Locator {
  return page.getByRole('button', { name: new RegExp(`^${DENSITY_CONTROL_NAME_PREFIX}`, 'i') });
}

/**
 * The accessible name of the switch that offers `density`, anchored at both ends so the pattern
 * cannot match a longer name. Case-insensitive because the component capitalises the label word
 * while the union carries the lower-case token.
 */
function nameOfDensityControl(density: Density): RegExp {
  return new RegExp(`^${DENSITY_CONTROL_NAME_PREFIX}\\s*${density}$`, 'i');
}

/** The attribute value `<html>` carries, or `null` while the application has set none. */
async function currentDensity(page: Page): Promise<string | null> {
  return page.locator('html').getAttribute('data-density');
}

/**
 * Every density control the page renders, named by the label a screen reader would announce, so an
 * error can report what was on screen instead of only what was expected.
 *
 * The name may come from `aria-label` or from the button's own text, so both are read and the label
 * wins where both exist.
 */
async function describeDensityControls(page: Page): Promise<string> {
  const controls = densityControls(page);
  const rendered: string[] = [];
  const total = await controls.count();

  for (let index = 0; index < total; index += 1) {
    const control = controls.nth(index);
    const label = (await control.getAttribute('aria-label'))?.trim() ?? '';
    const text = ((await control.textContent()) ?? '').trim();
    const name = label !== '' ? label : text;
    rendered.push(name === '' ? 'a button with no accessible name' : `"${name}"`);
  }

  if (rendered.length === 0) {
    return `No button on the page has an accessible name beginning "${DENSITY_CONTROL_NAME_PREFIX}".`;
  }
  return `Rendered density controls: ${rendered.join(', ')}.`;
}

/**
 * Why a disabled density switch says it cannot act, quoted for the error that reports it.
 *
 * Rule P-8 makes the explanation part of the contract of a disabled control, so the reason is read
 * from the element its `aria-describedby` points at and then from its `title`, and a control that
 * carries neither is reported as exactly that defect rather than passed over in silence.
 */
async function readDisabledReason(page: Page, control: Locator): Promise<string> {
  const describedBy = (await control.getAttribute('aria-describedby'))?.trim() ?? '';
  if (describedBy !== '') {
    const described: string[] = [];
    for (const id of describedBy.split(/\s+/)) {
      const text = ((await page.locator(`[id="${id}"]`).textContent()) ?? '').trim();
      if (text !== '') {
        described.push(text);
      }
    }
    if (described.length > 0) {
      return `It explains itself: "${described.join(' ')}".`;
    }
  }

  const title = (await control.getAttribute('title'))?.trim() ?? '';
  if (title !== '') {
    return `It explains itself: "${title}".`;
  }

  return (
    'It explains nothing: no aria-describedby target carries text and it has no title, ' +
    'which rule P-8 does not allow.'
  );
}

/**
 * Puts the page into the requested row density and confirms the application applied it.
 *
 * The control is located by role and accessible name — the route a keyboard user takes to it — and
 * never by a class, a position or an XPath (rule B-3). Every failure throws an `Error` naming the
 * requested density, the pattern the control had to match and what the page actually rendered, so a
 * mismatch is diagnosable from the test output alone.
 *
 * Idempotent by necessity rather than by convenience: the switch offers the density that is not in
 * effect, and the density a session starts on follows the active persona (AAP 0.12.4), so a caller
 * asking for the density already in effect finds no control to press and must not fail for that.
 *
 * @param page The page under test, already on an application route.
 * @param density The density to leave the page in: `compact` or `comfortable`.
 * @returns A promise settled once `<html data-density>` carries the requested value.
 * @throws An `Error` naming the received argument when it is outside the union, the rendered control
 *   names when no single switch offers the requested density, the quoted explanation when the
 *   control is disabled, or the expected and the observed attribute value when the application does
 *   not apply the choice.
 */
export async function setDensity(page: Page, density: Density): Promise<void> {
  if (!isDensity(density)) {
    const allowed = DENSITIES.map((value) => `"${value}"`).join(' and ');
    throw new Error(
      `setDensity cannot set "${String(density)}": the only densities are ${allowed}.`,
    );
  }

  const controlName = nameOfDensityControl(density);

  if ((await currentDensity(page)) === density) {
    return;
  }

  /*
   * The shell waits for the mock backend's bootstrap before it renders, so the switch can be absent
   * for a moment after a load. Waiting for the control to appear is a web-first wait on the same
   * locator the click uses; a switch that never appears is reported with what the page did render.
   */
  try {
    await densityControls(page).first().waitFor({
      state: 'visible',
      timeout: DENSITY_SETTLE_TIMEOUT_MS,
    });
  } catch (error) {
    throw new Error(
      `setDensity cannot set "${density}": no density switch is rendered. ` +
        `Expected one button whose accessible name matches ${String(controlName)}. ` +
        (await describeDensityControls(page)),
      { cause: error },
    );
  }

  const control = page.getByRole('button', { name: controlName });
  const matches = await control.count();
  if (matches !== 1) {
    throw new Error(
      `setDensity cannot set "${density}": ${matches} buttons match the accessible name ` +
        `${String(controlName)}, and exactly one is required. ` +
        (await describeDensityControls(page)),
    );
  }

  if ((await control.isDisabled()) || (await control.getAttribute('aria-disabled')) === 'true') {
    throw new Error(
      `setDensity cannot set "${density}": the control matching ${String(controlName)} is ` +
        `disabled. ${await readDisabledReason(page, control)}`,
    );
  }

  await control.click();

  /*
   * The application's own settled state, not an elapsed interval: the provider writes the attribute
   * in the same call that stores the choice, so the wait ends on the frame the attribute changes.
   */
  try {
    await page
      .locator(`html[data-density="${density}"]`)
      .waitFor({ state: 'attached', timeout: DENSITY_SETTLE_TIMEOUT_MS });
  } catch (error) {
    const observed = await currentDensity(page);
    throw new Error(
      `setDensity pressed the control matching ${String(controlName)} but <html> reads ` +
        `data-density=${JSON.stringify(observed)} instead of "${density}".`,
      { cause: error },
    );
  }
}
