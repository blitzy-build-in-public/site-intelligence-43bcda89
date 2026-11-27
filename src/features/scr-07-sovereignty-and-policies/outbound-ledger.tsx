/**
 * The outbound ledger of SCR-07: one row per endpoint the deployment declares, printing that
 * endpoint's declared purpose and state beside the last attempt on record and the two counts the
 * audit trail supports over the trailing `LEDGER_WINDOW_DAYS` days.
 *
 * Fixing inputs:
 * - AAP 0.12.4's SCR-07 row fixes the columns and their order — endpoint, purpose, state, last
 *   attempt, and the allowed and blocked counts over the window. AAP 0.13.1 and 0.15.1 list this
 *   file, and stage S1 owns it.
 * - AAP 0.12.2 and 0.8 fix where the counts come from: `src/domain/aggregation/ledger.ts` counts the
 *   audit events whose object reference is the endpoint, split by result, as integers with no
 *   rounding. This component counts nothing — it prints the two numbers that aggregate produced, so a
 *   row's figures and the audit trail behind them cannot disagree.
 * - AAP 0.10 fixes what the region states: the declared allowed list is empty, and a blocked count is
 *   a count of recorded attempts rather than a claim about them.
 *
 * WHAT IT CLAIMS, AND WHAT IT DOES NOT (rule P-4). The ledger reports declared configuration and what
 * the trail recorded. It never states that traffic is prevented, that a posture was established or
 * that a control was verified. The region carries the caller's two fixed §5.3 labels, each above the
 * columns it applies to: the declared label — `Declared, not verified` on SCR-07 — over the four
 * columns that print the record's own endpoint, purpose, state and last attempt, and the calculation
 * label over the two columns that print the counts the audit trail supports. A reader therefore sees
 * a declaration where configuration is stated and a computed figure where a count is printed, and
 * neither half is presented as the other.
 *
 * TRANSPORT, NOT COMPUTATION (rule P-6). Every cell value comes from the row it is handed. The column
 * headers and the fallback sentence are the only text this module authors, and the one argument among
 * them — the length of the window both counts cover — is read from `LEDGER_WINDOW_DAYS`, the constant
 * the ledger aggregate measures its window with, rather than typed. No endpoint, count, instant or
 * identifier is typed here, so the opaque hosts a reader sees are record content that arrived through
 * the service.
 *
 * WHY THE COUNT COLUMNS DO NOT GO THROUGH `MonoValue`. Its `MonoValueKind` is
 * `money | id | timestamp | hash`, with no integer member, and that union belongs to
 * `src/components/mono-value.tsx`; widening it from a feature file would give the codebase a second
 * formatting vocabulary beside the one AAP 0.8 makes the only presentation owner. Each count is
 * therefore plain numeric text in the mono face with tabular numerals — the presentation the token layer
 * fixes for figures that align down a column — and the union stays as it is.
 *
 * THE COUNTS OPEN THEIR EVIDENCE — AAP 0.2.1 F12, principle PR-6. `LedgerRow` carries no evidence
 * reference (contracts §3 fixes its six members), so the row's own endpoint is the reference: the
 * declared configuration holds it once per row, it is the row key, and `getEvidence` resolves it to the
 * aggregate that produced both counts. `EvidenceRef` wraps each count in the control that opens that
 * payload, so the figure a reader doubts is the figure they can open, and this component still counts
 * nothing of its own.
 *
 * WHY `StatusMeaning` COMES FROM THE COMPONENT LAYER. `src/components/status-indicator.tsx` declares and
 * exports that union, no module in `src/types` owns it, and this file takes the same route
 * `src/components/freshness-pill.tsx` takes to the same vocabulary.
 *
 * Rules this module is built to satisfy:
 * - B-1: it renders from props only. An endpoint is record text printed through `MonoValue`; it is
 *   never linkified, never used as an address and never requested, and the module names no host of its
 *   own. B-2: no credential field and no configuration read — there is nothing here to configure.
 * - B-3: the `<table>`, its caption, its `scope="col"` headers and its `J`/`K` row cursor all come from
 *   `src/components/data-table.tsx`; a state shows its icon, its label and its colour together through
 *   `StatusIndicator`, so a meaning never rests on colour alone; every value is a role token of the
 *   theme files; nothing here animates, so a reduced-motion session has nothing to switch off.
 * - P-1: the caller passes both exact §5.3 labels as required `SimLabel` props — the declared label
 *   for the four columns that state declared configuration and the calculation label for the two that
 *   print a count — and this module renders each character for character above the columns it covers,
 *   spelling neither. P-2: the rows arrive as props — no seed record, adapter, service module, app
 *   module, domain module or other feature is imported, so the component cannot become a second data
 *   boundary.
 * - P-6: no figure, instant, endpoint or identifier is typed here. P-7: no name is invented — every
 *   endpoint and purpose is record content. P-8: the ledger is read-only, so it ships no control and
 *   leaves no dead one behind.
 */
