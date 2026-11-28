/**
 * Component suite for `src/app/top-bar.tsx`: the shell's banner landmark and the nine positions the
 * specification fixes inside it (functional requirement F1, AAP §0.12.1).
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP.
 * - The root is the page's banner landmark, holds one row, and declares no heading of its own: the
 *   product's name is a `<p>`, because each screen's level-one heading is `PageHeader`'s and a heading
 *   here would give every route a second top-level one (rule B-3).
 * - The nine positions appear in the order the module arranges them: the wordmark, the scope filters,
 *   the identifier search, the freshness strip, the sovereignty pill, the simulated-data badge the
 *   shell hands in, the simulation popover, the theme switch, the density switch and the role
 *   switcher. The case reads the row's own children and names each by the marker its owner gives it,
 *   so a reordered, missing or duplicated position fails here. The badge sits at position six — the
 *   place the specification fixes for the one badge — and the popover immediately after it, which is
 *   the position its own module records.
 * - The bar composes the real child components and no stubs. Each child's own contract is asserted
 *   through the bar: the scope filters' named group and their two labelled controls, the freshness
 *   strip's named group, the search field's accessible name and its hint as the input's description,
 *   the sovereignty pill's declared posture, both presentation switches by the names they give
 *   themselves, and the role switcher's label and its non-authorisation note (rule P-3). A stub in
 *   place of any of them would fail at least one of these.
 * - The badge is the caller's element, placed once. The shell builds it, because it is mounted once in
 *   the whole application and in this position; the bar neither imports the badge nor renders one of
 *   its own (rule P-1). The case passes a marker element and asserts the same node reached the bar,
 *   once.
 *
 * THE SERVICE BOUNDARY IS MOCKED AT THE PROVIDER (rule P-2), with the specifier the bar's children
 * read through. Its port answers every member with a promise that never settles, so each child renders
 * its busy state and no figure is produced; `useActiveUser` reports no persona and `useDemonstration`
 * reports no capability, which is the state the role switcher explains in its own words. The bar is
 * mounted through the module's own provider tree, because the two switches and the query cache come
 * from it: nothing here re-creates that tree.
 *
 * NO FIGURE AND NO RECORD IDENTIFIER IS TYPED (rule P-6). Every label asserted below is read from the
 * module that owns it — `TOP_BAR_TEXT`, `SCOPE_FILTERS_TEXT`, `SEARCH_FIELD_TEXT`,
 * `FRESHNESS_STRIP_TEXT`, `DECLARED_POSTURE_LABEL`, `THEME_LABELS`, `DENSITY_LABELS` and
 * `ROLE_SWITCHER_LABEL` — and the badge marker is this suite's own fixture.
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite proves the bar's structure, order and composition.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DENSITY_LABELS, THEME_LABELS } from '../theme/theme-provider';
import { AppProviders, useShellStore } from './providers';
import { FRESHNESS_STRIP_TEXT } from './freshness-strip';
import { ROLE_SWITCHER_LABEL, ROLE_SWITCHER_NOTE } from './role-switcher';
import { SCOPE_FILTERS_TEXT } from './scope-filters';
import { SEARCH_FIELD_TEXT } from './search-field';
import { DECLARED_POSTURE_LABEL } from './sovereignty-pill';
import { TOP_BAR_TEXT, TopBar } from './top-bar';

/* ---------------------------------------------------------------------------------------------
 * The service boundary, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/** The one prop the pass-through provider receives. */
interface ServiceProviderStubProps {
  /** The provider tree's children, rendered as they are. */
  readonly children?: unknown;
}

/**
 * Replaces the provider module the bar's children read through.
 *
 * The port answers every member it is asked for with a promise that never settles, so each child
 * renders its busy state and no figure, record or persona is produced anywhere in this suite.
 */
vi.mock('../services/service-provider', () => {
  const pending = (): Promise<never> => new Promise<never>(() => undefined);

  return {
    ServiceProvider: ({ children }: ServiceProviderStubProps) => children,
    useService: () =>
      new Proxy(
        {},
        {
          get: (_target, property) => (typeof property === 'string' ? pending : undefined),
        },
      ),
    useActiveUser: () => null,
    useDemonstration: () => null,
    ACTIVE_USER_QUERY_KEY: ['getActiveUser'],
  };
});

