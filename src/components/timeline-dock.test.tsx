/**
 * Component suite for `timeline-dock.tsx`, the bottom dock of the FileMap canvas: the projected
 * closing stock of the selected exception and the five latest audit events (AAP §0.12.4's SCR-12
 * row, AAP §0.5.2, AAP §0.12.1).
 *
 * Every case asserts a duty the dock exists for rather than its markup: the region named by its own
 * heading, with the selected exception's identifier and title inside it; the projected series drawn
 * as a chart the frame's toggle can turn into a table of the same points and back; an evidence
 * trigger behind every projected point and behind every event; exactly the five latest of the events
 * it was given, with the ones beyond that count absent and the order the caller supplied preserved;
 * each outcome printed with the record's own spelling beside its status icon; the two fixed §5.3
 * labels the two halves carry; both empty halves explained rather than blank; and both themes
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
  ThemeName,
} from '../types';
import type { SiteIntelligenceService } from '../services/site-intelligence-service';
import { TIMELINE_DOCK_AUDIT_EVENTS, TIMELINE_DOCK_TEXT, TimelineDock } from './timeline-dock';
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

/** The surface the projected series is drawn on, named after the series it carries. */
function chartSurface(): HTMLElement {
  return screen.getByRole('group', {
    name: new RegExp(TIMELINE_DOCK_TEXT.stockSeriesLabel),
  });
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

  it('draws the projected series with one evidence trigger per point', () => {
    renderDock();

    const marks = within(chartSurface()).getAllByRole('button');
    expect(marks).toHaveLength(STOCK_SERIES.length);
    STOCK_SERIES.forEach((point) => {
      const name = new RegExp(`${point.date}: ${point.units}`);
      expect(
        required(
          marks.find((mark) => name.test(mark.getAttribute('aria-label') ?? '')),
          `mark for ${point.date}`,
        ),
      ).toBeInTheDocument();
    });
  });

  it('opens the evidence behind a projected point from its mark, and returns focus to it', async () => {
    const user = userEvent.setup();
    renderDock();

    const marks = within(chartSurface()).getAllByRole('button');
    const mark = required(marks[0], 'first mark');
    await user.click(mark);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledWith(STOCK_REFERENCE);

    // A mark is an SVG group, so closing the drawer has to hand focus back to it rather than to
    // `<body>` — WCAG 2.2 SC 2.4.3, rule B-3.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mark).toHaveFocus();
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
    expect(screen.queryByRole('group', { name: new RegExp(TIMELINE_DOCK_TEXT.stockSeriesLabel) }))
      .toBeNull();
    // One row per projected point, beneath the header row the table vocabulary owns.
    expect(within(table).getAllByRole('row')).toHaveLength(STOCK_SERIES.length + 1);
    for (const point of STOCK_SERIES) {
      const row = required(
        within(table)
          .getAllByRole('row')
          .find((candidate) => (candidate.textContent ?? '').includes(point.date)),
        `row for ${point.date}`,
      );
      expect(within(row).getByText(String(point.units))).toBeVisible();
    }

    await user.click(tableToggle(VIEW_AS_TABLE_LABELS.showChart));

    expect(chartSurface()).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('explains an exception with no projected series instead of drawing empty axes', () => {
    renderDock({ stockSeries: [] });

    expect(screen.getByText(TIMELINE_DOCK_TEXT.stockEmpty)).toBeVisible();
    // The half keeps its own caption, and a surface with nothing to draw offers no toggle (rule P-8).
    expect(
      screen.getByRole('region', { name: TIMELINE_DOCK_TEXT.stockTitle }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
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
