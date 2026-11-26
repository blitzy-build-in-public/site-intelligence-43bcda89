/**
 * The Command/Paper theme switch of the top bar.
 *
 * AAP 0.13.1 fixes its contract — the Command/Paper switch writes the stored value and the
 * `data-theme` attribute together, carries an accessible name, and is one of the two levers the
 * browser tests may use — and AAP 0.12.4 places it in the top bar between the simulated-data badge
 * and the density switch. It names the theme in effect and offers the other one, so a reader always
 * sees where they are and what activating the control will do.
 *
 * It is a controlled view of the theme context: `setTheme` in `./theme-provider` persists the choice
 * and applies both attributes, so this module holds no state, runs no effect, and reads neither
 * `document` nor browser storage. Both names come from `THEME_LABELS` there, so the two theme names
 * have one owner.
 *
 * Rules served: B-1 (text and role tokens only — no asset, icon font or fetched resource), B-2 (no
 * environment value and no credential), B-3 (a native button, a 24x24 px target, a visible focus
 * ring and an accessible name that contains the visible label), P-1 (a theme control, not a
 * simulation control, so it carries no simulation label), P-6 (no figure is stated here) and P-8
 * (it always performs its function, so it is never disabled and needs no disabled reason).
 */
import { THEME_LABELS, useTheme } from './theme-provider';
import type { Theme } from './theme-provider';

/**
 * The theme in effect, shown beside the control as plain text rather than as a second control:
 * reading which theme is on is not an action, so it takes no target size and no focus stop.
 * `text-text-caption` is the caption role, which each theme measures against its own ground.
 */
const CURRENT_THEME_CLASSES = 'font-mono text-12 text-text-caption';

/**
 * The switch itself: the bordered, secondary-text control of specification §4.3, built from role
 * tokens only — `rounded-control` for the 2 px radius, `border-control-boundary` for the boundary,
 * `text-12` with `font-mono` for the label, and `min-h-6 min-w-6` with `px-2` for a 24x24 px target.
 *
 * The focus ring is drawn on `focus-visible` from the `--color-focus-ring` role, so a keyboard user
 * sees where they are and a pointer click leaves no ring behind; the offset keeps the ring clear of
 * the boundary it meets. The hover tint and its transition use role tokens, and `motion-safe:` keeps
 * the transition out of a reduced-motion session.
 */
const SWITCH_CLASSES = [
  'inline-flex min-h-6 min-w-6 items-center justify-center',
  'rounded-control border border-control-boundary px-2',
  'bg-transparent font-mono text-12 text-text-secondary',
  'hover:text-text-primary',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/**
 * The theme an activation asks for: always the other one of the two, so the control's label states
 * the action it performs rather than the state it is already in.
 */
function otherTheme(theme: Theme): Theme {
  return theme === 'command' ? 'paper' : 'command';
}

/**
 * The Command/Paper theme switch, with no props: the theme and its setter are the context's.
 *
 * It renders one native `<button>`, so `Enter` and `Space` activate it and the browser owns the
 * keyboard behaviour; no key handler, `tabIndex` or `role` is declared. Its accessible name reads
 * `Switch colour theme: <target>` while its visible label is `<target>` alone, so the name contains
 * the visible label (WCAG 2.2 SC 2.5.3) and a role-and-name query finds it in either theme.
 */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const next = otherTheme(theme);

  return (
    <div className="flex items-center gap-1">
      <span className={CURRENT_THEME_CLASSES}>{THEME_LABELS[theme]}</span>
      <button
        type="button"
        aria-label={`Switch colour theme: ${THEME_LABELS[next]}`}
        className={SWITCH_CLASSES}
        onClick={() => {
          setTheme(next);
        }}
      >
        {THEME_LABELS[next]}
      </button>
    </div>
  );
}
