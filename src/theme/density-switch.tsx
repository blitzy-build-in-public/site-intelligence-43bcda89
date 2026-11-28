/**
 * The row-density switch of the shell: the control that flips the application between the compact
 * 32 px rows and the comfortable 44 px rows of specification §4.3.
 *
 * The switch states the density in effect and labels its control with the other one, so activating
 * the control performs exactly what its label promises (rule P-8). Nothing about the choice is held
 * here: `src/theme/theme-provider.tsx` owns the `data-density` attribute on `<html>`, the persisted
 * value and the persona default of AAP 0.12.4, and its `setDensity` writes the stored value and the
 * attribute together. This module therefore keeps no state, runs no effect, and reaches neither
 * browser storage nor `document`; it reads the two names it renders from `DENSITY_LABELS`, so no
 * second module re-types them.
 *
 * Fixed by AAP 0.12.4 (the switch sits in the top bar after the theme switch, with compact rows for
 * the material planner, the production planner and the supplier quality engineer, comfortable rows
 * for the other five personas, and a chosen density winning over that default) and AAP 0.13.1 (the
 * file's place in `src/theme/`).
 */
import { useId } from 'react';

import { DENSITY_LABELS, useTheme } from './theme-provider';
import type { Density } from './theme-provider';

/** The density in effect beside the control that changes it, on the 4 px spacing grid. */
const SWITCH_LAYOUT_CLASSES = 'flex items-center gap-1';

/**
 * The density currently in effect: the caption text role in the tabular face, so the two states of
 * the control are told apart by a word and not by colour alone (rule B-3).
 *
 * The id it carries is what the switch's `aria-describedby` points at, so the density in effect is
 * announced with the control — `<name>, button, <density in effect>` — instead of being a neighbouring
 * word a screen reader reaches on its own. It is a description and not a pressed state because the
 * button's name and visible label already state the density it offers: `aria-pressed` on a control
 * whose name flips from `comfortable` to `compact` would contradict that name and reverse its meaning
 * at every switch, while the description adds the one fact the name leaves out.
 */
const CURRENT_DENSITY_CLASSES = 'font-mono text-12 text-text-caption';

/**
 * The control itself: role tokens only — `rounded-control` for the 2 px radius,
 * `--color-control-boundary` for its edge, `text-text-secondary` lightening to
 * `text-text-primary` on hover, and the type scale's 12 px in the tabular face.
 *
 * `min-h-6 min-w-6` is the 24x24 px target rule B-3 sets, on top of the `px-2` inset. The
 * `focus-visible` outline is the 2 px `--color-focus-ring` role, drawn for keyboard focus only, so
 * the ring a keyboard user needs is never suppressed. The pointer states are the theme switch's, so
 * the two controls sit in the top bar as one pair: `hover:` fills the first surface behind the label
 * and `active:` holds the accent boundary over the second surface while the control is pressed. The
 * colour transition is `motion-safe:`, which leaves it out of a session that asks for reduced motion.
 */
const DENSITY_BUTTON_CLASSES = [
  'inline-flex min-h-6 min-w-6 items-center justify-center',
  'rounded-control border border-control-boundary px-2',
  'font-mono text-12 text-text-secondary',
  'hover:bg-surface-1 hover:text-text-primary',
  'active:border-accent active:bg-surface-2',
  'focus-visible:outline-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/**
 * Switches row density between `compact` (32 px rows) and `comfortable` (44 px rows).
 *
 * Renders the density in effect and one native `<button>` offering the other. The button is native
 * and carries no `tabIndex`, no `role` and no key handler, so `Enter` and `Space` activate it and the
 * browser owns the keyboard behaviour; it is never disabled, because choosing how tightly to read a
 * table always performs its function. Its accessible name is
 * `Switch row density: <the density it offers>`, which contains the visible label word for word, so
 * the words a user reads and the words a screen reader announces agree (WCAG 2.2 SC 2.5.3), and its
 * description is the density in effect, so a reader is told the state as well as the action.
 *
 * The density a persona starts on, and a density the reader has chosen taking precedence over it,
 * are the provider's work (AAP 0.12.4); this export is the switch AAP 0.13.1 places in `src/theme/`.
 *
 * @returns The current density and the control that selects the other one.
 */
export function DensitySwitch() {
  const { density, setDensity } = useTheme();
  const currentDensityId = useId();
  const next: Density = density === 'compact' ? 'comfortable' : 'compact';

  return (
    <div className={SWITCH_LAYOUT_CLASSES}>
      <span id={currentDensityId} className={CURRENT_DENSITY_CLASSES}>
        {DENSITY_LABELS[density]}
      </span>
      <button
        type="button"
        aria-label={`Switch row density: ${DENSITY_LABELS[next]}`}
        aria-describedby={currentDensityId}
        className={DENSITY_BUTTON_CLASSES}
        onClick={() => {
          setDensity(next);
        }}
      >
        {DENSITY_LABELS[next]}
      </button>
    </div>
  );
}
