/**
 * SCR-07's "Grant time-boxed exception" flow: the modal that collects the reason, the expiry and the
 * second approver a policy exception request needs, and asks the service to record it as pending.
 *
 * Fixing input: AAP 0.12.4's SCR-07 row — the primary action is "Grant time-boxed exception" with
 * "(reason, expiry, second approver, records a pending request)" — and rule P-8, which is why the
 * control that sends it is an {@link ActionButton}: a disabled submit cannot be constructed without
 * the sentence that says why. The record itself is the service's: this component collects three
 * terms, calls `requestPolicyException` once through `useService()`, and renders whatever comes back.
 * It holds no request, appends no audit event and decides nothing, so the pending request that
 * appears in the session is the adapter's record and never a copy made here (AAP 0.12.2
 * `PolicyException`, AAP 0.12.1 "Port" row).
 *
 * WHAT A RECORDED REQUEST DOES TO THE CACHE. Once the port has resolved the request, the dialog marks
 * the reads that write touched as stale through {@link invalidateReads}, the helper declared below,
 * called with the cache client it obtained through `useQueryClient()`. Naming a port member is the
 * whole of the convention AAP 0.6.2 fixes — every read is keyed `[method, ...args]`, so one member
 * name matches every entry of that read under every argument list — and it is the same invalidation
 * the approval detail screen performs for the reads its decision moved. A feature module may not
 * import `src/app` (AAP 0.18.1 "Boundary discipline"), so that call is written here rather than
 * delegated to a helper of the shell's. The helper only marks cache entries stale: it reads no record,
 * edits none and holds no data boundary of its own. It is called before the caller is told the request
 * was recorded, so a policy, sovereignty or audit surface that stays mounted reads the post-write
 * payload instead of the one it cached. A refused call invalidates nothing.
 *
 * WHAT IT CLAIMS, AND WHAT IT DOES NOT. The dialog says that a request is recorded as pending and
 * that nothing here decides it. A denial in a browser page demonstrates the declared policy set
 * rather than production authorisation, so no sentence states or implies that granting an exception
 * establishes a configuration, prevents a copy or resists an edit (rule P-4); the panel carries the
 * fixed `Simulated control` label of specification §5.3 because the flow is a demonstration control
 * (rule P-1).
 *
 * Rules served:
 * - B-1: the only call is the port's, which is in-browser. Nothing here fetches, links or resolves an
 *   address.
 * - B-2: no credential, no configuration and no environment read — the module has nothing to
 *   configure.
 * - B-3: a real modal dialog. `role="dialog"` with `aria-modal="true"` and `aria-labelledby` pointing
 *   at the heading this component renders itself; focus moves into the first field on open, `Tab` and
 *   `Shift+Tab` are trapped in both directions, `Esc` closes it and focus returns to the element that
 *   opened it; every field has a programmatic label and a described-by message; every control is
 *   keyboard operable with the theme's 2 px focus ring and the 24x24 px minimum target; every field
 *   lifts its boundary to the accent role under the pointer, so a pointer reader sees a state the
 *   keyboard reader has an equivalent of; and every transition is `motion-safe:`, so a reduced-motion
 *   session animates nothing here.
 * - P-2: data access is `useService()` alone, and the invalidation {@link invalidateReads} performs goes
 *   through the cache client `useQueryClient()` returns: it reads no record, edits none and holds no
 *   data boundary. No seed module, adapter, API client, shell module or other feature is imported — a
 *   feature module may not import `src/app` (AAP 0.18.1 "Boundary discipline") and the port arrives
 *   only as a type, for the helper's member names — so this dialog cannot become a second data
 *   boundary.
 * - P-6: no figure, date, identifier, user, role or count is typed here. The policy identifier and its
 *   label arrive as props, the candidate approvers arrive as props, and the boundary the expiry is
 *   measured against is the imported `DEMO_CLOCK` constant rather than a literal or the system clock.
 * - P-7: every name on screen is a record value supplied by the caller or the service; the module
 *   writes none of its own.
 * - P-8: the submit is rendered through `ActionButton`, whose props make `disabledReason` mandatory
 *   exactly when the control is disabled, and each blocker has its own plain sentence: the reason is
 *   empty, the expiry is missing or not after the demonstration clock's date, the second approver has
 *   not been chosen, no approver is offered at all, or a request is already in flight. The same
 *   sentence is the field's described-by message, so it is read as well as painted.
 *
 * THE CANDIDATE SECOND APPROVERS ARRIVE AS A PROP. `SiteIntelligenceService` declares no read for the
 * personas a request may name — `getPolicy` returns the policy's decisions rather than its audience, and
 * `searchIdentifiers` returns domain records — and rule P-2 leaves this component no route to
 * `src/seed/users.ts`, so the candidates arrive as an optional prop rather than an invented list. Absent
 * or empty, the select offers nothing and the submit is disabled with a sentence naming the missing
 * capability rather than becoming a dead control (rule P-8).
 *
 * THE SECOND APPROVER'S IDENTITY IS THE SERVICE'S CHECK. The service refuses a request whose second
 * approver is the acting persona, and the acting persona is not readable from this component, so that
 * check cannot be made here: the refusal arrives as a `'validation'` `Problem` naming the persona, and
 * the dialog renders that message inline.
 *
 * THE EXPIRY IS A DATE AND THE PORT TAKES AN INSTANT. `requestPolicyException` takes `expiresAt` as an
 * ISO 8601 instant, while SCR-07's term is the date the exception stops applying, and
 * {@link expiryInstantOf} is the whole of that conversion: the chosen date at the start of the day, in
 * the offset the demonstration clock itself carries, so the boundary the service re-checks and the one
 * this dialog checks cannot disagree.
 *
 * There is deliberately no `form` element. The submit is an {@link ActionButton} of `type="button"`,
 * so nothing in this markup can submit implicitly and `Enter` inside the reason field inserts a line
 * break instead of sending a policy exception.
 *
 * WHERE THE FOUR NATIVE ELEMENTS COME FROM. The heading and the three fields are composed, never
 * written here: {@link DialogHeading} owns the `<h2>`, {@link TextAreaField} the reason's `<textarea>`,
 * {@link TextField} the expiry's `<input type="date">` and {@link SelectField} the approver's
 * `<select>` with the caller's own options. This dialog therefore renders no native interactive
 * element itself, and the only path to one runs through the component that owns it (AAP §0.5.2,
 * §0.5.5). Each primitive reports an edit as the field's new value string, which is what the three
 * setters below take, and every `id`, `aria-*` attribute and class list stays this dialog's own.
 */
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';

