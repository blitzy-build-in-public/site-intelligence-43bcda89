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
 * THE FIXED NOTE, AND THE COLLISION IT REPORTS RATHER THAN RESOLVES. {@link AUDIT_CHAIN_NOTE} is the
 * sentence AAP 0.12.4 and rule P-4 fix for this screen, and it is rendered character for character.
 * It names the condition it denies by name — that what it shows is not the resistance of a production
 * store — while `tests/source-checks/forbidden-strings.test.ts` rejects the vocabulary of an
 * unimplemented claim across `src/**`, the adjectives of resistance, certainty and certification
 * included. A scan whose pattern reaches the noun form as well as the adjective would therefore match
 * this file. That collision is *reported, not resolved*: the note is a fixed string of two
 * higher-ranked inputs, it is the wording that *denies* the claim rather than making it, and it is
 * neither paraphrased to satisfy a check nor accompanied by a weakened scan — the check belongs to
 * another folder. If the scan flags it, the note stays and the collision is recorded here and in this
 * file's completion note.
 *
 * LABELLING (rules P-1 and P-4). The chain and its verification carry the exact `Simulated control`
 * string of specification §5.3 next to the instant of the check, and the persistent `Simulated data`
 * badge the shell mounts on every route covers the page. Every figure on screen comes from a record:
 * the checked count, the break's position and the total are the report's own members, the table's
 * cells are the events' own fields, and no number, currency amount or record identifier is typed into
 * this file (rule P-6, and `tests/source-checks/no-typed-figures.test.ts` scans this folder).
 *
 * THE SEVEN STATES. Every read-driven screen renders inside `StateBoundary` (AAP 0.12.4) and the state
 * is derived once, in {@link deriveScreenState}, from what the query settled to: a permission refusal
 * is `forbidden`, any other rejection is `offline`, a validation refusal is `conflict`, a stale order
 * book is `stale`, a pending read is `loading`, an empty result is `empty` and a resolved record
 * missing a member the table cannot render without is `partial`. `StateBoundary` owns what each state
 * looks like, so no banner, skeleton or denial card is composed here.
 *
 * REPORTED GAPS AND DECISIONS.
 * - No drawer primitive for arbitrary payloads exists in `src/components` — `EvidenceDrawer` is bound
 *   to an evidence reference — so {@link AuditDetailDrawer} lives in this file as a non-exported
 *   component, as the file's instructions require.
 * - No text-input or select primitive exists in `src/components` either, so the filter controls are the
 *   two non-exported components {@link FilterTextField} and {@link FilterChoiceField}, each a labelled,
 *   keyboard-operable control built from role tokens in this file.
 * - `AuditResult` and `ProblemType` are types in `src/types`, with no runtime member list beside them,
 *   so the option lists below are declared here and typed against those unions: a member the union
 *   gains or loses fails this file's compilation instead of being hand-typed into a control.
 * - The port's `listAuditEvents(query)` takes no scope, because the chain is not plant-scoped — a
 *   persona either holds `audit.read` or does not. The scope this screen receives is therefore carried
 *   in the query *key*, so a scope change re-reads the trail as every other screen's reads do, while
 *   the request itself stays exactly the port's signature.
 * - A failure whose cause the state mapping does not name — a `policy`, `simulated-write-back` or
 *   `not-found` refusal of a list read — is rendered `offline`: the boundary's offline rendering is the
 *   one that withholds content, says nothing answered and offers a retry, and a cause it cannot name
 *   must not be presented as content that exists.
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

import { useQuery } from '@tanstack/react-query';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode } from 'react';

