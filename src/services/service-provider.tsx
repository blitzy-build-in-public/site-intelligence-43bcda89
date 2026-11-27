/**
 * The React boundary every screen, component and shell module reaches the service through: one
 * context, the three hooks that read it, the skeleton the first paint shows while the in-browser
 * adapter prepares the seeded records and hashes their audit chain, and the failure region a
 * start-up that could not finish is reported in.
 *
 * WHY THIS MODULE EXISTS. Rule P-2 binds all data access to the one typed service interface, and
 * AAP 0.12.1's "Provider" row gives that binding its React shape: a context exposing `useService()`,
 * `useDemonstration()` and `useActiveUser()`, awaiting the adapter's asynchronous bootstrap before the
 * first screen renders. The persona the session acts as travels through the query cache rather than
 * through a snapshot of the start-up: the start-up's own read is the cache entry's initial value, and
 * every whole-cache invalidation — the role switch's and the demonstration reset's — refetches that
 * entry from the adapter, so a consumer which writes as the persona names the one the adapter is
 * enforcing at that render rather than the one the session began with (AAP 0.6.3 "Identity", AAP
 * 0.6.2's `[method, ...args]` cache convention). A screen therefore reaches records through a hook and
 * never through an adapter, a seed module or a global, which is what makes "components and screens
 * never import seed data" a property of the dependency graph rather than a habit (rules P-2, P-6).
 *
 * WHY THE FIRST PAINT WAITS. The in-browser adapter hashes the two hundred seeded audit events
 * through the platform's own Web Crypto in its constructor, so until that pass settles the trail
 * carries no hash and a screen reading it would show figures derived from a half-built session
 * (AAP 0.2.1, the in-browser adapter's own state module). Readiness is read through the binding
 * point's non-port handshake, `whenServiceReady()`, so an adapter that has no such handshake — the
 * unconnected HTTP client — resolves immediately instead of delaying the render.
 *
 * HOW THE WAIT IS EXPRESSED. Through React 19's `use()` on the readiness promise inside a
 * `<Suspense>` boundary, not through an effect that flips a state flag: AAP 0.18.1 reserves data
 * loading for the query cache and forbids effects for it, and `use()` is the mechanism that needs
 * none. The promise settles into a recorded outcome rather than being allowed to reject —
 * `{ status: 'ready' }` or `{ status: 'failed', problem }` — so `use()` never throws, no error
 * boundary is involved and nothing here is a class component (the no-class convention of AAP
 * 0.18.1).
 *
 * HOW THE PERSONA STAYS LIVE. Through one `useQuery` entry keyed {@link ACTIVE_USER_QUERY_KEY}, not
 * through the value the start-up happened to read: a role switch and a demonstration reset both
 * invalidate the cache whole, so the identity is re-read from the adapter with every other read and the
 * consumers of `useActiveUser()` follow it. That is data loading of the kind AAP 0.18.1 gives the query
 * cache, so no effect stands in for it, and the entry needs no polling, no timer and no second source of
 * truth beside the adapter's own state.
 *
 * WHAT A FAILED START-UP SHOWS. An accessible region stating that the workspace could not be
 * prepared, the `Problem`'s own message, its correlation identifier when it carried one, and one
 * retry control that re-runs the start-up and nothing else — no port write, no reset,
 * no state of its own (AAP 0.2.2's "a pending call shows the loading state and a failure shows a
 * message with a retry action"). The retry replaces the attempt promise held in state, so the
 * boundary suspends into the skeleton again and then renders either the workspace or the failure
 * again. A start-up failure the session has cached cannot be cleared from inside the page — the
 * adapter's bootstrap is one pass per session and the binding point hands out one session — so the
 * region also tells the reader that a reload starts a fresh session rather than pretending the
 * control can repair the cause.
 *
 * THE SKELETON AND THE FAILURE REGION ARE DECLARED HERE, and that is deliberate. The shared
 * component layer imports `useService()` from this module, so importing a component back — a card,
 * a page header or the shared action control — would form a cycle. Both surfaces are therefore
 * built from role-token utilities in this file, and the retry control is a native
 * `<button type="button">` whose class list repeats the structure and secondary appearance the
 * component layer's action control owns. When a token changes, both lists move together; the
 * repetition is the price of the boundary direction, not an oversight.
 *
 * Rules served:
 * - P-2: the only repository modules imported here are the binding point and the port/capability
 *   types. No seed module, adapter module or HTTP-client module is within this file's reach, so it
 *   cannot become a second data boundary.
 * - B-3: the loading state is announced by a `role="status"` region with `aria-live="polite"` and a
 *   visible caption; it adds no focus stop, no focus trap and no auto-focus, so keyboard order is
 *   untouched; every colour is a role token, so both themes keep the contrast the specification
 *   measured; the skeleton bars are static rather than animated, so nothing here can outlive
 *   `prefers-reduced-motion`; the one control is keyboard operable with the 2 px focus ring and a
 *   24x24 px minimum target.
 * - B-2: no credential, no configuration switch and no environment read of any kind — the file has
 *   nothing to configure, because which adapter is bound is a code constant.
 * - B-1: nothing here fetches. Readiness is local computation in this browser.
 * - P-1: no simulation label is invented here. The labels arrive on the records a screen renders,
 *   and the persistent badge belongs to the shell, not to this boundary.
 * - P-4: no sentence claims that the boundary, the adapter or the chain establishes a configuration,
 *   prevents a copy or resists an edit; a failure says what happened to the start-up and nothing
 *   more.
 * - P-6: no figure, amount, date or record identifier is typed here. The only identifier rendered
 *   is the one the service's own `Problem` carries, and it is rendered only when it carries it.
 * - P-7: Site Intelligence's own vocabulary, and no company, customer or model name.
 * - Success criterion 5: nothing below widens a type or silences the compiler. Every rejection is
 *   narrowed through the type guards in this file, and no suppression directive appears in it.
 *
 * No test hook. Nothing here reads a query parameter, a global or a flag to change behaviour: the
 * simulation popover and the role switcher are the levers a browser test drives, and both are
 * product features reached through the port.
 */
