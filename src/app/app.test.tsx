/**
 * Component suite for `src/app/app.tsx`: the shell every route renders inside.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS NOT IN THE FOLDER'S PLAN LIST. Rule P-1 requires the
 * `Simulated data` badge on every route, and the only placement that can deliver that is the shell's,
 * above the router outlet. `src/components/simulated-data-badge.tsx` records that the badge "is
 * mounted once by `src/app/app.tsx` above the router outlet", and `src/components/simulated-data-badge.test.tsx`
 * records that the AAP §0.10 assertion — "the shell renders it outside the outlet" — cannot live in a
 * component suite, because a component may not import `src/app`; that half belongs here. This file is
 * therefore a derived, rule-mandated addition rather than one of the planned files, and it carries
 * both halves of the guard AAP §0.10 names: the badge is outside the outlet, and a route added later
 * cannot escape it.
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP.
 * - P-1: the badge is in the document on a routed page and on the not-found page, it is visible, it
 *   sits inside the banner landmark, and it is NOT a descendant of the `main` landmark that holds the
 *   router outlet. Exactly one badge renders, so a screen or a second mount cannot double it.
 * - P-8: the navigation renders thirteen entries in three groups; each of the five stage entries is a
 *   control that cannot act — never a link, `aria-disabled="true"` — and it names its exact reason,
 *   both as the accessible description a keyboard reader hears on arrival and as the hint painted on
 *   pointer contact. The reason itself is read from the navigation table and compared with the fixed
 *   stage string the table's own module exports, so a paraphrase fails here.
 * - AAP 0.12.1: the top bar keeps the specification's order — wordmark, then the badge, then the two
 *   presentation switches, then the role switcher — asserted as DOM order rather than as a snapshot.
 * - P-3: the role switcher's non-authorisation note is visible body text in the bar.
 * - B-3: the landmarks are asserted behaviourally — the banner, the navigation by its accessible name,
 *   the single `main` — and no snapshot is taken anywhere.
 * - B-3, and QA finding QA2-09: the navigation folds below `md` behind a disclosure the shell renders
 *   outside the landmark, closed on first paint, its `aria-controls` naming the region it opens and its
 *   `aria-expanded` following the state that region is in, so a phone viewport meets the route rather
 *   than 328 px of navigation.
 * - P-1's presentation mode: wall mode hides the navigation and nothing else, so the route the reader
 *   is on, the top bar and the badge all stay mounted.
 * - P-4 / P-7: the shell's own text states none of the vocabulary of an unimplemented claim and names
 *   no barred product. The phrases are assembled from fragments below so that this file does not
 *   itself carry them, which is the same device `src/app/role-switcher.test.tsx` and
 *   `src/components/forbidden-card.test.tsx` use — a source check scans `src/` for them.
 * - QA1-01: the two groups in the bar that read their own records reserve the box their read settles
 *   into — the freshness group takes a line of the bar's row and holds a height floor, and the scope
 *   group holds a column whose sentence is capped below its fields' width. The bar is one wrapping row
 *   whose height every control beside those groups pays for, so a group that grew when its read
 *   answered re-broke its neighbours' lines and moved the navigation and the route's content.
 *
 * THE SERVICE BOUNDARY IS MOCKED AT THE PROVIDER (rule P-2). The real provider awaits the mock
 * adapter's bootstrap, which hashes two hundred seeded audit events through `crypto.subtle` — and
 * that call rejects jsdom's `ArrayBuffer` realm (AAP §0.3.1) — so a suite that rendered through it
 * would be testing the platform rather than the shell. Nothing here imports `src/seed`,
 * `src/services/mock` or `src/services/api-client`; the stub answers the handful of port members the
 * top bar's children call with promises that never settle, so the bar renders its busy state and no
 * figure is ever produced by this file.
 *
 * THE ROUTE TABLE IS MINIMAL ON PURPOSE. The shell is rendered inside a memory router over three
 * throwaway children, not over `appRoutes`: the shell's own structure is this file's subject, and
 * `router.tsx` plus every screen are covered elsewhere. `src/app/app.tsx` is imported for `AppShell`
 * and its fixed landmark strings alone.
 *
 * NO FIGURE, RECORD OR PERSONA IS TYPED HERE (rule P-6): the only strings read are the navigation
 * table's entries and the fixed stage strings, both imported from their owners. Nothing hashes, reads
 * the system clock, touches the network, reads configuration or carries a credential (rules B-1, B-2).
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default, with the jest-dom matchers
 * `tests/setup.ts` registers. No environment directive is needed at the top of the file: nothing here
 * hashes, and the shell renders only what a DOM provides.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Fragment, createElement } from 'react';
import type { ReactNode } from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SIM_LABELS } from '../types/primitives';
import { APP_SHELL_TEXT, AppShell } from './app';
import { FRESHNESS_STRIP_TEXT } from './freshness-strip';
import {
  NAV_GROUPS,
  NAV_ITEMS,
  STAGE_4_TOOLTIP,
  STAGE_5_TOOLTIP,
  disabledTooltipFor,
} from './nav-items';
import type { NavItem } from './nav-items';
import { AppProviders, useShellStore } from './providers';
import { SCOPE_FILTERS_TEXT } from './scope-filters';
import { SIMULATION_CONTROLS_TEXT } from './simulation-controls';

/* ---------------------------------------------------------------------------------------------
 * The service boundary, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/** The one prop the pass-through provider receives: the shell to render unchanged. */
