/**
 * Component suite for `line-chart.tsx`, the SVG line surface of SCR-01's fourteen-day counts, SCR-03's
 * projected stock and the FileMap canvas dock.
 *
 * Each case asserts a clause the surface is relied on for rather than its markup: the accessible name
 * that says which series it draws, one path per series, the dashed path that tells a baseline from a
 * selected option without relying on colour, the zero reference and the band and marker labels the
 * caller supplies, a domain whose bottom never rises above zero while a negative value is still drawn
 * truthfully below the zero line (the `T-03` cases — the acceptance test's "never below zero" reading,
 * asserted here on the chart's own geometry because the solver's series is asserted in the solver's
 * suite), one step of headroom above the highest reading so the top of a series is labelled and drawn
 * clear of the plot's border, the dotted reference rule that stays separable from a baseline resting on
 * the same level, the layered pointer targets that keep a coincident mark reachable, one focusable and
 * named evidence mark per point, activation of that mark from the keyboard and from a pointer opening
 * exactly that point's drawer, the caller-owned activation that reports the point instead and opens no
 * drawer at all, the read-out a mark answers with on focus and on pointer entry — its series, its date
 * and its own formatted value, every series reading on the active date together so two marks drawn at
 * one centre are both reportable, and the ring revealed on that date alone — the visible legend that
 * names every series beside its own tone's swatch and every shaded span beside its own surface swatch,
 * the series' own simulation label read out per row and never invented, both themes, and the fact that
 * the surface emits no frame, table or control of its own.
 *
 * The service is mocked at `service-provider.tsx`, the one boundary `EvidenceDrawer` reads through
 * (rule P-2), so no adapter, seed module or network is involved and the suite observes exactly the
 * reference the chart passes for the point a reader activated. The read never settles: the drawer's
 * open state, not its payload, is what this surface owns, so the case needs no evidence record.
 *
 * Dates are built from the imported `DEMO_CLOCK` rather than typed, and point labels are plain words
 * rather than amounts: the `no-typed-figures` source check reads `src/components` (rule P-6), and the
 * formatted label a real caller passes is that caller's own text anyway. Runs under the jsdom
 * environment `vite.config.ts` sets; nothing here hashes, reads the clock or reaches the network.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_CLOCK, SIM_LABELS } from '../types';
import type { IsoDate, SimLabel } from '../types';
import { CHART_TONE_CLASSES } from './horizontal-bar-chart';
import { LineChart } from './line-chart';
import type {
  LineBand,
  LineChartProps,
  LineMarker,
  LinePoint,
  LineReference,
  LineSeriesSpec,
} from './line-chart';

/**
 * The port member the drawer sends its read through, replaced before the component modules load so
 * the real provider — and with it the in-browser adapter's seeded records — is never reached from a
 * component test (rule P-2).
 */
const getEvidence = vi.hoisted(() => vi.fn());

vi.mock('../services/service-provider', () => ({
  useService: () => ({ getEvidence }),
}));

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/* ---------------------------------------------------------------------------------------------
 * The records this suite draws
 * ------------------------------------------------------------------------------------------- */

/** The year and month of the demonstration clock, so no date literal is typed in this folder. */
const DAY_PREFIX = DEMO_CLOCK.slice(0, 8);

/** A date in the demonstration clock's own month, built from its stated day. */
function dayStamp(day: string): IsoDate {
  return `${DAY_PREFIX}${day}`;
}

/** The five days the two series below cover between them. */
const FIRST_DAY = dayStamp('05');
const SECOND_DAY = dayStamp('06');
const THIRD_DAY = dayStamp('07');
const FOURTH_DAY = dayStamp('08');
const FIFTH_DAY = dayStamp('09');

/** The labels the caller's own formatter produced, kept as plain words for the reason above. */
const AHEAD_OF_PLAN = 'ahead of plan';
const AT_PLAN = 'at plan';
const BELOW_PLAN = 'below plan';
const RECOVERING = 'recovering';
const RESTOCKED = 'restocked';

/** The baseline series' name, its evidence references and its points. */
const BASELINE_LABEL = 'Baseline projection';

const BASELINE_POINTS: readonly LinePoint[] = [
  { x: FIRST_DAY, y: 12, yLabel: AHEAD_OF_PLAN, evidenceRef: 'evidence-baseline-one' },
  { x: SECOND_DAY, y: 9, yLabel: AT_PLAN, evidenceRef: 'evidence-baseline-two' },
  { x: THIRD_DAY, y: 6, yLabel: BELOW_PLAN, evidenceRef: 'evidence-baseline-three' },
  { x: FOURTH_DAY, y: 4, yLabel: RECOVERING, evidenceRef: 'evidence-baseline-four' },
  { x: FIFTH_DAY, y: 7, yLabel: RESTOCKED, evidenceRef: 'evidence-baseline-five' },
];

/** The selected option's name and its points: two of the same days, drawn over a narrower span. */
const OPTION_LABEL = 'Selected option';

const OPTION_POINTS: readonly LinePoint[] = [
  { x: SECOND_DAY, y: 14, yLabel: AHEAD_OF_PLAN, evidenceRef: 'evidence-option-one' },
  { x: THIRD_DAY, y: 11, yLabel: AT_PLAN, evidenceRef: 'evidence-option-two' },
];

/**
 * One of the seven fixed simulation labels, read from `SIM_LABELS` rather than retyped, so a reworded
 * label cannot leave this suite asserting a string the interface no longer shows (rule P-1).
 */
function simLabelAt(index: number): SimLabel {
  const label = SIM_LABELS[index];
  if (label === undefined) {
    throw new Error(`no simulation label is defined at index ${index}`);
  }
  return label;
}

/** The label a series of computed figures carries (specification §5.3). */
const CALCULATION_LABEL = simLabelAt(1);

