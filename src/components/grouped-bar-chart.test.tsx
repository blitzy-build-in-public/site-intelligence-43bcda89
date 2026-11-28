/**
 * Component suite for `grouped-bar-chart.tsx`, the grouped comparison SCR-04 draws beside its matrix.
 *
 * Every case asserts a contract the surface is relied on for rather than its markup: one interactive
 * control per cell and one per cluster label, an accessible name assembled from the group, the series
 * and the already-formatted value the caller supplied, keyboard activation of a cell opening that
 * cell's own evidence, the same for a cluster's own evidence, the group index and series id reported to
 * `onActivate`, a zero value that keeps its label on screen, a series shorter than the group list that
 * draws no invented mark, the focus ring the surface holds in state, the accent ring every mark reveals
 * under a hover or a press, the read-out a mark answers with on focus and on pointer entry — a bar's
 * cluster, series and value, and a cluster label's every series — the tone each series is painted in, a legend with one row per series the surface
 * draws a mark for and none for a series it does not, an axis whose ticks follow the caller's
 * maximum rather than the largest bar, a market-intelligence series compared beside a first-party one
 * with no figure summing the two, the drawer showing the activated cell's own record rather than one
 * shared reference, and both themes of specification §4.1 rendering the same controls.
 *
 * The cells hold plain words because the chart formats nothing (rule P-6): `valueLabel` arrives ready to
 * paint, so the values below are the caller's own labels rather than a currency amount or a
 * record-identifier literal. Identifiers are opaque placeholders for the same reason, which is what
 * keeps this file clear of the shapes `tests/source-checks/no-typed-figures.test.ts` scans for even
 * though it sits in the folder that check reads.
 *
 * The service is mocked at `../services/service-provider`, the one boundary the drawer inside this surface reads
 * through (rule P-2), so no adapter, seed module or real read is involved: the case observes the exact
 * evidence reference the activated cell asked for. Renders run inside a query cache because the drawer
 * reads through one. Nothing here hashes, reads the clock or touches the network, so the jsdom
 * environment `vite.config.ts` sets by default is the right one.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Evidence, Meta, Result, SimLabel } from '../types';
import { COMPETITOR_NAME_TAG, SIM_LABELS } from '../types';
import { EVIDENCE_DRAWER_TEXT } from './evidence-drawer';
import { GROUPED_BAR_CHART_TEXT, GroupedBarChart } from './grouped-bar-chart';
import type { BarGroup, BarSeries, GroupedBarChartProps } from './grouped-bar-chart';
import { CHART_TONE_CLASSES } from './horizontal-bar-chart';

/**
 * The one port member the surface reaches, replaced before the component module is imported so the real
 * provider — and with it the in-browser adapter and its seeded records — is never constructed here.
 */
const getEvidence = vi.hoisted(() => vi.fn());

vi.mock('../services/service-provider', () => ({
  useService: () => ({ getEvidence }),
}));

/**
 * One of the seven fixed simulation labels, read from `SIM_LABELS` rather than retyped, so a reworded
 * label cannot leave this suite asserting a string the interface no longer shows. Every computed figure
 * carries this one (specification §5.3), and the evidence record below is a computed figure's record.
 */
function simLabelAt(index: number): SimLabel {
  const label = SIM_LABELS[index];
  if (label === undefined) {
    throw new Error(`no simulation label is defined at index ${index}`);
  }
  return label;
}

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/** The correlation identifier every `Result` carries, and its freshness array: none is claimed here. */
const META: Meta = { freshness: [], simulated: true, traceId: 'trace-grouped-bar' };

/** The evidence one bar resolves to: a computed figure with nothing missing behind it. */
const EVIDENCE: Evidence = {
  value: 'four',
  provenance: 'computed',
  label: simLabelAt(1),
  formula: 'Read from the plan of record.',
  inputs: [],
  upstream: [],
  downstream: [],
  confidence: { level: 'high', reason: 'Read from the plan of record.' },
  missingInputs: [],
  documents: [],
};

/**
 * What the port hands back for one evidence reference.
 *
 * The record's value echoes the reference it was fetched for, so a drawer's content can be traced to
 * the cell that opened it: a chart whose bars all opened one shared reference would be handed one
 * shared record here, which none of the reference assertions below could distinguish on its own.
 */