import { skipToken, useQuery } from '@tanstack/react-query';
import { Suspense, createContext, use, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import type { ActiveUser } from '../types/entities';
import type { Problem, ProblemType, Result } from '../types/service';
import { createService, getDemonstrationControls, whenServiceReady } from './create-service';
import type { DemonstrationControls } from './demonstration-controls';
import type { SiteIntelligenceService } from './site-intelligence-service';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this module states, held here so the wording has one owner: the components below
 * render these strings and a suite names them through this object instead of retyping them.
 *
 * None of them is a specification string — the fixed §5.3 simulation labels and the stage tooltips
 * belong to the components that own them — and none carries a figure, a date or a record
 * identifier (rule P-6). Each states what is happening to the start-up and claims nothing about
 * where records are held, whether they could be altered or whether anything was verified (rule
 * P-4).
 */
export const SERVICE_PROVIDER_TEXT = {
  /** The skeleton's visible caption, and the accessible name of its live region. */
  preparing: 'Preparing the demonstration workspace',

  /** The skeleton's supporting sentence: what the wait is for, in the reader's terms. */
  preparingDetail: 'The records and their audit trail are being prepared in this browser.',

  /** The failure region's heading. */
  failureHeadline: 'The workspace could not be prepared',

  /** What the failure means for the session, stated without naming a cause it does not know. */
  failureDetail:
    'The records this workspace reads are prepared in the browser, and that step did not finish. Nothing has been changed.',

  /** The label the correlation identifier is printed under. */
  traceLabel: 'Trace',

  /**
   * The sentence shown when the start-up stopped for a reason that did not arrive in the service's
   * `Problem` shape. The region states this sentence rather than the rejection's own text, which is an
   * internal diagnostic written for a developer and may name a repository path or a record set's
   * internals.
   */
  startupUnreported: 'The start-up step stopped without reporting a cause.',

  /** The retry control's visible label. */
  retryLabel: 'Try again',

  /**
   * The sentence under the retry control, naming the one action that clears a start-up failure the
   * session has cached: a reload starts a fresh session, because the adapter prepares its records
   * once per session.
   */
  reloadHint: 'If it stays unavailable, reload the page to start a fresh session.',

  /**
   * The developer-facing message `useService()`, `useDemonstration()` and `useActiveUser()` throw
   * with when they are called outside the provider. It is a misuse of the module, never a string a
   * reader sees.
   */
  outsideProvider:
    'useService, useDemonstration and useActiveUser must be called inside ServiceProvider',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The page frame both surfaces stand in: the ground, the page padding and the primary text role.
 *
 * `min-h-dvh` fills the viewport the shell would have filled, so the first painted frame is not a
 * short block above empty space; no other size, colour or elevation value is introduced, and the
 * token layer clears Tailwind's shadow namespace so no shadow utility exists to add (rule B-3,
 * specification §4.3).
 */
const PAGE_CLASSES = 'flex min-h-dvh min-w-0 flex-col gap-4 bg-ground p-4 text-text-primary';

/**
 * The skeleton's live region: one column, so the caption and its supporting sentence are separated
 * by the 4 px grid rather than by a margin.
 */
const SKELETON_REGION_CLASSES = 'flex min-w-0 flex-col gap-2';

/** The skeleton's caption, one step up the type scale from its detail. */
const SKELETON_CAPTION_CLASSES = 'text-14 font-medium text-text-primary';

/** The skeleton's supporting sentence, in the secondary text role. */
const SKELETON_DETAIL_CLASSES = 'text-13 text-text-secondary';

/**
 * The skeleton's decorative bars: the raised second surface, hidden from assistive technology,
 * which hears the region's caption instead.
 *
 * Static on purpose. An animated placeholder would have to honour `prefers-reduced-motion` (rule
 * B-3); a bar that does not move cannot break that rule at all, and `src/styles/index.css` owns the
 * page-wide reduced-motion block, so no animation is declared here that the block could not reach.
 */
const SKELETON_STACK_CLASSES = 'flex min-w-0 flex-col gap-2';
const SKELETON_BAR_CLASSES = 'block h-4 rounded-control bg-surface-2';

/** The bars' widths, in the order they stack: full, two thirds, one third. */
const SKELETON_BAR_WIDTHS = ['w-full', 'w-2/3', 'w-1/3'] as const;

/** The failure region's surface: the first raised surface inside the decorative hairline. */
const FAILURE_CARD_CLASSES =
  'flex min-w-0 max-w-2xl flex-col gap-3 rounded-card border border-hairline bg-surface-1 p-4';

/** The failure region's heading, at the fourth step of the type scale. */
const FAILURE_HEADING_CLASSES = 'text-20 font-semibold text-text-primary';

/** The failure region's supporting sentence. */
const FAILURE_DETAIL_CLASSES = 'text-14 text-text-secondary';

/**
 * The service's own refusal message. Long words break rather than overflowing the card, because the
 * message is supplied by the adapter and its shape is not this module's to predict (rule B-3, and
 * the truncation discipline of AAP 0.18.1's UI notes).
 */
const FAILURE_MESSAGE_CLASSES = 'text-14 break-words text-text-primary';

/** The row the correlation identifier is printed on. */
const FAILURE_TRACE_CLASSES = 'text-13 text-text-secondary';

/** The identifier itself, in the one mono face with tabular figures, as every id is set. */
const FAILURE_TRACE_VALUE_CLASSES = 'font-mono text-13 tabular-nums break-all text-text-primary';

/**
 * The retry control's appearance: the structure and the secondary appearance that
 * component layer's action control owns, repeated here because importing it would form a cycle.
 *
 * The 24x24 px minimum target, the 2 px `--color-focus-ring` outline on `focus-visible`, the raised
 * second surface inside the control boundary and the accent boundary on hover are the same values
 * the shared control composes, so the one control on this surface answers the pointer the way every
 * other control in the product does and cannot fall below the contrast rule B-3 requires.
 */
const RETRY_BUTTON_CLASSES = [
  'inline-flex min-h-6 min-w-6 items-center justify-center gap-2 rounded-control border px-3 py-1',
  'text-13 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
  'border-control-boundary bg-surface-2 text-text-primary',
  'hover:border-accent hover:bg-surface-1',
  'active:border-accent active:bg-ground',
].join(' ');

/* ---------------------------------------------------------------------------------------------
 * Readiness, recorded as an outcome the boundary can render
 * ------------------------------------------------------------------------------------------- */

/**
 * What one start-up attempt settled to.
 *
 * A discriminated union rather than a thrown failure, because `use()` re-throws a rejected promise
 * and React answers a throw with the nearest error boundary — which this module deliberately does
 * not have and cannot be, without a class component. The failure therefore travels as a value the
 * boundary renders, and the `Problem` the service produced is carried whole so the region prints
 * the service's own message and identifier instead of a paraphrase (rule P-6).
 *
 * The ready member carries the envelope the adapter answered this attempt's persona read with, so the
 * boundary publishes it as the acting-persona cache entry's initial value: the first paint shows the
 * persona the adapter is enforcing, with no second call on mount and no frame in which nobody is known
 * (AAP 0.6.3 "Identity", {@link ACTIVE_USER_QUERY_KEY}). The envelope rather than the persona alone,
 * because that entry is the one two screens already read as `getActiveUser()`'s own answer and one key
 * cannot hold two shapes. `null` states one fact rather than a missing one: the bound adapter carries
 * no demonstration capability, so it has no persona to report at all.
 */
type BootstrapOutcome =
  | { readonly status: 'ready'; readonly activeUser: Result<ActiveUser> | null }
  | { readonly status: 'failed'; readonly problem: Problem };

/**
 * Decides whether a value names one of the causes `Problem.type` distinguishes.
 *
 * Written as a chain of comparisons rather than as a membership test on a list, so the narrowing is
 * a type guard the compiler accepts without a cast: `src/types/service.ts` declares the five
 * members, and a member added there fails to compile here until it is named.
 */
function isProblemType(value: unknown): value is ProblemType {
  return (
    value === 'permission' ||
    value === 'policy' ||
    value === 'validation' ||
    value === 'simulated-write-back' ||
    value === 'not-found'
  );
}

/**
 * Decides whether a rejected start-up carried the service's `Problem` shape.
 *
 * Only the three members every `Problem` carries are required, because the optional ones belong to
 * causes this region does not render. A rejection that arrives as a bare `Error` — a platform
 * without the Web Crypto the trail's hashing needs, for instance — is not a `Problem` and is
 * reported through {@link asProblem} instead of being read as one.
 */
function isProblem(candidate: unknown): candidate is Problem {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }

  if (!('type' in candidate) || !('message' in candidate) || !('traceId' in candidate)) {
    return false;
  }

  return (
    isProblemType(candidate.type) &&
    typeof candidate.message === 'string' &&
    typeof candidate.traceId === 'string'
  );
}

