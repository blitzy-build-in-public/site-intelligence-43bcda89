/**
 * Component suite for `src/components/freshness-pill.tsx`: one modelled source's freshness, as the
 * compact pill the top bar renders six of, and the one mapping from a source's state onto the shared
 * status vocabulary (AAP §0.2.1; the pill is the visible half of the freshness rule T-13 proves in the
 * browser).
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP.
 * - `freshnessMeaning` maps every member of `FreshnessState` onto the meaning the module documents —
 *   `fresh` to pass, `stale` to warning, `partial` to review, `unavailable` to fail — one case per
 *   member.
 *   The list of members is typed against the union with an exhaustiveness assertion, so a fifth state
 *   added to the contracts fails the type check here rather than leaving a state no case ever renders.
 * - The state is shown three ways at once (rule B-3): the meaning's icon, the meaning's status colour
 *   role from `MEANING_COLOUR_CLASSES`, and the record's own state word as visible text. The colour is
 *   read from the table that owns it rather than retyped, so a restyle flows from there into this case.
 * - The pill prints the record's own name and its `asOf` instant exactly as the record states it — the
 *   instant passes through the presentation formatter unformatted, in the tabular mono face — and never
 *   resolves a source name of its own. The label below comes from `SOURCE_LABELS`, the map the adapter
 *   fills the record from.
 * - An age is printed only when the caller supplies one, because an age is a figure and no figure is
 *   computed in this layer (rule P-6). An absent age and an empty string both leave nothing behind.
 * - A state outside the union invents no mapping: the switch is exhaustive over the contracts' four
 *   members and deliberately carries no `default`, so the function answers nothing at all for a value
 *   it was never given. The case asserts that absence rather than a fabricated fallback.
 * - The pill is inline content and not interactive: a `<span>`, no focus stop, no heading, no landmark
 *   and no control, because a source's state has nothing to operate.
 *
 * NO FIGURE AND NO RECORD IDENTIFIER IS TYPED (rule P-6): each state word is the contracts' own
 * vocabulary, the source name is read from `SOURCE_LABELS`, and the instant is derived from
 * `DEMO_CLOCK`. No service is bound, because the pill reads nothing: the record arrives as a prop.
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite proves the mapping and the labelling rather than auditing them.
 */
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { FreshnessState } from '../types/entities';
import { DEMO_CLOCK } from '../types/primitives';
import { SOURCE_LABELS } from '../types/sources';
import type { SourceHealth } from '../types/sources';
import { FreshnessPill, freshnessMeaning } from './freshness-pill';
import { MEANING_COLOUR_CLASSES } from './status-indicator';
import type { StatusMeaning } from './status-indicator';

/* ---------------------------------------------------------------------------------------------
 * The mapping's expected meanings, one per member of the contracts' union
 * ------------------------------------------------------------------------------------------- */

/** One state with the meaning the module's own documentation assigns it. */
type StateCase = readonly [FreshnessState, StatusMeaning];

/**
 * Every member of `FreshnessState` with its meaning, in the order the type declares them.
 *
 * Typed against the union twice: the state column is the union's own vocabulary, and the
 * exhaustiveness assertion below fails to compile if a member is added and not listed here.
 */
const STATE_CASES: readonly StateCase[] = [
  ['fresh', 'pass'],
  ['stale', 'warning'],
  ['partial', 'review'],
  ['unavailable', 'fail'],
];

/** Every member of `FreshnessState` the list above leaves out: `never` while the list is complete. */
type UnlistedState = Exclude<FreshnessState, (typeof STATE_CASES)[number][0]>;

/** Fails the type check unless its argument is `never`, which is what makes the list exhaustive. */
type AssertNever<Value extends never> = Value;

/** The assertion itself: a state added to the union and not to the list is a compile error here. */
type StatesListed = AssertNever<UnlistedState>;

/* ---------------------------------------------------------------------------------------------
 * The fixtures this suite fabricates — a record built from the owner maps, no typed figure
 * ------------------------------------------------------------------------------------------- */

/** The instant the fixture record answered, derived from the one clock the application fixes. */
const AS_OF = DEMO_CLOCK.replace(/T\d{2}:\d{2}/u, 'T06:45');

/** The age a caller that already derived one would pass, as the module documents that flow. */
const AGE_LABEL = 'an age the caller derived';

/** One source record, built the way the adapter builds it: the label from the map, the rest a value. */
function recordOf(state: FreshnessState): SourceHealth {
  return { source: 'erp', label: SOURCE_LABELS.erp, state, asOf: AS_OF };
}

/* ---------------------------------------------------------------------------------------------
 * The mapping
 * ------------------------------------------------------------------------------------------- */