/** The baseline: dashed, accented, and carrying its own simulation label. */
const BASELINE: LineSeriesSpec = {
  id: 'baseline',
  label: BASELINE_LABEL,
  tone: 'accent',
  dashed: true,
  simLabel: CALCULATION_LABEL,
  points: BASELINE_POINTS,
};

/**
 * The selected option: solid and warning-toned, with no simulation label of its own, which is what
 * proves the surface reads a label out where it is given and invents none where it is not.
 */
const OPTION: LineSeriesSpec = {
  id: 'option',
  label: OPTION_LABEL,
  tone: 'warning',
  points: OPTION_POINTS,
};

/** The zero line SCR-03 requires, as the caller supplies it. */
const ZERO_LABEL = 'Zero';
const REFERENCES: readonly LineReference[] = [{ y: 0, label: ZERO_LABEL }];

/** The idle window the solver reports, shaded and labelled by the caller. */
const BAND_LABEL = 'Idle window';
const BANDS: readonly LineBand[] = [{ from: SECOND_DAY, to: THIRD_DAY, label: BAND_LABEL }];

/** A customer order's due date, marked on the axis by the caller. */
const MARKER_LABEL = 'Order due';
const MARKERS: readonly LineMarker[] = [{ x: THIRD_DAY, label: MARKER_LABEL }];

/** The x and y axis names a caller may add. */
const X_AXIS_LABEL = 'Day';
const Y_AXIS_LABEL = 'Units on hand';

/**
 * The fifteen working days SCR-03's projection covers: three weeks of Monday to Friday, so the gap
 * between two neighbouring dates is one day inside a week and three across a weekend.
 */
const WORKING_DAYS: readonly IsoDate[] = [
  '03',
  '04',
  '07',
  '08',
  '09',
  '10',
  '11',
  '14',
  '15',
  '16',
  '17',
  '18',
  '21',
  '22',
  '23',
].map(dayStamp);

/** The overview's calendar: fourteen consecutive days, so every gap between two dates is one day. */
const CONSECUTIVE_DAYS: readonly IsoDate[] = Array.from({ length: 14 }, (_, index) =>
  dayStamp(String(index + 3).padStart(2, '0')),
);

/* ---------------------------------------------------------------------------------------------
 * Reading the surface
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders the surface inside the query cache its drawer needs, with a fresh cache per render so one
 * case cannot observe another's read.
 */
function renderChart(props: LineChartProps): HTMLElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const view: ReactElement = (
    <QueryClientProvider client={queryClient}>
      <LineChart {...props} />
    </QueryClientProvider>
  );

  return render(view).container;
}

/** The surface's `<svg>`, or a failure naming what is missing rather than a silent null. */
function surfaceOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error('the surface rendered no <svg>');
  }
  return svg;
}

/** Every point mark, as the focusable groups the surface draws one of per point. */
function pointMarks(svg: SVGSVGElement): SVGGElement[] {
  return Array.from(svg.querySelectorAll<SVGGElement>('g[role="button"]'));
}

/** The y coordinate a mark's dot sits at. */
function markCentre(mark: SVGGElement): number {
  const cy = mark.querySelector('circle')?.getAttribute('cy');
  if (cy === undefined || cy === null) {
    throw new Error('a point mark drew no dot');
  }
  return Number(cy);
}


/**
 * The pointer-state utilities one class list declares, filtered by their prefix rather than matched as a
 * whole string, so a legitimate token change inside a state cannot fail the case while the requirement —
 * a hover and a pressed treatment built from role tokens — still holds.
 */
function pointerStates(classList: string): readonly string[] {
  return classList
    .split(' ')
    .filter((utility) => utility.startsWith('group-hover:') || utility.startsWith('group-active:'));
}

/** The y coordinate of the zero reference line the caller supplied. */
function zeroLineY(container: HTMLElement): number {
  const label = screen.getByText(ZERO_LABEL);
  const line = label.closest('g')?.querySelector('line');
  const y1 = line?.getAttribute('y1');
  if (y1 === undefined || y1 === null) {
    throw new Error('the zero reference drew no line beside its label');
  }
  return Number(y1);
}

/** The nearest ancestor element that carries a class list, which is where a mark's role is set. */
function classedAncestor(element: Element): Element | null {
  let current = element.parentElement;

  while (current !== null && current.getAttribute('class') === null) {
    current = current.parentElement;
  }

  return current;
}

/** The readings the y axis labels, which are the domain's own values. */
function yAxisReadings(svg: SVGSVGElement): string[] {
  return Array.from(svg.querySelectorAll('text[text-anchor="end"]')).map(
    (node) => node.textContent ?? '',
  );
}

/**
 * The advance a ten-character ISO date takes across the plot, in viewBox units: the axis' own
 * twelve-unit mono type step, which is the box a label occupies and the reason two neighbouring
 * labels can collide. It is stated here as the reading a reader's eye gives the axis — two dates drawn
 * closer together than this paint over one another — rather than read back from the surface, so a
 * surface that thinned its labels by a count and left neighbours overlapping fails this suite instead
 * of describing itself.
 */
const DATE_LABEL_ADVANCE = 72;

/** One series over a calendar, one reading per date, so the surface has to place every one of them. */
function seriesOver(calendar: readonly IsoDate[]): LineSeriesSpec {
  return {
    id: 'projection',
    label: BASELINE_LABEL,
    tone: 'accent',
    points: calendar.map((date, index) => ({
      x: date,
      y: index,
      yLabel: AT_PLAN,
      evidenceRef: `evidence-projection-${String(index)}`,
    })),
  };
}

/** The surface's date labels: the text nodes carrying one of the calendar's own dates. */
function dateLabelsIn(svg: SVGSVGElement, calendar: readonly IsoDate[]): SVGTextElement[] {
  const dates = new Set<string>(calendar);

  return Array.from(svg.querySelectorAll<SVGTextElement>('text')).filter((node) =>
    dates.has(node.textContent ?? ''),
  );
}

