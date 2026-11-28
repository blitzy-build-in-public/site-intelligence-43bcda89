/**
 * Component suite for `not-found-page.tsx`, the page an unknown address lands on.
 *
 * The suite asserts the page's own contract rather than the shell's: one level-one heading and no
 * other heading level (rule B-3, since `PageHeader` is the only owner of an `h1`), the single
 * sentence that says the address does not match a page in this demonstration, a real router link to
 * the exception queue that works from the keyboard as well as the pointer (rule P-8), the appearance
 * it composes rather than restates — the two class lists `src/components/tooltip.tsx` owns, so the
 * page's only control answers the pointer the way every other control does — and the absence of the
 * attempted address in the rendered text, which is what stops a visitor-supplied path from being
 * echoed back into the page.
 *
 * The page renders inside `MemoryRouter`, which stands in for the shell's router so the link has the
 * routing context it needs; a small location probe reports the current path, so navigation is read
 * from the router rather than from a spy. Renders under the default jsdom environment; nothing here
 * hashes, reads the clock or reaches the service layer.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';

import { CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES } from '../components/tooltip';
import { NotFoundPage } from './not-found-page';

/** The address the page was reached by, used only to prove the page does not repeat it. */
const ATTEMPTED_PATH = '/no-such-page';

/** The route the page's one control navigates to. */
const EXCEPTIONS_PATH = '/exceptions';

/** The link's text, which is also its accessible name. */
const LINK_NAME = 'Go to the exception queue';

/**
 * Reports the router's current path so a navigation can be observed without a spy.
 *
 * The path travels in an attribute rather than as text, so the probe adds no text node that the
 * "never repeats the attempted address" assertion would have to discount.
 */
function LocationProbe() {
  const location = useLocation();

  return <span data-testid="current-path" data-path={location.pathname} />;
}

/** Renders the page inside a memory router that starts at the attempted address. */
function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[ATTEMPTED_PATH]}>
      <NotFoundPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('renders exactly one level-one heading and no other heading level', () => {
    renderPage();

    const headings = screen.getAllByRole('heading');

    expect(headings).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found');
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
  });

  it('states that the address does not match a page in this demonstration', () => {
    renderPage();

    expect(
      screen.getByText('This address does not match a page in this demonstration.'),
    ).toBeInTheDocument();
  });

  it('offers a working link to the exception queue', () => {
    renderPage();

    const link = screen.getByRole('link', { name: LINK_NAME });

    expect(link).toHaveAttribute('href', EXCEPTIONS_PATH);
    expect(link).toHaveTextContent(LINK_NAME);
  });

  it('composes the shared control lists rather than restating the secondary appearance', () => {
    renderPage();

    const link = screen.getByRole('link', { name: LINK_NAME });
    const shared = [
      ...CONTROL_STRUCTURE_CLASSES.split(' '),
      ...SECONDARY_CONTROL_CLASSES.split(' '),
    ];

    /* The anti-drift guard: this page's only control takes its shape, colours and hover and pressed
       states from the two lists `src/components/tooltip.tsx` exports, which the secondary
       `ActionButton` and the stage-notice page's link compose too, so one token change reaches all
       three and the page cannot be left without the hover state beside it. */
    expect(shared.length).toBeGreaterThan(0);
    for (const utility of shared) {
      expect(link).toHaveClass(utility);
    }
  });

  it('reaches the link by keyboard and navigates when it is activated', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.tab();

    const link = screen.getByRole('link', { name: LINK_NAME });

    expect(link).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(screen.getByTestId('current-path')).toHaveAttribute('data-path', EXCEPTIONS_PATH);
  });

  it('never repeats the address that was attempted', () => {
    renderPage();

    expect(screen.getByTestId('current-path')).toHaveAttribute('data-path', ATTEMPTED_PATH);
    expect(screen.queryByText(ATTEMPTED_PATH)).toBeNull();
  });

  it('renders no image and no illustration of its own', () => {
    renderPage();

    expect(screen.queryByRole('img')).toBeNull();
  });
});
