/**
 * Competitive atlas payload of stage S3: the competitor networks, the shared chokepoints and the
 * five-axis resilience radar that screen SCR-13 renders.
 *
 * Fixed by `platform-contracts.md` §3, which defines the entity types and directs that the atlas be
 * declared in `src/types` beside them (AAP 0.12.2: "`Topology`, `Atlas` … competitors, sites,
 * chokepoints, radar axes"), and filled out by AAP 0.12.4's SCR-13 row: a banner naming the
 * simulated pack, a selector filtered by product class, a network view with shared chokepoints, a
 * five-axis radar whose competitor and client series each carry their own label, and a chokepoint
 * table of overlap, competitor buffer days and a contention note. The topology itself belongs to
 * `src/types/topology.ts`; nothing competitor-shaped is declared there and nothing node-shaped
 * here.
 *
 * Provenance is structural rather than conventional (rule P-5). `AtlasSeries`, `CompetitorNetwork`
 * and `Chokepoint` each carry a non-optional `provenance`, the client's own sites sit in
 * `Atlas.clientSites` while the competitors sit in `Atlas.competitors`, and no member of this module
 * combines the two families into one figure. A market-intelligence reading therefore cannot be
 * labelled first-party, and no total can mix the families, because the shapes give a caller no
 * member in which to do it.
 *
 * Labels are typed, not free text (rule P-1). `AtlasSeries.simLabel` is a `SimLabel` or the client
 * series' own companion label, so a series cannot reach the radar, the legend or the map without
 * the exact specification §5.3 string its figures require. The pack banner and the competitor name
 * tag stay where they are defined, as the `ATLAS_PACK_BANNER` and `COMPETITOR_NAME_TAG` constants in
 * `./primitives`: the handler and the rendering components read them from there, so this module
 * holds no second copy of either fixed string and `Atlas.packLabel` remains a plain slot the
 * handler fills.
 *
 * The selector's filter and the radar-to-network join are record content as well (rule P-6, AAP
 * 0.12.4). `CompetitorNetwork.productClasses` states the client product classes the simulated pack
 * classifies a competitor's network in, and `AtlasSeries.competitorId` names the network a series
 * scores — `null` for the client's own first-party series. Both are classifications rather than
 * measures: neither adds a figure, neither mixes a first-party value into a market-intelligence one
 * (rule P-5), and a caller narrows what it draws on the first while resolving one identity across
 * the radar and the network view on the second.
 *
 * `ClientSeriesLabel` repeats the literal held by `CLIENT_SELF_ASSESSMENT_LABEL` in `./primitives`
 * because this module declares types and no runtime code: importing that constant by value would
 * put JavaScript into a types-only module, which `verbatimModuleSyntax` and the module's purpose
 * both exclude. The two literals must stay character-identical, since the client series' label
 * check compares the rendered label against the constant, and this is the module's only duplicate.
 *
 * No value is written here (rule P-6): `AtlasSeries.values`, `Chokepoint.overlap` and
 * `Chokepoint.competitorBufferDays` are slots that market-intelligence records fill, and no figure,
 * date, threshold or identifier appears in this file. Collections are plain mutable arrays, so the
 * mock adapter can build and replace them from seeded state.
 *
 * Rules this module is built to satisfy:
 * - P-5: mandatory `provenance` on every series, network and chokepoint; `clientSites` and
 *   `competitors` are separate members; no member aggregates across them.
 * - P-1: `simLabel` is typed from the fixed label vocabulary rather than `string`.
 * - P-6: every numeric member is a slot, never a typed figure.
 * - P-2: it imports `./primitives` and `./entities` and nothing else — no service, no seed record,
 *   no domain module, no React.
 * - B-1: it names no address, because the map is drawn from the bundled boundary file.
 *
 * `Chokepoint.overlap` is a bare `number` because SCR-13 fixes the column and not whether the pack
 * states overlap as a fraction or a percentage, so the scale belongs to the supplying record.
 * `AtlasSeries.values` aligns to `Atlas.radarAxes` by index with no axis name, so a reordered list
 * cannot relabel a score, and its range is a chart concern of `src/components/radar-chart.tsx`.
 * Coordinates are decimal degrees in the order the bundled Natural Earth boundaries use, with the
 * sign convention documented rather than branded.
 */

