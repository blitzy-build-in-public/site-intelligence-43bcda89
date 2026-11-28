/**
 * Component suite for `simulation-controls.tsx`: the one simulation popover that holds the seven
 * screen states, the two triggers that are not screen states and `Reset demo data` (functional
 * requirement F10; AAP §0.12.1, §0.12.4, §0.10 hold them in this panel and nowhere else; T-17 drives
 * it in the browser).
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS RELIED ON. The panel is named by the exact specification
 * §5.3 string `Simulated control` — the label rule P-4 requires on the audit chain, the tamper
 * control and the popover itself — selected from `SIM_LABELS` rather than retyped, because the
 * browser helper `e2e/helpers/simulation-controls.ts` matches the dialog by that literal and the two
 * have to name the same string. It renders nothing at all while the shell store reports it closed,
 * which is the state every route is in until the persistent badge is activated. The nine triggers are
 * rendered as nine pressed-state toggles inside two named groups: the seven `ScreenState` members in
 * the order that union declares them, then the two `SimulationFlag` members beyond it. Every one of
 * them asks the port for its own flag through `setSimulation`, which is asserted one trigger per case
 * so a control that lost its handler cannot pass on its neighbours' calls; the tampered-audit and
 * empty-queue triggers are two of those nine, so each is proven to reach the service in its own case.
 * The panel is mutually exclusive as a screen's condition (AAP §0.12.1): setting a second state lifts
 * the first through the port before it sets the next, and the pressed state moves only once the
 * adapter has accepted the change, so a refused trigger is left showing what the adapter holds rather
 * than what the reader clicked.
 *
 * THE RESET AND THE KEYBOARD, RULE B-3 AND RULE P-8. `Reset demo data` calls `resetDemo`, puts the
 * shell's own view of the session back — the canvas selection cleared, wall mode off, the count of
 * demonstration resets raised and the persona and scope left as the reader chose them — and closes the
 * panel, and the element that opened the panel has focus again once it is gone — the same focus return
 * `Escape` produces, which the panel binds on the document for as long as it is mounted because it
 * claims modality. A reset the service refuses is reported in the service's own words, keeps the panel
 * open and offers the change again, so nothing
 * here pretends an effect it did not have. While a change is in flight the panel disables every
 * control it owns and explains each one from the keyboard: the nine toggles carry `aria-disabled` and
 * are described by the one visible busy sentence, and the reset — an `ActionButton`, the primitive
 * that cannot render disabled without a reason — paints that reason in a tooltip on focus. The panel's
 * whole copy is asserted to carry no figure, amount or record identifier (rule P-6), which is what
 * this module's own header claims for it.
 *
 * THE SERVICE IS MOCKED AT THE PROVIDER, the one boundary the shell is allowed to read through (rule
 * P-2). The specifier is exactly the one `simulation-controls.tsx` imports, because Vitest keys a mock
 * on the resolved module rather than on a path spelling. The stub is created through `vi.hoisted` so
 * it exists before `providers.tsx` — which this suite imports for the real shell store — is loaded,
 * and with it the in-browser adapter of `src/services` is never reached. Both stub members are typed
 * from the port itself (`SiteIntelligenceService['setSimulation']`, `['resetDemo']`), so they cannot
 * drift from the signatures the panel calls.
 *
 * THE PANEL READS THE PORT AND NO CAPABILITY. `useService()` alone is stubbed, and the mock exposes no
 * `useDemonstration`, because `simulation-controls.tsx` never asks for the role-switch capability:
 * `setSimulation` and `resetDemo` are members of the port every adapter carries
 * (`src/services/site-intelligence-service.ts`), so the panel has no "no capability" branch to render
 * and works against an adapter whose switch-capability counterpart is absent. A render that reached
 * for `useDemonstration` would fail here as a missing export rather than pass quietly.
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite therefore proves keyboard operability and labelling rather than auditing
 * them.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Role } from '../types/entities';
import type { SiteIntelligenceService } from '../services/site-intelligence-service';
import { SIM_LABELS } from '../types/primitives';
import type { Problem, Result, SimulationFlag } from '../types/service';
import { useShellStore } from './providers';
import { SIMULATION_CONTROLS_TEXT, SimulationControls } from './simulation-controls';

/* ---------------------------------------------------------------------------------------------
 * The port, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/** The two port members this panel calls, named from the port rather than restated here. */
