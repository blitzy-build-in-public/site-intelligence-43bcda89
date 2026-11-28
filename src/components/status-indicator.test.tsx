/**
 * Component suite for `status-indicator.tsx`, the single status vocabulary of the interface.
 *
 * Each case asserts a contract rule B-3 and AAP §0.5.2 give the component rather than its markup: a
 * meaning always shows an icon, a label and its status role colour together, with the label reachable
 * as the status's own text; the icon is hidden from assistive technology so the label is the only
 * accessible name; the six meanings are visually distinguishable from one another; `meaningOf` maps
 * all six `PinState` members of contracts §4.2 with the clock on `pending` and without it on `stale`,
 * and a pending pin driven from that descriptor renders the clock in the warning colour; a caller's
 * override replaces the meaning's own icon without becoming a second announcement; the component is
 * not a control and therefore adds no focus stop; and the one class list serves both themes through
 * role tokens alone, so the only colours a status emits are its meaning's `text-status-*` token and
 * the primary text role, with no inline style, palette literal or shadow in either theme.
 *
 * The labels here are this suite's own caller-level text. The component authors none: a status label
 * is record content or an exact simulation label supplied by its caller (rules P-1 and P-6), so there
 * is nothing of the product's wording for a case to assert. Nothing here hashes or reads the clock,
 * so the jsdom environment `vite.config.ts` sets by default applies.
 */

import { Clock } from '@phosphor-icons/react';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';

import type { PinState } from '../types';
import {
  MEANING_COLOUR_CLASSES,
  PENDING_CLOCK_ICON,
  STATUS_LABEL_CLASS,
  StatusIndicator,
  meaningOf,
} from './status-indicator';
import type { StatusDescriptor, StatusMeaning } from './status-indicator';

/*
 * Both class tokens above come from the component, which is their one owner: the role each meaning
 * paints, and the text role the label takes. Retyping them here would give each a second owner and
 * break every class-list case on a restyle to an equivalent utility while the token itself held.
 *
 * What a token resolves to is the theme layer's (`src/theme/tokens.css`), and no case here can read
 * that value: Vitest stubs a stylesheet's text to an empty string and jsdom resolves neither `var()`
 * nor a Tailwind utility. The cases therefore prove which tokens reach the markup — the same ones
 * under both themes — and leave their values to the layer that measures them.
 */

/** The six meanings, in the order the component's own maps declare them. */
const MEANINGS = [
  'pass',
  'fail',
  'warning',
  'review',
  'empty',
  'simulated',
] as const satisfies readonly StatusMeaning[];

/** The six pin states of contracts §3, which `meaningOf` has to answer for. */
const PIN_STATES = [
  'empty',
  'pending',
  'pass',
  'fail',
  'stale',
  'review',
] as const satisfies readonly PinState[];

/** The label a case renders, standing in for a caller's record wording. */
const LABEL = 'Waiting on a decision';

/**
 * Renders one status and returns the pieces every case asserts on: the root element, the icon
 * wrapper it painted and the label element.
 */
function renderStatus(
  meaning: StatusMeaning,
  extra: { readonly icon?: ReactNode } = {},
): {
  readonly root: HTMLElement;
  readonly iconWrapper: HTMLElement;
  readonly label: HTMLElement;
} {
  const { container } = render(
    <StatusIndicator meaning={meaning} label={LABEL} {...extra} />,
  );
  const root = container.firstElementChild;
  const iconWrapper = root?.firstElementChild;
  const label = root?.lastElementChild;
  if (
    !(root instanceof HTMLElement) ||
    !(iconWrapper instanceof HTMLElement) ||
    !(label instanceof HTMLElement)
  ) {
    throw new Error(`the status rendered an unexpected structure for the ${meaning} meaning`);
  }
  return { root, iconWrapper, label };
}

/** The single icon glyph a rendered status paints, or a failure naming the meaning. */
function iconOf(root: HTMLElement, meaning: string): SVGElement {
  const icon = root.querySelector('svg');
  if (!(icon instanceof SVGElement)) {
    throw new Error(`the ${meaning} meaning rendered no icon`);
  }
  return icon;
}

/** The utility prefixes that could paint a colour, so a class list can be read for its colours alone. */
const COLOUR_UTILITY_PREFIXES = [
  'text-',
  'bg-',
  'border-',
  'fill-',
  'stroke-',
  'ring-',
  'outline-',
  'shadow-',
  'decoration-',
  'accent-',
  'caret-',
  'divide-',
  'from-',
  'via-',
  'to-',
] as const;

/**
 * Every class in one class list that could carry a colour, with a variant prefix (`hover:`,
 * `focus-visible:`) removed so the utility itself is what is compared.
 */
function colourUtilitiesIn(classList: string): string[] {
  return classList
    .split(/\s+/)
    .filter((value) => value !== '')
    .map((value) => value.slice(value.lastIndexOf(':') + 1))
    .filter((utility) =>
      COLOUR_UTILITY_PREFIXES.some((prefix) => utility.startsWith(prefix)),
    );
}

