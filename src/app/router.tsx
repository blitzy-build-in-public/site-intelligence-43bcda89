/**
 * The route table of the Site Intelligence shell, declared once and mounted by `src/app/app.tsx` as the
 * children of the shell layout route, so every element below renders inside the shell (AAP 0.12.4, AAP
 * 0.13.2 "the router declares every route once", rules P-1, P-2 and P-8).
 *
 * Each route mounts a wrapper declared here, which reads the shell state the screen needs and hands it
 * down as props: a screen may not import `src/app` and the shell may not reach into a screen, so this is
 * the one seam between them, and a wrapper filters nothing, sorts nothing and derives no figure — the
 * service intersects the scope with the acting role's plant scope before a list or an aggregate runs.
 *
 * These child paths are relative while `./nav-items` publishes the absolute ones, and an address left
 * over renders the stage-notice or not-found page rather than a blank outlet (rule P-8). The exception
 * queue's segment is derived from its shared declaration in `src/types/routes.ts`, because the
 * navigation entry, the stage-notice page, the not-found page and four screens all build that address:
 * the segment the router mounts and the address those links reach cannot drift apart.
 */
import type { ReactElement } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import type { RouteObject } from 'react-router';

import { OverviewScreen } from '../features/scr-01-overview/overview-screen';
import type { OverviewNarrowing } from '../features/scr-01-overview/overview-screen';
import { ExceptionQueueScreen } from '../features/scr-02-exception-queue/exception-queue-screen';
import { InvestigationScreen } from '../features/scr-03-investigation/investigation-screen';
import { ScenarioComparisonScreen } from '../features/scr-04-scenario-comparison/scenario-comparison-screen';
import { ApprovalDetailScreen } from '../features/scr-05-approvals-and-audit/approval-detail-screen';
import { ApprovalsScreen } from '../features/scr-05-approvals-and-audit/approvals-screen';
import { AuditScreen } from '../features/scr-05-approvals-and-audit/audit-screen';
import { AssistantScreen } from '../features/scr-06-evidence-assistant/assistant-screen';
import { PolicyDetailScreen } from '../features/scr-07-sovereignty-and-policies/policy-detail-screen';
import { SovereigntyScreen } from '../features/scr-07-sovereignty-and-policies/sovereignty-screen';
import { FilemapCanvasScreen } from '../features/scr-12-filemap-canvas/filemap-canvas-screen';
import { CompetitiveAtlasScreen } from '../features/scr-13-competitive-atlas/competitive-atlas-screen';
import type { IsoDate } from '../types';
import { EXCEPTION_QUEUE_PATH } from '../types/routes';
import { STAGE_NOTICE_ROUTES, entryRouteFor } from './nav-items';
import { NotFoundPage } from './not-found-page';
import { useActiveRole, useShellStore } from './providers';
import { StageNoticePage } from './stage-notice-page';

/* ---------------------------------------------------------------------------------------------
 * The child-path helper
 *
 * The queue path is not stated here: `src/types/routes.ts` declares it once for the navigation table,
 * the stage-notice page, the not-found page and the four screens that navigate to it, and this file
 * imports that declaration.
 * ------------------------------------------------------------------------------------------- */

/**
 * A child route path: the absolute pattern an entry of the navigation table publishes, without its
 * leading slash.
 *
 * The leading slash is the only difference between the two forms, so the paths themselves are never
 * retyped and cannot drift from the table.
 */
function childPathOf(pattern: string): string {
  return pattern.startsWith('/') ? pattern.slice(1) : pattern;
}

/* ---------------------------------------------------------------------------------------------
 * The day a narrowed queue entry carries, read back from the router's location state
 * ------------------------------------------------------------------------------------------- */

/** The shape contracts §1 fixes for a calendar date: four digits, then two, then two. */
const ISO_DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/u;

/** Characters a calendar date occupies, which is the length of the form above. */
const ISO_DATE_LENGTH = 10;

