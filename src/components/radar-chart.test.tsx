/**
 * Component suite for `radar-chart.tsx`, the competitive atlas's five-axis resilience radar.
 *
 * Every case asserts a contract the drawing is relied on for rather than its markup: one axis drawn
 * and named per entry in `axes`; exactly one polygon per series, with one vertex per axis, no two
 * series sharing a shape, and every vertex placed by its own series' reading alone so an outline
 * averaged with another series is caught; each series painted from its provenance role token; every
 * competitor's name followed by the imported competitor tag and its market-intelligence label; the
 * client's series followed by the imported self-assessment tag and by no other label; one label per
 * series printed at that series' own polygon, with a swatch in the polygon's role token and a leader
 * to its own vertex; a ground-role halo painted before each label's fill, so a name that a spoke or
 * another outline crosses still reads; no element
 * carrying a combined reading; vertex marks keyboard operable with a name that states axis, series
 * and score, opening the evidence the caller's required mapper resolved and reporting the series it
 * picked; every outline transparent to pointer events and painted below every vertex mark, so no
 * polygon can take the press that belongs to a mark; a press resolved by the drawing to the vertex
 * nearest it — even where a neighbouring vertex's target is painted above that dot, and to nothing at
 * all when it lands clear of every vertex; a vertex the mapper cannot resolve left a plain
 * mark rather than a control (rule P-8); the slot a colour is selected by, which follows the
 * competitor's own identifier rather than this list's order; a polygon's fill and
 * stroke read from the one chart tone table the other surfaces resolve too; and both themes.
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
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CLIENT_SELF_ASSESSMENT_LABEL, COMPETITOR_NAME_TAG, SIM_LABELS } from '../types';
import type { AtlasSeries, Evidence, RadarAxis, Result } from '../types';
import { EVIDENCE_DRAWER_TEXT } from './evidence-drawer';
import { CHART_TONE_CLASSES } from './horizontal-bar-chart';
import { competitorToneOf, nearestRadarMark, RadarChart, RADAR_CHART_TEXT } from './radar-chart';
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
 * seven fixed section 5.3 strings are ordered as that section lists them, and the sixth is the one a
 * competitor's figures carry (rule P-1). Held here so a case can assert the label the drawing prints
 * is that exact string.
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
  competitorId: null,
  label: 'Client network',
  provenance: 'first_party',
  simLabel: CLIENT_SELF_ASSESSMENT_LABEL,
  values: [68, 54, 61, 87, 70],
};

/**
 * A competitor's series: market intelligence, so its figures must carry the fixed label.
 *
 * The three competitors' identifiers follow contracts §1's `CMP-nn` pattern, because the hue each one
 * is painted in is resolved from the identifier (`competitorSlotOf`) rather than from the order this
 * list holds them in: `CMP-01` takes the first competitor role, `CMP-02` the second and `CMP-03` the
 * third, so a case that reorders `SERIES` keeps every outline in its own colour.
 */
const COMPETITOR_ALPHA: AtlasSeries = {
  id: 'series-competitor-alpha',
  competitorId: 'CMP-01',
  label: 'Competitor alpha',
  provenance: 'market_intelligence',
  simLabel: MARKET_INTELLIGENCE_LABEL,
  values: [74, 63, 79, 58, 66],
};

/** The second competitor, whose scores differ on every axis so no two outlines can coincide. */
const COMPETITOR_BETA: AtlasSeries = {
  id: 'series-competitor-beta',
  competitorId: 'CMP-02',
  label: 'Competitor beta',
  provenance: 'market_intelligence',
  simLabel: MARKET_INTELLIGENCE_LABEL,
  values: [59, 81, 52, 64, 75],
};

