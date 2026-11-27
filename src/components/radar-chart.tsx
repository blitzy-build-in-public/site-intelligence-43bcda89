/**
 * The five-axis resilience radar of the competitive atlas: one polygon per series, drawn apart, and
 * no combined reading anywhere on the drawing.
 *
 * WHY EACH SERIES IS DRAWN SEPARATELY (rule P-5). A radar chart is where provenance is normally
 * blended: the familiar version fills one area per company and then puts an average "resilience
 * score" beside it. This component has no such member. Every entry in `series` becomes its own
 * polygon with its own vertices and its own visible label, and the module carries nothing that sums,
 * averages, ranks or otherwise combines two series. The client's self-assessment and the competitors
 * therefore cross the same axes as separate outlines, which makes the separation structural rather
 * than a review note: a caller looking for a combined figure has nowhere to obtain one.
 *
 * WHY BOTH COMPANION STRINGS ARE IMPORTED AND NEVER WRITTEN (rule P-1). A competitor's name is
 * followed by `COMPETITOR_NAME_TAG` and its series by the market-intelligence label the record
 * carries; the client's series is followed by `CLIENT_SELF_ASSESSMENT_LABEL`, the longer
 * series-specific string that sits alongside the seven fixed section 5.3 labels rather than inside
 * them (AAP 0.10). Both are imported from `../types`, so a reworded tag moves in one place and this
 * module follows it, and neither literal appears in this file.
 *
 * WHY THE SWATCH LEGEND IS NOT HERE. The calling screen renders `./legend.tsx` from the same
 * `AtlasSeries` data, so a series' swatch and its polygon resolve the same role token and cannot
 * disagree. This component prints each series' name and its companion tag inside the drawing, which
 * is what rule P-1 requires of a labelled series, and leaves the colour legend to the screen.
 *
 * THE SCALE IS A CHART CONCERN. `RadarAxis` declares no bounds. The simulated market-intelligence
 * pack fixes its scores as integers from zero to one hundred, one per axis in axis order, with the
 * upper bound the strongest reading the pack records; `SCORE_MIN` and `SCORE_MAX` below are that
 * scale and nothing else reads them. They are geometry rather than a figure: a reading outside them
 * is drawn at the nearest ring instead of off the drawing, and no scale number is printed, so the
 * chart types no number onto the screen.
 *
 * WHAT IT DOES NOT DO. It reads no clock, keeps no state beyond the evidence it has open, sends no
 * request (rule B-1), reads no configuration (rule B-2) and imports no seed record (rule P-2: every
 * score arrives in the `series` prop exactly as the atlas payload stated it). It computes and
 * formats no domain figure (rule P-6), declares no animation or transition so there is no motion for
 * `prefers-reduced-motion` to undo (rule B-3), claims nothing about where a record is held or whether
 * it could be altered (rule P-4), and names no company, place or person of its own (rule P-7).
 *
 * ACCESSIBILITY (rule B-3). The drawing is one `<svg role="group">` named by
 * `RADAR_CHART_TEXT.groupLabel`, which deliberately does not repeat the `<figcaption>` the caller's
 * `./chart-frame.tsx` supplies. Each axis is named at its outer end in the secondary text role, and
 * the rings, spokes and vertex dots are decoration. A vertex that can act — because the caller
 * supplied `evidenceRefFor` or `onActivate` — is a `<g role="button" tabIndex={0}>` whose accessible
 * name states the axis, the series and the value, operable by pointer and by `Enter` or `Space`, with
 * a focus ring in the `focus-ring` role drawn around the mark. A vertex that can do nothing stays a
 * plain `<circle>`, so rule P-8 is never broken by a control with nothing behind it.
 */
import { useState } from 'react';
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from 'react';

import { CLIENT_SELF_ASSESSMENT_LABEL, COMPETITOR_NAME_TAG } from '../types';
import type { AtlasSeries, RadarAxis } from '../types';

import { EvidenceDrawer } from './evidence-drawer';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence the drawing states, held here so the wording has one owner: the component renders
 * this text and a suite names it through this object instead of retyping it.
 *
 * None of it is a fixed specification string. The seven section 5.3 labels belong to the figures that
 * carry them and arrive with the record (rule P-1), the series' names and companion tags arrive with
 * the payload, and the axis names come from `axes`. Nothing below carries a figure, an amount, a date
 * or a record identifier, and nothing states a claim about where a record is held (rule P-4).
 */
