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
 * separated is the NAMES, by the deterministic placement in `src/components/svg-label.ts`, which moves
 * a label outward past the neighbouring marks and crossings until it is clear. That placement is shared
 * with the map lens, the radar's scale and the line chart's annotations, so one algorithm and each
 * drawing's own geometry decide where a name goes; a name too wide for the room it has is shortened with
 * an ellipsis and keeps the record's full text in a `title` child, and a name nothing can be cleared for
 * is left unprinted rather than printed over its neighbour. Every mark stays its own control in the tab
 * order and its own entry in the accessible tree, so nothing is lost to the overlap.
 *
 * HOW LARGE A NAME PRINTS, AND WHY IT IS MEASURED. The element fills its frame, so a name set at a fixed
 * number of user units prints at whatever size that frame's width multiplies it to — about 6 CSS px in the
 * atlas's narrowest column and about 35 px in a full-width one. The drawing measures its own width, resolves
 * the type step that prints at one of specification §4.3's sizes, prints every name at that step and tells
 * the placement about it, so a crowded name steps out by the clearance and distances that type implies; a
 * crossing whose name the placement had to move keeps a leader back to its halo, and one already beside its
 * halo needs none (see {@link NetworkLabelPrint}).
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
 * weight and states `aria-current` on its group, while — when the family in view is a competitor —
 * every OTHER competitor family recedes to the ground fill, hairline stroke and secondary text role
 * `src/components/dependency-graph.tsx` dims a node with. The client's own family is not a competitor
 * family and is never receded; it is emphasised when the entity in view is the client's own network,
 * which the caller states as `null`. That state recedes no competitor: a competitor keeps the hue
 * specification §4.2 gives it, so the label band inside this drawing stays true of the marks below it
 * instead of promising three colours the plot does not show. Nothing else changes: every mark keeps
 * its own accessible name, its target, its rings and its keyboard activation, so the emphasis is a
 * weight and a role token rather than a hue or a hidden series (rule B-3).
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

import { useChartScale } from '../../components/chart-readout';
import { EvidenceDrawer } from '../../components/evidence-drawer';
import { CHART_TONE_CLASSES, competitorSlotOf } from '../../components/horizontal-bar-chart';
import type { CompetitorSlot } from '../../components/horizontal-bar-chart';
import { SeriesBand } from '../../components/series-band';
import type { SeriesBandGeometry, SeriesBandRow } from '../../components/series-band';
import {
  LABEL_CLEARANCE,
  LABEL_DISTANCES,
  estimateDrawnTextWidth,
  labelStepRatioOf,
  markObstacleOf,
  placeLabels,
  renderedLabelMetrics,
} from '../../components/svg-label';
import type {
  LabelFit,
  LabelObstacle,
  LabelPlacement,
  LabelRequest,
  SvgTextMetrics,
} from '../../components/svg-label';
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
 * its container and keeps its proportions at every width instead of needing a breakpoint. The box
 * therefore decides the layout and not the type: the size a name prints at is resolved from the width the
 * element is actually rendered at (see {@link NetworkLabelPrint}), so a name stays one of specification
 * §4.3's sizes in the atlas's narrowest column and in a full-width panel alike. The plot occupies the top
 * of the box and the label band grows downwards from {@link PLOT_HEIGHT}, one row per series, so a payload
 * with more networks pushes the drawing taller instead of clipping a label.
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
 * The label step — the type the drawing prints at, and every length tuned to that type
 * ------------------------------------------------------------------------------------------- */

/**
 * The type this drawing prints its names at, and the factor every length beside them is stated at.
 *
 * WHY THE DRAWING RESOLVES THIS AND NOT ITS CLASSES. The `<svg>` fills its frame, so a name set at a fixed
 * number of user units prints at whatever that frame's width multiplies it to: this layer's 12-unit step
 * prints at about 6 px in the atlas's narrowest column, where it cannot be read, and at about 35 px in a
 * full-width one, where it is larger than the page's own heading. `../../components/svg-label.ts`'s
 * `renderedLabelMetrics` answers the step, in this drawing's user units, that prints at one of
 * specification §4.3's sizes however wide the frame is, and `labelStepRatioOf` answers how far that step is
 * from the 12-unit step every length beside a name was tuned to.
 *
 * WHY THE PLACEMENT IS TOLD THE SAME STEP. The placement in `../../components/svg-label.ts` reasons about
 * the boxes a name covers, so it has to reason in the type the name is printed at: told 12 units while the
 * name prints at 19, it would seat names that overprint one another, and told 12 while the name prints at
 * 7 it would fling a crowded name several rings away from the mark it belongs to.
 *
 * WHY A `font-size` ATTRIBUTE AND NOT A UTILITY CLASS. A `text-12` utility states a user-unit size again and
 * overrides the attribute, which is the defect this drawing is fixed for; the class lists below therefore
 * keep only the role tokens — the fill the words are read in and the halo painted behind them.
 */
