/**
 * Component suite for `simulated-data-badge.tsx`, the badge that labels the whole demonstration.
 *
 * Each case asserts a contract the inputs give the component rather than its markup: the caller's
 * `SimLabel` is painted character for character and the demonstration clock is painted exactly as
 * `DEMO_CLOCK` fixes it (rules P-1 and P-6); the `simulated` status role marks the badge with an icon
 * and a label as well as a colour, so its meaning never rests on colour alone (rule B-3); with an
 * activation callback the root is a real button with an accessible name containing its visible label,
 * `aria-haspopup="dialog"`, a 24x24 px target and a `focus-visible` ring, activated from the keyboard
 * and the pointer; without one it is a non-interactive span with the same content and no focus stop
 * anywhere (rule P-8); and the one class list serves both themes through role tokens alone, so no
 * palette literal, `rgb()` value or shadow reaches the badge in either theme.
 *
 * A reported limit of this suite: the shell-placement assertion AAP §0.10 describes — that the badge
 * is rendered in the shell *outside* the router outlet, so no route can omit it — cannot live here.
 * A test under `src/components` may not import `src/app`, and this project ships no `@types/node`, so
 * reading `src/app/app.tsx` as source text is not available either. That assertion belongs to
 * `src/app`'s own suite for `<App/>`, where the outlet is declared. Everything the badge itself owns
 * is asserted below, and no reverse import is added to reach across that boundary.
 *
 * The labels and strings here are this suite's caller-level text: the component authors none of them,
 * because a simulation label is the exact specification §5.3 string its caller supplies and the clock
 * is the constant `src/types` owns. Nothing here hashes or reads the system clock, so the jsdom
 * environment `vite.config.ts` sets by default applies.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEMO_CLOCK, SIM_LABELS } from '../types';
import type { SimLabel } from '../types';
import { SimulatedDataBadge } from './simulated-data-badge';

/** The label a case renders: the demonstration-wide one the shell passes, in the specification's case. */
const LABEL: SimLabel = 'Simulated data';

/** Both themes of specification §4.1, as the `data-theme` values the theme provider applies. */
const THEMES = ['command', 'paper'] as const;

/**
 * The utilities a control must carry for rule B-3 and rule P-8: the 24x24 px minimum target, the
 * bordered second surface, the control radius, the 12 px step of the mono type scale, and the 2 px
 * `focus-visible` ring. Named here so a case can assert the whole requirement rather than one class.
 */
const REQUIRED_CONTROL_UTILITIES: readonly string[] = [
  'min-h-6',
  'min-w-6',
  'rounded-control',
  'border-control-boundary',
  'bg-surface-2',
  'font-mono',
  'text-12',
];

/** The focus-ring utilities, kept apart because only the interactive state may carry them. */
const FOCUS_RING_UTILITIES: readonly string[] = [
  'focus-visible:outline-2',
  'focus-visible:outline-offset-1',
  'focus-visible:outline-focus-ring',
];

/** Every class list that would show the badge reacting to something a non-control does not have. */
const INTERACTIVE_ONLY_UTILITIES: readonly string[] = [...FOCUS_RING_UTILITIES, 'cursor-pointer'];

/**
 * A shape that no role token can take: a palette literal, an `rgb()` value, an arbitrary value or a
 * shadow. A class list matching it would mean the badge had stepped outside the theme layer.
 */
const OUTSIDE_THEME_LAYER = /#[0-9a-fA-F]{3,8}\b|rgba?\(|shadow|\[.*\]/;

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

/**
 * Renders the badge and returns the element it produced.
 *
 * The two branches are separated rather than passing `onActivate={undefined}`, because the component
 * decides the kind of control it renders from whether the prop is present at all — an explicit
 * `undefined` and an absent prop are the same state by type, and a case should state which one it
 * exercises.
 */
function renderBadge(onActivate?: () => void): HTMLElement {
  const { container } = render(
    onActivate === undefined ? (
      <SimulatedDataBadge label={LABEL} />
    ) : (
      <SimulatedDataBadge label={LABEL} onActivate={onActivate} />
    ),
  );

  const root = container.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error('the badge rendered nothing to read');
  }

  return root;
}

