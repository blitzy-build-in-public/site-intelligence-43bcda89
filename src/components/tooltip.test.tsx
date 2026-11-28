/**
 * Component suite for `tooltip.tsx`: the hint that explains a control which cannot act, and the
 * button pattern that cannot exist without one.
 *
 * Two rules are under test. Rule P-8 requires every button to either perform its function or be
 * visibly disabled with a text explanation, and rule B-3 requires that explanation to be reachable
 * and operable by keyboard with a visible focus indicator. The reason is therefore asserted on both
 * paths it has to take — keyboard focus and pointer hover — because either path alone would leave
 * a user without the explanation, and the disabled control is asserted to refuse activation from
 * both. Rule P-8 also owes a reader who activates a control that cannot act an answer rather than
 * silence, so the refusal is asserted twice over: the reason stays painted after the pointer leaves,
 * and the same sentence reaches a live region once per refused attempt — with the hold released on
 * blur, on `Escape` and as soon as the control's own reason is replaced by another gate.
 * Rule B-3's motion clause is covered by the hover and pressed states: they exist on both
 * variants, they are carried by a `motion-safe` transition, and they never paint on a disabled
 * control. The trigger's description is asserted with the hint closed, because a screen reader that
 * resolves it at focus time would otherwise announce the control with no reason. The three class
 * lists the module exports are asserted as the single owners of the control's appearance — both
 * variants are built on `CONTROL_STRUCTURE_CLASSES`, the primary one composes
 * `PRIMARY_STATE_CLASSES`, the secondary one `SECONDARY_CONTROL_CLASSES` — because the
 * application's links compose those same two lists instead of restating them. Rule P-8 also needs the
 * reason to be readable, not merely present, so the hint's placement is covered at both levels: the
 * exported `resolveHintGeometry` is asserted directly for the flip, the clamp and the width cap, and
 * the component is asserted through the `data-side` it publishes — the side the hint settled on, not
 * the one it was asked for. jsdom lays nothing out, so the component cases stub the two boxes a
 * placement pass reads. Nothing here hashes or reads the clock, so the jsdom environment
 * `vite.config.ts` sets by default applies.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ActionButton,
  CONTROL_STRUCTURE_CLASSES,
  PRIMARY_STATE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
  Tooltip,
  resolveHintGeometry,
} from './tooltip';
import type { HintGeometry } from './tooltip';

/** The reason a stage-owned control carries once it is disabled, in the specification's own words. */
const STAGE_REASON = 'Arrives in stage S4';

/**
 * The reason the same control carries once a different gate blocks it, taken from the approvals
 * screen's own copy: the second sentence a reader meets when approve is refused.
 */
const SECOND_GATE_REASON = 'Acknowledge every side effect of this plan before approving it.';

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

/** The margin a resolved hint keeps from the window's edges, in CSS pixels. */
const VIEWPORT_MARGIN = 8;

/** A box in viewport coordinates, in the shape a placement pass reads one. */
interface MeasuredBox {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Stubs the two measurements a placement pass reads: the trigger's box and the hint's own.
 *
 * jsdom lays nothing out, so every rect there is zero and a placement could only ever resolve one
 * way. The stub tells the two apart by the one thing only the hint carries — its `tooltip` role —
 * which is also how a real page's rects would differ.
 */
function stubMeasuredBoxes(trigger: MeasuredBox, hint: MeasuredBox): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function measured(
    this: Element,
  ): DOMRect {
    const box = this.getAttribute('role') === 'tooltip' ? hint : trigger;
    return new DOMRect(box.left, box.top, box.width, box.height);
  });
}

