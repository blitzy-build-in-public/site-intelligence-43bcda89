/**
 * Component suite for `filemap-canvas-screen.tsx`, the SCR-12 FileMap canvas of stage S2.
 *
 * WHAT IS UNDER TEST. The screen is the listener of `/canvas` and the composer of four presentational
 * siblings, so every case below asserts a clause of that composition rather than its markup: the lens
 * is drawn in a region that takes 65% of the row from the wide breakpoint and stacks under it; the
 * ribbon shows one labelled tile per aggregate the read returned, each carrying its own
 * `Simulated calculation` label inside the tile that owns the figure (rule P-1); a node activated in
 * one lens is the node the other lens holds as selected, because the screen owns the one selection
 * both lenses are handed (AAP §0.12.4); wall mode reports every request to the shell that owns the
 * navigation and gives the drawing the whole row whether or not a shell is listening (rule P-8); the
 * dock prints exactly the five events the audit read returned, in the order it returned them, and draws
 * the exception's own baseline together with the option in view on one scale, each series carrying its
 * own §5.3 label in its own row, the frame stating the one label true of both, its table view
 * reproducing those marks column by column, and an exception whose records project nothing stating that
 * (rule P-1, rule B-3); a plant whose exception ranks below the four-row window is resolved by the one
 * read narrowed to that plant, a plant the covering read answers nothing for keeps the dock's empty
 * sentence, and each of the dock's two reads states its own pending and failed condition where the dock
 * stands rather than emptying the canvas around it (rules P-6, P-8); each of the seven states
 * specification §8 fixes renders for the
 * outcome the screen derives it from, driven only by what the stubbed reads and their `Result.meta`
 * report and never by a flag name (AAP §0.8, §0.12.1); the primary action exists only while the
 * selection reaches an exception, and it navigates to that exception's own route; a product card's
 * figure is captioned with the exception whose amount it shows, a scope that draws a network with no
 * open exception renders the surface rather than the empty state, and each caption that changes
 * without a page load is a status region (rules P-6, B-3); a node the reader activates opens the
 * evidence of the record it stands for, a ribbon tile's reference states the selection the canvas reads
 * were made with so its drawer is computed over the tile's own population, and the graph lens's preview
 * switch arms from the selected exception's own option set and keeps the drawing's disabled reason when
 * that set offers none (AAP §0.2.1 F12, §0.12.4); both themes draw the same surface; the whole control
 * set is reachable and operable from the keyboard alone (rule B-3); the one control on the canvas that
 * cannot act says why (rule P-8); and no case asks any origin for anything or finds a test hook in the
 * output (rule B-1).
 *
 * WHERE THE DATA COMES FROM. The service is mocked at `service-provider.tsx`, the one boundary a
 * screen may read through (rule P-2), so no seed module, no adapter, no HTTP client and nothing from
 * `tests/fixtures/` is involved, and a case observes exactly the calls the screen makes. Everything
 * else — `CanvasRibbon`, both lenses, `CanvasRightStack`, `TimelineDock`, `StateBoundary`,
 * `ForbiddenCard`, `MetricTile`, `ActionButton` and the SVG surfaces under them — is the real
 * component, because what a reader receives is the thing under test.
 *
 * THE FIXTURES ARE INPUT, NOT EXPECTED RESULTS (rule P-6). Every figure asserted below is the value
 * the stub returned, compared as returned: no case recomputes one, no case types one as a currency
 * string, and each amount is read back through the one formatter the interface uses. The identifiers
 * are opaque placeholders (`node-plant`, `exception-gamma`, `event-alpha`) rather than
 * domain-identifier shapes, so the figures scan that covers `src/features/**` reads this file without
 * a collision, and the only literals a case states are structural: six tiles, five rows, one button.
 * The wording this suite drives by name is imported from the module that owns it wherever the module
 * exports it (`FILEMAP_CANVAS_TEXT`, `STATE_BOUNDARY_TEXT`, `DEPENDENCY_GRAPH_TEXT`,
 * `MAP_CANVAS_TEXT`, `TIMELINE_DOCK_TEXT`, `SOURCE_LABELS`, `SIM_LABELS`); `CanvasRibbon`'s group
 * name is the one string kept private upstream and restated once in {@link UI}, so a reworded
 * caption reaches one place here.
 *
 * NO SHELL IS SUPPLIED, ON PURPOSE. The screen documents that a shell hands it the scope, the
 * selection and the wall-mode request, and that it may read none of the shell's stores
 * (AAP §0.18.1). This suite therefore mounts it with no shell provider, no navigation and no store,
 * handing it a `scope` prop only where a case observes the selection its reads were made with, exactly
 * as the shell would: what it proves is the screen's own behaviour — including the full-bleed layout it
 * applies to what it owns — which is also the indirect evidence that the screen reaches nothing in
 * `src/app`.
 *
 * Rules this suite is written to hold to:
 * - B-1: the request spies prove the surface fetches nothing while it is drawn and operated, and the
 *   attribute scan proves no element it renders addresses a host or embeds a remote resource.
 * - B-3: every interaction is driven from the keyboard through `@testing-library/user-event`, the
 *   canvas regions are found by their accessible names, and no assertion compares a colour value.
 * - P-1: every label this suite names is read from `SIM_LABELS` and asserted inside the element that
 *   carries the figure, never against a page-level badge.
 * - P-2: only the provider module is mocked; the stub is typed against `SiteIntelligenceService`, so a
 *   renamed port member fails the type check instead of widening the stub.
 * - P-6: every expectation is derived from the inline payload or from a structural count.
 * - P-7: the workspace is the FileMap canvas, and every place and party name arrives from the payload.
 * - P-8: the disabled `Open part` control is asserted to explain itself on focus, and every control in
 *   the canvas that reports itself unavailable is asserted to carry a reason.
 *
 * The suite runs in the jsdom environment `vite.config.ts` sets by default. Nothing here hashes, reads
 * the system clock, touches the network or reaches outside the service boundary.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { DEPENDENCY_GRAPH_TEXT } from '../../components/dependency-graph';
import { EVIDENCE_DRAWER_TEXT } from '../../components/evidence-drawer';
import { MAP_CANVAS_TEXT } from '../../components/map-canvas';
import { formatMeasuredHours, formatMoney } from '../../components/mono-value';
import { STATE_BOUNDARY_TEXT } from '../../components/state-boundary';
import { TIMELINE_DOCK_TEXT } from '../../components/timeline-dock';
import { VIEW_AS_TABLE_LABELS } from '../../components/view-as-table-toggle';
import type { SiteIntelligenceService } from '../../services/site-intelligence-service';
import {
  APPROVAL_GATE_SOURCE,
  DEMO_CLOCK,
  SIM_LABELS,
  SOURCE_IDS,
  SOURCE_LABELS,
} from '../../types';
import type {
  Atlas,
  AuditEvent,
  AuditResult,
  Chokepoint,
  Confidence,
  DailyClosingStockPoint,
  ExceptionDetail,
  ExceptionRow,
  Evidence,
  Freshness,
  FreshnessState,
  IsoDate,
  Meta,
  Money,
  Permission,
  PinCounts,
  PlantId,
  Problem,
  ProductId,
  Result,
  RibbonTile,
  Role,
  Scenario,
  ScenarioId,
  ScenarioSet,
  Scope,
  Severity,
  Timestamp,
  Topology,
} from '../../types';
import {
  DOCK_EVENT_ORDER,
  FILEMAP_CANVAS_TEXT,
  FilemapCanvasScreen,
  resetCanvasViewState,
} from './filemap-canvas-screen';
import type { FilemapCanvasScreenProps } from './filemap-canvas-screen';
import { MAP_LENS_TEXT } from './map-lens';

/* ---------------------------------------------------------------------------------------------
 * The port, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/**
 * The members of the port this screen reads, and the only ones this suite stubs.
 *
 * Typed as a `Pick` of the port rather than as a shape of this file's own, so the stub cannot drift
 * from the interface: a member the screen starts to call that the stub does not carry fails the type
 * check here instead of arriving at run time as a call on `undefined`. The screen is the only reader
 * of these eight — the last is the drawer's own read, asked for whichever reference the screen gave
 * a figure — and no other member of `SiteIntelligenceService` answers a surface this suite mounts.
 */
type CanvasPort = Pick<
  SiteIntelligenceService,
  | 'getTopology'
  | 'getCanvasRibbon'
  | 'listExceptions'
  | 'listAuditEvents'
  | 'getAtlas'
  | 'getExceptionDetail'
  | 'getScenarioSet'
  | 'getEvidence'
>;

/**
 * The stub every case drives: one mock per member, each typed by the port's own signature.
 *
 * `vi.hoisted` because `vi.mock`'s factory runs before this module's declarations exist, and the mocks
 * a case arms afterwards have to be the same objects the screen calls.
 */
const port: { readonly [K in keyof CanvasPort]: Mock<CanvasPort[K]> } = vi.hoisted(() => ({
  getTopology: vi.fn<SiteIntelligenceService['getTopology']>(),
  getCanvasRibbon: vi.fn<SiteIntelligenceService['getCanvasRibbon']>(),
  listExceptions: vi.fn<SiteIntelligenceService['listExceptions']>(),
  listAuditEvents: vi.fn<SiteIntelligenceService['listAuditEvents']>(),
  getAtlas: vi.fn<SiteIntelligenceService['getAtlas']>(),
  getExceptionDetail: vi.fn<SiteIntelligenceService['getExceptionDetail']>(),
  getScenarioSet: vi.fn<SiteIntelligenceService['getScenarioSet']>(),
  getEvidence: vi.fn<SiteIntelligenceService['getEvidence']>(),
}));

/**
 * Replaces the provider module: the one boundary a screen may read through (rule P-2).
 *
 * The screen reads `useService` alone, and the other two exports are answered with nothing so a
 * component that asks for the demonstration controls or the active user finds an honest absence
 * rather than a missing export.
 */
vi.mock('../../services/service-provider', () => ({
  useService: () => port,
  useDemonstration: () => null,
  useActiveUser: () => null,
}));

/* ---------------------------------------------------------------------------------------------
 * The one piece of wording this suite cannot import
 * ------------------------------------------------------------------------------------------- */

/**
 * The strings no module exports.
 *
 * `canvas-ribbon.tsx` keeps the accessible name of the group it renders private, so it is restated
 * once here rather than guessed at every assertion. It is not a specification string, and every other
 * string this suite names — the screen's own captions, the boundary's sentences, the graph's strip
 * caption, the dock's heading, the six source names and the seven §5.3 labels — is imported from the
 * module that owns it.
 */
const UI = {
  /** The accessible name the ribbon gives the row of tiles it renders. */
  ribbon: 'Canvas ribbon',
} as const;

/** The route the screen is mounted at, and the route the primary action navigates to. */
const CANVAS_ROUTE = '/canvas';
const EXCEPTION_ROUTE = '/exceptions/:exceptionId';

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/** The correlation identifier every stubbed answer carries, as `Meta.traceId`. */
const TRACE_ID = 'trace-canvas';

/**
 * The selection a shell that has not filtered yet holds: the empty plant and product arrays, which
 * `Scope` documents as "all plants" and "all products" rather than as "none".
 */
const NO_SCOPE: Scope = { plants: [], products: [] };

/**
 * The two windows the screen hands the service: the four most urgent rows the stack shows and the five
 * latest events the dock prints (AAP §0.12.4).
 *
 * They are windows rather than figures — nothing displays them — and they are stated here so a case
 * can assert that the screen asked for them instead of applying them itself (rule P-6).
 */
const URGENT_WINDOW = 4;
const AUDIT_WINDOW = 5;

/**
 * The greatest number of focus stops a keyboard case walks before it fails, which is generous enough
 * for the controls of a lens this suite does not own and small enough that a missing control fails.
 */
