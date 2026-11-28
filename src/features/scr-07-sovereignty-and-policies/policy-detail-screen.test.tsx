/**
 * Component suite for `policy-detail-screen.tsx`, SCR-07's policy detail at
 * `/admin/policies/:policyId`.
 *
 * WHAT IT PROVES. Three contracts the route is relied on for, each read off the page a reader receives:
 * that a permission refusal keeps the page header — one `h1` and one description above the forbidden
 * card, so one refusal has one shape whichever SCR-07 route meets it (qa-w013-I32); that a policy the
 * engine never evaluates offers no grant control and states the record's own condition as the reason
 * (qa-w013-I31, rules P-4 and P-8); and that an evaluated policy offers the control, which opens the
 * dialog naming that policy and offering the roster's second approvers without the acting persona
 * (qa-w013-I31, AAP 0.12.4).
 *
 * WHERE THE DATA COMES FROM. The service and the demonstration capability are mocked at
 * `service-provider.tsx`, the one boundary a screen may read through (rule P-2), and `useParams` is
 * replaced so the route's identifier arrives without mounting the shell. Everything else — the
 * screen, `Card`, `PageHeader`, `DataTable`, `MonoValue`, `StatusIndicator`, `StateBoundary`,
 * `ForbiddenCard`, `ActionButton` and the grant dialog — is the real module, because what a reader
 * receives is the thing under test.
 *
 * THE FIXTURE IS INPUT, NOT AN EXPECTED RESULT (rule P-6). Every value below is data handed to the
 * mocked reads: identifiers are opaque placeholders rather than record-identifier shapes, and every
 * instant is derived from the imported `DEMO_CLOCK` instead of being written out. The screen exports
 * its own wording as `POLICY_DETAIL_SCREEN_TEXT`, so the suite names every sentence it drives instead
 * of retyping it; the one string it must restate is the prefix `forbidden-card.tsx` puts before the
 * permission a denial names, which that module does not export.
 *
 * WHAT EACH CASE WOULD CATCH. A header left inside the boundary fails the refusal case, which reads the
 * heading and the description beside it with the forbidden card on screen and no record. A grant
 * control rendered for a policy nothing evaluates fails the declared case, which requires the disabled
 * state and the never-evaluated sentence rather than the permission one. A dialog composed without the
 * roster, or from a policy other than the one on screen, fails the evaluated case, which reads the
 * caption and the approver options the dialog actually rendered.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock, touches the network or reaches outside the service boundary.
 */

/*
 * What is imported and what is replaced. Only the service boundary, the identity capability and the
 * route hook are substituted: the primitives, the boundary and the dialog are the real modules, so a
 * case cannot pass against a mock of the thing it is asserting.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DemonstrationControls } from '../../services/demonstration-controls';
import type { SiteIntelligenceService } from '../../services/site-intelligence-service';
import { DEMO_CLOCK, SOURCE_IDS } from '../../types';
import type {
  ActiveUser,
  AuditEvent,
  Freshness,
  Permission,
  PolicyDetail,
  Problem,
  Result,
  Role,
  Scope,
  Timestamp,
} from '../../types';
import { GRANT_EXCEPTION_DIALOG_TEXT } from './grant-exception-dialog';
import { POLICY_DETAIL_SCREEN_TEXT as TEXT, PolicyDetailScreen } from './policy-detail-screen';

/* ---------------------------------------------------------------------------------------------
 * The one string this suite must restate
 * ------------------------------------------------------------------------------------------- */

/**
 * The prefix `forbidden-card.tsx` puts before the permission a denial names. The card does not export
 * it, and a test cannot reach a private const, so it is restated once here; the permission itself is
 * appended from the fixture, exactly as the card appends it.
 */
const PERMISSION_REQUIRED_PREFIX = 'Permission required: ';

/* ---------------------------------------------------------------------------------------------
 * The fixture: the payloads and the identity the mocked reads answer with
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every result and every failure of these fixtures carries. */
const TRACE_ID = 'trace-policy-detail';

/** One hour in milliseconds, for deriving an instant from the demonstration clock. */
const HOUR_MS = 3_600_000;

/** An instant the given number of hours from the demonstration clock, derived rather than typed. */
function instantAt(offsetHours: number): Timestamp {
  return new Date(Date.parse(DEMO_CLOCK) + offsetHours * HOUR_MS).toISOString();
}

