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
 * `AtlasSeries` data, so a series' swatch and its polygon resolve the same role token — both from the
 * one chart tone table `./horizontal-bar-chart.tsx` exports — and cannot disagree. Which of the three
 * competitor hues that token is comes from `competitorSlotOf`, the same lookup the legend and the
 * network view read, so the slot follows the competitor's identifier rather than the position the
 * series holds in either list. This component prints each series' name and its companion tag inside
 * the drawing, which is what rule P-1 requires of a labelled series, and leaves the colour legend to
 * the screen.
 *
 * THE SCALE IS A CHART CONCERN. `RadarAxis` declares no bounds. The simulated market-intelligence
 * pack fixes its scores as integers from zero to one hundred, one per axis in axis order, with the
 * upper bound the strongest reading the pack records; `SCORE_MIN` and `SCORE_MAX` below are that
 * scale and nothing else reads them. They are geometry rather than a figure: a reading outside them
 * is drawn at the nearest ring instead of off the drawing, and no scale number is printed, so the
 * chart types no number onto the screen.
 *
 * WHY EVERY OUTLINE IS PAINTED UNDER EVERY MARK, AND THE PRESS IS RESOLVED BY PROXIMITY (pointer
 * hit-testing). An outline used to be drawn in the same group as its own series' marks, one series
 * layer after another, so a later series' polygon fill sat above an earlier series' vertex target
 * and swallowed the pointer. A polygon is decoration for the readings the marks carry and never acts
 * itself, so it is transparent to pointer events and every outline is painted before every mark,
 * both in payload order. Paint order alone cannot place a press, though: a target has to stay large
 * enough for a pointer (rule B-3), and two series' scores on one axis can put their dots closer
 * together than one target is wide, so the target painted last covers the dot drawn before it and
 * would take a press aimed at its neighbour. The drawing therefore resolves the press itself rather
 * than leaving it to the browser's hit test: {@link RadarChart} listens once, on the `<svg>`,
 * converts the pointer's coordinates into this drawing's own units and activates the vertex whose
 * centre is NEAREST the press — see {@link nearestRadarMark} — within the hit radius a target already
 * carries. A dense cluster then opens the vertex under the pointer wherever the pointer lands inside
 * overlapping targets, and a press clear of every vertex activates nothing, so no reading is invented
 * (rule P-8). The keyboard route is untouched and stays exact, because it needs no hit-testing at
 * all: one focus stop per vertex, in axis order, each named with its axis, its series and its value,
 * activated by `Enter` or `Space` on the mark itself.
 *
 * WHY EACH POLYGON CARRIES ITS OWN LABEL (rule P-1). A legend beside a drawing relates a name to a
 * shape only through a swatch a reader has to match, so each series is labelled at its own outline as
 * well: the label sits at the vertex the series draws on the axis its index states
 * (`seriesIndex % axes.length`, so five series name five different axes and a drawing of MORE series
 * than axes shares an axis between polygons, which are then told apart by the vertices their own
 * readings place), {@link POLYGON_LABEL_OFFSET} beyond that vertex along the axis, with a short leader
 * line back to it and a swatch in the polygon's own role token. The words are set in the primary text
 * role, so they never rest on a hue, and they sit outside their swatch in both directions — away from
 * the drawing's vertical centre line, and one line clear of the spoke — so a label never crosses the
 * axis name printed at the outer end of its own spoke nor a neighbour's label. The label band below the
 * axes is unchanged: it keeps each series' name and its companion label, which is where the fixed
 * provenance string is printed for the series as a whole.
 *
 * WHY THOSE WORDS CARRY A HALO (rule B-3). A label sits outside its own polygon, but the drawing is
 * dense enough that an axis spoke or another series' outline still runs through the space its words
 * occupy, and a name painted straight over a dark or coloured stroke reads poorly against it. Each
 * label's words are therefore stroked in the ground role and filled after that stroke (SVG's
 * `paint-order: stroke` paints the stroke first and the fill over it), so the halo surrounds every
 * glyph instead of covering it: the label reads wherever it lands, the stroke is a role token the
 * theme owns rather than a raw colour, and the fill a reader reads the name in stays the primary text
 * role whose contrast specification §4 measures.
 *
 * WHY THE ENTITY IN VIEW IS MARKED IN THE DRAWING, NOT ONLY BESIDE IT (rule P-8). SCR-13's entity
 * selector reports the series a reader picked, and a control whose only effect is its own highlight
 * does not perform the selection function it presents. `selectedSeriesId` therefore reaches the
 * drawing: the series in view keeps its own outline, drawn with a heavier stroke, and its label-band
 * row states `aria-current` and prints its name in the emphasised weight, while every other series
 * stays drawn exactly as it was. No reading changes and no series is hidden, so the marking is
 * structural — a stroke weight, a text weight and an attribute — and never a hue a reader has to
 * separate (rule B-3).
 *
 * WHAT IT DOES NOT DO. It reads no clock, keeps no state beyond the evidence it has open, sends no
 * request (rule B-1), reads no configuration (rule B-2) and imports no seed record (rule P-2: every
 * score arrives in the `series` prop exactly as the atlas payload stated it). It computes and
 * formats no domain figure (rule P-6), declares one transition — the guarded fade that reveals a
 * vertex's ring under a hover or a press — and no animation at all, so a reduced-motion session is
 * shown the same drawing with nothing to undo (rule B-3), claims nothing about where a record is held
 * or whether it could be altered (rule P-4), and names no company, place or person of its own (rule
 * P-7).
 *
 * ACCESSIBILITY (rule B-3). The drawing is one `<svg role="group">` named by
 * `RADAR_CHART_TEXT.groupLabel`, which deliberately does not repeat the `<figcaption>` the caller's
 * `./chart-frame.tsx` supplies. Each axis is named at its outer end in the secondary text role, and
 * the rings, spokes and vertex dots are decoration. A vertex that can act — because the caller's
 * `evidenceRefFor` resolved a reference for it, or because `onActivate` was supplied — is a
 * `<g role="button" tabIndex={0}>` whose accessible name states the axis, the series and the value,
 * operable by the pointer the drawing resolves and by `Enter` or `Space` on the mark itself, with a
 * ring in the `focus-ring` role drawn around the mark and revealed by a keyboard focus, a hover or a
 * press, so the pointer has the indicator the keyboard already had. A vertex that can do nothing
 * stays a plain `<circle>`, so rule P-8 is never broken by a control with nothing behind it, and the
 * drawing's one press listener is not a control: it adds no focus stop and no accessible node. WHAT A
 * POINTER MEANS is resolved by distance: two series' readings on one axis can sit closer together than
 * two invisible targets, so a press activates the mark nearest the pointer among the drawing's marks
 * rather than the mark whose target received the event, and the outline polygons take no pointer events
 * at all, so a shape that performs nothing never swallows an aim. `Enter` and `Space` are exact,
 * because focus lands on one mark alone.
 */
