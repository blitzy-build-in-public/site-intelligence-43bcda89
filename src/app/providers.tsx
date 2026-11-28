/**
 * The composition root's providers and the shell store: the query cache every screen reads through,
 * the service boundary the whole application reaches records through, the theme that owns the two
 * persisted preferences, and the in-memory state the top bar, the navigation, the canvas and the
 * simulation popover share.
 *
 * Fixed by AAP 0.12.1 ("Provider" and "Shell" rows), which gives this file exactly this content — a
 * `QueryClient` keyed by `[method, ...args]` with invalidation after every write, the
 * `ServiceProvider`, the `ThemeProvider`, and the shell store for the active role, the scope filters
 * and the selected node — and by AAP 0.13.1, whose tree places it in the shell. `src/app/app.tsx`
 * renders `AppProviders` once, above the navigation and the router outlet, so no route can mount
 * itself outside any of the three providers.
 *
 * WHY THE STORE LIVES HERE. The plan names no separate store module, and the only two values the
 * application persists — theme and density — belong to `src/theme/theme-provider.tsx`. Everything
 * held below is session state a reload discards (contracts §1), so the store is created with no
 * persistence middleware of any kind: theme and density are the only preferences written to browser
 * storage, and they are written by the theme provider, not here.
 *
 * WHY THE COMPOSITION IS IN THIS ORDER. The query cache is outermost because every screen reads
 * through it. The service boundary sits inside it because its own start-up wait renders the
 * accessible skeleton in place of the shell, and because a screen's first query must not run against
 * an adapter that has not finished preparing the seeded records and hashing the audit trail. The
 * theme is innermost because the density it applies follows the persona in force, which comes from the
 * shell store above it and from the boundary's own start-up read — which is why the seed and the theme
 * both sit inside the service boundary. This module renders no markup of its own beyond those three
 * providers and the seed that writes the persona into the store.
 *
 * NO DATA LOADING HERE. The file holds no `fetch`, no adapter import and no query of its own: screens
 * own their reads through the cache, and the only value the shell reads for itself is the start-up
 * identity, taken through the boundary's `useActiveUser()` because the persona the adapter enforces is
 * what the theme's density, the router's entry route and the role switcher's display all describe (AAP
 * 0.6.3 "Identity"). The handshake that produces it stays `ServiceProvider`'s own (AAP 0.12.1, AAP
 * 0.18.1).
 *
 * THE CACHE IS FED BY THE WRITES, NOT BY AGE. Two things below make that true together, and neither
 * works without the other. A cached answer lives for {@link CACHE_LIFETIME_MS} rather than expiring the
 * moment it lands (AAP §0.6.2), and every resolved audited write invalidates the reads it moved through
 * the one map in `src/services/write-reads.ts` — including entries with no observer mounted, which is
 * the case a screen-driven invalidation loses when the screen that started the write unmounts inside the
 * write's own 150-400 ms (AAP §0.3.2). The subscription that does it is {@link WriteInvalidationSync}: a
 * subscription to the write channel, not a query and not a load, so it sits outside `ServiceProvider`
 * where no start-up wait can delay it.
 *
 * Rules served:
 * - P-2: the only data boundary in the tree is `ServiceProvider`. This module imports no seed module,
 *   no mock adapter and no HTTP client, and constructs none — `src/services/create-service.ts` stays
 *   the single binding point. The one service module it reads, `write-reads.ts`, holds a table of port
 *   member names and reaches no record, which is what lets the shell invalidate by name without becoming
 *   a second path to the data.
 * - P-6: nothing here writes a figure, an amount, an identifier or a record value. The scope's "all"
 *   selection is the empty array `src/types/service.ts` defines it as, never a plant or product code.
 * - B-1: nothing here requests anything from any origin.
 * - B-2: no environment read, no credential and no configuration value; nothing in this file is
 *   configurable.
 * - B-3: the providers render no control and add no focus stop. `data-theme` and `data-density` stay
 *   with `src/theme/theme-provider.tsx`, which applies both before any component renders, and the
 *   stylesheet carries the Command palette and the compact row as the document default for the
 *   frame painted before that module executes, so the first frame a reader receives already carries a
 *   theme and a density.
 * - P-4: no statement here claims that the application establishes a configuration, prevents a copy
 *   or resists an edit.
 * - P-7: the product's own vocabulary only — Site Intelligence and the FileMap canvas — and no
 *   company, customer or model name of the real world.
 *
 * No test hook. Nothing here reads a query parameter, a global or a flag to change behaviour, and no
 * branch below exists for a test's benefit: the simulation popover and the role switcher are product
 * features, and every browser test drives them as a reader would.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';

import { ServiceProvider, useActiveUser } from '../services/service-provider';
import { ThemeProvider, defaultDensityForRole } from '../theme/theme-provider';
import type { Role } from '../types/entities';
import type { Scope } from '../types/service';
import { observeWriteReads } from '../services/write-reads';

/* ---------------------------------------------------------------------------------------------
 * The shell's state — AAP 0.12.1 "Shell", platform-specification.md §5.1
 * ------------------------------------------------------------------------------------------- */

