/**
 * The one read-out the four custom SVG charts show for the mark a reader is pointing at or has
 * focused, and the one place a chart mark's target size is turned from user units into CSS pixels.
 *
 * WHY THE READ-OUT IS HTML BESIDE THE DRAWING, NOT TEXT INSIDE IT. Each chart draws into a `viewBox`
 * and the element is `h-auto w-full`, so every length inside it scales with the width the frame gives
 * it: a label set at `text-12` inside a 680-unit box renders at about 6 CSS px in a 390 px panel, and
 * a value a reader cannot read is not a read-out. This element is composed in a `relative` wrapper
 * next to the `<svg>` and positioned at the mark's own place expressed as a percentage of the
 * `viewBox`, so it needs no measurement to land on its mark, does not scale down with the drawing,
 * and stays at the type scale's own size at every width.
 *
 * WHAT IT PRINTS — WHAT THE CALLER ALREADY FORMATTED (rule P-6). `title` and every line's `label` and
 * `value` are strings the caller supplies, and this module composes no figure, rounds nothing and
 * reads no record: the value a mark announces to a screen reader is the value the read-out paints, so
 * a pointer reader and a keyboard reader are shown one reading rather than two that could disagree.
 *
 * WHERE IT IS ALLOWED TO PAINT. The wrapper is its containing block, so the placement is clamped
 * against the wrapper rather than the window: the box is flipped to the anchor's left-hand side near
 * the right edge, grown rightwards near the left edge, and placed below its mark near the top edge,
 * and its width is capped at the room that remains on that side. A read-out can therefore never leave
 * the figure it belongs to, which is what keeps it inside a narrow panel and inside the frame's own
 * bounds at 1920 px alike.
 *
 * WHY IT IS DRIVEN BY REACT STATE AND NOT BY `group-hover`. Every hover variant this project's theme
 * layer emits ships inside `@media (hover: hover)`, so a CSS-only reveal is inert on a device that
 * reports no hover capability, and it cannot be observed in a component test at all. The charts hold
 * the active mark in state, set it from `pointerenter`, `pointerdown` and `focus` and clear it from
 * `pointerleave` and `blur`; the CSS variants stay only as an extra cue over that state.
 *
 * Rules served: B-1 (React and role tokens only — no charting or positioning dependency), B-3 (a
 * visible read-out for the pointer as well as the keyboard, on the type scale's measured roles), P-6
 * (every printed string arrives formatted).
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactElement, RefObject } from 'react';

/* ---------------------------------------------------------------------------------------------
 * The target size, and how a drawing's units become CSS pixels
 * ------------------------------------------------------------------------------------------- */

/**
 * The smallest pointer or focus target rule B-3 and AAP §0.2 accept: WCAG 2.2 SC 2.5.8's 24 by 24
 * CSS pixel minimum.
 *
 * It is CSS pixels, never `viewBox` units, which is the whole point of {@link chartTargetRadius}: a
 * `viewBox` unit is a proportion, so a target 24 units across renders at 24 CSS px only in a drawing
 * shown at its natural width.
 */
export const MIN_TARGET_DIAMETER_PX = 24;

/**
 * What a chart's `svg` element is measured through, and the scale it currently renders at.
 *
 * `scale` is CSS pixels per `viewBox` unit, or `null` while the drawing has no layout — under jsdom
 * every element measures zero, so a suite sees `null` and each chart keeps its own base geometry
 * rather than dividing by nothing.
 */
export interface ChartScale {
  /** Attached to the chart's `<svg>`, which is the element the scale is measured from. */
  readonly surfaceRef: RefObject<SVGSVGElement | null>;

  /** CSS pixels per user unit of the drawing, or `null` where nothing could be measured. */
  readonly scale: number | null;
}

/**
 * Measures how many CSS pixels one `viewBox` unit of a drawing is currently worth, and keeps that
 * measurement current as the frame around the drawing changes width.
 *
 * The measurement is `renderedWidth / viewBoxWidth`, read from the element's own box rather than from
 * its container, so it stays right whether the drawing is scaled by a panel, a grid column or a
 * screenshot's device scale. A `ResizeObserver` re-reads it whenever the element's box changes, which
 * is what makes a target sized from it stay at its CSS size when the panel narrows; where the
 * platform has no `ResizeObserver` the initial reading still stands, and where nothing has a width
 * yet the chart is told `null` and falls back to its own base geometry.
 *
 * @param viewBoxWidth The width of the drawing's `viewBox`, in user units.
 * @returns The ref to attach to the `<svg>` and the scale it is drawn at, or `null`.
 */
export function useChartScale(viewBoxWidth: number): ChartScale {
  const surfaceRef = useRef<SVGSVGElement | null>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const surface = surfaceRef.current;

    if (surface === null || !(viewBoxWidth > 0)) {
      return;
    }

    function measure(): void {
      const rendered = surface?.getBoundingClientRect().width ?? 0;
      setScale(rendered > 0 ? rendered / viewBoxWidth : null);
    }

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(surface);

    return () => {
      observer.disconnect();
    };
  }, [viewBoxWidth]);

  return { surfaceRef, scale };
}

