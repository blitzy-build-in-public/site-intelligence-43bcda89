/**
 * The five-axis resilience radar of the competitive atlas: one polygon per series, drawn apart,
 * and no combined reading anywhere on the drawing.
 *
 * Fixing inputs: AAP §0.8, which keeps first-party and market-intelligence series apart and has
 * the radar draw each series separately; AAP §0.10, where the client radar series' own tag sits
 * beside the seven §5.3 `SimLabel` strings rather than inside them; and AAP §0.5.2, which places
 * `RadarChart` among the typed-series charts drawn as custom SVG with no charting dependency.
 *
 * WHY EACH SERIES IS DRAWN SEPARATELY (rule P-5). A radar is where provenance is normally
 * blended: the familiar version fills one area per company and puts an average "resilience score"
 * beside it. This component has no such member — every entry in `series` is its own polygon with
 * its own vertices and its own visible label, and nothing here sums, averages or ranks two
 * series, so a caller looking for a combined figure has nowhere to obtain one.
 *
 * WHY NO COMPANION STRING IS WRITTEN HERE (rule P-1). `COMPETITOR_NAME_TAG` is imported from
 * `../types`, so a reworded tag moves in one place and this module follows it, and every series'
 * label line is the companion label its own record carries. Neither the tag nor a label literal
 * appears in this file, and no series is relabelled from its provenance.
 *
 * WHY THE SWATCH LEGEND IS NOT HERE. The calling screen renders `./legend.tsx` from the same
 * `AtlasSeries` data, so a series' swatch and its polygon resolve one role token — the chart tone
 * table `./horizontal-bar-chart.tsx` exports — and `competitorSlotOf` picks which of the three
 * competitor hues it is, by identifier rather than by position in either list. This drawing prints
 * each series' name and its companion tag itself and leaves the colour legend to the screen.
 */
import { useRef, useState } from 'react';
import type {
  JSX,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

import { COMPETITOR_NAME_TAG } from '../types';
import type { AtlasSeries, RadarAxis } from '../types';

import { EvidenceDrawer } from './evidence-drawer';
import { ChartReadout, chartTargetRadius, useChartScale } from './chart-readout';
import { CHART_TONE_CLASSES, competitorSlotOf } from './horizontal-bar-chart';
import type { CompetitorSlot } from './horizontal-bar-chart';
import { SeriesBand } from './series-band';
import type { SeriesBandGeometry, SeriesBandRow } from './series-band';
import {
  LABEL_CLEARANCE,
  SVG_LABEL_TEXT_METRICS,
  estimateTextWidth,
  placeLabels,
} from './svg-label';
import type { LabelBox, LabelFit, LabelObstacle, LabelPlacement, LabelRequest } from './svg-label';

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

/**
 * What the atlas screen hands {@link RadarChart}: the axes and the series exactly as the market
 * pack states them, the identifier of the series it holds in view, and the mapper that resolves a
 * reading's evidence. Every series stays its own polygon with its own label, so no member here
 * combines two of them (rule P-5), and the mapper is required because a vertex may not lose its
 * evidence silently (AAP 0.5.2).
 */
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
   * The series the screen holds as the entity in view, or `null` when it holds none.
   *
   * WHAT IT MARKS, AND WHY STRUCTURALLY. The entity in view is marked inside the drawing rather than
   * only in the caption beside it: the selected series' outline is drawn with a heavier stroke than
   * every other series' and its name line in the label band states `aria-current` and takes the
   * emphasised weight. Nothing else changes — every series stays drawn, every vertex keeps its own
   * accessible name and its own evidence, and no reading is added, removed or restated (rule P-8:
   * the selector performs the selection it presents; rule B-3: the state is stroke weight, text
   * weight and `aria-current`, never hue alone).
   *
   * OPTIONAL, AND OMITTING IT HIGHLIGHTS NOTHING. A caller that reports no entity passes nothing and
   * receives the drawing every other caller receives; a caller that reports one passes its
   * identifier, and an identifier the drawing does not hold marks no series rather than failing.
   */
  readonly selectedSeriesId?: string | null | undefined;

  /**
   * Called with the series' identifier whenever one of its vertices is activated.
   *
   * A vertex becomes a control when this handler is supplied or {@link RadarChartProps.evidenceRefFor}
   * resolves a reference for it, so a screen that only needs to learn which series a reader picked
   * passes this alone, and a chart whose mapper resolves nothing draws plain marks that operate
   * nothing (rule P-8).
   */
  readonly onActivate?: ((seriesId: string) => void) | undefined;

  /**
   * Resolves the evidence reference a vertex opens, given the series and the axis it sits on.
   * Required.
   *
   * REQUIRED BECAUSE A MARK MAY NOT LOSE ITS EVIDENCE SILENTLY. AAP 0.2.1 F12 opens the evidence
   * drawer from "any figure, chart mark, node, arc or pin", and AAP 0.5.2 fixes "typed series with
   * `evidenceRef` per mark" for this chart beside the other three. An optional collection would let a
   * caller omit that decision without noticing, so the caller states it here — per mark, which is the
   * shape the requirement has.
   *
   * WHAT A RETURNED REFERENCE MUST BE. One the service's `getEvidence` read resolves, which selects a
   * family by its own shape and looks the record up by its exact identifier: the composed aggregates
   * (`overview:`, `canvas:`), one atlas series as `atlas:<seriesId>`, the record families `PPAP-`,
   * `EXC-`, `SCN-`, `APR-`, `AUD-`, `PIN-`, `DOC-`, `CO-` and `PO-`, the policy family `POL-`, the
   * seven node families, the market-intelligence pack's `CHK-` crossing, its `CMP-` site and network
   * and `PLT-` client plant, a radar reading's `SER-…` or `SER-…#AX-…`, and a declared outbound endpoint
   * by the endpoint string its own ledger row states. `AtlasSeries` carries no per-score reference, so
   * which record stands behind a series' score is the calling screen's to name —
   * `src/features/scr-13-competitive-atlas/competitive-atlas-screen.tsx` composes the
   * `<series id>#<axis id>` form the reading family answers. A reference this chart composed, or one
   * naming a record the service does not hold, would open a drawer reporting the not-found refusal for
   * that reference instead of the record behind the mark.
   *
   * `undefined` IS AN ANSWER, AND AN HONEST ONE. It says no record stands behind that reading. The
   * vertex then stays a plain dot, which reports the series' selection through
   * {@link RadarChartProps.onActivate} and opens no dialog, so a mark is never a control that claims
   * evidence it cannot show (rule P-8).
   */
  readonly evidenceRefFor: (seriesId: string, axisId: string) => string | undefined;
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
 * Four rings give a reader a coarse quartile reading, and the two of them the scale states a value for are
 * named by {@link RING_TICKS}: the outer ring is the scale's upper bound and the middle one its midpoint,
 * so a reader can read the axis off the plot rather than only out of a vertex's accessible name. Those two
 * values are derived from {@link SCORE_MIN} and {@link SCORE_MAX}, so no score is typed onto the screen
 * (rule P-6).
 */
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1] as const;

const RING_STROKE_WIDTH = 1;
const SERIES_STROKE_WIDTH = 2;

/**
 * The stroke the series in view is drawn with: heavier than every other series', and geometric —
 * a drawing weight, not a figure and not a reading (rule P-6).
 *
 * It is the first of the two cues the entity in view gets inside the drawing, the other being
 * `aria-current` on its label-band row and the emphasised weight of that row's name, so a reader who
 * cannot separate two hues still sees and hears which series the screen reports on (rule B-3).
 */
const SELECTED_SERIES_STROKE_WIDTH = 3.5;

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

/**
 * How far beyond its own vertex a series' polygon label is placed, along the extension of the axis
 * that vertex sits on.
 *
 * It is drawing geometry and nothing else — a distance in the chart's own user units, chosen to carry
 * the label's swatch clear of the vertex dot and of the polygon's stroke — and no reading, scale or
 * figure is derived from it (rule P-6). It is also smaller than {@link AXIS_LABEL_OFFSET}, so a label
 * on a reading at the top of the scale still sits inside the axis names rather than over them.
 */
