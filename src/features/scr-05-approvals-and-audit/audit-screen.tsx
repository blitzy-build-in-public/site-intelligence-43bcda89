/**
 * The audit trail of SCR-05: the filterable table of the hash chain's events, the detail drawer that
 * shows the values an action changed, and the verification that recomputes every hash in the browser
 * and reports the position of the first break.
 *
 * WHAT THIS SCREEN IS. `platform-specification.md` §7 SCR-05 pairs the approvals inbox with the audit
 * trail, and the SCR-05 row of AAP 0.12.4 fixes this half of it: "the audit table is filterable with a
 * detail drawer showing before and after, and 'Verify chain' recomputes every hash in the browser".
 * The screen implements the interface half of the mechanism AAP 0.8 sets out for
 * `platform-contracts.md` §6 and serves F6 (the append-only chain and its verification) and F9
 * (screens SCR-01 to SCR-07 of stage S1). It is the surface T-09 (the audit trail), T-16 (the keyboard
 * and axe pass) and T-17 (the tampered chain, triggered only from the single simulation popover)
 * assert.
 *
 * WHERE THE DATA COMES FROM, AND WHERE IT DOES NOT. Both reads go through `useService()` — rule P-2
 * binds every read to the one typed port, so this module imports no seed record, no mock or API-client
 * module, no domain module and no React Router: `listAuditEvents` returns the trail the filter admits
 * and `verifyAuditChain` returns the report. Verification is deliberately *not* performed here. In
 * particular this file does not import `src/domain/audit/*` and computes no digest of its own: the
 * hashes are the in-browser adapter's work, and a screen that recomputed one would be a second opinion
 * on the record instead of a report of the record.
 *
 * WHAT THE SCREEN SHOWS OF THE CHAIN. One row per event: its stored sequence, its identifier, the
 * instant it was recorded, the actor type and actor, the action, the record it is about, its outcome
 * and, where a policy decided it, the policy. The default order is the service's own — the chain's
 * strictly increasing sequence — and the table's sort is presentation only: it reorders rows and never
 * renumbers, re-derives or hides a sequence, so the position a row prints is always the position the
 * chain gave it. Activating a row opens the detail drawer, which prints the event's own fields and its
 * `before` and `after` payloads side by side as escaped markup (never through
 * `dangerouslySetInnerHTML`), traps focus while it is open, closes on `Esc` and returns focus to the
 * row that opened it.
 *
 * WHAT THE VERIFICATION DOES AND DOES NOT CLAIM. "Verify chain" is an action, not a read on load: one
 * activation is one call, whose report is held in this component's state and shown as the number of
 * events checked plus either a pass reading or the position of the first break with its event
 * identifier and the total count when the report holds more than one. It repairs nothing — no event is
 * re-hashed, re-sequenced or dropped, here or anywhere else — and the screen says so rather than
 * implying that a clean report keeps the record clean. Every claim the application may not make is
 * absent by omission: nothing here states that the chain resists tampering, prevents copying or
 * establishes anything about the store behind a browser page (rule P-4).
 *
 * HOW LONG A REPORT LIVES. Until the next activation replaces it, or until the records behind the
 * trail are re-issued — whichever comes first. A report describes the chain as it stood at the moment
 * of the check, and the application re-issues its reads whenever a record may have moved: every write,
 * every simulation trigger and `Reset demo data` invalidate the query cache. So this screen subscribes
 * to that cache and drops the report when the trail's own read is invalidated, rather than leaving a
 * verdict about an edited chain standing above the restored one it no longer describes. A reader's
 * filter change reads a different cache entry and invalidates nothing, so narrowing the trail never
 * discards a verdict.
 *
 * THE FIXED NOTE, AND WHY IT AND THE CLAIM SCAN HOLD TOGETHER. {@link AUDIT_CHAIN_NOTE} is the
 * sentence the "Verify chain" row of AAP §0.10 and the SCR-05 row of AAP §0.12.4 fix for this screen,
 * and rule P-4 requires the chain to carry it. It is rendered character for character: it names the
 * condition it denies — that what it shows is not the resistance of a production store — and that
 * denial is the whole point of the sentence.
 *
 * Neither side moves for the scan to pass. The claim patterns reject exactly the five adjectival forms
 * AAP §0.10 names — one for a proof against tampering, one for a resistance to it, one for a
 * trusting-nothing posture, one for a guarantee and one for a certification — and stop deliberately
 * short of the noun phrase this note carries, because the note *denies* the claim rather than making
 * it, and a pattern that reached the noun would forbid the very sentence rule P-4 requires. Both
 * halves of the rule prove it: `tests/source-checks/forbidden-strings.test.ts` lists the note among
 * the interface text its scan must leave alone (`REQUIRED_INTERFACE_TEXT`), and
 * `e2e/bundle-checks.spec.ts` does the same over the built `dist/` (`SAMPLES_THAT_MUST_NOT_MATCH`).
 * No file is exempt on either side, this one included.
 *
 * LABELLING (rules P-1 and P-4). The chain and its verification carry the exact `Simulated control`
 * string of specification §5.3 next to the instant of the check, and the persistent `Simulated data`
 * badge the shell mounts on every route covers the page. Every figure on screen comes from a record:
 * the checked count, the break's position and the total are the report's own members, the table's
 * cells are the events' own fields, and no number, currency amount or record identifier is typed into
 * this file (rule P-6, and `tests/source-checks/no-typed-figures.test.ts` scans this folder).
 *
 * THE SEVEN STATES. Every read-driven screen renders inside `StateBoundary` (AAP 0.12.4) and the state
 * is derived once, in `src/components/screen-state.ts`, from what the query settled to and from the
 * freshness report the result carries: a refusal is the state the cause names, a pending read is
 * `loading`, a source that did not answer is `offline`, an order book reported `stale` is `stale`, a
 * source that answered incompletely is `partial`, and an empty result is `empty`. Each state therefore
 * describes what a source did, and none is inferred from the shape of a record the table happens to
 * hold. `StateBoundary` owns what each state looks like, so no banner, skeleton or denial card is
 * composed here.
 *
 * THE COMPONENTS THIS FILE OWNS. No drawer primitive for arbitrary payloads exists in `src/components`
 * — `EvidenceDrawer` is bound to an evidence reference — so {@link AuditDetailDrawer} is a
 * non-exported component in this file. `TextField` and `SelectField` own the `<input>` and the
 * `<select>` the filters need (AAP §0.5.2), so {@link FilterTextField} and {@link FilterChoiceField}
 * compose those primitives and render no native control themselves; each stays a non-exported
 * component of this file because it binds the primitive to one filter's visible label and hint, which
 * is this screen's own copy.
 *
 * THE READING, THE FILTERS AND A FAILURE THE MAPPING CANNOT NAME. `AuditResult` and `ProblemType` are
 * types in `src/types` with no runtime member list beside them, so the option lists below are declared
 * here and typed against those unions: a member the union gains or loses fails this file's compilation
 * instead of being hand-typed into a control. The port's `listAuditEvents(query)` takes no scope,
 * because the chain is not plant-scoped — a persona either holds `audit.read` or does not — so the
 * scope this screen receives is carried in the query *key*, a scope change re-reads the trail as every
 * other screen's reads do, and the request itself stays exactly the port's signature. A failure whose
 * cause the state mapping does not name — a `policy` or `simulated-write-back` refusal of a list read —
 * is rendered `offline`: the boundary's offline rendering withholds content, says nothing answered and
 * offers a retry, and a cause it cannot name must not be presented as content that exists. A
 * `not-found` refusal is `empty` on every screen, from the one mapping in
 * `src/components/screen-state.ts`.
 *
 * Rules this module is built to satisfy:
 * - P-1: the chain's verification carries its own `Simulated control` label beside the figures it
 *   reports, and the screen states no computed figure without one.
 * - P-2: both reads go through `useService()`; no seed, adapter, domain or HTTP module is reachable.
 * - P-4: the fixed note, the chain's label and the absence of every claim about resistance, copying or
 *   sovereignty.
 * - P-6: no typed figure, amount or record identifier; every value is a record's own.
 * - P-7: every name on screen is a seeded persona, policy or record reference; no real company,
 *   customer, carmaker or cloud product is named and no placeholder prose stands in for a record.
 * - P-8: "Verify chain" and every control either act or are disabled with their reason, and the
 *   verification control states why it cannot run while a check is already in flight.
 * - B-3: WCAG 2.2 AA — the table's caption and scoped headers come from `DataTable`, every filter has a
 *   visible label, the drawer is an `aria-modal` dialog with a name that traps focus and returns it on
 *   `Esc`, the verification result is a `role="status"` region, targets are at least 24 by 24 px and
 *   every colour is a role token of `src/theme/tokens.css`.
 * - B-1, B-2: nothing here fetches, names an address, reads an environment value or carries a
 *   credential; the whole screen is in-browser computation over records the service already holds.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode } from 'react';

import { DataTable } from '../../components/data-table';
import type { TableColumn, TableSort } from '../../components/data-table';
import { DialogHeading } from '../../components/dialog-heading';
import { MonoValue } from '../../components/mono-value';
import type { MonoValueKind } from '../../components/mono-value';
import { PageHeader } from '../../components/page-header';
import { Panel } from '../../components/panel';
import {
  deriveScreenState,
  forbiddenOf,
  isProblem,
  staleSourceOf,
} from '../../components/screen-state';
import { SelectField } from '../../components/select-field';
import { StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { StateBoundary } from '../../components/state-boundary';
import { TextField } from '../../components/text-field';
import { ActionButton } from '../../components/tooltip';
import { useService } from '../../services/service-provider';
import { APPROVAL_GATE_SOURCE, SIM_LABELS } from '../../types';
import type {
  AuditEvent,
  AuditPayload,
  AuditQuery,
  AuditResult,
  ChainBreak,
  ChainReport,
  Result,
  Scope,
  SimLabel,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The fixed string, held once
 * ------------------------------------------------------------------------------------------- */

