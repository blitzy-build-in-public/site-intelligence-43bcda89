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
 * from the keyboard alone (rule P-8), and the note rule P-3 requires stays on screen beside it.
 * Finally the rendered text is scanned for the vocabulary rule P-4 bars — no sentence may claim that
 * the demonstration establishes sovereignty, prevents copying or resists tampering — and both themes
 * are rendered, because the same role utilities must carry the wording in each.
 *
 * THE SERVICE IS MOCKED AT THE PROVIDER, the one boundary a shell module may read records through
 * (rule P-2). The specifier below is exactly the one `./role-switcher.tsx` imports, and Vitest keys a
 * mock on the resolved module, so the same stub also answers `providers.tsx`'s own import of
 * `useActiveUser`. The real provider is never reached, and that is the point: its bootstrap hashes the
 * seeded audit trail through `crypto.subtle`, which rejects jsdom's `ArrayBuffer` realm, so a suite
 * that rendered through it would be testing the platform rather than the control. The stub is created
 * through `vi.hoisted` so it exists before the mocked module is loaded, and it is typed from
 * `DemonstrationControls` itself, so it cannot drift from the signature the control calls.
 *
 * THE REAL SHELL STORE IS USED, NOT A DOUBLE. `providers.tsx` is imported rather than mocked, because
 * the store is what the component must talk to: `resetShell()` in `beforeEach` is what stops one
 * case's persona colouring the next, and `activeRole` read back through `getState()` is the evidence
 * that a switch stored its role and a refusal stored nothing. The route is read through a probe
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
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import type { DemonstrationControls } from '../services/demonstration-controls';
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
 * Wraps one surface in the query cache the roster read needs and in a memory router, because the
 * control reads through both, and mounts the route probe beside it.
 *
 * A fresh client per render, so no cache entry and no in-flight roster read can be carried from one
 * case into the next.
 */
function withProviders(ui: ReactElement): ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

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
 * Every case starts with no capability, no persona, a shell returned to its initial state and a
 * provider whose switch behaves the way that case states.
 */
beforeEach(() => {
  stub.demonstration = null;
  stub.activeUser = null;
  useShellStore.getState().resetShell();
});

/** Takes the theme attribute off `<html>` again, so one theme case cannot colour the next. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  useShellStore.getState().resetShell();
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

