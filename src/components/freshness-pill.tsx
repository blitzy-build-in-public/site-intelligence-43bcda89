/**
 * One modelled data source's freshness, as the compact pill the top bar renders six of.
 *
 * The pill states three things and nothing else: which source the record describes, how current its
 * last answer is, and the instant it answered. That is the whole of `SourceHealth` (`src/types/sources.ts`),
 * which the service supplies — this module reads the record and never resolves a source's name for
 * itself, never imports seed data and never contacts anything. The six sources are modelled, never
 * connected (rule B-1), so a pill reports what the adapter last read and implies no connector behind
 * it: it carries no endpoint, no connection state and no address, because none exists (rule B-2).
 *
 * The state is shown three ways at once — the meaning's icon, its status colour and the state's own
 * word as the label beside them — so the meaning never rests on colour alone (rule B-3). The word
 * the record carries is the encoded status: it is `StatusIndicator`'s label, so the icon, the status
 * colour and the word all describe the same reading, and the source's name next to it remains an
 * identity the state is reported about. The icon comes from `StatusIndicator`, which owns the shared
 * vocabulary of status meanings, the colour utilities and the bundled Phosphor components; the pill
 * composes that primitive instead of drawing a second indicator, so a source's state reads the same
 * in a pill, a table cell and the stale banner.
 *
 * {@link freshnessMeaning} is the single mapping from a source's state onto that vocabulary.
 * `src/components/state-boundary.tsx` raises its stale banner from the same record and
 * `src/app/freshness-strip.tsx` renders these pills, so both consume this function rather than
 * deriving a second opinion about what `stale` looks like: the banner and this pill have to agree on
 * the same source, the same state and the same instant (AAP §0.2.1, T-13).
 *
 * No figure is computed here (rule P-6). The pill prints the record's `asOf` instant as the record
 * states it, through the one presentation formatter, and prints no relative age, because an age
 * would be arithmetic against the demonstration clock and this is the component layer. A caller
 * that has already derived an age from `asOf` in `src/domain/aggregation` may pass it as `ageLabel`;
 * nothing here measures one, and nothing here reads the clock.
 *
 * Freshness is a statement about data currency and about nothing else (rule P-4): the pill says
 * nothing about where a source runs, whether its traffic is confined, whether a record could be
 * altered or whether anything was verified. The pill is also not a simulation label: `Simulated
 * data` is the shell's badge on every route (rule P-1), and this component carries no label string
 * of its own.
 *
 * Colour and wording come from the record and from the role tokens. The pill is a container rather
 * than a control, so it takes the second raised surface and the decorative hairline, as the card
 * primitive does, and leaves the control-boundary role to the controls. The token layer exposes no
 * elevation utility, so nothing here can add one. The pill is inline content and not interactive: it
 * adds no focus stop, no `tabIndex` and no handler, because a source's state has nothing to operate.
 */
import type { ReactElement } from 'react';

import type { FreshnessState, SourceHealth } from '../types';
import { MonoValue } from './mono-value';
import { StatusIndicator } from './status-indicator';
import type { StatusMeaning } from './status-indicator';

/**
 * What one source's state amounts to in the shared status vocabulary.
 *
 * The `switch` is exhaustive over `FreshnessState` and deliberately carries no `default` branch: a
 * fifth state added to that union makes this function fail to type-check rather than silently
 * rendering as whichever arm happened to be last, which is the reminder that a new state needs a
 * decided meaning, an icon and a colour before it can be shown.
 *
 * The mapping, member by member:
 * - `fresh` → `pass`: the source answered and its answer is current.
 * - `stale` → `warning`: the source answered, and what it answered has aged. The state that gates
 *   `requestApproval` and `decideApproval`, which is why it is a warning rather than a failure — the
 *   data exists and is readable, it is simply not current.
 * - `partial` → `review`: the source answered incompletely, so the reading derived from it is one to
 *   inspect, and the missing inputs are shown beside the figure. It takes the review meaning and so
 *   the eye and the review hue rather than the warning triangle: an incomplete answer is a reading a
 *   reader must weigh, which is a different thing to report than aged data, so a partially-answered
 *   source and a stale one are told apart by icon as well as by colour rather than by neither. It is
 *   degraded, not absent.
 * - `unavailable` → `fail`: the source did not answer at all, so nothing derived from it can be
 *   trusted as a reading of the present.
 */