const POLYGON_LABEL_OFFSET = 14;

/** The swatch beside a polygon label, the gap between it and the words, and one line of their type step. */
const POLYGON_LABEL_SWATCH_RADIUS = 2.5;
const POLYGON_LABEL_GAP = 5;
const POLYGON_LABEL_LINE_HEIGHT = 12;

/**
 * How thick the halo behind a polygon label's words is, in the drawing's own user units.
 *
 * A label is placed clear of its own polygon, but the axes and the other series' outlines still run
 * through the space its words occupy, so the words are stroked in the surface role the card behind the
 * drawing paints and filled after it (see {@link POLYGON_LABEL_TEXT_CLASSES}), which is the device
 * `src/components/map-canvas.tsx` already uses for the same problem on its own labels. Half the width
 * falls inside the glyph, where the fill
 * paints over it, so this leaves a ring of roughly a unit and a half around twelve-pixel type: enough
 * to break the stroke a letter crosses, and narrow enough that the halo never reaches a neighbour's
 * glyph.
 *
 * It is drawing geometry — a stroke weight beside {@link RING_STROKE_WIDTH} and {@link
 * SERIES_STROKE_WIDTH}, not a reading, a scale or a figure, and nothing is derived from it (rule P-6).
 */
const POLYGON_LABEL_HALO_WIDTH = 3;

/**
 * How close to vertical an axis must be for its label to be centred above or below its swatch.
 *
 * The horizontal component of the axis direction is compared against this, so a label on a nearly
 * vertical axis never grows sideways into a neighbouring label, and one on a slanted axis grows out
 * towards the side of the drawing that axis points at.
 */
const POLYGON_LABEL_VERTICAL_TOLERANCE = 0.3;

/**
 * A vertex: the dot a reader sees, the larger invisible target around it, and its focus ring.
 *
 * {@link MARK_HIT_RADIUS} is the target's radius in the drawing's own units at the size the drawing is
 * drawn at its natural width; the radius actually drawn comes from `./chart-readout.tsx`'s
 * `chartTargetRadius`, which grows it until the target is 24 CSS pixels across at the width the element
 * is rendered at — the minimum rule B-3 sets, which the view box's proportions cannot express.
 */
const MARK_RADIUS = 3.5;
const MARK_HIT_RADIUS = 12;
const FOCUS_RING_RADIUS = 9;
const FOCUS_RING_WIDTH = 3;

/**
 * The band below the axes that carries one name line and one label line per series.
 *
 * It starts far enough below the centre for the lowest point of the drawing — the swatch of a polygon
 * label on a reading at the bottom of the scale, which sits {@link POLYGON_LABEL_OFFSET} beyond the
 * outer ring — to fall above the band, so no label overlaps a series row.
 */
const SERIES_LABEL_X = 24;
const LABEL_BAND_TOP = 370;
const SERIES_LABEL_ROW_HEIGHT = 34;
const SERIES_LABEL_LINE_HEIGHT = 16;
const LABEL_BAND_PADDING = 12;

/**
 * Where this drawing's band starts, how its rows are spaced and how wide a line may be.
 *
 * `./series-band.tsx` owns the row itself — the two text roles, the truncation and the row in view's
 * emphasis — so this drawing states only its own geometry: the band begins {@link LABEL_BAND_TOP} below
 * the axes, one row per series {@link SERIES_LABEL_ROW_HEIGHT} apart, with the companion line
 * {@link SERIES_LABEL_LINE_HEIGHT} below its name, and no line may run past the drawing's own width. No
 * swatch column is stated because this band prints none: each series' polygon at its own outline carries
 * its colour, and the screen's `./legend.tsx` carries the swatch.
 */
const BAND_GEOMETRY: SeriesBandGeometry = {
  top: LABEL_BAND_TOP,
  rowHeight: SERIES_LABEL_ROW_HEIGHT,
  lineHeight: SERIES_LABEL_LINE_HEIGHT,
  textX: SERIES_LABEL_X,
  maxTextWidth: VIEW_WIDTH - SERIES_LABEL_X - LABEL_CLEARANCE,
};

/**
 * The pack scale the seed's market-intelligence records use, and the only two numbers the geometry
 * needs: a score is placed by how far it runs from the first to the second.
 *
 * `RadarAxis` declares no bounds, so the scale is this chart's concern: the pack scores its readings as
 * integers from zero to one hundred, its strongest reading the upper bound. A reading outside them is
 * drawn at the nearest ring rather than off the drawing ({@link axisFraction}), and the drawing prints
 * only this scale's midpoint and upper bound, computed from these constants, so none is typed (P-6).
 */
const SCORE_MIN = 0;
const SCORE_MAX = 100;

/** Coordinates are rounded to two decimals so the emitted markup stays readable and stable. */
const COORDINATE_PRECISION = 100;

/* ---------------------------------------------------------------------------------------------
 * Colours — one role token per series family, resolved from the table that owns them
 * ------------------------------------------------------------------------------------------- */

/** One series' resolved colours: the wash inside its polygon and the outline around it. */
interface SeriesTone {
  /** The `fill-` utility of the series' role token. */
  readonly area: string;
  /** The `stroke-` utility of the same role token. */
  readonly line: string;
}

/**
 * The client's own series tone, the only one that is not selected by an ordinal: the accent entry of
 * the one chart tone table, which specification §4.1 reserves for first-party flows.
 *
 * It is a role token like the others, so the client's series cannot be painted in a competitor's hue
 * on one theme and something else on the other, and both utilities are read from the same entry, so
 * the polygon's wash and its outline cannot disagree about which tone the series is drawn in.
 */
const CLIENT_TONE: SeriesTone = {
  area: CHART_TONE_CLASSES.accent.fill,
  line: CHART_TONE_CLASSES.accent.stroke,
};

/**
 * The slot a competitor's series is drawn in, taken from the competitor the series scores.
 *
 * WHY THE IDENTIFIER AND NOT THIS LIST'S ORDER. The three competitor hues are positional, but the
 * order this chart receives its series in is the caller's: a radar list and the network list can be
 * ordered differently, and a hue resolved from a position in either paints one competitor in two
 * colours. `AtlasSeries.competitorId` names the network a series scores, so the slot is resolved from
 * that record field by {@link competitorSlotOf} — the one lookup `./legend.tsx`,
 * `./horizontal-bar-chart.tsx` and the atlas network view read too — and a reordered payload moves
 * the polygons without moving a single hue.
 *
 * A series that is not market intelligence has no slot and yields `null`, which is how the client's
 * own series is told apart without a second union. A competitor series whose identifier states no
 * ordinal of its own yields `null` as well; {@link toneOf} then paints it in the first competitor hue
 * rather than in the client's accent, because painting a competitor in the first-party accent would
 * present a market-intelligence reading as the client's own (rule P-5).
 *
 * @param series - The series the chart is drawing, in the caller's order.
 * @param seriesId - The identifier of the series whose slot is wanted.
 * @returns The competitor slot `1`, `2` or `3`, or `null` when the series is not a competitor's.
 */
export function competitorToneOf(
  series: readonly AtlasSeries[],
  seriesId: string,
): CompetitorSlot | null {
  const one = series.find((candidate) => candidate.id === seriesId);

  if (one === undefined || one.provenance !== 'market_intelligence') {
    return null;
  }

  return competitorSlotOf(one.competitorId);
}

/**
 * The colours one series is drawn in, resolved from its provenance and its slot.
 *
 * Provenance decides the family — market intelligence takes a competitor hue, anything else is the
 * client's own first-party side and takes the accent — and the competitor's identifier decides which
 * of the three competitor hues. A market-intelligence series that resolves no slot still receives a
 * competitor hue rather than the accent, because painting a competitor in the first-party accent
 * would present a market-intelligence reading as the client's own (rule P-5).
 *
 * The hues themselves come from `./horizontal-bar-chart.tsx`'s {@link CHART_TONE_CLASSES}, the one
 * table in which a chart tone becomes a role token, so a polygon, the legend row that names it and
 * the other chart surfaces all paint the same token and a re-pointed role reaches them together.
 * Nothing here names a colour utility of its own.
 */
