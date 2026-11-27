/**
 * The page an unknown address lands on.
 *
 * `src/app/router.tsx` mounts this component as the `*` child of the shell layout, so it renders
 * inside the shell: the top bar, the navigation, the simulated-data badge, the theme and density
 * switches and the role switcher are all still present above it, which is what rule P-1 asks of
 * every route. The page therefore paints no overlay, no full-height surface and no backdrop of its
 * own — it is a normal block in the shell's content area, and the shell keeps every control it owns.
 *
 * The address that missed is deliberately not read, echoed or rendered. A path is text the visitor
 * controls, and repeating an arbitrary path into the page turns a wrong address into a place to
 * inject markup; the page says only that the address does not match a page in this demonstration,
 * and says nothing that would suggest the address once existed or that a record is missing from a
 * real system, because neither is true of a browser-only demonstration (rule P-4).
 *
 * Rules served:
 * - P-8: the page offers one control and it works — a real router link that navigates to the
 *   exception queue, so nothing here is dead.
 * - P-7: the wording uses the product's own vocabulary and names no company, vendor, carmaker or
 *   cloud product, and no placeholder prose.
 * - P-4: no sentence states or implies a deployment property, and none of the barred capability
 *   claims appears.
 * - P-6: the page types no figure, count, date or record identifier. It has no business value to
 *   show and reads no service, so nothing on it could be mistaken for a computed result.
 * - B-3: exactly one level-one heading, and it belongs to `src/components/page-header.tsx`; the link
 *   is keyboard operable, carries a visible focus ring and a 24x24 px minimum target, and every
 *   colour is a role token so both themes keep the measured contrast.
 * - B-1 / B-2: no asset is imported or fetched, and nothing reads configuration or resembles a
 *   credential.
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { Card } from '../components/card';
import { PageHeader } from '../components/page-header';
import { CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES } from '../components/tooltip';
import { EXCEPTION_QUEUE_PATH } from '../types/routes';

/** The page's title, and the text of the one heading the page renders. */
const NOT_FOUND_TITLE = 'Page not found';

/**
 * The page's single sentence.
 *
 * It states the one fact a wrong address establishes — that no page answers it here — and claims
 * nothing about a record, a system or a capability (rule P-4).
 */
const NOT_FOUND_SENTENCE = 'This address does not match a page in this demonstration.';

/**
 * The link's text.
 *
 * The name says where the link goes rather than what went wrong, so a reader arriving by screen
 * reader hears a destination and not a repetition of the sentence above it (rule B-3).
 */
const EXCEPTIONS_LINK_LABEL = 'Go to the exception queue';

/**
 * The link's appearance: the secondary-control shape `src/components/tooltip.tsx` owns, composed
 * rather than restated, so the one control on this page answers the pointer the way every other
 * control in the shell does and picks up their token changes with them.
 *
 * The 1 px `control-boundary` border and the raised `surface-2` fill are what identify it as a
 * control without relying on colour (WCAG 1.4.1), which is why it carries no underline: the shape,
 * not a text decoration, is the cue. {@link CONTROL_STRUCTURE_CLASSES} supplies the 24x24 px
 * minimum target of rule B-3 and the 2 px `--color-focus-ring` ring drawn on `focus-visible`, and
 * {@link SECONDARY_CONTROL_CLASSES} the fill, boundary, hover and pressed states; `self-start` is
 * the one addition, keeping the link at its own width inside the column.
 */
const EXCEPTIONS_LINK_CLASSES = [
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
  'self-start',
].join(' ');

/**
 * Renders the not-found page for any route the router does not declare.
 *
 * The heading comes from `PageHeader`, which owns a screen's single `<h1>`, and the sentence and the
 * link sit on a `Card`; this file writes no heading element of its own, so the page cannot emit a
 * second level-one heading or skip a level (rule B-3, AAP 0.5.2).
 *
 * @returns The page's content, rendered inside the shell's content area.
 */
export function NotFoundPage(): ReactElement {
  return (
    <div className="flex min-w-0 flex-col">
      <PageHeader title={NOT_FOUND_TITLE} />
      <Card as="div">
        <p className="text-14 break-words text-text-secondary">{NOT_FOUND_SENTENCE}</p>
        <Link className={EXCEPTIONS_LINK_CLASSES} to={EXCEPTION_QUEUE_PATH}>
          {EXCEPTIONS_LINK_LABEL}
        </Link>
      </Card>
    </div>
  );
}
