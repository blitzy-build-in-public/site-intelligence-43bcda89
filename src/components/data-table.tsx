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
  /** Called when the user opens the row: `Enter` on the row cursor, or a double click. */
  readonly onRowActivate?: (row: Row) => void;
  /** Shown in a single full-width cell when there are no rows. */
  readonly emptyMessage?: string;
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
 */
const SORT_BUTTON_CLASS =
  'inline-flex min-h-6 min-w-6 items-center gap-1 rounded-control bg-transparent p-0 font-mono text-12 font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';

/** The row cursor's focus indicator, drawn inside the row so it is never clipped by a scroll box. */
const ROW_CLASS =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';

/**
 * A row that opens something also advertises it: a pointer cursor and a hover ground, which fades in
 * over 150ms and is switched off entirely under `prefers-reduced-motion` (B-3).
 */
const ACTIVATABLE_ROW_CLASS =
  'cursor-pointer transition-colors duration-150 hover:bg-surface-2 motion-reduce:transition-none';

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
 * Whether the event happened inside a control that owns its own keys.
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

  /** A table always has at least one cell per row, even when the caller declared no columns. */
  const columnCount = Math.max(columns.length, 1);
  const lastRowIndex = rows.length - 1;

  /**
   * The cursor is clamped to the rows this render has rather than trusted as stored: a filter, a
   * write-back or a role switch can shrink the list under it, and a stale index would leave no row
   * tabbable at all.
   */
  const activeIndex =
    rows.length === 0 ? -1 : Math.min(Math.max(cursorIndex, 0), lastRowIndex);

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
    <div className="w-full overflow-x-auto">
      <table ref={tableRef} className={TABLE_CLASS} onKeyDown={handleKeyDown}>
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
          {rows.length === 0 ? (
            <tr className={ROW_HEIGHT_CLASS}>
              <td
                colSpan={columnCount}
                className={classNames(CELL_CLASS, 'text-text-secondary')}
              >
                {emptyMessage ?? ''}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={getRowKey(row)}
                tabIndex={index === activeIndex ? 0 : -1}
                className={classNames(
                  ROW_HEIGHT_CLASS,
                  ROW_CLASS,
                  onRowActivate === undefined ? undefined : ACTIVATABLE_ROW_CLASS,
                )}
                onFocus={() => {
                  setCursorIndex(index);
                }}
                onDoubleClick={
                  onRowActivate === undefined
                    ? undefined
                    : () => {
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
