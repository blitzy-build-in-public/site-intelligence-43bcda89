/**
 * Component suite for `chokepoint-alert-strip.tsx`, the chokepoint alert strip of stage S3.
 *
 * WHY THIS FILE EXISTS. AAP 0.14.1's S3 row and AAP 0.7's S3 stage row require the chokepoint alert
 * strip on the competitive atlas, and AAP 0.15.2 ("Testing") places a colocated component suite beside
 * the module it covers. The route-level assertions belong to `e2e/s3-atlas.spec.ts`, so the cases
 * below carry plain behaviour titles rather than a `T-nn` identifier: duplicating a browser identifier
 * here would misreport what is covered where.
 *
 * WHAT IS UNDER TEST. The band is presentational and holds no control, so each case asserts one
 * clause of its contract rather than its markup:
 *
 * 1. One alert per crossing the props carry, in the props' order: no crossing is dropped, none is
 *    re-ordered and none is invented (AAP 0.8).
 * 2. Each alert prints its own crossing's label and the exact market-intelligence label, imported
 *    from `SIM_LABELS` rather than retyped (rule P-1, rule P-5).
 * 3. The band holds no button, no link and no focus stop at all, because it acts on nothing
 *    (rule P-8).
 * 4. A pack with no crossing prints the empty sentence and no list at all.
 * 5. A long contention note is printed verbatim and carries the wrapping utility that keeps it on its
 *    alert rather than overflowing it (rule P-6).
 * 6. A caller's own heading, description and empty sentence replace the band's defaults, so the
 *    fallbacks exist only for a caller that supplies none.
 *
 * THE FIXTURE IS INPUT, NOT AN EXPECTED RESULT (rule P-6). Every record below is a plain placeholder
 * handed to the component as a prop: no seed record is imported, no case recomputes a figure, no case
 * types a currency amount, and no identifier carries a record's shape (`crossing-one`, `crossing-two`
 * and `crossing-three` are this suite's own). The two figures `Chokepoint` requires and this band
 * never prints — the overlap and the buffer days — are placeholders nothing here asserts.
 *
 * Rules this suite is written to hold to:
 * - B-1, B-2: the component renders from props, so no case stubs a request, a credential or an
 *   environment value; nothing here reaches the services layer at all.
 * - B-3: the region is found by its accessible name and the alerts by their list role, so a surface
 *   that lost either name fails the case rather than passing on a text match.
 * - P-1: the label is read from `SIM_LABELS` and asserted inside the alert that carries it, never
 *   against a page-level badge.
 * - P-2: the component takes its crossings as props; this suite imports no seed, service, adapter or
 *   sibling feature.
 * - P-5: every alert is asserted to carry the market-intelligence label exactly once, and the band
 *   names no competitor at all.
 * - P-7: every name here is plainly synthetic, and no real vendor, customer, carmaker or cloud
 *   product name appears.
 * - P-8: the absence of every control and focus stop is the point of case 3.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock or touches the network.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SIM_LABELS } from '../../types';
import type { Chokepoint } from '../../types';
import {
  ChokepointAlertStrip,
  DEFAULT_DESCRIPTION,
  DEFAULT_EMPTY_MESSAGE,
  DEFAULT_TITLE,
} from './chokepoint-alert-strip';

/* ---------------------------------------------------------------------------------------------
 * The records, and the two figures the band never prints
 * ------------------------------------------------------------------------------------------- */

/**
 * `Chokepoint` requires an overlap and a competitor buffer-day map, and this band prints neither: the
 * chokepoint table owns those columns. The two values below are therefore placeholders that no case
 * asserts, and they are held as constants so no case reads as though it were checking a figure.
 */
const OVERLAP_THE_BAND_NEVER_PRINTS = 1;
const BUFFER_DAYS_THE_BAND_NEVER_PRINTS = 1;

