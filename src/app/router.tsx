/**
 * The route table of the Site Intelligence shell, declared once.
 *
 * `src/app/app.tsx` mounts `appRoutes` as the children of the shell layout route, so every element below
 * renders inside the shell: the top bar, the navigation, the persistent `Simulated data` badge, the theme
 * and density switches and the role switcher are all present above it, and each screen's single level-one
 * heading lands inside the shell's `<main>` landmark where the skip link reaches it (rules P-1, B-3).
 *
 * WHY THE WRAPPERS EXIST. A screen may not import `src/app`, so nothing in `src/features` can read the
 * shell's store; the shell may not reach into a screen's internals either. Each route below therefore
 * mounts a small wrapper component declared in this file, which reads the shell state the screen needs
 * and hands it down as props. That makes this file the single seam between the two, and the place to
 * adapt a prop name: a screen whose exported props differ from what the shell holds is corrected here and
 * only here, never by editing the feature.
 *
 * WHAT A WRAPPER NEVER DOES. It filters nothing, sorts nothing and derives no figure: the scope selection
 * travels to the screen and the service intersects it with the acting role's plant scope before a list or
 * an aggregate is computed, so a filtered queue and a filtered overview cannot disagree (rule P-2, AAP
 * 0.2.1). No wrapper imports a seed record, a mock adapter, the HTTP client or the factory that binds them
 * — every screen reaches its data through the port inside itself.
 *
 * PATHS ARE RELATIVE. These entries are children of the shell's layout route, so they declare `overview`
 * rather than `/overview`; the navigation table in `./nav-items` keeps the absolute `to` values a link
 * navigates with. The root path is the one address not declared as a child: the layout route this array
 * hangs from owns it, and the index entry declared below answers it by sending the session to the
 * persona's own entry route.
 *
 * EVERY REACHABLE ADDRESS RENDERS SOMETHING. The seven routes whose stage this run does not build render
 * the stage-notice page, which states the stage the workspace arrives in and offers a link that works;
 * any other address renders the not-found page. Neither is a silent redirect, a blank outlet or a control
 * that fails when reached for (rule P-8).
 *
 * Rules served:
 * - P-2: shell state only. No `src/seed`, no `src/services/mock`, no `src/services/api-client` and no
 *   `src/services/create-service` import, so this file cannot become a second data boundary.
 * - P-8: every route declared here answers with a built screen, the stage notice or the not-found page.
 * - P-1: nothing here renders the `Simulated data` badge or the top bar. The shell owns both above the
 *   router outlet, which is what makes the label present on every route below, the stage notices and the
 *   not-found page included.
 * - P-6: no figure, record identifier or plant or product code is written here. The scope comes from the
 *   store, a record's identifier from the screen's own `useParams()`, and the stage a notice states from
 *   the navigation table.
 * - P-4: no route, comment or prop claims a deployment property, and the stage notices describe nothing
 *   the unbuilt stage would establish.
 * - P-7: the product's own vocabulary only, and no company, customer or model name of the real world.
 * - B-2: nothing here reads configuration and nothing resembles a credential.
 */
import type { ReactElement } from 'react';
import { Navigate, useNavigate } from 'react-router';
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
import { STAGE_NOTICE_ROUTES, entryRouteFor } from './nav-items';
import { NotFoundPage } from './not-found-page';
import { useActiveRole, useShellStore } from './providers';
import { StageNoticePage } from './stage-notice-page';

/* ---------------------------------------------------------------------------------------------
 * The one path this file states for itself, and the child-path helper
 * ------------------------------------------------------------------------------------------- */

/**
 * The exception queue's route: the destination the overview sends a narrowed selection to.
 *
 * The navigation table carries the same path as the queue's entry, and the stage-notice page carries it as
 * the way back from a route whose stage has not arrived; this is the copy the overview's own callback
 * needs, kept here rather than read through a lookup because a redirect has to answer with a string on the
 * first render.
 */
const EXCEPTION_QUEUE_PATH = '/exceptions';

/**
 * A child route path: the absolute pattern an entry of the navigation table publishes, without its
 * leading slash.
 *
 * `'/suppliers/:supplierId'` answers `'suppliers/:supplierId'`, which is what a child of the shell's
 * layout route declares. The leading slash is the only difference between the two forms, so the paths
 * themselves are never retyped and cannot drift from the table.
 */
function childPathOf(pattern: string): string {
  return pattern.startsWith('/') ? pattern.slice(1) : pattern;
}

/* ---------------------------------------------------------------------------------------------
 * The wrappers — the one seam between the shell's state and a screen's props
 * ------------------------------------------------------------------------------------------- */

