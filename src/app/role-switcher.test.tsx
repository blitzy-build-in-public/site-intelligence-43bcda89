/**
 * Component suite for `role-switcher.tsx`, the demonstration persona switcher that closes the shell's
 * top bar: the file rule P-3 forces into scope, because the rule requires the interface to state that
 * the permission checks behind the control run in the browser and are not production authorisation.
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP. The wording rule P-3 demands
 * is present as visible body text — not as a hint, not as a `title`, not as a hidden duplicate — in
 * the branch that offers a choice and in the branch that cannot. The persona control carries the
 * fixed label plus the persona in force as its accessible name, so a screen-reader or speech-input
 * user can name the control and hear who the session acts as before changing it (rule B-3). Its
 * options are exactly the roster the service reported, in the adapter's order, because a component
 * that typed a person or an identifier would be a second owner of a seed record (rules P-2, P-7).
 * One selection is one switch: the capability is called exactly once with the chosen persona, and
 * nothing is called when the selection names the persona already in force. A successful switch stores
 * the returned persona's role and opens that role's entry route, both read back rather than inferred.
 * A refusal changes neither the store nor the route and prints the service's own message in an alert
 * region, so a refused switch never reads as a switch that happened. A service carrying no
 * demonstration capability renders a control that is visibly disabled with its explanation reachable
 * from the keyboard alone (rule P-8), and the note rule P-3 requires stays on screen beside it. The
 * select answers the pointer in the bar's own vocabulary — a hover and a press built from role tokens,
 * the transition gated on `motion-safe` so a reduced-motion session gets them with no animation, and
 * the `aria-disabled` suppression that keeps a control which cannot act from painting either — and it
 * reads its roster under its own qualified key, so a value a second reader of that service member
 * cached under another key can neither be offered nor displace the list the service reports.
 * Finally the rendered text is scanned for the vocabulary rule P-4 bars — no sentence may claim that
 * the demonstration establishes sovereignty, prevents copying or resists tampering — and both themes
 * are rendered, because the same role utilities must carry the wording in each. Below the `md`
 * breakpoint the label and the select fold behind one disclosure whose trigger names the region it
 * reveals, while rule P-3's note stays on screen; from `md` up no trigger exists at all, which keeps
 * the wide presentation the markup every other suite in this repository reads (rules P-3 and P-8).
 *
 * THE SERVICE IS MOCKED AT THE PROVIDER, the one boundary a shell module may read records through
 * (rule P-2). The specifier below is exactly the one `./role-switcher.tsx` imports, and Vitest keys
 * a mock on the resolved module, so the same stub also answers `providers.tsx`'s own import of
 * `useActiveUser`. The real provider is never reached, and that is the point: its bootstrap hashes
 * the seeded audit trail, so a suite that rendered through it would be testing the adapter's
 * bootstrap rather than the control. That hash is a platform call and not a DOM one: the chain hashes
 * through `globalThis.crypto.subtle`, and jsdom 31 exposes no `crypto.subtle` of its own, so the
 * digest resolves to the platform's implementation — the environment declaration that carries that
 * requirement with the module, and the reason for it, are stated once in the header of
 * `src/domain/audit/audit.test.ts`. The stub is created through `vi.hoisted` so it exists before the
 * mocked module is loaded, and it is typed from
 * `DemonstrationControls` itself, so it cannot drift from the signature the control calls.
 *
 * THE REAL SHELL STORE IS USED, NOT A DOUBLE. `providers.tsx` is imported rather than mocked, because
 * the store is what the component must talk to: clearing its five data fields in `beforeEach` is what
 * stops one case's persona colouring the next, and `activeRole` read back through `getState()` is the
 * evidence that a switch stored its role and a refusal stored nothing. The route is read through a probe
 * element that renders `useLocation().pathname`, never through a history object's internals.
 *
 * NO PERSON, IDENTIFIER OR FIGURE IS TYPED HERE. The two personas are fabricated by this suite and
 * named as records under test, so no seeded user id, name or plant code appears in the file; the
 * landing route is resolved through `entryRouteFor` rather than restated, so the role-to-route map
 * keeps its single owner (rules P-6, P-7). Nothing here hashes, reads the system clock, touches the
 * network, reads configuration or carries a credential (rules B-1, B-2), and no snapshot is taken:
 * every assertion is behavioural, so a reworded fixed string is read from the component's own export
 * rather than retyped (rule B-3).
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default, with the jest-dom matchers
 * `tests/setup.ts` registers. No `@vitest-environment` comment is needed: nothing here hashes.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import type { DemonstrationControls } from '../services/demonstration-controls';
import { ACTIVE_USER_QUERY_KEY } from '../services/service-provider';
import type { ActiveUser, Result, ThemeName } from '../types';
import type { Problem } from '../types/service';
import { entryRouteFor } from './nav-items';
import { useShellStore } from './providers';
import {
  ROLE_SWITCHER_LABEL,
  ROLE_SWITCHER_NOTE,
  ROLE_SWITCHER_TEXT,
  RoleSwitcher,
} from './role-switcher';

/* ---------------------------------------------------------------------------------------------
 * The provider, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/** The capability the port does not carry, and the persona the session acts as. */