/** The route's identifier for the evaluated policy this suite opens. */
const EVALUATED_POLICY_ID = 'policy-alpha';

/** The decision the engine recorded against the evaluated policy. */
const DECISION: AuditEvent = {
  sequence: 1,
  id: 'event-alpha',
  timestamp: instantAt(0),
  actorType: 'policy',
  actorId: EVALUATED_POLICY_ID,
  action: 'policy block',
  objectRef: 'record-alpha',
  result: 'blocked',
  before: null,
  after: null,
  payloadHash: 'hash-payload',
  traceId: TRACE_ID,
  previousHash: 'hash-previous',
  eventHash: 'hash-event',
};

/** A policy the engine evaluates: the one whose grant flow acts. */
const EVALUATED_POLICY: PolicyDetail = {
  id: EVALUATED_POLICY_ID,
  title: 'Policy alpha',
  statement: 'statement-alpha',
  evaluated: true,
  recentDecisions: [DECISION],
  pendingExceptions: [],
};

/** A policy the deployment only declares: no rule is applied, so no exception can be requested. */
const DECLARED_POLICY: PolicyDetail = {
  id: 'policy-declared',
  title: 'Policy declared',
  statement: 'statement-declared',
  evaluated: false,
  recentDecisions: [],
  pendingExceptions: [],
};

/** The persona the session acts as, holding the write the grant flow makes. */
const ACTING_USER: ActiveUser = {
  id: 'persona-alpha',
  name: 'Persona Alpha',
  role: 'platform-administrator',
  plantIds: ['plant-alpha'],
  permissions: ['policy.read', 'policy.exception.request'],
  homeRoute: '/admin/sovereignty',
};

/** The roster a second approver is chosen from: the acting persona and two others. */
const ROSTER: ActiveUser[] = [
  ACTING_USER,
  {
    id: 'persona-beta',
    name: 'Persona Beta',
    role: 'auditor',
    plantIds: ['plant-alpha'],
    permissions: ['audit.read'],
    homeRoute: '/audit',
  },
  {
    id: 'persona-gamma',
    name: 'Persona Gamma',
    role: 'head-of-supply-chain',
    plantIds: ['plant-alpha'],
    permissions: ['policy.read'],
    homeRoute: '/exceptions',
  },
];

/** The scope the shell hands the screen: the unfiltered "all plants, all products" selection. */
const SCOPE: Scope = { plants: [], products: [] };

/** The six sources all answering and current, as `Meta.freshness` reports them. */
const FRESH_SOURCES: Freshness[] = SOURCE_IDS.map(
  (source): Freshness => ({ source, asOf: DEMO_CLOCK, state: 'fresh' }),
);

/** The envelope every read resolves to: the payload and the metadata that qualifies it. */
function envelope<T>(data: T): Result<T> {
  return { data, meta: { freshness: [...FRESH_SOURCES], simulated: true, traceId: TRACE_ID } };
}

/** The permission a refused read names, from the contracts §7.1 vocabulary. */
const REQUIRED_PERMISSION: Permission = 'policy.read';

/** The roles that hold it, so the forbidden card names who may act instead of only what is missing. */
const DENIAL_ROLES: Role[] = ['platform-administrator'];

/** The refusal a persona without `policy.read` meets on this route. */
const DENIAL: Problem = {
  type: 'permission',
  message: 'Reading this policy needs a permission the acting persona does not hold.',
  traceId: TRACE_ID,
  requiredPermission: REQUIRED_PERMISSION,
  rolesWithPermission: DENIAL_ROLES,
};

/* ---------------------------------------------------------------------------------------------
 * The service boundary — mocked at the provider, never at the network
 * ------------------------------------------------------------------------------------------- */

/** The port members this suite drives: the policy read and the write the dialog would make. */
type ScreenReads = Pick<SiteIntelligenceService, 'getPolicy' | 'requestPolicyException'>;

/** The demonstration capability the screen reads its acting persona and its roster through. */
type IdentityReads = Pick<DemonstrationControls, 'getActiveUser' | 'switchRole'> & {
  listPersonas: NonNullable<DemonstrationControls['listPersonas']>;
};

/**
 * The port members this suite observes, replaced before the component module is imported so the real
 * binding — and with it the in-browser adapter and its seeded records — is never reached from a
 * component test (rule P-2).
 */
