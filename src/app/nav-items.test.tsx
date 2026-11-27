/**
 * Suite for `nav-items.ts`: the stage-notice route list the shell publishes, and the routing a
 * person gets from it.
 *
 * The suite proves the contract the module states instead of restating it. The seven stage-notice
 * paths of AAP 0.12.4's route table are published as stage-notice routes; every navigation entry
 * disabled because its stage has not been built contributes its own `to` to that list; the list
 * holds those seven paths with none declared twice (AAP 0.13.2); and each persona's entry route is
 * one the module answers, so no persona's home route can fall to the not-found page (AAP 0.7, rule
 * P-8). The integration case then mounts a router and reads the page each address lands on, which
 * is the defect this suite exists to catch: a stage-notice path the router never heard of falls
 * through to the not-found page instead of explaining itself.
 *
 * The router is assembled from the module's own `NAV_ITEMS`, `FURTHER_ROUTES` and `entryRouteFor`
 * rather than from a route table written here, because a copy would keep passing while the module
 * drifted away from it. The case therefore consumes exactly the lists `src/app/router.tsx`
 * consumes, with a stub element only where a screen of this run would otherwise be mounted.
 *
 * Renders under the default jsdom environment; nothing here hashes, and nothing reads the clock.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navigate, RouterProvider, createMemoryRouter } from 'react-router';
import type { RouteObject } from 'react-router';
import type { ReactElement } from 'react';

import type { Role } from '../types/entities';
import {
  FURTHER_ROUTES,
  NAV_ITEMS,
  STAGE_NOTICE_ROUTES,
  entryRouteFor,
} from './nav-items';
import { NotFoundPage } from './not-found-page';
import { StageNoticePage } from './stage-notice-page';

/**
 * The seven routes AAP 0.12.4's stage-notice row names, in the order that row gives them.
 *
 * The count the third case asserts is this table's length rather than a second literal, so the
 * paths are written once in this file and a path added to the table without a route to answer it
 * fails.
 */
const STAGE_NOTICE_PATHS = [
  '/evidence',
  '/suppliers',
  '/suppliers/:supplierId',
  '/materials/:materialId',
  '/plants/:plantId/plan',
  '/admin/sources',
  '/admin/models',
] as const;

/**
 * The eight personas of the `Role` union, enumerated.
 *
 * Written out rather than derived, so a role added to the union without an entry route is noticed
 * here as well as by the total `Record<Role, string>` that `nav-items.ts` declares.
 */
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

/** One address the integration case visits, and the level-one heading it has to answer with. */
interface RouteCase {
  /** The address the router starts at. */
  readonly path: string;

  /** The exact text of the level-one heading the page at that address renders. */
  readonly heading: string;
}

/**
 * The addresses the integration case visits, and the sentence each must land on.
 *
 * The two stage-notice sentences are the shape `stage-notice-page.tsx` builds from the stage a
 * route carries and the label the navigation table gives its workspace, read here as text so a
 * change to either fails the suite. The not-found case is that page's own title, and the enabled
 * case is the stub heading naming the entry, which proves the half of the table that navigates
 * still lands on a screen rather than on the catch-all.
 */
const ROUTE_CASES: readonly RouteCase[] = [
  {
    path: '/evidence',
    heading: 'The evidence workspace arrives in stage S4.',
  },
  {
    path: '/plants/PLT-BRN/plan',
    heading: 'The production plan workspace arrives in stage S5.',
  },
  {
    path: '/no-such-page',
    heading: 'Page not found',
  },
  {
    path: '/exceptions',
    heading: 'Exceptions',
  },
];

/** A stand-in for a screen this run builds: the entry's own label as the page's only heading. */
function StubScreen({ label }: { readonly label: string }): ReactElement {
  return <h1>{label}</h1>;
}

/**
 * The routes the integration case mounts, assembled from the module's own lists.
 *
 * Every enabled navigation entry gets a route to a stub naming it; every further route gets the
 * element its `kind` asks for - the real stage-notice page for a notice, a stub for a screen, and
 * the redirect to the entry route the module states for the persona whose home is the canvas - and
 * the catch-all renders the real not-found page. No path is written in this file, so the case
 * cannot drift from the table it checks.
 */