/* ---------------------------------------------------------------------------------------------
 * The fixtures and the markers this suite reads
 * ------------------------------------------------------------------------------------------- */

/** The marker the suite passes as the badge, so the node the bar placed can be identified. */
const BADGE_MARKER = 'the-badge-the-shell-built';

/** The row's positions in the order the module arranges them, with the popover closed. */
const CLOSED_ORDER: readonly string[] = [
  'wordmark',
  'scope filters',
  'search',
  'freshness strip',
  'sovereignty pill',
  'badge',
  'theme switch',
  'density switch',
  'role switcher',
];

/** The same list with the simulation popover open, which places it after the badge. */
const OPEN_ORDER: readonly string[] = [
  'wordmark',
  'scope filters',
  'search',
  'freshness strip',
  'sovereignty pill',
  'badge',
  'simulation controls',
  'theme switch',
  'density switch',
  'role switcher',
];

/** The badge element the shell would build for position six. */
function badge(): ReactElement {
  return <span data-testid={BADGE_MARKER} />;
}

/** The bar's one row: the flex line its positions are children of. */
function row(): HTMLElement {
  const banner = screen.getByRole('banner');
  const line = banner.firstElementChild;

  if (!(line instanceof HTMLElement)) {
    throw new Error('The banner rendered no row.');
  }

  return line;
}

/**
 * Names one of the row's children by the marker its own module gives it.
 *
 * The markers are what each child already carries: the two named groups, the search field's combobox,
 * the declared posture sentence, the badge marker, the popover's dialog and the words each switch and
 * the role switcher print. Nothing is added to a component for this suite's benefit.
 */
function positionOf(child: Element): string {
  const text = child.textContent ?? '';

  if (child.matches(`[data-testid="${BADGE_MARKER}"]`)) {
    return 'badge';
  }
  if (child.getAttribute('aria-label') === SCOPE_FILTERS_TEXT.group) {
    return 'scope filters';
  }
  if (child.getAttribute('aria-label') === FRESHNESS_STRIP_TEXT.group) {
    return 'freshness strip';
  }
  if (child.querySelector('[role="combobox"]') !== null) {
    return 'search';
  }
  if (text.includes(TOP_BAR_TEXT.productName)) {
    return 'wordmark';
  }
  if (text.includes(DECLARED_POSTURE_LABEL)) {
    return 'sovereignty pill';
  }
  if (child.querySelector('[role="dialog"]') !== null) {
    return 'simulation controls';
  }
  if (text.includes(ROLE_SWITCHER_LABEL)) {
    return 'role switcher';
  }
  if (text.includes(THEME_LABELS.command)) {
    return 'theme switch';
  }
  if (text.includes(DENSITY_LABELS.comfortable)) {
    return 'density switch';
  }

  throw new Error(`The row held a position this suite cannot name: ${text}`);
}

/** The row's positions, named in the order they are rendered. */
function positions(): readonly string[] {
  return Array.from(row().children).map(positionOf);
}

/**
 * Mounts the bar through the module's own provider tree, with the badge the shell would build.
 *
 * It is mounted inside a memory router for the same reason the shell mounts it there: the search field
 * and the role switcher navigate, so the bar is only ever rendered below a router in the application,
 * and a suite that rendered it outside one would prove a composition the product never has.
 */
function renderBar(): void {
  render(
    <MemoryRouter>
      <AppProviders>
        <TopBar badge={badge()} />
      </AppProviders>
    </MemoryRouter>,
  );
}

/* ---------------------------------------------------------------------------------------------
 * Every case starts from the seeded shell with the popover closed
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  useShellStore.getState().resetShell();
});

/* ---------------------------------------------------------------------------------------------
 * The landmark
 * --------------------------------------------------------------------------------------------- */

describe('TopBar — the landmark', () => {
  it('is the page’s banner landmark, holding one row and declaring no heading', () => {
    renderBar();

    const banner = screen.getByRole('banner');

    expect(banner.tagName).toBe('HEADER');
    expect(banner.children).toHaveLength(1);
    expect(screen.getAllByRole('banner')).toHaveLength(1);

    /* The product's name is a paragraph, not a heading: the screen's level-one heading belongs to
       `PageHeader`, so a heading here would give every route a second top-level one (rule B-3). */
    expect(within(banner).queryAllByRole('heading')).toStrictEqual([]);
    expect(screen.getByText(TOP_BAR_TEXT.productName).tagName).toBe('SPAN');
    expect(screen.getByText(TOP_BAR_TEXT.company).tagName).toBe('SPAN');
    expect(screen.getByText(TOP_BAR_TEXT.productName).closest('p')?.textContent).toBe(
      `${TOP_BAR_TEXT.productName}${TOP_BAR_TEXT.company}`,
    );
  });
});

