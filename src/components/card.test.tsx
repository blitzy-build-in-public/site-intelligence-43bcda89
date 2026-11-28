/**
 * Component suite for `src/components/card.tsx`: the titled surface primitive the overview's blocks,
 * the investigation's cards and the canvas right stack are built from (AAP §0.5.2).
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP.
 * - The element the caller asks for: `section` by default, and `article` or `div` when it says so.
 *   The default is the semantic surface of a titled group, so a caller that asks for nothing gets the
 *   region its heading names.
 * - The heading the caller gives names the surface: the title is rendered inside an `<h2>` — the level
 *   beneath a screen's `PageHeader` — and the `<section>`'s `aria-labelledby` points at that same node,
 *   so the group is announced by its heading and the two cannot drift apart.
 * - An absent title leaves the surface untitled rather than empty: no heading element and no
 *   `aria-labelledby` pointing at a node that does not exist, for each of the three shapes a caller can
 *   pass (`undefined`, `null`, the empty string). A title of `0` is still a title, so the presence test
 *   is against those three and not against truthiness.
 * - The actions slot takes the caller's content, at the end of the title row, and the row renders even
 *   when only an action is passed — an untitled surface with a control still groups the control with
 *   its content.
 * - Every utility is a role token: no palette literal, no `rgb()` value, no arbitrary value and no
 *   shadow, because specification §4.3 defines no elevation scale and the token layer clears the shadow
 *   namespace outright. Both themes resolve the same class list, which is asserted by rendering under
 *   each `data-theme` value (AAP §0.18.1).
 * - The surface is not interactive: it adds no focus stop and no `tabIndex`, because a titled surface
 *   has nothing to operate.
 *
 * NO FIGURE, RECORD OR PRODUCT STRING IS TYPED (rule P-6): the caller's title, the slot's content and
 * the case's own wrapper text are this suite's fixtures, and no service is bound because the component
 * reads nothing (rule P-2 is satisfied by the component having no data boundary at all).
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite proves the surface's semantics rather than auditing them.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Card } from './card';
import type { CardProps } from './card';

/* ---------------------------------------------------------------------------------------------
 * The fixtures this suite passes — the caller's own content, no product wording (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/** The title a case gives a surface. */
const TITLE = 'a titled group';

/** The text inside the surface, which the primitive must render unchanged. */
const CONTENT = 'the content the caller grouped';

/** The content of the actions slot. */
const ACTION_LABEL = 'an action the caller placed';

/** Every element shape a caller can ask the surface to render as, with the tag each produces. */
const ELEMENT_CASES: readonly (readonly [NonNullable<CardProps['as']>, string])[] = [
  ['section', 'SECTION'],
  ['article', 'ARTICLE'],
  ['div', 'DIV'],
];

/** A class list naming a palette value, a colour function or an elevation, none of which may appear. */
const PALETTE_CLASS_PATTERN = /#[0-9a-fA-F]{3,8}|rgba?\(|--palette-|shadow/iu;

/** Both themes, each of which must resolve the same role utilities. */
const THEMES = ['command', 'paper'] as const;

/* ---------------------------------------------------------------------------------------------
 * The cases
 * ------------------------------------------------------------------------------------------- */

describe('Card — the element it renders', () => {
  it('renders a titled section by default, because a heading names a region', () => {
    render(<Card title={TITLE}>{CONTENT}</Card>);

    const surface = screen.getByRole('region', { name: TITLE });

    expect(surface.tagName).toBe('SECTION');
  });

  it.each(ELEMENT_CASES)('renders as %s when the caller asks for it', (as, tagName) => {
    const { container } = render(
      <Card as={as} title={TITLE}>
        {CONTENT}
      </Card>,
    );

    const surface = container.firstElementChild;

    expect(surface?.tagName).toBe(tagName);
    expect(screen.getByText(CONTENT)).toBeInTheDocument();
  });
});

