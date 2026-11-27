/**
 * The line surface of the four custom SVG charts: the projected closing-stock series of SCR-03, the
 * fourteen-day opened-and-resolved counts of SCR-01, and the stock series the FileMap canvas dock
 * reuses through `timeline-dock.tsx`.
 *
 * A PURE SURFACE, NOT A FRAME. `src/components/chart-frame.tsx` owns the `<figure>`, its
 * `<figcaption>`, the "View as table" control and the table that replaces this surface, so this
 * module draws the marks only: it emits no `<figure>`, no `<table>`, no toggle and no `<button>`. A
 * charting dependency is never imported (AAP §0.9, rule B-1); every mark below is SVG written here.
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
 * EVIDENCE PER POINT. `LinePoint.evidenceRef` is required, so a mark cannot be constructed without
 * the reference `getEvidence` resolves; activating a mark opens that point's `EvidenceDrawer`, which
 * is rendered as a sibling OUTSIDE the `<svg>` — a dialog inside an SVG subtree is not a dialog at
 * all. Every mark is focusable with `Enter` or `Space`, named with its series, its date and its
 * formatted value, and small enough not to obscure the line it belongs to.
 *
 * PROVENANCE (rules P-1, P-5). A series' `simLabel` is the exact specification §5.3 string, typed as
 * `SimLabel` and never spelled in this module; it is rendered in that series' accessible description
 * and nowhere else, so nothing is invented for a series that carries none — the surrounding frame
 * and legend supply the provenance there. A tone resolves through the one chart tone table
 * `./horizontal-bar-chart.tsx` owns, and no reading is shared between two series: each draws its own
 * path and its own marks, and nothing here sums, totals or blends a first-party figure with a
 * market-intelligence one.
 *
 * THE POINTER IS ANSWERED TOO (rule B-3). A mark is a focus stop with a drawn focus ring, so a
 * keyboard reader always sees where they are; the same ring is revealed by `group-hover` and held by
 * `group-active`, so a hovered or pressed mark is visibly live for a pointer reader as well, and
 * neither state repaints the value the mark encodes. The only property either state transitions is
 * opacity, and it is carried by a `motion-safe` transition, so a reduced-motion session is shown the
 * same three states with no animation and nothing on this surface depends on one finishing.
 *
 * Rules served: B-1 (no charting dependency, no fetched asset), B-2 (nothing to configure), B-3
 * (keyboard-reachable named marks, pointer states from role tokens only, and every transition gated
 * behind `motion-safe`), P-1, P-5, P-6, P-7.
 */