import { useId } from 'react';
import type { ReactElement } from 'react';

import { Card } from '../../components/card';
import { DataTable } from '../../components/data-table';
import type { TableColumn } from '../../components/data-table';
import { EvidenceRef } from '../../components/evidence-drawer';
import { MonoValue } from '../../components/mono-value';
import { StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { LEDGER_WINDOW_DAYS } from '../../types';
import type { LedgerRow, SimLabel } from '../../types';

/** Props of {@link OutboundLedger}. */
export interface OutboundLedgerProps {
  /**
   * The ledger as the service computed it: one row per declared endpoint, in the order the service
   * supplied them.
   *
   * Required, and rendered in that order. A row carries the declared purpose and state beside the
   * aggregate's counts and the last attempt on record, so this component neither counts nor re-orders
   * and the declared configuration and the counted columns cannot drift apart on screen.
   */
  readonly rows: readonly LedgerRow[];

  /**
   * The exact specification §5.3 label the two count columns carry, typed as `SimLabel`.
   *
   * Required and never defaulted (rule P-1): the screen decides which of the seven fixed strings
   * applies — SCR-07's two counts are the aggregate's figures rather than the record's declaration,
   * so they carry `Simulated calculation` — and this module paints whatever arrives, character for
   * character, rather than spelling or abbreviating a label of its own.
   */
  readonly simLabel: SimLabel;

  /**
   * The exact specification §5.3 label the four declared columns carry, typed as `SimLabel`.
   *
   * Required and never defaulted (rule P-1): the endpoint, purpose, state and last attempt are the
   * record's own declaration, so the screen passes the declared-configuration label — `Declared, not
   * verified` on SCR-07 — and this module paints it, character for character, above those columns.
   * It is a second label rather than a second region, because the two count columns beside them print
   * computed figures and so carry the caller's other label, `simLabel`, instead (rule P-4).
   */
  readonly declaredLabel: SimLabel;

  /**
   * The region's name, rendered as the card's heading and as the table's own caption.
   *
   * Required: it is the accessible name of the `<section>` and of the `<table>`, so a region that
   * arrived unnamed could not be announced at all (rule B-3). The wording belongs to the screen.
   */
  readonly caption: string;

  /**
   * The sentence shown in the table's one full-width cell when the service returns no endpoint.
   *
   * Optional, because `DataTable` requires a sentence rather than a blank grid and the calling screen
   * may word the empty ledger itself; {@link DEFAULT_EMPTY_MESSAGE} stands in when it does not. An
   * empty string is treated as absent, so the cell can never render blank.
   */
  readonly emptyMessage?: string;
}

/* ---------------------------------------------------------------------------------------------
 * The state column: one declared state, one shared status meaning
 * ------------------------------------------------------------------------------------------- */

/**
 * What one declared state amounts to in the shared status vocabulary of
 * `src/components/status-indicator.tsx`.
 *
 * The `switch` is exhaustive over `LedgerRow['state']` and deliberately carries no `default` branch,
 * exactly as `freshnessMeaning` does for a source's state: a third member added to that union makes
 * this function fail to type-check rather than rendering as whichever arm happened to be last, which
 * is the reminder that a new state needs a decided meaning, icon and colour before it can be shown.
 *
 * The mapping, member by member:
 * - `blocked` → `simulated`: the declared configuration refuses the endpoint, which is the state the
 *   posture declares for its allow list. A declared state was never checked, so it takes the meaning
 *   this vocabulary gives declared-but-unverified configuration — the one the SD rows' status cell and
 *   the policy set's un-evaluated row carry — and never `pass`, which would read as a verification
 *   the demonstration cannot support (rule P-4).
 * - `allowed` → `warning`: traffic to the endpoint would be permitted, which is the reading a reader
 *   has to notice in a region whose declared allow list is empty. A warning rather than a failure,
 *   because an allowed endpoint is not an error: it is the exception to read.
 */
export function ledgerStateMeaning(state: LedgerRow['state']): StatusMeaning {
  switch (state) {
    case 'blocked':
      return 'simulated';
    case 'allowed':
      return 'warning';
  }
}

/* ---------------------------------------------------------------------------------------------
 * Wording and class lists, in the one place they are written
 * ------------------------------------------------------------------------------------------- */

/**
 * The sentence the table shows when the service returns no endpoint.
 *
 * It states what the region holds rather than what a deployment would do, carries no figure and
 * claims nothing about the posture (rules P-4 and P-6), and it exists so the empty cell can never be
 * blank.
 */
const DEFAULT_EMPTY_MESSAGE = 'The ledger records no outbound endpoint for this deployment.';

/**
 * The two count columns' headers, each naming the window the figure beneath it covers.
 *
 * The length comes from `LEDGER_WINDOW_DAYS`, the constant the ledger aggregate measures its window
 * with, so a column states the window the aggregate counted rather than a length this component chose
 * (rule P-6). A header reading only `Allowed` left the window to the section heading, which a reader
 * arriving at the column by keyboard or by table navigation may never pass, and it is the window that
 * makes the count mean anything.
 */
const ALLOWED_HEADER = `Allowed, ${LEDGER_WINDOW_DAYS} days`;

/** The blocked count's header, naming the same window for the same reason. */
const BLOCKED_HEADER = `Blocked, ${LEDGER_WINDOW_DAYS} days`;

/**
 * What the last-attempt cell shows for an endpoint the trail records no attempt against.
 *
 * `LedgerRow.lastAttempt` is `null` for such a row, and a dash states that absence. A substituted date
 * would be a figure no record holds (rule P-6) and a blank cell would state nothing at all.
 */
const NO_LAST_ATTEMPT_MARKER = '—';

/**
 * A row holding one of the region's two labels, set at the 13 px step of the type scale so it reads as
 * a note on the region rather than as a second heading. Each row is the element the columns it covers
 * point at through `aria-describedby`, which is why each carries an id of its own rather than sitting
 * inside `Card`'s title row.
 */
const LABEL_ROW_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2 text-13';

/**
 * An endpoint in the mono face with tabular numerals, allowed to wrap inside a narrow column instead
 * of widening the table. `MonoValue` owns the face; this is the layout addition it accepts.
 */
const ENDPOINT_CLASSES = 'break-words';

/**
 * A purpose in the body role the table cell already sets, wrapping inside its column rather than
 * widening the table.
 */
const PURPOSE_CLASSES = 'block break-words';

/**
 * One count, in the mono face with tabular numerals so the digits of the two numeric columns line up
 * down the table (AAP 0.5.3). The value is printed exactly as the aggregate returned it: no
 * thousands separator is inserted, no unit is appended and nothing is rounded here (rule P-6).
 */
const COUNT_CLASSES = 'font-mono tabular-nums';

/** The absent-attempt dash, in the secondary text role so it cannot be mistaken for a record value. */
const MARKER_CLASSES = 'text-text-secondary';

/* ---------------------------------------------------------------------------------------------
 * The cells
 * ------------------------------------------------------------------------------------------- */

/**
 * One count cell: the aggregate's own number, opening the evidence of the endpoint it counts for, and
 * tied to the region's visible calculation label.
 *
 * Both halves matter and neither replaces the other. `EvidenceRef` makes the computation behind the
 * figure reachable — the reference is the row's own endpoint, which is what `getEvidence` resolves to
 * the ledger aggregate that produced the number (AAP 0.2.1 F12, principle PR-6) — while
 * `aria-describedby` keeps the programmatic half of the association the label row makes visually, so a
 * reader who arrives at a figure without having read the row above the table still learns that the
 * number is a computed figure rather than a declared one (rule P-1). The count is printed as it
 * arrived: it is already a whole number counted by the aggregate, and nothing is formatted onto it
 * here.
 *
 * @param count - The aggregate's count for this column of this row, printed verbatim.
 * @param endpoint - The row's declared endpoint, which is the reference the drawer resolves.
 * @param simLabelId - The id of the region's visible calculation `SimLabel`, so the figure is
 *   described by it.
 * @returns The count cell, as the drawer control that opens its evidence.
 */
function countCell(count: number, endpoint: string, simLabelId: string): ReactElement {
  return (
    <EvidenceRef ref={endpoint}>
      <span className={COUNT_CLASSES} aria-describedby={simLabelId}>
        {count}
      </span>
    </EvidenceRef>
  );
}

/**
 * The instant of an endpoint's last recorded attempt, or the dash that states there is none, tied to
 * the label that says this column states declared configuration.
 *
 * `MonoValue` renders the instant, so the column carries the mono face and the tabular numerals the
 * timestamp rule applies. No instant is derived, defaulted or substituted for a row the trail records
 * no attempt against: an absent attempt is a reading of its own, and an invented date would be a
 * figure no record holds (rule P-6). `aria-describedby` names the declared label row, so the cell
 * reads as what the record declares rather than as a contact this page made (rule P-4).
 */
function lastAttemptCell(
  lastAttempt: LedgerRow['lastAttempt'],
  declaredLabelId: string,
): ReactElement {
  return (
    <span aria-describedby={declaredLabelId}>
      {lastAttempt === null ? (
        <span className={MARKER_CLASSES}>{NO_LAST_ATTEMPT_MARKER}</span>
      ) : (
        <MonoValue value={lastAttempt} kind="timestamp" />
      )}
    </span>
  );
}

/**
 * A row's declared state, shown as its meaning's icon and colour beside the state's own word, tied to
 * the label that says this column states declared configuration.
 *
 * The word is the record's own union member, rendered as it arrives, so the cell states nothing this
 * module invented: the icon and the colour come from `ledgerStateMeaning` and the label travels with
 * both, which is what keeps a state from resting on colour alone (rule B-3). `aria-describedby` names
 * the declared label row, so a reader who meets the state alone learns that it was declared rather
 * than verified (rule P-4).
 */
function stateCell(state: LedgerRow['state'], declaredLabelId: string): ReactElement {
  return (
    <span aria-describedby={declaredLabelId}>
      <StatusIndicator meaning={ledgerStateMeaning(state)} label={state} />
    </span>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The table
 * ------------------------------------------------------------------------------------------- */

/**
 * A row's key in the table: the endpoint, which the declared configuration holds once per row, so a
 * re-render keeps each row on its own DOM node instead of remounting the list.
 */
function rowKeyOf(row: LedgerRow): string {
  return row.endpoint;
}

/**
 * The sort callback `DataTable` requires and this table never reaches.
 *
 * No column below declares `sortable`, so `DataTable` renders no sort control and there is nothing
 * that could report a sort. Re-ordering the rows here would replace the declared configuration's own
 * order with one computed in a component (rule P-6), so the callback keeps the supplied order and
 * does nothing else.
 */
const KEEP_SUPPLIED_ROW_ORDER = (): void => {
  /* Unreachable: no column of this table declares `sortable`, so no control can report a sort. */
};

/**
 * Renders the outbound ledger of SCR-07.
 *
 * The component is presentational by contract: it takes the rows the service computed, prints them one
 * row per declared endpoint in the order they arrived, and reads no clock, holds no data and calls
 * nothing. A re-render of the governance screen therefore draws the same table from the same payload.
 *
 * The card's heading and the table's caption are one string — the caller's `caption` — so the region
 * and its table are named once and cannot drift apart. Each of the caller's two `SimLabel`s is
 * painted as visible text directly above the columns it covers, and every column names the label that
 * applies to it, so a declared value and a computed count each appear in this region under the label
 * that says what it is (rules P-1 and P-4).
 *
 * The columns are built per instance rather than held at module scope for one reason: every cell
 * refers to this instance's label elements by id, and those ids are per render. The list is six
 * entries, so nothing is measured or memoised for it.
 */
export function OutboundLedger({
  rows,
  simLabel,
  declaredLabel,
  caption,
  emptyMessage,
}: OutboundLedgerProps): ReactElement {
  const declaredLabelId = useId();
  const simLabelId = useId();

  const columns: readonly TableColumn<LedgerRow>[] = [
    {
      id: 'endpoint',
      header: 'Endpoint',
      render: (row) => (
        <span aria-describedby={declaredLabelId}>
          <MonoValue value={row.endpoint} kind="id" className={ENDPOINT_CLASSES} />
        </span>
      ),
    },
    {
      id: 'purpose',
      header: 'Purpose',
      render: (row) => (
        <span className={PURPOSE_CLASSES} aria-describedby={declaredLabelId}>
          {row.purpose}
        </span>
      ),
    },
    {
      id: 'state',
      header: 'State',
      render: (row) => stateCell(row.state, declaredLabelId),
    },
    {
      id: 'last-attempt',
      header: 'Last attempt',
      render: (row) => lastAttemptCell(row.lastAttempt, declaredLabelId),
    },
    {
      id: 'allowed',
      header: ALLOWED_HEADER,
      align: 'end',
      render: (row) => countCell(row.allowed, row.endpoint, simLabelId),
    },
    {
      id: 'blocked',
      header: BLOCKED_HEADER,
      align: 'end',
      render: (row) => countCell(row.blocked, row.endpoint, simLabelId),
    },
  ];

  return (
    <Card title={caption}>
      <p id={declaredLabelId} className={LABEL_ROW_CLASSES}>
        <StatusIndicator meaning="simulated" label={declaredLabel} />
      </p>
      <p id={simLabelId} className={LABEL_ROW_CLASSES}>
        <StatusIndicator meaning="simulated" label={simLabel} />
      </p>
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={rowKeyOf}
        caption={caption}
        sort={null}
        onSort={KEEP_SUPPLIED_ROW_ORDER}
        emptyMessage={
          emptyMessage === undefined || emptyMessage === ''
            ? DEFAULT_EMPTY_MESSAGE
            : emptyMessage
        }
      />
    </Card>
  );
}

