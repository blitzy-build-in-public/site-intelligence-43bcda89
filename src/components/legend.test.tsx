/**
 * Component suite for `legend.tsx`: the series legend a chart, a map or the competitive atlas draws
 * beneath itself, and the place rule P-5's provenance boundary becomes visible (AAP §0.14.1 lists
 * `legend.tsx` as the S3 surface rule P-5 governs; AAP §0.10 fixes the companion tags it prints).
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS RELIED ON. One row per entry, in the order the caller gave
 * them, because the caller hands the entries in the order it drew its series and a reordered legend
 * would name the wrong colour. Every swatch is `aria-hidden`, so the meaning reaches a reader through
 * the label text beside it and never through colour alone (rule B-3). A status row prints the caller's
 * label and nothing else; a competitor row prints that label, the imported `COMPETITOR_NAME_TAG` and
 * its own `simLabel`; the client's own series prints `CLIENT_SELF_ASSESSMENT_LABEL` and no second label
 * — the row's whole text is asserted, so a tag that went missing, appeared twice, or arrived beside a
 * second §5.3 label fails rather than passing on a `getByText` that finds one of them. Both tags are
 * read from `src/types`, the module that owns their wording, and never typed here (rule P-1). Each
 * swatch's colour is compared against the class the shared tone table `CHART_TONE_CLASSES` resolves for
 * that entry — the status meaning's role, the competitor slot its index selects, the accent role for
 * the client's series — rather than against a hand-typed class, so the table stays the one owner of a
 * chart colour and a legend row cannot disagree with the mark it describes.
 *
 * WHAT THE LEGEND MUST NOT BECOME. It carries no focus stop and no interactive element, because it
 * describes what a chart is already showing and operates nothing (rule P-8: a control that acts is
 * somewhere else, and a legend row would be a control that does not). An empty list renders nothing at
 * all rather than an empty landmark. Nothing is formatted, counted or totalled — the case below asserts
 * that no digit and no currency marker appears in the rendered text, which is the shape a legend would
 * take if it summarised instead of describing, and the direction rule P-5 forbids outright when the
 * series it would add up come from different provenances (rule P-6 also bars a typed figure, and none
 * is typed here).
 *
 * THE FIXTURES ARE THE COMPONENT'S OWN VOCABULARY: a status meaning from `StatusMeaning`, a competitor
 * slot from the entry union, and the fixed labels from `src/types`. No record, amount, date or
 * identifier is invented, and no service is needed: the legend reads no port member, which is why this
 * suite binds none (rule P-2 is satisfied by the component having no data boundary at all).
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite proves the list's semantics rather than auditing them.
 */
import { render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { CLIENT_SELF_ASSESSMENT_LABEL, COMPETITOR_NAME_TAG, SIM_LABELS } from '../types';
import { Legend } from './legend';
import type { LegendEntry } from './legend';
import { CHART_TONE_CLASSES } from './horizontal-bar-chart';
import type { StatusMeaning } from './status-indicator';

/* ---------------------------------------------------------------------------------------------
 * The fixtures — the component's own vocabulary, and no product wording typed here
 * ------------------------------------------------------------------------------------------- */

/** The caller's label for the status series, which the row must print verbatim. */
const STATUS_LABEL = 'a status series';

/** The caller's label for the competitor series. */
const COMPETITOR_LABEL = 'a competitor series';

/** The caller's label for the client's own series. */
const CLIENT_LABEL = 'the client series';

/** The status meaning one row carries: the tone vocabulary's own member. */
const STATUS_MEANING: StatusMeaning = 'warning';

/** The competitor slot the fixture row takes, which selects its competitor role colour. */
const COMPETITOR_SLOT = 2;

/** The market-intelligence label a competitor series cannot be described without (rule P-1). */
const MARKET_LABEL = SIM_LABELS[5];

/** Every status meaning the tone table can resolve, one case per colour. */
const STATUS_MEANINGS: readonly StatusMeaning[] = [
  'pass',
  'fail',
  'warning',
  'review',
  'empty',
  'simulated',
];

/** Every competitor slot the entry union admits, one case per role colour. */
const COMPETITOR_SLOTS: readonly (1 | 2 | 3)[] = [1, 2, 3];

/** One status series, described the way a chart describes it. */
const STATUS_ENTRY: LegendEntry = {
  kind: 'status',
  id: 'status-row-under-test',
  label: STATUS_LABEL,
  meaning: STATUS_MEANING,
};

/** One competitor series: market intelligence, so the label is part of the entry's type. */
const COMPETITOR_ENTRY: LegendEntry = {
  kind: 'competitor',
  id: 'competitor-row-under-test',
  label: COMPETITOR_LABEL,
  index: COMPETITOR_SLOT,
  simLabel: MARKET_LABEL,
};

/** The client's own series: first-party, so it carries the companion tag and no §5.3 label. */
const CLIENT_ENTRY: LegendEntry = {
  kind: 'client-series',
  id: 'client-row-under-test',
  label: CLIENT_LABEL,
};

/* ---------------------------------------------------------------------------------------------
 * The helpers every case renders through
 * ------------------------------------------------------------------------------------------- */

/** Renders one legend over the entries a case names. */
function renderLegend(entries: readonly LegendEntry[]): HTMLElement {
  const { container } = render(<Legend entries={entries} />);

  const list = container.firstChild;

  if (!(list instanceof HTMLElement)) {
    throw new Error('The legend rendered no list.');
  }

  return list;
}

/** The list's rows, in the order the legend renders them. */
function rows(): readonly HTMLElement[] {
  return within(screen.getByRole('list')).getAllByRole('listitem');
}

/** One member of a list a case indexes, with the miss reported rather than surfacing as `undefined`. */
function atIndex<Item>(items: readonly Item[], index: number): Item {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`The legend rendered nothing at position ${index}.`);
  }

  return item;
}

