/**
 * Component suite for `map-canvas.tsx`, the map lens of the FileMap canvas.
 *
 * Each case asserts one clause of the lens's own contract, taken from the specification and the rules
 * rather than from the implementation's shape: the bundled boundary file is the only geographic source
 * and no request is made for it (rule B-1, T-20); the three zoom levels and the five presets move the
 * projection; the five presets are native controls that report the view they were asked for; the frame is
 * fitted to the payload, so every drawn mark — a node, a competitor site and a crossing alike — lies
 * inside it at the widest zoom level on every preset, while a closer level magnifies it and may carry
 * marks out; the pan moves the frame from a pointer drag and from the arrow keys without re-projecting
 * the world or touching the selection, and "Reset view" returns it, disabled with its reason at the start
 * (AAP 0.12.4 SCR-12, rule B-3); each of the five node families reaches the map as a labelled,
 * focusable control whose accessible name states the family and the evidence-pin counts per state
 * (rules B-3, P-6); a key under the drawing names every state the view carries beside its own icon, so
 * the two states that share the warning hue are told apart and the key states no count of its own
 * (rules B-3, P-6); the node the screen holds as selected carries `aria-pressed` and is named in a
 * caption under the drawing; activating a node reports the
 * selection and opens the evidence drawer for the reference the required mapper resolves for it, a
 * node the mapper cannot resolve declaring no drawer and opening none (rule P-8); the two zoom
 * controls stop at the ends of their range and say why (rule P-8); the competitor marks, the chokepoint
 * halos and the legend appear only when the atlas payload supplies them, and always with the fixed
 * market-intelligence label imported from `src/types` (rules P-1, P-5); a competitor's hue follows its
 * own identifier rather than the position the payload lists it in, in the marks and in the legend row
 * alike; the overlay's own enumeration of the marks it paints is the one the drawing reads; and the lens
 * renders under both themes.
 *
 * The fixtures hold plain words for the record names and neutral keys for the identifiers, with the one
 * exception the overlay's contract requires: a competitor network's identifier states the contracts'
 * `CMP-nn` ordinal, because that identifier — and not a list position — decides the hue the network is
 * painted in. No fixture borrows a value from a seed record: what the map draws is entirely the
 * caller's props, and the lens formats no figure of its own (rule P-6). The topology
 * carries two nodes of every family and pin counts that between them cover all six `PinState`
 * members, so a lens that drew only the first node of each array, or that printed one state and
 * dropped the rest, fails here rather than passing on a one-node fixture. The service is mocked
 * because the evidence drawer reads through it; nothing here hashes, reads the clock or touches the
 * network.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Atlas, Chokepoint, CompetitorNetwork, PinCounts, Topology, TopologyNode } from '../types';
import type { TopologyNodeKind } from '../types';
import { SIM_LABELS } from '../types';
import {
  MAP_CANVAS_TEXT,
  MAP_VIEW_PRESETS,
  MAP_VIEW_PRESET_LABELS,
  MapCanvas,
  overlayMarksOf,
} from './map-canvas';
import type { MapCanvasProps, MapZoomLevel } from './map-canvas';
import { CHART_TONE_CLASSES, CONTROL_RADIUS_CLASSES } from './horizontal-bar-chart';
import type { CompetitorSlot } from './horizontal-bar-chart';
import { SVG_LABEL_FONT_SIZE, estimateTextWidth } from './svg-label';
import { MEANING_COLOUR_CLASSES } from './status-indicator';

/**
 * The service the evidence drawer reads through, replaced because this suite is about the drawing.
 *
 * The read never settles, so the drawer stays in its loading state: the case that activates a node
 * asserts that the drawer opened, which is this component's contract, and leaves what a drawer does
 * with an answer to the drawer's own suite.
 */
vi.mock('../services/service-provider', () => ({
  useService: () => ({
    getEvidence: () => new Promise(() => undefined),
  }),
}));

/** The market-intelligence label, read from its single owner so this suite never retypes it. */
const MARKET_INTELLIGENCE_LABEL = SIM_LABELS[5];

/** The six pin states, taken from a complete count record so no state has to be counted twice. */
const NO_PINS: PinCounts = { empty: 0, pending: 0, pass: 0, fail: 0, stale: 0, review: 0 };

/** One node's counts: a complete record with the given states set. */
function pinCounts(stated: Partial<PinCounts>): PinCounts {
  return { ...NO_PINS, ...stated };
}

/**
 * A ten-node network: two nodes of every family, the materials placed at the sites they ship from, the
 * four lanes of the client's own chain, and pin counts that between them cover each of the six
 * `PinState` members.
 *
 * The coordinates sit across Europe, the Gulf of Mexico and Japan, so the fitted frame draws them all
 * at the widest zoom level and the projection assertions are about the frame rather than about a region
 * a preset was fixed to; the payload that spans the map's own extremes is {@link SPREAD_TOPOLOGY}. A node
 * absent from `pinsByNode` carries no pins, which is the case the accessible name states as "No evidence
 * pins" — and which is the only reading a material node has, because no evidence pin is attached to a
 * material record.
 */
const TOPOLOGY: Topology = {
  plants: [
    {
      id: 'node-plant',
      kind: 'plant',
      label: 'Regensburg plant',
      latitude: 49.02,
      longitude: 12.1,
      productIds: ['product-one'],
    },
    {
      id: 'node-plant-second',
      kind: 'plant',
      label: 'Brno plant',
      latitude: 49.19,
      longitude: 16.61,
      productIds: ['product-two'],
    },
  ],
  suppliers: [
    {
      id: 'node-supplier',
      kind: 'supplier',
      label: 'Rheinstern Elektronik',
      latitude: 48.14,
      longitude: 11.58,
      productIds: ['product-one'],
    },
    {
      id: 'node-supplier-second',
      kind: 'supplier',
      label: 'Fjordvik Components',
      latitude: 57.7,
      longitude: 11.97,
      productIds: ['product-two'],
    },
  ],
  materials: [
    {
      id: 'node-material',
      kind: 'material',
      label: 'Rolled sheet steel',
      latitude: 48.14,
      longitude: 11.58,
      productIds: ['product-one'],
    },
    {
      id: 'node-material-second',
      kind: 'material',
      label: 'Fastener set, M8',
      latitude: 57.7,
      longitude: 11.97,
      productIds: ['product-two'],
    },
  ],
  origins: [
    {
      id: 'node-origin',
      kind: 'origin',
      label: 'Bajio metals origin',
      latitude: 21.5,
      longitude: -101.5,
      productIds: [],
    },
    {
      id: 'node-origin-second',
      kind: 'origin',
      label: 'Kansai alloys origin',
      latitude: 34.7,
      longitude: 135.5,
      productIds: ['product-two'],
    },
  ],
  customers: [
    {
      id: 'node-customer',
      kind: 'customer',
      label: 'Nordwerk Nutzfahrzeuge',
      latitude: 53.55,
      longitude: 9.99,
      productIds: [],
    },
    {
      id: 'node-customer-second',
      kind: 'customer',
      label: 'Hochwald Fleetworks',
      latitude: 45.46,
      longitude: 9.19,
      productIds: [],
    },
  ],
  lanes: [
    { fromId: 'node-origin', toId: 'node-supplier' },
    { fromId: 'node-supplier', toId: 'node-material' },
    { fromId: 'node-material', toId: 'node-plant' },
    { fromId: 'node-supplier-second', toId: 'node-material-second' },
  ],
  pinsByNode: {
    'node-supplier': pinCounts({ pass: 2, fail: 1 }),
    'node-plant': pinCounts({ stale: 1 }),
    'node-origin-second': pinCounts({ pending: 1, review: 2, empty: 1 }),
  },
};

/** Every node of the payload, counted across the five families rather than restated as a literal. */
const NODE_COUNT =
  TOPOLOGY.plants.length +
  TOPOLOGY.suppliers.length +
  TOPOLOGY.materials.length +
  TOPOLOGY.origins.length +
  TOPOLOGY.customers.length;

/**
 * A ten-node network that spans the extremes a scope can carry: two nodes of every family, placed from
 * the far north to beyond the equator and from one side of the map to the other.
 *
 * These are the coordinates the fitted frame has to hold. A payload whose marks reach this far is exactly
 * the case a fixed framing could not draw — a plant in the Baltic, a supplier on the Pacific coast and an
 * origin above the Arctic circle all fell outside the view box — so every preset is asserted to keep them
 * inside the frame at the widest zoom level. The materials sit at their suppliers' sites, as a material
 * record's coordinates are its primary supplier's, and the lanes join the chain the drawing arcs.
 */
const SPREAD_TOPOLOGY: Topology = {
  plants: [
    {
      id: 'spread-plant-north',
      kind: 'plant',
      label: 'Baltic plant',
      latitude: 60.17,
      longitude: 24.94,
      productIds: [],
    },
    {
      id: 'spread-plant-south',
      kind: 'plant',
      label: 'Tasman plant',
      latitude: -33.87,
      longitude: 151.21,
      productIds: [],
    },
  ],
  suppliers: [
    {
      id: 'spread-supplier-pacific',
      kind: 'supplier',
      label: 'Pacific supplier',
      latitude: 37.77,
      longitude: -122.42,
      productIds: [],
    },
    {
      id: 'spread-supplier-insular',
      kind: 'supplier',
      label: 'Insular supplier',
      latitude: 35.68,
      longitude: 139.69,
      productIds: [],
    },
  ],
  materials: [
    {
      id: 'spread-material-pacific',
      kind: 'material',
      label: 'Pacific material',
      latitude: 37.77,
      longitude: -122.42,
      productIds: [],
    },
    {
      id: 'spread-material-insular',
      kind: 'material',
      label: 'Insular material',
      latitude: 35.68,
      longitude: 139.69,
      productIds: [],
    },
  ],
  origins: [
    {
      id: 'spread-origin-arctic',
      kind: 'origin',
      label: 'Arctic origin',
      latitude: 69.65,
      longitude: 18.96,
      productIds: [],
    },
    {
      id: 'spread-origin-andean',
      kind: 'origin',
      label: 'Andean origin',
      latitude: -16.5,
      longitude: -68.15,
      productIds: [],
    },
  ],
  customers: [
    {
      id: 'spread-customer-atlantic',
      kind: 'customer',
      label: 'Atlantic customer',
      latitude: 25.2,
      longitude: -80.19,
      productIds: [],
    },
    {
      id: 'spread-customer-cape',
      kind: 'customer',
      label: 'Cape customer',
      latitude: -33.92,
      longitude: 18.42,
      productIds: [],
    },
  ],
  lanes: [
    { fromId: 'spread-origin-arctic', toId: 'spread-supplier-insular' },
    { fromId: 'spread-origin-andean', toId: 'spread-supplier-pacific' },
    { fromId: 'spread-supplier-pacific', toId: 'spread-material-pacific' },
    { fromId: 'spread-supplier-insular', toId: 'spread-material-insular' },
  ],
  pinsByNode: {},
};

