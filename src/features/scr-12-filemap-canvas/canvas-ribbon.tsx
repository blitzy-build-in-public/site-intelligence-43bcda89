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
 * REPORTED CONTRACT GAPS, and how the props close them without a competing type or an invented
 * format (rule P-6, AAP §0.12.2).
 * - `RibbonTile` in `src/types/screen-dto.ts` carries three members — `id`, `value` and
 *   `provenance` — and states in its own documentation that "the tile carries no caption, no evidence
 *   reference and no simulation label". `MetricTile` requires a caption and an evidence reference
 *   besides the label, so the two the payload lacks arrive as props: {@link
 *   CanvasRibbonProps.presentation} maps a tile's `id` to the caption specification §7 gives that
 *   tile and the reference that opens its evidence. The caption therefore keeps one owner — the
 *   screen whose fixed screen definition names the tile — and this module types none of the six.
 * - The payload carries no value-kind field, so no tile is told how its number is formatted. The
 *   projection's optional `kind` is forwarded to `MetricTile` when the screen supplies one and left
 *   off otherwise, and this module never derives a kind from a caption's wording: reading a caption
 *   for "revenue" and deciding it is money would be a second, silent formatting rule. A tile supplied
 *   without a kind prints the aggregate's own number in the tile's type step, exactly as `MetricTile`
 *   documents for a count, so an amount that must carry the currency marker needs the screen to say
 *   so. The gap is upstream in the shared payload and is reported here rather than papered over.
 * - A tile with no entry in `presentation` renders nothing at all: no caption is invented for it, no
 *   empty string stands where a reference belongs, and no zero or placeholder takes the figure's
 *   place. The screen's `StateBoundary` owns the degraded state (AAP §0.12.4).
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
 * for `prefers-reduced-motion` to suppress. The row wraps below the layout's 1280 px breakpoint, so
 * six tiles stay legible on a narrower viewport instead of shrinking past the type scale.
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
 *   role-token colour throughout, and a row that wraps instead of shrinking.
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
 * The row itself: the tiles side by side above the canvas, and the row that holds them.
 *
 * `flex-wrap` with a `basis` on each tile is what makes the ribbon reflow instead of shrinking: below
 * the 1280 px breakpoint two tiles share a line and the row grows downward, and at that breakpoint the
 * tiles' `basis-0` puts all of them on one line in equal shares. The gap is a 4 px grid step and the
 * container carries no surface, boundary, radius or shadow of its own — each tile's card owns those —
 * so this element is layout and nothing else.
 */
const RIBBON_CLASSES = 'flex flex-wrap gap-3';

/**
 * One tile's slot in the row: an equal share of the width, with `min-w-0` so a long caption or figure
 * wraps inside the tile instead of forcing the row wider than the canvas.
 *
 * `shrink`, `grow` and `basis-*` are stated as longhands rather than as the `flex-1` shorthand,
 * because the shorthand would set the basis itself and the wrap point below 1280 px would then depend
 * on the order two utilities happen to appear in the generated stylesheet. The wrapper is a flex
 * container so the card inside it stretches to the tallest tile on the same line, which keeps the row
 * of cards flush along both edges.
 */
const TILE_CLASSES = 'flex min-w-0 shrink grow basis-1/2 xl:basis-0';

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
   * module's own, so the accepted kinds stay the tile's to define (see the second reported gap in the
   * module header).
   */
  readonly kind?: MetricTileProps['kind'];
}

/** Props of {@link CanvasRibbon}. */
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
   * where it sits in the row. A tile with no entry here renders nothing (see the third reported gap in
   * the module header); a key no tile answers is ignored, because the payload decides what the ribbon
   * shows and the projection cannot add a tile.
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
    <div role="group" aria-label={RIBBON_LABEL} className={RIBBON_CLASSES}>
      {tiles.map((tile) => {
        const described = presentation[tile.id];

        /* No caption and no evidence reference means no tile: the caption belongs to the screen's own
           screen definition, and a figure placed under an invented caption or behind an empty
           reference would be worse than a gap the boundary can explain. */
        if (described === undefined) {
          return null;
        }

        return (
          <div key={tile.id} className={TILE_CLASSES}>
            <MetricTile
              label={described.label}
              value={tile.value}
              evidenceRef={described.evidenceRef}
              simLabel={CALCULATION_LABEL}
              {...(described.kind === undefined ? {} : { kind: described.kind })}
            />
          </div>
        );
      })}
    </div>
  );
}
