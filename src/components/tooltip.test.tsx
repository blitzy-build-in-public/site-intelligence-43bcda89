/**
 * Component suite for `tooltip.tsx`: the hint that explains a control which cannot act, and the
 * button pattern that cannot exist without one.
 *
 * Two rules are under test. Rule P-8 requires every button to either perform its function or be
 * visibly disabled with a text explanation, and rule B-3 requires that explanation to be reachable
 * and operable by keyboard with a visible focus indicator. The reason is therefore asserted on both
 * paths it has to take — keyboard focus and pointer hover — because either path alone would leave
 * a user without the explanation, and the disabled control is asserted to refuse activation from
 * both. Nothing here hashes or reads the clock, so the jsdom environment `vite.config.ts` sets by
 * default applies.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionButton, Tooltip } from './tooltip';

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
});
