/**
 * The application's only control pattern, and the hint that explains a control which cannot act.
 *
 * `ActionButton` renders every button in the product: screens in `src/features` compose it instead
 * of writing a raw `<button>`. Its props make the explanation structural rather than a convention —
 * a disabled control cannot be constructed without the sentence that says why — which is what rule
 * P-8 requires of every control: it either performs its function or is visibly disabled with a text
 * explanation.
 *
 * The disabled state is expressed with `aria-disabled="true"` and never with the `disabled`
 * attribute. That is deliberate. `disabled` takes a button out of the tab order, so the very
 * explanation rule P-8 demands would be unreachable by keyboard and silent to a screen reader,
 * against rule B-3. The control therefore stays focusable, refuses activation in its own handler,
 * and carries its reason twice over: painted by `Tooltip` on hover or focus, and exposed
 * programmatically through `aria-describedby`, so the reason survives wherever the hint is not
 * shown.
 *
 * The control answers the pointer as well as the keyboard. Both variants paint a hover fill and a
 * pressed fill from role tokens, carried by one `motion-safe` colour transition, so the primary
 * action is no more inert under the pointer than the switches beside it; a disabled control stays
 * inert through those states because its overrides are stacked with `aria-disabled`, which outranks
 * a plain `hover:` or `active:` in the cascade.
 *
 * Colours come from the role utilities the theme layer exposes, which offer no shadow and no raw
 * palette value, so neither can be selected from here. The hint takes no icon of its own and loads
 * nothing, so no asset is fetched at runtime (rule B-1), and every string it renders is supplied by
 * the caller from the specification's fixed text (rule P-6).
 */
import { cloneElement, useId, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode } from 'react';

/**
 * The props a tooltip trigger has to be able to receive.
 *
 * Typing the child this way lets `cloneElement` attach the description without a cast, and it
 * accepts both a DOM element and a first-party component such as `ActionButton`.
 */
interface TriggerProps {
  'aria-describedby'?: string | undefined;
}

/** Where the hint is painted: over the trigger, or under it when there is no room above. */
type TooltipPlacement = 'top' | 'bottom';

/** The public props of {@link Tooltip}. */
export interface TooltipProps {
  /** The explanation. Required, because a hint with nothing to say has no reason to exist. */
  readonly label: string;
  /** The single trigger the hint describes. */
  readonly children: ReactElement<TriggerProps>;
  /** Which side of the trigger the hint is painted on. Defaults to `'top'`. */
  readonly placement?: TooltipPlacement;
  /**
   * The calling screen's layout classes for the wrapper — `w-full`, `self-stretch`, `max-w-*`. They
   * reach the wrapper rather than the trigger, because the wrapper is the element the caller's
   * layout sizes: a trigger told to fill a shrink-to-fit parent collapses back to its own content.
   */
  readonly className?: string | undefined;
}

/**
 * The wrapper holds the positioned hint beside the trigger it describes, so the hint is anchored to
 * the trigger without either element needing a ref or a measuring pass.
 *
 * It is the layout participant in the calling screen's markup, not the control it wraps. A caller
 * that passes layout classes through {@link TooltipProps.className} hands them to this element,
 * which is what lets a control that sits inside the wrapper occupy the same box as one that does
 * not.
 */
const TRIGGER_WRAPPER_CLASSES = 'relative inline-flex';

/**
 * The hint itself: a raised surface with a decorative hairline, no shadow (there is none to
 * select), and `pointer-events-none` so the hint can never sit between the pointer and the control
 * it explains.
 */
const HINT_CLASSES =
  'pointer-events-none absolute left-0 z-50 w-max max-w-64 rounded-card border border-hairline bg-surface-2 px-2 py-1 text-12 text-text-primary';

/**
 * The description while the hint is closed: the same text, mounted as always, with nothing painted
 * and no `tooltip` role to show for a hint that is not on screen. `sr-only` is deliberate where
 * `hidden` or `display: none` would be wrong — a hidden element leaves the accessibility tree, so
 * the trigger's `aria-describedby` would resolve to nothing at exactly the moment a reader needs it.
 */
