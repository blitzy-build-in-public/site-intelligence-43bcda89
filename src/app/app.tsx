/**
 * The composition root and the shell of Site Intelligence.
 *
 * `App` is the one component the Vite entry mounts: it wraps the application in `AppProviders` — the
 * query cache, the service boundary and the theme, in the order `src/app/providers.tsx` fixes — and
 * hands React Router a browser router built from `appRoutes`, so this file is the single place a route
 * table is bound to a provider tree. `AppShell` is the layout every route renders inside: the skip
 * link, the top bar carrying the persistent badge, the navigation, and the `<main>` landmark holding
 * the router outlet.
 *
 * WHY THE BADGE IS BUILT HERE AND NOWHERE ELSE. One `SimulatedDataBadge` exists in the application, and
 * rule P-1 wants it on every route, including the stage-notice pages and the not-found page. Both hold
 * only if it sits in the shell above the outlet and is mounted once: a badge inside a route would be
 * one screen's, and a second mount anywhere would put two on a page. `src/app/top-bar.tsx` therefore
 * takes the element through its `badge` slot rather than importing the component, and this file builds
 * it with the label selected from `SIM_LABELS` — the tuple that owns the seven specification §5.3
 * strings, so the text is never respelled here — and with the activation that opens the simulation
 * popover through the shell store's `simulationOpen`, which is how the demonstration's clock reaches
 * the reader from any route (AAP 0.10, T-15).
 *
 * WHY THE NAVIGATION IS RENDERED HERE. It is the shell's, not a screen's: every route shows the same
 * entries in the same three groups, and the disabled state of the entries whose stage this run does not
 * build has to be the same evidently disabled control on every route. `NAV_GROUPS` in
 * `src/app/nav-items.ts` owns those entries and their tooltips; this file only decides how an entry
 * renders — a `NavLink` for an entry that navigates, so React Router marks the current route with
 * `aria-current`, and an `ActionButton` for an entry that cannot navigate, so its tooltip is painted on
 * hover and focus and announced as its description. A disabled entry is never a link, so a
 * parameterised path such as `/plants/:plantId/plan` is never followed (rule P-8).
 *
 * WALL MODE. The canvas's presentation mode hides the navigation, and the flag for it is the shell
 * store's `wallMode`: `src/app/router.tsx` hands the canvas screen the setter as `onWallModeChange`, so
 * the screen asks and the shell obeys. The top bar, the badge and the outlet stay mounted either way,
 * so nothing a reader can do in wall mode takes the route they are on off the screen.
 *
 * WHAT THIS FILE DOES NOT DO, AND WHY.
 * - It reads no data. There is no `useService()`, no `fetch`, no query and no `useEffect` here: the
 *   provider tree mounts the service boundary and every screen reads through the cache (rule P-2).
 * - It renders no footer, no second navigation, no second badge, no popover, no toast region and no
 *   diagnostic overlay. The top bar owns the simulation popover, the badge is singular, and the
 *   demonstration's diagnostics are the `traceId` a `Problem` carries.
 * - It types no figure, amount, identifier or record value (rule P-6), and it writes no user-facing
 *   string beyond the skip link and the landmark name — every navigation label comes from the table.
 * - It claims nothing about the product: nothing here states or implies sovereignty, copy prevention,
 *   tamper resistance or a certification (rule P-4), and no real company, customer or model is named
 *   (rule P-7).
 * - It holds no test hook: no global, no query parameter and no branch that exists for a test's benefit.
 *
 * Rules served: P-1 (one badge, above the outlet, on every route), P-2 (no data access here), P-4, P-6,
 * P-7, P-8 (every entry navigates or is disabled with its explanation), B-1 (nothing here requests
 * anything), B-2 (no configuration, no credential) and B-3 (the skip link, the named navigation
 * landmark, the single `main` landmark, DOM-order focus and a visible focus ring on every stop).
 */
import { useState } from 'react';
import type { ReactElement } from 'react';

import { NavLink, Outlet, RouterProvider, createBrowserRouter } from 'react-router';