/**
 * What the shell shares with the screens below it, and the setters that change it.
 *
 * Six values, each owned by exactly one surface and read by several: the active role (the role
 * switcher, read by this file for the theme's default density), the scope filters (the top bar, read
 * by every list call and aggregate), the selected node (both FileMap canvas lenses), the wall-mode
 * flag (the canvas), the simulation popover's open state (the badge and the popover itself) and the
 * one sentence the shell announces after an action that closes its own panel.
 *
 * The setters take the value to store rather than a reducer action, because no transition here has a
 * rule beyond assignment; where a change has a consequence — a role switch appends an audit event
 * through the service, a scope change re-reads what is in scope — the consequence belongs to the
 * caller that made the change, not to this store.
 */
export interface ShellState {
  /**
   * The persona the reader has switched to, or `null` while the session acts as the persona it was
   * seeded with.
   *
   * The field holds a selection rather than the whole identity. `src/app/role-switcher.tsx` invokes
   * `switchRole` on the demonstration capability of `src/services/demonstration-controls.ts` and hands
   * the returned persona's role to `setActiveRole`. The persona in force is `useActiveRole()`, which
   * answers this selection when there is one and the persona the adapter reported at start-up otherwise
   * — so the shell displays the role the adapter enforces before anyone has switched, and keeps
   * displaying the one it switched to, because `Reset demo data` restores the adapter's records and
   * leaves the persona both of them act as alone (AAP 0.6.3 "Identity").
   *
   * No screen derives authority from it: the adapter evaluates the permission matrix against its own
   * acting persona rather than trusting a caller's field (rule P-3 — the checks behind the switcher are
   * a demonstration, not production authorisation).
   */
  activeRole: Role | null;

  /**
   * The top bar's plant and product filters, before the acting role's plant scope is applied.
   *
   * An empty array is the "All plants" or "All products" selection, exactly as `Scope` in
   * `src/types/service.ts` defines it. The service intersects this selection with the role's plant
   * scope before a list is filtered or an aggregate is computed (AAP 0.2.1), so the shell carries the
   * reader's selection and never resolves a scope itself — which is what keeps a filtered queue and a
   * filtered overview from disagreeing.
   */
  scope: Scope;

  /**
   * The node selected on the FileMap canvas, or `null` when nothing is selected.
   *
   * One selection serves both lenses (AAP 0.12.4): switching between the map and the graph keeps the
   * record under the reader's attention, so the value is an identifier rather than a lens-specific
   * object.
   */
  selectedNodeId: string | null;

  /**
   * Whether the canvas is presenting itself without the shell's navigation.
   *
   * A presentation mode only: it hides the navigation and changes nothing about what may be read.
   */
  wallMode: boolean;

  /**
   * Whether the single simulation popover is open.
   *
   * Held here rather than inside the popover so the persistent `Simulated data` badge can open it
   * from any route, which is the only way the seven states, the edited audit event, the emptied queue
   * and `Reset demo data` are reached (AAP 0.10, AAP 0.12.4).
   */
  simulationOpen: boolean;

  /** Acts as another persona, or clears the persona the shell holds. */
  setActiveRole(role: Role | null): void;

  /** Replaces the top bar's plant and product selection. */
  setScope(scope: Scope): void;

