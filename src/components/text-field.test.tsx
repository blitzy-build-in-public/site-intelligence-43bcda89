/**
 * Component suite for `text-field.tsx`, the single owner of the product's `<input>`.
 *
 * The module's contract has four halves, and a case below fails if any of them is broken. The element
 * half: exactly one `<input>`, with no wrapper beside it, its type defaulting to `text` and each of
 * the seven offered types rendered as asked. The change half: the field is controlled — it renders the
 * caller's string, reports the element's own value one call per edit, and cannot be edited by a caller
 * that ignores the report. The forwarding half: every `aria-*` attribute, native attribute, handler
 * and `ref` the caller passes arrives at the element unchanged, because a swallowed prop would send
 * the call site back to a raw element and reopen the divergence this primitive closes. The appearance
 * half: the default class list is worn in full when the caller passes none, a caller's list replaces
 * it rather than merging with it, and no palette value, arbitrary value or shadow is selected.
 *
 * Both themes are rendered as AAP §0.18.1 asks, by setting `data-theme` on `<html>` for the length of
 * one case and clearing it afterwards: the component names no colour of its own, so one class list
 * must serve Command and Paper and let the role tokens resolve per theme.
 *
 * Fixture values are plain words rather than figures: rule P-6 keeps a typed figure out of this tree,
 * and nothing here needs a number to prove the contract.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import type { ReactElement } from 'react';

import { FIELD_CONTROL_CLASSES, TextField } from './text-field';
import type { TextFieldType } from './text-field';

/** The input types the component offers, in the order its union states them. */
const TEXT_FIELD_TYPES: readonly TextFieldType[] = [
  'text',
  'number',
  'date',
  'search',
  'email',
  'tel',
  'url',
];

/** A plain-word value, so a case never carries a figure or a record identifier. */
const FIELD_VALUE = 'queue note';

/**
 * The one input a rendered field produced.
 *
 * Found structurally rather than by role, because several of the offered types have a role of their
 * own (`search` is a searchbox, `number` a spinbutton) and the element is what the contract is about.
 *
 * @param container - The rendered container.
 * @returns The single `<input>` element.
 */
function inputElement(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input');

  if (!(input instanceof HTMLInputElement)) {
    throw new Error('TextField rendered no input element to read');
  }

  return input;
}

/**
 * A caller that holds the field's value, so keystrokes accumulate as they do in a screen.
 *
 * The report is handed the value the primitive reported, which is what a screen does with it; the
 * component stays controlled because the state it renders is the state the last report set.
 *
 * @param props - The spy the harness forwards each report to.
 * @returns A controlled field.
 */
function ControlledField({ report }: { readonly report: (value: string) => void }): ReactElement {
  const [value, setValue] = useState('');

  return (
    <TextField
      value={value}
      aria-label="Queue note"
      onChange={(next) => {
        setValue(next);
        report(next);
      }}
    />
  );
}