type SwitchRole = DemonstrationControls['switchRole'];

/**
 * The state the mocked provider hands the control: the capability it may switch with — absent for a
 * service that carries no demonstration identity — and the persona the adapter is acting as.
 *
 * Set per case, because the three states the control distinguishes are exactly these two values.
 */
interface ProviderStub {
  /** The demonstration capability, or `null` when the bound service carries none. */
  demonstration: DemonstrationControls | null;

  /** The persona the shell reads at start-up, or `null` when nothing reports one. */
  activeUser: ActiveUser | null;
}

/** The stub, created before the module under test — and `providers.tsx` — is loaded. */
const stub = vi.hoisted<ProviderStub>(() => ({ demonstration: null, activeUser: null }));

/**
 * Replaces the provider module the switcher and the shell store both read through.
 *
 * `useService` is present so the module keeps the shape its consumers expect, and it refuses to
 * answer because the role switcher reads no port member: a suite that let it return a stand-in would
 * make a call the component never makes invisible.
 */
vi.mock('../services/service-provider', () => ({
  useService: () => {
    throw new Error('The role switcher reads no port member, so this suite binds no service.');
  },
  useDemonstration: () => stub.demonstration,
  useActiveUser: () => stub.activeUser,
  /*
   * The cache key the switcher writes a switched persona into. The real module owns the tuple; this
   * double has to carry it because the switcher imports the binding, and a suite that left it out would
   * fail on the import rather than on the behaviour it means to assert.
   */
  ACTIVE_USER_QUERY_KEY: ['getActiveUser'],
}));

/* ---------------------------------------------------------------------------------------------
 * Fixtures — the personas this suite fabricates, and the wording the component owns
 * ------------------------------------------------------------------------------------------- */

/** Both themes of specification §4.1, as the `data-theme` values the token layer keys on. */
const THEMES: readonly ThemeName[] = ['command', 'paper'];

/** The correlation identifier every envelope this suite builds carries. */
const TRACE_ID = 'trace-role-switcher-under-test';

/**
 * The vocabulary of an unimplemented claim, assembled from fragments (rule P-4).
 *
 * Built rather than typed, so this file does not itself carry the phrases
 * `tests/source-checks/forbidden-strings.test.ts` rejects anywhere under `src/` — the same device
 * `src/components/forbidden-card.test.tsx` and
 * `src/features/scr-05-approvals-and-audit/audit-screen.test.tsx` use for their own samples. What
 * the case below asserts is that the control states none of it: no sentence may claim that the
 * demonstration establishes sovereignty, prevents copying or resists tampering, and none may
 * describe a check as assured or attested. Each pattern admits the spaced, hyphenated and unspaced
 * spellings of its phrase, because a claim reworded into one of them is the same claim.
 */
const BARRED_CLAIM_PATTERNS: readonly RegExp[] = [
  ['tamper', '[\\s-]?', 'proof'],
  ['tamper', '[\\s-]?', 'resist'],
  ['zero', '[\\s-]?', 'trust'],
  ['guarant', 'eed'],
  ['certif', 'ied'],
].map((fragment) => new RegExp(fragment.join(''), 'iu'));

/** The lead-in the route probe prints, so the current path is read off the page rather than a history. */
const ROUTE_PROBE_PREFIX = 'Route under test: ';

/** The address every case opens on, before any switch has moved it. */
const START_ROUTE = '/';

/**
 * The persona the session starts as: a record this suite fabricates, with a role the contracts
 * enumerate and a landing route resolved from the module that owns that map.
 */