interface NetworkLabelPrint {
  /** The type step and character width this drawing's names are set in, in its user units. */
  readonly metrics: SvgTextMetrics;

  /** The factor every length stated beside a name is multiplied by, relative to the 12-unit step. */
  readonly ratio: number;
}

/**
 * Resolves the print from the type this drawing's names are set in.
 *
 * `renderedLabelMetrics(null)` — no layout yet, which is every render under jsdom — answers the layer's own
 * 12-unit step, so the ratio is then 1 and every length beside a name keeps the value it has always had.
 *
 * @param metrics The type step this drawing's names are set in.
 * @returns The type, and the factor its label geometry is stated at.
 */
function labelPrintOf(metrics: SvgTextMetrics): NetworkLabelPrint {
  return { metrics, ratio: labelStepRatioOf(metrics) };
}

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

/**
 * The halo behind a mark's printed name, at the layer's 12-unit step.
 *
 * A name is haloed in the surface role the card behind the drawing paints — the device the radar's polygon
 * labels and the map canvas's node labels use — so a lane, a halo or another mark's outline passing under
 * the words is broken around them rather than running through the glyphs (rule B-3). Half the width falls
 * inside the stroke the fill then paints over, which leaves a ring of roughly a unit and a half around
 * twelve-unit type: enough to break a passing stroke, and narrow enough never to reach a neighbour's glyph.
 * It is multiplied by the drawing's label step, so the halo stays proportionate to the type it surrounds.
 */
const MARK_LABEL_HALO_WIDTH = 3;

/**
 * The weight a displaced crossing's leader is drawn at: the hairline this drawing's structure already uses.
 *
 * A leader is decoration for a name the placement had to move away from its halo — not a mark and not a
 * reading — so it takes the hairline role a ring or a lane takes and the weight that role is drawn at.
 */
const LEADER_STROKE = 1;

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

/**
 * The widths a cramped site's or crossing's name is shortened to and tried again at, widest first.
 *
 * The ladder steps down through a half, a third, a quarter and a sixth of the drawing's own width, which
 * are the widths a name has to survive on the crowded part of the frame: a competitor's site a few units
 * from the client's own, or a crossing under a junction of lanes. A sixth is the shortest a name can be cut
 * to and still say which place it names, which is what a phone-width frame leaves beside a mark once every
 * longer form has been tried and taken. They are stated in the drawing's units rather than
 * at its label step, because what they describe is the room the frame has and not the size of the type:
 * at a phone width the step is larger in those same units, which is exactly when the room runs out. A name
 * the placement can seat whole is never shortened — the ladder is only reached once every candidate place
 * for the full run has been tried and taken.
 */
const LABEL_SHORTENING_WIDTHS: readonly number[] = [
  VIEW_WIDTH / 2,
  VIEW_WIDTH / 3,
  VIEW_WIDTH / 4,
  VIEW_WIDTH / 6,
];

/**
 * Where this drawing's band starts, how its rows are spaced and where its swatch column sits.
 *
 * `src/components/series-band.tsx` owns the row itself — the two text roles, the truncation and the row in
 * view's emphasis — so this drawing states only its own geometry: the band begins one line below the plot,
 * one row per series {@link LABEL_BAND_ROW_HEIGHT} apart with the companion line {@link
 * LABEL_BAND_LINE_HEIGHT} below its name, its swatch column at {@link LABEL_BAND_X}, and no line allowed
 * past the drawing's own width. The geometry travels with this drawing rather than with the component, so
 * the radar's band and this one keep their own proportions.
 *
 * THE ROW AND LINE HEIGHTS AND THE WIDTH A LINE MAY TAKE ARE MULTIPLIED BY THE LABEL STEP, and the step's own
 * type is handed over with them: a row's two lines keep their spacing at every rendered size, and the
 * truncation that keeps a name inside the drawing measures the type the drawing prints. The swatch column
 * does not move, because it is a shape of its own rather than a length beside type.
 *
 * @param print The type this drawing's names are set in.
 * @returns The geometry `src/components/series-band.tsx` prints this drawing's rows at.
 */
