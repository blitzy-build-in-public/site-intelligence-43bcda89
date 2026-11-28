/**
 * The presentation formatter of the interface's own figures: one amount carrying its currency code,
 * two readings of a duration in hours, one grouped count, and one identifier, timestamp and hash style
 * in the tabular mono face.
 *
 * `platform-contracts.md` §1 fixes the conventions rendered here — a EUR amount carrying at most two
 * decimals with a thousands separator, an instant as ISO 8601 with an offset in Europe/Berlin, the
 * record identifier patterns, and the lowercase hex digest of the audit chain — and AAP §0.8 gives
 * the presentation half of those conventions exactly one owner. For money that owner is
 * `src/types/figure-text.ts`, which holds the rule and which this module imports and re-exports as
 * {@link formatMoney}: the comparison CSV states the same amount the comparison matrix shows, that
 * composer is a service module and may not import `src/components`, and a formatter each layer kept
 * for itself is the drift the move removes. The grouped, unitless number a lever echo is written in
 * has the same owner for the same reason, re-exported here as {@link formatQuantity}. The rules this
 * module still states itself — the two readings of a duration, and the mono face that aligns a value
 * down a column — are formatted here and nowhere else.
 *
 * ONE MONEY FIGURE REACHES A READER IN TWO SHAPES, AND TWO FORMER SHAPES WERE RETIRED. This passage
 * is the only record of that decision, and every other site in the tree points here instead of
 * restating it:
 *
 * 1. An amount in one of the interface's own figures — the money rule in `src/types/figure-text.ts`,
 *    re-exported below as {@link formatMoney}. It is written with `de-DE`, the currency as the code
 *    `EUR`, and a full stop between thousands, which is the grouping locale AAP §0.8 names for the one
 *    locale the inputs fix (Europe/Berlin).
 * 2. An amount inside a record's own sentence — grouped with a comma, and marked by the `EUR ` prefix
 *    the sentence itself carries. `src/services/mock/assistant-script.ts` composes such a sentence from
 *    a template the seed owns, and the template writes the marker as its own text; AAP §0.8 quotes the
 *    resulting shape verbatim — "Spends EUR 21,300 and defers 900 Brno service kits (EUR 108,000) by 10
 *    days to avoid EUR 2,257,000 of delayed revenue." The prose formatter groups the digits and neither
 *    adds nor moves the marker, because that marker is the record's content and rule P-6 admits no
 *    currency marker a service module writes of its own accord.
 *
 * TWO FORMER SHAPES WERE RETIRED, AND NEITHER IS A TYPO FOR ANOTHER. A dot decimal with no grouping
 * separator, written for a spreadsheet engine, was how `src/services/exports/scenario-csv.ts` stated
 * the comparison's own amounts; the checkpoint holds the export payload to the screen, so its money
 * cells now print {@link formatMoney} and that shape is gone — the matrix read `18.600 EUR` while the
 * file it exported read `18600.00` for the same record's Added cost. The ungrouped machine amount an
 * aggregate's evidence used to print, `3348000 EUR at risk` beside the tile's `3.348.000 EUR`, was the
 * same drift in the one surface every figure travels through: `src/services/mock/handlers/evidence.ts`
 * now states a drawer's amounts, its `*Eur` inputs and its lever echoes through the rules this module
 * re-exports, imported from `src/types` because a handler may not import `src/components` (AAP
 * §0.18.1's boundary discipline, rule P-2). `Evidence.value` and `Evidence.inputs` are strings the
 * record already carries (contracts §3, AAP §0.12.2), which is why that tier composes the text rather
 * than this one, and `src/services/mock/mock-backend.test.ts` compares the payload's text with
 * {@link formatMoney}'s output for the same figure, so a drawer and the tile it explains cannot
 * disagree.
 *
 * Another rendering is not a quiet decision. A surface that needs an amount written another way adds
 * no formatter of its own — it records the departure in this passage first, so a maintainer reads one
 * record instead of four modules re-litigating the same figure.
 *
 * WHAT A DURATION IS, AND WHERE ITS UNIT LIVES. A duration arrives as the exact difference the domain
 * measured, and this module renders it under the one of two rules the value's own meaning decides. An
 * age — a record's `ageHours`, the difference a reader scans down a queue's column — is the nearest
 * whole hour, because nobody can scan `145.08333333333334` off a card ({@link formatHours}). A measured
 * figure — the median hours to an approved plan, which AAP §0.8 fixes as the middle value of the
 * qualifying history records, unrounded — is {@link formatMeasuredHours}: as much of the value's own
 * precision as it states, up to two decimals, so the tile can never print `11` beside a drawer that
 * states `11.25`. Both are presentation alone: `src/domain/aggregation/overview.ts` keeps the median
 * unrounded as AAP §0.8 fixes it, and nothing here writes back to that value. Neither appends a unit —
 * the screen owns the caption that names it ("Age (hours)", "Median hours to approved plan"), so a
 * figure that spelled its own unit would state it twice.
 *
 * One duration is not rendered here at all, for the money passage's reasons: the median the fourth
 * Overview tile carries reaches its evidence drawer as the aggregate's own unrounded figure, with the
 * unit named in words in the reading ("26.666666666666668 hours from detection to an approved plan,
 * unrounded"), which `src/services/mock/handlers/evidence.ts` composes because the service tier may not
 * import this module and the drawer has to print the figure the tile was computed from. The reading says
 * "unrounded" in its own words, so the exact value is never passed off as the narrower width the tile
 * shows.
 *
 * Formatting never changes a value (AAP §0.8, rule P-6). The money rule groups and labels what it is
 * handed and never re-rounds, re-scales or appends a unit of its own; each duration and quantity rule's
 * fraction ceiling is a width on the text rather than an arithmetic step on the value, and none calls a
 * rounding helper — AAP §0.8 keeps every one of those in `src/domain/solver/rounding.ts`. The other
 * rules render their string character for character. The mono face and the tabular numerals are AAP
 * §0.5.3's requirement, so amounts, identifiers, timestamps and hashes align down a column and read as
 * one class of value inside a sentence; a duration is not one of them and keeps the type step of the
 * tile it sits in.
 *
 * A value with no formatted form is shown as the raw input rather than as a formatted `NaN` or a
 * silent zero (rule P-6): a wrong number on screen is the failure that rule exists to prevent, and a
 * visible stranger can be traced back to its source where a plausible zero cannot.
 */
