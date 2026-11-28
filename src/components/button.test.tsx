/**
 * Component suite for `button.tsx`, the single owner of the product's plain `<button>`.
 *
 * The contract this suite proves has three halves. The element half: exactly one `<button>` with the
 * caller's label as its text, its type defaulting to `button` so a control inside a form never submits
 * it, and `submit` honoured where the caller means it. The activation half: a click reports once, and
 * `Enter` and `Space` activate it because the element is the platform's own — no key handler is
 * registered in the component, so the keyboard behaviour a caller relies on cannot be lost. The state
 * half: the state attributes a toggle, a disclosure or a column select owns — `aria-pressed`,
 * `aria-expanded`, `aria-controls`, `aria-describedby`, `aria-disabled`, `disabled` — reach the element
 * exactly as the caller wrote them, `disabled` really does stop activation, and `ref` is forwarded.
 *
 * The appearance is asserted against the two lists `./tooltip` exports, so the case fails if this
 * primitive ever restates or reorders them: a plain button wears the shared control structure plus the
 * secondary appearance and nothing else, a caller's class list replaces that default, and one identical
 * class list serves both themes (AAP §0.18.1), rendered through `data-theme` and cleared afterwards.
 *
 * Fixture copy is plain words: no figure, identifier or magnifying text reaches this tree.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';

import { CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES } from './tooltip';
import { BUTTON_CLASSES, Button } from './button';

/** The label a case renders on the control. */
const BUTTON_LABEL = 'Acknowledge side effect';

/**
 * The one button a rendered control produced.
 *
 * @param container - The rendered container.
 * @returns The single `<button>` element.
 */
function buttonElement(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector('button');

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('Button rendered no button element to read');
  }

  return button;
}

