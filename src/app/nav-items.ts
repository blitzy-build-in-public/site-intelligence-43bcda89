/**
 * The navigation table of the Site Intelligence shell.
 *
 * Declares the entries the shell's navigation offers: the thirteen visible
 * entries in three groups, the further routes that answer without being listed,
 * the build stage that owns each entry, and the disabled state with the exact
 * tooltip that goes with it.
 *
 * Pure data module (AAP 0.12.1 "Navigation table"; AAP 0.13.1's tree; AAP
 * 0.15.1's high-priority row for `app.tsx`, `router.tsx`, `providers.tsx` and
 * this file). It holds values and the two lookups the shell needs, imports only
 * the `Role` union, and reads nothing: no React, no JSX, no I/O, no clock, no
 * seed record and no service adapter. Every collection and every member is
 * `readonly`, so a consumer cannot reorder the navigation or rewrite an entry at
 * run time.
 *
 * DERIVATION - section 5.2 is not on disk. The specification's own navigation
 * table (section 5.2) is not part of this repository, so the entries below are
 * derived from the route table of AAP 0.12.4: its screen identifiers, the stage
 * that owns each route, the tooltip on each entry whose stage has not arrived,
 * and the persona entry routes its landing-route paragraph fixes. If
 * `platform-specification.md` is supplied later, its section 5.2 labels and
 * order transcribe over this derivation and supersede it; no consumer changes,
 * because the shell, the router and the tests all read the table from here
 * rather than restating an entry.
 *
 * Rules served:
 * - P-8: one entry either navigates to a route the router declares or carries a
 *   `disabledReason` that explains itself in words. This module is the single
 *   source of that state, so no second list can drift from it, and the shell
 *   renders a disabled entry as an action control with its reason rather than as
 *   a link.
 * - P-7: every label uses the product's own vocabulary, Site Intelligence and the
 *   FileMap canvas, and names no real company or product.
 * - P-4: no label states or implies a deployment property. The governance entries
 *   are named for the screen that shows declared configuration, and nothing here
 *   describes what that configuration would establish.
 * - P-6: routes, screen identifiers and stage numbers only. No threshold, amount,
 *   count, date or record identifier appears, because nothing here is a business
 *   figure.
 * - P-2: `Role` is the only import, so this module cannot become a second data
 *   boundary.
 * - B-3: an entry's label is the accessible name of the control the shell renders
 *   for it, so a disabled entry is announced together with its reason.
 * - B-2: nothing here reads configuration and nothing resembles a credential.
 */
import type { Role } from '../types/entities';

/**
 * The build stage that owns a route.
 *
 * Stages S1 to S3 are built in this run and their entries navigate. S4 and S5
 * arrive in a later run (AAP 0.7), so their entries are listed and disabled with
 * the tooltip `disabledTooltipFor` returns, which is how a person sees where the
 * workspace is going without a control that fails when they reach for it.
 */
export type NavStage = 1 | 2 | 3 | 4 | 5;

/**
 * One visible navigation entry.
 */
export interface NavItem {
  /** Stable kebab-case identifier, unique across the whole table. */
  readonly id: string;

  /** The visible label, and the accessible name of the control that renders it. */
  readonly label: string;

  /**
   * The route path the entry navigates to.
   *
   * A disabled entry carries the route its stage will declare, kept as a pattern
   * where the route is parameterised (`/plants/:plantId/plan`). The shell renders
   * a disabled entry through an action control and never as a link, so a person
   * never follows a pattern from here; the route itself is still declared, since
   * `STAGE_NOTICE_ROUTES` takes every disabled entry's own `to` and
   * `FURTHER_ROUTES` publishes it. A person who reaches that path by address is
   * therefore told which stage its workspace arrives in rather than landing on a
   * page that does not exist.
   */
  readonly to: string;

  /**
   * The screen identifier the route belongs to, or `null` where no screen of this
   * run owns it yet.
   */
  readonly screenId: string | null;