import { Card } from '../../components/card';
import { DialogHeading } from '../../components/dialog-heading';
import { SelectField } from '../../components/select-field';
import { TextAreaField } from '../../components/text-area-field';
import { TextField } from '../../components/text-field';
import { ActionButton } from '../../components/tooltip';
import type {
  PolicyException,
  PolicyId,
  Problem,
  ProblemType,
  SimLabel,
  Timestamp,
  UserId,
} from '../../types';
import { DEMO_CLOCK, SIM_LABELS } from '../../types';
import { useService } from '../../services/service-provider';
import type { SiteIntelligenceService } from '../../services/site-intelligence-service';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this dialog states, held here so the wording has one owner: the component renders
 * these strings and its suite names them through this object instead of retyping them.
 *
 * None of them carries a figure, a date, an identifier, a persona or a role (rule P-6), and none
 * claims that the request grants anything, that a configuration was verified or that anything is
 * protected (rule P-4). The label of a *runtime* value — the policy's own name, the approvers the
 * caller supplies, the `Problem` the service threw — is never written here: it is rendered as it
 * arrives.
 */
export const GRANT_EXCEPTION_DIALOG_TEXT = {
  /** The dialog's heading, and the name its `aria-labelledby` points at. */
  heading: 'Grant time-boxed exception',

  /** The caption of the policy the request is made against; the value beside it is the caller's. */
  policyCaption: 'Policy',

  /** The sentence under the heading: what the three terms are, and that nothing here decides them. */
  summary:
    'A request states why the exception is needed, the date it stops applying and the second persona ' +
    'whose approval it needs. The service records it as pending against this policy; nothing here ' +
    'decides it.',

  /** The reason field's label. */
  reasonLabel: 'Reason',

  /** The reason field's requirement, shown while a reason has been given. */
  reasonHint: 'The second approver reads this before deciding the request.',

  /** The reason blocker, and the field's message while no reason has been given. */
  reasonRequired: 'State why the exception is needed before the request can be sent.',

  /** The expiry field's label. */
  expiryLabel: 'Expiry',

  /** The expiry field's requirement, shown while the chosen date is acceptable. */
  expiryHint: 'The date the exception stops applying.',

  /** The expiry blocker for an empty field. */
  expiryRequired: 'Choose the date the exception stops applying.',

  /** The expiry blocker for a value that is not a calendar date. */
  expiryNotADate: 'The expiry is a calendar date; choose one in the date field.',

  /** The expiry blocker for a date that is not after the demonstration clock's date. */
  expiryNotAfterClock: 'Choose a date after the demonstration clock’s date.',

  /** The second-approver field's label. */
  approverLabel: 'Second approver',

  /** The second-approver field's requirement, shown while an approver has been chosen. */
  approverHint: 'The request records this persona as the second approval it needs.',

  /** The second-approver blocker for a field with no choice made. */
  approverRequired: 'Choose the persona whose approval the request needs.',

  /**
   * The second-approver blocker when the caller supplies no candidates: it names the missing
   * capability rather than leaving a control that cannot act without a reason (rule P-8).
   */
  noApproverOffered:
    'No second approver is offered here: the service supplies no read for the personas a request may ' +
    'name, so this request cannot be sent.',

  /** The select's empty first entry, which asks for a choice instead of preselecting one. */
  approverPlaceholder: 'Select an approver',

  /** The submit control's label. */
  submit: 'Request exception',

  /** The cancel control's label. */
  cancel: 'Cancel',

  /** The submit blocker while the request is in flight. */
  submitInFlight: 'The request has been sent and is waiting for the answer.',

  /** The cancel blocker while the request is in flight: a sent request is not withdrawn. */
  cancelInFlight: 'The request is in flight and is not withdrawn once it is sent.',

  /** The busy region's text while the request is in flight. */
  busy: 'Recording the pending request',

  /** The heading of the region that reports a call which did not complete. */
  failureTitle: 'The request was not recorded',

  /**
   * The sentence for a call that stopped for something other than the service's `Problem` shape, so
   * the region has a message of its own rather than an empty line.
   */
  unreportedFailure: 'The call stopped without reporting a cause.',

  /** The caption of the permission a `'permission'` refusal names. */
  permissionCaption: 'Permission required',

  /** The caption of the roles that hold that permission. */
  rolesCaption: 'Roles that hold it',

  /** The caption of the policy a `'policy'` refusal names. */
  refusalPolicyCaption: 'Policy',

  /** The caption of the alternative a denying policy permits. */
  alternativeCaption: 'Permitted alternative',

  /** The caption of the correlation identifier a reader quotes when reporting the failure. */
  traceCaption: 'Trace',
} as const;

