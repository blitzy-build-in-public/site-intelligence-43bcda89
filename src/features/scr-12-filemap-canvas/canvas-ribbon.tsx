/**
 * The computed ribbon above the FileMap canvas: one labelled tile per aggregate the canvas read
 * returned, each carrying its own `Simulated calculation` label and the reference that opens its
 * evidence.
 *
 * WHERE IT COMES FROM. AAP §0.12.4's SCR-12 row fixes both the content and the labelling — "Ribbon of
 * six computed tiles" above the canvas, and "The six ribbon tiles and the dock's stock series carry
 * `Simulated calculation`" — while AAP §0.13.1 and §0.15.1 name this path and its export. AAP §0.5.2
 * row 10 makes the tile `src/components/metric-tile.tsx`, "used by the overview and the canvas
 * ribbon": a compact figure that already composes the card surface, the evidence trigger, the mono
 * value and the icon-plus-label status. This module is therefore layout and labelling only. It
 * decides nothing about a figure, and it re-implements none of the four primitives it places, so a
 * change to the tile reaches the overview and the canvas at once instead of drifting between copies.
 *
 * WHY IT READS NO DATA — rule P-2, AAP §0.18.1. The ribbon is presentational the way
 * `src/components/map-canvas.tsx` and `src/components/dependency-graph.tsx` are: the canvas screen
 * holds the scope, asks `getCanvasRibbon` for the tiles and passes them down. A ribbon that called
 * the port itself would put a second reader of `src/services` in the feature layer, would read twice
 * whenever a screen rendered it twice, and could not render a payload a component test supplies. The
 * component holds no state, starts no effect and awaits nothing: every value it shows arrives as a
 * prop, and every figure was computed before it arrived (rule P-6).
 *
 * SIX IS THE SEED'S COUNT, NEVER A CONSTANT HERE. `getCanvasRibbon` answers `Result<RibbonTile[]>`,
 * and `src/domain/aggregation/urgency.ts` builds the six tiles the aggregates fix. This module
 * renders one tile per element of the array it is handed, in that order, and states no count: a
 * seventh tile the aggregate later adds appears without an edit here, and an empty array renders an
 * empty group for the screen's `StateBoundary` to explain rather than a row of invented figures.
 *
 * THE ORDER IS THE SERVICE'S. Nothing here sorts, slices, filters, groups, rounds or re-orders the
 * array, no tile is formatted here, and no two tiles are combined: a ribbon that re-ordered the
 * aggregates would state an urgency the aggregate did not, and one that summed them would blend
 * figures rule P-5 keeps apart. `RibbonTile.provenance` is documented as `'computed'` for every tile
 * the aggregation builds, so no market-intelligence value can reach this row; the provenance is
 * neither read nor printed here, and the label every tile carries is the computed figure's (rule
 * P-1).
 *
 * THE LABEL IS IMPORTED, NEVER TYPED — rule P-1, AAP §0.10. {@link CALCULATION_LABEL} reads index 1
 * of `SIM_LABELS`, the single owner of specification §5.3's seven strings, so the exact
 * `Simulated calculation` text reaches each tile through `MetricTile`'s mandatory `simLabel` and
 * cannot drift from that vocabulary. It is not a prop: which of the seven strings a figure carries is
 * fixed by what the figure is, not by a caller, and every tile in this ribbon is a computed figure.
 * The persistent `Simulated data` badge belongs to the shell, which AAP §0.10 mounts once above the
 * router outlet, so this file renders no second badge, because a page-level badge does not label an
 * individual figure.
 *
 * THE TWO PROPS `MetricTile` REQUIRES AND THE PAYLOAD LACKS (rule P-6, AAP §0.12.2). `RibbonTile` carries
 * `id`, `value` and `provenance` and states in its own documentation that it carries no caption, no
 * evidence reference and no simulation label, so the caption and the reference arrive as props:
 * {@link CanvasRibbonProps.presentation} maps a tile's `id` to the caption specification §7 gives that
 * tile and the reference that opens its evidence, which keeps each caption with the screen whose screen
 * definition names it.
 *
 * NO TILE IS TOLD HOW ITS NUMBER IS FORMATTED. The payload carries no value-kind field, so the
 * projection's optional `kind` is forwarded when the screen supplies one and left off otherwise, and this
 * module never derives a kind from a caption's wording — reading a caption for "revenue" and deciding it
 * is money would be a second, silent formatting rule — so an amount that must carry the currency marker
 * needs the screen to say so. A tile with no entry in `presentation` renders nothing: no invented caption,
 * no empty string where a reference belongs, no zero or placeholder in the figure's place, with the
 * screen's `StateBoundary` owning the degraded state (AAP §0.12.4).
 *
 * THE FIGURES TAKE THE RIBBON'S TYPE STEP, NOT THE PAGE'S. AAP §0.5.3 closes the type scale at six
 * sizes, and the 28 px step a page tile carries cannot fit a ribbon slot: at the 1280 px breakpoint a
 * tile is 198 px wide with a 164 px content box, while a six-figure amount with its evidence mark
 * measures 237 px at that step and the money formatter's no-break space leaves it no soft wrap point,
 * so the figure painted past the card's border into the next tile. Each tile is therefore handed
 * `valueStep="ribbon"` — the 16 px step of the same scale, at which the same figure and mark measure
 * 142 px — and the step, its measurements and the reserved second caption line that puts all six
 * figures on one baseline are documented on `src/components/metric-tile.tsx`'s own prop rather than
 * restated here, so the difference between the two modes keeps a single owner.
 *
 * WHAT IT DOES NOT CLAIM AND DOES NOT REACH — rules B-1, B-2, P-4. Nothing here fetches an asset,
 * names an address, reads a configuration value or holds a credential, and nothing states a property
 * the demonstration does not implement: the ribbon is a row of computed figures, their captions and
 * their labels. The only text this module authors is the accessible name of the group it renders;
 * every other word on screen arrived from somewhere else.
 *
 * ACCESSIBILITY — rule B-3. The tiles are grouped by `role="group"` under one accessible name, so a
 * reader meets six sibling figures as one region rather than as six unrelated sections. Nothing here
 * is interactive: the only focus stop a tile adds is the evidence trigger
 * `src/components/metric-tile.tsx` owns, so this file adds no control that could be unreachable, and
 * no control that could be disabled without an explanation (rule P-8). Every colour is a role token —
 * the tiles' own card tokens, which resolve per theme — and no transition or animation exists here
 * for `prefers-reduced-motion` to suppress. The grid's column count follows the width the row itself
 * is handed rather than the viewport's — one tile per line on the narrowest column, two and then three
 * as it widens, six abreast once it holds them — so six tiles stay legible instead of shrinking past
 * the type scale, and the row reflows the moment the docked evidence drawer takes 420 px out of the
 * same column.
 *
 * Rules this module is built to satisfy:
 * - B-1: renders from props only, names no address, requests nothing. B-2: no credential field and no
 *   environment read.
 * - P-1: every tile carries the imported `Simulated calculation` label as visible text. P-2: the
 *   tiles and their captions arrive as props; no seed record, adapter, domain module, app module or
 *   other feature is imported.
 * - P-5: no tile is summed, averaged or combined, and no market-intelligence value can enter the row,
 *   so the two families cannot meet in a figure this file prints. P-6: no figure, amount, identifier,
 *   rounding or format is typed or derived here. P-7: no company, customer, vendor or product name is
 *   written, and the one string authored here is the region name.
 * - P-8: no control of its own, so no dead control. B-3: the group's name, the tiles' own headings,
 *   role-token colour throughout, and a grid that reflows instead of shrinking.
 */