function evidenceFor(evidenceRef: string): Result<Evidence> {
  return { data: { ...EVIDENCE, value: evidenceRef }, meta: META };
}

/** The axis maximum the fixtures are drawn against. */
const AXIS_MAX = 8;

/**
 * A second maximum, deliberately larger than any value in the fixtures.
 *
 * The axis-scale cases render the same data twice, once at each maximum: a surface that scaled itself
 * from the largest value it was handed would draw identical ticks both times, so only the case that
 * changes the maximum can tell a caller-supplied scale from a derived one.
 */
const LARGE_AXIS_MAX = 20;

/** The axis label the caller supplies, which is also the graphic's accessible name. */
const AXIS_LABEL = 'Units late';

/** Three clusters: the orders a comparison is read across. */
const GROUPS = [
  { id: 'order-alpha', label: 'Order alpha', evidenceRef: 'evidence-order-alpha' },
  { id: 'order-beta', label: 'Order beta', evidenceRef: 'evidence-order-beta' },
  { id: 'order-gamma', label: 'Order gamma', evidenceRef: 'evidence-order-gamma' },
] as const satisfies readonly BarGroup[];

/**
 * Two series: the compared plans. One value is zero on purpose, because a bar with no extent still has
 * to keep its label on screen and still has to be reachable.
 */
const SERIES = [
  {
    id: 'plan-one',
    label: 'Plan one',
    tone: 'accent',
    values: [
      { value: 4, valueLabel: 'four', evidenceRef: 'evidence-plan-one-alpha' },
      { value: 0, valueLabel: 'none', evidenceRef: 'evidence-plan-one-beta' },
      { value: 2, valueLabel: 'two', evidenceRef: 'evidence-plan-one-gamma' },
    ],
  },
  {
    id: 'plan-two',
    label: 'Plan two',
    tone: 'warning',
    values: [
      { value: 6, valueLabel: 'six', evidenceRef: 'evidence-plan-two-alpha' },
      { value: 3, valueLabel: 'three', evidenceRef: 'evidence-plan-two-beta' },
      { value: 8, valueLabel: 'eight', evidenceRef: 'evidence-plan-two-gamma' },
    ],
  },
] as const satisfies readonly BarSeries[];

/**
 * A market-intelligence series: one series painted in a competitor role, compared beside a
 * first-party one in the provenance cases below (rule P-5).
 *
 * It is drawn only in a `--color-competitor-*` role, so a competitor reading cannot take a
 * first-party hue, and no figure on the surface may be the sum of one of its cells with a
 * first-party cell.
 */
const COMPETITOR_SERIES = {
  id: 'competitor-one',
  label: 'Competitor one',
  tone: 'competitor-1',
  values: [
    { value: 5, valueLabel: 'five', evidenceRef: 'evidence-competitor-one-alpha' },
    { value: 7, valueLabel: 'seven', evidenceRef: 'evidence-competitor-one-beta' },
    { value: 6, valueLabel: 'six', evidenceRef: 'evidence-competitor-one-gamma' },
  ],
} as const satisfies BarSeries;

/**
 * The six names the cells must carry, stated here as their own literals rather than derived from the
 * fixtures above: derived, the expectation and the data would move together and a name built from the
 * wrong field would still pass. Held apart, a swapped group or a dropped value label fails this case.
 */
const EXPECTED_CELL_NAMES = [
  'Order alpha, Plan one: four',
  'Order alpha, Plan two: six',
  'Order beta, Plan one: none',
  'Order beta, Plan two: three',
  'Order gamma, Plan one: two',
  'Order gamma, Plan two: eight',
] as const;

/** The three names the cluster labels must carry: the group's own label, then what activating it does. */
const EXPECTED_CLUSTER_NAMES = [
  'Order alpha — open evidence',
  'Order beta — open evidence',
  'Order gamma — open evidence',
] as const;

/** The suffix that tells a reader what a cluster label does, read from its single owner. */
const ACTIVATION_SUFFIX_PATTERN = new RegExp(
  `${escapeForPattern(GROUPED_BAR_CHART_TEXT.groupActivationSuffix)}$`,
);

