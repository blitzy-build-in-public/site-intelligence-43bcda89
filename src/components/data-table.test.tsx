/**
 * Component suite for `data-table.tsx`, the only table the application renders.
 *
 * Each case asserts a contract the component promises rather than its markup: the caption that
 * names the table (B-3), the scoped column headers, the sort control that is a real button reporting
 * `aria-sort` while the order stays the caller's own and whose caret turns only for an ascending
 * column, the order the caller's rows arrived in — announced by the column it names through
 * `aria-sort`, the caret and the label colour, and applied and reported by nothing — the `J`/`K` row
 * cursor with its wrap-around, its single tab stop, its focus-ring token and
 * the clamp that keeps it tabbable when the row list shrinks under it (AAP §0.12.4, T-16), the row
 * key that keeps each row on its own DOM node across a re-sort, `Enter` and click activation,
 * the keys the cursor must leave to the fields and controls it passes through and to a held modifier
 * or an event another handler already consumed, the alignment a column states in its header cell and
 * in its cells, row heights that resolve through `--row-height` rather than a pixel value, the same
 * table under both themes, the optional page size and the window it paints — its own controls, the
 * reason a control at either end carries, the whole-set row count a windowed table keeps announcing,
 * and the cursor confined to the rows on screen — and the empty sentence in both shapes that have
 * nothing to show — no rows, and no columns to show them in. The cells hold made-up labels because
 * the component computes nothing (P-6): what a cell shows is entirely the caller's `render`.
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { DataTable } from './data-table';
import type { DataTableProps, TableColumn, TableSort } from './data-table';

/** The row shape this suite's caller would render. Fields are readonly, as a service response is. */
interface Row {
  readonly key: string;
  readonly name: string;
}

/** The table's accessible name, asserted against the rendered caption. */
const CAPTION = 'Rows awaiting a decision';

/**
 * The sentence the caller shows when its table has no data rows. `DataTable` requires one and
 * authors none of its own, so every case in this suite supplies this suite's caller-level sentence.
 */
const EMPTY_MESSAGE = 'Nothing matches these filters';

/** Three rows, so forward, backward and wrap-around moves each land somewhere distinct. */
const ROWS = [
  { key: 'alpha', name: 'Alpha' },
  { key: 'beta', name: 'Beta' },
  { key: 'gamma', name: 'Gamma' },
] as const satisfies readonly Row[];

/** One sortable text column and one plain column, which is the shape every screen's table uses. */
const COLUMNS = [
  { id: 'name', header: 'Name', sortable: true, render: (row: Row) => row.name },
  { id: 'state', header: 'State', render: () => 'Awaiting review' },
] as const satisfies readonly TableColumn<Row>[];

/** A callable that records nothing, for the props a case does not assert on. */
const noop = (): void => {};

/**
 * A row set wide enough to window: seven rows, so a window of three has a first window, a middle one
 * and a last one that is still full. The labels are this suite's own placeholders, because the
 * component computes nothing and shows exactly what the caller rendered (rule P-6).
 */
const WINDOW_ROWS = Array.from({ length: 7 }, (_, index) => ({
  key: `window-row-${String(index)}`,
  name: `Window row ${String(index)}`,
}));

/** The page size the windowed cases hand the table: narrower than {@link WINDOW_ROWS}. */
const WINDOW_SIZE = 3;

/**
 * The two window controls, named as the table names them.
 *
 * The labels are the component's own wording, which it does not export, so they are stated here once:
 * a reworded label reaches a single place in the suite.
 */
const WINDOW_CONTROLS = { previous: 'Previous rows', next: 'Next rows' } as const;

/** The name cell's text of every painted row, which is the row the caller rendered. */
function paintedNames(): readonly string[] {
  return bodyRows().map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '');
}

/** The `aria-rowindex` every painted row announces, in document order. */
function rowIndexes(): readonly (string | null)[] {
  return bodyRows().map((row) => row.getAttribute('aria-rowindex'));
}

/** Every rendered body row, in document order. */
function bodyRows(): readonly HTMLTableRowElement[] {
  return Array.from(document.querySelectorAll('tbody tr')).filter(
    (row): row is HTMLTableRowElement => row instanceof HTMLTableRowElement,
  );
}

/** The body row at `index`, or a failure naming the index rather than a silent `undefined`. */
function rowAt(index: number): HTMLTableRowElement {
  const row = bodyRows()[index];
  if (row === undefined) {
    throw new Error(`the table rendered no body row at index ${index}`);
  }
  return row;
}

/** The cursor row: the single row that is reachable by `Tab`. */
function cursorRow(): HTMLTableRowElement {
  const tabbable = bodyRows().filter(
    (row) => row.getAttribute('tabindex') === '0',
  );
  expect(tabbable).toHaveLength(1);
  const [row] = tabbable;
  if (row === undefined) {
    throw new Error('the table rendered no row for the row cursor');
  }
  return row;
}

/**
 * The caret's class list, which is where its rotation lives.
 *
 * Read from the one sort control this suite's columns declare, so a case asserts the rotation without
 * reaching into the component's markup: the caret is decoration and `aria-sort` carries the meaning,
 * but the direction it points is still a promise the caller's order decides — the sort it passes or,
 * before anyone sorts, the order its rows arrived in.
 */