const TAB_WALK_LIMIT = 24;

/** The demonstration clock's own calendar date, read from its owner rather than typed (rule P-6). */
const CLOCK_DATE: IsoDate = DEMO_CLOCK.slice(0, 10);

/** The instant every fixture record is stamped with: the constant demonstration clock. */
const AS_OF: Timestamp = DEMO_CLOCK;

/** The persona every fixture record is owned by, as the payload spells it. */
const OWNER_ID = 'user-alpha';

/**
 * The calendar date one day after a date, so the dock's two-point series is derived from the
 * demonstration clock instead of being typed as a second literal (rule P-6).
 *
 * @param date - The calendar date to step past.
 * @returns The next calendar date, `YYYY-MM-DD`.
 */
function dayAfter(date: IsoDate): IsoDate {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);

  return next.toISOString().slice(0, 10);
}

/* ---------------------------------------------------------------------------------------------
 * The payload both lenses draw
 * ------------------------------------------------------------------------------------------- */

/** One empty count record: every one of the six states, zero included, as `PinCounts` requires. */
const NO_PINS: PinCounts = { empty: 0, pending: 0, pass: 0, fail: 0, stale: 0, review: 0 };

/**
 * A nine-node network: two nodes of every family, one material at the site it is bought from, one lane
 * chain from a tier-2 origin through a supplier, that material and a plant to a customer, and pin counts
 * that between them cover each of the six `PinState` members.
 *
 * The coordinates sit across Europe, the Gulf of Mexico and Japan so every node lands inside the world
 * view, and the plant the canvas opens on carries both a product and a stale pin, so the staged
 * `Open part` control and a non-empty pin summary are both reachable. One plant carries counts of zero
 * in every state and one supplier is absent from `pinsByNode` altogether, so both readings of "no
 * evidence pins" are exercised by the real drawing rather than asserted from a shape; the material is
 * absent from it too, because no evidence pin is attached to a material record.
 */
const TOPOLOGY: Topology = {
  plants: [
    {
      id: 'node-plant',
      kind: 'plant',
      label: 'Northgate plant',
      latitude: 49.02,
      longitude: 12.1,
      productIds: ['product-one'],
    },
    {
      id: 'node-plant-second',
      kind: 'plant',
      label: 'Vltava plant',
      latitude: 49.19,
      longitude: 16.61,
      productIds: ['product-two'],
    },
  ],
  suppliers: [
    {
      id: 'node-supplier',
      kind: 'supplier',
      label: 'Halvard Components',
      latitude: 48.14,
      longitude: 11.58,
      productIds: ['product-one'],
    },
    {
      id: 'node-supplier-second',
      kind: 'supplier',
      label: 'Sundvik Parts',
      latitude: 57.7,
      longitude: 11.97,
      productIds: ['product-two'],
    },
  ],
  materials: [
    {
      id: 'node-material',
      kind: 'material',
      label: 'Cold-rolled coil',
      latitude: 48.14,
      longitude: 11.58,
      productIds: ['product-one'],
    },
  ],
  origins: [
    {
      id: 'node-origin',
      kind: 'origin',
      label: 'Ordival Metals',
      latitude: 21.5,
      longitude: -101.5,
      productIds: [],
    },
    {
      id: 'node-origin-second',
      kind: 'origin',
      label: 'Kazeyama Alloys',
      latitude: 34.7,
      longitude: 135.5,
      productIds: ['product-two'],
    },
  ],
  customers: [
    {
      id: 'node-customer',
      kind: 'customer',
      label: 'Harbourgate Fleetworks',
      latitude: 53.55,
      longitude: 9.99,
      productIds: [],
    },
    {
      id: 'node-customer-second',
      kind: 'customer',
      label: 'Alpenrand Haulage',
      latitude: 45.46,
      longitude: 9.19,
      productIds: [],
    },
  ],
  lanes: [
    { fromId: 'node-origin', toId: 'node-supplier' },
    { fromId: 'node-supplier', toId: 'node-material' },
    { fromId: 'node-material', toId: 'node-plant' },
    { fromId: 'node-plant', toId: 'node-customer' },
  ],
  pinsByNode: {
    'node-supplier': { ...NO_PINS, fail: 1, pass: 2 },
    'node-plant': { ...NO_PINS, stale: 1 },
    'node-origin-second': { ...NO_PINS, pending: 1, review: 2, empty: 1 },
    'node-plant-second': { ...NO_PINS },
  },
};

/**
 * The payload of a selection that holds nothing to draw: every family empty, so the screen's own
 * emptiness check is what decides the state rather than a missing record.
 */
const EMPTY_TOPOLOGY: Topology = {
  plants: [],
  suppliers: [],
  materials: [],
  origins: [],
  customers: [],
  lanes: [],
  pinsByNode: {},
};

/**
 * The plant the canvas opens on: the first urgent row's plant, which is the node the screen resolves
 * when the shell holds no selection.
 */
const OPENING_PLANT_ID = 'node-plant';

/**
 * The payload's second plant, and the label it is drawn under.
 *
 * The cases below supply urgent rows that reach the opening plant only, so selecting this plant is the
 * case the four-row window cannot answer for — whether the plant read then returns an exception, none
 * or a failure is what each of them varies.
 */
const SECOND_PLANT = 'node-plant-second';
const SECOND_PLANT_LABEL = 'Vltava plant';

/** The identifier of the first urgent row: the exception the canvas opens on. */
const PRIMARY_EXCEPTION_ID = 'exception-gamma';

/* ---------------------------------------------------------------------------------------------
 * The urgent exceptions the stack prints, in a deliberate order
 * ------------------------------------------------------------------------------------------- */

/**
 * One urgent exception, built from the fields a case needs to tell it apart.
 *
 * The severity, the amount and the two readings are the caller's, so the four rows below can be
 * ordered neither by identifier nor by urgency and the suite can still assert the order it supplied.
 * Every other member is a constant of this fixture, including the record's own state and the source it
 * was read from, because no case asserts anything about them.
 *
 * @param id The record's identifier, as the payload spells it.
 * @param plantId The plant the disruption lands on: what a plant node resolves to it through.
 * @param productId The one product the row reaches.
 * @param severity The urgency the record states.
 * @param revenueAtRiskEur The amount the record's aggregate states, exactly as it arrived.
 * @param daysToImpact The days the record states before the impact lands.
 * @param ageHours How long the record has been open, as the record states it.
 * @returns The row.
 */
function urgentRow(
  id: string,
  plantId: PlantId,
  productId: ProductId,
  severity: Severity,
  revenueAtRiskEur: Money,
  daysToImpact: number,
  ageHours: number,
): ExceptionRow {
  return {
    id,
    type: 'supply-delay',
    title: `Disruption recorded against ${id}`,
    productIds: [productId],
    plantId,
    alsoAffectsPlantIds: [],
    severity,
    revenueAtRiskEur,
    daysToImpact,
    status: 'open',
    ownerId: OWNER_ID,
    ageHours,
    freshness: { source: APPROVAL_GATE_SOURCE, asOf: AS_OF, state: 'fresh' },
  };
}

/**
 * The four most urgent exceptions, exactly as `listExceptions` returns them: a window of four the
 * service ordered, in an order that is neither alphabetical nor by severity, so a screen that sorted
 * or truncated them itself would fail the assertions below.
 *
 * The first row's plant is the node the canvas opens on, which is what makes the primary action
 * available before any case touches the canvas, and the four rows reach both plants and both products
 * so a selection of either plant resolves to an exception while a selection of a supplier resolves to
 * none.
 */
const URGENT_ROWS: readonly ExceptionRow[] = [
  urgentRow(PRIMARY_EXCEPTION_ID, OPENING_PLANT_ID, 'product-one', 'critical', 125000, 2, 6),
  urgentRow('exception-beta', 'node-plant-second', 'product-two', 'medium', 48000, 5, 11),
  urgentRow('exception-delta', OPENING_PLANT_ID, 'product-one', 'high', 21000, 9, 18),
  urgentRow('exception-alpha', 'node-plant-second', 'product-two', 'low', 7500, 14, 26),
];

/* ---------------------------------------------------------------------------------------------
 * The audit trail the dock prints
 * ------------------------------------------------------------------------------------------- */

/**
 * The five events the audit read returns, newest first, in an order that is neither alphabetical nor
 * grouped by outcome, so the dock is asserted to print the order it was handed.
 *
 * The outcome of each is stated here rather than derived, because a case asserts the record's own
 * spelling beside its identifier and a derived value would let a mapping mistake pass.
 */
const AUDIT_EVENT_SPECS = [
  { id: 'event-charlie', result: 'succeeded' },
  { id: 'event-alpha', result: 'blocked' },
  { id: 'event-echo', result: 'succeeded' },
  { id: 'event-bravo', result: 'failed' },
  { id: 'event-delta', result: 'allowed' },
] as const satisfies readonly { readonly id: string; readonly result: AuditResult }[];

/** The five events themselves: `AuditEvent` records whose sequence follows the order they arrived in. */
const AUDIT_EVENTS: readonly AuditEvent[] = AUDIT_EVENT_SPECS.map((spec, position) => ({
  sequence: position + 1,
  id: spec.id,
  timestamp: AS_OF,
  actorType: 'user',
  actorId: OWNER_ID,
  action: 'exception.assigned',
  objectRef: PRIMARY_EXCEPTION_ID,
  result: spec.result,
  before: null,
  after: null,
  payloadHash: `payload-${spec.id}`,
  traceId: `trace-${spec.id}`,
  previousHash: `previous-${spec.id}`,
  eventHash: `event-${spec.id}`,
}));

/**
 * The cache key the screen reads the trail under: the method's own name, the window it asks for and the
 * newest-first order it asks for, and no scope, by the port's own signature.
 *
 * A case names it because a role switch leaves the previous role's successful read in the cache under
 * exactly this key and the screen re-reads it from there; it holds a window and an ordering, so nothing
 * is typed that rule P-6 bars.
 */
const AUDIT_CACHE_KEY = [
  'listAuditEvents',
  { limit: AUDIT_WINDOW, sort: DOCK_EVENT_ORDER },
] as const;

/* ---------------------------------------------------------------------------------------------
 * The ribbon's six figures
 * ------------------------------------------------------------------------------------------- */

/**
 * The six tiles the canvas read returns, keyed by the aggregate keys the ribbon's presentation map
 * answers. Every value is distinct, so a case can find the figure a tile shows without knowing where
 * in the row the tile sits, and the median is fractional because AAP §0.8 keeps it unrounded — so a
 * case can tell the measured rule the map names from the nearest-whole-hour one it must not apply.
 */
const RIBBON_TILES: readonly RibbonTile[] = [
  { id: 'open-exceptions', value: 7, provenance: 'computed' },
  { id: 'critical-exceptions', value: 2, provenance: 'computed' },
  { id: 'revenue-at-risk', value: 125000, provenance: 'computed' },
  { id: 'customer-orders-at-risk', value: 5, provenance: 'computed' },
  { id: 'median-hours-to-approved-plan', value: 11.25, provenance: 'computed' },
  { id: 'plants-in-scope', value: 4, provenance: 'computed' },
];

/**
 * The caption the screen gives each tile, read from the screen's own wording object so the two cannot
 * drift: the ribbon is handed these captions as its presentation and this suite finds the tile by the
 * same words a reader sees.
 */
const TILE_CAPTIONS: Readonly<Record<string, string>> = {
  'open-exceptions': FILEMAP_CANVAS_TEXT.tileOpenExceptions,
  'critical-exceptions': FILEMAP_CANVAS_TEXT.tileCriticalExceptions,
  'revenue-at-risk': FILEMAP_CANVAS_TEXT.tileRevenueAtRisk,
  'customer-orders-at-risk': FILEMAP_CANVAS_TEXT.tileCustomerOrdersAtRisk,
  'median-hours-to-approved-plan': FILEMAP_CANVAS_TEXT.tileMedianHours,
  'plants-in-scope': FILEMAP_CANVAS_TEXT.tilePlantsInScope,
};

