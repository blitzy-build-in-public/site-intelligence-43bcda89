/**
 * The seven states of every screen, rendered in one place so that a screen cannot forget one.
 *
 * `platform-specification.md` §8 fixes seven states — loading, empty, stale, partial, offline,
 * forbidden and conflict — and AAP §0.12.4 requires every screen to render its content inside this
 * boundary, which is what makes the set structural rather than remembered: a screen passes the state
 * its records are in, and this component owns what that state looks like, so no screen composes a
 * banner, a skeleton or a denial card of its own.
 *
 * Two of the seven report a condition on the data rather than replacing it. `'stale'` and
 * `'partial'` render their notice **above** the content, because a figure that is out of date or
 * missing an input is still the figure a planner came to read, and hiding it would answer the
 * condition by taking the question away. The two are told apart by their status meaning rather than
 * by one shared warning: an aged source takes the warning triangle at the warning hue, and an
 * incompletely answered one takes the review eye at the review hue, because aged data and an
 * incomplete reading are different things to report and neither may rest on colour alone (rule B-3).
 * The other five replace the content: there is nothing behind `'loading'` or `'empty'`, nothing
 * answered for `'offline'`, the acting role may not read it for `'forbidden'`, and the record moved
 * under the reader for `'conflict'`.
 *
 * The empty state replaces the content with whichever rendering the caller supplied for it: the notice
 * on its own, or — through `emptyContent` — the caller's own statement of the emptiness, for a caller
 * whose structure carries it better than a sentence on its own can. A table with no rows to show is
 * that second case: it keeps its caption and its scoped column headers and holds the sentence in one
 * cell spanning every column, so the columns a reader was comparing do not vanish with the rows.
 *
 * The stale banner is one of the two required halves of the freshness rule (AAP §0.2.1, T-13). The
 * service refuses `requestApproval` and `decideApproval` with a `Problem` naming the source and its
 * as-of time; this banner names the same source through the record it is handed and prints the same
 * instant, and the screen beside it disables both controls through `ActionButton` with that same
 * reason. Both halves read one record, so they cannot disagree about which source aged or when it
 * last answered.
 *
 * What this component does not do. It holds no state, subscribes to no flag and reads no clock: the
 * state arrives as a prop from a screen that read it through the service, and the seven states are
 * triggered only from the single simulation popover in `src/app/simulation-controls.tsx`. Nothing
 * here inspects a query parameter, a global or a test-only flag, and the component registers no
 * listener, which is also why it needs no effect.
 *
 * Figures and labels. The only value rendered is the `asOf` instant the caller supplies, through the
 * one presentation formatter, and nothing is derived from it — no age, no duration and no count
 * (rule P-6). No simulation label is spelled here, because `Simulated data` belongs to the shell's
 * badge and each figure's label to the component that renders that figure (rule P-1). The wording
 * states what happened to the data and says nothing about where it is held, whether it could be
 * altered or whether anything was verified (rule P-4). Every colour is a role token of
 * `src/theme/tokens.css`, so both themes paint the roles the specification measured and no palette
 * literal is reachable from here (rule B-3); a meaning is carried by text and by the shared status
 * icon, never by colour alone, and the one control shown is keyboard operable with the focus ring the
 * token layer fixes.
 *
 * THE "NO EXCEPTIONAL STATE" CASE. `ScreenState` (`src/types/service.ts`) has exactly the seven
 * members specification §8 fixes, and a screen whose records are current and complete is in none of
 * them; AAP §0.12.4 nevertheless requires that screen to render inside this boundary, so `state` is
 * optional and its absence means the content renders exactly as handed in. The seven members keep
 * their single definition in `ScreenState`, and no second union is declared here.
 *
 * THE RECORDS TWO STATES CANNOT BE DESCRIBED WITHOUT. A banner or a card that named a source, a time,
 * a permission or a role would be inventing the facts that make the state actionable, so `stale` and
 * `forbidden` are required by contract whenever those two states are passed. Without them this
 * component states the condition in neutral words rather than guessing or going silent: the stale
 * state warns naming no source and printing no instant, and the forbidden state shows a neutral
 * notice naming no permission, no role and no trace id.
 */
import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

import type { Permission, Role, ScreenState, SourceId, Timestamp } from '../types';
import { INSET_SURFACE_CLASSES } from './card';
import { ForbiddenCard } from './forbidden-card';
import { MonoValue } from './mono-value';
import { StatusIndicator } from './status-indicator';
import { ActionButton } from './tooltip';

