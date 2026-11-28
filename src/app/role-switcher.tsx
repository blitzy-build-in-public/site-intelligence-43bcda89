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
 * that would change nothing (rule P-8). The acting persona is read from `useActiveUser()`, the identity
 * the boundary publishes from the query cache, and the persona in force from `useActiveRole()`, so a
 * demonstration reset that returns the adapter to its seeded persona returns this control to it too,
 * without a second source of truth.
 *
 * WHAT A SWITCH DOES. On a successful `switchRole`, four things happen in order: the shell stores the
 * returned persona's role through `setActiveRole`, so the density and every role-scoped label follow
 * the persona the adapter now enforces; the persona the switch itself returned is written into
 * {@link ACTIVE_USER_QUERY_KEY}, the cache entry `useActiveUser()` publishes, so no consumer keeps
 * naming the persona that stood before the switch while the identity is being re-read; the query cache
 * is invalidated whole, because every read the screens hold — the queue, the overview, the inbox, the
 * ledger — was narrowed by the persona that just changed, and the identity is re-read from the adapter
 * with them; and the router is sent to `entryRouteFor(role)`, the route AAP 0.12.4 fixes per role,
 * which is the same resolution `/` performs for a first visit. Changing the selection is the
 * confirmation; there is no separate submit.
 *
 * WHAT A REFUSAL DOES. Nothing but explain itself. The adapter refuses a switch it cannot complete
 * with a `Problem` that carries its own message, and this control renders that message verbatim in a
 * `role="alert"` region, keeps the selection the session held, and leaves the shell store and the
 * router untouched — so a refused switch never reads as a switch that happened (AAP 0.2.2).
 *
 * ACCESSIBILITY. The control is `SelectField` from `src/components`, the primitive that owns the
 * `<select>` element (AAP 0.5.2); this shell control composes it and renders no native element of its
 * own. Because the element the primitive renders is the platform's own control, the browser still
 * gives it keyboard operation, type-ahead and a screen-reader interaction model. It is bound to a
 * visible `<label>` carrying the fixed wording, its accessible name adds the persona in force and
 * that persona's role, and its description carries the non-authorisation note plus, when it cannot
 * act, the sentence saying why. The target is at least 24x24 px and the focus ring is the theme's
 * 2 px `focus-ring` role, drawn on `focus-visible` so a pointer click leaves no ring (rule B-3). A
 * control that cannot act carries `aria-disabled` rather than `disabled`, the choice
 * `src/components/tooltip.tsx` documents: `disabled` would drop it out of the tab order, and the
 * explanation rule P-8 requires would then be unreachable by keyboard. No meaning is carried by
 * colour: the acting persona, its role and every explanation are text.
 *
 * BELOW THE `md` BREAKPOINT THE LABEL AND THE SELECT FOLD AWAY. The top bar is the shell's banner
 * on every route, so every line of height it spends is spent on every screen: at a 375 px window
 * this control's labelled select on top of the six freshness pills left the navigation and the
 * route's own heading below the fold of a phone viewport. Below `md` — 48rem — the fixed label and
 * the select therefore sit behind one disclosure whose trigger belongs to this component, because
 * the elements it reveals are this component's (AAP §0.5.2). The trigger's accessible name is
 * {@link ROLE_SWITCHER_LABEL}, so a reader still meets rule P-3's wording before opening it. Only
 * the label and the select fold: the non-authorisation note stays on screen at every width, which
 * is what rule P-3 asks of the interface, and so does every sentence explaining a state in which
 * the control cannot act, so a refusal is never locked behind a closed disclosure. From `md` up
 * nothing changes — label, select and note in the same order, with no trigger and no extra element.
 *
 * WHAT IT DOES NOT DO. It fetches nothing of its own (rule B-1): the persona records arrive through
 * the bound adapter, which holds them in memory. It reads no configuration and carries no credential
 * (rule B-2). It writes no figure, amount, date or identifier (rule P-6) — every string it renders is
 * either the fixed wording above or a value the service returned. It invents no simulation label
 * (rule P-1): the persistent `Simulated data` badge belongs to the shell, and the one label this group
 * states is the §5.3 string `Simulated control`, read from `SIM_LABELS` — the tuple that owns the
 * seven labels — because AAP 0.10 names the browser-side permission checks behind this switcher among
 * that label's carriers, and the note beside it still states what rule P-3 requires. It claims nothing
 * about the deployment: it says the session acts as a persona for the length of a demonstration and no
 * more (rule P-4). It uses role tokens only, with no raw palette value and no shadow, so both themes
 * keep the contrast the specification measured.
 *
 * No test hook. Nothing here reads a query parameter, a global or a flag: this switcher is a product
 * feature, and a browser test drives it exactly as a reader does.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';

