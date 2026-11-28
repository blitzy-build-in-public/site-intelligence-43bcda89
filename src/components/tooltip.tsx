/**
 * The application's only disabled-aware control pattern, and the hint that explains a control which
 * cannot act.
 *
 * `ActionButton` renders every action that can be refused: screens in `src/features` compose it
 * instead of writing a raw `<button>`, and `./button.tsx` owns the bare `<button>` element itself for
 * the controls whose state is their own — a toggle carrying `aria-pressed`, a disclosure carrying
 * `aria-expanded`. Its props make the explanation structural rather than a convention — a disabled
 * control cannot be constructed without the sentence that says why — which is what rule P-8 requires
 * of every control: it either performs its function or is visibly disabled with a text explanation.
 *
 * The disabled state is expressed with `aria-disabled="true"` and never with the `disabled`
 * attribute. That is deliberate. `disabled` takes a button out of the tab order, so the very
 * explanation rule P-8 demands would be unreachable by keyboard and silent to a screen reader,
 * against rule B-3. The control therefore stays focusable, refuses activation in its own handler,
 * and carries its reason twice over: painted by `Tooltip` on hover or focus, and exposed
 * programmatically through `aria-describedby`, so the reason survives wherever the hint is not
 * shown.
 *
 * A reader who activates the control is answered rather than ignored. Hover and focus carry the
 * reason only while the pointer or the focus stays, which is no answer at all to the reader who
 * clicks and moves on: the activation is refused, so the reason is held on screen until that reader
 * leaves the gate that refused it, and the same sentence is announced once per refused attempt from
 * a live region — the visible half and the announced half of what rule P-8 owes a reader.
 *
 * The hint is placed from geometry it measures rather than from an anchor utility, because a
 * sentence anchored inside its trigger's own box is lost exactly where rule P-8 needs it most: a
 * control at the right edge of the window paints its explanation past it, and a control inside a
 * scrolling ancestor — the queue table's horizontal scroller, the evidence drawer's panel — has it
 * clipped away. The hint is therefore portalled onto `document.body` and painted `fixed`, and
 * {@link resolveHintGeometry} flips and clamps its box inside the viewport from the trigger's
 * measured rect. Measuring happens in a layout effect, before the browser paints, so the hint is
 * never drawn somewhere it then leaves.
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
import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * The props a tooltip trigger has to be able to receive.
 *
 * Typing the child this way lets `cloneElement` attach the description without a cast, and it
 * accepts both a DOM element and a first-party component such as `ActionButton`.
 */
interface TriggerProps {
  'aria-describedby'?: string | undefined;
}

/**
 * The side of its trigger a hint asks to be painted on.
 *
 * It is a preference rather than a promise: {@link resolveHintGeometry} keeps it whenever the hint
 * fits there and flips to the other side when it does not, reporting the side it settled on as
 * {@link HintGeometry.side}.
 */
export type TooltipPlacement = 'top' | 'bottom';

/**
 * How a hint lines up with its trigger horizontally: `'start'` lines the hint's leading edge up with
 * the trigger's, and `'end'` lines their trailing edges up once the leading edges would run the hint
 * past the right margin of the window.
 */
export type HintAlignment = 'start' | 'end';

/**
 * The four viewport coordinates of a box, exactly as `Element.getBoundingClientRect()` reports them.
 *
 * The edges are all a placement needs: a trigger's top and bottom say how much room is above and
 * below it, and its left and right say where the hint can start and end without leaving the window.
 */