/** Every node of {@link SPREAD_TOPOLOGY}, counted across the five families the same way. */
const SPREAD_NODE_COUNT =
  SPREAD_TOPOLOGY.plants.length +
  SPREAD_TOPOLOGY.suppliers.length +
  SPREAD_TOPOLOGY.materials.length +
  SPREAD_TOPOLOGY.origins.length +
  SPREAD_TOPOLOGY.customers.length;

/**
 * A twelve-node network shaped the way the payload the lens actually draws is: one dense cluster, and a
 * few nodes scattered far from it.
 *
 * WHY THE SHAPE MATTERS. A fit frames the *extent* of its marks rather than their distribution, so a
 * network of this shape fills its frame with a tight cluster beside one edge and leaves the middle of
 * that frame in empty water. The three zoom levels magnify about the point the marks project to, so the
 * cluster the network is made of has to stay in the drawing at every level; magnified about the middle
 * of the fitted box instead, the whole cluster would leave the frame at once and the closest level would
 * draw nothing at all. Nine of these marks sit within a few degrees of one another in Europe and three
 * lie further out — off the Iberian coast, in the tropical eastern Atlantic and in the South Atlantic — which is the
 * proportion, most of a network in one cluster and a minority scattered, that the real payload carries.
 * The materials sit at their suppliers' sites, as a material record's coordinates do, and none of the
 * coordinates is borrowed from a seed record.
 */
const CLUSTER_TOPOLOGY: Topology = {
  plants: [
    {
      id: 'cluster-plant-one',
      kind: 'plant',
      label: 'Cluster plant one',
      latitude: 49.02,
      longitude: 12.1,
      productIds: [],
    },
    {
      id: 'cluster-plant-two',
      kind: 'plant',
      label: 'Cluster plant two',
      latitude: 49.19,
      longitude: 16.61,
      productIds: [],
    },
  ],
  suppliers: [
    {
      id: 'cluster-supplier-one',
      kind: 'supplier',
      label: 'Cluster supplier one',
      latitude: 48.14,
      longitude: 11.58,
      productIds: [],
    },
    {
      id: 'cluster-supplier-two',
      kind: 'supplier',
      label: 'Cluster supplier two',
      latitude: 57.7,
      longitude: 11.97,
      productIds: [],
    },
    {
      id: 'cluster-supplier-three',
      kind: 'supplier',
      label: 'Cluster supplier three',
      latitude: 54.35,
      longitude: 18.65,
      productIds: [],
    },
  ],
  materials: [
    {
      id: 'cluster-material-one',
      kind: 'material',
      label: 'Cluster material one',
      latitude: 48.14,
      longitude: 11.58,
      productIds: [],
    },
    {
      id: 'cluster-material-two',
      kind: 'material',
      label: 'Cluster material two',
      latitude: 57.7,
      longitude: 11.97,
      productIds: [],
    },
  ],
  origins: [
    {
      id: 'cluster-origin-equatorial',
      kind: 'origin',
      label: 'Equatorial origin',
      latitude: 15.0,
      longitude: -17.0,
      productIds: [],
    },
    {
      id: 'cluster-origin-iberian',
      kind: 'origin',
      label: 'Iberian origin',
      latitude: 36.0,
      longitude: -28.0,
      productIds: [],
    },
  ],
  customers: [
    {
      id: 'cluster-customer-near',
      kind: 'customer',
      label: 'Cluster customer',
      latitude: 50.11,
      longitude: 8.68,
      productIds: [],
    },
    {
      id: 'cluster-customer-overseas',
      kind: 'customer',
      label: 'Overseas customer',
      latitude: -20.0,
      longitude: -60.0,
      productIds: [],
    },
    {
      id: 'cluster-customer-nearby',
      kind: 'customer',
      label: 'Nearby customer',
      latitude: 52.2,
      longitude: 20.5,
      productIds: [],
    },
  ],
  lanes: [
    { fromId: 'cluster-origin-iberian', toId: 'cluster-supplier-one' },
    { fromId: 'cluster-origin-equatorial', toId: 'cluster-supplier-two' },
    { fromId: 'cluster-supplier-one', toId: 'cluster-plant-one' },
    { fromId: 'cluster-supplier-three', toId: 'cluster-plant-two' },
  ],
  pinsByNode: {},
};

/** Every node of {@link CLUSTER_TOPOLOGY}, counted across the five families the same way. */
const CLUSTER_NODE_COUNT =
  CLUSTER_TOPOLOGY.plants.length +
  CLUSTER_TOPOLOGY.suppliers.length +
  CLUSTER_TOPOLOGY.materials.length +
  CLUSTER_TOPOLOGY.origins.length +
  CLUSTER_TOPOLOGY.customers.length;

/**
 * The share of the drawn marks each closer zoom level must still draw inside the frame.
 *
 * A closer level magnifies the network past the frame's own edges — that is what a zoom is for, and the
 * pan is what reaches the rest — but it may never show an empty map, and the marks it leaves out are the
 * outliers rather than the cluster the network is made of. The shares are the bar this suite holds the
 * two closer levels to, stated once here so both the case and its message read the same number.
 */
const CLOSER_LEVEL_MARK_SHARE: Record<2 | 3, number> = { 2: 0.4, 3: 0.25 };

/**
 * How many arrow presses are taken to be past the end of every range the lens allows.
 *
 * The lens moves the frame one fixed step per press, and the widest range any level allows is a quarter
 * of the view box times the closest level's magnification, so this many presses always ends against the
 * clamp whatever level is on screen — which is what lets a case read the range a level allows.
 */
const PAN_REACH_PRESSES = 40;

/**
 * The room a revealed mark keeps from the frame's edge: the focus ring's own radius and its stroke.
 *
 * Restated rather than imported, so a ring that grew would fail the case asserting that the whole ring
 * is drawn inside the frame instead of passing on a radius the test had quietly followed.
 */
const FOCUS_RING_CLEARANCE = 13;

/**
 * How far a drawn marker's own centre may sit from the node's projected point, in view-box units.
 *
 * A supplier's circle and a plant's square are centred on that point exactly; the three polygon families
 * are drawn as shapes whose vertex average sits a fraction of a unit below it, and the focus ring, like
 * the node's own point, is drawn on the projected point rather than on that average. The slack keeps a
 * case about the frame from failing on the fraction.
 */
const MARK_CENTRE_SLACK = 1;

/**
 * How far the marks' mean point may move between the widest zoom level and the closest one, in view-box
 * units.
 *
 * The mean point of the drawn marks is the anchor a zoom magnifies about, so magnifying leaves it where
 * it was. The room allowed covers the orbit a material is drawn at — fixed geometry that does not scale
 * with the level — and the one-unit rounding the projection applies to each coordinate, and is far
 * smaller than the drift an anchor at the frame's own middle produces on this payload.
 */
const CENTROID_TOLERANCE = 15;

/**
 * How far inside the frame a mark is expected to sit, in view-box units.
 *
 * A little under the inset the fitted frame keeps clear, so the one-unit rounding the projection applies
 * to a coordinate cannot fail the case while a mark drawn against the frame's own edge still does.
 */
const FRAME_INSET_MINIMUM = 40;

/**
 * The two ways a view carries no pin: a pin map with no entry at all, and a pin map whose every entry
 * counts zero.
 *
 * Neither carries a state, so neither draws a pin-state key — a caption over an empty row would name
 * states the map does not hold.
 */
const EMPTY_PIN_MAPS: readonly (readonly [string, Topology['pinsByNode']])[] = [
  ['an empty pin map', {}],
  [
    'a pin map of zero counts',
    Object.fromEntries(Object.keys(TOPOLOGY.pinsByNode).map((nodeId) => [nodeId, NO_PINS])),
  ],
];

/** The seven controls beside the map: the two zoom steps and the five view presets. */
const CONTROL_COUNT = 2 + MAP_VIEW_PRESETS.length;

/**
 * One topology node, stated with the members the lens reads and nothing else.
 *
 * @param kind The family the node belongs to.
 * @param id The node's identifier, which its mark's key and the pin counts use.
 * @param label The node's own name.
 * @param latitude The node's latitude in degrees.
 * @param longitude The node's longitude in degrees.
 * @returns The node.
 */
function nodeAt(
  kind: TopologyNodeKind,
  id: string,
  label: string,
  latitude: number,
  longitude: number,
): TopologyNode {
  return { id, kind, label, latitude, longitude, productIds: [] };
}

/**
 * A name far longer than the map is wide, built from a synthetic part rather than written out.
 *
 * A hundred and ninety-eight characters estimate at more than three times the drawing's own width, so no
 * candidate position can hold the run in full: the case that reads it is about the shortening, not about
 * the particular words.
 */
const OVERLONG_NAME = 'Antriebswerk Steiermark '.repeat(9).trimEnd();

/**
 * Seven places standing within a few degrees of one another, and one party named far longer than the
 * drawing is wide.
 *
 * The projection squeezes an ocean into a few dozen units, so a real payload's plants, suppliers and
 * customers land within one name's width of each other; this fixture states that collision directly
 * instead of hoping a world-scale coordinate produces it. The over-long party stands alone over Japan, so
 * the case that reads it measures the shortening rather than the crowding.
 */
const CLUSTERED_TOPOLOGY: Topology = {
  plants: [
    nodeAt('plant', 'cluster-plant-one', 'Regensburg plant', 49.02, 12.1),
    nodeAt('plant', 'cluster-plant-two', 'Brno plant', 49.19, 16.61),
    nodeAt('plant', 'cluster-plant-three', OVERLONG_NAME, 35.68, 139.76),
  ],
  suppliers: [
    nodeAt('supplier', 'cluster-supplier-one', 'Rheinstern Elektronik', 48.14, 11.58),
    nodeAt('supplier', 'cluster-supplier-two', 'Fjordvik Components', 48.3, 11.2),
    nodeAt('supplier', 'cluster-supplier-three', 'Alpenrand Fahrzeugbau AG', 48.5, 12.4),
  ],
  materials: [],
  origins: [nodeAt('origin', 'cluster-origin-one', 'Bajio metals origin', 48.6, 11.9)],
  customers: [
    nodeAt('customer', 'cluster-customer-one', 'Nordwerk Nutzfahrzeuge', 48.9, 11.4),
    nodeAt('customer', 'cluster-customer-two', 'Hochwald Fleetworks', 49.1, 12.0),
  ],
  lanes: [],
  pinsByNode: {
    'cluster-plant-one': pinCounts({ pass: 1 }),
    'cluster-supplier-one': pinCounts({ fail: 2, pass: 1 }),
  },
};

/**
 * Two places the projection puts on one point, each carrying evidence pins of its own.
 *
 * Two records can state one coordinate — a plant and the site beside it, two suppliers in one city — and
 * the drawing keeps both marks and both rows of numerals, so this fixture states the collision the case
 * about badge rows reads.
 */
const COINCIDENT_TOPOLOGY: Topology = {
  plants: [
    nodeAt('plant', 'coincident-plant-one', 'Regensburg plant', 49.02, 12.1),
    nodeAt('plant', 'coincident-plant-two', 'Coburg plant', 49.02, 12.1),
  ],
  suppliers: [],
  materials: [],
  origins: [],
  customers: [],
  lanes: [],
  pinsByNode: {
    'coincident-plant-one': pinCounts({ pass: 1 }),
    'coincident-plant-two': pinCounts({ review: 2 }),
  },
};

