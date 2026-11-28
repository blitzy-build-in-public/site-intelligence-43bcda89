/**
 * SCR-02, the exception queue of stage S1: the table a planner works from, the six filters that narrow
 * it, the day the overview may have narrowed it to, the three row actions and the filter sets kept for
 * the session.
 *
 * Fixing inputs. AAP 0.12.4's SCR-02 row fixes everything below: "Table of identifier, type, title,
 * products, plant, severity, revenue at risk, days to impact, status, owner, age, freshness; filters
 * for type, plant, severity, status, owner, supplier; default sort severity then days to impact; saved
 * views in memory; rows scoped by role. Row actions open, assign to me, dismiss with a reason. A
 * dismissed row requires a reason before the action enables." `platform-contracts.md` §2 fixes the port
 * this screen reads and writes through, §9 the list parameters it sends (`sort=field:dir` among them),
 * and §6 the audit events the two writes append.
 *
 * WHAT THIS SCREEN OWNS, AND WHAT IT DOES NOT. It owns the reader's choices — the filters, the ordering,
 * the saved views, which row's dismissal is being written and what the last write reported — and it
 * owns nothing else. Every row, every amount, every freshness record and every refusal is the
 * service's: the table is `listExceptions`'s answer rendered as it arrived, and the two writes are
 * `assignException` and `dismissException`. Nothing here filters, intersects, re-sorts or re-derives a
 * record, because a second place that narrowed the queue would disagree with the overview computed over
 * the same records (AAP 0.2.1, 0.8).
 *
 * THE ROLE'S SCOPE IS NEVER APPLIED HERE. The shell's plant and product selection travels in the read's
 * `scope` argument and the port intersects it with the acting role's plant scope before it answers, so a
 * row outside the persona's reach is never returned and no screen has to reproduce that rule.
 *
 * THE ORDER. With no `sort` in the query the service applies SCR-02's own order — severity, then days to
 * impact — through `sortUrgent` in `src/domain/aggregation/urgency.ts`, which owns that ranking. The
 * screen therefore sends no `sort` until the reader sorts a column, and then sends the contracts §9 form
 * `field:dir` built from the controlled `TableSort`; column ids are the row's own member names, so the
 * parameter names a member the port's list read orders by. A sortable header reports its state through
 * `DataTable`, which owns `aria-sort`; nothing here compares two rows. The service's order is a column's
 * order too — severity ascending, with days to impact breaking the ties — so the table is handed it as
 * its `defaultOrder` and the Severity header announces the order in effect before anyone sorts, which
 * applies nothing and reports nothing through `onSort`.
 *
 * THE SEVEN STATES. The queue renders inside `StateBoundary`, and which state its records are in is
 * decided in one place, `src/components/screen-state.ts`, from what the read settled to: a thrown
 * `Problem` first (a permission refusal is the forbidden card, a validation refusal a record that
 * moved, an identifier no record answers the empty state, and a suppressed answer a source that did
 * not answer), then the freshness report the result itself carries, then an answer holding no rows.
 * The emptied queue of the demonstration's own control reaches this screen as an empty answer from
 * that same read, so the state is read from the service and never from a local flag.
 *
 * THE FILTERS. Five are enumerated and one is typed. `ExceptionRow` carries the exception's type, plant,
 * severity, status and owner, so those five selects offer the distinct values of the answer on screen,
 * and the sixth filter — supplier — is a text field: no member of a row carries the supplier (the
 * exception buys its material from one, which the port filters on but does not project), and the port
 * declares no payload of filter options, so this screen cannot offer a list of suppliers it never
 * receives. One read per mount fills the table and the five selects alike, because a second read with
 * no filters would recompute the whole exception aggregate — a solver call per case included — for
 * values the rows in hand already state, and the port is the only place those values may come from
 * (rule P-2). A chosen value narrows the answer and the options narrow with it; the value in force stays
 * listed, so a select whose re-keyed read has not answered yet still shows the narrowing it reports, and
 * the "All types", "All plants", "All severities", "All statuses" or "All owners" entry stands first in
 * each select as the way back to the wider set — including when a filter set matched nothing and the
 * answer states no value at all.
 *
 * THE DAY THE QUEUE WAS NARROWED TO, WHICH IS NOT A SEVENTH FILTER. A reader who activates a day on
 * SCR-01's series arrives here with that date in the entry's location state, which the route reads back
 * and hands in as `initialQuery.date`; the screen holds it beside the six filters and sends it as
 * `ExceptionQuery.date`, the member the port narrows the read by exactly as it narrows by plant or
 * status. While it is set, one row inside the Filters group says which day the read keeps and offers the
 * control that clears it — nothing more is asked of the reader and nothing is re-filtered here (rule
 * P-2). The day is deliberately outside `FilterValues`: AAP 0.12.4 fixes the queue's filters as six, a
 * saved view remains those six (`./saved-views` copies only the members it names, so a date can never
 * enter one), and this row reports a narrowing rather than offering a choice. It prints the date the
 * record states, with no formatting, arithmetic or clock of its own (rule P-6), and its clear control is
 * an `ActionButton`, so the way out of the narrowing is the one the house style gives every control
 * (rules P-8, B-3).
 *
 * THE COLUMNS. The twelve AAP 0.12.4 names come first, in the order it gives them, each rendered from
 * the row's own member. A thirteenth column, "Actions", holds the three row controls, because rule P-8
 * requires each row's unavailable action to state its own reason and a row has no other surface for it;
 * the twelve specified columns are unchanged and unscoped by it. Money, identifiers and timestamps go
 * through `MonoValue`, the one presentation formatter (AAP 0.8); a count is printed as the record holds
 * it, with no arithmetic, and the age column's duration is presented in whole hours because the module
 * that measures it delegates that formatting to the component.
 *
 * LABELS. Revenue at risk and risk alone is a computed figure, so the column carries the exact
 * specification §5.3 label `Simulated calculation` — typed here as a `SimLabel` so a paraphrase fails to
 * compile (rule P-1) — rendered immediately above the table because `TableColumn.header` is a string and
 * cannot hold the indicator itself. The route's persistent `Simulated data` badge belongs to the shell,
 * which mounts it once above the router outlet, so this screen mounts none of its own.
 *
 * Rules served:
 * - B-1: nothing here fetches, links or resolves an address; navigation is `react-router`'s and every
 *   icon is a bundled component reached through a shared primitive.
 * - B-2: no configuration is read, no environment value is named and nothing here resembles a
 *   credential — which is why the class lists below say "role styles" rather than the other word.
 * - B-3: every filter has a real `<label>` bound by `htmlFor`/`id`, every action is an `ActionButton`
 *   with the 24x24 px minimum target and the theme's focus ring, the table keeps `DataTable`'s caption,
 *   scoped headers, `aria-sort` and `J`/`K`/`Enter` row cursor rather than reimplementing them, the
 *   dismissal is a real modal dialog that moves focus in, traps it, closes on `Esc` and returns it to
 *   the control that opened it, a status is always an icon with a label and a colour, and nothing here
 *   animates, so a reduced-motion session needs no special case.
 * - P-1: the computed revenue column carries the exact label above the table, and no synthetic figure is
 *   presented as a production result.
 * - P-2: the only data path is `useService()`. No seed module, adapter, HTTP client, domain module,
 *   shell module or other feature folder is imported, so this screen cannot become a second data
 *   boundary.
 * - P-6: every number on screen arrives from the service. Nothing here types a currency amount, a domain
 *   identifier, a date or a count, formats one, or does arithmetic on one; the only strings written are
 *   the screen's own captions and its reasons for a control that cannot act.
 * - P-7: every company, plant, person and figure shown is a record the service supplied. The module
 *   writes no name of its own.
 * - P-8: each control either acts or is an `ActionButton` disabled with a plain sentence saying why —
 *   the dismissal confirm until a reason is given, a row action the session cannot perform, and the
 *   saved-view control until the view has a name.
 * - P-3, P-4, P-5: this screen states who may act only from the persona the adapter enforces, the roster
 *   it reports and the refusal it hands back, and never presents either as production authorisation —
 *   it claims nothing about where records are held or whether they could be altered, and carries no
 *   competitor element at all.
 *
 * THE EMPTY QUEUE HAS NO FIXED SENTENCE. SCR-02's row fixes none (unlike SCR-04), so
 * {@link EXCEPTION_QUEUE_TEXT} holds the screen's own pair. A read the reader narrowed — any of the six
 * filters set, or the day the overview counted it by — keeps the filter wording, because a constraint
 * the reader chose is what emptied it. A read nothing narrowed keeps the trigger-neutral sentence,
 * because the demonstration control that empties the queue applies no filter at all and the filter
 * wording would describe a constraint no control on the page sets. Which of the two applies is decided
 * from the read this screen asked for rather than from the answer, because an empty answer is identical
 * either way. The table stays on screen in both cases — caption, scoped headers and the sentence in one
 * cell spanning the thirteen columns — so a reader who narrows the queue to nothing still sees the
 * columns they were narrowing it by.
 *
 * WHO MAY WORK A ROW IS STATED BEFORE THE ATTEMPT. The permission matrix is evaluated against the
 * persona it enforces, and a refusal arrives as a `Problem` whose `rolesWithPermission` names the roles
 * that may act, which {@link EXCEPTION_QUEUE_TEXT} puts beside the table. The row's two writes are also
 * gated here from the same facts: a persona that does not hold `exception.work` over the row's plant
 * finds "Assign to me" and "Dismiss" disabled with a sentence naming the roles that hold the permission,
 * read from the roster through the provider rather than from a matrix of this module's own — so a
 * read-only persona is told who may act instead of learning of the refusal by activating the control
 * (AAP 0.2.1, rules P-3 and P-8). Three further conditions are facts about the row or the session and
 * disable the control the same way: an assignment being recorded, a session whose adapter reports no
 * persona, and a row already owned by the acting persona or already dismissed. Each disables the control
 * with the sentence that says so rather than sending a write that would change nothing.
 *
 * THE SHELL'S SELECTION IS CARRIED UNUSED. `selectedExceptionId` is accepted for interface compatibility
 * with the route and read by nothing: `DataTable` exposes no selected-row surface, so a highlight here
 * would mean a second table or an unmanaged class on a row this screen does not own.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { Card } from '../../components/card';
import { DataTable } from '../../components/data-table';
import type { TableColumn, TableSort } from '../../components/data-table';
import { DialogHeading } from '../../components/dialog-heading';
import { EvidenceRef } from '../../components/evidence-drawer';
import { freshnessMeaning } from '../../components/freshness-pill';
import { MonoValue, formatHours } from '../../components/mono-value';
import { PageHeader } from '../../components/page-header';
import { Panel } from '../../components/panel';
import {
  deriveScreenState,
  forbiddenOf,
  isProblem,
  staleSourceOf,
} from '../../components/screen-state';
import { SelectField } from '../../components/select-field';
import { StateBoundary } from '../../components/state-boundary';
import { StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { TextAreaField } from '../../components/text-area-field';
import { TextField } from '../../components/text-field';
import { ActionButton } from '../../components/tooltip';
import { useActiveUser, useRolesHolding, useService } from '../../services/service-provider';
import {
  ALREADY_OWNER_REASON,
  APPROVAL_GATE_SOURCE,
  EXCEPTION_QUEUE_PATH,
  SIM_LABELS,
  SOURCE_LABELS,
} from '../../types';
import type {
  ActiveUser,
  ExceptionId,
  ExceptionQuery,
  ExceptionRow,
  ExceptionStatus,
  IsoDate,
  Permission,
  PlantId,
  Result,
  Role,
  Scope,
  Severity,
  SimLabel,
} from '../../types';
import { applySavedView, createSavedView, listSavedViews } from './saved-views';
import type { SavedView } from './saved-views';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this screen states, held here so the wording has one owner: the sub-components below
 * render these strings and a suite names them through this object instead of retyping them.
 *
 * None of them carries a figure, an amount, a date, an identifier, a persona or a role (rule P-6), and
 * none claims that a control establishes a configuration, prevents a copy or resists an edit (rule P-4).
 * A *runtime* value — a record's own title, a `Problem`'s message, a role the refusal names — is never
 * written here: it is rendered as it arrives.
 */
