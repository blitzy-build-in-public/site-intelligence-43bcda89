/**
 * Component suite for `dialog-heading.tsx`, the single owner of a dialog's second-level heading.
 *
 * The contract this suite proves is the heading's place in the outline and the name it gives its
 * container: exactly one `<h2>`, at the second level, carrying the id the caller states and the text it
 * passes, so a dialog that names that id in `aria-labelledby` reaches the accessibility tree with the
 * words a reader can see — the case that renders a real `role="dialog"` and asks for it by name is what
 * proves the two ids agree. No `<h1>` and no third level is rendered through this component, the
 * heading adds no focus stop because it is not interactive, the default class list is worn in full when
 * the caller passes none and replaced when the caller passes one, and both themes are rendered through
 * `data-theme` as AAP §0.18.1 asks.
 *
 * Fixture copy is plain words: no figure, identifier or magnifying text reaches this tree.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DIALOG_HEADING_CLASSES, DialogHeading } from './dialog-heading';

/** The heading text and the id a case gives it. */
const HEADING_TEXT = 'Dismiss this exception';
const HEADING_ID = 'dismiss-dialog-title';

/**
 * The one heading a rendered component produced.
 *
 * @param container - The rendered container.
 * @returns The single `<h2>` element.
 */
function headingElement(container: HTMLElement): HTMLHeadingElement {
  const heading = container.querySelector('h2');

  if (!(heading instanceof HTMLHeadingElement)) {
    throw new Error('DialogHeading rendered no h2 element to read');
  }

  return heading;
}

/* The both-themes cases set `data-theme` on `<html>` for the length of one case, so it is cleared. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('DialogHeading', () => {
  describe('the element it renders', () => {
    it('renders exactly one second-level heading carrying the id and the text', () => {
      const { container } = render(<DialogHeading id={HEADING_ID}>{HEADING_TEXT}</DialogHeading>);
      const heading = headingElement(container);

      expect(container.querySelectorAll('h2')).toHaveLength(1);
      expect(container.childElementCount).toBe(1);
      expect(heading).toHaveAttribute('id', HEADING_ID);
      expect(heading).toHaveTextContent(HEADING_TEXT);
      expect(screen.getByRole('heading', { level: 2 })).toStrictEqual(heading);
    });

    it('renders no first-level and no third-level heading, so the outline stays under the page h1', () => {
      const { container } = render(<DialogHeading id={HEADING_ID}>{HEADING_TEXT}</DialogHeading>);

      expect(container.querySelectorAll('h1')).toHaveLength(0);
      expect(container.querySelectorAll('h3, h4, h5, h6')).toHaveLength(0);
    });

    it('adds no focus stop, because a heading is not interactive', () => {
      const { container } = render(<DialogHeading id={HEADING_ID}>{HEADING_TEXT}</DialogHeading>);

      expect(headingElement(container).hasAttribute('tabindex')).toBe(false);
    });

    it('names the dialog that points its aria-labelledby at the id', () => {
      render(
        <div role="dialog" aria-labelledby={HEADING_ID}>
          <DialogHeading id={HEADING_ID}>{HEADING_TEXT}</DialogHeading>
        </div>,
      );

      expect(screen.getByRole('dialog', { name: HEADING_TEXT })).toBeInTheDocument();
    });
  });

  describe('the class list', () => {
    it('wears the second-level heading class list when the caller passes none', () => {
      const { container } = render(<DialogHeading id={HEADING_ID}>{HEADING_TEXT}</DialogHeading>);
      const heading = headingElement(container);

      for (const utility of DIALOG_HEADING_CLASSES.split(' ')) {
        expect(heading.classList).toContain(utility);
      }
      expect(heading.getAttribute('class')).toBe(DIALOG_HEADING_CLASSES);
    });

    it('honours the class override rather than merging the two lists', () => {
      const { container } = render(
        <DialogHeading id={HEADING_ID} className="sr-only">
          {HEADING_TEXT}
        </DialogHeading>,
      );
      const heading = headingElement(container);

      expect(heading.getAttribute('class')).toBe('sr-only');
      expect(heading.classList).not.toContain('font-semibold');
    });

    it('selects no palette value, arbitrary value or shadow', () => {
      const { container } = render(<DialogHeading id={HEADING_ID}>{HEADING_TEXT}</DialogHeading>);
      const classes = headingElement(container).getAttribute('class') ?? '';

      expect(classes).not.toMatch(/#[0-9a-f]{3,8}|\brgba?\(/i);
      expect(classes).not.toContain('[');
      expect(classes.split(' ').filter((utility) => utility.includes('shadow'))).toStrictEqual([]);
    });
  });

  describe('both themes', () => {
    for (const theme of ['command', 'paper'] as const) {
      it(`renders the same heading and class list under the ${theme} theme`, () => {
        document.documentElement.setAttribute('data-theme', theme);
        const { container } = render(
          <div role="dialog" aria-labelledby={HEADING_ID}>
            <DialogHeading id={HEADING_ID}>{HEADING_TEXT}</DialogHeading>
          </div>,
        );
        const heading = headingElement(container);

        expect(heading.tagName).toBe('H2');
        expect(heading).toHaveAttribute('id', HEADING_ID);
        expect(heading).toHaveTextContent(HEADING_TEXT);
        expect(heading.getAttribute('class')).toBe(DIALOG_HEADING_CLASSES);
        expect(heading.hasAttribute('style')).toBe(false);
      });
    }

    it('hands both themes one identical class list, so the colour is the theme role', () => {
      document.documentElement.setAttribute('data-theme', 'command');
      const command = render(<DialogHeading id={HEADING_ID}>{HEADING_TEXT}</DialogHeading>);
      const inCommand = Array.from(headingElement(command.container).classList);

      document.documentElement.setAttribute('data-theme', 'paper');
      const paper = render(<DialogHeading id={HEADING_ID}>{HEADING_TEXT}</DialogHeading>);
      const inPaper = Array.from(headingElement(paper.container).classList);

      expect(inCommand).toStrictEqual(inPaper);
    });
  });
});
