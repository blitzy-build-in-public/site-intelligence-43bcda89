/**
 * Component suite for `radar-chart.tsx`, the competitive atlas's five-axis resilience radar.
 *
 * Every case asserts a contract the drawing is relied on for rather than its markup: one axis drawn
 * and named per entry in `axes`; exactly one polygon per series, with one vertex per axis and no two
 * series sharing a shape; each series painted from its provenance role token; every competitor's name
 * followed by the imported competitor tag and its market-intelligence label; the client's series
 * followed by the imported self-assessment tag and by no other label; no element carrying a combined
 * reading; vertex marks keyboard operable with a name that states axis, series and score, opening the
 * evidence the caller resolved and reporting the series it picked; plain marks when nothing can be
 * opened or reported (rule P-8); the ordinal a colour is selected by; and both themes.
 *
 * The service is mocked at `service-provider.tsx`, the one boundary `./evidence-drawer.tsx` reads
 * through (rule P-2), so no seed module, adapter or hash chain is involved and the suite observes
 * exactly the reference the drawer asks for. Both fixed companion strings are imported rather than
 * retyped, so a reworded tag cannot leave this suite asserting wording the interface no longer
 * shows (rule P-1). Series names, axis names, scores and reference identifiers are this suite's own
 * plain placeholders: the seed holds the real records, and a component test that borrowed them would
 * assert the payload instead of the drawing (rule P-6).
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * clock or touches the network.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CLIENT_SELF_ASSESSMENT_LABEL, COMPETITOR_NAME_TAG, SIM_LABELS } from '../types';
import type { AtlasSeries, Evidence, RadarAxis, Result } from '../types';
import { EVIDENCE_DRAWER_TEXT } from './evidence-drawer';
import { competitorToneOf, RadarChart, RADAR_CHART_TEXT } from './radar-chart';
import type { RadarChartProps } from './radar-chart';

/**
 * The port member the drawer reads through, replaced before the chart's module graph is imported so
 * the real provider — and with it the in-browser adapter and its seeded records — is never reached in
 * a component test (rule P-2).
 */
const getEvidence = vi.hoisted(() => vi.fn());

vi.mock('../services/service-provider', () => ({
  useService: () => ({ getEvidence }),
}));

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/**
 * The market-intelligence label, read from the fixed vocabulary by position rather than retyped: the
 * six fixed section 5.3 strings are ordered, and the sixth is the one a competitor's figures carry
 * (rule P-1). Held here so a case can assert the label the drawing prints is that exact string.
 */
const MARKET_INTELLIGENCE_LABEL = SIM_LABELS[5];

/** The label a first-party figure carries, which the client's series must not print on its own. */
const SIMULATED_DATA_LABEL = SIM_LABELS[0];

/** The five axes, named as plain words so an axis assertion cannot match a series' own label. */
const AXES: readonly RadarAxis[] = [
  { id: 'axis-alpha', label: 'Axis alpha' },
  { id: 'axis-beta', label: 'Axis beta' },
  { id: 'axis-gamma', label: 'Axis gamma' },
  { id: 'axis-delta', label: 'Axis delta' },
  { id: 'axis-epsilon', label: 'Axis epsilon' },
];

/**
 * The client's own series: a first-party self-assessment, so it carries the companion tag from
 * `src/types` rather than one of the fixed labels.
 */
const CLIENT_SERIES: AtlasSeries = {
  id: 'series-client',
  label: 'Client network',
  provenance: 'first_party',
  simLabel: CLIENT_SELF_ASSESSMENT_LABEL,
  values: [68, 54, 61, 87, 70],
};

/** A competitor's series: market intelligence, so its figures must carry the fixed label. */
const COMPETITOR_ALPHA: AtlasSeries = {
  id: 'series-competitor-alpha',
  label: 'Competitor alpha',
  provenance: 'market_intelligence',
  simLabel: MARKET_INTELLIGENCE_LABEL,
  values: [74, 63, 79, 58, 66],
};

/** The second competitor, whose scores differ on every axis so no two outlines can coincide. */
const COMPETITOR_BETA: AtlasSeries = {
  id: 'series-competitor-beta',
  label: 'Competitor beta',
  provenance: 'market_intelligence',
  simLabel: MARKET_INTELLIGENCE_LABEL,
  values: [59, 81, 52, 64, 75],
};