import { SimulatedDataBadge } from '../components/simulated-data-badge';
import {
  ActionButton,
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
} from '../components/tooltip';
import { SIM_LABELS } from '../types/primitives';
import type { SimLabel } from '../types/primitives';
import { useGlobalShortcuts } from './keyboard-shortcuts';
import { NAV_GROUPS } from './nav-items';
import type { NavItem } from './nav-items';
import { AppProviders, useShellStore } from './providers';
import { appRoutes } from './router';
import { TopBar } from './top-bar';

/* ---------------------------------------------------------------------------------------------
 * The fixed strings and the one label this file selects
 * ------------------------------------------------------------------------------------------- */

/**
 * The `Simulated data` label of specification §5.3, selected from the tuple that owns the seven fixed
 * strings rather than written again here.
 *
 * `SIM_LABELS` has one owner, so a change to the tuple is deliberate in `src/types/primitives.ts`
 * rather than a silent drift in a copy of the text, and the first member is the demonstration-wide
 * label AAP 0.10 lists first. The annotation keeps the selection honest: if the tuple is ever
 * reordered, the assignment still compiles and a component test reading `SIM_LABELS` alongside the
 * badge's rendered text is what catches the meaning turning into a different label (rule P-1).
 */
const SIMULATED_DATA_LABEL: SimLabel = SIM_LABELS[0];

/**
 * The shell's own copy, which is the whole of the user-facing text this file writes.
 *
 * The skip link's label, the navigation landmark's accessible name and the id the skip link targets are
 * shell chrome rather than a screen's content, and rule P-7 leaves them nothing to name but "main
 * content" and the navigation itself. They are a `const` object rather than text inline in the JSX so a
 * suite can name them instead of retyping them, the way `TOP_BAR_TEXT` owns the wordmark.
 */
