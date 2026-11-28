/**
 * Component suite for `timeline-dock.tsx`, the bottom dock of the FileMap canvas: the projected
 * closing stock of the selected exception and the five latest audit events (AAP §0.12.4's SCR-12
 * row, AAP §0.5.2, AAP §0.12.1).
 *
 * Every case asserts a duty the dock exists for rather than its markup: the region named by its own
 * heading, with the selected exception's identifier and title inside it; the baseline the records
 * project and the option in view drawn as ONE chart over one scale, each series named in the legend
 * and each point carrying its own evidence trigger, and the frame's toggle turning that chart into a
 * table of the same dates and the same readings and back; exactly the five latest of the events it
 * was given, with the ones beyond that count absent and the order the caller supplied preserved; each
 * outcome printed with the record's own spelling beside its status icon; the §5.3 labels the halves
 * carry, the frame stating the weaker one where the option is a seed record and the baseline's own
 * row still stating the computed one; both empty halves explained rather than blank; and both themes
 * rendering from role tokens alone, with no palette value, colour function, elevation or inline
 * style anywhere in the region.
 *
 * THE SERVICE IS MOCKED AT THE PROVIDER, the one boundary the component layer may read through
 * (rule P-2). The specifier below is exactly the one `./evidence-drawer.tsx` imports, because Vitest
 * keys a mock on the resolved module rather than on a path spelling: from `src/components` that
 * import is `../services/service-provider`. The stub is created through `vi.hoisted` so it exists
 * before the module loads, and it is typed from the port itself, so it cannot drift from the
 * signature the drawer calls.
 *
 * FIXTURES ARE BUILT HERE FROM THE CONTRACT TYPES, never imported from a record. Every reference is
 * an opaque placeholder rather than a record-identifier shape, no amount appears, and the one
 * instant is the demonstration clock and every date is derived from it, so nothing is typed that a
 * record owns (rule P-6, `tests/source-checks/no-typed-figures.test.ts`). The two §5.3 labels are
 * read from `SIM_LABELS` rather than retyped, so a reworded fixed string cannot leave this suite
 * asserting text the interface no longer shows (rules P-1, P-4).
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default. Nothing here hashes, reads the
 * system clock or touches the network, and the query cache the evidence drawer reads through is
 * supplied per case with retries off, so a read settles in one call.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_CLOCK, SIM_LABELS } from '../types';
import type {
  AuditEvent,
  AuditResult,
  DailyClosingStockPoint,
  Evidence,
  Result,
  SimLabel,
  ThemeName,
} from '../types';
import type { SiteIntelligenceService } from '../services/site-intelligence-service';
import { TIMELINE_DOCK_AUDIT_EVENTS, TIMELINE_DOCK_TEXT, TimelineDock } from './timeline-dock';
import type { TimelineDockOptionSeries } from './timeline-dock';
import { VIEW_AS_TABLE_LABELS } from './view-as-table-toggle';

/* ---------------------------------------------------------------------------------------------
 * The port, replaced
 * ------------------------------------------------------------------------------------------- */

/**
 * The port member the evidence drawer reads through, named from the port itself rather than restated
 * here, so the stub answers with exactly the envelope the drawer calls it for.
 */
type EvidenceRead = SiteIntelligenceService['getEvidence'];

const getEvidence = vi.hoisted(() => vi.fn<EvidenceRead>());

vi.mock('../services/service-provider', () => ({
  useService: () => ({ getEvidence }),
}));

/* ---------------------------------------------------------------------------------------------
 * Fixtures
 * ------------------------------------------------------------------------------------------- */

/** Both themes of specification §4.1, as the `data-theme` values the token layer keys on. */
const THEMES: readonly ThemeName[] = ['command', 'paper'];

/** The label a computed figure carries, read from the fixed vocabulary (rule P-1). */
const CALCULATED_LABEL = SIM_LABELS[1];

/** The label the audit surface carries, read from the fixed vocabulary (rule P-4). */
const CONTROL_LABEL = SIM_LABELS[4];