export function freshnessMeaning(state: FreshnessState): StatusMeaning {
  switch (state) {
    case 'fresh':
      return 'pass';
    case 'stale':
      return 'warning';
    case 'partial':
      return 'review';
    case 'unavailable':
      return 'fail';
  }
}

/**
 * The class lists the pill applies, held here so the wording has one owner and no caller retypes a
 * utility list.
 *
 * `base` is the pill itself: an inline container with the control radius, the second raised surface
 * and the decorative hairline, at the smallest step of the type scale, so six of them sit in one row
 * of the top bar without competing with the controls beside them. `detail` is the role the source's
 * name and the instant both take — the secondary text role, whose contrast against the second raised
 * surface is the ratio the specification's token tables measured, so it is not recomputed here. It
 * is never the role the state takes: a state is a status, and a status is painted by
 * `StatusIndicator` in its meaning's own colour rather than as plain secondary text (rule B-3).
 */
const PILL_CLASSES = {
  base: 'inline-flex min-w-0 items-center gap-2 rounded-control border border-hairline bg-surface-2 px-2 py-1 text-12',
  detail: 'text-text-secondary',
} as const;

/**
 * What the top bar's strip hands {@link FreshnessPill}: one modelled source's `SourceHealth`,
 * taken whole, so a state can never be printed beside another source's instant. A caller that has
 * an age passes one already derived from that same record in `src/domain/aggregation`; the pill
 * measures nothing itself (AAP §0.2.1).
 */
export interface FreshnessPillProps {
  /**
   * The source's record as the service supplied it: its identity, the name to print, how current its
   * answer is, and when it answered.
   *
   * Required, and taken whole rather than as four loose fields, so a pill cannot be handed a state
   * from one source and an instant from another.
   */
  readonly health: SourceHealth;
  /**
   * An age already derived from `health.asOf` by `src/domain/aggregation`, for the caller that has
   * computed one.
   *
   * Absent, nothing is printed for it and the pill shows the instant alone. This component derives
   * no age of its own: an age is a figure, and no figure is computed in the component layer
   * (rule P-6). An empty string is treated as absent, so a caller passing a value it could not
   * compute adds no empty gap to the row.
   */
  readonly ageLabel?: string | undefined;
  /** Layout-only additions from the calling strip. Never a colour, a surface or a size. */
  readonly className?: string | undefined;
}

/**
 * Renders one source's freshness.
 *
 * The root is a `<span>`: the pill sits inside the top bar's freshness row and must not introduce a
 * block-level box, a list item, a heading or a landmark. The reading order is the source, its state
 * and the instant it answered. The source's name is identity, so it is plain secondary text; the
 * state is the status the pill actually reports, so it is the visible text of `StatusIndicator` and
 * therefore that status's accessible name, with the meaning's icon beside it hidden from assistive
 * technology. The icon and the status colour thus attach to the word that states a status rather
 * than to the name of the source they describe, a reader hears "the source, its state, the instant",
 * and the state is read from its own token, which is the record's value rather than a phrase spelled
 * here.
 *
 * The instant goes through `MonoValue` with `kind="timestamp"`, which renders it in the tabular mono
 * face the token layer fixes for timestamps and passes the record's string through unformatted, so
 * the value on screen is the value the adapter returned.
 */
export function FreshnessPill({ health, ageLabel, className }: FreshnessPillProps): ReactElement {
  const hasAge = ageLabel !== undefined && ageLabel !== '';

  return (
    <span className={joinClassNames(PILL_CLASSES.base, className)}>
      <span className={PILL_CLASSES.detail}>{health.label}</span>
      <StatusIndicator meaning={freshnessMeaning(health.state)} label={health.state} />
      <MonoValue value={health.asOf} kind="timestamp" className={PILL_CLASSES.detail} />
      {hasAge ? <span className={PILL_CLASSES.detail}>{ageLabel}</span> : null}
    </span>
  );
}

/**
 * Concatenates the class names that are present, so an omitted `className` leaves no trailing space
 * and no empty entry behind.
 */
function joinClassNames(...values: readonly (string | undefined)[]): string {
  return values.filter((value) => value !== undefined && value !== '').join(' ');
}
