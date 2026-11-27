/**
 * Component suite for `horizontal-bar-chart.tsx`, the SVG surface SCR-01's revenue-at-risk bars and
 * risk-by-plant rows and SCR-13's chokepoint comparison are drawn with.
 *
 * Each case asserts a clause of the surface's contract rather than its markup: the accessible name
 * of the graphic with and without the caller's axis label; one operable mark per datum and no
 * figure element, no table element and no toggle of its own, because `chart-frame.tsx` owns those;
 * an accessible name that states the category and the value every mark draws; keyboard reachability
 * by `Tab` and activation by `Enter` and by `Space`; a pointer activation; the evidence drawer
 * opening on the datum's own reference — outside the graphic, where HTML belongs — beside the
 * `onActivate` report a screen filters its queue with; a zero value drawn at zero length with its
 * labels intact; a value beyond the caller's axis held inside the track; the mark's simulation label
 * spoken rather than spelled by the chart (rule P-1); a long category label shortened in the drawing
 * while its accessible name keeps it whole; the selected datum marked by something other than
 * colour alone; and an empty set drawing nothing at all.
 *
 * The service is mocked at `service-provider.tsx`, the one boundary the drawer is allowed to read
 * through (rule P-2), so no adapter and no query cache beyond the suite's own client are involved,
 * and the suite observes exactly the reference the mark opened. Every identifier below is an opaque
 * stand-in rather than a record-identifier shape, and every value is a plain word rather than a
 * currency amount, because the `no-typed-figures` source check reads this folder (rule P-6).
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * clock or touches the network.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Evidence, Meta, Result } from '../types';
import { EVIDENCE_DRAWER_TEXT } from './evidence-drawer';
import { HORIZONTAL_BAR_CHART_TEXT, HorizontalBarChart } from './horizontal-bar-chart';
import type { HorizontalBarChartProps, HorizontalBarDatum } from './horizontal-bar-chart';

/**
 * The port member the drawer resolves a mark's evidence through, replaced before the component
 * modules are imported so the real provider — and with it the in-browser adapter and its seeded
 * records — is never reached in a component test (rule P-2).
 */
const getEvidence = vi.hoisted(() => vi.fn());

vi.mock('../services/service-provider', () => ({
  useService: () => ({ getEvidence }),
}));

/** The correlation identifier every `Result` carries, quoted so the result is a complete one. */
const TRACE_ID = 'trace-horizontal-bar';

/**
 * The evidence the drawer resolves, with every field the record declares.
 *
 * Its text is plain words: the drawer prints the record's own sentences, and nothing in this suite
 * depends on a figure (rule P-6).
 */
const EVIDENCE: Evidence = {
  value: 'forty units',
  provenance: 'computed',
  label: 'Simulated calculation',
  formula: 'the units the record states, summed over the line',
  inputs: ['input alpha'],
  upstream: ['upstream alpha'],
  downstream: ['downstream alpha'],
  confidence: { level: 'high', reason: 'both sources answered' },
  missingInputs: [],
  documents: [],
};

/** The metadata a successful read carries; no source is stale in this suite's reading. */
const META: Meta = { freshness: [], simulated: true, traceId: TRACE_ID };

/** The result the mocked port resolves for every reference this suite opens. */
const RESULT: Result<Evidence> = { data: EVIDENCE, meta: META };

/** The bar that fills the track on this suite's axis, and the one that draws at half of it. */
const ALPHA: HorizontalBarDatum = {
  id: 'mark-alpha',
  label: 'Alpha plant',
  value: 40,
  valueLabel: 'forty units',
  evidenceRef: 'evidence-alpha',
};

/** The second bar: half of {@link ALPHA}'s value, so proportionality is observable. */
const BETA: HorizontalBarDatum = {
  id: 'mark-beta',
  label: 'Beta plant',
  value: 20,
  valueLabel: 'twenty units',
  evidenceRef: 'evidence-beta',
};

/**
 * Two bars on one axis of forty: the first fills the track, the second draws at half of it, so the
 * proportionality of the drawing is observable without the component exposing its own geometry.
 */
const BARS: readonly HorizontalBarDatum[] = [ALPHA, BETA];

/** The axis maximum both {@link BARS} are drawn against. */
const MAX = 40;

/** The accessible names the two {@link BARS} must carry: the category, then the value. */
const ALPHA_NAME = 'Alpha plant: forty units';
const BETA_NAME = 'Beta plant: twenty units';

