/**
 * Component suite for `series-band.tsx`, the shared label band the atlas's radar and its network view
 * both compose.
 *
 * WHAT IT PROVES. That one row is printed per drawn series, in the caller's order and at the caller's own
 * geometry, so neither drawing's row or line height is baked into the component; that a row's name and its
 * companion line are the caller's strings, printed in that order; that a name too wide for the width the
 * caller states is shortened in the drawing while the whole of it stays in a `<title>` child, so a reader
 * who reaches the element still reads the series' own name; that the row the screen reports on states
 * `aria-current` and takes the emphasised weight, and no other row does; and that a swatch is decorative —
 * hidden from assistive technology — whether the caller draws it or names a utility class for it.
 *
 * WHY THE GEOMETRY IS ASSERTED FROM THE ROW'S OWN BASELINES. The band's job is to place rows, and a case
 * that only counted them would pass for a band that printed every row on one line. The baselines are read
 * from the emitted `y` attributes and compared with the arithmetic the caller's geometry states, so a
 * misplaced row fails here.
 *
 * WHERE THE EXPECTATIONS COME FROM. Every expected position is computed from the fixture's own geometry,
 * and every expected string is the fixture's own, so a re-tuned band reaches this suite instead of leaving
 * it asserting a number nobody derives any more.
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LABEL_ELLIPSIS } from './svg-label';
import { SeriesBand } from './series-band';
import type { SeriesBandGeometry, SeriesBandRow } from './series-band';

/**
 * The geometry a case composes the band with: a band of three rows at the caller's own spacing.
 *
 * It is deliberately unlike either drawing's — a different row height, a different line height and a text
 * column of its own — so a component that carried one drawing's proportions would fail the baseline case.
 */
const GEOMETRY: SeriesBandGeometry = {
  top: 100,
  rowHeight: 30,
  lineHeight: 16,
  textX: 24,
  maxTextWidth: 120,
  swatch: { x: 10, size: 5 },
};

/** A series' name: the words a row prints as its own text. */
const CLIENT_NAME = 'Client network';

/** The label a series' figures carry, printed on the row's second line. */
const COMPANION = 'Simulated label';

/** A name far wider than the width {@link GEOMETRY} allows, which is the case the shortening covers. */
const OVERLONG_NAME = 'A series whose name runs far past the width the band allows for a row';

/** The rows every case starts from, so a case states only what it changes. */
const ROWS: readonly SeriesBandRow[] = [
  { key: 'client', name: CLIENT_NAME, companion: COMPANION },
  { key: 'competitor-one', name: 'Competitor A', companion: COMPANION },
  { key: 'competitor-two', name: 'Competitor B', companion: COMPANION },
];

/** Renders the band inside an `<svg>`, which is where it is composed. */
function renderBand(rows: readonly SeriesBandRow[], geometry: SeriesBandGeometry = GEOMETRY) {
  return render(
    <svg>
      <SeriesBand rows={rows} geometry={geometry} label="Series labels" />
    </svg>,
  );
}

/**
 * The rows of a rendered band: the groups whose own children include a text line.
 *
 * The band's own group holds rows rather than lines, and a swatch group holds no text at all, so this
 * finds exactly the rows however the caller's geometry places them.
 */
function rowsOf(container: HTMLElement): readonly SVGGElement[] {
  return [...container.querySelectorAll<SVGGElement>('g')].filter((group) =>
    [...group.children].some((child) => child.tagName.toLowerCase() === 'text'),
  );
}

/** The text lines one row prints, in the order they are drawn. */
function linesOf(row: Element): readonly string[] {
  return [...row.querySelectorAll('text')].map((text) => (text.lastChild?.textContent ?? '').trim());
}

