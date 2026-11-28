/**
 * The bottom dock of the FileMap canvas: the projected closing stock of the selected exception, and
 * the five latest events of the audit trail.
 *
 * WHERE IT COMES FROM. AAP §0.12.4's SCR-12 row fixes the dock's content — "bottom dock with
 * projected stock for the selected exception and the five latest audit events" — and its labelling,
 * "the dock's stock series carry `Simulated calculation`"; AAP §0.5.2 and AAP §0.12.1 place the
 * dock among the shared components this folder owns, §0.12.1 recording those as the primitives that
 * own semantics, tokens and the "View as table" toggle; AAP §0.15.1's file plan names
 * `src/components/timeline-dock.tsx` as the dock; and AAP §0.13.1 gives it this path. Both payloads
 * already exist: the stock series is a scenario's `dailyClosingStock`, and the events are the
 * newest-first page `listAuditEvents` returns.
 *
 * WHY IT READS NO DATA — rule P-2, AAP §0.18.1. The dock is presentational, the way
 * `./map-canvas.tsx` and `./dependency-graph.tsx` are: the canvas screen holds the selection, asks
 * the service for the two payloads and passes them down. A dock that called the port itself would
 * put a second reader of `src/services` in the component layer, would read twice whenever two docks
 * are mounted, and could not render a payload that a preview or a test supplies. Every prop below
 * is data in, and the dock keeps no state of its own: the one piece of state on screen — which
 * representation the projected series is shown in — belongs to `./chart-frame.tsx`.
 *
 * WHY THE CHART IS COMPOSED INSIDE `ChartFrame` — rule B-3, success criterion 9, AAP §0.5.2. The
 * frame is the one owner of the "View as table" switch, and a chart reaches a screen only inside it,
 * so the dock hands the frame the `tableRows` spec that carries the same series as a table.
 * `./line-chart.tsx` is a pure surface with no toggle of its own, which is exactly why it may be
 * composed here and may not be placed on a screen on its own: the table view becomes structural
 * rather than remembered.
 *
 * WHY THE EVENTS ARE A LIST RATHER THAN A TABLE — AAP §0.5.2, §0.12.4. An event reads as a sequence
 * — identifier, instant, outcome, action, then the actor, the record and the policy behind it — and
 * five rows are read one after another rather than compared down a column. `./data-table.tsx` is
 * the application's only table vocabulary and it is reached here through the frame's table view, so
 * a second `<table>` in this file would be a second set of caption, column and row-cursor rules for
 * five items. The sequence is what the record has, so it is an `<ol>` of `<li>`.
 *
 * WHY THE UNITS PRINT AS THE VALUE ITSELF — rule P-6. The points arrive from the solver, and the
 * value printed is the number it returned: rounding it, scaling it or appending a unit would be a
 * second computation inside a component, which is the one place rule P-6 forbids one. The plain
 * count is rendered exactly as `./metric-tile.tsx` renders a count it did not compute; `yLabel` is
 * the same text, so the mark a reader focuses and the row of the table view state one number.
 *
 * WHY THE TWO FIXED LABELS ARE IMPORTED RATHER THAN TYPED — rules P-1 and P-4. `Simulated
 * calculation` and `Simulated control` are two of the seven strings specification §5.3 fixes, and
 * `SIM_LABELS` in `src/types/primitives.ts` is their single owner. Spelling either here would give
 * the fixed wording a second owner and would leave this module asserting yesterday's string after a
 * correction lands upstream. P-1 requires the exact label on the computed series, which the frame
 * paints; P-4 requires the control surface — the chain and what a reader sees of it — to be labelled
 * `Simulated control`, which the event panel carries because these events are that surface.
 *
 * NO CLAIM, NOTHING FETCHED, NOTHING TO CONFIGURE — rules P-4, P-7, B-1, B-2. Nothing here states
 * that a record cannot be altered, that anything is confined or that a copy could not be made: the
 * labels are the fixed strings and everything else is the record's own text. No vendor, company or
 * product name is written, and the only identifiers on screen are the ones the service supplied. The
 * module fetches no asset, reads no configuration value and holds no secret.
 *
 * NO CONTROL OF ITS OWN — rule P-8. Every control the dock puts on screen belongs to a component it
 * composes: the frame's toggle and the evidence triggers `./evidence-drawer.tsx` and
 * `./line-chart.tsx` own. This file adds no button and no link, so it cannot add a disabled control
 * that would need an explanation.
 */
import { useId } from 'react';
import type { ReactElement } from 'react';