/** Asserts a resolution lies inside the window's horizontal margins, cap included. */
function expectInsideHorizontally(
  geometry: HintGeometry,
  hintWidth: number,
  viewportWidth: number,
): void {
  const width = geometry.maxWidth ?? hintWidth;

  expect(geometry.left).toBeGreaterThanOrEqual(VIEWPORT_MARGIN);
  expect(geometry.left + width).toBeLessThanOrEqual(viewportWidth - VIEWPORT_MARGIN + 0.001);
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

  it('paints a held hint with nothing hovering or focused, and hands Escape to its owner', async () => {
    const onDismissHeld = vi.fn();
    const user = userEvent.setup();
    render(
      <Tooltip label={STAGE_REASON} held onDismissHeld={onDismissHeld}>
        <button type="button">Open part</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Open part' });

    /* The caller holds it, so the hint is painted before any pointer or focus arrives on the
       trigger — the case a reader who activated the control and then looked away is in. */
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);
    expect(trigger).toHaveAccessibleDescription(STAGE_REASON);

    await user.hover(trigger);
    await user.unhover(trigger);
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);

    await user.tab();
    await user.keyboard('{Escape}');

    /* Escape is reported to the owner, which is the only party that can end the hold: until it does,
       the hint stays painted and focus stays on the trigger it explains. */
    expect(onDismissHeld).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);
    expect(trigger).toHaveFocus();
  });

  it.each([
    {
      placement: undefined,
      asked: 'default',
      resolved: 'top',
      rejected: 'bottom',
    },
    {
      placement: 'bottom' as const,
      asked: 'bottom',
      resolved: 'bottom',
      rejected: 'top',
    },
  ])(
    'resolves the hint to the $resolved side for the $asked placement',
    async ({ placement, resolved, rejected }) => {
      /* A trigger with room on both sides, so only the caller's preference can decide the side. The
         side is asserted both ways round: a component that ignored `placement`, or one that painted
         the hint without measuring, would resolve the other side here. */
      stubMeasuredBoxes(
        { top: 500, left: 100, width: 100, height: 28 },
        { top: 0, left: 0, width: 200, height: 28 },
      );
      const user = userEvent.setup();
      render(
        <Tooltip label={STAGE_REASON} {...(placement === undefined ? {} : { placement })}>
          <button type="button">Open part</button>
        </Tooltip>,
      );

      await user.tab();

      const hint = screen.getByRole('tooltip');
      expect(hint).toHaveAttribute('data-side', resolved);
      expect(hint).not.toHaveAttribute('data-side', rejected);
    },
  );

  it('portals exactly one hint onto the document body and points the trigger at it', async () => {
    const user = userEvent.setup();
    const trigger = renderTooltippedButton();
    const describedBy = trigger.getAttribute('aria-describedby');

    /* Closed: the description is the always-mounted `sr-only` element inside the wrapper, which is
       what keeps the trigger's id from ever dangling (rule B-3). */
    const closed = document.getElementById(describedBy ?? '');
    expect(closed).toHaveTextContent(STAGE_REASON);
    expect(closed).not.toHaveAttribute('role');
    expect(closed?.parentElement).toBe(trigger.parentElement);

    await user.tab();

    /* Open: the same id now resolves to the one `tooltip` in the document, and that element is a
       portal child of `document.body` — outside every scroll container, which is the whole reason it
       can be painted `fixed` without an ancestor clipping it. */
    const open = screen.getByRole('tooltip');
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(document.getElementById(describedBy ?? '')).toBe(open);
    expect(open.parentElement).toBe(document.body);
    expect(open).toHaveTextContent(STAGE_REASON);
    expect(trigger).toHaveAccessibleDescription(STAGE_REASON);
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
       size the wrapper the calling screen positions, and the control keeps its own list. The wrapper
       is the layout box and the box a hint is measured against; it anchors nothing, because the hint
       is portalled and placed from that measurement. */
    expect(wrapper).toHaveClass('inline-flex');
    expect(wrapper).toHaveClass('w-full');
    expect(trigger).not.toHaveClass('w-full');
  });
});

/*
 * The placement rule on its own, with the boxes a browser would report. jsdom lays nothing out, so
 * these are the cases a rendered assertion cannot reach: the two the findings came from — a row
 * action at the right edge of a 1440 px window, whose hint used to end 113.48 px past it, and a
 * navigation entry whose hint used to open over the row above — plus the clamp and the width cap
 * that keep a hint readable when neither side and no width fits.
 */