/**
 * The name every place in the crowded fixture carries: longer than the widest run the map prints, so the
 * drawing has to cut it rather than seat it whole.
 */
const CROWDED_NAME = 'Antriebswerk Steiermark Fertigungsverbund'.padEnd(40, 'x');

/**
 * Twelve places inside half a degree of one another, every one of them named longer than a printed run
 * and every one of them carrying a pin.
 *
 * This is the collision the world projection makes of the pack's own sites — a continent squeezed into a
 * few dozen units — stated directly instead of hoped for: the drawing has to seat twelve names and twelve
 * rows of numerals where neither fits in full, and the case is what proves a place keeps a shortened name
 * rather than losing it.
 */
const CROWDED_TOPOLOGY: Topology = {
  plants: [0, 1, 2, 3, 4, 5].map((index) =>
    nodeAt('plant', `crowded-plant-${String(index)}`, CROWDED_NAME, 48.5 + index * 0.05, 11.5),
  ),
  suppliers: [0, 1, 2, 3, 4, 5].map((index) =>
    nodeAt('supplier', `crowded-supplier-${String(index)}`, CROWDED_NAME, 48.5 + index * 0.05, 11.6),
  ),
  materials: [],
  origins: [],
  customers: [],
  lanes: [],
  pinsByNode: Object.fromEntries(
    [
      ...[0, 1, 2, 3, 4, 5].map((index) => `crowded-plant-${String(index)}`),
      ...[0, 1, 2, 3, 4, 5].map((index) => `crowded-supplier-${String(index)}`),
    ].map((id) => [id, pinCounts({ pass: 1 })]),
  ),
};

/** One shared crossing, stated with the shared shape's own members and nothing else. */
const CROSSING: Chokepoint = {
  id: 'crossing-one',
  label: 'Southern sea crossing',
  overlap: 67,
  competitorBufferDays: { 'CMP-01': 12 },
  contentionNote: 'Three networks use the crossing and the buffer each holds differs.',
  provenance: 'market_intelligence',
};

/**
 * A market-intelligence payload: one competitor network of two sites with a lane through the crossing,
 * and the crossing itself.
 *
 * The network's identifier is the `CMP-nn` shape the contracts give a competitor, because the overlay
 * resolves the hue a network is painted in from that identifier; the sites name the same competitor so
 * the fixture states one record rather than a mark and a name that disagree.
 *
 * The recorded series and axes are empty because this suite asserts nothing about the radar; the atlas
 * shape allows empty lists, and the fields the lens reads are the networks and the crossings.
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

/**
 * The three competitors the slot case reorders, one site each so a network's mark is a single polygon.
 *
 * Their identifiers carry the ordinals §4.2 selects the three competitor hues by — `CMP-01` the first,
 * `CMP-02` the second, `CMP-03` the third — and the three sites sit far apart so no two marks can
 * coincide on the map. The names are plainly synthetic rather than seed records: this suite holds no
 * value that belongs to the dataset.
 */
const NETWORK_FIRST: CompetitorNetwork = {
  competitorId: 'CMP-01',
  label: 'Competitor alpha',
  provenance: 'market_intelligence',
  productClasses: ['product-one'],
  sites: [
    {
      id: 'site-alpha',
      competitorId: 'CMP-01',
      label: 'Alpha assembly',
      latitude: 52.52,
      longitude: 13.4,
    },
  ],
  lanes: [],
};

/** The second competitor: its own ordinal, and a site nowhere near the other two. */
const NETWORK_SECOND: CompetitorNetwork = {
  competitorId: 'CMP-02',
  label: 'Competitor beta',
  provenance: 'market_intelligence',
  productClasses: ['product-one'],
  sites: [
    {
      id: 'site-beta',
      competitorId: 'CMP-02',
      label: 'Beta assembly',
      latitude: 35.68,
      longitude: 139.69,
    },
  ],
  lanes: [],
};

/** The third competitor, whose ordinal is the last of the three §4.2 gives a hue to. */
const NETWORK_THIRD: CompetitorNetwork = {
  competitorId: 'CMP-03',
  label: 'Competitor gamma',
  provenance: 'market_intelligence',
  productClasses: ['product-one'],
  sites: [
    {
      id: 'site-gamma',
      competitorId: 'CMP-03',
      label: 'Gamma assembly',
      latitude: 41.88,
      longitude: -87.63,
    },
  ],
  lanes: [],
};

/**
 * The same atlas payload with its competitor networks in the order given.
 *
 * The slot case feeds the three networks in the pack's own order and then in the opposite one, so the
 * only difference between the two drawings is which position each competitor holds in the list.
 */
function overlayOf(networks: readonly CompetitorNetwork[]): Atlas {
  return { ...ATLAS, competitors: [...networks] };
}

/**
 * The mapping a case that asserts nothing about evidence starts from: no record stands behind any
 * node, so activating one reports the selection and opens nothing. The prop is required, so the lens
 * is never composed without one; a case that exercises the drawer names its own mapper.
 */
const NO_NODE_EVIDENCE: (node: TopologyNode) => string | undefined = () => undefined;

/** The props every case starts from, so a case states only what it changes. */
const BASE_PROPS: MapCanvasProps = {
  topology: TOPOLOGY,
  title: 'FileMap canvas network map',
  zoomLevel: 1,
  onZoomLevelChange: () => undefined,
  viewPreset: 'world',
  onViewPresetChange: () => undefined,
  onSelectNode: () => undefined,
  evidenceRefForNode: NO_NODE_EVIDENCE,
};

/** Renders the lens inside the query cache the evidence drawer reads through. */
function renderLens(overrides: Partial<MapCanvasProps> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MapCanvas {...BASE_PROPS} {...overrides} />
    </QueryClientProvider>,
  );
}

/** The path data of the country shapes: the first path of the map's first group. */
function countryPathsOf(container: HTMLElement): string {
  return container.querySelector('svg > g:first-child > path')?.getAttribute('d') ?? '';
}