/** Every class across the rendered elements that could carry a colour, read as above. */
function colourUtilitiesOf(elements: readonly Element[]): string[] {
  return elements.flatMap((element) => colourUtilitiesIn(element.getAttribute('class') ?? ''));
}

/**
 * The colour-bearing classes a rendered status is allowed to carry for one meaning, read from the
 * tokens the component itself applies rather than from a copy of them: the meaning's status role, and
 * the label's own text role. Both sides of the comparison pass through the same reader, so a token
 * that gains or loses a colour utility reaches this expectation without the case restating it.
 */
function expectedColourUtilities(meaning: StatusMeaning): string[] {
  return [
    ...colourUtilitiesIn(MEANING_COLOUR_CLASSES[meaning]),
    ...colourUtilitiesIn(STATUS_LABEL_CLASS),
  ].sort();
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('StatusIndicator', () => {
  /* The three carriers of a meaning, asserted for every meaning rather than for one example: the
     icon is painted, the label is painted, and the wrapper that holds the icon carries that meaning's
     status role utility. A meaning whose colour or icon were missing would fail here. */
  for (const meaning of MEANINGS) {
    it(`shows the icon, the label and the status colour together for the ${meaning} meaning`, () => {
      const { root, iconWrapper, label } = renderStatus(meaning);
      const icon = iconOf(root, meaning);

      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('focusable', 'false');
      expect(label).toHaveTextContent(LABEL);
      expect(iconWrapper).toHaveClass(MEANING_COLOUR_CLASSES[meaning]);
      /* The label carries the component's own label token in full — the primary text role and the
         layout utility beside it — so a restyle of that token reaches this case rather than breaking
         it, and the role the label wears is still asserted. */
      expect(label).toHaveClass(...STATUS_LABEL_CLASS.split(' '));
    });
  }

  /* The label has to be reachable the way a screen's own test and a reader reach it — as the status's
     text — and it has to be the whole of that text, so the icon contributes no characters the reader
     would meet twice. */
  it('shows the label as the text a reader can find by its wording', () => {
    const { root } = renderStatus('warning');

    expect(screen.getByText(LABEL)).toBeVisible();
    expect(root).toHaveTextContent(LABEL);
    expect(root.textContent).toBe(LABEL);
  });

  it('paints a different icon for every meaning', () => {
    const glyphs = MEANINGS.map((meaning) => {
      const { root } = renderStatus(meaning);
      return iconOf(root, meaning).innerHTML;
    });

    expect(new Set(glyphs).size).toBe(MEANINGS.length);
  });

  it('names the status through its label alone, with no second announcement', () => {
    const { root, label } = renderStatus('pass');
    const iconWrapper = root.firstElementChild;

    expect(label).toHaveTextContent(LABEL);
    expect(root).not.toHaveAttribute('aria-label');
    expect(root.querySelectorAll('title')).toHaveLength(0);
    expect(iconWrapper).toHaveAttribute('aria-hidden', 'true');
  });

  it('adds no focus stop, because a status is not a control', () => {
    const { root } = renderStatus('review');

    expect(root).not.toHaveAttribute('tabindex');
    expect(root).not.toHaveAttribute('role');
    expect(root.querySelector('[tabindex]')).toBeNull();
    expect(root.querySelector('a, button, input, select, textarea')).toBeNull();
  });

  it("paints the caller's icon instead of the meaning's own", () => {
    const defaultIcon = iconOf(renderStatus('warning').root, 'warning');
    const { root } = renderStatus('warning', { icon: <Clock /> });
    const overridden = iconOf(root, 'warning');

    expect(overridden.innerHTML).not.toBe(defaultIcon.innerHTML);
    expect(overridden.parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  /* The exported clock is the element a consumer hand a pending pin's descriptor to, so it has to
     arrive already hidden: a status would otherwise announce an unlabelled clock beside its label. */
  it('exports a clock for the pending state that is hidden from assistive technology', () => {
    const { root, iconWrapper } = renderStatus('warning', { icon: PENDING_CLOCK_ICON });
    const clock = iconOf(root, 'pending');

    expect(clock).toHaveAttribute('aria-hidden', 'true');
    expect(clock).toHaveAttribute('focusable', 'false');
    expect(iconWrapper).toHaveClass(MEANING_COLOUR_CLASSES.warning);
  });

  /* The pending pin end to end, the way a consumer drives it: `meaningOf` names the meaning and the
     override, and both reach the component together. A pending review shares the warning colour with a
     degraded source, so the clock is what makes it read differently — and it has to replace the
     triangle rather than sit beside it. */
  it('renders a pending pin from its descriptor with the clock in the warning colour', () => {
    const descriptor = meaningOf('pending');
    const warningGlyph = iconOf(renderStatus('warning').root, 'warning').innerHTML;

    const { root, iconWrapper, label } = renderStatus(descriptor.meaning, {
      icon: PENDING_CLOCK_ICON,
    });

    expect(descriptor).toEqual({ meaning: 'warning', iconOverride: 'clock' });
    expect(iconOf(root, 'pending')).toHaveAttribute('aria-hidden', 'true');
    expect(iconOf(root, 'pending').innerHTML).not.toBe(warningGlyph);
    expect(iconWrapper).toHaveClass(MEANING_COLOUR_CLASSES.warning);
    expect(label).toHaveTextContent(LABEL);
  });

  /* Both themes, over specification §4.2's six status roles (AAP §0.18.1 asks that both be checked by
     rendering under each `data-theme` value).

     The colour a status paints is its meaning's role token, so the two themes differ in that token's
     value and not in the markup: the same `text-status-*` class list is emitted under Command and
     Paper, and the per-theme colour arrives from `src/theme/tokens.css`, which maps each role to the
     palette variable its theme file declares. The comparison is drawn on this side of the boundary
     because a jsdom suite cannot observe that value at all — Vitest stubs a stylesheet's text to an
     empty string, so neither theme file is readable from here, and jsdom resolves no `var()` and no
     Tailwind utility. What the suite can prove, and does, is the property the value comparison exists
     to establish: no colour reaches a status except through a role token, in either theme. A
     hard-coded colour would have to surface as an arbitrary value or a palette utility in a class
     list, or as an inline `style`, and each of those is asserted absent below; the class list is
     asserted identical across the two themes, so nothing theme-specific is baked into the markup. */
  const THEMES = ['command', 'paper'] as const;

  for (const theme of THEMES) {
    it(`paints every meaning through its status role token under the ${theme} theme`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      expect(document.documentElement.getAttribute('data-theme')).toBe(theme);

      for (const meaning of MEANINGS) {
        const { root } = renderStatus(meaning);
        const elements = [root, ...Array.from(root.querySelectorAll('*'))];

        for (const element of elements) {
          expect(element.getAttribute('style')).toBeNull();
          expect(element.getAttribute('class') ?? '').not.toMatch(
            /#[0-9a-f]{3,8}|\brgba?\(|\bhsla?\(/i,
          );
          expect((element.getAttribute('class') ?? '').includes('shadow')).toBe(false);
        }

        expect(colourUtilitiesOf(elements).sort()).toEqual(expectedColourUtilities(meaning));
      }
    });
  }

  it('emits the same role-token class list under both themes', () => {
    const classListsUnder = (theme: (typeof THEMES)[number]): string[][] => {
      document.documentElement.setAttribute('data-theme', theme);
      return MEANINGS.map((meaning) => {
        const { root } = renderStatus(meaning);
        return [root, ...Array.from(root.querySelectorAll('*'))].map(
          (element) => element.getAttribute('class') ?? '',
        );
      });
    };

    expect(classListsUnder('paper')).toEqual(classListsUnder('command'));
  });
});

describe('meaningOf', () => {
  /* The contracts §4.2 mapping, one case per pin state. `pending` is the only state whose descriptor
     carries the clock, and `stale` is asserted to reach the same warning meaning without it, because
     an ageing source and a pending review must share a colour while reading differently. */
  const EXPECTED = {
    pass: { meaning: 'pass' },
    fail: { meaning: 'fail' },
    stale: { meaning: 'warning' },
    pending: { meaning: 'warning', iconOverride: 'clock' },
    review: { meaning: 'review' },
    empty: { meaning: 'empty' },
  } as const satisfies Record<PinState, StatusDescriptor>;

  for (const state of PIN_STATES) {
    it(`maps the ${state} pin state onto its shared meaning`, () => {
      expect(meaningOf(state)).toEqual(EXPECTED[state]);
    });
  }

  /* The loop is only half the guard, because it walks the list this suite holds. The completeness of
     that list is asserted where it can fail: `EXPECTED` is declared `satisfies Record<PinState,
     StatusDescriptor>`, and this case states the other direction, so a pin state added to the
     vocabulary fails the type check here until it is given a meaning instead of being skipped. */
  it('declares an expectation for every pin state the vocabulary holds, and no other', () => {
    expectTypeOf<keyof typeof EXPECTED>().toEqualTypeOf<PinState>();
  });

  it('leaves the clock off the stale state that shares the warning meaning', () => {
    expect(meaningOf('stale').iconOverride).toBeUndefined();
    expect(meaningOf('pending').iconOverride).toBe('clock');
  });

  it('maps every pin state the vocabulary declares', () => {
    const mapped = PIN_STATES.map((state) => meaningOf(state).meaning);

    expect(mapped).toHaveLength(PIN_STATES.length);
    for (const meaning of mapped) {
      expect(MEANINGS).toContain(meaning);
    }
  });
});
