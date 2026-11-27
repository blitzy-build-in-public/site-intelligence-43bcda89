/**
 * The Site Intelligence shell's statement of how current each of the six modelled data sources is:
 * one pill per source, in the top bar, on every route and for every persona.
 *
 * WHY THE SHELL OWNS IT. Freshness is the visible half of a rule that has two halves (AAP §0.2.1,
 * T-13). The service refuses a stale-source action on its own, with a `Problem` that names the source
 * and the instant it last answered, so the rule holds even when a control is bypassed. This strip is
 * the other half: a reader sees the six sources' state before reading a figure derived from them, and
 * the same source, the same state and the same instant are repeated by the stale banner of
 * `src/components/state-boundary.tsx` beside the disabled approval controls. Both read one record —
 * the banner through `Result.meta.freshness`, this strip through the source catalogue — so the two
 * surfaces cannot disagree about a source or its time.
 *
 * WHERE THE RECORDS COME FROM. `useService().getSourceCatalogue()` through the typed port, cached by
 * the query cache under the port method's own name (rule P-2). The payload is `SourceCatalogue` from
 * `src/types/sources.ts`: the six records in the order the specification renders them, each carrying
 * its source, the display name to print, its state and the instant it last answered. The six are
 * modelled and never contacted (AAP §0.6.3), so a pill reports what the adapter last read and nothing
 * behind it: no endpoint, no connection state, no address.
 *
 * The catalogue read requires no permission of its own, and that is deliberate rather than an
 * omission: the six sources' state and as-of instants already travel to every persona in the `meta`
 * of every result the port returns, so there is nothing here for a role check to withhold, and the top
 * bar shows the six pills on every route for every persona. What the read does respect is the
 * demonstration's forbidden trigger, so a strip refused in that state reports the refusal instead of
 * inventing a state (see the failure rendering below).
 *
 * WHY EACH PILL IS A {@link FreshnessPill} AND NOT A SECOND ONE. That component already pairs the
 * shared status vocabulary — the meaning's icon, its status colour and the state's own token as text
 * — with the source's name and the instant it answered, and it shares its state-to-meaning mapping
 * with the stale banner. Building a second pill here would give the product a second opinion about
 * what a stale source looks like, which is exactly what the freshness rule cannot afford.
 *
 * WHAT THIS MODULE DOES NOT DO.
 * - It computes no age, no duration and no "minutes ago" figure (rule P-6). The pill prints the
 *   `asOf` instant the record carries; an age is arithmetic, and arithmetic belongs to the domain
 *   modules, not to the component layer. The strip therefore also types no number: not a count of
 *   sources, not a date, not an identifier (rule P-6).
 * - It adds no simulation label of its own (rule P-1). It shows record state rather than a computed
 *   figure, and the persistent `Simulated data` badge belongs to the shell above the router outlet;
 *   a second label here would compete with it.
 * - It states nothing about where a source runs, whether its traffic is confined, whether a record
 *   could be altered or whether anything was verified (rule P-4). A pill says how current an answer
 *   is and stops there.
 * - It puts no focus stop on a source's state and answers no pointer with it. A state has nothing to
 *   operate, so the pills are indicators inside a `role="group"` rather than a row of controls, and
 *   rule P-8's "works or is visibly disabled with its reason" never applies to them (rule B-3 keeps
 *   the group readable by keyboard because it is in the reading order, not because it is focusable).
 *   The one control this module owns is the narrow-viewport disclosure described below, and it is a
 *   `<button>` that really does open and close the pills it names rather than a trigger that goes
 *   nowhere.
 * - It makes no request of its own (rule B-1): the read resolves from records already in the browser,
 *   and nothing here reads configuration or a credential (rule B-2).
 * - It spells no source name. The six come from the records' own `label`, which the service fills from
 *   `SOURCE_LABELS`, and the product vocabulary of rule P-7 is the only vocabulary in this file.
 *
 * THE THREE RENDERINGS, and why each is honest.
 * - Pending: one busy caption inside the same group, never six placeholder pills with a freshness
 *   state attached. A state that has not been read cannot be shown, so the strip says it is reading
 *   rather than dressing a guess up as a reading.
 * - Refused or failed: one short notice carrying the service's own message, so the reason a reader
 *   sees is the reason the adapter gave rather than a paraphrase. There is no retry control here:
 *   retrying a refused read is a page's decision, and `StateBoundary` owns the retry surface
 *   (rule P-8 keeps this strip out of that path rather than offering a control that cannot act).
 * - Loaded: one pill per record, in the catalogue's order. An empty catalogue is stated as such
 *   rather than rendered as an empty row of nothing.
 *
 * WHY THE PILLS SIT BEHIND A DISCLOSURE BELOW THE `md` BREAKPOINT. The top bar is the shell's banner
 * on every route, so every line it takes is taken off every screen. At a 375 px window the six pills
 * wrapped onto two lines of their own and, together with the role switcher's labelled select, left
 * the navigation and the route's own heading below the fold of a phone viewport: the header measured
 * 584 px above a 328 px navigation in an 812 px viewport (QA finding qa-w013-I35). Everything below
 * `md` — 48rem — therefore holds the pills behind one disclosure. Its trigger is this component's
 * because the pills are the content it reveals (AAP §0.5.2), and the nine top-bar positions keep the
 * order AAP §0.12.1 fixes either way, because the trigger stands where the pills stand. From `md` up
 * the strip renders exactly what it rendered before: one group of six pills, no trigger, no extra
 * element.
 *
 * THE DISCLOSURE NEVER HIDES A REFUSAL. Only the pills fold away. The pending caption, the unreadable
 * notice and the empty statement render whatever the width and whatever the disclosure's state,
 * because a read that did not happen has to be reported rather than collapsed out of sight; and the
 * trigger is not rendered at all when there is no pill to reveal, so a reader never meets a control
 * with nothing behind it (rule P-8).
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import type { ReactElement } from 'react';

import { FreshnessPill } from '../components/freshness-pill';
import { CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES } from '../components/tooltip';
import { useService } from '../services/service-provider';
import type { SourceCatalogue, SourceHealth } from '../types/sources';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence the strip states, held here so the wording has one owner: the component renders
 * these strings and a suite names them through this object instead of retyping them, the way
 * `SERVICE_PROVIDER_TEXT` and `STATE_BOUNDARY_TEXT` own their own copy.
 *
 * None of them is a specification string — the seven §5.3 simulation labels belong to the components
 * that carry them and none of them appears here (rule P-1) — and none carries a figure, a date or a
 * record identifier (rule P-6). Each states what happened to the read and claims nothing about the
 * sources beyond it (rule P-4).
 */