/**
 * Turns whatever a rejected start-up carried into the `Problem` the failure region renders.
 *
 * A `Problem` is passed through untouched, so the service's message and correlation identifier are the
 * ones on screen: they are the service's own account of the failure, and the identifier is the one a
 * reader can quote back (AAP 0.18.1). Anything else becomes a `'validation'` failure in this module's
 * own words — the records could not be prepared against the platform as it stands, which is what the
 * cause list's fourth kind describes — with an empty correlation identifier, since nothing in the
 * start-up path opens a traced call. The rejection's own text is deliberately not carried: it is an
 * internal diagnostic written for a developer and may name a repository path or a record set's
 * internals, while this region renders in front of a reader, so the sentence
 * {@link SERVICE_PROVIDER_TEXT.startupUnreported} is what the reader sees. The region omits the
 * identifier row for an empty string rather than printing a blank one.
 */
function asProblem(error: unknown): Problem {
  if (isProblem(error)) {
    return error;
  }

  return { type: 'validation', message: SERVICE_PROVIDER_TEXT.startupUnreported, traceId: '' };
}

/**
 * Runs the start-up once and records how it settled.
 *
 * Two steps, in this order. The readiness handshake settles first, so the seeded records are installed
 * and their audit chain is hashed before anything is read from them. The persona the session acts as is
 * then read through the adapter's demonstration capability, because the session's identity is part of
 * preparing the workspace rather than a detail a screen collects once it has rendered: this value is
 * the acting-persona cache entry's initial value, so the first paint already displays the role the
 * adapter enforces and the density and entry route that follow that role follow it too (AAP 0.6.3
 * "Identity", AAP 0.12.4). An adapter carrying no demonstration capability — the unconnected HTTP
 * client, which leaves identity to the service it addresses — settles ready with `null` and no
 * identity to publish.
 *
 * Never rejects: a refused handshake, and equally a `Problem` the identity read threw, is recorded as
 * the failure member of {@link BootstrapOutcome}. That is what lets the boundary read the promise with
 * `use()` and render the outcome instead of throwing, and it applies one rule to both steps — a
 * start-up that cannot report who the session acts as leaves the boundary in the failure region with
 * its retry rather than rendering a workspace whose persona nobody knows. It performs no port write
 * and changes no state of its own — a retry calls it again and nothing else, so a failed start-up
 * cannot leave a half-applied change behind.
 *
 * @returns A promise that resolves to the recorded outcome of this attempt.
 */