export const RADAR_CHART_TEXT = {
  /**
   * The drawing's accessible name. It says what the graphic is and how it is built, and it does not
   * repeat the frame's title, so the two are told apart on a screen holding several charts.
   */
  groupLabel:
    'Resilience scores by series across the radar axes, one polygon per series and no combined score',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The public surface
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link RadarChart}. */
export interface RadarChartProps {
  /**
   * The radar's axes, in the order every series' `values` align to. Required.
   *
   * The axes arrive from `Atlas.radarAxes`, so the chart never decides what the five spokes mean; it
   * draws one spoke and one outer label per entry, and it takes the axis count from this list rather
   * than from a constant, so a payload with a different number of axes still draws correctly.
   */
  readonly axes: readonly RadarAxis[];

  /**
   * The series to draw, one polygon each, in the order the record lists them. Required.
   *
   * Each series' `provenance` decides its colour family and each series' `simLabel` (or its
   * companion tag) is printed beside it, so an unlabelled or uncoloured series cannot be drawn. An
   * empty list draws the axes alone, which is an honest reading of a payload with no series.
   */
  readonly series: readonly AtlasSeries[];

  /**
   * Called with the series' identifier whenever one of its vertices is activated.
   *
   * A vertex becomes a control when this handler or {@link RadarChartProps.evidenceRefFor} is
   * supplied, so a screen that only needs to learn which series a reader picked passes this alone,
   * and a chart with neither draws plain marks that operate nothing (rule P-8).
   */
  readonly onActivate?: ((seriesId: string) => void) | undefined;

  /**
   * Resolves the evidence reference a vertex opens, given the series and the axis it sits on.
   *
   * `AtlasSeries` carries no per-value evidence reference, so the caller supplies one. When a
   * collection returns a reference for a vertex, activating that vertex opens `./evidence-drawer.tsx`
   * with it; when the caller passes no collection, no vertex claims to open evidence it does not
   * have.
   */
  readonly evidenceRefFor?: ((seriesId: string, axisId: string) => string) | undefined;
}

/* ---------------------------------------------------------------------------------------------
 * Geometry — a fixed coordinate space the element scales into its container
 * ------------------------------------------------------------------------------------------- */

/**
 * The drawing's coordinate space, in user units rather than pixels.
 *
 * The element is sized by CSS and the `viewBox` maps these units onto it, so the radar scales with
 * its container and keeps its proportions at every width instead of needing a breakpoint. The width
 * leaves room for the two widest axis labels, one at each outer end, and the height is derived per
 * render from the number of series, because the series labels occupy a band below the axes.
 */
const VIEW_WIDTH = 520;

/** The centre the axes radiate from, on the drawing's own grid. */
const CENTRE_X = 260;
const CENTRE_Y = 200;

/** The outer ring's radius: the scale's upper bound and the axis labels' reference distance. */
const RADIUS = 120;

/**
 * The concentric rings, as fractions of {@link RADIUS}.
 *
 * Four rings give a reader a coarse quartile reading without any tick label, which is deliberate:
 * printing scale numbers would put a typed figure on the screen (rule P-6), and the numbers a reader
 * needs are the scores, which arrive with the payload and are named in each vertex's accessible
 * name.
 */
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1] as const;

const RING_STROKE_WIDTH = 1;
const SERIES_STROKE_WIDTH = 2;

/**
 * The wash inside a series' polygon, applied per series and never across series.
 *
 * A combined fill would paint one area over another and invite a reader to read the overlap as a
 * shared reading, which is the blending rule P-5 forbids, so the wash stays faint enough that the
 * outlines remain what a reader follows and each series keeps its own shape.
 */
const SERIES_AREA_OPACITY = 0.08;

/** How far an axis label sits beyond the outer ring, and when it is anchored to one side of it. */
const AXIS_LABEL_OFFSET = 16;
const AXIS_LABEL_ANCHOR_TOLERANCE = 18;

/** A vertex: the dot a reader sees, the larger invisible target around it, and its focus ring. */
const MARK_RADIUS = 3.5;
const MARK_HIT_RADIUS = 12;
const FOCUS_RING_RADIUS = 9;
const FOCUS_RING_WIDTH = 3;

