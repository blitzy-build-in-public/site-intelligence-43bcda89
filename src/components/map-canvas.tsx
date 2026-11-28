/**
 * The map lens of the FileMap canvas: the client's own network and, when stage S3's atlas payload is
 * supplied, the competitors' networks and the shared crossings, drawn over one world map.
 *
 * It implements AAP 0.5.2's `MapCanvas` row — a typed topology prop with the selection callbacks,
 * projected by `d3-geo` over the bundled boundaries — and the map half of AAP 0.12.4's SCR-12 row: three
 * zoom levels and five view presets over one network, with the selection carried across to the graph
 * lens. The world comes from a boundary file imported as a module rather than fetched, so the drawing
 * addresses no tile server and no CDN (rule B-1, acceptance test T-20).
 *
 * WHAT THE SCREEN OWNS AND WHAT THIS COMPONENT OWNS. The zoom level, the view preset and the selection
 * are controlled props with their change handlers, so the screen holds them and the graph lens beside
 * this map is told the same level and rings the same node. Where the frame sits is the drawing's own: a
 * reader pans it with the pointer or the arrow keys and "Reset view" returns it, because nothing outside
 * this surface reads that position. Node and lane geometry is a pure function of the props, so two
 * renders of the same props draw the same map.
 *
 * THE FRAME IS FITTED TO THE MARKS, NOT FIXED IN ADVANCE, so no drawn node is left outside it.
 * {@link fittedProjectionFor} states how the fit is taken, what each preset contributes and why
 * every drawn node must stay reachable.
 *
 * MEANING IS NEVER CARRIED BY COLOUR ALONE (rule B-3): each of the five node families has its own marker
 * shape, every node carries an accessible name that spells out its evidence pins, and the key under the
 * drawing names every pin state the view carries.
 */