/* The both-themes cases set `data-theme` on `<html>` for the length of one case, so it is cleared. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('Button', () => {
  describe('the element it renders', () => {
    it('renders exactly one button carrying the caller label as its text', () => {
      const { container } = render(<Button>{BUTTON_LABEL}</Button>);
      const button = screen.getByRole('button');

      expect(container.querySelectorAll('button')).toHaveLength(1);
      expect(container.childElementCount).toBe(1);
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveTextContent(BUTTON_LABEL);
    });

    it('defaults to the button type, so a control inside a form never submits it', () => {
      render(<Button>{BUTTON_LABEL}</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('honours the submit type when the caller states it', () => {
      render(<Button type="submit">{BUTTON_LABEL}</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });

  describe('the activation contract', () => {
    it('reports one activation as one call', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>{BUTTON_LABEL}</Button>);

      await user.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    /* A button is operated by Enter and by Space: both are the platform's, not the component's. */
    it.each([
      { keyPress: '{Enter}', keyName: 'Enter' },
      // user-event addresses the space bar by its physical code: its keyboard map names no `Space` key.
      { keyPress: '[Space]', keyName: 'Space' },
    ])('is activated by $keyName from the keyboard', async ({ keyPress }) => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>{BUTTON_LABEL}</Button>);

      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();

      await user.keyboard(keyPress);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('reports nothing when the caller disabled the control', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button disabled onClick={onClick}>
          {BUTTON_LABEL}
        </Button>,
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      await user.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('the props it forwards', () => {
    /* A toggle is pressed and not pressed: two states that differ only in their value. */
    it.each([
      { pressed: true, attribute: 'true', reading: 'pressed' },
      { pressed: false, attribute: 'false', reading: 'not pressed' },
    ])('forwards aria-pressed to a toggle that is $reading', ({ pressed, attribute }) => {
      render(<Button aria-pressed={pressed}>{BUTTON_LABEL}</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', attribute);
    });

    it('forwards the state and description attributes a disclosure owns', () => {
      render(
        <Button
          aria-expanded
          aria-controls="simulation-popover"
          aria-describedby="simulation-hint"
          aria-label={BUTTON_LABEL}
          aria-haspopup="dialog"
          aria-disabled={false}
          id="simulation-trigger"
          name="simulation"
          data-control="simulation"
        >
          {BUTTON_LABEL}
        </Button>,
      );

      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', 'simulation-popover');
      expect(button).toHaveAttribute('aria-describedby', 'simulation-hint');
      expect(button).toHaveAttribute('aria-label', BUTTON_LABEL);
      expect(button).toHaveAttribute('aria-haspopup', 'dialog');
      expect(button).toHaveAttribute('aria-disabled', 'false');
      expect(button).toHaveAttribute('id', 'simulation-trigger');
      expect(button).toHaveAttribute('name', 'simulation');
      expect(button).toHaveAttribute('data-control', 'simulation');
    });

    it('forwards the element to an object ref', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Button ref={ref}>{BUTTON_LABEL}</Button>);

      expect(ref.current).toStrictEqual(screen.getByRole('button'));
    });

    it('forwards the element to a callback ref', () => {
      const receive = vi.fn();
      render(<Button ref={receive}>{BUTTON_LABEL}</Button>);

      expect(receive).toHaveBeenCalledWith(screen.getByRole('button'));
    });
  });

  describe('the class list', () => {
    it('composes the two lists its owner exports rather than restating them', () => {
      expect(BUTTON_CLASSES).toBe(`${CONTROL_STRUCTURE_CLASSES} ${SECONDARY_CONTROL_CLASSES}`);
    });

    it('wears the shared structure and the secondary appearance when the caller passes none', () => {
      render(<Button>{BUTTON_LABEL}</Button>);
      const button = screen.getByRole('button');

      for (const utility of CONTROL_STRUCTURE_CLASSES.split(' ')) {
        expect(button.classList).toContain(utility);
      }
      for (const utility of SECONDARY_CONTROL_CLASSES.split(' ')) {
        expect(button.classList).toContain(utility);
      }
      expect(button.getAttribute('class')).toBe(BUTTON_CLASSES);
    });

    it('replaces the default with the caller class list rather than merging it', () => {
      render(<Button className="w-full">{BUTTON_LABEL}</Button>);

      const button = screen.getByRole('button');
      expect(button.getAttribute('class')).toBe('w-full');
      expect(button.classList).not.toContain('border-control-boundary');
    });

    it('selects no palette value, arbitrary value or shadow', () => {
      render(<Button>{BUTTON_LABEL}</Button>);
      const classes = screen.getByRole('button').getAttribute('class') ?? '';

      expect(classes).not.toMatch(/#[0-9a-f]{3,8}|\brgba?\(/i);
      expect(classes).not.toContain('[');
      expect(classes.split(' ').filter((utility) => utility.includes('shadow'))).toStrictEqual([]);
    });
  });

  describe('keyboard reachability', () => {
    it('is reachable by Tab and carries the control focus ring', async () => {
      const user = userEvent.setup();
      render(<Button>{BUTTON_LABEL}</Button>);

      await user.tab();

      expect(screen.getByRole('button')).toHaveFocus();
      expect(CONTROL_STRUCTURE_CLASSES).toContain('focus-visible:outline-2');
      expect(CONTROL_STRUCTURE_CLASSES).toContain('focus-visible:outline-focus-ring');
      expect(CONTROL_STRUCTURE_CLASSES).toContain('min-h-6');
    });
  });

  describe('both themes', () => {
    for (const theme of ['command', 'paper'] as const) {
      it(`renders the same element and class list under the ${theme} theme`, () => {
        document.documentElement.setAttribute('data-theme', theme);
        render(
          <Button aria-pressed={false} aria-describedby="simulation-hint">
            {BUTTON_LABEL}
          </Button>,
        );

        const button = screen.getByRole('button');

        expect(button.tagName).toBe('BUTTON');
        expect(button).toHaveAttribute('aria-pressed', 'false');
        expect(button).toHaveAttribute('aria-describedby', 'simulation-hint');
        expect(button).toHaveTextContent(BUTTON_LABEL);
        expect(button.getAttribute('class')).toBe(BUTTON_CLASSES);
        expect(button.hasAttribute('style')).toBe(false);
      });
    }

    it('hands both themes one identical class list, so the colour is the theme role', () => {
      document.documentElement.setAttribute('data-theme', 'command');
      const command = render(<Button>{BUTTON_LABEL}</Button>);
      const inCommand = Array.from(buttonElement(command.container).classList);

      document.documentElement.setAttribute('data-theme', 'paper');
      const paper = render(<Button>{BUTTON_LABEL}</Button>);
      const inPaper = Array.from(buttonElement(paper.container).classList);

      expect(inCommand).toStrictEqual(inPaper);
    });
  });
});
