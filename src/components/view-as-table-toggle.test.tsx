/**
 * Component suite for `view-as-table-toggle.tsx`, the control that exposes a chart's table form.
 *
 * Success criterion 9 makes a working "View as table" toggle a pass condition, and rule B-3 makes
 * it a keyboard-operable control with an announced state, so each of those properties is asserted
 * here against the component's own contract: the two fixed labels, the `aria-pressed` state, the
 * request an activation makes, keyboard-only operation, the accessible name with and without a
 * chart label, and the shape of the rendered element (one native button, no `tabIndex`, never
 * disabled). The parent that owns the state is exercised through a small harness, which is how
 * `ChartFrame` uses the control.
 *
 * Renders under the default jsdom environment; nothing here hashes or reads the clock.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VIEW_AS_TABLE_LABELS, ViewAsTableToggle } from './view-as-table-toggle';
import type { Viewing } from './view-as-table-toggle';

/** A chart title used as the accessible context in the `chartLabel` case. */
const CHART_LABEL = 'Revenue at risk by plant';

/** Renders the control with the props a test does not vary. */
function renderToggle(
  viewing: Viewing,
  onViewingChange: (next: Viewing) => void,
): ReturnType<typeof render> {
  return render(<ViewAsTableToggle viewing={viewing} onViewingChange={onViewingChange} />);
}

describe('ViewAsTableToggle', () => {
  it('states the chart view as "View as table" and the table view as "View as chart"', () => {
    // The wording is fixed by success criterion 9 and quoted by the browser checks, so it is
    // asserted here as the single owner's own value rather than retyped in each test.
    expect(VIEW_AS_TABLE_LABELS.showTable).toBe('View as table');
    expect(VIEW_AS_TABLE_LABELS.showChart).toBe('View as chart');
  });

  it('offers the table while the chart is shown, with aria-pressed false', () => {
    renderToggle('chart', vi.fn());

    const toggle = screen.getByRole('button', { name: VIEW_AS_TABLE_LABELS.showTable });

    expect(toggle).toHaveTextContent(VIEW_AS_TABLE_LABELS.showTable);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toBeEnabled();
  });

  it('offers the chart while the table is shown, with aria-pressed true', () => {
    renderToggle('table', vi.fn());

    const toggle = screen.getByRole('button', { name: VIEW_AS_TABLE_LABELS.showChart });

    expect(toggle).toHaveTextContent(VIEW_AS_TABLE_LABELS.showChart);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('asks for the table when activated from the chart view', async () => {
    const onViewingChange = vi.fn();
    renderToggle('chart', onViewingChange);

    await userEvent.click(screen.getByRole('button'));

    expect(onViewingChange).toHaveBeenCalledTimes(1);
    expect(onViewingChange).toHaveBeenCalledWith('table');
  });

  it('asks for the chart when activated from the table view', async () => {
    const onViewingChange = vi.fn();
    renderToggle('table', onViewingChange);

    await userEvent.click(screen.getByRole('button'));

    expect(onViewingChange).toHaveBeenCalledTimes(1);
    expect(onViewingChange).toHaveBeenCalledWith('chart');
  });

  it('is reachable and operable by keyboard alone', async () => {
    const user = userEvent.setup();
    const onViewingChange = vi.fn();
    renderToggle('chart', onViewingChange);

    await user.tab();

    const toggle = screen.getByRole('button', { name: VIEW_AS_TABLE_LABELS.showTable });
    expect(toggle).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onViewingChange).toHaveBeenLastCalledWith('table');

    await user.keyboard(' ');
    expect(onViewingChange).toHaveBeenLastCalledWith('table');
    expect(onViewingChange).toHaveBeenCalledTimes(2);
  });

  it('names the chart it belongs to when a chart label is supplied', () => {
    render(<ViewAsTableToggle viewing="chart" onViewingChange={vi.fn()} chartLabel={CHART_LABEL} />);

    const toggle = screen.getByRole('button', {
      name: `${VIEW_AS_TABLE_LABELS.showTable}: ${CHART_LABEL}`,
    });

    // The visible label stays a prefix of the accessible name, so the two agree for a
    // speech-recognition user as well as a screen-reader user.
    expect(toggle).toHaveTextContent(VIEW_AS_TABLE_LABELS.showTable);
  });

  it('renders exactly one native button, with no tabIndex and no pointer-only surface', () => {
    const { container } = renderToggle('chart', vi.fn());

    const buttons = screen.getAllByRole('button');

    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.tagName).toBe('BUTTON');
    expect(buttons[0]).toHaveAttribute('type', 'button');
    expect(buttons[0]).not.toHaveAttribute('tabindex');
    expect(container.querySelector('[role="button"]')).toBeNull();
  });

  it('appends a caller class for layout without dropping its own styling', () => {
    render(<ViewAsTableToggle viewing="chart" onViewingChange={vi.fn()} className="self-end" />);

    expect(screen.getByRole('button')).toHaveClass('self-end', 'rounded-control');
  });

  it('follows the parent that owns the viewing state', async () => {
    const user = userEvent.setup();

    function Harness(): ReactElement {
      const [viewing, setViewing] = useState<Viewing>('chart');
      return <ViewAsTableToggle viewing={viewing} onViewingChange={setViewing} />;
    }

    render(<Harness />);

    await user.click(screen.getByRole('button', { name: VIEW_AS_TABLE_LABELS.showTable }));

    const switched = screen.getByRole('button', { name: VIEW_AS_TABLE_LABELS.showChart });
    expect(switched).toHaveAttribute('aria-pressed', 'true');

    await user.click(switched);

    expect(screen.getByRole('button', { name: VIEW_AS_TABLE_LABELS.showTable })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
