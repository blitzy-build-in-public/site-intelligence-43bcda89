/**
 * Component suite for `src/app/scope-filters.tsx`: the top bar's plant and product filters, the two
 * controls every list call and every aggregate is narrowed by (AAP §0.2.1, AAP §0.12.4).
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP.
 * - Both controls are labelled by their visible label, bound by the `htmlFor`/`id` pair, so the words
 *   `Plant` and `Product` are each control's accessible name and a click on the label opens the list
 *   (rule B-3). The labels are read from the module's own `SCOPE_FILTERS_TEXT`.
 * - The option lists come from the service read and from nothing else. The plant options are the
 *   plant identifiers the topology payload carries, in its order, printed with the record's own name;
 *   the product options are the distinct `ProductId` values the payload's node families reach, in
 *   first-seen order, printed as the identifier because the payload carries no product name (the
 *   module records that). The unfiltered option the module documents — `All plants`, `All products`,
 *   carried as the empty string — is first in each list.
 * - The read is asked with the unfiltered selection `{ plants: [], products: [] }`, which is the
 *   selection the service resolves to the acting role's whole plant scope, and never with the
 *   reader's current filter: an option list narrowed by the filter using it would shrink as it was
 *   used. Case 4 asserts the argument the port received.
 * - A change commits the whole selection to the shell store, keeping the member the reader did not
 *   touch, because the store's setter replaces rather than merges and narrowing a plant must not
 *   widen a product. Choosing the unfiltered option writes the empty array back, which is the
 *   selection the service resolves to the role's plant scope.
 * - A control that cannot act is natively disabled and explained: the adapter's own message follows
 *   the module's lead sentence and is bound to the disabled control with `aria-describedby`, so the
 *   reason is that field's description in the accessibility tree (rule P-8).
 *
 * THE SERVICE BOUNDARY IS MOCKED AT THE PROVIDER (rule P-2), with the specifier the module imports.
 * The stub is created through `vi.hoisted` so it exists before `providers.tsx` — imported for the
 * real shell store this suite reads — is loaded, and the in-browser adapter is never reached.
 * Nothing here imports `src/seed`, a mock adapter or the API client.
 *
 * NO FIGURE AND NO RECORD IDENTIFIER IS TYPED HERE (rule P-6). Every plant identifier, product
 * identifier and display name below is synthetic fixture text of this suite's own, read only as
 * data; no amount, count, date or seeded record value appears.
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite proves labelling, the store's contract and the disabled explanation.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SiteIntelligenceService } from '../services/site-intelligence-service';
import type { Problem, Result, Scope } from '../types/service';
import type { Topology, TopologyNode, TopologyNodeKind } from '../types/topology';
import { useShellStore } from './providers';
import { SCOPE_FILTERS_TEXT, ScopeFilters } from './scope-filters';

/* ---------------------------------------------------------------------------------------------
 * The port, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/** The one port member the filters call, named from the port rather than restated here. */
type GetTopology = SiteIntelligenceService['getTopology'];

/** The topology read, replaced before `providers.tsx` and the module under test are loaded. */
const getTopology = vi.hoisted(() => vi.fn<GetTopology>());

/** The one prop the pass-through provider receives. */
interface ServiceProviderStubProps {
  /** The provider tree's children, rendered as they are. */
  readonly children?: ReactElement | readonly ReactElement[];
}

/**
 * Replaces the provider module the filters and the shell store read through.
 *
 * `ServiceProvider` passes its children straight through and `useActiveUser` reports no persona, so
 * the tree mounts without the adapter's bootstrap. `useDemonstration` is absent: the filters read
 * the port alone, so a call to the capability would fail as a missing export.
 */
vi.mock('../services/service-provider', () => ({
  ServiceProvider: ({ children }: ServiceProviderStubProps) => children,
  useService: () => ({ getTopology }),
  useActiveUser: () => null,
}));

