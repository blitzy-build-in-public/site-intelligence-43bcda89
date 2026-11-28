/**
 * Component suite for `src/app/providers.tsx`: the composition root's provider tree and the shell
 * store it creates (AAP §0.12.1 "Provider" and "Shell", AAP §0.13.1's tree).
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP. Every case mounts through
 * this module's own `AppProviders`, and a probe component below it reads what the tree provides, so
 * what is proven is the tree's contract rather than a re-creation of it.
 * - The shell store's initial state: no persona selected, no plant and no product selected, no node
 *   selected, wall mode off and the simulation popover closed. Each field is read from the store the
 *   module exports, which is the one a child hook reads.
 * - The store is provided to the children and reacts to them: a probe that calls a setter through
 *   the hook re-renders with the value it stored, so the store is connected and not a constant.
 * - The preferences the theme owns resolve through the tree: with no persona in force the theme is
 *   the module's documented default and the density its documented fallback; with a persona in force
 *   the density is the one that persona's role starts on, which is the resolution the tree exists to
 *   perform. Both are also asserted on the `<html>` attributes the theme provider applies, because a
 *   value returned by `useTheme` and a value on the element are two halves of the same contract.
 * - The two persistence keys are the ones the module documents, and both halves hold: a preference
 *   already stored is adopted on mount, and a preference a child sets is written back under the same
 *   key. These are the only two keys the application ever writes (contracts §1), so the keys
 *   themselves are pinned to their documented literals here rather than only being propagated.
 * - The query cache is provided: a child's read is readable from another child's client, which can
 *   only hold if both were handed the same cache. A second mount builds a fresh cache, so a failing
 *   or answered query in one render cannot be seen by the next.
 * - `resetShell` restores every data field, and the count of demonstration resets starts at zero,
 *   increments through `noteDemonstrationReset()` — the writer `Reset demo data` calls once the port has
 *   resolved — and returns to zero with `resetShell`. That count is what lets a screen holding a view
 *   choice of its own honour a reset without reading this store (AAP §0.18.1).
 *
 * THE SERVICE BOUNDARY IS MOCKED AT THE PROVIDER (rule P-2). The real provider awaits the mock
 * adapter's bootstrap, which hashes two hundred seeded audit events, so a suite that mounted it would
 * be testing the adapter's bootstrap rather than this module. That hash is a platform call and not a
 * DOM one: the chain hashes through `globalThis.crypto.subtle`, and jsdom 31 exposes no
 * `crypto.subtle` of its own, so the digest resolves to the platform's implementation — the
 * environment declaration that carries that requirement with the module, and the reason for it, are
 * stated once in the header of `src/domain/audit/audit.test.ts`. The specifier is the one
 * `providers.tsx` imports; nothing here imports `src/seed`, a mock adapter or the API client.
 *
 * NO FIGURE AND NO RECORD IDENTIFIER IS TYPED (rule P-6). The persona below is a fixture of this
 * suite's own: an identifier-shaped name is avoided entirely, and no amount, count or date appears.
 * The two storage keys are the module's documented configuration keys rather than business data, and
 * they are the one place a literal is asserted rather than only read, which is what makes a silent
 * rename of either key fail here.
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite proves the tree's provisioning rather than auditing a rendered page.
 */
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActiveUser } from '../types/entities';
import {
  DENSITY_STORAGE_KEY,
  THEME_STORAGE_KEY,
  defaultDensityForRole,
  useTheme,
} from '../theme/theme-provider';
import { AppProviders, createQueryClient, useActiveRole, useShellStore } from './providers';

/* ---------------------------------------------------------------------------------------------
 * The service boundary, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/**
 * The persona the stubbed boundary reports at start-up, set per case.
 *
 * Held through `vi.hoisted` so the mutable holder exists before `providers.tsx` is loaded and before
 * the mock factory runs, and typed from the contracts' own `ActiveUser` so a fixture that drifts
 * from the interface fails the type check.
 */
const session = vi.hoisted(() => ({ activeUser: null as ActiveUser | null }));

/** The one prop the pass-through provider receives. */
interface ServiceProviderStubProps {
  /** The provider tree's children, rendered as they are. */
  readonly children?: ReactNode;
}

/**
 * Replaces the provider module `providers.tsx` reads through.
 *
 * `ServiceProvider` passes the tree straight through, so `AppProviders` mounts without the adapter's
 * bootstrap, and `useActiveUser` answers the persona the case set — which is the one input the
 * persona seed below reads. `useService` answers an empty port because nothing in this suite calls a
 * port member: a read added to the module under test would fail here as a missing member rather than
 * reach a real adapter.
 */