async function startBootstrap(): Promise<BootstrapOutcome> {
  try {
    await whenServiceReady();

    const demonstration = getDemonstrationControls();

    if (demonstration === null) {
      return { status: 'ready', activeUser: null };
    }

    const activeUser = await demonstration.getActiveUser();

    return { status: 'ready', activeUser };
  } catch (error: unknown) {
    return { status: 'failed', problem: asProblem(error) };
  }
}

/* ---------------------------------------------------------------------------------------------
 * The acting persona, read through the cache so it follows the session
 * ------------------------------------------------------------------------------------------- */

/**
 * The cache key of the acting-persona read: the member's own name first, and nothing beside it.
 *
 * One key, one shape, one fact — the entry holds `getActiveUser()`'s own `Result<ActiveUser>` envelope,
 * exactly as the member answers it, so every reader of the session's identity shares the value this
 * boundary publishes instead of keeping a second copy of it. Two screens already read the capability
 * this way and key it identically (`src/features/scr-07-sovereignty-and-policies/
 * sovereignty-screen.tsx` and `policy-detail-screen.tsx`, whose grant gate must describe the persona
 * the adapter is enforcing), and a demonstration reset or a role switch invalidates the cache whole, so
 * the entry those screens hold, the entry a switch writes and the entry this boundary reads are the
 * same entry with the same spelling.
 *
 * The shape is the member's envelope rather than the persona alone, because a key cannot hold two
 * shapes: a reader that expected a bare `ActiveUser` under a key another reader fills with the
 * envelope would dereference one level too few, which is a render fault rather than a missing value.
 * The boundary therefore unwraps what it publishes and writes nothing of its own shape here.
 */
