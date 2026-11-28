/**
 * Component suite for `src/app/freshness-strip.tsx`: the shell's report of how current each modelled
 * data source is, and the visible half of the freshness rule whose other half the service enforces
 * (AAP §0.2.1; T-13 drives the pair in the browser).
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP.
 * - One pill per source the catalogue read returned, in the read's order, each printing its own
 *   record's state and `asOf` instant. The case compares the group's whole text against the fixture
 *   concatenated record by record, so a pill that printed a neighbour's state, a second pill for one
 *   source, a missing source or a reordered row changes the text and fails here instead of passing on
 *   a `getByText` that finds one label.
 * - The source name is the record's own `label`, which the adapter fills from `SOURCE_LABELS`, and
 *   the strip spells none of them itself: the fixture's labels come from that map, so a strip that
 *   resolved a name of its own would disagree with the text asserted below.
 * - A refused read reports the service's own message after the strip's own lead sentence, and shows
 *   no pill at all: the reason a reader sees is the adapter's rather than a paraphrase, and a read
 *   that did not happen is never dressed up as a reading.
 * - A refused read offers no control. The module's contract puts the retry surface in
 *   `src/components/state-boundary.tsx`, which a page composes around its own reads, so this strip
 *   adds no button that could only delay the honest notice (rule P-8: a control here would be one a
 *   page already owns).
 * - A catalogue that answered with no records states that, rather than rendering an empty row.
 * - While the read is in flight the group is busy and says it is reading, rather than showing six
 *   placeholder pills with a state attached.
 *
 * THE SERVICE BOUNDARY IS MOCKED AT THE PROVIDER (rule P-2). The specifier is exactly the one the
 * module imports, because Vitest keys a mock on the resolved module rather than on a path spelling.
 * The stub is created through `vi.hoisted` so it exists before `providers.tsx` — which this suite
 * imports for the real shell store — is loaded, and the in-browser adapter of `src/services` is
 * therefore never reached. Nothing here imports `src/seed`, a mock adapter or the API client.
 *
 * NO FIGURE IS TYPED HERE (rule P-6). Each record's `asOf` is derived from `DEMO_CLOCK`, the one
 * clock the application fixes, so this file writes no date of its own; the labels are read from
 * `SOURCE_LABELS` and the wording from the module's own `FRESHNESS_STRIP_TEXT`.
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite proves the group's naming, its ordering and its three read outcomes.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SiteIntelligenceService } from '../services/site-intelligence-service';
import type { Problem } from '../types/service';
import { DEMO_CLOCK } from '../types/primitives';
import { SOURCE_LABELS } from '../types/sources';
import type { SourceCatalogue, SourceHealth } from '../types/sources';
import { FRESHNESS_STRIP_TEXT, FreshnessStrip } from './freshness-strip';

/* ---------------------------------------------------------------------------------------------
 * The port, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/** The one port member the strip calls, named from the port rather than restated here. */
type GetSourceCatalogue = SiteIntelligenceService['getSourceCatalogue'];

/** The catalogue read, replaced before `providers.tsx` and the module under test are loaded. */
const getSourceCatalogue = vi.hoisted(() => vi.fn<GetSourceCatalogue>());

/** The one prop the pass-through provider receives. */
interface ServiceProviderStubProps {
  /** The provider tree's children, rendered as they are. */
  readonly children?: ReactElement | readonly ReactElement[];
}

/**
 * Replaces the provider module the strip reads through.
 *
 * `ServiceProvider` passes its children straight through and `useActiveUser` reports no persona, so
 * the tree mounts without the adapter's bootstrap. `useDemonstration` is deliberately absent: the
 * strip reads the port alone, and a call to the capability would fail as a missing export instead of
 * being silently answered.
 */
vi.mock('../services/service-provider', () => ({
  ServiceProvider: ({ children }: ServiceProviderStubProps) => children,
  useService: () => ({ getSourceCatalogue }),
  useActiveUser: () => null,
}));

/* ---------------------------------------------------------------------------------------------
 * The fixtures this suite fabricates — no figure, no record identifier (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every envelope and refusal of this suite carries. */
const TRACE_ID = 'trace-freshness-strip-under-test';

/** An instant the demonstration clock does not name, read one hour earlier than it. */
function hourEarlier(instant: string, hour: string): string {
  return instant.replace(/T\d{2}/u, `T${hour}`);
}

/**
 * Three of the six modelled sources, each in a different state, built from the display names the
 * owner map supplies and three instants derived from the demonstration clock.
 *
 * Three rather than six is the whole set this case needs to prove that a pill is per record and
 * carries that record's own state and instant: the strip renders whatever the read returned and
 * never a fixed six. Each instant is distinct, so a pill printing a neighbour's time leaves its own
 * absent from the page and is caught rather than hidden behind a shared value.
 */
const RECORDS: readonly SourceHealth[] = [
  { source: 'erp', label: SOURCE_LABELS.erp, state: 'fresh', asOf: DEMO_CLOCK },
  { source: 'mes', label: SOURCE_LABELS.mes, state: 'stale', asOf: hourEarlier(DEMO_CLOCK, '07') },
  {
    source: 'transport',
    label: SOURCE_LABELS.transport,
    state: 'unavailable',
    asOf: hourEarlier(DEMO_CLOCK, '06'),
  },
];

