/**
 * Component suite for `select-field.tsx`, the single owner of the product's `<select>`.
 *
 * The contract this suite proves is the list itself and the value it reports. The list is the
 * caller's, exactly: one option per entry, in the caller's order, with the caller's value and label,
 * nothing prepended and nothing dropped — so an "all plants" entry or a single filler entry reaches
 * the screen because the screen supplied it, and an empty array renders an empty list rather than an
 * invented entry. The value is the caller's string, rendered as the chosen entry, and a change is
 * reported once as the chosen entry's value rather than as the DOM event.
 *
 * The remaining cases cover the shape a call site depends on: one `<select>` with no wrapper, the
 * field control class list worn in full when the caller passes none and replaced when the caller
 * passes one, the optional option class list reaching every entry, every `aria-*` attribute and
 * `ref` forwarded unchanged, keyboard reachability, and both themes rendered through `data-theme`
 * as AAP §0.18.1 asks.
 *
 * Fixture entries are plain words: no figure, identifier or magnifying text reaches this tree.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';

import { FIELD_CONTROL_CLASSES } from './text-field';
import { SelectField } from './select-field';
import type { SelectOption } from './select-field';

/** The list a case supplies, three plain-word entries in a meaningful order. */
const OPTIONS: readonly SelectOption[] = [
  { value: 'alpha', label: 'Alpha plant' },
  { value: 'beta', label: 'Beta plant' },
  { value: 'gamma', label: 'Gamma plant' },
];

/**
 * The one select a rendered field produced.
 *
 * @param container - The rendered container.
 * @returns The single `<select>` element.
 */
function selectElement(container: HTMLElement): HTMLSelectElement {
  const select = container.querySelector('select');

  if (!(select instanceof HTMLSelectElement)) {
    throw new Error('SelectField rendered no select element to read');
  }

  return select;
}

/** The values of a select's options, in the order the element holds them. */
function optionValues(select: HTMLSelectElement): readonly string[] {
  return Array.from(select.options).map((option) => option.value);
}

/** The visible text of a select's options, in the order the element holds them. */
function optionLabels(select: HTMLSelectElement): readonly string[] {
  return Array.from(select.options).map((option) => option.textContent ?? '');
}