/**
 * The note every surface of the audit chain carries, character for character as the "Verify chain" row
 * of AAP §0.10 and the SCR-05 row of AAP §0.12.4 fix it, and as rule P-4 requires the chain to carry
 * it.
 *
 * Exported so the colocated suite imports it rather than re-spelling it: a reworded note then fails a
 * test instead of being silently accepted. It is the sentence that *denies* the claim the application
 * may never make, which is why it is rendered exactly — see the module documentation for the two halves
 * of the rule that let the note and the claim scan pass together: the source check lists the note among
 * the text its scan must leave alone, and the bundle scan does the same over `dist/`.
 */
export const AUDIT_CHAIN_NOTE =
  'Simulated control: this shows the mechanism, not production tamper resistance.';

/**
 * The `Simulated control` label of specification §5.3, read from `SIM_LABELS` at the index §5.3 gives
 * it.
 *
 * The tuple holds the seven fixed strings once (AAP 0.10), so this screen carries the label rather
 * than a copy of it: the string the chain and its verification print is the same one the sovereignty
 * pill and the simulation popover print, and a reworded label reaches every surface at once. Typed
 * `SimLabel`, so a member the union gains or loses fails this file's compilation (rule P-1).
 */
const CHAIN_LABEL: SimLabel = SIM_LABELS[4];

/* ---------------------------------------------------------------------------------------------
 * The screen's own wording — no input fixes these sentences
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this screen states in its own voice, held here so the wording has one owner and the
 * fixed strings above are never confused with it.
 *
 * A displayed string no input fixes is the screen author's own plain wording — the same arrangement
 * `STATE_BOUNDARY_TEXT` and `WRITE_BACK_TAG`'s module use — and it types no figure (rule P-6): no
 * sentence below carries a number, an amount or a record identifier.
 */