type SetSimulation = SiteIntelligenceService['setSimulation'];
type ResetDemo = SiteIntelligenceService['resetDemo'];

/**
 * The panel's two port calls, replaced before `providers.tsx` and the module under test are loaded.
 *
 * A call that succeeds resolves the envelope below; a call that fails rejects the service's own
 * `Problem`, which is how contracts §2 has every call fail and what the panel's failure region
 * prints. Both are set per case, because a change that failed once and succeeded on the retry is one
 * of the contracts the panel offers.
 */
const setSimulation = vi.hoisted(() => vi.fn<SetSimulation>());
const resetDemo = vi.hoisted(() => vi.fn<ResetDemo>());

/** The one prop the pass-through provider receives. */
interface ServiceProviderStubProps {
  /** The provider tree's children, rendered as they are. */
  readonly children?: ReactElement | readonly ReactElement[];
}

/**
 * Replaces the provider module the panel and the shell store read through.
 *
 * `ServiceProvider` passes its children straight through and `useActiveUser` reports no persona, so
 * the tree mounts without the adapter's bootstrap. `useDemonstration` is deliberately absent: this
 * panel reads the port alone (see the module note), and a call to the capability would fail as a
 * missing export instead of being silently answered.
 */
vi.mock('../services/service-provider', () => ({
  ServiceProvider: ({ children }: ServiceProviderStubProps) => children,
  useService: () => ({ setSimulation, resetDemo }),
  useActiveUser: () => null,
}));

/* ---------------------------------------------------------------------------------------------
 * The fixtures this suite fabricates — no record, no figure, no identifier (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every envelope and every refusal of one call carries. */
const TRACE_ID = 'trace-simulation-controls-under-test';

/** The label the panel carries: the fifth of the seven fixed §5.3 strings, read from its owner. */
const SIMULATED_CONTROL_LABEL = SIM_LABELS[4];

/** The visible label of the control that opens the panel in this suite's harness. */
const OPENER_LABEL = 'The control that opened the panel';

/**
 * Every trigger the panel offers, in the order it renders them: the seven `ScreenState` members, then
 * the two that are not screen states.
 *
 * Typed against the union and asserted exhaustive below, so a trigger added to `SimulationFlag`
 * without a control fails the type check here rather than becoming a control no case ever presses.
 */
const TRIGGERS = [
  'loading',
  'empty',
  'stale',
  'partial',
  'offline',
  'forbidden',
  'conflict',
  'tampered-audit',
  'empty-queue',
] as const satisfies readonly SimulationFlag[];

/** Every member of `SimulationFlag` the list above leaves out: `never` while the list is complete. */
type UnlistedTrigger = Exclude<SimulationFlag, (typeof TRIGGERS)[number]>;

/** Fails the type check unless its argument is `never`, which is what makes the list exhaustive. */
type AssertNever<Value extends never> = Value;

/** The assertion itself: a trigger added to the union and not to the list is a compile error here. */
type TriggersListed = AssertNever<UnlistedTrigger>;

/**
 * One trigger with the position the panel renders its control at, so each case can name the trigger it
 * presses instead of relying on a control's words — the panel owns that copy, and a suite that
 * repeated it would be a second owner able to drift from the component.
 */
type TriggerCase = readonly [SimulationFlag, number];

/** The nine triggers with their positions, one per case. */
const TRIGGER_CASES: readonly TriggerCase[] = TRIGGERS.map((flag, index) => [flag, index] as const);

/** The refusal a change can end in, shaped as the service throws it: a cause and a plain message. */
const REFUSAL: Problem = {
  type: 'validation',
  message: 'The records could not be put back, so the demonstration is unchanged.',
  traceId: TRACE_ID,
};

/** Wraps one payload in the envelope every service call resolves (contracts §2). */
function result<Payload>(data: Payload): Result<Payload> {
  return { data, meta: { freshness: [], simulated: true, traceId: TRACE_ID } };
}

