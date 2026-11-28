/**
 * The map lens of the FileMap canvas: the client's own network and, when stage S3's atlas payload is
 * supplied, the competitors' networks and the shared crossings, drawn over one world map.
 *
 * THE BOUNDARY FILE IS THE ONLY GEOGRAPHIC SOURCE. Every coast, border and landmass in this component
 * comes from `src/assets/geo/countries-110m.json`, the Natural Earth 1:110m set bundled in the
 * repository, and from nothing else. It is **imported as a module** rather than fetched, so Vite
 * compiles it into the bundle and the built output addresses no tile server, no boundary host and no
 * CDN: the map draws from the application's own origin and a reader's browser makes no request while
 * it renders (rule B-1, acceptance test T-20). There is no `Image`, no `<use>` element pointing
 * outside the document, no basemap address and no projection helper that reaches the network, and the
 * component suite proves it by spying on `fetch`.
 *
 * THE TABLE VIEW LIVES IN `ChartFrame`, NOT HERE. Rule B-3 and success criterion 9 require a table
 * view of every chart, map and graph, and `./chart-frame.tsx` is the one place that control lives and
 * the one place the two representations swap. This module is therefore a pure SVG surface with no
 * toggle of its own, exactly as `./chart-frame.tsx` documents, and a screen composes it inside that
 * frame with the rows the frame's table view prints.
 *
 * WHAT THE SCREEN OWNS AND WHAT THIS COMPONENT OWNS. The zoom level and the view preset are
 * controlled props with their change handlers, so the screen holds them and the graph lens beside this
 * map can be told the same level. The selection is shared the same way: `selectedNodeId` and
 * `onSelectNode` arrive from the screen, both lenses receive them, and neither lens owns the
 * selection. Node and lane geometry is a pure function of the props, so two renders of the same props
 * draw the same map.
 *
 * MEANING IS NEVER CARRIED BY COLOUR ALONE (rule B-3). Each of the five node families has its own
 * marker shape — a square for a plant, a circle for a supplier, a hexagon for a material, a triangle for
 * a tier-2 origin and a diamond for a customer — and every node but a material prints its own label, so
 * a reader who cannot separate the hues still reads the network. A material prints no label because it
 * has no place of its own: it sits at the site its supplier ships from, and its family, its name and its
 * pins are stated in its accessible name and in the table view instead of crowding the site's own label.
 * A node's evidence pins are counted per state and printed as numerals on the same marker, and the
 * node's accessible name spells the counts out, so the badge never asks a reader to tell a hue apart.
 * Every node is a focus stop with a visible focus ring that a hover or a press reveals as well, the
 * controls beside the map are native buttons of at least 24x24 px, and the one transition in the file is
 * a `motion-safe` fade: the map changes only when a prop changes and nothing moves, so a reduced-motion
 * session is shown the same drawing with nothing to undo.
 *
 * PROVENANCE IS STRUCTURAL (rule P-5). First-party nodes are drawn from the topology and only a
 * competitor element is drawn from the atlas payload. The two are never combined into one mark, one
 * series or one reading: the competitor overlay keeps its own hollow marks in the three competitor
 * roles of specification §4.2, its legend row carries the fixed market-intelligence label imported
 * from `src/types`, and a chokepoint halo prints the same label under its own name. Which of the three
 * roles a competitor is painted in is resolved from that competitor's own identifier through
 * `competitorSlotOf` — the one lookup the radar, the legend and the atlas network view read as well —
 * so a payload that lists its networks in another order repaints nothing. No figure is blended and
 * none is computed here (rule P-6): the pin counts arrive in `topology.pinsByNode` and are printed as
 * they arrive, and the component formats no currency amount, no timestamp and no record identifier.
 *
 * Rules this module is built to satisfy:
 * - B-1, T-20: the bundled module is the only geographic source; no request of any kind is made.
 * - B-2: no credential, no environment read, no configuration.
 * - B-3: keyboard-operable nodes and controls with accessible names, a visible focus indication, 24x24
 *   px targets, per-state pin numerals, and one guarded fade rather than motion.
 * - P-1: the market-intelligence label is imported from `src/types`, never spelled here.
 * - P-2: no data access. The topology and the atlas are props the screen reads through the service.
 * - P-4: nothing here claims a property of the workspace — no sentence states confinement, copy
 *   prevention or resistance to alteration.
 * - P-5: competitor marks, halos and legend rows come from the atlas payload alone and carry its
 *   label; no first-party mark carries a market-intelligence or competitor value.
 * - P-6: no number is typed in and none is derived; a pin count is printed where the payload put it.
 * - P-7: every name on the map is a seed record's own synthetic name.
 * - P-8: the two zoom controls are disabled with a stated reason at the ends of the range.
 */
import { geoEqualEarth, geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode } from 'react';

import countriesTopology from '../assets/geo/countries-110m.json';
import { SIM_LABELS } from '../types';
import type {
  Atlas,
  AtlasSite,
  Chokepoint,
  CompetitorNetwork,
  PinCounts,
  PinState,
  Topology,
  TopologyNode,
  TopologyNodeKind,
} from '../types';

import { EvidenceDrawer } from './evidence-drawer';
import { NODE_FAMILY_WORDS, PIN_STATE_ORDER } from './graph-vocabulary';
import { CHART_TONE_CLASSES, competitorSlotOf, CONTROL_RADIUS_CLASSES } from './horizontal-bar-chart';
import type { CompetitorSlot } from './horizontal-bar-chart';
import { Legend } from './legend';
import type { LegendEntry } from './legend';
import { meaningOf } from './status-indicator';
import { ActionButton, CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES } from './tooltip';

/* ---------------------------------------------------------------------------------------------
 * The public vocabulary of the lens
 * ------------------------------------------------------------------------------------------- */

/**
 * The three zoom levels specification §6.2 fixes for the map lens.
 *
 * They are a closed union rather than a number because the lens offers exactly three, the controls
 * step between them, and a fourth level would have to be given a factor here before it could be
 * selected.
 */
export type MapZoomLevel = 1 | 2 | 3;

/** The three zoom levels in ascending order, so a control can step through them without a literal. */
export const MAP_ZOOM_LEVELS: readonly MapZoomLevel[] = [1, 2, 3];

/**
 * The five view presets of the map lens, each a fixed scale-and-centre pair over the bundled
 * boundaries.
 *
 * The identifiers are this implementation's own, chosen because specification §6.2 fixes that the
 * lens offers five presets and what each is for — the whole network at a glance, the client's
 * European, American and Asian-Pacific positions, and the corridor between Europe, Africa and the
 * Middle East — but the identifiers themselves were not available to this run. Each one names the
 * region it frames, so a screen, a test and a reader use the same word for the same view.
 */
export type MapViewPreset =
  | 'world'
  | 'europe'
  | 'americas'
  | 'asia-pacific'
  | 'africa-middle-east';

/** The five presets in the order the controls offer them: the widest view first. */
export const MAP_VIEW_PRESETS: readonly MapViewPreset[] = [
  'world',
  'europe',
  'americas',
  'asia-pacific',
  'africa-middle-east',
];