  /** The stage that owns the route. */
  readonly stage: NavStage;

  /**
   * `null` when the entry navigates, or the exact tooltip text when it is
   * disabled. The two are mutually exclusive by construction: `NAV_GROUPS` fills
   * one and leaves the other `null` for every entry.
   */
  readonly disabledReason: string | null;
}

/**
 * One labelled group of navigation entries, rendered in declaration order.
 */
export interface NavGroup {
  /** Stable kebab-case identifier. */
  readonly id: string;

  /** The visible group heading. */
  readonly label: string;

  /** The group's entries, in render order. */
  readonly items: readonly NavItem[];
}

/**
 * A route the application answers without listing it in the navigation.
 *
 * These are the routes a person reaches from a row, a card or the entry route:
 * a detail screen for a selected record, or the page that states which stage a
 * workspace arrives in. The router mounts each of them; the navigation never
 * shows them.
 */
export interface FurtherRoute {
  /** The route path as the router matches it. */
  readonly path: string;

  /** The screen identifier the route belongs to, or `null` for the root redirect. */
  readonly screenId: string | null;

  /** The stage that owns the route. */
  readonly stage: NavStage;

  /**
   * What the router mounts for the path:
   * - `'screen'` - a screen this run builds;
   * - `'stage-notice'` - the page stating the stage the workspace arrives in;
   * - `'redirect'` - a path that resolves to the active persona's entry route.
   */
  readonly kind: 'screen' | 'stage-notice' | 'redirect';
}

/**
 * The tooltip of an entry whose stage has not been built.
 *
 * Fixed text: exact wording, no trailing period, never paraphrased and never
 * abbreviated, because rule P-8 makes this sentence the only thing that tells a
 * person why an entry cannot act. It is also the text the stage-notice page
 * repeats, so a route reached directly explains itself in the same words.
 */
export const STAGE_4_TOOLTIP = 'Arrives in stage S4';

/** The stage S5 tooltip. See `STAGE_4_TOOLTIP` for why the text is fixed. */
export const STAGE_5_TOOLTIP = 'Arrives in stage S5';

/**
 * The navigation in render order: three groups, thirteen entries.
 *
 * The groups follow the work a person does rather than the stage that built each
 * screen, so the FileMap canvas sits first even though it arrived in S2: it is
 * the workspace the product is named for and the entry route four of the eight
 * personas land on. Every entry whose stage is S4 or S5 carries its tooltip and
 * navigates nowhere; every other entry carries a route and no tooltip.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        id: 'canvas',
        label: 'FileMap canvas',
        to: '/canvas',
        screenId: 'SCR-12',
        stage: 2,
        disabledReason: null,
      },
      {
        id: 'overview',
        label: 'Overview',
        to: '/overview',
        screenId: 'SCR-01',
        stage: 1,
        disabledReason: null,
      },
      {
        id: 'exceptions',
        label: 'Exceptions',
        to: '/exceptions',
        screenId: 'SCR-02',
        stage: 1,
        disabledReason: null,
      },
      {
        id: 'competitive',
        label: 'Competitive atlas',
        to: '/competitive',
        screenId: 'SCR-13',
        stage: 3,
        disabledReason: null,
      },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    items: [
      {
        id: 'approvals',
        label: 'Approvals',
        to: '/approvals',
        screenId: 'SCR-05',
        stage: 1,
        disabledReason: null,
      },
      {
        id: 'audit',
        label: 'Audit trail',
        to: '/audit',
        screenId: 'SCR-05',
        stage: 1,
        disabledReason: null,
      },
      {
        id: 'sovereignty',
        label: 'Sovereignty and policies',
        to: '/admin/sovereignty',
        screenId: 'SCR-07',
        stage: 1,
        disabledReason: null,
      },
      {
        id: 'assistant',
        label: 'Evidence assistant',
        to: '/assistant',
        screenId: 'SCR-06',
        stage: 1,
        disabledReason: null,
      },
    ],
  },
  {
    id: 'evidence-and-data',
    label: 'Evidence and data',
    items: [
      {
        id: 'evidence',
        label: 'Evidence workspace',
        to: '/evidence',
        screenId: null,
        stage: 4,
        disabledReason: STAGE_4_TOOLTIP,
      },
      {
        id: 'suppliers',
        label: 'Suppliers',
        to: '/suppliers',
        screenId: null,
        stage: 4,
        disabledReason: STAGE_4_TOOLTIP,
      },
      {
        id: 'production-plan',
        label: 'Production plan',
        to: '/plants/:plantId/plan',
        screenId: null,
        stage: 5,
        disabledReason: STAGE_5_TOOLTIP,
      },
      {
        id: 'sources',
        label: 'Data sources',
        to: '/admin/sources',
        screenId: null,
        stage: 5,
        disabledReason: STAGE_5_TOOLTIP,
      },
      {
        id: 'models',
        label: 'Models',
        to: '/admin/models',
        screenId: null,
        stage: 5,
        disabledReason: STAGE_5_TOOLTIP,
      },
    ],
  },
];

/**
 * Every visible entry, flattened from `NAV_GROUPS` in the same order.
 *
 * Derived from the groups rather than declared a second time, so the two cannot
 * disagree: a consumer that wants one flat list for a roving cursor, a count or a
 * test reads this, and a consumer that wants the headings reads `NAV_GROUPS`.
 * `flatMap` keeps the derivation free of indexed access, which strict indexing
 * would widen to include `undefined`.
 */
