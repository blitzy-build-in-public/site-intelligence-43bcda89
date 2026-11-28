/**
 * Component suite for `src/app/router.tsx`: the route table the shell mounts as its outlet's children
 * (AAP §0.12.4, AAP §0.13.2 "the router declares every route once").
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP.
 * - Every route `src/app/nav-items.ts` names is declared, and nothing else is: the table's child paths
 *   are compared, as a set, with the navigation's enabled entries plus its further routes. A route the
 *   table forgot fails here, and so does a path nothing in the application names.
 * - The entry redirect sends each persona to its own home route: the table's index route resolves
 *   through `entryRouteFor` for every member of the `Role` union, and the case reads each persona's
 *   expected home from that same function rather than restating the map. A persona with no session yet
 *   takes the defensive default, which is the one case the map documents as not a landing route.
 * - A stage-notice route renders the notice page, with the sentence `stageNoticeSentence` builds for
 *   that stage and that entry's own name, and the one link that page offers. The case reads both from
 *   the modules that own them, so a reworded notice fails here through the heading.
 * - An undeclared path renders the not-found page rather than a blank outlet: one level-one heading, a
 *   live link to the exception queue, and none of the stage-notice page's own wording.
 *
 * THE TABLE IS MOUNTED AS IT IS, through a memory router over the exported `appRoutes`. Nothing in the
 * table is rewritten for this suite, so a path that differs between the table and the navigation is
 * the failure the first case reports.
 *
 * THE SERVICE BOUNDARY IS MOCKED AT THE PROVIDER (rule P-2), with the specifier the screens' provider
 * imports. Its port answers every member with a promise that never settles, so each screen a route
 * mounts renders its busy state and no figure, record or persona is produced anywhere in this suite:
 * the route table is the subject, not the screens. Nothing here imports `src/seed`, a mock adapter or
 * the API client, and the persona the redirect reads is a fixture of this suite's own.
 *
 * NO FIGURE AND NO RECORD IDENTIFIER IS TYPED (rule P-6). The one path this suite spells is an address
 * nothing in the application names, which is exactly what an unknown route is; every declared path,
 * every label and the notice sentence are read from their owners.
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite proves where each address lands.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EXCEPTION_QUEUE_PATH } from '../types/routes';
import type { ActiveUser, Role } from '../types/entities';
import { FURTHER_ROUTES, NAV_ITEMS, entryRouteFor } from './nav-items';
import { appRoutes } from './router';
import { STAGE_NOTICE_LINK_LABEL, stageNoticeSentence } from './stage-notice-page';

/* ---------------------------------------------------------------------------------------------
 * The service boundary, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/** The persona the stubbed boundary reports at start-up, set per case. */
const session = vi.hoisted(() => ({ activeUser: null as ActiveUser | null }));

/** The one prop the pass-through provider receives. */
interface ServiceProviderStubProps {
  /** The provider tree's children, rendered as they are. */
  readonly children?: unknown;
}

/**
 * Replaces the provider module every screen reads through.
 *
 * `ServiceProvider` passes the tree straight through and `useActiveUser` answers the persona the case
 * set. The port answers each member it is asked for with a promise that never settles, so no screen in
 * this suite can produce a figure and no record is ever reached: the route table is what is under test.
 * The proxy is deliberate — the table mounts twelve screens, and a suite that listed their port
 * members would fail on a read it forgot rather than on the route it meant to prove.
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
    useActiveUser: () => session.activeUser,
    useDemonstration: () => null,
    ACTIVE_USER_QUERY_KEY: ['getActiveUser'],
  };
});

/* ---------------------------------------------------------------------------------------------
 * The fixtures this suite fabricates — no record identifier, no figure (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/** The router the harness hands back, so a case can read where the table landed. */
type MemoryRouter = ReturnType<typeof createMemoryRouter>;

/** Every persona the contracts' `Role` union admits, so the redirect is proven for each one. */
const ROLES: readonly Role[] = [
  'material-planner',
  'plant-manager',
  'head-of-supply-chain',
  'platform-administrator',
  'production-planner',
  'auditor',
  'supplier-quality-engineer',
  'external-supplier-engineer',
];

/** The persona the stubbed start-up reports for a role, which is all the redirect reads. */
function personaOf(role: Role): ActiveUser {
  return {
    id: 'a persona fixture',
    name: 'A persona fixture',
    role,
    plantIds: [],
    permissions: [],
    homeRoute: entryRouteFor(role),
  };
}

/** An address no route in the table declares, which is what the catch-all exists for. */
const UNDECLARED_PATH = '/a-page-this-demonstration-does-not-declare';