const SCREEN_TEXT = {
  /** The screen's title, in the one `<h1>` it renders. */
  title: 'Audit trail',

  /** What the trail is, under the title. */
  description:
    'Every action this workspace records, in chain order, with the values each action changed.',

  /** The caption of the group holding the verification control and its note. */
  verificationGroup: 'Chain verification',

  /** The caption of the group holding the trail's filters. */
  filterGroup: 'Filters',

  /** The label of the control that recomputes every hash. */
  verifyChain: 'Verify chain',

  /** Why the verification control cannot act while a check is already running (rule P-8). */
  verifyInFlightReason: 'A verification of the chain is already running.',

  /** The pass reading of a report that found no break. */
  verifiedHeadline: 'The chain verified at the moment of this check',

  /** What the check did, before the count the report supplies. */
  checkedPrefix: 'Every hash in the chain was recomputed in this browser, across',

  /** What a break means, before the first break's position. */
  breakPrefix: 'The chain does not verify at sequence',

  /** Introduces the identifier of the event at the first break. */
  breakEventPrefix: 'reported as event',

  /** Shown when the report holds more than one break, before the total the report supplies. */
  additionalBreaksPrefix: 'Positions that do not verify in total:',

  /** The option that leaves the outcome unfiltered. */
  anyOutcome: 'Any outcome',

  /**
   * What the action filter accepts: the trail keeps the events whose action is this exact token, which
   * `src/services/mock/handlers/audit.ts` decides, so a reader is told the word has to be spelled the
   * way the record states it rather than guessed at.
   */
  actionHint: 'The trail matches the action exactly, so spell it the way the record states it.',

  /** What the earliest-instant filter accepts, since the field takes an instant rather than a date. */
  fromHint: 'Earliest instant, with its offset.',

  /** What the latest-instant filter accepts. */
  toHint: 'Latest instant, with its offset.',

  /** The statement that the check changed nothing — the one claim a verification may make. */
  unchanged: 'This check changed no record: nothing was re-hashed, re-sequenced or removed.',

  /** The fail reading of a verification that could not run at all. */
  verifyFailedHeadline: 'The chain could not be verified',

  /** The detail shown when a failed verification carried no message of its own. */
  verifyFailedDetail: 'The service did not answer the verification, so nothing is reported here.',

  /** The sentence shown in the table and the empty state when no event matches the filters. */
  empty: 'No audit events match these filters.',

  /** The partial state's sentence, naming the incomplete answer behind the trail. */
  partial:
    'A source behind this trail answered incompletely, so the events listed are the ones the records could report.',

  /** The conflict state's sentence. */
  conflict: 'The trail was read against records that changed while this view was open.',

  /** The accessible name of the table. */
  tableCaption: 'Audit events, in chain order',

  /** The drawer's heading, before the event's own identifier. */
  drawerTitlePrefix: 'Audit event',

  /** The drawer's close control. */
  closeDetail: 'Close event detail',

  /** The drawer's caption over the event's own fields. */
  eventFields: 'Event',

  /** The drawer's caption over the payload the action started from. */
  beforeCaption: 'Before',

  /** The drawer's caption over the payload the action produced. */
  afterCaption: 'After',

  /** What a payload side shows when the action created or removed the record. */
  noPayload: 'No values are recorded on this side.',

  /** The caption of the sequence field. */
  sequence: 'Sequence',

  /** The caption of the identifier field. */
  identifier: 'Event',

  /** The caption of the instant field. */
  recorded: 'Recorded',

  /** The caption of the actor type field. */
  actorType: 'Actor type',

  /** The caption of the actor field. */
  actor: 'Actor',

  /** The caption of the action field. */
  action: 'Action',

  /** The caption of the record field. */
  objectRef: 'Record',

  /** The caption of the earliest-instant filter. */
  from: 'From',

  /** The caption of the latest-instant filter. */
  to: 'To',

  /** The caption of the outcome field. */
  result: 'Outcome',

  /** The caption of the policy field. */
  policy: 'Policy',

  /** The caption of the correlation identifier field. */
  traceId: 'Trace',

  /** The caption of the predecessor-hash field. */
  previousHash: 'Previous hash',

  /** The caption of the event-hash field. */
  eventHash: 'Event hash',

  /** The value shown for a member a payload does not carry. */
  absentValue: 'Not recorded',

  /** The value shown for a boolean payload member that holds. */
  trueValue: 'Yes',

  /** The value shown for a boolean payload member that does not hold. */
  falseValue: 'No',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The filters — `AuditQuery`'s own members, and nothing beside them
 * ------------------------------------------------------------------------------------------- */

/**
 * The outcome members `AuditResult` declares, in the contract's own spelling.
 *
 * `AuditResult` is a type in `src/types/audit.ts` with no runtime member list beside it, so the
 * options a control offers have to be declared somewhere; declaring them here typed against the union
 * is what keeps the control from acquiring a fifth outcome that the records can never hold. The same
 * arrangement serves {@link PROBLEM_TYPES} below.
 */
const RESULT_OPTIONS = [
  'allowed',
  'blocked',
  'succeeded',
  'failed',
] as const satisfies readonly AuditResult[];

/** Whether a control's value is one of `AuditResult`'s members, so no cast is needed to narrow it. */
function isAuditResult(value: string): value is AuditResult {
  return RESULT_OPTIONS.some((option) => option === value);
}

/**
 * What the filter controls hold, one member per filter `AuditQuery` declares.
 *
 * The empty string is the "no filter" selection for every member, which is what the controls start
 * at. `result` is typed to the outcome union rather than to `string`, so a value the records cannot
 * hold never reaches the query; the other five are free text because the type declares them as
 * strings — `AuditAction` is an open alias and an event's actor and record references are the
 * records' own.
 */
interface AuditFilterValues {
  /** The actor to keep — a persona identifier, or a policy identifier on a policy event. */
  readonly actorId: string;

  /** The action to keep, spelled as the appending module spelled it. */
  readonly action: string;

  /** The record to keep, matched against the event's `objectRef`. */
  readonly objectRef: string;

  /** The outcome to keep, or the empty string for any outcome. */
  readonly result: AuditResult | '';

  /** The earliest instant to keep, as the reader typed it. */
  readonly from: string;

  /** The latest instant to keep, as the reader typed it. */
  readonly to: string;
}

/** Every filter at its neutral position: the trail as the service orders it, unfiltered. */
const NO_FILTERS: AuditFilterValues = {
  actorId: '',
  action: '',
  objectRef: '',
  result: '',
  from: '',
  to: '',
};

/** The trimmed text of a filter, or `undefined` when the reader left it empty. */
function filterText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Builds the query the trail read is asked for from the filters as they stand.
 *
 * Only the members the reader actually set are sent: an absent member is an unfiltered one, which is
 * the meaning `AuditQuery`'s optional members already carry, and sending `undefined` would make the
 * cache key of two identical filters differ. `limit`, `cursor` and `sort` are deliberately absent —
 * they page and order a list rather than filter one, the chain is bounded and read whole, and the
 * table's ordering is applied to this read's own result without asking the service for a second one.
 */
function buildAuditQuery(filters: AuditFilterValues): AuditQuery {
  const actorId = filterText(filters.actorId);
  const action = filterText(filters.action);
  const objectRef = filterText(filters.objectRef);
  const from = filterText(filters.from);
  const to = filterText(filters.to);

  return {
    ...(actorId === undefined ? {} : { actorId }),
    ...(action === undefined ? {} : { action }),
    ...(objectRef === undefined ? {} : { objectRef }),
    ...(filters.result === '' ? {} : { result: filters.result }),
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The outcome's status meaning, and the ordering of the rows
 * ------------------------------------------------------------------------------------------- */

/**
 * What one audit outcome amounts to in the shared status vocabulary.
 *
 * No input fixes this mapping, so it is this screen's decision and it is made once: an outcome the
 * records mark `allowed` or `succeeded` reads as a pass, one they mark `failed` reads as a failure, and
 * one they mark `blocked` reads as a warning — the call was refused by a rule rather than failing on
 * its own, which is the condition the warning meaning exists for. The label beside the icon is always
 * the record's own spelling, so the meaning never replaces what the event says (rule B-3: the meaning
 * is carried by icon, label and colour together).
 */
const RESULT_MEANINGS = {
  allowed: 'pass',
  blocked: 'warning',
  succeeded: 'pass',
  failed: 'fail',
} as const satisfies Record<AuditResult, StatusMeaning>;

/** One column's ordering key: a number for the position, the record's own text for the rest. */
type SortAccessor = (event: AuditEvent) => string | number;

/**
 * The ordering key per sortable column, keyed by the column identifier `DataTable` reports back.
 *
 * The table's sort is presentation only: it reorders the rows this read returned and changes nothing
 * about them, so an event's sequence cell always prints the position the chain gave it. A column
 * declared sortable without an accessor here would sort as equal, which is why the two lists are
 * written together.
 */
const SORT_ACCESSORS: Readonly<Record<string, SortAccessor | undefined>> = {
  sequence: (event) => event.sequence,
  id: (event) => event.id,
  timestamp: (event) => event.timestamp,
  actorType: (event) => event.actorType,
  actorId: (event) => event.actorId,
  action: (event) => event.action,
  objectRef: (event) => event.objectRef,
  result: (event) => event.result,
  policy: (event) => event.policyId ?? '',
};

/**
 * Orders two ordering keys, without a locale.
 *
 * `localeCompare` would make the order depend on the ICU data of whichever engine runs the suite, and
 * a table whose order differed between two machines would be a demonstration that does not reproduce.
 * A code-unit comparison is the same everywhere, which is what a record's spelling supports.
 */
function compareValues(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  const leftText = String(left);
  const rightText = String(right);

  if (leftText === rightText) {
    return 0;
  }

  return leftText < rightText ? -1 : 1;
}

/**
 * The rows in the order the table shows them.
 *
 * With no sort the read's own order stands — the chain's strictly increasing sequence, which is the
 * service's and not this screen's. With a sort the rows are ordered by that column, and rows whose keys
 * are equal keep the position the chain gave them, so the ordering is total and stable across renders.
 */
function orderRows(
  rows: readonly AuditEvent[],
  sort: TableSort | null,
): readonly AuditEvent[] {
  if (sort === null) {
    return rows;
  }

  const accessor = SORT_ACCESSORS[sort.columnId];

  if (accessor === undefined) {
    return rows;
  }

  const factor = sort.direction === 'asc' ? 1 : -1;

  return [...rows].sort((left, right) => {
    const difference = compareValues(accessor(left), accessor(right));

    return difference === 0 ? left.sequence - right.sequence : difference * factor;
  });
}

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The screen: one column on the 4 px grid. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-6';

/** The verification group's row: the control, the note and whatever the last check reported. */
const VERIFICATION_ROW_CLASSES = 'flex min-w-0 flex-wrap items-start gap-3';

/** The fixed note: caption role, held to a readable measure rather than a full-width line. */
const NOTE_CLASSES = 'min-w-0 max-w-prose break-words text-13 text-text-caption';

/** The last check's report, stacked under the control that produced it. */
const REPORT_STACK_CLASSES = 'mt-3 flex min-w-0 flex-col gap-2';

/** A report's supporting sentence, one step down the type scale in the secondary text role. */
const DETAIL_CLASSES = 'min-w-0 break-words text-13 text-text-secondary';

/** The filter row: fields wrap rather than shrink below their label. */
const FILTER_ROW_CLASSES = 'flex min-w-0 flex-wrap items-start gap-3';

/** One filter: its label above its control, on the same grid step. */
const FIELD_CLASSES = 'flex min-w-0 flex-col gap-1';

/** A filter's visible label, in the caption role at the smallest step of the type scale. */
const LABEL_CLASSES = 'text-12 text-text-caption';

/**
 * A filter's control: the control boundary and the first surface, at least 24 by 24 px (rule B-3), with
 * the 2 px focus ring of the active theme drawn for keyboard focus only.
 *
 * The pointer is answered too: `hover:` lifts the boundary to the accent role, the same boundary the
 * secondary control and the simulated-data badge raise under the pointer, so a filter is not the one
 * control in the product that looks inert when it is aimed at. Nothing changes at rest — the resting
 * boundary, surface and label are exactly what they were — and a press needs no state of its own,
 * because a press on a text field *is* its focus: the caret appears and the focus ring says where the
 * reader is. `motion-safe:` gates the colour transition, so a reduced-motion session gets the same
 * hover with no transition (rule B-3), and no raw palette value, arbitrary value or shadow appears
 * here.
 */
const CONTROL_CLASSES =
  'min-h-6 min-w-32 rounded-control border border-control-boundary bg-surface-1 px-2 py-1 text-13 text-text-primary hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-safe:transition-colors motion-safe:duration-150';

/** A filter's supporting hint, under the control it explains. */
const HINT_CLASSES = 'text-12 text-text-caption';

/** The drawer's layer: the whole viewport, with the panel held to the inline end. */
const OVERLAY_CLASSES = 'fixed inset-0 z-50 flex justify-end';

/**
 * The scrim the panel stands on: the page ground at partial strength, so the content the dialog makes
 * inert reads as behind it without a second surface or a shadow (the token layer exposes no shadow).
 * It carries no control of its own — the drawer closes on `Esc` and through its own labelled control —
 * so nothing about it is interactive and it stays out of the accessibility tree.
 */
const SCRIM_CLASSES = 'absolute inset-0 bg-ground/80';

/**
 * The detail panel: full height at the inline end, on the first raised surface inside the decorative
 * hairline, scrollable on its own so a long payload does not push its close control out of reach.
 */
const DRAWER_CLASSES =
  'relative flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-s border-hairline bg-surface-1 p-4 text-14 text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';

/** The drawer's heading: the type scale's 20 px step, breakable so an identifier cannot overflow. */
const DRAWER_TITLE_CLASSES = 'min-w-0 break-words text-20 font-medium text-text-primary';

/** The drawer's field list: each caption above its value. */
const FIELD_LIST_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The two payload halves, side by side, on the 4 px grid. */
const PAYLOAD_GRID_CLASSES = 'grid grid-cols-2 gap-3';

/** One payload half: a raised surface inside the panel's hairline. */
const PAYLOAD_BLOCK_CLASSES =
  'flex min-w-0 flex-col gap-1 rounded-card border border-hairline bg-surface-2 p-2';

/** A payload half's caption. */
const PAYLOAD_CAPTION_CLASSES = 'text-12 font-medium text-text-caption';

/** One payload entry: its key above its value. */
const PAYLOAD_TERM_CLASSES = 'text-12 text-text-caption';

/** A payload value: the primary text role, broken rather than overflowing its column. */
const PAYLOAD_VALUE_CLASSES = 'min-w-0 break-words text-13 text-text-primary';

/** A nested payload value: the same treatment one step in, so depth reads as nesting. */
const PAYLOAD_NESTED_CLASSES = 'flex min-w-0 flex-col gap-1 ps-3';

/**
 * What a payload member's value is rendered as when its kind is clear from the key it sits under.
 *
 * A payload is arbitrary record content (see `AuditPayload` in `src/types/audit.ts`), so the only
 * signal available is the key: a reference, an instant, an amount and a digest each have a spelling
 * this application formats with the one presentation formatter, and everything else is shown as the
 * text the record holds rather than being formatted by a guess. The mapping changes no value
 * (rule P-6); it decides only which of the formatter's kinds applies.
 */
function monoKindForKey(key: string): MonoValueKind | undefined {
  if (/hash/i.test(key)) {
    return 'hash';
  }

  if (/(timestamp|asof|date|^at$)/i.test(key)) {
    return 'timestamp';
  }

  if (/(id|ref)$/i.test(key)) {
    return 'id';
  }

  if (/(eur|amount|cost|price|value)/i.test(key)) {
    return 'money';
  }

  return undefined;
}



/* ---------------------------------------------------------------------------------------------
 * The filter controls — this screen's labels over the `TextField` and `SelectField` primitives
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link FilterTextField}: one free-text filter, labelled and controlled. */
interface FilterTextFieldProps {
  /** The filter's visible label, which is also its control's accessible name. */
  readonly label: string;

  /** The reader's current value. */
  readonly value: string;

  /** Called with the control's value as it changes. */
  readonly onChange: (value: string) => void;

  /** An optional sentence explaining what the control accepts, tied to it by `aria-describedby`. */
  readonly hint?: string;
}

/**
 * One labelled free-text filter.
 *
 * `TextField` in `src/components` owns the `<input>` (AAP §0.5.2); this component is the one place a
 * filter's label, identifier and hint are joined to it, and the control keeps the 24 by 24 px target
 * and the theme's focus ring (rule B-3). It holds no state — the caller owns the value — so a render
 * never fights the reader's typing.
 */
function FilterTextField({ label, value, onChange, hint }: FilterTextFieldProps): ReactElement {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;

  return (
    <div className={FIELD_CLASSES}>
      <label htmlFor={fieldId} className={LABEL_CLASSES}>
        {label}
      </label>
      <TextField
        id={fieldId}
        type="text"
        value={value}
        onChange={onChange}
        aria-describedby={hint === undefined ? undefined : hintId}
        className={CONTROL_CLASSES}
      />
      {hint === undefined ? null : (
        <p id={hintId} className={HINT_CLASSES}>
          {hint}
        </p>
      )}
    </div>
  );
}

/** One option of {@link FilterChoiceField}: the value sent and the text the reader picks it by. */
interface FilterChoice {
  /** The value the filter takes when this option is chosen. */
  readonly value: string;

  /** The text shown in the option, taken from the record vocabulary it belongs to. */
  readonly label: string;
}

/** Props of {@link FilterChoiceField}: one enumerated filter, labelled and controlled. */
interface FilterChoiceFieldProps {
  /** The filter's visible label, which is also its control's accessible name. */
  readonly label: string;

  /** The reader's current value, or the empty string for no filter. */
  readonly value: string;

  /** The options offered, in the order they are shown. */
  readonly options: readonly FilterChoice[];

  /** Called with the chosen option's value. */
  readonly onChange: (value: string) => void;
}

/**
 * One labelled enumerated filter.
 *
 * `SelectField` in `src/components` owns the `<select>` (AAP §0.5.2), and its element is the
 * platform's own control — keyboard operable and announced as a list box — so a filter keeps the
 * interaction the reader's own device gives it. The options are the union's own members, supplied by
 * the caller, so the control can never offer a value the records cannot hold.
 */
function FilterChoiceField({
  label,
  value,
  options,
  onChange,
}: FilterChoiceFieldProps): ReactElement {
  const fieldId = useId();

  return (
    <div className={FIELD_CLASSES}>
      <label htmlFor={fieldId} className={LABEL_CLASSES}>
        {label}
      </label>
      <SelectField
        id={fieldId}
        value={value}
        options={options}
        onChange={onChange}
        className={CONTROL_CLASSES}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The payload markup — structured and escaped, never injected as HTML
 * ------------------------------------------------------------------------------------------- */

/**
 * The deepest container nesting this screen renders before it shows the remainder as text.
 *
 * The seeded payloads are flat records of scalars, and a record appended by a handler is the same
 * shape; the cap exists so that a payload which somehow carried a deep or self-referencing structure
 * renders a string instead of recursing without end. Nothing is dropped silently — the deepest
 * remainder is printed in full.
 */
const MAX_PAYLOAD_DEPTH = 3;

/**
 * A container's entries as key-and-value pairs, with the value typed `unknown`.
 *
 * `Object.entries` types a value's members as `any`, and no `any` may appear in this file: the
 * explicit parameter type narrows each member to `unknown` at the one place a payload is read, so every
 * value below is inspected before it is rendered.
 */
function entriesOf(container: object): readonly (readonly [string, unknown])[] {
  return Object.entries(container).map(
    ([key, member]: [string, unknown]) => [key, member] as const,
  );
}

/** Props of {@link PayloadValue}: one payload member, with the key that qualifies it. */
interface PayloadValueProps {
  /** The key the member sits under, which decides whether a formatter kind is clear from it. */
  readonly memberKey: string;

  /** The member's value, exactly as the record carries it. */
  readonly value: unknown;

  /** How deep the member already is, so a container can stop being expanded. */
  readonly depth: number;
}

/**
 * Renders one payload member.
 *
 * A scalar is shown as the record holds it: a string or a number whose key makes its kind clear goes
 * through the one presentation formatter, and every other scalar is printed as text rather than
 * formatted by a guess (rule P-6). `null` and an absent member are stated in words instead of being
 * printed as a serialisation artefact. A container is expanded into its own entries with the same
 * treatment one step in, up to {@link MAX_PAYLOAD_DEPTH}, after which it is shown as its own text.
 *
 * The markup is React's own: an element or a string is escaped by the renderer, and no payload reaches
 * the document as HTML, so a record can never introduce markup into this screen.
 */
function PayloadValue({ memberKey, value, depth }: PayloadValueProps): ReactElement {
  if (value === null || value === undefined) {
    return <span className={PAYLOAD_VALUE_CLASSES}>{SCREEN_TEXT.absentValue}</span>;
  }

  if (typeof value === 'string') {
    const kind = monoKindForKey(memberKey);

    return kind === undefined ? (
      <span className={PAYLOAD_VALUE_CLASSES}>{value}</span>
    ) : (
      <MonoValue value={value} kind={kind} className={PAYLOAD_VALUE_CLASSES} />
    );
  }

  if (typeof value === 'number') {
    const kind = monoKindForKey(memberKey);

    return kind === 'money' ? (
      <MonoValue value={value} kind="money" className={PAYLOAD_VALUE_CLASSES} />
    ) : (
      <span className={PAYLOAD_VALUE_CLASSES}>{String(value)}</span>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <span className={PAYLOAD_VALUE_CLASSES}>
        {value ? SCREEN_TEXT.trueValue : SCREEN_TEXT.falseValue}
      </span>
    );
  }

  if (depth >= MAX_PAYLOAD_DEPTH) {
    return (
      <MonoValue value={JSON.stringify(value) ?? ''} kind="id" className={PAYLOAD_VALUE_CLASSES} />
    );
  }

  return <PayloadEntries entries={entriesOf(value)} depth={depth} />;
}

/** Props of {@link PayloadEntries}: a container's entries, and how deep they already are. */
interface PayloadEntriesProps {
  /** The container's own key-and-value pairs. */
  readonly entries: readonly (readonly [string, unknown])[];

  /** How deep the container sits, so each level can be indented once and stop at the cap. */
  readonly depth: number;
}

/**
 * Renders one container's entries as a definition list.
 *
 * The list is real markup — a term and its definition per entry — rather than a serialised record, so
 * a reader hears each key beside its value and the panel stays readable at the drawer's width.
 */
function PayloadEntries({ entries, depth }: PayloadEntriesProps): ReactElement {
  return (
    <dl className={depth === 0 ? FIELD_LIST_CLASSES : PAYLOAD_NESTED_CLASSES}>
      {entries.map(([key, member]) => (
        <div key={key} className="flex min-w-0 flex-col gap-1">
          <dt className={PAYLOAD_TERM_CLASSES}>{key}</dt>
          <dd className="ms-0 min-w-0">
            <PayloadValue memberKey={key} value={member} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Props of {@link PayloadBlock}: one side of an event's payload. */
interface PayloadBlockProps {
  /** The side's caption, naming which half of the change it shows. */
  readonly caption: string;

  /** The payload, or `null` when the action created or removed the record. */
  readonly payload: AuditPayload | null;
}

/**
 * One payload half of the detail drawer.
 *
 * `null` is a state the record states rather than a value it lacks — the action created or removed the
 * record — so it is explained in words instead of being left as an empty surface.
 */
function PayloadBlock({ caption, payload }: PayloadBlockProps): ReactElement {
  return (
    <div className={PAYLOAD_BLOCK_CLASSES}>
      <p className={PAYLOAD_CAPTION_CLASSES}>{caption}</p>
      {payload === null ? (
        <p className={PAYLOAD_VALUE_CLASSES}>{SCREEN_TEXT.noPayload}</p>
      ) : (
        <PayloadEntries entries={entriesOf(payload)} depth={0} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The detail drawer
 * ------------------------------------------------------------------------------------------- */

/** Every element inside the dialog that the tab sequence may reach. */
const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The dialog's focus stops, in document order.
 *
 * A control that is disabled through the `disabled` attribute is out of the tab sequence and is
 * therefore omitted; one that refuses through `aria-disabled` stays reachable on purpose, because its
 * explanation is what a keyboard reader needs to find (rule P-8).
 */
function focusableWithin(container: HTMLElement): readonly HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

  return Array.from(nodes).filter((node) => !node.hasAttribute('disabled'));
}

/** Props of {@link DetailField}: one caption-and-value row of the drawer. */
interface DetailFieldProps {
  /** The row's caption. */
  readonly label: string;

  /** The row's value, already formed by the component that owns its kind. */
  readonly children: ReactNode;
}

/** One caption-and-value row: the caption above the value, on the same grid step. */
function DetailField({ label, children }: DetailFieldProps): ReactElement {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className={PAYLOAD_TERM_CLASSES}>{label}</dt>
      <dd className="ms-0 min-w-0 break-words text-13 text-text-primary">{children}</dd>
    </div>
  );
}

/** Props of {@link AuditDetailDrawer}. */
interface AuditDetailDrawerProps {
  /** The event whose detail is open, exactly as the trail read returned it. */
  readonly auditEvent: AuditEvent;

  /** Called when the reader dismisses the drawer, by its control or with `Esc`. */
  readonly onClose: () => void;
}

/**
 * The event's detail: its own fields, and the values the action changed.
 *
 * Declared in this file because `src/components` holds no drawer primitive for arbitrary content —
 * `EvidenceDrawer` is bound to an evidence reference — which is the gap this component reports rather
 * than papers over by widening the shared component.
 *
 * It is a real modal dialog: `role="dialog"` with `aria-modal`, named by its own heading, focus moved
 * into the panel as it opens, `Tab` and `Shift+Tab` held inside it, `Esc` closing it and focus returned
 * to the row that opened it by the caller. It renders no markup from a record, offers no control
 * beyond its close, and states nothing about what the chain resists (rule P-4).
 */
function AuditDetailDrawer({ auditEvent, onClose }: AuditDetailDrawerProps): ReactElement {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  /* Focusing the panel as it mounts is what announces the dialog and puts the tab sequence inside it.
     The callback's identity is stable, so React calls it once on mount rather than on every render —
     an unstable callback would re-focus the panel and take the focus ring off the close control. */
  const attachDialog = useCallback((node: HTMLDivElement | null): void => {
    dialogRef.current = node;
    node?.focus();
  }, []);

  const handleKeyDown = (keyEvent: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (keyEvent.key === 'Escape') {
      keyEvent.preventDefault();
      onClose();
      return;
    }

    if (keyEvent.key !== 'Tab') {
      return;
    }

    const container = dialogRef.current;

    if (container === null) {
      return;
    }

    const focusables = focusableWithin(container);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (first === undefined || last === undefined) {
      keyEvent.preventDefault();
      return;
    }

    if (keyEvent.shiftKey) {
      if (document.activeElement === first || document.activeElement === container) {
        keyEvent.preventDefault();
        last.focus();
      }

      return;
    }

    if (document.activeElement === last) {
      keyEvent.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={OVERLAY_CLASSES}>
      {/* Decoration, not a control: the drawer closes with its own labelled button and with `Esc`, so
          the scrim carries no click handler and stays out of the accessibility tree. */}
      <div aria-hidden="true" className={SCRIM_CLASSES} />
      <div
        ref={attachDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={DRAWER_CLASSES}
      >
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <DialogHeading id={titleId} className={DRAWER_TITLE_CLASSES}>
            {SCREEN_TEXT.drawerTitlePrefix} <MonoValue value={auditEvent.id} kind="id" />
          </DialogHeading>
          <ActionButton onClick={onClose}>{SCREEN_TEXT.closeDetail}</ActionButton>
        </div>

        <dl className={FIELD_LIST_CLASSES}>
          <DetailField label={SCREEN_TEXT.sequence}>{auditEvent.sequence}</DetailField>
          <DetailField label={SCREEN_TEXT.recorded}>
            <MonoValue value={auditEvent.timestamp} kind="timestamp" />
          </DetailField>
          <DetailField label={SCREEN_TEXT.actorType}>{auditEvent.actorType}</DetailField>
          <DetailField label={SCREEN_TEXT.actor}>
            <MonoValue value={auditEvent.actorId} kind="id" />
          </DetailField>
          <DetailField label={SCREEN_TEXT.action}>{auditEvent.action}</DetailField>
          <DetailField label={SCREEN_TEXT.objectRef}>{auditEvent.objectRef}</DetailField>
          <DetailField label={SCREEN_TEXT.result}>
            <StatusIndicator
              meaning={RESULT_MEANINGS[auditEvent.result]}
              label={auditEvent.result}
            />
          </DetailField>
          {auditEvent.policyId === undefined ? null : (
            <DetailField label={SCREEN_TEXT.policy}>
              <MonoValue value={auditEvent.policyId} kind="id" />
            </DetailField>
          )}
          <DetailField label={SCREEN_TEXT.traceId}>
            <MonoValue value={auditEvent.traceId} kind="id" />
          </DetailField>
          <DetailField label={SCREEN_TEXT.previousHash}>
            <MonoValue value={auditEvent.previousHash} kind="hash" />
          </DetailField>
          <DetailField label={SCREEN_TEXT.eventHash}>
            <MonoValue value={auditEvent.eventHash} kind="hash" />
          </DetailField>
        </dl>

        <div className={PAYLOAD_GRID_CLASSES}>
          <PayloadBlock caption={SCREEN_TEXT.beforeCaption} payload={auditEvent.before} />
          <PayloadBlock caption={SCREEN_TEXT.afterCaption} payload={auditEvent.after} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The verification report
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link VerificationReportPanel}. */
interface VerificationReportPanelProps {
  /** The report the last activation returned, exactly as the service produced it. */
  readonly report: ChainReport;
}

/**
 * What the last verification found, in the report's own figures.
 *
 * The panel states the count the report carries and, when it holds a break, the position of the first
 * one and the identifier of the event there — the reading AAP 0.12.1 fixes for the interface — with the
 * total only when the report holds more than one. Every figure comes from the report (rule P-6); the
 * chain's `Simulated control` label sits in the panel with them (rules P-1 and P-4), and the last
 * sentence states the one thing a verification may claim about the records: that it changed none.
 */
function VerificationReportPanel({ report }: VerificationReportPanelProps): ReactElement {
  const firstBreak: ChainBreak | undefined = report.breaks[0];

  return (
    <div role="status" className={REPORT_STACK_CLASSES}>
      <StatusIndicator
        meaning={firstBreak === undefined ? 'pass' : 'fail'}
        label={
          firstBreak === undefined
            ? SCREEN_TEXT.verifiedHeadline
            : `${SCREEN_TEXT.breakPrefix} ${firstBreak.sequence}`
        }
      />
      <p className={DETAIL_CLASSES}>
        {SCREEN_TEXT.checkedPrefix} {report.eventsChecked} recorded events.
      </p>
      {firstBreak === undefined ? null : (
        <p className={DETAIL_CLASSES}>
          {SCREEN_TEXT.breakEventPrefix} <MonoValue value={firstBreak.id} kind="id" />
        </p>
      )}
      {report.breaks.length > 1 ? (
        <p className={DETAIL_CLASSES}>
          {SCREEN_TEXT.additionalBreaksPrefix} {report.breaks.length}
        </p>
      ) : null}
      <p className={DETAIL_CLASSES}>{SCREEN_TEXT.unchanged}</p>
      <StatusIndicator meaning="simulated" label={CHAIN_LABEL} />
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The table's columns
 * ------------------------------------------------------------------------------------------- */

/**
 * The outcome filter's options: the neutral one, then `AuditResult`'s own members in the record's
 * spelling.
 *
 * A reader filters by the word the events themselves carry rather than by a paraphrase, so what the
 * control offers and what the table prints are the same vocabulary.
 */
const RESULT_FILTER_OPTIONS: readonly FilterChoice[] = [
  { value: '', label: SCREEN_TEXT.anyOutcome },
  ...RESULT_OPTIONS.map((option) => ({ value: option, label: option })),
];

/**
 * The trail's columns, in the order the table shows them.
 *
 * Declared once at module scope because no column depends on a render's state: each cell is the
 * record's own member, formed by the component that owns that kind of value — an identifier, an
 * instant and a policy through `MonoValue`, an outcome through `StatusIndicator` so its icon, label
 * and colour are always present together, and everything else as the text the record holds. A policy
 * cell is blank where the event carries none, rather than printing an absent member.
 */
const COLUMNS: readonly TableColumn<AuditEvent>[] = [
  {
    id: 'sequence',
    header: SCREEN_TEXT.sequence,
    sortable: true,
    align: 'end',
    render: (auditEvent) => auditEvent.sequence,
  },
  {
    id: 'id',
    header: SCREEN_TEXT.identifier,
    sortable: true,
    render: (auditEvent) => <MonoValue value={auditEvent.id} kind="id" />,
  },
  {
    id: 'timestamp',
    header: SCREEN_TEXT.recorded,
    sortable: true,
    render: (auditEvent) => <MonoValue value={auditEvent.timestamp} kind="timestamp" />,
  },
  {
    id: 'actorType',
    header: SCREEN_TEXT.actorType,
    sortable: true,
    render: (auditEvent) => auditEvent.actorType,
  },
  {
    id: 'actorId',
    header: SCREEN_TEXT.actor,
    sortable: true,
    render: (auditEvent) => <MonoValue value={auditEvent.actorId} kind="id" />,
  },
  {
    id: 'action',
    header: SCREEN_TEXT.action,
    sortable: true,
    render: (auditEvent) => auditEvent.action,
  },
  {
    id: 'objectRef',
    header: SCREEN_TEXT.objectRef,
    sortable: true,
    render: (auditEvent) => auditEvent.objectRef,
  },
  {
    id: 'result',
    header: SCREEN_TEXT.result,
    sortable: true,
    render: (auditEvent) => (
      <StatusIndicator
        meaning={RESULT_MEANINGS[auditEvent.result]}
        label={auditEvent.result}
      />
    ),
  },
  {
    id: 'policy',
    header: SCREEN_TEXT.policy,
    sortable: true,
    render: (auditEvent) =>
      auditEvent.policyId === undefined ? (
        ''
      ) : (
        <MonoValue value={auditEvent.policyId} kind="id" />
      ),
  },
];

/* ---------------------------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------------------------- */

/**
 * The name the trail's read is cached under: the port's method the read calls, which is the first
 * element of the query key and the value the screen's cache subscription matches.
 *
 * Declared once so the key and the match cannot name different reads: an invalidation is recognised by
 * the same string the query was cached with.
 */
const TRAIL_READ = 'listAuditEvents';

/** Props of {@link AuditScreen}. */
export interface AuditScreenProps {
  /**
   * The shell's plant and product selection.
   *
   * The trail itself is not plant-scoped — a persona either holds `audit.read` or does not, which is
   * why the port's read takes the filters alone — so the selection is carried in the query's key
   * rather than in the request: a scope change re-reads the trail as every other screen's read does,
   * and the records the read returns stay exactly the ones this role may see.
   */
  readonly scope: Scope;
}

/**
 * The audit trail of SCR-05.
 *
 * Two reads, both through `useService()` (rule P-2): the trail itself through `listAuditEvents`, in one
 * cache entry per filter combination, and — only when the reader asks for it — the chain's
 * verification through `verifyAuditChain`. The first read's settled facts decide the screen's state in
 * one place ({@link deriveScreenState}); the second is an action whose report is held here until the
 * next activation replaces it or the records behind the trail are re-issued, because a verification
 * that ran a moment ago is a statement about that moment and not about the records now. An
 * invalidation of the trail's read is the application saying those records may have moved, so a verdict
 * the records have outrun is dropped rather than shown above a chain it does not describe.
 *
 * Nothing on this screen writes: no event is appended, no record is edited and nothing is repaired by
 * the verification. The only state this component owns is what the reader chose — the filters, the
 * table's order, which event's detail is open and the last report — so a re-render can never change a
 * record.
 *
 * @param props - The shell's plant and product selection.
 * @returns The page header, the verification group with its fixed note and result, the filters, the
 *   trail inside the state boundary, and the detail drawer while one is open.
 */
export function AuditScreen({ scope }: AuditScreenProps): ReactElement {
  const service = useService();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<AuditFilterValues>(NO_FILTERS);
  const [sort, setSort] = useState<TableSort | null>(null);
  const [openEvent, setOpenEvent] = useState<AuditEvent | null>(null);
  const [report, setReport] = useState<ChainReport | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyFailure, setVerifyFailure] = useState<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const auditQuery = useMemo(() => buildAuditQuery(filters), [filters]);

  /*
   * The trail read. Retries are off on purpose: a refusal recorded in the records' own permissions
   * fails the same way however often it is repeated, and the boundary offers the reader an explicit
   * retry for the case where repeating the call can succeed.
   */
  const eventsQuery = useQuery<Result<AuditEvent[]>, unknown>({
    queryKey: [TRAIL_READ, auditQuery, scope.plants, scope.products],
    queryFn: () => service.listAuditEvents(auditQuery),
    retry: false,
  });

  /*
   * The report's lifetime, ended by the records moving under it. Every invalidation of the trail's read
   * is the application's own statement that the records behind it may have moved: every write, every
   * simulation trigger and `Reset demo data` re-issue the reads through this cache. A report describes
   * the chain as it stood when the check ran, so it is dropped the moment that read is invalidated
   * rather than left standing above a trail it no longer describes.
   *
   * A filter change is not an invalidation — it reads a different cache entry — so narrowing the trail
   * leaves the verdict in place. The subscription is returned as the effect's cleanup, so a screen that
   * unmounts stops listening.
   */
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== 'updated' || event.action.type !== 'invalidate') {
          return;
        }

        const invalidatedKey: readonly unknown[] = event.query.queryKey;

        if (invalidatedKey[0] !== TRAIL_READ) {
          return;
        }

        setReport(null);
        setVerifyFailure(null);
      }),
    [queryClient],
  );

  const result = eventsQuery.data;
  const rows = useMemo(() => orderRows(result?.data ?? [], sort), [result, sort]);
  /*
   * The read's own facts, plus this screen's reading of its answer: the trail is written on the order
   * book's currency, so the stale notice names ERP first (AAP 0.2.1, T-13), and an empty trail is the
   * empty state. Nothing here reads the shape of a record: a state describes what a source did, so an
   * event that arrived without a member is listed as the record holds it.
   */
  const state = deriveScreenState({
    isPending: eventsQuery.isPending,
    error: eventsQuery.error,
    freshness: result?.meta.freshness,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    hasContent: (result?.data.length ?? 0) > 0,
  });
  const staleRecord =
    result === undefined ? undefined : staleSourceOf(result.meta.freshness, APPROVAL_GATE_SOURCE);
  const forbiddenRecord = forbiddenOf(eventsQuery.error);

  const retryRead = (): void => {
    void eventsQuery.refetch();
  };

  const setActorId = (value: string): void => {
    setFilters((current) => ({ ...current, actorId: value }));
  };

  const setAction = (value: string): void => {
    setFilters((current) => ({ ...current, action: value }));
  };

  const setObjectRef = (value: string): void => {
    setFilters((current) => ({ ...current, objectRef: value }));
  };

  const setFrom = (value: string): void => {
    setFilters((current) => ({ ...current, from: value }));
  };

  const setTo = (value: string): void => {
    setFilters((current) => ({ ...current, to: value }));
  };

  const setResult = (value: string): void => {
    setFilters((current) => ({ ...current, result: isAuditResult(value) ? value : '' }));
  };

  const handleSort = (columnId: string): void => {
    setSort((current) =>
      current !== null && current.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' },
    );
  };

  /* The row that opened the drawer is remembered so the dialog can hand focus back to it: a reader who
     closes the detail is returned to the position in the trail they left, not to the top of the page. */
  const openDetail = (auditEvent: AuditEvent): void => {
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement ? active : null;
    setOpenEvent(auditEvent);
  };

  const closeDetail = (): void => {
    setOpenEvent(null);

    const opener = openerRef.current;
    openerRef.current = null;
    opener?.focus();
  };

  /*
   * One activation, one call, one report. The previous report stays on screen while the new call runs
   * — the control says a check is already running, so the reading is understood as the earlier one —
   * and is cleared here only when the verification itself could not run, because a report about a
   * moment the service never answered for would be a reading nothing produced. The other place it is
   * dropped is the cache subscription above, and for the other reason: there the records behind the
   * report moved.
   */
  const verifyChain = async (): Promise<void> => {
    setIsVerifying(true);
    setVerifyFailure(null);

    try {
      const verified = await service.verifyAuditChain();
      setReport(verified.data);
    } catch (error) {
      setReport(null);
      setVerifyFailure(
        isProblem(error) ? error.message : SCREEN_TEXT.verifyFailedDetail,
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={SCREEN_CLASSES}>
      <PageHeader title={SCREEN_TEXT.title} description={SCREEN_TEXT.description} />

      <Panel label={SCREEN_TEXT.verificationGroup}>
        <div className={VERIFICATION_ROW_CLASSES}>
          {/*
            The control is written once per state on purpose. `ActionButtonProps` is a discriminated
            union — a disabled control cannot be constructed without the sentence explaining why — so
            a `disabled` flag held in a boolean cannot be passed with a reason at all: each branch
            passes its own literal, and the reason can never go missing.
          */}
          {isVerifying ? (
            <ActionButton
              variant="primary"
              onClick={() => {
                void verifyChain();
              }}
              disabled
              disabledReason={SCREEN_TEXT.verifyInFlightReason}
            >
              {SCREEN_TEXT.verifyChain}
            </ActionButton>
          ) : (
            <ActionButton
              variant="primary"
              onClick={() => {
                void verifyChain();
              }}
            >
              {SCREEN_TEXT.verifyChain}
            </ActionButton>
          )}
          <p className={NOTE_CLASSES}>{AUDIT_CHAIN_NOTE}</p>
        </div>

        {report === null ? null : <VerificationReportPanel report={report} />}

        {verifyFailure === null ? null : (
          <div role="status" className={REPORT_STACK_CLASSES}>
            <StatusIndicator meaning="fail" label={SCREEN_TEXT.verifyFailedHeadline} />
            <p className={DETAIL_CLASSES}>{verifyFailure}</p>
            <StatusIndicator meaning="simulated" label={CHAIN_LABEL} />
          </div>
        )}
      </Panel>

      <Panel label={SCREEN_TEXT.filterGroup}>
        <div className={FILTER_ROW_CLASSES}>
          <FilterTextField
            label={SCREEN_TEXT.actor}
            value={filters.actorId}
            onChange={setActorId}
          />
          <FilterTextField
            label={SCREEN_TEXT.action}
            value={filters.action}
            onChange={setAction}
            hint={SCREEN_TEXT.actionHint}
          />
          <FilterTextField
            label={SCREEN_TEXT.objectRef}
            value={filters.objectRef}
            onChange={setObjectRef}
          />
          <FilterChoiceField
            label={SCREEN_TEXT.result}
            value={filters.result}
            options={RESULT_FILTER_OPTIONS}
            onChange={setResult}
          />
          <FilterTextField
            label={SCREEN_TEXT.from}
            value={filters.from}
            onChange={setFrom}
            hint={SCREEN_TEXT.fromHint}
          />
          <FilterTextField
            label={SCREEN_TEXT.to}
            value={filters.to}
            onChange={setTo}
            hint={SCREEN_TEXT.toHint}
          />
        </div>
      </Panel>

      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryRead}
        emptyMessage={SCREEN_TEXT.empty}
        partialMessage={SCREEN_TEXT.partial}
        conflictMessage={SCREEN_TEXT.conflict}
        forbidden={forbiddenRecord}
      >
        {/*
          The chain itself carries its label, not only the verification panel above: an individual
          simulated element is labelled where it appears, so a reader who reads the trail without ever
          running the check still sees what they are reading (rules P-1 and P-4).
        */}
        <div className="flex min-w-0 flex-col gap-2">
          <StatusIndicator meaning="simulated" label={CHAIN_LABEL} />
          <DataTable
            columns={COLUMNS}
            rows={rows}
            getRowKey={(auditEvent) => auditEvent.id}
            caption={SCREEN_TEXT.tableCaption}
            sort={sort}
            onSort={handleSort}
            onRowActivate={openDetail}
            emptyMessage={SCREEN_TEXT.empty}
          />
        </div>
      </StateBoundary>

      {openEvent === null ? null : (
        <AuditDetailDrawer auditEvent={openEvent} onClose={closeDetail} />
      )}
    </div>
  );
}