/** The lane paths: the second group of the map holds one path per lane whose ends were placed. */
function lanePathsOf(container: HTMLElement): readonly string[] {
  const group = container.querySelectorAll('svg > g')[1];

  return [...(group?.querySelectorAll('path') ?? [])].map(
    (path) => path.getAttribute('d') ?? '',
  );
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

/** Every node of the map, as the focusable groups the drawing renders one of per topology node. */
function nodeMarks(container: HTMLElement): readonly Element[] {
  return [...container.querySelectorAll('svg g[role="button"]')];
}

/** The stroke token the chart tone table gives a competitor slot, read from the table that owns it. */
function strokeOfSlot(slot: CompetitorSlot): string {
  return CHART_TONE_CLASSES[`competitor-${slot}`].stroke;
}

/** The swatch token the chart tone table gives a competitor slot, read the same way. */
function swatchOfSlot(slot: CompetitorSlot): string {
  return CHART_TONE_CLASSES[`competitor-${slot}`].swatch;
}

/** The class in a class list that names a competitor stroke, or `''` where the list holds none. */
function competitorStrokeToken(classList: string): string {
  return classList.split(' ').find((name) => name.startsWith('stroke-competitor')) ?? '';
}

/**
 * The hue each competitor network's marks are stroked in: one entry per network the overlay painted, in
 * the order the payload lists them.
 *
 * The drawing emits one `<g>` per painted network, so the entries line up with the payload's order and a
 * case can say which position each competitor holds. A network's sites all take that network's own slot,
 * so the first mark of a group states the hue of the whole group.
 */
function competitorStrokeTokens(container: HTMLElement): readonly string[] {
  const group = within(container).getByRole('group', {
    name: `${MARKET_INTELLIGENCE_LABEL}: ${MAP_CANVAS_TEXT.competitorGroupSuffix}`,
  });

  return [...group.children].map((networkGroup) =>
    competitorStrokeToken(networkGroup.querySelector('polygon')?.getAttribute('class') ?? ''),
  );
}

/**
 * The swatch token of the legend row printed for one competitor's name.
 *
 * The row is found by the name a reader sees rather than by its position, so the legend is checked
 * against the competitor it describes: a row that kept its neighbour's swatch fails here however the
 * payload was ordered.
 */
function competitorSwatchOf(container: HTMLElement, label: string): string {
  const row = within(container).getByText(label).closest('li');
  const classList = row?.querySelector('[class*="bg-competitor"]')?.getAttribute('class') ?? '';

  return classList.split(' ').find((name) => name.startsWith('bg-competitor')) ?? '';
}

/**
 * The row the lens prints under its drawing as the pin-state key, found by its own caption.
 *
 * The row is located through the sentence a reader sees rather than by its position among the lens's
 * children, so the key is checked as the answer to "which words explain these badges" rather than as a
 * fragment of the markup.
 *
 * @param container The rendered lens.
 * @returns The caption's row.
 */
function pinKeyRowOf(container: HTMLElement): HTMLElement {
  const caption = within(container).getByText(MAP_CANVAS_TEXT.pinKeyLabel);
  const row = caption.parentElement;

  if (row === null) {
    throw new Error('The pin-state key is not printed inside a row.');
  }

  return row;
}

/**
 * The entries of the pin-state key, in the order printed: everything in the caption's row except the
 * caption itself.
 *
 * @param container The rendered lens.
 * @returns One element per state the view carries.
 */
function pinKeyEntriesOf(container: HTMLElement): readonly HTMLElement[] {
  return [...pinKeyRowOf(container).children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.textContent !== MAP_CANVAS_TEXT.pinKeyLabel,
  );
}

/**
 * The icon of one pin-state key entry, found by the word printed beside it.
 *
 * @param container The rendered lens.
 * @param word The state's word, as the key prints it.
 * @returns The element that holds the state's icon.
 */
function pinKeyIconOf(container: HTMLElement, word: string): HTMLElement {
  const entry = pinKeyEntriesOf(container).find(
    (candidate) => (candidate.textContent ?? '').trim() === word,
  );
  const icon = entry?.firstElementChild;

  if (!(icon instanceof HTMLElement)) {
    throw new Error(`The pin-state key prints no icon for "${word}".`);
  }

  return icon;
}

/**
 * The centre of one node's painted mark, read from the mark the drawing put inside its group.
 *
 * A supplier is drawn as a circle, whose `cx` and `cy` are its centre; a material is drawn as a hexagon,
 * whose six vertices average to its centre. The two are compared as rendered values rather than against a
 * written coordinate, so a case can state that two marks do not coincide without fixing the geometry.
 *
 * @param container The rendered lens.
 * @param label The node label the mark belongs to, read from its accessible name.
 * @returns The mark's centre, or `undefined` when no node carries that label.
 */
function markCentreOf(
  container: HTMLElement,
  label: string,
): readonly [number, number] | undefined {
  const group = nodeMarks(container).find((element) =>
    (element.getAttribute('aria-label') ?? '').startsWith(`${label},`),
  );
  const circle = group?.querySelector('circle[r="5"]');

  if (circle !== null && circle !== undefined) {
    return [Number(circle.getAttribute('cx')), Number(circle.getAttribute('cy'))];
  }

  const vertices = (group?.querySelector('polygon')?.getAttribute('points') ?? '')
    .trim()
    .split(/\s+/)
    .filter((pair) => pair !== '')
    .map((pair) => pair.split(',').map(Number));

  if (vertices.length === 0) {
    return undefined;
  }

  const xs = vertices.map(([x]) => x ?? 0);
  const ys = vertices.map(([, y]) => y ?? 0);

  return [
    xs.reduce((total, value) => total + value, 0) / xs.length,
    ys.reduce((total, value) => total + value, 0) / ys.length,
  ];
}

/** One printed name, as the drawing placed it. */
interface PrintedLabelBox {
  /** The run the drawing printed, which carries an ellipsis where it was shortened. */
  readonly text: string;
  /** The box's left edge. */
  readonly x: number;
  /** The box's top edge. */
  readonly y: number;
  /** The estimated width of the printed run. */
  readonly width: number;
  /** The box's height: one type step plus room for its descenders. */
  readonly height: number;
}

/**
 * The box every printed name occupies, read back from the drawing's own text elements.
 *
 * A browser answers this from the rendered text; jsdom has no layout, and the drawing's own rule is that
 * it measures nothing either, so the box is rebuilt from the two facts the drawing does state: the
 * baseline it wrote into the element's `y`, and the module's estimate for the run it printed. Only the
 * names the lens prints in the primary text role are read — a node's own name and a crossing's — so a pin
 * numeral or a caption line cannot be mistaken for one.
 */
function printedLabelsOf(container: HTMLElement): readonly PrintedLabelBox[] {
  return [...container.querySelectorAll('svg text')]
    .filter((text) => (text.getAttribute('class') ?? '').split(' ').includes('fill-text-primary'))
    .map((text) => ({ text: text.lastChild?.textContent ?? '', ...textBoxOf(text) }));
}

/** One box as the drawing placed it, in the drawing's own user units. */
interface CanvasBox {
  /** The box's left edge. */
  readonly x: number;
  /** The box's top edge. */
  readonly y: number;
  /** The box's width. */
  readonly width: number;
  /** The box's height. */
  readonly height: number;
}

/** Whether two boxes cover any of the same space, with no allowance for a gap. */
function boxesOverlap(one: CanvasBox, other: CanvasBox): boolean {
  return (
    one.x < other.x + other.width &&
    other.x < one.x + one.width &&
    one.y < other.y + other.height &&
    other.y < one.y + one.height
  );
}

/**
 * The box one printed run occupies, read from the text element itself.
 *
 * jsdom has no layout and the drawing measures nothing, so the box is rebuilt from the two facts the
 * element states: the baseline it wrote into `y`, and the module's estimate for the run it printed. A run
 * anchored on its middle — a pin numeral — is centred on the `x` it states.
 *
 * @param text The `text` element the drawing emitted.
 * @returns The box the run occupies.
 */
function textBoxOf(text: Element): CanvasBox {
  const drawn = text.lastChild?.textContent ?? '';
  const width = estimateTextWidth(drawn);
  const centred = text.getAttribute('text-anchor') === 'middle';

  return {
    x: centred ? Number(text.getAttribute('x')) - width / 2 : Number(text.getAttribute('x')),
    y: Number(text.getAttribute('y')) - SVG_LABEL_FONT_SIZE,
    width,
    height: SVG_LABEL_FONT_SIZE + 3,
  };
}

/**
 * The box a node's badge row occupies, read back from the chips the drawing put in its row group.
 *
 * The row is one `aria-hidden` group of one rect per state the node carries a pin in, so the box is the
 * union of those rects: the first chip's corner to the last chip's far edge.
 *
 * @param group The node's own group.
 * @returns The row's box, or `undefined` when the node carries no badge.
 */
function badgeRowBoxOf(group: Element): CanvasBox | undefined {
  const rects = [...group.querySelectorAll('g[aria-hidden="true"] rect')];

  if (rects.length === 0) {
    return undefined;
  }

  const left = Math.min(...rects.map((rect) => Number(rect.getAttribute('x'))));
  const top = Math.min(...rects.map((rect) => Number(rect.getAttribute('y'))));
  const right = Math.max(
    ...rects.map((rect) => Number(rect.getAttribute('x')) + Number(rect.getAttribute('width'))),
  );
  const bottom = Math.max(
    ...rects.map((rect) => Number(rect.getAttribute('y')) + Number(rect.getAttribute('height'))),
  );

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** The drawing's own coordinate box, read from the `viewBox` the element states. */
function canvasBoundsOf(container: HTMLElement): { readonly width: number; readonly height: number } {
  const [width = '0', height = '0'] = (container.querySelector('svg')?.getAttribute('viewBox') ?? '')
    .split(' ')
    .slice(2);

  return { width: Number(width), height: Number(height) };
}

/**
 * The map's own SVG element, which is the surface a reader drags and the region the arrow keys pan.
 *
 * @param container The rendered lens.
 * @returns The surface.
 */
function mapSurfaceOf(container: HTMLElement): SVGSVGElement {
  const surface = container.querySelector<SVGSVGElement>('svg');

  expect(surface).not.toBeNull();

  return surface as SVGSVGElement;
}

/**
 * The view box the drawing states, as its four numbers: the origin it shows and the box's own size.
 *
 * Reading it rather than assuming it is what lets a case say the frame moved without fixing the amount a
 * drag or a key press is meant to move it by.
 *
 * @param container The rendered lens.
 * @returns The origin x, the origin y, the width and the height.
 */
function viewBoxOf(container: HTMLElement): readonly [number, number, number, number] {
  const stated = (mapSurfaceOf(container).getAttribute('viewBox') ?? '')
    .trim()
    .split(/\s+/)
    .map(Number);

  return [stated[0] ?? 0, stated[1] ?? 0, stated[2] ?? 0, stated[3] ?? 0];
}

/**
 * The centre of a polygon, taken from its own vertices.
 *
 * @param polygon The polygon to read.
 * @returns The average of its vertices, or `undefined` when it states none.
 */
function polygonCentreOf(polygon: Element): readonly [number, number] | undefined {
  const vertices = (polygon.getAttribute('points') ?? '')
    .trim()
    .split(/\s+/)
    .filter((pair) => pair !== '')
    .map((pair) => pair.split(',').map(Number));

  if (vertices.length === 0) {
    return undefined;
  }

  const xs = vertices.map(([x]) => x ?? 0);
  const ys = vertices.map(([, y]) => y ?? 0);

  return [
    xs.reduce((total, value) => total + value, 0) / xs.length,
    ys.reduce((total, value) => total + value, 0) / ys.length,
  ];
}

/**
 * The centre of the marker a node's group paints, whichever of the five shapes it is.
 *
 * A supplier is a circle and its centre is its own `cx` and `cy`; a plant is a square, read from its own
 * corner; the other three families are polygons whose vertices average to their centre. The reading is
 * the rendered attribute rather than a written coordinate, so a case can assert where the drawing put a
 * mark without fixing the projection.
 *
 * @param group The node's control.
 * @returns The mark's centre, or `undefined` when the group holds no marker.
 */
function markCentreIn(group: Element): readonly [number, number] | undefined {
  const circle = group.querySelector('circle[r="5"]');

  if (circle !== null) {
    return [Number(circle.getAttribute('cx')), Number(circle.getAttribute('cy'))];
  }

  const square = group.querySelector('rect[width="10"]');

  if (square !== null) {
    return [Number(square.getAttribute('x')) + 5, Number(square.getAttribute('y')) + 5];
  }

  const polygon = group.querySelector('polygon');

  return polygon === null ? undefined : polygonCentreOf(polygon);
}

/**
 * The centre of every node the drawing painted, in the order the drawing paints them.
 *
 * @param container The rendered lens.
 * @returns One centre per painted node.
 */
function markCentresOf(container: HTMLElement): readonly (readonly [number, number])[] {
  return nodeMarks(container)
    .map((group) => markCentreIn(group))
    .filter((centre): centre is readonly [number, number] => centre !== undefined);
}

/**
 * Every mark the drawing paints outside the frame it states.
 *
 * The frame is the view box the surface draws through, so a mark whose own centre lies outside it is a
 * mark a reader can neither see nor select on screen. Both values are read from the drawing rather than
 * compared against a written coordinate, which is what lets a case state the framing rule without
 * fixing the projection behind it.
 *
 * @param container The rendered lens.
 * @returns One centre per mark drawn outside the frame.
 */
function marksOutside(container: HTMLElement): readonly (readonly [number, number])[] {
  const [originX, originY, width, height] = viewBoxOf(container);

  return markCentresOf(container).filter(
    ([x, y]) => x < originX || x > originX + width || y < originY || y > originY + height,
  );
}

/**
 * How far outside the frame a mark's centre lies, in view-box units: zero when it is inside.
 *
 * A case that reveals a mark drawn past the edge takes the one nearest that edge, because a mark on the
 * far side of the world may lie beyond the distance the frame's range allows at a closer level, and what
 * such a case is about is the reveal itself.
 *
 * @param centre The mark's projected centre.
 * @param box The frame, as its origin x, origin y, width and height.
 * @returns The distance from the mark to the nearest point of the frame.
 */
function distanceOutside(
  centre: readonly [number, number],
  box: readonly [number, number, number, number],
): number {
  const [x, y] = centre;
  const [originX, originY, width, height] = box;
  const across = Math.max(0, originX - x, x - (originX + width));
  const down = Math.max(0, originY - y, y - (originY + height));

  return Math.hypot(across, down);
}

/**
 * The mean of a set of mark centres, which is where the network's own centre of mass is drawn.
 *
 * @param centres The centres to average.
 * @returns The average x and y, or the frame's own corners when nothing was given.
 */
function meanCentreOf(
  centres: readonly (readonly [number, number])[],
): readonly [number, number] {
  let totalX = 0;
  let totalY = 0;

  for (const [x, y] of centres) {
    totalX += x;
    totalY += y;
  }

  return centres.length === 0 ? [0, 0] : [totalX / centres.length, totalY / centres.length];
}

/**
 * The centre of every mark the atlas overlay painted: a competitor site's hollow diamond, and a
 * chokepoint's halo.
 *
 * @param container The rendered lens.
 * @returns One centre per painted overlay mark.
 */
function overlayMarkCentresOf(container: HTMLElement): readonly (readonly [number, number])[] {
  const sites = [...container.querySelectorAll('svg polygon[class*="stroke-competitor"]')]
    .map((mark) => polygonCentreOf(mark))
    .filter((centre): centre is readonly [number, number] => centre !== undefined);
  const halos = [...container.querySelectorAll('svg circle[stroke-dasharray]')].map(
    (halo): readonly [number, number] => [
      Number(halo.getAttribute('cx')),
      Number(halo.getAttribute('cy')),
    ],
  );

  return [...sites, ...halos];
}

/**
 * Drags the map's surface with pointer events, the way a browser reports a real drag: a press, one move
 * and a release, all on the surface that captured the pointer.
 *
 * @param container The rendered lens.
 * @param across How far the pointer travels horizontally, in client pixels.
 * @param down How far it travels vertically, in client pixels.
 */
function dragSurface(container: HTMLElement, across: number, down: number): void {
  const surface = mapSurfaceOf(container);
  const startX = 100;
  const startY = 100;

  fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: startX, clientY: startY });
  fireEvent.pointerMove(surface, {
    pointerId: 1,
    clientX: startX + across,
    clientY: startY + down,
  });
  fireEvent.pointerUp(surface, {
    pointerId: 1,
    clientX: startX + across,
    clientY: startY + down,
  });
}

