/**
 * Component suite for `horizontal-bar-chart.tsx`, the SVG surface SCR-01's revenue-at-risk bars and
 * risk-by-plant rows and SCR-13's chokepoint comparison are drawn with.
 *
 * Each case asserts a clause of the surface's contract rather than its markup: the accessible name
 * of the graphic with and without the caller's axis label; one operable mark per datum and no
 * figure element, no table element and no toggle of its own, because `chart-frame.tsx` owns those;
 * a name and a drawn value that state the category and carry the caller's pre-formatted string
 * untouched, the value drawn in the mono face with tabular numerals (AAP §0.5.3);
 * keyboard reachability by `Tab` and activation by `Enter` and by `Space` on any mark; a
 * pointer activation, and the row-wide pointer target that lets a click land anywhere in a mark's
 * row rather than only on the bar it paints; the evidence drawer opening on the datum's own
 * reference — outside the graphic, where HTML belongs — where this surface owns the activation, and
 * the `onActivate` report that replaces it where the calling screen does; a zero value drawn at zero
 * length with its mark still focusable and its labels intact; a value beyond the caller's axis held
 * inside the track; a value axis drawn beneath the bars with the caller's own formatted labels, its
 * guides at each tick's share of the same track, and the drawing grown to hold them, or no axis at
 * all where the caller supplies none; the title and description the graphic composes from its props;
 * the bar and its focus ring
 * rounded from the control radius token rather than a literal radius (AAP §0.5.3); the focus ring
 * drawn on the mark that holds keyboard focus and hidden on the rest (rule B-3); the read-out a mark
 * answers with on focus and on pointer entry, naming the category and the caller's own formatted
 * value, with the row's ring revealed while it is active; the one tone table
 * in which every chart surface resolves a role token and its four utilities, drawn one datum per
 * tone with no literal colour anywhere in the graphic (AAP §0.5.3); the mark's simulation label
 * spoken rather than spelled by the chart (rule P-1); a long category label shortened in the drawing
 * while its accessible name keeps it whole; the selected datum marked by something other than colour
 * alone; and an empty set drawing nothing at all.
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
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Evidence, Meta, Result } from '../types';
import { EVIDENCE_DRAWER_TEXT } from './evidence-drawer';
import {
  CHART_TONE_CLASSES,
  CONTROL_RADIUS_CLASSES,
  HORIZONTAL_BAR_CHART_TEXT,
  HorizontalBarChart,
} from './horizontal-bar-chart';
import type {
  ChartTone,
  ChartToneClasses,
  HorizontalBarAxisTick,
  HorizontalBarChartProps,
  HorizontalBarDatum,
} from './horizontal-bar-chart';

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

/** The bar that fills the track on this suite's axis. */
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

/** The third bar: a quarter of {@link ALPHA}'s value, so a third mark cannot be an accident of pairing. */
const GAMMA: HorizontalBarDatum = {
  id: 'mark-gamma',
  label: 'Gamma plant',
  value: 10,
  valueLabel: 'ten units',
  evidenceRef: 'evidence-gamma',
};

/**
 * Three bars on one axis of forty: the first fills the track, the second draws at half of it and the
 * third at a quarter, so the proportionality of the drawing is observable without the component
 * exposing its own geometry.
 */
const BARS: readonly HorizontalBarDatum[] = [ALPHA, BETA, GAMMA];

/** The axis maximum every {@link BARS} entry is drawn against. */
const MAX = 40;

/**
 * The value axis the tick cases draw, positioned on the same axis as {@link BARS}.
 *
 * Every label is a plain word rather than a formatted amount: this surface formats nothing, so the
 * strings below are the caller's own and a chart that formatted, rounded or re-labelled one fails the
 * cases that read them back (rule P-6).
 */
const AXIS_TICKS = [
  { value: 0, label: 'none' },
  { value: MAX / 2, label: 'half' },
  { value: MAX, label: 'the whole axis' },
] as const satisfies readonly HorizontalBarAxisTick[];

/** The accessible names {@link BARS} must carry: the category, then the value the caller formatted. */
const ALPHA_NAME = 'Alpha plant: forty units';
const BETA_NAME = 'Beta plant: twenty units';

