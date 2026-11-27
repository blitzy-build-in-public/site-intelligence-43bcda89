/**
 * Component suite for `text-area-field.tsx`, the single owner of the product's `<textarea>`.
 *
 * The contract this suite proves is the multi-line field's own: exactly one `<textarea>` with no
 * wrapper, the caller's text rendered as the field's content across lines, and the caller's edits
 * reported once per edit as the element's own text — a newline included, which is what separates this
 * primitive from the single-line field and what a dismissal reason or an approval comment needs. The
 * class list is the shared field control shape plus the multi-line part, so the case that asserts the
 * default list asserts both halves; a caller's list replaces it rather than merging with it. Every
 * `aria-*` attribute, native attribute, handler and `ref` reaches the element unchanged, the field is
 * keyboard reachable and wears the focus ring utilities, and both themes are rendered through
 * `data-theme` as AAP §0.18.1 asks.
 *
 * Fixture text is plain words: no figure, identifier or magnifying text reaches this tree.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import type { ReactElement } from 'react';

import { FIELD_CONTROL_CLASSES } from './text-field';
import { TEXT_AREA_FIELD_CLASSES, TextAreaField } from './text-area-field';

/** One line of plain-word text, and the two-line text a note holds. */
const NOTE = 'supplier confirmed the ship date';
const TWO_LINE_NOTE = 'check the second line\nbefore approving';

/**
 * The one textarea a rendered field produced.
 *
 * @param container - The rendered container.
 * @returns The single `<textarea>` element.
 */
function textAreaElement(container: HTMLElement): HTMLTextAreaElement {
  const textArea = container.querySelector('textarea');

  if (!(textArea instanceof HTMLTextAreaElement)) {
    throw new Error('TextAreaField rendered no textarea element to read');
  }

  return textArea;
}

/**
 * A caller that holds the field's text, so keystrokes accumulate as they do in a screen.
 *
 * @param props - The spy the harness forwards each report to.
 * @returns A controlled text area.
 */