const mockService = vi.hoisted(() => ({
  getPolicy: vi.fn<ScreenReads['getPolicy']>(),
  requestPolicyException: vi.fn<ScreenReads['requestPolicyException']>(),
}));

/** The identity surface the demonstration supplies, with the same rule behind it. */
const mockDemonstration = vi.hoisted(() => ({
  getActiveUser: vi.fn<IdentityReads['getActiveUser']>(),
  listPersonas: vi.fn<IdentityReads['listPersonas']>(),
  switchRole: vi.fn<IdentityReads['switchRole']>(),
}));

/** The route's parameters, set per case, so the identifier arrives as the router would supply it. */
const routeParams = vi.hoisted(() => ({ policyId: undefined as string | undefined }));

/**
 * The provider replaced before the screen is imported, with every hook the rendered tree could reach
 * exported rather than only the two the screen calls. The two typed locals are the conformance check:
 * each stub is assigned to the port's own member set, so a renamed member fails this file's
 * compilation instead of leaving a stub that answers nothing.
 */
vi.mock('../../services/service-provider', () => {
  const service: ScreenReads = mockService;
  const demonstration: IdentityReads = mockDemonstration;

  return {
    useService: () => service,
    useDemonstration: () => demonstration,
    useActiveUser: () => null,
    /*
     * The cache key the screen reads the acting persona under. The real module owns the tuple; this
     * double has to carry it because the screen imports the binding, and a suite that left it out would
     * fail on the import rather than on the behaviour it means to assert.
     */
    ACTIVE_USER_QUERY_KEY: ['getActiveUser'],
  };
});

/**
 * `react-router` keeps every real export and yields the route's parameters from the case's own value.
 * The screen's only router use is `useParams`, and `src/app` may not be imported from a feature test.
 */
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();

  return { ...actual, useParams: () => ({ policyId: routeParams.policyId }) };
});

/* ---------------------------------------------------------------------------------------------
 * The harness and the readings it takes
 * ------------------------------------------------------------------------------------------- */

/** Renders the screen as the shell mounts it: inside a cache of its own, with retries off. */
function renderScreen(): HTMLElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <PolicyDetailScreen scope={SCOPE} />
    </QueryClientProvider>,
  );

  return container;
}

