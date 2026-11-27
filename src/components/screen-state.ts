/**
 * The one owner of the derivation that decides which of `platform-specification.md` §8's seven screen
 * states a screen's records are in.
 *
 * The seven states — loading, empty, stale, partial, offline, forbidden and conflict — are fixed by
 * §8, and AAP §0.12.4 makes them structural rather than remembered: every screen renders its content
 * inside `./state-boundary.tsx`, which owns what each state looks like. What the boundary does not
 * own, and cannot, is the decision *which* state the records are in, because that decision is read
 * from what a read settled to: the rejection it ended in, the freshness report its result carries and
 * the shape of the payload that arrived. This module owns that decision, and every screen calls it, so
 * two screens cannot answer the same question differently.
 *
 * Why the mapping lives here rather than in each screen. The derivation began as twelve copies of the
 * same ninety lines, one per screen module, and the copies had drifted: one screen mapped every
 * non-permission failure to `'offline'` and could therefore never produce `'conflict'`, while a
 * `'not-found'` failure was `'empty'` on some screens and `'offline'` on others. Each copy was
 * individually defensible and the set of them was not, because the seven-state question has one
 * answer. The precedence below is that answer, stated once. A screen that genuinely differs says so
 * through an input — a route that named no record, the source its stale notice prefers, a payload
 * that reports itself incomplete, whether there is anything to show, and the rejections of the calls
 * it makes beside its record read — never through a copy of this function.
 *
 * What this module does not do. It is a pure function of facts a screen already holds: it holds no
 * state, subscribes to nothing, reads no clock, calls no service and renders nothing, so it needs no
 * React and no effect. It imports the types of `src/types` and the two records `./state-boundary.tsx`
 * declares, and nothing else: no screen, no service and no seed record, which keeps the dependency
 * direction of AAP §0.12.1 intact for the feature modules that import it (a feature may import
 * `src/components`, and `src/components` reaches neither the features nor the service).
 *
 * Rules this module is built to satisfy:
 * - P-6: no figure, no currency amount and no record identifier is typed here. The states and the
 *   causes are closed vocabularies the contracts fix, and every value the module reads arrives from
 *   the caller.
 * - P-2: no service is imported and no seed record is reached, so this module cannot become a second
 *   path to the data.
 * - B-3: the derivation is what makes each of the seven states reachable and therefore renderable
 *   with text, an icon and a role rather than by colour.
 * - AAP §0.18.1: the module belongs to the shared component layer, which a screen may import and
 *   which imports no screen.
 *
 * OPEN ITEM — the rejections of a screen's other calls. A screen that takes a decision on the record
 * it shows makes further calls beside the read of that record: the approval detail reads the plan
 * behind the approval and performs the decision. {@link ScreenStateInput.refusals} carries what those
 * calls rejected with, so a permission refusal among them is reported as `'forbidden'` here rather
 * than in a screen-local wrapper. It is checked after the route and before the record read, because
 * the acting role may not act on the record whether or not the record itself could be read; the one
 * screen that passes it issues those calls only once the record read has succeeded, so the two can
 * never disagree about which came first.
 */
import type {
  Freshness,
  FreshnessState,
  Problem,
  ProblemType,
  ScreenState,
  SourceId,
} from '../types';
import { SOURCE_LABELS } from '../types';
import type { StateBoundaryForbidden, StateBoundaryStale } from './state-boundary';

/* ---------------------------------------------------------------------------------------------
 * The failure — AAP §0.2.2, AAP §0.12.3
 * --------------------------------------------------------------------------------------------- */

/**
 * Every cause a `Problem` can name, held once so the guard below reads the type's own membership.
 *
 * `ProblemType` is the union the contracts fix; this list restates its members so the guard can check
 * a value it has not typed yet, and it is declared `satisfies readonly ProblemType[]` so a cause the
 * union gains or loses fails this file's compilation instead of letting the guard accept a failure it
 * does not describe.
 */
const PROBLEM_TYPES = [
  'permission',
  'policy',
  'validation',
  'simulated-write-back',
  'not-found',
] as const satisfies readonly ProblemType[];

/**
 * Whether a rejection is the service's own typed failure rather than something the platform threw.
 *
 * The service fails by throwing a `Problem` (contracts §2, AAP §0.12.3) and the query cache hands that
 * same value back as an `unknown` rejection, so its three required members are checked before the value
 * is treated as one. The cause is checked against the union's own members as well, because a failure
 * that named a cause the contracts do not define is a defect in the read rather than a refusal, and
 * the boundary reports it as an unreachable source instead of printing a member nobody raised.
 *
 * @param error - The value a read or a write rejected with.
 * @returns Whether the value is a `Problem`.
 */
export function isProblem(error: unknown): error is Problem {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if (!('type' in error) || !('message' in error) || !('traceId' in error)) {
    return false;
  }

  const { type, message, traceId } = error;

  return (
    typeof type === 'string' &&
    PROBLEM_TYPES.some((known) => known === type) &&
    typeof message === 'string' &&
    typeof traceId === 'string'
  );
}