/**
 * The fixed `Simulated control` label of specification §5.3, selected from the tuple that owns the
 * seven strings so a reworded label reaches this dialog from its one owner, and typed as that union
 * so anything which is not one of the fixed strings fails to compile (rule P-1).
 */
const SIMULATED_CONTROL_LABEL: SimLabel = SIM_LABELS[4];

/**
 * The demonstration clock's date, read from the constant clock rather than written here (rule P-6).
 * An ISO 8601 date compares lexicographically in time order, so the expiry check needs no date
 * arithmetic and no time zone.
 */
const DEMO_CLOCK_DATE = DEMO_CLOCK.slice(0, 10);

/**
 * The offset the demonstration clock itself carries. Read from the constant rather than typed, so the
 * instant this dialog sends sits in the same offset as the clock its validity is measured against.
 */
const DEMO_CLOCK_OFFSET = DEMO_CLOCK.slice(-6);

/** A calendar date in the form the date field produces. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The five causes a `Problem` may name, listed once so a thrown value can be narrowed to the
 * service's own failure shape without widening anything: `ProblemType` is the vocabulary the port
 * fixes and this list is the runtime form of it.
 */
const PROBLEM_TYPES: readonly ProblemType[] = [
  'permission',
  'policy',
  'validation',
  'simulated-write-back',
  'not-found',
];

/* ---------------------------------------------------------------------------------------------
 * Class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The scrim behind the dialog: the ground role at 80% over whatever the screen painted, so the panel
 * reads as raised above the page without a shadow (specification §4.3 has none) and without a second
 * elevation cue. It is a full-viewport flex box that centres the panel where there is room and lets it
 * scroll where there is not, so a short viewport never clips the actions.
 */
const OVERLAY_CLASSES =
  'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ground/80 p-4 sm:items-center';

/** The dialog's own box: one column wide enough for a form, never wider than the viewport allows. */
const DIALOG_CLASSES = 'w-full max-w-xl';

/** The header row: the heading group and the simulation tag, wrapping rather than overlapping. */
const HEADER_CLASSES = 'flex min-w-0 flex-wrap items-start justify-between gap-2';

/** The heading group: the {@link DialogHeading} and the policy it is requested against. */
const HEADING_GROUP_CLASSES = 'flex min-w-0 flex-col gap-1';

/**
 * The dialog's heading, worn by {@link DialogHeading} as its replacement class list. The `id` on it is
 * what `aria-labelledby` names the dialog by.
 */
const HEADING_CLASSES = 'text-16 font-semibold text-text-primary';

/** The policy caption: a recorded identifier and its label, in the mono face at caption size. */
const POLICY_CAPTION_CLASSES = 'min-w-0 break-words font-mono text-12 text-text-secondary';