import { SelectField } from '../components/select-field';
import { StatusIndicator } from '../components/status-indicator';
import {
  ActionButton,
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
} from '../components/tooltip';
import type { DemonstrationControls } from '../services/demonstration-controls';
import {
  ACTIVE_USER_QUERY_KEY,
  useActiveUser,
  useDemonstration,
} from '../services/service-provider';
import type { ActiveUser } from '../types/entities';
import { SIM_LABELS } from '../types/primitives';
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
 * The `Simulated control` tag the control group carries, selected from the tuple that owns the seven
 * §5.3 strings rather than spelled again in this file: `SimLabel` has exactly one owner in
 * `src/types/primitives.ts` (rule P-1), and a second copy of the text here could drift from it.
 *
 * AAP 0.10 names the browser-side permission checks behind this switcher among that label's
 * carriers, so the control states the label on itself rather than leaving it to the popover that
 * offers the demonstration. The member is taken by its position in the tuple, whose order is the
 * specification's own, so no string literal of the label appears in this file. A reordering of
 * `SIM_LABELS` therefore has to be mirrored here — the tuple's fifth member is the control label.
 */
const SIMULATED_CONTROL_LABEL = SIM_LABELS[4];

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
 * native popup the flex structure of a button would disturb.
 *
 * The pointer is answered the way the bar's other pickers answer it: `hover:` lifts the boundary to
 * the accent role, the same state `src/app/scope-filters.tsx` and the simulated-data badge paint, and
 * `active:` steps the fill in to the first surface and the label to the primary text role, so a press
 * reads as one step below the hover that preceded it. A control that cannot act answers neither
 * state, and this select says it cannot act with `aria-disabled` rather than `disabled` (see
 * {@link RoleSwitcher}), so `aria-disabled:hover:` re-asserts the resting boundary over the hover and
 * `aria-disabled:active:` re-asserts the resting fill and label over the press. Both variants are
 * stacked on purpose: each outranks its plain `hover:`/`active:` counterpart on specificity, exactly
 * as the `aria-disabled:hover:` and `aria-disabled:active:` pair in `src/components/tooltip.tsx`
 * does, so neither a hover nor a press can paint a state the control will not act on.
 * `motion-safe:` gates the transition, so a reduced-motion session gets the states with no animation.
 *
 * No raw palette value, no arbitrary value and no opacity appears: dimming a label is exactly how
 * contrast falls below the ratio rule B-3 requires.
 */