import { useId, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';

import type { IsoDate, SimLabel } from '../types';
import { EvidenceDrawer } from './evidence-drawer';
import { CHART_TONE_CLASSES } from './horizontal-bar-chart';
import type { ChartTone } from './horizontal-bar-chart';

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

  /** The reference `getEvidence` resolves for this point, opened by activating its mark. */
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

  /** The series' name, printed in its accessible description and in each mark's accessible name. */
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
 * A shaded span of the x axis — the idle window the solver reports, in SCR-03's case.
 *
 * The span is a prop rather than something derived from the series: the solver owns the idle window,
 * so a chart that inferred one would be inventing a measure (rule P-6).
 */
export interface LineBand {
  /** The first date of the span. */
  readonly from: IsoDate;

  /** The last date of the span. */
  readonly to: IsoDate;

  /** What the span is, printed inside it. Supplied by the caller. */
  readonly label: string;
}

/** Props of {@link LineChart}. */
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

/** How many x labels and y ticks the axis aims for before it starts thinning them out. */
const MAX_X_LABELS = 7;
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
 */
const MARK_RADIUS = 2.5;
const HIT_RADIUS = 12;
const FOCUS_RING_RADIUS = 6;
const FOCUS_RING_STROKE_WIDTH = 1.5;

/**
 * The ring around one mark: the series' own tone, invisible while the mark is neither focused, hovered
 * nor held down.
 *
 * `:focus-visible` rather than `:focus` for the keyboard half, so a pointer press does not leave a
 * keyboard indicator behind; `group-hover` and `group-active` for the pointer half, so a mark under the
 * pointer or under a press is visibly live even for a reader who is not using a keyboard. All three
 * reveal the same ring in the series' tone, which keeps the reading untouched: the ring adds a halo
 * around the dot and never repaints the value the mark encodes. `motion-safe:` carries the fade, so a
 * reduced-motion session gets the same states with no transition (rule B-3). No raw palette value, no
 * arbitrary value and no opacity literal appears here — `opacity-0` and `opacity-100` are the two
 * ends of the utility set the theme layer exposes, and no shadow utility exists to select.
 */
const FOCUS_RING_CLASSES =
  'opacity-0 group-focus-visible:opacity-100 group-hover:opacity-100 group-active:opacity-100 motion-safe:transition-opacity motion-safe:duration-150';

/** Stroke widths and dash patterns: the hairline grid, a solid series, a dashed one, and the rest. */
const HAIRLINE_STROKE_WIDTH = 1;
const SERIES_STROKE_WIDTH = 2;
const SERIES_DASH = '6 4';
const REFERENCE_DASH = '4 3';
const MARKER_DASH = '2 2';

/** The name the surface carries where it has no series to name it after. */
const DEFAULT_CHART_LABEL = 'Line chart';

/* ---------------------------------------------------------------------------------------------
 * Classes — layout and role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The surface itself: it fills its frame's width and keeps the box's proportions. */
const SURFACE_CLASSES = 'block h-auto w-full min-w-0';

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
const AXIS_LABEL_CLASSES = 'font-mono text-12';

/**
 * A point mark: the pointer cursor, the 2 px focus ring on the focus-ring role token so a keyboard user
 * sees which point they are on, and the `group` marker the ring's hover and pressed variants hang on.
 * The ring is the same one every control in the interface draws.
 */
const POINT_CLASSES =
  'group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

/** The per-series descriptions: read out, never seen, so the series keep their own provenance. */
const DESCRIPTION_LIST_CLASSES = 'sr-only';

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

/**
 * The y domain: every supplied value, every reference level, and zero.
 *
 * Zero is always inside the domain, and the bottom never rises above it, so the zero line a reader
 * reads the series against is inside the drawn area (the reading T-03 asserts). `yMin` is honoured
 * only where it is negative, and a value below zero widens the domain downward rather than being
 * clipped.
 */
function yDomainFor(
  series: readonly LineSeriesSpec[],
  references: readonly LineReference[],
  yMin: number | undefined,
): YDomain {
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

  return { min: lowest, max: highest === lowest ? lowest + 1 : highest };
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
 * The tick readings across a domain, anchored at zero so the zero line is among them whenever it is
 * in range.
 */
function yTickValues(domain: YDomain): number[] {
  const step = niceStep(domain.max - domain.min);
  const first = Math.ceil(domain.min / step);
  const last = Math.floor(domain.max / step);
  const ticks: number[] = [];

  for (let index = first; index <= last; index += 1) {
    ticks.push(cleanNumber(index * step));
  }

  return ticks.length > 0 ? ticks : [domain.min, domain.max];
}

/**
 * The dates the x axis labels: every nth date of the calendar, plus the last one, so a dense series
 * carries readable labels rather than an unreadable run of them and the axis still ends where the
 * data ends.
 *
 * The last date always takes a label, and the one the interval would have placed immediately before
 * it gives way when the two would land closer than one interval apart: two dates drawn a single step
 * from each other overlap into unreadable text at the end of the axis, and a run whose length is not
 * a multiple of the interval is exactly the case that produces them.
 */
function xLabelValues(values: readonly IsoDate[]): IsoDate[] {
  if (values.length === 0) {
    return [];
  }

  const interval = Math.max(1, Math.ceil(values.length / MAX_X_LABELS));
  const lastIndex = values.length - 1;
  const indices: number[] = [];

  for (let index = 0; index <= lastIndex; index += interval) {
    indices.push(index);
  }

  if (indices[indices.length - 1] !== lastIndex) {
    if (lastIndex - (indices[indices.length - 1] ?? 0) < interval) {
      indices.pop();
    }

    indices.push(lastIndex);
  }

  return indices
    .map((index) => values[index])
    .filter((value): value is IsoDate => value !== undefined);
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
 * The surface computes its own geometry and nothing else: the y domain is every supplied value plus
 * zero, the x scale is the calendar the series, markers and bands describe, and each path is the
 * sequence of positions those two produce. Values themselves are printed only where they arrived
 * printed — in a mark's accessible name and in its drawer (rule P-6).
 *
 * The one piece of state is which mark is open, so a reader activating a point opens that point's
 * `EvidenceDrawer` and no other. The drawer is a sibling of the `<svg>` rather than a child: an SVG
 * subtree cannot host a dialog, and the drawer portals itself to `document.body` from here. Closing
 * it — by its own control or by `Escape`, which the drawer handles — returns focus to the mark that
 * opened it, because the drawer restores the element that had focus when it mounted.
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
}: LineChartProps): ReactElement {
  const [opened, setOpened] = useState<OpenedPoint | undefined>(undefined);
  const drawerId = useId();

  const referenceList = references ?? NO_REFERENCES;
  const markerList = markers ?? NO_MARKERS;
  const bandList = bands ?? NO_BANDS;

  const calendar = axisCalendar(series, markerList, bandList);
  const x = xScaleFor(calendar);
  const y = yDomainFor(series, referenceList, yMin);
  const yTicks = yTickValues(y);
  const xLabels = xLabelValues(calendar);

  /** Opens one point's evidence, whether the mark was clicked, tapped or pressed from the keyboard. */
  function openPoint(key: string, evidenceRef: string): void {
    setOpened({ key, evidenceRef });
  }

  /** Closes the drawer a mark opened; the drawer calls this and nothing else does. */
  function closeDrawer(): void {
    setOpened(undefined);
  }

  /**
   * Activates a mark from the keyboard on the two keys a button answers to. `Space` is prevented from
   * scrolling the page, which is what a native button does and an SVG group does not.
   */
  function handlePointKeyDown(
    event: ReactKeyboardEvent<SVGGElement>,
    key: string,
    evidenceRef: string,
  ): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    openPoint(key, evidenceRef);
  }

  return (
    <>
      <svg
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

        {/* Reference levels: the zero line above all, each dashed and labelled in the secondary role. */}
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

        {/* The shaded spans' own labels, in the secondary role so they read over the fill. */}
        <g className={X_LABEL_CLASSES}>
          {bandList.map((band) => {
            const from = x.positionOf(band.from);
            const to = x.positionOf(band.to);

            return (
              <text
                key={`band-label-${band.from}-${band.to}`}
                x={roundCoordinate((from + to) / 2)}
                y={BAND_LABEL_BASELINE}
                textAnchor="middle"
                fill="currentColor"
                className={AXIS_LABEL_CLASSES}
              >
                {band.label}
              </text>
            );
          })}
        </g>

        {/* Due-date markers: a dashed tick off the axis and its label beneath it. */}
        <g className={MARKER_CLASSES}>
          {markerList.map((marker) => {
            const xPosition = roundCoordinate(x.positionOf(marker.x));

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
                  textAnchor="middle"
                  fill="currentColor"
                  className={AXIS_LABEL_CLASSES}
                >
                  {marker.label}
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
        {series.map((spec) => (
          <g key={`marks-${spec.id}`} className={CHART_TONE_CLASSES[spec.tone].text}>
            {spec.points.map((point, index) => {
              const key = `${spec.id}-${index}`;
              const isOpen = opened?.key === key;
              const cx = roundCoordinate(x.positionOf(point.x));
              const cy = roundCoordinate(positionOfY(point.y, y));

              return (
                <g
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={`${spec.label}, ${point.x}: ${point.yLabel}`}
                  aria-haspopup="dialog"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? drawerId : undefined}
                  onClick={() => {
                    openPoint(key, point.evidenceRef);
                  }}
                  onKeyDown={(event) => {
                    handlePointKeyDown(event, key, point.evidenceRef);
                  }}
                  className={POINT_CLASSES}
                >
                  <circle cx={cx} cy={cy} r={MARK_RADIUS} fill="currentColor" />
                  {/* Revealed by keyboard focus, a hover or a press, in the series' own tone. */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={FOCUS_RING_RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={FOCUS_RING_STROKE_WIDTH}
                    className={FOCUS_RING_CLASSES}
                  />
                  {/* Last child, so it takes the pointer anywhere near the dot. */}
                  <circle cx={cx} cy={cy} r={HIT_RADIUS} fill="transparent" />
                </g>
              );
            })}
          </g>
        ))}

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

      {/* Each series' accessible description, and the only place its simulation label is read out. */}
      {series.length === 0 ? null : (
        <ul className={DESCRIPTION_LIST_CLASSES}>
          {series.map((spec) => (
            <li key={`description-${spec.id}`}>
              {spec.simLabel === undefined ? spec.label : `${spec.label}, ${spec.simLabel}`}
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