/**
 * The words each preset's control prints.
 *
 * They are held here rather than written at the button so a screen, a test and the control all read
 * the same name, and so the accessible name of a preset control is the visible label it already has.
 */
export const MAP_VIEW_PRESET_LABELS = {
  world: 'World',
  europe: 'Europe',
  americas: 'Americas',
  'asia-pacific': 'Asia-Pacific',
  'africa-middle-east': 'Africa and Middle East',
} as const satisfies Record<MapViewPreset, string>;

/**
 * Every sentence and label the lens states, in the one place it is written.
 *
 * None of these is a fixed specification string: the seven §5.3 simulation labels belong to the
 * elements carrying them (rule P-1) and are imported, not retyped, and every record name, node label
 * and count on the map arrives in the props (rule P-6).
 */
export const MAP_CANVAS_TEXT = {
  /** The zoom controls' group name, read before each of the two buttons. */
  zoomGroupLabel: 'Zoom level',
  /** The visible caption beside the zoom controls, followed by the level and the count. */
  zoomCaption: 'Zoom',
  /** The control that steps the map closer. */
  zoomInLabel: 'Zoom in',
  /** The control that steps the map back out. */
  zoomOutLabel: 'Zoom out',
  /** Why the closer control cannot act: the last of the three levels is already shown. */
  zoomAtClosestReason: 'The map is already at its closest zoom level.',
  /** Why the wider control cannot act: the first of the three levels is already shown. */
  zoomAtWidestReason: 'The map is already at its widest zoom level.',
  /** The view presets' group name, read before the five preset controls. */
  presetGroupLabel: 'Map view',
  /** The nodes' group name, read before the first node of the network. */
  nodesGroupLabel: 'Network nodes',
  /** The prefix of a node's pin summary, followed by the counts per state. */
  pinsPrefix: 'Evidence pins',
  /** The pin summary of a node the payload carries no counts for. */
  noPins: 'No evidence pins',
  /** The competitor overlay's group name, prefixed by the imported market-intelligence label. */
  competitorGroupSuffix: 'competitor sites',
} as const;

/**
 * The market-intelligence label of specification §5.3, taken by position from the fixed label list in
 * `src/types` so the exact string has one owner and is never spelled in this module (rule P-1).
 */
const MARKET_INTELLIGENCE_LABEL: (typeof SIM_LABELS)[5] = SIM_LABELS[5];

/* ---------------------------------------------------------------------------------------------
 * Geometry — the view box, the projections and the five presets
 * ------------------------------------------------------------------------------------------- */

/** The view box width every projection is laid out against; the drawn map scales with its box. */
const MAP_WIDTH = 960;

/** The view box height, which gives the map the wide letterbox a network diagram reads in. */
const MAP_HEIGHT = 520;

/** The point the projection is centred on: the middle of the view box. */
const VIEW_BOX_CENTER: readonly [number, number] = [MAP_WIDTH / 2, MAP_HEIGHT / 2];

/**
 * One preset's fixed framing: the meridian and parallel its centre sits on, and the scale that makes
 * the region fill the box.
 *
 * The pair is fixed rather than fitted to the records, so the same preset frames the same region for
 * every topology and every scope, and a reader who returns to a preset sees the map they left.
 */
interface ProjectionFraming {
  /** The centre of the framed region, in degrees of longitude and latitude. */
  readonly center: readonly [number, number];
  /** The projection's scale at zoom level one. */
  readonly scale: number;
}

/** The framing each of the five presets applies, in {@link MAP_VIEW_PRESETS} order. */
const PRESET_FRAMINGS = {
  world: { center: [10, 5], scale: 170 },
  europe: { center: [16, 50], scale: 700 },
  americas: { center: [-72, 8], scale: 330 },
  'asia-pacific': { center: [112, 4], scale: 400 },
  'africa-middle-east': { center: [28, 14], scale: 460 },
} as const satisfies Record<MapViewPreset, ProjectionFraming>;

/**
 * How much closer each zoom level draws than the level below it.
 *
 * The factors are applied to the preset's own scale, so a zoom keeps the framed region's centre and
 * magnifies it, and the three levels are visibly distinct at every preset.
 */
const ZOOM_FACTORS = { 1: 1, 2: 1.7, 3: 2.8 } as const satisfies Record<MapZoomLevel, number>;

/**
 * Builds the projection for one preset at one zoom level.
 *
 * Equal Earth is used because it keeps the areas of the regions the network spans comparable, which a
 * Mercator projection does not at the latitudes the client's plants and tier-2 origins sit at. The
 * result is a pure function of its two arguments: no state, no clock and no random source, so the same
 * pair of props always frames the same region.
 *
 * @param preset The preset to frame.
 * @param zoomLevel The zoom level to apply to the preset's scale.
 * @returns The projection the country shapes and the node coordinates are drawn through.
 */
function projectionFor(preset: MapViewPreset, zoomLevel: MapZoomLevel): GeoProjection {
  const framing = PRESET_FRAMINGS[preset];

  return geoEqualEarth()
    .center([framing.center[0], framing.center[1]])
    .scale(framing.scale * ZOOM_FACTORS[zoomLevel])
    .translate([VIEW_BOX_CENTER[0], VIEW_BOX_CENTER[1]]);
}

/** The shape `geoPath` accepts, taken from its own signature so no GeoJSON type is imported here. */
type GeoShape = Parameters<ReturnType<typeof geoPath>>[0];

/**
 * The bundled world boundaries, converted from TopoJSON to GeoJSON once at module load.
 *
 * `topojson-client`'s `feature` reads the file's own `countries` object and returns the collection the
 * path generator draws. The two casts are unavoidable and deliberate: the imported JSON carries the
 * file's literal types, while `feature` is declared against the TopoJSON specification's own shapes,
 * and no second geographic source is introduced to bridge them.
 */
const COUNTRY_SHAPES: GeoShape = feature(
  countriesTopology as unknown as Parameters<typeof feature>[0],
  countriesTopology.objects.countries as unknown as Parameters<typeof feature>[1],
) as unknown as GeoShape;


/**
 * The path of every country at one projection, in a single `<path>`.
 *
 * One path rather than one element per country: the collection's subpaths are stroked individually, so
 * the borders still read while the document holds one shape, and a zoom re-render replaces one
 * attribute instead of remounting a hundred and seventy elements.
 *
 * @param projection The projection to project the boundaries through.
 * @returns The path data, or an empty string when the projection produced nothing.
 */
function countryPathsFor(projection: GeoProjection): string {
  return geoPath(projection)(COUNTRY_SHAPES) ?? '';
}

/* ---------------------------------------------------------------------------------------------
 * Nodes — labels, markers and the pin badges
 * ------------------------------------------------------------------------------------------- */

/**
 * The words a pin state's count is announced with.
 *
 * The order the six states are listed in, and the word a node's family is named by, are shared with
 * every other graph surface and live in `./graph-vocabulary.ts`. What stays here is this component's
 * own wording for the six states rather than a specification string: the shared mapping in
 * `./status-indicator.tsx` owns what a state looks like, and this map owns only what a reader hears
 * beside a numeral.
 */
const PIN_STATE_WORDS = {
  fail: 'failed',
  stale: 'stale',
  pending: 'awaiting review',
  review: 'needing review',
  pass: 'passed',
  empty: 'with no record',
} as const satisfies Record<PinState, string>;

