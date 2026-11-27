/**
 * The one table the application renders.
 *
 * Every screen, panel and chart table view renders its rows through `DataTable`, so the `<table>`
 * structure, the caption, the scoped column headers, the sortable header controls and the keyboard
 * row cursor exist in exactly one place. A screen, a feature folder or any other component must
 * never write a `<table>` of its own (AAP §0.5.2): this component is the application's only table
 * vocabulary, and `chart-frame.tsx` renders each chart's "View as table" view with it.
 *
 * The component is presentational by contract (rule P-6). It computes nothing, formats nothing and
 * sorts nothing: `column.render` returns the cell content the caller computed from the service's
 * response, and ordering is the caller's `sort` state reported back through `onSort`. It carries no
 * simulated-data label of its own either (rule P-1) — a column whose figures came from a seed record
 * carries its own label inside the caller's `render`.
 *
 * A table with nothing to show renders the caller's `emptyMessage` in one cell spanning every
 * column, and that prop is required so the cell can never be blank. A table the caller declared no
 * columns for counts as nothing to show and takes the same cell, because a row of no cells is not a
 * row: it states nothing on screen and reaches no assistive technology.
 *
 * Row height comes from the density token (`--row-height`, bound to `--row-compact` at 32px and
 * `--row-comfortable` at 44px by `src/theme/tokens.css`) rather than from a pixel value here, so the
 * global density switch resizes every table in the application at once. This component only reads
 * that token; `src/theme/theme-provider.tsx` sets `data-density` on `<html>`.
 */
import { CaretDown } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';

/**
 * One column of a table: its identity, its visible and accessible header, and how a cell is drawn.
 *
 * `TableColumn` and `DataTableProps` are the shared table vocabulary of the application, so their
 * shape is stable — `chart-frame.tsx`, the exception queue, the approvals inbox, the audit trail,
 * the risk-by-plant rows and the chokepoint table all speak it.
 */
export interface TableColumn<Row> {
  /** Stable column id, used for sorting and as the React key of the cells it produces. */
  readonly id: string;
  /** The visible header text, which is also the accessible name of the column's sort control. */
  readonly header: string;
  /** Whether the header renders a sort control. A column that cannot be ordered omits it. */
  readonly sortable?: boolean;
  /** `end` for numeric columns, so figures line up on their last digit. Defaults to `start`. */
  readonly align?: 'start' | 'end';
  /** The cell content. Money, identifiers and timestamps arrive already wrapped by the caller. */
  readonly render: (row: Row, index: number) => ReactNode;
}

/** The column the rows are currently ordered by, and in which direction. */
export interface TableSort {
  readonly columnId: string;
  readonly direction: 'asc' | 'desc';
}

/** Everything a `DataTable` needs. The sort is fully controlled by the caller. */
export interface DataTableProps<Row> {
  readonly columns: readonly TableColumn<Row>[];
  readonly rows: readonly Row[];
  /** A stable key per row, so a re-sort or a write-back re-render does not remount the rows. */
  readonly getRowKey: (row: Row) => string;
  /** The table's accessible name, rendered as its `<caption>`. Required: an unnamed table fails B-3. */
  readonly caption: string;
  /** The active sort, or `null` when the rows are in the caller's own order. */
  readonly sort: TableSort | null;
  /** Called with a column id when the user activates that column's sort control. */
  readonly onSort: (columnId: string) => void;
  /**
   * Called when the user opens the row: `Enter` on the row cursor, or a pointer click on the row —
   * anywhere outside a control the row holds, whose own click stays with that control. One gesture
   * opens the row once: the later clicks of a multi-click sequence are ignored, because the first
   * of them has already opened it.
   */
  readonly onRowActivate?: (row: Row) => void;
  /**
   * The sentence shown in a single full-width cell when the table shows no data rows — because the
   * caller supplied none, or because it declared no columns to show them in. Required: a table that
   * renders neither rows nor a sentence leaves a blank grid where every other state is explained.
   * The caller supplies it because the sentence belongs to the screen (AAP §0.12.4), and inventing
   * a default here would be a displayed string no input fixes (AAP §0.1).
   */
  readonly emptyMessage: string;
}