/** The band below the axes that carries one name line and one label line per series. */
const SERIES_LABEL_X = 24;
const LABEL_BAND_TOP = 330;
const SERIES_LABEL_ROW_HEIGHT = 34;
const SERIES_LABEL_LINE_HEIGHT = 16;
const LABEL_BAND_PADDING = 12;

/**
 * The pack scale the seed's market-intelligence records use, and the only two numbers the geometry
 * needs: a score is placed by how far it runs from the first to the second.
 */
const SCORE_MIN = 0;
const SCORE_MAX = 100;

/** Coordinates are rounded to two decimals so the emitted markup stays readable and stable. */
const COORDINATE_PRECISION = 100;

/* ---------------------------------------------------------------------------------------------
 * Colours — one role token per series family, chosen in one place
 * ------------------------------------------------------------------------------------------- */

/**
 * The ordinal a competitor's series takes among the market-intelligence series it is drawn with.
 *
 * The three hues specification §4.2 defines are positional, so an ordinal rather than a name is what
 * a colour can be selected by. `AtlasSeries` carries no competitor identifier, which is why the
 * ordinal is derived from the series' place in the list rather than from the record.
 */
type CompetitorTone = 1 | 2 | 3;

/**
 * The three competitor series tones, in the order specification §4.2 assigns the competitor hues:
 * the first market-intelligence series takes the first token, the second the second, the third the
 * third. `./legend.tsx` paints its swatches from the same three role tokens, so a polygon and the
 * legend row that names it are the same colour in both themes.
 *
 * Exhaustive by type, so a fourth competitor would have to bring its own token rather than borrow
 * another company's colour — borrowing one would make two companies indistinguishable on the
 * drawing, which is a blending of the very kind rule P-5 forbids.
 */
const COMPETITOR_AREA_CLASSES = {
  1: 'fill-competitor-1',
  2: 'fill-competitor-2',
  3: 'fill-competitor-3',
} as const satisfies Record<CompetitorTone, string>;

/** The same three tones for a polygon's outline, so a series' fill and its stroke stay one colour. */
const COMPETITOR_LINE_CLASSES = {
  1: 'stroke-competitor-1',
  2: 'stroke-competitor-2',
  3: 'stroke-competitor-3',
} as const satisfies Record<CompetitorTone, string>;

/**
 * The client's own series tone: the accent role, which specification §4.1 reserves for first-party
 * flows. It is a role token like the others, so the client's series cannot be painted in a
 * competitor's hue on one theme and something else on the other.
 */
const CLIENT_AREA_CLASSES = 'fill-accent';
const CLIENT_LINE_CLASSES = 'stroke-accent';

/** One series' resolved colours: the wash inside its polygon and the outline around it. */
interface SeriesTone {
  /** The `fill-` utility of the series' role token. */
  readonly area: string;
  /** The `stroke-` utility of the same role token. */
  readonly line: string;
}

/** The client's series tone, the only one that is not selected by an ordinal. */
const CLIENT_TONE: SeriesTone = { area: CLIENT_AREA_CLASSES, line: CLIENT_LINE_CLASSES };

/**
 * The ordinal a competitor's series takes among the market-intelligence series it is drawn with.
 *
 * The ordinal is a position rather than a name: `AtlasSeries` carries no competitor identifier, and
 * the three competitor hues are assigned by order in specification §4.2, so the nth
 * market-intelligence series in the caller's list is the nth company. The list the caller passes to
 * this chart is the list it builds its legend from, so resolving both from this one function is what
 * keeps a swatch and a polygon the same colour.
 *
 * A series that is not market intelligence has no ordinal and yields `null`, which is how the
 * client's own series is told apart without a second union.
 *
 * @param series - The series the chart is drawing, in the caller's order.
 * @param seriesId - The identifier of the series whose ordinal is wanted.
 * @returns The ordinal `1`, `2` or `3`, or `null` when the series is not a competitor's.
 */