export const EXCEPTION_QUEUE_TEXT = {
  /** The screen's own name, and the one level-one heading it renders (AAP 0.12.4 SCR-02). */
  title: 'Exception queue',

  /** The supporting line under the heading: what the queue holds and how it is ordered. */
  description:
    'Every exception your role can see, ordered by severity and then by days to impact until you sort a column.',

  /** The caption of the group holding the filter sets kept for this session. */
  savedViewsGroup: 'Saved views',

  /** The caption of the group holding the six filters. */
  filterGroup: 'Filters',

  /** The table's accessible name, rendered as its caption by `DataTable`. */
  tableCaption: 'Exception queue',

  /**
   * What the computed column's label refers to, printed beside it above the table. SCR-02's row fixes
   * the column as "revenue at risk", which the aggregation module computes from the exception's
   * affected lines rather than reading from a stored figure (rule P-6).
   */
  revenueNote: 'Revenue at risk is computed from each exception’s affected lines.',

  /* The filters ------------------------------------------------------------------------------ */

  /** The caption of the exception-type filter. */
  typeFilter: 'Type',

  /** The caption of the plant filter. */
  plantFilter: 'Plant',

  /** The caption of the severity filter. */
  severityFilter: 'Severity',

  /** The caption of the status filter. */
  statusFilter: 'Status',

  /** The caption of the owner filter. */
  ownerFilter: 'Owner',

  /** The caption of the supplier filter. */
  supplierFilter: 'Supplier',

  /** The first option of the type filter: no type constraint. */
  anyType: 'All types',

  /** The first option of the plant filter: no plant constraint. */
  anyPlant: 'All plants',

  /** The first option of the severity filter: no severity constraint. */
  anySeverity: 'All severities',

  /** The first option of the status filter: no status constraint. */
  anyStatus: 'All statuses',

  /** The first option of the owner filter: no owner constraint. */
  anyOwner: 'All owners',

  /**
   * What the supplier field accepts, tied to it by `aria-describedby`. The row carries no supplier, so
   * the field takes the identifier the port filters on rather than offering a list this screen cannot
   * build; the sentence says so instead of leaving the reader to guess.
   */
  supplierHint:
    'The supplier identifier an exception’s material is bought from, applied when the field loses focus.',

  /**
   * What the row naming the day the queue was narrowed to says, with that day after it.
   *
   * It names the rule the port applies rather than a filter this screen performs: the read keeps the
   * exceptions opened or resolved on that day, which is the rule SCR-01's series counts by (AAP 0.12.4,
   * `ExceptionQuery.date`). The date itself is appended where the row renders it, because it is a
   * record's value rather than this screen's wording (rule P-6).
   */
  dayNarrowing: 'Opened or resolved on',

  /** The control that clears the active day and reads the whole queue again (rule P-8). */
  clearDay: 'Clear day',

  /* The columns ------------------------------------------------------------------------------ */

  /** The identifier column's header. */
  columnID: 'Exception',

  /** The type column's header. */
  columnType: 'Type',

  /** The title column's header. */
  columnTitle: 'Title',

  /** The products column's header. */
  columnProducts: 'Products',

  /** The plant column's header. */
  columnPlant: 'Plant',

  /** The severity column's header. */
  columnSeverity: 'Severity',

  /** The revenue column's header. */
  columnRevenue: 'Revenue at risk',

  /** The days-to-impact column's header. */
  columnDaysToImpact: 'Days to impact',

  /** The status column's header. */
  columnStatus: 'Status',

  /** The owner column's header. */
  columnOwner: 'Owner',

  /** The age column's header, naming the unit the record states it in. */
  columnAge: 'Age (hours)',

  /** The freshness column's header. */
  columnFreshness: 'Freshness',

  /** The actions column's header: the three row controls of AAP 0.12.4 SCR-02. */
  columnActions: 'Actions',

  /* The row actions -------------------------------------------------------------------------- */

  /** The row action that opens the exception's investigation, and the row activation's label. */
  open: 'Open',

  /** The row action that makes the acting persona the exception's owner. */
  assignToMe: 'Assign to me',

  /** The row action that opens the dismissal dialog. */
  dismiss: 'Dismiss',

  /** Why "assign to me" cannot act: the bound adapter reports no persona to assign to. */
  assignUnavailableReason:
    'Assigning needs the persona this session acts as, which the bound service does not report.',

  /** Why "assign to me" cannot act on a row the acting persona already owns. */
  alreadyOwnerReason: ALREADY_OWNER_REASON,

  /** Why "assign to me" cannot act while an assignment is being recorded. */
  assignInFlightReason: 'An assignment is already being recorded.',

  /** Why "dismiss" cannot act: the exception has already been dismissed. */
  alreadyDismissedReason: 'This exception has already been dismissed.',

  /**
   * Why a row's two writes cannot act: the acting role does not hold `exception.work` over the plant the
   * row lands on. {@link noWorkReason} composes the role the adapter enforces, that plant and the
   * permission's own name — held as the constant the gate itself checks, so the sentence and the check
   * cannot name two permissions — into one sentence, and closes it with {@link noWorkRoles} once the
   * roster has answered. The reader is therefore told who may act before activating the control rather
   * than by the refusal afterwards (AAP 0.2.1, rules P-3 and P-8).
   */
  noWorkActor: 'The acting role',
  noWorkLacks: 'does not hold the',
  noWorkOver: 'permission over',
  noWorkOutcome: 'so this exception cannot be changed here.',

  /** The clause naming the roles that hold `exception.work`, composed in by {@link noWorkReason}. */
  noWorkRoles: 'The roles that hold it are',

  /* The writes ------------------------------------------------------------------------------- */

  /** What the report says once an assignment was recorded, naming the persona the service returned. */
  assigned: 'Assigned to',

  /** What the report says once a dismissal was recorded. */
  dismissed: 'Dismissed with the reason you gave.',

  /** The headline of a write the service refused. */
  writeFailed: 'The service refused the action',

  /** What the report says when a write failed without a `Problem` to quote. */
  writeUnreported: 'The action stopped without reporting a cause.',

  /** Introduces the roles a permission refusal named, so the reader knows who may act. */
  rolesThatMayAct: 'Roles that may act:',

  /* The dismissal dialog --------------------------------------------------------------------- */

  /** The dialog's heading, and the name its `aria-labelledby` points at. */
  dismissHeading: 'Dismiss exception',

  /**
   * The dialog's instruction: it names what a dismissal needs and what the action then does, without
   * claiming anything about the record beyond what the write does to it.
   */
  dismissSummary: 'Say why this exception is being set aside. The reason is recorded with the dismissal.',

  /** The reason field's label. */
  reasonLabel: 'Reason',

  /** The reason field's requirement, and the confirm's reason while the field is empty (rule P-8). */
  reasonRequired: 'A dismissal needs a reason.',

  /** What the reason field accepts. */
  reasonHint: 'One or two sentences a colleague would understand.',

  /** Why the confirm cannot act while the dismissal is being recorded. */
  dismissInFlightReason: 'The dismissal is already being recorded.',

  /** The dialog's cancel control. */
  cancel: 'Cancel',

  /** The dialog's confirm control. */
  confirmDismiss: 'Dismiss exception',

  /* The states ------------------------------------------------------------------------------- */

  /**
   * The sentence shown when a narrowed read holds no row to show: a filter set or the day emptied it,
   * so the filter wording states what the reader already did (see the module header on the empty queue).
   */
  empty: 'No exceptions match the current filters.',

  /**
   * The sentence shown when the queue holds no row and nothing narrowed the read.
   *
   * The demonstration control that empties the queue empties the collection the read is served from, so
   * no filter is applied and the filter wording above would describe a constraint no control on the page
   * sets. This sentence claims no filter and no other cause either, because the read's empty answer is
   * the only fact this screen has (rule P-4).
   */
  emptyUnnarrowed: 'No exceptions to show.',

  /** The sentence the partial state adds when a source answered incompletely. */
  partial: 'The queue is missing inputs a source did not answer with, so its figures are incomplete.',

  /** The sentence the conflict state adds when a record moved under the reader. */
  conflict: 'Read the queue again to see the records as they now stand.',

  /* The saved views -------------------------------------------------------------------------- */

  /** The saved-view name field's label. */
  viewNameLabel: 'View name',

  /** What the name field accepts. */
  viewNameHint: 'A name you will recognise in this session’s list.',

  /** Why saving a view cannot act: the field holds no usable name. */
  viewNameRequiredReason: 'A saved view needs a name.',

  /** The control that saves the current filter set under the typed name. */
  saveView: 'Save current view',

  /** What the saved-view list shows when nothing has been saved yet. */
  noSavedViews: 'No views saved in this session.',

  /** The control that reapplies one saved view. {@link recordScopedLabel} adds the view's name. */
  applyView: 'Apply',

  /** The control that removes one saved view from the session's list. */
  removeView: 'Remove',

  /** The message shown when a typed name carried nothing an identifier can be derived from. */
  viewNameUnusable: 'A saved view needs a name holding a letter or a digit.',

  /**
   * What saving a name that is already in the list does: it replaces the view that name stood for. Said
   * once, under the field, so the reader is not surprised by a list that did not grow.
   */
  saveReplaceHint: 'Saving a name already in the list replaces the view that name stood for.',
} as const;

/**
 * The exact specification §5.3 label the computed revenue column carries (rule P-1, AAP 0.10).
 *
 * Selected from the tuple that owns the seven strings rather than spelled again here, so a reworded
 * label reaches this column from its one owner; typed as `SimLabel` so anything that is not one of
 * the fixed strings fails to compile rather than reaching a reader as a near miss.
 */
