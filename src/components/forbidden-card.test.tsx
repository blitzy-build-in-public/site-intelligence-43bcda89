/**
 * Component suite for `forbidden-card.tsx`: the explanation a screen shows when the service refused
 * a call because the acting role lacks the permission it requires.
 *
 * The cases assert the contract rather than the markup. The card names the missing permission in the
 * heading the surface owns, shows every role the service reported as a real list item so a reader can
 * see who may act (rule B-3), and shows the trace id in selectable text because it is the
 * demonstration's only diagnostic. A role set with no holders is stated in the caption role instead
 * of an empty list, and the card adds no control and no focus stop of its own: the only thing it can
 * make focusable is the action its caller places. The one class list serves both themes through role
 * utilities alone, so no palette literal, `rgb()` value or shadow reaches the card in either theme.
 * One case asserts the card's text carries none of the barred claim vocabulary of rule P-4, and no
 * case pins a sentence the inputs do not fix: the permission, the roles, the trace id, the refusal's
 * own sentence where one is supplied, the presence of the empty-set caption and the absence of claim
 * vocabulary are what is asserted.
 *
 * The strings below are this suite's own caller-level input, standing in for values a service
 * `Problem` supplies at run time: the component types no permission name, no role and no identifier
 * itself (rule P-6). Nothing here hashes or reads the clock, so the jsdom environment that
 * `vite.config.ts` sets by default applies.
 */

import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Permission, Role } from '../types';
import { ForbiddenCard } from './forbidden-card';

/** The permission a case reports as missing, shaped like a contracts §7.1 matrix row. */
const PERMISSION: Permission = 'approval.decide';

/** The roles a case reports as holding it, in the order the service would supply them. */
const ROLES: readonly Role[] = ['plant-manager', 'head-of-supply-chain'];

/** The correlation identifier of the refused call, standing in for `Problem.traceId`. */
const TRACE_ID = 'trace-1a2b3c4d';

/** The caption that stands in for the list when no role holds the permission. */
const NO_ROLES_CAPTION = 'no role holds this permission';

/**
 * The accessible-name matcher the cases address the heading and the region with. No input fixes a
 * sentence for this card — it composes its own minimal wording — so a case asserts that the name
 * carries the permission that was required and leaves the surrounding words free to change.
 */
function namedByPermission(accessibleName: string): boolean {
  return accessibleName.includes(PERMISSION);
}

/**
 * The claim vocabulary this card may not carry (rule P-4): that the application establishes
 * sovereignty, prevents copying or resists tampering. It holds only the words the disclaimers
 * elsewhere in `src/` write in order to deny those claims — the same words, so a bare-word ban cannot
 * cover them — because the project-wide forbidden-string source check already rejects the rest of
 * that vocabulary everywhere under `src/`. A second copy of those phrases here would only collide
 * with the scan that owns them.
 */
const BARRED_CLAIM_VOCABULARY: readonly string[] = [
  /* Sovereignty established. */
  'sovereign',
  /* Copying prevented, in the two shapes the card could carry it. */
  'prevents copying',
  'copied',
  /* Tampering resisted. */
  'tamper',
];

