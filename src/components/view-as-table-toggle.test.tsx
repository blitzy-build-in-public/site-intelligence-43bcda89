/**
 * Component suite for `view-as-table-toggle.tsx`, the control that exposes a chart's table form.
 *
 * Two obligations make this control a pass condition rather than a nicety: success criterion 9
 * requires a working table view of every chart, map and graph, and rule B-3 requires every
 * interactive element to be keyboard operable with a visible focus indicator and an announced
 * state. Each case below asserts one clause of the component's own contract — the two labels the
 * exported constant owns and the accessible name that states the action in each direction, the
 * request an activation makes, keyboard-only operation, the accessible name with and without a
 * chart label, the shape of the rendered element (one native button, no `tabIndex`, never
 * disabled), the 24x24 px target and focus-ring tokens, and rendering under both themes. The
 * parent that owns the state is exercised through a two-line harness, which is how
 * `./chart-frame.tsx` composes the control.
 *
 * Renders under the jsdom environment `vite.config.ts` configures; nothing here hashes, reads the
 * clock or shows a figure (rule P-6).
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VIEW_AS_TABLE_LABELS, ViewAsTableToggle } from './view-as-table-toggle';
import type { Viewing } from './view-as-table-toggle';

/**
 * The two labels the control renders, read from their single owner so this suite never retypes the
 * wording: a reworded label changes the component and this suite together, and nothing here can
 * drift from what a user reads.
 */
const { showChart, showTable } = VIEW_AS_TABLE_LABELS;

/** A chart title, used as the accessible context of the `chartLabel` clause. */
const CHART_LABEL = 'Revenue at risk by plant';

/** A callback for the cases that assert on the rendered control rather than on the request. */
const noop = (): void => {};

/**
 * Renders the control with the props a case does not vary, and hands back its button — the only
 * element the component renders.
 *
 * `chartLabel` is applied only when it is supplied, because the component distinguishes an absent
 * label from a present one and an explicit `undefined` would not exercise that distinction.
 */
function renderToggle(
  viewing: Viewing,
  onViewingChange: (next: Viewing) => void = noop,
  chartLabel?: string,
): HTMLButtonElement {
  render(
    chartLabel === undefined ? (
      <ViewAsTableToggle viewing={viewing} onViewingChange={onViewingChange} />
    ) : (
      <ViewAsTableToggle
        viewing={viewing}
        onViewingChange={onViewingChange}
        chartLabel={chartLabel}
      />
    ),
  );
  return screen.getByRole('button');
}

