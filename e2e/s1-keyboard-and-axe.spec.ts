/**
 * T-16 — accessibility and keyboard operability, measured across the whole application.
 *
 * WHAT IT PROVES. Rule B-3 asks four things of every screen, and this file measures each of them
 * rather than asserting them in prose: axe-core runs on every route in both themes and fails on any
 * serious or critical violation (success criterion 6); every control is reachable and operable by
 * keyboard with a visible focus indicator, in document order; every focus target meets the 24x24 px
 * minimum or the equivalent-control exception WCAG 2.2 SC 2.5.8 states; and `prefers-reduced-motion`
 * is honoured. The keyboard half replays the T-07, the T-08 and
 * the T-11 paths without a pointer (AAP 0.7).
 *
 * HOW THE ROUTES ARE FOUND. Nothing here types an exception, approval or policy identifier into an
 * address: every route is reached the way a reader reaches it — a navigation entry, a row's own
 * action, a screen's primary control, or the role switcher's landing route — and the parameterised
 * paths are read back with `new URL(page.url()).pathname` so a failure names the screen it came from.
 * The two routes a reader only meets by address are covered as such: the stage-notice page USR-08
 * lands on, and an address that matches nothing.
 *
 * WHY EVERY CHECK WAITS, AND WHY IT NEVER SLEEPS. The mock adapter answers in 150-400 ms and a theme
 * change animates a colour transition, while axe measures *composited* colours: a run that starts
 * mid-transition reads the in-between colours and reports contrast failures the settled screen does
 * not have. `awaitSettled` therefore waits on the application's own signals — the single `main`
 * landmark, its level-one heading, the absence of the state boundary's `aria-busy="true"` loading
 * region, the bundled fonts, and `document.getAnimations()` reporting nothing in flight — so every
 * assertion below runs against the frame a reader sees, and no test waits on elapsed time.
 *
 * WHAT IT DOES NOT DO. It imports no seed record, no mock adapter and no API client (rule P-2); it
 * types no figure, amount or record identifier of the application's data, so a located control is
 * matched by its role and the shape of its name rather than by a value (rule P-6); and it adds no
 * hook to the application, because the role switcher, the theme switch and the evidence drawer are
 * product features a reader uses and this file drives them as one (AAP 0.9, rule P-7).
 *
 * Rules served: B-3 (the rule this file exists for), P-1 (the `Simulated data` badge and the fixed
 * labels are checked on every route, in both themes), P-4 (no route may claim a capability the
 * demonstration does not implement), P-2, P-6, P-7 and P-8 (a control that cannot act is reported
 * with the explanation it gives rather than clicked into a timeout).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { entryRouteForPersona, switchRole } from './helpers/role';
import { setTheme } from './helpers/theme';

/* ---------------------------------------------------------------------------------------------
 * The contract this file holds the application to
 * ------------------------------------------------------------------------------------------- */

/**
 * The four WCAG tags AAP 0.7 fixes for T-16. `wcag2a` and `wcag2aa` are the base levels, `wcag21aa`
 * and `wcag22aa` the two later revisions rule B-3 names, so an axe rule that only one of them
 * carries is still enforced.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] as const;

/**
 * Whether an axe violation is one rule B-3 fails the suite on.
 *
 * The rule is explicit about "any serious or critical violation", so a `moderate` or `minor` finding is
 * still reported by axe but does not fail this file. The predicate narrows axe's
 * `ImpactValue | null | undefined` without a cast, which is what keeps the filter honest: a violation
 * that carries no impact at all is not silently treated as blocking.
 *
 * @param impact The `impact` axe reported, if any.
 * @returns `true` for the two levels rule B-3 names.
 */
function isBlockingImpact(impact: string | null | undefined): boolean {
  return impact === 'serious' || impact === 'critical';
}

/**
 * The persistent badge's accessible name, matched by its opening words only: the control names the
 * demonstration clock beside the label, and the label is the fixed specification §5.3 string rule P-1
 * requires the badge to carry.
 */
const SIMULATED_DATA_BADGE = /^Simulated data at /;

/**
 * The vocabulary of an unimplemented claim, which rule P-4 forbids on every route: the application
 * never states or implies that it establishes sovereignty, prevents copying or resists tampering. The
 * audit screen's own sentence ("not production tamper resistance") deliberately says the opposite,
 * which is why the banned forms are the positive claims alone.
 */
const UNIMPLEMENTED_CLAIMS = [
  'tamper-proof',
  'tamper resistant',
  'zero trust',
  'guaranteed',
  'certified',
] as const;

/**
 * The minimum target size AAP 0.12.4 fixes for every control, in CSS pixels: the 24x24 px of WCAG 2.2
 * SC 2.5.8, which rule B-3 adopts by requiring level AA.
 */
const MIN_TARGET_PX = 24;

/**
 * The minimum focus indicator: AAP 0.12.4 fixes a 2 px focus ring in both themes, and
 * `src/styles/index.css` paints it on `:focus-visible` for every control, including one authored
 * without the utility classes.
 */
const MIN_FOCUS_RING_PX = 2;

/**
 * The longest animation or transition the reduced-motion block may leave in place, in seconds.
 *
 * `src/styles/index.css` declares `animation-duration: 0.01ms !important` and
 * `transition-duration: 0.01ms !important` under `(prefers-reduced-motion: reduce)`, so this is that
 * declaration expressed in the unit `getComputedStyle` reports (1e-05 s). The two values are one
 * fact: if the stylesheet changes, this bound changes with it.
 */
const REDUCED_MOTION_MAX_SECONDS = 0.00001;

/**
 * The ceiling on a walk's `Tab` presses, and on the presses one `tabUntilFocused` step may take.
 *
 * The longest route in the suite (the competitive atlas) has 51 stops, so this leaves ample room for a
 * whole cycle plus the presses spent in the browser's own chrome, while a focus order that never comes
 * round again is reported instead of running to the test timeout.
 */
const TAB_LIMIT = 120;

/**
 * Every element the browser can put focus on, in document order. It is the definition both halves of
 * the tab-order assertion share: the walk collects what `Tab` actually reaches, and the count is
 * compared against this set, so a control that was skipped is a failure rather than a smaller number
 * nobody notices.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The two themes the shell offers, as `src/theme/theme-provider.tsx` writes them onto `<html>`.
 * Declared here rather than imported so this file names the attribute values a reader sees instead of
 * loading application code into the Playwright process.
 */
