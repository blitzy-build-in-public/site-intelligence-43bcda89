/**
 * The one simulation popover: the seven screen states, the two triggers that are not screen states,
 * and `Reset demo data`.
 *
 * Fixed by AAP 0.12.1 ("The only place the seven states, the tampered audit event, the empty queue and
 * `Reset demo data` can be triggered"), AAP 0.10 ("it lives in one popover, never in a production
 * path: no query parameter and no global changes behaviour", labelled `Simulated control`) and AAP
 * 0.12.4, at the path AAP 0.13.1 gives it. Functional requirement F10 — the seven states on every
 * screen, triggerable here and nowhere else — is this file, and T-17 drives it.
 *
 * WHY THE STATE LIVES IN TWO PLACES AND ONLY TWO. The popover's open flag is the shell store's
 * `simulationOpen`, so the persistent `Simulated data` badge can open it from any route
 * (`src/app/providers.tsx` owns that field and this file neither introduces a second flag nor reads a
 * query parameter). Everything else below is either a local mirror of what this popover sent, the
 * request currently in flight, or the sentence the reset announces once the panel it closed is gone; no
 * screen branches on a trigger, because a trigger changes what the adapter answers rather than which
 * branch a component takes (AAP 0.12.1).
 *
 * WHY THE TRIGGERS GO THROUGH THE PORT. Every change is a `setSimulation` or `resetDemo` call on the
 * bound `SiteIntelligenceService` (rule P-2). This module imports no seed module, no mock adapter and
 * no HTTP client, so a trigger reaches the records the same way a screen's read does, and binding the
 * other adapter in `src/services/create-service.ts` leaves this control asking the same question.
 *
 * WHY THE MUTUAL EXCLUSION IS HERE. The adapter keeps a set of triggers, so turning one screen state on
 * does not lift another; the seven states are mutually exclusive as a screen's condition, so this
 * popover turns the previous state off before it turns the next one on (AAP 0.12.1). The mirror is
 * written only after the port resolves, so a refused call leaves the control showing what the adapter
 * still holds rather than what the reader clicked (rule P-8: nothing here pretends a change took
 * effect).
 *
 * WHY A TOGGLE IS NOT AN `ActionButton`. `ActionButton` is the primitive for an action that can be
 * disabled, and it is used here for every action — close, reset, retry. A toggle additionally has to
 * carry `aria-pressed`, which `ActionButton`'s props do not express, so each toggle composes `Button`
 * from `src/components` — the primitive that owns a plain `<button>` (AAP 0.5.2) — and hands it the
 * exported `CONTROL_STRUCTURE_CLASSES` (the 24x24 px minimum target, the 2 px focus ring and the
 * control radius) as its class list. It is one button in every state, never wrapped in a hint element
 * that comes and goes: a control replaced while it is disabled loses focus to the body, which would
 * throw a keyboard reader out of the panel on every activation. Its explanation is attached as a
 * description instead, pointing at the one busy sentence the panel paints (rule P-8). The pressed state
 * is never carried by colour alone: the control also carries `aria-pressed` and a `StatusIndicator`
 * whose label reads in words (rule B-3).
 *
 * WHAT IS NOT HERE. No role switching (that is `src/app/role-switcher.tsx`), no theme or density control
 * (that is `src/theme/`), no diagnostic or trace panel, and no state beyond the mirror of what this
 * popover sent and the one sentence it announces. The one edit the tamper trigger makes to a recorded
 * audit result belongs to the adapter, so no identifier, sequence number or result value is typed here
 * (rule P-6).
 *
 * Rules served:
 * - P-1 / P-4: the heading carries the exact `Simulated control` label from `SIM_LABELS`, and nothing
 *   here claims that the demonstration establishes a configuration, prevents a copy or resists an edit.
 * - P-2: every change goes through `useService()`; no record import of any kind.
 * - P-6: no figure, amount, identifier, date or sequence number is written here: a refused change is
 *   reported with the service's own message, and a completed reset with a sentence that states no count
 *   of anything.
 * - P-7: product vocabulary only — no company, customer or model name of the real world.
 * - P-8: every control acts, and a control that cannot act is disabled with the sentence that says why.
 * - B-1 / B-2: no request, no environment read, no credential, no configuration value.
 * - B-3: a dialog with a focus trap, `Escape`, a visible focus ring, no colour-only state, role tokens
 *   for every colour so both themes keep their measured contrast, and a polite status region that
 *   reports a completed reset once the panel it closed has gone (WCAG 2.2 SC 4.1.3).
 * - No test hook: nothing here reads a global, a query parameter or a flag to change behaviour.
 */
import { X } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';

import { Button } from '../components/button';
import { DialogHeading } from '../components/dialog-heading';
import { StatusIndicator } from '../components/status-indicator';
import { ActionButton, CONTROL_STRUCTURE_CLASSES } from '../components/tooltip';
import { ACTIVE_USER_QUERY_KEY, useService } from '../services/service-provider';
import { SIM_LABELS } from '../types/primitives';
import type { SimLabel } from '../types/primitives';
import type { Problem, ScreenState, SimulationFlag } from '../types/service';
import { useShellStore } from './providers';

/* ---------------------------------------------------------------------------------------------
 * The fixed label and the copy — AAP 0.10, rule P-1
 * ------------------------------------------------------------------------------------------- */

/**
 * The `Simulated control` label of specification §5.3, selected from the tuple that owns the seven
 * strings rather than spelled again here: `SIM_LABELS` has exactly one owner, and a reordering of it
 * has to be a deliberate change in `src/types/primitives.ts` rather than a silent drift in a copy of
 * the text (rule P-1). The fifth member is the control label.
 */
const SIMULATED_CONTROL_LABEL: SimLabel = SIM_LABELS[4];