/**
 * The aggregate keys the screen formats, as its own presentation map states: an amount through the
 * one money formatter, and the median the domain keeps unrounded through the measured-duration rule
 * (AAP §0.8). Every other tile prints its figure exactly as the aggregate returned it, so a case
 * reads a tile's text back through these sets rather than guessing at a format.
 */
const MONEY_TILE_IDS = new Set<string>(['revenue-at-risk']);
const MEASURED_HOURS_TILE_IDS = new Set<string>(['median-hours-to-approved-plan']);

/**
 * The text one ribbon tile prints, under the rule the screen's presentation map states for that tile.
 *
 * Nothing here recomputes a figure (rule P-6): an amount and the unrounded median go through the
 * interface's own formatters, and a count is printed exactly as the aggregate returned it.
 *
 * @param tile - The tile the canvas read returned.
 * @returns The text a reader sees in that tile.
 */
function figureShown(tile: RibbonTile): string {
  if (MONEY_TILE_IDS.has(tile.id)) {
    return formatMoney(tile.value);
  }

  return MEASURED_HOURS_TILE_IDS.has(tile.id)
    ? formatMeasuredHours(tile.value)
    : String(tile.value);
}

/* ---------------------------------------------------------------------------------------------
 * The selected exception's own record
 * ------------------------------------------------------------------------------------------- */

/** The confidence the record states, in the one place this file writes it. */
const CONFIDENCE: Confidence = { level: 'high', reason: 'A reason the record states' };

/**
 * The evidence the drawer renders for whichever reference a case opens.
 *
 * The cases below assert which reference the screen asked the service for, and one of them asserts
 * that the drawer prints this payload's value and formula character for character — the record the
 * service supplied rather than a failure region. One payload therefore serves them all and states no
 * figure of its own: the strings are this file's own words and the one §5.3 label a computed reading
 * carries arrives from `SIM_LABELS` (rule P-6, rule P-1).
 */
const EVIDENCE: Evidence = {
  value: 'the reading the evidence read returned',
  provenance: 'computed',
  label: SIM_LABELS[1],
  formula: 'The rule the contracts state for this reading, quoted by the read.',
  inputs: ['input-one'],
  upstream: ['record-one'],
  downstream: [],
  confidence: CONFIDENCE,
  missingInputs: [],
  documents: [],
};

/** The projected series the dock draws: two points derived from the demonstration clock. */
const STOCK_SERIES: DailyClosingStockPoint[] = [
  { date: CLOCK_DATE, units: 140 },
  { date: dayAfter(CLOCK_DATE), units: 96 },
];

/**
 * The detail the port resolves for whichever exception the selection reaches.
 *
 * The screen reads exactly two members of it — the record's own title and the projected series — so
 * everything else is the smallest payload the type accepts: an empty impact chain, no affected orders
 * and no activity, which is also what a record with nothing further to show would carry.
 */
const EXCEPTION_DETAIL: ExceptionDetail = {
  exception: {
    id: PRIMARY_EXCEPTION_ID,
    title: 'A disruption the record states',
    type: 'supply-delay',
    severity: 'critical',
    status: 'open',
    plantId: OPENING_PLANT_ID,
    alsoAffectsPlantIds: [],
    materialId: 'material-one',
    supplierId: 'supplier-one',
    purchaseOrderId: 'order-one',
    lineId: 'line-one',
    ownerId: OWNER_ID,
    daysToImpact: 2,
    affectedLines: [],
    missingInputs: [],
    confidence: CONFIDENCE,
    whatChanged: 'A sentence the record states',
    detectedAt: AS_OF,
  },
  impactChain: [],
  stockSeries: STOCK_SERIES,
  affectedOrders: [],
  missingInputs: [],
  confidence: CONFIDENCE,
  activity: [],
};

/* ---------------------------------------------------------------------------------------------
 * The response options the graph lens's preview switch offers, and one record's own evidence
 * ------------------------------------------------------------------------------------------- */

/**
 * One response option, at the shape the type accepts.
 *
 * The screen reads an option's identifier, its name and — for the dock's projection — the closing
 * stock the solver measured for it, so a case supplies the series and every other measure is zero with
 * every collection empty. A figure beside those would be one this suite invented, which rule P-6 bars
 * from a test hook.
 *
 * @param id - The option's identifier, as the payload spells it.
 * @param name - The name the comparison matrix would label the option's column with.
 * @param dailyClosingStock - The projection the option measured, in the order the record states it.
 * @returns The option.
 */
function previewOption(
  id: ScenarioId,
  name: string,
  dailyClosingStock: readonly DailyClosingStockPoint[] = [],
): Scenario {
  return {
    id,
    exceptionId: PRIMARY_EXCEPTION_ID,
    name,
    origin: 'seeded',
    unitsLate: 0,
    maxDaysLate: 0,
    ordersOnTime: 0,
    ordersTotal: 0,
    addedCostEur: 0,
    lineIdleDays: 0,
    revenueDelayedEur: 0,
    runOut: { day: 1, fractionOfDay: 0 },
    dailyClosingStock: [...dailyClosingStock],
    orders: [],
    constraintCheck: 'pass',
    constraintMessages: [],
    sideEffects: [],
    writeBacks: [],
    levers: { airSets: 0, transferSets: 0 },
    confidence: CONFIDENCE,
  };
}

/** The one option the set recommends, and therefore the one the preview switch offers. */
const RECOMMENDED_OPTION: Scenario = previewOption('option-alpha', 'By air, then transfer');

/**
 * A set holding one recommended option: what a selection that can arm the preview switch answers with.
 *
 * `recommendedId` names the option the set's rule picked, which is the id the screen offers the switch
 * without deciding a recommendation of its own (rule P-6).
 */
const OPTION_SET: ScenarioSet = {
  exceptionId: PRIMARY_EXCEPTION_ID,
  scenarios: [RECOMMENDED_OPTION],
  recommendedId: RECOMMENDED_OPTION.id,
  recommendationRule: 'A rule the record states',
  tradeOff: 'A trade-off the record states',
  rejected: [],
};

/**
 * A set holding no option: what an exception with nothing to preview answers with, and the case the
 * switch stays visibly disabled for, carrying the drawing's own reason.
 */
const EMPTY_OPTION_SET: ScenarioSet = {
  exceptionId: PRIMARY_EXCEPTION_ID,
  scenarios: [],
  recommendationRule: 'A rule the record states',
  tradeOff: 'A trade-off the record states',
  rejected: [],
};

/**
 * The option's own projection, as the solver measured it.
 *
 * It reports one date the exception's baseline does not, so a case can see that the dock's table view
 * states every date either record reports — the baseline's reads beside the option's on the dates they
 * share, and no reading where one of them reports none.
 */
const OPTION_STOCK_SERIES: readonly DailyClosingStockPoint[] = [
  { date: CLOCK_DATE, units: 320 },
  { date: dayAfter(dayAfter(CLOCK_DATE)), units: 40 },
];

/** Every date the dock's table must state once: the union of the two records' own dates. */
const PROJECTION_DATES: readonly IsoDate[] = [
  CLOCK_DATE,
  dayAfter(CLOCK_DATE),
  dayAfter(dayAfter(CLOCK_DATE)),
];

/**
 * The option whose projection the dock draws over the baseline.
 *
 * Its measures are a seed record's, which is the label the dock's frame then states for the whole
 * figure — the one label true of both series (AAP §0.10, rule P-1).
 */
const PROJECTION_OPTION: Scenario = previewOption(
  'option-alpha',
  'By air, then transfer',
  OPTION_STOCK_SERIES,
);

/** A set holding that one option, in the place the set's recommendation rule puts it. */
const PROJECTION_OPTION_SET: ScenarioSet = {
  exceptionId: PRIMARY_EXCEPTION_ID,
  scenarios: [PROJECTION_OPTION],
  recommendedId: PROJECTION_OPTION.id,
  recommendationRule: 'A rule the record states',
  tradeOff: 'A trade-off the record states',
  rejected: [],
};

/** The label the dock gives the option's series: its own wording, then the record's own name. */
const OPTION_SERIES_LABEL = `${TIMELINE_DOCK_TEXT.selectedSeriesPrefix} ${PROJECTION_OPTION.name}`;

/* ---------------------------------------------------------------------------------------------
 * The market-intelligence overlay the map lens draws, and the refusals a state case needs
 * ------------------------------------------------------------------------------------------- */

/** One shared crossing, stated with the market pack's own members and nothing else. */
const CROSSING: Chokepoint = {
  id: 'crossing-one',
  label: 'Southern sea crossing',
  overlap: 67,
  competitorBufferDays: { 'CMP-01': 12 },
  contentionNote: 'Three networks use the crossing and the buffer each holds differs.',
  provenance: 'market_intelligence',
};

/**
 * A market-intelligence payload: one competitor network of two sites whose lane names the crossing.
 *
 * The screen forwards this payload to the map lens unchanged and asserts nothing about it, so all this
 * fixture has to do is satisfy the shape the lens draws and prove the surface still renders while the
 * overlay is present (rules P-4, P-5). The network therefore carries the contracts' `CMP-nn` identifier,
 * without which the lens resolves no hue for it and leaves its marks unpainted.
 */
const ATLAS: Atlas = {
  packLabel: 'Market-intelligence pack, simulated',
  packVersion: 'pack-one',
  productClasses: ['product-one'],
  clientSites: [],
  competitors: [
    {
      competitorId: 'CMP-01',
      label: 'Aurelvik Drive Systems',
      provenance: 'market_intelligence',
      productClasses: ['product-one'],
      sites: [
        {
          id: 'site-alpha',
          competitorId: 'CMP-01',
          label: 'Ningbo drive plant',
          latitude: 29.87,
          longitude: 121.55,
        },
        {
          id: 'site-beta',
          competitorId: 'CMP-01',
          label: 'Gdansk assembly',
          latitude: 54.35,
          longitude: 18.65,
        },
      ],
      lanes: [{ fromId: 'site-alpha', toId: 'site-beta', chokepointId: CROSSING.id }],
    },
  ],
  chokepoints: [CROSSING],
  radarAxes: [],
  radarSeries: [],
};

/** The permission a refused read names: one the acting role would have to hold. */
const DENIED_PERMISSION: Permission = 'competitive.read';

/** The role that holds it, as the refusal reports. */
const HOLDING_ROLE: Role = 'head-of-supply-chain';

/**
 * A typed refusal that names its cause as a permission, member for member what the boundary's
 * forbidden card explains.
 */
const DENIAL: Problem = {
  type: 'permission',
  message: 'The acting role does not hold the permission this read requires.',
  traceId: 'trace-denial',
  requiredPermission: DENIED_PERMISSION,
  rolesWithPermission: [HOLDING_ROLE],
};

/**
 * A typed refusal that names its cause as a validation, which is the state the screen reports as a
 * conflict: the records moved under the reader rather than a source failing to answer.
 */
const CONFLICT: Problem = {
  type: 'validation',
  message: 'The record changed while it was being read.',
  traceId: 'trace-conflict',
};

/** A rejection in no typed shape at all, which the screen reports as a source that did not answer. */
const FAILURE = new Error('A source did not answer.');

/* ---------------------------------------------------------------------------------------------
 * The envelopes the stub answers with
 * ------------------------------------------------------------------------------------------- */