export interface HintRect {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** A measured box's size, in CSS pixels. */
export interface HintSize {
  readonly width: number;
  readonly height: number;
}

/** The window a hint must stay inside, in CSS pixels. */
export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

/** Where a hint ends up: the side it fits on, how it is aligned, and the box it paints at. */
export interface HintGeometry {
  /** The side the hint fits on — the preferred one when it fits, the other one when it does not. */
  readonly side: TooltipPlacement;
  /** Which of the trigger's edges the hint's edge lines up with. */
  readonly alignment: HintAlignment;
  /** The hint's viewport-relative top edge, clamped inside the window's top and bottom margins. */
  readonly top: number;
  /** The hint's viewport-relative left edge, clamped inside the window's left and right margins. */
  readonly left: number;
  /**
   * The width cap to paint on a hint wider than the window leaves room for, or `null` when the hint
   * fits: its own `max-w-64` cap is the only cap it needs then, and an inline cap must never widen
   * what that class already limits.
   */
  readonly maxWidth: number | null;
}

/**
 * What a caller that explains a control hands {@link Tooltip}: the sentence the hint shows and the
 * one trigger it describes, since the hint is placed from that trigger's measured box rather than
 * anchored inside it. The caller keeps the hold — a held hint stays painted past the pointer and
 * the focus after a refused activation, and only the caller can release it, through
 * `onDismissHeld`, when the reader presses `Escape` (rule P-8).
 */
export interface TooltipProps {
  /** The explanation. Required, because a hint with nothing to say has no reason to exist. */
  readonly label: string;
  /** The single trigger the hint describes. */
  readonly children: ReactElement<TriggerProps>;
  /**
   * The side the hint prefers. `'top'` by default, and kept whenever the hint fits there;
   * {@link resolveHintGeometry} flips it to the other side when it does not.
   */
  readonly placement?: TooltipPlacement | undefined;
  /**
   * The calling screen's layout classes for the wrapper — `w-full`, `self-stretch`, `max-w-*`. They
   * reach the wrapper rather than the trigger, because the wrapper is the element the caller's
   * layout sizes: a trigger told to fill a shrink-to-fit parent collapses back to its own content.
   */
  readonly className?: string | undefined;
  /**
   * Whether the caller holds the hint open itself, past the pointer and the focus.
   *
   * {@link ActionButton} sets this once a control that cannot act has refused an activation: the
   * reason it was refused by then stays painted after the pointer leaves, which is the visible half
   * of rule P-8 that hover and focus alone cannot give a reader who clicked and moved on. Absent or
   * `false` leaves the pointer and focus behaviour exactly as it was.
   */
  readonly held?: boolean | undefined;
  /**
   * Called when the reader presses `Escape` while {@link TooltipProps.held} is set, so the caller can
   * release its hold. Escape closes an ordinary hint on its own; a held one is held by the caller's
   * own state, and only the caller can end it.
   */
  readonly onDismissHeld?: (() => void) | undefined;
}

/**
 * The wrapper the trigger and the closed description sit in.
 *
 * It is the layout participant in the calling screen's markup, not the control it wraps: a caller
 * that passes layout classes through {@link TooltipProps.className} hands them to this element,
 * which is what lets a control inside the wrapper occupy the same box as one that does not. It is
 * also the box the hint is placed against, because `inline-flex` shrink-wraps the control it holds
 * and its measured rect is therefore the trigger's own. It positions nothing itself: the hint is
 * portalled to `document.body` and painted `fixed` at the coordinates
 * {@link resolveHintGeometry} resolves, so the wrapper needs no anchor for it and carries none.
 */
const TRIGGER_WRAPPER_CLASSES = 'inline-flex';

/**
 * The hint itself: a raised surface with a decorative hairline, no shadow (there is none to
 * select), and `pointer-events-none` so the hint can never sit between the pointer and the control
 * it explains.
 *
 * `fixed` is what makes the resolved coordinates absolute against the viewport rather than against
 * whichever ancestor the trigger happens to sit in, and it is only sound together with the portal
 * into `document.body`: inside a table's horizontal scroller or the drawer's scrolling panel an
 * absolutely positioned hint would still be clipped, and outside the document's own flow nothing
 * can clip it.
 */
const HINT_CLASSES =
  'pointer-events-none fixed z-50 w-max max-w-64 rounded-card border border-hairline bg-surface-2 px-2 py-1 text-12 text-text-primary';

/**
 * The description while the hint is closed: the same text, mounted as always, with nothing painted
 * and no `tooltip` role to show for a hint that is not on screen. `sr-only` is deliberate where
 * `hidden` or `display: none` would be wrong — a hidden element leaves the accessibility tree, so
 * the trigger's `aria-describedby` would resolve to nothing at exactly the moment a reader needs it.
 */
const CLOSED_DESCRIPTION_CLASSES = 'sr-only';

/**
 * The space between a trigger and its hint, and the margin the hint keeps from the window's edges.
 *
 * Both are layout geometry on the 4 px spacing grid AAP §0.5.3 fixes for spacing — 4 px and 8 px are
 * its `gap-1` and `gap-2` steps — and neither is a figure the product shows anyone: no screen states
 * 4 or 8 px, so rule P-6, which requires every *shown* number to be computed, does not reach them.
 * They live here rather than in a utility class because the hint's position is resolved from
 * measurements, not from the cascade.
 */
const HINT_TRIGGER_GAP = 4;
const HINT_VIEWPORT_MARGIN = 8;

/** Keeps `value` inside `[min, max]`, and returns `min` when the range is inverted. */
function clampToRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Resolves where a hint paints, from the trigger it belongs to and the room the window leaves.
 *
 * This is the whole placement rule as a pure function, so the flip and the clamp can be asserted
 * without a browser and a regression in either fails a test:
 *
 * - **Side.** The preferred side is kept when the hint plus {@link HINT_TRIGGER_GAP} fits between
 *   the trigger and that edge of the window inside a {@link HINT_VIEWPORT_MARGIN} margin. When it
 *   does not, the other side is used if it fits, and when neither fits the roomier side is used so
 *   the clamp below moves the hint as little as possible. A hint that fits nowhere is still painted
 *   inside the window rather than off the edge of it (rule P-8).
 * - **Alignment.** The hint's leading edge lines up with the trigger's. When that would carry the
 *   hint past the window's right margin the trailing edges line up instead, and the result is
 *   clamped inside the margin either way — so a control at the right edge of the window paints its
 *   whole sentence inside it, which is what the queue's row actions and the chart controls need.
 * - **Width.** A hint wider than the window leaves room for reports that width as its cap, so its
 *   sentence wraps instead of running off the screen; one that already fits reports `null`, and its
 *   own `max-w-64` cap stands untouched.
 *
 * @param triggerRect The trigger's box, in viewport coordinates.
 * @param hintSize The hint's measured box, before any cap this function reports.
 * @param viewportSize The window the hint must stay inside.
 * @param preferredSide The side the caller asked for, used whenever it fits.
 * @returns The side, the alignment and the box the hint paints at.
 */
export function resolveHintGeometry(
  triggerRect: HintRect,
  hintSize: HintSize,
  viewportSize: ViewportSize,
  preferredSide: TooltipPlacement,
): HintGeometry {
  const cappedWidth = Math.max(viewportSize.width - HINT_VIEWPORT_MARGIN * 2, 0);
  const width = Math.min(hintSize.width, cappedWidth);
  const height = hintSize.height;
  const oppositeSide: TooltipPlacement = preferredSide === 'top' ? 'bottom' : 'top';

  /* The room a side leaves for the hint: from the trigger's edge to the window's, less the gap the
     hint keeps from the trigger and the margin it keeps from the window. */
  const roomOn = (side: TooltipPlacement): number =>
    side === 'top'
      ? triggerRect.top - HINT_TRIGGER_GAP - HINT_VIEWPORT_MARGIN
      : viewportSize.height - triggerRect.bottom - HINT_TRIGGER_GAP - HINT_VIEWPORT_MARGIN;
  const preferredRoom = roomOn(preferredSide);
  const oppositeRoom = roomOn(oppositeSide);

  const side: TooltipPlacement =
    preferredRoom >= height
      ? preferredSide
      : oppositeRoom >= height || oppositeRoom > preferredRoom
        ? oppositeSide
        : preferredSide;

  const top = clampToRange(
    side === 'top'
      ? triggerRect.top - HINT_TRIGGER_GAP - height
      : triggerRect.bottom + HINT_TRIGGER_GAP,
    HINT_VIEWPORT_MARGIN,
    viewportSize.height - height - HINT_VIEWPORT_MARGIN,
  );

  const alignment: HintAlignment =
    triggerRect.left + width > viewportSize.width - HINT_VIEWPORT_MARGIN ? 'end' : 'start';
  const left = clampToRange(
    alignment === 'end' ? triggerRect.right - width : triggerRect.left,
    HINT_VIEWPORT_MARGIN,
    viewportSize.width - width - HINT_VIEWPORT_MARGIN,
  );

  return {
    side,
    alignment,
    top,
    left,
    maxWidth: hintSize.width > cappedWidth ? cappedWidth : null,
  };
}

/** True when two resolutions place the hint identically, so a re-measure can leave the state alone. */
function isSameGeometry(current: HintGeometry | null, next: HintGeometry): boolean {
  return (
    current !== null &&
    current.side === next.side &&
    current.alignment === next.alignment &&
    current.top === next.top &&
    current.left === next.left &&
    current.maxWidth === next.maxWidth
  );
}

/**
 * The hint while its box is being measured: laid out, so it has a size to read, but not painted, so
 * the browser never shows it at the static position it falls to before the resolution lands.
 */
const UNPLACED_HINT_STYLE: CSSProperties = { visibility: 'hidden' };

/**
 * The resolved box as inline styles.
 *
 * Only placement is set here — never a colour, a border or a shadow, which stay the theme's role
 * utilities — and the width cap is written only when the window is too narrow for the hint, so
 * `max-w-64` remains the cap in every ordinary case.
 */
function placedHintStyles(geometry: HintGeometry): CSSProperties {
  const box: CSSProperties = { top: `${geometry.top}px`, left: `${geometry.left}px` };

  return geometry.maxWidth === null ? box : { ...box, maxWidth: `${geometry.maxWidth}px` };
}

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
  /**
   * The side the reason prefers, forwarded to the {@link Tooltip} the disabled control renders.
   *
   * It exists for a control whose neighbours sit where a hint would cover them — the shell's
   * navigation is the case it was added for — and it is a preference: the tooltip still flips it
   * when that side cannot fit the hint inside the window. An enabled control renders no hint, so the
   * prop has nothing to do there and is ignored.
   */
  readonly hintPlacement?: TooltipPlacement | undefined;
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
 * on the pointer leaving, on blur and on `Escape`, unless the caller is holding it open through
 * {@link TooltipProps.held}; focus never moves, because the trigger it explains is already the
 * focused element.
 *
 * Where the hint paints is measured, not inherited from the cascade. The shown hint is portalled onto
 * `document.body` and painted `fixed`, and a layout effect — which runs once the DOM is updated and
 * before the browser paints — reads the trigger's rect and the hint's own and resolves the box with
 * {@link resolveHintGeometry}. No ancestor can clip it there, and the resolution keeps it inside the
 * window however close to an edge its trigger sits. While it is open, a scroll anywhere in the
 * document (capture, so the queue table's and the drawer's own scrollers count) or a resize
 * re-measures it, and both listeners are removed the moment it closes; the measuring effect does
 * nothing at all while it is closed, so a closed hint costs nothing.
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
  held = false,
  onDismissHeld,
}: TooltipProps): ReactElement {
  const [isShown, setIsShown] = useState(false);
  const [geometry, setGeometry] = useState<HintGeometry | null>(null);
  const hintId = useId();
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const hintRef = useRef<HTMLSpanElement | null>(null);

  /**
   * Whether the hint is painted: while the pointer or the focus is on the trigger, and for as long as
   * the caller holds it once both have gone. Everything below reads this rather than `isShown`, so a
   * held hint is measured, re-placed on scroll and portalled exactly like a hovered one.
   */
  const isOpen = isShown || held;

  const show = (): void => {
    setIsShown(true);
  };

  const hide = (): void => {
    setIsShown(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>): void => {
    if (event.key !== 'Escape') {
      return;
    }
    /* Escape dismisses the hint without moving focus, which is still on the trigger it explains. A
       held hint is released through the caller, which owns the state holding it; an ordinary one is
       closed here. */
    if (held) {
      onDismissHeld?.();
    }
    if (isOpen) {
      setIsShown(false);
    }
  };

  /**
   * Places the hint from the two boxes it depends on: the trigger's, read from the wrapper that
   * shrink-wraps it, and its own. Safe to call at any time — with the hint closed or unmounted both
   * refs are empty and the pass is skipped.
   */
  const placeHint = (): void => {
    const wrapper = wrapperRef.current;
    const hint = hintRef.current;
    if (wrapper === null || hint === null) {
      return;
    }

    const root = document.documentElement;
    const resolved = resolveHintGeometry(
      wrapper.getBoundingClientRect(),
      hint.getBoundingClientRect(),
      {
        /* `clientWidth` and `clientHeight` are the box a fixed element is laid out against: they
           leave the classic scrollbar out, so a hint clamped to the right margin cannot end up under
           it. They read zero in a document with no layout, where the window's own size is all the
           answer there is. */
        width: root.clientWidth > 0 ? root.clientWidth : window.innerWidth,
        height: root.clientHeight > 0 ? root.clientHeight : window.innerHeight,
      },
      placement,
    );

    /* One pass places a hint the window has room for. A hint the window had to narrow wraps onto
       another line and is taller than the pass that narrowed it assumed, so a second pass resolves
       the height it actually paints at; skipping unchanged resolutions stops the settling there. */
    setGeometry((current) => (isSameGeometry(current, resolved) ? current : resolved));
  };

  /* Measured in a layout effect rather than during render: the DOM is applied by then and the paint
     has not happened, so the hint is never shown at a position it then leaves. There is no dependency
     array because the pass settles instead of repeating — the state update is skipped as soon as the
     resolution stops changing, and the narrowed-width case needs exactly one more pass. */
  useLayoutEffect(() => {
    if (isOpen) {
      placeHint();
      return;
    }
    setGeometry(null);
  });

  /* A trigger moves under an open hint without any prop or state of this component changing: the page
     scrolls, a panel inside the drawer scrolls, the window is resized. `capture` is what lifts a
     scroll inside a nested scrolling ancestor to this listener, which a bubbling listener never sees. */
  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    window.addEventListener('scroll', placeHint, true);
    window.addEventListener('resize', placeHint);

    return () => {
      window.removeEventListener('scroll', placeHint, true);
      window.removeEventListener('resize', placeHint);
    };
  }, [isOpen, placement]);

  /* A trigger that already carries a description keeps it; this hint appends its own id rather than
     replacing what the caller wrote. */
  const existingDescription = children.props['aria-describedby'];
  const describedBy =
    existingDescription === undefined || existingDescription.length === 0
      ? hintId
      : `${existingDescription} ${hintId}`;

  return (
    <span
      ref={wrapperRef}
      className={joinClassNames(TRIGGER_WRAPPER_CLASSES, className)}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      {cloneElement(children, { 'aria-describedby': describedBy })}
      {isOpen ? (
        createPortal(
          /* `data-side` states the side the hint actually settled on, not the one it was asked for, so
             its placement is assertable where it paints rather than through a utility class. */
          <span
            ref={hintRef}
            id={hintId}
            role="tooltip"
            data-side={geometry?.side}
            className={HINT_CLASSES}
            style={geometry === null ? UNPLACED_HINT_STYLE : placedHintStyles(geometry)}
          >
            {label}
          </span>,
          document.body,
        )
      ) : (
        <span id={hintId} className={CLOSED_DESCRIPTION_CLASSES}>
          {label}
        </span>
      )}
    </span>
  );
}

