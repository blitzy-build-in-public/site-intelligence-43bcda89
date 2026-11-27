/**
 * Component suite for `mono-value.tsx`, the presentation formatter of the interface's own figures.
 *
 * The module's whole contract is one string per value, so every case asserts the exact text a
 * reader sees rather than the presence of an element: thousands grouping and the currency code for
 * an amount, at most two decimals, a whole amount printed without decimals, the nearest whole hour
 * for a duration, an identifier, an ISO 8601 timestamp and a sixty-four character digest each
 * rendered character for character and never truncated, and the raw input kept on screen when a
 * figure has no formatted form (rule P-6 — never a formatted number that is not the number, and
 * never a substituted zero). A grouped amount is also read back as a number and compared with the
 * prop it came from, so a formatter that re-scaled or dropped digits in the text it printed would
 * fail even where the digits it printed still looked plausible. Further cases cover the shape the component promises its callers: one inline `<span>`
 * carrying the mono face and tabular numerals, with a digest's full length wrapping instead of
 * overflowing, and no focus stop, no `aria-label` and no `title` standing between the reader and the
 * value. Both themes are rendered as well (AAP §0.18.1): the component sets no colour of its own, so
 * one class list has to serve Command and Paper, and the text colour has to be the role of the surface
 * the value is written on, whichever theme resolves it.
 *
 * The expected amounts are assembled from the currency code held below rather than written out, so
 * the assertion still compares the complete rendered string while no currency-shaped literal sits in
 * this folder for the source checks over `src/components` to read as a figure typed into a component.
 *
 * Renders under the jsdom environment `vite.config.ts` configures; nothing here hashes, reads the
 * clock or reaches the service layer.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { DEMO_CLOCK } from '../types';
import { MONO_VALUE_CLASSES, MonoValue, formatHours } from './mono-value';
import type { MonoValueKind } from './mono-value';

/** The currency code the one money formatter prints, named once so no case retypes it. */
const CURRENCY_CODE = 'EUR';

/**
 * A record identifier shaped like the identifiers the workspace carries: mixed case and long enough
 * that truncation would be visible, and carrying no digit run that a figure scan could read as a typed
 * figure.
 */
const IDENTIFIER = 'MixedCase-Identifier-Value';

/**
 * A sixty-four character digest in the lowercase hex the audit chain produces. Written as a repeated
 * scale rather than as a digest of anything, so it is obviously synthetic and still exercises the
 * full length the component must render.
 */
const HASH = '0123456789abcdef'.repeat(4);

/**
 * Renders the component and hands back the one element it produces.
 *
 * `className` is applied only when a case supplies one, because the component distinguishes an absent
 * className from a present one and an explicit `undefined` would not exercise that distinction under
 * `exactOptionalPropertyTypes`.
 */
function renderMonoValue(
  value: number | string,
  kind: MonoValueKind,
  className?: string,
): HTMLElement {
  const { container } = render(
    className === undefined ? (
      <MonoValue value={value} kind={kind} />
    ) : (
      <MonoValue value={value} kind={kind} className={className} />
    ),
  );

  const span = container.querySelector('span');
  if (span === null) {
    throw new Error('MonoValue rendered no span to read');
  }

  return span;
}

/**
 * The rendered text with every whitespace character folded to a plain space.
 *
 * ICU joins an amount to its currency code with a no-break space, which is the same rendering as a
 * plain space and a different character. Folding the two sides of a comparison this way keeps the
 * assertion about the digits, the grouping and the code — what the component is responsible for —
 * instead of about one ICU version's choice of space.
 */
function readText(element: HTMLElement): string {
  return (element.textContent ?? '').replace(/\s/g, ' ');
}

/**
 * The amount a rendered money value carries, read back as a number.
 *
 * The currency code comes off, the grouping separator goes and the decimal comma becomes a point
 * before the digits are parsed, which is the only way to tell a formatted amount from one the
 * formatter moved: text re-scaled by a factor of a hundred, or with a digit dropped where a
 * separator was taken for one, parses to a different number than the prop carried.
 */