describe('Card — the heading it owns', () => {
  it('names the surface by the heading it renders, at the level beneath a page header', () => {
    render(<Card title={TITLE}>{CONTENT}</Card>);

    const heading = screen.getByRole('heading', { level: 2, name: TITLE });
    const surface = screen.getByRole('region', { name: TITLE });

    /* The heading is the surface's name through one reference, so the two cannot disagree. */
    expect(surface.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.textContent).toBe(TITLE);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['the empty string', ''],
  ])('leaves the surface untitled when the title is %s', (_label, title) => {
    const { container } = render(<Card title={title}>{CONTENT}</Card>);

    const surface = container.firstElementChild;

    expect(screen.queryAllByRole('heading')).toStrictEqual([]);
    expect(surface?.hasAttribute('aria-labelledby')).toBe(false);
    expect(screen.getByText(CONTENT)).toBeInTheDocument();
  });

  it('keeps a title of zero, which a caller did pass', () => {
    const { container } = render(<Card title={0}>{CONTENT}</Card>);

    const surface = container.firstElementChild;

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('0');
    expect(surface?.hasAttribute('aria-labelledby')).toBe(true);
  });
});

describe('Card — the actions slot and its content', () => {
  it('places the caller’s action at the end of the title row, un-styled', () => {
    render(
      <Card title={TITLE} actions={<button type="button">{ACTION_LABEL}</button>}>
        {CONTENT}
      </Card>,
    );

    const action = screen.getByRole('button', { name: ACTION_LABEL });

    /* The slot styles nothing it receives, so the control keeps the appearance and accessible name
       its own module gave it. */
    expect(action.hasAttribute('class')).toBe(false);
    expect(action.parentElement?.parentElement?.parentElement).toBe(
      screen.getByRole('region', { name: TITLE }),
    );
  });

  it('renders the title row for an action alone, with no heading invented for it', () => {
    const { container } = render(<Card actions={<span>{ACTION_LABEL}</span>}>{CONTENT}</Card>);

    expect(screen.getByText(ACTION_LABEL)).toBeInTheDocument();
    expect(screen.queryAllByRole('heading')).toStrictEqual([]);
    expect(container.firstElementChild?.hasAttribute('aria-labelledby')).toBe(false);
  });
});

describe('Card — the tokens it selects', () => {
  it('selects role tokens only: no palette value, arbitrary value or shadow', () => {
    const { container } = render(<Card title={TITLE}>{CONTENT}</Card>);

    for (const element of Array.from(container.querySelectorAll('*'))) {
      const classes = element.getAttribute('class') ?? '';

      expect(classes).not.toMatch(PALETTE_CLASS_PATTERN);
      expect(classes).not.toContain('[');
    }

    /* The surface is framed by the raised surface role and the decorative hairline, and its text is
       the primary role, which is what lets the theme layer supply the measured contrast. */
    const surface = container.firstElementChild;

    expect(surface).toHaveClass('bg-surface-1', 'border-hairline', 'text-text-primary');
  });

  it('resolves to the same role utilities under both themes', () => {
    const classLists: (string | null)[] = [];

    /* Colour arrives as a role utility the theme layer resolves, so one class list serves both
       themes: a component that baked a palette value in would answer differently here. */
    for (const theme of THEMES) {
      document.documentElement.setAttribute('data-theme', theme);

      const { container, unmount } = render(<Card title={TITLE}>{CONTENT}</Card>);

      classLists.push(container.firstElementChild?.getAttribute('class') ?? null);
      unmount();
    }

    document.documentElement.removeAttribute('data-theme');

    expect(classLists[0]).not.toBeNull();
    expect(new Set(classLists).size).toBe(1);
  });
});

describe('Card — what it does not add', () => {
  it('adds no focus stop and no interactive element of its own', async () => {
    const user = userEvent.setup();
    const { container } = render(<Card title={TITLE}>{CONTENT}</Card>);

    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(screen.queryAllByRole('button')).toStrictEqual([]);
    expect(screen.queryAllByRole('link')).toStrictEqual([]);

    await user.tab();

    expect(container.contains(document.activeElement)).toBe(false);
  });
});
