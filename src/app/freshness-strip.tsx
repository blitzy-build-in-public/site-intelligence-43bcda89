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
 * - It takes no focus stop and answers no pointer. A source's state has nothing to operate, so the
 *   strip is a `role="group"` of indicators rather than a row of controls, and rule P-8's
 *   "works or is visibly disabled with its reason" never applies to it (rule B-3 keeps the group
 *   readable by keyboard because it is in the reading order, not because it is focusable).
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
 */
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';

import { FreshnessPill } from '../components/freshness-pill';
import { useService } from '../services/service-provider';
import type { SourceCatalogue } from '../types/sources';

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
 * @returns The group holding the pills, or the notice that stands in for them.
 */
export function FreshnessStrip(): ReactElement {
  const service = useService();

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

  return (
    <div
      role="group"
      aria-label={FRESHNESS_STRIP_TEXT.group}
      aria-busy={isReading}
      className={STRIP_CLASSES}
    >
      {contentOf(catalogue.status, catalogue.data, catalogue.error)}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * What the group holds, one branch per read outcome
 * ------------------------------------------------------------------------------------------- */

/**
 * Chooses what the group renders for the read's state.
 *
 * Written as a function of the state rather than as inlined conditionals so the three outcomes are
 * exhaustive by construction — a fourth query state would have to be named here before it could
 * render as whichever branch happened to come last.
 *
 * @param status - The read's state as the query cache reports it.
 * @param result - The answered `Result<SourceCatalogue>`, present once the read has answered.
 * @param error - Whatever the read threw: a `Problem` when the adapter refused it.
 * @returns The pills, or the notice standing in for them.
 */
function contentOf(
  status: 'pending' | 'error' | 'success',
  result: { readonly data: SourceCatalogue } | undefined,
  error: unknown,
): ReactElement {
  if (status === 'pending') {
    return <Notice text={FRESHNESS_STRIP_TEXT.reading} />;
  }

  if (status === 'error' || result === undefined) {
    const message = messageOf(error);

    return (
      <Notice
        text={
          message === null
            ? FRESHNESS_STRIP_TEXT.unreadable
            : `${FRESHNESS_STRIP_TEXT.unreadable} ${message}`
        }
      />
    );
  }

  const { health } = result.data;

  if (health.length === 0) {
    return <Notice text={FRESHNESS_STRIP_TEXT.noneDeclared} />;
  }

  return (
    <>
      {health.map((record) => (
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