function toneOf(series: readonly AtlasSeries[], one: AtlasSeries): SeriesTone {
  if (one.provenance !== 'market_intelligence') {
    return CLIENT_TONE;
  }

  const entry = CHART_TONE_CLASSES[`competitor-${competitorToneOf(series, one.id) ?? 1}`];

  return { area: entry.fill, line: entry.stroke };
}

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The drawing itself: it fills the width its frame gives it and keeps the `viewBox` ratio. */
const SVG_CLASSES = 'block h-auto w-full min-w-0';

/**
 * The box the drawing and its read-out share: `relative`, so a read-out placed at a share of the view
 * box lands on the vertex it describes without either of them being measured.
 */
const SURFACE_WRAPPER_CLASSES = 'relative';

/**
 * A polygon label's words: the primary text role, haloed in the card surface role behind its fill.
 *
 * The fill is the token specification §4 measures for text and is the same one the label band's rows
 * print in, so the halo never changes the contrast a reader reads the name at (rule B-3); the stroke
 * is a role token of the theme — never a raw colour, and never a second fill that would restate the
 * glyph. With `paint-order: stroke` on the element (see {@link POLYGON_LABEL_HALO_WIDTH}) the stroke
 * is painted first and the fill over it, which is what turns the stroke into a halo around the words
 * rather than an outline across them.
 */
const POLYGON_LABEL_TEXT_CLASSES = 'text-12 fill-text-primary stroke-surface-1';

/**
 * A vertex that can act: the whole mark, with the visible dot and the invisible target around it.
 *
 * The target is the size rule B-3 asks a mark to present, and it is sized in CSS pixels rather than in
 * the drawing's own units (WCAG 2.2 SC 2.5.8): `./chart-readout.tsx`'s `chartTargetRadius` grows the
 * radius until the target is 24 CSS pixels across at the width the drawing is rendered at, so a narrow
 * panel keeps the same target a wide one has. Its size never decides which reading a pointer gets: the
 * drawing answers the vertex *nearest* the pointer ({@link nearestRadarMark}) rather than the target the
 * browser hit, so two targets that overlap cannot hand one reading's pointer to another. The `group`
 * marker is what the ring's keyboard variant hangs on.
 */
const MARK_GROUP_CLASSES = 'group cursor-pointer';

/**
 * The ring around one vertex: the `focus-ring` role the token layer measures for that purpose in both
 * themes, revealed while the vertex is the active one.
 *
 * WHICH STATE PAINTS IT. The vertex the drawing's pointer resolution picked, and the vertex the
 * keyboard is on, are held in React state by the chart below, and that state paints the ring through
 * {@link FOCUS_RING_VISIBLE_CLASSES} and leaves it invisible through {@link FOCUS_RING_HIDDEN_CLASSES}.
 * `group-focus-visible` stays beside that state as an extra cue for the keyboard. There is deliberately
 * no `group-hover` and no `group-active` variant: a hover and a press belong to the topmost target the
 * browser hit, which is not always the vertex the drawing resolved, so a ring lit by them would sit on
 * a different reading than the one the read-out names. The state is what makes the ring correct, and
 * that is also why a reader on a device reporting no hover still sees the vertex they are pointing at
 * together with the read-out that belongs to it. No state repaints the reading the vertex encodes, and
 * `motion-safe:` carries the fade, which is the only property any of these states changes (rule B-3).
 */
const FOCUS_RING_STATE_CLASSES =
  'stroke-focus-ring group-focus-visible:opacity-100 motion-safe:transition-opacity motion-safe:duration-150';
const FOCUS_RING_HIDDEN_CLASSES = 'opacity-0';
const FOCUS_RING_VISIBLE_CLASSES = 'opacity-100';

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
 * The angle one axis points at, in radians.
 *
 * The first axis points straight up and the rest follow clockwise, so the shape reads the way a
 * resilience radar is conventionally laid out regardless of how many axes a payload carries.
 */
function axisAngle(axisIndex: number, axisCount: number): number {
  return -Math.PI / 2 + ((Math.PI * 2) / axisCount) * axisIndex;
}

/**
 * The point at a given distance along one axis.
 *
 * The fraction is how far along the axis the point sits: `1` is the outer ring, `0` the centre.
 */
function pointOnAxis(axisIndex: number, axisCount: number, fraction: number): ChartPoint {
  if (axisCount <= 0) {
    return { x: CENTRE_X, y: CENTRE_Y };
  }

  const angle = axisAngle(axisIndex, axisCount);
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
  /** The axis' own name, which is the heading of the read-out this vertex shows. */
  readonly axisLabel: string;
  /** The score as the record states it, for the read-out's value. Never recomputed here. */
  readonly scoreText: string;
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
      axisLabel: axis.label,
      scoreText: String(value),
    });
  }

  return vertices;
}

/* ---------------------------------------------------------------------------------------------
 * Polygon labels — each series' own name printed at its own outline
 * ------------------------------------------------------------------------------------------- */

/** Where one series' own label is printed: its vertex, its swatch and the anchor of its words. */
interface PolygonLabel {
  /** The vertex the label describes, where its leader line starts. */
  readonly vertex: ChartPoint;
  /** The point the label's swatch sits at, radially outward from the vertex. */
  readonly swatch: ChartPoint;
  /** The point the words are anchored at, on the drawing's own grid. */
  readonly text: ChartPoint;
  /** Which end of the words the anchor is, so they grow back towards the drawing's centre. */
  readonly anchor: AxisLabelAnchor;
}

/**
 * Where one series' polygon label is printed: at the vertex it draws on the axis its index states.
 *
 * THE PLACEMENT RULE (rule P-1). The axis is `seriesIndex % axes.length`, so five series name their
 * polygons on five different axes, and a drawing of MORE series than axes wraps around — two polygons
 * then share an axis and are told apart by where their own readings place their vertices, each with
 * its own swatch and its own leader line. The swatch sits {@link POLYGON_LABEL_OFFSET} beyond that
 * vertex along the axis, and the words sit outside it in two directions at once: sideways away from
 * the drawing's vertical centre line, and one line further out than their swatch towards the drawing's
 * horizontal centre line. That is what keeps a label clear of the axis name printed at the outer end of
 * the SAME spoke (which lies further out along it) and clear of its neighbour's label on the far side
 * of the centre line, so two names never cross on a five-axis drawing.
 *
 * A series that states no reading on its axis is labelled at the outer ring rather than at the centre:
 * the label then names the polygon without claiming a score the record never stated (rule P-6).
 *
 * @param series The series the label names.
 * @param axes The axes every series aligns to.
 * @param seriesIndex The series' position in the drawing order, which selects its axis.
 * @returns The label's geometry, or `null` when the payload states no axis to place it on.
 */
function polygonLabelOf(
  series: AtlasSeries,
  axes: readonly RadarAxis[],
  seriesIndex: number,
): PolygonLabel | null {
  if (axes.length === 0) {
    return null;
  }

  const axisIndex = seriesIndex % axes.length;
  const value = series.values[axisIndex];
  const fraction = value === undefined ? 1 : axisFraction(value);
  const vertex = pointOnAxis(axisIndex, axes.length, fraction);
  const angle = axisAngle(axisIndex, axes.length);
  const outwardX = Math.cos(angle);
  const outwardY = Math.sin(angle);
  const swatch = {
    x: vertex.x + outwardX * POLYGON_LABEL_OFFSET,
    y: vertex.y + outwardY * POLYGON_LABEL_OFFSET,
  };
  const sideways = POLYGON_LABEL_SWATCH_RADIUS + POLYGON_LABEL_GAP;
  const nearby = sideways + POLYGON_LABEL_LINE_HEIGHT;
  const textY = swatch.y + (outwardY <= 0 ? nearby : -nearby);

  if (outwardX > POLYGON_LABEL_VERTICAL_TOLERANCE) {
    return { vertex, swatch, text: { x: swatch.x + sideways, y: textY }, anchor: 'start' };
  }

  if (outwardX < -POLYGON_LABEL_VERTICAL_TOLERANCE) {
    return { vertex, swatch, text: { x: swatch.x - sideways, y: textY }, anchor: 'end' };
  }

  return { vertex, swatch, text: { x: swatch.x, y: textY }, anchor: 'middle' };
}