const CLOSED_DESCRIPTION_CLASSES = 'sr-only';

/** Placement utilities, one per `TooltipPlacement`. Both keep the hint aligned to the trigger. */
const HINT_PLACEMENT_CLASSES = {
  top: 'bottom-full mb-1',
  bottom: 'top-full mt-1',
} as const satisfies Record<TooltipPlacement, string>;

/** The two flavours of action the screens need: the one that commits, and the one beside it. */
type ActionButtonVariant = 'primary' | 'secondary';

/**
 * Everything an action carries regardless of whether it can act.
 *
 * `disabled` and `disabledReason` are deliberately absent here: {@link ActionButtonProps} adds them
 * as a union so the reason exists exactly when the control is disabled.
 */
interface ActionButtonBaseProps {
  /** The control's label. Text, never a bare icon: a control must have an accessible name. */
  readonly children: ReactNode;
  /** What activating the control does. Never called while the control is disabled. */
  readonly onClick?: () => void;
  /** `'primary'` for the one action a screen exists to take; `'secondary'` otherwise. */
  readonly variant?: ActionButtonVariant;
  /** Extra layout classes from the calling screen. Never a colour or a shadow. */
  readonly className?: string;
}

/**
 * The props of {@link ActionButton}, as a discriminated union.
 *
 * The union is the point of this file: `disabledReason` is required exactly when `disabled` is
 * `true` and forbidden otherwise, so a disabled control without a text explanation does not
 * compile. A single interface with an optional reason string would let one ship, which is the gap
 * rule P-8 closes. `disabledReason?: never` rather than omission is what `exactOptionalPropertyTypes`
 * needs to reject a reason on an enabled control.
 */
export type ActionButtonProps = ActionButtonBaseProps &
  (
    | { readonly disabled?: false; readonly disabledReason?: never }
    | { readonly disabled: true; readonly disabledReason: string }
  );

/**
 * The structure every bordered control shares, and its single owner.
 *
 * `min-h-6 min-w-6` is the 24x24 px minimum target of rule B-3, and the focus ring is the 2 px
 * `--color-focus-ring` role the themes define, drawn on `focus-visible` so a pointer click does not
 * leave a ring behind. The one colour transition carries the hover and pressed states a control
 * composes beside it, and `motion-safe:` keeps it out of a reduced-motion session (rule B-3),
 * exactly as `src/theme/theme-switch.tsx` does for its own control.
 *
 * This is the list {@link ActionButton} and both of the application's non-button controls — the
 * stage notice's way back and the not-found page's one link — share. A control that needs the
 * bordered shape, the target size and the focus ring takes them from here rather than writing them
 * again, so the three cannot drift apart; only the appearance that distinguishes them is composed
 * on top, and {@link SECONDARY_CONTROL_CLASSES} is the one secondary appearance.
 */
export const CONTROL_STRUCTURE_CLASSES =
  'inline-flex min-h-6 min-w-6 items-center justify-center gap-2 rounded-control border px-3 py-1 text-13 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-safe:transition-colors motion-safe:duration-150';

/**
 * The secondary-control appearance, and its single owner.
 *
 * The second raised surface inside the control boundary, with the primary text role: the control a
 * screen offers beside the one it exists to take. The pointer states are built from role tokens
 * alone — `hover:` lifts the boundary to the accent role and steps in to the first surface, and
 * `active:` keeps the accent boundary over the ground so a press is visibly lower than a hover. No
 * raw palette value, no arbitrary value and no opacity appears here, because dimming a label is
 * exactly how contrast falls below the ratio rule B-3 requires.
 *
 * `ActionButton`'s secondary variant composes this list and then its `aria-disabled` overrides; the
 * stage-notice page and the not-found page compose it after {@link CONTROL_STRUCTURE_CLASSES}. One
 * token change here therefore reaches every secondary control in the product.
 */
export const SECONDARY_CONTROL_CLASSES = [
  'border-control-boundary bg-surface-2 text-text-primary',
  'hover:border-accent hover:bg-surface-1',
  'active:border-accent active:bg-ground',
].join(' ');