const PERSONA_A: ActiveUser = {
  id: 'persona-under-test-a',
  name: 'Persona under test A',
  role: 'material-planner',
  plantIds: [],
  permissions: [],
  homeRoute: entryRouteFor('material-planner'),
};

/** The persona a case switches to: a different role, so the landing route differs from the start. */
const PERSONA_B: ActiveUser = {
  id: 'persona-under-test-b',
  name: 'Persona under test B',
  role: 'plant-manager',
  plantIds: [],
  permissions: [],
  homeRoute: entryRouteFor('plant-manager'),
};

/** The roster the service reports, in the adapter's order, which the control must offer verbatim. */
const PERSONAS: readonly ActiveUser[] = [PERSONA_A, PERSONA_B];

/* ---------------------------------------------------------------------------------------------
 * Helpers every case renders through
 * ------------------------------------------------------------------------------------------- */

/** Wraps one payload in the envelope every service call resolves (contracts §2). */
function result<T>(data: T): Result<T> {
  return { data, meta: { freshness: [], simulated: true, traceId: TRACE_ID } };
}

/** The refusal a switch can end in, shaped as the service throws it: a cause and a plain message. */
const REFUSAL: Problem = {
  type: 'not-found',
  message: 'No persona of the demonstration answers that identifier, so nothing was switched.',
  traceId: TRACE_ID,
};

/**
 * Binds the capability the control reads: the switch a case observes, and the roster it offers.
 *
 * The roster member is the one read that makes a choice possible — the control offers the acting
 * persona alone, and says why, when the service reports no second one — so it is bound here rather
 * than in each case.
 */
function bindDemonstration(
  switchRole: SwitchRole,
  personas: readonly ActiveUser[] = PERSONAS,
): void {
  stub.demonstration = {
    switchRole,
    getActiveUser: async () => result(stub.activeUser ?? PERSONA_A),
    listPersonas: async () => result([...personas]),
  };
}

/** The switch a case observes, resolving the persona it is told the adapter now acts as. */
function stubSwitch(implementation: SwitchRole = async () => result(PERSONA_B)): Mock<SwitchRole> {
  return vi.fn<SwitchRole>(implementation);
}

/**
 * Makes `window.matchMedia` report a viewport narrower than the `md` breakpoint, and returns the
 * queries it was asked about so a case can state them.
 *
 * jsdom implements no media query at all, so `window.matchMedia` is absent and every other case here
 * sees the wide presentation — which is the markup the application renders on a desktop window. This
 * double is what makes the narrow one reachable: it answers `matches` for a `max-width` query and
 * `false` for anything else, so a stub cannot claim a narrow viewport for a query about something
 * else, and its `media` member repeats the query the switcher asked about rather than carrying a
 * second copy of that text. The suite's `afterEach` unstubs it, so it cannot colour a case that runs
 * after it — the same device `src/components/evidence-drawer.test.tsx` uses for its docked breakpoint.
 */
function stubNarrowViewport(): readonly string[] {
  const queries: string[] = [];

  vi.stubGlobal('matchMedia', (query: string) => {
    queries.push(query);

    return {
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addEventListener: (): void => undefined,
      removeEventListener: (): void => undefined,
      addListener: (): void => undefined,
      removeListener: (): void => undefined,
      dispatchEvent: (): boolean => true,
    };
  });

  return queries;
}

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

/**
 * Builds the cache one render reads through.
 *
 * A fresh client per render, so no cache entry and no in-flight roster read can be carried from one
 * case into the next. Named rather than inlined so a case that asserts on an entry of the cache can
 * hold the client its render mounted.
 */
function createTestClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

/**
 * Wraps one surface in the query cache the roster read needs and in a memory router, because the
 * control reads through both, and mounts the route probe beside it.
 *
 * The client is optional: a case that reads an entry back passes the one it built, and every other
 * case gets a fresh client of its own.
 */
function withProviders(ui: ReactElement, client: QueryClient = createTestClient()): ReactElement {
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[START_ROUTE]}>
        {ui}
        <RouteProbe />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Reads the address the router is on, from the probe element. */
function currentRoute(): string {
  const probe = screen.getByText(new RegExp(`^${ROUTE_PROBE_PREFIX}`));

  return (probe.textContent ?? '').slice(ROUTE_PROBE_PREFIX.length);
}