/** The label a figure whose readings shipped with the dataset carries, read from the same owner. */
const DATA_LABEL = SIM_LABELS[0];

/** The four outcomes an event may record, in the order the fixtures cycle through them. */
const RESULTS = ['allowed', 'succeeded', 'blocked', 'failed'] as const satisfies readonly AuditResult[];

/** The selected exception's identifier: an opaque placeholder, not a record-identifier shape. */
const EXCEPTION_ID = 'exception-under-test';

/** The selected exception's own title, printed as it arrives. */
const EXCEPTION_TITLE = 'An exception under test';

/** The reference every projected point opens its evidence through. */
const STOCK_REFERENCE = 'projection-under-test';

/** The demonstration clock's date, which every fixture date is derived from. */
const CLOCK_DATE = DEMO_CLOCK.slice(0, 10);

/**
 * A calendar date this suite offsets from the demonstration clock.
 *
 * Derived rather than typed, because a date is the record's own value and rule P-6 keeps a typed
 * one out of a test fixture as firmly as out of a component.
 */
function dateAt(offsetDays: number): string {
  const base = Date.parse(`${CLOCK_DATE}T00:00:00Z`);
  return new Date(base + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** The solver's projected series, as a scenario's `dailyClosingStock` would arrive. */
const STOCK_SERIES: readonly DailyClosingStockPoint[] = [
  { date: dateAt(0), units: 120 },
  { date: dateAt(1), units: 90 },
  { date: dateAt(2), units: 30 },
];

/** The option's own name, as its record states it. */
const OPTION_NAME = 'An option under test';

/** The option's reference, which is its record's identifier and what its marks open. */
const OPTION_REFERENCE = 'option-under-test';

/**
 * The option's series, as the solver measured it.
 *
 * It reports one date the baseline does not, so a case can prove the table view takes the union of
 * the dates the two records state and leaves the baseline's cell empty on the day only the option
 * reports: a gap in one series beside a reading in the other is the records' state, not an error.
 */
const OPTION_SERIES: readonly DailyClosingStockPoint[] = [
  { date: dateAt(0), units: 300 },
  { date: dateAt(1), units: 210 },
  { date: dateAt(2), units: 60 },
  { date: dateAt(3), units: 0 },
];

/** The option as the screen hands it over: every measure the solver took in this session. */
const OPTION: TimelineDockOptionSeries = {
  evidenceRef: OPTION_REFERENCE,
  name: OPTION_NAME,
  dailyClosingStock: OPTION_SERIES,
  simLabel: CALCULATED_LABEL,
};

/** The same option as a seed record, which is the case the frame's weaker label exists for (AAP §0.10). */
const SEEDED_OPTION: TimelineDockOptionSeries = { ...OPTION, simLabel: DATA_LABEL };

/** The option's series label, composed from this module's wording and the record's own name. */
const OPTION_SERIES_LABEL = `${TIMELINE_DOCK_TEXT.selectedSeriesPrefix} ${OPTION_NAME}`;

/**
 * One audit event, built field by field from the contract type.
 *
 * `policyId` is present only where the caller supplies one, which is how the contract states it and
 * what the dock's `!== undefined` test reads; the payload hashes are opaque placeholders because
 * nothing in this suite verifies a chain.
 */
function auditEvent(index: number, result: AuditResult, policyId?: string): AuditEvent {
  return {
    sequence: index,
    id: `audit-event-under-test-${index}`,
    timestamp: DEMO_CLOCK,
    actorType: policyId === undefined ? 'user' : 'policy',
    actorId: `actor-under-test-${index}`,
    action: `action-under-test-${index}`,
    objectRef: `record-under-test-${index}`,
    result,
    ...(policyId === undefined ? {} : { policyId }),
    before: null,
    after: null,
    payloadHash: `payload-hash-under-test-${index}`,
    traceId: `trace-under-test-${index}`,
    previousHash: `previous-hash-under-test-${index}`,
    eventHash: `event-hash-under-test-${index}`,
  };
}

/**
 * Seven events, newest first as `listAuditEvents` returns them, so the dock has more than the five
 * it shows and a case can prove the two beyond the count never reach the screen. The five the dock
 * shows carry every one of the four outcomes, and the fourth carries a policy.
 */
const AUDIT_EVENTS: readonly AuditEvent[] = [
  auditEvent(1, 'allowed'),
  auditEvent(2, 'succeeded'),
  auditEvent(3, 'blocked', 'policy-under-test'),
  auditEvent(4, 'failed'),
  auditEvent(5, 'allowed'),
  auditEvent(6, 'succeeded'),
  auditEvent(7, 'blocked'),
];

/** The events the dock shows: the first five of the seven above. */
const SHOWN_EVENTS = AUDIT_EVENTS.slice(0, TIMELINE_DOCK_AUDIT_EVENTS);

/** A record the drawer can render in full, so an opened drawer shows content rather than a failure. */
const EVIDENCE: Evidence = {
  value: 'a count the drawer prints',
  provenance: 'computed',
  label: CALCULATED_LABEL,
  formula: 'a rule under test produced this count',
  inputs: ['input-under-test'],
  upstream: ['upstream-under-test'],
  downstream: ['downstream-under-test'],
  confidence: { level: 'high', reason: 'every input was read in full' },
  missingInputs: [],
  documents: ['document-under-test'],
};

/** The response the port returns for a reference, carrying the metadata every call reports. */
const EVIDENCE_RESULT: Result<Evidence> = {
  data: EVIDENCE,
  meta: {
    freshness: [{ source: 'erp', asOf: DEMO_CLOCK, state: 'fresh' }],
    simulated: true,
    traceId: 'trace-timeline-dock',
  },
};

/* ---------------------------------------------------------------------------------------------
 * Rendering, and the parts of the dock a case reaches
 * ------------------------------------------------------------------------------------------- */

/** The props a case varies; every other prop keeps its fixture value. */
interface DockOverrides {
  readonly exceptionId?: string;
  readonly exceptionTitle?: string;
  readonly stockSeries?: readonly DailyClosingStockPoint[];
  readonly stockEvidenceRef?: string;
  readonly stockSimLabel?: SimLabel;
  /** The option to draw, or `null` for a caller that has none to hand over. */
  readonly stockOption?: TimelineDockOptionSeries | null;
  readonly auditEvents?: readonly AuditEvent[];
}

/** The dock the case renders. */
function dockElement(overrides: DockOverrides = {}): ReactElement {
  return (
    <TimelineDock
      exceptionId={overrides.exceptionId ?? EXCEPTION_ID}
      exceptionTitle={overrides.exceptionTitle ?? EXCEPTION_TITLE}
      stockSeries={overrides.stockSeries ?? STOCK_SERIES}
      stockEvidenceRef={overrides.stockEvidenceRef ?? STOCK_REFERENCE}
      stockSimLabel={overrides.stockSimLabel ?? CALCULATED_LABEL}
      stockOption={
        overrides.stockOption === undefined ? OPTION : overrides.stockOption ?? undefined
      }
      auditEvents={overrides.auditEvents ?? AUDIT_EVENTS}
    />
  );
}

/**
 * Renders the dock inside a query cache of its own: the evidence drawer reads through `useQuery`, so
 * a cache is part of the dock's real environment, and a fresh one per case keeps retries and cached
 * evidence out of the next one.
 */
function renderDock(overrides: DockOverrides = {}): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{dockElement(overrides)}</QueryClientProvider>);
}

