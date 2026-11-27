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
 * theme is innermost because the density it applies follows the active role, and that role is read
 * from the store inside the service boundary. This module renders no markup of its own beyond those
 * three providers.
 *
 * NO DATA LOADING HERE. The file holds no `fetch`, no port read and no query of its own: screens own
 * their reads through the cache, and the only member of the port this module's subtree touches is the
 * start-up handshake `ServiceProvider` already performs (AAP 0.12.1, AAP 0.18.1).
 *
 * Rules served:
 * - P-2: the only data boundary in the tree is `ServiceProvider`. This module imports no seed module,
 *   no mock adapter and no HTTP client, and constructs none — `src/services/create-service.ts` stays
 *   the single binding point.
 * - P-6: nothing here writes a figure, an amount, an identifier or a record value. The scope's "all"
 *   selection is the empty array `src/types/service.ts` defines it as, never a plant or product code.
 * - B-1: nothing here requests anything from any origin.
 * - B-2: no environment read, no credential and no configuration value; nothing in this file is
 *   configurable.
 * - B-3: the providers render no control and add no focus stop. `data-theme` and `data-density` stay
 *   with `src/theme/theme-provider.tsx`, which applies both before the first paint, so the first
 *   frame a reader receives already carries a theme and a density.
 * - P-4: no statement here claims that the application establishes a configuration, prevents a copy
 *   or resists an edit.
 * - P-7: the product's own vocabulary only — Site Intelligence and the FileMap canvas — and no
 *   company, customer or model name of the real world.
 *
 * No test hook. Nothing here reads a query parameter, a global or a flag to change behaviour, and no
 * branch below exists for a test's benefit: the simulation popover and the role switcher are product
 * features, and every browser test drives them as a reader would.
 */
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';

import { ServiceProvider } from '../services/service-provider';
import { ThemeProvider, defaultDensityForRole } from '../theme/theme-provider';
import type { Role } from '../types/entities';
import type { Scope } from '../types/service';

/* ---------------------------------------------------------------------------------------------
 * The shell's state — AAP 0.12.1 "Shell", platform-specification.md §5.1
 * ------------------------------------------------------------------------------------------- */

/**
 * What the shell shares with the screens below it, and the setters that change it.
 *
 * Five values, each owned by exactly one surface and read by several: the active role (the role
 * switcher, read by this file for the theme's default density), the scope filters (the top bar, read
 * by every list call and aggregate), the selected node (both FileMap canvas lenses), the wall-mode
 * flag (the canvas) and the simulation popover's open state (the badge and the popover itself).
 *
 * The setters take the value to store rather than a reducer action, because no transition here has a
 * rule beyond assignment; where a change has a consequence — a role switch appends an audit event
 * through the service, a scope change re-reads what is in scope — the consequence belongs to the
 * caller that made the change, not to this store.
 */
export interface ShellState {
  /**
   * The persona the service is acting as, or `null` before the shell has established one.
   *
   * It starts `null` because the port declares no active-user read: `platform-contracts.md` §2 fixes
   * `SiteIntelligenceService` method for method and none of its members reports the acting persona.
   * The value therefore arrives from the one call that does report it — `switchRole` on the
   * demonstration capability in `src/services/demonstration-controls.ts`, which
   * `src/app/role-switcher.tsx` invokes and whose returned `ActiveUser` it hands to
   * `setActiveRole`. Nothing depends on the value being set: the theme falls back to its comfortable
   * density while it is `null`, and no screen derives authority from it, because the adapter evaluates
   * the permission matrix against its own acting persona rather than trusting a caller's field
   * (rule P-3 — the checks behind the switcher are a demonstration, not production authorisation).
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
   * Returns every field to its initial value.
   *
   * `Reset demo data` in the simulation popover resets the adapter's records through the port; this
   * member resets the shell's own view of the session, which the adapter cannot reach. It restores all
   * five fields — including closing the popover — so a reader who resets the demonstration sees the
   * shell as a first-time visitor does rather than keeping a selection that pointed at a record the
   * reset replaced.
   */
  resetShell(): void;
}

/**
 * The five data fields, without the setters: the shape both the store's initial state and
 * {@link ShellState.resetShell} restore.
 */
type ShellData = Pick<
  ShellState,
  'activeRole' | 'scope' | 'selectedNodeId' | 'wallMode' | 'simulationOpen'
>;

/**
 * The state a first-time visitor's shell starts in, freshly allocated on every call.
 *
 * A function rather than a constant, because the scope holds two arrays: a shared constant would let a
 * consumer's in-place sort or splice reach the value `resetShell` restores, and the reset would then
 * restore a selection that was never the initial one. Each call returns new arrays and a new object,
 * so the initial value cannot be mutated by anyone holding a previous copy.
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
  };
}

/**
 * The shell's state, read through a zustand hook so a component re-renders on the fields it selects
 * rather than on every change.
 *
 * Created without persistence middleware (contracts §1: theme and density are the only preferences
 * written to browser storage, and the theme provider owns them), and without any other middleware, so
 * a value read here is the value a setter stored and nothing observes, transforms or replays it.
 *
 * {@link ShellState.resetShell} merges the initial data fields over the current state, so the setters
 * survive a reset and a subscriber to a data field sees it return to its initial value.
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

  resetShell: () => {
    set(initialShellData());
  },
}));

/* ---------------------------------------------------------------------------------------------
 * The query cache — AAP 0.6.2, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * Builds the cache every screen reads through.
 *
 * Query keys are `[method, ...args]` and a write invalidates the keys it touched; that convention is
 * applied at the call sites, which are the screens and the components that own a read. This function
 * only creates the client.
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
 * Applies the density the active persona starts on, and renders the theme around the shell.
 *
 * Declared as its own component rather than read inside `AppProviders`, so the role subscription sits
 * below the cache and the service boundary: a role change then re-renders the theme and the shell
 * under it, and leaves the provider stack that holds the adapter's start-up attempt untouched. It is
 * rendered inside the boundary, so the store it reads is the one the shell's screens read.
 *
 * Until a role is set, the theme receives no `defaultDensity` and falls back to its own comfortable
 * default. The prop is passed by spreading one of two prop objects rather than as `undefined`, because
 * `exactOptionalPropertyTypes` distinguishes an absent optional property from one explicitly set to
 * `undefined`, and the theme provider's declaration is the stricter of the two.
 */
function ShellProviders({ children }: { readonly children: ReactNode }): ReactElement {
  const activeRole = useShellStore((state) => state.activeRole);
  const densityProps =
    activeRole === null ? {} : { defaultDensity: defaultDensityForRole(activeRole) };

  return <ThemeProvider {...densityProps}>{children}</ThemeProvider>;
}

/** Props of {@link AppProviders}. */
export interface AppProvidersProps {
  /** The shell, its navigation and the router outlet. */
  readonly children: ReactNode;
}

/**
 * The whole provider tree the application composes through, in the one order it must have.
 *
 * The cache is created once per mount, in a state initialiser rather than as a module-level constant,
 * so every mount begins with an empty cache and a failing query in one render cannot be seen by the
 * next. The service boundary comes next and renders the accessible skeleton while the in-browser
 * adapter prepares the seeded records; the theme comes last, around the shell, so the density it
 * applies can follow the role the shell has established.
 *
 * @param props - The shell to render inside the providers.
 * @returns The provider tree with the shell inside it.
 */
export function AppProviders({ children }: AppProvidersProps): ReactElement {
  const [queryClient] = useState<QueryClient>(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceProvider>
        <ShellProviders>{children}</ShellProviders>
      </ServiceProvider>
    </QueryClientProvider>
  );
}