/**
 * The six sources' report, with the approval-gating source moved to the state a case needs.
 *
 * `Result.meta.freshness` is the adapter's own account of what each source did, so the seven states
 * are driven from this report rather than from a flag name (AAP §0.2.1, §0.8). ERP is the source moved,
 * because it is the one the screen's stale banner prefers and the one the freshness rule gates
 * approval on, so an assertion can name it without guessing.
 *
 * @param state - The state the gating source reports.
 * @returns One record per source, in the order `SOURCE_IDS` fixes.
 */
function freshnessWith(state: FreshnessState): Freshness[] {
  return SOURCE_IDS.map((source) => ({
    source,
    asOf: AS_OF,
    state: source === APPROVAL_GATE_SOURCE ? state : 'fresh',
  }));
}

/**
 * The metadata every stubbed answer carries.
 *
 * @param state - The state the gating source reports in this answer.
 * @returns The freshness report, the literal simulation marker and the correlation identifier.
 */
function metaWith(state: FreshnessState): Meta {
  return { freshness: freshnessWith(state), simulated: true, traceId: TRACE_ID };
}

/**
 * One successful answer, in the envelope the port resolves.
 *
 * @typeParam T - The payload.
 * @param data - The payload exactly as the screen will read it.
 * @param state - The state the gating source reports; current unless a case says otherwise.
 * @returns The result.
 */
function envelope<T>(data: T, state: FreshnessState = 'fresh'): Result<T> {
  return { data, meta: metaWith(state) };
}

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/**
 * The probe route the primary action lands on: it prints the identifier the route received, so a case
 * asserts the navigation through the visible interface rather than through a router's internals.
 *
 * @returns The level-one heading holding the identifier.
 */
function ExceptionProbe() {
  const { exceptionId } = useParams();

  return <h1>{exceptionId}</h1>;
}

/**
 * Renders the screen as the shell mounts it: at its own route, inside a cache of its own, with the
 * exception the primary action names mounted beside it as the probe that navigation reaches.
 *
 * The cache is fresh per render, its retries are off and its entries are collected immediately, so a
 * refusal fails the same way however often it is repeated and one case cannot read another's cached
 * payload.
 *
 * @param props - The members of the screen's contract this case varies. All are optional upstream.
 * @param seedCache - Fills the cache before the first render, which is how a case mounts the screen
 *   over an entry a previous reader left behind. Omitted, the screen reads into an empty cache.
 * @returns The render result, so a case can unmount before rendering again.
 */