/** The pattern the caption naming the selection is found by, so a case can assert it is absent. */
const SELECTION_CAPTION = new RegExp(`^${MAP_CANVAS_TEXT.selectedCaption} `, 'u');

describe('MapCanvas', () => {
  it('draws the bundled boundaries without asking any origin for them', () => {
    const requested = vi.spyOn(globalThis, 'fetch');
    const { container } = renderLens();

    const paths = countryPathsOf(container);

    expect(paths.length).toBeGreaterThan(1000);
    expect(paths.startsWith('M')).toBe(true);
    expect(requested).not.toHaveBeenCalled();
    requested.mockRestore();
  });

  it('links nothing outside the document and embeds no foreign image', () => {
    const { container } = renderLens({ overlay: ATLAS });

    /* Every graphic in the lens is drawn inline: no element addresses anything at all. */
    const addresses = [...container.querySelectorAll('[href], [xlink\\:href], [src], [srcset]')].map(
      (element) =>
        element.getAttribute('href') ??
        element.getAttribute('xlink:href') ??
        element.getAttribute('src') ??
        element.getAttribute('srcset') ??
        '',
    );

    expect(addresses.filter((address) => address.trim() !== '')).toStrictEqual([]);
    /* And nothing that could load a resource on its own: no raster, no sprite reference, no frame. */
    expect(container.querySelectorAll('img, image, use, iframe, object, embed')).toHaveLength(0);
  });

  it('draws one arc per lane whose two endpoints the projection places', () => {
    const { container } = renderLens();

    const lanes = lanePathsOf(container);

    expect(lanes).toHaveLength(TOPOLOGY.lanes.length);
    for (const lane of lanes) {
      expect(lane.startsWith('M')).toBe(true);
    }
  });

  it('moves the projection at each of the three zoom levels', () => {
    const atOne = countryPathsOf(renderLens({ zoomLevel: 1 }).container);
    const atTwo = countryPathsOf(renderLens({ zoomLevel: 2 }).container);
    const atThree = countryPathsOf(renderLens({ zoomLevel: 3 }).container);

    expect(atOne).not.toBe(atTwo);
    expect(atTwo).not.toBe(atThree);
    expect(atOne).not.toBe(atThree);
  });

  it('offers the five presets, frames the region each names and reports the one chosen', async () => {
    const user = userEvent.setup();
    const chosen: string[] = [];
    const { container } = renderLens({
      onViewPresetChange: (preset) => {
        chosen.push(preset);
      },
    });

    const group = screen.getByRole('group', { name: MAP_CANVAS_TEXT.presetGroupLabel });

    expect(within(group).getAllByRole('button')).toHaveLength(MAP_VIEW_PRESETS.length);

    const worldPaths = countryPathsOf(container);

    for (const preset of MAP_VIEW_PRESETS) {
      await user.click(within(group).getByRole('button', { name: MAP_VIEW_PRESET_LABELS[preset] }));
    }

    expect(chosen).toStrictEqual([...MAP_VIEW_PRESETS]);

    /* Every preset other than the world view frames a region of its own, so its path differs. */
    for (const preset of MAP_VIEW_PRESETS) {
      if (preset === 'world') {
        continue;
      }

      expect(countryPathsOf(renderLens({ viewPreset: preset }).container)).not.toBe(worldPaths);
    }

    expect(worldPaths.length).toBeGreaterThan(1000);
  });

  it('draws every node of the payload, whichever family it belongs to', () => {
    const { container } = renderLens();

    const nodes = nodeMarks(container);

    expect(nodes).toHaveLength(NODE_COUNT);

    const labels = [
      ...TOPOLOGY.plants,
      ...TOPOLOGY.suppliers,
      ...TOPOLOGY.materials,
      ...TOPOLOGY.origins,
      ...TOPOLOGY.customers,
    ].map((node) => node.label);

    for (const label of labels) {
      const named = nodes.some((node) => (node.getAttribute('aria-label') ?? '').startsWith(`${label},`));

      expect(named).toBe(true);
    }
  });

  it('draws a material off its supplier’s site, so two marks never coincide', () => {
    const { container } = renderLens();

    const supplier = markCentreOf(container, 'Rheinstern Elektronik');
    const material = markCentreOf(container, 'Rolled sheet steel');

    expect(supplier).toBeDefined();
    expect(material).toBeDefined();
    /* A material carries its supplier's site coordinates, so the drawing is what separates the two
       marks; the offset is fixed geometry, and a second render draws it at the same point. */
    expect(material).not.toEqual(supplier);
    expect(markCentreOf(renderLens().container, 'Rolled sheet steel')).toEqual(material);
  });

  it('names every node with its label, its family and the pin counts per state', () => {
    renderLens();

    const supplier = screen.getByRole('button', { name: /Rheinstern Elektronik/ });

    expect(supplier).toHaveAttribute('tabindex', '0');
    expect(supplier).toHaveAccessibleName(
      'Rheinstern Elektronik, Supplier. Evidence pins: 1 failed, 2 passed.',
    );
    expect(
      screen.getByRole('button', { name: /Bajio metals origin/ }),
    ).toHaveAccessibleName('Bajio metals origin, Tier-2 origin. No evidence pins.');
    /* The remaining states reach a reader through the same name, in the lens's own fixed order. */
    expect(
      screen.getByRole('button', { name: /Kansai alloys origin/ }),
    ).toHaveAccessibleName(
      'Kansai alloys origin, Tier-2 origin. Evidence pins: 1 awaiting review, 2 needing review, 1 with no record.',
    );
    /* A material prints no place label — it stands at the site it ships from — so its name, its family
       and its pins reach a reader through the accessible name and the table view alone. */
    expect(
      screen.getByRole('button', { name: /Rolled sheet steel/ }),
    ).toHaveAccessibleName('Rolled sheet steel, Material. No evidence pins.');
  });

  it('places a dense cluster’s names so that no two of them cover each other', () => {
    const { container } = renderLens({ topology: CLUSTERED_TOPOLOGY, overlay: ATLAS });
    const labels = printedLabelsOf(container);

    /* Seven of the fixture's parties print a name — a material prints none — and the overlay's one
       crossing prints its own above them, so this only holds for a placement that seats them all. */
    expect(labels.length).toBe(CLUSTERED_TOPOLOGY.plants.length + CLUSTERED_TOPOLOGY.suppliers.length + CLUSTERED_TOPOLOGY.origins.length + CLUSTERED_TOPOLOGY.customers.length + ATLAS.chokepoints.length);

    for (const [index, one] of labels.entries()) {
      for (const other of labels.slice(index + 1)) {
        expect(boxesOverlap(one, other)).toBe(false);
      }
    }
  });

  it('prints no name outside the drawing it belongs to', () => {
    const { container } = renderLens({ topology: CLUSTERED_TOPOLOGY, overlay: ATLAS });
    const bounds = canvasBoundsOf(container);

    expect(bounds.width).toBeGreaterThan(0);

    for (const label of printedLabelsOf(container)) {
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.y).toBeGreaterThanOrEqual(0);
      expect(label.x + label.width).toBeLessThanOrEqual(bounds.width);
      expect(label.y + label.height).toBeLessThanOrEqual(bounds.height);
    }
  });

  it('shortens a name the drawing cannot hold and keeps the whole of it in the title', () => {
    const { container } = renderLens({ topology: CLUSTERED_TOPOLOGY });
    const shortened = [...container.querySelectorAll('svg text')].filter((text) =>
      (text.lastChild?.textContent ?? '').endsWith('…'),
    );

    expect(shortened.length).toBeGreaterThan(0);

    const [first] = shortened;

    expect(first?.querySelector('title')?.textContent).toBe(OVERLONG_NAME);
    /* The mark keeps the record's own name whatever the printed run became. */
    expect(
      screen.getByRole('button', { name: new RegExp(OVERLONG_NAME.slice(0, 24)) }),
    ).toBeInTheDocument();
  });

  it('prints a shortened name for every place in a crowded cluster rather than leaving one unnamed', () => {
    const { container } = renderLens({ topology: CROWDED_TOPOLOGY, overlay: ATLAS });
    const places = [...CROWDED_TOPOLOGY.plants, ...CROWDED_TOPOLOGY.suppliers];
    const printed = printedLabelsOf(container);

    /* Every place and the overlay's crossing keep a printed run: nothing is dropped for want of room. */
    expect(printed).toHaveLength(places.length + ATLAS.chokepoints.length);

    const shortened = [...container.querySelectorAll('svg text')].filter((text) =>
      (text.lastChild?.textContent ?? '').endsWith('…'),
    );

    /* The drawing prints a run narrower than the record's name, so it cuts the name rather than the place. */
    expect(shortened.length).toBeGreaterThan(0);

    for (const text of shortened) {
      const run = text.lastChild?.textContent ?? '';
      const whole = text.querySelector('title')?.textContent ?? '';

      expect(whole.length).toBeGreaterThan(run.length);
      /* The mark keeps the record's own name whatever the printed run became. */
      expect(
        screen.getAllByRole('button', { name: new RegExp(whole.slice(0, 20)) }).length,
      ).toBeGreaterThan(0);
    }

    for (const [index, one] of printed.entries()) {
      for (const other of printed.slice(index + 1)) {
        expect(boxesOverlap(one, other)).toBe(false);
      }
    }
  });

  it('puts each badge row beside its neighbour’s, so two co-located nodes’ digits cannot overlap', () => {
    const { container } = renderLens({ topology: COINCIDENT_TOPOLOGY });
    const groups = nodeMarks(container);
    const rows = groups
      .map((group) => badgeRowBoxOf(group))
      .filter((row): row is CanvasBox => row !== undefined);
    const [first, second] = rows;

    /* Both places are drawn on one point, and both keep every badge they carry. */
    expect(groups).toHaveLength(COINCIDENT_TOPOLOGY.plants.length);
    expect(rows).toHaveLength(COINCIDENT_TOPOLOGY.plants.length);
    expect(
      within(screen.getByRole('button', { name: /Regensburg plant/ })).getByText('1'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('button', { name: /Coburg plant/ })).getByText('2'),
    ).toBeInTheDocument();

    if (first === undefined || second === undefined) {
      throw new Error('one of the co-located nodes printed no badge row');
    }

    /* The second row stepped off the first, so neither node's numerals sit on the other's. */
    expect(boxesOverlap(first, second)).toBe(false);
  });

  it('prints the market-intelligence caption clear of the crossing’s own name', () => {
    const { container } = renderLens({ overlay: ATLAS });
    const texts = [...container.querySelectorAll('svg text')];
    const name = texts.find((text) => (text.lastChild?.textContent ?? '') === CROSSING.label);
    const caption = texts.find(
      (text) => (text.lastChild?.textContent ?? '') === MARKET_INTELLIGENCE_LABEL,
    );

    if (name === undefined || caption === undefined) {
      throw new Error('the crossing did not print both of its lines');
    }

    /* One placed block of two lines: the caption sits below the name, and the two boxes never touch. */
    expect(Number(caption.getAttribute('y'))).toBeGreaterThan(Number(name.getAttribute('y')));
    expect(boxesOverlap(textBoxOf(name), textBoxOf(caption))).toBe(false);
  });

  it('draws the same names in the same places for the same topology', () => {
    const first = printedLabelsOf(renderLens({ topology: CLUSTERED_TOPOLOGY }).container);
    const second = printedLabelsOf(renderLens({ topology: CLUSTERED_TOPOLOGY }).container);

    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });

  it('prints a badge for each state a node carries a pin in', () => {
    renderLens();

    const supplier = screen.getByRole('button', { name: /Rheinstern Elektronik/ });

    /* The badges are numerals of the payload's own counts, one per state present: 1 failed, 2 passed. */
    expect(within(supplier).getByText('1')).toBeInTheDocument();
    expect(within(supplier).getByText('2')).toBeInTheDocument();
  });

  it('rounds a pin badge from the control radius token, not a literal radius', () => {
    renderLens();

    const supplier = screen.getByRole('button', { name: /Rheinstern Elektronik/ });
    const badges = [...supplier.querySelectorAll('rect')].filter((rect) =>
      rect.classList.contains(CONTROL_RADIUS_CLASSES),
    );

    /* Two states are present on this node, so two badges are drawn and neither carries a literal radius. */
    expect(badges).toHaveLength(2);

    for (const badge of badges) {
      expect(badge).not.toHaveAttribute('rx');
    }
  });

  it('prints a key under the drawing that names each pin state the view carries', () => {
    const { container } = renderLens();

    const row = pinKeyRowOf(container);
    const entries = pinKeyEntriesOf(container);

    /* Every state this payload carries reaches the key, in the order the summaries count them. */
    expect(entries.map((entry) => (entry.textContent ?? '').trim())).toEqual([
      'failed',
      'stale',
      'awaiting review',
      'needing review',
      'passed',
      'with no record',
    ]);

    /* Each word stands beside its own icon, so no state is named by a colour alone (rule B-3). */
    for (const entry of entries) {
      expect(entry.querySelector('svg')).not.toBeNull();
    }

    /* The key states none of the counts: the payload's numerals stay on the badges (rule P-6). */
    expect(row.textContent).not.toMatch(/[0-9]/u);

    /* It is printed under the drawing whose badges it explains. */
    const drawing = container.querySelector('svg[role="group"]');

    if (drawing === null) {
      throw new Error('The lens drew no map to print the key under.');
    }

    expect(row.compareDocumentPosition(drawing) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('separates the two states that share the warning role with their icons', () => {
    const { container } = renderLens();

    const stale = pinKeyIconOf(container, 'stale');
    const pending = pinKeyIconOf(container, 'awaiting review');

    /* Both take the warning role the contracts fix, so the two read in one hue. */
    expect(stale.classList.contains(MEANING_COLOUR_CLASSES.warning)).toBe(true);
    expect(pending.classList.contains(MEANING_COLOUR_CLASSES.warning)).toBe(true);

    /* The clock beside "awaiting review" is then what tells it apart from "stale" (rule B-3). */
    expect(pending.innerHTML).not.toBe(stale.innerHTML);
    expect(pending.querySelector('svg')).not.toBeNull();
  });

  it('places the key above the competitor legend the overlay contributes', () => {
    const { container } = renderLens({ overlay: ATLAS });

    const row = pinKeyRowOf(container);
    const legend = within(container).getByRole('list');

    expect(row.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each(EMPTY_PIN_MAPS)('draws no pin-state key for %s', (_case, pinsByNode) => {
    renderLens({ topology: { ...TOPOLOGY, pinsByNode } });

    /* A caption over an empty row would name states the view does not carry. */
    expect(screen.queryByText(MAP_CANVAS_TEXT.pinKeyLabel)).not.toBeInTheDocument();
  });

  it('reports the selection and opens the evidence the mapper resolves for the node', async () => {
    const user = userEvent.setup();
    const selected: string[] = [];
    renderLens({
      onSelectNode: (nodeId) => {
        selected.push(nodeId);
      },
      evidenceRefForNode: (node) => `evidence-for-${node.id}`,
    });

    const supplier = screen.getByRole('button', { name: /Rheinstern Elektronik/ });

    expect(supplier).toHaveAttribute('aria-haspopup', 'dialog');

    await user.click(supplier);

    expect(selected).toStrictEqual(['node-supplier']);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('activates a node from the keyboard with Enter and with Space, opening its evidence', async () => {
    const user = userEvent.setup();
    const selected: string[] = [];
    renderLens({
      onSelectNode: (nodeId) => {
        selected.push(nodeId);
      },
      evidenceRefForNode: (node) => `evidence-for-${node.id}`,
    });

    const plant = screen.getByRole('button', { name: /Regensburg plant/ });

    plant.focus();
    expect(document.activeElement).toBe(plant);

    await user.keyboard('{Enter}');

    expect(selected).toStrictEqual(['node-plant']);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    /* The second key reports the selection again and leaves the same evidence open behind it. */
    plant.focus();
    await user.keyboard(' ');

    expect(selected).toStrictEqual(['node-plant', 'node-plant']);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('opens nothing for a node the mapper resolves no record for, and declares no drawer', async () => {
    const user = userEvent.setup();
    renderLens({ evidenceRefForNode: NO_NODE_EVIDENCE });

    const plant = screen.getByRole('button', { name: /Regensburg plant/ });

    expect(plant).not.toHaveAttribute('aria-haspopup');

    await user.click(plant);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('decides per node: only the node the mapper resolves declares and opens evidence', async () => {
    const user = userEvent.setup();
    renderLens({
      evidenceRefForNode: (node) => (node.id === 'node-plant' ? 'evidence-for-plant' : undefined),
    });

    const plant = screen.getByRole('button', { name: /Regensburg plant/ });
    const supplier = screen.getByRole('button', { name: /Rheinstern Elektronik/ });

    expect(plant).toHaveAttribute('aria-haspopup', 'dialog');
    expect(supplier).not.toHaveAttribute('aria-haspopup');

    await user.click(supplier);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(plant);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('rings the node the screen holds as selected', () => {
    const unselected = renderLens().container;
    const selected = renderLens({ selectedNodeId: 'node-plant' }).container;

    const ringCount = (container: HTMLElement): number =>
      [...container.querySelectorAll('svg circle')].filter((circle) =>
        (circle.getAttribute('class') ?? '').includes('stroke-focus-ring'),
      ).length;

    expect(ringCount(selected)).toBeGreaterThan(ringCount(unselected));
  });

  it('answers the pointer on every node, over the ring the keyboard reveals', () => {
    const { container } = renderLens();

    const nodes = nodeMarks(container);

    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      /* The group marker the pointer ring's variants hang on. */
      expect(node.getAttribute('class')).toContain('group');

      /* The pointer ring is the node's one element painted in the accent role as a stroke. */
      const pointerRing = node.querySelector('.stroke-accent');
      const ringClasses = pointerRing?.getAttribute('class') ?? '';
      const states = pointerStates(ringClasses);

      expect(pointerRing).not.toBeNull();
      expect(states.some((utility) => utility.startsWith('group-hover:'))).toBe(true);
      expect(states.some((utility) => utility.startsWith('group-active:'))).toBe(true);
      for (const utility of states) {
        /* Every state names a role-token property: no palette literal, no arbitrary value, no shadow. */
        expect(utility.slice(utility.lastIndexOf(':') + 1)).toMatch(/^(fill|stroke|opacity)-[a-z0-9]/u);
        expect(utility).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|\[.+\]/iu);
        expect(utility).not.toContain('shadow');
      }
      expect(ringClasses).toContain('motion-safe:transition-opacity');

      /* The keyboard's own ring is still drawn, in the focus-ring role, on the mark it belongs to. */
      const focusRing = [...node.querySelectorAll('circle')].some((circle) => {
        const classes = circle.getAttribute('class') ?? '';

        return classes.includes('stroke-focus-ring') && classes.includes('group-focus-visible:opacity-100');
      });

      expect(focusRing).toBe(true);
    }
  });

  it('stops the zoom controls at the ends of the range with the reason stated', () => {
    const { unmount } = renderLens({ zoomLevel: 3 });

    expect(screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomInLabel })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText(MAP_CANVAS_TEXT.zoomAtClosestReason)).toBeInTheDocument();
    unmount();

    renderLens({ zoomLevel: 1 });

    expect(screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomOutLabel })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText(MAP_CANVAS_TEXT.zoomAtWidestReason)).toBeInTheDocument();
  });

  it('reports the level each zoom control asks for without drawing it', async () => {
    const user = userEvent.setup();
    const levels: string[] = [];
    const { container } = renderLens({
      zoomLevel: 2,
      onZoomLevelChange: (level) => {
        levels.push(String(level));
      },
    });

    const drawn = countryPathsOf(container);

    await user.click(screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomInLabel }));
    await user.click(screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomOutLabel }));

    expect(levels).toStrictEqual(['3', '1']);
    /* The level is the screen's to hold: a control reports the step and leaves the drawing where it was. */
    expect(countryPathsOf(container)).toBe(drawn);
  });

  it('renders its controls as native buttons a keyboard reaches in order', async () => {
    const user = userEvent.setup();
    renderLens();

    const controls = [
      screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomOutLabel }),
      screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomInLabel }),
      ...MAP_VIEW_PRESETS.map((preset) =>
        screen.getByRole('button', { name: MAP_VIEW_PRESET_LABELS[preset] }),
      ),
    ];

    for (const control of controls) {
      expect(control.tagName).toBe('BUTTON');
      expect(control).toHaveAccessibleName();
    }

    /* The node marks carry the button role on their SVG groups; the controls beside them are native. */
    for (const name of [MAP_CANVAS_TEXT.zoomGroupLabel, MAP_CANVAS_TEXT.presetGroupLabel]) {
      const group = screen.getByRole('group', { name });

      expect(group.querySelectorAll('[role="button"]:not(button)')).toHaveLength(0);
      expect(
        within(group).getAllByRole('button').every((control) => control.tagName === 'BUTTON'),
      ).toBe(true);
    }

    /* Every control is a keyboard stop, reached by Tab alone and in the order it is drawn in. */
    const reached: Element[] = [];

    for (let step = 0; step < CONTROL_COUNT; step += 1) {
      await user.tab();

      if (document.activeElement !== null) {
        reached.push(document.activeElement);
      }
    }

    expect(reached).toStrictEqual(controls);
  });

  it('draws no competitor element at all until the atlas payload arrives', () => {
    const { container } = renderLens();

    expect(screen.queryByText(MARKET_INTELLIGENCE_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(CROSSING.label)).not.toBeInTheDocument();
    /* Neither group the overlay contributes exists, and no competitor mark or halo is in the document. */
    expect(
      screen.queryByRole('group', { name: new RegExp(MARKET_INTELLIGENCE_LABEL, 'u') }),
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll('[class*="stroke-competitor"], circle[stroke-dasharray]'),
    ).toHaveLength(0);
  });

  it('draws the competitor marks, the halos and a legend when the atlas payload arrives', () => {
    const { container } = renderLens({ overlay: ATLAS });

    expect(container.querySelectorAll('[class*="stroke-competitor"]').length).toBeGreaterThan(0);

    /* The marks are named as market intelligence, and every halo prints the imported label itself. */
    expect(
      screen.getByRole('group', {
        name: `${MARKET_INTELLIGENCE_LABEL}: ${MAP_CANVAS_TEXT.competitorGroupSuffix}`,
      }),
    ).toBeInTheDocument();

    const halos = screen.getByRole('group', { name: MARKET_INTELLIGENCE_LABEL });

    expect(within(halos).getAllByText(MARKET_INTELLIGENCE_LABEL)).toHaveLength(
      ATLAS.chokepoints.length,
    );
    expect(within(halos).getByText(CROSSING.label)).toBeInTheDocument();
    /* The legend's own row adds the competitor name tag the shared legend owns. */
    expect(screen.getByText('Aurelvik Drive Systems')).toBeInTheDocument();
  });

  it('paints each competitor in the hue its own identifier names, whatever order the payload lists them', () => {
    const forward = renderLens({
      overlay: overlayOf([NETWORK_FIRST, NETWORK_SECOND, NETWORK_THIRD]),
    });
    const reversed = renderLens({
      overlay: overlayOf([NETWORK_THIRD, NETWORK_SECOND, NETWORK_FIRST]),
    });

    /* One mark group per painted network, in the payload's order: the reversed payload is the same three
       competitors read backwards. A hue taken from a position swaps every mark with its neighbour here,
       while a hue taken from the identifier keeps each competitor in the colour its own record names. */
    expect(competitorStrokeTokens(forward.container)).toStrictEqual([
      strokeOfSlot(1),
      strokeOfSlot(2),
      strokeOfSlot(3),
    ]);
    expect(competitorStrokeTokens(reversed.container)).toStrictEqual([
      strokeOfSlot(3),
      strokeOfSlot(2),
      strokeOfSlot(1),
    ]);

    /* The legend row names its competitor, so its swatch is bound to that name and not to a position:
       neither ordering moves a swatch to another competitor. */
    for (const [network, slot] of [
      [NETWORK_FIRST, 1],
      [NETWORK_SECOND, 2],
      [NETWORK_THIRD, 3],
    ] as const) {
      expect(competitorSwatchOf(forward.container, network.label)).toBe(swatchOfSlot(slot));
      expect(competitorSwatchOf(reversed.container, network.label)).toBe(swatchOfSlot(slot));
    }
  });

  it('places a halo at the crossing’s own position when the payload states one', () => {
    const placed = { ...CROSSING, latitude: 30.5, longitude: 32.5 } as Chokepoint;
    const { container } = renderLens({
      overlay: { ...ATLAS, chokepoints: [placed] },
    });

    const halo = container.querySelector('svg circle[stroke-dasharray]');

    expect(halo).not.toBeNull();
    expect(halo?.getAttribute('cx')).toBeDefined();
  });

  it('keeps every drawn mark inside the frame at the widest zoom level on all five presets', () => {
    for (const preset of MAP_VIEW_PRESETS) {
      const { container, unmount } = renderLens({
        topology: SPREAD_TOPOLOGY,
        overlay: ATLAS,
        viewPreset: preset,
        zoomLevel: 1,
      });

      const [originX, originY, width, height] = viewBoxOf(container);
      const centres = [...markCentresOf(container), ...overlayMarkCentresOf(container)];

      /* Every node of the payload is drawn — a preset that dropped one would be reported as a count
         instead of as a coordinate. */
      expect(markCentresOf(container)).toHaveLength(SPREAD_NODE_COUNT);

      for (const [x, y] of centres) {
        expect(x).toBeGreaterThanOrEqual(originX + FRAME_INSET_MINIMUM);
        expect(x).toBeLessThanOrEqual(originX + width - FRAME_INSET_MINIMUM);
        expect(y).toBeGreaterThanOrEqual(originY + FRAME_INSET_MINIMUM);
        expect(y).toBeLessThanOrEqual(originY + height - FRAME_INSET_MINIMUM);
      }

      unmount();
    }
  });

  it('magnifies the fitted frame about the point its marks project to, carrying the outermost of them out of it', () => {
    for (const preset of MAP_VIEW_PRESETS) {
      const close = renderLens({
        topology: SPREAD_TOPOLOGY,
        viewPreset: preset,
        zoomLevel: 3,
      }).container;

      /* A closer level draws the same marks larger about the network's own centre, so the outermost of
         them leave the frame — which is what the pan exists to bring back. */
      expect(marksOutside(close).length).toBeGreaterThan(0);
    }
  });

  it('keeps the network inside the frame at every zoom level on all five presets', () => {
    for (const preset of MAP_VIEW_PRESETS) {
      for (const zoomLevel of [1, 2, 3] as const) {
        const container = renderLens({
          topology: CLUSTER_TOPOLOGY,
          viewPreset: preset,
          zoomLevel,
        }).container;

        expect(markCentresOf(container)).toHaveLength(CLUSTER_NODE_COUNT);

        if (zoomLevel === 1) {
          /* The widest level is the frame the fit produced, so nothing the payload draws is outside it. */
          expect(marksOutside(container)).toStrictEqual([]);
          continue;
        }

        /* A closer level may magnify past the frame's edges, but it never shows an empty map: the cluster
           the network is made of stays in the drawing, and only the outliers leave it. */
        const inside = CLUSTER_NODE_COUNT - marksOutside(container).length;

        expect(inside).toBeGreaterThan(0);
        expect(inside).toBeGreaterThanOrEqual(
          Math.ceil(CLOSER_LEVEL_MARK_SHARE[zoomLevel] * CLUSTER_NODE_COUNT),
        );
      }
    }
  });

  it('magnifies about the marks’ own centre of mass rather than the middle of the box they were fitted into', () => {
    for (const preset of MAP_VIEW_PRESETS) {
      const wide = renderLens({
        topology: CLUSTER_TOPOLOGY,
        viewPreset: preset,
        zoomLevel: 1,
      }).container;
      const close = renderLens({
        topology: CLUSTER_TOPOLOGY,
        viewPreset: preset,
        zoomLevel: 3,
      }).container;

      const [originX, originY, width, height] = viewBoxOf(wide);
      const middle: readonly [number, number] = [originX + width / 2, originY + height / 2];
      const wideMean = meanCentreOf(markCentresOf(wide));
      const closeMean = meanCentreOf(markCentresOf(close));

      /* The marks' mean point is the anchor the level magnifies about, so it does not travel with the
         magnification: it is still drawn where it was, within the orbit a material is drawn at — fixed
         geometry that does not scale — and the one-unit rounding of a drawn coordinate. */
      expect(Math.abs(closeMean[0] - wideMean[0])).toBeLessThanOrEqual(CENTROID_TOLERANCE);
      expect(Math.abs(closeMean[1] - wideMean[1])).toBeLessThanOrEqual(CENTROID_TOLERANCE);

      /* And that anchor is the network's own centre, not the middle of the frame: this payload's cluster
         is nowhere near it, so an anchor at the frame's middle would have carried the mean away by more
         than the room granted above. */
      expect(
        Math.hypot(wideMean[0] - middle[0], wideMean[1] - middle[1]),
      ).toBeGreaterThan(CENTROID_TOLERANCE);
    }
  });

  it('widens the pan with the zoom level, so the magnified network can be traversed', () => {
    /**
     * The frame after one arrow key has been pressed past the end of its range, with the indices of the
     * marks it draws inside its own view box.
     */
    const pannedToRangeEnd = (zoomLevel: MapZoomLevel, key: string) => {
      const { container, unmount } = renderLens({ topology: CLUSTER_TOPOLOGY, zoomLevel });
      const surface = mapSurfaceOf(container);

      for (let press = 0; press < PAN_REACH_PRESSES; press += 1) {
        fireEvent.keyDown(surface, { key });
      }

      const [originX, originY, width, height] = viewBoxOf(container);
      const inside = markCentresOf(container)
        .map(([x, y], index) =>
          x >= originX && x <= originX + width && y >= originY && y <= originY + height
            ? index
            : -1,
        )
        .filter((index) => index >= 0);

      unmount();

      return { origin: [originX, originY] as readonly [number, number], inside };
    };

    const wide = pannedToRangeEnd(1, 'ArrowRight');
    const close = pannedToRangeEnd(3, 'ArrowRight');

    /* The frame travels at least as far as the magnification pushed the network, and further where the
       payload's outermost mark lies beyond the level's own quarter view — the range reaches that mark so
       a reader can bring it back inside the frame. */
    expect(wide.origin[0]).toBeGreaterThan(0);
    expect(Math.abs(close.origin[0])).toBeGreaterThanOrEqual(
      Math.round(Math.abs(wide.origin[0]) * 2.8),
    );

    /* At the closest level the frame can still be moved along both axes, in every direction, and the four
       directions put it in four different places — the magnification's range is a range, not a single
       position. Every mark the level magnified past the edge is reachable from it, which the focus case
       below asserts mark by mark. */
    const ends = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].map((key) =>
      pannedToRangeEnd(3, key),
    );

    for (const end of ends) {
      expect(end.origin[0] !== 0 || end.origin[1] !== 0).toBe(true);
    }

    expect(new Set(ends.map((end) => end.origin.join(','))).size).toBe(ends.length);
  });

  it('brings a focused node’s mark into the frame, and leaves the frame alone for a mark already inside it', () => {
    const { container } = renderLens({ topology: CLUSTER_TOPOLOGY, zoomLevel: 3 });

    const atRest = viewBoxOf(container);
    const drawn = nodeMarks(container)
      .map((group) => {
        const centre = markCentreIn(group);

        return centre === undefined ? undefined : { group, centre };
      })
      .filter((entry): entry is { group: Element; centre: readonly [number, number] } => entry !== undefined);
    const showsWholeRing = ([x, y]: readonly [number, number]): boolean =>
      x >= atRest[0] + FOCUS_RING_CLEARANCE &&
      x <= atRest[0] + atRest[2] - FOCUS_RING_CLEARANCE &&
      y >= atRest[1] + FOCUS_RING_CLEARANCE &&
      y <= atRest[1] + atRest[3] - FOCUS_RING_CLEARANCE;
    const beyondTheRing = drawn.filter((entry) => !showsWholeRing(entry.centre));

    /* The mark nearest the middle of the frame is one the frame certainly shows whole, and the mark
       nearest the frame is the one the level magnified just past it. */
    const middle: readonly [number, number] = [atRest[0] + atRest[2] / 2, atRest[1] + atRest[3] / 2];
    const nearest = (
      entries: readonly { readonly group: Element; readonly centre: readonly [number, number] }[],
      measure: (centre: readonly [number, number]) => number,
    ) => entries.reduce((best, entry) => (measure(entry.centre) < measure(best.centre) ? entry : best));

    const visible = nearest(drawn, ([x, y]) => Math.hypot(x - middle[0], y - middle[1]));
    const outside =
      beyondTheRing.length === 0
        ? undefined
        : nearest(beyondTheRing, (centre) => distanceOutside(centre, atRest));

    expect(beyondTheRing.length).toBeGreaterThan(0);
    expect(outside).toBeDefined();

    if (outside === undefined) {
      return;
    }

    /* A mark the frame already shows leaves the frame exactly where it is, so a reader moving between
       marks that are all in view is not thrown across the drawing. */
    fireEvent.focus(visible.group);

    expect(viewBoxOf(container)).toStrictEqual(atRest);
    expect(screen.getByRole('button', { name: MAP_CANVAS_TEXT.resetLabel })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    /* A mark drawn outside it is brought inside, clear of the edge by the room its focus ring needs, and
       the move is a pan the reader can undo with "Reset view" (rule P-8). */
    fireEvent.focus(outside.group);

    const revealed = viewBoxOf(container);
    const [x, y] = outside.centre;

    expect(revealed).not.toStrictEqual(atRest);
    expect(x).toBeGreaterThanOrEqual(revealed[0] + FOCUS_RING_CLEARANCE - MARK_CENTRE_SLACK);
    expect(x).toBeLessThanOrEqual(
      revealed[0] + revealed[2] - FOCUS_RING_CLEARANCE + MARK_CENTRE_SLACK,
    );
    expect(y).toBeGreaterThanOrEqual(revealed[1] + FOCUS_RING_CLEARANCE - MARK_CENTRE_SLACK);
    expect(y).toBeLessThanOrEqual(
      revealed[1] + revealed[3] - FOCUS_RING_CLEARANCE + MARK_CENTRE_SLACK,
    );
    expect(screen.getByRole('button', { name: MAP_CANVAS_TEXT.resetLabel })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('brings every node’s focus ring into the frame at the closest level', () => {
    const { container } = renderLens({ topology: CLUSTER_TOPOLOGY, zoomLevel: 3 });
    const groups = nodeMarks(container);

    expect(groups.length).toBeGreaterThan(0);

    for (const group of groups) {
      fireEvent.focus(group);

      const [originX, originY, width, height] = viewBoxOf(container);
      const centre = markCentreIn(group);

      expect(centre).toBeDefined();

      if (centre === undefined) {
        continue;
      }

      /* The ring is drawn about the mark, so it is drawn whole once the mark sits a ring's radius and
         stroke in from the frame's edge: the range each level allows reaches every mark the level
         placed, so no node is a focus stop a keyboard reader cannot see (rule B-3). */
      const [x, y] = centre;

      expect(x).toBeGreaterThanOrEqual(originX + FOCUS_RING_CLEARANCE - MARK_CENTRE_SLACK);
      expect(x).toBeLessThanOrEqual(originX + width - FOCUS_RING_CLEARANCE + MARK_CENTRE_SLACK);
      expect(y).toBeGreaterThanOrEqual(originY + FOCUS_RING_CLEARANCE - MARK_CENTRE_SLACK);
      expect(y).toBeLessThanOrEqual(originY + height - FOCUS_RING_CLEARANCE + MARK_CENTRE_SLACK);
    }
  });

  it('pans the frame on a pointer drag without re-projecting the world or changing the selection', () => {
    const selected: string[] = [];
    const { container } = renderLens({
      onSelectNode: (nodeId) => {
        selected.push(nodeId);
      },
    });

    const surface = mapSurfaceOf(container);
    const drawn = countryPathsOf(container);

    expect(viewBoxOf(container)).toStrictEqual([0, 0, 960, 520]);

    dragSurface(container, 60, 30);

    /* The frame moved by the distance the pointer travelled, and the projection behind it did not: the
       country path is the same drawing seen through a moved window. */
    expect(viewBoxOf(container)).toStrictEqual([-60, -30, 960, 520]);
    expect(countryPathsOf(container)).toBe(drawn);

    /* The surface says it may be dragged, and shows the focus ring it draws as a keyboard stop. */
    const surfaceClasses = surface.getAttribute('class') ?? '';

    expect(surfaceClasses).toContain('cursor-grab');
    expect(surfaceClasses).toContain('active:cursor-grabbing');
    expect(surfaceClasses).toContain('focus-visible:outline-focus-ring');

    /* Panning is presentation and not a selection: nothing was reported to the screen. */
    expect(selected).toStrictEqual([]);
    expect(screen.getByText(`${MAP_CANVAS_TEXT.zoomCaption} 1 / 3`)).toBeInTheDocument();
  });

  it('pans only from the map body, so a press on a node still selects it', async () => {
    const user = userEvent.setup();
    const selected: string[] = [];
    const { container } = renderLens({
      onSelectNode: (nodeId) => {
        selected.push(nodeId);
      },
    });

    const surface = mapSurfaceOf(container);
    const plant = screen.getByRole('button', { name: /Regensburg plant/ });

    /* A drag that starts on a node's control is not a pan, and it does not activate the node either. */
    fireEvent.pointerDown(plant, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 220, clientY: 160 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 220, clientY: 160 });
    fireEvent.click(plant);

    expect(viewBoxOf(container)).toStrictEqual([0, 0, 960, 520]);
    expect(selected).toStrictEqual([]);

    /* A press that does not move is the activation it always was. */
    await user.click(plant);

    expect(selected).toStrictEqual(['node-plant']);
  });

  it('pans the frame from the arrow keys, in a range it cannot leave', async () => {
    const user = userEvent.setup();
    const { container } = renderLens();

    const surface = mapSurfaceOf(container);

    expect(surface).toHaveAttribute('tabindex', '0');
    expect(surface).toHaveAccessibleName(BASE_PROPS.title);
    expect(surface).toHaveAccessibleDescription(MAP_CANVAS_TEXT.panInstruction);

    surface.focus();
    expect(document.activeElement).toBe(surface);

    await user.keyboard('{ArrowRight}');
    expect(viewBoxOf(container)[0]).toBeGreaterThan(0);

    await user.keyboard('{ArrowDown}');
    expect(viewBoxOf(container)[1]).toBeGreaterThan(0);

    /* The other two arrows bring the frame back to where it started, so the four keys move it in four
       directions about the same position. */
    await user.keyboard('{ArrowLeft}{ArrowUp}');
    expect(viewBoxOf(container)).toStrictEqual([0, 0, 960, 520]);

    /* The pan is clamped: once the frame has reached the end of its range another press changes nothing,
       so the network cannot be walked off the screen. */
    for (let press = 0; press < 20; press += 1) {
      await user.keyboard('{ArrowRight}');
    }

    const clamped = viewBoxOf(container);

    await user.keyboard('{ArrowRight}');

    expect(viewBoxOf(container)).toStrictEqual(clamped);
  });

  it('returns the frame with "Reset view", which states why it cannot act at the start', async () => {
    const user = userEvent.setup();
    const { container } = renderLens();

    const atStart = screen.getByRole('button', { name: MAP_CANVAS_TEXT.resetLabel });

    expect(atStart).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(MAP_CANVAS_TEXT.resetAtStartReason)).toBeInTheDocument();

    dragSurface(container, -50, 20);

    expect(viewBoxOf(container)).toStrictEqual([50, -20, 960, 520]);

    const panned = screen.getByRole('button', { name: MAP_CANVAS_TEXT.resetLabel });

    expect(panned).not.toHaveAttribute('aria-disabled', 'true');

    await user.click(panned);

    expect(viewBoxOf(container)).toStrictEqual([0, 0, 960, 520]);
    expect(screen.getByRole('button', { name: MAP_CANVAS_TEXT.resetLabel })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('states the selection on the node it belongs to and names it under the drawing', () => {
    renderLens({ selectedNodeId: 'node-plant' });

    expect(screen.getByRole('button', { name: /Regensburg plant/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Brno plant/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(
      screen.getByText(`${MAP_CANVAS_TEXT.selectedCaption} Regensburg plant`),
    ).toBeInTheDocument();
  });

  it('names no node the payload does not hold, and captions nothing while nothing is selected', () => {
    const unknown = renderLens({ selectedNodeId: 'node-the-payload-omits' });

    expect(unknown.queryByText(SELECTION_CAPTION)).not.toBeInTheDocument();
    unknown.unmount();

    renderLens();

    expect(screen.queryByText(SELECTION_CAPTION)).not.toBeInTheDocument();
  });

  it('publishes the overlay marks the drawing paints, in the payload’s order', () => {
    const marks = overlayMarksOf(ATLAS);

    expect(marks).toStrictEqual([
      { kind: 'chokepoint', id: CROSSING.id, label: CROSSING.label, network: null },
      {
        kind: 'competitor-site',
        id: 'site-alpha',
        label: 'Ningbo drive plant',
        network: { id: 'CMP-01', label: 'Aurelvik Drive Systems' },
      },
      {
        kind: 'competitor-site',
        id: 'site-beta',
        label: 'Gdansk assembly',
        network: { id: 'CMP-01', label: 'Aurelvik Drive Systems' },
      },
    ]);

    /* The enumeration is the drawing's own: the marks it lists are the marks the surface paints. */
    const { container } = renderLens({ overlay: ATLAS });

    expect(container.querySelectorAll('svg circle[stroke-dasharray]')).toHaveLength(
      marks.filter((mark) => mark.kind === 'chokepoint').length,
    );
    expect(container.querySelectorAll('svg polygon[class*="stroke-competitor"]')).toHaveLength(
      marks.filter((mark) => mark.kind === 'competitor-site').length,
    );
  });

  it('leaves a crossing it cannot place and a network with no competitor slot out of its marks', () => {
    const unplaced: Chokepoint = {
      ...CROSSING,
      id: 'crossing-unplaced',
      label: 'Unplaced crossing',
    };

    const marks = overlayMarksOf({
      ...ATLAS,
      chokepoints: [unplaced],
      competitors: [NETWORK_FIRST, NETWORK_FIRST],
    });

    expect(marks).toStrictEqual([
      {
        kind: 'competitor-site',
        id: 'site-alpha',
        label: 'Alpha assembly',
        network: { id: 'CMP-01', label: 'Competitor alpha' },
      },
    ]);
  });

  it('renders the lens under both themes', () => {
    for (const theme of ['command', 'paper']) {
      document.documentElement.setAttribute('data-theme', theme);

      const { container, unmount } = renderLens();

      expect(screen.getByRole('group', { name: BASE_PROPS.title })).toBeInTheDocument();
      expect(countryPathsOf(container).length).toBeGreaterThan(1000);

      unmount();
    }

    document.documentElement.removeAttribute('data-theme');
  });
});
