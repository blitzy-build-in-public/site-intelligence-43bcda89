/**
 * Component suite for `data-table.tsx`, the only table the application renders.
 *
 * Each case asserts a contract the component promises rather than its markup: the caption that
 * names the table (B-3), the scoped column headers, the sort control that is a real button reporting
 * `aria-sort` while the order stays the caller's own, the `J`/`K` row cursor with its wrap-around, its
 * single tab stop and its focus-ring token (AAP §0.12.4, T-16), `Enter` and double-click activation,
 * the keys the cursor must leave to the fields and controls it passes through, row heights that
 * resolve through `--row-height` rather than a pixel value, the same table under both themes, and
 * the empty sentence in both shapes that have nothing to show — no rows, and no columns to show
 * them in. The cells hold made-up labels because the component computes nothing (P-6):
 * what a cell shows is entirely the caller's `render`.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

interface TableOptions {
  readonly columns?: readonly TableColumn<Row>[];
  readonly rows?: readonly Row[];
  readonly sort?: TableSort | null;
  readonly onSort?: (columnId: string) => void;
  readonly onRowActivate?: (row: Row) => void;
  readonly emptyMessage?: string;
}

/** Renders the table with this suite's defaults, overriding only what a case asserts on. */
function renderTable(options: TableOptions = {}): void {
  render(
    <DataTable<Row>
      columns={options.columns ?? COLUMNS}
      rows={options.rows ?? ROWS}
      getRowKey={(row) => row.key}
      caption={CAPTION}
      sort={options.sort ?? null}
      onSort={options.onSort ?? noop}
      onRowActivate={options.onRowActivate ?? noop}
      emptyMessage={options.emptyMessage ?? EMPTY_MESSAGE}
    />,
  );
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

  it('T-16 draws the focus-ring token on the row it moves focus to', async () => {
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

  it('T-16 opens the focused row on Enter', async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    renderTable({ onRowActivate });
    rowAt(1).focus();

    await user.keyboard('{Enter}');

    expect(onRowActivate).toHaveBeenCalledTimes(1);
    expect(onRowActivate).toHaveBeenCalledWith(ROWS[1]);
  });

  it('opens a row on a double click', async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    renderTable({ onRowActivate });

    await user.dblClick(rowAt(2));

    expect(onRowActivate).toHaveBeenCalledTimes(1);
    expect(onRowActivate).toHaveBeenCalledWith(ROWS[2]);
  });

  it('switches the row hover transition off under reduced motion', () => {
    renderTable();

    // B-3: a row that opens something fades its hover ground in over 150ms, and a reader who asks
    // for reduced motion gets the same affordance with no transition at all.
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

  it('requires an empty message of every caller, so no table can be silently blank', () => {
    // Compile-time guard, checked by `npm run typecheck`: `{}` is assignable to a props pick only
    // where no property is required, so this fails to type-check the moment `emptyMessage` becomes
    // optional again — which is the shape that let a caller render a blank cell.
    expectTypeOf<{}>().not.toExtend<Pick<DataTableProps<Row>, 'emptyMessage'>>();
  });

  it('T-16 announces no row as a control and takes no key action when the caller supplies no activation', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(
      <DataTable<Row>
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(row) => row.key}
        caption={CAPTION}
        sort={null}
        onSort={onSort}
        emptyMessage={EMPTY_MESSAGE}
      />,
    );

    const first = rowAt(0);
    // A row that opens nothing is not a control: no pointer affordance, no role, no button inside.
    expect(first).not.toHaveClass('cursor-pointer');
    expect(first).not.toHaveAttribute('role');
    expect(within(first).queryByRole('button')).toBeNull();

    first.focus();
    await user.keyboard('{Enter}');

    expect(onSort).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(first);
    expect(bodyRows().map((row) => row.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
    ]);
  });

  for (const density of DENSITIES) {
    it(`sizes its rows from the --row-height token under ${density} density`, () => {
      setRootAttribute('data-density', density);
      renderTable();

      expect(document.documentElement).toHaveAttribute('data-density', density);
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

      expect(document.documentElement).toHaveAttribute('data-theme', theme);
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