/** The third competitor: the last piece of the market-intelligence side of the drawing. */
const COMPETITOR_GAMMA: AtlasSeries = {
  id: 'series-competitor-gamma',
  competitorId: 'CMP-03',
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
 * client's first-party series and the three competitor roles by the slot each competitor's own
 * identifier states, which is the same selection `./legend.tsx` paints its swatches from.
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

/**
 * The mapping a case that asserts nothing about evidence starts from: no record stands behind any
 * vertex, so every mark stays a plain dot. The prop is required, so a case always supplies one; the
 * cases that exercise the drawer name their own mapper instead.
 */
const NO_VERTEX_EVIDENCE = (): undefined => undefined;

/**
 * Renders the chart inside a query cache, which the evidence drawer's read needs.
 *
 * `evidenceRefFor` is passed unconditionally because the chart requires it: a vertex's evidence is
 * the caller's decision per mark, and a case varies it by overriding the mapper.
 */
function renderChart(props: Partial<RadarChartProps> = {}): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const element: ReactElement = (
    <QueryClientProvider client={client}>
      <RadarChart
        axes={AXES}
        series={SERIES}
        evidenceRefFor={NO_VERTEX_EVIDENCE}
        {...props}
      />
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

/**
 * The centre and the radius of one control's invisible pointer target, in the drawing's own units.
 *
 * The target is the circle a mark paints with nothing and reaches the pointer with, so reading it
 * back is how a case states a press in the drawing's coordinates rather than restating the
 * component's own geometry.
 */
function targetOf(control: Element): { readonly point: PolygonPoint; readonly radius: number } {
  const target = control.querySelector('circle[pointer-events="all"]');

  if (target === null) {
    throw new Error('the control drew no pointer target');
  }

  return {
    point: { x: Number(target.getAttribute('cx')), y: Number(target.getAttribute('cy')) },
    radius: Number(target.getAttribute('r')),
  };
}

/** How far apart two points of the drawing's grid are, in the drawing's own units. */
function distanceBetween(one: PolygonPoint, other: PolygonPoint): number {
  return Math.hypot(one.x - other.x, one.y - other.y);
}

/**
 * Lays the drawing out at its own scale, then presses it at one point of its own grid.
 *
 * jsdom computes no layout at all, so the element reports a zero-width box and the drawing declines
 * to resolve a press against it — correctly, since there is no scale to convert the pointer by. A
 * case that exercises the press states the box a browser would have measured: the view box's own
 * width and height, with the element's top-left corner at the origin, which makes one user unit one
 * CSS pixel and lets the press be stated in the drawing's coordinates. The press is dispatched at the
 * `<svg>` itself, which is the element the drawing resolves a press on.
 */
function pressAt(point: PolygonPoint): void {
  const svg = svgElement();
  const box = (svg.getAttribute('viewBox') ?? '')
    .trim()
    .split(/\s+/u)
    .map(Number);
  const width = box[2];
  const height = box[3];

  if (width === undefined || height === undefined || !(width > 0) || !(height > 0)) {
    throw new Error('the radar rendered no view box to lay out');
  }

  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  });

  fireEvent.click(svg, { clientX: point.x, clientY: point.y });
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
 * The class tokens one rendered element carries, so a case can assert which utilities the drawing
 * applied to it and which it did not. Read as tokens rather than as one substring of the attribute,
 * because a negative assertion needs to compare a class with a class.
 */
function classTokensOf(element: Element): readonly string[] {
  return (element.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter((token) => token !== '');
}

/**
 * The drawing's own scale: the centre its spokes radiate from, and the radius of its outer ring.
 *
 * Both are geometry the component keeps to itself and neither is exported, so a case that asserts
 * where a reading was placed reads them back from the decorative rings instead of restating numbers
 * that belong to the component. The rings are the circles inside the drawing's `aria-hidden` scale
 * group — a vertex's visible dot, its pointer target and its focus ring all sit in a series layer —
 * so anchoring the read to that group is what keeps a mark from being mistaken for the scale.
 */
function scaleOf(): { readonly centre: PolygonPoint; readonly outerRadius: number } {
  const scaleGroup = svgElement().querySelector('g[aria-hidden="true"]');

  if (scaleGroup === null) {
    throw new Error('the radar drew no scale group to read its centre from');
  }

  const rings = Array.from(scaleGroup.querySelectorAll('circle')).filter(
    (circle) => circle.getAttribute('fill') === 'none',
  );
  const [firstRing] = rings;

  if (firstRing === undefined) {
    throw new Error('the radar drew no scale ring');
  }

  return {
    centre: {
      x: Number(firstRing.getAttribute('cx')),
      y: Number(firstRing.getAttribute('cy')),
    },
    outerRadius: rings.reduce(
      (widest, ring) => Math.max(widest, Number(ring.getAttribute('r'))),
      0,
    ),
  };
}

/**
 * The label-band group that carries one series' name and its companion label.
 *
 * The drawing prints a series' name twice — once at its own polygon and once in the band beneath the
 * axes — so the band row is the group holding BOTH a name line and a companion line. Finding it that
 * way is what lets a case assert the pairing rather than the presence of each string somewhere in the
 * drawing.
 */
function labelGroupFor(name: string): Element {
  const group = Array.from(svgElement().querySelectorAll('g')).find((candidate) => {
    const lines = [...candidate.querySelectorAll('text')].map((text) =>
      (text.textContent ?? '').trim(),
    );

    return lines.length > 1 && lines[0] === name;
  });

  if (group === undefined) {
    throw new Error(`no label group carries the name ${name}`);
  }

  return group;
}

/**
 * The item at a position, or a failure naming what was missing.
 *
 * `noUncheckedIndexedAccess` makes every indexed read a possible absence, and a case that reached for
 * a missing element would otherwise compare against `undefined` and report the wrong thing.
 */
function at<T>(items: readonly T[], index: number, what: string): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`the ${what} at position ${String(index)} is missing`);
  }

  return item;
}

