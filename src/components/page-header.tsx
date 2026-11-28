import type { ReactNode } from 'react';

/**
 * Props for {@link PageHeader}.
 *
 * Every slot is content the calling screen supplies from its own fixed screen
 * definition; this component adds no text of its own, so it types no figure and
 * no domain identifier.
 */
export interface PageHeaderProps {
  /** Screen title. The one level-one heading the screen renders. */
  readonly title: string;
  /** Optional supporting line under the title; omitted, no paragraph is rendered. */
  readonly description?: string;
  /** Optional slot above the title: a screen identifier or a status cluster. */
  readonly eyebrow?: ReactNode;
  /** Optional primary-action slot at the end of the row; the caller's `ActionButton`. */
  readonly actions?: ReactNode;
}

/**
 * The screen title primitive, and the only owner of a screen's `h1`.
 *
 * Every screen carries its identifier and title from the specification, so it
 * composes this component instead of writing a heading of its own: a second
 * level-one heading anywhere under `src/features` is a defect. The `header` root is
 * a container rather than a landmark — the shell's top bar is the page's only
 * banner — so no banner role is applied here.
 *
 * Colour and size come from role tokens only, and the spacing is fixed: row height
 * is a density concern the data table owns, so nothing here varies with
 * `data-density`. The header carries no simulated label either; a label belongs to
 * the component that renders the labelled figure.
 *
 * The actions slot takes the primary text role so a caller's control inherits a
 * themed colour instead of the user agent's canvas text colour, which resolves to
 * white under a dark colour scheme.
 */
export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6">
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? (
          <div className="flex flex-wrap items-center gap-2 text-13 text-text-caption">{eyebrow}</div>
        ) : null}
        <h1 className="text-28 font-medium break-words text-text-primary">{title}</h1>
        {description ? (
          <p className="text-14 break-words text-text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? (
        /* The actions slot is the header's trailing group, so it takes the end side whether it sits
           beside the title or wraps onto a row of its own: `justify-between` places the two items
           apart on one row, and cannot place a lone item at all, so a wrapped line would otherwise
           read the primary action as a leading one. */
        <div className="ms-auto flex flex-wrap items-center gap-2 text-text-primary">{actions}</div>
      ) : null}
    </header>
  );
}
