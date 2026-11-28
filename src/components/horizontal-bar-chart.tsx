/**
 * The horizontal bar surface: one magnitude per category, drawn as SVG so no charting library enters
 * the bundle (rule B-1, AAP §0.9). SCR-01 draws its revenue-at-risk bars and its risk-by-plant rows
 * with it, and SCR-13 draws its chokepoint comparison.
 *
 * WHERE IT SITS. This is a pure SVG surface that is composed inside `./chart-frame.tsx`, which owns
 * the figure element, the title in the caption, the surface-wide simulation label and the
 * "View as table" view success criterion 9 requires (AAP §0.5.2, §0.12.4). The module therefore
 * renders no figure element, no caption, no table element, no toggle and no simulation badge of its
 * own: a chart that repeated one of them would put two titles, two tables or two labels on one
 * figure.
 *
 * WHAT ARRIVES ALREADY COMPUTED. The chart computes nothing it displays (rule P-6). `value` is a
 * magnitude used for geometry alone, and `valueLabel` is the text a reader sees — the string
 * `./mono-value.tsx` renders for the same value, supplied by the caller, because an SVG `<text>`
 * cannot host that component's `<span>`. Formatting therefore keeps its single owner, and no amount,
 * identifier or timestamp is ever composed here. Each mark also carries an `evidenceRef`, which is
 * required so a mark cannot exist without the record behind it: activating a mark opens the shared
 * {@link EvidenceDrawer}, and the table view of the same figures belongs to `ChartFrame`, not here.
 *
 * COLOUR, AND WHY A TONE IS A NAME RATHER THAN A VALUE. {@link CHART_TONE_CLASSES} is the one
 * table in which a chart's tone becomes a role token, and it is shared by the four SVG surfaces and
 * by `./legend.tsx`, so a category keeps one colour wherever it is drawn. It maps onto
 * `src/theme/tokens.css`'s role tokens, and a legend row takes its swatch from the entry of the tone
 * it describes, so the row and the mark cannot disagree. No raw palette value, no functional colour
 * notation and no arbitrary colour is reachable from here, and the status tones line up with
 * `StatusMeaning` — a union this module does not own — so a meaning added without a fill fails to
 * compile.
 *
 * RULE P-5 IS A CALLER CONTRACT, STATED HERE SO IT IS NOT LOST. A `competitor-*` tone belongs only to
 * a market-intelligence mark, and no mark may combine a first-party value with a market-intelligence
 * one: this surface draws one bar per datum and sums, stacks and compares nothing, so blending
 * provenance is not something it can do.
 *
 * WHICH COMPETITOR HUE A RECORD IS PAINTED IN IS DECIDED HERE TOO. {@link competitorSlotOf} turns a
 * competitor identifier into the `competitor-1/2/3` slot, so the radar, the legend and the atlas
 * network view resolve a competitor's colour from the record rather than from the position it happens
 * to hold in a list, and two payload lists ordered differently cannot paint one competitor in two
 * hues.
 *
 * KEYBOARD AND FOCUS — rule B-3, WCAG 2.2 AA. Each mark is a `<g role="button" tabIndex={0}>` whose
 * accessible name states the category, the value and, where the datum carries one, the exact §5.3
 * simulation label (`SimLabel`, so rule P-1 is a type rather than a habit and the chart never decides
 * which label applies). `Enter` and `Space` activate it, and the pointer activates it anywhere in the
 * row: the mark paints a row-wide transparent target beneath everything it draws
 * ({@link POINTER_TARGET_FILL}), so the hit area matches the `cursor-pointer` affordance it carries
 * and the ring it draws across the whole row. Because an SVG element receives no visible focus ring
 * from the browser, each mark draws its own in `--color-focus-ring` — the same 2 px ring the rest of
 * the application shows on `:focus-visible`, drawn above the mark so the bar cannot paint over it.
 * The selected mark is marked by a thicker stroke and `aria-current` as well as by nothing else, so
 * its state never rests on colour alone.
 *
 * WHAT IT DOES WHEN IT CANNOT DRAW. An empty `bars` array renders nothing at all, exactly as
 * `./legend.tsx` renders nothing for an empty legend: the seven states are the calling screen's
 * `StateBoundary` to render (AAP §0.12.4), and a blank axis would present one of them badly. A `max`
 * that is not a positive number draws every bar at zero length rather than inventing a domain, and a
 * value beyond `max` is held at the end of the track, so the surface always stays inside its box.
 */
import { useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react';

import type { SimLabel } from '../types';
import { EvidenceDrawer } from './evidence-drawer';
import type { StatusMeaning } from './status-indicator';

/* ---------------------------------------------------------------------------------------------
 * The wording this module owns
 * ------------------------------------------------------------------------------------------- */

/**
 * The strings this component states, held here so the wording has one owner and its suite names them
 * through this object instead of retyping them.
 *
 * `groupLabel` is the surface's accessible name when the caller supplies no `xAxisLabel`. It names
 * the graphic only; the chart's title, its description and its simulation label are `ChartFrame`'s
 * (see the module note), so none of them is repeated here.
 */
export const HORIZONTAL_BAR_CHART_TEXT = {
  /** The accessible name of the surface when the caller supplies no axis label of its own. */
  groupLabel: 'Horizontal bar chart',
} as const;

/* ---------------------------------------------------------------------------------------------
 * Tones: the only place a chart colour becomes a role token
 * --------------------------------------------------------------------------------------------- */

/**
 * The tones a chart mark can take: the six shared status meanings of `./status-indicator.tsx`, the
 * accent role for a first-party series, and the three competitor series of specification §4.2 in the
 * order that section assigns them.
 *
 * It is a union of role names, never a colour, so a caller chooses a meaning and the theme decides
 * what that meaning looks like. A competitor tone may only be used for a market-intelligence mark
 * (rule P-5), which the type cannot enforce and the caller's own provenance therefore has to.
 */
export type ChartTone =
  | StatusMeaning
  | 'accent'
  | 'competitor-1'
  | 'competitor-2'
  | 'competitor-3';

/** The tone a mark takes when its datum names none: the accent role, which §4.1 gives first-party flows. */
export const DEFAULT_CHART_TONE: ChartTone = 'accent';

/**
 * One tone's role token and the four utilities that paint it: the wash inside a mark, its outline,
 * the text it draws in and the swatch a legend shows for it.
 *
 * `roleVariable` is the name of the role custom property `src/theme/tokens.css` exposes, which AAP §0.5.3
 * defines once per theme, and the four utilities are that one property's `fill-`, `stroke-`, `text-`
 * and `bg-` forms. Holding them in one entry is what keeps a tone from taking one token's fill and
 * another token's text, and it is why a re-pointed token reaches every surface at once.
 */
export interface ChartToneClasses {
  /** The role custom property the tone resolves to, e.g. `--color-status-pass`. */
  readonly roleVariable: `--color-${string}`;

  /** The `fill-` utility of {@link roleVariable}, for the wash inside a mark. */
  readonly fill: string;

  /** The `stroke-` utility of the same role variable, for a mark's outline. */
  readonly stroke: string;

  /** The `text-` utility of the same role variable, for a path or a mark drawn in `currentColor`. */
  readonly text: string;

  /** The `bg-` utility of the same role variable, for a legend's swatch. */
  readonly swatch: string;
}

/**
 * Every tone's role token and its four utilities, and the only table in which a chart colour becomes
 * a role token. The four SVG surfaces and `./legend.tsx` resolve their colours here, so a category
 * keeps one colour wherever it is drawn and a re-pointed token is changed in this one place.
 *
 * The status and competitor entries name the roles specification §4.2 assigns them, the accent entry
 * the role §4.1 gives first-party flows. Each utility resolves through `src/theme/tokens.css`, so the
 * same tone paints in the colour the active theme measured for that role and one class list serves
 * both themes. Every entry is one complete literal: Tailwind emits a rule only for text it can scan,
 * so a class name assembled at run time would emit nothing and the mark would draw unpainted. The
 * declaration is exhaustive by type, so a tone added without its token and its utilities fails to
 * compile here rather than rendering an unpainted mark.
 */
export const CHART_TONE_CLASSES = {
  pass: {
    roleVariable: '--color-status-pass',
    fill: 'fill-status-pass',
    stroke: 'stroke-status-pass',
    text: 'text-status-pass',
    swatch: 'bg-status-pass',
  },
  fail: {
    roleVariable: '--color-status-fail',
    fill: 'fill-status-fail',
    stroke: 'stroke-status-fail',
    text: 'text-status-fail',
    swatch: 'bg-status-fail',
  },
  warning: {
    roleVariable: '--color-status-warning',
    fill: 'fill-status-warning',
    stroke: 'stroke-status-warning',
    text: 'text-status-warning',
    swatch: 'bg-status-warning',
  },
  review: {
    roleVariable: '--color-status-review',
    fill: 'fill-status-review',
    stroke: 'stroke-status-review',
    text: 'text-status-review',
    swatch: 'bg-status-review',
  },
  empty: {
    roleVariable: '--color-status-empty',
    fill: 'fill-status-empty',
    stroke: 'stroke-status-empty',
    text: 'text-status-empty',
    swatch: 'bg-status-empty',
  },
  simulated: {
    roleVariable: '--color-status-simulated',
    fill: 'fill-status-simulated',
    stroke: 'stroke-status-simulated',
    text: 'text-status-simulated',
    swatch: 'bg-status-simulated',
  },
  accent: {
    roleVariable: '--color-accent',
    fill: 'fill-accent',
    stroke: 'stroke-accent',
    text: 'text-accent',
    swatch: 'bg-accent',
  },
  'competitor-1': {
    roleVariable: '--color-competitor-1',
    fill: 'fill-competitor-1',
    stroke: 'stroke-competitor-1',
    text: 'text-competitor-1',
    swatch: 'bg-competitor-1',
  },
  'competitor-2': {
    roleVariable: '--color-competitor-2',
    fill: 'fill-competitor-2',
    stroke: 'stroke-competitor-2',
    text: 'text-competitor-2',
    swatch: 'bg-competitor-2',
  },
  'competitor-3': {
    roleVariable: '--color-competitor-3',
    fill: 'fill-competitor-3',
    stroke: 'stroke-competitor-3',
    text: 'text-competitor-3',
    swatch: 'bg-competitor-3',
  },
} as const satisfies Record<ChartTone, ChartToneClasses>;

/* ---------------------------------------------------------------------------------------------
 * Competitor slots — which of §4.2's three competitor roles a record is painted in
 * ------------------------------------------------------------------------------------------- */

/**
 * The slot one competitor is drawn in: the ordinal that selects the `competitor-1/2/3` role of
 * specification §4.2.
 *
 * Three slots exist because that section defines three competitor hues. The radar, the legend and the
 * atlas network view each resolve a competitor's slot through {@link competitorSlotOf}, so a polygon,
 * a swatch and a network mark of one competitor cannot disagree about its colour.
 */
export type CompetitorSlot = 1 | 2 | 3;

/**
 * The identifier pattern the market-intelligence pack's competitors follow: contracts §1's `CMP-nn`.
 *
 * Only the ordinal is captured, and the whole identifier must match, so a competitor's own site
 * (`CMP-01-S1`) or a series that scores it (`SER-CMP-01`) never resolves a slot of its own.
 */
const COMPETITOR_IDENTIFIER_PATTERN = /^CMP-(\d+)$/u;

/** The three ordinals §4.2 gives a hue, in its own order. */
const COMPETITOR_SLOT_ORDINALS = [1, 2, 3] as const;

/**
 * The slot a competitor's records are painted in, derived from its identifier and from nothing else.
 *
 * WHY THE IDENTIFIER AND NOT A POSITION. The three competitor hues are positional, but the lists a
 * caller holds competitors in are not: the radar series, the networks and a table's rows can each
 * arrive in a different order, and a hue resolved from a position in one of those lists paints one
 * competitor in two colours the moment two payload lists are ordered differently. The pack names its
 * competitors `CMP-01` to `CMP-03` (contracts §1), so the identifier carries the ordinal the colour is
 * selected by and every renderer resolves the same slot from the same record field.
 *
 * `null` IS AN ANSWER, AND IT SAYS "NO SLOT OF ITS OWN". An identifier carrying no `CMP-` ordinal, and
 * one whose ordinal is beyond the third competitor, resolves no slot — the caller paints that series
 * in the first competitor hue rather than in the first-party accent, so a competitor is never
 * presented as the client's own reading (rule P-5). A drawing that can only choose between one
 * competitor's hue and another's leaves such a network out instead of recolouring it.
 *
 * @param competitorId - The competitor identifier the record carries, or `null` where it carries none.
 * @returns The competitor's slot, or `null` when the identifier states none.
 */
export function competitorSlotOf(competitorId: string | null | undefined): CompetitorSlot | null {
  if (competitorId === null || competitorId === undefined) {
    return null;
  }

  const match = COMPETITOR_IDENTIFIER_PATTERN.exec(competitorId);

  if (match === null) {
    return null;
  }

  const ordinal = Number(match[1]);

  return COMPETITOR_SLOT_ORDINALS.find((slot) => slot === ordinal) ?? null;
}

/* ---------------------------------------------------------------------------------------------
 * The datum and the props
 * ------------------------------------------------------------------------------------------- */

/**
 * One bar: a category, the magnitude its width encodes, the text a reader sees, and the record the
 * figure came from.
 *
 * `value` drives geometry only, so a caller never scales, rounds or re-labels it here; `valueLabel`
 * is the displayed text, formatted by the owner of the one formatter. `evidenceRef` is required —
 * omitting it is a compile error, not a runtime hole — because every figure on this workspace opens
 * its source, record, instant, freshness and formula (rule P-6, AAP §0.8).
 */
export interface HorizontalBarDatum {
  /** Stable key of the datum, used to key the mark and reported back through `onActivate`. */
  readonly id: string;

  /** The category, as the record states it: a plant, a product, a chokepoint or an exception title. */
  readonly label: string;

  /** The magnitude the bar's length encodes. Not displayed: `valueLabel` is. */
  readonly value: number;

  /**
   * The displayed value text, already formatted for the reader by the caller from the owner of the
   * single formatter — the text `./mono-value.tsx` shows for the same value.
   */
  readonly valueLabel: string;

  /** The reference the evidence drawer resolves for this mark: required, so no mark is unexplained. */
  readonly evidenceRef: string;

  /** The role tone the mark is painted in. Defaults to {@link DEFAULT_CHART_TONE}. */
  readonly tone?: ChartTone | undefined;

  /**
   * The exact §5.3 simulation label this mark carries where its own figure needs one (rule P-1).
   *
   * It is a `SimLabel`, never free text, and the chart never chooses it: a seeded figure carries
   * `Simulated data` and a computed one `Simulated calculation`, and the caller knows which it
   * passed. An SVG `<text>` cannot host the status component that displays a label elsewhere, so the
   * label is spoken in the mark's accessible name, where it sits beside the label and the value it
   * qualifies.
   */
  readonly simLabel?: SimLabel | undefined;
}

/**
 * What the caller of {@link HorizontalBarChart} supplies: one datum per category, each carrying
 * the magnitude its geometry uses, the formatted text a reader sees and the reference its mark
 * opens, plus an axis maximum held constant so two readings of one value draw at one length. A
 * supplied `activeId` marks the selection the screen holds rather than one this surface invents,
 * and an empty array draws nothing (AAP §0.5.2, §0.12.4).
 */
export interface HorizontalBarChartProps {
  /** The bars, in the order they are read. Required; an empty array renders nothing. */
  readonly bars: readonly HorizontalBarDatum[];

  /**
   * The axis maximum, supplied by the caller rather than derived from `bars`.
   *
   * A domain computed from the data would change as a filter narrowed the set, so two readings of
   * the same value would draw at two lengths. The caller passes the same maximum for the same
   * series and the comparison stays honest. A `max` that is not a positive number draws every bar at
   * zero length rather than inventing a scale.
   */
  readonly max: number;

  /**
   * The surface's accessible name — for example the axis' own caption. Defaults to
   * `HORIZONTAL_BAR_CHART_TEXT.groupLabel`; it is never the chart's title, which `ChartFrame` owns.
   */
  readonly xAxisLabel?: string | undefined;

  /**
   * Called with a datum's `id` when its mark is activated, in addition to opening the evidence.
   *
   * SCR-01 uses this to filter the exception queue: the same gesture opens the figure's evidence and
   * narrows the queue behind it.
   */
  readonly onActivate?: ((id: string) => void) | undefined;

  /**
   * The datum currently selected by the screen, if any: marked with a thicker stroke and
   * `aria-current` so the selection is not carried by colour alone.
   */
  readonly activeId?: string | undefined;
}

/* ---------------------------------------------------------------------------------------------
 * Geometry — proportions in the viewBox's own user units, not pixels
 * ------------------------------------------------------------------------------------------- */

/**
 * The viewBox' width in user units. The surface scales to its container (`w-full h-auto`), so these
 * numbers fix the proportions of the drawing rather than any screen size, and the chart reflows with
 * the panel instead of overflowing it.
 */
const CHART_WIDTH = 760;

/** The width of the category-label column, on the start side of the track. */
const LABEL_COLUMN_WIDTH = 176;

/** The width of the value-label column, on the end side of the track. */
const VALUE_COLUMN_WIDTH = 120;

/** Where the track begins: the baseline the bars grow from, and the category labels end. */
const TRACK_START = LABEL_COLUMN_WIDTH;

/** How wide the track is: what is left of the viewBox once both columns are reserved. */
const TRACK_WIDTH = CHART_WIDTH - LABEL_COLUMN_WIDTH - VALUE_COLUMN_WIDTH;

/** One row's height, on the 4 px grid and equal to the compact row height of specification §4.3. */
const ROW_HEIGHT = 32;

/** The bar's thickness inside its row, which leaves the row's padding above and below. */
const BAR_HEIGHT = 14;

/** The bar's offset inside its row, so a thin bar sits on the row's centre line. */
const BAR_OFFSET = (ROW_HEIGHT - BAR_HEIGHT) / 2;

/**
 * How many characters of a category label are drawn before it is shortened.
 *
 * An SVG `<text>` has no `text-overflow: ellipsis`, and this surface is a pure function of its props,
 * so it cannot measure the rendered text either. A fixed budget keeps a long title from running into
 * the bars, and the full label stays in the mark's accessible name, so nothing a reader needs to
 * identify the category is lost — only the drawn run of characters is shortened.
 */
const LABEL_CHARACTER_BUDGET = 24;

/** The mark drawn in place of the characters a shortened label drops. */
const LABEL_ELLIPSIS = '…';

/* ---------------------------------------------------------------------------------------------
 * Class lists, role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The surface itself: it fills its container's width and keeps its viewBox' aspect ratio, so the
 * proportions above survive a narrow panel.
 */
const SURFACE_CLASSES = 'block h-auto w-full';

/** The baseline the bars grow from, in the decorative hairline role, at hairline weight. */
const BASELINE_CLASSES = 'stroke-hairline stroke-1';

/**
 * The corner radius every SVG mark that mirrors the control radius shares: the bar and its row's
 * focus ring in this file, a node's box in `./dependency-graph.tsx` and a pin badge in
 * `./map-canvas.tsx`. It is the control radius role of AAP §0.5.3, which carries specification
 * §4.3's 2 px control radius as `--radius-control` on both themes.
 *
 * It is a class rather than a numeric `rx` attribute because no radius family reaches this shape:
 * `border-radius` does not round an SVG `<rect>` — the `rx` geometry property does — and a
 * presentation attribute cannot hold a `var()` reference, so a literal radius written there would
 * restate the token instead of following it.
 *
 * The candidate has to stay one complete literal exactly as written: Tailwind emits the rule from the
 * text it scans, so a name assembled at run time would emit nothing and the corner would draw square.
 * It is exported so the suite names the utility through it instead of retyping the string.
 */
export const CONTROL_RADIUS_CLASSES = '[rx:var(--radius-control)]';

/**
 * One mark. `group` is what lets the mark's focus ring know it is focused, `cursor-pointer` is the
 * pointer affordance of an operable mark, and the ring-bearing utilities below are variants of it.
 * No `outline-none` reset is present: that reset sets `--tw-outline-style: none`, which would
 * suppress the very ring rule B-3 requires.
 */
const MARK_CLASSES = 'group cursor-pointer';

/**
 * The mark's own focus indication, in the theme's focus-ring role at 2 px: invisible until the mark
 * has keyboard focus, and drawn above the bar so the bar cannot cover it. An SVG element is not
 * given a focus ring by the browser, which is why the ring is a drawn element rather than an
 * `outline` alone.
 */
const FOCUS_RING_CLASSES =
  'pointer-events-none fill-none stroke-focus-ring stroke-2 opacity-0 group-focus-visible:opacity-100';

/** The mark's second focus cue, for the engines that paint an outline on a focused SVG group. */
const MARK_FOCUS_CLASSES = 'focus-visible:outline-2 focus-visible:outline-focus-ring';

/**
 * The paint on a mark's row-wide pointer target, and the one constant here that is a paint attribute
 * rather than a class: the row a mark draws is the control, so a pointer has to land anywhere in it,
 * including the empty track beside a short bar.
 *
 * `transparent` rather than `none` is the whole of why this works. An SVG hit test follows the
 * default `visiblePainted` rule, under which a shape painted `none` is not hit at all while a shape
 * painted transparent is hit across its interior — so a row-wide target painted `none` would leave
 * the mark exactly as inert as no target at all. `./line-chart.tsx` gives each of its points the same
 * target for the same reason (`HIT_RADIUS`, `fill="transparent"`).
 *
 * It is an attribute, never a `fill-transparent` utility: `src/theme/tokens.css` resets the palette
 * with `--color-*: initial`, so that utility would resolve no colour and emit no rule. No palette
 * value is involved either way — `transparent` is a paint keyword, not a colour the theme owns.
 */
const POINTER_TARGET_FILL = 'transparent';

/** The bar of the selected mark: a thicker stroke in the primary text role, so the state is not colour alone. */
const ACTIVE_BAR_CLASSES = 'stroke-text-primary stroke-2';

/** The category label: the secondary text role, so its contrast is the ratio §4 measured for it. */
const LABEL_CLASSES = 'fill-text-secondary text-13';

/**
 * The value label: the primary text role in the mono face, because an amount, an identifier and a
 * timestamp are set in tabular figures (AAP §0.5.3). The text itself arrives formatted.
 */
const VALUE_CLASSES = 'fill-text-primary font-mono text-13';

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders one horizontal bar per datum, scaled from the caller's `max`.
 *
 * Each mark is reachable by `Tab`, operable with `Enter` or `Space`, and named by its category, its
 * value and its simulation label where it has one. Activating a mark opens the evidence behind the
 * figure — the drawer is HTML, so it is rendered as a sibling of the `<svg>` in this component's
 * fragment rather than inside the graphic — and reports the datum's `id` to `onActivate` when the
 * caller supplies it.
 *
 * The selection (`activeId`) only marks a datum the screen has already chosen: this surface keeps no
 * selection of its own beyond the reference whose evidence is open, and it never decides what a
 * screen should filter on.
 */
export function HorizontalBarChart({
  bars,
  max,
  xAxisLabel,
  onActivate,
  activeId,
}: HorizontalBarChartProps): ReactElement | null {
  const [openEvidenceRef, setOpenEvidenceRef] = useState<string | null>(null);

  if (bars.length === 0) {
    return null;
  }

  const divisor = Number.isFinite(max) && max > 0 ? max : 0;
  const height = bars.length * ROW_HEIGHT;

  /** Opens the datum's evidence and reports the activation, in that order, for one gesture. */
  function activate(datum: HorizontalBarDatum): void {
    setOpenEvidenceRef(datum.evidenceRef);
    onActivate?.(datum.id);
  }

  /**
   * Activates a mark from the keyboard. `Enter` and `Space` are the two keys a button answers to, and
   * `Space`'s default is prevented so the page does not scroll beneath the mark.
   */
  function handleKeyDown(
    event: ReactKeyboardEvent<SVGGElement>,
    datum: HorizontalBarDatum,
  ): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    activate(datum);
  }

  /** Closes the drawer. The drawer itself never decides to close (see `./evidence-drawer.tsx`). */
  function closeEvidence(): void {
    setOpenEvidenceRef(null);
  }

  return (
    <>
      <svg
        className={SURFACE_CLASSES}
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        preserveAspectRatio="xMidYMin meet"
        role="group"
        aria-label={xAxisLabel ?? HORIZONTAL_BAR_CHART_TEXT.groupLabel}
        focusable="false"
      >
        <line
          className={BASELINE_CLASSES}
          x1={TRACK_START}
          y1={0}
          x2={TRACK_START}
          y2={height}
        />
        {bars.map((datum, index) => {
          const rowTop = index * ROW_HEIGHT;
          const rowMiddle = rowTop + ROW_HEIGHT / 2;
          const tone = datum.tone ?? DEFAULT_CHART_TONE;
          const isActive = datum.id === activeId;

          return (
            <g
              key={datum.id}
              className={`${MARK_CLASSES} ${MARK_FOCUS_CLASSES}`}
              role="button"
              tabIndex={0}
              aria-label={markName(datum)}
              aria-haspopup="dialog"
              aria-current={isActive ? 'true' : undefined}
              onClick={() => {
                activate(datum);
              }}
              onKeyDown={(event) => {
                handleKeyDown(event, datum);
              }}
            >
              <rect
                x={0}
                y={rowTop}
                width={CHART_WIDTH}
                height={ROW_HEIGHT}
                fill={POINTER_TARGET_FILL}
                aria-hidden="true"
              />
              <text
                className={LABEL_CLASSES}
                x={0}
                y={rowMiddle}
                dominantBaseline="middle"
                aria-hidden="true"
              >
                {drawnLabel(datum.label)}
              </text>
              <rect
                className={joinClassNames(
                  CHART_TONE_CLASSES[tone].fill,
                  isActive ? ACTIVE_BAR_CLASSES : undefined,
                  CONTROL_RADIUS_CLASSES,
                )}
                x={TRACK_START}
                y={rowTop + BAR_OFFSET}
                width={barWidth(datum.value, divisor)}
                height={BAR_HEIGHT}
                aria-hidden="true"
              />
              <text
                className={VALUE_CLASSES}
                x={CHART_WIDTH}
                y={rowMiddle}
                textAnchor="end"
                dominantBaseline="middle"
                aria-hidden="true"
              >
                {datum.valueLabel}
              </text>
              <rect
                className={joinClassNames(FOCUS_RING_CLASSES, CONTROL_RADIUS_CLASSES)}
                x={0}
                y={rowTop}
                width={CHART_WIDTH}
                height={ROW_HEIGHT}
                aria-hidden="true"
              />
            </g>
          );
        })}
      </svg>
      {openEvidenceRef === null ? null : (
        <EvidenceDrawer evidenceRef={openEvidenceRef} onClose={closeEvidence} />
      )}
    </>
  );
}