export const ACTIVE_USER_QUERY_KEY = ['getActiveUser'] as const;

/**
 * Reads the persona the bound adapter is acting as, through the query cache.
 *
 * The entry is the session's identity rather than a memo of a static record. A successful
 * `switchRole` writes the envelope it returned into this key before it invalidates the cache
 * (`src/app/role-switcher.tsx`), and the whole-cache invalidation a switch and a `Reset demo data`
 * alike issue refetches the adapter for the persona it enforces now — so every consumer of
 * `useActiveUser()` reads the persona the adapter authorises against at that render, which is what
 * lets a write name the acting persona without a second source of truth (AAP 0.6.2's `[method,
 * ...args]` cache convention, AAP 0.6.3 "Identity").
 *
 * `initialData` is the envelope the start-up reported, so the boundary's first paint publishes exactly
 * what the settled attempt read: no second adapter call on mount and no frame in which the shell knows
 * nobody. `staleTime` is infinite because this entry is refreshed by invalidation rather than by age,
 * and a background refetch would replace an identity the reader is acting as for no reason the
 * demonstration has. `retry` is off for the reason every read in this application turns it off
 * (`src/app/providers.tsx`): an identity the adapter cannot report is a state the reader is shown, not
 * a glitch to hide behind a second attempt. An adapter carrying no demonstration capability reads
 * nothing (`skipToken`) and this boundary publishes `null`, which is the fact `useActiveUser()`
 * reports for it.
 *
 * @param demonstration - The bound capability, or `null` when the adapter carries none.
 * @param startupUser - The envelope the settled start-up read, used as the entry's initial value.
 * @returns The persona the adapter is acting as, or `null`.
 */
function useActingPersona(
  demonstration: DemonstrationControls | null,
  startupUser: Result<ActiveUser> | null,
): ActiveUser | null {
  const query = useQuery<Result<ActiveUser>>({
    queryKey: ACTIVE_USER_QUERY_KEY,
    queryFn: demonstration === null ? skipToken : () => demonstration.getActiveUser(),
    enabled: demonstration !== null,
    // Written conditionally because `exactOptionalPropertyTypes` distinguishes an absent `initialData`
    // from one holding `undefined`, and an adapter with no capability has no envelope to seed with.
    ...(startupUser === null ? {} : { initialData: startupUser }),
    staleTime: Infinity,
    retry: false,
  });

  return query.data?.data ?? null;
}

/* ---------------------------------------------------------------------------------------------
 * The context and the provider
 * ------------------------------------------------------------------------------------------- */

/**
 * What the provider hands its consumers: the bound adapter, the demonstration capability beside it
 * when the adapter carries one, and the persona that adapter acts as.
 *
 * The capability and the identity are part of the value rather than further contexts, because all
 * three are read from the same bound instance and a consumer that had one but not the others would
 * have to re-derive which adapter it is talking to.
 */
interface ServiceContextValue {
  /** The bound adapter, the single route to every record (rule P-2). */
  readonly service: SiteIntelligenceService;

