/**
 * One computed figure, carrying its own caption, its exact §5.3 label and the reference that opens
 * its evidence.
 *
 * WHAT IT IS FOR. Specification §7 gives the overview four tiles (open exceptions, revenue at risk,
 * customer orders at risk, median hours to approved plan) and SCR-12 a ribbon of six, and AAP §0.5.2
 * row 10 makes both the same component: compact enough for a ribbon, legible enough for a page tile,
 * and with no chart, sparkline or trend arrow — none of the three is named by the plan, so none is
 * drawn here. Every other figure a screen shows is a value inside a table cell, a chart or a
 * sentence, which the surrounding component labels and wraps itself.
 *
 * WHY TWO OF ITS PROPS ARE REQUIRED RATHER THAN OPTIONAL. The rule set makes both duties structural,
 * so neither may be forgotten at a call site:
 *
 * - `evidenceRef` — rule P-6 and principle PR-6 (AAP §0.2.1, F12) make every figure answerable: its
 *   source, record, instant, freshness and formula stay one activation away. A tile without a
 *   reference has no evidence to open, so the prop is required and the wrapped value cannot render
 *   without it; a caller that has no reference has no figure to show as a tile.
 * - `simLabel` — rule P-1 and AAP §0.10 require the label on the element itself: the demonstration's
 *   persistent badge labels the demonstration, and "the badge alone does not label an individual
 *   figure". The label is therefore a required `SimLabel`, so a tile cannot be placed on screen
 *   without stating which of the seven fixed §5.3 strings its figure carries, and this module never
 *   chooses between them — which label applies is the screen's decision, never a default here.
 *
 * Both are compile-time requirements rather than runtime checks: omitting either from a `<MetricTile>`
 * fails `tsc`, and no `undefined` label or empty reference can reach the accessibility tree.
 *
 * WHAT IT DOES NOT DO. It computes nothing, rounds nothing, scales nothing and appends no unit (rule
 * P-6): `value` arrives exactly as the solver or the aggregation produced it, and the only formatting
 * in this tree is `./mono-value.tsx`, reached through `kind` — which names the two duration rules
 * beside the four mono-face ones, each for the value its own meaning calls for. An age reaches the
 * reader as the nearest whole hour, because nobody scans a fraction off a queue column; a measured
 * aggregate keeps the domain's precision up to two decimals, because AAP §0.8 fixes the median hours
 * to an approved plan as unrounded and a tile may not print `11` beside the drawer that states
 * `11.25`. The number the aggregate computed stays exactly what it was under either rule. It
 * re-implements none of the primitives it composes — `./card.tsx` owns the surface and the heading,
 * `./evidence-drawer.tsx` owns the trigger and the dialog, `./status-indicator.tsx` owns the
 * icon-plus-label status — so a change to one of them reaches every tile at once instead of drifting
 * between copies.
 *
 * ACCESSIBILITY — rule B-3. The figure is the content of the evidence trigger, so its visible text
 * starts the control's accessible name (WCAG 2.2 SC 2.5.3) and the trigger is the only focus stop
 * this component adds: the tile itself is not interactive and takes no `tabIndex`. Colour never
 * carries the label on its own, because the §5.3 string is painted as text beside the status icon,
 * and every colour here is a role token of the theme files, so Command and Paper each supply their
 * own measured pairing; the token layer clears Tailwind's shadow namespace and this file adds no
 * elevation of its own (specification §4.3).
 *
 * Nothing here fetches an asset, reads a configuration value or holds a credential (rules B-1 and
 * B-2), nothing states a property the demonstration does not implement (rule P-4), and nothing mixes
 * a first-party figure with a market-intelligence one (rule P-5) — the label it renders is the one
 * the calling screen supplied for that figure.
 */
import type { ReactElement, ReactNode } from 'react';

import type { SimLabel } from '../types';
import { Card } from './card';
import { EvidenceRef } from './evidence-drawer';
import { MonoValue, formatHours, formatMeasuredHours } from './mono-value';
import type { FigureFormat } from './mono-value';
import { StatusIndicator } from './status-indicator';

/**
 * What the calling screen hands {@link MetricTile}: the caption and the exact §5.3 label it chose
 * for this figure, the figure exactly as the service computed it, and the reference that opens its
 * evidence. The label and the reference are required rather than optional, so a tile cannot reach
 * a screen without a record behind it or without stating which fixed string it carries — this
 * component chooses neither (AAP §0.10).
 */