/* ---------------------------------------------------------------------------------------------
 * The two records a state cannot honestly be described without
 * ------------------------------------------------------------------------------------------- */

/**
 * The source behind a stale screen, as the service reported it in `Result.meta.freshness`.
 *
 * The three members are three of the four `SourceHealth` carries, the state itself omitted because the
 * `'stale'` prop value already fixes it: one record is handed in whole rather than as loose fields, so
 * a banner cannot be given one source's label beside another source's instant. `label` is the display
 * name the freshness strip prints for the same record (`SOURCE_LABELS` keyed by `source`), so the pill
 * in the top bar and the banner on the screen say the same words about the same source.
 */
export interface StateBoundaryStale {
  /** Which of the six sources the record describes, as `Freshness.source` states it. */
  readonly source: SourceId;

  /** The display name to print for that source, exactly as the service supplied it. */
  readonly label: string;

  /**
   * When the source last answered, printed through the one presentation formatter. A record value,
   * never a reading of the clock, and never turned into an age here (rule P-6).
   */
  readonly asOf: Timestamp;
}

/**
 * The denial a forbidden screen explains, member for member the evidence a `'permission'` `Problem`
 * carries.
 *
 * The names are the service's own — `Problem.requiredPermission`, `Problem.rolesWithPermission`,
 * `Problem.traceId` and `Problem.message` — so a screen hands the failure straight through and no
 * translation layer can disagree with the service about who may act or about why the call was
 * refused.
 */
export interface StateBoundaryForbidden {
  /** The permission the acting role lacks, naming what the denied view or action required. */
  readonly permission: Permission;

  /**
   * The roles that hold that permission, possibly empty: a permission no seeded role holds is
   * reported as such rather than hidden.
   */
  readonly roles: readonly Role[];

  /**
   * The refusal's own sentence, from `Problem.message`, printed above the roles it lists. Optional,
   * because a caller that has no sentence to quote still has the permission, the roles and the trace
   * id to show — and the sentence is the service's rather than this boundary's, so a denial whose
   * cause only the service knows is never described in words the boundary invented.
   */
  readonly reason?: string | undefined;

  /** The correlation identifier of the refused call, so a reader can quote it when reporting it. */
  readonly traceId: string;
}

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this component states, held here so that the wording has one owner: the component
 * renders these strings and its suite names them through this object instead of retyping them, the
 * way `STAGE_NOTICE_LINK_LABEL` owns the stage notice's link text.
 *
 * None of these is a specification string. The fixed strings — the seven §5.3 simulation labels, the
 * SCR-04 empty and disabled sentences, the stage tooltips — belong to the components that own them
 * and are not repeated here; a caller supplies a screen-specific message through `emptyMessage`,
 * `partialMessage` or `conflictMessage` and it is rendered instead of the neutral caption below. The
 * wording states what happened to the data and claims nothing further (rule P-4), and it types no
 * figure (rule P-6).
 */