function renderScreen(
  props: Partial<FilemapCanvasScreenProps> = {},
  seedCache?: (client: QueryClient) => void,
): RenderResult {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Infinity } },
  });

  seedCache?.(client);

  return render(
    <MemoryRouter initialEntries={[CANVAS_ROUTE]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path={CANVAS_ROUTE} element={<FilemapCanvasScreen {...props} />} />
          <Route path={EXCEPTION_ROUTE} element={<ExceptionProbe />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The readings the cases take
 * ------------------------------------------------------------------------------------------- */

/**
 * The canvas region: the section the screen names for whichever lens is drawn in it.
 *
 * @returns The element, once it exists.
 */
function canvasRegion(): HTMLElement {
  return screen.getByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });
}

/**
 * The stack region beside the canvas: the aside holding the urgent rows and the product cards.
 *
 * @returns The element, or `null` when wall mode has stood it down.
 */
function stackRegion(): HTMLElement | null {
  return screen.queryByRole('complementary', { name: FILEMAP_CANVAS_TEXT.stackRegionLabel });
}

/**
 * The ribbon: the group the six tiles sit in.
 *
 * @returns The element.
 */
function ribbonGroup(): HTMLElement {
  return screen.getByRole('group', { name: UI.ribbon });
}

/**
 * The dock: the section holding the projected series and the five audit events.
 *
 * @returns The element.
 */
function dockRegion(): HTMLElement {
  return screen.getByRole('region', { name: TIMELINE_DOCK_TEXT.title });
}

/**
 * The audit half of the dock: the panel the five events are listed in.
 *
 * Read as its own region rather than as the dock's whole list, because the projected series beside it
 * describes its one series in a list of its own — the trail is the panel the screen names for the
 * events, and a count taken over the whole dock would mix the two.
 *
 * @returns The panel.
 */
function auditTrail(): HTMLElement {
  const dock = dockRegion();

  return within(dock).getByRole('region', {
    name: new RegExp(`^${TIMELINE_DOCK_TEXT.activityTitle}`, 'u'),
  });
}

/**
 * Whether a rendered string states the expected one, once both are collapsed the way the queries
 * collapse them.
 *
 * The amount the interface prints separates its value from the currency code with a non-breaking
 * space, which a plain string matcher would not match against the same formatter's output. Collapsing
 * both sides compares what a reader sees without this suite writing the formatted value itself
 * (rule P-6).
 *
 * @param content - The text the element states.
 * @param expected - The value the read returned, as its formatter states it.
 * @returns Whether the two state the same thing.
 */
function statesSameText(content: string, expected: string): boolean {
  const collapse = (value: string): string => value.replace(/\s+/gu, ' ').trim();

  return collapse(content) === collapse(expected);
}

/**
 * Escapes the characters a label's own text could carry into a regular expression, so a node is
 * matched by the words the payload states rather than by an accidentally special pattern.
 *
 * @param value - The literal text to escape.
 * @returns The text, safe to interpolate into a pattern.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * One canvas node's control, in whichever lens is in view, matched by the label its accessible name
 * opens with. Both lenses open a node's name with the payload's own label, so one reading finds the
 * node in either.
 *
 * @param label - The node's label, as the payload states it.
 * @returns The focusable node control.
 */
function nodeControl(label: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${escapeRegExp(label)},`, 'u') });
}

/**
 * Selects a canvas node from the keyboard, as a reader who reached it by tabbing would.
 *
 * @param user - The user-event harness.
 * @param label - The node's label, as the payload states it.
 */
async function selectNode(user: User, label: string): Promise<void> {
  const node = nodeControl(label);

  node.focus();
  await user.keyboard('{Enter}');
}

/**
 * The caption the screen states beside the lens switch, which is how the active lens is read in words
 * rather than from a colour (rule B-3).
 *
 * @param lensLabel - The label of the lens expected to be in view.
 * @returns The sentence the screen renders.
 */
function lensCaption(lensLabel: string): string {
  return `${FILEMAP_CANVAS_TEXT.lensCaptionPrefix} ${lensLabel}`;
}

/**
 * The user-event harness the keyboard cases drive.
 *
 * Named so a helper that walks the tab order can take it as an argument without widening its parameter
 * to `any`.
 */
type User = ReturnType<typeof userEvent.setup>;

/**
 * Activates a named control from the keyboard: focus it, then press the key a reader would.
 *
 * @param user - The user-event harness.
 * @param name - The control's accessible name.
 */
async function activate(user: User, name: string): Promise<void> {
  const control = screen.getByRole('button', { name });

  control.focus();
  await user.keyboard('{Enter}');
}

/**
 * Walks the document's tab order until the focused element satisfies a predicate, so a case asserts
 * reachability without numbering the focus stops of a surface it does not own.
 *
 * @param user - The user-event harness.
 * @param matches - The predicate the focused element must satisfy.
 * @param limit - The greatest number of stops to walk before the case fails.
 * @returns The element the walk stopped on.
 * @throws When the walk never reaches a matching element, which is the failure the case asserts.
 */
async function tabTo(
  user: User,
  matches: (element: Element) => boolean,
  limit: number,
): Promise<HTMLElement> {
  for (let step = 0; step < limit; step += 1) {
    await user.tab();

    const active = document.activeElement;

    if (active !== null && matches(active)) {
      return active as HTMLElement;
    }
  }

  throw new Error('The keyboard walk never reached the control the case needs.');
}

/**
 * Arms every stub with the payloads a case starts from, so a case states only the read it changes.
 *
 * The screen's lens outlives a mount on purpose, because that is what a client-side route change needs,
 * so every case returns the store to a first visit's values before it renders.
 */
beforeEach(() => {
  for (const member of Object.values(port)) {
    member.mockReset();
  }

  resetCanvasViewState();

  port.getTopology.mockResolvedValue(envelope(TOPOLOGY));
  port.getCanvasRibbon.mockResolvedValue(envelope([...RIBBON_TILES]));
  port.listExceptions.mockResolvedValue(envelope([...URGENT_ROWS]));
  port.listAuditEvents.mockResolvedValue(envelope([...AUDIT_EVENTS]));
  port.getAtlas.mockResolvedValue(envelope(ATLAS));
  port.getExceptionDetail.mockResolvedValue(envelope(EXCEPTION_DETAIL));
  /* An empty set by default, so the preview switch stays disabled in every case that arms none. */
  port.getScenarioSet.mockResolvedValue(envelope(EMPTY_OPTION_SET));
  port.getEvidence.mockResolvedValue(envelope(EVIDENCE));
});

/** Leaves `<html>` on the theme of whichever suite runs next, and no case's attribute behind. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});


describe('FilemapCanvasScreen', () => {
  it('reads the canvas through the port with the shell’s selection and reaches nothing else', async () => {
    renderScreen();

    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    /* The empty plant and product arrays are `Scope`'s "all plants and all products", which is what a
       shell that has not filtered yet holds and what this suite supplies by omitting the prop
       (rule P-2: the screen owns no selection of its own to send). */
    expect(port.getTopology).toHaveBeenCalledWith(NO_SCOPE);
    expect(port.getCanvasRibbon).toHaveBeenCalledWith(NO_SCOPE);
    /* Both windows are handed to the service rather than applied to its answer, so the ordering and
       the limit are the port's and the screen neither sorts nor truncates (rule P-6). */
    expect(port.listExceptions).toHaveBeenCalledWith({ limit: URGENT_WINDOW }, NO_SCOPE);
    /* The dock prints the five latest events, so the order they are asked for in is stated at the call
       rather than left to the adapter's default, which the port does not promise. */
    expect(port.listAuditEvents).toHaveBeenCalledWith({
      limit: AUDIT_WINDOW,
      sort: DOCK_EVENT_ORDER,
    });
    /* The selected exception's own record is read once the selection resolves to it. */
    expect(port.getExceptionDetail).toHaveBeenCalledWith(PRIMARY_EXCEPTION_ID);
    expect(port.getAtlas).toHaveBeenCalledTimes(1);
  });

  it('states in the map lens’s caption why the overlay is absent when the atlas read is refused', async () => {
    port.getAtlas.mockRejectedValue(DENIAL);

    renderScreen();

    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    /* The atlas is the screen's one optional read, so its refusal degrades the overlay and never the
       surface: the canvas is still drawn, and the lens's caption carries the reason so a reader does not
       mistake a refused read for a scope that holds no pack. */
    expect(
      screen.getByText(`${MAP_LENS_TEXT.description} ${FILEMAP_CANVAS_TEXT.atlasRefused}`),
    ).toBeInTheDocument();
    expect(screen.queryByText(FILEMAP_CANVAS_TEXT.atlasUnavailable)).not.toBeInTheDocument();
  });

  it('says a source did not answer, never that the role may not read it, when the atlas read fails', async () => {
    port.getAtlas.mockRejectedValue(FAILURE);

    renderScreen();

    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    /* A failure is not a permission, so the second sentence describes the cause the screen observed
       rather than the one it did not (rule P-4 applied to a cause). */
    expect(
      screen.getByText(`${MAP_LENS_TEXT.description} ${FILEMAP_CANVAS_TEXT.atlasUnavailable}`),
    ).toBeInTheDocument();
    expect(screen.queryByText(FILEMAP_CANVAS_TEXT.atlasRefused)).not.toBeInTheDocument();
  });

  it('states nothing about the overlay when the atlas read answers', async () => {
    renderScreen();

    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    /* An answered read is not a degradation, so the caption stays the lens's own line of words and a
       reader sees the overlay's own legend rather than an explanation for its absence. */
    expect(screen.getByText(MAP_LENS_TEXT.description)).toBeInTheDocument();
    expect(screen.queryByText(FILEMAP_CANVAS_TEXT.atlasRefused)).not.toBeInTheDocument();
    expect(screen.queryByText(FILEMAP_CANVAS_TEXT.atlasUnavailable)).not.toBeInTheDocument();
  });

  it('draws the lens in a 65% canvas region beside the stack, stacked below the wide breakpoint', async () => {
    renderScreen();

    const canvas = await screen.findByRole('region', {
      name: FILEMAP_CANVAS_TEXT.canvasRegionLabel,
    });
    const stack = stackRegion();

    /* The proportion is the screen's own, stated as a fraction of the row so the lens keeps it at
       every viewport above the breakpoint; below it the row stacks and the fraction takes no effect. */
    expect(canvas.className).toContain('xl:basis-[65%]');

    const row = canvas.parentElement;

    expect(row).not.toBeNull();
    expect(row?.className).toContain('flex-col');
    expect(row?.className).toContain('xl:flex-row');

    /* The stack is the other region of the same row, in its own named landmark. */
    expect(stack).not.toBeNull();
    expect(stack?.parentElement).toBe(row);
    expect(stack?.className).toContain('xl:basis-[35%]');
  });

  it('shows six ribbon tiles, each labelling its own figure with the fixed computed-figure string', async () => {
    renderScreen();

    const ribbon = await screen.findByRole('group', { name: UI.ribbon });

    /* One tile per aggregate the read returned, in the payload's order. */
    expect(within(ribbon).getAllByRole('region')).toHaveLength(RIBBON_TILES.length);

    for (const tile of RIBBON_TILES) {
      const caption = TILE_CAPTIONS[tile.id];

      expect(caption).toBeDefined();

      if (caption === undefined) {
        continue;
      }

      const region = within(ribbon).getByRole('region', { name: caption });

      /* The label sits inside the tile that owns the figure, so the shell's page-level badge could
         neither satisfy it nor stand in for a tile that forgot it (rule P-1). */
      expect(within(region).getAllByText(SIM_LABELS[1])).toHaveLength(1);

      /* The figure is the value the read returned, formatted only by the rule the screen stated for
         that tile: an amount through the interface's one money formatter, the unrounded median through
         its measured-duration rule, a count as it arrived (rule P-6). Neither expectation recomputes
         anything. */
      const shown = figureShown(tile);

      expect(
        within(region).getByText((content) => statesSameText(content, shown)),
      ).toBeInTheDocument();
    }
  });

  it('states in a ribbon tile’s reference the selection the canvas reads were made with', async () => {
    const user = userEvent.setup();
    const selectedPlant = 'plant-selected';

    renderScreen({ scope: { plants: [selectedPlant], products: [] } });

    const ribbon = await screen.findByRole('group', { name: UI.ribbon });
    const tile = within(ribbon).getByRole('region', {
      name: FILEMAP_CANVAS_TEXT.tileOpenExceptions,
    });

    await user.click(within(tile).getByRole('button'));

    /* The port's `getEvidence` carries the reference and no scope, so the tile's reference states the
       selection the ribbon was read with: the drawer's aggregate is computed over the plants the tile
       counted rather than over every plant the persona reaches (AAP §0.2.1 F12, PR-6). */
    const reference = String(port.getEvidence.mock.calls[0]?.[0]);

    expect(reference.startsWith('canvas:open-exceptions')).toBe(true);
    expect(reference).toContain(`plants=${selectedPlant}`);
  });

  it('captions a product card’s amount with the exception whose revenue it shows', async () => {
    renderScreen();

    const stack = await screen.findByRole('complementary', {
      name: FILEMAP_CANVAS_TEXT.stackRegionLabel,
    });

    /* `product-one` is reached by two urgent rows — the first and the third — while a card shows one
       row's own amount, so the caption has to name the row the amount comes from rather than read as
       a total for the product (rule P-6: this screen sums nothing). */
    const firstRow = URGENT_ROWS[0];
    const alsoReaching = URGENT_ROWS[2];

    expect(firstRow).toBeDefined();
    expect(alsoReaching).toBeDefined();

    if (firstRow === undefined || alsoReaching === undefined) {
      return;
    }

    const caption = within(stack).getByText(
      FILEMAP_CANVAS_TEXT.productRevenueAtRiskOn(firstRow.id),
    );
    const card = caption.closest('article');

    expect(card).not.toBeNull();

    if (card === null) {
      return;
    }

    /* The amount beside that caption is that same row's, and the other row that reaches this product
       contributes neither the caption nor a second figure. */
    expect(
      within(card).getByText((content) =>
        statesSameText(content, formatMoney(firstRow.revenueAtRiskEur)),
      ),
    ).toBeInTheDocument();
    expect(
      within(card).queryByText(FILEMAP_CANVAS_TEXT.productRevenueAtRiskOn(alsoReaching.id)),
    ).not.toBeInTheDocument();
    expect(
      within(card).queryByText((content) =>
        statesSameText(content, formatMoney(alsoReaching.revenueAtRiskEur)),
      ),
    ).not.toBeInTheDocument();

    /* The heading names the card by the identifier the record carries, printed once: the port supplies
       no product name, so a second print of the same identifier would read as two different values. */
    const productId = firstRow.productIds[0];

    expect(productId).toBeDefined();

    if (productId !== undefined) {
      expect(within(card).getByRole('heading').textContent?.trim()).toBe(productId);
    }
  });

  it('carries the node selected in the map lens into the graph lens', async () => {
    const user = userEvent.setup();

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    /* The canvas opens on the plant of the most urgent exception, so the primary action is offered
       before anything is touched. */
    expect(
      screen.getByRole('button', { name: FILEMAP_CANVAS_TEXT.primaryAction }),
    ).not.toHaveAttribute('aria-disabled');

    const supplier = nodeControl('Halvard Components');

    supplier.focus();
    await user.keyboard('{Enter}');

    /* A supplier node answers no exception, so the action that investigates one cannot act: the screen
       derives that from the record rather than from a flag, and rule P-8 keeps the control on screen
       reporting itself unavailable with the sentence that names the node to select instead. */
    const blocked = screen.getByRole('button', { name: FILEMAP_CANVAS_TEXT.primaryAction });

    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    expect(blocked).toHaveAccessibleDescription(FILEMAP_CANVAS_TEXT.primaryActionUnavailable);

    await activate(user, FILEMAP_CANVAS_TEXT.graphLens);

    expect(screen.getByText(lensCaption(FILEMAP_CANVAS_TEXT.graphLens))).toBeInTheDocument();

    /* The graph lens marks the very node the map lens reported: one selection, two lenses, and the
       strip states it in words rather than by colour (rule B-3). */
    const strip = screen.getByText(DEPENDENCY_GRAPH_TEXT.selectedLabel).parentElement;

    expect(strip).not.toBeNull();
    expect(strip).toHaveTextContent('Halvard Components');
  });

  it('opens the evidence of the record behind the canvas node a reader activates', async () => {
    const user = userEvent.setup();

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    const plant = nodeControl('Northgate plant');

    plant.focus();
    await user.keyboard('{Enter}');

    /* The node identifier is the record identifier the evidence read resolves, because the topology
       payload copies the record into its node — the screen composes no reference of its own
       (rule P-6). */
    expect(port.getEvidence).toHaveBeenCalledWith(OPENING_PLANT_ID);

    const drawer = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });

    /* The drawer opens on the record's own content — its value, the rule behind it and the section that
       carries them — and not on the region that reports a reference nothing answers. */
    expect(within(drawer).getByText(EVIDENCE.value)).toBeInTheDocument();
    expect(within(drawer).getByText(EVIDENCE.formula)).toBeInTheDocument();
    expect(within(drawer).getByText(EVIDENCE_DRAWER_TEXT.valueSection)).toBeInTheDocument();
    expect(screen.queryByText(EVIDENCE_DRAWER_TEXT.failureHeadline)).not.toBeInTheDocument();
  });

  it('names the aggregate and the shell selection in the reference a ribbon figure opens', async () => {
    const user = userEvent.setup();
    const plant = TOPOLOGY.plants[0];

    if (plant === undefined) {
      throw new Error('the topology fixture holds no plant node, so the case cannot run.');
    }

    renderScreen({ scope: { plants: [plant.id], products: [] } });

    const ribbon = await screen.findByRole('group', { name: UI.ribbon });
    const caption = TILE_CAPTIONS['revenue-at-risk'];

    if (caption === undefined) {
      throw new Error('the suite states no caption for the revenue tile, so the case cannot run.');
    }

    const tile = within(ribbon).getByRole('region', { name: caption });

    await user.click(within(tile).getByRole('button'));
    await screen.findByRole('dialog');

    const reference = String(port.getEvidence.mock.calls[0]?.[0]);

    // The tile's figure has no record of its own, so the reference names the aggregate and the
    // selection the tiles were read under, and the read resolves that figure over those filters
    // (AAP 0.2.1 F12).
    expect(reference.startsWith('canvas:revenue-at-risk')).toBe(true);
    expect(reference).toContain(`plants=${plant.id}`);
  });

  it('arms the graph lens’s scenario preview from the selected exception’s own option set', async () => {
    const user = userEvent.setup();

    port.getScenarioSet.mockResolvedValue(envelope(OPTION_SET));

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    /* The set belongs to the exception the selection reaches, which is the record the read is keyed by. */
    expect(port.getScenarioSet).toHaveBeenCalledWith(PRIMARY_EXCEPTION_ID);

    await activate(user, FILEMAP_CANVAS_TEXT.graphLens);

    /* The switch's own label carries the identifier of the option the set recommends, which is how the
       case knows the screen offered the record's option rather than inventing one (rule P-6). */
    const scenarioSwitch = await screen.findByRole('switch', {
      name: `${DEPENDENCY_GRAPH_TEXT.previewLabel} ${RECOMMENDED_OPTION.id}`,
    });

    /* Armable rather than visibly disabled, and unarmed until the reader asks for it (rule P-8). */
    expect(scenarioSwitch).not.toHaveAttribute('aria-disabled');
    expect(scenarioSwitch).toHaveAttribute('aria-checked', 'false');

    scenarioSwitch.focus();
    await user.keyboard('{Enter}');

    expect(scenarioSwitch).toHaveAttribute('aria-checked', 'true');

    /* The caption names the option from the record's own name, and it changes without a page load, so it
       is a status region that announces the option now in preview (rule B-3). */
    expect(
      await screen.findByText(
        `${FILEMAP_CANVAS_TEXT.previewCaptionPrefix} ${RECOMMENDED_OPTION.name}`,
      ),
    ).toBeInTheDocument();
  });

  it('leaves the preview switch visibly disabled with the drawing’s own reason when no option is offered', async () => {
    const user = userEvent.setup();

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    await activate(user, FILEMAP_CANVAS_TEXT.graphLens);

    /* The set this suite arms by default holds no option, so nothing is offered to preview and the switch
       says why in the drawing's own words instead of acting on nothing (rule P-8). */
    const scenarioSwitch = screen.getByRole('switch', {
      name: DEPENDENCY_GRAPH_TEXT.previewLabel,
    });

    expect(scenarioSwitch).toHaveAttribute('aria-disabled', 'true');
    expect(scenarioSwitch).toHaveAccessibleDescription(
      DEPENDENCY_GRAPH_TEXT.previewUnavailable,
    );
  });

  it('states the lens in view in a status region that follows the reader’s choice', async () => {
    const user = userEvent.setup();

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    /* The caption changes when a lens is switched and no page loads, so it is a status region and the
       text it then states is what a screen reader announces (rule B-3, WCAG 2.2 SC 4.1.3). */
    const lensGroup = screen.getByRole('group', { name: FILEMAP_CANVAS_TEXT.lensGroupLabel });
    const caption = within(lensGroup).getByRole('status');

    expect(caption.textContent).toBe(lensCaption(FILEMAP_CANVAS_TEXT.mapLens));

    await activate(user, FILEMAP_CANVAS_TEXT.graphLens);

    /* The same region, now naming the lens the reader chose, rather than a second status region
       appearing beside the first. */
    expect(within(lensGroup).getByRole('status')).toBe(caption);
    expect(caption.textContent).toBe(lensCaption(FILEMAP_CANVAS_TEXT.graphLens));
  });

  it('keeps the lens the reader chose when the screen is unmounted and shown again', async () => {
    const user = userEvent.setup();

    const first = renderScreen();

    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });
    await activate(user, FILEMAP_CANVAS_TEXT.graphLens);

    expect(screen.getByText(lensCaption(FILEMAP_CANVAS_TEXT.graphLens))).toBeInTheDocument();

    /* The shell unmounts this screen on a client-side route change, so a lens the component held would be
       lost with it; the module store is what carries the reader's choice across that unmount. */
    first.unmount();

    renderScreen();

    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    expect(screen.getByText(lensCaption(FILEMAP_CANVAS_TEXT.graphLens))).toBeInTheDocument();
  });

  it('reads a first visit’s lens once the demonstration has been reset since the lens was chosen', async () => {
    const user = userEvent.setup();

    const first = renderScreen();

    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });
    await activate(user, FILEMAP_CANVAS_TEXT.graphLens);

    expect(screen.getByText(lensCaption(FILEMAP_CANVAS_TEXT.graphLens))).toBeInTheDocument();

    first.unmount();

    /* The shell keys the screen by its count of demonstration resets, so a reset remounts it. The lens
       chosen before the reset belongs to the session the reset ended, so the screen reads the lens a
       first visit starts on rather than the one that session left behind. */
    const second = renderScreen({ demonstrationEpoch: 1 });

    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    expect(screen.getByText(lensCaption(FILEMAP_CANVAS_TEXT.mapLens))).toBeInTheDocument();

    await activate(user, FILEMAP_CANVAS_TEXT.graphLens);

    second.unmount();

    /* A lens chosen after the reset belongs to the session now in force, so it is the lens the screen
       comes back on rather than a choice the next mount discards. */
    renderScreen({ demonstrationEpoch: 1 });

    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    expect(screen.getByText(lensCaption(FILEMAP_CANVAS_TEXT.graphLens))).toBeInTheDocument();
  });

  it('reports each wall-mode request to the shell that owns the navigation', async () => {
    const user = userEvent.setup();
    const requests: boolean[] = [];

    renderScreen({
      onWallModeChange: (wallMode) => {
        requests.push(wallMode);
      },
    });
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    await activate(user, FILEMAP_CANVAS_TEXT.wallModeEnter);

    expect(requests).toStrictEqual([true]);

    /* The control relabels itself while the mode is on, so leaving it is the same control's second
       act rather than a second, unannounced one. */
    await activate(user, FILEMAP_CANVAS_TEXT.wallModeExit);

    expect(requests).toStrictEqual([true, false]);
  });

  it('gives the drawing the whole row in wall mode with no shell listening', async () => {
    const user = userEvent.setup();

    /* No shell is supplied in this suite at all: no navigation, no store, no shell provider. The mode
       therefore has to do what the screen owns by itself, which is the indirect evidence that the
       screen reaches nothing in the shell's own modules. */
    renderScreen();

    const canvas = await screen.findByRole('region', {
      name: FILEMAP_CANVAS_TEXT.canvasRegionLabel,
    });

    expect(canvas.className).toContain('xl:basis-[65%]');
    expect(stackRegion()).not.toBeNull();

    await activate(user, FILEMAP_CANVAS_TEXT.wallModeEnter);

    expect(canvas.className).toContain('xl:basis-full');
    expect(canvas.className).not.toContain('xl:basis-[65%]');
    expect(stackRegion()).toBeNull();

    await activate(user, FILEMAP_CANVAS_TEXT.wallModeExit);

    expect(canvas.className).toContain('xl:basis-[65%]');
    expect(stackRegion()).not.toBeNull();
  });

  it('prints exactly the five audit events the read returned, in the order it returned them', async () => {
    renderScreen();

    const dock = await screen.findByRole('region', { name: TIMELINE_DOCK_TEXT.title });
    const rows = within(auditTrail()).getAllByRole('listitem');

    /* The dock's window, not a count of the records that happen to exist. */
    expect(rows).toHaveLength(AUDIT_WINDOW);

    AUDIT_EVENTS.forEach((event, position) => {
      const row = rows[position];

      expect(row).toBeDefined();

      if (row === undefined) {
        return;
      }

      /* Each row states the record's own identifier and the outcome it recorded, so a re-ordered or
         re-mapped trail fails here. */
      expect(within(row).getByText(event.id)).toBeInTheDocument();
      expect(within(row).getByText(event.result)).toBeInTheDocument();
    });

    /* The two half-dock labels the components own: a figure drawing the exception's own baseline alone
       states the computed label, and the trail is a simulated control (rules P-1, P-4). */
    const figure = dock.querySelector('figure');

    expect(figure).not.toBeNull();

    if (figure !== null) {
      expect(within(figure).getByText(SIM_LABELS[1])).toBeInTheDocument();
    }

    expect(within(dock).getByText(SIM_LABELS[4])).toBeInTheDocument();
  });

  it('draws the selected option over the exception’s baseline in the dock’s one projection', async () => {
    const user = userEvent.setup();

    port.getScenarioSet.mockResolvedValue(envelope(PROJECTION_OPTION_SET));

    renderScreen();

    const dock = await screen.findByRole('region', { name: TIMELINE_DOCK_TEXT.title });

    /* One chart group carries both series, which is what puts them on one calendar and one y scale:
       the contract states the baseline with the selected option plotted over the same series (T-03). */
    const surface = await within(dock).findByRole('group', {
      name: new RegExp(OPTION_SERIES_LABEL),
    });
    const surfaceName = surface.getAttribute('aria-label') ?? '';

    expect(surfaceName).toContain(TIMELINE_DOCK_TEXT.baselineSeriesLabel);
    expect(surfaceName).toContain(OPTION_SERIES_LABEL);

    /* Every reading of both records is a mark on that one surface. */
    expect(within(surface).getAllByRole('button')).toHaveLength(
      STOCK_SERIES.length + OPTION_STOCK_SERIES.length,
    );

    /* The dock plots the option the screen reads from the service, and the projection it draws is the
       one the exception's own baseline sits under — not the exception's series stated twice. */
    expect(port.getScenarioSet).toHaveBeenCalledWith(PRIMARY_EXCEPTION_ID);

    /* The option is a seed record, so the frame states the one label true of both series, while the
       baseline's own row keeps the computed one (AAP §0.10, rule P-1). */
    const figure = within(dock).getByRole('figure');
    const caption = figure.querySelector('figcaption')?.textContent ?? '';

    expect(caption).toContain(SIM_LABELS[0]);
    expect(caption).not.toContain(SIM_LABELS[1]);

    await user.click(
      within(figure).getByRole('button', {
        name: `${VIEW_AS_TABLE_LABELS.showTable}: ${TIMELINE_DOCK_TEXT.stockTitle}`,
      }),
    );

    /* The table view reproduces the marks: a date column, one column per series headed by that
       series' own label, and one row per date either record reports (success criterion 9, rule B-3). */
    const table = within(dock).getByRole('table', { name: TIMELINE_DOCK_TEXT.stockTableCaption });

    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual([
      TIMELINE_DOCK_TEXT.stockDateColumn,
      TIMELINE_DOCK_TEXT.baselineSeriesLabel,
      OPTION_SERIES_LABEL,
    ]);
    expect(within(table).getAllByRole('row')).toHaveLength(PROJECTION_DATES.length + 1);
  });

  it('states the dock’s empty message when the selected exception carries no projection', async () => {
    port.getExceptionDetail.mockResolvedValue(envelope({ ...EXCEPTION_DETAIL, stockSeries: [] }));

    renderScreen();

    const dock = await screen.findByRole('region', { name: TIMELINE_DOCK_TEXT.title });

    /* A projection comes from a solver case, and the records carry one for one exception in this run
       (AAP §0.12.2), so a selection reaching any other states the absence rather than drawing empty
       axes. */
    expect(within(dock).getByText(TIMELINE_DOCK_TEXT.stockEmpty)).toBeInTheDocument();
    expect(within(dock).queryByRole('figure')).toBeNull();
  });

  it('prints the refusal instead of the events a previous role left cached', async () => {
    /*
     * The switch, as `role-switcher.tsx` performs it: the previous role's trail is in the cache under
     * the key this screen reads, the switcher invalidates every read, and the refetch that follows is
     * refused for the role that does not hold `audit.read`. React Query keeps the previous `data`
     * across that refetch, so the refusal has to outrank it.
     */
    port.listAuditEvents.mockRejectedValue(DENIAL);

    renderScreen({}, (cache) => {
      cache.setQueryData(AUDIT_CACHE_KEY, envelope([...AUDIT_EVENTS]));
      void cache.invalidateQueries({ queryKey: AUDIT_CACHE_KEY, refetchType: 'none' });
    });

    expect(await screen.findByText(FILEMAP_CANVAS_TEXT.auditUnavailable)).toBeInTheDocument();

    const trail = auditTrail();

    /* Not one of the cached events reaches the dock, and no record this role may not read carries the
       control that would open it (rules P-2, P-8). */
    for (const event of AUDIT_EVENTS) {
      expect(within(trail).queryByText(event.id)).not.toBeInTheDocument();
    }

    expect(within(trail).queryAllByRole('button', { name: /open evidence/u })).toHaveLength(0);
  });

  it('shows the loading state while the reads the canvas needs are pending', async () => {
    /* A read that never settles: the surface has nothing to draw and says so. */
    port.getTopology.mockReturnValue(new Promise<Result<Topology>>(() => undefined));

    renderScreen();

    const busy = screen.getByRole('status', { name: STATE_BOUNDARY_TEXT.loading });

    expect(busy).toHaveAttribute('aria-busy', 'true');
    /* Nothing stands in for the figures behind a read that has not answered. */
    expect(screen.queryByRole('group', { name: UI.ribbon })).not.toBeInTheDocument();
  });

  it('shows the empty state with the screen’s own sentence when the selection holds nothing', async () => {
    port.getTopology.mockResolvedValue(envelope(EMPTY_TOPOLOGY));
    port.listExceptions.mockResolvedValue(envelope([]));

    renderScreen();

    expect(await screen.findByText(FILEMAP_CANVAS_TEXT.empty)).toBeInTheDocument();
    /* An empty selection is a real answer: it replaces the content rather than warning above it. */
    expect(screen.queryByRole('group', { name: UI.ribbon })).not.toBeInTheDocument();
  });

  it('draws the network and its ribbon when the selection holds no open exception', async () => {
    port.listExceptions.mockResolvedValue(envelope([]));

    renderScreen();

    const canvas = await screen.findByRole('region', {
      name: FILEMAP_CANVAS_TEXT.canvasRegionLabel,
    });

    /* A scope that draws a node has something to draw, so the surface renders and the sentence saying
       nothing falls in the selection is withheld — here it would be false. The both-empty scope still
       renders that sentence, which the case above asserts. */
    expect(
      within(canvas).getByRole('button', { name: /^Northgate plant,/u }),
    ).toBeInTheDocument();
    expect(ribbonGroup()).toBeInTheDocument();
    expect(screen.queryByText(FILEMAP_CANVAS_TEXT.empty)).not.toBeInTheDocument();
  });

  it('projects the exception a selected plant answers when the urgent window does not reach it', async () => {
    const user = userEvent.setup();

    /* The exception that ranks below the window: it lands on the second plant, and the window this
       case supplies answers for the opening plant alone, so only the read narrowed to that plant can
       return it. */
    const belowWindow = urgentRow(
      'exception-epsilon',
      SECOND_PLANT,
      'product-two',
      'high',
      32000,
      4,
      9,
    );

    port.listExceptions.mockImplementation((query) =>
      Promise.resolve(
        envelope(
          query.plantId === undefined
            ? URGENT_ROWS.filter((row) => row.plantId === OPENING_PLANT_ID)
            : [belowWindow].filter((row) => row.plantId === query.plantId),
        ),
      ),
    );
    /* The detail the port answers, mirroring the row the covering read returned for its own
       identifier: the dock prints the detail record's title, so this is what makes the record the
       dock names the one the plant answers (rule P-6). */
    port.getExceptionDetail.mockImplementation((exceptionId) =>
      Promise.resolve(
        envelope(
          exceptionId === belowWindow.id
            ? {
                ...EXCEPTION_DETAIL,
                exception: {
                  ...EXCEPTION_DETAIL.exception,
                  id: belowWindow.id,
                  title: belowWindow.title,
                  plantId: belowWindow.plantId,
                },
              }
            : EXCEPTION_DETAIL,
        ),
      ),
    );

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    await selectNode(user, SECOND_PLANT_LABEL);

    const dock = await screen.findByRole('region', { name: TIMELINE_DOCK_TEXT.title });

    /* The dock projects the exception the plant answers, named by its own identifier and its own
       title, and the detail read was made for that record. */
    expect(within(dock).getByText(belowWindow.id)).toBeInTheDocument();
    expect(within(dock).getByText(belowWindow.title)).toBeInTheDocument();
    expect(port.getExceptionDetail).toHaveBeenCalledWith(belowWindow.id);

    /* One read narrowed to that plant and to nothing else: no status, because the window beside it is
       drawn from the same population, and no limit, because the query has already picked the
       population a limit would page. */
    expect(port.listExceptions).toHaveBeenCalledWith({ plantId: belowWindow.plantId }, NO_SCOPE);

    /* The action investigates that exception rather than reporting that the plant answers none. */
    const action = screen.getByRole('button', { name: FILEMAP_CANVAS_TEXT.primaryAction });

    expect(action).not.toHaveAttribute('aria-disabled');

    action.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { level: 1, name: belowWindow.id })).toBeInTheDocument();
  });

  it('states the dock’s empty sentence when the covering read answers the plant with nothing', async () => {
    const user = userEvent.setup();

    /* The window answers for the opening plant alone and the plant-narrowed read answers nothing, so
       both sources agree that the second plant answers no open exception and the sentence asserting
       that absence is true. */
    port.listExceptions.mockImplementation((query) =>
      Promise.resolve(
        envelope(
          query.plantId === undefined
            ? URGENT_ROWS.filter((row) => row.plantId === OPENING_PLANT_ID)
            : [],
        ),
      ),
    );

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    await selectNode(user, SECOND_PLANT_LABEL);

    expect(await screen.findByText(FILEMAP_CANVAS_TEXT.dockEmpty)).toBeInTheDocument();

    /* The four-row window is still the first source and still asked for as a list parameter, and the
       read narrowed to the plant was the only other question the queue was asked. */
    expect(port.listExceptions).toHaveBeenCalledWith({ limit: URGENT_WINDOW }, NO_SCOPE);
    expect(port.listExceptions).toHaveBeenCalledWith({ plantId: SECOND_PLANT }, NO_SCOPE);
    expect(screen.queryByRole('region', { name: TIMELINE_DOCK_TEXT.title })).not.toBeInTheDocument();
  });

  it('gives the selected plant that answers no open exception its own reason for the action', async () => {
    const user = userEvent.setup();

    /* The window answers for the opening plant alone and the plant-narrowed read answers no row, so the
       selection is a plant the covering read has already answered for: the reader followed the advice
       that a plant is the node to select, and this is the state that advice leads to. */
    port.listExceptions.mockImplementation((query) =>
      Promise.resolve(
        envelope(
          query.plantId === undefined
            ? URGENT_ROWS.filter((row) => row.plantId === OPENING_PLANT_ID)
            : [],
        ),
      ),
    );

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    await selectNode(user, SECOND_PLANT_LABEL);

    /* The strip names the plant the reader selected and the dock states the same absence, so a reason
       telling that reader to select a plant would contradict both of them (rule P-8). */
    expect(
      screen.getByText(`${MAP_CANVAS_TEXT.selectedCaption} ${SECOND_PLANT_LABEL}`),
    ).toBeInTheDocument();
    expect(await screen.findByText(FILEMAP_CANVAS_TEXT.dockEmpty)).toBeInTheDocument();

    const action = screen.getByRole('button', { name: FILEMAP_CANVAS_TEXT.primaryAction });

    action.focus();

    /* The action is still disabled, and its reason states the absence the covering read established
       rather than repeating the advice to select a plant node the reader has already followed. */
    expect(action).toHaveAttribute('aria-disabled', 'true');
    expect(action).toHaveAccessibleDescription(FILEMAP_CANVAS_TEXT.primaryActionNoOpenException);
    expect(action).not.toHaveAccessibleDescription(FILEMAP_CANVAS_TEXT.primaryActionUnavailable);
  });

  it('states that the selected plant’s read did not answer, with a retry and the action’s own reason', async () => {
    const user = userEvent.setup();

    /* The window answers for the opening plant and the plant-narrowed read fails: the dock has no
       evidence that the plant answers nothing, so it states the read that did not answer. */
    port.listExceptions.mockImplementation((query) =>
      query.plantId === undefined
        ? Promise.resolve(envelope(URGENT_ROWS.filter((row) => row.plantId === OPENING_PLANT_ID)))
        : Promise.reject(FAILURE),
    );

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    await selectNode(user, SECOND_PLANT_LABEL);

    const stated = await screen.findByText(FILEMAP_CANVAS_TEXT.selectionUnread);

    /* The sentence stands in a status region, so the change is announced rather than only painted,
       and the retry beside it repeats that one read (rules B-3, P-8). */
    expect(stated.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel })).toBeInTheDocument();
    /* The absence the window could not establish is not asserted on the failed read's behalf. */
    expect(screen.queryByText(FILEMAP_CANVAS_TEXT.dockEmpty)).not.toBeInTheDocument();

    /* The action's reason names the read that failed, not the node advice this selection has already
       followed. */
    const action = screen.getByRole('button', { name: FILEMAP_CANVAS_TEXT.primaryAction });

    action.focus();

    expect(action).toHaveAccessibleDescription(FILEMAP_CANVAS_TEXT.primaryActionUnread);
  });

  it('keeps the dock’s projection when the covering read it had waited on no longer answers for it', async () => {
    const user = userEvent.setup();

    /* The canvas goes down with its window read and the covering read fails beside it. The reader
       retries, and the window's next answer carries the row that lands on the selected plant — so the
       covering read is no longer needed, while the failure it left stays cached under its own key
       (AAP §0.6.2 keys every read by its method and the arguments it was made with). The dock reads
       that failure only while that read is the one its selection is still waiting on. */
    const answered = urgentRow('exception-epsilon', SECOND_PLANT, 'product-two', 'high', 32000, 4, 9);
    let answers = 0;

    port.listExceptions.mockImplementation((query) => {
      if (query.plantId !== undefined) {
        return Promise.reject(FAILURE);
      }

      answers += 1;

      return answers === 1 ? Promise.reject(FAILURE) : Promise.resolve(envelope([answered]));
    });

    renderScreen({ selectedNodeId: SECOND_PLANT });

    await screen.findByText(STATE_BOUNDARY_TEXT.offlineHeadline);

    /* Every read the canvas needs has settled, and the covering read was asked and failed while the
       canvas was down: that is the state the case carries into the window's second answer. */
    await waitFor(() => {
      expect(
        port.listExceptions.mock.calls.filter(([query]) => query.plantId !== undefined),
      ).toHaveLength(1);
    });

    await activate(user, STATE_BOUNDARY_TEXT.retryLabel);

    /* The window answers for that plant now, so the dock projects the row the port returned and
       states neither an absence nor the failure of a read the selection no longer asks. */
    const dock = await screen.findByRole('region', { name: TIMELINE_DOCK_TEXT.title });

    expect(within(dock).getByText(answered.id)).toBeInTheDocument();
    expect(screen.queryByText(FILEMAP_CANVAS_TEXT.selectionUnread)).not.toBeInTheDocument();
    expect(screen.queryByText(FILEMAP_CANVAS_TEXT.dockEmpty)).not.toBeInTheDocument();

    /* Both sources still asked their own question, and the covering read was asked once: the window's
       own answer is what the dock is projecting. */
    expect(port.listExceptions).toHaveBeenCalledWith({ limit: URGENT_WINDOW }, NO_SCOPE);
    expect(port.listExceptions).toHaveBeenCalledWith({ plantId: SECOND_PLANT }, NO_SCOPE);
    expect(
      port.listExceptions.mock.calls.filter(([query]) => query.plantId !== undefined),
    ).toHaveLength(1);
  });

  it('states that the exception detail read did not answer, keeps the canvas drawn and re-reads it from the retry', async () => {
    const user = userEvent.setup();

    port.getExceptionDetail.mockRejectedValue(FAILURE);

    renderScreen();

    const canvas = await screen.findByRole('region', {
      name: FILEMAP_CANVAS_TEXT.canvasRegionLabel,
    });

    expect(await screen.findByText(FILEMAP_CANVAS_TEXT.dockDetailUnavailable)).toBeInTheDocument();

    /* The failure is the dock's alone: the ribbon, the lenses and the stack the reader came for are
       still drawn, and the dock's own region is the only thing the sentence stands in for. */
    expect(canvas).toBeInTheDocument();
    expect(ribbonGroup()).toBeInTheDocument();
    expect(stackRegion()).not.toBeNull();
    expect(screen.queryByRole('region', { name: TIMELINE_DOCK_TEXT.title })).not.toBeInTheDocument();

    const asked = port.getExceptionDetail.mock.calls.length;

    await activate(user, STATE_BOUNDARY_TEXT.retryLabel);

    /* The retry repeats the detail read rather than reloading the canvas around it. */
    await waitFor(() => {
      expect(port.getExceptionDetail.mock.calls.length).toBeGreaterThan(asked);
    });
    expect(port.getTopology).toHaveBeenCalledTimes(1);
  });

  it('holds the dock’s slot in the busy state while the covering read is answering', async () => {
    const user = userEvent.setup();

    /* A read that never settles: the dock has nothing to project and says it is still reading. */
    port.listExceptions.mockImplementation((query) =>
      query.plantId === undefined
        ? Promise.resolve(envelope(URGENT_ROWS.filter((row) => row.plantId === OPENING_PLANT_ID)))
        : new Promise<Result<ExceptionRow[]>>(() => undefined),
    );

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    await selectNode(user, SECOND_PLANT_LABEL);

    const busy = await screen.findByRole('status', { name: STATE_BOUNDARY_TEXT.loading });

    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('region', { name: TIMELINE_DOCK_TEXT.title })).not.toBeInTheDocument();

    /* The action says which read it is waiting for rather than that the plant answers nothing. */
    const action = screen.getByRole('button', { name: FILEMAP_CANVAS_TEXT.primaryAction });

    action.focus();

    expect(action).toHaveAccessibleDescription(FILEMAP_CANVAS_TEXT.primaryActionReading);
  });

  it('names the stale source and its as-of time above the figures that are still drawn', async () => {
    port.getTopology.mockResolvedValue(envelope(TOPOLOGY, 'stale'));

    renderScreen();

    /* The banner names the source the read reported as stale, through the one owner of the six
       display names, and prints the instant that source last answered. */
    expect(
      await screen.findByText(`${SOURCE_LABELS[APPROVAL_GATE_SOURCE]}${STATE_BOUNDARY_TEXT.staleSuffix}`),
    ).toBeInTheDocument();
    /* The instant is read inside the banner, because the same record value is stamped on the rows and
       the trail beside it; what the state asserts is that the warning states it. The banner is reached
       from its own headline rather than by role alone, because the canvas states other status regions
       beside it — the caption naming the lens in view is one (rule B-3). */
    const staleBanner = screen
      .getByText(`${SOURCE_LABELS[APPROVAL_GATE_SOURCE]}${STATE_BOUNDARY_TEXT.staleSuffix}`)
      .closest<HTMLElement>('[role="status"]');

    expect(staleBanner).not.toBeNull();

    if (staleBanner !== null) {
      expect(within(staleBanner).getByText(AS_OF)).toBeInTheDocument();
    }

    /* A warning about the data does not withhold the data. */
    expect(ribbonGroup()).toBeInTheDocument();
  });

  it('warns above the figures when a source answered incompletely', async () => {
    port.getTopology.mockResolvedValue(envelope(TOPOLOGY, 'partial'));

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.partialHeadline)).toBeInTheDocument();
    expect(screen.getByText(FILEMAP_CANVAS_TEXT.partial)).toBeInTheDocument();
    expect(ribbonGroup()).toBeInTheDocument();
  });

  it('offers a retry that reads the canvas again when no source answered', async () => {
    const user = userEvent.setup();

    port.getTopology.mockRejectedValueOnce(FAILURE);

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.offlineHeadline)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: UI.ribbon })).not.toBeInTheDocument();

    expect(port.getTopology).toHaveBeenCalledTimes(1);

    await activate(user, STATE_BOUNDARY_TEXT.retryLabel);

    /* The retry asks the port again rather than re-rendering what failed to arrive. */
    expect(await screen.findByRole('group', { name: UI.ribbon })).toBeInTheDocument();
    expect(port.getTopology).toHaveBeenCalledTimes(2);
  });

  it('explains a permission refusal with the permission, the roles that hold it and the trace id', async () => {
    port.getTopology.mockRejectedValue(DENIAL);

    renderScreen();

    /* The card names the permission the acting role lacks, without this suite restating the wording
       the card composes around it. */
    expect(
      await screen.findByRole('heading', { name: new RegExp(escapeRegExp(DENIED_PERMISSION), 'u') }),
    ).toBeInTheDocument();
    expect(screen.getByText(HOLDING_ROLE)).toBeInTheDocument();
    expect(screen.getByText(DENIAL.traceId)).toBeInTheDocument();

    /* Repeating a call the role is not permitted to make would be refused again, so no retry is
       offered (rules P-8). */
    expect(
      screen.queryByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel }),
    ).not.toBeInTheDocument();
  });

  it('reports records that moved under the reader as a conflict, with a control that re-reads them', async () => {
    const user = userEvent.setup();

    port.getTopology.mockRejectedValue(CONFLICT);

    renderScreen();

    expect(await screen.findByText(FILEMAP_CANVAS_TEXT.conflict)).toBeInTheDocument();

    await activate(user, STATE_BOUNDARY_TEXT.reloadLabel);

    expect(port.getTopology).toHaveBeenCalledTimes(2);
  });

  it('offers the primary action enabled once the selection reaches an exception, and opens that one', async () => {
    const user = userEvent.setup();

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    /* By the time the canvas has drawn, the selection has resolved to the most urgent exception's
       plant, so the action the screen exists to take can act. */
    const action = screen.getByRole('button', { name: FILEMAP_CANVAS_TEXT.primaryAction });

    expect(action).not.toHaveAttribute('aria-disabled');

    action.focus();
    await user.keyboard('{Enter}');

    /* The action lands on the exception's own route, with the identifier the selection resolved to. */
    expect(
      await screen.findByRole('heading', { level: 1, name: PRIMARY_EXCEPTION_ID }),
    ).toBeInTheDocument();
  });

  it('keeps the primary action on screen, disabled with its reason, while the selection reaches no exception', async () => {
    const user = userEvent.setup();

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    expect(
      screen.getByRole('button', { name: FILEMAP_CANVAS_TEXT.primaryAction }),
    ).not.toHaveAttribute('aria-disabled');

    const origin = nodeControl('Ordival Metals');

    origin.focus();
    await user.keyboard('{Enter}');

    /* A node that answers no exception leaves the action unable to act, and rule P-8 asks such a control
       to say so in words rather than to vanish: it keeps its place, reports itself unavailable, and names
       the node that would let it act. It stays focusable, so the reason reaches a keyboard reader too
       (rule B-3), it refuses the activation rather than performing it, and the dock explains the gap in
       the projection instead of drawing empty axes. */
    const blocked = screen.getByRole('button', { name: FILEMAP_CANVAS_TEXT.primaryAction });

    expect(blocked).toHaveAttribute('aria-disabled', 'true');

    blocked.focus();

    expect(document.activeElement).toBe(blocked);
    expect(blocked).toHaveAccessibleDescription(FILEMAP_CANVAS_TEXT.primaryActionUnavailable);

    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('heading', { level: 1, name: FILEMAP_CANVAS_TEXT.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(FILEMAP_CANVAS_TEXT.dockEmpty)).toBeInTheDocument();
  });

  it('holds under both themes', async () => {
    const user = userEvent.setup();

    for (const theme of THEMES) {
      document.documentElement.dataset.theme = theme;

      const rendered = renderScreen();

      const canvas = await screen.findByRole('region', {
        name: FILEMAP_CANVAS_TEXT.canvasRegionLabel,
      });

      /* The proportion, the ribbon's labels, both lenses, the action and the dock are the surface's
         contract rather than its colouring, so each of them holds in both themes. No assertion here
         reads a colour, which is why the same expectations run twice. */
      expect(canvas.className).toContain('xl:basis-[65%]');
      expect(stackRegion()).not.toBeNull();

      const ribbon = ribbonGroup();

      for (const tile of RIBBON_TILES) {
        const caption = TILE_CAPTIONS[tile.id];

        if (caption === undefined) {
          continue;
        }

        expect(
          within(within(ribbon).getByRole('region', { name: caption })).getAllByText(SIM_LABELS[1]),
        ).toHaveLength(1);
      }

      expect(
        screen.getByRole('button', { name: FILEMAP_CANVAS_TEXT.primaryAction }),
      ).toBeInTheDocument();

      await activate(user, FILEMAP_CANVAS_TEXT.graphLens);

      expect(screen.getByText(lensCaption(FILEMAP_CANVAS_TEXT.graphLens))).toBeInTheDocument();

      expect(within(auditTrail()).getAllByRole('listitem')).toHaveLength(AUDIT_WINDOW);

      rendered.unmount();
    }

    expect(document.documentElement.dataset.theme).toBe(THEMES[THEMES.length - 1]);
  });

  it('reaches the lens switch, the wall-mode toggle and a canvas node from the keyboard alone', async () => {
    const user = userEvent.setup();

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    /* The action this screen exists to take is the first stop the tab order reaches. */
    const primary = await tabTo(
      user,
      (element) => element.textContent?.trim() === FILEMAP_CANVAS_TEXT.primaryAction,
      TAB_WALK_LIMIT,
    );

    expect(primary.tagName).toBe('BUTTON');

    /* The lens switch is reached and operated with no pointer at all, and the screen states the lens
       it now draws in words. */
    await tabTo(
      user,
      (element) => element.textContent?.trim() === FILEMAP_CANVAS_TEXT.graphLens,
      TAB_WALK_LIMIT,
    );
    await user.keyboard('{Enter}');

    expect(screen.getByText(lensCaption(FILEMAP_CANVAS_TEXT.graphLens))).toBeInTheDocument();

    /* So is the wall-mode toggle, whose label states the mode it will leave. */
    await tabTo(
      user,
      (element) => element.textContent?.trim() === FILEMAP_CANVAS_TEXT.wallModeEnter,
      TAB_WALK_LIMIT,
    );
    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('button', { name: FILEMAP_CANVAS_TEXT.wallModeExit }),
    ).toBeInTheDocument();

    /* And a node, whose activation moves the selection the dock follows. */
    await tabTo(
      user,
      (element) => (element.getAttribute('aria-label') ?? '').startsWith('Ordival Metals,'),
      TAB_WALK_LIMIT,
    );
    await user.keyboard('{Enter}');

    const strip = screen.getByText(DEPENDENCY_GRAPH_TEXT.selectedLabel).parentElement;

    expect(strip).not.toBeNull();
    expect(strip).toHaveTextContent('Ordival Metals');
  });

  it('asks no origin for anything and carries no test hook (rule B-1)', async () => {
    const user = userEvent.setup();
    const fetched = vi.spyOn(globalThis, 'fetch');
    const opened = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const sent = vi.spyOn(XMLHttpRequest.prototype, 'send');

    const { container } = renderScreen();

    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    /* The surface is operated the way a reader would before the claim is made. */
    await activate(user, FILEMAP_CANVAS_TEXT.graphLens);

    const node = nodeControl('Northgate plant');

    node.focus();
    await user.keyboard('{Enter}');

    await activate(user, FILEMAP_CANVAS_TEXT.mapLens);

    expect(fetched).not.toHaveBeenCalled();
    expect(opened).not.toHaveBeenCalled();
    expect(sent).not.toHaveBeenCalled();

    /* Nothing the surface renders addresses a host or embeds a resource that would. */
    const addresses = [
      ...container.querySelectorAll('[href],[xlink\\:href],[src],[srcset],[action]'),
    ]
      .map(
        (element) =>
          element.getAttribute('href') ??
          element.getAttribute('xlink:href') ??
          element.getAttribute('src') ??
          element.getAttribute('srcset') ??
          element.getAttribute('action') ??
          '',
      )
      .filter((address) => address.trim() !== '');

    expect(addresses).toStrictEqual([]);
    expect(container.querySelectorAll('img, image, iframe, object, embed')).toHaveLength(0);
    /* And no hook exists for a test to reach production behaviour through. */
    expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
  });

  it('explains the one control on the canvas that cannot act, and leaves no silent dead control', async () => {
    const user = userEvent.setup();

    renderScreen();
    await screen.findByRole('region', { name: FILEMAP_CANVAS_TEXT.canvasRegionLabel });

    /* The graph lens is where the staged control lives, and the opening selection is a plant that
       carries a product, which is the condition the drawing renders it under. */
    await activate(user, FILEMAP_CANVAS_TEXT.graphLens);

    const openPart = screen.getByRole('button', { name: DEPENDENCY_GRAPH_TEXT.openPartLabel });

    expect(openPart).toHaveAttribute('aria-disabled', 'true');

    /* It stays in the tab order and states why on focus, so the reason is reachable by keyboard and
       announced rather than painted only on hover (rules B-3, P-8). */
    openPart.focus();

    expect(document.activeElement).toBe(openPart);
    expect(openPart).toHaveAccessibleDescription(DEPENDENCY_GRAPH_TEXT.stageFourReason);

    /* Activating it does nothing at all: the reader stays where they were rather than being taken to
       a stage that does not exist. */
    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('heading', { level: 1, name: FILEMAP_CANVAS_TEXT.title }),
    ).toBeInTheDocument();

    /* Every control in the canvas that reports itself unavailable carries a reason, so none of them
       is focusable and silent. */
    const unavailable = [
      ...canvasRegion().querySelectorAll<HTMLButtonElement>('button[aria-disabled="true"]'),
    ];

    expect(unavailable.length).toBeGreaterThan(0);

    for (const control of unavailable) {
      expect(control).toHaveAccessibleDescription();
    }
  });
});

