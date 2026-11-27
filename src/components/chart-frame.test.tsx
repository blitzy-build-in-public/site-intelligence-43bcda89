/**
 * Component suite for `chart-frame.tsx`, the frame every chart, map and graph is composed inside.
 *
 * Success criterion 9 and rule B-3 make the table view a pass condition rather than a nicety, and
 * rule P-1 makes the simulation label one in the same way, so each case below asserts one clause of
 * the frame's own contract: the figure named by its `<figcaption>` where the title and the
 * description sit, the surface rendered while the chart view is up, the table view that replaces it
 * with the caller's caption, columns and cells, the return trip back to the surface, keyboard-only
 * operation of the control, the label a first-party surface carries and paints, the
 * market-intelligence surface that carries none because its series are tagged in its legend, the
 * ordering control that exists only when the caller can honour it, the sentence that explains a table
 * view with no rows, the toggle that stays enabled and single, and the compile-time proof that a
 * first-party frame without its label is not a frame at all.
 *
 * The cells hold plain words because the frame computes nothing (rule P-6): what the table shows is
 * entirely the caller's `tableRows`, so the values below are the caller's own labels rather than a
 * currency amount or a domain identifier borrowed from a seed record. Renders under the jsdom
 * environment `vite.config.ts` configures; nothing here hashes or reads the clock.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import type { SimLabel } from '../types';
import { SIM_LABELS } from '../types';
import { ChartFrame } from './chart-frame';
import type {
  ChartFrameBaseProps,
  ChartFrameProps,
  ChartTableSpec,
  FirstPartyChartFrameProps,
  MarketIntelligenceChartFrameProps,
} from './chart-frame';
import type { TableColumn, TableSort } from './data-table';
import { VIEW_AS_TABLE_LABELS } from './view-as-table-toggle';

/*
 * The two sibling imports above are the frame's own vocabulary, not new dependencies of this suite:
 * `ChartTableSpec` speaks `TableColumn` and `TableSort`, and the toggle owns the two label strings
 * success criterion 9 quotes, so retyping them here would give that wording a second owner.
 */

/** The two labels the control renders, read from their single owner so this suite never retypes them. */
const { showChart, showTable } = VIEW_AS_TABLE_LABELS;

/** The row shape a caller of this suite would draw on its surface. Readonly, as a response is. */
interface Row {
  readonly key: string;
  readonly lane: string;
  readonly region: string;
  readonly window: string;
}

const TITLE = 'Delivery windows by lane';
const DESCRIPTION = 'Every lane the selected plan schedules.';
const CAPTION = 'Delivery windows by lane, as a table';

/** The attribute that identifies the surface a case is checking for, without naming its internals. */
const CHART_SURFACE = 'chart-surface';

/**
 * Three rows across three columns, each value a plain word: the frame passes the caller's cells
 * through unchanged, so this suite states its own labels rather than a figure or an identifier that
 * belongs to a seed record. Three columns rather than two is what makes a cell assertion prove the
 * column order as well as the values — a positional slip shows up in the second and third cells.
 */
const ROWS = [
  { key: 'alpha', lane: 'Alpha lane', region: 'inland', window: 'morning' },
  { key: 'beta', lane: 'Beta lane', region: 'coastal', window: 'midday' },
  { key: 'gamma', lane: 'Gamma lane', region: 'upland', window: 'evening' },
] as const satisfies readonly Row[];

const COLUMNS = [
  { id: 'lane', header: 'Lane', render: (row: Row) => row.lane },
  { id: 'region', header: 'Region', render: (row: Row) => row.region },
  { id: 'window', header: 'Window', align: 'end', render: (row: Row) => row.window },
] as const satisfies readonly TableColumn<Row>[];

/**
 * What the table view must show, stated here as its own literals rather than derived from `ROWS`.
 *
 * Deriving it would make the cell assertion tautological — the expectation and the spec would move
 * together, and a table drawing other data than the caller handed it would still pass. Held apart,
 * a one-character change to a spec value, or a column mapped to the wrong field, fails the case.
 */
const EXPECTED_CELLS = [
  ['Alpha lane', 'inland', 'morning'],
  ['Beta lane', 'coastal', 'midday'],
  ['Gamma lane', 'upland', 'evening'],
] as const satisfies readonly (readonly string[])[];

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

/** The cell text of one body row: the unit a cell assertion compares, in column order. */
function cellTexts(row: HTMLTableRowElement): readonly (string | null)[] {
  return Array.from(row.cells, (cell) => cell.textContent);
}

interface FrameOptions {
  /**
   * Asks for the market-intelligence variant: the one surface that carries no frame-level label,
   * because its every series states its own provenance in the `Legend` beside it (rule P-5).
   *
   * Absent, the frame is the first-party one, which carries a simulation label by contract (rule P-1).
   */
  readonly marketIntelligence?: true;
  /** The §5.3 label a first-party frame paints; this suite's own choice, defaulting to `SIM_LABEL`. */
  readonly simLabel?: SimLabel;
  readonly description?: string;
  readonly rows?: readonly Row[];
  readonly columns?: readonly TableColumn<Row>[];
  readonly sort?: TableSort | null;
  readonly onSort?: (columnId: string) => void;
}

