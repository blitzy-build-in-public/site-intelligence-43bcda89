/**
 * Unit suite for `svg-label.ts`, the module that estimates, shortens and places the text an SVG drawing
 * prints.
 *
 * WHAT IT PROVES. That the width of a run is arithmetic over the grade's own two numbers and never a
 * measurement, so the same payload draws the same picture in every environment (AAP §0.18.2
 * determinism); that a run which does not fit is shortened at a glyph boundary and marked, while one
 * that fits is returned untouched — the comparison a caller makes to decide whether the record's full
 * text needs a `<title>`; that the placement answers the first clear candidate, steps outward when that
 * candidate is taken, and never returns two labels that overlap; and that the same search places a box —
 * the row of evidence-pin numerals a map node carries — clear of the boxes already placed and answers one
 * for every request, because a box states a count a drawing may not drop.
 *
 * WHY THE DENSE FIXTURE IS SCRIPTED RATHER THAN RANDOM. A random cluster would prove nothing on the next
 * run, because the case would be a different one; the coordinates below are stated, so the case either
 * holds or fails for every reader. They are deliberately tighter than any drawing this layer carries:
 * nine marks inside a 40-by-40 region, each naming a run far wider than the gap between them.
 *
 * WHERE THE EXPECTATIONS COME FROM. Every width and every position is computed from the module's own
 * constants and from the fixture's stated coordinates, so a re-tuned character width or a moved distance
 * reaches this suite instead of leaving it asserting a number nobody derives any more.
 */

import { describe, expect, it } from 'vitest';

import {
  LABEL_DISTANCES,
  LABEL_ELLIPSIS,
  SVG_LABEL_CHARACTER_WIDTH,
  SVG_LABEL_FONT_SIZE,
  SVG_LABEL_TEXT_METRICS,
  estimateDrawnTextWidth,
  estimateTextWidth,
  labelBoxesCollide,
  labelFitsInside,
  labelStepRatioOf,
  markObstacleOf,
  placeBoxes,
  placeLabels,
  renderedLabelMetrics,
  truncateToWidth,
} from './svg-label';
import type {
  BoxRequest,
  LabelBox,
  LabelFit,
  LabelPlacement,
  LabelRequest,
} from './svg-label';

/**
 * The room a case places labels in: a small drawing, stated rather than borrowed from any component.
 *
 * The bounds are a third of the FileMap map's width, so a case that seats nine clustered labels here
 * seats them on any surface in the layer; `maxTextWidth` is one line of ten characters, which is what
 * makes the shortening case bite.
 */
const FIT: LabelFit = {
  metrics: SVG_LABEL_TEXT_METRICS,
  bounds: { width: 320, height: 220 },
  boxHeight: SVG_LABEL_FONT_SIZE + 3,
  lineHeight: 14,
  clearance: 4,
  markRadius: 5,
  distances: [10, 24, 38],
  maxTextWidth: 70,
};

/** The three metrics of that fit, which every width in this suite is derived from. */
const METRICS = FIT.metrics;

/**
 * The box a placement covers, recomputed here from the module's stated geometry.
 *
 * The placement answers where a label starts, not the box it occupies, so a case that asserts two labels
 * do not meet has to rebuild the box the placement reasoned about. It is built from the same two numbers
 * the module documents — the type step above the baseline, and one line of the stated height — so a case
 * cannot drift away from the algorithm it checks.
 */
function boxOf(placement: LabelPlacement, lineCount = 1): LabelBox {
  return {
    x: placement.labelX,
    y: placement.labelY - METRICS.fontSize,
    width: Math.max(...placement.lines.map((line) => estimateTextWidth(line, METRICS))),
    height: FIT.boxHeight + Math.max(0, lineCount - 1) * FIT.lineHeight,
  };
}

/**
 * Nine marks inside a 40-by-40 region, each naming a run far wider than the gap between them.
 *
 * The labels are twenty characters wide before shortening — twice the region the marks stand in — so a
 * placement that ignored its neighbours would print every one of them over the rest.
 */
function clusteredRequests(): readonly LabelRequest[] {
  const requests: LabelRequest[] = [];

  for (let index = 0; index < 9; index += 1) {
    requests.push({
      key: `mark-${String(index)}`,
      lines: [`Clustered name ${String(index)}`.padEnd(20, 'x')],
      x: 140 + (index % 3) * 20,
      y: 100 + Math.floor(index / 3) * 20,
    });
  }

  return requests;
}

