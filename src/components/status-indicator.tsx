/**
 * One status vocabulary for the whole interface: the icon, the label and the colour that a status
 * always shows together, and the only mapping from an evidence pin's six states onto that vocabulary.
 *
 * A meaning is never carried by colour alone (rule B-3). `meaning` is required and selects the icon
 * and the status role colour; `label` is required and is painted as visible text. The icon is marked
 * `aria-hidden` (and `focusable="false"` for the engines that make an SVG a tab stop on their own),
 * so the label is the accessible name and the meaning is announced exactly once. A status that shows
 * a colour with no icon or no label therefore cannot be constructed, which is the gap AAP §0.5.4
 * records this component closing.
 *
 * {@link meaningOf} is the contracts §4.2 mapping from `PinState` onto those meanings, and it is the
 * only such mapping in the application: the freshness pill, the state boundary, the legend and the
 * canvas pin renderers consume it instead of deriving their own. A second status indicator, or a
 * second pin-state mapping, anywhere in the repository is a defect — one meaning has to look and read
 * the same in a table cell, a pill, a legend entry and a canvas badge.
 *
 * Colours come from the six `--color-status-*` role tokens exposed by `src/theme/tokens.css`, which
 * resolve per theme to the values specification §4.2 measures, so no raw palette value, no `rgb()`,
 * no opacity and no filter is reachable from here: a status colour that must not appear on a surface
 * cannot be selected. The label takes the primary text role, so its contrast is the ratio the
 * specification measured for that role rather than one recomputed here.
 *
 * Icons are bundled Phosphor React components (rule B-1): they compile into the bundle, so no icon
 * font, sprite, `<img>` or URL is fetched at runtime.
 *
 * Every string this component shows is supplied by the caller. A status label is record content, and
 * a simulated element's label is the exact specification §5.3 string that arrives as `SimLabel`
 * through the same `label` prop (rule P-1) — nothing here spells a label, counts anything or formats
 * a figure (rule P-6).
 */