/* ---------------------------------------------------------------------------------------------
 * The scale's own values — the two rings that state what the axis measures
 * ------------------------------------------------------------------------------------------- */

/**
 * The rings the scale states a value for: the midpoint and the outer ring.
 *
 * Two values rather than four, because a reader needs the scale's span and its half to place any reading
 * between them, and a value on every ring would print four numbers beside a drawing whose readings are
 * already named at every vertex. The fractions are the rings' own, so the values fall exactly on rings the
 * drawing paints, and each value is computed from {@link SCORE_MIN} and {@link SCORE_MAX} — the scale the
 * market pack's scores are recorded on — rather than typed (rule P-6).
 */
const RING_TICK_FRACTIONS: readonly number[] = [0.5, 1];

/**
 * The scale's values: the caption role, haloed by the surface behind the drawing.
 *
 * The caption role is what an annotation takes in this layer, and the surface-role stroke, painted before
 * the fill, is the same device the polygon labels use: a ring or a spoke passing under the words is broken
 * around them rather than running through the glyphs (rule B-3).
 */
const RING_TICK_CLASSES = 'text-12 fill-text-caption stroke-surface-1';

/**
 * The room the scale's values are placed in, and how far from their ring they are tried.
 *
 * The bounds stop above the series band, so a value never prints among the rows; the distances start close
 * to the ring because a value belongs beside the circle it measures, and step outward only when an axis
 * name or a polygon label already sits there.
 */
const RING_TICK_FIT: LabelFit = {
  metrics: SVG_LABEL_TEXT_METRICS,
  bounds: { width: VIEW_WIDTH, height: LABEL_BAND_TOP - LABEL_CLEARANCE },
  boxHeight: SVG_LABEL_TEXT_METRICS.fontSize + 3,
  lineHeight: SVG_LABEL_TEXT_METRICS.fontSize,
  clearance: LABEL_CLEARANCE,
  markRadius: POLYGON_LABEL_SWATCH_RADIUS,
  distances: [6, 14, 24, 36, 52],
  maxTextWidth: VIEW_WIDTH - 2 * LABEL_CLEARANCE,
};

/** One value the scale states: which ring it names, what it says and the point on that ring. */
interface RingTick {
  /** A stable key: the ring's own fraction. */
  readonly key: string;
  /** The ring the value names, as a fraction of {@link RADIUS}. */
  readonly fraction: number;
  /** The value itself, on the scale {@link SCORE_MIN}–{@link SCORE_MAX}. */
  readonly value: string;
  /** The point on that ring the value is placed beside. */
  readonly point: ChartPoint;
}

/**
 * The values the scale states, each on the ring it names.
 *
 * They sit on the direction halfway between the first two spokes rather than on a spoke itself, so a value
 * never starts out on top of an axis name; the placement still answers for an axis name or a polygon label
 * that reaches the space, and steps the value outward when it does. A drawing that states no axis has no
 * spoke to sit between, so the direction falls back to the one a single spoke would leave free.
 *
 * @param axisCount How many axes the drawing carries.
 * @returns One value per ring the scale states.
 */
function ringTicksOf(axisCount: number): readonly RingTick[] {
  const count = Math.max(1, axisCount);
  const angle = axisAngle(0, count) + Math.PI / count;

  return RING_TICK_FRACTIONS.map((fraction) => ({
    key: `ring-${String(fraction)}`,
    fraction,
    value: String(Math.round(SCORE_MIN + fraction * (SCORE_MAX - SCORE_MIN))),
    point: {
      x: roundCoordinate(CENTRE_X + RADIUS * fraction * Math.cos(angle)),
      y: roundCoordinate(CENTRE_Y + RADIUS * fraction * Math.sin(angle)),
    },
  }));
}

/**
 * The box one label's text occupies, as the placement reasons about it.
 *
 * A label is anchored at its start, its middle or its end, and its box grows away from that anchor, so the
 * box's left edge is the anchor for a start-anchored run and moves left by the run's width for the other
 * two. The height is one type step above the baseline, which is where the placement keeps its clear space.
 *
 * @param text The run the label prints.
 * @param point Where the label's anchor sits.
 * @param anchor Which end of the run the anchor is.
 * @returns The label's box.
 */
function textBoxOf(text: string, point: ChartPoint, anchor: AxisLabelAnchor): LabelBox {
  const width = estimateTextWidth(text, SVG_LABEL_TEXT_METRICS);
  const left =
    anchor === 'start' ? point.x : anchor === 'end' ? point.x - width : point.x - width / 2;

  return {
    x: left,
    y: point.y - SVG_LABEL_TEXT_METRICS.fontSize,
    width,
    height: SVG_LABEL_TEXT_METRICS.fontSize + 3,
  };
}

/**
 * Where an axis name is printed: on the extension of its own spoke, {@link AXIS_LABEL_OFFSET} beyond the
 * outer ring.
 *
 * @param axisIndex The axis' position among the axes.
 * @param axisCount How many axes the drawing carries.
 * @returns The point the axis name is anchored at.
 */
function axisLabelPointFor(axisIndex: number, axisCount: number): ChartPoint {
  return pointOnAxis(axisIndex, axisCount, (RADIUS + AXIS_LABEL_OFFSET) / RADIUS);
}

/**
 * Every printed name a scale value must keep clear of: each axis name and each series' polygon label.
 *
 * The series band is excluded by the fit's own bounds rather than by an obstacle, because no value may be
 * placed among the rows at all.
 *
 * @param axes The axes the drawing carries.
 * @param series The series the drawing carries, in drawing order.
 * @returns One obstacle per axis name and per polygon label.
 */
function ringTickObstaclesOf(
  axes: readonly RadarAxis[],
  series: readonly AtlasSeries[],
): readonly LabelObstacle[] {
  const obstacles: LabelObstacle[] = [];

  for (const [index, axis] of axes.entries()) {
    obstacles.push({
      key: `axis-name:${axis.id}`,
      box: textBoxOf(
        axis.label,
        axisLabelPointFor(index, axes.length),
        axisLabelAnchorFor(index, axes.length),
      ),
    });
  }

  for (const [index, one] of series.entries()) {
    const label = polygonLabelOf(one, axes, index);

    if (label === null) {
      continue;
    }

    obstacles.push({
      key: `polygon-label:${one.id}`,
      box: textBoxOf(one.label, label.text, label.anchor),
    });
  }

  return obstacles;
}

/**
 * Where the scale's values are printed, keyed by the ring each one names.
 *
 * The placement is `./svg-label.ts`'s, so a value steps outward from its ring rather than printing over an
 * axis name or a polygon label, and a value nothing can be cleared for is left off the drawing instead of
 * overprinting one.
 *
 * @param ticks The values the scale states.
 * @param axes The axes the drawing carries.
 * @param series The series the drawing carries, in drawing order.
 * @returns One placement per value that has room.
 */
function ringTickPlacementsOf(
  ticks: readonly RingTick[],
  axes: readonly RadarAxis[],
  series: readonly AtlasSeries[],
): ReadonlyMap<string, LabelPlacement> {
  const requests: LabelRequest[] = ticks.map((tick) => ({
    key: tick.key,
    lines: [tick.value],
    x: tick.point.x,
    y: tick.point.y,
  }));

  return placeLabels(requests, ringTickObstaclesOf(axes, series), RING_TICK_FIT);
}

/* ---------------------------------------------------------------------------------------------
 * Pointer resolution — the press belongs to the vertex nearest it, not to the topmost target
 * ------------------------------------------------------------------------------------------- */

/**
 * The vertex a reader is pointing at or has focused, as the series and the axis it belongs to.
 *
 * The identity is the two identifiers themselves rather than a selector string assembled from them: the
 * ring and the read-out both have to locate the same reading, and a key parsed back into its parts
 * would be a second source of truth beside the one the marks were rendered with.
 */