  /** Selects a canvas node, or clears the selection. */
  setSelectedNodeId(nodeId: string | null): void;

  /** Enters or leaves the canvas's wall mode. */
  setWallMode(on: boolean): void;

  /** Opens or closes the simulation popover. */
  setSimulationOpen(open: boolean): void;

  /**
   * The outcome of an action that took the control it was pressed from off the screen, or `''`.
   *
   * The reset closes the panel it is pressed in, so the confirmation a sighted reader gets from the
   * panel's disappearance is nothing to a reader using assistive technology: the sentence lands here
   * and the shell renders it in its own status region, which outlives the panel (rule B-3, WCAG 2.2
   * SC 4.1.3). It is the shell's rather than the popover's because the popover unmounts as it closes.
   */
  announcement: string;

  /** Writes the shell's announcement, or clears it with the empty string. */
  setAnnouncement(announcement: string): void;

  /**
   * Returns the shell's own view of the session to a first visit's state.
   *
   * NOT the demonstration's reset. `Reset demo data` restores the adapter's records and leaves the
   * reader's persona, scope filters, selection, wall mode and the popover's own flag standing, so no
   * screen or control calls this member; what needs it is a suite that drives the shell more than once,
   * which has to return the store to its opening state between cases for the same reason a fresh page
   * starts there. It restores all five fields.
   */
  resetShell(): void;
}

/**
 * The five data fields, without the setters: the shape the store's initial state is built from.
 */
type ShellData = Pick<
  ShellState,
  'activeRole' | 'scope' | 'selectedNodeId' | 'wallMode' | 'simulationOpen' | 'announcement'
>;

/**
 * The state a first-time visitor's shell starts in, freshly allocated on every call.
 *
 * A function rather than a constant, because the scope holds two arrays: a shared constant would let a
 * consumer's in-place sort or splice reach the value a later call returns, and the store built from it
 * would start on a selection that was never the initial one. Each call returns new arrays and a new
 * object, so the initial value cannot be mutated by anyone holding a previous copy.
 *
 * The scope begins empty on both members, which is the "All plants" and "All products" selection the
 * type defines rather than a filter naming nothing (rule P-6: no plant or product code is written
 * here).
 *
 * @returns The initial shell state, with the setters supplied by the store itself.
 */
function initialShellData(): ShellData {
  return {
    activeRole: null,
    scope: { plants: [], products: [] },
    selectedNodeId: null,
    wallMode: false,
    simulationOpen: false,
    announcement: '',
  };
}

/**
 * The shell's state, read through a zustand hook so a component re-renders on the fields it selects
 * rather than on every change.
 *
 * Created without persistence middleware (contracts §1: theme and density are the only preferences
 * written to browser storage, and the theme provider owns them), and without any other middleware, so
 * a value read here is the value a setter stored and nothing observes, transforms or replays it. Each
 * field moves through its own setter: a demonstration reset restores the adapter's records and leaves
 * the persona in force — and every other value a reader chose here — as they left it, while the closing
 * popover takes its own open flag back. {@link ShellState.resetShell} is the store's own way back to
 * the opening state and no application control calls it.
 */
export const useShellStore: UseBoundStore<StoreApi<ShellState>> = create<ShellState>()((set) => ({
  ...initialShellData(),

  setActiveRole: (role) => {
    set({ activeRole: role });
  },

  setScope: (scope) => {
    set({ scope });
  },

  setSelectedNodeId: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  setWallMode: (on) => {
    set({ wallMode: on });
  },

  setSimulationOpen: (open) => {
    set({ simulationOpen: open });
  },

  setAnnouncement: (announcement) => {
    set({ announcement });
  },

  resetShell: () => {
    set(initialShellData());
  },
}));

/* ---------------------------------------------------------------------------------------------
 * The persona in force — AAP 0.6.3 "Identity", AAP 0.12.4
 * ------------------------------------------------------------------------------------------- */