/**
 * The primary action's hover and pressed states, and their single owner.
 *
 * The one action a screen exists to take answers the pointer rather than going inert under it:
 * `hover:` moves the filled action pair to the ground role, and `active:` rests on a raised surface
 * behind the accent boundary, so a press reads as lower than the hover that preceded it. Every value
 * is a role token — no raw palette value, no arbitrary value and no opacity appears here, because
 * dimming a label is exactly how contrast falls below the ratio rule B-3 requires.
 *
 * It is exported because no input fixes which role a pointer state uses; that treatment is the
 * component author's own choice. The component suite therefore names this list instead of retyping
 * its utilities, so a legitimate token change here still leaves rule B-3's requirement — a hover
 * state and a pressed state built from role tokens, with no palette literal and no shadow — holding.
 */
export const PRIMARY_STATE_CLASSES = [
  'hover:border-control-boundary hover:bg-ground hover:text-text-primary',
  'active:border-accent active:bg-surface-2 active:text-text-primary',
].join(' ');

/**
 * The visible difference between an action, an action under the pointer, and a disabled one.
 *
 * {@link CONTROL_STRUCTURE_CLASSES} supplies what every variant shares, so a variant states only
 * its own colours and their states. `hover:` and `active:` give each variant a hover fill and a
 * pressed fill built from role tokens alone, and each variant takes its pair from the one list that
 * owns it: {@link PRIMARY_STATE_CLASSES} for the primary action, {@link SECONDARY_CONTROL_CLASSES}
 * for the secondary one. The primary variant inverts its own fill on hover — the AAP 0.5.3
 * Cream-fill/Chocolate-label action pair and its inverse — so the label keeps its measured contrast
 * in both themes, and it darkens once more to a raised surface while pressed; the secondary variant
 * is the list the application's links compose too, so the button and those links cannot drift apart.
 * No raw palette value, no arbitrary value and no opacity appears here, because dimming a label is
 * exactly how contrast falls below the ratio rule B-3 requires.
 *
 * The `aria-disabled` variants are how a control that cannot act looks inert without the `disabled`
 * attribute: the primary fill drops to a raised surface and the label to the secondary text role,
 * which keeps the measured contrast of those roles intact. They are *stacked* with the state variants
 * on purpose. `aria-disabled:hover:` and `aria-disabled:active:` outrank a plain `hover:`/`active:`
 * on specificity, so they win the cascade and repaint the disabled fill, boundary and label over the
 * state the pointer would otherwise apply — a control that cannot act answers neither the pointer nor
 * a press. Each stacked value repeats that variant's own disabled appearance, so hovering or pressing
 * a disabled control changes nothing at all.
 */
const BUTTON_VARIANT_CLASSES = {
  primary: [
    'border-action-primary-bg bg-action-primary-bg text-action-primary-fg',
    PRIMARY_STATE_CLASSES,
    'aria-disabled:border-control-boundary aria-disabled:bg-surface-2',
    'aria-disabled:text-text-secondary aria-disabled:cursor-not-allowed',
    'aria-disabled:hover:border-control-boundary aria-disabled:hover:bg-surface-2',
    'aria-disabled:hover:text-text-secondary',
    'aria-disabled:active:border-control-boundary aria-disabled:active:bg-surface-2',
    'aria-disabled:active:text-text-secondary',
  ].join(' '),
  secondary: [
    SECONDARY_CONTROL_CLASSES,
    'aria-disabled:bg-surface-1 aria-disabled:text-text-secondary aria-disabled:cursor-not-allowed',
    'aria-disabled:hover:border-control-boundary aria-disabled:hover:bg-surface-1',
    'aria-disabled:hover:text-text-secondary',
    'aria-disabled:active:border-control-boundary aria-disabled:active:bg-surface-1',
    'aria-disabled:active:text-text-secondary',
  ].join(' '),
} as const satisfies Record<ActionButtonVariant, string>;

/** Joins the class lists a control composes, dropping the ones a caller left out. */
function joinClassNames(...values: readonly (string | undefined)[]): string {
  return values
    .filter((value): value is string => value !== undefined && value.length > 0)
    .join(' ');
}