vi.mock('../services/service-provider', () => ({
  ServiceProvider: ({ children }: ServiceProviderStubProps) => children,
  useService: () => ({}),
  useActiveUser: () => session.activeUser,
}));

/* ---------------------------------------------------------------------------------------------
 * The fixtures this suite fabricates — no record identifier, no figure (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/** The persona a case can put in force: a role with a recorded density of its own. */
const PERSONA: ActiveUser = {
  id: 'a persona fixture',
  name: 'A persona fixture',
  role: 'material-planner',
  plantIds: [],
  permissions: [],
  homeRoute: '/overview',
};

/** The theme key as the module documents it: one of the only two keys the application writes. */
const DOCUMENTED_THEME_KEY = 'site-intelligence:theme';

/** The density key as the module documents it: the second and last such key. */
const DOCUMENTED_DENSITY_KEY = 'site-intelligence:density';

/** The theme a first-time visitor sees, as the module's default declares it. */
const DEFAULT_THEME = 'command';

/**
 * The density in force while no persona is, as the module documents it: its own documented default,
 * the compact rows the seeded persona starts on — USR-01 the material planner's — so the frame
 * painted before the persona resolves is not corrected after paint.
 */
const FALLBACK_DENSITY = 'compact';

/** The one key this suite's probe read is cached under. */
const PROBE_QUERY_KEY = ['providers-probe'] as const;

/** The value the probe read answers with. */
const PROBE_VALUE = 'a probe reading';

/* ---------------------------------------------------------------------------------------------
 * The probes
 * ------------------------------------------------------------------------------------------- */

/** A mutable slot a probe hands a client to, so a case can compare two mounts' caches. */
interface ClientSlot {
  client: QueryClient | null;
}

/**
 * Reports the shell store's data fields as attributes, and offers the setters the store exposes.
 *
 * The attributes are read from the hook, so a value only appears here if the hook is connected to the
 * store the module exports; the buttons call the setters the hook handed this component.
 */
function ShellProbe(): ReactElement {
  const activeRole = useShellStore((state) => state.activeRole);
  const scope = useShellStore((state) => state.scope);
  const selectedNodeId = useShellStore((state) => state.selectedNodeId);
  const wallMode = useShellStore((state) => state.wallMode);
  const simulationOpen = useShellStore((state) => state.simulationOpen);
  const demonstrationEpoch = useShellStore((state) => state.demonstrationEpoch);
  const setScope = useShellStore((state) => state.setScope);

  return (
    <div
      data-testid="shell-probe"
      data-active-role={activeRole ?? 'none'}
      data-plants={scope.plants.join(' ')}
      data-products={scope.products.join(' ')}
      data-selected-node={selectedNodeId ?? 'none'}
      data-wall-mode={String(wallMode)}
      data-simulation-open={String(simulationOpen)}
      data-demonstration-epoch={String(demonstrationEpoch)}
    >
      <button
        type="button"
        onClick={() => {
          setScope({ plants: [], products: [PROBE_VALUE] });
        }}
      >
        store a product selection
      </button>
    </div>
  );
}

/** Reports the persona in force and the two preferences the theme resolves. */
function ThemeProbe(): ReactElement {
  const activeRole = useActiveRole();
  const { theme, density, setTheme, setDensity } = useTheme();

  return (
    <div data-testid="theme-probe" data-active-role={activeRole ?? 'none'}>
      <span data-testid="theme">{theme}</span>
      <span data-testid="density">{density}</span>
      <button
        type="button"
        onClick={() => {
          setTheme('paper');
          setDensity('compact');
        }}
      >
        choose the other preferences
      </button>
    </div>
  );
}

/** Reads through the query cache and reports what it got, and what a sibling would see of it. */
function QueryProbe({ slot }: { readonly slot: ClientSlot }): ReactElement {
  const client = useQueryClient();
  const read = useQuery({ queryKey: PROBE_QUERY_KEY, queryFn: () => PROBE_VALUE });

  useEffect(() => {
    slot.client = client;
  }, [client, slot]);

  return (
    <div data-testid="query-probe">
      <span data-testid="query-data">{read.data ?? 'nothing'}</span>
      {/* The sibling's view: what this cache holds for the probe's own key. */}
      <span data-testid="query-cache">{String(client.getQueryData(PROBE_QUERY_KEY))}</span>
    </div>
  );
}