import type { ChokepointId, CompetitorId, ProductId, SimLabel } from './primitives';
import type { Provenance } from './entities';

/* ---------------------------------------------------------------------------------------------
 * Series and axes — the resilience radar of SCR-13
 * ------------------------------------------------------------------------------------------- */

/**
 * The label the client's own radar series carries: companion to the seven `SimLabel` values rather
 * than one of them (AAP 0.10), and character-identical to `CLIENT_SELF_ASSESSMENT_LABEL`.
 */
export type ClientSeriesLabel = 'Simulated data: client self-assessment';

/**
 * One radar series: a competitor network's resilience scores, or the client's own self-assessment.
 *
 * `provenance` is required and is what keeps the two families apart (rule P-5). `simLabel` is the
 * exact label the legend prints for the series (rule P-1). `values` holds one score per axis and is
 * aligned to `Atlas.radarAxes` by index, carrying no axis name of its own.
 */
export interface AtlasSeries {
  /** The series' identifier, stable across renders and selections. */
  id: string;

  /**
   * The competitor network the series reports on, or `null` for the client's own first-party series.
   *
   * It is the join that lets a series and a network resolve one identity, so SCR-13's selector and
   * its drawings can narrow a series by the network's product class without matching a label
   * against a name. A competitor's series names its network's `competitorId`; the client's own names
   * none, which is how the two families stay apart inside one list (rule P-5). It carries no figure
   * and adds none (rule P-6).
   */
  competitorId: CompetitorId | null;

  /** The name the legend prints beside the series' mark. */
  label: string;

  /** Where the scores came from: market intelligence for a competitor, first-party for the
   * client's own assessment. */
  provenance: Provenance;

  /** The exact label the series carries on screen. */
  simLabel: SimLabel | ClientSeriesLabel;

  /** One score per radar axis, in `Atlas.radarAxes` order. */
  values: number[];
}

/**
 * One axis of the five-axis resilience radar.
 *
 * SCR-13 fixes the radar's five axes and the seed pack supplies them; the axis scale is a chart
 * concern owned by `src/components/radar-chart.tsx`, so no range is declared here.
 */
export interface RadarAxis {
  /** The axis' identifier. */
  id: string;

  /** The axis' name, as the radar prints it. */
  label: string;
}

/* ---------------------------------------------------------------------------------------------
 * Sites and lanes — the network view of SCR-13
 * ------------------------------------------------------------------------------------------- */

/**
 * One site on the atlas network view: a plant of the client's own network, or a competitor's site.
 *
 * `competitorId` is `null` for a client site, so the two families can be told apart on one shared
 * shape, and the series the site is drawn from carries the `provenance` that decides the label the
 * site appears under (rule P-5). Coordinates are decimal degrees, projected onto the bundled
 * boundary map by `src/components/map-canvas.tsx`.
 */
export interface AtlasSite {
  /** The site's identifier, unique across the client's sites and the competitors'. */
  id: string;

  /** The competitor the site belongs to, or `null` for a site of the client's own network. */
  competitorId: CompetitorId | null;

  /** The name the network view prints for the site. */
  label: string;

  /** Latitude in decimal degrees. */
  latitude: number;

  /** Longitude in decimal degrees. */
  longitude: number;
}

/**
 * One edge of the atlas network view, running from one site to another.
 *
 * A lane that traverses a shared chokepoint names it, which is what lets the canvas draw the
 * chokepoint halos of S3 (SCR-13's "shared chokepoints").
 */
export interface AtlasLane {
  /** The site the lane leaves. */
  fromId: string;

  /** The site the lane reaches. */
  toId: string;

  /** The chokepoint the lane traverses, where it traverses one. */
  chokepointId?: ChokepointId;
}

/* ---------------------------------------------------------------------------------------------
 * Competitors and chokepoints — market intelligence, kept apart from first-party records
 * ------------------------------------------------------------------------------------------- */

/**
 * One competitor's supply network: its sites, the lanes between them, and the provenance that
 * marks the whole network as market intelligence (rule P-5, AAP 0.6.3).
 *
 * Every competitor name carries `COMPETITOR_NAME_TAG`. The tag is applied by the rendering
 * component from the constant in `./primitives`, so no name string and no tag text is written here;
 * competitors are identifiers `CMP-01` to `CMP-03` and nothing more (rule P-7).
 */