/**
 * Builds one crossing from the members a case asserts, with the two unprinted figures filled in.
 *
 * @param id The crossing's identifier, as the payload would spell it.
 * @param label The crossing's own name.
 * @param note The pack's contention account at the crossing.
 * @returns The record.
 */
function crossing(id: string, label: string, note: string): Chokepoint {
  return {
    id,
    label,
    overlap: OVERLAP_THE_BAND_NEVER_PRINTS,
    competitorBufferDays: { 'competitor-one': BUFFER_DAYS_THE_BAND_NEVER_PRINTS },
    contentionNote: note,
    provenance: 'market_intelligence',
  };
}

/** The three crossings this suite renders, in an order that is neither alphabetical nor by identifier. */
const CROSSINGS: readonly Chokepoint[] = [
  crossing('crossing-three', 'Crossing three', 'The note the pack states for the third crossing.'),
  crossing('crossing-one', 'Crossing one', 'The note the pack states for the first crossing.'),
  crossing('crossing-two', 'Crossing two', 'The note the pack states for the second crossing.'),
];

/**
 * A contention note far longer than one alert can show on a single line, built by repeating one
 * sentence rather than typed in full. A band that truncated, ellipsised or clamped the note fails the
 * case below, and a band that let it overflow is caught by the wrapping utility the case asserts.
 */
const LONG_NOTE = Array.from(
  { length: 12 },
  () => 'The pack states the contention at this crossing in full.',
).join(' ');

/* ---------------------------------------------------------------------------------------------
 * Readings and the harness
 * ------------------------------------------------------------------------------------------- */

/**
 * The item at a position, or a failure naming what was missing.
 *
 * `noUncheckedIndexedAccess` makes every indexed read a possible absence, and a case that reached for
 * a missing alert would otherwise compare against `undefined` and report the wrong thing.
 */
function at<T>(items: readonly T[], index: number, what: string): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`the ${what} at position ${String(index)} is missing`);
  }

  return item;
}

