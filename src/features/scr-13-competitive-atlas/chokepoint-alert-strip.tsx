/**
 * The chokepoint alert strip of the competitive atlas: one alert per crossing the simulated
 * market-intelligence pack records, each printing the crossing's identity, the crossing's own name,
 * the pack's own contention account and the label that marks the reading as market intelligence.
 *
 * Fixing inputs:
 * - AAP 0.14.1's S3 row requires the band's existence: stage S3 is "SCR-13 with the simulated-pack
 *   banner, competitor selector, network view, five-axis radar with separately labelled series,
 *   chokepoint table, chokepoint brief export, plus the competitor overlay and chokepoint halos on
 *   the canvas and the chokepoint alert strip".
 * - AAP 0.7's S3 stage row fixes the same element as stage content — "Atlas screen, competitor
 *   overlay and chokepoint halos on the canvas, chokepoint alert strip" — delivered with SCR-13 on
 *   `/competitive` under acceptance identifier T-21.
 * - AAP 0.10 fixes its labelling: "Each simulated element carries its own label on screen — a
 *   page-level badge does not satisfy the requirement", and the market-intelligence label is the one
 *   every competitor network, series, chokepoint row, overlay and halo carries.
 * - AAP 0.8 fixes the arithmetic boundary: the account the band prints is the pack's own contention
 *   note, read from the market-intelligence pack alone, and no first-party value is blended into it.
 *
 * The band is transport, not computation (rule P-6, AAP 0.8). Each alert prints what the record
 * already holds — the crossing's identifier, its label and the pack's contention note — and nothing
 * here sums, averages, ranks, filters, rounds or re-orders: the alerts keep the order the payload
 * supplied, and the band carries no count, no total and no overlap value of its own, because each is
 * either the table's column or a figure this module would have to compute.
 *
 * Every alert is market intelligence, and each says so on itself (rules P-1, P-5). The label is the
 * exact specification §5.3 member that `src/types/primitives.ts` owns, taken by position from the
 * fixed `SIM_LABELS` tuple and rendered through `StatusIndicator`, so it always arrives with its icon
 * and its status colour and cannot be dropped from an entry; the same device prints the chokepoint
 * table's provenance column. `Chokepoint` carries no competitor name, so the band names none — which
 * is also what rule P-5's companion tag would require of any name it did print.
 *
 * The band acts on nothing (rule P-8). It holds no button, no link and no focus stop: acting on a
 * crossing belongs to the atlas screen's own surface, and a control here would promise a function
 * this band does not have. It reads no clock, holds no state and calls nothing (rule P-2), so a
 * re-render draws the same alerts from the same payload and the screen stays the only importer of the
 * service.
 *
 * Accessibility (rule B-3). The surface, its `<h2>` and the `aria-labelledby` that names the region
 * all come from `src/components/card.tsx`, so the band is a named region rather than a stack of
 * loose text; the alerts are a real `<ul>`/`<li>` list, each entry reading as one item. Every colour
 * is a role token — no raw palette value, no opacity, no filter and no shadow — so both themes paint
 * the pairing their own measure fixes, and the label's text carries the meaning that its icon only
 * reinforces.
 *
 * Rules this module is built to satisfy:
 * - B-1: it renders from props only, names no address and sends no request. B-2: no credential field
 *   and no environment read. B-3: the named region and the semantic list above, role-token colours
 *   only, nothing focusable.
 * - P-1: the label it shows is a member of the fixed `SIM_LABELS` vocabulary, imported rather than
 *   spelled. P-2: the crossings arrive as props, and no service, seed record, app module, domain
 *   module or other feature is imported.
 * - P-3, P-4: nothing here speaks of authorisation, sovereignty, copying or resistance to either.
 * - P-5: the label on every entry, and no competitor name to leave untagged. P-6: no figure, currency
 *   literal or record-identifier literal is typed here. P-7: no name is invented. P-8: no control and
 *   no focus stop, because the band acts on nothing.
 */