import { useState } from 'react';
import type {
  JSX,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';

import { CLIENT_SELF_ASSESSMENT_LABEL, COMPETITOR_NAME_TAG } from '../types';
import type { AtlasSeries, RadarAxis } from '../types';

import { EvidenceDrawer } from './evidence-drawer';
import { CHART_TONE_CLASSES, competitorSlotOf } from './horizontal-bar-chart';
import type { CompetitorSlot } from './horizontal-bar-chart';

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
 * Four rings give a reader a coarse quartile reading without any tick label, which is deliberate:
 * printing scale numbers would put a typed figure on the screen (rule P-6), and the numbers a reader
 * needs are the scores, which arrive with the payload and are named in each vertex's accessible
 * name.
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

/** A vertex: the dot a reader sees, the larger invisible target around it, and its focus ring. */
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
 * The pack scale the seed's market-intelligence records use, and the only two numbers the geometry
 * needs: a score is placed by how far it runs from the first to the second.
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

/** A series' name line in the label band: the primary text role, whose contrast §4 measures. */
const BAND_NAME_CLASSES = 'text-12 fill-text-primary';

/**
 * The weight the name of the series in view takes: the type scale's own bundled weight, so the
 * emphasis is structure rather than a size, a colour or a decoration (rule B-3).
 */
const SELECTED_NAME_CLASSES = 'font-semibold';

/**
 * A vertex that can act: the whole mark, with the visible dot and the invisible target around it.
 *
 * The target is the SVG half of the 24x24 px minimum a pointer needs (rule B-3): the dot is a few
 * units across, so the group carries a larger hit circle declared `fill="none"` with pointer events
 * enabled, which receives the pointer without painting anything. Its `group` marker is what the ring's
 * hover and pressed variants hang on, so a hover is applied by the browser rather than held in state.
 */
const MARK_GROUP_CLASSES = 'group cursor-pointer';

/**
 * The ring around one vertex: the `focus-ring` role the token layer measures for that purpose in both
 * themes, revealed by a keyboard focus, a hover or a press.
 *
 * `:focus-visible` rather than `:focus` for the keyboard half, so a pointer press does not leave a
 * keyboard indicator behind and a keyboard reader always sees one; `group-hover` and `group-active` for
 * the pointer half, so a vertex under the pointer or under a press is visibly live for a reader who
 * never uses a keyboard. All three reveal the same ring, so no state repaints the reading the vertex
 * encodes, and the ring is mounted at every render but painted at zero opacity until one of them
 * applies: nothing about it is conditionally rendered, so a hover leaves the surface's own state alone.
 * `motion-safe:` carries the fade, which is the only property any of these states changes (rule B-3);
 * no raw palette value, no arbitrary value and no opacity literal appears beyond the two ends of the
 * opacity scale, and the theme layer exposes no shadow to select.
 */
const FOCUS_RING_CLASSES =
  'stroke-focus-ring opacity-0 group-focus-visible:opacity-100 group-hover:opacity-100 group-active:opacity-100 motion-safe:transition-opacity motion-safe:duration-150';

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
 * Pointer resolution — the press belongs to the vertex nearest it, not to the topmost target
 * ------------------------------------------------------------------------------------------- */

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
 * decoration can sit above a mark in document order. A mark carries no press handler of its own: the
 * chart resolves one press on the drawing and activates the vertex nearest it, so a press cannot be
 * delivered to a neighbouring target that happens to be painted above the dot a reader aimed at, and
 * no gesture can activate two vertices.
 *
 * A mark becomes a control only when activating it does something — it opens the evidence the caller's
 * mapper resolved for that vertex, or it reports the series through `onActivate`. A vertex the mapper
 * cannot resolve, on a series no handler reports, is drawn as a plain dot: a dot that took focus and
 * then did nothing would be a control that cannot act (rule P-8), and the drawing still shows every
 * reading it holds.
 *
 * WHO DECIDES WHICH MARK A POINTER MEANS. The chart owns the drawing's one press listener: it converts
 * the press into the drawing's own units and activates the mark nearest it, so no layer needs its
 * neighbours' geometry and no mark carries a press handler of its own. `Enter` and `Space` are the
 * mark's own, because focus is exact.
 */
function SeriesMarks({
  series,
  allSeries,
  axes,
  evidenceRefFor,
  onActivate,
  onVertexActivate,
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
       hit-testing involved. The pointer route is the drawing's one press listener, which resolves the
       press to the nearest vertex; a mark deliberately carries no press handler, so one gesture can
       never activate two readings. */
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
        {/* The ring: revealed by keyboard focus, a hover or a press. */}
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
 *
 * A press is resolved by the drawing instead of by the browser's hit test: {@link nearestRadarMark}
 * picks the vertex nearest the press within the target radius, so a dense cluster opens the vertex
 * under the pointer even where a neighbour's larger target is painted above it, while the keyboard
 * route keeps activating the focused mark exactly.
 */
export function RadarChart({
  axes,
  series,
  selectedSeriesId,
  onActivate,
  evidenceRefFor,
}: RadarChartProps): JSX.Element {
  const [openEvidenceRef, setOpenEvidenceRef] = useState<string | null>(null);

  const viewHeight = LABEL_BAND_TOP + series.length * SERIES_LABEL_ROW_HEIGHT + LABEL_BAND_PADDING;
  const marks = activateableMarksOf(series, axes, evidenceRefFor, onActivate);

  function activateVertex(seriesId: string, evidenceRef: string | null): void {
    onActivate?.(seriesId);

    if (evidenceRef !== null) {
      setOpenEvidenceRef(evidenceRef);
    }
  }

  /**
   * Resolves one press on the drawing to the vertex the reader aimed at.
   *
   * The pointer's client coordinates are converted into this drawing's own units by the scale the
   * element applies to its view box, and the vertex nearest that point — within the target radius a
   * mark already carries — is the one activated. Nothing happens when the element reports no width,
   * which is how a drawing with no layout at all avoids dividing by zero, and nothing happens when
   * the press is clear of every vertex, so a press on empty space activates no reading (rule P-8).
   *
   * @param event The press the drawing received.
   */
  function activateNearestVertex(event: ReactMouseEvent<SVGSVGElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = rect.width / VIEW_WIDTH;

    if (!(scale > 0)) {
      return;
    }

    const point = {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
    const mark = nearestRadarMark(marks, point, MARK_HIT_RADIUS);

    if (mark === null) {
      return;
    }

    activateVertex(mark.seriesId, evidenceRefFor(mark.seriesId, mark.axisId) ?? null);
  }

  return (
    <>
      <svg
        role="group"
        aria-label={RADAR_CHART_TEXT.groupLabel}
        viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`}
        className={SVG_CLASSES}
        onClick={activateNearestVertex}
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
            sitting above a mark and taking its activation. */}
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
          const isSelected = one.id === selectedSeriesId;

          return (
            /* The row of the series in view states `aria-current` and prints its name in the
               emphasised weight, so the selection is carried by the drawing itself (rule P-8) and
               never by colour alone (rule B-3). */
            <g key={one.id} aria-current={isSelected ? 'true' : undefined}>
              <text
                x={SERIES_LABEL_X}
                y={top}
                className={
                  isSelected ? `${BAND_NAME_CLASSES} ${SELECTED_NAME_CLASSES}` : BAND_NAME_CLASSES
                }
              >
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

