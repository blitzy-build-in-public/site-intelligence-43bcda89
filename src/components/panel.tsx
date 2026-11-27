import { useId } from 'react';
import type { ReactNode } from 'react';

/**
 * Props for {@link Panel}.
 */
export interface PanelProps {
  /** The grouped content, rendered directly inside the surface. */
  children: ReactNode;
  /**
   * A short caption naming the group. It is rendered in the caption text role and, when the panel
   * renders as its default `<section>`, it becomes that region's accessible name, so a group can be
   * announced without a heading. Absent, `null` and the empty string all leave the caption out
   * entirely — no caption element, and no name reference pointing at text that does not exist — so
   * the panel carries no accessible name of its own.
   */
  label?: ReactNode;
  /** The element the surface is built from. Defaults to `'section'`. */
  as?: 'section' | 'div';
  /** Layout-only additions, such as a grid area or a flex basis. Never a colour or a surface. */
  className?: string;
}

/**
 * The second raised surface, for content grouped under a small caption.
 *
 * Two surface levels exist and this is the lower of them: `Card` is the titled content surface on
 * `--color-surface-1` with `--radius-card`, carrying the heading that gives a block its name;
 * `Panel` sits on `--color-surface-2` with `--radius-panel` inside a card or beside one, grouping
 * content that is already named — an evidence drawer section, a block of the canvas right stack,
 * the assistant's side panel. `Panel` renders no heading, so it never disturbs the heading outline
 * a screen's page header and cards own, and it drops the caption entirely rather than inventing a
 * name when none is given. Reach for `Card` when the block needs a heading of its own.
 *
 * Every value comes from a role defined in `src/theme/tokens.css`, so the surface, its hairline and
 * its caption follow the active theme: a panel is never themed by a component, and no raw palette
 * value is reachable from here.
 */
export function Panel({ children, label, as = 'section', className }: PanelProps) {
  const captionId = useId();

  /* An empty caption is no caption, so presence is tested against `undefined`, `null` and the empty
     string rather than against truthiness, which is the predicate `Card` applies to its title. The
     name reference is emitted only from the `<section>` default, because a `<div>` has no role for
     `aria-labelledby` to name: the attribute would be ignored there and would read as a name given
     to nothing. The caption itself still renders either way, since it is visible content and only
     its use as a name depends on the role. */
  const hasCaption = label !== undefined && label !== null && label !== '';
  const isNamed = hasCaption && as === 'section';
  const Element = as;

  return (
    <Element
      className={joinClasses(
        'rounded-panel border border-hairline bg-surface-2 p-4 text-14 text-text-primary',
        className,
      )}
      aria-labelledby={isNamed ? captionId : undefined}
    >
      {hasCaption ? (
        /* Block flow rather than a flex column with a gap: the panel groups arbitrary content, and
           a flex container would turn every child into a flex item whose sizing and collapsed
           margins the caller cannot predict. Only the caption carries a margin, so the content's
           own vertical rhythm survives unchanged. */
        <p id={captionId} className="mb-2 text-12 text-text-caption">
          {label}
        </p>
      ) : null}
      {children}
    </Element>
  );
}

/**
 * Concatenates the class names that are present, so an omitted `className` leaves no trailing
 * space and no falsy entry reaches the attribute.
 */
function joinClasses(...values: readonly (string | undefined)[]): string {
  return values.filter((value) => value !== undefined && value !== '').join(' ');
}