/** The two themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/**
 * A label longer than the drawing budget, whose start is still what tells two categories apart: it
 * must be shortened where it is drawn and kept whole in the mark's accessible name.
 */
const LONG_LABEL = 'Northern corridor consolidation centre';

/**
 * Renders one surface inside the query client the drawer's read needs, with retries off so a failure
 * surfaces in the case that caused it rather than in a later one.
 */
function renderChart(element: ReactElement): RenderResult {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

/** Renders the two bars of {@link BARS}, with any optional prop a case needs to vary. */
function renderBars(overrides: Partial<Omit<HorizontalBarChartProps, 'bars' | 'max'>> = {}) {
  return renderChart(<HorizontalBarChart bars={BARS} max={MAX} {...overrides} />);
}

/**
 * The bar a mark draws, as opposed to the focus ring it also draws: the ring is the one rect in the
 * mark carrying the focus-ring stroke, so the bar is every other rect.
 */
function barOf(mark: HTMLElement): Element {
  const bar = mark.querySelector('rect:not(.stroke-focus-ring)');

  if (bar === null) {
    throw new Error('the mark drew no bar');
  }

  return bar;
}

/** The length of a mark's bar in the surface's own user units. */
function barWidthOf(mark: HTMLElement): number {
  return Number(barOf(mark).getAttribute('width'));
}

/** The text the mark draws for its category, as opposed to the text it speaks. */
function drawnLabelOf(mark: HTMLElement): string {
  return mark.querySelector('text')?.textContent ?? '';
}

beforeEach(() => {
  getEvidence.mockResolvedValue(RESULT);
});

/** Leaves no theme behind for the next case, since jsdom keeps the document root between tests. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('HorizontalBarChart', () => {
  it('names the graphic with its own default label', () => {
    renderBars();

    expect(screen.getByRole('group')).toHaveAccessibleName(
      HORIZONTAL_BAR_CHART_TEXT.groupLabel,
    );
  });

  it('names the graphic with the axis label its caller supplies', () => {
    const xAxisLabel = 'Revenue at risk per exception';

    renderBars({ xAxisLabel });

    expect(screen.getByRole('group')).toHaveAccessibleName(xAxisLabel);
  });

  it('renders one operable mark per datum and no figure, table or toggle of its own', () => {
    const { container } = renderBars();

    expect(screen.getAllByRole('button')).toHaveLength(BARS.length);
    expect(container.querySelector('figure')).toBeNull();
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('figcaption')).toBeNull();
  });

  it('states each mark’s category and value in its accessible name', () => {
    renderBars();

    expect(screen.getByRole('button', { name: ALPHA_NAME })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: BETA_NAME })).toBeInTheDocument();
  });

  it('draws each bar in proportion to its value against the caller’s maximum', () => {
    renderBars();

    const full = barWidthOf(screen.getByRole('button', { name: ALPHA_NAME }));
    const half = barWidthOf(screen.getByRole('button', { name: BETA_NAME }));

    expect(full).toBeGreaterThan(0);
    expect(half).toBeCloseTo(full / 2, 6);
  });

  it('reaches the first mark with Tab and opens its evidence with Enter', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();

    renderBars({ onActivate });

    const first = screen.getByRole('button', { name: ALPHA_NAME });
    await user.tab();

    expect(document.activeElement).toBe(first);
    expect(getEvidence).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(EVIDENCE_DRAWER_TEXT.title);
    expect(getEvidence).toHaveBeenCalledWith('evidence-alpha');
    expect(onActivate).toHaveBeenCalledWith('mark-alpha');
  });

  it('opens a mark’s evidence with Space as well as with Enter', async () => {
    const user = userEvent.setup();

    renderBars();

    await user.tab();
    await user.keyboard(' ');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledWith('evidence-alpha');
  });

  it('opens a mark’s evidence on a pointer activation and reports the datum it activated', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();

    renderBars({ onActivate });
    await user.click(screen.getByRole('button', { name: BETA_NAME }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledWith('evidence-beta');
    expect(onActivate).toHaveBeenCalledWith('mark-beta');
  });

  it('opens the evidence whether or not the caller asked to hear about the activation', async () => {
    const user = userEvent.setup();

    renderBars();
    await user.click(screen.getByRole('button', { name: ALPHA_NAME }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledTimes(1);
  });

  it('draws the drawer outside the graphic, where HTML belongs', async () => {
    const user = userEvent.setup();
    const { container } = renderBars();

    await user.click(screen.getByRole('button', { name: ALPHA_NAME }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.closest('svg')).toBeNull();
    expect(container.querySelector('svg')?.contains(dialog)).toBe(false);
  });

  it('draws a zero value at zero length and keeps its category and value on screen', () => {
    const zero: HorizontalBarDatum = {
      id: 'mark-zero',
      label: 'Gamma plant',
      value: 0,
      valueLabel: 'no units',
      evidenceRef: 'evidence-gamma',
    };

    renderChart(<HorizontalBarChart bars={[zero]} max={MAX} />);

    const mark = screen.getByRole('button', { name: 'Gamma plant: no units' });
    expect(barWidthOf(mark)).toBe(0);
    expect(drawnLabelOf(mark)).toBe('Gamma plant');
    expect(mark.textContent).toContain('no units');
  });

  it('holds a value beyond the caller’s maximum inside the track', () => {
    const over: HorizontalBarDatum = {
      id: 'mark-over',
      label: 'Delta plant',
      value: MAX * 3,
      valueLabel: 'three times the axis',
      evidenceRef: 'evidence-delta',
    };

    renderChart(<HorizontalBarChart bars={[over, ALPHA]} max={MAX} />);

    expect(barWidthOf(screen.getByRole('button', { name: /Delta plant/ }))).toBeCloseTo(
      barWidthOf(screen.getByRole('button', { name: ALPHA_NAME })),
      6,
    );
  });

  it('speaks a datum’s simulation label instead of spelling one of its own', () => {
    const marked: HorizontalBarDatum = { ...ALPHA, simLabel: 'Simulated data' };

    renderChart(<HorizontalBarChart bars={[marked]} max={MAX} />);

    expect(
      screen.getByRole('button', { name: `${ALPHA_NAME} (Simulated data)` }),
    ).toBeInTheDocument();
  });

  it('shortens a long category label where it is drawn and keeps it whole where it is spoken', () => {
    const long: HorizontalBarDatum = {
      id: 'mark-long',
      label: LONG_LABEL,
      value: MAX,
      valueLabel: 'forty units',
      evidenceRef: 'evidence-long',
    };

    renderChart(<HorizontalBarChart bars={[long]} max={MAX} />);

    const mark = screen.getByRole('button', { name: `${LONG_LABEL}: forty units` });
    const drawn = drawnLabelOf(mark);

    expect(drawn).not.toBe(LONG_LABEL);
    expect(drawn.endsWith('…')).toBe(true);
    expect(LONG_LABEL.startsWith(drawn.slice(0, -1))).toBe(true);
  });

  it('marks the selected datum by something other than colour alone', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <HorizontalBarChart bars={BARS} max={MAX} />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('button', { name: ALPHA_NAME })).not.toHaveAttribute('aria-current');
    expect(barOf(screen.getByRole('button', { name: ALPHA_NAME })).getAttribute('class')).not.toContain(
      'stroke-text-primary',
    );

    rerender(
      <QueryClientProvider client={client}>
        <HorizontalBarChart bars={BARS} max={MAX} activeId="mark-alpha" />
      </QueryClientProvider>,
    );

    const selected = screen.getByRole('button', { name: ALPHA_NAME });
    expect(selected).toHaveAttribute('aria-current', 'true');
    expect(barOf(selected).getAttribute('class')).toContain('stroke-text-primary');
    expect(screen.getByRole('button', { name: BETA_NAME })).not.toHaveAttribute('aria-current');
  });

  it('renders nothing at all when it has no bars', () => {
    const { container } = renderChart(<HorizontalBarChart bars={[]} max={MAX} />);

    expect(container).toBeEmptyDOMElement();
  });

  it.each(THEMES)('draws every mark under the %s theme', (theme) => {
    document.documentElement.setAttribute('data-theme', theme);

    const { container } = renderBars();

    expect(screen.getAllByRole('button')).toHaveLength(BARS.length);
    expect(barOf(screen.getByRole('button', { name: ALPHA_NAME })).getAttribute('class')).toContain(
      'fill-accent',
    );
    expect(container.querySelectorAll('rect').length).toBe(BARS.length * 2);
  });
});
