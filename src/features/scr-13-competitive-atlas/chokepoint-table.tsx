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
 * separately. Both competitor columns read that one list in the record's own order, and the buffer
 * column repeats the competitor beside each day count so no figure is left unattributed.
 *
 * THE PACK'S COMPANY NAME IS PRINTED BESIDE THE IDENTIFIER, AND IT COMES FROM THE CALLER'S OWN
 * RECORDS. A `Chokepoint` identifies a competitor and carries no company name, and a name written
 * inside this module would be one it invented (rule P-7). The calling screen holds those names —
 * they are the labels of the networks the atlas serves — so it passes the optional
 * {@link ChokepointTableProps.competitorNameOf} resolver, and this component prints whatever it
 * answers between the identifier and the tag. A resolver that answers nothing leaves the identifier
 * alone, so the line reads `CMP-0x` rather than a name no record states. The name is record content:
 * it arrives as a prop and this module keeps no copy of it (rules P-6, P-7).
 *
 * The competitor tag is imported here and never worded. Rule P-5's text pairs a competitor name with
 * one tag word, while AAP 0.10's companion-string row pairs the same tag with a different second
 * word. `src/types/primitives.ts` settles the pair by shipping `COMPETITOR_NAME_TAG` as the rule's
 * own wording, with the rule — the highest-ranked input (AAP 0.1) — named as the winner in that
 * constant's documentation. This file imports the constant and renders it verbatim, and types no tag
 * text at all, so the resolution keeps one owner and a change to it needs one edit.
 *
 * THE FIGURES OPEN THE RECORD THEY CAME FROM — AAP 0.2.1 F12, AAP 0.12.4. The overlap and the buffer
 * days are the only numbers on SCR-13 a reader may want to inspect behind the table, so each one is
 * wrapped in `src/components/evidence-drawer.tsx`'s `EvidenceRef` on the crossing's own identifier: a
 * click, or `Enter` or `Space` on the focused trigger, opens the crossing's record with its source,
 * record, freshness and formula beside the table. The reference is the row's `Chokepoint.id`, which the
 * service's `getEvidence` read resolves, so the trigger is never a control that opens nothing
 * (rule P-8). The buffer column repeats the competitor on each line it opens, so a reader still reads
 * `<competitor> <name> <days>` on one line and a screen reader still hears whose buffer a day count
 * is (rule P-5).
 *
 * Accessibility (rule B-3). The `<table>`, its caption, its `scope="col"` headers and its `J`/`K` row
 * cursor all come from `src/components/data-table.tsx`, the application's only table vocabulary, and
 * the caption is mandatory there. The two figures are the table's controls and no row is: the row
 * carries no activation of its own, so a reader is never offered a row that cannot act (rule P-8), and
 * each trigger keeps the shared control layer's 24x24 px target and 2 px focus ring. Row height comes
 * from the density token `DataTable` binds, so the density switch resizes these rows together with
 * every other table.
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
import { useMemo } from 'react';
import type { JSX } from 'react';

import { DataTable } from '../../components/data-table';
import type { TableColumn } from '../../components/data-table';
import { EvidenceRef } from '../../components/evidence-drawer';
import { MonoValue } from '../../components/mono-value';
import { StatusIndicator } from '../../components/status-indicator';
import { COMPETITOR_NAME_TAG, SIM_LABELS } from '../../types';
import type { Chokepoint, CompetitorId, Provenance, SimLabel } from '../../types';

/**
 * Resolves the name the pack holds for a competitor identifier, or `undefined` when it holds none.
 *
 * The table cannot own these names (rule P-7): they are the records the atlas serves, so the calling
 * screen builds the resolver over the payload it read and this table only asks it for a name. The
 * `undefined` answer is a reading rather than a gap, and the table prints the identifier alone when
 * it meets one.
 */
export type CompetitorNameResolver = (competitorId: CompetitorId) => string | undefined;

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

  /**
   * The resolver that answers the pack's company name for a competitor identifier.
   *
   * Optional because a table rendered without an atlas behind it has no names to print, and a
   * required resolver would force every caller to invent one (rule P-7). When it is supplied, each
   * competitor line prints the name it answers between the identifier and the tag, so a reader who
   * meets `CMP-0x` learns which company it is without opening the export; when it is absent, or when
   * it answers `undefined` for a competitor the pack records no name for, the line keeps the
   * identifier alone.
   */
  readonly competitorNameOf?: CompetitorNameResolver;
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

  /** The resolver that answers each competitor's company name, when the caller holds one. */
  readonly competitorNameOf?: CompetitorNameResolver;
}

/**
 * Props of the buffer-day cell: the pairs the competitor column reads, and the crossing whose record
 * every figure in this cell opens.
 */