export const FRESHNESS_STRIP_TEXT = {
  /** The accessible name of the group the six pills read as, and of the notice that replaces them. */
  group: 'Source freshness',

  /** The pending caption: the strip says it is reading rather than showing an unread state. */
  reading: 'Reading source freshness',

  /**
   * The failure lead. The service's own message follows it, so a reader is told that the read did not
   * happen and then why, in the adapter's words rather than in a second account written here.
   */
  unreadable: 'Source freshness could not be read.',

  /** What an answered read with no records in it says, instead of rendering an empty row. */
  noneDeclared: 'No source records were supplied.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The cache key and the class lists
 * ------------------------------------------------------------------------------------------- */

/**
 * The query cache key, in the `[method, ...args]` form the query cache is keyed by.
 *
 * The method takes no argument, so the key is the method's own name: two surfaces reading the
 * catalogue share one cache entry, and a write that invalidates the catalogue invalidates this
 * strip's copy with it. Nothing else is folded into the key, because the payload depends on no
 * persona, plant or product — the six sources answer for the whole workspace.
 */
const FRESHNESS_QUERY_KEY = ['getSourceCatalogue'] as const;

/**
 * The group's layout: a wrapping row of inline pills separated by the 4 px grid's own step, so six
 * pills share a narrow top bar without a margin between siblings and without overflowing the row.
 *
 * No colour, surface or size is set here — each pill owns its own, and the token layer exposes no
 * elevation utility for either surface to select (specification §4.3).
 */
const STRIP_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2';

/**
 * The notice's appearance: one line of the smaller type step in the secondary text role, allowed to
 * take the row's full width and to break a long word, because the message it can carry is the
 * service's own and its length is not this module's to predict (rule B-3, and the overflow
 * discipline of AAP §0.18.1).
 */
const NOTICE_CLASSES = 'min-w-0 max-w-full text-12 break-words text-text-secondary';

/**
 * The disclosure trigger the narrow presentation offers, built from the shared control surface.
 *
 * The structure and the appearance come from `src/components/tooltip.tsx` rather than being written
 * out again here, so the trigger keeps the 24x24 px minimum target, the 2 px `focus-ring` focus ring
 * on `focus-visible`, the control radius and the role-token colours that every other control in the
 * shell has (rule B-3), and a token change there reaches this control too. No raw palette value, no
 * shadow and no arbitrary value is added beside them (AAP §0.5.3, rule P-8).
 */
const TRIGGER_CLASSES = [CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES].join(' ');

/**
 * The region the trigger reveals, while it is closed.
 *
 * The region stays in the document when it is closed, because the trigger's `aria-controls` names it
 * and a relationship pointing at an element that does not exist is not a relationship; it holds no
 * pill at all, which is where the height the disclosure saves comes from. It is closed with
 * `hidden`, so a closed region takes neither width nor height in the wrapping row.
 */
const CLOSED_REGION_CLASSES = 'hidden';

/* ---------------------------------------------------------------------------------------------
 * The narrow viewport, read synchronously and kept current
 * ------------------------------------------------------------------------------------------- */

/**
 * The query that reports a window narrow enough for the six pills to cost the shell more height than
 * they earn: everything below Tailwind's `md` breakpoint, which is `48rem`.
 *
 * Stated in `rem` and never in `px`, for the reason `src/components/evidence-drawer.tsx` states on its
 * own docked query — a breakpoint's utilities resolve against the root font size, so a query fixed in
 * pixels would keep reporting one presentation after the styling had changed for a reader whose
 * default font size is not 16 px. The upper bound is the last thousandth of a rem below `48rem`, so
 * the narrow and the wide presentation can never both match.
 */
const NARROW_QUERY = '(max-width: 47.999rem)';

/**
 * Whether the window is currently narrow, read synchronously.
 *
 * Read during the first render rather than after it, so the bar is laid out in the presentation the
 * reader's viewport calls for on the frame it first appears and never flips once an effect has run.
 * An environment with no `matchMedia` at all — the jsdom test environment, which implements no media
 * query, and any pass without a DOM — answers `false` and therefore gets the wide presentation, which
 * is the markup every existing suite was written against (see {@link useNarrowPresentation}).
 */
function matchesNarrowQuery(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(NARROW_QUERY).matches;
}

/**
 * The presentation the strip is in, kept current while it stays mounted.
 *
 * The state starts from a synchronous read of the same query, and the effect subscribes to that
 * query's `change` event, so a window resized across the breakpoint folds or unfolds the pills
 * without a remount. The effect also re-reads the query once on mount, because a subscription only
 * reports changes that happen after it exists. The listener is removed when the strip unmounts, so
 * nothing stays registered behind it.
 *
 * This is the pattern `useDockedPresentation` in `src/components/evidence-drawer.tsx` uses. It is
 * carried here as a second small helper rather than as a shared module because AAP §0.13 fixes the
 * file tree and names no shared hook, and because the two queries answer different questions about
 * different surfaces.
 */
function useNarrowPresentation(): boolean {
  const [isNarrow, setIsNarrow] = useState(matchesNarrowQuery);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia(NARROW_QUERY);

    setIsNarrow(query.matches);

    function handleChange(event: MediaQueryListEvent): void {
      setIsNarrow(event.matches);
    }

    query.addEventListener('change', handleChange);

    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, []);

  return isNarrow;
}

