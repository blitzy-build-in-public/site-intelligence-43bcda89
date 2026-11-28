/**
 * The network view of the competitive atlas: the competitors' networks and the client's own sites on
 * one drawing, the shared crossings marked where the lanes that traverse them run, and every
 * market-intelligence series labelled with the fixed string the types layer owns.
 *
 * FIXING INPUTS. AAP 0.13.1 lists this file in the repository tree and AAP 0.15.1 gives it its row
 * (High, source). AAP 0.12.4's SCR-13 row fixes what the view shows — "network view with shared
 * chokepoints", "competitor series tagged `Simulated market intelligence`", every competitor name
 * carrying the imported tag — and AAP 0.14.1's S3 row plus F13 place it in stage S3. AAP 0.8 is what
 * keeps the two families apart here, and this drawing is the part of acceptance test T-21 that
 * asserts the network overlay carries labelled series.
 *
 * WHAT IT DRAWS, AND WHY IT IS A SCHEMATIC RATHER THAN A MAP. The bundled boundary map with its
 * projection belongs to `src/components/map-canvas.tsx`, which the canvas screen composes; this is
 * the atlas's own network view, so it draws a fixed world frame (longitude across, latitude down)
 * and places every site in it. The frame is fixed rather than fitted to the payload, so the same
 * site occupies the same place whatever else the payload holds and a reader comparing two product
 * classes is comparing one frame. A coordinate the frame cannot hold is clamped to its edge instead
 * of drawn outside the drawing, and a site whose coordinate is not a number is left out rather than
 * placed at a guessed position — the table view beside this drawing still carries it (rule P-6).
 *
 * WHAT IS NOT SEPARATED, AND WHY. Two records can state the same coordinate — a competitor's site
 * beside the client's own — and their marks then print over one another. The marks are deliberately
 * left where the records put them, because nudging them apart would misstate where a site is; what is
 * separated is the NAMES, by the deterministic placement in {@link placeLabels}, which moves a label
 * outward past the neighbouring marks and crossings until it is clear. Every mark stays its own
 * control in the tab order and its own entry in the accessible tree, so nothing is lost to the
 * overlap.
 *
 * WHY PROVENANCE IS STRUCTURAL (rule P-5). The two families are separate props and separate groups:
 * `clientSites` and `lanes` are the client's own first-party network, `networks` holds the
 * competitors' market-intelligence networks, and `chokepoints` holds the crossings the pack records.
 * There is no member of this component that combines them — no overlap count, no score, no sum, no
 * shared axis — so a blended figure has nowhere to come from. The two families are also told apart
 * by SHAPE rather than by hue alone (rule B-3): a client site is a filled circle, and the first,
 * second and third competitor networks draw hollow diamond, square and triangle marks. Which of those
 * shapes, and which of the three hues specification §4.2 assigns the competitors, a network takes is
 * resolved from its `competitorId` through `competitorSlotOf` — the same lookup the radar polygons
 * and the legend swatches read — so a mark keeps its colour when the payload lists the networks in
 * another order.
 *
 * WHY EVERY FIXED STRING IS IMPORTED AND NONE IS WRITTEN HERE (rule P-1). A competitor's printed name
 * is followed by `COMPETITOR_NAME_TAG`, and the name line of every competitor series is followed by
 * the market-intelligence member of the fixed `SIM_LABELS` vocabulary. The client's own line is
 * followed by `CLIENT_SELF_ASSESSMENT_LABEL` — the longer, series-specific string that sits alongside
 * the seven fixed labels rather than inside them (AAP 0.10) — and carries no other label, so the
 * client's own reading is never presented as market intelligence.
 *
 * Rule P-5 fixes the exact words of the competitor tag, while AAP 0.10's companion-string row pairs
 * that same tag with a different company word. `src/types/primitives.ts` settles the pair by shipping
 * `COMPETITOR_NAME_TAG` as the rule's own wording, with the rule — the highest-ranked input
 * (AAP 0.1) — named as the winner in that constant's documentation. This file imports the constant
 * and renders it verbatim, and types no tag text at all, so the resolution keeps one owner and a
 * change to it needs one edit.
 *
 * WHAT IT DOES NOT DO. It reads no clock, sends no request (rule B-1), reads no configuration (rule
 * B-2), imports no seed record, no service and no domain module (rule P-2: every site, lane, crossing
 * and name arrives in the props exactly as the atlas payload stated it), computes, rounds or formats
 * no domain figure (rule P-6), declares no transition and no animation at all so a reduced-motion
 * session is shown the same drawing with nothing to undo (rule B-3), and carries no figure element, no
 * table and no toggle: the calling screen composes it inside
 * `src/components/chart-frame.tsx`, which owns the caption and the "View as table" view.
 *
 * ACCESSIBILITY (rule B-3). The drawing is one `<svg role="group">` named by
 * `COMPETITOR_NETWORK_TEXT.groupLabel`. The lanes are structure and are hidden from assistive
 * technology, so the groups a reader meets are the client's own sites, one group per competitor
 * network and one group of shared crossings, each named with the label its family requires. A site
 * or crossing becomes a control because it states its identity and asks the screen to select it, or
 * because the caller's `evidenceRefFor` resolved the evidence record behind it: it is then a
 * `<g role="button" tabIndex={0}>` whose accessible name states what it is, whose family tag tells
 * market intelligence from the client's own record, and which answers `Enter` and `Space` on the
 * mark itself. An SVG element receives no focus ring from the browser, so each mark draws its own in
 * the `focus-ring` role, and a mark holds an invisible target of at least 24x24 px at the widest
 * width the drawing is given. A crossing the payload places nowhere is left out rather than drawn at
 * a guessed place, so a reader is never shown contention at the wrong coordinates.
 *
 * THE ENTITY IN VIEW IS MARKED IN THE DRAWING, NOT ONLY IN THE CAPTION (rule P-8). SCR-13's entity
 * selector reports the network a reader picked, and a control whose only effect is its own highlight
 * does not perform the selection function it presents. `highlightedCompetitorId` therefore reaches
 * this drawing: the family in view is drawn with a heavier stroke, prints its names in the emphasised
 * weight and states `aria-current` on its group, while a competitor family that is not in view
 * recedes to the ground fill, hairline stroke and secondary text role
 * `src/components/dependency-graph.tsx` dims a node with. The client's own family is not a competitor
 * family and is never receded; it is emphasised when the entity in view is the client's own network,
 * which the caller states as `null`. Nothing else changes: every mark keeps its own accessible name,
 * its target, its rings and its keyboard activation, so the emphasis is a weight and a role token
 * rather than a hue or a hidden series (rule B-3).
 *
 * WHY THE POINTER IS RESOLVED BY PROXIMITY. A mark's target has to stay past the 24x24 px minimum
 * rule B-3 asks for, and the pack can place two marks closer together than one target is wide — a
 * competitor's site a few units from the client's own, two records stating one coordinate — so the
 * target painted last covers the mark drawn before it and would take a press aimed at its neighbour.
 * The drawing therefore resolves the press instead of leaving it to the browser's hit test:
 * {@link CompetitorNetwork} listens once, on the `<svg>`, converts the pointer's coordinates into
 * this drawing's own units and activates the mark whose centre is NEAREST the press, within the
 * target radius a mark already carries — see {@link nearestNetworkMark}. A press on the ground
 * between marks activates nothing, and a press inside a mark's own group but outside every target is
 * that mark's own: a site's or a crossing's printed name is part of the mark, so pressing a name
 * selects the mark it names. The keyboard route needs none of this and stays exact, because `Enter`
 * or `Space` runs on the focused mark itself.
 */
