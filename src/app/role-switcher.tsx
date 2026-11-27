/**
 * The demonstration persona switcher: the last control in the shell's top bar, and the one lever that
 * lets a reader see the product as each of the eight seeded personas does.
 *
 * WHAT IT IS, AND WHAT IT IS NOT. The switcher changes which persona the session acts as (AAP 0.2.3,
 * AAP 0.6.3 "Identity"). It grants nothing. Every read and write after a switch is authorised by the
 * in-browser adapter against the persona it now acts as — the permission matrix of contracts §7.1 and
 * the policy engine are evaluated there, on the seed's own records — so bypassing this control, or
 * reaching a member directly from a console, changes nothing about what the service answers (rule
 * P-3). Because that enforcement runs in the browser of a build with no backend, no sign-in and no
 * session, the checks behind this control are a demonstration and are not production authorisation.
 * The control states that on screen, in {@link ROLE_SWITCHER_NOTE}, and `README.md` repeats it under
 * its heading `The role switcher`; the two strings live in this module as
 * {@link ROLE_SWITCHER_LABEL} and {@link ROLE_SWITCHER_NOTE} so the component and the README cannot
 * drift apart (AAP 0.10).
 *
 * WHERE ITS OPTIONS COME FROM. From the service, never from this file: the persona records are the
 * seed's (`src/seed/users.ts`), and rule P-2 leaves a screen or a component no route to them. The
 * demonstration capability of `src/services/demonstration-controls.ts` carries them as its optional
 * roster read, so this module asks the capability for the personas it can act as and renders one
 * option per record, labelled with the persona's own synthetic name and role — no user identifier,
 * person's name, role token or plant code is typed here (rules P-2, P-6, P-7). The member is
 * optional because an adapter holding no seeded personas leaves it absent; when it is absent, or it
 * reports fewer than two personas, this control cannot act and says so instead of offering a choice
 * that would change nothing (rule P-8). The acting persona is read from `useActiveUser()`, the
 * start-up read the shell seeds its persona from, and the persona in force from `useActiveRole()`, so
 * a demonstration reset that returns the adapter to its seeded persona returns this control to it
 * too, without a second source of truth.
 *
 * WHAT A SWITCH DOES. On a successful `switchRole`, three things happen in order: the shell stores the
 * returned persona's role through `setActiveRole`, so the density and every role-scoped label follow
 * the persona the adapter now enforces; the query cache is invalidated whole, because every read the
 * screens hold — the queue, the overview, the inbox, the ledger — was narrowed by the persona that
 * just changed; and the router is sent to `entryRouteFor(role)`, the route AAP 0.12.4 fixes per role,
 * which is the same resolution `/` performs for a first visit. Changing the selection is the
 * confirmation; there is no separate submit.
 *
 * WHAT A REFUSAL DOES. Nothing but explain itself. The adapter refuses a switch it cannot complete
 * with a `Problem` that carries its own message, and this control renders that message verbatim in a
 * `role="alert"` region, keeps the selection the session held, and leaves the shell store and the
 * router untouched — so a refused switch never reads as a switch that happened (AAP 0.2.2).
 *
 * ACCESSIBILITY. A native `<select>`, the element the browser already gives keyboard operation,
 * type-ahead and a screen-reader interaction model; this component is the one that owns it (AAP
 * 0.5.2). It is bound to a visible `<label>` carrying the fixed wording, its accessible name adds the
 * persona in force and that persona's role, and its description carries the non-authorisation note
 * plus, when it cannot act, the sentence saying why. The target is at least 24x24 px and the focus
 * ring is the theme's 2 px `focus-ring` role, drawn on `focus-visible` so a pointer click leaves no
 * ring (rule B-3). A control that cannot act carries `aria-disabled` rather than `disabled`, the same
 * choice `src/components/tooltip.tsx` documents: `disabled` would drop it out of the tab order, and
 * the explanation rule P-8 requires would then be unreachable by keyboard. No meaning is carried by
 * colour: the acting persona, its role and every explanation are text.
 *
 * WHAT IT DOES NOT DO. It fetches nothing of its own (rule B-1): the persona records arrive through
 * the bound adapter, which holds them in memory. It reads no configuration and carries no credential
 * (rule B-2). It writes no figure, amount, date or identifier (rule P-6) — every string it renders is
 * either the fixed wording above or a value the service returned. It invents no simulation label; the
 * persistent `Simulated data` badge belongs to the shell, and the demonstration control its wording
 * describes is tagged by the popover that offers it (rule P-1). It claims nothing about the
 * deployment: it says the session acts as a persona for the length of a demonstration and no more
 * (rule P-4). It uses role tokens only, with no raw palette value and no shadow, so both themes keep
 * the contrast the specification measured.
 *
 * No test hook. Nothing here reads a query parameter, a global or a flag: this switcher is a product
 * feature, and a browser test drives it exactly as a reader does.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useNavigate } from 'react-router';

import { ActionButton } from '../components/tooltip';
import type { DemonstrationControls } from '../services/demonstration-controls';
import { useActiveUser, useDemonstration } from '../services/service-provider';
import type { ActiveUser } from '../types/entities';
import { entryRouteFor } from './nav-items';
import { useActiveRole, useShellStore } from './providers';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written — AAP 0.10, rule P-3
 * ------------------------------------------------------------------------------------------- */