/** Escapes the regular-expression metacharacters of one literal, so a suffix is matched as written. */
function escapeForPattern(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/** The class a focused slot carries, taken from the surface's own colour role rather than retyped. */
const FOCUS_RING_SELECTOR = '.stroke-focus-ring';

/** A query cache per render, with retries off so a failure surfaces once rather than four times. */
function renderChart(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/** The surface with the default fixtures, and any override one case needs. */
function chart(props: Partial<GroupedBarChartProps> = {}): ReactElement {
  return (
    <GroupedBarChart groups={GROUPS} series={SERIES} max={AXIS_MAX} yAxisLabel={AXIS_LABEL} {...props} />
  );
}

/** Every cell control: the ones whose name carries the value, which the cluster labels do not. */
function cellControls(): readonly HTMLElement[] {
  return screen.getAllByRole('button', { name: /, .+: /u });
}

/** Every cluster label control, found by the suffix that says what activating one does. */
function clusterControls(): readonly HTMLElement[] {
  return screen.getAllByRole('button', { name: ACTIVATION_SUFFIX_PATTERN });
}

/** One cell control, by the name it is expected to carry. */
function cellControl(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

/** The focused slot's ring, which is the only element painted in the focus-ring role. */
function focusRings(): readonly Element[] {
  return Array.from(document.querySelectorAll(FOCUS_RING_SELECTOR));
}

/**
 * The pointer ring a mark carries: the only element of a mark painted in the accent role, because the
 * bars themselves take the role their series' tone names.
 */
const POINTER_RING_SELECTOR = '.stroke-accent';

/**
 * The pointer-state utilities one class list declares, filtered by their prefix rather than matched as
 * one whole string, so a legitimate token change inside a state cannot fail the case while the
 * requirement — a hover and a pressed treatment built from role tokens — still holds.
 */
function pointerStates(classList: string): readonly string[] {
  return classList
    .split(' ')
    .filter((utility) => utility.startsWith('group-hover:') || utility.startsWith('group-active:'));
}

/**
 * The axis-guide labels the surface draws: the only text inside the guides' hidden group, which is
 * why the axis-scale cases below render without a `yAxisLabel` — its own text lives in that group too.
 */
function axisGuides(container: HTMLElement): readonly Element[] {
  const guides = container.querySelector('svg > g[aria-hidden="true"]');

  return guides === null ? [] : Array.from(guides.querySelectorAll('text'));
}

/** The axis-guide labels as the strings painted, in the order they are drawn. */
function tickLabels(container: HTMLElement): readonly string[] {
  return axisGuides(container).map((node) => node.textContent ?? '');
}

/** The `y` a drawn `<text>` is baselined at, or NaN when it declares none. */
function baselineOf(node: Element): number {
  return Number(node.getAttribute('y'));
}

/** The rows of the legend the surface prints, in the order it drew them. */
function legendRows(container: HTMLElement): readonly HTMLElement[] {
  const list = container.querySelector('ul');

  if (list === null) {
    throw new Error('the surface printed no legend');
  }

  return within(list).getAllByRole('listitem');
}

/** The one `<text>` element painting a given string, so a case can assert where it sits. */
function svgText(container: HTMLElement, painted: string): Element {
  const found = Array.from(container.querySelectorAll('svg text')).find(
    (node) => node.textContent === painted,
  );

  if (found === undefined) {
    throw new Error(`no svg text paints ${painted}`);
  }

  return found;
}

/**
 * Asserts that the open drawer is showing the record behind the cell that was activated.
 *
 * The reference is painted in the drawer's own record line, so a chart whose bars all opened one
 * shared reference — which would look entirely correct on screen — fails here; and because the mock
 * echoes the requested reference into the record's value, a drawer that displayed one reference while
 * fetching another is caught too. The other cells' references must not appear at all, so the evidence
 * on screen belongs to the activated cell and to nothing else.
 */
function expectDrawerShows(
  dialog: HTMLElement,
  evidenceRef: string,
  otherRefs: readonly string[],
): void {
  expect(dialog.textContent).toContain(evidenceRef);

  for (const other of otherRefs) {
    expect(dialog.textContent).not.toContain(other);
  }
}

beforeEach(() => {
  getEvidence.mockImplementation((evidenceRef: string) => Promise.resolve(evidenceFor(evidenceRef)));
});

afterEach(() => {
  getEvidence.mockReset();
  delete document.documentElement.dataset['theme'];
});

describe('GroupedBarChart', () => {
  it('renders one interactive control per cell and one per cluster label', () => {
    renderChart(chart());

    expect(cellControls()).toHaveLength(GROUPS.length * SERIES.length);
    expect(clusterControls()).toHaveLength(GROUPS.length);
  });

  it('names each cell with its group, its series and the formatted value', () => {
    renderChart(chart());

    const names = cellControls().map((control) => control.getAttribute('aria-label'));

    expect(names).toEqual([...EXPECTED_CELL_NAMES]);
    for (const name of EXPECTED_CLUSTER_NAMES) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }

    /* Each supplied label is painted as the caller wrote it, because the chart owns no format. */
    for (const series of SERIES) {
      for (const cell of series.values) {
        expect(screen.getAllByText(cell.valueLabel).length).toBeGreaterThan(0);
      }
    }
  });

  it('names the graphic with the axis label the caller supplies', () => {
    renderChart(chart());

    expect(screen.getByRole('group', { name: AXIS_LABEL })).toBeInTheDocument();
  });

  it('falls back to its own name when the caller supplies no axis label', () => {
    renderChart(
      <GroupedBarChart groups={GROUPS} series={SERIES} max={AXIS_MAX} />,
    );

    expect(
      screen.getByRole('group', { name: GROUPED_BAR_CHART_TEXT.chartLabel }),
    ).toBeInTheDocument();
  });

  it('opens that cell’s own evidence on Enter and reports the activation', async () => {
    const onActivate = vi.fn();
    renderChart(chart({ onActivate }));

    const control = cellControl('Order alpha, Plan one: four');
    fireEvent.focus(control);
    fireEvent.keyDown(control, { key: 'Enter' });

    const dialog = await screen.findByRole('dialog');
    expectDrawerShows(dialog, 'evidence-plan-one-alpha', [
      'evidence-plan-one-beta',
      'evidence-plan-two-alpha',
    ]);
    expect(getEvidence).toHaveBeenCalledWith('evidence-plan-one-alpha');
    expect(onActivate).toHaveBeenCalledWith(0, 'plan-one');
  });

  it('operates a cell from the keyboard alone', async () => {
    const onActivate = vi.fn();
    renderChart(chart({ onActivate }));

    const control = cellControl('Order gamma, Plan two: eight');
    control.focus();
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledWith('evidence-plan-two-gamma');
    expect(onActivate).toHaveBeenCalledWith(2, 'plan-two');
  });

  it('reaches the first cell by Tab and opens its evidence with Enter', async () => {
    renderChart(chart());

    const control = cellControl('Order alpha, Plan one: four');
    expect(control).toHaveAttribute('tabindex', '0');

    await userEvent.tab();
    expect(document.activeElement).toBe(control);

    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledWith('evidence-plan-one-alpha');
  });

  it('opens a cell’s evidence on Space without scrolling the document', async () => {
    renderChart(chart());

    const control = cellControl('Order beta, Plan two: three');
    fireEvent.focus(control);
    const notPrevented = fireEvent.keyDown(control, { key: ' ' });

    expect(notPrevented).toBe(false);

    /* Not merely that a dialog opened: the record on screen is the one behind this cell, and the
       other cells' records are nowhere in it. */
    const dialog = await screen.findByRole('dialog');
    expectDrawerShows(dialog, 'evidence-plan-two-beta', [
      'evidence-plan-one-alpha',
      'evidence-plan-two-alpha',
    ]);
    expect(getEvidence).toHaveBeenCalledWith('evidence-plan-two-beta');
  });

  it('opens a cluster’s own evidence from its label control', async () => {
    renderChart(chart());

    fireEvent.click(screen.getByRole('button', { name: 'Order beta — open evidence' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledWith('evidence-order-beta');
  });

  it('returns focus to the control that opened the evidence when the drawer closes', async () => {
    renderChart(chart());

    const control = cellControl('Order alpha, Plan one: four');
    fireEvent.focus(control);
    fireEvent.keyDown(control, { key: 'Enter' });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: EVIDENCE_DRAWER_TEXT.closeLabel }));

    await waitFor(() => {
      // Compared as booleans on purpose: an identity assertion that fails on the first attempt would
      // serialise the DOM node, and serialising an SVG control reaches React's internal props.
      expect(document.activeElement === control).toBe(true);
    });
  });

  it('keeps the label of a value of zero on screen', () => {
    renderChart(chart());

    expect(screen.getByText('none')).toBeInTheDocument();
    expect(cellControl('Order beta, Plan one: none')).toBeInTheDocument();
  });

  it('draws no mark for a series shorter than the group list', () => {
    const shortSeries = [
      {
        id: 'plan-three',
        label: 'Plan three',
        tone: 'review',
        values: [
          { value: 1, valueLabel: 'one', evidenceRef: 'evidence-plan-three-alpha' },
          { value: 2, valueLabel: 'two', evidenceRef: 'evidence-plan-three-beta' },
        ],
      },
    ] as const satisfies readonly BarSeries[];

    renderChart(<GroupedBarChart groups={GROUPS} series={shortSeries} max={AXIS_MAX} />);

    expect(cellControls()).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: 'Order gamma, Plan three: two' }),
    ).toBeNull();
  });

  it('marks the focused slot with the focus ring and clears it on blur', () => {
    renderChart(chart());

    const control = cellControl('Order alpha, Plan two: six');
    fireEvent.focus(control);
    expect(focusRings()).toHaveLength(1);

    fireEvent.blur(control);
    expect(focusRings()).toHaveLength(0);
  });

  it('answers the pointer on every cell and cluster label without losing the focus ring', () => {
    renderChart(chart());

    const controls = screen.getAllByRole('button');

    expect(controls.length).toBeGreaterThan(0);

    for (const control of controls) {
      /* The mark's own group is what the ring's hover and pressed variants hang on. */
      expect(control.getAttribute('class')).toContain('group');

      const ring = control.querySelector(POINTER_RING_SELECTOR);

      expect(ring).not.toBeNull();

      const states = pointerStates(ring?.getAttribute('class') ?? '');

      expect(states.some((utility) => utility.startsWith('group-hover:'))).toBe(true);
      expect(states.some((utility) => utility.startsWith('group-active:'))).toBe(true);
      for (const utility of states) {
        /* Every state names a role-token property: no palette literal, no arbitrary value, no shadow. */
        expect(utility.slice(utility.lastIndexOf(':') + 1)).toMatch(/^(fill|stroke|opacity)-[a-z0-9]/u);
        expect(utility).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|\[.+\]/iu);
        expect(utility).not.toContain('shadow');
      }

      /* The ring's own paint is the accent role, and its fade is the one the reduced-motion guard gates. */
      expect(ring?.getAttribute('class')).toContain('stroke-accent');
      expect(ring?.getAttribute('class')).toContain('motion-safe:transition-opacity');
    }

    /* The keyboard affordance is untouched: focus still draws the focus-ring ring, on that mark alone. */
    const control = cellControl('Order alpha, Plan two: six');
    fireEvent.focus(control);
    expect(control.querySelector(FOCUS_RING_SELECTOR)).not.toBeNull();
    expect(focusRings()).toHaveLength(1);

    fireEvent.blur(control);
    expect(focusRings()).toHaveLength(0);
  });

  it('paints each series in the role its tone names', () => {
    renderChart(chart());

    expect(cellControl('Order alpha, Plan one: four').querySelector('.fill-accent')).not.toBeNull();
    expect(
      cellControl('Order alpha, Plan two: six').querySelector('.fill-status-warning'),
    ).not.toBeNull();
  });

  it('paints a market-intelligence series in a competitor role', () => {
    renderChart(<GroupedBarChart groups={GROUPS} series={[COMPETITOR_SERIES]} max={AXIS_MAX} />);

    expect(
      cellControl('Order alpha, Competitor one: five').querySelector('.fill-competitor-1'),
    ).not.toBeNull();
  });

  it('prints a legend with one row per drawn series, each swatch in the role its bars take', () => {
    const { container } = renderChart(chart());
    const rows = legendRows(container);

    /* One row per series, in the order the caller listed them, and each row's words are its own name. */
    expect(rows.map((row) => row.textContent)).toEqual(SERIES.map((entry) => entry.label));

    /* Every swatch comes from the one tone table the bars resolve their fill from, so a reader keying
       a colour to a series reads the same role token the plot paints (AAP §0.5.3). */
    SERIES.forEach((entry, index) => {
      const swatch = rows[index]?.querySelector('[aria-hidden="true"]');

      expect(swatch?.getAttribute('class')).toContain(CHART_TONE_CLASSES[entry.tone].swatch);
    });
  });

  it('prints no legend row for a series that draws no mark', () => {
    const undrawn: BarSeries = {
      id: 'plan-empty',
      label: 'Plan empty',
      tone: 'review',
      values: [],
    };

    const { container } = renderChart(
      <GroupedBarChart groups={GROUPS} series={[SERIES[0], undrawn]} max={AXIS_MAX} />,
    );

    /* The legend describes the drawing: a series with no cell has no bar to key, so it gets no row. */
    expect(legendRows(container).map((row) => row.textContent)).toEqual([SERIES[0].label]);
  });

  it('tags a market-intelligence row with the labels rule P-5 fixes', () => {
    const { container } = renderChart(
      <GroupedBarChart groups={GROUPS} series={[COMPETITOR_SERIES]} max={AXIS_MAX} />,
    );
    const [row] = legendRows(container);
    const text = row?.textContent ?? '';

    expect(text).toContain(COMPETITOR_SERIES.label);
    expect(text).toContain(COMPETITOR_NAME_TAG);
    expect(text).toContain(simLabelAt(5));
  });

  it('compares a competitor series beside a first-party one and paints no combined total', () => {
    const firstParty = SERIES[0];

    const { container } = renderChart(
      <GroupedBarChart groups={GROUPS} series={[firstParty, COMPETITOR_SERIES]} max={LARGE_AXIS_MAX} />,
    );

    /* Both series are drawn, each in the role its tone names, and no mark is lost to the mixing. */
    expect(cellControls()).toHaveLength(GROUPS.length * 2);
    expect(cellControl('Order alpha, Plan one: four').querySelector('.fill-accent')).not.toBeNull();
    expect(
      cellControl('Order alpha, Competitor one: five').querySelector('.fill-competitor-1'),
    ).not.toBeNull();

    /* Nothing on the surface is a total across series: every painted string is a label the caller
       supplied or an axis guide, so a figure blending the two provenances would have to be one of
       those, and it is neither (rule P-5). */
    const supplied = new Set<string>([
      ...GROUPS.map((group) => group.label),
      ...firstParty.values.map((cell) => cell.valueLabel),
      ...COMPETITOR_SERIES.values.map((cell) => cell.valueLabel),
      ...tickLabels(container),
    ]);
    const painted = Array.from(container.querySelectorAll('svg text')).map(
      (node) => node.textContent ?? '',
    );

    expect(painted.length).toBeGreaterThan(0);
    for (const text of painted) {
      expect(supplied.has(text)).toBe(true);
    }

    /* Stated directly as well: a cluster's two readings never appear added together. */
    GROUPS.forEach((group, index) => {
      const total = String(
        (firstParty.values[index]?.value ?? 0) + (COMPETITOR_SERIES.values[index]?.value ?? 0),
      );

      expect(painted).not.toContain(total);
      expect(painted).not.toContain(`${group.label}: ${total}`);
    });
  });

  it('renders the same controls under both themes', () => {
    for (const theme of THEMES) {
      document.documentElement.dataset['theme'] = theme;
      const { unmount } = renderChart(chart());

      expect(cellControls()).toHaveLength(GROUPS.length * SERIES.length);
      expect(clusterControls()).toHaveLength(GROUPS.length);

      unmount();
    }
  });

  it('draws nothing when it has no groups or no series', () => {
    const { container: withoutGroups } = renderChart(
      <GroupedBarChart groups={[]} series={SERIES} max={AXIS_MAX} />,
    );
    expect(withoutGroups.querySelector('svg')).toBeNull();

    const { container: withoutSeries } = renderChart(
      <GroupedBarChart groups={GROUPS} series={[]} max={AXIS_MAX} />,
    );
    expect(withoutSeries.querySelector('svg')).toBeNull();
  });

  it('draws an axis with guides derived from the maximum alone', () => {
    renderChart(chart());

    // The axis is a guide, not a figure: it is hidden from assistive technology, so the formatted value
    // on each bar stays the only value announced.
    const axis = document.querySelector('svg > g[aria-hidden="true"]');
    expect(axis).not.toBeNull();
    expect(axis?.textContent).toContain(AXIS_LABEL);
  });

  it('scales the value axis from the supplied maximum, not from the data', () => {
    const small = renderChart(<GroupedBarChart groups={GROUPS} series={SERIES} max={AXIS_MAX} />);
    const smallTicks = tickLabels(small.container);
    small.unmount();

    const large = renderChart(
      <GroupedBarChart groups={GROUPS} series={SERIES} max={LARGE_AXIS_MAX} />,
    );
    const largeTicks = tickLabels(large.container);

    /* Identical fixtures both times, so a scale read from the largest value would repeat itself; the
       second maximum is larger than any cell, so only the prop can produce the second set of ticks. */
    expect(smallTicks).toEqual(['0', '4', '8']);
    expect(largeTicks).toEqual(['0', '10', '20']);
    expect(largeTicks).not.toEqual(smallTicks);
  });

  it('prints the group labels under the value axis', () => {
    const { container } = renderChart(chart());

    const guides = axisGuides(container);
    expect(guides.length).toBeGreaterThan(0);

    const deepestGuide = Math.max(...guides.map(baselineOf));

    for (const group of GROUPS) {
      /* Deeper in the view box than every guide: below the axis, where a category label belongs. */
      expect(baselineOf(svgText(container, group.label))).toBeGreaterThan(deepestGuide);
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The read-out a mark answers with
 * ------------------------------------------------------------------------------------------- */

/** The class utilities of one element, split so a variant cannot be mistaken for the state itself. */
function utilitiesOf(element: Element | null | undefined): readonly string[] {
  return (element?.getAttribute('class') ?? '').split(' ');
}

/** One cluster label control by the group it names, since a cluster's own label is not a cell's name. */
function clusterControlFor(groupLabel: string): HTMLElement {
  const control = clusterControls().find((candidate) =>
    (candidate.getAttribute('aria-label') ?? '').startsWith(groupLabel),
  );

  if (control === undefined) {
    throw new Error(`no cluster label names ${groupLabel}`);
  }

  return control;
}

describe('the read-out a mark answers with', () => {
  it('names the cluster, the series and the formatted value on keyboard focus, and clears on blur', () => {
    renderChart(chart());

    const cell = cellControl('Order alpha, Plan one: four');
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.focus(cell);

    /* The read-out prints the caller's own strings: no figure is formatted here (rule P-6). */
    const readout = screen.getByRole('tooltip');
    expect(within(readout).getByText(GROUPS[0].label)).toBeInTheDocument();
    expect(within(readout).getByText(SERIES[0].label)).toBeInTheDocument();
    expect(within(readout).getByText('four')).toBeInTheDocument();

    fireEvent.blur(cell);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('answers a pointer that enters a bar, and reveals that slot’s ring on that slot alone', () => {
    renderChart(chart());

    const cell = cellControl('Order beta, Plan two: three');
    const other = cellControl('Order alpha, Plan one: four');

    /* At rest every pointer ring is invisible, whatever hover variants it also carries. */
    expect(utilitiesOf(cell.querySelector(POINTER_RING_SELECTOR))).toContain('opacity-0');

    fireEvent.pointerOver(cell);

    expect(within(screen.getByRole('tooltip')).getByText('three')).toBeInTheDocument();
    expect(utilitiesOf(cell.querySelector(POINTER_RING_SELECTOR))).toContain('opacity-100');
    expect(utilitiesOf(cell.querySelector(POINTER_RING_SELECTOR))).not.toContain('opacity-0');
    expect(utilitiesOf(other.querySelector(POINTER_RING_SELECTOR))).toContain('opacity-0');

    fireEvent.pointerOut(cell);

    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(utilitiesOf(cell.querySelector(POINTER_RING_SELECTOR))).toContain('opacity-0');
  });

  it('reads a cluster’s own label out as every series in that cluster', () => {
    renderChart(chart());

    fireEvent.pointerOver(clusterControlFor('Order alpha'));

    const readout = screen.getByRole('tooltip');

    expect(within(readout).getByText(GROUPS[0].label)).toBeInTheDocument();
    expect(within(readout).getByText(SERIES[0].label)).toBeInTheDocument();
    expect(within(readout).getByText(SERIES[1].label)).toBeInTheDocument();
    expect(within(readout).getByText('four')).toBeInTheDocument();
    expect(within(readout).getByText('six')).toBeInTheDocument();
  });

  it('keeps the cluster’s activation, its drawer and the focus it returns to', async () => {
    const user = userEvent.setup();
    renderChart(chart());

    const cluster = clusterControlFor('Order alpha');

    await user.click(cluster);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    /* Closing returns focus to the control that opened the drawer, as it did before the read-out. */
    await waitFor(() => {
      expect(document.activeElement).toBe(cluster);
    });
  });
});