/**
 * Escapes a string into a matcher, so a fixed label containing parentheses is compared literally
 * rather than read as a pattern — and is read from the component's own export rather than retyped.
 */
function matching(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

/**
 * Renders the switcher and waits until the roster has settled.
 *
 * The control cannot act while the roster is being read, so every case that switches awaits the
 * options the service reported rather than the first render — otherwise it would be asserting a
 * state the reader only sees for a moment.
 */
async function renderSwitcher(): Promise<HTMLElement> {
  render(withProviders(<RoleSwitcher />));

  await waitFor(() => {
    expect(within(screen.getByRole('combobox')).getAllByRole('option')).toHaveLength(
      PERSONAS.length,
    );
  });

  return screen.getByRole('combobox');
}

/* ---------------------------------------------------------------------------------------------
 * One case starts from a clean shell and leaves no theme behind
 * ------------------------------------------------------------------------------------------- */

/**
 * Returns the shell store to a first-time visitor's state, so a case reads nothing of the one before it.
 *
 * The store's own `resetShell` does this and no application control calls it: `Reset demo data`
 * restores the adapter's records, clears the canvas selection and wall mode, counts the reset and
 * leaves the reader's persona and scope filters standing, while this member moves every field. Each
 * case here asserts the persona a press of the control stores, and a persona left behind by the case
 * before it would be read back as this one's own.
 */
function clearShellState(): void {
  useShellStore.getState().resetShell();
}

/**
 * Every case starts with no capability, no persona, a shell returned to its initial state and a
 * provider whose switch behaves the way that case states.
 */
beforeEach(() => {
  stub.demonstration = null;
  stub.activeUser = null;
  clearShellState();
});

/**
 * Takes the theme attribute off `<html>` again, so one theme case cannot colour the next, and removes
 * any stubbed global — the narrow case's `matchMedia` — so it cannot colour a case either.
 */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  clearShellState();
  vi.unstubAllGlobals();
});

/* ---------------------------------------------------------------------------------------------
 * The control's contracts
 * ------------------------------------------------------------------------------------------- */