/**
 * The persona in force: the one a role switch selected when there is one, otherwise the one the
 * adapter reported at start-up.
 *
 * Two sources in one order, because the shell may or may not have been switched. A role switch stores
 * the persona it returned and that selection wins while it stands; before any switch, the persona in
 * force is the one the adapter reported when its start-up settled, which is the persona a fresh session
 * acts as (AAP 0.6.3 "Identity"). Both survive `Reset demo data`: the shell holds the selection it was
 * given because nothing clears it, and the adapter keeps acting as the persona it names because
 * `resetDemo` restores the records and leaves that one value alone — so the two can never describe two
 * different people after a reset.
 *
 * Consumers that need the persona read it here: the theme's default density, the router's entry route
 * and the role switcher's own display all describe the session that is acting, so all three take one
 * value (AAP 0.12.4). None of them derives authority from it, because the adapter evaluates the
 * permission matrix and the policy engine against its own persona rather than against anything the
 * interface holds: the checks behind the switcher are a demonstration and not production
 * authorisation (rule P-3).
 *
 * @returns The persona in force, or `null` when neither source has one — an adapter carrying no
 *   demonstration capability, before any role switch.
 */
export function useActiveRole(): Role | null {
  const selectedRole = useShellStore((state) => state.activeRole);
  const activeUser = useActiveUser();

  return selectedRole ?? activeUser?.role ?? null;
}

/* ---------------------------------------------------------------------------------------------
 * The query cache — AAP 0.6.2, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * How long a cached answer is served before the cache re-derives it without a write having asked it to:
 * five minutes.
 *
 * WHY AGE AT ALL, AND WHY THIS MUCH. The records change only through audited writes, and every write
 * invalidates the reads it moves (AAP §0.6.2), so a cached answer is refreshed by the writes rather than
 * by time passing — which is what lets a reader leave a screen and come back without paying the mock
 * adapter's 150-400 ms again for every read of it (AAP §0.2.1). Without a lifetime every entry is stale
 * the instant it lands, and a remount re-issues each read of the screen at that cost for answers that
 * cannot have moved. The bound stays finite because the map can only name the reads the audited writes
 * move: a record changed by a path outside it is served for at most this long instead of for the rest of
 * the session.
 */
const CACHE_LIFETIME_MS = 300_000;

/**
 * How long a read's payload is kept once no screen observes it: one minute.
 *
 * TWO LIFETIMES, TWO QUESTIONS. {@link CACHE_LIFETIME_MS} says how long an answer may be *served* without
 * a write moving it; this one says how long the records of an answer nobody is *looking at* stay in
 * memory, which is what React Query's `gcTime` governs. A payload is dropped a minute after the last
 * screen observing it unmounts, so touring the whole application does not hold every route's records at
 * once — the queue, the trail, the canvas topology and pins and the atlas pack would otherwise all stay
 * resident together long after the reader had moved on — while the minute is measured from the moment the
 * last observer leaves, so a screen the reader is still looking at never loses its payload, and the port's
 * own latency band keeps the re-read a returning screen makes cheap (QA1-02).
 */
const QUERY_CACHE_GC_TIME_MS = 60_000;

/**
 * Builds the cache every screen reads through.
 *
 * This function fixes the key convention the whole cache follows: every read is made under
 * `[method, ...args]`, the port member's own name first, and the invalidation a write owes the reads
 * it touched is issued by the owner of that write once the port has resolved it — that write calls
 * `queryClient.invalidateQueries` for the members it moved, with the key window being the member's own
 * name (AAP 0.6.2). The same invalidation is issued a second time, by member name and from the write
 * itself, by {@link WriteInvalidationSync}, so a write whose own screen has unmounted still moves what it
 * moved; both paths read the one list in `src/services/write-reads.ts`, so they cannot disagree. This
 * function only creates the client: it fixes that convention, the two lifetimes below, and it invalidates
 * nothing itself.
 *
 * TWO LIFETIMES, TWO QUESTIONS. A cached answer is *served* for {@link CACHE_LIFETIME_MS} — the writes are
 * what refresh an entry, and the lifetime is the outer bound that keeps an entry moved by something the
 * write-reads map does not cover from being served stale for the session — and its payload is *kept* for
 * {@link QUERY_CACHE_GC_TIME_MS} once no screen observes it, which is the outer bound on what a reader who
 * has left every screen still holds in memory.
 *
 * Retries and window-focus refetches are off, and both are deliberate: the demonstration is
 * deterministic (AAP 0.2.1), so a background refetch could replace a figure the reader is midway
 * through comparing with the one it came from. A failed read is surfaced by `StateBoundary` with the
 * retry control that re-runs it on the reader's instruction, which is the retry the interface offers,
 * rather than a silent second attempt behind it. A failed write is not retried either, because the
 * change a write records is all-or-nothing and a repeated attempt is a new action the reader takes
 * with its own audit event (AAP 0.2.2).
 *
 * @returns A new client. One is built per mount of {@link AppProviders} and never shared between
 *   them, so a test render cannot carry a cache entry into the next case.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: QUERY_CACHE_GC_TIME_MS,
        staleTime: CACHE_LIFETIME_MS,
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/* ---------------------------------------------------------------------------------------------
 * The provider tree — AAP 0.12.1 "Provider", AAP 0.12.4
 * ------------------------------------------------------------------------------------------- */