/**
 * Every key event whose target sits inside one of these belongs to that control, not to the row
 * cursor: a `J` typed into a field is a character, and `Enter` on a button is that button's own
 * activation. The selector also matches a control's descendants, so a key pressed on the text inside
 * a button stays with the button.
 */
const CONTROL_TARGET_SELECTOR =
  'input, textarea, select, button, a[href], [contenteditable="true"], [role="button"], [role="link"]';

/**
 * The density token, read as a CSS value rather than a pixel height, so `data-density` drives it.
 * Written as an arbitrary utility because the height is a custom property, not a scale step.
 */
const ROW_HEIGHT_CLASS = 'h-[var(--row-height)]';

const TABLE_CLASS = 'w-full border-collapse text-13 text-text-primary';

const HEADER_CELL_CLASS =
  'border-b border-hairline px-3 py-2 font-mono text-12 font-medium text-text-caption';

const CELL_CLASS = 'border-b border-hairline px-3 align-middle';

/* Both ring-bearing controls below draw their indicator for keyboard focus only, so neither carries
   an `outline-none` reset. That reset sets `--tw-outline-style: none` on the element, and
   `focus-visible:outline-2` reads that variable back into `outline-style`, so carrying one would
   suppress the very ring B-3 requires. */

/**
 * The sort control: a real button, at least 24 by 24 px (B-3's target minimum), carrying the 2px
 * focus ring of the theme on keyboard focus only.
 *
 * The pointer states are role tokens: `hover:` fills the first surface and lifts the label to the
 * primary text role, `active:` holds the second surface under the press. The label colour the JSX
 * supplies says whether this column is the sorted one; these utilities outrank it on a hover and a
 * press because Tailwind emits a variant after the unprefixed utility it overrides. Both states are
 * carried by the same `motion-safe` colour transition the other controls use, so this control's
 * feedback is paced like theirs and a reduced-motion session gets it instantly.
 */
const SORT_BUTTON_CLASS =
  'inline-flex min-h-6 min-w-6 items-center gap-1 rounded-control bg-transparent p-0 font-mono text-12 font-medium hover:bg-surface-1 hover:text-text-primary active:bg-surface-2 active:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring motion-safe:transition-colors motion-safe:duration-150';

/**
 * The row cursor's focus indicator, drawn inside the row so it is never clipped by a scroll box.
 * It carries no outline-hiding utility for the reason given above: the ring the `J`/`K` cursor is
 * followed by would lose its outline style and never paint.
 */
const ROW_CLASS =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';

/**
 * A row that opens something also advertises it: a pointer cursor, a hover ground and a pressed
 * ground, which swap over 150ms and are switched off entirely under `prefers-reduced-motion` (B-3).
 * The pressed fill steps back to the first surface, so a press reads as one step below the hover it
 * started from rather than as nothing happening.
 *
 * The affordance is one the row honours: a pointer click on the row — outside any control the row
 * holds, whose own click stays with that control — opens it, exactly as `Enter` on the row cursor
 * does. Nothing here advertises a gesture the row ignores (rule P-8).
 */
const ACTIVATABLE_ROW_CLASS =
  'cursor-pointer transition-colors duration-150 hover:bg-surface-2 active:bg-surface-1 motion-reduce:transition-none';

/**
 * Joins the class names that apply, dropping the ones a conditional left out, so a variant reads as
 * one list at the call site instead of a template string with stray spaces.
 */
function classNames(
  ...values: readonly (string | false | null | undefined)[]
): string {
  return values
    .filter((value): value is string => typeof value === 'string' && value !== '')
    .join(' ');
}

/** The direction the given column is sorted by, or `null` when it is not the sorted column. */
function directionFor(
  sort: TableSort | null,
  columnId: string,
): 'asc' | 'desc' | null {
  if (sort === null || sort.columnId !== columnId) {
    return null;
  }
  return sort.direction;
}