const CALCULATED_LABEL: SimLabel = SIM_LABELS[1];

/* ---------------------------------------------------------------------------------------------
 * Role styles, and nothing else
 * ------------------------------------------------------------------------------------------- */

/** The page frame: one column, with the 4 px grid's larger step between its groups. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-6';

/** The filter row: fields wrap rather than shrink below their label. */
const FILTER_ROW_CLASSES = 'flex min-w-0 flex-wrap items-start gap-3';

/**
 * The row stating the day the queue is narrowed to: the sentence and its clear control on one line,
 * wrapping where room runs out, set off from the six filter fields beneath it.
 */
const ACTIVE_DAY_CLASSES = 'mb-3 flex min-w-0 flex-wrap items-center gap-2';

/** The day sentence: the body step in the primary text role, so the narrowed date is read first. */
const ACTIVE_DAY_TEXT_CLASSES = 'min-w-0 break-words text-13 text-text-primary';

/** One field: its label above its control and its message, so no child needs a margin. */
const FIELD_CLASSES = 'flex min-w-0 flex-col gap-1';

/** A field's visible label, in the caption role at the smallest step of the type scale. */
const LABEL_CLASSES = 'text-12 text-text-caption';

/**
 * A field's control: the control boundary on the first surface, at least 24 by 24 px (rule B-3), with
 * the active theme's 2 px focus ring drawn for keyboard focus only.
 *
 * The pointer is answered as well — `hover:` lifts the boundary to the accent role, as every other
 * field in the product does — and the colour change is `motion-safe:`, so a reduced-motion session gets
 * the same hover with no transition. No palette literal, arbitrary value or elevation effect appears here: the
 * role styles expose none to select.
 */
const CONTROL_CLASSES =
  'min-h-6 min-w-32 rounded-control border border-control-boundary bg-surface-1 px-2 py-1 text-13 text-text-primary hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-safe:transition-colors motion-safe:duration-150';

/** The reason field inside the dialog: tall enough for a sentence, resizable down the column. */
const REASON_CONTROL_CLASSES = `${CONTROL_CLASSES} min-h-24 min-w-0 w-full resize-y`;

/** A field's supporting sentence. */
const HINT_CLASSES = 'text-12 text-text-caption';

/** A field's blocker, in the `fail` status role: the sentence itself says what is missing. */
const MESSAGE_PROBLEM_CLASSES = 'text-12 text-status-fail';

/** A supporting sentence one step up from a hint. */
const DETAIL_CLASSES = 'min-w-0 break-words text-13 text-text-secondary';

/** The saved-view row: the name, then the controls that act on it, wrapping where room runs out. */
const VIEW_ROW_CLASSES =
  'flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-control border border-hairline bg-surface-1 px-2 py-1';


/* ---------------------------------------------------------------------------------------------
 * The record's own spelling, and the meanings the shared status vocabulary gives it
 * ------------------------------------------------------------------------------------------- */

/**
 * A record's own spelling, made readable: its words separated by spaces, the first one capitalised.
 *
 * The vocabulary is the record's, never a list restated here: a type of `supply-delay` reads "Supply
 * delay", a severity of `high` reads "High". Nothing is added, reordered or translated, so a value this
 * screen has never seen still reads as the record spells it (rule P-6).
 */
function sentenceOf(value: string): string {
  const words = value.split(/[-_\s]+/).filter((word) => word !== '');

  if (words.length === 0) {
    return value;
  }

  const sentence = words.join(' ');
  const first = sentence.charAt(0);

  return `${first.toUpperCase()}${sentence.slice(1)}`;
}

/**
 * What each of the four severities amounts to in the shared status vocabulary.
 *
 * No input fixes this mapping, so it is this screen's decision and it is made once: the most urgent
 * level reads as a failure, the next as a warning, the third as something to review and the least urgent
 * as empty. The label beside the icon is always the record's own spelling, so the meaning never replaces
 * what the record says (rule B-3: an icon, a label and a colour together). The map is exhaustive by
 * type, so a fifth severity fails to compile rather than rendering a status with no meaning.
 */
const SEVERITY_MEANINGS = {
  critical: 'fail',
  high: 'warning',
  medium: 'review',
  low: 'empty',
} as const satisfies Record<Severity, StatusMeaning>;

/**
 * What each of the three statuses amounts to in the shared status vocabulary.
 *
 * The same decision, made once, for the column that says where an exception stands: an open exception is
 * the warning a planner acts on, a resolved one is a pass, and a dismissed one is empty — it was set
 * aside with a reason rather than answered. Exhaustive by type for the same reason as the map above.
 */
const STATUS_MEANINGS = {
  open: 'warning',
  resolved: 'pass',
  dismissed: 'empty',
} as const satisfies Record<ExceptionStatus, StatusMeaning>;

/* ---------------------------------------------------------------------------------------------
 * The filters, as values and as the query they build
 * ------------------------------------------------------------------------------------------- */

/**
 * The six filters as the controls hold them: the chosen value, or the empty string for no constraint.
 *
 * The two closed vocabularies keep their own types rather than a loose string, so the query built from
 * this state can only carry a severity the records can hold; the four open identifiers stay strings
 * because `ExceptionType`, `PlantId`, `UserId` and `SupplierId` are the contracts' own open aliases.
 */
interface FilterValues {
  /** The chosen exception type, or the empty string for every type. */
  readonly type: string;

  /** The chosen plant, or the empty string for every plant in scope. */
  readonly plantId: string;

  /** The chosen severity, or the empty string for every severity. */
  readonly severity: Severity | '';

  /** The chosen status, or the empty string for every status. */
  readonly status: ExceptionStatus | '';

  /** The chosen owner, or the empty string for every owner. */
  readonly ownerId: string;

  /** The supplier typed into the supplier field, or the empty string for every supplier. */
  readonly supplierId: string;
}

/** Every one of the six filters is unconstrained, which is the query the screen opens with. */
const NO_FILTERS: FilterValues = {
  type: '',
  plantId: '',
  severity: '',
  status: '',
  ownerId: '',
  supplierId: '',
};

/** No plant or product selection, which the port reads as "all plants" and "all products". */
const NO_SCOPE: Scope = { plants: [], products: [] };

/**
 * The filters a shell-supplied query pre-applies, as the controls hold them.
 *
 * Every member a caller did not state becomes no constraint, so a shell that pins the plant alone still
 * leaves the other five filters open. The continuation position and the ordering are not filter values
 * and are handled where the query is built.
 */
function filterValuesOf(query: Partial<ExceptionQuery> | undefined): FilterValues {
  if (query === undefined) {
    return NO_FILTERS;
  }

  return {
    type: query.type ?? '',
    plantId: query.plantId ?? '',
    severity: query.severity ?? '',
    status: query.status ?? '',
    ownerId: query.ownerId ?? '',
    supplierId: query.supplierId ?? '',
  };
}

/**
 * The ordering a `sort=field:dir` parameter names, as the table's controlled sort, or `null`.
 *
 * Contracts §9 fixes the form; a missing direction reads as ascending, as the port's list read does, and
 * a form this screen cannot read yields `null` — the state in which the service applies SCR-02's own
 * severity-then-days order. The column id is taken as given: `DataTable` shows a sorted column only for
 * an id it has, and the port falls back to its default order for a member it does not order by.
 */
function tableSortOf(sort: string | undefined): TableSort | null {
  if (sort === undefined) {
    return null;
  }

  const [columnId, direction] = sort.split(':');

  if (columnId === undefined || columnId === '') {
    return null;
  }

  if (direction === undefined || direction === 'asc') {
    return { columnId, direction: 'asc' };
  }

  return direction === 'desc' ? { columnId, direction: 'desc' } : null;
}

/**
 * The order the queue's rows arrive in, which the table announces and never applies.
 *
 * The screen sends no `sort` until a reader sorts a column, and the service then applies `sortUrgent`
 * in `src/domain/aggregation/urgency.ts` — the order `src/services/mock/handlers/exceptions.ts` also
 * answers `sort=severity:asc` with, because the urgency rank is that module's: severity ascending by
 * the rank, in which critical holds rank 0 and stands first, with days to impact breaking the ties.
 * Ascending is therefore the direction the severity column is in effect in before anyone sorts, and
 * announcing it is what lets a reader hear the order the rows are already in. It is not sort state: it
 * replays no read, reorders no row and reaches no `onSort`, and the moment the reader sorts a column
 * the controlled `sort` replaces it outright.
 */
const QUEUE_DEFAULT_ORDER: TableSort = { columnId: 'severity', direction: 'asc' };

/**
 * The query the queue's read is made with: the six filters, the day it was narrowed to, the ordering and
 * the page size.
 *
 * A member is written only when it carries a constraint, so the object the cache keys on holds exactly
 * what the reader chose and `exactOptionalPropertyTypes` never sees a member present as `undefined`. No
 * continuation position is sent: this screen reads the first page the service returns, and a saved view
 * deliberately drops one (see `./saved-views`).
 *
 * The day is the one the overview's series narrowed the queue to, or `null` when no day narrows it. It
 * travels as the query's own member rather than as a row filter, so the service — not this screen —
 * decides which exceptions that day keeps (rule P-2).
 */
function buildExceptionQuery(
  filters: FilterValues,
  sort: TableSort | null,
  limit: number | undefined,
  day: IsoDate | null,
): ExceptionQuery {
  return {
    ...(limit !== undefined ? { limit } : {}),
    ...(filters.type !== '' ? { type: filters.type } : {}),
    ...(filters.plantId !== '' ? { plantId: filters.plantId } : {}),
    ...(filters.severity !== '' ? { severity: filters.severity } : {}),
    ...(filters.status !== '' ? { status: filters.status } : {}),
    ...(filters.ownerId !== '' ? { ownerId: filters.ownerId } : {}),
    ...(filters.supplierId !== '' ? { supplierId: filters.supplierId } : {}),
    ...(day !== null ? { date: day } : {}),
    ...(sort !== null ? { sort: `${sort.columnId}:${sort.direction}` } : {}),
  };
}

/**
 * Whether anything narrowed the read: one of the six filters is set, or the day the overview counted it
 * by is.
 *
 * It is answered from the values the read was built from rather than from the answer, because an empty
 * answer is the same whether a constraint emptied it or nothing was constrained at all. Only the
 * sentence the empty table states depends on it (see the module header on the empty queue).
 */
function narrowsRead(filters: FilterValues, day: IsoDate | null): boolean {
  return (
    day !== null ||
    filters.type !== '' ||
    filters.plantId !== '' ||
    filters.severity !== '' ||
    filters.status !== '' ||
    filters.ownerId !== '' ||
    filters.supplierId !== ''
  );
}

/** The values the five enumerated filters offer, read from the rows a read returned. */
interface FilterOptions {
  /** The exception types the rows carry. */
  readonly types: readonly string[];