import type { JSX } from 'react';

import { MetricTile } from '../../components/metric-tile';
import type { MetricTileProps } from '../../components/metric-tile';
import { SIM_LABELS } from '../../types';
import type { RibbonTile, SimLabel } from '../../types';

/**
 * The label every tile in this ribbon carries (rule P-1): index 1 of `SIM_LABELS` is
 * `Simulated calculation`, the string specification §5.3 assigns to a computed figure, and every tile
 * the canvas ribbon shows is one. Read from the fixed vocabulary rather than typed, so the wording has
 * a single owner and this module cannot go on asserting yesterday's string after a correction lands
 * upstream.
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/**
 * The accessible name of the group the tiles are rendered in, and the only string this module
 * authors.
 *
 * It names the region rather than the figures: it carries no number, no record identifier, no §5.3
 * label and no company, so it describes a layout position on the FileMap canvas (rule P-7) without
 * stating anything about the workspace that the demonstration does not implement (rule P-4).
 */
const RIBBON_LABEL = 'Canvas ribbon';

/**
 * The frame the row's column count is resolved against: `container-type: inline-size`, which makes
 * this element's inline size the width every `@…:` variant inside it answers.
 *
 * The ribbon's width is not the viewport's. The evidence drawer AAP §0.12.4 docks from 1280 px takes
 * 420 px out of the same row, so at one and the same 1280 px viewport the ribbon's column measures
 * 1248 px with the drawer closed and 828 px with it open: six slots of 198 px against six of 128 px.
 * A viewport breakpoint cannot tell those two states apart, and would keep six columns at 128 px,
 * where a six-figure amount plus its evidence mark needs 177 px of tile and the longer captions need
 * three lines. A container query reads the width the tiles are actually given, so the row drops to
 * three columns the moment its own column narrows, whichever of the two narrowed it.
 */