export interface CompetitorNetwork {
  /** The competitor the network belongs to, `CMP-nn`. */
  competitorId: CompetitorId;

  /** The network's name, as the selector and the legend print it. */
  label: string;

  /** Where the network's records came from, always market intelligence. */
  provenance: Provenance;

  /**
   * The client product classes this competitor's network competes in, as the simulated
   * market-intelligence pack classifies them.
   *
   * It is a classification of the competitor rather than a measure of it, so it holds no
   * first-party figure and nothing aggregates, compares or blends it with a first-party value
   * (rule P-5). It is what SCR-13's product-class selector filters on: while a class is in view, the
   * networks naming it are the ones drawn, and every other drawn surface follows from them
   * (AAP 0.12.4).
   */
  productClasses: ProductId[];

  /** The competitor's sites on the network view. */
  sites: AtlasSite[];

  /** The lanes between those sites. */
  lanes: AtlasLane[];
}

/**
 * One shared chokepoint: a crossing several networks use, with how far their use overlaps and the
 * buffer each competitor holds at it.
 *
 * SCR-13 fixes the table's three content columns — overlap, competitor buffer days and the
 * contention note — and AAP 0.8 fixes that the table is computed from the market-intelligence pack
 * alone. No first-party member may be added to this shape, and its `provenance` records that
 * restriction (rule P-5).
 */
export interface Chokepoint {
  /** The chokepoint's identifier, `CHK-nn`. */
  id: ChokepointId;

  /** The chokepoint's name, as the table's first column prints it. */
  label: string;

  /** How far the competitors' use of the crossing overlaps, on the market pack's own scale. */
  overlap: number;

  /** Each competitor's buffer at the crossing, in days, keyed by competitor identifier. */
  competitorBufferDays: Record<CompetitorId, number>;

  /** The plain-language account of the contention at the crossing. */
  contentionNote: string;

  /** Where the row came from, always market intelligence. */
  provenance: Provenance;
}

/* ---------------------------------------------------------------------------------------------
 * The atlas record — what the atlas endpoint returns
 * ------------------------------------------------------------------------------------------- */

/**
 * The competitive atlas payload SCR-13 renders, in one record.
 *
 * `packLabel` carries the banner naming the simulated pack: the exact `ATLAS_PACK_BANNER` string
 * from `./primitives`, which the handler copies in rather than retyping, so the fixed text has one
 * owner. `packVersion` is the release label that banner names, published here so the chokepoint brief
 * can be composed over this read alone (AAP 0.12.1 "Exports" row). `productClasses` is the selector's
 * list, typed as product identifiers because the selector filters the client and the competitors by
 * product class (AAP 0.12.4 SCR-13). The client's own sites and the competitors' networks are separate
 * members, and no member of this record combines them (rule P-5).
 */
export interface Atlas {
  /** The banner text naming the simulated market-intelligence pack. */
  packLabel: string;

  /**
   * The pack's release label, which is the release the banner names and the value the chokepoint
   * brief's document states under `packVersion` (AAP 0.12.1 "Exports" row, contracts §11).
   *
   * It travels with the atlas rather than being imported from the seeded pack so that an adapter with
   * no records of its own can compose that brief over this read alone: the client builds the same
   * document the mock adapter builds, from the same label, without reaching the seed the label is
   * defined beside (rule P-2, AAP 0.12.3).
   */
  packVersion: string;

  /** The product classes the selector offers, as product identifiers. */
  productClasses: ProductId[];

  /** The client's own sites: the first-party side of the overlay. */
  clientSites: AtlasSite[];

  /** The competitor networks drawn over the client's own, market intelligence every one. */
  competitors: CompetitorNetwork[];

  /** The shared chokepoints the chokepoint table lists. */
  chokepoints: Chokepoint[];

  /** The radar's five axes, in the order the series' values align to. */
  radarAxes: RadarAxis[];

  /** The radar's series: the client's self-assessment and one per competitor, each labelled. */
  radarSeries: AtlasSeries[];
}
