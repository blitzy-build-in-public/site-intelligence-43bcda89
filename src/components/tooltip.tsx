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
}

/**
 * The wrapper holds the positioned hint beside the trigger it describes, so the hint is anchored to
 * the trigger without either element needing a ref or a measuring pass.
 */
const TRIGGER_WRAPPER_CLASSES = 'relative inline-flex';

/**
 * The hint itself: a raised surface with a decorative hairline, no shadow (there is none to
 * select), and `pointer-events-none` so the hint can never sit between the pointer and the control
 * it explains.
 */
const HINT_CLASSES =
  'pointer-events-none absolute left-0 z-50 w-max max-w-64 rounded-card border border-hairline bg-surface-2 px-2 py-1 text-12 text-text-primary';

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
 * Classes every button carries. `min-h-6 min-w-6` is the 24x24 px minimum target of rule B-3, and
 * the focus ring is the 2 px `--color-focus-ring` role the themes define, drawn on `focus-visible`
 * so a pointer click does not leave a ring behind.
 */
const BUTTON_BASE_CLASSES =
  'inline-flex min-h-6 min-w-6 items-center justify-center gap-2 rounded-control border px-3 py-1 text-13 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

/**
 * The visible difference between an action and a disabled one.
 *
 * The `aria-disabled` variants are how a control that cannot act looks inert without the `disabled`
 * attribute: the primary fill drops to a raised surface and the label to the secondary text role,
 * which keeps the measured contrast of those roles intact. Opacity is not used, because dimming a
 * label is exactly how contrast falls below the ratio rule B-3 requires.
 */
const BUTTON_VARIANT_CLASSES = {
  primary:
    'border-action-primary-bg bg-action-primary-bg text-action-primary-fg aria-disabled:border-control-boundary aria-disabled:bg-surface-2 aria-disabled:text-text-secondary aria-disabled:cursor-not-allowed',
  secondary:
    'border-control-boundary bg-surface-2 text-text-primary aria-disabled:bg-surface-1 aria-disabled:text-text-secondary aria-disabled:cursor-not-allowed',
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
 * The hint is mounted only while it is shown, so the `tooltip` role is present exactly when the
 * explanation is, and the trigger is described by it for as long as it is visible. It closes on
 * pointer leave, on blur and on `Escape`; focus never moves, because the trigger it explains is
 * already the focused element. No listener is registered on the document and no effect is used, so
 * a hint costs nothing while it is closed.
 *
 * The wrapper shrink-wraps its trigger, so a control that has to fill its container sets that width
 * on the control itself; the wrapper adds no width of its own.
 */
export function Tooltip({
  label,
  children,
  placement = 'top',
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
      className={TRIGGER_WRAPPER_CLASSES}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      {isShown ? cloneElement(children, { 'aria-describedby': describedBy }) : children}
      {isShown ? (
        <span
          id={hintId}
          role="tooltip"
          className={joinClassNames(HINT_CLASSES, HINT_PLACEMENT_CLASSES[placement])}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The application's only button.
 *
 * @param props The label, the activation handler, the flavour, and — when the control cannot act —
 *   the sentence explaining why. See {@link ActionButtonProps}: the reason is part of the type, not
 *   an option, so rule P-8 holds for every call site rather than for the ones that remembered.
 * @returns A native `button` element, wrapped in a {@link Tooltip} when it is disabled so its
 *   reason is visible on hover and focus.
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
        BUTTON_BASE_CLASSES,
        BUTTON_VARIANT_CLASSES[variant],
        props.className,
      )}
      aria-disabled={isDisabled ? true : undefined}
      onClick={handleClick}
    >
      {props.children}
    </button>
  );

  return isDisabled ? <Tooltip label={props.disabledReason}>{button}</Tooltip> : button;
}