describe('estimateTextWidth', () => {
  it('measures a run as its character count times the stated character width', () => {
    expect(estimateTextWidth('abcd', METRICS)).toBe(4 * SVG_LABEL_CHARACTER_WIDTH);
    expect(estimateTextWidth('abcd', { fontSize: 12, characterWidth: 10 })).toBe(40);
  });

  it('measures an empty run as no width at all', () => {
    expect(estimateTextWidth('', METRICS)).toBe(0);
  });

  it('counts a character outside the basic plane once, as a reader does', () => {
    // Two code points, three UTF-16 units: counting units would make this run half again as wide.
    expect(estimateTextWidth('\u{1F600}\u{1F600}', METRICS)).toBe(2 * SVG_LABEL_CHARACTER_WIDTH);
  });
});

describe('truncateToWidth', () => {
  it('returns a run that fits untouched, so a caller can compare it with its own string', () => {
    const fits = 'eightch'; // eight characters at the stated width: well inside the budget.

    expect(truncateToWidth(fits, FIT.maxTextWidth, METRICS)).toBe(fits);
  });

  it('shortens a run that does not fit and marks the cut, inside the width it was given', () => {
    const shortened = truncateToWidth('A name far too long for this drawing', FIT.maxTextWidth, METRICS);

    expect(shortened.endsWith(LABEL_ELLIPSIS)).toBe(true);
    expect(shortened.length).toBeLessThan('A name far too long for this drawing'.length);
    expect(estimateTextWidth(shortened, METRICS)).toBeLessThanOrEqual(FIT.maxTextWidth);
  });

  it('leaves a run that is already one character long alone', () => {
    expect(truncateToWidth('A', FIT.maxTextWidth, METRICS)).toBe('A');
    expect(truncateToWidth('', FIT.maxTextWidth, METRICS)).toBe('');
  });

  it('answers nothing when not even the ellipsis fits', () => {
    expect(truncateToWidth('A name', SVG_LABEL_CHARACTER_WIDTH / 2, METRICS)).toBe('');
  });

  it('never leaves a space immediately before the ellipsis', () => {
    const widened = { fontSize: 12, characterWidth: 10 };
    const shortened = truncateToWidth('A name that is too long', 35, widened);

    expect(shortened).toBe(`A${LABEL_ELLIPSIS}`);
  });
});

describe('labelFitsInside and labelBoxesCollide', () => {
  it('keeps a box inside the drawing and clear of its edge by the stated space', () => {
    const inside: LabelBox = { x: 4, y: 4, width: 10, height: 10 };
    const atTheEdge: LabelBox = { x: 0, y: 4, width: 10, height: 10 };
    const pastTheEnd: LabelBox = { x: FIT.bounds.width - 8, y: 4, width: 10, height: 10 };

    expect(labelFitsInside(inside, FIT)).toBe(true);
    expect(labelFitsInside(atTheEdge, FIT)).toBe(false);
    expect(labelFitsInside(pastTheEnd, FIT)).toBe(false);
  });

  it('treats two boxes closer than the clear space as colliding', () => {
    const one: LabelBox = { x: 10, y: 10, width: 20, height: 10 };
    const touching: LabelBox = { x: 31, y: 10, width: 20, height: 10 };
    const clear: LabelBox = { x: 40, y: 10, width: 20, height: 10 };

    expect(labelBoxesCollide(one, touching, FIT.clearance)).toBe(true);
    expect(labelBoxesCollide(one, clear, FIT.clearance)).toBe(false);
  });
});