import { useMemo, useState } from 'react';
import type {
  JSX,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';

import { EvidenceDrawer } from '../../components/evidence-drawer';
import { CHART_TONE_CLASSES, competitorSlotOf } from '../../components/horizontal-bar-chart';
import type { CompetitorSlot } from '../../components/horizontal-bar-chart';
import {
  CLIENT_SELF_ASSESSMENT_LABEL,
  COMPETITOR_NAME_TAG,
  SIM_LABELS,
} from '../../types';
import type {
  AtlasLane,
  AtlasSite,
  Chokepoint,
  CompetitorId,
  CompetitorNetwork as CompetitorNetworkPayload,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this component states that is not a record's own text, held here so the wording has
 * one owner.
 *
 * None of it is a fixed specification string: the seven §5.3 labels and the two companion tags belong
 * to the elements carrying them (rule P-1) and are imported from `src/types`, and every site name,
 * network name and crossing name arrives in the props (rule P-6, rule P-7). Nothing below carries a
 * figure, an amount, a date or a record identifier, and nothing states a property of the workspace
 * (rule P-4).
 */
export const COMPETITOR_NETWORK_TEXT = {
  /**
   * The drawing's accessible name. It says what the graphic shows and that the families are drawn
   * apart, and deliberately does not repeat the caption the caller's `ChartFrame` supplies.
   */
  groupLabel:
    'Competitor networks and the client network in one frame, each family drawn and labelled on its own',
  /** The client's own group name, followed by the imported self-assessment label. */
  clientGroupName: 'Client network sites',
  /** A competitor group's suffix, prefixed by the network's tagged name and its label. */
  competitorGroupSuffix: 'network sites',
  /** The shared crossings' group name, prefixed by the imported market-intelligence label. */
  chokepointGroupName: 'Shared chokepoints',
  /** What a client site's accessible name calls the site. */
  clientSiteKind: 'Client site',
  /** What a competitor site's accessible name calls the site. */
  competitorSiteKind: 'Competitor site',
  /** What a crossing's accessible name calls the crossing. */
  chokepointKind: 'Shared chokepoint',
  /** The words a mark's accessible name uses before the crossing a lane through it traverses. */
  crossingLanePrefix: 'Lane through',
  /** The client's own series name in the label band under the drawing. */
  clientSeriesName: 'Client network',
  /** The label band's group name. */
  seriesBandGroupName: 'Series labels',
} as const;

/**
 * The market-intelligence label of specification §5.3, taken by position from the fixed label list in
 * `src/types` so the exact string has one owner and is never spelled in this module (rule P-1).
 *
 * The tuple lists the seven labels in §5.3 order, and the sixth is the one a competitor's figures
 * carry; indexing a tuple at a constant index keeps the literal type, so a reworded or reordered
 * vocabulary moves here rather than leaving this component labelling competitor marks with the wrong
 * sentence.
 */
const MARKET_INTELLIGENCE_LABEL: (typeof SIM_LABELS)[5] = SIM_LABELS[5];

/* ---------------------------------------------------------------------------------------------
 * Geometry — a fixed world frame the element scales into its container
 * ------------------------------------------------------------------------------------------- */

/**
 * The drawing's coordinate space, in user units rather than pixels.
 *
 * The element is sized by CSS and the `viewBox` maps these units onto it, so the network scales with
 * its container and keeps its proportions at every width instead of needing a breakpoint. The box is
 * deliberately small relative to the width the drawing is given: a 12-unit label then renders at
 * roughly 15 CSS pixels in a full-width panel rather than shrinking to single figures, which is what
 * keeps the site names readable when the atlas is composed at a narrower width. The plot occupies the
 * top of the box and the label band grows downwards from {@link PLOT_HEIGHT}, one row per series, so a
 * payload with more networks pushes the drawing taller instead of clipping a label.
 */
const VIEW_WIDTH = 760;
const PLOT_HEIGHT = 440;

/** The inset that keeps a site at the edge of the frame, and its own label, inside the box. */
const PLOT_INSET_X = 64;
const PLOT_INSET_Y = 44;

/**
 * The world frame the sites are placed in: the full range of longitude, and the latitude band that
 * holds every populated region the pack records.
 *
 * The frame is fixed rather than fitted to the payload, so a site's place does not move when another
 * network is added or filtered out. A coordinate beyond the frame is clamped to its edge, because a
 * mark outside the box would be invisible.
 */
const FRAME_MIN_LONGITUDE = -180;
const FRAME_MAX_LONGITUDE = 180;
const FRAME_MIN_LATITUDE = -42;
const FRAME_MAX_LATITUDE = 72;

/** Coordinates are rounded so the emitted markup stays readable and stable across renders. */
const COORDINATE_PRECISION = 100;

/* ---------------------------------------------------------------------------------------------
 * Marks — sizes, rings and the label band
 * ------------------------------------------------------------------------------------------- */

/** The client's mark: a filled circle, distinct in kind from every competitor's hollow shape. */
const CLIENT_SITE_RADIUS = 6.5;

/** The radius every competitor shape is built at, so the three shapes read as one family. */
const COMPETITOR_MARK_RADIUS = 7.5;

/**
 * The reach of a mark's invisible target, in user units.
 *
 * The box is 760 units wide and the narrowest surface the atlas gives this drawing is roughly 630
 * CSS pixels, which scales a unit to about 0.83 pixels: a 20-unit radius is a 33-pixel target at that
 * width and a larger one above it — comfortably past the 24x24 pixel minimum rule B-3 asks of a
 * control — while the visible mark stays small enough to read.
 */
const TARGET_RADIUS = 20;

/** The ring drawn around a mark: focus and pointer own one at this radius. */
const RING_RADIUS = 15;
const RING_STROKE = 2;

/**
 * The ring the screen's selected entity carries, drawn outside the focus ring.
 *
 * A selected mark and a focused mark both need an indicator, and the two can fall on one mark at once.
 * Giving the selection its own larger radius — and a heavier stroke — means a reader can always tell
 * "this is what the screen has selected" from "this is where the keyboard is", instead of two states
 * that look identical on the one mark most likely to carry both.
 */
const SELECTED_RADIUS = 20;
const SELECTED_STROKE = 2.5;

/** The shared crossing's halo: an extent rather than a place, so it is a dashed ring. */
const HALO_RADIUS = 15;
const HALO_STROKE = 2;
const HALO_DASH = '4 3';

/* ---------------------------------------------------------------------------------------------
 * Label placement — deterministic separation, because two sites can stand in one place
 * ------------------------------------------------------------------------------------------- */

/**
 * The label metrics the placement is computed from.
 *
 * A label is set in the 12-unit step of the type scale, and its box is estimated from the character
 * count rather than measured: a component may not read layout, and a measurement would make the
 * drawing depend on when it was rendered. The estimate is deliberately a little generous, so two
 * labels the placement keeps apart are also apart once the browser sets the text.
 */
const LABEL_FONT_SIZE = 12;
const LABEL_CHARACTER_WIDTH = 7;
const LABEL_BOX_HEIGHT = LABEL_FONT_SIZE + 3;

/** The clear space kept between a label and its mark, and between two labels. */
const LABEL_MARK_GAP = 10;
const LABEL_CLEARANCE = 4;

/**
 * The label band under the plot: one row per series, each row a swatch, a name line and a label line.
 *
 * The swatch is drawn from the same shape vocabulary as the marks, so the band states which shape
 * belongs to which series instead of leaving a reader to infer it from the order.
 */
const LABEL_BAND_X = 20;
const LABEL_BAND_SWATCH_SIZE = 6;
const LABEL_BAND_TEXT_X = LABEL_BAND_X + 2 * LABEL_BAND_SWATCH_SIZE + 12;
const LABEL_BAND_ROW_HEIGHT = 36;
const LABEL_BAND_LINE_HEIGHT = 15;
const LABEL_BAND_PADDING = 18;

/* ---------------------------------------------------------------------------------------------
 * The competitor slots — shape and hue resolved from the competitor's own identifier
 * ------------------------------------------------------------------------------------------- */

/**
 * The stroke utility each slot's hue resolves to.
 *
 * It reads the three competitor entries of the one chart tone table in
 * `src/components/horizontal-bar-chart.tsx`, so a network mark, a radar polygon and a legend swatch
 * of one competitor resolve one role token from one owner, and a re-pointed role reaches them all.
 */
const COMPETITOR_STROKE_CLASSES = {
  1: CHART_TONE_CLASSES['competitor-1'].stroke,
  2: CHART_TONE_CLASSES['competitor-2'].stroke,
  3: CHART_TONE_CLASSES['competitor-3'].stroke,
} as const satisfies Record<CompetitorSlot, string>;

/**
 * The pointer ring a mark shows while it is hovered or pressed, in its own family's role token.
 *
 * It is a second ring rather than a variant of the keyboard ring for one reason: the selected mark
 * already draws a ring in the `focus-ring` role at this radius, so a hover revealed in that same role
 * would be invisible on the mark a reader is most likely to point at. `pointer-events-none` leaves
 * the hit area exactly as it was, and `motion-safe:` gates the fade so a reduced-motion session gets
 * the same states with no transition (rule B-3).
 */
const POINTER_RING_CLASSES = [
  'pointer-events-none fill-none opacity-0',
  'group-hover:opacity-100 group-active:opacity-100',
  'motion-safe:transition-opacity motion-safe:duration-150',
].join(' ');

/** The ring a mark shows while it holds keyboard focus, hidden until the group is focused. */
const FOCUS_RING_CLASSES = 'fill-none stroke-focus-ring opacity-0 group-focus-visible:opacity-100';

/** The ring a mark shows while it is the screen's selected entity: a shape, not a colour change. */
const SELECTED_RING_CLASSES = 'fill-none stroke-focus-ring';

/** The ring a crossing's halo shows while it holds focus, in the same focus role. */
const HALO_FOCUS_RING_CLASSES =
  'fill-none stroke-focus-ring opacity-0 group-focus-visible:opacity-100';

/* ---------------------------------------------------------------------------------------------
 * Classes — role tokens only, no raw palette value and no shadow
 * ------------------------------------------------------------------------------------------- */

/**
 * The drawing's surface: the first raised surface inside the decorative hairline at the card radius,
 * with no elevation, because the token layer exposes no shadow utility (specification §4.3).
 *
 * `block h-auto w-full` lets the drawing scale from its fixed view box, so it fills whatever width
 * the screen gives it and keeps its proportions.
 */
const DRAWING_CLASSES = 'block h-auto w-full rounded-card border border-hairline bg-surface-1';

/** A client site: the accent role, which specification §4.1 reserves for first-party flows. */
const CLIENT_MARK_CLASSES = 'fill-accent';

/** A competitor site: hollow, so a market-intelligence mark never reads as a filled first-party one. */
const COMPETITOR_MARK_CLASSES = 'fill-none';

/** The client's own lanes: the control-boundary role, so an arc reads as structure, not as data. */
const CLIENT_LANE_CLASSES = 'fill-none stroke-control-boundary';

/** A site's or a crossing's printed name: the primary text role, haloed by the surface beneath it. */
const MARK_LABEL_CLASSES = 'fill-text-primary stroke-surface-1 text-12';

/**
 * The extra weight a mark's own name takes where its state has to read without colour.
 *
 * A selected mark's name and every name of the family in view carry it: selection already draws a
 * ring outside the focus ring and states `aria-current`, and the entity in view states the same, but
 * a reader who cannot separate two rings by size, or two hues, still needs a cue that is not colour —
 * and this is a weight the type scale already bundles (rule B-3).
 */
const SELECTED_LABEL_CLASSES = 'font-semibold';

/**
 * A site's or a crossing's printed name where its family is not the one in view.
 *
 * The secondary text role, haloed by the surface beneath it: it is a role specification §4 measures,
 * so a receded name never drops below the 4.5:1 rule B-3 requires of text, and the recession is
 * carried by a role token rather than by a hue.
 */
const RECEDED_LABEL_CLASSES = 'fill-text-secondary stroke-surface-1 text-12';

/** A series' name in the label band: the primary text role. */
const BAND_NAME_CLASSES = 'fill-text-primary text-12';

/** A series' label line in the label band: the caption role, which §4 measures for its surface. */
const BAND_LABEL_CLASSES = 'fill-text-caption text-12';

/** The stroke widths the lanes are drawn at: the client's first, a competitor's a little heavier. */
const CLIENT_LANE_STROKE = 1;
const COMPETITOR_LANE_STROKE = 1.5;

/**
 * The dash pattern a competitor's lane carries.
 *
 * The dash is what tells a competitor's arc from the client's own without asking a reader to separate
 * two hues, so family is carried by line style as well as by colour (rule B-3).
 */
const COMPETITOR_LANE_DASH = '6 4';

/* ---------------------------------------------------------------------------------------------
 * The emphasis of a family — how the entity in view is marked, and how the others recede
 * ------------------------------------------------------------------------------------------- */

/**
 * How one family of the drawing is painted while the screen reports an entity in view.
 *
 * `highlighted` is the family the screen reports on, `receded` a competitor family that is not it, and
 * `default` is what every family is painted as when the screen highlights nothing — so a caller that
 * passes no `highlightedCompetitorId` receives exactly the drawing it received before the prop
 * existed, mark for mark.
 */
type FamilyEmphasis = 'highlighted' | 'receded' | 'default';

/** The stroke a competitor's shape carries when no family is in view: the drawing's own weight. */
const COMPETITOR_MARK_STROKE = 2;

/** The stroke the highlighted family's marks take, so the emphasis is a weight and never a hue. */
const HIGHLIGHTED_MARK_STROKE = 3;

/** The hairline a receded family's marks take, in the same device the graph lens dims a node with. */
const RECEDED_MARK_STROKE = 1;

/**
 * A competitor mark whose family is not the one in view: the ground fill and the hairline stroke
 * `src/components/dependency-graph.tsx` dims a node with.
 *
 * Both are role tokens rather than a hue, so the family keeps its own shape and its own place on the
 * drawing while the family in view carries the emphasis, and a reader who cannot separate two hues
 * still reads which family the screen reports on (rule B-3).
 */
const RECEDED_MARK_CLASSES = 'fill-ground stroke-hairline';

/** A receded competitor's lane: the same hairline role, at the width the client's own lanes use. */
const RECEDED_LANE_CLASSES = 'fill-none stroke-hairline';
const RECEDED_LANE_STROKE = CLIENT_LANE_STROKE;

/* ---------------------------------------------------------------------------------------------
 * The public surface
 * ------------------------------------------------------------------------------------------- */

/**
 * What the atlas screen hands the network view: one record family per side of the overlay plus the
 * crossings the pack records, which this component places in one fixed frame and draws as
 * separately named and labelled groups. The two families arrive as separate props and no member
 * here combines them, so no first-party value meets a market-intelligence one in a mark, a group or
 * a figure (rule P-5, AAP 0.8). Selection is controlled, so the caller owns it and this component
 * only reports what a reader activated.
 */
export interface CompetitorNetworkProps {
  /**
   * The market-intelligence competitor networks drawn over the client's own sites, in the order the
   * atlas payload lists them. Required.
   *
   * A network's IDENTIFIER decides both the shape and the hue of its marks, through
   * `competitorSlotOf` (`CMP-01` takes §4.2's first competitor slot, `CMP-02` the second, `CMP-03`
   * the third), so the order this list holds them in moves the drawing's groups and no mark's colour.
   * The payload holds three networks, so the drawing holds three slots; a network whose identifier
   * states no slot of its own, and one whose slot another network already holds, is left out rather
   * than painted in a colour that would read as another competitor's network — the table view beside
   * the drawing still carries its sites.
   *
   * Every network here is market intelligence (rule P-5). Its sites are drawn hollow, its lanes
   * dashed, and its printed name carries the imported competitor tag — so the two families cannot be
   * mistaken for one another, and nothing in this component combines a value of one with the other.
   */
  readonly networks: readonly CompetitorNetworkPayload[];

  /**
   * The client's own sites: the first-party side of the overlay, drawn as filled circles in the accent
   * role. Required.
   *
   * `AtlasSite.id` is documented as unique across the client's sites and the competitors', which is
   * what lets a lane from either family resolve its endpoints against one lookup table. A site whose
   * latitude or longitude is not a finite number is left out of the drawing rather than placed at a
   * guessed position; the caller's table view still carries it.
   */
  readonly clientSites: readonly AtlasSite[];

  /**
   * The lanes of the client's own network, each joining two sites of {@link CompetitorNetworkProps.clientSites}.
   * Required; an empty array draws no first-party connection, which is an honest reading of a payload
   * that states none.
   *
   * A lane whose endpoints are not both drawn is skipped rather than bent to the frame's edge, because
   * an arc between a guessed pair of places would misstate the network. No lane is a control: a lane
   * carries no identity to select and opens no record, so it is drawn as structure and hidden from
   * assistive technology (rule P-8).
   */
  readonly lanes: readonly AtlasLane[];

  /**
   * The shared crossings the payload records. Required.
   *
   * A crossing is placed at the position it states, or at the midpoint of the first lane that names
   * it, and is left out of the drawing when neither is available — the shares themselves are the
   * chokepoint table's subject, so a crossing the frame cannot place is reported there rather than
   * drawn at the wrong coordinates. Each one is market intelligence, marked with the imported
   * label (rule P-5).
   */
  readonly chokepoints: readonly Chokepoint[];

  /**
   * The entity the screen holds as selected: a site's identifier, a crossing's identifier, or `null`
   * for nothing selected. Required, and controlled — this component never changes it.
   *
   * The selected mark is marked STRUCTURALLY as well as by hue: a ring is drawn around it in the
   * focus-ring role and it states `aria-current`, so selection never rests on colour alone (rule B-3).
   */
  readonly selectedEntityId: string | null;

  /**
   * Called with the identifier of the site or crossing a reader activated. Required.
   *
   * Activating a mark always reports it, because selection is what a network view is for; a mark
   * therefore always has something to do (rule P-8).
   */
  readonly onSelectEntity: (entityId: string) => void;

  /**
   * Resolves the evidence reference a mark opens, or `undefined` where no record stands behind it.
   *
   * OPTIONAL, AND THE ANSWER IS HONEST EITHER WAY. AAP 0.2.1 F12 requires the evidence drawer to
   * open from every figure, chart mark, node, arc and pin, so where this mapper resolves a reference
   * for a site or a crossing, activating the mark opens `src/components/evidence-drawer.tsx` beside
   * the drawing. Where it does not — or where no mapper is supplied — the mark still reports its
   * selection and opens no dialog, so a mark never claims evidence it cannot show (rule P-8). A
   * returned reference must be one the service's `getEvidence` read resolves, which looks the record
   * up by its exact identifier.
   */
  readonly evidenceRefFor?: ((entityId: string) => string | undefined) | undefined;

  /**
   * The competitor network the screen holds as the entity in view, `null` when that entity is the
   * client's own network, or `undefined` when the screen highlights nothing. Optional.
   *
   * WHAT IT MARKS, AND WHY IT IS STRUCTURAL. SCR-13's entity selector reports the series a reader
   * picked, and a control whose only effect is its own highlight does not perform the selection it
   * presents (rule P-8). The entity in view is therefore marked inside this drawing: the highlighted
   * family's marks are drawn with a heavier stroke, its printed names take the emphasised weight and
   * its group states `aria-current`. The other competitor families recede with the device
   * `src/components/dependency-graph.tsx` dims a node with — the ground fill and a hairline stroke,
   * with their printed names in the secondary text role, which is a role §4 measures — so the
   * recession is a role token rather than a hue, and no name falls below the contrast rule B-3
   * requires. The client's own family is not a competitor family and so is not receded when a
   * competitor is in view.
   *
   * WHAT IT NEVER TOUCHES. The selected mark's own ring and `aria-current`, every mark's accessible
   * name, its focus ring, its pointer target and its keyboard activation, and the press resolution
   * above, are all exactly what they are without the prop: the emphasis changes how a family is
   * painted, never what a mark is or does. A caller that omits the prop receives the drawing it
   * received before the prop existed.
   */
  readonly highlightedCompetitorId?: CompetitorId | null | undefined;
}

/* ---------------------------------------------------------------------------------------------
 * The placed drawing — what the props become before anything is painted
 * ------------------------------------------------------------------------------------------- */

/**
 * One site the frame can place, with the point it sits at and the family it belongs to.
 *
 * `network` and `slot` are both `null` for a site of the client's own network and both set for a
 * competitor's, so a mark's shape, hue and accompanying tags are read from one place and cannot
 * disagree about which family the site belongs to.
 */
interface SitePlacement {
  /** The record the mark, its label and its accessible name are read from. */
  readonly site: AtlasSite;
  /** The x the fixed frame puts the site at, rounded to the drawing grid. */
  readonly x: number;
  /** The y the fixed frame puts the site at, rounded to the drawing grid. */
  readonly y: number;
  /** The competitor network the site belongs to, or `null` for a site of the client's own network. */
  readonly network: CompetitorNetworkPayload | null;
  /** The slot that selects the site's shape and hue, or `null` for a client site. */
  readonly slot: CompetitorSlot | null;
}

/**
 * A placed site with the point its printed name starts at.
 *
 * The label position is computed rather than fixed, because two sites can stand in the same place —
 * the pack's competitors and the client's own plants serve overlapping regions — and two names printed
 * from one point are both unreadable. See {@link placeLabels}.
 */
interface PlacedSite extends SitePlacement {
  /** The x the site's name starts at. */
  readonly labelX: number;
  /** The y of the site's name baseline. */
  readonly labelY: number;
}

/** One lane, resolved to the path it is drawn as and the family whose hue it takes. */
interface PlacedLane {
  /** A stable key: the lane's endpoints, which a network holds at most once. */
  readonly key: string;
  /** The site the lane leaves. */
  readonly fromId: string;
  /** The site the lane reaches. */
  readonly toId: string;
  /** The path data, curved so two lanes between the same places stay visible. */
  readonly path: string;
  /** The midpoint of the two endpoints, where a crossing the lane names can be anchored. */
  readonly midpoint: readonly [number, number];
  /** The competitors a lane belongs to, or `null` for a lane of the client's own network. */
  readonly network: CompetitorNetworkPayload | null;
  /** The crossing the lane traverses, when it traverses one. */
  readonly chokepointId: string | null;
}

/** One competitor network of the payload, placed: its slot, its sites and its lanes. */
interface PlacedNetwork {
  /** The record the group's name and its marks are read from. */
  readonly network: CompetitorNetworkPayload;
  /** The slot that selects the network's shape and hue. */
  readonly slot: CompetitorSlot;
  /** The network's sites that the frame can place, in the payload's order. */
  readonly sites: readonly PlacedSite[];
  /** The network's lanes whose endpoints are both drawn, in the payload's order. */
  readonly lanes: readonly PlacedLane[];
}

/** The client's own network, placed: its sites and the lanes joining them. */
interface PlacedClientNetwork {
  /** The client's sites that the frame can place, in the payload's order. */
  readonly sites: readonly PlacedSite[];
  /** The client's lanes whose endpoints are both drawn, in the payload's order. */
  readonly lanes: readonly PlacedLane[];
}

/** One shared crossing, resolved to the point its halo is drawn at and its name's start. */
interface PlacedChokepoint {
  /** The crossing's identifier, used as the halo's key and reported on activation. */
  readonly id: string;
  /** The crossing's own name, printed beside its halo. */
  readonly label: string;
  /** The x the halo is centred on. */
  readonly x: number;
  /** The y the halo is centred on. */
  readonly y: number;
  /** The x the crossing's name starts at. */
  readonly labelX: number;
  /** The y of the crossing's name baseline. */
  readonly labelY: number;
}

/**
 * The shape a series' band row prints as its swatch: the client's filled circle, one of the three
 * competitor shapes, or the crossing's dashed ring.
 */
type SeriesSwatch = 'client' | 'chokepoint' | CompetitorSlot;

/** One row of the label band: a series' swatch, its printed name and the fixed label that follows it. */
interface SeriesRow {
  /** A stable key: the client's row, a competitor's identifier, or the crossings' row. */
  readonly key: string;
  /** The shape the row's swatch prints, which is the shape its marks are drawn as. */
  readonly swatch: SeriesSwatch;
  /** The series' name, already carrying the competitor tag where one is required. */
  readonly name: string;
  /** The imported label the series' figures carry. */
  readonly label: string;
}

/** Everything the drawing renders, derived from the props by one pure function. */
interface NetworkDrawing {
  /** The client's own network: the first-party side of the overlay. */
  readonly client: PlacedClientNetwork;
  /** The competitors' networks, in the payload's order and within the three slots. */
  readonly competitors: readonly PlacedNetwork[];
  /** The shared crossings the frame can place, in the payload's order. */
  readonly chokepoints: readonly PlacedChokepoint[];
  /** The label band's rows: the client's series first, then one per competitor. */
  readonly series: readonly SeriesRow[];
  /** The drawing's height in user units, grown to fit the label band. */
  readonly viewHeight: number;
  /** The crossing each site's own lanes traverse, by site identifier, for its accessible name. */
  readonly crossingLabelBySiteId: ReadonlyMap<string, string>;
}

/* ---------------------------------------------------------------------------------------------
 * Geometry — the frame, the shapes and the paths
 * ------------------------------------------------------------------------------------------- */

/**
 * Holds a value inside a range, so a coordinate beyond the frame lands on its edge rather than
 * outside the box.
 *
 * @param value The value to hold.
 * @param min The range's lower bound.
 * @param max The range's upper bound.
 * @returns The value, or the nearest bound.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Rounds a coordinate to the drawing grid, so the same props emit the same markup twice.
 *
 * @param value The coordinate to round.
 * @returns The coordinate rounded to {@link COORDINATE_PRECISION}.
 */
function roundCoordinate(value: number): number {
  return Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;
}

/**
 * The x a longitude is drawn at, across the fixed frame.
 *
 * @param longitude The longitude in decimal degrees; a value beyond the frame is clamped to its edge.
 * @returns The rounded x in user units.
 */
function xForLongitude(longitude: number): number {
  const held = clamp(longitude, FRAME_MIN_LONGITUDE, FRAME_MAX_LONGITUDE);
  const fraction = (held - FRAME_MIN_LONGITUDE) / (FRAME_MAX_LONGITUDE - FRAME_MIN_LONGITUDE);

  return roundCoordinate(PLOT_INSET_X + fraction * (VIEW_WIDTH - 2 * PLOT_INSET_X));
}

/**
 * The y a latitude is drawn at, down the fixed frame: north at the top, as a reader expects it.
 *
 * @param latitude The latitude in decimal degrees; a value beyond the frame is clamped to its edge.
 * @returns The rounded y in user units.
 */
function yForLatitude(latitude: number): number {
  const held = clamp(latitude, FRAME_MIN_LATITUDE, FRAME_MAX_LATITUDE);
  const fraction = (FRAME_MAX_LATITUDE - held) / (FRAME_MAX_LATITUDE - FRAME_MIN_LATITUDE);

  return roundCoordinate(PLOT_INSET_Y + fraction * (PLOT_HEIGHT - 2 * PLOT_INSET_Y));
}

/**
 * Whether a site states a position the frame can place.
 *
 * @param site The site to test.
 * @returns `true` when both coordinates are finite numbers.
 */
function isPlaceable(site: AtlasSite): boolean {
  return Number.isFinite(site.latitude) && Number.isFinite(site.longitude);
}

/**
 * The polygon points of one competitor's mark, in the shape its slot assigns.
 *
 * The shape is what tells the three networks apart without asking a reader to separate their hues
 * (rule B-3): a diamond, then a square, then a triangle, in the order specification §4.2 assigns the
 * three competitor hues. The client's own sites are circles, so no mark of either family can be
 * mistaken for the other family's.
 *
 * @param slot The competitor's slot.
 * @param x The mark's centre x.
 * @param y The mark's centre y.
 * @param radius How far the shape's points reach from its centre.
 * @returns The `points` attribute of the mark.
 */
function competitorMarkPoints(
  slot: CompetitorSlot,
  x: number,
  y: number,
  radius: number,
): string {
  const left = x - radius;
  const right = x + radius;
  const top = y - radius;
  const bottom = y + radius;

  switch (slot) {
    case 1:
      return `${x},${top} ${right},${y} ${x},${bottom} ${left},${y}`;
    case 2:
      return `${left},${top} ${right},${top} ${right},${bottom} ${left},${bottom}`;
    case 3:
      return `${x},${top} ${right},${bottom} ${left},${bottom}`;
  }
}

/**
 * The path of one lane, curved so two lanes between the same places stay visible.
 *
 * The control point sits above the higher end of the pair, which bends the arcs the same way on every
 * render: no random offset, no clock and no layout measurement is read.
 *
 * @param from The upstream endpoint, in user units.
 * @param to The downstream endpoint, in user units.
 * @returns The path data.
 */
function lanePathFor(
  from: readonly [number, number],
  to: readonly [number, number],
): string {
  const [fromX, fromY] = from;
  const [toX, toY] = to;
  const controlX = roundCoordinate((fromX + toX) / 2);
  const controlY = roundCoordinate(Math.min(fromY, toY) - Math.abs(toX - fromX) * 0.18);

  return `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
}

/* ---------------------------------------------------------------------------------------------
 * Placing the payload — pure functions of the props, so one payload draws one drawing
 * ------------------------------------------------------------------------------------------- */

/**
 * A crossing as the market pack records it: the shared shape plus the position the pack states for
 * its own halo.
 *
 * The atlas payload is declared as `Chokepoint`, which carries no coordinates, while the pack's
 * records extend it with a latitude and a longitude for the canvas halo. They are read defensively
 * rather than assumed: a crossing that states a position is drawn there, and one that does not is
 * anchored on the lane that names it (see {@link midpointOfFirstLaneNaming}).
 */
interface ChokepointWithPosition extends Chokepoint {
  /** Latitude of the crossing in decimal degrees, where the record states one. */
  readonly latitude?: number;
  /** Longitude of the crossing in decimal degrees, where the record states one. */
  readonly longitude?: number;
}

/**
 * Places one site in the fixed frame.
 *
 * @param site The site record.
 * @param network The competitor network it belongs to, or `null` for a site of the client's network.
 * @param slot The slot that selects its shape and hue, or `null` for a client site.
 * @returns The placed site, or `null` when its coordinate is not a pair of finite numbers.
 */
function placedSiteOf(
  site: AtlasSite,
  network: CompetitorNetworkPayload | null,
  slot: CompetitorSlot | null,
): SitePlacement | null {
  if (!isPlaceable(site)) {
    return null;
  }

  return {
    site,
    x: xForLongitude(site.longitude),
    y: yForLatitude(site.latitude),
    network,
    slot,
  };
}

/**
 * Places the lanes of one network, skipping every lane an endpoint is missing for.
 *
 * @param lanes The lanes as the payload states them.
 * @param network The competitor network they belong to, or `null` for the client's own lanes.
 * @param siteById Every site the drawing can place, keyed by identifier.
 * @returns One placed lane per drawable lane, in the payload's order.
 */
function placedLanesOf(
  lanes: readonly AtlasLane[],
  network: CompetitorNetworkPayload | null,
  siteById: ReadonlyMap<string, SitePlacement>,
): readonly PlacedLane[] {
  const placed: PlacedLane[] = [];

  for (const lane of lanes) {
    const from = siteById.get(lane.fromId);
    const to = siteById.get(lane.toId);

    if (from === undefined || to === undefined) {
      continue;
    }

    const fromPoint: readonly [number, number] = [from.x, from.y];
    const toPoint: readonly [number, number] = [to.x, to.y];

    placed.push({
      key: `${lane.fromId}->${lane.toId}`,
      fromId: lane.fromId,
      toId: lane.toId,
      path: lanePathFor(fromPoint, toPoint),
      midpoint: [
        roundCoordinate((from.x + to.x) / 2),
        roundCoordinate((from.y + to.y) / 2),
      ],
      network,
      chokepointId: lane.chokepointId ?? null,
    });
  }

  return placed;
}

/**
 * The position a crossing states for itself, when it states one the frame can hold.
 *
 * @param crossing The crossing record.
 * @returns The rounded point, or `undefined` when the record states no usable position.
 */
function ownPositionOf(crossing: Chokepoint): readonly [number, number] | undefined {
  const stated = crossing as ChokepointWithPosition;
  const latitude = stated.latitude;
  const longitude = stated.longitude;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return undefined;
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return undefined;
  }

  return [xForLongitude(longitude), yForLatitude(latitude)];
}

/**
 * The midpoint of the first lane that names a crossing, used when the crossing states no position.
 *
 * The lanes are walked in painting order, so a competitor's lane is preferred to the client's where
 * both traverse the same crossing: the crossing belongs to the market pack, and its mark is placed
 * from market-intelligence geometry wherever that geometry exists (rule P-5).
 *
 * @param lanes Every placed lane, competitor lanes first.
 * @param chokepointId The crossing to anchor.
 * @returns The lane's midpoint, or `undefined` when no lane names the crossing.
 */
function midpointOfFirstLaneNaming(
  lanes: readonly PlacedLane[],
  chokepointId: string,
): readonly [number, number] | undefined {
  for (const lane of lanes) {
    if (lane.chokepointId === chokepointId) {
      return lane.midpoint;
    }
  }

  return undefined;
}

/** One shared crossing while the drawing is assembled: where it sits, before its name is placed. */
interface ChokepointPlacement {
  /** The crossing's identifier, used as the halo's key and reported on activation. */
  readonly id: string;
  /** The crossing's own name. */
  readonly label: string;
  /** The x the halo is centred on. */
  readonly x: number;
  /** The y the halo is centred on. */
  readonly y: number;
}

/**
 * Places every crossing the frame can hold.
 *
 * A crossing the payload places is drawn at that place; one it does not is drawn at the midpoint of a
 * lane that names it. A crossing with neither is left out rather than placed at a guessed coordinate,
 * because a halo at the wrong place would misstate where the contention is — the chokepoint table
 * beside this drawing still reports it.
 *
 * @param chokepoints The crossings as the payload states them.
 * @param lanes Every placed lane, competitor lanes first.
 * @returns One halo per placeable crossing, in the payload's order.
 */
function placedChokepointsOf(
  chokepoints: readonly Chokepoint[],
  lanes: readonly PlacedLane[],
): readonly ChokepointPlacement[] {
  const placed: ChokepointPlacement[] = [];

  for (const crossing of chokepoints) {
    const anchor = ownPositionOf(crossing) ?? midpointOfFirstLaneNaming(lanes, crossing.id);

    if (anchor === undefined) {
      continue;
    }

    const [x, y] = anchor;

    placed.push({ id: crossing.id, label: crossing.label, x, y });
  }

  return placed;
}

/**
 * The crossing each site's own lanes traverse, keyed by site identifier.
 *
 * A site is named with a crossing when a lane touching it names one, so a mark's accessible name can
 * state the shared crossing that lane runs through without the component holding a second copy of the
 * network's topology. The first crossing found for a site is the one it is named with, and the
 * payload's lane order decides which that is.
 *
 * @param lanes Every placed lane, competitor lanes first.
 * @param labelById Every crossing's printed name, keyed by identifier.
 * @returns One crossing name per site a recorded crossing's lane touches.
 */
function crossingLabelsOf(
  lanes: readonly PlacedLane[],
  labelById: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> {
  const labels = new Map<string, string>();

  for (const lane of lanes) {
    if (lane.chokepointId === null) {
      continue;
    }

    const label = labelById.get(lane.chokepointId);

    if (label === undefined) {
      continue;
    }

    for (const siteId of [lane.fromId, lane.toId]) {
      if (!labels.has(siteId)) {
        labels.set(siteId, label);
      }
    }
  }

  return labels;
}

/* ---------------------------------------------------------------------------------------------
 * Label placement — two sites can stand in one place, so their names are separated deterministically
 * ------------------------------------------------------------------------------------------- */

/** A name waiting for a position: the key it is stored under, its text and the mark it belongs to. */
interface LabelRequest {
  /** The key the resolved position is stored under, unique within one drawing. */
  readonly key: string;
  /** The text the label prints, which is what its box is estimated from. */
  readonly text: string;
  /** The x of the mark the label belongs to. */
  readonly x: number;
  /** The y of the mark the label belongs to. */
  readonly y: number;
}

/** Where a label's text starts and which baseline it sits on. */
interface LabelPosition {
  /** The x the text starts at. */
  readonly labelX: number;
  /** The y of the text's baseline. */
  readonly labelY: number;
}

/**
 * A mark a label must keep clear of, named by the key its own label is stored under.
 *
 * The key is what lets a label ignore the mark it belongs to — a name is meant to sit beside its own
 * mark — while avoiding every other mark and every crossing halo in the drawing.
 */
interface LabelObstacle {
  /** The label key the mark's own label is stored under. */
  readonly key: string;
  /** The box the mark occupies, ring included. */
  readonly box: LabelBox;
}

/** A label's printed box, in user units, as the placement reasons about it. */
interface LabelBox {
  /** The box's left edge. */
  readonly x: number;
  /** The box's top edge. */
  readonly y: number;
  /** The box's width. */
  readonly width: number;
  /** The box's height. */
  readonly height: number;
}

/**
 * How far from its mark a label is tried, from the plain reading position outwards.
 *
 * A label first tries the clear space beside its mark. When that space is taken — by another label or
 * by another mark — it tries the next distance out, so a name in a crowded region steps away from its
 * mark instead of printing over its neighbour's. The distances are fixed, so the same payload resolves
 * the same collisions every time and a re-render never moves a name.
 */
const LABEL_DISTANCES = [LABEL_MARK_GAP, 24, 38, 54, 72] as const;

/**
 * The places a label may sit relative to its mark, in the order they are tried.
 *
 * Each distance is tried with the same seven placements — to the right of the mark at three heights,
 * to its left at two, and centred above and below it — so a label prefers the plain reading position
 * and steps outwards only as far as it has to.
 *
 * @param request The label to place.
 * @param width The label's estimated width.
 * @returns The candidate positions, most preferred first.
 */
function labelCandidatesOf(request: LabelRequest, width: number): readonly LabelPosition[] {
  const candidates: LabelPosition[] = [];

  for (const distance of LABEL_DISTANCES) {
    const right = request.x + distance;
    const left = request.x - distance - width;
    const centred = request.x - width / 2;

    candidates.push(
      { labelX: right, labelY: request.y + 4 },
      { labelX: right, labelY: request.y - LABEL_FONT_SIZE },
      { labelX: right, labelY: request.y + LABEL_FONT_SIZE + 8 },
      { labelX: left, labelY: request.y + 4 },
      { labelX: left, labelY: request.y - LABEL_FONT_SIZE },
      { labelX: centred, labelY: request.y - RING_RADIUS - distance + 10 },
      { labelX: centred, labelY: request.y + RING_RADIUS + distance + 4 },
    );
  }

  return candidates;
}

/**
 * The box a label covers when it starts at one position.
 *
 * The baseline sits at the bottom of the box's text rather than at its middle, so the height grows
 * upwards from the position the text was given.
 *
 * @param position Where the label starts.
 * @param width The label's estimated width.
 * @returns The label's box.
 */
function labelBoxOf(position: LabelPosition, width: number): LabelBox {
  return {
    x: position.labelX,
    y: position.labelY - LABEL_FONT_SIZE,
    width,
    height: LABEL_BOX_HEIGHT,
  };
}

/** Whether a label box sits inside the plot, so a name is never printed off the drawing. */
function labelBoxFits(box: LabelBox): boolean {
  return (
    box.x >= LABEL_CLEARANCE &&
    box.y >= LABEL_CLEARANCE &&
    box.x + box.width <= VIEW_WIDTH - LABEL_CLEARANCE &&
    box.y + box.height <= PLOT_HEIGHT - LABEL_CLEARANCE
  );
}

/** Whether two label boxes, grown by the clear space, intersect. */
function labelBoxesCollide(one: LabelBox, other: LabelBox): boolean {
  return (
    one.x < other.x + other.width + LABEL_CLEARANCE &&
    other.x < one.x + one.width + LABEL_CLEARANCE &&
    one.y < other.y + other.height + LABEL_CLEARANCE &&
    other.y < one.y + one.height + LABEL_CLEARANCE
  );
}

/**
 * Resolves a position for every label, keeping them off each other, off the marks and off the edge.
 *
 * Why this exists: the pack's competitor networks and the client's own plants serve overlapping
 * regions, so two sites can stand at the same point — and a site can stand on a crossing. Printed
 * from its mark, each name would then overprint another, and a crossing's dashes would print through a
 * site's name. The placement walks the labels in a fixed reading order (the client's own sites, then
 * each competitor's, then the crossings) and gives each the first candidate that is inside the plot
 * and clear of every label already placed and of every other mark. A label nothing can be cleared for
 * takes the first candidate that fits, so every name is still printed, and both outcomes are a pure
 * function of the payload rather than a measurement of it.
 *
 * @param requests The labels to place, in reading order.
 * @param obstacles The marks each label must keep clear of, its own included and ignored.
 * @returns One position per request key.
 */
function placeLabels(
  requests: readonly LabelRequest[],
  obstacles: readonly LabelObstacle[],
): ReadonlyMap<string, LabelPosition> {
  const occupied: LabelBox[] = [];
  const positions = new Map<string, LabelPosition>();

  for (const request of requests) {
    const width = roundCoordinate(request.text.length * LABEL_CHARACTER_WIDTH);
    const blockers = [
      ...obstacles.filter((obstacle) => obstacle.key !== request.key).map((obstacle) => obstacle.box),
      ...occupied,
    ];
    const candidates = labelCandidatesOf(request, width);
    const inside = candidates.filter((candidate) => labelBoxFits(labelBoxOf(candidate, width)));
    const clear = inside.find(
      (candidate) =>
        !blockers.some((blocker) => labelBoxesCollide(blocker, labelBoxOf(candidate, width))),
    );
    const chosen = clear ??
      inside[0] ?? { labelX: request.x + LABEL_MARK_GAP, labelY: request.y + 4 };

    const position: LabelPosition = {
      labelX: roundCoordinate(chosen.labelX),
      labelY: roundCoordinate(chosen.labelY),
    };

    positions.set(request.key, position);
    occupied.push(labelBoxOf(position, width));
  }

  return positions;
}

/**
 * The box a mark occupies, grown to the ring a reader sees around it.
 *
 * @param key The label key the mark's own label is stored under.
 * @param x The mark's centre x.
 * @param y The mark's centre y.
 * @param radius How far the mark's own ring reaches.
 * @returns The obstacle a label keeps clear of.
 */
function markObstacleOf(key: string, x: number, y: number, radius: number): LabelObstacle {
  return {
    key,
    box: { x: x - radius, y: y - radius, width: 2 * radius, height: 2 * radius },
  };
}

/**
 * The key a site's label is stored under.
 *
 * @param siteId The site's identifier.
 * @returns The label key.
 */
function siteLabelKey(siteId: string): string {
  return `site:${siteId}`;
}

/**
 * The key a crossing's label is stored under.
 *
 * @param chokepointId The crossing's identifier.
 * @returns The label key.
 */
function chokepointLabelKey(chokepointId: string): string {
  return `chokepoint:${chokepointId}`;
}

/**
 * The label band's rows: the client's own series first, then one row per competitor network, then one
 * for the shared crossings.
 *
 * A row appears only for a series the drawing actually shows, so the band never names a network the
 * frame could place none of. A competitor's row carries the imported tag after its name and the
 * imported market-intelligence label beneath it; the client's row carries the imported
 * self-assessment label instead of one of the seven §5.3 labels (AAP 0.10); and the crossings' row
 * states the label their halos' shares carry (rule P-1).
 *
 * @param client The client's placed network.
 * @param competitors The competitors' placed networks, in the payload's order.
 * @param chokepoints The crossings the frame can place.
 * @returns One row per drawn series.
 */
function seriesRowsOf(
  client: PlacedClientNetwork,
  competitors: readonly PlacedNetwork[],
  chokepoints: readonly PlacedChokepoint[],
): readonly SeriesRow[] {
  const rows: SeriesRow[] = [];

  if (client.sites.length > 0) {
    rows.push({
      key: 'client-network',
      swatch: 'client',
      name: COMPETITOR_NETWORK_TEXT.clientSeriesName,
      label: CLIENT_SELF_ASSESSMENT_LABEL,
    });
  }

  for (const competitor of competitors) {
    if (competitor.sites.length === 0) {
      continue;
    }

    rows.push({
      key: competitor.network.competitorId,
      swatch: competitor.slot,
      name: `${competitor.network.label} ${COMPETITOR_NAME_TAG}`,
      label: MARKET_INTELLIGENCE_LABEL,
    });
  }

  if (chokepoints.length > 0) {
    rows.push({
      key: 'shared-chokepoints',
      swatch: 'chokepoint',
      name: COMPETITOR_NETWORK_TEXT.chokepointGroupName,
      label: MARKET_INTELLIGENCE_LABEL,
    });
  }

  return rows;
}

/** One competitor network while the drawing is assembled: its slot and the sites the frame can hold. */
interface SlottedNetwork {
  /** The network as the payload states it. */
  readonly network: CompetitorNetworkPayload;
  /** The slot that selects the network's shape and hue. */
  readonly slot: CompetitorSlot;
  /** The network's sites that the frame can place, in the payload's order. */
  readonly sites: readonly SitePlacement[];
}

/**
 * Builds the whole drawing from the four payload collections.
 *
 * The function is pure: the same props produce the same sites, the same paths, the same halos, the
 * same label positions and the same label band on every call, which is what lets a selection change
 * re-render the marks without moving a single site. No clock, no random source and no measurement is
 * read (rule P-6), and the two families never meet in one value: the client's network and the
 * competitors' networks are placed separately, joined only by the crossing names a site's own lanes
 * carry (rule P-5).
 *
 * @param clientSites The client's own sites, as the atlas payload states them.
 * @param networks The competitors' networks, in the payload's order.
 * @param clientLanes The lanes of the client's own network.
 * @param chokepoints The shared crossings the payload records.
 * @returns Everything the drawing renders.
 */
function drawingOf(
  clientSites: readonly AtlasSite[],
  networks: readonly CompetitorNetworkPayload[],
  clientLanes: readonly AtlasLane[],
  chokepoints: readonly Chokepoint[],
): NetworkDrawing {
  const clientPlacements: SitePlacement[] = [];

  for (const site of clientSites) {
    const placed = placedSiteOf(site, null, null);

    if (placed !== null) {
      clientPlacements.push(placed);
    }
  }

  const slotsTaken: SlottedNetwork[] = [];
  const slotsInUse = new Set<CompetitorSlot>();

  for (const network of networks) {
    const slot = competitorSlotOf(network.competitorId);

    /* A network whose identifier states no slot of its own — and one whose slot another network
       already holds — is left out rather than painted in a hue and a shape that would read as another
       competitor's: specification §4.2 defines three competitor roles and no fourth, so two networks
       in one hue would be indistinguishable on the drawing. The table view beside the drawing still
       carries every site of such a network, and the network is placed again as soon as the payload
       names its own slot. */
    if (slot === null || slotsInUse.has(slot)) {
      continue;
    }

    slotsInUse.add(slot);

    const sites: SitePlacement[] = [];

    for (const site of network.sites) {
      const placed = placedSiteOf(site, network, slot);

      if (placed !== null) {
        sites.push(placed);
      }
    }

    slotsTaken.push({ network, slot, sites });
  }

  const siteById = new Map<string, SitePlacement>();

  for (const placement of [...clientPlacements, ...slotsTaken.flatMap((entry) => entry.sites)]) {
    if (!siteById.has(placement.site.id)) {
      siteById.set(placement.site.id, placement);
    }
  }

  const clientPlacedLanes = placedLanesOf(clientLanes, null, siteById);
  const competitorLanes = slotsTaken.map((entry) =>
    placedLanesOf(entry.network.lanes, entry.network, siteById),
  );
  const everyLane = [...competitorLanes.flat(), ...clientPlacedLanes];
  const chokepointPlacements = placedChokepointsOf(chokepoints, everyLane);

  const labelRequests: LabelRequest[] = [
    ...clientPlacements.map((placement) => ({
      key: siteLabelKey(placement.site.id),
      text: placement.site.label,
      x: placement.x,
      y: placement.y,
    })),
    ...slotsTaken.flatMap((entry) =>
      entry.sites.map((placement) => ({
        key: siteLabelKey(placement.site.id),
        text: placement.site.label,
        x: placement.x,
        y: placement.y,
      })),
    ),
    ...chokepointPlacements.map((crossing) => ({
      key: chokepointLabelKey(crossing.id),
      text: crossing.label,
      x: crossing.x,
      y: crossing.y,
    })),
  ];

  const obstacles: LabelObstacle[] = [
    ...clientPlacements.map((placement) =>
      markObstacleOf(siteLabelKey(placement.site.id), placement.x, placement.y, RING_RADIUS),
    ),
    ...slotsTaken.flatMap((entry) =>
      entry.sites.map((placement) =>
        markObstacleOf(siteLabelKey(placement.site.id), placement.x, placement.y, RING_RADIUS),
      ),
    ),
    ...chokepointPlacements.map((crossing) =>
      markObstacleOf(chokepointLabelKey(crossing.id), crossing.x, crossing.y, HALO_RADIUS + 2),
    ),
  ];

  const labelPositions = placeLabels(labelRequests, obstacles);

  const placeSite = (placement: SitePlacement): PlacedSite => {
    const position = labelPositions.get(siteLabelKey(placement.site.id));

    return {
      ...placement,
      labelX: position?.labelX ?? placement.x + LABEL_MARK_GAP,
      labelY: position?.labelY ?? placement.y + 4,
    };
  };

  const client: PlacedClientNetwork = {
    sites: clientPlacements.map(placeSite),
    lanes: clientPlacedLanes,
  };

  const competitors: PlacedNetwork[] = slotsTaken.map((entry, index) => ({
    network: entry.network,
    slot: entry.slot,
    sites: entry.sites.map(placeSite),
    lanes: competitorLanes[index] ?? [],
  }));

  const placedCrossings: PlacedChokepoint[] = chokepointPlacements.map((crossing) => {
    const position = labelPositions.get(chokepointLabelKey(crossing.id));

    return {
      ...crossing,
      labelX: position?.labelX ?? crossing.x + HALO_RADIUS + 4,
      labelY: position?.labelY ?? crossing.y - 2,
    };
  });

  const series = seriesRowsOf(client, competitors, placedCrossings);
  const labelById = new Map(chokepoints.map((crossing) => [crossing.id, crossing.label]));

  return {
    client,
    competitors,
    chokepoints: placedCrossings,
    series,
    viewHeight:
      series.length === 0
        ? PLOT_HEIGHT + LABEL_BAND_PADDING
        : PLOT_HEIGHT + series.length * LABEL_BAND_ROW_HEIGHT + LABEL_BAND_PADDING,
    crossingLabelBySiteId: crossingLabelsOf(everyLane, labelById),
  };
}

/* ---------------------------------------------------------------------------------------------
 * Pointer resolution — the press belongs to the mark nearest it
 * ------------------------------------------------------------------------------------------- */

/**
 * The attribute one mark's activation group carries: the site or crossing identifier it reports.
 *
 * It is what lets the drawing's press resolution attribute a press that lands inside a mark's own
 * group — on its printed name, which lies outside every target — to that mark, without the mark
 * keeping a press handler of its own. {@link InteractiveMark} renders it on the group as
 * `data-mark-entity`, and {@link owningEntityOf} reads it back from the element a press landed on.
 */
const MARK_ENTITY_ATTRIBUTE = 'data-mark-entity';

/** One mark a press can resolve to: the entity its activation reports, and the point it is drawn at. */
interface NetworkMarkCentre {
  /** The site's or crossing's identifier, which is what the mark reports and opens evidence for. */
  readonly entityId: string;
  /** The x the mark's target is centred on, in the drawing's own units. */
  readonly x: number;
  /** The y the mark's target is centred on, in the drawing's own units. */
  readonly y: number;
}

/**
 * The mark a press at a point belongs to: the nearest centre within the target radius, or `null`.
 *
 * WHY THE NEAREST CENTRE AND NOT THE TOPMOST TARGET. Two marks can be drawn closer together than a
 * target is wide — the targets have to stay past the 24x24 px minimum rule B-3 asks for, while the
 * pack can place a competitor's site a few units from the client's own — so the target painted last
 * covers the mark drawn before it and would take a press aimed at its neighbour. Comparing the press
 * against the centres answers the question a reader is asking, "which mark did I press", on the
 * drawing's own geometry rather than on paint order, and it keeps the large targets the pointer
 * needs.
 *
 * Two marks drawn at one centre — two records may state one coordinate — are told apart by their
 * order in `marks`, which is the order the drawing paints them, so the answer is deterministic. A
 * radius that is not positive, and a point the browser could not resolve (a coordinate that is not a
 * finite number), match nothing and yield `null`, which is what keeps a press on empty ground from
 * activating a mark at all (rule P-8).
 *
 * @param marks The marks a press can resolve to, in the order the drawing paints them.
 * @param point The press, in the drawing's own coordinates.
 * @param radius How far from a mark's centre a press still belongs to it, in the same units.
 * @returns The nearest mark within `radius`, or `null` when the press is clear of every one.
 */
export function nearestNetworkMark(
  marks: readonly NetworkMarkCentre[],
  point: { readonly x: number; readonly y: number },
  radius: number,
): NetworkMarkCentre | null {
  if (!(radius > 0)) {
    return null;
  }

  const limit = radius * radius;
  let nearest: NetworkMarkCentre | null = null;
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
 * Every mark the drawing paints, in the order it paints them: the shared crossings first, then each
 * competitor's sites in the payload's order, then the client's own — which is the order of the
 * drawing's groups, and therefore the order a press that is equally near two marks resolves in.
 *
 * @param drawing The placed drawing, whose marks are what a press can reach.
 * @returns One entry per drawn mark, with the point its target is centred on.
 */
function drawingMarksOf(drawing: NetworkDrawing): readonly NetworkMarkCentre[] {
  const marks: NetworkMarkCentre[] = [];

  for (const crossing of drawing.chokepoints) {
    marks.push({ entityId: crossing.id, x: crossing.x, y: crossing.y });
  }

  for (const placed of drawing.competitors) {
    for (const site of placed.sites) {
      marks.push({ entityId: site.site.id, x: site.x, y: site.y });
    }
  }

  for (const site of drawing.client.sites) {
    marks.push({ entityId: site.site.id, x: site.x, y: site.y });
  }

  return marks;
}

/**
 * The entity of the mark whose own group received the press, or `null` when it landed elsewhere.
 *
 * A mark prints its name beside its target and the name lies outside every target's reach, so a
 * reader who presses a site's printed name is pressing that mark alone: the drawing attributes the
 * press to the group it landed in. A press on the ground between marks, or on a lane, belongs to no
 * group and activates nothing (rule P-8).
 *
 * @param target The element the press landed on, as the event reports it.
 * @returns The entity identifier the pressed mark reports, or `null` for a press on no mark.
 */
function owningEntityOf(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const owner = target.closest(`[${MARK_ENTITY_ATTRIBUTE}]`);

  return owner === null ? null : owner.getAttribute(MARK_ENTITY_ATTRIBUTE);
}

/* ---------------------------------------------------------------------------------------------
 * Interaction — what a mark answers to, and what it is called
 * ------------------------------------------------------------------------------------------- */

/**
 * Whether a key press is an activation of the mark that has focus.
 *
 * `Enter` and `Space` are what a button answers to, and a mark carrying the button role is a button
 * to a keyboard reader whatever its element name is, so both activate it.
 *
 * @param event The key event the mark received.
 * @returns `true` when the key activates.
 */
function isActivationKey(event: ReactKeyboardEvent<SVGGElement>): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

/**
 * The words a site's mark is announced with.
 *
 * The name states the site, which family it belongs to and — for a competitor's site — the network it
 * sits in and the fixed market-intelligence label, so a reader who cannot see the drawing can tell a
 * market-intelligence position from one of the client's own by name alone (rule P-5). The client's
 * own site carries the imported self-assessment tag instead of one of the seven §5.3 labels, because
 * the seven have no member for it (AAP 0.10). Where the site's lanes traverse a recorded crossing,
 * the crossing's name is appended.
 *
 * @param placed The site's mark.
 * @param crossingLabel The crossing a lane touching the site names, when one does.
 * @returns The mark's accessible name.
 */
function siteAriaLabel(placed: PlacedSite, crossingLabel: string | undefined): string {
  const parts: string[] = [placed.site.label];

  if (placed.network === null) {
    parts.push(COMPETITOR_NETWORK_TEXT.clientSiteKind, CLIENT_SELF_ASSESSMENT_LABEL);
  } else {
    parts.push(
      COMPETITOR_NETWORK_TEXT.competitorSiteKind,
      `${placed.network.label} ${COMPETITOR_NAME_TAG}`,
      MARKET_INTELLIGENCE_LABEL,
    );
  }

  if (crossingLabel !== undefined) {
    parts.push(`${COMPETITOR_NETWORK_TEXT.crossingLanePrefix} ${crossingLabel}`);
  }

  return parts.join(', ');
}

/**
 * The words a crossing's mark is announced with: its own name, what it is, and the fixed
 * market-intelligence label every crossing carries (rule P-5).
 *
 * @param crossing The placed crossing.
 * @returns The mark's accessible name.
 */
function chokepointAriaLabel(crossing: PlacedChokepoint): string {
  return [
    crossing.label,
    COMPETITOR_NETWORK_TEXT.chokepointKind,
    MARKET_INTELLIGENCE_LABEL,
  ].join(', ');
}

/**
 * The role token a mark's pointer ring is drawn in: the competitor's own hue for a market-intelligence
 * mark, and the accent role for a site of the client's own network.
 *
 * @param slot The competitor's slot, or `null` for a client site.
 * @returns The `stroke-` utility of the role token.
 */
function pointerStrokeClassFor(slot: CompetitorSlot | null): string {
  return slot === null ? 'stroke-accent' : COMPETITOR_STROKE_CLASSES[slot];
}

/**
 * The role tokens one competitor's shape is painted with at the emphasis in view.
 *
 * A receded family takes the ground fill and the hairline stroke instead of its own hue, and every
 * other state keeps the hue its identifier resolves, so no mark ever takes a colour that would read as
 * another competitor's (rule P-5).
 *
 * @param slot The competitor's slot, which selects the hue.
 * @param emphasis How this family is painted while an entity is in view.
 * @returns The class list of the shape.
 */
function competitorMarkClassesFor(slot: CompetitorSlot, emphasis: FamilyEmphasis): string {
  if (emphasis === 'receded') {
    return RECEDED_MARK_CLASSES;
  }

  return joinClassNames(COMPETITOR_MARK_CLASSES, COMPETITOR_STROKE_CLASSES[slot]);
}

/**
 * The stroke weight one family's marks are drawn with at the emphasis in view.
 *
 * @param emphasis How this family is painted while an entity is in view.
 * @returns The weight, in the drawing's own units.
 */
function markStrokeFor(emphasis: FamilyEmphasis): number {
  if (emphasis === 'highlighted') {
    return HIGHLIGHTED_MARK_STROKE;
  }

  return emphasis === 'receded' ? RECEDED_MARK_STROKE : COMPETITOR_MARK_STROKE;
}

/**
 * The class list one mark's printed name takes: its family's text role, plus the weight a selected
 * mark or the family in view adds. Exactly one `fill-` utility is present in every arm, so no two text
 * roles are ever set on one name and the contrast is the one §4 measured for the role that wins.
 *
 * @param emphasis How this family is painted while an entity is in view.
 * @param isSelected Whether the screen holds this very mark as selected.
 * @returns The class list of the name.
 */
function nameClassesFor(emphasis: FamilyEmphasis, isSelected: boolean): string {
  const base = emphasis === 'receded' ? RECEDED_LABEL_CLASSES : MARK_LABEL_CLASSES;

  return joinClassNames(
    base,
    isSelected || emphasis === 'highlighted' ? SELECTED_LABEL_CLASSES : undefined,
  );
}

/**
 * The visible mark of one site: a filled circle for the client's own network, and the hollow shape its
 * slot assigns for a competitor's.
 *
 * The shape is the family's own in every state; the emphasis in view only changes how it is painted —
 * a heavier stroke for the family the screen reports on, the graph lens's ground fill and hairline for
 * a competitor family that is not it — and a highlighted client site draws the accent stroke at the
 * highlighted weight around its filled circle, so both families gain the same structural cue (rule
 * B-3). The mark's size, its target and its accessible name are the same in every state.
 *
 * @param placed The site's mark.
 * @param emphasis How this family is painted while an entity is in view.
 * @returns The shape element.
 */
function markOf(placed: PlacedSite, emphasis: FamilyEmphasis): JSX.Element {
  const { slot, x, y } = placed;

  if (slot === null) {
    if (emphasis !== 'highlighted') {
      return <circle cx={x} cy={y} r={CLIENT_SITE_RADIUS} className={CLIENT_MARK_CLASSES} />;
    }

    return (
      <circle
        cx={x}
        cy={y}
        r={CLIENT_SITE_RADIUS}
        strokeWidth={HIGHLIGHTED_MARK_STROKE}
        className={joinClassNames(CLIENT_MARK_CLASSES, CHART_TONE_CLASSES.accent.stroke)}
      />
    );
  }

  return (
    <polygon
      points={competitorMarkPoints(slot, x, y, COMPETITOR_MARK_RADIUS)}
      strokeWidth={markStrokeFor(emphasis)}
      className={competitorMarkClassesFor(slot, emphasis)}
    />
  );
}

/**
 * The scaffolding every activateable mark of this drawing supplies: the entity a press is
 * attributed back to, the accessible name that states what the mark is and which family it belongs
 * to, and the selected state the drawing reports. A mark carries no press handler of its own — its
 * group carries the entity identifier and the drawing resolves one press to the mark nearest it —
 * so the handler here serves the keyboard alone, as a native button's would. The name is supplied
 * rather than derived here, so nothing about a mark's provenance rests on a hue a reader has to
 * recognise (rule B-3).
 */
interface InteractiveMarkProps {
  /** The site or crossing the mark reports, which the drawing's press resolution reads back. */
  readonly entityId: string;
  /** The mark's accessible name. */
  readonly label: string;
  /** Whether activating the mark opens the evidence drawer. */
  readonly opensEvidence: boolean;
  /** Whether the screen holds the mark's entity as selected. */
  readonly isSelected: boolean;
  /** Reports the keyboard activation to the drawing, which selects and opens the evidence. */
  readonly onActivate: () => void;
  /** The rings and the shape the mark draws. */
  readonly children: ReactNode;
}

/**
 * The scaffolding of an activateable mark: the button role, the keyboard handler, the selected state
 * and the identifier the drawing's press resolution attributes a press back to.
 *
 * The mark is a `<g role="button" tabIndex={0}>` rather than a native button because an SVG drawing
 * has no native control to place inside it, and it answers the two keys a button answers. Its name is
 * supplied by the caller and states the entity and its family, so nothing about provenance rests on a
 * hue a reader has to recognise (rule B-3). `aria-current` carries the selection for a reader who
 * cannot see the ring, and `aria-haspopup` is stated only where activating the mark really does open
 * the drawer beside the drawing (rule P-8).
 *
 * A mark carries no press handler of its own. Its group carries the entity identifier instead, and
 * the drawing resolves one press to the mark nearest it, so a press that lands in this mark's group
 * is attributed to this mark while a press aimed at its dot is not handed to a neighbour painted
 * above it — and one gesture can never activate two marks.
 *
 * @param props The entity, the name, the state, the handler and the mark itself.
 * @returns The interactive group.
 */
function InteractiveMark({
  entityId,
  label,
  opensEvidence,
  isSelected,
  onActivate,
  children,
}: InteractiveMarkProps): JSX.Element {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-current={isSelected ? 'true' : undefined}
      {...(opensEvidence ? { 'aria-haspopup': 'dialog' as const } : {})}
      data-mark-entity={entityId}
      className="group cursor-pointer"
      onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => {
        if (!isActivationKey(event)) {
          return;
        }

        event.preventDefault();
        onActivate();
      }}
    >
      {children}
    </g>
  );
}

/**
 * One site of a drawn group, already placed: the frame point its mark and its printed name start
 * from, the family whose shape and hue it takes, and the crossing a lane through it traverses,
 * which its accessible name states. Family is read from the placed record rather than from the
 * group it is drawn in, so the shape, the hue and the printed name cannot disagree about which side
 * of the overlay the site is on. The mark reports its activation instead of selecting anything
 * itself, and it carries the answer the caller's mapper already gave for this site, so a mark never
 * claims a record the atlas cannot show (rule P-8).
 */
interface SiteMarkProps {
  /** The site, with the point the frame puts it at. */
  readonly placed: PlacedSite;
  /** The crossing a lane touching the site names, when one does. */
  readonly crossingLabel: string | undefined;
  /** Whether the screen holds this site as selected. */
  readonly isSelected: boolean;
  /** Whether activating the mark opens the evidence drawer. */
  readonly opensEvidence: boolean;
  /** How this site's family is painted while the screen reports an entity in view. */
  readonly emphasis: FamilyEmphasis;
  /** Reports the activation to the drawing. */
  readonly onActivate: () => void;
}

/**
 * One site, drawn as its family's shape with its own name beside it, inside a target large enough for
 * a pointer and with the three rings a reader's state needs.
 *
 * The invisible target is painted with nothing and sits under everything else the mark draws, so the
 * mark is reachable across a comfortable area while a dense network still reads. The keyboard ring is
 * revealed by focus, the selected ring is drawn while the screen holds the site, and the pointer ring
 * is revealed by a hover or a press — each in a role token, and the selected ring's colour change is
 * accompanied by `aria-current`, so no state is conveyed by colour alone (rule B-3).
 *
 * @param props The site, its crossing, its state and its handler.
 * @returns The site's mark.
 */
function SiteMark({
  placed,
  crossingLabel,
  isSelected,
  opensEvidence,
  emphasis,
  onActivate,
}: SiteMarkProps): JSX.Element {
  const { site, x, y, slot, labelX, labelY } = placed;

  return (
    <InteractiveMark
      entityId={site.id}
      label={siteAriaLabel(placed, crossingLabel)}
      opensEvidence={opensEvidence}
      isSelected={isSelected}
      onActivate={onActivate}
    >
      <circle cx={x} cy={y} r={TARGET_RADIUS} fill="none" pointerEvents="all" />
      {isSelected ? (
        <circle
          cx={x}
          cy={y}
          r={SELECTED_RADIUS}
          strokeWidth={SELECTED_STROKE}
          className={SELECTED_RING_CLASSES}
        />
      ) : null}
      <circle
        cx={x}
        cy={y}
        r={RING_RADIUS}
        strokeWidth={RING_STROKE}
        className={FOCUS_RING_CLASSES}
      />
      <circle
        cx={x}
        cy={y}
        r={RING_RADIUS}
        strokeWidth={RING_STROKE}
        className={joinClassNames(POINTER_RING_CLASSES, pointerStrokeClassFor(slot))}
      />
      {markOf(placed, emphasis)}
      <text
        x={labelX}
        y={labelY}
        strokeWidth={3}
        paintOrder="stroke"
        className={nameClassesFor(emphasis, isSelected)}
      >
        {site.label}
      </text>
    </InteractiveMark>
  );
}

/**
 * One shared crossing the frame could place: the point its dashed halo is centred on and the
 * crossing's own name, which it prints beneath that halo beside the imported market-intelligence
 * label. A crossing belongs to neither family of the overlay, so it takes no slot and never recedes
 * behind one. The mark opens only the record the caller's mapper resolved for it, so a press never
 * promises evidence the pack cannot show (rule P-8).
 */
interface ChokepointMarkProps {
  /** The crossing, with the point its halo is centred on. */
  readonly crossing: PlacedChokepoint;
  /** Whether the screen holds this crossing as selected. */
  readonly isSelected: boolean;
  /** Whether activating the mark opens the evidence drawer. */
  readonly opensEvidence: boolean;
  /** Reports the activation to the drawing. */
  readonly onActivate: () => void;
}

/**
 * One shared crossing: a dashed halo, the crossing's own name and the imported market-intelligence
 * label beneath it.
 *
 * The halo is a ring plus a dash rather than a filled mark, so it reads as an extent around a place
 * and never as one of the sites; the label under it states what its shares are drawn from, so a
 * reader cannot mistake the contention for a first-party finding (rule P-5, rule P-1). The dashed ring
 * is the simulated status role, which is the role specification §4.2 gives a simulated element.
 *
 * @param props The crossing, its state and its handler.
 * @returns The crossing's mark.
 */
function ChokepointMark({
  crossing,
  isSelected,
  opensEvidence,
  onActivate,
}: ChokepointMarkProps): JSX.Element {
  const { x, y, label, labelX, labelY } = crossing;

  return (
    <InteractiveMark
      entityId={crossing.id}
      label={chokepointAriaLabel(crossing)}
      opensEvidence={opensEvidence}
      isSelected={isSelected}
      onActivate={onActivate}
    >
      <circle cx={x} cy={y} r={TARGET_RADIUS} fill="none" pointerEvents="all" />
      {isSelected ? (
        <circle
          cx={x}
          cy={y}
          r={SELECTED_RADIUS}
          strokeWidth={SELECTED_STROKE}
          className={SELECTED_RING_CLASSES}
        />
      ) : null}
      <circle
        cx={x}
        cy={y}
        r={RING_RADIUS}
        strokeWidth={RING_STROKE}
        className={HALO_FOCUS_RING_CLASSES}
      />
      <circle
        cx={x}
        cy={y}
        r={RING_RADIUS}
        strokeWidth={RING_STROKE}
        className={joinClassNames(POINTER_RING_CLASSES, 'stroke-status-simulated')}
      />
      <circle
        cx={x}
        cy={y}
        r={HALO_RADIUS}
        strokeWidth={HALO_STROKE}
        strokeDasharray={HALO_DASH}
        className="fill-none stroke-status-simulated"
      />
      <text
        x={labelX}
        y={labelY}
        strokeWidth={3}
        paintOrder="stroke"
        className={joinClassNames(
          MARK_LABEL_CLASSES,
          isSelected ? SELECTED_LABEL_CLASSES : undefined,
        )}
      >
        {label}
      </text>
    </InteractiveMark>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The drawing's groups — the client's network, one group per competitor, the crossings, the band
 * ------------------------------------------------------------------------------------------- */

/**
 * One family's lanes, already resolved to the paths they are drawn as, with the slot whose hue and
 * dash pattern they take — `null` stating the client's own network, whose arcs are solid. A lane
 * carries no identity a reader can select and opens no record, so the caller supplies nothing for
 * it to reach and it is drawn as structure rather than as a control (rule P-8). Line style
 * separates the families as well as hue does, so a reader who cannot tell two hues apart still
 * reads which network an arc belongs to (rule B-3).
 */
interface LaneArcsProps {
  /** The lanes to draw. */
  readonly lanes: readonly PlacedLane[];
  /** The competitor whose hue the lanes take, or `null` for the client's own lanes. */
  readonly slot: CompetitorSlot | null;
  /** How this family is painted while the screen reports an entity in view. */
  readonly emphasis: FamilyEmphasis;
}

/**
 * The lanes of one network, drawn as arcs and hidden from assistive technology.
 *
 * A lane carries no identity a reader can select and opens no record, so it is structure rather than
 * a control (rule P-8); the crossings its member lanes traverse are marked and named, which is what a
 * reader needs in order to meet the shared chokepoints. The two families are told apart by line style
 * as well as by hue — the client's solid in the control-boundary role, a competitor's dashed in its own
 * role — so a reader who cannot separate the hues still reads which network an arc belongs to
 * (rule B-3).
 *
 * @param props The lanes and the family whose hue they take.
 * @returns The arcs, or `null` when the network states no drawable lane.
 */
function LaneArcs({ lanes, slot, emphasis }: LaneArcsProps): ReactNode {
  if (lanes.length === 0) {
    return null;
  }

  const receded = slot !== null && emphasis === 'receded';

  return (
    <g aria-hidden="true">
      {lanes.map((lane) =>
        slot === null ? (
          <path
            key={lane.key}
            d={lane.path}
            strokeWidth={CLIENT_LANE_STROKE}
            className={CLIENT_LANE_CLASSES}
          />
        ) : (
          <path
            key={lane.key}
            d={lane.path}
            strokeWidth={receded ? RECEDED_LANE_STROKE : COMPETITOR_LANE_STROKE}
            strokeDasharray={COMPETITOR_LANE_DASH}
            className={
              receded
                ? RECEDED_LANE_CLASSES
                : joinClassNames('fill-none', COMPETITOR_STROKE_CLASSES[slot])
            }
          />
        ),
      )}
    </g>
  );
}

/**
 * Every site mark of one group, and what each of them reaches: the selection, the crossing a lane
 * through each site traverses, the caller's mapper and the emphasis the group's family is painted
 * at. The marks are produced in the order the group's sites were placed, so the payload's order
 * reaches the drawing unchanged, and all of them share one activation route, which is what keeps a
 * site mark and a crossing mark behaving alike for a reader who meets either.
 */
interface SiteMarksProps {
  /** The sites to draw, in the payload's order. */
  readonly sites: readonly PlacedSite[];
  /** The entity the screen holds as selected, if one of these sites is it. */
  readonly selectedEntityId: string | null;
  /** The crossing each site's own lanes traverse, by site identifier. */
  readonly crossingLabelBySiteId: ReadonlyMap<string, string>;
  /** Resolves the evidence reference a site opens, where the caller supplied the mapper. */
  readonly evidenceRefFor: ((entityId: string) => string | undefined) | undefined;
  /** How this group's family is painted while the screen reports an entity in view. */
  readonly emphasis: FamilyEmphasis;
  /** Reports an activated site to the drawing, which selects it and opens its evidence. */
  readonly activateEntity: (entityId: string) => void;
}

/**
 * One mark per site of a network.
 *
 * @param props The sites of the group and what each mark reaches.
 * @returns The site marks, in the payload's order.
 */
function SiteMarks({
  sites,
  selectedEntityId,
  crossingLabelBySiteId,
  evidenceRefFor,
  emphasis,
  activateEntity,
}: SiteMarksProps): ReactNode {
  return sites.map((placed) => (
    <SiteMark
      key={placed.site.id}
      placed={placed}
      crossingLabel={crossingLabelBySiteId.get(placed.site.id)}
      isSelected={placed.site.id === selectedEntityId}
      opensEvidence={evidenceRefFor?.(placed.site.id) !== undefined}
      emphasis={emphasis}
      onActivate={() => {
        activateEntity(placed.site.id);
      }}
    />
  ));
}

/**
 * The client's own network as the drawing placed it, plus what every mark inside the group reaches:
 * the selection, the crossing each site's lanes traverse, the caller's mapper and the emphasis this
 * family is painted at. The group is the first-party side of the overlay and is named with the
 * imported self-assessment label rather than with one of the seven §5.3 labels, so no mark inside
 * it carries a competitor tag and none can be read as market intelligence (AAP 0.10, rule P-5).
 */
interface ClientNetworkGroupProps {
  /** The client's placed network. */
  readonly network: PlacedClientNetwork;
  /** The entity the screen holds as selected. */
  readonly selectedEntityId: string | null;
  /** The crossing each site's own lanes traverse, by site identifier. */
  readonly crossingLabelBySiteId: ReadonlyMap<string, string>;
  /** Resolves the evidence reference a site opens, where the caller supplied the mapper. */
  readonly evidenceRefFor: ((entityId: string) => string | undefined) | undefined;
  /** How the client's family is painted while the screen reports an entity in view. */
  readonly emphasis: FamilyEmphasis;
  /** Reports an activated site to the drawing. */
  readonly activateEntity: (entityId: string) => void;
}

/**
 * The client's own network: its lanes and its sites, in one group named as the first-party series it
 * is.
 *
 * The group name carries the imported self-assessment label rather than one of the seven §5.3 labels,
 * so a reader meeting the group knows it is the client's own reading and not a competitor estimate
 * (AAP 0.10, rule P-5). When the screen reports the client's own network as the entity in view, the
 * group states `aria-current` and its marks and names carry the emphasised weight, which is how the
 * selector's choice reaches the drawing (rule P-8).
 *
 * @param props The client's network and what its marks reach.
 * @returns The group.
 */
function ClientNetworkGroup({
  network,
  selectedEntityId,
  crossingLabelBySiteId,
  evidenceRefFor,
  emphasis,
  activateEntity,
}: ClientNetworkGroupProps): JSX.Element {
  return (
    <g
      role="group"
      aria-label={`${COMPETITOR_NETWORK_TEXT.clientGroupName}, ${CLIENT_SELF_ASSESSMENT_LABEL}`}
      aria-current={emphasis === 'highlighted' ? 'true' : undefined}
    >
      <LaneArcs lanes={network.lanes} slot={null} emphasis={emphasis} />
      <SiteMarks
        sites={network.sites}
        selectedEntityId={selectedEntityId}
        crossingLabelBySiteId={crossingLabelBySiteId}
        evidenceRefFor={evidenceRefFor}
        emphasis={emphasis}
        activateEntity={activateEntity}
      />
    </g>
  );
}

/**
 * One competitor's network, placed and slotted: the lanes and site marks the frame could place for
 * it, and the emphasis its family carries while the screen reports an entity in view. The slot is
 * resolved from the competitor's identifier through `competitorSlotOf`, so a network keeps
 * specification §4.2's shape and hue whatever order the payload lists the networks in, and its
 * marks keep the payload's own order. Everything inside the group is one market-intelligence
 * family, which is why the caller supplies nothing here to tag its marks with (rule P-5).
 */
interface CompetitorNetworkGroupProps {
  /** One competitor's placed network, with the slot that selects its shape and hue. */
  readonly placed: PlacedNetwork;
  /** The entity the screen holds as selected. */
  readonly selectedEntityId: string | null;
  /** The crossing each site's own lanes traverse, by site identifier. */
  readonly crossingLabelBySiteId: ReadonlyMap<string, string>;
  /** Resolves the evidence reference a site opens, where the caller supplied the mapper. */
  readonly evidenceRefFor: ((entityId: string) => string | undefined) | undefined;
  /** How this competitor's family is painted while the screen reports an entity in view. */
  readonly emphasis: FamilyEmphasis;
  /** Reports an activated site to the drawing. */
  readonly activateEntity: (entityId: string) => void;
}

/**
 * One competitor's network: its lanes, its sites, and a group name that carries both the imported
 * competitor tag after the network's name and the imported market-intelligence label.
 *
 * When the screen reports this competitor as the entity in view the group states `aria-current`, its
 * marks are drawn with the heavier stroke and its printed names take the emphasised weight; a
 * competitor that is not in view recedes with the graph lens's ground fill, hairline stroke and
 * secondary text role (rule P-8, rule B-3).
 *
 * @param props One competitor's network and what its marks reach.
 * @returns The group, or `null` when the frame can place none of the network's sites.
 */
function CompetitorNetworkGroup({
  placed,
  selectedEntityId,
  crossingLabelBySiteId,
  evidenceRefFor,
  emphasis,
  activateEntity,
}: CompetitorNetworkGroupProps): JSX.Element | null {
  if (placed.sites.length === 0) {
    return null;
  }

  return (
    <g
      role="group"
      aria-label={`${placed.network.label} ${COMPETITOR_NAME_TAG}, ${COMPETITOR_NETWORK_TEXT.competitorGroupSuffix}, ${MARKET_INTELLIGENCE_LABEL}`}
      aria-current={emphasis === 'highlighted' ? 'true' : undefined}
    >
      <LaneArcs lanes={placed.lanes} slot={placed.slot} emphasis={emphasis} />
      <SiteMarks
        sites={placed.sites}
        selectedEntityId={selectedEntityId}
        crossingLabelBySiteId={crossingLabelBySiteId}
        evidenceRefFor={evidenceRefFor}
        emphasis={emphasis}
        activateEntity={activateEntity}
      />
    </g>
  );
}

/**
 * The crossings the frame could place, drawn as one group ahead of the two site families so a halo
 * lies under the marks placed on it, and named with the imported market-intelligence label. A
 * crossing belongs to neither side of the overlay — it is the pack's own record of where lanes meet
 * — so the group takes no slot and no emphasis from the caller, and the mapper alone decides
 * whether pressing one opens a record (rule P-5).
 */
interface ChokepointGroupProps {
  /** The crossings the frame can place. */
  readonly crossings: readonly PlacedChokepoint[];
  /** The entity the screen holds as selected. */
  readonly selectedEntityId: string | null;
  /** Resolves the evidence reference a crossing opens, where the caller supplied the mapper. */
  readonly evidenceRefFor: ((entityId: string) => string | undefined) | undefined;
  /** Reports an activated crossing to the drawing. */
  readonly activateEntity: (entityId: string) => void;
}

/**
 * The shared crossings, in one group named with the imported market-intelligence label.
 *
 * @param props The crossings and what their marks reach.
 * @returns The group, or `null` when the frame can place no crossing.
 */
function ChokepointGroup({
  crossings,
  selectedEntityId,
  evidenceRefFor,
  activateEntity,
}: ChokepointGroupProps): ReactNode {
  if (crossings.length === 0) {
    return null;
  }

  return (
    <g
      role="group"
      aria-label={`${COMPETITOR_NETWORK_TEXT.chokepointGroupName}, ${MARKET_INTELLIGENCE_LABEL}`}
    >
      {crossings.map((crossing) => (
        <ChokepointMark
          key={crossing.id}
          crossing={crossing}
          isSelected={crossing.id === selectedEntityId}
          opensEvidence={evidenceRefFor?.(crossing.id) !== undefined}
          onActivate={() => {
            activateEntity(crossing.id);
          }}
        />
      ))}
    </g>
  );
}

/**
 * The rows the band prints, one per drawn series: the client's own first, then one per competitor
 * network, each already carrying the swatch its marks are drawn as, the name it prints with the
 * competitor tag where one is required, and the imported label its figures carry. The band is the
 * drawing's own statement of which series it shows and how each one is labelled (rule P-1), so it
 * derives nothing and only decides where each row prints; an empty list draws no band at all rather
 * than a heading over nothing.
 */
interface SeriesBandProps {
  /** One row per drawn series: the client's first, then one per competitor. */
  readonly rows: readonly SeriesRow[];
}

/**
 * The label band under the plot: one swatch, one name line and one label line per drawn series.
 *
 * A drawing of two families has to say, on the drawing, which series it shows and which label each
 * one's figures carry (rule P-1). The competitor rows print the imported market-intelligence label and
 * the client's row the imported self-assessment label, so the band holds no fixed string of its own.
 *
 * @param props The rows to print.
 * @returns The band, or `null` when no series is drawn.
 */
/**
 * The shape one band row prints, which is the shape that series' marks carry, and the point of the
 * band the swatch is centred on. Passing the series' own slot rather than a hue is what ties a row
 * to its marks without colour being the only cue (rule B-3): the client's filled circle, the
 * crossing's dashed ring and the three competitor shapes each print themselves, decoratively,
 * because the row's text carries the meaning.
 */
interface SeriesSwatchProps {
  /** The shape the series is drawn as, which is the shape its marks carry. */
  readonly swatch: SeriesSwatch;
  /** The x the swatch is centred on. */
  readonly x: number;
  /** The y the swatch is centred on. */
  readonly y: number;
}

/**
 * The swatch a band row prints: the series' own shape in the series' own role token.
 *
 * It is decorative — the row's text is what carries the meaning — so a band row states which shape
 * belongs to which series without asking a reader to infer it from the order of the rows, and without
 * colour being the only thing that ties a row to its marks (rule B-3).
 *
 * @param props The shape and the point it is centred on.
 * @returns The swatch element.
 */
function SeriesSwatchMark({ swatch, x, y }: SeriesSwatchProps): JSX.Element {
  if (swatch === 'client') {
    return <circle cx={x} cy={y} r={LABEL_BAND_SWATCH_SIZE} className={CLIENT_MARK_CLASSES} />;
  }

  if (swatch === 'chokepoint') {
    return (
      <circle
        cx={x}
        cy={y}
        r={LABEL_BAND_SWATCH_SIZE}
        strokeWidth={HALO_STROKE}
        strokeDasharray={HALO_DASH}
        className="fill-none stroke-status-simulated"
      />
    );
  }

  return (
    <polygon
      points={competitorMarkPoints(swatch, x, y, LABEL_BAND_SWATCH_SIZE)}
      strokeWidth={2}
      className={joinClassNames(COMPETITOR_MARK_CLASSES, COMPETITOR_STROKE_CLASSES[swatch])}
    />
  );
}

function SeriesBand({ rows }: SeriesBandProps): ReactNode {
  if (rows.length === 0) {
    return null;
  }

  return (
    <g role="group" aria-label={COMPETITOR_NETWORK_TEXT.seriesBandGroupName}>
      {rows.map((row, index) => {
        const nameY = PLOT_HEIGHT + index * LABEL_BAND_ROW_HEIGHT + LABEL_BAND_LINE_HEIGHT;
        const swatchY = nameY - LABEL_BAND_LINE_HEIGHT / 2;

        return (
          <g key={row.key}>
            <g aria-hidden="true">
              <SeriesSwatchMark
                swatch={row.swatch}
                x={LABEL_BAND_X + LABEL_BAND_SWATCH_SIZE}
                y={swatchY}
              />
            </g>
            <text x={LABEL_BAND_TEXT_X} y={nameY} className={BAND_NAME_CLASSES}>
              {row.name}
            </text>
            <text
              x={LABEL_BAND_TEXT_X}
              y={nameY + LABEL_BAND_LINE_HEIGHT}
              className={BAND_LABEL_CLASSES}
            >
              {row.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/** The drawing and, beside it, the drawer a mark's evidence opens. */
const ROOT_CLASSES = 'flex min-w-0 flex-col gap-3';

/**
 * How one competitor's family is painted while the screen reports an entity in view.
 *
 * `undefined` — the caller highlights nothing — leaves every family exactly as it was; the competitor
 * the screen names is emphasised; every OTHER competitor family recedes, and so does every competitor
 * family when the entity in view is the client's own network (which the caller states as `null`). The
 * client's own family is not a competitor family and is never receded here: it is emphasised when
 * `null` says it is the entity in view.
 *
 * @param highlightedCompetitorId The competitor in view, `null` for the client's own, or `undefined`.
 * @param competitorId The competitor the family being painted belongs to.
 * @returns The emphasis that family is painted at.
 */
function competitorEmphasisOf(
  highlightedCompetitorId: CompetitorId | null | undefined,
  competitorId: CompetitorId,
): FamilyEmphasis {
  if (highlightedCompetitorId === undefined) {
    return 'default';
  }

  return highlightedCompetitorId === competitorId ? 'highlighted' : 'receded';
}

/**
 * How the client's own family is painted: emphasised when it is the entity in view, and untouched
 * otherwise.
 *
 * @param highlightedCompetitorId The competitor in view, `null` for the client's own, or `undefined`.
 * @returns The emphasis the client's family is painted at.
 */
function clientEmphasisOf(
  highlightedCompetitorId: CompetitorId | null | undefined,
): FamilyEmphasis {
  return highlightedCompetitorId === null ? 'highlighted' : 'default';
}

/**
 * Renders the competitive atlas's network view.
 *
 * The drawing is presentational by contract: it takes the atlas payload's sites, lanes and crossings
 * and draws them, reads no clock, sends no request and computes no domain figure, so a re-render of
 * the atlas redraws the same network from the same payload. Selection is controlled — the component
 * never changes `selectedEntityId` itself and reports `onSelectEntity` instead — and the only state it
 * holds is which evidence reference it has open.
 *
 * Each mark is a keyboard-operable control whose name says what it is and which family it belongs to,
 * the two families are drawn as separate groups with separate shapes, line styles and labels, and the
 * label band states each series' fixed label. When the screen reports an entity in view, that family
 * is emphasised and its group states `aria-current` while the other competitor families recede — see
 * {@link CompetitorNetworkProps.highlightedCompetitorId}. Activating a mark reports the entity and, where the
 * caller's mapper resolves one, opens `src/components/evidence-drawer.tsx` as a sibling of the
 * drawing rather than inside it, because a dialog is not an SVG element and the drawer portals itself
 * out of the flow anyway. A press is resolved by the drawing rather than by the browser's hit test:
 * {@link nearestNetworkMark} picks the mark nearest the press within the target radius, so a dense
 * cluster opens the mark under the pointer even where a neighbour's larger target is painted above
 * it, while the keyboard route keeps activating the focused mark exactly.
 *
 * @param props The two families' records, the shared crossings, the controlled selection, the handler
 *   that reports a selection and the mapper that resolves a mark's evidence. See
 *   {@link CompetitorNetworkProps}.
 * @returns The network view, ready to be composed inside `src/components/chart-frame.tsx` by the atlas
 *   screen.
 */
export function CompetitorNetwork({
  networks,
  clientSites,
  lanes,
  chokepoints,
  selectedEntityId,
  onSelectEntity,
  evidenceRefFor,
  highlightedCompetitorId,
}: CompetitorNetworkProps): JSX.Element {
  const [openEvidenceRef, setOpenEvidenceRef] = useState<string | null>(null);

  const drawing = useMemo(
    () => drawingOf(clientSites, networks, lanes, chokepoints),
    [clientSites, networks, lanes, chokepoints],
  );
  const marks = drawingMarksOf(drawing);

  /**
   * Reports an activated entity to the screen and opens the evidence the caller resolved for it.
   *
   * An entity the mapper cannot resolve — or a caller that supplied no mapper — closes whatever drawer
   * was open rather than leaving another entity's evidence on screen beside a newly selected mark.
   *
   * @param entityId The site or crossing the reader activated.
   */
  function activateEntity(entityId: string): void {
    onSelectEntity(entityId);
    setOpenEvidenceRef(evidenceRefFor?.(entityId) ?? null);
  }

  /**
   * Resolves one press on the drawing to the mark the reader aimed at.
   *
   * The pointer's client coordinates are converted into this drawing's own units by the scale the
   * element applies to its view box, and the mark nearest that point — within the target radius a
   * mark already carries — is the one activated. That is what lifts the press off the painted hit
   * areas: their overlap is unavoidable at a size the pointer needs, so the nearest centre decides
   * rather than which target happened to be painted last. A press inside a mark's own group but
   * outside every target belongs to that mark, so a site's or a crossing's printed name selects the
   * mark it names. Everything else — the ground between marks, a lane, a press the element cannot
   * place because it reports no width — activates nothing (rule P-8).
   *
   * @param event The press the drawing received.
   */
  function activateMarkAt(event: ReactMouseEvent<SVGSVGElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = rect.width / VIEW_WIDTH;

    if (scale > 0) {
      const point = {
        x: (event.clientX - rect.left) / scale,
        y: (event.clientY - rect.top) / scale,
      };
      const mark = nearestNetworkMark(marks, point, TARGET_RADIUS);

      if (mark !== null) {
        activateEntity(mark.entityId);
        return;
      }
    }

    const own = owningEntityOf(event.target);

    if (own !== null) {
      activateEntity(own);
    }
  }

  return (
    <div className={ROOT_CLASSES}>
      <svg
        className={DRAWING_CLASSES}
        viewBox={`0 0 ${VIEW_WIDTH} ${drawing.viewHeight}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={COMPETITOR_NETWORK_TEXT.groupLabel}
        onClick={activateMarkAt}
      >
        <ChokepointGroup
          crossings={drawing.chokepoints}
          selectedEntityId={selectedEntityId}
          evidenceRefFor={evidenceRefFor}
          activateEntity={activateEntity}
        />

        {drawing.competitors.map((placed) => (
          <CompetitorNetworkGroup
            key={placed.network.competitorId}
            placed={placed}
            selectedEntityId={selectedEntityId}
            crossingLabelBySiteId={drawing.crossingLabelBySiteId}
            evidenceRefFor={evidenceRefFor}
            emphasis={competitorEmphasisOf(highlightedCompetitorId, placed.network.competitorId)}
            activateEntity={activateEntity}
          />
        ))}

        <ClientNetworkGroup
          network={drawing.client}
          selectedEntityId={selectedEntityId}
          crossingLabelBySiteId={drawing.crossingLabelBySiteId}
          evidenceRefFor={evidenceRefFor}
          emphasis={clientEmphasisOf(highlightedCompetitorId)}
          activateEntity={activateEntity}
        />

        <SeriesBand rows={drawing.series} />
      </svg>

      {openEvidenceRef === null ? null : (
        <EvidenceDrawer
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
 * @param values The class names, each of which may be absent.
 * @returns The names joined by a single space.
 */
function joinClassNames(...values: readonly (string | undefined)[]): string {
  return values.filter((value) => value !== undefined && value !== '').join(' ');
}