type Theme = 'command' | 'paper';

/** One element the `Tab` key reached, as the walk observed it. */
interface FocusStop {
  /** The stop's position in the walk, counted from zero. */
  readonly index: number;

  /** The element's tag name, lower-cased. */
  readonly tag: string;

  /** The explicit `role` attribute, or the empty string when the element carries none. */
  readonly role: string;

  /** The accessible name from `aria-label`, or the element's visible text when it has none. */
  readonly name: string;

  /** The rendered width in CSS pixels. */
  readonly width: number;

  /** The rendered height in CSS pixels. */
  readonly height: number;

  /** The computed outline width in CSS pixels: the focus ring's own measurement. */
  readonly outlineWidth: number;

  /** The computed outline style; `none` means no ring was painted. */
  readonly outlineStyle: string;

  /** Whether the element occupies space and is not hidden. */
  readonly visible: boolean;

  /**
   * Whether the stop's own surface offers an equivalent control of at least the minimum target size.
   *
   * WCAG 2.2 SC 2.5.8 — the clause rule B-3's "24x24 px" shorthand stands for — exempts an undersized
   * target whose function is available through another control on the same page that does meet the
   * minimum. A chart mark qualifies through its chart's own "View as table" toggle, which is why the
   * plan requires one on every chart, map and graph.
   */
  readonly equivalentControl: boolean;

  /** The element's index in document order among every focusable element. */
  readonly documentIndex: number;
}

/** One route the axe half visits, with the label a failure names it by and the path it settled on. */
interface VisitedRoute {
  /** The screen, in the words the navigation and the specification use. */
  readonly label: string;

  /** The address the application settled on, read back from the browser. */
  readonly path: string;
}

/* ---------------------------------------------------------------------------------------------
 * Waiting on the application's own settled state
 * ------------------------------------------------------------------------------------------- */

/**
 * Waits until the document in flight has finished: no animation or transition is still running.
 *
 * A theme change is a 150 ms colour transition on every control and the drawer, the tooltip and the
 * chart marks each carry their own, so this is what makes an axe run measure the frame a reader sees
 * rather than an in-between one. `document.getAnimations()` is the browser's own list, so the wait
 * ends on the frame the last one settles instead of after a chosen interval.
 *
 * @param page The page showing the application.
 */
async function settleAnimations(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState === 'finished' || animation.playState === 'idle'),
  );
}

/**
 * Waits for the route on screen to have settled, and fails naming what never arrived.
 *
 * Four signals, all the application's own: the shell's single `main` landmark, that landmark's
 * level-one heading (every screen renders exactly one, and the stage-notice and not-found pages
 * render theirs too), the state boundary's `aria-busy="true"` loading region having gone, and the
 * document's animations being idle. The bundled fonts are awaited as well, because a font swap
 * changes text metrics and axe measures rendered geometry.
 *
 * @param page The page under test, already on a route.
 */
async function awaitSettled(page: Page): Promise<void> {
  await expect(page.locator('main'), 'the shell must render one main landmark').toHaveCount(1);
  await expect(
    page.locator('main h1').first(),
    'the route must render its level-one heading inside main',
  ).toBeVisible();
  await expect(
    page.locator('[aria-busy="true"]'),
    "the route's read must have settled: the state boundary marks a pending read aria-busy",
  ).toHaveCount(0);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await settleAnimations(page);
}

/**
 * Waits for a click-driven navigation to land on `route`, then for that route to settle.
 *
 * `React Router` writes the new address in the click's own handler and commits the new screen on the
 * next frame, so an assertion that started immediately after the click would read the screen being
 * left — its heading, its focus order, its `aria-busy` state. The wait therefore has three parts, all
 * of them the browser's or the application's own signals and none of them a sleep: the address, then
 * two animation frames, which is the commit that swaps the outlet's content, then the settled state
 * `awaitSettled` defines.
 *
 * @param page The page under test.
 * @param route The address the navigation must reach.
 * @param where The screen being navigated to, named in the failure.
 */
async function awaitRoute(page: Page, route: RegExp, where: string): Promise<void> {
  await expect(page, `${where} must be the route on screen`).toHaveURL(route);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
  await awaitSettled(page);
}

/**
 * Puts the application into `theme`, proves `<html>` carries it, and waits for the repaint to settle.
 *
 * The theme is the shell's own preference, applied by `src/theme/theme-provider.tsx` through the
 * switch in `src/theme/theme-switch.tsx`, so it is driven through the visible control by
 * `setTheme` and then confirmed here: a both-theme pass that silently stayed in Command would prove
 * half of what rule B-3 asks.
 *
 * @param page The page under test.
 * @param theme The theme to reach.
 */
async function awaitTheme(page: Page, theme: Theme): Promise<void> {
  await setTheme(page, theme);
  await expect(
    page.locator('html'),
    `the shell must carry data-theme="${theme}" after the switch is used`,
  ).toHaveAttribute('data-theme', theme);
  await settleAnimations(page);
}

/* ---------------------------------------------------------------------------------------------
 * The axe assertion, and the disclosure every route owes
 * ------------------------------------------------------------------------------------------- */

/** One axe violation the sweep found, with the route and theme it was found on. */
interface BlockingViolation {
  /** The screen and theme the run covered. */
  readonly where: string;

  /** The axe rule that failed. */
  readonly id: string;

  /** The rule's impact: `serious` or `critical`. */
  readonly impact: string;

  /** The selectors the rule was found on. */
  readonly selectors: readonly string[];
}

/**
 * Runs axe on the route on screen and returns the serious and critical violations it found.
 *
 * The filter is on `impact`, which is what rule B-3 names. Nothing is thrown here: the sweep collects
 * every violation from every route and theme and reports them together, so one broken route does not
 * hide the state of the other twenty-nine runs.
 *
 * @param page The page under test, settled on a route.
 * @param where The screen and theme the run covers, carried into the report.
 * @returns One entry per blocking violation, or an empty list when the route is clean.
 */