/* ---------------------------------------------------------------------------------------------
 * The nine positions
 * ------------------------------------------------------------------------------------------- */

describe('TopBar — the positions and their order', () => {
  it('renders the nine positions in the order the module arranges them', () => {
    renderBar();

    expect(positions()).toStrictEqual(CLOSED_ORDER);
  });

  it('stands the simulation popover after the badge it was opened from', () => {
    useShellStore.getState().setSimulationOpen(true);
    renderBar();

    expect(positions()).toStrictEqual(OPEN_ORDER);
  });

  it('places the caller’s badge once, and renders no badge of its own', () => {
    renderBar();

    const placed = screen.getAllByTestId(BADGE_MARKER);

    expect(placed).toHaveLength(1);
    expect(row().contains(placed[0] ?? null)).toBe(true);

    /* The bar imports no badge and renders no second one: the specification's label appears nowhere
       in the bar's own text, because the label belongs to the element the shell built. */
    expect(screen.queryAllByText(/simulated data/iu)).toStrictEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The children the bar composes
 * ------------------------------------------------------------------------------------------- */

describe('TopBar — the children it composes', () => {
  it('composes the real scope filters, freshness strip, search field and sovereignty pill', () => {
    renderBar();

    /* The scope filters' named group, holding their two labelled controls. */
    const filters = screen.getByRole('group', { name: SCOPE_FILTERS_TEXT.group });

    expect(within(filters).getByLabelText(SCOPE_FILTERS_TEXT.plantLabel)).toBeInTheDocument();
    expect(within(filters).getByLabelText(SCOPE_FILTERS_TEXT.productLabel)).toBeInTheDocument();

    /* The freshness strip's named group, saying what it is doing with the in-flight read. */
    const strip = screen.getByRole('group', { name: FRESHNESS_STRIP_TEXT.group });

    expect(strip.textContent).toBe(FRESHNESS_STRIP_TEXT.reading);

    /* The search field's own accessible name, with its hint as the input's description. */
    const search = screen.getByRole('combobox', { name: SEARCH_FIELD_TEXT.label });

    expect(search.getAttribute('aria-describedby')).not.toBeNull();
    expect(screen.getByText(SEARCH_FIELD_TEXT.hint).id).toBe(
      search.getAttribute('aria-describedby'),
    );

    /* The declared posture, and no simulation label of the bar's own: the pill tags itself. */
    expect(screen.getByText(DECLARED_POSTURE_LABEL)).toBeInTheDocument();
  });

  it('composes the real presentation switches and the role switcher, with its demonstration note', () => {
    renderBar();

    /* Both switches are the modules' own controls: each offers the other value of its pair by name,
       so a stub in their place would have to reproduce the labels those modules print to pass. The
       theme in force is the module's default, so its switch offers Paper; the density in force with
       no persona known is the compact fallback, so its switch offers Comfortable. */
    expect(
      screen.getByRole('button', { name: new RegExp(THEME_LABELS.paper) }),
    ).toBeInTheDocument();

    /* The density switch prints the density in effect and offers the other one, so the label it
       offers is derived from the density the provider applied rather than typed here. */
    const densityInEffect = document.documentElement.dataset.density;
    const offeredDensity = densityInEffect === 'compact' ? 'comfortable' : 'compact';

    expect(['compact', 'comfortable']).toContain(densityInEffect);
    expect(
      screen.getByRole('button', { name: new RegExp(DENSITY_LABELS[offeredDensity]) }),
    ).toBeInTheDocument();

    /* The theme in effect is stated beside its switch, not only inside the control's name. */
    expect(screen.getByText(THEME_LABELS.command)).toBeInTheDocument();

    /* Rule P-3: the switcher names itself a demonstration control and states in body text that the
       checks behind it are not production authorisation. */
    expect(screen.getByText(ROLE_SWITCHER_LABEL)).toBeInTheDocument();
    expect(screen.getByText(ROLE_SWITCHER_NOTE)).toBeInTheDocument();
  });
});