/**
 * Every sentence this popover states, held here so the wording has one owner: the component renders
 * these strings and a suite names them through this object instead of retyping them, the way
 * `STATE_BOUNDARY_TEXT` and `SERVICE_PROVIDER_TEXT` own theirs.
 *
 * None of these is a specification string. The fixed label above is the one §5.3 string this file
 * carries, and it arrives from the vocabulary rather than from here. The copy states what each control
 * changes and claims nothing further (rule P-4), and it types no figure, identifier or date (rule P-6).
 */
export const SIMULATION_CONTROLS_TEXT = {
  /** What the popover is, in one sentence, under its label. */
  intro:
    'Each control changes what the demonstration answers, so every screen renders the state until it is lifted.',

  /** The accessible name of the group holding the seven screen states. */
  stateLegend: 'Screen state',

  /** The accessible name of the group holding the two triggers that are not screen states. */
  flagLegend: 'Other triggers',

  /** The status wording of a control whose trigger is in effect. */
  on: 'In effect',

  /** The status wording of a control whose trigger is lifted. */
  off: 'Not in effect',

  /**
   * What sits between a toggle's label and its status in the control's accessible name.
   *
   * The two are separate elements side by side, and a name computed from adjacent inline elements runs
   * them together — "LoadingNot in effect" rather than the phrase a reader hears. This separator is
   * hidden visually and present in the accessibility tree, so the name reads "Loading, Not in effect"
   * while the panel shows the compact row it was designed with.
   */
  statusSeparator: ', ',

  /** The accessible name of the control that closes the popover. */
  closeLabel: 'Close',

  /** The accessible name of the control that restores the seeded records. */
  resetLabel: 'Reset demo data',

  /** What the reset does, immediately under its control. */
  resetDetail: 'Restores the seeded records, lifts every trigger and closes this panel.',

  /**
   * What a completed reset reports to a reader who cannot see the panel close.
   *
   * The action closes the panel it was taken from, so the control that was pressed, the confirmation
   * the reader expects and the record they were reading all leave the screen at once. This sentence is
   * what a screen reader hears in their place (rule B-3, WCAG 2.2 SC 4.1.3). It states only what the
   * reset does — no figure, identifier or date is stated anywhere in this panel (rule P-6) — and
   * claims nothing the demonstration does not perform (rule P-4).
   */
  resetCompleted: 'The demonstration data is restored and every trigger is lifted.',

  /** The accessible name of the control that repeats a change whose call failed. */
  retryLabel: 'Try again',

  /** The reason every control carries while another change is still in flight (rule P-8). */
  busyReason: 'A demonstration change is still in progress.',

  /** The hint that names the one input the keyboard reader needs. */
  escapeHint: 'Escape closes this panel.',

  /**
   * What a failed change says when the rejection did not arrive in the service's own shape. It names
   * no cause, because none is known: a message invented here would be a second account of a failure
   * this module never saw (rules P-6, P-4).
   */
  unreportedFailure: 'The demonstration could not make that change.',
} as const;

/** One control's visible label and the sentence that says what it changes. */
interface TriggerCopy {
  /** The label the control shows, and the start of its accessible name. */
  readonly label: string;

  /** What the trigger changes, in the plain words the interface uses. */
  readonly detail: string;
}

/**
 * The seven screen states, each with the label its control shows.
 *
 * Typed as an exhaustive record over `ScreenState`, so a state added to that union fails to compile
 * until it has a control here — which is the reminder this file exists to give, because a state the
 * popover cannot trigger could not be demonstrated (AAP 0.5.2). The labels are drawn from the state
 * definitions in `src/types/service.ts`, name the state they produce, and repeat no figure of any
 * kind (rule P-6). They are words rather than the union's own kebab-case members, because a control's
 * label is interface copy and the member is a value.
 */
const SCREEN_STATE_LABELS: Record<ScreenState, string> = {
  loading: 'Loading',
  empty: 'Empty',
  stale: 'Stale source',
  partial: 'Partial data',
  offline: 'Offline',
  forbidden: 'Forbidden',
  conflict: 'Conflicting update',
};

/**
 * The two triggers that are not screen states, derived from `SimulationFlag` rather than declared
 * again: whatever that union adds beyond `ScreenState` is what this group must offer.
 */
type ExtraFlag = Exclude<SimulationFlag, ScreenState>;

/**
 * The two extra triggers, with the words their controls show.
 *
 * Exhaustive over `ExtraFlag` for the same reason as the record above: a trigger added to
 * `SimulationFlag` fails to compile here until it has a control. The tamper control asks the adapter
 * for the trigger and nothing else — the edit it makes is the adapter's, and no record identifier,
 * sequence number or result value is typed here (rule P-6). Neither sentence claims what the
 * demonstration cannot establish (rule P-4).
 */
const EXTRA_FLAG_COPY: Record<ExtraFlag, TriggerCopy> = {
  'tampered-audit': {
    label: 'Edit a recorded audit result',
    detail:
      'A recorded result is changed without recomputing its hash, so verifying the chain reports where it broke and repairs nothing.',
  },
  'empty-queue': {
    label: 'Empty the exception queue',
    detail: 'The exception queue answers with no records, apart from a filter that happens to match nothing.',
  },
};

/**
 * The local mirror of the two extra triggers: what this popover last sent and the adapter accepted.
 *
 * Written only after the port resolves, so the control a reader sees is the state the adapter holds
 * rather than the one they clicked (rule P-8).
 */
type FlagMirror = Record<ExtraFlag, boolean>;

/** The mirror of a session whose triggers have all been lifted. */
function initialFlagMirror(): FlagMirror {
  return { 'tampered-audit': false, 'empty-queue': false };
}