/**
 * The denial the forbidden card explains, or `undefined` when the failure was not a permission refusal.
 *
 * The card's evidence is the failure's own — the permission the acting role lacks, the roles that hold
 * it, the refusal's own sentence from `Problem.message` and the correlation identifier of the refused
 * call — so nothing is translated between the service and the explanation a reader receives. A refusal
 * that named no permission supplies no card rather than one naming a permission nobody was refused for,
 * and the boundary's neutral notice stands in its place.
 *
 * @param error - The value the read or the write rejected with.
 * @returns The denial, or `undefined`.
 */
export function forbiddenOf(error: unknown): StateBoundaryForbidden | undefined {
  if (!isProblem(error) || error.type !== 'permission') {
    return undefined;
  }

  const permission = error.requiredPermission;

  if (permission === undefined) {
    return undefined;
  }

  return {
    permission,
    roles: error.rolesWithPermission ?? [],
    reason: error.message,
    traceId: error.traceId,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The freshness report — AAP §0.2.1
 * --------------------------------------------------------------------------------------------- */

/**
 * Whether a source in a read's freshness report answered in the state asked about.
 *
 * `Result.meta.freshness` is the adapter's own account of what each of the six sources did, so the
 * states are read from that report rather than inferred from a figure the screen happens to hold
 * (AAP §0.2.1). Reading a state from the shape of a record instead would report an incomplete answer
 * as an out-of-date source, or a missing figure as a source that never replied.
 *
 * @param freshness - The read's freshness report.
 * @param state - The state to look for.
 * @returns Whether a source reported that state.
 */
export function reportsState(freshness: readonly Freshness[], state: FreshnessState): boolean {
  return freshness.some((entry) => entry.state === state);
}

/**
 * The source behind a stale screen, with the display name to print and the instant it last answered.
 *
 * One source is named rather than several, because a banner that listed every aged source would ask a
 * reader to work out which one matters; the caller says which matters by passing the source its own
 * next action depends on. The screen that takes an approval decision passes the source that gates it
 * (AAP §0.2.1, T-13), so the banner, the disabled controls and the service's own refusal name one
 * source; the screen whose figures come from several passes none, and the first aged source the report
 * lists is named. Either way the label comes from `SOURCE_LABELS`, the map that owns the six display
 * names, so the banner and the top bar's freshness strip print the same words about the same record,
 * and nothing is derived from the instant — no age and no duration (rule P-6).
 *
 * Only `stale` produces this record. A source that did not answer at all is the `unavailable`
 * condition {@link deriveScreenState} renders as `'offline'`, and an incomplete answer is its
 * `'partial'`, so neither is described here as a source that is merely out of date.
 *
 * @param freshness - The read's freshness report.
 * @param preferredSource - The source to name first when it is stale, or `undefined` to name the
 *   first aged source the report lists.
 * @returns The record the banner names, or `undefined` when no source is stale.
 */
export function staleSourceOf(
  freshness: readonly Freshness[],
  preferredSource?: SourceId,
): StateBoundaryStale | undefined {
  const preferred =
    preferredSource === undefined
      ? undefined
      : freshness.find((entry) => entry.source === preferredSource && entry.state === 'stale');
  const stale = preferred ?? freshness.find((entry) => entry.state === 'stale');

  if (stale === undefined) {
    return undefined;
  }

  return {
    source: stale.source,
    label: SOURCE_LABELS[stale.source],
    asOf: stale.asOf,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The seven states — platform-specification.md §8, AAP §0.5.2 and AAP §0.12.4
 * --------------------------------------------------------------------------------------------- */

/** No refusal from a screen's other calls, shared so the usual case allocates nothing. */
const NO_REFUSALS: readonly unknown[] = [];

/**
 * What a screen hands {@link deriveScreenState}: what its reads settled to, and the few facts about
 * the screen that the seven-state question genuinely needs.
 *
 * The first three members are the read's own settled facts and are the same on every screen. The rest
 * are the per-screen facts, each one an input rather than a variation of the mapping:
 *
 * - a route that named no record has nothing to read, and is `'empty'` whatever else is true;
 * - the rejections of the calls a screen makes beside its record read, whose permission refusal
 *   outranks the record read (see the OPEN ITEM in this module's header);
 * - the source a screen's stale notice prefers, because the screen, not this module, knows which
 *   source its next action depends on;
 * - whether the payload reports itself incomplete, which is the caller's own reading of a record
 *   (`Answer.partial`, a row missing a member the screen renders) and not something this module can
 *   see from a freshness report;
 * - whether there is anything to show at all, which is likewise the caller's reading of its payload:
 *   an emptiness this module tried to infer would be a second opinion about a record the screen
 *   already knows how to read.
 */
export interface ScreenStateInput {
  /** Whether a read this screen needs has yet to answer. */
  readonly isPending: boolean;

  /** The first rejection among the screen's reads, or `null` when none failed. */
  readonly error: unknown;

  /** The freshness report the settled read carries, or `undefined` while no read has settled. */
  readonly freshness: readonly Freshness[] | undefined;

  /**
   * Whether the route named no record at all, so the screen has nothing to read.
   *
   * Absent means the route named one.
   */
  readonly namedNoRecord?: boolean | undefined;

  /**
   * What the calls a screen makes beside its record read rejected with, when it makes any.
   *
   * Absent means the screen makes none, which is the case for a screen that only reads.
   */
  readonly refusals?: readonly unknown[] | undefined;

  /**
   * The source the stale notice names first when it is out of date, when the screen has one.
   *
   * Absent means no source is preferred and the first aged source the report lists is named.
   */
  readonly staleSourcePreference?: SourceId | undefined;

  /**
   * Whether the payload itself reports that an input was missing, as the screen reads it.
   *
   * Absent means the payload reports itself complete.
   */
  readonly payloadReportsPartial?: boolean | undefined;

  /**
   * Whether the payload holds anything to show at all.
   *
   * Absent means there is something to show, which is the case for a screen whose payload is a single
   * record rather than a collection: an empty list is a screen's own answer about its table, and no
   * screen turns a missing record into `'empty'` except through `namedNoRecord`.
   */
  readonly hasContent?: boolean | undefined;
}

/**
 * The state a screen's records are in, or `undefined` when no exceptional state holds.
 *
 * THE PRECEDENCE, in the order the checks run, is the whole of this module, and each step is here
 * because it answers a different question:
 *
 * a. **The route named no record → `'empty'`.** With no record asked for there is nothing a read could
 *    answer, so no later fact can change the answer. A screen that also renders a not-found panel
 *    above the boundary passes this too: the panel offers the way back, and the boundary does not
 *    pretend a record is on its way.
 * b. **A permission refusal from another call → `'forbidden'`.** The acting role may not act on the
 *    record at all, which outranks whatever the record read did.
 * c. **A `Problem` → the state its cause names.** `'permission'` → `'forbidden'`, because the role may
 *    not read it; `'validation'` → `'conflict'`, because the request cannot be honoured against the
 *    records as they stand and that is what a record that moved under the reader produces;
 *    `'not-found'` → `'empty'`, because the identifier no record answers is an answer, not a fault;
 *    `'policy'` and `'simulated-write-back'` → `'offline'`, because a rule suppressed the answer and a
 *    suppressed answer is one nothing stands behind.
 * d. **Any other rejection → `'offline'`.** A rejection that did not arrive in the port's shape is
 *    still a call that produced nothing, and reporting it as anything else would invent a cause.
 * e. **A pending read, or no freshness report yet → `'loading'`.** Nothing has settled, so no state
 *    about the records is being claimed.
 * f. **A source reported `unavailable` → `'offline'`.** Nothing answered for the content on screen,
 *    which is the state the simulation popover's offline trigger produces.
 * g. **A stale source → `'stale'`.** The sources answered and what they answered has aged, so the
 *    figures stay on screen under the banner that names the source and its as-of time (T-13).
 * h. **A source reported `partial`, or a payload that reports itself incomplete → `'partial'`.** The
 *    figures are shown with the notice naming what was left out.
 * i. **Nothing to show → `'empty'`.** An empty answer is a real answer, and it is read last because a
 *    warning about the sources is about the content, not a replacement for it.
 * j. **Otherwise `undefined`** — the boundary's documented "no exceptional state holds", which renders
 *    the content exactly as handed in. `ScreenState` carries exactly the seven members §8 fixes and no
 *    healthy member, so this is the current and complete case rather than an eighth state.
 *
 * @param input - The read's settled facts and the screen's own facts.
 * @returns The state to render, or `undefined` for no exceptional state.
 */
export function deriveScreenState({
  isPending,
  error,
  freshness,
  namedNoRecord = false,
  refusals = NO_REFUSALS,
  staleSourcePreference,
  payloadReportsPartial = false,
  hasContent = true,
}: ScreenStateInput): ScreenState | undefined {
  if (namedNoRecord) {
    return 'empty';
  }

  if (refusals.some((refusal) => forbiddenOf(refusal) !== undefined)) {
    return 'forbidden';
  }

  if (isProblem(error)) {
    switch (error.type) {
      case 'permission':
        return 'forbidden';
      case 'validation':
        return 'conflict';
      case 'not-found':
        return 'empty';
      case 'policy':
      case 'simulated-write-back':
        return 'offline';
    }
  }

  if (error !== null && error !== undefined) {
    return 'offline';
  }

  if (isPending || freshness === undefined) {
    return 'loading';
  }

  if (reportsState(freshness, 'unavailable')) {
    return 'offline';
  }

  if (staleSourceOf(freshness, staleSourcePreference) !== undefined) {
    return 'stale';
  }

  if (reportsState(freshness, 'partial') || payloadReportsPartial) {
    return 'partial';
  }

  return hasContent ? undefined : 'empty';
}