interface ActiveVertex {
  /** The series whose record the vertex belongs to. */
  readonly seriesId: string;

  /** The axis the vertex sits on. */
  readonly axisId: string;
}

/** Whether two vertices are one and the same reading, so a ring and a read-out cannot disagree. */
function isSameVertex(one: ActiveVertex | null, other: ActiveVertex): boolean {
  return one !== null && one.seriesId === other.seriesId && one.axisId === other.axisId;
}

/**
 * The key one vertex's own control is held under, so the drawing can reach the element a reading was
 * rendered as.
 *
 * The two identifiers are joined through a separator no identifier carries, rather than concatenated
 * bare, so no series and axis pair can compose a key another pair also composes.
 */
function vertexKeyOf(vertex: ActiveVertex): string {
  return `${vertex.seriesId}\u0000${vertex.axisId}`;
}

/** One vertex a press can resolve to: the reading it reports and the point its dot is drawn at. */
interface RadarMarkCentre {
  /** The series whose record the vertex opens, or which the press reports through `onActivate`. */
  readonly seriesId: string;
  /** The axis the vertex sits on, which is the other half of the evidence it opens. */
  readonly axisId: string;
  /** The centre of the vertex's dot, in the drawing's own units. */
  readonly point: ChartPoint;
}

/**
 * The vertex a press at a point belongs to: the nearest centre within the target radius, or `null`.
 *
 * WHY THE NEAREST CENTRE AND NOT THE TOPMOST TARGET. Two vertices can be drawn closer together than
 * a target is wide — the targets must stay past the 24x24 px minimum rule B-3 asks for, and scores
 * on one axis may differ by a few units — so the target painted last covers the dot of another
 * series' vertex and would take a press aimed at it. Comparing the press against the centres answers
 * the question a reader is actually asking, "which dot did I press", on the drawing's own geometry
 * rather than on paint order, and it keeps the large targets that the pointer needs.
 *
 * Two vertices drawn at one centre are told apart by their order in `marks`, which is the order the
 * drawing paints them, so the answer is deterministic. A radius that is not positive, and a point the
 * browser could not resolve (a coordinate that is not a finite number), match nothing and yield
 * `null`, which is what keeps a press on empty space from activating a mark at all (rule P-8).
 *
 * BOTH POINTER ROUTES DISPATCH HERE. The drawing's pointer movement reads out this answer and its press
 * handler activates the same vertex, and the ring follows the vertex answered here even where another
 * series' target is painted above it. The keyboard route never comes here: focus lands on one mark.
 *
 * @param marks The vertices a press can resolve to, in the order the drawing paints them.
 * @param point The press, in the drawing's own coordinates.
 * @param radius How far from a vertex's centre a press still belongs to it, in the same units.
 * @returns The nearest vertex within `radius`, or `null` when the press is clear of every one.
 */