describe('resolveHintGeometry', () => {
  const desktop = { width: 1440, height: 900 } as const;

  it.each([
    {
      name: 'a trigger with room on both sides',
      trigger: { top: 500, right: 200, bottom: 528, left: 100 },
      hint: { width: 200, height: 28 },
      preferred: 'top' as const,
      side: 'top',
      top: 468,
    },
    {
      name: 'a trigger whose caller prefers the lower side',
      trigger: { top: 400, right: 200, bottom: 428, left: 100 },
      hint: { width: 200, height: 28 },
      preferred: 'bottom' as const,
      side: 'bottom',
      top: 432,
    },
  ])('$name keeps the preferred side and the start alignment', ({ trigger, hint, preferred, side, top }) => {
    const geometry = resolveHintGeometry(trigger, hint, desktop, preferred);

    expect(geometry.side).toBe(side);
    expect(geometry.alignment).toBe('start');
    expect(geometry.left).toBe(trigger.left);
    expect(geometry.top).toBe(top);
    /* `null` rather than a width: the hint fits, so its own `max-w-64` cap is the only one it gets. */
    expect(geometry.maxWidth).toBeNull();
  });

  it.each([
    {
      name: 'a row action in the last column of the queue table',
      trigger: { top: 400, right: 1424, bottom: 428, left: 1304.25 },
      hint: { width: 249.23, height: 28 },
    },
    {
      name: 'a control flush with the right edge of the window',
      trigger: { top: 120, right: 1440, bottom: 148, left: 1380 },
      hint: { width: 120, height: 28 },
    },
  ])('flips $name to end alignment and keeps it inside the window', ({ trigger, hint }) => {
    const geometry = resolveHintGeometry(trigger, hint, desktop, 'top');

    expect(geometry.alignment).toBe('end');
    expectInsideHorizontally(geometry, hint.width, desktop.width);
    /* The measured defect this row comes from: the hint ended past the window's right edge. */
    expect(geometry.left + hint.width).toBeLessThanOrEqual(desktop.width);
  });

  it.each([
    {
      name: 'a trigger at the top of the window',
      viewport: { width: 800, height: 600 },
      trigger: { top: 10, right: 200, bottom: 34, left: 100 },
      hint: { width: 120, height: 28 },
      preferred: 'top' as const,
      side: 'bottom',
      top: 38,
    },
    {
      name: 'a trigger at the bottom of the window',
      viewport: { width: 800, height: 600 },
      trigger: { top: 540, right: 200, bottom: 564, left: 100 },
      hint: { width: 120, height: 28 },
      preferred: 'bottom' as const,
      side: 'top',
      top: 508,
    },
  ])(
    'flips $name to the other side when the preferred one cannot fit',
    ({ viewport, trigger, hint, preferred, side, top }) => {
      const geometry = resolveHintGeometry(trigger, hint, viewport, preferred);

      expect(geometry.side).not.toBe(preferred);
      expect(geometry.side).toBe(side);
      expect(geometry.top).toBe(top);
    },
  );

  it.each([
    {
      name: 'a hint taller than either gap around its trigger',
      trigger: { top: 90, right: 200, bottom: 110, left: 100 },
      hint: { width: 120, height: 160 },
      preferred: 'top' as const,
      side: 'top',
    },
    {
      name: 'a hint taller than the window, on the side with more room',
      trigger: { top: 30, right: 200, bottom: 50, left: 100 },
      hint: { width: 120, height: 300 },
      preferred: 'top' as const,
      side: 'bottom',
    },
  ])('clamps $name inside the window', ({ trigger, hint, preferred, side }) => {
    const viewport = { width: 400, height: 200 };
    const geometry = resolveHintGeometry(trigger, hint, viewport, preferred);

    /* Neither side has room for the hint, so the roomier one wins and the clamp keeps the hint's top
       edge at the window's margin instead of above it: the part that still fits stays readable, which
       is what rule P-8 asks of a reason that cannot be shown in full. */
    expect(geometry.side).toBe(side);
    expect(geometry.top).toBe(VIEWPORT_MARGIN);
  });

  it('caps a hint wider than the window at the window and keeps it inside the margin', () => {
    const narrow = { width: 200, height: 600 };
    const geometry = resolveHintGeometry(
      { top: 300, right: 150, bottom: 328, left: 100 },
      { width: 249.23, height: 28 },
      narrow,
      'top',
    );

    expect(geometry.maxWidth).toBe(narrow.width - VIEWPORT_MARGIN * 2);
    expect(geometry.left).toBe(VIEWPORT_MARGIN);
    expectInsideHorizontally(geometry, 249.23, narrow.width);
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

  it('tells its owner an activation was refused, and never on a control that can act', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onRefusedActivation = vi.fn();

    render(
      <>
        <ActionButton
          disabled
          disabledReason={STAGE_REASON}
          onClick={onClick}
          onRefusedActivation={onRefusedActivation}
        >
          Open part
        </ActionButton>
        <ActionButton onClick={onClick} onRefusedActivation={onRefusedActivation}>
          Approve
        </ActionButton>
      </>,
    );

    /* A control that can act has no refusal to report: its own handler runs, nothing is held and
       nothing is announced, so the owner is not told a gate turned the reader away. */
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onRefusedActivation).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();

    /* The refused activation answers exactly as it did before the callback existed — the held hint
       paints the reason and the live region announces it — and the owner is told once, so a field of
       its own can answer the same attempt. */
    await user.click(screen.getByRole('button', { name: 'Open part' }));

    expect(onRefusedActivation).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);
    expect(screen.getByRole('alert')).toHaveTextContent(STAGE_REASON);
  });

  it('keeps the reason painted after a refused click once the pointer has left', async () => {
    const user = userEvent.setup();
    const button = renderDisabledButton(vi.fn());

    /* Nothing is painted before the attempt: hover and focus alone are the only ways the hint opens
       on its own, and this case makes neither. */
    expect(screen.queryByRole('tooltip')).toBeNull();

    await user.click(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);

    /* The pointer leaves while the control keeps the focus its activation gave it. A hint bound to
       the pointer would be gone here, and so would the only visible reason the reader was given. */
    await user.unhover(button);
    expect(button).toHaveFocus();
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);
  });

  it('announces the refusal from a live region once per attempt, replacing it on the next one', async () => {
    const user = userEvent.setup();
    const button = renderDisabledButton(vi.fn());

    expect(screen.queryByRole('alert')).toBeNull();

    await user.click(button);
    const first = screen.getByRole('alert');
    expect(first).toHaveTextContent(STAGE_REASON);
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    /* The sentence reaches a reader in two places and no more: the held hint that paints it and the
       live region that announces it. A third copy would say it twice. */
    expect(screen.getAllByText(STAGE_REASON)).toHaveLength(2);

    await user.click(button);
    const second = screen.getByRole('alert');

    /* A new node, not rewritten text: a live region whose content is replaced inside the same
       element is not announced again, and a second click must be. */
    expect(second).not.toBe(first);
    expect(second).toHaveTextContent(STAGE_REASON);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it.each([
    { activation: '{Enter}', pressed: 'Enter' },
    { activation: ' ', pressed: 'Space' },
  ])('announces a refusal pressed from the keyboard with $pressed', async ({ activation }) => {
    const user = userEvent.setup();
    const button = renderDisabledButton(vi.fn());

    await user.tab();
    expect(button).toHaveFocus();

    await user.keyboard(activation);

    expect(screen.getByRole('alert')).toHaveTextContent(STAGE_REASON);
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);
  });

  it('releases the held reason on Escape and leaves focus on the control', async () => {
    const user = userEvent.setup();
    const button = renderDisabledButton(vi.fn());

    await user.click(button);
    await user.unhover(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('releases the held reason on blur, which is the reader leaving the control', async () => {
    const user = userEvent.setup();
    const button = renderDisabledButton(vi.fn());

    await user.click(button);
    expect(button).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);

    await user.tab();

    expect(button).not.toHaveFocus();
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('releases the held reason when the gate that refused it is replaced', () => {
    const { rerender } = render(
      <ActionButton disabled disabledReason={STAGE_REASON}>
        Open part
      </ActionButton>,
    );
    const button = screen.getByRole('button', { name: 'Open part' });

    /* A plain click, so neither the pointer nor the focus is what keeps the hint open: only the hold
       can, which is what makes its release observable here. */
    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent(STAGE_REASON);
    expect(screen.getByRole('alert')).toHaveTextContent(STAGE_REASON);

    rerender(
      <ActionButton disabled disabledReason={SECOND_GATE_REASON}>
        Open part
      </ActionButton>,
    );

    /* The reader has moved past the gate that refused them: another gate blocks the control now, so
       the old sentence stops being painted and stops being announced. */
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('releases the held reason once the control can act again', () => {
    const { rerender } = render(
      <ActionButton disabled disabledReason={STAGE_REASON}>
        Open part
      </ActionButton>,
    );
    const button = screen.getByRole('button', { name: 'Open part' });

    fireEvent.click(button);
    expect(screen.getByRole('alert')).toHaveTextContent(STAGE_REASON);

    rerender(<ActionButton onClick={vi.fn()}>Open part</ActionButton>);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open part' })).not.toHaveAttribute('aria-disabled');
  });

  it('calls an enabled control and leaves the live region out of the document', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ActionButton onClick={onClick}>Approve</ActionButton>);
    const button = screen.getByRole('button', { name: 'Approve' });

    expect(screen.queryByRole('alert')).toBeNull();

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('resolves the hint to the side its caller asks for through the disabled branch', async () => {
    /* The navigation strip passes `hintPlacement="bottom"` because its rows stack: a hint opening
       above a lower entry covers the entry above it. Both sides are asserted here, because a control
       that ignored the prop and one that measured nothing would each pass a single-sided check. */
    stubMeasuredBoxes(
      { top: 500, left: 100, width: 100, height: 28 },
      { top: 0, left: 0, width: 200, height: 28 },
    );
    const user = userEvent.setup();
    render(
      <>
        <ActionButton disabled disabledReason={STAGE_REASON}>
          Open part
        </ActionButton>
        <ActionButton disabled disabledReason={STAGE_REASON} hintPlacement="bottom">
          Evidence workspace
        </ActionButton>
      </>,
    );

    await user.tab();
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-side', 'top');

    await user.tab();
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-side', 'bottom');
    expect(screen.getByRole('button', { name: 'Evidence workspace' })).toHaveFocus();
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
    expect(wrapper).toHaveClass('inline-flex');
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
