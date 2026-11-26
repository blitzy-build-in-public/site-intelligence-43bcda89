/**
 * Component suite for `data-table.tsx`, the only table the application renders.
 *
 * Each case asserts a contract the component promises rather than its markup: the caption that
 * names the table (B-3), the scoped column headers, the sort control that is a real button reporting
 * `aria-sort`, the `J`/`K` row cursor with its wrap-around and single tab stop (AAP §0.12.4), `Enter`
 * and double-click activation, the keys the cursor must leave to the controls it passes through, and
 * both empty renderings. The cells hold made-up labels because the component computes nothing (P-6):
 * what a cell shows is entirely the caller's `render`.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from './data-table';
import type { TableColumn, TableSort } from './data-table';

/** The row shape this suite's caller would render. Fields are readonly, as a service response is. */
interface Row {
  readonly key: string;
  readonly name: string;
}

/** The table's accessible name, asserted against the rendered caption. */
const CAPTION = 'Rows awaiting a decision';

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
      emptyMessage={options.emptyMessage ?? ''}
    />,
  );
}

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

  it('starts with the first row as the only tab stop', () => {
    renderTable();

    expect(cursorRow()).toBe(rowAt(0));
    expect(bodyRows()).toHaveLength(ROWS.length);
  });

  it('moves the row cursor forward on J and back on K', async () => {
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

  it('wraps the row cursor at both ends', async () => {
    const user = userEvent.setup();
    renderTable();
    rowAt(ROWS.length - 1).focus();

    await user.keyboard('j');
    expect(document.activeElement).toBe(rowAt(0));

    await user.keyboard('k');
    expect(document.activeElement).toBe(rowAt(ROWS.length - 1));
  });

  it('opens the focused row on Enter', async () => {
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

  it('leaves J and Enter to a control inside a row', async () => {
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

  it('renders the empty message in one cell spanning every column', () => {
    renderTable({ rows: [], emptyMessage: 'Nothing matches these filters' });

    const cell = within(rowAt(0)).getByRole('cell');
    expect(cell).toHaveTextContent('Nothing matches these filters');
    expect(cell).toHaveAttribute('colspan', String(COLUMNS.length));
    expect(
      bodyRows().filter((row) => row.getAttribute('tabindex') === '0'),
    ).toHaveLength(0);
  });

  it('renders an empty cell rather than a blank table when no message is given', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        rows={[]}
        getRowKey={(row) => row.key}
        caption={CAPTION}
        sort={null}
        onSort={noop}
      />,
    );

    expect(screen.getByRole('cell')).toBeEmptyDOMElement();
  });

  it('renders no interactive row when the caller supplies no activation', () => {
    render(
      <DataTable<Row>
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(row) => row.key}
        caption={CAPTION}
        sort={null}
        onSort={noop}
      />,
    );

    expect(rowAt(0)).not.toHaveClass('cursor-pointer');
  });
});
