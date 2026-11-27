/**
 * Component suite for `service-provider.tsx`, the React boundary every screen reaches the service
 * through: the persona it publishes, which is the one value that changes during a session, and the
 * region a start-up that could not finish is reported in.
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP. The boundary publishes the
 * persona the adapter reported when its start-up settled, on the first paint, from exactly one read of
 * the adapter — so a screen that acts as the persona never renders a frame in which nobody is known and
 * a mount does not cost a second identity call. And when the cache the boundary reads that persona
 * through is re-read, the value it publishes becomes the persona the adapter reports at that moment:
 * that is the mechanism a role switch and a `Reset demo data` both drive, because each invalidates the
 * cache whole once the port has resolved, and it is what stops "Assign to me" from naming the persona
 * the session started as after a switch (AAP 0.6.3 "Identity", rule P-8). A start-up that could not
 * finish is covered beside them: a rejection that is not a `Problem` is reported in the module's own
 * sentence rather than in the rejection's text, which is an internal diagnostic a reader must not be
 * shown, while a `Problem` reaches the region with the service's own message and identifier.
 *
 * THE BINDING POINT IS MOCKED AND THE BOUNDARY IS REAL. `./create-service` is replaced, because the
 * in-browser adapter hashes two hundred seeded audit events through Web Crypto in its bootstrap and
 * would make this suite a test of the platform rather than of the boundary. The fake it returns answers
 * `getActiveUser()` from a mutable stub and counts the calls, so a case can prove that the boundary
 * re-read the adapter rather than serving a snapshot; `whenServiceReady()` settles, or rejects with the
 * value a case sets, so the boundary's own `<Suspense>` pass completes inside the case and the failure
 * region is reachable as well. `QueryClientProvider` is real, because the entry the boundary reads is
 * the subject: the suite could not observe a re-read through a stub of it.
 *
 * THE PERSONAS ARE FABRICATED HERE. Two records with a role each the contracts enumerate, named as the
 * records under test, so no seeded user identifier, person's name or plant code appears in this file
 * (rules P-2, P-6, P-7). Nothing here reads the clock, the network, a configuration value or a
 * credential (rules B-1, B-2), and no snapshot is taken: every assertion is behavioural.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default. Nothing here hashes, so no
 * `@vitest-environment` comment is needed.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActiveUser } from '../types';
import type { Problem } from '../types/service';
import { SERVICE_PROVIDER_TEXT, ServiceProvider, useActiveUser } from './service-provider';

/* ---------------------------------------------------------------------------------------------
 * The binding point, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/** The identity the fake adapter reports, and the number of times it was asked for it. */
interface IdentityStub {
  /** The persona the session starts as: what the boundary's start-up read answers. */
  readonly first: ActiveUser;

  /** The persona a switch would leave the adapter enforcing. */
  readonly second: ActiveUser;

  /** The persona the fake adapter is enforcing now, which a case replaces to simulate a switch. */
  current: ActiveUser;

  /** How many times the boundary asked the adapter for the acting persona. */
  reads: number;

  /**
   * What the readiness handshake rejects with, or `null` when it settles.
   *
   * A case sets it to a value that is not a `Problem` to reach the region a start-up that could not
   * report a cause renders, and to a `Problem` to prove that one passes through with its own message.
   */
  startupFailure: Error | Problem | null;
}

/**
 * The stub, created before the module under test is loaded.
 *
 * Both personas are written out rather than named after a seed record, and `current` starts at the
 * first, which is the state a freshly prepared session reports.
 */
const stub = vi.hoisted<IdentityStub>(() => ({
  first: {
    id: 'persona-under-test-first',
    name: 'Persona under test, first',
    role: 'material-planner',
    plantIds: [],
    permissions: [],
    homeRoute: '/exceptions',
  },
  second: {
    id: 'persona-under-test-second',
    name: 'Persona under test, second',
    role: 'plant-manager',
    plantIds: [],
    permissions: [],
    homeRoute: '/exceptions',
  },
  current: {
    id: 'persona-under-test-first',
    name: 'Persona under test, first',
    role: 'material-planner',
    plantIds: [],
    permissions: [],
    homeRoute: '/exceptions',
  },
  reads: 0,
  startupFailure: null,
}));

/** The correlation identifier every envelope this suite builds carries. */
const TRACE_ID = 'trace-service-provider-under-test';

/**
 * Replaces the binding point the boundary reads its adapter, its capability and its readiness from.
 *
 * The capability answers the acting-persona read from the stub and counts it, so a case can tell a
 * re-read from a cached value; the switch and the roster are present so the value the boundary hands
 * its consumers carries the whole capability, even though no case here drives them.
 */
vi.mock('./create-service', () => {
  /** One payload in the envelope every service call resolves (contracts §2). */
  const result = <T,>(data: T) => ({
    data,
    meta: { freshness: [], simulated: true as const, traceId: TRACE_ID },
  });

  return {
    createService: () => ({}),
    whenServiceReady: () =>
      stub.startupFailure === null
        ? Promise.resolve()
        : Promise.reject(stub.startupFailure),
    getDemonstrationControls: () => ({
      switchRole: async () => result(stub.current),
      listPersonas: async () => result([stub.first, stub.second]),
      getActiveUser: async () => {
        stub.reads += 1;

        return result(stub.current);
      },
    }),
  };
});

