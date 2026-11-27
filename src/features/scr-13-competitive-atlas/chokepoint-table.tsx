/**
 * The chokepoint table of the competitive atlas: one row per crossing the simulated
 * market-intelligence pack records, printing the crossing's overlap, each competitor's buffer days
 * there and the pack's own contention note.
 *
 * Fixing inputs:
 * - AAP 0.13.1 and 0.15.1 list this file, and AAP 0.12.4's SCR-13 row fixes what it shows: a
 *   "chokepoint table with overlap, competitor buffer days and contention note".
 * - AAP 0.14.1's S3 row and F13 place it inside stage S3's competitive atlas.
 * - AAP 0.8 fixes the arithmetic boundary: the overlap and the contention are read from the
 *   market-intelligence pack alone, and no first-party value is blended into a competitor figure.
 * - AAP 0.12.2's `Atlas` row fixes the record: `Chokepoint` carries the overlap, the per-competitor
 *   buffer days, the contention note and the provenance of the row.
 *
 * The component is transport, not computation (rule P-6, AAP 0.8). Each cell prints a value the
 * service already produced: nothing here sums, averages, ranks, rounds, converts a unit or re-orders
 * a row, and the rows keep the order the service supplied. No column declares a sort control either
 * — ordering market-intelligence rows is a ranking of them, and the order belongs to the pack's own
 * handler.
 *
 * Every row is market intelligence, and the record says so (rule P-5). `Chokepoint.provenance` is
 * rendered as the exact `SimLabel` that `src/types/primitives.ts` fixes for it, through
 * `StatusIndicator`, so the label always arrives with its icon and its status colour and cannot be
 * dropped from a cell; `COMPETITOR_NAME_TAG` from that same module follows every competitor
 * identifier, so no competitor element appears untagged. The record this table prints carries no
 * first-party member, and nothing here reads a client record, so the two families cannot meet in a
 * row or in a total.
 *
 * The competitors a row's buffers belong to are resolved from the record itself — the keys of
 * `Chokepoint.competitorBufferDays` — and never by joining the crossing against competitors passed
 * separately. `Chokepoint` carries no competitor label, so the identifier the record supplies is
 * what the competitor column prints, tagged: a display name could only be joined from
 * `Atlas.competitors`, which this component does not receive, and inventing one here is what rule
 * P-7 forbids. Both competitor columns read that one list in the record's own order, and the buffer
 * column repeats the identifier beside each day count, so no figure is left unattributed.
 *
 * RULE DIVERGENCE, reported and not resolved in this file. Rule P-5's text pairs a competitor name
 * with one tag word, while AAP 0.10's companion-string row pairs the same tag with a different
 * second word. `src/types/primitives.ts` settles the pair by shipping `COMPETITOR_NAME_TAG` as the
 * rule's own wording, with the rule — the highest-ranked input (AAP 0.1) — named as the winner in
 * that constant's documentation. This file imports the constant and renders it verbatim, and types
 * no tag text at all, so the resolution keeps one owner and a change to it needs one edit.
 *
 * Accessibility (rule B-3). The `<table>`, its caption, its `scope="col"` headers and its `J`/`K` row
 * cursor all come from `src/components/data-table.tsx`, the application's only table vocabulary, and
 * the caption is mandatory there. No row opens a record, so no row activation is supplied and no row
 * is a control that cannot act (rule P-8). Row height comes from the density token `DataTable`
 * binds, so the density switch resizes these rows together with every other table.
 *
 * Rules this module is built to satisfy:
 * - B-1: it renders from props only, names no address and sends no request. B-2: no credential field
 *   and no environment read. B-3: the semantic table above, role-token colours only, keyboard
 *   reachable.
 * - P-1: every label it shows is a member of the fixed `SIM_LABELS` vocabulary. P-2: the rows arrive
 *   as props, and no service, seed record, app module, domain module or other feature is imported.
 * - P-3, P-4: nothing here speaks of authorisation, sovereignty, copying or resistance to either.
 * - P-5: the tag on every competitor element and the label on every row. P-6: no figure, currency
 *   literal or record-identifier literal is typed here. P-7: no name is invented. P-8: no dead
 *   control.
 */