/** Every element the render produced, so the theme cases can inspect each class list. */
function allElements(container: HTMLElement): readonly Element[] {
  return [container, ...Array.from(container.querySelectorAll('*'))];
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('ForbiddenCard', () => {
  it('names the missing permission in the heading of the surface', () => {
    render(<ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />);

    const heading = screen.getByRole('heading', { name: namedByPermission, level: 2 });

    expect(heading).toBeVisible();
    /* The permission is text a reader can find on the page, never an attribute or a title. */
    expect(heading).toHaveTextContent(PERMISSION);
  });

  /* The surface Card renders is a `<section>` named by its heading, so the block is a region a reader
     can jump to rather than a bare group of text. */
  it('renders the explanation as a region named by that heading', () => {
    render(<ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />);

    expect(screen.getByRole('region', { name: namedByPermission })).toBeInTheDocument();
  });

  it('shows every role the service reported as a list item, in the order supplied', () => {
    render(<ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />);

    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(ROLES.length);
    expect(items.map((item) => item.textContent)).toEqual([...ROLES]);
    expect(screen.getByRole('list')).toBeVisible();
    /* The stack is laid out as a flex column, which removes the markers, so the list role is stated
       explicitly to keep the set announced as a list of that length. */
    expect(screen.getByRole('list')).toHaveAttribute('role', 'list');
  });

  it('states the empty role set in the caption role instead of an empty list', () => {
    const { container } = render(
      <ForbiddenCard permission={PERMISSION} roles={[]} traceId={TRACE_ID} />,
    );

    const caption = screen.getByText(NO_ROLES_CAPTION);

    expect(caption).toBeVisible();
    expect(caption).toHaveClass('text-text-caption');
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    /* No list element of any kind reaches the document, so nothing announces a set of length zero. */
    expect(container.querySelector('ul, ol')).toBeNull();
  });

  /* The refusal's own sentence, where the service supplied one: the card prints it rather than
     composing a second account beside it, because only the service knows which cause it refused for
     — the demonstration withholding a view the role may read, or the matrix finding a permission
     missing (rules P-3, P-4). */
  it("prints the refusal's own sentence above the roles it lists, and nothing when it was given none", () => {
    const reason = 'The demonstration withheld this view, which the acting role may read.';
    const { rerender } = render(
      <ForbiddenCard
        permission={PERMISSION}
        roles={ROLES}
        reason={reason}
        traceId={TRACE_ID}
      />,
    );

    const sentence = screen.getByText(reason);

    expect(sentence).toBeVisible();
    /* It leads the card's supporting text, in the role the captions beneath it use. */
    expect(sentence).toHaveClass('text-13', 'text-text-secondary');
    expect(sentence.parentElement?.firstElementChild).toBe(sentence);
    expect(
      sentence.compareDocumentPosition(screen.getByRole('list')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    rerender(<ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />);

    expect(screen.queryByText(reason)).not.toBeInTheDocument();
  });

  it('shows the trace id as selectable text a reader can quote', () => {
    const { container } = render(
      <ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />,
    );

    const value = screen.getByText(TRACE_ID);

    expect(value).toBeVisible();
    /* Selectable means present to assistive technology and untouched by a selection lock: nothing
       hides it from the accessibility tree and nothing turns text selection off on it. */
    expect(value.closest('[aria-hidden="true"]')).toBeNull();
    expect(value).toHaveClass('select-all');
    for (const element of allElements(container)) {
      expect(element.getAttribute('class') ?? '').not.toContain('select-none');
    }
  });

  /* AAP §0.18.1 gives the trace id the role of the demonstration's only diagnostic, so it is the one
     value on this card rendered in the tabular mono face. */
  it('renders the trace id in the mono face of the value formatter', () => {
    render(<ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />);

    expect(screen.getByText(TRACE_ID)).toHaveClass('font-mono', 'tabular-nums');
  });

  it("places the caller's action without drawing one of its own", () => {
    const { rerender } = render(
      <ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />,
    );

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();

    rerender(
      <ForbiddenCard
        permission={PERMISSION}
        roles={ROLES}
        traceId={TRACE_ID}
        action={<a href="/exceptions">Back to the queue</a>}
      />,
    );

    const link = screen.getByRole('link', { name: 'Back to the queue' });

    expect(link).toBeVisible();
    expect(screen.getByRole('region', { name: namedByPermission })).toContainElement(link);
  });

  it('adds no focus stop and no interactive role of its own', () => {
    const { container } = render(
      <ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />,
    );

    expect(container.querySelector('[tabindex]')).toBeNull();
    expect(container.querySelector('button, input, select, textarea, a')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  /* A meaning rests on text here, never on a glyph: the card explains an outcome rather than
     reporting a status that must always pair an icon with its label. */
  it('carries no icon of its own', () => {
    const { container } = render(
      <ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />,
    );

    expect(container.querySelector('svg')).toBeNull();
  });

  /* Rule P-4 governs every screen: the card reports a refusal and claims nothing beyond it, so its
     text carries none of the vocabulary of sovereignty established, copying prevented or tampering
     resisted. The vocabulary is listed here rather than imported, because this suite's subject is
     the card's own wording. */
  it('states no claim of sovereignty, copy prevention or tamper resistance', () => {
    render(<ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />);

    const text = (
      screen.getByRole('region', { name: namedByPermission }).textContent ?? ''
    ).toLowerCase();

    for (const phrase of BARRED_CLAIM_VOCABULARY) {
      expect(text).not.toContain(phrase);
    }
  });

  it("hands a caller's layout classes to the element that wraps the surface", () => {
    const { container } = render(
      <ForbiddenCard
        permission={PERMISSION}
        roles={ROLES}
        traceId={TRACE_ID}
        className="max-w-xl"
      />,
    );

    expect(container.firstElementChild).toHaveClass('max-w-xl');
  });

  /* AAP §0.18.1 asks that both themes be checked by rendering under each `data-theme` value. The
     colour comes from role utilities the theme layer resolves, so one class list has to serve both:
     no utility may be a palette literal or an `rgb()` value, and no shadow may appear anywhere
     (specification §4.3 defines none). */
  for (const theme of ['command', 'paper'] as const) {
    it(`paints the card from role utilities alone under the ${theme} theme`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      const { container } = render(
        <ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />,
      );

      for (const element of allElements(container)) {
        const classes = element.getAttribute('class') ?? '';
        expect(classes).not.toMatch(/#[0-9a-f]{3,8}|\brgba?\(|--palette-/i);
        expect(classes).not.toContain('shadow');
      }
      /* The list carries the body size and the primary text role, and its items inherit both, so the
         roles read at the theme's measured contrast without a per-item class. */
      expect(screen.getByRole('list')).toHaveClass('text-14', 'text-text-primary');
      /* The caption introducing that list keeps the caption size and the secondary text role,
         located by its place in the block rather than by its wording, which no input fixes. */
      expect(screen.getByRole('list').previousElementSibling).toHaveClass(
        'text-13',
        'text-text-secondary',
      );
    });
  }

  it('resolves to the same class list in both themes', () => {
    const classLists: string[] = [];

    for (const theme of ['command', 'paper'] as const) {
      document.documentElement.setAttribute('data-theme', theme);
      const { container, unmount } = render(
        <ForbiddenCard permission={PERMISSION} roles={ROLES} traceId={TRACE_ID} />,
      );
      classLists.push(
        allElements(container)
          .map((element) => element.getAttribute('class') ?? '')
          .join('|'),
      );
      unmount();
    }

    expect(classLists[0]).toBe(classLists[1]);
  });
});
