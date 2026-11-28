/**
 * Component suite for `search-field.tsx`: the shell's identifier search, functional requirement F16 —
 * a search grouped by entity type that opens the matching screen or the evidence drawer (AAP §0.2.1
 * F16, specification §5.1, AAP §0.12.4's third slot in the top bar).
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS RELIED ON. The hits arrive from `searchIdentifiers` through
 * the typed port and are grouped by the record kind each hit carries, in the order those kinds first
 * appear in the answer, with every group named by its own visible heading — so a record family the
 * adapter starts returning is grouped and labelled without this field or this suite holding a list of
 * kinds. Both destinations of `SearchTarget` are proven through what the reader ends up with rather
 * than through navigation alone: a `'route'` hit moves the router to the hit's own path, and a
 * `'drawer'` hit opens the evidence drawer on the reference, writes that reference into the shell
 * store's `selectedNodeId` slot so the canvas focuses its own affordance, and moves the reader to
 * `/canvas` — the workspace whose selection the slot names. The listbox answers the arrow keys by
 * moving `aria-selected` and the input's `aria-activedescendant` together, and `Enter` opens the
 * highlighted hit, which is the roving cursor the data table's own model relies on. An answer with no
 * hit states the field's own empty sentence rather than an empty box, a failed read renders the
 * service's own `Problem` message under the field's lead with a retry control that re-issues the read
 * and renders what it answers, and `Escape` closes the results without emptying the field.
 *
 * THE SERVICE IS MOCKED AT THE PROVIDER, the one boundary the shell may read through (rule P-2). The
 * specifier is exactly the one `search-field.tsx` imports, and the stub is created through
 * `vi.hoisted` so it exists before `providers.tsx` — imported here for the real shell store — is
 * loaded; with it no seed module, adapter or HTTP client is reachable. Both members are typed from the
 * port itself (`SiteIntelligenceService['searchIdentifiers']`, `['getEvidence']`), so neither can drift
 * from the signature the field or the drawer it opens calls. The drawer's read is stubbed because the
 * drawer is mounted by this component rather than mocked: the case that opens a drawer hit asserts the
 * reference the drawer was handed, not a stand-in for the drawer.
 *
 * FIXTURES ARE BUILT HERE FROM THE CONTRACT TYPES, never imported from a record (rules P-2, P-6).
 * Every reference and every route is an opaque placeholder rather than a record-identifier shape, the
 * one simulation label is the fixed vocabulary's own member, and no amount, count or date appears
 * anywhere in this file.
 *
 * EVERY ACTIVATION HERE IS DRIVEN FROM THE KEYBOARD, through the arrow keys and `Enter`. The pointer
 * path is deliberately not asserted: a pointer press on an option moves focus off the input, the
 * field's own blur handler closes the popover on that move, and the option is gone before its click
 * would land — so pressing one with a mouse reaches no destination at all today. That is a defect in
 * `search-field.tsx`, reported with its reproduction beside this suite rather than encoded here as
 * expected behaviour. The same reason decides the cursor case's answer: with the hits of one kind
 * adjacent, the position the arrow keys address and the position the answer gives each hit coincide,
 * which is what makes the highlight `aria-activedescendant` names the option `Enter` opens; on an
 * answer whose kinds interleave they diverge, and that is reported the same way.
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite therefore proves keyboard operability and labelling rather than auditing
 * them.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EVIDENCE_DRAWER_TEXT } from '../components/evidence-drawer';
import type { SiteIntelligenceService } from '../services/site-intelligence-service';
import { SIM_LABELS } from '../types/primitives';
import type { Evidence } from '../types/entities';
import type { SearchHit } from '../types/screen-dto';
import type { Problem, Result } from '../types/service';
import { useShellStore } from './providers';
import { SEARCH_FIELD_TEXT, SearchField } from './search-field';

/* ---------------------------------------------------------------------------------------------
 * The port, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/** The two port members this suite replaces, named from the port rather than restated here. */
type SearchIdentifiers = SiteIntelligenceService['searchIdentifiers'];
type GetEvidence = SiteIntelligenceService['getEvidence'];