import type { JSX } from 'react';

import { DataTable } from '../../components/data-table';
import type { TableColumn } from '../../components/data-table';
import { MonoValue } from '../../components/mono-value';
import { StatusIndicator } from '../../components/status-indicator';
import { COMPETITOR_NAME_TAG, SIM_LABELS } from '../../types';
import type { Chokepoint, CompetitorId, Provenance, SimLabel } from '../../types';

/** Props of {@link ChokepointTable}. */
export interface ChokepointTableProps {
  /**
   * The crossings the atlas serves, in the order the service supplied them.
   *
   * The table prints them in that order and changes neither the list nor a row's position in it, so
   * the pack's own ordering reaches the reader unchanged (AAP 0.8).
   */
  readonly chokepoints: readonly Chokepoint[];

  /**
   * The table's accessible name, rendered as its `<caption>`.
   *
   * Optional and defaulted here, because `DataTable` requires a caption and this table is reached
   * from a screen that may name the table in its own page header. The calling screen overrides the
   * wording when it has its own; the default exists so the caption can never be missing (rule B-3).
   */
  readonly caption?: string;

  /**
   * The sentence shown in the table's one full-width cell when the pack records no crossing.
   *
   * Optional for the same reason as {@link ChokepointTableProps.caption}: `DataTable` requires a
   * sentence rather than a blank grid, and the calling screen may supply its own wording for an
   * atlas whose product-class filter leaves no crossing to list.
   */
  readonly emptyMessage?: string;
}

/**
 * The caption this table carries when the calling screen supplies none. It states what the table is,
 * which is what a `<caption>` is for (rule B-3), and it names the pack the rows come from rather
 * than presenting them as the client's own records (rule P-1).
 */
const DEFAULT_CAPTION = 'Shared chokepoints in the simulated market-intelligence pack';

/** The sentence this table shows when the pack holds no crossing to list. */
const DEFAULT_EMPTY_MESSAGE =
  'No shared chokepoint is recorded in this market-intelligence pack.';

/**
 * What a competitor column shows for a crossing that no competitor routes through.
 *
 * `Chokepoint.competitorBufferDays` holds one entry per competitor that uses the crossing, so an
 * empty map is a reading rather than a gap: the crossing exists in the pack alone. A dash states
 * that reading, because a blank cell says nothing and a zero would claim a buffer the record does
 * not hold.
 */
const NO_COMPETITOR_MARKER = '—';

/**
 * The label each provenance value carries on screen (rule P-1), taken by position from the seven
 * `SIM_LABELS` of `src/types/primitives.ts` because that tuple lists them in specification §5.3
 * order: the market-intelligence member for a competitor record, the calculation member for a
 * computed figure, and the badge member for a first-party record.
 *
 * `satisfies` makes the map exhaustive over `Provenance`, so a fourth provenance cannot be added
 * without deciding the label it shows, and a row can never render unlabelled whatever the record
 * says. Every record in this demonstration is synthetic, so no value here claims a production
 * reading; the atlas itself serves market-intelligence rows only (`src/types/atlas.ts`).
 */
const PROVENANCE_LABELS = {
  market_intelligence: SIM_LABELS[5],
  computed: SIM_LABELS[1],
  first_party: SIM_LABELS[0],
} as const satisfies Record<Provenance, SimLabel>;

/**
 * One line per competitor, so a crossing that two networks use prints two attributable lines rather
 * than one run-on cell.
 */
const CELL_LIST_CLASSES = 'flex flex-col gap-1';

/** The same list inside the end-aligned figure column, where its lines hug the cell's end edge. */
const END_ALIGNED_LIST_CLASSES = 'flex flex-col items-end gap-1';