/** The third competitor: the last piece of the market-intelligence side of the drawing. */
const COMPETITOR_GAMMA: AtlasSeries = {
  id: 'series-competitor-gamma',
  label: 'Competitor gamma',
  provenance: 'market_intelligence',
  simLabel: MARKET_INTELLIGENCE_LABEL,
  values: [83, 57, 70, 72, 61],
};

/** The series the chart draws, in the order the atlas record lists them. */
const SERIES: readonly AtlasSeries[] = [
  CLIENT_SERIES,
  COMPETITOR_ALPHA,
  COMPETITOR_BETA,
  COMPETITOR_GAMMA,
];

/** The competitors among them, in drawing order. */
const COMPETITORS: readonly AtlasSeries[] = [COMPETITOR_ALPHA, COMPETITOR_BETA, COMPETITOR_GAMMA];

/**
 * The area utility each series must be painted with, in drawing order: the accent role for the
 * client's first-party series and the three competitor roles by ordinal, which is the same selection
 * `./legend.tsx` paints its swatches from.
 */
const EXPECTED_AREA_CLASSES = [
  'fill-accent',
  'fill-competitor-1',
  'fill-competitor-2',
  'fill-competitor-3',
] as const;

/** The evidence reference the caller resolves for every vertex in this suite. */
const EVIDENCE_REF = 'evidence-under-test';

/** The record the mocked read returns: enough of one to fill the drawer's sections. */
const EVIDENCE: Evidence = {
  value: 'A stated score',
  provenance: 'market_intelligence',
  label: MARKET_INTELLIGENCE_LABEL,
  formula: 'Stated by the market-intelligence pack.',
  inputs: ['input-alpha'],
  upstream: [],
  downstream: [],
  confidence: { level: 'medium', reason: 'Stated by the pack as supplied.' },
  missingInputs: [],
  documents: [],
};

/** The result the mocked read resolves with: one record and an empty freshness array. */
const EVIDENCE_RESULT: Result<Evidence> = {
  data: EVIDENCE,
  meta: { freshness: [], simulated: true, traceId: 'trace-under-test' },
};

/** One point of a rendered polygon, read back from its `points` attribute. */
interface PolygonPoint {
  readonly x: number;
  readonly y: number;
}

/** Renders the chart inside a query cache, which the evidence drawer's read needs. */
function renderChart(props: Partial<RadarChartProps> = {}): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const element: ReactElement = (
    <QueryClientProvider client={client}>
      <RadarChart axes={AXES} series={SERIES} {...props} />
    </QueryClientProvider>
  );

  render(element);
}

/** The drawing itself, or a failure naming what is missing rather than a silent null. */
function svgElement(): SVGSVGElement {
  const element = document.querySelector('svg');

  if (!(element instanceof SVGSVGElement)) {
    throw new Error('the radar rendered no svg');
  }

  return element;
}

/** Every rendered line of text in the drawing, trimmed, in document order. */
function textContents(scope: Element = svgElement()): readonly string[] {
  return Array.from(scope.querySelectorAll('text'), (node) => (node.textContent ?? '').trim());
}

/** Every polygon the drawing rendered, in document order. */
function polygons(): readonly SVGPolygonElement[] {
  return Array.from(svgElement().querySelectorAll('polygon'));
}

/** The vertices of one rendered polygon, read from its `points` attribute. */
function pointsOf(polygon: SVGPolygonElement): readonly PolygonPoint[] {
  const points = (polygon.getAttribute('points') ?? '').trim();

  return points
    .split(/\s+/)
    .filter((pair) => pair !== '')
    .map((pair) => {
      const [x, y] = pair.split(',');

      return { x: Number(x), y: Number(y) };
    });
}

/**
 * The group that carries one series' name and companion label.
 *
 * The drawing prints a series' two lines as two `<text>` elements inside one group, so finding the
 * group by its name line is what lets a case assert the pairing rather than the presence of each
 * string somewhere in the drawing.
 */
function labelGroupFor(name: string): Element {
  const group = Array.from(svgElement().querySelectorAll('g')).find((candidate) =>
    Array.from(candidate.querySelectorAll('text')).some(
      (text) => (text.textContent ?? '').trim() === name,
    ),
  );

  if (group === undefined) {
    throw new Error(`no label group carries the name ${name}`);
  }

  return group;
}