/** Collapses a string's runs of whitespace, so a cell of two elements compares as one line. */
function collapse(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

/** The grant control's accessible name: the one label AAP 0.12.4 fixes for it on this route. */
const GRANT_ACTION_NAME = TEXT.grantAction;

/**
 * The page's one level-one heading once `name` is on it, which is what a reader or a browser test
 * reads the route by.
 */
async function heading(name: string): Promise<HTMLElement> {
  return screen.findByRole('heading', { level: 1, name });
}

/** The description the page header renders beside its heading, or the empty string when it renders none. */
function descriptionOfHeader(): string {
  const rendered = document.querySelector('header p');

  return rendered === null ? '' : collapse(rendered.textContent ?? '');
}

/** The grant control, once the acting persona's permissions have settled onto the page. */
async function settledGrantAction(): Promise<HTMLElement> {
  const action = await screen.findByRole('button', { name: GRANT_ACTION_NAME });

  await waitFor(() => {
    expect(action).not.toHaveAttribute('aria-disabled', 'true');
  });

  return action;
}

beforeEach(() => {
  routeParams.policyId = EVALUATED_POLICY_ID;
  mockService.getPolicy.mockReset().mockResolvedValue(envelope(EVALUATED_POLICY));
  mockService.requestPolicyException.mockReset();
  mockDemonstration.getActiveUser.mockReset().mockResolvedValue(envelope(ACTING_USER));
  mockDemonstration.listPersonas.mockReset().mockResolvedValue(envelope([...ROSTER]));
  mockDemonstration.switchRole.mockReset().mockResolvedValue(envelope(ACTING_USER));
});

/* ---------------------------------------------------------------------------------------------
 * One shape for one refusal — qa-w013-I32
 * ------------------------------------------------------------------------------------------- */

describe('PolicyDetailScreen', () => {
  it('keeps the page header above the forbidden card, so one refusal has one shape', async () => {
    mockService.getPolicy.mockRejectedValue(DENIAL);

    renderScreen();

    // The route refuses, and the forbidden card is what explains it (rule P-3): the card names the
    // permission the call required, so this is that card rather than a notice for another state.
    const card = await screen.findByRole('region', {
      name: `${PERMISSION_REQUIRED_PREFIX}${REQUIRED_PERMISSION}`,
    });

    expect(card).toBeVisible();

    // The header is still there — the same `h1` and the same description the loaded page carries, so a
    // refused policy is not a bare card beside the parent screen's headed page (qa-w013-I32).
    const rendered = await heading(TEXT.title);

    expect(descriptionOfHeader()).toBe(TEXT.description);

    // And it is above the card rather than inside it, which is the shape the sovereignty route gives
    // the same denial: the page's heading, then the explanation of why its content is withheld.
    expect(rendered.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    // The eyebrow names the policy the route asked for, which is the one fact this state has.
    expect(screen.getByText(EVALUATED_POLICY_ID)).toBeVisible();

    // No record was read, so no control is offered over it (rule P-8).
    expect(screen.queryByRole('button', { name: GRANT_ACTION_NAME })).toBeNull();
  });

  it('renders its fixed title and description when the route names no policy', async () => {
    routeParams.policyId = undefined;

    renderScreen();

    // A route that names no policy is the boundary's empty state, and the header still renders: its
    // title and description are the fixed pair, and its eyebrow carries no identifier to print.
    expect(await screen.findByText(TEXT.noPolicyIdentifier)).toBeVisible();
    expect(await heading(TEXT.title)).toBeVisible();
    expect(descriptionOfHeader()).toBe(TEXT.description);
    expect(screen.queryByRole('button', { name: GRANT_ACTION_NAME })).toBeNull();
  });

  /* -------------------------------------------------------------------------------------------
   * The grant control, gated on the record the engine evaluates — qa-w013-I31
   * ----------------------------------------------------------------------------------------- */

  it('offers no exception against a policy the engine never evaluates, and says why', async () => {
    routeParams.policyId = DECLARED_POLICY.id;
    mockService.getPolicy.mockResolvedValue(envelope(DECLARED_POLICY));

    renderScreen();

    const action = await screen.findByRole('button', { name: GRANT_ACTION_NAME });

    await waitFor(() => {
      expect(action).toHaveAttribute('aria-disabled', 'true');
    });

    // The reason is not written into the page's standing text, so it is read off the hint a keyboard
    // focus brings up — the half of rule P-8 that a pointer never reaches.
    action.focus();
    expect(action).toHaveFocus();

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(TEXT.grantNeverEvaluated);
    });

    // The sentence names the record's own condition, never the permission the reader does hold.
    expect(screen.getByRole('tooltip')).not.toHaveTextContent(TEXT.grantNotPermitted);
  });

  it('offers the flow on a policy the engine evaluates, naming that policy and the roster', async () => {
    const user = userEvent.setup();

    renderScreen();

    // The loaded page keeps the header's shape: the record's own title, and its statement as the
    // description the heading's next sibling holds, which is what a browser test reads the route by.
    const rendered = await heading(EVALUATED_POLICY.title);

    expect(rendered.nextElementSibling).not.toBeNull();
    expect(collapse(rendered.nextElementSibling?.textContent ?? '')).toBe(EVALUATED_POLICY.statement);

    await user.click(await settledGrantAction());

    const dialog = await screen.findByRole('dialog', {
      name: GRANT_EXCEPTION_DIALOG_TEXT.heading,
    });

    // The dialog names the policy this page is showing, from the record itself (rule P-6).
    expect(dialog).toHaveTextContent(EVALUATED_POLICY.title);

    /*
     * The second approver's options are the roster's, without the acting persona: a request needs a
     * second person's approval, so offering the requester would offer a choice the service refuses.
     */
    const approver = within(dialog).getByLabelText(GRANT_EXCEPTION_DIALOG_TEXT.approverLabel, {
      exact: true,
    });
    const options = within(approver).getAllByRole('option');

    expect(options).toHaveLength(1 + ROSTER.length - 1);

    const offered = options.map((option) => option.textContent ?? '').join(' ');

    expect(offered).toContain('persona-beta');
    expect(offered).toContain('persona-gamma');
    expect(offered).not.toContain(ACTING_USER.id);
  });
});