/** The two themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/**
 * Every tone `ChartTone` declares, as a value list a case can iterate: the six status meanings, the
 * accent role and the three competitor series.
 *
 * The list has to be complete in both directions, and two checks hold it there. The table itself is
 * `satisfies Record<ChartTone, ChartToneClasses>`, so a tone added to the union cannot exist without
 * an entry; and the case below compares this list with the table's own keys, so an entry with no
 * line here fails rather than passing unnoticed. The annotation catches the third case, a name in
 * this list that is no longer a tone.
 */
const TONES = [
  'pass',
  'fail',
  'warning',
  'review',
  'empty',
  'simulated',
  'accent',
  'competitor-1',
  'competitor-2',
  'competitor-3',
] as const satisfies readonly ChartTone[];

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
 * The bar a mark draws, as opposed to the two rects that carry its interaction: the focus ring
 * carries the focus-ring stroke and the row-wide pointer target paints transparent, so the bar is
 * every other rect.
 */
function barOf(mark: HTMLElement): Element {
  const bar = mark.querySelector('rect:not(.stroke-focus-ring):not([fill="transparent"])');

  if (bar === null) {
    throw new Error('the mark drew no bar');
  }

  return bar;
}

/** The length of a mark's bar in the surface's own user units. */
function barWidthOf(mark: HTMLElement): number {
  return Number(barOf(mark).getAttribute('width'));
}

/**
 * The focus ring a mark draws: the one rect in it carrying the focus-ring stroke. It is found here
 * so a case observes the ring the component actually drew rather than a class name retyped.
 */
function focusRingOf(mark: HTMLElement): Element {
  const ring = mark.querySelector('.stroke-focus-ring');

  if (ring === null) {
    throw new Error('the mark drew no focus ring');
  }

  return ring;
}

/**
 * The mark's row-wide pointer target: the one rect in it that carries no class, because its paint is
 * the `fill` attribute rather than a role utility. It is found here so a case asserts that paint
 * instead of retyping it.
 */
function pointerTargetOf(mark: HTMLElement): Element {
  const target = mark.querySelector('rect:not([class])');

  if (target === null) {
    throw new Error('the mark drew no pointer target');
  }

  return target;
}

/** The text the mark draws for its category, as opposed to the text it speaks. */
function drawnLabelOf(mark: HTMLElement): string {
  return mark.querySelector('text')?.textContent ?? '';
}

/**
 * The value `<text>` a mark draws: its second text element, the first being the category.
 *
 * Kept apart from {@link drawnValueOf} so a case can read the node a reader's value is painted with
 * as well as its characters: the face and the numeral width are AAP §0.5.3's requirement for every
 * amount, identifier and timestamp, and both are classes on this element.
 */
function drawnValueTextOf(mark: HTMLElement): Element {
  const value = Array.from(mark.querySelectorAll('text')).at(1);

  if (value === undefined) {
    throw new Error('the mark drew no value text');
  }

  return value;
}

/**
 * The value text the mark draws, read back verbatim so a chart that re-formatted, rounded or
 * re-labelled the caller's string fails here — formatting has one owner, and it is not this surface
 * (rule P-6).
 */
function drawnValueOf(mark: HTMLElement): string {
  return drawnValueTextOf(mark).textContent ?? '';
}

/** The graphic a render drew, once a case has established that it drew one. */
function surfaceOf(container: HTMLElement): Element {
  const svg = container.querySelector('svg');

  if (svg === null) {
    throw new Error('the chart drew no graphic');
  }

  return svg;
}

/**
 * The value axis the surface drew: the group holding the guides and their labels.
 *
 * It is the graphic's only `aria-hidden` group, which is the mark of a guide rather than of a figure:
 * the axis is hidden from assistive technology because each bar already announces its own value.
 */
function axisOf(svg: Element): Element | null {
  return svg.querySelector('g[aria-hidden="true"]');
}

/**
 * The lowest edge of the drawing's rows: where the last row's own pointer target ends.
 *
 * It is read from the marks the surface drew rather than from a constant, so a case can tell where the
 * rows stop and the axis band begins without knowing the surface's row height.
 */
function plotBottomOf(): number {
  return Math.max(
    ...screen.getAllByRole('button').map((mark) => {
      const row = pointerTargetOf(mark);

      return Number(row.getAttribute('y')) + Number(row.getAttribute('height'));
    }),
  );
}