import {
  CheckCircle,
  CircleDashed,
  Clock,
  Eye,
  Flask,
  Warning,
  XCircle,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import type { PinState } from '../types';

/**
 * The shared status meanings: one per status role token of specification §4.2, and the whole
 * vocabulary any status in the application is allowed to express.
 *
 * Freshness, severity, result and provenance are each rendered through one of these six rather than
 * through a union of their own, which is what keeps a status reading the same wherever it appears.
 * The union is declared here because no other module owns it.
 */
export type StatusMeaning = 'pass' | 'fail' | 'warning' | 'review' | 'empty' | 'simulated';

/**
 * What one `PinState` amounts to in the shared vocabulary: the meaning it is rendered as, and the
 * one case where its icon differs from that meaning's own.
 *
 * `iconOverride` is present only for the `pending` state, whose warning meaning carries the clock so
 * that "awaiting a decision" reads differently from "degraded" while sharing the warning colour. A
 * consumer passes {@link PENDING_CLOCK_ICON} through `StatusIndicator`'s `icon` prop for that case.
 */
export interface StatusDescriptor {
  /** The meaning the state is rendered as. */
  readonly meaning: StatusMeaning;
  /** The icon to show instead of the meaning's own. Present only for the `pending` state. */
  readonly iconOverride?: 'clock';
}

/**
 * The contracts §4.2 mapping from an evidence pin's state onto the shared status meanings.
 *
 * The `switch` is exhaustive over `PinState` and deliberately has no `default` branch: adding a
 * seventh state to that union makes this function fail to type-check, which is the reminder that a
 * new state also needs a decided meaning. A `default` arm would silently render a new state as
 * whatever it happened to fall back to.
 */
export function meaningOf(state: PinState): StatusDescriptor {
  switch (state) {
    case 'pass':
      return { meaning: 'pass' };
    case 'fail':
      return { meaning: 'fail' };
    case 'stale':
      return { meaning: 'warning' };
    case 'pending':
      return { meaning: 'warning', iconOverride: 'clock' };
    case 'review':
      return { meaning: 'review' };
    case 'empty':
      return { meaning: 'empty' };
  }
}

/**
 * The status role colour per meaning, and the only place one is chosen.
 *
 * Each value is the `text-` utility of a `--color-status-*` role token, so the same class list serves
 * both themes and the icon paints in the theme's own measured colour. The map is exhaustive by type,
 * so a meaning added without a colour fails to compile.
 *
 * This module owns the token, so `status-indicator.test.tsx` names each meaning's colour through this
 * map instead of retyping the utility. A restyle to an equivalent utility, or a change of the role a
 * meaning carries, then flows from here into the case rather than breaking it, and the case is left
 * proving which tokens reach the markup — the value each role resolves to belongs to the theme layer,
 * `src/theme/tokens.css`.
 */
export const MEANING_COLOUR_CLASSES = {
  pass: 'text-status-pass',
  fail: 'text-status-fail',
  warning: 'text-status-warning',
  review: 'text-status-review',
  empty: 'text-status-empty',
  simulated: 'text-status-simulated',
} as const satisfies Record<StatusMeaning, string>;

/**
 * The text role the label is painted in, and the only place one is chosen: specification §4.2's
 * primary text role, whose measured contrast is the ratio the label carries on every surface a status
 * appears on. The layout utility beside it keeps the label from forcing the row wider than its cell.
 *
 * This module owns the token, so `status-indicator.test.tsx` names it through this constant instead
 * of retyping `text-text-primary`. The case then asserts which role reaches the label, and the value
 * that role resolves to stays the theme layer's, `src/theme/tokens.css`.
 */
export const STATUS_LABEL_CLASS = 'min-w-0 text-text-primary';

/**
 * The icon per meaning, and the only place one is chosen: a check for pass, a cross for fail, a
 * triangle for warning, an eye for review, a dashed circle for empty and a flask for simulated.
 *
 * Exhaustive by type for the same reason as the colour map: a meaning added without an icon fails to
 * compile rather than rendering a status with nothing to distinguish it but its hue.
 */
const MEANING_ICONS = {
  pass: CheckCircle,
  fail: XCircle,
  warning: Warning,
  review: Eye,
  empty: CircleDashed,
  simulated: Flask,
} as const satisfies Record<StatusMeaning, Icon>;

/**
 * The clock that marks a pending pin, ready to pass through {@link StatusIndicatorProps.icon}.
 *
 * It is exported so that the consumers reading `iconOverride` from {@link meaningOf} do not each
 * import a clock and each have to remember the two attributes that keep it out of the accessibility
 * tree; the attributes are on the element here, once.
 */
export const PENDING_CLOCK_ICON: ReactNode = <Clock aria-hidden="true" focusable="false" />;

/**
 * What every surface that reports a status hands {@link StatusIndicator}: the meaning to express
 * and the words to show, taken by the caller from the record it read rather than from a vocabulary
 * of this module's own. Both are required, so a status is never drawn as a colour without an icon
 * and a label beside it (rule B-3), and the shared mapping from a pin's state onto a meaning stays
 * the only one in the application (contracts §4.2).
 */
export interface StatusIndicatorProps {
  /** The meaning to express. Required: it selects both the icon and the status colour. */
  readonly meaning: StatusMeaning;
  /**
   * The label shown beside the icon, and the only accessible name of the status.
   *
   * Required, and rendered as visible text, because the meaning must never rest on colour alone
   * (rule B-3). The text itself is the caller's: a record's own wording, or the exact §5.3
   * simulation label.
   */
  readonly label: string;
  /**
   * The icon to show instead of the meaning's own, for the one case {@link meaningOf} names.
   *
   * It is rendered inside an `aria-hidden` wrapper, so an override is decorative whatever its own
   * module marked it as, and the label stays the single accessible name.
   */
  readonly icon?: ReactNode;
  /** Layout-only additions from the calling screen. Never a colour and never a surface. */
  readonly className?: string | undefined;
}

/**
 * The inline status row: the meaning's icon in its status colour, and the caller's label in the
 * primary text role.
 *
 * It is inline content, so a family, a heading, a list item or a landmark is never added here — it
 * fits in a table cell, a pill, a legend entry and a label beside an SVG mark. It is also not
 * interactive: it adds no focus stop and no `tabIndex`, because a status has nothing to operate.
 */
export function StatusIndicator({ meaning, label, icon, className }: StatusIndicatorProps) {
  const MeaningIcon = MEANING_ICONS[meaning];

  return (
    <span className={joinClassNames('inline-flex min-w-0 items-center gap-1', className)}>
      {/* Hidden from assistive technology as a whole, so an override supplied without its own
          attributes is still announced once — through the label below it. */}
      <span
        aria-hidden="true"
        className={joinClassNames('inline-flex shrink-0', MEANING_COLOUR_CLASSES[meaning])}
      >
        {icon ?? <MeaningIcon aria-hidden="true" focusable="false" />}
      </span>
      <span className={STATUS_LABEL_CLASS}>{label}</span>
    </span>
  );
}

/**
 * Concatenates the class names that are present, so an omitted `className` leaves no trailing space
 * and no empty entry behind.
 */
function joinClassNames(...values: readonly (string | undefined)[]): string {
  return values.filter((value) => value !== undefined && value !== '').join(' ');
}