/**
 * The fixed simulation tag. Its boundary and its text both come from the `simulated` status role, and
 * the label is written inside it, so the meaning is never carried by colour alone (rule B-3).
 */
const TAG_CLASSES = [
  'inline-flex min-h-6 items-center rounded-control border border-status-simulated',
  'px-2 font-mono text-12 text-status-simulated',
].join(' ');

/** The summary sentence under the heading: secondary text at body size, wrapping inside the panel. */
const SUMMARY_CLASSES = 'min-w-0 break-words text-13 text-text-secondary';

/** One field: its label, its control and its message, stacked so no child needs a margin. */
const FIELD_GROUP_CLASSES = 'flex min-w-0 flex-col gap-1';

/** A field's label, associated with its control through `htmlFor` and `id`. */
const LABEL_CLASSES = 'text-13 font-medium text-text-primary';

/**
 * The shape every field of this dialog shares: the recessed ground behind the primary text role, the
 * control boundary, the 2 px control radius, the 24x24 px minimum target of rule B-3 and the theme's
 * 2 px focus ring on `focus-visible`, so a keyboard user sees where they are and a pointer click
 * leaves no ring behind.
 *
 * The pointer is answered as well: `hover:` lifts the boundary to the accent role, the state the
 * secondary control, the simulated-data badge and the audit screen's filters carry, so no field in the
 * product looks inert when it is aimed at. Nothing changes at rest, and no press state is declared,
 * because a press on a text field is its focus. `motion-safe:` gates the colour transition, so a
 * reduced-motion session gets the same hover with no transition (rule B-3), and no raw palette value,
 * arbitrary value or shadow appears here — the theme layer exposes no shadow to select.
 */