/* The both-themes cases set `data-theme` on `<html>` for the length of one case, so it is cleared. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('TextField', () => {
  describe('the element it renders', () => {
    it('renders exactly one input and nothing beside it', () => {
      const { container } = render(<TextField value="" onChange={vi.fn()} />);

      expect(container.querySelectorAll('input')).toHaveLength(1);
      expect(container.childElementCount).toBe(1);
      expect(screen.getByRole('textbox')).toStrictEqual(inputElement(container));
    });

    it('defaults to the text type when the caller states none', () => {
      const { container } = render(<TextField value="" onChange={vi.fn()} />);

      expect(inputElement(container)).toHaveAttribute('type', 'text');
    });

    /* Types that differ only in their attribute are one parameterised case. */
    it.each(TEXT_FIELD_TYPES)('renders the %s type the caller asks for', (type) => {
      const { container } = render(<TextField value="" type={type} onChange={vi.fn()} />);

      expect(inputElement(container)).toHaveAttribute('type', type);
    });

    it('renders the value it is handed as the field text', () => {
      const { container } = render(<TextField value={FIELD_VALUE} onChange={vi.fn()} />);

      expect(inputElement(container).value).toBe(FIELD_VALUE);
    });

    it('renders an empty value as an empty field', () => {
      const { container } = render(<TextField value="" onChange={vi.fn()} />);

      expect(inputElement(container).value).toBe('');
    });
  });

  describe('the change contract', () => {
    it('reports one edit as one call carrying the field value', async () => {
      const user = userEvent.setup();
      const report = vi.fn();
      render(<ControlledField report={report} />);

      await user.type(screen.getByRole('textbox'), 'a');

      expect(report).toHaveBeenCalledTimes(1);
      expect(report).toHaveBeenCalledWith('a');
      /* The report round-trips: the field renders what the caller stored from the call it was given. */
      expect(screen.getByRole('textbox')).toHaveValue('a');
    });

    it('reports the accumulating value once per keystroke', async () => {
      const user = userEvent.setup();
      const report = vi.fn();
      render(<ControlledField report={report} />);

      await user.type(screen.getByRole('textbox'), 'note');

      expect(report).toHaveBeenCalledTimes(4);
      expect(report).toHaveBeenNthCalledWith(1, 'n');
      expect(report).toHaveBeenNthCalledWith(2, 'no');
      expect(report).toHaveBeenNthCalledWith(3, 'not');
      expect(report).toHaveBeenNthCalledWith(4, 'note');
    });

    it('reports the element value and keeps the caller value when the report is ignored', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<TextField value="" onChange={onChange} />);

      await user.type(inputElement(container), 'a');

      /* The element held `a` at the moment of the edit, which is what the primitive reports... */
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('a');
      /* ...and the rendered text is still the caller's string, so the field is never self-driven. */
      expect(inputElement(container).value).toBe('');
    });
  });

  describe('the props it forwards', () => {
    it('forwards every aria attribute and the role the caller passes', () => {
      const { container } = render(
        <TextField
          value=""
          role="combobox"
          aria-label="Search the workspace"
          aria-describedby="field-hint"
          aria-labelledby="field-label"
          aria-invalid
          aria-required
          aria-expanded={false}
          aria-controls="field-popover"
          aria-autocomplete="list"
          aria-activedescendant="field-option"
          onChange={vi.fn()}
        />,
      );

      const input = inputElement(container);

      expect(input).toHaveAttribute('role', 'combobox');
      expect(input).toHaveAttribute('aria-label', 'Search the workspace');
      expect(input).toHaveAttribute('aria-describedby', 'field-hint');
      expect(input).toHaveAttribute('aria-labelledby', 'field-label');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-controls', 'field-popover');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('aria-activedescendant', 'field-option');
    });

    it('forwards the native attributes a call site needs', () => {
      const { container } = render(
        <TextField
          value=""
          id="field-control"
          name="term"
          placeholder="Filter by supplier"
          autoComplete="off"
          spellCheck={false}
          disabled
          readOnly
          data-shortcut="search"
          onChange={vi.fn()}
        />,
      );

      const input = inputElement(container);

      expect(input).toHaveAttribute('id', 'field-control');
      expect(input).toHaveAttribute('name', 'term');
      expect(input).toHaveAttribute('placeholder', 'Filter by supplier');
      expect(input).toHaveAttribute('autocomplete', 'off');
      expect(input).toHaveAttribute('spellcheck', 'false');
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('readonly');
      expect(input).toHaveAttribute('data-shortcut', 'search');
    });

    it('forwards the numeric bounds a lever needs', () => {
      const { container } = render(
        <TextField
          value="1"
          type="number"
          min="1"
          max="9"
          step="2"
          onChange={vi.fn()}
        />,
      );

      const input = inputElement(container);

      expect(input).toHaveAttribute('min', '1');
      expect(input).toHaveAttribute('max', '9');
      expect(input).toHaveAttribute('step', '2');
    });

    it('forwards the key handler a commit-on-Enter field needs', async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn();
      const { container } = render(
        <TextField value="" onKeyDown={onKeyDown} onChange={vi.fn()} />,
      );

      await user.type(inputElement(container), '{Enter}');

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onKeyDown.mock.calls[0]?.[0].key).toBe('Enter');
    });

    it('forwards the blur handler a commit-on-blur field needs', async () => {
      const user = userEvent.setup();
      const onBlur = vi.fn();
      render(
        <>
          <TextField value="" aria-label="Queue note" onBlur={onBlur} onChange={vi.fn()} />
          <button type="button">Elsewhere</button>
        </>,
      );

      await user.click(screen.getByRole('textbox'));
      await user.tab();

      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('forwards the element to an object ref', () => {
      const ref = createRef<HTMLInputElement>();
      const { container } = render(<TextField ref={ref} value="" onChange={vi.fn()} />);

      expect(ref.current).toStrictEqual(inputElement(container));
    });

    it('forwards the element to a callback ref', () => {
      const receive = vi.fn();
      const { container } = render(<TextField ref={receive} value="" onChange={vi.fn()} />);

      expect(receive).toHaveBeenCalledWith(inputElement(container));
    });
  });

  describe('the class list', () => {
    it('wears the field control class list when the caller passes none', () => {
      const { container } = render(<TextField value="" onChange={vi.fn()} />);
      const input = inputElement(container);

      for (const utility of FIELD_CONTROL_CLASSES.split(' ')) {
        expect(input.classList).toContain(utility);
      }
      expect(input.getAttribute('class')).toBe(FIELD_CONTROL_CLASSES);
    });

    it('replaces the default with the caller class list rather than merging it', () => {
      const { container } = render(
        <TextField value="" className="w-full" onChange={vi.fn()} />,
      );
      const input = inputElement(container);

      expect(input.getAttribute('class')).toBe('w-full');
      expect(input.classList).not.toContain('border-control-boundary');
    });

    it('selects no palette value, arbitrary value or shadow', () => {
      const { container } = render(<TextField value="" onChange={vi.fn()} />);
      const classes = inputElement(container).getAttribute('class') ?? '';

      expect(classes).not.toMatch(/#[0-9a-f]{3,8}|\brgba?\(/i);
      expect(classes).not.toContain('[');
      expect(classes.split(' ').filter((utility) => utility.includes('shadow'))).toStrictEqual([]);
    });
  });

  describe('keyboard', () => {
    it('is reachable by Tab and carries the focus ring utilities', async () => {
      const user = userEvent.setup();
      const { container } = render(<TextField value="" onChange={vi.fn()} />);

      await user.tab();

      expect(inputElement(container)).toHaveFocus();
      expect(FIELD_CONTROL_CLASSES).toContain('focus-visible:outline-2');
      expect(FIELD_CONTROL_CLASSES).toContain('focus-visible:outline-focus-ring');
      expect(FIELD_CONTROL_CLASSES).toContain('motion-safe:transition-colors');
    });
  });

  describe('both themes', () => {
    for (const theme of ['command', 'paper'] as const) {
      it(`renders the same element and class list under the ${theme} theme`, () => {
        document.documentElement.setAttribute('data-theme', theme);
        const { container } = render(
          <TextField value={FIELD_VALUE} aria-describedby="field-hint" onChange={vi.fn()} />,
        );
        const input = inputElement(container);

        expect(input.tagName).toBe('INPUT');
        expect(input).toHaveAttribute('aria-describedby', 'field-hint');
        expect(input.getAttribute('class')).toBe(FIELD_CONTROL_CLASSES);
        expect(input.hasAttribute('style')).toBe(false);
      });
    }

    it('hands both themes one identical class list, so the colour is the theme role', () => {
      document.documentElement.setAttribute('data-theme', 'command');
      const command = render(<TextField value="" onChange={vi.fn()} />);
      const inCommand = Array.from(inputElement(command.container).classList);

      document.documentElement.setAttribute('data-theme', 'paper');
      const paper = render(<TextField value="" onChange={vi.fn()} />);
      const inPaper = Array.from(inputElement(paper.container).classList);

      expect(inCommand).toStrictEqual(inPaper);
    });
  });
});