/**
 * The radius, in a drawing's own units, that makes a mark's target at least
 * {@link MIN_TARGET_DIAMETER_PX} across at the scale the drawing is rendered at.
 *
 * WHERE THE SPACING DECIDES, AND WHY THE TARGET STOPS THERE. Growing a target past the room its mark
 * has between its neighbours would hand one mark's share of the drawing to another: two adjacent
 * points would answer for each other's x, and a reader aiming at one would open the other. The target
 * is therefore held at the mark's own slot whenever 24 CSS px does not fit in it, and the chart relies
 * on the Equivalent exception SC 2.5.8 provides for exactly that case (see the note below this block).
 *
 * @param scale CSS pixels per user unit from {@link useChartScale}, or `null` where unmeasured.
 * @param baseRadius The radius the drawing uses when nothing has been measured.
 * @param slotSize The distance, in user units, that a mark has to itself before it meets a neighbour.
 *   Pass `Number.POSITIVE_INFINITY` where the chart resolves a pointer to the nearest mark, so
 *   overlap cannot make a target ambiguous and there is no slot to stay inside.
 * @returns The radius to draw the target at, in the drawing's own units, never below `baseRadius`.
 */
/* BLITZY [A11Y] WCAG 2.2 SC 2.5.8 Equivalent exception: where a mark's own slot cannot hold a 24 by
   24 CSS pixel target, the target is held at the slot rather than grown over a neighbour, and the
   chart relies on the equivalent control every chart frame carries — the "View as table" view of
   `./chart-frame.tsx`, which reaches the same values at full size. The target is still enlarged to
   24 px wherever the slot has the room, which is what this function computes. */
export function chartTargetRadius(
  scale: number | null,
  baseRadius: number,
  slotSize: number,
): number {
  if (scale === null || !(scale > 0)) {
    return baseRadius;
  }

  const needed = MIN_TARGET_DIAMETER_PX / 2 / scale;
  const allowed = Math.max(slotSize / 2, baseRadius);

  return Math.max(baseRadius, Math.min(needed, allowed));
}

/* ---------------------------------------------------------------------------------------------
 * The read-out itself
 * --------------------------------------------------------------------------------------------- */

/** One line of a read-out: the series or category it names, and the value that belongs to it. */
export interface ChartReadoutLine {
  /** What the value belongs to — a series' name, in the caller's own wording. */
  readonly label: string;

  /** The value, formatted by the module that computed it. Printed, never recomputed here. */
  readonly value: string;
}

/**
 * Where a read-out belongs: the mark's own position in the drawing's user units, with the `viewBox`
 * those units are measured against.
 *
 * The mark's position arrives in units rather than as a percentage so no chart repeats the
 * conversion, and the `viewBox` arrives with it so the conversion stays correct for a drawing whose
 * box grows with its content — `./radar-chart.tsx`'s does, one row per series.
 */
export interface ChartReadoutAnchor {
  /** The mark's horizontal position, in the drawing's own user units. */
  readonly x: number;

  /** The mark's vertical position, in the drawing's own user units. */
  readonly y: number;

  /** The width of the drawing's `viewBox`, in the same units. */
  readonly viewBoxWidth: number;

  /** The height of the drawing's `viewBox`, in the same units. */
  readonly viewBoxHeight: number;
}

/** What the caller of {@link ChartReadout} supplies: where the mark is, and the words it reads. */
export interface ChartReadoutProps {
  /** The marked point, in the drawing's own units. */
  readonly anchor: ChartReadoutAnchor;

  /**
   * The heading above the values — the date of a line chart's point, the category of a bar, the axis
   * of a radar vertex. Omitted where the single line below already names everything.
   */
  readonly title?: string | undefined;

  /** One entry per reading at the marked point, in the order the chart draws them. */
  readonly lines: readonly ChartReadoutLine[];
}

/**
 * The share of a drawing a read-out anchors within and stops growing towards: past
 * {@link READOUT_EDGE_PERCENT} the box is flipped to the anchor's own side, so it never reaches the
 * wrapper's edge, and before {@link READOUT_START_PERCENT} it grows rightwards for the same reason.
 */
const READOUT_EDGE_PERCENT = 65;
const READOUT_START_PERCENT = 35;

/**
 * The share of a drawing's height above which a read-out is placed below its mark instead of above
 * it, so a mark near the top of a plot still has its read-out inside the figure.
 */
const READOUT_TOP_PERCENT = 20;

/** The clearance between a read-out and the mark it describes, on the 4 px spacing grid of AAP §0.5.3. */
const READOUT_GAP_PX = 6;