/**
 * The control group's visible label, exactly as AAP 0.10 fixes it, including the parenthesised
 * qualifier.
 *
 * One owner: the component renders this constant, a suite names it instead of retyping it, and the
 * README's `The role switcher` heading states the same thing in its own words.
 */
export const ROLE_SWITCHER_LABEL = 'Demo role switcher (simulation only)';

/**
 * The sentence under the control that rule P-3 requires to be visible wherever the switcher is
 * offered: the permission checks behind it run in this browser, so they demonstrate the mechanism and
 * are not production authorisation.
 *
 * Visible body text rather than a tooltip or a `title`, because rule P-3 says the interface states it
 * — a reader must not have to hover to learn that the control is a demonstration. It states that one
 * fact, and it says nothing about the deployment the control runs in (rule P-4).
 */
export const ROLE_SWITCHER_NOTE =
  'Browser-side permission checks are not production authorisation.';

/**
 * Every other sentence this component states, held here so the wording has one owner: the control
 * renders these strings and a suite names them through this object instead of retyping them.
 *
 * None of them carries a figure, a date, an identifier, a persona or a role (rule P-6), and none
 * asserts anything about the deployment's configuration or the records a customer holds (rule P-4).
 * Each says what the control can or cannot do, in the reader's terms, which is what rule P-8 asks of
 * a control that cannot act.
 */