interface ServiceProviderStubProps {
  /** The provider tree's children, rendered as they are. */
  readonly children?: ReactNode;
}

/**
 * Replaces the provider module the shell and every top-bar child read through.
 *
 * `ServiceProvider` passes its children straight through, so the shell mounts without the adapter's
 * bootstrap. The port stub is deliberately narrow: it answers only the members `FreshnessStrip`,
 * `ScopeFilters`, `SearchField` and `SimulationControls` call, and the reads among them never settle,
 * because the bar's own content is not what this suite asserts. `resetDemo` is the one member that
 * resolves, because one case presses the reset control and asserts the status message a completed reset
 * leaves behind. A port member added to one of those children therefore fails here as "not a function"
 * instead of silently reaching a real adapter, and widening the stub is a deliberate act rather than an
 * accident.
 *
 * `useDemonstration` and `useActiveUser` answer `null`: this suite binds no demonstration capability
 * and no seeded persona, which is the state the role switcher explains in its own words (rule P-8) and
 * keeps rule P-3's note on screen for.
 */
vi.mock('../services/service-provider', () => {
  /** A read that never settles: no figure and no record is produced for this suite. */
  const pending = (): Promise<never> => new Promise<never>(() => undefined);

  /* The one demonstration control this suite drives is the reset, and a reader has to be able to
     complete it for the announcement it leaves behind to be asserted; the other members stay pending. */
  const completed = (): Promise<{ readonly data: true }> => Promise.resolve({ data: true });

  const service = {
    getSourceCatalogue: pending,
    getTopology: pending,
    searchIdentifiers: pending,
    resetDemo: completed,
    setSimulation: pending,
  };

  return {
    ServiceProvider: ({ children }: ServiceProviderStubProps) =>
      createElement(Fragment, null, children),
    useService: () => service,
    useDemonstration: () => null,
    useActiveUser: () => null,
    /* The identity cache key the role switcher writes into; the shell renders that control. */
    ACTIVE_USER_QUERY_KEY: ['getActiveUser'],
  };
});

/* ---------------------------------------------------------------------------------------------
 * The strings and patterns this suite reads
 * ------------------------------------------------------------------------------------------- */

/**
 * The demonstration-wide `Simulated data` label, taken from the tuple that owns the seven fixed
 * strings rather than retyped, so the label the shell renders and the label this suite looks for
 * cannot drift (rule P-1).
 */
const BADGE_LABEL = SIM_LABELS[0];

/**
 * The vocabulary of an unimplemented claim (rule P-4), assembled from fragments so this file does not
 * carry the phrases a source check rejects anywhere under `src/`.
 *
 * Each pattern admits the spaced, hyphenated and unspaced spellings of its phrase, because a claim
 * reworded into one of them is the same claim. What the case below asserts is that the shell states
 * none of it: nothing on these routes may claim that the demonstration resists tampering, is assured
 * or attested, or establishes a trust posture it does not have.
 */
const BARRED_CLAIM_PATTERNS: readonly RegExp[] = [
  ['tamper', '[\\s-]?', 'proof'],
  ['tamper', '[\\s-]?', 'resist'],
  ['zero', '[\\s-]?', 'trust'],
  ['guarant', 'eed'],
  ['certif', 'ied'],
].map((fragment) => new RegExp(fragment.join(''), 'iu'));

/** The barred product name of rule P-7, assembled for the same reason as the claim patterns. */
const BARRED_PRODUCT_NAME = ['Plumb', 'line'].join('');