export const STATE_BOUNDARY_TEXT = {
  /** The visible caption of the loading region, and the region's accessible name. */
  loading: 'Loading',

  /** What the empty state says when the caller supplied no message of its own. */
  emptyFallback: 'Nothing to show.',

  /** Completes the stale banner's headline from the source label it was handed. */
  staleSuffix: ' is not current',

  /** Introduces the instant the stale source last answered. */
  staleAsOfPrefix: 'As of',

  /**
   * The headline of the notice shown when a stale state arrived without its record. It is this
   * component's own wording, so it names no source, no instant and no figure (rules P-6, P-4).
   */
  staleHeadline: 'This view is not current',

  /** The detail of that notice, saying only which facts went unnamed (rules P-6, P-4). */
  staleDetail: 'The source behind it was not named, so its as-of time is not shown.',

  /** The partial notice's headline; the caller's `partialMessage` says which inputs are missing. */
  partialHeadline: 'Some inputs are missing',

  /** The offline notice's headline. */
  offlineHeadline: 'No source is answering',

  /**
   * The offline notice's detail. It says what the state means for the reader and nothing about why
   * the sources are unreachable, because the demonstration models no connector and knows no reason.
   */
  offlineDetail:
    'The sources behind this view did not answer, so nothing is shown rather than a figure the records cannot support.',

  /** The headline of the denial shown when no permission record was supplied. */
  forbiddenHeadline: 'Not permitted',

  /** The detail of that denial: it names no permission, no role and no trace id. */
  forbiddenDetail: 'Your role does not permit this view.',

  /** The conflict notice's headline. */
  conflictHeadline: 'This record changed while you were reading it',

  /** The conflict notice's detail when the caller supplied no message of its own. */
  conflictDetail: 'Reload to read the record as it now stands.',

  /** The accessible name of the control that asks for the read again after a failure. */
  retryLabel: 'Try again',

  /** The accessible name of the control that re-reads a record that moved under the reader. */
  reloadLabel: 'Reload',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * A notice above content that still renders: one column, so the notice and the content are separated
 * by the 4 px grid rather than by a margin on either of them.
 */
const STACK_CLASSES = 'flex min-w-0 flex-col gap-3';

/** A notice beside its control, where the control sits under the notice it belongs to. */
const NOTICE_STACK_CLASSES = 'flex min-w-0 flex-col gap-2';

/**
 * The notice surface: the inset box `./card.tsx` names as the third surface role, laid out in the
 * column this notice stacks its headline, its detail and its control in. The box itself — the card
 * radius, the decorative hairline, the second raised surface and its one padding — is
 * `INSET_SURFACE_CLASSES`, so a notice here and a notice in `./evidence-drawer.tsx` cannot drift
 * apart, and only the stack belongs to this component. Every value stays a role token, so Command
 * and Paper each resolve their own measured pairing, and the token layer exposes no elevation
 * utility, so no shadow can be added here (rule B-3, and specification §4.3's no-shadow rule).
 */
const NOTICE_CLASSES = `flex min-w-0 flex-col gap-1 ${INSET_SURFACE_CLASSES}`;

/**
 * The region a caller's own empty rendering stands in, when it supplied one.
 *
 * It adds no surface, border or padding of its own: the caller's structure is what states the
 * emptiness — a table that keeps its caption and scoped headers and holds the sentence in the cell
 * that spans them — and a notice frame around it would draw a second boundary inside the one the
 * caller already paints. The region stays on the 4 px grid through the caller's own spacing, and
 * `min-w-0` is all this box owes it, so a wide structure inside a flex column can still shrink.
 */
const EMPTY_CONTENT_CLASSES = 'min-w-0';

/** The secondary text role for a notice's supporting sentence, one step down the type scale. */
const DETAIL_CLASSES = 'text-13 text-text-secondary';

/**
 * The loading region is not a raised surface: it stands on the page ground and its bars are the
 * raised second surface, which is what makes them read as placeholder content rather than as a notice.
 */
const LOADING_CLASSES = 'flex min-w-0 flex-col gap-2';

/** The loading region's caption, in the secondary text role. */
const LOADING_CAPTION_CLASSES = 'text-13 text-text-secondary';

/**
 * One skeleton bar. It is static on purpose: an animated placeholder would have to honour
 * `prefers-reduced-motion` (rule B-3), and a bar that does not move cannot break that rule at all.
 * The bars are hidden from assistive technology, which hears the region's caption instead.
 */
const SKELETON_BAR_CLASSES = 'block h-4 rounded-control bg-surface-2';

/** The bars' widths, in the order they stack: full, two thirds, one third. */
const SKELETON_BAR_WIDTHS = ['w-full', 'w-2/3', 'w-1/3'] as const;

/* ---------------------------------------------------------------------------------------------
 * Props
 * ------------------------------------------------------------------------------------------- */

/**
 * What every screen hands {@link StateBoundary}: the state its records are in and its content,
 * with the facts a warning or a denial cannot be stated without — the source behind a stale read,
 * and the evidence a permission `Problem` carries. The state is optional because a screen whose
 * records are current and complete is in none of the seven that specification §8 fixes, and those
 * two records become required by contract exactly when their states are passed (AAP §0.12.4).
 */
export interface StateBoundaryProps {
  /**
   * The state the screen's records are in, or absent when no exceptional state holds.
   *
   * Required whenever one of the seven applies, and typed from `../types` so the seven members keep
   * exactly one definition in `ScreenState`. Absent means the content is current and complete and is
   * rendered exactly as handed in, which is the case AAP §0.12.4 still requires to pass through this
   * boundary. A `SimulationFlag` value that is not a screen state — the edited audit event and the
   * emptied queue — is deliberately not accepted here: those are triggers the popover drives, and the
   * screens show their effect through the seven states above.
   */
  readonly state?: ScreenState | undefined;

  /**
   * The screen's content.
   *
   * Rendered as given for the absent state and for `'stale'` and `'partial'`, which report a
   * condition on the data rather than withholding it, and withheld for the five states that replace
   * it.
   */
  readonly children: ReactNode;

  /**
   * The caller's own rendering of the empty state, for a caller whose content states the emptiness
   * inside its own structure rather than in a sentence on its own.
   *
   * A table whose rows are all the read returned is that caller: it keeps its `<caption>`, its scoped
   * column headers and its body, and holds the sentence in the one cell that spans every column, so a
   * reader who narrowed the view to nothing still sees the columns they were choosing between.
   *
   * Rendered inside this boundary's single `role="status"` region in place of the notice, and only for
   * `state === 'empty'`: every other state's rendering is unchanged, and the content handed as
   * `children` is withheld exactly as it is when the notice stands in. Absent, the empty state renders
   * the notice built from `emptyMessage` and {@link STATE_BOUNDARY_TEXT}'s `emptyFallback`, which is
   * what a screen with no structure of its own hands in.
   *
   * The region stays exactly one whatever it holds — a caller inspecting the boundary by role finds
   * one region, not one per rendering — because a state is announced once rather than twice.
   */
  readonly emptyContent?: ReactNode | undefined;

  /**
   * The source behind a stale screen, with the display name to print and the instant it last
   * answered.
   *
   * Required whenever `state` is `'stale'`, and absent for every other state. With it supplied, this is
   * the visible half of the freshness rule (AAP §0.2.1, T-13): the source name and the instant the
   * disabled approval controls carry in their `disabledReason` come from this same record, so the banner
   * and the controls cannot describe the staleness differently. Absent, the boundary still warns that
   * the content is not current, through a neutral notice naming no source and printing no instant,
   * because a stale view must never be presented as a current one and a notice that named a source
   * nobody supplied would assert a record that does not exist.
   */
  readonly stale?: StateBoundaryStale | undefined;

  /**
   * What asking for the read again does, when the failure can be retried.
   *
   * Supplied by a screen that can repeat the call: the offline state renders a retry control through
   * `ActionButton`, the conflict state renders a reload control through the same component, and a
   * partial read offers the retry beside its notice. Absent, no control is rendered at all, because a
   * button that cannot act is exactly what rule P-8 forbids. The forbidden state never renders one:
   * repeating a call the acting role is not permitted to make would fail the same way.
   */
  readonly onRetry?: (() => void) | undefined;

  /**
   * The screen's own fixed sentence for the empty state, holding whatever string that screen's
   * specification row fixes.
   *
   * Rendered character for character. Absent or empty, the neutral caption of
   * {@link STATE_BOUNDARY_TEXT} stands in, so an empty region is never silent and no specification
   * string is invented here.
   */
  readonly emptyMessage?: string | undefined;

  /**
   * The screen's sentence for the partial state, naming the inputs the source did not answer with.
   *
   * Rendered beneath the notice's headline. Absent, the headline stands alone rather than the notice
   * inventing a list of missing inputs it does not know.
   */
  readonly partialMessage?: string | undefined;

  /**
   * The screen's sentence for the conflict state, saying what changed and what the reader can do.
   *
   * Rendered instead of the neutral detail of {@link STATE_BOUNDARY_TEXT}.
   */
  readonly conflictMessage?: string | undefined;

  /**
   * The denial to explain, member for member the evidence a `'permission'` `Problem` carries.
   *
   * Required whenever `state` is `'forbidden'`, and handed straight to `ForbiddenCard`, which owns the
   * card's surface and its heading. Absent, a neutral notice is shown that names no permission, no
   * role and no trace id.
   */
  readonly forbidden?: StateBoundaryForbidden | undefined;
}

/* ---------------------------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------------------------- */

/** Whether a caller-supplied sentence is present, so an empty string leaves no empty element behind. */
function hasText(value: string | undefined): value is string {
  return value !== undefined && value.length > 0;
}

/** Concatenates the class names that are present, leaving no empty entry and no double space. */
function joinClassNames(...values: readonly string[]): string {
  return values.filter((value) => value.length > 0).join(' ');
}

/**
 * The retry or reload control of a state, or nothing when the screen cannot repeat the call.
 *
 * The control is `ActionButton`, so it is a native button with an accessible name and the 24x24 px
 * minimum target and focus ring the token layer fixes (rule B-3), and it exists only when a handler
 * was supplied (rule P-8). It sits outside the notice's live region, so a reader is told the failure
 * once and then finds the control beside it rather than inside the announced text.
 *
 * `self-start` keeps the control at its own width inside the column that holds it. That column stretches
 * its children by default, which makes the retry span the whole content width and read as a broken bar
 * rather than as an action; the alignment is set here rather than on the column because the loading
 * region reuses the same column for its skeleton bars, and those bars are meant to fill it.
 */
function retryControl(label: string, onRetry: (() => void) | undefined): ReactNode {
  if (onRetry === undefined) {
    return null;
  }

  return (
    <ActionButton className="self-start" onClick={onRetry}>
      {label}
    </ActionButton>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The boundary
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders one screen state around the content it belongs to.
 *
 * The `switch` is exhaustive over `ScreenState` and deliberately carries no `default` arm: a member
 * added to that union stops this function compiling rather than rendering as whatever arm happened to
 * be last, which is the reminder that a new state needs a decided rendering before it can be shown.
 * The trailing `never` assignment is what turns that reminder into a compile error under this
 * repository's compiler settings.
 *
 * @param props The state, the content, and the record or messages the state needs to explain itself.
 * @returns The content alone when no exceptional state holds; otherwise the state's own rendering,
 *   with the content kept for the two states that warn about it and withheld for the five that
 *   replace it.
 */
export function StateBoundary({
  state,
  children,
  emptyContent,
  stale,
  onRetry,
  emptyMessage,
  partialMessage,
  conflictMessage,
  forbidden,
}: StateBoundaryProps): ReactElement {
  /* The id the loading caption carries and the region takes its name from. Called above the
     absent-state return so the hook runs on every render of a mounted boundary regardless of which
     state it was handed: a hook reached only under `'loading'` would make the hook order depend on
     the prop and break the rules of hooks. */
  const loadingCaptionId = useId();

  if (state === undefined) {
    return <>{children}</>;
  }

  switch (state) {
    /* The call is pending: a static skeleton stands in for the content, and the content itself is
       withheld so a half-read screen cannot be mistaken for a complete one. */
    case 'loading':
      return (
        <div
          role="status"
          aria-busy="true"
          /* The region takes its name from the caption it already renders, through the reference
             rather than through a second copy of the words: an ARIA name computed from an element's
             own visible text is announced once, where an `aria-label` repeating that text is a second
             utterance of the same word in the screen-reader/browser pairs that announce both. The
             caption keeps its place in the accessibility tree, so the name is never the only place
             the words appear. Dropping the name instead of repointing it would leave the busy region
             unnamed, so its arrival would not be announced at all (rule B-3). */
          aria-labelledby={loadingCaptionId}
          className={LOADING_CLASSES}
        >
          <span id={loadingCaptionId} className={LOADING_CAPTION_CLASSES}>
            {STATE_BOUNDARY_TEXT.loading}
          </span>
          <span aria-hidden="true" className={NOTICE_STACK_CLASSES}>
            {SKELETON_BAR_WIDTHS.map((width) => (
              <span key={width} className={joinClassNames(SKELETON_BAR_CLASSES, width)} />
            ))}
          </span>
        </div>
      );

    /* The call succeeded and returned nothing to show. A caller whose own structure states the
       emptiness — a table keeping its caption and scoped headers with the sentence in the cell that
       spans them — supplies that structure as `emptyContent`, and it stands in the region in place of
       the notice; the content handed as `children` is withheld either way, because there is nothing
       behind an empty answer. Absent it, the caller's fixed sentence, or the neutral caption when it
       supplied none. */
    case 'empty':
      if (emptyContent !== undefined) {
        return (
          <div role="status" className={EMPTY_CONTENT_CLASSES}>
            {emptyContent}
          </div>
        );
      }

      return (
        <div role="status" className={NOTICE_CLASSES}>
          <StatusIndicator
            meaning="empty"
            label={hasText(emptyMessage) ? emptyMessage : STATE_BOUNDARY_TEXT.emptyFallback}
          />
        </div>
      );

    /* A source behind the content is out of date. The banner names it and prints the instant it last
       answered; the content stays on screen, because the figures are readable and the warning is about
       their currency rather than their presence. Out-of-date content must never be presented as current
       (AAP §0.2.1, T-13), so a stale state handed no record still warns: because the caller supplied no
       source, that notice names none and prints no instant rather than asserting a record the caller
       never supplied (rules P-6, P-4), and it holds no control, because repeating the read is not what
       makes an aged source current again (rule P-8). */
    case 'stale':
      if (stale === undefined) {
        return (
          <div className={STACK_CLASSES}>
            <div role="status" className={NOTICE_CLASSES}>
              <StatusIndicator meaning="warning" label={STATE_BOUNDARY_TEXT.staleHeadline} />
              <p className={DETAIL_CLASSES}>{STATE_BOUNDARY_TEXT.staleDetail}</p>
            </div>
            {children}
          </div>
        );
      }

      return (
        <div className={STACK_CLASSES}>
          <div role="status" className={NOTICE_CLASSES}>
            <StatusIndicator
              meaning="warning"
              label={`${stale.label}${STATE_BOUNDARY_TEXT.staleSuffix}`}
            />
            <p className={DETAIL_CLASSES}>
              {STATE_BOUNDARY_TEXT.staleAsOfPrefix}{' '}
              <MonoValue value={stale.asOf} kind="timestamp" />
            </p>
          </div>
          {children}
        </div>
      );

    /* A source answered incompletely: the notice names the condition above the content, which keeps
       rendering so the missing inputs can be read beside the figures they affect. The condition reads
       as the review to inspect — the eye at the review hue — rather than as the warning triangle the
       stale banner carries, because an incomplete answer is a different thing to report than an aged
       one, and the two states must be told apart by more than their words (rule B-3). */
    case 'partial':
      return (
        <div className={STACK_CLASSES}>
          <div className={NOTICE_STACK_CLASSES}>
            <div role="status" className={NOTICE_CLASSES}>
              <StatusIndicator meaning="review" label={STATE_BOUNDARY_TEXT.partialHeadline} />
              {hasText(partialMessage) ? <p className={DETAIL_CLASSES}>{partialMessage}</p> : null}
            </div>
            {retryControl(STATE_BOUNDARY_TEXT.retryLabel, onRetry)}
          </div>
          {children}
        </div>
      );

    /* Nothing answered at all, so there is no figure to show: the notice replaces the content, and
       the retry exists only when the screen can repeat the call. */
    case 'offline':
      return (
        <div className={NOTICE_STACK_CLASSES}>
          <div role="status" className={NOTICE_CLASSES}>
            <StatusIndicator meaning="fail" label={STATE_BOUNDARY_TEXT.offlineHeadline} />
            <p className={DETAIL_CLASSES}>{STATE_BOUNDARY_TEXT.offlineDetail}</p>
          </div>
          {retryControl(STATE_BOUNDARY_TEXT.retryLabel, onRetry)}
        </div>
      );

    /* The acting role lacks the permission the call required, or the demonstration withheld the view.
       The card prints the refusal's own sentence, the permission, the roles that hold it and the trace
       id of the refused call, so the denial is explained rather than merely reported. No retry is
       offered: the same call would be refused again. */
    case 'forbidden':
      if (forbidden === undefined) {
        return (
          <div role="status" className={NOTICE_CLASSES}>
            <StatusIndicator meaning="fail" label={STATE_BOUNDARY_TEXT.forbiddenHeadline} />
            <p className={DETAIL_CLASSES}>{STATE_BOUNDARY_TEXT.forbiddenDetail}</p>
          </div>
        );
      }

      return (
        <ForbiddenCard
          permission={forbidden.permission}
          roles={forbidden.roles}
          reason={forbidden.reason}
          traceId={forbidden.traceId}
        />
      );

    /* The record moved under the reader, so the update was refused rather than merged: the notice
       replaces the stale content and the control re-reads the record when the screen can. */
    case 'conflict':
      return (
        <div className={NOTICE_STACK_CLASSES}>
          <div role="status" className={NOTICE_CLASSES}>
            <StatusIndicator meaning="fail" label={STATE_BOUNDARY_TEXT.conflictHeadline} />
            <p className={DETAIL_CLASSES}>
              {hasText(conflictMessage) ? conflictMessage : STATE_BOUNDARY_TEXT.conflictDetail}
            </p>
          </div>
          {retryControl(STATE_BOUNDARY_TEXT.reloadLabel, onRetry)}
        </div>
      );
  }

  /* Unreachable: the switch above returns for every member of `ScreenState`. A member added to that
     union leaves `state` not-narrowed here, so this assignment fails to compile instead of the new
     state silently rendering nothing. */
  const unhandled: never = state;
  return unhandled;
}
