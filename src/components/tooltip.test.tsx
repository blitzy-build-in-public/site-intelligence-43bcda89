/**
 * Component suite for `tooltip.tsx`: the hint that explains a control which cannot act, and the
 * button pattern that cannot exist without one.
 *
 * Two rules are under test. Rule P-8 requires every button to either perform its function or be
 * visibly disabled with a text explanation, and rule B-3 requires that explanation to be reachable
 * and operable by keyboard with a visible focus indicator. The reason is therefore asserted on both
 * paths it has to take — keyboard focus and pointer hover — because either path alone would leave
 * a user without the explanation, and the disabled control is asserted to refuse activation from
 * both. Rule B-3's motion clause is covered by the hover and pressed states: they exist on both
 * variants, they are carried by a `motion-safe` transition, and they never paint on a disabled
 * control. The trigger's description is asserted with the hint closed, because a screen reader that
 * resolves it at focus time would otherwise announce the control with no reason. The three class
 * lists the module exports are asserted as the single owners of the control's appearance — both
 * variants are built on `CONTROL_STRUCTURE_CLASSES`, the primary one composes
 * `PRIMARY_STATE_CLASSES`, the secondary one `SECONDARY_CONTROL_CLASSES` — because the
 * application's links compose those same two lists instead of restating them. Nothing here hashes or
 * reads the clock, so the jsdom environment `vite.config.ts` sets by default applies.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ActionButton,
  CONTROL_STRUCTURE_CLASSES,
  PRIMARY_STATE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
  Tooltip,
} from './tooltip';

/** The reason a stage-owned control carries once it is disabled, in the specification's own words. */
const STAGE_REASON = 'Arrives in stage S4';

function renderTooltippedButton(): HTMLButtonElement {
  render(
    <Tooltip label={STAGE_REASON}>
      <button type="button">Open part</button>
    </Tooltip>,
  );
  return screen.getByRole('button', { name: 'Open part' });
}

/** Renders a disabled `ActionButton` and returns the element it produced. */
function renderDisabledButton(onClick: () => void): HTMLButtonElement {
  render(
    <ActionButton disabled disabledReason={STAGE_REASON} onClick={onClick}>
      Open part
    </ActionButton>,
  );
  return screen.getByRole('button', { name: 'Open part' });
}

/**
 * The colour property a state utility paints: `hover:bg-ground`, `active:text-text-primary` and
 * `aria-disabled:hover:border-control-boundary` reduce to the property family `bg`, `text` or
 * `border`. A test can then compare which properties the pointer states touch against the ones the
 * disabled state re-asserts, without pinning either to a particular role.
 */
function colourFamily(utility: string): string {
  const name = utility.slice(utility.lastIndexOf(':') + 1);
  return name.split('-')[0] ?? '';
}

/**
 * The utilities that paint a control at rest: the ones no state prefix reaches.
 *
 * A shared class list mixes the resting appearance with its `hover:` and `active:` states, and only
 * the resting half tells the two variants apart — the pressed pair legitimately overlaps, because
 * both variants lift their boundary to the accent role while pressed.
 */
function restingUtilities(classList: string): readonly string[] {
  return classList.split(' ').filter((utility) => !utility.includes(':'));
}