/**
 * The day a queue entry was narrowed to, or `undefined` when its location state states none.
 *
 * The overview hands the day a reader chose to the queue through the router's location state (see
 * `OverviewRoute`), so the day never enters the address, never becomes a global and never reaches the
 * screen as a seed import: `ExceptionQuery.date` is where it lands, and the screen is handed a plain
 * `initialQuery` and knows nothing of routes (rule P-2, AAP §0.7).
 *
 * Nothing in the state is trusted. It arrives as `unknown`, it holds whatever the entry that wrote it
 * put there, and a malformed day would either fail the read or narrow the queue to a date no record
 * falls on. The guard therefore accepts a value only when it is a string of the `YYYY-MM-DD` form that
 * also names a real calendar day: parsing its midnight in UTC and reading the instant back has to
 * produce the same characters, which rejects `2026-02-31` and `2026-13-01` instead of letting the
 * platform shift them into March or December. No clock is read — the instant comes from the value under
 * test — and every other shape, an object, a number or a missing member, reads as no day at all.
 *
 * @param state - The location state the queue's entry carries.
 * @returns The day it states, or `undefined` when it states none this application can read.
 */
function dayOfLocationState(state: unknown): IsoDate | undefined {
  if (typeof state !== 'object' || state === null || !('day' in state)) {
    return undefined;
  }

  const day: unknown = state.day;

  if (typeof day !== 'string' || !ISO_DATE_SHAPE.test(day)) {
    return undefined;
  }

  const parsed = Date.parse(`${day}T00:00:00Z`);
  const roundTripped = Number.isNaN(parsed)
    ? undefined
    : new Date(parsed).toISOString().slice(0, ISO_DATE_LENGTH);

  return roundTripped === day ? day : undefined;
}

/* ---------------------------------------------------------------------------------------------
 * The wrappers — the one seam between the shell's state and a screen's props
 * ------------------------------------------------------------------------------------------- */

/**
 * Where the root path sends the session, and the only route that reads the persona rather than a screen.
 *
 * The persona comes from `useActiveRole()` — the shell's own selection once a role switch made one, the
 * persona the adapter reported otherwise — and not from the store's selection alone, because that
 * selection is seeded in an effect and is therefore still `null` while this element first renders, which
 * would send every persona to the defensive default for the application's root address. `useActiveRole()`
 * answers the persona in force in the same render and re-evaluates when the role switcher changes it, so
 * `/` resolves again after a switch (AAP 0.12.4); the switcher also navigates to the new entry route
 * itself, so a switch does not depend on this element being on screen.
 */
function EntryRedirect(): ReactElement {
  const activeRole = useActiveRole();

  return <Navigate to={entryRouteFor(activeRole)} replace />;
}

/** SCR-01's route element: the shell's scope, and what a figure on the overview does to the queue. */
function OverviewRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);
  const setScope = useShellStore((state) => state.setScope);
  const navigate = useNavigate();

  /*
   * Narrows the shell's plant selection to the plant the reader activated (AAP 0.12.4).
   *
   * A plant taken from the risk bars becomes the top bar's plant selection, so the overview, the queue and
   * every other screen describe one population rather than two; the product selection the reader already
   * made is kept. The session stays on the overview, because the bar declares a dialog and opens the
   * evidence behind its figure in the same gesture: navigating away here would discard the drawer the
   * reader had just opened, and the overview re-reads the narrowed scope in place rather than substituting
   * its loading state for the content already on screen. The narrowed queue is reached the way the screen
   * offers it — the primary action "Review critical exceptions", or the queue's navigation entry.
   *
   * A date taken from the day series travels as the queue entry's location state, which `ExceptionQueueRoute`
   * reads back and hands to the screen as the day its read is narrowed by. The state is the carrier that
   * keeps a chosen day out of the address and out of a global: either of those would be indistinguishable
   * from the test hook AAP §0.7 forbids, and a day is a narrowing one screen asks of another rather than a
   * place in the application. The top bar's selection is left as the reader set it, so a day narrows the
   * queue to that day within the population they were already reading. The day's control is the series
   * table's date cell rather than a chart mark, and it opens no drawer, so taking the reader to the queue it
   * narrows costs that gesture nothing — which is why only this branch navigates.
   */
  const onNarrowQueue = (narrowing: OverviewNarrowing): void => {
    if (narrowing.kind === 'plant') {
      setScope({ plants: [narrowing.plantId], products: scope.products });

      return;
    }

    navigate(EXCEPTION_QUEUE_PATH, { state: { day: narrowing.date } });
  };

  return <OverviewScreen scope={scope} onNarrowQueue={onNarrowQueue} />;
}