export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap(
  (group) => group.items,
);

/**
 * The two stage-notice routes the navigation never lists.
 *
 * A supplier profile and a material profile are opened from a row or a card that
 * shows the record, so neither has a `NavItem` whose `to` could carry its path and
 * both are stated here instead. They belong to S4 and render the stage-notice page
 * for the same reason the disabled entries do: a person who reaches one by address
 * is told which stage the workspace arrives in rather than landing on a page that
 * does not exist (rule P-8).
 */
const STAGE_NOTICE_DETAIL_ROUTES: readonly FurtherRoute[] = [
  {
    path: '/suppliers/:supplierId',
    screenId: null,
    stage: 4,
    kind: 'stage-notice',
  },
  {
    path: '/materials/:materialId',
    screenId: null,
    stage: 4,
    kind: 'stage-notice',
  },
];

/**
 * Every route that renders the stage-notice page: one list, one source per path.
 *
 * The entries of the navigation whose stage has not been built contribute their own
 * `to`, screen identifier and stage, so a disabled entry cannot lose its route and a
 * route cannot name a path the navigation states differently; the two profile paths
 * the navigation never lists are appended from `STAGE_NOTICE_DETAIL_ROUTES`. Deriving
 * them here rather than retyping them is what makes the router's half of the contract
 * checkable: `src/app/router.tsx` mounts the stage-notice page at every path in this
 * list, with the stage the entry carries, so the external supplier engineer's
 * `/evidence` home explains itself instead of falling to the not-found page (AAP 0.7,
 * AAP 0.12.4, rule P-8).
 */
export const STAGE_NOTICE_ROUTES: readonly FurtherRoute[] = [
  ...NAV_ITEMS.filter((item) => item.disabledReason !== null).map(
    (item): FurtherRoute => ({
      path: item.to,
      screenId: item.screenId,
      stage: item.stage,
      kind: 'stage-notice',
    }),
  ),
  ...STAGE_NOTICE_DETAIL_ROUTES,
];