function bandGeometryOf(print: NetworkLabelPrint): SeriesBandGeometry {
  const lineHeight = LABEL_BAND_LINE_HEIGHT * print.ratio;

  return {
    top: PLOT_HEIGHT + lineHeight,
    rowHeight: LABEL_BAND_ROW_HEIGHT * print.ratio,
    lineHeight,
    textX: LABEL_BAND_TEXT_X,
    maxTextWidth: VIEW_WIDTH - LABEL_BAND_TEXT_X - LABEL_CLEARANCE * print.ratio,
    metrics: print.metrics,
    swatch: { x: LABEL_BAND_X, size: LABEL_BAND_SWATCH_SIZE },
  };
}

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

/**
 * A site's or a crossing's printed name: the primary text role, haloed by the surface beneath it.
 *
 * No type utility, because the size a name prints at is resolved from the width the drawing's frame gives it
 * and set as the element's own `font-size` (see {@link NetworkLabelPrint}): a `text-12` class would state a
 * user-unit size and override that attribute, which is the defect this drawing is fixed for.
 */
const MARK_LABEL_CLASSES = 'fill-text-primary stroke-surface-1';

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
const RECEDED_LABEL_CLASSES = 'fill-text-secondary stroke-surface-1';

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
 * The emphasis of a family — how the entity in view is marked, and when the others recede
 * ------------------------------------------------------------------------------------------- */

/**
 * How one family of the drawing is painted while the screen reports an entity in view.
 *
 * `highlighted` is the family the screen reports on, `receded` a competitor family that is not it, and
 * `default` is what every family is painted as when the screen highlights nothing — and what a
 * competitor family is painted as when the entity in view is the client's own network, which recedes
 * no competitor. A caller that passes no `highlightedCompetitorId` therefore receives exactly the
 * drawing it received before the prop existed, mark for mark.
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
   * its group states `aria-current`. When the entity in view is a competitor, the other competitor
   * families recede with the device `src/components/dependency-graph.tsx` dims a node with — the
   * ground fill and a hairline stroke, with their printed names in the secondary text role, which is
   * a role §4 measures — so the recession is a role token rather than a hue, and no name falls below
   * the contrast rule B-3 requires. `null` — the client's own network in view — recedes no competitor
   * family: each keeps the hue specification §4.2 assigns it, so every mark agrees with the label
   * band inside the drawing that describes it. The client's own family is not a competitor family and
   * so is never receded.
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
 * A placed site with the position its printed name was given.
 *
 * The position is computed rather than fixed, because two sites can stand in the same place — the
 * pack's competitors and the client's own plants serve overlapping regions — and two names printed
 * from one point are both unreadable. It is absent when the drawing had no room for the name even after
 * shortening it: the mark is still drawn, and its own accessible name still carries the site's name.
 * See `src/components/svg-label.ts`.
 */