/**
 * The style every first-party node marker shares: the accent role, which specification §4.1 reserves
 * for first-party flows, so a first-party mark can never be painted in a competitor's hue.
 *
 * The focus ring of a node is drawn by the marker's own ring element rather than by an outline
 * property, because an SVG group has no reliable outline box: the ring is a shape, it scales with the
 * projection like everything else, and its colour is the `--color-focus-ring` role.
 */
const NODE_MARK_CLASSES = 'fill-accent';

/** The ring a node shows while it is the selected one, in the focus-ring role. */
const NODE_SELECTED_RING_CLASSES = 'fill-none stroke-focus-ring';

/**
 * The ring a node shows while it holds keyboard focus: the focus-ring role, hidden until the group is
 * focused, so a keyboard reader sees where they are and a pointer press leaves no keyboard indicator
 * behind.
 *
 * Tailwind's `group-focus-visible` variant is what makes a child react to its parent's focus state;
 * the `group` marker is set on the node's own `<g>`.
 */
const NODE_FOCUS_RING_CLASSES =
  'fill-none stroke-focus-ring opacity-0 group-focus-visible:opacity-100';

/**
 * The ring a node shows while the pointer is over it or a press is held on it: the accent role, at the
 * same radius, drawn over the keyboard ring so each state keeps its own element and neither has to
 * out-rank the other in the cascade.
 *
 * It is a second circle rather than two more variants on the focus ring for one reason: the selected
 * node already draws a ring in the `focus-ring` role at this radius, so a hover revealed in that same
 * role would be invisible on exactly the node a reader is most likely to point at. The accent is the
 * role specification §4.1 gives first-party flows, so the pointer state is still a role token, it never
 * repaints the marker that states the node's family, and `pointer-events-none` leaves the hit area
 * exactly as it was. `motion-safe:` gates the fade, so a reduced-motion session gets the same hover and
 * pressed states with no transition (rule B-3), and the theme layer exposes no shadow to select.
 */
const NODE_POINTER_RING_CLASSES = [
  'pointer-events-none fill-none stroke-accent opacity-0',
  'group-hover:opacity-100 group-active:opacity-100',
  'motion-safe:transition-opacity motion-safe:duration-150',
].join(' ');

/** A node's printed name: the primary text role, haloed by the surface role so it stays legible. */
const NODE_LABEL_CLASSES = 'fill-text-primary stroke-surface-1 text-12';

/** A pin badge's numeral: the ground role, which inverts against each theme's status fills. */
const PIN_BADGE_NUMERAL_CLASSES = 'fill-ground text-12';

/** A first-party lane: the control-boundary role, so an arc reads as structure rather than as data. */
const LANE_CLASSES = 'fill-none stroke-control-boundary';

/* ---------------------------------------------------------------------------------------------
 * Overlay — competitor marks, chokepoint halos and the legend
 * ------------------------------------------------------------------------------------------- */

/** A competitor site's mark: hollow, so it never competes with a filled first-party mark. Its stroke
 * is the chart tone table's `competitor-1/2/3` role for the slot the network's own identifier resolves
 * (§4.2, rule P-5), so a mark, a radar series and a legend swatch of one company resolve one token
 * from one owner. */
const COMPETITOR_SITE_CLASSES = 'fill-none';

/** A chokepoint halo: the simulated status role, dashed so it reads as an extent rather than a place. */
const HALO_RING_CLASSES = 'fill-none stroke-status-simulated';

/** A chokepoint's name under its halo: the primary text role, haloed like a node's own label. */
const HALO_LABEL_CLASSES = 'fill-text-primary stroke-surface-1 text-12';

/** The market-intelligence label printed under a chokepoint's halo, in the caption role. */
const HALO_CAPTION_CLASSES = 'fill-text-caption stroke-surface-1 text-12';

/**
 * One chokepoint halo, resolved to the position it is drawn at.
 *
 * The crossing itself carries no figure: `label` is the pack's own name for it, and the label the halo
 * prints is imported from `src/types` rather than composed here (rules P-1, P-5).
 */
interface ChokepointHalo {
  /** The crossing's identifier, used as the halo's key. */
  readonly id: string;
  /** The crossing's own name, printed under the halo. */
  readonly label: string;
  /** The projected x of the halo's centre, rounded to the drawing grid. */
  readonly x: number;
  /** The projected y of the halo's centre, rounded to the drawing grid. */
  readonly y: number;
}

/**
 * The position a crossing is drawn at, when the payload states one.
 *
 * The market-intelligence pack records the crossing's own latitude and longitude for this lens, as
 * `src/seed/market-intelligence.ts` documents, but the shared `Chokepoint` shape the atlas payload is
 * declared with does not carry them. They are therefore read defensively: a crossing that states a
 * position is drawn there, and one that does not is anchored on the lane that names it (see
 * {@link anchorOnLane}). Nothing is invented for a crossing that states neither.
 */
interface ChokepointWithPosition extends Chokepoint {
  readonly latitude?: number;
  readonly longitude?: number;
}

/**
 * Projects one coordinate pair, or returns `undefined` when the projection puts it nowhere.
 *
 * @param projection The projection in use.
 * @param longitude The longitude in decimal degrees.
 * @param latitude The latitude in decimal degrees.
 * @returns The projected point rounded to whole drawing units, or `undefined`.
 */
function projectPoint(
  projection: GeoProjection,
  longitude: number,
  latitude: number,
): readonly [number, number] | undefined {
  const projected = projection([longitude, latitude]);

  if (projected === null) {
    return undefined;
  }

  return [Math.round(projected[0]), Math.round(projected[1])];
}

/**
 * One competitor site of a network, projected.
 *
 * @param network The network the site belongs to.
 * @param siteId The site to project.
 * @param projection The projection in use.
 * @returns The projected point, or `undefined` when the network holds no such site.
 */
function sitePointOf(
  network: CompetitorNetwork,
  siteId: string,
  projection: GeoProjection,
): readonly [number, number] | undefined {
  const site = network.sites.find((candidate) => candidate.id === siteId);

  if (site === undefined) {
    return undefined;
  }

  return projectPoint(projection, site.longitude, site.latitude);
}

/**
 * The midpoint of the first competitor lane that names a crossing, used when the crossing states no
 * position of its own.
 *
 * Only a competitor lane is walked: the crossing belongs to the market pack, so the position it is
 * drawn at comes from market-intelligence geometry and never from a first-party record (rule P-5).
 *
 * @param overlay The atlas payload whose competitor networks are searched.
 * @param chokepointId The crossing to anchor.
 * @param projection The projection in use.
 * @returns The rounded midpoint of a lane naming the crossing, or `undefined` when none does.
 */
function anchorOnLane(
  overlay: Atlas,
  chokepointId: string,
  projection: GeoProjection,
): readonly [number, number] | undefined {
  for (const network of overlay.competitors) {
    for (const lane of network.lanes) {
      if (lane.chokepointId !== chokepointId) {
        continue;
      }

      const from = sitePointOf(network, lane.fromId, projection);
      const to = sitePointOf(network, lane.toId, projection);

      if (from === undefined || to === undefined) {
        continue;
      }

      return [Math.round((from[0] + to[0]) / 2), Math.round((from[1] + to[1]) / 2)];
    }
  }

  return undefined;
}