import { SIM_LABELS } from '../types';
import type { AuditEvent, AuditResult, DailyClosingStockPoint, SimLabel } from '../types';
import { ChartFrame } from './chart-frame';
import type { TableColumn } from './data-table';
import { EvidenceRef } from './evidence-drawer';
import { LineChart } from './line-chart';
import type { LineSeriesSpec } from './line-chart';
import { MonoValue } from './mono-value';
import { Panel } from './panel';
import { StatusIndicator } from './status-indicator';
import type { StatusMeaning } from './status-indicator';

/* ---------------------------------------------------------------------------------------------
 * The wording, and the two fixed labels
 * ------------------------------------------------------------------------------------------- */

/**
 * Every string this module states, held here so the wording has one owner: the component renders
 * these, and its suite names them through this object rather than retyping them.
 *
 * None of these is a fixed specification string. The seven §5.3 labels belong to the figures that
 * carry them and are read from `SIM_LABELS` below (rule P-1); an event's action, actor, record,
 * policy and outcome are the record's own text and are never paraphrased here (rule P-6). Nothing
 * below carries an amount, an instant or a record identifier, and nothing states a property the
 * demonstration does not implement (rule P-4). The one reading the object holds — `stockZeroLabel` —
 * is the level the series is drawn against rather than a measurement of it.
 */
export const TIMELINE_DOCK_TEXT = {
  /** The dock's heading, and the accessible name of the region it renders. */
  title: 'Timeline',

  /** The caption that introduces the exception the two halves below describe. */
  selectedLabel: 'Selected exception',

  /** The caption of the projected-stock half, and of the panel that stands in for it when empty. */
  stockTitle: 'Projected stock',

  /** The name of the series the chart draws, read out with each of its marks. */
  stockSeriesLabel: 'Projected closing stock',

  /** The x axis' name: the calendar the solver projected the series over. */
  stockXAxisLabel: 'Calendar date',

  /** The y axis' name: what each plotted count is measured in. */
  stockYAxisLabel: 'Units at close',

  /** The level the series is read against, which is where stock would run out. */
  stockZeroLabel: '0',

  /** The table view's accessible name, so the switch announces what replaced the chart. */
  stockTableCaption: 'Projected closing stock by date, as a table',

  /** The date column's header in the table view. */
  stockDateColumn: 'Date',

  /** The closing-stock column's header in the table view. */
  stockUnitsColumn: 'Closing stock',

  /**
   * Shown in place of the chart when the selected exception has no projected series, so the half is
   * explained rather than blank. Neutral wording: no figure, no identifier and no invented record.
   */
  stockEmpty: 'No projected closing stock has been computed for this exception yet.',

  /** The caption of the audit half, beside the label that marks it a simulated control (rule P-4). */
  activityTitle: 'Latest audit events',

  /**
   * Shown in place of the list when no event has arrived, so the half explains itself rather than
   * leaving an empty panel. Neutral wording: no figure, no identifier and no invented record.
   */
  activityEmpty: 'No audit events are recorded for this workspace yet.',

  /** The caption-role name of the persona or policy that appended an event. */
  actorLabel: 'Actor',

  /** The caption-role name of the record an event is about. */
  recordLabel: 'Record',

  /** The caption-role name of the policy behind an event, shown only where one is recorded. */
  policyLabel: 'Policy',
} as const;

/**
 * How many events the dock shows: the five latest, which AAP §0.12.4's SCR-12 row fixes and which
 * is the single owner of that count. `listAuditEvents` returns the events newest first, so the slice
 * from the head of the array is the five latest and no ordering is computed here.
 */
export const TIMELINE_DOCK_AUDIT_EVENTS = 5;

/**
 * The label a computed figure carries, read from the fixed vocabulary rather than typed (rule P-1).
 * Index 1 of `SIM_LABELS` is `Simulated calculation`, the string specification §5.3 assigns to every
 * computed figure, and the projected series is one.
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/**
 * The label the audit surface carries, read from the fixed vocabulary rather than typed (rule P-4).
 * Index 4 of `SIM_LABELS` is `Simulated control`, the string the rule fixes for the chain and for
 * what a reader sees of it — which is what these events are.
 */
const CONTROL_LABEL: SimLabel = SIM_LABELS[4];

/**
 * What one audit outcome amounts to in the shared status vocabulary of `./status-indicator.tsx`.
 *
 * No input fixes this mapping, so it is a reading rather than a quotation: an outcome the records
 * mark `allowed` or `succeeded` reads as a pass, one they mark `failed` reads as a failure, and one
 * they mark `blocked` reads as a warning, because the call was refused by a rule rather than failing
 * on its own. It is the same reading `src/features/scr-05-approvals-and-audit/audit-screen.tsx`
 * applies to the audit table, so an outcome looks and reads the same wherever it appears; the two
 * copies exist because a component may not import a feature folder, and a shared helper — a module
 * of the status vocabulary's own — would replace both. The label beside the icon is always the
 * record's own spelling, so the meaning never replaces what the event says (rule B-3: meaning is
 * carried by icon, label and colour together).
 */
