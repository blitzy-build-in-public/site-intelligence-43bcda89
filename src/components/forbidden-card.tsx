/**
 * The permission denial, explained: the card a screen shows after the service refused a call because
 * the acting role lacks the permission that call requires, or because the demonstration's forbidden
 * trigger withheld a view the role may read.
 *
 * The enforcement is in the service, never here (AAP §0.6.2). The adapter evaluates the contracts
 * §7.1 matrix and the role's plant scope itself and throws a `Problem` of type `'permission'`, so
 * this card explains an outcome that has already happened and is never the thing that protects a
 * record: a screen that drew every hidden control would still be refused. Nothing here therefore
 * implies that a check made in a browser authorises anything in production (rule P-3), and nothing
 * here states a capability beyond the outcome it reports (rule P-4).
 *
 * The props mirror a permission `Problem` member for member — `requiredPermission`,
 * `rolesWithPermission`, `traceId` and, where one arrived, `message` — so `state-boundary.tsx` hands
 * them straight through and no translation layer can disagree with the service about who may act.
 *
 * Wording. No specification string exists for this card, so what it states is drawn from the failure
 * it was handed: the permission the refused call required in the title, the refusal's own sentence
 * where the service supplied one, the roles the matrix grants that permission as a list beneath, and
 * the trace id last. The sentence is the service's because only the service knows which cause it
 * refused for: a matrix denial says the acting role does not hold the permission, while the
 * demonstration's forbidden trigger refuses a call the role may make, and a card that composed one
 * sentence of its own would turn the second into the first (rules P-3 and P-4). The strings that are
 * fixed elsewhere — the §5.3 simulation labels, the stage tooltips and the SCR-04 empty and disabled
 * sentences — belong to the components that own them and are not repeated here. A role set with no
 * holders is shown as its own caption rather than as an empty list, because a list with nothing in it
 * reads as content that failed to load while the caption states the fact the empty array carries.
 *
 * Every colour is a role utility of `src/theme/tokens.css`, so both themes paint the roles the
 * specification measured rather than a value chosen here; the card adds no elevation cue
 * (specification §4.3 defines none, and the theme layer exposes no utility for one), no icon carrying
 * a meaning on its own, and no focus stop of its own (rule B-3). It types no figure and no record
 * identifier, because the permission, the roles, the refusal's sentence and the trace id all arrive
 * as props (rule P-6).
 */
import type { ReactNode } from 'react';

import type { Permission, Role } from '../types';
import { Card } from './card';
import { MonoValue } from './mono-value';

/**
 * The title sentence, in the one place its wording is written. The permission it names is appended
 * from the prop, so the title cannot drift from the value the service reported.
 */
const TITLE_PREFIX = 'Permission required: ';

/** The caption introducing the roles that hold the permission, in every cause the card explains. */
const ROLES_LABEL = 'Roles that hold this permission';

/**
 * What a role set with no holders says instead of an empty list. Lower-case because it completes the
 * caption above it as a sentence rather than standing as a heading of its own.
 */
const NO_ROLES_CAPTION = 'no role holds this permission';

/** The caption introducing the correlation identifier a reader quotes when reporting the denial. */
const TRACE_ID_LABEL = 'Trace ID';

/** The card's content column: one vertical stack, so no child needs a margin of its own. */
const BODY_CLASSES = 'flex min-w-0 flex-col gap-2';

/** Captions sit one size below body copy in the secondary text role. */
const CAPTION_CLASSES = 'text-13 text-text-secondary';

/**
 * The refusal's own sentence. It leads the supporting text in the same secondary role the captions
 * beneath it use, and it is allowed to wrap because a service sentence naming a role, a permission and
 * the roles that hold it can be long.
 */
const REASON_CLASSES = 'min-w-0 break-words text-13 text-text-secondary';

/**
 * The roles list. A real `<ul>` so the set is announced as a list of that length (rule B-3), one
 * list item per role, in the order the service supplied. The stack is a flex column rather than the
 * default block flow, which removes the markers; the explicit `role="list"` on the element keeps the
 * set announced as a list of that length in the engines that drop that role once the markers are
 * gone.
 */
const ROLE_LIST_CLASSES = 'flex min-w-0 flex-col gap-1 text-14 text-text-primary';

