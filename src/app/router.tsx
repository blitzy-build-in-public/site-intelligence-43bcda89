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
 *
 * WHY EVERY SCREEN IS FETCHED WHEN ITS ROUTE IS FIRST MATCHED. A screen is the largest thing this
 * application ships — a table of thirteen columns, a map with the bundled boundary geometry, an atlas
 * of competitor networks — and exactly one of them is on screen at a time. Importing all twelve
 * statically would put every route's code, and the boundary geometry only the canvas draws, into the
 * module the browser must parse before the landing screen can paint, which is the whole-record cost the
 * performance pass measured on every route. Each route therefore names a `lazy` loader: React Router
 * awaits the module while the router initialises, in parallel with the shell's own boot pass, so a cold
 * load pays for the landing screen alone and a navigation pays for the screen it moves to. The modules
 * still ship inside the built bundle on the application's own origin, so no rule is touched — nothing
 * is fetched from a third party (rule B-1) and the router still declares every route once here. The
 * props each screen takes stay typed from the module itself, because the wrappers below import their
 * screens' prop types only: a type import is erased, so it names the contract without pulling the
 * screen's code into this chunk.
 */
import type { ComponentType, ReactElement } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import type { RouteObject } from 'react-router';

import { StateBoundary } from '../components/state-boundary';
import type {
  OverviewNarrowing,
  OverviewScreenProps,
} from '../features/scr-01-overview/overview-screen';
import type { ExceptionQueueScreenProps } from '../features/scr-02-exception-queue/exception-queue-screen';
import type { InvestigationScreenProps } from '../features/scr-03-investigation/investigation-screen';
import type { ScenarioComparisonScreenProps } from '../features/scr-04-scenario-comparison/scenario-comparison-screen';
import type { ApprovalsScreenProps } from '../features/scr-05-approvals-and-audit/approvals-screen';
import type { ApprovalDetailScreenProps } from '../features/scr-05-approvals-and-audit/approval-detail-screen';
import type { AuditScreenProps } from '../features/scr-05-approvals-and-audit/audit-screen';
import type { AssistantScreenProps } from '../features/scr-06-evidence-assistant/assistant-screen';
import type { SovereigntyScreenProps } from '../features/scr-07-sovereignty-and-policies/sovereignty-screen';
import type { PolicyDetailScreenProps } from '../features/scr-07-sovereignty-and-policies/policy-detail-screen';
import type { FilemapCanvasScreenProps } from '../features/scr-12-filemap-canvas/filemap-canvas-screen';
import type { CompetitiveAtlasScreenProps } from '../features/scr-13-competitive-atlas/competitive-atlas-screen';
import type { IsoDate } from '../types';
import { EXCEPTION_QUEUE_PATH } from '../types/routes';
import { STAGE_NOTICE_ROUTES, entryRouteFor } from './nav-items';
import { NotFoundPage } from './not-found-page';
import { useActiveRole, useShellStore } from './providers';
import { StageNoticePage } from './stage-notice-page';

/* ---------------------------------------------------------------------------------------------
 * The on-demand route helper
 * ------------------------------------------------------------------------------------------- */

/**
 * The loading region the outlet shows while a screen's module is on its way, taken from the component
 * that owns that region for the whole application.
 *
 * It is `StateBoundary` in its `'loading'` state and carries no content, because that boundary withholds
 * the content it is given for exactly that state: the region announces itself as busy through its own
 * caption and bars, so a cold load of a detail address is never a silent empty region (rule B-3) and
 * nothing here paints a second kind of placeholder beside the one the screens already use.
 */
const CHUNK_LOADING_REGION = <StateBoundary state="loading">{null}</StateBoundary>;

/**
 * A route whose screen arrives as its own module when the route is first matched.
 *
 * `load` resolves the wrapper element for this route, which the loader builds from the module it
 * imported; the wrapper itself lives above, so the shell state a screen needs is still read here rather
 * than in a feature folder.
 *
 * Two behaviours this depends on are the router's own. `lazy` is resolved while the router initialises,
 * so on a cold load the screen's module is fetched in parallel with the shell's boot pass rather than
 * after it. And a client-side navigation waits for the module before it commits the new location, so the
 * screen the reader was reading stays on screen instead of being replaced by a loading region.
 *
 * `hydrateFallbackElement` is the one state the router cannot wait in: if a cold load's module is still
 * on its way when the shell first renders, the outlet shows {@link CHUNK_LOADING_REGION} rather than an
 * empty content region, and the router is told what to render instead of warning that it has nothing.
 *
 * @param path - The child path, relative as every child of the shell layout route is.
 * @param load - Resolves the element this route renders, once its module is in the browser.
 * @returns The route object, with the screen's code out of the initial chunk.
 */