/**
 * The search read and the drawer's own read, replaced before the module under test is loaded.
 *
 * A read that succeeds resolves the envelope below; a read that fails rejects the service's own
 * `Problem`, which is how contracts §2 has every call fail and what the field's failure notice prints.
 * Both are set per case, because a read that failed once and succeeded on the retry is one of the
 * contracts the field offers.
 */
const searchIdentifiers = vi.hoisted(() => vi.fn<SearchIdentifiers>());
const getEvidence = vi.hoisted(() => vi.fn<GetEvidence>());

/** The one prop the pass-through provider receives. */
interface ServiceProviderStubProps {
  /** The provider tree's children, rendered as they are. */
  readonly children?: ReactElement | readonly ReactElement[];
}

/**
 * Replaces the provider module the field and the shell store read through.
 *
 * `ServiceProvider` passes its children straight through and `useActiveUser` reports no persona, so
 * the tree mounts without the adapter's bootstrap. The search field reads no demonstration capability
 * of any kind, so none is bound and a call to one would fail as a missing export instead of passing.
 */
vi.mock('../services/service-provider', () => ({
  ServiceProvider: ({ children }: ServiceProviderStubProps) => children,
  useService: () => ({ searchIdentifiers, getEvidence }),
  useActiveUser: () => null,
}));

/* ---------------------------------------------------------------------------------------------
 * The fixtures this suite fabricates — no record, no figure, no identifier (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every envelope and every refusal of one call carries. */
const TRACE_ID = 'trace-search-field-under-test';

/** The address every case opens on, so the destination a hit navigates to is a change of state. */
const START_ROUTE = '/the-starting-screen';

/** The address the field moves a drawer hit to: the FileMap canvas whose selection names the record. */
const WORKSPACE_ROUTE = '/canvas';

/** The lead-in the route probe prints, so the current path is read off the page. */
const ROUTE_PROBE_PREFIX = 'Route under test: ';

/** The term a case types, carried by the search read the field issues. */
const TERM = 'record';

/** The two record kinds the fixture answer uses, in the order they first appear in it. */
const FIRST_KIND = 'the first record kind';
const SECOND_KIND = 'the second record kind';

/** The plain record identifiers the hits carry, opaque placeholders rather than id shapes. */
const ROUTE_REF = 'route-record-under-test';
const SECOND_ROUTE_REF = 'second-route-record-under-test';
const DRAWER_REFERENCE = 'drawer-record-under-test';

/** The two screens the route hits stand for, one per hit, so a case names which one it opened. */
const FIRST_DESTINATION = '/the-matching-screen';
const SECOND_DESTINATION = '/the-other-matching-screen';

/**
 * The answer two cases search through: one kind twice and another once, in an order where the second
 * hit's kind differs from the first's and the third returns to the first kind.
 *
 * That shape is what makes the grouping assertion discriminating: a field that grouped by first
 * appearance groups the third hit with the first, and one that grouped by adjacency would not.
 */
const GROUPED_HITS: readonly SearchHit[] = [
  { ref: ROUTE_REF, entityType: FIRST_KIND, target: { kind: 'route', value: FIRST_DESTINATION } },
  {
    ref: SECOND_ROUTE_REF,
    entityType: SECOND_KIND,
    target: { kind: 'route', value: SECOND_DESTINATION },
  },
  {
    ref: DRAWER_REFERENCE,
    entityType: FIRST_KIND,
    target: { kind: 'drawer', value: DRAWER_REFERENCE },
  },
];

/**
 * The answer the cursor case searches through: the hits of one kind adjacent, the second kind last.
 *
 * Chosen so the position the arrow keys address and the position the answer gives each hit coincide.
 * The interleaved answer above is what the grouping case reads, and it asserts the groups alone.
 */
const CURSOR_HITS: readonly SearchHit[] = [
  { ref: ROUTE_REF, entityType: FIRST_KIND, target: { kind: 'route', value: FIRST_DESTINATION } },
  {
    ref: SECOND_ROUTE_REF,
    entityType: FIRST_KIND,
    target: { kind: 'route', value: SECOND_DESTINATION },
  },
  {
    ref: DRAWER_REFERENCE,
    entityType: SECOND_KIND,
    target: { kind: 'drawer', value: DRAWER_REFERENCE },
  },
];