/* ---------------------------------------------------------------------------------------------
 * What the popover can ask for — AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * One change the popover asks the port to make.
 *
 * It is a value rather than a closure so that the retry a failed change offers repeats exactly the
 * change that failed: the action is held in state beside the failure, and nothing about it depends on
 * what the reader has clicked since.
 */
type PendingAction =
  | { readonly kind: 'state'; readonly state: ScreenState; readonly on: boolean }
  | { readonly kind: 'flag'; readonly flag: ExtraFlag; readonly on: boolean }
  | { readonly kind: 'reset' };

/** A change that failed, with the sentence to show and the action the retry repeats. */
interface Failure {
  /** The service's own message when the rejection carried one, or the popover's neutral sentence. */
  readonly message: string;

  /** The change to repeat when the reader asks for it again. */
  readonly action: PendingAction;
}

/**
 * The shape of the failure the port throws: `Problem` in `src/types/service.ts`, whose `type` names
 * its cause, whose `message` is the reason in plain words and whose `traceId` correlates the call.
 *
 * The guard checks exactly those three members, so a rejection that arrived in the service's own shape
 * is recognised without this module holding a second copy of the causes. A thrown `Error` carries none
 * of them, and is therefore never presented as a refusal the service made.
 */
function isProblem(value: unknown): value is Problem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate: Record<string, unknown> = value as Record<string, unknown>;

  return (
    typeof candidate['type'] === 'string' &&
    typeof candidate['message'] === 'string' &&
    typeof candidate['traceId'] === 'string'
  );
}

/**
 * The service's own message for a rejection, or `null` when the rejection did not arrive in its shape.
 *
 * A `Problem` is thrown rather than returned (contracts §2), so a failed change reaches this component
 * as a caught value. When it carries the service's shape, its own message is what the reader sees,
 * because a sentence written here would be a second account of a failure this module never saw;
 * anything else gets the popover's neutral sentence and no invented cause.
 */
function problemMessageOf(error: unknown): string | null {
  return isProblem(error) ? error.message : null;
}

/**
 * The keys of an exhaustive record, typed as the union that record is keyed by.
 *
 * `Object.keys` widens to `string[]`, and both groups below are rendered from their copy records so
 * that a member added to either union cannot be missing a control: the `Record<…, …>` annotation
 * requires every member, and this function is the one place the resulting list is given the union's
 * own type back. The cast is sound because a record typed `Record<Key, …>` is keyed by exactly `Key`
 * and by nothing else.
 */
function keysOf<Key extends string>(record: Record<Key, unknown>): readonly Key[] {
  return Object.keys(record).map((key) => key as Key);
}

/** Joins the class lists a control composes, dropping the ones a caller left out. */
function joinClassNames(...values: readonly (string | undefined)[]): string {
  return values.filter((value) => value !== undefined && value.length > 0).join(' ');
}

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The popover's anchor: a positioned box at the shell's own position, holding the panel.
 *
 * The shell places `SimulationControls` beside the badge that opens it, and this wrapper gives the
 * panel a containing block without the shell having to position anything: from the `lg` breakpoint up
 * the panel opens downward from the control, aligned to the inline end of the shell's row, which is
 * where a popover anchored to a trigger belongs. It is inline-flex so it occupies no space of its own
 * in that row while the panel is closed, and a zero-width box is what makes `end-0` mean the row's
 * inline end rather than the badge's own.
 *
 * Below `lg` the panel leaves this box altogether and anchors to the viewport instead, for the reason
 * `PANEL_CLASSES` gives: there the top-bar row wraps the badge onto a line that starts at the row's
 * own gutter, so this anchor's inline end sits a panel-width's short of the viewport's inline start and
 * the panel would hang off the screen with nothing to scroll it back by.
 */
const ROOT_CLASSES = 'relative inline-flex';

/**
 * The panel: the raised second surface inside the decorative hairline at the panel radius, with no
 * shadow anywhere (there is none to select) and every value a role token, so Command and Paper each
 * resolve their own measured pairing (rule B-3, specification §4.3).
 *
 * TWO PRESENTATIONS, AND WHY THE VIEWPORT-ANCHORED ONE IS THE BASE. F10 makes this popover the only way
 * to reach the seven states and the two extra triggers, so rule B-3's "reachable and operable" decides
 * where it sits, and a panel placed against the row at a narrow width is not reachable: the row wraps
 * its items, so its inline end can sit only a gutter inside the viewport's inline start, and the panel
 * hangs off the screen with no overflow to scroll it back by. Below `lg` it is therefore anchored to the
 * viewport — 8 px in from the inline start, the inline end and the bottom — and its height is clamped to
 * the viewport, so it fits any screen narrow enough for that wrap. From `lg` up the row is wide enough
 * to hold the panel at its anchored form, which is what the panel has always done there: it opens
 * downward from the badge's row at that row's inline end, 384 px wide.
 *
 * NO TWO UTILITIES HERE FIGHT. Every property that changes between the two presentations is set once at
 * the base and once inside `lg:`, which the stylesheet emits after the unprefixed utilities, so the wider
 * breakpoint retunes the same box instead of two lists contending: `position` (`fixed`/`absolute`), the
 * inline insets (`start-2 end-2`/`start-auto end-0`), the block insets (`bottom-2 top-auto`/`top-full
 * bottom-auto`), the width (none/`w-96`) and the height cap. `overflow-y-auto` with `overscroll-contain`
 * keeps every control reachable on a short viewport in either presentation.
 */
const PANEL_CLASSES = [
  'fixed start-2 end-2 bottom-2 top-auto z-50 flex min-w-0 flex-col gap-3',
  'max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain',
  'lg:absolute lg:start-auto lg:end-0 lg:top-full lg:bottom-auto lg:mt-2 lg:w-96 lg:max-h-screen',
  'rounded-panel border border-hairline bg-surface-2 p-3',
].join(' ');