/**
 * The routes the application answers without listing them in the navigation.
 *
 * This list holds every path the router declares besides the enabled `to` of each
 * navigation entry, so the router's table is those enabled entries plus this list and
 * nothing else. Each path is reached from a visible control rather than from the
 * navigation: a row or a card opens the detail screen for the record it shows, the
 * approvals inbox opens one approval, the policy list opens one policy, a stage-notice
 * path states which stage its workspace arrives in, and the root path resolves to the
 * active persona's entry route.
 *
 * All seven stage-notice paths are in this list. Two are the profile routes the
 * navigation never lists, and the other five arrive from `STAGE_NOTICE_ROUTES` as the
 * `to` of the entries whose stage has not been built rather than being retyped here,
 * so an entry's route and its disabled state are declared together in `NAV_GROUPS` and
 * no path depends on a reader drawing the right conclusion from a comment.
 *
 * Nothing in this module points at a route the router does not answer, and no path
 * appears twice (AAP 0.13.2).
 */
export const FURTHER_ROUTES: readonly FurtherRoute[] = [
  {
    path: '/exceptions/:exceptionId',
    screenId: 'SCR-03',
    stage: 1,
    kind: 'screen',
  },
  {
    path: '/exceptions/:exceptionId/scenarios',
    screenId: 'SCR-04',
    stage: 1,
    kind: 'screen',
  },
  {
    path: '/approvals/:approvalId',
    screenId: 'SCR-05',
    stage: 1,
    kind: 'screen',
  },
  {
    path: '/admin/policies/:policyId',
    screenId: 'SCR-07',
    stage: 1,
    kind: 'screen',
  },
  ...STAGE_NOTICE_ROUTES,
  {
    path: '/',
    screenId: null,
    stage: 1,
    kind: 'redirect',
  },
];

/**
 * The tooltip a route of the given stage carries, or `null` when the stage is
 * built and the route navigates.
 *
 * One function answers this so a consumer derived from a stage - the navigation,
 * the router's stage-notice routes, a test - cannot invent a third wording. The
 * `switch` covers every member of `NavStage`, so a stage added to the union is a
 * compile error here rather than an entry that silently navigates nowhere.
 */
export function disabledTooltipFor(stage: NavStage): string | null {
  switch (stage) {
    case 1:
      return null;
    case 2:
      return null;
    case 3:
      return null;
    case 4:
      return STAGE_4_TOOLTIP;
    case 5:
      return STAGE_5_TOOLTIP;
  }
}

/**
 * The route each persona lands on, keyed by role (AAP 0.12.4).
 *
 * Typed as a total `Record<Role, string>`, so a role added to the union fails
 * compilation until its landing route is stated here. The personas of
 * specification section 3 map as follows:
 * - USR-01 material planner, USR-03 head of supply chain, USR-05 production
 *   planner and USR-07 supplier quality engineer land on the FileMap canvas, the
 *   workspace the product is named for;
 * - USR-02 plant manager lands on the approvals inbox, the queue that asks for a
 *   decision;
 * - USR-04 platform administrator lands on the declared-configuration screen;
 * - USR-06 auditor lands on the audit trail;
 * - USR-08 external supplier engineer lands on the evidence workspace, which
 *   renders the stage-notice page until S4 arrives rather than failing.
 */
const ENTRY_ROUTE_BY_ROLE: Record<Role, string> = {
  'material-planner': '/canvas',
  'plant-manager': '/approvals',
  'head-of-supply-chain': '/canvas',
  'platform-administrator': '/admin/sovereignty',
  'production-planner': '/canvas',
  auditor: '/audit',
  'supplier-quality-engineer': '/canvas',
  'external-supplier-engineer': '/evidence',
};

/**
 * The route the root path resolves to for the given persona.
 *
 * `null` is the shell before the service bootstrap has resolved the active user;
 * it renders no route until then, so the canvas is a defensive default rather than
 * a documented landing route for anyone. Every role member has its own entry
 * above, and the map is total, so this lookup cannot fall through.
 */
export function entryRouteFor(role: Role | null): string {
  return role === null ? '/canvas' : ENTRY_ROUTE_BY_ROLE[role];
}
