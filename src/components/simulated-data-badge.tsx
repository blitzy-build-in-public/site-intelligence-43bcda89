/**
 * The one badge that labels the whole demonstration, and — when its caller gives it something to do —
 * the control that opens the simulation popover.
 *
 * It is mounted once in the shell, above the router outlet, so every route carries it: the overview,
 * the queue, the canvas, the atlas, the stage-notice pages and the not-found page alike, with no
 * screen able to omit it (rule P-1, AAP §0.10 and F11, asserted by T-15 on every route). This file
 * must therefore never be rendered inside a route — a route that rendered it would put a second copy
 * on screen while the shell's own copy could still be forgotten, which is the failure the single
 * mounting point exists to prevent.
 *
 * The badge labels the demonstration, never an individual figure. The label on a computed figure, a
 * recommendation, a write-back or a market-intelligence element belongs to the component that renders
 * that element — `MetricTile`, `ChartFrame`, the write-back tracker, the atlas series — so a
 * page-level badge never stands in for one (rule P-1).
 *
 * The label arrives as a `SimLabel` and is never spelled here: the shell decides which of the seven
 * specification §5.3 strings the badge carries, and this module keeps no literal of its own that could
 * drift from them. The clock arrives the same way, as `DEMO_CLOCK` from `src/types`, and is rendered
 * through `MonoValue` with `kind="timestamp"`, so no timestamp literal and no second formatter exists
 * in this file (rule P-6).
 *
 * The `simulated` status role marks the badge with an icon, its role colour and the label together, so
 * the meaning is never carried by colour alone (rule B-3). It is the shared `StatusIndicator` rather
 * than a marker of this file's own, because one status vocabulary for a meaning is what makes a badge,
 * a freshness pill and a table cell read alike (AAP §0.5.4).
 *
 * Whether the badge is a control is the caller's decision. With `onActivate` it is a native `<button>`
 * — keyboard operable, with a visible focus ring, a 24x24 px minimum target and an accessible name that
 * contains its visible label (rule B-3) — and activating it opens the simulation popover the shell
 * owns. Without `onActivate` it is a non-interactive `<span>` carrying the same content, because a
 * button that does nothing is precisely what rule P-8 forbids.
 *
 * The popover itself — the seven states, the deliberately broken audit event, the empty queue and the
 * reset — is not here and must not be: it lives in `src/app/simulation-controls.tsx`, which is why the
 * activation crosses this boundary as a callback rather than as an import of `src/app`.
 *
 * Nothing here fetches an asset, reads an environment value or holds a credential (rules B-1 and B-2),
 * and nothing here claims more than the demonstration implements (rule P-4): the badge states that the
 * data is simulated, and when the demonstration's clock reads.
 */
import type { ReactElement } from 'react';

import { DEMO_CLOCK } from '../types';
import type { SimLabel } from '../types';
import { MonoValue } from './mono-value';
import { StatusIndicator } from './status-indicator';

/** Props of {@link SimulatedDataBadge}. */
export interface SimulatedDataBadgeProps {
  /**
   * The exact specification §5.3 label the badge carries, supplied by the shell.
   *
   * Required, with no default: the shell is the one place that decides which fixed string the
   * demonstration-wide badge shows, and a default here would make this module a second owner of that
   * text, able to show a label the shell never asked for (rule P-1). Whatever arrives is rendered
   * character for character, never re-cased and never abbreviated.
   */
  readonly label: SimLabel;
  /**
   * What activating the badge does, when it is a control.
   *
   * Present: the badge renders as a native button that opens the simulation popover, which the shell
   * owns and this module never imports. Absent: the badge renders as a non-interactive span with the
   * same content, so no dead control can exist (rule P-8). The shell passes this callback for as long
   * as the popover is available and omits it otherwise.
   */
  readonly onActivate?: (() => void) | undefined;
  /**
   * Layout-only additions from the shell, such as an order in the top bar's flex row. Never a colour,
   * a surface, an opacity or a font size, each of which would move the badge off the contrast and type
   * values the theme roles already fix (rule B-3).
   */
  readonly className?: string | undefined;
}

