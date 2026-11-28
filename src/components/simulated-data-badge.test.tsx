/**
 * Component suite for `simulated-data-badge.tsx`, the badge that labels the whole demonstration.
 *
 * Each case asserts a contract the inputs give the component rather than its markup: the caller's
 * `SimLabel` is painted character for character and the demonstration clock is painted exactly as
 * `DEMO_CLOCK` fixes it (rules P-1 and P-6); the `simulated` status role marks the badge with an icon
 * and a label as well as a colour, so its meaning never rests on colour alone (rule B-3); with an
 * activation callback the root is a real button with an accessible name containing its visible label,
 * `aria-haspopup="dialog"`, the popover's open state as `aria-expanded` whenever the caller supplies
 * it, a 24x24 px target and a `focus-visible` ring, activated from the keyboard and the pointer; with
 * no callback it is a non-interactive span with the same content, no popup state of any kind and no
 * focus stop anywhere (rule P-8); and the one class list serves both themes through role tokens alone,
 * so no palette literal, `rgb()` value or shadow reaches the badge in either theme.
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
 * is the constant `src/types` owns. Both are therefore read from `SIM_LABELS` and `DEMO_CLOCK` rather
 * than retyped, so no case carries its own copy of a label the interface has since left behind (rule
 * P-6). That leaves the vocabulary itself to pin, which is the one thing this suite states as literals:
 * the case below asserts `SIM_LABELS` equals the seven §5.3 strings, in order, so the constant cannot
 * be reworded while every suite that reads it stays green (rule P-1, AAP §0.10). The
 * presence-and-label case carries the `T-15` identifier, because T-15 is the labelling acceptance test;
 * every other title states the behaviour it checks. Nothing here hashes or reads the system clock, so
 * the jsdom environment `vite.config.ts` sets by default applies.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEMO_CLOCK, SIM_LABELS } from '../types';
import type { SimLabel } from '../types';
import { SimulatedDataBadge } from './simulated-data-badge';

/**
 * One of the seven fixed simulation labels, read from `SIM_LABELS` rather than retyped, so a reworded
 * label cannot leave this suite asserting a string the interface no longer shows (rule P-6).
 */
function simLabelAt(index: number): SimLabel {
  const label = SIM_LABELS[index];
  if (label === undefined) {
    throw new Error(`no simulation label is defined at index ${index}`);
  }
  return label;
}

/**
 * The label a case renders: the demonstration-wide `Simulated data` string of specification §5.3,
 * which is the one the shell mounts on every route (rule P-1, AAP §0.10).
 */
const LABEL = simLabelAt(0);

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

/**
 * The focus-ring utilities, kept apart because only the interactive state may carry them. The ring's
 * geometry is not among them: `src/styles/index.css` states the 2 px and the +2 offset once, in the
 * single `:focus-visible` rule, so a class list here carries the width and the colour role only.
 */
const FOCUS_RING_UTILITIES: readonly string[] = [
  'focus-visible:outline-2',
  'focus-visible:outline-focus-ring',
];

/**
 * An offset utility, in either sign and under any variant: the value the one global `:focus-visible`
 * rule owns. A class list that matched this would draw the badge's ring at a geometry of its own.
 */