/** The drawing's `viewBox`, as the four numbers it states. */
function viewBoxOf(svg: Element): readonly number[] {
  return (svg.getAttribute('viewBox') ?? '').split(' ').map(Number);
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
    const svg = container.querySelector('svg');

    if (svg === null) {
      throw new Error('the chart drew no graphic');
    }

    expect(svg.querySelectorAll('[role="button"]')).toHaveLength(BARS.length);
    expect(screen.getAllByRole('button')).toHaveLength(BARS.length);
    expect(container.querySelector('figure')).toBeNull();
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('figcaption')).toBeNull();
  });

  it('names each mark with its category and its pre-formatted value, drawn verbatim', () => {
    renderBars();

    const marks = screen.getAllByRole('button');

    expect(marks).toHaveLength(BARS.length);

    BARS.forEach((datum, index) => {
      const mark = marks[index];

      if (mark === undefined) {
        throw new Error(`no mark drawn for ${datum.id}`);
      }

      const name = mark.getAttribute('aria-label') ?? '';

      expect(name).toContain(datum.label);
      expect(name).toContain(datum.valueLabel);
      expect(drawnLabelOf(mark)).toBe(datum.label);
      expect(drawnValueOf(mark)).toBe(datum.valueLabel);
    });
  });

  it('draws every value label in the mono face with tabular numerals', () => {
    renderBars();

    for (const mark of screen.getAllByRole('button')) {
      const value = drawnValueTextOf(mark);

      /* AAP §0.5.3 sets every amount in Geist Mono with tabular numerals, so the labels of one chart
         share one numeral width instead of the proportional face's. */
      expect(value.getAttribute('class')).toContain('font-mono');
      expect(value.getAttribute('class')).toContain('tabular-nums');
    }
  });

  it('draws each bar in proportion to its value against the caller’s maximum', () => {
    renderBars();

    const full = barWidthOf(screen.getByRole('button', { name: ALPHA_NAME }));
    const half = barWidthOf(screen.getByRole('button', { name: BETA_NAME }));

    expect(full).toBeGreaterThan(0);
    expect(half).toBeCloseTo(full / 2, 6);
  });

  it('draws the caller’s value axis beneath the bars, inside the drawing’s own box', () => {
    const { container } = renderBars({ axisTicks: AXIS_TICKS });
    const svg = surfaceOf(container);
    const axis = axisOf(svg);

    if (axis === null) {
      throw new Error('the chart drew no axis');
    }

    /* Every label is the caller's own string, painted in the caller's own order. */
    expect(
      Array.from(axis.querySelectorAll('text')).map((node) => node.textContent ?? ''),
    ).toEqual(AXIS_TICKS.map((tick) => tick.label));

    /* Each label sits below the last row, in the band the drawing grew to hold it. */
    const plotBottom = plotBottomOf();

    for (const label of Array.from(axis.querySelectorAll('text'))) {
      expect(Number(label.getAttribute('y'))).toBeGreaterThan(plotBottom);
    }

    /* And the whole drawing stays inside its own view box, the axis band included: the labels are not
       clipped by the box the surface was drawn into. */
    const box = viewBoxOf(svg);
    const width = box[2] ?? 0;
    const height = box[3] ?? 0;

    expect(height).toBeGreaterThan(plotBottom);

    for (const element of Array.from(svg.querySelectorAll('*'))) {
      for (const name of ['x', 'y', 'x1', 'x2', 'y1', 'y2'] as const) {
        const drawn = element.getAttribute(name);

        if (drawn === null) {
          continue;
        }

        const coordinate = Number(drawn);

        expect(Number.isFinite(coordinate)).toBe(true);
        expect(coordinate).toBeGreaterThanOrEqual(0);
        expect(coordinate).toBeLessThanOrEqual(
          name.startsWith('y') ? height : width,
        );
      }

      for (const name of ['width', 'height'] as const) {
        const extent = element.getAttribute(name);

        if (extent === null) {
          continue;
        }

        expect(Number(extent)).toBeGreaterThanOrEqual(0);
        expect(Number(extent)).toBeLessThanOrEqual(name === 'width' ? width : height);
      }
    }
  });

  it('places a guide at the value each tick names, on the axis the bars are drawn against', () => {
    const { container } = renderBars({ axisTicks: AXIS_TICKS });
    const axis = axisOf(surfaceOf(container));

    if (axis === null) {
      throw new Error('the chart drew no axis');
    }

    /* The track as the bars draw it: the bar filling the axis gives its own start and its own width. */
    const fullBar = barOf(screen.getByRole('button', { name: ALPHA_NAME }));
    const trackStart = Number(fullBar.getAttribute('x'));
    const trackWidth = Number(fullBar.getAttribute('width'));

    /* The zero tick is the baseline the bars already grow from, so only the guides above zero are new
       marks — and each one sits at its own value's share of that same track. */
    expect(
      Array.from(axis.querySelectorAll('line')).map((line) => Number(line.getAttribute('x1'))),
    ).toEqual([trackStart + trackWidth / 2, trackStart + trackWidth]);
  });

  it('draws no axis, and claims none, when the caller supplies no ticks', () => {
    const { container } = renderBars();
    const svg = surfaceOf(container);
    const height = viewBoxOf(svg)[3] ?? 0;

    expect(axisOf(svg)).toBeNull();
    expect(height).toBe(plotBottomOf());

    /* The description states what the drawing encodes and promises no axis it was not given. */
    expect(svg.querySelector('desc')?.textContent).toBe(
      HORIZONTAL_BAR_CHART_TEXT.surfaceDescription,
    );
  });

  it('describes the drawing it makes, naming the axis it was given', () => {
    const xAxisLabel = 'Revenue at risk per exception';
    const svg = surfaceOf(renderBars({ xAxisLabel, axisTicks: AXIS_TICKS }).container);
    const description = svg.querySelector('desc')?.textContent ?? '';

    expect(svg.querySelector('title')?.textContent).toBe(xAxisLabel);
    expect(description).toContain(HORIZONTAL_BAR_CHART_TEXT.surfaceDescription);
    expect(description).toContain(HORIZONTAL_BAR_CHART_TEXT.tickDescription);
  });

  it('rounds the bar and its focus ring from the control radius token, not a literal radius', () => {
    renderBars();

    for (const mark of screen.getAllByRole('button')) {
      for (const rect of [barOf(mark), focusRingOf(mark)]) {
        expect(rect.getAttribute('class')).toContain(CONTROL_RADIUS_CLASSES);
        expect(rect.hasAttribute('rx')).toBe(false);
      }
    }
  });

  it('reaches the first mark with Tab and reports the datum with Enter where the caller owns the activation', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();

    renderBars({ onActivate });

    const first = screen.getByRole('button', { name: ALPHA_NAME });
    await user.tab();

    expect(document.activeElement).toBe(first);
    expect(getEvidence).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');

    /* The handler owns the gesture, so the mark reports its datum and opens nothing: a handler that
       leaves the screen would take a drawer opened here with it, and the mark therefore declares no
       dialog either. */
    expect(onActivate).toHaveBeenCalledWith('mark-alpha');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(first).not.toHaveAttribute('aria-haspopup');
    expect(getEvidence).not.toHaveBeenCalled();
  });

  it('reaches a second mark with Tab and opens its evidence with Space as well as with Enter', async () => {
    const user = userEvent.setup();

    renderBars();

    const second = screen.getByRole('button', { name: BETA_NAME });

    await user.tab();
    await user.tab();

    expect(document.activeElement).toBe(second);

    await user.keyboard(' ');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledWith('evidence-beta');
  });

  it('draws a focus indicator on the mark that holds keyboard focus, and only on that one', async () => {
    const user = userEvent.setup();

    renderBars();

    const first = screen.getByRole('button', { name: ALPHA_NAME });
    const second = screen.getByRole('button', { name: BETA_NAME });

    await user.tab();

    expect(document.activeElement).toBe(first);
    // An SVG group is given no focus ring by the browser, so the mark draws its own in the
    // focus-ring role and carries the outline utilities for the engines that paint the group.
    expect(first.getAttribute('class')).toContain('focus-visible:outline-focus-ring');
    expect(focusRingOf(first).getAttribute('class')).toContain('group-focus-visible:opacity-100');
    // The rest keep their ring hidden until they are focused themselves, so the indication follows
    // focus instead of being painted on every bar (rule B-3).
    expect(focusRingOf(second).getAttribute('class')).toContain('opacity-0');

    await user.tab();

    expect(document.activeElement).toBe(second);
    expect(second.getAttribute('class')).toContain('focus-visible:outline-focus-ring');
  });

  it('reports a datum on a pointer activation where the caller owns the activation, and opens no drawer', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();

    renderBars({ onActivate });
    await user.click(screen.getByRole('button', { name: BETA_NAME }));

    expect(onActivate).toHaveBeenCalledWith('mark-beta');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getEvidence).not.toHaveBeenCalled();
  });

  it('opens the evidence whether or not the caller asked to hear about the activation', async () => {
    const user = userEvent.setup();

    renderBars();
    await user.click(screen.getByRole('button', { name: ALPHA_NAME }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(EVIDENCE_DRAWER_TEXT.title);
    expect(getEvidence).toHaveBeenCalledTimes(1);
    expect(getEvidence).toHaveBeenCalledWith('evidence-alpha');
  });

  it('draws the drawer outside the graphic, where HTML belongs', async () => {
    const user = userEvent.setup();
    const { container } = renderBars();

    await user.click(screen.getByRole('button', { name: ALPHA_NAME }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.closest('svg')).toBeNull();
    expect(container.querySelector('svg')?.contains(dialog)).toBe(false);
  });

  it('gives every mark a row-wide pointer target where its bar paints nothing', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();

    renderBars({ onActivate });

    for (const mark of screen.getAllByRole('button')) {
      const target = pointerTargetOf(mark);
      const row = focusRingOf(mark);

      // Painted `transparent`, never `none`: an SVG hit test follows the default `visiblePainted`
      // rule, under which a `none` fill is not hit at all and the row would stay inert — which is
      // exactly how a click on the row once reached the graphic instead of the mark.
      expect(target.getAttribute('fill')).toBe('transparent');
      expect(target.getAttribute('aria-hidden')).toBe('true');

      // The target is the row box the mark draws its focus ring around, not the bar it paints, so a
      // pointer lands inside the row wherever the bar happens to end.
      expect(target.getAttribute('x')).toBe(row.getAttribute('x'));
      expect(target.getAttribute('width')).toBe(row.getAttribute('width'));
      expect(target.getAttribute('height')).toBe(row.getAttribute('height'));
      expect(Number(target.getAttribute('width'))).toBeGreaterThan(barWidthOf(mark));
    }

    // A click delivered to that rect alone — the area beside the bar, where a reader aiming at a
    // full-row mark aims — reaches the mark and reports the datum it activated. The caller owns the
    // activation here, so the mark opens no drawer beside that report.
    await user.click(pointerTargetOf(screen.getByRole('button', { name: BETA_NAME })));

    expect(onActivate).toHaveBeenCalledWith('mark-beta');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('draws a zero value at zero length and keeps its mark focusable, named and labelled', async () => {
    const user = userEvent.setup();
    const zero: HorizontalBarDatum = {
      id: 'mark-zero',
      label: 'Epsilon plant',
      value: 0,
      valueLabel: 'no units',
      evidenceRef: 'evidence-epsilon',
    };

    renderChart(<HorizontalBarChart bars={[zero]} max={MAX} />);

    const mark = screen.getByRole('button', { name: 'Epsilon plant: no units' });

    expect(barWidthOf(mark)).toBe(0);
    expect(drawnLabelOf(mark)).toBe('Epsilon plant');
    expect(drawnValueOf(mark)).toBe('no units');
    expect(mark).toHaveAttribute('tabindex', '0');

    await user.tab();

    expect(document.activeElement).toBe(mark);
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
    expect(container.querySelectorAll('rect').length).toBe(BARS.length * 3);
  });

  it('resolves every tone from one table of a role token and its four utilities', () => {
    expect(Object.keys(CHART_TONE_CLASSES).sort()).toEqual([...TONES].sort());

    for (const tone of TONES) {
      const entry: ChartToneClasses = CHART_TONE_CLASSES[tone];
      const role = entry.roleVariable.slice('--color-'.length);

      // The token is the role custom property the theme layer defines, and each of the four
      // utilities is that same property's name with its own prefix — which is what makes a fill, a
      // stroke, a text and a swatch of one tone unable to name two different roles.
      expect(entry.roleVariable.startsWith('--color-')).toBe(true);
      expect(role).not.toBe('');
      expect(entry.fill).toBe(`fill-${role}`);
      expect(entry.stroke).toBe(`stroke-${role}`);
      expect(entry.text).toBe(`text-${role}`);
      expect(entry.swatch).toBe(`bg-${role}`);

      for (const utility of [entry.fill, entry.stroke, entry.text, entry.swatch]) {
        expect(utility).not.toBe('');
      }
    }
  });

  it('draws every permitted tone from its role token, with no literal colour in the drawing', () => {
    const bars: readonly HorizontalBarDatum[] = TONES.map((tone) => ({
      id: `mark-${tone}`,
      label: tone,
      value: 1,
      valueLabel: tone,
      evidenceRef: `evidence-${tone}`,
      tone,
    }));

    const { container } = renderChart(<HorizontalBarChart bars={bars} max={1} />);
    const svg = container.querySelector('svg');

    if (svg === null) {
      throw new Error('the chart drew no graphic');
    }

    expect(svg.querySelectorAll('[role="button"]')).toHaveLength(TONES.length);

    for (const tone of TONES) {
      const mark = screen.getByRole('button', { name: `${tone}: ${tone}` });

      expect(barOf(mark).getAttribute('class')).toContain(CHART_TONE_CLASSES[tone].fill);
    }

    // A role token, never a palette value: nothing in the graphic may carry a hex, functional or
    // named colour in an inline style or a paint attribute, because that would be a colour chosen by
    // this surface instead of by the active theme (AAP §0.5.3). The mark's pointer target paints the
    // `transparent` keyword, which names no hue and no palette entry, so it is not such a value.
    for (const element of Array.from(svg.querySelectorAll('*'))) {
      for (const attribute of ['style', 'fill', 'stroke', 'color']) {
        expect(element.getAttribute(attribute) ?? '').not.toMatch(/#|[a-z]+\(/i);
      }
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

describe('the read-out a mark answers with', () => {
  it('names the category and its own formatted value on keyboard focus, and clears on blur', () => {
    renderBars();

    const mark = screen.getByRole('button', { name: ALPHA_NAME });
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.focus(mark);

    /* The read-out prints the caller's own strings: no amount is formatted here (rule P-6). */
    const readout = screen.getByRole('tooltip');
    expect(within(readout).getByText(ALPHA.label)).toBeInTheDocument();
    expect(within(readout).getByText(ALPHA.valueLabel)).toBeInTheDocument();

    fireEvent.blur(mark);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('answers a pointer that enters a row as well as one that focuses it', () => {
    renderBars();

    const mark = screen.getByRole('button', { name: BETA_NAME });

    fireEvent.pointerOver(mark);

    const readout = screen.getByRole('tooltip');
    expect(within(readout).getByText(BETA.label)).toBeInTheDocument();
    expect(within(readout).getByText(BETA.valueLabel)).toBeInTheDocument();

    /* A pointer crossing to the next row reports the leaving row first, and the entering row wins. */
    const next = screen.getByRole('button', { name: 'Gamma plant: ten units' });
    fireEvent.pointerOut(mark);
    fireEvent.pointerOver(next);

    expect(within(screen.getByRole('tooltip')).getByText(GAMMA.valueLabel)).toBeInTheDocument();

    fireEvent.pointerOut(next);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('reveals the row’s ring while the mark is active, on that row alone', () => {
    renderBars();

    const first = screen.getByRole('button', { name: ALPHA_NAME });
    const second = screen.getByRole('button', { name: BETA_NAME });

    /* At rest every ring is invisible, whatever hover variants it also carries. */
    expect(utilitiesOf(focusRingOf(first))).toContain('opacity-0');

    fireEvent.pointerOver(first);

    expect(utilitiesOf(focusRingOf(first))).toContain('opacity-100');
    expect(utilitiesOf(focusRingOf(first))).not.toContain('opacity-0');
    expect(utilitiesOf(focusRingOf(second))).toContain('opacity-0');

    fireEvent.pointerOut(first);

    expect(utilitiesOf(focusRingOf(first))).toContain('opacity-0');
  });
});

