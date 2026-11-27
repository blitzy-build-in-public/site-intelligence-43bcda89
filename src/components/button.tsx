/**
 * The button: the single owner of the product's plain `<button>` element, beside the disabled-capable
 * `ActionButton`.
 *
 * AAP §0.5.2 fixes that "a raw `<input>`/`<select>`/`<textarea>`/`<button>`/heading is permitted only
 * inside the component that owns it; no screen or feature file may use one directly", and §0.18.1
 * restates the same requirement as "interactive elements are components, never raw elements in a
 * screen". `ActionButton` was the only button owner §0.5.2 listed, and it is the disabled-capable
 * action whose reason rule P-8 requires: it renders a fixed `type="button"` and the union of its
 * props admits no `aria-pressed`, no `aria-expanded` and no `aria-controls`. The controls that need
 * those — the scenario matrix's column select, the approval acknowledgement toggle, the assistant's
 * disclosure and the shell's simulation popover trigger — therefore had no component to compose and
 * wrote the element themselves. This module is that owner: between the two primitives, every button a
 * screen shows belongs to one of them.
 *
 * WHY THERE ARE TWO BUTTON PRIMITIVES, AND WHICH ONE A CALL SITE COMPOSES. `ActionButton` is the
 * action: something the screen does, enabled or disabled, and a disabled one cannot be constructed
 * without the sentence that explains why. This primitive is every other button: a toggle that carries
 * `aria-pressed`, a disclosure that carries `aria-expanded` and `aria-controls`, a column-select
 * control that states which column the matrix is ordered by. Those controls are never disabled in
 * this application, and their state is the caller's — so the caller owns the state attributes and the
 * activation handler, and both arrive through the spread untouched, exactly as the caller wrote them.
 * A call site that needs to be disabled, or needs the tooltip that explains a disabled control, is
 * `ActionButton`'s; a call site whose state lives in an aria attribute is this primitive's.
 *
 * WHAT THIS MODULE OWNS, AND WHAT THE CALLER OWNS. The primitive owns the element, its `type` and its
 * activation contract: `type` defaults to `'button'` because a button inside a form that omits the
 * attribute submits the form, which is the one failure mode the default has to rule out, and a caller
 * that really means to submit states `'submit'`. The caller owns the visible label, its children, and
 * whatever supporting sentence it wires with `aria-describedby` — this component invents no copy of
 * its own. Every native prop the caller passes reaches the element unchanged.
 *
 * The appearance is the application's bordered secondary control: the structure every bordered control
 * shares plus the secondary appearance, both imported from `./tooltip` where their single owner lives.
 * Composing those two exported lists rather than copying them is what keeps a button here and the
 * secondary action there from drifting apart, and it means no colour, size or state utility is chosen
 * in this module at all.
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
