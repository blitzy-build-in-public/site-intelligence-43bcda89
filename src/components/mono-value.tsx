/**
 * The presentation formatter of the interface's own figures: one amount carrying its currency code,
 * one duration in hours, and one identifier, timestamp and hash style in the tabular mono face.
 *
 * `platform-contracts.md` §1 fixes the conventions rendered here — a EUR amount carrying at most two
 * decimals with a thousands separator, an instant as ISO 8601 with an offset in Europe/Berlin, the
 * record identifier patterns, and the lowercase hex digest of the audit chain — and AAP §0.8 gives
 * the presentation half of those conventions exactly one owner: this module. Nothing else formats
 * the interface's own figures, because a second presentation formatter would let two screens show one
 * record at two different values.
 *
 * ONE MONEY FIGURE REACHES A READER IN FOUR SHAPES, AND ALL FOUR ARE DELIBERATE. This passage is the
 * only record of that decision, and every other site in the tree points here instead of restating it:
 *
 * 1. An amount in one of the interface's own figures — `MONEY_FORMAT` below. It is written with
 *    `de-DE`, the currency as the code `EUR`, and a full stop between thousands, which is the grouping
 *    locale AAP §0.8 names for the one locale the inputs fix (Europe/Berlin).
 * 2. An amount inside a record's own sentence — grouped with a comma, and marked by the `EUR ` prefix
 *    the sentence itself carries. `src/services/mock/assistant-script.ts` composes such a sentence from
 *    a template the seed owns, and the template writes the marker as its own text; AAP §0.8 quotes the
 *    resulting shape verbatim — "Spends EUR 21,300 and defers 900 Brno service kits (EUR 108,000) by 10
 *    days to avoid EUR 2,257,000 of delayed revenue." The prose formatter groups the digits and neither
 *    adds nor moves the marker, because that marker is the record's content and rule P-6 admits no
 *    currency marker a service module writes of its own accord.
 * 3. A CSV field — `src/services/mock/exports/scenario-csv.ts`. That file is a spreadsheet interchange
 *    format and never reaches a screen, so it is written for a reader's engine rather than a reader's
 *    eye: a dot decimal, no grouping separator and exactly two decimals.
 * 4. An amount inside an aggregate's evidence — `src/services/mock/handlers/evidence.ts`. The drawer a
 *    computed figure opens states that figure as the aggregate's own number, ungrouped, with the
 *    currency code beside it rather than the grouped form above: the Overview's revenue tile prints
 *    `3.348.000 EUR` here and its drawer reads `3348000 EUR at risk`, and a by-plant bar's drawer reads
 *    the same number the same way, with the plant named after it. It is composed there rather than
 *    formatted here because the service tier may not import `src/components` — AAP §0.18.1's boundary
 *    discipline keeps every figure on the port with nothing of this layer behind it, and rule P-2 keeps
 *    the reading inside the typed service interface — and because the number has to stay the aggregate's
 *    own exact figure, so that a drawer and the tile it explains cannot disagree. No formatter is added
 *    at that site: the handler concatenates the member the aggregate returned and the words the reading
 *    already holds.
 *
 * A fifth rendering is not a fifth decision. A surface that needs an amount written another way adds
 * no formatter of its own — it records the departure in this passage first, so a maintainer reads one
 * record instead of four modules re-litigating the same figure.
 *
 * WHAT A DURATION IS, AND WHERE ITS UNIT LIVES. A duration arrives as the exact difference the domain
 * measured, and this module renders it as the nearest whole hour, because nobody can scan
 * `145.08333333333334` off a card. It is presentation alone: `src/domain/aggregation/overview.ts` keeps
 * the median of the fourth Overview tile unrounded as AAP §0.8 fixes it, and nothing here writes back to
 * that value. The unit is not appended here either — the screen owns the caption that names it
 * ("Age (hours)", "Median hours to approved plan"), so a figure that spelled its own unit would state it
 * twice.
 *
 * One duration is not rendered here at all, for rendering 4's reasons: the median the fourth Overview
 * tile carries reaches its evidence drawer as the aggregate's own unrounded figure, with the unit named
 * in words in the reading ("26.666666666666668 hours from detection to an approved plan, unrounded"),
 * which `src/services/mock/handlers/evidence.ts` composes because the service tier may not import this
 * module and the drawer has to print the figure the tile was computed from. The reading says "unrounded"
 * in its own words, so the exact value is never passed off as the whole-hour width the tile shows.
 *
 * Formatting never changes a value (AAP §0.8, rule P-6). The money rule groups and labels what it is
 * handed and never re-rounds, re-scales or appends a unit of its own; the duration rule's fraction
 * ceiling is a width on the text rather than an arithmetic step on the value, and it calls no rounding
 * helper — AAP §0.8 keeps every one of those in `src/domain/solver/rounding.ts`. The other three rules
 * render their string character for character. The mono face and the tabular numerals are AAP §0.5.3's
 * requirement, so amounts, identifiers, timestamps and hashes align down a column and read as one
 * class of value inside a sentence; a duration is not one of them and keeps the type step of the tile
 * it sits in.
 *
 * A value with no formatted form is shown as the raw input rather than as a formatted `NaN` or a
 * silent zero (rule P-6): a wrong number on screen is the failure that rule exists to prevent, and a
 * visible stranger can be traced back to its source where a plausible zero cannot.
 */