import type { JSX } from 'react';

import { Card, INSET_SURFACE_CLASSES } from '../../components/card';
import { MonoValue } from '../../components/mono-value';
import { StatusIndicator } from '../../components/status-indicator';
import { SIM_LABELS } from '../../types';
import type { Chokepoint, SimLabel } from '../../types';

/**
 * The crossings the pack serves, and the wording that names the band, introduces its list and
 * states what it shows when the pack records none. The band prints one alert per crossing it is
 * handed, in the order it was handed them, and reads nothing else about them: the overlap and the
 * competitors' buffer days are the chokepoint table's columns, so a caller that narrowed or
 * re-ordered the list has decided what a reader is alerted to (AAP 0.8). Each alert is market
 * intelligence carrying the pack's own label, which is why the caller supplies no label of its own
 * (rule P-5).
 */
export interface ChokepointAlertStripProps {
  /**
   * The crossings the atlas serves, in the order the service supplied them.
   *
   * The band prints one alert per crossing in that order and changes neither the list nor a
   * crossing's position in it, so the pack's own ordering reaches the reader unchanged (AAP 0.8).
   */
  readonly chokepoints: readonly Chokepoint[];

  /**
   * The band's accessible name, rendered as the heading `Card` owns.
   *
   * Optional and defaulted here, because the calling screen names the band in its own words and the
   * default exists so a missing prop can never leave the region unnamed (rule B-3).
   */
  readonly title?: string;

  /**
   * The sentence introducing the alerts, rendered above the list.
   *
   * Optional for the same reason as {@link ChokepointAlertStripProps.title}: the calling screen
   * supplies its own wording, and the default keeps the band self-describing when it does not.
   */
  readonly description?: string;

  /**
   * The sentence shown when the pack records no crossing.
   *
   * Optional and defaulted, so an empty band states that it is empty rather than rendering a heading
   * over nothing.
   */
  readonly emptyMessage?: string;
}

/**
 * The heading the band carries when the calling screen supplies none.
 *
 * Exported so a suite names the region through the same constant the component renders rather than
 * retyping the wording — the route `chokepoint-table.tsx` takes for the column headings it owns by
 * exporting `CHOKEPOINT_COLUMNS`.
 */
export const DEFAULT_TITLE = 'Chokepoint alerts';

/**
 * What the band says it carries when the calling screen supplies no description.
 *
 * It states the three facts a reader needs before the list: there is one alert per crossing the pack
 * records, the alerts keep the pack's own order and each states the pack's own contention account,
 * and the overlap and each competitor's buffer days are the shared chokepoint table's columns rather
 * than this band's. Naming the table is rule P-5's separation in words: the figures stay where they
 * are labelled, and this band adds none of its own.
 */
export const DEFAULT_DESCRIPTION =
  'One alert per crossing the simulated pack records, in the pack\u2019s own order, each stating the pack\u2019s own contention account. The shared chokepoint table below adds the overlap and each competitor\u2019s buffer days.';

/** The sentence the band shows when the pack records no crossing to alert on. */
export const DEFAULT_EMPTY_MESSAGE = 'The pack records no crossing to alert on.';

/**
 * The market-intelligence label of specification §5.3, taken by position from the fixed list in
 * `src/types` so the exact string has one owner and is never spelled in this module (rule P-1).
 *
 * The tuple lists the seven labels in §5.3 order and the sixth is the one a market-intelligence
 * element carries; indexing at a constant index keeps the literal type.
 */
const MARKET_INTELLIGENCE_LABEL: SimLabel = SIM_LABELS[5];

/**
 * The band's description: the caption text role at the 13 px step of the type scale, wrapping inside
 * the card rather than widening it. Role tokens only, so the contrast is the ratio the theme measures
 * for that role on the card's own surface.
 */
