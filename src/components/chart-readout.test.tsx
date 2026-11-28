/**
 * Component suite for `chart-readout.tsx`, the read-out the four custom SVG charts print for the mark
 * a reader points at or focuses, and the one place a mark's target size is converted from the
 * drawing's own units into CSS pixels.
 *
 * Each case asserts a clause the charts are relied on for rather than the module's markup: the heading
 * and one line per reading, in the caller's own wording and its own formatted value (rule P-6); the
 * `tooltip` role and the fact that the box can never sit between the pointer and its mark; the
 * placement rule stated as the pure function it is — centred above a mark in the middle of the
 * drawing, flipped to the anchor's own side near the right edge, grown rightwards near the start, and
 * below the mark near the top so it stays inside the figure at every breakpoint; and the target
 * radius, which is the drawing's base radius until a measurement exists and 24 CSS pixels across once
 * one does, held inside the room the mark has before it meets a neighbour (rule B-3, WCAG 2.2 SC
 * 2.5.8).
 *
 * The placement cases are asserted through `chartReadoutPlacement` rather than through a rendered
 * box: jsdom lays nothing out, so a measured assertion would be a fiction, while the rule the module
 * applies is a pure function of the anchor and can be asserted exactly.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ChartReadout,
  MIN_TARGET_DIAMETER_PX,
  chartReadoutPlacement,
  chartTargetRadius,
} from './chart-readout';
import type { ChartReadoutAnchor } from './chart-readout';

/* ---------------------------------------------------------------------------------------------
 * The records this suite draws
 * ------------------------------------------------------------------------------------------- */

/** A drawing to anchor read-outs in: a 680 by 260 box, the line surface's own proportions. */
const VIEW_BOX_WIDTH = 680;
const VIEW_BOX_HEIGHT = 260;

/** The clearance the placement keeps between a read-out and its mark, in CSS pixels. */
const GAP = '6px';

/** An anchor at a share of the drawing, in its own units. */
function anchorAt(xShare: number, yShare: number): ChartReadoutAnchor {
  return {
    x: (xShare / 100) * VIEW_BOX_WIDTH,
    y: (yShare / 100) * VIEW_BOX_HEIGHT,
    viewBoxWidth: VIEW_BOX_WIDTH,
    viewBoxHeight: VIEW_BOX_HEIGHT,
  };
}

/** The readings one point reports, named the way a caller names a series and its formatted value. */
const READINGS = [
  { label: 'Net opened', value: 'ahead of plan' },
  { label: 'Net resolved', value: 'at plan' },
] as const;

/* ---------------------------------------------------------------------------------------------
 * What it prints
 * ------------------------------------------------------------------------------------------- */