/**
 * The mark's accessible name: the category and the value a sighted reader can see, then the exact
 * simulation label where the datum carries one, so a screen-reader user hears the same three things
 * the figure discloses on screen (rule P-1). It uses the full `label`, never the shortened drawing.
 */
function markName(datum: HorizontalBarDatum): string {
  const category = `${datum.label}: ${datum.valueLabel}`;

  return datum.simLabel === undefined ? category : `${category} (${datum.simLabel})`;
}

/**
 * The characters actually drawn for a category label: the label itself while it fits the budget, and
 * otherwise as much of it as fits with {@link LABEL_ELLIPSIS} in place of the rest.
 *
 * Characters are counted in code points rather than UTF-16 units, so a label holding a character
 * outside the basic plane is shortened at a character boundary and never split in two.
 */
function drawnLabel(label: string): string {
  const characters = Array.from(label);

  if (characters.length <= LABEL_CHARACTER_BUDGET) {
    return label;
  }

  return `${characters.slice(0, LABEL_CHARACTER_BUDGET - LABEL_ELLIPSIS.length).join('')}${LABEL_ELLIPSIS}`;
}

/**
 * The bar's length in user units: the value's share of the axis, held inside the track.
 *
 * A negative value draws nothing rather than to the start side of the baseline, a value beyond the
 * axis is held at the track's end so the surface never overflows its box, and a non-finite value or a
 * `divisor` of zero draws nothing at all — the axis is the caller's, and inventing one here would
 * make two readings of the same figure disagree.
 */
function barWidth(value: number, divisor: number): number {
  if (divisor <= 0 || !Number.isFinite(value)) {
    return 0;
  }

  const share = Math.min(Math.max(value, 0), divisor) / divisor;

  return share * TRACK_WIDTH;
}

/**
 * Concatenates the class names that are present, so an omitted tone or state leaves no empty entry
 * and no doubled space behind in the attribute.
 */
function joinClassNames(...values: readonly (string | undefined)[]): string {
  return values.filter((value) => value !== undefined && value !== '').join(' ');
}