/** The label line and the control that closes the panel, separated rather than touching. */
const HEADER_CLASSES = 'flex min-w-0 items-start justify-between gap-2';

/** The heading and the sentence under it. */
const TITLE_BLOCK_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The heading holds the fixed label; the 16 px step is the largest the panel needs. */
const TITLE_CLASSES = 'text-16 font-medium';

/** A caption: the popover's own sentences, in the secondary text role. */
const CAPTION_CLASSES = 'text-12 text-text-secondary';

/** A group of related triggers: no fieldset border, no padding, no minimum width of its own. */
const GROUP_CLASSES = 'm-0 flex min-w-0 flex-col gap-2 border-0 p-0';

/** The group's accessible name, in the secondary text role rather than a full heading. */
const LEGEND_CLASSES = 'mb-1 p-0 text-12 font-medium text-text-secondary';

/** The controls of one group, one row each. */
const GROUP_STACK_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The failure region: the fail status role on its boundary, with no fill that would move the text. */
const FAILURE_CLASSES = 'flex min-w-0 flex-col gap-2 rounded-card border border-status-fail p-2';

/** The failure's message, in the service's own words. */
const FAILURE_MESSAGE_CLASSES = 'text-12 text-text-primary';

/** The reset control and the sentence beneath it. */
const ACTION_BLOCK_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The one line that explains why every control is inert while a change is in flight. */
const BUSY_LINE_CLASSES = 'text-12 text-text-secondary';

/** The close control's icon: one step of the type scale square, and never shrunk by its flex row. */
const CLOSE_ICON_CLASSES = 'size-3 shrink-0';

/** The close control itself: it holds its intrinsic width while the heading beside it wraps. */
const CLOSE_CONTROL_CLASSES = 'shrink-0';

/** The keyboard hint that closes the panel, at the lowest emphasis the themes define. */
const HINT_CLASSES = 'text-12 text-text-caption';

/** A toggle's content stack: the label row first, the explanation under it. */
const TOGGLE_STACK_CLASSES = 'flex w-full min-w-0 flex-col items-start gap-1 text-start';

/** A toggle's label row: the words on the inline start, the status on the inline end. */
const TOGGLE_ROW_CLASSES = 'flex w-full min-w-0 items-center justify-between gap-2';

/** The explanation under a toggle's label. */
const TOGGLE_DETAIL_CLASSES = 'text-12 text-text-secondary';

/**
 * A toggle whose trigger is lifted: the control boundary and the raised second surface, with the
 * accent boundary and the first surface under the pointer and on a press. Every value is a role
 * token, so both themes keep the contrast their tables measured, and no opacity appears anywhere
 * because dimming a label is how a ratio falls below what rule B-3 requires.
 */
const TOGGLE_IDLE_CLASSES = [
  'border-control-boundary bg-surface-2 text-text-primary',
  'hover:border-accent hover:bg-surface-1',
  'active:border-accent active:bg-ground',
].join(' ');

/**
 * A toggle whose trigger is in effect: the accent boundary and the first surface, so the pressed row
 * reads differently from its neighbours without the colour carrying the meaning on its own —
 * `aria-pressed` and the status label beside it carry it for a reader (rule B-3).
 */
const TOGGLE_PRESSED_CLASSES = 'border-accent bg-surface-1 text-text-primary';

/**
 * A toggle that cannot act while another change is in flight: the first surface, the secondary text
 * role and a not-allowed pointer, with no pointer response at all — the movement of a control that
 * cannot act is exactly what rule P-8's explanation is there to prevent a reader from expecting.
 */
const TOGGLE_BUSY_CLASSES =
  'border-control-boundary bg-surface-1 text-text-secondary aria-disabled:cursor-not-allowed';

/* ---------------------------------------------------------------------------------------------
 * The popover — AAP 0.12.1, F10
 * ------------------------------------------------------------------------------------------- */

/**
 * The single simulation popover, rendered by the shell beside the badge that opens it.
 *
 * The panel renders only while the shell store's `simulationOpen` is true, and its own state — the
 * mirror of what it has sent, the change in flight and the last failure — lives above that branch, so
 * closing and reopening the panel shows the triggers the adapter actually holds rather than resetting
 * the panel's memory to "all lifted".
 *
 * The reset is the one action here that closes the panel it was taken from, so its outcome would
 * otherwise leave the screen with no word at all: it writes
 * {@link SIMULATION_CONTROLS_TEXT.resetCompleted} into the shell store's announcement, which the shell
 * renders in its own status region outside this component (rule B-3, WCAG 2.2 SC 4.1.3). The
 * announcement is cleared when the panel is opened again, so a second reset announces itself the same
 * way instead of re-writing a string that never changed and going unreported.
 *
 * Every change goes through the port: a screen state is set through `setSimulation`, the two extra
 * triggers the same way, and `Reset demo data` through `resetDemo`. A resolved change drops the reads
 * it was holding, clears what they cached and starts them again without awaiting the refetches, so
 * every screen re-reads through the port and no surface is left serving the payload it cached before
 * the trigger moved, while the panel's busy state covers the port call alone: the `loading` trigger
 * holds every read open, so a panel that waited for those refetches would stay disabled with no way to
 * lift the trigger it set (rule P-8). A rejected one leaves the mirror untouched, keeps the panel open
 * and offers the retry, so nothing on screen pretends a change took effect (rule P-8).
 *
 * @returns The panel while the popover is open, and `null` while it is closed.
 */
