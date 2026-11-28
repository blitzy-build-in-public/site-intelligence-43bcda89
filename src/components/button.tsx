/**
 * The plain `<button>`, and the single owner of every button a screen shows that is not an action:
 * `ActionButton` is the action, and never disabled without the sentence that explains why (rule P-8).
 *
 * AAP §0.5.2 permits a raw `<button>` "only inside the component that owns it", and §0.18.1 restates
 * that as "interactive elements are components, never raw elements in a screen": this primitive owns
 * the toggle carrying `aria-pressed`, the disclosure carrying `aria-expanded` and `aria-controls`,
 * and the column select. Callers never disable it through `disabled`; a caller that must be inert
 * marks it `aria-disabled` and states its own explanation, as `TriggerToggle` does in
 * `src/app/simulation-controls.tsx`. A disabled control with a tooltip composes `ActionButton`.
 *
 * The primitive owns the element, `type` defaulting to `'button'` because a button in a form that
 * omits it submits the form, and the activation contract; the caller owns the visible label, the
 * `aria-describedby` sentence, the state attributes and the handler, every native prop forwarded
 * unchanged. The appearance is the application's bordered secondary control, composed from the two
 * exported lists `./tooltip` owns — `CONTROL_STRUCTURE_CLASSES` and `SECONDARY_CONTROL_CLASSES` —
 * so no colour, size or state utility is chosen in this module.
 */
import type { ComponentPropsWithoutRef, ReactElement, ReactNode, Ref } from 'react';

import { CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES } from './tooltip';

/**
 * The one owner of a plain button's token-driven appearance: the shared control structure plus the
 * secondary appearance.
 *
 * Both halves are imported from `./tooltip`, where the application's control pattern lives, so a
 * change to the bordered shape, the target size, the focus ring or the secondary surface reaches this
 * primitive and `ActionButton` together. Nothing is added here: a caller that needs a different box
 * passes its own class list, and a caller that needs a colour the secondary control does not wear is
 * asking for a variant this product does not have.
 */
export const BUTTON_CLASSES = `${CONTROL_STRUCTURE_CLASSES} ${SECONDARY_CONTROL_CLASSES}`;

/**
 * Props of {@link Button}.
 *
 * `type`, `className` and `children` are replaced rather than inherited: `type` is narrowed to the two
 * values a product button has, `className` becomes the caller's replacement for the default class
 * list, and `children` is required, because a button with no label has no accessible name (rule B-3).
 * Everything else — `onClick`, `aria-pressed`, `aria-expanded`, `aria-controls`, `aria-describedby`,
 * `disabled`, `autoFocus`, `form`, the remaining handlers, `data-*`, `ref` — is inherited and
 * forwarded unchanged, which is how the caller keeps ownership of the control's state.
 */
export interface ButtonProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'type' | 'className' | 'children'> {
  /** The control's visible label. Required: a control with no name is unusable by a screen reader. */
  readonly children: ReactNode;
  /**
   * What the control does to a form.
   *
   * Defaults to `'button'`, so a button placed inside a form never submits it by accident; `'submit'`
   * is stated by the caller that means it. `'reset'` is deliberately absent — a control that discards
   * a user's work is not a shape this product offers.
   */
  readonly type?: 'button' | 'submit';
  /**
   * The caller's replacement for {@link BUTTON_CLASSES}, for a control whose box the surrounding
   * layout sizes — a column select inside a table header, a toggle that must fill a row. Absent, the
   * default list is worn in full; given, it is worn instead, because a merge would let one caller
   * utility silently drop the focus ring.
   */
  readonly className?: string | undefined;
  /**
   * The element itself, for the call sites that move focus after activation — a disclosure returning
   * focus to its trigger when it collapses. React 19 hands `ref` to a function component as an
   * ordinary prop, so it is read here exactly as `children` would be.
   */
  readonly ref?: Ref<HTMLButtonElement> | undefined;
}

/**
 * Renders one plain button.
 *
 * The spread comes first and the contract second, so the caller's `onClick`, state attributes and
 * native props reach the element exactly as written while the element always ends up with one type and
 * one class list. Because the element is a real `<button>`, `Enter` and `Space` activate it and the
 * browser owns the keyboard behaviour: no key handler is registered here, and the caller's `onClick`
 * is the whole of the activation contract.
 *
 * @param props The label, the type, and every native button prop the calling screen needs — its
 *   handler and the aria attributes that state the control's own state. See {@link ButtonProps}.
 * @returns A single `<button>` element carrying the secondary control's class list.
 */
export function Button({ type = 'button', className, ref, ...rest }: ButtonProps): ReactElement {
  return <button {...rest} ref={ref} type={type} className={className ?? BUTTON_CLASSES} />;
}