/**
 * The refusal a live region announces: the sentence a control that cannot act turned an activation
 * away with, and which attempt it was.
 *
 * The reason is kept with it rather than the sentence alone, because the hold has to end when the
 * control's own `disabledReason` is replaced — the reader has then moved past the gate that refused
 * them — and a hint painted from an out-of-date reason would explain the wrong gate. `attempt` numbers
 * the refusals so each one renders a new alert node: a live region whose text is rewritten inside the
 * same node is not announced again, which a second click on the same control must be.
 */
interface RefusedActivation {
  readonly reason: string;
  readonly attempt: number;
}

/**
 * The refusal's live region: the sentence the hint paints, mounted for assistive technology alone.
 *
 * It paints nothing on purpose. The visible copy of a refusal is the held hint, and a second visible
 * copy would print the same sentence twice on screen — while a reader who cannot see the hint gets
 * nothing at all unless the sentence also arrives as an announcement.
 */
const REFUSAL_ALERT_CLASSES = 'sr-only';

/**
 * The action button: the one control that carries its own reason for being unable to act.
 *
 * The caller's layout classes size the same box in both states: on the `button` itself while it can
 * act, and on the {@link Tooltip} wrapper while it cannot, with the button filling that wrapper — so
 * a `w-full`, `self-stretch` or `max-w-*` control does not change width the moment it becomes
 * disabled.
 *
 * A control that cannot act answers an activation instead of swallowing it. The reason it is blocked
 * by is held on screen — painted by the hint past the pointer and the focus, which is what a reader
 * who clicked and looked away needs — and announced once per attempt from a live region, so the
 * refusal reaches a reader who never saw the hint at all. The hold ends when the reader leaves that
 * gate: when the control can act again, when its reason is replaced by another, on blur, and on
 * `Escape`. Every one of those is the reader moving on, and a hint that outlived them would be
 * explaining a control they are no longer looking at.
 *
 * @param props The label, the activation handler, the flavour, and — when the control cannot act —
 *   the sentence explaining why and, optionally, the side that sentence prefers. See
 *   {@link ActionButtonProps}: the reason is part of the type, not an option, so rule P-8 holds for
 *   every call site rather than for the ones that remembered.
 * @returns A native `button` element, wrapped in a {@link Tooltip} when it is disabled so its
 *   reason is painted on hover and focus and stands on screen once an activation has been refused,
 *   beside the live region that announces that refusal. The hint is placed against the window, so it
 *   stays legible wherever the control sits — in the last table column, in a chart's corner or in the
 *   navigation strip.
 */