const SELECT_CLASSES = [
  'min-h-6 min-w-6 max-w-full rounded-control border border-control-boundary bg-surface-2',
  'px-2 py-1 text-13 text-text-primary',
  'hover:border-accent active:bg-surface-1 active:text-text-primary',
  'aria-disabled:hover:border-control-boundary',
  'aria-disabled:active:bg-surface-2 aria-disabled:active:text-text-primary',
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

/**
 * The narrow presentation's disclosure trigger, built from the shared control surface.
 *
 * The structure and the appearance come from `src/components/tooltip.tsx` rather than being written
 * out again here, so the trigger keeps the 24x24 px minimum target, the 2 px `focus-ring` focus ring
 * on `focus-visible`, the control radius and the role-token colours every other control has (rule
 * B-3), and a token change there reaches this control too. No raw palette value, no shadow and no
 * arbitrary value is added beside them (AAP §0.5.3, rule P-8).
 */
const TRIGGER_CLASSES = [CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES].join(' ');

/**
 * The region holding the label and the select while it is closed.
 *
 * The region stays in the document while it is closed, because the trigger's `aria-controls` names it
 * and a relationship pointing at an element that does not exist is not a relationship; it holds
 * neither the label nor the select, which is where the height the disclosure saves comes from. It is
 * closed with `hidden`, so a closed region takes neither width nor height in the top bar's row.
 */
const CLOSED_REGION_CLASSES = 'hidden';

/* ---------------------------------------------------------------------------------------------
 * The narrow viewport, read synchronously and kept current
 * ------------------------------------------------------------------------------------------- */

/**
 * The query that reports a window narrow enough for the labelled select to cost the shell more height
 * than it earns: everything below Tailwind's `md` breakpoint, which is `48rem`.
 *
 * Stated in `rem` and never in `px`, for the reason `src/components/evidence-drawer.tsx` states on its
 * own docked query — a breakpoint's utilities resolve against the root font size, so a query fixed in
 * pixels would keep reporting one presentation after the styling had changed for a reader whose
 * default font size is not 16 px. The upper bound is the last thousandth of a rem below `48rem`, so
 * the narrow and the wide presentation can never both match.
 */
const NARROW_QUERY = '(max-width: 47.999rem)';

/**
 * Whether the window is currently narrow, read synchronously.
 *
 * Read during the first render rather than after it, so the bar is laid out in the presentation the
 * reader's viewport calls for on the frame it first appears and never flips once an effect has run.
 * An environment with no `matchMedia` at all — the jsdom test environment, which implements no media
 * query, and any pass without a DOM — answers `false` and therefore gets the wide presentation, which
 * is the markup every suite that does not stub a viewport was written against.
 */
function matchesNarrowQuery(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(NARROW_QUERY).matches;
}

/**
 * The presentation the switcher is in, kept current while it stays mounted.
 *
 * The state starts from a synchronous read of the same query, and the effect subscribes to that
 * query's `change` event, so a window resized across the breakpoint folds or unfolds the label and the
 * select without a remount. The effect also re-reads the query once on mount, because a subscription
 * only reports changes that happen after it exists. The listener is removed when the switcher
 * unmounts, so nothing stays registered behind it.
 *
 * This is the pattern `useDockedPresentation` in `src/components/evidence-drawer.tsx` uses. It is
 * carried here as a second small helper rather than as a shared module because AAP §0.13 fixes the
 * file tree and names no shared hook, and because the two queries answer different questions about
 * different surfaces.
 */
function useNarrowPresentation(): boolean {
  const [isNarrow, setIsNarrow] = useState(matchesNarrowQuery);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia(NARROW_QUERY);

    setIsNarrow(query.matches);

    function handleChange(event: MediaQueryListEvent): void {
      setIsNarrow(event.matches);
    }

    query.addEventListener('change', handleChange);

    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, []);

  return isNarrow;
}

/* ---------------------------------------------------------------------------------------------
 * The roster read — rule P-2, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The cache key of the persona roster.
 *
 * Keyed the way every read and every write's invalidation are keyed — the member's own name first, in
 * the `[method, ...args]` convention of AAP 0.6.2 that the client created in `src/app/providers.tsx`
 * fixes for the whole cache — and then the reader's own qualifier, so the convention holds even
 * though this member sits on the demonstration capability rather than on the port. The qualifier is
 * not decoration: a key names its reader as well as its method, because the payload shape belongs to
 * the reader that caches it. Two callers of `listPersonas` under the bare member name could each
 * hand the other a value of the wrong type, and a `Result` envelope where this control expects an
 * array unmounts the whole shell rather than degrading one panel. That is why the governance screen
 * (`src/features/scr-07-sovereignty-and-policies/sovereignty-screen.tsx`) reads the same member under
 * its own `'governance'` qualifier, and why this key names `'shell'`.
 *
 * The roster is static for a session and lists the personas themselves rather than a record any
 * permission narrows, so a role switch leaves this entry in place while it resets every read the
 * outgoing persona decided (see {@link RoleSwitcher}). The reset names the member rather than one
 * qualified key, so it reaches both qualified entries: TanStack Query matches by key prefix, and the
 * member name alone names every entry of that read while this one is spared by the predicate.
 */