describe('SimulatedDataBadge', () => {
  /* Rule P-1: a label is the caller's exact §5.3 string, painted as visible text. Asserted for all
     seven strings rather than for one example, so a label that were re-cased, abbreviated or trimmed
     would fail on the member it affects. */
  for (const label of SIM_LABELS) {
    it(`paints the caller's ${label.toLowerCase()} label character for character`, () => {
      render(<SimulatedDataBadge label={label} />);

      expect(screen.getByText(label)).toBeVisible();
    });
  }

  /* Rule P-6: the clock is the constant `src/types` owns, painted through the one formatter. Asserted
     as the whole rendered text and as the machine-readable attribute, so a truncated or reformatted
     instant fails here rather than on a screen much further downstream. */
  it('paints the demonstration clock exactly as DEMO_CLOCK fixes it', () => {
    const root = renderBadge();
    const clock = root.querySelector('time');

    if (!(clock instanceof HTMLTimeElement)) {
      throw new Error('the badge rendered no time element for the demonstration clock');
    }

    expect(clock).toHaveTextContent(DEMO_CLOCK);
    expect(clock.textContent).toBe(DEMO_CLOCK);
    expect(clock).toHaveAttribute('datetime', DEMO_CLOCK);
  });

  /* Rule B-3: the meaning is carried by an icon and a label as well as by the status colour, so a
     reader who cannot see the hue still knows the data is simulated. The icon is hidden from assistive
     technology, which leaves the label as the one announcement. */
  it('marks the badge with the simulated status icon and label, not by colour alone', () => {
    const root = renderBadge();
    const icon = root.querySelector('svg');

    if (!(icon instanceof SVGElement)) {
      throw new Error('the badge rendered no status icon');
    }

    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(LABEL)).toBeVisible();
  });

  /* Rule P-8: with nothing to activate, the badge is not a control. It must therefore have no button,
     no link and no focus stop, and must still paint its whole content. */
  it('renders a non-interactive span when it has nothing to activate', () => {
    const root = renderBadge();

    expect(root.tagName).toBe('SPAN');
    expect(screen.queryByRole('button')).toBeNull();
    expect(root.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0);
    expect(root).not.toHaveAttribute('aria-haspopup');
    expect(screen.getByText(LABEL)).toBeVisible();
    expect(root).toHaveTextContent(DEMO_CLOCK);
  });

  /* The non-control state must not wear a control's hover, pressed or focus styling either: a ring on
     something that cannot be activated would promise a response that never comes. */
  it('dresses the non-interactive state without any control-only utility', () => {
    const root = renderBadge();

    for (const utility of INTERACTIVE_ONLY_UTILITIES) {
      expect(root.className).not.toContain(utility);
    }
  });

  /* Rules B-3 and P-8 together: given something to do, the badge is a real button with a 24x24 px
     target, a visible focus ring, a name containing its visible label and a declared popup. */
  it('renders a button with a labelled 24x24 target and a declared dialog popup when it can act', () => {
    const root = renderBadge(vi.fn());

    expect(root.tagName).toBe('BUTTON');
    expect(root).toHaveAttribute('type', 'button');
    expect(root).toHaveAttribute('aria-haspopup', 'dialog');
    expect(root).toHaveAccessibleName(`${LABEL} at ${DEMO_CLOCK}`);

    for (const utility of [...REQUIRED_CONTROL_UTILITIES, ...FOCUS_RING_UTILITIES]) {
      expect(root.className).toContain(utility);
    }

    /* The reduced-motion clause of rule B-3: the state transition is `motion-safe:`, so it is absent
       from a reduced-motion session rather than shortened within it. */
    expect(root.className).toContain('motion-safe:transition-colors');
  });

  /* A keyboard user reaches the badge by tabbing and activates it with `Enter` or `Space`, and the
     pointer does the same. All three call the callback the shell supplied, exactly once each. */
  it('activates from the keyboard and the pointer, calling the callback once per activation', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    const root = renderBadge(onActivate);

    await user.tab();
    expect(root).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(onActivate).toHaveBeenCalledTimes(2);

    await user.click(root);
    expect(onActivate).toHaveBeenCalledTimes(3);
  });

  /* The popover is the shell's, not this component's: activating the badge asks the shell to open it
     and renders nothing here. A dialog appearing from inside the badge would mean the simulation
     controls had leaked out of `src/app/simulation-controls.tsx`. */
  it('opens nothing of its own when activated', async () => {
    const user = userEvent.setup();
    renderBadge(vi.fn());

    await user.click(screen.getByRole('button', { name: new RegExp(LABEL) }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  /* The one class list serves both themes, so the same badge resolves to each theme's measured
     colours. Asserted under both `data-theme` values, and against the shape no role token takes, so a
     palette literal or a shadow could not reach the badge in either theme. */
  for (const theme of THEMES) {
    it(`renders from role tokens alone under the ${theme} theme`, () => {
      document.documentElement.setAttribute('data-theme', theme);

      const root = renderBadge(vi.fn());

      for (const utility of REQUIRED_CONTROL_UTILITIES) {
        expect(root.className).toContain(utility);
      }
      expect(root.className).not.toMatch(OUTSIDE_THEME_LAYER);
      expect(screen.getByText(LABEL)).toBeVisible();
      expect(root).toHaveTextContent(DEMO_CLOCK);
    });
  }
});
