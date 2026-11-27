/**
 * Component suite for `state-boundary.tsx`: the seven screen states of specification §8, each with the
 * one rendering AAP §0.5.2 gives it, and the freshness banner T-13 asserts.
 *
 * Each case asserts the contract rather than the markup. The two warning states keep the content on
 * screen — a stale or partial figure is still the figure a planner came to read — while the five that
 * replace it withhold the content, so a reader is never shown a half-read screen as a complete one.
 * The stale banner names the source it was handed and the instant that source last answered, in the
 * tabular mono face, which is the visible half of the freshness rule the service's own refusal is the
 * other half of (AAP §0.2.1). Every control the boundary can render exists only when a handler was
 * supplied (rule P-8), is reachable by keyboard and announces its own name (rule B-3), and no state
 * spells a simulation label of its own, because `Simulated data` belongs to the shell's badge
 * (rule P-1).
 *
 * The permission, the roles and the instant below are this suite's own caller-level input, standing
 * for values a service `Problem` and a `Result.meta` supply at run time: the component types none of
 * them itself (rule P-6). Nothing here hashes or reads the clock, so the jsdom environment that
 * `vite.config.ts` sets by default applies.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SIM_LABELS } from '../types';
import type { ScreenState, ThemeName } from '../types';
import { STATE_BOUNDARY_TEXT, StateBoundary } from './state-boundary';
import type { StateBoundaryForbidden, StateBoundaryStale } from './state-boundary';

/** The content a screen hands the boundary, and the proof that it renders or is withheld. */
const CONTENT = 'Projected closing stock';

/** A source record shaped like one entry of `Result.meta.freshness`. */
const STALE: StateBoundaryStale = {
  source: 'erp',
  label: 'ERP',
  asOf: '2026-11-28T06:00:00+01:00',
};

/** A denial shaped like the evidence a `'permission'` `Problem` carries. */
const FORBIDDEN: StateBoundaryForbidden = {
  permission: 'approval.decide',
  roles: ['plant-manager', 'head-of-supply-chain'],
  traceId: 'trace-1a2b3c4d',
};

/** A screen's own fixed sentence for the empty state. */
const EMPTY_MESSAGE = 'No options yet for this exception type.';

/** A screen's own sentence naming the inputs a partial read did not answer with. */
const PARTIAL_MESSAGE = 'The scheduling source did not report line rates.';

/** A screen's own sentence saying what moved while the reader was on the page. */
const CONFLICT_MESSAGE = 'Another planner changed the owner while you were reading it.';

/** The seven members of `ScreenState`, walked by the theme case so none is left unchecked. */
const STATES: readonly ScreenState[] = [
  'loading',
  'empty',
  'stale',
  'partial',
  'offline',
  'forbidden',
  'conflict',
];

/** Both themes, because a component that resolved a colour itself would look right in one of them. */
const THEMES: readonly ThemeName[] = ['command', 'paper'];

/** A class list that names a palette value, an explicit colour function call or a shadow, none of
 * which may appear: both themes resolve the same role tokens instead. */