const RIBBON_FRAME_CLASSES = '@container';

/**
 * The row itself: the tiles side by side above the canvas, on one equal-share grid whose column count
 * follows the width the row is given rather than the viewport's (see
 * {@link RIBBON_FRAME_CLASSES}).
 *
 * One tile per line on the narrowest column, two from 448 px, three from 672 px, and all six abreast
 * from 1152 px — which is what a 1280 px viewport hands this row (1248 px), and what keeps the canvas
 * beneath it the height the screen gives it instead of stacking tiles above it. Each threshold is the
 * narrowest column at which a tile still holds the widest figure at the ribbon's type step together
 * with its evidence mark inside its own padding: 177 px of tile covers it, so three columns need
 * 3 × 177 px and two gaps, and six need 6 × 177 px and five. A grid column is an equal share of the
 * row, so every slot measures the same and no tile can widen its neighbour's. The gap is a 4 px grid
 * step and the container carries no surface, boundary, radius or shadow of its own — each tile's card
 * owns those — so this element is layout and nothing else.
 */
const RIBBON_CLASSES = 'grid grid-cols-1 gap-3 @md:grid-cols-2 @2xl:grid-cols-3 @6xl:grid-cols-6';

/**
 * One tile's slot in the row: a single-cell grid whose cell the card fills in both directions.
 *
 * The wrapper is a grid container rather than a flex one, because the card it holds declares no width
 * of its own: `src/components/card.tsx` renders a `<section>` with no width utility, and a flex item
 * is sized by its content unless something stretches it, so as a flex item a card keeps its
 * max-content width inside an equal-share slot and the row comes out ragged. As the only child of a
 * single-cell grid the card is stretched across the cell on both axes, so every slot holds a card
 * exactly as wide as the slot, and the cards on one line share the tallest card's height. `min-w-0`
 * keeps a long caption or figure wrapping inside the tile instead of forcing the row wider than the
 * canvas.
 */
const TILE_CLASSES = 'grid min-w-0';

/**
 * What a tile shows beyond the figure the service computed: its caption, the reference that opens its
 * evidence, and — where the screen defines one — the format its number is rendered in.
 *
 * Declared here rather than exported because it is not a shared vocabulary: `RibbonTile` is the
 * payload the port resolves, and this is the presentation the calling screen adds to it. Keeping the
 * count of this module's exports at the two the file's contract names also keeps a second, competing
 * tile type out of the codebase.
 */