/** The dock's own region, named by the heading it renders. */
function dockRegion(): HTMLElement {
  return screen.getByRole('region', { name: TIMELINE_DOCK_TEXT.title });
}

/** The audit half's panel, named by the caption it renders. */
function activityPanel(): HTMLElement {
  return screen.getByRole('region', { name: new RegExp(TIMELINE_DOCK_TEXT.activityTitle) });
}

/** The five list items the audit half renders, in the order the caller supplied them. */
function activityItems(): readonly HTMLElement[] {
  return within(activityPanel()).getAllByRole('listitem');
}

/**
 * The surface the two series are drawn on: the one chart group, named after the series it carries —
 * the baseline first, then the option — so both paths and both mark sets are drawn on one scale (T-03).
 */
function chartSurface(): HTMLElement {
  return screen.getByRole('group', {
    name: new RegExp(TIMELINE_DOCK_TEXT.baselineSeriesLabel),
  });
}

/** The frame's figure: its caption row, the surface and the legend beneath it. */
function chartFigure(): HTMLElement {
  return screen.getByRole('figure');
}

/**
 * The label the frame paints for the whole figure: the §5.3 string in its caption row, which is the
 * one place the figure states it once rather than per series.
 *
 * @returns The caption row's text.
 */
function frameCaptionText(): string {
  const caption = chartFigure().querySelector('figcaption');

  if (caption === null) {
    throw new Error('the dock rendered no figure caption');
  }

  return caption.textContent ?? '';
}