/** The disabled navigation entry whose stage the suite mounts, read from the table itself. */
const STAGE_NOTICE_ITEM = NAV_ITEMS.find((item) => item.stage === 4 && item.disabledReason !== null);

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/** A table path in the form a memory router matches it: the published pattern without its slash. */
function childPathOf(pattern: string): string {
  return pattern.startsWith('/') ? pattern.slice(1) : pattern;
}

/** Every child path the exported table declares, in declaration order. */
function declaredPaths(): readonly string[] {
  return appRoutes.flatMap((route) =>
    typeof route.path === 'string' && route.path !== '*' ? [route.path] : [],
  );
}

/** Every child path `src/app/nav-items.ts` names: the enabled entries and the further routes. */
function namedPaths(): readonly string[] {
  const entries = NAV_ITEMS.filter((item) => item.disabledReason === null).map((item) =>
    childPathOf(item.to),
  );
  const further = FURTHER_ROUTES.map((route) => childPathOf(route.path));

  return [...entries, ...further].filter((path) => path !== '');
}

/**
 * Mounts the exported route table at one address and hands the router back.
 *
 * The cache is built per mount with retries off, so a screen's read settles once or not at all and
 * no entry survives into the next case.
 */
function renderAt(path: string): MemoryRouter {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });

  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

/** The page's one level-one heading, which every route's own page header owns. */
function heading(): HTMLElement {
  return screen.getByRole('heading', { level: 1 });
}

/* ---------------------------------------------------------------------------------------------
 * Every case starts from a session with no persona
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  session.activeUser = null;
});

/* ---------------------------------------------------------------------------------------------
 * The table
 * ------------------------------------------------------------------------------------------- */

describe('appRoutes — the table', () => {
  it('declares every route the navigation table names, and no other path', () => {
    const declared = declaredPaths();
    const named = namedPaths();

    /* A set comparison both ways: a route the table forgot and a path nothing in the application
       names are each a failure, and a duplicate declaration is one too. */
    expect([...declared].sort()).toStrictEqual([...new Set(named)].sort());
    expect(new Set(declared).size).toBe(declared.length);
  });

  it('declares an index route to resolve the root address and a catch-all for every other one', () => {
    expect(appRoutes.filter((route) => route.index === true)).toHaveLength(1);
    expect(appRoutes.filter((route) => route.path === '*')).toHaveLength(1);

    /* Every declared entry is a child of the shell layout route, so none carries a leading slash. */
    for (const path of declaredPaths()) {
      expect(path.startsWith('/')).toBe(false);
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The entry redirect
 * ------------------------------------------------------------------------------------------- */

describe('appRoutes — the entry redirect', () => {
  it.each(ROLES)('sends the %s persona to its own home route', async (role) => {
    session.activeUser = personaOf(role);

    const router = renderAt('/');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(entryRouteFor(role));
    });

    /* The screen the redirect landed on rendered: the table's own error state is empty, so no target
       route fell into the router's error boundary behind a passing location assertion. */
    expect(router.state.errors).toBeNull();
  });

  it('sends a session with no persona yet to the documented default', async () => {
    const router = renderAt('/');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(entryRouteFor(null));
    });
  });
});

/* ---------------------------------------------------------------------------------------------
 * The two pages a route can render instead of a screen
 * ------------------------------------------------------------------------------------------- */

describe('appRoutes — the notice page and the not-found page', () => {
  it('renders the stage-notice page, with the sentence its stage and entry state, for a route no stage builds', async () => {
    const item = STAGE_NOTICE_ITEM;

    if (item === undefined) {
      throw new Error('The navigation table declares no disabled stage-4 entry to mount.');
    }

    renderAt(item.to);

    const stage = item.stage === 4 ? 4 : 5;
    const expected = stageNoticeSentence(stage, item.label);

    await waitFor(() => {
      expect(heading().textContent).toBe(expected);
    });

    /* The page's one control works: a real link to a route the table declares (rule P-8). */
    const link = screen.getByRole('link', { name: STAGE_NOTICE_LINK_LABEL });

    expect(link.getAttribute('href')).toBe(EXCEPTION_QUEUE_PATH);
  });

  it('renders the not-found page for an address the table does not declare', async () => {
    renderAt(UNDECLARED_PATH);

    await waitFor(() => {
      expect(heading()).toBeInTheDocument();
    });

    /* The page states the address did not match, and offers exactly one live destination: the queue,
       reached by a real link rather than by a control that goes nowhere (rule P-8). */
    const links = screen.getAllByRole('link');

    expect(links.map((link) => link.getAttribute('href'))).toStrictEqual([EXCEPTION_QUEUE_PATH]);

    /* It is the not-found page and not the stage notice: none of that page's own wording is here. */
    expect(screen.queryByText(STAGE_NOTICE_LINK_LABEL)).toBeNull();
  });
});
