/**
 * Component suite for `src/components/panel.tsx`: the second raised surface, for content grouped under
 * a small caption (AAP §0.5.2; `src/components/card.tsx` records the two levels and which one to reach
 * for).
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP.
 * - The element the caller asks for: a `<section>` by default and a `<div>` when it says so, so the
 *   caller decides whether the group is a region or purely presentational content.
 * - The caption names the region and nothing else does: on the default `<section>` the caption becomes
 *   the region's accessible name through one `aria-labelledby` reference, while on a `<div>` the
 *   caption still renders — it is visible content — but no name reference is emitted, because a `<div>`
 *   has no role for `aria-labelledby` to name.
 * - An absent caption leaves the panel unnamed rather than empty: no caption element and no reference
 *   pointing at text that does not exist, for each of the three shapes a caller can pass (`undefined`,
 *   `null`, the empty string), which is the same presence test `Card` applies to its title.
 * - The panel invents no heading of its own. Its contract is that it groups content that is already
 *   named, so it must not disturb the outline a screen's page header and cards own: with a caption
 *   given, no heading element appears anywhere inside it.
 * - The caller's content keeps its own semantics: a list stays a list, a heading stays the level the
 *   caller wrote, and both are direct children of the surface rather than wrapped by it.
 * - The caller's `className` is layout only and is appended to the module's own utilities rather than
 *   replacing them, so a caller can place the surface but cannot drop the role tokens that make it
 *   legible in either theme.
 * - Every utility is a role token: no palette literal, no `rgb()` value, no arbitrary value and no
 *   shadow, and the same class list resolves under both `data-theme` values (AAP §0.18.1).
 * - The surface is not interactive: it adds no focus stop and no control of its own.
 *
 * NO FIGURE, RECORD OR PRODUCT STRING IS TYPED (rule P-6): the caption, the content and the layout
 * class are this suite's own fixtures, and no service is bound because the component reads nothing
 * (rule P-2 is satisfied by the component having no data boundary at all).
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite proves the surface's semantics rather than auditing them.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Panel } from './panel';
import type { PanelProps } from './panel';

/* ---------------------------------------------------------------------------------------------
 * The fixtures this suite passes — the caller's own content, no product wording (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/** The caption a case groups content under. */
const CAPTION = 'a grouped block';

/** The text inside the panel, which the primitive must render unchanged. */
const CONTENT = 'the content the caller grouped';

/** One item of the caller's own list, which must keep the list's semantics. */
const LIST_ITEM = 'an item the caller listed';

/** The heading the caller wrote, which the panel must neither replace nor level-shift. */
const CALLER_HEADING = 'the caller’s own heading';

/** A layout-only class a caller can hand in, which must not replace the module's own utilities. */
const LAYOUT_CLASS = 'max-w-xl';

/** A class list naming a palette value, a colour function or an elevation, none of which may appear. */
const PALETTE_CLASS_PATTERN = /#[0-9a-fA-F]{3,8}|rgba?\(|--palette-|shadow/iu;

/** Both themes, each of which must resolve the same role utilities. */
const THEMES = ['command', 'paper'] as const;

/** The two element shapes the panel admits. */
const ELEMENT_CASES: readonly (readonly [NonNullable<PanelProps['as']>, string])[] = [
  ['section', 'SECTION'],
  ['div', 'DIV'],
];

/* ---------------------------------------------------------------------------------------------
 * The cases
 * ------------------------------------------------------------------------------------------- */