/** Leaves `<html>` on the default theme for whichever suite runs next. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('ViewAsTableToggle', () => {
  it('offers the table while the chart is shown, stating that action in its name alone', () => {
    const toggle = renderToggle('chart');

    expect(toggle).toHaveAccessibleName(showTable);
    expect(toggle).toHaveTextContent(showTable);
    // One model states one thing: the name carries the state, so no pressed state sits beside it.
    expect(toggle).not.toHaveAttribute('aria-pressed');
    expect(toggle).not.toHaveAttribute('aria-selected');
    expect(toggle).not.toHaveAttribute('aria-current');
    expect(toggle).toBeEnabled();
  });

  it('offers the chart while the table is shown, stating the opposite action and no mode', () => {
    const toggle = renderToggle('table');

    expect(toggle).toHaveAccessibleName(showChart);
    expect(toggle).toHaveTextContent(showChart);
    // "View as chart" reports nothing about the table, so a `pressed` state here would contradict
    // the name a screen-reader user just heard. The control is a plain button whose name changes.
    expect(toggle).not.toHaveAttribute('aria-pressed');
    expect(toggle).not.toHaveAttribute('aria-selected');
    expect(toggle).not.toHaveAttribute('aria-current');
    expect(toggle).toBeEnabled();
  });

  it('asks for the table when activated from the chart view', async () => {
    const onViewingChange = vi.fn();
    const toggle = renderToggle('chart', onViewingChange);

    await userEvent.click(toggle);

    expect(onViewingChange).toHaveBeenCalledTimes(1);
    expect(onViewingChange).toHaveBeenCalledWith('table');
  });

  it('asks for the chart when activated from the table view', async () => {
    const onViewingChange = vi.fn();
    const toggle = renderToggle('table', onViewingChange);

    await userEvent.click(toggle);

    expect(onViewingChange).toHaveBeenCalledTimes(1);
    expect(onViewingChange).toHaveBeenCalledWith('chart');
  });

  it.each([
    { keyPress: '{Enter}', keyName: 'Enter' },
    // user-event addresses the space bar by its physical code: its keyboard map names no `Space`
    // key, so `{Space}` would arrive as an unknown key and prove nothing about the control.
    { keyPress: '[Space]', keyName: 'Space' },
  ])(
    'T-16 activates by keyboard alone with $keyName, requesting the table exactly once',
    async ({ keyPress }) => {
      const user = userEvent.setup();
      const onViewingChange = vi.fn();
      const toggle = renderToggle('chart', onViewingChange);

      await user.tab();
      expect(toggle).toHaveFocus();

      await user.keyboard(keyPress);

      expect(onViewingChange).toHaveBeenCalledTimes(1);
      expect(onViewingChange).toHaveBeenCalledWith('table');
    },
  );

  it('stays on the representation its parent supplies until the parent switches it', async () => {
    const onViewingChange = vi.fn();
    const toggle = renderToggle('chart', onViewingChange);

    await userEvent.click(toggle);

    // The control holds no state: with a fixed `viewing` prop it reports the request and keeps
    // showing the chart until the parent renders the value it was asked for.
    expect(onViewingChange).toHaveBeenCalledWith('table');
    expect(toggle).toHaveAccessibleName(showTable);
    expect(toggle).not.toHaveAttribute('aria-pressed');
    expect(screen.queryByRole('button', { name: showChart })).toBeNull();
  });

  it.each([
    { chartLabel: CHART_LABEL, expectedName: `${showTable}: ${CHART_LABEL}` },
    { chartLabel: undefined, expectedName: showTable },
  ])(
    'names the chart it belongs to so two toggles are distinct, falling back to the label alone (chartLabel: $chartLabel)',
    ({ chartLabel, expectedName }) => {
      const toggle = renderToggle('chart', noop, chartLabel);

      expect(toggle).toHaveAccessibleName(expectedName);
      // The visible label stays a prefix of the accessible name, so the text a user reads and the
      // name a screen reader announces agree.
      expect(toggle).toHaveTextContent(showTable);
    },
  );

  it('renders one native button, with no role override and no tab stop of its own', () => {
    const toggle = renderToggle('chart');

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle).toHaveAttribute('type', 'button');
    expect(toggle).not.toHaveAttribute('tabindex');
    expect(toggle.tabIndex).toBe(0);
    expect(document.querySelector('[role="button"]')).toBeNull();
    // No second state model replaces the pressed state the action name makes unnecessary.
    expect(document.querySelector('[role="switch"]')).toBeNull();
    // Rule P-8: a control that cannot act must not exist, so neither disabled attribute appears.
    expect(toggle).not.toHaveAttribute('disabled');
    expect(toggle).not.toHaveAttribute('aria-disabled');
  });

  it('meets the 24x24 px target and carries the focus-ring token, with no shadow', () => {
    const toggle = renderToggle('chart');

    // Rule B-3's minimum target is asserted as the tokens that produce it at the 4 px spacing
    // scale, and the focus ring as the 2 px `--color-focus-ring` outline drawn for keyboard focus.
    expect(toggle).toHaveClass('min-h-6');
    expect(toggle).toHaveClass('min-w-6');
    expect(toggle).toHaveClass('focus-visible:outline-2');
    expect(toggle).toHaveClass('focus-visible:outline-focus-ring');
    expect(toggle).toHaveClass('rounded-control');
    expect(toggle).toHaveClass('border-control-boundary');
    // Specification §4.3 exposes no shadow token, so an elevated control must not exist.
    expect(toggle.className).not.toMatch(/\bshadow-/);
  });

  it('answers the pointer with a hover fill and a pressed pair from role tokens', () => {
    const toggle = renderToggle('chart');

    /* Pressure and hover feedback are part of the control contract rather than a detail of one
       component: the control states the hover fill it was missing beside the pressed pair, and both
       are role tokens so neither theme bakes in a palette value. */
    expect(toggle).toHaveClass('hover:bg-surface-1');
    expect(toggle).toHaveClass('hover:text-text-primary');
    expect(toggle).toHaveClass('active:bg-surface-2');
    expect(toggle).toHaveClass('active:border-accent');
    // Rule B-3: the colour change is carried by a transition a reduced-motion session never runs.
    expect(toggle).toHaveClass('motion-safe:transition-colors');
    expect(toggle).toHaveClass('motion-safe:duration-150');
  });

  it.each(['command', 'paper'] as const)(
    'renders under the %s theme from role tokens alone',
    (theme) => {
      document.documentElement.dataset.theme = theme;

      const toggle = renderToggle('chart');

      expect(document.documentElement.dataset.theme).toBe(theme);
      // Each theme file supplies the value behind these role tokens, so the control renders
      // unchanged under both and picks no palette value of its own.
      expect(toggle).toHaveClass('text-text-secondary');
      expect(toggle).toHaveClass('border-control-boundary');
      expect(toggle).toHaveClass('focus-visible:outline-focus-ring');
      expect(toggle.className).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(toggle).toBeEnabled();
    },
  );

  it('follows the parent that owns the viewing state, from the chart to the table and back', async () => {
    const user = userEvent.setup();

    function Harness(): ReactElement {
      const [viewing, setViewing] = useState<Viewing>('chart');
      return <ViewAsTableToggle viewing={viewing} onViewingChange={setViewing} />;
    }

    render(<Harness />);

    await user.click(screen.getByRole('button', { name: showTable }));

    const switched = screen.getByRole('button', { name: showChart });
    expect(switched).not.toHaveAttribute('aria-pressed');

    await user.click(switched);

    const switchedBack = screen.getByRole('button', { name: showTable });
    expect(switchedBack).not.toHaveAttribute('aria-pressed');
    // The name alone reports the change in both directions, with no mode announced beside it.
    expect(screen.queryByRole('button', { name: showChart })).toBeNull();
  });

  it('keeps the caller layout class alongside its own styling', () => {
    render(<ViewAsTableToggle viewing="chart" onViewingChange={noop} className="self-end" />);

    expect(screen.getByRole('button')).toHaveClass('self-end', 'rounded-control');
  });
});