import type { ReactElement } from 'react';

import { formatMoney, formatQuantity } from '../types';

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
 * rendered as text through {@link formatHours} in the tile's own type step, and `measured-hours`
 * through {@link formatMeasuredHours}, which keeps the decimals of an aggregate the domain fixes as
 * unrounded (AAP §0.8). The set is stated once here rather than as a second list on `MetricTile`, so a
 * new presentation rule is defined in the module that owns formatting and every call site that could
 * name it sees it at once. {@link formatQuantity} — the grouped-number rule a quantity is written with —
 * is re-exported from `src/types` rather than stated here, because the comparison column that echoes a
 * lever is composed in the service tier too; it is named by the surface that prints the value rather
 * than by a tile, so it is no `FigureFormat` member.
 */
export type FigureFormat = MonoValueKind | 'hours' | 'measured-hours';

/**
 * What every surface that prints one of the interface's own figures hands {@link MonoValue}: the
 * value exactly as the service produced it, and the one convention that applies to it stated
 * rather than inferred. The pair is the contract — a kind that does not match the value formats it
 * by the wrong rule, and a value with no formatted form is shown raw rather than as a plausible
 * zero (AAP §0.8, contracts §1).
 */
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
 * The interface's one money formatter, re-exported from the module that states it.
 *
 * `src/types/figure-text.ts` holds the rule — the `de-DE` locale, the currency as the code `EUR`, the
 * fraction range of zero to two digits, and the raw input for a value that has no formatted form —
 * because the comparison CSV states the same amount the comparison matrix shows and its composer is a
 * service module that may not import `src/components` (AAP §0.18.1). It is re-exported here so that
 * every surface and suite that already reaches this module for an amount keeps reading the exact text
 * from the module it imports, and so that no second copy of the rule can be written beside it.
 */
export { formatMoney, formatQuantity };

/**
 * The interface's age rule: the nearest whole hour, created once at module load beside the money rule,
 * because compiling a locale's number pattern is the expensive part of formatting.
 *
 * The options are the nearest whole hour: the `de-DE` locale of the money rule, so both rules group
 * and read alike, and a fraction range of zero digits, so a duration such as `145.08333333333334`
 * reads as `145`. That width is the whole of this rule's arithmetic — it calls no `toFixed`, no
 * `Math.round` and no helper from `src/domain/solver/rounding.ts`, because AAP §0.8 keeps every
 * rounding helper there and gives this module presentation alone. What it formats is not changed
 * either: a record's age stays the number the service computed, so a screen that reads the member
 * again reads the same one.
 *
 * The unit is not part of the text: the caption that names it ("Age (hours)", "Median hours to
 * approved plan") belongs to the screen, so appending it here would state it twice.
 */
const HOURS_FORMAT = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Formats one age in hours, or hands back the input's own text when it has no formatted form.
 *
 * The contract is {@link formatMoney}'s, which is rule P-6's subject in both cases: only a finite
 * number is formatted, a string is returned untouched rather than parsed, and a value with no
 * formatted form keeps the raw input on screen as the marker of the defect — never a formatted `NaN`
 * and never a substituted zero. Every surface that renders an age itself calls this function, so the
 * exception queue's age column and the canvas's urgency card read one record's hours the same way; the
 * one duration a service composes — an aggregate's unrounded median, stated in the words of its
 * evidence reading — never passes through it, as the module header records.
 *
 * @param value - The age in hours, exactly as the record states it.
 * @returns The nearest whole hour, or the input as text.
 */
export function formatHours(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return HOURS_FORMAT.format(value);
  }

  return String(value);
}

/**
 * Formats one measured duration — an aggregate's hours the domain keeps unrounded — or hands back the
 * input's own text when it has no formatted form.
 *
 * AAP §0.8 fixes the Overview's median hours to an approved plan as the middle value of the qualifying
 * history records, unrounded, so a tile printing the nearest whole hour would state a figure of its
 * own beside the drawer that states the computed one. This rule keeps as much of the value as it states
 * up to two decimals, so `11.25` reads `11,25` while a whole `18` stays `18`. The width is the whole
 * of its arithmetic — it calls no `toFixed`, no `Math.round` and no helper from
 * `src/domain/solver/rounding.ts`, because AAP §0.8 keeps every rounding helper there — and the value
 * it formats is not changed: the member the aggregate returned is the same number read again.
 *
 * It renders through {@link formatQuantity}, the grouped-number rule `src/types/figure-text.ts` states,
 * so one configuration writes every grouped number the interface prints and this function states only
 * which reading of a duration it is for. The contract is {@link formatHours}'s otherwise: a string
 * passes through untouched, and a value with no formatted form keeps the raw input on screen (rule P-6).
 *
 * @param value - The duration in hours, exactly as the aggregate states it.
 * @returns The hours to at most two decimals, or the input as text.
 */
export function formatMeasuredHours(value: number | string): string {
  return formatQuantity(value);
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