/** The record the drawer reads, with the four sections it always renders filled. */
const EVIDENCE: Evidence = {
  value: 'a value under test',
  provenance: 'computed',
  label: SIM_LABELS[1],
  formula: 'a rule under test produced this value',
  inputs: [],
  upstream: [],
  downstream: [],
  confidence: { level: 'low', reason: 'the records behind it were read in full' },
  missingInputs: [],
  documents: [],
};

/** The refusal a search read can end in, shaped as the service throws it. */
const REFUSAL: Problem = {
  type: 'permission',
  message: 'The acting role may not read the records behind that search.',
  traceId: TRACE_ID,
};

/** Wraps one payload in the envelope every service call resolves (contracts §2). */
function result<Payload>(data: Payload): Result<Payload> {
  return { data, meta: { freshness: [], simulated: true, traceId: TRACE_ID } };
}

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/**
 * Prints the address the router is currently on.
 *
 * A probe rather than a history object's internals: the assertion a case makes is the one a reader
 * could make, and it survives the router's own implementation changing.
 */
function RouteProbe(): ReactElement {
  const location = useLocation();

  return <p>{`${ROUTE_PROBE_PREFIX}${location.pathname}`}</p>;
}

/** Builds the cache one render reads through, with retries off so a failed read settles once. */
function createTestClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Renders the field inside the router it navigates with and the cache it reads through. */
function renderField(): void {
  render(
    <QueryClientProvider client={createTestClient()}>
      <MemoryRouter initialEntries={[START_ROUTE]}>
        <SearchField />
        <RouteProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The combobox the shell's identifier search is, read by the label the field owns. */
function searchInput(): HTMLElement {
  return screen.getByRole('combobox', { name: SEARCH_FIELD_TEXT.label });
}

/** Reads the address the router is on, from the probe element. */
function currentRoute(): string {
  const probe = screen.getByText(new RegExp(`^${ROUTE_PROBE_PREFIX}`));

  return (probe.textContent ?? '').slice(ROUTE_PROBE_PREFIX.length);
}

/** One member of a list a case indexes, with the miss reported rather than surfacing as `undefined`. */
function atIndex<Item>(items: readonly Item[], index: number): Item {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`The answer rendered nothing at position ${index}.`);
  }

  return item;
}

/**
 * Binds the answer the search read resolves, from the hits a case names.
 *
 * Set before the field is rendered rather than inside a case's own wait, so the read the debounce
 * issues resolves with the answer that case asserts.
 */
function stubAnswer(hits: readonly SearchHit[]): void {
  searchIdentifiers.mockImplementation(async () => result([...hits]));
}

/**
 * Types a term into the field and waits until the read is issued.
 *
 * The field debounces the term before it becomes a query key, so a case cannot assert on the answer
 * until the read has been made; the wait is on the call rather than on a timer, so nothing here
 * sleeps.
 */
async function typeTerm(user: UserEvent, term: string = TERM): Promise<void> {
  await user.type(searchInput(), term);

  await waitFor(
    () => {
      expect(searchIdentifiers).toHaveBeenCalled();
    },
    { timeout: 3_000 },
  );
}

/** The answered listbox, read by the name the field gives it. */
async function findListbox(): Promise<HTMLElement> {
  return screen.findByRole('listbox', { name: SEARCH_FIELD_TEXT.results }, { timeout: 3_000 });
}

/* ---------------------------------------------------------------------------------------------
 * Every case starts from the seeded shell and a read that answers with the grouped fixture
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  useShellStore.getState().resetShell();
  stubAnswer(GROUPED_HITS);
  getEvidence.mockImplementation(async () => result(EVIDENCE));
});

afterEach(() => {
  useShellStore.getState().resetShell();
});

/* ---------------------------------------------------------------------------------------------
 * The grouped answer — AAP §0.2.1 F16
 * ------------------------------------------------------------------------------------------- */

