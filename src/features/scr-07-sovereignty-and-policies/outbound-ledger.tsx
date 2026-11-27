/**
 * The outbound ledger of SCR-07: one row per endpoint the deployment declares, printing that
 * endpoint's declared purpose and state beside the last attempt on record and the two counts the
 * audit trail supports over the trailing thirty days.
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
 * that a control was verified, and the region carries the caller's fixed §5.3 label — `Declared, not
 * verified` on SCR-07 — so a reader sees a declaration rather than a certification of one.
 *
 * TRANSPORT, NOT COMPUTATION (rule P-6). Every cell value comes from the row it is handed. The column
 * headers and the fallback sentence are the only text this module authors, and none of them carries a
 * figure. No endpoint, count, instant or identifier is typed here, so the opaque hosts a reader sees
 * are record content that arrived through the service.
 *
 * REPORTED DIVERGENCE — the two count columns do not go through `MonoValue`. Its `MonoValueKind` is
 * `money | id | timestamp | hash`, with no integer member, and that union belongs to
 * `src/components/mono-value.tsx`. Widening it from a feature file would give the codebase a second
 * formatting vocabulary beside the one AAP 0.8 makes the only presentation owner, so each count is
 * printed as plain numeric text in the mono face with tabular numerals — the presentation the token
 * layer fixes for figures that align down a column — and the union stays as it is.
 *
 * REPORTED GAP — `LedgerRow` carries no evidence reference (contracts §3 fixes its six members), so a
 * count here cannot open the evidence drawer the way a tile's figure does. The row's shape is not
 * widened from a screen component; the counts are associated with the region's visible label instead.
 * Should the contracts ever give the row a reference, that cell becomes an `EvidenceRef` and nothing
 * else in this file changes.
 *
 * REPORTED DIVERGENCE — `StatusMeaning` is imported from `src/components/status-indicator.tsx`, the
 * module that declares and exports it. No module in `src/types` owns that union, so this file takes the
 * same route `src/components/freshness-pill.tsx` takes to the same vocabulary.
 *
 * Rules this module is built to satisfy:
 * - B-1: it renders from props only. An endpoint is record text printed through `MonoValue`; it is
 *   never linkified, never used as an address and never requested, and the module names no host of its
 *   own. B-2: no credential field and no configuration read — there is nothing here to configure.
 * - B-3: the `<table>`, its caption, its `scope="col"` headers and its `J`/`K` row cursor all come from
 *   `src/components/data-table.tsx`; a state shows its icon, its label and its colour together through
 *   `StatusIndicator`, so a meaning never rests on colour alone; every value is a role token of the
 *   theme files; nothing here animates, so a reduced-motion session has nothing to switch off.
 * - P-1: the caller passes the exact §5.3 label as a required `SimLabel` and this module renders it
 *   character for character, once for the region, beside the counts it covers. P-2: the rows arrive as
 *   props — no seed record, adapter, service module, app module, domain module or other feature is
 *   imported, so the component cannot become a second data boundary.
 * - P-6: no figure, instant, endpoint or identifier is typed here. P-7: no name is invented — every
 *   endpoint and purpose is record content. P-8: the ledger is read-only, so it ships no control and
 *   leaves no dead one behind.
 */
import { useId } from 'react';
import type { ReactElement } from 'react';