describe('freshnessMeaning — the state to meaning mapping', () => {
  it.each(STATE_CASES)('maps %s onto the %s meaning', (state, meaning) => {
    expect(freshnessMeaning(state)).toBe(meaning);
  });

  it('maps every member of FreshnessState, and invents no mapping for a member it was not given', () => {
    /* The union is fully covered by the table above, which the type assertions on this file prove;
       the runtime half is that a value outside the union answers nothing rather than a fallback. A
       fifth state therefore has to be given a decided meaning — a colour, an icon and a word — before
       it can reach a screen, which is what the module's own `switch` is written for. */
    expect(STATE_CASES.map(([state]) => state)).toHaveLength(4);
    expect(freshnessMeaning('an-unlisted-state' as unknown as FreshnessState)).toBeUndefined();
  });

  it('keeps the two degraded states apart, and reads the answered one as a pass', () => {
    /* A stale source answered with aged data and a partial one answered incompletely: neither is a
       failure, and they are two different things to report, so each takes a meaning of its own — the
       warning triangle for aged data and the review eye for an incomplete reading — while a source
       that did not answer at all is the failure. The relationships are asserted directly so a table
       that silently collapsed two meanings into one cannot pass on two rows that look alike. */
    expect(freshnessMeaning('fresh')).toBe('pass');
    expect(freshnessMeaning('stale')).toBe('warning');
    expect(freshnessMeaning('partial')).toBe('review');
    expect(freshnessMeaning('unavailable')).toBe('fail');
    expect(freshnessMeaning('partial')).not.toBe(freshnessMeaning('stale'));
    expect(freshnessMeaning('fresh')).not.toBe(freshnessMeaning('stale'));
  });
});

/* ---------------------------------------------------------------------------------------------
 * The pill
 * ------------------------------------------------------------------------------------------- */

describe('FreshnessPill — the record it prints', () => {
  it.each(STATE_CASES)(
    'shows a %s source as the %s meaning, in icon, status colour and its own state word',
    (state, meaning) => {
      const { container } = render(<FreshnessPill health={recordOf(state)} />);

      /* The state's own token, printed as text: the meaning never rests on colour alone (rule B-3). */
      const stateWord = container.querySelectorAll('span');

      expect(Array.from(stateWord).some((span) => span.textContent === state)).toBe(true);

      /* The icon and the status colour role, both from the meaning the table maps this state to. */
      const iconWrapper = container.querySelector('[aria-hidden="true"]');

      expect(iconWrapper?.className).toContain(MEANING_COLOUR_CLASSES[meaning]);
      expect(iconWrapper?.querySelector('svg')).not.toBeNull();
    },
  );

  it('prints the record’s own source name and its as-of instant, unformatted, in the mono face', () => {
    const record = recordOf('fresh');
    const { container } = render(<FreshnessPill health={record} />);

    const text = container.textContent ?? '';

    expect(text).toContain(record.label);
    expect(text).toContain(record.asOf);

    /* The instant goes through the one presentation formatter with the timestamp kind, which renders
       it in the tabular mono face and passes the record's string through unchanged. */
    const instant = Array.from(container.querySelectorAll('span')).find(
      (span) => span.textContent === record.asOf,
    );

    expect(instant).toHaveClass('font-mono', 'tabular-nums');
  });

  it('prints no age of its own, because an age is arithmetic this layer does not do', () => {
    const record = recordOf('stale');
    const { container } = render(<FreshnessPill health={record} />);

    /* The whole text is the source, its state and its instant, in that order: nothing measures an age
       against the demonstration clock here (rule P-6). */
    expect(container.textContent).toBe(`${record.label}${record.state}${record.asOf}`);
  });

  it.each([
    ['an absent age', undefined],
    ['an empty age', ''],
  ])('prints nothing extra for %s', (_label, ageLabel) => {
    const record = recordOf('fresh');
    const { container } = render(
      <FreshnessPill health={record} ageLabel={ageLabel} />,
    );

    /* An empty string is treated as absent, so a caller that could not compute an age adds no empty
       gap to the row. */
    expect(container.textContent).toBe(`${record.label}${record.state}${record.asOf}`);
  });

  it('prints an age the caller derived from the same record, after the instant', () => {
    const record = recordOf('fresh');
    const { container } = render(<FreshnessPill health={record} ageLabel={AGE_LABEL} />);

    expect(container.textContent).toBe(
      `${record.label}${record.state}${record.asOf}${AGE_LABEL}`,
    );
  });

  it('takes the caller’s layout classes without dropping its own', () => {
    const { container } = render(
      <FreshnessPill health={recordOf('fresh')} className="basis-full" />,
    );

    const pill = container.firstElementChild;

    expect(pill).toHaveClass('basis-full');
    expect(pill).toHaveClass('bg-surface-2', 'border-hairline');
  });
});

/* ---------------------------------------------------------------------------------------------
 * The shape it is not
 * ------------------------------------------------------------------------------------------- */

describe('FreshnessPill — the shape it is not', () => {
  it('is inline content: a span, with no focus stop, no heading, no landmark and no control', async () => {
    const user = userEvent.setup();
    const { container } = render(<FreshnessPill health={recordOf('unavailable')} />);

    const pill = container.firstElementChild;

    expect(pill?.tagName).toBe('SPAN');
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0);
    expect(container.querySelectorAll('button, a, input, select, textarea')).toHaveLength(0);
    expect(container.querySelectorAll('[role]')).toHaveLength(0);

    await user.tab();

    expect(container.contains(document.activeElement)).toBe(false);
  });
});