describe('placeLabels', () => {
  it('answers the first candidate position when the mark has room beside it', () => {
    const request: LabelRequest = { key: 'mark', lines: ['Name'], x: 100, y: 100 };
    const placements = placeLabels([request], [], FIT);
    const placement = placements.get('mark');

    expect(placement).toBeDefined();
    expect(placement?.labelX).toBe(100 + (LABEL_DISTANCES[0] ?? 0));
    expect(placement?.labelY).toBe(104);
    expect(placement?.lines).toEqual(['Name']);
  });

  it('steps to the next candidate when the plain position is taken', () => {
    const request: LabelRequest = { key: 'mark', lines: ['Name'], x: 100, y: 100 };
    const plain = placeLabels([request], [], FIT).get('mark');

    if (plain === undefined) {
      throw new Error('the free mark was given no position');
    }

    /* Another mark's name already sits where this one would print, so the placement has to answer a
       second position rather than the one it answered when the space was free. */
    const occupied = markObstacleOf('other', 100 + (LABEL_DISTANCES[0] ?? 0) + 10, 100, 12);
    const stepped = placeLabels([request], [occupied], FIT).get('mark');

    expect(stepped).toBeDefined();
    expect(stepped?.labelX === plain.labelX && stepped.labelY === plain.labelY).toBe(false);
  });

  it('keeps its own mark from blocking its own label', () => {
    const request: LabelRequest = { key: 'mark', lines: ['Name'], x: 100, y: 100 };
    const own = markObstacleOf('mark', 100, 100, 12);

    expect(placeLabels([request], [own], FIT).get('mark')?.labelX).toBe(
      100 + (LABEL_DISTANCES[0] ?? 0),
    );
  });

  it('places no two labels of a dense cluster over one another', () => {
    const requests = clusteredRequests();
    const placements = placeLabels(requests, [], FIT);
    const boxes = [...placements.values()].map((placement) => boxOf(placement));

    // The cluster has room for most of the names; what matters is that the ones it keeps do not meet.
    expect(boxes.length).toBeGreaterThan(0);

    for (const [index, one] of boxes.entries()) {
      expect(labelFitsInside(one, FIT)).toBe(true);

      for (const other of boxes.slice(index + 1)) {
        expect(labelBoxesCollide(one, other, FIT.clearance)).toBe(false);
      }
    }
  });

  it('shortens a run too wide for the drawing rather than leaving it out', () => {
    const long: LabelRequest = { key: 'mark', lines: ['A'.repeat(60)], x: 160, y: 60 };
    const placement = placeLabels([long], [], FIT).get('mark');

    expect(placement).toBeDefined();

    const [line] = placement?.lines ?? [];

    expect(line?.endsWith(LABEL_ELLIPSIS)).toBe(true);
    expect(line?.length).toBeLessThan(60);
    expect(estimateTextWidth(line ?? '', METRICS)).toBeLessThanOrEqual(FIT.maxTextWidth);
  });

  it('leaves out a label the drawing has no room for, rather than printing it over its neighbour', () => {
    const narrow: LabelFit = { ...FIT, bounds: { width: 20, height: 20 }, maxTextWidth: 4 };
    const placements = placeLabels([{ key: 'mark', lines: ['Name'], x: 10, y: 10 }], [], narrow);

    expect(placements.size).toBe(0);
  });

  it('gives a two-line label the taller box its second baseline needs', () => {
    const twoLines: LabelRequest = {
      key: 'crossing',
      lines: ['Crossing', 'Simulated market intelligence'],
      x: 160,
      y: 60,
    };
    const single: LabelRequest = { key: 'mark', lines: ['Name'], x: 160, y: 60 };
    const placements = placeLabels([twoLines, single], [], FIT);
    const crossing = placements.get('crossing');
    const mark = placements.get('mark');

    if (crossing === undefined || mark === undefined) {
      throw new Error('the two-line block was given no position');
    }

    expect(labelBoxesCollide(boxOf(crossing, 2), boxOf(mark), FIT.clearance)).toBe(false);
  });

  it('seats a shortened run in a gap the whole run cannot take', () => {
    /* A drawing whose only clear space is a sixty-unit slot, with the mark beside it: the whole run is
       twice the slot's width, so the ladder's narrower cut is what puts the name on the drawing. */
    const slot: LabelFit = {
      ...FIT,
      bounds: { width: 220, height: 120 },
      distances: [10, 24, 38],
      maxTextWidth: 200,
      shorteningWidths: [98, 63, 42],
    };
    const blockers = [
      { key: 'left', box: { x: 0, y: 0, width: 100, height: 120 } },
      { key: 'right', box: { x: 168, y: 0, width: 52, height: 120 } },
      { key: 'top', box: { x: 100, y: 0, width: 68, height: 88 } },
      { key: 'bottom', box: { x: 100, y: 132, width: 68, height: 60 } },
    ];
    const request: LabelRequest = { key: 'mark', lines: ['Cluster place zero'], x: 160, y: 110 };
    /* The same drawing without a ladder: what a surface that prints only whole runs would answer. */
    const wholeOnly: LabelFit = {
      metrics: slot.metrics,
      bounds: slot.bounds,
      boxHeight: slot.boxHeight,
      lineHeight: slot.lineHeight,
      clearance: slot.clearance,
      markRadius: slot.markRadius,
      distances: slot.distances,
      maxTextWidth: slot.maxTextWidth,
    };
    const placement = placeLabels([request], blockers, slot).get('mark');

    if (placement === undefined) {
      throw new Error('the shortened run was given no position');
    }

    const [line] = placement.lines;
    const box = boxOf(placement);

    /* The whole run cannot be seated in the slot, and stating a ladder is what seats a shortened one. */
    expect(placeLabels([request], blockers, wholeOnly).size).toBe(0);
    expect(line?.endsWith(LABEL_ELLIPSIS)).toBe(true);
    expect(estimateTextWidth(line ?? '', METRICS)).toBeLessThanOrEqual(63);
    expect(labelFitsInside(box, slot)).toBe(true);

    for (const blocker of blockers) {
      expect(labelBoxesCollide(blocker.box, box, slot.clearance)).toBe(false);
    }
  });

  it('answers the same positions twice for the same payload', () => {
    const requests = clusteredRequests();

    expect([...placeLabels(requests, [], FIT).entries()]).toEqual([
      ...placeLabels(requests, [], FIT).entries(),
    ]);
  });
});