function ControlledNote({ report }: { readonly report: (value: string) => void }): ReactElement {
  const [value, setValue] = useState('');

  return (
    <TextAreaField
      value={value}
      aria-label="Dismissal reason"
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

describe('TextAreaField', () => {
  describe('the element it renders', () => {
    it('renders exactly one textarea and nothing beside it', () => {
      const { container } = render(<TextAreaField value="" onChange={vi.fn()} />);

      expect(container.querySelectorAll('textarea')).toHaveLength(1);
      expect(container.childElementCount).toBe(1);
      expect(textAreaElement(container).tagName).toBe('TEXTAREA');
      expect(screen.getByRole('textbox')).toStrictEqual(textAreaElement(container));
    });

    it('renders the value it is handed as the field content', () => {
      const { container } = render(<TextAreaField value={NOTE} onChange={vi.fn()} />);

      expect(textAreaElement(container).value).toBe(NOTE);
    });

    it('keeps a multi-line value across its lines', () => {
      const { container } = render(<TextAreaField value={TWO_LINE_NOTE} onChange={vi.fn()} />);
      const textArea = textAreaElement(container);

      expect(textArea.value).toBe(TWO_LINE_NOTE);
      expect(textArea.value.split('\n')).toHaveLength(2);
    });

    it('renders an empty value as an empty field', () => {
      const { container } = render(<TextAreaField value="" onChange={vi.fn()} />);

      expect(textAreaElement(container).value).toBe('');
    });
  });

  describe('the change contract', () => {
    it('reports one edit as one call carrying the field text', async () => {
      const user = userEvent.setup();
      const report = vi.fn();
      render(<ControlledNote report={report} />);

      await user.type(screen.getByRole('textbox'), 'a');

      expect(report).toHaveBeenCalledTimes(1);
      expect(report).toHaveBeenCalledWith('a');
      expect(screen.getByRole('textbox')).toHaveValue('a');
    });

    it('reports the accumulating text once per keystroke', async () => {
      const user = userEvent.setup();
      const report = vi.fn();
      render(<ControlledNote report={report} />);

      await user.type(screen.getByRole('textbox'), 'note');

      expect(report).toHaveBeenCalledTimes(4);
      expect(report).toHaveBeenNthCalledWith(1, 'n');
      expect(report).toHaveBeenNthCalledWith(4, 'note');
    });

    it('reports a newline when Enter is pressed, because the field is multi-line', async () => {
      const user = userEvent.setup();
      const report = vi.fn();
      render(<ControlledNote report={report} />);

      await user.type(screen.getByRole('textbox'), 'a{Enter}b');

      expect(report).toHaveBeenNthCalledWith(2, 'a\n');
      expect(report).toHaveBeenNthCalledWith(3, 'a\nb');
    });

    it('reports the element text and keeps the caller text when the report is ignored', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<TextAreaField value="" onChange={onChange} />);

      await user.type(textAreaElement(container), 'a');

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('a');
      /* The rendered text is still the caller's string, so the field is never self-driven. */
      expect(textAreaElement(container).value).toBe('');
    });
  });

  describe('the props it forwards', () => {
    it('forwards the native attributes a note field needs', () => {
      const { container } = render(
        <TextAreaField
          value=""
          id="note-field"
          name="note"
          rows={4}
          maxLength={5}
          placeholder="State the reason"
          required
          readOnly
          disabled
          data-field="note"
          onChange={vi.fn()}
        />,
      );

      const textArea = textAreaElement(container);

      expect(textArea).toHaveAttribute('id', 'note-field');
      expect(textArea).toHaveAttribute('name', 'note');
      expect(textArea).toHaveAttribute('rows', '4');
      expect(textArea).toHaveAttribute('maxlength', '5');
      expect(textArea).toHaveAttribute('placeholder', 'State the reason');
      expect(textArea).toBeRequired();
      expect(textArea).toHaveAttribute('readonly');
      expect(textArea).toBeDisabled();
      expect(textArea).toHaveAttribute('data-field', 'note');
    });

    it('forwards every aria attribute the caller passes', () => {
      const { container } = render(
        <TextAreaField
          value=""
          aria-labelledby="note-label"
          aria-describedby="note-hint"
          aria-invalid
          aria-required
          onChange={vi.fn()}
        />,
      );

      const textArea = textAreaElement(container);

      expect(textArea).toHaveAttribute('aria-labelledby', 'note-label');
      expect(textArea).toHaveAttribute('aria-describedby', 'note-hint');
      expect(textArea).toHaveAttribute('aria-invalid', 'true');
      expect(textArea).toHaveAttribute('aria-required', 'true');
    });

    it('forwards the blur handler a field that validates on blur needs', async () => {
      const user = userEvent.setup();
      const onBlur = vi.fn();
      render(
        <>
          <TextAreaField value="" aria-label="Dismissal reason" onBlur={onBlur} onChange={vi.fn()} />
          <button type="button">Elsewhere</button>
        </>,
      );

      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();
      await user.tab();

      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('forwards the element to an object ref', () => {
      const ref = createRef<HTMLTextAreaElement>();
      const { container } = render(<TextAreaField ref={ref} value="" onChange={vi.fn()} />);

      expect(ref.current).toStrictEqual(textAreaElement(container));
    });

    it('forwards the element to a callback ref', () => {
      const receive = vi.fn();
      const { container } = render(<TextAreaField ref={receive} value="" onChange={vi.fn()} />);

      expect(receive).toHaveBeenCalledWith(textAreaElement(container));
    });
  });

  describe('the class list', () => {
    it('wears the shared field shape plus the multi-line part when the caller passes none', () => {
      const { container } = render(<TextAreaField value="" onChange={vi.fn()} />);
      const textArea = textAreaElement(container);

      for (const utility of FIELD_CONTROL_CLASSES.split(' ')) {
        expect(textArea.classList).toContain(utility);
      }
      for (const utility of ['min-h-24', 'w-full', 'resize-y']) {
        expect(textArea.classList).toContain(utility);
      }
      expect(textArea.getAttribute('class')).toBe(TEXT_AREA_FIELD_CLASSES);
    });

    it('replaces the default with the caller class list rather than merging it', () => {
      const { container } = render(
        <TextAreaField value="" className="resize-none" onChange={vi.fn()} />,
      );
      const textArea = textAreaElement(container);

      expect(textArea.getAttribute('class')).toBe('resize-none');
      expect(textArea.classList).not.toContain('border-control-boundary');
    });

    it('selects no palette value, arbitrary value or shadow', () => {
      const { container } = render(<TextAreaField value="" onChange={vi.fn()} />);
      const classes = textAreaElement(container).getAttribute('class') ?? '';

      expect(classes).not.toMatch(/#[0-9a-f]{3,8}|\brgba?\(/i);
      expect(classes).not.toContain('[');
      expect(classes.split(' ').filter((utility) => utility.includes('shadow'))).toStrictEqual([]);
    });
  });

  describe('keyboard', () => {
    it('is reachable by Tab and carries the focus ring utilities', async () => {
      const user = userEvent.setup();
      const { container } = render(<TextAreaField value="" onChange={vi.fn()} />);

      await user.tab();

      expect(textAreaElement(container)).toHaveFocus();
      expect(TEXT_AREA_FIELD_CLASSES).toContain('focus-visible:outline-2');
      expect(TEXT_AREA_FIELD_CLASSES).toContain('focus-visible:outline-focus-ring');
      expect(TEXT_AREA_FIELD_CLASSES).toContain('motion-safe:transition-colors');
    });
  });

  describe('both themes', () => {
    for (const theme of ['command', 'paper'] as const) {
      it(`renders the same element and class list under the ${theme} theme`, () => {
        document.documentElement.setAttribute('data-theme', theme);
        const { container } = render(
          <TextAreaField value={TWO_LINE_NOTE} aria-describedby="note-hint" onChange={vi.fn()} />,
        );
        const textArea = textAreaElement(container);

        expect(textArea.tagName).toBe('TEXTAREA');
        expect(textArea).toHaveAttribute('aria-describedby', 'note-hint');
        expect(textArea.value).toBe(TWO_LINE_NOTE);
        expect(textArea.getAttribute('class')).toBe(TEXT_AREA_FIELD_CLASSES);
        expect(textArea.hasAttribute('style')).toBe(false);
      });
    }

    it('hands both themes one identical class list, so the colour is the theme role', () => {
      document.documentElement.setAttribute('data-theme', 'command');
      const command = render(<TextAreaField value="" onChange={vi.fn()} />);
      const inCommand = Array.from(textAreaElement(command.container).classList);

      document.documentElement.setAttribute('data-theme', 'paper');
      const paper = render(<TextAreaField value="" onChange={vi.fn()} />);
      const inPaper = Array.from(textAreaElement(paper.container).classList);

      expect(inCommand).toStrictEqual(inPaper);
    });
  });
});
