/**
 * SCR-12 FileMap canvas, the stage S2 surface on which a planner reads the whole client network
 * through two lenses that share one selection, and reaches the exception the selection resolves to.
 *
 * Implements AAP §0.12.4's SCR-12 row in full — "Ribbon of six computed tiles; canvas at 65% width
 * with the map lens … and the graph lens …; right stack with the four most urgent exceptions and a
 * health card per product; bottom dock with projected stock for the selected exception and the five
 * latest audit events; wall mode hides the navigation; 'View as table' on both lenses. Primary
 * action 'Investigate selected exception'." It also implements AAP §0.15.1's row for this path, AAP
 * §0.14.1's placement of SCR-12 in S2, and AAP §0.6.2's boundary: the screen reaches records only
 * through the port, and never a seed record, an adapter or a domain module.
 *
 * WHAT LISTENS AND WHAT DECIDES. The screen is the listener of exactly one route and the composer of
 * four siblings: `CanvasRibbon` (the six labelled tiles), `MapLens` and `GraphLens` (the two views
 * of one topology), `CanvasRightStack` (the urgent exceptions and the product cards) and
 * `TimelineDock` (the projection and the five latest events). Each of those is presentational and
 * takes its values as props, so this file owns the scope, the reads, the selection, the lens and wall
 * mode, and nothing else. Both lenses are handed the same `selectedNodeId`, which is what makes a
 * selection made in one lens a selection in the other (AAP §0.12.4).
 *
 * NOTHING HERE IS COMPUTED — rules P-6 and P-2. Every figure on this surface arrives from a port
 * member: the ribbon's six tiles from `getCanvasRibbon`, each exception's revenue at risk and the
 * urgency order from `listExceptions` asked with its own list parameters, the projected series and
 * the selected exception's title from `getExceptionDetail`, the events from `listAuditEvents`. This
 * module sorts nothing, slices nothing, sums nothing, rounds nothing, formats nothing and reads no
 * clock; the two windows it asks for (four urgent rows, five events) are handed to the service so
 * the service's own ordering and limit apply rather than a screen-side truncation. The one selection
 * it derives is derived from service data, never from a typed identifier, because a node identifier
 * written here would be a record value the file invents (rule P-6).
 *
 * THE SEVEN STATES COME FROM THE READS, NEVER FROM A FLAG — AAP §0.8, §0.12.1. The body is wrapped in
 * `StateBoundary`, and `deriveScreenState` below reads only what the query set settled to: a
 * `'permission'` refusal is the forbidden card with the permission, the roles that may act and the
 * trace identifier the service supplied; a `'validation'` refusal is the conflict notice; any other
 * rejection is offline with a retry that re-runs the reads; a pending read is the loading state; the
 * freshness report the adapter attaches to every `Result.meta` raises the stale banner (naming the
 * source and its as-of instant) or the partial notice above content that still renders; and a scope
 * with no node and no open exception is the empty state. No member of `SimulationFlag` is named here,
 * so the single popover reaches this screen by changing what the adapter answers rather than by a
 * branch in the view.
 *
 * THE ATLAS IS AN OVERLAY, NOT A DEPENDENCY — rules P-4 and P-5. `getAtlas` is refused for the
 * external supplier engineer, so its refusal degrades the map lens to the first-party network and
 * never the screen. The payload is forwarded to the map lens unchanged and is read for nothing else
 * here: this file authors no competitor string, prints no competitor figure beside a first-party one
 * and combines no two series, so the market intelligence the overlay draws stays labelled by the
 * component that draws it.
 *
 * CONTROLS — rule P-8. The lens switch, the wall-mode toggle and the primary action are all live: the
 * switch changes the lens, the toggle changes the mode and reports it to the shell, and the primary
 * action navigates to `/exceptions/<identifier>` for the exception the selection resolves to through
 * the service. The primary action is rendered only when an exception does resolve, because the
 * specification fixes no reason string for the other case and a disabled control with an invented
 * reason would be exactly what rule P-8 and AAP §0.1 forbid. The only fixed disabled string in this
 * area — `Arrives in stage S4` on **Open part** — belongs to the graph lens and is untouched here.
 * "View as table" on both lenses is the same story: each lens composes `ChartFrame`, which owns the
 * toggle and the table view, so this file adds no second toggle and no chart of its own.
 *
 * WALL MODE. The toggle reports the request through `onWallModeChange` so the shell can hide the
 * navigation it owns, and this screen applies the mode to what it does own: the canvas takes the whole
 * row and the right stack stands down, which is what gives the drawing a display to itself. Leaving
 * the mode restores both, so the control performs its visible function with or without a shell
 * handler (rule P-8).
 *
 * REPORTED GAPS, each recorded where it bites rather than worked around:
 * 1. `ActionButton` (`src/components/tooltip.tsx`) forwards `aria-disabled`, `onClick` and
 *    `className` and no other attribute, so the active lens cannot be marked with `aria-pressed`
 *    without editing the shared component layer, which this file may not do. The active lens is
 *    therefore stated in visible text beside the switch (never by colour alone, rule B-3) and the
 *    shortfall is recorded here.
 * 2. The port declares no product-health read and no product-name read: `src/types` carries no
 *    product record and the canvas reads are `getTopology`, `getCanvasRibbon`, `listExceptions` and
 *    `getExceptionDetail`. The product cards are therefore built from the product identifiers the
 *    urgent exception rows carry, each named by that identifier (the record's own spelling rather
 *    than an invented name) and each showing the revenue at risk the row's own aggregate states.
 * 3. `RibbonTile` carries `id`, `value` and `provenance` and no caption and no evidence reference, so
 *    both arrive from `RIBBON_PRESENTATION` below — the captions this screen owns for the six
 *    aggregate keys, and a composed `canvas:<key>` reference. `getEvidence` resolves record
 *    identifiers only (packages, exceptions, scenarios, approvals, audit events, pins, documents and
 *    customer and purchase orders), so an aggregate reference opens the drawer on a reference no
 *    record answers, exactly as the SCR-01 screen records for its own aggregate figures. The
 *    alternative — no reference — cannot compile, because `MetricTile` requires one.
 * 4. A topology node is a plant, a supplier, an origin or a customer, and `getEvidence` resolves none
 *    of those, so no evidence mapper is passed to either lens: activating a node reports the
 *    selection and opens no dialog, rather than opening one on a refusal.
 * 5. `TimelineDock` builds its own chart-table specification and takes the series, the reference and
 *    the events, so no table specification is supplied from here.
 * 6. The shell that mounts this screen must hand it the scope it holds, and take the selection and the
 *    wall-mode request back: a screen may not read the shell's stores (AAP §0.18.1), so with no
 *    `scope` prop the reads run on `Scope`'s empty "all plants and all products" selection. The
 *    obligation is stated on {@link FilemapCanvasScreenProps} rather than assumed here.
 *
 * Rules this module is built to satisfy: B-1 (no address, no request, no remote image), B-2 (no
 * credential, no configuration read), B-3 (regions named, controls keyboard operable with the shared
 * 24x24 px target and focus ring, the active lens stated in text, no motion), P-1 (every computed
 * figure carries the imported `Simulated calculation` label and no badge is rendered here), P-2
 * (`useService()` is the only data path), P-4 (the dock shows audit events as records and claims
 * nothing about resistance), P-5 (no competitor figure is printed or combined here), P-6 (no figure,
 * identifier, arithmetic or format), P-7 (the `FileMap canvas` name, and every place and party name
 * from the payload), and P-8 (every control acts or does not render).
 */