function caretClass(): string {
  const caret = screen.getByRole('button', { name: 'Name' }).querySelector('svg');
  if (caret === null) {
    throw new Error('the sort control rendered no caret');
  }
  return caret.getAttribute('class') ?? '';
}

interface TableOptions {
  readonly columns?: readonly TableColumn<Row>[];
  readonly rows?: readonly Row[];
  readonly sort?: TableSort | null;
  readonly defaultOrder?: TableSort | null;
  readonly onSort?: (columnId: string) => void;
  readonly onRowActivate?: (row: Row) => void;
  readonly emptyMessage?: string;
  readonly pageSize?: number;
}

/**
 * The table this suite's caller renders, so a case that re-renders hands the same component a new
 * prop set instead of mounting a second table beside the first.
 */
function tableElement(
  options: TableOptions = {},
): ReactElement<DataTableProps<Row>> {
  return (
    <DataTable<Row>
      columns={options.columns ?? COLUMNS}
      rows={options.rows ?? ROWS}
      getRowKey={(row) => row.key}
      caption={CAPTION}
      sort={options.sort ?? null}
      onSort={options.onSort ?? noop}
      defaultOrder={options.defaultOrder ?? null}
      onRowActivate={options.onRowActivate ?? noop}
      emptyMessage={options.emptyMessage ?? EMPTY_MESSAGE}
      /* Spread rather than passed through: absent is the unwindowed default, which a caller cannot
         reach by handing the component an explicit `undefined`. */
      {...(options.pageSize === undefined ? {} : { pageSize: options.pageSize })}
    />
  );
}

/**
 * Renders the table with this suite's defaults, overriding only what a case asserts on.
 *
 * It returns the render result so a case that asserts on a re-render can pass `rerender` the next
 * prop set for the same component; a case that renders once ignores the return value.
 */
function renderTable(options: TableOptions = {}): RenderResult {
  return render(tableElement(options));
}

/** The two themes the switch offers, named as `src/theme/theme-provider.tsx` writes them. */
const THEMES = ['command', 'paper'] as const;

/** The two row densities, which reach a table only through the `--row-height` token. */
const DENSITIES = ['compact', 'comfortable'] as const;

/**
 * Sets a root-scoped attribute for one case, which is where the theme provider puts the theme and
 * the density. `tokens.css` binds `[data-density]` to `--row-height`, so rendering "under a density"
 * means exactly this attribute and nothing the table itself has to know about.
 */
function setRootAttribute(
  name: 'data-theme' | 'data-density',
  value: (typeof THEMES)[number] | (typeof DENSITIES)[number],
): void {
  document.documentElement.setAttribute(name, value);
}