export function SimulationControls(): ReactElement | null {
  const isOpen = useShellStore((state) => state.simulationOpen);
  const setSimulationOpen = useShellStore((state) => state.setSimulationOpen);
  const setAnnouncement = useShellStore((state) => state.setAnnouncement);
  const setSelectedNodeId = useShellStore((state) => state.setSelectedNodeId);
  const setWallMode = useShellStore((state) => state.setWallMode);
  const noteDemonstrationReset = useShellStore((state) => state.noteDemonstrationReset);
  const service = useService();
  const queryClient = useQueryClient();

  const [activeState, setActiveState] = useState<ScreenState | null>(null);
  const [extraFlags, setExtraFlags] = useState<FlagMirror>(initialFlagMirror);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  /**
   * Clears the last announcement when the panel is opened.
   *
   * The region holds one sentence, and a second reset in the same session would write the same
   * sentence into it: a live region reports a change, so an unchanged string would announce nothing.
   * Emptying it on the way in leaves the next reset with something to say, and clears a message the
   * reader has already been given. It reads no data and runs no read of its own (AAP 0.18.1).
   */
  useEffect(() => {
    if (isOpen) {
      setAnnouncement('');
    }
  }, [isOpen, setAnnouncement]);

  /**
   * Drops the reads a change was holding, clears what they cached and starts them again, in that order.
   *
   * WHY THE QUERIES ARE CANCELLED BEFORE THE CACHE IS CLEARED. While the `loading` trigger is in
   * effect the adapter answers a read by never answering it, so a screen that began fetching inside
   * that window holds an in-flight fetch that never settles. A reset alone would not restart it: the
   * refetch a reset starts dedupes onto the fetch already in flight and hands back its pending
   * promise, so no new read would start and the screen would never leave its pending state once the
   * trigger was lifted. Cancelling first reverts the query to the state it held before that fetch,
   * which is what lets the refetch the reset then starts reach the adapter and be answered.
   *
   * WHY THE CACHE IS RESET RATHER THAN INVALIDATED. An invalidation keeps the payload it holds, so a
   * screen that remounted after the trigger moved would render the answer taken before it: the
   * `loading` trigger would paint the rows it exists to hold back — and only a screen that issued a
   * fresh query would ever enter the pending state the boundary renders for it. A reset clears the
   * payload, so no screen can serve an answer taken before the trigger moved and every screen shows
   * the state the trigger set until it is lifted (`ScreenState` in `src/types/service.ts`, AAP 0.2.2).
   *
   * WHY THE IDENTITY ENTRY IS KEPT ON A TRIGGER CHANGE. A trigger changes what the records answer,
   * never who the session acts as, so the entry `ACTIVE_USER_QUERY_KEY` names would be re-read for a
   * value that did not move — and clearing it would blank the acting persona for a frame on every
   * trigger change, taking the scope and the permissions it carries with it. `Reset demo data` is the
   * one change that resets it with the rest, because it replaces the whole record set the identity is
   * answered from: the entry is re-read rather than kept there, and the persona it reports is the one
   * the reset left in force, because `resetDemo` restores the records, the chain and the triggers and
   * keeps the acting persona. Every consumer of `useActiveUser()` therefore follows the same person,
   * read from the records the reset installed.
   *
   * WHAT IS NOT AWAITED. The chain is issued and not awaited, so the panel's busy state still covers
   * the port call alone: the `loading` trigger holds every read open, and a panel that waited for
   * these refetches would stay disabled with no way to lift the trigger it set (rule P-8). Nothing is
   * left here to reject either: the query cache hands a failed refetch to the screen that owns the
   * read, which renders it, and neither the cancellation nor the reset reports a failure back to this
   * caller.
   *
   * @param keepActingPersona - `true` for a trigger change, which leaves the entry
   *   `ACTIVE_USER_QUERY_KEY` names in place; `false` for `Reset demo data`, which resets it with
   *   every other entry because the reset replaced the records the identity is answered from, and
   *   reports the persona the reset kept in force.
   */
  function reissueReads(keepActingPersona: boolean): void {
    void queryClient
      .cancelQueries()
      .then(() =>
        queryClient.resetQueries({
          predicate: (query) =>
            !keepActingPersona || query.queryKey[0] !== ACTIVE_USER_QUERY_KEY[0],
        }),
      );
  }

  /**
   * Asks the port for one change and reports what happened.
   *
   * The screen states are mutually exclusive as a screen's condition, although the adapter keeps a set
   * of triggers, so lifting the previous state is part of setting the next one (AAP 0.12.1). The
   * previous state's call comes first and the new state's second: if the first is refused, the second
   * is never made, and the panel reports that refusal rather than leaving the adapter with a state the
   * mirror does not describe.
   *
   * WHAT THE CHANGE IN FLIGHT IS. `pending` covers the port call and nothing after it. The reads a
   * resolved change drops and starts again are the screens' own work (see `reissueReads`), and
   * awaiting those refetches would tie this panel's busy state to reads the `loading` trigger never
   * answers, leaving every control disabled for the rest of the session (rule P-8). The chain is
   * therefore issued and not awaited.
   */
  async function run(action: PendingAction): Promise<void> {
    setPending(action);
    setFailure(null);

    try {
      if (action.kind === 'reset') {
        await service.resetDemo();
        setActiveState(null);
        setExtraFlags(initialFlagMirror());
        /* THE DEMONSTRATION'S VIEW GOES BACK WITH ITS RECORDS. The selection and wall mode are the
           shell's own two fields, so the panel is the one surface that can clear them; a remounted
           canvas reports its own wall mode as off, so leaving the shell's flag on would hide the
           navigation of a screen that no longer believes it is in wall mode. The count is what the
           screens' own stores compare against: the canvas's lens and the atlas's class in view outlive
           every mount, and neither module may read this store (AAP §0.18.1), so a choice made before
           the reset is only tellable from one made after it by the count the router hands them. */
        setSelectedNodeId(null);
        setWallMode(false);
        noteDemonstrationReset();
        /* The reset closes the panel, so this is the whole of what a reader who is not looking at the
           screen is told that it worked: the status region above carries the sentence, and it is
           written only after the port has resolved (rule B-3, WCAG 2.2 SC 4.1.3). */
        setAnnouncement(SIMULATION_CONTROLS_TEXT.resetCompleted);
        /* The panel closes, and the rest of the reader's session stands: the seeded records, the chain
           and the triggers are the adapter's, while the persona in force and the top bar's scope filters
           are the reader's own — the two values that describe who is reading rather than what the
           demonstration shows — and survive the reset. Closing the panel is also what returns focus to
           the badge that opened it. */
        setSimulationOpen(false);
        /* The records the reset installed are answered again by the screens that are mounted. The
           payloads cached for the routes the reader has left describe the session that has just been
           replaced, and holding them until their retention runs out keeps every visited route's records
           resident on top of the ones being re-read; so the entries no mounted screen observes are
           dropped here, before the reads are re-issued, and what remains is what a reader can still see. */
        queryClient.removeQueries({ type: 'inactive' });
        /* Issued, not awaited: the busy state covers the port call, and a refetch the `loading` trigger
           holds would otherwise keep every control disabled for the rest of the session (rule P-8). The
           reads the reset was holding are dropped first, so the refetch starts a new one. The identity
           entry is read afresh with the rest rather than kept: the reset replaced the records that read
           is answered from, and it kept the acting persona, so every consumer of `useActiveUser()`
           follows the same person the shell was already displaying. */
        reissueReads(false);
        return;
      }

      if (action.kind === 'state') {
        const previous = activeState;

        if (action.on && previous !== null && previous !== action.state) {
          await service.setSimulation(previous, false);
        }

        await service.setSimulation(action.state, action.on);
        setActiveState((current) => {
          if (action.on) {
            return action.state;
          }

          return current === action.state ? null : current;
        });
        reissueReads(true);
        return;
      }

      await service.setSimulation(action.flag, action.on);
      setExtraFlags((current) => ({ ...current, [action.flag]: action.on }));
      reissueReads(true);
    } catch (error) {
      setFailure({
        message: problemMessageOf(error) ?? SIMULATION_CONTROLS_TEXT.unreportedFailure,
        action,
      });
    } finally {
      setPending(null);
    }
  }

  const pendingReason = pending === null ? null : SIMULATION_CONTROLS_TEXT.busyReason;

  function handleState(state: ScreenState): void {
    void run({ kind: 'state', state, on: activeState !== state });
  }

  function handleFlag(flag: ExtraFlag): void {
    void run({ kind: 'flag', flag, on: !extraFlags[flag] });
  }

  function handleReset(): void {
    void run({ kind: 'reset' });
  }

  function handleRetry(): void {
    if (failure !== null) {
      void run(failure.action);
    }
  }

  const handleClose = useCallback((): void => {
    /* A failure belongs to the attempt the reader was making, and the panel is being dismissed: the
       next open starts from the state the adapter holds rather than from a message about a change that
       is no longer being attempted, and the control that reported it is still one press away. */
    setFailure(null);
    setSimulationOpen(false);
  }, [setSimulationOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <SimulationDialog
      activeState={activeState}
      extraFlags={extraFlags}
      pendingReason={pendingReason}
      failure={failure}
      onState={handleState}
      onFlag={handleFlag}
      onReset={handleReset}
      onRetry={handleRetry}
      onClose={handleClose}
    />
  );
}

/* ---------------------------------------------------------------------------------------------
 * The open panel — AAP 0.12.1, rule B-3
 * ------------------------------------------------------------------------------------------- */

/**
 * What the open panel is given: the mirror of what this popover last sent the adapter, the failure it
 * has to report, and one callback per control the panel offers.
 *
 * The mirror and the failure are the caller's, so the panel displays the state the port resolved and
 * holds none of its own: every press below asks the caller for a change, and the visible state moves
 * only when that change comes back accepted (AAP 0.12.1).
 */
interface SimulationDialogProps {
  /** The screen state in effect, or `null` when none is. */
  readonly activeState: ScreenState | null;

  /** The two triggers that are not screen states, as the adapter last accepted them. */
  readonly extraFlags: FlagMirror;

  /** The sentence every control carries while a change is in flight, or `null` when none is. */
  readonly pendingReason: string | null;

  /** The change that failed, or `null`. */
  readonly failure: Failure | null;

  /** Asks for one screen state to be set or lifted. */
  readonly onState: (state: ScreenState) => void;

  /** Asks for one extra trigger to be set or lifted. */
  readonly onFlag: (flag: ExtraFlag) => void;

  /** Asks for the demonstration's records to be restored. */
  readonly onReset: () => void;

  /** Repeats the change that failed. */
  readonly onRetry: () => void;

  /** Closes the panel. */
  readonly onClose: () => void;
}

/**
 * The panel itself: a `role="dialog"` region that claims `aria-modal`, named by the fixed
 * `Simulated control` label, and holding the seven states, the two extra triggers and the reset.
 *
 * FOCUS — the effect records the element that had focus when the panel opened, moves focus to the
 * panel's first control and, when the panel unmounts, returns focus to the element it recorded. `Tab`
 * and `Shift+Tab` cycle inside the panel and `Escape` closes it through the caller, so the cycle is
 * releasable from the keyboard (WCAG 2.2 SC 2.1.2). `Escape` is bound on the document for exactly as
 * long as the panel is mounted, because the panel claims modality and a press has to close it wherever
 * focus sits; every other key stays with the shell's own model.
 */
function SimulationDialog(props: SimulationDialogProps): ReactElement {
  const { onClose } = props;
  const titleId = useId();
  const descriptionId = useId();
  const busyId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const firstControl = dialog === null ? undefined : focusableElements(dialog)[0];

    if (firstControl !== undefined) {
      firstControl.focus();
    } else {
      dialog?.focus();
    }

    /* `Escape` is bound on the document for as long as the panel is open, and released when it closes.
       The panel claims modality, so a press has to close it wherever focus sits — including the moment
       after a click on one of its own captions, which a browser answers by moving focus to the body.
       The listener exists only while this panel is mounted, handles no other key, and cannot outlive
       it. */
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);

      /* An SVG mark is accepted as well as an element, because the badge that opens this panel is an
         HTML control while a canvas pin that opens it is an SVG `<g>`; the guard covers both so a
         reader is never left on `<body>` after the panel closes (WCAG 2.2 SC 2.4.3). */
      if (
        (previouslyFocused instanceof HTMLElement || previouslyFocused instanceof SVGElement) &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus();
      }
    };
  }, [onClose]);

  /* A change settling rebuilds a control that was disabled while it was in flight. A browser that
     dropped focus to the body then would leave this modal owning nothing, and the next Tab would walk
     the page behind it instead of the panel; so the panel takes focus back when it owns none. */
  useEffect(() => {
    if (document.activeElement === document.body && dialogRef.current !== null) {
      dialogRef.current.focus();
    }
  }, [props.pendingReason, props.failure]);

  const isBusy = props.pendingReason !== null;

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Tab') {
      trapTab(event, dialogRef.current);
      return;
    }

    if (event.key === '/') {
      /* The shell focuses the identifier search field on `/`, from a listener it binds on the document
         (`src/app/keyboard-shortcuts.ts`). The panel is modal, so the key must not pull focus out of it
         and leave the page behind a dialog that claims the page is inert (rule B-3). The event stops
         here, and no second keyboard model is registered. */
      event.stopPropagation();
    }
  }

  return (
    <div className={ROOT_CLASSES}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={PANEL_CLASSES}
      >
        <div className={HEADER_CLASSES}>
          <div className={TITLE_BLOCK_CLASSES}>
            <DialogHeading id={titleId} className={TITLE_CLASSES}>
              <StatusIndicator meaning="simulated" label={SIMULATED_CONTROL_LABEL} />
            </DialogHeading>
            <p id={descriptionId} className={CAPTION_CLASSES}>
              {SIMULATION_CONTROLS_TEXT.intro}
            </p>
          </div>
          {/* The close control keeps its own width: the heading beside it wraps instead, so the label
              and its icon are never squeezed out of the control's own padding. */}
          <ActionButton className={CLOSE_CONTROL_CLASSES} onClick={props.onClose}>
            <X aria-hidden="true" focusable="false" className={CLOSE_ICON_CLASSES} />
            <span>{SIMULATION_CONTROLS_TEXT.closeLabel}</span>
          </ActionButton>
        </div>

        <fieldset className={GROUP_CLASSES}>
          <legend className={LEGEND_CLASSES}>{SIMULATION_CONTROLS_TEXT.stateLegend}</legend>
          <div className={GROUP_STACK_CLASSES}>
            {keysOf(SCREEN_STATE_LABELS).map((state) => (
              <TriggerToggle
                key={state}
                label={SCREEN_STATE_LABELS[state]}
                pressed={props.activeState === state}
                busyReason={props.pendingReason}
                busyDescriptionId={busyId}
                onActivate={() => {
                  props.onState(state);
                }}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className={GROUP_CLASSES}>
          <legend className={LEGEND_CLASSES}>{SIMULATION_CONTROLS_TEXT.flagLegend}</legend>
          <div className={GROUP_STACK_CLASSES}>
            {keysOf(EXTRA_FLAG_COPY).map((flag) => (
              <TriggerToggle
                key={flag}
                label={EXTRA_FLAG_COPY[flag].label}
                detail={EXTRA_FLAG_COPY[flag].detail}
                pressed={props.extraFlags[flag]}
                busyReason={props.pendingReason}
                busyDescriptionId={busyId}
                onActivate={() => {
                  props.onFlag(flag);
                }}
              />
            ))}
          </div>
        </fieldset>

        {props.failure === null ? null : (
          <div role="alert" className={FAILURE_CLASSES}>
            <p className={FAILURE_MESSAGE_CLASSES}>{props.failure.message}</p>
            {isBusy ? (
              <ActionButton
                onClick={props.onRetry}
                disabled
                disabledReason={SIMULATION_CONTROLS_TEXT.busyReason}
              >
                {SIMULATION_CONTROLS_TEXT.retryLabel}
              </ActionButton>
            ) : (
              <ActionButton onClick={props.onRetry}>{SIMULATION_CONTROLS_TEXT.retryLabel}</ActionButton>
            )}
          </div>
        )}

        {/* One line, in words each disabled control points at with `aria-describedby`: a reason per
            control would repeat the same sentence nine times over the panel. */}
        <p id={busyId} role="status" className={BUSY_LINE_CLASSES}>
          {props.pendingReason ?? ''}
        </p>

        <div className={ACTION_BLOCK_CLASSES}>
          {isBusy ? (
            <ActionButton
              onClick={props.onReset}
              disabled
              disabledReason={SIMULATION_CONTROLS_TEXT.busyReason}
            >
              {SIMULATION_CONTROLS_TEXT.resetLabel}
            </ActionButton>
          ) : (
            <ActionButton onClick={props.onReset}>{SIMULATION_CONTROLS_TEXT.resetLabel}</ActionButton>
          )}
          <p className={CAPTION_CLASSES}>{SIMULATION_CONTROLS_TEXT.resetDetail}</p>
        </div>

        <p className={HINT_CLASSES}>{SIMULATION_CONTROLS_TEXT.escapeHint}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * One trigger, as a toggle — rule P-8, rule B-3
 * ------------------------------------------------------------------------------------------- */

/**
 * What the panel asks of one toggle: which trigger it produces, whether the adapter last accepted it,
 * and the sentence that explains why it cannot act while a change is in flight.
 *
 * The pressed state is reported rather than held, because the caller mirrors only what the port
 * resolved, so a refused change leaves the control showing the adapter's answer and not what the
 * reader clicked; and a control that cannot act says why in `busyReason` instead of being taken out of
 * the panel (rule P-8, rule B-3).
 */
interface TriggerToggleProps {
  /** The state or trigger the control produces, in words. */
  readonly label: string;

  /** What the trigger changes, for the two whose meaning the label cannot carry alone. */
  readonly detail?: string | undefined;

  /** Whether the trigger is in effect, as the adapter last accepted it. */
  readonly pressed: boolean;

  /** The sentence explaining why the control cannot act, or `null` while it can. */
  readonly busyReason: string | null;

  /** The id of the panel's visible busy sentence, which a control describes itself with while inert. */
  readonly busyDescriptionId: string;

  /** Asks for this trigger to be set or lifted. */
  readonly onActivate: () => void;
}

/**
 * One trigger as a toggle: `Button` from `src/components` carrying `aria-pressed` and a composed
 * accessible name, painted in the control structure every other control uses.
 *
 * The element belongs to the primitive (AAP 0.5.2), and this shell control composes it rather than
 * rendering a native `<button>` of its own. `ActionButton` is not the owner to compose here: its props
 * cannot express a pressed state, so a toggle built from it would have no way to tell a reader which
 * trigger is in effect. This toggle hands the exported `CONTROL_STRUCTURE_CLASSES` to `Button` as its
 * class list, so the target size, the focus ring and the control radius stay the ones every other
 * control has.
 *
 * The pressed state is never colour alone: `aria-pressed` carries it programmatically and the
 * `StatusIndicator` beside the label carries it in words and an icon (rule B-3). The visible words are
 * hidden from the accessibility tree, because the button's `aria-label` states the same label and
 * status as one phrase and the explanation a flag carries is a description rather than part of the
 * name.
 */
function TriggerToggle(props: TriggerToggleProps): ReactElement {
  const detailId = useId();
  const isBusy = props.busyReason !== null;
  const status = props.pressed ? SIMULATION_CONTROLS_TEXT.on : SIMULATION_CONTROLS_TEXT.off;

  /* The name is the label and the status, composed here rather than read off the control's content:
     the explanation a flag toggle carries is a description of what the trigger changes, not part of
     what the control is called, and leaving it in the content would append a sentence to the name. */
  const name = `${props.label}${SIMULATION_CONTROLS_TEXT.statusSeparator}${status}`;

  /* While the control cannot act, its description is the panel's one busy sentence; otherwise it is
     the explanation this trigger carries, when it has one. Both resolve to an element that is mounted,
     so neither reference dangles. */
  const describedBy = isBusy ? props.busyDescriptionId : props.detail === undefined ? undefined : detailId;

  function handleClick(): void {
    if (isBusy) {
      return;
    }

    props.onActivate();
  }

  /* ONE BUTTON, ALWAYS THE SAME BUTTON. The toggle is never wrapped in a hint element that comes and
     goes with its disabled state: a control that is replaced when it becomes inert loses focus to the
     body, and a keyboard reader would then be outside the panel they are working in after every
     activation. Its reason is attached as a description instead, and painted once by the panel. */
  return (
    <Button
      type="button"
      aria-label={name}
      aria-pressed={props.pressed}
      aria-describedby={describedBy}
      aria-disabled={isBusy ? true : undefined}
      onClick={handleClick}
      className={joinClassNames(
        CONTROL_STRUCTURE_CLASSES,
        'w-full',
        isBusy ? TOGGLE_BUSY_CLASSES : props.pressed ? TOGGLE_PRESSED_CLASSES : TOGGLE_IDLE_CLASSES,
      )}
    >
      <span className={TOGGLE_STACK_CLASSES}>
        <span className={TOGGLE_ROW_CLASSES}>
          <span aria-hidden="true" className="min-w-0 text-13 font-medium">
            {props.label}
          </span>
          <StatusIndicator
            meaning={props.pressed ? 'simulated' : 'empty'}
            label={status}
            className="shrink-0"
          />
        </span>
        {props.detail === undefined ? null : (
          <span id={detailId} className={TOGGLE_DETAIL_CLASSES}>
            {props.detail}
          </span>
        )}
      </span>
    </Button>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Keeping the keyboard inside the panel — rule B-3, WCAG 2.2 SC 2.1.2 and SC 2.4.3
 * ------------------------------------------------------------------------------------------- */

/**
 * Everything inside the panel that can take focus.
 *
 * The selector names the elements a browser offers a Tab stop for; the filter drops the ones it does
 * not — a negatively-tabbed element and anything hidden from assistive technology — so the first and
 * last members are the real ends of the cycle rather than elements the browser would skip.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** The panel's focusable descendants, in document order. */
function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true',
  );
}

/**
 * Keeps `Tab` and `Shift+Tab` inside the panel, so a reader stays with the surface they opened and
 * assistive technology is never told the page behind it is inert while focus walks out of it.
 *
 * The handler is bound to the panel rather than to the document, so nothing outside it changes
 * behaviour while it is open and no listener survives it. Focus that sits on the panel itself — which
 * is where it is put when the panel holds no control — is treated as the first stop for a backwards
 * move and left to the browser for a forward one, which is what makes the first `Tab` land on the
 * first control instead of skipping it.
 */
function trapTab(event: ReactKeyboardEvent<HTMLDivElement>, dialog: HTMLDivElement | null): void {
  if (dialog === null) {
    return;
  }

  const focusable = focusableElements(dialog);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (first === undefined || last === undefined) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || active === dialog) {
      event.preventDefault();
      last.focus();
    }

    return;
  }

  if (active === last) {
    event.preventDefault();
    first.focus();
  }
}

