/**
 * The stage-notice page of the Site Intelligence shell.
 *
 * Seven routes belong to stages S4 and S5, which this run does not build, yet the navigation lists
 * their entries and one persona's entry route is among them: the external supplier engineer lands
 * on the evidence workspace. This page is what those routes render, so a person who reaches one by
 * address is told which stage the workspace arrives in and is given a way back that works, instead
 * of landing on a page that does not exist (rule P-8).
 *
 * The sentence is built from two facts and types neither. The stage comes from the `stage` prop the
 * router passes for the route it mounted, so this page never inspects the URL to guess a stage. The
 * workspace's name is read from the navigation table in `./nav-items.ts`, which is the single source
 * of every entry's label, so no workspace, route or record name is written here (rule P-6).
 *
 * Nothing else happens: no service read, no clock read, no count of what will arrive and no teaser
 * figure. The page is a statement and the way back, which is also why it states only that a
 * workspace arrives later and describes nothing the unbuilt stage would deliver (rule P-4).
 */
import { Link, matchPath, useLocation } from 'react-router';
import type { ReactElement } from 'react';

import { Card } from '../components/card';
import { PageHeader } from '../components/page-header';
import { CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES } from '../components/tooltip';
import { FURTHER_ROUTES, NAV_ITEMS } from './nav-items';

/**
 * Props of {@link StageNoticePage}.
 *
 * `stage` is supplied by the route element rather than derived, because the router already knows
 * which stage owns the route it mounted: S4 for the evidence, supplier, supplier-profile and
 * material-profile routes, S5 for the production-plan, sources and models routes. The literal union
 * keeps a built stage from rendering a notice at all.
 */
export interface StageNoticePageProps {
  /** The stage that will build the route this page is rendered for. */
  readonly stage: 4 | 5;
}

/**
 * The label of the link back to the queue.
 *
 * Held here so the wording has one owner, the way `VIEW_AS_TABLE_LABELS` owns its control's words:
 * the component renders it and a test names it through this constant instead of retyping it.
 */
export const STAGE_NOTICE_LINK_LABEL = 'Back to the exception queue';

/**
 * The route the link returns to.
 *
 * The exception queue is the entry point of the decision loop that is built, so it is reachable for
 * every persona and is the one destination that needs no argument; the AAP names this exact path as
 * the way back from every stage-notice route. It is stated once here so the component and the tests
 * that check the link agree on it, and it is deliberately not read from the navigation table: that
 * table supplies the notice's workspace labels, while this is the fixed destination a person is sent
 * to, and deriving one from the other would tie the only always-working link to a lookup that could
 * answer nothing.
 */
export const EXCEPTION_QUEUE_PATH = '/exceptions';

/** The noun the sentence is built around, and the word that decides whether it repeats. */
const WORKSPACE_NOUN = 'workspace';

/**
 * The page's only link surface.
 *
 * It composes the two class lists `src/components/tooltip.tsx` owns rather than restating them: the
 * bordered structure every control shares (the 24x24 px minimum target of rule B-3, the 13 px label,
 * the 2 px `--color-focus-ring` outline drawn on `focus-visible` alone so a pointer click leaves no
 * ring behind, and the `motion-safe` colour transition), then the one secondary appearance (the
 * second raised surface, the control boundary, and its hover and pressed states). That is what keeps
 * this link and the not-found page's link identical to the secondary `ActionButton`; `self-start`
 * is the only thing added here, because the link sits in a column and takes its own width.
 */
const LINK_CLASSES = [
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
  'self-start',
].join(' ');

/** The page column: a header above the card, separated by the 4 px grid the token tables fix. */
const PAGE_CLASSES = 'flex min-w-0 flex-col gap-6';

/**
 * The leading static segment of a route pattern, or `null` where the pattern has none.
 *
 * `'/materials/:materialId'` answers `'materials'`; `'/'` answers `null`. Used only for the further
 * routes of the navigation table, which carry no label of their own.
 */
function staticSegmentOf(pattern: string): string | null {
  for (const segment of pattern.split('/')) {
    if (segment.length > 0 && !segment.startsWith(':')) {
      return segment;
    }
  }
  return null;
}

/**
 * The name of the workspace a path belongs to, read from the navigation table.
 *
 * A visible entry answers its own label. A further route - the supplier and material profiles, which
 * the navigation never lists - carries no label, so its pattern's leading static segment names it;
 * that segment is the table's own wording rather than a name typed in this file. A path in neither
 * table answers `null`, which the sentence renders without a name so no heading is ever empty.
 */