export function competitorToneOf(
  series: readonly AtlasSeries[],
  seriesId: string,
): CompetitorTone | null {
  let ordinal = 0;

  for (const candidate of series) {
    if (candidate.provenance !== 'market_intelligence') {
      continue;
    }

    ordinal += 1;

    if (candidate.id === seriesId) {
      return toneAtOrBelow(ordinal);
    }
  }

  return null;
}

/**
 * Caps an ordinal at the third tone.
 *
 * The pack holds three competitors and specification §4.2 defines three hues, so a fourth
 * market-intelligence series would have no colour of its own. Capping keeps the drawing renderable
 * instead of leaving a series unpainted; the honest fix for a fourth competitor is a fourth token,
 * not a second company in the third company's hue.
 */
function toneAtOrBelow(ordinal: number): CompetitorTone {
  if (ordinal >= 3) {
    return 3;
  }

  return ordinal === 2 ? 2 : 1;
}

/**
 * The colours one series is drawn in, resolved from its provenance and its ordinal.
 *
 * Provenance decides the family — market intelligence takes a competitor hue, anything else is the
 * client's own first-party side and takes the accent — and the ordinal decides which of the three
 * competitor hues. A market-intelligence series that somehow carries no ordinal still receives a
 * competitor hue rather than the accent, because painting a competitor in the first-party accent
 * would present a market-intelligence reading as the client's own (rule P-5).
 */
function toneOf(series: readonly AtlasSeries[], one: AtlasSeries): SeriesTone {
  if (one.provenance !== 'market_intelligence') {
    return CLIENT_TONE;
  }

  const tone = competitorToneOf(series, one.id) ?? 1;

  return { area: COMPETITOR_AREA_CLASSES[tone], line: COMPETITOR_LINE_CLASSES[tone] };
}

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The drawing itself: it fills the width its frame gives it and keeps the `viewBox` ratio. */
const SVG_CLASSES = 'block h-auto w-full min-w-0';

/**
 * A vertex that can act: the whole mark, with the visible dot and the invisible target around it.
 *
 * The target is the SVG half of the 24x24 px minimum a pointer needs (rule B-3): the dot is a few
 * units across, so the group carries a larger hit circle declared `fill="none"` with pointer events
 * enabled, which receives the pointer without painting anything.
 */
const MARK_GROUP_CLASSES = 'group cursor-pointer';

/**
 * The focus ring, drawn only while the mark has keyboard focus.
 *
 * `:focus-visible` rather than `:focus`, so a pointer press does not leave a ring behind and a
 * keyboard reader always sees one, and the ring takes the `focus-ring` role the token layer measures
 * for that purpose in both themes. The circle has no stroke until the variant applies, so the ring
 * costs nothing while the mark is unfocused.
 */
const FOCUS_RING_CLASSES = 'group-focus-visible:stroke-focus-ring';

/* ---------------------------------------------------------------------------------------------
 * Geometry helpers — pure arithmetic over the drawing's own coordinate space
 * ------------------------------------------------------------------------------------------- */

/** One point on the drawing's grid. */
interface ChartPoint {
  /** The horizontal coordinate, in user units. */
  readonly x: number;
  /** The vertical coordinate, in user units. */
  readonly y: number;
}

/** Which end of an axis a label is anchored to, so the text grows away from the drawing. */
type AxisLabelAnchor = 'start' | 'middle' | 'end';

/**
 * The point at a given distance along one axis.
 *
 * The first axis points straight up and the rest follow clockwise, so the shape reads the way a
 * resilience radar is conventionally laid out regardless of how many axes a payload carries. The
 * fraction is how far along the axis the point sits: `1` is the outer ring, `0` the centre.
 */
function pointOnAxis(axisIndex: number, axisCount: number, fraction: number): ChartPoint {
  if (axisCount <= 0) {
    return { x: CENTRE_X, y: CENTRE_Y };
  }

  const turn = (Math.PI * 2) / axisCount;
  const angle = -Math.PI / 2 + turn * axisIndex;
  const distance = RADIUS * fraction;

  return {
    x: CENTRE_X + Math.cos(angle) * distance,
    y: CENTRE_Y + Math.sin(angle) * distance,
  };
}

/**
 * How far along its axis a score sits, as a fraction of {@link RADIUS}.
 *
 * A score is placed by the pack scale and nothing else: a reading outside the scale is drawn at the
 * nearest ring rather than outside the drawing, and a reading that is not a finite number is drawn at
 * the centre instead of emitting a coordinate the browser cannot use. Neither case changes the value
 * a reader is told, because the mark's accessible name states the score the payload carries.
 */