/**
 * SCR-02's route element.
 *
 * The queue takes an initial filter set as well as the scope, and exactly one member can arrive from
 * outside the screen: the day the overview's series was narrowed by, carried in this entry's location state
 * (see `OverviewRoute`) and read back through {@link dayOfLocationState}, which drops anything that is not a
 * real calendar date rather than narrowing the read to a day no record falls on. No other filter is
 * pre-filled here: the plant and product selection the overview sets travels as the scope the service
 * applies, so the queue opens on every record the acting role may see rather than on a filter of this file's
 * choosing.
 *
 * The entry stays the authority on the day. The screen seeds the day once and holds it while the reader is
 * on the page, so clearing it has to reach the entry too: `onDayCleared` replaces the entry with the same
 * path and no state, which stops a reload of that entry from restoring a narrowing the reader has ended.
 * The element carries no key, because the day the screen holds is its own state and a navigation that
 * states no day must not throw away the filters the reader chose beside a day they were given.
 */
function ExceptionQueueRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);
  const navigate = useNavigate();
  const location = useLocation();
  const day = dayOfLocationState(location.state);

  /**
   * Drops the cleared day from the entry that carried it.
   *
   * The replacement is in place rather than pushed, because ending a narrowing is not a place the session
   * moved to and the back button should not walk back into a day the reader has already left. The path is
   * the one already shown, so nothing but the state changes.
   */
  const onDayCleared = (): void => {
    void navigate(location.pathname, { replace: true, state: null });
  };

  return (
    <ExceptionQueueScreen
      scope={scope}
      {...(day === undefined ? {} : { initialQuery: { date: day } })}
      onDayCleared={onDayCleared}
    />
  );
}

/**
 * SCR-03's route element. The exception's identifier is read by the screen's own `useParams()`, so no path
 * parameter travels through this wrapper.
 */
function InvestigationRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <InvestigationScreen scope={scope} />;
}

/** SCR-04's route element. The exception's identifier is read by the screen itself. */
function ScenarioComparisonRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <ScenarioComparisonScreen scope={scope} />;
}

/** SCR-05's approval inbox route element. */
function ApprovalsRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <ApprovalsScreen scope={scope} />;
}

/** SCR-05's approval detail route element. The approval's identifier is read by the screen itself. */
function ApprovalDetailRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <ApprovalDetailScreen scope={scope} />;
}

/** SCR-05's audit trail route element. */
function AuditRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <AuditScreen scope={scope} />;
}

/**
 * SCR-06's route element. No question is preselected: the assistant opens on its own suggested questions,
 * and a question reaches the composer only when a reader activates one.
 */
function AssistantRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <AssistantScreen scope={scope} />;
}

/** SCR-07's declared-configuration route element. */
function SovereigntyRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <SovereigntyScreen scope={scope} />;
}

/** SCR-07's policy detail route element. The policy's identifier is read by the screen itself. */
function PolicyDetailRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <PolicyDetailScreen scope={scope} />;
}

/**
 * SCR-12's route element: the scope, the selection both lenses share, and the two reports the shell acts on.
 *
 * The screen keeps both reported values itself while reporting every change, so one selection serves both
 * lenses, and the shell hides its navigation when wall mode comes on without importing `src/app`.
 */
function CanvasRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);
  const selectedNodeId = useShellStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useShellStore((state) => state.setSelectedNodeId);
  const setWallMode = useShellStore((state) => state.setWallMode);

  return (
    <FilemapCanvasScreen
      scope={scope}
      selectedNodeId={selectedNodeId}
      onSelectedNodeChange={setSelectedNodeId}
      onWallModeChange={setWallMode}
    />
  );
}

/**
 * SCR-13's route element.
 *
 * The atlas read takes no scope — market intelligence is not a first-party record and is never narrowed by
 * a plant selection — so the selection travels only for the product class the atlas opens on.
 */
function CompetitiveAtlasRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <CompetitiveAtlasScreen scope={scope} />;
}

/* ---------------------------------------------------------------------------------------------
 * The routes whose stage this run does not build
 * ------------------------------------------------------------------------------------------- */

/**
 * Child route objects for every path that renders the stage-notice page, derived from the navigation table.
 *
 * The paths are the table's own, so none is retyped here and neither list can drift from the other; the
 * table declares them absolutely and a child route is relative, which is the whole of what `childPathOf`
 * changes.
 *
 * The stage each route states comes from its own entry, so the page's sentence and the entry's tooltip
 * agree: `StageNoticePage` accepts stage 4 or 5, an entry joins `STAGE_NOTICE_ROUTES` only when it carries
 * a disabled tooltip, and `disabledTooltipFor` gives one to those two stages alone — so the branches below
 * cover every member the list can hold, and a stage added to the union later is a change the compiler sees.
 */
function stageNoticeRoutes(): RouteObject[] {
  const routes: RouteObject[] = [];

  for (const route of STAGE_NOTICE_ROUTES) {
    const path = childPathOf(route.path);

    if (route.stage === 4) {
      routes.push({ path, element: <StageNoticePage stage={4} /> });
    } else if (route.stage === 5) {
      routes.push({ path, element: <StageNoticePage stage={5} /> });
    }
  }

  return routes;
}

/* ---------------------------------------------------------------------------------------------
 * The route table — AAP 0.12.4, AAP 0.13.2 "the router declares every route once"
 * ------------------------------------------------------------------------------------------- */

/**
 * Every route of the demonstration, as the children of the shell layout route: the navigation table's
 * enabled entries plus its further routes, and nothing else.
 *
 * A screen's detail routes are declared here as their own paths and read their parameters inside the
 * screen, because a record's identifier is the screen's to read and not this file's to hold.
 *
 * React Router ranks the children by specificity rather than by declaration order, so a detail path is
 * matched ahead of the catch-all wherever it sits; the order below follows the screens' own order, with the
 * stage notices where the navigation table introduces them.
 */
export const appRoutes: RouteObject[] = [
  { index: true, element: <EntryRedirect /> },
  { path: 'overview', element: <OverviewRoute /> },
  { path: childPathOf(EXCEPTION_QUEUE_PATH), element: <ExceptionQueueRoute /> },
  { path: 'exceptions/:exceptionId', element: <InvestigationRoute /> },
  { path: 'exceptions/:exceptionId/scenarios', element: <ScenarioComparisonRoute /> },
  { path: 'approvals', element: <ApprovalsRoute /> },
  { path: 'approvals/:approvalId', element: <ApprovalDetailRoute /> },
  { path: 'audit', element: <AuditRoute /> },
  { path: 'assistant', element: <AssistantRoute /> },
  { path: 'admin/sovereignty', element: <SovereigntyRoute /> },
  { path: 'admin/policies/:policyId', element: <PolicyDetailRoute /> },
  ...stageNoticeRoutes(),
  { path: 'canvas', element: <CanvasRoute /> },
  { path: 'competitive', element: <CompetitiveAtlasRoute /> },
  { path: '*', element: <NotFoundPage /> },
];