export const APP_SHELL_TEXT = {
  /**
   * The skip link's label. WCAG 2.2 SC 2.4.1 requires a mechanism to bypass the blocks that repeat on
   * every page, and the navigation and the top bar are exactly those blocks (rule B-3).
   */
  skipLink: 'Skip to main content',

  /**
   * The navigation landmark's accessible name.
   *
   * A `<nav>` without one is announced only as "navigation", and the shell is not the only navigation a
   * screen could grow, so this one names itself to be distinguishable from any other (rule B-3).
   */
  navLandmark: 'Primary',

  /**
   * The id the skip link targets and the `main` landmark carries.
   *
   * Held as data rather than written twice, so the anchor and its destination cannot drift apart: the
   * link's `href` is derived from this value and the landmark's `id` is the same value.
   */
  mainContentId: 'main-content',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The layout, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The skip link: the first focusable element on every route, visually hidden until a keyboard reader
 * reaches it.
 *
 * `sr-only` hides it without taking it out of the accessibility tree or the tab order — a `hidden` or
 * `display: none` link would be unreachable, which is the opposite of the bypass mechanism WCAG 2.2
 * SC 2.4.1 asks for. `focus:not-sr-only` restores it to normal flow when focused, so it becomes the
 * first thing painted, above the top bar, rather than floating over it: no position utility is needed
 * and the link cannot cover the control a reader was about to use.
 *
 * The visible state composes the shared control structure — the 24x24 px minimum target, the control
 * radius, the 2 px focus ring — with the raised surface the secondary control uses, so the link looks
 * like the one control it is while every value stays a role token and both themes keep their measured
 * contrast (rule B-3).
 */
const SKIP_LINK_CLASSES = [
  'sr-only focus:not-sr-only',
  'focus:inline-flex focus:min-h-6 focus:min-w-6 focus:items-center focus:justify-center',
  'focus:rounded-control focus:border focus:border-control-boundary focus:bg-surface-2',
  'focus:px-3 focus:py-1 focus:text-13 focus:font-medium focus:text-text-primary',
  'focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring',
].join(' ');

/**
 * The navigation landmark: a full-width strip below the top bar, separated from it by the decorative
 * hairline in its per-theme role — the token layer exposes no shadow, so a boundary is the only
 * separation available (specification §4.3).
 *
 * `w-full min-w-0` is what lets the entry rows below wrap instead of overflowing sideways at a narrow
 * window and at 200 % zoom: no pixel width is fixed anywhere in the strip, so the rows reflow onto
 * further lines while keeping their DOM order (rule B-3).
 */
const NAV_CLASSES = 'w-full min-w-0 border-b border-hairline bg-ground';

/**
 * One group of entries: a wrapping row with its label first, so the three groups read as three lines
 * rather than as one undifferentiated run of chips.
 *
 * The row wraps at its content's natural width and declares no breakpoint, because no input fixes one
 * for the shell's navigation: at a narrow window a group takes the lines it needs, and the group order
 * — the order `NAV_GROUPS` declares — never changes.
 */
const NAV_GROUP_CLASSES = 'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2';

/** A group's label: the 12 px step of the specification §4.3 scale in the caption role. */
const NAV_GROUP_LABEL_CLASSES = 'text-12 text-text-caption';

/** The group's entries, in the table's order, wrapping as one flex line. */
const NAV_LIST_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2';

/**
 * One entry, whether it navigates or cannot: the secondary-control shape and states that
 * `src/components/tooltip.tsx` owns, so an enabled entry and the disabled `ActionButton` beside it are
 * the same control in the same box and neither can drift from the other.
 *
 * The current route's entry is marked by React Router's own `aria-current="page"`, and the marking is
 * painted through the `aria-[current=page]:` variants rather than by a second class list chosen at
 * render time: those variants are emitted after the unprefixed utilities they override, exactly as the
 * `hover:` states in the shared list already rely on, so the accent boundary, the raised fill, the
 * primary text role and the heavier weight all win while the entry is current. The label's weight is
 * the part of the marking that is not a colour, so the state does not rest on hue alone (rule B-3).
 */
const NAV_ENTRY_CLASSES = [
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
  'aria-[current=page]:border-accent aria-[current=page]:bg-surface-1',
  'aria-[current=page]:text-text-primary aria-[current=page]:font-semibold',
].join(' ');

/**
 * The content area: the page's `main` landmark, and the box every screen's own root renders inside.
 *
 * A screen supplies a `flex min-w-0 flex-col` column with no padding of its own, so the inline padding
 * and block padding here are the page gutter, written once for all nine screens and the two shell
 * pages instead of in each of them. `gap-6` separates a screen's own blocks; `min-w-0` is what lets a
 * wide table, chart or map scroll inside the column instead of widening the document.
 *
 * The landmark carries `tabIndex={-1}` so the skip link moves focus into it in browsers that require a
 * focusable target, and `-1` keeps it out of the tab order, so it adds no stop of its own (rule B-3).
 */
const MAIN_CLASSES = 'flex min-w-0 flex-col gap-6 px-4 py-4';

/* ---------------------------------------------------------------------------------------------
 * The navigation
 * ------------------------------------------------------------------------------------------- */

/**
 * One navigation entry, rendered as the kind of control its declarative state allows.
 *
 * An entry whose `disabledReason` is `null` navigates, and it is a `NavLink` so React Router supplies
 * the `aria-current="page"` marking the entry's current appearance is painted from. An entry carrying
 * a reason cannot navigate: it renders through `ActionButton`, the one control that carries its own
 * reason for being unable to act, disabled, with that exact reason attached — painted on hover and
 * focus and announced as the control's description — so rule
 * P-8's explanation is reachable by keyboard rather than hidden behind a native `disabled` attribute.
 * The reason is the table's own string, never a copy of it, and the entry is never a link, so the
 * pattern a stage has not yet declared (such as `/plants/:plantId/plan`) is never followed.
 *
 * @param props The table entry to render.
 * @returns The link, or the disabled action control, for that entry.
 */
function NavEntry({ item }: { readonly item: NavItem }): ReactElement {
  if (item.disabledReason === null) {
    return (
      <NavLink to={item.to} className={NAV_ENTRY_CLASSES}>
        {item.label}
      </NavLink>
    );
  }

  return (
    /* The reason opens below its entry rather than above it. The navigation is a strip under the top
       bar whose three group rows stack, so a hint opening above a lower row paints over the row above
       it and hides entries a reader is comparing — "Arrives in stage S4" covered Approvals and Audit
       trail before this. Opening away from the strip keeps every entry legible (rule P-8). It is a
       preference: the tooltip still moves the hint to the other side when this one cannot fit it. */
    <ActionButton disabled disabledReason={item.disabledReason} hintPlacement="bottom">
      {item.label}
    </ActionButton>
  );
}

/**
 * The shell's navigation: one `nav` landmark holding the three labelled groups of the navigation table.
 *
 * Each group is a caption and a list, so the entries are announced as a list of links and controls and
 * the caption above each list says what the group is for. The caption is a `<p>` rather than a heading
 * deliberately: a heading set would give every route a stack of level-two headings above the page's own
 * level-one heading, which is exactly the document outline a reader navigating by heading would then
 * have to wade through (rule B-3).
 *
 * The component reads the table and nothing else: it derives no route, holds no state and renders no
 * control of its own, so an entry it draws is exactly the entry the plan declares.
 *
 * @returns The named navigation landmark with its three groups inside it.
 */
function PrimaryNavigation(): ReactElement {
  return (
    <nav aria-label={APP_SHELL_TEXT.navLandmark} className={NAV_CLASSES}>
      {NAV_GROUPS.map((group) => (
        <div key={group.id} className={NAV_GROUP_CLASSES}>
          <p className={NAV_GROUP_LABEL_CLASSES}>{group.label}</p>
          <ul className={NAV_LIST_CLASSES}>
            {group.items.map((item) => (
              <li key={item.id}>
                <NavEntry item={item} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The shell and the composition root
 * ------------------------------------------------------------------------------------------- */

/**
 * The layout every route renders inside: the skip link, the top bar, the navigation and the outlet.
 *
 * The order is the order of the DOM and therefore the order of the tab sequence: the skip link first,
 * so a keyboard reader can leave the repeated blocks before reaching them; the top bar next, because it
 * holds the product's identity and the controls that change the whole session; the navigation; and the
 * content last, where the skip link lands (rule B-3).
 *
 * The badge is built here and passed into the top bar's slot, which places it among the bar's nine
 * positions. One element is built, so one badge renders — on every route, because the shell is above
 * the outlet rather than inside a route (rule P-1).
 *
 * Wall mode removes the navigation and nothing else: the top bar, the badge and the outlet are
 * unconditional, so a reader in presentation mode keeps the route they are on and every control the bar
 * carries.
 *
 * @returns The shell's landmarks and the router outlet they frame.
 */
export function AppShell(): ReactElement {
  useGlobalShortcuts();

  const wallMode = useShellStore((state) => state.wallMode);
  const setSimulationOpen = useShellStore((state) => state.setSimulationOpen);
  const simulationOpen = useShellStore((state) => state.simulationOpen);

  const badge = (
    <SimulatedDataBadge
      label={SIMULATED_DATA_LABEL}
      onActivate={() => {
        setSimulationOpen(true);
      }}
      expanded={simulationOpen}
    />
  );

  return (
    <>
      <a href={`#${APP_SHELL_TEXT.mainContentId}`} className={SKIP_LINK_CLASSES}>
        {APP_SHELL_TEXT.skipLink}
      </a>

      <TopBar badge={badge} />

      {wallMode ? null : <PrimaryNavigation />}

      <main id={APP_SHELL_TEXT.mainContentId} className={MAIN_CLASSES} tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}

/**
 * The application: the provider tree with the shell's route table bound to the browser's history.
 *
 * The router is created once per mount, lazily, inside a state initialiser. A module-level
 * `createBrowserRouter` would run as a side effect of importing this file — it reads and writes
 * `window.history` — and every test that imports the module, or anything that imports it, would create a
 * second router and mutate the origin it runs in. Creating it in the initialiser instead means the
 * browser history is touched only when the application actually mounts, and only once.
 *
 * `appRoutes` hangs off a single layout route whose element is this shell, which is what puts the top
 * bar, the badge and the navigation above every screen and keeps each screen's own heading inside the
 * `main` landmark the skip link targets (AAP 0.12.4, rule P-1).
 *
 * @returns The application.
 */
export function App(): ReactElement {
  const [router] = useState(() =>
    createBrowserRouter([{ path: '/', element: <AppShell />, children: appRoutes }]),
  );

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