/**
 * The badge's shape in both states: the raised second surface inside the control boundary, the 2 px
 * control radius, the 12 px step of the specification §4.3 type scale, and the mono face, because a
 * badge label and a timestamp both read as labels and figures rather than as body copy.
 *
 * `min-h-6 min-w-6` is the 24x24 px minimum target of rule B-3, which the interactive state needs and
 * the non-interactive state wears harmlessly. Every value is a role token, so both themes resolve the
 * same class list to their own measured colours and no raw palette value, `rgb()` call or shadow is
 * reachable from here.
 */
const BADGE_CLASSES = [
  'inline-flex min-h-6 min-w-6 items-center gap-1.5',
  'rounded-control border border-control-boundary bg-surface-2 px-2',
  'font-mono text-12 text-text-primary',
].join(' ');

/**
 * What the badge adds when it is a control: a pointer cursor, a hover fill that steps in to the first
 * surface, a pressed fill that rests on the ground behind the accent boundary, and the 2 px
 * `--color-focus-ring` outline drawn on `focus-visible` so a keyboard user sees where they are while a
 * pointer click leaves no ring behind.
 *
 * The colour transition is `motion-safe:`, so a reduced-motion session gets the same state changes with
 * no animation (rule B-3). Every colour is a role token; no palette literal, arbitrary value or opacity
 * appears in the list, because dimming a label is exactly how contrast falls below the ratio the rule
 * requires.
 */
const INTERACTIVE_CLASSES = [
  'cursor-pointer',
  'hover:border-accent hover:bg-surface-1',
  'active:border-accent active:bg-ground',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/**
 * The separator between the label and the clock, in the secondary text role: it joins two values
 * without competing with either of them, and its contrast is the ratio that role already measures
 * against the surface behind it in each theme.
 */
const SEPARATOR_CLASSES = 'text-text-secondary';

/**
 * The clock itself keeps to one line: an ISO 8601 instant is one value, so it wraps as a whole rather
 * than breaking between its date and its offset. It inherits the primary text role from the badge, and
 * `MonoValue` supplies the mono face with tabular numerals (AAP §0.5.3).
 */
const CLOCK_CLASSES = 'whitespace-nowrap';

/** Joins the class lists that are present, so an omitted `className` leaves no empty entry behind. */
function joinClassNames(...values: readonly (string | undefined)[]): string {
  return values.filter((value): value is string => value !== undefined && value.length > 0).join(' ');
}

/**
 * The demonstration-wide simulated-data badge.
 *
 * The rendered content is identical in both states: the caller's label with its status icon and role
 * colour, the word `at`, and `DEMO_CLOCK` as a machine-readable `<time>` in the mono face. Only the
 * root element differs, so the shell can turn the badge into the control that opens the simulation
 * popover without the badge's own content changing.
 *
 * The accessible name of the interactive state is its visible text — `<label> at <clock>` — so the name
 * contains the visible label (WCAG 2.2 SC 2.5.3) and a reader is told both what the badge says and what
 * activating it did. `aria-haspopup="dialog"` announces that the activation opens the popover the
 * shell attaches to the callback.
 *
 * @param props The fixed label the shell chose, the optional activation callback, and layout classes.
 * @returns A native `button` when `onActivate` is supplied, and a non-interactive `span` otherwise.
 */
export function SimulatedDataBadge({
  label,
  onActivate,
  className,
}: SimulatedDataBadgeProps): ReactElement {
  const content = (
    <>
      <StatusIndicator meaning="simulated" label={label} />
      {/* The spaces are the badge's word separators, not its spacing: a flex container does not
          render a whitespace-only text run, so the visual gap stays the `gap-1.5` above while the
          accessible name reads `<label> at <clock>` instead of running the three values together. */}
      {' '}
      <span className={SEPARATOR_CLASSES}>at</span>
      {' '}
      <time className={CLOCK_CLASSES} dateTime={DEMO_CLOCK}>
        <MonoValue value={DEMO_CLOCK} kind="timestamp" />
      </time>
    </>
  );

  if (onActivate === undefined) {
    return <span className={joinClassNames(BADGE_CLASSES, className)}>{content}</span>;
  }

  return (
    <button
      type="button"
      className={joinClassNames(BADGE_CLASSES, INTERACTIVE_CLASSES, className)}
      aria-haspopup="dialog"
      onClick={() => {
        onActivate();
      }}
    >
      {content}
    </button>
  );
}