/**
 * Feeds the cache every write the bound adapter resolves, whichever screen started it.
 *
 * WHY IT EXISTS. The invalidation a write owes its reads was issued by the screen that made the write,
 * so a write whose screen unmounted inside its own 150-400 ms had nobody left to issue it: the assign
 * commits, the audit row is written, and the queue's cached row keeps the pre-write owner until a later
 * remount re-reads it (AAP §0.3.2: a write invalidates the reads it touched, whatever the screen did).
 * The adapter reports each resolved write through `observeWriteReads`, and this component turns that
 * report into invalidation, so the obligation is met by something the navigation cannot remove.
 *
 * WHICH READS IT MOVES, AND WHY THE REFETCH IS FORCED. The report carries the row of the one map in
 * `src/services/write-reads.ts`, so the reads named are the writes' own and not a second list held here.
 * `refetchType: 'all'` is load-bearing rather than a default restated: React Query's default refreshes
 * only entries with a mounted observer, and the write this path exists for has none — its screen is gone
 * — so the default would leave exactly the case that motivated the component (AAP §0.3.2). Naming a member
 * invalidates every entry of that read under every argument list, which is the granularity a write to
 * shared records needs (AAP §0.6.2).
 *
 * WHY IT IS NOT DATA LOADING. The effect subscribes to a channel and returns the unsubscribe; it issues
 * no read of its own, holds no state and renders nothing, which is what AAP §0.18.1 reserves for the
 * cache — "no useEffect for data loading" bars a second data path here, not a subscription. It renders
 * `null` for the reason {@link ActiveRoleSeed} does: what it establishes is a connection rather than
 * markup.
 *
 * It sits inside `<QueryClientProvider>` and outside `<ServiceProvider>`, because the adapter reports a
 * write as soon as one resolves and a write raised during the boundary's start-up must not be missed
 * while that boundary renders its skeleton.
 *
 * Exported for the reason `sideEffectAcknowledgement` is: the colocated suite mounts it beside a probe
 * component to prove that an entry with no observer left refetches when a write is reported, which is a
 * property of this component and cannot be observed through the assembled provider tree without a write
 * reaching the adapter. It is not a test hook — nothing here branches on who is rendering it.
 *
 * @returns Nothing, at any render.
 */
export function WriteInvalidationSync(): null {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      observeWriteReads((reads) => {
        for (const read of reads) {
          void queryClient.invalidateQueries({ queryKey: [read], refetchType: 'all' });
        }
      }),
    [queryClient],
  );

  return null;
}