/**
 * The read-out: a raised surface with a decorative hairline, at the type scale's 12 px step, painted
 * above the drawing and `pointer-events-none` so it can never sit between the pointer and the mark it
 * belongs to. Its width is capped by the inline `maxWidth` the placement resolves, so no fixed limit is
 * declared here. No shadow is selectable, and every colour is a role token, so both themes supply their
 * own measured pairing.
 */
const READOUT_CLASSES =
  'pointer-events-none absolute z-10 flex flex-col gap-1 rounded-card border border-hairline bg-surface-1 px-2 py-1 text-12 text-text-primary';

/** The heading: the mark's own context, in the primary text role at the type scale's own size. */
const TITLE_CLASSES = 'min-w-0 break-words';

/** One reading: its name on the start side and its value on the end side, sharing the row. */
const LINE_CLASSES = 'flex min-w-0 items-baseline justify-between gap-3';

/** The series or category a value belongs to: the secondary role, so the value stays the emphasis. */
const LINE_LABEL_CLASSES = 'min-w-0 break-words text-text-secondary';

/**
 * The value itself: the primary role in the tabular mono face, because an amount, a count, a date and
 * an identifier are set in tabular figures (AAP §0.5.3). It is printed exactly as the caller passed
 * it.
 */
const LINE_VALUE_CLASSES = 'shrink-0 font-mono tabular-nums text-text-primary';

/** Keeps a share of the drawing inside `[0, 100]`, so a mark on an edge anchors on the edge. */
function shareOf(value: number, extent: number): number {
  if (!(extent > 0) || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max((value / extent) * 100, 0), 100);
}

/**
 * The style that paints a read-out at its mark, inside the wrapper the chart composes around it.
 *
 * The rule, stated once so it can be asserted without a browser:
 *
 * - **Sideways.** An anchor in the right-hand third is answered by a box whose own right edge sits at
 *   the anchor, one in the left-hand third by a box that grows rightwards from it, and anything
 *   between by a box centred on it. `maxWidth` is the room that remains on the chosen side, so a long
 *   category label wraps inside the figure instead of being painted outside it or cut short.
 * - **Vertically.** The box sits above its mark, clear of it by {@link READOUT_GAP_PX}, except near
 *   the top of the drawing, where it sits below the mark for the same reason.
 *
 * Percentages are used throughout because they resolve against the wrapper, which is exactly as wide
 * as the drawing: the read-out therefore needs no measurement of its own and stays on its mark through
 * a resize.
 *
 * @param anchor The mark's position in the drawing's own units.
 * @returns The inline style the read-out is painted with.
 */
export function chartReadoutPlacement(anchor: ChartReadoutAnchor): CSSProperties {
  const left = shareOf(anchor.x, anchor.viewBoxWidth);
  const top = shareOf(anchor.y, anchor.viewBoxHeight);

  const flipped = left >= READOUT_EDGE_PERCENT;
  const grows = left <= READOUT_START_PERCENT;
  const below = top <= READOUT_TOP_PERCENT;

  const translateX = flipped ? '-100%' : grows ? '0' : '-50%';
  const translateY = below ? `${String(READOUT_GAP_PX)}px` : `calc(-100% - ${String(READOUT_GAP_PX)}px)`;
  const room = flipped ? left : grows ? 100 - left : 2 * Math.min(left, 100 - left);

  return {
    left: `${String(left)}%`,
    top: `${String(top)}%`,
    transform: `translate(${translateX}, ${translateY})`,
    maxWidth: `${String(room)}%`,
  };
}

/**
 * The read-out for one marked point: its heading where the caller gave one, then every reading at
 * that point, each a name and the value the caller formatted for it.
 *
 * It carries the `tooltip` role so a reader's assistive technology and the page's own tests can tell
 * it from the drawing's text, and it is a sibling of the `<svg>` rather than a node inside it: an
 * HTML element cannot live in an SVG subtree, and the read-out is at the type scale's size precisely
 * because it is not scaled with the drawing.
 *
 * Nothing is rendered for a point with no readings, so a chart that has no value to report marks no
 * empty box on the figure.
 *
 * @param props The mark's position and the words it reads.
 * @returns The read-out, or `null` when it has nothing to print.
 */
export function ChartReadout({ anchor, title, lines }: ChartReadoutProps): ReactElement | null {
  if (lines.length === 0) {
    return null;
  }

  return (
    <div role="tooltip" className={READOUT_CLASSES} style={chartReadoutPlacement(anchor)}>
      {title === undefined ? null : <p className={TITLE_CLASSES}>{title}</p>}
      {lines.map((line) => (
        <p key={line.label} className={LINE_CLASSES}>
          <span className={LINE_LABEL_CLASSES}>{line.label}</span>
          <span className={LINE_VALUE_CLASSES}>{line.value}</span>
        </p>
      ))}
    </div>
  );
}