function routesForCase(): RouteObject[] {
  const enabledRoutes: RouteObject[] = NAV_ITEMS.filter(
    (item) => item.disabledReason === null,
  ).map((item) => ({ path: item.to, element: <StubScreen label={item.label} /> }));

  const furtherRoutes: RouteObject[] = FURTHER_ROUTES.map((route) => {
    switch (route.kind) {
      case 'stage-notice':
        return {
          path: route.path,
          element: <StageNoticePage stage={route.stage === 5 ? 5 : 4} />,
        };
      case 'screen':
        return { path: route.path, element: <StubScreen label={route.path} /> };
      case 'redirect':
        return {
          path: route.path,
          element: <Navigate to={entryRouteFor('material-planner')} replace />,
        };
    }
  });

  return [...enabledRoutes, ...furtherRoutes, { path: '*', element: <NotFoundPage /> }];
}

/** Mounts one memory router that starts at `path` and answers only from the module's lists. */
function renderAt(path: string): void {
  const router = createMemoryRouter(routesForCase(), { initialEntries: [path] });

  render(<RouterProvider router={router} />);
}

/** The text of the page's single level-one heading, which is what each route is asserted on. */
function levelOneHeadingText(): string {
  return screen.getByRole('heading', { level: 1 }).textContent ?? '';
}

/** The paths of the entries that navigate, which the router declares from the navigation table. */
function enabledPaths(): readonly string[] {
  return NAV_ITEMS.filter((item) => item.disabledReason === null).map((item) => item.to);
}

describe('the stage-notice route list', () => {
  it.each(STAGE_NOTICE_PATHS)('%s is declared once, as a stage-notice route', (path) => {
    const kinds = FURTHER_ROUTES.filter((route) => route.path === path).map((route) => route.kind);

    expect(kinds).toEqual(['stage-notice']);
  });

  const disabledEntries = NAV_ITEMS.filter((item) => item.disabledReason !== null);

  it.each(disabledEntries)(
    'publishes the disabled entry $to as a stage-notice route',
    (item) => {
      const kinds = FURTHER_ROUTES.filter((route) => route.path === item.to).map(
        (route) => route.kind,
      );

      expect(kinds).toEqual(['stage-notice']);
    },
  );

  it('publishes no enabled navigation path as a stage-notice route', () => {
    const notices = FURTHER_ROUTES.filter((route) => route.kind === 'stage-notice').map(
      (route) => route.path,
    );

    expect(notices.filter((path) => enabledPaths().includes(path))).toEqual([]);
  });

  it('publishes exactly the seven stage-notice paths, once each and all as notices', () => {
    const declaredPaths = FURTHER_ROUTES.map((route) => route.path);

    expect(STAGE_NOTICE_ROUTES).toHaveLength(STAGE_NOTICE_PATHS.length);
    expect(STAGE_NOTICE_ROUTES.every((route) => route.kind === 'stage-notice')).toBe(true);
    expect(STAGE_NOTICE_ROUTES.map((route) => route.path).sort()).toEqual(
      [...STAGE_NOTICE_PATHS].sort(),
    );
    expect(new Set(declaredPaths).size).toBe(declaredPaths.length);
  });
});

describe('the routes the application answers', () => {
  it.each(ROUTE_CASES)('answers $path with the heading "$heading"', ({ path, heading }) => {
    renderAt(path);

    expect(levelOneHeadingText()).toBe(heading);
  });
});

describe('the entry route of each persona', () => {
  it.each(ROLES)('lands %s on a route the module declares', (role) => {
    const entryRoute = entryRouteFor(role);
    const declared =
      enabledPaths().includes(entryRoute) ||
      FURTHER_ROUTES.some((route) => route.path === entryRoute);

    expect(
      declared,
      `${role} lands on ${entryRoute}, which neither an enabled entry nor a further route declares`,
    ).toBe(true);
  });
});
