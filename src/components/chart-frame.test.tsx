/**
 * Component suite for `chart-frame.tsx`, the frame every chart, map and graph is composed inside.
 *
 * Success criterion 9 and rule B-3 make the table view a pass condition rather than a nicety, so
 * each case below asserts one clause of the frame's own contract: the figure named by its
 * `<figcaption>` where the title and the description sit, the surface rendered while the chart view
 * is up, the table view that replaces it with the caller's caption, columns and cells, the return
 * trip back to the surface, keyboard-only operation of the control, the simulation label rendered
 * for the surface it belongs to and never invented when the caller omits it, the ordering control
 * that exists only when the caller can honour it, the sentence that explains a table view with no
 * rows, and the toggle that stays enabled and single.
 *
 * The cells hold made-up labels because the frame computes nothing (rule P-6): what the table shows
 * is entirely the caller's `tableRows`. Renders under the jsdom environment `vite.config.ts`
 * configures; nothing here hashes or reads the clock.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SimLabel } from '../types';
import { SIM_LABELS } from '../types';
import { ChartFrame } from './chart-frame';
import type { ChartFrameProps, ChartTableSpec } from './chart-frame';
import type { TableColumn, TableSort } from './data-table';
import { VIEW_AS_TABLE_LABELS } from './view-as-table-toggle';

/** The two labels the control renders, read from their single owner so this suite never retypes them. */
const { showChart, showTable } = VIEW_AS_TABLE_LABELS;

/** The row shape a caller of this suite would draw on its surface. Readonly, as a response is. */
interface Row {
  readonly key: string;
  readonly order: string;
  readonly unitsLate: string;
}

const TITLE = 'Units late by order';
const DESCRIPTION = 'Every order the selected plan leaves short.';
const CAPTION = 'Units late by order, as a table';

/** The attribute that identifies the surface a case is checking for, without naming its internals. */
const CHART_SURFACE = 'chart-surface';

const ROWS = [
  { key: 'CO-770233', order: 'CO-770233', unitsLate: '580' },
  { key: 'CO-770251', order: 'CO-770251', unitsLate: '640' },
  { key: 'CO-770310', order: 'CO-770310', unitsLate: '0' },
] as const satisfies readonly Row[];

const COLUMNS = [
  { id: 'order', header: 'Order', render: (row: Row) => row.order },
  { id: 'unitsLate', header: 'Units late', align: 'end', render: (row: Row) => row.unitsLate },
] as const satisfies readonly TableColumn<Row>[];

/** The same columns, declaring that a caller could order them — which only becomes true with `onSort`. */
const SORTABLE_COLUMNS: readonly TableColumn<Row>[] = COLUMNS.map((column) => ({
  ...column,
  sortable: true,
}));

/**
 * One of the seven fixed simulation labels, read from `SIM_LABELS` rather than retyped, so a reworded
 * label cannot leave this suite asserting a string the interface no longer shows.
 */
function simLabelAt(index: number): SimLabel {
  const label = SIM_LABELS[index];
  if (label === undefined) {
    throw new Error(`no simulation label is defined at index ${index}`);
  }
  return label;
}

/** The label every computed figure carries (specification §5.3), which is the one this frame paints. */
const SIM_LABEL = simLabelAt(1);

/** The `<figure>` the frame renders, or a failure naming what is missing rather than a silent null. */
function figureElement(): HTMLElement {
  const figure = document.querySelector('figure');
  if (!(figure instanceof HTMLElement)) {
    throw new Error('the frame rendered no <figure>');
  }
  return figure;
}

/** The `<figcaption>` that names the figure. */
function captionElement(): HTMLElement {
  const caption = figureElement().querySelector('figcaption');
  if (!(caption instanceof HTMLElement)) {
    throw new Error('the figure rendered no <figcaption>');
  }
  return caption;
}

/** The caller's surface, or `null` while the table view is up. */
function chartSurface(): HTMLElement | null {
  return screen.queryByTestId(CHART_SURFACE);
}

/** The one toggle, addressed by the accessible name the frame gives it: the action and the title. */
function toggleButton(label: string = showTable): HTMLElement {
  return screen.getByRole('button', { name: `${label}: ${TITLE}` });
}

/** Every rendered body row, in document order. */
function bodyRows(): readonly HTMLTableRowElement[] {
  return Array.from(document.querySelectorAll('tbody tr')).filter(
    (row): row is HTMLTableRowElement => row instanceof HTMLTableRowElement,
  );
}

/** The cell text of every body row, which is how the table view is compared with the caller's rows. */
function cellTexts(): readonly (readonly (string | null)[])[] {
  return bodyRows().map((row) => Array.from(row.cells, (cell) => cell.textContent));
}

interface FrameOptions {
  readonly simLabel?: SimLabel;
  readonly description?: string;
  readonly rows?: readonly Row[];
  readonly columns?: readonly TableColumn<Row>[];
  readonly sort?: TableSort | null;
  readonly onSort?: (columnId: string) => void;
}

/**
 * The frame this suite's caller renders, with the props a case does not vary left out rather than
 * set to `undefined`, because the component distinguishes an absent optional prop from a present one.
 */