interface RibbonTilePresentation {
  /**
   * The tile's caption, supplied by the calling screen from the fixed screen definition that names the
   * tile.
   *
   * Required: `MetricTile` renders it as the card's heading, so a tile without one would be an unnamed
   * section holding a figure, and this module is not a second owner of specification §7's wording.
   */
  readonly label: string;

  /**
   * The reference the figure opens its evidence through, in the service's own form.
   *
   * Required, for the reason `MetricTile` requires it (rule P-6, principle PR-6): a computed figure
   * whose source, record, instant, freshness and formula cannot be reached is exactly the defect that
   * rule exists to prevent. The reference is opaque to this module — it is passed through untouched,
   * never parsed, prefixed or resolved here.
   */
  readonly evidenceRef: string;

  /**
   * How the figure's number is formatted, in the vocabulary `MetricTile` accepts.
   *
   * Omitted by a screen that has no format to state, and the tile then renders the number exactly as
   * the aggregate returned it. Typed as `MetricTileProps['kind']` rather than as a vocabulary of this
   * module's own, so the accepted kinds stay the tile's to define (see the module header on how a number
   * is formatted).
   */
  readonly kind?: MetricTileProps['kind'];
}

/**
 * The tiles the canvas read returned, in the service's order, and the presentation the calling screen
 * adds to them. The projection is keyed by the aggregate's own identifier, so it matches each tile to
 * the caption specification §7 gives it and to the reference that opens its evidence; the payload is
 * rendered as it arrived, and a tile the projection leaves out renders nothing rather than a caption
 * invented here (rule P-6).
 */
export interface CanvasRibbonProps {
  /**
   * The tiles the canvas read returned, in the order the aggregate states them.
   *
   * Typed as the port's own `RibbonTile`, never as a shape declared here, so the ribbon cannot drift
   * from the payload `getCanvasRibbon` resolves (rule P-2). The array is read and not modified: this
   * component renders its elements in the order they arrive and appends nothing to it.
   */
  readonly tiles: readonly RibbonTile[];

  /**
   * What each tile shows besides its figure, keyed by `RibbonTile.id`.
   *
   * The key is the aggregate key the payload carries — a stable identity across renders rather than a
   * position — so a tile is matched to its caption and its evidence reference without depending on
   * where it sits in the row. A tile with no entry here renders nothing (see the module header on a tile
   * with no entry in the presentation); a key no tile answers is ignored, because the payload decides
   * what the ribbon shows and the projection cannot add a tile.
   */
  readonly presentation: Readonly<Record<string, RibbonTilePresentation>>;
}

/**
 * Renders the FileMap canvas ribbon: one `MetricTile` per supplied tile, in the supplied order, inside
 * one named group.
 *
 * The caption, the figure and the evidence reference reach the tile from the payload and the
 * projection as they arrived, and the `Simulated calculation` label is the imported one, so the tile
 * labels its own figure rather than relying on the badge the shell mounts (rule P-1). Nothing is
 * computed, rounded, formatted or defaulted here: a tile whose projection is missing renders nothing
 * at all, and the screen's `StateBoundary` owns whatever degraded state the gap produces.
 */
export function CanvasRibbon({ tiles, presentation }: CanvasRibbonProps): JSX.Element {
  return (
    <div className={RIBBON_FRAME_CLASSES}>
      <div role="group" aria-label={RIBBON_LABEL} className={RIBBON_CLASSES}>
        {tiles.map((tile) => {
          const described = presentation[tile.id];

          /* No caption and no evidence reference means no tile: the caption belongs to the screen's own
             screen definition, and a figure placed under an invented caption or behind an empty
             reference would be worse than a gap the boundary can explain. */
          if (described === undefined) {
            return null;
          }

          /* The ribbon's own type step: a 198 px slot cannot hold this row's amount at the page tile's
             28 px step, and the mode also reserves the second caption line (see the module header). */
          return (
            <div key={tile.id} className={TILE_CLASSES}>
              <MetricTile
                label={described.label}
                value={tile.value}
                evidenceRef={described.evidenceRef}
                simLabel={CALCULATION_LABEL}
                valueStep="ribbon"
                {...(described.kind === undefined ? {} : { kind: described.kind })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