const FIELD_CONTROL_CLASSES = [
  'w-full min-h-6 rounded-control border border-control-boundary bg-ground',
  'px-2 py-1 text-13 text-text-primary hover:border-accent',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/** The reason field: tall enough to write a sentence in, and resizable down the column. */
const REASON_CONTROL_CLASSES = `${FIELD_CONTROL_CLASSES} min-h-24 resize-y`;

/** A field's requirement, in the secondary text role. */
const MESSAGE_CLASSES = 'text-12 text-text-secondary';

/** A field's blocker, in the `fail` status role: the sentence itself says what is wrong. */
const MESSAGE_PROBLEM_CLASSES = 'text-12 text-status-fail';

/** The region that reports a call which did not complete, bounded in the `fail` status role. */
const FAILURE_CLASSES =
  'flex min-w-0 flex-col gap-1 rounded-card border border-status-fail bg-surface-2 p-3';

/** The failure region's heading. */
const FAILURE_HEADING_CLASSES = 'text-13 font-medium text-text-primary';

/** The service's own sentence for the failure, wrapping inside the region. */
const FAILURE_MESSAGE_CLASSES = 'min-w-0 break-words text-13 text-text-primary';

/** The carried members of a failure, as name-and-value pairs. */
const FAILURE_LIST_CLASSES = 'flex min-w-0 flex-col gap-1 text-12';

/** One name-and-value pair of the failure's carried members. */
const FAILURE_ROW_CLASSES = 'flex min-w-0 flex-wrap items-baseline gap-1';

/** The name in a failure pair: the secondary text role, so the value reads first. */
const FAILURE_TERM_CLASSES = 'text-text-secondary';

/** The value in a failure pair, in the mono face because every member is an identifier or a slug. */
const FAILURE_VALUE_CLASSES = 'min-w-0 break-words font-mono text-text-primary';

/** The busy region: a persistent live region whose sentence appears while the request is in flight. */
const BUSY_CLASSES = 'text-12 text-text-secondary';

/** The action row: secondary first, the one action the dialog exists to take last. */
const ACTIONS_CLASSES = 'flex flex-wrap items-center justify-end gap-2';

/** Joins the class lists that are present, so an omitted entry leaves no double space behind. */
function joinClassNames(...values: readonly string[]): string {
  return values.filter((value) => value.length > 0).join(' ');
}

/* ---------------------------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------------------------- */

/**
 * One persona the caller offers as the request's second approver.
 *
 * Declared here rather than in `src/types` because it is not a contract shape: it is the projection
 * this dialog's select needs of a persona record, and `ActiveUser` satisfies it as it stands. The
 * dialog sorts, filters and counts nothing, so the three members the select renders are all it takes.
 */
export interface GrantExceptionApprover {
  /** The persona's identifier, as the record set states it, which is what the request records. */
  readonly id: UserId;

  /** The persona's synthetic name, from the record set (rule P-7). */
  readonly name: string;
}

/**
 * What the screen that owns the grant flow hands the dialog: the policy the exception is requested
 * against, its display label, the personas offered as the second approver, and what closing does. The
 * policy arrives rather than being read, because the dialog collects the three terms and records one
 * pending request and nothing else (rule P-2); it calls `onClose` on `Esc`, on Cancel and once a
 * request is recorded, and never after a call that failed (rule P-8).
 */
export interface GrantExceptionDialogProps {
  /** The policy the exception is requested against. */
  readonly policyId: PolicyId;

  /**
   * The policy's display label, supplied by the caller from the policy record. The dialog types no
   * policy name of its own (rule P-6).
   */
  readonly policyLabel: string;

  /**
   * What closing the dialog does: the caller stops rendering it. This component calls it on `Esc`, on
   * Cancel and once a request has been recorded, and never on a failed call — a failure keeps the
   * dialog open with the terms still filled in.
   */
  readonly onClose: () => void;

  /**
   * What the caller does with the pending request the service returned, when it wants to do anything
   * with it — refresh the policy's lands, announce it, close a parent panel. Called once, before
   * {@link onClose}.
   */
  readonly onSubmitted?: ((created: PolicyException) => void) | undefined;

  /**
   * The personas the caller offers as the second approver.
   *
   * Absent or empty, the select offers no choice and the submit is disabled with a sentence naming the
   * missing read (see the module header on the candidates). The dialog never invents a persona and never
   * imports the record set it would find them in (rule P-2).
   */
  readonly secondApprovers?: readonly GrantExceptionApprover[] | undefined;
}

/**
 * What the dialog shows when a call did not record the request.
 *
 * A single value in a single state slot, because the failure has two shapes and the region must never
 * render a `Problem` member the throw did not carry: the service's own `Problem`, rendered with every
 * member it holds, or a call that stopped for something else, which gets this module's sentence rather
 * than a fabricated `Problem`.
 */
type SubmitFailure =
  | { readonly kind: 'problem'; readonly problem: Problem }
  | { readonly kind: 'unreported' };

/** One name-and-value pair of a failure's carried members. */
interface FailureDetail {
  /** The member's caption. */
  readonly term: string;

  /** The member's value, exactly as the service supplied it. */
  readonly value: string;
}

/** Whether a thrown value names one of the causes the port's `Problem` vocabulary fixes. */
function isProblemType(value: string): value is ProblemType {
  return PROBLEM_TYPES.some((type) => type === value);
}

/**
 * Narrows a thrown value to the service's own failure shape.
 *
 * The port fails by throwing a `Problem` (AAP 0.2.2), so this is the shape the dialog renders; a throw
 * of another shape is reported by {@link SubmitFailure}'s `'unreported'` case rather than being
 * rendered through a cast or swallowed.
 */
function isProblem(thrown: unknown): thrown is Problem {
  if (typeof thrown !== 'object' || thrown === null) {
    return false;
  }

  if (!('type' in thrown) || !('message' in thrown)) {
    return false;
  }

  const { type, message } = thrown;

  return typeof type === 'string' && typeof message === 'string' && isProblemType(type);
}

/**
 * The instant a chosen expiry date names: the start of that date, in the offset the demonstration
 * clock carries.
 *
 * The port takes an ISO 8601 instant and SCR-07's term is a calendar date, so the two have to meet
 * somewhere; this is the whole of that meeting. It reads no clock, computes no zone change and types
 * no date — the offset comes from `DEMO_CLOCK` itself (see the module header on the expiry).
 */
function expiryInstantOf(date: string): Timestamp {
  return `${date}T00:00:00${DEMO_CLOCK_OFFSET}`;
}

/** The focusable elements of the dialog, in document order, which is the order `Tab` follows. */
function focusableElementsOf(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>('textarea, input, select, button'));
}


/**
 * The blocker the chosen expiry carries, or `null` when the date can be sent.
 *
 * One sentence per way a date fails: nothing chosen, a value that is not a calendar date, and a date
 * that is not after the demonstration clock's date. The last comparison is a lexicographic one over ISO
 * 8601 dates, which is a time comparison for that format and needs no arithmetic and no zone.
 */
function expiryBlockerOf(value: string): string | null {
  if (value === '') {
    return GRANT_EXCEPTION_DIALOG_TEXT.expiryRequired;
  }

  if (!ISO_DATE_PATTERN.test(value)) {
    return GRANT_EXCEPTION_DIALOG_TEXT.expiryNotADate;
  }

  if (value <= DEMO_CLOCK_DATE) {
    return GRANT_EXCEPTION_DIALOG_TEXT.expiryNotAfterClock;
  }

  return null;
}