describe('Panel — the element and its caption', () => {
  it('renders a section named by the caller’s caption by default', () => {
    render(<Panel label={CAPTION}>{CONTENT}</Panel>);

    const surface = screen.getByRole('region', { name: CAPTION });

    expect(surface.tagName).toBe('SECTION');
    expect(surface.getAttribute('aria-labelledby')).toBe(
      screen.getByText(CAPTION).id,
    );
  });

  it.each(ELEMENT_CASES)('renders as %s when the caller asks for it', (as, tagName) => {
    const { container } = render(
      <Panel as={as} label={CAPTION}>
        {CONTENT}
      </Panel>,
    );

    expect(container.firstElementChild?.tagName).toBe(tagName);
  });

  it('prints the caption in the caption text role, as text rather than a heading', () => {
    render(<Panel label={CAPTION}>{CONTENT}</Panel>);

    const caption = screen.getByText(CAPTION);

    expect(caption.tagName).toBe('P');
    expect(caption).toHaveClass('text-12', 'text-text-caption');
  });

  it('keeps the caption visible on a div, and gives the div no name it cannot carry', () => {
    const { container } = render(
      <Panel as="div" label={CAPTION}>
        {CONTENT}
      </Panel>,
    );

    const surface = container.firstElementChild;

    expect(screen.getByText(CAPTION)).toBeInTheDocument();
    expect(surface?.hasAttribute('aria-labelledby')).toBe(false);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['the empty string', ''],
  ])('leaves the panel unnamed when the caption is %s', (_label, label) => {
    const { container } = render(<Panel label={label}>{CONTENT}</Panel>);

    const surface = container.firstElementChild;

    expect(surface?.hasAttribute('aria-labelledby')).toBe(false);
    expect(container.querySelectorAll('p')).toHaveLength(0);
    expect(screen.getByText(CONTENT)).toBeInTheDocument();
  });
});

describe('Panel — what it does not invent', () => {
  it('renders no heading of its own, whatever caption it is given', () => {
    render(<Panel label={CAPTION}>{CONTENT}</Panel>);

    /* The panel groups content that is already named; a heading here would disturb the outline the
       page header and the cards own. */
    expect(screen.queryAllByRole('heading')).toStrictEqual([]);
  });

  it('keeps the caller’s content and its own semantics as direct children', () => {
    const { container } = render(
      <Panel label={CAPTION}>
        <h3>{CALLER_HEADING}</h3>
        <ul>
          <li>{LIST_ITEM}</li>
        </ul>
      </Panel>,
    );

    const surface = container.firstElementChild;

    expect(screen.getByRole('heading', { level: 3, name: CALLER_HEADING })).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getByText(LIST_ITEM)).toBeInTheDocument();
    expect(surface?.querySelector('ul')).not.toBeNull();
    /* The list is the surface's own child, placed where the caller put it rather than wrapped. */
    expect(screen.getByRole('list').parentElement).toBe(surface);
  });
});

describe('Panel — the tokens it selects', () => {
  it('appends the caller’s layout class rather than replacing its own utilities', () => {
    const { container } = render(
      <Panel label={CAPTION} className={LAYOUT_CLASS}>
        {CONTENT}
      </Panel>,
    );

    const surface = container.firstElementChild;

    expect(surface).toHaveClass(LAYOUT_CLASS);
    expect(surface).toHaveClass('bg-surface-2', 'border-hairline', 'text-text-primary');
  });

  it('selects role tokens only: no palette value, arbitrary value or shadow', () => {
    const { container } = render(<Panel label={CAPTION}>{CONTENT}</Panel>);

    for (const element of Array.from(container.querySelectorAll('*'))) {
      const classes = element.getAttribute('class') ?? '';

      expect(classes).not.toMatch(PALETTE_CLASS_PATTERN);
      expect(classes).not.toContain('[');
    }
  });

  it('resolves to the same role utilities under both themes', () => {
    const classLists: (string | null)[] = [];

    for (const theme of THEMES) {
      document.documentElement.setAttribute('data-theme', theme);

      const { container, unmount } = render(<Panel label={CAPTION}>{CONTENT}</Panel>);

      classLists.push(container.firstElementChild?.getAttribute('class') ?? null);
      unmount();
    }

    document.documentElement.removeAttribute('data-theme');

    expect(classLists[0]).not.toBeNull();
    expect(new Set(classLists).size).toBe(1);
  });
});

describe('Panel — what it does not add', () => {
  it('adds no focus stop and no control of its own', async () => {
    const user = userEvent.setup();
    const { container } = render(<Panel label={CAPTION}>{CONTENT}</Panel>);

    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(screen.queryAllByRole('button')).toStrictEqual([]);
    expect(screen.queryAllByRole('link')).toStrictEqual([]);

    await user.tab();

    expect(container.contains(document.activeElement)).toBe(false);
  });
});
