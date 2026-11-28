/**
 * The select field: the single owner of the product's `<select>` element.
 *
 * AAP §0.5.2 fixes that "a raw `<input>`/`<select>`/`<textarea>`/`<button>`/heading is permitted only
 * inside the component that owns it; no screen or feature file may use one directly", and §0.18.1
 * restates the same requirement as "interactive elements are components, never raw elements in a
 * screen". The inventory §0.5.2 lists carried no select primitive, so the queue's filters, the audit
 * filters, the model selector, the scenario matrix, the grant dialog and the shell's scope filters and
 * role switcher each wrote their own `<select>` — the largest single group in the divergence §0.5.5's
 * "no path from a component to a native interactive element" rules out. This module is the owner such
 * a control composes instead.
 *
 * WHAT THIS MODULE OWNS, AND WHAT THE CALLER OWNS. The primitive owns the element, its controlled
 * value and its change contract: the value is the string the caller holds, one of the option values
 * the caller supplies, and every change is reported as that string through `onChange` rather than as
 * the DOM event. The caller owns the list and everything around the control — the visible label bound
 * by the `id`/`htmlFor` pair this component accepts through its native props, and the supporting
 * sentence wired with `aria-describedby`.
 *
 * THE OPTIONS ARE THE CALLER'S, EXACTLY. One option is rendered per entry, in the caller's order, with
 * the caller's value and label and nothing else: no placeholder is prepended, no option is dropped for
 * looking like a duplicate, nothing is sorted and nothing is relabelled here. That is what makes an
 * "all plants" entry, a stage notice's disabled entry or a single filler entry the call site's
 * decision rather than this module's — a filter that must stay operable while its read is in flight
 * adds the entry that keeps it so. An empty array is likewise the caller's business and renders an
 * empty list without a warning: rule P-8 puts the obligation on the call site to show a control that
 * either performs its function or says why it cannot, and a primitive that silently invented an option
 * would hide the case instead of exposing it.
 *
 * The appearance is {@link FIELD_CONTROL_CLASSES} from `./text-field`, the same list every field
 * control in the product wears, so a select and a text field beside each other share one boundary,
 * surface, type size and focus ring. The option class list is optional because a `<select>`'s option
 * styling is the platform's; a caller that needs the surface to follow the popup hands one in, and a
 * caller that does not leaves it absent rather than writing a class of its own.
 */
import type { ChangeEvent, ComponentPropsWithoutRef, ReactElement, Ref } from 'react';

import { FIELD_CONTROL_CLASSES } from './text-field';

/**
 * One entry of a {@link SelectField}'s list.
 *
 * `value` is the string the field reports and therefore the identity of the entry, which is also why
 * it is the rendered option's `key`: two entries sharing a value are one entry as far as the change
 * contract is concerned, and the list a caller supplies states each of its values once. `label` is the
 * visible text and is reproduced character for character, because it is the caller's copy — a plant
 * name, a fixed sentence from the specification, a persona's title — and no primitive may reword it.
 */
export interface SelectOption {
  /** The option's value: what the field reports when this entry is chosen. */
  readonly value: string;
  /** The option's visible text, rendered exactly as supplied. */
  readonly label: string;
}

/**
 * Props of {@link SelectField}.
 *
 * The four members the native element already has are replaced rather than extended: `value` and
 * `onChange` become the controlled string contract described on the module, `className` becomes the
 * caller's replacement for the default class list, and `children` is removed because the options are
 * the caller's array rather than JSX. `optionClassName` and `ref` are added. Every other native prop —
 * `id`, `name`, `disabled`, `aria-*`, the handlers, `data-*` — is inherited and forwarded unchanged.
 */
export interface SelectFieldProps
  extends Omit<
    ComponentPropsWithoutRef<'select'>,
    'value' | 'onChange' | 'className' | 'children'
  > {
  /** The controlled value: the option value the caller holds, rendered as the chosen entry. */
  readonly value: string;
  /** Every entry of the list, in the order it is to be read. Supplied in full by the caller. */
  readonly options: readonly SelectOption[];
  /**
   * Reports a change as the chosen entry's value.
   *
   * One call per change, carrying the value the element now holds. The caller never receives the
   * event, so it cannot read the element itself and cannot report a value that has already moved.
   */
  readonly onChange: (value: string) => void;
  /**
   * The caller's replacement for {@link FIELD_CONTROL_CLASSES}. Absent, the default list is worn in
   * full; given, it is worn instead, because a merge would let one caller utility drop the focus ring.
   */
  readonly className?: string | undefined;
  /**
   * The class list every rendered `<option>` wears, for the callers that must align the popup with the
   * surface it opens over. Absent, each option carries no class of its own and inherits the
   * platform's rendering.
   */
  readonly optionClassName?: string | undefined;
  /**
   * The element itself, for the call sites that move focus back onto the control after a change, such
   * as the role switcher returning focus to the top bar. React 19 hands `ref` to a function component
   * as an ordinary prop, so it is read here exactly as `children` would be.
   */
  readonly ref?: Ref<HTMLSelectElement> | undefined;
}

/**
 * Renders one controlled select field.
 *
 * The spread comes first and the contract second, so a native prop the caller passes reaches the
 * element exactly as written while the element always ends up with one class list, one value and one
 * change handler. The options are mapped in the caller's order and carry the caller's own text, which
 * is what lets a screen state its entries and its wording without a primitive in between.
 *
 * @param props The controlled value, the options, the change handler, the optional option class list,
 *   and every native select prop the calling screen needs. See {@link SelectFieldProps}.
 * @returns A single `<select>` element holding one `<option>` per supplied entry, in that order.
 */
export function SelectField({
  value,
  options,
  onChange,
  className,
  optionClassName,
  ref,
  ...rest
}: SelectFieldProps): ReactElement {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onChange(event.currentTarget.value);
  };

  return (
    <select
      {...rest}
      ref={ref}
      className={className ?? FIELD_CONTROL_CLASSES}
      value={value}
      onChange={handleChange}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className={optionClassName}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