const RESULT_MEANINGS = {
  allowed: 'pass',
  blocked: 'warning',
  succeeded: 'pass',
  failed: 'fail',
} as const satisfies Record<AuditResult, StatusMeaning>;

/* ---------------------------------------------------------------------------------------------
 * The table view of the projected series
 * ------------------------------------------------------------------------------------------- */

/**
 * The two columns the frame's table view renders: the date the stock was counted at the close of,
 * and the units left at that close.
 *
 * The units column is aligned to the end so successive counts line up on their last digit, which is
 * the reason `TableColumn.align` exists. The cells hold the record's values as they arrived — the
 * date it states and the count the solver returned — because this component formats and recomputes
 * nothing (rule P-6).
 */
const STOCK_COLUMNS = [
  {
    id: 'date',
    header: TIMELINE_DOCK_TEXT.stockDateColumn,
    render: (point: DailyClosingStockPoint) => point.date,
  },
  {
    id: 'units',
    header: TIMELINE_DOCK_TEXT.stockUnitsColumn,
    align: 'end',
    render: (point: DailyClosingStockPoint) => point.units,
  },
] as const satisfies readonly TableColumn<DailyClosingStockPoint>[];

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * What the canvas screen hands the bottom dock: the selected exception's identifier and title, the
 * solver's projected closing-stock series with the reference each of its points opens, and the
 * audit page it read newest first. Both payloads arrive whole because the dock calls no port and
 * holds no state of its own — it prints the head of the page and the record's own wording as they
 * arrived, and formats no figure of its own (AAP §0.12.4).
 */
export interface TimelineDockProps {
  /**
   * The identifier of the selected exception, in the service's own form.
   *
   * It is printed through `MonoValue` in the identifier kind and wrapped in the evidence trigger, so
   * the selection itself is a figure that opens the record behind it (rule P-6, principle PR-6).
   */
  readonly exceptionId: string;

  /**
   * The selected exception's own title, printed as it arrives.
   *
   * The dock does not own this wording: a record's title belongs to the record (rule P-6), so a
   * caller that has no title to show has no dock to place.
   */
  readonly exceptionTitle: string;

  /**
   * The solver's projected closing-stock series for the selected exception, in the order the record
   * states it.
   *
   * An empty series is a real state — an exception with no projection — and the dock explains it
   * rather than drawing empty axes.
   */
  readonly stockSeries: readonly DailyClosingStockPoint[];

  /**
   * The reference each projected point opens its evidence through.
   *
   * Required by `LinePoint`: a mark with no reference would be a figure a reader could not open,
   * which is the defect rule P-6 and principle PR-6 exist to prevent.
   */
  readonly stockEvidenceRef: string;

  /**
   * The audit events to show, newest first as `listAuditEvents` returns them.
   *
   * The dock prints only the first {@link TIMELINE_DOCK_AUDIT_EVENTS} of them: the count is this
   * module's to apply, so a caller hands over the page it read and the dock shows the head of it.
   */
  readonly auditEvents: readonly AuditEvent[];

  /**
   * What the events half says instead of {@link TIMELINE_DOCK_TEXT.activityEmpty} when the caller has a
   * reason of its own for the list being empty.
   *
   * The canvas uses it for the one case the neutral sentence would misdescribe: a role the permission
   * matrix does not grant `audit.read` receives no events at all, and "no event is recorded" would
   * state an absence of records where the records exist and the read was refused. The caller owns the
   * wording, because only the caller knows why it passed nothing.
   */
  readonly auditEmptyMessage?: string | undefined;
}

/**
 * Renders the canvas dock: the selected exception, its projected stock and the five latest events.
 *
 * The `<section>` is named by its own `<h2>` — no `aria-label` restates text that is already visible
 * — and the heading row carries the selection, so a reader arriving at the dock knows which
 * exception both halves below describe. From the `lg` breakpoint the two halves sit side by side,
 * the stock series taking roughly three fifths of the width because it is drawn rather than read,
 * and the events two fifths; below it they stack in the same order. Every value is a role token of
 * `src/theme/tokens.css`, so Command and Paper each supply their own measured pairing, and the surface
 * adds no elevation because specification §4.3 defines none.
 *
 * Neither half is ever blank: a series with no points renders a panel stating that no projection has
 * been computed, and an empty trail states that no event has been recorded, so an absent payload
 * reads as an absence rather than as a fault.
 */
