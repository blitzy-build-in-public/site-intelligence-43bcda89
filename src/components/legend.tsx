/**
 * The series legend of a chart, a map or the competitive atlas: one row per series, each row a colour
 * swatch beside the words that say what the colour stands for.
 *
 * Provenance is structural here rather than conventional (rule P-5). `LegendEntry` is a discriminated
 * union, and its `competitor` branch declares `simLabel` as the market-intelligence member of
 * `SimLabel` with no optional form, so a competitor series cannot be described to this component
 * without the exact specification §5.3 label its figures require: such an entry does not type-check,
 * and no runtime branch has to remember to add the label. The `client-series` branch carries that
 * companion tag as an optional member instead, because the label a client series states is its own
 * record's: a caller that holds one passes it, and one that states none is described with
 * `CLIENT_SELF_ASSESSMENT_LABEL` — a longer, series-specific string that sits alongside the seven
 * labels rather than inside them (AAP §0.10). Widening `SimLabel` to hold it, or stacking one of the
 * seven labels onto that entry as well, would blur the boundary the two branches draw.
 *
 * Two companion strings are imported and never spelled in this module (rule P-1): the competitor name
 * tag from `COMPETITOR_NAME_TAG` and the client series tag from `CLIENT_SELF_ASSESSMENT_LABEL`, both
 * declared in `src/types/primitives.ts`. That module owns their wording — including the competitor
 * tag, whose exact words rule P-5 fixes — so a reworded tag moves there and this component follows.
 * The pack banner `ATLAS_PACK_BANNER` is deliberately not rendered here: the competitive atlas screen
 * owns it, and a legend that repeated it would put the same sentence on screen twice.
 *
 * Colours are role tokens only, and every entry kind resolves through the one chart tone table
 * `./horizontal-bar-chart.tsx` exports rather than through a map of this component's own:
 * `--color-status-*` for a status series, `--color-competitor-1/2/3` for the three competitors in the
 * order specification §4.2 assigns them, and the accent role for the client's own series, which §4.1
 * gives to first-party flows. That is what keeps a category the same colour in every chart that draws
 * it — a radar series, an atlas mark and a legend row resolve the same entry — so a chart may not pick
 * a hue of its own, and this component may not either.
 *
 * The list carries no focus stop and no interactive element: a legend describes what a chart is
 * already showing and operates nothing. Each swatch is `aria-hidden`, so the meaning reaches a screen
 * reader through the label text beside it and never through colour alone (rule B-3), and the text
 * takes the primary or caption role, so its contrast is the ratio specification §4 measured for that
 * role. Nothing here counts, totals, formats or summarises anything (rule P-6): a legend that
 * aggregated a first-party series with a market-intelligence one would blend provenance into one
 * number, which rule P-5 forbids.
 */
import type { ReactNode } from 'react';

import { CLIENT_SELF_ASSESSMENT_LABEL, COMPETITOR_NAME_TAG } from '../types';
import type { ClientSeriesLabel, SimLabel } from '../types';
import { CHART_TONE_CLASSES } from './horizontal-bar-chart';

import type { StatusMeaning } from './status-indicator';

/* ---------------------------------------------------------------------------------------------
 * The entry vocabulary
 * ------------------------------------------------------------------------------------------- */

/**
 * A status or pin-state series: the colour a status role gives it, and the wording the caller prints
 * for it.
 *
 * `meaning` is the shared vocabulary of `src/components/status-indicator.tsx` rather than a union of
 * its own, so a legend row, a table cell and a canvas badge cannot disagree about what a state looks
 * like. The label is the caller's — the series' name, or the exact §5.3 simulation string where the
 * series is a simulated one (rule P-1).
 */
export interface StatusLegendEntry {
  /**
   * A status series: the swatch takes the status role `meaning` names, and the row prints only the
   * caller's label.
   */
  readonly kind: 'status';
  /** The entry's identifier, unique within one legend, so React can key the row. */
  readonly id: string;
  /** The series' name, printed as visible text beside the swatch. */
  readonly label: string;
  /** The status meaning whose role colour the swatch takes. */
  readonly meaning: StatusMeaning;
}

/**
 * A competitor's series: market intelligence, and therefore inseparable from the label that says so.
 *
 * `simLabel` is not optional and is not a plain `string`. Its type is the market-intelligence member
 * of `SimLabel`, extracted from the seven fixed §5.3 strings, so the only way to satisfy it is to pass
 * that exact label; an entry constructed without it fails to compile, which is rule P-5 enforced by the
 * type rather than by a reviewer. The label the component prints for the competitor name is the
 * caller's, and `COMPETITOR_NAME_TAG` is added to it here so every competitor name shown through this
 * component carries the tag.
 */