/**
 * The members a `Problem` carries, as name-and-value pairs, in the order a reader needs them: the
 * permission and the roles that hold it, then the policy and the alternative it permits, then the
 * correlation identifier.
 *
 * Nothing is composed: each pair exists only when the `Problem` carries that member, and each value is
 * rendered exactly as the service supplied it (rule P-6). `traceId` is the one member every `Problem`
 * has, so it is always the last pair.
 */
function failureDetails(problem: Problem): FailureDetail[] {
  const details: FailureDetail[] = [];

  if (problem.requiredPermission !== undefined) {
    details.push({
      term: GRANT_EXCEPTION_DIALOG_TEXT.permissionCaption,
      value: problem.requiredPermission,
    });
  }

  if (problem.rolesWithPermission !== undefined && problem.rolesWithPermission.length > 0) {
    details.push({
      term: GRANT_EXCEPTION_DIALOG_TEXT.rolesCaption,
      value: problem.rolesWithPermission.join(', '),
    });
  }

  if (problem.policyId !== undefined) {
    details.push({ term: GRANT_EXCEPTION_DIALOG_TEXT.refusalPolicyCaption, value: problem.policyId });
  }

  if (problem.permittedAlternative !== undefined) {
    details.push({
      term: GRANT_EXCEPTION_DIALOG_TEXT.alternativeCaption,
      value: problem.permittedAlternative,
    });
  }

  details.push({ term: GRANT_EXCEPTION_DIALOG_TEXT.traceCaption, value: problem.traceId });

  return details;
}

/* ---------------------------------------------------------------------------------------------
 * The cache a recorded request moves — AAP 0.6.2
 * ------------------------------------------------------------------------------------------- */

/** A port member that can hold a cached read, named from the interface rather than typed as a string. */
type CachedRead = keyof SiteIntelligenceService;

/**
 * Invalidates every cached entry of each read a recorded request moved.
 *
 * Every entry is keyed `[method, ...args]` (AAP 0.6.2), so naming a member invalidates every entry of
 * that read under every argument list — TanStack Query's default match is by key prefix. The adapter's
 * records are shared, so that granularity is what the write needs: a request recorded against one
 * policy moves the ledger the sovereignty read reports and the trail the audit read lists as well,
 * which is why the three reads are named rather than the one the request was made against.
 *
 * The members are the port's own, which is what lets this dialog hold the list at all — the port is
 * the only shared vocabulary between a screen and the adapters (rule P-2) — and nothing here reaches
 * into `src/app`, which a feature module may not import (AAP 0.18.1 "Boundary discipline").
 *
 * @param queryClient The client this dialog obtained with `useQueryClient()`.
 * @param reads The port members the write touched. An empty list invalidates nothing.
 */
function invalidateReads(queryClient: QueryClient, reads: readonly CachedRead[]): void {
  for (const read of reads) {
    void queryClient.invalidateQueries({ queryKey: [read] });
  }
}

/* ---------------------------------------------------------------------------------------------
 * The dialog — AAP 0.12.4 SCR-07, rule P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * SCR-07's grant flow, as a modal dialog over the screen that offered it.
 *
 * It collects the three terms SCR-07 fixes, keeps them in the five pieces of state that describe the
 * form — the three values, whether the request is in flight, and the failure it came back with where
 * there is one — derives every message and every disabled state from those values rather than storing
 * them, and sends exactly one `requestPolicyException` call when the terms are complete.
 *
 * The dialog is the only element that knows the element that opened it, which is why restoring focus
 * is its work: the opener is recorded when the dialog mounts and focused again when it unmounts, on
 * `Esc`, on Cancel and after a recorded request alike.
 *
 * @param props The policy the request is made against, its label, what closing does, what a recorded
 *   request is handed to, and the personas the caller offers as the second approver.
 * @returns The modal dialog, which the caller stops rendering when it closes.
 */