/**
 * The role this suite puts in force before a reset, to prove the persona the reader chose outlives one:
 * a member of the contracts' own `Role` union rather than a person or a record (rule P-6).
 */
const STORED_ROLE: Role = 'head-of-supply-chain';

/**
 * An opaque value this suite stores as a canvas selection and as both members of a scope. It is shaped
 * like nothing this application records, so no case here states an identifier (rule P-6).
 */
const STORED_VALUE = 'a value this suite stored';

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/**
 * The surface the panel is rendered inside: one control that opens it through the shell store, the way
 * the persistent badge does, followed by the panel itself.
 *
 * The opener is a real control rather than a store write, because the panel's focus handling is one of
 * the contracts here: it records the element that had focus when it mounted and returns focus to it
 * when it closes, and a case has to be able to see that happen to the control the reader pressed.
 */
function Harness(): ReactElement {
  return (
    <>
      <button
        type="button"
        onClick={() => {
          useShellStore.getState().setSimulationOpen(true);
        }}
      >
        {OPENER_LABEL}
      </button>
      <SimulationControls />
    </>
  );
}

/** Builds the cache one render reads through, with retries off so a failed read settles once. */
function createTestClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Renders the harness inside the query cache the panel's own reads are invalidated through. */
function renderPanel(): void {
  render(
    <QueryClientProvider client={createTestClient()}>
      <Harness />
    </QueryClientProvider>,
  );
}

/** Opens the panel the way a reader does, and answers the dialog once the store has flipped. */
async function openPanel(): Promise<HTMLElement> {
  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: OPENER_LABEL }));

  return screen.findByRole('dialog', { name: SIMULATED_CONTROL_LABEL });
}

/** The open panel, read back for a case that has already opened it. */
function panel(): HTMLElement {
  return screen.getByRole('dialog', { name: SIMULATED_CONTROL_LABEL });
}

/**
 * The nine trigger toggles, in the order the panel renders them.
 *
 * A toggle is the control that reports a pressed state, which is what tells the nine triggers apart
 * from the panel's close, reset and retry actions without this suite holding any of their words.
 */
function triggerToggles(): readonly HTMLElement[] {
  return within(panel())
    .getAllByRole('button')
    .filter((control) => control.hasAttribute('aria-pressed'));
}

/** One member of a list a case indexes, with the miss reported rather than surfacing as `undefined`. */
function atIndex<Item>(items: readonly Item[], index: number): Item {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`The panel rendered nothing at position ${index}.`);
  }

  return item;
}

/** One promise a case settles by hand, so a change can be observed while it is still in flight. */
interface Deferred<Value> {
  /** What the component awaits. */
  readonly promise: Promise<Value>;

  /** Settles the promise, running the rest of the panel's change. */
  resolve(value: Value): void;
}

/** Builds a promise whose settlement a case decides. */
function defer<Value>(): Deferred<Value> {
  let settle: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((resolve) => {
    settle = resolve;
  });

  return {
    promise,
    resolve: (value: Value) => {
      settle(value);
    },
  };
}