/**
 * Where the root path sends the session, and the only route that reads the persona rather than a screen.
 *
 * The persona comes from `useActiveRole()` — the shell's own selection once a role switch made one, the
 * persona the adapter reported otherwise — and not from the store's selection alone, because that
 * selection is seeded in an effect and is therefore still `null` while this element first renders.
 * Reading it alone would send every persona to the defensive default for one navigation, and the root path
 * would be the only address in the application that lands on the wrong screen. `useActiveRole()` answers
 * the persona in force in the same render, and it re-evaluates when the role switcher changes it, so `/`
 * resolves again after a switch (AAP 0.12.4). The role switcher also navigates to the new entry route
 * itself, so a switch does not depend on this element being on screen.
 */
function EntryRedirect(): ReactElement {
  const activeRole = useActiveRole();

  return <Navigate to={entryRouteFor(activeRole)} replace />;
}

/**
 * SCR-01's route element: the shell's scope, and what a figure on the overview does to the queue.
 */
function OverviewRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);
  const setScope = useShellStore((state) => state.setScope);
  const navigate = useNavigate();

  /*
   * Narrows the queue to what the reader activated (AAP 0.12.4).
   *
   * A plant taken from the risk bars becomes the top bar's plant selection, so the overview, the queue and
   * every other screen describe one population rather than two, and the session moves to the queue that
   * selection now filters; the product selection the reader already made is kept.
   *
   * A date mark has no member to carry it: `ExceptionQuery` offers plant, type, severity, status, owner and
   * supplier, and a date is none of them, so the marker opens the queue with the selection as it stands
   * instead of filtering by a day it cannot express. The series does not emit that member yet, so the
   * branch is a guard rather than a path a reader can reach.
   */
  const onNarrowQueue = (narrowing: OverviewNarrowing): void => {
    if (narrowing.kind === 'plant') {
      setScope({ plants: [narrowing.plantId], products: scope.products });
    }

    navigate(EXCEPTION_QUEUE_PATH);
  };

  return <OverviewScreen scope={scope} onNarrowQueue={onNarrowQueue} />;
}

/**
 * SCR-02's route element.
 *
 * The queue takes an initial filter set as well as the scope, and none is supplied: the shell pre-fills the
 * queue only through the plant and product selection the overview sets above, which the service applies,
 * so the queue opens on every record the acting role may see rather than on a filter of this file's
 * choosing.
 */
function ExceptionQueueRoute(): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <ExceptionQueueScreen scope={scope} />;
}

/**
 * SCR-03's route element.
 *
 * The exception's identifier is read by the screen from its own `useParams()`, so no path parameter
 * travels through this wrapper.
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
 * SCR-06's route element.
 *
 * No question is preselected: the assistant opens on its own suggested questions, and a question is placed
 * in the composer only when a reader activates one.
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
 * The screen calls them `onSelectedNodeChange` and `onWallModeChange` and keeps both values itself while
 * reporting every change, so one selection serves the map lens and the graph lens across a switch, and the
 * shell hides its navigation when wall mode comes on without the screen ever importing `src/app`.
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
 * a plant selection — so the selection travels for the one thing it can decide honestly here, which is the
 * product class the atlas opens on.
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
 * The paths are the table's own — `STAGE_NOTICE_ROUTES` publishes one entry per unbuilt route, taking the
 * `to` of each disabled navigation entry and appending the two profile paths the navigation never lists —
 * so no path is retyped here and neither list can drift from the other. The table declares them absolutely
 * and a child route is relative, which is the whole of what `childPathOf` changes.
 *
 * The stage each route states comes from its own entry, so the page's sentence and the entry's tooltip
 * agree: `StageNoticePage` accepts stage 4 or 5, and only those two stages appear in this list. That is
 * provable from the table rather than assumed: an entry joins `STAGE_NOTICE_ROUTES` only when it carries a
 * disabled tooltip, and `disabledTooltipFor` gives a tooltip to stages 4 and 5 alone. The two branches
 * below therefore cover every member the list can hold, and a stage added to the union later is a change
 * to the navigation table that this loop, its types and the compiler all see.
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
 * Every route of the demonstration, as the children of the shell layout route.
 *
 * The table is exactly the navigation table's enabled entries plus its further routes, and nothing else:
 * the index that resolves the persona's entry route, the nine screens this run builds at their own paths,
 * the seven stage-notice paths and the catch-all that answers any other address. Each screen's detail
 * routes — an exception, an exception's options, an approval, a policy — are declared here as their own
 * paths and read their parameters inside the screen, because a record's identifier is the screen's to read
 * and not this file's to hold.
 *
 * React Router ranks the children by specificity rather than by declaration order, so a detail path is
 * matched ahead of the catch-all wherever it sits; the order below follows the screens' own order, with the
 * stage notices where the navigation table introduces them.
 */
export const appRoutes: RouteObject[] = [
  { index: true, element: <EntryRedirect /> },
  { path: 'overview', element: <OverviewRoute /> },
  { path: 'exceptions', element: <ExceptionQueueRoute /> },
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