/** Collapses a string's runs of whitespace, so an alert of several elements compares as one line. */
function collapse(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

/** Every string an element's subtree holds, with its whitespace collapsed. */
function collapsedTextOf(element: HTMLElement): string {
  return collapse(element.textContent ?? '');
}

/**
 * The selector matching every element a keyboard or a pointer can reach.
 *
 * The band must hold none of them (rule P-8): it acts on nothing, so no focus stop of its own can be
 * justified, and a `tabindex` on a non-interactive element would add one all the same.
 */
const FOCUSABLE_SELECTOR =
  'a, button, input, select, textarea, summary, [tabindex], [contenteditable="true"]';

/**
 * Renders the band with the three crossings, which is the payload every case except the empty one
 * starts from.
 *
 * @returns The rendered container, so a case can read the whole subtree.
 */
function renderBand() {
  return render(<ChokepointAlertStrip chokepoints={CROSSINGS} />);
}

/** The band itself, located by the heading it renders, so a lost name fails the case. */
function band(): HTMLElement {
  return screen.getByRole('region', { name: DEFAULT_TITLE });
}

/** The alerts the band lists, in document order. */
function alerts(): readonly HTMLElement[] {
  return within(band()).getAllByRole('listitem');
}

describe('ChokepointAlertStrip', () => {
  it('prints one alert per crossing the props carry, in the order they were supplied', () => {
    renderBand();

    const listed = alerts();

    /* No crossing is dropped and none is invented. */
    expect(listed).toHaveLength(CROSSINGS.length);

    /* Each alert is the alert for the crossing in that position: a band that sorted the crossings, or
       that paired an identifier with another crossing's note, fails here (AAP 0.8). */
    CROSSINGS.forEach((entry, index) => {
      const alert = at(listed, index, 'alert');

      expect(within(alert).getByText(entry.id)).toBeInTheDocument();
      expect(within(alert).getByText(entry.label)).toBeInTheDocument();
      expect(within(alert).getByText(entry.contentionNote)).toBeInTheDocument();
    });

    /* The description comes before the alerts, so a reader is told what the band carries before the
       first one: the contrast is drawn from the supplied description, never from a typed sentence. */
    const text = collapsedTextOf(band());
    const firstCrossing = at(CROSSINGS, 0, 'crossing');

    expect(text).toContain(DEFAULT_DESCRIPTION);
    expect(text.indexOf(DEFAULT_DESCRIPTION)).toBeLessThan(text.indexOf(firstCrossing.id));
  });

  it('prints each crossing’s own label beside the exact market-intelligence label', () => {
    renderBand();

    const listed = alerts();

    CROSSINGS.forEach((entry, index) => {
      const alert = at(listed, index, 'alert');

      /* The label is the fixed §5.3 string the types layer owns, taken from the tuple rather than
         retyped here, and it appears on the alert exactly once (rule P-1, rule P-5). */
      expect(within(alert).getAllByText(SIM_LABELS[5])).toHaveLength(1);

      /* The crossing's own name is on the alert it belongs to, so an alert never prints a label the
         payload did not give it, and the band names no competitor to leave untagged. */
      expect(within(alert).getByText(entry.label)).toBeInTheDocument();
    });
  });

  it('holds no control and adds no focus stop, because the band acts on nothing', () => {
    renderBand();

    expect(within(band()).queryByRole('button')).toBeNull();
    expect(within(band()).queryByRole('link')).toBeNull();
    expect(within(band()).queryByRole('textbox')).toBeNull();
    expect([...band().querySelectorAll(FOCUSABLE_SELECTOR)]).toStrictEqual([]);

    /* And no alert is one either: a control would have to sit inside the list to be reachable. */
    for (const alert of alerts()) {
      expect([...alert.querySelectorAll('a, button, [tabindex]')]).toStrictEqual([]);
    }
  });

  it('prints the empty sentence and no list at all when the pack records no crossing', () => {
    render(<ChokepointAlertStrip chokepoints={[]} />);

    const emptyBand = band();

    expect(within(emptyBand).getByText(DEFAULT_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(within(emptyBand).queryByRole('list')).toBeNull();
    expect(within(emptyBand).queryByRole('listitem')).toBeNull();

    /* The band is still named and still describes itself: an empty pack is a reading, not a blank. */
    expect(within(emptyBand).getByText(DEFAULT_DESCRIPTION)).toBeInTheDocument();
  });

  it('prints a long contention note in full, in the role that wraps rather than overflows', () => {
    const verbose: Chokepoint = crossing('crossing-verbose', 'Crossing verbose', LONG_NOTE);

    render(<ChokepointAlertStrip chokepoints={[verbose]} />);

    const alert = at(alerts(), 0, 'alert');
    const note = within(alert).getByText(LONG_NOTE);

    /* Verbatim: not truncated, not ellipsised, not clamped (rule P-6). */
    expect(note.textContent).toBe(LONG_NOTE);

    /* And the note carries the wrapping utility and the width floor that let it break inside the alert
       instead of widening it. jsdom lays nothing out, so the class is what this case can observe. */
    expect(note.className).toContain('break-words');
    expect(note.className).toContain('min-w-0');
  });

  it('carries the caller’s own heading, description and empty sentence when it is given them', () => {
    const wording = {
      title: 'Alerts for this pack',
      description: 'What this band carries.',
      emptyMessage: 'Nothing to alert on in this pack.',
    };

    render(
      <ChokepointAlertStrip
        chokepoints={[]}
        title={wording.title}
        description={wording.description}
        emptyMessage={wording.emptyMessage}
      />,
    );

    const named = screen.getByRole('region', { name: wording.title });

    expect(screen.queryByRole('region', { name: DEFAULT_TITLE })).toBeNull();
    expect(within(named).getByText(wording.description)).toBeInTheDocument();
    expect(within(named).getByText(wording.emptyMessage)).toBeInTheDocument();
    expect(within(named).queryByText(DEFAULT_EMPTY_MESSAGE)).toBeNull();
  });
});