/**
 * A competitor's line: the identifier, then its tag. The row wraps instead of overflowing when a
 * narrow column cannot hold both.
 */
const COMPETITOR_ENTRY_CLASSES = 'flex flex-wrap items-center gap-1';

/**
 * The competitor-name tag: the caption text role at the 12 px step of the type scale, inside the
 * control radius with the hairline boundary, so it reads as a tag rather than as a continuation of
 * the identifier beside it. Role tokens only — no raw palette value, no shadow and no opacity, so
 * the contrast is the ratio the theme measures for that role in either theme.
 */
const COMPETITOR_TAG_CLASSES =
  'rounded-control border border-hairline px-1 text-12 text-text-caption';

/**
 * The contention note: body text in the primary role the table cell already sets, wrapping inside
 * the column instead of widening the table.
 */
const NOTE_CLASSES = 'block break-words';

/** One competitor's buffer at a crossing: both halves of the pair the record's own map holds. */
interface CompetitorBuffer {
  /** The competitor that routes through the crossing, identified as the record identifies it. */
  readonly competitorId: CompetitorId;

  /** The days of buffer that competitor holds at the crossing, as the record states them. */
  readonly bufferDays: number;
}

/** Props of the two competitor cells, which read the same list of pairs. */
interface CompetitorCellsProps {
  /** The competitors using the crossing, in the record's own order. */
  readonly buffers: readonly CompetitorBuffer[];
}

/**
 * Reads a crossing's per-competitor buffer map into one line per competitor, in the record's own
 * order.
 *
 * `Object.entries` preserves the order the map was written in, and that order is the only ordering
 * this component has: both competitor columns read this one list, so a competitor's identifier and
 * its day count stay on the same line of the same row. Nothing is filtered, totalled or sorted, and
 * no competitor absent from the map is given a line — an absent competitor does not use the
 * crossing, and a zero would read as a buffer it holds.
 */
function competitorBuffersOf(chokepoint: Chokepoint): readonly CompetitorBuffer[] {
  return Object.entries(chokepoint.competitorBufferDays).map(
    ([competitorId, bufferDays]) => ({ competitorId, bufferDays }),
  );
}

/**
 * The competitor lines of one row: each competitor's identifier in the mono face, followed by the
 * competitor-name tag that rule P-5 requires on every competitor element.
 *
 * The tag is the imported constant, never text typed here, so the fixed string keeps the one owner
 * the types layer gives it. A space separates the identifier from the tag, so the cell's text reads
 * as one phrase to assistive technology; the flexible gap carries the visible spacing.
 */