function axisFraction(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const clamped = Math.min(Math.max(value, SCORE_MIN), SCORE_MAX);

  return (clamped - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
}

/**
 * Where an axis label is anchored, from which side of the centre its spoke ends on.
 *
 * A label on the right of the drawing starts at its spoke's end and grows outward, one on the left
 * ends there and grows inward, and one near the vertical middle is centred under its spoke. The
 * tolerance band is what keeps the top and bottom labels centred instead of flipping on a fractional
 * difference of a unit.
 */
function axisLabelAnchorFor(axisIndex: number, axisCount: number): AxisLabelAnchor {
  const end = pointOnAxis(axisIndex, axisCount, 1);
  const offset = end.x - CENTRE_X;

  if (offset > AXIS_LABEL_ANCHOR_TOLERANCE) {
    return 'start';
  }

  return offset < -AXIS_LABEL_ANCHOR_TOLERANCE ? 'end' : 'middle';
}

/**
 * Rounds one coordinate to {@link COORDINATE_PRECISION}, so long floating-point tails stay out of the
 * markup and a re-render emits an identical attribute.
 */
function roundCoordinate(value: number): number {
  return Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;
}

/** The `points` attribute of a polygon: every vertex as a rounded pair of coordinates. */
function pointListOf(points: readonly ChartPoint[]): string {
  return points.map((point) => `${roundCoordinate(point.x)},${roundCoordinate(point.y)}`).join(' ');
}

/** One vertex of a series' polygon, with everything its mark and its accessible name need. */
interface SeriesVertex {
  /** The axis the vertex sits on, which is what an evidence collection is asked for. */
  readonly axisId: string;
  /** The point on the drawing's grid. */
  readonly point: ChartPoint;
  /** The mark's accessible name: the axis, the series and the score, in that order. */
  readonly label: string;
}

/**
 * The vertices of one series, in axis order.
 *
 * A score the payload does not carry at an axis is skipped rather than drawn as a zero: a missing
 * reading is a gap, and a mark at the centre would claim a score the record never stated (rule P-6).
 * The polygon then follows the vertices that exist, so a partly stated series is drawn as the shape
 * its own readings describe and never as one completed with invented points.
 */
function verticesOf(one: AtlasSeries, axes: readonly RadarAxis[]): readonly SeriesVertex[] {
  const vertices: SeriesVertex[] = [];

  for (const [index, axis] of axes.entries()) {
    const value = one.values[index];

    if (value === undefined) {
      continue;
    }

    vertices.push({
      axisId: axis.id,
      point: pointOnAxis(index, axes.length, axisFraction(value)),
      label: `${axis.label}, ${one.label}: ${value}`,
    });
  }

  return vertices;
}

/** The two lines one series prints beside the drawing: its name and its companion label. */
interface SeriesLabelLines {
  /** The name line: the series' own name, and the competitor tag when the series is a competitor's. */
  readonly name: string;
  /** The label line: the fixed string that says where the figures came from. */
  readonly companion: string;
}

/**
 * The words one series prints inside the drawing (rule P-1).
 *
 * A competitor's name is followed by `COMPETITOR_NAME_TAG` and its label line is the
 * market-intelligence label the record carries, so no competitor element appears untagged or
 * unlabelled. The client's series carries `CLIENT_SELF_ASSESSMENT_LABEL` instead: it is a
 * first-party self-assessment whose companion string is the longer series-specific one that sits
 * alongside the seven fixed labels rather than inside them, and a competitor's label on it would
 * present the client's own reading as market intelligence.
 *
 * Both fixed strings are imported, so this function composes wording it does not own.
 */
function labelLinesOf(one: AtlasSeries): SeriesLabelLines {
  if (one.provenance === 'market_intelligence') {
    return { name: `${one.label} ${COMPETITOR_NAME_TAG}`, companion: one.simLabel };
  }

  return { name: one.label, companion: CLIENT_SELF_ASSESSMENT_LABEL };
}

/**
 * Whether a key press is an activation of the mark that has focus.
 *
 * `Enter` and `Space` are what a button answers to, and a mark carrying the button role is a button
 * to a keyboard reader whatever its element name is, so both activate it.
 */
function isActivationKey(event: ReactKeyboardEvent<SVGGElement>): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

/* ---------------------------------------------------------------------------------------------
 * The drawing layers
 * ------------------------------------------------------------------------------------------- */

/** Props of one series' layer: its outline, its marks and the handlers they reach. */
interface SeriesLayerProps {
  /** The series this layer draws. */
  readonly series: AtlasSeries;
  /** Every series the chart draws, which is what resolves this one's colour ordinal. */
  readonly allSeries: readonly AtlasSeries[];
  /** The axes the series' values align to. */
  readonly axes: readonly RadarAxis[];
  /** Resolves the evidence reference a vertex opens, when the caller supplies one. */
  readonly evidenceRefFor: ((seriesId: string, axisId: string) => string) | undefined;
  /** Reports the series a reader picked, when the caller supplies the handler. */
  readonly onActivate: ((seriesId: string) => void) | undefined;
  /** Reports one activated vertex to the chart, which owns the evidence it has open. */
  readonly onVertexActivate: (seriesId: string, evidenceRef: string | null) => void;
}

/**
 * One series' outline and its vertex marks.
 *
 * The layer is a `<g>` of its own, so the drawing's structure states the separation rule P-5
 * requires: one polygon element per series, never one polygon carrying two companies' readings and
 * never a shape standing in for a total. Nothing here aggregates, so a reader comparing the outlines
 * is comparing the records themselves.
 *
 * A mark becomes a control only when activating it does something — it opens the evidence the caller
 * resolved for it, or it reports the series through `onActivate`. A series the caller has wired to
 * neither is drawn with plain dots: a dot that took focus and then did nothing would be a control
 * that cannot act (rule P-8), and the drawing still shows every reading it holds.
 */
function SeriesLayer({
  series,
  allSeries,
  axes,
  evidenceRefFor,
  onActivate,
  onVertexActivate,
}: SeriesLayerProps): JSX.Element | null {
  const vertices = verticesOf(series, axes);

  if (vertices.length === 0) {
    return null;
  }

  const tone = toneOf(allSeries, series);

  function renderMark(vertex: SeriesVertex): JSX.Element {
    const evidenceRef = evidenceRefFor?.(series.id, vertex.axisId) ?? null;
    const canAct = evidenceRef !== null || onActivate !== undefined;

    if (!canAct) {
      return (
        <circle
          key={vertex.axisId}
          cx={vertex.point.x}
          cy={vertex.point.y}
          r={MARK_RADIUS}
          className={tone.area}
        />
      );
    }

    function activate(): void {
      onVertexActivate(series.id, evidenceRef);
    }

    return (
      <g
        key={vertex.axisId}
        role="button"
        tabIndex={0}
        aria-label={vertex.label}
        {...(evidenceRef === null ? {} : { 'aria-haspopup': 'dialog' as const })}
        onClick={activate}
        onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => {
          if (!isActivationKey(event)) {
            return;
          }

          event.preventDefault();
          activate();
        }}
        className={MARK_GROUP_CLASSES}
      >
        {/* The target: as large as a pointer needs, and painted with nothing. */}
        <circle
          cx={vertex.point.x}
          cy={vertex.point.y}
          r={MARK_HIT_RADIUS}
          fill="none"
          pointerEvents="all"
        />
        <circle
          cx={vertex.point.x}
          cy={vertex.point.y}
          r={MARK_RADIUS}
          className={tone.area}
        />
        {/* The focus ring: no stroke of its own until the group is keyboard focused. */}
        <circle
          cx={vertex.point.x}
          cy={vertex.point.y}
          r={FOCUS_RING_RADIUS}
          fill="none"
          strokeWidth={FOCUS_RING_WIDTH}
          className={FOCUS_RING_CLASSES}
        />
      </g>
    );
  }

  return (
    <g>
      <polygon
        points={pointListOf(vertices.map((vertex) => vertex.point))}
        fillOpacity={SERIES_AREA_OPACITY}
        strokeWidth={SERIES_STROKE_WIDTH}
        strokeLinejoin="round"
        className={`${tone.area} ${tone.line}`}
      />
      {vertices.map(renderMark)}
    </g>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The chart
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders the five-axis resilience radar of the competitive atlas.
 *
 * The drawing is presentational by contract: it takes the axes and the series the atlas payload
 * carried and draws one outline per series, one labelled mark per reading, and one name-and-label
 * line per series beneath them. It reads no clock, sends no request and computes no domain figure,
 * so a re-render of the atlas draws the same radar from the same payload.
 *
 * The component holds one piece of state — which evidence is open — and nothing else: activating a
 * mark asks the caller where that reading's evidence lives, opens `./evidence-drawer.tsx` beside the
 * drawing when it is told, and reports the series through `onActivate`. The drawer is a sibling of
 * the `<svg>` rather than a child of it, because a dialog is not an SVG element and the drawer
 * portals itself out of the flow anyway; keeping it outside the drawing also keeps it out of the
 * drawing's accessible name and out of its group.
 *
 * The height grows with the number of series, so the name band below the axes always fits whatever
 * the payload carries and no label is clipped.
 */
export function RadarChart({
  axes,
  series,
  onActivate,
  evidenceRefFor,
}: RadarChartProps): JSX.Element {
  const [openEvidenceRef, setOpenEvidenceRef] = useState<string | null>(null);

  const viewHeight = LABEL_BAND_TOP + series.length * SERIES_LABEL_ROW_HEIGHT + LABEL_BAND_PADDING;

  function activateVertex(seriesId: string, evidenceRef: string | null): void {
    onActivate?.(seriesId);

    if (evidenceRef !== null) {
      setOpenEvidenceRef(evidenceRef);
    }
  }

  return (
    <>
      <svg
        role="group"
        aria-label={RADAR_CHART_TEXT.groupLabel}
        viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`}
        className={SVG_CLASSES}
      >
        {/* The scale: the rings and the spokes, which frame the readings without stating one. */}
        <g aria-hidden="true">
          {RING_FRACTIONS.map((fraction) => (
            <circle
              key={fraction}
              cx={CENTRE_X}
              cy={CENTRE_Y}
              r={RADIUS * fraction}
              fill="none"
              strokeWidth={RING_STROKE_WIDTH}
              className="stroke-hairline"
            />
          ))}
          {axes.map((axis, index) => {
            const end = pointOnAxis(index, axes.length, 1);

            return (
              <line
                key={axis.id}
                x1={CENTRE_X}
                y1={CENTRE_Y}
                x2={roundCoordinate(end.x)}
                y2={roundCoordinate(end.y)}
                strokeWidth={RING_STROKE_WIDTH}
                className="stroke-hairline"
              />
            );
          })}
        </g>

        {series.map((one) => (
          <SeriesLayer
            key={one.id}
            series={one}
            allSeries={series}
            axes={axes}
            evidenceRefFor={evidenceRefFor}
            onActivate={onActivate}
            onVertexActivate={activateVertex}
          />
        ))}

        {axes.map((axis, index) => {
          const outer = pointOnAxis(
            index,
            axes.length,
            (RADIUS + AXIS_LABEL_OFFSET) / RADIUS,
          );

          return (
            <text
              key={axis.id}
              x={roundCoordinate(outer.x)}
              y={roundCoordinate(outer.y)}
              textAnchor={axisLabelAnchorFor(index, axes.length)}
              dominantBaseline="middle"
              className="text-12 fill-text-secondary"
            >
              {axis.label}
            </text>
          );
        })}

        {series.map((one, index) => {
          const lines = labelLinesOf(one);
          const top = LABEL_BAND_TOP + index * SERIES_LABEL_ROW_HEIGHT;

          return (
            <g key={one.id}>
              <text x={SERIES_LABEL_X} y={top} className="text-12 fill-text-primary">
                {lines.name}
              </text>
              <text
                x={SERIES_LABEL_X}
                y={top + SERIES_LABEL_LINE_HEIGHT}
                className="text-12 fill-text-caption"
              >
                {lines.companion}
              </text>
            </g>
          );
        })}
      </svg>
      {openEvidenceRef === null ? null : (
        <EvidenceDrawer
          evidenceRef={openEvidenceRef}
          onClose={() => {
            setOpenEvidenceRef(null);
          }}
        />
      )}
    </>
  );
}