/** Leaves `<html>` on the default theme for whichever suite runs next, as the other suites do. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('Tooltip', () => {
  it('stays closed until its trigger is hovered or focused', () => {
    renderTooltippedButton();

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('reveals the label on keyboard focus and hides it again on blur', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltippedButton();

    await user.tab();
    expect(trigger).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);

    await user.tab();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('reveals the label on pointer hover and hides it when the pointer leaves', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltippedButton();

    await user.hover(trigger);
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);

    await user.unhover(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('describes the trigger through the element that carries the label', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltippedButton();

    await user.tab();

    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    const description = document.getElementById(describedBy ?? '');
    expect(description).not.toBeNull();
    expect(description).toHaveAttribute('role', 'tooltip');
    expect(description).toHaveTextContent(STAGE_REASON);
    expect(trigger).toHaveAccessibleDescription(STAGE_REASON);
  });

  it('carries the reason as the trigger description before the hint is shown', () => {
    const trigger = renderTooltippedButton();

    /* A screen reader computes the accessible description when focus arrives. If the association
       existed only on the render that follows the focus event that opened the hint, the button would
       be announced with no reason at all — so this is asserted with nothing hovered or focused. */
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(trigger).toHaveAccessibleDescription(STAGE_REASON);
    expect(screen.getAllByText(STAGE_REASON)).toHaveLength(1);
  });

  it('keeps the description and the element it points at after the hint closes', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltippedButton();

    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await user.tab();
    expect(screen.queryByRole('tooltip')).toBeNull();

    /* One description element, still mounted: `aria-describedby` never points at nothing, which is
       what an unmounted hint would leave behind and what axe reports as a dangling reference. */
    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent(STAGE_REASON);
    expect(trigger).toHaveAccessibleDescription(STAGE_REASON);
    expect(screen.getAllByText(STAGE_REASON)).toHaveLength(1);
  });

  it('keeps a description the trigger already carried and appends its own', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label={STAGE_REASON}>
        <button type="button" aria-describedby="existing-description">
          Investigate
        </button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Investigate' });

    await user.tab();

    const ids = (trigger.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe('existing-description');
  });

  it('dismisses the label on Escape and leaves focus on the trigger', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltippedButton();

    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it.each([
    {
      placement: undefined,
      side: 'default',
      painted: 'bottom-full',
      rejected: 'top-full',
    },
    {
      placement: 'bottom' as const,
      side: 'bottom',
      painted: 'top-full',
      rejected: 'bottom-full',
    },
  ])('paints the hint on the $side placement', async ({ placement, painted, rejected }) => {
    const user = userEvent.setup();
    render(
      <Tooltip label={STAGE_REASON} {...(placement === undefined ? {} : { placement })}>
        <button type="button">Open part</button>
      </Tooltip>,
    );

    await user.hover(screen.getByRole('button', { name: 'Open part' }));

    /* `placement` is public and no other case passes it, so the side each row asks for is asserted
       both ways round: the hint carries the utility that side paints and must not carry the other
       one's, which is what a component ignoring the prop cannot satisfy. */
    const hint = screen.getByRole('tooltip');
    expect(hint).toHaveClass(painted);
    expect(hint).not.toHaveClass(rejected);
  });

  it('hands the caller layout classes to the wrapper and never to the control', () => {
    render(
      <Tooltip label={STAGE_REASON} className="w-full">
        <button type="button">Open part</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole('button', { name: 'Open part' });
    const wrapper = trigger.parentElement;

    /* Asserted on `Tooltip` itself, not through `ActionButton`'s disabled branch: the layout classes
       size the wrapper the calling screen positions, and the control keeps its own list. */
    expect(wrapper).toHaveClass('relative');
    expect(wrapper).toHaveClass('w-full');
    expect(trigger).not.toHaveClass('w-full');
  });
});

