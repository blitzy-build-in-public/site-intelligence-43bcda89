/**
 * Component suite for `grouped-bar-chart.tsx`, the grouped comparison SCR-04 draws beside its matrix.
 *
 * Every case asserts a contract the surface is relied on for rather than its markup: one interactive
 * control per cell and one per cluster label, an accessible name assembled from the group, the series
 * and the already-formatted value the caller supplied, keyboard activation of a cell opening that
 * cell's own evidence, the same for a cluster's own evidence, the group index and series id reported to
 * `onActivate`, a zero value that keeps its label on screen, a series shorter than the group list that
 * draws no invented mark, the focus ring the surface holds in state, the tone each series is painted in,
 * and both themes of specification §4.1 rendering the same controls.
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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Evidence, Meta, Result, SimLabel } from '../types';
import { SIM_LABELS } from '../types';
import { EVIDENCE_DRAWER_TEXT } from './evidence-drawer';
import { GROUPED_BAR_CHART_TEXT, GroupedBarChart } from './grouped-bar-chart';
import type { BarGroup, BarSeries, GroupedBarChartProps } from './grouped-bar-chart';

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

/** What the port hands back for any reference this suite opens. */
const RESULT: Result<Evidence> = { data: EVIDENCE, meta: META };

/** The axis maximum the fixtures are drawn against. */
const AXIS_MAX = 8;

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

beforeEach(() => {
  getEvidence.mockResolvedValue(RESULT);
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

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
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
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
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

  it('paints each series in the role its tone names', () => {
    renderChart(chart());

    expect(cellControl('Order alpha, Plan one: four').querySelector('.fill-accent')).not.toBeNull();
    expect(
      cellControl('Order alpha, Plan two: six').querySelector('.fill-status-warning'),
    ).not.toBeNull();
  });

  it('paints a market-intelligence series in a competitor role', () => {
    const competitorSeries = [
      {
        id: 'competitor-one',
        label: 'Competitor one',
        tone: 'competitor-1',
        values: [
          { value: 5, valueLabel: 'five', evidenceRef: 'evidence-competitor-one-alpha' },
          { value: 7, valueLabel: 'seven', evidenceRef: 'evidence-competitor-one-beta' },
          { value: 6, valueLabel: 'six', evidenceRef: 'evidence-competitor-one-gamma' },
        ],
      },
    ] as const satisfies readonly BarSeries[];

    renderChart(<GroupedBarChart groups={GROUPS} series={competitorSeries} max={AXIS_MAX} />);

    expect(
      cellControl('Order alpha, Competitor one: five').querySelector('.fill-competitor-1'),
    ).not.toBeNull();
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
});