/**
 * The five navigation entries whose stage this run does not build: the control cannot act, so rule
 * P-8 makes its explanation the only thing that tells a reader why.
 */
interface DisabledEntry extends NavItem {
  /** The exact tooltip text, non-null for exactly these entries. */
  readonly disabledReason: string;
}

/** Narrows an entry to the disabled kind, so the reason is a `string` rather than `string | null`. */
function isDisabledEntry(item: NavItem): item is DisabledEntry {
  return item.disabledReason !== null;
}

/** Every disabled entry, in the table's order. */
const DISABLED_ENTRIES: readonly DisabledEntry[] = NAV_ITEMS.filter(isDisabledEntry);

/**
 * Every entry whose stage this run does not build, counted from the stage each entry declares.
 *
 * Derived from the stage rather than from the entries that happen to carry a tooltip, so the two
 * counts are independent halves of one fact: an entry that loses its tooltip drops out of
 * {@link DISABLED_ENTRIES} while staying in this set, and the navigation case below then fails instead
 * of quietly rendering one fewer disabled control (rule P-8).
 */
const STAGE_ENTRIES: readonly NavItem[] = NAV_ITEMS.filter((item) => item.stage > 3);

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/**
 * The route children the shell frames in this suite.
 *
 * Three throwaway pages rather than `appRoutes`: the shell's structure is the subject, and mounting
 * twelve screens behind it would test the router and the screens here instead of where they belong.
 * `evidence` is the path a stage-notice child stands in for, `exceptions` an ordinary routed page, and
 * `*` the not-found case AAP §0.12.4 requires every unknown address to answer.
 */
const SHELL_CHILDREN = [
  { path: 'exceptions', element: <p>queue</p> },
  { path: 'evidence', element: <p>stage notice</p> },
  { path: '*', element: <p>not found</p> },
];

/**
 * Renders the shell at one address, inside the provider tree the application composes.
 *
 * `AppProviders` is real rather than mocked, because the top bar's children read through the query
 * cache it creates and the two switches read the theme it provides — with the service boundary stubbed
 * above them, that tree mounts without an adapter and without a persisted preference.
 *
 * @param initialPath - The address the memory router starts at.
 * @returns The router, so a case can navigate to the not-found address.
 */
function renderShell(initialPath: string) {
  const router = createMemoryRouter(
    [{ path: '/', element: <AppShell />, children: SHELL_CHILDREN }],
    { initialEntries: [initialPath] },
  );

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return router;
}

/** The shell's navigation landmark, found by the accessible name the shell gives it. */
function navigation(): HTMLElement {
  return screen.getByRole('navigation', { name: APP_SHELL_TEXT.navLandmark });
}

/** The single `main` landmark that holds the router outlet (rule B-3). */
function mainContent(): HTMLElement {
  return screen.getByRole('main');
}

/** The banner landmark: the top bar every route carries. */
function banner(): HTMLElement {
  return screen.getByRole('banner');
}

/**
 * The region the navigation's disclosure trigger names, read through its `aria-controls`.
 *
 * Read through a guard rather than an index, so a trigger whose `aria-controls` named nothing fails
 * with the sentence naming that defect instead of a `TypeError` on `undefined`.
 *
 * @param trigger - The disclosure trigger rendered before the navigation landmark.
 * @returns The element the trigger's `aria-controls` points at.
 */
function revealedRegionOf(trigger: HTMLElement): HTMLElement {
  const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '');

  if (panel === null) {
    throw new Error('The navigation trigger names no region, so its aria-controls is dangling.');
  }

  return panel;
}

/**
 * The badge's label element, which is the element carrying the fixed `Simulated data` string.
 *
 * Read through a guard rather than an index so a shell that rendered no badge fails with a sentence
 * naming the defect instead of a `TypeError` on `undefined`.
 */
function theBadgeLabel(): HTMLElement {
  const [label] = screen.getAllByText(BADGE_LABEL);

  if (label === undefined) {
    throw new Error('The shell rendered no Simulated data badge, so rule P-1 is unmet.');
  }

  return label;
}