describe('SeriesBand', () => {
  it('renders nothing at all when the drawing shows no series', () => {
    const { container } = renderBand([]);

    expect(container.querySelector('svg')?.children).toHaveLength(0);
  });

  it('prints one named group with one row per drawn series', () => {
    const { container } = renderBand(ROWS);
    const band = container.querySelector('g[role="group"]');

    expect(band?.getAttribute('aria-label')).toBe('Series labels');
    expect(band?.querySelectorAll('text')).toHaveLength(ROWS.length * 2);
  });

  it('prints each row at the baseline the caller’s own geometry states', () => {
    const { container } = renderBand(ROWS);
    const rows = rowsOf(container);

    ROWS.forEach((row, index) => {
      const group = rows[index];
      const name = group?.querySelector('text');
      const companion = group?.querySelectorAll('text')[1];

      expect(Number(name?.getAttribute('y'))).toBe(GEOMETRY.top + index * GEOMETRY.rowHeight);
      expect(Number(companion?.getAttribute('y'))).toBe(
        GEOMETRY.top + index * GEOMETRY.rowHeight + GEOMETRY.lineHeight,
      );
      expect(Number(name?.getAttribute('x'))).toBe(GEOMETRY.textX);
    });
  });

  it('prints a row’s name and then the label its figures carry, in that order', () => {
    const { container } = renderBand(ROWS);
    const [first] = rowsOf(container);

    expect(first === undefined ? [] : linesOf(first)).toEqual([CLIENT_NAME, COMPANION]);
  });

  it('shortens a name wider than the column and keeps the whole of it in the title', () => {
    const { container } = renderBand([{ key: 'long', name: OVERLONG_NAME, companion: COMPANION }]);
    const [row] = rowsOf(container);
    const name = row?.querySelector('text');

    expect(name?.textContent).toContain(LABEL_ELLIPSIS);
    expect(name?.textContent).not.toBe(OVERLONG_NAME);
    /* The series' own name is still there for a reader that reaches the element. */
    expect(name?.querySelector('title')?.textContent).toBe(OVERLONG_NAME);
  });

  it('prints a name that fits exactly as the caller spelled it, with no title', () => {
    const { container } = renderBand([{ key: 'short', name: CLIENT_NAME }]);
    const [row] = rowsOf(container);
    const name = row?.querySelector('text');

    expect(name?.textContent).toBe(CLIENT_NAME);
    expect(name?.querySelector('title')).toBeNull();
  });

  it('marks the row in view with aria-current and the emphasised weight, and no other row', () => {
    const { container } = renderBand([
      { key: 'first', name: 'First series' },
      { key: 'second', name: 'Second series', current: true },
    ]);
    const rows = rowsOf(container);

    expect(rows[0]?.getAttribute('aria-current')).toBeNull();
    expect(rows[1]?.getAttribute('aria-current')).toBe('true');

    const current = rows[1]?.querySelector('text')?.getAttribute('class') ?? '';

    expect(current).toContain('font-semibold');
    expect(rows[0]?.querySelector('text')?.getAttribute('class') ?? '').not.toContain(
      'font-semibold',
    );
  });

  it('hides a swatch the caller draws and places it at the row’s own centre', () => {
    const { container } = renderBand([
      { key: 'marked', name: CLIENT_NAME, swatch: <circle cx={0} cy={0} r={4} className="fill-accent" /> },
    ]);
    const swatchGroup = container.querySelector('g[aria-hidden="true"]');
    const column = GEOMETRY.swatch;

    expect(swatchGroup?.querySelector('circle')).not.toBeNull();
    expect(swatchGroup?.getAttribute('transform')).toBe(
      `translate(${(column?.x ?? 0) + (column?.size ?? 0)} ${GEOMETRY.top - GEOMETRY.lineHeight / 2})`,
    );
  });

  it('paints a plain circular swatch in the utility class the caller names', () => {
    const { container } = renderBand([
      { key: 'classed', name: CLIENT_NAME, swatchClasses: 'fill-accent' },
    ]);
    const swatch = container.querySelector('g[aria-hidden="true"] > circle');

    expect(swatch?.getAttribute('class')).toBe('fill-accent');
    expect(Number(swatch?.getAttribute('r'))).toBe(GEOMETRY.swatch?.size);
  });

  it('prints no swatch group at all when the caller states neither a node nor a class', () => {
    const { container } = renderBand([{ key: 'plain', name: CLIENT_NAME }]);

    expect(container.querySelector('g[aria-hidden="true"]')).toBeNull();
  });

  it('leaves the rows unnamed when the caller states no group name', () => {
    const { container } = render(
      <svg>
        <SeriesBand rows={ROWS} geometry={GEOMETRY} />
      </svg>,
    );

    expect(container.querySelector('g[role="group"]')).toBeNull();
    expect(container.querySelectorAll('text')).toHaveLength(ROWS.length * 2);
  });
});