/* The both-themes cases set `data-theme` on `<html>` for the length of one case, so it is cleared. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('SelectField', () => {
  describe('the element it renders', () => {
    it('renders exactly one select and nothing beside it', () => {
      const { container } = render(
        <SelectField value="alpha" options={OPTIONS} onChange={vi.fn()} />,
      );

      expect(container.querySelectorAll('select')).toHaveLength(1);
      expect(container.childElementCount).toBe(1);
      expect(screen.getByRole('combobox')).toStrictEqual(selectElement(container));
    });

    it('renders the controlled value as the chosen entry', () => {
      const { container } = render(
        <SelectField value="beta" options={OPTIONS} onChange={vi.fn()} />,
      );

      expect(selectElement(container).value).toBe('beta');
    });

  });

  describe('the options it renders', () => {
    it('renders one option per entry, in the caller order, with the caller values and labels', () => {
      const { container } = render(
        <SelectField value="alpha" options={OPTIONS} onChange={vi.fn()} />,
      );
      const select = selectElement(container);

      expect(select.options).toHaveLength(OPTIONS.length);
      expect(optionValues(select)).toStrictEqual(OPTIONS.map((option) => option.value));
      expect(optionLabels(select)).toStrictEqual(OPTIONS.map((option) => option.label));
    });

    it('prepends no entry of its own, so the first option is the caller first option', () => {
      const { container } = render(
        <SelectField value="alpha" options={OPTIONS} onChange={vi.fn()} />,
      );
      const [first] = Array.from(selectElement(container).options);

      expect(first?.textContent).toBe(OPTIONS[0]?.label);
      expect(first?.value).toBe(OPTIONS[0]?.value);
    });

    it('renders an empty list when the caller supplies no options', () => {
      const { container } = render(<SelectField value="" options={[]} onChange={vi.fn()} />);
      const select = selectElement(container);

      expect(select.options).toHaveLength(0);
      expect(select.querySelectorAll('option')).toHaveLength(0);
    });

    it('carries the option class list on every entry when the caller supplies one', () => {
      const { container } = render(
        <SelectField
          value="alpha"
          options={OPTIONS}
          optionClassName="bg-surface-1 text-text-primary"
          onChange={vi.fn()}
        />,
      );

      for (const option of Array.from(selectElement(container).options)) {
        expect(option.getAttribute('class')).toBe('bg-surface-1 text-text-primary');
      }
    });

    it('adds no option class of its own when the caller supplies none', () => {
      const { container } = render(
        <SelectField value="alpha" options={OPTIONS} onChange={vi.fn()} />,
      );

      for (const option of Array.from(selectElement(container).options)) {
        expect(option.hasAttribute('class')).toBe(false);
      }
    });
  });

  describe('the change contract', () => {
    it('reports one change as one call carrying the chosen value', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(
        <SelectField value="beta" options={OPTIONS} onChange={onChange} />,
      );

      await user.selectOptions(selectElement(container), 'alpha');

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('alpha');
    });

    it('reports the entry the user chose rather than the value the caller held', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(
        <SelectField value="alpha" options={OPTIONS} onChange={onChange} />,
      );

      await user.selectOptions(selectElement(container), 'gamma');

      expect(onChange).toHaveBeenCalledWith('gamma');
      expect(onChange).not.toHaveBeenCalledWith('alpha');
    });
  });

  describe('the props it forwards', () => {
    it('forwards every aria attribute and the native attributes a filter needs', () => {
      const { container } = render(
        <SelectField
          value="alpha"
          options={OPTIONS}
          id="plant-filter"
          name="plant"
          aria-label="Plant"
          aria-describedby="plant-hint"
          aria-labelledby="plant-label"
          aria-invalid
          aria-required
          aria-disabled
          disabled
          data-filter="plant"
          onChange={vi.fn()}
        />,
      );

      const select = selectElement(container);

      expect(select).toHaveAttribute('id', 'plant-filter');
      expect(select).toHaveAttribute('name', 'plant');
      expect(select).toHaveAttribute('aria-label', 'Plant');
      expect(select).toHaveAttribute('aria-describedby', 'plant-hint');
      expect(select).toHaveAttribute('aria-labelledby', 'plant-label');
      expect(select).toHaveAttribute('aria-invalid', 'true');
      expect(select).toHaveAttribute('aria-required', 'true');
      expect(select).toHaveAttribute('aria-disabled', 'true');
      expect(select).toBeDisabled();
      expect(select).toHaveAttribute('data-filter', 'plant');
    });

    it('forwards the blur handler a filter that commits on blur needs', async () => {
      const user = userEvent.setup();
      const onBlur = vi.fn();
      render(
        <>
          <SelectField
            value="alpha"
            options={OPTIONS}
            aria-label="Plant"
            onBlur={onBlur}
            onChange={vi.fn()}
          />
          <button type="button">Elsewhere</button>
        </>,
      );

      await user.tab();
      expect(screen.getByRole('combobox')).toHaveFocus();
      await user.tab();

      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('forwards the element to an object ref', () => {
      const ref = createRef<HTMLSelectElement>();
      const { container } = render(
        <SelectField ref={ref} value="alpha" options={OPTIONS} onChange={vi.fn()} />,
      );

      expect(ref.current).toStrictEqual(selectElement(container));
    });

    it('forwards the element to a callback ref', () => {
      const receive = vi.fn();
      const { container } = render(
        <SelectField ref={receive} value="alpha" options={OPTIONS} onChange={vi.fn()} />,
      );

      expect(receive).toHaveBeenCalledWith(selectElement(container));
    });
  });

  describe('the class list', () => {
    it('wears the field control class list when the caller passes none', () => {
      const { container } = render(
        <SelectField value="alpha" options={OPTIONS} onChange={vi.fn()} />,
      );
      const select = selectElement(container);

      for (const utility of FIELD_CONTROL_CLASSES.split(' ')) {
        expect(select.classList).toContain(utility);
      }
      expect(select.getAttribute('class')).toBe(FIELD_CONTROL_CLASSES);
    });

    it('replaces the default with the caller class list rather than merging it', () => {
      const { container } = render(
        <SelectField
          value="alpha"
          options={OPTIONS}
          className="min-w-0"
          onChange={vi.fn()}
        />,
      );
      const select = selectElement(container);

      expect(select.getAttribute('class')).toBe('min-w-0');
      expect(select.classList).not.toContain('border-control-boundary');
    });

    it('selects no palette value, arbitrary value or shadow', () => {
      const { container } = render(
        <SelectField value="alpha" options={OPTIONS} onChange={vi.fn()} />,
      );
      const classes = selectElement(container).getAttribute('class') ?? '';

      expect(classes).not.toMatch(/#[0-9a-f]{3,8}|\brgba?\(/i);
      expect(classes).not.toContain('[');
      expect(classes.split(' ').filter((utility) => utility.includes('shadow'))).toStrictEqual([]);
    });
  });

  describe('keyboard', () => {
    it('is reachable by Tab and carries the focus ring utilities', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SelectField value="alpha" options={OPTIONS} onChange={vi.fn()} />,
      );

      await user.tab();

      expect(selectElement(container)).toHaveFocus();
      expect(FIELD_CONTROL_CLASSES).toContain('focus-visible:outline-2');
      expect(FIELD_CONTROL_CLASSES).toContain('focus-visible:outline-focus-ring');
      expect(FIELD_CONTROL_CLASSES).toContain('motion-safe:transition-colors');
    });
  });

  describe('both themes', () => {
    for (const theme of ['command', 'paper'] as const) {
      it(`renders the same element, options and class list under the ${theme} theme`, () => {
        document.documentElement.setAttribute('data-theme', theme);
        const { container } = render(
          <SelectField
            value="beta"
            options={OPTIONS}
            aria-describedby="plant-hint"
            onChange={vi.fn()}
          />,
        );
        const select = selectElement(container);

        expect(select.tagName).toBe('SELECT');
        expect(select).toHaveAttribute('aria-describedby', 'plant-hint');
        expect(select.getAttribute('class')).toBe(FIELD_CONTROL_CLASSES);
        expect(optionValues(select)).toStrictEqual(OPTIONS.map((option) => option.value));
        expect(select.hasAttribute('style')).toBe(false);
      });
    }

    it('hands both themes one identical class list, so the colour is the theme role', () => {
      document.documentElement.setAttribute('data-theme', 'command');
      const command = render(
        <SelectField value="alpha" options={OPTIONS} onChange={vi.fn()} />,
      );
      const inCommand = Array.from(selectElement(command.container).classList);

      document.documentElement.setAttribute('data-theme', 'paper');
      const paper = render(<SelectField value="alpha" options={OPTIONS} onChange={vi.fn()} />);
      const inPaper = Array.from(selectElement(paper.container).classList);

      expect(inCommand).toStrictEqual(inPaper);
    });
  });
});