export interface CompetitorLegendEntry {
  /**
   * A competitor series: the swatch takes the role `index` selects, and the row prints the caller's
   * label, then `COMPETITOR_NAME_TAG` and the mandatory `simLabel`.
   */
  readonly kind: 'competitor';
  /** The entry's identifier, unique within one legend, so React can key the row. */
  readonly id: string;
  /** The competitor's name as the market-intelligence record states it. */
  readonly label: string;
  /** Which competitor series this is, selecting `--color-competitor-1/2/3` in §4.2's order. */
  readonly index: 1 | 2 | 3;
  /** The market-intelligence label, fixed character for character by specification §5.3. */
  readonly simLabel: Extract<SimLabel, 'Simulated market intelligence'>;
}

/**
 * The client's own series on the atlas radar: a first-party self-assessment, not a competitor estimate.
 *
 * Its companion tag is the label the caller's own record carries, which it may state through
 * `simLabel`. The member's type is the one a series record states — the seven §5.3 labels plus the
 * client's companion label — so a caller passes `AtlasSeries.simLabel` unchanged and this component
 * neither widens the fixed vocabulary nor asks for a cast. A caller that states none is described with
 * `CLIENT_SELF_ASSESSMENT_LABEL`, the constant in `src/types` this component prints in its place, so no
 * client row is left without a tag. The swatch takes the accent role, which specification §4.1 assigns
 * to first-party flows.
 */
export interface ClientSeriesLegendEntry {
  /**
   * The client's own series: the swatch takes the accent role, and the row prints the caller's
   * label followed by the companion label its record states, or `CLIENT_SELF_ASSESSMENT_LABEL`.
   */
  readonly kind: 'client-series';
  /** The entry's identifier, unique within one legend, so React can key the row. */
  readonly id: string;
  /** The series' name, printed as visible text beside the swatch. */
  readonly label: string;
  /**
   * The companion label the series' own record states, where the caller holds one.
   *
   * It carries the record's label rather than a label chosen here, so a legend row cannot disagree
   * with the series it describes (rule P-1). Absent, {@link entryText} prints
   * `CLIENT_SELF_ASSESSMENT_LABEL`, the companion string the client's series has always carried.
   */
  readonly simLabel?: SimLabel | ClientSeriesLabel;
}

/**
 * One row of a legend: a status series, a competitor's series, or the client's own series.
 *
 * The three branches are told apart by `kind`, and the component handles each exhaustively, so a
 * fourth kind added to this union fails to compile until the legend has been taught what its swatch
 * and its mandatory labels are.
 */
export type LegendEntry = StatusLegendEntry | CompetitorLegendEntry | ClientSeriesLegendEntry;

/* ---------------------------------------------------------------------------------------------
 * Layout
 * ------------------------------------------------------------------------------------------- */

/**
 * How the rows are arranged: one wrapping row, because a legend sits beside or beneath the chart it
 * describes.
 *
 * `flex-wrap` is part of the arrangement rather than the caller's problem, so a long set of series
 * wraps instead of overflowing its container at a narrow width.
 */
const LIST_CLASSES = 'flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1';

/** One row: the swatch, then the label and any companion tag, wrapping as one item. */
const ITEM_CLASSES = 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1';

/**
 * The swatch itself: a 12 px mark on the 4 px grid with the 2 px control radius, sized in `rem`
 * through Tailwind's spacing scale so it keeps its proportion to the text it sits beside.
 *
 * It is decorative: `aria-hidden` is set on it at the call site, because the row's label text is what
 * carries the meaning and a swatch announced on its own would repeat nothing useful.
 */
const SWATCH_CLASSES = 'inline-block size-3 shrink-0 rounded-control';

/** The series name: the primary text role, so its contrast is the ratio §4 measured for that role. */
const LABEL_CLASSES = 'min-w-0 break-words text-13 text-text-primary';

/** A companion tag — the competitor name tag or the client series tag — in the caption role. */
const COMPANION_TAG_CLASSES = 'min-w-0 break-words text-12 text-text-caption';

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * What the calling chart or screen hands {@link Legend}: one entry per series it drew, in the
 * order it drew them. The entry type carries the constraint — a `competitor` entry declares the
 * exact §5.3 market-intelligence label as a required member, so a competitor series cannot be
 * described to this component without one (AAP §0.10).
 */