  /**
   * The role switch and the acting-persona read the demonstration offers, or `null` when the bound
   * adapter carries none.
   *
   * `null` is what lets the role switcher render disabled with a reason instead of assuming the
   * capability is there (rule P-8, `src/services/demonstration-controls.ts`).
   */
  readonly demonstration: DemonstrationControls | null;

  /**
   * The persona the session acts as at this render, or `null` when the bound adapter carries no
   * demonstration capability.
   *
   * It is published rather than held so every consumer reads the persona the adapter is enforcing (AAP
   * 0.6.3 "Identity"). The value is the cache entry {@link ACTIVE_USER_QUERY_KEY} reads: the start-up
   * seeds it, a successful role switch writes the persona the adapter returned into it, and the
   * whole-cache invalidation a switch and a demonstration reset both issue refetches it — so a consumer
   * that writes as this persona names the persona the adapter authorises against, not the one the
   * session started as.
   */
  readonly activeUser: ActiveUser | null;
}

/**
 * The context itself, defaulted to `null` so a consumer outside the provider is a detectable
 * mistake rather than a silent default that would wire a screen to nothing.
 */
const ServiceContext = createContext<ServiceContextValue | null>(null);

/** Props of {@link ServiceProvider}. */
export interface ServiceProviderProps {
  /** The shell, its routes and every screen, rendered once the start-up has settled. */
  readonly children: ReactNode;
}

/**
 * Supplies the bound service to the shell, and holds the first paint back until the adapter can
 * answer its first call and has reported the persona it acts as.
 *
 * The attempt promise lives in state so a retry can replace it: `use()` tracks the promise it was
 * given, so a new attempt suspends the boundary into the skeleton again and the reader sees the
 * wait rather than a stale failure while the start-up runs. The promise is created by the state
 * initialiser, so it is one promise per attempt and never a new one per render — a fresh promise on
 * every render would suspend the tree forever.
 *
 * @param props - The content to render once the adapter is ready.
 * @returns The suspended boundary wrapping the content, or the failure region when the start-up
 *   could not finish.
 */
export function ServiceProvider({ children }: ServiceProviderProps): ReactElement {
  const [attempt, setAttempt] = useState<Promise<BootstrapOutcome>>(startBootstrap);

  /*
   * The retry re-runs the start-up and nothing else. It is not a reset and not a write:
   * the demonstration's `Reset demo data` is a member of the port that a screen offers, while this
   * control exists only because a start-up that could not finish leaves no screen to offer it.
   */
  const retry = useCallback(() => {
    setAttempt(startBootstrap());
  }, []);

  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <ServiceGate attempt={attempt} onRetry={retry}>
        {children}
      </ServiceGate>
    </Suspense>
  );
}

/** Props of the internal gate that reads one attempt. */
interface ServiceGateProps {
  /** The attempt to read: the component suspends until it settles. */
  readonly attempt: Promise<BootstrapOutcome>;

  /** Re-runs the start-up, offered only by the failure region. */
  readonly onRetry: () => void;

  /** The shell and its screens, rendered for a settled, successful attempt. */
  readonly children: ReactNode;
}

/**
 * Reads the recorded outcome of one attempt and renders what it settles to.
 *
 * `use()` suspends the whole subtree into the provider's `<Suspense>` fallback while the promise is
 * pending, which is the skeleton. The promise never rejects, so neither branch throws: a ready
 * attempt binds the context around the content, and a failed one renders the region in the
 * content's place.
 */
function ServiceGate({ attempt, onRetry, children }: ServiceGateProps): ReactElement {
  const outcome = use(attempt);

  if (outcome.status === 'failed') {
    return <WorkspaceFailure problem={outcome.problem} onRetry={onRetry} />;
  }

  return <BoundServices startupUser={outcome.activeUser}>{children}</BoundServices>;
}

/** Props of the component that binds the context value around the shell. */
interface BoundServicesProps {
  /**
   * The envelope the settled start-up read from the adapter, published as the acting-persona cache
   * entry's initial value so the first paint already names the persona the adapter enforces.
   */
  readonly startupUser: Result<ActiveUser> | null;

  /** The shell and its screens, rendered inside the boundary. */
  readonly children: ReactNode;
}