/** The accessible name one vertex mark must carry: the axis, the series and the score. */
function vertexName(series: AtlasSeries, axisIndex: number): string {
  const axis = AXES[axisIndex];
  const value = series.values[axisIndex];

  if (axis === undefined || value === undefined) {
    throw new Error(`no axis and score are defined at index ${axisIndex}`);
  }

  return `${axis.label}, ${series.label}: ${value}`;
}

beforeEach(() => {
  getEvidence.mockResolvedValue(EVIDENCE_RESULT);
});

/** Leaves `<html>` on the default theme for whichever suite runs next. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('RadarChart', () => {
  it('names the drawing for a screen reader without repeating the frame title', () => {
    renderChart();

    const drawing = screen.getByRole('group', { name: RADAR_CHART_TEXT.groupLabel });

    expect(drawing).toBe(svgElement());
  });

  it('draws one spoke and one outer label per axis', () => {
    renderChart();

    const texts = textContents();

    expect(AXES).toHaveLength(texts.length - SERIES.length * 2);
    for (const axis of AXES) {
      expect(texts.filter((text) => text === axis.label)).toHaveLength(1);
    }
    // One spoke per axis, inside the decorative group that also carries the rings.
    expect(svgElement().querySelectorAll('line')).toHaveLength(AXES.length);
  });

  it('draws exactly one polygon per series, with one vertex per axis and no shared shape', () => {
    renderChart();

    const shapes = polygons();

    expect(shapes).toHaveLength(SERIES.length);

    for (const polygon of shapes) {
      expect(pointsOf(polygon)).toHaveLength(AXES.length);
    }

    // No two series share an outline: a polygon averaging two series' readings would coincide with
    // one of them, and a polygon built from two series would repeat one of them.
    const serialisedShapes = shapes.map((polygon) => polygon.getAttribute('points'));
    expect(new Set(serialisedShapes).size).toBe(SERIES.length);

    // Each outline follows its own series' readings: on the first axis the highest score sits
    // nearest the outer ring, which on this grid is the smallest vertical coordinate.
    const verticals = shapes.map((polygon) => pointsOf(polygon)[0]?.y ?? Number.NaN);
    const topScoring = SERIES.reduce((best, candidate) =>
      (candidate.values[0] ?? 0) > (best.values[0] ?? 0) ? candidate : best,
    );
    const topScoringIndex = SERIES.indexOf(topScoring);
    const topScoringVertical = verticals[topScoringIndex] ?? Number.NaN;

    verticals.forEach((vertical, index) => {
      if (index === topScoringIndex) {
        return;
      }

      expect(vertical).toBeGreaterThan(topScoringVertical);
    });
  });

  it('paints each series from its provenance role token, the client last in the accent role', () => {
    renderChart();

    const shapes = polygons();

    expect(shapes).toHaveLength(EXPECTED_AREA_CLASSES.length);

    shapes.forEach((polygon, index) => {
      const expected = EXPECTED_AREA_CLASSES[index];

      if (expected === undefined) {
        throw new Error(`no expected area class is defined at index ${index}`);
      }

      expect(polygon.getAttribute('class')).toContain(expected);
    });
  });

  it('tags every competitor name and follows it with the market-intelligence label', () => {
    renderChart();

    const texts = textContents();

    for (const competitor of COMPETITORS) {
      const group = labelGroupFor(`${competitor.label} ${COMPETITOR_NAME_TAG}`);

      expect(textContents(group)).toEqual([
        `${competitor.label} ${COMPETITOR_NAME_TAG}`,
        MARKET_INTELLIGENCE_LABEL,
      ]);
    }

    // The label the drawing prints is the fixed section 5.3 string, once per competitor.
    expect(texts.filter((text) => text === MARKET_INTELLIGENCE_LABEL)).toHaveLength(
      COMPETITORS.length,
    );
  });

  it('follows the client series with its own self-assessment tag and no other label', () => {
    renderChart();

    const group = labelGroupFor(CLIENT_SERIES.label);

    expect(textContents(group)).toEqual([CLIENT_SERIES.label, CLIENT_SELF_ASSESSMENT_LABEL]);
    // No separate first-party label: the series carries its companion tag and nothing else.
    expect(textContents(group)).not.toContain(SIMULATED_DATA_LABEL);
    expect(group.textContent).not.toContain(COMPETITOR_NAME_TAG);
  });

  it('states no combined score and no element that would read as one', () => {
    renderChart();

    const texts = textContents();

    // The series lines and the axis names are all the drawing says; a combined reading would need a
    // line of its own, and a bare number on one would be exactly that.
    for (const text of texts) {
      expect(text).not.toMatch(/^-?\d+([.,]\d+)?$/);
    }

    expect(texts.join(' ')).not.toMatch(/average|overall|combined/i);
    // One outline per series and no fifth shape standing in for a total.
    expect(polygons()).toHaveLength(SERIES.length);
  });

  it('makes every vertex a keyboard-operable control named by its axis, series and score', async () => {
    const user = userEvent.setup();
    renderChart({ evidenceRefFor: () => EVIDENCE_REF });

    const marks = screen.getAllByRole('button');

    expect(marks).toHaveLength(SERIES.length * AXES.length);

    const target = screen.getByRole('button', { name: vertexName(COMPETITOR_ALPHA, 2) });

    expect(target).toHaveAttribute('tabindex', '0');
    expect(target).toHaveAttribute('aria-haspopup', 'dialog');

    target.focus();
    expect(target).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(
      await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title }),
    ).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledWith(EVIDENCE_REF);
  });

  it('opens the resolved evidence by pointer and closes it again', async () => {
    const user = userEvent.setup();
    renderChart({ evidenceRefFor: () => EVIDENCE_REF });

    await user.click(screen.getByRole('button', { name: vertexName(CLIENT_SERIES, 0) }));

    expect(
      await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: EVIDENCE_DRAWER_TEXT.closeLabel }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('leaves every vertex a plain mark when nothing can be opened or reported', () => {
    renderChart();

    // No control at all, so no mark can take focus and do nothing (rule P-8).
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    // Every reading is still drawn: the rings, and one dot per series and axis.
    expect(svgElement().querySelectorAll('circle').length).toBeGreaterThanOrEqual(
      SERIES.length * AXES.length,
    );
  });

  it('reports the series a reader picked and opens no evidence when the caller resolves none', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    renderChart({ onActivate });

    const mark = screen.getByRole('button', { name: vertexName(CLIENT_SERIES, 0) });

    expect(mark).not.toHaveAttribute('aria-haspopup');

    await user.click(mark);

    expect(onActivate).toHaveBeenCalledWith(CLIENT_SERIES.id);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getEvidence).not.toHaveBeenCalled();
  });

  it('resolves the competitor tone by ordinal and gives the client series none', () => {
    expect(competitorToneOf(SERIES, COMPETITOR_ALPHA.id)).toBe(1);
    expect(competitorToneOf(SERIES, COMPETITOR_BETA.id)).toBe(2);
    expect(competitorToneOf(SERIES, COMPETITOR_GAMMA.id)).toBe(3);
    expect(competitorToneOf(SERIES, CLIENT_SERIES.id)).toBeNull();
  });

  it.each(THEMES)('draws the same radar under the %s theme', (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    renderChart();

    const texts = textContents();

    expect(screen.getByRole('group', { name: RADAR_CHART_TEXT.groupLabel })).toBe(svgElement());
    expect(polygons()).toHaveLength(SERIES.length);
    for (const axis of AXES) {
      expect(texts).toContain(axis.label);
    }
  });

  it('draws the scale alone, and no coordinate the browser cannot use, when no axis is stated', () => {
    renderChart({ axes: [], series: [] });

    expect(polygons()).toHaveLength(0);
    expect(svgElement().querySelectorAll('line')).toHaveLength(0);
    // The rings remain, so the drawing is still a scale rather than an empty element.
    expect(svgElement().querySelectorAll('circle').length).toBeGreaterThan(0);
    expect(svgElement().innerHTML).not.toContain('NaN');
  });

  it('skips a score the payload does not state rather than drawing a zero for it', () => {
    const partial: AtlasSeries = {
      id: 'series-partial',
      label: 'Partly stated network',
      provenance: 'market_intelligence',
      simLabel: MARKET_INTELLIGENCE_LABEL,
      values: [64, 58],
    };

    renderChart({ series: [partial], evidenceRefFor: () => EVIDENCE_REF });

    const [polygon] = polygons();

    if (polygon === undefined) {
      throw new Error('the chart drew no polygon for the partly stated series');
    }

    // Two stated scores, two vertices — and no third point completing the shape with a zero.
    expect(pointsOf(polygon)).toHaveLength(partial.values.length);
    expect(screen.getAllByRole('button')).toHaveLength(partial.values.length);
  });
});
