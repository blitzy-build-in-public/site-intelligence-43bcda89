/**
 * The titled surface primitive of the Site Intelligence workspace.
 *
 * A card is the bounded surface that groups one subject: the overview's "Changed since your last
 * visit" block, the investigation's "What changed" card, the per-product health card in the FileMap
 * canvas right stack, and the post-approval outcome card. It carries a background, a 1 px boundary
 * and the card radius, and it owns its own `<h2>` so that the heading of a titled group is emitted
 * by the component that owns it rather than by a screen. A screen's single top-level heading belongs
 * to `src/components/page-header.tsx`, so every card contributes the level beneath it.
 *
 * The surface has no shadow, and that absence is deliberate: specification §4.3 defines no shadow
 * scale, `src/theme/tokens.css` clears Tailwind's shadow namespace so no shadow utility exists to
 * select, and elevation is expressed by the boundary and the surface token alone. The next reader
 * will be tempted to add one; a box shadow, a pseudo-element, an offset border or a filter standing
 * in for it would introduce a second elevation cue that the token tables do not measure.
 *
 * Every value on this surface comes from a role token, which is what lets it resolve per theme: the
 * background is the first raised surface, the boundary the hairline role and the text the primary
 * role, so Command and Paper each supply their own measured pairing and no component colour is
 * hard-coded here.
 */
import { useId } from 'react';
import type { ReactNode } from 'react';

/** Props of {@link Card}. Additive-only: `src/components/metric-tile.tsx` composes this component. */
export interface CardProps {
  /** The card's content. Required: an empty surface has no reason to exist. */
  readonly children: ReactNode;
  /**
   * The card's heading text, rendered inside the `<h2>` this component owns.
   *
   * Absent, `null` and the empty string all leave the surface untitled: no heading element is
   * rendered, and no `aria-labelledby` points at a node that does not exist, so an untitled group
   * adds no empty entry to the accessibility tree.
   */
  readonly title?: ReactNode;
  /**
   * A slot at the end of the title row, for a control such as the "View as table" toggle.
   *
   * The component places the slot and does not style what it receives, so the control keeps the
   * appearance and the accessible name its own module gives it.
   */
  readonly actions?: ReactNode;
  /**
   * The element the surface renders as. Defaults to `'section'`.
   *
   * A caller passes `'article'` for a self-contained item in a list of like items and `'div'` where
   * the surface is purely presentational.
   */
  readonly as?: 'section' | 'article' | 'div';
}

/**
 * Renders one titled surface.
 *
 * The `<section>` default is named by the heading it renders: `aria-labelledby` points at the `<h2>`
 * when a title exists, and no `aria-label` is invented when it does not, because a caller-supplied
 * title is the only name this component can honestly give the group. The surface is not
 * interactive, so it adds no focus stop and no `tabIndex`.
 */
export function Card({ children, title, actions, as = 'section' }: CardProps) {
  const headingId = useId();

  /* A title of `0` is still a title the caller passed, so presence is tested against `undefined`,
     `null` and the empty string rather than against truthiness. The heading element and the
     `aria-labelledby` reference read the same flag, so they agree on whether a heading exists, and
     no empty heading or empty name reference reaches the accessibility tree. */
  const hasTitle = title !== undefined && title !== null && title !== '';
  const hasActions = actions !== undefined && actions !== null;
  const Element = as;

  return (
    <Element
      aria-labelledby={hasTitle ? headingId : undefined}
      className="flex min-w-0 flex-col gap-3 rounded-card border border-hairline bg-surface-1 p-4 text-text-primary"
    >
      {hasTitle || hasActions ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          {hasTitle ? (
            <h2 id={headingId} className="text-16 font-semibold text-text-primary">
              {title}
            </h2>
          ) : null}
          {hasActions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Element>
  );
}