describe('ChartReadout', () => {
  it('prints its heading and one line per reading, in the caller’s own wording', () => {
    render(
      <ChartReadout anchor={anchorAt(50, 50)} title="the reported day" lines={READINGS} />,
    );

    const readout = screen.getByRole('tooltip');

    /* The heading names the point, and every reading is printed exactly as the caller formatted it. */
    expect(readout).toHaveTextContent('the reported day');

    for (const reading of READINGS) {
      expect(readout).toHaveTextContent(reading.label);
      expect(readout).toHaveTextContent(reading.value);
    }

    expect(readout.querySelectorAll('p')).toHaveLength(READINGS.length + 1);
  });

  it('prints no heading where the caller gives none, and nothing at all where it has no readings', () => {
    const { container, rerender } = render(
      <ChartReadout anchor={anchorAt(50, 50)} lines={[READINGS[0]]} />,
    );

    expect(screen.getByRole('tooltip').querySelectorAll('p')).toHaveLength(1);

    rerender(<ChartReadout anchor={anchorAt(50, 50)} title="the reported day" lines={[]} />);

    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('takes the pointer on no side of itself, and paints through role tokens only', () => {
    render(<ChartReadout anchor={anchorAt(50, 50)} title="the reported day" lines={READINGS} />);

    const readout = screen.getByRole('tooltip');
    const utilities = (readout.getAttribute('class') ?? '').split(' ');

    /* The box can never sit between the pointer and the mark it explains. */
    expect(utilities).toContain('pointer-events-none');
    expect(utilities).toContain('absolute');
    /* A raised surface on the theme's own roles: no palette literal, no shadow, no arbitrary value. */
    expect(utilities).toContain('bg-surface-1');
    expect(utilities).toContain('border-hairline');
    expect(utilities).toContain('text-text-primary');
    for (const utility of utilities) {
      expect(utility).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|\[.+\]/iu);
      expect(utility).not.toContain('shadow');
    }
  });

  it('positions itself at the mark’s own share of the drawing', () => {
    render(<ChartReadout anchor={anchorAt(25, 40)} title="the reported day" lines={READINGS} />);

    const style = screen.getByRole('tooltip').getAttribute('style') ?? '';

    expect(style).toContain('left: 25%');
    expect(style).toContain('top: 40%');
  });
});

/* ---------------------------------------------------------------------------------------------
 * Where it is allowed to paint
 * ------------------------------------------------------------------------------------------- */

describe('chartReadoutPlacement', () => {
  it('centres itself above a mark in the middle of the drawing', () => {
    const placement = chartReadoutPlacement(anchorAt(50, 60));

    expect(placement.left).toBe('50%');
    expect(placement.top).toBe('60%');
    expect(placement.transform).toBe(`translate(-50%, calc(-100% - ${GAP}))`);
    expect(placement.maxWidth).toBe('100%');
  });

  it('flips to the anchor’s own side near the right edge, so it never leaves the drawing', () => {
    const placement = chartReadoutPlacement(anchorAt(88, 60));

    expect(placement.left).toBe('88%');
    expect(placement.transform).toBe(`translate(-100%, calc(-100% - ${GAP}))`);
    /* The room that remains to the left of the anchor is the widest the box may ever be. */
    expect(placement.maxWidth).toBe('88%');
  });

  it('grows rightwards near the start edge instead of overhanging it', () => {
    const placement = chartReadoutPlacement(anchorAt(10, 60));

    expect(placement.transform).toBe(`translate(0, calc(-100% - ${GAP}))`);
    expect(placement.maxWidth).toBe('90%');
  });

  it('drops below a mark near the top edge rather than painting above the drawing', () => {
    const placement = chartReadoutPlacement(anchorAt(50, 4));

    expect(placement.top).toBe('4%');
    expect(placement.transform).toBe(`translate(-50%, ${GAP})`);
  });

  it('clamps an anchor outside the drawing to its own edge', () => {
    const beyondEnd = chartReadoutPlacement({
      x: VIEW_BOX_WIDTH * 2,
      y: -VIEW_BOX_HEIGHT,
      viewBoxWidth: VIEW_BOX_WIDTH,
      viewBoxHeight: VIEW_BOX_HEIGHT,
    });

    expect(beyondEnd.left).toBe('100%');
    expect(beyondEnd.top).toBe('0%');

    const negative = chartReadoutPlacement(anchorAt(-30, 140));

    expect(negative.left).toBe('0%');
    expect(negative.top).toBe('100%');
  });

  it('keeps a drawing with no stated box anchored at its own origin', () => {
    const placement = chartReadoutPlacement({
      x: 10,
      y: 10,
      viewBoxWidth: 0,
      viewBoxHeight: 0,
    });

    expect(placement.left).toBe('0%');
    expect(placement.top).toBe('0%');
  });
});

/* ---------------------------------------------------------------------------------------------
 * The target a mark draws
 * ------------------------------------------------------------------------------------------- */

describe('chartTargetRadius', () => {
  /** The radius a drawing falls back to when nothing has been measured. */
  const BASE_RADIUS = 12;

  /** The room a point has before it meets its neighbour, in the drawing's own units. */
  const SLOT = 47;

  it('keeps the drawing’s own base radius while nothing has been measured', () => {
    expect(chartTargetRadius(null, BASE_RADIUS, SLOT)).toBe(BASE_RADIUS);
    expect(chartTargetRadius(0, BASE_RADIUS, SLOT)).toBe(BASE_RADIUS);
  });

  it('grows the target until it is the minimum CSS size across, where the slot has the room', () => {
    /* A drawing rendered at half its natural width needs twice the units for the same pixels, and a
       slot wider than that leaves it the room it needs. */
    const radius = chartTargetRadius(0.5, BASE_RADIUS, SLOT * 2);

    expect(radius).toBe(MIN_TARGET_DIAMETER_PX / 2 / 0.5);
    expect(radius * 2 * 0.5).toBe(MIN_TARGET_DIAMETER_PX);
  });

  it('keeps a drawing rendered larger than its natural width at its base radius', () => {
    expect(chartTargetRadius(2, BASE_RADIUS, SLOT)).toBe(BASE_RADIUS);
  });

  it('holds the target inside the room its mark has, rather than over a neighbour', () => {
    /* A narrow panel: 24 CSS px would need more units than the slot leaves between two points. */
    const radius = chartTargetRadius(0.25, BASE_RADIUS, SLOT);

    expect(radius).toBe(SLOT / 2);
  });

  it('never reports a radius below the drawing’s own base', () => {
    expect(chartTargetRadius(0.25, BASE_RADIUS, 4)).toBe(BASE_RADIUS);
  });

  it('is unbounded where the chart resolves a pointer to the nearest mark', () => {
    const radius = chartTargetRadius(0.25, BASE_RADIUS, Number.POSITIVE_INFINITY);

    expect(radius).toBe(MIN_TARGET_DIAMETER_PX / 2 / 0.25);
  });
});