/**
 * Whether the event happened inside a control that owns its own keys — and its own activation, so a
 * click on it opens what the control offers rather than the row around it.
 */
function happenedInsideControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(CONTROL_TARGET_SELECTOR) !== null
  );
}

/**
 * A table of rows with a caption, scoped headers, sortable column controls and a `J`/`K` row cursor.
 *
 * The keyboard model is the one AAP §0.12.4 fixes and `src/app/keyboard-shortcuts.ts` documents:
 * this component owns `J` (next row), `K` (previous row) and `Enter` (open the focused row); the
 * shell owns `/` and the overlays own `Esc`. Keys whose target is a control are left alone, so the
 * cursor never steals a keystroke from a button, a link or a field.
 *
 * Exactly one row is tabbable at a time — the row cursor carries `tabIndex={0}` and every other row
 * `tabIndex={-1}` — so a table of any length is a single tab stop, and `J`/`K` then move focus
 * through the rows, wrapping at both ends.
 *
 * Each data row also states its position for assistive technology — `aria-rowindex` read against the
 * table's `aria-rowcount` — so a move with `J`/`K` announces where the cursor landed and not only
 * what the row holds.
 */
export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption,
  sort,
  onSort,
  onRowActivate,
  emptyMessage,
}: DataTableProps<Row>): ReactElement {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [cursorIndex, setCursorIndex] = useState(0);

  /**
   * Whether the body shows the empty sentence instead of data rows. A caller that declares no
   * columns has nothing to show either, so it takes the same rendering: mapping its rows would emit
   * a `<tr>` with no `<td>` in it, which states nothing and is invisible to assistive technology.
   */
  const showsEmptyMessage = rows.length === 0 || columns.length === 0;
  /** The empty cell spans every column, and one when the caller declared no columns to span. */
  const columnCount = Math.max(columns.length, 1);
  /** The rows the body actually renders: the caller's rows, or the one cell that explains them. */
  const bodyRowCount = showsEmptyMessage ? 1 : rows.length;
  /**
   * What `aria-rowcount` announces: the body rows plus the header row, because ARIA numbers a
   * table's rows from 1 and this table's row 1 is the header. A data row's `aria-rowindex` is its
   * 0-based list position plus 2 for the same reason.
   */
  const rowCount = bodyRowCount + 1;
  const lastRowIndex = rows.length - 1;

  /**
   * The cursor is clamped to the rows this render has rather than trusted as stored: a filter, a
   * write-back or a role switch can shrink the list under it, and a stale index would leave no row
   * tabbable at all. It is also absent whenever the body shows the empty sentence, since that
   * rendering has no data row for the cursor to sit on.
   */
  const activeIndex = showsEmptyMessage
    ? -1
    : Math.min(Math.max(cursorIndex, 0), lastRowIndex);

  /** Moves the cursor and the DOM focus together, which is what makes `J`/`K` a roving cursor. */
  function moveCursorTo(index: number): void {
    setCursorIndex(index);
    const body = tableRef.current?.tBodies[0];
    body?.rows[index]?.focus();
  }

  const activateRow = (row: Row): void => {
    if (onRowActivate !== undefined) {
      onRowActivate(row);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableElement>): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (happenedInsideControl(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 'j' || key === 'k') {
      if (activeIndex < 0) {
        return;
      }
      event.preventDefault();
      moveCursorTo(
        key === 'j'
          ? activeIndex === lastRowIndex
            ? 0
            : activeIndex + 1
          : activeIndex === 0
            ? lastRowIndex
            : activeIndex - 1,
      );
      return;
    }

    if (key === 'enter') {
      const row = activeIndex < 0 ? undefined : rows[activeIndex];
      if (row === undefined || onRowActivate === undefined) {
        return;
      }
      event.preventDefault();
      onRowActivate(row);
    }
  };

  return (
    /*
      The scroll container is positioned so the absolutely positioned, visually hidden text a cell
      carries — the caption, an evidence trigger's suffix, a tooltip's closed description — is laid
      out against this box and clipped by its `overflow-x-auto`. Left static, those 1 by 1 px boxes
      escape every ancestor with `overflow-x: auto` and widen the document instead, which scrolls the
      whole page sideways however narrow the table's own container is.
    */
    <div className="relative w-full overflow-x-auto">
      {/*
        `aria-rowcount` counts the header row as row 1, so a reader given a data row's position also
        knows how many rows the table holds in total: the row count includes it.
      */}
      <table
        ref={tableRef}
        className={TABLE_CLASS}
        aria-rowcount={rowCount}
        onKeyDown={handleKeyDown}
      >
        {/*
          The caption is the table's accessible name and is read by assistive technology; it is
          visually hidden because every screen already names the table it shows in its own page
          header, and repeating that text inside the table would say it twice on screen.
        */}
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const direction = directionFor(sort, column.id);
              const ariaSort =
                direction === null
                  ? 'none'
                  : direction === 'asc'
                    ? 'ascending'
                    : 'descending';

              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={column.sortable === true ? ariaSort : undefined}
                  className={classNames(
                    HEADER_CELL_CLASS,
                    column.align === 'end' ? 'text-end' : 'text-start',
                  )}
                >
                  {column.sortable === true ? (
                    <button
                      type="button"
                      className={classNames(
                        SORT_BUTTON_CLASS,
                        direction === null
                          ? 'text-text-caption'
                          : 'text-text-primary',
                      )}
                      onClick={() => {
                        onSort(column.id);
                      }}
                    >
                      <span>{column.header}</span>
                      {/*
                        Hidden from assistive technology: `aria-sort` on the header cell already
                        announces the order, so the caret is decoration that must not rename the
                        button. It points down for descending and flips for ascending.
                      */}
                      <CaretDown
                        aria-hidden="true"
                        weight="bold"
                        className={classNames(
                          'shrink-0',
                          direction === 'asc' ? 'rotate-180' : undefined,
                        )}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {showsEmptyMessage ? (
            <tr className={ROW_HEIGHT_CLASS}>
              <td
                colSpan={columnCount}
                className={classNames(CELL_CLASS, 'text-text-secondary')}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              /*
                `aria-rowindex` counts the header row as row 1, so this data row — at 0-based list
                index `index` — is row `index + 2`. It is deliberately not `index + 1`: that is the
                header's position, and announcing it would say the cursor sits on a different row.
              */
              return (
                <tr
                  key={getRowKey(row)}
                  tabIndex={index === activeIndex ? 0 : -1}
                  aria-rowindex={index + 2}
                  className={classNames(
                    ROW_HEIGHT_CLASS,
                    ROW_CLASS,
                    onRowActivate === undefined ? undefined : ACTIVATABLE_ROW_CLASS,
                  )}
                  onFocus={() => {
                    setCursorIndex(index);
                  }}
                  onClick={
                    onRowActivate === undefined
                      ? undefined
                      : (event) => {
                          /*
                            The first click of a double click has already opened the row, so the
                            second is not a second activation: the row opens something, and opening
                            it twice would push a duplicate history entry, which leaves one Back
                            press with the URL where it already was and makes the row look broken.
                            `detail` counts the clicks of the sequence, so anything after the first
                            one is dropped here rather than opening the row again.
                          */
                          if (event.detail > 1) {
                            return;
                          }
                          /*
                            One click opens the row, the way `Enter` on the row cursor does. A click
                            that started inside a control the row holds — a button, a link, a field,
                            an evidence trigger — belongs to that control, so the row stays closed
                            behind it rather than opening as well.
                          */
                          if (happenedInsideControl(event.target)) {
                            return;
                          }
                          activateRow(row);
                        }
                  }
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={classNames(
                        CELL_CLASS,
                        column.align === 'end' ? 'text-end' : 'text-start',
                      )}
                    >
                      {column.render(row, index)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