describe('RoleSwitcher', () => {
  it('states on screen that the switcher is a demonstration and that its checks are not authorisation', async () => {
    bindDemonstration(stubSwitch());
    stub.activeUser = PERSONA_A;

    await renderSwitcher();

    const label = screen.getByText(ROLE_SWITCHER_LABEL);
    const note = screen.getByText(ROLE_SWITCHER_NOTE);

    /* Rule P-3: both sentences sit beside the control as visible body text. A hint painted only on
       hover, a `title` attribute or a hidden duplicate would leave the statement unreachable to a
       reader who never points at the control, which is the reading the rule exists to prevent. */
    expect(label.closest('[role="tooltip"]')).toBeNull();
    expect(note.closest('[role="tooltip"]')).toBeNull();
    expect(label).not.toHaveClass('sr-only');
    expect(note).not.toHaveClass('sr-only');
    expect(note.tagName).toBe('P');

    /* Rule P-4: nothing the control states claims a capability this demonstration does not have. */
    const rendered = document.body.textContent ?? '';

    for (const barred of BARRED_CLAIM_PATTERNS) {
      expect(rendered, 'the control states a claim rule P-4 bars').not.toMatch(barred);
    }
  });

  it('names the persona control with the demonstration label and the persona in force', async () => {
    bindDemonstration(stubSwitch());
    stub.activeUser = PERSONA_A;

    await renderSwitcher();

    /* Rule B-3: the control is reached by its role and its accessible name — never a test id — and
       the name carries the fixed label and the persona the session acts as, so a screen-reader or
       speech-input user hears who they are before changing it. */
    const control = screen.getByRole('combobox', { name: matching(ROLE_SWITCHER_LABEL) });

    expect(control).toHaveAccessibleName(matching(ROLE_SWITCHER_LABEL));
    expect(control).toHaveAccessibleName(matching(PERSONA_A.name));
    expect(control).toHaveAccessibleName(matching(PERSONA_A.role));
    expect(control).toHaveValue(PERSONA_A.id);
    /* It can act, so it carries no disabled state for a reader to work around. */
    expect(control).not.toHaveAttribute('aria-disabled');
  });

  it('answers the pointer with the bar’s states, and holds them back while it cannot act', async () => {
    bindDemonstration(stubSwitch());
    stub.activeUser = PERSONA_A;

    const control = await renderSwitcher();

    /* The bar's controls answer the pointer in one vocabulary — the theme and density switches, the
       simulated-data badge and the scope filters each paint a hover and a press — so this select does
       too, and every utility names a role rather than a palette value (specification §4.3). */
    expect(control).toHaveClass('hover:border-accent');
    expect(control).toHaveClass('active:bg-surface-1');
    expect(control).toHaveClass('active:text-text-primary');

    /* Rule B-3: the states arrive with the bar's colour transition, gated on `motion-safe` so a
       reduced-motion session gets the same states with no animation, and the focus indicator the rule
       requires is the same 2 px ring as before. */
    expect(control).toHaveClass('motion-safe:transition-colors');
    expect(control).toHaveClass('motion-safe:duration-150');
    expect(control).toHaveClass('focus-visible:outline-focus-ring');

    /* Rule P-8: this control states that it cannot act through `aria-disabled` rather than `disabled`,
       so the states above are held back by the attribute-stacked variants — the ones that outrank a
       plain `hover:`/`active:` in the cascade — or a pointer would paint a boundary the control would
       never act on, and a press a fill and label it would never step to. The press pair restates the
       select's own resting fill and label, exactly as `src/components/tooltip.tsx` holds back both
       states, so a press on a control that cannot act changes nothing. They are read from the same
       element as the states they suppress, because only the pairing is honest. */
    expect(control).toHaveClass('aria-disabled:hover:border-control-boundary');
    expect(control).toHaveClass('aria-disabled:active:bg-surface-2');
    expect(control).toHaveClass('aria-disabled:active:text-text-primary');
  });

  it('offers exactly the personas the service reports, and switches once for the one chosen', async () => {
    const user = userEvent.setup();
    const switchRole = stubSwitch();

    bindDemonstration(switchRole);
    stub.activeUser = PERSONA_A;

    const control = await renderSwitcher();
    const offered = within(control)
      .getAllByRole('option')
      .map((option) => option.getAttribute('value'));

    /* Rules P-2 and P-7: the people offered are the records the service returned, in its order. The
       identifiers are read from the stub rather than typed here, because a suite that named a seeded
       persona would become a second owner of that record. */
    expect(offered).toEqual(PERSONAS.map((persona) => persona.id));

    await user.selectOptions(control, PERSONA_B.id);

    await waitFor(() => {
      expect(useShellStore.getState().activeRole).toBe(PERSONA_B.role);
    });

    /* One selection is one switch, naming the persona the reader chose. */
    expect(switchRole).toHaveBeenCalledTimes(1);
    expect(switchRole).toHaveBeenCalledWith(PERSONA_B.id);
  });

  it('reads the roster under its own key, so another reader’s value cannot reach it', async () => {
    bindDemonstration(stubSwitch());
    stub.activeUser = PERSONA_A;

    /* The client is built here rather than by the shared helper, because the cache is this case's
       subject: the two entries below stand for what a different reader of the same service member
       caches — the `Result` envelope that once reached the shell through the bare member name — and
       they are read back afterwards to show the switcher neither consumed nor replaced them. A
       never-stale cache is what makes that observable: under the default the bare-name entry would be
       refetched, and the control could look right while still having read the wrong key first. */
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const foreign = result([PERSONA_B]);

    client.setQueryData(['listPersonas'], foreign);
    client.setQueryData(['listPersonas', 'governance'], foreign);

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[START_ROUTE]}>
          <RoleSwitcher />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(within(screen.getByRole('combobox')).getAllByRole('option')).toHaveLength(
        PERSONAS.length,
      );
    });

    const offered = within(screen.getByRole('combobox'))
      .getAllByRole('option')
      .map((option) => option.getAttribute('value'));

    /* The options are the roster the service reported, never the neighbour's payload: one method with
       one entry per reader, so a value this control never cached cannot be offered or acted on
       (rules P-2 and P-8 — a list of one would also have disabled the control silently). */
    expect(offered).toEqual(PERSONAS.map((persona) => persona.id));
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-disabled');
    /* And the neighbour's entries are still its own, untouched by the read that ran beside them. */
    expect(client.getQueryData(['listPersonas'])).toBe(foreign);
    expect(client.getQueryData(['listPersonas', 'governance'])).toBe(foreign);
  });

  it('stores the returned role and opens that role’s entry route on a successful switch', async () => {
    const user = userEvent.setup();
    const switchRole = stubSwitch(async () => result(PERSONA_B));

    bindDemonstration(switchRole);
    stub.activeUser = PERSONA_A;

    const control = await renderSwitcher();

    expect(currentRoute()).toBe(START_ROUTE);
    expect(useShellStore.getState().activeRole).toBeNull();

    await user.selectOptions(control, PERSONA_B.id);

    /* The route is read from the page and resolved through the module that owns the map, so the case
       states the contract — the shell opens the role's entry route — rather than a route string. */
    const entryRoute = entryRouteFor(PERSONA_B.role);

    await waitFor(() => {
      expect(currentRoute()).toBe(entryRoute);
    });

    expect(useShellStore.getState().activeRole).toBe(PERSONA_B.role);
    /* The persona the control shows is the one the adapter now enforces. */
    expect(screen.getByRole('combobox')).toHaveValue(PERSONA_B.id);
  });

  it('writes the persona the switch returned into the identity entry before the cache is re-read', async () => {
    const user = userEvent.setup();
    const switchRole = stubSwitch(async () => result(PERSONA_B));
    const client = createTestClient();

    bindDemonstration(switchRole);
    stub.activeUser = PERSONA_A;

    render(withProviders(<RoleSwitcher />, client));

    const control = screen.getByRole('combobox');

    await waitFor(() => {
      expect(within(control).getAllByRole('option')).toHaveLength(PERSONAS.length);
    });

    expect(client.getQueryData(ACTIVE_USER_QUERY_KEY)).toBeUndefined();

    await user.selectOptions(control, PERSONA_B.id);

    /* The entry the boundary publishes the acting persona from carries the envelope this switch
       returned — the shape `getActiveUser()` fills the key with, which two screens read as well, so one
       key holds one shape. It is written as the switch resolves rather than left to the refetch the
       invalidation starts, because the adapter answers a call after its own latency band: without this
       write a consumer that acts as the persona — "Assign to me" above all — would name the persona
       that stood before the switch until that refetch landed. */
    await waitFor(() => {
      expect(client.getQueryData(ACTIVE_USER_QUERY_KEY)).toEqual(result(PERSONA_B));
    });
  });

  it('leaves the persona and the route where they were when the service refuses the switch', async () => {
    const user = userEvent.setup();
    const switchRole = stubSwitch(async () => {
      throw REFUSAL;
    });

    bindDemonstration(switchRole);
    stub.activeUser = PERSONA_A;
    useShellStore.getState().setActiveRole(PERSONA_A.role);

    const control = await renderSwitcher();

    await user.selectOptions(control, PERSONA_B.id);

    /* The refusal's own message, in the alert region a reader is told about — not a sentence this
       control invented for the occasion. */
    expect(await screen.findByRole('alert')).toHaveTextContent(REFUSAL.message);

    expect(switchRole).toHaveBeenCalledTimes(1);
    /* Nothing about the session moved: the role it held, the persona it displays and the address it
       stands on are the ones the refusal left. */
    expect(useShellStore.getState().activeRole).toBe(PERSONA_A.role);
    expect(screen.getByRole('combobox')).toHaveValue(PERSONA_A.id);
    expect(currentRoute()).toBe(START_ROUTE);
  });

  it('offers no switch without the demonstration capability, and explains why from the keyboard', async () => {
    const user = userEvent.setup();

    /* No capability bound: the state a service that leaves identity to a real session produces. */
    render(withProviders(<RoleSwitcher />));

    const control = screen.getByRole('button', { name: ROLE_SWITCHER_TEXT.unavailableAction });

    /* Rule P-8: the control is visibly disabled rather than absent or silently inert, and it stays
       focusable — a `disabled` attribute would take the explanation out of the tab order. */
    expect(control).toHaveAttribute('aria-disabled', 'true');

    await user.tab();
    expect(control).toHaveFocus();

    /* Reached by keyboard, the reason is painted; and it is bound to the control either way, so a
       reader who arrives by another route is told the same sentence. */
    expect(screen.getByRole('tooltip')).toHaveTextContent(ROLE_SWITCHER_TEXT.noCapability);

    const descriptionId = control.getAttribute('aria-describedby') ?? '';

    expect(descriptionId).not.toBe('');
    expect(document.getElementById(descriptionId)).toHaveTextContent(
      ROLE_SWITCHER_TEXT.noCapability,
    );

    /* Activation changes nothing, because there is nothing to switch with. */
    await user.click(control);
    expect(useShellStore.getState().activeRole).toBeNull();
    expect(currentRoute()).toBe(START_ROUTE);

    /* Rule P-3's statement does not depend on the capability being present: a reader meeting a
       disabled switcher still learns what the checks behind it would be. */
    expect(screen.getByText(ROLE_SWITCHER_LABEL)).toBeInTheDocument();
    expect(screen.getByText(ROLE_SWITCHER_NOTE)).toBeInTheDocument();
  });

  it('explains itself when the service offers no other persona to act as', async () => {
    bindDemonstration(stubSwitch(), [PERSONA_A]);
    stub.activeUser = PERSONA_A;

    render(withProviders(<RoleSwitcher />));

    /* A roster of one is not a choice, so the control says why it cannot act rather than presenting
       a list that would change nothing (rule P-8). */
    expect(await screen.findByText(ROLE_SWITCHER_TEXT.rosterUnavailable)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
  });

  it('folds the label and the select behind one disclosure on a narrow viewport, and never in the wide one', async () => {
    const user = userEvent.setup();
    const queries = stubNarrowViewport();

    bindDemonstration(stubSwitch());
    stub.activeUser = PERSONA_A;

    render(withProviders(<RoleSwitcher />));

    /* The narrow presentation is the one that asks the narrow question, so the double below has not
       answered a query about something else on this module's behalf. */
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.every((query) => query.includes('max-width'))).toBe(true);

    /* Exactly one disclosure trigger, closed, and naming a region that is in the document even while
       it is closed — a relationship pointing at an element that does not exist is not a relationship. */
    const trigger = screen.getByRole('button', { name: matching(ROLE_SWITCHER_LABEL) });

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    const revealedId = trigger.getAttribute('aria-controls') ?? '';

    expect(revealedId).not.toBe('');
    expect(document.getElementById(revealedId)).not.toBeNull();

    /* The choice is not rendered until the disclosure is opened... */
    expect(screen.queryByRole('combobox')).toBeNull();

    /* ...and rule P-3's statement is on screen anyway, beside the trigger rather than behind it. */
    const note = screen.getByText(ROLE_SWITCHER_NOTE);

    expect(note.tagName).toBe('P');
    expect(note).not.toHaveClass('sr-only');
    expect(note.closest('[role="tooltip"]')).toBeNull();

    /* Activating the trigger by pointer reveals the label and the select, and nothing else. */
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const control = await screen.findByRole('combobox');

    await waitFor(() => {
      expect(within(control).getAllByRole('option')).toHaveLength(PERSONAS.length);
    });

    /* The revealed control is the control the wide presentation renders: named by the fixed label and
       by the persona in force, so a reader who opened the disclosure meets the same control. */
    expect(control).toHaveAccessibleName(matching(ROLE_SWITCHER_LABEL));
    expect(control).toHaveAccessibleName(matching(PERSONA_A.name));

    /* The same trigger closes it again from the keyboard (rule B-3), and the note stays on screen. */
    trigger.focus();
    await user.keyboard('{Enter}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText(ROLE_SWITCHER_NOTE)).toBeInTheDocument();

    /* With no `matchMedia` at all — the environment every other case here runs in — the wide
       presentation renders, and there is no disclosure trigger to press. */
    vi.unstubAllGlobals();
    cleanup();

    render(withProviders(<RoleSwitcher />));

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(await screen.findByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText(ROLE_SWITCHER_LABEL)).toBeInTheDocument();
    expect(screen.getByText(ROLE_SWITCHER_NOTE)).toBeInTheDocument();
  });

  it.each(THEMES)('states the demonstration wording under the %s theme', async (theme) => {
    bindDemonstration(stubSwitch());
    stub.activeUser = PERSONA_A;
    document.documentElement.setAttribute('data-theme', theme);

    await renderSwitcher();

    /* Both themes resolve the same role utilities, so the wording a reader must see appears in each. */
    expect(document.documentElement).toHaveAttribute('data-theme', theme);
    expect(screen.getByText(ROLE_SWITCHER_LABEL)).toBeInTheDocument();
    expect(screen.getByText(ROLE_SWITCHER_NOTE)).toBeInTheDocument();
  });
});