/** Hands the cache it was given to a case, without reading through it. */
function ClientProbe({ slot }: { readonly slot: ClientSlot }): ReactElement {
  const client = useQueryClient();

  useEffect(() => {
    slot.client = client;
  }, [client, slot]);

  return <span data-testid="client-probe" />;
}

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/** Mounts one probe through the module's own provider tree. */
function renderThroughProviders(probe: ReactElement): ReturnType<typeof render> {
  return render(<AppProviders>{probe}</AppProviders>);
}

/** The shell probe's element. */
function shellProbe(): HTMLElement {
  return screen.getByTestId('shell-probe');
}

/* ---------------------------------------------------------------------------------------------
 * Every case starts from the seeded shell and no persona in force
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  useShellStore.getState().resetShell();
  session.activeUser = null;
  window.localStorage.clear();
});

/* ---------------------------------------------------------------------------------------------
 * The shell store
 * ------------------------------------------------------------------------------------------- */

describe('AppProviders — the shell store', () => {
  it('starts a first-time visitor in the initial state it documents', () => {
    renderThroughProviders(<ShellProbe />);

    const probe = shellProbe();

    /* No persona selected, and the scope begins empty on both members — the "All plants" and "All
       products" selection `Scope` defines, rather than a filter naming nothing (rule P-6). */
    expect(probe.getAttribute('data-active-role')).toBe('none');
    expect(probe.getAttribute('data-plants')).toBe('');
    expect(probe.getAttribute('data-products')).toBe('');

    /* No node selected, wall mode off and the popover closed, which is the state every route is in
       until a reader acts. */
    expect(probe.getAttribute('data-selected-node')).toBe('none');
    expect(probe.getAttribute('data-wall-mode')).toBe('false');
    expect(probe.getAttribute('data-simulation-open')).toBe('false');
  });

  it('provides the store to a child hook, which reads back what it stores', async () => {
    const user = userEvent.setup();

    renderThroughProviders(<ShellProbe />);

    await user.click(screen.getByRole('button', { name: 'store a product selection' }));

    /* The value the probe wrote through the hook is the value the hook reads on the next render, so
       the store is shared with the child rather than copied into it. */
    expect(shellProbe().getAttribute('data-products')).toBe(PROBE_VALUE);
  });

  it('restores every data field on resetShell', () => {
    renderThroughProviders(<ShellProbe />);

    act(() => {
      const store = useShellStore.getState();

      store.setActiveRole(PERSONA.role);
      store.setScope({ plants: [PROBE_VALUE], products: [PROBE_VALUE] });
      store.setSelectedNodeId(PROBE_VALUE);
      store.setWallMode(true);
      store.setSimulationOpen(true);
    });

    expect(shellProbe().getAttribute('data-wall-mode')).toBe('true');

    act(() => {
      useShellStore.getState().resetShell();
    });

    const probe = shellProbe();

    expect(probe.getAttribute('data-active-role')).toBe('none');
    expect(probe.getAttribute('data-plants')).toBe('');
    expect(probe.getAttribute('data-products')).toBe('');
    expect(probe.getAttribute('data-selected-node')).toBe('none');
    expect(probe.getAttribute('data-wall-mode')).toBe('false');
    expect(probe.getAttribute('data-simulation-open')).toBe('false');
  });

  it('counts a demonstration reset, and returns the count with the rest on resetShell', () => {
    renderThroughProviders(<ShellProbe />);

    /* A session that has just started has never had its records put back. */
    expect(shellProbe().getAttribute('data-demonstration-epoch')).toBe('0');

    act(() => {
      useShellStore.getState().noteDemonstrationReset();
      useShellStore.getState().noteDemonstrationReset();
    });

    /* Counting rather than flagging: a second reset in one session has to be tellable from the first,
       which is what a screen holding a lens or a class in view reads its own choice against. */
    expect(shellProbe().getAttribute('data-demonstration-epoch')).toBe('2');

    act(() => {
      useShellStore.getState().resetShell();
    });

    /* The store's own way back to the opening state starts the count again, so a suite that drives the
       shell more than once begins where a fresh page does. */
    expect(useShellStore.getState().demonstrationEpoch).toBe(0);
  });

  it('seeds the persona the adapter reported, and resolves the theme from it', async () => {
    session.activeUser = PERSONA;

    renderThroughProviders(<ThemeProbe />);

    await waitFor(() => {
      expect(screen.getByTestId('theme-probe').getAttribute('data-active-role')).toBe(
        PERSONA.role,
      );
    });

    /* The persona in force is the shell's selection once the start-up seed ran, and the density is
       the one that persona's role starts on rather than the fallback. */
    expect(useShellStore.getState().activeRole).toBe(PERSONA.role);
    expect(screen.getByTestId('density').textContent).toBe(defaultDensityForRole(PERSONA.role));
  });
});