/* ---------------------------------------------------------------------------------------------
 * The fixtures this suite fabricates — synthetic identifiers and names, no figure (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every envelope and refusal of this suite carries. */
const TRACE_ID = 'trace-scope-filters-under-test';

/** The unfiltered selection the module reads its option lists with. */
const UNFILTERED: Scope = { plants: [], products: [] };

/** The products the fixture network reaches, each named once so a duplicate would be visible. */
const PRODUCT_ONE = 'product-alpha';
const PRODUCT_TWO = 'product-beta';
const PRODUCT_THREE = 'product-gamma';

/** One node of the fixture payload: identity, family, the name its filter prints, and its reach. */
function node(
  kind: TopologyNodeKind,
  id: string,
  label: string,
  productIds: readonly string[] = [],
): TopologyNode {
  /* Latitude and longitude are slots the map lens projects; no filter reads them, so the fixture
     holds the slot at its origin rather than inventing a coordinate. */
  return { id, kind, label, latitude: 0, longitude: 0, productIds: [...productIds] };
}

/** The two plants, which are the plant filter's whole option list, in payload order. */
const PLANTS: readonly TopologyNode[] = [
  node('plant', 'plant-one', 'A plant record', [PRODUCT_ONE, PRODUCT_TWO]),
  node('plant', 'plant-two', 'A second plant record', [PRODUCT_TWO]),
];

/**
 * The rest of the network, which is what the product filter reads.
 *
 * A supplier and a plant both reach `PRODUCT_TWO`, so the product list must show it once; the origin
 * and the customer each reach a product of their own, so the list's first-seen order is exercised
 * across all four families the module reads.
 */
const SUPPLIERS: readonly TopologyNode[] = [
  node('supplier', 'supplier-one', 'A supplier record', [PRODUCT_TWO, PRODUCT_THREE]),
];

const ORIGINS: readonly TopologyNode[] = [node('origin', 'origin-one', 'A tier-2 origin record')];

const CUSTOMERS: readonly TopologyNode[] = [node('customer', 'customer-one', 'A customer record')];

/** The payload the read answers with: the five families, no lanes and no pin counts. */
const TOPOLOGY: Topology = {
  plants: [...PLANTS],
  suppliers: [...SUPPLIERS],
  materials: [],
  origins: [...ORIGINS],
  customers: [...CUSTOMERS],
  lanes: [],
  pinsByNode: {},
};

/** The refusal the adapter throws: a cause, a plain message and the trace a reader can quote. */
const REFUSAL: Problem = {
  type: 'permission',
  message: 'The plants in scope are not readable for the acting persona.',
  traceId: TRACE_ID,
};

/** Wraps the fixture payload in the envelope every service call resolves (contracts §2). */
function envelope(data: Topology): Result<Topology> {
  return { data, meta: { freshness: [], simulated: true, traceId: TRACE_ID } };
}

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/** Builds the cache one render reads through, with retries off so a failed read settles once. */
function createTestClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Renders the filters inside the cache they read through. */
function renderFilters(): void {
  render(
    <QueryClientProvider client={createTestClient()}>
      <ScopeFilters />
    </QueryClientProvider>,
  );
}

/** One filter control, read back by the visible label that names it. */
function fieldFor(label: string): HTMLSelectElement {
  const field = screen.getByLabelText(label);

  if (!(field instanceof HTMLSelectElement)) {
    throw new Error(`The control labelled ${label} is not a select element.`);
  }

  return field;
}

/** Every option of one filter, as the value it carries and the text it prints. */
function optionsOf(field: HTMLSelectElement): readonly (readonly [string, string])[] {
  return Array.from(field.options).map((option) => [option.value, option.textContent ?? '']);
}

/** The selection the shell store currently holds. */
function storedScope(): Scope {
  return useShellStore.getState().scope;
}

/* ---------------------------------------------------------------------------------------------
 * Every case starts from the seeded shell and a port that answers with the fixture payload
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  useShellStore.getState().resetShell();
  getTopology.mockResolvedValue(envelope(TOPOLOGY));
});

/* ---------------------------------------------------------------------------------------------
 * The option lists
 * ------------------------------------------------------------------------------------------- */