/** Whether `first` comes before `second` in document order. */
function precedes(first: Element, second: Element): boolean {
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

/* ---------------------------------------------------------------------------------------------
 * Isolation
 * ------------------------------------------------------------------------------------------- */

/**
 * Returns the shell store to a first-time visitor's state, so a case reads nothing of the one before it.
 *
 * The store's own `resetShell` does this and no application control calls it: `Reset demo data`
 * restores the adapter's records and leaves the reader's persona, scope, selection and wall mode
 * standing, so a reset of the store is nobody's behaviour but a suite's. Isolation still has to happen:
 * a persona, a scope or an open popover left behind by the case before it would be read back as this
 * one's own.
 */
function clearShellState(): void {
  useShellStore.getState().resetShell();
}

beforeEach(() => {
  clearShellState();
});

afterEach(() => {
  clearShellState();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-density');
});

/* ---------------------------------------------------------------------------------------------
 * The badge above the outlet — rule P-1, AAP §0.10
 * ------------------------------------------------------------------------------------------- */

describe('AppShell — the Simulated data badge above the outlet (rule P-1)', () => {
  it('mounts the badge outside the main landmark on a routed page', () => {
    renderShell('/evidence');
    expect(screen.getByText('stage notice')).toBeInTheDocument();

    const badge = theBadgeLabel();
    const main = mainContent();

    /* The label is on screen, inside the banner, and not inside the landmark that holds the outlet:
       a badge rendered by a route would fail this, which is the assertion the AAP cedes to here. */
    expect(badge).toBeVisible();
    expect(banner()).toContainElement(badge);
    expect(within(main).queryByText(BADGE_LABEL)).toBeNull();
    expect(main.contains(badge)).toBe(false);
  });

  it('keeps the badge outside the outlet on the not-found route', async () => {
    const router = renderShell('/evidence');
    expect(theBadgeLabel()).toBeVisible();

    await act(async () => {
      await router.navigate('/no-such-page');
    });

    expect(screen.getByText('not found')).toBeInTheDocument();
    expect(theBadgeLabel()).toBeVisible();
    expect(within(mainContent()).queryByText(BADGE_LABEL)).toBeNull();
  });

  it('mounts exactly one badge, whatever route is showing', () => {
    renderShell('/exceptions');

    /* Two mounts would put two labels on the page, so a second one anywhere fails here. */
    expect(screen.getAllByText(BADGE_LABEL)).toHaveLength(1);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The navigation — rule P-8, rule B-3
 * ------------------------------------------------------------------------------------------- */

describe('AppShell — the navigation (rules B-3, P-8)', () => {
  it('renders a named navigation landmark with three groups and thirteen entries', () => {
    renderShell('/exceptions');

    const nav = navigation();

    expect(NAV_GROUPS).toHaveLength(3);
    expect(NAV_ITEMS).toHaveLength(13);

    for (const group of NAV_GROUPS) {
      expect(within(nav).getByText(group.label)).toBeVisible();
    }

    const links = within(nav).getAllByRole('link');
    const disabledControls = within(nav).getAllByRole('button');

    /* Both halves are counted from the stage each entry declares: the entries whose stage this run
       does not build must be the controls that cannot act, and every other entry must be a link. */
    expect(links).toHaveLength(NAV_ITEMS.length - STAGE_ENTRIES.length);
    expect(disabledControls).toHaveLength(STAGE_ENTRIES.length);
    expect(links.length + disabledControls.length).toBe(13);
  });

  it('gives every entry this run does not build the tooltip its stage fixes, and no other entry one', () => {
    renderShell('/exceptions');

    /* The table's own invariant, checked against the one function that owns the stage wording: an
       entry that loses its tooltip would become a navigation into a screen that does not exist. */
    for (const item of NAV_ITEMS) {
      expect(item.disabledReason, `${item.id} at stage ${item.stage}`).toBe(
        disabledTooltipFor(item.stage),
      );
    }

    /* The same fact as it reaches the page: the table's disabled set and the page's disabled controls
       agree only when every entry outside this run renders as the control that explains itself. */
    expect(DISABLED_ENTRIES).toHaveLength(STAGE_ENTRIES.length);
    expect(within(navigation()).getAllByRole('button')).toHaveLength(STAGE_ENTRIES.length);
  });

  it.each(DISABLED_ENTRIES)(
    'renders "$label" as a disabled control that explains its stage',
    async ({ label, stage, disabledReason }) => {
      const user = userEvent.setup();
      renderShell('/evidence');

      const nav = navigation();
      const entry = within(nav).getByRole('button', { name: label });
      const expected = stage === 4 ? STAGE_4_TOOLTIP : STAGE_5_TOOLTIP;

      /* Never a link, so the route pattern a stage has not declared can never be followed from the
         navigation, and the control is visibly disabled rather than silently inert (rule P-8). */
      expect(within(nav).queryByRole('link', { name: label })).toBeNull();
      expect(entry).toHaveAttribute('aria-disabled', 'true');

      /* The reason is the table's own string and the module's own fixed export, so a paraphrase in
         either place fails rather than passing as wording. */
      expect(disabledReason).toBe(expected);

      /* Readable before anyone touches the control: it is the control's own description. */
      expect(entry).toHaveAccessibleDescription(expected);

      /* Painted on pointer contact, so the explanation is visible as well as announced. */
      await user.hover(entry);
      expect(screen.getByRole('tooltip')).toHaveTextContent(expected);
      await user.unhover(entry);

      /* Reachable by keyboard although it cannot act, which is what keeps the explanation available
         to a reader who never uses a pointer (rule B-3). */
      await act(async () => {
        entry.focus();
      });
      expect(entry).toHaveFocus();
    },
  );
});

/* ---------------------------------------------------------------------------------------------
 * The navigation's narrow disclosure — rule B-3, QA finding QA2-09
 * ------------------------------------------------------------------------------------------- */

describe('AppShell — the navigation disclosure below md (rule B-3)', () => {
  it('renders the trigger outside the landmark, closed, naming the region it reveals', () => {
    renderShell('/exceptions');

    const trigger = screen.getByRole('button', { name: APP_SHELL_TEXT.navigationToggle });
    const nav = navigation();

    /* A sibling of the landmark, never a child of it: the navigation declares the table's entries and
       no control of its own, which is the count the case above holds it to. */
    expect(nav.contains(trigger)).toBe(false);
    expect(precedes(trigger, nav)).toBe(true);

    /* Closed on first paint, so a phone viewport shows the route instead of 328 px of navigation, and
       the state a reader is told is the state the panel is in. */
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    /* `aria-controls` resolves to the region holding the three groups, which is in the document and
       closed: closed by a class rather than by unmounting, so the relationship is never dangling. */
    const panel = revealedRegionOf(trigger);

    expect(panel.classList.contains('hidden')).toBe(true);

    for (const group of NAV_GROUPS) {
      expect(within(panel).getByText(group.label)).toBeInTheDocument();
    }

    /* `md:block` on the region and `md:hidden` on the trigger are the one breakpoint the two
       presentations share: from `md` up the entries are shown whatever state the disclosure was left
       in, and the trigger that would reveal nothing is not rendered. */
    expect(panel.classList.contains('md:block')).toBe(true);
    expect(trigger.classList.contains('md:hidden')).toBe(true);
  });

  it('opens the region it names on a press and closes it on the next', async () => {
    const user = userEvent.setup();
    renderShell('/exceptions');

    const trigger = screen.getByRole('button', { name: APP_SHELL_TEXT.navigationToggle });
    const panel = revealedRegionOf(trigger);

    /* The announcement and the panel change together, so a reader is never told the region is open
       while it is shut, and the entries are reachable below `md` rather than merely present. */
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel.classList.contains('hidden')).toBe(false);

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(panel.classList.contains('hidden')).toBe(true);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The top bar — AAP §0.12.1, rule P-3
 * ------------------------------------------------------------------------------------------- */

describe('AppShell — the top bar (AAP §0.12.1, rule P-3)', () => {
  it('keeps the specification order: wordmark, badge, theme switch, density switch, role switcher', () => {
    renderShell('/evidence');

    const bar = banner();
    const wordmark = within(bar).getByText(/^site intelligence$/i);
    const themeSwitch = within(bar).getByRole('button', { name: /switch colour theme/i });
    const densitySwitch = within(bar).getByRole('button', { name: /switch row density/i });
    const roleSwitcher = within(bar).getByText(/demo role switcher/i);

    /* DOM order is tab order, so asserting it once is what stops the bar's sequence drifting
       silently while every control still renders. */
    expect(precedes(wordmark, theBadgeLabel())).toBe(true);
    expect(precedes(theBadgeLabel(), themeSwitch)).toBe(true);
    expect(precedes(themeSwitch, densitySwitch)).toBe(true);
    expect(precedes(densitySwitch, roleSwitcher)).toBe(true);
  });

  it('states that the role switcher is a demonstration and not production authorisation', () => {
    renderShell('/evidence');

    /* Visible body text, not a hint or a title: rule P-3 wants the reader to meet it unasked. */
    expect(within(banner()).getByText(/not production authorisation/i)).toBeVisible();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The bar's stable boxes — QA finding QA1-01
 * ------------------------------------------------------------------------------------------- */

describe('AppShell — the top bar reserves the box each reading group settles into (QA1-01)', () => {
  it('gives the freshness group its own line and a height floor, and caps the scope notice', () => {
    renderShell('/exceptions');

    const freshness = within(banner()).getByRole('group', { name: FRESHNESS_STRIP_TEXT.group });
    const scope = within(banner()).getByRole('group', { name: SCOPE_FILTERS_TEXT.group });

    /* The freshness group takes a line of the bar's wrapping row and holds the height its six pills
       settle into — 64 px from `lg` up, the three-row block's 100 px between `md` and `lg`, and 64 px
       below `md` where the pills sit behind the disclosure. A group that instead grew from one notice
       line to the pills' block re-broke every sibling's line and moved the navigation and the route's
       content down the page, which is the shift the desktop audit measured. */
    expect(freshness).toHaveClass('basis-full', 'min-h-16', 'md:min-h-25', 'lg:min-h-16');

    /* The scope group is a column whose height is the fields row plus the sentence's line, reserved
       before the read says whether there is a sentence to paint. */
    expect(scope).toHaveClass('min-h-20');

    /* The sentence is capped at a step of the spacing scale and clamped to one line, so a read that
       answers, refuses or is still pending leaves the bar's height as the reserved line holds it and
       never widens the bar past what its first line carries; it sits on that reserved line rather than
       sharing the fields' line. */
    const notice = within(scope).getByText(SCOPE_FILTERS_TEXT.reading);

    expect(notice).toHaveClass('max-w-80', 'truncate', 'xl:max-w-xl');
    expect(notice).not.toHaveClass('basis-full');
  });
});

/* ---------------------------------------------------------------------------------------------
 * Wall mode — AAP §0.12.4
 * ------------------------------------------------------------------------------------------- */

describe('AppShell — wall mode (AAP §0.12.4)', () => {
  it('hides the navigation and leaves the top bar, the badge and the route in place', () => {
    renderShell('/evidence');
    expect(navigation()).toBeInTheDocument();

    act(() => {
      useShellStore.getState().setWallMode(true);
    });

    /* Presentation mode removes the navigation and nothing else: the route the reader is on, the
       identity and controls of the bar, and the badge rule P-1 requires all stay mounted. */
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByText('stage notice')).toBeInTheDocument();
    expect(banner()).toBeInTheDocument();
    expect(theBadgeLabel()).toBeVisible();
    expect(mainContent()).toBeInTheDocument();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The shell's own copy — rules P-4, P-7
 * ------------------------------------------------------------------------------------------- */

describe('AppShell — the shell states no barred claim (rules P-4, P-7)', () => {
  it('renders none of the claim vocabulary and names no barred product', () => {
    renderShell('/evidence');

    /* Anchored on the badge so the scan cannot pass by rendering an empty page. */
    expect(theBadgeLabel()).toBeVisible();

    const text = document.body.textContent ?? '';

    for (const pattern of BARRED_CLAIM_PATTERNS) {
      expect(text, `the shell states ${String(pattern)}`).not.toMatch(pattern);
    }

    expect(text.toLowerCase()).not.toContain(BARRED_PRODUCT_NAME.toLowerCase());
  });
});

/* ---------------------------------------------------------------------------------------------
 * The reset's announcement — rule B-3, WCAG 2.2 SC 4.1.3
 * ------------------------------------------------------------------------------------------- */

describe('AppShell — a completed reset announces itself (rule B-3)', () => {
  it('reports the reset in a status region that outlives the panel it closed', async () => {
    const user = userEvent.setup();
    renderShell('/exceptions');

    /* The panel is reached the way a reader reaches it, from the badge the shell mounts on every
       route, and the reset is pressed in the panel: no store call and no test hook is used. */
    await user.click(screen.getByRole('button', { name: new RegExp(`^${BADGE_LABEL}`) }));

    const dialog = screen.getByRole('dialog');

    await user.click(
      within(dialog).getByRole('button', {
        name: SIMULATION_CONTROLS_TEXT.resetLabel,
      }),
    );

    /* The reset closes the panel it was taken from, so the press leaves no dialog behind. */
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    /* What is left is the status message: the outcome is programmatically determinable rather than
       being the disappearance of a dialog that a reader who cannot see the screen never meets
       (WCAG 2.2 SC 4.1.3). It is visually hidden, because the panel's closing is all a sighted reader
       needs, and it says nothing a figure or a record identifier would (rule P-6). */
    const announcement = screen.getByText(SIMULATION_CONTROLS_TEXT.resetCompleted);

    expect(announcement).toHaveAttribute('role', 'status');
    expect(announcement).toHaveClass('sr-only');
  });
});