/* ---------------------------------------------------------------------------------------------
 * Helpers every case renders through
 * ------------------------------------------------------------------------------------------- */

/** The lead-in the probe prints, so the persona in force is read off the page. */
const PROBE_PREFIX = 'Persona under test: ';

/** Prints the persona the boundary publishes, or that it publishes none. */
function PersonaProbe(): ReactElement {
  const activeUser = useActiveUser();

  return <p>{`${PROBE_PREFIX}${activeUser === null ? 'none' : activeUser.id}`}</p>;
}

/** The line the probe renders for one persona, so a case awaits the value rather than a selector. */
function probeLine(persona: ActiveUser): string {
  return `${PROBE_PREFIX}${persona.id}`;
}

/**
 * Renders the boundary, with the probe inside it, under the cache it reads through.
 *
 * Awaited through an async `act` scope, because the boundary suspends into its skeleton while the
 * start-up settles and React retries the suspended subtree only inside an awaited scope: a synchronous
 * render would leave the case looking at the first paint. A fresh client per case, so no entry and no
 * in-flight read is carried from one case into the next.
 *
 * @returns The client the case mounted, so it can drive the re-read the shell drives.
 */
async function renderBoundary(): Promise<QueryClient> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <ServiceProvider>
          <PersonaProbe />
        </ServiceProvider>
      </QueryClientProvider>,
    );
  });

  return client;
}

/* ---------------------------------------------------------------------------------------------
 * One case starts from a fresh session
 * ------------------------------------------------------------------------------------------- */

/**
 * Every case starts from a start-up that settles, the adapter acting as the first persona and no read
 * counted yet.
 */
beforeEach(() => {
  stub.current = stub.first;
  stub.reads = 0;
  stub.startupFailure = null;
});

/* ---------------------------------------------------------------------------------------------
 * The identity the boundary publishes
 * ------------------------------------------------------------------------------------------- */

describe('ServiceProvider', () => {
  it('publishes the persona the start-up read on the first paint, without a second adapter read', async () => {
    await renderBoundary();

    /* The start-up's own read is the published value, so the shell's first paint already states who
       the session acts as: no frame with nobody known, which is what a screen reading the value for a
       write would have to fall back from. */
    expect(await screen.findByText(probeLine(stub.first))).toBeInTheDocument();

    /* Exactly one call: the start-up's. Mounting the boundary must not add a second identity read,
       because a switch and a reset are the two events that change the answer. */
    expect(stub.reads).toBe(1);
  });

  it('publishes the persona the adapter reports now once the cache is re-read', async () => {
    const client = await renderBoundary();

    expect(await screen.findByText(probeLine(stub.first))).toBeInTheDocument();

    /*
     * What a role switch and a `Reset demo data` both do once the port has resolved: the adapter's
     * persona has changed and the cache is invalidated whole. The boundary must then publish the
     * persona the adapter enforces now, which is the value a write acts as.
     */
    stub.current = stub.second;

    await act(async () => {
      await client.invalidateQueries();
    });

    expect(await screen.findByText(probeLine(stub.second))).toBeInTheDocument();
    /* A re-read, not a snapshot: the adapter was asked again rather than remembered. */
    expect(stub.reads).toBe(2);
  });
});

/* ---------------------------------------------------------------------------------------------
 * What a start-up that could not finish is reported as
 * ------------------------------------------------------------------------------------------- */

/**
 * A rejection shaped like the adapter's own broken-record-set errors.
 *
 * It names a source path, which is exactly what such a message does and exactly what the region in
 * front of a reader must not print. It is authored here rather than quoted from the adapter, so this
 * suite fails if the region ever starts echoing a rejection's own text.
 */
const INTERNAL_DIAGNOSTIC =
  'The seeded record set is broken: src/seed/users.ts must publish at least one user record.';

/** A refusal in the service's own `Problem` shape, which the region prints as the service stated it. */
const SERVICE_MESSAGE = 'The seeded records could not be prepared, so this attempt is over.';

describe('the start-up failure region', () => {
  it('states its own sentence for a rejection that is not a Problem, never the rejection text', async () => {
    stub.startupFailure = new Error(INTERNAL_DIAGNOSTIC);

    await renderBoundary();

    expect(await screen.findByText(SERVICE_PROVIDER_TEXT.startupUnreported)).toBeInTheDocument();

    /* The rejection is an internal diagnostic written for a developer. A reader sees the module's own
       sentence, so neither the message nor the source path it carries reaches the page. */
    const rendered = document.body.textContent ?? '';

    expect(rendered).not.toContain(INTERNAL_DIAGNOSTIC);
    expect(rendered).not.toContain('src/');
  });

  it('passes a Problem through with the service’s own message and correlation identifier', async () => {
    stub.startupFailure = { type: 'validation', message: SERVICE_MESSAGE, traceId: TRACE_ID };

    await renderBoundary();

    /* The service's account of the failure is the one on screen, and the identifier it carried is the
       one a reader could quote back for support (AAP 0.18.1). */
    expect(await screen.findByText(SERVICE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(TRACE_ID)).toBeInTheDocument();
  });
});
