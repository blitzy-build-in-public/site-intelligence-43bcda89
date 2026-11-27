/**
 * The text field: the single owner of the product's single-line `<input>` element.
 *
 * AAP §0.5.2 fixes that "a raw `<input>`/`<select>`/`<textarea>`/`<button>`/heading is permitted only
 * inside the component that owns it; no screen or feature file may use one directly", and §0.18.1
 * restates the same requirement as "interactive elements are components, never raw elements in a
 * screen". §0.5.2's component inventory carried no text-input primitive, so every screen that needs
 * one — the queue's supplier and saved-view filters, the audit filters, the scenario levers, the
 * assistant's composer and the shell's search control — had nothing to compose and wrote the element
 * itself. This module is that owner, and the claim §0.5.5 makes then holds wherever a screen shows
 * one: there is no path to a native input except through the component that owns it, and this is that
 * component.
 *
 * WHAT THIS MODULE OWNS, AND WHAT THE CALLER OWNS. The primitive owns the element, its `type`, its
 * controlled value and its change contract. The value is the string the caller holds and nothing else,
 * and every edit is reported as one string through `onChange` — never as the DOM event — so no screen
 * handles a native event type and none can report a stale value by reading `event.target` after React
 * has moved on. The caller owns everything the field is surrounded by: the visible label, bound by the
 * `id`/`htmlFor` pair this component accepts through its native props, and the supporting sentence,
 * wired with `aria-describedby`. That is why no `<label>` is rendered here — a label owned by a shared
 * primitive would name every field in the product the same, and the words around a field are the
 * screen's copy, not this module's.
 *
 * Every native prop other than the five this contract replaces reaches the element untouched, because
 * the shapes the call sites need are the platform's own: `aria-describedby` for the hint sentence,
 * `aria-invalid` and `aria-required` for form semantics, `role` and the combobox attributes for the
 * shell's search control, `autoComplete` and `spellCheck` for its input behaviour, `min`/`max`/`step`
 * for a numeric lever, `onKeyDown` and `onBlur` for commit-on-Enter, and `data-*` for a shortcut hook.
 * A prop this component swallowed would force the call site back to a raw element.
 *
 * The appearance is the role-token shape every field control in the product shares, exported as
 * {@link FIELD_CONTROL_CLASSES} so the select and the text area take the same boundary, surface, type
 * size and focus ring from one owner rather than retyping them. `min-h-6` keeps the 24 px minimum
 * target rule B-3 asks for, the 2 px focus ring is the `--color-focus-ring` role the themes define,
 * and the colour change is `motion-safe:` so a reduced-motion session gets no transition. No raw
 * palette value, no arbitrary value and no shadow appears in it, because the theme layer exposes no
 * such utility: a field therefore cannot pick a colour the themes have not measured for contrast.
 */
import type { ChangeEvent, ComponentPropsWithoutRef, ReactElement, Ref } from 'react';

/**
 * The input types this field offers, and the whole of the type state space.
 *
 * The list is deliberately closed. Each member is a type a screen in this build needs and the
 * platform renders without a second control (`search` for the shell's search box, `number` for the
 * scenario levers, `date` for the queue's date narrowing); anything else — a file picker, a colour
 * well, a checkbox, a radio button — is a different interaction with a different accessible
 * contract, and admitting it here would let one component grow a dozen shapes. A caller that needs
 * such a control needs a primitive of its own.
 */
export type TextFieldType = 'text' | 'number' | 'date' | 'search' | 'email' | 'tel' | 'url';

/**
 * The one owner of a field control's role-token shape.
 *
 * Every single-line field, select and text area in the product wears this list, so the three cannot
 * drift apart: a change to the boundary, the surface, the type size or the focus ring here reaches
 * all of them. The pointer state lifts the boundary to the accent role rather than dimming anything,
 * which is how the control stays above the contrast ratio rule B-3 requires. `motion-safe:` keeps the
 * colour transition out of a reduced-motion session, as rule B-3 requires and as the theme switch
 * does for its own control.
 *
 * It is exported rather than kept private because {@link TextField} is not its only user: the select
 * field imports it and the text area composes its own list on top of it, and a second copy of these
 * utilities would be the one thing that lets a field and a select disagree about what a control looks
 * like.
 */
export const FIELD_CONTROL_CLASSES =
  'min-h-6 rounded-control border border-control-boundary bg-surface-1 px-2 py-1 text-13 text-text-primary hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-safe:transition-colors motion-safe:duration-150';

/**
 * Props of {@link TextField}.
 *
 * The five members the native element already has are replaced rather than extended: `value` and
 * `onChange` become the controlled string contract described on the module, `type` is narrowed to
 * {@link TextFieldType}, `className` becomes the caller's replacement for the default class list, and
 * `children` is removed because an `<input>` is a void element and has no children to render. Every
 * other native prop — including every `aria-*` attribute, every handler and `ref` — is inherited and
 * forwarded unchanged.
 */
export interface TextFieldProps
  extends Omit<
    ComponentPropsWithoutRef<'input'>,
    'value' | 'onChange' | 'type' | 'className' | 'children'
  > {
  /** The controlled value: the exact string the caller holds for this field. */
  readonly value: string;
  /**
   * Reports an edit as the field's new value.
   *
   * One call per edit, carrying the value the element holds at that moment. The caller never receives
   * the event, so it cannot read the element itself and cannot report a value that has already moved.
   */
  readonly onChange: (value: string) => void;
  /** The input type. Defaults to `'text'`, the type a field with no stated shape means. */
  readonly type?: TextFieldType;
  /**
   * The caller's replacement for {@link FIELD_CONTROL_CLASSES}, for the rare field whose box the
   * surrounding layout has to size or realign. Absent, the default list is worn in full; given, it is
   * worn instead — a merge would let a caller's single utility silently drop the focus ring.
   */
  readonly className?: string | undefined;
  /**
   * The element itself, for the call sites that own focus or selection: the search control moves
   * focus back into the field after a result is chosen, and a lever selects its own text on focus.
   * React 19 hands `ref` to a function component as an ordinary prop, so it is read here exactly as
   * `children` would be and needs no wrapper.
   */
  readonly ref?: Ref<HTMLInputElement> | undefined;
}

/**
 * Renders one controlled single-line field.
 *
 * The spread comes first and the contract second, in that order on purpose: a native prop the caller
 * passes — `id`, `name`, `disabled`, `readOnly`, `placeholder`, `role`, any `aria-*` — reaches the
 * element exactly as written, while the five members this component owns are written last so the
 * element always ends up with one type, one class list, one value and one change handler. The value
 * is the caller's string and the handler reports the element's own value, which keeps the field a
 * controlled input in the React sense: the rendered text can only change when the caller stores what
 * it was told.
 *
 * @param props The controlled value, the change handler, the input type, and every native input prop
 *   the calling screen needs. See {@link TextFieldProps}.
 * @returns A single `<input>` element carrying the field control's class list.
 */
export function TextField({
  value,
  onChange,
  type = 'text',
  className,
  ref,
  ...rest
}: TextFieldProps): ReactElement {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(event.currentTarget.value);
  };

  return (
    <input
      {...rest}
      ref={ref}
      type={type}
      className={className ?? FIELD_CONTROL_CLASSES}
      value={value}
      onChange={handleChange}
    />
  );
}