export function ActionButton(props: ActionButtonProps): ReactElement {
  const isDisabled = props.disabled === true;
  const variant = props.variant ?? 'secondary';
  const disabledReason = props.disabledReason;
  const [refusal, setRefusal] = useState<RefusedActivation | null>(null);

  /**
   * Ends the hold once the gate that produced it has gone. The reader has then moved past it — the
   * control can act, or it is blocked by something else now — so the old sentence stops being
   * painted and stops being announced.
   */
  useEffect(() => {
    if (refusal === null) {
      return;
    }
    if (!isDisabled || refusal.reason !== disabledReason) {
      setRefusal(null);
    }
  }, [disabledReason, isDisabled, refusal]);

  const releaseRefusal = (): void => {
    setRefusal(null);
  };

  const handleClick = (): void => {
    if (isDisabled) {
      /* A refused activation is answered rather than ignored: the reason this control carries is
         held on screen and announced, because a reader who clicks and moves on would otherwise see
         and hear nothing at all (rule P-8). */
      const reason = props.disabledReason;
      setRefusal((current) => ({ reason, attempt: (current?.attempt ?? 0) + 1 }));
      return;
    }
    props.onClick?.();
  };

  /* Only a refusal of the gate that still holds is painted and announced: one recorded before the
     control's reason changed belongs to the gate the reader has already left. */
  const refused =
    refusal !== null && isDisabled && refusal.reason === disabledReason ? refusal : null;

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
      onBlur={releaseRefusal}
    >
      {props.children}
    </button>
  );

  return (
    <>
      {isDisabled ? (
        <Tooltip
          label={props.disabledReason}
          className={props.className}
          placement={props.hintPlacement}
          held={refused !== null}
          onDismissHeld={releaseRefusal}
        >
          {button}
        </Tooltip>
      ) : (
        button
      )}
      {refused === null ? null : (
        <span key={refused.attempt} role="alert" className={REFUSAL_ALERT_CLASSES}>
          {refused.reason}
        </span>
      )}
    </>
  );
}