/** The refusal the adapter throws: a cause, a plain message and the trace a reader can quote. */
const REFUSAL: Problem = {
  type: 'permission',
  message: 'The source catalogue is not readable while the demonstration is in that state.',
  traceId: TRACE_ID,
};

/** Wraps one payload in the envelope every service call resolves (contracts §2). */
function catalogue(health: readonly SourceHealth[]): SourceCatalogue {
  return { health: [...health] };
}

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/** Builds the cache one render reads through, with retries off so a failed read settles once. */
function createTestClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Renders the strip inside the cache it reads through. */
function renderStrip(): void {
  render(
    <QueryClientProvider client={createTestClient()}>
      <FreshnessStrip />
    </QueryClientProvider>,
  );
}

/** The named group the strip renders, whether it holds pills or a notice. */
function group(): HTMLElement {
  return screen.getByRole('group', { name: FRESHNESS_STRIP_TEXT.group });
}

/** The text a list of records should render into the group, record by record. */
function textOf(records: readonly SourceHealth[]): string {
  return records.map((record) => `${record.label}${record.state}${record.asOf}`).join('');
}

/* ---------------------------------------------------------------------------------------------
 * Every case starts from a port that answers with the seeded-style catalogue
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  getSourceCatalogue.mockResolvedValue({
    data: catalogue(RECORDS),
    meta: { freshness: [], simulated: true, traceId: TRACE_ID },
  });
});

/* ---------------------------------------------------------------------------------------------
 * The answered read
 * ------------------------------------------------------------------------------------------- */

describe('FreshnessStrip — the answered read', () => {
  it('renders one pill per source, each with its own state and as-of instant, in the read order', async () => {
    renderStrip();

    const strip = group();

    await waitFor(() => {
      expect(strip.textContent).toBe(textOf(RECORDS));
    });

    /* The read went through the typed port and was asked once: the strip resolves no records of its
       own and asks for no second opinion about the same six sources (rule P-2). */
    expect(getSourceCatalogue).toHaveBeenCalledTimes(1);

    /* Every record's own instant reaches the page, and no other instant does: a pill that printed a
       neighbour's time would leave its own missing from this list. */
    for (const record of RECORDS) {
      expect(screen.getByText(record.asOf)).toBeInTheDocument();
    }
  });

  it('prints the state word beside the source and its time, so the meaning never rests on colour', async () => {
    renderStrip();

    await waitFor(() => {
      expect(group().textContent).toBe(textOf(RECORDS));
    });

    /* Each state is the record's own token, printed as text (rule B-3): the meaning reaches a reader
       as words and not as a status hue alone. */
    for (const record of RECORDS) {
      expect(screen.getByText(record.state)).toBeInTheDocument();
    }
  });

  it('states that the catalogue was empty rather than rendering an empty row', async () => {
    getSourceCatalogue.mockResolvedValue({
      data: catalogue([]),
      meta: { freshness: [], simulated: true, traceId: TRACE_ID },
    });

    renderStrip();

    const strip = group();

    await waitFor(() => {
      expect(strip.textContent).toBe(FRESHNESS_STRIP_TEXT.noneDeclared);
    });

    /* No record's instant survives an empty catalogue, so no pill rendered. */
    for (const record of RECORDS) {
      expect(screen.queryByText(record.asOf)).toBeNull();
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The unanswered read
 * ------------------------------------------------------------------------------------------- */

describe('FreshnessStrip — the unanswered read', () => {
  it('reports the service’s own message when the read is refused', async () => {
    getSourceCatalogue.mockRejectedValue(REFUSAL);

    renderStrip();

    const strip = group();

    await waitFor(() => {
      expect(strip.textContent).toBe(
        `${FRESHNESS_STRIP_TEXT.unreadable} ${REFUSAL.message}`,
      );
    });

    /* No pill is rendered from a read that did not happen: the notice stands in place of all of
       them, not beside them. */
    for (const record of RECORDS) {
      expect(screen.queryByText(record.asOf)).toBeNull();
    }
  });

  it('offers no control in place of a refused read', async () => {
    getSourceCatalogue.mockRejectedValue(REFUSAL);

    renderStrip();

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe(
        `${FRESHNESS_STRIP_TEXT.unreadable} ${REFUSAL.message}`,
      );
    });

    /* The notice is a live region and not a control: the retry surface belongs to `StateBoundary`,
       which a page composes around its own reads (rule P-8). */
    expect(screen.queryAllByRole('button')).toStrictEqual([]);
    expect(screen.queryAllByRole('link')).toStrictEqual([]);
  });

  it('reports that it is reading while the read is in flight, inside a busy group', () => {
    getSourceCatalogue.mockReturnValue(new Promise<never>(() => undefined));

    renderStrip();

    expect(group().getAttribute('aria-busy')).toBe('true');
    expect(group().textContent).toBe(FRESHNESS_STRIP_TEXT.reading);

    /* A state that has not been read cannot be shown, so no placeholder pill carries one. */
    for (const record of RECORDS) {
      expect(screen.queryByText(record.asOf)).toBeNull();
    }
  });
});