/**
 * The box one date label draws into: read from its own `x`, the anchor it is given, and the advance a
 * date takes — a centred label reaches half that advance either side of its tick, and a label anchored
 * to its end reaches a whole advance back from it and nothing forward.
 */
function labelBox(label: SVGTextElement): { readonly left: number; readonly right: number } {
  const position = Number(label.getAttribute('x'));

  if (!Number.isFinite(position)) {
    throw new Error('an x label drew no readable x coordinate');
  }

  return label.getAttribute('text-anchor') === 'end'
    ? { left: position - DATE_LABEL_ADVANCE, right: position }
    : { left: position - DATE_LABEL_ADVANCE / 2, right: position + DATE_LABEL_ADVANCE / 2 };
}

/**
 * The x label at a position, or a failure naming what was missing, since `noUncheckedIndexedAccess`
 * makes every indexed read a possible absence.
 */
function labelAt(labels: readonly SVGTextElement[], index: number): SVGTextElement {
  const label = labels[index];

  if (label === undefined) {
    throw new Error(`the x label at position ${String(index)} is missing`);
  }

  return label;
}

/**
 * The legend row at a position, or a failure naming what was missing.
 *
 * `noUncheckedIndexedAccess` makes every indexed read a possible absence, and a case that reached for a
 * missing row would otherwise compare against `undefined` and report the wrong thing.
 */
function legendRowAt(rows: readonly HTMLElement[], index: number): HTMLElement {
  const row = rows[index];

  if (row === undefined) {
    throw new Error(`the legend row at position ${String(index)} is missing`);
  }

  return row;
}

/*
 * The read never settles: this surface owns the drawer's open state, not the evidence behind it, and a
 * reference the records do not hold is not what these cases are about.
 */
beforeEach(() => {
  getEvidence.mockClear();
  getEvidence.mockImplementation(() => new Promise<never>(() => undefined));
});

/* ---------------------------------------------------------------------------------------------
 * The cases
 * ------------------------------------------------------------------------------------------- */