export const ROLE_SWITCHER_TEXT = {
  /** The two fixed strings, reachable from one object as well as from their own exports. */
  label: ROLE_SWITCHER_LABEL,
  note: ROLE_SWITCHER_NOTE,

  /** The label of the control rendered when the bound service carries no demonstration identity. */
  unavailableAction: 'Switch persona',

  /**
   * Why the control cannot act when the bound service carries no demonstration capability: the
   * unconnected HTTP client leaves identity to the service it addresses, so there is no seeded
   * persona to act as and no switch to offer (rule P-8).
   */
  noCapability:
    'This build binds a service that carries no demonstration identity, so the session cannot act as another persona.',

  /** Said while the roster of personas is being read, so the wait is explained rather than blank. */
  reading: 'Reading the seeded personas…',

  /**
   * Why the control cannot act when the service reports no other persona: either the adapter carries
   * no roster read or it answered with fewer than two personas, and a list of one is not a choice.
   */
  rosterUnavailable: 'No other persona is offered by the bound service, so there is nothing to switch to.',

  /** Said while a switch is in flight, so the reader knows the change is being recorded. */
  switching: 'Switching the persona the demonstration acts as…',

  /**
   * The fallback for a refusal that arrived without a message of its own, so the alert region has a
   * sentence rather than an empty line. The session still acts as the persona it held.
   */
  switchFailed: 'The persona was not switched, so the session still acts as the one it held.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * Class lists, built from role tokens only — rule B-3, specification §4
 * ------------------------------------------------------------------------------------------- */

/**
 * The group: one column, so the label, the control and the two sentences beneath it are separated by
 * the 4 px grid rather than by margins, and `max-w-full` with `min-w-0` so a long persona name wraps
 * inside the top bar instead of widening it.
 */
const GROUP_CLASSES = 'flex min-w-0 max-w-full flex-col gap-1';

/** The visible label, one step below the control's own text in the type scale. */
const LABEL_CLASSES = 'min-w-0 text-12 font-medium text-text-primary';

/**
 * The select itself.
 *
 * The structure is the bordered-control vocabulary of `src/components/tooltip.tsx` — the 24x24 px
 * minimum target, the control boundary, the raised second surface, the 2 px focus ring on
 * `focus-visible`, the 150 ms colour transition only under `motion-safe` — written out here rather
 * than composed from that module's exported lists, because a `<select>` is a replaced element whose
 * native popup the flex structure of a button would disturb. No raw palette value, no arbitrary value
 * and no opacity appears: dimming a label is exactly how contrast falls below the ratio rule B-3
 * requires.
 */
const SELECT_CLASSES = [
  'min-h-6 min-w-6 max-w-full rounded-control border border-control-boundary bg-surface-2',
  'px-2 py-1 text-13 text-text-primary',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/**
 * The explaining sentences beneath the control, in the secondary text role: long words break rather
 * than overflowing the top bar, and the box never forces the bar wider than the viewport.
 */
const HINT_CLASSES = 'min-w-0 max-w-full text-12 break-words text-text-secondary';

/** The refusal, in the primary text role so it sits above the standing note it appears beside. */
const ALERT_CLASSES = 'min-w-0 max-w-full text-12 break-words text-text-primary';

/* ---------------------------------------------------------------------------------------------
 * The roster read — rule P-2, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The cache key of the persona roster.
 *
 * Keyed the way `src/app/query-cache.ts` keys every read — the member's own name first — so the
 * convention holds even though this member sits on the demonstration capability rather than on the
 * port. The roster is static for a session, and a switch invalidates the cache whole (see
 * {@link RoleSwitcher}), so the list is re-read exactly when something could have changed it.
 */
const ROSTER_QUERY_KEY = ['listPersonas'] as const;

/**
 * Reads the personas the demonstration can act as, or none when the bound service offers no roster.
 *
 * The capability member is optional, so it is checked before it is called rather than asserted: a
 * service without it answers an empty list, and the component then falls back to the acting persona
 * and says why it cannot switch (rule P-8). A refusal is not caught here — it reaches the query cache
 * as the call's error and the component renders the `Problem`'s own message.
 *
 * @param demonstration - The bound capability, or `null` when the adapter carries none.
 * @returns The personas, in the adapter's order, or an empty list when there is no roster to read.
 */
async function readPersonas(
  demonstration: DemonstrationControls | null,
): Promise<readonly ActiveUser[]> {
  if (demonstration === null || demonstration.listPersonas === undefined) {
    return [];
  }

  const result = await demonstration.listPersonas();

  return result.data;
}

/* ---------------------------------------------------------------------------------------------
 * The control — AAP 0.10, AAP 0.12.4, rules P-3 and P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders the demonstration persona switcher for the shell's top bar.
 *
 * Takes no props, because there is nothing a caller could supply that this control is allowed to
 * take: the personas come from the service, the persona in force comes from the shell's own store,
 * and the fixed wording is owned here (rule P-2).
 *
 * @returns The control group: the fixed label, the select when the service offers a choice, the
 *   sentence explaining any state in which it cannot act, and the non-authorisation note.
 */
export function RoleSwitcher(): ReactElement {
  const demonstration = useDemonstration();
  const activeUser = useActiveUser();
  const activeRole = useActiveRole();
  const setActiveRole = useShellStore((state) => state.setActiveRole);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const selectId = useId();
  const labelId = useId();
  const actingId = useId();
  const noteId = useId();
  const reasonId = useId();

  /** The persona a switch is being recorded for, or `null` while the control is at rest. */
  const [pendingId, setPendingId] = useState<string | null>(null);

  /** The refusal of the last switch, or `null`. Cleared when the reader tries again. */
  const [failure, setFailure] = useState<string | null>(null);

  const hasRosterRead = demonstration !== null && demonstration.listPersonas !== undefined;

  const roster = useQuery<readonly ActiveUser[]>({
    queryKey: ROSTER_QUERY_KEY,
    queryFn: () => readPersonas(demonstration),
    enabled: hasRosterRead,
    /*
     * A refusal is a decision rather than a glitch — an adapter that carries no roster is expected,
     * and one that refuses the read has said why — so a retry would only delay the honest sentence.
     */
    retry: false,
  });

  /*
   * The options: the roster the service reported, or the acting persona alone while the roster is
   * still being read and for an adapter that offers none. A list of one is not a choice, which is
   * what makes the control unable to act rather than silently inert.
   */
  const options: readonly ActiveUser[] =
    roster.data ?? (activeUser === null ? [] : [activeUser]);

  /*
   * The persona in force. The shell's role wins, because a switch stores it and a reset clears it;
   * the start-up persona answers before a switch, and the first option answers for a session whose
   * role names a persona the roster does not list.
   */
  const personaInForce: ActiveUser | undefined =
    options.find((persona) => persona.role === activeRole) ?? activeUser ?? options[0];

  const selectedId = personaInForce?.id ?? '';
  const isSwitching = pendingId !== null;
  const isReading = hasRosterRead && roster.isPending;
  const canSwitch = options.length > 1 && !isSwitching && !isReading;
  const reason = reasonFor({ isReading, isSwitching, optionCount: options.length });
  const alert = failure ?? messageOf(roster.error);

  const switchTo = async (nextId: string): Promise<void> => {
    if (demonstration === null) {
      return;
    }

    setFailure(null);
    setPendingId(nextId);

    try {
      const result = await demonstration.switchRole(nextId);
      const persona = result.data;

      /*
       * The persona the adapter now enforces is the one the shell displays and the one the router
       * opens for: the store first, then the cache (every read is narrowed by the acting persona),
       * then the route AAP 0.12.4 fixes for the role.
       */
      setActiveRole(persona.role);
      void queryClient.invalidateQueries();
      navigate(entryRouteFor(persona.role));
    } catch (error: unknown) {
      setFailure(messageOf(error) ?? ROLE_SWITCHER_TEXT.switchFailed);
    } finally {
      setPendingId(null);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextId = event.target.value;

    /*
     * A change is acted on only when the control can act, and only when it names another persona: a
     * switch is already being recorded for the persona the reader chose, so a second one would put two
     * identities in flight and leave the session decided by whichever the adapter answered last.
     * Selecting the persona the session already acts as changes nothing, so it is not a switch.
     */
    if (!canSwitch || nextId === selectedId) {
      return;
    }

    void switchTo(nextId);
  };

  /*
   * No demonstration capability: there is no seeded persona to act as, so the switcher is rendered
   * as the one control it can be — disabled, with the sentence that says why (rule P-8), and with
   * rule P-3's note still visible because the absence of the control does not change what a reader
   * needs to know about the permission checks a demonstration would rely on.
   */
  if (demonstration === null) {
    return (
      <div className={GROUP_CLASSES}>
        <span className={LABEL_CLASSES}>{ROLE_SWITCHER_LABEL}</span>
        <ActionButton
          variant="secondary"
          disabled
          disabledReason={ROLE_SWITCHER_TEXT.noCapability}
        >
          {ROLE_SWITCHER_TEXT.unavailableAction}
        </ActionButton>
        <p className={HINT_CLASSES}>{ROLE_SWITCHER_NOTE}</p>
      </div>
    );
  }

  /*
   * The description carries the standing note always, and the reason the control cannot act whenever
   * there is one, so a reader meeting the control by keyboard hears both without hovering.
   */
  const describedBy = reason === null ? noteId : `${reasonId} ${noteId}`;

  return (
    <div className={GROUP_CLASSES}>
      <label htmlFor={selectId} id={labelId} className={LABEL_CLASSES}>
        {ROLE_SWITCHER_LABEL}
      </label>
      {personaInForce === undefined ? null : (
        /*
         * The persona in force, named for assistive technology only: the select's own options carry
         * the names for a sighted reader, and the accessible name of the control states who the
         * session acts as and with which role, which is what a reader needs before changing it.
         */
        <span id={actingId} className="sr-only">
          {`${personaInForce.name} · ${personaInForce.role}`}
        </span>
      )}
      <select
        id={selectId}
        className={SELECT_CLASSES}
        /*
         * The persona the reader chose is what the control shows while that choice is being recorded,
         * so a switch in flight never looks like a selection that snapped back. Once the adapter has
         * answered, `selectedId` carries the persona it now enforces and the two agree.
         */
        value={pendingId ?? selectedId}
        aria-labelledby={personaInForce === undefined ? labelId : `${labelId} ${actingId}`}
        aria-describedby={describedBy}
        aria-disabled={canSwitch ? undefined : true}
        aria-busy={isSwitching || isReading}
        onChange={handleChange}
      >
        {options.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {`${persona.name} · ${persona.role}`}
          </option>
        ))}
      </select>
      {reason === null ? null : (
        <p
          id={reasonId}
          className={HINT_CLASSES}
          role={reason.isProgress ? 'status' : undefined}
          aria-live={reason.isProgress ? 'polite' : undefined}
        >
          {reason.text}
        </p>
      )}
      {alert === null ? null : (
        <p role="alert" className={ALERT_CLASSES}>
          {alert}
        </p>
      )}
      <p id={noteId} className={HINT_CLASSES}>
        {ROLE_SWITCHER_NOTE}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Why the control cannot act, and whether the sentence is a status — rule P-8
 * ------------------------------------------------------------------------------------------- */

/** What the control is doing, or why it cannot be operated. */
interface ControlReason {
  /** The sentence rendered beneath the control and referenced by its description. */
  readonly text: string;

  /**
   * Whether the sentence announces progress rather than a standing explanation. A progress sentence
   * is a polite live region, so a reader hears the wait begin; a standing explanation is not, because
   * announcing an unchanging fact on every render would be noise.
   */
  readonly isProgress: boolean;
}

/** Props of {@link reasonFor}: the three facts that decide whether the control can act. */
interface ReasonInputs {
  /** Whether the roster of personas is still being read. */
  readonly isReading: boolean;

  /** Whether a switch is in flight. */
  readonly isSwitching: boolean;

  /** How many personas the service offers. */
  readonly optionCount: number;
}

/**
 * Chooses the sentence that explains the control's state, or `null` when it can act.
 *
 * The order is the precedence the control operates under: a roster being read comes first because
 * there is nothing to choose from yet, a switch in flight second because it is the reader's own
 * action that is being recorded, and a roster of fewer than two personas last because that is the
 * standing condition of an adapter which offers no choice at all. Written as one function of the
 * state so a new state has to be named here rather than falling into whichever branch came last.
 *
 * @param inputs - The roster's liveness, the switch's liveness and the number of options.
 * @returns The sentence and whether it is progress, or `null` when the control can act.
 */
function reasonFor(inputs: ReasonInputs): ControlReason | null {
  if (inputs.isReading) {
    return { text: ROLE_SWITCHER_TEXT.reading, isProgress: true };
  }

  if (inputs.isSwitching) {
    return { text: ROLE_SWITCHER_TEXT.switching, isProgress: true };
  }

  if (inputs.optionCount < 2) {
    return { text: ROLE_SWITCHER_TEXT.rosterUnavailable, isProgress: false };
  }

  return null;
}

/**
 * The message a refusal carries, or `null` when the thrown value carries none.
 *
 * The adapter throws a `Problem` rather than an `Error`, so the value is narrowed structurally
 * instead of by class: a `Problem` always carries a non-empty `message`, and a value that does not
 * yields `null` so the alert region falls back to its own sentence rather than printing the word
 * `undefined`. No suppression directive appears in this file (success criterion 5).
 *
 * @param error - Whatever the call threw.
 * @returns The refusal's own message, or `null`.
 */
function messageOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const candidate = error as { message?: unknown };

  return typeof candidate.message === 'string' && candidate.message !== '' ? candidate.message : null;
}