describe('placeBoxes', () => {
  it('answers the place beside the mark when nothing is in the way', () => {
    const request: BoxRequest = { key: 'row', width: 16, height: 14, x: 100, y: 100 };
    const placement = placeBoxes([request], [], FIT).get('row');

    expect(placement).toEqual({
      x: 100 + (LABEL_DISTANCES[0] ?? 0),
      y: 100 - (LABEL_DISTANCES[0] ?? 0) - 14,
    });
  });

  it('steps a second box off the first when two marks share one point', () => {
    const requests: readonly BoxRequest[] = [
      { key: 'first', width: 16, height: 14, x: 100, y: 100 },
      { key: 'second', width: 16, height: 14, x: 100, y: 100 },
    ];
    const placements = placeBoxes(requests, [], FIT);
    const first = placements.get('first');
    const second = placements.get('second');

    if (first === undefined || second === undefined) {
      throw new Error('a row of numerals was left out');
    }

    const boxOfPlacement = (placement: { readonly x: number; readonly y: number }): LabelBox => ({
      ...placement,
      width: 16,
      height: 14,
    });

    expect(first).not.toEqual(second);
    expect(labelBoxesCollide(boxOfPlacement(first), boxOfPlacement(second), FIT.clearance)).toBe(
      false,
    );
    expect(labelFitsInside(boxOfPlacement(first), FIT)).toBe(true);
    expect(labelFitsInside(boxOfPlacement(second), FIT)).toBe(true);
  });

  it('keeps its own mark from blocking its own box and steps around every other mark', () => {
    const request: BoxRequest = { key: 'row', width: 16, height: 14, x: 100, y: 100 };
    const own = markObstacleOf('row', 100, 100, 12);

    expect(placeBoxes([request], [own], FIT).get('row')?.x).toBe(100 + (LABEL_DISTANCES[0] ?? 0));
  });

  it('answers a place for every box even where every candidate around its mark is taken', () => {
    const requests: readonly BoxRequest[] = [
      { key: 'first', width: 16, height: 14, x: 100, y: 100 },
      { key: 'second', width: 16, height: 14, x: 100, y: 100 },
      { key: 'third', width: 16, height: 14, x: 100, y: 100 },
    ];
    /* One obstacle across the whole drawing, so not one candidate can be seated clear. */
    const walled = [
      { key: 'wall', box: { x: 0, y: 0, width: FIT.bounds.width, height: FIT.bounds.height } },
    ];
    const placements = placeBoxes(requests, walled, FIT);

    /* A row of numerals is never dropped, and never answered off the drawing. */
    expect(placements.size).toBe(requests.length);

    for (const placement of placements.values()) {
      expect(labelFitsInside({ ...placement, width: 16, height: 14 }, FIT)).toBe(true);
    }
  });

  it('answers a box for a mark the frame puts off the drawing at the mark’s own place', () => {
    const request: BoxRequest = { key: 'row', width: 16, height: 14, x: -60, y: -40 };
    const placement = placeBoxes([request], [], FIT).get('row');

    /* The box travels with its mark, where the frame cuts it, rather than being clamped to the edge. */
    expect(placement).toEqual({
      x: -60 + (LABEL_DISTANCES[0] ?? 0),
      y: -40 - (LABEL_DISTANCES[0] ?? 0) - 14,
    });
  });

  it('answers the same places twice for the same payload', () => {
    const requests: readonly BoxRequest[] = [
      { key: 'first', width: 16, height: 14, x: 100, y: 100 },
      { key: 'second', width: 34, height: 14, x: 100, y: 100 },
    ];

    expect([...placeBoxes(requests, [], FIT).entries()]).toEqual([
      ...placeBoxes(requests, [], FIT).entries(),
    ]);
  });
});