import type { ReactElement } from 'react';

/**
 * The four kinds of value this component renders in the mono face, and the whole of its formatting
 * state space.
 *
 * One kind is one rule: `money` groups and labels a EUR amount, and `id`, `timestamp` and `hash`
 * pass their string through unchanged. The caller states which kind a value is, so the component
 * never guesses from the value's shape — a nine-digit purchase order number and a nine-figure
 * amount would otherwise be indistinguishable.
 *
 * A duration is deliberately not one of the four. AAP §0.5.3 fixes the mono face and its tabular
 * numerals for money, identifiers, timestamps and hashes only, so an hours reading keeps the type
 * step of the tile it sits in; {@link FigureFormat} carries it for the tiles, and this component
 * keeps accepting the four it can render.
 */
export type MonoValueKind = 'money' | 'id' | 'timestamp' | 'hash';

/**
 * Every presentation rule this module owns, and the vocabulary a figure on a tile may name.
 *
 * The four {@link MonoValueKind} members are rendered by `MonoValue` in the mono face; `hours` is
 * rendered as text through {@link formatHours} in the tile's own type step. The set is stated once
 * here rather than as a second list on `MetricTile`, so a new presentation rule is defined in the
 * module that owns formatting and every call site that could name it sees it at once.
 */
export type FigureFormat = MonoValueKind | 'hours';

/** Props of {@link MonoValue}. */
export interface MonoValueProps {
  /**
   * The value exactly as the service produced it: a `Money` number for `kind="money"`, and an
   * identifier, a `Timestamp` or a hash string for the other three kinds.
   */
  readonly value: number | string;
  /**
   * Which of the four formatting rules applies. Required, with no default: a default would format a
   * value by whichever rule happened to be first rather than by what the value is.
   */
  readonly kind: MonoValueKind;
  /**
   * Layout-only additions, such as a width, an alignment or a grid area — never a colour, an opacity
   * or a font size, each of which would change the contrast the theme tokens already measure
   * (rule B-3). This component sets no colour at all, so its text inherits the measured role of
   * whatever surface it is written on.
   */
  readonly className?: string;
}

/**
 * The class lists this component applies, held here so the wording has one owner: the component
 * composes them, and its suite names them through this constant rather than retyping the utilities.
 *
 * `base` carries the mono face and `tabular-nums`, which AAP §0.5.3 fixes for every amount,
 * identifier, timestamp and hash so digits share one width down a column. `hashWrap` lets a
 * sixty-four character digest break instead of overflowing its cell: the whole digest is the value,
 * so it is never truncated, and wrapping is what keeps it readable in the narrow columns it appears
 * in.
 */
export const MONO_VALUE_CLASSES = {
  base: 'font-mono tabular-nums',
  hashWrap: 'break-all',
} as const;

/**
 * The interface's one money formatter, created once at module load and reused for every amount it
 * renders, because compiling a locale's number pattern is the expensive part of formatting.
 *
 * The options are AAP §0.8's: the `de-DE` locale supplies the thousands separator and the decimal
 * comma that Europe/Berlin business figures are read with, `currencyDisplay: 'code'` prints the
 * currency as a code rather than as a symbol, and the fraction range of zero to two digits prints a
 * whole amount without decimals and at most the two decimals `Money` carries. An amount is not
 * re-rounded here — two decimals is the contract's own precision, not a presentation choice.
 *
 * ICU separates the amount from the code with a no-break space, which is the shape the plan writes
 * as an amount followed by the code, joined by a space that cannot break across a line. That
 * separator is deliberately not rewritten to a plain space: no input fixes another one, and a
 * post-processing step would put a second formatting rule inside the module that is meant to hold
 * exactly one.
 *
 * This is the first of the four renderings the module header records, and the only one this module
 * emits: an amount in one of the interface's own figures. A sentence a record owns quotes its amount
 * with the code first and a comma between thousands — rendering 2 there — and neither shape is a typo
 * in the other, so do not "fix" the separator in a seed record or here.
 */