/** Escapes a string into a matcher, so a fixed label is compared literally rather than as a pattern. */
function endingWith(text: string): RegExp {
  return new RegExp(`${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

/* ---------------------------------------------------------------------------------------------
 * Every case starts from the seeded shell and a port that accepts what it is asked
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  useShellStore.getState().resetShell();
  setSimulation.mockImplementation(async () => result(true));
  resetDemo.mockImplementation(async () => result(true));
});

afterEach(() => {
  useShellStore.getState().resetShell();
});

/* ---------------------------------------------------------------------------------------------
 * The panel, its label and its triggers
 * ------------------------------------------------------------------------------------------- */

describe('SimulationControls — the panel and its triggers', () => {
  it('names the panel with the exact Simulated control label and says what it changes', async () => {
    renderPanel();

    const dialog = await openPanel();

    expect(dialog).toHaveAccessibleName(SIMULATED_CONTROL_LABEL);
    expect(within(dialog).getByText(SIMULATION_CONTROLS_TEXT.intro)).toBeInTheDocument();
  });

  it('renders nothing at all until the shell store reports the panel open', async () => {
    renderPanel();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText(SIMULATION_CONTROLS_TEXT.intro)).toBeNull();

    const dialog = await openPanel();

    expect(dialog).toBeInTheDocument();
  });

  it('holds the seven screen states and the two other triggers in two named groups', async () => {
    renderPanel();

    const dialog = await openPanel();
    const groups = within(dialog).getAllByRole('group');

    expect(groups).toHaveLength(2);
    expect(atIndex(groups, 0)).toHaveAccessibleName(SIMULATION_CONTROLS_TEXT.stateLegend);
    expect(atIndex(groups, 1)).toHaveAccessibleName(SIMULATION_CONTROLS_TEXT.flagLegend);
    expect(within(atIndex(groups, 0)).getAllByRole('button')).toHaveLength(7);
    expect(within(atIndex(groups, 1)).getAllByRole('button')).toHaveLength(2);
  });

  it('renders one pressed-state toggle per trigger, each of them able to act', async () => {
    renderPanel();

    await openPanel();

    const toggles = triggerToggles();

    expect(TRIGGERS).toHaveLength(9);
    expect(toggles).toHaveLength(TRIGGERS.length);

    for (const toggle of toggles) {
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      expect(toggle).not.toHaveAttribute('aria-disabled');
    }
  });

  it.each(TRIGGER_CASES)(
    'asks the service for the %s trigger when its own control is activated',
    async (flag, position) => {
      const user = userEvent.setup();

      renderPanel();
      await openPanel();

      await user.click(atIndex(triggerToggles(), position));

      expect(setSimulation).toHaveBeenCalledTimes(1);
      expect(setSimulation).toHaveBeenCalledWith(flag, true);
    },
  );

  it('lifts the state in effect before it sets the next one', async () => {
    const user = userEvent.setup();

    renderPanel();
    await openPanel();

    await user.click(atIndex(triggerToggles(), 0));
    await user.click(atIndex(triggerToggles(), 1));

    expect(setSimulation.mock.calls).toEqual([
      [atIndex(TRIGGERS, 0), true],
      [atIndex(TRIGGERS, 0), false],
      [atIndex(TRIGGERS, 1), true],
    ]);
  });

  it('reports the trigger in effect as pressed once the service has accepted it', async () => {
    const user = userEvent.setup();

    renderPanel();
    await openPanel();

    const toggle = atIndex(triggerToggles(), 0);

    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });

    expect(toggle).toHaveAccessibleName(endingWith(SIMULATION_CONTROLS_TEXT.on));
    expect(within(toggle).getByText(SIMULATION_CONTROLS_TEXT.on)).toBeInTheDocument();

    const pressed = triggerToggles().filter(
      (control) => control.getAttribute('aria-pressed') === 'true',
    );

    expect(pressed).toHaveLength(1);
  });

  it('leaves the trigger as the service left it when a change is refused, and offers it again', async () => {
    const user = userEvent.setup();

    setSimulation.mockRejectedValueOnce(REFUSAL);

    renderPanel();
    await openPanel();

    const toggle = atIndex(triggerToggles(), 0);

    await user.click(toggle);

    const alert = await within(panel()).findByRole('alert');

    expect(alert).toHaveTextContent(REFUSAL.message);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(
      within(alert).getByRole('button', { name: SIMULATION_CONTROLS_TEXT.retryLabel }),
    ).toBeInTheDocument();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The reset — AAP §0.10, rules P-6 and P-8
 * ------------------------------------------------------------------------------------------- */

describe('SimulationControls — Reset demo data', () => {
  it('calls resetDemo, closes the panel and returns focus to the element that opened it', async () => {
    const user = userEvent.setup();

    renderPanel();
    const dialog = await openPanel();

    await user.click(
      within(dialog).getByRole('button', { name: SIMULATION_CONTROLS_TEXT.resetLabel }),
    );

    expect(resetDemo).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    expect(useShellStore.getState().simulationOpen).toBe(false);
    expect(screen.getByRole('button', { name: OPENER_LABEL })).toHaveFocus();
  });

  it('puts the shell’s own view of the session back with the records it restores', async () => {
    const user = userEvent.setup();

    renderPanel();

    act(() => {
      const store = useShellStore.getState();

      store.setActiveRole(STORED_ROLE);
      store.setScope({ plants: [STORED_VALUE], products: [STORED_VALUE] });
      store.setSelectedNodeId(STORED_VALUE);
      store.setWallMode(true);
    });

    const epochBefore = useShellStore.getState().demonstrationEpoch;
    const dialog = await openPanel();

    await user.click(
      within(dialog).getByRole('button', { name: SIMULATION_CONTROLS_TEXT.resetLabel }),
    );

    await waitFor(() => {
      expect(useShellStore.getState().simulationOpen).toBe(false);
    });

    const store = useShellStore.getState();

    /* The canvas reopens where a first visit finds it: no selection, and no wall mode left standing,
       which would hide the navigation of a screen that no longer believes it is in wall mode. */
    expect(store.selectedNodeId).toBeNull();
    expect(store.wallMode).toBe(false);

    /* The count is how the screens' own stores — the canvas's lens, the atlas's class and entity —
       learn that the session their choice belonged to has ended. */
    expect(store.demonstrationEpoch).toBe(epochBefore + 1);

    /* The two values that describe who is reading rather than what the demonstration shows stand. */
    expect(store.activeRole).toBe(STORED_ROLE);
    expect(store.scope).toEqual({ plants: [STORED_VALUE], products: [STORED_VALUE] });
  });

  it('reports a failed reset in the service own words and keeps the panel open', async () => {
    const user = userEvent.setup();

    resetDemo.mockRejectedValueOnce(REFUSAL);

    renderPanel();
    const dialog = await openPanel();

    await user.click(
      within(dialog).getByRole('button', { name: SIMULATION_CONTROLS_TEXT.resetLabel }),
    );

    const alert = await within(panel()).findByRole('alert');

    expect(alert).toHaveTextContent(REFUSAL.message);

    await user.click(
      within(alert).getByRole('button', { name: SIMULATION_CONTROLS_TEXT.retryLabel }),
    );

    expect(resetDemo).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape and returns focus to the element that opened it', async () => {
    renderPanel();
    await openPanel();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    expect(useShellStore.getState().simulationOpen).toBe(false);
    expect(screen.getByRole('button', { name: OPENER_LABEL })).toHaveFocus();
  });
});

/* ---------------------------------------------------------------------------------------------
 * A control that cannot act while a change is in flight — rule P-8
 * ------------------------------------------------------------------------------------------- */

describe('SimulationControls — the reason a control cannot act', () => {
  it('explains every control it disables while a change is in flight, from the keyboard too', async () => {
    const user = userEvent.setup();
    const deferred = defer<Result<true>>();

    setSimulation.mockImplementationOnce(() => deferred.promise);

    renderPanel();
    const dialog = await openPanel();

    await user.click(atIndex(triggerToggles(), 0));

    for (const toggle of triggerToggles()) {
      expect(toggle).toHaveAttribute('aria-disabled', 'true');

      const descriptionId = toggle.getAttribute('aria-describedby');
      const description = descriptionId === null ? null : document.getElementById(descriptionId);

      expect(description).not.toBeNull();
      expect(description).toHaveTextContent(SIMULATION_CONTROLS_TEXT.busyReason);
    }

    expect(within(dialog).getByRole('status')).toHaveTextContent(
      SIMULATION_CONTROLS_TEXT.busyReason,
    );

    const reset = within(panel()).getByRole('button', { name: SIMULATION_CONTROLS_TEXT.resetLabel });

    expect(reset).toHaveAttribute('aria-disabled', 'true');

    act(() => {
      reset.focus();
    });

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      SIMULATION_CONTROLS_TEXT.busyReason,
    );

    act(() => {
      deferred.resolve(result(true));
    });

    await waitFor(() => {
      expect(atIndex(triggerToggles(), 0)).not.toHaveAttribute('aria-disabled');
    });
  });

  it('states no figure, amount, date or record identifier in the copy it renders', async () => {
    renderPanel();

    const dialog = await openPanel();

    expect(dialog.textContent ?? '').not.toMatch(/[0-9]/);
  });
});