/* ---------------------------------------------------------------------------------------------
 * The strip
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders the six sources' freshness for the shell's top bar.
 *
 * Takes no props: the strip reads the catalogue itself through the port, so a caller cannot hand it
 * records from a second source and cannot narrow it to a subset of the six.
 *
 * The root is a `<div>` carrying `role="group"` and an accessible name, so the six pills are
 * announced as one named region rather than as six floating labels. `aria-busy` follows the read, so
 * assistive technology is told that the region is still being filled while it is being filled.
 *
 * Below the `md` breakpoint the group holds one disclosure trigger and the region behind it instead
 * of the pills, and from `md` up it holds the pills exactly as it always has. Either way the notice
 * that stands in for an unanswered read is rendered as it is, never behind the trigger.
 *
 * @returns The group holding the pills, the trigger that reveals them, or the notice standing in.
 */
export function FreshnessStrip(): ReactElement {
  const service = useService();
  const isNarrow = useNarrowPresentation();

  /** Whether the narrow presentation's disclosure is open; it starts closed, so the bar is short. */
  const [isRevealed, setIsRevealed] = useState(false);

  /** The id of the region the trigger names, generated once so `aria-controls` resolves. */
  const pillsId = useId();

  const catalogue = useQuery({
    queryKey: FRESHNESS_QUERY_KEY,
    queryFn: () => service.getSourceCatalogue(),
    /*
     * A refusal here is a decision rather than a glitch — the demonstration's forbidden trigger, which
     * the read honours on the same terms as every other family — so retrying it would only delay the
     * honest notice. The retry surface belongs to `StateBoundary`, which a page composes around its
     * own reads.
     */
    retry: false,
  });

  const isReading = catalogue.status === 'pending';
  const reading = readingOf(catalogue.status, catalogue.data, catalogue.error);

  return (
    <div
      role="group"
      aria-label={FRESHNESS_STRIP_TEXT.group}
      aria-busy={isReading}
      className={STRIP_CLASSES}
    >
      {isNarrow && reading.kind === 'pills' ? (
        <>
          <button
            type="button"
            aria-expanded={isRevealed}
            aria-controls={pillsId}
            className={TRIGGER_CLASSES}
            onClick={() => {
              setIsRevealed(!isRevealed);
            }}
          >
            {FRESHNESS_STRIP_TEXT.group}
          </button>
          {/*
            * The revealed region reuses the group's own row, so an opened disclosure lays the six
            * pills out exactly as the wide presentation does.
            */}
          <div id={pillsId} className={isRevealed ? STRIP_CLASSES : CLOSED_REGION_CLASSES}>
            {isRevealed ? contentOf(reading) : null}
          </div>
        </>
      ) : (
        contentOf(reading)
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * What the group holds, one branch per read outcome
 * ------------------------------------------------------------------------------------------- */

/**
 * What the read produced, in the two shapes the strip can render.
 *
 * Named as a union rather than as two separate questions about the query, so the disclosure can ask
 * "are there pills to reveal?" and the rendering can ask "what do I draw?" of the same answer: a
 * strip that decided one of those from the read's status and the other from its data would be two
 * owners of one branch, free to disagree.
 */
type StripReading =
  | { readonly kind: 'pills'; readonly records: readonly SourceHealth[] }
  | { readonly kind: 'notice'; readonly text: string };

/**
 * Reads the query's state into what the group renders.
 *
 * Written as a function of the state rather than as inlined conditionals so the three outcomes are
 * exhaustive by construction — a fourth query state would have to be named here before it could
 * render as whichever branch happened to come last.
 *
 * @param status - The read's state as the query cache reports it.
 * @param result - The answered `Result<SourceCatalogue>`, present once the read has answered.
 * @param error - Whatever the read threw: a `Problem` when the adapter refused it.
 * @returns The pill records, or the sentence that stands in for them.
 */
function readingOf(
  status: 'pending' | 'error' | 'success',
  result: { readonly data: SourceCatalogue } | undefined,
  error: unknown,
): StripReading {
  if (status === 'pending') {
    return { kind: 'notice', text: FRESHNESS_STRIP_TEXT.reading };
  }

  if (status === 'error' || result === undefined) {
    const message = messageOf(error);

    return {
      kind: 'notice',
      text:
        message === null
          ? FRESHNESS_STRIP_TEXT.unreadable
          : `${FRESHNESS_STRIP_TEXT.unreadable} ${message}`,
    };
  }

  const { health } = result.data;

  if (health.length === 0) {
    return { kind: 'notice', text: FRESHNESS_STRIP_TEXT.noneDeclared };
  }

  return { kind: 'pills', records: health };
}

/**
 * Draws what the read produced.
 *
 * @param reading - The pills to render, or the sentence standing in for them.
 * @returns One pill per record, or the one notice.
 */
function contentOf(reading: StripReading): ReactElement {
  if (reading.kind === 'notice') {
    return <Notice text={reading.text} />;
  }

  return (
    <>
      {reading.records.map((record) => (
        <FreshnessPill key={record.source} health={record} />
      ))}
    </>
  );
}

/** Props of {@link Notice}. */
interface NoticeProps {
  /** The sentence to show, already composed from the wording above and the service's own message. */
  readonly text: string;
}

/**
 * The one notice the strip can show in place of the pills.
 *
 * It is a `role="status"` live region with a visible caption, so a reader whose assistive technology
 * is watching the page hears that the read is in progress or that it did not happen, rather than
 * meeting an empty region. It is not a control, so it carries no focus stop and no handler, and it is
 * inline content rather than a landmark, so the top bar's structure is unchanged whichever branch
 * renders (rule B-3).
 *
 * @returns The caption, in the secondary text role.
 */
function Notice({ text }: NoticeProps): ReactElement {
  return (
    <span role="status" aria-live="polite" className={NOTICE_CLASSES}>
      {text}
    </span>
  );
}

/**
 * The message a refusal carries, or `null` when the thrown value carries none.
 *
 * The adapter throws a `Problem` rather than an `Error`, so the value is narrowed structurally
 * instead of by class: a `Problem` always carries a non-empty `message`, and a value that does not
 * yields `null` so the notice falls back to its own lead sentence rather than printing an empty one
 * or the word `undefined`. The one cast names the shape the value is then checked against, and no
 * suppression directive appears in this file (success criterion 5).
 *
 * @param error - Whatever the read threw.
 * @returns The refusal's own message, or `null`.
 */
function messageOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const candidate = error as { message?: unknown };

  return typeof candidate.message === 'string' && candidate.message !== '' ? candidate.message : null;
}