function lazyRoute(path: string, load: () => Promise<ReactElement>): RouteObject {
  return {
    path,
    hydrateFallbackElement: CHUNK_LOADING_REGION,
    lazy: async () => ({ element: await load() }),
  };
}

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

/**
 * SCR-01's route element: the shell's scope, and what a figure on the overview does to the queue.
 *
 * The wrapper takes the screen as a prop rather than importing it: the route's loader hands it the
 * component its `import()` resolved, so this element keeps the shell wiring while the screen's own
 * module stays out of the initial chunk — the arrangement every wrapper below shares.
 */
function OverviewRoute({
  Screen,
}: {
  readonly Screen: ComponentType<OverviewScreenProps>;
}): ReactElement {
  const scope = useShellStore((state) => state.scope);
  const setScope = useShellStore((state) => state.setScope);
  const navigate = useNavigate();

  /*
   * Narrows the queue the reader asked for, and opens it (AAP 0.12.4).
   *
   * A plant taken from the risk bars becomes the top bar's plant selection, so the overview, the queue
   * and every other screen describe one population rather than two; the product selection the reader
   * already made is kept. The gesture then navigates to the queue it narrowed, because the narrowing a
   * reader cannot see is not a filter they made: the queue's own Plant control reflects the selection
   * its read is narrowed by, and the rows beneath it are the ones the bar stands for (AAP 0.2.1's one
   * scope resolver).
   *
   * A date taken from the day series travels as the queue entry's location state, which `ExceptionQueueRoute`
   * reads back and hands to the screen as the day its read is narrowed by. The state is the carrier that
   * keeps a chosen day out of the address and out of a global: either of those would be indistinguishable
   * from the test hook AAP §0.7 forbids, and a day is a narrowing one screen asks of another rather than a
   * place in the application. The top bar's selection is left as the reader set it, so a day narrows the
   * queue to that day within the population they were already reading.
   *
   * BOTH BRANCHES NAVIGATE, AND THE DRAWER IS NOT THE COST. Neither gesture opens a drawer: each chart
   * reports the activation to its screen instead (see `LineChart`'s `activation` and
   * `HorizontalBarChart`'s `onActivate`), so leaving the screen discards nothing the reader had opened,
   * and every figure's evidence stays reachable from its chart's "View as table" grid.
   */
  const onNarrowQueue = (narrowing: OverviewNarrowing): void => {
    if (narrowing.kind === 'plant') {
      setScope({ plants: [narrowing.plantId], products: scope.products });
      navigate(EXCEPTION_QUEUE_PATH);

      return;
    }

    navigate(EXCEPTION_QUEUE_PATH, { state: { day: narrowing.date } });
  };

  return <Screen scope={scope} onNarrowQueue={onNarrowQueue} />;
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
 * The entry stays the authority on the day it states. The screen seeds that day from the arrival and holds
 * it while it is mounted, so the narrowing a reader made on another screen lasts as long as the screen they
 * are reading and no longer, and the arrival is a narrowing of the whole queue rather than an addition to
 * it: the queue clears the filters the arrival does not state, so the count the series row showed and the
 * queue the reader opens agree (T-01).
 * Clearing the day has to reach the entry too: `onDayCleared` replaces the entry with the same path and no
 * state, which stops a reload of that entry from restoring a narrowing the reader has ended. The element
 * carries no key, because the day the screen holds is its own and a navigation that states no day must not
 * throw away the filters the reader chose.
 */
function ExceptionQueueRoute({
  Screen,
}: {
  readonly Screen: ComponentType<ExceptionQueueScreenProps>;
}): ReactElement {
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
    <Screen
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
function InvestigationRoute({
  Screen,
}: {
  readonly Screen: ComponentType<InvestigationScreenProps>;
}): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <Screen scope={scope} />;
}

/** SCR-04's route element. The exception's identifier is read by the screen itself. */
function ScenarioComparisonRoute({
  Screen,
}: {
  readonly Screen: ComponentType<ScenarioComparisonScreenProps>;
}): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <Screen scope={scope} />;
}