  /** The plants the rows land on. */
  readonly plants: readonly string[];

  /** The severities the rows carry. */
  readonly severities: readonly Severity[];

  /** The statuses the rows carry. */
  readonly statuses: readonly ExceptionStatus[];

  /** The personas the rows are owned by. */
  readonly owners: readonly string[];
}

/** What each filter offers before a read has answered: the "All" option alone. */
const NO_OPTIONS: FilterOptions = {
  types: [],
  plants: [],
  severities: [],
  statuses: [],
  owners: [],
};

/**
 * The distinct values one member holds across a set of rows, in a stable order.
 *
 * A set union and nothing more — no count, no threshold and no arithmetic (rule P-6) — with the result
 * ordered by its own text so the options do not reorder themselves between two reads that returned the
 * same values.
 */
function distinctValues<Value extends string>(
  rows: readonly ExceptionRow[],
  pick: (row: ExceptionRow) => Value,
): Value[] {
  const values = new Set<Value>();

  for (const row of rows) {
    values.add(pick(row));
  }

  return [...values].sort((left, right) => left.localeCompare(right));
}

/** The five enumerated filters' options: the distinct values of the answer the queue holds. */
function filterOptionsOf(rows: readonly ExceptionRow[]): FilterOptions {
  return {
    types: distinctValues(rows, (row) => row.type),
    plants: distinctValues(rows, (row) => row.plantId),
    severities: distinctValues(rows, (row) => row.severity),
    statuses: distinctValues(rows, (row) => row.status),
    owners: distinctValues(rows, (row) => row.ownerId),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The filter controls — the field primitives in `src/components` own the elements, composed here
 * ------------------------------------------------------------------------------------------- */

/**
 * One option of an enumerated filter: the value the query takes and the text the reader picks it by.
 *
 * Both are strings because the option `SelectField` renders carries a string value and a string label; a
 * closed vocabulary reaches the option through the typed array the caller maps from, so the control can
 * never offer a value the records cannot hold.
 */
interface Choice {
  /** The value the filter takes when this option is chosen, or the empty string for no constraint. */
  readonly value: string;

  /** The text shown in the option. */
  readonly label: string;
}

/** Props of {@link ChoiceField}: one enumerated filter, labelled and controlled. */
interface ChoiceFieldProps {
  /** The filter's visible label, which is also its control's accessible name. */
  readonly label: string;

  /** The reader's current value, or the empty string for no constraint. */
  readonly value: string;

  /** The options offered, the "All" option first. */
  readonly options: readonly Choice[];

  /** Called with the chosen option's value. */
  readonly onChange: (value: string) => void;
}

/**
 * One labelled enumerated filter.
 *
 * The `<select>` this filter shows is `SelectField`'s, in `src/components`: that primitive owns the
 * element, its controlled value and its change contract, and this component composes it with the screen's
 * label, the options the read supplied and the class list the filter row shares (AAP 0.5.2). Composing the
 * platform's own control keeps the field keyboard operable, announced as a list box and rendered with the
 * reader's own input device, and the label is bound by `htmlFor`/`id`, so the control has a programmatic
 * name (rule B-3).
 */
function ChoiceField({ label, value, options, onChange }: ChoiceFieldProps): ReactElement {
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

/** Props of {@link SupplierFilterField}: the one filter whose values the rows do not carry. */
interface SupplierFilterFieldProps {
  /** The supplier identifier the query currently filters on, or the empty string for none. */
  readonly value: string;

  /** Called with the trimmed identifier once the reader is done typing. */
  readonly onCommit: (value: string) => void;
}

/**
 * The supplier filter: a labelled text field that sends its value when the reader is done typing.
 *
 * It is a text field rather than a select because `ExceptionRow` carries no supplier — the port filters on
 * the supplier an exception's material is bought from without projecting it onto the row — and the port
 * declares no payload of filter options, so a select here would offer a list this screen never receives.
 *
 * The value is committed on blur and on `Enter` rather than on every keystroke: each change replaces the
 * query and therefore the cache key, so a keystroke-by-keystroke commit would issue one read per character
 * typed. The field keeps its own draft so typing is never fighting a re-render, and the caller keys it by
 * the committed value, so applying a saved view or clearing the filter resets the draft with it.
 */
function SupplierFilterField({ value, onCommit }: SupplierFilterFieldProps): ReactElement {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const [draft, setDraft] = useState(value);

  const commit = (): void => {
    onCommit(draft.trim());
  };

  return (
    <div className={FIELD_CLASSES}>
      <label htmlFor={fieldId} className={LABEL_CLASSES}>
        {EXCEPTION_QUEUE_TEXT.supplierFilter}
      </label>
      <TextField
        id={fieldId}
        type="text"
        value={draft}
        aria-describedby={hintId}
        onChange={setDraft}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
        className={CONTROL_CLASSES}
      />
      <p id={hintId} className={HINT_CLASSES}>
        {EXCEPTION_QUEUE_TEXT.supplierHint}
      </p>
    </div>
  );
}

/** Props of {@link ActiveDayRow}: the day the queue is narrowed to and the control that clears it. */
interface ActiveDayRowProps {
  /** The calendar date the read is narrowed by, exactly as the record states it. */
  readonly day: IsoDate;

  /** Called when the reader clears the day and asks for the whole queue again. */
  readonly onClear: () => void;
}

/**
 * The day the queue was narrowed to, and the control that clears it.
 *
 * It sits inside the Filters group because it is state of the queue's read, but it is not a filter
 * control and is deliberately shaped unlike one: no label/field pair, no select, no text input. AAP
 * 0.12.4 fixes the queue's filters as six, so a seventh control here would contradict the screen's own
 * contract; what a reader needs from a narrowing they arrived with is to see it and to leave it (rule
 * P-8). The date is printed as the record states it — this row formats nothing, computes nothing and
 * reads no clock (rule P-6) — and the clear control is the product's `ActionButton`, which carries the
 * house focus ring and the 24 × 24 px minimum target a keyboard reader needs (rule B-3).
 */
function ActiveDayRow({ day, onClear }: ActiveDayRowProps): ReactElement {
  return (
    <div className={ACTIVE_DAY_CLASSES}>
      <p className={ACTIVE_DAY_TEXT_CLASSES}>{`${EXCEPTION_QUEUE_TEXT.dayNarrowing} ${day}`}</p>
      <ActionButton variant="secondary" onClick={onClear}>
        {EXCEPTION_QUEUE_TEXT.clearDay}
      </ActionButton>
    </div>
  );
}

/**
 * One filter's values: the answer's, with the value in force kept among them.
 *
 * A chosen value narrows the answer it came from, and a filter set whose read has not settled yet has no
 * answer at all, so the value in force is missing from the read's own list in both cases. `SelectField`
 * leaves that to the call site (see its module note), and a select that dropped its own selection could
 * neither show the narrowing it reports nor report a change of it (rules P-8, B-3). The retained value is
 * folded in by its own text, as {@link distinctValues} orders the answer's, so an option does not move
 * when the read starts stating it.
 */
function withCurrentValue<Value extends string>(
  values: readonly Value[],
  current: Value | '',
): readonly Value[] {
  if (current === '') {
    return values;
  }

  return values.includes(current)
    ? values
    : [...values, current].sort((left, right) => left.localeCompare(right));
}

/** Props of {@link FilterBar}: the six filters, their options and the state they stand for. */
interface FilterBarProps {
  /** The filters as the controls hold them. */
  readonly values: FilterValues;

  /** The values the five enumerated filters offer, taken from the rows of the answer the queue holds. */
  readonly options: FilterOptions;

  /** Called with the whole filter state after a control changes one member of it. */
  readonly onChange: (next: FilterValues) => void;
}

/**
 * The six filters of SCR-02, as one row that wraps rather than shrinking its fields.
 *
 * Each enumerated filter offers the answer's own values plus the value in force, because the answer
 * narrows with the filter that produced it and a changed filter set has no answer until its read settles.
 *
 * The two closed vocabularies are narrowed here, at the control that produced the value: `SelectField`
 * hands back a string, and the `find` over the values this row offered returns the member of the union it
 * actually matched, so the state this component reports can only carry a severity or a status the records
 * hold. Nothing is filtered, intersected or re-ordered here — a change replaces the whole filter state,
 * which replaces the query and therefore the read (AAP 0.12.4: the service narrows the rows, not the
 * screen).
 */
function FilterBar({ values, options, onChange }: FilterBarProps): ReactElement {
  const types = withCurrentValue(options.types, values.type);
  const plants = withCurrentValue(options.plants, values.plantId);
  const severities = withCurrentValue(options.severities, values.severity);
  const statuses = withCurrentValue(options.statuses, values.status);
  const owners = withCurrentValue(options.owners, values.ownerId);

  const typeChoices: readonly Choice[] = [
    { value: '', label: EXCEPTION_QUEUE_TEXT.anyType },
    ...types.map((type) => ({ value: type, label: sentenceOf(type) })),
  ];

  const plantChoices: readonly Choice[] = [
    { value: '', label: EXCEPTION_QUEUE_TEXT.anyPlant },
    ...plants.map((plantId) => ({ value: plantId, label: plantId })),
  ];

  const severityChoices: readonly Choice[] = [
    { value: '', label: EXCEPTION_QUEUE_TEXT.anySeverity },
    ...severities.map((severity) => ({ value: severity, label: sentenceOf(severity) })),
  ];

  const statusChoices: readonly Choice[] = [
    { value: '', label: EXCEPTION_QUEUE_TEXT.anyStatus },
    ...statuses.map((status) => ({ value: status, label: sentenceOf(status) })),
  ];

  const ownerChoices: readonly Choice[] = [
    { value: '', label: EXCEPTION_QUEUE_TEXT.anyOwner },
    ...owners.map((ownerId) => ({ value: ownerId, label: ownerId })),
  ];

  return (
    <div className={FILTER_ROW_CLASSES}>
      <ChoiceField
        label={EXCEPTION_QUEUE_TEXT.typeFilter}
        value={values.type}
        options={typeChoices}
        onChange={(value) => {
          onChange({ ...values, type: value });
        }}
      />
      <ChoiceField
        label={EXCEPTION_QUEUE_TEXT.plantFilter}
        value={values.plantId}
        options={plantChoices}
        onChange={(value) => {
          onChange({ ...values, plantId: value });
        }}
      />
      <ChoiceField
        label={EXCEPTION_QUEUE_TEXT.severityFilter}
        value={values.severity}
        options={severityChoices}
        onChange={(value) => {
          const severity = severities.find((candidate) => candidate === value);
          onChange({ ...values, severity: severity ?? '' });
        }}
      />
      <ChoiceField
        label={EXCEPTION_QUEUE_TEXT.statusFilter}
        value={values.status}
        options={statusChoices}
        onChange={(value) => {
          const status = statuses.find((candidate) => candidate === value);
          onChange({ ...values, status: status ?? '' });
        }}
      />
      <ChoiceField
        label={EXCEPTION_QUEUE_TEXT.ownerFilter}
        value={values.ownerId}
        options={ownerChoices}
        onChange={(value) => {
          onChange({ ...values, ownerId: value });
        }}
      />
      <SupplierFilterField
        key={values.supplierId}
        value={values.supplierId}
        onCommit={(value) => {
          onChange({ ...values, supplierId: value });
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The saved views — the filter sets a planner keeps for the session
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link SavedViewsPanel}: the saved list, the name being typed and what acts on both. */
interface SavedViewsPanelProps {
  /** The saved views, in the order the reader sees them. */
  readonly views: readonly SavedView[];

  /** The name currently typed into the field. */
  readonly name: string;

  /** Why saving cannot act, or `null` when it can (rule P-8). */
  readonly saveBlocker: string | null;

  /** A message about the last save attempt, or `null` when there is nothing to report. */
  readonly message: string | null;

  /** Called with the name as it is typed. */
  readonly onNameChange: (value: string) => void;

  /** Called when the reader asks to save the current filter set. */
  readonly onSave: () => void;

  /** Called when the reader applies one view. */
  readonly onApply: (view: SavedView) => void;

  /** Called when the reader removes one view from the session's list. */
  readonly onRemove: (view: SavedView) => void;
}

/**
 * The saved-view name field, its save control and the list of views this session holds.
 *
 * The list lives in the calling screen's state and nowhere else: only the theme and the density survive a
 * visit (contracts §1), so no view reaches browser storage, a cookie or a request. Each view's controls
 * take their name from {@link recordScopedLabel}, which puts the view's own name in the one text node
 * that carries it, because a list of several "Apply" controls would otherwise be several controls with
 * one name — `ActionButton` takes no separate accessible-name prop, so the name is built from its
 * children.
 */
function SavedViewsPanel({
  views,
  name,
  saveBlocker,
  message,
  onNameChange,
  onSave,
  onApply,
  onRemove,
}: SavedViewsPanelProps): ReactElement {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className={FILTER_ROW_CLASSES}>
        <div className={FIELD_CLASSES}>
          <label htmlFor={fieldId} className={LABEL_CLASSES}>
            {EXCEPTION_QUEUE_TEXT.viewNameLabel}
          </label>
          <TextField
            id={fieldId}
            type="text"
            value={name}
            aria-describedby={hintId}
            onChange={onNameChange}
            className={CONTROL_CLASSES}
          />
          <p id={hintId} className={HINT_CLASSES}>
            {EXCEPTION_QUEUE_TEXT.viewNameHint}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-1 self-end">
          {/*
            The control is written once per state on purpose: `ActionButtonProps` is a discriminated
            union, so a `disabled` flag held in a boolean cannot be passed with its reason at all. Each
            branch passes its own literal and the reason can never go missing (rule P-8).
          */}
          {saveBlocker === null ? (
            <ActionButton variant="secondary" onClick={onSave}>
              {EXCEPTION_QUEUE_TEXT.saveView}
            </ActionButton>
          ) : (
            <ActionButton
              variant="secondary"
              onClick={onSave}
              disabled
              disabledReason={saveBlocker}
            >
              {EXCEPTION_QUEUE_TEXT.saveView}
            </ActionButton>
          )}
          <p className={HINT_CLASSES}>{EXCEPTION_QUEUE_TEXT.saveReplaceHint}</p>
        </div>
      </div>

      {message === null ? null : (
        <p role="status" className={MESSAGE_PROBLEM_CLASSES}>
          {message}
        </p>
      )}

      {views.length === 0 ? (
        <p className={HINT_CLASSES}>{EXCEPTION_QUEUE_TEXT.noSavedViews}</p>
      ) : (
        <ul className={VIEWS_LIST_CLASSES}>
          {views.map((view) => (
            <li key={view.id} className={VIEW_ROW_CLASSES}>
              <span className={VIEW_NAME_CLASSES}>{view.name}</span>
              <span className={VIEW_ACTIONS_CLASSES}>
                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    onApply(view);
                  }}
                >
                  {recordScopedLabel(EXCEPTION_QUEUE_TEXT.applyView, view.name)}
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={() => {
                    onRemove(view);
                  }}
                >
                  {recordScopedLabel(EXCEPTION_QUEUE_TEXT.removeView, view.name)}
                </ActionButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A saved view's name, in the primary text role and broken rather than overflowing its row. */
const VIEW_NAME_CLASSES = 'min-w-0 break-words text-13 text-text-primary';

/** The pair of controls acting on one saved view. */
const VIEW_ACTIONS_CLASSES = 'flex shrink-0 flex-wrap items-center gap-2';

/** The saved-view list: one column, on the 4 px grid. */
const VIEWS_LIST_CLASSES = 'flex min-w-0 flex-col gap-2';

/** The block above the table: the computed column's label and the sentence that says what it labels. */
const TABLE_GROUP_CLASSES = 'flex min-w-0 flex-col gap-2';

/** The region reporting what the last write did, bounded in the status role the outcome carries. */
const REPORT_CLASSES =
  'flex min-w-0 flex-col gap-1 rounded-card border border-hairline bg-surface-2 p-3';

/** The row's three controls: they wrap rather than push the column wider than the table. */
const ROW_ACTIONS_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2';

/** One row control: compact, so three of them fit a cell in both densities. */
const ROW_ACTION_CLASSES = 'px-2';

/**
 * The freshness cell: the source's name, its state through the status primitive and the instant it
 * last answered, stacked. The name is plain detail text and the state is the primitive's label, so
 * the icon and the status colour sit on the word that states a status (rule B-3).
 */
const FRESHNESS_CELL_CLASSES = 'flex min-w-0 flex-col gap-1';

/** A cell's supporting line: the smallest step, in the secondary text role. */
const CELL_DETAIL_CLASSES = 'text-12 text-text-secondary';

/** The dismissal dialog's scrim: the ground role over the page, with no second elevation cue. */
const OVERLAY_CLASSES =
  'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ground/80 p-4 sm:items-center';

/** The dialog's own box: wide enough for a sentence, never wider than the viewport allows. */
const DIALOG_CLASSES = 'w-full max-w-xl';

/** The dialog's heading. The `id` on it is what `aria-labelledby` names the dialog by. */
const DIALOG_HEADING_CLASSES = 'text-16 font-semibold text-text-primary';

/** The dialog's instruction, in the secondary text role. */
const DIALOG_SUMMARY_CLASSES = 'min-w-0 break-words text-13 text-text-secondary';

/** The dialog's record caption: the identifier and title of the exception being dismissed. */
const DIALOG_RECORD_CLASSES = 'min-w-0 break-words font-mono text-12 text-text-secondary';

/** The dialog's action row: cancel first, the one action the dialog exists to take last. */
const ACTIONS_CLASSES = 'flex flex-wrap items-center justify-end gap-2';

/* ---------------------------------------------------------------------------------------------
 * The dismissal dialog — SCR-02's "dismiss with a reason", rule P-8
 * ------------------------------------------------------------------------------------------- */

/** The controls a modal dialog can hold, in document order, which is the order `Tab` follows. */
const DIALOG_CONTROLS_SELECTOR = 'textarea, input, select, button';

/** The focusable controls of the dialog, so the trap can wrap at either end. */
function focusableElementsOf(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(DIALOG_CONTROLS_SELECTOR)).filter(
    (element) => !element.hasAttribute('disabled'),
  );
}

/**
 * What the reader is told about a write that did not complete.
 *
 * A `Problem` carries its own sentence, and a permission refusal also carries the roles that hold what
 * the acting role lacks — which is the half rule P-8 asks for, so the reader learns who may act rather
 * than only that they may not. A rejection that did not arrive in the documented shape is reported as
 * unreported rather than quoted, because there is no sentence to quote.
 */
function failureMessageOf(thrown: unknown): string {
  if (!isProblem(thrown)) {
    return EXCEPTION_QUEUE_TEXT.writeUnreported;
  }

  const roles = thrown.rolesWithPermission;

  if (roles === undefined || roles.length === 0) {
    return thrown.message;
  }

  return `${thrown.message} ${EXCEPTION_QUEUE_TEXT.rolesThatMayAct} ${roles.join(', ')}`;
}

/** Props of {@link DismissDialog}: the row being set aside and what closing it does. */
interface DismissDialogProps {
  /** The exception being dismissed, whose identifier and title the dialog shows. */
  readonly row: ExceptionRow;

  /** Called when the reader closes the dialog without recording a dismissal. */
  readonly onClose: () => void;

  /** Called once the service has recorded the dismissal and the queue must be read again. */
  readonly onDismissed: () => void;
}

/**
 * The modal that collects the reason a dismissal rests on and asks the service to record it.
 *
 * AAP 0.12.4's SCR-02 row fixes the action as "dismiss with a reason" and requires the action to stay
 * disabled until a reason is given; rule P-8 makes the disabled control's explanation non-negotiable, so
 * the confirm is an `ActionButton` whose `disabledReason` is the sentence the field's own message
 * repeats. The reason is trimmed before it is sent, and the service refuses an empty one regardless of
 * what this control offered, so the record always says why the exception was set aside.
 *
 * A real modal, not a panel that looks like one: `role="dialog"` with `aria-modal="true"`, named by the
 * heading this component renders and described by its instruction; focus moves into the reason field as
 * it opens and returns to the control that opened it as it closes; `Tab` and `Shift+Tab` are trapped in
 * both directions; `Esc` closes it, and is ignored while the write is in flight because the call has been
 * sent and closing would discard the answer that decides what the reader is told.
 *
 * A refusal leaves the dialog open with the reason intact and the service's own sentence beside it — the
 * failure is never swallowed and nothing typed is lost (AAP 0.2.2). The reads the write touched are
 * invalidated by the caller once the payload is in hand, so the queue behind the dialog re-reads rather
 * than serving the answer it cached before the write (AAP 0.6.2).
 */
function DismissDialog({ row, onClose, onDismissed }: DismissDialogProps): ReactElement {
  const service = useService();

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);

  const headingId = useId();
  const summaryId = useId();
  const reasonId = useId();
  const reasonMessageId = useId();

  const trimmedReason = reason.trim();
  const reasonBlocker = trimmedReason === '' ? EXCEPTION_QUEUE_TEXT.reasonRequired : null;

  /* While the write is in flight that state outranks the field's own requirement: the reader can no
     longer change the outcome, so the control says what is actually holding it. */
  const confirmBlocker = submitting
    ? EXCEPTION_QUEUE_TEXT.dismissInFlightReason
    : reasonBlocker;

  /* Focus moves into the dialog as it opens and returns to whatever opened it as it closes. The opener is
     read in this pass rather than in a later one, because the field is focused straight after and
     `document.activeElement` would already be that field. */
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
   * The handler sits on the dialog element rather than on the document, so it sees a key pressed anywhere
   * inside the dialog and nothing pressed outside it, and no listener outlives the component.
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

    const controls = focusableElementsOf(dialog);
    const first = controls[0];
    const last = controls[controls.length - 1];

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
   * Records the dismissal once, through the port.
   *
   * On success the caller invalidates the read this write moved and closes the dialog; on a refusal the
   * dialog stays open, the service's sentence is rendered and the confirm becomes usable again.
   */
  const submit = async (): Promise<void> => {
    if (confirmBlocker !== null) {
      return;
    }

    setFailure(null);
    setSubmitting(true);

    try {
      await service.dismissException(row.id, trimmedReason);
      setSubmitting(false);
      onDismissed();
      onClose();
    } catch (thrown) {
      setSubmitting(false);
      setFailure(failureMessageOf(thrown));
    }
  };

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
          <DialogHeading id={headingId} className={DIALOG_HEADING_CLASSES}>
            {EXCEPTION_QUEUE_TEXT.dismissHeading}
          </DialogHeading>
          <p className={DIALOG_RECORD_CLASSES}>
            <MonoValue value={row.id} kind="id" /> {row.title}
          </p>
          <p id={summaryId} className={DIALOG_SUMMARY_CLASSES}>
            {EXCEPTION_QUEUE_TEXT.dismissSummary}
          </p>

          <div className={FIELD_CLASSES}>
            <label htmlFor={reasonId} className={LABEL_CLASSES}>
              {EXCEPTION_QUEUE_TEXT.reasonLabel}
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
            <p id={reasonMessageId} className={HINT_CLASSES}>
              {reasonBlocker ?? EXCEPTION_QUEUE_TEXT.reasonHint}
            </p>
          </div>

          {failure === null ? null : (
            <p role="status" className={MESSAGE_PROBLEM_CLASSES}>
              {failure}
            </p>
          )}

          <div className={ACTIONS_CLASSES}>
            {submitting ? (
              <ActionButton
                variant="secondary"
                onClick={onClose}
                disabled
                disabledReason={EXCEPTION_QUEUE_TEXT.dismissInFlightReason}
              >
                {EXCEPTION_QUEUE_TEXT.cancel}
              </ActionButton>
            ) : (
              <ActionButton variant="secondary" onClick={onClose}>
                {EXCEPTION_QUEUE_TEXT.cancel}
              </ActionButton>
            )}

            {confirmBlocker === null ? (
              <ActionButton
                variant="primary"
                onClick={() => {
                  void submit();
                }}
              >
                {EXCEPTION_QUEUE_TEXT.confirmDismiss}
              </ActionButton>
            ) : (
              <ActionButton
                variant="primary"
                onClick={() => {
                  void submit();
                }}
                disabled
                disabledReason={confirmBlocker}
              >
                {EXCEPTION_QUEUE_TEXT.confirmDismiss}
              </ActionButton>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The columns — AAP 0.12.4 SCR-02's twelve, in its order, plus the actions cell
 * ------------------------------------------------------------------------------------------- */

/**
 * A control's label and the record it acts on, composed into one accessible name.
 *
 * The visible word is painted exactly as the screen shows it, and the name is carried whole by one
 * hidden text node — the label, then a colon, a single space, then the record — so the separator
 * sits where the punctuation belongs, the name still begins with the visible word (WCAG 2.2 SC
 * 2.5.3, label in name), and it still tells one row's control from another's (SC 2.4.4).
 *
 * Appending the record to the visible word as a hidden suffix cannot produce that name: `sr-only`
 * positions the suffix absolutely, which blockifies it, and the accessible-name computation then
 * puts a space on both sides of the boundary, so the separator is detached from the word before it.
 * That is the defect this shape exists to keep out.
 *
 * The visible word is `aria-hidden` because the hidden span already carries it, so the name is
 * neither doubled nor lost.
 */
function recordScopedLabel(label: string, record: string): ReactNode {
  return (
    <>
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{`${label}: ${record}`}</span>
    </>
  );
}

/** Props of {@link RowAction}: one control of a row's actions cell. */
interface RowActionProps {
  /**
   * The control's label, composed by {@link recordScopedLabel}: the visible word the screen shows,
   * and the row's identifier in the one text node that carries the accessible name — so a table of
   * identical "Open" controls is not a table of identical names, while every name still begins with
   * the word the reader sees (WCAG 2.2 SC 2.5.3).
   */
  readonly label: ReactNode;

  /** What activating the control does. */
  readonly onActivate: () => void;

  /** Why the control cannot act, or `null` when it can (rule P-8). */
  readonly blocker: string | null;
}

/**
 * One row control: enabled, or disabled with the sentence that says why.
 *
 * The two branches are written out because `ActionButtonProps` is a discriminated union — a `disabled`
 * flag held in a boolean cannot carry its required reason — so the reason cannot go missing (rule P-8).
 */
function RowAction({ label, onActivate, blocker }: RowActionProps): ReactElement {
  if (blocker === null) {
    return (
      <ActionButton variant="secondary" onClick={onActivate} className={ROW_ACTION_CLASSES}>
        {label}
      </ActionButton>
    );
  }

  return (
    <ActionButton
      variant="secondary"
      onClick={onActivate}
      disabled
      disabledReason={blocker}
      className={ROW_ACTION_CLASSES}
    >
      {label}
    </ActionButton>
  );
}

/** The handlers and per-row blockers the actions column needs. */
interface RowActionHandlers {
  /** Called when the reader opens one exception's investigation. */
  readonly onOpen: (row: ExceptionRow) => void;

  /** Called when the reader assigns one exception to the acting persona. */
  readonly onAssign: (row: ExceptionRow) => void;

  /** Called when the reader asks to dismiss one exception. */
  readonly onDismiss: (row: ExceptionRow) => void;

  /** Why "assign to me" cannot act on this row, or `null` when it can. */
  readonly assignBlocker: (row: ExceptionRow) => string | null;

  /** Why "dismiss" cannot act on this row, or `null` when it can. */
  readonly dismissBlocker: (row: ExceptionRow) => string | null;
}

/**
 * The queue's columns: AAP 0.12.4's twelve members in its own order, then the actions cell.
 *
 * Every cell renders the member it is named for and nothing else, so the table shows the record the
 * service returned rather than a re-projection of it. The sortable columns' ids are the row's own member
 * names, which is what makes the `sort=field:dir` parameter the screen sends name a member the port's list
 * read orders by; the products, freshness and actions columns are not sortable and carry no id the port
 * would accept. Money, identifiers and timestamps go through `MonoValue` — the one presentation formatter
 * (AAP 0.8) — and a count is printed exactly as the record holds it, with no arithmetic (rule P-6). The
 * age column is the one exception: `ExceptionRow.ageHours` "is a duration the component formats", and
 * `src/domain/aggregation/exceptions.ts` hands the exact difference in hours over unrounded because
 * AAP §0.8 fixes the rounding of money and counts and no input fixes one for a duration. The formatting
 * therefore belongs where the value is read, so the cell presents the nearest whole hour through
 * `formatHours` from `src/components/mono-value.tsx`: a raw difference such as `145.08333333333334` is
 * not a reading a planner can scan, no record is changed by presenting it, and the canvas's urgency
 * card presents the same member through the same function.
 *
 * Every figure in the row is wrapped in an `EvidenceRef` carrying the row's own identifier, so activating
 * revenue at risk, days to impact or age opens that exception's evidence drawer — the value, the formula,
 * the source, the record and the freshness behind it (AAP 0.12.4, functional requirement F12, principle
 * PR-6). The wrapper is the way to the evidence and not a second formatter: each reading stays the count
 * the record holds, or the whole-hour label `formatHours` presents for the duration.
 *
 * The actions cell is the thirteenth column and is captioned "Actions": AAP 0.12.4 fixes the three row
 * actions, and rule P-8 requires each unavailable one to state its own reason, which a row has no other
 * surface for. The twelve specified columns keep their order and their content ahead of it.
 */
function columnsFor(handlers: RowActionHandlers): readonly TableColumn<ExceptionRow>[] {
  return [
    {
      id: 'id',
      header: EXCEPTION_QUEUE_TEXT.columnID,
      sortable: true,
      render: (row) => <MonoValue value={row.id} kind="id" />,
    },
    {
      id: 'type',
      header: EXCEPTION_QUEUE_TEXT.columnType,
      sortable: true,
      render: (row) => sentenceOf(row.type),
    },
    {
      id: 'title',
      header: EXCEPTION_QUEUE_TEXT.columnTitle,
      sortable: true,
      render: (row) => row.title,
    },
    {
      id: 'products',
      header: EXCEPTION_QUEUE_TEXT.columnProducts,
      render: (row) =>
        row.productIds.length === 0
          ? ''
          : row.productIds.map((productId, index) => (
              <span key={productId}>
                {index === 0 ? null : ', '}
                <MonoValue value={productId} kind="id" />
              </span>
            )),
    },
    {
      id: 'plantId',
      header: EXCEPTION_QUEUE_TEXT.columnPlant,
      sortable: true,
      render: (row) => <MonoValue value={row.plantId} kind="id" />,
    },
    {
      id: 'severity',
      header: EXCEPTION_QUEUE_TEXT.columnSeverity,
      sortable: true,
      render: (row) => (
        <StatusIndicator
          meaning={SEVERITY_MEANINGS[row.severity]}
          label={sentenceOf(row.severity)}
        />
      ),
    },
    {
      id: 'revenueAtRiskEur',
      header: EXCEPTION_QUEUE_TEXT.columnRevenue,
      sortable: true,
      align: 'end',
      render: (row) => (
        <EvidenceRef ref={row.id}>
          <MonoValue value={row.revenueAtRiskEur} kind="money" />
        </EvidenceRef>
      ),
    },
    {
      id: 'daysToImpact',
      header: EXCEPTION_QUEUE_TEXT.columnDaysToImpact,
      sortable: true,
      align: 'end',
      render: (row) => (
        <EvidenceRef ref={row.id}>
          {row.daysToImpact}
        </EvidenceRef>
      ),
    },
    {
      id: 'status',
      header: EXCEPTION_QUEUE_TEXT.columnStatus,
      sortable: true,
      render: (row) => (
        <StatusIndicator meaning={STATUS_MEANINGS[row.status]} label={sentenceOf(row.status)} />
      ),
    },
    {
      id: 'ownerId',
      header: EXCEPTION_QUEUE_TEXT.columnOwner,
      sortable: true,
      render: (row) => <MonoValue value={row.ownerId} kind="id" />,
    },
    {
      id: 'ageHours',
      header: EXCEPTION_QUEUE_TEXT.columnAge,
      sortable: true,
      align: 'end',
      render: (row) => (
        <EvidenceRef ref={row.id}>
          {formatHours(row.ageHours)}
        </EvidenceRef>
      ),
    },
    {
      id: 'freshness',
      header: EXCEPTION_QUEUE_TEXT.columnFreshness,
      render: (row) => (
        <span className={FRESHNESS_CELL_CLASSES}>
          {/* The source's name is identity and the state is the status this cell reports, so the
              state is the status primitive's label: the meaning's icon and status colour attach to
              the word that states a status rather than to the source's name (rule B-3). */}
          <span className={CELL_DETAIL_CLASSES}>{SOURCE_LABELS[row.freshness.source]}</span>
          <StatusIndicator
            meaning={freshnessMeaning(row.freshness.state)}
            label={sentenceOf(row.freshness.state)}
          />
          <MonoValue
            value={row.freshness.asOf}
            kind="timestamp"
            className={CELL_DETAIL_CLASSES}
          />
        </span>
      ),
    },
    {
      id: 'actions',
      header: EXCEPTION_QUEUE_TEXT.columnActions,
      render: (row) => (
        <span className={ROW_ACTIONS_CLASSES}>
          <RowAction
            label={recordScopedLabel(EXCEPTION_QUEUE_TEXT.open, row.id)}
            onActivate={() => {
              handlers.onOpen(row);
            }}
            blocker={null}
          />
          <RowAction
            label={recordScopedLabel(EXCEPTION_QUEUE_TEXT.assignToMe, row.id)}
            onActivate={() => {
              handlers.onAssign(row);
            }}
            blocker={handlers.assignBlocker(row)}
          />
          <RowAction
            label={recordScopedLabel(EXCEPTION_QUEUE_TEXT.dismiss, row.id)}
            onActivate={() => {
              handlers.onDismiss(row);
            }}
            blocker={handlers.dismissBlocker(row)}
          />
        </span>
      ),
    },
  ];
}

/* ---------------------------------------------------------------------------------------------
 * Who may work a row — contracts §7.1, rules P-3 and P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission a write to an exception requires — contracts §7.1's `exception.work` cell, the one the
 * adapter evaluates as `requireWork` before it changes a record.
 *
 * Held as a typed `Permission` rather than written into a sentence, so a reworded matrix row fails to
 * compile here instead of reaching a reader as text that names a permission the service no longer
 * enforces (rule P-6).
 */
const WORK_PERMISSION: Permission = 'exception.work';

/**
 * Whether the acting persona may work a record that lands on one plant.
 *
 * This is the matrix's own answer for every persona the demonstration seeds. A persona's `permissions`
 * are the row contracts §7.1 grants its role, and its `plantIds` are that role's scope as
 * `plantScopeFor` states it, so holding the permission *and* reaching the plant is exactly
 * `hasPermission(role, 'exception.work', record, actor)`: the scope test the matrix applies to the role
 * is the same set the persona carries, and the persona's own set narrows it no further. Both facts
 * arrive from the adapter through `useActiveUser()`, the only route a feature has to them (rule P-2),
 * and the adapter keeps enforcing the permission on the call itself, so a disabled control is an
 * explanation and never the defence (rule P-3).
 *
 * @param actingUser - The persona the adapter is enforcing.
 * @param plantId - The plant the record lands on.
 * @returns Whether this persona may change records at that plant.
 */
function mayWork(actingUser: ActiveUser, plantId: PlantId): boolean {
  return actingUser.permissions.includes(WORK_PERMISSION) && actingUser.plantIds.includes(plantId);
}

/**
 * The sentence a row's write controls are disabled with when the acting persona may not work the row.
 *
 * It states the three facts the adapter's own refusal states — the role it enforces, the permission that
 * role lacks and the plant the row lands on — and then, once the roster has answered, the roles that
 * hold the permission in the roster's own order, which is what rule P-8 owes a reader who has not
 * activated the control yet. A roster nobody has reported, or one that reports no holder at all, leaves
 * that closing clause out rather than claiming no role may act.
 *
 * @param actingUser - The persona the adapter is enforcing.
 * @param plantId - The plant the row lands on.
 * @param rolesWithWork - The roles holding `exception.work`, or `null` while that is unknown.
 * @returns The sentence explaining the disabled state.
 */
function noWorkReason(
  actingUser: ActiveUser,
  plantId: PlantId,
  rolesWithWork: readonly Role[] | null,
): string {
  const opening =
    `${EXCEPTION_QUEUE_TEXT.noWorkActor} (${actingUser.role}) ${EXCEPTION_QUEUE_TEXT.noWorkLacks} ` +
    `${WORK_PERMISSION} ${EXCEPTION_QUEUE_TEXT.noWorkOver} ${plantId}, ` +
    EXCEPTION_QUEUE_TEXT.noWorkOutcome;

  if (rolesWithWork === null || rolesWithWork.length === 0) {
    return opening;
  }

  return `${opening} ${EXCEPTION_QUEUE_TEXT.noWorkRoles} ${rolesWithWork.join(', ')}.`;
}

/* ---------------------------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------------------------- */

/**
 * What the last write did, as the region under the filters reports it.
 *
 * `meaning` is the shared status vocabulary's, so the report is an icon, a label and a colour together
 * rather than a colour on its own (rule B-3), and `detail` is the service's own sentence or a record
 * value it returned — never a figure this screen composed (rule P-6).
 */
interface WriteReport {
  /** Which meaning the report carries: a pass for a recorded write, a failure for a refused one. */
  readonly meaning: StatusMeaning;

  /** The report's headline, from {@link EXCEPTION_QUEUE_TEXT}. */
  readonly headline: string;

  /** The sentence under the headline, or absent when the headline says everything. */
  readonly detail?: string;
}

/** Props of {@link ExceptionQueueScreen}. Every member is optional, so the route supplies what it has. */
export interface ExceptionQueueScreenProps {
  /**
   * The shell's plant and product selection, handed to the read as its `scope` argument.
   *
   * The port intersects it with the acting role's plant scope before it answers (AAP 0.12.4, 0.8), so
   * this screen passes it through and never applies it. Absent, the read is made over all plants and all
   * products, which is the empty selection's meaning rather than a restriction to none.
   */
  readonly scope?: Scope;

  /**
   * Filters the shell wants pre-applied — a date chosen on the overview's series, a plant chosen from its
   * risk bars. They seed the filter state once, so a member the shell did not state stays unconstrained.
   */
  readonly initialQuery?: Partial<ExceptionQuery>;

  /**
   * Called when the reader clears the day the queue was narrowed to.
   *
   * The day arrives in `initialQuery.date`, read from the entry that carried it, so a screen that dropped
   * it on its own would leave that entry stating a narrowing nothing on the page shows any more and a
   * reload of the entry would restore it. The shell therefore drops the member from the entry when this is
   * called. Absent, clearing still reads the whole queue: the day the screen holds is what the read is
   * keyed by, and the entry is the shell's to rewrite (rule P-2).
   */
  readonly onDayCleared?: () => void;

  /**
   * The exception the shell has selected, when it selected one. Accepted for the route's sake and read
   * by nothing: `DataTable` exposes no selected-row surface to render it into.
   */
  readonly selectedExceptionId?: ExceptionId;
}

/**
 * SCR-02, the exception queue.
 *
 * One read, through `useService()` (rule P-2): the queue itself, one cache entry per filter set and
 * ordering, and the five enumerated filters' options are the distinct values of that same answer. One
 * `listExceptions` call per mount is the whole of the screen's data path, whatever the entry narrowed it
 * to, because every call computes the entire exception aggregate and the port declares no payload of
 * filter options to read instead. The read's settled facts decide the screen's state in one place
 * ({@link deriveScreenState}).
 *
 * The writes are the port's own: `assignException` sends the acting persona, which the provider reports
 * from the adapter that enforces it, and `dismissException` sends the reason the dialog collected. Each is
 * followed by an invalidation of the queue's cache entries, so the table re-reads rather than showing the
 * answer it cached before the write; a refused write changes nothing and reports the service's sentence.
 *
 * @param props - The shell's scope, the filters it wants pre-applied and its selection.
 * @returns The page header, the saved views, the six filters, the last write's report and the queue inside
 *   the state boundary, with the dismissal dialog while one is open.
 */
export function ExceptionQueueScreen(props: ExceptionQueueScreenProps): ReactElement {
  const { scope, initialQuery, onDayCleared } = props;

  const service = useService();
  const activeUser = useActiveUser();
  /*
   * The roles the permission a write needs reaches, read from the roster the service reports so a
   * disabled row action can name who may act (rule P-8). `null` while that answer is unknown: the
   * sentence then leaves the role clause out rather than claiming no role may act.
   */
  const rolesWithWork = useRolesHolding(WORK_PERMISSION);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const resolvedScope = scope ?? NO_SCOPE;
  const initialLimit = initialQuery?.limit;

  const [filters, setFilters] = useState<FilterValues>(() => filterValuesOf(initialQuery));
  const [sort, setSort] = useState<TableSort | null>(() => tableSortOf(initialQuery?.sort));
  const [day, setDay] = useState<IsoDate | null>(() => initialQuery?.date ?? null);
  const [views, setViews] = useState<readonly SavedView[]>([]);
  const [viewName, setViewName] = useState('');
  const [viewMessage, setViewMessage] = useState<string | null>(null);
  const [dismissTarget, setDismissTarget] = useState<ExceptionRow | null>(null);
  const [report, setReport] = useState<WriteReport | null>(null);
  const [pendingExceptionId, setPendingExceptionId] = useState<ExceptionId | null>(null);

  const query = buildExceptionQuery(filters, sort, initialLimit, day);

  /*
   * The queue read. Retries are off on purpose: a refusal recorded in the records' own permissions fails
   * the same way however often it is repeated, and the boundary offers the reader an explicit retry for
   * the case where repeating the call can succeed.
   */
  const listQuery = useQuery<Result<ExceptionRow[]>, unknown>({
    queryKey: ['listExceptions', query, resolvedScope.plants, resolvedScope.products],
    queryFn: () => service.listExceptions(query, resolvedScope),
    retry: false,
  });

  const result = listQuery.data;
  const rows = result === undefined ? [] : result.data;

  /*
   * The five enumerated filters' options, taken from the rows the queue itself returned rather than from a
   * second read of the same list: every `listExceptions` call computes the whole exception aggregate — a
   * solver call per case included — and the port declares no payload of options to ask for instead (see
   * the module note on the filters). Kept in a memo so a re-render of the table cannot re-derive them.
   */
  const options = useMemo(
    () => (listQuery.data === undefined ? NO_OPTIONS : filterOptionsOf(listQuery.data.data)),
    [listQuery.data],
  );

  /*
   * The read's own facts, plus this screen's reading of its answer. The queue's figures are computed
   * from the order book, so the stale notice names ERP first (AAP 0.2.1, T-13), and the last arm reads
   * the length of the service's reply rather than a filter this screen applied: the demonstration
   * control that empties the queue empties the collection the read is served from, so an empty answer is
   * how that state reaches the screen, and a filter set that matched nothing reaches it the same way —
   * the read cannot tell the two apart and neither can this screen (see the module's first OPEN ITEM).
   */
  const state = deriveScreenState({
    isPending: listQuery.isPending,
    error: listQuery.error,
    freshness: result?.meta.freshness,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    hasContent: rows.length > 0,
  });
  const staleRecord =
    result === undefined ? undefined : staleSourceOf(result.meta.freshness, APPROVAL_GATE_SOURCE);
  const forbiddenRecord = forbiddenOf(listQuery.error);

  const retryRead = (): void => {
    void listQuery.refetch();
  };

  const openException = (row: ExceptionRow): void => {
    navigate(`${EXCEPTION_QUEUE_PATH}/${row.id}`);
  };

  /**
   * Why "assign to me" cannot act on one row, or `null` when it can.
   *
   * Four facts are decided here, in the order a reader meets them: an assignment already being recorded
   * for this row, a session whose adapter reports no persona (which cannot name an assignee at all), a
   * persona that does not hold `exception.work` over the row's plant, and a row the acting persona already
   * owns — assigning it again would change nothing and append an event for a change that did not happen.
   * The permission stands ahead of the row's own state because it answers whether this persona may act on
   * the row at all, and it is the first of the two conditions the service would refuse the write for
   * (AAP 0.2.1, rule P-8).
   */
  const assignBlocker = (row: ExceptionRow): string | null => {
    if (pendingExceptionId === row.id) {
      return EXCEPTION_QUEUE_TEXT.assignInFlightReason;
    }

    if (activeUser === null) {
      return EXCEPTION_QUEUE_TEXT.assignUnavailableReason;
    }

    if (!mayWork(activeUser, row.plantId)) {
      return noWorkReason(activeUser, row.plantId, rolesWithWork);
    }

    return row.ownerId === activeUser.id ? EXCEPTION_QUEUE_TEXT.alreadyOwnerReason : null;
  };

  /**
   * Why "dismiss" cannot act on one row, or `null` when it can.
   *
   * The permission comes first: a persona that may not work the row may not set it aside either, and the
   * row's own state follows — a dismissed row cannot be dismissed again. A session that reports no persona
   * blocks nothing here, because a control disabled on a fact nobody knows yet would misstate what it can
   * do; the row action is the only way into the dismissal dialog, so the dialog cannot be reached for a row
   * this persona may not work, and the adapter refuses the write itself either way (rules P-3 and P-8).
   */
  const dismissBlocker = (row: ExceptionRow): string | null => {
    if (activeUser !== null && !mayWork(activeUser, row.plantId)) {
      return noWorkReason(activeUser, row.plantId, rolesWithWork);
    }

    return row.status === 'dismissed' ? EXCEPTION_QUEUE_TEXT.alreadyDismissedReason : null;
  };

  /**
   * Assigns one exception to the acting persona, once, through the port.
   *
   * The assignee is the persona the provider reports, which is the persona the adapter is enforcing, so
   * this screen names no user of its own (rule P-6). A recorded assignment invalidates the queue's cache
   * entries before the report says it happened, so the table behind the report shows the record as it now
   * stands; a refused one changes nothing and reports the service's own sentence.
   */
  const assignToMe = (row: ExceptionRow): void => {
    if (activeUser === null || assignBlocker(row) !== null) {
      return;
    }

    const assignee = activeUser.id;

    setReport(null);
    setPendingExceptionId(row.id);

    void (async () => {
      try {
        const assigned = await service.assignException(row.id, assignee);
        void queryClient.invalidateQueries({ queryKey: ['listExceptions'] });
        setReport({
          meaning: 'pass',
          headline: EXCEPTION_QUEUE_TEXT.assigned,
          detail: assigned.data.ownerId,
        });
      } catch (thrown) {
        setReport({
          meaning: 'fail',
          headline: EXCEPTION_QUEUE_TEXT.writeFailed,
          detail: failureMessageOf(thrown),
        });
      } finally {
        setPendingExceptionId(null);
      }
    })();
  };

  /** Opens the dismissal dialog for one row; nothing is written until its confirm is reached. */
  const openDismissal = (row: ExceptionRow): void => {
    setDismissTarget(row);
  };

  /** Closes the dismissal dialog without recording anything. */
  const closeDismissal = (): void => {
    setDismissTarget(null);
  };

  /**
   * Records what a completed dismissal means for the queue: the read it moved is invalidated and the
   * report says the dismissal happened. Called by the dialog only once the port has resolved the write.
   */
  const handleDismissed = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['listExceptions'] });
    setReport({ meaning: 'pass', headline: EXCEPTION_QUEUE_TEXT.dismissed });
  };

  /**
   * Moves the queue's ordering to the column the reader activated, or reverses the column in effect.
   *
   * The order in effect is the controlled `sort` once a reader has sorted, and the order the rows
   * arrived in — {@link QUEUE_DEFAULT_ORDER} — before that, which is the order the table announces. The
   * declared order is the state this starts from for exactly that reason: with `sort` alone, the first
   * activation of the Severity header would re-ask for the ascending order the rows are already in,
   * reorder nothing and leave the announcement unchanged, so the one header the reader was told about
   * would answer their activation with no change at all (rule P-8). Read from the announced order, the
   * first activation reverses the rows and the second restores them.
   */
  const handleSort = (columnId: string): void => {
    setSort((current) => {
      const inEffect = current ?? QUEUE_DEFAULT_ORDER;

      return inEffect.columnId === columnId
        ? { columnId, direction: inEffect.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' };
    });
  };

  /**
   * Clears the day the queue was narrowed to, which reads the whole queue again.
   *
   * The read is keyed by the query it was made with, so dropping the member from the query is the whole
   * of the read: the cache entry the narrowed answer lives under is not the one the unfiltered query
   * names, so React Query asks the port for that answer and this screen filters nothing itself (rule P-2).
   * The day is not restored by anything on this page — a saved view holds the six filters and no date —
   * and the shell is told, so the entry that carried the day stops stating a narrowing no control on the
   * page accounts for and a reload of it opens the whole queue.
   */
  const clearDay = (): void => {
    setDay(null);
    onDayCleared?.();
  };

  /** Why saving a view cannot act: the field holds no name yet (rule P-8). */
  const saveBlocker =
    viewName.trim() === '' ? EXCEPTION_QUEUE_TEXT.viewNameRequiredReason : null;

  /**
   * Saves the current filter set under the typed name.
   *
   * A name already in the list replaces the view that name stood for rather than adding a second entry with
   * the same derived identifier, so the list is one entry per name and each entry's key is stable.
   * `createSavedView` refuses a name holding nothing an identifier can be derived from, and that refusal is
   * reported under the field rather than swallowed.
   */
  const saveView = (): void => {
    if (saveBlocker !== null) {
      return;
    }

    try {
      const created = createSavedView(viewName, query);
      setViews((current) => [
        ...current.filter((view) => view.id !== created.id),
        created,
      ]);
      setViewName('');
      setViewMessage(null);
    } catch {
      setViewMessage(EXCEPTION_QUEUE_TEXT.viewNameUnusable);
    }
  };

  /** Reapplies one saved view over the queue's current query. */
  const applyView = (view: SavedView): void => {
    const applied = applySavedView(view, query);

    setFilters(filterValuesOf(applied));
    setSort(tableSortOf(applied.sort));
  };

  /** Drops one view from the session's list; nothing outside this component holds it. */
  const removeView = (view: SavedView): void => {
    setViews((current) => current.filter((candidate) => candidate.id !== view.id));
  };

  const columns = columnsFor({
    onOpen: openException,
    onAssign: assignToMe,
    onDismiss: openDismissal,
    assignBlocker,
    dismissBlocker,
  });

  /**
   * The sentence the table's one full-width cell states when the read answered with no row: the filter
   * wording for a read the reader narrowed, the trigger-neutral sentence for one nothing narrowed (see
   * the module header on the empty queue).
   */
  const emptySentence = narrowsRead(filters, day)
    ? EXCEPTION_QUEUE_TEXT.empty
    : EXCEPTION_QUEUE_TEXT.emptyUnnarrowed;

  /*
   * The queue's table, built once and rendered in two places: as the boundary's content while the read
   * holds rows, and as the caller's own rendering of the empty state when it holds none. Both renderings
   * are the same element, so the caption, the thirteen scoped headers and the one cell that carries the
   * sentence reach the reader either way and the columns do not vanish with the rows. The computed
   * column's label and the sentence that explains it stay with the content, because an empty answer has
   * no figure for a label to refer to (rule P-1).
   */
  const table = (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      caption={EXCEPTION_QUEUE_TEXT.tableCaption}
      sort={sort}
      onSort={handleSort}
      defaultOrder={QUEUE_DEFAULT_ORDER}
      onRowActivate={openException}
      emptyMessage={emptySentence}
    />
  );

  return (
    <div className={SCREEN_CLASSES}>
      <PageHeader title={EXCEPTION_QUEUE_TEXT.title} description={EXCEPTION_QUEUE_TEXT.description} />

      <Panel label={EXCEPTION_QUEUE_TEXT.savedViewsGroup}>
        <SavedViewsPanel
          views={listSavedViews(views)}
          name={viewName}
          saveBlocker={saveBlocker}
          message={viewMessage}
          onNameChange={setViewName}
          onSave={saveView}
          onApply={applyView}
          onRemove={removeView}
        />
      </Panel>

      <Panel label={EXCEPTION_QUEUE_TEXT.filterGroup}>
        {day === null ? null : <ActiveDayRow day={day} onClear={clearDay} />}
        <FilterBar values={filters} options={options} onChange={setFilters} />
      </Panel>

      {report === null ? null : (
        <div role="status" className={REPORT_CLASSES}>
          <StatusIndicator meaning={report.meaning} label={report.headline} />
          {report.detail === undefined ? null : (
            <p className={DETAIL_CLASSES}>{report.detail}</p>
          )}
        </div>
      )}

      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryRead}
        emptyContent={table}
        partialMessage={EXCEPTION_QUEUE_TEXT.partial}
        conflictMessage={EXCEPTION_QUEUE_TEXT.conflict}
        forbidden={forbiddenRecord}
      >
        <div className={TABLE_GROUP_CLASSES}>
          {/*
            The computed column's label sits here rather than in its header: `TableColumn.header` is a
            string, so a header cell cannot hold the indicator that carries the meaning's icon and colour
            as well as its label (rule B-3). The sentence beneath says what the label refers to.
          */}
          <StatusIndicator meaning="simulated" label={CALCULATED_LABEL} />
          <p className={DETAIL_CLASSES}>{EXCEPTION_QUEUE_TEXT.revenueNote}</p>
          {table}
        </div>
      </StateBoundary>

      {dismissTarget === null ? null : (
        <DismissDialog
          row={dismissTarget}
          onClose={closeDismissal}
          onDismissed={handleDismissed}
        />
      )}
    </div>
  );
}

