/**
 * The line surface of the four custom SVG charts: the projected closing-stock series of SCR-03, the
 * fourteen-day opened-and-resolved counts of SCR-01, and the stock series the FileMap canvas dock
 * reuses through `timeline-dock.tsx`.
 *
 * A PURE SURFACE, NOT A FRAME. `src/components/chart-frame.tsx` owns the `<figure>`, its
 * `<figcaption>`, the "View as table" control and the table that replaces this surface, so this
 * module draws the marks and their legend only: it emits no `<figure>`, no `<table>`, no toggle and no
 * `<button>`. A charting dependency is never imported (AAP §0.9, rule B-1); every mark below is SVG
 * written here.
 *
 * WHAT IT FORMATS — NOTHING (rule P-6). `LinePoint.yLabel` is the already-formatted value text,
 * produced by the module that computed the figure, and it is what a point's accessible name carries.
 * The chart reads no record, computes no measure and prints no amount of its own: the only
 * arithmetic here is geometry — where a mark sits inside the viewBox, and the y-axis tick readings
 * derived from that geometry. No clock is read either: an `IsoDate` is positioned by the date it
 * states through `Date.parse`, never from the system clock, and the demonstration clock stays the
 * caller's business.
 *
 * THE ZERO DOMAIN — the "never below zero" reading T-03 asserts. The computed domain's bottom is
 * clamped to at most `0`: `yMin` is honoured where it is negative and the bottom stays `0` where it
 * is absent or positive, so the zero line always sits inside the drawn area when nothing is
 * negative. A supplied point below zero is still drawn truthfully rather than clipped, because the
 * reading belongs to the solver that produced the series and a chart that hid a negative value
 * would be the defect rather than the guard.
 *
 * EVIDENCE PER POINT, OR THE CALLER'S OWN ACTION. `LinePoint.evidenceRef` is required, so a mark
 * cannot be constructed without the reference `getEvidence` resolves; activating a mark opens that
 * point's `EvidenceDrawer`, which is rendered as a sibling OUTSIDE the `<svg>` — a dialog inside an
 * SVG subtree is not a dialog at all. A caller that supplies `activation` owns activation instead: the
 * mark then reports its point and opens no drawer, because a handler may leave the screen and a dialog
 * opened for a screen that unmounted is never read (see {@link LinePointActivation}). Every mark is
 * focusable with `Enter` or `Space`, named with its series, its date and its formatted value — and,
 * under an activation, with the action it performs as well — and small enough not to obscure the line
 * it belongs to.
 *
 * PROVENANCE AND THE LEGEND (rules P-1, P-5, B-3). A series' `simLabel` is the exact specification
 * §5.3 string, typed as `SimLabel` and never spelled in this module; it is read out in that series'
 * own legend row and nowhere else, so nothing is invented for a series that carries none — the
 * surrounding frame states the frame-level label there. The legend itself is visible: one row per
 * series in the order the series are drawn, each row the series' own tone as a swatch beside the
 * series' own `label`, so a reader can tell two paths apart without relying on colour alone and
 * without switching to the table view. A shaded span is named there too: one row per supplied band
 * follows the series' rows, with the span's own label beside a decorative swatch in the span's own
 * surface role, because a band painted behind the lines is otherwise the one thing on the surface
 * a reader meets without a name; a chart given no bands renders exactly the series' rows. The
 * simLabel stays screen-reader-only inside the same row, the rows wrap at a narrow width, and the
 * list carries no focus stop, no control and no animation. A tone resolves through the one chart
 * tone table `./horizontal-bar-chart.tsx` owns, and no reading is shared between two series: each
 * draws its own path and its own marks, and nothing here sums, totals or blends a first-party
 * figure with a market-intelligence one.
 *
 * THE POINTER IS ANSWERED TOO, AND WHAT IT SAYS IS A READ-OUT (rule B-3). A mark is a focus stop with
 * a drawn focus ring, so a keyboard reader always sees where they are, and the ring is held in React
 * state rather than by a hover variant alone: `pointerenter`, `pointerdown` and `focus` make one date
 * the active column and `pointerleave` and `blur` clear it, so a hovered or focused mark is visibly
 * live on a device that reports no hover capability as well as on one that does. That is not a
 * preference: every hover variant this project's theme layer emits ships inside `@media (hover: hover)`,
 * so a CSS-only reveal is inert wherever the engine never matches it and cannot be observed in a
 * component test at all. The variants stay beside the state as an extra cue.
 *
 * THE ACTIVE COLUMN, NOT THE MARK UNDER THE POINTER. While a date is active the surface prints
 * `./chart-readout.tsx`'s read-out at that column: the date, then every series that states a point on
 * it with that series' own already-formatted value. Resolving the read-out to the column and not to
 * whichever circle was painted last is what makes each series readable where two of them read the
 * same value: where both series are zero their marks sit at one centre, and a column-wide read-out
 * names them both instead of the later-painted one taking the press and hiding the other. Each
 * coincident mark also keeps an invisible target of its own, widened by a step for every series
 * painted above it, so neither is unreachable by pointer either. Naming the series and its formatted
 * value is the whole of what the read-out prints — the module computes, rounds and formats nothing
 * (rule P-6). The only property any of these states transitions is opacity, carried by a `motion-safe`
 * transition, so a reduced-motion session is shown the same states with no animation and nothing on
 * this surface depends on one finishing.
 *
 * Rules served: B-1 (no charting dependency, no fetched asset), B-2 (nothing to configure), B-3
 * (keyboard-reachable named marks, pointer states from role tokens only, and every transition gated
 * behind `motion-safe`), P-1, P-5, P-6, P-7.
 */