/**
 * Binds the context value and renders the shell inside it.
 *
 * The adapter and the capability are memoised over nothing, because `createService` answers the
 * session's single instance and `getDemonstrationControls` only classifies it: reading them once per
 * mount keeps the identity read below stable instead of re-registering a query on every render. The
 * persona is the one member that changes during a session, and it arrives from
 * {@link useActingPersona} — so a switch or a reset that changes the identity publishes a new value
 * object and every consumer under the shell re-renders with the persona the adapter now enforces.
 *
 * The theme provider and the shell store are deliberately absent: `src/app/providers.tsx` owns that
 * composition, and this boundary supplies the service, the capability and the identity and nothing else
 * (AAP 0.12.1). The query cache is used rather than created here, for the same reason — the cache is
 * the shell's, and this boundary reads one entry of it (AAP 0.18.1: the cache owns data loading).
 */
function BoundServices({ startupUser, children }: BoundServicesProps): ReactElement {
  const service = useMemo<SiteIntelligenceService>(() => createService(), []);
  const demonstration = useMemo<DemonstrationControls | null>(
    () => getDemonstrationControls(service),
    [service],
  );
  const activeUser = useActingPersona(demonstration, startupUser);
  const value = useMemo<ServiceContextValue>(
    () => ({ service, demonstration, activeUser }),
    [service, demonstration, activeUser],
  );

  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
}

/**
 * Reads the service context, or throws for the one case that is a programming mistake.
 *
 * The throw is deliberately loud and deliberately developer-facing: a component rendered outside
 * the provider has no data source, and a silent fallback would leave a screen rendering nothing
 * while appearing to work.
 */
function useServiceContext(): ServiceContextValue {
  const value = useContext(ServiceContext);

  if (value === null) {
    throw new Error(SERVICE_PROVIDER_TEXT.outsideProvider);
  }

  return value;
}

/* ---------------------------------------------------------------------------------------------
 * The public hooks — AAP 0.12.1 "Provider"
 * ------------------------------------------------------------------------------------------- */

/**
 * The bound service adapter: the only route from a screen or a component to a record (rule P-2).
 *
 * Every read and write a screen performs goes through the value this hook returns, so binding the
 * other adapter in `src/services/create-service.ts` changes what every screen talks to without
 * changing a screen (success criterion 8).
 *
 * @returns The bound `SiteIntelligenceService`.
 * @throws Error - When called outside `<ServiceProvider>`; the message is for a developer and is
 *   never rendered as user copy.
 */
export function useService(): SiteIntelligenceService {
  return useServiceContext().service;
}

/**
 * The demonstration's role switch and acting-persona read, or `null` when the bound adapter carries
 * none.
 *
 * The capability sits beside the port rather than inside it, because the contracts' interface
 * declares neither member. A consumer therefore asks for it rather than assuming it: a `null` is the
 * signal to render the control disabled with its reason, which is what keeps rule P-8 satisfied on an
 * adapter without a role switch, and what keeps the browser-side permission checks of the in-browser
 * adapter labelled as a demonstration rather than as production authorisation (rule P-3).
 *
 * @returns The capability, or `null`.
 * @throws Error - When called outside `<ServiceProvider>`; the message is for a developer.
 */
export function useDemonstration(): DemonstrationControls | null {
  return useServiceContext().demonstration;
}

/**
 * The persona the session acts as now, as the adapter reports it.
 *
 * Kept live through the cache entry {@link ACTIVE_USER_QUERY_KEY} rather than frozen at the start-up
 * that awaited the adapter's bootstrap: a consumer which acts as the persona — an assignment to "me",
 * an owner check against the reader's own record — therefore names the persona the adapter is
 * enforcing at that render, which is what rule P-8 asks of a control that must perform its function
 * (AAP 0.6.3 "Identity"). A successful role switch writes the persona it returned into that entry and
 * then invalidates the cache whole, and a demonstration reset invalidates it as well, so the switch and
 * the reset are both reflected here once the adapter has answered.
 *
 * The value is not authority of its own: the adapter evaluates the permission matrix and the policy
 * engine against its own acting persona rather than against anything a component holds, and the checks
 * behind the switcher are a demonstration and not production authorisation (rule P-3). `null` means the
 * bound adapter carries no demonstration capability — the unconnected HTTP client leaves identity to
 * the service it addresses — in which case there is no persona to report.
 *
 * @returns The acting persona, or `null` when the bound adapter carries no demonstration capability.
 * @throws Error - When called outside `<ServiceProvider>`; the message is for a developer.
 */
export function useActiveUser(): ActiveUser | null {
  return useServiceContext().activeUser;
}

/* ---------------------------------------------------------------------------------------------
 * The two surfaces this boundary owns, declared here so no cycle reaches `src/components`
 * ------------------------------------------------------------------------------------------- */