function frameElement(options: FrameOptions = {}): ReactElement<ChartFrameProps<Row>> {
  const tableRows: ChartTableSpec<Row> = {
    caption: CAPTION,
    columns: options.columns ?? COLUMNS,
    rows: options.rows ?? ROWS,
    getRowKey: (row) => row.key,
    sort: options.sort ?? null,
    ...(options.onSort === undefined ? {} : { onSort: options.onSort }),
  };

  return (
    <ChartFrame<Row>
      title={TITLE}
      tableRows={tableRows}
      {...(options.description === undefined ? {} : { description: options.description })}
      {...(options.simLabel === undefined ? {} : { simLabel: options.simLabel })}
    >
      <div data-testid={CHART_SURFACE} />
    </ChartFrame>
  );
}

/** Leaves `<html>` on the default theme for whichever suite runs next. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('ChartFrame', () => {
  it('names the figure from its figcaption, where the title and the description sit', () => {
    render(frameElement({ description: DESCRIPTION }));

    const caption = captionElement();

    expect(within(caption).getByText(TITLE)).toHaveClass('text-16', 'text-text-primary');
    expect(within(caption).getByText(DESCRIPTION)).toHaveClass('text-14', 'text-text-secondary');
    // Specification §4.3 exposes no shadow token, so the frame adds no elevation of its own.
    expect(figureElement().className).not.toMatch(/\bshadow-/);
  });

  it('renders the surface and no table while the chart view is up', () => {
    render(frameElement());

    expect(chartSurface()).not.toBeNull();
    expect(figureElement().querySelector('table')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('replaces the surface with the table view, holding the caller caption, columns and cells', async () => {
    const user = userEvent.setup();
    render(frameElement());

    await user.click(toggleButton());

    // Unmounted rather than hidden, so no focus stop survives inside a surface no longer shown.
    expect(chartSurface()).toBeNull();

    const table = screen.getByRole('table');
    expect(table.querySelector('caption')).toHaveTextContent(CAPTION);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(COLUMNS.length);
    expect(bodyRows()).toHaveLength(ROWS.length);
    expect(cellTexts()).toEqual(ROWS.map((row) => [row.order, row.unitsLate]));
  });

  it('restores the surface when the control is activated again', async () => {
    const user = userEvent.setup();
    render(frameElement());

    await user.click(toggleButton());
    await user.click(toggleButton(showChart));

    expect(chartSurface()).not.toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it.each([
    { keyPress: '{Enter}', keyName: 'Enter' },
    // user-event addresses the space bar by its physical code: its keyboard map names no `Space` key.
    { keyPress: '[Space]', keyName: 'Space' },
  ])(
    'T-16 switches representation by keyboard alone with $keyName',
    async ({ keyPress }) => {
      const user = userEvent.setup();
      render(frameElement());

      await user.tab();
      expect(toggleButton()).toHaveFocus();

      await user.keyboard(keyPress);

      expect(screen.queryByRole('table')).not.toBeNull();
      expect(toggleButton(showChart)).toHaveFocus();
    },
  );

  it('carries the simulation label it is given as visible text', () => {
    render(frameElement({ simLabel: SIM_LABEL }));

    expect(within(captionElement()).getByText(SIM_LABEL)).toBeVisible();
  });

  it('invents no simulation label when the caller supplies none', () => {
    render(frameElement());

    for (const label of SIM_LABELS) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('renders a single toggle that is never disabled', () => {
    render(frameElement());

    const toggle = toggleButton();

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(toggle).not.toHaveAttribute('disabled');
    expect(toggle).not.toHaveAttribute('aria-disabled');
  });

  it('offers no sort control when the caller supplied no way to order the rows', async () => {
    const user = userEvent.setup();
    render(frameElement({ columns: SORTABLE_COLUMNS }));

    await user.click(toggleButton());

    // A control that reported to nobody would be a button that does not perform its function (P-8).
    expect(within(screen.getByRole('table')).queryAllByRole('button')).toHaveLength(0);
  });

  it('reports the activated column and states the order when the caller can honour both', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(
      frameElement({
        columns: SORTABLE_COLUMNS,
        sort: { columnId: 'order', direction: 'asc' },
        onSort,
      }),
    );

    await user.click(toggleButton());

    const table = screen.getByRole('table');
    const [orderHeader] = within(table).getAllByRole('columnheader');
    expect(orderHeader).toHaveAttribute('aria-sort', 'ascending');

    await user.click(within(table).getByRole('button', { name: 'Order' }));

    expect(onSort).toHaveBeenCalledTimes(1);
    expect(onSort).toHaveBeenCalledWith('order');
  });

  it('explains a table view with no rows instead of leaving it blank', async () => {
    const user = userEvent.setup();
    render(frameElement({ rows: [] }));

    await user.click(toggleButton());

    const [row] = bodyRows();
    expect(bodyRows()).toHaveLength(1);
    expect(row?.textContent?.trim()).not.toBe('');
    expect(row?.cells[0]?.getAttribute('colspan')).toBe(String(COLUMNS.length));
  });

  it.each(['command', 'paper'] as const)(
    'frames the surface from role tokens alone under the %s theme',
    (theme) => {
      document.documentElement.dataset.theme = theme;

      render(frameElement({ description: DESCRIPTION, simLabel: SIM_LABEL }));

      const caption = captionElement();
      expect(within(caption).getByText(TITLE)).toHaveClass('text-text-primary');
      expect(within(caption).getByText(DESCRIPTION)).toHaveClass('text-text-secondary');
      expect(caption.className).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(toggleButton()).toBeEnabled();
    },
  );
});