interface PlacedSite extends SitePlacement {
  /** Where the site's name is printed, or `undefined` when the drawing had no room for it. */
  readonly printedLabel: LabelPlacement | undefined;
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

/**
 * The line that ties a displaced crossing's printed name back to the halo it belongs to.
 *
 * It is stated as two points on the drawing's own grid — where the line leaves the halo and where it meets
 * the nearest edge of the name's box — so the mark renders one straight path and nothing here states a
 * curve or a second anchor the placement would have to agree with.
 */
interface CrossingLeader {
  /** The x the line leaves the halo at. */
  readonly fromX: number;
  /** The y the line leaves the halo at. */
  readonly fromY: number;
  /** The x the line meets the name's box at, which is that box's nearest point to the halo. */
  readonly toX: number;
  /** The y the line meets the name's box at. */
  readonly toY: number;
}

/** One shared crossing, resolved to the point its halo is drawn at and the position of its printed name. */
interface PlacedChokepoint {
  /** The crossing's identifier, used as the halo's key and reported on activation. */
  readonly id: string;
  /** The crossing's own name, printed beside its halo. */
  readonly label: string;
  /** The x the halo is centred on. */
  readonly x: number;
  /** The y the halo is centred on. */
  readonly y: number;
  /** Where the crossing's name is printed, or `undefined` when the drawing had no room for it. */
  readonly printedLabel: LabelPlacement | undefined;
  /**
   * The line tying that name back to this halo, or `undefined` when the name is already beside it.
   *
   * The placement steps a crowded name outward, which is right for the name and leaves it reading as a name
   * of whatever it now sits beside; the leader is what says which halo it names.
   */
  readonly leader: CrossingLeader | undefined;
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
  /**
   * Where the band starts, how its rows are spaced at the type they print at, and that type.
   *
   * It travels with the drawing rather than being stated again by the component, so the band a reader sees
   * and the height the drawing reserves for it cannot disagree about the step.
   */
  readonly band: SeriesBandGeometry;
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
 * The pair is `Chokepoint`'s own optional member, so it arrives through the port exactly as the atlas
 * payload declares it and needs no shape of this component's own (rule P-2).
 *
 * @param crossing The crossing record.
 * @returns The rounded point, or `undefined` when the record states no usable position.
 */
function ownPositionOf(crossing: Chokepoint): readonly [number, number] | undefined {
  const latitude = crossing.latitude;
  const longitude = crossing.longitude;

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
 * A crossing whose `latitude` and `longitude` the payload states — the pair `Chokepoint` declares as
 * its own optional member, so it arrives through the port rather than through a shape of this
 * component's making (rule P-2) — is drawn at that place; one that states neither is drawn at the
 * midpoint of a lane that names it. A crossing with neither is left out rather than placed at a
 * guessed coordinate, because a halo at the wrong place would misstate where the contention is — the
 * chokepoint table beside this drawing still reports it.
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

/**
 * The room this drawing gives a printed name, in its own user units.
 *
 * THE PLACEMENT IS SHARED, THE GEOMETRY IS NOT. `src/components/svg-label.ts` holds the one algorithm
 * every surface in this layer composes — this view, the map lens, the radar's scale and the line chart's
 * annotations — and each drawing states its own room and its own distances, so neither drawing's
 * proportions are forced on the other. What is stated here is this view's: the bounds stop at
 * {@link PLOT_HEIGHT} rather than at the element's full height, so a name never prints into the label band
 * below the plot; the mark radius is the ring a site's own mark draws, so a name centred above or below a
 * mark clears that ring; and the widest a shortened name may be is the plot's own width, so a run is cut
 * rather than printed past the edge.
 *
 * THE MARK RADIUS AND THE BOUNDS ARE PLOT GEOMETRY AND DO NOT MOVE. Everything else here is a length beside
 * type — the clear space, the height of a name's box, the distances a name is tried at and the width it may
 * occupy — and each is multiplied by the drawing's label step, so the placement reasons in the units the
 * names are printed in. That is what makes a crowded name step out by the right amount instead of being
 * flung several rings across the frame by boxes several times its own size.
 *
 * A CROWDED NAME IS SHORTENED BEFORE IT IS DROPPED, which is what the shortening ladder states: the atlas
 * prints thirteen site names and four crossing names on one frame, and at a phone width the frame is a
 * third of its natural size while every name keeps the 12 px step, so the room beside some marks is less
 * than a whole name is wide. Without a ladder such a name could only be printed over its neighbour or not
 * printed at all; with one it is cut to the room that exists, keeps the record's full wording in a `<title>`
 * child and in the mark's own accessible name, and the table view beside the drawing prints it in full.
 *
 * @param print The type this drawing's names are set in.
 * @returns The fit this drawing's names are placed through.
 */
function networkLabelFitOf(print: NetworkLabelPrint): LabelFit {
  const clearance = LABEL_CLEARANCE * print.ratio;

  return {
    metrics: print.metrics,
    bounds: { width: VIEW_WIDTH, height: PLOT_HEIGHT },
    boxHeight: print.metrics.fontSize + 3 * print.ratio,
    lineHeight: print.metrics.fontSize,
    clearance,
    markRadius: RING_RADIUS,
    distances: LABEL_DISTANCES.map((distance) => distance * print.ratio),
    maxTextWidth: VIEW_WIDTH - 2 * clearance,
    shorteningWidths: LABEL_SHORTENING_WIDTHS,
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
 * The leader a crossing's printed name needs when the placement could not seat it beside its halo.
 *
 * WHY A DISPLACED NAME NEEDS ONE. The placement is deterministic and steps a crowded name outward past the
 * marks and the names that have taken the space beside it, which is right for the name and wrong for the
 * reader: a crossing's name several rings away reads as a name belonging to whatever it now sits beside, and
 * a frame with four crossings can leave four names floating nowhere near their halos. The leader says which
 * halo a name names.
 *
 * WHY ONLY A DISPLACED ONE. The ring the placement's nearest distance defines is where a name belongs; a name
 * still inside it is already read as the halo's own, and a second line through the drawing would be
 * decoration adding nothing. The test is the distance from the halo's centre to the NEAREST POINT of the
 * printed name's box, against that first ring, so a name seated above, below or beside its halo — whichever
 * candidate the placement chose — is measured fairly rather than by its anchor alone.
 *
 * @param crossing The crossing whose halo the name belongs beside.
 * @param placement Where the placement printed that name, if it had room for it at all.
 * @param fit The room and geometry the names were placed through.
 * @returns The leader's two points, or `undefined` when the name is already beside its halo.
 */
function leaderForCrossing(
  crossing: ChokepointPlacement,
  placement: LabelPlacement | undefined,
  fit: LabelFit,
): CrossingLeader | undefined {
  const run = placement?.lines[0];

  if (placement === undefined || run === undefined) {
    return undefined;
  }

  /* The box the printed name covers once it is drawn: the first baseline is one type step down from the
     box's top, the box is as tall as the fit says one line is, and its width is the advance the type
     actually renders at rather than the wider box the placement reserved — a leader drawn to the reserved
     box would stop in the space the reservation kept empty (see `estimateDrawnTextWidth`). */
  const left = placement.labelX;
  const top = placement.labelY - fit.metrics.fontSize;
  const nearestX = clamp(crossing.x, left, left + estimateDrawnTextWidth(run, fit.metrics));
  const nearestY = clamp(crossing.y, top, top + fit.boxHeight);
  const offsetX = nearestX - crossing.x;
  const offsetY = nearestY - crossing.y;
  const gap = Math.hypot(offsetX, offsetY);
  const firstRing = HALO_RADIUS + fit.clearance + (fit.distances[0] ?? 0);

  if (!(gap > firstRing)) {
    return undefined;
  }

  /* The line starts on the halo's own circumference, stepped out towards the name, so it touches the ring a
     reader sees rather than the crossing's centre underneath it. */
  const reach = HALO_RADIUS / gap;

  return {
    fromX: roundCoordinate(crossing.x + offsetX * reach),
    fromY: roundCoordinate(crossing.y + offsetY * reach),
    toX: roundCoordinate(nearestX),
    toY: roundCoordinate(nearestY),
  };
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
 * THE TYPE ARRIVES IN. The placement's boxes, the distance a crowded name steps out by, the room a name may
 * occupy and the band's row heights are all lengths beside type, so the whole drawing is laid out in the
 * step its names print at rather than in a fixed one (see {@link NetworkLabelPrint}), and a crossing whose
 * name the placement had to move keeps a leader back to its halo.
 *
 * @param clientSites The client's own sites, as the atlas payload states them.
 * @param networks The competitors' networks, in the payload's order.
 * @param clientLanes The lanes of the client's own network.
 * @param chokepoints The shared crossings the payload records.
 * @param print The type this drawing prints its names at, which its placement and its band both reason in.
 * @returns Everything the drawing renders.
 */
function drawingOf(
  clientSites: readonly AtlasSite[],
  networks: readonly CompetitorNetworkPayload[],
  clientLanes: readonly AtlasLane[],
  chokepoints: readonly Chokepoint[],
  print: NetworkLabelPrint,
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
  const fit = networkLabelFitOf(print);
  const band = bandGeometryOf(print);

  /**
   * The names to place, in the order that is their precedence when the frame runs out of room.
   *
   * THE ORDER IS THE PRECEDENCE, because `../../components/svg-label.ts` seats each request before the next
   * and a name it cannot clear is the one left out. The client's own sites are placed first, since they are
   * the drawing's only first-party records; the shared crossings come next, because the frame exists to show
   * them and a halo with no name says nothing about which crossing it is; the competitors' sites follow,
   * whose shapes, hues and rows in the table view identify them where the narrowest frame has no room left
   * for their names. At the widths where every name fits, all three are printed and the order decides
   * nothing a reader can see.
   */
  const labelRequests: LabelRequest[] = [
    ...clientPlacements.map((placement) => ({
      key: siteLabelKey(placement.site.id),
      lines: [placement.site.label],
      x: placement.x,
      y: placement.y,
    })),
    ...chokepointPlacements.map((crossing) => ({
      key: chokepointLabelKey(crossing.id),
      lines: [crossing.label],
      x: crossing.x,
      y: crossing.y,
    })),
    ...slotsTaken.flatMap((entry) =>
      entry.sites.map((placement) => ({
        key: siteLabelKey(placement.site.id),
        lines: [placement.site.label],
        x: placement.x,
        y: placement.y,
      })),
    ),
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

  const labelPositions = placeLabels(labelRequests, obstacles, fit);

  const placeSite = (placement: SitePlacement): PlacedSite => ({
    ...placement,
    printedLabel: labelPositions.get(siteLabelKey(placement.site.id)),
  });

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
    const printedLabel = labelPositions.get(chokepointLabelKey(crossing.id));

    return {
      ...crossing,
      printedLabel,
      leader: leaderForCrossing(crossing, printedLabel, fit),
    };
  });

  const series = seriesRowsOf(client, competitors, placedCrossings);
  const labelById = new Map(chokepoints.map((crossing) => [crossing.id, crossing.label]));

  return {
    client,
    competitors,
    chokepoints: placedCrossings,
    series,
    band,
    viewHeight:
      series.length === 0
        ? PLOT_HEIGHT + LABEL_BAND_PADDING * print.ratio
        : PLOT_HEIGHT + series.length * band.rowHeight + LABEL_BAND_PADDING * print.ratio,
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
  /** The type this drawing's names are set in, so this one prints at the step the drawing resolved. */
  readonly print: NetworkLabelPrint;
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
 * THE NAME PRINTS AT THE STEP THE DRAWING RESOLVED, haloed in proportion to it: the size arrives as the
 * element's own `font-size` rather than from a class, so a site's name is the same specification §4.3 size
 * in a narrow column and in a wide one, and the halo behind it breaks a passing lane without swallowing a
 * neighbour (see {@link NetworkLabelPrint}).
 *
 * @param props The site, its crossing, its state, the type to print at and its handler.
 * @returns The site's mark.
 */
function SiteMark({
  placed,
  crossingLabel,
  isSelected,
  opensEvidence,
  emphasis,
  print,
  onActivate,
}: SiteMarkProps): JSX.Element {
  const { site, x, y, slot, printedLabel } = placed;
  const printedName = printedLabel?.lines[0];

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
      {printedName === undefined || printedLabel === undefined ? null : (
        <text
          x={printedLabel.labelX}
          y={printedLabel.labelY}
          fontSize={print.metrics.fontSize}
          strokeWidth={MARK_LABEL_HALO_WIDTH * print.ratio}
          paintOrder="stroke"
          className={nameClassesFor(emphasis, isSelected)}
        >
          {printedName === site.label ? null : <title>{site.label}</title>}
          {printedName}
        </text>
      )}
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
  /** The type this drawing's names are set in, so this one prints at the step the drawing resolved. */
  readonly print: NetworkLabelPrint;
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
 * WHERE THE PLACEMENT COULD NOT SEAT THE NAME BESIDE THE HALO, A LEADER JOINS THE TWO. The placement steps a
 * crowded name outward past the marks and names that took the space beside it, so a name can end up a long
 * way from the halo it names; the leader runs from the halo's own circumference to the nearest point of the
 * name's box, drawn in the hairline role and transparent to the pointer, so it says which halo belongs to
 * which name without becoming a mark a reader can press or a screen reader announces. A name already beside
 * its halo carries none, because that name is read as the halo's own already.
 *
 * @param props The crossing, its state, the type to print at and its handler.
 * @returns The crossing's mark.
 */
function ChokepointMark({
  crossing,
  isSelected,
  opensEvidence,
  print,
  onActivate,
}: ChokepointMarkProps): JSX.Element {
  const { x, y, label, printedLabel, leader } = crossing;
  const printedName = printedLabel?.lines[0];

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
      {/* The line back to a name the placement had to move: decoration for the name, drawn in the
          hairline role the drawing's structure takes, transparent to the pointer so it never takes a press
          from the mark it belongs to, and hidden from assistive technology because the mark's own name
          already says which crossing it is. */}
      {leader === undefined ? null : (
        <path
          d={`M ${leader.fromX} ${leader.fromY} L ${leader.toX} ${leader.toY}`}
          strokeWidth={LEADER_STROKE}
          className="fill-none stroke-hairline"
          pointerEvents="none"
          aria-hidden="true"
        />
      )}
      {printedName === undefined || printedLabel === undefined ? null : (
        <text
          x={printedLabel.labelX}
          y={printedLabel.labelY}
          fontSize={print.metrics.fontSize}
          strokeWidth={MARK_LABEL_HALO_WIDTH * print.ratio}
          paintOrder="stroke"
          className={joinClassNames(
            MARK_LABEL_CLASSES,
            isSelected ? SELECTED_LABEL_CLASSES : undefined,
          )}
        >
          {printedName === label ? null : <title>{label}</title>}
          {printedName}
        </text>
      )}
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
 * through each site traverses, the caller's mapper, the emphasis the group's family is painted at and
 * the type the drawing prints its names at. The marks are produced in the order the group's sites were
 * placed, so the payload's order reaches the drawing unchanged, and all of them share one activation
 * route, which is what keeps a site mark and a crossing mark behaving alike for a reader who meets
 * either.
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
  /** The type this drawing's names are set in, passed to every mark so each prints at that step. */
  readonly print: NetworkLabelPrint;
  /** Reports an activated site to the drawing, which selects it and opens its evidence. */
  readonly activateEntity: (entityId: string) => void;
}

/**
 * One mark per site of a network.
 *
 * @param props The sites of the group, what each mark reaches and the type the drawing prints at.
 * @returns The site marks, in the payload's order.
 */
function SiteMarks({
  sites,
  selectedEntityId,
  crossingLabelBySiteId,
  evidenceRefFor,
  emphasis,
  print,
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
      print={print}
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
  /** The type this drawing's names are set in. */
  readonly print: NetworkLabelPrint;
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
 * @param props The client's network, what its marks reach and the type the drawing prints at.
 * @returns The group.
 */
function ClientNetworkGroup({
  network,
  selectedEntityId,
  crossingLabelBySiteId,
  evidenceRefFor,
  emphasis,
  print,
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
        print={print}
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
  /** The type this drawing's names are set in. */
  readonly print: NetworkLabelPrint;
  /** Reports an activated site to the drawing. */
  readonly activateEntity: (entityId: string) => void;
}

/**
 * One competitor's network: its lanes, its sites, and a group name that carries both the imported
 * competitor tag after the network's name and the imported market-intelligence label.
 *
 * When the screen reports this competitor as the entity in view the group states `aria-current`, its
 * marks are drawn with the heavier stroke and its printed names take the emphasised weight; where the
 * entity in view is another competitor this one recedes with the graph lens's ground fill, hairline
 * stroke and secondary text role (rule P-8, rule B-3).
 *
 * @param props One competitor's network, what its marks reach and the type the drawing prints at.
 * @returns The group, or `null` when the frame can place none of the network's sites.
 */
function CompetitorNetworkGroup({
  placed,
  selectedEntityId,
  crossingLabelBySiteId,
  evidenceRefFor,
  emphasis,
  print,
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
        print={print}
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
  /** The type this drawing's names are set in. */
  readonly print: NetworkLabelPrint;
  /** Reports an activated crossing to the drawing. */
  readonly activateEntity: (entityId: string) => void;
}

/**
 * The shared crossings, in one group named with the imported market-intelligence label.
 *
 * @param props The crossings, what their marks reach and the type the drawing prints at.
 * @returns The group, or `null` when the frame can place no crossing.
 */
function ChokepointGroup({
  crossings,
  selectedEntityId,
  evidenceRefFor,
  print,
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
          print={print}
          onActivate={() => {
            activateEntity(crossing.id);
          }}
        />
      ))}
    </g>
  );
}

/**
 * The shape one band row prints, which is the shape that series' marks carry.
 *
 * Passing the series' own slot rather than a hue is what ties a row to its marks without colour being the
 * only cue (rule B-3): the client's filled circle, the crossing's dashed ring and the three competitor
 * shapes each print themselves, decoratively, because the row's text carries the meaning.
 */
interface SeriesSwatchProps {
  /** The shape the series is drawn as, which is the shape its marks carry. */
  readonly swatch: SeriesSwatch;
}

/**
 * The swatch a band row prints: the series' own shape in the series' own role token.
 *
 * It is decorative — the row's text is what carries the meaning — so a band row states which shape
 * belongs to which series without asking a reader to infer it from the order of the rows, and without
 * colour being the only thing that ties a row to its marks (rule B-3). The shape is drawn around the
 * origin, because `src/components/series-band.tsx` translates the group it places this in to the row's own
 * swatch centre: the band's row and line heights are then the only statement of where a swatch lands, and
 * this drawing never restates them.
 *
 * @param props The shape the row prints.
 * @returns The swatch element.
 */
function SeriesSwatchMark({ swatch }: SeriesSwatchProps): JSX.Element {
  if (swatch === 'client') {
    return <circle cx={0} cy={0} r={LABEL_BAND_SWATCH_SIZE} className={CLIENT_MARK_CLASSES} />;
  }

  if (swatch === 'chokepoint') {
    return (
      <circle
        cx={0}
        cy={0}
        r={LABEL_BAND_SWATCH_SIZE}
        strokeWidth={HALO_STROKE}
        strokeDasharray={HALO_DASH}
        className="fill-none stroke-status-simulated"
      />
    );
  }

  return (
    <polygon
      points={competitorMarkPoints(swatch, 0, 0, LABEL_BAND_SWATCH_SIZE)}
      strokeWidth={2}
      className={joinClassNames(COMPETITOR_MARK_CLASSES, COMPETITOR_STROKE_CLASSES[swatch])}
    />
  );
}

/**
 * One row of the label band, for one drawn series.
 *
 * The row's swatch is the shape the series' own marks are drawn as, its name already carries the
 * competitor tag where one is required, and its companion line is the imported label its figures carry —
 * so the band holds no fixed string of its own (rule P-1).
 *
 * @param row The drawn series' row.
 * @returns The row `src/components/series-band.tsx` prints.
 */
function bandRowOf(row: SeriesRow): SeriesBandRow {
  return {
    key: row.key,
    name: row.name,
    companion: row.label,
    swatch: <SeriesSwatchMark swatch={row.swatch} />,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/** The drawing and, beside it, the drawer a mark's evidence opens. */
const ROOT_CLASSES = 'flex min-w-0 flex-col gap-3';

/**
 * How one competitor's family is painted while the screen reports an entity in view.
 *
 * `undefined` — the caller highlights nothing — leaves every family exactly as it was, and so does
 * `null`, which states that the entity in view is the client's own network. The client's own
 * selection singles out no competitor, so none recedes: each family keeps the competitor hue
 * specification §4.2 assigns it, which is the hue the label band inside this same drawing shows for
 * it, so a mark and its legend row cannot disagree about what colour a competitor is.
 *
 * A COMPETITOR IN VIEW IS THE ONE CASE THAT RECEDES THE OTHERS. When the screen names a competitor,
 * that family is `highlighted` and every OTHER competitor family recedes, because there the emphasis
 * is what separates the family being read from the families it is read against.
 *
 * The client's own family is not a competitor family and is never receded here: it is emphasised
 * when `null` says it is the entity in view.
 *
 * @param highlightedCompetitorId The competitor in view, `null` for the client's own, or `undefined`.
 * @param competitorId The competitor the family being painted belongs to.
 * @returns The emphasis that family is painted at.
 */
function competitorEmphasisOf(
  highlightedCompetitorId: CompetitorId | null | undefined,
  competitorId: CompetitorId,
): FamilyEmphasis {
  if (highlightedCompetitorId === undefined || highlightedCompetitorId === null) {
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
 * is emphasised and its group states `aria-current`; a competitor in view recedes the other
 * competitor families, while the client's own network in view recedes none of them — see
 * {@link CompetitorNetworkProps.highlightedCompetitorId}. Activating a mark reports the entity and, where the
 * caller's mapper resolves one, opens `src/components/evidence-drawer.tsx` as a sibling of the
 * drawing rather than inside it, because a dialog is not an SVG element and the drawer portals itself
 * out of the flow anyway. A press is resolved by the drawing rather than by the browser's hit test:
 * {@link nearestNetworkMark} picks the mark nearest the press within the target radius, so a dense
 * cluster opens the mark under the pointer even where a neighbour's larger target is painted above
 * it, while the keyboard route keeps activating the focused mark exactly.
 *
 * THE TYPE IS RESOLVED FROM THE WIDTH THE DRAWING IS GIVEN. The element is measured through
 * `src/components/chart-readout.tsx`'s `useChartScale`, and the step that prints at one of specification
 * §4.3's sizes at that width — in this drawing's own user units — reaches both the placement and every
 * printed name (see {@link NetworkLabelPrint}). A fixed user-unit size would print at 6 CSS px in the
 * atlas's narrowest column and at 35 px in a full-width one, which is the defect this component carries
 * the measurement for; `null` — no layout yet, which is every render under jsdom — falls back to the
 * layer's own 12-unit step, so the drawing is laid out exactly as it always has been.
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
  const { surfaceRef, scale: measuredScale } = useChartScale(VIEW_WIDTH);

  /* The type this drawing prints at, resolved from the width its frame gives it. Memoised on the measured
     scale rather than on the metrics themselves, because `renderedLabelMetrics` answers a fresh object for
     the same width and would rebuild the whole placement on every render. */
  const print = useMemo(() => labelPrintOf(renderedLabelMetrics(measuredScale)), [measuredScale]);

  const drawing = useMemo(
    () => drawingOf(clientSites, networks, lanes, chokepoints, print),
    [clientSites, networks, lanes, chokepoints, print],
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
        ref={surfaceRef}
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
          print={print}
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
            print={print}
            activateEntity={activateEntity}
          />
        ))}

        <ClientNetworkGroup
          network={drawing.client}
          selectedEntityId={selectedEntityId}
          crossingLabelBySiteId={drawing.crossingLabelBySiteId}
          evidenceRefFor={evidenceRefFor}
          emphasis={clientEmphasisOf(highlightedCompetitorId)}
          print={print}
          activateEntity={activateEntity}
        />

        <SeriesBand
          rows={drawing.series.map(bandRowOf)}
          geometry={drawing.band}
          label={COMPETITOR_NETWORK_TEXT.seriesBandGroupName}
        />
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
