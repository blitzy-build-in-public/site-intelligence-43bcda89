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
  it('runs the caller handler when it is enabled and clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ActionButton onClick={onClick}>Request approval for selected plan</ActionButton>);
    const button = screen.getByRole('button', { name: 'Request approval for selected plan' });

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button).not.toHaveAttribute('aria-disabled');
  });

  it('refuses the click, stays focusable and explains itself when it is disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ActionButton disabled disabledReason={STAGE_REASON} onClick={onClick}>
        Open part
      </ActionButton>,
    );
    const button = screen.getByRole('button', { name: 'Open part' });

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toHaveAttribute('disabled');

    await user.tab();
    expect(button).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);
    expect(button).toHaveAccessibleDescription(STAGE_REASON);

    await user.click(button);
    await user.keyboard('{Enter}');
    expect(onClick).not.toHaveBeenCalled();
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
    for (const button of [primary, secondary]) {
      expect(button).toHaveClass('rounded-control');
      expect(button).toHaveClass('min-h-6');
      expect(button).toHaveClass('min-w-6');
      expect(button).not.toHaveClass('shadow-md');
    }
  });

  it('keeps the layout classes the calling screen passes', () => {
    render(<ActionButton className="w-full">Verify chain</ActionButton>);

    const button = screen.getByRole('button', { name: 'Verify chain' });

    expect(button).toHaveClass('w-full');
    expect(button).toHaveAttribute('type', 'button');
  });
});