function CompetitorCell({ buffers }: CompetitorCellsProps): JSX.Element {
  if (buffers.length === 0) {
    return <span className="text-text-secondary">{NO_COMPETITOR_MARKER}</span>;
  }

  return (
    <ul className={CELL_LIST_CLASSES}>
      {buffers.map((buffer) => (
        <li key={buffer.competitorId} className={COMPETITOR_ENTRY_CLASSES}>
          <MonoValue value={buffer.competitorId} kind="id" />{' '}
          <span className={COMPETITOR_TAG_CLASSES}>{COMPETITOR_NAME_TAG}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The buffer-day lines of one row: each competitor's identifier followed by the days it holds at the
 * crossing.
 *
 * The identifier is repeated here on purpose. A column of bare figures would leave a reader — and a
 * screen reader moving cell by cell — unable to tell whose buffer a day count is, which is the
 * blending rule P-5 forbids in its plainest form. The number itself is printed exactly as the record
 * states it: no rounding, no unit conversion, no total and no ordering.
 */
function BufferDaysCell({ buffers }: CompetitorCellsProps): JSX.Element {
  if (buffers.length === 0) {
    return <span className="text-text-secondary">{NO_COMPETITOR_MARKER}</span>;
  }

  return (
    <ul className={END_ALIGNED_LIST_CLASSES}>
      {buffers.map((buffer) => (
        <li key={buffer.competitorId} className={COMPETITOR_ENTRY_CLASSES}>
          <MonoValue value={buffer.competitorId} kind="id" />{' '}
          <span>{buffer.bufferDays}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The seven columns of the table, in the order AAP 0.12.4's SCR-13 row lists their content: the
 * crossing's identity, its name, the competitors that use it, the overlap, the competitor buffer
 * days, the contention note and the row's provenance.
 *
 * Each `render` is a closure over one record and returns what that record holds. No column declares
 * `sortable`, because a sort control here would replace the pack's own order with one computed in a
 * component. The two numeric columns carry `align: 'end'`, so their figures line up on their last
 * digit the way the shared table draws every numeric column.
 */
const CHOKEPOINT_COLUMNS: readonly TableColumn<Chokepoint>[] = [
  {
    id: 'chokepoint',
    header: 'Chokepoint',
    render: (row) => <MonoValue value={row.id} kind="id" />,
  },
  {
    id: 'crossing',
    header: 'Crossing',
    render: (row) => row.label,
  },
  {
    id: 'competitors',
    header: 'Competitors',
    render: (row) => <CompetitorCell buffers={competitorBuffersOf(row)} />,
  },
  {
    id: 'overlap',
    header: 'Overlap',
    align: 'end',
    render: (row) => row.overlap,
  },
  {
    id: 'buffer-days',
    header: 'Competitor buffer days',
    align: 'end',
    render: (row) => <BufferDaysCell buffers={competitorBuffersOf(row)} />,
  },
  {
    id: 'contention',
    header: 'Contention note',
    render: (row) => <span className={NOTE_CLASSES}>{row.contentionNote}</span>,
  },
  {
    id: 'provenance',
    header: 'Provenance',
    render: (row) => (
      <StatusIndicator meaning="simulated" label={PROVENANCE_LABELS[row.provenance]} />
    ),
  },
];

/**
 * A row's key in the table: the crossing's identifier, which the pack holds once per crossing, so a
 * re-render keeps each row on its own DOM node instead of remounting the list.
 */
function rowKeyOf(chokepoint: Chokepoint): string {
  return chokepoint.id;
}

/**
 * The sort callback `DataTable` requires and this table never reaches.
 *
 * No column above declares `sortable`, so `DataTable` renders no sort control and there is nothing
 * to call. Re-ordering rows from here would rank market-intelligence rows against each other (rule
 * P-5) and replace the pack's own order with one computed in a component (rule P-6), so the callback
 * keeps the supplied order and does nothing else.
 */
const KEEP_SUPPLIED_ROW_ORDER = (): void => {
  /* Unreachable: no column of this table declares `sortable`, so no control can report a sort. */
};

/**
 * Renders the atlas's chokepoint table.
 *
 * The table is presentational by contract: it takes the crossings the service served and prints them
 * one row per crossing, in the order they arrived, with each market-intelligence figure labelled and
 * each competitor element tagged. It reads no clock, holds no state and calls nothing, so a
 * re-render of the atlas draws the same table from the same payload.
 *
 * The caption is always rendered, from the caller's wording or from {@link DEFAULT_CAPTION}, and an
 * atlas with no crossing to list shows the caller's sentence or {@link DEFAULT_EMPTY_MESSAGE} rather
 * than a blank grid.
 */
export function ChokepointTable({
  chokepoints,
  caption,
  emptyMessage,
}: ChokepointTableProps): JSX.Element {
  return (
    <DataTable
      columns={CHOKEPOINT_COLUMNS}
      rows={chokepoints}
      getRowKey={rowKeyOf}
      caption={caption ?? DEFAULT_CAPTION}
      sort={null}
      onSort={KEEP_SUPPLIED_ROW_ORDER}
      emptyMessage={emptyMessage ?? DEFAULT_EMPTY_MESSAGE}
    />
  );
}
