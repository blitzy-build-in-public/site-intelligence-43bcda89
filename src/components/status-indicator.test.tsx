/**
 * Component suite for `status-indicator.tsx`, the single status vocabulary of the interface.
 *
 * Each case asserts a contract rule B-3 and AAP §0.5.2 give the component rather than its markup: a
 * meaning always shows an icon, a label and its status role colour together; the icon is hidden from
 * assistive technology so the label is the only accessible name; the six meanings are visually
 * distinguishable from one another; `meaningOf` maps all six `PinState` members of contracts §4.2
 * with the clock on `pending` and without it on `stale`; a caller's override replaces the meaning's
 * own icon without becoming a second announcement; the component is not a control and therefore adds
 * no focus stop; and the one class list serves both themes through role tokens alone, so no palette
 * literal, `rgb()` value or shadow reaches a status in either theme.
 *
 * The labels here are this suite's own caller-level text. The component authors none: a status label
 * is record content or an exact simulation label supplied by its caller (rules P-1 and P-6), so there
 * is nothing of the product's wording for a case to assert. Nothing here hashes or reads the clock,
 * so the jsdom environment `vite.config.ts` sets by default applies.
 */

import { Clock } from '@phosphor-icons/react';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import type { PinState } from '../types';
import {
  PENDING_CLOCK_ICON,
  StatusIndicator,
  meaningOf,
} from './status-indicator';
import type { StatusDescriptor, StatusMeaning } from './status-indicator';

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

/** The status role utility each meaning is expected to paint, restated from the theme layer. */
const MEANING_COLOUR_CLASSES = {
  pass: 'text-status-pass',
  fail: 'text-status-fail',
  warning: 'text-status-warning',
  review: 'text-status-review',
  empty: 'text-status-empty',
  simulated: 'text-status-simulated',
} as const satisfies Record<StatusMeaning, string>;

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
      expect(label).toHaveClass('text-text-primary');
    });
  }

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

  /* AAP §0.18.1 asks that both themes be checked by rendering under each `data-theme` value. The
     colours are role utilities the theme layer resolves, so one class list has to serve both: no
     utility a status carries may be a palette literal or an `rgb()` value, and no shadow may appear
     (specification §4.3 defines none). */
  for (const theme of ['command', 'paper'] as const) {
    it(`renders the same role-token statuses under the ${theme} theme`, () => {
      document.documentElement.setAttribute('data-theme', theme);

      for (const meaning of MEANINGS) {
        const { root, iconWrapper } = renderStatus(meaning);

        expect(iconWrapper.getAttribute('class') ?? '').not.toMatch(/#[0-9a-f]{3,8}|\brgba?\(/i);
        expect(iconWrapper).toHaveClass(MEANING_COLOUR_CLASSES[meaning]);
        expect((root.getAttribute('class') ?? '').includes('shadow')).toBe(false);
      }
    });
  }
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
