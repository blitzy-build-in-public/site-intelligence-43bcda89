/**
 * The declared-posture pill of the Site Intelligence shell's top bar.
 *
 * The pill is the top bar's statement of what the deployment declares about itself, so it is the one
 * place the shell names a processing tier and an outbound posture. Rule P-4 is why it exists and why
 * it is worded the way it is: the application never states or implies that it establishes
 * sovereignty or that it protects what it holds, so the posture appears as declared configuration —
 * the word "Declared" opens the label and the `Simulated control` tag of specification §5.3 closes
 * it, because nothing in the demonstration has checked the declaration. The blocked-request totals
 * that could read as evidence belong to SCR-07's outbound ledger, which computes them from audit
 * events; this file counts nothing.
 *
 * Both strings are fixed and neither is invented here. {@link DECLARED_POSTURE_LABEL} is the exact
 * posture text AAP 0.10 fixes for the top bar, held as its single owner so the shell, a test and the
 * README cannot drift apart on it. The tag is not spelled here at all: it is read from `SIM_LABELS`
 * in `src/types/primitives.ts`, the one owner of the seven §5.3 simulation labels (rule P-1), and
 * rendered through {@link StatusIndicator} with `meaning="simulated"`, which paints the icon, the
 * label and the status role colour together — a meaning is never carried by colour alone (rule B-3).
 *
 * Nothing is read and nothing is computed: no service call, no clock read, no environment read and no
 * count, so the pill says the same thing on every route and in both themes. The pair is a label
 * rather than a control, so it carries no focus stop: rule P-8 requires a control that works or is
 * visibly disabled with its reason, and neither applies to text that does nothing by design. Colour
 * comes from role tokens only, so Command and Paper each supply their own measured pairing for the
 * same two strings.
 */
import type { ReactElement } from 'react';

import { StatusIndicator } from '../components/status-indicator';
import { SIM_LABELS } from '../types/primitives';

/**
 * The declared posture the top bar states, exactly as AAP 0.10 fixes it — including the middle dot
 * with a single space either side of it.
 *
 * One owner for the text, the way `src/components/view-as-table-toggle.tsx` owns its control's
 * words: the pill renders the constant rather than a copy of the sentence, and a surface test names
 * the same constant instead of retyping the string. It states what configuration declares — the
 * processing tier and the outbound posture — and claims nothing beyond that declaration (rule P-4).
 */
export const DECLARED_POSTURE_LABEL = 'Declared: tier S3 · outbound blocked';

/**
 * The `Simulated control` tag, selected from the tuple that owns the seven §5.3 strings rather than
 * spelled again in this file: `SimLabel` has exactly one owner in `src/types/primitives.ts` (rule
 * P-1), and a second copy of the text here could drift from it.
 *
 * The member is taken by its position in that tuple, whose order is the specification's own, so no
 * string literal of the label appears in this file. A reordering of `SIM_LABELS` therefore has to be
 * mirrored here — the tuple's fifth member is the control label.
 */
const SIMULATED_CONTROL_LABEL = SIM_LABELS[4];

/**
 * The posture pair the top bar renders after the freshness strip: the declared posture in the mono
 * face at the `text-13` step of the type scale, then the simulation tag that says the statement is
 * a control's, not a measurement.
 *
 * The root is a `<span>` because the pair is inline content that belongs inside the bar's own row —
 * no landmark, no list and no heading is added here. It takes no `tabIndex` and no interactive ARIA
 * state, so a reader tabbing through the bar's real controls passes it by, which is the correct
 * behaviour for a label that cannot be operated.
 *
 * The sentence itself does not break: it is a fixed string, so reflowing it mid-phrase would read as
 * two labels. The pair wraps between its two halves, which lets the fixed wording and the tag share
 * a narrow top bar without either being rewrapped. The surface is the first raised role with the
 * decorative hairline rather than the control boundary, so the pill never reads as something to
 * press.
 */
export function SovereigntyPill(): ReactElement {
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-control border border-hairline bg-surface-1 px-2 py-1">
      <span className="font-mono text-13 whitespace-nowrap text-text-primary">
        {DECLARED_POSTURE_LABEL}
      </span>
      <StatusIndicator meaning="simulated" label={SIMULATED_CONTROL_LABEL} />
    </span>
  );
}