export function nearestRadarMark(
  marks: readonly RadarMarkCentre[],
  point: ChartPoint,
  radius: number,
): RadarMarkCentre | null {
  if (!(radius > 0)) {
    return null;
  }

  const limit = radius * radius;
  let nearest: RadarMarkCentre | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const mark of marks) {
    const offsetX = mark.point.x - point.x;
    const offsetY = mark.point.y - point.y;
    const distance = offsetX * offsetX + offsetY * offsetY;

    /* Strictly nearer, so the first of two vertices at one centre is the one answered. */
    if (distance <= limit && distance < nearestDistance) {
      nearest = mark;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * Whether a vertex is a control: activating it opens the evidence the caller resolved for it, or
 * reports its series through `onActivate`.
 *
 * The marks and the press resolution read this one predicate, so the vertices a press can reach are
 * exactly the vertices that act, and a plain dot is never activated by a press aimed beside it
 * (rule P-8).
 */
function vertexActs(
  evidenceRef: string | null,
  onActivate: ((seriesId: string) => void) | undefined,
): boolean {
  return evidenceRef !== null || onActivate !== undefined;
}

/**
 * The vertices a press can resolve to, in the order the drawing paints them: series by series, and
 * axis order within a series, which is the order the mark groups are rendered in.
 *
 * @param series The series the chart draws, in the caller's order.
 * @param axes The axes the series' values align to.
 * @param evidenceRefFor Resolves the evidence reference a vertex opens, or `undefined` where none.
 * @param onActivate Reports the series a reader picked, when the caller supplies the handler.
 * @returns Every vertex that acts, with the point its centre is drawn at.
 */
function activateableMarksOf(
  series: readonly AtlasSeries[],
  axes: readonly RadarAxis[],
  evidenceRefFor: (seriesId: string, axisId: string) => string | undefined,
  onActivate: ((seriesId: string) => void) | undefined,
): readonly RadarMarkCentre[] {
  const marks: RadarMarkCentre[] = [];

  for (const one of series) {
    for (const vertex of verticesOf(one, axes)) {
      if (vertexActs(evidenceRefFor(one.id, vertex.axisId) ?? null, onActivate)) {
        marks.push({ seriesId: one.id, axisId: vertex.axisId, point: vertex.point });
      }
    }
  }

  return marks;
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
 * unlabelled. Every other series — the client's own first-party self-assessment and a computed
 * first-party figure alike — prints the companion label its own record carries, which for the client's
 * series is the longer series-specific string that sits alongside the seven fixed labels rather than
 * inside them; a competitor's label on it would present the client's own reading as market
 * intelligence (rules P-1, P-5, AAP §0.8). The name tag is imported, so this function composes wording
 * it does not own.
 */
function labelLinesOf(one: AtlasSeries): SeriesLabelLines {
  if (one.provenance === 'market_intelligence') {
    return { name: `${one.label} ${COMPETITOR_NAME_TAG}`, companion: one.simLabel };
  }

  return { name: one.label, companion: one.simLabel };
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

/**
 * Props the two layers of one series share: the series itself, the whole list that resolves its
 * colour ordinal, and the axes its values align to.
 *
 * The outline and the marks read the same three props because they are two layers of one series and
 * have to place it alike; nothing else about them is held in common.
 */
interface SeriesGeometryProps {
  /** The series this layer draws. */
  readonly series: AtlasSeries;
  /** Every series the chart draws, which is what resolves this one's colour ordinal. */
  readonly allSeries: readonly AtlasSeries[];
  /** The axes the series' values align to. */
  readonly axes: readonly RadarAxis[];
}

/** Props of one series' mark group, the layer that carries that series' controls. */
interface SeriesMarksProps extends SeriesGeometryProps {
  /** Resolves the evidence reference a vertex opens, or `undefined` where no record stands behind it. */
  readonly evidenceRefFor: (seriesId: string, axisId: string) => string | undefined;
  /** Reports the series a reader picked, when the caller supplies the handler. */
  readonly onActivate: ((seriesId: string) => void) | undefined;
  /** Reports one activated vertex to the chart, which owns the evidence it has open. */
  readonly onVertexActivate: (seriesId: string, evidenceRef: string | null) => void;
  /** The vertex the drawing resolved or the keyboard is on, so its ring and the read-out can report it. */
  readonly activeVertex: ActiveVertex | null;
  /** Reports the vertex focus reached, which is the keyboard's own route to the ring and the read-out. */
  readonly onVertexFocus: (vertex: ActiveVertex) => void;
  /** Reports the vertex focus left. */
  readonly onVertexBlur: (vertex: ActiveVertex) => void;
  /**
   * Reports the element one acting vertex is rendered as, or `null` once it leaves the drawing.
   *
   * The drawing holds these so a press can put focus on the vertex it resolved: what a browser
   * focuses when a press begins is the topmost target under the pointer, which may belong to another
   * series, so the mark that acted has to be found by its own identity rather than by paint order.
   */
  readonly onVertexElement: (vertex: ActiveVertex, element: SVGGElement | null) => void;
  /** The radius each acting vertex's invisible target is drawn at, in the drawing's own units. */
  readonly hitRadius: number;
}

/** Props of one series' outline: the geometry it shares with its marks, and whether it is in view. */
interface SeriesOutlineProps extends SeriesGeometryProps {
  /** Whether the screen holds this series as the entity in view. */
  readonly isSelected: boolean;
}

/**
 * One series' outline: the `<g>` that owns that series' single polygon and nothing else.
 *
 * The outline is a group of its own, so the drawing's structure states the separation rule P-5
 * requires: one polygon element per series, never one polygon carrying two companies' readings and
 * never a shape standing in for a total. Nothing here aggregates, so a reader comparing the outlines
 * is comparing the records themselves.
 *
 * The series in view is drawn with a heavier stroke and every other series keeps its own, so the
 * emphasis is a drawing weight a reader can see in either theme and under either hue — never a hue
 * change and never a hidden series (rule B-3).
 *
 * It is transparent to pointer events, because the wash and the stroke are decoration for the
 * readings the vertex marks carry and no outline ever acts. An outline that took the pointer would
 * both swallow a mark's activation and hand one series' press to the record of another.
 */
function SeriesOutline({
  series,
  allSeries,
  axes,
  isSelected,
}: SeriesOutlineProps): JSX.Element | null {
  const vertices = verticesOf(series, axes);

  if (vertices.length === 0) {
    return null;
  }

  const tone = toneOf(allSeries, series);

  return (
    <g>
      <polygon
        points={pointListOf(vertices.map((vertex) => vertex.point))}
        fillOpacity={SERIES_AREA_OPACITY}
        strokeWidth={isSelected ? SELECTED_SERIES_STROKE_WIDTH : SERIES_STROKE_WIDTH}
        strokeLinejoin="round"
        pointerEvents="none"
        className={`${tone.area} ${tone.line}`}
      />
    </g>
  );
}

/**
 * One series' vertex marks: the `<g>` that holds its targets, its dots and its focus rings, one mark
 * per stated reading.
 *
 * The chart paints every outline before it paints any mark group, so no polygon and no other series'
 * decoration can sit above a mark in document order. A mark carries no pointer handler of its own: the
 * chart resolves the pointer on the drawing — the vertex nearest it is read out as the pointer moves and
 * activated when it is pressed — so pointing cannot be answered by a neighbouring target that happens to
 * be painted above the dot a reader aimed at, and no gesture can activate two vertices.
 *
 * A mark becomes a control only when activating it does something — it opens the evidence the caller's
 * mapper resolved for that vertex, or it reports the series through `onActivate`. A vertex the mapper
 * cannot resolve, on a series no handler reports, is drawn as a plain dot: a dot that took focus and
 * then did nothing would be a control that cannot act (rule P-8), and the drawing still shows every
 * reading it holds.
 *
 * WHAT A CONTROL REPORTS ABOUT ITSELF. A control hands the chart the element it is drawn as, through
 * `onVertexElement`, because a press activates the vertex the chart resolved and has to leave focus on
 * that same vertex: what a browser focuses when a press begins is the topmost target under the pointer,
 * which can be a neighbouring series' mark, and the vertex that acted is the one focus comes back to
 * when the evidence drawer closes (rule B-3).
 *
 * WHO DECIDES WHICH MARK A POINTER MEANS. The chart owns the drawing's pointer listeners: it converts
 * the pointer's position into the drawing's own units and reads out the mark nearest it as the pointer
 * moves, activating that same mark when it is pressed, so no layer needs its neighbours' geometry.
 * `Enter` and `Space` stay the mark's own, because focus is exact.
 */
function SeriesMarks({
  series,
  allSeries,
  axes,
  evidenceRefFor,
  onActivate,
  onVertexActivate,
  activeVertex,
  onVertexFocus,
  onVertexBlur,
  onVertexElement,
  hitRadius,
}: SeriesMarksProps): JSX.Element | null {
  const vertices = verticesOf(series, axes);

  if (vertices.length === 0) {
    return null;
  }

  const tone = toneOf(allSeries, series);

  function renderMark(vertex: SeriesVertex): JSX.Element {
    const evidenceRef = evidenceRefFor(series.id, vertex.axisId) ?? null;

    if (!vertexActs(evidenceRef, onActivate)) {
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

    /* The keyboard route: `Enter` or `Space` on the focused mark activates this very vertex, with no
       hit-testing involved. The pointer route is the drawing's own nearest-vertex resolution, which
       reads out and activates the vertex nearest the pointer; a mark deliberately carries no pointer
       handler, so a target painted above a neighbour can neither answer for it nor make one gesture
       activate two readings. It does report the element it is drawn as, so the press that resolves to
       this vertex can put focus here instead of on whichever target the browser focused. */
    function activate(): void {
      onVertexActivate(series.id, evidenceRef);
    }

    /* What the ring and the read-out report: this reading, as the series and the axis it belongs to. */
    const mark: ActiveVertex = { seriesId: series.id, axisId: vertex.axisId };
    const isActive = isSameVertex(activeVertex, mark);

    return (
      <g
        key={vertex.axisId}
        ref={(element) => {
          onVertexElement(mark, element);
        }}
        role="button"
        tabIndex={0}
        aria-label={vertex.label}
        {...(evidenceRef === null ? {} : { 'aria-haspopup': 'dialog' as const })}
        onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => {
          if (!isActivationKey(event)) {
            return;
          }

          event.preventDefault();
          activate();
        }}
        onFocus={() => {
          onVertexFocus(mark);
        }}
        onBlur={() => {
          onVertexBlur(mark);
        }}
        className={MARK_GROUP_CLASSES}
      >
        {/* The target: the size rule B-3 asks a mark to present, painted with nothing. The drawing
            resolves a pointer by distance rather than by this element, so its extent never decides
            which reading the pointer answers. */}
        <circle
          cx={vertex.point.x}
          cy={vertex.point.y}
          r={hitRadius}
          fill="none"
          pointerEvents="all"
        />
        <circle
          cx={vertex.point.x}
          cy={vertex.point.y}
          r={MARK_RADIUS}
          className={tone.area}
        />
        {/* The ring: revealed while the drawing reports this vertex, through the state alone. */}
        <circle
          cx={vertex.point.x}
          cy={vertex.point.y}
          r={FOCUS_RING_RADIUS}
          fill="none"
          strokeWidth={FOCUS_RING_WIDTH}
          className={`${FOCUS_RING_STATE_CLASSES} ${
            isActive ? FOCUS_RING_VISIBLE_CLASSES : FOCUS_RING_HIDDEN_CLASSES
          }`}
        />
      </g>
    );
  }

  return <g>{vertices.map(renderMark)}</g>;
}

/* ---------------------------------------------------------------------------------------------
 * The chart
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders the five-axis resilience radar of the competitive atlas.
 *
 * The drawing is presentational by contract: it takes the axes and the series the atlas payload
 * carried and draws one outline per series, one labelled mark per reading, and one name-and-label
 * line per series beneath them, so a re-render of the atlas draws the same radar from the same
 * payload.
 *
 * WHAT IT DOES NOT DO. It reads no clock, sends no request (rule B-1), reads no configuration (rule B-2)
 * and imports no seed record, because every score arrives in the `series` prop (rule P-2). It computes and
 * formats no domain figure (rule P-6), and declares one transition — the guarded fade on a vertex's ring —
 * and no animation, so a reduced-motion session sees the same drawing (rule B-3); it claims nothing about
 * where a record is held or whether it could be altered (rule P-4) and names no company or person
 * (rule P-7).
 *
 * WHAT IT ANNOUNCES (rule B-3). The drawing is one `<svg role="group">` named by
 * {@link RADAR_CHART_TEXT.groupLabel}, deliberately not repeating the caller's `<figcaption>`; rings,
 * spokes, scale values and plain dots are hidden from assistive technology, because every reading is named
 * at its vertex — axis, series, score — and printed in the frame's table view; an acting vertex is a `<g
 * role="button" tabIndex={0}>` with a `focus-ring` ring, and an inert one a plain `<circle>` (rule P-8).
 *
 * The component holds three pieces of state — the vertex the pointer resolved, the vertex the keyboard
 * is on, and which evidence is open — plus a map of the elements the acting marks are drawn as, and
 * nothing else: activating a mark asks the caller where that reading's evidence lives, opens
 * `./evidence-drawer.tsx` beside the drawing when it is told, and reports the series through
 * `onActivate`. The drawer is a sibling of the `<svg>` rather than a child of it, because a dialog is
 * not an SVG element and the drawer portals itself out of the flow anyway; keeping it outside the
 * drawing also keeps it out of the drawing's accessible name and out of its group. The one effect
 * measures the drawing's width, through `./chart-readout.tsx`'s `useChartScale`, so a vertex's target
 * is sized in CSS pixels rather than in the drawing's proportions; nothing here reads a clock or
 * subscribes to anything else.
 *
 * The height grows with the number of series, so the name band below the axes always fits whatever
 * the payload carries and no label is clipped.
 *
 * The pointer is resolved by the drawing instead of by the browser's hit test: {@link nearestRadarMark}
 * answers the vertex nearest the pointer within the target radius as the pointer moves, so pointing into
 * a dense cluster reads out the dot under the pointer even where a neighbour's larger target is painted
 * above it, a press at that point activates that same vertex, and a pointer clear of every vertex leaves
 * nothing reading out. The press also leaves focus on the vertex it activated rather than on the topmost
 * target the browser focused for it, which can belong to another series, so the reading a reader pressed
 * is the one focus returns to when the drawer closes (rule B-3). The keyboard route keeps setting and
 * clearing the read-out on focus and blur and keeps activating the focused mark exactly.
 */
export function RadarChart({
  axes,
  series,
  selectedSeriesId,
  onActivate,
  evidenceRefFor,
}: RadarChartProps): JSX.Element {
  const [openEvidenceRef, setOpenEvidenceRef] = useState<string | null>(null);
  const [pointedVertex, setPointedVertex] = useState<ActiveVertex | null>(null);
  const [focusedVertex, setFocusedVertex] = useState<ActiveVertex | null>(null);
  const { surfaceRef, scale: measuredScale } = useChartScale(VIEW_WIDTH);

  /* The elements the acting marks are drawn as, keyed by the vertex each one reads out. The drawing
     resolves a press to a vertex rather than to the element the browser hit, so this map is how the
     press reaches that vertex's own control. */
  const vertexElements = useRef(new Map<string, SVGGElement>());

  const viewHeight = LABEL_BAND_TOP + series.length * SERIES_LABEL_ROW_HEIGHT + LABEL_BAND_PADDING;
  const marks = activateableMarksOf(series, axes, evidenceRefFor, onActivate);

  /**
   * The band's rows: one per series, its own name and the companion label its figures carry, with the
   * series the screen reports on marked as the row in view.
   *
   * Both strings come from {@link labelLinesOf}, which imports them, so the band prints the fixed §5.3
   * label or the series-specific self-assessment tag exactly as the record states it and never retypes
   * one (rules P-1, P-5).
   */
  const bandRows: readonly SeriesBandRow[] = series.map((one) => {
    const lines = labelLinesOf(one);

    return {
      key: one.id,
      name: lines.name,
      companion: lines.companion,
      current: one.id === selectedSeriesId,
    };
  });

  /**
   * The scale's two values and where each is printed: the midpoint and the outer ring, computed from the
   * scale the records are scored on rather than typed in, and placed clear of every name the drawing
   * already prints.
   */
  const ringTicks = ringTicksOf(axes.length);
  const ringTickPlacements = ringTickPlacementsOf(ringTicks, axes, series);

  /**
   * The vertex the drawing reports: the one the pointer resolved, or the focused one where the pointer
   * has resolved none.
   *
   * The two routes are held apart so neither can blank the other's reading: the pointer's vertex wins
   * while there is one, because a reader who is pointing is asking about the mark the drawing answered
   * with, and a vertex reached from the keyboard still reads out — its ring and its read-out alike —
   * whichever series is painted above it, because focus needs no hit-testing at all.
   */
  const activeVertex = pointedVertex ?? focusedVertex;

  /**
   * The radius every acting vertex's invisible target is drawn at, in the drawing's own units.
   *
   * `Number.POSITIVE_INFINITY` as the slot: the pointer on this drawing is resolved to the *nearest*
   * vertex rather than to the topmost target, so two targets that overlap cannot make one reading's
   * pointer ambiguous and there is no neighbour's share to stay inside.
   */
  const hitRadius = chartTargetRadius(
    measuredScale,
    MARK_HIT_RADIUS,
    Number.POSITIVE_INFINITY,
  );

  /**
   * Holds the element one acting vertex is drawn as, and drops it once that mark leaves the drawing.
   *
   * A mark reports itself in through {@link SeriesMarks}, so the drawing can find the control behind a
   * reading by the two identifiers that name it rather than by paint order, and re-renders leave the
   * map holding only the marks actually on screen.
   */
  function registerVertexElement(vertex: ActiveVertex, element: SVGGElement | null): void {
    const key = vertexKeyOf(vertex);

    if (element === null) {
      vertexElements.current.delete(key);
      return;
    }

    vertexElements.current.set(key, element);
  }

  function activateVertex(seriesId: string, evidenceRef: string | null): void {
    onActivate?.(seriesId);

    if (evidenceRef !== null) {
      setOpenEvidenceRef(evidenceRef);
    }
  }

  /** Makes one vertex the keyboard's active one: what focus reaching a mark sets. */
  function focusVertex(vertex: ActiveVertex): void {
    setFocusedVertex(vertex);
  }

  /**
   * Clears the keyboard's active vertex, but only for the vertex that still holds it: focus leaving one
   * mark can be reported after the pointer has already resolved another vertex, and clearing
   * unconditionally would blank the reading that vertex set.
   */
  function blurVertex(vertex: ActiveVertex): void {
    setFocusedVertex((current) => (isSameVertex(current, vertex) ? null : current));
  }

  /**
   * The read-out the active vertex shows, or `null` while none is active.
   *
   * It states the axis, the series and the score the mark's own accessible name carries, and the
   * series' name is read out through {@link labelLinesOf}, so a competitor's name keeps the tag every
   * competitor name carries (rule P-5) and the client's series keeps its own provenance. Nothing is
   * formatted here: the score is the record's own text (rule P-6).
   *
   * @param mark The vertex the drawing reports, if any.
   * @returns The read-out beside the drawing, or `null` where there is nothing to read out.
   */
  function readoutFor(mark: ActiveVertex | null): JSX.Element | null {
    if (mark === null) {
      return null;
    }

    const one = series.find((candidate) => candidate.id === mark.seriesId);
    const vertex = one === undefined
      ? undefined
      : verticesOf(one, axes).find((candidate) => candidate.axisId === mark.axisId);

    if (one === undefined || vertex === undefined) {
      return null;
    }

    return (
      <ChartReadout
        anchor={{
          x: vertex.point.x,
          y: vertex.point.y,
          viewBoxWidth: VIEW_WIDTH,
          viewBoxHeight: viewHeight,
        }}
        title={vertex.axisLabel}
        lines={[{ label: labelLinesOf(one).name, value: vertex.scoreText }]}
      />
    );
  }

  /**
   * The vertex a pointer at a client position resolves to.
   *
   * The pointer's client coordinates are converted into this drawing's own units by the scale the
   * element applies to its view box — the element's rendered width over the view box's own width, the
   * same factor on both axes — and the vertex nearest that point within the target radius is the answer,
   * taken from the mark centres the drawing itself laid out ({@link activateableMarksOf}) rather than
   * from whichever element the browser hit. Nothing resolves when the element reports no width, which is
   * how a drawing with no layout avoids dividing by zero, and nothing resolves when the pointer is clear
   * of every vertex, so a pointer on empty space never reports a reading it is not on (rule P-8).
   *
   * @param surface The `<svg>` the pointer was dispatched to.
   * @param clientX The pointer's horizontal client coordinate.
   * @param clientY The pointer's vertical client coordinate.
   * @returns The nearest vertex within the target radius, or `null` when there is none.
   */
  function vertexNearestPointer(
    surface: SVGSVGElement,
    clientX: number,
    clientY: number,
  ): RadarMarkCentre | null {
    const rect = surface.getBoundingClientRect();
    const scale = rect.width / VIEW_WIDTH;

    if (!(scale > 0)) {
      return null;
    }

    return nearestRadarMark(
      marks,
      { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale },
      hitRadius,
    );
  }

  /**
   * Reads out the vertex the pointer is nearest as it moves over the drawing.
   *
   * WHY THE MOVEMENT AND NOT THE MARK THE POINTER IS OVER. The element a browser reports belongs to the
   * topmost thing painted at that point, and a target has to stay 24 CSS pixels across (rule B-3) while
   * two series' scores on one axis can sit closer together than that, so the series painted last would
   * answer for a dot painted before it. The drawing therefore answers every movement with the vertex
   * nearest the pointer — {@link nearestRadarMark}, the resolution a press uses too — so the dot a
   * reader aims at is the reading they are told and the ring follows it. Only a change of vertex is
   * stored, so a pointer crossing one target does not re-render the drawing for every pixel it moves.
   *
   * @param event The pointer movement the drawing received.
   */
  function movePointer(event: ReactPointerEvent<SVGSVGElement>): void {
    const resolved = vertexNearestPointer(event.currentTarget, event.clientX, event.clientY);
    const next = resolved === null ? null : { seriesId: resolved.seriesId, axisId: resolved.axisId };

    setPointedVertex((current) => {
      if (next === null) {
        return null;
      }

      return isSameVertex(current, next) ? current : next;
    });
  }

  /**
   * Clears the pointer's reading when the pointer leaves the drawing, so a value it resolved is not left
   * beside a drawing nothing is pointing at. The keyboard's own vertex keeps its read-out: that one was
   * never the pointer's to clear.
   */
  function pointerLeftDrawing(): void {
    setPointedVertex(null);
  }

  /**
   * Activates the vertex the press resolved to, opening the evidence the caller mapped for it.
   *
   * The press is resolved exactly as a pointer movement is — {@link vertexNearestPointer} — so the mark
   * a reader presses is the mark the read-out was naming, and a press clear of every vertex activates
   * nothing (rule P-8).
   *
   * WHY FOCUS MOVES HERE. A browser focuses the topmost focusable element under the pointer when a press
   * begins, and two vertices can sit closer together than their targets are wide, so that element can be
   * a neighbouring series' mark. Focus is therefore put on the vertex this drawing resolved, which is the
   * vertex the press activates: the reader stays on the reading they chose, and `./evidence-drawer.tsx`
   * records this element as the one to return focus to, so closing the drawer puts them back on the same
   * vertex rather than on a neighbour's (rule B-3).
   *
   * @param event The press the drawing received.
   */
  function activateNearestVertex(event: ReactMouseEvent<SVGSVGElement>): void {
    const mark = vertexNearestPointer(event.currentTarget, event.clientX, event.clientY);

    if (mark === null) {
      return;
    }

    vertexElements.current.get(vertexKeyOf(mark))?.focus();
    activateVertex(mark.seriesId, evidenceRefFor(mark.seriesId, mark.axisId) ?? null);
  }

  return (
    <>
      <div className={SURFACE_WRAPPER_CLASSES}>
        <svg
          ref={surfaceRef}
          role="group"
          aria-label={RADAR_CHART_TEXT.groupLabel}
          viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`}
          className={SVG_CLASSES}
          onClick={activateNearestVertex}
          onPointerMove={movePointer}
          onPointerLeave={pointerLeftDrawing}
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

          {/* Every outline first, then every series' marks. A polygon is decoration for the readings
              the marks carry, so painting the outlines in one pass is what keeps any polygon from
              sitting above a mark's vertex target and taking the pointer aimed at it: paint order
              protects the read-out and the press alike. */}
          {series.map((one) => (
            <SeriesOutline
              key={one.id}
              series={one}
              allSeries={series}
              axes={axes}
              isSelected={one.id === selectedSeriesId}
            />
          ))}

          {series.map((one) => (
            <SeriesMarks
              key={one.id}
              series={one}
              allSeries={series}
              axes={axes}
              evidenceRefFor={evidenceRefFor}
              onActivate={onActivate}
              onVertexActivate={activateVertex}
              activeVertex={activeVertex}
              onVertexFocus={focusVertex}
              onVertexBlur={blurVertex}
              onVertexElement={registerVertexElement}
              hitRadius={hitRadius}
            />
          ))}

          {/* One label per series, printed at that series' own outline: a swatch in the polygon's own
              role token, a short leader to the vertex it names, and the series' own label in the
              primary text role. A reader can therefore tell the outlines apart on the drawing itself,
              instead of only in the legend beside it (rule P-1). The words sit outside their swatch away
              from the drawing's vertical centre line and clear of the spoke, so a label covers neither an
              axis name nor another series' name, and the group takes no pointer events, so no label
              stands between a reader and a vertex. Each label carries a ground-role halo painted before
              its own fill, so a spoke or another series' outline passing through the words never runs
              through the glyphs a reader is reading (rule B-3). */}
          {series.map((one, index) => {
            const label = polygonLabelOf(one, axes, index);

            if (label === null) {
              return null;
            }

            const tone = toneOf(series, one);

            return (
              <g key={`polygon-label-${one.id}`} pointerEvents="none">
                <path
                  d={`M ${roundCoordinate(label.vertex.x)} ${roundCoordinate(
                    label.vertex.y,
                  )} L ${roundCoordinate(label.swatch.x)} ${roundCoordinate(label.swatch.y)}`}
                  strokeWidth={RING_STROKE_WIDTH}
                  className="fill-none stroke-hairline"
                />
                <circle
                  cx={roundCoordinate(label.swatch.x)}
                  cy={roundCoordinate(label.swatch.y)}
                  r={POLYGON_LABEL_SWATCH_RADIUS}
                  className={tone.area}
                />
                <text
                  x={roundCoordinate(label.text.x)}
                  y={roundCoordinate(label.text.y)}
                  textAnchor={label.anchor}
                  dominantBaseline="middle"
                  strokeWidth={POLYGON_LABEL_HALO_WIDTH}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  className={POLYGON_LABEL_TEXT_CLASSES}
                >
                  {one.label}
                </text>
              </g>
            );
          })}

          {axes.map((axis, index) => {
            const outer = axisLabelPointFor(index, axes.length);

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

          {/* The scale's own two values: the midpoint and the outer ring, so the axis scale is readable
              from the plot instead of only out of a vertex's accessible name. Each is placed off its own
              ring through `./svg-label.ts`, so neither prints over an axis name or a polygon label. The
              group is hidden from assistive technology with the rings and spokes beside it: every reading
              this drawing carries is named at its own vertex and printed again in the frame's table view,
              so these two numbers are the frame a sighted reader measures the plot against rather than a
              reading of their own, and announcing a bare number in the drawing's group would tell a screen
              reader nothing it is not already told. */}
          <g aria-hidden="true">
            {ringTicks.map((tick) => {
              const placement = ringTickPlacements.get(tick.key);
              const value = placement?.lines[0];

              if (placement === undefined || value === undefined) {
                return null;
              }

              return (
                <text
                  key={tick.key}
                  x={placement.labelX}
                  y={placement.labelY}
                  strokeWidth={POLYGON_LABEL_HALO_WIDTH}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  className={RING_TICK_CLASSES}
                >
                  {value}
                </text>
              );
            })}
          </g>

          {/* The band beneath the axes: one row per series, its name and the companion label its figures
              carry. `./series-band.tsx` owns the row — the two text roles, the emphasis the series in
              view takes and the truncation that keeps a long name inside the drawing — so this drawing
              states only where its band starts and how its rows are spaced. */}
          <SeriesBand rows={bandRows} geometry={BAND_GEOMETRY} />
        </svg>

        {/* The read-out the active vertex answers with: the axis, the series (a competitor's name
            carrying its own tag) and the score the record states. Anchored on the vertex itself, at a
            share of the view box, so it lands on the reading the pointer or the keyboard is on. */}
        {readoutFor(activeVertex)}
      </div>
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