const FORBIDDEN_CLASS_PATTERN = /#[0-9a-fA-F]{3,8}|rgba?\(|shadow/i;

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('StateBoundary', () => {
  it('T-17 renders the content it was given when no exceptional state holds', () => {
    render(
      <StateBoundary>
        <p>{CONTENT}</p>
      </StateBoundary>,
    );

    expect(screen.getByText(CONTENT)).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('T-17 shows a busy skeleton region and withholds the content while loading', () => {
    render(
      <StateBoundary state="loading">
        <p>{CONTENT}</p>
      </StateBoundary>,
    );

    const region = screen.getByRole('status');

    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent(STATE_BOUNDARY_TEXT.loading);
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument();
  });

  it("T-17 shows the caller's empty message and withholds the content when empty", () => {
    render(
      <StateBoundary state="empty" emptyMessage={EMPTY_MESSAGE}>
        <p>{CONTENT}</p>
      </StateBoundary>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(EMPTY_MESSAGE);
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument();
  });

  it('T-17 falls back to the neutral caption when the empty state supplies no message', () => {
    render(
      <StateBoundary state="empty">
        <p>{CONTENT}</p>
      </StateBoundary>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(STATE_BOUNDARY_TEXT.emptyFallback);
  });

  it('T-17 names the source and its as-of instant in the stale banner and still renders the content', () => {
    render(
      <StateBoundary state="stale" stale={STALE}>
        <p>{CONTENT}</p>
      </StateBoundary>,
    );

    const region = screen.getByRole('status');

    expect(region).toHaveTextContent(`${STALE.label}${STATE_BOUNDARY_TEXT.staleSuffix}`);
    expect(region).toHaveTextContent(STALE.asOf);
    /* The instant goes through the one presentation formatter, so it carries the mono face the token
       layer fixes for timestamps rather than a second formatter's opinion of it. */
    expect(screen.getByText(STALE.asOf)).toHaveClass('font-mono');
    expect(screen.getByText(CONTENT)).toBeVisible();
  });

  it('T-17 shows the partial notice above the content and keeps the content rendered', () => {
    render(
      <StateBoundary state="partial" partialMessage={PARTIAL_MESSAGE}>
        <p>{CONTENT}</p>
      </StateBoundary>,
    );

    const region = screen.getByRole('status');

    expect(region).toHaveTextContent(STATE_BOUNDARY_TEXT.partialHeadline);
    expect(region).toHaveTextContent(PARTIAL_MESSAGE);
    expect(screen.getByText(CONTENT)).toBeVisible();
  });

  it('T-17 shows the offline notice in place of the content and retries from the keyboard', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <StateBoundary state="offline" onRetry={onRetry}>
        <p>{CONTENT}</p>
      </StateBoundary>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(STATE_BOUNDARY_TEXT.offlineHeadline);
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument();

    const control = screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel });
    control.focus();
    await user.keyboard('{Enter}');

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('T-17 offers no control where the screen has nothing to repeat', () => {
    render(
      <StateBoundary state="offline">
        <p>{CONTENT}</p>
      </StateBoundary>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('T-17 renders the forbidden card with the permission, roles and trace id it was handed', () => {
    render(
      <StateBoundary state="forbidden" forbidden={FORBIDDEN}>
        <p>{CONTENT}</p>
      </StateBoundary>,
    );

    expect(
      screen.getByRole('heading', {
        name: `Permission required: ${FORBIDDEN.permission}`,
        level: 2,
      }),
    ).toBeVisible();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      ...FORBIDDEN.roles,
    ]);
    expect(screen.getByText(FORBIDDEN.traceId)).toBeVisible();
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument();
  });

  it('T-17 shows the conflict notice in place of the content and re-reads the record when asked', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <StateBoundary state="conflict" conflictMessage={CONFLICT_MESSAGE} onRetry={onRetry}>
        <p>{CONTENT}</p>
      </StateBoundary>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(CONFLICT_MESSAGE);
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.reloadLabel }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('T-17 states no simulation label of its own, which the badge on every route owns', () => {
    render(
      <StateBoundary state="stale" stale={STALE}>
        <p>{CONTENT}</p>
      </StateBoundary>,
    );

    for (const label of SIM_LABELS) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it('T-17 paints every state from role tokens alone, with no palette literal and no shadow', () => {
    for (const theme of THEMES) {
      document.documentElement.setAttribute('data-theme', theme);

      for (const state of STATES) {
        const { container, unmount } = render(
          <StateBoundary
            state={state}
            stale={STALE}
            forbidden={FORBIDDEN}
            emptyMessage={EMPTY_MESSAGE}
            partialMessage={PARTIAL_MESSAGE}
            conflictMessage={CONFLICT_MESSAGE}
            onRetry={() => undefined}
          >
            <p>{CONTENT}</p>
          </StateBoundary>,
        );

        for (const element of [container, ...Array.from(container.querySelectorAll('*'))]) {
          expect(element.getAttribute('class') ?? '').not.toMatch(FORBIDDEN_CLASS_PATTERN);
        }

        unmount();
      }
    }
  });
});