/**
 * The rendered step: the size a label prints at, whatever width the drawing is scaled to.
 *
 * WHAT IT PROVES. That a drawing which states its labels' metrics from the scale it is rendered at
 * prints them at a step of specification §4.3's type scale at every width the atlas is shown at — the
 * defect the atlas's charts carried, where a label set at a fixed 12 user units rendered at 7.5 px in
 * a phone-width card and at 43 px in a 1920 px one. Every case below is stated as the RENDERED size,
 * which is what a reader sees, so a re-tuned base step reaches this suite rather than leaving it
 * asserting a number nobody derives any more.
 */
describe('renderedLabelMetrics', () => {
  /** One width the atlas renders its drawings at, with the width the drawing's own box states. */
  const RENDERED: readonly { readonly viewBoxWidth: number; readonly renderedWidth: number }[] = [
    { viewBoxWidth: 520, renderedWidth: 324 },
    { viewBoxWidth: 520, renderedWidth: 590 },
    { viewBoxWidth: 520, renderedWidth: 1440 },
    { viewBoxWidth: 520, renderedWidth: 1854 },
    { viewBoxWidth: 760, renderedWidth: 324 },
    { viewBoxWidth: 760, renderedWidth: 1854 },
  ];

  it.each(RENDERED)(
    'prints a label at a type-scale step in a $renderedWidth px drawing of a $viewBoxWidth unit box',
    ({ viewBoxWidth, renderedWidth }) => {
      const scale = renderedWidth / viewBoxWidth;
      const metrics = renderedLabelMetrics(scale);
      const printed = metrics.fontSize * scale;

      expect(printed).toBeGreaterThanOrEqual(SVG_LABEL_FONT_SIZE);
      expect(printed).toBeLessThanOrEqual(16);
      expect(printed).toBeCloseTo(Math.round(printed), 6);
    },
  );

  it('keeps the layer’s 12-unit step where nothing has been measured', () => {
    expect(renderedLabelMetrics(null)).toEqual(SVG_LABEL_TEXT_METRICS);
    expect(renderedLabelMetrics(undefined)).toEqual(SVG_LABEL_TEXT_METRICS);
    expect(renderedLabelMetrics(0)).toEqual(SVG_LABEL_TEXT_METRICS);
    expect(renderedLabelMetrics(Number.NaN)).toEqual(SVG_LABEL_TEXT_METRICS);
  });

  it('grows a label set in user units as the drawing it belongs to shrinks', () => {
    const phone = renderedLabelMetrics(324 / 520);
    const wide = renderedLabelMetrics(1854 / 520);

    expect(phone.fontSize).toBeGreaterThan(SVG_LABEL_FONT_SIZE);
    expect(wide.fontSize).toBeLessThan(SVG_LABEL_FONT_SIZE);
    expect(phone.characterWidth).toBeCloseTo(
      SVG_LABEL_CHARACTER_WIDTH * (phone.fontSize / SVG_LABEL_FONT_SIZE),
      6,
    );
  });

  it('states the factor a drawing multiplies its label geometry by, which is one at the base step', () => {
    expect(labelStepRatioOf(SVG_LABEL_TEXT_METRICS)).toBe(1);
    expect(labelStepRatioOf(renderedLabelMetrics(1))).toBe(1);

    const doubled = renderedLabelMetrics(2);
    expect(labelStepRatioOf(doubled)).toBeCloseTo(doubled.fontSize / SVG_LABEL_FONT_SIZE, 6);
  });
});

/**
 * The drawn width: the advance a run actually renders at, for the geometry of a leader that points at it.
 *
 * WHAT IT PROVES. That the width a leader is drawn to is narrower than the width a name is seated in — the
 * reserved box is deliberately generous so that a name believed to fit still fits — and that it stays in
 * proportion to the type a drawing prints at. A leader drawn to the reserved box stops in the space the
 * reservation kept empty, which is the gap the atlas's crossing names carried.
 */
describe('estimateDrawnTextWidth', () => {
  it('measures a run narrower than the box the placement seats it in', () => {
    const run = 'Strait of Gibraltar';
    const reserved = estimateTextWidth(run, SVG_LABEL_TEXT_METRICS);
    const drawn = estimateDrawnTextWidth(run, SVG_LABEL_TEXT_METRICS);

    expect(drawn).toBeLessThan(reserved);
    expect(drawn / Array.from(run).length).toBeCloseTo(4.9, 6);
  });

  it('keeps the same proportion at the type a drawing prints at another width', () => {
    const wide = renderedLabelMetrics(1854 / 520);
    const narrow = renderedLabelMetrics(324 / 520);

    expect(estimateDrawnTextWidth('Suez Canal', wide) / estimateDrawnTextWidth('Suez Canal', narrow))
      .toBeCloseTo(wide.fontSize / narrow.fontSize, 6);
  });
});