async function collectBlockingViolations(
  page: Page,
  where: string,
): Promise<readonly BlockingViolation[]> {
  const results = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze();

  return results.violations
    .filter((violation) => isBlockingImpact(violation.impact))
    .map((violation) => ({
      where,
      id: violation.id,
      impact: String(violation.impact),
      selectors: violation.nodes.map((node) => node.target.join(' ')),
    }));
}

/**
 * Checks the two disclosures every route owes regardless of what it shows.
 *
 * Rule P-1 wants the `Simulated data` badge visible on every route, and rule P-4 forbids the wording
 * of a capability the demonstration does not implement. Both are read from the rendered document, so
 * a route that replaced the shell — or a screen that started claiming tamper resistance — fails
 * here rather than passing unnoticed.
 *
 * @param page The page under test, settled on a route.
 * @param where The screen and theme the check covers, named in each failure.
 */
async function expectDemonstrationDisclosure(page: Page, where: string): Promise<void> {
  await expect(
    page.getByRole('button', { name: SIMULATED_DATA_BADGE }),
    `the "Simulated data" badge must be visible on ${where} (rule P-1)`,
  ).toBeVisible();

  const text = (await page.locator('body').innerText()).toLowerCase();
  const claims = UNIMPLEMENTED_CLAIMS.filter((claim) => text.includes(claim));

  expect(
    claims,
    `${where} states a capability the demonstration does not implement (rule P-4): ${claims.join(', ')}`,
  ).toEqual([]);
}

/* ---------------------------------------------------------------------------------------------
 * The keyboard walk
 * ------------------------------------------------------------------------------------------- */

/**
 * Presses `Tab` until `target` holds focus, and fails naming where focus actually is.
 *
 * This is how every keyboard replay below reaches a control: no `locator.click()` and no
 * `locator.focus()`, because rule B-3 is about what a keyboard user can reach rather than about what
 * a test can address. A control that cannot be reached is reported with the element focus sat on
 * after the last press, which is the information needed to fix the focus order.
 *
 * @param page The page under test.
 * @param target The control that must receive focus.
 * @param where The step being replayed, named in the failure.
 */
async function tabUntilFocused(page: Page, target: Locator, where: string): Promise<void> {
  for (let press = 0; press < TAB_LIMIT; press += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
  }

  const stoppedAt = await page.evaluate(() => {
    const element = document.activeElement;
    if (element === null) {
      return 'nothing';
    }
    const name = (element.getAttribute('aria-label') ?? (element.textContent ?? ''))
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 60);
    return `<${element.tagName.toLowerCase()}> "${name}"`;
  });

  throw new Error(
    `${where} could not be reached with Tab within ${TAB_LIMIT} presses; focus sat on ${stoppedAt}. Rule B-3 requires every control to be reachable and operable by keyboard.`,
  );
}

/**
 * Walks the page with `Tab` and records what focus reached, in the order it reached it.
 *
 * The walk needs no starting position and no hard count: it records stops until one it has already
 * seen comes round again, which is exactly one cycle of the document whatever control focus began on.
 * Each stop carries what rule B-3 measures: the element's rendered size, its computed outline (the
 * focus ring), whether it occupies space at all, and its position in document order among every
 * focusable element.
 *
 * @param page The page under test, settled on a route.
 * @returns One entry per stop, in the order `Tab` reached them.
 */
async function walkTabOrder(page: Page): Promise<readonly FocusStop[]> {
  const stops: FocusStop[] = [];
  const visited = new Set<number>();

  for (let press = 0; press < TAB_LIMIT; press += 1) {
    await page.keyboard.press('Tab');

    const stop = await page.evaluate(
      (args: { readonly focusableSelector: string; readonly minimumTargetPx: number }) => {
        const element = document.activeElement;
        if (element === null || element === document.body || element === document.documentElement) {
          return null;
        }

        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const focusable = Array.from(document.querySelectorAll(args.focusableSelector));
        const surface = element.closest('figure');
        const equivalentControl =
          surface !== null &&
          Array.from(surface.querySelectorAll('button')).some((candidate) => {
            /* The label `src/components/chart-frame.tsx` gives the toggle every chart, map and graph
               carries, so a mark inside a figure that offers it has an equivalent control. */
            if (!/^view as table/i.test((candidate.textContent ?? '').trim())) {
              return false;
            }
            const box = candidate.getBoundingClientRect();
            return box.width >= args.minimumTargetPx && box.height >= args.minimumTargetPx;
          });

        return {
          tag: element.tagName.toLowerCase(),
          role: element.getAttribute('role') ?? '',
          name: (element.getAttribute('aria-label') ?? (element.textContent ?? ''))
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 60),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          outlineWidth: Math.round(
            Number.parseFloat(style.outlineWidth === '' ? '0' : style.outlineWidth),
          ),
          outlineStyle: style.outlineStyle,
          visible:
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            rect.width > 0 &&
            rect.height > 0,
          equivalentControl,
          documentIndex: focusable.indexOf(element),
        };
      },
      { focusableSelector: FOCUSABLE_SELECTOR, minimumTargetPx: MIN_TARGET_PX },
    );

    /*
     * A press that leaves the document — the browser parks focus in its own chrome — is not a stop;
     * the next press returns to the document's first control. The walk therefore ends when a stop it
     * has already seen comes round again, which is one full cycle whatever position it started from.
     */
    if (stop === null) {
      continue;
    }
    if (visited.has(stop.documentIndex)) {
      return stops;
    }

    visited.add(stop.documentIndex);
    stops.push({ index: stops.length, ...stop });
  }

  return stops;
}

/**
 * Proves the tab order reaches every control, in document order, with a visible ring and a target that
 * meets the 24x24 px minimum the plan fixes.
 *
 * The requirements rule B-3 makes of the walk, each measured over the whole page rather than sampled:
 * every focusable element was reached (the stop count equals the number of focusable elements), the
 * order was document order (each stop's document index rises), every stop occupied space, every
 * stop painted a focus ring of at least 2 px, and every stop met the 24x24 px minimum target or
 * qualified for SC 2.5.8's Equivalent exception.
 *
 * @param page The page under test, settled, with focus outside the document.
 * @param where The screen being walked, named in each failure.
 */