const DESCRIPTION_CLASSES = 'min-w-0 text-13 break-words text-text-secondary';

/** The empty sentence: the same role as the description, for the same reason. */
const EMPTY_CLASSES = 'min-w-0 text-13 break-words text-text-secondary';

/**
 * The alert list: one stacked column below 1280 px and one alert per column from it.
 *
 * The gap is a 4 px grid step, which is the only spacing scale the token tables fix.
 */
const ALERT_LIST_CLASSES = 'flex min-w-0 flex-col gap-2 xl:flex-row xl:items-stretch';

/**
 * One alert: the inset box `src/components/card.tsx` names as the third surface role, in the body
 * type step. The box itself — card radius, decorative hairline, second raised surface and its one
 * padding — is `INSET_SURFACE_CLASSES`, so every alert in the band and every notice elsewhere in the
 * product wear one surface; the stacking, the type step and the equal share are this strip's own.
 *
 * The equal-share utilities are scoped to the row layout on purpose. In a column flex container
 * `flex-grow` would divide the *height* between the alerts and squeeze a longer note into a shorter
 * box, so each alert keeps its own height while the band is stacked and shares the row equally from
 * 1280 px, where `min-w-0` is what lets the note wrap instead of pushing its neighbours aside.
 */
const ALERT_CLASSES = `flex min-w-0 flex-col gap-1 text-13 xl:flex-1 xl:basis-0 ${INSET_SURFACE_CLASSES}`;

/** An alert's first line: the crossing's identity, its name and its label, wrapping as one phrase. */
const ALERT_HEADING_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2 text-text-primary';

/** The crossing's own name, which wraps inside the alert instead of overflowing it. */
const ALERT_LABEL_CLASSES = 'min-w-0 break-words';

/**
 * The pack's contention account: the secondary text role, wrapping rather than overflowing, so a
 * long note stays on its alert and no part of it is truncated (rule P-6).
 */
const ALERT_NOTE_CLASSES = 'min-w-0 break-words text-text-secondary';

/**
 * Renders the atlas's chokepoint alert strip.
 *
 * The band is presentational by contract: it takes the crossings the service served and prints one
 * alert per crossing, in the order they arrived, each carrying the pack's own contention account and
 * the market-intelligence label. It reads no clock, holds no state and calls nothing, and it adds no
 * control and no focus stop, so it acts on nothing and promises nothing (rule P-8).
 *
 * The heading is always rendered, from the caller's wording or from {@link DEFAULT_TITLE}, and a pack
 * with no crossing to list shows the caller's sentence or {@link DEFAULT_EMPTY_MESSAGE} in place of
 * the list rather than a heading over nothing.
 *
 * @param props - The crossings and the band's wording. See {@link ChokepointAlertStripProps}.
 * @returns The named surface holding the description and one alert per crossing.
 */
export function ChokepointAlertStrip({
  chokepoints,
  title,
  description,
  emptyMessage,
}: ChokepointAlertStripProps): JSX.Element {
  return (
    <Card title={title ?? DEFAULT_TITLE}>
      <p className={DESCRIPTION_CLASSES}>{description ?? DEFAULT_DESCRIPTION}</p>
      {chokepoints.length === 0 ? (
        <p className={EMPTY_CLASSES}>{emptyMessage ?? DEFAULT_EMPTY_MESSAGE}</p>
      ) : (
        <ul className={ALERT_LIST_CLASSES}>
          {chokepoints.map((chokepoint) => (
            <li key={chokepoint.id} className={ALERT_CLASSES}>
              <div className={ALERT_HEADING_CLASSES}>
                <MonoValue value={chokepoint.id} kind="id" />
                <span className={ALERT_LABEL_CLASSES}>{chokepoint.label}</span>
                <StatusIndicator meaning="simulated" label={MARKET_INTELLIGENCE_LABEL} />
              </div>
              <p className={ALERT_NOTE_CLASSES}>{chokepoint.contentionNote}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