import { DataTable } from '../../components/data-table';
import type { TableColumn, TableSort } from '../../components/data-table';
import { MonoValue } from '../../components/mono-value';
import type { MonoValueKind } from '../../components/mono-value';
import { PageHeader } from '../../components/page-header';
import { Panel } from '../../components/panel';
import { StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { StateBoundary } from '../../components/state-boundary';
import type { StateBoundaryForbidden, StateBoundaryStale } from '../../components/state-boundary';
import { ActionButton } from '../../components/tooltip';
import { useService } from '../../services/service-provider';
import { SOURCE_LABELS } from '../../types';
import type {
  AuditEvent,
  AuditPayload,
  AuditQuery,
  AuditResult,
  ChainBreak,
  ChainReport,
  Freshness,
  Problem,
  ProblemType,
  Result,
  Scope,
  ScreenState,
  SimLabel,
  SourceId,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The fixed string, held once
 * ------------------------------------------------------------------------------------------- */

/**
 * The note every surface of the audit chain carries, character for character as the SCR-05 row of
 * AAP 0.12.4 and rule P-4 fix it.
 *
 * Exported so the colocated suite imports it rather than re-spelling it: a reworded note then fails a
 * test instead of being silently accepted. It is the sentence that *denies* the claim the application
 * may never make, which is why it is rendered exactly — see the module documentation for the collision
 * it reports with the forbidden-strings source check rather than resolving.
 */
export const AUDIT_CHAIN_NOTE =
  'Simulated control: this shows the mechanism, not production tamper resistance.';

/**
 * The `Simulated control` label of specification §5.3, typed from the shared union so the fixed string
 * lives in one place and this file's use of it fails to compile if the label is ever reworded (rule
 * P-1).
 */
const CHAIN_LABEL: SimLabel = 'Simulated control';

/**
 * The source whose staleness gates the workspace, and therefore the one the stale banner names.
 *
 * ERP is the order book behind every plan and the source `requestApproval` and `decideApproval` gate
 * on (AAP 0.2.1, T-13), so it is the record this screen looks for in `Meta.freshness`. Typed as a
 * `SourceId`, so a renamed source key fails this file's compilation rather than silently matching
 * nothing.
 */
const ORDER_BOOK_SOURCE: SourceId = 'erp';

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

  /** The partial state's sentence, naming what a resolved record was missing. */
  partial:
    'Some events in the trail arrived without the identifier or the instant this table renders, so they are listed with the values the records hold.',

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
 * The failure, the freshness and the seven states
 * ------------------------------------------------------------------------------------------- */

/**
 * The five causes `Problem` distinguishes, in the contract's own spelling.
 *
 * Declared beside the guard rather than imported as a value, because `ProblemType` is a type in
 * `src/types/service.ts`: this list is typed against that union, so a cause the union gains or loses
 * fails this file's compilation instead of making the guard accept a failure it does not describe.
 */
const PROBLEM_TYPES = [
  'permission',
  'policy',
  'validation',
  'simulated-write-back',
  'not-found',
] as const satisfies readonly ProblemType[];

/**
 * Whether a rejection is the port's typed failure rather than something the platform threw.
 *
 * A `Problem` is thrown rather than returned (AAP 0.12.3), so a screen that catches a read has to tell
 * the two apart before it can name a cause: a refusal of the record is not the same condition as a
 * failure of the call itself, and the seven states render them differently. Every member the guard
 * checks is one a `Problem` declares, so a `TypeError` from a broken module reaches the offline
 * rendering rather than being read as a permission refusal it never carried.
 */
function isProblem(error: unknown): error is Problem {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if (!('type' in error) || !('message' in error) || !('traceId' in error)) {
    return false;
  }

  const { type, message, traceId } = error;

  return (
    typeof type === 'string' &&
    PROBLEM_TYPES.some((known) => known === type) &&
    typeof message === 'string' &&
    typeof traceId === 'string'
  );
}

/**
 * The stale record the boundary's banner names, or `undefined` while the order book is current.
 *
 * The banner and the disabled controls of a screen that writes on ERP's freshness quote the same
 * record (AAP 0.2.1, T-13), so the record is handed over whole: the source key, the display name the
 * freshness strip prints for it from `SOURCE_LABELS`, and the instant it last answered. Nothing is
 * derived from that instant here — no age and no duration (rule P-6).
 */
function staleOrderBookOf(freshness: readonly Freshness[]): StateBoundaryStale | undefined {
  const orderBook = freshness.find((entry) => entry.source === ORDER_BOOK_SOURCE);

  if (orderBook === undefined || orderBook.state === 'fresh') {
    return undefined;
  }

  return {
    source: orderBook.source,
    label: SOURCE_LABELS[orderBook.source],
    asOf: orderBook.asOf,
  };
}

/**
 * The denial the forbidden card explains, or `undefined` when the failure was not a permission
 * refusal.
 *
 * The card's evidence is the failure's own: the permission the acting role lacks, the roles that hold
 * it and the trace identifier of the refused call. A refusal that named no permission supplies no card
 * rather than a card naming a permission nobody was refused for, and the boundary's neutral notice
 * stands in its place.
 */
function forbiddenOf(error: unknown): StateBoundaryForbidden | undefined {
  if (!isProblem(error) || error.type !== 'permission') {
    return undefined;
  }

  const permission = error.requiredPermission;

  if (permission === undefined) {
    return undefined;
  }

  return {
    permission,
    roles: error.rolesWithPermission ?? [],
    traceId: error.traceId,
  };
}

/**
 * Whether a resolved event is missing a member this screen cannot render without.
 *
 * The table prints each event's position, identifier and instant, and the drawer prints its content;
 * a record that arrived without an identifier or an instant would leave a cell stating nothing, which
 * is the condition the partial state exists to report. Nothing is repaired or blanked here — the
 * record is listed as it arrived and the boundary says why (rule P-6).
 */
function isIncomplete(event: AuditEvent): boolean {
  return event.id === '' || event.timestamp === '';
}

/** What {@link deriveScreenState} reads: what the query settled to. */
interface ScreenStateInput {
  /** Whether the read has not answered yet. */
  readonly isPending: boolean;

  /** What the read rejected with, or `null` while it has not. */
  readonly error: unknown;

  /** The read's result, or `undefined` until it settles. */
  readonly result: Result<AuditEvent[]> | undefined;
}

/**
 * The one place this screen decides which of the seven states its records are in.
 *
 * The precedence is fixed and total: a permission refusal is `forbidden`, any other rejection is
 * `offline`, a validation refusal is `conflict`, a stale order book is `stale`, a pending read is
 * `loading`, an empty trail is `empty`, and a resolved record missing a member is `partial`. Every
 * other case returns `undefined`, which is the boundary's documented "no exceptional state holds" —
 * the content renders exactly as handed in.
 *
 * Its input is the query's own settled facts rather than a flag of this screen's, so the state cannot
 * disagree with the read it describes and no effect is needed to keep the two in step.
 */
function deriveScreenState({
  isPending,
  error,
  result,
}: ScreenStateInput): ScreenState | undefined {
  if (isProblem(error)) {
    return error.type === 'permission'
      ? 'forbidden'
      : error.type === 'validation'
        ? 'conflict'
        : 'offline';
  }

  if (error !== null && error !== undefined) {
    return 'offline';
  }

  if (isPending || result === undefined) {
    return 'loading';
  }

  if (staleOrderBookOf(result.meta.freshness) !== undefined) {
    return 'stale';
  }

  if (result.data.length === 0) {
    return 'empty';
  }

  return result.data.some(isIncomplete) ? 'partial' : undefined;
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
 */
const CONTROL_CLASSES =
  'min-h-6 min-w-32 rounded-control border border-control-boundary bg-surface-1 px-2 py-1 text-13 text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

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
 * The filter controls — no text-input or select primitive exists in `src/components`
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
 * Declared in this file because `src/components` holds no text-input primitive and a screen may not
 * render a raw form control: this is the one place a text field's label, identifier and hint are
 * joined, and the control keeps the 24 by 24 px target and the theme's focus ring (rule B-3). It holds
 * no state — the caller owns the value — so a render never fights the reader's typing.
 */
function FilterTextField({ label, value, onChange, hint }: FilterTextFieldProps): ReactElement {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;

  return (
    <div className={FIELD_CLASSES}>
      <label htmlFor={fieldId} className={LABEL_CLASSES}>
        {label}
      </label>
      <input
        id={fieldId}
        type="text"
        value={value}
        onChange={(changeEvent) => {
          onChange(changeEvent.target.value);
        }}
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
 * A native `select` for the reason the text field is a native `input`: the platform's own control is
 * the one that is keyboard operable, announced as a list box and rendered with the reader's own input
 * device, and no component in `src/components` offers one. The options are the union's own members,
 * supplied by the caller, so the control can never offer a value the records cannot hold.
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
      <select
        id={fieldId}
        value={value}
        onChange={(changeEvent) => {
          onChange(changeEvent.target.value);
        }}
        className={CONTROL_CLASSES}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
          <h2 id={titleId} className={DRAWER_TITLE_CLASSES}>
            {SCREEN_TEXT.drawerTitlePrefix} <MonoValue value={auditEvent.id} kind="id" />
          </h2>
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
 * next activation replaces it, because a verification that ran a moment ago is a statement about that
 * moment and not about the records now.
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
    queryKey: ['listAuditEvents', auditQuery, scope.plants, scope.products],
    queryFn: () => service.listAuditEvents(auditQuery),
    retry: false,
  });

  const result = eventsQuery.data;
  const rows = useMemo(() => orderRows(result?.data ?? [], sort), [result, sort]);
  const state = deriveScreenState({
    isPending: eventsQuery.isPending,
    error: eventsQuery.error,
    result,
  });
  const staleRecord = result === undefined ? undefined : staleOrderBookOf(result.meta.freshness);
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
   * and is cleared only when the verification itself could not run, because a report about a moment the
   * service never answered for would be a reading nothing produced.
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