export interface LegendProps {
  /**
   * The series to describe, in the order they should be read. Required: an empty legend says nothing,
   * and this component renders nothing for one.
   */
  readonly entries: readonly LegendEntry[];
  /** Layout-only additions from the calling screen. Never a colour and never a surface. */
  readonly className?: string | undefined;
}

/**
 * Renders one legend as a list of swatch-and-label rows.
 *
 * The list is a `<ul>` because the entries are an unordered set of peers, and it is given
 * `role="list"` explicitly: Tailwind's preflight removes list markers, and the engines that drop list
 * semantics from a marker-less list would otherwise announce the rows as plain runs of text instead of
 * as a set of items (rule B-3).
 *
 * An empty `entries` array renders nothing at all rather than an empty list, so a chart with no series
 * contributes no stray landmark and no empty list to the accessibility tree. Each entry's `id` keys its
 * row, so a caller must keep those identifiers unique within one legend.
 */
export function Legend({ entries, className }: LegendProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <ul role="list" className={joinClassNames(LIST_CLASSES, className)}>
      {entries.map((entry) => (
        <li key={entry.id} className={ITEM_CLASSES}>
          <span
            aria-hidden="true"
            className={joinClassNames(SWATCH_CLASSES, swatchClassFor(entry))}
          />
          {entryText(entry)}
        </li>
      ))}
    </ul>
  );
}

/**
 * The colour a row's swatch takes, chosen by entry kind and by nothing else.
 *
 * Each arm reads the swatch of the tone the entry names from the one chart tone table
 * `./horizontal-bar-chart.tsx` exports, so a legend row and the mark it describes resolve the same
 * role token instead of two copies of it. The `switch` is exhaustive over `LegendEntry` and has no
 * `default` arm, so a new kind fails to compile here until its colour has been decided.
 */
function swatchClassFor(entry: LegendEntry): string {
  switch (entry.kind) {
    case 'status':
      return CHART_TONE_CLASSES[entry.meaning].swatch;
    case 'competitor':
      return CHART_TONE_CLASSES[`competitor-${entry.index}`].swatch;
    case 'client-series':
      return CHART_TONE_CLASSES.accent.swatch;
  }
}

/**
 * The words a row carries: the series name, followed by the companion tags its kind requires.
 *
 * The competitor row prints `COMPETITOR_NAME_TAG` and then its mandatory `simLabel`; the client row
 * prints the companion label the caller's record states, or `CLIENT_SELF_ASSESSMENT_LABEL` when the
 * caller states none; both tags come from the constants in `src/types`, so this module holds no copy of
 * either string (rule P-1). A status row prints its label alone, because a status series' provenance is
 * the record's own and its label is the caller's wording.
 *
 * The `{' '}` between the spans is load-bearing. Adjacent elements contribute their text to the
 * accessibility tree with nothing between them, so without it a reader hears the name and both tags
 * fused into one run of letters; the space is a whitespace-only flex child, which flex layout does not
 * render, so the visible spacing stays the `gap-x-2` on the row and no double gap appears.
 *
 * Exhaustive over `LegendEntry` with no `default` arm, for the same reason as {@link swatchClassFor}:
 * a new kind must decide what it says before it compiles.
 */
function entryText(entry: LegendEntry): ReactNode {
  switch (entry.kind) {
    case 'status':
      return <span className={LABEL_CLASSES}>{entry.label}</span>;
    case 'competitor':
      return (
        <>
          <span className={LABEL_CLASSES}>{entry.label}</span>{' '}
          <span className={COMPANION_TAG_CLASSES}>{COMPETITOR_NAME_TAG}</span>{' '}
          <span className={COMPANION_TAG_CLASSES}>{entry.simLabel}</span>
        </>
      );
    case 'client-series':
      return (
        <>
          <span className={LABEL_CLASSES}>{entry.label}</span>{' '}
          <span className={COMPANION_TAG_CLASSES}>
            {entry.simLabel ?? CLIENT_SELF_ASSESSMENT_LABEL}
          </span>
        </>
      );
  }
}

/**
 * Concatenates the class names that are present, so an omitted `className` leaves no trailing space
 * and no empty entry behind.
 */
function joinClassNames(...values: readonly (string | undefined)[]): string {
  return values.filter((value) => value !== undefined && value !== '').join(' ');
}