function workspaceNameFor(pathname: string): string | null {
  const item = NAV_ITEMS.find((entry) => matchPath(entry.to, pathname) !== null);
  if (item !== undefined) {
    return item.label;
  }

  const furtherRoute = FURTHER_ROUTES.find((route) => matchPath(route.path, pathname) !== null);
  if (furtherRoute !== undefined) {
    return staticSegmentOf(furtherRoute.path);
  }

  return null;
}

/**
 * The workspace's name as it reads inside the sentence.
 *
 * Only the first character is ever lower-cased, so the label continues the sentence rather than
 * opening it while every character after the first keeps the case the navigation table gave it. A
 * capital after the first character marks a name the product writes in its own case - the
 * workspace's own name, "FileMap canvas", is one - and such a label is kept verbatim, its first
 * character included: rule P-7 fixes that spelling, and lower-casing its opening would still write
 * "fileMap canvas". A name absent or blank answers the empty string, which the sentence renders
 * without a name.
 *
 * @param workspaceName The name read from the navigation table, or `null` where the path has none.
 * @returns The name as the sentence writes it, or the empty string where there is none.
 */
function sentenceCasedName(workspaceName: string | null): string {
  const trimmed = workspaceName === null ? '' : workspaceName.trim();
  if (trimmed.length === 0) {
    return '';
  }

  const rest = trimmed.slice(1);
  return /[A-Z]/.test(rest) ? trimmed : `${trimmed.charAt(0).toLowerCase()}${rest}`;
}

/**
 * The one sentence the page states.
 *
 * `The <workspace> workspace arrives in stage S<stage>.` is the fixed shape. The name's first
 * character is lower-cased where the label is not a mixed-case name of the product's own, so the
 * name reads as the rest of the sentence while the remainder keeps its own case: rule P-7 fixes the
 * workspace's name as "FileMap canvas", and lower-casing it would write "fileMap canvas". A label
 * that already ends in "workspace" - the evidence entry is called "Evidence workspace" - contributes
 * that word itself rather than repeating it, because the evidence route must read "The evidence
 * workspace arrives in stage S4." A name absent or blank leaves the sentence without one, keeping
 * the shape and never rendering an empty heading.
 *
 * Exported because it is the whole of what the page says: a test can assert the wording for a stage
 * and a name without mounting a router.
 *
 * @param stage The stage that will build the route.
 * @param workspaceName The name read from the navigation table, or `null` where the path has none.
 * @returns The notice sentence, ending in a full stop.
 */
export function stageNoticeSentence(
  stage: StageNoticePageProps['stage'],
  workspaceName: string | null,
): string {
  const arrival = `arrives in stage S${stage}.`;
  const name = sentenceCasedName(workspaceName);

  if (name.length === 0) {
    return `The workspace on this route ${arrival}`;
  }

  const subject = name.endsWith(WORKSPACE_NOUN)
    ? `The ${name}`
    : `The ${name} ${WORKSPACE_NOUN}`;

  return `${subject} ${arrival}`;
}

/**
 * The page the S4 and S5 routes render.
 *
 * `PageHeader` supplies the page's only level-one heading, which is the notice sentence itself: the
 * `Card` beneath it is untitled, so it renders no level-two heading and the page's heading structure
 * is a single `h1` with nothing above or below it to skip (rule B-3). The link is a real `Link` to a
 * route the router declares, so it navigates and is operable from the keyboard (rule P-8). Nothing
 * on the page is disabled, nothing claims a capability the demonstration lacks, and the same
 * component serves both stages with no per-route variant.
 */
export function StageNoticePage({ stage }: StageNoticePageProps): ReactElement {
  const { pathname } = useLocation();
  const notice = stageNoticeSentence(stage, workspaceNameFor(pathname));

  return (
    <div className={PAGE_CLASSES}>
      <PageHeader title={notice} />
      <Card>
        <p className="text-14 break-words text-text-secondary">
          The screens of this stage are not part of this demonstration. The exception queue is
          available now and lists every open disruption.
        </p>
        <Link to={EXCEPTION_QUEUE_PATH} className={LINK_CLASSES}>
          {STAGE_NOTICE_LINK_LABEL}
        </Link>
      </Card>
    </div>
  );
}