const MONEY_FORMAT = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats one amount, or hands back the input's own text when it has no formatted form.
 *
 * Exported so the surfaces that cannot host this component's `<span>` print the same text: an SVG
 * `<text>` has no children of another namespace, so a chart's displayed value label is this string
 * rather than the component, and a screen that passed its own rendering would put two money formats
 * of one amount in one view. Formatting still has one owner — this function — and no caller applies a
 * second rule to what it returns.
 *
 * Only a finite number is formatted. A string is returned untouched rather than parsed, because
 * parsing would silently reinterpret a caller's mistake — one dotted digit group is twenty-one and
 * three tenths to a number parser and twenty-one thousand to the reader — and a number that is not
 * finite has no formatted form at all. Both cases leave the raw input on screen as the marker of the
 * defect, which is what rule P-6 asks for: never a formatted `NaN` and never a substituted zero.
 *
 * @param value - The amount exactly as the record states it.
 * @returns The amount with the currency code and at most two decimals, or the input as text.
 */
export function formatMoney(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return MONEY_FORMAT.format(value);
  }

  return String(value);
}

/**
 * The interface's one duration formatter, created once at module load beside the money rule, because
 * compiling a locale's number pattern is the expensive part of formatting.
 *
 * The options are the nearest whole hour: the `de-DE` locale of the money rule, so both rules group
 * and read alike, and a fraction range of zero digits, so a duration such as `145.08333333333334`
 * reads as `145`. That width is the whole of this rule's arithmetic — it calls no `toFixed`, no
 * `Math.round` and no helper from `src/domain/solver/rounding.ts`, because AAP §0.8 keeps every
 * rounding helper there and gives this module presentation alone. What it formats is not changed
 * either: the median the Overview tile shows stays the unrounded number the aggregate computed, so a
 * screen that reads the member again reads the same one.
 *
 * The unit is not part of the text: the caption that names it ("Age (hours)", "Median hours to
 * approved plan") belongs to the screen, so appending it here would state it twice.
 */
const HOURS_FORMAT = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Formats one duration in hours, or hands back the input's own text when it has no formatted form.
 *
 * The contract is {@link formatMoney}'s, which is rule P-6's subject in both cases: only a finite
 * number is formatted, a string is returned untouched rather than parsed, and a value with no
 * formatted form keeps the raw input on screen as the marker of the defect — never a formatted `NaN`
 * and never a substituted zero. Every surface that renders a duration itself calls this function, so
 * the exception queue's age column and the canvas's urgency card read one record's hours the same way;
 * the one duration a service composes — an aggregate's unrounded median, stated in the words of its
 * evidence reading — never passes through it, as the module header records.
 *
 * @param value - The duration in hours, exactly as the record or the aggregate states it.
 * @returns The nearest whole hour, or the input as text.
 */
export function formatHours(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return HOURS_FORMAT.format(value);
  }

  return String(value);
}

/**
 * Renders one value in the mono face with tabular numerals.
 *
 * The element is an inline `<span>` on purpose: an amount sits inside a table cell, a sentence and a
 * chart label, and anything block-level would break the line it is written into. The value is the
 * text of the span — no `aria-label` restates it, no `title` paraphrases it and no hidden decoration
 * sits beside it — so a screen reader reads the same characters a sighted reader sees. The component
 * is not interactive and adds no focus stop, while an interactive parent that wraps it keeps its own
 * accessible name and its own keyboard behaviour.
 */
export function MonoValue({ value, kind, className }: MonoValueProps): ReactElement {
  const text = kind === 'money' ? formatMoney(value) : String(value);

  const classes = [
    MONO_VALUE_CLASSES.base,
    kind === 'hash' ? MONO_VALUE_CLASSES.hashWrap : '',
    className ?? '',
  ]
    .filter((entry) => entry.length > 0)
    .join(' ');

  return <span className={classes}>{text}</span>;
}