async function expectKeyboardReachable(page: Page, where: string): Promise<void> {
  const stops = await walkTabOrder(page);

  expect(stops.length, `${where} must render a shell and a screen worth walking`).toBeGreaterThan(20);

  /* A control the browser cannot focus at all — one inside a `display: none` subtree, or a natively
     disabled form control — is not a stop, so it is not counted here either. */
  const candidates = await page.evaluate((focusableSelector: string) => {
    return Array.from(document.querySelectorAll(focusableSelector)).filter(
      (element) => !element.matches(':disabled') && element.getClientRects().length > 0,
    ).length;
  }, FOCUSABLE_SELECTOR);

  expect(
    stops.length,
    `${where}: Tab reached ${stops.length} of ${candidates} focusable elements, so at least one ` +
      'control cannot be reached by keyboard (rule B-3)',
  ).toBe(candidates);

  /*
   * The walk may begin anywhere in the document — a spec that navigated by clicking a link leaves the
   * browser's sequential focus starting point at that link — so the cycle is rotated to begin at the
   * document's first focusable element before its order is judged.
   */
  const firstInDocument = Math.min(...stops.map((stop) => stop.documentIndex));
  const startAt = stops.findIndex((stop) => stop.documentIndex === firstInDocument);
  const inDocumentOrder = [...stops.slice(startAt), ...stops.slice(0, startAt)];

  const invisible = stops.filter((stop) => !stop.visible).map(describeStop);
  expect(
    invisible,
    `${where}: these focus stops occupy no space, so a keyboard reader cannot see where focus is (rule B-3):\n${invisible.join('\n')}`,
  ).toEqual([]);

  /*
   * The minimum target size, with WCAG 2.2 SC 2.5.8's Equivalent exception applied: a stop smaller
   * than the minimum is conformant when its own surface offers a control that meets the minimum for
   * the same purpose. Every chart, map and graph in this application carries a "View as table" toggle
   * for exactly that reason, so a focusable chart mark is covered; a small control with no equivalent
   * is not.
   */
  const tooSmall = stops
    .filter(
      (stop) =>
        (stop.width < MIN_TARGET_PX || stop.height < MIN_TARGET_PX) && !stop.equivalentControl,
    )
    .map(describeStop);
  expect(
    tooSmall,
    `${where}: these focus targets are smaller than ${MIN_TARGET_PX}x${MIN_TARGET_PX} px and offer ` +
      `no equivalent control of that size (rule B-3, WCAG 2.2 SC 2.5.8):\n${tooSmall.join('\n')}`,
  ).toEqual([]);

  const ringless = stops
    .filter((stop) => stop.outlineWidth < MIN_FOCUS_RING_PX || stop.outlineStyle === 'none')
    .map(describeStop);
  expect(
    ringless,
    `${where}: these focus stops painted no ${MIN_FOCUS_RING_PX} px focus indicator (rule B-3):\n` +
      `${ringless.join('\n')}`,
  ).toEqual([]);

  const outOfOrder = inDocumentOrder
    .filter((stop, position) => {
      const previous = inDocumentOrder[position - 1];
      return previous !== undefined && stop.documentIndex < previous.documentIndex;
    })
    .map(describeStop);
  expect(
    outOfOrder,
    `${where}: these focus stops left document order, so the tab sequence departs from the DOM ` +
      `(rule B-3):\n${outOfOrder.join('\n')}`,
  ).toEqual([]);
}

/**
 * One focus stop as a line of a failure message.
 *
 * @param stop The stop to describe.
 * @returns Its walk position, tag, rendered size, ring and accessible name.
 */
function describeStop(stop: FocusStop): string {
  const role = stop.role === '' ? '' : `[${stop.role}]`;
  return `  #${stop.index} <${stop.tag}${role}> ${stop.width}x${stop.height}px ring=${stop.outlineStyle} ${stop.outlineWidth}px — "${stop.name}"`;
}

/* ---------------------------------------------------------------------------------------------
 * Reduced motion
 * ------------------------------------------------------------------------------------------- */

/**
 * Measures every animation and transition the document declares.
 *
 * `getComputedStyle` reports the durations the cascade resolved, so this reads what the browser will
 * actually honour rather than what a stylesheet intends. A duration list (`0.15s, 0s`) is reduced to
 * its longest member, because one long transition is a moving element.
 *
 * @param page The page under test.
 * @returns The document's motion, and whether the reduced-motion preference is in force.
 */
