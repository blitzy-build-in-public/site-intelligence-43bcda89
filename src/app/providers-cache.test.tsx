/**
 * The cache's lifetime and its write subscription: the two halves of `src/app/providers.tsx` that make
 * an entry answer the writes and not the clock (AAP 0.6.2, AAP 0.3.2).
 *
 * WHAT THESE CASES PROVE. A cached read is refreshed when an audited write is reported even though the
 * component that made the read has gone — the case a screen-driven invalidation cannot reach, because
 * the write resolves after the screen that started it has unmounted, and the entry is left serving the
 * pre-write answer until some later remount re-reads it. `refetchType: 'all'` is what makes that work,
 * so the first case mounts the write subscription beside a probe rather than the whole shell: it
 * asserts the entry has no observer left, reports a write through the wrapper the binding uses, and
 * then asserts the read was issued again. The second case asserts the other half — a remount inside the
 * cache lifetime serves the answer the cache holds instead of re-issuing every read of the screen at the
 * adapter's 150-400 ms — and the third pins the lifetime itself, which is a specified figure rather than
 * a computed one (AAP 0.2.1, AAP 0.6.2).
 *
 * WHY THE ADAPTER IS A STUB AND THE READ IS A COUNTER. Nothing here is about what a handler answers: the
 * subject is what the cache does when a write resolves, so the adapter carries the one audited write the
 * cases report and the read is a counter the case can inspect. The mock backend's own answers are
 * covered by `src/services/mock/mock-backend.test.ts`, and the wrapper's reporting by
 * `src/services/write-reads.test.ts`; this file covers the join between them, which is the provider's.
 */

import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';

import type { SiteIntelligenceService } from '../services/site-intelligence-service';
import { withWriteReporting } from '../services/write-reads';
import { WriteInvalidationSync, createQueryClient } from './providers';

/* ---------------------------------------------------------------------------------------------
 * The harness — a probe whose observer can be removed while the subscription stays mounted
 * ------------------------------------------------------------------------------------------- */

/** The key the probe reads under: one the queue's assign row invalidates (AAP 0.6.2). */
const QUEUE_READ_KEY: readonly string[] = ['listExceptions'];

/** The cache lifetime the client sets, as AAP 0.6.2's session scope fixes it: five minutes. */
const CACHE_LIFETIME_MS = 300_000;

/** One case's read, with the number of times the cache issued it. */
interface ReadCounter {
  /** The query function: answers afresh on every call, so a second answer is distinguishable. */
  readonly read: () => Promise<string>;

  /** How many times the cache has issued the read. */
  readonly count: () => number;
}

/**
 * A read that answers with its own call number.
 *
 * Counted rather than spied, because what the cases assert is how often the cache asked — a spy would
 * say the same thing and leave the answer indistinguishable between calls.
 *
 * @returns The query function and a reader for its call count.
 */
function countingRead(): ReadCounter {
  let calls = 0;

  return {
    read: () => {
      calls += 1;

      return Promise.resolve(`answer ${String(calls)}`);
    },
    count: () => calls,
  };
}

/**
 * The adapter the cases write through: the one audited write they report, on an object handed over as
 * the port.
 *
 * The cast is the same one `src/services/write-reads.test.ts` states — a double of a 46-member interface
 * carries the members its case uses — and it keeps this file to the provider's behaviour instead of
 * seeding a session the cases never read.
 *
 * @returns The stub, typed as the port.
 */
function writeAdapter(): SiteIntelligenceService {
  const adapter = { assignException: () => Promise.resolve(null) };

  return adapter as unknown as SiteIntelligenceService;
}

/** Props of {@link Probe}. */
interface ProbeProps {
  /** The read the probe holds in the cache. */
  readonly read: () => Promise<string>;
}

/**
 * Holds one read in the cache and renders what it answered, so a case can see the entry's value.
 *
 * @param props - The read to hold. See {@link ProbeProps}.
 * @returns The answer as text.
 */
function Probe({ read }: ProbeProps): ReactElement {
  const query = useQuery<string, unknown>({
    queryKey: QUEUE_READ_KEY,
    queryFn: read,
  });

  return <p>{query.data}</p>;
}

/** Props of {@link Harness}. */
interface HarnessProps {
  /** The client under test. */
  readonly client: QueryClient;

  /** The read the probe holds, when the probe is mounted. */
  readonly read: () => Promise<string>;

  /** Whether the probe is mounted; `false` models a screen that has unmounted. */
  readonly showProbe: boolean;
}

/**
 * The write subscription and the probe inside one client, with the probe removable.
 *
 * The subscription stays mounted across the probe's removal because it is the tree above the screen that
 * owns it — that is the arrangement `AppProviders` builds — so a case can take the observer away and
 * still report a write.
 *
 * @param props - The client, the read and whether the probe is mounted. See {@link HarnessProps}.
 * @returns The provider tree with the probe inside it, or without it.
 */
function Harness({ client, read, showProbe }: HarnessProps): ReactElement {
  return (
    <QueryClientProvider client={client}>
      <WriteInvalidationSync />
      {showProbe ? <Probe read={read} /> : null}
    </QueryClientProvider>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The cases
 * ------------------------------------------------------------------------------------------- */

describe('the query cache', () => {
  it('sets the session-scoped lifetime, so an answer is kept rather than re-derived on every mount', () => {
    expect(createQueryClient().getDefaultOptions().queries?.staleTime).toBe(CACHE_LIFETIME_MS);
  });

  it('serves a cached answer to a remounted screen without issuing the read again', async () => {
    const client = createQueryClient();
    const counter = countingRead();
    const view = render(<Harness client={client} read={counter.read} showProbe />);

    await screen.findByText('answer 1');

    view.rerender(<Harness client={client} read={counter.read} showProbe={false} />);
    view.rerender(<Harness client={client} read={counter.read} showProbe />);

    expect(await screen.findByText('answer 1')).toBeInTheDocument();
    expect(counter.count()).toBe(1);
  });

  it('refreshes an entry whose observer has unmounted when a write is reported', async () => {
    const client = createQueryClient();
    const counter = countingRead();
    const view = render(<Harness client={client} read={counter.read} showProbe />);

    await screen.findByText('answer 1');

    view.rerender(<Harness client={client} read={counter.read} showProbe={false} />);

    /* The premise of the case: the screen that made the read is gone, so the invalidation a screen issues
       itself has nobody left to issue it. */
    expect(client.getQueryCache().find({ queryKey: QUEUE_READ_KEY })?.getObserversCount()).toBe(0);

    await act(async () => {
      await withWriteReporting(writeAdapter()).assignException('EXC-2026-1184', 'USR-01');
    });

    await waitFor(() => {
      expect(counter.count()).toBe(2);
    });

    expect(client.getQueryState(QUEUE_READ_KEY)?.data).toBe('answer 2');
  });
});