/**
 * A short explanation shown on hover and on keyboard focus, wired to its trigger with
 * `aria-describedby`.
 *
 * The description does not wait for the hint to be painted. The trigger carries the
 * `aria-describedby` id on every render, and the element holding the text is mounted at all times:
 * while the hint is shown it is the visible `tooltip`, and while it is closed it keeps the same text
 * in the accessibility tree as the trigger's description without painting anything. A screen reader
 * therefore has the reason the moment focus arrives — and in browse mode before it — and the id it
 * resolves points at an element that always exists, so the reference never dangles. The hint closes
 * on the pointer leaving, on blur and on `Escape`; focus never moves, because the trigger it explains
 * is already the focused element. No listener is registered on the document and no effect is used, so
 * a hint costs nothing while it is closed.
 *
 * The wrapper is the element the calling screen's layout sizes, so layout classes arrive through
 * `className` and land there while the trigger keeps its own class list. `ActionButton` uses that to
 * hand its caller's layout classes to the wrapper while the control is disabled, so the enabled and
 * the disabled control occupy the same box.
 */
export function Tooltip({
  label,
  children,
  placement = 'top',
  className,
}: TooltipProps): ReactElement {
  const [isShown, setIsShown] = useState(false);
  const hintId = useId();

  const show = (): void => {
    setIsShown(true);
  };

  const hide = (): void => {
    setIsShown(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>): void => {
    if (event.key === 'Escape' && isShown) {
      setIsShown(false);
    }
  };

  /* A trigger that already carries a description keeps it; this hint appends its own id rather than
     replacing what the caller wrote. */
  const existingDescription = children.props['aria-describedby'];
  const describedBy =
    existingDescription === undefined || existingDescription.length === 0
      ? hintId
      : `${existingDescription} ${hintId}`;

  return (
    <span
      className={joinClassNames(TRIGGER_WRAPPER_CLASSES, className)}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      {cloneElement(children, { 'aria-describedby': describedBy })}
      <span
        id={hintId}
        role={isShown ? 'tooltip' : undefined}
        className={
          isShown
            ? joinClassNames(HINT_CLASSES, HINT_PLACEMENT_CLASSES[placement])
            : CLOSED_DESCRIPTION_CLASSES
        }
      >
        {label}
      </span>
    </span>
  );
}

/**
 * The application's only button.
 *
 * The caller's layout classes size the same box in both states: on the `button` itself while it can
 * act, and on the {@link Tooltip} wrapper while it cannot, with the button filling that wrapper — so
 * a `w-full`, `self-stretch` or `max-w-*` control does not change width the moment it becomes
 * disabled.
 *
 * @param props The label, the activation handler, the flavour, and — when the control cannot act —
 *   the sentence explaining why. See {@link ActionButtonProps}: the reason is part of the type, not
 *   an option, so rule P-8 holds for every call site rather than for the ones that remembered.
 * @returns A native `button` element, wrapped in a {@link Tooltip} when it is disabled so its
 *   reason is visible on hover and focus and announced on focus.
 */
export function ActionButton(props: ActionButtonProps): ReactElement {
  const isDisabled = props.disabled === true;
  const variant = props.variant ?? 'secondary';

  const handleClick = (): void => {
    if (isDisabled) {
      return;
    }
    props.onClick?.();
  };

  const button = (
    <button
      type="button"
      className={joinClassNames(
        CONTROL_STRUCTURE_CLASSES,
        BUTTON_VARIANT_CLASSES[variant],
        /* A disabled control hands the caller's layout classes to the Tooltip wrapper, because that
           is the element the caller's layout sizes, and fills it; an enabled one keeps them here.
           Exactly one element carries them in either state, so a margin or padding passed in is
           never applied twice. */
        isDisabled ? 'w-full' : props.className,
      )}
      aria-disabled={isDisabled ? true : undefined}
      onClick={handleClick}
    >
      {props.children}
    </button>
  );

  return isDisabled ? (
    <Tooltip label={props.disabledReason} className={props.className}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}
