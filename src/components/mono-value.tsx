/**
 * The presentation formatter of the interface's own figures — an amount, two duration readings,
 * a grouped count, an identifier, a timestamp, a hash — in the tabular mono face.
 * `platform-contracts.md` §1 fixes what is rendered: a EUR amount, at most two decimals and a
 * thousands separator; an ISO 8601 instant with a Europe/Berlin offset; the record identifier
 * patterns; the lowercase hex digest. AAP §0.8 gives that presentation half one owner,
 * `src/types/figure-text.ts`, whose money and grouped-number rules are re-exported here as
 * {@link formatMoney} and {@link formatQuantity}, because the comparison CSV's composer is a
 * service module that may not import `src/components` and a second formatter would drift. A
 * surface needing another rendering adds no formatter of its own, recording the departure here
 * first. One money figure has four recorded renderings — two in use and two retired — and a site
 * that names one names it by number in this passage:
 *
 * 1. An amount in one of the interface's own figures, through {@link formatMoney}: `de-DE`, the
 *    code `EUR`, a full stop between thousands.
 * 2. An amount inside a record's own sentence — the prose formatter groups it with commas and
 *    neither adds nor moves the `EUR ` marker the sentence's template carries, rule P-6.
 * 3. A dot-decimal CSV field, retired: the comparison CSV prints {@link formatMoney}'s text.
 * 4. The ungrouped machine amount an aggregate's evidence reading printed, retired:
 *    `src/services/mock/handlers/evidence.ts` composes a drawer's amounts, its `*Eur` inputs and
 *    its lever echoes through the rules re-exported here.
 *
 * THE TWO DURATION READINGS ARE STATED HERE AND NOWHERE ELSE: {@link formatHours} for an age,
 * {@link formatMeasuredHours} for a figure left unrounded; the one duration a service composes,
 * an aggregate's unrounded median in its evidence reading, does not pass through this module.
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