/**
 * The decorative swatch of one row: the element the row hides from assistive technology.
 *
 * Read by that attribute rather than by position, because it is the attribute whose effect the suite
 * asserts — a swatch that stopped being hidden would be found by no query here and the case would say
 * so.
 */
function swatchOf(row: HTMLElement): HTMLElement {
  const swatch = row.querySelector('span[aria-hidden="true"]');

  if (!(swatch instanceof HTMLElement)) {
    throw new Error('The row rendered no swatch hidden from assistive technology.');
  }

  return swatch;
}

/* ---------------------------------------------------------------------------------------------
 * One row per series, in the caller's order
 * ------------------------------------------------------------------------------------------- */

describe('Legend — the rows', () => {
  it('renders one row per entry, in the order the caller gave them', () => {
    renderLegend([STATUS_ENTRY, COMPETITOR_ENTRY, CLIENT_ENTRY]);

    const rendered = rows();

    expect(rendered).toHaveLength(3);
    expect(atIndex(rendered, 0).textContent).toBe(STATUS_LABEL);
    expect(atIndex(rendered, 1).textContent).toContain(COMPETITOR_LABEL);
    expect(atIndex(rendered, 2).textContent).toContain(CLIENT_LABEL);
  });

  it('hides every swatch from assistive technology so the label carries the meaning', () => {
    renderLegend([STATUS_ENTRY, COMPETITOR_ENTRY, CLIENT_ENTRY]);

    for (const row of rows()) {
      expect(swatchOf(row)).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it("prints the caller's label alone for a status series", () => {
    renderLegend([STATUS_ENTRY]);

    expect(atIndex(rows(), 0).textContent).toBe(STATUS_LABEL);
  });

  it("prints the competitor tag and the entry's own market-intelligence label", () => {
    renderLegend([COMPETITOR_ENTRY]);

    expect(atIndex(rows(), 0).textContent).toBe(
      `${COMPETITOR_LABEL} ${COMPETITOR_NAME_TAG} ${MARKET_LABEL}`,
    );
  });

  it('prints the client self-assessment tag and no second label on the client series', () => {
    renderLegend([CLIENT_ENTRY]);

    expect(atIndex(rows(), 0).textContent).toBe(`${CLIENT_LABEL} ${CLIENT_SELF_ASSESSMENT_LABEL}`);
  });

  it('renders nothing at all when the caller describes no series', () => {
    const { container } = render(<Legend entries={[]} />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });
});

/* ---------------------------------------------------------------------------------------------
 * Every colour resolved from the one tone table
 * ------------------------------------------------------------------------------------------- */

describe('Legend — the role colour of a swatch', () => {
  it.each(STATUS_MEANINGS)(
    'gives the %s status series the role class its meaning maps to',
    (meaning) => {
      renderLegend([{ kind: 'status', id: 'status-row-under-test', label: STATUS_LABEL, meaning }]);

      expect(swatchOf(atIndex(rows(), 0))).toHaveClass(CHART_TONE_CLASSES[meaning].swatch);
    },
  );

  it.each(COMPETITOR_SLOTS)(
    'gives a competitor series in slot %s the role class that slot maps to',
    (index) => {
      renderLegend([{ ...COMPETITOR_ENTRY, index }]);

      expect(swatchOf(atIndex(rows(), 0))).toHaveClass(
        CHART_TONE_CLASSES[`competitor-${index}`].swatch,
      );
    },
  );

  it("gives the client's own series the accent role", () => {
    renderLegend([CLIENT_ENTRY]);

    expect(swatchOf(atIndex(rows(), 0))).toHaveClass(CHART_TONE_CLASSES.accent.swatch);
  });
});

/* ---------------------------------------------------------------------------------------------
 * What a legend must never become — rules P-5, P-6, P-8
 * ------------------------------------------------------------------------------------------- */

describe('Legend — a description and nothing else', () => {
  it('carries no focusable element and no interactive role', () => {
    renderLegend([STATUS_ENTRY, COMPETITOR_ENTRY, CLIENT_ENTRY]);

    const list = screen.getByRole('list');

    expect(list.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')).toHaveLength(
      0,
    );
    expect(within(list).queryAllByRole('button')).toHaveLength(0);
    expect(within(list).queryAllByRole('link')).toHaveLength(0);
    expect(within(list).queryAllByRole('checkbox')).toHaveLength(0);
    expect(within(list).queryAllByRole('switch')).toHaveLength(0);
  });

  it('formats and totals nothing: no figure and no currency marker reaches the reader', () => {
    renderLegend([STATUS_ENTRY, COMPETITOR_ENTRY, CLIENT_ENTRY]);

    const rendered = screen.getByRole('list').textContent ?? '';

    expect(rendered).not.toMatch(/[0-9]/);
    expect(rendered).not.toMatch(/[€$£]/);
    expect(rendered).not.toMatch(/\bEUR\b/);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The list's own semantics
 * ------------------------------------------------------------------------------------------- */

describe('Legend — the list', () => {
  it('is a list of peers, and the caller class list lands on it', () => {
    const classifier: ReactElement = <Legend entries={[STATUS_ENTRY]} className="ms-under-test" />;

    render(classifier);

    const list = screen.getByRole('list');

    expect(list.tagName).toBe('UL');
    expect(list).toHaveClass('ms-under-test');
  });
});