/**
 * The `class` attribute of the name line inside one label-band row.
 *
 * The row prints its name and its companion label as two `<text>` elements in that order, so the
 * first is the name line — which is what a case reads to assert the weight the series in view takes.
 */
function nameLineOf(row: Element): string {
  const [nameLine] = [...row.querySelectorAll('text')];

  if (nameLine === undefined) {
    throw new Error('the band row printed no name line');
  }

  return nameLine.getAttribute('class') ?? '';
}

/** The accessible name one vertex mark must carry: the axis, the series and the score. */
function vertexName(series: AtlasSeries, axisIndex: number): string {  const axis = AXES[axisIndex];
  const value = series.values[axisIndex];

  if (axis === undefined || value === undefined) {
    throw new Error(`no axis and score are defined at index ${axisIndex}`);
  }

  return `${axis.label}, ${series.label}: ${value}`;
}

/**
 * The pointer-state utilities one class list declares, filtered by their prefix rather than matched as a
 * whole string, so a legitimate token change inside a state cannot fail the case while the requirement —
 * a hover and a pressed treatment built from role tokens — still holds.
 */
function pointerStates(classList: string): readonly string[] {
  return classList
    .split(' ')
    .filter((utility) => utility.startsWith('group-hover:') || utility.startsWith('group-active:'));
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

    /* Three lines per series: its name and its companion tag in the label band, and its own label at
       its polygon. Everything else the drawing prints is an axis name. */
    expect(AXES).toHaveLength(texts.length - SERIES.length * 3);
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

  it('draws each outline from one series’ readings and never from a blend of two', () => {
    renderChart();

    const { centre, outerRadius } = scaleOf();
    const shapes = polygons();

    expect(outerRadius).toBeGreaterThan(0);

    /*
     * One ratio per vertex: how far the vertex sits from the centre, divided by the score its own
     * series states for that axis. The drawing places a reading by the scale and nothing else, so
     * every vertex of every series shares one ratio. A vertex taken from another series' record, or
     * an outline averaged with one, moves its own ratio and is caught here — the case the drawing
     * still looks plausible under, because the shape exists, the tags are right and only the reading
     * it was built from is wrong.
     */
    const ratios: { readonly series: string; readonly axis: string; readonly ratio: number }[] = [];

    shapes.forEach((polygon, seriesIndex) => {
      const one = SERIES[seriesIndex];

      if (one === undefined) {
        throw new Error(`no series is defined at index ${seriesIndex}`);
      }

      const points = pointsOf(polygon);

      expect(points).toHaveLength(one.values.length);

      points.forEach((point, axisIndex) => {
        const score = one.values[axisIndex];
        const axis = AXES[axisIndex];

        if (score === undefined || axis === undefined) {
          throw new Error(`no score is stated at index ${axisIndex} of ${one.id}`);
        }

        const distance = Math.hypot(point.x - centre.x, point.y - centre.y);

        ratios.push({ series: one.id, axis: axis.id, ratio: distance / score });
      });
    });

    expect(ratios).toHaveLength(SERIES.length * AXES.length);

    const [reference] = ratios;

    if (reference === undefined) {
      throw new Error('the chart drew no vertex to read the scale from');
    }

    /* A ratio of zero would pass every comparison below while every reading sat at the centre. */
    expect(reference.ratio).toBeGreaterThan(0);

    for (const entry of ratios) {
      expect(entry.ratio, `${entry.series} on ${entry.axis}`).toBeCloseTo(reference.ratio, 2);
    }
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

  it('takes a polygon’s fill and stroke from the one chart tone table', () => {
    renderChart();

    const shapes = polygons();
    const clientPolygon = shapes[SERIES.indexOf(CLIENT_SERIES)];
    const competitorPolygon = shapes[SERIES.indexOf(COMPETITOR_ALPHA)];

    if (clientPolygon === undefined || competitorPolygon === undefined) {
      throw new Error('the chart drew no polygon for the series under test');
    }

    // The client's series is the accent entry of the shared table, and the first market-intelligence
    // series is its first competitor entry: a polygon, the legend swatch beside it and every other
    // chart surface resolve one entry of `./horizontal-bar-chart.tsx`'s table rather than a copy of it.
    const clientClasses = classTokensOf(clientPolygon);
    expect(clientClasses).toContain(CHART_TONE_CLASSES.accent.fill);
    expect(clientClasses).toContain(CHART_TONE_CLASSES.accent.stroke);

    // One entry supplies both utilities, so a polygon cannot take one tone's wash and another's
    // outline — and it cannot take a second competitor's hue either.
    const competitorClasses = classTokensOf(competitorPolygon);
    expect(competitorClasses).toContain(CHART_TONE_CLASSES['competitor-1'].fill);
    expect(competitorClasses).toContain(CHART_TONE_CLASSES['competitor-1'].stroke);
    expect(competitorClasses).not.toContain(CHART_TONE_CLASSES['competitor-2'].fill);
    expect(competitorClasses).not.toContain(CHART_TONE_CLASSES['competitor-2'].stroke);
    expect(competitorClasses).not.toContain(CHART_TONE_CLASSES.accent.fill);
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

  it('answers the pointer on every vertex, and keeps the keyboard ring behind it', () => {
    renderChart({ evidenceRefFor: () => EVIDENCE_REF });

    const marks = screen.getAllByRole('button');

    expect(marks).toHaveLength(SERIES.length * AXES.length);

    for (const mark of marks) {
      /* The group marker the ring's hover and pressed variants hang on. */
      expect(mark.getAttribute('class')).toContain('group');

      const ringClasses = mark.querySelectorAll('circle')[2]?.getAttribute('class') ?? '';
      const states = pointerStates(ringClasses);

      expect(states.some((utility) => utility.startsWith('group-hover:'))).toBe(true);
      expect(states.some((utility) => utility.startsWith('group-active:'))).toBe(true);
      for (const utility of states) {
        /* Every state names a role-token property: no palette literal, no arbitrary value, no shadow. */
        expect(utility.slice(utility.lastIndexOf(':') + 1)).toMatch(/^(fill|stroke|opacity)-[a-z0-9]/u);
        expect(utility).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|\[.+\]/iu);
        expect(utility).not.toContain('shadow');
      }

      /* The ring is still the focus-ring role the keyboard reveals, carried by the guarded fade. */
      expect(ringClasses).toContain('stroke-focus-ring');
      expect(ringClasses).toContain('group-focus-visible:opacity-100');
      expect(ringClasses).toContain('motion-safe:transition-opacity');
    }
  });

  it('keeps every outline transparent to pointer events', () => {
    renderChart({ evidenceRefFor: () => EVIDENCE_REF });

    const shapes = polygons();

    expect(shapes).toHaveLength(SERIES.length);

    for (const shape of shapes) {
      /* The wash and the stroke decorate the readings the vertex marks carry, and no outline acts,
         so a polygon that took a press would swallow a mark's activation or hand it to another
         series' record. */
      expect(shape.getAttribute('pointer-events')).toBe('none');
    }
  });

  it('paints every outline below every vertex mark in document order', () => {
    renderChart({ evidenceRefFor: () => EVIDENCE_REF });

    const shapes = polygons();
    const marks = screen.getAllByRole('button');

    expect(shapes).toHaveLength(SERIES.length);
    expect(marks).toHaveLength(SERIES.length * AXES.length);

    for (const shape of shapes) {
      for (const mark of marks) {
        /* A polygon painted after a mark sits above it and takes the press that belonged to it,
           which is the defect this order exists to prevent: every outline precedes every mark. */
        expect(shape.compareDocumentPosition(mark) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
          Node.DOCUMENT_POSITION_FOLLOWING,
        );
      }
    }
  });

  it('opens the record the caller resolved for the mark that was pressed', async () => {
    const axis = AXES[0];

    if (axis === undefined) {
      throw new Error('no axis is defined to press a mark on');
    }

    /* One reference per vertex, so the case proves the drawer was asked for the record behind the
       mark that was pressed rather than for a neighbour's. */
    renderChart({ evidenceRefFor: (seriesId, axisId) => `${seriesId}#${axisId}` });

    const mark = screen.getByRole('button', { name: vertexName(CLIENT_SERIES, 0) });

    /* The client series is painted first, so its marks are the ones later series' decoration used to
       cover; the press lands on the centre of its own pointer target. */
    pressAt(targetOf(mark).point);

    expect(
      await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title }),
    ).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledTimes(1);
    expect(getEvidence).toHaveBeenCalledWith(`${CLIENT_SERIES.id}#${axis.id}`);
  });

  it('opens the resolved evidence by pointer and closes it again', async () => {
    const user = userEvent.setup();
    renderChart({ evidenceRefFor: () => EVIDENCE_REF });

    pressAt(targetOf(screen.getByRole('button', { name: vertexName(CLIENT_SERIES, 0) })).point);

    expect(
      await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: EVIDENCE_DRAWER_TEXT.closeLabel }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('resolves a press to the nearest vertex even where a neighbour’s target is painted above it', async () => {
    const axis = AXES[0];

    if (axis === undefined) {
      throw new Error('no axis is defined to press a mark on');
    }

    /* Two series whose scores on every axis place their vertices a few units apart — closer together
       than one pointer target is wide — so the target painted last, the second series', covers the
       first series' dot. */
    const lower: AtlasSeries = {
      ...COMPETITOR_ALPHA,
      id: 'series-lower',
      competitorId: 'competitor-lower',
      label: 'Lower network',
      values: [50, 50, 50, 50, 50],
    };
    const upper: AtlasSeries = {
      ...COMPETITOR_BETA,
      id: 'series-upper',
      competitorId: 'competitor-upper',
      label: 'Upper network',
      values: [55, 55, 55, 55, 55],
    };

    renderChart({
      series: [lower, upper],
      evidenceRefFor: (seriesId, axisId) => `${seriesId}#${axisId}`,
    });

    const lowerMark = screen.getByRole('button', { name: vertexName(lower, 0) });
    const upperMark = screen.getByRole('button', { name: vertexName(upper, 0) });
    const lowerTarget = targetOf(lowerMark);
    const upperTarget = targetOf(upperMark);

    /* The reproduction: the press point lies inside both targets, and the second series' target is
       painted above the first's dot, so a press resolved to the topmost target would open the upper
       record. The drawing answers with the vertex whose centre is nearest the pointer instead. */
    expect(distanceBetween(lowerTarget.point, upperTarget.point)).toBeLessThan(upperTarget.radius);
    expect(
      lowerMark.compareDocumentPosition(upperMark) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    pressAt(lowerTarget.point);

    expect(
      await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title }),
    ).toBeInTheDocument();
    // One gesture, one activation: the press resolved to a single vertex.
    expect(getEvidence).toHaveBeenCalledTimes(1);
    expect(getEvidence).toHaveBeenCalledWith(`${lower.id}#${axis.id}`);
  });

  it('activates nothing when the press lands clear of every vertex', () => {
    const onActivate = vi.fn();
    renderChart({ onActivate, evidenceRefFor: () => EVIDENCE_REF });

    /* The drawing's own origin corner. Every vertex sits within one ring radius of the centre, so a
       press there is inside no target and the drawing activates nothing (rule P-8). */
    pressAt({ x: 0, y: 0 });

    expect(onActivate).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getEvidence).not.toHaveBeenCalled();
  });

  it('answers a point with the nearest vertex, and with none beyond the target radius', () => {
    renderChart({ evidenceRefFor: () => EVIDENCE_REF });

    /* The radius is the drawing's own, read back from a rendered target rather than restated. */
    const { radius } = targetOf(screen.getByRole('button', { name: vertexName(CLIENT_SERIES, 0) }));
    const near = { seriesId: 'series-near', axisId: 'axis-near', point: { x: 100, y: 100 } };
    const far = {
      seriesId: 'series-far',
      axisId: 'axis-far',
      point: { x: 100, y: 100 + radius * 1.5 },
    };

    // The nearer centre answers, whatever order the marks are listed in.
    expect(nearestRadarMark([far, near], { x: 102, y: 104 }, radius)).toBe(near);
    // Two vertices at one centre are told apart by the order the drawing paints them in.
    expect(nearestRadarMark([near, { ...far, point: near.point }], near.point, radius)).toBe(near);
    // A press whose nearest vertex is still beyond the radius belongs to no vertex at all.
    expect(nearestRadarMark([near, far], { x: 100, y: 100 + radius * 3 }, radius)).toBeNull();
    expect(nearestRadarMark([], near.point, radius)).toBeNull();
  });

  it('leaves every vertex a plain mark when the mapper resolves no record for it', () => {
    renderChart({ evidenceRefFor: NO_VERTEX_EVIDENCE });

    // No control at all, so no mark can take focus and do nothing (rule P-8).
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(svgElement().querySelector('[role="button"]')).toBeNull();
    // Every reading is still drawn: the rings, and one plain dot per series and axis.
    expect(svgElement().querySelectorAll('circle').length).toBeGreaterThanOrEqual(
      SERIES.length * AXES.length,
    );
  });

  it('decides per vertex: a resolved reference is a control, an unresolved one a plain circle', () => {
    const unresolvedAxis = AXES[0];

    if (unresolvedAxis === undefined) {
      throw new Error('no axis is defined to leave unresolved');
    }

    renderChart({
      evidenceRefFor: (seriesId, axisId) =>
        seriesId === CLIENT_SERIES.id && axisId === unresolvedAxis.id ? undefined : EVIDENCE_REF,
    });

    // Every other vertex is a control that says what pressing it opens.
    const controls = screen.getAllByRole('button');

    expect(controls).toHaveLength(SERIES.length * AXES.length - 1);
    for (const control of controls) {
      expect(control).toHaveAttribute('aria-haspopup', 'dialog');
    }

    // The vertex the mapper could not resolve is a mark, not a control (rule P-8).
    expect(screen.queryByRole('button', { name: vertexName(CLIENT_SERIES, 0) })).toBeNull();

    /* The client series' own mark group. Its outline is a layer of its own, painted below every
       mark so no polygon can sit above a trigger and take its activation, so the group holding the
       marks is found from a control it renders rather than from the polygon beside it. */
    const clientMarkGroup = screen.getByRole('button', {
      name: vertexName(CLIENT_SERIES, 1),
    }).parentElement;
    const plainMarks = Array.from(clientMarkGroup?.querySelectorAll('circle') ?? []).filter(
      (circle) => circle.closest('[role="button"]') === null,
    );

    expect(clientMarkGroup?.querySelectorAll('g[role="button"]')).toHaveLength(AXES.length - 1);
    // One plain circle for the unresolved vertex, and no other mark left outside a control.
    expect(plainMarks).toHaveLength(1);
    expect(plainMarks[0]).not.toHaveAttribute('role');
    expect(plainMarks[0]).not.toHaveAttribute('tabindex');
  });

  it('reports the series a reader picked and opens no evidence when the mapper resolves none', () => {
    const onActivate = vi.fn();
    renderChart({ onActivate, evidenceRefFor: NO_VERTEX_EVIDENCE });

    const mark = screen.getByRole('button', { name: vertexName(CLIENT_SERIES, 0) });

    expect(mark).not.toHaveAttribute('aria-haspopup');

    pressAt(targetOf(mark).point);

    expect(onActivate).toHaveBeenCalledWith(CLIENT_SERIES.id);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getEvidence).not.toHaveBeenCalled();
  });

  it('resolves the competitor tone from the competitor identifier, not from the drawing order', () => {
    expect(competitorToneOf(SERIES, COMPETITOR_ALPHA.id)).toBe(1);
    expect(competitorToneOf(SERIES, COMPETITOR_BETA.id)).toBe(2);
    expect(competitorToneOf(SERIES, COMPETITOR_GAMMA.id)).toBe(3);
    expect(competitorToneOf(SERIES, CLIENT_SERIES.id)).toBeNull();

    /* The same three competitors in the opposite order: the identifier still answers, so a payload
       list that arrives in another order repaints nothing. */
    const reordered = [...SERIES].reverse();

    expect(competitorToneOf(reordered, COMPETITOR_ALPHA.id)).toBe(1);
    expect(competitorToneOf(reordered, COMPETITOR_BETA.id)).toBe(2);
    expect(competitorToneOf(reordered, COMPETITOR_GAMMA.id)).toBe(3);

    /* An identifier that states no competitor ordinal has no slot of its own, and neither does a
       series the chart was not handed. */
    const unnamed: AtlasSeries = {
      ...COMPETITOR_ALPHA,
      id: 'series-unnamed',
      competitorId: 'network-one',
    };

    expect(competitorToneOf([unnamed], unnamed.id)).toBeNull();
    expect(competitorToneOf(SERIES, 'series-not-drawn')).toBeNull();
  });

  it('prints every series’ own label at its own polygon, with a swatch and a leader to its vertex', () => {
    renderChart();

    const { centre } = scaleOf();
    const shapes = polygons();
    const labelGroups = [...svgElement().querySelectorAll('g[pointer-events="none"]')];

    /* One label per series, and no label standing in for two. */
    expect(labelGroups).toHaveLength(SERIES.length);
    expect(shapes).toHaveLength(SERIES.length);

    labelGroups.forEach((group, index) => {
      const one = at(SERIES, index, 'labelled series');
      const shape = at(shapes, index, 'polygon of the labelled series');
      const [leader] = [...group.querySelectorAll('path')];
      const [swatch] = [...group.querySelectorAll('circle')];
      const [words] = [...group.querySelectorAll('text')];

      /* The words are the series' own label, and they sit in the primary text role so the name never
         rests on a hue (rule P-1, rule B-3). */
      expect((words?.textContent ?? '').trim()).toBe(one.label);
      expect(words?.getAttribute('class')).toContain('fill-text-primary');

      /* The leader starts at one of that polygon's own vertices, so the label is tied to the outline
         it names and not to a neighbour's. */
      const start = /^M ([-\d.]+) ([-\d.]+)/u.exec(leader?.getAttribute('d') ?? '');
      const vertex = { x: Number(start?.[1]), y: Number(start?.[2]) };

      expect(pointsOf(shape).some((point) => distanceBetween(point, vertex) < 0.01)).toBe(true);

      /* The label sits on the axis its index selects ... */
      const angle = -Math.PI / 2 + ((Math.PI * 2) / AXES.length) * (index % AXES.length);
      const fromCentre = { x: vertex.x - centre.x, y: vertex.y - centre.y };
      const radialSpan = Math.hypot(fromCentre.x, fromCentre.y);

      expect(radialSpan).toBeGreaterThan(0);
      expect(
        (fromCentre.x * Math.sin(angle) - fromCentre.y * Math.cos(angle)) / radialSpan,
      ).toBeCloseTo(0, 2);

      /* ... and its swatch lies beyond the vertex on that same ray, so the words stand outside the
         outline they name rather than on top of it. */
      const swatchPoint = {
        x: Number(swatch?.getAttribute('cx')),
        y: Number(swatch?.getAttribute('cy')),
      };
      const offset = { x: swatchPoint.x - vertex.x, y: swatchPoint.y - vertex.y };
      const span = Math.hypot(fromCentre.x, fromCentre.y) * Math.hypot(offset.x, offset.y);

      /* The sine of the angle between the two directions — coordinates are rounded to two decimals, so
         the comparison is scaled by both lengths rather than left as a raw cross product. */
      expect((fromCentre.x * offset.y - fromCentre.y * offset.x) / span).toBeCloseTo(0, 2);
      expect(fromCentre.x * offset.x + fromCentre.y * offset.y).toBeGreaterThan(0);

      /* The swatch is painted in that polygon's own role token: the one fill the outline carries. */
      const fills = classTokensOf(shape).filter((token) => token.startsWith('fill-'));

      expect(fills).toHaveLength(1);
      expect(swatch?.getAttribute('class')).toBe(fills[0]);

      /* The words stand outside their swatch in both directions — away from the drawing's vertical
         centre line, so two labels on opposite sides of it cannot meet, and back towards its
         horizontal centre line, so the axis name at the outer end of the same spoke stays clear. */
      const wordsPoint = {
        x: Number(words?.getAttribute('x')),
        y: Number(words?.getAttribute('y')),
      };

      expect(Math.sign(wordsPoint.x - swatchPoint.x)).toBe(
        Math.sign(swatchPoint.x - centre.x),
      );
      expect(Math.abs(wordsPoint.y - centre.y)).toBeLessThan(
        Math.abs(swatchPoint.y - centre.y),
      );
    });
  });

  it('haloes every polygon label so a name crossing a stroke still reads', () => {
    renderChart();

    const labelGroups = [...svgElement().querySelectorAll('g[pointer-events="none"]')];

    expect(labelGroups).toHaveLength(SERIES.length);

    labelGroups.forEach((group, index) => {
      const one = at(SERIES, index, 'labelled series');
      const [words] = [...group.querySelectorAll('text')];
      const tokens = words === undefined ? [] : classTokensOf(words);
      const strokeTokens = tokens.filter((token) => token.startsWith('stroke-'));

      /* The words are still the series' own label, in the primary text role whose contrast §4
         measures: the halo is painted around the glyphs and never in place of that fill (rule B-3). */
      expect((words?.textContent ?? '').trim()).toBe(one.label);
      expect(tokens).toContain('fill-text-primary');
      expect(tokens.filter((token) => token.startsWith('fill-'))).toHaveLength(1);

      /* The halo is the card's surface role token and nothing else — the surface the drawing sits on,
         which is the device `src/components/map-canvas.tsx` uses for its own labels: a role the theme
         resolves, never a raw colour and never a second tone the words would be read in. */
      expect(strokeTokens).toEqual(['stroke-surface-1']);

      /* SVG's own paint order draws that stroke first and the fill over it, which is what surrounds
         each glyph with the halo instead of striking a line through it, and the join keeps the strip
         of halo at a letter's corner continuous. */
      expect(words?.getAttribute('paint-order')).toBe('stroke');
      expect(words?.getAttribute('stroke-linejoin')).toBe('round');

      /* Wide enough to clear the stroke a letter crosses: at least one unit of halo on each side of
         the glyph, which a hairline spoke or a two-unit series outline cannot outrun. */
      expect(Number(words?.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(2);
    });
  });

  it('marks the series in view inside the drawing and leaves every reading as it was', () => {
    const selected = COMPETITOR_BETA;

    renderChart({ selectedSeriesId: selected.id, evidenceRefFor: () => EVIDENCE_REF });

    const shapes = polygons();

    /* Every series is still drawn with every vertex it states: the marking emphasises, it never
       filters and never restates a score. */
    expect(shapes).toHaveLength(SERIES.length);

    for (const shape of shapes) {
      expect(pointsOf(shape)).toHaveLength(AXES.length);
      expect(shape.getAttribute('pointer-events')).toBe('none');
    }

    /* The selected series' outline is drawn heavier than every other series', and no other outline
       changes weight, so the emphasis is structural rather than a hue a reader has to separate. */
    const selectedIndex = SERIES.indexOf(selected);
    const selectedWidth = Number(
      at(shapes, selectedIndex, 'selected polygon').getAttribute('stroke-width'),
    );

    expect(selectedWidth).toBeGreaterThan(0);

    const otherWidths = shapes
      .filter((_shape, index) => index !== selectedIndex)
      .map((shape) => shape.getAttribute('stroke-width'));

    expect(new Set(otherWidths).size).toBe(1);

    for (const width of otherWidths) {
      expect(Number(width)).toBeLessThan(selectedWidth);
    }

    /* Its label-band row states `aria-current` and prints its name in the emphasised weight, and no
       other row carries either. */
    const current = [...svgElement().querySelectorAll('g[aria-current="true"]')];

    expect(current).toHaveLength(1);

    const row = at(current, 0, 'band row in view');

    expect(row.textContent).toContain(`${selected.label} ${COMPETITOR_NAME_TAG}`);
    expect(nameLineOf(row)).toContain('font-semibold');
  });

  it('marks the client’s own series in view when the screen reports it', () => {
    renderChart({ selectedSeriesId: CLIENT_SERIES.id });

    const shapes = polygons();
    const clientIndex = SERIES.indexOf(CLIENT_SERIES);
    const clientWidth = Number(at(shapes, clientIndex, 'client polygon').getAttribute('stroke-width'));

    expect(clientWidth).toBeGreaterThan(0);

    shapes.forEach((shape, index) => {
      if (index === clientIndex) {
        return;
      }

      expect(Number(shape.getAttribute('stroke-width'))).toBeLessThan(clientWidth);
    });

    const current = [...svgElement().querySelectorAll('g[aria-current="true"]')];

    expect(current).toHaveLength(1);

    const row = at(current, 0, 'band row in view');

    expect(row.textContent).toContain(CLIENT_SERIES.label);
    expect(nameLineOf(row)).toContain('font-semibold');
    /* The client's row keeps its own companion label beside the emphasised name. */
    expect(row.textContent).toContain(CLIENT_SELF_ASSESSMENT_LABEL);
  });

  it('marks nothing when the screen reports no entity in view', () => {
    renderChart({ selectedSeriesId: null });

    expect(svgElement().querySelectorAll('[aria-current]')).toHaveLength(0);

    const shapes = polygons();
    const [first] = shapes;

    if (first === undefined) {
      throw new Error('the chart drew no polygon');
    }

    /* One weight for every outline: nothing is emphasised when the caller reports no entity. */
    const widths = new Set(shapes.map((shape) => shape.getAttribute('stroke-width')));

    expect(widths.size).toBe(1);
  });

  it('paints one competitor in one hue however the payload orders its series', () => {
    /* The series list and the networks are independent members of the payload, so this case draws the
       competitors in the reverse of the order their identifiers state — the order a reordered payload
       would hand over — and each outline must keep the hue its own identifier resolves. */
    const reordered = [...COMPETITORS].reverse();
    const expected = [
      CHART_TONE_CLASSES['competitor-3'],
      CHART_TONE_CLASSES['competitor-2'],
      CHART_TONE_CLASSES['competitor-1'],
    ] as const;

    renderChart({ series: reordered });

    const shapes = polygons();

    expect(shapes).toHaveLength(expected.length);

    expected.forEach((tone, index) => {
      const polygon = shapes[index];

      if (polygon === undefined) {
        throw new Error(`the drawing rendered no polygon at position ${String(index)}`);
      }

      const classes = classTokensOf(polygon);

      expect(classes).toContain(tone.fill);
      expect(classes).toContain(tone.stroke);
    });
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
      competitorId: 'competitor-partial',
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