/** Leaves no attribute behind for the next case, since jsdom keeps the document root between tests. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-density');
});

describe('DataTable', () => {
  it('names the table with the supplied caption', () => {
    renderTable();

    const table = screen.getByRole('table');
    expect(table).toHaveAccessibleName(CAPTION);
    expect(table.querySelector('caption')).toHaveTextContent(CAPTION);
  });

  it('scopes every header cell to its column', () => {
    renderTable();

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(COLUMNS.length);
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }
    expect(headers.map((header) => header.textContent)).toEqual([
      'Name',
      'State',
    ]);
  });

  it('renders one body row per supplied row with one cell per column', () => {
    renderTable();

    expect(bodyRows()).toHaveLength(ROWS.length);
    for (const [index, row] of bodyRows().entries()) {
      const source = ROWS[index];
      if (source === undefined) {
        throw new Error(`the table rendered no row at index ${index}`);
      }
      const cells = within(row).getAllByRole('cell');
      expect(cells).toHaveLength(COLUMNS.length);
      const [nameCell, stateCell] = cells;
      expect(nameCell).toHaveTextContent(source.name);
      expect(stateCell).toHaveTextContent('Awaiting review');
    }
  });

  it('keeps each row on its own DOM node when the caller re-sorts it', () => {
    const { rerender } = renderTable();
    const alphaRow = rowAt(0);
    expect(alphaRow).toHaveTextContent('Alpha');

    // `getRowKey` is required precisely so a re-sort or a write-back re-render keeps each row's DOM
    // node. Keying the rows by array position instead would leave node 0 holding a different row and
    // remount it, losing the focus and the cursor state that row was carrying.
    rerender(tableElement({ rows: [ROWS[1], ROWS[0], ROWS[2]] }));

    expect(bodyRows()).toHaveLength(ROWS.length);
    expect(rowAt(0)).not.toBe(alphaRow);
    expect(rowAt(0)).toHaveTextContent('Beta');
    expect(rowAt(1)).toBe(alphaRow);
    expect(rowAt(1)).toHaveTextContent('Alpha');
  });

  it('aligns a column marked end from its header cell through every cell below it', () => {
    const columns = [
      ...COLUMNS,
      {
        id: 'ledger',
        header: 'Ledger',
        align: 'end',
        render: () => 'Held in the ledger',
      },
    ] as const satisfies readonly TableColumn<Row>[];
    renderTable({ columns });

    // `end` exists so figures line up on their last digit, so it has to reach the column's header
    // cell as well as the cells under it: a header that starts where its figures end misaligns the
    // whole column. A column that names no alignment keeps the default and stays at the start.
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(columns.length);
    const endHeader = screen.getByRole('columnheader', { name: 'Ledger' });
    expect(endHeader).toHaveClass('text-end');
    for (const header of headers) {
      if (header !== endHeader) {
        expect(header).toHaveClass('text-start');
      }
    }

    for (const row of bodyRows()) {
      const cells = within(row).getAllByRole('cell');
      expect(cells).toHaveLength(columns.length);
      const endCell = cells[cells.length - 1];
      if (endCell === undefined) {
        throw new Error('the table rendered no cell for the end-aligned column');
      }
      expect(endCell).toHaveTextContent('Held in the ledger');
      expect(endCell).toHaveClass('text-end');
    }
  });

  it('states each row position for assistive technology, counting the header row as row 1', () => {
    renderTable();

    // A move with J or K focuses a row, and these two attributes are what let a reader be told where
    // that row is: the count covers every body row plus the header, and each data row's index is
    // 1-based over the same count, so the first body row is 2 rather than 1.
    expect(screen.getByRole('table')).toHaveAttribute(
      'aria-rowcount',
      String(ROWS.length + 1),
    );
    expect(bodyRows().map((row) => row.getAttribute('aria-rowindex'))).toEqual([
      '2',
      '3',
      '4',
    ]);
  });

  it('renders every row it is given when the caller states no page size', () => {
    renderTable({ rows: WINDOW_ROWS });

    // The default the bound is added above: every supplied row is painted and no window control
    // exists, which is what every caller that states no page size keeps receiving.
    expect(paintedNames()).toEqual(WINDOW_ROWS.map((row) => row.name));
    expect(screen.getByRole('table')).toHaveAttribute(
      'aria-rowcount',
      String(WINDOW_ROWS.length + 1),
    );
    expect(screen.queryByRole('button', { name: WINDOW_CONTROLS.previous })).toBeNull();
    expect(screen.queryByRole('button', { name: WINDOW_CONTROLS.next })).toBeNull();
  });

  it('paints one window of the rows and still announces the whole set', () => {
    renderTable({ rows: WINDOW_ROWS, pageSize: WINDOW_SIZE });

    expect(paintedNames()).toEqual(
      WINDOW_ROWS.slice(0, WINDOW_SIZE).map((row) => row.name),
    );
    /* The count is of every row the caller supplied, so the position a painted row announces is its
       own position in that set rather than its offset inside the window: a reader is told the table
       holds rows the window does not paint. */
    expect(screen.getByRole('table')).toHaveAttribute(
      'aria-rowcount',
      String(WINDOW_ROWS.length + 1),
    );
    expect(rowIndexes()).toEqual(
      WINDOW_ROWS.slice(0, WINDOW_SIZE).map((_, offset) => String(offset + 2)),
    );
  });

  it('moves the window with its own controls, and counts the window it shows', async () => {
    const user = userEvent.setup();
    renderTable({ rows: WINDOW_ROWS, pageSize: WINDOW_SIZE });

    const summary = screen.getByRole('status');
    expect(summary).toHaveTextContent(
      `Rows 1 to ${String(WINDOW_SIZE)} of ${String(WINDOW_ROWS.length)}`,
    );

    await user.click(screen.getByRole('button', { name: WINDOW_CONTROLS.next }));

    expect(paintedNames()).toEqual(
      WINDOW_ROWS.slice(WINDOW_SIZE, WINDOW_SIZE * 2).map((row) => row.name),
    );
    expect(rowIndexes()).toEqual([
      String(WINDOW_SIZE + 2),
      String(WINDOW_SIZE + 3),
      String(WINDOW_SIZE + 4),
    ]);
    expect(summary).toHaveTextContent(
      `Rows ${String(WINDOW_SIZE + 1)} to ${String(WINDOW_SIZE * 2)} of ${String(WINDOW_ROWS.length)}`,
    );

    await user.click(screen.getByRole('button', { name: WINDOW_CONTROLS.previous }));

    expect(paintedNames()).toEqual(
      WINDOW_ROWS.slice(0, WINDOW_SIZE).map((row) => row.name),
    );
  });

  it('explains a window control that cannot act instead of leaving it inert', async () => {
    const user = userEvent.setup();
    renderTable({ rows: WINDOW_ROWS, pageSize: WINDOW_SIZE });

    /* The first window cannot go back, so the control is disabled and carries the sentence saying so
       rather than accepting a press that would do nothing (rule P-8). */
    const backward = screen.getByRole('button', { name: WINDOW_CONTROLS.previous });
    expect(backward).toHaveAttribute('aria-disabled', 'true');
    expect(backward).toHaveAccessibleDescription(/no earlier window/);

    const forward = screen.getByRole('button', { name: WINDOW_CONTROLS.next });
    expect(forward).not.toHaveAttribute('aria-disabled');

    /* Two moves reach the last window, whose own forward control cannot act for the same reason. */
    await user.click(forward);
    await user.click(screen.getByRole('button', { name: WINDOW_CONTROLS.next }));

    const lastForward = screen.getByRole('button', { name: WINDOW_CONTROLS.next });
    expect(lastForward).toHaveAttribute('aria-disabled', 'true');
    expect(lastForward).toHaveAccessibleDescription(/no later window/);
  });

  it('renders a sort control only for a sortable column, named by its header text', () => {
    renderTable();

    const controls = screen.getAllByRole('button');
    expect(controls).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Name' })).toBe(controls[0]);
  });

  it('reports the sorted column as ascending', () => {
    renderTable({ sort: { columnId: 'name', direction: 'asc' } });

    const [first, second] = screen.getAllByRole('columnheader');
    expect(first).toHaveAttribute('aria-sort', 'ascending');
    expect(second).not.toHaveAttribute('aria-sort');
  });

  it('reports the sorted column as descending', () => {
    renderTable({ sort: { columnId: 'name', direction: 'desc' } });

    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('reports a sortable column that is not the sorted one as unsorted', () => {
    renderTable({ sort: { columnId: 'state', direction: 'asc' } });

    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });

  /*
   * The order the caller's rows arrived in, announced rather than applied.
   *
   * A read that orders its own rows — the service's default order on every table the application
   * renders — hands that order to the table, so the header it names states the order in effect before a
   * reader touches a control. The two directions are one case each because only the announcement
   * differs.
   */
  it.each([
    { direction: 'asc', ariaSort: 'ascending' },
    { direction: 'desc', ariaSort: 'descending' },
  ] as const)(
    'announces the order its rows arrived in as $ariaSort',
    ({ direction, ariaSort }) => {
      renderTable({ defaultOrder: { columnId: 'name', direction } });

      const [first, second] = screen.getAllByRole('columnheader');
      expect(first).toHaveAttribute('aria-sort', ariaSort);
      expect(second).not.toHaveAttribute('aria-sort');
    },
  );

  it('turns the sort caret over for the order its rows arrived in', () => {
    const { rerender } = renderTable({
      defaultOrder: { columnId: 'name', direction: 'asc' },
    });

    expect(caretClass()).toContain('rotate-180');

    rerender(tableElement({ defaultOrder: { columnId: 'name', direction: 'desc' } }));

    expect(caretClass()).not.toContain('rotate-180');
  });

  it('lets the caller’s sort outrank the order its rows arrived in', () => {
    const { rerender } = renderTable({
      defaultOrder: { columnId: 'name', direction: 'asc' },
      sort: { columnId: 'name', direction: 'desc' },
    });

    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    /* A sort on another column replaces the handed-in order outright: once the caller applies an order
       of its own, the column the rows arrived sorted by announces nothing. */
    rerender(
      tableElement({
        defaultOrder: { columnId: 'name', direction: 'asc' },
        sort: { columnId: 'state', direction: 'asc' },
      }),
    );

    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });

  it('reorders no row and reports no sort for the order its rows arrived in', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();

    renderTable({ defaultOrder: { columnId: 'name', direction: 'desc' }, onSort });

    // The order is the caller's: the announcement applies nothing, and only an activation of the sort
    // control reaches `onSort`, which then reports the column and nothing about the handed-in order.
    expect(onSort).not.toHaveBeenCalled();
    expect(bodyRows().map((row) => row.textContent)).toEqual(
      ROWS.map((row) => `${row.name}Awaiting review`),
    );

    await user.click(screen.getByRole('button', { name: 'Name' }));

    expect(onSort).toHaveBeenCalledTimes(1);
    expect(onSort).toHaveBeenCalledWith('name');
    expect(bodyRows().map((row) => row.textContent)).toEqual(
      ROWS.map((row) => `${row.name}Awaiting review`),
    );
  });

  it('flips the sort caret over only while the column is ascending', () => {
    const { rerender } = renderTable();

    // `aria-sort` already announces the order, so the caret is decoration: it points down for the
    // caller's own order and for descending, and flips over for ascending.
    expect(caretClass()).toContain('shrink-0');
    expect(caretClass()).not.toContain('rotate-180');

    rerender(tableElement({ sort: { columnId: 'name', direction: 'asc' } }));
    expect(caretClass()).toContain('rotate-180');

    rerender(tableElement({ sort: { columnId: 'name', direction: 'desc' } }));
    expect(caretClass()).not.toContain('rotate-180');
  });

  it('reports the column id to the caller when its sort control is activated', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    renderTable({ onSort });

    await user.click(screen.getByRole('button', { name: 'Name' }));

    expect(onSort).toHaveBeenCalledTimes(1);
    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('reports each sort activation without reordering the rows', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    renderTable({ onSort });

    const control = screen.getByRole('button', { name: 'Name' });
    await user.click(control);
    await user.click(control);

    expect(onSort).toHaveBeenCalledTimes(2);
    expect(onSort).toHaveBeenNthCalledWith(1, 'name');
    expect(onSort).toHaveBeenNthCalledWith(2, 'name');
    // The order is the caller's state: the table re-renders only when a new `sort` prop arrives,
    // so two activations report twice and still show the rows in the caller's own order.
    expect(bodyRows().map((row) => row.textContent)).toEqual(
      ROWS.map((row) => `${row.name}Awaiting review`),
    );
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });

  it('T-16 starts with the first row as the only tab stop', () => {
    renderTable();

    expect(cursorRow()).toBe(rowAt(0));
    expect(bodyRows()).toHaveLength(ROWS.length);
  });

  it('T-16 moves the focus ring onto the row it focuses', async () => {
    const user = userEvent.setup();
    renderTable();
    rowAt(0).focus();

    // The visible focus indicator B-3 requires: a 2px ring in the theme's focus-ring role token,
    // drawn only on keyboard focus so a pointer user never sees it. No outline-hiding utility is
    // allowed beside it: `outline-none` and `outline-hidden` both set `--tw-outline-style: none`,
    // which is the variable `focus-visible:outline-2` takes its outline style from.
    const focusRingClass = 'focus-visible:outline-focus-ring';
    expect(rowAt(0).className).toContain(focusRingClass);
    expect(rowAt(0).className).toContain('focus-visible:outline-2');
    expect(rowAt(0).className).not.toMatch(/outline-(none|hidden)/);

    await user.keyboard('j');

    const focused = document.activeElement;
    if (!(focused instanceof HTMLTableRowElement)) {
      throw new Error('J moved focus off the table rows');
    }
    expect(focused).toBe(rowAt(1));
    expect(focused.className).toContain(focusRingClass);
  });

  it('T-16 moves the row cursor forward on J and back on K', async () => {
    const user = userEvent.setup();
    renderTable();
    rowAt(0).focus();

    await user.keyboard('j');
    expect(document.activeElement).toBe(rowAt(1));
    expect(cursorRow()).toBe(rowAt(1));

    await user.keyboard('k');
    expect(document.activeElement).toBe(rowAt(0));
    expect(cursorRow()).toBe(rowAt(0));
  });

  it('T-16 wraps the row cursor at both ends', async () => {
    const user = userEvent.setup();
    renderTable();
    rowAt(ROWS.length - 1).focus();

    await user.keyboard('j');
    expect(document.activeElement).toBe(rowAt(0));

    await user.keyboard('k');
    expect(document.activeElement).toBe(rowAt(ROWS.length - 1));
  });

  it('T-16 keeps the row cursor inside the window it paints, and clamps it when the window moves', async () => {
    const user = userEvent.setup();
    renderTable({ rows: WINDOW_ROWS, pageSize: WINDOW_SIZE });
    expect(cursorRow()).toBe(rowAt(0));

    /* J walks the rows the window paints and wraps inside it: a cursor moved onto a row the window
       does not paint would leave nothing in the table tabbable (rule B-3). */
    rowAt(0).focus();
    await user.keyboard('j');
    await user.keyboard('j');
    expect(document.activeElement).toBe(rowAt(WINDOW_SIZE - 1));

    await user.keyboard('j');
    expect(document.activeElement).toBe(rowAt(0));

    /* The window moves out from under the cursor, so the cursor is clamped into the window that
       replaced it rather than left on an index nothing paints. */
    await act(async () => {
      screen.getByRole('button', { name: WINDOW_CONTROLS.next }).click();
    });

    expect(cursorRow()).toBe(rowAt(0));
    expect(rowIndexes()[0]).toBe(String(WINDOW_SIZE + 2));
  });

  it('T-16 keeps the cursor row tabbable when the row list shrinks under it', async () => {
    const user = userEvent.setup();
    const { rerender } = renderTable();
    // The row records its own index as the cursor when it takes focus, so the flush makes index 2
    // the stored cursor before the list shrinks under it.
    await act(async () => {
      rowAt(2).focus();
    });
    expect(cursorRow()).toBe(rowAt(2));

    // A filter, a write-back or a role switch can shrink the list under a cursor index the table
    // already stored. Without the clamp the stored 2 would match no row, no row would carry
    // `tabIndex={0}`, and nothing in the table would be reachable by `Tab` (rule B-3).
    rerender(tableElement({ rows: [ROWS[0]] }));

    expect(bodyRows()).toHaveLength(1);
    expect(cursorRow()).toBe(rowAt(0));

    screen.getByRole('button', { name: 'Name' }).focus();
    await user.tab();
    expect(document.activeElement).toBe(rowAt(0));
  });

  it('T-16 opens the focused row on Enter', async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    renderTable({ onRowActivate });
    rowAt(1).focus();

    await user.keyboard('{Enter}');

    expect(onRowActivate).toHaveBeenCalledTimes(1);
    expect(onRowActivate).toHaveBeenCalledWith(ROWS[1]);
  });

  it('opens a row on a single click', async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    renderTable({ onRowActivate });

    await user.click(rowAt(2));

    expect(onRowActivate).toHaveBeenCalledTimes(1);
    expect(onRowActivate).toHaveBeenCalledWith(ROWS[2]);
  });

  it('opens a row once for a double click', async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    renderTable({ onRowActivate });

    // A row that opens something navigates when it does, so each activation is a history entry.
    // The first click of a double click has already opened the row; opening it again on the second
    // click would push a duplicate entry, leaving one Back press with the URL unchanged.
    await user.dblClick(rowAt(2));

    expect(onRowActivate).toHaveBeenCalledTimes(1);
    expect(onRowActivate).toHaveBeenCalledWith(ROWS[2]);
  });

  it('leaves a click on a control inside a row to that control', async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    const columns = [
      ...COLUMNS,
      {
        id: 'action',
        header: 'Action',
        render: (row: Row) => <button type="button">Inspect {row.name}</button>,
      },
    ] as const satisfies readonly TableColumn<Row>[];
    renderTable({ columns, onRowActivate });

    // The row advertises a click and opens on one, but a control it holds answers its own click:
    // opening the row behind the control would take the reader somewhere they did not choose.
    await user.click(within(rowAt(1)).getByRole('button'));

    expect(onRowActivate).not.toHaveBeenCalled();
  });

  it('switches the row hover transition off under reduced motion', () => {
    renderTable();

    // B-3: a row that opens something fades its hover ground in over 150ms, and a reader who asks
    // for reduced motion gets the same hover state with no transition at all.
    const first = rowAt(0);
    expect(first).toHaveClass('transition-colors');
    expect(first).toHaveClass('motion-reduce:transition-none');
  });

  it('answers the pointer on the sort control and on the rows that open something', () => {
    renderTable({ onRowActivate: vi.fn() });

    const control = screen.getByRole('button', { name: 'Name' });

    // The sort control stated no hover at all: the hover fill and the primary label now replace the
    // caption colour the JSX supplies, and both hold under the press.
    expect(control).toHaveClass('hover:bg-surface-1');
    expect(control).toHaveClass('hover:text-text-primary');
    expect(control).toHaveClass('active:bg-surface-2');
    expect(control).toHaveClass('active:text-text-primary');
    // Paced like every other control's feedback, and skipped in a reduced-motion session.
    expect(control).toHaveClass('motion-safe:transition-colors');
    expect(control).toHaveClass('motion-safe:duration-150');

    // A row that opens something answers the press one step below its hover ground, so the row the
    // pointer rests on and the row it is pressing are told apart.
    const first = rowAt(0);
    expect(first).toHaveClass('hover:bg-surface-2');
    expect(first).toHaveClass('active:bg-surface-1');
  });

  it('T-16 leaves J and Enter to a control inside a row', async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    const columns = [
      ...COLUMNS,
      {
        id: 'action',
        header: 'Action',
        render: (row: Row) => <button type="button">Inspect {row.name}</button>,
      },
    ] as const satisfies readonly TableColumn<Row>[];
    renderTable({ columns, onRowActivate });

    const control = within(rowAt(1)).getByRole('button');
    control.focus();
    expect(document.activeElement).toBe(control);

    await user.keyboard('j');
    expect(document.activeElement).toBe(control);
    expect(cursorRow()).toBe(rowAt(1));

    await user.keyboard('{Enter}');
    expect(onRowActivate).not.toHaveBeenCalled();
  });

  it('T-16 leaves J and Enter typed into a field to that field', async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    const columns = [
      ...COLUMNS,
      {
        id: 'note',
        header: 'Note',
        render: () => <input aria-label="Shift note" />,
      },
    ] as const satisfies readonly TableColumn<Row>[];
    renderTable({ columns, onRowActivate });

    const field = within(rowAt(1)).getByRole('textbox', { name: 'Shift note' });
    field.focus();
    expect(document.activeElement).toBe(field);

    // In a text field J and K are characters, not cursor moves: the keys reach the field and the
    // row cursor stays on the row that holds it instead of advancing to the next row.
    await user.keyboard('jk');
    expect(document.activeElement).toBe(field);
    expect(field).toHaveValue('jk');
    expect(cursorRow()).toBe(rowAt(1));

    await user.keyboard('{Enter}');
    expect(onRowActivate).not.toHaveBeenCalled();
  });

  it.each(['Control', 'Alt', 'Meta'] as const)(
    'T-16 leaves J to the browser while %s is held',
    async (modifier) => {
      const user = userEvent.setup();
      renderTable();
      rowAt(0).focus();

      // A held modifier turns J into a browser or operating-system shortcut, so the table leaves the
      // keystroke alone: neither the focus nor the cursor moves off the row it was on.
      await user.keyboard(`{${modifier}>}j{/${modifier}}`);

      expect(document.activeElement).toBe(rowAt(0));
      expect(cursorRow()).toBe(rowAt(0));
    },
  );

  it('T-16 leaves a key event another handler has already consumed', async () => {
    const user = userEvent.setup();
    renderTable();
    // A key event another handler consumed is not the table's to act on, so a `preventDefault`
    // during the capture phase keeps the row cursor from seeing the key at all.
    screen.getByRole('table').addEventListener(
      'keydown',
      (event) => {
        event.preventDefault();
      },
      { capture: true, once: true },
    );

    rowAt(0).focus();
    await user.keyboard('j');

    expect(document.activeElement).toBe(rowAt(0));
    expect(cursorRow()).toBe(rowAt(0));
  });

  it('T-16 leaves J to a link, an editable and a linked control inside a row', async () => {
    const user = userEvent.setup();
    const columns = [
      ...COLUMNS,
      {
        id: 'reference',
        header: 'Reference',
        render: () => <a href="#reference">Open the reference</a>,
      },
      {
        id: 'note',
        header: 'Note',
        render: () => (
          <span
            contentEditable="true"
            suppressContentEditableWarning={true}
            tabIndex={0}
          >
            Editable note
          </span>
        ),
      },
      {
        id: 'record',
        header: 'Record',
        render: () => (
          <span role="link" tabIndex={0}>
            Linked record
          </span>
        ),
      },
    ] as const satisfies readonly TableColumn<Row>[];
    renderTable({ columns });

    const row = rowAt(0);
    // Each of these owns its own keys — a link takes `Enter`, an editable takes every character and
    // an element announced as a link is one — so a J pressed on any of them is not a row move.
    const targets = [
      within(row).getByText('Open the reference'),
      within(row).getByText('Editable note'),
      within(row).getByText('Linked record'),
    ];

    for (const target of targets) {
      target.focus();
      expect(document.activeElement).toBe(target);

      await user.keyboard('j');
      expect(document.activeElement).toBe(target);
      expect(cursorRow()).toBe(row);
    }
  });

  it('T-16 takes no key action while the empty sentence stands in place of the rows', () => {
    renderTable({ rows: [] });

    const cell = within(rowAt(0)).getByRole('cell');
    // No row in the body is one the cursor can sit on, so J and K are not this table's keys: its
    // handler returns without consuming either keystroke.
    for (const key of ['j', 'k']) {
      expect(fireEvent.keyDown(cell, { key })).toBe(true);
    }

    expect(
      bodyRows().filter((row) => row.getAttribute('tabindex') === '0'),
    ).toHaveLength(0);
    expect(screen.getByRole('table').contains(document.activeElement)).toBe(
      false,
    );
  });

  it('renders the empty message in one cell spanning every column', () => {
    renderTable({ rows: [], emptyMessage: EMPTY_MESSAGE });

    const cell = within(rowAt(0)).getByRole('cell');
    expect(cell).toHaveTextContent(EMPTY_MESSAGE);
    expect(cell).toHaveAttribute('colspan', String(COLUMNS.length));
    // The empty message replaces the rows, not the columns: the header still names what is missing.
    expect(screen.getAllByRole('columnheader')).toHaveLength(COLUMNS.length);
    // The row count follows what the body actually renders: the header plus the one message cell.
    expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount', '2');
    expect(
      bodyRows().filter((row) => row.getAttribute('tabindex') === '0'),
    ).toHaveLength(0);
  });

  it('shows the empty message instead of cell-less rows when the caller declares no columns', () => {
    renderTable({ columns: [], rows: ROWS, emptyMessage: EMPTY_MESSAGE });

    // A table with no columns has nothing to show, so it renders the one full-width cell carrying
    // the caller's sentence rather than one row per supplied row with no cell in it.
    expect(bodyRows()).toHaveLength(1);
    const cells = within(rowAt(0)).getAllByRole('cell');
    expect(cells).toHaveLength(1);
    const [cell] = cells;
    expect(cell).toHaveTextContent(EMPTY_MESSAGE);
    // Nothing to span, so the cell spans the single column a table always has at least.
    expect(cell).toHaveAttribute('colspan', '1');
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
    // No data row is rendered, so nothing in the body is a tab stop.
    expect(
      bodyRows().filter((row) => row.getAttribute('tabindex') === '0'),
    ).toHaveLength(0);
  });

  it('offers no window controls under the empty sentence, even when the rows outnumber the page size', () => {
    renderTable({ columns: [], rows: WINDOW_ROWS, pageSize: WINDOW_SIZE });

    /* A window exists to move through rows the table paints, and this rendering paints none: offering
       the controls over the caller's sentence would advertise rows nothing can show (rule P-8). */
    expect(bodyRows()).toHaveLength(1);
    expect(screen.queryByRole('button', { name: WINDOW_CONTROLS.previous })).toBeNull();
    expect(screen.queryByRole('button', { name: WINDOW_CONTROLS.next })).toBeNull();
  });

  it('requires an empty message of every caller, so no table can be silently blank', () => {
    // Compile-time guard, checked by `npm run typecheck`: `{}` is assignable to a props pick only
    // where no property is required, so this fails to type-check the moment `emptyMessage` becomes
    // optional again — which is the shape that let a caller render a blank cell.
    expectTypeOf<{}>().not.toExtend<Pick<DataTableProps<Row>, 'emptyMessage'>>();
  });

  it('T-16 announces no row as a control and takes no key action when the caller supplies no activation', async () => {
    const user = userEvent.setup();
    render(
      <DataTable<Row>
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(row) => row.key}
        caption={CAPTION}
        sort={null}
        onSort={noop}
        emptyMessage={EMPTY_MESSAGE}
      />,
    );

    const first = rowAt(0);
    // A row that opens nothing is not a control: no pointer cue, no role, no button inside.
    expect(first).not.toHaveClass('cursor-pointer');
    expect(first).not.toHaveAttribute('role');
    expect(within(first).queryByRole('button')).toBeNull();

    first.focus();
    await user.keyboard('{Enter}');

    expect(document.activeElement).toBe(first);
    expect(bodyRows().map((row) => row.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
    ]);
  });

  it('wraps no cell of a column marked single-line, so the row keeps the density token height', () => {
    const columns = [
      {
        id: 'identifier',
        header: 'Identifier',
        singleLine: true,
        render: (row: Row) => row.key,
      },
      { id: 'state', header: 'State', render: (row: Row) => row.name },
    ] as const satisfies readonly TableColumn<Row>[];
    renderTable({ columns });

    // A row's `height` is only a minimum, so a cell that wraps grows the row past `--row-height` and
    // the density switch stops changing anything. A single-line cell also takes its value's own
    // width, which is what stops an identifier breaking at its hyphens.
    for (const row of bodyRows()) {
      const [identifierCell, stateCell] = within(row).getAllByRole('cell');
      if (identifierCell === undefined || stateCell === undefined) {
        throw new Error('the table rendered fewer cells than the caller declared columns');
      }
      expect(identifierCell).toHaveClass('whitespace-nowrap');
      expect(stateCell).not.toHaveClass('whitespace-nowrap');
    }
  });

  it('pins a column to the scroll container end, following only a row that opens something', () => {
    const columns = [
      { id: 'identifier', header: 'Identifier', render: (row: Row) => row.key },
      { id: 'action', header: 'Action', pinned: true, render: (row: Row) => row.name },
    ] as const satisfies readonly TableColumn<Row>[];
    const { rerender } = renderTable({ columns });

    // A column of row controls stays reachable at rest however wide the table gets: the header and
    // every cell are held at the container's inline end, above the cells that scroll under them, on
    // the ground role the table itself stands on. The pin is `md`-scoped because below that
    // breakpoint it would cover most of a phone-width container.
    const pinnedHeader = screen.getByRole('columnheader', { name: 'Action' });
    expect(pinnedHeader).toHaveClass('md:sticky');
    expect(pinnedHeader).toHaveClass('md:end-0');
    expect(pinnedHeader).toHaveClass('md:z-10');
    expect(pinnedHeader).toHaveClass('md:bg-ground');
    expect(pinnedHeader).toHaveClass('md:border-s');
    // A header cell belongs to no activatable row, so it carries no row fill.
    expect(pinnedHeader).not.toHaveClass('md:group-hover:bg-surface-2');

    for (const row of bodyRows()) {
      const cells = within(row).getAllByRole('cell');
      const pinnedCell = cells[cells.length - 1];
      if (pinnedCell === undefined) {
        throw new Error('the table rendered no cell for the pinned column');
      }
      expect(pinnedCell).toHaveClass('md:sticky');
      expect(pinnedCell).toHaveClass('md:end-0');
      expect(pinnedCell).toHaveClass('md:bg-ground');
      // The fills key on the `group` an activatable row carries, so the row's feedback runs across
      // the pin instead of stopping where the pin begins.
      expect(row).toHaveClass('group');
      expect(pinnedCell).toHaveClass('md:group-hover:bg-surface-2');
      expect(pinnedCell).toHaveClass('md:group-active:bg-surface-1');
    }

    rerender(
      <DataTable<Row>
        columns={columns}
        rows={ROWS}
        getRowKey={(row) => row.key}
        caption={CAPTION}
        sort={null}
        onSort={noop}
        emptyMessage={EMPTY_MESSAGE}
      />,
    );

    // A row that opens nothing advertises nothing: it carries no `group`, so the pinned cell keeps
    // the ground role rather than answering a hover the row does not honour.
    for (const row of bodyRows()) {
      expect(row).not.toHaveClass('group');
    }
  });

  it('keeps the pinned column clear of a focus ring through the scroll container only while a column is pinned', () => {
    const pinnedColumns = [
      { id: 'identifier', header: 'Identifier', render: (row: Row) => row.key },
      { id: 'action', header: 'Action', pinned: true, render: (row: Row) => row.name },
    ] as const satisfies readonly TableColumn<Row>[];
    const { rerender } = renderTable({ columns: pinnedColumns });

    /*
      A pin covers the container's inline end, so the container keeps that width free as scroll
      padding: the browser's own focus scrolling then puts a control it would otherwise leave resting
      under the pin clear of it. Without the padding the control's 2 px ring is painted beneath an
      opaque cell and the reader sees no indicator at all (rule B-3, WCAG 2.2 SC 2.4.11).
    */
    const container = screen.getByRole('table').parentElement;
    if (!(container instanceof HTMLElement)) {
      throw new Error('the table rendered no scroll container');
    }
    expect(container).toHaveClass('relative');
    expect(container).toHaveClass('overflow-x-auto');
    expect(container).toHaveClass('md:scroll-pe-72');

    // A table that pins nothing has no pin to clear, so the container keeps its whole width and
    // scrolls a focused control to its own edge.
    rerender(
      <DataTable<Row>
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(row) => row.key}
        caption={CAPTION}
        sort={null}
        onSort={noop}
        emptyMessage={EMPTY_MESSAGE}
      />,
    );

    expect(screen.getByRole('table').parentElement).not.toHaveClass(
      'md:scroll-pe-72',
    );
  });


  for (const density of DENSITIES) {
    it(`sizes its rows from the --row-height token under ${density} density`, () => {
      setRootAttribute('data-density', density);
      renderTable();

      for (const row of bodyRows()) {
        // The height is the density token, so the global switch resizes every table in the app.
        expect(row.className).toContain('h-[var(--row-height)]');
        // A pixel height here would ignore the switch entirely.
        expect(row.className).not.toMatch(/\d+px/);
        expect(row.getAttribute('style')).toBeNull();
      }
    });
  }

  for (const theme of THEMES) {
    it(`renders the same table under the ${theme} theme through role tokens only`, () => {
      setRootAttribute('data-theme', theme);
      renderTable();

      expect(screen.getByRole('table')).toHaveAccessibleName(CAPTION);
      expect(screen.getAllByRole('columnheader')).toHaveLength(COLUMNS.length);
      expect(bodyRows()).toHaveLength(ROWS.length);
      expect(cursorRow()).toBe(rowAt(0));

      // Colour reaches the markup only as a role token (`text-text-primary`, `border-hairline`), so
      // both themes resolve at runtime and neither palette is baked into the component.
      const table = screen.getByRole('table');
      for (const element of Array.from(table.querySelectorAll('[class]'))) {
        expect(element.getAttribute('class') ?? '').not.toMatch(
          /#[0-9a-f]{3,8}|\brgba?\(/i,
        );
      }
    });
  }
});