/* ---------------------------------------------------------------------------------------------
 * The theme and its two persisted preferences
 * ------------------------------------------------------------------------------------------- */

describe('AppProviders — the theme', () => {
  it('resolves the documented defaults with no persona in force', () => {
    renderThroughProviders(<ThemeProbe />);

    expect(screen.getByTestId('theme').textContent).toBe(DEFAULT_THEME);
    expect(screen.getByTestId('density').textContent).toBe(FALLBACK_DENSITY);

    /* The same pair reaches the page, because the theme provider applies both attributes. */
    expect(document.documentElement.dataset.theme).toBe(DEFAULT_THEME);
    expect(document.documentElement.dataset.density).toBe(FALLBACK_DENSITY);
  });

  it('keeps the two preferences under the keys the module documents', () => {
    /* The keys are the module's documented configuration, so they are pinned rather than only read:
       a silent rename of either would leave a stored preference behind and start the reader on the
       defaults instead. */
    expect(THEME_STORAGE_KEY).toBe(DOCUMENTED_THEME_KEY);
    expect(DENSITY_STORAGE_KEY).toBe(DOCUMENTED_DENSITY_KEY);
    expect(THEME_STORAGE_KEY).not.toBe(DENSITY_STORAGE_KEY);
  });

  it('adopts a preference already stored when the tree mounts', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'paper');
    window.localStorage.setItem(DENSITY_STORAGE_KEY, 'compact');

    renderThroughProviders(<ThemeProbe />);

    expect(screen.getByTestId('theme').textContent).toBe('paper');
    expect(screen.getByTestId('density').textContent).toBe('compact');
    expect(document.documentElement.dataset.theme).toBe('paper');
    expect(document.documentElement.dataset.density).toBe('compact');
  });

  it('writes a preference a child sets back under the same key', async () => {
    const user = userEvent.setup();

    renderThroughProviders(<ThemeProbe />);

    await user.click(screen.getByRole('button', { name: 'choose the other preferences' }));

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('paper');
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('compact');
    expect(screen.getByTestId('theme').textContent).toBe('paper');

    /* Nothing else is persisted: the two preferences are the only keys the application writes, so a
       third entry here would be state a reload should have discarded (contracts §1). */
    expect(window.localStorage).toHaveLength(2);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The query cache
 * ------------------------------------------------------------------------------------------- */

describe('AppProviders — the query cache', () => {
  it('provides one cache, so a read made by one child is visible to another', async () => {
    const slot: ClientSlot = { client: null };

    render(
      <AppProviders>
        <QueryProbe slot={slot} />
        <QueryProbe slot={slot} />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('query-data')[0]?.textContent).toBe(PROBE_VALUE);
    });

    /* Both probes read the same entry, which holds only if the tree handed them one client. */
    for (const cache of screen.getAllByTestId('query-cache')) {
      expect(cache.textContent).toBe(PROBE_VALUE);
    }

    expect(slot.client?.getQueryData(PROBE_QUERY_KEY)).toBe(PROBE_VALUE);
  });

  it('builds a fresh cache for each mount, so one render cannot see the last one’s entries', async () => {
    const first: ClientSlot = { client: null };
    const second: ClientSlot = { client: null };

    const firstRender = render(
      <AppProviders>
        <QueryProbe slot={first} />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(first.client?.getQueryData(PROBE_QUERY_KEY)).toBe(PROBE_VALUE);
    });

    firstRender.unmount();

    render(
      <AppProviders>
        <ClientProbe slot={second} />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(second.client).not.toBeNull();
    });

    /* A second tree, a second cache: the entry the first render's read left behind is not visible
       from it, which is the whole reason the client is built in a state initialiser. */
    expect(second.client).not.toBe(first.client);
    expect(second.client?.getQueryData(PROBE_QUERY_KEY)).toBeUndefined();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The cache the module builds, read directly
 * ------------------------------------------------------------------------------------------- */

describe('AppProviders — the policy the cache is built with', () => {
  it('creates a client with retries and window-focus refetches off', () => {
    const client = createQueryClient();

    /* The demonstration is deterministic, so a silent second attempt or a background refetch could
       replace a figure a reader is midway through comparing with the one it came from. */
    expect(client.getDefaultOptions().queries?.retry).toBe(false);
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });
});