/** The legend's rows: one per series drawn, each naming that series beside its swatch. */
function legendRows(): readonly HTMLElement[] {
  return within(chartFigure()).getAllByRole('listitem');
}

/**
 * The mark one series drew for one date, found by the accessible name the surface gives it.
 *
 * @param seriesLabel - The series' own label, as the legend states it.
 * @param date - The date the reading belongs to.
 * @param units - The reading, as the record states it.
 * @returns The mark.
 */
function markFor(seriesLabel: string, date: string, units: number): HTMLElement {
  const name = `${seriesLabel}, ${date}: ${units}`;

  return required(
    within(chartSurface())
      .getAllByRole('button')
      .find((mark) => mark.getAttribute('aria-label') === name),
    `mark for ${seriesLabel} on ${date}`,
  );
}

/**
 * The height a mark was drawn at, which is where the chart's one scale places its reading: a larger
 * reading sits nearer the top of the drawn area, so a smaller coordinate.
 *
 * @param mark - The mark to measure.
 * @returns The drawn centre's y coordinate.
 */
function markCentreY(mark: HTMLElement): number {
  const centre = mark.querySelector('circle')?.getAttribute('cy');

  if (centre === null || centre === undefined) {
    throw new Error('the mark carries no drawn centre');
  }

  return Number(centre);
}

/** The frame's toggle, named with the caption of the surface it switches. */
function tableToggle(label: string): HTMLElement {
  return screen.getByRole('button', {
    name: `${label}: ${TIMELINE_DOCK_TEXT.stockTitle}`,
  });
}

/** The element at a position no case may leave empty, or a failure that says which one. */
function required<T>(value: T | undefined, subject: string): T {
  if (value === undefined) {
    throw new Error(`the dock rendered no ${subject}`);
  }
  return value;
}

beforeEach(() => {
  getEvidence.mockResolvedValue(EVIDENCE_RESULT);
});

/** Leaves `<html>` on the default theme, and the port unconfigured, for whichever suite runs next. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  getEvidence.mockReset();
});

/* ---------------------------------------------------------------------------------------------
 * The cases
 * ------------------------------------------------------------------------------------------- */