const ROSTER_QUERY_KEY = ['listPersonas', 'shell'] as const;

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
 *   sentence explaining any state in which it cannot act, and the non-authorisation note — with the
 *   label and the select behind one disclosure below the `md` breakpoint.
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

  /** The id of the region the disclosure reveals, so the trigger's `aria-controls` resolves to it. */
  const choiceId = useId();

  /** Whether the window is narrow enough for the label and the select to fold away. */
  const isNarrow = useNarrowPresentation();

  /** Whether the narrow presentation's disclosure is open; it starts closed, so the bar is short. */
  const [isRevealed, setIsRevealed] = useState(false);

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
       * opens for: the store first, then the identity entry, then the cache (every read is narrowed by
       * the acting persona), then the route AAP 0.12.4 fixes for the role.
       *
       * The cache is reset rather than merely invalidated, because a cached entry answers from itself
       * instead of from the adapter that authorised it: every read still in it was made under the
       * persona the adapter has just replaced, so keeping it would paint that persona's records on the
       * screen this one lands on until the refetch answered — a plant scope, a redacted body or a
       * trail this persona may not read (rules P-3, P-8). The roster is the one read the reset leaves
       * alone: it names the personas rather than a record a permission narrows, and clearing it would
       * disable this control for the length of its own re-read.
       *
       * The identity entry is written after the reset and before the refetch it starts, and neither
       * the reset nor the refetch is relied on for it. The adapter answers a call after its own
       * latency band, so between the switch resolving and the refetch landing every consumer of
       * `useActiveUser()` would still name the persona that stood before — and "Assign to me" writes
       * with exactly that value. What is written here is the adapter's own answer to this call,
       * envelope included, so the entry stays the member's answer while the refetch confirms it: the
       * key is the one `getActiveUser()` fills, and one key cannot hold two shapes.
       */
      setActiveRole(persona.role);
      void queryClient.resetQueries({
        predicate: (query) => query.queryKey[0] !== ROSTER_QUERY_KEY[0],
      });
      queryClient.setQueryData(ACTIVE_USER_QUERY_KEY, result);
      navigate(entryRouteFor(persona.role));
    } catch (error: unknown) {
      setFailure(messageOf(error) ?? ROLE_SWITCHER_TEXT.switchFailed);
    } finally {
      setPendingId(null);
    }
  };

  const handleChange = (nextId: string): void => {
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
        {/* The absence of the capability does not change what the control stands in for, so the
            permission checks a demonstration would rely on keep their §5.3 label here too
            (AAP 0.10, rule P-1). */}
        <StatusIndicator meaning="simulated" label={SIMULATED_CONTROL_LABEL} />
      </div>
    );
  }

  /*
   * The description carries the standing note always, and the reason the control cannot act whenever
   * there is one, so a reader meeting the control by keyboard hears both without hovering.
   */
  const describedBy = reason === null ? noteId : `${reasonId} ${noteId}`;

  /*
   * The label and the select, as one fragment: the wide presentation renders it directly in the group
   * and the narrow presentation renders the same fragment inside the region its trigger reveals, so the
   * two presentations cannot drift apart.
   */
  const choice = (
    <>
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
      <SelectField
        id={selectId}
        className={SELECT_CLASSES}
        /*
         * The persona the reader chose is what the control shows while that choice is being recorded,
         * so a switch in flight never looks like a selection that snapped back. Once the adapter has
         * answered, `selectedId` carries the persona it now enforces and the two agree.
         */
        value={pendingId ?? selectedId}
        options={options.map((persona) => ({
          value: persona.id,
          label: `${persona.name} · ${persona.role}`,
        }))}
        aria-labelledby={personaInForce === undefined ? labelId : `${labelId} ${actingId}`}
        aria-describedby={describedBy}
        aria-disabled={canSwitch ? undefined : true}
        aria-busy={isSwitching || isReading}
        onChange={handleChange}
      />
    </>
  );

  return (
    <div className={GROUP_CLASSES}>
      {isNarrow ? (
        <>
          <button
            type="button"
            aria-expanded={isRevealed}
            aria-controls={choiceId}
            className={TRIGGER_CLASSES}
            onClick={() => {
              setIsRevealed(!isRevealed);
            }}
          >
            {ROLE_SWITCHER_LABEL}
          </button>
          {/* The revealed region reuses the group's own column, so an opened disclosure stacks the
              label, the select and their explanation exactly as the wide presentation does. */}
          <div id={choiceId} className={isRevealed ? GROUP_CLASSES : CLOSED_REGION_CLASSES}>
            {isRevealed ? choice : null}
          </div>
        </>
      ) : (
        choice
      )}
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
      {/* AAP 0.10 names the browser-side permission checks behind this switcher a `Simulated control`
          carrier, so the group carries that §5.3 label beside rule P-3's note (rule P-1). It is a
          label rather than a control: `StatusIndicator` adds no focus stop, and the select's own
          accessible name and description stay the ones bound above. */}
      <StatusIndicator meaning="simulated" label={SIMULATED_CONTROL_LABEL} />
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