/**
 * Every chokepoint of the atlas payload, resolved to the position its halo is drawn at.
 *
 * A crossing the payload places is drawn at that place; one it does not is anchored on the competitor
 * lane that names it. A crossing with neither is left out rather than placed at a guessed coordinate,
 * because a halo at the wrong place would misstate where the contention is.
 *
 * @param overlay The atlas payload.
 * @param projection The projection in use.
 * @returns One halo per placeable crossing, in the payload's order.
 */
function halosOf(overlay: Atlas, projection: GeoProjection): readonly ChokepointHalo[] {
  const halos: ChokepointHalo[] = [];

  for (const crossing of overlay.chokepoints) {
    const stated = crossing as ChokepointWithPosition;
    const own: readonly [number, number] | undefined =
      typeof stated.latitude === 'number' && typeof stated.longitude === 'number'
        ? projectPoint(projection, stated.longitude, stated.latitude)
        : undefined;
    const anchor = own ?? anchorOnLane(overlay, crossing.id, projection);

    if (anchor === undefined) {
      continue;
    }

    halos.push({ id: crossing.id, label: crossing.label, x: anchor[0], y: anchor[1] });
  }

  return halos;
}


/* ---------------------------------------------------------------------------------------------
 * Nodes — placement, accessible names and the drawn mark
 * ------------------------------------------------------------------------------------------- */

/** One node of the topology, with the point the projection puts it at. */
interface PlacedNode {
  /** The node record the mark and its accessible name are read from. */
  readonly node: TopologyNode;
  /** The projected x of the mark's centre. */
  readonly x: number;
  /** The projected y of the mark's centre. */
  readonly y: number;
}

/**
 * How far a material's mark sits from the site it is bought from, in view-box units.
 *
 * A material carries its primary supplier's site coordinates (`src/types/topology.ts`), so every
 * material bought from one supplier projects onto exactly the same point. Each such material is
 * therefore drawn on a small ring around that point — the first straight up, the rest spaced evenly
 * around the ring by their index among the materials at that pair — so two marks never coincide and the
 * map still shows one mark per record. The radius is fixed geometry in view-box units and is never a
 * measurement of the rendered box, so the same topology draws the same marks on every render and in
 * every environment.
 */
const MATERIAL_ORBIT_RADIUS = 22;

/**
 * Where a material's mark sits relative to its site: one point of the ring above, rounded to three
 * decimals so the same pair always produces the same coordinate string.
 *
 * The first point is straight up because an SVG view box's y grows downwards, so the offset that reads
 * as "above the site" is the negative quarter turn. A single material at a site therefore sits above it
 * rather than on top of it, and a reader still sees the supplier's own mark beneath.
 *
 * @param index The material's place among the materials sharing its site.
 * @param total How many materials share that site.
 * @returns The x and y offset from the site's projected point.
 */
function materialOrbitOffset(index: number, total: number): readonly [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  const round = (value: number): number => Math.round(value * 1000) / 1000;

  return [
    round(MATERIAL_ORBIT_RADIUS * Math.cos(angle)),
    round(MATERIAL_ORBIT_RADIUS * Math.sin(angle)),
  ];
}

/**
 * Places every node of the five families, in the order the families are painted.
 *
 * Customers are placed first and plants last so a plant's mark is never buried under the marks that
 * feed it, and materials are painted before the origins and suppliers whose sites they share, so a
 * place's own mark always stays on top of the material bought from it. The order within a family is the
 * payload's own, so the same topology draws the same map twice. A node the projection drops is left out
 * rather than drawn at the origin, which would put a supplier in the wrong ocean; a material is dropped
 * with its supplier, because its site is the supplier's.
 *
 * @param topology The topology payload.
 * @param projection The projection in use.
 * @returns Every placeable node, in painting order.
 */
function placedNodesOf(topology: Topology, projection: GeoProjection): readonly PlacedNode[] {
  const placed: PlacedNode[] = [];
  const families: readonly (readonly TopologyNode[])[] = [
    topology.customers,
    topology.materials,
    topology.origins,
    topology.suppliers,
    topology.plants,
  ];
  const materialsBySite = new Map<string, readonly TopologyNode[]>();

  for (const material of topology.materials) {
    const site = `${material.latitude}|${material.longitude}`;
    const sharing = materialsBySite.get(site);
    materialsBySite.set(site, sharing === undefined ? [material] : [...sharing, material]);
  }

  for (const family of families) {
    for (const node of family) {
      const point = projectPoint(projection, node.longitude, node.latitude);

      if (point === undefined) {
        continue;
      }

      if (node.kind !== 'material') {
        placed.push({ node, x: point[0], y: point[1] });
        continue;
      }

      const sharing = materialsBySite.get(`${node.latitude}|${node.longitude}`) ?? [];
      const [offsetX, offsetY] = materialOrbitOffset(
        sharing.findIndex((candidate) => candidate.id === node.id),
        Math.max(1, sharing.length),
      );

      placed.push({ node, x: point[0] + offsetX, y: point[1] + offsetY });
    }
  }

  return placed;
}

/**
 * The sentence a node's accessible name carries about its evidence pins.
 *
 * The counts are read out of `topology.pinsByNode` exactly as the payload states them and are joined in
 * {@link PIN_STATE_ORDER}. Nothing is added up: a reader hears each state's own count, so the summary
 * cannot disagree with the badges painted beside it, and a node the payload holds no counts for says so
 * rather than reporting zeros.
 *
 * @param counts The node's counts, or `undefined` when the payload holds none.
 * @returns The summary.
 */
function pinSummaryOf(counts: PinCounts | undefined): string {
  if (counts === undefined) {
    return MAP_CANVAS_TEXT.noPins;
  }

  const stated = PIN_STATE_ORDER.filter((state) => counts[state] > 0).map(
    (state) => `${counts[state]} ${PIN_STATE_WORDS[state]}`,
  );

  if (stated.length === 0) {
    return MAP_CANVAS_TEXT.noPins;
  }

  return `${MAP_CANVAS_TEXT.pinsPrefix}: ${stated.join(', ')}`;
}

/**
 * A node's accessible name: what the place is called, which family it belongs to, and what evidence it
 * carries.
 *
 * The name carries the pin counts per state as well as the drawn badges do, because the badges are
 * numerals inside a control whose name replaces its contents for assistive technology: putting the
 * counts in the name is what makes them reach a reader who cannot see the badge at all (rule B-3).
 *
 * @param node The node record.
 * @param counts The node's pin counts, or `undefined`.
 * @returns The accessible name of the node's control.
 */
function nodeAriaLabel(node: TopologyNode, counts: PinCounts | undefined): string {
  return `${node.label}, ${NODE_FAMILY_WORDS[node.kind]}. ${pinSummaryOf(counts)}.`;
}