const LOCAL_OUTLINE_OFFSET = /(?:^|[\s:])-?outline-offset-/;

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
  /* Acceptance test T-15, the labelling case (rule P-1): the badge is present and the word on it is
     the fixed §5.3 string the shell supplies, with the demonstration clock reading beside it — the
     presence and wording every route has to carry. That the shell mounts it outside the router outlet,
     so no route can omit it, is that shell's assertion and is stated in this file's header. */
  it('T-15 shows the badge with its fixed label and the demonstration clock', () => {
    render(<SimulatedDataBadge label={LABEL} />);

    expect(screen.getByText(LABEL)).toBeVisible();
    expect(screen.getByText(DEMO_CLOCK)).toBeVisible();
  });

  /* Rule P-1, specification §5.3 and AAP §0.10: the seven labels are fixed text, never paraphrased and
     never abbreviated. Every case in this file and in the sibling suites that carry a label reads
     `SIM_LABELS` rather than retyping one, which keeps them consistent with the constant but can never
     tell whether the constant itself still says what §5.3 fixes. This is the one place the vocabulary
     is pinned: the whole tuple, in order, so a member that were reworded, re-cased or dropped — or an
     eighth label slipped into the union — fails here instead of propagating silently through every
     component that reads the constant. */
  it('pins the seven simulation labels to the exact specification §5.3 strings, in order', () => {
    expect(SIM_LABELS).toEqual([
      'Simulated data',
      'Simulated calculation',
      'Simulated recommendation',
      'Simulated write-back',
      'Simulated control',
      'Simulated market intelligence',
      'Declared, not verified',
    ]);
  });

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
     no link, no focus stop and no role that would announce one, no click action reachable on it, and it
     must still paint its whole content. A dead control — a button that does nothing — is exactly what
     the rule forbids, so the honest state is plain text. */
  it('renders a non-interactive span when it has nothing to activate', async () => {
    const user = userEvent.setup();
    const root = renderBadge();

    expect(root.tagName).toBe('SPAN');
    expect(root).not.toHaveAttribute('role');
    expect(screen.queryByRole('button')).toBeNull();
    expect(root.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0);
    expect(root).not.toHaveAttribute('aria-haspopup');
    expect(screen.getByText(LABEL)).toBeVisible();
    expect(root).toHaveTextContent(DEMO_CLOCK);

    /* Activating it reaches no handler: nothing opens, nothing is added and no callback could run. */
    await user.click(root);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  /* Rule B-3 and the disclosure contract the button declares: a control that names a popup reports
     whether it is open, and a non-control reports neither because it opens nothing. The state is
     passed here on purpose — a caller can hold it while the badge is not a control — so the case
     proves the attribute never reaches the span. */
  it('declares no aria-expanded on the non-interactive span, even when a state arrives', () => {
    const { container } = render(<SimulatedDataBadge label={LABEL} expanded={true} />);

    const root = container.firstElementChild;
    if (!(root instanceof HTMLElement)) {
      throw new Error('the badge rendered nothing to read');
    }

    expect(root.tagName).toBe('SPAN');
    expect(root).not.toHaveAttribute('aria-expanded');
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
    /* No state supplied means no state announced: the attribute is absent rather than `false`, so a
       caller that cannot know the popover's state does not announce a collapsed one. */
    expect(root).not.toHaveAttribute('aria-expanded');
    expect(root).toHaveAccessibleName(`${LABEL} at ${DEMO_CLOCK}`);

    for (const utility of [...REQUIRED_CONTROL_UTILITIES, ...FOCUS_RING_UTILITIES]) {
      expect(root.className).toContain(utility);
    }

    /* The reduced-motion clause of rule B-3: the state transition is `motion-safe:`, so it is absent
       from a reduced-motion session rather than shortened within it. */
    expect(root.className).toContain('motion-safe:transition-colors');
  });

  /* Rule B-3 and the one geometry the product holds: the ring's 2 px and its +2 offset are fixed once
     by the `:focus-visible` rule in `src/styles/index.css`, so neither state of the badge states an
     offset of its own. A local offset would put this ring at a different distance from its boundary
     than every other control's, which a keyboard user reads as a ring that moves about the page.
     Asserted in both states, because either element can be the one a keyboard user lands on. */
  for (const [state, interactive] of [
    ['non-interactive', false],
    ['interactive', true],
  ] as const) {
    it(`states no focus offset in the ${state} state, leaving the ring geometry to the global rule`, () => {
      const root = renderBadge(interactive ? vi.fn() : undefined);

      expect(root.className).not.toMatch(LOCAL_OUTLINE_OFFSET);
    });
  }

  /* The button declares the dialog it opens, so it also reports that dialog's state: the shell
     supplies the popover's real open state and either value reaches `aria-expanded` as the string a
     reader hears. Both values are asserted rather than one, because a component that passed only the
     open case would still leave a reader unable to tell a closed popover from an absent one. */
  for (const expanded of [false, true]) {
    it(`reports aria-expanded="${expanded}" on the button when the shell supplies that state`, () => {
      render(<SimulatedDataBadge label={LABEL} onActivate={vi.fn()} expanded={expanded} />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', String(expanded));
    });
  }

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