/** SCR-05's approval inbox route element. */
function ApprovalsRoute({
  Screen,
}: {
  readonly Screen: ComponentType<ApprovalsScreenProps>;
}): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <Screen scope={scope} />;
}

/** SCR-05's approval detail route element. The approval's identifier is read by the screen itself. */
function ApprovalDetailRoute({
  Screen,
}: {
  readonly Screen: ComponentType<ApprovalDetailScreenProps>;
}): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <Screen scope={scope} />;
}

/** SCR-05's audit trail route element. */
function AuditRoute({
  Screen,
}: {
  readonly Screen: ComponentType<AuditScreenProps>;
}): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <Screen scope={scope} />;
}

/**
 * SCR-06's route element. No question is preselected: the assistant opens on its own suggested questions,
 * and a question reaches the composer only when a reader activates one.
 */
function AssistantRoute({
  Screen,
}: {
  readonly Screen: ComponentType<AssistantScreenProps>;
}): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <Screen scope={scope} />;
}

/** SCR-07's declared-configuration route element. */
function SovereigntyRoute({
  Screen,
}: {
  readonly Screen: ComponentType<SovereigntyScreenProps>;
}): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <Screen scope={scope} />;
}

/** SCR-07's policy detail route element. The policy's identifier is read by the screen itself. */
function PolicyDetailRoute({
  Screen,
}: {
  readonly Screen: ComponentType<PolicyDetailScreenProps>;
}): ReactElement {
  const scope = useShellStore((state) => state.scope);

  return <Screen scope={scope} />;
}

/**
 * SCR-12's route element: the scope, the selection both lenses share, the two reports the shell acts on
 * and the count of demonstration resets the screen reads its own lens against.
 *
 * The screen keeps both reported values itself while reporting every change, so one selection serves both
 * lenses, and the shell hides its navigation when wall mode comes on without importing `src/app`.
 *
 * A demonstration reset ends the session whose view the surface was showing, so the element is keyed by
 * the reset count: a new count remounts the screen, and a remount returns every switch the screen or its
 * children hold in component state — its own selection fallback, wall mode, the armed preview, the map
 * lens's zoom and preset and the graph lens's toggles — to its opening position. The count travels as a
 * prop as well, because the lens in view outlives the mount in this screen's own module store: that store
 * records the count the lens was chosen under, so the screen can tell a lens chosen before the reset from
 * one chosen after it and read a first visit's lens once the demonstration has been put back.
 */
function CanvasRoute({
  Screen,
}: {
  readonly Screen: ComponentType<FilemapCanvasScreenProps>;
}): ReactElement {
  const scope = useShellStore((state) => state.scope);
  const selectedNodeId = useShellStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useShellStore((state) => state.setSelectedNodeId);
  const setWallMode = useShellStore((state) => state.setWallMode);
  const demonstrationEpoch = useShellStore((state) => state.demonstrationEpoch);

  return (
    <Screen
      key={demonstrationEpoch}
      scope={scope}
      selectedNodeId={selectedNodeId}
      onSelectedNodeChange={setSelectedNodeId}
      onWallModeChange={setWallMode}
      demonstrationEpoch={demonstrationEpoch}
    />
  );
}

/**
 * SCR-13's route element.
 *
 * The atlas read takes no scope — market intelligence is not a first-party record and is never narrowed by
 * a plant selection — so the selection travels only for the product class the atlas opens on, and the
 * count of demonstration resets only for the three choices the screen holds.
 *
 * A demonstration reset ends the session whose view the surface was showing, so the element is keyed by
 * the reset count: a new count remounts the screen, and a remount returns every switch the screen or its
 * children hold in component state — the export it last offered, the evidence a mark had open, the
 * network's own pointer and focus state and each chart frame's table view — to its opening position. The
 * count travels as a prop as well, because the class in view, the entity in view and the selected mark
 * outlive the mount in this screen's own module store: that store records the count they were chosen
 * under, so the screen can tell a choice made before the reset from one made after it and read a first
 * visit's values once the demonstration has been put back.
 */