import { skipToken, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { PageHeader } from '../../components/page-header';
import { StateBoundary } from '../../components/state-boundary';
import type { StateBoundaryForbidden, StateBoundaryStale } from '../../components/state-boundary';
import { TimelineDock } from '../../components/timeline-dock';
import { ActionButton } from '../../components/tooltip';
import { useService } from '../../services/service-provider';
import { APPROVAL_GATE_SOURCE, SIM_LABELS, SOURCE_LABELS } from '../../types';
import type {
  Atlas,
  AuditEvent,
  ExceptionDetail,
  ExceptionId,
  ExceptionRow,
  Freshness,
  FreshnessState,
  Problem,
  Result,
  RibbonTile,
  Scope,
  ScreenState,
  SimLabel,
  Topology,
  TopologyNode,
} from '../../types';
import { CanvasRibbon } from './canvas-ribbon';
import type { CanvasRibbonProps } from './canvas-ribbon';
import { CanvasRightStack } from './canvas-right-stack';
import type { ProductHealthRow } from './canvas-right-stack';
import { GraphLens } from './graph-lens';
import { MapLens } from './map-lens';

/* ---------------------------------------------------------------------------------------------
 * The wording this module owns
 * ------------------------------------------------------------------------------------------- */

/**
 * Every caption, label and sentence this screen states.
 *
 * Held in one object so the wording has a single owner: the component renders these strings and a
 * suite names them through this object instead of retyping them. The title, the primary action and
 * the region names are this screen's own; the six tile captions name the aggregate keys the ribbon
 * payload reports, because `RibbonTile` carries no caption; the product figure's caption names the
 * amount beside it. None of them carries a figure, an amount, a date or a record identifier (rule
 * P-6), and none states a property of a deployment or a capability the demonstration does not
 * implement (rule P-4). The seven §5.3 simulation labels are never retyped here: they are read from
 * `SIM_LABELS`.
 */
export const FILEMAP_CANVAS_TEXT = {
  /** The eyebrow above the title: the product name rule P-7 fixes. */
  eyebrow: 'Site Intelligence',

  /** The screen's title, in the one level-one heading it renders (conflict K1 names the workspace). */
  title: 'FileMap canvas',

  /** The one-line account of what the two lenses and the dock below have in common. */
  description:
    'The client network on one surface: both lenses share one selection, the stack holds what needs a response, and the dock reads the exception that selection reaches.',

  /** The one action this screen exists to take, once a selection resolves to an exception. */
  primaryAction: 'Investigate selected exception',

  /** The accessible name of the group holding the two lens controls. */
  lensGroupLabel: 'Canvas lens',

  /** The map lens control's label, and the word the caption uses for the lens in view. */
  mapLens: 'Map lens',

  /** The graph lens control's label, and the word the caption uses for the lens in view. */
  graphLens: 'Graph lens',

  /** Introduces the caption that states which lens is being drawn, in words rather than colour. */
  lensCaptionPrefix: 'Lens in view:',

  /** The wall-mode control's label while wall mode is off: activating it enters the mode. */
  wallModeEnter: 'Enter wall mode',

  /** The wall-mode control's label while wall mode is on: activating it leaves the mode. */
  wallModeExit: 'Exit wall mode',

  /** The accessible name of the region the active lens is drawn in. */
  canvasRegionLabel: 'Canvas',

  /** The accessible name of the region holding the urgent exceptions and the product cards. */
  stackRegionLabel: 'Urgent exceptions and product health',

  /** What stands where the dock would be when the selection reaches no exception. */
  dockEmpty: 'No open exception in this selection is answered by the node selected on the canvas.',

  /** The caption of the first tile: the count of open exceptions in scope. */
  tileOpenExceptions: 'Open exceptions',

  /** The caption of the second tile: the count of exceptions at the head of the urgency order. */
  tileCriticalExceptions: 'Critical exceptions',

  /** The caption of the third tile: the revenue the open exceptions place at risk. */
  tileRevenueAtRisk: 'Revenue at risk',

  /** The caption of the fourth tile: the count of customer orders the exceptions reach. */
  tileCustomerOrdersAtRisk: 'Customer orders at risk',

  /** The caption of the fifth tile: the median hours from detection to an approved plan. */
  tileMedianHours: 'Median hours to approved plan',

  /** The caption of the sixth tile: how many plants the current selection covers. */
  tilePlantsInScope: 'Plants in scope',

  /** The caption above the one computed amount a product card shows. */
  productRevenueAtRisk: 'Revenue at risk',

  /** What the boundary says when the selection holds no node and no open exception. */
  empty: 'No node and no open exception fall in the current selection, so there is nothing to draw.',

  /** What the boundary says when a source behind the canvas answered incompletely. */
  partial:
    'A source behind these figures answered incompletely, so the canvas covers the records it supplied.',

  /** What the boundary says when the records moved under the reader. */
  conflict: 'These records changed while they were being read, so the canvas was not updated. Read it again.',

  /**
   * What the dock's events half says when the acting role may not read the audit trail.
   *
   * The trail is the dock's accessory read rather than a precondition of the canvas: `audit.read`
   * belongs to the auditor and the platform administrator, while this screen is the entry route of the
   * four planning personas, so a refused trail states itself here instead of replacing the surface the
   * reader came for. The sentence names the permission's absence and invents no record.
   */
  auditUnavailable:
    'The acting role may not read the audit trail, so no event is shown here.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The fixed strings, the windows and the references this screen composes
 * ------------------------------------------------------------------------------------------- */

/**
 * The one specification §5.3 label every computed figure on this surface carries:
 * `Simulated calculation`, taken from the tuple in `src/types/primitives.ts` that owns the seven
 * exact strings, so this module types no label text of its own (rule P-1).
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/** The route an exception is investigated at: SCR-03's path, fixed by AAP §0.12.4. */
const EXCEPTIONS_ROUTE = '/exceptions';

/**
 * The window this screen asks the queue for: the four most urgent exceptions AAP §0.12.4's SCR-12 row
 * fixes for the right stack.
 *
 * It is handed to `listExceptions` as a list parameter rather than applied to the result, so the
 * service's own ordering decides which four arrive and this file neither sorts nor truncates (rule
 * P-6). It is a window, not a figure: nothing displays it.
 */
const URGENT_EXCEPTION_LIMIT = 4;

/**
 * The window this screen asks the audit trail for: the five latest events the dock shows.
 *
 * Handed to `listAuditEvents` for the same reason, and read as a window rather than a figure.
 */
const AUDIT_EVENT_LIMIT = 5;

/**
 * The selection a screen reads when the shell supplies none: the empty plant and product arrays,
 * which `Scope` documents as "all plants" and "all products" rather than as "none".
 *
 * Declared once and reused, so the query keys of a screen the shell rendered without a scope stay
 * stable across renders instead of changing identity on every pass.
 */
const NO_SCOPE: Scope = { plants: [], products: [] };

/**
 * The root of the references this screen's aggregate figures carry, prefixed to the aggregate's own
 * key.
 *
 * See gap 3 in the module note: `RibbonTile` carries no reference and `getEvidence` resolves record
 * identifiers only, so an aggregate figure opens the drawer on a reference no record answers. The
 * reference still names the aggregate precisely and is stable across renders, so a figure keeps one
 * reference for one reading.
 */
const AGGREGATE_REF_ROOT = 'canvas';

/**
 * The reference one aggregate figure carries: the root, a colon, then the aggregate's own key.
 *
 * @param key - The aggregate the figure reports, as `RibbonTile.id` spells it.
 * @returns The reference the tile's evidence trigger carries.
 */
function aggregateRef(key: string): string {
  return `${AGGREGATE_REF_ROOT}:${key}`;
}

/**
 * What each of the ribbon's six tiles shows beyond its figure: the caption this screen owns for that
 * aggregate key and the reference the figure opens.
 *
 * Keyed by `RibbonTile.id`, the aggregate keys `src/domain/aggregation/urgency.ts` emits, so a tile
 * is matched to its caption by identity rather than by position and a key the payload does not carry
 * is ignored. `CanvasRibbon` renders nothing for a tile with no entry here, which is why every key the
 * aggregate builds has one.
 */
const RIBBON_PRESENTATION: CanvasRibbonProps['presentation'] = {
  'open-exceptions': {
    label: FILEMAP_CANVAS_TEXT.tileOpenExceptions,
    evidenceRef: aggregateRef('open-exceptions'),
  },
  'critical-exceptions': {
    label: FILEMAP_CANVAS_TEXT.tileCriticalExceptions,
    evidenceRef: aggregateRef('critical-exceptions'),
  },
  'revenue-at-risk': {
    label: FILEMAP_CANVAS_TEXT.tileRevenueAtRisk,
    evidenceRef: aggregateRef('revenue-at-risk'),
    kind: 'money',
  },
  'customer-orders-at-risk': {
    label: FILEMAP_CANVAS_TEXT.tileCustomerOrdersAtRisk,
    evidenceRef: aggregateRef('customer-orders-at-risk'),
  },
  'median-hours-to-approved-plan': {
    label: FILEMAP_CANVAS_TEXT.tileMedianHours,
    evidenceRef: aggregateRef('median-hours-to-approved-plan'),
  },
  'plants-in-scope': {
    label: FILEMAP_CANVAS_TEXT.tilePlantsInScope,
    evidenceRef: aggregateRef('plants-in-scope'),
  },
};

/* ---------------------------------------------------------------------------------------------
 * Layout, built from role tokens and the 4 px grid only
 * ------------------------------------------------------------------------------------------- */

/** The page frame: one column, separated by the 6-step of the spacing scale. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-6';

/** The toolbar: the lens switch on one side, the wall-mode control on the other. */
const TOOLBAR_CLASSES = 'flex min-w-0 flex-wrap items-center justify-between gap-3';

/** The two lens controls, side by side on the 4 px grid. */
const LENS_SWITCH_CLASSES = 'flex flex-wrap items-center gap-2';

/**
 * The caption stating which lens is drawn. It is the reason the active lens never depends on colour:
 * the two controls differ by their label and the words here say which one is in view (rule B-3).
 */
const LENS_CAPTION_CLASSES = 'min-w-0 text-13 text-text-secondary';

/**
 * The canvas row: the lens and the stack stacked below the 1280 px breakpoint and side by side from
 * it, which is the breakpoint AAP §0.12.4's layout note fixes for this screen.
 */
const CANVAS_ROW_CLASSES = 'flex min-w-0 flex-col items-stretch gap-4 xl:flex-row xl:items-start';

/**
 * The canvas region: 65% of the row where the row is a row.
 *
 * The proportion is AAP §0.12.4's, and it is stated as a fraction of the container rather than as a
 * pixel width so the lens keeps it at every viewport above the breakpoint. In wall mode the region
 * takes the whole row, because the mode exists to give the drawing the display.
 */
const CANVAS_REGION_CLASSES = 'min-w-0 xl:basis-[65%]';

/** The canvas region in wall mode: the whole row. */
const CANVAS_REGION_WALL_CLASSES = 'min-w-0 xl:basis-full';

/** The stack beside the canvas: the rest of the row. */
const STACK_REGION_CLASSES = 'min-w-0 xl:basis-[35%]';

/** The dock's slot: full width under the row, whatever the row did. */
const DOCK_CLASSES = 'flex min-w-0 flex-col';

/* ---------------------------------------------------------------------------------------------
 * Neutral empty collections, so a memoised member needs no fabricated record
 * ------------------------------------------------------------------------------------------- */

/** The exception rows of a read that has not settled, or settled to nothing. */
const NO_ROWS: readonly ExceptionRow[] = [];

/** The ribbon tiles of a read that has not settled, or settled to nothing. */
const NO_TILES: readonly RibbonTile[] = [];

/** The topology nodes of a payload that has not settled, or holds no node. */
const NO_NODES: readonly TopologyNode[] = [];

/** The audit events of a read that has not settled, or settled to nothing. */
const NO_EVENTS: readonly AuditEvent[] = [];

/* ---------------------------------------------------------------------------------------------
 * The topology, read as one list of nodes
 * ------------------------------------------------------------------------------------------- */

/**
 * Every node of one payload, in the four families' order.
 *
 * `Topology` carries the families as four arrays — the shape the lenses address directly — so a
 * selection, which is a node identifier whatever family it belongs to, needs them as one list. The
 * concatenation preserves each family's own order and computes nothing: it is the payload read a
 * second way, not a new population.
 *
 * @param topology - The payload the service returned, read and not modified.
 * @returns The four families' nodes in family order.
 */
function nodesOf(topology: Topology): readonly TopologyNode[] {
  return [
    ...topology.plants,
    ...topology.suppliers,
    ...topology.origins,
    ...topology.customers,
  ];
}

/**
 * The node identifier a canvas opens with when the shell holds no selection (rule P-6).
 *
 * The choice is made from service data and never from a literal. The most urgent exception's plant is
 * preferred, because the exception is what the screen exists to investigate and the plant is the only
 * field on an `ExceptionRow` a node can be joined to — a supplier, an origin and a customer are not
 * named on the row, so a plant node is the one kind a selection can resolve to an exception through.
 * Failing that, the first node the payload supplies is selected, so a scope whose exceptions fall
 * outside the four-row window still opens on a drawable network rather than on nothing.
 *
 * @param topology - The payload the service returned.
 * @param urgentRows - The urgent exceptions, in the service's own order.
 * @returns The identifier to select, or `null` when the payload holds no node at all.
 */
function resolveInitialSelection(
  topology: Topology,
  urgentRows: readonly ExceptionRow[],
): string | null {
  const plantIds = new Set(topology.plants.map((node) => node.id));

  for (const row of urgentRows) {
    if (plantIds.has(row.plantId)) {
      return row.plantId;
    }
  }

  const first = nodesOf(topology)[0];

  return first === undefined ? null : first.id;
}

/**
 * The exception a selected node answers, or `undefined` when the node answers none.
 *
 * An exception row names the plant the disruption lands on, so a plant node resolves to the first
 * exception on that plant as the service ordered them — the most urgent of them, because the ordering
 * is the service's. Any other node kind resolves to nothing: a supplier, an origin and a customer
 * carry no field on `ExceptionRow` to join on, and this module invents none (rule P-6).
 *
 * @param urgentRows - The urgent exceptions, in the service's own order.
 * @param node - The node the canvas holds as selected, if one is.
 * @returns The exception the selection reaches, or `undefined`.
 */
function resolveSelectedException(
  urgentRows: readonly ExceptionRow[],
  node: TopologyNode | undefined,
): ExceptionRow | undefined {
  if (node === undefined || node.kind !== 'plant') {
    return undefined;
  }

  return urgentRows.find((row) => row.plantId === node.id);
}

/**
 * One health card per product the urgent exceptions touch (AAP §0.12.4: "a health card per product").
 *
 * See gap 2 in the module note: the port declares no product-health and no product-name read, so each
 * card is built from the product identifiers the exception rows themselves carry and is named by that
 * identifier — the record's own spelling rather than an invented name. The one figure a card shows is
 * the revenue at risk the row's own aggregate states, which opens the exception record behind it, and
 * its label is the imported `Simulated calculation` one (rules P-1, P-6).
 *
 * The order is the rows' order and, within a row, the products' order, so a product's card sits where
 * the most urgent exception that reaches it sits; nothing is sorted, summed or averaged here.
 *
 * @param urgentRows - The urgent exceptions, in the service's own order.
 * @returns One row per distinct product the rows reach, or none when they reach none.
 */
function productHealthOf(urgentRows: readonly ExceptionRow[]): readonly ProductHealthRow[] {
  const seen = new Set<string>();
  const health: ProductHealthRow[] = [];

  for (const row of urgentRows) {
    for (const productId of row.productIds) {
      if (seen.has(productId)) {
        continue;
      }

      seen.add(productId);

      health.push({
        productId,
        productName: productId,
        figures: [
          {
            label: FILEMAP_CANVAS_TEXT.productRevenueAtRisk,
            value: row.revenueAtRiskEur,
            kind: 'money',
            evidenceRef: row.id,
            simLabel: CALCULATION_LABEL,
          },
        ],
      });
    }
  }

  return health;
}

/* ---------------------------------------------------------------------------------------------
 * The seven states, derived in one place from the reads
 * ------------------------------------------------------------------------------------------- */

/** What the state derivation reads: the query set's settled facts and the primary freshness report. */
interface ScreenStateInput {
  /** Whether any read the screen needs is still pending. */
  readonly pending: boolean;

  /** The first refusal or rejection among those reads, when one of them ended in one. */
  readonly error: unknown;

  /** The freshness report of the first read that settled, when one did. */
  readonly freshness: readonly Freshness[] | undefined;

  /** Whether the settled payloads hold anything to draw at all. */
  readonly hasContent: boolean;
}

/**
 * Whether a value is the service's own typed failure.
 *
 * A service call fails by throwing its `Problem` (contracts §2) and the query cache hands that same
 * value back as an `unknown` error, so its three required members are checked before the value is
 * treated as one. A rejection in another shape is a defect in the read rather than a refusal, and the
 * boundary then reports it as an unreachable source rather than printing a member nobody raised.
 *
 * @param error - The value the read rejected with.
 * @returns Whether the value is a `Problem`.
 */
function isProblem(error: unknown): error is Problem {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if (!('type' in error) || !('message' in error) || !('traceId' in error)) {
    return false;
  }

  const { type, message, traceId } = error;

  return typeof type === 'string' && typeof message === 'string' && typeof traceId === 'string';
}

/**
 * Whether a source in the read's freshness report answered in the state asked about.
 *
 * `Result.meta.freshness` is the adapter's own account of what each of the six sources did, so the
 * states are read from that report rather than inferred from a figure (AAP §0.2.1).
 *
 * @param freshness - The read's freshness report.
 * @param state - The state to look for.
 * @returns Whether a source reported it.
 */
function reportsState(freshness: readonly Freshness[], state: FreshnessState): boolean {
  return freshness.some((entry) => entry.state === state);
}

/**
 * The source behind a stale canvas, with the display name to print and the instant it last answered.
 *
 * The order book is looked for first, because ERP is the source that gates the approval a planner
 * takes from this screen (AAP §0.2.1), and another stale source is reported when the order book is
 * current. The label comes from `SOURCE_LABELS`, the map that owns the six display names, so the
 * banner and the top bar's pill say the same words about the same source.
 *
 * @param freshness - The read's freshness report.
 * @returns The record the banner names, or `undefined` when no source is stale.
 */
function staleSourceOf(freshness: readonly Freshness[]): StateBoundaryStale | undefined {
  const orderBook = freshness.find(
    (entry) => entry.source === APPROVAL_GATE_SOURCE && entry.state === 'stale',
  );
  const stale = orderBook ?? freshness.find((entry) => entry.state === 'stale');

  if (stale === undefined) {
    return undefined;
  }

  return {
    source: stale.source,
    label: SOURCE_LABELS[stale.source],
    asOf: stale.asOf,
  };
}

/**
 * The denial the forbidden card explains, or `undefined` when the read was refused for another reason.
 *
 * The card's evidence is the failure's own: the permission the acting role lacks, the roles that hold
 * it and the trace identifier of the refused call. A refusal that named no permission supplies no
 * card rather than one naming a permission nobody was refused for.
 *
 * @param error - The value the read rejected with.
 * @returns The denial, or `undefined`.
 */
function forbiddenOf(error: unknown): StateBoundaryForbidden | undefined {
  if (!isProblem(error) || error.type !== 'permission') {
    return undefined;
  }

  const permission = error.requiredPermission;

  if (permission === undefined) {
    return undefined;
  }

  return {
    permission,
    roles: error.rolesWithPermission ?? [],
    traceId: error.traceId,
  };
}

/**
 * The state this screen's records are in, or `undefined` when no exceptional state holds.
 *
 * The `switch`-free precedence below is the state order AAP §0.12.4 and the boundary's own contract
 * fix: a refusal is reported before a failure, a failure before the pending read, the sources' own
 * reports before the payload's emptiness, and emptiness last, because a scope with nothing in it is a
 * real answer rather than a fault. `ScreenState` carries exactly specification §8's seven members and
 * no healthy member, so a current and complete read returns `undefined`, which `StateBoundary`
 * renders as its content alone.
 *
 * @param input - The query set's settled facts and the primary freshness report.
 * @returns The state to render, or `undefined` for no exceptional state.
 */
function deriveScreenState({
  pending,
  error,
  freshness,
  hasContent,
}: ScreenStateInput): ScreenState | undefined {
  if (isProblem(error)) {
    if (error.type === 'permission') {
      return 'forbidden';
    }

    return error.type === 'validation' ? 'conflict' : 'offline';
  }

  if (error !== null && error !== undefined) {
    return 'offline';
  }

  if (pending || freshness === undefined) {
    return 'loading';
  }

  if (reportsState(freshness, 'unavailable')) {
    return 'offline';
  }

  if (staleSourceOf(freshness) !== undefined) {
    return 'stale';
  }

  if (reportsState(freshness, 'partial')) {
    return 'partial';
  }

  return hasContent ? undefined : 'empty';
}

/* ---------------------------------------------------------------------------------------------
 * Props
 * ------------------------------------------------------------------------------------------- */

/**
 * Props of {@link FilemapCanvasScreen}.
 *
 * Every member is optional and defaulted inside the component, because the route element that renders
 * this screen is declared elsewhere in the shell and may hand it none of them: a shell that owns the
 * scope, the selection and the navigation calls the screen with them, and a shell that does not gets a
 * screen that still draws, still switches lenses, still toggles wall mode and still investigates the
 * exception its selection resolves to.
 *
 * THE ROUTING OBLIGATION, stated here because it is the one part of this screen's contract the screen
 * cannot enforce itself. The route element is the shell's, and this screen may not read the shell's
 * stores (AAP §0.18.1), so a shell that holds a filtered selection must pass it: with no `scope` the
 * screen reads the empty selection, which `Scope` defines as "all plants and all products" and which
 * is the right reading only for a shell that has not filtered yet. The same holds, the other way
 * round, for the selection and the wall-mode request — a shell that displays either must receive it
 * through {@link FilemapCanvasScreenProps.onSelectedNodeChange} and
 * {@link FilemapCanvasScreenProps.onWallModeChange}, or the reader's choice stays inside this screen.
 */
export interface FilemapCanvasScreenProps {
  /**
   * The shell's plant and product selection, forwarded unchanged to every port call that takes one:
   * `getTopology`, `getCanvasRibbon` and `listExceptions`. The other reads — `getExceptionDetail`,
   * `listAuditEvents` and `getAtlas` — take no scope, by the port's own signatures.
   *
   * The service intersects it with the acting role's plant scope before it answers, so this screen
   * never narrows a result itself (AAP §0.2.1). Absent, the read uses the empty selection `Scope`
   * documents as "all plants and all products"; a shell that holds a filtered selection and omits it
   * would show the unfiltered network beside a filtered queue, which is exactly why the routing note
   * above states the obligation.
   */
  readonly scope?: Scope;

  /**
   * The node the shell holds as selected, shared with the two lenses (AAP §0.12.4).
   *
   * `undefined` and `null` both mean the shell holds no selection, in which case the screen resolves
   * one from the payloads it read — never from a literal (rule P-6). A value is used as given and the
   * screen's own choice of node is ignored, so a shell that owns the selection owns it completely.
   */
  readonly selectedNodeId?: string | null;

  /**
   * Reports the node a reader activated in either lens, and `null` when a selection is cleared.
   *
   * Absent, the screen keeps the selection itself, so activating a node still moves both lenses and
   * the primary action with no handler in reach (rule P-8).
   */
  readonly onSelectedNodeChange?: (nodeId: string | null) => void;

  /**
   * Reports the wall-mode request the toggle makes.
   *
   * The shell owns the navigation, so hiding it is the shell's work: this screen never imports the
   * shell's modules. Absent, the toggle still changes the mode and the canvas still takes the full
   * width of its own row, so the control performs its visible function either way (rule P-8).
   */
  readonly onWallModeChange?: (wallMode: boolean) => void;
}

/* ---------------------------------------------------------------------------------------------
 * The two lenses, named once
 * ------------------------------------------------------------------------------------------- */

/** Which lens the canvas is drawing; the two members are the switch's two controls. */
type LensId = 'map' | 'graph';

/** The lens the canvas opens on: the map, because it places the network before the graph bands it. */
const DEFAULT_LENS: LensId = 'map';



/* ---------------------------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------------------------- */

/**
 * SCR-12 FileMap canvas: the ribbon, the two lenses, the right stack and the dock.
 *
 * Five reads go through the port, each keyed by its method's own name and the arguments it was made
 * with (AAP §0.6.2), so a scope change re-reads the topology, the ribbon and the queue together and a
 * write that invalidates one of those reads reaches this screen:
 *
 * - `getTopology(scope)` — the four node families, the lanes and the pin counts both lenses draw;
 * - `getCanvasRibbon(scope)` — the six computed tiles above the canvas;
 * - `listExceptions({ limit }, scope)` — the four most urgent exceptions, in the service's order and
 *   within the service's window, for the right stack;
 * - `listAuditEvents({ limit })` — the five latest events the dock prints;
 * - `getExceptionDetail(id)` — the selected exception's own title and projected closing stock, read
 *   only once a selection resolves to an exception.
 *
 * `getAtlas()` is the sixth read and the only optional one: its refusal degrades the map lens to the
 * first-party network, so its failure is never the screen's failure.
 *
 * Nothing here writes, so a re-render can move no record; the state the component owns is the
 * reader's own — the lens in view, wall mode and a selection the shell has not taken over.
 *
 * @param props - The shell's scope, the selection it holds and the two callbacks it offers. See
 *   {@link FilemapCanvasScreenProps}: every member is optional.
 * @returns The header with its primary action, the ribbon, the toolbar, the two regions and the dock,
 *   all inside the state boundary the reads settled to.
 */
export function FilemapCanvasScreen(props: FilemapCanvasScreenProps): ReactElement {
  const service = useService();
  const navigate = useNavigate();

  const scope = props.scope ?? NO_SCOPE;

  const [lens, setLens] = useState<LensId>(DEFAULT_LENS);
  const [wallMode, setWallMode] = useState(false);
  const [ownSelection, setOwnSelection] = useState<string | null>(null);

  /*
   * Retries are off on purpose: a refusal the acting role's permissions produce fails the same way
   * however often it is repeated, and the boundary offers the reader an explicit retry for the case
   * where repeating the read can succeed.
   */
  const topologyQuery = useQuery<Result<Topology>, unknown>({
    queryKey: ['getTopology', scope],
    queryFn: () => service.getTopology(scope),
    retry: false,
  });

  const ribbonQuery = useQuery<Result<RibbonTile[]>, unknown>({
    queryKey: ['getCanvasRibbon', scope],
    queryFn: () => service.getCanvasRibbon(scope),
    retry: false,
  });

  const urgentQuery = useQuery<Result<ExceptionRow[]>, unknown>({
    queryKey: ['listExceptions', { limit: URGENT_EXCEPTION_LIMIT }, scope],
    queryFn: () => service.listExceptions({ limit: URGENT_EXCEPTION_LIMIT }, scope),
    retry: false,
  });

  const auditQuery = useQuery<Result<AuditEvent[]>, unknown>({
    queryKey: ['listAuditEvents', { limit: AUDIT_EVENT_LIMIT }],
    queryFn: () => service.listAuditEvents({ limit: AUDIT_EVENT_LIMIT }),
    retry: false,
  });

  const atlasQuery = useQuery<Result<Atlas>, unknown>({
    queryKey: ['getAtlas'],
    queryFn: () => service.getAtlas(),
    retry: false,
  });

  /*
   * Whether the trail was refused rather than unanswered: only a refusal has a reader-facing
   * explanation worth printing, and an unreachable source keeps the dock's own neutral sentence so a
   * defect is never described as a permission.
   *
   * It is read before the events because it decides them. A refusal is the service's answer that this
   * role holds no event, so what the read still carries must not reach the dock (rule P-2): the role
   * switch invalidates every read and React Query keeps the previous `data` across the refetch it
   * starts, so a role without `audit.read` would otherwise be handed the records the previous role
   * read together with their evidence controls (rule P-8) — exactly the case the dock's refusal
   * sentence exists to cover.
   */
  const trailRefused = isProblem(auditQuery.error) && auditQuery.error.type === 'permission';

  const topology = topologyQuery.data?.data;
  const ribbonTiles = ribbonQuery.data?.data ?? NO_TILES;
  const urgentRows = urgentQuery.data?.data ?? NO_ROWS;
  const auditEvents = trailRefused ? NO_EVENTS : (auditQuery.data?.data ?? NO_EVENTS);
  const atlas = atlasQuery.data?.data;

  const nodes = useMemo(
    () => (topology === undefined ? NO_NODES : nodesOf(topology)),
    [topology],
  );

  /*
   * The selection: the shell's when it holds one, the reader's own next, and otherwise the node the
   * payloads resolve — never a literal identifier (rule P-6). `null` from the shell counts as no
   * selection, which is why the two nullish checks chain rather than stopping at the first.
   */
  const initialSelection = useMemo(
    () => (topology === undefined ? null : resolveInitialSelection(topology, urgentRows)),
    [topology, urgentRows],
  );
  const selectedNodeId = props.selectedNodeId ?? ownSelection ?? initialSelection;

  const selectedNode = useMemo(
    () => (selectedNodeId === null ? undefined : nodes.find((node) => node.id === selectedNodeId)),
    [nodes, selectedNodeId],
  );

  const selectedException = useMemo(
    () => resolveSelectedException(urgentRows, selectedNode),
    [urgentRows, selectedNode],
  );

  /*
   * The selected exception's own detail: the projection the dock draws and the title it prints. The
   * read is skipped rather than guessed when no exception resolves, so a selection that reaches none
   * asks the service for nothing rather than for a record it does not have.
   */
  const detailQuery = useQuery<Result<ExceptionDetail>, unknown>({
    queryKey: ['getExceptionDetail', selectedException === undefined ? null : selectedException.id],
    queryFn:
      selectedException === undefined
        ? skipToken
        : () => service.getExceptionDetail(selectedException.id),
    retry: false,
  });

  const detail = detailQuery.data?.data;
  const productHealth = useMemo(() => productHealthOf(urgentRows), [urgentRows]);

  /*
   * The state, read from what the three reads the surface needs settled to. A typed refusal outranks an
   * untyped rejection, and neither the atlas nor the audit trail is among them: the atlas is the one
   * optional read, because its refusal degrades an overlay rather than the surface, and the trail is the
   * dock's accessory read, because `audit.read` belongs to the auditor and the platform administrator
   * while this screen is the entry route of the four planning personas — a refused trail states itself
   * in the dock's events half instead of blanking the canvas those personas land on (rule P-8).
   */
  const errors = [topologyQuery.error, ribbonQuery.error, urgentQuery.error];
  const failure =
    errors.find((error) => isProblem(error)) ??
    errors.find((error) => error !== null && error !== undefined);
  const pending =
    topologyQuery.isPending ||
    ribbonQuery.isPending ||
    urgentQuery.isPending ||
    auditQuery.isPending;
  const freshness = (topologyQuery.data ?? ribbonQuery.data ?? urgentQuery.data ?? auditQuery.data)
    ?.meta.freshness;
  const hasContent = nodes.length > 0 && urgentRows.length > 0;

  const state = deriveScreenState({ pending, error: failure, freshness, hasContent });
  const staleRecord = freshness === undefined ? undefined : staleSourceOf(freshness);
  const forbiddenRecord = forbiddenOf(failure);

  /** Asks the port for the four reads again, which is what the boundary's retry control does. */
  function retryReads(): void {
    void topologyQuery.refetch();
    void ribbonQuery.refetch();
    void urgentQuery.refetch();
    void auditQuery.refetch();
  }

  /** Takes a node a lens reports as the selection, in this screen and — if the shell wants it — there. */
  function selectNode(nodeId: string): void {
    setOwnSelection(nodeId);
    props.onSelectedNodeChange?.(nodeId);
  }

  /** Flips wall mode, applies it here and reports it, because hiding the navigation is the shell's. */
  function toggleWallMode(): void {
    const next = !wallMode;
    setWallMode(next);
    props.onWallModeChange?.(next);
  }

  /** Opens the investigation of the exception the selection reaches (SCR-03's route). */
  function investigate(exceptionId: ExceptionId): void {
    void navigate(`${EXCEPTIONS_ROUTE}/${encodeURIComponent(exceptionId)}`);
  }

  /*
   * The primary action exists only while a selection resolves to an exception: the specification fixes
   * no explanation for the other case, and a control that could not act would be the dead control rule
   * P-8 forbids.
   */
  const headerActions: ReactNode =
    selectedException === undefined ? undefined : (
      <ActionButton
        variant="primary"
        onClick={() => {
          investigate(selectedException.id);
        }}
      >
        {FILEMAP_CANVAS_TEXT.primaryAction}
      </ActionButton>
    );

  const lensLabel = lens === 'map' ? FILEMAP_CANVAS_TEXT.mapLens : FILEMAP_CANVAS_TEXT.graphLens;

  return (
    <div className={SCREEN_CLASSES}>
      <PageHeader
        title={FILEMAP_CANVAS_TEXT.title}
        eyebrow={FILEMAP_CANVAS_TEXT.eyebrow}
        description={FILEMAP_CANVAS_TEXT.description}
        actions={headerActions}
      />

      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryReads}
        emptyMessage={FILEMAP_CANVAS_TEXT.empty}
        partialMessage={FILEMAP_CANVAS_TEXT.partial}
        conflictMessage={FILEMAP_CANVAS_TEXT.conflict}
        forbidden={forbiddenRecord}
      >
        {topology === undefined ? null : (
          <>
            <CanvasRibbon tiles={ribbonTiles} presentation={RIBBON_PRESENTATION} />

            <div className={TOOLBAR_CLASSES}>
              <div
                role="group"
                aria-label={FILEMAP_CANVAS_TEXT.lensGroupLabel}
                className={LENS_SWITCH_CLASSES}
              >
                <ActionButton
                  variant={lens === 'map' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setLens('map');
                  }}
                >
                  {FILEMAP_CANVAS_TEXT.mapLens}
                </ActionButton>
                <ActionButton
                  variant={lens === 'graph' ? 'primary' : 'secondary'}
                  onClick={() => {
                    setLens('graph');
                  }}
                >
                  {FILEMAP_CANVAS_TEXT.graphLens}
                </ActionButton>
                {/* The lens in view, in words: the two controls differ by label and the state is
                    stated here rather than by colour alone (rule B-3). */}
                <span className={LENS_CAPTION_CLASSES}>
                  {`${FILEMAP_CANVAS_TEXT.lensCaptionPrefix} ${lensLabel}`}
                </span>
              </div>

              <ActionButton onClick={toggleWallMode}>
                {wallMode ? FILEMAP_CANVAS_TEXT.wallModeExit : FILEMAP_CANVAS_TEXT.wallModeEnter}
              </ActionButton>
            </div>

            <div className={CANVAS_ROW_CLASSES}>
              <section
                aria-label={FILEMAP_CANVAS_TEXT.canvasRegionLabel}
                className={wallMode ? CANVAS_REGION_WALL_CLASSES : CANVAS_REGION_CLASSES}
              >
                {lens === 'map' ? (
                  <MapLens
                    topology={topology}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={selectNode}
                    atlas={atlas}
                  />
                ) : (
                  <GraphLens
                    topology={topology}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={selectNode}
                  />
                )}
              </section>

              {wallMode ? null : (
                <aside
                  aria-label={FILEMAP_CANVAS_TEXT.stackRegionLabel}
                  className={STACK_REGION_CLASSES}
                >
                  <CanvasRightStack
                    urgentExceptions={urgentRows}
                    productHealth={productHealth}
                    onSelectException={investigate}
                  />
                </aside>
              )}
            </div>

            {selectedException === undefined ? (
              <div className={DOCK_CLASSES}>
                {/* No exception to project: the dock explains the gap rather than showing empty axes. */}
                <StateBoundary state="empty" emptyMessage={FILEMAP_CANVAS_TEXT.dockEmpty}>
                  {null}
                </StateBoundary>
              </div>
            ) : detail === undefined ? null : (
              <div className={DOCK_CLASSES}>
                <TimelineDock
                  exceptionId={selectedException.id}
                  exceptionTitle={detail.exception.title}
                  stockSeries={detail.stockSeries}
                  stockEvidenceRef={selectedException.id}
                  auditEvents={auditEvents}
                  auditEmptyMessage={
                    trailRefused ? FILEMAP_CANVAS_TEXT.auditUnavailable : undefined
                  }
                />
              </div>
            )}
          </>
        )}
      </StateBoundary>
    </div>
  );
}