describe('TimelineDock', () => {
  it('names the dock after its heading and names the selected exception', () => {
    renderDock();

    const region = dockRegion();
    expect(
      within(region).getByRole('heading', { level: 2, name: TIMELINE_DOCK_TEXT.title }),
    ).toBeVisible();
    expect(within(region).getByText(TIMELINE_DOCK_TEXT.selectedLabel)).toBeVisible();
    expect(within(region).getByText(EXCEPTION_ID)).toBeVisible();
    expect(within(region).getByText(EXCEPTION_TITLE)).toBeVisible();
  });

  it('opens the selected exception record from its identifier', async () => {
    const user = userEvent.setup();
    renderDock();

    const identifier = within(dockRegion()).getByText(EXCEPTION_ID);
    const trigger = required(identifier.closest('button') ?? undefined, 'evidence trigger');
    expect(trigger).toHaveAccessibleName(new RegExp(EXCEPTION_ID));

    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(trigger);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledWith(EXCEPTION_ID);
  });

  it('shows exactly the five latest of the events it was given, in the order supplied', () => {
    renderDock();

    // The fixture holds more than the dock shows, so the count below is a decision and not a limit.
    expect(AUDIT_EVENTS.length).toBeGreaterThan(TIMELINE_DOCK_AUDIT_EVENTS);
    const items = activityItems();
    expect(items).toHaveLength(TIMELINE_DOCK_AUDIT_EVENTS);

    SHOWN_EVENTS.forEach((event, index) => {
      const item = required(items[index], `list item ${index}`);
      expect(within(item).getByText(event.id)).toBeVisible();
    });

    for (const event of AUDIT_EVENTS.slice(TIMELINE_DOCK_AUDIT_EVENTS)) {
      expect(within(activityPanel()).queryByText(event.id)).toBeNull();
    }
  });

  it('prints each event record it shows with its own action, actor, record and policy', () => {
    renderDock();

    const items = activityItems();
    const withPolicy = SHOWN_EVENTS.find((event) => event.policyId !== undefined);
    const policyEvent = required(withPolicy, 'event carrying a policy');
    const policyItem = required(
      items.find((item) => (item.textContent ?? '').includes(policyEvent.id)),
      'list item for the event carrying a policy',
    );

    for (const event of SHOWN_EVENTS) {
      const item = required(
        items.find((candidate) => (candidate.textContent ?? '').includes(event.id)),
        `list item for ${event.id}`,
      );
      expect(within(item).getByText(event.timestamp)).toBeVisible();
      expect(within(item).getByText(event.action)).toBeVisible();
      expect(within(item).getByText(event.actorId)).toBeVisible();
      expect(within(item).getByText(event.objectRef)).toBeVisible();
      // A policy is printed only where the record names one, which is the contract's own condition:
      // the field is optional, so absence is tested rather than truthiness.
      if (event.policyId === undefined) {
        expect(within(item).queryByText(TIMELINE_DOCK_TEXT.policyLabel)).toBeNull();
      } else {
        expect(within(item).getByText(TIMELINE_DOCK_TEXT.policyLabel)).toBeVisible();
      }
    }

    expect(within(policyItem).getByText(TIMELINE_DOCK_TEXT.policyLabel)).toBeVisible();
    expect(within(policyItem).getByText(String(policyEvent.policyId))).toBeVisible();
  });

  it.each(RESULTS)('prints a %s outcome with the record\'s own spelling', (result) => {
    renderDock({ auditEvents: [auditEvent(1, result)] });

    const item = required(activityItems()[0], 'list item');
    const spelling = within(item).getByText(result);
    expect(spelling).toBeVisible();
    // The meaning is carried by icon, label and colour together, never by the hue alone (rule B-3).
    expect(item.querySelector('svg')).not.toBeNull();
  });

  it('carries the two fixed simulation labels its two halves require', () => {
    renderDock();

    const region = dockRegion();
    // The computed series carries the label specification §5.3 assigns to a computed figure (P-1).
    expect(within(region).getByText(CALCULATED_LABEL)).toBeVisible();
    // The audit surface carries the label rule P-4 fixes for the chain (P-4).
    expect(within(region).getByText(CONTROL_LABEL)).toBeVisible();
  });

  it('draws the baseline and the option in one chart over one scale, each named in the legend', () => {
    renderDock();

    /* One chart group carries both series, which is what puts them on one calendar and one y domain:
       a second group would be a second scale (AAP §0.9 T-03). */
    const surface = chartSurface();
    const surfaceName = surface.getAttribute('aria-label') ?? '';
    expect(surfaceName).toContain(TIMELINE_DOCK_TEXT.baselineSeriesLabel);
    expect(surfaceName).toContain(OPTION_SERIES_LABEL);

    /* Both series are named in the visible legend, so a reader tells them apart without colour (B-3). */
    const rows = legendRows();
    expect(rows).toHaveLength(2);
    expect(
      within(required(rows[0], 'baseline legend row')).getByText(
        TIMELINE_DOCK_TEXT.baselineSeriesLabel,
      ),
    ).toBeVisible();
    expect(
      within(required(rows[1], 'option legend row')).getByText(OPTION_SERIES_LABEL),
    ).toBeVisible();

    /* One scale, measured: on one date the option's larger reading is drawn above the baseline's,
       which two series on two domains could not state. */
    const baselineY = markCentreY(markFor(TIMELINE_DOCK_TEXT.baselineSeriesLabel, dateAt(0), 120));
    const optionY = markCentreY(markFor(OPTION_SERIES_LABEL, dateAt(0), 300));
    expect(optionY).toBeLessThan(baselineY);

    /* Every point of both series is a mark on that one surface. */
    expect(within(surface).getAllByRole('button')).toHaveLength(
      STOCK_SERIES.length + OPTION_SERIES.length,
    );
  });

  it.each([
    ['a measured option', OPTION, CALCULATED_LABEL],
    ['a seed-record option', SEEDED_OPTION, DATA_LABEL],
  ] as const)('paints the one label true of every series it draws, for %s', (_case, option, expected) => {
    renderDock({ stockOption: option });

    const rows = legendRows();

    /* The frame states the label that is true of the whole figure: the computed one while both series
       are the solver's output, and the weaker `Simulated data` once one of them is a seed record. */
    expect(frameCaptionText()).toContain(expected);

    /* Each series still states its own label in its own row, so the baseline is never presented as
       seed content and a seeded option is never presented as computed output (rules P-1, AAP §0.10). */
    expect(required(rows[0], 'baseline legend row').textContent).toContain(CALCULATED_LABEL);
    expect(required(rows[1], 'option legend row').textContent).toContain(expected);

    if (expected === DATA_LABEL) {
      expect(frameCaptionText()).not.toContain(CALCULATED_LABEL);
    }
  });

  it('draws the baseline alone while the caller has no option to hand over', () => {
    renderDock({ stockOption: null });

    expect(chartSurface().getAttribute('aria-label')).not.toContain(
      TIMELINE_DOCK_TEXT.selectedSeriesPrefix,
    );
    expect(legendRows()).toHaveLength(1);
    expect(frameCaptionText()).toContain(CALCULATED_LABEL);
    expect(within(chartSurface()).getAllByRole('button')).toHaveLength(STOCK_SERIES.length);
  });

  it('gives every projected point of either series its own evidence trigger', () => {
    renderDock();

    STOCK_SERIES.forEach((point) => {
      expect(markFor(TIMELINE_DOCK_TEXT.baselineSeriesLabel, point.date, point.units)).toBeInTheDocument();
    });
    OPTION_SERIES.forEach((point) => {
      expect(markFor(OPTION_SERIES_LABEL, point.date, point.units)).toBeInTheDocument();
    });
  });

  it('opens the evidence behind a point of either series from its mark, and returns focus to it', async () => {
    const user = userEvent.setup();
    renderDock();

    const baselineMark = markFor(TIMELINE_DOCK_TEXT.baselineSeriesLabel, dateAt(0), 120);
    await user.click(baselineMark);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenLastCalledWith(STOCK_REFERENCE);

    // A mark is an SVG group, so closing the drawer has to hand focus back to it rather than to
    // `<body>` — WCAG 2.2 SC 2.4.3, rule B-3.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(baselineMark).toHaveFocus();

    // The option's marks open the option's own record, which is the reference the caller supplied for
    // that series rather than the exception's (rule P-6, principle PR-6).
    await user.click(markFor(OPTION_SERIES_LABEL, dateAt(0), 300));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenLastCalledWith(OPTION_REFERENCE);
  });

  it('gives every audit event it shows its own evidence trigger', async () => {
    const user = userEvent.setup();
    renderDock();

    const items = activityItems();
    const triggers = items.map((item) => within(item).getByRole('button'));
    expect(triggers).toHaveLength(TIMELINE_DOCK_AUDIT_EVENTS);

    await user.click(required(triggers[0], 'first audit evidence trigger'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledWith(required(SHOWN_EVENTS[0], 'first shown event').id);
  });

  it('swaps the chart for a table of the same points and back', async () => {
    const user = userEvent.setup();
    renderDock();

    expect(chartSurface()).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();

    await user.click(tableToggle(VIEW_AS_TABLE_LABELS.showTable));

    const table = screen.getByRole('table', { name: TIMELINE_DOCK_TEXT.stockTableCaption });
    expect(screen.queryByRole('group', { name: new RegExp(TIMELINE_DOCK_TEXT.baselineSeriesLabel) }))
      .toBeNull();

    /* One column per series, each headed by that series' own label, beside the date column. */
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual([
      TIMELINE_DOCK_TEXT.stockDateColumn,
      TIMELINE_DOCK_TEXT.baselineSeriesLabel,
      OPTION_SERIES_LABEL,
    ]);

    /* One row per date either record states, beneath the header row the table vocabulary owns. */
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(OPTION_SERIES.length + 1);

    for (const point of [...STOCK_SERIES, ...OPTION_SERIES]) {
      const row = required(
        rows.find((candidate) => (candidate.textContent ?? '').includes(point.date)),
        `row for ${point.date}`,
      );
      expect(within(row).getByText(String(point.units))).toBeVisible();
    }

    /* The date only the option reports leaves the baseline's cell stating that it reports no reading
       there, rather than reading `undefined` or borrowing the other series' value (rule P-6). */
    const optionOnlyDate = required(OPTION_SERIES.at(-1), 'the option’s last reading');
    const optionOnlyRow = required(
      rows.find((candidate) => (candidate.textContent ?? '').includes(optionOnlyDate.date)),
      `row for ${optionOnlyDate.date}`,
    );
    const cells = within(optionOnlyRow).getAllByRole('cell');
    expect(cells[1]?.textContent).toBe('');
    expect(cells[2]?.textContent).toBe(String(optionOnlyDate.units));

    await user.click(tableToggle(VIEW_AS_TABLE_LABELS.showChart));

    expect(chartSurface()).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('explains an exception with no projected baseline instead of drawing empty axes', () => {
    renderDock({ stockSeries: [] });

    expect(screen.getByText(TIMELINE_DOCK_TEXT.stockEmpty)).toBeVisible();
    // The half keeps its own caption, and a surface with nothing to draw offers no toggle (rule P-8).
    expect(
      screen.getByRole('region', { name: TIMELINE_DOCK_TEXT.stockTitle }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('figure')).toBeNull();
    expect(screen.queryByRole('button', { name: new RegExp(VIEW_AS_TABLE_LABELS.showTable) }))
      .toBeNull();
  });

  it('explains a trail with no events instead of leaving the half blank', () => {
    renderDock({ auditEvents: [] });

    expect(within(activityPanel()).getByText(TIMELINE_DOCK_TEXT.activityEmpty)).toBeVisible();
    expect(within(activityPanel()).queryByRole('list')).toBeNull();
  });

  it.each(THEMES)('renders under the %s theme from role tokens alone', (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    renderDock();

    const region = dockRegion();
    expect(within(region).getByText(EXCEPTION_ID)).toBeVisible();
    expect(within(region).getByText(CALCULATED_LABEL)).toBeVisible();
    expect(within(region).getByText(CONTROL_LABEL)).toBeVisible();
    expect(activityItems()).toHaveLength(TIMELINE_DOCK_AUDIT_EVENTS);

    const styled = [region, ...Array.from(region.querySelectorAll('[class]'))];
    for (const element of styled) {
      // No inline style, so nothing bypasses the token layer (specification §4.3).
      expect(element.getAttribute('style')).toBeNull();
      const classes = element.getAttribute('class') ?? '';
      // No palette literal and no colour function: every colour is a role token.
      expect(classes).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(classes).not.toMatch(/\b(?:rgba?|hsla?|oklch|lab|lch)\(/);
      // Specification §4.3 exposes no shadow, so no surface lifts itself off the page.
      expect(classes).not.toMatch(/\bshadow-/);
    }
  });
});