describe('ScopeFilters — the option lists', () => {
  it('labels each control with the module’s own words, the unfiltered option first', async () => {
    renderFilters();

    await waitFor(() => {
      expect(optionsOf(fieldFor(SCOPE_FILTERS_TEXT.plantLabel))).toHaveLength(PLANTS.length + 1);
    });

    const plant = fieldFor(SCOPE_FILTERS_TEXT.plantLabel);
    const product = fieldFor(SCOPE_FILTERS_TEXT.productLabel);

    /* The label is the accessible name, so the words a reader sees are the words a screen reader
       announces (rule B-3). */
    expect(screen.getByLabelText(SCOPE_FILTERS_TEXT.plantLabel)).toBe(plant);
    expect(screen.getByLabelText(SCOPE_FILTERS_TEXT.productLabel)).toBe(product);

    /* The unfiltered option is the empty value, which is the DOM's spelling of the empty array
       `Scope` defines (rule P-6: no code, no sentinel of this file's choosing). */
    expect(optionsOf(plant)[0]).toStrictEqual(['', SCOPE_FILTERS_TEXT.allPlants]);
    expect(optionsOf(product)[0]).toStrictEqual(['', SCOPE_FILTERS_TEXT.allProducts]);
  });

  it('fills the plant list from the plant nodes the read returned, in the payload’s order', async () => {
    renderFilters();

    await waitFor(() => {
      expect(optionsOf(fieldFor(SCOPE_FILTERS_TEXT.plantLabel))).toHaveLength(PLANTS.length + 1);
    });

    const expected = PLANTS.map((plant) => [plant.id, plant.label] as const);

    expect(optionsOf(fieldFor(SCOPE_FILTERS_TEXT.plantLabel)).slice(1)).toStrictEqual(expected);
  });

  it('fills the product list with each distinct product once, printing the identifier', async () => {
    renderFilters();

    await waitFor(() => {
      expect(optionsOf(fieldFor(SCOPE_FILTERS_TEXT.productLabel))).toHaveLength(4);
    });

    /* First-seen order across the families the module reads, with `PRODUCT_TWO` — reached by a plant
       and by a supplier — listed once, and each option printing the identifier because the payload
       carries no product name. */
    expect(optionsOf(fieldFor(SCOPE_FILTERS_TEXT.productLabel))).toStrictEqual([
      ['', SCOPE_FILTERS_TEXT.allProducts],
      [PRODUCT_ONE, PRODUCT_ONE],
      [PRODUCT_TWO, PRODUCT_TWO],
      [PRODUCT_THREE, PRODUCT_THREE],
    ]);
  });

  it('asks the read with the unfiltered selection, not with the filter in use', async () => {
    useShellStore.getState().setScope({ plants: [PLANTS[0]?.id ?? ''], products: [PRODUCT_TWO] });

    renderFilters();

    await waitFor(() => {
      expect(getTopology).toHaveBeenCalledTimes(1);
    });

    /* An empty plant selection is what the service resolves to the acting role's whole plant scope,
       so the options are exactly the plants that role may narrow to and they do not move as the
       reader uses them. */
    expect(getTopology).toHaveBeenCalledWith(UNFILTERED);
  });
});

/* ---------------------------------------------------------------------------------------------
 * What a change commits
 * ------------------------------------------------------------------------------------------- */

