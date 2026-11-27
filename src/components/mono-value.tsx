/**
 * The presentation formatter of the interface's own figures: one amount carrying its currency code,
 * and one identifier, timestamp and hash style in the tabular mono face.
 *
 * `platform-contracts.md` §1 fixes the conventions rendered here — a EUR amount carrying at most two
 * decimals with a thousands separator, an instant as ISO 8601 with an offset in Europe/Berlin, the
 * record identifier patterns, and the lowercase hex digest of the audit chain — and AAP §0.8 gives
 * the presentation half of those conventions exactly one owner: this module. Nothing else formats
 * the interface's own figures, because a second presentation formatter would let two screens show one
 * record at two different values.
 *
 * Two sibling sites format an amount for a purpose that is not the interface's, and each belongs to
 * its own module: `src/services/mock/exports/scenario-csv.ts` renders a machine-readable CSV cell for
 * a spreadsheet — dot decimal, no grouping, exactly two decimals — and never reaches a screen, while
 * `src/services/mock/assistant-script.ts` renders the amount a prose answer states — grouped, at most
 * two decimals, no currency code — before any component renders it. Neither competes with this module
 * for a screen: each answers to its own consumer, and where its convention differs from this module's,
 * the MONEY_FORMAT note below records that both renderings are deliberate.
 *
 * Formatting never changes a value (AAP §0.8, rule P-6). The money rule groups and labels what it is
 * handed and never re-rounds, re-scales or appends a unit of its own; the other three rules render
 * their string character for character. The mono face and the tabular numerals are AAP §0.5.3's
 * requirement, so amounts, identifiers, timestamps and hashes align down a column and read as one
 * class of value inside a sentence.
 *
 * A value with no formatted form is shown as the raw input rather than as a formatted `NaN` or a
 * silent zero (rule P-6): a wrong number on screen is the failure that rule exists to prevent, and a
 * visible stranger can be traced back to its source where a plausible zero cannot.
 */
import type { ReactElement } from 'react';

/**
 * The four kinds of value this component renders, and the whole of its formatting state space.
 *
 * One kind is one rule: `money` groups and labels a EUR amount, and `id`, `timestamp` and `hash`
 * pass their string through unchanged. The caller states which kind a value is, so the component
 * never guesses from the value's shape — a nine-digit purchase order number and a nine-figure
 * amount would otherwise be indistinguishable.
 */
export type MonoValueKind = 'money' | 'id' | 'timestamp' | 'hash';

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
 * Two renderings of one figure therefore coexist in this build, and only one of them is this
 * module's. The plan's prose and the seed records' own sentences quote an amount with the currency
 * code first and a comma as the thousands separator; those sentences are record text, rendered
 * verbatim by the record that owns them. This component emits the amount first, a full stop as the
 * thousands separator and the currency code last, which is the `de-DE` convention fixed above.
 * Neither rendering is a typo in the other, so do not "fix" the separator in a seed record or here.
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
 * Only a finite number is formatted. A string is returned untouched rather than parsed, because
 * parsing would silently reinterpret a caller's mistake — one dotted digit group is twenty-one and
 * three tenths to a number parser and twenty-one thousand to the reader — and a number that is not
 * finite has no formatted form at all. Both cases leave the raw input on screen as the marker of the
 * defect, which is what rule P-6 asks for: never a formatted `NaN` and never a substituted zero.
 */
function formatMoney(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return MONEY_FORMAT.format(value);
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