/**
 * The frame this suite's caller renders, in the variant the case asks for: the first-party frame,
 * which always carries a simulation label (rule P-1), or the market-intelligence frame, which carries
 * none and declares that provenance instead (rule P-5).
 *
 * The props a case does not vary are left out rather than set to `undefined`, because the component
 * distinguishes an absent optional prop from a present one. The two variants are built as two
 * separate elements rather than by spreading a conditional object, so this helper cannot hand the
 * frame a props object the contract refuses and quietly test a frame no caller could construct.
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
  const description =
    options.description === undefined ? {} : { description: options.description };
  const surface = <div data-testid={CHART_SURFACE} />;

  if (options.marketIntelligence === true) {
    return (
      <ChartFrame<Row>
        title={TITLE}
        tableRows={tableRows}
        provenance="market_intelligence"
        {...description}
      >
        {surface}
      </ChartFrame>
    );
  }

  return (
    <ChartFrame<Row>
      title={TITLE}
      tableRows={tableRows}
      simLabel={options.simLabel ?? SIM_LABEL}
      {...description}
    >
      {surface}
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

    const rendered = bodyRows();
    expect(rendered).toHaveLength(ROWS.length);
    expect(rendered).toHaveLength(EXPECTED_CELLS.length);
    for (const [index, expectedCells] of EXPECTED_CELLS.entries()) {
      const renderedRow = rendered[index];
      if (renderedRow === undefined) {
        throw new Error(`the table view rendered no body row at index ${index}`);
      }
      // Cell by cell against an expectation held apart from the spec: a table showing other data
      // than the caller handed it fails here, where a row count alone would pass.
      expect(cellTexts(renderedRow)).toEqual(expectedCells);
    }

    // One control and no second: the frame mounts a single toggle whichever view is up (rule P-8).
    expect(screen.getAllByRole('button')).toHaveLength(1);
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

  it('leaves a market-intelligence surface unlabelled, its series tagged in the legend', () => {
    // A market-intelligence surface states each series' provenance in the `Legend` beside it — the
    // competitor series carry `Simulated market intelligence` there — so it holds no single
    // frame-level label and the frame paints none, rather than one label over series of two
    // provenances (rule P-5). No §5.3 label of any kind reaches the caption of such a frame.
    render(frameElement({ marketIntelligence: true }));

    for (const label of SIM_LABELS) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  /* The proof that the label cannot be omitted, held in the type checker rather than in a runtime
     assertion, because the finding it answers is that the omission compiled. `expectTypeOf`
     assertions are checked by `tsc --noEmit`, so they fail the type check if the contract is
     widened: were `simLabel` optional on the first-party branch again, `ChartFrameBaseProps<Row>` —
     the common props with no label at all — would become assignable to `ChartFrameProps<Row>`, the
     first assertion below would report that it extends the union it must not extend, and the suite
     would stop compiling. A `not.toMatchTypeOf` assertion is the safe direction for that reason: it
     passes only while the omission is a real type error, so it cannot rot into a vacuous pass. */
  it('refuses a first-party frame that carries no simulation label', () => {
    expectTypeOf<ChartFrameBaseProps<Row>>().not.toMatchTypeOf<ChartFrameProps<Row>>();
    expectTypeOf<
      Omit<FirstPartyChartFrameProps<Row>, 'simLabel'>
    >().not.toMatchTypeOf<ChartFrameProps<Row>>();
  });

  it('accepts the labelled first-party frame and the unlabelled market-intelligence one', () => {
    expectTypeOf<FirstPartyChartFrameProps<Row>>().toMatchTypeOf<ChartFrameProps<Row>>();
    expectTypeOf<MarketIntelligenceChartFrameProps<Row>>().toMatchTypeOf<ChartFrameProps<Row>>();
    // The market-intelligence branch declares `simLabel` as `never`, so that variant has no label to
    // paint even if a caller reaches for one (rule P-5).
    expectTypeOf<MarketIntelligenceChartFrameProps<Row>['simLabel']>().toEqualTypeOf<undefined>();
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
        sort: { columnId: 'lane', direction: 'asc' },
        onSort,
      }),
    );

    await user.click(toggleButton());

    const table = screen.getByRole('table');
    const [laneHeader] = within(table).getAllByRole('columnheader');
    expect(laneHeader).toHaveAttribute('aria-sort', 'ascending');

    await user.click(within(table).getByRole('button', { name: 'Lane' }));

    expect(onSort).toHaveBeenCalledTimes(1);
    expect(onSort).toHaveBeenCalledWith('lane');
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