/** The caption shown in place of the list when no role holds the permission. */
const EMPTY_CAPTION_CLASSES = 'text-13 text-text-caption';

/** The trace-id row: caption and value on one line where they fit, wrapping where they do not. */
const TRACE_ROW_CLASSES = 'flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-13';

/** The trace-id value keeps the primary text role, so the diagnostic is the most legible thing here. */
const TRACE_VALUE_CLASSES = 'min-w-0 break-words text-text-primary';

/**
 * A trace id is meant to be quoted, so the value wraps rather than overflowing and a click on it
 * selects the whole identifier.
 */
const TRACE_ID_CLASSES = 'select-all break-all';

/** The caller's action slot. This component places the control and does not draw one. */
const ACTION_CLASSES = 'flex flex-wrap items-center gap-2 pt-1 text-text-primary';

/** Props of {@link ForbiddenCard}. */
export interface ForbiddenCardProps {
  /**
   * The permission the acting role lacks, from `Problem.requiredPermission` of a `'permission'`
   * failure. Required: a denial that does not name what it required cannot be acted on.
   */
  readonly permission: Permission;

  /**
   * The roles that hold the permission above, from `Problem.rolesWithPermission`. Required and
   * possibly empty — a permission no seeded role holds is reported as such rather than hidden.
   */
  readonly roles: readonly Role[];

  /**
   * The refusal's own sentence, from `Problem.message`. Optional, because a caller that has no
   * sentence to quote still has the permission, the roles and the trace id to print.
   *
   * Where it is supplied it is rendered character for character rather than composed again here: the
   * service is the only thing that knows which cause it refused for, so a card that wrote its own
   * account would state one cause's sentence over another's outcome (rules P-3 and P-4).
   */
  readonly reason?: string | undefined;

  /**
   * The correlation identifier of the call that failed, from `Problem.traceId`. Required, and
   * rendered through `MonoValue` in the tabular mono face so a reader can select and quote it: it is
   * the demonstration's only diagnostic (AAP §0.18.1).
   */
  readonly traceId: string;

  /**
   * An optional escape hatch the caller supplies as its own control, such as a router link back to
   * the queue. This component renders no control of its own and leaves what arrives styled as its
   * own module styled it, apart from the inherited text role.
   */
  readonly action?: ReactNode;

  /** Layout-only additions, such as a width or a grid area. Never a colour and never a surface. */
  readonly className?: string;
}

/**
 * Renders the explanation of one permission denial: the refusal's own sentence where the service
 * supplied one, the permission that was required, the roles that hold it, and the trace id of the
 * refused call.
 *
 * The surface is `Card`'s, so the heading, the boundary and the card radius arrive from that
 * component rather than from this one. The card is static content: it is not a dialog, it traps no
 * focus, it announces itself only through the heading the card renders, and the single focusable
 * thing it can contain is the control the caller hands to `action`.
 */
export function ForbiddenCard({
  permission,
  roles,
  reason,
  traceId,
  action,
  className,
}: ForbiddenCardProps) {
  /* The wrapper carries only the caller's layout classes: `CardProps` has no `className` slot, and
     adding one there would rewrite a sibling component's contract from this file. It draws nothing
     and adds no focus stop, so it disappears from the accessibility tree as an unremarkable `div`. */
  return (
    <div className={className}>
      <Card title={`${TITLE_PREFIX}${permission}`}>
        <div className={BODY_CLASSES}>
          {reason !== undefined && reason.length > 0 ? (
            <p className={REASON_CLASSES}>{reason}</p>
          ) : null}
          <p className={CAPTION_CLASSES}>{ROLES_LABEL}</p>
          {roles.length > 0 ? (
            <ul role="list" className={ROLE_LIST_CLASSES}>
              {roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          ) : (
            <p className={EMPTY_CAPTION_CLASSES}>{NO_ROLES_CAPTION}</p>
          )}
          <p className={TRACE_ROW_CLASSES}>
            <span className={CAPTION_CLASSES}>{TRACE_ID_LABEL}</span>
            <span className={TRACE_VALUE_CLASSES}>
              <MonoValue value={traceId} kind="id" className={TRACE_ID_CLASSES} />
            </span>
          </p>
          {action !== undefined && action !== null ? (
            <div className={ACTION_CLASSES}>{action}</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