function CompetitiveAtlasRoute({
  Screen,
}: {
  readonly Screen: ComponentType<CompetitiveAtlasScreenProps>;
}): ReactElement {
  const scope = useShellStore((state) => state.scope);
  const demonstrationEpoch = useShellStore((state) => state.demonstrationEpoch);

  return (
    <Screen key={demonstrationEpoch} scope={scope} demonstrationEpoch={demonstrationEpoch} />
  );
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
 * Every screen enters through {@link lazyRoute}, so its module is fetched when its address is first
 * matched and the landing screen is the only one a cold load pays for. The three elements this shell owns
 * — the entry redirect, the stage notice and the not-found page — stay in the initial chunk, because each
 * is a handful of lines and one of them is the answer to an address nothing matched.
 *
 * React Router ranks the children by specificity rather than by declaration order, so a detail path is
 * matched ahead of the catch-all wherever it sits; the order below follows the screens' own order, with the
 * stage notices where the navigation table introduces them.
 */
export const appRoutes: RouteObject[] = [
  { index: true, element: <EntryRedirect /> },
  lazyRoute('overview', async () => {
    const { OverviewScreen } = await import('../features/scr-01-overview/overview-screen');

    return <OverviewRoute Screen={OverviewScreen} />;
  }),
  lazyRoute(childPathOf(EXCEPTION_QUEUE_PATH), async () => {
    const { ExceptionQueueScreen } = await import(
      '../features/scr-02-exception-queue/exception-queue-screen'
    );

    return <ExceptionQueueRoute Screen={ExceptionQueueScreen} />;
  }),
  lazyRoute('exceptions/:exceptionId', async () => {
    const { InvestigationScreen } = await import(
      '../features/scr-03-investigation/investigation-screen'
    );

    return <InvestigationRoute Screen={InvestigationScreen} />;
  }),
  lazyRoute('exceptions/:exceptionId/scenarios', async () => {
    const { ScenarioComparisonScreen } = await import(
      '../features/scr-04-scenario-comparison/scenario-comparison-screen'
    );

    return <ScenarioComparisonRoute Screen={ScenarioComparisonScreen} />;
  }),
  lazyRoute('approvals', async () => {
    const { ApprovalsScreen } = await import(
      '../features/scr-05-approvals-and-audit/approvals-screen'
    );

    return <ApprovalsRoute Screen={ApprovalsScreen} />;
  }),
  lazyRoute('approvals/:approvalId', async () => {
    const { ApprovalDetailScreen } = await import(
      '../features/scr-05-approvals-and-audit/approval-detail-screen'
    );

    return <ApprovalDetailRoute Screen={ApprovalDetailScreen} />;
  }),
  lazyRoute('audit', async () => {
    const { AuditScreen } = await import('../features/scr-05-approvals-and-audit/audit-screen');

    return <AuditRoute Screen={AuditScreen} />;
  }),
  lazyRoute('assistant', async () => {
    const { AssistantScreen } = await import(
      '../features/scr-06-evidence-assistant/assistant-screen'
    );

    return <AssistantRoute Screen={AssistantScreen} />;
  }),
  lazyRoute('admin/sovereignty', async () => {
    const { SovereigntyScreen } = await import(
      '../features/scr-07-sovereignty-and-policies/sovereignty-screen'
    );

    return <SovereigntyRoute Screen={SovereigntyScreen} />;
  }),
  lazyRoute('admin/policies/:policyId', async () => {
    const { PolicyDetailScreen } = await import(
      '../features/scr-07-sovereignty-and-policies/policy-detail-screen'
    );

    return <PolicyDetailRoute Screen={PolicyDetailScreen} />;
  }),
  ...stageNoticeRoutes(),
  lazyRoute('canvas', async () => {
    const { FilemapCanvasScreen } = await import(
      '../features/scr-12-filemap-canvas/filemap-canvas-screen'
    );

    return <CanvasRoute Screen={FilemapCanvasScreen} />;
  }),
  lazyRoute('competitive', async () => {
    const { CompetitiveAtlasScreen } = await import(
      '../features/scr-13-competitive-atlas/competitive-atlas-screen'
    );

    return <CompetitiveAtlasRoute Screen={CompetitiveAtlasScreen} />;
  }),
  { path: '*', element: <NotFoundPage /> },
];