/** The failure region's column, one step tighter than the card's own gap. */
const FAILURE_ALERT_CLASSES = 'flex min-w-0 flex-col gap-1';

/**
 * The first paint: what the reader sees while the in-browser adapter prepares the seeded records
 * and hashes their audit trail.
 *
 * It is a real accessibility surface, not decoration. The caption sits in a `role="status"` region
 * with `aria-live="polite"`, so a reader whose assistive technology is watching the page is told
 * that work is in progress before a screen exists; the bars below it are `aria-hidden="true"`,
 * so the announcement carries the sentence rather than a list of empty boxes. Nothing is focused,
 * trapped or reordered, so a keyboard reader's order is untouched when the workspace replaces this
 * surface, and the whole frame is one `<main>` so the page has its landmark from the first frame.
 *
 * The bars are static and carry the raised second surface, which is the one role that reads as
 * placeholder content on both themes; no shadow exists to add, and no animation is declared that
 * the page's reduced-motion block could not reach (rule B-3, specification §4.3).
 *
 * Exported so a suite can assert the announced state directly, and so a caller that needs the same
 * wait for a route of its own shows the identical surface rather than a second one.
 *
 * @returns The skeleton the provider shows as its `Suspense` fallback.
 */
export function WorkspaceSkeleton(): ReactElement {
  return (
    <main className={PAGE_CLASSES}>
      <div role="status" aria-live="polite" className={SKELETON_REGION_CLASSES}>
        <p className={SKELETON_CAPTION_CLASSES}>{SERVICE_PROVIDER_TEXT.preparing}</p>
        <p className={SKELETON_DETAIL_CLASSES}>{SERVICE_PROVIDER_TEXT.preparingDetail}</p>
      </div>
      <div aria-hidden="true" className={SKELETON_STACK_CLASSES}>
        {SKELETON_BAR_WIDTHS.map((width) => (
          <span key={width} className={`${SKELETON_BAR_CLASSES} ${width}`} />
        ))}
      </div>
    </main>
  );
}

/** Props of {@link WorkspaceFailure}. */
interface WorkspaceFailureProps {
  /** The refusal the start-up settled to, printed as the service stated it. */
  readonly problem: Problem;

  /** Re-runs the start-up; the only thing the region can do. */
  readonly onRetry: () => void;
}

/**
 * What a start-up that could not finish is reported in.
 *
 * The region states the one fact the failure establishes — the workspace could not be prepared —
 * then repeats the service's own message, because a message this module wrote in its place would be
 * a second account of one failure. The correlation identifier is printed in the mono face when the
 * `Problem` carried one and the row is omitted when it did not, since an empty identifier would
 * imply a traced call that never happened (rule P-6). The block holding the heading and the two
 * messages is a `role="alert"` region, so its text is announced when it replaces the skeleton.
 *
 * One control, and it works: the retry re-runs the start-up and nothing else — no write,
 * no reset, no reload of state (rule P-8). The sentence beneath it names the one action that clears
 * a start-up failure the session has cached, because a fresh session is what a reload produces and
 * the region does not pretend otherwise (rule P-4: it claims nothing about the cause).
 *
 * @returns The failure surface, in the content's place.
 */
function WorkspaceFailure({ problem, onRetry }: WorkspaceFailureProps): ReactElement {
  return (
    <main className={PAGE_CLASSES}>
      <section className={FAILURE_CARD_CLASSES}>
        <div role="alert" className={FAILURE_ALERT_CLASSES}>
          <h1 className={FAILURE_HEADING_CLASSES}>{SERVICE_PROVIDER_TEXT.failureHeadline}</h1>
          <p className={FAILURE_DETAIL_CLASSES}>{SERVICE_PROVIDER_TEXT.failureDetail}</p>
          <p className={FAILURE_MESSAGE_CLASSES}>{problem.message}</p>
        </div>
        {problem.traceId === '' ? null : (
          <p className={FAILURE_TRACE_CLASSES}>
            {`${SERVICE_PROVIDER_TEXT.traceLabel} `}
            <span className={FAILURE_TRACE_VALUE_CLASSES}>{problem.traceId}</span>
          </p>
        )}
        <button type="button" className={RETRY_BUTTON_CLASSES} onClick={onRetry}>
          {SERVICE_PROVIDER_TEXT.retryLabel}
        </button>
        <p className={FAILURE_DETAIL_CLASSES}>{SERVICE_PROVIDER_TEXT.reloadHint}</p>
      </section>
    </main>
  );
}

