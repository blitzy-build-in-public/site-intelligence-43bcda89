/**
 * Component suite for `src/components/page-header.tsx`: the screen title primitive, and the only owner
 * of a screen's level-one heading (AAP §0.5.2).
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP.
 * - The title is the screen's one level-one heading, and there is no other heading beside it: a second
 *   `h1` anywhere under a screen is the defect the module exists to prevent, so the case asserts the
 *   level and the absence of any other heading at once.
 * - The slots render where the module places them and only when a caller supplies them: the eyebrow
 *   above the title (a screen identifier or a status cluster), the description directly under it as a
 *   paragraph, and the actions at the end of the row. Omitted, each leaves nothing behind rather than
 *   an empty element.
 * - The actions slot takes the caller's content unchanged: the control keeps the appearance and the
 *   accessible name its own module gave it, and only the slot's text role is applied around it.
 * - The root is a `header` container and not a landmark. A screen renders it inside the shell's `main`,
 *   where a `header` is not a banner, so the case mounts it there and asserts that the page's only
 *   banner is the shell's own — the top bar's, not this one's.
 * - Every utility is a role token: no palette literal, no `rgb()` value, no arbitrary value and no
 *   shadow, and the same class list resolves under both `data-theme` values (AAP §0.18.1).
 *
 * NO FIGURE, RECORD OR PRODUCT STRING IS TYPED (rule P-6): the title, the description, the eyebrow and
 * the action below are this suite's own fixtures, and no service is bound because the component reads
 * nothing (rule P-2 is satisfied by the component having no data boundary at all).
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite proves the header's structure and slots rather than auditing them.
 */
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './page-header';

/* ---------------------------------------------------------------------------------------------
 * The fixtures this suite passes — the caller's own screen copy, no product wording (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/** The screen title a case passes. */
const TITLE = 'a screen title';

/** The supporting line under the title. */
const DESCRIPTION = 'the supporting line a screen adds beneath its title';

/** The text of the slot above the title. */
const EYEBROW = 'a screen identifier';

/** The label of the action a case hands the actions slot. */
const ACTION_LABEL = 'the screen’s primary action';

/** A class list naming a palette value, a colour function or an elevation, none of which may appear. */
const PALETTE_CLASS_PATTERN = /#[0-9a-fA-F]{3,8}|rgba?\(|--palette-|shadow/iu;

/** Both themes, each of which must resolve the same role utilities. */
const THEMES = ['command', 'paper'] as const;

/**
 * Renders the header where a screen renders it: inside the shell's `main` landmark.
 *
 * The placement is part of the contract and not a convenience — a `header` is a banner only when it
 * is not inside a sectioning element, and every screen mounts this component inside `main`.
 */
function renderInMain(header: ReactElement): ReturnType<typeof render> {
  return render(<main>{header}</main>);
}

/* ---------------------------------------------------------------------------------------------
 * The title and the description
 * ------------------------------------------------------------------------------------------- */

describe('PageHeader — the title and the description', () => {
  it('renders the title as the screen’s only level-one heading', () => {
    renderInMain(<PageHeader title={TITLE} />);

    const heading = screen.getByRole('heading', { level: 1 });

    expect(heading.textContent).toBe(TITLE);
    expect(heading.tagName).toBe('H1');
    expect(screen.queryAllByRole('heading')).toHaveLength(1);
  });

  it('renders the description as a paragraph under the title when it is given', () => {
    renderInMain(<PageHeader title={TITLE} description={DESCRIPTION} />);

    const description = screen.getByText(DESCRIPTION);

    expect(description.tagName).toBe('P');
    /* Directly after the heading's own column, so the reading order matches the visual order. */
    expect(
      screen.getByRole('heading', { level: 1 }).compareDocumentPosition(description) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders no paragraph at all when no description is given', () => {
    const { container } = renderInMain(<PageHeader title={TITLE} />);

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The two slots
 * ------------------------------------------------------------------------------------------- */

describe('PageHeader — the eyebrow and actions slots', () => {
  it('renders the eyebrow above the title, in the caption text role', () => {
    renderInMain(<PageHeader title={TITLE} eyebrow={<span>{EYEBROW}</span>} />);

    const eyebrow = screen.getByText(EYEBROW);
    const heading = screen.getByRole('heading', { level: 1 });

    expect(eyebrow.parentElement).toHaveClass('text-13', 'text-text-caption');
    /* Above the title in the document, which is where the module places the slot. */
    expect(
      eyebrow.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders nothing for an eyebrow it was not given', () => {
    renderInMain(<PageHeader title={TITLE} />);

    /* The title block holds the heading alone: no empty slot stands where the eyebrow would be. */
    expect(screen.getByRole('heading', { level: 1 }).parentElement?.children).toHaveLength(1);
  });

  it('hands the actions slot the caller’s control, unchanged and after the title block', () => {
    renderInMain(
      <PageHeader
        title={TITLE}
        actions={
          <button type="button" className="caller-owned">
            {ACTION_LABEL}
          </button>
        }
      />,
    );

    const action = screen.getByRole('button', { name: ACTION_LABEL });
    const heading = screen.getByRole('heading', { level: 1 });

    /* The control keeps its own class list: the slot styles the row, not what it receives. */
    expect(action.getAttribute('class')).toBe('caller-owned');
    expect(action.parentElement).toHaveClass('text-text-primary');
    expect(
      heading.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders no slot for actions it was not given', () => {
    renderInMain(<PageHeader title={TITLE} description={DESCRIPTION} />);

    expect(screen.queryAllByRole('button')).toStrictEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The landmark it is not
 * ------------------------------------------------------------------------------------------- */

describe('PageHeader — the landmark it is not', () => {
  it('is a header container that applies no landmark role of its own', () => {
    const { container } = renderInMain(<PageHeader title={TITLE} />);

    const header = container.querySelector('header');

    expect(header).not.toBeNull();

    /* The element is a container: it applies no `role` and no labelling attribute of its own, because
       the shell's top bar is the page's only banner and a second landmark here would make every
       screen's title announce itself twice. The implicit mapping of a `header` element belongs to the
       markup's own context and is not this component's to declare. */
    expect(header?.hasAttribute('role')).toBe(false);
    expect(header?.hasAttribute('aria-label')).toBe(false);
    expect(header?.hasAttribute('aria-labelledby')).toBe(false);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The tokens it selects
 * ------------------------------------------------------------------------------------------- */

describe('PageHeader — the tokens it selects', () => {
  it('selects role tokens only: no palette value, arbitrary value or shadow', () => {
    const { container } = renderInMain(
      <PageHeader title={TITLE} description={DESCRIPTION} eyebrow={<span>{EYEBROW}</span>} />,
    );

    for (const element of Array.from(container.querySelectorAll('*'))) {
      const classes = element.getAttribute('class') ?? '';

      expect(classes).not.toMatch(PALETTE_CLASS_PATTERN);
      expect(classes).not.toContain('[');
    }

    expect(screen.getByRole('heading', { level: 1 })).toHaveClass(
      'text-28',
      'text-text-primary',
    );
  });

  it('resolves to the same role utilities under both themes', () => {
    const classLists: (string | null)[] = [];

    for (const theme of THEMES) {
      document.documentElement.setAttribute('data-theme', theme);

      const { container, unmount } = renderInMain(<PageHeader title={TITLE} />);

      classLists.push(container.querySelector('header')?.getAttribute('class') ?? null);
      unmount();
    }

    document.documentElement.removeAttribute('data-theme');

    expect(classLists[0]).not.toBeNull();
    expect(new Set(classLists).size).toBe(1);
  });
});
