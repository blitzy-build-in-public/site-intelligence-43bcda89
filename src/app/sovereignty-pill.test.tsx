/**
 * Component suite for `src/app/sovereignty-pill.tsx`: the shell's statement of what the deployment
 * declares about itself, and the surface rule P-4 governs in the top bar.
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP.
 * - P-4: the pill states the declared posture exactly as the module's own `DECLARED_POSTURE_LABEL`
 *   holds it, and that sentence opens with the word the rule requires of a declared configuration.
 *   The case reads the constant instead of retyping the sentence, so a reworded label fails through
 *   the rendered text rather than passing against a copy of its old wording.
 * - P-4 and P-1: the tag beside it is `SIM_LABELS[4]`, the `Simulated control` string of
 *   specification §5.3, read from the tuple that owns the seven fixed strings. The rendered pair's
 *   whole text is asserted, so a tag that went missing, arrived twice, or was replaced by another
 *   member of the tuple fails rather than passing on a `getByText` that finds one of them.
 * - B-3: the tag is a `StatusIndicator`, so the meaning arrives as icon, status colour and text
 *   together. The case asserts the colour role the shared table resolves for `simulated` reaches the
 *   icon wrapper, and that the icon is hidden from assistive technology so the label is the single
 *   accessible name.
 * - B-3 and P-8: the pair is a label and not a control. It carries no focus stop, no interactive
 *   element and no `tabIndex`, so a keyboard reader tabbing the top bar passes it by, and nothing
 *   here claims an action it cannot perform.
 *
 * WHAT IS NOT HERE. No axe assertion runs: rule B-3's axe pass belongs to the browser suite on every
 * route (AAP §0.7, T-16), and this suite proves the pair's labelling and its absence of a focus stop
 * rather than auditing contrast. The suite needs no service and binds none: the pill reads nothing
 * (rule P-2 is satisfied by the module having no data boundary at all), so no port member is stubbed
 * and a read added to the module would fail here as a missing mock rather than pass quietly.
 *
 * NO FIXED STRING IS RETYPED. The posture sentence and the tag are both read from the modules that
 * own them (rule P-1); the only word this file spells is `Declared`, which is rule P-4's own word for
 * the label rather than a product string a module owns.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MEANING_COLOUR_CLASSES } from '../components/status-indicator';
import { SIM_LABELS } from '../types/primitives';
import { DECLARED_POSTURE_LABEL, SovereigntyPill } from './sovereignty-pill';

/* ---------------------------------------------------------------------------------------------
 * The strings this suite reads from their owners
 * ------------------------------------------------------------------------------------------- */

/** The `Simulated control` tag: the fifth of the seven fixed §5.3 strings, read from its owner. */
const SIMULATED_CONTROL_LABEL = SIM_LABELS[4];

/** The word rule P-4 requires a declared configuration to be labelled with. */
const DECLARED_WORD = 'Declared';

/** Every role a focusable or interactive element can take, none of which this pill may carry. */
const CONTROL_ROLES: readonly string[] = [
  'button',
  'link',
  'checkbox',
  'combobox',
  'radio',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
];

/* ---------------------------------------------------------------------------------------------
 * The cases
 * ------------------------------------------------------------------------------------------- */

describe('SovereigntyPill — the declared posture and its simulated-control tag', () => {
  it('states the declared configuration sentence its own module owns', () => {
    render(<SovereigntyPill />);

    expect(screen.getByText(DECLARED_POSTURE_LABEL)).toBeInTheDocument();
  });

  it('opens the statement with the word rule P-4 requires of a declared configuration', () => {
    render(<SovereigntyPill />);

    expect(DECLARED_POSTURE_LABEL.startsWith(DECLARED_WORD)).toBe(true);
    expect(screen.getByText(DECLARED_POSTURE_LABEL).textContent?.startsWith(DECLARED_WORD)).toBe(
      true,
    );
  });

  it('tags the statement with the exact Simulated control label read from SIM_LABELS', () => {
    render(<SovereigntyPill />);

    const posted = screen.getByText(DECLARED_POSTURE_LABEL);
    const pair = posted.parentElement;

    /* The tag is the fifth fixed string, and the pair's whole text is the sentence followed by it:
       a second label, a paraphrased tag or a missing one changes this text and fails here. */
    expect(pair?.textContent).toBe(`${DECLARED_POSTURE_LABEL}${SIMULATED_CONTROL_LABEL}`);
  });

  it('carries the tag meaning as icon, status colour and visible text together', () => {
    const { container } = render(<SovereigntyPill />);

    const tag = screen.getByText(SIMULATED_CONTROL_LABEL);
    const iconWrapper = tag.previousElementSibling;

    /* The status role colour of the simulated meaning, resolved through the table that owns it, so a
       restyle to another equivalent role token flows from that table into this case. */
    expect(iconWrapper?.className).toContain(MEANING_COLOUR_CLASSES.simulated);
    /* The icon is decorative: the label is the status's single accessible name (rule B-3). */
    expect(iconWrapper?.getAttribute('aria-hidden')).toBe('true');
    expect(iconWrapper?.querySelector('svg')).not.toBeNull();
    /* One tag, not two: the pair holds exactly one simulated-control label. */
    expect(screen.getAllByText(SIMULATED_CONTROL_LABEL)).toHaveLength(1);
    expect(container.textContent).toContain(SIMULATED_CONTROL_LABEL);
  });

  it('invents no focus stop and no control', async () => {
    const user = userEvent.setup();
    const { container } = render(<SovereigntyPill />);

    for (const role of CONTROL_ROLES) {
      expect(screen.queryAllByRole(role)).toStrictEqual([]);
    }

    const focusable = container.querySelectorAll(
      'a, button, input, select, textarea, [tabindex], [contenteditable]',
    );

    expect(focusable).toHaveLength(0);

    /* Tab from the document reaches nothing inside the pill: a label that cannot be operated is not
       a stop in the page's focus order (rule B-3, rule P-8). */
    await user.tab();

    expect(container.contains(document.activeElement)).toBe(false);
  });
});
