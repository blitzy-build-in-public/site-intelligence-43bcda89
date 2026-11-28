/**
 * The dialog heading: the single owner of the second-level heading a dialog, drawer or popover
 * body opens with.
 *
 * AAP §0.5.2 fixes that a raw heading is permitted only inside the component that owns it, and
 * §0.18.1 restates it; a screen's one `<h1>` belongs to `PageHeader` in `./page-header`, and
 * this module owns the second level.
 *
 * It owns exactly one `<h2>`, so a dialog's outline sits under the screen's `<h1>`. The caller
 * owns the visible label, the `id` its container names in `aria-labelledby`, and the `id`
 * `aria-describedby` names for the supporting sentence. It is not interactive and adds no focus
 * stop — a heading in the tab order would stand between a reader and the decision the dialog
 * exists for — and wears the product's section-title style from role tokens.
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