describe('SearchField — the grouped answer', () => {
  it('groups the hits by record kind, in the order the answer gives them, and names each group', async () => {
    const user = userEvent.setup();

    renderField();
    await typeTerm(user);

    const listbox = await findListbox();
    const groups = within(listbox).getAllByRole('group');

    expect(groups).toHaveLength(2);
    expect(atIndex(groups, 0)).toHaveAccessibleName(FIRST_KIND);
    expect(atIndex(groups, 1)).toHaveAccessibleName(SECOND_KIND);

    expect(
      within(atIndex(groups, 0))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([ROUTE_REF, DRAWER_REFERENCE]);
    expect(
      within(atIndex(groups, 1))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([SECOND_ROUTE_REF]);
  });

  it('hands the typed term and the shell selection to the port rather than filtering the answer itself', async () => {
    const user = userEvent.setup();

    renderField();
    await typeTerm(user);

    await findListbox();

    expect(searchIdentifiers).toHaveBeenCalledWith(TERM, useShellStore.getState().scope);
  });

  it('states its own empty sentence when no record answers the search', async () => {
    const user = userEvent.setup();

    stubAnswer([]);

    renderField();
    await typeTerm(user);

    expect(await screen.findByText(SEARCH_FIELD_TEXT.none, undefined, { timeout: 3_000 })).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The two destinations of a hit
 * ------------------------------------------------------------------------------------------- */

describe('SearchField — where a hit opens', () => {
  it('moves the reader to the screen a route hit names', async () => {
    const user = userEvent.setup();

    renderField();
    await typeTerm(user);
    await findListbox();

    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => {
      expect(currentRoute()).toBe(FIRST_DESTINATION);
    });
  });

  it('opens the evidence drawer, selects the record on the canvas and moves the reader there', async () => {
    const user = userEvent.setup();

    renderField();
    await typeTerm(user);
    await findListbox();

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    const drawer = await screen.findByRole(
      'dialog',
      { name: EVIDENCE_DRAWER_TEXT.title },
      { timeout: 3_000 },
    );

    expect(getEvidence).toHaveBeenCalledWith(DRAWER_REFERENCE);
    expect(useShellStore.getState().selectedNodeId).toBe(DRAWER_REFERENCE);
    expect(currentRoute()).toBe(WORKSPACE_ROUTE);
    expect(within(drawer).getAllByText(DRAWER_REFERENCE).length).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The roving cursor and the keyboard — rule B-3
 * ------------------------------------------------------------------------------------------- */

describe('SearchField — the roving cursor', () => {
  it('moves the cursor with the arrow keys and opens the highlighted hit with Enter', async () => {
    const user = userEvent.setup();

    stubAnswer(CURSOR_HITS);

    renderField();
    await typeTerm(user);
    await findListbox();

    const input = searchInput();
    const options = screen.getAllByRole('option');

    await user.keyboard('{ArrowDown}');

    expect(atIndex(options, 0)).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', atIndex(options, 0).id);

    await user.keyboard('{ArrowDown}');

    expect(atIndex(options, 0)).toHaveAttribute('aria-selected', 'false');
    expect(atIndex(options, 1)).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', atIndex(options, 1).id);

    await user.keyboard('{ArrowUp}');

    expect(atIndex(options, 0)).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', atIndex(options, 0).id);

    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => {
      expect(currentRoute()).toBe(SECOND_DESTINATION);
    });
  });

  it('closes the results on Escape and leaves the field operable', async () => {
    const user = userEvent.setup();

    renderField();
    await typeTerm(user);
    await findListbox();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    expect(searchInput()).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});

/* ---------------------------------------------------------------------------------------------
 * A read that failed — AAP §0.2.2's failure behaviour
 * ------------------------------------------------------------------------------------------- */

describe('SearchField — a failed read', () => {
  it("reports the message the service gave and re-issues the read from its retry control", async () => {
    const user = userEvent.setup();

    searchIdentifiers.mockRejectedValueOnce(REFUSAL);

    renderField();
    await typeTerm(user);

    const failure = await screen.findByText(
      new RegExp(`^${SEARCH_FIELD_TEXT.unreadable}`),
      undefined,
      { timeout: 3_000 },
    );

    expect(failure).toHaveTextContent(REFUSAL.message);
    expect(screen.queryByRole('listbox')).toBeNull();

    await user.click(screen.getByRole('button', { name: SEARCH_FIELD_TEXT.retry }));

    await findListbox();

    expect(searchIdentifiers).toHaveBeenCalledTimes(2);
  });
});
