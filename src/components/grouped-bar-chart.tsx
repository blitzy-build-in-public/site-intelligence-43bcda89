/**
 * The grouped bar chart: one cluster of bars per group, one bar per series inside each cluster, every
 * bar a control that opens the evidence behind its own value.
 *
 * WHY THIS SURFACE EXISTS AND WHY IT IS HAND-DRAWN. AAP §0.12.4 gives SCR-04 a "units-late-by-order
 * grouped bars" chart beside its comparison matrix: the same orders read once per compared scenario, so
 * a reader can see which order a plan saves and which it defers. That is a grouped comparison and
 * nothing else, and AAP §0.9 and rule B-1 forbid a charting dependency in a build that may contact no
 * origin but its own, so it is drawn as SVG from the role tokens of `src/theme/tokens.css`.
 *
 * IT IS A PURE SURFACE, DELIBERATELY. The `<figure>`, the accessible caption, the simulation label and
 * the "View as table" toggle all belong to `src/components/chart-frame.tsx`, which is the only place
 * success criterion 9's table view exists. This module therefore renders no `<figure>`, no `<table>` and
 * no toggle: composed inside that frame, one chart gets one caption, one label and exactly one table
 * view. Rendered on its own it is a graphic with no table view, which is why the frame is the caller.
 *
 * WHAT IT FORMATS: NOTHING. `valueLabel` arrives already formatted, by the module that owns the
 * convention — an amount through `src/components/mono-value.tsx`, a count as the record states it — and
 * is painted character for character here (rule P-6). The chart counts nothing, sums nothing, rounds
 * nothing and never derives a displayed figure from another. The only numbers it computes are the
 * geometry of a drawing: a bar's offset and extent within the plot, and the axis guides, which are
 * marked `aria-hidden` so a bare guide number is never offered in place of the formatted value the bar
 * itself announces.
 *
 * WHAT IT READS: NOTHING. No store, no service, no seed record, no clock, no effect, no fetch, no
 * configuration: groups, series and the axis maximum arrive as props from a screen that read them
 * through the port (rule P-2), and the surface holds three pieces of state — which mark the keyboard
 * is on and which mark the pointer is on, so the rings can be drawn and the read-out printed, and
 * which evidence reference is open. Colour is never the
 * only meaning: every bar's meaning reaches assistive technology through the accessible name assembled
 * from the group, the series and the formatted value (rule B-3), and through the legend this surface
 * prints for the series it draws.
 *
 * THE LEGEND IS THE SURFACE'S OWN, because a reader who has not yet pointed at a bar has nothing else
 * to tell one series from another: every series the surface draws a mark for gets one row here — its
 * swatch in the tone its bars are painted in and its name in the caller's own words — so the colour
 * key sits beside the plot rather than only inside it. A series the caller supplied with no cell at all
 * gets no row, for the same reason it gets no mark: the legend describes the drawing, and a row for a
 * bar that does not exist would promise one. The row vocabulary is `src/components/legend.tsx`'s — a
 * decorative swatch the label carries the meaning for, then the name — and that component is not
 * composed here because its entry union can describe a status meaning, a competitor and the client's
 * own series, but not an accent-toned option of a scenario comparison, which is what this surface's
 * first-party series is.
 *
 * PROVENANCE IS NEVER BLENDED (rule P-5). Each cell is its own mark and nothing here adds two cells
 * together, so no number on this surface combines a market-intelligence reading with a first-party one.
 * A competitor series is drawn only in a `--color-competitor-*` role — which the tone table below is the
 * single place that decides — so a competitor value cannot take a first-party hue, and its legend row
 * carries the competitor name tag and the market-intelligence label exactly as
 * `src/components/legend.tsx` puts them beside a swatch. That module and this one resolve one tone to
 * one role token, which is why a category keeps its colour between the legend, this chart and the other
 * chart surfaces.
 *
 * THE TONE TABLE HAS ONE DEFINITION, AND IT IS IMPORTED. `src/components/horizontal-bar-chart.tsx`
 * exports the single tone-to-role table the chart surfaces share, so this module resolves every bar's
 * colour through that table instead of restating it: a table copied per chart is a table that drifts,
 * and one category changing hue between two surfaces is the defect the shared table exists to prevent.
 * The table resolves a status meaning to `--color-status-*`, the accent to `--color-accent` and the
 * three competitors to `--color-competitor-1/2/3`, so the legend, this chart and its sibling agree, and
 * `BarTone` below names exactly the table's keys so a tone it does not know fails to compile.
 *
 * KEYBOARD, FOCUS AND THE POINTER (rule B-3, WCAG 2.2 AA). Every cell is a focus stop with its own
 * accessible name, operated by `Enter` or `Space` as well as by the pointer, and every cluster label is
 * a second focus stop that opens the cluster's own evidence. The focus ring is a rectangle drawn in
 * `--color-focus-ring` around the focused slot rather than a CSS outline, because an outline on an SVG
 * `<g>` is not reliably painted by every engine and a slot-shaped ring marks a bar of zero height as
 * focused too. That ring is held in state rather than in a `:focus-visible` utility so that it is
 * observable in a component test without relying on an engine's focus heuristic. The pointer is
 * answered as well: a second slot-shaped ring in the accent role is revealed while the pointer is on
 * the mark or pressing it, and `./chart-readout.tsx` prints the mark's own words beside the drawing —
 * a bar's cluster, its series and its formatted value, and a cluster label's every series in that
 * cluster. Both the pointer's ring and the read-out are held in the same React state as the focus
 * ring, because every hover variant this project emits lives inside `@media (hover: hover)`: a
 * CSS-only reveal is inert wherever that media query does not match and could never carry the words a
 * read-out has to print. The variants stay on the mark's own group as an extra cue. Closing a drawer
 * puts focus back on the control that opened it, which the surface does itself because the drawer
 * restores focus only to an HTML element while these controls are SVG groups.
 *
 * MOTION. One property fades and nothing moves: the pointer ring's opacity is carried by a
 * `motion-safe` transition, so a reduced-motion session is shown the same resting, hovered and pressed
 * drawing with the fade suppressed and no state of this surface depends on an animation finishing.
 *
 * THE EVIDENCE DRAWER IS A SIBLING OF THE `<svg>`, never a child: an HTML dialog inside an SVG document
 * fragment is not rendered by the browser, so the drawer is composed after the surface, outside it, and
 * portals itself into `document.body` (see `src/components/evidence-drawer.tsx`). A cell's own
 * `evidenceRef` is what opens — the reference the record behind that one bar carries — and the cluster
 * label opens the reference its `BarGroup` carries.
 */
import { useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';

import { COMPETITOR_NAME_TAG, SIM_LABELS } from '../types';
import type { SimLabel } from '../types';

import { EvidenceDrawer } from './evidence-drawer';
import { ChartReadout } from './chart-readout';
import type { ChartReadoutLine } from './chart-readout';
import { CHART_TONE_CLASSES } from './horizontal-bar-chart';
import type { StatusMeaning } from './status-indicator';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * The strings this surface states by itself, held here so the wording has one owner: the component
 * renders them and its suite reads them through this object instead of retyping them.
 *
 * Neither string is a fixed specification string — the seven §5.3 simulation labels belong to the
 * figures that carry them and arrive as `SimLabel` through the frame (rule P-1), and every other word
 * on screen is the caller's: a group label, a series label and an already-formatted value label. What
 * is left is the fallback name of the graphic and the words that tell a reader what activating a
 * cluster label does, so no string here carries a figure, an identifier or a claim (rules P-4, P-6).
 */
export const GROUPED_BAR_CHART_TEXT = {
  /**
   * The graphic's accessible name when the caller supplies no `yAxisLabel`.
   *
   * It names what the surface is and says nothing about the values in it, which the caller owns.
   */
  chartLabel: 'Grouped bar chart',

  /**
   * What activating a cluster label does, appended to the group's own label.
   *
   * The visible label comes first so the accessible name still contains what the reader sees
   * (WCAG 2.2 SC 2.5.3), and the suffix says what the control does rather than leaving a reader to
   * guess why a category name is operable.
   */
  groupActivationSuffix: '— open evidence',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The series vocabulary
 * ------------------------------------------------------------------------------------------- */

/**
 * The colour a series is drawn in, as one of the role-token families the design system fixes.
 *
 * The union is the shared status vocabulary of `src/components/status-indicator.tsx` plus the accent
 * role and the three competitor hues of specification §4.2, and nothing else: a chart may not invent a
 * hue, so the only colours reachable from here are the roles the token layer exposes.
 */
export type BarTone =
  | StatusMeaning
  | 'accent'
  | 'competitor-1'
  | 'competitor-2'
  | 'competitor-3';

/**
 * One cluster on the x axis: an order, a severity band, or whatever else a caller groups by.
 *
 * `evidenceRef` is required and is not decoration. A cluster is a set of figures a reader may want to
 * interrogate as a whole — what the order is, where its numbers came from — so the group label is
 * itself a control that opens this reference, and a group without one cannot be constructed.
 */
export interface BarGroup {
  /** The group's identifier, unique within one chart, so React can key the cluster. */
  readonly id: string;

  /** The label printed under the axis and used as the start of every cell's accessible name. */
  readonly label: string;

  /** The reference the drawer resolves for the cluster's own evidence. Required. */
  readonly evidenceRef: string;
}

/**
 * One cell of one series: the value to draw, the words that state it, and the evidence behind it.
 *
 * `valueLabel` arrives **already formatted** and is painted character for character (rule P-6): the
 * chart owns no money, count or percentage format, so a caller that formats an amount elsewhere cannot
 * have this surface show the same amount differently. It is also the last part of the cell's accessible
 * name, so the words a sighted reader sees beside a bar are the words a screen-reader user hears.
 *
 * `evidenceRef` is required per cell for the same reason as on the group: the figure a reader wants to
 * question is one bar's number, not the chart's, and the drawer must open that record rather than the
 * surface's.
 */
export interface BarSeriesValue {
  /** The value to draw. Geometry only: the chart never states it and never formats it. */
  readonly value: number;

  /** The value as the caller formatted it, painted beside the bar and announced with it. */
  readonly valueLabel: string;

  /** The reference the drawer resolves for this cell's evidence. Required. */
  readonly evidenceRef: string;
}

/**
 * One series across every group, aligned with `groups` by index.
 *
 * `values[groupIndex]` is the cell of this series in that cluster. A series shorter than `groups` draws
 * no mark for the clusters it does not reach, which is deliberate: a missing reading is not a zero, and
 * fabricating one would put a figure on screen that no record states (rule P-6).
 */
export interface BarSeries {
  /** The series' identifier, unique within one chart, and the value `onActivate` reports. */
  readonly id: string;

  /** The series' name, printed in this surface's legend and used in every mark's accessible name. */
  readonly label: string;

  /** The role family the bars are painted in. One tone per series, the same in every cluster. */
  readonly tone: BarTone;

  /** The cells, aligned by index with the chart's `groups`. */
  readonly values: readonly BarSeriesValue[];
}

/**
 * What the caller of {@link GroupedBarChart} supplies: the clusters and the series compared inside
 * each one, every label already formatted by the module that computed the figure, and the axis
 * maximum the bars are scaled against. The maximum is the caller's because only it knows whether a
 * fixed ceiling applies, and a domain derived here would let a bar added later re-scale a figure
 * already compared (AAP §0.12.4).
 */
export interface GroupedBarChartProps {
  /** The clusters along the axis, in the order they are drawn. Required: none renders no surface. */
  readonly groups: readonly BarGroup[];

  /** The series compared inside every cluster. Required: none renders no surface. */
  readonly series: readonly BarSeries[];

  /**
   * The axis maximum the bars are scaled against, supplied by the caller rather than derived here.
   *
   * It is a prop because only the caller knows whether the maximum of the data is the right scale — a
   * series compared against a fixed ceiling must not be re-scaled by a bar added later — and because
   * deriving it would make this surface compute a displayed figure. A non-finite value, zero or a
   * negative value leaves every bar at the baseline instead of dividing by it, so a caller's mistake
   * draws an empty chart rather than an unreadable one.
   */
  readonly max: number;

  /**
   * The value axis' label, printed above the axis and used as the graphic's accessible name.
   *
   * Optional: without it the surface is named `Grouped bar chart` and no axis label is drawn.
   */
  readonly yAxisLabel?: string | undefined;

  /**
   * Called when a cell is activated, with the cluster's index and the series' id.
   *
   * It is the caller's hook for anything beyond opening evidence — recording a selection, previewing a
   * scenario — and it never replaces the drawer: a cell always opens its own evidence.
   */
  readonly onActivate?: ((groupIndex: number, seriesId: string) => void) | undefined;
}

/* ---------------------------------------------------------------------------------------------
 * Geometry — the drawing's own arithmetic, and nothing else
 * --------------------------------------------------------------------------------------------- */

/**
 * The view box the surface is drawn in. It is a coordinate system rather than a size: the element is
 * sized by its container through `SVG_CLASSES`, and the drawing scales with it, so the chart needs no
 * measurement of its parent and no resize observer.
 */
const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 240;

/** The insets that leave room for the tick labels on the start side and the group labels below. */
const PLOT_INSET_START = 36;
const PLOT_INSET_END = 8;
const PLOT_INSET_TOP = 24;
const PLOT_INSET_BOTTOM = 36;

/** The plot rectangle, derived once from the view box and the insets. */
const PLOT_LEFT = PLOT_INSET_START;
const PLOT_RIGHT = VIEW_WIDTH - PLOT_INSET_END;
const PLOT_TOP = PLOT_INSET_TOP;
const PLOT_BOTTOM = VIEW_HEIGHT - PLOT_INSET_BOTTOM;
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;

/** How much of a cluster's width is left as space between clusters, split evenly on both sides. */
const CLUSTER_INSET_RATIO = 0.15;

/** How much of a bar's slot is left as space between the bars of one cluster. */
const BAR_GAP_RATIO = 0.14;

/* BLITZY [A11Y] WCAG 2.2 SC 2.5.8 Equivalent exception: a bar's target is its own slot — the column
   between two neighbouring slots — and a cluster label's target is the band reserved for that label.
   Both are already as large as their allocation and cannot be grown without answering for a
   neighbour's slot, and at a narrow panel one cluster's share of the plot is fewer than 24 CSS px.
   The chart is composed inside `./chart-frame.tsx`, whose "View as table" view reaches the same values
   at full size, which is the equivalent control the exception asks for. */

/** The distance a value label sits above its bar, and a tick label to the start of the plot. */
const VALUE_LABEL_OFFSET = 6;
const TICK_LABEL_OFFSET = 8;

/** The band the group labels occupy below the axis: their top, their height and their baseline. */
const GROUP_LABEL_TOP = PLOT_BOTTOM + 6;
const GROUP_LABEL_HEIGHT = 18;
const GROUP_LABEL_BASELINE = PLOT_BOTTOM + 19;

/** The band the axis label occupies above the plot, and its baseline. */
const AXIS_LABEL_BASELINE = 12;

/** The stroke width of the focus ring, in view-box units, and of the axis guides. */
const FOCUS_RING_WIDTH = 2;
const AXIS_GUIDE_WIDTH = 1;

/** How far a tick label's baseline is moved so it sits centred on its guide. */
const TICK_LABEL_OFFSET_BASELINE = 4;

/**
 * The proportion of the plot a value occupies: the value over the axis maximum, clamped to the drawing.
 *
 * It is geometry, not a displayed figure (rule P-6): the result never reaches the screen as a number,
 * only as the extent of a rectangle. A value that is not finite or not positive draws nothing rather
 * than a negative or inverted bar, and a value above the caller's maximum is clipped to the top of the
 * plot rather than drawn outside it, so one outlier cannot break the axis every other bar shares.
 */
function proportionOf(value: number, scaleMax: number): number {
  if (!Number.isFinite(value) || value <= 0 || scaleMax <= 0) {
    return 0;
  }

  return Math.min(value / scaleMax, 1);
}

/**
 * The guide values the axis is labelled with, derived from the caller's maximum and from nothing else.
 *
 * Three guides — zero, the midpoint and the maximum — are drawn when a maximum yields a whole
 * midpoint, and two when it does not: a midpoint of one and a half is not labelled as a decimal, because
 * this surface owns no number format and an axis that invented one would be a second formatter in a
 * codebase that has exactly one (rule P-6). A maximum that is not a positive number leaves the single
 * zero guide, so the axis still reads as an axis.
 */
function axisGuideValues(scaleMax: number): readonly number[] {
  if (scaleMax <= 0) {
    return [0];
  }

  const midpoint = scaleMax / 2;

  return Number.isInteger(midpoint) ? [0, midpoint, scaleMax] : [0, scaleMax];
}

/**
 * The vertical position of one axis guide inside the plot, and of its label.
 *
 * Both are arithmetic on the guide's own value and the plot's height: the value axis is the vertical
 * one here, which is what lets the group labels sit under the axis and every bar be compared by reading
 * up from the same baseline.
 */
function guideY(value: number, scaleMax: number): number {
  if (scaleMax <= 0) {
    return PLOT_BOTTOM;
  }

  return PLOT_BOTTOM - (value / scaleMax) * PLOT_HEIGHT;
}

/**
 * Which mark of the surface is active: one bar of one cluster, or one cluster's own label.
 *
 * The identity is the cluster and the series themselves rather than a selector string assembled from
 * them: the focus ring, the pointer ring and the read-out all have to locate the same mark, and a key
 * that had to be parsed back into its parts would be a second source of truth beside the one the marks
 * were rendered with.
 */
interface ActiveMark {
  /** The cluster the mark belongs to, as its position in the caller's group list. */
  readonly groupIndex: number;

  /** The series the bar belongs to, or `null` for the cluster's own label. */
  readonly seriesId: string | null;
}

/** Whether two marks are one and the same, so no two of the surface's cues can disagree about it. */
function isSameMark(one: ActiveMark | null, other: ActiveMark): boolean {
  return one !== null && one.groupIndex === other.groupIndex && one.seriesId === other.seriesId;
}

/**
 * The keyboard activation of one control, for both `Enter` and `Space`.
 *
 * `Space` is prevented from scrolling the page, which is the behaviour a browser gives a focused
 * element that does not claim the key; without that, activating a bar by keyboard would move the
 * document instead of opening the evidence the reader asked for. The control itself is handed to the
 * caller, because the surface remembers which one opened the drawer and returns focus to it.
 */
function activationKeyDown(activate: (control: SVGGElement) => void) {
  return (event: ReactKeyboardEvent<SVGGElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(event.currentTarget);
    }
  };
}

/* ---------------------------------------------------------------------------------------------
 * Class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The surface itself: a block that fills the width it is given and keeps the view box's proportion, so
 * the drawing scales with its column instead of overflowing it or collapsing on a narrow screen.
 */
const SVG_CLASSES = 'block h-auto w-full min-w-0';

/** The axis guides and the baseline: the decorative hairline role, at one view-box unit. */
const AXIS_GUIDE_CLASSES = 'stroke-hairline';

/** A bar's invisible slot: it catches the pointer across the whole column, a zero bar included. */
const SLOT_CLASSES = 'fill-none';

/** The cell's and the cluster's focus ring, and the only place the ring's colour is chosen. */
const FOCUS_RING_CLASSES = 'fill-none stroke-focus-ring';

/**
 * The pointer ring: the same slot drawn in the accent role, revealed while the pointer is over the
 * mark or a press is held on it.
 *
 * It is a second element rather than a variant on the focus ring, and both halves of that are
 * deliberate. The focus ring is the surface's own state, so the ring carrying `stroke-focus-ring`
 * stays exactly the element that means "the keyboard is here"; and an accent ring is visibly distinct
 * from the focus ring it is drawn over, so a mark under the pointer reads differently from a mark
 * whose drawer is still open. `pointer-events-none` keeps the resting hit area exactly the slot it was
 * — the ring is a signal, not a target — and `motion-safe:` carries the fade, so a reduced-motion
 * session gets the same active states with no transition (rule B-3).
 *
 * WHICH OF THEM PAINTS IT. The mark the pointer is on is held in React state by the component below,
 * and that state paints the ring through {@link POINTER_RING_VISIBLE_CLASSES} and leaves it invisible
 * through {@link POINTER_RING_HIDDEN_CLASSES}: every hover variant this project's theme layer emits
 * lives inside `@media (hover: hover)`, so the variants below are an extra cue and never what makes
 * the ring correct.
 *
 * No raw palette value, no arbitrary value and no opacity literal appears here: the ring is the accent
 * role at full strength and nothing else, and the theme layer exposes no shadow to select.
 */
const POINTER_RING_BASE_CLASSES =
  'pointer-events-none fill-none stroke-accent group-hover:opacity-100 group-active:opacity-100 motion-safe:transition-opacity motion-safe:duration-150';
const POINTER_RING_HIDDEN_CLASSES = 'opacity-0';
const POINTER_RING_VISIBLE_CLASSES = 'opacity-100';

/**
 * The mark's own group, and the only thing it carries: the `group` marker its ring's variants hang on,
 * as an extra cue over the state that actually reveals the ring.
 */
const MARK_GROUP_CLASSES = 'group';

/**
 * The box the surface and its read-out share: `relative`, so a read-out placed at a share of the view
 * box lands on the mark it describes without either of them being measured.
 */
const SURFACE_WRAPPER_CLASSES = 'relative';

/** The value beside a bar: the secondary text role, in the mono face with tabular numerals. */
const VALUE_TEXT_CLASSES = 'fill-text-secondary font-mono text-12 tabular-nums';

/** A group label is the primary text role: it is a category name a reader reads, not a figure. */
const GROUP_TEXT_CLASSES = 'fill-text-primary text-12';

/** A tick label is a guide, in the secondary role so it never competes with the bars. */
const TICK_TEXT_CLASSES = 'fill-text-secondary text-12';

/** The axis label names what the vertical axis measures, in the caption role above the plot. */
const AXIS_TEXT_CLASSES = 'fill-text-caption text-12';

/* ---------------------------------------------------------------------------------------------
 * The legend: one row per series the surface draws a mark for
 * ------------------------------------------------------------------------------------------- */

/**
 * The market-intelligence label a competitor series' row carries, read from the tuple that owns the
 * seven exact strings rather than retyped, so a reworded label reaches this surface too (rule P-1).
 */
const MARKET_INTELLIGENCE_LABEL: SimLabel = SIM_LABELS[5];

/**
 * The legend's list: one wrapping row, the arrangement `src/components/legend.tsx` uses, so a set of
 * series wraps instead of overflowing the narrowest panel the comparison is read in.
 */
const LEGEND_LIST_CLASSES = 'flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1';

/** One row: the swatch, then the series' name and any tag its provenance requires. */
const LEGEND_ITEM_CLASSES = 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1';

/**
 * The swatch: a 12 px mark with the control radius, the size and shape a legend row takes in
 * `src/components/legend.tsx`. It is decorative and is marked `aria-hidden` at the call site, because
 * the name beside it is what carries the meaning (rule B-3).
 */
const LEGEND_SWATCH_CLASSES = 'inline-block size-3 shrink-0 rounded-control';

/** The series' name: the primary text role, so its contrast is the ratio specification §4 measured. */
const LEGEND_NAME_CLASSES = 'min-w-0 break-words text-13 text-text-primary';

/** A competitor's companion tags: the caption role, so they sit beside the name without competing. */
const LEGEND_TAG_CLASSES = 'min-w-0 break-words text-12 text-text-caption';

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * Draws one grouped bar chart and opens the evidence behind the mark a reader activates.
 *
 * The surface renders nothing at all when it has no groups or no series: a plot with no bars is not a
 * chart, and the state a screen shows in that case belongs to `src/components/state-boundary.tsx`
 * rather than to a graphic inventing a sentence. A series shorter than the group list draws only the
 * cells it carries, for the same reason a missing value is never drawn as a zero.
 *
 * WHICH MARK IS ACTIVE, AND WHY THAT IS STATE RATHER THAN A HOVER VARIANT. The mark under the pointer
 * and the mark holding focus are held here — as the cluster and the series they belong to, never as a
 * selector string — and they are what paints the rings and what the read-out beside the drawing
 * describes. A CSS-only reveal cannot carry that: every hover variant this project's theme layer
 * emits ships inside `@media (hover: hover)`, so it is inert wherever the engine never matches it and
 * cannot be observed in a component test at all, and a read-out has to know which mark it belongs to.
 * The variants stay beside the state as an extra cue.
 *
 * The active mark and the open evidence reference are the only state. Neither is synchronised from a
 * prop and neither is written in an effect, so a re-render from above cannot silently close a drawer,
 * drop a ring or leave a read-out describing a mark that has moved.
 */
export function GroupedBarChart({
  groups,
  series,
  max,
  yAxisLabel,
  onActivate,
}: GroupedBarChartProps): ReactElement | null {
  const [focused, setFocused] = useState<ActiveMark | null>(null);
  const [pointed, setPointed] = useState<ActiveMark | null>(null);
  const [activeEvidenceRef, setActiveEvidenceRef] = useState<string | null>(null);
  const triggerRef = useRef<SVGGElement | null>(null);

  const isEmpty = groups.length === 0 || series.length === 0;
  const scaleMax = Number.isFinite(max) && max > 0 ? max : 0;
  const clusterWidth = isEmpty ? 0 : PLOT_WIDTH / groups.length;
  const clusterInset = clusterWidth * CLUSTER_INSET_RATIO;
  const slotWidth = isEmpty ? 0 : (clusterWidth - clusterInset * 2) / series.length;
  const barWidth = slotWidth * (1 - BAR_GAP_RATIO);
  const guides = axisGuideValues(scaleMax);
  /**
   * The series the surface draws a mark for: one legend row each.
   *
   * A series the caller supplied with no cell draws nothing at all, so a row for it would key a colour
   * to a bar that is not on the plot. The test is the same one the marks are drawn under — a cell for
   * some group — rather than a second rule of this surface's.
   */
  const drawnSeries = series.filter((barSeries) => barSeries.values.length > 0);

  /** Opens the drawer on one reference; every control on the surface goes through it. */
  function openEvidence(control: SVGGElement, evidenceRef: string): void {
    triggerRef.current = control;
    setActiveEvidenceRef(evidenceRef);
  }

  /** Clears the focus ring when the control that held it loses focus to anywhere else. */
  function clearFocus(mark: ActiveMark): void {
    setFocused((current) => (isSameMark(current, mark) ? null : current));
  }

  /** Makes one mark the one the pointer is on: what entering it or pressing it sets. */
  function activatePointer(mark: ActiveMark): void {
    setPointed(mark);
  }

  /**
   * Clears the pointer's mark, but only for the mark that still holds it: a pointer crossing from one
   * slot to the next reports the leaving one first, and clearing unconditionally would blank the
   * read-out the entering mark is about to set.
   */
  function releasePointer(mark: ActiveMark): void {
    setPointed((current) => (isSameMark(current, mark) ? null : current));
  }

  /**
   * Closes the drawer, and puts the reader back where they were.
   *
   * The drawer never decides this itself; the surface that opened it does. Focus is returned to the
   * control that opened it, in the microtask after the dialog has unmounted: the drawer restores focus
   * only to an HTML element, and this surface's controls are SVG groups, so a keyboard reader would
   * otherwise be dropped at the top of the document after closing one bar's evidence (rule B-3,
   * WCAG 2.2 SC 2.4.3 — the spotlight does not move away from where the reader left it).
   */
  function closeEvidence(): void {
    const control = triggerRef.current;
    setActiveEvidenceRef(null);
    queueMicrotask(() => {
      control?.focus();
    });
  }

  /**
   * The read-out the active mark shows, or `null` while no mark is active.
   *
   * A bar reads out its own cluster, its own series and its own formatted value; a cluster's label
   * reads out every series' reading in that cluster, which is the whole column a reader pointing at the
   * category is asking about. The anchor is the geometry the mark is already drawn at, turned into a
   * share of the view box by `./chart-readout.tsx`, so the read-out lands on the mark it describes at
   * any width and needs no measurement of the drawing. Nothing here formats a figure: every string is
   * the caller's own (rule P-6).
   *
   * @param mark The mark the pointer is on or the keyboard is on, if any.
   * @returns The read-out beside the drawing, or `null` where there is nothing to read out.
   */
  function readoutFor(mark: ActiveMark | null): ReactElement | null {
    if (mark === null) {
      return null;
    }

    const group = groups[mark.groupIndex];

    if (group === undefined) {
      return null;
    }

    const clusterLeft = PLOT_LEFT + mark.groupIndex * clusterWidth;

    if (mark.seriesId === null) {
      return (
        <ChartReadout
          anchor={{
            x: clusterLeft + clusterWidth / 2,
            y: GROUP_LABEL_TOP,
            viewBoxWidth: VIEW_WIDTH,
            viewBoxHeight: VIEW_HEIGHT,
          }}
          title={group.label}
          lines={readingsOfCluster(mark.groupIndex)}
        />
      );
    }

    const seriesIndex = series.findIndex((barSeries) => barSeries.id === mark.seriesId);
    const barSeries = series[seriesIndex];
    const cell = barSeries?.values[mark.groupIndex];

    if (barSeries === undefined || cell === undefined) {
      return null;
    }

    const slotLeft = clusterLeft + clusterInset + seriesIndex * slotWidth;
    const barLeft = slotLeft + (slotWidth - barWidth) / 2;

    return (
      <ChartReadout
        anchor={{
          x: barLeft + barWidth / 2,
          y: PLOT_BOTTOM - proportionOf(cell.value, scaleMax) * PLOT_HEIGHT,
          viewBoxWidth: VIEW_WIDTH,
          viewBoxHeight: VIEW_HEIGHT,
        }}
        title={group.label}
        lines={[{ label: barSeries.label, value: cell.valueLabel }]}
      />
    );
  }

  /** Every series' reading in one cluster, in the order the caller lists them, for a cluster's label. */
  function readingsOfCluster(groupIndex: number): readonly ChartReadoutLine[] {
    return series.flatMap((barSeries) => {
      const cell = barSeries.values[groupIndex];

      return cell === undefined ? [] : [{ label: barSeries.label, value: cell.valueLabel }];
    });
  }

  if (isEmpty) {
    return null;
  }

  return (
    <>
      <div className={SURFACE_WRAPPER_CLASSES}>
        <svg
          role="group"
          aria-label={yAxisLabel ?? GROUPED_BAR_CHART_TEXT.chartLabel}
          viewBox={`0 0 ${String(VIEW_WIDTH)} ${String(VIEW_HEIGHT)}`}
          preserveAspectRatio="xMidYMid meet"
          className={SVG_CLASSES}
        >
          {/* The axis and its guides are guides, not values: hidden from assistive technology so the
              unformatted numbers here never stand in for the formatted label each bar announces. */}
          <g aria-hidden="true">
            {yAxisLabel === undefined ? null : (
              <text x={0} y={AXIS_LABEL_BASELINE} className={AXIS_TEXT_CLASSES}>
                {yAxisLabel}
              </text>
            )}
            {guides.map((guide) => {
              const guidePosition = guideY(guide, scaleMax);

              return (
                <g key={guide}>
                  {guide > 0 ? (
                    <line
                      x1={PLOT_LEFT}
                      x2={PLOT_RIGHT}
                      y1={guidePosition}
                      y2={guidePosition}
                      strokeWidth={AXIS_GUIDE_WIDTH}
                      className={AXIS_GUIDE_CLASSES}
                    />
                  ) : null}
                  <text
                    x={PLOT_LEFT - TICK_LABEL_OFFSET}
                    y={guidePosition + TICK_LABEL_OFFSET_BASELINE}
                    textAnchor="end"
                    className={TICK_TEXT_CLASSES}
                  >
                    {String(guide)}
                  </text>
                </g>
              );
            })}
            <line
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={PLOT_BOTTOM}
              y2={PLOT_BOTTOM}
              strokeWidth={AXIS_GUIDE_WIDTH}
              className={AXIS_GUIDE_CLASSES}
            />
          </g>
          {groups.map((group, groupIndex) => {
            const clusterLeft = PLOT_LEFT + groupIndex * clusterWidth;
            const clusterCentre = clusterLeft + clusterWidth / 2;
            const clusterMark: ActiveMark = { groupIndex, seriesId: null };
            const isClusterPointed = isSameMark(pointed, clusterMark);
            const clusterLabelWidth = Math.max(clusterWidth - clusterInset * 2, 0);

            return (
              <g key={group.id}>
                {series.map((barSeries, seriesIndex) => {
                  const cell = barSeries.values[groupIndex];

                  if (cell === undefined) {
                    return null;
                  }

                  const slotLeft = clusterLeft + clusterInset + seriesIndex * slotWidth;
                  const barLeft = slotLeft + (slotWidth - barWidth) / 2;
                  const barHeight = proportionOf(cell.value, scaleMax) * PLOT_HEIGHT;
                  const barTop = PLOT_BOTTOM - barHeight;
                  const mark: ActiveMark = { groupIndex, seriesId: barSeries.id };
                  const isPointed = isSameMark(pointed, mark);
                  const activate = (control: SVGGElement): void => {
                    openEvidence(control, cell.evidenceRef);
                    onActivate?.(groupIndex, barSeries.id);
                  };

                  return (
                    <g
                      key={barSeries.id}
                      role="button"
                      tabIndex={0}
                      aria-haspopup="dialog"
                      aria-label={`${group.label}, ${barSeries.label}: ${cell.valueLabel}`}
                      className={MARK_GROUP_CLASSES}
                      onPointerEnter={() => {
                        activatePointer(mark);
                      }}
                      onPointerDown={() => {
                        activatePointer(mark);
                      }}
                      onPointerLeave={() => {
                        releasePointer(mark);
                      }}
                      onFocus={() => {
                        setFocused(mark);
                      }}
                      onBlur={() => {
                        clearFocus(mark);
                      }}
                      onClick={(event) => {
                        activate(event.currentTarget);
                      }}
                      onKeyDown={activationKeyDown(activate)}
                    >
                      <rect
                        x={slotLeft}
                        y={PLOT_TOP}
                        width={slotWidth}
                        height={PLOT_HEIGHT}
                        pointerEvents="all"
                        className={SLOT_CLASSES}
                      />
                      <rect
                        x={barLeft}
                        y={barTop}
                        width={barWidth}
                        height={barHeight}
                        className={CHART_TONE_CLASSES[barSeries.tone].fill}
                      />
                      <text
                        x={barLeft + barWidth / 2}
                        y={barTop - VALUE_LABEL_OFFSET}
                        textAnchor="middle"
                        className={VALUE_TEXT_CLASSES}
                      >
                        {cell.valueLabel}
                      </text>
                      {/* The pointer's ring: nothing until the pointer is on this mark or pressing it. */}
                      <rect
                        x={slotLeft}
                        y={PLOT_TOP}
                        width={slotWidth}
                        height={PLOT_HEIGHT}
                        strokeWidth={FOCUS_RING_WIDTH}
                        className={`${POINTER_RING_BASE_CLASSES} ${
                          isPointed ? POINTER_RING_VISIBLE_CLASSES : POINTER_RING_HIDDEN_CLASSES
                        }`}
                      />
                      {isSameMark(focused, mark) ? (
                        <rect
                          x={slotLeft}
                          y={PLOT_TOP}
                          width={slotWidth}
                          height={PLOT_HEIGHT}
                          strokeWidth={FOCUS_RING_WIDTH}
                          className={FOCUS_RING_CLASSES}
                        />
                      ) : null}
                    </g>
                  );
                })}
                <g
                  role="button"
                  tabIndex={0}
                  aria-haspopup="dialog"
                  aria-label={`${group.label} ${GROUPED_BAR_CHART_TEXT.groupActivationSuffix}`}
                  className={MARK_GROUP_CLASSES}
                  onPointerEnter={() => {
                    activatePointer(clusterMark);
                  }}
                  onPointerDown={() => {
                    activatePointer(clusterMark);
                  }}
                  onPointerLeave={() => {
                    releasePointer(clusterMark);
                  }}
                  onFocus={() => {
                    setFocused(clusterMark);
                  }}
                  onBlur={() => {
                    clearFocus(clusterMark);
                  }}
                  onClick={(event) => {
                    openEvidence(event.currentTarget, group.evidenceRef);
                  }}
                  onKeyDown={activationKeyDown((control) => {
                    openEvidence(control, group.evidenceRef);
                  })}
                >
                  <rect
                    x={clusterLeft + clusterInset}
                    y={GROUP_LABEL_TOP}
                    width={clusterLabelWidth}
                    height={GROUP_LABEL_HEIGHT}
                    pointerEvents="all"
                    className={SLOT_CLASSES}
                  />
                  <text
                    x={clusterCentre}
                    y={GROUP_LABEL_BASELINE}
                    textAnchor="middle"
                    className={GROUP_TEXT_CLASSES}
                  >
                    {group.label}
                  </text>
                  {/* The pointer's ring: nothing until the pointer is on this label or pressing it. */}
                  <rect
                    x={clusterLeft + clusterInset}
                    y={GROUP_LABEL_TOP}
                    width={clusterLabelWidth}
                    height={GROUP_LABEL_HEIGHT}
                    strokeWidth={FOCUS_RING_WIDTH}
                    className={`${POINTER_RING_BASE_CLASSES} ${
                      isClusterPointed ? POINTER_RING_VISIBLE_CLASSES : POINTER_RING_HIDDEN_CLASSES
                    }`}
                  />
                  {isSameMark(focused, clusterMark) ? (
                    <rect
                      x={clusterLeft + clusterInset}
                      y={GROUP_LABEL_TOP}
                      width={clusterLabelWidth}
                      height={GROUP_LABEL_HEIGHT}
                      strokeWidth={FOCUS_RING_WIDTH}
                      className={FOCUS_RING_CLASSES}
                    />
                  ) : null}
                </g>
              </g>
            );
          })}
        </svg>

        {/* The read-out the active mark answers with: a bar names its cluster, its series and its own
            value, and a cluster's label names every series in that cluster. The pointer's mark wins
            over the focused one, so a reader moving the pointer always reads what is under it. */}
        {readoutFor(pointed ?? focused)}
      </div>

      {/* The legend: one row per series the surface draws a mark for, each carrying the tone its bars
          are painted in. It is a list of peers, and it is given `role="list"` explicitly because a
          marker-less list loses its list semantics in some engines, which would read the rows as plain
          runs of text (rule B-3). Each swatch is hidden from assistive technology so the meaning reaches
          a reader through the series' name beside it and never through colour alone. */}
      {drawnSeries.length === 0 ? null : (
        <ul role="list" className={LEGEND_LIST_CLASSES}>
          {drawnSeries.map((barSeries) => (
            <li key={barSeries.id} className={LEGEND_ITEM_CLASSES}>
              <span
                aria-hidden="true"
                className={`${LEGEND_SWATCH_CLASSES} ${CHART_TONE_CLASSES[barSeries.tone].swatch}`}
              />
              <span className={LEGEND_NAME_CLASSES}>{barSeries.label}</span>
              {competitorTagsOf(barSeries.tone)}
            </li>
          ))}
        </ul>
      )}
      {activeEvidenceRef === null ? null : (
        <EvidenceDrawer evidenceRef={activeEvidenceRef} onClose={closeEvidence} />
      )}
    </>
  );
}

/**
 * The tags a competitor series' legend row carries, and nothing at all for any other series.
 *
 * Rule P-5 requires every competitor element to carry `Simulated market intelligence` and every
 * competitor name `Synthetic company`; both strings come from the constants in `src/types`, so this
 * module holds no copy of either, and the accessibility-tree space between the name and the first tag
 * is written for the same reason `src/components/legend.tsx` writes it: adjacent elements contribute
 * their text with nothing between them, so without it a reader hears the name and the tags fused into
 * one run of letters.
 *
 * @param tone - The role family the series' bars are painted in.
 * @returns The two tags for a competitor series, or `null` for a first-party one.
 */
function competitorTagsOf(tone: BarTone): ReactElement | null {
  if (tone !== 'competitor-1' && tone !== 'competitor-2' && tone !== 'competitor-3') {
    return null;
  }

  return (
    <>
      {' '}
      <span className={LEGEND_TAG_CLASSES}>{COMPETITOR_NAME_TAG}</span>{' '}
      <span className={LEGEND_TAG_CLASSES}>{MARKET_INTELLIGENCE_LABEL}</span>
    </>
  );
}