describe('ActionButton', () => {
  it('runs the caller handler once per pointer activation while it is enabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ActionButton onClick={onClick}>Request approval for selected plan</ActionButton>);
    const button = screen.getByRole('button', { name: 'Request approval for selected plan' });

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button).not.toHaveAttribute('aria-disabled');
  });

  it('runs the caller handler once per keyboard activation, from Enter and from Space', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ActionButton onClick={onClick}>Verify chain</ActionButton>);
    const button = screen.getByRole('button', { name: 'Verify chain' });

    await user.tab();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('T-16 keeps a disabled control in the tab order and resolves its description to the reason', async () => {
    const user = userEvent.setup();
    const button = renderDisabledButton(vi.fn());

    /* The native `disabled` attribute takes a control out of the tab order, which is the defect
       this assertion exists to prevent: the explanation rule P-8 requires would then be silent to
       a screen reader and unreachable by keyboard, against rule B-3. */
    expect(button).not.toHaveAttribute('disabled');
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await user.tab();

    expect(button).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);

    const describedBy = button.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    const description = document.getElementById(describedBy ?? '');
    expect(description).not.toBeNull();
    expect(description).toHaveAttribute('role', 'tooltip');
    expect(description).toHaveTextContent(STAGE_REASON);
    expect(button).toHaveAccessibleDescription(STAGE_REASON);
  });

  it('T-16 announces the disabled reason on focus without waiting for the hint to open', () => {
    const button = renderDisabledButton(vi.fn());

    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(button).toHaveAccessibleDescription(STAGE_REASON);
  });

  it('shows the same reason on pointer hover as it does on keyboard focus', async () => {
    const user = userEvent.setup();
    const button = renderDisabledButton(vi.fn());

    await user.hover(button);

    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);
    expect(button).toHaveAccessibleDescription(STAGE_REASON);

    await user.unhover(button);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('refuses activation from the pointer and from the keyboard while it is disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const button = renderDisabledButton(onClick);

    await user.click(button);
    await user.tab();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders both variants from the role utilities only', () => {
    render(
      <>
        <ActionButton variant="primary">Approve</ActionButton>
        <ActionButton>Request changes</ActionButton>
      </>,
    );

    const primary = screen.getByRole('button', { name: 'Approve' });
    const secondary = screen.getByRole('button', { name: 'Request changes' });

    expect(primary).toHaveClass('bg-action-primary-bg');
    expect(primary).toHaveClass('text-action-primary-fg');
    expect(secondary).toHaveClass('bg-surface-2');
    expect(secondary).toHaveClass('border-control-boundary');
    expect(primary).not.toHaveClass('bg-surface-2');
    for (const button of [primary, secondary]) {
      expect(button).toHaveClass('rounded-control');
      expect(button).not.toHaveClass('shadow-md');
    }
  });

  it.each([
    {
      variant: 'primary' as const,
      name: 'Approve',
      appearance: PRIMARY_STATE_CLASSES,
    },
    {
      variant: 'secondary' as const,
      name: 'Request changes',
      appearance: SECONDARY_CONTROL_CLASSES,
    },
  ])(
    'paints a hover and a pressed state from role tokens on the $variant variant',
    ({ variant, name, appearance }) => {
      render(<ActionButton variant={variant}>{name}</ActionButton>);

      const button = screen.getByRole('button', { name });

      /* The roles are named through the list that owns them rather than retyped here: no input fixes
         which role a hover or a press uses, so retyping the utilities would fail the suite on a
         legitimate token change while rule B-3's requirement still held. What is asserted is that
         requirement — this variant paints its owner list, and every state utility in that list names
         a role colour family. */
      const states = appearance
        .split(' ')
        .filter((utility) => utility.startsWith('hover:') || utility.startsWith('active:'));

      expect(states.some((utility) => utility.startsWith('hover:'))).toBe(true);
      expect(states.some((utility) => utility.startsWith('active:'))).toBe(true);
      for (const utility of states) {
        expect(button).toHaveClass(utility);
        expect(utility.slice(utility.lastIndexOf(':') + 1)).toMatch(/^(bg|text|border)-[a-z]/);
        expect(utility).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|\[.+\]/i);
      }

      /* Rule B-3: the colour change is carried by a transition a reduced-motion session never
         runs. */
      expect(button).toHaveClass('motion-safe:transition-colors');
      expect(button).toHaveClass('motion-safe:duration-150');
    },
  );

  it('composes the shared control structure and the one secondary appearance', () => {
    render(
      <>
        <ActionButton variant="primary">Approve</ActionButton>
        <ActionButton>Request changes</ActionButton>
      </>,
    );

    const primary = screen.getByRole('button', { name: 'Approve' });
    const secondary = screen.getByRole('button', { name: 'Request changes' });

    /* The structure is not written into the button twice either: every control in the product takes
       the bordered shape, the 24x24 px target, the focus ring and the colour transition from the one
       exported list, so a caller composing it renders the same control the screen's buttons are. */
    const structure = CONTROL_STRUCTURE_CLASSES.split(' ');
    expect(structure.length).toBeGreaterThan(0);
    for (const button of [primary, secondary]) {
      for (const utility of structure) {
        expect(button).toHaveClass(utility);
      }
    }

    /* The secondary appearance is the exported list in full, so the stage-notice and not-found links
       that compose it and this variant cannot drift apart. */
    const shared = SECONDARY_CONTROL_CLASSES.split(' ');
    expect(shared.length).toBeGreaterThan(0);
    for (const utility of shared) {
      expect(secondary).toHaveClass(utility);
    }

    /* The primary action is not the secondary one: it carries none of that list's resting colours,
       which is what distinguishes the two variants. */
    for (const utility of restingUtilities(SECONDARY_CONTROL_CLASSES)) {
      expect(primary).not.toHaveClass(utility);
    }
  });

  it.each(['primary', 'secondary'] as const)(
    'keeps the %s variant inert under the pointer while it is disabled',
    (variant) => {
      render(
        <ActionButton variant={variant} disabled disabledReason={STAGE_REASON}>
          Approve
        </ActionButton>,
      );

      const button = screen.getByRole('button', { name: 'Approve' });
      const states = button.className.split(' ');
      const paintedByThePointer = states.filter(
        (utility) => utility.startsWith('hover:') || utility.startsWith('active:'),
      );
      const repaintedWhileDisabled = states.filter(
        (utility) =>
          utility.startsWith('aria-disabled:hover:') || utility.startsWith('aria-disabled:active:'),
      );
      const properties = (utilities: readonly string[]): ReadonlySet<string> =>
        new Set(utilities.map(colourFamily));

      /* Every colour property the pointer states can paint has to be re-asserted on the disabled
         control; `aria-disabled:hover:` and `aria-disabled:active:` outrank a plain `hover:` and
         `active:` on specificity, so the disabled appearance wins instead of being repainted the
         moment the pointer crosses the control or it is pressed. */
      const painted = properties(paintedByThePointer);
      const repainted = properties(repaintedWhileDisabled);

      expect(painted.size).toBeGreaterThan(0);
      expect([...painted].filter((property) => !repainted.has(property))).toEqual([]);
    },
  );

  it('carries the 24x24 px minimum target and the theme focus-ring role', () => {
    render(<ActionButton>Ask a suggested question</ActionButton>);

    const button = screen.getByRole('button', { name: 'Ask a suggested question' });

    /* Rule B-3 needs a 24x24 px target and a visible focus indicator. Both are asserted as the
       tokens that produce them — `min-h-6 min-w-6` is 1.5rem on the 4 px/0.25rem scale, and the
       ring is the themes' `--color-focus-ring` role at 2 px, drawn for keyboard focus only. */
    expect(button).toHaveClass('min-h-6');
    expect(button).toHaveClass('min-w-6');
    expect(button).toHaveClass('focus-visible:outline-2');
    expect(button).toHaveClass('focus-visible:outline-offset-2');
    expect(button).toHaveClass('focus-visible:outline-focus-ring');
  });

  it('keeps the layout classes the calling screen passes', () => {
    render(<ActionButton className="w-full">Verify chain</ActionButton>);

    const button = screen.getByRole('button', { name: 'Verify chain' });

    expect(button).toHaveClass('w-full');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('occupies the same box while disabled as it does while enabled', () => {
    render(
      <>
        <ActionButton className="w-full">Verify chain</ActionButton>
        <ActionButton className="w-full" disabled disabledReason={STAGE_REASON}>
          Export evidence pack
        </ActionButton>
      </>,
    );

    const enabled = screen.getByRole('button', { name: 'Verify chain' });
    const disabled = screen.getByRole('button', { name: 'Export evidence pack' });

    /* The caller's layout classes land on the element the caller's layout sizes — the button itself
       while it can act, the Tooltip wrapper while it cannot — so a `w-full` control does not change
       width the moment it becomes disabled. jsdom has no layout engine, so the class contract is the
       assertion: exactly one element per state carries the caller's class, and the disabled button
       fills the wrapper that carries it. */
    expect(enabled).toHaveClass('w-full');
    expect(enabled.parentElement).not.toHaveClass('w-full');

    const wrapper = disabled.parentElement;
    expect(wrapper).toHaveClass('relative');
    expect(wrapper).toHaveClass('w-full');
    expect(disabled).toHaveClass('w-full');
  });

  /*
   * AAP §0.18.1 asks that both themes be checked in component tests by rendering under each
   * `data-theme` value. The control's colours are role utilities the theme layer resolves, so one
   * class list has to serve both themes: the check is that no utility a control carries under
   * either theme is a palette literal or an `rgb()` value, that the focus ring it paints is the
   * theme's own role, and that it carries no shadow, which is what keeps the theme files the only
   * owner of the colour. Both themes are also measured in a real browser during verification, where
   * the roles resolve to the measured values.
   */
  for (const theme of ['command', 'paper'] as const) {
    it(`renders the same role-token control under the ${theme} theme`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      render(
        <>
          <ActionButton variant="primary">Approve</ActionButton>
          <ActionButton>Request changes</ActionButton>
          <ActionButton disabled disabledReason={STAGE_REASON}>
            Verify chain
          </ActionButton>
        </>,
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      for (const button of buttons) {
        expect(button.getAttribute('class') ?? '').not.toMatch(/#[0-9a-f]{3,8}|\brgba?\(/i);
        expect(button).toHaveClass('focus-visible:outline-focus-ring');
        expect(button).not.toHaveClass('shadow-md');
      }
    });
  }
});