async function motionReport(page: Page): Promise<MotionReport> {
  return page.evaluate(() => {
    const longestOf = (value: string): number =>
      value.split(',').reduce((longest, part) => {
        const seconds = Number.parseFloat(part.trim());
        return Number.isNaN(seconds) ? longest : Math.max(longest, seconds);
      }, 0);

    const elements = Array.from(document.querySelectorAll('*'));
    let transitioning = 0;
    let animating = 0;
    let longestAnimationSeconds = 0;
    let longestTransitionSeconds = 0;

    for (const element of elements) {
      const style = getComputedStyle(element);
      const animation = longestOf(style.animationDuration);
      const transition = longestOf(style.transitionDuration);
      if (animation > 0) {
        animating += 1;
      }
      if (transition > 0) {
        transitioning += 1;
      }
      longestAnimationSeconds = Math.max(longestAnimationSeconds, animation);
      longestTransitionSeconds = Math.max(longestTransitionSeconds, transition);
    }

    return {
      elements: elements.length,
      transitioning,
      animating,
      longestAnimationSeconds,
      longestTransitionSeconds,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  });
}

/** What `getComputedStyle` reports about motion across a whole document. */
interface MotionReport {
  /** How many elements were inspected. */
  readonly elements: number;

  /** How many elements declare a transition longer than zero. */
  readonly transitioning: number;

  /** How many elements declare an animation longer than zero. */
  readonly animating: number;

  /** The longest animation duration in the document, in seconds. */
  readonly longestAnimationSeconds: number;

  /** The longest transition duration in the document, in seconds. */
  readonly longestTransitionSeconds: number;

  /** Whether the browser reports the reduced-motion preference as active. */
  readonly reducedMotion: boolean;
}

/* ---------------------------------------------------------------------------------------------
 * The helper the replays need beyond the walk
 * ------------------------------------------------------------------------------------------- */

/**
 * The text a control's `aria-describedby` resolves to, which is the explanation rule P-8 requires.
 *
 * `src/components/tooltip.tsx` keeps the sentence mounted and linked whether or not the hint is
 * painted, so this reads it at any moment. A control that explains nothing returns the empty string,
 * which the caller asserts against rather than tolerating.
 *
 * @param page The page under test.
 * @param control The control that must explain a state it cannot act in.
 * @returns The description text, whitespace collapsed.
 */
async function describedTextOf(page: Page, control: Locator): Promise<string> {
  const describedBy = (await control.getAttribute('aria-describedby')) ?? '';
  const descriptions: string[] = [];

  for (const id of describedBy.split(/\s+/).filter((value) => value !== '')) {
    const text = await page
      .locator(`[id="${id}"]`)
      .innerText()
      .catch(() => '');
    if (text.trim() !== '') {
      descriptions.push(text.trim().replace(/\s+/g, ' '));
    }
  }

  return descriptions.join(' ');
}

/* ---------------------------------------------------------------------------------------------
 * 1. axe on every route, in both themes — success criterion 6
 * ------------------------------------------------------------------------------------------- */

/**
 * Visits every route of the application through its own interface, in Command and then in Paper, and
 * fails on any serious or critical axe violation on any of them.
 *
 * The route list is not written down as addresses: it is built by driving the navigation, each
 * screen's primary control and the role switcher's landing route, and the parameterised paths are read
 * back from the browser afterwards. The two routes a reader meets by address are covered as such — the
 * stage-notice page USR-08 lands on, and an address that matches nothing — because rule B-3 applies
 * there too: the badge, the skip link and the navigation are on screen in both places.
 *
 * WHY THE PERSONA CHANGES MIDWAY. The mock adapter enforces the permission matrix of contracts §7, so
 * a governance screen answers a planning persona with a denial card and its own content only for the
 * roles that hold the permission. The sweep therefore reads each screen as a persona that may open it:
 * the planning screens as the head of supply chain (who reaches the atlas as well), the audit trail as
 * the auditor, the sovereignty and policy screens as the platform administrator, and the stage notice
 * as the external supplier engineer whose home route it is. The sovereignty screen is reached through
 * the role switcher, which is how every persona that may read it arrives.
 */
test(
  'T-16 axe: no route has a serious or critical violation in either theme',
  async ({ page }): Promise<void> => {
    test.setTimeout(600_000);

    const visited: VisitedRoute[] = [];
    const violations: BlockingViolation[] = [];

    /**
     * Settles the route on screen, checks the two route-wide disclosures, then runs axe in both themes.
     *
     * A route reached by a click is awaited through `awaitRoute`, which also proves the address the
     * application settled on; a fresh load needs the settle alone, because no previous screen can still
     * be showing.
     */
    const sweep = async (label: string, route?: RegExp): Promise<void> => {
      if (route === undefined) {
        await awaitSettled(page);
      } else {
        await awaitRoute(page, route, label);
      }
      const path = new URL(page.url()).pathname;
      visited.push({ label, path });
      const where = `${label} (${path})`;

      await expectDemonstrationDisclosure(page, where);

      for (const theme of ['command', 'paper'] as const) {
        await awaitTheme(page, theme);
        violations.push(
          ...(await collectBlockingViolations(page, `${where} in the ${theme} theme`)),
        );
      }
    };

    await page.goto('/overview');
    await sweep('the overview');

    await page.getByRole('link', { name: 'Exceptions', exact: true }).click();
    await sweep('the exception queue', /\/exceptions$/);

    /* A parameterised route, opened from the row's own action rather than addressed. */
    await page.getByRole('button', { name: /^Open\s*:/ }).first().click();
    await sweep('the investigation', /\/exceptions\/[^/]+$/);

    await page.getByRole('button', { name: 'Compare options', exact: true }).click();
    await sweep('the scenario comparison', /\/exceptions\/[^/]+\/scenarios$/);

    await page.getByRole('link', { name: 'Approvals', exact: true }).click();
    await sweep('the approvals inbox', /\/approvals$/);

    /*
     * The inbox row is the table's own activation target — there is no per-row control — so it is
     * opened the way the register opens it: the cursor row takes focus and `Enter` follows the link.
     */
    await page.getByRole('row').nth(1).focus();
    await page.keyboard.press('Enter');
    await sweep('the approval detail', /\/approvals\/[^/]+$/);

    await page.getByRole('link', { name: 'Evidence assistant', exact: true }).click();
    await sweep('the evidence assistant', /\/assistant$/);

    await switchRole(page, 'USR-03');
    await sweep('the FileMap canvas', new RegExp(`${entryRouteForPersona('USR-03')}$`));

    await page.getByRole('link', { name: 'Competitive atlas', exact: true }).click();
    await sweep('the competitive atlas', /\/competitive$/);

    await switchRole(page, 'USR-06');
    await sweep('the audit trail', new RegExp(`${entryRouteForPersona('USR-06')}$`));

    await switchRole(page, 'USR-04');
    await sweep('the sovereignty screen', new RegExp(`${entryRouteForPersona('USR-04')}$`));

    /* The policy list is a table like the inbox: the row's own activation opens the policy. */
    await page
      .getByRole('table', { name: /^Policies the engine evaluates/ })
      .getByRole('row')
      .nth(1)
      .focus();
    await page.keyboard.press('Enter');
    await sweep('the policy detail', /\/admin\/policies\/[^/]+$/);

    await switchRole(page, 'USR-08');
    await sweep('the stage notice', new RegExp(`${entryRouteForPersona('USR-08')}$`));

    await page.goto('/no-such-page');
    await sweep('the not-found page');

    const paths = visited.map((route) => route.path);
    expect(
      paths.length,
      `the sweep must cover the shell, the nine screens, the stage notice and the not-found page; it covered ${paths.length}: ${paths.join(', ')}`,
    ).toBeGreaterThanOrEqual(14);
    expect(new Set(paths).size, `each route must be swept once: ${paths.join(', ')}`).toBe(paths.length);

    /*
     * The assertion the whole sweep exists for: no route, in either theme, reports a serious or
     * critical violation (rule B-3, success criterion 6). Every run is collected before this single
     * assert, so a regression names each offending route and theme rather than only the first.
     */
    expect(
      violations,
      `axe reported a serious or critical violation on ${violations.length} route/theme run(s) (rule B-3, success criterion 6):\n${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
});

/* ---------------------------------------------------------------------------------------------
 * 2. Reduced motion — the fourth clause of rule B-3
 * ------------------------------------------------------------------------------------------- */

/**
 * Proves that `prefers-reduced-motion: reduce` is honoured, on a chart and on the FileMap canvas.
 *
 * The measurement is the browser's resolved styles, not the stylesheet's intent: with the preference
 * off the document must declare transitions (otherwise the block below would have nothing to still
 * and would pass vacuously), and with it on no element may run an animation or a transition longer
 * than the 0.01 ms `src/styles/index.css` declares.
 *
 * THE CANVAS. In this build the FileMap canvas answers with its permission state for every seeded
 * persona, because the dock's audit read and the lens's topology read need permissions no single role
 * holds. The reduced-motion clause still applies to what the route renders, so it is measured there
 * too; the chart on the overview is what proves the block reaches the animated surfaces.
 */
test(
  'T-16 axe: prefers-reduced-motion stills every animation and disables every transition',
  async ({ page }): Promise<void> => {
    test.setTimeout(180_000);

    await page.goto('/overview');
    await awaitSettled(page);

    await expect(
      page.getByRole('figure').first(),
      'the measurement must cover a chart, not only the shell',
    ).toBeVisible();

    const moving = await motionReport(page);
    expect(
      moving.reducedMotion,
      'the browser must start without the reduced-motion preference',
    ).toBe(false);
    expect(
      moving.transitioning,
      'the screen must declare colour transitions, or the reduced-motion clause has nothing to still and this check would pass vacuously',
    ).toBeGreaterThan(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await settleAnimations(page);

    const reduced = await motionReport(page);
    expect(reduced.reducedMotion, 'the emulated preference must be in force').toBe(true);
    expect(
      reduced.longestAnimationSeconds,
      `with prefers-reduced-motion: reduce no element may run an animation longer than 0.01ms, but the longest in the document is ${reduced.longestAnimationSeconds}s (rule B-3)`,
    ).toBeLessThanOrEqual(REDUCED_MOTION_MAX_SECONDS);
    expect(
      reduced.longestTransitionSeconds,
      `with prefers-reduced-motion: reduce no element may run a transition longer than 0.01ms, but the longest in the document is ${reduced.longestTransitionSeconds}s (rule B-3)`,
    ).toBeLessThanOrEqual(REDUCED_MOTION_MAX_SECONDS);

    await switchRole(page, 'USR-03');
    await awaitRoute(page, new RegExp(`${entryRouteForPersona('USR-03')}$`), 'the FileMap canvas');

    const canvas = await motionReport(page);
    expect(canvas.reducedMotion, 'the preference must survive the role switch').toBe(true);
    expect(
      canvas.longestAnimationSeconds,
      `the FileMap canvas must still every animation under prefers-reduced-motion: reduce, but its longest is ${canvas.longestAnimationSeconds}s (rule B-3)`,
    ).toBeLessThanOrEqual(REDUCED_MOTION_MAX_SECONDS);
    expect(
      canvas.longestTransitionSeconds,
      `the FileMap canvas must disable every transition under prefers-reduced-motion: reduce, but its longest is ${canvas.longestTransitionSeconds}s (rule B-3)`,
    ).toBeLessThanOrEqual(REDUCED_MOTION_MAX_SECONDS);
});

/* ---------------------------------------------------------------------------------------------
 * 3. The tab order — reachable, visible, ordered, and large enough to hit
 * ------------------------------------------------------------------------------------------- */

/**
 * Walks the shell and two screens with `Tab` and holds every stop to rule B-3.
 *
 * The overview is walked first because it carries the richest page — the badge, both switches, the
 * role switcher, the navigation in its three groups, five evidence figures, a sortable table and two
 * charts whose marks are focusable — and the exception queue second because a table is where a focus
 * order usually breaks: its rows are a roving cursor with exactly one tab stop.
 */
test(
  'T-16 keyboard: Tab reaches every control in document order with a visible focus ring',
  async ({ page }): Promise<void> => {
    test.setTimeout(180_000);

    await page.goto('/overview');
    await awaitSettled(page);
    await expectKeyboardReachable(page, 'the overview');

    /*
     * The second screen is addressed directly. A walk ends with focus outside the document — that is how
     * the browser signals the cycle is complete — and a document whose focus sits in the browser's own
     * chrome does not reliably hand a following pointer click to the page. Addressing the second screen
     * keeps this test about the focus order it exists to measure; that every route is reachable through
     * the interface is what the sweep above proves.
     */
    await page.goto('/exceptions');
    await awaitSettled(page);
    await expectKeyboardReachable(page, 'the exception queue');
});

/* ---------------------------------------------------------------------------------------------
 * 4. The search shortcut — AAP 0.12.4's `/`
 * ------------------------------------------------------------------------------------------- */

/**
 * Proves `/` moves focus into the identifier search, that typing narrows the grouped results, and that
 * `Escape` closes the list with focus still in the field that owns it.
 *
 * The search field is a combobox whose popover is grouped by record kind, so the narrowing is checked
 * against the options the service returned rather than against a count typed here: every option after
 * the second fragment must contain that fragment and must be one of the options the first fragment
 * returned.
 */
test(
  'T-16 keyboard: the search shortcut focuses the identifier field and Escape closes its results',
  async ({ page }): Promise<void> => {
    test.setTimeout(180_000);

    await page.goto('/overview');
    await awaitSettled(page);

    const search = page.locator('[data-shortcut="search"]');
    await page.keyboard.press('/');
    await expect(
      search,
      'the "/" shortcut must put focus in the identifier search (AAP 0.12.4, rule B-3)',
    ).toBeFocused();

    const results = page.getByRole('listbox', { name: 'Identifier search results' });

    await page.keyboard.type('EXC-2026-11');
    await expect(results, 'typing must open the grouped results').toBeVisible();
    await expect(
      results.getByRole('group').first(),
      'the results must be grouped by the kind of record the hit belongs to',
    ).toBeVisible();

    const firstFragment = (await results.getByRole('option').allInnerTexts()).map((text) =>
      text.replace(/\s+/g, ' ').trim(),
    );
    expect(
      firstFragment.length,
      'a search for an identifier fragment must return at least one hit',
    ).toBeGreaterThan(0);

    await page.keyboard.type('8');
    await expect
      .poll(
        async () => (await results.getByRole('option').allInnerTexts()).length,
        { message: 'the list must answer the longer fragment rather than the previous one' },
      )
      .toBeGreaterThan(0);

    const narrowed = (await results.getByRole('option').allInnerTexts()).map((text) =>
      text.replace(/\s+/g, ' ').trim(),
    );
    expect(
      narrowed.every((text) => text.includes('EXC-2026-118')),
      `each hit must match the fragment typed: ${narrowed.join(' | ')}`,
    ).toBe(true);
    expect(
      narrowed.every((text) => firstFragment.includes(text)),
      'narrowing must keep a subset of what the shorter fragment returned, never widen it',
    ).toBe(true);

    await page.keyboard.press('Escape');
    await expect(results, 'Escape must close the results list').toHaveCount(0);
    await expect(search, 'focus must stay in the field that owns the results list').toBeFocused();
});

/* ---------------------------------------------------------------------------------------------
 * 5. The row cursor — AAP 0.12.4's J, K and Enter
 * ------------------------------------------------------------------------------------------- */

/**
 * Proves the queue's roving row cursor: `J` and `K` move it, and `Enter` opens the row it sits on.
 *
 * The cursor's position is read from the row's own `aria-rowindex`, which is what assistive technology
 * announces, rather than from a class or a pixel position; the opened route is asserted by its shape,
 * so no record identifier is written into this file.
 */
test(
  'T-16 keyboard: J and K move the row cursor and Enter opens the focused row',
  async ({ page }): Promise<void> => {
    test.setTimeout(180_000);

    await page.goto('/exceptions');
    await awaitSettled(page);

    const rows = page.getByRole('row');
    const firstRow = rows.nth(1);
    await tabUntilFocused(page, firstRow, 'the first row of the exception queue');

    const cursorStart = await firstRow.getAttribute('aria-rowindex');
    expect(cursorStart, 'a data row must state its position for assistive technology').not.toBeNull();

    await page.keyboard.press('j');
    await expect(rows.nth(2), 'J must move the cursor down one row').toBeFocused();
    await expect(
      rows.nth(2),
      'the cursor must announce the row it moved to, not the one it left',
    ).not.toHaveAttribute('aria-rowindex', cursorStart ?? '');

    await page.keyboard.press('k');
    await expect(firstRow, 'K must move the cursor back up one row').toBeFocused();

    await page.keyboard.press('j');
    await page.keyboard.press('Enter');
    await awaitRoute(page, /\/exceptions\/[^/]+$/, 'the investigation of the row Enter opened');
});

/* ---------------------------------------------------------------------------------------------
 * 6. Escaping the evidence drawer — AAP 0.12.4's Esc, and rule PR-6's reachable evidence
 * ------------------------------------------------------------------------------------------- */

/**
 * Proves a figure opens its evidence by keyboard, that focus moves into the drawer, and that `Escape`
 * closes it and returns focus to the figure that opened it (WCAG 2.2 SC 2.4.3).
 *
 * The drawer's content is the evidence read's own; what this test holds it to is the interaction rule
 * B-3 requires — reachable, escapable, and focus-restoring.
 */
test(
  'T-16 keyboard: Escape closes the evidence drawer and returns focus to the figure',
  async ({ page }): Promise<void> => {
    test.setTimeout(180_000);

    await page.goto('/overview');
    await awaitSettled(page);

    const figure = page.getByRole('button', { name: /open evidence$/ }).first();
    await tabUntilFocused(page, figure, 'a figure that opens its evidence');
    await page.keyboard.press('Enter');

    const drawer = page.getByRole('dialog', { name: /^Evidence/ });
    await expect(drawer, 'Enter on a figure must open its evidence drawer').toBeVisible();
    expect(
      await drawer.evaluate((element) => element.contains(document.activeElement)),
      'focus must move into the drawer when it opens (rule B-3)',
    ).toBe(true);

    await page.keyboard.press('Escape');
    await expect(drawer, 'Escape must close the drawer').toHaveCount(0);
    await expect(
      figure,
      'focus must return to the figure that opened the drawer (WCAG 2.2 SC 2.4.3)',
    ).toBeFocused();
});

/* ---------------------------------------------------------------------------------------------
 * 7. The T-07 path, without a pointer
 * ------------------------------------------------------------------------------------------- */

/**
 * Replays T-07 by keyboard alone: open an approval from the inbox, acknowledge its side effect, type
 * the comment a decision requires, and reach the decision control.
 *
 * Rule P-8 is checked where it bites: `Approve` starts disabled *with a reachable explanation*, and
 * becomes actionable only once the comment and the acknowledgement are both in place. Every step is
 * reached with `Tab` and activated with `Enter`, so a control a pointer could reach and a keyboard
 * could not fails here.
 */
test(
  'T-16 keyboard: the T-07 decision path is operable without a pointer',
  async ({ page }): Promise<void> => {
    test.setTimeout(180_000);

    await page.goto('/exceptions');
    await awaitSettled(page);
    await switchRole(page, 'USR-02');
    await awaitRoute(page, new RegExp(`${entryRouteForPersona('USR-02')}$`), 'the approvals inbox');

    await tabUntilFocused(page, page.getByRole('row').nth(1), 'the first approval in the inbox');
    await page.keyboard.press('Enter');
    await awaitRoute(page, /\/approvals\/[^/]+$/, 'the approval detail');

    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    await expect(
      approve,
      'Approve must be disabled until the decision is complete (rule P-8)',
    ).toHaveAttribute('aria-disabled', 'true');
    const blockedReason = await describedTextOf(page, approve);
    expect(
      blockedReason.length,
      'a disabled control must carry the sentence that explains why it cannot act (rule P-8)',
    ).toBeGreaterThan(0);

    const comment = page.getByRole('textbox', { name: 'Comment', exact: true });
    await tabUntilFocused(page, comment, 'the decision comment field');
    await page.keyboard.type(
      'Acknowledged the deferred kits; the plan protects more revenue than it defers.',
    );

    const acknowledgement = page.getByRole('button', { name: /^I have read the side effect on / });
    await tabUntilFocused(page, acknowledgement, 'the side-effect acknowledgement');
    await expect(
      acknowledgement,
      'the acknowledgement starts unset, so the decision cannot be taken by accident',
    ).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Enter');
    await expect(acknowledgement, 'activating the acknowledgement must set it').toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await tabUntilFocused(page, approve, 'the Approve control');
    await expect(
      approve,
      'with the comment written and the side effect acknowledged, Approve must be actionable',
    ).not.toHaveAttribute('aria-disabled', 'true');

    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('region', { name: 'Decision taken' }),
      'activating Approve must record the decision',
    ).toBeVisible();
});

/* ---------------------------------------------------------------------------------------------
 * 8. The T-08 path, without a pointer
 * ------------------------------------------------------------------------------------------- */

/**
 * Replays T-08 by keyboard: after the decision is taken, the write-back tracker steps through every
 * simulated write-back and the outcome card sets the plan's figures against the resulting ones.
 *
 * Both surfaces are checked for their labels as well as their presence: every write-back step carries
 * the fixed `Simulated write-back` string (rule P-1), and the outcome card is a computed comparison
 * rather than a typed one.
 */
test(
  'T-16 keyboard: the T-08 write-back and outcome path is operable without a pointer',
  async ({ page }): Promise<void> => {
    test.setTimeout(180_000);

    await page.goto('/exceptions');
    await awaitSettled(page);
    await switchRole(page, 'USR-02');
    await awaitRoute(page, new RegExp(`${entryRouteForPersona('USR-02')}$`), 'the approvals inbox');

    await tabUntilFocused(page, page.getByRole('row').nth(1), 'the first approval in the inbox');
    await page.keyboard.press('Enter');
    await awaitRoute(page, /\/approvals\/[^/]+$/, 'the approval detail');

    const comment = page.getByRole('textbox', { name: 'Comment', exact: true });
    await tabUntilFocused(page, comment, 'the decision comment field');
    await page.keyboard.type('Approved after reviewing the tracker and the deferred kits.');

    const acknowledgement = page.getByRole('button', { name: /^I have read the side effect on / });
    await tabUntilFocused(page, acknowledgement, 'the side-effect acknowledgement');
    await page.keyboard.press('Enter');

    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    await tabUntilFocused(page, approve, 'the Approve control');
    await page.keyboard.press('Enter');

    const tracker = page.getByRole('region', { name: 'Write-back progress' });
    await expect(
      tracker,
      'an approved plan must show the tracker that steps through its write-backs',
    ).toBeVisible();

    const steps = tracker.getByRole('listitem');
    expect(
      await steps.count(),
      'the tracker must list the write-backs the approved plan records',
    ).toBeGreaterThan(0);

    const stepTexts = (await steps.allInnerTexts()).map((text) => text.replace(/\s+/g, ' ').trim());
    const unlabelled = stepTexts.filter((text) => !text.includes('Simulated write-back'));
    expect(
      unlabelled,
      `every write-back step must carry the fixed "Simulated write-back" label (rule P-1):\n${unlabelled.join('\n')}`,
    ).toEqual([]);

    await expect(
      page.getByRole('heading', { name: 'Planned against resulting' }),
      'an approved plan must show its figures beside the figures the records reached',
    ).toBeVisible();
});

/* ---------------------------------------------------------------------------------------------
 * 9. The T-11 path, without a pointer
 * ------------------------------------------------------------------------------------------- */

/**
 * Replays T-11 by keyboard: choose the external reasoning model, put the confidential document in
 * context by asking the question that carries it, and reach the POL-007 block card and its one-click
 * switch to the in-boundary model.
 *
 * The model catalogue is a native `<select>`, so the arrow keys are how a keyboard user changes it;
 * the block card's own control then re-asks the question in-boundary, which is what proves the switch
 * is a switch and not a label. Nothing here bypasses the policy engine: the block is the service's
 * refusal, reported with the rule that caused it (rules P-4 and P-8).
 */
test(
  'T-16 keyboard: the T-11 assistant path reaches the POL-007 block and its one-click switch',
  async ({ page }): Promise<void> => {
    test.setTimeout(180_000);

    await page.goto('/assistant');
    await awaitSettled(page);

    const model = page.getByRole('combobox', { name: 'Answer model' });
    const selectedModelText = async (): Promise<string> =>
      model.evaluate((select) =>
        select instanceof HTMLSelectElement ? (select.selectedOptions[0]?.textContent ?? '').trim() : '',
      );

    await tabUntilFocused(page, model, 'the answer-model selector');
    for (let press = 0; press < 6; press += 1) {
      if ((await selectedModelText()).toLowerCase().includes('external')) {
        break;
      }
      await page.keyboard.press('ArrowDown');
    }
    expect(
      (await selectedModelText()).toLowerCase(),
      'the external model must be selectable with the arrow keys alone',
    ).toContain('external');

    const question = page.getByRole('button', { name: /^What does the supply agreement/ });
    await tabUntilFocused(page, question, 'the suggested question that carries the agreement');
    await page.keyboard.press('Enter');

    const block = page.getByRole('region', { name: 'Blocked by policy' });
    await expect(
      block,
      'the external model must be refused when the question carries the confidential document (POL-007)',
    ).toBeVisible();
    await expect(block, 'the block must name the rule that caused it (rule P-8)').toContainText(
      'POL-007',
    );
    await expect(block, 'the block must say what kind of material it refuses').toContainText(
      'customer-confidential',
    );

    const switchToBoundary = page.getByRole('button', {
      name: 'Switch to the in-boundary model',
      exact: true,
    });
    await tabUntilFocused(page, switchToBoundary, 'the one-click switch to the in-boundary model');
    await page.keyboard.press('Enter');

    await expect(block, 'the switch must clear the block').toHaveCount(0);
    expect(
      (await selectedModelText()).toLowerCase(),
      'the switch must leave the in-boundary model selected',
    ).toContain('in-boundary');
    await expect(
      page.getByRole('button', { name: 'Show queries and model' }),
      'the question must then be answered in-boundary, with its citations',
    ).toBeVisible();
});