describe('LineChart', () => {
  it('names the surface after the series it draws and gives each series one path', () => {
    const container = renderChart({ series: [BASELINE, OPTION] });

    const svg = screen.getByRole('group', {
      name: `Line chart: ${BASELINE_LABEL}, ${OPTION_LABEL}`,
    });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(surfaceOf(container).querySelectorAll('path')).toHaveLength(2);
  });

  it('dashes the path of the series that asks for it and leaves the other one solid', () => {
    const container = renderChart({ series: [BASELINE, OPTION] });
    const svg = surfaceOf(container);

    expect(svg.querySelectorAll('path[stroke-dasharray]')).toHaveLength(1);
    expect(svg.querySelectorAll('path:not([stroke-dasharray])')).toHaveLength(1);
  });

  it('draws the zero reference with its own label in the secondary text role', () => {
    const container = renderChart({ series: [BASELINE], references: REFERENCES });

    const label = screen.getByText(ZERO_LABEL);
    /* The label and its line inherit the secondary text role from the group carrying the reference. */
    expect(classedAncestor(label)?.getAttribute('class')).toContain('text-text-secondary');

    const line = label.closest('g')?.querySelector('line');
    expect(line).not.toBeNull();
    expect(line?.getAttribute('stroke-dasharray')).toBeTruthy();
  });

  it('shades each band and marks each due date with the label the caller supplied', () => {
    const container = renderChart({ series: [BASELINE], bands: BANDS, markers: MARKERS });
    const svg = surfaceOf(container);

    /* The span is named twice: painted inside the plot, and read out in its own legend row below it. */
    const bandLabels = screen.getAllByText(BAND_LABEL);
    expect(bandLabels.some((label) => svg.contains(label))).toBe(true);
    expect(bandLabels.some((label) => !svg.contains(label))).toBe(true);
    expect(screen.getAllByText(MARKER_LABEL)).toHaveLength(1);

    const band = svg.querySelector('rect');
    expect(band).not.toBeNull();
    expect(Number(band?.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(band?.getAttribute('height'))).toBeGreaterThan(0);
  });

  it('keeps a band name wider than the plot out of the surface and the whole of it in the title', () => {
    const overlong =
      'A shaded span whose name runs far beyond the plot it is drawn in, and keeps running past the surface it is painted on';
    const container = renderChart({
      series: [BASELINE],
      bands: [{ from: SECOND_DAY, to: THIRD_DAY, label: overlong }],
    });
    const shortened = [...surfaceOf(container).querySelectorAll('text')].filter((text) =>
      (text.lastChild?.textContent ?? '').endsWith('…'),
    );

    expect(shortened.length).toBeGreaterThan(0);
    /* The drawn run is shorter than the caller's wording, and the wording itself is still there. */
    expect(shortened[0]?.querySelector('title')?.textContent).toBe(overlong);
  });

  it('anchors a due-date label on the window’s last day to its own end, so none of it leaves the plot', () => {
    renderChart({
      series: [BASELINE],
      markers: [{ x: FIFTH_DAY, label: MARKER_LABEL }],
    });
    const label = screen.getByText(MARKER_LABEL);

    /* Centred, half of the run would sit past the plot's own right edge and be cut by the surface. */
    expect(label.getAttribute('text-anchor')).toBe('end');
  });

  it('names a shaded span in a legend row of its own, beside the span’s own surface swatch', () => {
    renderChart({ series: [BASELINE], bands: BANDS });

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(legendRowAt(rows, 0)).getByText(BASELINE_LABEL)).toBeInTheDocument();

    /* The span's row follows the series' rows and names it in the same type step and role (rule B-3). */
    const bandRow = legendRowAt(rows, 1);
    const label = within(bandRow).getByText(BAND_LABEL);
    expect(label.getAttribute('class')).toContain('text-13');
    expect(label.getAttribute('class')).toContain('text-text-primary');

    /* Its swatch is the span's own surface role rather than a series' tone, and it stays decorative. */
    const swatch = bandRow.querySelector('[aria-hidden="true"]');
    expect(swatch?.getAttribute('class')).toContain('bg-surface-2');
    expect(swatch?.getAttribute('class')).toContain('border-hairline');
    expect(swatch?.getAttribute('class')).toContain('rounded-control');
    expect(swatch?.getAttribute('class')).toContain('size-3');

    /* A shaded region is not a control, so its row adds no focus stop. */
    expect(within(bandRow).queryAllByRole('button')).toHaveLength(0);
  });

  it('renders only its series’ rows where the caller supplies no bands', () => {
    renderChart({ series: [BASELINE, OPTION] });

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(legendRowAt(rows, 1)).getByText(OPTION_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(BAND_LABEL)).toBeNull();
  });

  it('T-03 keeps zero inside the drawn domain, with no mark below the zero line, where no yMin is given', () => {
    const HIGH: LinePoint = {
      x: FIRST_DAY,
      y: 12,
      yLabel: AHEAD_OF_PLAN,
      evidenceRef: 'evidence-high',
    };
    const ABOVE: LinePoint = {
      x: SECOND_DAY,
      y: 10,
      yLabel: AT_PLAN,
      evidenceRef: 'evidence-above',
    };
    const LOWER: LinePoint = {
      x: THIRD_DAY,
      y: 6,
      yLabel: BELOW_PLAN,
      evidenceRef: 'evidence-lower',
    };
    const series: LineSeriesSpec = {
      id: 'stock',
      label: BASELINE_LABEL,
      tone: 'accent',
      points: [HIGH, ABOVE, LOWER],
    };

    const container = renderChart({ series: [series], references: REFERENCES });
    const svg = surfaceOf(container);

    /* Every plotted value is above zero, and zero is still one of the axis' own readings. */
    expect(yAxisReadings(svg)).toContain('0');

    /* The zero line falls inside the surface's drawing box rather than at or past its edge. */
    const zeroY = zeroLineY(container);
    const boxHeight = Number(svg.getAttribute('viewBox')?.split(' ')[3]);
    expect(Number.isFinite(boxHeight)).toBe(true);
    expect(zeroY).toBeGreaterThan(0);
    expect(zeroY).toBeLessThan(boxHeight);

    /* No drawn mark places a point below it, so the floor never rose to the data's own minimum. */
    const marks = pointMarks(svg);
    expect(marks).toHaveLength(3);
    for (const mark of marks) {
      expect(markCentre(mark)).toBeLessThan(zeroY);
    }
  });

  it('T-03 clamps a positive yMin so the floor never rises above zero', () => {
    const LOWER: LinePoint = {
      x: FIRST_DAY,
      y: 40,
      yLabel: AHEAD_OF_PLAN,
      evidenceRef: 'evidence-lower',
    };
    const HIGHEST: LinePoint = {
      x: SECOND_DAY,
      y: 90,
      yLabel: AT_PLAN,
      evidenceRef: 'evidence-highest',
    };
    const series: LineSeriesSpec = {
      id: 'stock',
      label: BASELINE_LABEL,
      tone: 'accent',
      points: [LOWER, HIGHEST],
    };

    const container = renderChart({ series: [series], references: REFERENCES, yMin: 500 });
    const svg = surfaceOf(container);

    /* The supplied floor is above zero and every value is above it, yet zero is still drawn. */
    expect(yAxisReadings(svg)).toContain('0');

    const zeroY = zeroLineY(container);
    for (const mark of pointMarks(svg)) {
      expect(markCentre(mark)).toBeLessThan(zeroY);
    }
  });

  it('T-03 draws a point below zero truthfully and names it rather than clipping it', () => {
    const ABOVE: LinePoint = {
      x: FIRST_DAY,
      y: 10,
      yLabel: AHEAD_OF_PLAN,
      evidenceRef: 'evidence-above-zero',
    };
    const BELOW_ZERO: LinePoint = {
      x: SECOND_DAY,
      y: -4,
      yLabel: BELOW_PLAN,
      evidenceRef: 'evidence-below-zero',
    };
    const series: LineSeriesSpec = {
      id: 'stock',
      label: BASELINE_LABEL,
      tone: 'accent',
      points: [ABOVE, BELOW_ZERO],
    };

    const container = renderChart({ series: [series], references: REFERENCES });
    const svg = surfaceOf(container);
    const zeroY = zeroLineY(container);

    const marks = pointMarks(svg);
    expect(marks).toHaveLength(2);

    const [positive, negative] = marks;
    expect(positive).toBeDefined();
    expect(negative).toBeDefined();
    if (positive === undefined || negative === undefined) {
      return;
    }

    /* The negative value is drawn truthfully below the zero line rather than clipped to it. */
    expect(markCentre(positive)).toBeLessThan(zeroY);
    expect(markCentre(negative)).toBeGreaterThan(zeroY);

    /* And it is still a named mark, so a chart that clamped the value could not pass by moving it. */
    expect(negative.getAttribute('aria-label')).toBe(
      `${BASELINE_LABEL}, ${SECOND_DAY}: ${BELOW_PLAN}`,
    );
    expect(yAxisReadings(svg)).toContain('0');
  });

  it('labels a reading above the highest plotted value and draws that value clear of the top border', () => {
    const EMPTY: LinePoint = {
      x: FIRST_DAY,
      y: 0,
      yLabel: RESTOCKED,
      evidenceRef: 'evidence-empty',
    };
    const PEAK: LinePoint = {
      x: SECOND_DAY,
      y: 1200,
      yLabel: AHEAD_OF_PLAN,
      evidenceRef: 'evidence-peak',
    };
    const series: LineSeriesSpec = {
      id: 'stock',
      label: BASELINE_LABEL,
      tone: 'accent',
      points: [EMPTY, PEAK],
    };

    const container = renderChart({ series: [series] });
    const svg = surfaceOf(container);

    /* A reading above the highest plotted value is labelled, so the top of the series can be read off
       the axis, and zero stays among the readings even though nothing is plotted at it. */
    const readings = yAxisReadings(svg);
    expect(readings).toContain('0');
    expect(readings).toContain('1500');

    /* The topmost gridline is the plot's top border, and the highest mark is drawn below it. A domain
       that stopped at the highest reading would place the mark on that line instead. */
    const gridlines = Array.from(svg.querySelectorAll('line'))
      .filter((line) => line.getAttribute('y1') === line.getAttribute('y2'))
      .map((line) => Number(line.getAttribute('y1')));
    const topBorder = Math.min(...gridlines);
    const highestMark = Math.min(...pointMarks(svg).map(markCentre));

    expect(Number.isFinite(topBorder)).toBe(true);
    expect(highestMark).toBeGreaterThan(topBorder);
  });

  it('gives every point a focusable mark named with its series, date and formatted value', () => {
    renderChart({ series: [BASELINE, OPTION] });

    const marks = screen.getAllByRole('button');
    expect(marks).toHaveLength(BASELINE_POINTS.length + OPTION_POINTS.length);

    for (const mark of marks) {
      expect(mark.getAttribute('tabindex')).toBe('0');
      expect(mark.getAttribute('class')).toContain('focus-visible:outline-focus-ring');
      expect(mark.getAttribute('aria-haspopup')).toBe('dialog');
    }

    const baselineMark = screen.getByRole('button', {
      name: `${BASELINE_LABEL}, ${FIRST_DAY}: ${AHEAD_OF_PLAN}`,
    });
    expect(baselineMark).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: `${OPTION_LABEL}, ${THIRD_DAY}: ${AT_PLAN}` }),
    ).toBeInTheDocument();
  });

  it('keeps a hidden focus ring and a full-size target on every mark', () => {
    renderChart({ series: [BASELINE] });

    const marks = screen.getAllByRole('button');
    expect(marks.length).toBeGreaterThan(0);

    for (const mark of marks) {
      /* The outline utility on the group, and a ring that appears only on keyboard focus. */
      expect(mark.getAttribute('class')).toContain('group');

      const ring = mark.querySelectorAll('circle')[1];
      expect(ring?.getAttribute('class')).toContain('opacity-0');
      expect(ring?.getAttribute('class')).toContain('group-focus-visible:opacity-100');

      /* The pointer target is 24 viewBox units across, the minimum rule B-3 sets. */
      const target = mark.querySelectorAll('circle')[2];
      expect(Number(target?.getAttribute('r')) * 2).toBeGreaterThanOrEqual(24);
    }
  });

  it('reveals the same ring under a hover and a press, and keeps the keyboard ring', () => {
    renderChart({ series: [BASELINE] });

    const marks = screen.getAllByRole('button');
    expect(marks.length).toBeGreaterThan(0);

    for (const mark of marks) {
      /* The keyboard indicator on the group is untouched by the pointer states. */
      expect(mark.getAttribute('class')).toContain('focus-visible:outline-focus-ring');

      const ringClasses = mark.querySelectorAll('circle')[1]?.getAttribute('class') ?? '';
      const states = pointerStates(ringClasses);

      expect(states.some((utility) => utility.startsWith('group-hover:'))).toBe(true);
      expect(states.some((utility) => utility.startsWith('group-active:'))).toBe(true);
      for (const utility of states) {
        /* Every state names a role-token property: no palette literal, no arbitrary value, no shadow. */
        expect(utility.slice(utility.lastIndexOf(':') + 1)).toMatch(/^(fill|stroke|opacity)-[a-z0-9]/u);
        expect(utility).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|\[.+\]/iu);
        expect(utility).not.toContain('shadow');
      }

      /* The ring still answers the keyboard, and the fade is the one a reduced-motion session skips. */
      expect(ringClasses).toContain('group-focus-visible:opacity-100');
      expect(ringClasses).toContain('motion-safe:transition-opacity');
    }
  });

  it('keeps a baseline that lies on the reference level separable from it, and both marks reachable', () => {
    const FLAT_READING = 'no stock on hand';
    const levelPoints = (prefix: string): readonly LinePoint[] =>
      [FIRST_DAY, SECOND_DAY, THIRD_DAY].map((day, index) => ({
        x: day,
        y: 0,
        yLabel: FLAT_READING,
        evidenceRef: `${prefix}-${String(index)}`,
      }));
    const baselineSeries: LineSeriesSpec = {
      id: 'baseline',
      label: BASELINE_LABEL,
      tone: 'accent',
      dashed: true,
      points: levelPoints('evidence-baseline-level'),
    };
    const optionSeries: LineSeriesSpec = {
      id: 'option',
      label: OPTION_LABEL,
      tone: 'warning',
      points: levelPoints('evidence-option-level'),
    };

    const container = renderChart({
      series: [baselineSeries, optionSeries],
      references: REFERENCES,
    });
    const svg = surfaceOf(container);

    /* The rule draws with a pattern of its own rather than the dash a series uses, so a baseline
       resting on the level does not read as part of the line it rests on. */
    const rule = screen.getByText(ZERO_LABEL).closest('g')?.querySelector('line');
    const dashedPath = svg.querySelector('path[stroke-dasharray]');
    expect(rule?.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(rule?.getAttribute('stroke-dasharray')).not.toBe(
      dashedPath?.getAttribute('stroke-dasharray'),
    );

    const targetRadius = (mark: SVGGElement): number => {
      const radius = mark.querySelectorAll('circle')[2]?.getAttribute('r');
      if (radius === undefined || radius === null) {
        throw new Error('a point mark drew no pointer target');
      }
      return Number(radius);
    };
    const centreOf = (mark: SVGGElement): string => {
      const dot = mark.querySelector('circle');
      return `${dot?.getAttribute('cx') ?? ''}/${dot?.getAttribute('cy') ?? ''}`;
    };

    const marks = pointMarks(svg);
    expect(marks).toHaveLength(baselineSeries.points.length + optionSeries.points.length);

    /* The two series share their points, which is what makes the targets the thing that separates them. */
    const centres = marks.map(centreOf);
    expect(centres.slice(0, baselineSeries.points.length)).toEqual(
      centres.slice(baselineSeries.points.length),
    );

    /* The series painted first keeps a target wider than the one over it, so its mark answers a ring of
       its own; the mark painted over it keeps the minimum target rule B-3 sets. */
    const radii = marks.map(targetRadius);
    const widest = Math.max(...radii);
    const narrowest = Math.min(...radii);
    expect(widest).toBeGreaterThan(narrowest);
    expect(radii.filter((radius) => radius === widest)).toHaveLength(baselineSeries.points.length);
    expect(radii.filter((radius) => radius === narrowest)).toHaveLength(optionSeries.points.length);
    expect(narrowest * 2).toBeGreaterThanOrEqual(24);
  });

  it('opens the activated point\'s evidence from the keyboard, and that point\'s alone', () => {
    renderChart({ series: [BASELINE] });

    const [first, second] = screen.getAllByRole('button');
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) {
      return;
    }

    const notCancelled = fireEvent.keyDown(second, { key: 'Enter' });
    expect(notCancelled).toBe(false);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(second.getAttribute('aria-expanded')).toBe('true');
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(getEvidence).toHaveBeenCalledWith(BASELINE_POINTS[1]?.evidenceRef);
    expect(getEvidence).toHaveBeenCalledTimes(1);
  });

  it('opens the evidence from Space, and closes the drawer without touching the service again', async () => {
    const user = userEvent.setup();
    renderChart({ series: [BASELINE] });

    const [first] = screen.getAllByRole('button');
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }

    /* `Space` is prevented from scrolling, exactly as a native button does. */
    expect(fireEvent.keyDown(first, { key: ' ' })).toBe(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getEvidence).toHaveBeenCalledTimes(1);
  });

  it('opens a point’s evidence on a pointer click as well', async () => {
    const user = userEvent.setup();
    renderChart({ series: [OPTION] });

    const [first] = screen.getAllByRole('button');
    expect(first).toBeDefined();
    if (first === undefined) {
      return;
    }

    await user.click(first);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledWith(OPTION_POINTS[0]?.evidenceRef);
  });

  it('reports the activated point and opens no drawer where the caller owns the activation', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn<(point: LinePoint, series: LineSeriesSpec) => void>();
    const actionName = (point: LinePoint): string => `Narrow to ${point.x}`;

    renderChart({ series: [BASELINE, OPTION], activation: { onActivate, actionName } });

    /* The name ends with the action the caller's activation performs, so a screen-reader user hears
       what activating the mark does rather than a dialog it no longer opens (rules P-8 and B-3). */
    const mark = screen.getByRole('button', {
      name: `${BASELINE_LABEL}, ${SECOND_DAY}: ${AT_PLAN}. Narrow to ${SECOND_DAY}`,
    });

    expect(mark).not.toHaveAttribute('aria-haspopup');
    expect(mark).not.toHaveAttribute('aria-expanded');
    expect(mark).not.toHaveAttribute('aria-controls');

    /* One path for both inputs: the pointer click and `Enter` report the same point and series. */
    await user.click(mark);
    expect(fireEvent.keyDown(mark, { key: 'Enter' })).toBe(false);

    expect(onActivate).toHaveBeenCalledTimes(2);

    for (const [point, series] of onActivate.mock.calls) {
      expect(point).toBe(BASELINE_POINTS[1]);
      expect(series).toBe(BASELINE);
    }

    /* The handler owns the gesture, so this surface opens nothing and reads no evidence. */
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getEvidence).not.toHaveBeenCalled();
  });

  it('reads each series’ own simulation label out and invents none for a series without one', () => {
    renderChart({ series: [BASELINE, OPTION] });

    const rows = screen.getAllByRole('listitem');

    /* Each row carries its own series' exact label, and only the series that declares one has it. */
    expect(legendRowAt(rows, 0)).toHaveTextContent(`${BASELINE_LABEL}, ${CALCULATION_LABEL}`);
    expect(legendRowAt(rows, 1)).toHaveTextContent(OPTION_LABEL);
    expect(legendRowAt(rows, 1)).not.toHaveTextContent(CALCULATION_LABEL);
    expect(screen.queryByText(`${OPTION_LABEL}, ${CALCULATION_LABEL}`)).toBeNull();
  });

  it('shows a visible legend naming every series beside its own tone’s swatch', () => {
    renderChart({ series: [BASELINE, OPTION] });

    const legend = screen.getByRole('list');

    /* The list is painted rather than screen-reader-only, and its rows wrap at a narrow width. */
    expect(legend).not.toHaveClass('sr-only');
    expect(legend.getAttribute('class')).toContain('flex-wrap');

    const rows = within(legend).getAllByRole('listitem');
    expect(rows).toHaveLength(2);

    [BASELINE, OPTION].forEach((spec, index) => {
      const row = legendRowAt(rows, index);
      const label = within(row).getByText(spec.label);

      /* The series' name is visible text in the primary role, at the legend's own type step (B-3). */
      expect(label).not.toHaveClass('sr-only');
      expect(label.getAttribute('class')).toContain('text-13');
      expect(label.getAttribute('class')).toContain('text-text-primary');
      expect(label.getAttribute('class')).toContain('break-words');

      /* The swatch resolves the same tone the series' path draws, from the one tone table. */
      const swatch = row.querySelector('[aria-hidden="true"]');
      expect(swatch?.getAttribute('class')).toContain(CHART_TONE_CLASSES[spec.tone].swatch);
    });

    /* Provenance still reaches a reader per series, in the row that names it (rules P-1, P-5). */
    expect(within(legendRowAt(rows, 0)).getByText(`, ${CALCULATION_LABEL}`)).toBeInTheDocument();
  });

  it('labels a working-day calendar by the room each date needs, and never overlaps two labels', () => {
    const container = renderChart({ series: [seriesOver(WORKING_DAYS)] });
    const svg = surfaceOf(container);

    const labels = dateLabelsIn(svg, WORKING_DAYS);

    /* A working calendar's gaps are uneven, so the axis keeps a label wherever the plot has room for
       one rather than one date in every n: SCR-03's fifteen days carry at least six dates here, while
       the count that thinned them to five made the span unreadable and the count of eight overlapped. */
    expect(labels.length).toBeGreaterThanOrEqual(6);

    /* No two neighbouring labels paint over one another: each box starts past the previous one's end. */
    for (let index = 1; index < labels.length; index += 1) {
      const previous = labelBox(labelAt(labels, index - 1));
      const box = labelBox(labelAt(labels, index));

      expect(box.left).toBeGreaterThan(previous.right);
    }

    /* The axis still ends where the data ends, so the final date is one of the labelled dates. */
    const [finalDay] = WORKING_DAYS.slice(-1);
    expect(labelAt(labels, labels.length - 1).textContent).toBe(finalDay);
  });

  it('labels a uniform calendar densely and without overlap as well', () => {
    const container = renderChart({ series: [seriesOver(CONSECUTIVE_DAYS)] });
    const svg = surfaceOf(container);

    const labels = dateLabelsIn(svg, CONSECUTIVE_DAYS);

    /* Evenly spaced days need no thinning by count either: the axis keeps every date it has room for. */
    expect(labels.length).toBeGreaterThanOrEqual(5);

    for (let index = 1; index < labels.length; index += 1) {
      const previous = labelBox(labelAt(labels, index - 1));
      const box = labelBox(labelAt(labels, index));

      expect(box.left).toBeGreaterThan(previous.right);
    }
  });

  it('labels both axes where the caller names them', () => {
    renderChart({
      series: [BASELINE],
      xAxisLabel: X_AXIS_LABEL,
      yAxisLabel: Y_AXIS_LABEL,
    });

    expect(screen.getByText(X_AXIS_LABEL)).toBeInTheDocument();
    expect(screen.getByText(Y_AXIS_LABEL)).toBeInTheDocument();
  });

  it('draws an empty surface for a chart with no series and still names it', () => {
    const container = renderChart({ series: [] });
    const svg = surfaceOf(container);

    expect(svg.querySelectorAll('path')).toHaveLength(0);
    expect(pointMarks(svg)).toHaveLength(0);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('group', { name: 'Line chart' })).toBeInTheDocument();
  });

  it('draws no frame, table or control of its own', () => {
    const container = renderChart({
      series: [BASELINE],
      references: REFERENCES,
      bands: BANDS,
      markers: MARKERS,
    });

    expect(container.querySelector('figure')).toBeNull();
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('button')).toBeNull();
  });

  it('draws the same roles under both themes and never sets a style of its own', () => {
    const classListsUnder = (theme: (typeof THEMES)[number]): string[] => {
      document.documentElement.setAttribute('data-theme', theme);
      const container = renderChart({ series: [BASELINE, OPTION], references: REFERENCES });
      const svg = surfaceOf(container);

      for (const element of [svg, ...Array.from(svg.querySelectorAll('*'))]) {
        expect(element.getAttribute('style')).toBeNull();
      }

      return Array.from(svg.querySelectorAll('*')).map(
        (element) => element.getAttribute('class') ?? '',
      );
    };

    try {
      const command = classListsUnder('command');
      const paper = classListsUnder('paper');

      expect(paper).toEqual(command);
    } finally {
      document.documentElement.removeAttribute('data-theme');
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The read-out a mark answers with
 * ------------------------------------------------------------------------------------------- */

/**
 * Two series that both read zero on one day, which is exactly where their marks coincide: the second
 * series is painted over the first, so a surface that resolved the pointer to the topmost circle could
 * never report the first series' reading there.
 */
const COINCIDENT_DAY = THIRD_DAY;
const NOTHING_OPENED = 'nothing opened';
const NOTHING_RESOLVED = 'nothing resolved';
const OPENED_LABEL = 'Opened';
const RESOLVED_LABEL = 'Resolved';

const OPENED: LineSeriesSpec = {
  id: 'opened',
  label: OPENED_LABEL,
  tone: 'accent',
  points: [
    { x: SECOND_DAY, y: 4, yLabel: AT_PLAN, evidenceRef: 'evidence-opened-one' },
    { x: COINCIDENT_DAY, y: 0, yLabel: NOTHING_OPENED, evidenceRef: 'evidence-opened-two' },
  ],
};

const RESOLVED: LineSeriesSpec = {
  id: 'resolved',
  label: RESOLVED_LABEL,
  tone: 'pass',
  points: [
    { x: SECOND_DAY, y: 0, yLabel: NOTHING_RESOLVED, evidenceRef: 'evidence-resolved-one' },
    { x: COINCIDENT_DAY, y: 0, yLabel: NOTHING_RESOLVED, evidenceRef: 'evidence-resolved-two' },
  ],
};

/** The class utilities of one element, split so a variant cannot be mistaken for the state itself. */
function utilitiesOf(element: Element | null | undefined): readonly string[] {
  return (element?.getAttribute('class') ?? '').split(' ');
}

/** The ring one mark draws around its dot, which is the second circle of its group. */
function ringOf(mark: Element): Element | null {
  return mark.querySelectorAll('circle')[1] ?? null;
}

describe('the read-out a point answers with', () => {
  it('names its series, its date and its own formatted value on keyboard focus, and clears on blur', () => {
    renderChart({ series: [BASELINE] });

    const mark = screen.getByRole('button', {
      name: `${BASELINE_LABEL}, ${FIRST_DAY}: ${AHEAD_OF_PLAN}`,
    });
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.focus(mark);

    /* The read-out prints the mark's own strings — no figure is formatted here (rule P-6). */
    const readout = screen.getByRole('tooltip');
    expect(within(readout).getByText(BASELINE_LABEL)).toBeInTheDocument();
    expect(within(readout).getByText(AHEAD_OF_PLAN)).toBeInTheDocument();
    expect(within(readout).getByText(FIRST_DAY)).toBeInTheDocument();

    fireEvent.blur(mark);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('answers a pointer that enters a mark as well as one that focuses it', () => {
    renderChart({ series: [BASELINE] });

    const mark = screen.getByRole('button', {
      name: `${BASELINE_LABEL}, ${SECOND_DAY}: ${AT_PLAN}`,
    });

    fireEvent.pointerOver(mark);

    const readout = screen.getByRole('tooltip');
    expect(within(readout).getByText(BASELINE_LABEL)).toBeInTheDocument();
    expect(within(readout).getByText(AT_PLAN)).toBeInTheDocument();

    fireEvent.pointerOut(mark);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('names every series reading on the active date, so a coincident zero is not lost', () => {
    renderChart({ series: [OPENED, RESOLVED] });

    /* The Resolved mark is painted last and used to take the press outright. */
    const resolvedMark = screen.getByRole('button', {
      name: `${RESOLVED_LABEL}, ${COINCIDENT_DAY}: ${NOTHING_RESOLVED}`,
    });

    fireEvent.pointerOver(resolvedMark);

    const readout = screen.getByRole('tooltip');

    expect(within(readout).getByText(OPENED_LABEL)).toBeInTheDocument();
    expect(within(readout).getByText(RESOLVED_LABEL)).toBeInTheDocument();
    expect(within(readout).getByText(NOTHING_OPENED)).toBeInTheDocument();
    expect(within(readout).getByText(NOTHING_RESOLVED)).toBeInTheDocument();

    /* And the same column answers from the mark beneath it, which the topmost circle covers. */
    const openedMark = screen.getByRole('button', {
      name: `${OPENED_LABEL}, ${COINCIDENT_DAY}: ${NOTHING_OPENED}`,
    });

    fireEvent.pointerOut(resolvedMark);
    fireEvent.pointerOver(openedMark);

    expect(within(screen.getByRole('tooltip')).getByText(NOTHING_OPENED)).toBeInTheDocument();
  });

  it('reveals the ring on the active date alone, and hides it again when the mark is left', () => {
    renderChart({ series: [OPENED, RESOLVED] });

    const openedAtZero = screen.getByRole('button', {
      name: `${OPENED_LABEL}, ${COINCIDENT_DAY}: ${NOTHING_OPENED}`,
    });
    const resolvedAtZero = screen.getByRole('button', {
      name: `${RESOLVED_LABEL}, ${COINCIDENT_DAY}: ${NOTHING_RESOLVED}`,
    });
    const openedElsewhere = screen.getByRole('button', {
      name: `${OPENED_LABEL}, ${SECOND_DAY}: ${AT_PLAN}`,
    });

    /* At rest every ring is invisible, whatever hover variants it also carries. */
    for (const mark of [openedAtZero, resolvedAtZero, openedElsewhere]) {
      expect(utilitiesOf(ringOf(mark))).toContain('opacity-0');
      expect(utilitiesOf(ringOf(mark))).not.toContain('opacity-100');
    }

    fireEvent.focus(openedAtZero);

    /* Both marks on that date are live, because the column is what is active — not one circle. */
    expect(utilitiesOf(ringOf(openedAtZero))).toContain('opacity-100');
    expect(utilitiesOf(ringOf(openedAtZero))).not.toContain('opacity-0');
    expect(utilitiesOf(ringOf(resolvedAtZero))).toContain('opacity-100');
    expect(utilitiesOf(ringOf(openedElsewhere))).toContain('opacity-0');

    fireEvent.blur(openedAtZero);

    expect(utilitiesOf(ringOf(openedAtZero))).toContain('opacity-0');
  });

  it('sizes a point’s target to 24 CSS pixels at the width the drawing is rendered at', () => {
    /* A drawing at half its natural width: jsdom computes no layout, so the box a browser would have
       measured is stated here, and one user unit is then worth half a CSS pixel. */
    const renderedWidth = 340;
    const scale = renderedWidth / 680;
    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: renderedWidth,
      bottom: 130,
      width: renderedWidth,
      height: 130,
      toJSON: () => ({}),
    });

    renderChart({ series: [BASELINE] });

    const [mark] = screen.getAllByRole('button');
    expect(mark).toBeDefined();
    if (mark === undefined) {
      return;
    }

    /* The dot itself is untouched: only the invisible target around it grew (WCAG 2.2 SC 2.5.8). */
    expect(mark.querySelectorAll('circle')[0]?.getAttribute('r')).toBe('2.5');

    const targetRadius = Number(mark.querySelectorAll('circle')[2]?.getAttribute('r'));
    expect(targetRadius * 2 * scale).toBeGreaterThanOrEqual(24);
  });
});

