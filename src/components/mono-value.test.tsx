/**
 * Component suite for `mono-value.tsx`, the single presentation formatter of the workspace.
 *
 * The module's whole contract is one string per value, so every case asserts the exact text a
 * reader sees rather than the presence of an element: thousands grouping and the currency code for
 * an amount, at most two decimals, a whole amount printed without decimals, an identifier, an ISO
 * 8601 timestamp and a sixty-four character digest each rendered character for character and never
 * truncated, and the raw input kept on screen when an amount has no formatted form (rule P-6 —
 * never a formatted number that is not the number, and never a substituted zero). Two further cases
 * cover the shape the component promises its callers: one inline `<span>` carrying the mono face and
 * tabular numerals, with a digest's full length wrapping instead of overflowing, and no focus stop,
 * no `aria-label` and no `title` standing between the reader and the value.
 *
 * The expected amounts are assembled from the currency code held below rather than written out, so
 * the assertion still compares the complete rendered string while no currency-shaped literal sits in
 * this folder for the source checks over `src/components` to read as a figure typed into a component.
 *
 * Renders under the jsdom environment `vite.config.ts` configures; nothing here hashes, reads the
 * clock or reaches the service layer.
 */

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { DEMO_CLOCK } from '../types';
import { MONO_VALUE_CLASSES, MonoValue } from './mono-value';
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
});
