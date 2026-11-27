/**
 * The frame every chart, map and graph is composed inside: a titled figure whose table view cannot
 * be omitted.
 *
 * Success criterion 9 of this build and rule B-3 both require a table view of every chart, map and
 * graph, and `tableRows` is what makes that a compile-time guarantee rather than a habit: the prop
 * is required and carries the caption, the columns, the rows and the row key the table view needs,
 * so a caller cannot place a surface in this frame without also handing it the data that surface
 * draws. `src/components/chart-frame.test.tsx` and the component suites of each chart assert it.
 *
 * The charts, `./map-canvas.tsx` and `./dependency-graph.tsx` are deliberately pure SVG surfaces
 * that carry no toggle of their own; this frame is the one place the toggle lives and the one place
 * the two representations swap, which is why those modules must be composed inside it rather than
 * rendered on their own.
 *
 * The frame computes nothing and formats nothing (rule P-6): `tableRows` holds the same values the
 * chart draws, supplied by the caller from the service's response, and the frame only decides which
 * representation is on screen. Every value it paints comes from a role token of specification §4, so
 * Command and Paper each supply their own measured pairing.
 */
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import type { SimLabel } from '../types';
import { DataTable } from './data-table';
import type { TableColumn, TableSort } from './data-table';
import { StatusIndicator } from './status-indicator';
import { ViewAsTableToggle } from './view-as-table-toggle';
import type { Viewing } from './view-as-table-toggle';

/**
 * The data of a chart's table view: everything `./data-table.tsx` needs to render the marks the
 * chart draws, as rows.
 *
 * `caption` is the table's accessible name and is required for the same reason `DataTable` requires
 * it — an unnamed table fails rule B-3 — while `columns` and `getRowKey` speak the shared table
 * vocabulary rather than a parallel column type, so a chart's table and a screen's table order and
 * align their columns the same way.
 *
 * `sort` and `onSort` are the one optional pair. `DataTable`'s ordering is fully controlled by its
 * caller, and this frame is that caller, so a chart whose table view can be ordered supplies the
 * active sort and the handler here and keeps its own row order; a chart that supplies neither gets
 * no sort control at all (see {@link withoutSorting}), because a control that reports to nobody
 * would be a button that does not perform its function (rule P-8).
 */
export interface ChartTableSpec<Row> {
  /** The table's accessible name, rendered as its `<caption>`. Required: an unnamed table fails B-3. */
  readonly caption: string;
  /** The columns of the table view, in the shared vocabulary of `./data-table.tsx`. */
  readonly columns: readonly TableColumn<Row>[];
  /** The rows of the table view: the same data the chart draws, in the chart's own order. */
  readonly rows: readonly Row[];
  /** A stable key per row, so a re-render or a re-sort does not remount the rows. */
  readonly getRowKey: (row: Row) => string;
  /** The order the caller has its rows in, or `null` for the caller's own sequence. */
  readonly sort?: TableSort | null;
  /** Called with a column id when a sort control is activated; the caller then reorders `rows`. */
  readonly onSort?: (columnId: string) => void;
}

/** Props of {@link ChartFrame}. */
export interface ChartFrameProps<Row> {
  /**
   * The frame's title, rendered in the `<figcaption>`.
   *
   * It is also the accessible context of the "View as table" control, so two charts on one screen
   * are told apart by name. The chart inside must therefore not repeat it as its own label.
   */
  readonly title: string;
  /** A one-line summary of what the surface shows, rendered under the title in the secondary role. */
  readonly description?: string;
  /**
   * The simulation label the surface carries, when the whole surface is one computed series.
   *
   * It is a `SimLabel`, never free text (rule P-1), and it is optional on purpose: a chart whose
   * legend labels each series with its own provenance — the competitive atlas radar, whose competitor
   * series are market intelligence and whose client series is a self-assessment — omits it here, so
   * the frame can never paint a first-party label over a market-intelligence series (rule P-5).
   */
  readonly simLabel?: SimLabel;
  /**
   * The data of the table view. Required, and the compile-time guarantee this frame exists for: a
   * chart cannot be given a frame without the rows that let a reader take the same values as a table
   * (success criterion 9, rule B-3).
   */
  readonly tableRows: ChartTableSpec<Row>;
  /** The chart, map or graph surface itself. Unmounted, not hidden, while the table view is up. */
  readonly children: ReactNode;
}