export interface MetricTileProps {
  /**
   * The tile's caption, rendered as the card's heading.
   *
   * Required, and supplied by the calling screen from its own fixed screen definition: the four
   * overview tiles and the six ribbon tiles are named by specification §7, and this component is not
   * a second owner of that wording.
   */
  readonly label: string;

  /**
   * The figure exactly as the service computed it.
   *
   * A number or a string, rendered as it arrives: this component does not round it, scale it, add a
   * unit to it or recompute it (rule P-6). Formatting, where the figure is a duration, an amount, an
   * identifier, a timestamp or a hash, is the job of `./mono-value.tsx` and is selected by
   * {@link kind}.
   */
  readonly value: string | number;

  /**
   * The reference the figure carries, in the service's own form, passed through to `EvidenceRef`.
   *
   * Required: a tile whose figure cannot open its evidence is the defect rule P-6 and principle PR-6
   * exist to prevent, so there is no variant of this component without one.
   */
  readonly evidenceRef: string;

  /**
   * The exact specification §5.3 label this figure carries, typed as `SimLabel`.
   *
   * Required and never defaulted (rule P-1): the screen decides which fixed string applies — a
   * computed figure and a scenario's seeded measure do not carry the same one — and this module
   * renders whatever arrives character for character, never re-cased and never shortened.
   */
  readonly simLabel: SimLabel;

  /**
   * Which presentation rule `./mono-value.tsx` applies to the value.
   *
   * Omitted for a plain count, which is rendered as the value itself in the tile's own type step;
   * `hours` for an age, which is formatted to the nearest whole hour because nobody scans a fraction
   * off a card; `measured-hours` for a value the domain keeps unrounded (AAP §0.8), which keeps that
   * value's own precision up to two decimals — both printed in that same type step, because AAP
   * §0.5.3 fixes the mono face for four other kinds only; and one of the four mono-face kinds for an
   * amount, identifier, timestamp or hash, so the mono face and the tabular numerals that section
   * requires reach the figure.
   */
  readonly kind?: FigureFormat;

  /**
   * Which step of the closed specification §4.3 type scale the figure takes: the page tile's 28 px, or
   * the ribbon tile's 16 px.
   *
   * Defaults to `'page'`, the step every tile has taken until now, so a caller that names nothing —
   * the overview's four tiles — renders exactly as it did. `'ribbon'` answers a measured width rather
   * than a preference: at the 1280 px breakpoint each tile of the canvas ribbon's six-across grid is
   * 198 px wide with a 164 px content box, an amount such as `3.916.800 EUR` measures 221 px at the
   * 28 px step before the 16 px evidence mark is added, and `./mono-value.tsx`'s money formatter puts
   * a no-break space before the currency code, so the figure has no soft wrap point and paints past
   * the tile's own boundary into its neighbour. At the 16 px step the same amount and mark measure
   * 142 px and fit the box, and 16 px is the largest step §4.3 exposes that does: the scale holds 12,
   * 13, 14, 16, 20 and 28 px only, so the steps below it would shrink the loudest figure on the tile
   * without a width the layout needs. The figure is never truncated, clipped, ellipsised or rescaled
   * to fit either step (rule P-6).
   */
  readonly valueStep?: 'page' | 'ribbon';

  /**
   * A short qualifier under the figure, such as the window a count covers, when the screen defines
   * one.
   *
   * Omitted, nothing is rendered in its place: an empty caption line would be a row of the caption
   * role with no content in it.
   */
  readonly hint?: string;
}

/**
 * The figure's own row in a page tile: the 28 px type step of specification §4.3 in the primary text
 * role, so the value is the loudest thing on the tile in both themes.
 *
 * The step sits on the wrapper rather than on the trigger, because the trigger keeps the type of the
 * figure it wraps (`./evidence-drawer.tsx` adds no font size to its content) and `MonoValue` sets no
 * colour of its own. `break-words` lets a sixty-four character digest wrap inside the column instead
 * of overflowing it: the whole digest is the value, so it is never truncated.
 */
const VALUE_CLASSES = 'min-w-0 break-words text-28 text-text-primary';

/**
 * The same row in a ribbon tile: the 16 px step of the same closed scale, in the same primary role.
 *
 * Only the step differs from {@link VALUE_CLASSES}, and only because a ribbon tile cannot carry the
 * 28 px one — the width this step answers is measured in {@link MetricTileProps.valueStep}'s
 * documentation. `min-w-0` still lets the cell decide the width and `break-words` still lets a long
 * value wrap inside the card rather than escape it.
 */
