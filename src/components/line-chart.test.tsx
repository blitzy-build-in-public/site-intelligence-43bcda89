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
 * suite), one focusable and named evidence mark per point, activation of that mark from the keyboard
 * and from a pointer opening exactly that point's drawer, the visible legend that names every series
 * beside its own tone's swatch, the series' own simulation label read out per row and never invented,
 * both themes, and the fact that the surface emits no frame, table or control of its own.
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

    expect(screen.getByText(BAND_LABEL)).toBeInTheDocument();
    expect(screen.getByText(MARKER_LABEL)).toBeInTheDocument();

    const band = svg.querySelector('rect');
    expect(band).not.toBeNull();
    expect(Number(band?.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(band?.getAttribute('height'))).toBeGreaterThan(0);
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
