/**
 * The text area field: the single owner of the product's `<textarea>` element.
 *
 * AAP §0.5.2 fixes that "a raw `<input>`/`<select>`/`<textarea>`/`<button>`/heading is permitted only
 * inside the component that owns it; no screen or feature file may use one directly", and §0.18.1
 * restates the same requirement as "interactive elements are components, never raw elements in a
 * screen". The inventory §0.5.2 lists carried no multi-line field, so the dismiss reason, the approval
 * comment, the investigation note, the grant justification and the saved-view description each wrote
 * their own `<textarea>`; this module is the owner a multi-line field composes instead.
 *
 * WHAT THIS MODULE OWNS, AND WHAT THE CALLER OWNS. The primitive owns the element, its controlled
 * value and its change contract: the value is the string the caller holds, and every edit is reported
 * as one string through `onChange` rather than as the DOM event, so a screen never handles a native
 * event type and never reports a stale value. The caller owns the visible label, bound by the
 * `id`/`htmlFor` pair this component accepts through its native props, and the supporting sentence
 * wired with `aria-describedby` — the sentence that states a minimum length or why the field exists.
 * A label rendered here would name every note in the product the same way, so none is.
 *
 * Every native prop other than the three this contract replaces reaches the element untouched:
 * `rows`, `maxLength`, `placeholder`, `required`, `readOnly`, `disabled`, every `aria-*` attribute,
 * every handler and `data-*`. A prop this component swallowed would send the call site back to a raw
 * element, which is the divergence this module exists to close.
 *
 * The appearance is a single-line field's shape plus the multi-line part: {@link FIELD_CONTROL_CLASSES}
 * from `./text-field` supplies the boundary, surface, type size and focus ring every field control
 * shares, and {@link TEXT_AREA_FIELD_CLASSES} adds a minimum height to hold several lines, full width
 * so the field fills the column it is written into instead of the browser's default column count, and
 * vertical-only resizing so a reader can grow a long note without breaking the row it sits in.
 */
import type { ChangeEvent, ComponentPropsWithoutRef, ReactElement, Ref } from 'react';

import { FIELD_CONTROL_CLASSES } from './text-field';

/**
 * The one owner of a text area's role-token shape: the shared field control list plus the multi-line
 * part.
 *
 * The shared list is composed rather than retyped, so a change to the boundary, the surface, the type
 * size or the focus ring reaches the text area with every other field control. `min-h-24` gives the
 * field room for several lines before it scrolls, `w-full` makes it fill its column rather than the
 * platform's default width, and `resize-y` keeps the reader's own resize to the vertical axis, where
 * growing the note cannot push the surrounding layout sideways.
 */
export const TEXT_AREA_FIELD_CLASSES = `${FIELD_CONTROL_CLASSES} min-h-24 w-full resize-y`;

/**
 * Props of {@link TextAreaField}.
 *
 * The three members the native element already has are replaced rather than extended: `value` and
 * `onChange` become the controlled string contract described on the module, `className` becomes the
 * caller's replacement for the default class list, and `children` is removed because a `<textarea>`
 * takes its text from its value and not from JSX. Every other native prop, `ref` included, is
 * inherited and forwarded unchanged.
 */
export interface TextAreaFieldProps
  extends Omit<
    ComponentPropsWithoutRef<'textarea'>,
    'value' | 'onChange' | 'className' | 'children'
  > {
  /**
   * The controlled value: the exact text the caller holds.
   *
   * It may span lines, and it is the textarea's whole content — this component prepends no
   * placeholder sentence and appends no counter, because the copy around a field belongs to the screen.
   */
  readonly value: string;
  /**
   * Reports an edit as the field's new text.
   *
   * One call per edit, carrying the text the element holds at that moment, newlines included. The
   * caller never receives the event, so it cannot read the element itself and cannot report a value
   * that has already moved.
   */
  readonly onChange: (value: string) => void;
  /**
   * The caller's replacement for {@link TEXT_AREA_FIELD_CLASSES}, for a note whose box the surrounding
   * layout has to size. Absent, the default list is worn in full; given, it is worn instead, because a
   * merge would let a single caller utility silently drop the focus ring.
   */
  readonly className?: string | undefined;
  /**
   * The element itself, for the call sites that own focus or the caret, such as a validation message
   * returning focus to the field it names. React 19 hands `ref` to a function component as an ordinary
   * prop, so it is read here exactly as `children` would be.
   */
  readonly ref?: Ref<HTMLTextAreaElement> | undefined;
}

/**
 * Renders one controlled multi-line field.
 *
 * The spread comes first and the contract second, so a native prop the caller passes — `id`, `rows`,
 * `maxLength`, `required`, `aria-*`, the handlers — reaches the element exactly as written while the
 * element always ends up with one class list, one value and one change handler. The value is the
 * caller's string and the handler reports the element's own value, which keeps the field a controlled
 * input: the rendered text can only change when the caller stores what it was told.
 *
 * @param props The controlled value, the change handler, and every native textarea prop the calling
 *   screen needs. See {@link TextAreaFieldProps}.
 * @returns A single `<textarea>` element carrying the text area's class list.
 */
export function TextAreaField({
  value,
  onChange,
  className,
  ref,
  ...rest
}: TextAreaFieldProps): ReactElement {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    onChange(event.currentTarget.value);
  };

  return (
    <textarea
      {...rest}
      ref={ref}
      className={className ?? TEXT_AREA_FIELD_CLASSES}
      value={value}
      onChange={handleChange}
    />
  );
}