/** The frame's layout only: it adds no surface, boundary or elevation of its own. */
const FIGURE_CLASS = 'flex min-w-0 flex-col gap-3';

/** The title row: the caption block on the start side, the label and the toggle on the end side. */
const CAPTION_CLASS = 'flex flex-wrap items-start justify-between gap-3';

const TITLE_CLASS = 'text-16 font-semibold text-text-primary';

const DESCRIPTION_CLASS = 'text-14 text-text-secondary';

/**
 * The sentence the table view shows when the caller supplied no rows.
 *
 * `DataTable` requires its caller to supply this sentence and authors none of its own. The frame is
 * the caller here, and a chart table with no rows has nothing to read out at all, so the frame states
 * exactly that rather than a domain meaning it cannot know.
 */
const EMPTY_TABLE_MESSAGE = 'No rows to show.';

/**
 * `DataTable` requires a sort handler. A chart table that offers no ordering clears every `sortable`
 * flag below, so this handler is unreachable; it exists only to satisfy that required prop.
 */
const IGNORE_SORT = (): void => {};

/**
 * Clears the `sortable` flag from every column.
 *
 * A sortable column renders a sort control, and the caller's handler is the only thing that control
 * can report to. When a caller supplies no `onSort`, the frame cannot honour an ordering request, so
 * it offers none: no control appears that would do nothing when activated (rule P-8). The caller's
 * `header`, `align` and `render` are untouched.
 */
function withoutSorting<Row>(
  columns: readonly TableColumn<Row>[],
): readonly TableColumn<Row>[] {
  return columns.map((column) =>
    column.sortable === true ? { ...column, sortable: false } : column,
  );
}

/**
 * Frames one chart, map or graph: its title, its optional description and simulation label, the
 * "View as table" control, and the body that is either the surface itself or its table view.
 *
 * The `<figure>` takes its accessible name from the `<figcaption>`, and the control's name carries
 * the title, so both the graphic and the switch between its two representations are announced
 * distinctly on a screen holding several charts. The `viewing` state is the frame's own and is never
 * synchronised from a prop or an effect: the toggle reports the representation asked for and the
 * frame renders it, which keeps the control controlled in one direction only.
 *
 * While the table view is up the surface is unmounted rather than hidden, so no focus stop survives
 * inside a chart that is no longer shown and no second, contradictory `aria-hidden` region is left
 * behind. Returning to the chart view mounts the caller's children again from the same props.
 */
export function ChartFrame<Row>({
  title,
  description,
  simLabel,
  tableRows,
  children,
}: ChartFrameProps<Row>): ReactElement {
  const [viewing, setViewing] = useState<Viewing>('chart');

  const offersSorting = tableRows.onSort !== undefined;
  const columns = offersSorting ? tableRows.columns : withoutSorting(tableRows.columns);
  const sort = offersSorting ? (tableRows.sort ?? null) : null;
  const onSort = tableRows.onSort ?? IGNORE_SORT;

  return (
    <figure className={FIGURE_CLASS}>
      <figcaption className={CAPTION_CLASS}>
        <span className="flex min-w-0 flex-col gap-1">
          <span className={TITLE_CLASS}>{title}</span>
          {description === undefined ? null : (
            <span className={DESCRIPTION_CLASS}>{description}</span>
          )}
        </span>
        <span className="flex shrink-0 flex-wrap items-center gap-3">
          {simLabel === undefined ? null : (
            <StatusIndicator meaning="simulated" label={simLabel} />
          )}
          <ViewAsTableToggle
            viewing={viewing}
            onViewingChange={setViewing}
            chartLabel={title}
          />
        </span>
      </figcaption>
      {viewing === 'chart' ? (
        children
      ) : (
        <DataTable<Row>
          columns={columns}
          rows={tableRows.rows}
          getRowKey={tableRows.getRowKey}
          caption={tableRows.caption}
          sort={sort}
          onSort={onSort}
          emptyMessage={EMPTY_TABLE_MESSAGE}
        />
      )}
    </figure>
  );
}
