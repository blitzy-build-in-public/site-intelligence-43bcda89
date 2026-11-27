/**
 * The dialog heading: the single owner of the second-level heading a dialog, drawer or popover body
 * needs.
 *
 * AAP §0.5.2 fixes that "a raw `<input>`/`<select>`/`<textarea>`/`<button>`/heading is permitted only
 * inside the component that owns it; no screen or feature file may use one directly", and §0.18.1
 * restates the same requirement as "interactive elements are components, never raw elements in a
 * screen". A screen's one `<h1>` has an owner — `PageHeader` in `./page-header` — but the second level
 * a dialog's body opens with had none, so the queue's dismiss dialog, the audit detail drawer, the
 * grant dialog and the shell's simulation popover each wrote their own `<h2>`. This module is that
 * owner.
 *
 * WHAT IT OWNS, AND WHAT THE CALLER OWNS. The primitive owns the element and its level: exactly one
 * `<h2>`, at the second level, so a dialog's outline sits under the screen's `<h1>` and never competes
 * with it. The caller owns the visible label — the `children` this component renders character for
 * character — and the `id` it names in the container's `aria-labelledby`, which is how the dialog, the
 * drawer or the popover takes its accessible name from the heading a reader can see. The supporting
 * sentence a dialog offers is wired with `aria-describedby` on that same container, whose id the caller
 * also owns: a heading that described its own dialog would put one element in two roles, and the
 * sentence a dialog carries belongs to the copy the screen owns.
 *
 * The heading is not interactive and adds no focus stop: a dialog moves focus to its first control or
 * to its own container, and a heading in the tab order would put a stop between a reader and the
 * decision the dialog exists for.
 *
 * The appearance is the product's one section-title style, the same `text-16 font-semibold` list the
 * card and the timeline dock give their own headings, so the second level reads the same wherever it
 * appears. It is role tokens only — the primary text role on whatever surface the dialog paints — so
 * the heading keeps the contrast the theme measured, whichever theme resolves it.
 */
import type { ReactElement, ReactNode } from 'react';

/**
 * The one owner of a second-level heading's appearance: the section-title type in the primary text
 * role.
 *
 * `text-16` and `font-semibold` are the type scale and weight §4.3 fixes for a section title, and
 * `text-text-primary` is the role the themes measure for contrast on every surface (rule B-3). No
 * colour literal, arbitrary value or shadow is available here, so the heading cannot pick a value the
 * themes have not measured.
 */
export const DIALOG_HEADING_CLASSES = 'text-16 font-semibold text-text-primary';

/**
 * Props of {@link DialogHeading}.
 *
 * Deliberately closed: a heading takes no native element props, because the three members below are
 * the whole of what a dialog title may vary. Level, element and role are the primitive's, so no caller
 * can render a second `<h1>` or a heading of a different level through this component.
 */
export interface DialogHeadingProps {
  /**
   * The id the dialog, drawer or popover names in its `aria-labelledby`.
   *
   * Required, because a heading rendered without it could not name the container it belongs to and the
   * dialog would reach the accessibility tree unnamed. The caller owns the matching reference, which
   * is the only place the two ids have to agree.
   */
  readonly id: string;
  /** The heading's visible text, rendered as supplied — the words a reader sees and a reader hears. */
  readonly children: ReactNode;
  /**
   * The caller's replacement for {@link DIALOG_HEADING_CLASSES}, for a body whose heading the layout
   * has to size or realign. Absent, the default list is worn in full; given, it is worn instead.
   */
  readonly className?: string | undefined;
}

/**
 * Renders the heading a dialog, drawer or popover body opens with.
 *
 * @param props The id the container's `aria-labelledby` names, the visible text, and an optional
 *   replacement class list. See {@link DialogHeadingProps}.
 * @returns A single `<h2>` element carrying the id and the heading text.
 */
export function DialogHeading({ id, children, className }: DialogHeadingProps): ReactElement {
  return (
    <h2 id={id} className={className ?? DIALOG_HEADING_CLASSES}>
      {children}
    </h2>
  );
}