interface BufferDaysCellProps extends CompetitorCellsProps {
  /** The identifier of the crossing the row is about, which is the record behind each day count. */
  readonly chokepointId: string;
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
 * The company name a competitor line prints between its identifier and what follows, or `null` when
 * no name is available for it.
 *
 * The name is the caller's record content (rule P-7): this module asks the resolver and prints the
 * answer, and it holds no name of its own. A resolver that answers nothing — or a caller that
 * supplied none — leaves the identifier alone rather than printing a placeholder, an abbreviation or
 * a name this module would have to invent, and the space after the name keeps the line reading as
 * one phrase to assistive technology.
 */
function competitorNameLine(
  competitorId: CompetitorId,
  competitorNameOf: CompetitorNameResolver | undefined,
): JSX.Element | null {
  const name = competitorNameOf?.(competitorId);

  return name === undefined ? null : (
    <>
      <span>{name}</span>{' '}
    </>
  );
}

/**
 * The competitor lines of one row: each competitor's identifier in the mono face, the company name
 * the caller resolves for it, then the competitor-name tag that rule P-5 requires on every
 * competitor element.
 *
 * The tag is the imported constant, never text typed here, so the fixed string keeps the one owner
 * the types layer gives it, and it follows the name so no competitor name appears without it. A space
 * separates the parts, so the cell's text reads as one phrase to assistive technology; the flexible
 * gap carries the visible spacing.
 */
function CompetitorCell({ buffers, competitorNameOf }: CompetitorCellsProps): JSX.Element {
  if (buffers.length === 0) {
    return <span className="text-text-secondary">{NO_COMPETITOR_MARKER}</span>;
  }

  return (
    <ul className={CELL_LIST_CLASSES}>
      {buffers.map((buffer) => (
        <li key={buffer.competitorId} className={COMPETITOR_ENTRY_CLASSES}>
          <MonoValue value={buffer.competitorId} kind="id" />{' '}
          {competitorNameLine(buffer.competitorId, competitorNameOf)}
          <span className={COMPETITOR_TAG_CLASSES}>{COMPETITOR_NAME_TAG}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The buffer-day lines of one row: each competitor's identifier, the company name the caller
 * resolves for it, and the days it holds at the crossing.
 *
 * The competitor is repeated here on purpose. A column of bare figures would leave a reader — and a
 * screen reader moving cell by cell — unable to tell whose buffer a day count is, which is the
 * blending rule P-5 forbids in its plainest form. Each day count is the trigger that opens the
 * crossing's own record behind it (AAP 0.2.1 F12), so the line reads `<competitor> <name> <days>`
 * whether it is seen or heard and the figure is never a control that opens nothing (rule P-8). The
 * number itself is printed exactly as the record states it: no rounding, no unit conversion, no total
 * and no ordering.
 */
function BufferDaysCell({
  chokepointId,
  buffers,
  competitorNameOf,
}: BufferDaysCellProps): JSX.Element {
  if (buffers.length === 0) {
    return <span className="text-text-secondary">{NO_COMPETITOR_MARKER}</span>;
  }

  return (
    <ul className={END_ALIGNED_LIST_CLASSES}>
      {buffers.map((buffer) => (
        <li key={buffer.competitorId} className={COMPETITOR_ENTRY_CLASSES}>
          <MonoValue value={buffer.competitorId} kind="id" />{' '}
          {competitorNameLine(buffer.competitorId, competitorNameOf)}
          <EvidenceRef ref={chokepointId}>{buffer.bufferDays}</EvidenceRef>
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
 * digit the way the shared table draws every numeric column, and each of their figures is the trigger
 * that opens the crossing's own record (AAP 0.2.1 F12).
 *
 * A factory rather than a constant, because the two competitor cells print the company name the
 * caller resolves, and that resolver is a prop. The column set, its order and every other cell are
 * the same for every caller (rules P-1, P-5).
 *
 * @param competitorNameOf - The resolver that answers a competitor's company name, when the caller
 *   holds one; absent leaves each competitor line with its identifier alone (rule P-7).
 * @returns The columns the table renders, in the order above.
 */
function chokepointColumnsOf(
  competitorNameOf: CompetitorNameResolver | undefined,
): readonly TableColumn<Chokepoint>[] {
  return [
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
      render: (row) => (
        <CompetitorCell
          buffers={competitorBuffersOf(row)}
          {...(competitorNameOf === undefined ? {} : { competitorNameOf })}
        />
      ),
    },
    {
      id: 'overlap',
      header: 'Overlap',
      align: 'end',
      render: (row) => <EvidenceRef ref={row.id}>{row.overlap}</EvidenceRef>,
    },
    {
      id: 'buffer-days',
      header: 'Competitor buffer days',
      align: 'end',
      render: (row) => (
        <BufferDaysCell
          chokepointId={row.id}
          buffers={competitorBuffersOf(row)}
          {...(competitorNameOf === undefined ? {} : { competitorNameOf })}
        />
      ),
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
}

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
 * one row per crossing, in the order they arrived, with each market-intelligence figure labelled,
 * each competitor element tagged and each competitor line naming the company the caller resolves for
 * it. It reads no clock, holds no state and calls nothing, so a re-render of the atlas draws the same
 * table from the same payload.
 *
 * The caption is always rendered, from the caller's wording or from {@link DEFAULT_CAPTION}, and an
 * atlas with no crossing to list shows the caller's sentence or {@link DEFAULT_EMPTY_MESSAGE} rather
 * than a blank grid.
 */
export function ChokepointTable({
  chokepoints,
  caption,
  emptyMessage,
  competitorNameOf,
}: ChokepointTableProps): JSX.Element {
  const columns = useMemo(() => chokepointColumnsOf(competitorNameOf), [competitorNameOf]);

  return (
    <DataTable
      columns={columns}
      rows={chokepoints}
      getRowKey={rowKeyOf}
      caption={caption ?? DEFAULT_CAPTION}
      sort={null}
      onSort={KEEP_SUPPLIED_ROW_ORDER}
      emptyMessage={emptyMessage ?? DEFAULT_EMPTY_MESSAGE}
    />
  );
}