import { Card } from '../../components/card';
import { DataTable } from '../../components/data-table';
import type { TableColumn } from '../../components/data-table';
import { MonoValue } from '../../components/mono-value';
import { StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
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
   * The exact specification §5.3 label the counts carry, typed as `SimLabel`.
   *
   * Required and never defaulted (rule P-1): the screen decides which of the seven fixed strings
   * applies — SCR-07 declares this region `Declared, not verified` — and this module paints whatever
   * arrives, character for character, rather than spelling or abbreviating a label of its own.
   */
  readonly simLabel: SimLabel;

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
 * - `blocked` → `pass`: the declared configuration refuses the endpoint, which is the state the
 *   posture declares for its allow list. `pass` is this vocabulary's reading of an expected state, not
 *   a verification of it — the region carries the caller's `Declared, not verified` label beside these
 *   cells, so no reader is left with the impression that the block was tested (rule P-4).
 * - `allowed` → `warning`: traffic to the endpoint would be permitted, which is the reading a reader
 *   has to notice in a region whose declared allow list is empty. A warning rather than a failure,
 *   because an allowed endpoint is not an error: it is the exception to read.
 */
export function ledgerStateMeaning(state: LedgerRow['state']): StatusMeaning {
  switch (state) {
    case 'blocked':
      return 'pass';
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
 * What the last-attempt cell shows for an endpoint the trail records no attempt against.
 *
 * `LedgerRow.lastAttempt` is `null` for such a row, and a dash states that absence. A substituted date
 * would be a figure no record holds (rule P-6) and a blank cell would state nothing at all.
 */
const NO_LAST_ATTEMPT_MARKER = '—';

/**
 * The row holding the region's label, set at the 13 px step of the type scale so it reads as a note on
 * the region rather than as a second heading. It is the element each count points at through
 * `aria-describedby`, which is why it carries an id rather than sitting inside `Card`'s title row.
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
 * One count cell: the aggregate's own number, tied to the region's visible label.
 *
 * `aria-describedby` is the programmatic half of the association the label row makes visually, so a
 * reader who arrives at a figure without having read the row above the table still learns that the
 * number is declared rather than verified (rule P-1). The count is printed as it arrived: it is
 * already a whole number counted by the aggregate, and nothing is formatted onto it here.
 */
function countCell(count: number, simLabelId: string): ReactElement {
  return (
    <span className={COUNT_CLASSES} aria-describedby={simLabelId}>
      {count}
    </span>
  );
}

/**
 * The instant of an endpoint's last recorded attempt, or the dash that states there is none.
 *
 * `MonoValue` renders the instant, so the column carries the mono face and the tabular numerals the
 * timestamp rule applies. No instant is derived, defaulted or substituted for a row the trail records
 * no attempt against: an absent attempt is a reading of its own, and an invented date would be a
 * figure no record holds (rule P-6).
 */
function lastAttemptCell(lastAttempt: LedgerRow['lastAttempt']): ReactElement {
  if (lastAttempt === null) {
    return <span className={MARKER_CLASSES}>{NO_LAST_ATTEMPT_MARKER}</span>;
  }

  return <MonoValue value={lastAttempt} kind="timestamp" />;
}

/**
 * A row's declared state, shown as its meaning's icon and colour beside the state's own word.
 *
 * The word is the record's own union member, rendered as it arrives, so the cell states nothing this
 * module invented: the icon and the colour come from `ledgerStateMeaning` and the label travels with
 * both, which is what keeps a state from resting on colour alone (rule B-3).
 */
function stateCell(state: LedgerRow['state']): ReactElement {
  return <StatusIndicator meaning={ledgerStateMeaning(state)} label={state} />;
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
 * and its table are named once and cannot drift apart. The caller's `SimLabel` is painted as visible
 * text directly above the columns it covers, and the two numeric columns point at it, so a computed
 * count never appears in this region without the label that says what it is (rule P-1).
 *
 * The columns are built per instance rather than held at module scope for one reason: each count cell
 * refers to this instance's label element by id, and that id is per render. The list is six entries, so
 * nothing is measured or memoised for it.
 */
export function OutboundLedger({
  rows,
  simLabel,
  caption,
  emptyMessage,
}: OutboundLedgerProps): ReactElement {
  const simLabelId = useId();

  const columns: readonly TableColumn<LedgerRow>[] = [
    {
      id: 'endpoint',
      header: 'Endpoint',
      render: (row) => (
        <MonoValue value={row.endpoint} kind="id" className={ENDPOINT_CLASSES} />
      ),
    },
    {
      id: 'purpose',
      header: 'Purpose',
      render: (row) => <span className={PURPOSE_CLASSES}>{row.purpose}</span>,
    },
    {
      id: 'state',
      header: 'State',
      render: (row) => stateCell(row.state),
    },
    {
      id: 'last-attempt',
      header: 'Last attempt',
      render: (row) => lastAttemptCell(row.lastAttempt),
    },
    {
      id: 'allowed',
      header: 'Allowed',
      align: 'end',
      render: (row) => countCell(row.allowed, simLabelId),
    },
    {
      id: 'blocked',
      header: 'Blocked',
      align: 'end',
      render: (row) => countCell(row.blocked, simLabelId),
    },
  ];

  return (
    <Card title={caption}>
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