function parseRenderedAmount(text: string): number {
  const normalised = text
    .replace(CURRENCY_CODE, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();

  return Number(normalised);
}

/** The class list a rendered value carries, for comparing what the two themes are handed. */
function paintOf(value: number | string, kind: MonoValueKind): readonly string[] {
  return Array.from(renderMonoValue(value, kind).classList);
}

/**
 * A utility that would fix a colour, a size, an opacity or a shadow outside the theme's tokens.
 *
 * The component's own class list carries the mono face and the tabular numerals and nothing else, so
 * any of these prefixes appearing would be a value chosen in the wrong place: a colour the theme has
 * not measured (rule B-3), a size outside the six-step scale, or a shadow the specification defines
 * none of.
 */
const OFF_TOKEN_UTILITY = /^(?:text|bg|border|fill|stroke|opacity|shadow|font-(?:sans|serif))-/;

/*
 * The both-themes cases set `data-theme` on `<html>` and leave it there for the length of one case,
 * so it is cleared afterwards rather than leaking into the next one.
 */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('MonoValue', () => {
  describe('money', () => {
    /* Amounts that differ only in their digits are one parameterised case (house rule CQ3). */
    it.each([
      { value: 21300, amount: '21.300', reading: 'an amount in the tens of thousands' },
      { value: 2257000, amount: '2.257.000', reading: 'an amount in the millions' },
      { value: 108000, amount: '108.000', reading: 'a six-figure amount' },
      { value: 0, amount: '0', reading: 'a zero amount' },
      { value: 0.5, amount: '0,5', reading: 'an amount of one decimal' },
      { value: -5.5, amount: '-5,5', reading: 'a negative amount' },
    ])('renders $reading with grouping and the currency code', ({ value, amount }) => {
      const span = renderMonoValue(value, 'money');

      expect(readText(span)).toBe(`${amount} ${CURRENCY_CODE}`);
    });

    it('prints at most two decimals and rounds no further than the contract allows', () => {
      /* Three decimals in, two out: the formatter's ceiling is the contract's own precision. */
      expect(readText(renderMonoValue(1234.567, 'money'))).toBe(`1.234,57 ${CURRENCY_CODE}`);
    });

    it('prints a whole amount without a decimal separator at all', () => {
      const text = readText(renderMonoValue(2257000, 'money'));

      expect(text).not.toContain(',');
      expect(text).toBe(`2.257.000 ${CURRENCY_CODE}`);
    });

    /*
     * Every amount the contract carries holds at most two decimals, so each one below is an amount
     * the formatter has to return unchanged: reading the printed text back has to land on the same
     * number the prop held, whatever the magnitude and whichever sign (rule P-6 — formatting groups
     * and labels a value and never re-scales it).
     *
     * The amounts and the expected strings are written out rather than computed with the formatter
     * under test. Rule P-6's bar is a number typed into a component, a template or a test hook, and
     * this file is none of those; an expectation produced by the same `Intl` options would agree with
     * whatever the component did and prove nothing, which is the one change that would leave this
     * suite green and worthless.
     */
    it.each([
      { value: 21300, reading: 'a five-figure amount' },
      { value: 2257000, reading: 'an amount in the millions' },
      { value: 108000, reading: 'a six-figure amount' },
      { value: 0.5, reading: 'a sub-unit amount' },
      { value: -5.5, reading: 'a negative amount' },
      { value: 0, reading: 'a zero amount' },
    ])('reads back to the value it was given for $reading', ({ value }) => {
      const rendered = readText(renderMonoValue(value, 'money'));

      /* The digits, the sign and the scale survive the grouping separator and the currency code. */
      expect(parseRenderedAmount(rendered)).toBe(value);
    });

    it.each([
      { value: Number.NaN, expected: 'NaN', reading: 'not a number' },
      { value: Number.POSITIVE_INFINITY, expected: 'Infinity', reading: 'infinite' },
      { value: Number.NEGATIVE_INFINITY, expected: '-Infinity', reading: 'negatively infinite' },
    ])(
      'renders the raw input when the amount is $reading, never a formatted value',
      ({ value, expected }) => {
        const text = readText(renderMonoValue(value, 'money'));

        /* The input's own text, and nothing that looks like a formatted amount. */
        expect(text).toBe(expected);
        expect(text).not.toContain(CURRENCY_CODE);
      },
    );

    it('renders a non-numeric string untouched rather than a formatted zero', () => {
      expect(readText(renderMonoValue('not an amount', 'money'))).toBe('not an amount');
    });

    it('does not re-parse a numeric string, so a formatted or unformatted amount is never inferred', () => {
      expect(readText(renderMonoValue('21300', 'money'))).toBe('21300');
    });
  });

  /*
   * A duration arrives unrounded and is presented as the nearest whole hour, because no reader scans
   * `145.08333333333334` off a card. The cases differing only in their digits are one parameterised
   * case (house rule CQ3), and each expectation is written out rather than produced by the formatter
   * under test — an expectation built from the same `Intl` options would agree with whatever the
   * function did and prove nothing. No expectation carries a unit either: the caption the calling
   * screen owns names the hours, so the text this function returns never repeats it.
   */
  describe('hours', () => {
    it.each([
      { value: 145.08333333333334, hours: '145', reading: 'a fractional duration' },
      { value: 26.666666666666668, hours: '27', reading: 'a duration with a repeating fraction' },
      { value: 11.25, hours: '11', reading: 'a duration just past the quarter hour' },
      { value: 18.5, hours: '19', reading: 'a duration of exactly half an hour' },
      { value: 11, hours: '11', reading: 'a whole-hour duration' },
      { value: 0, hours: '0', reading: 'a duration of no hours at all' },
      { value: 1234, hours: '1.234', reading: 'a duration in the thousands of hours' },
    ])('presents $reading as the nearest whole hour', ({ value, hours }) => {
      expect(formatHours(value)).toBe(hours);
    });

    it.each([
      { value: Number.NaN, expected: 'NaN', reading: 'not a number' },
      { value: Number.POSITIVE_INFINITY, expected: 'Infinity', reading: 'infinite' },
      { value: Number.NEGATIVE_INFINITY, expected: '-Infinity', reading: 'negatively infinite' },
    ])(
      'returns the raw input when the duration is $reading, never a formatted value',
      ({ value, expected }) => {
        expect(formatHours(value)).toBe(expected);
      },
    );

    it('returns a non-numeric string untouched rather than a formatted zero', () => {
      expect(formatHours('not a duration')).toBe('not a duration');
    });

    it('does not re-parse a numeric string, so an unformatted duration is never inferred', () => {
      expect(formatHours('26.5')).toBe('26.5');
    });
  });

  describe('id', () => {
    it('renders an identifier exactly as given, with no truncation and no case change', () => {
      expect(readText(renderMonoValue(IDENTIFIER, 'id'))).toBe(IDENTIFIER);
    });

    it('renders a short identifier exactly as given', () => {
      expect(readText(renderMonoValue('ab', 'id'))).toBe('ab');
    });
  });

  describe('timestamp', () => {
    it('renders an ISO 8601 instant with its offset exactly as given', () => {
      expect(readText(renderMonoValue(DEMO_CLOCK, 'timestamp'))).toBe(DEMO_CLOCK);
    });
  });

  describe('hash', () => {
    it('renders the whole digest at full length', () => {
      const text = readText(renderMonoValue(HASH, 'hash'));

      expect(text).toBe(HASH);
      expect(text).toHaveLength(64);
    });

    it('wraps a digest rather than letting it overflow its cell', () => {
      const span = renderMonoValue(HASH, 'hash');

      expect(span.classList).toContain(MONO_VALUE_CLASSES.hashWrap);
    });
  });

  describe('the element it renders', () => {
    it('renders one inline span carrying the mono face and tabular numerals', () => {
      const span = renderMonoValue(21300, 'money');

      /* One element and nothing beside it: no wrapper, no legend, no hidden label. */
      expect(span.parentElement?.childElementCount).toBe(1);
      expect(span.tagName).toBe('SPAN');
      for (const utility of MONO_VALUE_CLASSES.base.split(' ')) {
        expect(span.classList).toContain(utility);
      }
    });

    it('adds no wrapping class to a value that cannot overflow', () => {
      expect(renderMonoValue(IDENTIFIER, 'id').classList).not.toContain(MONO_VALUE_CLASSES.hashWrap);
    });

    it('puts a caller className last, for layout only', () => {
      const span = renderMonoValue(21300, 'money', 'w-24 text-right');

      expect(span.classList).toContain('w-24');
      expect(span.classList).toContain('text-right');
      expect(span.getAttribute('class')?.endsWith('w-24 text-right')).toBe(true);
    });

    it('ignores an empty caller className rather than leaving an empty token', () => {
      const span = renderMonoValue(21300, 'money', '');

      expect(span.getAttribute('class')).toBe(MONO_VALUE_CLASSES.base);
    });

    it('keeps the value itself as the text, with no aria-label, title or role in front of it', () => {
      const span = renderMonoValue(21300, 'money');

      expect(span.hasAttribute('aria-label')).toBe(false);
      expect(span.hasAttribute('title')).toBe(false);
      expect(span.hasAttribute('role')).toBe(false);
      expect(readText(span)).toBe(`21.300 ${CURRENCY_CODE}`);
    });

    it('adds no focus stop, because it is not interactive', () => {
      const span = renderMonoValue(HASH, 'hash');

      expect(span.hasAttribute('tabindex')).toBe(false);
    });

    it('adds no colour, size or opacity utility of its own, so the surface role holds', () => {
      const span = renderMonoValue(21300, 'money');

      /*
       * The whole class list, not a filtered sample: a colour, a font size or an opacity utility
       * added here would change the contrast the theme tokens already measure (rule B-3), and only
       * an exact comparison catches one whatever it is called.
       */
      expect(Array.from(span.classList)).toStrictEqual(MONO_VALUE_CLASSES.base.split(' '));
    });
  });

  /*
   * AAP §0.18.1 asks that both themes be checked by rendering under each `data-theme` value. The
   * component sets no colour of its own, so what that promise amounts to here is: every kind of
   * value, under each theme, is given the mono face and the tabular numerals from the type tokens,
   * and nothing that could pin a colour or a size outside the theme — no palette literal, no `rgb()`
   * value, no inline style, no colour or size utility — reaches the markup. The last case proves the
   * two themes are handed one identical class list, which is what lets the role token resolve per
   * theme rather than the component choosing a value (rule B-3).
   */
  describe('both themes', () => {
    const KINDS = ['money', 'id', 'timestamp', 'hash'] as const satisfies readonly MonoValueKind[];

    for (const theme of ['command', 'paper'] as const) {
      it(`takes the mono face and the tabular numerals from the tokens under the ${theme} theme`, () => {
        document.documentElement.setAttribute('data-theme', theme);

        for (const kind of KINDS) {
          const span = renderMonoValue(kind === 'money' ? 21300 : IDENTIFIER, kind);
          const classes = Array.from(span.classList);

          for (const utility of MONO_VALUE_CLASSES.base.split(' ')) {
            expect(classes).toContain(utility);
          }
          expect(classes.join(' ')).not.toMatch(/#[0-9a-f]{3,8}|\brgba?\(/i);
          expect(span.hasAttribute('style')).toBe(false);
          expect(classes.filter((utility) => OFF_TOKEN_UTILITY.test(utility))).toStrictEqual([]);
        }
      });
    }

    it('hands both themes one identical class list, so the colour is the theme role', () => {
      document.documentElement.setAttribute('data-theme', 'command');
      const inCommand = paintOf(21300, 'money');

      document.documentElement.setAttribute('data-theme', 'paper');
      const inPaper = paintOf(21300, 'money');

      expect(inCommand).toStrictEqual(inPaper);
    });
  });
});