/**
 * The marker for one family: a shape of its own, so the family is read without relying on colour.
 *
 * The five shapes are drawn at the same size — a plant's square is 10 units on a side, and each of the
 * others spans 6 units from its centre — so no family is emphasised by being bigger. The material's
 * hexagon is a sixth-sided mark rather than a smaller or larger variant of the four places, because a
 * material is not a place: it is drawn at the site it ships from, and its shape is what tells a reader
 * it belongs to the supplier underneath it.
 *
 * @param kind The node's family.
 * @param x The mark's centre x.
 * @param y The mark's centre y.
 * @returns The shape element for that family.
 */
function markerFor(kind: TopologyNodeKind, x: number, y: number): ReactElement {
  switch (kind) {
    case 'plant':
      return <rect x={x - 5} y={y - 5} width={10} height={10} rx={1} className={NODE_MARK_CLASSES} />;
    case 'supplier':
      return <circle cx={x} cy={y} r={5} className={NODE_MARK_CLASSES} />;
    case 'material':
      return (
        <polygon
          points={`${x},${y - 6} ${x + 5.2},${y - 3} ${x + 5.2},${y + 3} ${x},${y + 6} ${
            x - 5.2
          },${y + 3} ${x - 5.2},${y - 3}`}
          className={NODE_MARK_CLASSES}
        />
      );
    case 'origin':
      return (
        <polygon
          points={`${x},${y - 6} ${x + 6},${y + 4} ${x - 6},${y + 4}`}
          className={NODE_MARK_CLASSES}
        />
      );
    case 'customer':
      return (
        <polygon
          points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`}
          className={NODE_MARK_CLASSES}
        />
      );
  }
}

/** The width of one pin badge, wide enough for a two-digit count. */
const BADGE_WIDTH = 16;

/** The height of one pin badge, which keeps the numeral's contrast inside the 4 px grid. */
const BADGE_HEIGHT = 14;

/** The gap between two pin badges. */
const BADGE_GAP = 2;

/** How far a badge row starts from the mark's centre, clear of the marker itself. */
const BADGE_OFFSET_X = 8;

/** How far above the mark's centre a badge row sits, clear of the printed node label. */
const BADGE_OFFSET_Y = 16;

/**
 * The badges of one node: one chip per state the node carries a pin in, each printing that state's own
 * count.
 *
 * No badge is painted for a state carrying none, and no chip total is printed: the counts are the
 * payload's own numbers, printed where they arrive (rule P-6). The row is marked `aria-hidden` because
 * the node's accessible name already states the same counts per state, and a numeral read out twice —
 * once as a name and once as loose text inside a control — is announced twice.
 *
 * @param counts The node's counts, or `undefined` when the payload holds none.
 * @param x The mark's centre x.
 * @param y The mark's centre y.
 * @param nodeId The node's identifier, used to key the chips.
 * @returns The badge row, or `null` when the node carries no pins.
 */
function pinBadgesFor(
  counts: PinCounts | undefined,
  x: number,
  y: number,
  nodeId: string,
): ReactNode {
  if (counts === undefined) {
    return null;
  }

  const present = PIN_STATE_ORDER.filter((state) => counts[state] > 0);

  if (present.length === 0) {
    return null;
  }

  return (
    <g aria-hidden="true">
      {present.map((state, index) => {
        const badgeX = x + BADGE_OFFSET_X + index * (BADGE_WIDTH + BADGE_GAP);
        const badgeY = y - BADGE_OFFSET_Y;

        return (
          <g key={`${nodeId}-${state}`}>
            <rect
              x={badgeX}
              y={badgeY}
              width={BADGE_WIDTH}
              height={BADGE_HEIGHT}
              className={joinClassNames(
                CHART_TONE_CLASSES[meaningOf(state).meaning].fill,
                CONTROL_RADIUS_CLASSES,
              )}
            />
            <text
              x={badgeX + BADGE_WIDTH / 2}
              y={badgeY + BADGE_HEIGHT - 3}
              textAnchor="middle"
              className={PIN_BADGE_NUMERAL_CLASSES}
            >
              {counts[state]}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/**
 * The keys a node's control answers to, which are the two a native button answers to.
 *
 * An SVG group carrying `role="button"` has the role but none of a button's behaviour, so `Enter` and
 * `Space` are handled here and both refuse the browser's own default for the key. Every other key is
 * left alone, so `Tab` still moves to the next stop.
 *
 * @param event The key event on the node's group.
 * @param onActivate What to do when the node is activated.
 */
function handleNodeKeyDown(
  event: ReactKeyboardEvent<SVGGElement>,
  onActivate: () => void,
): void {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  event.preventDefault();
  onActivate();
}

/** The radius of a node's invisible hit area: a 28 px target, above the 24 px minimum. */
const NODE_TARGET_RADIUS = 14;

/** The radius of the ring drawn while a node is selected, focused, hovered or pressed. */
const NODE_RING_RADIUS = 11;

/** The stroke of a ring drawn around a node. */
const NODE_RING_STROKE = 2;

/**
 * One node of the map, as a keyboard-operable control.
 *
 * The group is a `role="button"` focus stop with an accessible name, an invisible hit area that meets
 * the target size, a visible focus ring and both activation keys. Activating it reports the selection
 * to the screen — the screen owns the selection, and the graph lens beside the map is told the same
 * identifier — and the screen's selection is echoed back here as a ring so the two lenses agree about
 * which node is chosen. The pointer receives the same signal as the keyboard: the group carries the
 * `group` marker, and the accent ring reveals itself under a hover and holds through a press, so the
 * node under the pointer is visible without a keyboard and without a render of the surface's own.
 *
 * A node the caller resolved an evidence reference for also declares `aria-haspopup="dialog"`, so the
 * control says what activating it opens before it is pressed; a node no record stands behind declares
 * nothing and opens nothing (rule P-8).
 *
 * @param placed The node and its projected point.
 * @param counts The node's pin counts, or `undefined`.
 * @param isSelected Whether the screen's selection is this node.
 * @param opensEvidence Whether the caller resolved an evidence reference for this node.
 * @param onActivate What to do when the node is activated.
 * @returns The node's group.
 */
function nodeElement(
  placed: PlacedNode,
  counts: PinCounts | undefined,
  isSelected: boolean,
  opensEvidence: boolean,
  onActivate: () => void,
): ReactElement {
  const { node, x, y } = placed;

  return (
    <g
      key={`${node.kind}:${node.id}`}
      role="button"
      tabIndex={0}
      aria-label={nodeAriaLabel(node, counts)}
      {...(opensEvidence ? { 'aria-haspopup': 'dialog' as const } : {})}
      className="group cursor-pointer"
      onClick={onActivate}
      onKeyDown={(event) => {
        handleNodeKeyDown(event, onActivate);
      }}
    >
      <circle cx={x} cy={y} r={NODE_TARGET_RADIUS} fill="none" pointerEvents="all" />
      {isSelected ? (
        <circle
          cx={x}
          cy={y}
          r={NODE_RING_RADIUS}
          strokeWidth={NODE_RING_STROKE}
          className={NODE_SELECTED_RING_CLASSES}
        />
      ) : null}
      <circle
        cx={x}
        cy={y}
        r={NODE_RING_RADIUS}
        strokeWidth={NODE_RING_STROKE}
        className={NODE_FOCUS_RING_CLASSES}
      />
      {/* The pointer's ring: nothing until the node is hovered or pressed. */}
      <circle
        cx={x}
        cy={y}
        r={NODE_RING_RADIUS}
        strokeWidth={NODE_RING_STROKE}
        className={NODE_POINTER_RING_CLASSES}
      />
      {markerFor(node.kind, x, y)}
      {/* A material prints no label: it stands at its supplier's site, where a second printed name
          would sit on the place's own. Its name, its family and its pins are in its accessible name
          and in the table view. */}
      {node.kind === 'material' ? null : (
        <text
          x={x + 9}
          y={y + 4}
          strokeWidth={3}
          paintOrder="stroke"
          className={NODE_LABEL_CLASSES}
        >
          {node.label}
        </text>
      )}
      {pinBadgesFor(counts, x, y, node.id)}
    </g>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Lanes — the arcs between the nodes
 * ------------------------------------------------------------------------------------------- */

/**
 * The path of one lane, curved so two lanes between the same places stay visible.
 *
 * The control point sits above the higher end of the pair, which bends every arc the same way and
 * keeps the drawing stable: no random offset, no clock and no layout measurement is read.
 *
 * @param from The upstream endpoint, projected.
 * @param to The downstream endpoint, projected.
 * @returns The path data.
 */
function lanePathFor(
  from: readonly [number, number],
  to: readonly [number, number],
): string {
  const [fromX, fromY] = from;
  const [toX, toY] = to;
  const controlX = Math.round((fromX + toX) / 2);
  const controlY = Math.round(Math.min(fromY, toY) - Math.abs(toX - fromX) * 0.18);

  return `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
}

/* ---------------------------------------------------------------------------------------------
 * Overlay — the marks, the halos and the legend row drawn from the atlas payload
 * ------------------------------------------------------------------------------------------- */

/** A competitor site's mark: a hollow diamond, smaller than a first-party node's own mark. */
const COMPETITOR_SITE_RADIUS = 4;

/** The halo ring's radius, wide enough to read as an extent around a crossing. */
const HALO_RADIUS = 13;

/** The halo ring's stroke width. */
const HALO_STROKE = 2;

/** The dash pattern that distinguishes a halo from a place. */
const HALO_DASH = '4 3';

/**
 * One competitor network the overlay can paint: the network as the payload states it, and the slot
 * that selects the role it is drawn in.
 */
interface SlottedNetwork {
  /** The network as the payload states it. */
  readonly network: CompetitorNetwork;
  /** The `competitor-1/2/3` role that network's marks and its legend row take (§4.2). */
  readonly slot: CompetitorSlot;
}

/**
 * The competitor networks the overlay can paint, each with the slot its own identifier names.
 *
 * WHICH ROLE A COMPETITOR IS PAINTED IN IS ITS OWN RECORD'S ANSWER, NOT ITS POSITION'S. Specification
 * §4.2 gives three competitor hues, and the market-intelligence pack this build serves names its
 * competitors `CMP-01` to `CMP-03` (contracts §1), so the ordinal a hue is selected by travels on the
 * record. `competitorSlotOf` reads that ordinal and nothing else — the same lookup the radar's polygons,
 * this overlay's legend and the atlas network view resolve their colour through — so a payload that
 * lists its networks in another order repaints none of them, and one competitor is never drawn in two
 * hues by two surfaces reading two differently ordered lists.
 *
 * A NETWORK WITH NO SLOT IS LEFT OUT, NOT RECOLOURED. The identifier states no slot when it carries no
 * `CMP-` ordinal of its own, and the slot is already held when an earlier network in the payload names
 * it. Two networks in one hue and one shape would be indistinguishable and specification §4.2 defines
 * three roles and no fourth, so such a network is not drawn here at all: painting it in the accent would
 * present market intelligence as one of the client's own readings (rule P-5), and painting it in a
 * neighbour's hue would misattribute every mark of it. It is drawn again as soon as the payload names a
 * slot no other network holds.
 *
 * The marks and the legend both read this one function, so a row is never printed for a network the
 * drawing left out and never omitted for one it painted.
 *
 * @param overlay The atlas payload.
 * @returns One entry per drawable network, in the payload's order.
 */
function slottedNetworksOf(overlay: Atlas): readonly SlottedNetwork[] {
  const slotted: SlottedNetwork[] = [];
  const slotsInUse = new Set<CompetitorSlot>();

  for (const network of overlay.competitors) {
    const slot = competitorSlotOf(network.competitorId);

    if (slot === null || slotsInUse.has(slot)) {
      continue;
    }

    slotsInUse.add(slot);
    slotted.push({ network, slot });
  }

  return slotted;
}

/**
 * The competitor networks of the atlas payload, drawn as hollow marks in the three competitor roles.
 *
 * Only the atlas payload reaches this far: a first-party node is drawn from the topology and never from
 * here, so a market-intelligence position can never be painted as one of the client's own sites (rule
 * P-5). The group's own name repeats the imported market-intelligence label, so the marks are named as
 * what they are wherever they are read, and nothing in the group carries a figure or a count. The role a
 * network's marks are stroked in is {@link slottedNetworksOf}'s answer, so it follows the competitor's
 * own identifier rather than the position the payload lists it in.
 *
 * @param overlay The atlas payload.
 * @param projection The projection in use.
 * @returns The competitor marks, or `null` when no network in the payload can be painted.
 */
function competitorMarksFor(overlay: Atlas, projection: GeoProjection): ReactNode {
  const networks = slottedNetworksOf(overlay);

  if (networks.length === 0) {
    return null;
  }

  return (
    <g
      role="group"
      aria-label={`${MARKET_INTELLIGENCE_LABEL}: ${MAP_CANVAS_TEXT.competitorGroupSuffix}`}
    >
      {networks.map(({ network, slot }) => (
        <g key={network.competitorId} aria-hidden="true">
          {network.sites.map((site: AtlasSite) => {
            const point = projectPoint(projection, site.longitude, site.latitude);

            if (point === undefined) {
              return null;
            }

            const [x, y] = point;

            return (
              <polygon
                key={site.id}
                points={`${x},${y - COMPETITOR_SITE_RADIUS} ${x + COMPETITOR_SITE_RADIUS},${y} ${x},${y + COMPETITOR_SITE_RADIUS} ${x - COMPETITOR_SITE_RADIUS},${y}`}
                strokeWidth={2}
                className={joinClassNames(
                  COMPETITOR_SITE_CLASSES,
                  CHART_TONE_CLASSES[`competitor-${slot}`].stroke,
                )}
              />
            );
          })}
        </g>
      ))}
    </g>
  );
}

/**
 * The chokepoint halos of the atlas payload: a ring, the crossing's own name and the imported
 * market-intelligence label.
 *
 * The halo is a ring plus a dash rather than a filled mark, so it is read as an extent around a place
 * and never as one of the client's own sites; its label carries the fixed market-intelligence string,
 * so a reader cannot mistake the contention for a first-party finding (rule P-5, rule P-1).
 *
 * @param halos The crossings, already resolved to positions.
 * @returns The halos, or `null` when the payload places none.
 */
function halosFor(halos: readonly ChokepointHalo[]): ReactNode {
  if (halos.length === 0) {
    return null;
  }

  return (
    <g role="group" aria-label={MARKET_INTELLIGENCE_LABEL}>
      {halos.map((halo) => (
        <g key={halo.id}>
          <circle
            cx={halo.x}
            cy={halo.y}
            r={HALO_RADIUS}
            strokeWidth={HALO_STROKE}
            strokeDasharray={HALO_DASH}
            className={HALO_RING_CLASSES}
          />
          <text
            x={halo.x + HALO_RADIUS + 4}
            y={halo.y - 2}
            strokeWidth={3}
            paintOrder="stroke"
            className={HALO_LABEL_CLASSES}
          >
            {halo.label}
          </text>
          <text
            x={halo.x + HALO_RADIUS + 4}
            y={halo.y + 12}
            strokeWidth={3}
            paintOrder="stroke"
            className={HALO_CAPTION_CLASSES}
          >
            {MARKET_INTELLIGENCE_LABEL}
          </text>
        </g>
      ))}
    </g>
  );
}

/**
 * The legend entries the overlay contributes: one per competitor network, each carrying the imported
 * market-intelligence label and the competitor name tag the shared legend adds.
 *
 * `./legend.tsx` owns both of those strings and prints them, so this component supplies the record's own
 * name and the slot its colour comes from, and nothing else. Which networks contribute is
 * {@link slottedNetworksOf}'s decision, the one the marks are drawn from as well, so a row never
 * describes a mark the map left out and a painted network never goes unlisted; the row's `index` is that
 * same slot, so the swatch beside the name and the marks on the map are one token on one record.
 *
 * @param overlay The atlas payload.
 * @returns One entry per drawable competitor network.
 */
function competitorLegendEntries(overlay: Atlas): readonly LegendEntry[] {
  return slottedNetworksOf(overlay).map(
    ({ network, slot }): LegendEntry => ({
      kind: 'competitor',
      id: network.competitorId,
      label: network.label,
      index: slot,
      simLabel: MARKET_INTELLIGENCE_LABEL,
    }),
  );
}

/* ---------------------------------------------------------------------------------------------
 * Layout — the lens's own box, its controls and its surface
 * ------------------------------------------------------------------------------------------- */

/** The lens: the controls above, the map below, the legend and the drawer beside them. */
const ROOT_CLASSES = 'flex min-w-0 flex-col gap-3';

/** The control row: the zoom group on the start side, the preset group on the end side. */
const CONTROLS_CLASSES = 'flex min-w-0 flex-wrap items-center justify-between gap-3';

/** One group of controls, wrapping rather than overflowing at a narrow width. */
const CONTROL_GROUP_CLASSES = 'flex min-w-0 flex-wrap items-center gap-1';

/** The zoom level's visible caption, in the secondary text role. */
const CAPTION_CLASSES = 'px-1 text-13 text-text-secondary';

/**
 * A view preset's control: the application's control structure and secondary appearance, plus the
 * pressed treatment.
 *
 * The pressed treatment is expressed through `aria-pressed`, which is also what tells assistive
 * technology which of the five views is on screen — the fill and the boundary change for a reader who
 * can see it, and the pressed state is carried for a reader who cannot, so the choice is never conveyed
 * by colour alone (rule B-3).
 */
const PRESET_CLASSES = [
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
  'aria-pressed:border-accent aria-pressed:bg-surface-1 aria-pressed:font-semibold',
].join(' ');

/**
 * The map's own surface: the first raised surface inside the decorative hairline at the card radius,
 * with no elevation — the token layer exposes no shadow utility to add (specification §4.3).
 *
 * `block h-auto w-full` lets the drawing scale with its container from the fixed view box, so the map
 * fills whatever width the screen gives the lens and keeps its proportions at every width.
 */
const CANVAS_CLASSES = 'block h-auto w-full rounded-card border border-hairline bg-surface-1';

/** The land: the map-land role, inside the decorative hairline the borders are drawn with. */
const COUNTRY_CLASSES = 'fill-map-land stroke-hairline';

/** The stroke of a country border, hairline-thin so the land still reads as land. */
const COUNTRY_STROKE = 0.6;

/** The stroke of a first-party lane. */
const LANE_STROKE = 1;

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * What the canvas screen hands the map lens: the topology it read through the port, the atlas
 * payload when S3 supplies one, and the controls' state — zoom level, view preset and selected
 * node — together with the handlers that report a reader's change. Every one of those is
 * controlled rather than held here, so the graph lens beside the map is told the same level and
 * the same selection (specification §6.2), and the mapper is required because a node drawn without
 * one would be a mark a reader cannot inspect.
 */
export interface MapCanvasProps {
  /**
   * The topology the lens draws: the five node families, the lanes joining them and the pin counts of
   * each node.
   *
   * It arrives from the screen, which reads it through the typed service interface; this component
   * performs no data access of its own (rule P-2).
   */
  readonly topology: Topology;

  /** The surface's name, used as the map's accessible name so several surfaces are told apart. */
  readonly title: string;

  /** The zoom level on screen. Controlled: the screen owns it and the graph lens shares it. */
  readonly zoomLevel: MapZoomLevel;

  /** Called with the level the reader asked for when a zoom control is activated. */
  readonly onZoomLevelChange: (level: MapZoomLevel) => void;

  /** The view preset on screen. Controlled for the same reason as the zoom level. */
  readonly viewPreset: MapViewPreset;

  /** Called with the preset the reader asked for when a preset control is activated. */
  readonly onViewPresetChange: (preset: MapViewPreset) => void;

  /** The node the screen holds as selected, if any, so both lenses can ring it. */
  readonly selectedNodeId?: string | undefined;

  /** Called with a node's identifier when the reader activates it. The screen owns the selection. */
  readonly onSelectNode: (nodeId: string) => void;

  /**
   * The atlas payload of stage S3, when the screen has one: the competitor networks and the shared
   * crossings drawn over the client's own network. Absent, the lens draws first-party nodes only.
   */
  readonly overlay?: Atlas | undefined;

  /**
   * Resolves the evidence reference a node's figures open, or `undefined` for a node no record stands
   * behind. Required.
   *
   * REQUIRED BECAUSE A NODE MAY NOT LOSE ITS EVIDENCE SILENTLY. AAP 0.2.1 F12 opens the evidence
   * drawer from "any figure, chart mark, node, arc or pin", so a lens that could be composed without
   * stating how its nodes' evidence opens would leave the reader a mark they cannot inspect. The
   * obligation belongs to the caller, because only the caller knows which record it drew.
   *
   * WHAT A RETURNED REFERENCE MUST BE. One the service's `getEvidence` read resolves, which selects a
   * family by its own shape and looks the record up by its exact identifier: the composed aggregates
   * (`overview:`, `canvas:`), an atlas series (`atlas:`), the nine record families `PPAP-`, `EXC-`,
   * `SCN-`, `APR-`, `AUD-`, `PIN-`, `DOC-`, `CO-` and `PO-`, the policy family `POL-`, the seven node
   * families a canvas node can name — `PLT-`, `SUP-`, `ORG-`, `CUS-`, `MAT-`, `LN-` and `PRD-` — and a
   * declared outbound endpoint by the endpoint string its ledger row states. A topology node's identifier
   * is the identifier of the record behind it, so the node the caller drew resolves to that record; a
   * `PIN-` reference attached to the node resolves to the pin whose `EvidencePin.nodeRef` names it.
   *
   * `undefined` IS AN ANSWER, AND AN HONEST ONE. It says no record stands behind this node. Activating
   * the node still reports the selection to the screen, and it opens no dialog — never a drawer shown
   * for a record it was not given (rule P-8).
   */
  readonly evidenceRefForNode: (node: TopologyNode) => string | undefined;
}

/**
 * The map lens: the bundled world, the client's network over it and, when the atlas payload is
 * supplied, the competitors' networks and the shared crossings.
 *
 * The projection, the country path, the placed nodes, the lanes, the competitor marks, the halos and
 * the legend entries are each derived from the props by a pure function and memoised on the props they
 * depend on, so changing a selection does not re-project the world and changing the zoom re-projects
 * everything once. No effect is used and nothing is stored but the evidence drawer's own open
 * reference: the lens holds no data, keeps no selection of its own and reads no clock.
 *
 * @param props The topology, the controlled zoom and preset, the shared selection, the required
 *   mapper that resolves each node's evidence reference, and the optional atlas overlay. See
 *   {@link MapCanvasProps}.
 * @returns The lens, ready to be composed inside `./chart-frame.tsx` by the canvas screen.
 */
export function MapCanvas({
  topology,
  title,
  zoomLevel,
  onZoomLevelChange,
  viewPreset,
  onViewPresetChange,
  selectedNodeId,
  onSelectNode,
  overlay,
  evidenceRefForNode,
}: MapCanvasProps): ReactElement {
  const [openEvidenceRef, setOpenEvidenceRef] = useState<string | null>(null);
  const drawerId = useId();

  const projection = useMemo(
    () => projectionFor(viewPreset, zoomLevel),
    [viewPreset, zoomLevel],
  );
  const countryPaths = useMemo(() => countryPathsFor(projection), [projection]);
  const placed = useMemo(() => placedNodesOf(topology, projection), [topology, projection]);

  const lanePaths = useMemo(() => {
    const points = new Map<string, readonly [number, number]>();

    for (const node of placed) {
      points.set(node.node.id, [node.x, node.y]);
    }

    return topology.lanes
      .map((lane) => {
        const from = points.get(lane.fromId);
        const to = points.get(lane.toId);

        if (from === undefined || to === undefined) {
          return null;
        }

        return { key: `${lane.fromId}->${lane.toId}`, path: lanePathFor(from, to) };
      })
      .filter((entry): entry is { key: string; path: string } => entry !== null);
  }, [placed, topology]);

  const competitorMarks = useMemo(
    () => (overlay === undefined ? null : competitorMarksFor(overlay, projection)),
    [overlay, projection],
  );
  const halos = useMemo(
    () => (overlay === undefined ? [] : halosOf(overlay, projection)),
    [overlay, projection],
  );
  const legendEntries = useMemo(
    () => (overlay === undefined ? [] : competitorLegendEntries(overlay)),
    [overlay],
  );

  const zoomPosition = MAP_ZOOM_LEVELS.indexOf(zoomLevel);
  const widerLevel = zoomPosition > 0 ? MAP_ZOOM_LEVELS[zoomPosition - 1] : undefined;
  const closerLevel =
    zoomPosition >= 0 && zoomPosition < MAP_ZOOM_LEVELS.length - 1
      ? MAP_ZOOM_LEVELS[zoomPosition + 1]
      : undefined;

  /**
   * Reports a node's selection and opens the evidence the caller resolved for it.
   *
   * A node the mapper cannot resolve closes whatever drawer was open rather than leaving another
   * node's evidence on screen beside a newly selected node.
   */
  function activateNode(node: TopologyNode): void {
    onSelectNode(node.id);
    setOpenEvidenceRef(evidenceRefForNode(node) ?? null);
  }

  return (
    <div className={ROOT_CLASSES}>
      <div className={CONTROLS_CLASSES}>
        <div className={CONTROL_GROUP_CLASSES} role="group" aria-label={MAP_CANVAS_TEXT.zoomGroupLabel}>
          {widerLevel === undefined ? (
            <ActionButton
              disabled
              disabledReason={MAP_CANVAS_TEXT.zoomAtWidestReason}
            >
              {MAP_CANVAS_TEXT.zoomOutLabel}
            </ActionButton>
          ) : (
            <ActionButton
              onClick={() => {
                onZoomLevelChange(widerLevel);
              }}
            >
              {MAP_CANVAS_TEXT.zoomOutLabel}
            </ActionButton>
          )}
          <span className={CAPTION_CLASSES}>
            {MAP_CANVAS_TEXT.zoomCaption} {zoomLevel} / {MAP_ZOOM_LEVELS.length}
          </span>
          {closerLevel === undefined ? (
            <ActionButton
              disabled
              disabledReason={MAP_CANVAS_TEXT.zoomAtClosestReason}
            >
              {MAP_CANVAS_TEXT.zoomInLabel}
            </ActionButton>
          ) : (
            <ActionButton
              onClick={() => {
                onZoomLevelChange(closerLevel);
              }}
            >
              {MAP_CANVAS_TEXT.zoomInLabel}
            </ActionButton>
          )}
        </div>
        <div className={CONTROL_GROUP_CLASSES} role="group" aria-label={MAP_CANVAS_TEXT.presetGroupLabel}>
          {MAP_VIEW_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={viewPreset === preset}
              className={PRESET_CLASSES}
              onClick={() => {
                onViewPresetChange(preset);
              }}
            >
              {MAP_VIEW_PRESET_LABELS[preset]}
            </button>
          ))}
        </div>
      </div>

      <svg
        className={CANVAS_CLASSES}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={title}
      >
        <g aria-hidden="true">
          <path
            d={countryPaths}
            strokeWidth={COUNTRY_STROKE}
            className={COUNTRY_CLASSES}
          />
        </g>
        <g aria-hidden="true">
          {lanePaths.map((lane) => (
            <path key={lane.key} d={lane.path} strokeWidth={LANE_STROKE} className={LANE_CLASSES} />
          ))}
        </g>
        {competitorMarks}
        {halosFor(halos)}
        <g role="group" aria-label={MAP_CANVAS_TEXT.nodesGroupLabel}>
          {placed.map((entry) =>
            nodeElement(
              entry,
              topology.pinsByNode[entry.node.id],
              entry.node.id === selectedNodeId,
              evidenceRefForNode(entry.node) !== undefined,
              () => {
                activateNode(entry.node);
              },
            ),
          )}
        </g>
      </svg>

      {legendEntries.length === 0 ? null : (
        <Legend entries={legendEntries} />
      )}

      {openEvidenceRef === null ? null : (
        <EvidenceDrawer
          id={drawerId}
          evidenceRef={openEvidenceRef}
          onClose={() => {
            setOpenEvidenceRef(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Concatenates the class names that are present, so an omitted name leaves no trailing space behind.
 *
 * @param values The class names, any of which may be absent.
 * @returns The names joined by a single space.
 */
function joinClassNames(...values: readonly (string | undefined)[]): string {
  return values.filter((value) => value !== undefined && value !== '').join(' ');
}