/**
 * Seeds the shell's persona from the one the adapter reported when the session's start-up settled.
 *
 * The guard is `activeRole === null`, and it is the whole of the rule: the shell adopts the session's
 * persona only while it has selected none of its own, so a reader who has switched role is never
 * overwritten with the seeded one.
 *
 * It runs at most once per session, and that is the second half of the rule rather than a detail. The
 * adoption belongs to the start-up alone: the identity read is re-issued whenever the demonstration's
 * records are restored, and an adoption that ran again would take that answer as the shell's own
 * selection and overwrite the persona the reader chose. The ref makes the one write permanent, so no
 * later read can move the selection, and the role switcher keeps displaying the persona the adapter
 * acts as — which `Reset demo data` leaves in place on both sides.
 *
 * It runs in an effect keyed on the value rather than in the render body, and it sets the store once for
 * the session: an assignment during a render would be a state change while rendering, and the seeding
 * guard above is what keeps the effect idempotent when the value it writes re-renders it.
 * The effect loads nothing — it copies a value already in hand into the store, which is not a query
 * and is not the data loading AAP 0.18.1 reserves for the query cache.
 *
 * It renders nothing, because what it establishes is state rather than markup: the theme, the router
 * and the role switcher read the persona in force through `useActiveRole()` on their next render.
 *
 * It must sit inside `<ServiceProvider>`: `useActiveUser()` is read from that boundary, and it writes
 * the store the shell's screens read below it. `AppProviders` renders it as the boundary's first
 * child, ahead of the theme, so the store is seeded as soon as the boundary mounts and the theme below
 * it takes the adopted persona's density on the next render.
 *
 * @returns Nothing, at any render.
 */
function ActiveRoleSeed(): null {
  const activeUser = useActiveUser();
  const activeRole = useShellStore((state) => state.activeRole);
  const setActiveRole = useShellStore((state) => state.setActiveRole);

  /** Whether this session's start-up persona has already been adopted, once and for all. */
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || activeUser === null || activeRole !== null) {
      return;
    }

    seeded.current = true;
    setActiveRole(activeUser.role);
  }, [activeUser, activeRole, setActiveRole]);

  return null;
}

/**
 * Applies the density the persona in force starts on, and renders the theme around the shell.
 *
 * Declared as its own component rather than read inside `AppProviders`, so the persona subscription
 * sits below the cache and the service boundary: a role change then re-renders the theme and the shell
 * under it, and leaves the provider stack that holds the adapter's start-up attempt untouched. It is
 * rendered inside the boundary, so it can read the persona the adapter reported as well as the
 * selection the shell store holds.
 *
 * Until a persona is in force, the theme receives no `defaultDensity` and falls back to its own compact
 * default, which is the density the seeded persona starts on, so the frame before the start-up read
 * settles is not corrected after paint. The prop is passed by spreading one of two prop objects rather
 * than as `undefined`, because `exactOptionalPropertyTypes` distinguishes an absent optional property
 * from one explicitly set to `undefined`, and the theme provider's declaration is the stricter of the
 * two.
 */
function ShellProviders({ children }: { readonly children: ReactNode }): ReactElement {
  const activeRole = useActiveRole();
  const densityProps =
    activeRole === null ? {} : { defaultDensity: defaultDensityForRole(activeRole) };

  return <ThemeProvider {...densityProps}>{children}</ThemeProvider>;
}

/**
 * What the composition root wraps: the shell — its navigation, its top bar and the router outlet —
 * rendered inside the cache, the service boundary and the theme, in that order (AAP 0.12.1).
 *
 * One child and no configuration: the cache, the bound adapter and the persona's density are this
 * module's to build, so a caller cannot arrive with a second client or point the shell at another
 * adapter.
 */
export interface AppProvidersProps {
  /** The shell, its navigation and the router outlet. */
  readonly children: ReactNode;
}

/**
 * The whole provider tree the application composes through, in the one order it must have.
 *
 * The cache is created once per mount, in a state initialiser rather than as a module-level constant,
 * so every mount begins with an empty cache and a failing query in one render cannot be seen by the
 * next. The write subscription is the cache's first child, ahead of the boundary, so a write that
 * resolves while the adapter is still preparing the seeded records still invalidates the reads it moved.
 * The service boundary comes next and renders the accessible skeleton while the in-browser
 * adapter prepares the seeded records; the seed of the shell's persona is its first child, so the
 * persona the adapter reported reaches the store before the theme reads it; the theme comes last,
 * around the shell, so the density it applies follows the persona in force.
 *
 * @param props - The shell to render inside the providers.
 * @returns The provider tree with the shell inside it.
 */
export function AppProviders({ children }: AppProvidersProps): ReactElement {
  const [queryClient] = useState<QueryClient>(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <WriteInvalidationSync />
      <ServiceProvider>
        <ActiveRoleSeed />
        <ShellProviders>{children}</ShellProviders>
      </ServiceProvider>
    </QueryClientProvider>
  );
}