import { geoEqualEarth, geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import { useId, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
} from 'react';

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
import { meaningOf, PENDING_CLOCK_ICON, StatusIndicator } from './status-indicator';
import {
  LABEL_CLEARANCE,
  SVG_LABEL_CHARACTER_WIDTH,
  SVG_LABEL_TEXT_METRICS,
  markObstacleOf,
  placeBoxes,
  placeLabels,
} from './svg-label';
import type {
  BoxFit,
  BoxRequest,
  LabelBox,
  LabelFit,
  LabelObstacle,
  LabelPlacement,
  LabelRequest,
} from './svg-label';
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
  /**
   * The caption that introduces the pin-state key under the drawing, worded exactly as the graph lens
   * words its own, so one sentence describes the pins of both lenses.
   */
  pinKeyLabel: 'Pin states in this view',
  /** The competitor overlay's group name, prefixed by the imported market-intelligence label. */
  competitorGroupSuffix: 'competitor sites',
  /** The pan group's name, read before the control that returns the frame to its starting position. */
  panGroupLabel: 'Map position',
  /** The stated way to pan the map, printed under the drawing and read as the region's description. */
  panInstruction: 'Drag the map, or use the arrow keys while the map has focus, to pan it.',
  /** The control that puts the frame back where it started. */
  resetLabel: 'Reset view',
  /** Why the reset control cannot act: the frame is already where it started. */
  resetAtStartReason: 'The map is already in its starting position.',
  /** The prefix of the caption naming the node the screen holds as selected, followed by its label. */
  selectedCaption: 'Selected',
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
 * One point in the drawing's own coordinates: the view-box units every mark is placed in.
 *
 * A press arrives in client pixels and is answered in these units, and a mark's own centre is stated in
 * them, so the two spaces never have to be compared through the browser's hit test (rule P-8).
 */
interface DrawingPoint {
  /** The horizontal coordinate, which grows to the right of the frame's origin. */
  readonly x: number;
  /** The vertical coordinate, which grows downwards from the frame's origin. */
  readonly y: number;
}

/**
 * The room the fitted frame keeps clear on every side of the view box, in view-box units.
 *
 * The fit puts the centre of every mark inside the inset this constant leaves, so the geometry drawn
 * around a mark stays inside the frame as well: a material's orbit is 22 units from its site's own point,
 * the selection, focus and pointer rings are 11 units out, and a pin badge row sits 16 units above the
 * mark, which one symmetric inset of 48 clears. A node's printed label still runs to the right of its mark,
 * so a label on the frame's own edge can extend past it exactly as it does at any scale; what is held
 * inside the frame is the mark itself, which is the thing a reader selects.
 */
const MAP_FIT_PADDING = 48;

/** The box the fitted frame lays the network out inside: the view box, inset by {@link MAP_FIT_PADDING}. */
const MAP_FIT_EXTENT: Parameters<GeoProjection['fitExtent']>[0] = [
  [MAP_FIT_PADDING, MAP_FIT_PADDING],
  [MAP_WIDTH - MAP_FIT_PADDING, MAP_HEIGHT - MAP_FIT_PADDING],
];

/**
 * One preset's framing: the meridian and parallel its centre sits on, the region it frames, and the
 * scale it falls back to when the payload states no position the frame could be fitted to.
 *
 * The centre and the region are what make a preset the region it names. The scale is a fallback only:
 * the frame is otherwise fitted to the marks the payload draws, so the same preset follows a network
 * that grows or a scope that narrows instead of leaving marks outside the frame. The current framing
 * and the reason for it are stated in {@link projectionFor}.
 */
interface ProjectionFraming {
  /** The centre of the framed region, in degrees of longitude and latitude. */
  readonly center: readonly [number, number];
  /**
   * The region the preset frames, as `[west, south, east, north]` in degrees, or absent for the preset
   * that frames whatever the payload draws rather than a region of its own.
   */
  readonly extent?: readonly [number, number, number, number];
  /** The projection's scale when the payload states no position the frame can be fitted to. */
  readonly scale: number;
}

/**
 * The framing each of the five presets applies, in {@link MAP_VIEW_PRESETS} order.
 *
 * The world preset states no region, so it frames the network the payload draws and nothing else. The
 * four regional presets state the region each is named for, which the fit takes in beside the marks, so
 * the region a reader chose stays inside the frame; a network that reaches past that region widens the
 * frame around both rather than pushing a mark out of it.
 */
const PRESET_FRAMINGS: Record<MapViewPreset, ProjectionFraming> = {
  world: { center: [10, 5], scale: 170 },
  europe: { center: [16, 50], extent: [-25, 34, 45, 71], scale: 700 },
  americas: { center: [-72, 8], extent: [-130, -35, -30, 62], scale: 330 },
  'asia-pacific': { center: [112, 4], extent: [60, -50, 180, 62], scale: 400 },
  'africa-middle-east': { center: [28, 14], extent: [-20, -35, 60, 40], scale: 460 },
};

/**
 * How much closer each zoom level draws than the level below it.
 *
 * A factor multiplies the fitted frame's scale and moves its translation about the point that frame's
 * marks project to (see {@link drawnMarkCentreOf}), so the three levels are visibly distinct at every
 * preset, and the same factor widens the distance the frame may be panned by (see {@link panLimitsOf}),
 * so the marks a closer level carries past the frame's edge stay reachable.
 */
const ZOOM_FACTORS = { 1: 1, 2: 1.7, 3: 2.8 } as const satisfies Record<MapZoomLevel, number>;

/** One coordinate of a drawn mark: a longitude and a latitude in degrees, in that order. */
type MarkCoordinate = readonly [number, number];

/** The four corners of one preset's region, as coordinates the fit takes in beside the payload's marks. */
function regionCornersOf(
  extent: readonly [number, number, number, number],
): readonly MarkCoordinate[] {
  const [west, south, east, north] = extent;

  return [
    [west, south],
    [west, north],
    [east, south],
    [east, north],
  ];
}

/**
 * Whether a set of coordinates states no position a frame could be fitted to: a fit divides by the span of
 * what it is given, so a single mark — or a network whose every mark sits on one point — would ask for an
 * infinitely close frame, and such a payload falls back to the preset's own scale instead.
 */
function spansNoArea(coordinates: readonly MarkCoordinate[]): boolean {
  const [first, ...rest] = coordinates;

  if (first === undefined) {
    return true;
  }

  return rest.every(([longitude, latitude]) => longitude === first[0] && latitude === first[1]);
}

/**
 * The projection a preset falls back to when the payload states no position to fit a frame to: the preset's
 * own centre and scale about the middle of the view box, at the widest zoom level. A zoom multiplies it
 * exactly as it multiplies a fitted one, so the widest level always draws the preset's own scale.
 */
function presetFramingOf(preset: MapViewPreset): GeoProjection {
  const framing = PRESET_FRAMINGS[preset];

  return geoEqualEarth()
    .center([framing.center[0], framing.center[1]])
    .scale(framing.scale)
    .translate([VIEW_BOX_CENTER[0], VIEW_BOX_CENTER[1]]);
}

/**
 * The point a zoom level magnifies the frame about: where the marks the fit enclosed end up once that
 * fit has projected them, averaged.
 *
 * WHY THE NETWORK'S OWN CENTRE AND NOT THE MIDDLE OF THE BOX IT WAS FITTED INTO. A fit frames the *extent*
 * of its marks, not their distribution, so the middle of the fitted box can be empty water: magnifying about
 * it carries nearly every mark across the frame's edge at once, and no panning brings the network back, while
 * the marks' own centre of mass keeps the cluster the network is made of in the frame at every level.
 *
 * The answer is geometry, not a measurement: every mark is projected through the very projection the fit
 * produced, so the same payload and preset always pick the same anchor. A payload that draws no mark at all
 * falls back to the middle of the view box, which the fallback framing is already centred on.
 *
 * @param projection The frame the marks were fitted to, at the widest zoom level.
 * @param marks The coordinates of every mark the payload draws.
 * @returns The anchor point, in view-box units.
 */
function drawnMarkCentreOf(
  projection: GeoProjection,
  marks: readonly MarkCoordinate[],
): readonly [number, number] {
  let totalX = 0;
  let totalY = 0;
  let projected = 0;

  for (const [longitude, latitude] of marks) {
    const point = projection([longitude, latitude]);

    if (point === null) {
      continue;
    }

    totalX += point[0];
    totalY += point[1];
    projected += 1;
  }

  return projected === 0 ? VIEW_BOX_CENTER : [totalX / projected, totalY / projected];
}

/**
 * Magnifies a projection about one point of the view box, which is how the three zoom levels step.
 *
 * The scale is multiplied and the translation is moved away from the anchor by the same factor, so the
 * anchor stays where it is and everything around it grows. The widest level's factor is one and the
 * projection is returned untouched, so the widest frame is exactly the frame the fit produced.
 *
 * @param projection The fitted projection, which this mutates; every caller passes a frame it has just
 *   built, so no memoised projection is ever magnified twice.
 * @param zoomLevel The level to magnify it to.
 * @param centre The point to magnify about, in view-box units.
 * @returns The same projection, magnified.
 */
function magnifyAbout(
  projection: GeoProjection,
  zoomLevel: MapZoomLevel,
  centre: readonly [number, number],
): GeoProjection {
  const factor = ZOOM_FACTORS[zoomLevel];

  if (factor === 1) {
    return projection;
  }

  const [translateX, translateY] = projection.translate();

  return projection.scale(projection.scale() * factor).translate([
    centre[0] - (centre[0] - translateX) * factor,
    centre[1] - (centre[1] - translateY) * factor,
  ]);
}

/**
 * Builds the frame one preset fits to the marks the payload draws, at the widest zoom level.
 *
 * Equal Earth is used because it keeps the areas of the regions the network spans comparable, which a
 * Mercator projection does not at the latitudes the client's plants and tier-2 origins sit at.
 *
 * THE FRAME FOLLOWS THE DATA, AND THAT IS THE POINT. The preset supplies its centre and, for the four
 * regional presets, the region it is named for, while the scale and the translation are fitted by
 * `fitExtent` over a `MultiPoint` of the marks — every node of the five families, the competitor sites the
 * overlay paints and the crossings that state their own position — inset by {@link MAP_FIT_PADDING} so the
 * geometry drawn around a mark stays inside the box. Every drawn node must stay reachable: a mark projected
 * outside the view box is a node a reader cannot select, which AAP 0.12.4's SCR-12 row and T-19's selection
 * of the named materials and supplier both require. A regional preset fits its region beside those marks, so
 * it holds that region and the whole network together: the region stays inside the frame, and a network
 * reaching past it is framed loosely rather than clipped.
 *
 * The result is a pure function of its two arguments: no state, no clock, no random source and no
 * measurement of the rendered box, so the same payload and the same preset always draw the same map. It
 * returns a fresh projection on every call, because {@link magnifyAbout} mutates the frame it is given.
 *
 * @param preset The preset to frame.
 * @param marks The coordinates of every mark the payload draws.
 * @returns The projection the widest level draws the country shapes and the node coordinates through.
 */
function fittedProjectionFor(
  preset: MapViewPreset,
  marks: readonly MarkCoordinate[],
): GeoProjection {
  const framing = PRESET_FRAMINGS[preset];
  const fitted: readonly MarkCoordinate[] =
    framing.extent === undefined ? marks : [...marks, ...regionCornersOf(framing.extent)];

  if (spansNoArea(fitted)) {
    return presetFramingOf(preset);
  }

  const target: Parameters<GeoProjection['fitExtent']>[1] = {
    type: 'MultiPoint',
    coordinates: fitted.map(([longitude, latitude]) => [longitude, latitude]),
  };

  return geoEqualEarth()
    .center([framing.center[0], framing.center[1]])
    .fitExtent(MAP_FIT_EXTENT, target);
}

/**
 * The projection one preset draws through at one zoom level: the frame fitted to the marks the payload
 * draws, magnified about the point those marks project to.
 *
 * The anchor is supplied by the caller rather than derived here, so the component can memoise it on the
 * payload and the preset alone while this call is memoised on the zoom level as well: a pan, a selection
 * or an evidence drawer opening projects nothing and picks no anchor again.
 *
 * @param preset The preset to frame.
 * @param zoomLevel The zoom level to magnify the fitted frame to.
 * @param marks The coordinates of every mark the payload draws.
 * @param centre The point to magnify about, in view-box units, from {@link drawnMarkCentreOf}.
 * @returns The projection the country shapes and the node coordinates are drawn through.
 */
function projectionFor(
  preset: MapViewPreset,
  zoomLevel: MapZoomLevel,
  marks: readonly MarkCoordinate[],
  centre: readonly [number, number],
): GeoProjection {
  return magnifyAbout(fittedProjectionFor(preset, marks), zoomLevel, centre);
}

/**
 * The coordinates of every mark the payload draws, which is what the frame is fitted to.
 *
 * All five node families are collected, materials included: a material sits at the site its supplier ships
 * from, so its coordinate is that site's, and the ring the drawing offsets it around is covered by
 * {@link MAP_FIT_PADDING}. The competitor sites the overlay paints and every crossing that states its own
 * position join them, so a competitor mark or a halo cannot fall outside the frame either; a crossing with
 * no position of its own sits at the middle of a lane between two such sites, which the fit encloses.
 *
 * @param topology The topology the lens draws.
 * @param overlay The atlas payload, when the screen holds one.
 * @returns One coordinate per drawn mark, in the order the payloads state them.
 */
function drawnMarkCoordinatesOf(
  topology: Topology,
  overlay: Atlas | undefined,
): readonly MarkCoordinate[] {
  const coordinates: MarkCoordinate[] = [];
  const families: readonly (readonly TopologyNode[])[] = [
    topology.plants,
    topology.suppliers,
    topology.materials,
    topology.origins,
    topology.customers,
  ];

  for (const family of families) {
    for (const node of family) {
      coordinates.push([node.longitude, node.latitude]);
    }
  }

  if (overlay === undefined) {
    return coordinates;
  }

  for (const { network } of slottedNetworksOf(overlay)) {
    for (const site of network.sites) {
      coordinates.push([site.longitude, site.latitude]);
    }
  }

  for (const crossing of placeableChokepointsOf(overlay)) {
    const stated = statedPositionOf(crossing);

    if (stated !== undefined) {
      coordinates.push(stated);
    }
  }

  return coordinates;
}

/** The shape `geoPath` accepts, taken from its own signature so no GeoJSON type is imported here. */
type GeoShape = Parameters<ReturnType<typeof geoPath>>[0];

/**
 * The bundled world boundaries: the Natural Earth 1:110m set of `src/assets/geo/countries-110m.json`,
 * the only geographic source this component has, converted from TopoJSON to GeoJSON once at module load.
 *
 * THE FILE IS IMPORTED AS A MODULE, NOT FETCHED. Vite compiles it into the bundle, so the built output
 * addresses no tile server, no boundary host and no CDN and a reader's browser makes no request while the
 * map renders; there is no `Image`, no `<use>` element pointing outside the document and no basemap
 * address, and the component suite proves it by spying on `fetch` (rule B-1, acceptance test T-20).
 * Nothing here reads configuration or a credential to reach it (rule B-2).
 *
 * `topojson-client`'s `feature` reads the file's own `countries` object and returns the collection the path
 * generator draws. The two casts are deliberate: the imported JSON carries the file's literal types while
 * `feature` is declared against the TopoJSON specification's own shapes, and no second geographic source is
 * introduced to bridge them.
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
 * The words a pin state is stated with: beside a numeral in a node's pin summary, and in the key
 * printed under the drawing.
 *
 * The order the six states are listed in, and the word a node's family is named by, are shared with
 * every other graph surface and live in `./graph-vocabulary.ts`. What stays here is this component's
 * own wording for the six states rather than a specification string: the shared mapping in
 * `./status-indicator.tsx` owns what a state looks like, and this map owns only the words a reader
 * hears beside a numeral and meets again in the key.
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
 * The ring a node shows while the pointer is over it or a press is held on it: the accent role — the one
 * specification §4.1 gives first-party flows — at the same radius, drawn as its own element so neither
 * state out-ranks the other in the cascade.
 *
 * The selected node already draws a `focus-ring` ring at this radius, so a hover in that same role would
 * be invisible on the node a reader is most likely to point at. The accent never repaints the marker that
 * states the node's family, and `pointer-events-none` leaves the hit area as it was; `motion-safe:` gates
 * the fade, so a reduced-motion session gets the same states with no transition, and the theme layer
 * exposes no shadow to select (rule B-3).
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
 * The position a crossing states, when the payload states one.
 *
 * The market-intelligence pack records the crossing's own latitude and longitude for this lens, as
 * `src/seed/market-intelligence.ts` documents, but the shared `Chokepoint` shape the atlas payload is
 * declared with does not carry them. They are therefore read defensively: a crossing that states a
 * position is drawn there, and one that does not is anchored on the lane that names it (see
 * {@link laneEndpointsOf}). Nothing is invented for a crossing that states neither.
 */
interface ChokepointWithPosition extends Chokepoint {
  readonly latitude?: number;
  readonly longitude?: number;
}

/**
 * Projects one coordinate pair to whole drawing units, or returns `undefined` when the projection puts it
 * nowhere.
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
 * The longitude and latitude a crossing states for itself, in degrees, or `undefined` when it states none.
 */
function statedPositionOf(crossing: Chokepoint): MarkCoordinate | undefined {
  const stated = crossing as ChokepointWithPosition;

  if (typeof stated.longitude !== 'number' || typeof stated.latitude !== 'number') {
    return undefined;
  }

  return [stated.longitude, stated.latitude];
}

/**
 * The two sites of the first competitor lane that names a crossing, used when the crossing states no
 * position of its own.
 *
 * Only a competitor lane is walked: the crossing belongs to the market pack, so the position it is drawn at
 * comes from market-intelligence geometry and never from a first-party record (rule P-5). The lane is
 * resolved to its sites rather than to a point, so the same answer serves both the halo the drawing paints
 * and the enumeration {@link overlayMarksOf} publishes, and the halo and the table cannot disagree.
 *
 * @param overlay The atlas payload whose competitor networks are searched.
 * @param chokepointId The crossing to anchor.
 * @returns The lane's two sites, or `undefined` when no lane naming the crossing joins two sites the
 *   payload holds.
 */
function laneEndpointsOf(
  overlay: Atlas,
  chokepointId: string,
): readonly [AtlasSite, AtlasSite] | undefined {
  for (const network of overlay.competitors) {
    for (const lane of network.lanes) {
      if (lane.chokepointId !== chokepointId) {
        continue;
      }

      const from = network.sites.find((site) => site.id === lane.fromId);
      const to = network.sites.find((site) => site.id === lane.toId);

      if (from === undefined || to === undefined) {
        continue;
      }

      return [from, to];
    }
  }

  return undefined;
}

/**
 * The crossings the drawing can place: those that state a position of their own, and those a competitor
 * lane anchors between two sites the payload holds.
 *
 * A crossing with neither is left out rather than placed at a guessed coordinate, because a halo at the
 * wrong place would misstate where the contention is.
 *
 * @param overlay The atlas payload.
 * @returns One crossing per placeable crossing, in the payload's order.
 */
function placeableChokepointsOf(overlay: Atlas): readonly Chokepoint[] {
  return overlay.chokepoints.filter(
    (crossing) =>
      statedPositionOf(crossing) !== undefined ||
      laneEndpointsOf(overlay, crossing.id) !== undefined,
  );
}

/**
 * The midpoint of a lane's two sites, projected and rounded, where a crossing that states no position is
 * anchored.
 */
function laneMidpointOf(
  endpoints: readonly [AtlasSite, AtlasSite],
  projection: GeoProjection,
): readonly [number, number] | undefined {
  const [fromSite, toSite] = endpoints;
  const from = projectPoint(projection, fromSite.longitude, fromSite.latitude);
  const to = projectPoint(projection, toSite.longitude, toSite.latitude);

  if (from === undefined || to === undefined) {
    return undefined;
  }

  return [Math.round((from[0] + to[0]) / 2), Math.round((from[1] + to[1]) / 2)];
}

/**
 * Every placeable chokepoint of the atlas payload, resolved to the position its halo is drawn at.
 *
 * A crossing whose `latitude` and `longitude` the payload states — the pair `Chokepoint` declares as its own
 * optional member, which the market-intelligence pack fills from its crossing record — is drawn at that
 * place; one that states neither is anchored on the competitor lane that names it.
 *
 * @param overlay The atlas payload.
 * @param projection The projection in use.
 * @returns One halo per placeable crossing, in the payload's order.
 */
function halosOf(overlay: Atlas, projection: GeoProjection): readonly ChokepointHalo[] {
  const halos: ChokepointHalo[] = [];

  for (const crossing of placeableChokepointsOf(overlay)) {
    const stated = statedPositionOf(crossing);
    const endpoints = laneEndpointsOf(overlay, crossing.id);
    const anchor =
      (stated === undefined ? undefined : projectPoint(projection, stated[0], stated[1])) ??
      (endpoints === undefined ? undefined : laneMidpointOf(endpoints, projection));

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
 * A material carries its primary supplier's site coordinates (`src/types/topology.ts`), so every material
 * bought from one supplier projects onto the same point; each is therefore drawn on a small ring around it,
 * the first straight up and the rest spaced evenly by their index among the materials at that pair, so two
 * marks never coincide and the map still shows one mark per record. The radius is fixed geometry and never a
 * measurement of the rendered box, so the same topology draws the same marks in every environment.
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
 * The five families in the order the drawing paints them.
 *
 * Customers are painted first and plants last so a plant's mark is never buried under the marks that feed
 * it, and materials before the origins and suppliers whose sites they share, so a place's own mark stays on
 * top of the material bought from it. The order is stated once, here, because the drawing and the caption
 * naming the selection both walk it.
 *
 * @param topology The topology payload.
 * @returns Its five families, in painting order.
 */
function familiesInPaintOrder(topology: Topology): readonly (readonly TopologyNode[])[] {
  return [
    topology.customers,
    topology.materials,
    topology.origins,
    topology.suppliers,
    topology.plants,
  ];
}

/**
 * The label the payload states for one node, or `undefined` when it holds no node with that identifier.
 *
 * The caption naming the selected node reads this rather than printing an identifier: a selection the
 * payload cannot name is one this lens cannot name either, and the caption then says nothing at all.
 *
 * @param topology The topology payload.
 * @param nodeId The identifier the screen holds as selected, or `undefined` for none.
 * @returns The node's own label, or `undefined`.
 */
function nodeLabelOf(topology: Topology, nodeId: string | undefined): string | undefined {
  if (nodeId === undefined) {
    return undefined;
  }

  for (const family of familiesInPaintOrder(topology)) {
    const found = family.find((node) => node.id === nodeId);

    if (found !== undefined) {
      return found.label;
    }
  }

  return undefined;
}

/**
 * Places every node of the five families, in the order the families are painted.
 *
 * The order within a family is the payload's own, so the same topology draws the same map twice. A node the
 * projection drops is left out rather than drawn at the origin, which would put a supplier in the wrong
 * ocean; a material is dropped with its supplier, because its site is the supplier's.
 *
 * @param topology The topology payload.
 * @param projection The projection in use.
 * @returns Every placeable node, in painting order.
 */
function placedNodesOf(topology: Topology, projection: GeoProjection): readonly PlacedNode[] {
  const placed: PlacedNode[] = [];
  const families = familiesInPaintOrder(topology);
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
 * The node a press at one point belongs to: the nearest mark centre within `radius`, or `null`.
 *
 * WHY THE NEAREST CENTRE AND NOT THE MARK PAINTED LAST. A node's target has to stay 24x24 px across
 * (rule B-3), while two records can be drawn nearer together than that — two plants in one region land
 * within one target's width of each other at the widest zoom level — so the invisible target of the node
 * painted later covers the mark a reader sees under the pointer and would take its press. Comparing the
 * press against the mark centres answers the question the reader is actually asking, "which mark did I
 * press", from the drawing's own geometry rather than from paint order, and that is what lets a press
 * perform the node it landed on (rule P-8).
 *
 * TWO MARKS AT ONE CENTRE ARE TOLD APART BY THEIR ORDER IN `marks`, WHICH IS THE ORDER THE DRAWING PAINTS
 * THEM: the strictly-nearer comparison keeps the earlier one, so the answer never depends on which node
 * happened to be compared first. A radius that is not positive, and a point the browser could not resolve
 * (a coordinate that is not a finite number), match nothing and yield `null`, which is what leaves a press
 * that lands clear of every mark to the node whose own control received it.
 *
 * THE KEYBOARD NEVER COMES HERE. `Enter` and `Space` on a focused node activate that node directly, because
 * focus has already chosen the mark and needs no hit-testing at all (rule B-3).
 *
 * @param marks Every node the frame placed, in the order the drawing paints them.
 * @param point The press, in the drawing's own coordinates.
 * @param radius How far from a mark's centre a press still belongs to it, in the same units.
 * @returns The nearest node within `radius`, or `null` when the press is clear of every one.
 */
export function nearestNodeMark(
  marks: readonly PlacedNode[],
  point: DrawingPoint,
  radius: number,
): PlacedNode | null {
  if (!(radius > 0) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null;
  }

  const limit = radius * radius;
  let nearest: PlacedNode | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const mark of marks) {
    const offsetX = mark.x - point.x;
    const offsetY = mark.y - point.y;
    const distance = offsetX * offsetX + offsetY * offsetY;

    /* Strictly nearer, so the first of two marks at one centre is the one answered. */
    if (distance <= limit && distance < nearestDistance) {
      nearest = mark;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * The name one node's control is drawn and registered under.
 *
 * A node's identifier names its record, and two families may name the same record, so the family is part of
 * the key: the drawing paints one control per topology node and the pointer resolves a press to one of
 * them, so the key has to tell them apart (rule P-8).
 *
 * @param node The node the control is drawn for.
 * @returns The control's key.
 */
function nodeKeyOf(node: TopologyNode): string {
  return `${node.kind}:${node.id}`;
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
 * The name carries the pin counts per state as well as the drawn badges do, because the badges are numerals
 * inside a control whose name replaces its contents for assistive technology: the name is what makes the
 * counts reach a reader who cannot see the badge at all (rule B-3).
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
 * The five shapes are drawn at the same size — a plant's square is 10 units on a side, each of the others
 * spans 6 units from its centre — so no family is emphasised by being bigger. The material's hexagon is a
 * sixth-sided mark rather than a variant of the four places, because a material is not a place: it is drawn
 * at the site it ships from, and its shape tells a reader it belongs to the supplier underneath it.
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

/**
 * The states a node carries a pin in, in the lens's own order.
 *
 * @param counts The node's counts, or `undefined` when the payload holds none.
 * @returns One entry per state carrying at least one pin; empty when the node carries none.
 */
function pinStatesOf(counts: PinCounts | undefined): readonly PinState[] {
  return counts === undefined ? [] : PIN_STATE_ORDER.filter((state) => counts[state] > 0);
}

/**
 * The size one node's badge row draws at: one chip per state the node holds a pin in, and the gaps
 * between them.
 *
 * @param counts The node's counts, or `undefined` when the payload holds none.
 * @returns The row's width and height, or `undefined` when the node carries no badge.
 */
function badgeRowSizeOf(
  counts: PinCounts | undefined,
): { readonly width: number; readonly height: number } | undefined {
  const present = pinStatesOf(counts);

  if (present.length === 0) {
    return undefined;
  }

  return { width: present.length * BADGE_WIDTH + (present.length - 1) * BADGE_GAP, height: BADGE_HEIGHT };
}

/**
 * The badges of one node: one chip per state the node carries a pin in, each printing that state's own
 * count, laid out from the corner the placement gave the row.
 *
 * No badge is painted for a state carrying none, and no chip total is printed: the counts are the payload's
 * own numbers, printed where they arrive (rule P-6). The row is `aria-hidden` because the node's accessible
 * name already states the same counts per state, and a numeral read out twice — once as a name and once as
 * loose text inside a control — is announced twice.
 *
 * WHERE THE ROW SITS IS COMPUTED, NOT FIXED. Two marks can stand at one point — a plant and a supplier in the
 * same city, two material records at one supplier's site — and a row at a fixed offset would print one node's
 * numerals over its neighbour's, where a count cannot be read. The row is placed as a box by
 * `./svg-label.ts`, clear of every other row, every mark and every crossing, and every name this drawing
 * prints is then placed clear of the row. Every node keeps all of its badges: a chip dropped to make room
 * would put the drawing at odds with the record it draws.
 *
 * @param counts The node's counts, or `undefined` when the payload holds none.
 * @param row Where the placement put the row, or `undefined` when the node carries no badge.
 * @param nodeId The node's identifier, used to key the chips.
 * @returns The badge row, or `null` when the node carries no pins.
 */
function pinBadgesFor(
  counts: PinCounts | undefined,
  row: LabelBox | undefined,
  nodeId: string,
): ReactNode {
  const present = pinStatesOf(counts);

  if (counts === undefined || row === undefined || present.length === 0) {
    return null;
  }

  return (
    <g aria-hidden="true">
      {present.map((state, index) => {
        const badgeX = row.x + index * (BADGE_WIDTH + BADGE_GAP);
        const badgeY = row.y;

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
 * Whether at least one node in the payload carries a pin in `state`, which is what decides whether the
 * key under the drawing has to explain that state's word. It reads the payload's own counts and prints
 * none of them.
 *
 * @param topology The topology the lens draws.
 * @param state The pin state to look for.
 * @returns `true` when some node counts at least one pin in that state.
 */
function statePresentIn(topology: Topology, state: PinState): boolean {
  return Object.values(topology.pinsByNode).some((counts) => counts[state] > 0);
}

/**
 * The keys a node's control answers to, which are the two a native button answers to: an SVG group carrying
 * `role="button"` has the role but none of a button's behaviour, so `Enter` and `Space` are handled here and
 * both refuse the browser's own default. Every other key is left alone, so `Tab` still moves to the next
 * stop.
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
 * the target size, a visible focus ring and both activation keys. Activating it reports the selection to
 * the screen — which owns the selection, and tells the graph lens the same identifier — and the screen's
 * selection is echoed back as a ring, with `aria-pressed` beside it so the choice is a state a reader
 * hears rather than only a ring they see (rule B-3). The pointer receives the same signal, the accent ring
 * revealing itself under a hover and holding through a press, and focus is reported as well, so a node a
 * closer zoom level drew past the frame's edge has the frame moved to it rather than its ring clipped
 * away (rule B-3, {@link revealedPan}).
 *
 * A pointer press and a keyboard press are reported separately, because a pointer press that dragged the
 * map is a pan rather than an activation, and the two activation keys always are activations. The pointer's
 * handler is given the press itself, because the control a press lands on is not always the node the reader
 * aimed at: two targets can overlap, so the caller resolves the press to the mark it is nearest
 * ({@link nearestNodeMark}) rather than trusting the element the browser hit (rule P-8).
 *
 * A node the caller resolved an evidence reference for also declares `aria-haspopup="dialog"`, so the
 * control says what activating it opens; a node no record stands behind opens nothing (rule P-8).
 *
 * @param placed The node and its projected point.
 * @param counts The node's pin counts, or `undefined`.
 * @param isSelected Whether the screen's selection is this node.
 * @param opensEvidence Whether the caller resolved an evidence reference for this node.
 * @param label Where this node's name is printed, or `undefined` when the drawing had no room for it.
 * @param badges Where this node's badge row is drawn, or `undefined` when it carries no pins.
 * @param onActivateFromKeyboard What to do when the node is activated from the keyboard.
 * @param onActivateFromPointer What to do when the node is pressed with the pointer, which is handed the
 *   press so the caller can resolve which mark it landed on.
 * @param onFocus What to do when the node takes focus, which is where the caller brings a mark drawn
 *   outside the frame back into it so the focus ring this control reveals is not clipped away.
 * @param registerElement How the control reports itself to the caller's registry, so the mark a press
 *   resolved can take the focus of the press it answered, and `null` once it leaves the drawing.
 * @returns The node's group.
 */
function nodeElement(
  placed: PlacedNode,
  counts: PinCounts | undefined,
  isSelected: boolean,
  opensEvidence: boolean,
  label: LabelPlacement | undefined,
  badges: LabelBox | undefined,
  onActivateFromKeyboard: () => void,
  onActivateFromPointer: (event: ReactMouseEvent<SVGGElement>) => void,
  onFocus: () => void,
  registerElement: (element: SVGGElement | null) => void,
): ReactElement {
  const { node, x, y } = placed;
  const printedName = label?.lines[0];

  return (
    <g
      key={nodeKeyOf(node)}
      ref={registerElement}
      role="button"
      tabIndex={0}
      aria-label={nodeAriaLabel(node, counts)}
      aria-pressed={isSelected}
      {...(opensEvidence ? { 'aria-haspopup': 'dialog' as const } : {})}
      className="group cursor-pointer"
      onClick={onActivateFromPointer}
      onFocus={onFocus}
      onKeyDown={(event) => {
        handleNodeKeyDown(event, onActivateFromKeyboard);
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
      {/* A material prints no label: it stands at its supplier's site, where a second printed name would
          sit on the place's own. Its name, family and pins are in its accessible name and in the table
          view. A name the drawing had no room for prints nothing, its record's text staying in the
          accessible name, and a shortened name keeps the full text in a `title` child. */}
      {printedName === undefined || label === undefined ? null : (
        <text
          x={label.labelX}
          y={label.labelY}
          strokeWidth={3}
          paintOrder="stroke"
          className={NODE_LABEL_CLASSES}
        >
          {printedName === node.label ? null : <title>{node.label}</title>}
          {printedName}
        </text>
      )}
      {pinBadgesFor(counts, badges, node.id)}
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

/* ---------------------------------------------------------------------------------------------
 * Labels — where a printed name goes, and what it prints when the room runs out
 * ------------------------------------------------------------------------------------------- */

/** The height of one line's box above its baseline: the type step plus room for its descenders. */
const MAP_LABEL_BOX_HEIGHT = SVG_LABEL_TEXT_METRICS.fontSize + 3;

/**
 * The distance between the two baselines a crossing prints: its own name, then the market-intelligence
 * label the pack's crossings carry (rule P-5).
 *
 * One type step plus half of it: the rendered box of a run at the 12-unit step is 14.58 units tall, so a
 * pitch of one step alone would let the name's descenders fall inside the caption's own box, while this
 * pitch clears it. The pair is placed as one unit — one request of two lines — so the taller block this
 * pitch needs is what the placement keeps inside the drawing and clear of every neighbour.
 */
const MAP_LABEL_LINE_HEIGHT = SVG_LABEL_TEXT_METRICS.fontSize + 6;

/**
 * How wide a name may be before it is shortened, in user units.
 *
 * It is a little wider than the longest site name the market pack holds, so a real record prints in full
 * and the guard bites only on a name that would otherwise have to be printed off the drawing.
 */
const MAP_LABEL_MAX_WIDTH = 220;

/**
 * How far from its mark a name or a badge row is tried, nearest first, in this drawing's user units.
 *
 * The first distance clears the mark's own ring; each later one steps a crowded name further out, so a
 * cluster still prints every name it has room for. The last three reach past the width of the pack's own
 * European cluster, whose plants, suppliers and customers fall inside a band about seventy units wide, so a
 * name there steps out of the cluster rather than being left off the drawing.
 */
const MAP_LABEL_DISTANCES = [
  14, 22, 30, 38, 48, 60, 72, 86, 100, 118, 140, 165, 195, 225,
] as const;

/**
 * The widths a crowded name is retried at before it is left off the drawing, widest first, in user units.
 *
 * Each is the room a run of so many characters of the 12-unit step needs — twenty, fourteen, nine, six and
 * four of them — at the character width the estimate already uses, so a name no candidate seats whole is cut
 * to the longest of these that fits a gap. The record's full text stays in the mark's accessible name and in
 * the printed run's `<title>`.
 */
const MAP_LABEL_SHORTENING_WIDTHS: readonly number[] = [20, 14, 9, 6, 4].map(
  (characters) => characters * SVG_LABEL_CHARACTER_WIDTH,
);

/**
 * The room this lens gives a printed name.
 *
 * The bounds are the drawing's own view box, so a name the placement seats never lies outside the surface;
 * the mark radius is the widest ring a name sits beside — a crossing's halo — so a name centred above or
 * below a mark clears the widest of them. Every number here is this drawing's own geometry: the placement
 * algorithm is shared, but neither drawing's proportions are imposed on the other.
 */
const MAP_LABEL_FIT: LabelFit = {
  metrics: SVG_LABEL_TEXT_METRICS,
  bounds: { width: MAP_WIDTH, height: MAP_HEIGHT },
  boxHeight: MAP_LABEL_BOX_HEIGHT,
  lineHeight: MAP_LABEL_LINE_HEIGHT,
  clearance: LABEL_CLEARANCE,
  markRadius: HALO_RADIUS,
  distances: MAP_LABEL_DISTANCES,
  maxTextWidth: MAP_LABEL_MAX_WIDTH,
  shorteningWidths: MAP_LABEL_SHORTENING_WIDTHS,
};

/**
 * How far from its mark a badge row is tried, nearest first, in this drawing's user units.
 *
 * Shorter than a name's ladder, because a row is a small box anchored to the mark whose counts it states:
 * it is seated before the names are placed, so the space beside its mark is still free, and a row that had
 * to travel far would read as belonging to some other place. The rows stack in a column on either side of a
 * cluster (see `BOX_CANDIDATE_ROWS` in `./svg-label.ts`); the last three are reached only where a cropped
 * frame has pushed a cluster against the drawing's edge and the near places are gone.
 */
const MAP_BADGE_DISTANCES = [14, 22, 30, 38, 50, 64, 82, 104, 130] as const;

/**
 * The room this lens gives a badge row: the drawing's own box, the space every placed thing keeps, the
 * widest ring a row sits beside, and {@link MAP_BADGE_DISTANCES}.
 */
const MAP_BADGE_FIT: BoxFit = {
  bounds: { width: MAP_WIDTH, height: MAP_HEIGHT },
  clearance: LABEL_CLEARANCE,
  markRadius: HALO_RADIUS,
  distances: MAP_BADGE_DISTANCES,
};

/**
 * The families whose marks print their own name, most important first.
 *
 * A material prints none: it stands at the site its supplier ships from, where a second printed name
 * would sit on the place's own, and its name reaches a reader through its accessible name and the table
 * view instead. The order is the placement's precedence, so a cluster that cannot seat every name keeps
 * the places before the parties they feed — a plant is what a reader is looking for, and a customer is
 * the end of the chain rather than its origin.
 */
const LABELLED_NODE_KINDS: readonly TopologyNodeKind[] = ['plant', 'supplier', 'origin', 'customer'];

/** The key one node's printed name is stored under, which the rows and the obstacle list are keyed beside. */
function nodeLabelKey(nodeId: string): string {
  return `node:${nodeId}`;
}

/** The key one crossing's printed name is stored under. */
function haloLabelKey(haloId: string): string {
  return `halo:${haloId}`;
}

/**
 * The key a node's badge row is placed under: the node's own label key with a suffix, so a row and the name
 * printed beside the same mark can never be keyed alike, and a row is an obstacle to every name, including
 * the name of the node it counts.
 */
function badgeRowKey(nodeId: string): string {
  return `${nodeLabelKey(nodeId)}:badges`;
}

/**
 * Every mark a badge row must keep clear of: each node's marker and each crossing's halo.
 *
 * A row carries the key of the row being placed only for its own mark, so it is not pushed away from the
 * node it counts, while every other marker and every halo blocks it: a numeral printed over a mark would
 * hide the place the drawing is about. A crossing is keyed by its printed name, so a halo blocks every row.
 *
 * @param placed Every placeable node, in painting order.
 * @param halos The crossings the overlay places.
 * @returns One obstacle per marker and per halo.
 */
function badgeObstaclesOf(
  placed: readonly PlacedNode[],
  halos: readonly ChokepointHalo[],
): readonly LabelObstacle[] {
  return [
    ...placed.map((entry) =>
      markObstacleOf(badgeRowKey(entry.node.id), entry.x, entry.y, NODE_RING_RADIUS),
    ),
    ...halos.map((halo) =>
      markObstacleOf(haloLabelKey(halo.id), halo.x, halo.y, HALO_RADIUS),
    ),
  ];
}

/**
 * Where every node's badge row is drawn, keyed by the node's identifier.
 *
 * The rows are placed before the names, because a row belongs beside the mark whose counts it states and
 * has only a short ladder of its own to find that place: a row seated after the names would have to travel
 * past them, and a count printed a hundred units from its node reads as another place's. The names are
 * then placed clear of the rows as well (see {@link labelObstaclesOf}), and a name can step outwards and
 * shorten where a row of two numerals cannot. Every node that carries a pin keeps a row, so no count is
 * lost to a crowded cluster.
 *
 * @param placed Every placeable node, in painting order.
 * @param halos The crossings the overlay places.
 * @param pinsByNode The pin counts the payload states per node.
 * @returns One row box per node carrying a badge, keyed by the node's identifier.
 */
function badgeRowsOf(
  placed: readonly PlacedNode[],
  halos: readonly ChokepointHalo[],
  pinsByNode: Readonly<Record<string, PinCounts>>,
): ReadonlyMap<string, LabelBox> {
  const requests: BoxRequest[] = [];

  for (const entry of placed) {
    const size = badgeRowSizeOf(pinsByNode[entry.node.id]);

    if (size === undefined) {
      continue;
    }

    requests.push({
      key: badgeRowKey(entry.node.id),
      width: size.width,
      height: size.height,
      x: entry.x,
      y: entry.y,
    });
  }

  const placements = placeBoxes(requests, badgeObstaclesOf(placed, halos), MAP_BADGE_FIT);
  const rows = new Map<string, LabelBox>();

  for (const entry of placed) {
    const size = badgeRowSizeOf(pinsByNode[entry.node.id]);
    const placement = placements.get(badgeRowKey(entry.node.id));

    if (size === undefined || placement === undefined) {
      continue;
    }

    rows.set(entry.node.id, {
      x: placement.x,
      y: placement.y,
      width: size.width,
      height: size.height,
    });
  }

  return rows;
}

/**
 * Every name this drawing prints, in the order the placement seats them.
 *
 * A crossing comes first because its two lines are the widest block on the drawing and because the
 * market-intelligence label it carries is required beside it (rule P-5); the node families follow in
 * {@link LABELLED_NODE_KINDS}' order. Nothing here is measured and nothing is composed: the requests are
 * the payload's own names (rule P-7) and the points the projection put their marks at.
 *
 * @param placed Every placeable node, in painting order.
 * @param halos The crossings the overlay places.
 * @returns One request per printed name.
 */
function labelRequestsOf(
  placed: readonly PlacedNode[],
  halos: readonly ChokepointHalo[],
): readonly LabelRequest[] {
  const requests: LabelRequest[] = halos.map((halo) => ({
    key: haloLabelKey(halo.id),
    lines: [halo.label, MARKET_INTELLIGENCE_LABEL],
    x: halo.x,
    y: halo.y,
  }));

  for (const kind of LABELLED_NODE_KINDS) {
    for (const entry of placed) {
      if (entry.node.kind === kind) {
        requests.push({
          key: nodeLabelKey(entry.node.id),
          lines: [entry.node.label],
          x: entry.x,
          y: entry.y,
        });
      }
    }
  }

  return requests;
}

/**
 * Every mark a printed name must keep clear of: each node's marker, each crossing's halo, and each badge
 * row the drawing has already seated.
 *
 * A mark's key is the label key of its own name, so a name is not pushed away from the mark it describes;
 * a badge row's key is not any label's, so a name always steps around the numerals beside its own marker,
 * including the row of the node it names, whose counts a run printed over it would hide.
 *
 * @param placed Every placeable node, in painting order.
 * @param halos The crossings the overlay places.
 * @param badgeRows Where every badge row was placed, keyed by the node's identifier.
 * @returns One obstacle per marker, per halo and per badge row.
 */
function labelObstaclesOf(
  placed: readonly PlacedNode[],
  halos: readonly ChokepointHalo[],
  badgeRows: ReadonlyMap<string, LabelBox>,
): readonly LabelObstacle[] {
  const obstacles: LabelObstacle[] = [];

  for (const entry of placed) {
    obstacles.push(markObstacleOf(nodeLabelKey(entry.node.id), entry.x, entry.y, NODE_RING_RADIUS));

    const badges = badgeRows.get(entry.node.id);

    if (badges !== undefined) {
      obstacles.push({ key: badgeRowKey(entry.node.id), box: badges });
    }
  }

  for (const halo of halos) {
    obstacles.push(markObstacleOf(haloLabelKey(halo.id), halo.x, halo.y, HALO_RADIUS));
  }

  return obstacles;
}

/**
 * The position of every name this drawing prints, keyed by the mark it belongs to.
 *
 * A NAME'S POSITION IS COMPUTED, NOT FIXED. One offset would print every name at the same place beside
 * its mark, which is unreadable wherever two marks stand close together: the pack's suppliers, plants and
 * customers share regions, and one projection squeezes an ocean into a few dozen units. `./svg-label.ts`
 * answers with the first candidate position inside the drawing and clear of every other name, every mark,
 * every badge row and every halo, stacked in rows where a cluster leaves no room, and prints a name too
 * wide for the room it has shortened with an ellipsis, keeping the record's own text in the mark's
 * accessible name and in a `<title>` child of the printed text.
 *
 * A name the drawing has no room for is absent from the answer, and its mark then prints nothing: the
 * accessible name and the table view still carry the record's own text, so nothing is lost but the printed
 * run. Only a crossing's pair has a fallback, for the label rule P-5 requires beside its halo.
 *
 * @param placed Every placeable node, in painting order.
 * @param halos The crossings the overlay places.
 * @param badgeRows Where every badge row was placed, keyed by the node's identifier.
 * @returns One placement per name that has room.
 */
function labelPlacementsOf(
  placed: readonly PlacedNode[],
  halos: readonly ChokepointHalo[],
  badgeRows: ReadonlyMap<string, LabelBox>,
): ReadonlyMap<string, LabelPlacement> {
  return placeLabels(
    labelRequestsOf(placed, halos),
    labelObstaclesOf(placed, halos, badgeRows),
    MAP_LABEL_FIT,
  );
}

/**
 * Where a crossing's two printed lines go: the position the placement found, or the plain reading position
 * for a crossing a zoomed frame projects outside the drawing.
 *
 * A zoomed frame crops the map, so a crossing can project beyond the view box, and nothing can be placed
 * against a box that does not contain it. Leaving the pair out would print a dashed halo without the
 * market-intelligence label rule P-5 requires beside it, so such a crossing keeps the plain reading position:
 * its two runs land where the crossing is, off the surface, cut by the frame rather than printed over a
 * neighbour's name. A crossing the box does contain, whose pair has no room, is still left out.
 *
 * A node's name takes no such fallback: a place the frame does not contain has nothing to annotate, so its
 * name is read from the mark's accessible name and from the table view.
 *
 * @param key The crossing's label key.
 * @param lines The two lines the crossing prints.
 * @param x The halo's centre x.
 * @param y The halo's centre y.
 * @param placements The positions the placement answered.
 * @returns The position to print at, or `undefined` when the drawing has no room and the halo is on it.
 */
function haloLabelAt(
  key: string,
  lines: readonly string[],
  x: number,
  y: number,
  placements: ReadonlyMap<string, LabelPlacement>,
): LabelPlacement | undefined {
  const placed = placements.get(key);

  if (placed !== undefined) {
    return placed;
  }

  const onTheDrawing = x >= 0 && y >= 0 && x <= MAP_WIDTH && y <= MAP_HEIGHT;

  return onTheDrawing ? undefined : { labelX: x + MAP_LABEL_DISTANCES[0], labelY: y + 4, lines };
}

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
 * WHICH ROLE A COMPETITOR IS PAINTED IN IS ITS OWN RECORD'S ANSWER, NOT ITS POSITION'S. Specification §4.2
 * gives three competitor hues and the pack names its competitors `CMP-01` to `CMP-03` (contracts §1), so the
 * ordinal a hue is selected by travels on the record: `competitorSlotOf` reads that ordinal and nothing else
 * — the same lookup the radar, this overlay's legend and the atlas network view colour by — so a payload
 * that lists its networks in another order repaints none of them.
 *
 * A NETWORK WITH NO SLOT IS LEFT OUT, NOT RECOLOURED. The identifier states no slot when it carries no
 * `CMP-` ordinal, and the slot is held when an earlier network in the payload names it. Two networks in one
 * hue and one shape would be indistinguishable and §4.2 defines three roles and no fourth, so such a network
 * is not drawn at all: the accent would present market intelligence as one of the client's own readings (rule
 * P-5) and a neighbour's hue would misattribute every mark of it.
 *
 * The marks and the legend both read this one function, so a row is never printed for a network the drawing
 * left out and never omitted for one it painted.
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
 * Which of the overlay's two kinds of mark one entry of {@link overlayMarksOf} describes.
 *
 * The map lens paints two things from the atlas payload — a crossing's halo and a competitor site's
 * hollow mark — and a table view of the same lens has to print exactly those marks, so the two kinds are
 * named once here rather than inferred from the shape of an entry.
 */
export type MapOverlayMarkKind = 'chokepoint' | 'competitor-site';

/**
 * The competitor network a painted site belongs to, as the payload states it.
 *
 * A site's own record names its network by identifier; the label rides beside it because a table prints
 * the network by its own name, and both are the payload's values rather than composed here (rule P-6).
 */
export interface MapOverlayNetworkRef {
  /** The competitor identifier the payload gives the network, in the contracts' `CMP-nn` shape. */
  readonly id: string;
  /** The network's own label, as the payload states it. */
  readonly label: string;
}

/**
 * One mark the overlay paints, as the atlas payload states it.
 *
 * It carries no coordinate and no figure: the drawing alone decides where a mark sits on the projected
 * world, and a reader of this value prints the mark's own name and the network it belongs to (rule P-6).
 */
export interface MapOverlayMark {
  /** Which of the two kinds of mark this entry is. */
  readonly kind: MapOverlayMarkKind;
  /** The crossing's or the site's own identifier. */
  readonly id: string;
  /** The crossing's or the site's own label, exactly as the payload states it. */
  readonly label: string;
  /** The network a competitor site belongs to, or `null` for a crossing. */
  readonly network: MapOverlayNetworkRef | null;
}

/**
 * Every mark the overlay paints, in the payload's order, derived from the atlas payload alone.
 *
 * THIS IS THE DRAWING'S OWN ENUMERATION, PUBLISHED SO A TABLE VIEW CANNOT DRIFT FROM IT. A table of this
 * lens prints exactly the marks the map shows: the crossings the drawing can place, in the payload's
 * chokepoint order, then the sites of every competitor network it paints, in the payload's own order. It
 * reuses {@link placeableChokepointsOf} and {@link slottedNetworksOf} rather than repeating either
 * decision, so a crossing the payload cannot place and a network naming no free slot are left out here
 * exactly as they are left out of the drawing.
 *
 * @param overlay The atlas payload the lens draws.
 * @returns One entry per painted mark.
 */
export function overlayMarksOf(overlay: Atlas): readonly MapOverlayMark[] {
  const marks: MapOverlayMark[] = [];

  for (const crossing of placeableChokepointsOf(overlay)) {
    marks.push({ kind: 'chokepoint', id: crossing.id, label: crossing.label, network: null });
  }

  for (const { network } of slottedNetworksOf(overlay)) {
    for (const site of network.sites) {
      marks.push({
        kind: 'competitor-site',
        id: site.id,
        label: site.label,
        network: { id: network.competitorId, label: network.label },
      });
    }
  }

  return marks;
}

/**
 * The competitor networks of the atlas payload, drawn as hollow marks in the three competitor roles.
 *
 * Only the atlas payload reaches this far: a first-party node is drawn from the topology and never from
 * here, so a market-intelligence position can never be painted as one of the client's own sites (rule P-5).
 * The group's name repeats the imported market-intelligence label, and nothing in it carries a figure or a
 * count. The stroke role is {@link slottedNetworksOf}'s answer, so it follows the competitor's own
 * identifier rather than the position the payload lists it in.
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
 * The halo is a ring plus a dash rather than a filled mark, so it reads as an extent around a place and
 * never as one of the client's own sites, and its label carries the fixed market-intelligence string so a
 * reader cannot mistake the contention for a first-party finding (rules P-1, P-5). The two lines are placed
 * as one block, so the pair never splits across a neighbour's name, and a line the placement shortened keeps
 * its full text in a `title` child.
 *
 * @param halos The crossings, already resolved to positions.
 * @param labels Where each crossing's two lines are printed, by label key.
 * @returns The halos, or `null` when the payload places none.
 */
function halosFor(
  halos: readonly ChokepointHalo[],
  labels: ReadonlyMap<string, LabelPlacement>,
): ReactNode {
  if (halos.length === 0) {
    return null;
  }

  return (
    <g role="group" aria-label={MARKET_INTELLIGENCE_LABEL}>
      {halos.map((halo) => {
        const placement = haloLabelAt(
          haloLabelKey(halo.id),
          [halo.label, MARKET_INTELLIGENCE_LABEL],
          halo.x,
          halo.y,
          labels,
        );
        const [name, caption] = placement?.lines ?? [];

        return (
          <g key={halo.id}>
            <circle
              cx={halo.x}
              cy={halo.y}
              r={HALO_RADIUS}
              strokeWidth={HALO_STROKE}
              strokeDasharray={HALO_DASH}
              className={HALO_RING_CLASSES}
            />
            {placement === undefined || name === undefined ? null : (
              <text
                x={placement.labelX}
                y={placement.labelY}
                strokeWidth={3}
                paintOrder="stroke"
                className={HALO_LABEL_CLASSES}
              >
                {name === halo.label ? null : <title>{halo.label}</title>}
                {name}
              </text>
            )}
            {placement === undefined || caption === undefined ? null : (
              <text
                x={placement.labelX}
                y={placement.labelY + MAP_LABEL_LINE_HEIGHT}
                strokeWidth={3}
                paintOrder="stroke"
                className={HALO_CAPTION_CLASSES}
              >
                {caption === MARKET_INTELLIGENCE_LABEL ? null : (
                  <title>{MARKET_INTELLIGENCE_LABEL}</title>
                )}
                {caption}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/**
 * The legend entries the overlay contributes: one per competitor network, each carrying the imported
 * market-intelligence label and the competitor name tag the shared legend adds.
 *
 * `./legend.tsx` owns both of those strings and prints them, so this component supplies the record's own
 * name and the slot its colour comes from, and nothing else. Which networks contribute is
 * {@link slottedNetworksOf}'s decision, the one the marks are drawn from as well, so a row never describes a
 * mark the map left out and a painted network never goes unlisted; the row's `index` is that slot, so the
 * swatch and the marks are one token on one record.
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
 * The pin-state key under the drawing: the states the view carries, one status indicator apiece, wrapping
 * rather than overflowing at a narrow width.
 *
 * It is the row the graph lens prints under its own drawing, so the same caption introduces the same words
 * on both lenses; the caption reuses the secondary text role of {@link CAPTION_CLASSES}, and every colour in
 * the row is a status role the indicator selects.
 */
const PIN_KEY_CLASSES = 'flex min-w-0 flex-wrap items-center gap-3';

/**
 * A view preset's control: the application's control structure and secondary appearance, plus the pressed
 * treatment. `aria-pressed` carries that treatment — it is also what tells assistive technology which of the
 * five views is on screen — so the choice is never conveyed by colour alone (rule B-3).
 */
const PRESET_CLASSES = [
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
  'aria-pressed:border-accent aria-pressed:bg-surface-1 aria-pressed:font-semibold',
].join(' ');

/**
 * The map's own surface: the first raised surface inside the decorative hairline at the card radius, with no
 * elevation — the token layer exposes no shadow utility to add (specification §4.3).
 *
 * `block h-auto w-full` lets the drawing scale with its container from the view box and keep its proportions
 * at every width. The frame may be dragged, hence the grab cursor and the grabbing one while a press is
 * down, and `touch-none` keeps a drag on a touch screen from scrolling the page underneath it. The surface is
 * a focus stop of its own for the arrow keys, so it carries the same two-pixel `--color-focus-ring` outline
 * every other focusable surface of the application draws (rule B-3).
 */
const CANVAS_CLASSES = [
  'block h-auto w-full touch-none cursor-grab rounded-card border border-hairline bg-surface-1',
  'active:cursor-grabbing',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
].join(' ');

/** The pan instruction printed under the drawing, in the caption role, where a reader will look for it. */
const PAN_HINT_CLASSES = 'text-12 text-text-secondary';

/** The caption naming the node the screen holds as selected, in the secondary text role. */
const SELECTION_CLASSES = 'text-13 text-text-secondary';

/** The land: the map-land role, inside the decorative hairline the borders are drawn with. */
const COUNTRY_CLASSES = 'fill-map-land stroke-hairline';

/** The stroke of a country border, hairline-thin so the land still reads as land. */
const COUNTRY_STROKE = 0.6;

/** The stroke of a first-party lane. */
const LANE_STROKE = 1;

/* ---------------------------------------------------------------------------------------------
 * Pan — the frame's own position, the drag that moves it and the keys that move it
 * ------------------------------------------------------------------------------------------- */

/**
 * How far the pointer must travel, in client pixels, before its press counts as a drag of the map rather
 * than as an activation of whatever it started on.
 *
 * The distance is measured in the pointer's own pixels because that is the space a drag arrives in, and
 * it is small enough that a press which does not move still activates the node under it.
 */
const PAN_DRAG_THRESHOLD = 4;

/**
 * How far one arrow key press moves the frame, in view-box units.
 *
 * A step is a fraction of the drawing rather than of the screen, so the same key press moves the same
 * part of the network whatever width the lens is given.
 */
const PAN_KEY_STEP = 40;

/**
 * How far the frame may be moved from its starting position, horizontally, at the widest zoom level, in
 * view-box units: a quarter of the view box, so at least three quarters of the fitted network stays inside
 * the frame however far a reader drags. A closer level multiplies it by the level's own factor — see
 * {@link panLimitsOf}, the only place a limit is read.
 */
const PAN_LIMIT_X = MAP_WIDTH / 4;

/**
 * How far the frame may be moved from its starting position, vertically, at the widest zoom level, in
 * view-box units.
 */
const PAN_LIMIT_Y = MAP_HEIGHT / 4;

/** How far the frame has been moved from its starting position, in view-box units. */
interface PanOffset {
  /** The horizontal offset: positive moves the drawing to the right. */
  readonly x: number;
  /** The vertical offset: positive moves the drawing down. */
  readonly y: number;
}

/** The frame's starting position, which "Reset view" returns to. */
const NO_PAN: PanOffset = { x: 0, y: 0 };

/**
 * How far the frame may be moved from its starting position at one zoom level, in view-box units.
 *
 * THE RANGE FOLLOWS THE MAGNIFICATION, BECAUSE THE CONTENT DOES. A closer level spaces the network's marks
 * further apart and carries many of them past the frame's own edge, so a range held at the widest level's
 * quarter view would leave a reader unable to reach or select them. The limit is the wider of two answers:
 * the widest level's quarter view multiplied by the level's own factor, and the travel that reaches the
 * furthest drawn mark, which rule B-3 needs for a keyboard reader whose focus ring is clipped away while the
 * mark sits outside. Both terms are the drawing's own geometry — a fraction of the view box, the level's
 * factor and the payload's projected coordinates — so no figure is typed in (rule P-6), and the product is
 * rounded to whole view-box units, so a drag reaches the same limit wherever it started.
 *
 * @param zoomLevel The zoom level on screen.
 * @param placed Every node the projection places at that level.
 * @returns The furthest the frame may be moved in each direction at that level.
 */
function panLimitsOf(zoomLevel: MapZoomLevel, placed: readonly PlacedNode[]): PanOffset {
  const factor = ZOOM_FACTORS[zoomLevel];
  let reachX = 0;
  let reachY = 0;

  for (const { x, y } of placed) {
    reachX = Math.max(reachX, FOCUS_REVEAL_INSET - x, x - (MAP_WIDTH - FOCUS_REVEAL_INSET));
    reachY = Math.max(reachY, FOCUS_REVEAL_INSET - y, y - (MAP_HEIGHT - FOCUS_REVEAL_INSET));
  }

  return {
    x: Math.round(Math.max(PAN_LIMIT_X * factor, reachX)),
    y: Math.round(Math.max(PAN_LIMIT_Y * factor, reachY)),
  };
}

/**
 * Clamps a pan into the range the frame may be moved through at one zoom level.
 *
 * The result is rounded to whole view-box units so a drag draws the same view box string at rest as it does
 * mid-move, and a value the arithmetic could not compute falls back to no movement rather than a `NaN`.
 *
 * @param x The horizontal offset the drag asked for.
 * @param y The vertical offset the drag asked for.
 * @param zoomLevel The zoom level on screen, whose magnification the range follows.
 * @param placed Every node the projection places at that level, whose furthest mark the range reaches.
 * @returns The offset the frame is allowed to take.
 */
function clampPan(
  x: number,
  y: number,
  zoomLevel: MapZoomLevel,
  placed: readonly PlacedNode[],
): PanOffset {
  const limits = panLimitsOf(zoomLevel, placed);
  const bounded = (value: number, limit: number): number =>
    Math.min(limit, Math.max(-limit, Math.round(Number.isFinite(value) ? value : 0)));

  return { x: bounded(x, limits.x), y: bounded(y, limits.y) };
}

/**
 * How far inside the frame a mark a reader focuses is brought, in view-box units: the focus ring's own
 * outer radius, and nothing more. The surface clips whatever falls outside its view box, so a ring centred
 * nearer the frame's edge than {@link NODE_RING_RADIUS} plus {@link NODE_RING_STROKE} has its outer half cut
 * away, which leaves a keyboard reader without the indicator rule B-3 requires.
 */
const FOCUS_REVEAL_INSET = NODE_RING_RADIUS + NODE_RING_STROKE;

/**
 * The pan one axis needs so that a projected coordinate is drawn inside the frame.
 *
 * A coordinate is drawn inside the frame when its projected position plus the pan falls between the
 * inset and the frame's own extent less that inset; a coordinate outside is moved by exactly the
 * distance it lies outside by, so it lands on the inset rather than travelling to the middle of the
 * frame. A coordinate already inside leaves the pan alone, which is what keeps the frame still for a
 * reader moving between marks that are all in view.
 *
 * @param offset The pan in force along this axis.
 * @param coordinate The mark's projected coordinate along this axis.
 * @param extent The view box's own size along this axis.
 * @returns The pan this axis needs, which is the one it had when the mark was already visible.
 */
function revealedPan(offset: number, coordinate: number, extent: number): number {
  const drawn = coordinate + offset;

  if (drawn < FOCUS_REVEAL_INSET) {
    return FOCUS_REVEAL_INSET - coordinate;
  }

  if (drawn > extent - FOCUS_REVEAL_INSET) {
    return extent - FOCUS_REVEAL_INSET - coordinate;
  }

  return offset;
}

/**
 * One pointer press the map is following: where it started, what the frame held then, and whether it
 * pans at all.
 *
 * A press that starts on a node's control is not a pan, because that control is the thing the reader
 * meant to press; it is still followed, so that a press which then moves is read as a drag and does not
 * activate the node.
 */
interface PanGesture {
  /** The pointer the press belongs to, where the browser states an identifier for it. */
  readonly pointerId: number | undefined;
  /** The client x the press started at. */
  readonly startX: number;
  /** The client y the press started at. */
  readonly startY: number;
  /** The pan in force when the press started, which every move of it is measured from. */
  readonly origin: PanOffset;
  /** Whether this press pans the map, which a press that started on a node's control does not. */
  readonly pans: boolean;
}

/**
 * How many view-box units one client pixel of pointer travel covers, so a drag moves the drawing as far as
 * the pointer moved on screen: the surface is laid out from its view box at the width its container gives
 * it. A surface the layout reports no width for maps one pixel to one unit, which keeps the drag responsive
 * and never divides by zero.
 */
function viewBoxUnitsPerPixel(surface: SVGSVGElement): number {
  const width = surface.getBoundingClientRect().width;

  return width > 0 ? MAP_WIDTH / width : 1;
}

/**
 * The six numbers of the matrix an element paints its drawing with, in the shape the browser reports them:
 * a point `x, y` of the drawing is drawn at the client point `(a·x + c·y + e, b·x + d·y + f)`.
 *
 * Stated as the six numbers rather than as the browser's matrix object, because those six are all the
 * conversion needs: reading them is what lets the mapping be inverted by hand, where the matrix object's own
 * transform methods and point type are absent from the environment the component is tested in.
 */
interface DrawingMatrix {
  /** How far one unit of the drawing's x axis moves the client x. */
  readonly a: number;
  /** How far one unit of the drawing's x axis moves the client y. */
  readonly b: number;
  /** How far one unit of the drawing's y axis moves the client x. */
  readonly c: number;
  /** How far one unit of the drawing's y axis moves the client y. */
  readonly d: number;
  /** Where the drawing's origin is drawn, in client x. */
  readonly e: number;
  /** Where the drawing's origin is drawn, in client y. */
  readonly f: number;
}

/**
 * The point of the drawing a client point lands on, or `null` when the surface states no mapping at all.
 *
 * WHY THE SURFACE'S OWN COORDINATE MATRIX AND NOT A MEASURED RECTANGLE. The surface is drawn inside a one
 * pixel hairline border ({@link CANVAS_CLASSES}), and `getBoundingClientRect()` reports that border box while
 * the view box is painted inside the content box: a scale derived from that width is the content width plus
 * the two border pixels over {@link MAP_WIDTH}, and an origin derived from its left and top is off by the
 * border on each axis. The error is systematic, about one to two drawing units, which is harmless where two
 * marks are ten units apart and decisive where records are drawn within a couple of units of each other, as
 * a plant and a customer at nearly one coordinate are at the widest zoom: the press then converts to a point
 * nearer the neighbouring mark's centre than the centre the reader sees under the pointer, and the node it
 * selects is the wrong record (rule P-8). The element's own screen matrix is the mapping the browser
 * actually paints with — it already carries the scale, the border, the `preserveAspectRatio` letterboxing and
 * the view box origin the frame is panned by — so none of them is recomputed here by hand and none of them
 * can be got wrong.
 *
 * The matrix is inverted with plain arithmetic rather than through the browser's own matrix and point
 * objects, which the DOM the component is tested in does not implement. A surface that states no matrix, a
 * determinant that is not a finite number or is zero, a press whose coordinates are not finite numbers, and
 * a conversion that does not land on a finite point all resolve nothing, rather than leaving a division to
 * decide which node a press selected.
 *
 * @param surface The element the drawing is painted on, whose screen matrix states how it is mapped.
 * @param client The press, in client coordinates.
 * @returns The point in the drawing's own coordinates, or `null` when the surface cannot state the mapping.
 */
export function drawingPointOf(surface: SVGSVGElement, client: DrawingPoint): DrawingPoint | null {
  const matrix: DrawingMatrix | null =
    typeof surface.getScreenCTM === 'function' ? surface.getScreenCTM() : null;

  if (matrix === null || !Number.isFinite(client.x) || !Number.isFinite(client.y)) {
    return null;
  }

  const { a, b, c, d, e, f } = matrix;
  const determinant = a * d - b * c;

  if (!Number.isFinite(determinant) || determinant === 0) {
    return null;
  }

  const x = (d * (client.x - e) - c * (client.y - f)) / determinant;
  const y = (-b * (client.x - e) + a * (client.y - f)) / determinant;

  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

/** Whether a pointer event landed inside a node's control, which is a press of that node rather than a pan. */
function isNodeControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[role="button"]') !== null;
}

/**
 * Whether a pointer event belongs to the press being followed: only the pointer that started a press moves
 * the frame, and an environment that reports no identifier is followed as the one press in progress, so the
 * drag keeps working where the identifier is missing rather than being silently ignored.
 */
function followsPointer(gesture: PanGesture, pointerId: number | undefined): boolean {
  return (
    gesture.pointerId === undefined || pointerId === undefined || gesture.pointerId === pointerId
  );
}

/** Releases the pointer capture a pan took, where the surface supports capturing pointers at all. */
function releasePointer(surface: SVGSVGElement, pointerId: number | undefined): void {
  if (pointerId === undefined) {
    return;
  }

  if (
    typeof surface.hasPointerCapture !== 'function' ||
    typeof surface.releasePointerCapture !== 'function'
  ) {
    return;
  }

  if (surface.hasPointerCapture(pointerId)) {
    surface.releasePointerCapture(pointerId);
  }
}

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * What the canvas screen hands the map lens: the topology it read through the port, the atlas
 * payload when S3 supplies one, and the controls' state — zoom level, view preset and selected
 * node — together with the handlers that report a reader's change. All four of those are controlled
 * rather than held here, so the graph lens beside the map is told the same level and the same selection
 * (specification §6.2), and the mapper is required because a node drawn without one would be a mark a
 * reader cannot inspect. Where the frame sits on the map is the one thing this component owns, because
 * nothing outside it reads that position.
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
   * families a canvas node can name — `PLT-`, `SUP-`, `ORG-`, `CUS-`, `MAT-`, `LN-` and `PRD-` — a shared
   * chokepoint of the simulated market-intelligence pack (`CHK-`), a competitor's site (`CMP-nn-Sn`) and
   * the network that owns it (`CMP-nn`), a radar series reading, optionally naming the axis a single
   * vertex draws (`SER-`, with a `#<axis id>` fragment), and a declared outbound endpoint by the endpoint
   * string its ledger row states. A topology node's identifier is the identifier of the record behind it,
   * so the node the caller drew resolves to that record; a `PIN-` reference attached to the node resolves
   * to the pin whose `EvidencePin.nodeRef` names it.
   *
   * `undefined` IS AN ANSWER, AND AN HONEST ONE. It says no record stands behind this node. Activating
   * the node still reports the selection to the screen, and it opens no dialog — never a drawer shown
   * for a record it was not given (rule P-8).
   */
  readonly evidenceRefForNode: (node: TopologyNode) => string | undefined;
}

/**
 * The pin-state key the lens prints under its drawing: one status indicator per state the view carries,
 * in {@link PIN_STATE_ORDER}.
 *
 * THE MAP MUST NAME ITS STATES, NOT ONLY PAINT THEM (rule B-3). A node's badge is a numeral on a chip
 * filled with `meaningOf`'s status colour, and `stale` and `pending` share the warning role, so the clock
 * that separates "degraded" from "awaiting a decision" has no room at badge size. This key prints the same
 * icon, the same status colour and the state's own word, worded as the graph lens words it.
 *
 * It states no count and no total of its own: a numeral here would be a figure nothing computed (rule P-6).
 * A state the view carries no pin in is left out, and a payload carrying no pin draws no row at all.
 *
 * @param states The states the payload carries at least one pin in, in {@link PIN_STATE_ORDER}.
 * @returns The key, or `null` when no state is present.
 */
function pinKeyFor(states: readonly PinState[]): ReactNode {
  if (states.length === 0) {
    return null;
  }

  return (
    <div className={PIN_KEY_CLASSES}>
      <span className={CAPTION_CLASSES}>{MAP_CANVAS_TEXT.pinKeyLabel}</span>
      {states.map((state) => {
        const descriptor = meaningOf(state);

        return (
          <StatusIndicator
            key={state}
            meaning={descriptor.meaning}
            label={PIN_STATE_WORDS[state]}
            icon={descriptor.iconOverride === 'clock' ? PENDING_CLOCK_ICON : undefined}
          />
        );
      })}
    </div>
  );
}

/**
 * The map lens: the bundled world, the client's network over it and, when the atlas payload is
 * supplied, the competitors' networks and the shared crossings.
 *
 * THE TABLE VIEW LIVES IN `ChartFrame`, NOT HERE. Rule B-3 and success criterion 9 require a table view
 * of every chart, map and graph, and `./chart-frame.tsx` is the one place that control lives: this is a
 * pure SVG surface with no toggle of its own, composed inside that frame with the rows its table view
 * prints.
 *
 * Every mark, path, row and name on the drawing is derived from the props by a pure function and memoised
 * on the props it depends on, so changing a selection does not re-project the world and dragging the frame
 * projects nothing at all. No effect is used, and the only state held here is the evidence drawer's open
 * reference and the pan: the lens holds no data, keeps no selection of its own and reads no clock.
 * Nothing this surface draws or states claims a property of the workspace — no confinement, no copy
 * prevention and no resistance to alteration (rule P-4).
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
  const [pan, setPan] = useState<PanOffset>(NO_PAN);
  const drawerId = useId();
  const panHintId = useId();

  /** The pointer press in progress, if any, and whether it has moved far enough to be a drag. */
  const gestureRef = useRef<PanGesture | null>(null);
  const dragMovedRef = useRef(false);

  /** The surface the drawing is painted on, which is the element a press is measured against. */
  const surfaceRef = useRef<SVGSVGElement | null>(null);

  /**
   * The controls the drawing painted, keyed by node.
   *
   * A press is resolved to a mark rather than to the element the browser hit, so this registry is how that
   * resolution reaches the node's own control and focus follows the press. It is the shape
   * `./radar-chart.tsx` uses for its vertices.
   */
  const nodeElements = useRef(new Map<string, SVGGElement>());

  const marks = useMemo(() => drawnMarkCoordinatesOf(topology, overlay), [topology, overlay]);
  /** The point the three zoom levels magnify about, memoised on the payload and the preset alone. */
  const markCentre = useMemo(
    () => drawnMarkCentreOf(fittedProjectionFor(viewPreset, marks), marks),
    [viewPreset, marks],
  );
  const projection = useMemo(
    () => projectionFor(viewPreset, zoomLevel, marks, markCentre),
    [viewPreset, zoomLevel, marks, markCentre],
  );
  const countryPaths = useMemo(() => countryPathsFor(projection), [projection]);
  const placed = useMemo(() => placedNodesOf(topology, projection), [topology, projection]);
  /**
   * The pan the frame is drawn with: the reader's own position, bounded by the range the zoom level on
   * screen allows. It is derived here rather than stored, so stepping back out to a wider level — whose
   * range is narrower — cannot leave the frame parked outside the drawing that level shows.
   */
  const viewPan = useMemo(
    () => clampPan(pan.x, pan.y, zoomLevel, placed),
    [pan, zoomLevel, placed],
  );
  const selectedLabel = useMemo(
    () => nodeLabelOf(topology, selectedNodeId),
    [topology, selectedNodeId],
  );

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
  const badgeRows = useMemo(
    () => badgeRowsOf(placed, halos, topology.pinsByNode),
    [placed, halos, topology.pinsByNode],
  );
  const labels = useMemo(
    () => labelPlacementsOf(placed, halos, badgeRows),
    [placed, halos, badgeRows],
  );
  const legendEntries = useMemo(
    () => (overlay === undefined ? [] : competitorLegendEntries(overlay)),
    [overlay],
  );
  const presentPinStates = useMemo(
    () => PIN_STATE_ORDER.filter((state) => statePresentIn(topology, state)),
    [topology],
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

  /**
   * Holds the control one node is drawn as, and drops it once that node leaves the drawing.
   *
   * A press is resolved to the mark it landed on rather than to the element the browser hit, so the drawing
   * needs a way to reach that mark's own control: the resolved node takes the focus of the press that chose
   * it, and a re-render leaves the registry holding only the controls actually on screen.
   *
   * @param node The node whose control reported itself.
   * @param element The control, or `null` once it leaves the drawing.
   */
  function registerNodeElement(node: TopologyNode, element: SVGGElement | null): void {
    const key = nodeKeyOf(node);

    if (element === null) {
      nodeElements.current.delete(key);
      return;
    }

    nodeElements.current.set(key, element);
  }

  /**
   * The mark a pointer press landed on, in the drawing's own units.
   *
   * The press's client coordinates are converted through the surface's own coordinate matrix
   * ({@link drawingPointOf}) and answered with the nearest mark centre within a target's radius
   * ({@link nearestNodeMark}), so a target a neighbouring node painted over another node's mark cannot take
   * the press. Nothing resolves when the surface states no matrix, which is how a drawing with no layout
   * avoids leaving a division to decide a press, and nothing resolves when the press lands clear of every
   * mark, so a press on a node's printed name stays with the node whose control received it (rule P-8).
   *
   * @param event The press a node's control received.
   * @returns The node the press belongs to, or `null` when it is clear of every mark.
   */
  function markNearestPress(event: ReactMouseEvent<SVGGElement>): PlacedNode | null {
    const surface = surfaceRef.current;

    if (surface === null) {
      return null;
    }

    const point = drawingPointOf(surface, { x: event.clientX, y: event.clientY });

    return point === null ? null : nearestNodeMark(placed, point, NODE_TARGET_RADIUS);
  }

  /**
   * Activates the node a pointer press landed on, unless that press was a drag of the map.
   *
   * A press that moved is a pan the reader made across the surface and selects nothing. The flag it
   * leaves behind is cleared here, because the click it was recorded for is the one that arrives next,
   * and a fresh press clears it as well in case no click ever followed.
   *
   * THE PRESS IS RESOLVED TO THE MARK UNDER IT, NOT TO THE CONTROL THE BROWSER HIT. Two node targets can
   * overlap — each is 28 px across (rule B-3) while two records may be drawn nearer together than that — so
   * the control painted last covers the mark of one painted before it, and a press on the visible centre of
   * that mark would otherwise report its neighbour (rule P-8). {@link markNearestPress} answers the mark the
   * press is nearest, and the resolved node is focused before it is activated: the browser focuses the
   * topmost control under the pointer as the press begins, and `./evidence-drawer.tsx` returns focus to the
   * element that opened it, so focus has to sit on the node this press actually selected (rule B-3).
   *
   * A press that resolves to no mark activates the node whose own control received it, which is the node a
   * press on a printed name belongs to, and what a surface that states no coordinate matrix degrades to.
   *
   * @param node The node whose control received the press.
   * @param event The press itself.
   */
  function pressNode(node: TopologyNode, event: ReactMouseEvent<SVGGElement>): void {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }

    const resolved = markNearestPress(event);

    if (resolved === null || resolved.node === node) {
      activateNode(node);
      return;
    }

    nodeElements.current.get(nodeKeyOf(resolved.node))?.focus();
    activateNode(resolved.node);
  }

  /**
   * Brings a node's mark into the frame when that node takes focus.
   *
   * A node whose mark lies past the frame's edge still takes focus, because it is a stop in the drawing's
   * own tab order, but the ring it draws is clipped away by the surface's box and a keyboard reader is
   * left with no indicator at all (rule B-3). The pan is moved along each axis by exactly the distance the
   * mark lies outside by ({@link revealedPan}) and bounded by the range that reaches every placed mark
   * ({@link panLimitsOf}), so the ring of any node a reader can focus is drawn whole; a mark already inside
   * leaves the offset it found, so the frame stays still between marks that are all in view.
   *
   * @param mark The node and its projected point, as the frame placed it.
   */
  function revealNode(mark: PlacedNode): void {
    setPan((current) => {
      const bounded = clampPan(current.x, current.y, zoomLevel, placed);
      const revealed = clampPan(
        revealedPan(bounded.x, mark.x, MAP_WIDTH),
        revealedPan(bounded.y, mark.y, MAP_HEIGHT),
        zoomLevel,
        placed,
      );

      return revealed.x === bounded.x && revealed.y === bounded.y ? current : revealed;
    });
  }

  /**
   * Starts following a pointer press.
   *
   * A press on the map body pans it; a press on a node's control does not, because that control is what
   * the reader meant to press. Both are followed, so that a press which then moves is read as a drag and
   * activates nothing.
   */
  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>): void {
    if (event.button !== 0) {
      return;
    }

    dragMovedRef.current = false;

    const pans = !isNodeControl(event.target);
    const surface = event.currentTarget;

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: viewPan,
      pans,
    };

    if (pans && typeof surface.setPointerCapture === 'function') {
      surface.setPointerCapture(event.pointerId);
    }
  }

  /**
   * Follows the pointer held on the surface.
   *
   * A press that pans moves the frame by the distance the pointer has travelled, so the drawing follows
   * the pointer under it; a press that started on a node's control only records whether it moved.
   */
  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
    const gesture = gestureRef.current;

    if (gesture === null || !followsPointer(gesture, event.pointerId)) {
      return;
    }

    const travelledX = event.clientX - gesture.startX;
    const travelledY = event.clientY - gesture.startY;

    if (Math.abs(travelledX) > PAN_DRAG_THRESHOLD || Math.abs(travelledY) > PAN_DRAG_THRESHOLD) {
      dragMovedRef.current = true;
    }

    if (!gesture.pans) {
      return;
    }

    const unitsPerPixel = viewBoxUnitsPerPixel(event.currentTarget);
    setPan(
      clampPan(
        gesture.origin.x + travelledX * unitsPerPixel,
        gesture.origin.y + travelledY * unitsPerPixel,
        zoomLevel,
        placed,
      ),
    );
  }

  /**
   * Ends the press being followed and gives the pointer back to the page, so a drag that started on the
   * map does not keep following a pointer that has left it.
   */
  function handlePointerEnd(event: ReactPointerEvent<SVGSVGElement>): void {
    const gesture = gestureRef.current;

    if (gesture === null) {
      return;
    }

    gestureRef.current = null;
    releasePointer(event.currentTarget, gesture.pointerId);
  }

  /**
   * Pans the frame one step from the arrow keys, so the map is operable without a pointer (rule B-3).
   *
   * An arrow reveals the drawing that lies in the direction it names, which is how a scrollable region
   * answers the same keys: `Right` moves the frame's origin right, so what lay past its right edge comes
   * into view. Every other key is left alone, so `Tab` still moves to the next stop. The step is taken
   * from the position the frame is drawn at, so a key pressed after a focus reveal or after the range
   * narrowed continues from what the reader sees rather than from a stale offset.
   */
  function handleMapKeyDown(event: ReactKeyboardEvent<SVGSVGElement>): void {
    const step = (across: number, down: number): void => {
      event.preventDefault();
      setPan(clampPan(viewPan.x + across, viewPan.y + down, zoomLevel, placed));
    };

    switch (event.key) {
      case 'ArrowLeft':
        step(PAN_KEY_STEP, 0);
        return;
      case 'ArrowRight':
        step(-PAN_KEY_STEP, 0);
        return;
      case 'ArrowUp':
        step(0, PAN_KEY_STEP);
        return;
      case 'ArrowDown':
        step(0, -PAN_KEY_STEP);
        return;
      default:
        return;
    }
  }

  /* "Reset view" acts on the position the frame is drawn at: disabled with its reason only while the
     frame is where it started (rule P-8). */
  const isAtStart = viewPan.x === 0 && viewPan.y === 0;

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
        <div className={CONTROL_GROUP_CLASSES} role="group" aria-label={MAP_CANVAS_TEXT.panGroupLabel}>
          {isAtStart ? (
            <ActionButton disabled disabledReason={MAP_CANVAS_TEXT.resetAtStartReason}>
              {MAP_CANVAS_TEXT.resetLabel}
            </ActionButton>
          ) : (
            <ActionButton
              onClick={() => {
                setPan(NO_PAN);
              }}
            >
              {MAP_CANVAS_TEXT.resetLabel}
            </ActionButton>
          )}
        </div>
      </div>

      <svg
        ref={surfaceRef}
        className={CANVAS_CLASSES}
        viewBox={`${-viewPan.x} ${-viewPan.y} ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={title}
        aria-describedby={panHintId}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleMapKeyDown}
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
        {halosFor(halos, labels)}
        <g role="group" aria-label={MAP_CANVAS_TEXT.nodesGroupLabel}>
          {placed.map((entry) =>
            nodeElement(
              entry,
              topology.pinsByNode[entry.node.id],
              entry.node.id === selectedNodeId,
              evidenceRefForNode(entry.node) !== undefined,
              labels.get(nodeLabelKey(entry.node.id)),
              badgeRows.get(entry.node.id),
              () => {
                activateNode(entry.node);
              },
              (event) => {
                pressNode(entry.node, event);
              },
              () => {
                revealNode(entry);
              },
              (element) => {
                registerNodeElement(entry.node, element);
              },
            ),
          )}
        </g>
      </svg>

      <p id={panHintId} className={PAN_HINT_CLASSES}>
        {MAP_CANVAS_TEXT.panInstruction}
      </p>

      {selectedLabel === undefined ? null : (
        <p className={SELECTION_CLASSES}>
          {MAP_CANVAS_TEXT.selectedCaption} {selectedLabel}
        </p>
      )}
      {pinKeyFor(presentPinStates)}

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
 */
function joinClassNames(...values: readonly (string | undefined)[]): string {
  return values.filter((value) => value !== undefined && value !== '').join(' ');
}