export function GrantExceptionDialog({
  policyId,
  policyLabel,
  onClose,
  onSubmitted,
  secondApprovers,
}: GrantExceptionDialogProps): ReactElement {
  const service = useService();
  const queryClient = useQueryClient();

  const [reason, setReason] = useState('');
  const [expiry, setExpiry] = useState('');
  const [secondApproverId, setSecondApproverId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<SubmitFailure | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);

  const headingId = useId();
  const summaryId = useId();
  const reasonId = useId();
  const reasonMessageId = useId();
  const expiryId = useId();
  const expiryMessageId = useId();
  const approverId = useId();
  const approverMessageId = useId();

  const candidates = secondApprovers ?? [];
  const trimmedReason = reason.trim();

  const reasonBlocker = trimmedReason === '' ? GRANT_EXCEPTION_DIALOG_TEXT.reasonRequired : null;
  const expiryBlocker = expiryBlockerOf(expiry);
  const approverBlocker =
    candidates.length === 0
      ? GRANT_EXCEPTION_DIALOG_TEXT.noApproverOffered
      : secondApproverId === ''
        ? GRANT_EXCEPTION_DIALOG_TEXT.approverRequired
        : null;

  /* Every blocker in the order the fields appear, so the sentence the disabled submit carries names the
     first thing the reader has to fix; while a request is in flight that state outranks all of them. */
  const submitBlocker = submitting
    ? GRANT_EXCEPTION_DIALOG_TEXT.submitInFlight
    : (reasonBlocker ?? expiryBlocker ?? approverBlocker);

  /* Focus moves into the dialog as it opens and returns to whatever opened it as it closes. The opener
     is read in this pass rather than in a later one, because the first field is focused straight after
     and `document.activeElement` would already be that field. */
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    reasonRef.current?.focus();

    return () => {
      opener?.focus();
    };
  }, []);

  /**
   * `Esc` closes the dialog and `Tab` stays inside it.
   *
   * The handler sits on the dialog element rather than on the document, so it sees a key pressed
   * anywhere inside the dialog and nothing pressed outside it, and no listener outlives the component.
   * While a request is in flight `Esc` is ignored: the call has been sent and cannot be withdrawn, and
   * closing would discard the answer that decides what the reader is told.
   */
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();

      if (!submitting) {
        onClose();
      }

      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    const focusables = focusableElementsOf(dialog);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (first === undefined || last === undefined) {
      return;
    }

    const active = document.activeElement;
    const isOutside = active === null || !dialog.contains(active);

    if (event.shiftKey) {
      if (active === first || isOutside) {
        event.preventDefault();
        last.focus();
      }

      return;
    }

    if (active === last || isOutside) {
      event.preventDefault();
      first.focus();
    }
  };

  /**
   * Sends the request once, through the port.
   *
   * On success the reads the write touched are invalidated (AAP 0.6.2), the caller is handed the record
   * the service returned and the dialog closes; on a refusal or another throw the dialog stays open with
   * its terms intact, the failure is rendered and the submit becomes usable again, so nothing a reader
   * typed is lost and no failure is swallowed (AAP 0.2.2). A refused call invalidates nothing, because no
   * record moved.
   */
  const submit = async (): Promise<void> => {
    if (submitBlocker !== null) {
      return;
    }

    setFailure(null);
    setSubmitting(true);

    try {
      const result = await service.requestPolicyException({
        policyId,
        reason: trimmedReason,
        expiresAt: expiryInstantOf(expiry),
        secondApproverId,
      });

      setSubmitting(false);

      /* The three reads this write touched: `getPolicy`, for the policy the request was recorded
         against, then the two reads of the same governance family — `getSovereigntyStatus`, whose
         payload carries the ledger computed from the audit trail this write appends to, and
         `listAuditEvents`, which shows the appended event. Issued before the caller is told the request
         was recorded, so a surface that stays mounted reads the post-write payload rather than the one
         it cached before the write. */
      invalidateReads(queryClient, ['getPolicy', 'getSovereigntyStatus', 'listAuditEvents']);

      onSubmitted?.(result.data);
      onClose();
    } catch (thrown) {
      setSubmitting(false);
      setFailure(
        isProblem(thrown) ? { kind: 'problem', problem: thrown } : { kind: 'unreported' },
      );
    }
  };

  const reasonMessage = reasonBlocker ?? GRANT_EXCEPTION_DIALOG_TEXT.reasonHint;
  const expiryMessage = expiryBlocker ?? GRANT_EXCEPTION_DIALOG_TEXT.expiryHint;
  const approverMessage = approverBlocker ?? GRANT_EXCEPTION_DIALOG_TEXT.approverHint;

  /* The `fail` role marks a value that was entered and cannot be accepted, never a field that is still
     empty: a term left blank is an instruction to fill it in, and painting three red sentences over a
     form nobody has touched yet would say something is wrong when nothing is. */
  const expiryValueInvalid = expiry !== '' && expiryBlocker !== null;

  return (
    <div className={OVERLAY_CLASSES}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={summaryId}
        aria-busy={submitting ? true : undefined}
        className={DIALOG_CLASSES}
        onKeyDown={handleKeyDown}
      >
        <Card as="div">
          <div className={HEADER_CLASSES}>
            <div className={HEADING_GROUP_CLASSES}>
              <DialogHeading id={headingId} className={HEADING_CLASSES}>
                {GRANT_EXCEPTION_DIALOG_TEXT.heading}
              </DialogHeading>
              <p className={POLICY_CAPTION_CLASSES}>
                {GRANT_EXCEPTION_DIALOG_TEXT.policyCaption} {policyLabel}
              </p>
            </div>
            <span className={TAG_CLASSES}>{SIMULATED_CONTROL_LABEL}</span>
          </div>

          <p id={summaryId} className={SUMMARY_CLASSES}>
            {GRANT_EXCEPTION_DIALOG_TEXT.summary}
          </p>

          <div className={FIELD_GROUP_CLASSES}>
            <label htmlFor={reasonId} className={LABEL_CLASSES}>
              {GRANT_EXCEPTION_DIALOG_TEXT.reasonLabel}
            </label>
            <TextAreaField
              id={reasonId}
              ref={reasonRef}
              className={REASON_CONTROL_CLASSES}
              value={reason}
              aria-required="true"
              aria-describedby={reasonMessageId}
              onChange={setReason}
            />
            <p id={reasonMessageId} className={MESSAGE_CLASSES}>
              {reasonMessage}
            </p>
          </div>

          <div className={FIELD_GROUP_CLASSES}>
            <label htmlFor={expiryId} className={LABEL_CLASSES}>
              {GRANT_EXCEPTION_DIALOG_TEXT.expiryLabel}
            </label>
            <TextField
              id={expiryId}
              type="date"
              className={FIELD_CONTROL_CLASSES}
              value={expiry}
              min={DEMO_CLOCK_DATE}
              aria-required="true"
              aria-describedby={expiryMessageId}
              aria-invalid={expiryValueInvalid ? true : undefined}
              onChange={setExpiry}
            />
            <p
              id={expiryMessageId}
              className={expiryValueInvalid ? MESSAGE_PROBLEM_CLASSES : MESSAGE_CLASSES}
            >
              {expiryMessage}
            </p>
          </div>

          <div className={FIELD_GROUP_CLASSES}>
            <label htmlFor={approverId} className={LABEL_CLASSES}>
              {GRANT_EXCEPTION_DIALOG_TEXT.approverLabel}
            </label>
            <SelectField
              id={approverId}
              className={FIELD_CONTROL_CLASSES}
              value={secondApproverId}
              options={[
                { value: '', label: GRANT_EXCEPTION_DIALOG_TEXT.approverPlaceholder },
                ...candidates.map((candidate) => ({
                  value: candidate.id,
                  label: `${candidate.name} (${candidate.id})`,
                })),
              ]}
              aria-required="true"
              aria-describedby={approverMessageId}
              onChange={setSecondApproverId}
            />
            <p id={approverMessageId} className={MESSAGE_CLASSES}>
              {approverMessage}
            </p>
          </div>

          {failure === null ? null : (
            <div role="alert" className={FAILURE_CLASSES}>
              <p className={FAILURE_HEADING_CLASSES}>{GRANT_EXCEPTION_DIALOG_TEXT.failureTitle}</p>
              {failure.kind === 'problem' ? (
                <>
                  <p className={FAILURE_MESSAGE_CLASSES}>{failure.problem.message}</p>
                  <dl className={FAILURE_LIST_CLASSES}>
                    {failureDetails(failure.problem).map((detail) => (
                      <div key={detail.term} className={FAILURE_ROW_CLASSES}>
                        <dt className={FAILURE_TERM_CLASSES}>{detail.term}</dt>
                        <dd className={FAILURE_VALUE_CLASSES}>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className={FAILURE_MESSAGE_CLASSES}>
                  {GRANT_EXCEPTION_DIALOG_TEXT.unreportedFailure}
                </p>
              )}
            </div>
          )}

          <p role="status" className={BUSY_CLASSES}>
            {submitting ? GRANT_EXCEPTION_DIALOG_TEXT.busy : ''}
          </p>

          <div className={ACTIONS_CLASSES}>
            {submitting ? (
              <ActionButton disabled disabledReason={GRANT_EXCEPTION_DIALOG_TEXT.cancelInFlight}>
                {GRANT_EXCEPTION_DIALOG_TEXT.cancel}
              </ActionButton>
            ) : (
              <ActionButton onClick={onClose}>{GRANT_EXCEPTION_DIALOG_TEXT.cancel}</ActionButton>
            )}

            {submitBlocker === null ? (
              <ActionButton
                variant="primary"
                onClick={() => {
                  void submit();
                }}
              >
                {GRANT_EXCEPTION_DIALOG_TEXT.submit}
              </ActionButton>
            ) : (
              <ActionButton variant="primary" disabled disabledReason={submitBlocker}>
                {GRANT_EXCEPTION_DIALOG_TEXT.submit}
              </ActionButton>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