const RIBBON_VALUE_CLASSES = 'min-w-0 break-words text-16 text-text-primary';

/**
 * The caption slot a ribbon tile reserves: two lines of the heading's own 16 px step, written as the
 * 12-step of the 4 px spacing grid (AAP §0.5.3).
 *
 * A caption is the calling screen's wording, so its length is the screen's decision, and one of the
 * six ribbon captions wraps to a second line in a 198 px tile. Reserving that second line on every
 * tile keeps the six figures on one baseline instead of letting the wrapped caption push its figure a
 * line lower than the rest. A page tile reserves nothing, so its heading is as tall as its own text.
 */
const RIBBON_TITLE_CLASSES = 'block min-h-12';

/**
 * The qualifier: the 13 px step in the caption role, the one role the theme files assign to a
 * measured secondary reading on both grounds.
 */
const HINT_CLASSES = 'min-w-0 break-words text-13 text-text-caption';

/**
 * The label row's type step. `StatusIndicator` paints its label with the text colour only, so a size
 * set on it reaches the label by inheritance and the label stays the same size in every tile.
 */
const LABEL_CLASSES = 'text-13';

/**
 * The group holding the figure, its qualifier and its label.
 *
 * `Card` sets one gap for the space between its title block and its children; inside the group the
 * three lines sit one 4 px step apart, which keeps a ribbon tile compact while a page tile still
 * reads as one figure with its caption beneath it.
 */
const GROUP_CLASSES = 'flex min-w-0 flex-col gap-1';

/**
 * The figure as a reader sees it, under the rule the caller named.
 *
 * A duration is formatted and printed as text in the tile's own type step, because AAP §0.5.3 fixes
 * the mono face for money, identifiers, timestamps and hashes only: an age is the nearest whole hour,
 * and a measured value keeps the precision the domain fixes for it, up to two decimals (AAP §0.8).
 * An amount, identifier, timestamp or hash goes through `MonoValue`, which adds that face and the
 * tabular numerals. A figure with no rule named is the plain count, printed exactly as the aggregate
 * returned it (rule P-6).
 *
 * @param value - The figure exactly as the service computed it.
 * @param kind - The presentation rule the calling screen named, if it named one.
 * @returns The text or the element the evidence trigger wraps.
 */
function figureOf(value: string | number, kind: FigureFormat | undefined): ReactNode {
  if (kind === 'hours') {
    return formatHours(value);
  }

  if (kind === 'measured-hours') {
    return formatMeasuredHours(value);
  }

  if (kind === undefined) {
    return value;
  }

  return <MonoValue value={value} kind={kind} />;
}

/**
 * Renders one computed figure as a titled tile with the reference that opens its evidence.
 *
 * The card's heading is the caller's caption, the figure is wrapped in the evidence trigger that is
 * the tile's only focus stop, and the caller's `SimLabel` is painted as visible text beside the
 * status icon, so the tile labels its own figure rather than relying on a badge elsewhere on the
 * page (rule P-1, AAP §0.10). A figure with no qualifier renders two lines rather than three.
 *
 * {@link MetricTileProps.valueStep} chooses the figure's type step, and in `'ribbon'` mode it also
 * wraps the caption in the element that reserves the second heading line so the row's figures share a
 * baseline. A page tile's caption reaches the heading as the plain string it was given, and the
 * heading's text is the caller's caption either way, so the tile's accessible name does not change
 * with the step (rule B-3).
 */
export function MetricTile({
  label,
  value,
  evidenceRef,
  simLabel,
  kind,
  valueStep = 'page',
  hint,
}: MetricTileProps): ReactElement {
  const ribbon = valueStep === 'ribbon';

  return (
    <Card title={ribbon ? <span className={RIBBON_TITLE_CLASSES}>{label}</span> : label}>
      <div className={GROUP_CLASSES}>
        <span className={ribbon ? RIBBON_VALUE_CLASSES : VALUE_CLASSES}>
          <EvidenceRef ref={evidenceRef}>{figureOf(value, kind)}</EvidenceRef>
        </span>
        {hint === undefined ? null : <span className={HINT_CLASSES}>{hint}</span>}
        <StatusIndicator meaning="simulated" label={simLabel} className={LABEL_CLASSES} />
      </div>
    </Card>
  );
}