describe('ScopeFilters — the selection it commits', () => {
  it('commits a chosen plant to the shell store, keeping the product the reader chose', async () => {
    const user = userEvent.setup();
    const plant = PLANTS[0]?.id ?? '';
    const product = PRODUCT_TWO;

    useShellStore.getState().setScope({ plants: [], products: [product] });
    renderFilters();

    await waitFor(() => {
      expect(optionsOf(fieldFor(SCOPE_FILTERS_TEXT.plantLabel))).toHaveLength(PLANTS.length + 1);
    });

    await user.selectOptions(fieldFor(SCOPE_FILTERS_TEXT.plantLabel), plant);

    /* The store's setter replaces rather than merges, so the handler has to write the whole selection
       or narrowing a plant would silently widen the product filter. */
    expect(storedScope()).toStrictEqual({ plants: [plant], products: [product] });
  });

  it('commits the unfiltered plant option as the empty selection', async () => {
    const user = userEvent.setup();
    const plant = PLANTS[0]?.id ?? '';

    renderFilters();

    await waitFor(() => {
      expect(optionsOf(fieldFor(SCOPE_FILTERS_TEXT.plantLabel))).toHaveLength(PLANTS.length + 1);
    });

    await user.selectOptions(fieldFor(SCOPE_FILTERS_TEXT.plantLabel), plant);
    await user.selectOptions(fieldFor(SCOPE_FILTERS_TEXT.plantLabel), '');

    /* The empty array is the selection the service resolves to the acting role's plant scope, so the
       unfiltered option restores the role's own population rather than naming none. */
    expect(storedScope()).toStrictEqual({ plants: [], products: [] });
  });

  it('shows the selection the store holds, and the unfiltered option for a set', async () => {
    const plant = PLANTS[1]?.id ?? '';

    useShellStore.getState().setScope({ plants: [plant], products: [] });
    renderFilters();

    await waitFor(() => {
      expect(optionsOf(fieldFor(SCOPE_FILTERS_TEXT.plantLabel))).toHaveLength(PLANTS.length + 1);
    });

    expect(fieldFor(SCOPE_FILTERS_TEXT.plantLabel).value).toBe(plant);

    /* Specification §5.1 fixes a single selection per filter, so a scope naming two plants displays
       as the unfiltered option: a single-choice control has no spelling for a set. */
    useShellStore.getState().setScope({ plants: PLANTS.map((record) => record.id), products: [] });

    await waitFor(() => {
      expect(fieldFor(SCOPE_FILTERS_TEXT.plantLabel).value).toBe('');
    });
  });
});

/* ---------------------------------------------------------------------------------------------
 * A control that cannot act
 * ------------------------------------------------------------------------------------------- */

describe('ScopeFilters — a control that cannot act', () => {
  it('disables both controls and explains them in the adapter’s own words', async () => {
    getTopology.mockRejectedValue(REFUSAL);

    renderFilters();

    const notice = await screen.findByText(
      `${SCOPE_FILTERS_TEXT.unavailable} ${REFUSAL.message}`,
    );

    expect(notice.getAttribute('role')).toBe('status');

    const plant = fieldFor(SCOPE_FILTERS_TEXT.plantLabel);
    const product = fieldFor(SCOPE_FILTERS_TEXT.productLabel);

    expect(plant).toBeDisabled();
    expect(product).toBeDisabled();

    /* The sentence is each disabled control's description, so the reason is announced with the field
       rather than left as sighted-only prose (rule P-8). */
    expect(plant.getAttribute('aria-describedby')).toBe(notice.id);
    expect(product.getAttribute('aria-describedby')).toBe(notice.id);
  });

  it('says it is reading while the option lists are in flight', () => {
    getTopology.mockReturnValue(new Promise<never>(() => undefined));

    renderFilters();

    const group = screen.getByRole('group', { name: SCOPE_FILTERS_TEXT.group });

    expect(group.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByRole('status').textContent).toBe(SCOPE_FILTERS_TEXT.reading);

    /* The unfiltered option is present even before the read answers, so the control never renders an
       empty list, and both controls are disabled until it can act. */
    expect(optionsOf(fieldFor(SCOPE_FILTERS_TEXT.plantLabel))).toStrictEqual([
      ['', SCOPE_FILTERS_TEXT.allPlants],
    ]);
    expect(fieldFor(SCOPE_FILTERS_TEXT.productLabel)).toBeDisabled();
  });
});