import { useId, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';

import type { IsoDate, SimLabel } from '../types';
import { EvidenceDrawer } from './evidence-drawer';
import { ChartReadout, chartTargetRadius, useChartScale } from './chart-readout';
import { CHART_TONE_CLASSES } from './horizontal-bar-chart';
import type { ChartTone } from './horizontal-bar-chart';
import { truncateToWidth } from './svg-label';
/* ---------------------------------------------------------------------------------------------
 * The vocabulary a caller draws with
 * ------------------------------------------------------------------------------------------- */

/**
 * The colours a line may take: the six status meanings of `./status-indicator.tsx`, the accent role
 * specification §4.1 gives first-party flows, and the three competitor hues of §4.2 in their order.
 *
 * It is `./horizontal-bar-chart.tsx`'s {@link ChartTone} rather than a second union naming the same
 * roles, so this surface and every other chart draw from one vocabulary whose role tokens have one
 * owner, and a caller cannot ask for a colour this surface has no role token for.
 */
export type LineTone = ChartTone;

/**
 * One plotted value: where it sits on the x axis, its numeric height, the formatted text that
 * describes it, and the evidence reference behind it.
 *
 * `y` is a number because a mark has to be placed; it is never printed. `yLabel` is the text a
 * reader receives — already formatted by whoever computed the figure (rule P-6), so this surface
 * neither rounds nor formats it. `evidenceRef` is required: a point with no reference would be a
 * figure a reader could not open, which rule P-6 and the evidence requirement do not allow.
 */
export interface LinePoint {
  /** The date the value belongs to, exactly as the record states it. */
  readonly x: IsoDate;

  /** The numeric value, used only to place the mark and to build the y domain. */
  readonly y: number;

  /** The value as the module that computed it formatted it. Printed, never recomputed here. */
  readonly yLabel: string;

  /**
   * The reference `getEvidence` resolves for this point: what activating its mark opens where this
   * chart owns the activation, and what the frame's table view opens where the caller does.
   */
  readonly evidenceRef: string;
}

/**
 * One series: its identity, the wording a reader sees, the tone it draws in, its points, and the
 * two optional facts about how it is drawn.
 *
 * `dashed` separates a baseline from a selected scenario without relying on colour alone (rule B-3),
 * and `simLabel` is the exact specification §5.3 label the series' own figures require (rule P-1).
 * Both are optional, and neither is ever guessed: an absent `simLabel` stays absent.
 */
export interface LineSeriesSpec {
  /** The series' identifier, unique within one chart, so React can key the path and the marks. */
  readonly id: string;

  /** The series' name, printed in the legend row beside its swatch and in each mark's accessible name. */
  readonly label: string;

  /** The role token the path and its marks draw in. */
  readonly tone: LineTone;

  /** The points to draw, in the order the record states them. */
  readonly points: readonly LinePoint[];

  /** The simulation label the series' figures carry, where the record gives one. */
  readonly simLabel?: SimLabel | undefined;

  /** Whether the path is dashed, which is how a baseline is told from a selected scenario. */
  readonly dashed?: boolean | undefined;
}

/**
 * A horizontal reference: the zero line, a supply threshold, or any other level the series are read
 * against. `{ y: 0, label: '0' }` is the zero line SCR-03 requires.
 */
export interface LineReference {
  /** The level, in the same units as the series' `y`. Never printed; `label` is. */
  readonly y: number;

  /** What the level is, printed beside it in the secondary text role. Supplied by the caller. */
  readonly label: string;
}

/** A dated marker on the x axis — a customer order's due date, in SCR-03's case. */
export interface LineMarker {
  /** The date the marker sits on. */
  readonly x: IsoDate;

  /** What happens on that date, printed under the axis. Supplied by the caller. */
  readonly label: string;
}

/**
 * A shaded span of the x axis — the idle window SCR-03 shades over its projection.
 *
 * The span is the caller's, passed as a prop rather than derived here: the caller reads it from the
 * record's own readings, so this surface measures nothing and can shade no span the records do not
 * state (rule P-6).
 */
export interface LineBand {
  /** The first date of the span. */
  readonly from: IsoDate;

  /** The last date of the span. */
  readonly to: IsoDate;

  /** What the span is, printed inside it. Supplied by the caller. */
  readonly label: string;
}

/**
 * What a mark does where the caller owns the activation, supplied through
 * {@link LineChartProps.activation}.
 *
 * A CALLER THAT SUPPLIES THIS OWNS WHAT ACTIVATION DOES. The surface then reports the activated point
 * and opens no drawer of its own — the mark carries no `aria-haspopup`, no `aria-expanded` and no
 * `aria-controls`, because it opens no dialog — and the caller's handler performs whatever the gesture
 * means on that screen. The handler may leave the screen: SCR-01 narrows the exception queue by the day
 * a mark draws and takes the reader to it, and a drawer opened in the same gesture would be unmounted
 * before a word of it was read. `LinePoint.evidenceRef` is still required and still reaches the reader,
 * as an `EvidenceRef` in the frame's mandatory "View as table" grid (AAP criterion 9, rule B-3).
 */
export interface LinePointActivation {
  /**
   * Called with the point a reader activated — by pointer, or with `Enter` or `Space` — and the series
   * it belongs to, so a caller drawing more than one series can tell them apart.
   */
  readonly onActivate: (point: LinePoint, series: LineSeriesSpec) => void;

  /**
   * The action the activation performs, as the phrase its mark's accessible name ends with.
   *
   * It states what activating the mark does rather than what it opens, so a screen-reader user hears
   * the effect before deciding to perform it (rules P-8 and B-3).
   */
  readonly actionName: (point: LinePoint) => string;
}

/**
 * What the caller of {@link LineChart} supplies: the series to draw, each point already carrying
 * the formatted value text its mark announces and the reference that point opens, beside the
 * horizontal references, dated markers and shaded spans the reading needs. Those annotations must
 * belong to the series and the dates beside them, because the chart draws geometry only and
 * derives no reading of its own.
 */
export interface LineChartProps {
  /**
   * The series to draw, in the order they should be read. Required: a chart with no series draws its
   * axes and nothing else, and the caller's frame owns the empty state.
   */
  readonly series: readonly LineSeriesSpec[];

  /** The horizontal references — the zero line above all. Omitted means none are drawn. */
  readonly references?: readonly LineReference[] | undefined;

  /** The dated markers on the x axis. Omitted means none are drawn. */
  readonly markers?: readonly LineMarker[] | undefined;

  /** The shaded spans of the x axis. Omitted means none are drawn. */
  readonly bands?: readonly LineBand[] | undefined;

  /**
   * The lowest value the y axis may reach.
   *
   * It is honoured only where it is negative: the domain's bottom is clamped to at most `0`, so a
   * positive value here still leaves the zero line inside the drawn area.
   */
  readonly yMin?: number | undefined;

  /** The x axis' name, printed beneath the dates. Supplied by the caller. */
  readonly xAxisLabel?: string | undefined;

  /** The y axis' name, printed up the plot's start edge. Supplied by the caller. */
  readonly yAxisLabel?: string | undefined;

  /**
   * What a mark does, where the caller owns the activation.
   *
   * Omitted, activating a mark opens that point's evidence and the mark declares the dialog it opens,
   * which is the contract `LinePoint.evidenceRef` describes. Supplied, the mark reports its point
   * through {@link LinePointActivation.onActivate} and opens no drawer, so the caller's gesture can
   * leave the screen; `evidenceRef` then reaches the reader through the frame's table view alone.
   */
  readonly activation?: LinePointActivation | undefined;
}

/* ---------------------------------------------------------------------------------------------
 * Layout: the viewBox the surface draws into
 * ------------------------------------------------------------------------------------------- */

/**
 * The drawing box, in viewBox user units rather than pixels.
 *
 * The `<svg>` is `w-full h-auto`, so the box scales to its container and these numbers are
 * proportions: no font size and no stroke width below depends on a rendered pixel measurement, so
 * the surface holds together at any width the frame gives it.
 */
const VIEWBOX_WIDTH = 680;
const VIEWBOX_HEIGHT = 260;

/** The plot's inset from each edge, leaving room for the y labels, the x labels and the markers. */
const PLOT_LEFT = 56;
const PLOT_RIGHT = 16;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 52;

const PLOT_WIDTH = VIEWBOX_WIDTH - PLOT_LEFT - PLOT_RIGHT;
const PLOT_HEIGHT = VIEWBOX_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
const PLOT_RIGHT_EDGE = PLOT_LEFT + PLOT_WIDTH;
const PLOT_BOTTOM_EDGE = PLOT_TOP + PLOT_HEIGHT;

/** The baselines the labels sit on, measured down from the plot's bottom edge. */
const X_LABEL_BASELINE = PLOT_BOTTOM_EDGE + 16;
const MARKER_LABEL_BASELINE = PLOT_BOTTOM_EDGE + 30;
const BAND_LABEL_BASELINE = PLOT_TOP + 14;
const X_AXIS_LABEL_BASELINE = VIEWBOX_HEIGHT - 4;

/** Offsets and lengths that keep the tick text clear of the plot and of the axis line. */
const Y_TICK_GAP = 8;
const Y_TICK_TEXT_LIFT = 4;
const REFERENCE_LABEL_LIFT = 4;
const Y_AXIS_LABEL_OFFSET = 14;
const MARKER_TICK_LENGTH = 5;

/**
 * The band at the plot's end inside which a date label is anchored to its own end rather than centred
 * on its tick, so the label never draws half of itself outside the surface and gets clipped.
 */
const X_LABEL_EDGE_MARGIN = 8;

/**
 * The room a date label takes across the plot, in viewBox units: the advance a ten-character ISO date
 * occupies at the axis' own twelve-unit mono type step, measured at 71.94 on the rendered surface.
 *
 * A label draws a box this wide wherever it sits, which is what decides whether two dates can both be
 * labelled: their ticks have to be far enough apart for the two boxes to clear each other.
 */
const X_LABEL_WIDTH = 72;

/**
 * The clear space kept between two neighbouring date labels, in viewBox units: two steps of the 4 px
 * spacing grid, so the dates read as separate words rather than as one run of digits.
 */
const X_LABEL_GAP = 8;

/** How many y ticks the axis aims for before `niceStep` rounds the spacing to a readable one. */
const Y_TICK_TARGET = 5;

/**
 * The mark a point draws: a 5-unit dot on the line, a ring that appears while the mark holds keyboard
 * focus, is hovered or is pressed, and the larger transparent circle that gives the mark a target a
 * pointer can hit without the dot itself growing large enough to hide the series.
 *
 * The hit circle is 24 viewBox units across — the minimum target rule B-3 sets — and the last child
 * of each mark group, so it sits above the line it overlaps. The ring is drawn in the series'
 * own tone as well as the outline utility on the group, because an engine that draws no outline
 * around an SVG container still shows the ring (rule B-3); the same ring answers the pointer, so a
 * mark under a hover or a press is visible to a reader who never uses a keyboard.
 *
 * At that size the mark painted later answers every pointer event over a point two series share, so
 * each series' target is widened by {@link HIT_RADIUS_STEP} for every series painted above it: the dot
 * and the ring are untouched, and what grows is only the invisible target.
 */
const MARK_RADIUS = 2.5;
const HIT_RADIUS = 12;

/**
 * How much wider one series' hit target is for each series painted above it, in viewBox units.
 *
 * Where two series read the same value on the same date their marks sit on one point, and the mark
 * painted later covers the earlier one's target completely, so the earlier series' figure cannot be
 * reached by pointer at all — its reading would be readable only from the table view. One step per
 * layer above gives the series drawn lowest a ring of its own outside the targets over it, while a
 * chart of a single series keeps the bare minimum target rule B-3 sets.
 */
const HIT_RADIUS_STEP = 4;

const FOCUS_RING_RADIUS = 6;
const FOCUS_RING_STROKE_WIDTH = 1.5;

/**
 * The ring around one mark: the series' own tone, invisible while no mark on its date is active.
 *
 * THE RING IS REVEALED BY STATE, AND THE VARIANTS ARE AN EXTRA CUE. The surface holds the date the
 * pointer is over or the keyboard is on, and every mark on that date draws its ring through
 * {@link FOCUS_RING_VISIBLE_CLASSES}. The `group-focus-visible`, `group-hover` and `group-active`
 * variants stay beside that state so a pointer or a keyboard focus shows the ring in the same instant,
 * but no reader depends on them: every hover variant this project's theme layer emits ships inside
 * `@media (hover: hover)`, so a device that reports no hover capability would otherwise never see a
 * ring at all, and no component test could observe it. The ring adds a halo around the dot and never
 * repaints the value the mark encodes, and `motion-safe:` carries the fade, so a reduced-motion session
 * gets the same states with no transition (rule B-3). No raw palette value and no arbitrary value
 * appears here, and no shadow utility exists to select.
 */
const FOCUS_RING_CLASSES =
  'group-focus-visible:opacity-100 group-hover:opacity-100 group-active:opacity-100 motion-safe:transition-opacity motion-safe:duration-150';

/** The ring's two states: hidden while no mark on the date is active, visible while one is. */
const FOCUS_RING_HIDDEN_CLASSES = 'opacity-0';
const FOCUS_RING_VISIBLE_CLASSES = 'opacity-100';

/** Stroke widths and dash patterns: the hairline grid, a solid series, a dashed one, and the rest. */
const HAIRLINE_STROKE_WIDTH = 1;
const SERIES_STROKE_WIDTH = 2;
const SERIES_DASH = '6 4';

/**
 * The reference rule's pattern: a fine dot, deliberately unlike any series' dash.
 *
 * A reference level and a series can sit on the same y — SCR-03's baseline reads zero on every day of
 * the case window, so it lies along the zero rule — and a dash of a similar period, drawn in phase from
 * the same start, leaves the two reading as one line. The dot keeps the level a rule in the reader's eye
 * and the series a path, so a coincident pair stays separable without relying on colour alone (rule
 * B-3). It stays a hairline in the secondary role with its own label beside it.
 */
const REFERENCE_DASH = '1 5';

const MARKER_DASH = '2 2';

/** The name the surface carries where it has no series to name it after. */
const DEFAULT_CHART_LABEL = 'Line chart';

/* ---------------------------------------------------------------------------------------------
 * Classes — layout and role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The surface itself: it fills its frame's width and keeps the box's proportions. */
const SURFACE_CLASSES = 'block h-auto w-full min-w-0';

/**
 * The box the surface and its read-out share: `relative`, so the read-out is positioned against this
 * drawing's own rectangle and can be placed at a share of the viewBox without measuring anything.
 */
const SURFACE_WRAPPER_CLASSES = 'relative';

/** The shaded span's fill: the surface-2 role the theme paints a raised region with. */
const BAND_CLASSES = 'text-surface-2';

/** The grid and the axis line, in the decorative hairline role rather than a boundary role. */
const HAIRLINE_CLASSES = 'text-hairline';

/** Reference levels and the x labels: the secondary text role, which each theme measured. */
const REFERENCE_CLASSES = 'text-text-secondary';
const X_LABEL_CLASSES = 'text-text-secondary';

/** Marker labels and the axis names: the caption role, quieter than the dates they annotate. */
const MARKER_CLASSES = 'text-text-caption';
const AXIS_TITLE_CLASSES = 'font-mono text-12 text-text-caption';

/** Dates, tick readings and marker labels, in the tabular mono face specification §4.3 requires. */
const AXIS_LABEL_CLASSES = 'font-mono text-12 tabular-nums';

/**
 * A point mark: the pointer cursor, the 2 px focus ring on the focus-ring role token so a keyboard user
 * sees which point they are on, and the `group` marker the ring's hover and pressed variants hang on.
 * The ring is the same one every control in the interface draws.
 */
const POINT_CLASSES =
  'group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

/**
 * The legend beneath the surface: one wrapping row, so it sits under the chart it describes and wraps
 * rather than overflowing its container at a narrow width. It is the arrangement `./legend.tsx` uses.
 */
const LEGEND_CLASSES = 'flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1';

/** One legend row: the series' swatch, then its name, wrapping together as a single item. */
const LEGEND_ITEM_CLASSES = 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1';

/**
 * The swatch: the 12 px mark on the 4 px grid with the 2 px control radius `./legend.tsx` draws, taking
 * the series' own tone from the one chart tone table so a row and the path it describes cannot disagree.
 * It is decorative, so `aria-hidden` is set at the call site and the label beside it carries the meaning.
 */
const LEGEND_SWATCH_CLASSES = 'inline-block size-3 shrink-0 rounded-control';

/**
 * The swatch a shaded span's row carries: the span's own surface role and the hairline that bounds its
 * fill, so the row reads as a band drawn behind the series rather than as a series' tone. It is
 * decorative in the same way as a series swatch, and the span's own label beside it carries the meaning.
 */
const BAND_SWATCH_CLASSES = 'border border-hairline bg-surface-2';

/** The series' name: the primary text role, so its contrast is the ratio the theme measured for it. */
const LEGEND_LABEL_CLASSES = 'min-w-0 break-words text-13 text-text-primary';

/**
 * The series' own simulation label, read out rather than painted: the frame already states the
 * frame-level label, so this stays inside the row as the provenance a screen reader receives with it.
 */
const LEGEND_PROVENANCE_CLASSES = 'sr-only';

/* ---------------------------------------------------------------------------------------------
 * Geometry — the only arithmetic in the module
 * ------------------------------------------------------------------------------------------- */

/** The instant an `IsoDate` states, or `undefined` where the value is not a date that can be read. */
function parsedTime(x: IsoDate): number | undefined {
  const parsed = Date.parse(x);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Appends a value once, keeping the first occurrence's position. */
function addOnce(values: IsoDate[], value: IsoDate): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}

/**
 * Every x value the surface has to place, in the order the axis reads them: chronologically where
 * every value is a readable date, and in the caller's own order otherwise.
 *
 * The series, the markers and both ends of every band contribute, so a band that starts before the
 * first plotted day still has room to be drawn and a due-date marker past the last day is not lost
 * off the end of the axis.
 */
function axisCalendar(
  series: readonly LineSeriesSpec[],
  markers: readonly LineMarker[],
  bands: readonly LineBand[],
): IsoDate[] {
  const values: IsoDate[] = [];

  for (const spec of series) {
    for (const point of spec.points) {
      addOnce(values, point.x);
    }
  }
  for (const marker of markers) {
    addOnce(values, marker.x);
  }
  for (const band of bands) {
    addOnce(values, band.from);
    addOnce(values, band.to);
  }

  if (values.every((value) => parsedTime(value) !== undefined)) {
    return [...values].sort((left, right) => (parsedTime(left) ?? 0) - (parsedTime(right) ?? 0));
  }

  return values;
}

/** Where one date sits across the plot's width. */
interface XScale {
  /** The x coordinate of a date: its own position across the plot, or the plot's centre if alone. */
  readonly positionOf: (x: IsoDate) => number;
}

/**
 * Builds the x scale for a calendar of dates.
 *
 * Positioning by parsed date is the default, so two series covering different spans line up on the
 * days they share. Where a value is not a date that can be read, the calendar's own order positions
 * it, which keeps a malformed record visible on the axis instead of stacking every mark on day one.
 * A single date, or a single repeated one, is centred.
 */
function xScaleFor(values: readonly IsoDate[]): XScale {
  const order = new Map<IsoDate, number>();
  values.forEach((value, index) => {
    order.set(value, index);
  });

  const times = values.flatMap((value) => {
    const time = parsedTime(value);
    return time === undefined ? [] : [time];
  });
  const byDate = times.length === values.length && values.length > 1;
  const firstTime = byDate ? Math.min(...times) : 0;
  const lastTime = byDate ? Math.max(...times) : 0;
  const timeSpan = lastTime - firstTime;

  function positionOf(x: IsoDate): number {
    if (!byDate) {
      const index = order.get(x);
      if (index === undefined || values.length < 2) {
        return PLOT_LEFT + PLOT_WIDTH / 2;
      }
      return PLOT_LEFT + (index / (values.length - 1)) * PLOT_WIDTH;
    }

    const time = parsedTime(x);
    if (time === undefined || timeSpan === 0) {
      return PLOT_LEFT + PLOT_WIDTH / 2;
    }
    return PLOT_LEFT + ((time - firstTime) / timeSpan) * PLOT_WIDTH;
  }

  return { positionOf };
}

/** The span the y axis covers, bottom first. */
interface YDomain {
  /** The lowest value drawn, clamped to at most zero. */
  readonly min: number;
  /** The highest value drawn, at least zero. */
  readonly max: number;
}

/** The y axis: the span it covers, and the readings it labels across that span. */
interface YAxis {
  /** The span the series are plotted over, ceilinged above the highest reading. */
  readonly domain: YDomain;

  /** The readings labelled down the axis, one per whole step of the domain. */
  readonly ticks: readonly number[];
}

/**
 * The y axis: every supplied value, every reference level and zero, held to whole steps with one step
 * of headroom above the highest reading.
 *
 * Zero is always inside the domain, and the bottom never rises above it, so the zero line a reader
 * reads the series against is inside the drawn area (the reading T-03 asserts). `yMin` is honoured
 * only where it is negative, and a value below zero widens the domain downward rather than being
 * clipped.
 *
 * WHY THE CEILING RISES A WHOLE STEP ABOVE THE DATA. A domain that stops at the highest reading draws
 * that reading's mark on the plot's top border, where it reads as a clipped value and where no tick can
 * name it: SCR-03's opening reading against a series that starts at its own maximum was drawn on the
 * frame while the axis stopped at the tick below it. Snapping the floor down to a whole step and
 * placing the ceiling a whole step above the highest reading gives that reading a label above it and
 * lifts the mark clear of the border, and the ticks then fall on every whole step between the two, so
 * the top of the series is always readable. The steps and the readings are the axis' own geometry, not
 * a figure this module computed (rule P-6).
 */
function yAxisFor(
  series: readonly LineSeriesSpec[],
  references: readonly LineReference[],
  yMin: number | undefined,
): YAxis {
  let lowest = Math.min(yMin ?? 0, 0);
  let highest = 0;

  for (const spec of series) {
    for (const point of spec.points) {
      lowest = Math.min(lowest, point.y);
      highest = Math.max(highest, point.y);
    }
  }
  for (const reference of references) {
    lowest = Math.min(lowest, reference.y);
    highest = Math.max(highest, reference.y);
  }

  /* A series that reads zero on every day leaves no span to divide: one unit of span keeps the step a
     finite number and the axis a grid the zeros sit on. */
  const step = niceStep(highest === lowest ? 1 : highest - lowest);
  const min = cleanNumber(Math.floor(lowest / step) * step);
  const max = cleanNumber((Math.floor(highest / step) + 1) * step);
  const ticks: number[] = [];

  for (let index = Math.round(min / step); index <= Math.round(max / step); index += 1) {
    ticks.push(cleanNumber(index * step));
  }

  const domain: YDomain = { min, max };

  return { domain, ticks: ticks.length > 0 ? ticks : [min, max] };
}

/** The y coordinate of a value inside the plot. */
function positionOfY(value: number, domain: YDomain): number {
  const span = domain.max - domain.min;
  return PLOT_TOP + ((domain.max - value) / span) * PLOT_HEIGHT;
}

/**
 * A tick spacing of 1, 2 or 5 times a power of ten, near the count the axis aims for.
 *
 * Anchoring the ticks to a spacing of that shape is what keeps a reading a round number — the tick
 * labels are the axis' own geometry, not a figure this module computed (rule P-6).
 */
function niceStep(span: number): number {
  const rough = span / Y_TICK_TARGET;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const multiplier = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;

  return multiplier * magnitude;
}

/** A value with floating-point noise removed at the twelfth significant digit, so it reads clean. */
function cleanNumber(value: number): number {
  return Number(value.toPrecision(12));
}

/**
 * The dates the x axis labels: as many of the calendar's own dates as the plot has room for, chosen by
 * the space each label needs rather than by a count of labels to aim for.
 *
 * WHY SPACING AND NOT A COUNT. The x scale is the calendar itself, so a date sits where its own day
 * falls, and a working calendar's days are not evenly spaced: contracts §1 fixes a Monday-to-Friday
 * calendar, so SCR-03's weekday sequence steps one day forward and then three across a weekend. A
 * count divided over such a calendar keeps one date in every n, and n cannot know how far apart those
 * dates then land — the row reads clearly in one stretch of the plot and overlaps into unreadable text
 * in the next, which is what eight dates over fifteen working days did. What a reader needs is one
 * label per stretch of plot wide enough to hold one, and the number of labels then follows from the
 * calendar instead of being fixed beforehand.
 *
 * HOW ONE IS CHOSEN. The calendar's own order is walked once, keeping the first date; a later date is
 * kept only where its position clears the label last kept by at least one label's advance plus the
 * gap, and the box it draws into stays that far clear of the box already drawn. A label's box is read
 * from the anchor {@link xLabelAnchor} draws it with: a centred label reaches half its width either
 * side of its tick, and a label anchored to its end reaches a whole width back from its tick and
 * nothing forward, so it crowds the date before it further than a centred one would.
 *
 * The last date is always labelled, because the axis has to end where the data ends; where the date
 * that would have preceded it cannot keep clear of it, that date gives way rather than the last one.
 * The first date is never one that gives way. A calendar of one date labels that very date, and the
 * emitted dates are calendar members in the order they were given — no date is invented.
 *
 * @param values - The calendar the x scale was built from, in the order the axis reads it.
 * @param positionOf - The scale's own position for a date, so a label sits above its own tick.
 * @returns The dates to label, in the order they were given.
 */
function xLabelValues(
  values: readonly IsoDate[],
  positionOf: (value: IsoDate) => number,
): IsoDate[] {
  const first = values[0];

  if (first === undefined) {
    return [];
  }

  const labels: IsoDate[] = [first];
  let lastKeptPosition = positionOf(first);

  for (let index = 1; index < values.length - 1; index += 1) {
    const value = values[index];

    if (value === undefined) {
      continue;
    }

    const position = positionOf(value);

    if (clearsKeptLabel(position, lastKeptPosition)) {
      labels.push(value);
      lastKeptPosition = position;
    }
  }

  const last = values[values.length - 1];

  if (last === undefined || last === first) {
    return labels;
  }

  const lastPosition = positionOf(last);

  /* The last date takes its label whatever the spacing, so the dates it would crowd give way to it. */
  while (labels.length > 1 && !clearsKeptLabel(lastPosition, lastKeptPosition)) {
    labels.pop();
    const previous = labels[labels.length - 1];
    lastKeptPosition = previous === undefined ? lastPosition : positionOf(previous);
  }

  labels.push(last);

  return labels;
}

/**
 * The horizontal extent one date label draws into, in viewBox units, read from the anchor
 * {@link xLabelAnchor} gives it: a centred label reaches half its width either side of its tick, while
 * a label anchored to its end reaches a whole width back from it and nothing forward.
 *
 * @param position - The tick's horizontal position in viewBox units.
 * @returns The box's left and right edges.
 */
function xLabelBox(position: number): { readonly left: number; readonly right: number } {
  return xLabelAnchor(position) === 'end'
    ? { left: position - X_LABEL_WIDTH, right: position }
    : { left: position - X_LABEL_WIDTH / 2, right: position + X_LABEL_WIDTH / 2 };
}

/**
 * Whether a label at `position` keeps clear of the label already drawn at `keptPosition`.
 *
 * Two facts are required, and each guards a different pair: the ticks themselves are further apart
 * than one label's advance plus the gap, so a reader can see which date a label belongs to, and the
 * two boxes clear each other by that gap, so no two dates ever paint over one another.
 *
 * @param position - The candidate label's tick position in viewBox units.
 * @param keptPosition - The tick position of the label last kept.
 * @returns Whether both labels can be drawn without touching.
 */
function clearsKeptLabel(position: number, keptPosition: number): boolean {
  const kept = xLabelBox(keptPosition);

  return (
    position - keptPosition >= X_LABEL_WIDTH + X_LABEL_GAP &&
    xLabelBox(position).left - kept.right >= X_LABEL_GAP
  );
}

/**
 * How a date label is anchored to the tick it sits on: to its own end on the plot's last tick, and
 * centred on every other tick.
 *
 * A date label is wider than the gap between two ticks, and the plot reserves its y-label column at
 * the start, so a centred label on the first tick already sits inside the surface — but the plot
 * reserves nothing at its end, and a centred label there draws half of itself outside the surface,
 * where the SVG's own clipping cuts it: the reader then sees the year and month of the final date and
 * never its day. Anchoring the last label to its end keeps every character of the date on screen
 * without moving it into the label before it.
 *
 * @param position - The tick's horizontal position in viewBox units.
 * @returns The `text-anchor` the label draws with.
 */
function xLabelAnchor(position: number): 'middle' | 'end' {
  return position >= PLOT_RIGHT_EDGE - X_LABEL_EDGE_MARGIN ? 'end' : 'middle';
}

/** A coordinate rounded to two decimals, so a path's data is written once rather than repeated. */
function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The `d` attribute of one series' path, or an empty string where the series has no points. */
function seriesPath(points: readonly LinePoint[], x: XScale, y: YDomain): string {
  return points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command}${roundCoordinate(x.positionOf(point.x))} ${roundCoordinate(positionOfY(point.y, y))}`;
    })
    .join(' ');
}

/** The surface's accessible name: what it is, then the series it draws, in reading order. */
function chartLabelFor(series: readonly LineSeriesSpec[]): string {
  const labels = series.map((spec) => spec.label).join(', ');
  return labels === '' ? DEFAULT_CHART_LABEL : `${DEFAULT_CHART_LABEL}: ${labels}`;
}

/**
 * One mark's accessible name: the series, the date and the formatted value a reader can see, then —
 * where the caller owns the activation — the action activating the mark performs.
 *
 * The action phrase is appended rather than substituted, so the name still says which figure the mark
 * draws; and it appears only under an activation, because a mark that opens its evidence declares that
 * effect with `aria-haspopup` instead (rule B-3, rule P-8).
 *
 * @param spec - The series the mark belongs to.
 * @param point - The point the mark draws.
 * @param activation - The caller's activation, or `undefined` where this surface opens the evidence.
 * @returns The name the mark is announced with.
 */
function markLabelOf(
  spec: LineSeriesSpec,
  point: LinePoint,
  activation: LinePointActivation | undefined,
): string {
  const figure = `${spec.label}, ${point.x}: ${point.yLabel}`;

  return activation === undefined ? figure : `${figure}. ${activation.actionName(point)}`;
}

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/** The mark a reader has opened, and the evidence reference its drawer shows. */
interface OpenedPoint {
  /** The mark's composite key, so exactly one mark reports itself as expanded. */
  readonly key: string;

  /** The reference `getEvidence` resolves for that point. */
  readonly evidenceRef: string;
}

/** The stable values an omitted `references`, `markers` or `bands` prop resolves to. */
const NO_REFERENCES: readonly LineReference[] = [];
const NO_MARKERS: readonly LineMarker[] = [];
const NO_BANDS: readonly LineBand[] = [];

/**
 * Draws one or more series as SVG paths over the dates it is given, with the bands, references and
 * markers the caller supplies, and one focusable evidence mark per point.
 *
 * The surface computes its own geometry and nothing else: the y axis is every supplied value plus
 * zero, held to whole steps with one step of headroom above the highest reading, the x scale is the
 * calendar the series, markers and bands describe, and each path is the sequence of positions those
 * two produce. Values themselves are printed only where they arrived printed — in a mark's accessible
 * name and in its drawer (rule P-6).
 *
 * The one piece of state is which mark is open, so a reader activating a point opens that point's
 * `EvidenceDrawer` and no other. The drawer is a sibling of the `<svg>` rather than a child: an SVG
 * subtree cannot host a dialog, and the drawer portals itself to `document.body` from here. Closing
 * it — by its own control or by `Escape`, which the drawer handles — returns focus to the mark that
 * opened it, because the drawer restores the element that had focus when it mounted. A caller that
 * supplies `activation` takes that state out of play: no mark opens this surface's drawer, and the
 * activated point is reported to the caller's handler instead (see {@link LinePointActivation}).
 *
 * No effect, no data access, no subscription and no animation: the surface is a pure function of its
 * props, so it cannot re-render on a clock tick, contact a source, or move when a reader has asked
 * for reduced motion.
 */
export function LineChart({
  series,
  references,
  markers,
  bands,
  yMin,
  xAxisLabel,
  yAxisLabel,
  activation,
}: LineChartProps): ReactElement {
  const [opened, setOpened] = useState<OpenedPoint | undefined>(undefined);
  const drawerId = useId();

  const referenceList = references ?? NO_REFERENCES;
  const markerList = markers ?? NO_MARKERS;
  const bandList = bands ?? NO_BANDS;

  const calendar = axisCalendar(series, markerList, bandList);
  const x = xScaleFor(calendar);
  const axis = yAxisFor(series, referenceList, yMin);
  const y = axis.domain;
  const yTicks = axis.ticks;
  const xLabels = xLabelValues(calendar, x.positionOf);

  /*
   * Whether this surface, rather than the caller, owns what activating a mark does. The two effects
   * never run together: a drawer opened by a gesture whose handler leaves the screen would be
   * unmounted before it was read, so a caller that supplies an activation gets the mark's report and
   * the drawer is not opened at all.
   */
  const opensDrawer = activation === undefined;

  /*
   * THE DATE THE READER IS ON, AND WHAT IT SAYS. A pointer entering a mark, pressing it or focusing it
   * makes its date the active column, and leaving or blurring clears it; the read-out beside the
   * drawing then names that date and every series that states a reading on it. Resolving the read-out
   * to the date rather than to whichever circle was painted last is what keeps each series reachable
   * where two of them read the same value: where both are zero their marks sit at one centre, and the
   * read-out names them both instead of the later-painted one hiding the other.
   */
  const [pointedX, setPointedX] = useState<IsoDate | null>(null);
  const [focusedX, setFocusedX] = useState<IsoDate | null>(null);
  const activeX = pointedX ?? focusedX;

  /*
   * The scale the drawing is rendered at, so a mark's target can be sized in CSS pixels rather than in
   * user units: `./chart-readout.tsx` converts the 24 px minimum through it, and the dot's and the
   * ring's own geometry stay untouched.
   */
  const { surfaceRef, scale } = useChartScale(VIEWBOX_WIDTH);

  /** The room one date has on the axis: the nearest a target may grow before it meets its neighbour. */
  const columnSpacing = PLOT_WIDTH / Math.max(1, calendar.length - 1);

  /** The dates the read-out states readings for: the active one, and nothing where none is active. */
  const activePoints =
    activeX === null
      ? []
      : series.flatMap((spec) => {
          const point = spec.points.find((candidate) => candidate.x === activeX);

          return point === undefined ? [] : [{ series: spec, point }];
        });

  /** The read-out's lines: each series' own name beside the value it already formatted. */
  const activeReadings = activePoints.map((entry) => ({
    label: entry.series.label,
    value: entry.point.yLabel,
  }));

  /** Where the highest mark on the active date sits, so the read-out is placed clear of every mark. */
  const activeTopY =
    activePoints.length === 0
      ? 0
      : Math.min(...activePoints.map((entry) => positionOfY(entry.point.y, y)));

  /** Makes one date the active column: what pointing at, pressing or focusing a mark on it does. */
  function activateColumn(date: IsoDate): void {
    setPointedX(date);
  }

  /**
   * Clears the active date, but only for the date that still holds it: a pointer crossing from one
   * mark to another reports the leaving mark first, and clearing unconditionally would blank the
   * read-out the entering mark is about to set.
   */
  function releaseColumn(date: IsoDate): void {
    setPointedX((current) => (current === date ? null : current));
  }

  /** Makes one date the focused column, for the keyboard route. */
  function focusColumn(date: IsoDate): void {
    setFocusedX(date);
  }

  /** Clears the focused date, for the mark that still holds it. */
  function releaseFocusOf(date: IsoDate): void {
    setFocusedX((current) => (current === date ? null : current));
  }

  /** Opens one point's evidence, whether the mark was clicked, tapped or pressed from the keyboard. */
  function openPoint(key: string, evidenceRef: string): void {
    setOpened({ key, evidenceRef });
  }

  /** Closes the drawer a mark opened; the drawer calls this and nothing else does. */
  function closeDrawer(): void {
    setOpened(undefined);
  }

  /**
   * Activates a mark: this surface's evidence drawer, or the caller's own action where it supplied
   * one. It is the one path both the pointer and the keyboard take, so the two input modalities cannot
   * diverge on what a mark does.
   */
  function activatePoint(key: string, spec: LineSeriesSpec, point: LinePoint): void {
    if (activation === undefined) {
      openPoint(key, point.evidenceRef);
      return;
    }

    activation.onActivate(point, spec);
  }

  /**
   * Activates a mark from the keyboard on the two keys a button answers to. `Space` is prevented from
   * scrolling the page, which is what a native button does and an SVG group does not.
   */
  function handlePointKeyDown(
    event: ReactKeyboardEvent<SVGGElement>,
    key: string,
    spec: LineSeriesSpec,
    point: LinePoint,
  ): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    activatePoint(key, spec, point);
  }

  return (
    <>
      <div className={SURFACE_WRAPPER_CLASSES}>
        <svg
          ref={surfaceRef}
          role="group"
          aria-label={chartLabelFor(series)}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className={SURFACE_CLASSES}
        >
          {/* The shaded spans, beneath every other mark so the series stay legible over them. */}
          <g className={BAND_CLASSES}>
            {bandList.map((band) => {
              const from = x.positionOf(band.from);
              const to = x.positionOf(band.to);

              return (
                <rect
                  key={`band-${band.from}-${band.to}`}
                  x={roundCoordinate(Math.min(from, to))}
                  y={PLOT_TOP}
                  width={roundCoordinate(Math.abs(to - from))}
                  height={PLOT_HEIGHT}
                  fill="currentColor"
                />
              );
            })}
          </g>

          {/* The grid, on the hairline role, and the plot's own two edges. */}
          <g className={HAIRLINE_CLASSES}>
            {yTicks.map((tick) => {
              const yPosition = roundCoordinate(positionOfY(tick, y));

              return (
                <line
                  key={`grid-${tick}`}
                  x1={PLOT_LEFT}
                  x2={PLOT_RIGHT_EDGE}
                  y1={yPosition}
                  y2={yPosition}
                  stroke="currentColor"
                  strokeWidth={HAIRLINE_STROKE_WIDTH}
                />
              );
            })}
            <line
              x1={PLOT_LEFT}
              x2={PLOT_LEFT}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM_EDGE}
              stroke="currentColor"
              strokeWidth={HAIRLINE_STROKE_WIDTH}
            />
            <line
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT_EDGE}
              y1={PLOT_BOTTOM_EDGE}
              y2={PLOT_BOTTOM_EDGE}
              stroke="currentColor"
              strokeWidth={HAIRLINE_STROKE_WIDTH}
            />
          </g>

          {/* Reference levels: the zero line above all, ruled with a fine dot and labelled in the
              secondary role. */}
          <g className={REFERENCE_CLASSES}>
            {referenceList.map((reference) => {
              const yPosition = roundCoordinate(positionOfY(reference.y, y));

              return (
                <g key={`reference-${reference.label}-${reference.y}`}>
                  <line
                    x1={PLOT_LEFT}
                    x2={PLOT_RIGHT_EDGE}
                    y1={yPosition}
                    y2={yPosition}
                    stroke="currentColor"
                    strokeWidth={HAIRLINE_STROKE_WIDTH}
                    strokeDasharray={REFERENCE_DASH}
                  />
                  <text
                    x={PLOT_RIGHT_EDGE}
                    y={yPosition - REFERENCE_LABEL_LIFT}
                    textAnchor="end"
                    fill="currentColor"
                    className={AXIS_LABEL_CLASSES}
                  >
                    {reference.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* The shaded spans' own labels, in the secondary role so they read over the fill. A span's
              name is the caller's wording and can be any length, so a run wider than the plot is
              shortened and keeps its full text in a `title` child; the legend and the frame's table view
              carry the span itself, so nothing a reader needs to identify it depends on the drawn run. */}
          <g className={X_LABEL_CLASSES}>
            {bandList.map((band) => {
              const from = x.positionOf(band.from);
              const to = x.positionOf(band.to);
              const label = truncateToWidth(band.label, PLOT_WIDTH);

              return (
                <text
                  key={`band-label-${band.from}-${band.to}`}
                  x={roundCoordinate((from + to) / 2)}
                  y={BAND_LABEL_BASELINE}
                  textAnchor="middle"
                  fill="currentColor"
                  className={AXIS_LABEL_CLASSES}
                >
                  {label === band.label ? null : <title>{band.label}</title>}
                  {label}
                </text>
              );
            })}
          </g>

          {/* Due-date markers: a dashed tick off the axis and its label beneath it. A label wider than
              the plot is shortened the way a span's name is, with its full text in a `title` child. */}
          <g className={MARKER_CLASSES}>
            {markerList.map((marker) => {
              const xPosition = roundCoordinate(x.positionOf(marker.x));
              const label = truncateToWidth(marker.label, PLOT_WIDTH);

              return (
                <g key={`marker-${marker.x}-${marker.label}`}>
                  <line
                    x1={xPosition}
                    x2={xPosition}
                    y1={PLOT_BOTTOM_EDGE}
                    y2={PLOT_BOTTOM_EDGE + MARKER_TICK_LENGTH}
                    stroke="currentColor"
                    strokeWidth={HAIRLINE_STROKE_WIDTH}
                    strokeDasharray={MARKER_DASH}
                  />
                  <text
                    x={xPosition}
                    y={MARKER_LABEL_BASELINE}
                    textAnchor={xLabelAnchor(xPosition)}
                    fill="currentColor"
                    className={AXIS_LABEL_CLASSES}
                  >
                    {label === marker.label ? null : <title>{marker.label}</title>}
                    {label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* One path per series, in that series' own tone, dashed where the caller says so. */}
          {series.map((spec) => (
            <path
              key={`series-${spec.id}`}
              d={seriesPath(spec.points, x, y)}
              fill="none"
              stroke="currentColor"
              strokeWidth={SERIES_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={spec.dashed === true ? SERIES_DASH : undefined}
              className={CHART_TONE_CLASSES[spec.tone].text}
            />
          ))}

          {/* One focusable mark per point: small dot, generous target, evidence on activation. */}
          {series.map((spec, seriesIndex) => {
            /*
             * Every series painted above this one widens its target, so a coincident mark stays reachable;
             * `chartTargetRadius` then holds that result at 24 CSS pixels wherever the date's own room on
             * the axis allows it. The dot and the ring keep their drawn size either way.
             */
            const hitRadius = chartTargetRadius(
              scale,
              HIT_RADIUS + (series.length - 1 - seriesIndex) * HIT_RADIUS_STEP,
              columnSpacing,
            );

            return (
              <g key={`marks-${spec.id}`} className={CHART_TONE_CLASSES[spec.tone].text}>
                {spec.points.map((point, index) => {
                  const key = `${spec.id}-${index}`;
                  const isOpen = opened?.key === key;
                  const isActive = point.x === activeX;
                  const cx = roundCoordinate(x.positionOf(point.x));
                  const cy = roundCoordinate(positionOfY(point.y, y));

                  return (
                    <g
                      key={key}
                      role="button"
                      tabIndex={0}
                      aria-label={markLabelOf(spec, point, activation)}
                      aria-haspopup={opensDrawer ? 'dialog' : undefined}
                      aria-expanded={opensDrawer ? isOpen : undefined}
                      aria-controls={opensDrawer && isOpen ? drawerId : undefined}
                      onPointerEnter={() => {
                        activateColumn(point.x);
                      }}
                      onPointerDown={() => {
                        activateColumn(point.x);
                      }}
                      onPointerLeave={() => {
                        releaseColumn(point.x);
                      }}
                      onFocus={() => {
                        focusColumn(point.x);
                      }}
                      onBlur={() => {
                        releaseFocusOf(point.x);
                      }}
                      onClick={() => {
                        activatePoint(key, spec, point);
                      }}
                      onKeyDown={(event) => {
                        handlePointKeyDown(event, key, spec, point);
                      }}
                      className={POINT_CLASSES}
                    >
                      <circle cx={cx} cy={cy} r={MARK_RADIUS} fill="currentColor" />
                      {/* Revealed while this date is active — pointed at, pressed or focused — in the
                          series' own tone, with the hover and pressed variants kept as an extra cue. */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={FOCUS_RING_RADIUS}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={FOCUS_RING_STROKE_WIDTH}
                        className={`${FOCUS_RING_CLASSES} ${
                          isActive ? FOCUS_RING_VISIBLE_CLASSES : FOCUS_RING_HIDDEN_CLASSES
                        }`}
                      />
                      {/* Last child, so it takes the pointer anywhere near the dot, widened per series so
                          a mark painted over a coincident one stays reachable. */}
                      <circle cx={cx} cy={cy} r={hitRadius} fill="transparent" />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* The x axis: every date the calendar labels, as the record states it. */}
          <g className={X_LABEL_CLASSES}>
            {xLabels.map((value) => (
              <text
                key={`x-label-${value}`}
                x={roundCoordinate(x.positionOf(value))}
                y={X_LABEL_BASELINE}
                textAnchor={xLabelAnchor(x.positionOf(value))}
                fill="currentColor"
                className={AXIS_LABEL_CLASSES}
              >
                {value}
              </text>
            ))}
          </g>

          {/* The y axis: the domain's own readings, so the zero line is labelled wherever it falls. */}
          <g className={X_LABEL_CLASSES}>
            {yTicks.map((tick) => (
              <text
                key={`y-label-${tick}`}
                x={PLOT_LEFT - Y_TICK_GAP}
                y={roundCoordinate(positionOfY(tick, y)) + Y_TICK_TEXT_LIFT}
                textAnchor="end"
                fill="currentColor"
                className={AXIS_LABEL_CLASSES}
              >
                {String(tick)}
              </text>
            ))}
          </g>

          {/* The axis names, where the caller gave them. */}
          {xAxisLabel === undefined ? null : (
            <text
              x={PLOT_LEFT + PLOT_WIDTH / 2}
              y={X_AXIS_LABEL_BASELINE}
              textAnchor="middle"
              fill="currentColor"
              className={AXIS_TITLE_CLASSES}
            >
              {xAxisLabel}
            </text>
          )}
          {yAxisLabel === undefined ? null : (
            <text
              transform={`translate(${Y_AXIS_LABEL_OFFSET} ${PLOT_TOP + PLOT_HEIGHT / 2}) rotate(-90)`}
              textAnchor="middle"
              fill="currentColor"
              className={AXIS_TITLE_CLASSES}
            >
              {yAxisLabel}
            </text>
          )}
        </svg>

        {/* The read-out for the active date: the date, then every series that states a reading on it,
            placed above the highest of those marks and positioned as a share of the drawing's own box by
            `./chart-readout.tsx`, so it lands on its column at any width and stays legible. */}
        {activeX === null || activeReadings.length === 0 ? null : (
          <ChartReadout
            anchor={{
              x: x.positionOf(activeX),
              y: activeTopY,
              viewBoxWidth: VIEWBOX_WIDTH,
              viewBoxHeight: VIEWBOX_HEIGHT,
            }}
            title={activeX}
            lines={activeReadings}
          />
        )}
      </div>

      {/* The legend: a visible row per series and per shaded span, each named beside its own swatch. */}
      {series.length === 0 && bandList.length === 0 ? null : (
        <ul role="list" className={LEGEND_CLASSES}>
          {series.map((spec) => (
            <li key={`legend-${spec.id}`} className={LEGEND_ITEM_CLASSES}>
              <span
                aria-hidden="true"
                className={`${LEGEND_SWATCH_CLASSES} ${CHART_TONE_CLASSES[spec.tone].swatch}`}
              />
              <span className={LEGEND_LABEL_CLASSES}>{spec.label}</span>
              {/* The only place this series' own simulation label is read out (rules P-1, P-5). */}
              {spec.simLabel === undefined ? null : (
                <span className={LEGEND_PROVENANCE_CLASSES}>{`, ${spec.simLabel}`}</span>
              )}
            </li>
          ))}
          {/* One row per shaded span, after the series: the span's own name beside the fill it draws. */}
          {bandList.map((band) => (
            <li key={`legend-band-${band.from}-${band.to}`} className={LEGEND_ITEM_CLASSES}>
              <span
                aria-hidden="true"
                className={`${LEGEND_SWATCH_CLASSES} ${BAND_SWATCH_CLASSES}`}
              />
              <span className={LEGEND_LABEL_CLASSES}>{band.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* The evidence behind the mark the reader activated, as a sibling of the surface. */}
      {opened === undefined ? null : (
        <EvidenceDrawer id={drawerId} evidenceRef={opened.evidenceRef} onClose={closeDrawer} />
      )}
    </>
  );
}