export function TimelineDock({
  exceptionId,
  exceptionTitle,
  stockSeries,
  stockEvidenceRef,
  auditEvents,
  auditEmptyMessage,
}: TimelineDockProps): ReactElement {
  const headingId = useId();
  const latestEvents = auditEvents.slice(0, TIMELINE_DOCK_AUDIT_EVENTS);

  /**
   * The series the chart draws, built from the solver's points.
   *
   * `yLabel` is the count as text, so the mark a reader focuses states the same number the series
   * does; every point carries the caller's reference, so each one opens the evidence behind it.
   */
  const stockSeriesSpec: LineSeriesSpec = {
    id: 'projected-stock',
    label: TIMELINE_DOCK_TEXT.stockSeriesLabel,
    tone: 'accent',
    points: stockSeries.map((point) => ({
      x: point.date,
      y: point.units,
      yLabel: String(point.units),
      evidenceRef: stockEvidenceRef,
    })),
  };

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 border-t border-hairline pt-4"
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-2">
        <h2 id={headingId} className="text-16 font-semibold text-text-primary">
          {TIMELINE_DOCK_TEXT.title}
        </h2>
        <span className="text-12 text-text-caption">{TIMELINE_DOCK_TEXT.selectedLabel}</span>
        <EvidenceRef ref={exceptionId}>
          <MonoValue value={exceptionId} kind="id" />
        </EvidenceRef>
        <span className="min-w-0 break-words text-14 text-text-primary">{exceptionTitle}</span>
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 lg:basis-3/5">
          {stockSeries.length === 0 ? (
            /* An exception with no projection states that, in a panel labelled with the half's own
               caption, so the empty state keeps the dock's structure instead of collapsing it. */
            <Panel label={TIMELINE_DOCK_TEXT.stockTitle}>
              {TIMELINE_DOCK_TEXT.stockEmpty}
            </Panel>
          ) : (
            <ChartFrame<DailyClosingStockPoint>
              title={TIMELINE_DOCK_TEXT.stockTitle}
              simLabel={CALCULATION_LABEL}
              tableRows={{
                caption: TIMELINE_DOCK_TEXT.stockTableCaption,
                columns: STOCK_COLUMNS,
                rows: stockSeries,
                getRowKey: (point) => point.date,
              }}
            >
              <LineChart
                series={[stockSeriesSpec]}
                references={[
                  { y: 0, label: TIMELINE_DOCK_TEXT.stockZeroLabel },
                ]}
                xAxisLabel={TIMELINE_DOCK_TEXT.stockXAxisLabel}
                yAxisLabel={TIMELINE_DOCK_TEXT.stockYAxisLabel}
              />
            </ChartFrame>
          )}
        </div>

        <div className="min-w-0 lg:basis-2/5">
          <Panel
            label={
              <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                <span>{TIMELINE_DOCK_TEXT.activityTitle}</span>
                {/* The chain's own label, carried by the half that shows the chain (rule P-4). */}
                <StatusIndicator meaning="simulated" label={CONTROL_LABEL} />
              </span>
            }
          >
            {latestEvents.length === 0 ? (
              <p className="text-13 text-text-secondary">
                {auditEmptyMessage ?? TIMELINE_DOCK_TEXT.activityEmpty}
              </p>
            ) : (
              <ol className="flex min-w-0 flex-col gap-3">
                {latestEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex min-w-0 flex-col gap-1 border-b border-hairline pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <EvidenceRef ref={event.id}>
                        <MonoValue value={event.id} kind="id" />
                      </EvidenceRef>
                      <MonoValue value={event.timestamp} kind="timestamp" />
                      <StatusIndicator
                        meaning={RESULT_MEANINGS[event.result]}
                        label={event.result}
                      />
                      <span className="min-w-0 break-words text-14 text-text-primary">
                        {event.action}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-wrap items-center gap-2 text-12 text-text-caption">
                      <span className="inline-flex min-w-0 items-center gap-1">
                        {TIMELINE_DOCK_TEXT.actorLabel}
                        <MonoValue value={event.actorId} kind="id" />
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1">
                        {TIMELINE_DOCK_TEXT.recordLabel}
                        <MonoValue value={event.objectRef} kind="id" />
                      </span>
                      {event.policyId === undefined ? null : (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          {TIMELINE_DOCK_TEXT.policyLabel}
                          <MonoValue value={event.policyId} kind="id" />
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}
